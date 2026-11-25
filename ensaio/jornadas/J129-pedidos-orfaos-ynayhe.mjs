// J129 — CP274 (25/11/2026, ordem do Chris; ok nominal: "Fechar os 3 no calendário"). Caso real (export 25/11): as 3 demandas de entrada
// da Ynayhe de out/2026 (Gabrielle, saiu da equipe) estão arquivadas desde 09/10, mas o calendário guarda os 3 pedidos abertos e o mês
// 2026-10 em "ajuste_interno" pelo Cliente → "A demanda não confirma o pedido". Esperado, na rodada da faxina, com o mesmo formato real:
//  1. os 3 pedidos de outubro ficam cancelados (cancelamentoCp143 com o motivo da ordem); o pedido de novembro não é tocado;
//  2. sem pedido aberto, outubro vira "arquivado" (manual) guardando a marca anterior; nada é apagado;
//  3. os avisos do cliente ficam cancelados e as demandas ganham a nota (sem regravar o arquivamento da Amanda);
//  4. repetir não muda nada.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { adminDb } from '../lib/chegada.mjs';
export const id = 'J129';
export const nome = 'Pedidos órfãos da Ynayhe de out/2026 fecham no calendário pela faxina (lista autorizada), sem apagar nada';

const OPS = ['cal_ajuste_v113_de88b43e0ca9e1b1dee1670ff0cb9aaa6272808fa5d941c6', 'cal_ajuste_v113_f1cf3d65392517d3968bb0faff13a21642925cd144f5c87c', 'cal_ajuste_v113_8193f427d6c57a2a949b5da837774d13a62624dd3c40faca'];
const DEMS = ['entrada_i54_5f01d1700250af3d913564137cfd6143dd809ec3f339e1749ff0cadbcaea0111', 'entrada_i54_b05467341609620b373a7d724a19127675162cbefebd553b90b49af0bf3dd796', 'entrada_i54_ba111fe5e002a27b0fcf7b540b824883848eabe54e5d5614a1dc39ed7b2df0f0'];
const NOV = 'cal_ajuste_v113_j129novembro000000000000000000000000000000000000';

export async function executar({ amb, seed, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const pedido = (op, comp, item) => ({ schemaVersion: 1, operationId: op, calendarId: 'ynayhe', competencia: comp, por: 'Cliente', itemId: item, itemIdx: 0, texto: 'Ensaio J129', criadoEm: '2026-10-06T13:00:00.000Z' });
  const mapa = Object.fromEntries([...OPS.map((op, i) => [op, pedido(op, '2026-10', 'calitem_j129_' + i)]), [NOV, pedido(NOV, '2026-11', 'calitem_j129_nov')]]);
  await seed.set('calendarios', 'ynayhe', { cliente: 'ynayhe', client: 'Ynayhe', items: [], pedidosAjusteClienteI71: mapa, pedidoAjusteCliente: mapa[OPS[1]],
    aprovacaoMeses: { '2026-10': { status: 'ajuste_interno', por: 'Cliente', em: '2026-10-06T13:00:00.000Z', pedidoAjusteOperationId: OPS[1], mes: '2026-10' }, '2026-11': { status: 'liberado', por: 'Amanda', em: '2026-11-01T12:00:00.000Z' } } });
  for (const [i, op] of OPS.entries()) {
    await seed.set('avisos_do_cliente', op, { tipo: 'ajuste_calendario', operationId: op, cliente: 'ynayhe', competencia: '2026-10', demandaInternaId: DEMS[i], itemId: 'calitem_j129_' + i, criadoEm: new Date() });
    await seed.set('demandas', DEMS[i], { origem: 'cliente', tipoPedidoCliente: 'ajuste_calendario', cliente: 'ynayhe', clienteSlug: 'ynayhe', competencia: '2026-10', destinatario: 'Gabrielle', status: 'pendente',
      excluido: true, excluidoPor: 'Amanda', excluidoEm: '2026-10-09T13:37:16.624Z', motivoExclusao: 'motivo original da Amanda (J129)', titulo: 'Ynayhe pediu ajuste (J129) ' + i, operationId: op, criadoEm: new Date() });
  }
  try {
    const db = adminDb(amb);
    const fx = await import(pathToFileURL(path.join(RAIZ, 'functions-get/faxina-diaria-cp248.mjs')).href);
    await fx.executarFaxinaCp248(db, { gravarRelatorio: false });
    const cal = (await db.doc('calendarios/ynayhe').get()).data() || {}, ped = cal.pedidosAjusteClienteI71 || {};
    const cancelados = OPS.filter(op => ped[op]?.cancelamentoCp143?.cp274 === true && /arquivado por ordem do Chris/.test(ped[op].cancelamentoCp143.motivo || ''));
    fim('1 os 3 pedidos de outubro ficam cancelados com o motivo da ordem; o de novembro não é tocado', cancelados.length === 3 && !ped[NOV]?.cancelamentoCp143 && cal.pedidoAjusteCliente?.cancelamentoCp143?.cp274,
      `cancelados ${cancelados.length}/3 · novembro ${ped[NOV]?.cancelamentoCp143 ? 'TOCADO' : 'intacto'} · atalho ${cal.pedidoAjusteCliente?.cancelamentoCp143 ? 'cancelado' : 'aberto'}`);
    const m10 = cal.aprovacaoMeses?.['2026-10'] || {}, m11 = cal.aprovacaoMeses?.['2026-11'] || {};
    fim('2 outubro vira arquivado (manual) guardando a marca anterior; novembro intacto; nada apagado',
      m10.status === 'arquivado' && m10.arquivamentoManual === true && m10.anteriorCp274?.status === 'ajuste_interno' && m10.anteriorCp274?.por === 'Cliente' && m11.status === 'liberado' && Object.keys(ped).length === 4,
      `outubro ${m10.status} (antes ${m10.anteriorCp274?.status}/${m10.anteriorCp274?.por}) · novembro ${m11.status} · pedidos no calendário ${Object.keys(ped).length}`);
    const avs = await Promise.all(OPS.map(op => db.doc('avisos_do_cliente/' + op).get())), dms = await Promise.all(DEMS.map(d => db.doc('demandas/' + d).get()));
    fim('3 avisos cancelados; demandas com a nota e o arquivamento da Amanda preservado',
      avs.every(a => a.data()?.cancelado === true) && dms.every(d => d.data()?.arquivamentoCp274?.jaArquivadaAntes === true && d.data()?.excluidoPor === 'Amanda' && /Amanda/.test(d.data()?.motivoExclusao || '')),
      `avisos cancelados ${avs.filter(a => a.data()?.cancelado === true).length}/3 · demandas com nota ${dms.filter(d => d.data()?.arquivamentoCp274).length}/3 · excluidoPor ${dms.map(d => d.data()?.excluidoPor).join(',')}`);
    const antes = JSON.stringify(cal);
    await fx.executarFaxinaCp248(db, { gravarRelatorio: false });
    const depois = JSON.stringify((await db.doc('calendarios/ynayhe').get()).data() || {});
    fim('4 repetir não muda nada', antes === depois, antes === depois ? 'igual' : 'MUDOU');
  } catch (e) { fim('pedidos órfãos da Ynayhe', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  await amb.aguardarFunctionsOciosas?.(); // os gatilhos do calendário terminam antes da próxima jornada
}
