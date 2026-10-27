/* Read-only projection of the original I54 requests. No transfer or completion. */
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {validarCadastroI165} from './contexto.mjs';
import {programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {processoAtivoI164} from './central/lib/gs-processo-calendarios-i164.mjs';
const exigir=(ok,m)=>{if(!ok)throw Object.assign(Error(m),{code:'i165/ajustes-cp109'});};
const finais=new Set(['aprovada','cancelada','arquivada','concluida']);
export const ACOES_AJUSTES_CP109=Object.freeze(['ajustes_clientes_ler_cp109']);
export async function operarAjustesClientesCp109(db,auth,pedido){
 exigir(ACOES_AJUSTES_CP109.includes(pedido?.acao),'Consulta de ajustes inválida.');
 const permitidos=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao','cliente','competencia'];
 exigir(Object.keys(pedido).every(k=>permitidos.includes(k)),'A consulta não recebe alterações ou caminhos.');
 const a=validarContaEsperadaI165(auth,pedido);exigir(['Chris','Amanda'].includes(a.papel),'Os ajustes editoriais ficam com Chris e Amanda.');
 if(pedido.cliente)exigir(/^[a-z0-9][a-z0-9._-]{0,119}$/.test(pedido.cliente),'Confira o cliente.');
 if(pedido.competencia)exigir(/^20\d{2}-(0[1-9]|1[0-2])$/.test(pedido.competencia),'Confira o mês.');
 return db.runTransaction(async tx=>{
  const [cad,cfg,processo]=await Promise.all([tx.get(db.doc('usuarios_equipe/'+a.email)),tx.get(db.doc('programacao_config_i165/ativo')),tx.get(db.doc('processo_calendarios_i164/ativo'))]);
  validarCadastroI165(a,cad.data());exigir(programacaoAtivaI165(cfg.data())&&cfg.data()?.habilidades?.preparacaoCentral===true&&processoAtivoI164(processo.data()),'A Central está pausada; as demandas anteriores foram preservadas.');
  const snap=await tx.get(db.collection('demandas').where('origem','==','cliente').limit(501));
  exigir(snap.size<=500,'Há mais pedidos do que esta conferência comporta. A lista não foi cortada.');
  const rows=[];
  for(const s of snap.docs){const d=s.data();if(!s.id.startsWith('entrada_i54_')||d.excluido||d.arquivado||finais.has(d.status)||!['Chris','Amanda'].includes(d.destinatario))continue;
   if(pedido.cliente&&d.cliente!==pedido.cliente||pedido.competencia&&d.competencia!==pedido.competencia)continue;
   rows.push({demandaId:s.id,cliente:d.cliente||'',clienteNome:d.clienteNome||d.cliente||'',competencia:d.competencia||'',itemId:d.itemId||'',itemNome:d.itemNome||'',tipo:d.tipoPedidoCliente||'',titulo:d.titulo||'Pedido do cliente',pedido:d.descricao||'',status:d.status||'a_conferir',destinatario:d.destinatario,prazoData:d.prazoData||'',prazoHora:d.prazoHora||'',origem:{colecao:d.origemAvisoColecao||'',id:d.origemAvisoId||''},historicoRegistros:Array.isArray(d.historico)?d.historico.length:0,etapa:d.status==='concluida_aguardando_aprovacao'?'revisao_amanda':'correcao',mesmaDemanda:true});
  }
  rows.sort((a,b)=>(a.prazoData||'9999').localeCompare(b.prazoData||'9999')||a.demandaId.localeCompare(b.demandaId));
  return {schema:1,ajustes:rows,total:rows.length,consultaCompleta:true,leituraNaoConclui:true,fluxo:'Chris corrige no conteúdo original; Amanda revisa. Devolução e reenvio conservam o pedido, o motivo e o histórico.'};
 });
}
