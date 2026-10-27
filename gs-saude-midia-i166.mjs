// A manual health check in the existing management area. No background send or new navigation.
export function montarSaudeMidiaI166(root,{chamar,contexto}={}){
 if(!root||typeof chamar!=='function'||typeof contexto!=='function')throw Error('Abra a conferência pelo seu acesso.');
 const doc=root.ownerDocument,box=doc.createElement('section');box.className='card';
 box.innerHTML='<h2>Envio de arquivos</h2><p class="desc">Confere o armazenamento e abre um pequeno vídeo interno, sem usar conteúdo de cliente nem enviar nada ao Instagram.</p><button type="button" class="btn secondary" data-conferir>Conferir envio de arquivos</button><p role="status" data-status>A conferência só começa quando você clicar.</p><video controls playsinline preload="metadata" hidden data-video style="max-width:100%;max-height:240px;margin-top:12px"></video><details hidden data-details><summary>Detalhes da conferência</summary><pre data-proof style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></details>';
 root.append(box);const button=box.querySelector('[data-conferir]'),status=box.querySelector('[data-status]'),video=box.querySelector('[data-video]'),proof=box.querySelector('[data-proof]'),details=box.querySelector('[data-details]');
 const original=JSON.stringify(contexto());let live=true,busy=false,resultado=null;
 const current=()=>live&&box.isConnected&&JSON.stringify(contexto())===original;
 const say=s=>{if(current())status.textContent=s;};
 const allowedURL=value=>{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='storage.googleapis.com'||u.username||u.password||u.port)throw Error('O servidor não confirmou a prévia privada.');return value;};
 video.onloadedmetadata=()=>{if(!current())return;const ok=resultado&&video.videoWidth>0&&video.videoHeight>0&&Number.isFinite(video.duration)&&video.duration>0;if(!ok){say('O servidor respondeu, mas o vídeo ainda precisa de conferência neste navegador.');return;}say('Arquivo e prévia conferidos neste navegador. Nenhum conteúdo de cliente foi alterado.');};
 video.onerror=()=>say('O arquivo foi conferido no servidor, mas a prévia não carregou aqui. Clique em conferir para abrir uma nova prévia temporária.');
 button.onclick=async()=>{
  if(busy||!current())return;busy=true;button.disabled=true;resultado=null;video.pause();video.removeAttribute('src');video.hidden=true;details.hidden=true;say('Relendo o arquivo interno e conferindo a prévia no servidor…');
  try{
   const r=await chamar('conferir_saude_midia_i166');if(!current())return;
   if(r?.schema!==1||r.estado!=='conferido'||r.arquivoTecnico!==true||r.nenhumaEscrita!==true||r.nenhumConteudoCliente!==true||r.nenhumEnvioInstagram!==true||r.leituraIntegral!==true||r.mesmaGeneration!==true||!Number.isSafeInteger(r.bytes)||r.bytes<12||r.mimeType!=='video/mp4'||!/^[a-f0-9]{64}$/.test(r.sha256)||!/^\d+$/.test(r.generation)||!Number.isFinite(Date.parse(r.expiraEm))||Date.parse(r.expiraEm)<=Date.now())throw Error('O retorno da conferência precisa ser verificado. Nenhuma conclusão foi presumida.');
   const url=allowedURL(r.url);if(new URL(url).searchParams.get('generation')!==r.generation)throw Error('A prévia pertence a outra versão.');
   resultado=r;proof.textContent=JSON.stringify({conferidoEm:r.conferidoEm,bytes:r.bytes,sha256:r.sha256,generation:r.generation,expiraEm:r.expiraEm,leituraIntegral:r.leituraIntegral,nenhumaEscrita:r.nenhumaEscrita},null,2);details.hidden=false;
   video.hidden=false;video.src=url;say('Servidor conferido. Carregando a prévia temporária deste mesmo arquivo…');
  }catch(e){say(e.message||'Não consegui conferir os arquivos agora. Nenhum conteúdo de cliente foi alterado.');}
  finally{busy=false;if(current())button.disabled=false;}
 };
 return {element:box,destroy(){live=false;resultado=null;video.pause();video.removeAttribute('src');box.remove();}};
}
