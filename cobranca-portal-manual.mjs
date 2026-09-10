/* I38: a existência de uma mensalidade não autoriza cobrança no Portal.
   Este módulo não dá baixa, altera contrato ou envia mensagens. */
const texto=v=>String(v??'').trim();
const mesValido=v=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(texto(v));
const idValido=v=>/^[A-Za-z0-9_-]{1,200}$/.test(texto(v));
const serial=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const erro=(mensagem,codigo='gs/conferencia-cobranca')=>Object.assign(new Error(mensagem),{code:codigo});

export function retratoPagamentoI38(p){
  if(!p||!idValido(p.id)||!idValido(p.cliente)||!mesValido(p.competencia)) return null;
  if(['excluido','excluida','cancelado','cancelada','encerrado','encerrada','arquivado','arquivada','pago','isento','cortesiaPermanente','cortesiaDoMes'].some(k=>p[k])) return null;
  if(!['aberto','aberta','pendente'].includes(texto(p.status).toLowerCase())) return null;
  const valores=['valorCobrado','valorDevido','valor'].filter(k=>p[k]!==undefined&&p[k]!==null&&p[k]!=='').map(k=>Number(p[k]));
  if(!valores.length||valores.some(v=>!Number.isFinite(v)||v<=0)||new Set(valores).size!==1) return null;
  const dia=Number(p.diaVencimento);
  if(!Number.isInteger(dia)||dia<1||dia>31) return null;
  const [ano,mes]=p.competencia.split('-').map(Number),ultimo=new Date(Date.UTC(ano,mes,0)).getUTCDate();
  const vencimento=p.competencia+'-'+String(Math.min(dia,ultimo)).padStart(2,'0');
  return {pagamentoId:p.id,cliente:p.cliente,competencia:p.competencia,valor:valores[0],diaVencimento:dia,vencimento};
}

export function cobrancaLiberadaI38(p,cliente){
  const retrato=retratoPagamentoI38(p),c=p?.cobrancaPortalI38;
  if(!retrato||retrato.cliente!==cliente||!c||c.versao!==1||c.estado!=='liberada'||c.por!=='Chris'||!Number.isInteger(c.revisao)||c.revisao<1) return null;
  if(!idValido(c.operacao)||!Number.isFinite(Date.parse(c.em))||!mesValido(c.inicioOperacao)||!mesValido(c.quitadasAte)||retrato.competencia<c.inicioOperacao||retrato.competencia<=c.quitadasAte) return null;
  if(serial(c.retrato)!==serial(retrato)) return null;
  return {...retrato,conferidaEm:c.em,comprovanteEmAnalise:!!texto(p.comprovante)};
}

export function cobrancasVisiveisI38(pagamentos,cliente){
  const lista=Array.isArray(pagamentos)?pagamentos:[];
  return lista.filter(p=>lista.filter(q=>q.cliente===p.cliente&&q.competencia===p.competencia&&!q.excluido&&!q.excluida).length===1)
    .map(p=>({pagamento:p,cobranca:cobrancaLiberadaI38(p,cliente)})).filter(x=>x.cobranca)
    .sort((a,b)=>a.cobranca.competencia.localeCompare(b.cobranca.competencia)||a.pagamento.id.localeCompare(b.pagamento.id));
}

export async function lerFontesCobrancaI38({db,collection,doc,getDocsFromServer,getDocFromServer}){
  let timer;
  const leitura=Promise.all([getDocsFromServer(collection(db,'pagamentos_mensais')),getDocsFromServer(collection(db,'contratos_cliente')),getDocFromServer(doc(db,'config_financeiro','regua_cobranca'))]);
  const [p,c,r]=await Promise.race([leitura,new Promise((_,reject)=>{timer=setTimeout(()=>reject(erro('O servidor não confirmou a atualização. Tente novamente.')),12000);})]).finally(()=>clearTimeout(timer));
  if([p,c,r].some(s=>s.metadata?.fromCache||s.metadata?.hasPendingWrites)||!r.exists())throw erro('O servidor não confirmou as fontes da conferência.');
  const lista=s=>s.docs.map(d=>({...d.data(),id:d.id}));
  return {pagamentos_mensais:lista(p),contratos_cliente:lista(c),config_financeiro:[{...r.data(),id:'regua_cobranca'}]};
}

