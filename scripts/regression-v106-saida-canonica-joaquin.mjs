#!/usr/bin/env node

/*
 * Regressão dirigida V106 — escolha humana da saída canônica do Joaquin.
 *
 * Executa o writer real de `financeiro-ui-v104.mjs` contra DOM e Firestore
 * sintéticos em memória. Não usa rede, Firebase publicado, telefone ou dado
 * pessoal. Os IDs exercitados são os dois recibos já auditados pela V106; todo
 * o conteúdo de negócio da fixture é sintético.
 */

import assert from 'node:assert/strict';
import * as Core from '../financeiro-core.mjs';
import {
  assinatura,
  criarBanco,
  documentosDaColecao,
  fixtureInicial,
  instalarRuntime,
  obter,
} from './regression-v104-correcao-financeira-real.mjs';

const CAMINHO_CANONICO = 'clientes_encerrados/62eBY5iSyFtP21vECYMm';
const CAMINHO_CONCORRENTE = 'clientes_encerrados/0oqy4pk1tcKZccWWyZDi';
const CAMINHO_CONFIG = 'clientes_config/joaquin-assados';
const CAMINHO_CONTRATO = 'contratos_cliente/joaquin-assados';
const CAMINHO_ACOUGUE = 'clientes_encerrados/saida_acougue_2026-09-15';
const OPERATION_ID = 'fin_v106_joaquin_saida_canonica_20260915';
const CAMINHO_RECIBO = `clientes_ciclo_financeiro/${OPERATION_ID}`;
const STATUS_ID = 'financeiroCorrecaoSaidaCanonicaJoaquinV106Status';

let total = 0;

function verificar(condicao, mensagem) {
  total += 1;
  assert.ok(condicao, `V106 SAIDA CANONICA JOAQUIN: ${mensagem}`);
  console.log('PASS ', mensagem);
}

function igual(atual, esperado, mensagem) {
  total += 1;
  assert.deepEqual(atual, esperado, `V106 SAIDA CANONICA JOAQUIN: ${mensagem}`);
  console.log('PASS ', mensagem);
}

function fixtureConflitoConfirmado() {
  const documentos = fixtureInicial();
  delete documentos['clientes_encerrados/saida_joaquin_2026-09-15'];
  delete documentos['clientes_encerrados/saida_joaquin_duplicada'];

  documentos[CAMINHO_CONTRATO] = {
    ...documentos[CAMINHO_CONTRATO],
    ultimaCompetenciaPagamento: '2026-08',
    saidaProgramadaPara: '2026-09-15',
    saidaMotivo: 'resultado',
    saidaMotivoDetalhe: 'Baixo retorno financeiro',
    vigencias: [{
      inicio: '2026-08',
      fim: '2026-08',
      valor: 900,
      cicloId: 'ciclo-sintetico-v106',
    }],
    marcadorSinteticoPreservado: 'contrato-nao-e-writer-v106',
  };
  documentos[CAMINHO_CONFIG] = {
    nome: 'Cliente sintético V106',
    slug: 'joaquin-assados',
    tipoCliente: 'mensalista',
    clienteInativo: false,
    saidaProgramadaPara: '2026-09-15',
    saidaMotivo: 'resultado',
    saidaMotivoDetalhe: 'Baixo retorno financeiro',
    marcadorSinteticoPreservado: 'config-preservada-v106',
  };
  documentos[CAMINHO_CANONICO] = {
    slug: 'joaquin-assados',
    nome: 'Cliente sintético V106',
    dataAviso: '2026-08-05',
    dataSaida: '2026-09-15',
    ultimaCompetenciaPagamento: '2026-08',
    statusSaida: 'programada',
    tipoCliente: 'mensalista',
    valorMensal: 900,
    motivo: 'resultado',
    motivoDetalhe: 'Baixo retorno financeiro',
    pendenciasFinais: { estado: 'sintetico', itens: [] },
    fichaSnapshot: { plano: 'sintetico', semDadosPessoais: true },
    excluido: false,
    marcadorSinteticoPreservado: 'recibo-canonico-imutavel-v106',
  };
  documentos[CAMINHO_CONCORRENTE] = {
    slug: 'joaquin-assados',
    nome: 'Cliente sintético V106',
    dataAviso: '2026-08-06',
    dataSaida: '2026-09-15',
    statusSaida: 'programada',
    tipoCliente: 'mensalista',
    valorMensal: 900,
    motivo: 'mudanca_interna',
    motivoDetalhe: 'Baixo retorno financeiro',
    pendenciasFinais: { estado: 'sintetico', itens: [] },
    fichaSnapshot: { plano: 'divergente-sintetico', semDadosPessoais: true },
    excluido: false,
    marcadorSinteticoPreservado: 'recibo-concorrente-historico-v106',
  };
  documentos['pagamentos_mensais/joaquin-assados_2026-09'] = {
    ...documentos['pagamentos_mensais/joaquin-assados_2026-09'],
    status: 'cancelado',
    motivoCancelamento: 'fixture sintética anterior à V106',
  };
  return documentos;
}

