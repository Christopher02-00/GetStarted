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
  const [snap,roteiros]=await Promise.all([tx.get(db.collection('demandas').where('origem','==','cliente').limit(501)),tx.get(db.collection('demandas').where('destinatario','==','Chris').limit(501))]);
  exigir(snap.size<=500&&roteiros.size<=500,'Há mais pedidos do que esta conferência comporta. A lista não foi cortada.');
  const unicos=new Map([...snap.docs,...roteiros.docs].map(s=>[s.id,s]));
  const rows=[];
  for(const s of unicos.values()){const d=s.data(),p=d.planejamentoCp109||d.planejamentoI155||d.organizacaoI167||{},cliente=d.clienteSlug||d.cliente||p.cliente||'',competencia=d.competencia||p.competencia||'',ajuste=s.id.startsWith('entrada_i54_')&&d.origem==='cliente',roteiro=d.destinatario==='Chris'&&['planejamento_estrategico_cp109','planejamento_social_i155','organizacao_social_i167'].includes(d.tipoEspecial)&&p.cliente===cliente&&(!p.competencia||p.competencia===competencia);if((!ajuste&&!roteiro)||d.excluido||d.arquivado||finais.has(d.status)||!['Chris','Amanda'].includes(d.destinatario))continue;
   if(pedido.cliente&&cliente!==pedido.cliente||pedido.competencia&&competencia!==pedido.competencia)continue;
   const ciclo=/^[a-z0-9][a-z0-9._-]{0,119}$/.test(cliente)&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(competencia)?competencia+'__'+cliente:'';
   rows.push({demandaId:s.id,cliente,clienteNome:d.clienteNome||cliente,competencia,ciclo,compartilhado:true,responsaveisExecucao:['Chris','Amanda'],tipoFila:ajuste?'ajuste_cliente':'roteiros',itemId:d.itemId||'',itemNome:d.itemNome||'',tipo:d.tipoPedidoCliente||'',titulo:d.titulo||'Pedido do cliente',pedido:d.descricao||'',status:d.status||'a_conferir',destinatario:d.destinatario,prazoData:d.prazoData||'',prazoHora:d.prazoHora||'',origem:{colecao:d.origemAvisoColecao||'',id:d.origemAvisoId||''},historicoRegistros:Array.isArray(d.historico)?d.historico.length:0,etapa:d.status==='concluida_aguardando_aprovacao'?'revisao_amanda':'correcao',mesmaDemanda:true});
  }
  rows.sort((a,b)=>(a.prazoData||'9999').localeCompare(b.prazoData||'9999')||a.demandaId.localeCompare(b.demandaId));
  return {schema:1,ajustes:rows,total:rows.length,consultaCompleta:true,leituraNaoConclui:true,fluxo:'Chris e Amanda executam no mesmo conteúdo e pedido; a revisão e a liberação continuam explícitas. Devolução e reenvio conservam o pedido, o motivo e o histórico.'};
 });
}
