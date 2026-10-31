/* CP149: lê a espera e encerra somente seu aviso, após atendimento comprovado na origem. */
const GESTORES=Object.freeze(['Chris','Amanda']);
const CTX=Object.freeze(['uid','nome','atorReal','sessao','geracao','anonimo']);
const ID=/^[A-Za-z0-9_-]{1,180}$/;
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const proprio=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const erro=(tipo,m,extra={})=>Object.assign(new Error(m),{code:'gs/espera-cp149-'+tipo,...extra});
const texto=v=>typeof v==='string'?v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' '):'';
function normal(d){return obj(d)&&!d.tipoEspecial&&!d.tipoFuncaoFixa&&!d.tipoPedidoCliente&&d.ehDecisao!==true&&d.ehAviso!==true&&!(typeof d.id==='string'&&(/^(prov140_|entrada_i54_)/.test(d.id)));}
function ms(v){
 if(v instanceof Date)return Number.isFinite(v.getTime())?v.getTime():null;
 if(v&&typeof v.toMillis==='function'){const n=v.toMillis();return typeof n==='number'&&Number.isFinite(n)?n:null;}
 if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v)){const n=Date.parse(v);return Number.isFinite(n)?n:null;}
 return null;
}
export function revisorEsperaAprovacaoCp149(d){
 if(!normal(d)||!texto(d.origem)||texto(d.origem)!==texto(d.destinatario))return null;
 const b=d.bloqueio;if(!obj(b)||!GESTORES.includes(b.pessoa)||texto(b.pessoa)===texto(d.destinatario)||!['aguardando aprovacao','aprovacao'].includes(texto(b.texto)))return null;
 return b.pessoa;
}
export function ehAvisoEsperaCp149(d){return obj(d)&&d.tipoEspecial==='aguardando_resposta'&&typeof d.demandaOrigemId==='string'&&ID.test(d.demandaOrigemId)&&(!d.id||d.id!==d.demandaOrigemId);}
function analisar(aviso,origem){
 const origemId=ehAvisoEsperaCp149(aviso)?aviso.demandaOrigemId:null,revisor=revisorEsperaAprovacaoCp149(origem),s=(estado,motivo,extra={})=>({estado,motivo,origemId,revisor,...extra});
 if(!origemId)return s('indisponivel','Este aviso não confirmou uma demanda de origem válida.');
 if(!normal(origem)||origem.id&&origem.id!==origemId||origem.excluido===true||origem.arquivado===true)return s('indisponivel','Não consegui confirmar a mesma demanda normal de origem. Nada foi resolvido.');
 const criado=ms(aviso.criadoEm);if(criado===null)return s('indisponivel','O horário deste aviso precisa ser conferido antes de encerrar a espera.');
 let decisao=null;
 if(origem.status==='aprovada'){
  const em=ms(origem.aprovadoEm);
  if(em!==null&&em>=criado&&GESTORES.includes(origem.aprovadoPor)&&(!revisor||origem.aprovadoPor===revisor))decisao={tipo:'aprovada',em,por:origem.aprovadoPor};
 }
 const r=origem.refazerUltimoI161,rejeitado=ms(origem.rejeitadoEm);
 if(!decisao&&obj(r)&&typeof r.operacao==='string'&&/^[A-Za-z0-9_-]{8,180}$/.test(r.operacao)&&typeof r.motivo==='string'&&r.motivo.trim()&&GESTORES.includes(r.por)&&GESTORES.includes(r.atorReal||r.por)&&(!revisor||r.por===revisor)&&rejeitado!==null&&ms(r.em)===rejeitado&&rejeitado>criado&&['pendente','concluida_aguardando_aprovacao'].includes(origem.status))decisao={tipo:'devolvida',em:rejeitado,por:r.atorReal||r.por,operacao:r.operacao};
 if(decisao){
  const b=origem.bloqueio,desde=obj(b)?ms(b.desde):null;
  const limparBloqueio=obj(b)&&b.pessoa===aviso.destinatario&&desde!==null&&desde<=criado&&desde<=decisao.em;
  return s('resolvido',decisao.tipo==='aprovada'?'A entrega foi aprovada na demanda de origem.':'A revisão já devolveu a entrega na demanda de origem.',{decisao,limparBloqueio});
 }
 if(proprio(origem,'bloqueio')&&origem.bloqueio===null)return s('resolvido','A espera foi removida explicitamente na demanda de origem.',{decisao:{tipo:'espera_removida',em:null,por:null},limparBloqueio:false});
 if(origem.status==='concluida_aguardando_aprovacao'&&revisor&&aviso.destinatario===revisor)return s('revisar','A entrega já está salva. O responsável precisa revisar a demanda original.');
 return s('aguardando',origem.status==='concluida_aguardando_aprovacao'?'A entrega está salva e ainda aguarda a revisão correspondente.':'A origem ainda não confirmou uma decisão desta espera.');
}
export function estadoEsperaCp149(aviso,origem){const {estado,motivo,origemId,revisor}=analisar(aviso,origem);return {estado,motivo,origemId,revisor};}
function snapshot(s,id){if(!s||typeof s.exists!=='function'||typeof s.data!=='function'||s.id&&s.id!==id)throw erro('leitura','A consulta não corresponde ao mesmo identificador.');if(!s.exists())return null;const d=s.data();if(!obj(d))throw erro('leitura','A consulta não confirmou os dados do aviso.');return {...d,id};}
/** IO: ler(id)=>DocumentSnapshot; transacionar(fn) adapta tx={get(id),update(id,patch)}. */
export function criarEsperaDemandaCp149({ler,transacionar,contexto,agora=()=>new Date()}={}){
 if([ler,transacionar,contexto,agora].some(f=>typeof f!=='function'))throw erro('configuracao','O caminho da espera não foi confirmado.');
 const ocupados=new Set();
 function capturar(){const c=contexto();if(!obj(c)||typeof c.uid!=='string'||!c.uid.trim()||typeof c.nome!=='string'||!c.nome||typeof c.atorReal!=='string'||!c.atorReal||typeof c.sessao!=='string'||!c.sessao||!Number.isSafeInteger(c.geracao)||c.geracao<0||c.anonimo!==false)throw erro('permissao','Entre no seu acesso Google confirmado para conferir esta espera.');return Object.fromEntries(CTX.map(k=>[k,c[k]]));}
 function exigir(c){const n=capturar();if(CTX.some(k=>n[k]!==c[k]))throw erro('contexto','O perfil mudou. Reabra a mesma espera no acesso original.');}
 function autorizar(c,a){if(!ehAvisoEsperaCp149(a))throw erro('aviso','Este registro não é um aviso de espera válido.');const gestor=GESTORES.includes(c.nome)&&GESTORES.includes(c.atorReal),destino=c.nome===a.destinatario&&(c.atorReal===c.nome||c.atorReal==='Chris');if(!gestor&&!destino)throw erro('permissao','Este aviso pertence a outro destinatário.');}
 function marcador(a){
  const m=a?.resolucaoEsperaCp149;if(m===undefined)return null;
  const operacao='espera149_'+a.id,evento=Array.isArray(a.historico)?a.historico.filter(x=>x?.operacaoIdCp149===operacao):[];
  if(!obj(m)||m.schema!==1||m.avisoId!==a.id||m.origemId!==a.demandaOrigemId||m.operacao!==operacao||typeof m.por!=='string'||!m.por||ms(m.em)===null||a.status!=='aprovada'||a.ehAviso!==true||a.notaConclusao!=='aviso resolvido na origem'||evento.length!==1||evento[0].por!==m.por||evento[0].em!==m.em||evento[0].acao!=='Aviso de espera resolvido na origem'||evento[0].detalhe!==m.motivo)throw erro('marcador','A confirmação anterior deste aviso precisa ser conferida.');return m;
 }
 async function lerPar(avisoId,c){
  if(typeof avisoId!=='string'||!ID.test(avisoId))throw erro('aviso','Confira o identificador do mesmo aviso.');exigir(c);const a=snapshot(await ler(avisoId),avisoId);exigir(c);if(!a)throw erro('aviso','Este aviso não está mais disponível.');autorizar(c,a);const o=snapshot(await ler(a.demandaOrigemId),a.demandaOrigemId);exigir(c);return {aviso:a,origem:o};
 }
 function resposta(par,extra={}){const estado=estadoEsperaCp149(par.aviso,par.origem),m=marcador(par.aviso);return {...par,...estado,confirmado:!!m&&!!par.origem,novo:false,repetido:!!m,...extra};}
 async function conferir(avisoId){const c=capturar();const par=await lerPar(avisoId,c);exigir(c);return resposta(par);}
 async function resolver(avisoId){
  if(typeof avisoId!=='string'||!ID.test(avisoId))throw erro('aviso','Confira o identificador do mesmo aviso.');if(ocupados.has(avisoId))throw erro('ocupado','Espere a confirmação deste mesmo aviso.');
  const c=capturar(),data=agora();if(!(data instanceof Date)||!Number.isFinite(data.getTime()))throw erro('relogio','Não consegui confirmar o horário.');const em=data.toISOString();ocupados.add(avisoId);
  try{
   let transacao,escritaSolicitada=false;
   try{
    transacao=await transacionar(async tx=>{
     exigir(c);if(!tx||typeof tx.get!=='function'||typeof tx.update!=='function')throw erro('configuracao','A transação desta espera não foi confirmada.');
     const a=snapshot(await tx.get(avisoId),avisoId);exigir(c);if(!a)throw erro('aviso','Este aviso não está mais disponível.');autorizar(c,a);
     const o=snapshot(await tx.get(a.demandaOrigemId),a.demandaOrigemId);exigir(c);const par={aviso:a,origem:o},antes=marcador(a),s=analisar(a,o);
     if(antes)return {par,novo:false,repetido:true};
     if(s.estado!=='resolvido')return {par,novo:false,repetido:false};
     if(a.excluido===true||a.arquivado===true||!['pendente','concluida_aguardando_aprovacao'].includes(a.status)||a.historico!==undefined&&!Array.isArray(a.historico))throw erro('estado','O aviso mudou de situação. Confira a versão atual.');
     const operacao='espera149_'+avisoId,m={schema:1,avisoId,origemId:a.demandaOrigemId,operacao,por:c.atorReal,perfil:c.nome,uid:c.uid,em,motivo:s.motivo,decisao:s.decisao.tipo,decisaoEm:s.decisao.em===null?null:new Date(s.decisao.em).toISOString(),...(s.decisao.operacao?{decisaoOperacao:s.decisao.operacao}:{}),limpouBloqueio:s.limparBloqueio===true};
     const evento={acao:'Aviso de espera resolvido na origem',por:c.atorReal,em,detalhe:s.motivo,operacaoIdCp149:operacao};
     const patch={status:'aprovada',ehAviso:true,notaConclusao:'aviso resolvido na origem',resolucaoEsperaCp149:m,historico:[...(a.historico||[]),evento]};
     exigir(c);escritaSolicitada=true;if(s.limparBloqueio)tx.update(a.demandaOrigemId,{bloqueio:null});exigir(c);tx.update(avisoId,patch);
     return {par:{aviso:{...a,...patch},origem:s.limparBloqueio?{...o,bloqueio:null}:o},novo:true,repetido:false};
    });exigir(c);
   }catch(e){
    if(!escritaSolicitada&&String(e.code||'').startsWith('gs/espera-cp149-'))throw e;
    let par;try{par=await lerPar(avisoId,c);exigir(c);}catch(leitura){throw erro('incerto','Não consegui confirmar o aviso no servidor. Use Conferir espera antes de repetir.',{resultadoIncerto:true,cause:e,leitura});}
    if(marcador(par.aviso)&&par.origem)return resposta(par,{recuperado:true});
    throw e;
   }
   if(!transacao.novo)return resposta(transacao.par,{repetido:transacao.repetido});
   let par;try{par=await lerPar(avisoId,c);exigir(c);}catch(e){throw erro('incerto','O aviso pode ter sido encerrado. Use Conferir espera antes de repetir.',{resultadoIncerto:true,cause:e});}
   if(!marcador(par.aviso)||!par.origem)throw erro('incerto','A releitura não confirmou o mesmo aviso resolvido. Confira antes de repetir.',{resultadoIncerto:true});
   return resposta(par,{novo:true,repetido:false,recuperado:false});
  }finally{ocupados.delete(avisoId);}
 }
 return Object.freeze({conferir,resolver});
}
