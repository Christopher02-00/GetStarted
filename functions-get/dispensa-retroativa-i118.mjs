import {exigirI165,idFisicoI165,instanteI165} from './lib/gs-contexto-operacional-i165.mjs';
import {contextoTxI165,hashI165} from './contexto.mjs';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
import {redesPostagemDispensaI118,textoCanonicoDispensaI118} from './lib/gs-dispensa-retroativa-i118.mjs';
import {refDispensaI118,alvoDispensaI118,dispensaServidorRedeI118,assinaturaContextoDispensaI118,demandasRetroativasTxI118,encerrarDemandasRetroativasI118} from './dispensa-retroativa-suporte-i118.mjs';
export const ACOES_DISPENSA_I118=['preparar_dispensa_retroativa_i118','dispensar_confirmacao_retroativa_i118','conferir_dispensa_retroativa_i118','projetar_dispensas_retroativas_i118'];
const lista=ids=>{exigirI165(Array.isArray(ids)&&ids.length<=60&&ids.every(idFisicoI165)&&new Set(ids).size===ids.length,'i118-lista','Confira até 60 origens únicas; nenhuma parte será omitida.');return ids;};
const refOp=(db,a,id)=>db.doc('programacao_operacoes_i165/'+hashI165(['dispensa_retroativa_i118',a.uid,a.real,a.papel,id]));
export async function operarDispensaRetroativaI118(db,auth,d,{agora=new Date()}={}){
 const a=validarContaEsperadaI165(auth,d),projetar=d.acao==='projetar_dispensas_retroativas_i118',em=instanteI165(agora);
 exigirI165((projetar?['Chris','Amanda','Cecília']:['Chris','Amanda']).includes(a.papel),'i118-papel','A dispensa administrativa pertence ao Chris e à Amanda.');
 if(['conferir_dispensa_retroativa_i118','dispensar_confirmacao_retroativa_i118'].includes(d.acao))exigirI165(idFisicoI165(d.operacaoId),'i118-operacao','Confira a mesma tentativa administrativa.');
 if(d.acao==='conferir_dispensa_retroativa_i118')return db.runTransaction(async tx=>{await contextoTxI165(db,tx,a,'programacao');const r=await tx.get(refOp(db,a,d.operacaoId));return {schema:1,estado:r.exists?'confirmada':'ausente_no_instante',...(r.exists?{recibo:r.data()}:{}),retrySomenteMesmaIntencao:true};});
 if(projetar)return db.runTransaction(async tx=>{await contextoTxI165(db,tx,a,'programacao');const projecoes=[],erros=[];for(const id of lista(d.ids)){try{const f=await fontesPostagemTxI165(db,tx,id,em,{conferirDiretriz:false});projecoes.push({postagemId:id,assinaturaFonte:hashI165(f.post),redes:redesPostagemDispensaI118(f.post).map(r=>dispensaServidorRedeI118(f,r)).filter(Boolean)});}catch(e){erros.push({postagemId:id,codigo:e.code||'i118/fonte',mensagem:e.message});}}return {schema:1,projecoes,erros,nenhumaEscrita:true};});
 const preparar=d.acao==='preparar_dispensa_retroativa_i118';
 let corte,ids;
 if(preparar){corte=d.corte||em;exigirI165(typeof corte==='string'&&new Date(corte).toISOString()===corte&&corte<=em,'i118-corte','Confira um corte válido, anterior ou igual ao instante atual.');ids=lista(d.ids);}
 else{exigirI165(d.manifesto?.schema===1&&typeof d.manifesto.corte==='string'&&Array.isArray(d.manifesto.alvos)&&d.manifesto.alvos.length>0,'i118-manifesto','Confira a prévia administrativa antes de confirmar.');corte=d.manifesto.corte;exigirI165(new Date(corte).toISOString()===corte&&corte<=em,'i118-corte','O corte não pode avançar durante a confirmação.');ids=lista(d.manifesto.alvos.map(x=>x?.postagemId));exigirI165(hashI165(textoCanonicoDispensaI118(d.manifesto))===d.assinaturaManifesto,'i118-assinatura','A prévia administrativa mudou.');}
 return db.runTransaction(async tx=>{
  await contextoTxI165(db,tx,a,'programacao');const op=preparar?null:refOp(db,a,d.operacaoId),prev=op?await tx.get(op):null;
  if(prev?.exists){exigirI165(prev.data().assinaturaManifesto===d.assinaturaManifesto,'i118-reuso','Esta tentativa pertence a outra lista.');return {schema:1,estado:'recuperado',recibo:prev.data(),requerLeituraAtual:true};}
  const alvos=[],preservados=[],fontes=[];
  for(const id of ids){const f=await fontesPostagemTxI165(db,tx,id,em,{conferirDiretriz:false}),alvo=alvoDispensaI118(f,corte);if(alvo){alvos.push(alvo);fontes.push(f);}else preservados.push({postagemId:id,motivo:'Não há confirmação/checklist retroativo elegível nesta agenda.'});}
  const manifesto={schema:1,corte,alvos},assinaturaManifesto=hashI165(textoCanonicoDispensaI118(manifesto));
  if(preparar)return {schema:1,manifesto,assinaturaManifesto,preservados,somenteLeitura:true,nenhumaEscrita:true};
  exigirI165(textoCanonicoDispensaI118(manifesto)===textoCanonicoDispensaI118(d.manifesto),'i118-fonte-mudou','Uma origem, rede ou agenda mudou depois da prévia. Nenhuma cobrança foi dispensada.');
  const prontos=[],demandas=[];
  for(let i=0;i<fontes.length;i++){const f=fontes[i],alvo=alvos[i],redes=Object.fromEntries(redesPostagemDispensaI118(f.post).map(r=>[r,dispensaServidorRedeI118(f,r)]).filter(([,v])=>v));for(const r of alvo.redes)redes[r.rede]={...r,dispensada:true,ciclo:alvo.ciclo,em,operacaoId:d.operacaoId,por:a.real,autorUid:a.uid,perfil:a.papel,administrativa:true};const registro={schema:1,origem:'dispensa_confirmacao_retroativa_i118',postagemId:f.post.id,createTime:f.postCreateTime,assinaturaContexto:assinaturaContextoDispensaI118(f),redes};const nova={...f,dispensaRetroativaI118:registro},docs=await demandasRetroativasTxI118(db,tx,nova);prontos.push({f:nova,registro,docs});demandas.push(...docs.map(x=>x.id));}
  exigirI165(demandas.length<=350,'i118-volume','Há muitas cobranças; divida a lista antes de confirmar. Nada foi dispensado parcialmente.');
  const recibo={schema:1,tipo:'dispensa_confirmacao_retroativa_i118',operacaoId:d.operacaoId,assinaturaManifesto,corte,em,autoria:{uid:a.uid,atorReal:a.real,papel:a.papel},administrativa:true,naoConfirmaPublicacao:true,alvos:alvos.map(x=>({postagemId:x.postagemId,redes:x.redes.map(r=>r.rede)})),demandasEncerradas:demandas};
  for(const x of prontos){tx.set(refDispensaI118(db,x.f.post.id),x.registro);tx.set(refDispensaI118(db,x.f.post.id).collection('historico').doc(hashI165([a.uid,d.operacaoId])),{...x.registro,recibo});encerrarDemandasRetroativasI118(tx,x.docs,x.f,em,d.operacaoId,a.real);}
  tx.set(op,recibo);return {schema:1,estado:'novo',recibo,requerLeituraAtual:true};
 });
}
