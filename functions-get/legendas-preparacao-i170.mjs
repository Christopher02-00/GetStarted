/* Leitura tipada da fila opcional. Nenhum path de escrita, calendário ou token sai desta superfície. */
import {FieldPath} from 'firebase-admin/firestore';
import {exigirCentralR80 as e,idR80} from './central-preparacao-validacao-r80.mjs';
const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
export function projetarLegendaFlatI170(id,p,v=null){
 if(!/^[A-Za-z0-9_-]{1,180}$/u.test(id)||!p||p.status!=='aguardando_legenda'||p.excluido===true||p.cliente==='stokki'||p.publicacaoStokki!=null)return null;
 if(p.videoId&&(!v||v.excluido===true||v.status!=='aprovado'||v.clienteAprovou!==true||v.postagemId!==id||v.cliente!==p.cliente))return null;
 let linkVideo='';try{const u=new URL(p.linkVideo||p.videoUrl||'');if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)linkVideo=u.href;}catch{}
 return {id,cliente:str(p.cliente,120),clienteNome:str(p.clienteNome,180),titulo:str(p.titulo,500),legenda:str(p.legenda,20000),status:'aguardando_legenda',excluido:false,linkVideo};
}
export function projetarRespostaPesquisaI170(valor){
 if(Array.isArray(valor))return valor.map(projetarRespostaPesquisaI170);if(!valor||typeof valor!=='object'||typeof valor.toDate==='function')return valor;
 const o={...valor};if(o.schema===1&&o.cliente&&o.competencia){for(const k of ['criacao','entrega','publicacaoAtual'])if(o[k]){o[k]={...o[k]};delete o[k].pecas;delete o[k].retrato;delete o[k].assinatura;}}
 for(const k of Object.keys(o))o[k]=projetarRespostaPesquisaI170(o[k]);
 for(const k of ['andamentoCalendarioI164','assinaturaCalendarioI164','fontesAgendaI167'])if(Object.hasOwn(valor,k))Object.defineProperty(o,k,{value:valor[k],enumerable:false,configurable:true});return o;
}
export async function lerLegendasPendentesI170(db,{ator,pedido,gate}){
 e(ator.papel==='Gabrielle','O apoio de legendas desta tela pertence à Gabi.');if(pedido.apos!==undefined)idR80(pedido.apos);
 return db.runTransaction(async tx=>{
  await gate(tx);let q=db.collection('postagens').where('status','==','aguardando_legenda').orderBy(FieldPath.documentId()).limit(51);if(pedido.apos)q=q.startAfter(pedido.apos);
  const snap=await tx.get(q),pagina=snap.docs.slice(0,50),elegiveis=pagina.filter(s=>{const p=s.data();return p.excluido!==true&&p.cliente!=='stokki'&&p.publicacaoStokki==null;}),ids=[...new Set(elegiveis.map(s=>s.data().videoId).filter(Boolean))];
  e(ids.every(id=>typeof id==='string'&&/^[A-Za-z0-9_.-]{1,180}$/u.test(id)),'Uma origem da fila precisa da conferência da gestão. Nenhum vínculo foi presumido.');
  const vs=await Promise.all(ids.map(id=>tx.get(db.doc('videos_producao/'+id)))),videos=new Map(vs.map(s=>[s.id,s.exists?s.data():null]));
  const postagens=pagina.map(s=>projetarLegendaFlatI170(s.id,s.data(),videos.get(s.data().videoId))).filter(Boolean);
  return {schema:1,postagens,proximaPagina:snap.docs.length>50?pagina.at(-1).id:'',candidatosConferidos:pagina.length,indisponiveis:pagina.length-postagens.length,completa:snap.docs.length<=50};
 });
}
