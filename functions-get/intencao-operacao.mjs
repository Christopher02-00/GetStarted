import {hashI165} from './contexto.mjs';
import {exigirI165,idFisicoI165} from './lib/gs-contexto-operacional-i165.mjs';
import {normalizarEscolhaCampanhaI165} from './campanhas.mjs';
import {normalizarDiretrizI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {identidadeTokenI165} from './contexto.mjs';
export function validarContaEsperadaI165(auth,dados){const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'operacao');exigirI165(dados.uidEsperado===ator.uid&&dados.atorRealEsperado===ator.real,'conta-mudou','O acesso mudou; a tentativa anterior pertence ao perfil original.');return ator;}
export function hashPedidoI165(ator,dados){
 exigirI165(idFisicoI165(dados.videoId)&&idFisicoI165(dados.operacaoId)&&typeof dados.assinaturaEsperada==='string'&&dados.assinaturaEsperada,'intencao','Confira a mesma intenção anterior.');
 exigirI165(Object.hasOwn(dados,'compromissoEsperado')&&(dados.compromissoEsperado===null||typeof dados.compromissoEsperado==='object'&&!Array.isArray(dados.compromissoEsperado)),'campanha-retrato','Confira o vínculo físico atual antes de aprovar.');
 const diretriz=dados.diretriz===undefined?null:normalizarDiretrizI165(dados.diretriz);
 exigirI165(!diretriz||diretriz.urgencia==='normal'||diretriz.observacao,'urgencia-motivo','Conte por que este conteúdo precisa de prioridade.');
 return hashI165({schema:2,uid:ator.uid,papel:ator.papel,atorReal:ator.real,videoId:dados.videoId,operacaoId:dados.operacaoId,assinaturaEsperada:dados.assinaturaEsperada,diretriz,campanhaEscolhida:normalizarEscolhaCampanhaI165(dados.campanhaEscolhida),compromissoEsperado:dados.compromissoEsperado});
}
export function refOperacaoI165(db,ator,operacaoId){exigirI165(idFisicoI165(operacaoId),'operacao','Confira a tentativa.');return db.doc('programacao_operacoes_i165/'+hashI165(['i165_aprovar_video_v2',ator.uid,ator.real,ator.papel,operacaoId]));}
export function conferirReciboPedidoI165(recibo,ator,pedidoHash){
 exigirI165(recibo.autoria?.uid===ator.uid&&recibo.autoria?.papel===ator.papel&&recibo.autoria?.atorReal===ator.real&&recibo.pedidoHash===pedidoHash,'operacao-reutilizada','Esta tentativa pertence a outra intenção ou acesso.');
 if(recibo.estado==='cancelada')return {estado:'cancelada',cancelamentoAtomico:true,recibo,patchVideo:null,diretriz:null,requerLeituraAtual:true};
 exigirI165(recibo.estado==='confirmada','operacao-conferir','O registro anterior precisa de conferência.');return {estado:'recuperado',recibo,patchVideo:null,diretriz:null,requerLeituraAtual:true};
}
