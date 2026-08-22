#!/usr/bin/env node

/*
 * Regressão dirigida V105 — conciliação com ajustes já feitos manualmente.
 *
 * Executa os writers reais de `financeiro-ui-v104.mjs` contra Firestore e DOM
 * sintéticos em memória. Não usa rede, Firebase publicado, dado pessoal ou
 * telefone real. O objetivo é impedir que a correção dirigida regrave,
 * duplique ou substitua um fato canônico que Chris já confirmou na interface.
 */

import assert from 'node:assert/strict';
import * as Core from '../financeiro-core.mjs';
import {
  TELEFONE_SINTETICO_CANONICO,
  assinatura,
  criarBanco,
  documentosDaColecao,
  fixtureInicial,
  instalarRuntime,
  movimentos,
  obter,
} from './regression-v104-correcao-financeira-real.mjs';

let total = 0;

function verificar(condicao, mensagem) {
  total += 1;
  assert.ok(condicao, `V105 CONCILIACAO MANUAL: ${mensagem}`);
  console.log('PASS ', mensagem);
}

function igual(atual, esperado, mensagem) {
  total += 1;
  assert.deepEqual(atual, esperado, `V105 CONCILIACAO MANUAL: ${mensagem}`);
  console.log('PASS ', mensagem);
}

function competenciaDoPagamento(caminho) {
  return caminho.match(/_(\d{4}-\d{2})$/)?.[1] || '';
}

function cancelarPagamentosPosteriores(documentos, slug, saidaId) {
  const prefixo = `pagamentos_mensais/${slug}_`;
  for (const [caminho, dados] of Object.entries(documentos)) {
    if (!caminho.startsWith(prefixo) || competenciaDoPagamento(caminho) < '2026-09') continue;
    if (Core.statusMensalidade(dados) === 'pago') continue;
    documentos[caminho] = {
      ...dados,
      status: 'cancelado',
      canceladoPorSaida: true,
      canceladoPorSaidaId: saidaId,
      motivoCancelamento: 'fixture V105 · encerramento manual preservado',
    };
  }
}

function marcarSaidaManual(documentos, slug, {
  saidaId,
  dataSaida = '2026-09-15',
  vigencias = [],
  criarPonteiro = false,
  nome = `${slug} · saída manual sintética`,
} = {}) {
  documentos[`contratos_cliente/${slug}`] = {
    ...documentos[`contratos_cliente/${slug}`],
    ultimaCompetenciaPagamento: '2026-08',
    vigencias,
    saidaProgramadaPara: dataSaida,
  };
  documentos[`clientes_encerrados/${saidaId}`] = {
    slug,
    nome,
    dataSaida,
    ultimaCompetenciaPagamento: '2026-08',
    statusSaida: 'programada',
    excluido: false,
    origem: 'fixture-manual-v105',
  };
  if (criarPonteiro) {
    documentos[`clientes_config/${slug}`] = {
      ...(documentos[`clientes_config/${slug}`] || {}),
      nome,
      tipoCliente: 'mensalista',
      clienteInativo: false,
      saidaAtivaId: saidaId,
      saidaProgramadaPara: dataSaida,
    };
  }
  cancelarPagamentosPosteriores(documentos, slug, saidaId);
}

function marcarVitalleManual(documentos) {
  documentos['contratos_cliente/vitalle-odonto'] = {
    ...documentos['contratos_cliente/vitalle-odonto'],
    valorProgramado: 1000,
    valorProgramadoEm: '2026-09',
    valorProgramadoMotivo: 'ajuste manual sintético',
  };
  for (const [caminho, dados] of Object.entries(documentos)) {
    if (!caminho.startsWith('pagamentos_mensais/vitalle-odonto_') || competenciaDoPagamento(caminho) < '2026-09') continue;
    if (!['aberto', 'isento'].includes(Core.statusMensalidade(dados))) continue;
    const ajuste = { ...dados, valorDevido: 1000 };
    if (Object.prototype.hasOwnProperty.call(dados, 'valor')) ajuste.valor = 1000;
    if (Object.prototype.hasOwnProperty.call(dados, 'valorCobrado')) ajuste.valorCobrado = 1000;
    documentos[caminho] = ajuste;
  }
}

