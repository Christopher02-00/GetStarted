/* Aviso da mesma I54 editorial. Não converte, repassa nem conclui a demanda. */
import crypto from 'node:crypto';
import {TIPOS_EDITORIAIS_CP175,idDemandaClienteCp175,conferirFonteClienteCp175} from '../recepcao-pedidos-cliente-cp175.mjs';
import GetEmpresasOtavioI144 from '../lib/empresas-cp101-i165.mjs';
import {jsonI165} from './lib/gs-programacao-i165.mjs';
export const TIPO_PEDIDO_CLIENTE_CP175='pedido_cliente';
export const idI54ClienteCp175=v=>typeof v==='string'&&/^entrada_i54_[a-f0-9]{64}$/.test(v);
const hash=v=>crypto.createHash('sha256').update(jsonI165(v)).digest('hex');
export const idAvisoPedidoClienteCp175=demandaId=>hash([TIPO_PEDIDO_CLIENTE_CP175,demandaId,'Chris']);
const excluida=d=>!d||d.excluido===true||d.arquivado===true||d.cancelado===true||d.cancelada===true||d.descartado===true||d.deleted===true||!!d.deletedAt;
const exigir=(ok,msg)=>{if(!ok)throw Error(msg);};
export function ocorrenciaPedidoClienteCp175(d,a){
 if(!d||d.origem!=='cliente'||d.origemAvisoColecao!=='avisos_do_cliente'||!TIPOS_EDITORIAIS_CP175.includes(d.tipoPedidoCliente)||d.destinatario!=='Chris'||d.status!=='pendente'||excluida(d)||d.refazerUltimoI161)return null;
 exigir(idI54ClienteCp175(d.id)&&typeof d.origemAvisoId==='string'&&d.id===idDemandaClienteCp175(d.origemAvisoId),'O pedido precisa confirmar a mesma I54 determinística.');
 if(excluida(a)||String(d.origemAvisoId).startsWith('cal_obs_i35_'))return null;
 const {cliente,mes}=conferirFonteClienteCp175(a,d.origemAvisoId);
 exigir(d.operationId===d.origemAvisoId&&d.tipoPedidoCliente===a.tipo&&(d.clienteSlug||d.cliente)===cliente&&(!d.cliente||d.cliente===cliente)&&d.competencia===mes&&String(d.itemId||'')===String(a.itemId||'')&&a.lido===true&&a.demandaInternaId===d.id&&a.conversaoVersao==='i54','A recepção precisa confirmar a origem, competência, conteúdo e recibo da mesma demanda.');
 GetEmpresasOtavioI144.conferir(cliente,a,d);
 const origem={tipo:TIPO_PEDIDO_CLIENTE_CP175,id:d.id},versao=hash([origem,d.origemAvisoColecao,d.origemAvisoId,d.operationId,cliente,mes,d.tipoPedidoCliente,String(d.itemId||''),GetEmpresasOtavioI144.campos(cliente,a)]);
 return {id:idAvisoPedidoClienteCp175(d.id),origem,versao,destinatario:'Chris',nivel:'conferir',titulo:'Pedido do cliente para conferir',texto:'Chegou um pedido na Central de ajustes. Abra a mesma demanda para conferir o texto completo e dar andamento. Ler o aviso não conclui o trabalho.',link:{area:TIPO_PEDIDO_CLIENTE_CP175,demandaId:d.id,cliente,competencia:mes}};
}
export async function lerOcorrenciaPedidoClienteCp175(db,demandaId){
 exigir(idI54ClienteCp175(demandaId),'Abra o pedido pela mesma demanda I54.');
 const s=await db.doc('demandas/'+demandaId).get();if(!s.exists)return null;const d={...s.data(),id:s.id};
 if(d.origem!=='cliente'||d.origemAvisoColecao!=='avisos_do_cliente'||!TIPOS_EDITORIAIS_CP175.includes(d.tipoPedidoCliente)||d.destinatario!=='Chris'||d.status!=='pendente'||excluida(d)||d.refazerUltimoI161)return null;
 exigir(typeof d.origemAvisoId==='string'&&/^[A-Za-z0-9_.-]{1,220}$/.test(d.origemAvisoId),'A origem do pedido precisa de conferência.');
 const a=await db.doc('avisos_do_cliente/'+d.origemAvisoId).get();return a.exists?ocorrenciaPedidoClienteCp175(d,a.data()):null;
}
