import {ACOES_CIENCIA_CP146,operarCienciaProvidenciasCp146,estadoCienciaCp146} from './conferencia-providencias-cp146.mjs';
/* Só escreve vínculos e seus recibos. O fluxo normal continua único escritor da demanda. */
import {isDeepStrictEqual as igual} from 'node:util';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {gateProvidenciasCp140,fonteProvidenciasTxCp140} from './providencias-gravacoes-cp140.mjs';
import {hashProvidenciaCp140,exigirProvidenciaCp140 as e} from './central/lib/gs-providencias-gravacao-cp140.mjs';
import {ACOES_VINCULOS_CP142,validarEntradaVinculoCp142,demandaNormalVinculavelCp142,podeLerVinculoCp142,finalizadaVinculoCp142,validarRegistroVinculoCp142,resumoVinculoCp142,prepararVinculoCp142} from './central/lib/gs-providencias-vinculos-cp142.mjs';
export const ACOES_VINCULOS_CP142_COM_CIENCIA=Object.freeze([...ACOES_VINCULOS_CP142,...ACOES_CIENCIA_CP146]);
export {ACOES_VINCULOS_CP142};
const autoria=a=>({uid:a.uid,papel:a.papel,atorReal:a.real});
const vinculoRef=(db,id)=>db.doc('providencias_vinculos_cp142/'+id);
const reciboRef=(db,id,op)=>db.doc('providencias_vinculos_cp142/'+id+'/operacoes/'+op);
const stamp=s=>s?.updateTime?.toJSON?.()||s?.updateTime||null;
const retrato=s=>({corpo:s.data(),updateTime:stamp(s)});
const limitado=v=>{e(Buffer.byteLength(JSON.stringify(v),'utf8')<=950*1024,'A consulta ultrapassa950KiB; refine o escopo. Nenhuma demanda foi omitida.','limite');return v;};
function lerDemanda(s,id,ator){e(s.exists,'A demanda original não foi encontrada. O vínculo foi preservado.','demanda');const d={...s.data(),id};demandaNormalVinculavelCp142(d,id);e(podeLerVinculoCp142(d,ator),'Este compromisso pertence a outro destinatário.','papel');return d;}
async function dto(s,v,ator){const d=lerDemanda(s,s.id,ator);return limitado({schema:1,id:s.id,demanda:d,assinaturaDemanda:await hashProvidenciaCp140(retrato(s)),vinculo:v||null,assinaturaVinculo:v?await hashProvidenciaCp140(v):null,resumo:v?resumoVinculoCp142(v,d):null,podeVincular:['Chris','Amanda'].includes(ator.papel)&&!d.excluido&&!d.arquivado,somenteVinculo:true,demandaNaoAlterada:true});}
function conferirRecibo(rec,ator,hash=null){e(rec?.schema===1&&igual(rec.autoria,autoria(ator))&&(!hash||rec.pedidoHash===hash),'A tentativa guardada pertence a outro conteúdo ou perfil.','operacao');return rec;}
export async function operarVinculosProvidenciasCp142(db,auth,entrada,{agora=new Date()}={}){
 if(ACOES_CIENCIA_CP146.includes(entrada?.acao))return operarCienciaProvidenciasCp146(db,auth,entrada,{agora});
 const {acao,pedido:p}=validarEntradaVinculoCp142(entrada),ator=validarContaEsperadaI165(auth,p);e(['Chris','Amanda','Cecília'].includes(ator.papel),'Este espaço pertence à coordenação e à gerência.','papel');
 if(acao==='vincular')e(['Chris','Amanda'].includes(ator.papel),'Chris ou Amanda conferem os vínculos.','papel');e(agora instanceof Date&&Number.isFinite(agora.getTime()),'Relógio inválido.');const em=agora.toISOString();
 if(acao==='listar')return db.runTransaction(async tx=>{
  await gateProvidenciasCp140(db,tx,ator);let q=db.collection('providencias_vinculos_cp142');if(p.cliente)q=q.where('cliente','==',p.cliente);if(p.competencia)q=q.where('competencia','==',p.competencia);
  const links=await tx.get(q.limit(301));e(links.size<=300,'Há mais de300vínculos; refine cliente e mês. Nenhum registro foi cortado.','limite');const itens=[];
  const fontes=await Promise.all(links.docs.map(l=>tx.get(db.doc('demandas/'+l.id))));
  for(let i=0;i<links.docs.length;i++){const s=links.docs[i],v=s.data();validarRegistroVinculoCp142(v,s.id);const ds=fontes[i];e(ds.exists,'Um vínculo está sem a demanda original. Reconfira o registro; não foi tratado como concluído.','demanda');const d={...ds.data(),id:ds.id};if(!podeLerVinculoCp142(d,ator))continue;demandaNormalVinculavelCp142(d,ds.id);if(!p.incluirFinalizadas&&finalizadaVinculoCp142(d))continue;itens.push({...resumoVinculoCp142(v,d),conferenciaCp146:await estadoCienciaCp146(db,tx,ator,v,d)});}
  itens.sort((a,b)=>(a.prazoData||'9999').localeCompare(b.prazoData||'9999')||a.id.localeCompare(b.id));return limitado({schema:1,itens,total:itens.length,completo:true,somenteConsulta:true,fonteEstado:'demanda_original_atual'});
 },{readOnly:true});
 const id=acao==='conferir'?p.id:p.vinculo.demandaId,vr=vinculoRef(db,id),rr=p.operacao?reciboRef(db,id,p.operacao):null;
 const {uidEsperado,atorRealEsperado,papelOperado,sessao,...negocio}=entrada,pedidoHash=acao==='vincular'?await hashProvidenciaCp140({pedido:negocio,autoria:autoria(ator)}):null;
 return db.runTransaction(async tx=>{
  const g=await gateProvidenciasCp140(db,tx,ator),[s,vs,rs]=await Promise.all([tx.get(db.doc('demandas/'+id)),tx.get(vr),rr?tx.get(rr):Promise.resolve(null)]);
  const d=lerDemanda(s,id,ator),antes=vs.exists?validarRegistroVinculoCp142(vs.data(),id):null,rec=rs?.exists?conferirRecibo(rs.data(),ator,pedidoHash):null;
  const atual=await dto(s,antes,ator);
  if(acao==='conferir')return {...atual,...(p.operacao?{operacao:{id:p.operacao,confirmada:!!rec,estado:rec?'confirmada':'ausente',recibo:rec}}:{})};
  if(rec)return {...atual,operacao:{id:p.operacao,confirmada:true,estado:'recuperado',recibo:rec},demandaNaoAlterada:true};
  let fonte,depois;
  try{fonte=await fonteProvidenciasTxCp140(db,tx,p.vinculo.cliente,p.vinculo.competencia,g,agora);depois=await prepararVinculoCp142({antes,demanda:d,rawDemanda:retrato(s),id,pedido:p,ator,fonte,em});}
  catch(err){if(!err?.code?.startsWith('i165/providencia-cp140-'))throw err;const recusado={schema:1,id,operacao:p.operacao,acao:'vincular',pedido:structuredClone(entrada),pedidoHash,hashPayload:await hashProvidenciaCp140(negocio),autoria:autoria(ator),em,estado:'recusada',motivo:err.message,codigo:err.code,demandaNaoAlterada:true,semPublicacao:true};tx.create(rr,recusado);return {...atual,operacao:{id:p.operacao,confirmada:true,estado:'recusada',recibo:recusado},demandaNaoAlterada:true};}
  const recibo={schema:1,id,operacao:p.operacao,acao:'vincular',pedido:structuredClone(entrada),pedidoHash,hashPayload:await hashProvidenciaCp140(negocio),autoria:autoria(ator),em,estado:'confirmada',revisaoAntes:antes?.revisao||0,revisaoDepois:depois.revisao,assinaturaDepois:await hashProvidenciaCp140(depois),demandaNaoAlterada:true,semPublicacao:true};
  // Não há set/update/create da coleção demandas. Todos os leitores terminam antes do primeiro writer.
  if(vs.exists)tx.set(vr,depois);else tx.create(vr,depois);tx.create(rr,recibo);
  return {...atual,vinculo:depois,assinaturaVinculo:recibo.assinaturaDepois,resumo:resumoVinculoCp142(depois,d),operacao:{id:p.operacao,confirmada:true,estado:'novo',recibo},demandaNaoAlterada:true};
 });
}