function marcarZeissManual(documentos) {
  documentos['contatos_clientes_financeiro/zeiss'] = {
    slug: 'zeiss',
    nome: 'Zeiss · fixture sintética',
    whatsapp: TELEFONE_SINTETICO_CANONICO,
    origem: 'edicao_manual_fixture',
  };
}

function marcarJoaquimEAcoqueManuais(documentos, { vigencias = [] } = {}) {
  delete documentos['clientes_encerrados/saida_joaquin_2026-09-15'];
  delete documentos['clientes_encerrados/saida_joaquin_duplicada'];
  delete documentos['clientes_encerrados/saida_acougue_2026-09-15'];
  marcarSaidaManual(documentos, 'joaquin-assados', {
    saidaId: 'saida_manual_joaquin_2026-09-18',
    dataSaida: '2026-09-18',
    vigencias,
  });
  marcarSaidaManual(documentos, 'acougue-sao-joaquim', {
    saidaId: 'saida_manual_acougue_2026-09-19',
    dataSaida: '2026-09-19',
    vigencias,
  });
}

function marcarFedaltoResolvida(documentos) {
  const contrato = {
    ...documentos['contratos_cliente/fedalto-eletro-comercial'],
    status: 'ativo',
    vigencias: [{ inicio: '2026-08', fim: '', valor: 1700, cicloId: 'manual-v105' }],
    cortesiaMeses: ['2026-09'],
  };
  delete contrato.ultimaCompetenciaPagamento;
  delete contrato.saidaProgramadaPara;
  documentos['contratos_cliente/fedalto-eletro-comercial'] = contrato;
  documentos['pagamentos_mensais/fedalto-eletro-comercial_2026-09'] = {
    ...documentos['pagamentos_mensais/fedalto-eletro-comercial_2026-09'],
    status: 'isento',
    cortesiaDoMes: true,
    motivoIsencao: 'cortesia promocional sintética de setembro',
  };
  documentos['config_financeiro/regua_cobranca'] = {
    ...documentos['config_financeiro/regua_cobranca'],
    inicioOperacao: '2026-07',
    competenciasQuitadasAte: '2026-08',
  };
  const config = { ...(documentos['clientes_config/fedalto-eletro-comercial'] || {}) };
  for (const campo of ['saidaAtivaId', 'saidaProgramadaPara', 'saidaMotivo', 'saidaMotivoDetalhe']) delete config[campo];
  documentos['clientes_config/fedalto-eletro-comercial'] = config;
  for (const caminho of Object.keys(documentos)) {
    if (!caminho.startsWith('clientes_encerrados/')) continue;
    const saida = documentos[caminho];
    if (['fedalto-eletro-comercial', 'fedalto-eletro'].includes(saida.slug || saida.canonicalId)) delete documentos[caminho];
  }
}

function fixtureTresAjustesManuais() {
  const documentos = fixtureInicial();
  marcarVitalleManual(documentos);
  marcarSaidaManual(documentos, 'dra-monique', {
    saidaId: 'saida_manual_monique_2026-09-20',
    dataSaida: '2026-09-20',
    vigencias: [],
    criarPonteiro: true,
    nome: 'Dra. Monique · saída manual sintética',
  });
  marcarZeissManual(documentos);
  return documentos;
}

function fixtureTudoResolvidoManualmente() {
  const documentos = fixtureTresAjustesManuais();
  marcarJoaquimEAcoqueManuais(documentos, { vigencias: [] });
  marcarFedaltoResolvida(documentos);
  return documentos;
}

function caminhosEscritos(db) {
  return db.commits.flatMap(commit => commit.caminhos || []);
}

async function testarCenarioInicialV104() {
  const db = criarBanco(fixtureInicial());
  const runtime = instalarRuntime(db);
  verificar(await runtime.prever(), 'cenário inicial V104 continua com prévia segura no runtime V105');
  verificar(await runtime.aplicar(), 'cenário inicial V104 continua aplicável no runtime V105');
  igual(movimentos(db, '2026-09').totais.ativos, 19, 'cenário inicial continua convergindo para 19 clientes ativos em setembro');
  igual(db.commits.filter(v => v.tipo === 'transaction').length, 2, 'cenário inicial mantém uma transação por causa independente');
}

