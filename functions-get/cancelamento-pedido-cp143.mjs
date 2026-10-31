/* Cancelar um pedido não declara execução nem aprovação editorial. */
import {createHash} from 'node:crypto';
import {assinaturaPostagemCompletaI165} from './central/lib/gs-programacao-i165.mjs';
import {exigirCentralR80 as e} from './central-preparacao-validacao-r80.mjs';
export const ACAO_CANCELAR_CP143='ajuste_calendario_cancelar_cp143';
export function avisoConfirmaPedidoCp143(a,r,c){return !!a&&a.tipo==='ajuste_calendario'&&a.operationId===r.p.operationId&&a.demandaInternaId===r.id&&(a.cliente||a.clienteSlug)===c.cliente&&(a.competencia||a.mes)===c.competencia&&a.itemId===r.item.itemId&&!a.cancelado&&!a.excluido;}
export function elegivelCancelarCp143(r){return !!r.d&&!r.inativo&&!r.histPublico&&!r.cancelado&&r.d.status==='pendente'&&(!r.s||['pendente','rascunho','devolvido'].includes(r.s.estado))&&!r.aprovacaoAtual;}
export function assinaturaCancelarCp143(c,r,a){return createHash('sha256').update(assinaturaPostagemCompletaI165({ciclo:c.id,revisaoCiclo:c.revisao,modo:c.modo||'',cliente:c.cliente,competencia:c.competencia,pedido:r.p,demanda:r.d,revisaoPrivada:r.s,aviso:a,hashConteudo:r.hashConteudo})).digest('hex');}
export async function conferirCancelamentoTxCp143(db,tx,c,r){if(!c||!elegivelCancelarCp143(r))return null;const ref=db.doc('avisos_do_cliente/'+r.p.operationId),s=await tx.get(ref),a=s.exists?s.data():null;if(!avisoConfirmaPedidoCp143(a,r,c))return null;return{ref,aviso:a,assinatura:assinaturaCancelarCp143(c,r,a)};}
export function prepararCancelamentoCp143(c,cal,r,ator,pedido,em){
 e(ator.papel==='Chris'&&ator.real==='Chris','O cancelamento deste pedido pertence somente ao Chris autenticado.');
 e(elegivelCancelarCp143(r)&&r.cancelamentoDisponivelCp143,'Somente um pedido pendente e sua origem confirmada podem ser cancelados. Preserve revisões enviadas ou aprovadas.');
 const motivo=pedido.motivo.trim();e(motivo&&motivo.length<=4000,'Informe o motivo do cancelamento.');const metadata={schema:1,estado:'cancelado',ciclo:c.id,demandaId:r.id,operationId:r.p.operationId,itemId:r.item.itemId,motivo,por:'Chris',atorReal:ator.real,uid:ator.uid,em,operacao:pedido.operacao};
 const manter=p=>({...p,cancelamentoCp143:metadata}),mapa=cal.pedidosAjusteClienteI71||{},patch={updatedAt:em};let encontrou=false;
 for(const [key,p]of Object.entries(mapa))if(p?.operationId===r.p.operationId){e(key===r.p.operationId&&p.itemId===r.item.itemId&&p.competencia===c.competencia,'A identidade do pedido mudou.');patch.pedidosAjusteClienteI71={...mapa,[key]:manter(p)};encontrou=true;}
 if(cal.pedidoAjusteCliente?.operationId===r.p.operationId){e(cal.pedidoAjusteCliente.itemId===r.item.itemId&&cal.pedidoAjusteCliente.competencia===c.competencia,'O atalho do pedido pertence a outra origem.');patch.pedidoAjusteCliente=manter(cal.pedidoAjusteCliente);encontrou=true;}
 e(encontrou,'O pedido físico deste cancelamento não está mais presente.');return{metadata,demandaPatch:{status:'cancelada',cancelamentoCp143:metadata},writes:[{ref:r.cancelamentoDisponivelCp143.ref,patch:{cancelado:true,cancelamentoCp143:metadata}},{ref:null,calendar:true,patch}]};
}
