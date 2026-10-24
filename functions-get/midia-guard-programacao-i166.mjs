import {assinaturaEditorialUploadPostI166} from './upload-post-pacote.mjs';
import {identidadePacoteMidiaI166} from './midia-identidade-i166.mjs';
import {legendaUtilizavelI79} from './lib/gs-legenda-qualidade-i79.mjs';
const need=(v,c,m)=>{if(!v)throw Object.assign(Error(m),{code:'midia/'+c});};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,180}$/u.test(v);
const current=s=>s.exists?{...s.data(),id:s.id}:null;

// Called only inside the same agendar transaction. This helper does not call ler_midia,
// exigirProgramacao or any dispatcher; it cannot recursively authorize itself.
export async function exigirPacoteMidiaManualTxI166(db,tx,fontes){
 const p=fontes.post,v=fontes.video;
 if(!v)return {aplicavel:false,motivo:'postagem_sem_video',snapshot:null};
 const ptr=await tx.get(db.doc('midias_videos_i166/'+v.id));
 if(!ptr.exists)return {aplicavel:false,motivo:'legado_sem_manifesto',snapshot:null};
 const manifestoId=ptr.data()?.manifestoId;
 need(id(manifestoId),'ponteiro','O arquivo desta peça precisa ser conferido. A data foi preservada.');
 const pacoteId=p.uploadPostI166?.pacoteId||identidadePacoteMidiaI166(p.id);
 need(id(pacoteId),'pacote','Confira o pacote físico desta peça.');
 const [ms,ps]=await Promise.all([tx.get(db.doc('midias_manifestos_i166/'+manifestoId)),tx.get(db.doc('upload_post_pacotes_i166/'+pacoteId))]);
 const m=current(ms),pacote=current(ps),a=pacote?.aprovacao,l=pacote?.legendas?.instagram;
 need(m&&m.id===manifestoId&&m.videoId===v.id&&(!m.postagemId||m.postagemId===p.id)&&m.cliente===p.cliente&&(m.empresaOtavio||'')===(p.empresaOtavio||''),'origem','O arquivo preservado não corresponde a esta mesma peça e empresa.');
 need(m.imutavel===true&&m.legivel===true&&m.verificadoPeloServidor===true&&/^[a-f0-9]{64}$/.test(m.sha256||'')&&/^\d+$/.test(m.generation||'')&&Number.isSafeInteger(m.bytes)&&m.bytes>0&&typeof m.storageRef?.bucket==='string'&&typeof m.storageRef?.object==='string','manifesto','O arquivo final ainda precisa ser preservado e verificado.');
 need(pacote&&pacote.postagemId===p.id&&pacote.videoId===v.id&&pacote.cliente===p.cliente&&(pacote.empresaOtavio||'')===(p.empresaOtavio||'')&&pacote.midiaManifestoId===m.id,'pacote','Amanda precisa conferir o arquivo e a legenda atuais antes de agendar.');
 need(a&&['Amanda','Chris'].includes(a.por)&&a.midiaManifestoId===m.id&&a.midiaSha256===m.sha256&&a.midiaGeneration===m.generation&&Number.isFinite(Date.parse(a.em))&&Date.parse(a.em)>Date.parse(m.verificadoEm),'aprovacao','Amanda precisa aprovar esta versão do arquivo antes de agendar.');
 need(legendaUtilizavelI79(p.legenda)&&l?.texto===p.legenda&&['Amanda','Chris'].includes(l?.aprovadaPor)&&Number.isFinite(Date.parse(l?.aprovadaEm))&&Date.parse(l.aprovadaEm)<=Date.parse(a.em),'legenda','A legenda mudou ou está pendente. Amanda precisa conferir o pacote atual; seu texto foi preservado.');
 need(pacote.formato==='REELS'&&pacote.capa?.midiaSha256===m.sha256&&pacote.capa?.midiaGeneration===m.generation&&Number.isSafeInteger(pacote.capa?.thumb_offset)&&pacote.capa.thumb_offset>=0,'capa','Confira a capa desta mesma versão do arquivo.');
 need(a.assinaturaEditorial===assinaturaEditorialUploadPostI166({fontes:{post:p,video:v},pacote:{...pacote,midia:m},rede:'instagram'}),'versao','O arquivo, a legenda ou a capa mudou depois da aprovação. Amanda precisa conferir a versão atual.');
 return {aplicavel:true,snapshot:{schema:1,videoId:v.id,postagemId:p.id,pacoteId:pacote.id,pacoteRevisao:pacote.revisao||null,manifestoId:m.id,sha256:m.sha256,generation:m.generation,bytes:m.bytes,mimeType:m.mimeType,storageRef:{...m.storageRef},assinaturaEditorial:a.assinaturaEditorial,aprovadoEm:a.em,aprovadoPor:a.por}};
}

