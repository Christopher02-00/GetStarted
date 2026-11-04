import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {backend, DIR, read, moduleURL, sha} from './runtime.mjs';

// Producer literals are evaluated with synthetic identities. Do not add consumer-only
// fields: absent keys and compound document IDs are part of these four contracts.
function literal(source, start) {
  const at = source.indexOf(start);
  assert(at >= 0 && source.indexOf(start, at + start.length) < 0, 'Producer anchor must be unique: ' + start);
  const a = source.indexOf('{', at);
  let depth = 0, quote = '', escaped = false;
  for (let i = a; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === quote) quote = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return source.slice(a, i + 1);
  }
  throw Error('Producer object must close');
}
function evaluate(object, env) {
  return {...vm.runInNewContext('(' + object + ')', env)};
}
const expectedId = sourceId => 'entrada_i54_' + sha(JSON.stringify(['avisos_do_cliente', sourceId]));
const record = s => ({data: s.data(), create: s.createTime && [s.createTime.seconds, s.createTime.nanoseconds], update: s.updateTime && [s.updateTime.seconds, s.updateTime.nanoseconds]});

export async function runClientIntake() {
  const b = await backend();
  const {FieldValue} = await import('firebase-admin/firestore');
  const intake = await import(moduleURL('functions-get/recepcao-pedidos-cliente-cp175.mjs'));
  const {sincronizarPedidosClienteCp175} = await import(moduleURL('functions-get/central/notificacoes.mjs'));
  const calendarSource = read('calendario.html'), portalSource = read('portal-cliente.html');
  const expressions = {
    v113: literal(calendarSource, 'const aviso={cliente:slug,'),
    cp151: literal(calendarSource, "tx.set(avisoRef,{\n        cliente,clienteNome:nome,titulo:"),
    i35: literal(calendarSource, "tx.set(fb.doc(fb.db,'avisos_do_cliente',operationId+'_chris'),"),
    cp152: literal(portalSource, 'tx.set(avisoRef,{...identidadePedido,')
  };
  const calRef = b.db.doc('calendarios/qa-cliente');
  if (!(await calRef.get()).exists) {
    const fixture = JSON.parse(fs.readFileSync(path.join(DIR, 'fixtures/privado-calendario-ficticio.json')));
    await calRef.create(fixture['calendarios/qa-cliente']);
  }
  const calendarBefore = record(await calRef.get());
  const item = calendarBefore.data.items[0], itemId = item.itemId;
  assert(itemId, 'Synthetic calendar must contain the actual stable content ID');
  const month = '2026-11', now = new Date('2026-11-04T04:00:00Z');
  function producer(kind, n) {
    const hex = n.toString(16).padStart(48, '0'), uid = 'qa_portal_user';
    const operationId = kind === 'v113' ? 'cal_ajuste_v113_' + hex : kind === 'i35' ? 'cal_obs_i35_' + hex.slice(-32) : 'qa_comentario_' + n;
    const sourceId = kind === 'cp151' ? 'cal_recado_cp151_' + operationId : kind === 'i35' ? operationId + '_chris' : kind === 'cp152' ? 'portal_pedido_cp152_' + uid + '_' + hex.slice(-32) : operationId;
    const common = {autorUid: uid, protocoloCriacaoCp152: sourceId, criadoEm: FieldValue.serverTimestamp()};
    const env = {
      slug: 'qa-cliente', cliente: 'qa-cliente', nome: '[LAB RPR] qa-cliente',
      servidor: {client: '[LAB RPR] qa-cliente'}, data: {}, window: {nomeClienteCalendarioR4: x => x},
      fb: {serverTimestamp: () => FieldValue.serverTimestamp()}, operationId, competencia: month,
      itemId, itemNome: item.name, alvo: {indice: 0, item}, texto: 'Pedido fictício completo ' + n,
      txt: 'Comentário fictício ' + n, registro: {id: operationId, mes: month, date: now.toISOString()},
      item, mes: month, paraQuem: 'Chris', agora: now.toISOString(),
      identidadePedido: {cliente: 'qa-cliente', clienteNome: '[LAB RPR] qa-cliente'},
      pedidoTexto: 'Pedido geral fictício sem mês ' + n, destino: 'Chris', assunto: 'pedido_calendario', op: {id: sourceId}, comum: common
    };
    const body = evaluate(expressions[kind], env);
    for (const key of ['schemaVersion', 'calendarId']) assert(!Object.hasOwn(body, key), kind + ' producer does not emit ' + key);
    if (kind === 'cp152') for (const key of ['operationId', 'competencia', 'itemId', 'itemNome']) assert(!Object.hasOwn(body, key), 'General request must not invent ' + key);
    if (kind === 'cp151') assert.equal(sourceId, 'cal_recado_cp151_' + body.comentarioId);
    if (kind === 'i35') assert.equal(sourceId, body.operationId + '_chris');
    return {kind, sourceId, body, id: expectedId(sourceId)};
  }
  const kinds = ['v113', 'cp151', 'i35', 'cp152'];
  const prior = kinds.map((kind, i) => producer(kind, i + 1));
  for (const p of prior) {
    const a = p.body;
    // Independent preexisting I54 oracle, not the consumer's constructor.
    await b.db.doc('demandas/' + p.id).create({titulo: a.titulo, descricao: a.descricao, destinatario: 'Chris', origem: 'cliente', cliente: 'qa-cliente', clienteSlug: 'qa-cliente', origemAvisoColecao: 'avisos_do_cliente', origemAvisoId: p.sourceId, operationId: a.operationId || '', competencia: a.competencia || '', itemId: a.itemId || '', itemNome: a.itemNome || '', tipoPedidoCliente: a.tipo, conversaoVersao: 'i54', status: 'pendente', criadoEm: now.toISOString()});
    await b.db.doc('avisos_do_cliente/' + p.sourceId).create({...a, lido: true, demandaInternaId: p.id, conversaoVersao: 'i54'});
  }
  const existingBefore = Object.fromEntries(await Promise.all(prior.flatMap(p => ['demandas/' + p.id, 'avisos_do_cliente/' + p.sourceId]).map(async name => [name, record(await b.db.doc(name).get())])));
  const sync = async () => {
    const result = await sincronizarPedidosClienteCp175(b.db, {agora: now, canais: [], limite: 40});
    assert.deepEqual(result.erros, [], 'All four actual producer contracts must reach the same Chris notice');
    return result;
  };
  await sync();
  const notes = async () => (await b.db.collection('notificacoes_operacionais_i165').where('origem.tipo', '==', 'pedido_cliente').get()).docs;
  let visible = await notes();
  assert.equal(visible.length, 4, 'Four preexisting official I54s must become four notices');
  for (const p of prior) assert(visible.some(s => s.data().origem.id === p.id && s.data().destinatario === 'Chris'));
  const fresh = kinds.map((kind, i) => producer(kind, i + 11));
  for (const p of fresh) await b.db.doc('avisos_do_cliente/' + p.sourceId).create(p.body);
  const received = await intake.executarRecepcaoPedidosClienteCp175(b.db, {agora: now, limite: 40});
  assert.deepEqual(received.erros, []);
  assert.equal(received.recebidas, 4);
  assert.deepEqual([...received.demandaIds].sort(), fresh.map(p => p.id).sort(), 'Receipt IDs are SHA of source document IDs, not operation IDs');
  for (const p of fresh) {
    const d = (await b.db.doc('demandas/' + p.id).get()).data(), a = (await b.db.doc('avisos_do_cliente/' + p.sourceId).get()).data();
    assert.equal(d.origemAvisoId, p.sourceId); assert.equal(d.operationId, p.body.operationId || '');
    assert.equal(d.competencia, p.body.competencia || ''); assert.equal(d.itemId, p.body.itemId || '');
    assert.equal(a.demandaInternaId, p.id); assert.equal(a.lido, true); assert.equal(d.status, 'pendente');
  }
  await sync();
  visible = await notes(); assert.equal(visible.length, 8);
  const noteIds = visible.map(s => s.id).sort();
  const deliveredBefore = Object.fromEntries(await Promise.all(fresh.flatMap(p => ['demandas/' + p.id, 'avisos_do_cliente/' + p.sourceId]).map(async name => [name, record(await b.db.doc(name).get())])));
  const replay = await intake.executarRecepcaoPedidosClienteCp175(b.db, {agora: now, limite: 40});
  assert.deepEqual(replay.erros, []); assert.equal(replay.recebidas, 0);
  await sync(); assert.deepEqual((await notes()).map(s => s.id).sort(), noteIds);
  for (const [name, before] of Object.entries({...existingBefore, ...deliveredBefore})) assert.deepEqual(record(await b.db.doc(name).get()), before, 'Replay must preserve same source and I54 body/timestamps');
  assert.deepEqual(record(await calRef.get()), calendarBefore, 'Intake and notices cannot alter calendar or publication');
  const unknown = producer('v113', 99);
  unknown.body.schemaVersion = 999;
  await b.db.doc('avisos_do_cliente/' + unknown.sourceId).create(unknown.body);
  await assert.rejects(() => intake.receberPedidoClienteTxCp175(b.db, unknown.sourceId, {agora: now}), /versão|identificação/);
  assert.equal((await b.db.doc('demandas/' + unknown.id).get()).exists, false);
  assert.equal((await b.db.doc('avisos_do_cliente/' + unknown.sourceId).get()).data().lido, false);
  const malformed = producer('cp151', 100), wrongId = malformed.sourceId + '_divergente';
  await b.db.doc('avisos_do_cliente/' + wrongId).create(malformed.body);
  await assert.rejects(() => intake.receberPedidoClienteTxCp175(b.db, wrongId, {agora: now}), /operação|origem/);
  assert.equal((await b.db.doc('demandas/' + expectedId(wrongId)).get()).exists, false);
  return {producerLiterals: kinds, absentSchemaAndCalendarId: true, compoundIdsPreserved: true, existingI54: 4, receivedI54: 4, sameNotices: 8, replaysDidNotDuplicate: true, priorAndDeliveredSourcesAndI54WholeWithTimes: 16, unknownExplicitVersionRefused: true, malformedCompoundIdRefused: true, calendarWholeWithTimesPreserved: true, producerHashes: {calendario: sha(calendarSource), portal: sha(portalSource)}, qualification: 'Four actual producer object literals with anonymous synthetic arguments; AdminSDK and loopback Firestore. No production, personal account, push delivery, full browser journey or B01–B10 claim.'};
}
