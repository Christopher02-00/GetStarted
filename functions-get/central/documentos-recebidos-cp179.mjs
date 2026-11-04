/* Documento recebido é informação de preparação; não é calendário pronto. */
import crypto from'node:crypto';
import{lerRecebimentoDocumentoCp179}from'../conclusao-documento-cp179.mjs';
import{estadoEtapas}from'./lib/gs-planejamento-social-i155.mjs';
import{jsonI165}from'./lib/gs-programacao-i165.mjs';
export const TIPO_DOCUMENTO_RECEBIDO_CP179='documento_recebido_cp179';
export const operacaoDocumentoCp179=v=>typeof v==='string'&&/^cp179_[a-f0-9]{64}$/.test(v);
const hash=v=>crypto.createHash('sha256').update(jsonI165(v)).digest('hex');
export const idAvisoDocumentoCp179=operacao=>{if(!operacaoDocumentoCp179(operacao))throw Error('Confira o recibo documental da mesma operação.');return hash([TIPO_DOCUMENTO_RECEBIDO_CP179,operacao,'Chris']);};
export function ocorrenciaDocumentoRecebidoCp179(r){
 if(!r)return null;const c=r.conclusao,p=r.ciclo;
 if(!c||c.schema!==1||c.estado!=='concluida'||!operacaoDocumentoCp179(c.operacao)||!p||p.schema!==1||p.id!==undefined&&p.id!==c.ciclo||p.cliente!==c.cliente||p.competencia!==c.competencia||c.ciclo!==c.competencia+'__'+c.cliente||!['campanha','referencias'].includes(c.finalidade)||!Number.isSafeInteger(c.versao)||c.versao<1||!/^[a-f0-9]{64}$/.test(c.hashTexto||''))throw Error('O recebimento documental precisa confirmar cliente, mês e versão.');
 if(p.incluido!==true||estadoEtapas(p).consolidado===true)return null;
 const origem={tipo:TIPO_DOCUMENTO_RECEBIDO_CP179,id:c.operacao},link={area:TIPO_DOCUMENTO_RECEBIDO_CP179,ciclo:c.ciclo,cliente:c.cliente,competencia:c.competencia,documentoId:c.documentoId,versao:c.versao,finalidade:c.finalidade,empresaOtavio:c.empresaOtavio||'',hashTexto:c.hashTexto};
 return{id:idAvisoDocumentoCp179(c.operacao),origem,versao:hash([origem,c.demandaId,c.documentoId,c.versao,c.hashTexto]),destinatario:'Chris',nivel:'recebido',titulo:(c.finalidade==='campanha'?'Campanhas e documento recebidos':'Referências recebidas')+' · '+String(p.clienteNome||c.cliente),texto:'O documento completo de '+c.competencia+' foi confirmado. Confira os materiais para preparar os próximos passos. A base consolidada e a revisão do calendário continuam em etapas separadas.',link};
}
export async function lerOcorrenciaDocumentoRecebidoCp179(db,operacao,{tx=null}={}){
 if(!operacaoDocumentoCp179(operacao))throw Error('Abra o mesmo recebimento documental.');
 return ocorrenciaDocumentoRecebidoCp179(await lerRecebimentoDocumentoCp179(db,operacao,{tx}));
}