async function testarTudoJaManualZeroWrites() {
  const db = criarBanco(fixtureTudoResolvidoManualmente());
  const runtime = instalarRuntime(db);
  const antes = assinatura(Object.fromEntries(db.dados));
  verificar(await runtime.prever(), 'prévia reconhece todas as correções manuais como resolvidas');
  verificar(Object.values(globalThis.__correcaoSetembroV103.resolvidos).every(Boolean), 'Vitalle, Monique, Joaquim, Açougue e Zeiss aparecem como já confirmados');
  verificar(globalThis.__correcaoFedaltoV104.resolvida === true, 'Fedalto e Régua já corretas aparecem como resolvidas');
  igual(db.commits.length, 0, 'prévia de estado manual completo executa zero writes');
  verificar(await runtime.aplicar(), 'aplicar sobre estado manual completo retorna sucesso idempotente');
  igual(db.commits.length, 0, 'aplicação sobre estado manual completo executa zero writes');
  igual(assinatura(Object.fromEntries(db.dados)), antes, 'estado manual completo permanece byte a byte');
  igual(documentosDaColecao(db, 'clientes_encerrados').filter(v => v.canonicalId === 'dra-monique' || v.slug === 'dra-monique').map(v => v.id), ['saida_manual_monique_2026-09-20'], 'saída manual da Monique permanece única e com o mesmo ID');
}

async function testarParcialEscreveSomentePendentes() {
  const db = criarBanco(fixtureTresAjustesManuais());
  const runtime = instalarRuntime(db);
  const preservados = [
    'contratos_cliente/vitalle-odonto',
    'pagamentos_mensais/vitalle-odonto_2026-09',
    'pagamentos_mensais/vitalle-odonto_2026-10',
    'contratos_cliente/dra-monique',
    'clientes_config/dra-monique',
    'clientes_encerrados/saida_manual_monique_2026-09-20',
    'pagamentos_mensais/dra-monique_2026-09',
    'pagamentos_mensais/dra-monique_2026-10',
    'contatos_clientes_financeiro/zeiss',
  ];
  const antes = Object.fromEntries(preservados.map(caminho => [caminho, assinatura(obter(db, caminho))]));
  verificar(await runtime.preverCarteira(), 'prévia parcial aceita saída manual da Monique com ID e data diferentes');
  igual(globalThis.__correcaoSetembroV103.resolvidos, {
    vitalle: true,
    monique: true,
    joaquin: false,
    acougue: false,
    zeiss: true,
  }, 'classificador separa exatamente os três ajustes manuais dos dois pendentes');
  verificar(await runtime.aplicarCarteira(), 'aplicação parcial conclui Joaquim/Açougue sem tocar nos ajustes manuais');
  const escritos = caminhosEscritos(db);
  for (const caminho of preservados) {
    verificar(!escritos.includes(caminho), `${caminho} fica fora das escritas da transação parcial`);
    igual(assinatura(obter(db, caminho)), antes[caminho], `${caminho} permanece byte a byte`);
  }
  verificar(escritos.includes('contratos_cliente/joaquin-assados') && escritos.includes('contratos_cliente/acougue-sao-joaquim'), 'transação parcial escreve somente os contratos realmente pendentes');
  igual(documentosDaColecao(db, 'clientes_encerrados').filter(v => (v.canonicalId || v.slug) === 'dra-monique').map(v => v.id), ['saida_manual_monique_2026-09-20'], 'aplicação parcial não cria segunda saída para a Monique');
  igual(obter(db, 'clientes_config/dra-monique').saidaAtivaId, 'saida_manual_monique_2026-09-20', 'ponteiro manual da Monique permanece no mesmo recibo');
}

