import {createHash,randomUUID} from 'node:crypto';
import {getStorage} from 'firebase-admin/storage';
import {criarAdaptadorUploadPost} from './adaptador-upload-post.mjs';
import {executarPassoUploadPostI166} from './upload-post-executor-i166.mjs';
import {lerDependenciasUploadPostTxI166,exigirUploadPostI166} from './upload-post-fontes-i166.mjs';
import {concluirCanonicoUploadPostI166} from './upload-post-commit-i166.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function validarConfigUploadPostI166(c,{permitirPausado=false}={}){
 exigirUploadPostI166(c?.ativo===true&&typeof c.pausado==='boolean'&&(permitirPausado||c.pausado===false),'inativo','A integração externa está pausada.');
 for(const k of ['limiteJobsPorTick','leaseContaMs','intervaloContaMs','intervaloGlobalMs','maxBytesMidia'])exigirUploadPostI166(Number.isSafeInteger(c[k]),'config','Configure o limite explícito de '+k+'.');
 exigirUploadPostI166(c.limiteJobsPorTick>=1&&c.limiteJobsPorTick<=20&&c.leaseContaMs>=1000&&c.leaseContaMs<=120000&&c.intervaloContaMs>=0&&c.intervaloGlobalMs>=0&&c.maxBytesMidia>0&&c.maxBytesMidia<=128*1024*1024,'config','Os limites configurados estão fora da capacidade deste serviço.');return c;
}
export async function resolverVideoUploadPostI166(db,manifesto,{storage=getStorage(),agora=new Date()}={}){
 const cfg=validarConfigUploadPostI166((await db.doc('programacao_upload_post_i166/ativo').get()).data());
 exigirUploadPostI166(manifesto.bytes<=cfg.maxBytesMidia,'midia-limite','O arquivo excede o limite explícito deste serviço.');
 const file=storage.bucket(manifesto.storageRef.bucket).file(manifesto.storageRef.object,{generation:manifesto.generation});
 const conferir=m=>exigirUploadPostI166(String(m.generation)===manifesto.generation&&String(m.size)===String(manifesto.bytes)&&m.contentType===manifesto.mimeType,'midia-mudou','A versão do armazenamento mudou depois da aprovação.');
 const [antes]=await file.getMetadata();conferir(antes);const partes=[],h=createHash('sha256');let n=0;
 for await(const x of file.createReadStream({validation:'crc32c'})){const b=Buffer.from(x);n+=b.length;exigirUploadPostI166(n<=manifesto.bytes,'midia-tamanho','O arquivo mudou de tamanho.');h.update(b);partes.push(b);}
 exigirUploadPostI166(n===manifesto.bytes&&h.digest('hex')===manifesto.sha256,'midia-hash','O conteúdo do arquivo não corresponde ao manifesto aprovado.');const [depois]=await file.getMetadata();conferir(depois);
 return {tipo:'arquivo',nome:'get-'+manifesto.id+'.mp4',blob:new Blob(partes,{type:manifesto.mimeType}),sha256:manifesto.sha256,versao:manifesto.generation,tamanho:manifesto.bytes,mime:manifesto.mimeType};
}
async function reservarConta(db,j,cfg,agora){
 const em=agora.getTime(),token=randomUUID(),ar=db.doc('upload_post_leases_i166/'+hash(j.pacote.conta.instagram_account_id)),gr=db.doc('servicos_i165/upload_post_quota');
 return db.runTransaction(async tx=>{const [as,gs,js]=await Promise.all([tx.get(ar),tx.get(gr),tx.get(db.doc('upload_post_execucoes_i166/'+j.id))]),a=as.data()||{},g=gs.data()||{},atual=js.data();
  if(!atual||atual.canonico?.estado==='confirmado')return null;
  if((a.leaseAteMs||0)>em||(a.proximoMs||0)>em||(g.proximoMs||0)>em)return null;
  const reserva={token,jobId:j.id,leaseAteMs:em+cfg.leaseContaMs,proximoMs:em+cfg.intervaloContaMs};tx.set(ar,reserva);tx.set(gr,{proximoMs:em+cfg.intervaloGlobalMs,jobId:j.id,em:agora.toISOString()});return {ref:ar,token};
 });
}
async function registrarImpedimentoAntesEnvio(db,id,e,agora){
 const ref=db.doc('upload_post_execucoes_i166/'+id);return db.runTransaction(async tx=>{const s=await tx.get(ref),j=s.data();if(!s.exists||!['pendente','reservada','falha_antes_envio'].includes(j.estado)||(j.lease&&Date.parse(j.lease.ate)>agora.getTime()))return false;
  const codigo=String(e.code||e.codigo||'i166/fonte-pendente').slice(0,120),mensagem=String(e.message||'A fonte precisa de conferência antes de enviar.').slice(0,500);tx.update(ref,{estado:'precisa_atencao',lease:null,impedimentos:[{codigo,mensagem,responsavel:'Amanda',campo:'fontes'}],erro:{codigo,mensagem},ultimaLeitura:agora.toISOString()});return true;
 });
}
async function liberarConta(db,r){if(!r)return;await db.runTransaction(async tx=>{const s=await tx.get(r.ref);if(s.data()?.token===r.token)tx.update(r.ref,{leaseAteMs:0});});}
export async function acompanharUploadPostI166(db,{agora=new Date(),adaptador,resolverVideo}={}){
 const snap=await db.doc('programacao_upload_post_i166/ativo').get(),cfg=snap.data();if(cfg?.ativo!==true)return {ativa:false};validarConfigUploadPostI166(cfg,{permitirPausado:true});
 exigirUploadPostI166(adaptador&&resolverVideo,'transporte','O transporte privado ainda precisa ser configurado.');
 const cr=db.doc('servicos_i165/upload_post_cursor'),anterior=(await cr.get()).data()||{};let q=db.collection('upload_post_execucoes_i166').orderBy('__name__').limit(cfg.limiteJobsPorTick);if(anterior.cursor)q=q.startAfter(anterior.cursor);const pagina=await q.get(),resultados=[];
 for(const s of pagina.docs){const j={...s.data(),id:s.id};if(cfg.pausado===true&&['pendente','reservada','falha_antes_envio'].includes(j.estado)){resultados.push({jobId:j.id,novosEnviosPausados:true,nenhumPost:true});continue;}if(j.canonico?.estado==='confirmado'){resultados.push({jobId:j.id,concluido:true});continue;}
  if(j.canonico?.estado==='precisa_conciliar'){resultados.push({jobId:j.id,precisaConciliar:true,nenhumRetryAutomatico:true});continue;}
  if(j.estado==='agendamento_conferido'){resultados.push({jobId:j.id,canonico:await concluirCanonicoUploadPostI166(db,j.id,{agora})});continue;}
  let conta=null;try{conta=await reservarConta(db,j,cfg,agora);if(!conta){resultados.push({jobId:j.id,aguardaConta:true});continue;}
   const passo=await executarPassoUploadPostI166(db,j.id,{workerId:'tick_i165_upload_post',adaptador,resolverVideo,lerDependenciasTx:lerDependenciasUploadPostTxI166,agora:()=>agora,leaseMs:cfg.leaseContaMs,aguardarMs:1000});
   const atual=(await s.ref.get()).data();let canonico=null;if(atual?.estado==='agendamento_conferido')canonico=await concluirCanonicoUploadPostI166(db,j.id,{agora});resultados.push({...passo,canonico});
  }catch(e){const impedimentoRegistrado=await registrarImpedimentoAntesEnvio(db,j.id,e,agora);resultados.push({jobId:j.id,codigo:e.code||e.codigo||'i166/falha',mensagem:String(e.message).slice(0,500),impedimentoRegistrado,nenhumRetryCego:true});}finally{await liberarConta(db,conta);}
 }
 await cr.set({cursor:pagina.size===cfg.limiteJobsPorTick?pagina.docs.at(-1).id:'',em:agora.toISOString()},{merge:true});return {ativa:true,resultados};
}
export function dependenciasRuntimeUploadPostI166(db){
 // No credential or service is created here. Deployment configuration is an explicit separate capability.
 if(process.env.GET_I166_UPLOAD_POST_ENABLED!=='true')return null;
 return {adaptador:criarAdaptadorUploadPost({obterToken:async()=>{const key=process.env.GET_I166_UPLOAD_POST_API_KEY;exigirUploadPostI166(typeof key==='string'&&key.length>0,'credencial','O transporte externo ainda não tem credencial privada configurada.');return key;},fetchImpl:(...a)=>fetch(...a)}),resolverVideo:m=>resolverVideoUploadPostI166(db,m)};
}
