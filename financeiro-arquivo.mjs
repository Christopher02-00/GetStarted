/* I9: acompanhamento privado. Não filtra o ledger e não escreve dinheiro,
   contratos, configuração operacional ou credenciais. IDs são físicos. */
const PREFIXO='arquivo_cliente_';
const CAMPOS_CONFIG=['ativo','excluido','clienteInativo','tipoCliente','dataSaida','saidaProgramadaPara',
  'saidaAtivaId','inativoDesde','arquivadoEm','reativadoEm','atualizadoEm'];
const CAMPOS_CONTRATO=['status','dataSaida','saidaProgramadaPara','criadoEm','reativadoEm','reativacaoCompetencia'];
const texto=v=>typeof v==='string'?v.trim():'';
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function valorFonte(v){
  if(v===undefined)return null;
  if(v&&typeof v==='object'&&Number.isInteger(v.seconds))return [v.seconds,v.nanoseconds||0];
  if(v instanceof Date)return v.toISOString();
  if(v===null||['string','boolean','number'].includes(typeof v))return v;
  throw new Error('Campo de situação com formato inesperado. Confira o cadastro.');
}
function dataCivil(v){
  if(!v)return '';
  const s=typeof v==='string'?v.slice(0,10):typeof v.toDate==='function'?v.toDate().toISOString().slice(0,10):'';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)
    throw new Error('Data de saída inválida. Confira o cadastro antes de organizar.');
  return s;
}
export function idPreferenciaFinanceira(id){
  if(typeof id!=='string'||!id||id.includes('/')||id==='.'||id==='..'||encodeURIComponent(id).length>1000)
    throw new Error('Identificador físico inválido.');
  return PREFIXO+encodeURIComponent(id);
}
export function classificarAcompanhamento({id,config=null,contrato=null,preferencia=null,hoje,aliasHistorico=false}){
  idPreferenciaFinanceira(id);
  if(!config&&!contrato)throw new Error('Cadastro não encontrado. Atualize a lista.');
  const saidaConfig=dataCivil(config?.dataSaida||config?.saidaProgramadaPara);
  const saidaContrato=dataCivil(contrato?.dataSaida||contrato?.saidaProgramadaPara);
  const configEncerrada=!!config&&(config.clienteInativo===true||config.ativo===false||config.excluido===true||
    config.tipoCliente==='encerrado'||!!saidaConfig&&saidaConfig<=hoje);
  const configAtiva=!!config&&(config.ativo===true||config.clienteInativo===false);
  const configConclusiva=configEncerrada||configAtiva;
  const saida=configConclusiva?saidaConfig:(saidaConfig||saidaContrato),efetiva=!!saida&&saida<=hoje;
  const automatico=aliasHistorico||configEncerrada||!configAtiva&&!!contrato&&
    (contrato.status==='encerrado'||!!saidaContrato&&saidaContrato<=hoje);
  // Avulsos antigos não têm cicloId. A versão da configuração invalida a
  // preferência conservadoramente; não fingimos reconhecer um novo projeto.
  const assinatura=JSON.stringify({config:config?CAMPOS_CONFIG.map(k=>valorFonte(config[k])):null,
    contrato:contrato?CAMPOS_CONTRATO.map(k=>valorFonte(contrato[k])):null,
    ciclos:(contrato?.vigencias||[]).map(v=>texto(v.cicloId)),efetiva,automatico,aliasHistorico});
  if(preferencia&&(preferencia.schemaVersion!==1||preferencia.tipo!=='acompanhamento_cliente'||preferencia.clienteId!==id||
    typeof preferencia.encerrado!=='boolean'||!Number.isSafeInteger(preferencia.revisao)||preferencia.revisao<1||typeof preferencia.assinatura!=='string'))
    throw new Error('Preferência financeira inconsistente. Nenhum estado foi presumido.');
  const manual=!!preferencia&&preferencia.assinatura===assinatura;
  return {id,nome:texto(config?.nome)||texto(contrato?.clienteNome)||texto(contrato?.nome)||id,
    encerrado:manual?preferencia.encerrado:automatico,automatico,manual,assinatura,
    revisao:preferencia?.revisao||0,reconferir:!!preferencia&&!manual,aliasHistorico,
    origem:configConclusiva||!contrato?'clientes_config':'contratos_cliente',saida,saidaFutura:!!saida&&!efetiva};
}
export function criarServicoArquivoFinanceiro(deps){
  const {db,doc,collection,getDocsFromServer,getDocFromServer,runTransaction,serverTimestamp,identidade,hoje,
    aliasHistorico=()=>false}=deps;
  const capturar=()=>{
    const s=identidade();
    if(s.pessoa!=='Chris'||s.real!=='Chris'||!s.uid||s.delegada)throw new Error('Use o próprio perfil autenticado do Chris.');
    return JSON.stringify(s);
  };
  const conferir=s=>{if(capturar()!==s)throw new Error('A identidade mudou. Abra novamente no próprio perfil do Chris.');};
  const montar=(id,c,t,p)=>classificarAcompanhamento({id,config:c,contrato:t,preferencia:p,hoje:hoje(),aliasHistorico:aliasHistorico(id)});
  const dados=s=>s.exists()?s.data():null;
  async function carregar(){
    const sessao=capturar();
    const nomes=['clientes_config','contratos_cliente','config_financeiro'];
    const snapshots=await Promise.all(nomes.map(n=>getDocsFromServer(collection(db,n))));conferir(sessao);
    const [configs,contratos,prefs]=snapshots.map(s=>new Map(s.docs.map(d=>[d.id,d.data()])));
    const ids=[...new Set([...configs.keys(),...contratos.keys()])];
    return {sessao,clientes:ids.map(id=>montar(id,configs.get(id),contratos.get(id),prefs.get(idPreferenciaFinanceira(id))))
      .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')||a.id.localeCompare(b.id))};
  }
  async function alterar(visto,encerrado,sessao,continua=()=>true){
    if(typeof encerrado!=='boolean')throw new Error('Situação financeira inválida.');
    const vigente=()=>{conferir(sessao);if(!continua())throw new Error('Esta operação perdeu a validade. Atualize a lista.');};
    vigente();
    const id=visto.id,ref=doc(db,'config_financeiro',idPreferenciaFinanceira(id));
    const esperado=await runTransaction(db,async tx=>{
      vigente();
      const [c,t,p]=await Promise.all([tx.get(doc(db,'clientes_config',id)),tx.get(doc(db,'contratos_cliente',id)),tx.get(ref)]);
      vigente();const atual=montar(id,dados(c),dados(t),dados(p));
      if(atual.assinatura!==visto.assinatura)throw new Error('O cadastro mudou. Atualize a lista antes de confirmar.');
      if(atual.manual&&atual.encerrado===encerrado)return {revisao:atual.revisao,assinatura:atual.assinatura};
      if(atual.revisao!==visto.revisao)throw new Error('Outra aba mudou o acompanhamento. Atualize a lista.');
      const revisao=atual.revisao+1;
      tx.set(ref,{schemaVersion:1,tipo:'acompanhamento_cliente',clienteId:id,encerrado,revisao,
        assinatura:atual.assinatura,atualizadoPor:'Chris',atualizadoUid:JSON.parse(sessao).uid,atualizadoEm:serverTimestamp()});
      return {revisao,assinatura:atual.assinatura};
    });
    vigente();
    let recibo;
    try{recibo=dados(await getDocFromServer(ref));}catch(_){throw new Error('A gravação pode ter sido concluída, mas o recibo não respondeu. Atualize a lista antes de repetir.');}
    vigente();
    if(!recibo||recibo.clienteId!==id||recibo.revisao!==esperado.revisao||recibo.assinatura!==esperado.assinatura||recibo.encerrado!==encerrado)
      throw new Error('A situação mudou depois da gravação. Atualize a lista para conferir o estado atual.');
    return {ok:true,id,encerrado,revisao:recibo.revisao};
  }
  return {carregar,alterar,conferir};
}
export function instalarArquivoFinanceiro(deps){
  const {box}=deps,servico=criarServicoArquivoFinanceiro(deps);
  let retrato=null,aba='abertos',geracao=0,ocupado=false,salvando=false,mensagem='';
  const limpar=()=>{geracao++;retrato=null;ocupado=false;salvando=false;mensagem='';box.replaceChildren();};
  const falha=erro=>{retrato=null;ocupado=false;box.innerHTML=`<div role="alert"><b>Acompanhamento indisponível.</b><p>${html(erro.message||'Não foi possível confirmar os dados.')}</p><p>Isso não altera valores nem significa que a lista está vazia.</p><button type="button" class="btn secondary" data-arquivo-acao="atualizar">Atualizar lista</button></div>`;};
  function pintar(){
    servico.conferir(retrato.sessao);
    const fechados=retrato.clientes.filter(c=>c.encerrado),abertos=retrato.clientes.filter(c=>!c.encerrado);
    const lista=aba==='encerrados'?fechados:abertos;
    box.innerHTML=`<p class="desc">Este controle organiza o acompanhamento. Não quita valores, não muda o caixa e não reativa o cliente na operação. O histórico e os alertas financeiros continuam preservados.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap" aria-label="Situação do acompanhamento">
        <button type="button" class="btn ${aba==='abertos'?'':'secondary'}" aria-pressed="${aba==='abertos'}" data-arquivo-aba="abertos" ${ocupado?'disabled':''}>Em acompanhamento (${abertos.length})</button>
        <button type="button" class="btn ${aba==='encerrados'?'':'secondary'}" aria-pressed="${aba==='encerrados'}" data-arquivo-aba="encerrados" ${ocupado?'disabled':''}>Encerrados (${fechados.length})</button>
        <button type="button" class="btn secondary" data-arquivo-acao="atualizar" ${ocupado?'disabled':''}>Atualizar lista</button>
      </div><p role="status">${html(mensagem)}</p><div data-arquivo-lista>
      ${lista.length?lista.map(c=>`<div class="item" data-arquivo-cliente="${html(c.id)}"><b>${html(c.nome)}</b>
        <div class="meta" style="overflow-wrap:anywhere">Cadastro: ${html(c.id)} · ${html(c.origem)} · ${c.manual?'Sua escolha':'Situação do cadastro'}${c.aliasHistorico?' · Identidade histórica':''}</div>
        ${c.reconferir?'<p>Cadastro atualizado desde sua escolha anterior. Confira o acompanhamento novamente.</p>':''}
        ${c.saidaFutura?`<p>Saída programada para ${html(c.saida)}; ainda não efetiva.</p>`:''}
        <button type="button" class="btn secondary" data-arquivo-id="${html(c.id)}" ${ocupado?'disabled':''}>${c.encerrado?'Reabrir acompanhamento':'Encerrar acompanhamento'}</button></div>`).join(''):'<p>Nenhum cliente nesta situação.</p>'}</div>`;
  }
  async function limitar(promise,expirar=()=>{}){
    let timer;
    try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{
      expirar();
      reject(new Error('A confirmação demorou além do esperado. Se você tentou salvar, confira a lista antes de repetir.'));
    },18000);})]);}finally{clearTimeout(timer);}
  }
  async function abrir(){
    if(salvando)return false;
    const token=++geracao;ocupado=true;retrato=null;
    box.innerHTML='<p role="status">Consultando a situação atual dos clientes…</p>';
    try{
      const valor=await limitar(servico.carregar());
      if(token!==geracao)return false;
      servico.conferir(valor.sessao);retrato=valor;ocupado=false;pintar();return true;
    }catch(e){
      // Limpeza de identidade nunca é revertida por resposta tardia.
      if(token!==geracao)return false;
      try{const s=deps.identidade();if(s.pessoa!=='Chris'||s.real!=='Chris'||s.delegada){limpar();return false;}}catch(_){limpar();return false;}
      falha(e);return false;
    }
  }
  async function clicar(event){
    const alvo=event.target.closest('button');if(!alvo||!box.contains(alvo)||ocupado)return;
    if(alvo.dataset.arquivoAcao==='atualizar'){mensagem='';await abrir();return;}
    if(!retrato)return;
    try{servico.conferir(retrato.sessao);}catch(_){limpar();return;}
    if(alvo.dataset.arquivoAba){aba=alvo.dataset.arquivoAba;pintar();return;}
    const visto=retrato.clientes.find(c=>c.id===alvo.dataset.arquivoId);if(!visto)return;
    const token=++geracao,sessao=retrato.sessao;let valida=true;ocupado=true;salvando=true;mensagem='Salvando e conferindo…';pintar();
    try{
      await limitar(servico.alterar(visto,!visto.encerrado,sessao,()=>valida&&token===geracao),()=>{valida=false;});
      if(token!==geracao)return;
      const atualizado=await limitar(servico.carregar());
      if(token!==geracao)return;
      servico.conferir(sessao);retrato=atualizado;
      const atual=retrato.clientes.find(c=>c.id===visto.id);
      const confirmado=atual?.assinatura===visto.assinatura&&atual?.manual&&atual.encerrado===!visto.encerrado;
      mensagem=confirmado?(visto.encerrado?'Acompanhamento reaberto. A operação do cliente não foi reativada.':'Acompanhamento encerrado. Cliente disponível na aba Encerrados.'):
        'O cadastro ou acompanhamento mudou durante a confirmação. Confira a situação atual abaixo.';
      ocupado=false;pintar();
    }catch(e){
      try{servico.conferir(sessao);}catch(_){limpar();return;}
      if(token===geracao)falha(e);
    }finally{if(token===geracao)salvando=false;}
  }
  box.addEventListener('click',clicar);
  return {abrir,limpar};
}
