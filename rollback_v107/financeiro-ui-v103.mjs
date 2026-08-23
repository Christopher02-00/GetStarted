/*
 * Get Started — integração financeira V103.
 *
 * Este módulo concentra leitura, projeção e UI. A matemática e as leis de
 * competência ficam em `financeiro-core.mjs`; abrir ou trocar uma tela nunca
 * grava Firestore. Escritas existem somente em ações explícitas com recibo.
 */
import * as Core from './financeiro-core.mjs?v=103';

const COLECOES_SNAPSHOT = [
  'contratos_cliente',
  'pagamentos_mensais',
  'clientes_encerrados',
  'recebimentos_entrada_pessoal',
  'receitas_avulsas',
  'financeiro_lancamentos',
  'clientes_ciclo_financeiro',
];
const COLECOES_CONTRATOS = [
  'contratos_cliente',
  'clientes_encerrados',
];

  function numero(valor){
  const n=Number(valor);
  return Number.isFinite(n)?n:0;
}

function texto(valor){ return String(valor??'').trim(); }

function listaSnapshot(snap){
  const saida=[];
  snap.forEach(d=>saida.push({id:d.id,...(d.data()||{})}));
  return saida;
}

function hojeIso(deps){ return texto(deps.hojeLocal()).slice(0,10); }

function rotuloEstadoCobranca(estado,dias){
  if(estado==='vence_amanha') return 'vence amanhã';
  if(estado==='vence_hoje') return 'vence hoje';
  if(estado==='carencia') return `venceu há ${dias} dia(s) · carência`;
  if(estado==='atrasado') return `${dias} dia(s) de atraso`;
  return 'a vencer';
}

function classeEstadoCobranca(estado){
  if(estado==='atrasado') return 'atrasado';
  if(['vence_amanha','vence_hoje','carencia'].includes(estado)) return 'hoje';
  return 'pendente';
}

function hashLeve(valor){
  let h=2166136261;
  for(const c of String(valor||'')){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); }
  return (h>>>0).toString(16).padStart(8,'0');
}