async function testarVigenciasVaziasComUltimaAgosto() {
  const db = criarBanco(fixtureTudoResolvidoManualmente());
  const runtime = instalarRuntime(db);
  verificar(await runtime.preverCarteira(), 'vigencias vazias com última competência agosto são compatibilidade legada válida');
  igual(globalThis.__correcaoSetembroV103.vigenciasMonique, [], 'Monique preserva vigencias=[] em vez de inventar um ciclo');
  igual(globalThis.__correcaoSetembroV103.vigenciasJoaquin, [], 'Joaquim preserva vigencias=[] em vez de inventar um ciclo');
  igual(globalThis.__correcaoSetembroV103.vigenciasAcougue, [], 'Açougue preserva vigencias=[] em vez de inventar um ciclo');
  verificar(['monique', 'joaquin', 'acougue'].every(chave => globalThis.__correcaoSetembroV103.resolvidos[chave]), 'três saídas manuais legadas são reconhecidas sem regravação');
  igual(db.commits.length, 0, 'compatibilidade vigencias=[] é somente leitura');
}

async function testarDuplicatasEquivalentesEDivergentes() {
  {
    const db = criarBanco(fixtureInicial());
    const runtime = instalarRuntime(db);
    verificar(await runtime.preverCarteira(), 'duplicatas equivalentes do Joaquim permitem prévia segura');
    igual(globalThis.__correcaoSetembroV103.duplicadas.map(v => v.id), ['saida_joaquin_duplicada'], 'assinatura operacional reconhece uma única duplicata equivalente');
    verificar(await runtime.aplicarCarteira(), 'somente duplicata equivalente pode ser consolidada');
    igual(obter(db, 'clientes_encerrados/saida_joaquin_duplicada').excluido, true, 'duplicata equivalente recebe soft-delete auditável');
  }
  {
    const documentos = fixtureInicial();
    documentos['clientes_encerrados/saida_joaquin_duplicada'] = {
      ...documentos['clientes_encerrados/saida_joaquin_duplicada'],
      dataSaida: '2026-09-16',
    };
    const db = criarBanco(documentos);
    const runtime = instalarRuntime(db);
    verificar(!(await runtime.preverCarteira()), 'duplicatas divergentes bloqueiam a prévia sem escolher uma por posição ou nome');
    verificar(globalThis.__correcaoSetembroV103.bloqueios.some(v => v.includes('saídas ativas divergentes')), 'bloqueio identifica explicitamente a divergência de saídas');
    verificar(!(await runtime.aplicarCarteira()), 'aplicação continua bloqueada diante de duplicatas divergentes');
    igual(db.commits.length, 0, 'duplicatas divergentes produzem zero writes');
    igual(obter(db, 'clientes_encerrados/saida_joaquin_duplicada').excluido, false, 'registro divergente não é arquivado por suposição');
  }
  {
    const documentos = fixtureInicial();
    documentos['clientes_encerrados/saida_joaquin_duplicada'] = {
      ...documentos['clientes_encerrados/saida_joaquin_duplicada'],
      motivo: 'inadimplência sintética',
      motivoDetalhe: 'evento materialmente diferente para o ensaio',
      pendenciasFinais: 'entrega sintética distinta',
      fichaSnapshot: { tipo: 'mensalista', plano: 'fixture divergente' },
    };
    const db = criarBanco(documentos);
    const runtime = instalarRuntime(db);
    verificar(!(await runtime.preverCarteira()), 'mesma data não torna equivalentes saídas com motivo e pendências diferentes');
    verificar(globalThis.__correcaoSetembroV103.bloqueios.some(v => v.includes('saídas ativas divergentes')), 'divergência material do histórico é explicitamente bloqueada');
    verificar(!(await runtime.aplicarCarteira()), 'saída materialmente divergente não pode ser consolidada');
    igual(db.commits.length, 0, 'divergência material produz zero writes');
    igual(obter(db, 'clientes_encerrados/saida_joaquin_duplicada').excluido, false, 'evento histórico distinto permanece preservado');
  }
}

