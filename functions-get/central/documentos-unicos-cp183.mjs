/* Receipt of ONE complete document; next action is the SAME Chris obligation. */
import crypto from 'node:crypto';
import {lerRecebimentoDocumentoUnicoCp183} from '../documento-unico-cp183.mjs';
import {jsonI165} from './lib/gs-programacao-i165.mjs';
export const TIPO_DOCUMENTO_UNICO_CP183='documento_unico_cp183';
export const reciboDocumentoUnicoCp183=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const hash=v=>crypto.createHash('sha256').update(jsonI165(v)).digest('hex');
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,180}$/.test(v);
export const idAvisoDocumentoUnicoCp183=recibo=>{if(!reciboDocumentoUnicoCp183(recibo))throw Error('Confira o mesmo recebimento do documento completo.');return hash([TIPO_DOCUMENTO_UNICO_CP183,recibo,'Chris']);};
export function ocorrenciaDocumentoUnicoCp183(r){
 if(!r)return null;const a=r.recibo,c=r.ciclo,d=r.demanda,m=c?.documentos?.baseDocumentoUnicoCp183;
 if(c?.incluido===false)return null;
 if(a?.schema!==1||a.estado!=='recebido'||c?.schema!==1||a.tipo!==TIPO_DOCUMENTO_UNICO_CP183||!reciboDocumentoUnicoCp183(a.id)||!id(a.demandaChrisId)||!id(a.documentoId)||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(a.competencia||'')||!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(a.cliente||'')||a.ciclo!==a.competencia+'__'+a.cliente||c?.cliente!==a.cliente||c?.competencia!==a.competencia||c.incluido!==true||d?.destinatario!=='Chris'||!['pendente','em_andamento','refazer'].includes(d.status)||d.documentoUnicoCp183?.reciboId!==a.id||c.documentos?.obrigacaoChrisCp183?.id!==a.demandaChrisId||!Number.isSafeInteger(a.versao)||a.versao<1||!reciboDocumentoUnicoCp183(a.hashTexto)||m?.documentoId!==a.documentoId||m?.hashTexto!==a.hashTexto||m?.versao!==a.versao||m?.assinaturaBase!==a.assinaturaBase||m?.arquivoId!==a.arquivoId||['ciclo','cliente','competencia','documentoId','versao','hashTexto'].some(k=>d.documentoUnicoCp183[k]!==a[k]))throw Error('O recebimento precisa confirmar documento, obrigação, cliente, mês e versão.');
 const origem={tipo:TIPO_DOCUMENTO_UNICO_CP183,id:a.id};
 return{id:idAvisoDocumentoUnicoCp183(a.id),origem,versao:hash([origem,a.demandaChrisId,a.documentoId,a.versao,a.hashTexto,a.assinaturaBase]),destinatario:'Chris',nivel:'recebido',titulo:'Documento completo recebido · '+String(c.clienteNome||a.cliente),texto:'A Amanda enviou o documento completo de '+a.competencia+'. Confira o material e o original na mesma demanda para preparar o calendário. Não precisa pedir outro consolidado. A revisão e a liberação continuam com a Amanda. Abrir não conclui o trabalho.',link:{area:TIPO_DOCUMENTO_UNICO_CP183,reciboId:a.id,demandaId:a.demandaChrisId,ciclo:a.ciclo,cliente:a.cliente,competencia:a.competencia,documentoId:a.documentoId,versao:a.versao,hashTexto:a.hashTexto,empresaOtavio:m.empresaOtavio||''}};
}
export async function lerOcorrenciaDocumentoUnicoCp183(db,id,{tx=null}={}){if(!reciboDocumentoUnicoCp183(id))throw Error('Abra o mesmo recebimento do documento completo.');return ocorrenciaDocumentoUnicoCp183(await lerRecebimentoDocumentoUnicoCp183(db,id,{tx}));}
