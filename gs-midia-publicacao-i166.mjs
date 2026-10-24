const allowedURL=value=>{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='storage.googleapis.com'||u.username||u.password||u.port)throw Error('Sessao de armazenamento invalida.');return value;};
function put(url,body,range,progress,timeout){return new Promise((resolve,reject)=>{
 const x=new XMLHttpRequest();x.open('PUT',allowedURL(url));x.timeout=timeout;x.setRequestHeader('Content-Range',range);if(body?.type)x.setRequestHeader('Content-Type',body.type);
 x.upload.onprogress=e=>{if(e.lengthComputable)progress?.(e.loaded);};
 x.onload=()=>resolve({status:x.status,range:x.getResponseHeader('Range')});
 x.onerror=()=>reject(Error('A conexao caiu. O arquivo e a sessao continuam nesta tela para retomar.'));x.ontimeout=()=>reject(Error('O envio demorou. Confira e retome a mesma sessao.'));x.send(body);
});}
async function upload(file,session,progress,timeout){
 const current=await put(session.uploadUrl,null,'bytes */'+file.size,null,timeout);
 if([200,201].includes(current.status)){progress(file.size);return;}
 if(current.status!==308)throw Error('Nao consegui consultar a mesma sessao de upload.');
 let offset=current.range?Number(/^bytes=0-(\d+)$/.exec(current.range)?.[1])+1:0;
 if(!Number.isSafeInteger(offset)||offset<0||offset>=file.size)throw Error('O armazenamento nao confirmou a parte recebida. Confira CORS/Range e retome sem criar outro arquivo.');
 const response=await put(session.uploadUrl,file.slice(offset,file.size,file.type),'bytes '+offset+'-'+(file.size-1)+'/'+file.size,n=>progress(offset+n),timeout);
 if(![200,201].includes(response.status))throw Error('O upload nao foi confirmado por inteiro. Retome a mesma sessao antes de finalizar.');progress(file.size);
}
export function montarMidiaPublicacaoI166(root,{videoId,contexto,preparar,finalizar,preview,aoFinalizar=()=>{},maxBytes,mimeTypes=['video/mp4'],uploadTimeoutMs=120000}={}){
 if(!root||!videoId||typeof contexto!=='function'||typeof preparar!=='function'||typeof finalizar!=='function'||typeof preview!=='function'||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('Configure a ficha e os callbacks de midia.');
 const doc=root.ownerDocument,box=doc.createElement('section');box.innerHTML='<label>Arquivo final <input type="file" accept="video/mp4,video/quicktime" data-file></label><video controls playsinline data-video style="display:block;max-width:100%;max-height:320px"></video><label>Quadro da capa em milissegundos <input type="number" min="0" step="1" data-frame placeholder="Escolha o quadro"></label><button type="button" data-capture>Usar o quadro atual</button><progress data-progress value="0" max="100"></progress><p role="status" data-status>Falta preservar o arquivo final.</p><button type="button" data-upload>Enviar arquivo</button><button type="button" data-final disabled>Conferir e preservar</button>';
 root.append(box);const el=s=>box.querySelector(s),input=el('[data-file]'),video=el('[data-video]'),frame=el('[data-frame]'),status=el('[data-status]'),bar=el('[data-progress]'),send=el('[data-upload]'),finish=el('[data-final]'),capture=el('[data-capture]');
 let selected=null,session=null,objectURL=null,manifest=null,busy=false,complete=false,live=true,intentUpload=null;const identity=JSON.stringify(contexto());
 const current=()=>live&&box.isConnected&&JSON.stringify(contexto())===identity;
 function requireCurrent(){if(!current())throw Error('O acesso mudou. Reabra esta ficha no perfil original.');}
 function state(text){if(current())status.textContent=text;}
 function lock(value){busy=value;input.disabled=send.disabled=frame.disabled=capture.disabled=value;finish.disabled=value||!complete;}
 input.onchange=()=>{if(busy)return;const candidate=input.files?.[0];if(!candidate)return;
  if(!mimeTypes.includes(candidate.type)||candidate.size<1||candidate.size>maxBytes){state('Confira o tamanho e o formato permitido. O arquivo anterior foi preservado nesta tela.');return;}
  if(objectURL)URL.revokeObjectURL(objectURL);selected=candidate;intentUpload=crypto.randomUUID();objectURL=URL.createObjectURL(candidate);video.src=objectURL;session=null;manifest=null;complete=false;frame.value='';bar.value=0;finish.disabled=true;send.textContent='Enviar arquivo';state('Previa local. Falta enviar e preservar esta versao no servidor.');
 };
 capture.onclick=()=>{try{requireCurrent();if(!selected||!Number.isFinite(video.currentTime))throw Error('Abra a previa e escolha o quadro.');frame.value=String(Math.round(video.currentTime*1000));state('Quadro escolhido. A capa continua vinculada a esta versao do video.');}catch(e){state(e.message);}};
 send.onclick=async()=>{if(busy)return;try{requireCurrent();if(!selected)throw Error('Escolha o arquivo final.');lock(true);state(session?'Retomando a mesma sessao...':'Preparando upload privado...');
   if(!session)session=await preparar({videoId,operacaoId:intentUpload,bytes:selected.size,mimeType:selected.type,nomeOriginal:selected.name});requireCurrent();
   if(!session.uploadRecebido)await upload(selected,session,n=>{if(current())bar.value=Math.min(100,n/selected.size*100);},uploadTimeoutMs);requireCurrent();complete=true;state('Upload recebido. Confira o quadro e preserve esta versao.');
  }catch(e){state(e.message);send.textContent='Retomar upload';}finally{lock(false);}};
 finish.onclick=async()=>{if(busy)return;try{requireCurrent();const ms=Number(frame.value);if(!complete||frame.value===''||!Number.isSafeInteger(ms)||ms<0||Number.isFinite(video.duration)&&ms>video.duration*1000)throw Error('Escolha explicitamente um quadro valido desta versao.');lock(true);state('Relendo os bytes e preservando a versao...');
   manifest=await finalizar({uploadId:session.uploadId,thumbOffsetMs:ms});requireCurrent();await aoFinalizar(manifest);requireCurrent();state('Arquivo preservado. A aprovacao desta versao ainda e um passo separado.');
   try{const signed=await preview({manifestoId:manifest.id});requireCurrent();video.src=signed.url;state('Previa do arquivo preservado. A aprovacao desta versao continua separada.');}catch(e){state('Arquivo preservado; previa assinada indisponivel: '+e.message);}
  }catch(e){state(e.message);}finally{lock(false);}};
 return {element:box,estado:()=>({uploadId:session?.uploadId||null,manifestoId:manifest?.id||null,completo:complete,faltaPreservar:!manifest,aprovacao:'pendente'}),destroy(){live=false;if(objectURL)URL.revokeObjectURL(objectURL);box.remove();}};
}
