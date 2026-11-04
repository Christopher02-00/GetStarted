/* Destino operacional de entradas do cliente. Não altera autoria, conteúdo ou revisão. */
const editoriais = new Set(['ajuste_calendario','observacao_calendario','comentario_calendario','pedido_calendario','referencia_cliente','ideia_cliente']);
const legendas = new Set(['pedido_legenda','ajuste_legenda','legenda','correcao_legenda']);
export function roteamentoPedidoClienteCp151(entrada, caixa){
  if(!entrada || typeof entrada!=='object' || !['avisos_do_cliente','pedidos_publicos'].includes(caixa))throw Error('A origem deste pedido precisa ser conferida.');
  const pretendido=String(entrada.paraQuem||entrada.destinatario||'Amanda').trim()||'Amanda';
  const tipo=String(entrada.tipo||'').trim();
  const legenda=legendas.has(tipo);
  // Os formulários anteriores ofereciam Gabrielle para estratégia/roteiro e referências.
  // Esta compatibilidade só se aplica às duas caixas de clientes, nunca às tarefas internas.
  const legado=!tipo&&pretendido==='Gabrielle';
  const editorial=!legenda&&(editoriais.has(tipo)||legado);
  // O aviso de coordenação do I35 anterior continua histórico, sem virar uma segunda tarefa Chris.
  const coordenacaoLegada=tipo==='observacao_calendario'&&pretendido==='Amanda'&&String(entrada.operationId||'').startsWith('cal_obs_i35_');
  return {pretendido,tipo,legenda,editorial,legado,destinatario:legenda?'Gabrielle':editorial&&!coordenacaoLegada?'Chris':pretendido};
}
export function reencaminhamentoPedidoClienteCp151(entrada, demanda, caixa, entradaId){
  const rota=roteamentoPedidoClienteCp151(entrada,caixa);
  if(!rota.editorial||rota.destinatario!=='Chris'||demanda?.destinatario!=='Gabrielle'||!['pendente','em_andamento'].includes(demanda.status)||demanda.excluido||demanda.arquivado)return false;
  if(demanda.origem!=='cliente'||demanda.origemAvisoColecao!==caixa||demanda.origemAvisoId!==entradaId)throw Error('O vínculo original do pedido precisa de conferência.');
  const cliente=String(entrada.cliente||entrada.clienteSlug||entrada.slug||'');
  if(String(demanda.clienteSlug||demanda.cliente||'')!==cliente||String(demanda.operationId||'')!==String(entrada.operationId||'')||(demanda.tipoPedidoCliente&&String(demanda.tipoPedidoCliente)!==rota.tipo))throw Error('A identidade do pedido mudou. Nenhum responsável foi alterado.');
  if(String(demanda.competencia||'')!==String(entrada.competencia||entrada.mes||entrada.mesRef||'')||String(demanda.itemId||'')!==String(entrada.itemId||'')||String(demanda.demandaClienteId||'')!==String(entrada.demandaClienteId||''))throw Error('O conteúdo ou o mês deste pedido mudou. Confira o vínculo antes de continuar.');
  return true;
}
