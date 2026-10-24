import {createHash,randomUUID} from 'node:crypto';
import {identidadePacoteMidiaI166} from './midia-identidade-i166.mjs';
import {prepararUploadResumivelI166,finalizarI166,obterPreviewURLI166} from './midias-publicacao-i166.mjs';

// Application service. Auth/source helpers below are trusted imports supplied by the runtime adapter,
// never request data. No Instagram account, credential or external route is created here.
const fail=(code,message)=>Object.assign(Error(message),{code:'midia/'+code});
const need=(value,code,message)=>{if(!value)throw fail(code,message);};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,180}$/u.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/u.test(v);
const canonical=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
const current=s=>s.exists?{...s.data(),id:s.id}:null;
const managers=['Amanda','Chris'];
const canDeliver=(a,v)=>managers.includes(a.papel)||(v.editorAtribuido===a.papel&&['aguardando_edicao','em_correcao','correcao','aguardando_aprovacao'].includes(v.status));
const collaborators=x=>Array.isArray(x)&&x.every(v=>typeof v==='string'&&/^[A-Za-z0-9_][A-Za-z0-9_.]{0,29}$/u.test(v))&&new Set(x).size===x.length;
export const ACOES_MIDIA_I166=Object.freeze(['preparar_midia_i166','finalizar_midia_i166','ler_midia_i166','preview_midia_i166','preparar_aprovacao_midia_i166','aprovar_midia_i166']);
function validateDependencies(d){
 need(d?.db?.doc&&d.db?.runTransaction&&d.db?.collection&&d.storage?.bucket&&['identidadeToken','validarCadastro','clienteTx','assinaturaEditorial','legendaUtilizavel','programacaoAtiva'].every(k=>typeof d[k]==='function'),'config','Configure a autorização e as fontes físicas do arquivo.');
}
async function sources(d,tx,a,videoId,now){
 need(id(videoId),'video','Confira o vídeo desta ficha.');
 const [cad,vs,ptr,cfg]=await Promise.all([tx.get(d.db.doc('usuarios_equipe/'+a.email)),tx.get(d.db.doc('videos_producao/'+videoId)),tx.get(d.db.doc('midias_videos_i166/'+videoId)),tx.get(d.db.doc('programacao_config_i165/ativo'))]);
 d.validarCadastro(a,cad.data());const video=current(vs);need(video&&video.excluido!==true&&!video.arquivado,'video','A entrega atual não está disponível.');
 const cliente=await d.clienteTx(d.db,tx,video.cliente,now);need(cliente.clienteAtivo,'cliente','Confira se este cliente está ativo na operação.');
 const postagem=video.postagemId?current(await tx.get(d.db.doc('postagens/'+video.postagemId))):null;
 if(postagem)need(postagem.videoId===video.id&&postagem.cliente===video.cliente&&(postagem.empresaOtavio||'')===(video.empresaOtavio||''),'vinculo','Confira o vínculo da mesma peça e empresa.');
 const manifestId=ptr.data()?.manifestoId||null,manifest=manifestId?current(await tx.get(d.db.doc('midias_manifestos_i166/'+manifestId))):null;
 if(manifest)need(manifest.videoId===video.id&&manifest.cliente===video.cliente&&(manifest.empresaOtavio||'')===(video.empresaOtavio||''),'origem','O arquivo pertence a outra peça.');
 const packageId=postagem?.uploadPostI166?.pacoteId||(postagem?identidadePacoteMidiaI166(postagem.id):null);
 const pacote=packageId?current(await tx.get(d.db.doc('upload_post_pacotes_i166/'+packageId))):null;
 return {video,postagem,manifest,ponteiro:ptr.data()||null,packageId,pacote,programacaoLiberada:d.programacaoAtiva(cfg.data())&&cfg.data().habilidades?.programacao===true};
}
function sameApproval(d,s){
 const p=s.postagem,m=s.manifest,a=s.pacote?.aprovacao;
 if(!p||!m||!a||s.pacote.midiaManifestoId!==m.id||a.midiaManifestoId!==m.id||a.midiaSha256!==m.sha256||a.midiaGeneration!==m.generation)return false;
 return a.assinaturaEditorial===d.assinaturaEditorial({fontes:{post:p,video:s.video},pacote:{...s.pacote,midia:m},rede:'instagram'});
}
function requireRead(d,a,s){
 need(managers.includes(a.papel)||s.video.editorAtribuido===a.papel||(a.papel==='Cecília'&&sameApproval(d,s)),'papel','Este arquivo fica disponível para a pessoa responsável e a Amanda. A Cecília recebe a versão aprovada.');
}
function summary(d,a,s){
 const m=s.manifest;
 return {videoId:s.video.id,postagemId:s.postagem?.id||null,cliente:s.video.cliente,empresaOtavio:s.video.empresaOtavio||'',titulo:s.video.titulo||s.postagem?.titulo||'Conteúdo',editorAtribuido:s.video.editorAtribuido||null,manifesto:m?{id:m.id,sha256:m.sha256,generation:m.generation,bytes:m.bytes,mimeType:m.mimeType,thumbOffsetMs:m.thumbOffsetMs,verificadoEm:m.verificadoEm,anteriorId:m.anteriorId||null}:null,legenda:s.postagem?.legenda||'',pacoteId:s.packageId,aprovada:sameApproval(d,s),aprovacao:s.pacote?.aprovacao||null,collaborators:s.pacote?.collaborators||[],capacidades:{upload:s.programacaoLiberada&&canDeliver(a,s.video),preview:!!m&&(managers.includes(a.papel)||s.video.editorAtribuido===a.papel||sameApproval(d,s)),aprovar:managers.includes(a.papel)&&!!m&&s.postagem?.status==='aguardando_agendamento'},pendencia:!m?(s.programacaoLiberada?'Envie e preserve o arquivo final.':'O envio integrado de arquivos ainda não foi liberado. Continue usando o link final na ficha de edição.'):!s.postagem?'Arquivo preservado. A aprovação do pacote ficará disponível quando a postagem desta mesma peça existir.':sameApproval(d,s)?null:'Amanda precisa conferir a prévia e aprovar esta versão com a legenda atual.'};
}
function review(d,s,choices){
 const m=s.manifest,p=s.postagem;
 need(!p?.publicacaoStokki,'stokki-incremento','Esta entrega por redes continua na conferência própria de Stokki.');
 need(m?.verificadoPeloServidor===true&&m.imutavel===true&&m.legivel===true,'manifesto','Preserve a versão atual antes de aprovar.');
 need(p&&p.status==='aguardando_agendamento'&&p.excluido!==true&&!p.arquivado&&s.video.status==='aprovado'&&s.video.clienteAprovou===true,'postagem','A aprovação do pacote fica disponível após a liberação aplicável do cliente e a criação da postagem desta peça.');
 need(d.legendaUtilizavel(p.legenda),'legenda','Confira a legenda atual da postagem antes de aprovar o pacote.');
 need(Number.isSafeInteger(choices.thumbOffsetMs)&&choices.thumbOffsetMs>=0&&choices.thumbOffsetMs<=d.config.maxThumbOffsetMs&&collaborators(choices.collaborators),'capa','Confira o quadro da capa e os colaboradores.');
 const retrato={video:s.video,postagem:p,manifesto:m,ponteiro:s.ponteiro,pacoteAnterior:s.pacote||null,escolhas:{thumbOffsetMs:choices.thumbOffsetMs,collaborators:choices.collaborators}};
 return {assinaturaEsperada:hash(retrato),choices:retrato.escolhas};
}
function autorizer(d,a,now){
 return async(_ctx,{videoId,acao,tx})=>{
  const run=async t=>{
   const s=await sources(d,t,a,videoId,now);
   if(['preparar','finalizar'].includes(acao)){need(s.programacaoLiberada,'programacao_indisponivel','O envio integrado de arquivos ainda não foi liberado. Continue usando o link final na ficha de edição; os arquivos já preservados continuam disponíveis para conferência.');need(canDeliver(a,s.video),'papel','Envie pelo perfil do editor responsável por esta entrega ou pela Amanda.');}
   else requireRead(d,a,s);
   return {uid:a.uid,videoId,cliente:s.video.cliente,empresaOtavio:s.video.empresaOtavio||'',postagemId:s.postagem?.id||''};
  };
  return tx?run(tx):d.db.runTransaction(run);
 };
}
export async function operarMidiaI166(d,auth,input,{agora=new Date()}={}){
 validateDependencies(d);need(input&&typeof input==='object'&&!Array.isArray(input)&&ACOES_MIDIA_I166.includes(input.acao),'acao','Confira a operação do arquivo.');
 const a=d.identidadeToken(auth,input.papelOperado,input.sessao||'midia_i166'),now=new Date(agora),em=now.toISOString();
 const deps={...d,agora:()=>now,autorizar:autorizer(d,a,now)};
 if(input.acao==='preparar_midia_i166'){
  need(uuid(input.operacaoId),'intencao','Mantenha a mesma tentativa de envio ao retomar.');
  return prepararUploadResumivelI166(deps,{},input);
 }
 if(input.acao==='finalizar_midia_i166')return finalizarI166(deps,{},input);
 if(input.acao==='ler_midia_i166')return d.db.runTransaction(async tx=>{const s=await sources(d,tx,a,input.videoId,now);if(a.papel!=='Cecília')requireRead(d,a,s);return summary(d,a,s);});
 if(input.acao==='preview_midia_i166'){
  const s=await d.db.runTransaction(async tx=>{const x=await sources(d,tx,a,input.videoId,now);requireRead(d,a,x);need(x.manifest?.id===input.manifestoId,'versao','Abra a prévia da versão atual.');return x;});
  const signed=await obterPreviewURLI166(deps,{},input);
  const previewToken=randomUUID();
  await d.db.runTransaction(async tx=>{
   const fresh=await sources(d,tx,a,input.videoId,now);requireRead(d,a,fresh);
   need(fresh.manifest?.id===s.manifest.id&&fresh.manifest.sha256===s.manifest.sha256&&fresh.manifest.generation===s.manifest.generation,'versao','O arquivo mudou ao preparar a prévia. Abra a versão atual.');
   tx.set(d.db.doc('midias_previews_i166/'+previewToken),{schema:1,videoId:s.video.id,manifestoId:s.manifest.id,sha256:s.manifest.sha256,generation:s.manifest.generation,uid:a.uid,papel:a.papel,atorReal:a.real,emitidoEm:em,expiraEm:signed.expiraEm});
  });
  return {...signed,previewToken};
 }
 if(input.acao==='preparar_aprovacao_midia_i166')return d.db.runTransaction(async tx=>{
  need(managers.includes(a.papel),'papel','A Amanda confere e aprova o pacote.');
  const s=await sources(d,tx,a,input.videoId,now),r=review(d,s,input);
  return {...summary(d,a,s),...r,nenhumaEscrita:true};
 });
 need(managers.includes(a.papel)&&uuid(input.operacaoId)&&uuid(input.previewToken)&&input.conferiVideo===true,'aprovacao','Abra a prévia e confirme a versão antes de aprovar.');
 return d.db.runTransaction(async tx=>{
  const s=await sources(d,tx,a,input.videoId,now),rr=d.db.doc('midias_aprovacoes_i166/'+input.operacaoId),[rs,ps,jobs]=await Promise.all([tx.get(rr),tx.get(d.db.doc('midias_previews_i166/'+input.previewToken)),tx.get(d.db.collection('upload_post_execucoes_i166').where('postagemId','==',s.postagem?.id||'__sem_postagem__'))]);
  const pedidoHash=hash({uid:a.uid,papel:a.papel,atorReal:a.real,videoId:input.videoId,assinaturaEsperada:input.assinaturaEsperada,thumbOffsetMs:input.thumbOffsetMs,collaborators:input.collaborators,previewToken:input.previewToken});
  if(rs.exists){need(rs.data().pedidoHash===pedidoHash,'intencao','Esta tentativa já pertence a outra aprovação.');return {estado:'recuperada',recibo:rs.data(),atual:summary(d,a,s)};}
  const r=review(d,s,input),preview=ps.data(),m=s.manifest;
  need(preview&&preview.uid===a.uid&&preview.papel===a.papel&&preview.atorReal===a.real&&preview.videoId===s.video.id&&preview.manifestoId===m.id&&preview.sha256===m.sha256&&preview.generation===m.generation&&Date.parse(preview.expiraEm)>now.getTime(),'preview','Reabra a prévia desta versão antes de aprovar.');
  need(input.assinaturaEsperada===r.assinaturaEsperada,'versao','A entrega, o arquivo ou a legenda mudou. Confira a versão atual antes de aprovar.');
  need(jobs.docs.every(j=>['confirmado','cancelado','abortado'].includes(j.data().canonico?.estado)||['confirmado','cancelado','abortado','bloqueado_definitivo'].includes(j.data().estado)),'envio_em_curso','Existe um envio desta peça em conferência. Resolva a mesma execução antes de substituir o pacote.');
  need(Date.parse(m.verificadoEm)<now.getTime(),'tempo','Aguarde a conclusão da verificação antes de aprovar.');
  const pacote={schema:1,id:s.packageId,postagemId:s.postagem.id,videoId:s.video.id,cliente:s.video.cliente,empresaOtavio:s.video.empresaOtavio||'',formato:'REELS',midiaManifestoId:m.id,legendas:{instagram:{texto:s.postagem.legenda,aprovadaPor:a.papel,aprovadaEm:em}},capa:{thumb_offset:input.thumbOffsetMs,midiaSha256:m.sha256,midiaGeneration:m.generation},collaborators:[...input.collaborators],revisao:(s.pacote?.revisao||0)+1};
  pacote.aprovacao={por:a.papel,uid:a.uid,atorReal:a.real,em,midiaManifestoId:m.id,midiaSha256:m.sha256,midiaGeneration:m.generation,previewToken:input.previewToken,assinaturaEditorial:d.assinaturaEditorial({fontes:{post:s.postagem,video:s.video},pacote:{...pacote,midia:m},rede:'instagram'})};
  const recibo={schema:1,id:input.operacaoId,pedidoHash,pacoteId:pacote.id,videoId:s.video.id,postagemId:s.postagem.id,manifestoId:m.id,revisao:pacote.revisao,autoria:{uid:a.uid,papel:a.papel,atorReal:a.real},em};
  const pr=d.db.doc('upload_post_pacotes_i166/'+pacote.id);
  if(s.pacote)tx.set(pr.collection('versoes').doc('antes_'+input.operacaoId),s.pacote);
  tx.set(pr,pacote);tx.set(pr.collection('versoes').doc(input.operacaoId),pacote);tx.set(rr,recibo);
  return {estado:'aprovada',recibo,pacote,nenhumEnvioExterno:true,nenhumStatusVideoAlterado:true,nenhumaRotaInstagramAnexada:true};
 });
}