export function criarOperadorCobrancaI38(deps){
  const {db,doc,runTransaction,getDocFromServer,arrayUnion,auth,podeOperar,vigente,agora=()=>new Date().toISOString(),novaOperacao=()=>crypto.randomUUID()}=deps;
  const locks=new Set();
  const confirmarPapel=uid=>{if(!podeOperar()||!uid||auth.currentUser?.uid!==uid)throw erro('Sua sessão mudou. Reabra o Financeiro antes de conferir.');};
  function preparar(fontes,competencia){
    const pagamentos=fontes.pagamentos_mensais||[],contratos=fontes.contratos_cliente||[],regua=(fontes.config_financeiro||[]).find(x=>x.id==='regua_cobranca');
    if(!mesValido(competencia)||!regua||!mesValido(regua.inicioOperacao)||!mesValido(regua.competenciasQuitadasAte))throw erro('O período financeiro não foi confirmado. Nenhuma cobrança foi liberada.');
    return pagamentos.filter(p=>p.competencia===competencia).map(p=>{
      const retrato=retratoPagamentoI38(p),contrato=contratos.find(c=>c.id===p.cliente);
      const duplicada=pagamentos.filter(q=>q.cliente===p.cliente&&q.competencia===p.competencia&&!q.excluido&&!q.excluida).length!==1;
      const motivo=!retrato?'Esta mensalidade está encerrada ou precisa de conferência dos dados.':duplicada?'Existem registros concorrentes desta competência.':competencia<regua.inicioOperacao||competencia<=regua.competenciasQuitadasAte?'Período histórico encerrado; não oferecido para cobrança.':!contrato||!vigente(contrato,competencia)?'Contrato desta competência não confirmado.':'';
      const liberada=cobrancaLiberadaI38(p,p.cliente);
      return {pagamento:p,contrato,regua,retrato,motivo,liberada,operacao:'portal_'+novaOperacao().replace(/[^A-Za-z0-9_-]/g,'').slice(0,100),assinatura:serial(p.cobrancaPortalI38||null)};
    });
  }
  async function decidir(previa,acao,conferido,continuar=()=>true){
    const uid=auth.currentUser?.uid;
    const confirmarContexto=()=>{confirmarPapel(uid);if(!continuar())throw erro('A competência ou a tela mudou. Reabra a conferência.');};
    confirmarContexto();
    if(!['liberar','ocultar'].includes(acao)||!previa?.retrato||previa.motivo)throw erro('Esta mensalidade não está disponível para essa ação.');
    if(acao==='liberar'&&!conferido)throw erro('Confirme que verificou esta mensalidade antes de liberá-la.');
    const id=previa.pagamento.id;if(locks.has(id))throw erro('A conferência deste pagamento já está em andamento.');
    if(typeof getDocFromServer!=='function')throw erro('A confirmação do servidor está indisponível. Atualize o site.');
    locks.add(id);let comitou=false,marca;
    const ref=doc(db,'pagamentos_mensais',id);
    try{
      await runTransaction(db,async tx=>{
        confirmarContexto();
        const [sp,sc,sr]=await Promise.all([tx.get(ref),tx.get(doc(db,'contratos_cliente',previa.retrato.cliente)),tx.get(doc(db,'config_financeiro','regua_cobranca'))]);
        confirmarContexto();
        if(!sp.exists()||!sc.exists()||!sr.exists())throw erro('As fontes da conferência mudaram. Atualize antes de continuar.');
        const atual={...sp.data(),id},contrato={...sc.data(),id:previa.retrato.cliente},regua=sr.data();
        if(serial(retratoPagamentoI38(atual))!==serial(previa.retrato)||!vigente(contrato,previa.retrato.competencia)||!mesValido(regua.inicioOperacao)||!mesValido(regua.competenciasQuitadasAte)||previa.retrato.competencia<regua.inicioOperacao||previa.retrato.competencia<=regua.competenciasQuitadasAte)throw erro('Valor, vencimento, estado ou período mudou. Refaça a conferência.');
        if(atual.cobrancaPortalI38?.operacao===previa.operacao){if(atual.cobrancaPortalI38.estado!==(acao==='liberar'?'liberada':'oculta'))throw erro('A operação já confirmou outra decisão. Atualize a conferência.');marca=atual.cobrancaPortalI38;return;}
        if(serial(atual.cobrancaPortalI38||null)!==previa.assinatura)throw erro('Outra conferência já alterou este pagamento. Atualize antes de continuar.');
        if(acao==='liberar'&&texto(atual.comprovante))throw erro('Há um comprovante aguardando conferência. Confira o recebimento antes de liberar uma cobrança.');
        const revisao=Number(atual.cobrancaPortalI38?.revisao||0);
        if(!Number.isSafeInteger(revisao)||revisao<0)throw erro('O histórico de conferência precisa de revisão.');
        marca={versao:1,estado:acao==='liberar'?'liberada':'oculta',revisao:revisao+1,operacao:previa.operacao,por:'Chris',em:agora(),retrato:previa.retrato,inicioOperacao:regua.inicioOperacao,quitadasAte:regua.competenciasQuitadasAte};
        tx.update(ref,{cobrancaPortalI38:marca,historicoCobrancaPortalI38:arrayUnion(marca)});
      });
      comitou=true;confirmarPapel(uid);
      let timer;
      const sp=await Promise.race([getDocFromServer(ref),new Promise((_,reject)=>{timer=setTimeout(()=>reject(erro('O servidor ainda não confirmou a conferência.','gs/recibo-cobranca')),10000);})]).finally(()=>clearTimeout(timer));
      confirmarPapel(uid);
      if(!sp.exists()||sp.metadata?.fromCache===true||sp.metadata?.hasPendingWrites===true||serial(sp.data().cobrancaPortalI38)!==serial(marca)||serial(retratoPagamentoI38({...sp.data(),id}))!==serial(previa.retrato))throw erro('O recibo não corresponde à conferência. Atualize para verificar.','gs/recibo-cobranca');
      return {id,marca};
    }catch(e){if(comitou)e.confirmacaoPendente=true;throw e;}
    finally{locks.delete(id);}
  }
  return {preparar,decidir};
}

