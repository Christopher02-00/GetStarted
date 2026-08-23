#!/usr/bin/env node

/*
 * Regressão UI V106 — saída canônica do Joaquin Assados.
 *
 * Executa o módulo financeiro real num Chromium real, em desktop e mobile,
 * contra um Firestore sintético em memória. A prévia unificada V105 permanece
 * bloqueada pela divergência histórica; a porta V106 resolve somente os dois
 * documentos auditados, com soft-delete, ponteiro canônico e recibo. Nenhum
 * dado real, credencial, telefone ou Firebase publicado participa da prova.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caminhoHtml = path.join(raiz, 'escritorio.html');
const caminhoCore = path.join(raiz, 'financeiro-core.mjs');
const caminhoUi = path.join(raiz, 'financeiro-ui-v104.mjs');
const caminhoTeste = fileURLToPath(import.meta.url);
const fonteHtml = fs.readFileSync(caminhoHtml, 'utf8');
const fonteCore = fs.readFileSync(caminhoCore, 'utf8');
const fonteUi = fs.readFileSync(caminhoUi, 'utf8');
const estilosReais = [...fonteHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  .map(resultado => resultado[1])
  .join('\n');

function sha256Texto(valor) {
  return crypto.createHash('sha256').update(valor).digest('hex');
}

function sha256Arquivo(arquivo) {
  return sha256Texto(fs.readFileSync(arquivo));
}

const hashesIniciais = {
  html: sha256Arquivo(caminhoHtml),
  core: sha256Arquivo(caminhoCore),
  ui: sha256Arquivo(caminhoUi),
};

let total = 0;
const falhas = [];

function exigir(condicao, mensagem) {
  total += 1;
  if (!condicao) {
    falhas.push(mensagem);
    console.error('FAIL ', mensagem);
    return false;
  }
  console.log('PASS ', mensagem);
  return true;
}

function bootstrapFixtureV106() {
  const parametros = new URLSearchParams(location.search);
  window.usuarioAtual = parametros.get('role') || 'Chris';
  window.db = { path: '' };
  window.auth = { currentUser: { uid: 'uid-sintetico-v106' } };
  window.__fixtureWrites = [];
  window.__fixtureReads = [];
  window.__fixtureToasts = [];
  window.__fixtureConfirms = [];
  window.__fixtureRenderCalls = [];
  window.__fixtureBulkApplyCalls = 0;
  window.__beforeTransactionOnce = null;
  window.__failBeforeCommitOnce = false;
  window.__txQueue = Promise.resolve();

  const CANONICAL_EXIT = '62eBY5iSyFtP21vECYMm';
  const DUPLICATE_EXIT = '0oqy4pk1tcKZccWWyZDi';

  function clone(valor) {
    if (valor instanceof Date) return new Date(valor.getTime());
    if (Array.isArray(valor)) return valor.map(clone);
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, clone(item)]));
    }
    return valor;
  }

  function normalizar(valor) {
    if (valor instanceof Date) return { __date: valor.toISOString() };
    if (Array.isArray(valor)) return valor.map(normalizar);
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(Object.keys(valor).sort().map(chave => [chave, normalizar(valor[chave])]));
    }
    return valor;
  }

  function assinatura(valor) {
    return JSON.stringify(normalizar(valor));
  }

  window.__assinaturaFixtureV106 = assinatura;

  function storeInicial() {
    return {
      contratos_cliente: {
        'joaquin-assados': {
          canonicalId: 'joaquin-assados',
          clienteNome: 'Joaquin Assados · fixture sintética',
          primeiraCompetencia: '2026-01',
          ultimaCompetenciaPagamento: '2026-08',
          saidaProgramadaPara: '2026-09-15',
          saidaMotivo: 'resultado',
          saidaMotivoDetalhe: 'Baixo retorno financeiro',
          valorInicial: 900,
          valorVigente: 900,
          valorCheio: 900,
          diaVencimento: 10,
          status: 'ativo',
          vigencias: [{ inicio: '2026-01', fim: '2026-08', valor: 900, cicloId: 'fixture-joaquin' }],
        },
        'acougue-sao-joaquim': {
          canonicalId: 'acougue-sao-joaquim',
          clienteNome: 'Açougue São Joaquim · fixture sintética',
          primeiraCompetencia: '2026-01',
          ultimaCompetenciaPagamento: '2026-08',
          valorInicial: 1100,
          valorVigente: 1100,
          valorCheio: 1100,
          diaVencimento: 10,
          status: 'ativo',
          vigencias: [{ inicio: '2026-01', fim: '2026-08', valor: 1100, cicloId: 'fixture-acougue' }],
        },
      },
      pagamentos_mensais: {
        'joaquin-assados_2026-09': {
          cliente: 'joaquin-assados', canonicalId: 'joaquin-assados',
          clienteNome: 'Joaquin Assados · fixture sintética', competencia: '2026-09',
          valorDevido: 900, diaVencimento: 10, status: 'cancelado',
          motivoCancelamento: 'fixture sintética preservada',
        },
        'acougue-sao-joaquim_2026-09': {
          cliente: 'acougue-sao-joaquim', canonicalId: 'acougue-sao-joaquim',
          clienteNome: 'Açougue São Joaquim · fixture sintética', competencia: '2026-09',
          valorDevido: 1100, diaVencimento: 10, status: 'cancelado',
        },
      },
      clientes_encerrados: {
        [CANONICAL_EXIT]: {
          slug: 'joaquin-assados', canonicalId: 'joaquin-assados',
          nome: 'Joaquin Assados · saída confirmada sintética',
          dataAviso: '2026-08-05', dataSaida: '2026-09-15',
          ultimaCompetenciaPagamento: '2026-08', statusSaida: 'programada',
          tipoCliente: 'mensalista', valorMensal: 900,
          motivo: 'resultado', motivoDetalhe: 'Baixo retorno financeiro',
          pendenciasFinais: ['entrega sintética preservada'],
          fichaSnapshot: { plano: 'fixture-canônica', origem: 'teste-v106' },
          excluido: false,
        },
        [DUPLICATE_EXIT]: {
          slug: 'joaquin-assados', canonicalId: 'joaquin-assados',
          nome: 'Joaquin Assados · registro concorrente sintético',
          dataAviso: '2026-08-06', dataSaida: '2026-09-15',
          statusSaida: 'programada', tipoCliente: 'mensalista', valorMensal: 900,
          motivo: 'mudanca_interna', motivoDetalhe: 'Baixo retorno financeiro',
          pendenciasFinais: ['entrega sintética preservada'],
          fichaSnapshot: { plano: 'fixture-antiga', origem: 'teste-v106' },
          excluido: false,
        },
        'saida-acougue-fixture': {
          slug: 'acougue-sao-joaquim', canonicalId: 'acougue-sao-joaquim',
          nome: 'Açougue São Joaquim · saída sintética',
          dataAviso: '2026-08-07', dataSaida: '2026-09-15',
          ultimaCompetenciaPagamento: '2026-08', statusSaida: 'programada',
          tipoCliente: 'mensalista', valorMensal: 1100,
          motivo: 'fim_projeto', motivoDetalhe: 'fixture separada', excluido: false,
        },
      },
      clientes_config: {
        'joaquin-assados': {
          nome: 'Joaquin Assados · ficha sintética', tipoCliente: 'mensalista',
          clienteInativo: false, saidaProgramadaPara: '2026-09-15',
          saidaMotivo: 'resultado', saidaMotivoDetalhe: 'Baixo retorno financeiro',
        },
        'acougue-sao-joaquim': {
          nome: 'Açougue São Joaquim · ficha sintética', tipoCliente: 'mensalista',
          clienteInativo: false,
        },
      },
      clientes_ciclo_financeiro: {},
      recebimentos_entrada_pessoal: {},
      receitas_avulsas: {},
      financeiro_lancamentos: {},
      config_financeiro: {
        regua_cobranca: { schemaVersion: 1, inicioOperacao: '2026-07', competenciasQuitadasAte: '2026-08' },
      },
      contatos_clientes_financeiro: {},
    };
  }

  window.__store = storeInicial();
  window.__resetFixtureV106 = function() {
    window.__store = storeInicial();
    window.__fixtureWrites = [];
    window.__fixtureReads = [];
    window.__fixtureToasts = [];
    window.__fixtureConfirms = [];
    window.__beforeTransactionOnce = null;
    window.__failBeforeCommitOnce = false;
    window.__txQueue = Promise.resolve();
    window.__financeiroV104?.invalidar?.();
  };

  function slug(valor) {
    return String(valor || '').trim().toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  window.slugClienteCanonico = slug;
  window.hojeLocal = () => '2026-09-12';
  window.brl = valor => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
  window.nomeMes = competencia => competencia;
  window.esc = valor => String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  window.escAttr = window.esc;
  window.escJs = valor => String(valor ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  window.mostrarToast = function(mensagem, tipo) {
    window.__fixtureToasts.push({ mensagem: String(mensagem || ''), tipo: String(tipo || '') });
    const toast = document.getElementById('toast');
    if (toast) toast.textContent = String(mensagem || '');
  };
  window.registrarLogAutomacao = () => undefined;
  window.confirm = function(mensagem) {
    window.__fixtureConfirms.push(String(mensagem || ''));
    return true;
  };

  function collection(_db, nome) {
    return { tipo: 'collection', path: String(nome), id: String(nome) };
  }

  function doc(_db, colecao, id) {
    return { tipo: 'document', colecao: String(colecao), id: String(id), path: `${colecao}/${id}` };
  }

  function snapshotDocumento(ref, store = window.__store) {
    const colecao = store[ref.colecao] || {};
    const existe = Object.prototype.hasOwnProperty.call(colecao, ref.id);
    const dados = existe ? clone(colecao[ref.id]) : undefined;
    return { id: ref.id, ref, exists: () => existe, data: () => clone(dados) };
  }

  async function getDocs(ref) {
    window.__fixtureReads.push(ref.path);
    const colecao = window.__store[ref.path] || {};
    const docs = Object.keys(colecao).sort().map(id => snapshotDocumento(doc(window.db, ref.path, id)));
    return { docs, size: docs.length, empty: docs.length === 0, forEach: callback => docs.forEach(callback) };
  }

  async function getDoc(ref) {
    window.__fixtureReads.push(ref.path);
    return snapshotDocumento(ref);
  }

  function resolver(valor, anterior) {
    if (valor && valor.__op === 'serverTimestamp') return new Date('2026-09-12T15:00:00.000Z');
    if (valor && valor.__op === 'deleteField') return undefined;
    if (valor && valor.__op === 'arrayUnion') {
      const base = Array.isArray(anterior) ? clone(anterior) : [];
      for (const item of valor.items) {
        if (!base.some(existente => assinatura(existente) === assinatura(item))) base.push(clone(item));
      }
      return base;
    }
    if (valor instanceof Date) return new Date(valor.getTime());
    if (Array.isArray(valor)) return valor.map(item => resolver(item));
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(Object.entries(valor)
        .map(([chave, item]) => [chave, resolver(item, anterior?.[chave])])
        .filter(([, item]) => item !== undefined));
    }
    return clone(valor);
  }

  function aplicarSet(store, ref, dados, merge) {
    store[ref.colecao] ||= {};
    const anterior = store[ref.colecao][ref.id] || {};
    const proximo = merge ? clone(anterior) : {};
    for (const [chave, valor] of Object.entries(dados || {})) {
      const resolvido = resolver(valor, anterior[chave]);
      if (resolvido === undefined) delete proximo[chave];
      else proximo[chave] = resolvido;
    }
    store[ref.colecao][ref.id] = proximo;
  }

  async function setDoc(ref, dados, opcoes = {}) {
    aplicarSet(window.__store, ref, dados, opcoes.merge === true);
    window.__fixtureWrites.push({ tipo: 'setDoc', caminhos: [ref.path] });
  }

  async function updateDoc(ref, dados) {
    if (!window.__store[ref.colecao]?.[ref.id]) throw new Error(`Documento ausente: ${ref.path}`);
    aplicarSet(window.__store, ref, dados, true);
    window.__fixtureWrites.push({ tipo: 'updateDoc', caminhos: [ref.path] });
  }

  async function runTransaction(_db, callback) {
    const executar = async function() {
      if (window.__beforeTransactionOnce) {
        const gancho = window.__beforeTransactionOnce;
        window.__beforeTransactionOnce = null;
        await gancho();
      }
      const operacoes = [];
      const tx = {
        get: async ref => snapshotDocumento(ref),
        set: (ref, dados, opcoes = {}) => operacoes.push({ ref, dados: clone(dados), merge: opcoes.merge === true }),
        update: (ref, dados) => operacoes.push({ ref, dados: clone(dados), merge: true, exigeExistencia: true }),
      };
      const resultado = await callback(tx);
      if (window.__failBeforeCommitOnce) {
        window.__failBeforeCommitOnce = false;
        throw new Error('Falha sintética antes do commit');
      }
      for (const operacao of operacoes) {
        if (operacao.exigeExistencia && !window.__store[operacao.ref.colecao]?.[operacao.ref.id]) {
          throw new Error(`Documento ausente: ${operacao.ref.path}`);
        }
      }
      const proximoStore = clone(window.__store);
      for (const operacao of operacoes) aplicarSet(proximoStore, operacao.ref, operacao.dados, operacao.merge);
      window.__store = proximoStore;
      if (operacoes.length) {
        window.__fixtureWrites.push({ tipo: 'transaction', caminhos: operacoes.map(operacao => operacao.ref.path) });
      }
      return resultado;
    };
    const pendente = window.__txQueue.then(executar, executar);
    window.__txQueue = pendente.catch(() => undefined);
    return pendente;
  }

  window.collection = collection;
  window.doc = doc;
  window.getDocs = getDocs;
  window.getDoc = getDoc;
  window.setDoc = setDoc;
  window.updateDoc = updateDoc;
  window.runTransaction = runTransaction;
  window.serverTimestamp = () => ({ __op: 'serverTimestamp' });
  window.deleteField = () => ({ __op: 'deleteField' });
  window.arrayUnion = (...items) => ({ __op: 'arrayUnion', items: clone(items) });
}

const htmlHarness = [
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>',
  estilosReais,
  'html,body{margin:0;max-width:100%;min-height:100%;overflow-x:clip!important;background:#202124;color:#f3f3f1}',
  'body{padding:18px}.fixtureV106{width:min(980px,100%);margin:auto}.fixtureV106 *{box-sizing:border-box}',
  '@media(max-width:600px){body{padding:8px}.fixtureV106{width:100%}.row2,.row3,.painelResumo{grid-template-columns:1fr!important}}',
  '</style></head><body><main class="fixtureV106">',
  '<div style="display:none"><input id="finMes" type="month" value="2026-09"><input id="mensMes" type="month" value="2026-09"><input id="cobMes" type="month" value="2026-09"><input id="ctMes" type="month" value="2026-09"><select id="mensFiltro"><option value="todos">Todos</option></select><span id="badgeCobranca"></span></div>',
  '<div id="financeiroCorrecoesV104Box" class="card" style="border:2px solid var(--yellow)">',
  '<h2>🧾 Conferir os ajustes de setembro</h2>',
  '<button id="bulkPreview" class="btn secondary" style="width:auto" onclick="preverCorrecaoFinanceiraV104()">1. Verificar sem salvar</button>',
  '<div id="financeiroCorrecoesV103Status"><div class="meta">Aguardando carteira.</div></div>',
  '<div id="financeiroCorrecoesFedaltoV104Status"><div class="meta">Aguardando Fedalto.</div></div>',
  '<div id="financeiroCorrecoesV104Acao"></div>',
  '</div>',
  '<div id="financeiroBox"></div><div id="mensalidadesBox"></div><div id="cobrancaBox"></div><div id="contratosBox"></div><div id="financeiroLancamentosBox"></div><div id="toast"></div>',
  '</main><script>(', bootstrapFixtureV106.toString(), ')();</script>',
  '<script type="module">',
  "import { instalarFinanceiroV104 } from '/financeiro-ui-v104.mjs?v=109';",
  'const deps={db:window.db,collection:window.collection,doc:window.doc,getDocs:window.getDocs,getDoc:window.getDoc,setDoc:window.setDoc,updateDoc:window.updateDoc,runTransaction:window.runTransaction,serverTimestamp:window.serverTimestamp,deleteField:window.deleteField,arrayUnion:window.arrayUnion,slugClienteCanonico:window.slugClienteCanonico,hojeLocal:window.hojeLocal,brl:window.brl,nomeMes:window.nomeMes,esc:window.esc,escAttr:window.escAttr,escJs:window.escJs,mostrarToast:window.mostrarToast,usuarioAtual:()=>window.usuarioAtual,auth:window.auth,registrarLogAutomacao:window.registrarLogAutomacao};',
  'window.__depsV106=deps;',
  'window.__runtimeA=instalarFinanceiroV104(deps);',
  'window.__aplicarAbaA=window.aplicarCorrecaoSaidaCanonicaJoaquinV106;',
  'window.__instalarOutraAbaV106=()=>{instalarFinanceiroV104(deps);return window.aplicarCorrecaoSaidaCanonicaJoaquinV106;};',
  'window.__stubRendersV106=()=>{window.renderFinanceiro=async()=>{window.__fixtureRenderCalls.push("financeiro");return true;};window.renderMensalidades=async()=>{window.__fixtureRenderCalls.push("mensalidades");return true;};window.renderCobranca=async()=>{window.__fixtureRenderCalls.push("cobranca");return true;};window.renderContratos=async()=>{window.__fixtureRenderCalls.push("contratos");return true;};};',
  'window.__fixtureReady=true;',
  '</script></body></html>',
].join('');

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/' || url.pathname === '/fixture.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(htmlHarness);
    return;
  }
  if (url.pathname === '/financeiro-core.mjs') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(fonteCore);
    return;
  }
  if (url.pathname === '/financeiro-ui-v104.mjs') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(fonteUi);
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

await new Promise((resolve, reject) => {
  servidor.once('error', reject);
  servidor.listen(0, '127.0.0.1', resolve);
});
const endereco = servidor.address();
const baseUrl = `http://127.0.0.1:${endereco.port}/fixture.html`;
const navegador = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});

async function novaPagina(viewport, papel = 'Chris') {
  const page = await navegador.newPage({ viewport });
  const pageerrors = [];
  page.on('pageerror', erro => pageerrors.push(String(erro?.message || erro)));
  await page.goto(`${baseUrl}?role=${encodeURIComponent(papel)}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__fixtureReady === true);
  return { page, pageerrors };
}

async function clicarEEsperar(page, seletor, predicado) {
  await page.click(seletor);
  await page.waitForFunction(predicado);
}

async function testarFluxoPrincipal(page, rotulo) {
  const inicial = await page.evaluate(() => ({
    painel: !!document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box'),
    status: !!document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Status'),
    pai: document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.parentElement?.id || '',
    texto: document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.textContent || '',
    writes: window.__fixtureWrites.length,
  }));
  exigir(inicial.painel && inicial.status && inicial.pai === 'financeiroCorrecoesV104Box', `${rotulo}: cartão V106 nasce dinamicamente dentro do painel financeiro`);
  exigir(inicial.texto.includes('15/09/2026') && inicial.texto.includes('baixo retorno financeiro') && inicial.texto.includes('agosto de 2026'), `${rotulo}: cartão repete exatamente os fatos confirmados ao usuário`);
  exigir(inicial.writes === 0, `${rotulo}: montar o cartão executa zero writes`);

  await clicarEEsperar(page, '#bulkPreview', () =>
    window.__correcaoSaidaCanonicaJoaquinV106?.estado === 'pronta' &&
    (document.getElementById('financeiroCorrecoesV104Acao')?.textContent || '').includes('bloqueada')
  );
  const bloqueio = await page.evaluate(() => ({
    bulk: document.getElementById('financeiroCorrecoesV104Acao')?.textContent || '',
    bulkAplicar: !!document.querySelector('#financeiroCorrecoesV104Acao button'),
    status: document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Status')?.textContent || '',
    botaoEspecifico: [...document.querySelectorAll('#financeiroCorrecaoSaidaCanonicaJoaquinV106Status button')].some(botao => botao.textContent.includes('Confirmar saída correta')),
    writes: window.__fixtureWrites.length,
  }));
  exigir(bloqueio.bulk.includes('bloqueada') && !bloqueio.bulkAplicar, `${rotulo}: conflito continua bloqueando o lote V105 e não oferece aplicação geral`);
  exigir(bloqueio.status.includes('Será mantido') && bloqueio.status.includes('Será arquivado, sem apagar') && bloqueio.botaoEspecifico, `${rotulo}: porta V106 permanece acionável apesar do bloqueio geral`);
  exigir(bloqueio.writes === 0, `${rotulo}: prévia unificada e prévia específica executam zero writes`);

  const antes = await page.evaluate(() => {
    const s = window.__store;
    return {
      canonical: window.__assinaturaFixtureV106(s.clientes_encerrados['62eBY5iSyFtP21vECYMm']),
      contract: window.__assinaturaFixtureV106(s.contratos_cliente['joaquin-assados']),
      payment: window.__assinaturaFixtureV106(s.pagamentos_mensais['joaquin-assados_2026-09']),
      acougue: window.__assinaturaFixtureV106({
        contrato: s.contratos_cliente['acougue-sao-joaquim'],
        config: s.clientes_config['acougue-sao-joaquim'],
        pagamento: s.pagamentos_mensais['acougue-sao-joaquim_2026-09'],
        saida: s.clientes_encerrados['saida-acougue-fixture'],
      }),
    };
  });
  await page.evaluate(() => {
    window.__stubRendersV106();
    const original = window.aplicarCorrecaoFinanceiraV104;
    window.aplicarCorrecaoFinanceiraV104 = async function() {
      window.__fixtureBulkApplyCalls += 1;
      return original();
    };
  });
  await clicarEEsperar(page, '#financeiroCorrecaoSaidaCanonicaJoaquinV106Status button', () =>
    window.__correcaoSaidaCanonicaJoaquinV106?.resolvida === true
  );
  const depois = await page.evaluate(antesFixture => {
    const s = window.__store;
    const commit = window.__fixtureWrites.find(item => item.tipo === 'transaction') || { caminhos: [] };
    return {
      canonicalPreservada: window.__assinaturaFixtureV106(s.clientes_encerrados['62eBY5iSyFtP21vECYMm']) === antesFixture.canonical,
      contractPreservado: window.__assinaturaFixtureV106(s.contratos_cliente['joaquin-assados']) === antesFixture.contract,
      paymentPreservado: window.__assinaturaFixtureV106(s.pagamentos_mensais['joaquin-assados_2026-09']) === antesFixture.payment,
      acouguePreservado: window.__assinaturaFixtureV106({
        contrato: s.contratos_cliente['acougue-sao-joaquim'],
        config: s.clientes_config['acougue-sao-joaquim'],
        pagamento: s.pagamentos_mensais['acougue-sao-joaquim_2026-09'],
        saida: s.clientes_encerrados['saida-acougue-fixture'],
      }) === antesFixture.acougue,
      duplicata: s.clientes_encerrados['0oqy4pk1tcKZccWWyZDi'],
      ponteiro: s.clientes_config['joaquin-assados']?.saidaAtivaId || '',
      evento: s.clientes_ciclo_financeiro.fin_v106_joaquin_saida_canonica_20260915 || null,
      commits: window.__fixtureWrites.filter(item => item.tipo === 'transaction').length,
      caminhos: [...commit.caminhos].sort(),
      bulkApplyCalls: window.__fixtureBulkApplyCalls,
      cartao: document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.textContent || '',
      botaoDepois: !!document.querySelector('#financeiroCorrecaoSaidaCanonicaJoaquinV106Box button'),
      confirma: window.__fixtureConfirms.slice(),
    };
  }, antes);
  exigir(depois.duplicata?.excluido === true && depois.duplicata?.statusSaida === 'cancelada' && depois.duplicata?.unificadoNoId === '62eBY5iSyFtP21vECYMm', `${rotulo}: concorrente recebe soft-delete e vínculo, sem exclusão física`);
  exigir(depois.ponteiro === '62eBY5iSyFtP21vECYMm' && depois.evento?.sourceId === '62eBY5iSyFtP21vECYMm', `${rotulo}: ficha e recibo apontam para a saída confirmada`);
  exigir(depois.canonicalPreservada && depois.contractPreservado && depois.paymentPreservado && depois.acouguePreservado, `${rotulo}: saída canônica, contrato, mensalidade e Açougue permanecem byte a byte`);
  exigir(depois.commits === 1 && JSON.stringify(depois.caminhos) === JSON.stringify([
    'clientes_ciclo_financeiro/fin_v106_joaquin_saida_canonica_20260915',
    'clientes_config/joaquin-assados',
    'clientes_encerrados/0oqy4pk1tcKZccWWyZDi',
  ]), `${rotulo}: clique grava exatamente três alvos auditados numa única transação`);
  exigir(depois.bulkApplyCalls === 0, `${rotulo}: ação específica nunca chama a aplicação geral V105`);
  exigir(depois.cartao.includes('Saída correta') && depois.cartao.includes('confirmada') && !depois.botaoDepois, `${rotulo}: releitura troca o cartão inteiro por confirmação final sem nenhum botão`);
  exigir(depois.confirma.some(texto => texto.includes('Preservar o recibo correto')), `${rotulo}: confirmação humana repete o impacto antes da escrita`);

  const retry = await page.evaluate(async () => {
    const antes = window.__fixtureWrites.length;
    const ok = await window.aplicarCorrecaoSaidaCanonicaJoaquinV106();
    return {
      ok,
      antes,
      depois: window.__fixtureWrites.length,
      toast: window.__fixtureToasts.at(-1)?.mensagem || '',
      estado: document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.dataset?.estado || '',
      botoes: document.querySelectorAll('#financeiroCorrecaoSaidaCanonicaJoaquinV106Box button').length,
    };
  });
  exigir(retry.ok && retry.antes === retry.depois && retry.toast.includes('já estava concluída'), `${rotulo}: retry é no-op e não repete gravação`);
  exigir(retry.estado === 'resolvida' && retry.botoes === 0, `${rotulo}: segundo clique mantém o cartão concluído e sem ação pendente`);

  const largura = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documento: document.documentElement.scrollWidth,
    corpo: document.body.scrollWidth,
    painel: Math.ceil(document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.getBoundingClientRect().width || 0),
  }));
  exigir(largura.documento <= largura.viewport && largura.corpo <= largura.viewport && largura.painel <= largura.viewport, `${rotulo}: cartão permanece sem overflow horizontal`);
}

async function testarDuasAbas(page) {
  await page.evaluate(() => {
    window.__resetFixtureV106();
    window.__runtimeA.renderizarPainelConciliacaoJoaquinV107('aguardando');
  });
  await clicarEEsperar(page, '#financeiroCorrecaoSaidaCanonicaJoaquinV106Box button', () =>
    window.__correcaoSaidaCanonicaJoaquinV106?.estado === 'pronta'
  );
  const resultado = await page.evaluate(async () => {
    const aplicarA = window.__aplicarAbaA;
    const aplicarB = window.__instalarOutraAbaV106();
    window.__stubRendersV106();
    const respostas = await Promise.all([aplicarA(), aplicarB()]);
    return {
      respostas,
      commits: window.__fixtureWrites.filter(item => item.tipo === 'transaction').length,
      eventos: Object.keys(window.__store.clientes_ciclo_financeiro),
      ponteiro: window.__store.clientes_config['joaquin-assados']?.saidaAtivaId || '',
      duplicata: window.__store.clientes_encerrados['0oqy4pk1tcKZccWWyZDi'],
      estado: document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.dataset?.estado || '',
      botoes: document.querySelectorAll('#financeiroCorrecaoSaidaCanonicaJoaquinV106Box button').length,
    };
  });
  exigir(resultado.respostas.every(Boolean) && resultado.commits === 1, 'duas abas: duas instâncias convergem com uma única transação');
  exigir(resultado.eventos.length === 1 && resultado.eventos[0] === 'fin_v106_joaquin_saida_canonica_20260915', 'duas abas: operationId determinístico impede segundo recibo');
  exigir(resultado.ponteiro === '62eBY5iSyFtP21vECYMm' && resultado.duplicata?.excluido === true, 'duas abas: ambas terminam no mesmo estado canônico');
  exigir(resultado.estado === 'resolvida' && resultado.botoes === 0, 'duas abas: a interface compartilhada converge para concluído sem ação residual');
}

async function testarConcorrencia(page) {
  await page.evaluate(() => {
    window.__resetFixtureV106();
    window.__financeiroV104.invalidar();
    window.__runtimeA.garantirPainelConciliacaoJoaquinV106();
  });
  await page.evaluate(() => window.preverCorrecaoSaidaCanonicaJoaquinV106());
  const resultado = await page.evaluate(async () => {
    window.__beforeTransactionOnce = () => {
      window.__store.clientes_encerrados['0oqy4pk1tcKZccWWyZDi'].motivoDetalhe = 'mudança concorrente sintética';
    };
    window.__stubRendersV106();
    const ok = await window.aplicarCorrecaoSaidaCanonicaJoaquinV106();
    return {
      ok,
      writes: window.__fixtureWrites.length,
      duplicata: window.__store.clientes_encerrados['0oqy4pk1tcKZccWWyZDi'],
      evento: window.__store.clientes_ciclo_financeiro.fin_v106_joaquin_saida_canonica_20260915 || null,
      ponteiro: window.__store.clientes_config['joaquin-assados']?.saidaAtivaId || '',
      status: document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Status')?.textContent || '',
    };
  });
  exigir(!resultado.ok && resultado.writes === 0 && !resultado.evento && !resultado.ponteiro, 'concorrência: alteração entre prévia e tx aborta com zero commit');
  exigir(resultado.duplicata?.excluido === false && resultado.duplicata?.motivoDetalhe === 'mudança concorrente sintética', 'concorrência: writer não sobrescreve o fato da outra aba');
  exigir(resultado.status.includes('Não é seguro') || resultado.status.includes('Nada foi alterado'), 'concorrência: UI volta para bloqueio explícito, sem falso sucesso');
}

async function testarPapelIndevido(page, rotulo) {
  const resultado = await page.evaluate(async () => {
    const antesLeituras = window.__fixtureReads.length;
    const antesWrites = window.__fixtureWrites.length;
    const previa = await window.preverCorrecaoSaidaCanonicaJoaquinV106();
    const aplicacao = await window.aplicarCorrecaoSaidaCanonicaJoaquinV106();
    return {
      painel: !!document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box'),
      status: !!document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Status'),
      previa,
      aplicacao,
      leituras: window.__fixtureReads.length - antesLeituras,
      writes: window.__fixtureWrites.length - antesWrites,
    };
  });
  exigir(!resultado.painel && !resultado.status, `${rotulo}: papel indevido não recebe cartão nem status no DOM`);
  exigir(!resultado.previa && !resultado.aplicacao && resultado.leituras === 0 && resultado.writes === 0, `${rotulo}: papel indevido não lê nem escreve dados financeiros`);
}

exigir(fonteHtml.includes('2026-08-23-canonicalizacao-cortesia-fedalto-v109'), 'HTML real identifica o build V109 que preserva a conciliação V106');
exigir(fonteHtml.includes('financeiro-core.mjs?v=109') && fonteHtml.includes('financeiro-ui-v104.mjs?v=109'), 'HTML real instala núcleo e UI V109 preservando a porta V106');
exigir(!fonteHtml.includes('financeiroCorrecaoSaidaCanonicaJoaquinV106Status'), 'cartão específico não fica estático no HTML de papéis indevidos');
exigir(fonteUi.includes('preverCorrecaoSaidaCanonicaJoaquinV106') && fonteUi.includes('aplicarCorrecaoSaidaCanonicaJoaquinV106'), 'módulo real expõe somente as duas ações V106 acordadas');

try {
  for (const viewport of [
    { nome: 'desktop', largura: 1365, altura: 900 },
    { nome: 'mobile', largura: 390, altura: 844 },
  ]) {
    const contexto = await novaPagina({ width: viewport.largura, height: viewport.altura });
    try {
      await testarFluxoPrincipal(contexto.page, viewport.nome);
      exigir(contexto.pageerrors.length === 0, `${viewport.nome}: zero pageerror (${contexto.pageerrors.join(' | ')})`);
    } finally {
      await contexto.page.close();
    }
  }

  const duasAbas = await novaPagina({ width: 1200, height: 850 });
  try {
    await testarDuasAbas(duasAbas.page);
    exigir(duasAbas.pageerrors.length === 0, `duas abas: zero pageerror (${duasAbas.pageerrors.join(' | ')})`);
  } finally {
    await duasAbas.page.close();
  }

  const concorrencia = await novaPagina({ width: 1200, height: 850 });
  try {
    await testarConcorrencia(concorrencia.page);
    exigir(concorrencia.pageerrors.length === 0, `concorrência: zero pageerror (${concorrencia.pageerrors.join(' | ')})`);
  } finally {
    await concorrencia.page.close();
  }

  for (const papel of ['Amanda', 'Cecília']) {
    const indevido = await novaPagina({ width: 900, height: 700 }, papel);
    try {
      await testarPapelIndevido(indevido.page, papel);
      exigir(indevido.pageerrors.length === 0, `${papel}: zero pageerror (${indevido.pageerrors.join(' | ')})`);
    } finally {
      await indevido.page.close();
    }
  }
} finally {
  await navegador.close();
  await new Promise(resolve => servidor.close(resolve));
}

exigir(sha256Arquivo(caminhoHtml) === hashesIniciais.html, 'escritorio.html permaneceu no mesmo hash durante a prova');
exigir(sha256Arquivo(caminhoCore) === hashesIniciais.core, 'financeiro-core.mjs permaneceu no mesmo hash durante a prova');
exigir(sha256Arquivo(caminhoUi) === hashesIniciais.ui, 'financeiro-ui-v104.mjs permaneceu no mesmo hash durante a prova');

console.log(`V106 UI SAÍDA CANÔNICA JOAQUIN: ${total - falhas.length}/${total} verificações aprovadas.`);
console.log(`HASH escritorio.html: ${sha256Arquivo(caminhoHtml)}`);
console.log(`HASH financeiro-core.mjs: ${sha256Arquivo(caminhoCore)}`);
console.log(`HASH financeiro-ui-v104.mjs: ${sha256Arquivo(caminhoUi)}`);
console.log(`HASH teste: ${sha256Arquivo(caminhoTeste)}`);
if (falhas.length) {
  console.error(`V106 UI SAÍDA CANÔNICA JOAQUIN: ${falhas.length} falha(s) real(is).`);
  process.exitCode = 1;
}