async function testarFedaltoFinalAgostoEJaCorreta() {
  {
    const documentos = fixtureInicial();
    documentos['contratos_cliente/fedalto-eletro-comercial'] = {
      ...documentos['contratos_cliente/fedalto-eletro-comercial'],
      ultimaCompetenciaPagamento: '2026-08',
      vigencias: [{ inicio: '2026-08', fim: '2026-08', valor: 1700, cicloId: 'fechamento-equivocado-sintetico' }],
      status: 'encerrado',
    };
    documentos['clientes_encerrados/saida_fedalto_manual_2026-09-01'] = {
      slug: 'fedalto-eletro-comercial',
      dataSaida: '2026-09-01',
      ultimaCompetenciaPagamento: '2026-08',
      statusSaida: 'programada',
      excluido: false,
    };
    documentos['clientes_config/fedalto-eletro-comercial'] = {
      ...documentos['clientes_config/fedalto-eletro-comercial'],
      saidaAtivaId: 'saida_fedalto_manual_2026-09-01',
      saidaProgramadaPara: '2026-09-01',
    };
    const db = criarBanco(documentos);
    const runtime = instalarRuntime(db);
    verificar(await runtime.preverFedalto(), 'Fedalto encerrada no fim de agosto é reparável sem inferência sobre outro ciclo');
    verificar(await runtime.aplicarFedalto(), 'reparo explícito reabre somente o ciclo inequívoco da Fedalto');
    const contrato = obter(db, 'contratos_cliente/fedalto-eletro-comercial');
    verificar(Core.vigenteNaCompetencia(contrato, '2026-09') && Core.vigenteNaCompetencia(contrato, '2026-10'), 'Fedalto permanece vigente em setembro e outubro');
    verificar(!contrato.ultimaCompetenciaPagamento, 'reparo remove somente o falso encerramento financeiro');
    igual(Core.statusMensalidade(obter(db, 'pagamentos_mensais/fedalto-eletro-comercial_2026-09')), 'isento', 'setembro da Fedalto vira cortesia, não cobrança nem encerramento');
    igual(obter(db, 'clientes_encerrados/saida_fedalto_manual_2026-09-01').excluido, true, 'falsa saída da Fedalto é arquivada sem delete físico');
  }
  {
    const documentos = fixtureInicial();
    marcarFedaltoResolvida(documentos);
    const db = criarBanco(documentos);
    const runtime = instalarRuntime(db);
    const antes = assinatura(Object.fromEntries(db.dados));
    verificar(await runtime.preverFedalto(), 'Fedalto já correta é reconhecida pela prévia');
    verificar(globalThis.__correcaoFedaltoV104.resolvida === true, 'classificador marca Fedalto/Régua como resolvidas');
    verificar(await runtime.aplicarFedalto(), 'retry da Fedalto já correta retorna sucesso');
    igual(db.commits.length, 0, 'Fedalto já correta executa zero writes');
    igual(assinatura(Object.fromEntries(db.dados)), antes, 'Fedalto já correta permanece byte a byte');
  }
  {
    const documentos = fixtureInicial();
    marcarFedaltoResolvida(documentos);
    delete documentos['pagamentos_mensais/fedalto-eletro-comercial_2026-09'].cortesiaDoMes;
    const db = criarBanco(documentos);
    const runtime = instalarRuntime(db);
    const antes = assinatura(Object.fromEntries(db.dados));
    verificar(await runtime.preverFedalto(), 'Fedalto manual isenta sem o marcador cortesiaDoMes continua sendo reconhecida');
    verificar(globalThis.__correcaoFedaltoV104.resolvida === true, 'estado terminal isento basta para classificar a cortesia manual como resolvida');
    verificar(await runtime.aplicarFedalto(), 'aplicar sobre Fedalto manual isenta retorna sucesso idempotente');
    igual(db.commits.length, 0, 'Fedalto manual isenta sem marcador executa zero writes');
    igual(assinatura(Object.fromEntries(db.dados)), antes, 'Fedalto manual isenta sem marcador permanece byte a byte');
  }
}

