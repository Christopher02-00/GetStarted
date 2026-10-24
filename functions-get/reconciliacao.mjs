import {resumirDespachosI165} from './lib/gs-cadencia-avisos-i165.mjs';
import {acompanharUploadPostI166} from './upload-post-servico-i166.mjs';
import {configuracaoI165,ESCOPO_I165} from './contexto.mjs';
import {sincronizarVideoI165,sincronizarPostagemI165} from './acompanhamento.mjs';
import {despacharNotaI165} from './despacho.mjs';
export async function executarAcompanhamentoI165(db,{agora=new Date(),limite=40,enviarPush,enviarEmail,uploadPost=null}={}){
 const cfg=await configuracaoI165(db);if(!cfg)return {ativa:false};
 if(!Number.isInteger(limite)||limite<1||limite>100)throw Error('Limite inválido.');
 const controle=db.doc('servicos_i165/reconciliacao'),anterior=(await controle.get()).data()||{},erros=[],processadas=[],despachos=[];
 for(const [tipo,colecao,estados,habilidade,executar]of [['videos','videos_producao',['aguardando_edicao','correcao'],'edicao',sincronizarVideoI165],['postagens','postagens',['aguardando_legenda','aguardando_agendamento','agendado','em_correcao','postado','confirmando_postagem','legenda_pronta'],'programacao',sincronizarPostagemI165]]){
  if(cfg.habilidades?.[habilidade]!==true)continue;
  let q=db.collection(colecao).where('status','in',estados).orderBy('__name__').limit(limite);if(anterior[tipo+'Cursor'])q=q.startAfter(anterior[tipo+'Cursor']);const pagina=await q.get();
  for(const d of pagina.docs)try{await executar(db,d.id,{agora});processadas.push({colecao,id:d.id});}catch(e){erros.push({colecao,id:d.id,erro:String(e.message).slice(0,500)});}
  await controle.set({[tipo+'Cursor']:pagina.size===limite?pagina.docs.at(-1).id:'',atualizadoEm:agora.toISOString()},{merge:true});
 }
 let nq=db.collection('notificacoes_operacionais_i165').where('escopo','==',ESCOPO_I165).where('estado','==','pendente').orderBy('__name__').limit(limite);if(anterior.notasCursor)nq=nq.startAfter(anterior.notasCursor);const notas=await nq.get();
 for(const d of notas.docs)try{despachos.push(await despacharNotaI165(db,d.id,{agora,enviarPush,enviarEmail}));}catch(e){erros.push({aviso:d.id,erro:String(e.message).slice(0,500)});}
 await controle.set({notasCursor:notas.size===limite?notas.docs.at(-1).id:''},{merge:true});
 let programacaoExterna={ativa:false};if(uploadPost)try{programacaoExterna=await acompanharUploadPostI166(db,{agora,...uploadPost});}catch(e){erros.push({servico:'upload_post_i166',erro:String(e.message).slice(0,500)});}
 const canais=resumirDespachosI165(despachos);
 await db.doc('servicos_i165/estado').set({schema:1,escopo:ESCOPO_I165,estado:erros.length?'conferir_origens':canais.estado==='conferir_canais'?'conferir_canais':'conferido',ultimaExecucao:agora.toISOString(),processadas:processadas.length,notas:notas.size,canais,erros:erros.slice(0,100),limite,portalAbertoNecessario:false},{merge:true});
 return {ativa:true,processadas:processadas.length,notas:notas.size,erros,canais,programacaoExterna};
}
