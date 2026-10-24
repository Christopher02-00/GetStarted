import {createHash,randomUUID} from 'node:crypto';

const fail=(code,message)=>Object.assign(Error(message),{code:'midia/'+code});
const need=(value,code,message)=>{if(!value)throw fail(code,message);};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(v);
const digits=v=>typeof v==='string'&&/^\d+$/.test(v);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function options(d){
 const c=d.config;
 need(d.storage?.bucket&&d.db?.doc&&d.db?.runTransaction&&typeof d.autorizar==='function','config','Configure armazenamento, banco e autorizacao de servidor.');
 need(c&&typeof c.bucket==='string'&&/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(c.bucket)&&/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(c.prefix),'config','Configure bucket e prefixo privados.');
 need(Number.isSafeInteger(c.maxBytes)&&c.maxBytes>0&&Array.isArray(c.mimeTypes)&&c.mimeTypes.length>0&&c.mimeTypes.every(x=>['video/mp4','video/quicktime'].includes(x)),'config','Configure limites e formatos de video.');
 need(Number.isSafeInteger(c.maxThumbOffsetMs)&&c.maxThumbOffsetMs>=0&&Number.isSafeInteger(c.hashTimeoutMs)&&c.hashTimeoutMs>0&&Number.isSafeInteger(c.previewTtlSeconds)&&c.previewTtlSeconds>=1&&c.previewTtlSeconds<=900,'config','Configure limites de verificacao e previa curta.');
 need(typeof c.originBrowser==='string'&&new URL(c.originBrowser).origin===c.originBrowser&&new URL(c.originBrowser).protocol==='https:','config','Configure a origem HTTPS autorizada do navegador.');
 return c;
}
const time=d=>(d.agora?d.agora():new Date()).toISOString();
async function actor(d,ctx,videoId,acao,tx){
 need(id(videoId),'video','Confirme o video fisico.');
 const a=await d.autorizar(ctx,{videoId,acao,tx});
 need(a&&typeof a.uid==='string'&&a.uid.length>0&&a.videoId===videoId&&id(a.cliente)&&typeof(a.empresaOtavio||'')==='string','auth','O servidor precisa confirmar pessoa e origem atuais.');
 return {uid:a.uid,videoId,cliente:a.cliente,empresaOtavio:a.empresaOtavio||'',postagemId:a.postagemId||''};
}
function identity(a,r,owner=false){
 need(a.videoId===r.videoId&&a.cliente===r.cliente&&a.empresaOtavio===r.empresaOtavio&&(!owner||a.uid===r.ownerUid),'origem','A pessoa ou a origem deste arquivo mudou.');
}
function uri(value){
 let u;try{u=new URL(value);}catch{throw fail('upload_uri','O armazenamento nao confirmou uma sessao valida.');}
 need(u.protocol==='https:'&&u.hostname==='storage.googleapis.com'&&!u.username&&!u.password&&!u.port,'upload_uri','A sessao de upload precisa pertencer ao armazenamento autorizado.');
 return value;
}
const uploadRef=(d,x)=>d.db.doc('midias_uploads_i166/'+x);
const assetRef=(d,x)=>d.db.doc('midias_manifestos_i166/'+x);
const pointerRef=(d,x)=>d.db.doc('midias_videos_i166/'+x);
function file(d,c,r,generation){
 need(r.bucket===c.bucket&&r.object===c.prefix+'/'+r.videoId+'/'+r.id,'storage_ref','O objeto nao corresponde a intencao original.');
 return d.storage.bucket(c.bucket).file(r.object,generation?{generation}:undefined);
}
function metadata(m,r){
 need(digits(String(m.generation||''))&&String(m.size)===String(r.bytes)&&m.contentType===r.mimeType,'incompleto','O upload ainda nao foi confirmado com tamanho e formato completos.');
 const x=m.metadata||{};
 need(x.ownerUid===r.ownerUid&&x.videoId===r.videoId&&x.uploadId===r.id&&x.expectedBytes===String(r.bytes)&&x.expectedMime===r.mimeType,'metadata','O arquivo nao confirma a intencao e o dono originais.');
 return String(m.generation);
}
export async function prepararUploadResumivelI166(d,ctx,input){
 const c=options(d),a=await actor(d,ctx,input?.videoId,'preparar');
 need(Number.isSafeInteger(input.bytes)&&input.bytes>0&&input.bytes<=c.maxBytes&&c.mimeTypes.includes(input.mimeType),'arquivo','Confira tamanho e formato do arquivo.');
 const uuid=input.operacaoId||(d.uuid||randomUUID)();need(/^[a-f0-9-]{36}$/.test(uuid),'config','O identificador de upload precisa ser unico.');
 const r={schema:1,id:uuid,...a,ownerUid:a.uid,bucket:c.bucket,object:c.prefix+'/'+a.videoId+'/'+uuid,bytes:input.bytes,mimeType:input.mimeType,nomeOriginal:String(input.nomeOriginal||'').slice(0,250),estado:'preparando',criadoEm:time(d),sessaoLease:randomUUID(),sessaoLeaseAte:new Date(Date.parse(time(d))+60000).toISOString()};
 const recover=await d.db.runTransaction(async tx=>{identity(await actor(d,ctx,a.videoId,'preparar',tx),r,true);const [old,ptr]=await Promise.all([tx.get(uploadRef(d,uuid)),tx.get(pointerRef(d,a.videoId))]);
  if(old.exists){const prior=old.data();identity(a,prior,true);need(prior.bytes===r.bytes&&prior.mimeType===r.mimeType,'colisao','Esta tentativa pertence a outro arquivo.');if(prior.uploadUrl){uri(prior.uploadUrl);return prior;}need(!prior.sessaoLeaseAte||Date.parse(prior.sessaoLeaseAte)<=Date.parse(time(d)),'sessao_em_preparo','A mesma sessao ainda esta sendo preparada. Confira esta tentativa novamente em um minuto.');r.anteriorId=prior.anteriorId||null;tx.update(uploadRef(d,uuid),{estado:'preparando',sessaoLease:r.sessaoLease,sessaoLeaseAte:r.sessaoLeaseAte});return {retomarPreparacao:true};}
  r.anteriorId=ptr.data()?.manifestoId||null;tx.set(uploadRef(d,uuid),r);return null;
 });
 if(recover&&!recover.retomarPreparacao)return {uploadId:recover.id,uploadUrl:recover.uploadUrl,bytes:recover.bytes,mimeType:recover.mimeType,anteriorId:recover.anteriorId,estado:recover.estado,recuperada:true};
 let uploadUrl;
 if(recover?.retomarPreparacao){
  try{const [m]=await file(d,c,r).getMetadata();metadata(m,r);await d.db.runTransaction(async tx=>{const u=await tx.get(uploadRef(d,uuid));need(u.data()?.sessaoLease===r.sessaoLease,'sessao_avancou','Outra retomada assumiu esta tentativa. Confira a mesma sessao.');tx.update(uploadRef(d,uuid),{estado:'upload_recebido'});});return {uploadId:r.id,bytes:r.bytes,mimeType:r.mimeType,anteriorId:r.anteriorId,uploadRecebido:true,recuperada:true};}
  catch(e){if(e.code!==404)throw e;}
 }
 try{[uploadUrl]=await file(d,c,r).createResumableUpload({origin:c.originBrowser,preconditionOpts:{ifGenerationMatch:0},metadata:{contentLength:r.bytes,contentType:r.mimeType,metadata:{ownerUid:r.ownerUid,videoId:r.videoId,uploadId:r.id,expectedBytes:String(r.bytes),expectedMime:r.mimeType}}});uri(uploadUrl);}
 catch{await d.db.runTransaction(async tx=>{const u=await tx.get(uploadRef(d,uuid));if(u.data()?.sessaoLease===r.sessaoLease)tx.update(uploadRef(d,uuid),{estado:'sessao_nao_confirmada',sessaoLeaseAte:time(d)});});throw fail('sessao','Nao consegui confirmar a sessao de upload. Retome esta mesma tentativa. Nenhum arquivo foi liberado.');}
 await d.db.runTransaction(async tx=>{const u=await tx.get(uploadRef(d,uuid));need(u.data()?.sessaoLease===r.sessaoLease,'sessao_avancou','Outra retomada assumiu esta tentativa. Confira a mesma sessao.');tx.update(uploadRef(d,uuid),{estado:'aguardando_upload',uploadUrl});});
 return {uploadId:r.id,uploadUrl,bytes:r.bytes,mimeType:r.mimeType,anteriorId:r.anteriorId,estado:'falta_preservar'};
}
async function hashStream(stream,bytes,timeout){
 let n=0,head=Buffer.alloc(0),timedOut=false;const h=createHash('sha256');
 const timer=setTimeout(()=>{timedOut=true;stream.destroy(fail('timeout','A verificacao do arquivo excedeu o tempo.'));},timeout);timer.unref?.();
 try{for await(const part of stream){const b=Buffer.from(part);n+=b.length;need(n<=bytes,'tamanho','O arquivo ultrapassou o tamanho declarado.');if(head.length<32)head=Buffer.concat([head,b.subarray(0,32-head.length)]);h.update(b);}need(!timedOut&&n===bytes,'incompleto','O arquivo ainda nao pode ser relido por inteiro.');need(head.length>=12&&head.toString('ascii',4,8)==='ftyp','container','O arquivo nao confirmou um container MP4/MOV legivel.');return h.digest('hex');}
 finally{clearTimeout(timer);if(!stream.destroyed)stream.destroy();}
}
export async function finalizarI166(d,ctx,input){
 const c=options(d);need(typeof input?.uploadId==='string'&&/^[a-f0-9-]{36}$/.test(input.uploadId),'upload','Confirme a intencao do arquivo.');
 const snap=await uploadRef(d,input.uploadId).get();need(snap.exists,'upload','A intencao de upload nao foi encontrada.');const r=snap.data();identity(await actor(d,ctx,r.videoId,'finalizar'),r,true);
 need(Number.isSafeInteger(input.thumbOffsetMs)&&input.thumbOffsetMs>=0&&input.thumbOffsetMs<=c.maxThumbOffsetMs,'capa','Escolha explicitamente o quadro da capa em milissegundos.');
 const target=file(d,c,r);let before;try{[before]=await target.getMetadata();}catch{throw fail('incompleto','O upload ainda nao foi concluido no armazenamento.');}const generation=metadata(before,r);
 const pinned=file(d,c,r,generation),sha256=await hashStream(pinned.createReadStream({validation:'crc32c'}),r.bytes,c.hashTimeoutMs);
 const [after]=await target.getMetadata();need(metadata(after,r)===generation,'generation','O objeto mudou durante a verificacao.');
 const manifest={schema:1,id:r.id,videoId:r.videoId,postagemId:r.postagemId,cliente:r.cliente,empresaOtavio:r.empresaOtavio,ownerUid:r.ownerUid,sha256,generation,bytes:r.bytes,mimeType:r.mimeType,storageRef:{bucket:r.bucket,object:r.object},thumbOffsetMs:input.thumbOffsetMs,anteriorId:r.anteriorId,imutavel:true,legivel:true,verificadoPeloServidor:true,verificadoEm:time(d),verificacaoConteudo:'stream_integral_e_container_ftyp',aprovacao:'pendente'};
 return d.db.runTransaction(async tx=>{
  identity(await actor(d,ctx,r.videoId,'finalizar',tx),r,true);const [us,as,ps]=await Promise.all([tx.get(uploadRef(d,r.id)),tx.get(assetRef(d,r.id)),tx.get(pointerRef(d,r.videoId))]);need(us.exists,'upload','A intencao mudou.');
  const live=us.data();for(const k of ['ownerUid','videoId','cliente','empresaOtavio','bucket','object','bytes','mimeType','anteriorId'])need(same(live[k],r[k]),'upload_mudou','A intencao do arquivo mudou.');
  if(as.exists){const old=as.data();need(old.sha256===sha256&&old.generation===generation&&old.thumbOffsetMs===input.thumbOffsetMs,'manifesto','Um manifesto finalizado nao pode ser alterado.');need(ps.data()?.manifestoId===old.id,'versao_avancou','Outra versao tornou-se atual. Abra a versao atual, sem substituir a nova por este retorno.');return old;}
  need((ps.data()?.manifestoId||null)===r.anteriorId,'versao_avancou','Outra versao foi preservada depois de iniciar este upload. Reconfira antes de substituir.');
  tx.set(assetRef(d,r.id),manifest);tx.set(pointerRef(d,r.videoId),{schema:1,videoId:r.videoId,manifestoId:r.id,anteriorId:r.anteriorId,atualizadoEm:manifest.verificadoEm});tx.update(uploadRef(d,r.id),{estado:'preservado',manifestoId:r.id,generation,sha256,preservadoEm:manifest.verificadoEm});return manifest;
 });
}
export async function obterPreviewURLI166(d,ctx,{manifestoId}){
 const c=options(d);need(typeof manifestoId==='string'&&/^[a-f0-9-]{36}$/.test(manifestoId),'manifesto','Confirme o arquivo preservado.');const s=await assetRef(d,manifestoId).get();need(s.exists,'manifesto','O arquivo preservado nao foi encontrado.');const m=s.data();identity(await actor(d,ctx,m.videoId,'preview'),m);
 need(m.verificadoPeloServidor===true&&digits(m.generation),'manifesto','O arquivo precisa estar verificado antes da previa.');const expires=new Date(Date.parse(time(d))+c.previewTtlSeconds*1000);
 try{const [url]=await file(d,c,{...m,bucket:m.storageRef.bucket,object:m.storageRef.object},m.generation).getSignedUrl({version:'v4',action:'read',expires,queryParams:{generation:m.generation}});need(typeof url==='string'&&new URL(url).protocol==='https:','preview','O armazenamento nao confirmou uma previa HTTPS.');return {url,expiraEm:expires.toISOString(),manifestoId:m.id,generation:m.generation,temporaria:true};}
 catch{throw fail('preview_signing_config','O arquivo esta preservado, mas a assinatura da previa precisa ser configurada no servidor.');}
}
export function exigirAprovacaoAtivoI166(manifesto,aprovacao){
 need(manifesto?.verificadoPeloServidor===true&&manifesto.imutavel===true&&manifesto.legivel===true&&/^[a-f0-9]{64}$/.test(manifesto.sha256)&&digits(manifesto.generation),'manifesto','Confirme o arquivo preservado.');
 need(aprovacao?.midiaManifestoId===manifesto.id&&aprovacao.midiaSha256===manifesto.sha256&&aprovacao.midiaGeneration===manifesto.generation&&typeof aprovacao.aprovadoEm==='string'&&Number.isFinite(Date.parse(aprovacao.aprovadoEm)),'aprovacao','Esta versao do arquivo ainda precisa da aprovacao correspondente.');return true;
}
