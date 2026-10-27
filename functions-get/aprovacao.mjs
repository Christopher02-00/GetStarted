import {hashPedidoI165,refOperacaoI165,conferirReciboPedidoI165} from './intencao-operacao.mjs';
import {listarOpcoesCampanhaTxI165,escolherCampanhaTxI165,compromissoSelecionadoI165} from './campanhas.mjs';
import {exigirI165,idFisicoI165,instanteI165,jsonCanonicoI165,entregaSemPostagemI165} from './lib/gs-contexto-operacional-i165.mjs';
import {aplicarAprovacaoComDiretrizI165,assinaturaDiretrizI165,assinaturaVideoAprovacaoI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {identidadeTokenI165,contextoTxI165,clienteTxI165,hashI165} from './contexto.mjs';
import {origemTxI165,compromissoVideoTxI165} from './fontes.mjs';
const configPublica=c=>({modoAprovacaoCliente:c.modoAprovacaoCliente,tipoEntrega:c.tipoEntrega});
const semPostagem=(video,cliente)=>entregaSemPostagemI165(video,cliente.config);
function qualidadeSomenteChrisCp108(video,dados,ctx,reciboAnterior,em){
 const intencao=jsonCanonicoI165({tipo:'qualidade_chris_cp108',videoId:video.id,operacaoId:dados.operacaoId,assinaturaEsperada:dados.assinaturaEsperada,uid:ctx.uid,papel:ctx.papel,atorReal:ctx.atorReal});
 if(reciboAnterior){exigirI165(reciboAnterior.operacaoId===dados.operacaoId&&reciboAnterior.intencao===intencao,'operacao-reutilizada','Esta tentativa já foi usada com outra intenção.');return {estado:'recuperado',patchVideo:null,diretriz:null,recibo:reciboAnterior,requerLeituraAtual:true};}
 exigirI165(video.excluido!==true&&video.status==='aguardando_aprovacao'&&typeof video.linkFinalizado==='string'&&video.linkFinalizado.trim(),'estado-video','A entrega atual não está disponível para esta aprovação.');
 exigirI165(typeof dados.assinaturaEsperada==='string'&&assinaturaVideoAprovacaoI165(video)===dados.assinaturaEsperada,'versao','A entrega mudou depois de abrir. Confira a versão atual.');
 return {estado:'novo',patchVideo:{status:'aguardando_cliente',aprovadoInternoEm:em,aprovadoPor:ctx.papel,clienteAprovou:false,ultimaCorrecaoSolicitada:'',enviadoParaCliente:false},diretriz:null,recibo:{schema:1,tipo:'qualidade_chris_cp108',escopo:'operacional_i165_cp101',videoId:video.id,operacaoId:dados.operacaoId,intencao,autoria:{uid:ctx.uid,papel:ctx.papel,atorReal:ctx.atorReal},em},requerLeituraAtual:true,acaoPosterior:'conferir-configuracao-e-usar-confirmacao-cliente-canonica'};
}
export async function prepararAprovacaoVideoI165(db,auth,dados,{agora=new Date()}={}){
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'aprovacao');exigirI165(ator.papel==='Chris'&&idFisicoI165(dados.videoId),'aprovacao','A revisão principal de qualidade é do Chris. A Amanda organiza a postagem na fila dela.');
 return db.runTransaction(async tx=>{
  await contextoTxI165(db,tx,ator,'aprovacao');const s=await tx.get(db.doc('videos_producao/'+dados.videoId));exigirI165(s.exists,'video','O vídeo não existe mais.');const v={...s.data(),id:s.id};
  exigirI165(v.excluido!==true&&v.status==='aguardando_aprovacao'&&typeof v.linkFinalizado==='string'&&v.linkFinalizado.trim(),'estado-video','A entrega atual não está disponível para esta aprovação.');
  const cliente=await clienteTxI165(db,tx,v.cliente,agora);exigirI165(cliente.clienteAtivo,'cliente-inativo','O cliente saiu da operação; confira o trabalho antes de aprovar.');
  const fora=semPostagem(v,cliente),[origem,campanha,d]=await Promise.all([fora?{tipo:'fora_da_postagem',assinatura:hashI165(null)}:origemTxI165(db,tx,v),fora?{compromisso:null,decisao:null}:compromissoVideoTxI165(db,tx,v),tx.get(db.doc('video_programacao_i165/'+v.id))]);const opcoes={opcoesCampanha:[],campanhasSemOpcao:[],consultaCompleta:true};
  const campos=['id','cliente','clienteNome','empresaOtavio','calendarClienteSlug','calendarCompetencia','calendarItemId','titulo','observacao','correcao','ultimaCorrecaoSolicitada','editorAtribuido','linkFinalizado','enviadoEm','status','trabalhoExterno','vinculoCliente','clienteExternoNome'];
  return {video:Object.fromEntries(campos.filter(k=>v[k]!==undefined).map(k=>[k,v[k]])),assinaturaEsperada:assinaturaVideoAprovacaoI165(v),diretrizAnterior:d.data()||null,compromisso:campanha.compromisso,...opcoes,origemConferida:origem,configuracaoCliente:configPublica(cliente.config),diretrizNecessaria:false,orientacaoAmandaNecessaria:!fora,fluxoCp108:'qualidade_chris',lidoEm:instanteI165(agora),updateTime:s.updateTime?.toDate?.().toISOString()||null,nenhumaEscrita:true,cancelamentoAtomicoDisponivel:true,contratoUiRevisao:2};
 });
}
export async function conferirOperacaoI165(db,auth,dados,{agora=new Date()}={}){
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'aprovacao');exigirI165(['Amanda','Chris'].includes(ator.papel)&&idFisicoI165(dados.operacaoId),'operacao','Confira a intenção anterior.');
 return db.runTransaction(async tx=>{
  await contextoTxI165(db,tx,ator,'aprovacao');const s=await tx.get(refOperacaoI165(db,ator,dados.operacaoId));
  if(!s.exists)return {estado:'ausente_no_instante',conferidoEm:instanteI165(agora),retrySomenteMesmaIntencao:true,naoAutorizaNovaIntencao:true};
  const r=s.data();if(r.estado==='cancelada'){exigirI165(r.autoria?.uid===ator.uid&&r.autoria.papel===ator.papel&&r.autoria.atorReal===ator.real,'operacao-dono','Esta tentativa pertence a outro acesso.');return {estado:'cancelada',cancelamentoAtomico:true,recibo:r,nenhumaEscrita:true};}exigirI165(r.autoria?.uid===ator.uid&&r.autoria.papel===ator.papel&&r.autoria.atorReal===ator.real,'operacao-dono','Esta tentativa pertence a outro acesso.');
  const v=await tx.get(db.doc('videos_producao/'+r.videoId));
  return {estado:'confirmada',recibo:r,requerLeituraAtual:true,videoAtual:v.exists?{id:v.id,status:v.data().status,clienteAprovou:v.data().clienteAprovou,linkFinalizado:v.data().linkFinalizado||''}:null,nenhumaEscrita:true};
 });
}
export async function aprovarVideoI165(db,auth,dados,{agora=new Date()}={}) {
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'aprovacao'),em=instanteI165(agora);
 exigirI165(['Amanda','Chris'].includes(ator.papel)&&idFisicoI165(dados.videoId)&&idFisicoI165(dados.operacaoId),'aprovacao','Confira o perfil, o vídeo e a intenção desta aprovação.');
 const vr=db.doc('videos_producao/'+dados.videoId),dr=db.doc('video_programacao_i165/'+dados.videoId),rr=refOperacaoI165(db,ator,dados.operacaoId),pedidoHash=hashPedidoI165(ator,dados);
 return db.runTransaction(async tx=>{
  const [contexto,vs,ds,rs]=await Promise.all([contextoTxI165(db,tx,ator,'aprovacao'),tx.get(vr),tx.get(dr),tx.get(rr)]);if(rs.exists)return {...conferirReciboPedidoI165(rs.data(),ator,pedidoHash),nenhumaPostagemCriada:true};exigirI165(vs.exists,'video','O vídeo não existe mais.');const video={...vs.data(),id:vs.id};
  exigirI165(ator.papel==='Chris','papel','Novas aprovações de qualidade são do Chris. A Amanda organiza a postagem sem reaprovar o vídeo.');
  exigirI165(dados.diretriz===undefined&&dados.campanhaEscolhida==null,'somente-qualidade','A aprovação do Chris não define datas, prioridade ou nova campanha. Reabra a entrega na versão atual.');
  const cliente=await clienteTxI165(db,tx,video.cliente,em);exigirI165(cliente.clienteAtivo,'cliente-inativo','O cliente saiu da operação; confira o trabalho antes de aprovar.');
  const fora=semPostagem(video,cliente);
  const campanha=fora?{compromisso:null,decisao:null}:await compromissoVideoTxI165(db,tx,video);
  exigirI165(jsonCanonicoI165(campanha.compromisso)===jsonCanonicoI165(dados.compromissoEsperado),'campanha-avancou','O vínculo da campanha mudou desde sua conferência. Reabra a entrega antes de aprovar.');
  if(!fora)await origemTxI165(db,tx,video);
  const r=qualidadeSomenteChrisCp108(video,dados,contexto.ctx,rs.data()||null,em);
  if(r.estado==='novo'){tx.update(vr,r.patchVideo);tx.set(rr,{...r.recibo,estado:'confirmada',pedidoHash});}
  return {...r,configuracaoCliente:configPublica(cliente.config),diretrizNecessaria:false,orientacaoAmandaNecessaria:!fora,fluxoCp108:'qualidade_chris',diretrizAnteriorPreservada:true,nenhumaPostagemCriada:true};
 });
}

export async function abortarOperacaoI165(db,auth,dados,{agora=new Date()}={}){
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'aprovacao'),pedidoHash=hashPedidoI165(ator,dados),em=instanteI165(agora);
 exigirI165(['Amanda','Chris'].includes(ator.papel),'papel','Use o perfil da gerência.');
 const ref=refOperacaoI165(db,ator,dados.operacaoId);
 return db.runTransaction(async tx=>{
  await contextoTxI165(db,tx,ator,'aprovacao');const s=await tx.get(ref);
  if(s.exists)return conferirReciboPedidoI165(s.data(),ator,pedidoHash);
  const recibo={schema:2,estado:'cancelada',escopo:'operacional_i165_cp101',operacaoId:dados.operacaoId,videoId:dados.videoId,pedidoHash,autoria:{uid:ator.uid,papel:ator.papel,atorReal:ator.real},em};
  tx.set(ref,recibo);return {estado:'cancelada',cancelamentoAtomico:true,recibo,nenhumaQualidadeAlterada:true};
 });
}
