#!/usr/bin/env node

/*
 * Regressão V105 — contatos privados, fallback legado e Régua de Cobrança.
 *
 * Executa o módulo financeiro real e o handler abrirCobranca extraído do HTML
 * real. Firebase, relógio, pop-up e dados são fixtures sintéticas em memória.
 * Renderizar, prever e abrir WhatsApp devem causar zero writes; somente a
 * confirmação explícita pode gravar o recibo de cobrança.
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
const fonteHtml = fs.readFileSync(caminhoHtml, 'utf8');
const fonteCore = fs.readFileSync(caminhoCore, 'utf8');
const fonteUi = fs.readFileSync(caminhoUi, 'utf8');
const hashesIniciais = {
  html: sha256Texto(fonteHtml),
  core: sha256Texto(fonteCore),
  ui: sha256Texto(fonteUi),
};
const estilosReais = [...fonteHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(function(m) {
  return m[1];
}).join('\n');

function sha256Texto(valor) {
  return crypto.createHash('sha256').update(valor).digest('hex');
}

function sha256Arquivo(arquivo) {
  return sha256Texto(fs.readFileSync(arquivo));
}

function trechoReal(inicio, fim) {
  const a = fonteHtml.indexOf(inicio);
  const b = fonteHtml.indexOf(fim, a + inicio.length);
  if (a < 0 || b < 0) throw new Error('V105 UI: trecho real ausente: ' + inicio);
  return fonteHtml.slice(a, b);
}

const funcoesMensagemReais = trechoReal(
  '  const FASES_COBRANCA = [',
  '  async function numeroCobrancaConfirmado(slug){',
);
const urlWhatsAppReal = trechoReal(
  '  function urlWhatsAppWeb(numero,mensagem){',
  '  function textoMensagemCliente(nome){',
);
const abrirCobrancaReal = trechoReal(
  '  function revelarConfirmacaoCobranca(id){',
  '  window.confirmarEnvioCobranca=async function(id){',
);

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

function bootstrapFixtureV105() {
  window.__fixtureOriginalDate = window.Date;
  window.__fixtureHoje = '2026-09-12';
  window.__fixtureAgora = '2026-09-12T12:00:00-03:00';
  class FixtureDate extends window.__fixtureOriginalDate {
    constructor() {
      const args = Array.from(arguments);
      super(...(args.length ? args : [window.__fixtureAgora]));
    }
    static now() {
      return new window.__fixtureOriginalDate(window.__fixtureAgora).getTime();
    }
  }
  window.Date = FixtureDate;

  window.usuarioAtual = 'Chris';
  window.db = { path: '' };
  window.auth = { currentUser: { uid: 'uid-chris-fixture-v105' } };
  window.PIX_AGENCIA = {
    tipo: 'fixture',
    chave: 'pix-sintetico-nao-operacional',
    banco: 'Banco Sintético',
    titular: 'Titular Sintético',
  };
  window.__fixtureWrites = [];
  window.__fixtureReads = [];
  window.__fixtureToasts = [];
  window.__fixturePopups = [];
  window.__fixtureEvents = [];
  window.__fixtureDeferPath = '';
  window.__fixtureDeferredUsed = false;
  window.__fixtureReleaseDeferred = null;
  window.__cobrancasPreparadas = {};

  const aliases = {
    zeens: 'zeiss',
    'otica-visao-araucaria': 'zeiss',
    'master-chefe': 'master-chef',
    'master-chef-pizzaria': 'master-chef',
    emanuelle: 'emanuelle-bernaski-nutri',
    'cliente-rodrigo': 'rodrigo',
  };

  function slugBase(valor) {
    return String(valor || '').trim().toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  window.slugClienteCanonico = function(valor) {
    let atual = slugBase(valor);
    const vistos = new Set();
    while (aliases[atual] && !vistos.has(atual)) {
      vistos.add(atual);
      atual = aliases[atual];
    }
    return atual;
  };

  function vazio() {
    return {
      contratos_cliente: {},
      pagamentos_mensais: {},
      clientes_encerrados: {},
      recebimentos_entrada_pessoal: {},
      receitas_avulsas: {},
      financeiro_lancamentos: {},
      clientes_ciclo_financeiro: {},
      config_financeiro: {
        regua_cobranca: {
          schemaVersion: 1,
          inicioOperacao: '2026-07',
          competenciasQuitadasAte: '2026-08',
          criterioHistorico: 'fixture_v105',
        },
      },
      clientes_config: {},
      contatos_clientes_financeiro: {},
    };
  }

  function clonar(valor) {
    if (valor instanceof window.__fixtureOriginalDate) return new window.Date(valor.getTime());
    if (valor && typeof valor.toDate === 'function') return new window.Date(valor.toDate().getTime());
    if (Array.isArray(valor)) return valor.map(clonar);
    if (valor && typeof valor === 'object') {
      const saida = {};
      Object.entries(valor).forEach(function(par) {
        saida[par[0]] = clonar(par[1]);
      });
      return saida;
    }
    return valor;
  }

  function persistir(valor) {
    if (valor instanceof window.__fixtureOriginalDate) return new window.Date(valor.getTime());
    if (valor && valor.__serverTimestamp) return new window.Date(window.__fixtureAgora);
    if (valor && valor.__arrayUnion) return valor.__arrayUnion.map(persistir);
    if (Array.isArray(valor)) return valor.map(persistir);
    if (valor && typeof valor === 'object') {
      const saida = {};
      Object.entries(valor).forEach(function(par) {
        saida[par[0]] = persistir(par[1]);
      });
      return saida;
    }
    return valor;
  }

  window.collection = function(base) {
    const partes = Array.from(arguments).slice(1).map(String);
    return {
      type: 'collection',
      path: [base === window.db ? '' : (base && base.path) || ''].concat(partes).filter(Boolean).join('/'),
    };
  };
  window.doc = function(base) {
    const partes = Array.from(arguments).slice(1).map(String);
    const caminho = [base === window.db ? '' : (base && base.path) || ''].concat(partes).filter(Boolean).join('/');
    return { type: 'document', path: caminho, id: caminho.split('/').at(-1) || '' };
  };
  window.__registro = function(ref) {
    const partes = String((ref && ref.path) || '').split('/');
    return { colecao: partes[0], id: partes[1] };
  };
  window.__snapDoc = function(ref) {
    const alvo = window.__registro(ref);
    const colecao = window.__store[alvo.colecao] || {};
    const existe = !!(alvo.colecao && alvo.id && Object.prototype.hasOwnProperty.call(colecao, alvo.id));
    return {
      id: alvo.id,
      ref: ref,
      exists: function() { return existe; },
      data: function() { return existe ? clonar(colecao[alvo.id]) : undefined; },
    };
  };
  window.getDocs = async function(ref) {
    const colecao = String((ref && ref.path) || '').split('/')[0];
    window.__fixtureReads.push(colecao);
    window.__fixtureEvents.push('getDocs:' + colecao);
    const docs = Object.keys(window.__store[colecao] || {}).map(function(id) {
      return window.__snapDoc({ path: colecao + '/' + id, id: id });
    });
    return {
      docs: docs,
      size: docs.length,
      empty: docs.length === 0,
      forEach: function(fn) { docs.forEach(fn); },
    };
  };
  window.getDoc = function(ref) {
    window.__fixtureEvents.push('getDoc:' + ref.path);
    if (
      window.__fixtureDeferPath === ref.path &&
      !window.__fixtureDeferredUsed
    ) {
      window.__fixtureDeferredUsed = true;
      return new Promise(function(resolve) {
        window.__fixtureReleaseDeferred = function() {
          window.__fixtureEvents.push('getDoc-release:' + ref.path);
          resolve(window.__snapDoc(ref));
        };
      });
    }
    return Promise.resolve(window.__snapDoc(ref));
  };
  window.__aplicarSet = function(ref, dados, opcoes, operacao) {
    const alvo = window.__registro(ref);
    if (!window.__store[alvo.colecao]) window.__store[alvo.colecao] = {};
    const atual = window.__store[alvo.colecao][alvo.id] || {};
    const convertido = persistir(dados);
    window.__store[alvo.colecao][alvo.id] = opcoes && opcoes.merge ? Object.assign({}, atual, convertido) : convertido;
    window.__fixtureWrites.push({ path: ref.path, operacao: operacao || 'set', merge: !!(opcoes && opcoes.merge) });
  };
  window.setDoc = async function(ref, dados, opcoes) {
    window.__aplicarSet(ref, dados, opcoes, 'set');
  };
  window.updateDoc = async function(ref, dados) {
    if (!window.__snapDoc(ref).exists()) throw new Error('not-found sintético');
    window.__aplicarSet(ref, dados, { merge: true }, 'update');
  };
  window.runTransaction = async function(_db, executar) {
    const estagios = [];
    const tx = {
      get: async function(ref) { return window.__snapDoc(ref); },
      set: function(ref, dados, opcoes) { estagios.push({ ref: ref, dados: dados, opcoes: opcoes, operacao: 'set' }); },
      update: function(ref, dados) { estagios.push({ ref: ref, dados: dados, opcoes: { merge: true }, operacao: 'update' }); },
    };
    const retorno = await executar(tx);
    estagios.forEach(function(item) {
      window.__aplicarSet(item.ref, item.dados, item.opcoes, item.operacao);
    });
    return retorno;
  };
  window.serverTimestamp = function() { return { __serverTimestamp: true }; };
  window.deleteField = function() { return { __deleteField: true }; };
  window.arrayUnion = function() {
    return { __arrayUnion: Array.from(arguments).map(persistir) };
  };

  window.hojeLocal = function() { return window.__fixtureHoje; };
  window.brl = function(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  window.nomeMes = function(comp) {
    const partes = String(comp || '').split('-').map(Number);
    return partes[0] && partes[1]
      ? new window.Date(partes[0], partes[1] - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : String(comp || '');
  };
  window.esc = function(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  window.escAttr = window.esc;
  window.escJs = function(valor) { return String(valor == null ? '' : valor).replace(/'/g, "\\'"); };
  window.numeroWhatsAppBrasil = function(valor) {
    let digitos = String(valor || '').replace(/\D/g, '');
    if (digitos.length === 10 || digitos.length === 11) digitos = '55' + digitos;
    return /^55\d{10,11}$/.test(digitos) ? digitos : '';
  };
  window.mostrarToast = function(mensagem, tipo) {
    window.__fixtureToasts.push({ mensagem: String(mensagem || ''), tipo: String(tipo || '') });
  };
  window.registrarLogAutomacao = function() {};
  window.toggleFaixaDemandas = function() {};
  window.confirm = function() { return true; };
  window.prompt = function() { return null; };
  window.open = function(url, alvo) {
    const registro = {
      inicial: String(url || ''),
      alvo: String(alvo || ''),
      substituida: '',
      fechada: false,
      openerNulo: false,
    };
    window.__fixtureEvents.push('open:' + registro.inicial);
    const popup = {
      location: {
        replace: function(destino) {
          registro.substituida = String(destino || '');
          window.__fixtureEvents.push('replace:' + registro.substituida);
        },
      },
      close: function() {
        registro.fechada = true;
        window.__fixtureEvents.push('close');
      },
      get opener() { return registro.openerNulo ? null : window; },
      set opener(valor) { registro.openerNulo = valor === null; },
    };
    window.__fixturePopups.push(registro);
    return popup;
  };

  function contratoAtivo(id, nome) {
    return {
      id: id,
      canonicalId: id,
      cliente: id,
      clienteNome: nome,
      primeiraCompetencia: '2026-07',
      valorInicial: 100,
      valorVigente: 100,
      valorCheio: 100,
      diaVencimento: 10,
      status: 'ativo',
      vigencias: [{ inicio: '2026-07', fim: null, valor: 100, cicloId: 'fixture-' + id }],
    };
  }

  function resetarInstrumentacao() {
    window.__fixtureWrites = [];
    window.__fixtureReads = [];
    window.__fixtureToasts = [];
    window.__fixturePopups = [];
    window.__fixtureEvents = [];
    window.__fixtureDeferPath = '';
    window.__fixtureDeferredUsed = false;
    window.__fixtureReleaseDeferred = null;
    window.__cobrancasPreparadas = {};
  }

  window.__configurarCenarioV105 = async function(config) {
    const id = config.identidade;
    window.__fixtureHoje = config.hoje || '2026-09-12';
    window.__fixtureAgora = window.__fixtureHoje + 'T12:00:00-03:00';
    window.__store = vazio();
    window.__store.contratos_cliente[id] = contratoAtivo(id, config.nome || 'Cliente Sintético');
    if (config.comPagamento !== false) {
      const competencia = config.competenciaPagamento || config.selecionada || '2026-09';
      window.__store.pagamentos_mensais[id + '_' + competencia] = {
        id: id + '_' + competencia,
        canonicalId: id,
        cliente: id,
        clienteNome: config.nome || 'Cliente Sintético',
        competencia: competencia,
        valorDevido: 100,
        diaVencimento: 10,
        status: config.status || 'aberto',
        cobrancasFeitas: 0,
      };
    }
    Object.assign(window.__store.contatos_clientes_financeiro, config.privados || {});
    Object.assign(window.__store.clientes_config, config.legados || {});
    ['finMes', 'mensMes', 'cobMes', 'ctMes'].forEach(function(campo) {
      const el = document.getElementById(campo);
      if (el) el.value = config.selecionada || '2026-09';
    });
    resetarInstrumentacao();
    window.__financeiroV104.invalidar();
    return window.renderCobranca();
  };

  function contratoEncerrado(id, nome, valor) {
    return {
      id: id,
      canonicalId: id,
      cliente: id,
      clienteNome: nome,
      primeiraCompetencia: '2026-01',
      ultimaCompetenciaPagamento: '2026-08',
      valorInicial: valor,
      valorVigente: valor,
      valorCheio: valor,
      diaVencimento: 10,
      status: 'ativo',
      vigencias: [{ inicio: '2026-01', fim: '2026-08', valor: valor, cicloId: 'fixture-' + id }],
    };
  }

  window.__configurarPreviaZeissV105 = async function(modo, telefone) {
    window.__fixtureHoje = '2026-09-12';
    window.__fixtureAgora = '2026-09-12T12:00:00-03:00';
    window.__store = vazio();
    window.__store.contratos_cliente['vitalle-odonto'] = {
      id: 'vitalle-odonto',
      canonicalId: 'vitalle-odonto',
      cliente: 'vitalle-odonto',
      clienteNome: 'Vitalle Sintética',
      primeiraCompetencia: '2026-01',
      valorInicial: 1500,
      valorVigente: 1500,
      valorCheio: 1500,
      valorProgramado: 1000,
      valorProgramadoEm: '2026-09',
      valorProgramadoMotivo: 'Novo valor mensal informado pelo Chris',
      diaVencimento: 10,
      status: 'ativo',
      vigencias: [{ inicio: '2026-01', fim: null, valor: 1500, cicloId: 'fixture-vitalle' }],
    };
    [
      ['dra-monique', 'Dra. Monique Sintética', 2200],
      ['joaquin-assados', 'Joaquim Assados Sintético', 900],
      ['acougue-sao-joaquim', 'Açougue São Joaquim Sintético', 1100],
    ].forEach(function(item) {
      window.__store.contratos_cliente[item[0]] = contratoEncerrado(item[0], item[1], item[2]);
    });
    window.__store.clientes_config['dra-monique'] = {
      nome: 'Dra. Monique Sintética',
      saidaAtivaId: 'saida-dra-monique-fixture',
      ativo: true,
    };
    [
      ['saida-dra-monique-fixture', 'dra-monique', 'Dra. Monique Sintética'],
      ['saida-joaquin-fixture', 'joaquin-assados', 'Joaquim Assados Sintético'],
      ['saida-acougue-fixture', 'acougue-sao-joaquim', 'Açougue São Joaquim Sintético'],
    ].forEach(function(item) {
      window.__store.clientes_encerrados[item[0]] = {
        id: item[0],
        slug: item[1],
        canonicalId: item[1],
        nome: item[2],
        dataSaida: '2026-09-15',
        ultimaCompetenciaPagamento: '2026-08',
        statusSaida: 'programada',
        excluido: false,
      };
    });
    if (modo === 'canonico') {
      window.__store.contatos_clientes_financeiro.zeiss = {
        slug: 'zeiss',
        nome: 'Zeiss Sintética',
        whatsapp: telefone,
      };
    } else {
      window.__store.contatos_clientes_financeiro.zeens = {
        slug: 'zeens',
        nome: 'Alias Zeiss Sintético',
        whatsapp: telefone,
      };
    }
    ['finMes', 'mensMes', 'cobMes', 'ctMes'].forEach(function(campo) {
      const el = document.getElementById(campo);
      if (el) el.value = '2026-09';
    });
    resetarInstrumentacao();
    window.__financeiroV104.invalidar();
    return window.preverCorrecaoFinanceiraSetembroV103();
  };

  window.__resetarInstrumentacaoV105 = resetarInstrumentacao;
  window.__store = vazio();
}

const statusHelpers = [
  'function statusMensalidadeCanonico(p){ return window.__FinanceiroCoreV105.statusMensalidade(p); }',
  'function mensalidadeResolvida(p){ return ["pago","isento","cancelado"].includes(statusMensalidadeCanonico(p)); }',
].join('\n');

const instaladorModulo = [
  "import * as Core from '/financeiro-core.mjs?v=105';",
  "import { instalarFinanceiroV104 } from '/financeiro-ui-v104.mjs?v=105';",
  'window.__FinanceiroCoreV105=Core;',
  'window.__financeiroInstalado=instalarFinanceiroV104({',
  'db:window.db,collection:window.collection,doc:window.doc,getDocs:window.getDocs,getDoc:window.getDoc,',
  'setDoc:window.setDoc,updateDoc:window.updateDoc,runTransaction:window.runTransaction,',
  'serverTimestamp:window.serverTimestamp,deleteField:window.deleteField,arrayUnion:window.arrayUnion,',
  'slugClienteCanonico:window.slugClienteCanonico,hojeLocal:window.hojeLocal,brl:window.brl,nomeMes:window.nomeMes,',
  'esc:window.esc,escAttr:window.escAttr,escJs:window.escJs,mostrarToast:window.mostrarToast,',
  'usuarioAtual:function(){return window.usuarioAtual;},auth:window.auth,registrarLogAutomacao:window.registrarLogAutomacao',
  '});',
  'window.__fixtureReady=true;',
].join('\n');

const htmlHarness = [
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>',
  estilosReais,
  'html,body{margin:0;max-width:100%;min-height:100%;overflow-x:clip!important;background:#202124;color:#f3f3f1}',
  'body{padding:18px}.fixtureV105{width:min(980px,100%);margin:auto}.fixtureV105 input{max-width:100%;box-sizing:border-box}',
  '@media(max-width:600px){body{padding:8px}.fixtureV105{width:100%}.row2,.row3,.painelResumo{grid-template-columns:1fr!important}}',
  '</style></head><body><main class="fixtureV105">',
  '<div><input id="finMes" type="month" value="2026-09"><input id="mensMes" type="month" value="2026-09"><input id="cobMes" type="month" value="2026-09"><input id="ctMes" type="month" value="2026-09"><span id="badgeCobranca"></span></div>',
  '<div id="cobrancaBox"></div><div id="financeiroCorrecoesV103Status"></div><div id="toast"></div>',
  '</main><script>(',
  bootstrapFixtureV105.toString(),
  ')();</script><script>',
  statusHelpers,
  '\n',
  funcoesMensagemReais,
  '\n',
  urlWhatsAppReal,
  '\n',
  abrirCobrancaReal,
  '</script><script type="module">',
  instaladorModulo,
  '</script></body></html>',
].join('');

const servidor = http.createServer(function(req, res) {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/' || pathname === '/fixture.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(htmlHarness);
    return;
  }
  if (pathname === '/financeiro-core.mjs') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(fonteCore);
    return;
  }
  if (pathname === '/financeiro-ui-v104.mjs') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(fonteUi);
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

await new Promise(function(resolve, reject) {
  servidor.once('error', reject);
  servidor.listen(0, '127.0.0.1', resolve);
});
const endereco = servidor.address();
const urlFixture = 'http://127.0.0.1:' + endereco.port + '/fixture.html';

exigir(fonteUi.includes("import * as Core from './financeiro-core.mjs?v=105'"), 'módulo financeiro real aponta para o núcleo V105');
exigir(fonteHtml.includes('./financeiro-ui-v104.mjs?v=105'), 'HTML real instala a UI financeira V105');
exigir(
  abrirCobrancaReal.indexOf("window.open('about:blank','_blank')") >= 0 &&
  abrirCobrancaReal.indexOf("window.open('about:blank','_blank')") < abrirCobrancaReal.indexOf('await getDoc'),
  'handler real abre about:blank sincronamente antes da primeira leitura assíncrona',
);
exigir(
  abrirCobrancaReal.includes('window.numeroCobrancaConfirmadoV105') &&
  abrirCobrancaReal.includes('aba.location.replace(url)'),
  'handler real usa o resolvedor V105 e só então substitui a URL da aba',
);
const telefoneLiteralNoRuntime = /(?:whatsapp|telefone)\s*:\s*['"]\+?\d{10,14}['"]/i;
exigir(
  !telefoneLiteralNoRuntime.test(fonteHtml) && !telefoneLiteralNoRuntime.test(fonteUi),
  'runtime público não contém telefone financeiro literal',
);

const navegador = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});

async function novaPagina(viewport) {
  const page = await navegador.newPage({ viewport: viewport });
  const pageerrors = [];
  page.on('pageerror', function(erro) { pageerrors.push(String(erro)); });
  await page.goto(urlFixture, { waitUntil: 'load' });
  await page.waitForFunction(function() { return window.__fixtureReady === true; });
  return { page: page, pageerrors: pageerrors };
}

async function configurar(page, config) {
  return page.evaluate(async function(cenario) {
    return window.__configurarCenarioV105(cenario);
  }, config);
}

async function estadoLinha(page, id) {
  return page.evaluate(function(linhaId) {
    const linha = document.querySelector('[data-regua-linha="' + linhaId + '"]');
    if (!linha) return { existe: false };
    const botoesAbrir = Array.from(linha.querySelectorAll('button')).filter(function(botao) {
      return /Abrir cobrança|Abrir conversa/.test(botao.textContent || '');
    });
    const editor = document.getElementById('editarWhatsV104_' + linhaId);
    return {
      existe: true,
      estado: linha.getAttribute('data-contato-estado') || '',
      texto: linha.textContent || '',
      html: linha.innerHTML || '',
      abrirQuantidade: botoesAbrir.length,
      abrirHabilitado: botoesAbrir.some(function(botao) { return !botao.disabled; }),
      editorVisivel: !!editor && !editor.hidden,
    };
  }, id);
}

async function testarContatosERegua(page, rotulo) {
  const foneCanonico = '5541990000001';
  const foneAlias = '5541990000002';
  const foneConflito = '5541990000003';
  const foneLegado = '5541990000004';

  await configurar(page, {
    identidade: 'cliente-canonico',
    nome: 'Cliente Canônico Sintético',
    selecionada: '2026-09',
    privados: {
      'cliente-canonico': { slug: 'cliente-canonico', nome: 'Cliente Canônico Sintético', whatsapp: foneCanonico },
    },
  });
  let linha = await estadoLinha(page, 'cliente-canonico_2026-09');
  exigir(linha.existe && linha.estado === 'confirmado', rotulo + ': contato privado canônico é confirmado');
  exigir(linha.texto.includes('(41) 99000-0001') && linha.texto.includes('agenda financeira privada'), rotulo + ': número canônico e origem privada ficam visíveis na Régua');
  exigir(await page.evaluate(function() { return window.__fixtureWrites.length; }) === 0, rotulo + ': render com contato canônico causa zero writes');

  await configurar(page, {
    identidade: 'zeiss',
    nome: 'Zeiss Sintética',
    selecionada: '2026-09',
    privados: {
      zeens: { slug: 'zeens', nome: 'Alias Zeiss Sintético A', whatsapp: foneAlias },
      'otica-visao-araucaria': { slug: 'otica-visao-araucaria', nome: 'Alias Zeiss Sintético B', whatsapp: foneAlias },
    },
  });
  linha = await estadoLinha(page, 'zeiss_2026-09');
  exigir(linha.existe && linha.estado === 'confirmado', rotulo + ': aliases privados concordantes resolvem uma única identidade');
  exigir(linha.texto.includes('(41) 99000-0002') && linha.texto.includes('alias da agenda financeira privada'), rotulo + ': aliases concordantes exibem um único número e sua origem');
  exigir(await page.evaluate(function() { return window.__fixtureWrites.length; }) === 0, rotulo + ': aliases concordantes permanecem somente leitura');

  await configurar(page, {
    identidade: 'zeiss',
    nome: 'Zeiss Sintética',
    selecionada: '2026-09',
    privados: {
      zeens: { slug: 'zeens', nome: 'Alias Zeiss Sintético A', whatsapp: foneAlias },
      'otica-visao-araucaria': { slug: 'otica-visao-araucaria', nome: 'Alias Zeiss Sintético B', whatsapp: foneConflito },
    },
  });
  linha = await estadoLinha(page, 'zeiss_2026-09');
  exigir(linha.existe && linha.estado === 'conflito' && linha.texto.includes('conflito entre cadastros'), rotulo + ': aliases privados divergentes falham fechados');
  exigir(!linha.abrirHabilitado, rotulo + ': conflito privado não oferece botão habilitado de WhatsApp');
  const conflitoAlias = await page.evaluate(async function() {
    try {
      await window.numeroCobrancaConfirmadoV105('zeiss');
      return false;
    } catch (erro) {
      return String(erro && erro.message || erro).includes('divergentes');
    }
  });
  exigir(conflitoAlias, rotulo + ': handler recebe erro explícito para aliases privados divergentes');
  exigir(await page.evaluate(function() { return window.__fixtureWrites.length; }) === 0, rotulo + ': conflito privado causa zero writes');

  await configurar(page, {
    identidade: 'zeiss',
    nome: 'Zeiss Sintética',
    selecionada: '2026-09',
    privados: {
      zeiss: { slug: 'zeiss', nome: 'Zeiss Sintética', whatsapp: foneAlias },
      zeens: { slug: 'zeens', nome: 'Alias Zeiss Sintético', whatsapp: foneConflito },
    },
  });
  linha = await estadoLinha(page, 'zeiss_2026-09');
  exigir(linha.existe && linha.estado === 'conflito', rotulo + ': canônico e alias privados divergentes não são escolhidos silenciosamente');
  exigir(!linha.abrirHabilitado, rotulo + ': divergência canônico/alias bloqueia abertura de WhatsApp');

  await configurar(page, {
    identidade: 'cliente-legado',
    nome: 'Cliente Legado Sintético',
    selecionada: '2026-09',
    privados: {},
    legados: {
      'cliente-legado': { nome: 'Cliente Legado Sintético', whatsappCobranca: foneLegado },
    },
  });
  linha = await estadoLinha(page, 'cliente-legado_2026-09');
  exigir(linha.existe && linha.estado === 'confirmado', rotulo + ': fallback único de clientes_config é recuperado');
  exigir(linha.texto.includes('(41) 99000-0004') && linha.texto.includes('somente leitura'), rotulo + ': contato legado é identificado visualmente como somente leitura');
  const aberturaLegada = await page.evaluate(async function() {
    window.__resetarInstrumentacaoV105();
    const url = await window.abrirCobranca('cliente-legado_2026-09');
    const popup = window.__fixturePopups[0] || {};
    return {
      url: url || '',
      substituida: popup.substituida || '',
      fechada: popup.fechada === true,
      writes: window.__fixtureWrites.length,
    };
  });
  exigir(
    aberturaLegada.url.includes('phone=' + foneLegado) &&
    aberturaLegada.substituida === aberturaLegada.url &&
    !aberturaLegada.fechada,
    rotulo + ': handler real abre o WhatsApp usando o fallback legado inequívoco',
  );
  exigir(aberturaLegada.writes === 0, rotulo + ': abrir contato legado não migra nem grava documento');

  await configurar(page, {
    identidade: 'cliente-invalido',
    nome: 'Cliente Inválido Sintético',
    selecionada: '2026-09',
    privados: {
      'cliente-invalido': { slug: 'cliente-invalido', nome: 'Cliente Inválido Sintético', whatsapp: 'telefone-invalido-fixture' },
    },
  });
  linha = await estadoLinha(page, 'cliente-invalido_2026-09');
  exigir(linha.existe && linha.estado === 'invalido' && !linha.abrirHabilitado, rotulo + ': contato inválido aparece como bloqueado e sem ação habilitada');
  const invalido = await page.evaluate(async function() {
    window.__resetarInstrumentacaoV105();
    const retorno = await window.abrirCobranca('cliente-invalido_2026-09');
    const popup = window.__fixturePopups[0] || {};
    return {
      retorno: retorno,
      fechada: popup.fechada === true,
      substituida: popup.substituida || '',
      writes: window.__fixtureWrites.length,
    };
  });
  exigir(invalido.retorno === false && invalido.fechada && !invalido.substituida && invalido.writes === 0, rotulo + ': handler real fecha a aba inválida sem URL e sem write');

  await configurar(page, {
    identidade: 'cliente-ausente',
    nome: 'Cliente Ausente Sintético',
    selecionada: '2026-09',
    privados: {},
    legados: {},
  });
  linha = await estadoLinha(page, 'cliente-ausente_2026-09');
  exigir(linha.existe && linha.estado === 'ausente' && linha.editorVisivel, rotulo + ': contato ausente oferece somente o editor de cadastro');
  exigir(!linha.abrirHabilitado, rotulo + ': contato ausente não oferece botão habilitado de WhatsApp');
  const ausente = await page.evaluate(async function() {
    window.__resetarInstrumentacaoV105();
    const retorno = await window.abrirCobranca('cliente-ausente_2026-09');
    const popup = window.__fixturePopups[0] || {};
    return {
      retorno: retorno,
      fechada: popup.fechada === true,
      substituida: popup.substituida || '',
      writes: window.__fixtureWrites.length,
    };
  });
  exigir(ausente.retorno === false && ausente.fechada && !ausente.substituida && ausente.writes === 0, rotulo + ': handler real não abre destino nem grava para contato ausente');

  await configurar(page, {
    identidade: 'cliente-previsao',
    nome: 'Cliente Previsão Sintético',
    selecionada: '2026-08',
    hoje: '2026-08-22',
    comPagamento: false,
    privados: {
      'cliente-previsao': { slug: 'cliente-previsao', nome: 'Cliente Previsão Sintético', whatsapp: foneCanonico },
    },
  });
  const previsao = await estadoLinha(page, 'cliente-previsao_2026-09');
  const estadoPrevisao = await page.evaluate(function() {
    return { popups: window.__fixturePopups.length, writes: window.__fixtureWrites.length };
  });
  exigir(previsao.existe && previsao.texto.includes('(41) 99000-0001'), rotulo + ': número também fica visível na previsão de setembro');
  exigir(previsao.abrirQuantidade === 0 && previsao.texto.includes('ainda não é uma cobrança'), rotulo + ': previsão futura não contém ação de abrir cobrança');
  exigir(estadoPrevisao.popups === 0 && estadoPrevisao.writes === 0, rotulo + ': render da previsão não abre aba nem grava documento');

  const largura = await page.evaluate(function() {
    return { scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth };
  });
  exigir(largura.scroll <= largura.client + 1, rotulo + ': cenários da Régua não criam overflow horizontal');
}

async function testarHandlerEConfirmacao(page, rotulo) {
  const telefone = '5541990000005';
  const id = 'cliente-abertura_2026-09';
  await configurar(page, {
    identidade: 'cliente-abertura',
    nome: 'Cliente Abertura Sintético',
    selecionada: '2026-09',
    hoje: '2026-09-12',
    privados: {
      'cliente-abertura': { slug: 'cliente-abertura', nome: 'Cliente Abertura Sintético', whatsapp: telefone },
    },
  });
  const imediatamente = await page.evaluate(function(pagamentoId) {
    window.__resetarInstrumentacaoV105();
    window.__fixtureDeferPath = 'pagamentos_mensais/' + pagamentoId;
    window.__fixturePendingAbrir = window.abrirCobranca(pagamentoId);
    const popup = window.__fixturePopups[0] || {};
    return {
      eventos: window.__fixtureEvents.slice(),
      inicial: popup.inicial || '',
      substituida: popup.substituida || '',
      writes: window.__fixtureWrites.length,
      possuiLiberacao: typeof window.__fixtureReleaseDeferred === 'function',
    };
  }, id);
  exigir(
    imediatamente.possuiLiberacao &&
    imediatamente.inicial === 'about:blank' &&
    imediatamente.eventos[0] === 'open:about:blank' &&
    imediatamente.eventos[1] === 'getDoc:pagamentos_mensais/' + id,
    rotulo + ': handler real abre a aba vazia antes do primeiro await',
  );
  exigir(!imediatamente.substituida && imediatamente.writes === 0, rotulo + ': antes da releitura não existe URL final nem write');

  const aberto = await page.evaluate(async function() {
    window.__fixtureReleaseDeferred();
    const url = await window.__fixturePendingAbrir;
    const popup = window.__fixturePopups[0] || {};
    return {
      url: url || '',
      substituida: popup.substituida || '',
      fechada: popup.fechada === true,
      openerNulo: popup.openerNulo === true,
      eventos: window.__fixtureEvents.slice(),
      writes: window.__fixtureWrites.length,
      preparada: !!window.__cobrancasPreparadas['cliente-abertura_2026-09'],
      confirmarVisivel: !document.getElementById('confirmarCobranca_cliente-abertura_2026-09').hidden,
    };
  });
  let urlOk = false;
  let mensagemOk = false;
  try {
    const analisada = new URL(aberto.url);
    urlOk = analisada.origin === 'https://web.whatsapp.com' && analisada.searchParams.get('phone') === telefone;
    const mensagem = analisada.searchParams.get('text') || '';
    mensagemOk = mensagem.includes('Cliente') && mensagem.includes('setembro de 2026') && mensagem.includes('R$');
  } catch (_erro) {}
  exigir(urlOk && aberto.substituida === aberto.url && !aberto.fechada && aberto.openerNulo, rotulo + ': URL WhatsApp usa o telefone sintético confirmado e isolamento de opener');
  exigir(mensagemOk, rotulo + ': URL contém a mensagem real da competência e do valor');
  exigir(aberto.preparada && aberto.confirmarVisivel && aberto.writes === 0, rotulo + ': abrir conversa só prepara a confirmação e mantém zero writes');

  const confirmado = await page.evaluate(async function(pagamentoId) {
    const antes = window.__fixtureWrites.length;
    const ok = await window.confirmarEnvioCobrancaV103(pagamentoId);
    const doc = window.__store.pagamentos_mensais[pagamentoId] || {};
    return {
      ok: ok,
      antes: antes,
      depois: window.__fixtureWrites.length,
      contador: doc.cobrancasFeitas,
      ultima: doc.ultimaCobranca || '',
    };
  }, id);
  exigir(confirmado.ok && confirmado.depois === confirmado.antes + 1, rotulo + ': confirmação explícita grava exatamente um recibo');
  exigir(confirmado.contador === 1 && confirmado.ultima.slice(0, 10) === '2026-09-12', rotulo + ': recibo guarda uma cobrança na data civil sintética');

  const retry = await page.evaluate(async function(pagamentoId) {
    const url = await window.abrirCobranca(pagamentoId);
    const antes = window.__fixtureWrites.length;
    const ok = await window.confirmarEnvioCobrancaV103(pagamentoId);
    const doc = window.__store.pagamentos_mensais[pagamentoId] || {};
    return {
      abriu: !!url,
      ok: ok,
      antes: antes,
      depois: window.__fixtureWrites.length,
      contador: doc.cobrancasFeitas,
    };
  }, id);
  exigir(retry.abriu && retry.ok && retry.antes === retry.depois && retry.contador === 1, rotulo + ': confirmação repetida é idempotente e não duplica contador ou write');
}

async function testarPreviaZeiss(page, rotulo) {
  const telefoneCanonico = '5541990000006';
  const previaCanonica = await page.evaluate(async function(telefone) {
    const ok = await window.__configurarPreviaZeissV105('canonico', telefone);
    const input = document.getElementById('correcaoZeissWhatsV103');
    return {
      ok: ok,
      value: input && input.value || '',
      readonly: !!(input && input.readOnly),
      texto: document.getElementById('financeiroCorrecoesV103Status').textContent || '',
      writes: window.__fixtureWrites.length,
    };
  }, telefoneCanonico);
  exigir(previaCanonica.ok && previaCanonica.value === '(41) 99000-0006' && previaCanonica.readonly, rotulo + ': prévia de setembro preenche o contato canônico da Zeiss');
  exigir(previaCanonica.texto.includes('já confirmado') && previaCanonica.writes === 0, rotulo + ': prévia reconhece a correção manual e não grava');
  const aplicarCanonico = await page.evaluate(async function() {
    const antes = window.__fixtureWrites.length;
    const ok = await window.aplicarCorrecaoFinanceiraSetembroV103();
    return {
      ok: ok,
      antes: antes,
      depois: window.__fixtureWrites.length,
      ids: Object.keys(window.__store.contatos_clientes_financeiro).sort(),
    };
  });
  exigir(
    aplicarCanonico.ok &&
    aplicarCanonico.antes === aplicarCanonico.depois &&
    aplicarCanonico.ids.length === 1 &&
    aplicarCanonico.ids[0] === 'zeiss',
    rotulo + ': aplicar após contato canônico confirmado causa zero write e zero duplicação',
  );

  const telefoneAlias = '5541990000007';
  const previaAlias = await page.evaluate(async function(telefone) {
    const ok = await window.__configurarPreviaZeissV105('alias', telefone);
    const input = document.getElementById('correcaoZeissWhatsV103');
    const antes = window.__fixtureWrites.length;
    const aplicado = await window.aplicarCorrecaoFinanceiraSetembroV103();
    return {
      ok: ok,
      aplicado: aplicado,
      value: input && input.value || '',
      readonly: !!(input && input.readOnly),
      antes: antes,
      depois: window.__fixtureWrites.length,
      ids: Object.keys(window.__store.contatos_clientes_financeiro).sort(),
    };
  }, telefoneAlias);
  exigir(previaAlias.ok && previaAlias.value === '(41) 99000-0007' && previaAlias.readonly, rotulo + ': prévia também reconhece alias privado inequívoco da Zeiss');
  exigir(
    previaAlias.aplicado &&
    previaAlias.antes === previaAlias.depois &&
    previaAlias.ids.length === 1 &&
    previaAlias.ids[0] === 'zeens',
    rotulo + ': repetir a aplicação com alias confirmado não cria um segundo documento zeiss',
  );
}

try {
  for (const viewport of [
    { nome: 'desktop', largura: 1365, altura: 900 },
    { nome: 'mobile', largura: 390, altura: 844 },
  ]) {
    const contexto = await novaPagina({ width: viewport.largura, height: viewport.altura });
    try {
      await testarContatosERegua(contexto.page, viewport.nome);
      await testarHandlerEConfirmacao(contexto.page, viewport.nome);
      await testarPreviaZeiss(contexto.page, viewport.nome);
      exigir(contexto.pageerrors.length === 0, viewport.nome + ': zero pageerror (' + contexto.pageerrors.join(' | ') + ')');
    } finally {
      await contexto.page.close();
    }
  }
} finally {
  await navegador.close();
  await new Promise(function(resolve) { servidor.close(resolve); });
}

exigir(sha256Arquivo(caminhoHtml) === hashesIniciais.html, 'escritorio.html permaneceu no mesmo hash durante a prova');
exigir(sha256Arquivo(caminhoCore) === hashesIniciais.core, 'financeiro-core.mjs permaneceu no mesmo hash durante a prova');
exigir(sha256Arquivo(caminhoUi) === hashesIniciais.ui, 'financeiro-ui-v104.mjs permaneceu no mesmo hash durante a prova');

console.log('V105 UI CONTATOS/RÉGUA: ' + (total - falhas.length) + '/' + total + ' verificações aprovadas.');
console.log('HASH escritorio.html: ' + sha256Arquivo(caminhoHtml));
console.log('HASH financeiro-core.mjs: ' + sha256Arquivo(caminhoCore));
console.log('HASH financeiro-ui-v104.mjs: ' + sha256Arquivo(caminhoUi));
console.log('HASH teste: ' + sha256Arquivo(fileURLToPath(import.meta.url)));
if (falhas.length) {
  console.error('V105 UI CONTATOS/RÉGUA: ' + falhas.length + ' falha(s) real(is).');
  process.exitCode = 1;
}