function instalarRuntimeV106(db, papel = 'Chris') {
  const runtime = instalarRuntime(db, papel);
  runtime.dom.elementos.set(STATUS_ID, { id: STATUS_ID, innerHTML: '', value: '' });
  return {
    ...runtime,
    preverJoaquin: globalThis.preverCorrecaoSaidaCanonicaJoaquinV106,
    aplicarJoaquin: globalThis.aplicarCorrecaoSaidaCanonicaJoaquinV106,
    seam: globalThis.__financeiroV104,
  };
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

function conflitoDivergente(db) {
  return Core.deduplicarSaidas(documentosDaColecao(db, 'clientes_encerrados'))
    .conflitos.some(item => item.codigo === 'SAIDA_DUPLICADA_DIVERGENTE' && item.bloqueante !== false);
}

function commitsDeTransacao(db) {
  return db.commits.filter(item => item.tipo === 'transaction');
}

function assertNenhumDocumentoInicialFoiApagado(db, documentos) {
  for (const caminho of Object.keys(documentos)) {
    verificar(db.dados.has(caminho), `${caminho} continua existente após o soft-archive`);
  }
}

async function testarPreviaZeroWriteEContratoTresFontes() {
  const db = criarBanco(fixtureConflitoConfirmado());
  const runtime = instalarRuntimeV106(db);
  verificar(conflitoDivergente(db), 'fixture reproduz SAIDA_DUPLICADA_DIVERGENTE antes da decisão explícita');
  igual(runtime.seam.constantesV106, {
    canonicalId: 'joaquin-assados',
    canonicalExitId: '62eBY5iSyFtP21vECYMm',
    duplicateExitId: '0oqy4pk1tcKZccWWyZDi',
    operationId: OPERATION_ID,
    exitDate: '2026-09-15',
    finalCompetence: '2026-08',
    reason: 'resultado',
    reasonDetail: 'Baixo retorno financeiro',
  }, 'seam usa exatamente os dois IDs e os fatos confirmados');

  const antes = assinatura(Object.fromEntries(db.dados));
  verificar(await runtime.preverJoaquin(), 'prévia específica reconhece o conflito auditado como reparável');
  const previa = globalThis.__correcaoSaidaCanonicaJoaquinV106;
  igual(previa.estado, 'pronta', 'classificador expõe estado pronta, sem inferência silenciosa');
  igual([previa.canonica.id, previa.concorrente.id], [
    '62eBY5iSyFtP21vECYMm',
    '0oqy4pk1tcKZccWWyZDi',
  ], 'prévia seleciona somente os dois recibos auditados');
  igual([previa.contrato.id, previa.config.id, previa.canonica.id], [
    'joaquin-assados',
    'joaquin-assados',
    '62eBY5iSyFtP21vECYMm',
  ], 'decisão cruza contrato, ficha operacional e recibo canônico');
  igual(Object.keys(previa.preHashes).sort(), ['canonical', 'config', 'contract', 'duplicate', 'payments'], 'prévia congela as cinco preconditions materiais');
  igual(db.commits.length, 0, 'prévia executa zero writes');
  igual(assinatura(Object.fromEntries(db.dados)), antes, 'prévia preserva o banco sintético byte a byte');
  verificar(['contratos_cliente', 'clientes_config', 'clientes_encerrados'].every(nome => db.getDocsCalls.includes(nome)), 'prévia relê as três fontes físicas antes de liberar a ação');
}

async function testarAplicacaoPreservaCanonicoEIsolaImpacto() {
  const documentos = fixtureConflitoConfirmado();
  const db = criarBanco(documentos);
  const runtime = instalarRuntimeV106(db);
  const canonicoAntes = assinatura(obter(db, CAMINHO_CANONICO));
  const contratoAntes = assinatura(obter(db, CAMINHO_CONTRATO));
  const acougueAntes = assinatura(obter(db, CAMINHO_ACOUGUE));
  const concorrenteAntes = obter(db, CAMINHO_CONCORRENTE);
  const intocados = Object.fromEntries(Object.keys(documentos)
    .filter(caminho => ![CAMINHO_CONFIG, CAMINHO_CONCORRENTE].includes(caminho))
    .map(caminho => [caminho, assinatura(documentos[caminho])]));

  verificar(await runtime.aplicarJoaquin(), 'ação explícita conclui a conciliação isolada do Joaquin');
  igual(commitsDeTransacao(db).length, 1, 'correção inteira usa uma única transação');
  igual([...commitsDeTransacao(db)[0].caminhos].sort(), [
    CAMINHO_CONFIG,
    CAMINHO_CONCORRENTE,
    CAMINHO_RECIBO,
  ].sort(), 'transação escreve somente ficha, concorrente e recibo append-only');

  igual(assinatura(obter(db, CAMINHO_CANONICO)), canonicoAntes, 'recibo canônico é preservado byte a byte');
  igual(assinatura(obter(db, CAMINHO_CONTRATO)), contratoAntes, 'contrato usado como evidência é preservado byte a byte');
  igual(assinatura(obter(db, CAMINHO_ACOUGUE)), acougueAntes, 'Açougue São Joaquim permanece byte a byte');
  for (const [caminho, esperado] of Object.entries(intocados)) {
    igual(assinatura(obter(db, caminho)), esperado, `${caminho} fica fora do orçamento de escrita V106`);
  }

  const concorrente = obter(db, CAMINHO_CONCORRENTE);
  igual([concorrente.excluido, concorrente.statusSaida, concorrente.unificadoNoId], [
    true,
    'cancelada',
    '62eBY5iSyFtP21vECYMm',
  ], 'registro concorrente recebe soft-archive e aponta para o canônico');
  for (const campo of ['slug', 'dataAviso', 'dataSaida', 'motivo', 'motivoDetalhe', 'valorMensal', 'pendenciasFinais', 'fichaSnapshot', 'marcadorSinteticoPreservado']) {
    igual(assinatura(concorrente[campo]), assinatura(concorrenteAntes[campo]), `soft-archive preserva o campo histórico ${campo}`);
  }
  igual(obter(db, CAMINHO_CONFIG).saidaAtivaId, '62eBY5iSyFtP21vECYMm', 'ficha operacional passa a apontar para o recibo confirmado');
  igual(obter(db, CAMINHO_CONFIG).marcadorSinteticoPreservado, 'config-preservada-v106', 'merge do ponteiro preserva campos preexistentes da ficha');

  const recibo = obter(db, CAMINHO_RECIBO);
  igual([recibo.operationId, recibo.clienteId, recibo.sourceId], [
    OPERATION_ID,
    'joaquin-assados',
    '62eBY5iSyFtP21vECYMm',
  ], 'recibo determinístico referencia cliente e evento canônicos');
  verificar(typeof recibo.preHash === 'string' && recibo.preHash.length > 10 && typeof recibo.postHash === 'string' && recibo.postHash.length > 10, 'recibo registra hashes de precondition e resultado');
  verificar(!conflitoDivergente(db), 'SAIDA_DUPLICADA_DIVERGENTE deixa de bloquear os totais após o soft-archive');
  igual(globalThis.__correcaoSaidaCanonicaJoaquinV106.estado, 'resolvida', 'releitura pós-commit confirma o estado final');
  assertNenhumDocumentoInicialFoiApagado(db, documentos);
}

async function testarCliqueDuploRetryEDuasAbas() {
  {
    const db = criarBanco(fixtureConflitoConfirmado());
    const runtime = instalarRuntimeV106(db);
    igual(await Promise.all([runtime.aplicarJoaquin(), runtime.aplicarJoaquin()]), [true, false], 'clique duplo na mesma aba arma a trava antes do primeiro await');
    igual(commitsDeTransacao(db).length, 1, 'clique duplo cria um único commit');
    igual(documentosDaColecao(db, 'clientes_ciclo_financeiro').filter(v => v.id === OPERATION_ID).length, 1, 'clique duplo cria um único recibo');
    const estadoAntesRetry = assinatura(Object.fromEntries(db.dados));
    const commitsAntesRetry = db.commits.length;
    verificar(await runtime.aplicarJoaquin(), 'retry sobre estado resolvido retorna sucesso idempotente');
    igual(db.commits.length, commitsAntesRetry, 'retry não cria commit adicional');
    igual(assinatura(Object.fromEntries(db.dados)), estadoAntesRetry, 'retry preserva todo o estado byte a byte');
  }
  {
    const db = criarBanco(fixtureConflitoConfirmado());
    const abaA = instalarRuntimeV106(db);
    const aplicarA = abaA.aplicarJoaquin;
    const abaB = instalarRuntimeV106(db);
    const aplicarB = abaB.aplicarJoaquin;
    igual(await Promise.all([aplicarA(), aplicarB()]), [true, true], 'duas abas convergem para o mesmo resultado');
    igual(commitsDeTransacao(db).length, 1, 'duas abas produzem somente uma transação com escrita');
    igual(documentosDaColecao(db, 'clientes_ciclo_financeiro').filter(v => v.id === OPERATION_ID).length, 1, 'duas abas convergem para um único recibo determinístico');
    igual(obter(db, CAMINHO_CONFIG).saidaAtivaId, '62eBY5iSyFtP21vECYMm', 'duas abas terminam com o mesmo ponteiro canônico');
  }
}

async function testarPreconditionMudouDepoisDaLeitura() {
  const db = criarBanco(fixtureConflitoConfirmado());
  const runtime = instalarRuntimeV106(db);
  verificar(await runtime.preverJoaquin(), 'cenário concorrente começa com prévia segura');
  db.beforeTransactionOnce = banco => {
    banco.dados.set(CAMINHO_CANONICO, {
      ...banco.dados.get(CAMINHO_CANONICO),
      marcadorConcorrenteSintetico: 'alterado-entre-preview-e-commit',
    });
  };
  const tentativa = await capturarErroEsperado(() => runtime.aplicarJoaquin());
  verificar(!tentativa.resultado && tentativa.erros.some(erro => erro.includes('dados mudaram depois da prévia')), 'mudança entre leitura e commit invalida os hashes da transação');
  igual(db.commits.length, 0, 'precondition divergente aborta antes de qualquer commit');
  igual(obter(db, CAMINHO_CONCORRENTE).excluido, false, 'precondition divergente não arquiva o concorrente');
  verificar(!obter(db, CAMINHO_CONFIG).saidaAtivaId, 'precondition divergente não cria ponteiro');
  verificar(!db.dados.has(CAMINHO_RECIBO), 'precondition divergente não cria recibo órfão');
}

async function testarPertencimentoMudouDuranteConfirmacao() {
  const cenarios = [
    ['terceiro recibo surgiu enquanto a confirmação estava aberta', documentos => {
      documentos['clientes_encerrados/terceiro-recibo-durante-confirmacao'] = {
        ...documentos[CAMINHO_CANONICO],
        dataAviso: '2026-08-08',
        marcadorConcorrenteSintetico: 'phantom-saida-confirmacao',
      };
    }],
    ['nova mensalidade surgiu enquanto a confirmação estava aberta', documentos => {
      documentos['pagamentos_mensais/joaquin-assados_2026-10'] = {
        cliente: 'joaquin-assados',
        canonicalId: 'joaquin-assados',
        competencia: '2026-10',
        status: 'aberto',
        valorDevido: 900,
        marcadorConcorrenteSintetico: 'phantom-pagamento-confirmacao',
      };
    }],
  ];
  for (const [nome, inserir] of cenarios) {
    const db = criarBanco(fixtureConflitoConfirmado());
    const runtime = instalarRuntimeV106(db);
    globalThis.confirm = () => {
      const atuais = Object.fromEntries(db.dados);
      inserir(atuais);
      db.dados = new Map(Object.entries(atuais));
      return true;
    };
    const tentativa = await capturarErroEsperado(() => runtime.aplicarJoaquin());
    verificar(!tentativa.resultado && tentativa.erros.some(erro => erro.includes('dados mudaram durante a confirmação')), `${nome}: segunda leitura de pertencimento falha fechada`);
    igual(commitsDeTransacao(db).length, 0, `${nome}: nenhuma transação de escrita é iniciada`);
    igual(obter(db, CAMINHO_CONCORRENTE).excluido, false, `${nome}: concorrente permanece ativo para auditoria`);
    verificar(!obter(db, CAMINHO_CONFIG).saidaAtivaId, `${nome}: ficha não recebe ponteiro`);
    verificar(!db.dados.has(CAMINHO_RECIBO), `${nome}: nenhum recibo é criado`);
  }
}

async function testarFatosErradosBloqueados() {
  const cenarios = [
    ['competência contratual mudou', documentos => { documentos[CAMINHO_CONTRATO].ultimaCompetenciaPagamento = '2026-09'; }],
    ['data do recibo canônico mudou', documentos => { documentos[CAMINHO_CANONICO].dataSaida = '2026-09-16'; }],
    ['motivo do concorrente mudou', documentos => { documentos[CAMINHO_CONCORRENTE].motivo = 'outro_fato_sintetico'; }],
    ['ficha aponta para terceiro recibo', documentos => { documentos[CAMINHO_CONFIG].saidaAtivaId = 'terceiro-recibo-sintetico'; }],
    ['mensalidade posterior foi paga', documentos => { documentos['pagamentos_mensais/joaquin-assados_2026-09'].status = 'pago'; }],
    ['surgiu terceiro recibo ativo', documentos => {
      documentos['clientes_encerrados/terceiro-recibo-sintetico'] = {
        ...documentos[CAMINHO_CANONICO],
        dataAviso: '2026-08-07',
      };
    }],
    ['existe recibo legado sem estado final', documentos => {
      documentos['clientes_ciclo_financeiro/fin_v103_joaquin_dedupe_2026_09'] = {
        operationId: 'fin_v103_joaquin_dedupe_2026_09',
        clienteId: 'joaquin-assados',
        tipo: 'deduplicacao',
        sourceId: 'recibo-legado-sintetico',
      };
    }],
    ['existe recibo V106 antes do estado final', documentos => {
      documentos[CAMINHO_RECIBO] = {
        operationId: OPERATION_ID,
        clienteId: 'joaquin-assados',
        tipo: 'deduplicacao',
        competenciaInicio: '2026-09',
        ultimaCompetencia: '2026-08',
        sourceType: 'migracao',
        sourceId: '62eBY5iSyFtP21vECYMm',
      };
    }],
  ];
  for (const [nome, alterar] of cenarios) {
    const documentos = fixtureConflitoConfirmado();
    alterar(documentos);
    const db = criarBanco(documentos);
    const reciboAntes = db.dados.has(CAMINHO_RECIBO) ? assinatura(obter(db, CAMINHO_RECIBO)) : null;
    const runtime = instalarRuntimeV106(db);
    verificar(!(await runtime.preverJoaquin()), `${nome}: prévia falha fechada`);
    igual(globalThis.__correcaoSaidaCanonicaJoaquinV106.estado, 'bloqueada', `${nome}: classificador não converte divergência em vazio ou sucesso`);
    const tentativa = await capturarErroEsperado(() => runtime.aplicarJoaquin());
    verificar(!tentativa.resultado, `${nome}: aplicação permanece bloqueada`);
    igual(db.commits.length, 0, `${nome}: bloqueio executa zero writes`);
    igual(obter(db, CAMINHO_CONCORRENTE).excluido, false, `${nome}: histórico concorrente permanece ativo para auditoria`);
    if (reciboAntes === null) verificar(!db.dados.has(CAMINHO_RECIBO), `${nome}: bloqueio não fabrica recibo`);
    else igual(assinatura(obter(db, CAMINHO_RECIBO)), reciboAntes, `${nome}: recibo preexistente permanece byte a byte para auditoria`);
  }
}

async function testarSomenteChris() {
  const db = criarBanco(fixtureConflitoConfirmado());
  const runtime = instalarRuntimeV106(db, 'Amanda');
  verificar(!(await runtime.preverJoaquin()), 'papel diferente de Chris não abre a prévia V106');
  verificar(!(await runtime.aplicarJoaquin()), 'papel diferente de Chris não executa a correção V106');
  igual(db.getDocsCalls.length, 0, 'papel indevido não lê fontes financeiras pela porta V106');
  igual(db.commits.length, 0, 'papel indevido executa zero writes');
  verificar(!db.dados.has(CAMINHO_RECIBO), 'papel indevido não cria recibo');
}

await testarPreviaZeroWriteEContratoTresFontes();
await testarAplicacaoPreservaCanonicoEIsolaImpacto();
await testarCliqueDuploRetryEDuasAbas();
await testarPreconditionMudouDepoisDaLeitura();
await testarPertencimentoMudouDuranteConfirmacao();
await testarFatosErradosBloqueados();
await testarSomenteChris();

console.log(`REGRESSAO V106 SAIDA CANONICA JOAQUIN: OK (${total} verificacoes)`);