export function instalarConferenciaPortalI38(deps){
  const {document:dom=globalThis.document,canFinanceiro,carregarSnapshot,auth,invalidar,vigente}=deps;
  const operador=criarOperadorCobrancaI38({...deps,podeOperar:canFinanceiro,vigente});
  let geracao=0;
  const brl=v=>'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const dataBR=v=>v.split('-').reverse().join('/');
  function el(tag,txt,cls){const e=dom.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e;}
  function montar(box,fontes,competencia){
    const minhaGeracao=++geracao,uid=auth.currentUser?.uid;
    if(!canFinanceiro()||!uid)return;
    dom.getElementById('cobrancasPortalI38')?.remove();
    const painel=el('section',undefined,'card');painel.id='cobrancasPortalI38';painel.style.border='2px solid var(--yellow)';
    painel.append(el('h2','Cobranças no Portal'),el('p','Confira uma mensalidade e libere somente se ela ainda precisar ser paga. Abrir esta tela não envia cobrança.','desc'));
    const status=el('div','Competência '+competencia,'meta');status.setAttribute('role','status');painel.append(status);
    const atual=()=>canFinanceiro()&&auth.currentUser?.uid===uid&&geracao===minhaGeracao&&dom.getElementById('finMes')?.value===competencia&&painel.isConnected;
    const atualizar=el('button','Atualizar conferência','btn secondary');atualizar.type='button';atualizar.style.width='auto';
    atualizar.addEventListener('click',async()=>{if(!atual())return;atualizar.disabled=true;status.textContent='Conferindo os registros…';try{invalidar();const fontesNovas=await carregarSnapshot({forcar:true});if(atual())montar(box,fontesNovas,competencia);}catch(e){if(atual())status.textContent='Não foi possível atualizar. A situação anterior não confirma o banco agora.';}finally{atualizar.disabled=false;}});
    painel.append(atualizar);box.prepend(painel);
    let previas;try{previas=operador.preparar(fontes,competencia);}catch(e){status.textContent=e.message;return;}
    const linhas=previas.filter(p=>p.retrato&&!p.motivo);
    if(!linhas.length){painel.append(el('p','Nenhuma mensalidade desta competência está disponível para liberar no Portal. Pagamentos, cortesias e períodos encerrados permanecem preservados.','desc'));return;}
    const detalhes=el('details');detalhes.open=true;detalhes.append(el('summary',linhas.length+' mensalidade(s) para conferir'));
    for(const previa of linhas){
      const row=el('div',undefined,'item'),nome=previa.pagamento.clienteNome||previa.contrato.clienteNome||previa.retrato.cliente;
      row.dataset.pagamentoId=previa.pagamento.id;row.append(el('div',nome,'nome'),el('div',competencia+' · '+brl(previa.retrato.valor)+' · vencimento '+dataBR(previa.retrato.vencimento),'meta'));
      const situacao=el('p',previa.liberada?'Cobrança liberada no Portal.':'Cobrança não exibida ao cliente.','meta');situacao.setAttribute('role','status');row.append(situacao);
      const check=el('input');check.type='checkbox';const label=el('label');label.style.cssText='display:flex;gap:8px;align-items:center;margin:10px 0;';label.append(check,dom.createTextNode('Conferi o valor e o vencimento; esta mensalidade ainda precisa ser paga.'));
      if(!previa.liberada)row.append(label);
      const botao=el('button',previa.liberada?'Retirar cobrança do Portal':'Liberar cobrança no Portal','btn');botao.type='button';botao.style.width='auto';botao.disabled=!previa.liberada;
      check.addEventListener('change',()=>{botao.disabled=!check.checked;});
      botao.addEventListener('click',async()=>{
        if(!atual()||botao.disabled)return;botao.disabled=true;check.disabled=true;const acao=previa.liberada?'ocultar':'liberar';situacao.textContent='Confirmando no servidor…';
        try{const recibo=await operador.decidir(previa,acao,check.checked,atual);if(!atual())return;invalidar();previa.assinatura=serial(recibo.marca);previa.pagamento={...previa.pagamento,cobrancaPortalI38:recibo.marca};previa.liberada=acao==='liberar'?cobrancaLiberadaI38(previa.pagamento,previa.retrato.cliente):null;situacao.textContent=acao==='liberar'?'Cobrança liberada e confirmada no Portal.':'Cobrança retirada. O registro financeiro foi preservado.';botao.hidden=true;label.remove();atualizar.focus();}
        catch(e){if(atual()){situacao.textContent=e.confirmacaoPendente?'A gravação pode ter sido concluída. Use Atualizar conferência para confirmar antes de repetir.':e.message;botao.disabled=!!e.confirmacaoPendente;check.disabled=!!e.confirmacaoPendente;}}
      });
      row.append(botao);detalhes.append(row);
    }
    painel.append(detalhes);
  }
  return {montar,operador};
}
