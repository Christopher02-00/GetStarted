// RPR5 — CP202 (11/11/2026, Bluefit/Place/Divina 2026-11): pedido feito pelo CLIENTE → Chris corrige → Amanda aprova →
// Amanda libera ao cliente. Antes: o mês ficava em `ajuste_interno` (por 'Cliente') e "Liberar correções ao cliente" nunca
// aparecia (CP121 exigia `liberado`), o envio do mês inteiro ficava bloqueado (CP182) — mês travado.
// Roda depois do RPR3, sobre o mesmo mês que ele publicou. Servidor real (Admin SDK + Firestore local), sem atalho de estado.
import assert from 'node:assert/strict';
import {backend, moduleURL} from './runtime.mjs';

export async function runReliberacaoClienteCp202() {
  const b = await backend();
  const editorial = await import(moduleURL('functions-get/editorial-calendarios-i172.mjs'));
  const ajustes = await import(moduleURL('functions-get/ajustes-calendarios-cp112.mjs'));
  const intake = await import(moduleURL('functions-get/recepcao-pedidos-cliente-cp175.mjs'));
  const {avisoPedidoAjusteCp193} = await import(moduleURL('functions-get/pedido-ajuste-cliente-cp193.mjs'));
  const {FieldValue} = await import('firebase-admin/firestore');
  const ciclo = '2026-11__qa-cliente', mes = '2026-11', origemEditorial = 'continuar_legado';
  const agora = new Date('2026-11-04T12:00:00Z'), em = agora.toISOString();
  let n = 0;
  const call = async (role, acao, dados = {}) => {
    const a = b.actors[role], auth = {uid: a.uid, token: {email: a.email, email_verified: true, firebase: {sign_in_provider: 'google.com'}}};
    const pedido = {acao, ...dados, uidEsperado: a.uid, atorRealEsperado: role, papelOperado: role, sessao: 'rpr_' + role};
    const raw = acao.startsWith('central_editor_')
      ? await editorial.operarEditorialCalendariosI172(b.db, auth, pedido, {agora})
      : await ajustes.operarAjustesCalendariosCp112(b.db, auth, pedido, {agora, fontesEditorialTx: editorial.fontesTx});
    return b.decode(raw);
  };
  const op = () => 'rpr5_cp202_' + String(++n).padStart(3, '0');
  const ref = b.db.doc('calendarios/qa-cliente');
  let cal = (await ref.get()).data();
  assert.equal(cal.aprovacaoMeses[mes].status, 'liberado', 'O RPR3 deixa o mês publicado pela Amanda');

  // 1) O cliente pede ajuste num conteúdo (mesma gravação e mesmo aviso do servidor CP193) e a recepção cria a demanda.
  const idx = cal.items.findIndex(i => i.itemId === 'calitem_cp157_aprovacao_03'), item = cal.items[idx];
  const operationId = 'cal_ajuste_v113_' + 'c2'.repeat(24), texto = 'Trocar a chamada final deste vídeo (pedido do cliente, RPR5).';
  const anterior = cal.aprovacaoMeses[mes];
  const marca = {...anterior, status: 'ajuste_interno', mes, por: 'Cliente', em, motivoAjuste: texto, pedidoAjusteOperationId: operationId,
    pedidoAjusteItemId: item.itemId, pedidoAjusteItemIdx: idx, liberadoEmAnterior: String(anterior.em || anterior.aprovadoEm || ''), liberadoPorAnterior: String(anterior.por || anterior.enviadoPor || '')};
  const pedido = {schemaVersion: 1, operationId, calendarId: 'qa-cliente', competencia: mes, itemId: item.itemId, itemIdx: idx, itemNome: item.name, texto,
    por: 'Cliente', autorUid: 'rpr_cliente', criadoEm: em, registradoEm: FieldValue.serverTimestamp()};
  await ref.update({aprovacaoMeses: {...cal.aprovacaoMeses, [mes]: marca}, pedidoAjusteCliente: pedido,
    pedidosAjusteClienteI71: {...(cal.pedidosAjusteClienteI71 || {}), [operationId]: pedido}, updatedAt: em});
  await b.db.doc('avisos_do_cliente/' + operationId).create(avisoPedidoAjusteCp193({slug: 'qa-cliente', nome: String(cal.client), item, itemNome: String(item.name),
    texto, operationId, competencia: mes, itemId: item.itemId, alvo: {indice: idx, item}, agora: em, fb: {serverTimestamp: () => FieldValue.serverTimestamp()}}));
  const recebidos = await intake.executarRecepcaoPedidosClienteCp175(b.db, {agora, limite: 40});
  assert.deepEqual(recebidos.erros.filter(x => x.origem === operationId), [], 'A recepção aceita o pedido deste cliente (os avisos inválidos do RPR4 seguem recusados)');

  // 2) Chris abre o mês, corrige o conteúdo no calendário e registra o trabalho do pedido.
  let d = await call('Chris', 'central_editor_ler', {ciclo, origemEditorial});
  d = await call('Chris', 'central_editor_iniciar', {ciclo, origemEditorial, operacao: op(), esperadaRevisao: d.ciclo.revisao, pecas: [], confirmarDelta: false});
  d = await call('Chris', 'central_editor_ler', {ciclo, origemEditorial});
  const novaDesc = 'Roteiro corrigido conforme o pedido do cliente (RPR5).';
  d = await call('Chris', 'central_editor_salvar', {ciclo, origemEditorial, operacao: op(), assinaturaEsperada: d.assinatura, itens: [{itemId: item.itemId, mes, desc: novaDesc}], excluirIds: [], blocos: null});
  let p = await call('Chris', 'ajuste_calendario_ler_cp112', {ciclo, origemEditorial}), a = p.ajustes.find(x => x.operationId === operationId);
  assert(a && a.capacidades.salvar, 'O pedido do cliente chega ao Chris');
  p = await call('Chris', 'ajuste_calendario_salvar_cp112', {ciclo, origemEditorial, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura,
    justificativa: 'Ajustado como pedido.', execucao: 'Chamada final reescrita no roteiro.', dependencia: ''});
  a = p.ajustes.find(x => x.operationId === operationId);
  assert(a.capacidades.enviar, 'Com o conteúdo corrigido e o trabalho registrado, o Chris envia à Amanda');
  p = await call('Chris', 'ajuste_calendario_enviar_cp112', {ciclo, origemEditorial, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura});

  // 3) Amanda aprova o pedido individual.
  p = await call('Amanda', 'ajuste_calendario_ler_cp112', {ciclo, origemEditorial}); a = p.ajustes.find(x => x.operationId === operationId);
  assert(a.capacidades.aprovar, 'Amanda recebe o pedido enviado');
  p = await call('Amanda', 'ajuste_calendario_decidir_cp112', {ciclo, origemEditorial, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, decisao: 'aprovar', motivo: ''});
  assert.equal(p.ajustes.find(x => x.operationId === operationId).status, 'aprovado');
  assert.equal((await ref.get()).data().aprovacaoMeses[mes].status, 'ajuste_interno', 'Aprovar o pedido não libera sozinho');

  // 4) Amanda vê "Liberar correções ao cliente" (o defeito) e libera.
  d = await call('Amanda', 'central_editor_ler', {ciclo, origemEditorial});
  assert(d.reliberacaoCp121?.disponivel, 'Com todos os pedidos aprovados, Amanda precisa ver "Liberar correções ao cliente" mesmo com o mês em ajuste pedido pelo cliente: ' + JSON.stringify(d.reliberacaoCp121));
  await call('Amanda', 'central_editor_decidir', {ciclo, origemEditorial, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao,
    decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura});
  cal = (await ref.get()).data();
  const m = cal.aprovacaoMeses[mes], publicado = m.retratoLiberadoV115.items.find(i => i.itemId === item.itemId);
  assert.equal(m.status, 'liberado', 'O mês volta a liberado');
  assert.equal(publicado.desc, novaDesc, 'A correção aparece para o cliente');
  p = await call('Amanda', 'ajuste_calendario_ler_cp112', {ciclo, origemEditorial});
  assert.equal(p.ajustes.find(x => x.operationId === operationId).status, 'historico', 'O pedido vira histórico publicado');
  return {pedidoDoCliente: operationId, mesAntes: 'ajuste_interno', liberacaoDisponivel: true, mesDepois: m.status, correcaoNoRetrato: true,
    qualification: 'Admin SDK + Firestore local; ações reais do servidor (editor, CP112, recepção CP175); pedido do cliente com a mesma gravação do CP193.'};
}