async function testarCliqueConcorrenteERetryComAjustesManuais() {
  const db = criarBanco(fixtureTresAjustesManuais());
  const manualAntes = assinatura({
    vitalle: obter(db, 'contratos_cliente/vitalle-odonto'),
    monique: obter(db, 'clientes_encerrados/saida_manual_monique_2026-09-20'),
    zeiss: obter(db, 'contatos_clientes_financeiro/zeiss'),
  });
  const abaA = instalarRuntime(db);
  const aplicarA = abaA.aplicar;
  const abaB = instalarRuntime(db);
  const aplicarB = abaB.aplicar;
  igual(await Promise.all([aplicarA(), aplicarB()]), [true, true], 'dois chamados concorrentes no mesmo contexto convergem com Vitalle, Monique e Zeiss já manuais');
  igual(db.commits.filter(v => v.tipo === 'transaction').length, 2, 'trava de clique cria somente as duas transações ainda necessárias');
  const commitsAntesRetry = db.commits.length;
  verificar(await aplicarB(), 'retry após chamados concorrentes retorna sucesso idempotente');
  igual(db.commits.length, commitsAntesRetry, 'retry após recibos executa zero writes adicionais');
  igual(assinatura({
    vitalle: obter(db, 'contratos_cliente/vitalle-odonto'),
    monique: obter(db, 'clientes_encerrados/saida_manual_monique_2026-09-20'),
    zeiss: obter(db, 'contatos_clientes_financeiro/zeiss'),
  }), manualAntes, 'clique concorrente e retry preservam os três ajustes manuais byte a byte');
}

async function testarConflitoRealDeOutraAbaNaZeiss() {
  const documentos = fixtureTudoResolvidoManualmente();
  delete documentos['contatos_clientes_financeiro/zeiss'];
  const db = criarBanco(documentos);
  const runtime = instalarRuntime(db);
  verificar(await runtime.preverCarteira(), 'prévia deixa somente o contato ausente da Zeiss como ajuste pendente');
  igual(globalThis.__correcaoSetembroV103.pendentes, {
    vitalle: false,
    monique: false,
    joaquin: false,
    acougue: false,
    zeiss: true,
  }, 'classificador isola a Zeiss sem reabrir ajustes já resolvidos');

  const numeroPretendido = '5541990000010';
  const numeroGravadoNaOutraAba = '5541990000011';
  runtime.dom.elementos.get('correcaoZeissWhatsV103').value = numeroPretendido;
  db.beforeTransactionOnce = banco => {
    banco.dados.set('contatos_clientes_financeiro/zeiss', {
      slug: 'zeiss',
      nome: 'Zeiss · alteração concorrente sintética',
      whatsapp: numeroGravadoNaOutraAba,
      origem: 'outra_aba_fixture',
    });
  };

  const errosEsperados = [];
  const consoleErrorAnterior = console.error;
  console.error = (...args) => errosEsperados.push(args.map(String).join(' '));
  let resultadoConflito;
  try {
    resultadoConflito = await runtime.aplicarCarteira();
  } finally {
    console.error = consoleErrorAnterior;
  }
  verificar(!resultadoConflito, 'alteração concorrente real da Zeiss é detectada dentro da transação');
  verificar(errosEsperados.some(v => v.includes('mudou em outra aba')), 'falha concorrente devolve a causa específica sem mascarar o conflito');
  igual(db.commits.length, 0, 'conflito da outra aba aborta o commit inteiro');
  igual(obter(db, 'contatos_clientes_financeiro/zeiss').whatsapp, numeroGravadoNaOutraAba, 'número confirmado pela outra aba não é sobrescrito');
  verificar(obter(db, 'contatos_clientes_financeiro/zeiss').whatsapp !== numeroPretendido, 'número pretendido pela aba desatualizada não é gravado');
}

await testarCenarioInicialV104();
await testarTudoJaManualZeroWrites();
await testarParcialEscreveSomentePendentes();
await testarVigenciasVaziasComUltimaAgosto();
await testarDuplicatasEquivalentesEDivergentes();
await testarFedaltoFinalAgostoEJaCorreta();
await testarCliqueConcorrenteERetryComAjustesManuais();
await testarConflitoRealDeOutraAbaNaZeiss();

console.log(`REGRESSAO V105 CONCILIACAO MANUAL FINANCEIRO: OK (${total} verificacoes)`);
