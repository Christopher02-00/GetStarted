// CP274 (25/11/2026, ordem do Chris; ok nominal na caixa de perguntas: "Fechar os 3 no calendário"). As 3 demandas de entrada (I54) dos
// pedidos da Ynayhe de outubro/2026 (para a Gabrielle, que saiu da equipe) já estão arquivadas desde 09/10 pela Amanda, mas o calendário
// ainda guardava os 3 pedidos abertos e o mês 2026-10 em "ajuste_interno" pelo Cliente desde 06/10 → "A demanda não confirma o pedido"
// e o editor de outubro não abre. ENCERRAMENTO AUTORIZADO (uma vez, lista fechada): na rodada da faxina CP248, cada pedido da lista recebe
// `cancelamentoCp143` (o MESMO formato do cancelamento de pedido), o aviso do cliente fica `cancelado`, a demanda ganha a nota da ordem
// (sem regravar o arquivamento da Amanda) e, sem pedido aberto no mês, a marca 2026-10 vira `arquivado` (manual) guardando a anterior em
// `anteriorCp274`. Nada é apagado. Pedido fora da lista, de outro mês ou com demanda viva nunca é tocado. Idempotente (transação relê tudo).
// Desfazer: tirar `cancelamentoCp143` dos 3 pedidos/avisos e voltar a marca do mês para `anteriorCp274`.
export const MOTIVO_CP274 = 'Pedido órfão de out/2026; responsável saiu da equipe; arquivado por ordem do Chris (25/11/2026).';
export const POR_CP274 = 'Sistema (ordem do Chris, 25/11/2026)';
export const AUTORIZADOS_CP274 = Object.freeze([Object.freeze({
  cliente: 'ynayhe', competencia: '2026-10', pedidos: Object.freeze([
    {operationId: 'cal_ajuste_v113_de88b43e0ca9e1b1dee1670ff0cb9aaa6272808fa5d941c6', demandaId: 'entrada_i54_5f01d1700250af3d913564137cfd6143dd809ec3f339e1749ff0cadbcaea0111'},
    {operationId: 'cal_ajuste_v113_f1cf3d65392517d3968bb0faff13a21642925cd144f5c87c', demandaId: 'entrada_i54_b05467341609620b373a7d724a19127675162cbefebd553b90b49af0bf3dd796'},
    {operationId: 'cal_ajuste_v113_8193f427d6c57a2a949b5da837774d13a62624dd3c40faca', demandaId: 'entrada_i54_ba111fe5e002a27b0fcf7b540b824883848eabe54e5d5614a1dc39ed7b2df0f0'},
  ])
})]);
const ENCERRADA = ['aprovada', 'cancelada', 'cancelado'];

/** Um alvo (cliente + mês + pedidos autorizados) numa transação. */
export async function encerrarAlvoCp274(db, alvo, {agora = new Date()} = {}) {
  const calRef = db.doc('calendarios/' + alvo.cliente);
  return db.runTransaction(async tx => {
    const cs = await tx.get(calRef);
    if (!cs.exists) return {acao: 'nada', motivo: 'calendário não existe'};
    const dRefs = alvo.pedidos.map(p => db.doc('demandas/' + p.demandaId)), aRefs = alvo.pedidos.map(p => db.doc('avisos_do_cliente/' + p.operationId));
    const ds = await Promise.all(dRefs.map(r => tx.get(r))), avs = await Promise.all(aRefs.map(r => tx.get(r)));
    const cal = cs.data() || {}, mapa = {...(cal.pedidosAjusteClienteI71 || {})}, em = agora.toISOString(), fechados = [];
    const meta = p => ({schema: 1, estado: 'cancelado', operationId: p.operationId, demandaId: p.demandaId, motivo: MOTIVO_CP274, por: 'Chris', atorReal: POR_CP274, em, cp274: true});
    alvo.pedidos.forEach((p, i) => {
      const atual = mapa[p.operationId], d = ds[i].exists ? ds[i].data() : null;
      if (!atual || atual.operationId && atual.operationId !== p.operationId || atual.competencia !== alvo.competencia || atual.cancelamentoCp143) return;
      if (d && d.excluido !== true && !ENCERRADA.includes(d.status)) return; // demanda viva: não é órfão, não toca
      mapa[p.operationId] = {...atual, cancelamentoCp143: meta(p)}; fechados.push(p.operationId);
      if (avs[i].exists && avs[i].data().cancelado !== true) tx.update(aRefs[i], {cancelado: true, cancelamentoCp143: meta(p)});
      if (d && !d.arquivamentoCp274) tx.update(dRefs[i], {arquivamentoCp274: {schema: 1, motivo: MOTIVO_CP274, em, por: POR_CP274, jaArquivadaAntes: d.excluido === true}});
    });
    const patch = {};
    if (fechados.length) patch.pedidosAjusteClienteI71 = mapa;
    const atalho = cal.pedidoAjusteCliente, pAtalho = atalho && alvo.pedidos.find(p => p.operationId === atalho.operationId);
    if (pAtalho && atalho.competencia === alvo.competencia && !atalho.cancelamentoCp143 && (fechados.includes(pAtalho.operationId) || mapa[pAtalho.operationId]?.cancelamentoCp143)) patch.pedidoAjusteCliente = {...atalho, cancelamentoCp143: meta(pAtalho)};
    const marca = (cal.aprovacaoMeses || {})[alvo.competencia];
    const abertosMes = Object.values(mapa).filter(p => p && p.competencia === alvo.competencia && !p.cancelamentoCp143);
    if (marca && marca.status === 'ajuste_interno' && !abertosMes.length)
      patch['aprovacaoMeses.' + alvo.competencia] = {...marca, status: 'arquivado', arquivamentoManual: true, por: 'Chris', em, motivoArquivamento: MOTIVO_CP274,
        anteriorCp274: {status: marca.status, por: marca.por || '', em: marca.em || '', pedidoAjusteOperationId: marca.pedidoAjusteOperationId || ''}};
    if (!Object.keys(patch).length) return {acao: 'nada'};
    tx.update(calRef, {...patch, updatedAt: em});
    return {acao: 'encerrado', pedidos: fechados, mesArquivado: !!patch['aprovacaoMeses.' + alvo.competencia]};
  });
}

/** Rodada (faxina): só a lista autorizada. Nunca para no primeiro erro. */
export async function executarPedidosOrfaosCp274(db, {agora = new Date(), alvos = AUTORIZADOS_CP274} = {}) {
  const feitos = [], erros = [];
  for (const a of alvos) {
    try { const r = await encerrarAlvoCp274(db, a, {agora}); if (r.acao === 'encerrado') feitos.push({cliente: a.cliente, competencia: a.competencia, ...r}); }
    catch (e) { erros.push({id: a.cliente + '#' + a.competencia, etapa: 'pedidos_orfaos_cp274', erro: String(e?.message || e).slice(0, 200)}); }
  }
  return {feitos, erros};
}
