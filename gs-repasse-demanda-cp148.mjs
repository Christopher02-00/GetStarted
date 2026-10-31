/* CP148: repasse da mesma demanda normal. IO público adaptado; sem avisos ou novas demandas. */
const CAMPOS_CONTEXTO=Object.freeze(['uid','nome','atorReal','sessao','geracao','anonimo']);
const GESTORES=Object.freeze(['Chris','Amanda']);
const ID=/^[A-Za-z0-9_-]{1,180}$/;
const OP=/^[A-Za-z0-9_-]{8,180}$/;
const falha=(tipo,mensagem,extra={})=>Object.assign(new Error(mensagem),{code:'gs/repasse-'+tipo,...extra});
const ehObjeto=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function assinaturaEstavel(valor,pilha=new Set()){
 if(valor===null)return 'N';
 if(typeof valor==='string')return 'S'+JSON.stringify(valor);
 if(typeof valor==='boolean')return valor?'B1':'B0';
 if(typeof valor==='number'&&Number.isFinite(valor))return 'D'+(Object.is(valor,-0)?'-0':String(valor));
 if(!valor||typeof valor!=='object')throw falha('dados','A demanda contém um valor que precisa ser conferido.');
 if(pilha.has(valor))throw falha('dados','A demanda contém uma referência circular.');pilha.add(valor);
 try{
  if(Array.isArray(valor))return 'A['+valor.map(x=>assinaturaEstavel(x,pilha)).join(',')+']';
  const proto=Object.getPrototypeOf(valor);
  if(![Object.prototype,null].includes(proto)){
   if(typeof valor.toJSON!=='function')throw falha('dados','Um campo da demanda não pôde ser comparado com segurança.');
   // A tag fica fora da gramática de mapas; Timestamp não equivale a um mapa com os mesmos números.
   return 'T'+JSON.stringify(proto?.constructor?.name||'SDK')+':'+assinaturaEstavel(valor.toJSON(),pilha);
  }
  return 'M{'+Object.keys(valor).sort().map(k=>JSON.stringify(k)+':'+assinaturaEstavel(valor[k],pilha)).join(',')+'}';
 }finally{pilha.delete(valor);}
}
function copiar(v,pilha=new Set()){
 if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;
 if(!v||typeof v!=='object'||pilha.has(v))throw falha('dados','Não consegui preservar todos os campos desta demanda.');
 const proto=Object.getPrototypeOf(v);
 if(!Array.isArray(v)&&![Object.prototype,null].includes(proto)){
  assinaturaEstavel(v);return v; // Valores públicos SDK são imutáveis por contrato; não converter seu tipo.
 }
 pilha.add(v);try{
  if(Array.isArray(v))return v.map(x=>copiar(x,pilha));
  const r={};for(const k of Object.keys(v))Object.defineProperty(r,k,{value:copiar(v[k],pilha),enumerable:true,writable:true,configurable:true});return r;
 }finally{pilha.delete(v);}
}
function congelar(v){if(v&&typeof v==='object'&&(Array.isArray(v)||[Object.prototype,null].includes(Object.getPrototypeOf(v)))){for(const x of Object.values(v))congelar(x);Object.freeze(v);}return v;}
function abrirSnapshot(s,id,bruto=false){
 if(!s||typeof s.exists!=='function'||typeof s.data!=='function'||s.id&&s.id!==id)throw falha('leitura','A consulta não confirmou a mesma demanda.');
 if(!s.exists())return null;
 const d=s.data();if(!ehObjeto(d))throw falha('dados','A demanda não possui um corpo válido.');return bruto?d:copiar(d);
}
/**
 * ler(id): DocumentSnapshot público. transacionar(f): f recebe {get(id),update(id,patch)}.
 * contexto(): {uid,nome,atorReal,sessao,geracao,anonimo:false}. esperado: corpo completo sem id sintético.
 */
