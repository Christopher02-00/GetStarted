import {consultarDestinoUploadPostI166} from './upload-post-fontes-i166.mjs';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {prepararIntencaoUploadPostI166,criarIntencaoUploadPostI166,consultarIntencaoUploadPostI166} from './upload-post-intencoes.mjs';

// Add these three actions to the existing onCall dispatcher. No export/onCall/tick is installed here.
export const ACOES_UPLOAD_POST_I166=Object.freeze(['consultar_destino_upload_post','ler_pacote_upload_post','preparar_upload_post','criar_upload_post','consultar_upload_post']);
const fail=m=>Object.assign(Error(m),{code:'i166/entrada'});
const pedido=d=>({postagemId:d.postagemId,rede:d.rede,ocorrenciaId:d.ocorrenciaId,operacaoId:d.operacaoId,papelOperado:d.papelOperado,sessao:d.sessao,agenda:d.agenda?{data:d.agenda.data,hora:d.agenda.hora,timeZone:d.agenda.timeZone,scheduled_date:d.agenda.scheduled_date}:null,assinaturaFonteEsperada:d.assinaturaFonteEsperada,assinaturaPacoteEsperada:d.assinaturaPacoteEsperada});
export async function despacharUploadPostI166(db,auth,dados,{lerDependenciasTx,agora=new Date(),metodos={preparar:prepararIntencaoUploadPostI166,criar:criarIntencaoUploadPostI166,consultar:consultarIntencaoUploadPostI166}}={}){
 if(!dados||typeof dados!=='object'||Array.isArray(dados))throw fail('Confira a operação.');
 if(!ACOES_UPLOAD_POST_I166.includes(dados.acao))return {tratada:false};
 validarContaEsperadaI165(auth,dados);
 let resultado;
 if(['consultar_destino_upload_post','ler_pacote_upload_post'].includes(dados.acao))return {tratada:true,resultado:await consultarDestinoUploadPostI166(db,auth,dados,{agora,pacote:dados.acao==='ler_pacote_upload_post'})};
 if(dados.acao==='consultar_upload_post'){
  resultado=await metodos.consultar(db,auth,dados.jobId,{agora,papelOperado:dados.papelOperado,sessao:dados.sessao});
  if(dados.postagemId&&resultado?.job?.postagemId!==dados.postagemId)throw fail('A execução pertence a outro conteúdo.');
 }else{
  const d=pedido(dados),op=dados.acao==='preparar_upload_post'?'preparar':'criar';
  resultado=await metodos[op](db,auth,d,{lerDependenciasTx,agora});
 }
 return {tratada:true,resultado};
}
