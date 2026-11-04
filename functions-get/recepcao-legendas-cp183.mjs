/* Recepção fechada dos dois formulários CP152. Não redige nem publica legendas. */
import {createHash} from 'node:crypto';
import {programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {conferirFonteLegendaCp152,conferirAcompanhamentoLegendaCp152,construirDemandaLegendaCp152,conferirDemandaLegendaCp152} from './pedidos-legenda-cp152.mjs';
export const TIPOS_LEGENDA_CP183=Object.freeze(['pedido_legenda','ajuste_legenda','legenda','correcao_legenda']);
const CAIXAS=['avisos_do_cliente','pedidos_publicos'],e=(ok,m)=>{if(!ok)throw Error(m);};
export const idDemandaLegendaCp183=(caixa,id)=>'entrada_i54_'+createHash('sha256').update(JSON.stringify([caixa,String(id)])).digest('hex');
const inativa=a=>!a||a.excluido||a.arquivado||a.cancelado||a.descartado||a.deleted||a.deletedAt;
export function formaFonteLegendaCp183(a,caixa,id){
 e(!Object.hasOwn(a||{},'schemaVersion')||a.schemaVersion===1,'A versão explícita da origem não é reconhecida.');
 const cliente=conferirFonteLegendaCp152(a,caixa,id),uid=a.autorUid,prefixo=caixa==='avisos_do_cliente'?'portal_pedido_cp152_':'publico_cp152_';
 e(CAIXAS.includes(caixa)&&typeof uid==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(uid)&&id.startsWith(prefixo+uid+'_')&&/^[a-f0-9]{32}$/.test(id.slice((prefixo+uid+'_').length))&&a.protocoloCriacaoCp152===id,'A legenda precisa confirmar o recibo do formulário original.');
 e(typeof a.descricao==='string'&&a.descricao.trim()&&a.descricao.length<=100000&&typeof a.titulo==='string'&&a.titulo.trim()&&a.titulo.length<=2000,'O pedido precisa preservar título e instruções completos.');
 e(caixa==='avisos_do_cliente'?!!cliente&&a.demandaClienteId===id:!a.demandaClienteId,'O acompanhamento não confirma a mesma origem do formulário.');
 return {cliente,mes:String(a.competencia||a.mes||a.mesRef||'')};
}
export async function receberLegendaClienteCp183(db,caixa,id,{agora=new Date()}={}){
 e(CAIXAS.includes(caixa)&&typeof id==='string'&&/^[A-Za-z0-9_-]{1,220}$/.test(id),'Confira a origem da legenda.');
 return db.runTransaction(async tx=>{
  const ar=db.doc(caixa+'/'+id),demandaId=idDemandaLegendaCp183(caixa,id),dr=db.doc('demandas/'+demandaId),[cfg,as,ds]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(ar),tx.get(dr)]);
  if(!programacaoAtivaI165(cfg.data())||cfg.data()?.habilidades?.preparacaoCentral!==true)return {estado:'pausada',demandaId};
  if(!as.exists||inativa(as.data())||!TIPOS_LEGENDA_CP183.includes(as.data().tipo)||as.data().lido!==false||as.data().viraDemanda!==true)return {estado:'ignorada',demandaId};
  const a=as.data(),{cliente}=formaFonteLegendaCp183(a,caixa,id);e(!a.demandaInternaId||a.demandaInternaId===demandaId,'O recibo anterior aponta outra demanda.');
  if(a.demandaClienteId){const p=await tx.get(db.doc('demandas_cliente/'+a.demandaClienteId));conferirAcompanhamentoLegendaCp152(p.data(),cliente,a);}
  if(ds.exists)conferirDemandaLegendaCp152(ds.data(),{...a,lido:true,demandaInternaId:demandaId},caixa,id,demandaId);
  else tx.create(dr,construirDemandaLegendaCp152(a,caixa,id,agora.toISOString(),new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(agora)));
  tx.update(ar,{lido:true,convertidoEm:agora.toISOString(),demandaInternaId:demandaId,conversaoVersao:'i54'});return {estado:ds.exists?'ja_existente':'recebida',demandaId};
 });
}
export async function executarRecepcaoLegendasCp183(db,{agora=new Date(),limite=40}={}){
 e(Number.isInteger(limite)&&limite>=1&&limite<=100,'Confira o limite da recepção de legendas.');const cfg=(await db.doc('programacao_config_i165/ativo').get()).data();if(!programacaoAtivaI165(cfg)||cfg.habilidades?.preparacaoCentral!==true)return {ativa:false,demandaIds:[],erros:[]};
 const ref=db.doc('servicos_i165/recepcao_legendas_cp183'),old=(await ref.get()).data()||{},r={ativa:true,conferidas:0,recebidas:0,jaExistentes:0,ignoradas:0,demandaIds:[],erros:[],cursores:{},maisPendentes:false};
 // Each indexed queue is bounded. Invalid/legacy entries advance their cursor,
 // while eligible errors remain explicit and are revisited on the next cycle.
 const filas=CAIXAS.flatMap(caixa=>['Chris','Gabrielle'].map(pessoa=>({caixa,pessoa}))),inicio=Number.isInteger(old.proximaFila)&&old.proximaFila>=0&&old.proximaFila<4?old.proximaFila:0;let restante=limite;
 for(let offset=0;offset<filas.length;offset++){
  const {caixa,pessoa}=filas[(inicio+offset)%filas.length],key=caixa+'__'+pessoa,cursor=typeof old.cursores?.[key]==='string'?old.cursores[key]:'';if(restante===0){r.cursores[key]=cursor;r.maisPendentes=true;continue;}const porFila=Math.min(restante,Math.max(1,Math.floor(limite/4)));let q=db.collection(caixa).where('tipo','in',TIPOS_LEGENDA_CP183).where(caixa==='avisos_do_cliente'?'paraQuem':'destinatario','==',pessoa).where('lido','==',false).where('viraDemanda','==',true).orderBy('__name__').limit(porFila+1);if(cursor)q=q.startAfter(cursor);
  const snap=await q.get(),page=snap.docs.slice(0,porFila);restante-=page.length;for(const s of page){r.conferidas++;const a=s.data();if(inativa(a)){r.ignoradas++;continue;}try{formaFonteLegendaCp183(a,caixa,s.id);}catch(e){r.erros.push({caixa,origem:s.id,erro:String(e.message).slice(0,500)});continue;}try{const v=await receberLegendaClienteCp183(db,caixa,s.id,{agora});if(v.estado==='recebida')r.recebidas++;else if(v.estado==='ja_existente')r.jaExistentes++;else r.ignoradas++;if(['recebida','ja_existente'].includes(v.estado))r.demandaIds.push(v.demandaId);}catch(e){r.erros.push({caixa,origem:s.id,erro:String(e.message).slice(0,500)});}}
  r.cursores[key]=snap.docs.length>porFila?page.at(-1).id:'';r.maisPendentes||=snap.docs.length>porFila;
 }
 r.proximaFila=(inicio+1)%4;
 await ref.set({schema:1,proximaFila:r.proximaFila,estado:r.erros.length?'conferir_origens':r.maisPendentes?'mais_pendentes':'conferida',ultimaExecucao:agora.toISOString(),cursores:r.cursores,conferidas:r.conferidas,recebidas:r.recebidas,jaExistentes:r.jaExistentes,ignoradas:r.ignoradas,erros:r.erros,portalAbertoNecessario:false});return r;
}
