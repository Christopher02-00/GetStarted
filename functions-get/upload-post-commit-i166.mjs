import {programarI165} from './programar.mjs';
import {exigirProgramacaoTxI165} from './guardas-programacao.mjs';
import {jsonCanonicoI165} from './lib/gs-contexto-operacional-i165.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
import {lerDependenciasUploadPostTxI166,exigirUploadPostI166} from './upload-post-fontes-i166.mjs';
import {validarPacoteUploadPostI166,assinaturaFonteUploadPostI166,jsonCanonicoUploadPostI166} from './upload-post-pacote.mjs';
const authDoJob=j=>({uid:j.autorizacaoAtual.uid,token:{email:j.autorizacaoAtual.email,email_verified:true,firebase:{sign_in_provider:'google.com'}}});
export async function concluirCanonicoUploadPostI166(db,jobId,{agora=new Date()}={}){
 const ref=db.doc('upload_post_execucoes_i166/'+jobId),s=await ref.get(),inicial=s.data();exigirUploadPostI166(s.exists,'job','A execução não foi encontrada.');
 if(inicial.canonico?.estado==='confirmado')return {confirmado:true,recuperado:true,canonico:inicial.canonico};
 if(inicial.estado!=='agendamento_conferido')return {confirmado:false,aguardaConferencia:true};
 const auth=authDoJob(inicial),ator=inicial.autorizacaoAtual;
 try{
  const r=await programarI165(db,auth,{...inicial.pedido,postagemId:inicial.postagemId,operacaoId:'up166_'+jobId.slice(0,56),tipo:'agendar',data:inicial.pacote.agenda.data,hora:inicial.pacote.agenda.hora,papelOperado:ator.papel,sessao:ator.sessao,assinaturaEsperada:inicial.assinaturaPostAnterior}, {agora,
   conferirExternoTx:async({tx,ator:atual})=>{
    const js=await tx.get(ref),j=js.data();exigirUploadPostI166(js.exists&&j.estado==='agendamento_conferido'&&!j.canonico?.estado?.includes('confirmado'),'job','A execução ainda não está pronta para o recebimento canônico.');
    exigirUploadPostI166(j.assinatura===inicial.assinatura&&j.autorizacaoAtual.uid===atual.uid&&j.autorizacaoAtual.papel===atual.papel&&j.autorizacaoAtual.atorReal===atual.real,'job-mudou','A autorização da execução mudou.');
    const c=j.provedor?.conferencia;exigirUploadPostI166(c&&c.job_id===j.provedor.job_id&&c.external_id===j.ids.external_id&&c.profile_username===j.pacote.conta.profile_username&&c.scheduled_date===j.pacote.payload.scheduled_date&&jsonCanonicoUploadPostI166(c.platforms)==='["instagram"]','readback','O agendamento externo precisa da correlação física exata.');
    const guard=await exigirProgramacaoTxI165(db,tx,atual,{postagemId:j.postagemId,tipo:'agendar',data:j.pedido.agenda.data,hora:j.pedido.agenda.hora,rede:'geral'},agora),fontes=guard.fontes;exigirUploadPostI166(assinaturaFonteUploadPostI166(fontes)===j.assinaturaFonte,'fonte-mudou','A peça mudou depois do envio externo. O conteúdo atual foi preservado e a conciliação precisa de atenção.');
    const dep=await lerDependenciasUploadPostTxI166({db,tx,fontes,ator:atual,dados:j.pedido,agora}),r=validarPacoteUploadPostI166({...dep,config:{...dep.config,pausado:false},fontes:{...fontes,conferidaPeloServidor:true,excecaoConferida:guard.resultado.excecaoAplicada===true},agenda:j.pedido.agenda,rede:j.rede,agora});
    exigirUploadPostI166(r.elegivel&&r.assinatura===j.assinatura,'pacote-mudou','A aprovação, conta ou arquivo mudou depois do envio externo. Nenhuma versão antiga foi restaurada.');return {j,uploadPostI166:{...fontes.post.uploadPostI166,jobId:j.id,canonicoEm:agora.toISOString()}};
   },
   concluirExternoTx:({tx,externo,recibo})=>{
    const j=externo.j,canonico={estado:'confirmado',em:agora.toISOString(),postagemId:j.postagemId,operacaoId:recibo.operacaoId,antesAssinatura:recibo.antesAssinatura,depoisAssinatura:recibo.depoisAssinatura,calendario:recibo.calendario,jobId:j.id,jobExternoId:j.provedor.job_id};
    tx.update(ref,{canonico});
   }
  });return {confirmado:true,resultado:r};
 }catch(e){
  await db.runTransaction(async tx=>{const js=await tx.get(ref),j=js.data();if(!js.exists||j.canonico?.estado==='confirmado')return;tx.update(ref,{canonico:{estado:'precisa_conciliar',em:agora.toISOString(),codigo:String(e.code||'i166/commit').slice(0,120),mensagem:String(e.message).slice(0,500),postagemId:j.postagemId,nenhumaVersaoRestaurada:true}});});
  return {confirmado:false,precisaConciliar:true,codigo:e.code||'i166/commit',mensagem:e.message};
 }
}
