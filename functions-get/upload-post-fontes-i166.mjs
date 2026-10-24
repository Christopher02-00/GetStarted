import {identidadeTokenI165,contextoTxI165,validarCadastroI165} from './contexto.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,180}$/u.test(v);
export const exigirUploadPostI166=(v,c,m)=>{if(!v)throw Object.assign(Error(m),{code:'i166/'+c});};
const fisico=s=>s.exists?{...s.data(),id:s.id}:null;
export function rotaUploadPostI166(post){
 const r=post?.uploadPostI166;
 if(r===undefined||r===null)return {rota:'legado_i165'};
 exigirUploadPostI166(r.versao===1&&r.rota==='upload_post_i166'&&[r.pacoteId,r.contaId,r.ocorrenciaId].every(id),'rota','A rota de programação desta peça precisa ser conferida; nenhum fallback foi aplicado.');
 return {...r,rede:'instagram'};
}
export async function lerDependenciasUploadPostTxI166({db,tx,fontes,dados}){
 const p=fontes.post,r=rotaUploadPostI166(p);exigirUploadPostI166(!p.publicacaoStokki,'stokki-incremento','A programação por redes de Stokki continua no fluxo próprio existente; esta rota não envia essa peça.');exigirUploadPostI166(r.rota==='upload_post_i166','rota','Esta peça usa a programação existente.');
 exigirUploadPostI166(!dados?.ocorrenciaId||dados.ocorrenciaId===r.ocorrenciaId,'ocorrencia','Confira a ocorrência autorizada da mesma peça.');
 const [cfg,ps,cs,os]=await Promise.all([tx.get(db.doc('programacao_upload_post_i166/ativo')),tx.get(db.doc('upload_post_pacotes_i166/'+r.pacoteId)),tx.get(db.doc('upload_post_contas_i166/'+r.contaId)),tx.get(db.doc('upload_post_ocorrencias_autorizadas_i166/'+r.ocorrenciaId))]);
 exigirUploadPostI166(ps.exists&&cs.exists&&os.exists,'dependencias','O pacote, a conta e a ocorrência precisam existir fisicamente.');
 const pacote=fisico(ps),conta=fisico(cs),ocorrencia=fisico(os),midiaId=pacote.midiaManifestoId;
 exigirUploadPostI166(id(midiaId),'midia','O pacote precisa apontar para um manifesto físico.');
 const [ms,vs]=await Promise.all([tx.get(db.doc('midias_manifestos_i166/'+midiaId)),fontes.video?tx.get(db.doc('midias_videos_i166/'+fontes.video.id)):Promise.resolve(null)]);
 exigirUploadPostI166(ms.exists&&(!fontes.video||vs?.data()?.manifestoId===midiaId),'midia','O manifesto atual da peça não corresponde ao pacote aprovado.');
 const midia=fisico(ms);
 exigirUploadPostI166(midia.cliente===p.cliente&&(midia.empresaOtavio||'')===(p.empresaOtavio||'')&&pacote.cliente===p.cliente&&(pacote.empresaOtavio||'')===(p.empresaOtavio||''),'midia-cliente','O arquivo e o pacote precisam pertencer ao mesmo cliente e empresa.');
 // These two attestations cannot be supplied by a request body or a copied embedded map.
 return {config:cfg.data()||null,pacote:{...pacote,midia},conta:{...conta,conferidaPeloServidor:true},ocorrencia};
}
export async function consultarDestinoUploadPostI166(db,auth,dados,{agora=new Date(),pacote=false}={}){
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'upload_post');exigirUploadPostI166(['Amanda','Chris','Cecília'].includes(ator.papel),'papel','Abra pelo perfil responsável pela programação.');
 return db.runTransaction(async tx=>{
  exigirUploadPostI166(id(dados.postagemId),'postagem','Confira a postagem física.');const [cad,post]=await Promise.all([tx.get(db.doc('usuarios_equipe/'+ator.email)),tx.get(db.doc('postagens/'+dados.postagemId))]);validarCadastroI165(ator,cad.data());exigirUploadPostI166(post.exists,'postagem','A postagem não existe.');const r=rotaUploadPostI166(fisico(post));
  if(r.rota==='legado_i165')return {rota:r.rota,somenteLeitura:true};
  await contextoTxI165(db,tx,ator,'programacao');const fontes=await fontesPostagemTxI165(db,tx,dados.postagemId,agora);
  const dep=await lerDependenciasUploadPostTxI166({db,tx,fontes,dados}),destino={rota:r.rota,rede:'instagram',ocorrenciaId:r.ocorrenciaId,somenteLeitura:true};
  if(!pacote)return destino;
  const a=dep.pacote,m=a.midia;
  return {...destino,pacote:{id:a.id,postagemId:a.postagemId,videoId:a.videoId,formato:a.formato,midia:{id:m.id,sha256:m.sha256,generation:m.generation,bytes:m.bytes,mimeType:m.mimeType,verificadoEm:m.verificadoEm},capa:a.capa||null,collaborators:a.collaborators||null,aprovacao:a.aprovacao||null,legendas:a.legendas||null},capacidades:{upload:false,preview:false},preview:null};
 });
}
