#!/usr/bin/env node

/*
 * Regressão dirigida V104 — correção financeira de setembro.
 *
 * Carrega o módulo financeiro real e substitui somente DOM, identidade e
 * Firestore por implementações sintéticas em memória. Nenhum dado real, rede
 * ou Firebase publicado participa deste ensaio.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Core from '../financeiro-core.mjs';
import { instalarFinanceiroV104 } from '../financeiro-ui-v104.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonteUi = fs.readFileSync(path.join(raiz, 'financeiro-ui-v104.mjs'), 'utf8');
const TELEFONE_SINTETICO_VISIVEL = '+55 11 98888-7777';
const TELEFONE_SINTETICO_CANONICO = '5511988887777';
const AGORA = new Date('2026-08-22T12:00:00-03:00');

let total = 0;

function verificar(condicao, mensagem) {
  total += 1;
  assert.ok(condicao, `V104 CORRECAO FINANCEIRA: ${mensagem}`);
  console.log('PASS ', mensagem);
}

function igual(atual, esperado, mensagem) {
  total += 1;
  assert.deepEqual(atual, esperado, `V104 CORRECAO FINANCEIRA: ${mensagem}`);
  console.log('PASS ', mensagem);
}

function clonar(valor) {
  if (valor instanceof Date) return new Date(valor.getTime());
  if (Array.isArray(valor)) return valor.map(clonar);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, clonar(item)]));
  }
  return valor;
}

function assinatura(valor) {
  const normalizar = item => {
    if (item instanceof Date) return { __date: item.toISOString() };
    if (Array.isArray(item)) return item.map(normalizar);
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.keys(item).sort().map(chave => [chave, normalizar(item[chave])]));
    }
    return item;
  };
  return JSON.stringify(normalizar(valor));
}

function refDocumento(colecao, id) {
  return { tipo: 'documento', colecao, id: String(id), path: `${colecao}/${id}` };
}

function refColecao(nome) {
  return { tipo: 'colecao', id: String(nome), path: String(nome) };
}

function snapshotDocumento(db, ref) {
  const existe = db.dados.has(ref.path);
  const dados = existe ? clonar(db.dados.get(ref.path)) : undefined;
  return {
    id: ref.id,
    ref,
    exists: () => existe,
    data: () => clonar(dados),
  };
}

function resolverValorFirestore(valor, anterior) {
  if (valor && valor.__firebaseOp === 'serverTimestamp') return new Date(AGORA.getTime());
  if (valor && valor.__firebaseOp === 'deleteField') return undefined;
  if (valor && valor.__firebaseOp === 'arrayUnion') {
    const base = Array.isArray(anterior) ? clonar(anterior) : [];
    for (const item of valor.valores) {
      if (!base.some(existente => assinatura(existente) === assinatura(item))) base.push(clonar(item));
    }
    return base;
  }
  if (Array.isArray(valor)) return valor.map(item => resolverValorFirestore(item));
  if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [
      chave,
      resolverValorFirestore(item, anterior?.[chave]),
    ]).filter(([, item]) => item !== undefined));
  }
  return clonar(valor);
}

function aplicarSet(db, ref, dados, merge) {
  const anterior = db.dados.get(ref.path) || {};
  const base = merge ? clonar(anterior) : {};
  for (const [chave, valor] of Object.entries(dados || {})) {
    const resolvido = resolverValorFirestore(valor, anterior[chave]);
    if (resolvido === undefined) delete base[chave];
    else base[chave] = resolvido;
  }
  db.dados.set(ref.path, base);
}

function criarBanco(documentos) {
  return {
    dados: new Map(Object.entries(documentos).map(([chave, valor]) => [chave, clonar(valor)])),
    filaTransacoes: Promise.resolve(),
    commits: [],
    getDocsCalls: [],
    getDocCalls: [],
    beforeTransactionOnce: null,
    failBeforeCommitOnce: false,
  };
}

function dependenciasFirestore(db) {
  const collection = (_db, nome) => refColecao(nome);
  const doc = (_db, colecao, id) => refDocumento(colecao, id);
  const getDocs = async ref => {
    db.getDocsCalls.push(ref.path);
    const prefixo = `${ref.path}/`;
    const docs = [...db.dados.entries()]
      .filter(([chave]) => chave.startsWith(prefixo) && !chave.slice(prefixo.length).includes('/'))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave]) => snapshotDocumento(db, refDocumento(ref.path, chave.slice(prefixo.length))));
    return { size: docs.length, empty: docs.length === 0, forEach: callback => docs.forEach(callback), docs };
  };
  const getDoc = async ref => {
    db.getDocCalls.push(ref.path);
    return snapshotDocumento(db, ref);
  };
  const setDoc = async (ref, dados, opcoes = {}) => {
    aplicarSet(db, ref, dados, opcoes.merge === true);
    db.commits.push({ tipo: 'setDoc', caminhos: [ref.path] });
  };
  const updateDoc = async (ref, dados) => {
    if (!db.dados.has(ref.path)) throw new Error(`Documento ausente: ${ref.path}`);
    aplicarSet(db, ref, dados, true);
    db.commits.push({ tipo: 'updateDoc', caminhos: [ref.path] });
  };
  const runTransaction = async (_db, callback) => {
    const executar = async () => {
      if (db.beforeTransactionOnce) {
        const gancho = db.beforeTransactionOnce;
        db.beforeTransactionOnce = null;
        await gancho(db);
      }
      const operacoes = [];
      const tx = {
        get: async ref => snapshotDocumento(db, ref),
        set: (ref, dados, opcoes = {}) => operacoes.push({ tipo: 'set', ref, dados: clonar(dados), merge: opcoes.merge === true }),
        update: (ref, dados) => operacoes.push({ tipo: 'update', ref, dados: clonar(dados), merge: true }),
      };
      const resultado = await callback(tx);
      if (db.failBeforeCommitOnce) {
        db.failBeforeCommitOnce = false;
        throw new Error('Falha sintética antes do commit');
      }
      for (const operacao of operacoes) {
        if (operacao.tipo === 'update' && !db.dados.has(operacao.ref.path)) {
          throw new Error(`Documento ausente: ${operacao.ref.path}`);
        }
      }
      for (const operacao of operacoes) aplicarSet(db, operacao.ref, operacao.dados, operacao.merge);
      if (operacoes.length) {
        db.commits.push({ tipo: 'transaction', caminhos: operacoes.map(operacao => operacao.ref.path) });
      }
      return resultado;
    };
    const pendente = db.filaTransacoes.then(executar, executar);
    db.filaTransacoes = pendente.catch(() => undefined);
    return pendente;
  };
  return {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    runTransaction,
    serverTimestamp: () => ({ __firebaseOp: 'serverTimestamp' }),
    deleteField: () => ({ __firebaseOp: 'deleteField' }),
    arrayUnion: (...valores) => ({ __firebaseOp: 'arrayUnion', valores: clonar(valores) }),
  };
}

function canonicalizarSlug(valor) {
  return String(valor || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function criarDom() {
  const elementos = new Map([
    ['financeiroCorrecoesV104Status', { id: 'financeiroCorrecoesV104Status', innerHTML: '', value: '' }],
    ['financeiroCorrecoesV103Status', { id: 'financeiroCorrecoesV103Status', innerHTML: '', value: '' }],
    ['financeiroCorrecoesFedaltoV104Status', { id: 'financeiroCorrecoesFedaltoV104Status', innerHTML: '', value: '' }],
    ['financeiroCorrecoesV104Acao', { id: 'financeiroCorrecoesV104Acao', innerHTML: '', value: '' }],
    ['correcaoZeissWhatsV104', { id: 'correcaoZeissWhatsV104', innerHTML: '', value: TELEFONE_SINTETICO_VISIVEL }],
    ['correcaoZeissWhatsV103', { id: 'correcaoZeissWhatsV103', innerHTML: '', value: TELEFONE_SINTETICO_VISIVEL }],
  ]);
  return {
    elementos,
    document: {
      getElementById(id) { return elementos.get(id) || null; },
    },
  };
}

function instalarRuntime(db, papel = 'Chris') {
  const dom = criarDom();
  globalThis.document = dom.document;
  globalThis.confirm = () => true;
  const firestore = dependenciasFirestore(db);
  instalarFinanceiroV104({
    db,
    ...firestore,
    slugClienteCanonico: canonicalizarSlug,
    hojeLocal: () => '2026-08-22',
    brl: valor => `R$ ${Number(valor || 0).toFixed(2)}`,
    nomeMes: competencia => competencia,
    esc: valor => String(valor ?? ''),
    escAttr: valor => String(valor ?? ''),
    escJs: valor => String(valor ?? ''),
    mostrarToast: () => undefined,
    usuarioAtual: () => papel,
    auth: { currentUser: papel === 'Chris' ? { uid: 'uid-chris-sintetico' } : { uid: 'uid-papel-sintetico' } },
    registrarLogAutomacao: () => undefined,
  });
  const api = {
    prever: globalThis.preverCorrecaoFinanceiraV104,
    aplicar: globalThis.aplicarCorrecaoFinanceiraV104,
  };
  globalThis.renderFinanceiro = async () => true;
  globalThis.renderMensalidades = async () => true;
  globalThis.renderCobranca = async () => true;
  globalThis.renderContratos = async () => true;
  return { ...api, dom };
}

function contrato(id, valor) {
  return {
    canonicalId: id,
    clienteNome: `${id} · fixture sintética`,
    primeiraCompetencia: '2026-08',
    valorInicial: valor,
    valorVigente: valor,
    valorCheio: valor,
    diaVencimento: 10,
    status: 'ativo',
  };
}

function pagamento(cliente, competencia, valor, status = 'aberto', extras = {}) {
  return {
    cliente,
    clienteNome: `${cliente} · fixture sintética`,
    competencia,
    valorDevido: valor,
    diaVencimento: 10,
    status,
    pagoEm: status === 'pago' ? `${competencia}-10` : '',
    comprovante: '',
    ...extras,
  };
}

function fixtureInicial() {
  const documentos = {};
  const principais = [
    ['vitalle-odonto', 1500],
    ['dra-monique', 2200],
    ['joaquin-assados', 900],
    ['acougue-sao-joaquim', 1100],
    ['fedalto-eletro-comercial', 1700],
  ];
  const demais = Array.from({ length: 17 }, (_, indice) => [
    `cliente-sintetico-${String(indice + 1).padStart(2, '0')}`,
    100 + indice,
  ]);
  for (const [id, valor] of [...principais, ...demais]) {
    documentos[`contratos_cliente/${id}`] = contrato(id, valor);
  }
  documentos['contratos_cliente/fedalto-eletro-comercial'] = {
    ...documentos['contratos_cliente/fedalto-eletro-comercial'],
    ultimaCompetenciaPagamento: '2026-09',
    vigencias: [{ inicio: '2026-08', fim: '2026-09', valor: 1700, cicloId: 'legado-inicial' }],
    status: 'encerrado',
  };
  documentos['clientes_config/dra-monique'] = {
    nome: 'Dra. Monique · fixture sintética',
    tipoCliente: 'mensalista',
    ativo: true,
    clienteInativo: false,
  };
  documentos['clientes_config/fedalto-eletro-comercial'] = {
    nome: 'Fedalto Eletro Comercial · fixture sintética',
    tipoCliente: 'mensalista',
    clienteInativo: false,
  };
  documentos['clientes_encerrados/saida_joaquin_2026-09-15'] = {
    slug: 'joaquin-assados',
    nome: 'Joaquim Assados · fixture sintética',
    dataSaida: '2026-09-15',
    ultimaCompetenciaPagamento: '2026-08',
    statusSaida: 'programada',
    excluido: false,
  };
  documentos['clientes_encerrados/saida_joaquin_duplicada'] = {
    slug: 'joaquin-assados',
    nome: 'Joaquim Assados · duplicata sintética',
    dataSaida: '2026-09-15',
    ultimaCompetenciaPagamento: '2026-08',
    statusSaida: 'programada',
    excluido: false,
  };
  documentos['clientes_encerrados/saida_acougue_2026-09-15'] = {
    slug: 'acougue-sao-joaquim',
    nome: 'Açougue São Joaquim · fixture sintética',
    dataSaida: '2026-09-15',
    ultimaCompetenciaPagamento: '2026-08',
    statusSaida: 'programada',
    excluido: false,
  };
  documentos['pagamentos_mensais/vitalle-odonto_2026-08'] = pagamento('vitalle-odonto', '2026-08', 1500, 'pago');
  documentos['pagamentos_mensais/vitalle-odonto_2026-09'] = pagamento('vitalle-odonto', '2026-09', 1500, 'aberto', { valor: 1500, valorCobrado: 1500 });
  documentos['pagamentos_mensais/vitalle-odonto_2026-10'] = pagamento('vitalle-odonto', '2026-10', 1500, 'isento', { valor: 1500, valorCobrado: 1500, motivoIsencao: 'cortesia sintética preservada' });
  documentos['pagamentos_mensais/vitalle-odonto_2026-11'] = pagamento('vitalle-odonto', '2026-11', 1000, 'pago', { comprovante: 'recibo-pago-sintetico', operationId: 'fin_pago_vitalle_sintetico' });
  documentos['pagamentos_mensais/vitalle-odonto_2026-12'] = pagamento('vitalle-odonto', '2026-12', 1500, 'cancelado', { motivoCancelamento: 'cancelamento sintético preservado', operationId: 'fin_cancelado_vitalle_sintetico' });
  documentos['pagamentos_mensais/dra-monique_2026-08'] = pagamento('dra-monique', '2026-08', 2200, 'pago');
  documentos['pagamentos_mensais/dra-monique_2026-09'] = pagamento('dra-monique', '2026-09', 2200);
  documentos['pagamentos_mensais/dra-monique_2026-10'] = pagamento('dra-monique', '2026-10', 2200, 'isento');
  documentos['pagamentos_mensais/joaquin-assados_2026-08'] = pagamento('joaquin-assados', '2026-08', 900, 'pago');
  documentos['pagamentos_mensais/joaquin-assados_2026-09'] = pagamento('joaquin-assados', '2026-09', 900);
  documentos['pagamentos_mensais/acougue-sao-joaquim_2026-08'] = pagamento('acougue-sao-joaquim', '2026-08', 1100, 'pago');
  documentos['pagamentos_mensais/acougue-sao-joaquim_2026-09'] = pagamento('acougue-sao-joaquim', '2026-09', 1100);
  documentos['pagamentos_mensais/fedalto-eletro-comercial_2026-09'] = pagamento('fedalto-eletro-comercial', '2026-09', 1700);
  documentos['config_financeiro/regua_cobranca'] = {
    schemaVersion: 1,
    inicioOperacao: '2026-07',
    competenciasQuitadasAte: '',
  };
  return documentos;
}

function documentosDaColecao(db, colecao) {
  const prefixo = `${colecao}/`;
  return [...db.dados.entries()]
    .filter(([chave]) => chave.startsWith(prefixo) && !chave.slice(prefixo.length).includes('/'))
    .map(([chave, dados]) => ({ id: chave.slice(prefixo.length), ...clonar(dados) }));
}

function movimentos(db, competencia) {
  return Core.projetarMovimentosCompetencia({
    contratos: documentosDaColecao(db, 'contratos_cliente'),
    saidas: documentosDaColecao(db, 'clientes_encerrados'),
    competencia,
  });
}

function obter(db, caminho) {
  return clonar(db.dados.get(caminho));
}

async function capturarErroEsperado(acao) {
  const anterior = console.error;
  const erros = [];
  console.error = (...argumentos) => erros.push(argumentos.map(String).join(' '));
  try {
    return { resultado: await acao(), erros };
  } finally {
    console.error = anterior;
  }
}

function caminhosComTelefone(db) {
  return [...db.dados.entries()]
    .filter(([, dados]) => assinatura(dados).includes(TELEFONE_SINTETICO_CANONICO))
    .map(([caminho]) => caminho)
    .sort();
}

async function testarAplicacaoCompleta() {
  const db = criarBanco(fixtureInicial());
  const runtime = instalarRuntime(db);
  const vitallePagaAntes = assinatura(obter(db, 'pagamentos_mensais/vitalle-odonto_2026-11'));
  const vitalleCanceladaAntes = assinatura(obter(db, 'pagamentos_mensais/vitalle-odonto_2026-12'));
  igual(movimentos(db, '2026-08').totais.ativos, 22, 'fixture começa com 22 clientes ativos em agosto');
  igual(movimentos(db, '2026-09').totais.ativos, 22, 'antes da correção os três desligamentos ainda vazam para setembro');
  const docsAntes = db.dados.size;
  verificar(await runtime.prever(), 'prévia dirigida confirma todos os alvos sem gravar');
  igual(globalThis.__correcaoFedaltoV104?.ativosSimulados, 19, 'prévia unificada calcula 19 ativos em setembro');
  igual(db.commits.length, 0, 'prévia e renderização executam zero writes');

  verificar(await runtime.aplicar(), 'ação explícita conclui a transação e os recibos');
  igual(movimentos(db, '2026-08').totais.ativos, 22, 'agosto preserva os 22 clientes que pertenciam à competência');
  igual(movimentos(db, '2026-09').totais.ativos, 19, 'setembro fica com exatamente 19 clientes ativos');

  const vitalle = obter(db, 'contratos_cliente/vitalle-odonto');
  igual([vitalle.valorProgramado, vitalle.valorProgramadoEm], [1000, '2026-09'], 'Vitalle recebe R$ 1.000 somente a partir de setembro');
  igual(obter(db, 'pagamentos_mensais/vitalle-odonto_2026-08').valorDevido, 1500, 'Vitalle paga de agosto permanece histórica e imutável');
  const vitalleSetembro = obter(db, 'pagamentos_mensais/vitalle-odonto_2026-09');
  igual([vitalleSetembro.valorDevido, vitalleSetembro.valor, vitalleSetembro.valorCobrado], [1000, 1000, 1000], 'campos monetários futuros da Vitalle convergem para R$ 1.000');
  const vitalleOutubro = obter(db, 'pagamentos_mensais/vitalle-odonto_2026-10');
  igual(Core.statusMensalidade(vitalleOutubro), 'isento', 'Vitalle futura isenta preserva o estado terminal de cortesia');
  igual([vitalleOutubro.valorDevido, vitalleOutubro.valor, vitalleOutubro.valorCobrado], [1000, 1000, 1000], 'Vitalle futura isenta também converge todos os campos monetários para R$ 1.000');
  igual(vitalleOutubro.financeiroOperationId, vitalle.financeiroOperationId, 'mensalidade isenta registra o mesmo operationId do contrato');
  igual(assinatura(obter(db, 'pagamentos_mensais/vitalle-odonto_2026-11')), vitallePagaAntes, 'Vitalle futura paga permanece byte a byte');
  igual(assinatura(obter(db, 'pagamentos_mensais/vitalle-odonto_2026-12')), vitalleCanceladaAntes, 'Vitalle futura cancelada permanece byte a byte');

  for (const slug of ['dra-monique', 'joaquin-assados', 'acougue-sao-joaquim']) {
    const contratoAtual = obter(db, `contratos_cliente/${slug}`);
    igual(contratoAtual.ultimaCompetenciaPagamento, '2026-08', `${slug} encerra financeiramente em agosto`);
    verificar(Array.isArray(contratoAtual.vigencias) && contratoAtual.vigencias.some(v => v.fim === '2026-08'), `${slug} possui vigência fechada e auditável`);
    const futura = obter(db, `pagamentos_mensais/${slug}_2026-09`);
    igual(Core.statusMensalidade(futura), 'cancelado', `${slug} não permanece cobrável em setembro`);
  }
  igual(Core.statusMensalidade(obter(db, 'pagamentos_mensais/dra-monique_2026-10')), 'cancelado', 'cortesia futura da Monique vira cancelamento por saída, sem reabrir cobrança');
  igual(Core.statusMensalidade(obter(db, 'pagamentos_mensais/joaquin-assados_2026-08')), 'pago', 'pagamento histórico do Joaquim é preservado');
  igual(Core.statusMensalidade(obter(db, 'pagamentos_mensais/acougue-sao-joaquim_2026-08')), 'pago', 'pagamento histórico do Açougue é preservado');

  const fedalto = obter(db, 'contratos_cliente/fedalto-eletro-comercial');
  verificar(Core.vigenteNaCompetencia(fedalto, '2026-09'), 'Fedalto permanece ativa em setembro e depois da cortesia');
  verificar(!fedalto.ultimaCompetenciaPagamento && fedalto.cortesiaMeses.includes('2026-09'), 'Fedalto não fica encerrada e registra somente setembro como cortesia');
  const fedaltoSetembro = obter(db, 'pagamentos_mensais/fedalto-eletro-comercial_2026-09');
  igual(Core.statusMensalidade(fedaltoSetembro), 'isento', 'Fedalto setembro vira cortesia, não encerramento nem cobrança');
  igual(obter(db, 'config_financeiro/regua_cobranca').competenciasQuitadasAte, '2026-08', 'Régua registra julho/agosto como histórico encerrado sem inventar data de caixa');

  verificar(db.dados.has('contratos_cliente/joaquin-assados') && db.dados.has('contratos_cliente/acougue-sao-joaquim'), 'Joaquim Assados e Açougue São Joaquim continuam contratos distintos');
  verificar(!obter(db, 'contratos_cliente/joaquin-assados').unificadoNoId && !obter(db, 'contratos_cliente/acougue-sao-joaquim').unificadoNoId, 'correção não funde as duas empresas');
  igual(obter(db, 'clientes_encerrados/saida_joaquin_duplicada').excluido, true, 'duplicata de saída do Joaquim é soft-arquivada');
  igual(obter(db, 'clientes_encerrados/saida_joaquin_duplicada').unificadoNoId, 'saida_joaquin_2026-09-15', 'duplicata aponta para o recibo de saída preservado');

  igual(caminhosComTelefone(db), ['contatos_clientes_financeiro/zeiss'], 'WhatsApp sintético da Zeiss existe somente na coleção financeira privada');
  verificar(!fonteUi.includes(TELEFONE_SINTETICO_CANONICO) && !fonteUi.includes(TELEFONE_SINTETICO_VISIVEL), 'telefone da Zeiss não é embutido no módulo público');
  igual(documentosDaColecao(db, 'clientes_ciclo_financeiro').length, 5, 'cinco eventos append-only identificam a carteira e a cortesia da Fedalto');
  igual(db.commits.filter(v => v.tipo === 'transaction').length, 2, 'as duas etapas independentes concluem em transações atômicas com recibo');
  verificar(db.dados.size >= docsAntes, 'nenhum documento é apagado fisicamente');

  const recibosObrigatorios = [
    'contratos_cliente/vitalle-odonto',
    'contratos_cliente/dra-monique',
    'contratos_cliente/joaquin-assados',
    'contratos_cliente/acougue-sao-joaquim',
    'clientes_encerrados/saida_dra-monique_2026-09-15',
    'clientes_encerrados/saida_joaquin_2026-09-15',
    'clientes_encerrados/saida_acougue_2026-09-15',
    'contatos_clientes_financeiro/zeiss',
  ];
  verificar(recibosObrigatorios.every(caminho => db.getDocCalls.includes(caminho)), 'runtime relê contratos, saídas e contato antes de afirmar sucesso');

  const commitsAntesRetry = db.commits.length;
  const historicoAntesRetry = assinatura(vitalle.historicoAlteracoesValor || []);
  verificar(await runtime.aplicar(), 'retry após recibo confirmado retorna sucesso idempotente');
  igual(db.commits.length, commitsAntesRetry, 'retry confirmado executa zero writes adicionais');
  igual(assinatura(obter(db, 'contratos_cliente/vitalle-odonto').historicoAlteracoesValor || []), historicoAntesRetry, 'retry não duplica histórico de valor da Vitalle');
}

async function testarPrecondicao() {
  const db = criarBanco(fixtureInicial());
  const runtime = instalarRuntime(db);
  verificar(await runtime.prever(), 'cenário de precondition possui prévia válida');
  db.beforeTransactionOnce = banco => {
    const caminho = 'contratos_cliente/vitalle-odonto';
    banco.dados.set(caminho, { ...banco.dados.get(caminho), valorVigente: 1555 });
  };
  const tentativa = await capturarErroEsperado(() => runtime.aplicar());
  verificar(!tentativa.resultado && tentativa.erros.some(erro => erro.includes('contrato mudou depois da prévia')), 'mudança concorrente do contrato invalida a precondition');
  igual(db.commits.length, 0, 'precondition falha antes de qualquer commit da correção');
  igual(documentosDaColecao(db, 'clientes_ciclo_financeiro').length, 0, 'precondition não deixa evento órfão');
  verificar(!db.dados.has('contatos_clientes_financeiro/zeiss'), 'precondition não deixa contato parcial');
  igual(obter(db, 'pagamentos_mensais/vitalle-odonto_2026-09').valorDevido, 1500, 'precondition preserva a mensalidade anterior');
}

async function testarReciboVitalleIsentaDivergente() {
  const db = criarBanco(fixtureInicial());
  const runtime = instalarRuntime(db);
  verificar(await runtime.aplicar(), 'cenário de recibo divergente começa com correção integral confirmada');
  const caminho = 'pagamentos_mensais/vitalle-odonto_2026-10';
  db.dados.set(caminho, {
    ...db.dados.get(caminho),
    valorDevido: 1500,
    valor: 1500,
    valorCobrado: 1500,
  });
  const commitsAntes = db.commits.length;
  const tentativa = await capturarErroEsperado(() => runtime.aplicar());
  verificar(!tentativa.resultado && tentativa.erros.some(erro => erro.includes('recibos não confirmaram todos os alvos')), 'UI/recibo recusa sucesso quando Vitalle isenta volta ao valor antigo');
  igual(db.commits.length, commitsAntes, 'recibo divergente não tenta corrigir silenciosamente nem cria outro commit');
  igual(Core.statusMensalidade(obter(db, caminho)), 'isento', 'falha do recibo preserva o estado isento para auditoria explícita');
}

async function testarAtomicidade() {
  const inicial = fixtureInicial();
  const db = criarBanco(inicial);
  const runtime = instalarRuntime(db);
  db.failBeforeCommitOnce = true;
  const tentativa = await capturarErroEsperado(() => runtime.aplicar());
  verificar(!tentativa.resultado && tentativa.erros.some(erro => erro.includes('Falha sintética antes do commit')), 'falha sintética no commit é reportada sem falso sucesso');
  igual(assinatura(Object.fromEntries(db.dados)), assinatura(inicial), 'falha antes do commit preserva todos os documentos byte a byte no retrato sintético');
  igual(db.commits.length, 0, 'falha atômica não registra commit parcial');
}

async function testarDuasAbas() {
  const db = criarBanco(fixtureInicial());
  const abaA = instalarRuntime(db);
  const aplicarA = abaA.aplicar;
  const abaB = instalarRuntime(db);
  const aplicarB = abaB.aplicar;
  const resultados = await Promise.all([aplicarA(), aplicarB()]);
  igual(resultados, [true, true], 'duas abas convergem para sucesso sem exigir repetição manual');
  igual(db.commits.filter(v => v.tipo === 'transaction').length, 2, 'duas abas convergem para somente as duas transações necessárias, uma por etapa da operação');
  igual(documentosDaColecao(db, 'clientes_ciclo_financeiro').length, 5, 'duas abas não duplicam os cinco eventos das duas etapas');
  igual((obter(db, 'contratos_cliente/vitalle-odonto').historicoAlteracoesValor || []).filter(v => v.operationId === 'fin_v103_vitalle_2026_09').length, 1, 'duas abas não duplicam o histórico canônico da Vitalle');
  igual(movimentos(db, '2026-09').totais.ativos, 19, 'duas abas terminam no mesmo retrato de 19 ativos');
}

async function testarPapelIndevido() {
  const db = criarBanco(fixtureInicial());
  const runtime = instalarRuntime(db, 'Amanda');
  verificar(!(await runtime.prever()), 'papel indevido não abre a prévia financeira dirigida');
  verificar(!(await runtime.aplicar()), 'papel indevido não executa a correção');
  igual(db.getDocsCalls.length, 0, 'papel indevido não lê as coleções financeiras pelo runtime');
  igual(db.commits.length, 0, 'papel indevido produz zero writes');
}

await testarAplicacaoCompleta();
await testarReciboVitalleIsentaDivergente();
await testarPrecondicao();
await testarAtomicidade();
await testarDuasAbas();
await testarPapelIndevido();

console.log(`REGRESSAO V104 CORRECAO FINANCEIRA REAL: OK (${total} verificacoes)`);