export function instalarFinanceiroV103(deps){
  const {
    db, collection, doc, getDocs, getDoc, setDoc, updateDoc, runTransaction,
    serverTimestamp, deleteField, arrayUnion,
    slugClienteCanonico, hojeLocal, brl, nomeMes, esc, escAttr, escJs,
    mostrarToast, usuarioAtual, auth, registrarLogAutomacao,
  }=deps;
  const w=globalThis;
  const caches=new Map();
  const carregamentos=new Map();
  const locks=new Set();
  const renderContratosAnterior=w.renderContratos;

  function pessoa(){ return texto(usuarioAtual()); }
  function canFinanceiro(){ return pessoa()==='Chris'; }
  function canContratos(){ return ['Chris','Amanda'].includes(pessoa()); }
  function invalidar(){ caches.clear(); }

  function canonico(valor){ return slugClienteCanonico(texto(valor)); }

  function prepararFontes(snapshot){
    const contratos=(snapshot.contratos_cliente||[]).map(v=>({
      ...v,
      slug:v.id,
      canonicalId:canonico(v.canonicalId||v.slug||v.cliente||v.id),
    }));
    const pagamentos=(snapshot.pagamentos_mensais||[]).map(v=>({
      ...v,
      canonicalId:canonico(v.canonicalId||v.cliente||v.clienteSlug||String(v.id).replace(/_\d{4}-\d{2}$/,'')),
    }));
    const saidas=(snapshot.clientes_encerrados||[]).map(v=>({
      ...v,
      canonicalId:canonico(v.canonicalId||v.slug||v.cliente||v.id),
    }));
    return {...snapshot,contratos,pagamentos,saidas};
  }

function competenciaDeDataCaixa(valor){
  const data=valor?.toDate?.() instanceof Date?valor.toDate():(valor instanceof Date?valor:null);
  if(data&&!Number.isNaN(data.getTime())) return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}`;
  const civil=texto(valor).slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(civil)?civil.slice(0,7):'';
}

  async function carregarSnapshot({forcar=false,comContatos=false,modo='completo'}={}){
    const agora=Date.now();
    const chave=`${pessoa()}|${modo}|${comContatos?'contatos':'sem-contatos'}`;
    const cacheAtual=caches.get(chave);
    if(!forcar&&cacheAtual&&(agora-cacheAtual.em)<15000) return cacheAtual.valor;
    if(!forcar&&carregamentos.has(chave)) return carregamentos.get(chave);
    const promessa=(async()=>{
      const base=modo==='contratos'?COLECOES_CONTRATOS:COLECOES_SNAPSHOT;
      const nomes=[...base,...(comContatos?['contatos_clientes_financeiro']:[])];
      const snaps=await Promise.all(nomes.map(nome=>getDocs(collection(db,nome))));
      const bruto={};
      nomes.forEach((nome,i)=>{ bruto[nome]=listaSnapshot(snaps[i]); });
      const valor=prepararFontes(bruto);
      caches.set(chave,{valor,em:Date.now()});
      return valor;
    })();
    carregamentos.set(chave,promessa);
    try{return await promessa;}finally{carregamentos.delete(chave);}
  }

  function mapaNomes(fontes){
    const nomes=new Map();
    fontes.contratos.forEach(v=>nomes.set(v.canonicalId,texto(v.clienteNome||v.nome||v.canonicalId)));
    fontes.pagamentos.forEach(v=>{ if(!nomes.has(v.canonicalId)) nomes.set(v.canonicalId,texto(v.clienteNome||v.canonicalId)); });
    return nomes;
  }

  function competenciasDaRegua(fontes,competencia){
    const conjunto=new Set([competencia,Core.proximaCompetencia(competencia)]);
    // Passivo anterior exige um documento real. Não percorra o início do
    // contrato fabricando obrigações históricas que talvez nunca existiram.
    fontes.pagamentos.forEach(p=>{ if(Core.competenciaValida(p.competencia)&&p.competencia<=Core.proximaCompetencia(competencia)) conjunto.add(p.competencia); });
    return [...conjunto].filter(Core.competenciaValida).sort();
  }

  function projetar(fontes,competencia,{regua=true}={}){
    return Core.projetarFinanceiroCompetencia({
      contratos:fontes.contratos,
      pagamentos:fontes.pagamentos,
      saidas:fontes.saidas,
      recebimentosEntrada:fontes.recebimentos_entrada_pessoal,
      receitasAvulsas:fontes.receitas_avulsas,
      competencia,
      mesCaixa:competencia,
      hoje:regua?hojeIso(deps):'',
      competenciasRegua:regua?competenciasDaRegua(fontes,competencia):[],
      carenciaDias:5,
    });
  }

  function campoCompetencia(id){
    const el=document.getElementById(id);
    if(el&&!Core.competenciaValida(el.value)) el.value=hojeLocal().slice(0,7);
    return el?.value||hojeLocal().slice(0,7);
  }

  async function sincronizarCompetencia(valor,origem=''){
    if(!Core.competenciaValida(valor)) return false;
    ['finMes','mensMes','cobMes','ctMes'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=valor; });
    if(origem==='mensalidades') await w.renderMensalidades();
    else if(origem==='cobranca') await w.renderCobranca();
    else if(origem==='contratos') await w.renderContratos();
    else await w.renderFinanceiro();
    return true;
  }
  w.sincronizarCompetenciaFinanceiraV103=sincronizarCompetencia;

  function mudarMes(id,delta,origem){
    const atual=campoCompetencia(id);
    return sincronizarCompetencia(delta>0?Core.proximaCompetencia(atual):Core.competenciaAnterior(atual),origem);
  }
  w.mudarMesCobrancaV103=delta=>mudarMes('cobMes',delta,'cobranca');
  w.mudarMesContratosV103=delta=>mudarMes('ctMes',delta,'contratos');
  w.mudarMesMensalidades=delta=>mudarMes('mensMes',delta,'mensalidades');
  w.mudarMesFinanceiro=delta=>mudarMes('finMes',delta,'financeiro');

  function htmlConflitos(projecao){
    const conflitos=(projecao?.conflitos||[]).filter(v=>v?.bloqueante!==false);
    if(!conflitos.length) return '';
    const codigos=[...new Set(conflitos.map(v=>v.codigo||v.motivo||'CONFLITO'))];
    return `<div class="card" style="border:2px solid var(--red);"><b>⚠️ ${conflitos.length} conflito(s) bloqueiam parte dos totais</b><div class="desc">${codigos.map(esc).join(' · ')}. O sistema não escolheu silenciosamente um registro concorrente.</div></div>`;
  }

  function linhaSituacao(linha,competencia){
    const status=Core.statusMensalidade(linha);
    if(status==='pago') return {k:'pago',rotulo:'Pago',cor:'var(--green)',selo:'aprovada'};
    if(status==='isento') return {k:'isento',rotulo:'Cortesia/isento',cor:'var(--line)',selo:'pendente'};
    if(status==='cancelado') return {k:'cancelado',rotulo:'Cancelado',cor:'var(--line)',selo:'pendente'};
    const c=Core.classificarCobranca(linha,hojeIso(deps),5);
    return {k:c.estado,rotulo:rotuloEstadoCobranca(c.estado,c.dias),cor:c.estado==='atrasado'?'var(--red)':c.estado==='a_vencer'?'var(--line)':'var(--yellow)',selo:classeEstadoCobranca(c.estado),dias:c.dias};
  }

  function nomeLinha(linha,nomes){ return nomes.get(linha.canonicalId)||linha.clienteNome||linha.canonicalId; }

  w.renderMensalidades=async function(){
    if(!canFinanceiro()){ document.getElementById('mensalidadesBox')?.replaceChildren(); return false; }
    const box=document.getElementById('mensalidadesBox'); if(!box) return false;
    const competencia=campoCompetencia('mensMes');
    ['finMes','cobMes','ctMes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=competencia;});
    box.innerHTML='<div class="card"><div class="desc">Projetando obrigações sem gravar nada…</div></div>';
    try{
      const fontes=await carregarSnapshot();
      const p=projetar(fontes,competencia,{regua:false});
      if(p.estado==='indisponivel') throw new Error('As fontes financeiras não foram confirmadas.');
      const nomes=mapaNomes(fontes), filtro=document.getElementById('mensFiltro')?.value||'todos';
      let linhas=(p.obrigacoes?.linhas||[]).filter(v=>v.estado==='confirmado').map(v=>({...v,sit:linhaSituacao(v,competencia)}));
      if(filtro==='aberto') linhas=linhas.filter(v=>v.sit.k!=='pago'&&v.sit.k!=='isento'&&v.sit.k!=='cancelado');
      if(filtro==='atrasado') linhas=linhas.filter(v=>v.sit.k==='atrasado');
      if(filtro==='pago') linhas=linhas.filter(v=>v.sit.k==='pago');
      linhas.sort((a,b)=>numero(a.diaVencimento)-numero(b.diaVencimento)||nomeLinha(a,nomes).localeCompare(nomeLinha(b,nomes),'pt-BR'));
      w.__mensalidadesV103=Object.fromEntries(linhas.map(v=>[v.id,{...v,clienteNome:nomeLinha(v,nomes)}]));
      const t=p.obrigacoes.totais||{};
      let html=`<div class="painelResumo" style="margin-bottom:16px;">
        <div class="resumoCard"><div class="num" style="font-size:17px;">${brl(t.previsto||0)}</div><div class="lbl">Previsto · ${esc(nomeMes(competencia))}</div></div>
        <div class="resumoCard green"><div class="num" style="font-size:17px;">${brl(t.quitado||0)}</div><div class="lbl">Quitado da competência</div></div>
        <div class="resumoCard ${(t.aberto||0)>0?'yellow':'green'}"><div class="num" style="font-size:17px;">${brl(t.aberto||0)}</div><div class="lbl">Em aberto da competência</div></div>
        <div class="resumoCard"><div class="num">${t.virtuais||0}</div><div class="lbl">Obrigações derivadas · 0 writes</div></div>
      </div>
      <div class="card"><div class="desc"><b>Fórmula única:</b> previsto = quitado + em aberto. Cortesias e cancelamentos ficam fora. Linhas “derivadas” só viram documento quando você executa uma ação.</div></div>${htmlConflitos(p)}`;
      if(!linhas.length){ box.innerHTML=html+'<div class="empty">Nenhuma obrigação corresponde ao filtro.</div>'; return true; }
      const porDia={}; linhas.forEach(v=>{const d=numero(v.diaVencimento)||10;(porDia[d]??=[]).push(v);});
      for(const dia of Object.keys(porDia).map(Number).sort((a,b)=>a-b)){
        const grupo=porDia[dia];
        html+=`<div class="faixaDem aberta"><div class="faixaHead" onclick="toggleFaixaDemandas(this)">Dia ${dia} <span class="qtd">(${grupo.length})</span><span class="seta">▾</span></div><div class="faixaItens">${grupo.map(v=>`<div class="item" style="border-left:3px solid ${v.sit.cor};"><div class="top"><div class="nome">${esc(nomeLinha(v,nomes))}</div><span class="selo ${v.sit.selo}">${esc(v.sit.rotulo)}</span></div><div class="meta">${brl(v.valorDevido)} · ${v.materializada?'documento confirmado':'obrigação derivada, ainda sem documento'}</div><div class="btnrow" style="margin-top:8px;">${!['pago','isento','cancelado'].includes(v.sit.k)?`<button class="btn green" style="width:auto;" onclick="marcarMensalidadeV103('${escJs(v.id)}','pago')">✔ Recebi</button><button class="btn secondary" style="width:auto;" onclick="marcarMensalidadeV103('${escJs(v.id)}','isento')">🎁 Cortesia</button>`:''}</div>${['pago','isento'].includes(v.sit.k)?'<div class="meta" style="margin-top:8px;">Estado encerrado. Uma correção exige lançamento auditado; esta tela não reabre cobranças silenciosamente.</div>':''}</div>`).join('')}</div></div>`;
      }
      box.innerHTML=html;
      return true;
    }catch(e){
      console.error('V103 mensalidades indisponíveis:',e);
      box.innerHTML='<div class="card" style="border:2px solid var(--red);"><b>Mensalidades indisponíveis</b><div class="desc">Nada foi tratado como zero e nenhuma cobrança foi criada. Atualize para tentar novamente.</div></div>';
      return false;
    }
  };

  async function materializarOuAtualizarMensalidade(id,status){
    if(!canFinanceiro()) throw new Error('Ação exclusiva do Financeiro do Chris.');
    const linha=w.__mensalidadesV103?.[id]||w.__cobrancasV103?.[id];
    if(!linha) throw new Error('Atualize a tela antes de confirmar esta mensalidade.');
    const ref=doc(db,'pagamentos_mensais',id);
    const contratoRef=doc(db,'contratos_cliente',linha.canonicalId);
    await runTransaction(db,async tx=>{
      const [pgSnap,ctSnap]=await Promise.all([tx.get(ref),tx.get(contratoRef)]);
      if(!ctSnap.exists()) throw new Error('Contrato canônico não encontrado.');
      const contrato={id:ctSnap.id,slug:ctSnap.id,canonicalId:linha.canonicalId,...ctSnap.data()};
      const proj=Core.projetarObrigacoes({contratos:[contrato],pagamentos:pgSnap.exists()?[{id:pgSnap.id,canonicalId:linha.canonicalId,...pgSnap.data()}]:[],competencia:linha.competencia});
      const atual=proj.linhas.find(v=>v.canonicalId===linha.canonicalId&&v.estado==='confirmado');
      if(!atual) throw new Error('A obrigação não pôde ser confirmada sem conflito.');
      if(pgSnap.exists()&&(pgSnap.data().pagamentoEntradaPendente===true||pgSnap.data().origemRecebimento==='entrada_contrato')) throw new Error('Confirme o primeiro pagamento na seção própria do Financeiro.');
      if(pgSnap.exists()){
        const estadoAtual=Core.statusMensalidade(pgSnap.data());
        if(['pago','isento','cancelado'].includes(estadoAtual)){
          if(estadoAtual===status) return;
          throw new Error('Estado encerrado não pode ser trocado sem uma correção financeira auditada.');
        }
      }
      const dados={status,atualizadoPor:pessoa(),atualizadoEm:serverTimestamp(),pagoEm:status==='pago'?hojeLocal():''};
      if(status==='isento') Object.assign(dados,{cortesiaDoMes:false,motivoIsencao:'cortesia manual'});
      if(status==='aberto') Object.assign(dados,{cortesiaDoMes:false,cortesiaPermanente:false,motivoIsencao:''});
      if(!pgSnap.exists()) Object.assign(dados,{cliente:linha.canonicalId,clienteNome:linha.clienteNome||linha.canonicalId,competencia:linha.competencia,valorDevido:atual.valorDevido,diaVencimento:atual.diaVencimento||10,comprovante:'',criadoEm:serverTimestamp(),origemMaterializacao:'acao_explicita_v103'});
      tx.set(ref,dados,{merge:true});
    });
    const recibo=await getDoc(ref);
    if(!recibo.exists()||Core.statusMensalidade(recibo.data())!==status) throw new Error('A transação terminou, mas o recibo não confirmou o estado solicitado. Não repita; atualize.');
  }

  w.marcarMensalidadeV103=async function(id,status){
    if(locks.has('mens:'+id)) return false;
    if(!['pago','isento','aberto'].includes(status)) return false;
    if(!confirm(`Confirmar mensalidade como ${status.toUpperCase()}?`)) return false;
    locks.add('mens:'+id);
    try{
      await materializarOuAtualizarMensalidade(id,status);
      invalidar(); mostrarToast('Mensalidade confirmada com recibo.');
      await Promise.all([w.renderMensalidades(),w.renderFinanceiro(),w.renderCobranca()]);
      return true;
    }catch(e){ console.error(e); mostrarToast('Nada foi alterado: '+(e.message||e),'erro'); return false; }
    finally{locks.delete('mens:'+id);}
  };

  /* A API antiga permanece apontando para o writer V103 para que nenhum
     botão legado consiga atualizar um documento virtual com updateDoc. */
  w.marcarMensalidade=w.marcarMensalidadeV103;

  w.renderCobranca=async function(){
    if(!canFinanceiro()){ document.getElementById('cobrancaBox')?.replaceChildren(); return false; }
    const box=document.getElementById('cobrancaBox'); if(!box) return false;
    const competencia=campoCompetencia('cobMes');
    ['finMes','mensMes','ctMes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=competencia;});
    box.innerHTML='<div class="card"><div class="desc">Separando atrasos anteriores, mês vigente e próxima previsão…</div></div>';
    try{
      const fontes=await carregarSnapshot({comContatos:true});
      const p=projetar(fontes,competencia,{regua:true});
      if(p.estado==='indisponivel') throw new Error('Régua indisponível.');
      const nomes=mapaNomes(fontes), reg=p.regua;
      const contatos=new Map((fontes.contatos_clientes_financeiro||[]).map(v=>[canonico(v.id),texto(v.whatsapp)]));
      const todas=[...(reg.anterioresVencidos?.itens||[]),...(reg.competenciaSelecionada?.itens||[]),...(reg.proximaPrevisao?.itens||[])];
      w.__cobrancasV103=Object.fromEntries(todas.map(v=>[v.id,{...v,clienteNome:nomeLinha(v,nomes)}]));
      w.__cobrancasFila=w.__cobrancasV103;
      const hoje=hojeIso(deps);
      const secao=(titulo,sub,itens,tipo)=>{
        const corpo=itens.map(v=>{
          const c=v.cobranca||Core.classificarCobranca(v,hoje,5);
          const telefone=contatos.get(v.canonicalId)||'';
          const cobradoHoje=texto(v.ultimaCobranca).slice(0,10)===hoje;
          const cobravel=c.estado!=='a_vencer'&&c.estado!=='indisponivel';
          const contatoAusente=telefone?'':`<div style="display:flex;gap:6px;align-items:center;margin-top:7px;"><input id="whatsRapidoV103_${escAttr(v.id)}" placeholder="(41) 99999-9999" style="flex:1;"><button class="btn secondary" style="width:auto;" onclick="salvarWhatsRapidoV103('${escJs(v.id)}','${escJs(v.canonicalId)}')">Salvar número privado</button></div>`;
          const acao=tipo==='proxima'
            ? '<div class="meta" style="margin-top:7px;">Previsão somente leitura; nenhuma cobrança é criada antes da competência.</div>'
            : `<div class="btnrow" style="margin-top:8px;">${v.materializada&&cobravel?`<button class="btn secondary" style="width:auto;" onclick="abrirCobranca('${escJs(v.id)}')">${cobradoHoje?'Abrir conversa novamente':'Abrir cobrança'}</button>`:!v.materializada?`<button class="btn secondary" style="width:auto;" onclick="materializarCobrancaV103('${escJs(v.id)}')">Criar cobrança deste mês</button>`:'<span class="meta">Fora da janela de cobrança; permanece somente como previsão.</span>'}<button class="btn green" style="width:auto;" onclick="marcarMensalidadeV103('${escJs(v.id)}','pago')">✔ Já recebi</button></div>${v.materializada&&cobravel&&!cobradoHoje?`<button id="confirmarCobranca_${escAttr(v.id)}" class="btn secondary" style="width:auto;margin-top:7px;border-color:var(--green);" hidden onclick="confirmarEnvioCobrancaV103('${escJs(v.id)}')">Confirmar que enviei</button>`:''}${!v.materializada?'<div class="meta" style="margin-top:7px;">Depois da criação confirmada, clique novamente em “Abrir cobrança”. Isso evita bloqueio de pop-up.</div>':''}`;
          return `<div class="item" style="margin-top:9px;${cobradoHoje?'opacity:.62;':''}"><div class="top"><div class="nome">${esc(nomeLinha(v,nomes))}</div><span class="selo ${cobradoHoje?'aprovada':classeEstadoCobranca(c.estado)}">${cobradoHoje?'✔ cobrado hoje':esc(rotuloEstadoCobranca(c.estado,c.dias))}</span></div><div class="meta">${brl(v.valorDevido)} · ${esc(nomeMes(v.competencia))}${v.materializada?'':' · obrigação derivada'}</div>${contatoAusente}${acao}</div>`;
        }).join('');
        return `<div class="card" style="border-left:4px solid ${tipo==='anterior'?'var(--red)':tipo==='atual'?'var(--yellow)':'var(--line)'};"><h2>${titulo}</h2><div class="desc">${sub}</div>${corpo||'<div class="empty">Nenhum item nesta seção.</div>'}</div>`;
      };
      const comprovantes=reg.comprovantesEmAnalise?.itens||[];
      const acionaveis=[...(reg.anterioresVencidos.itens||[]),...(reg.competenciaSelecionada.itens||[])].filter(v=>{
        const c=v.cobranca||Core.classificarCobranca(v,hoje,5);
        return c.estado!=='a_vencer'&&texto(v.ultimaCobranca).slice(0,10)!==hoje;
      });
      const badge=document.getElementById('badgeCobranca');if(badge){badge.textContent=acionaveis.length||'';badge.style.display=acionaveis.length?'flex':'none';}
      box.innerHTML=`<div class="painelResumo"><div class="resumoCard ${reg.anterioresVencidos.quantidade?'red':'green'}"><div class="num">${reg.anterioresVencidos.quantidade}</div><div class="lbl">Atrasos anteriores</div></div><div class="resumoCard"><div class="num">${reg.competenciaSelecionada.quantidade}</div><div class="lbl">Em aberto no mês</div></div><div class="resumoCard"><div class="num">${comprovantes.length}</div><div class="lbl">Comprovantes em análise</div></div><div class="resumoCard"><div class="num">${acionaveis.length}</div><div class="lbl">Para cobrar agora</div></div></div>${htmlConflitos(p)}${comprovantes.length?`<div class="card" style="border-left:4px solid var(--green);"><h2>🧾 Comprovantes aguardando conferência</h2><div class="desc">Esses clientes não entram na cobrança enquanto o comprovante estiver pendente.</div>${comprovantes.map(v=>`<div class="item"><b>${esc(nomeLinha(v,nomes))}</b><div class="meta">${esc(nomeMes(v.competencia))} · ${brl(v.valorDevido)}</div></div>`).join('')}</div>`:''}${secao('🚨 Atrasados de competências anteriores','Somente documentos reais, ainda vigentes e realmente vencidos.',reg.anterioresVencidos.itens,'anterior')}${secao('📅 Competência selecionada','A vencer, em carência e atrasados ficam rotulados sem misturar meses.',reg.competenciaSelecionada.itens,'atual')}${secao('🔭 Próxima competência','Previsão contratual; não é cobrança e não cria documento.',reg.proximaPrevisao.itens,'proxima')}`;
      return true;
    }catch(e){ console.error('V103 régua indisponível:',e); box.innerHTML='<div class="card" style="border:2px solid var(--red);"><b>Régua indisponível</b><div class="desc">Erro de leitura não virou zero, atraso nem mensagem de cobrança. Tente novamente.</div></div>'; return false; }
  };

  w.salvarWhatsRapidoV103=async function(id,slug){
    if(!canFinanceiro()) return false;
    const numeroWhatsapp=Core.normalizarTelefoneBR(document.getElementById(`whatsRapidoV103_${id}`)?.value||'');
    if(!numeroWhatsapp){ mostrarToast('Informe um WhatsApp brasileiro válido, com DDD.','erro'); return false; }
    const slugCanonico=canonico(slug);
    const linha=w.__cobrancasV103?.[id]||{};
    const ref=doc(db,'contatos_clientes_financeiro',slugCanonico);
    try{
      await setDoc(ref,{slug:slugCanonico,whatsapp:numeroWhatsapp,nome:texto(linha.clienteNome)||slugCanonico,origem:'edicao_regua',atualizadoPor:'Chris',atualizadoEm:serverTimestamp()},{merge:true});
      const recibo=await getDoc(ref);
      if(!recibo.exists()||Core.normalizarTelefoneBR(recibo.data().whatsapp)!==numeroWhatsapp) throw new Error('A agenda privada não confirmou o mesmo número.');
      invalidar();mostrarToast('Número confirmado na agenda financeira privada.');await w.renderCobranca();return true;
    }catch(e){console.error(e);mostrarToast('Número não confirmado: '+(e.message||e),'erro');return false;}
  };

  w.materializarCobrancaV103=async function(id){
    try{
      const linha=w.__cobrancasV103?.[id]; if(!linha) throw new Error('Atualize a Régua.');
      if(linha.materializada) return true;
      await materializarOuAtualizarMensalidade(id,'aberto');
      invalidar();
      mostrarToast('Cobrança criada com recibo. Agora clique em “Abrir cobrança”.');
      await w.renderCobranca();
      return true;
    }catch(e){ mostrarToast('Cobrança não criada: '+(e.message||e),'erro'); return false; }
  };

  w.confirmarEnvioCobrancaV103=async function(id){
    if(!canFinanceiro()||locks.has('cobranca:'+id)) return false;
    const preparada=w.__cobrancasPreparadas?.[id];
    if(!preparada){mostrarToast('Abra primeiro a conversa desta cobrança.','erro');return false;}
    locks.add('cobranca:'+id);
    const dataCivil=hojeLocal();
    let jaConfirmada=false;
    try{
      const ref=doc(db,'pagamentos_mensais',id);
      await runTransaction(db,async tx=>{
        const snap=await tx.get(ref);
        if(!snap.exists()) throw new Error('Mensalidade não encontrada.');
        const atual=snap.data();
        if(Core.statusMensalidade(atual)!=='aberto') throw new Error('A mensalidade não está aberta para cobrança.');
        if(texto(atual.ultimaCobranca).slice(0,10)===dataCivil){jaConfirmada=true;return;}
        tx.update(ref,{
          ultimaCobranca:`${dataCivil}T12:00:00-03:00`,
          cobrancasFeitas:numero(atual.cobrancasFeitas)+1,
          ultimaFaseCobrada:texto(preparada.fase),
          cobrancaAtualizadaPor:pessoa(),
        });
      });
      const recibo=await getDoc(ref);
      if(!recibo.exists()||texto(recibo.data().ultimaCobranca).slice(0,10)!==dataCivil) throw new Error('O recibo não confirmou a cobrança. Não repita; atualize.');
      delete w.__cobrancasPreparadas[id];
      invalidar();
      registrarLogAutomacao?.('cobranca_feita',id,`${texto(recibo.data().clienteNome)||'cliente'} — ${jaConfirmada?'retry idempotente':'confirmada'}`);
      mostrarToast(jaConfirmada?'A cobrança já estava confirmada hoje; nenhum contador foi duplicado.':'Cobrança confirmada como enviada.');
      await w.renderCobranca();
      return true;
    }catch(e){console.error(e);mostrarToast('Cobrança não confirmada: '+(e.message||e),'erro');return false;}
    finally{locks.delete('cobranca:'+id);}
  };
  w.confirmarEnvioCobranca=w.confirmarEnvioCobrancaV103;

  function resumoLancamentos(fontes,competencia){
    const todos=(fontes.financeiro_lancamentos||[]).filter(v=>v.excluido!==true&&v.status!=='cancelado');
    // O previsto pertence à competência original; o caixa pertence ao mês da
    // data em que o dinheiro realmente entrou ou saiu. Filtrar primeiro pela
    // competência faria um custo de agosto pago em setembro desaparecer dos
    // dois meses.
    const lista=todos.filter(v=>v.competencia===competencia);
    const pagos=todos.filter(v=>v.status==='pago'&&competenciaDeDataCaixa(v.dataCaixa)===competencia);
    const receita=pagos.filter(v=>v.tipo==='receita_ajuste').reduce((s,v)=>s+numero(v.valor),0);
    const custos=pagos.filter(v=>v.tipo!=='receita_ajuste').reduce((s,v)=>s+numero(v.valor),0);
    const previsto=lista.filter(v=>v.status==='previsto'&&v.tipo!=='receita_ajuste').reduce((s,v)=>s+numero(v.valor),0);
    return {lista,pagos,receita,custos,previsto};
  }

  w.renderFinanceiro=async function(){
    if(!canFinanceiro()){ document.getElementById('financeiroBox')?.replaceChildren(); return false; }
    const box=document.getElementById('financeiroBox'); if(!box) return false;
    const competencia=campoCompetencia('finMes');
    ['mensMes','cobMes','ctMes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=competencia;});
    box.innerHTML='<div class="card"><div class="desc">Reconciliando competência e caixa por fontes confirmadas…</div></div>';
    try{
      const fontes=await carregarSnapshot(); const p=projetar(fontes,competencia,{regua:false});
      if(p.estado==='indisponivel') throw new Error('Financeiro indisponível.');
      const ob=p.obrigacoes.totais||{}, caixa=p.reconciliacao.caixa||{}, lanc=resumoLancamentos(fontes,competencia);
      const entradasCaixa=numero(caixa.totalAgencia)+lanc.receita;
      const caixaLiquido=entradasCaixa-lanc.custos;
      const mov=p.movimentos||{ativos:[],entradas:[],saidas:[],totais:{}};
      const nomes=mapaNomes(fontes);
      box.innerHTML=`<div class="painelResumo" style="margin-bottom:16px;"><div class="resumoCard"><div class="num" style="font-size:17px;">${brl(ob.previsto||0)}</div><div class="lbl">Receita recorrente prevista</div></div><div class="resumoCard green"><div class="num" style="font-size:17px;">${brl(ob.quitado||0)}</div><div class="lbl">Quitado da competência</div></div><div class="resumoCard ${(ob.aberto||0)>0?'yellow':'green'}"><div class="num" style="font-size:17px;">${brl(ob.aberto||0)}</div><div class="lbl">Em aberto da competência</div></div><div class="resumoCard ${caixaLiquido<0?'red':'green'}"><div class="num" style="font-size:17px;">${brl(caixaLiquido)}</div><div class="lbl">Caixa líquido pela data real</div></div></div>
      <div class="card"><h2>🔗 Ponte de reconciliação</h2><div class="item"><div class="top"><div class="nome">Competência ${esc(nomeMes(competencia))}</div><b>${brl(ob.previsto||0)} = ${brl(ob.quitado||0)} quitado + ${brl(ob.aberto||0)} aberto</b></div></div><div class="item"><div class="top"><div class="nome">Caixa real de ${esc(nomeMes(competencia))}</div><b>${brl(entradasCaixa)} entradas − ${brl(lanc.custos)} custos = ${brl(caixaLiquido)}</b></div><div class="meta">Pagamento atrasado entra no caixa pela data em que foi recebido, sem mudar sua competência original.</div></div></div>
      ${htmlConflitos(p)}
      <div class="card"><h2>👥 Carteira da competência</h2><div class="painelResumo"><div class="resumoCard green"><div class="num">${mov.totais?.ativos||0}</div><div class="lbl">Ativos</div></div><div class="resumoCard"><div class="num">${mov.totais?.entradas||0}</div><div class="lbl">Entraram</div></div><div class="resumoCard"><div class="num">${mov.totais?.saidas||0}</div><div class="lbl">Saíram</div></div></div>${mov.entradas?.length?`<div class="meta">Entradas: ${mov.entradas.map(v=>esc(nomes.get(v.canonicalId)||v.canonicalId)).join(' · ')}</div>`:''}${mov.saidas?.length?`<div class="meta">Saídas: ${mov.saidas.map(v=>esc(nomes.get(v.canonicalId)||v.canonicalId)).join(' · ')}</div>`:''}</div>`;
      await w.renderFinanceiroLancamentosV103(fontes,competencia);
      return true;
    }catch(e){ console.error('V103 financeiro indisponível:',e); box.innerHTML='<div class="card" style="border:2px solid var(--red);"><b>Financeiro indisponível</b><div class="desc">Nenhum total foi zerado ou inferido. Tente novamente quando as fontes responderem.</div></div>'; return false; }
  };

  async function sha256Hex(valor){
    const bytes=new TextEncoder().encode(String(valor));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
  }

  function operationId(){
    const bruto=(crypto.randomUUID?.()||`${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g,'_');
    return 'fin_'+bruto.padEnd(12,'0').slice(0,156);
  }

  function timestampData(data){
    const d=new Date(`${data}T12:00:00-03:00`);
    return Number.isNaN(d.getTime())?null:d;
  }

  function htmlLancamento(item){
    const tipo={custo_fixo:'Custo fixo',salario:'Salário',imposto:'Imposto',despesa_operacional:'Despesa operacional',receita_ajuste:'Receita/ajuste'}[item.tipo]||item.tipo;
    const cor=item.status==='pago'?'var(--green)':item.status==='cancelado'?'var(--line)':'var(--yellow)';
    return `<div class="item" style="border-left:3px solid ${cor};"><div class="top"><div class="nome">${esc(item.descricao)}</div><span class="selo ${item.status==='pago'?'aprovada':'pendente'}">${esc(item.status)}</span></div><div class="meta">${esc(tipo)} · ${brl(item.valor)}${item.dataCaixa?.toDate?' · caixa '+item.dataCaixa.toDate().toLocaleDateString('pt-BR'):''}</div>${item.status==='previsto'?`<div class="btnrow" style="margin-top:8px;align-items:end;"><div class="field" style="max-width:210px;"><label>Data real do pagamento</label><input type="date" id="finLancBaixaData_${escAttr(item.id)}" value="${escAttr(hojeLocal())}"></div><button class="btn green" style="width:auto;" onclick="alterarLancamentoFinanceiroV103('${escJs(item.id)}','pago')">Confirmar pagamento</button><button class="btn secondary" style="width:auto;" onclick="alterarLancamentoFinanceiroV103('${escJs(item.id)}','cancelado')">Cancelar com histórico</button></div>`:''}</div>`;
  }

  w.renderFinanceiroLancamentosV103=async function(fontesFornecidas,competenciaFornecida){
    const box=document.getElementById('financeiroLancamentosBox'); if(!box||!canFinanceiro()) return false;
    try{
      const fontes=fontesFornecidas||await carregarSnapshot();
      const competencia=competenciaFornecida||campoCompetencia('finMes');
      const resumo=resumoLancamentos(fontes,competencia);
      const lista=[...resumo.lista].sort((a,b)=>texto(a.status).localeCompare(texto(b.status))||texto(a.descricao).localeCompare(texto(b.descricao),'pt-BR'));
      box.innerHTML=`<div class="painelResumo" style="margin-top:12px;"><div class="resumoCard"><div class="num" style="font-size:17px;">${brl(resumo.previsto)}</div><div class="lbl">Custos previstos</div></div><div class="resumoCard red"><div class="num" style="font-size:17px;">${brl(resumo.custos)}</div><div class="lbl">Custos pagos no caixa</div></div><div class="resumoCard green"><div class="num" style="font-size:17px;">${brl(resumo.receita)}</div><div class="lbl">Ajustes de receita pagos</div></div></div>
      <div class="row3" style="margin-top:12px;"><div class="field"><label>Tipo</label><select id="finLancTipo"><option value="custo_fixo">Custo fixo</option><option value="salario">Salário</option><option value="imposto">Imposto</option><option value="despesa_operacional">Despesa operacional</option><option value="receita_ajuste">Receita/ajuste</option></select></div><div class="field"><label>Descrição</label><input id="finLancDescricao" placeholder="Ex.: folha da equipe"></div><div class="field"><label>Valor</label><input id="finLancValor" type="number" min="0.01" step="0.01"></div></div>
      <div class="row3"><div class="field"><label>Estado inicial</label><select id="finLancStatus"><option value="previsto">Previsto</option><option value="pago">Pago</option></select></div><div class="field"><label>Data real do caixa (se pago)</label><input id="finLancData" type="date"></div><div class="field"><label>Referência interna</label><input id="finLancBeneficiario" value="agencia" placeholder="agencia, equipe, fornecedor"></div></div>
      <div class="field"><label>Observação opcional</label><input id="finLancObs" maxlength="500"></div><button class="btn" style="width:auto;" onclick="salvarLancamentoFinanceiroV103()">Adicionar lançamento com recibo</button>
      <div style="margin-top:12px;">${lista.length?lista.map(htmlLancamento).join(''):'<div class="empty">Nenhum custo ou ajuste nesta competência.</div>'}</div>`;
      return true;
    }catch(e){ box.innerHTML='<div class="desc" style="color:var(--red);">Custos indisponíveis; nada foi tratado como zero.</div>'; return false; }
  };

  async function gravarLancamento({existente=null,statusNovo=null,dataCaixaReal=''}={}){
    const uid=auth.currentUser?.uid; if(!uid) throw new Error('Sessão autenticada não confirmada.');
    const comp=campoCompetencia('finMes');
    let docId,base,status,op,tipoEvento,reversalOf=null;
    if(existente){
      docId=existente.id; status=statusNovo;
      if(!['pago','cancelado'].includes(status)) throw new Error('Transição não permitida.');
      op=operationId();
      tipoEvento=existente.status==='pago'&&status==='cancelado'?'reversao':status==='pago'?'baixa':'cancelamento';
      reversalOf=tipoEvento==='reversao'?existente.operationId:null;
      const dataPagamento=status==='pago'?timestampData(dataCaixaReal):null;
      if(status==='pago'&&!dataPagamento) throw new Error('Informe a data real do pagamento.');
      base={...existente,status,revision:numero(existente.revision)+1,operationId:op,observacao:status==='cancelado'?(texto(existente.observacao)||'Cancelado com histórico'):texto(existente.observacao),dataCaixa:status==='pago'?dataPagamento:existente.dataCaixa||null,atualizadoEm:serverTimestamp()};
      delete base.id;
    }else{
      const tipo=texto(document.getElementById('finLancTipo')?.value);
      const descricao=texto(document.getElementById('finLancDescricao')?.value);
      const valor=numero(document.getElementById('finLancValor')?.value);
      status=texto(document.getElementById('finLancStatus')?.value);
      const data=texto(document.getElementById('finLancData')?.value);
      const beneficiarioRef=texto(document.getElementById('finLancBeneficiario')?.value).replace(/[^A-Za-z0-9._:-]/g,'_');
      const observacao=texto(document.getElementById('finLancObs')?.value);
      if(!['custo_fixo','salario','imposto','despesa_operacional','receita_ajuste'].includes(tipo)) throw new Error('Tipo inválido.');
      if(descricao.length<3||descricao.length>120) throw new Error('Descrição deve ter entre 3 e 120 caracteres.');
      if(!(valor>0)) throw new Error('Informe um valor maior que zero.');
      if(!['previsto','pago'].includes(status)) throw new Error('Estado inicial inválido.');
      if(!beneficiarioRef) throw new Error('Informe uma referência interna.');
      const dataCaixa=status==='pago'?timestampData(data):null;
      if(status==='pago'&&!dataCaixa) throw new Error('Informe a data real do pagamento.');
      const assinaturaIntencao=await sha256Hex(JSON.stringify({
        schemaVersion:1,competencia:comp,tipo,descricao,valor,status,
        dataCaixa:data||null,beneficiarioRef,observacao,
      }));
      op='fin_'+assinaturaIntencao;
      docId='lanc_'+assinaturaIntencao;
      tipoEvento='lancamento';
      base={schemaVersion:1,competencia:comp,tipo,descricao,valor,status,dataCaixa,beneficiarioRef,observacao,autorUid:uid,criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp(),revision:1,operationId:op};
    }
    const principal=doc(db,'financeiro_lancamentos',docId),evento=doc(db,'clientes_ciclo_financeiro',op);
    const pre=await sha256Hex(JSON.stringify(existente||{novo:true,docId}));
    const post=await sha256Hex(JSON.stringify({...base,criadoEm:'server',atualizadoEm:'server'}));
    await runTransaction(db,async tx=>{
      const [pSnap,eSnap]=await Promise.all([tx.get(principal),tx.get(evento)]);
      if(eSnap.exists()){
        if(eSnap.data().sourceId!==docId) throw new Error('OperationId já pertence a outra ação.');
        return;
      }
      if(existente){
        if(!pSnap.exists()||numero(pSnap.data().revision)!==numero(existente.revision)||pSnap.data().operationId!==existente.operationId) throw new Error('Outra aba alterou este lançamento. Atualize a tela.');
      }else if(pSnap.exists()) throw new Error('Este lançamento já existe.');
      const carimbo=serverTimestamp();
      if(!existente){ base.criadoEm=carimbo; }
      base.atualizadoEm=carimbo;
      tx.set(principal,base,{merge:false});
      tx.set(evento,{schemaVersion:1,operationId:op,clienteId:base.beneficiarioRef,tipo:tipoEvento,competenciaInicio:base.competencia,ultimaCompetencia:null,dataEfetiva:base.dataCaixa||new Date(),valor:base.valor,sourceType:'financeiro_lancamento',sourceId:docId,reversalOf,preHash:pre,postHash:post,criadoPor:uid,criadoEm:carimbo});
    });
    const [recibo,reciboEvento]=await Promise.all([getDoc(principal),getDoc(evento)]);
    if(!recibo.exists()||recibo.data().operationId!==op||!reciboEvento.exists()) throw new Error('Recibo incompleto. Não repita; atualize a tela.');
  }

  w.salvarLancamentoFinanceiroV103=async function(){
    if(!canFinanceiro()||locks.has('lancamento')) return false; locks.add('lancamento');
    try{await gravarLancamento();invalidar();mostrarToast('Lançamento salvo com evento e recibo.');await w.renderFinanceiro();return true;}
    catch(e){console.error(e);mostrarToast('Nada foi alterado: '+(e.message||e),'erro');return false;}
    finally{locks.delete('lancamento');}
  };

  w.alterarLancamentoFinanceiroV103=async function(id,status){
    if(!canFinanceiro()||locks.has('lanc:'+id)) return false;
    const dataCaixaReal=status==='pago'?texto(document.getElementById(`finLancBaixaData_${id}`)?.value):'';
    if(status==='pago'&&!timestampData(dataCaixaReal)){ mostrarToast('Informe a data real do pagamento.','erro'); return false; }
    if(!confirm(status==='pago'?`Confirmar pagamento na data real ${dataCaixaReal.split('-').reverse().join('/')}?`:'Cancelar preservando o histórico?')) return false;
    locks.add('lanc:'+id);
    try{const fontes=await carregarSnapshot({forcar:true});const existente=fontes.financeiro_lancamentos.find(v=>v.id===id);if(!existente)throw new Error('Lançamento não encontrado.');await gravarLancamento({existente,statusNovo:status,dataCaixaReal});invalidar();mostrarToast('Lançamento atualizado com recibo.');await w.renderFinanceiro();return true;}
    catch(e){mostrarToast('Nada foi alterado: '+(e.message||e),'erro');return false;}
    finally{locks.delete('lanc:'+id);}
  };

  function tabelaMovimentos(entradas,saidas,nomes,competencia){
    const linhas=[
      ...entradas.map(v=>({...v,tipo:'Entrada',classe:'aprovada'})),
      ...saidas.map(v=>({...v,tipo:'Saída',classe:'atrasado'})),
    ].sort((a,b)=>a.tipo.localeCompare(b.tipo,'pt-BR')||(nomes.get(a.canonicalId)||a.canonicalId).localeCompare(nomes.get(b.canonicalId)||b.canonicalId,'pt-BR'));
    return `<div class="card" data-fin-movimentos><h2>↕ Entradas e saídas de ${esc(nomeMes(competencia))}</h2><div class="desc">Uma única tabela mensal; o histórico não desaparece quando a carteira muda.</div>${linhas.length?`<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;margin-top:10px;"><thead><tr><th style="text-align:left;padding:8px;">Movimento</th><th style="text-align:left;padding:8px;">Cliente</th><th style="text-align:left;padding:8px;">Competência</th><th style="text-align:left;padding:8px;">Fonte</th></tr></thead><tbody>${linhas.map(v=>`<tr><td style="padding:8px;border-top:1px solid var(--line);"><span class="selo ${v.classe}">${v.tipo}</span></td><td style="padding:8px;border-top:1px solid var(--line);"><b>${esc(nomes.get(v.canonicalId)||v.canonicalId)}</b></td><td style="padding:8px;border-top:1px solid var(--line);">${esc(v.competencia||competencia)}</td><td style="padding:8px;border-top:1px solid var(--line);">${esc(v.origem||'contrato')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma entrada ou saída nesta competência.</div>'}</div>`;
  }

  function fecharVigenciaNaCompetencia(contrato,competenciaFinal){
    const inicio=texto(contrato?.primeiraCompetencia);
    if(!Array.isArray(contrato?.vigencias)){
      return Core.competenciaValida(inicio)
        ? [{inicio,fim:competenciaFinal,valor:numero(contrato.valorInicial??contrato.valorVigente??contrato.valorCheio),cicloId:'legado-inicial'}]
        : null;
    }
    let fechou=false;
    const vigencias=contrato.vigencias.filter(v=>v&&v.excluido!==true).map(v=>{
      const comeco=texto(v.inicio);
      const fim=texto(v.fim);
      if(!fechou&&!fim&&Core.competenciaValida(comeco)&&comeco<=competenciaFinal){
        fechou=true;
        return {...v,fim:competenciaFinal};
      }
      return {...v};
    });
    if(fechou) return vigencias;
    const jaFechada=vigencias.some(v=>texto(v.fim)===competenciaFinal);
    const cicloPosterior=vigencias.some(v=>Core.competenciaValida(texto(v.inicio))&&texto(v.inicio)>competenciaFinal);
    return jaFechada&&!cicloPosterior?vigencias:null;
  }

  function contratoFisicoCanonico(fontes,canonicalId){
    const candidatos=(fontes.contratos||[]).filter(v=>v.canonicalId===canonicalId&&v.excluido!==true&&v.arquivado!==true);
    return candidatos.length===1&&candidatos[0].id===canonicalId
      ? {contrato:candidatos[0],ids:candidatos.map(v=>v.id),ok:true}
      : {contrato:null,ids:candidatos.map(v=>v.id),ok:false};
  }

  function assinaturaContratoAlvo(contrato){
    return JSON.stringify({
      id:texto(contrato?.id),
      valorVigente:contrato?.valorVigente??null,
      valorProgramado:contrato?.valorProgramado??null,
      valorProgramadoEm:texto(contrato?.valorProgramadoEm),
      primeiraCompetencia:texto(contrato?.primeiraCompetencia),
      ultimaCompetenciaPagamento:texto(contrato?.ultimaCompetenciaPagamento),
      vigencias:Array.isArray(contrato?.vigencias)?contrato.vigencias:[],
      status:texto(contrato?.status),
    });
  }

  w.renderContratos=async function(){
    if(!canContratos()){document.getElementById('contratosBox')?.replaceChildren();return false;}
    const box=document.getElementById('contratosBox');if(!box)return false;
    const competencia=campoCompetencia('ctMes');
    ['finMes','mensMes','cobMes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=competencia;});
    box.innerHTML='<div class="card"><div class="desc">Projetando carteira, entradas e saídas da competência…</div></div>';
    try{
      const fontes=await carregarSnapshot({modo:'contratos'});
      const mov=Core.projetarMovimentosCompetencia({contratos:fontes.contratos,saidas:fontes.saidas,competencia});
      if(mov.estado==='indisponivel')throw new Error('Carteira indisponível.');
      const nomes=mapaNomes(fontes);
      // O Core já resolveu aliases, vigências e conflitos. Reaproveitar o
      // documento físico selecionado evita editar um alias arquivado apenas
      // porque ele apareceu por último na leitura da coleção.
      const cards=mov.ativos.map(v=>v.contrato).filter(Boolean).sort((a,b)=>texto(a.clienteNome).localeCompare(texto(b.clienteNome),'pt-BR'));
      let html=`<div class="painelResumo"><div class="resumoCard green"><div class="num">${mov.totais.ativos}</div><div class="lbl">Ativos em ${esc(nomeMes(competencia))}</div></div><div class="resumoCard"><div class="num">${mov.totais.entradas}</div><div class="lbl">Entraram no mês</div></div><div class="resumoCard"><div class="num">${mov.totais.saidas}</div><div class="lbl">Saíram no mês</div></div></div>${htmlConflitos(mov)}${tabelaMovimentos(mov.entradas,mov.saidas,nomes,competencia)}<div class="card"><b>Fichas dos contratos vigentes nesta competência</b><div class="desc">O seletor muda o retrato histórico. Valores recebidos, caixa, custos e contatos privados não são carregados nesta tela. Salvar uma ficha é uma ação explícita.</div></div>`;
      html+=cards.map(ct=>{
        const slug=ct.id,valorAtual=Core.valorNaCompetencia(ct,competencia);const valor=valorAtual.estado==='confirmado'?valorAtual.valor:numero(ct.valorVigente);
        const meses=Array.isArray(ct.cortesiaMeses)?ct.cortesiaMeses:[];
        return `<div class="faixaDem" data-faixa="ct_${escAttr(slug)}" data-fin-contrato-v103="${escAttr(slug)}"><div class="faixaHead" onclick="toggleFaixaDemandas(this)">${esc(ct.clienteNome||slug)} <span class="qtd">${brl(valor)} · dia ${numero(ct.diaVencimento)||10}${ct.ultimaCompetenciaPagamento?' · último mês '+esc(ct.ultimaCompetenciaPagamento):''}</span><span class="seta">▾</span></div><div class="faixaItens"><div class="row2"><div class="field"><label>Cliente</label><input id="ctNome_${escAttr(slug)}" value="${escAttr(ct.clienteNome||'')}"></div><div class="field"><label>Plano</label><input id="ctPlano_${escAttr(slug)}" value="${escAttr(ct.plano||'Mensalista')}"></div></div><div class="row3"><div class="field"><label>Valor cheio</label><input type="number" id="ctValorCheio_${escAttr(slug)}" value="${numero(ct.valorCheio)}"></div><div class="field"><label>Valor base vigente</label><input type="number" id="ctValorVigente_${escAttr(slug)}" value="${numero(ct.valorVigente)}"></div><div class="field"><label>Vencimento</label><input type="number" id="ctDia_${escAttr(slug)}" value="${numero(ct.diaVencimento)||10}"></div></div><input type="hidden" id="ctVolta_${escAttr(slug)}" value="${escAttr(ct.voltaAoCheioEm||'')}"><input type="hidden" id="ctStatus_${escAttr(slug)}" value="${escAttr(ct.status||'ativo')}"><input type="hidden" id="ctRevision_${escAttr(slug)}" value="${numero(ct.financeiroRevision)}"><div class="row2"><div class="field"><label>Primeira competência · histórico</label><input type="month" id="ctPrimeiraCompetencia_${escAttr(slug)}" value="${escAttr(ct.primeiraCompetencia||'')}" readonly aria-readonly="true"><div class="meta">Entradas e reativações são corrigidas somente pela Central, com evento auditável.</div></div><div class="field"><label>Situação do ciclo</label><div class="meta">${esc(ct.status||'ativo')} · entradas e saídas são alteradas somente pela Central, com competência e histórico.</div></div></div><div class="field"><label>Observação</label><textarea id="ctObs_${escAttr(slug)}">${esc(ct.observacao||'')}</textarea></div><input type="checkbox" id="ctCortesiaPerm_${escAttr(slug)}" ${ct.cortesiaPermanente?'checked':''} hidden><textarea id="ctCortesiaMeses_${escAttr(slug)}" hidden>${esc(meses.join('\n'))}</textarea><div class="card" style="border-color:var(--yellow);"><b>Alteração programada</b><div class="row3"><div class="field"><label>Novo valor</label><input type="number" id="ctValorProgramado_${escAttr(slug)}" value="${ct.valorProgramado??''}"></div><div class="field"><label>Começa em</label><input type="month" id="ctValorProgramadoEm_${escAttr(slug)}" value="${escAttr(ct.valorProgramadoEm||Core.proximaCompetencia(hojeLocal().slice(0,7)))}"></div><div class="field"><label>Motivo</label><input id="ctValorProgramadoMotivo_${escAttr(slug)}" value="${escAttr(ct.valorProgramadoMotivo||'')}"></div></div></div><button class="btn" style="width:auto;" onclick="salvarContrato('${escJs(slug)}')">Salvar contrato</button></div></div>`;
      }).join('');
      box.innerHTML=html;
      box.querySelectorAll('[id^="ctValorVigente_"]').forEach(el=>{
        el.readOnly=true;
        el.setAttribute('aria-readonly','true');
        el.title='Valor histórico. Programe a alteração no bloco abaixo.';
      });
      return true;
    }catch(e){console.error(e);box.innerHTML='<div class="card" style="border:2px solid var(--red);"><b>Carteira indisponível</b><div class="desc">Nenhum cliente foi contado como ativo ou inativo. Tente novamente.</div></div>';return false;}
  };

  function valorDoCampo(id,slug){ return texto(document.getElementById(`${id}_${slug}`)?.value); }

  function contratoConfereIntencao(dados,intencao,revision){
    return numero(dados.financeiroRevision)===revision &&
      texto(dados.clienteNome)===intencao.clienteNome &&
      texto(dados.plano)===intencao.plano &&
      numero(dados.valorCheio)===intencao.valorCheio &&
      numero(dados.valorVigente??dados.valorCheio)===intencao.valorVigente &&
      numero(dados.diaVencimento)===intencao.diaVencimento &&
      texto(dados.observacao)===intencao.observacao &&
      (!intencao.temProgramacao || (
        numero(dados.valorProgramado)===intencao.valorProgramado &&
        texto(dados.valorProgramadoEm)===intencao.valorProgramadoEm &&
        texto(dados.valorProgramadoMotivo)===intencao.valorProgramadoMotivo
      ));
  }

  function atualizacaoPagamentoPorContrato(dados,intencao){
    const status=Core.statusMensalidade(dados);
    if(status==='indisponivel') throw new Error(`A mensalidade ${texto(dados.competencia)||'sem competência'} tem estado desconhecido.`);
    if(['pago','cancelado'].includes(status)) return null;
    const ajuste={};
    const competenciaPagamento=texto(dados.competencia);
    const inicioCadastro=intencao.competenciaEdicao>intencao.competenciaAtual?intencao.competenciaEdicao:intencao.competenciaAtual;
    const podeAjustarCadastro=status==='aberto'&&competenciaPagamento>=inicioCadastro;
    if(podeAjustarCadastro&&texto(dados.clienteNome)!==intencao.clienteNome) ajuste.clienteNome=intencao.clienteNome;
    // Nunca reescreva o vencimento de passivos anteriores. A ficha vale da
    // competência selecionada em diante; correção retroativa é outra ação.
    if(podeAjustarCadastro&&numero(dados.diaVencimento)!==intencao.diaVencimento) ajuste.diaVencimento=intencao.diaVencimento;
    if(intencao.programacaoMudou&&['aberto','isento'].includes(status)&&competenciaPagamento>=intencao.valorProgramadoEm){
      let valorMudou=false;
      if(numero(dados.valorDevido)!==intencao.valorProgramado) ajuste.valorDevido=intencao.valorProgramado;
      if(Object.prototype.hasOwnProperty.call(ajuste,'valorDevido')) valorMudou=true;
      if(Object.prototype.hasOwnProperty.call(dados,'valor')&&numero(dados.valor)!==intencao.valorProgramado){ ajuste.valor=intencao.valorProgramado; valorMudou=true; }
      if(Object.prototype.hasOwnProperty.call(dados,'valorCobrado')&&numero(dados.valorCobrado)!==intencao.valorProgramado){ ajuste.valorCobrado=intencao.valorProgramado; valorMudou=true; }
      if(valorMudou){
        ajuste.valorContratoProgramado=true;
        ajuste.valorContratoProgramadoEm=intencao.valorProgramadoEm;
        ajuste.financeiroOperationId=intencao.operationId;
      }
    }
    return Object.keys(ajuste).length?ajuste:null;
  }

  w.salvarContratoV103=async function(slug){
    if(!canFinanceiro()){
      mostrarToast('Amanda cadastra novos clientes pela Central. Alterações financeiras de contratos existentes são confirmadas pelo Chris.','erro');
      return false;
    }
    const chave=`contrato:${slug}`;
    if(locks.has(chave)) return false;
    const clienteNome=valorDoCampo('ctNome',slug);
    const plano=valorDoCampo('ctPlano',slug);
    const valorCheio=numero(valorDoCampo('ctValorCheio',slug));
    const valorVigente=numero(valorDoCampo('ctValorVigente',slug));
    const diaVencimento=Number.parseInt(valorDoCampo('ctDia',slug),10);
    const observacao=valorDoCampo('ctObs',slug);
    const esperado=numero(valorDoCampo('ctRevision',slug));
    const valorProgramadoTxt=valorDoCampo('ctValorProgramado',slug);
    const valorProgramado=numero(valorProgramadoTxt);
    const valorProgramadoEm=valorDoCampo('ctValorProgramadoEm',slug);
    const valorProgramadoMotivo=valorDoCampo('ctValorProgramadoMotivo',slug);
    const competenciaEdicao=campoCompetencia('ctMes');
    const competenciaAtual=hojeLocal().slice(0,7);
    const temProgramacao=valorProgramadoTxt!=='';
    if(!clienteNome) { mostrarToast('O nome do cliente é obrigatório.','erro'); return false; }
    if(!plano) { mostrarToast('O plano é obrigatório.','erro'); return false; }
    if(!(valorCheio>0)||!(valorVigente>0)) { mostrarToast('Os valores do contrato precisam ser maiores que zero.','erro'); return false; }
    if(!Number.isInteger(diaVencimento)||diaVencimento<1||diaVencimento>31) { mostrarToast('Dia de vencimento inválido (1 a 31).','erro'); return false; }
    if(temProgramacao&&(!(valorProgramado>0)||!Core.competenciaValida(valorProgramadoEm)||valorProgramadoMotivo.length<3)){
      mostrarToast('A alteração programada exige valor, competência e motivo.','erro');
      return false;
    }
    const intencaoBase={slug,clienteNome,plano,valorCheio,valorVigente,diaVencimento,observacao,temProgramacao,valorProgramado,valorProgramadoEm,valorProgramadoMotivo,competenciaEdicao,competenciaAtual,esperado};
    const assinaturaIntencao=await sha256Hex(JSON.stringify(intencaoBase));
    const op=`fin_${assinaturaIntencao}`;
    const contratoRef=doc(db,'contratos_cliente',slug);
    const eventoRef=doc(db,'clientes_ciclo_financeiro',op);
    locks.add(chave);
    let transacaoIniciada=false;
    try{
      // A leitura ampla ocorre somente depois do clique. Renderizar Contratos
      // continua sem carregar mensalidades nem dados privados de caixa.
      const pagamentosSnap=await getDocs(collection(db,'pagamentos_mensais'));
      const pagamentos=[];
      pagamentosSnap.forEach(d=>{
        const dados=d.data()||{};
        const idCanonico=canonico(dados.canonicalId||dados.cliente||dados.clienteSlug||String(d.id).replace(/_\d{4}-\d{2}$/,''));
        if(idCanonico===canonico(slug)&&Core.competenciaValida(texto(dados.competencia))) pagamentos.push({id:d.id,ref:d.ref,dados});
      });
      if(pagamentos.length>350) throw new Error('Há mensalidades demais para uma alteração atômica. Faça uma auditoria antes de salvar.');
      const refsPag=[...new Map(pagamentos.map(v=>[v.id,v.ref])).values()];
      let semMudanca=false, retryConfirmado=false, revisionFinal=esperado;
      transacaoIniciada=true;
      await runTransaction(db,async tx=>{
        const refs=[contratoRef,eventoRef,...refsPag];
        const snaps=await Promise.all(refs.map(ref=>tx.get(ref)));
        const contratoSnap=snaps[0],eventoSnap=snaps[1];
        if(!contratoSnap.exists()) throw new Error('Contrato não encontrado.');
        const atual=contratoSnap.data()||{};
        const programacaoMudou=temProgramacao&&(
          numero(atual.valorProgramado)!==valorProgramado ||
          texto(atual.valorProgramadoEm)!==valorProgramadoEm ||
          texto(atual.valorProgramadoMotivo)!==valorProgramadoMotivo
        );
        const intencao={...intencaoBase,programacaoMudou,operationId:op};
        if(eventoSnap.exists()){
          if(eventoSnap.data().sourceId!==slug||!contratoConfereIntencao(atual,intencao,esperado+1)) throw new Error('O recibo existe, mas o contrato divergiu. Atualize a tela; não repita.');
          retryConfirmado=true; revisionFinal=esperado+1; return;
        }
        if(numero(atual.financeiroRevision)!==esperado) throw new Error('Outra aba alterou este contrato. Atualize a tela antes de salvar.');
        const atualVigente=numero(atual.valorVigente??atual.valorCheio);
        if(valorVigente!==atualVigente) throw new Error('O valor do mês vigente é imutável aqui. Programe a alteração para o próximo mês.');
        if(programacaoMudou&&valorProgramadoEm<Core.proximaCompetencia(hojeLocal().slice(0,7))) throw new Error('O novo valor deve começar no próximo mês ou depois.');
        const mudouBasico=texto(atual.clienteNome)!==clienteNome||texto(atual.plano)!==plano||numero(atual.valorCheio)!==valorCheio||numero(atual.diaVencimento)!==diaVencimento||texto(atual.observacao)!==observacao;
        if(!mudouBasico&&!programacaoMudou){ semMudanca=true; return; }
        const proximaRevision=esperado+1;
        const carimbo=serverTimestamp();
        const atualizacao={clienteNome,plano,valorCheio,diaVencimento,observacao,financeiroRevision:proximaRevision,financeiroOperationId:op,atualizadoPor:'Chris',atualizadoEm:carimbo};
        if(programacaoMudou){
          const historico=Array.isArray(atual.historicoAlteracoesValor)?atual.historicoAlteracoesValor.filter(v=>v?.operationId!==op):[];
          historico.push({acao:'programada',valorAnterior:Core.valorNaCompetencia({...atual,slug},hojeLocal().slice(0,7)).valor??atualVigente,novoValor:valorProgramado,inicio:valorProgramadoEm,motivo:valorProgramadoMotivo,por:'Chris',operationId:op});
          Object.assign(atualizacao,{valorProgramado,valorProgramadoEm,valorProgramadoMotivo,valorProgramadoPor:'Chris',valorProgramadoAtualizadoEm:carimbo,historicoAlteracoesValor:historico});
        }
        const pagamentosLidos=snaps.slice(2);
        pagamentos.forEach(v=>{
          const indice=refsPag.findIndex(ref=>ref.id===v.id);
          const snap=pagamentosLidos[indice];
          if(!snap?.exists()) return;
          const ajuste=atualizacaoPagamentoPorContrato(snap.data(),intencao);
          if(ajuste) tx.set(v.ref,{...ajuste,atualizadoPor:'Chris',atualizadoEm:carimbo},{merge:true});
        });
        const preHash=await sha256Hex(JSON.stringify({revision:esperado,contrato:atual}));
        const postHash=await sha256Hex(JSON.stringify({revision:proximaRevision,intencao}));
        if(preHash===postHash) throw new Error('A alteração não gerou uma mudança auditável.');
        tx.set(contratoRef,atualizacao,{merge:true});
        tx.set(eventoRef,{schemaVersion:1,operationId:op,clienteId:canonico(slug),tipo:programacaoMudou?'alteracao_valor':'ajuste',competenciaInicio:programacaoMudou?valorProgramadoEm:campoCompetencia('ctMes'),ultimaCompetencia:null,dataEfetiva:programacaoMudou?new Date(`${valorProgramadoEm}-01T12:00:00-03:00`):new Date(),valor:programacaoMudou?valorProgramado:null,sourceType:'contrato',sourceId:slug,reversalOf:null,preHash,postHash,criadoPor:auth.currentUser?.uid||'',criadoEm:carimbo});
        revisionFinal=proximaRevision;
      });
      if(semMudanca){ mostrarToast('Nenhuma alteração para salvar.'); return true; }
      const [recibo,evento]=await Promise.all([getDoc(contratoRef),getDoc(eventoRef)]);
      const intencaoRecibo={...intencaoBase,programacaoMudou:temProgramacao&&(
        numero(recibo.data()?.valorProgramado)===valorProgramado&&texto(recibo.data()?.valorProgramadoEm)===valorProgramadoEm
      )};
      if(!recibo.exists()||!evento.exists()||!contratoConfereIntencao(recibo.data(),intencaoRecibo,revisionFinal)) throw new Error('A transação terminou, mas os recibos não confirmaram o contrato. Não repita; atualize.');
      if(temProgramacao){
        const releitura=await getDocs(collection(db,'pagamentos_mensais'));
        const divergentes=[];
        releitura.forEach(d=>{
          const dados=d.data()||{};
          const cliente=canonico(dados.canonicalId||dados.cliente||dados.clienteSlug||String(d.id).replace(/_\d{4}-\d{2}$/,''));
          const status=Core.statusMensalidade(dados);
          if(cliente!==canonico(slug)||texto(dados.competencia)<valorProgramadoEm||!['aberto','isento'].includes(status)) return;
          const valores=[dados.valorDevido,...(Object.prototype.hasOwnProperty.call(dados,'valor')?[dados.valor]:[]),...(Object.prototype.hasOwnProperty.call(dados,'valorCobrado')?[dados.valorCobrado]:[])].map(numero);
          if(valores.some(v=>v!==valorProgramado)) divergentes.push(d.id);
        });
        if(divergentes.length) throw new Error(`O contrato foi confirmado, mas ${divergentes.length} mensalidade(s) criada(s) em paralelo precisam de reconciliação. Não repita; atualize a tela.`);
      }
      invalidar();
      mostrarToast(retryConfirmado?'O contrato já estava confirmado; nenhuma escrita foi repetida.':'Contrato salvo com revisão e recibo.');
      await w.renderContratos();
      return true;
    }catch(e){
      console.error(e);
      mostrarToast((transacaoIniciada?'A alteração não pôde ser confirmada. Não repita antes de atualizar: ':'Nada foi alterado: ')+(e.message||e),'erro');
      return false;
    }
    finally{ locks.delete(chave); }
  };
  w.salvarContrato=w.salvarContratoV103;

  async function lerCorrecaoSetembro(){
    const fontes=await carregarSnapshot({forcar:true});
    const grupoVitalle=contratoFisicoCanonico(fontes,'vitalle-odonto');
    const grupoMonique=contratoFisicoCanonico(fontes,'dra-monique');
    const grupoJoaquin=contratoFisicoCanonico(fontes,'joaquin-assados');
    const grupoAcougue=contratoFisicoCanonico(fontes,'acougue-sao-joaquim');
    const vitalle=grupoVitalle.contrato;
    const monique=grupoMonique.contrato;
    const joaquin=grupoJoaquin.contrato;
    const acougue=grupoAcougue.contrato;
    const pVitalle=fontes.pagamentos.filter(v=>v.canonicalId==='vitalle-odonto'&&v.competencia>='2026-09');
    const pMonique=fontes.pagamentos.filter(v=>v.canonicalId==='dra-monique'&&v.competencia>='2026-09');
    const pJoaquin=fontes.pagamentos.filter(v=>v.canonicalId==='joaquin-assados'&&v.competencia>='2026-09');
    const saidasJ=fontes.saidas.filter(v=>v.canonicalId==='joaquin-assados'&&v.excluido!==true&&v.statusSaida!=='cancelada');
    const saidaAutoritativa=saidasJ.find(v=>v.ultimaCompetenciaPagamento==='2026-08')||saidasJ[0]||null;
    const duplicadas=saidasJ.filter(v=>v.id!==saidaAutoritativa?.id);
    const saidasAcougue=fontes.saidas.filter(v=>v.canonicalId==='acougue-sao-joaquim'&&v.excluido!==true&&v.statusSaida!=='cancelada');
    const saidaAcougue=saidasAcougue.find(v=>v.ultimaCompetenciaPagamento==='2026-08')||null;
    const pAcougue=fontes.pagamentos.filter(v=>v.canonicalId==='acougue-sao-joaquim'&&v.competencia>='2026-09');
    const vigenciasMonique=monique?fecharVigenciaNaCompetencia(monique,'2026-08'):null;
    const vigenciasJoaquin=joaquin?fecharVigenciaNaCompetencia(joaquin,'2026-08'):null;
    const vigenciasAcougue=acougue?fecharVigenciaNaCompetencia(acougue,'2026-08'):null;
    const bloqueios=[];
    if(!grupoVitalle.ok) bloqueios.push(`Contrato físico canônico único da Vitalle não confirmado (${grupoVitalle.ids.join(', ')||'ausente'})`);
    if(pVitalle.some(v=>Core.statusMensalidade(v)==='pago'&&numero(v.valorDevido)!==1000)) bloqueios.push('Vitalle já possui competência paga com outro valor');
    if(pVitalle.some(v=>Core.statusMensalidade(v)==='indisponivel')) bloqueios.push('Vitalle possui mensalidade futura com estado desconhecido');
    if(!grupoMonique.ok) bloqueios.push(`Contrato físico canônico único da Monique não confirmado (${grupoMonique.ids.join(', ')||'ausente'})`);
    if(monique&&!vigenciasMonique) bloqueios.push('A vigência atual da Monique não pôde ser fechada com segurança em agosto');
    if(pMonique.some(v=>Core.statusMensalidade(v)==='pago')) bloqueios.push('Monique possui pagamento posterior já confirmado');
    if(pMonique.some(v=>Core.statusMensalidade(v)==='indisponivel')) bloqueios.push('Monique possui mensalidade futura com estado desconhecido');
    if(!grupoJoaquin.ok) bloqueios.push(`Contrato físico canônico único do Joaquim não confirmado (${grupoJoaquin.ids.join(', ')||'ausente'})`);
    if(joaquin&&!vigenciasJoaquin) bloqueios.push('A vigência do Joaquim não pôde ser fechada com segurança em agosto');
    if(pJoaquin.some(v=>Core.statusMensalidade(v)==='pago')) bloqueios.push('Joaquim possui pagamento posterior já confirmado');
    if(pJoaquin.some(v=>Core.statusMensalidade(v)==='indisponivel')) bloqueios.push('Joaquim possui mensalidade futura com estado desconhecido');
    if(!saidaAutoritativa||saidaAutoritativa.ultimaCompetenciaPagamento!=='2026-08') bloqueios.push('A saída financeira canônica do Joaquim não foi confirmada até agosto');
    if(!grupoAcougue.ok) bloqueios.push(`Contrato físico canônico único do Açougue não confirmado (${grupoAcougue.ids.join(', ')||'ausente'})`);
    if(acougue&&!vigenciasAcougue) bloqueios.push('A vigência do Açougue não pôde ser fechada com segurança em agosto');
    if(!saidaAcougue) bloqueios.push('A saída financeira do Açougue São Joaquim não foi confirmada até agosto');
    if(pAcougue.some(v=>Core.statusMensalidade(v)==='pago')) bloqueios.push('Açougue São Joaquim possui pagamento posterior já confirmado');
    if(pAcougue.some(v=>Core.statusMensalidade(v)==='indisponivel')) bloqueios.push('Açougue possui mensalidade futura com estado desconhecido');
    let ativosSimulados=null;
    if(monique&&joaquin&&acougue&&vigenciasMonique&&vigenciasJoaquin&&vigenciasAcougue){
      const contratosSimulados=fontes.contratos.map(v=>{
        if(v.id==='dra-monique') return {...v,ultimaCompetenciaPagamento:'2026-08',vigencias:vigenciasMonique};
        if(v.id==='joaquin-assados') return {...v,ultimaCompetenciaPagamento:'2026-08',vigencias:vigenciasJoaquin};
        if(v.id==='acougue-sao-joaquim') return {...v,ultimaCompetenciaPagamento:'2026-08',vigencias:vigenciasAcougue};
        return v;
      });
      const projecaoSimulada=Core.projetarFinanceiroCompetencia({contratos:contratosSimulados,pagamentos:fontes.pagamentos,saidas:fontes.saidas,competencia:'2026-09',mesCaixa:'2026-09'});
      ativosSimulados=projecaoSimulada.movimentos?.totais?.ativos??null;
      if(projecaoSimulada.estado==='indisponivel'||ativosSimulados!==19) bloqueios.push(`A carteira simulada de setembro resultou em ${ativosSimulados??'estado indisponível'} ativo(s), não 19`);
    }
    return {fontes,vitalle,monique,joaquin,acougue,pVitalle,pMonique,pJoaquin,saidasJ,saidaAutoritativa,duplicadas,saidasAcougue,saidaAcougue,pAcougue,vigenciasMonique,vigenciasJoaquin,vigenciasAcougue,ativosSimulados,bloqueios};
  }

  w.preverCorrecaoFinanceiraSetembroV103=async function(){
    if(!canFinanceiro())return false;const alvo=document.getElementById('financeiroCorrecoesV103Status');if(!alvo)return false;
    alvo.innerHTML='<div class="desc">Conferindo os documentos reais sem gravar…</div>';
    try{
      const p=await lerCorrecaoSetembro();w.__correcaoSetembroV103=p;
      alvo.innerHTML=`${p.bloqueios.length?`<div class="desc" style="color:var(--red);"><b>Aplicação bloqueada:</b> ${p.bloqueios.map(esc).join(' · ')}</div>`:`<div class="desc" style="color:var(--green);"><b>Prévia confirmada. Nenhuma gravação foi feita. Setembro fecha com ${p.ativosSimulados} clientes ativos.</b></div>`}<div class="item"><b>Vitalle</b><div class="meta">Programar R$ 1.000 desde 2026-09; atualizar somente documentos futuros não pagos/não cancelados (${p.pVitalle.length} encontrados).</div></div><div class="item"><b>Dra. Monique</b><div class="meta">Última competência 2026-08; saída em 15/09/2026; cancelar ${p.pMonique.filter(v=>!['pago','cancelado'].includes(Core.statusMensalidade(v))).length} obrigação(ões) futura(s), sem apagar histórico.</div></div><div class="item"><b>Joaquim Assados + Açougue São Joaquim</b><div class="meta">Preservar as duas empresas separadas; fechar ambas em agosto e cancelar ${p.pJoaquin.filter(v=>!['pago','cancelado'].includes(Core.statusMensalidade(v))).length+p.pAcougue.filter(v=>!['pago','cancelado'].includes(Core.statusMensalidade(v))).length} obrigação(ões) futura(s). No Joaquim, preservar ${esc(p.saidaAutoritativa?.id||'recibo não encontrado')} e arquivar ${p.duplicadas.length} duplicata(s) do mesmo evento.</div></div><div class="item"><b>Zeiss</b><div class="meta">O número fica somente na coleção financeira privada e não será escrito no código público.</div><div class="field" style="margin-top:8px;"><label>WhatsApp financeiro da Zeiss</label><input id="correcaoZeissWhatsV103" placeholder="+55 41 99999-9999"></div></div>${p.bloqueios.length?'':`<button class="btn" style="width:auto;margin-top:10px;" onclick="aplicarCorrecaoFinanceiraSetembroV103()">Aplicar os ajustes e conferir recibos</button>`}`;
      return !p.bloqueios.length;
    }catch(e){alvo.innerHTML='<div class="desc" style="color:var(--red);">Prévia indisponível. Nada foi alterado.</div>';return false;}
  };

  w.aplicarCorrecaoFinanceiraSetembroV103=async function(){
    if(!canFinanceiro()||locks.has('correcao-setembro'))return false;
    const numeroZeiss=Core.normalizarTelefoneBR(document.getElementById('correcaoZeissWhatsV103')?.value||'');
    if(!numeroZeiss){mostrarToast('Informe o WhatsApp da Zeiss com DDD. Ele ficará somente no Firebase privado.','erro');return false;}
    const previa=await lerCorrecaoSetembro();if(previa.bloqueios.length){mostrarToast('A prévia mudou; nada foi alterado.','erro');return false;}
    if(!confirm('Aplicar Vitalle, saída da Monique, deduplicação do Joaquim e contato privado da Zeiss? O sistema preservará pagos, cancelados e históricos.'))return false;
    locks.add('correcao-setembro');
    const uid=auth.currentUser?.uid;
    try{
      if(!uid)throw new Error('Sessão autenticada não confirmada.');
      const vitalleRef=doc(db,'contratos_cliente',previa.vitalle.id),moniqueRef=doc(db,'contratos_cliente',previa.monique.id),joaquinRef=doc(db,'contratos_cliente',previa.joaquin.id),acougueRef=doc(db,'contratos_cliente',previa.acougue.id),configMoniqueRef=doc(db,'clientes_config','dra-monique'),saidaMoniqueRef=doc(db,'clientes_encerrados','saida_dra-monique_2026-09-15'),saidaJoaquinRef=doc(db,'clientes_encerrados',previa.saidaAutoritativa.id),saidaAcougueRef=doc(db,'clientes_encerrados',previa.saidaAcougue.id),contatoZeissRef=doc(db,'contatos_clientes_financeiro','zeiss');
      const refsPag=[...previa.pVitalle,...previa.pMonique,...previa.pJoaquin,...previa.pAcougue].map(v=>doc(db,'pagamentos_mensais',v.id));
      const refsDup=previa.duplicadas.map(v=>doc(db,'clientes_encerrados',v.id));
      const refs=[vitalleRef,moniqueRef,joaquinRef,acougueRef,configMoniqueRef,saidaMoniqueRef,saidaJoaquinRef,saidaAcougueRef,contatoZeissRef,...refsPag,...refsDup];
      const opVitalle='fin_v103_vitalle_2026_09',opMonique='fin_v103_monique_saida_2026_09',opJoaquim='fin_v103_joaquin_dedupe_2026_09',opAcougue='fin_v103_acougue_saida_2026_09';
      const motivoVitalle='Novo valor mensal informado pelo Chris';
      const programacaoVitalleMudou=numero(previa.vitalle.valorProgramado)!==1000||texto(previa.vitalle.valorProgramadoEm)!=='2026-09'||texto(previa.vitalle.valorProgramadoMotivo)!==motivoVitalle;
      const preVitalle=await sha256Hex(assinaturaContratoAlvo(previa.vitalle)),postVitalle=await sha256Hex(JSON.stringify({id:previa.vitalle.id,valor:1000,inicio:'2026-09'}));
      const preMonique=await sha256Hex(assinaturaContratoAlvo(previa.monique)),postMonique=await sha256Hex(JSON.stringify({id:previa.monique.id,fim:'2026-08',saida:'2026-09-15'}));
      const preJoaquinContrato=await sha256Hex(assinaturaContratoAlvo(previa.joaquin));
      const preJ=await sha256Hex(JSON.stringify(previa.saidasJ.map(v=>v.id).sort())),postJ=await sha256Hex(JSON.stringify({canonico:previa.saidaAutoritativa?.id||'',arquivados:previa.duplicadas.map(v=>v.id).sort()}));
      const preAcougue=await sha256Hex(assinaturaContratoAlvo(previa.acougue)),postAcougue=await sha256Hex(JSON.stringify({id:previa.acougue.id,fim:'2026-08',saida:previa.saidaAcougue.id}));
      const eventos=[
        {op:opVitalle,clienteId:'vitalle-odonto',tipo:programacaoVitalleMudou?'alteracao_valor':'ajuste',comp:'2026-09',ultima:null,data:new Date('2026-09-01T12:00:00-03:00'),valor:programacaoVitalleMudou?1000:null,sourceType:'contrato',sourceId:previa.vitalle.id,pre:preVitalle,post:postVitalle},
        {op:opMonique,clienteId:'dra-monique',tipo:'saida',comp:'2026-09',ultima:'2026-08',data:new Date('2026-09-15T12:00:00-03:00'),valor:numero(previa.monique.valorVigente),sourceType:'cliente_encerrado',sourceId:saidaMoniqueRef.id,pre:preMonique,post:postMonique},
        {op:opJoaquim,clienteId:'joaquin-assados',tipo:'deduplicacao',comp:'2026-09',ultima:'2026-08',data:new Date('2026-09-15T12:00:00-03:00'),valor:null,sourceType:'migracao',sourceId:previa.saidaAutoritativa?.id||'joaquin-assados',pre:preJ,post:postJ},
        {op:opAcougue,clienteId:'acougue-sao-joaquim',tipo:'saida',comp:'2026-09',ultima:'2026-08',data:new Date('2026-09-15T12:00:00-03:00'),valor:numero(previa.acougue.valorVigente),sourceType:'cliente_encerrado',sourceId:previa.saidaAcougue.id,pre:preAcougue,post:postAcougue},
      ];
      const eventoRefs=eventos.map(v=>doc(db,'clientes_ciclo_financeiro',v.op));
      let jaAplicada=false;
      await runTransaction(db,async tx=>{
        const todos=[...refs,...eventoRefs];const snaps=await Promise.all(todos.map(r=>tx.get(r)));const mapa=new Map(todos.map((r,i)=>[r.path,snaps[i]]));
        const eventosExistentes=eventoRefs.filter(ref=>mapa.get(ref.path)?.exists());
        if(eventosExistentes.length){
          if(eventosExistentes.length!==eventoRefs.length) throw new Error('A correção anterior ficou parcial. Não repita; faça auditoria dos recibos.');
          const vitalleAtual=mapa.get(vitalleRef.path)?.data()||{},moniqueAtual=mapa.get(moniqueRef.path)?.data()||{},joaquinAtual=mapa.get(joaquinRef.path)?.data()||{},acougueAtual=mapa.get(acougueRef.path)?.data()||{};
          const contatoAtual=mapa.get(contatoZeissRef.path)?.data()||{};
          const contratosOk=numero(vitalleAtual.valorProgramado)===1000&&texto(vitalleAtual.valorProgramadoEm)==='2026-09'&&texto(moniqueAtual.ultimaCompetenciaPagamento)==='2026-08'&&texto(joaquinAtual.ultimaCompetenciaPagamento)==='2026-08'&&texto(acougueAtual.ultimaCompetenciaPagamento)==='2026-08';
          const saidasOk=mapa.get(saidaMoniqueRef.path)?.exists()&&mapa.get(saidaJoaquinRef.path)?.exists()&&mapa.get(saidaAcougueRef.path)?.exists();
          const pagamentosSaidaOk=[...previa.pMonique,...previa.pJoaquin,...previa.pAcougue].every(v=>{
            const s=mapa.get(doc(db,'pagamentos_mensais',v.id).path);return !s?.exists()||Core.statusMensalidade(s.data())==='cancelado';
          });
          const duplicatasOk=refsDup.every(ref=>mapa.get(ref.path)?.data()?.excluido===true);
          if(!contratosOk||!saidasOk||!pagamentosSaidaOk||!duplicatasOk||Core.normalizarTelefoneBR(contatoAtual.whatsapp)!==numeroZeiss) throw new Error('Os eventos existem, mas o estado final divergiu. Não repita; audite os recibos.');
          jaAplicada=true;
          return;
        }
        if(!mapa.get(vitalleRef.path)?.exists()||!mapa.get(moniqueRef.path)?.exists()||!mapa.get(joaquinRef.path)?.exists()||!mapa.get(acougueRef.path)?.exists())throw new Error('Contrato alterado ou removido desde a prévia.');
        const hashesAtuais=await Promise.all([
          sha256Hex(assinaturaContratoAlvo({id:vitalleRef.id,...mapa.get(vitalleRef.path).data()})),
          sha256Hex(assinaturaContratoAlvo({id:moniqueRef.id,...mapa.get(moniqueRef.path).data()})),
          sha256Hex(assinaturaContratoAlvo({id:joaquinRef.id,...mapa.get(joaquinRef.path).data()})),
          sha256Hex(assinaturaContratoAlvo({id:acougueRef.id,...mapa.get(acougueRef.path).data()})),
        ]);
        if(hashesAtuais[0]!==preVitalle||hashesAtuais[1]!==preMonique||hashesAtuais[2]!==preJoaquinContrato||hashesAtuais[3]!==preAcougue) throw new Error('Um contrato mudou depois da prévia. Atualize; nada foi gravado.');
        if(!mapa.get(configMoniqueRef.path)?.exists())throw new Error('A ficha operacional da Monique não existe; a correção não criará uma ficha parcial.');
        if(!mapa.get(saidaJoaquinRef.path)?.exists()||texto(mapa.get(saidaJoaquinRef.path).data().ultimaCompetenciaPagamento)!=='2026-08') throw new Error('A saída canônica do Joaquim mudou depois da prévia.');
        if(!mapa.get(saidaAcougueRef.path)?.exists()||texto(mapa.get(saidaAcougueRef.path).data().ultimaCompetenciaPagamento)!=='2026-08') throw new Error('A saída canônica do Açougue mudou depois da prévia.');
        const saidaMoniqueAtual=mapa.get(saidaMoniqueRef.path);
        if(saidaMoniqueAtual?.exists()&&(
          texto(saidaMoniqueAtual.data().ultimaCompetenciaPagamento)!=='2026-08' ||
          texto(saidaMoniqueAtual.data().dataSaida)!=='2026-09-15'
        )) throw new Error('Já existe uma saída divergente para a Monique. Revise antes de aplicar.');
        for(const [rotulo,lista] of [['Monique',previa.pMonique],['Joaquim',previa.pJoaquin],['Açougue',previa.pAcougue]]){
          for(const v of lista){const s=mapa.get(doc(db,'pagamentos_mensais',v.id).path);if(s?.exists()&&Core.statusMensalidade(s.data())==='pago')throw new Error(`Um pagamento de ${rotulo} foi confirmado depois da prévia.`);}
        }
        const carimbo=serverTimestamp();
        const vitalleAtual=mapa.get(vitalleRef.path).data()||{};
        tx.set(vitalleRef,{valorProgramado:1000,valorProgramadoEm:'2026-09',valorProgramadoMotivo:motivoVitalle,valorProgramadoPor:'Chris',valorProgramadoAtualizadoEm:carimbo,financeiroRevision:numero(vitalleAtual.financeiroRevision)+1,financeiroOperationId:opVitalle,historicoAlteracoesValor:arrayUnion({acao:'programada',novoValor:1000,inicio:'2026-09',motivo:motivoVitalle,por:'Chris',operationId:opVitalle})},{merge:true});
        previa.pVitalle.forEach(v=>{const ref=doc(db,'pagamentos_mensais',v.id),s=mapa.get(ref.path);if(s?.exists()&&!['pago','cancelado'].includes(Core.statusMensalidade(s.data()))){const atual=s.data(),precisa=numero(atual.valorDevido)!==1000||(Object.prototype.hasOwnProperty.call(atual,'valor')&&numero(atual.valor)!==1000)||(Object.prototype.hasOwnProperty.call(atual,'valorCobrado')&&numero(atual.valorCobrado)!==1000);if(precisa){const ajuste={valorDevido:1000,valorContratoProgramado:true,valorContratoProgramadoEm:'2026-09',financeiroOperationId:opVitalle,atualizadoPor:'Chris',atualizadoEm:carimbo};if(Object.prototype.hasOwnProperty.call(atual,'valor'))ajuste.valor=1000;if(Object.prototype.hasOwnProperty.call(atual,'valorCobrado'))ajuste.valorCobrado=1000;tx.set(ref,ajuste,{merge:true});}}});
        tx.set(moniqueRef,{saidaProgramadaPara:'2026-09-15',ultimaCompetenciaPagamento:'2026-08',vigencias:previa.vigenciasMonique,saidaMotivo:'encerramento informado pelo Chris',saidaMotivoDetalhe:'Cliente não integra a carteira financeira de setembro de 2026',status:'ativo',atualizadoPor:'Chris',atualizadoEm:carimbo},{merge:true});
        tx.set(configMoniqueRef,{saidaAtivaId:saidaMoniqueRef.id,saidaProgramadaPara:'2026-09-15',saidaMotivo:'encerramento informado pelo Chris',saidaMotivoDetalhe:'Cliente não integra a carteira financeira de setembro de 2026',clienteInativo:false,atualizadoPor:'Chris',atualizadoEm:carimbo},{merge:true});
        tx.set(saidaMoniqueRef,{nome:previa.monique.clienteNome||'Dra. Monique',slug:'dra-monique',dataAviso:hojeIso(deps),dataSaida:'2026-09-15',ultimaCompetenciaPagamento:'2026-08',statusSaida:'programada',tipoCliente:'mensalista',valorMensal:numero(previa.monique.valorVigente),motivo:'encerramento informado pelo Chris',motivoDetalhe:'Cliente não integra a carteira financeira de setembro de 2026',origemCentralEntrada:true,criadoPor:'Chris',criadoEm:carimbo,atualizadoPor:'Chris',atualizadoEm:carimbo,excluido:false},{merge:true});
        tx.set(joaquinRef,{ultimaCompetenciaPagamento:'2026-08',vigencias:previa.vigenciasJoaquin,atualizadoPor:'Chris',atualizadoEm:carimbo},{merge:true});
        tx.set(acougueRef,{ultimaCompetenciaPagamento:'2026-08',vigencias:previa.vigenciasAcougue,atualizadoPor:'Chris',atualizadoEm:carimbo},{merge:true});
        const cancelarFuturos=(lista,saidaId)=>lista.forEach(v=>{const ref=doc(db,'pagamentos_mensais',v.id),s=mapa.get(ref.path);if(s?.exists()&&!['pago','cancelado'].includes(Core.statusMensalidade(s.data())))tx.set(ref,{status:'cancelado',canceladoPorSaida:true,canceladoPorSaidaId:saidaId,statusAntesSaida:Core.statusMensalidade(s.data()),motivoCancelamento:'Competência posterior ao último mês do contrato (2026-08)',canceladoEm:carimbo,canceladoPor:'Chris',atualizadoEm:carimbo,atualizadoPor:'Chris'},{merge:true});});
        cancelarFuturos(previa.pMonique,saidaMoniqueRef.id);
        cancelarFuturos(previa.pJoaquin,saidaJoaquinRef.id);
        cancelarFuturos(previa.pAcougue,saidaAcougueRef.id);
        previa.duplicadas.forEach(v=>tx.set(doc(db,'clientes_encerrados',v.id),{excluido:true,statusSaida:'cancelada',motivoExclusao:'Registro duplicado consolidado pela V103',unificadoNoId:previa.saidaAutoritativa.id,unificadoEm:carimbo,unificadoPor:'Chris'},{merge:true}));
        tx.set(contatoZeissRef,{slug:'zeiss',whatsapp:numeroZeiss,nome:'Zeiss',origem:'edicao_financeiro',atualizadoPor:'Chris',atualizadoEm:carimbo},{merge:true});
        eventos.forEach((v,i)=>{const ref=eventoRefs[i],s=mapa.get(ref.path);if(s?.exists())return;tx.set(ref,{schemaVersion:1,operationId:v.op,clienteId:v.clienteId,tipo:v.tipo,competenciaInicio:v.comp,ultimaCompetencia:v.ultima,dataEfetiva:v.data,valor:v.valor,sourceType:v.sourceType,sourceId:v.sourceId,reversalOf:null,preHash:v.pre,postHash:v.post,criadoPor:uid,criadoEm:carimbo});});
      });
      const recibosContratos=await Promise.all([vitalleRef,moniqueRef,joaquinRef,acougueRef].map(getDoc));
      const recibosSaidas=await Promise.all([saidaMoniqueRef,saidaJoaquinRef,saidaAcougueRef].map(getDoc));
      const reciboContato=await getDoc(contatoZeissRef);
      const recibosPagamentos=await Promise.all(refsPag.map(getDoc));
      const recibosDuplicatas=await Promise.all(refsDup.map(getDoc));
      const recibosEventos=await Promise.all(eventoRefs.map(getDoc));
      const contratosOk=numero(recibosContratos[0].data()?.valorProgramado)===1000&&recibosContratos.slice(1).every(v=>texto(v.data()?.ultimaCompetenciaPagamento)==='2026-08');
      const saidasOk=recibosSaidas.every(v=>v.exists()&&texto(v.data()?.ultimaCompetenciaPagamento)==='2026-08');
      const pagamentosSaidaIds=new Set([...previa.pMonique,...previa.pJoaquin,...previa.pAcougue].map(v=>v.id));
      const pagamentosOk=recibosPagamentos.every(v=>{
        if(!v.exists()) return true;
        if(pagamentosSaidaIds.has(v.id)) return Core.statusMensalidade(v.data())==='cancelado';
        if(['pago','cancelado'].includes(Core.statusMensalidade(v.data()))) return true;
        return numero(v.data().valorDevido)===1000&&(!Object.prototype.hasOwnProperty.call(v.data(),'valor')||numero(v.data().valor)===1000)&&(!Object.prototype.hasOwnProperty.call(v.data(),'valorCobrado')||numero(v.data().valorCobrado)===1000);
      });
      if(!contratosOk||!saidasOk||!pagamentosOk||Core.normalizarTelefoneBR(reciboContato.data()?.whatsapp)!==numeroZeiss||recibosDuplicatas.some(v=>v.data()?.excluido!==true)||recibosEventos.some(v=>!v.exists()))throw new Error('A transação terminou, mas os recibos não confirmaram todos os alvos. Não repita; atualize.');
      invalidar();mostrarToast(jaAplicada?'Os ajustes já estavam confirmados; nenhuma escrita foi repetida.':'Ajustes confirmados com recibos.');await Promise.all([w.renderFinanceiro(),w.renderMensalidades(),w.renderCobranca(),w.renderContratos()]);await w.preverCorrecaoFinanceiraSetembroV103();return true;
    }catch(e){console.error(e);mostrarToast('Ajustes não confirmados: '+(e.message||e),'erro');return false;}
    finally{locks.delete('correcao-setembro');}
  };

  /* Desativa os caminhos antigos de renderização. As referências capturadas
     antes da instalação também retornam ao V103 em vez de executar writers. */
  w.renderMensalidadesV103=w.renderMensalidades;
  w.renderCobrancaV103=w.renderCobranca;
  w.renderFinanceiroV103=w.renderFinanceiro;
  w.renderContratosV103=w.renderContratos;
  w.__financeiroV103={carregarSnapshot,projetar,invalidar,core:Core,renderContratosAnterior};
  return w.__financeiroV103;
}
