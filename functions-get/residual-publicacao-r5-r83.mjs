import {FieldValue} from 'firebase-admin/firestore';
import {exigirI165,idFisicoI165,jsonCanonicoI165,instanteI165} from './lib/gs-contexto-operacional-i165.mjs';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {contextoTxI165,hashI165} from './contexto.mjs';
import {cicloFonteAlertaCanonicoV135,cicloDemandaAlertaCanonicoV135,demandaPertenceLimpezaCanonicaV135,marcadorTemporalAlertaV135} from './lib/guardas-agendamento-cp101-i165.mjs';
export const ACOES_RESIDUAL_R5_R83=Object.freeze(['preparar_residual_publicacao_r5','resolver_residual_publicacao_r5']);
const abertas=d=>['pendente','concluida_aguardando_aprovacao'].includes(d.status);
const texto=x=>typeof x==='string'?x.trim():'';
// Literal R5 identity. It describes the existing source; it does not create a date or publication.
export function identidadePostagemResidualR5(post){
 if(!post)return 'fonte_ausente';return JSON.stringify(['videoId','cliente','calendarClienteSlug','calendarItemId','calendarCompetencia','calendarItemIdx','origemManual','vinculoSessao','dataAgendada','horaAgendada','agendadoEm','reagendadoEm','confirmacaoPostagemCriada'].map(k=>['agendadoEm','reagendadoEm'].includes(k)?marcadorTemporalAlertaV135(post[k]):post[k]??null));
}
export function avaliarResidualPublicacaoR5(d,post){
 exigirI165(d&&idFisicoI165(d.id)&&idFisicoI165(d.postagemId)&&d.destinatario==='Cecília'&&d.excluido!==true&&(d.tipoEspecial==='confirmacao_publicacao_v135'||String(d.titulo||'').startsWith('📲 Confirmar publicação')),'r5-demanda','Esta demanda não confirma uma pendência da Cecília.');
 const ciclo=post?cicloFonteAlertaCanonicoV135('postagem',post):cicloDemandaAlertaCanonicoV135(d);
 exigirI165(demandaPertenceLimpezaCanonicaV135(d,{tipo:'postagem',fonteId:d.postagemId,ciclo}),'r5-ciclo','A fonte ou o ciclo da demanda mudou. Nada foi encerrado.');
 exigirI165(!post?.publicacaoStokki,'r5-stokki','Confira esta publicação no painel de plataformas da Stokki.');
 const modo=!post?'fonte_ausente':post.status==='postado'?'postado':post.status==='agendado'&&post.excluido!==true&&!post.arquivado?'acoes_canonicas':'indisponivel';
 return {modo,ciclo,postagemId:d.postagemId,decisoesPermitidas:abertas(d)?modo==='postado'?['regularizar']:modo==='fonte_ausente'?['arquivar']:[]:[],opcoesCanonicas:abertas(d)&&modo==='acoes_canonicas'?[{acao:'publicacao',tipo:'publicar',postagemId:d.postagemId},{acao:'publicacao',tipo:'cancelar',postagemId:d.postagemId},{acao:'programar',tipo:'desfazer',postagemId:d.postagemId}]:[]};
}
export function assinaturaResidualPublicacaoR5(ds,ps){return hashI165({schema:1,demanda:{id:ds.id,createTime:ds.createTime||null,dados:ds.data()},postagem:ps.exists?{id:ps.id,createTime:ps.createTime||null,dados:ps.data()}:null});}
function confirmacaoR5(d){const r=d.resolucaoPublicacaoR5;return r?.schema===1&&r.origem==='residual_i165_r83'&&r.demandaId===d.id&&r.postagemId===d.postagemId&&d.destinatario==='Cecília'&&d.excluido!==true&&d.status===(r.acao==='regularizar'?'aprovada':r.acao==='arquivar'?'cancelada':'__invalid__')?{estado:'concluida',operacaoId:r.operacaoId,decisao:r.acao,ciclo:r.ciclo,postagemId:r.postagemId,demandaId:r.demandaId,autoria:r.autoria}:null;}
export async function operarResidualPublicacaoR5R83(db,auth,dados,{agora=new Date()}={}){
 exigirI165(dados&&typeof dados==='object'&&!Array.isArray(dados)&&ACOES_RESIDUAL_R5_R83.includes(dados.acao),'r5-entrada','Confira a operação desta demanda.');
 const gravar=dados.acao==='resolver_residual_publicacao_r5',allowed=new Set(['acao','uidEsperado','atorRealEsperado','papelOperado','sessao','demandaId',...(gravar?['operacaoId','assinaturaEsperada','decisao','provaTexto','provaImagemUrl','motivo']:[])]);
 exigirI165(Object.keys(dados).every(k=>allowed.has(k))&&idFisicoI165(dados.demandaId),'r5-campos','Confira os campos e a demanda exata.');
 const ator=validarContaEsperadaI165(auth,dados);exigirI165(['Cecília','Chris'].includes(ator.real)&&['Cecília','Chris'].includes(ator.papel),'r5-papel','Esta conferência é da Cecília; Chris mantém auditoria.');
 const input=gravar?{demandaId:dados.demandaId,operacaoId:dados.operacaoId,assinaturaEsperada:dados.assinaturaEsperada,decisao:dados.decisao,provaTexto:texto(dados.provaTexto),provaImagemUrl:texto(dados.provaImagemUrl),motivo:texto(dados.motivo)}:null;
 if(gravar){exigirI165(idFisicoI165(input.operacaoId)&&/^[a-f0-9]{64}$/.test(input.assinaturaEsperada||'')&&['regularizar','arquivar'].includes(input.decisao),'r5-intencao','Confira a mesma intenção e a versão atual.');exigirI165(['provaTexto','provaImagemUrl','motivo'].every(k=>dados[k]===undefined||typeof dados[k]==='string')&&input.provaTexto.length<=3000&&input.provaImagemUrl.length<=3000&&input.motivo.length<=2000,'r5-texto','Registre uma prova ou um motivo curto.');}
 const pedidoHash=gravar?hashI165({...input,uid:ator.uid,papel:ator.papel,atorReal:ator.real}):null,em=instanteI165(agora);
 return db.runTransaction(async tx=>{
  await contextoTxI165(db,tx,ator,'programacao');const dr=db.doc('demandas/'+dados.demandaId),ds=await tx.get(dr);exigirI165(ds.exists,'r5-demanda','A demanda não existe mais.');const d={...ds.data(),id:ds.id};
  exigirI165(idFisicoI165(d.postagemId),'r5-fonte','A demanda não possui uma postagem física confirmada.');const ps=await tx.get(db.doc('postagens/'+d.postagemId)),post=ps.exists?{...ps.data(),id:ps.id}:null;
  const anterior=d.resolucaoPublicacaoR5;
  if(gravar&&anterior?.schema===1&&anterior.origem==='residual_i165_r83'&&anterior.operacaoId===input.operacaoId){
   exigirI165(anterior.pedidoHash===pedidoHash&&anterior.demandaId===d.id&&anterior.postagemId===d.postagemId&&anterior.autoria?.uid===ator.uid&&anterior.autoria.papel===ator.papel&&anterior.autoria.atorReal===ator.real,'r5-intencao','Esta tentativa pertence a outra intenção ou acesso.');
   exigirI165(d.destinatario==='Cecília'&&d.excluido!==true&&d.status===(anterior.acao==='regularizar'?'aprovada':'cancelada'),'r5-recibo','O fechamento anterior mudou depois da confirmação. Confira a demanda atual.');
   return {schema:1,estado:'recuperado',demandaEncerrada:true,recibo:anterior,requerLeituraAtual:true};
  }
  const confirmacao=confirmacaoR5(d);
  const alvo=!gravar&&confirmacao?{modo:'encerrada',ciclo:confirmacao.ciclo,postagemId:d.postagemId,decisoesPermitidas:[],opcoesCanonicas:[]}:avaliarResidualPublicacaoR5(d,post),assinaturaEsperada=assinaturaResidualPublicacaoR5(ds,ps);
  if(!gravar)return {schema:1,demandaId:d.id,postagemId:alvo.postagemId,ciclo:alvo.ciclo,assinaturaEsperada,modo:alvo.modo,decisoesPermitidas:alvo.decisoesPermitidas,opcoesCanonicas:alvo.opcoesCanonicas,fonte:{existe:ps.exists,status:post?.status||null},demanda:{id:d.id,titulo:String(d.titulo||''),status:d.status,encerrada:!abertas(d),provaTexto:typeof d.provaTexto==='string'?d.provaTexto:'',provaImagemUrl:typeof d.provaImagemUrl==='string'?d.provaImagemUrl:''},confirmacao,somenteLeitura:true,nenhumaEscrita:true,naoAutorizaEscritaPosterior:true};
  exigirI165(!anterior,'r5-recibo','Esta demanda já possui uma decisão. O histórico anterior foi preservado.');
  exigirI165(assinaturaEsperada===input.assinaturaEsperada,'r5-versao','A fonte ou a demanda mudou desde a abertura. Nada foi encerrado.');
  exigirI165(alvo.decisoesPermitidas.includes(input.decisao),'r5-decisao','Esta decisão não corresponde ao estado atual. Use a operação canônica da postagem.');
  const regularizar=input.decisao==='regularizar',provaTexto=texto(d.provaTexto)||input.provaTexto,provaImagemUrl=texto(d.provaImagemUrl)||input.provaImagemUrl;
  exigirI165(regularizar?!!(provaTexto||provaImagemUrl):!!input.motivo,'r5-prova','Informe a confirmação ou o motivo antes de encerrar.');
  const identidade=identidadePostagemResidualR5(post),recibo={schema:1,origem:'residual_i165_r83',operacaoId:input.operacaoId,pedidoHash,acao:input.decisao,demandaId:d.id,postagemId:d.postagemId,ciclo:alvo.ciclo,identidadeAnterior:identidade,identidadePosterior:identidade,autoria:{uid:ator.uid,papel:ator.papel,atorReal:ator.real},por:ator.real,em,assinaturaAnterior:input.assinaturaEsperada,apenasResidual:true,fonteAusente:!ps.exists};
  // This action writes ONLY the selected residual demand. No video, calendar or posting mutation.
  tx.update(dr,{status:regularizar?'aprovada':'cancelada',concluidoPor:ator.real,concluidoEm:FieldValue.serverTimestamp(),...(d.concluidaEm?{}:{concluidaEm:FieldValue.serverTimestamp()}),...(regularizar?{provaTexto,provaImagemUrl}:{}),notaConclusao:regularizar?'Publicação já registrada; somente a confirmação residual foi encerrada.':'Arquivada sem declarar publicação: '+input.motivo,resolucaoPublicacaoR5:recibo});
  return {schema:1,estado:'novo',demandaEncerrada:true,recibo,requerLeituraAtual:true};
 });
}
