/* Adapter Admin estreito do callable I165 existente. Não modifica calendários, gravações ou publicações. */
import {isDeepStrictEqual as igual} from 'node:util';
import {COLECAO_PROVIDENCIAS_CP140} from './central/providencias-gravacao-cp140.mjs';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {validarCadastroI165,saidaEfetivaI165} from './contexto.mjs';
import {capacidadePreparacaoEditorialI172,CAMPOS_EDITORIAIS_I172} from './editorial-contrato-i172.mjs';
import {fonteFisicaClienteR4,mesDoItemCalendario} from './lib/guardas-stokki-i165.mjs';
import {TIPO_PROVIDENCIA_GRAVACAO_CP140,META_PROVIDENCIA_CP140,ACOES_PROVIDENCIAS_CP140,exigirProvidenciaCp140 as e,validarEntradaProvidenciaCp140,validarRegistroProvidenciaCp140,resumoProvidenciaCp140,idProvidenciaGravacaoCp140,hashProvidenciaCp140,transicionarProvidenciaCp140} from './central/lib/gs-providencias-gravacao-cp140.mjs';
export {ACOES_PROVIDENCIAS_CP140};
const gestores=a=>['Chris','Amanda'].includes(a.papel),autoria=a=>({uid:a.uid,papel:a.papel,atorReal:a.real}),clone=v=>structuredClone(v);
const stamp=s=>s?.updateTime?.toJSON?.()||s?.updateTime||null;
const refDemanda=(db,id)=>db.doc(COLECAO_PROVIDENCIAS_CP140+'/'+id);
const reciboRef=(db,id,op)=>db.doc(COLECAO_PROVIDENCIAS_CP140+'/'+id+'/providencias_cp140/'+op);
const finais=d=>d.excluido===true||['aprovada','cancelada'].includes(d.status);
const tamanho=v=>{e(Buffer.byteLength(JSON.stringify(v),'utf8')<=950*1024,'A leitura da providência ultrapassa950KiB; nada foi omitido.','limite');return v;};
async function gate(db,tx,ator){
 const [cfg,cad,proc]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(db.doc('usuarios_equipe/'+ator.email)),tx.get(db.doc('processo_calendarios_i164/ativo'))]);
 validarCadastroI165(ator,cad.data());e(capacidadePreparacaoEditorialI172(cfg.data(),proc.exists,proc.data()),'A preparação está pausada; as providências foram preservadas.','inativo');
 return {assinatura:await hashProvidenciaCp140({config:cfg.data(),cadastro:cad.data(),processo:proc.exists?proc.data():null}),ativacaoId:cfg.data().ativacaoId};
}
async function fonteTx(db,tx,cliente,competencia,g,agora){
 const [cs,enc,cal,ciclo]=await Promise.all([tx.get(db.doc('clientes_config/'+cliente)),tx.get(db.doc('clientes_encerrados/'+cliente)),tx.get(db.doc('calendarios/'+cliente)),tx.get(db.doc('planejamento_social_i155/'+competencia+'__'+cliente))]);
 const c=cs.data()||{},hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(agora);
 const clienteAtivo=cs.exists&&c.ativo!==false&&c.clienteInativo!==true&&c.excluido!==true&&!c.arquivado&&!c.unificadoPara&&!saidaEfetivaI165(c,hoje)&&!saidaEfetivaI165(enc.data(),hoje)&&fonteFisicaClienteR4(cliente,c);
 e(cal.exists&&fonteFisicaClienteR4(cliente,cal.data())&&Array.isArray(cal.data().items),'Não foi possível conferir a pauta física deste cliente. A providência continua preservada.','fonte');
 const raw=cal.data(),itensMes=raw.items.filter(i=>i&&mesDoItemCalendario(raw,i)===competencia&&!i.excluido);
 e(itensMes.length<=300&&itensMes.every(i=>typeof i.itemId==='string'&&i.itemId)&&new Set(itensMes.map(i=>i.itemId)).size===itensMes.length,'A pauta contém IDs ausentes, repetidos ou mais de300conteúdos. Confira a origem sem recriá-la.','fonte');
 const itens=[];for(const i of itensMes){const editorial=Object.fromEntries(CAMPOS_EDITORIAIS_I172.filter(k=>Object.hasOwn(i,k)).map(k=>[k,i[k]]));itens.push({itemId:i.itemId,titulo:String(i.name||''),dia:Number(i.day||i.dia)||0,empresaOtavio:String(i.empresaOtavio||''),versao:await hashProvidenciaCp140(editorial)});}
 itens.sort((a,b)=>a.dia-b.dia||a.itemId.localeCompare(b.itemId));
 const assinatura=await hashProvidenciaCp140({cliente,competencia,itens,config:c,encerramento:enc.exists?enc.data():null,ciclo:ciclo.exists?ciclo.data():null,gate:g.assinatura});
 return {schema:1,cliente,clienteNome:String(c.clienteNome||c.nome||raw.client||cliente),competencia,itens,assinatura,clienteAtivo,calendarUpdateTime:stamp(cal),somenteConsulta:true};
}
function fonteConfere(d,fonte){
 if(!fonte?.clienteAtivo)return false;
 const m=d[META_PROVIDENCIA_CP140];return m.origem.cliente===fonte.cliente&&m.origem.competencia===fonte.competencia&&m.origem.itens.every(i=>fonte.itens.some(n=>n.itemId===i.itemId&&n.versao===i.versao));
}
async function fonteDaDemanda(db,tx,d,g,agora){
 try{return {fonte:await fonteTx(db,tx,d.cliente,d.competencia,g,agora),motivo:''};}
 catch(err){if(err?.code?.startsWith('i165/providencia-cp140-'))return {fonte:null,motivo:err.message};throw err;}
}
function capacidades(d,a,atual){
 if(!d)return {salvar:gestores(a),esperar:false,confirmar:false,cancelar:false,substituir:false,aprovar:false,refazer:false};
 const aberto=d.status==='pendente'&&!d.excluido,review=d.status==='concluida_aguardando_aprovacao'&&!d.excluido;
 return {salvar:gestores(a)&&aberto,esperar:aberto,confirmar:aberto&&atual&&!d[META_PROVIDENCIA_CP140].espera,cancelar:gestores(a)&&d.status!=='cancelada'&&!d.excluido,substituir:gestores(a)&&d.status!=='cancelada'&&!d.excluido,aprovar:a.papel==='Amanda'&&review&&atual,refazer:a.papel==='Amanda'&&review};
}
async function dto(d,a,fonte=null,motivo=''){
 if(!d)return {schema:1,fonteColecao:COLECAO_PROVIDENCIAS_CP140,providencia:null,assinatura:null,fonteAtual:fonte,capacidades:capacidades(null,a,false)};
 validarRegistroProvidenciaCp140(d,d.id);const atual=fonteConfere(d,fonte);
 return tamanho({schema:1,providencia:clone(d),fonteColecao:COLECAO_PROVIDENCIAS_CP140,resumo:resumoPrivadoCp142(d),assinatura:await hashProvidenciaCp140(d),fonteAtual:fonte,fonteConferida:atual,motivoFonte:atual?'':motivo||'A origem mudou ou o cliente saiu da operação. A pendência não foi concluída; Chris ou Amanda precisa reconferir esta providência.',capacidades:capacidades(d,a,atual),naoPublicaCliente:true,naoAlteraCalendario:true});
}
function resumoPrivadoCp142(d){return {...resumoProvidenciaCp140(d),motivoDevolucao:d.status==='pendente'?d.refazerUltimoI161?.motivo||'':'',retornoOperacao:d.status==='pendente'?d.refazerUltimoI161?.operacao||'':''};}
function conferirRecibo(r,a,pedidoHash=null){
 e(r?.schema===1&&r.tipo===TIPO_PROVIDENCIA_GRAVACAO_CP140&&igual(r.autoria,autoria(a))&&(!pedidoHash||r.pedidoHash===pedidoHash),'Esta tentativa pertence a outro conteúdo ou perfil.','operacao');return r;
}
export async function operarProvidenciasGravacaoCp140(db,auth,entrada,{agora=new Date()}={}){
 const {acao,pedido:d}=validarEntradaProvidenciaCp140(entrada),ator=validarContaEsperadaI165(auth,d);
 e(['Chris','Amanda','Cecília'].includes(ator.papel),'Este espaço pertence à coordenação das gravações e à gerência.','papel');
 if(['salvar','cancelar','substituir'].includes(acao))e(gestores(ator),'Chris e Amanda registram, alteram ou cancelam providências.','papel');
 if(acao==='revisar')e(ator.papel==='Amanda','A revisão desta providência pertence à Amanda.','papel');
 e(agora instanceof Date&&Number.isFinite(agora.getTime()),'Relógio inválido.');const em=agora.toISOString();
 if(acao==='listar_fonte')return db.runTransaction(async tx=>{const g=await gate(db,tx,ator),fonte=await fonteTx(db,tx,d.cliente,d.competencia,g,agora);return {schema:1,fonte,assinaturaFonte:fonte.assinatura,itens:fonte.itens,clienteNome:fonte.clienteNome,capacidades:{salvar:gestores(ator)&&fonte.clienteAtivo&&fonte.itens.length>0},somenteConsulta:true};},{readOnly:true});
 if(acao==='listar')return db.runTransaction(async tx=>{
  await gate(db,tx,ator);e(!d.incluirFinalizadas||d.cliente&&d.competencia,'Para consultar o histórico completo, escolha cliente e mês.','filtro');
  const q=d.incluirFinalizadas?db.collection(COLECAO_PROVIDENCIAS_CP140).where('providenciaEscopoCp140','==',d.competencia+'__'+d.cliente):db.collection(COLECAO_PROVIDENCIAS_CP140).where('providenciaAtivaCp140','==',true);
  const s=await tx.get(q.limit(301));e(s.size<=300,'Há mais de300providências nesta consulta. Refine o escopo; nenhum registro foi omitido.','limite');
  const itens=[];for(const snap of s.docs){const row=snap.data();validarRegistroProvidenciaCp140(row,snap.id);e(row.id===await idProvidenciaGravacaoCp140(row.cliente,row.competencia,row[META_PROVIDENCIA_CP140].origem.chaveRecurso),'A identidade do recurso precisa de conferência.','registro');if(d.cliente&&row.cliente!==d.cliente||d.competencia&&row.competencia!==d.competencia||!d.incluirFinalizadas&&finais(row))continue;itens.push({...resumoPrivadoCp142(row),assinatura:await hashProvidenciaCp140(row)});}
  itens.sort((a,b)=>(a.prazoData||'9999').localeCompare(b.prazoData||'9999')||(a.prazoHora||'').localeCompare(b.prazoHora||'')||a.clienteNome.localeCompare(b.clienteNome,'pt-BR')||a.id.localeCompare(b.id));
  return tamanho({schema:1,fonteColecao:COLECAO_PROVIDENCIAS_CP140,itens,total:itens.length,somenteConsulta:true,completo:true,pendenciasIncluemEsperaEAtraso:true});
 },{readOnly:true});
 const id=acao==='salvar'?await idProvidenciaGravacaoCp140(d.providencia.cliente,d.providencia.competencia,d.providencia.chaveRecurso):d.id,ref=refDemanda(db,id),rr=d.operacao?reciboRef(db,id,d.operacao):null;
 const {uidEsperado,atorRealEsperado,papelOperado,sessao,...negocio}=entrada;
 const pedidoHash=acao==='ler'?null:await hashProvidenciaCp140({pedido:negocio,autoria:autoria(ator)});
 return db.runTransaction(async tx=>{
  const g=await gate(db,tx,ator),[old,os]=await Promise.all([tx.get(ref),rr?tx.get(rr):Promise.resolve(null)]),antes=old.exists?old.data():null;
  if(antes){validarRegistroProvidenciaCp140(antes,id);e(id===await idProvidenciaGravacaoCp140(antes.cliente,antes.competencia,antes[META_PROVIDENCIA_CP140].origem.chaveRecurso),'A identidade estável deste recurso não confere.','registro');}
  const rec=os?.exists?conferirRecibo(os.data(),ator,pedidoHash):null;
  const fs=antes?await fonteDaDemanda(db,tx,antes,g,agora):acao==='salvar'?{fonte:await fonteTx(db,tx,d.providencia.cliente,d.providencia.competencia,g,agora),motivo:''}:{fonte:null,motivo:''};
  if(acao==='ler'){
   e(antes||d.operacao,'A providência não foi encontrada.','registro');return {...await dto(antes,ator,fs.fonte,fs.motivo),...(d.operacao?{operacao:{id:d.operacao,estado:rec?(rec.estado==='recusada'?rec.estadoOperacao:'confirmada'):'ausente',confirmada:!!rec,recibo:rec}}:{})};
  }
  if(rec)return {...await dto(antes,ator,fs.fonte,fs.motivo),operacao:{id:d.operacao,estado:rec.estado==='recusada'?rec.estadoOperacao:'recuperado',confirmada:true,recibo:rec,atualizadoAposOperacao:!!antes&&antes[META_PROVIDENCIA_CP140].operacao!==d.operacao},...(rec.estado==='recusada'?{motivoRecusa:rec.motivo,requerComparacao:rec.estadoOperacao==='recusada_por_versao'}:{})};
  const anterior=await dto(antes,ator,fs.fonte,fs.motivo);
  const recusar=(erro,estadoOperacao='recusada')=>{
   const recibo={schema:1,tipo:TIPO_PROVIDENCIA_GRAVACAO_CP140,id,operacao:d.operacao,acao,pedido:clone(entrada),pedidoHash,autoria:autoria(ator),em,estado:'recusada',estadoOperacao,motivo:erro.message,codigo:erro.code||'i165/providencia-cp140-falha',revisaoAntes:antes?.[META_PROVIDENCIA_CP140].revisao||0,revisaoDepois:antes?.[META_PROVIDENCIA_CP140].revisao||0,semEscritaNegocio:true,semPublicacao:true};
   tx.create(rr,recibo);return {...anterior,requerComparacao:estadoOperacao==='recusada_por_versao',motivoRecusa:erro.message,operacao:{id:d.operacao,estado:estadoOperacao,confirmada:true,escrita:false,recibo}};
  };
  if((antes?await hashProvidenciaCp140(antes):null)!==d.assinaturaEsperada)return recusar(Object.assign(new Error('A providência mudou. Seus campos foram preservados; compare a versão atual.'),{code:'i165/providencia-cp140-versao'}),'recusada_por_versao');
  let depois,substituta=null;
  try{
   if(acao==='salvar')e(fs.fonte?.clienteAtivo&&fs.fonte.assinatura===d.assinaturaFonte,'A pauta, o cliente ou a preparação mudou. Confira a mesma fonte.','fonte');
   if(acao==='confirmar'||acao==='revisar'&&d.decisao==='aprovar')e(antes&&fonteConfere(antes,fs.fonte),'A origem mudou. A pendência continua aberta; Chris ou Amanda precisa atualizar somente esta providência.','fonte');
   if(acao==='substituir'){const s=await tx.get(refDemanda(db,d.substituidaPorId));e(s.exists,'A providência substituta não foi encontrada.','registro');substituta=s.data();validarRegistroProvidenciaCp140(substituta,s.id);}
   if(acao==='salvar'&&d.providencia.sessaoId){const s=await tx.get(db.doc('agendamentos/'+d.providencia.sessaoId)),ag=s.data(),slug=ag?.clienteSlug||ag?.cliente;e(s.exists&&slug===d.providencia.cliente&&ag.excluido!==true&&!['cancelado','cancelada'].includes(ag.status)&&fonteFisicaClienteR4(slug,ag),'A sessão não pertence ao mesmo cliente ou foi cancelada.','sessao');}
   depois=await transicionarProvidenciaCp140({antes,id,acao,pedido:d,ator,fonte:fs.fonte,em,substituta});
  }catch(erro){if(erro?.code?.startsWith('i165/providencia-cp140-'))return recusar(erro,erro.code.endsWith('-fonte')?'recusada_por_versao':'recusada');throw erro;}
  const recibo={schema:1,tipo:TIPO_PROVIDENCIA_GRAVACAO_CP140,id,operacao:d.operacao,acao,pedido:clone(entrada),pedidoHash,autoria:autoria(ator),em,estado:'confirmada',revisaoAntes:antes?.[META_PROVIDENCIA_CP140].revisao||0,revisaoDepois:depois[META_PROVIDENCIA_CP140].revisao,assinaturaDepois:await hashProvidenciaCp140(depois),estadoDemanda:depois.status,semPublicacao:true,calendarioAlterado:false};
  const out=await dto(depois,ator,fs.fonte,fs.motivo);
  // Todos os leitores e comparações terminaram. Não capturar falha de commit como ausência de escrita.
  if(old.exists)tx.set(ref,depois);else tx.create(ref,depois);tx.create(rr,recibo);
  return {...out,operacao:{id:d.operacao,estado:'novo',confirmada:true,recibo},naoAlteraGravacao:true};
 });
}

export {gate as gateProvidenciasCp140,fonteTx as fonteProvidenciasTxCp140};
