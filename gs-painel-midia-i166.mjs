import {montarMidiaPublicacaoI166} from './gs-midia-publicacao-i166.mjs';

// Mount inside the existing delivery/review card. No new menu, copied caption or background sender.
export function montarPainelMidiaI166(root,{videoId,chamar,contexto,maxBytes=128*1024*1024,mimeTypes=['video/mp4','video/quicktime']}={}){
 if(!root||!videoId||typeof chamar!=='function'||typeof contexto!=='function')throw Error('Configure a mesma ficha e o acesso atual.');
 const doc=root.ownerDocument,box=doc.createElement('section');box.className='gs-midia-i166';
 box.innerHTML='<style>.gs-midia-i166{border:1px solid #484848;border-radius:16px;padding:18px;margin:16px 0;background:#202226;color:inherit}.gs-midia-i166 h3{margin:0 0 10px}.gs-midia-i166 button{min-height:44px;margin:6px 6px 6px 0;padding:10px 14px;border-radius:10px;cursor:pointer}.gs-midia-i166 button:disabled{opacity:.5;cursor:default}.gs-midia-i166 label{display:block;margin:12px 0}.gs-midia-i166 input[type=number],.gs-midia-i166 input[type=text]{display:block;width:100%;box-sizing:border-box;margin-top:6px}.gs-midia-i166 video{display:block;max-width:100%;max-height:380px;margin:12px 0}.gs-midia-i166 pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto;padding:12px;background:#161719;border-radius:10px}.gs-midia-i166 [data-approved]{color:#78d4a0}</style><h3>Arquivo e legenda desta peça</h3><p data-status role="status">Conferindo a versão atual...</p><p data-summary></p><div data-upload-slot></div><div data-review hidden><button type="button" data-preview>Abrir prévia do arquivo preservado</button><video controls playsinline preload="metadata" data-video></video><p>Legenda atual da postagem</p><pre data-caption></pre><div data-manager hidden><label>Quadro da capa em milissegundos<input data-frame type="number" min="0" step="1"></label><button type="button" data-frame-now>Usar o quadro atual</button><label>Colaboradores no Instagram (se houver)<input type="text" data-collabs placeholder="usuario1, usuario2"></label><label><input type="checkbox" data-confirm> Conferi o vídeo, a capa e a legenda desta versão.</label><button type="button" data-prepare>Conferir pacote</button><button type="button" data-approve disabled>Aprovar esta versão</button><p data-approved></p></div></div>';
 root.append(box);const el=s=>box.querySelector(s),status=el('[data-status]'),player=el('[data-video]'),frame=el('[data-frame]'),collabs=el('[data-collabs]'),confirm=el('[data-confirm]'),approve=el('[data-approve]');
 const tamanhoArquivo=n=>n<1024?n+' B':n<1024*1024?(n/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' KB':(n/1024/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB';
 const identity=JSON.stringify(contexto());let live=true,state=null,review=null,preview=null,approvalId=null,busy=false,uploader=null,loaded=false;
 const current=()=>live&&box.isConnected&&JSON.stringify(contexto())===identity;
 function requireCurrent(){if(!current())throw Error('O acesso mudou. Reabra a ficha pelo perfil original.');}
 function say(text){if(current())status.textContent=text;}
 async function call(acao,data={}){requireCurrent();const answer=await chamar({acao,videoId,...data});requireCurrent();return answer;}
 function controls(){const may=state?.capacidades.aprovar===true;approve.disabled=busy||!may||!review||!preview||!loaded||!confirm.checked;}
 function choices(){const x=collabs.value.trim();return {thumbOffsetMs:Number(frame.value),collaborators:x?x.split(',').map(v=>v.trim().replace(/^@/,'')):[]};}
 function invalidate(){review=null;approvalId=null;controls();}
 function busyWith(v){busy=v;for(const x of box.querySelectorAll('button,input')){if(!x.closest('[data-upload-slot]'))x.disabled=v;}controls();}
 async function refresh(){
  const next=await call('ler_midia_i166');state=next;preview=null;review=null;approvalId=null;loaded=false;confirm.checked=false;player.removeAttribute('src');
  el('[data-summary]').textContent=next.manifesto?'Versão preservada · '+tamanhoArquivo(next.manifesto.bytes)+' · '+(next.aprovada?'aprovada':'aguardando conferência'):'O arquivo final ainda precisa ser preservado.';
  say(next.pendencia||'Esta versão está aprovada. A Cecília recebe este mesmo arquivo e esta mesma legenda.');
  el('[data-caption]').textContent=next.legenda||'A legenda ficará disponível quando a postagem desta peça existir.';
  el('[data-review]').hidden=!next.manifesto||!next.capacidades.preview;el('[data-manager]').hidden=!next.capacidades.aprovar;
  if(next.manifesto)frame.value=String(next.manifesto.thumbOffsetMs??0);
  collabs.value=(next.collaborators||[]).join(', ');el('[data-approved]').textContent=next.aprovada?'Versão aprovada. Nenhum envio externo foi feito por esta ação.':'';
  if(next.capacidades.upload&&!uploader)uploader=montarMidiaPublicacaoI166(el('[data-upload-slot]'),{videoId,contexto,maxBytes,mimeTypes,
   preparar:d=>call('preparar_midia_i166',d),finalizar:d=>call('finalizar_midia_i166',d),
   preview:d=>call('preview_midia_i166',d),aoFinalizar:()=>refresh()});
  controls();return next;
 }
 player.onloadedmetadata=()=>{loaded=true;controls();};
 player.onerror=()=>{loaded=false;review=null;controls();say('A prévia não carregou. Abra uma nova prévia; a aprovação continua bloqueada.');};
 el('[data-preview]').onclick=async()=>{if(busy)return;try{busyWith(true);const m=state?.manifesto;if(!m)throw Error('Preserve primeiro o arquivo final.');preview=await call('preview_midia_i166',{manifestoId:m.id});loaded=false;confirm.checked=false;review=null;player.src=preview.url;say('Prévia temporária da versão preservada. Confira o vídeo e a legenda antes de aprovar.');}catch(e){say(e.message);}finally{busyWith(false);}};
 el('[data-frame-now]').onclick=()=>{try{requireCurrent();if(!loaded||!Number.isFinite(player.currentTime))throw Error('Abra a prévia desta versão primeiro.');frame.value=String(Math.round(player.currentTime*1000));invalidate();}catch(e){say(e.message);}};
 frame.oninput=collabs.oninput=invalidate;confirm.onchange=controls;
 el('[data-prepare]').onclick=async()=>{if(busy)return;try{if(!preview||!loaded||!confirm.checked)throw Error('Abra a prévia e marque que conferiu esta versão.');if(frame.value==='')throw Error('Escolha o quadro da capa.');busyWith(true);review=await call('preparar_aprovacao_midia_i166',choices());approvalId=crypto.randomUUID();el('[data-caption]').textContent=review.legenda;confirm.checked=false;say('Pacote atualizado na tela. Confira a legenda mostrada agora e marque novamente que conferiu esta versão para aprovar.');}catch(e){say(e.message);}finally{busyWith(false);}};
 approve.onclick=async()=>{if(busy)return;try{if(!review||!preview||!confirm.checked)throw Error('Confira esta versão antes de aprovar.');busyWith(true);const result=await call('aprovar_midia_i166',{...choices(),assinaturaEsperada:review.assinaturaEsperada,previewToken:preview.previewToken,conferiVideo:true,operacaoId:approvalId});say(result.estado==='recuperada'?'A mesma aprovação já estava salva.':'Versão aprovada. Nenhum envio externo foi feito.');await refresh();}catch(e){say(e.message+' A tentativa permanece nesta tela; confira e retome sem criar outra aprovação.');}finally{busyWith(false);}};
 const ready=refresh().catch(e=>say(e.message));
 return {element:box,ready,atualizar:refresh,destroy(){live=false;uploader?.destroy();player.pause();player.removeAttribute('src');box.remove();}};
}