export function criarRepasseDemandaCp148({ler,transacionar,contexto,destinatarios,agora=()=>new Date(),idOperacao=()=> 'rep148_'+globalThis.crypto.randomUUID().replaceAll('-','')}={}){
 if([ler,transacionar,contexto,agora,idOperacao].some(f=>typeof f!=='function')||!Array.isArray(destinatarios)&&typeof destinatarios!=='function')throw falha('configuracao','O caminho do repasse não foi confirmado.');
 const tentativas=new WeakMap(),operacoes=new Set();
 const pessoas=()=>{const p=typeof destinatarios==='function'?destinatarios():destinatarios;if(!Array.isArray(p)||p.some(x=>typeof x!=='string'||!x))throw falha('configuracao','A lista de pessoas precisa ser conferida.');return p;};
 function capturarContexto(){const c=contexto();if(!ehObjeto(c)||typeof c.uid!=='string'||!c.uid.trim()||typeof c.sessao!=='string'||!c.sessao||!Number.isSafeInteger(c.geracao)||c.geracao<0||c.anonimo!==false||!GESTORES.includes(c.nome)||!GESTORES.includes(c.atorReal))throw falha('permissao','Chris ou Amanda, com o Google confirmado, fazem este repasse.');return Object.fromEntries(CAMPOS_CONTEXTO.map(k=>[k,c[k]]));}
 function exigirContexto(t){const c=capturarContexto();if(CAMPOS_CONTEXTO.some(k=>c[k]!==t.contexto[k]))throw falha('contexto','O perfil mudou. A tentativa continua vinculada ao acesso original.');}
 function registro(t){const r=tentativas.get(t);if(!r)throw falha('tentativa','Retome a mesma tentativa de repasse.');return r;}
 function exigirNormal(d,id){
  if(!ehObjeto(d)||!ID.test(id)||id.startsWith('prov140_')||id.startsWith('entrada_i54_')||d.tipoEspecial||d.tipoFuncaoFixa||d.tipoPedidoCliente==='ajuste_calendario'||d.ehDecisao===true)throw falha('tipo','Este pedido deve continuar pelo seu fluxo específico.');
  if(d.excluido===true||d.arquivado===true||!['pendente','concluida_aguardando_aprovacao'].includes(d.status))throw falha('estado','A demanda mudou de situação. Abra a versão atual.');
  if(typeof d.destinatario!=='string'||!pessoas().includes(d.destinatario)||typeof d.titulo!=='string'||typeof d.descricao!=='string'||d.historico!==undefined&&!Array.isArray(d.historico))throw falha('dados','Confira a pessoa, os textos e o histórico da demanda.');
 }
 function criarTentativa({id,alvo,motivo,esperado,quem}={}){
  const c=capturarContexto();if(quem!==c.nome)throw falha('permissao','O autor do repasse precisa ser o perfil que está operando.');
  const base=copiar(esperado);exigirNormal(base,id);
  if(typeof alvo!=='string'||!pessoas().includes(alvo)||alvo==='Fernanda'||alvo===base.destinatario)throw falha('destino','Escolha outra pessoa da lista.');
  if(typeof motivo!=='string'||!motivo.trim()||motivo.trim().length>4000)throw falha('motivo','Explique o motivo do repasse em até4000caracteres.');
  const op=idOperacao(),data=agora();if(typeof op!=='string'||!OP.test(op)||operacoes.has(op))throw falha('tentativa','O identificador desta tentativa precisa ser único.');
  if(!(data instanceof Date)||!Number.isFinite(data.getTime()))throw falha('relogio','Não consegui confirmar o horário deste repasse.');
  const em=data.toISOString(),texto=motivo.trim(),evento={acao:'Repassada de '+base.destinatario+' pra '+alvo+' por '+c.atorReal,por:c.atorReal,em,detalhe:texto,operacaoIdCp148:op};
  if((base.historico||[]).some(x=>x?.operacaoIdCp148===op))throw falha('tentativa','Esta operação já consta do histórico.');
  const patch={destinatario:alvo,redirecionamentoPedido:null,redirecionadaDe:base.destinatario,redirecionadaPor:c.atorReal,redirecionadaEm:em,motivoRedirecionamento:texto,historico:[...(base.historico||[]),evento]};
  const t=congelar({schema:1,id,alvo,motivo:texto,quem,contexto:c,esperado:base,operacaoIdCp148:op,em});
  tentativas.set(t,{base:assinaturaEstavel(base),depois:assinaturaEstavel({...base,...patch}),patch:congelar(patch),evento:congelar(copiar(evento)),eventoAssinatura:assinaturaEstavel(evento),emCurso:false,estado:'nova'});operacoes.add(op);return t;
 }
 function avaliar(t,r,d){
  if(!d)return {confirmado:false,reconfirmacaoPermitida:false,conflito:true,documento:null,motivo:'A demanda não está mais disponível.'};
  const eventos=Array.isArray(d.historico)?d.historico.filter(x=>x?.operacaoIdCp148===t.operacaoIdCp148):[];
  if(eventos.length===1&&assinaturaEstavel(eventos[0])===r.eventoAssinatura&&assinaturaEstavel(d)===r.depois)return {confirmado:true,reconfirmacaoPermitida:false,conflito:false,documento:d};
  const inalterada=eventos.length===0&&assinaturaEstavel(d)===r.base;
  return {confirmado:false,reconfirmacaoPermitida:inalterada,conflito:!inalterada,documento:d,motivo:inalterada?'O servidor mantém a versão anterior. Uma nova confirmação explícita pode retomar a mesma tentativa.':'A demanda ou o repasse mudou. Abra a versão atual; nada foi sobrescrito.'};
 }
 async function reler(t,r){exigirContexto(t);const s=await ler(t.id);exigirContexto(t);return avaliar(t,r,abrirSnapshot(s,t.id));}
 function resultado(t,a,{novo=false,repetido=false,recuperado=false}={}){return {...a,novo,repetido,recuperado,id:t.id,operacaoIdCp148:t.operacaoIdCp148,em:t.em,contextoVigente:true};}
 async function conferir(t){
  const r=registro(t);if(r.emCurso)throw falha('ocupado','Espere a conferência desta mesma tentativa.');r.emCurso=true;
  try{const a=await reler(t,r);exigirContexto(t);r.estado=a.confirmado?'confirmada':a.reconfirmacaoPermitida?'nao_aplicada':'conflito';return resultado(t,a,{recuperado:a.confirmado});}
  catch(e){r.estado='incerta';throw falha('incerto','Não consegui confirmar o repasse no servidor. Preserve esta tentativa e use Conferir envio.',{resultadoIncerto:true,operacaoIdCp148:t.operacaoIdCp148,cause:e});}
  finally{r.emCurso=false;}
 }
 async function aplicar(t,{conferirTela}={}){
  const r=registro(t);if(r.emCurso)throw falha('ocupado','Espere a confirmação desta mesma tentativa.');
  if(r.estado==='incerta')throw falha('incerto','Confira primeiro o envio desta mesma tentativa, sem reenviar.',{resultadoIncerto:true,operacaoIdCp148:t.operacaoIdCp148});
  if(r.estado==='conflito')throw falha('conflito','A demanda mudou. Preserve o motivo e abra a versão atual.');
  if(conferirTela!==undefined&&typeof conferirTela!=='function')throw falha('configuracao','A conferência da tela não foi reconhecida.');
  exigirContexto(t);r.emCurso=true;
  try{
   if(r.estado==='confirmada'){const a=await reler(t,r);exigirContexto(t);if(!a.confirmado){r.estado='conflito';throw falha('conflito',a.motivo);}return resultado(t,a,{repetido:true});}
   let txResultado;
   try{
    txResultado=await transacionar(async tx=>{
     exigirContexto(t);if(!tx||typeof tx.get!=='function'||typeof tx.update!=='function')throw falha('configuracao','A transação da demanda não foi confirmada.');
     const s=await tx.get(t.id);exigirContexto(t);const bruto=abrirSnapshot(s,t.id,true),d=bruto?copiar(bruto):null,a=avaliar(t,r,d);
     if(a.confirmado)return {escreveu:false};
     if(!a.reconfirmacaoPermitida)throw falha('conflito',a.motivo);
     exigirNormal(d,t.id);if(!pessoas().includes(t.alvo)||t.alvo==='Fernanda')throw falha('destino','O destino não está mais disponível.');
     if(conferirTela&&conferirTela()===false)throw falha('tela','A ficha mudou. Reabra esta mesma demanda antes de confirmar.');
     exigirContexto(t);const patch={...r.patch,historico:[...(bruto.historico||[]),copiar(r.evento)]};tx.update(t.id,patch);return {escreveu:true};
    });
    exigirContexto(t);
   }catch(e){
    let a;try{a=await reler(t,r);exigirContexto(t);}catch(leitura){r.estado='incerta';throw falha('incerto','Não consegui confirmar o repasse no servidor. Preserve esta tentativa e use Conferir envio.',{resultadoIncerto:true,operacaoIdCp148:t.operacaoIdCp148,cause:e,leitura});}
    if(a.confirmado){r.estado='confirmada';return resultado(t,a,{recuperado:true});}
    r.estado=a.reconfirmacaoPermitida?'nao_aplicada':'conflito';
    if(a.conflito)throw falha('conflito',a.motivo,{operacaoIdCp148:t.operacaoIdCp148,documento:a.documento,cause:e});
    throw falha('nao-confirmado',e.message||a.motivo,{resultadoIncerto:false,naoAplicado:true,reconfirmacaoPermitida:true,operacaoIdCp148:t.operacaoIdCp148,cause:e});
   }
   let a;try{a=await reler(t,r);exigirContexto(t);}catch(e){r.estado='incerta';throw falha('incerto','O pedido pode ter sido confirmado. Use Conferir envio nesta mesma tentativa antes de continuar.',{resultadoIncerto:true,operacaoIdCp148:t.operacaoIdCp148,cause:e});}
   if(!a.confirmado){r.estado=a.reconfirmacaoPermitida?'nao_aplicada':'conflito';throw falha(a.conflito?'conflito':'nao-confirmado',a.motivo,{resultadoIncerto:false,reconfirmacaoPermitida:a.reconfirmacaoPermitida,operacaoIdCp148:t.operacaoIdCp148,documento:a.documento});}
   r.estado='confirmada';return resultado(t,a,{novo:txResultado?.escreveu===true,repetido:txResultado?.escreveu===false});
  }finally{r.emCurso=false;}
 }
 return Object.freeze({criarTentativa,aplicar,conferir});
}
