#!/usr/bin/env node

/*
 * Regressão UI V107 — estado visual da conciliação financeira.
 *
 * Executa a UI financeira real em Chromium real, com Firestore sintético em
 * memória e sem credenciais. Prova os estados pronta, resolvida, bloqueada e
 * indisponível do cartão do Joaquim, a conclusão agregada, a reutilização do
 * snapshot no reload, o isolamento de papéis e zero escrita em renderização.
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

const COLECOES_SNAPSHOT = [
  'contratos_cliente',
  'pagamentos_mensais',
  'clientes_encerrados',
  'recebimentos_entrada_pessoal',
  'receitas_avulsas',
  'financeiro_lancamentos',
  'clientes_ciclo_financeiro',
  'config_financeiro',
  'clientes_config',
];

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

function bootstrapFixtureV107() {
  const parametros = new URLSearchParams(location.search);
  window.usuarioAtual = parametros.get('role') || 'Chris';
  window.__fixtureScenario = parametros.get('scenario') || 'pronta';
  window.db = { path: '' };
  window.auth = { currentUser: { uid: 'uid-sintetico-v107' } };
  window.__fixtureReads = [];
  window.__fixtureWrites = [];
  window.__fixtureToasts = [];
  window.__fixturePreviewClicks = 0;
  window.__fixtureWriterV106Calls = 0;

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

  function storeInicial(cenario) {
    const store = {
      contratos_cliente: {
        'joaquin-assados': {
          canonicalId: 'joaquin-assados',
          clienteNome: 'Joaquin Assados · fixture V107',
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
          vigencias: [{ inicio: '2026-01', fim: '2026-08', valor: 900, cicloId: 'fixture-v107' }],
        },
      },
      pagamentos_mensais: {
        'joaquin-assados_2026-09': {
          cliente: 'joaquin-assados',
          canonicalId: 'joaquin-assados',
          clienteNome: 'Joaquin Assados · fixture V107',
          competencia: '2026-09',
          valorDevido: 900,
          diaVencimento: 10,
          status: 'cancelado',
        },
      },
      clientes_encerrados: {
        [CANONICAL_EXIT]: {
          slug: 'joaquin-assados',
          canonicalId: 'joaquin-assados',
          nome: 'Joaquin Assados · saída confirmada V107',
          dataAviso: '2026-08-05',
          dataSaida: '2026-09-15',
          ultimaCompetenciaPagamento: '2026-08',
          statusSaida: 'programada',
          tipoCliente: 'mensalista',
          valorMensal: 900,
          motivo: 'resultado',
          motivoDetalhe: 'Baixo retorno financeiro',
          pendenciasFinais: ['fixture V107 preservada'],
          excluido: false,
        },
        [DUPLICATE_EXIT]: {
          slug: 'joaquin-assados',
          canonicalId: 'joaquin-assados',
          nome: 'Joaquin Assados · concorrente V107',
          dataAviso: '2026-08-06',
          dataSaida: '2026-09-15',
          statusSaida: 'programada',
          tipoCliente: 'mensalista',
          valorMensal: 900,
          motivo: 'mudanca_interna',
          motivoDetalhe: 'Baixo retorno financeiro',
          pendenciasFinais: ['fixture V107 preservada'],
          excluido: false,
        },
      },
      clientes_config: {
        'joaquin-assados': {
          nome: 'Joaquin Assados · ficha V107',
          tipoCliente: 'mensalista',
          clienteInativo: false,
          saidaProgramadaPara: '2026-09-15',
          saidaMotivo: 'resultado',
          saidaMotivoDetalhe: 'Baixo retorno financeiro',
        },
      },
      clientes_ciclo_financeiro: {},
      recebimentos_entrada_pessoal: {},
      receitas_avulsas: {},
      financeiro_lancamentos: {},
      config_financeiro: {
        regua_cobranca: {
          schemaVersion: 1,
          inicioOperacao: '2026-07',
          competenciasQuitadasAte: '2026-08',
        },
      },
      contatos_clientes_financeiro: {},
    };

    if (cenario === 'resolvida') {
      store.clientes_encerrados[DUPLICATE_EXIT] = {
        ...store.clientes_encerrados[DUPLICATE_EXIT],
        excluido: true,
        statusSaida: 'cancelada',
        unificadoNoId: CANONICAL_EXIT,
      };
      store.clientes_config['joaquin-assados'].saidaAtivaId = CANONICAL_EXIT;
    }
    if (cenario === 'bloqueada') {
      store.clientes_encerrados[DUPLICATE_EXIT].motivoDetalhe = 'Fato divergente da decisão confirmada';
    }
    return store;
  }

  window.__store = storeInicial(window.__fixtureScenario);

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
  };
  window.registrarLogAutomacao = () => undefined;
  window.confirm = () => true;

  function collection(_db, nome) {
    return { tipo: 'collection', path: String(nome), id: String(nome) };
  }

  function doc(_db, colecao, id) {
    return { tipo: 'document', colecao: String(colecao), id: String(id), path: `${colecao}/${id}` };
  }

  function snapshotDocumento(ref) {
    const colecao = window.__store[ref.colecao] || {};
    const existe = Object.prototype.hasOwnProperty.call(colecao, ref.id);
    const dados = existe ? clone(colecao[ref.id]) : undefined;
    return { id: ref.id, ref, exists: () => existe, data: () => clone(dados) };
  }

  async function getDocs(ref) {
    window.__fixtureReads.push(ref.path);
    if (window.__fixtureScenario === 'indisponivel') throw new Error('Falha sintética de leitura V107');
    const colecao = window.__store[ref.path] || {};
    const docs = Object.keys(colecao).sort().map(id => snapshotDocumento(doc(window.db, ref.path, id)));
    return { docs, size: docs.length, empty: docs.length === 0, forEach: callback => docs.forEach(callback) };
  }

  async function getDoc(ref) {
    window.__fixtureReads.push(ref.path);
    if (window.__fixtureScenario === 'indisponivel') throw new Error('Falha sintética de leitura V107');
    return snapshotDocumento(ref);
  }

  async function escritaProibida(tipo, ref) {
    window.__fixtureWrites.push({ tipo, caminho: ref?.path || '' });
    throw new Error(`Writer ${tipo} não deveria ser chamado pela prova V107`);
  }

  window.collection = collection;
  window.doc = doc;
  window.getDocs = getDocs;
  window.getDoc = getDoc;
  window.setDoc = (ref) => escritaProibida('setDoc', ref);
  window.updateDoc = (ref) => escritaProibida('updateDoc', ref);
  window.runTransaction = () => escritaProibida('runTransaction');
  window.serverTimestamp = () => ({ __op: 'serverTimestamp' });
  window.deleteField = () => ({ __op: 'deleteField' });
  window.arrayUnion = (...items) => ({ __op: 'arrayUnion', items: clone(items) });
}

const htmlHarness = [
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>',
  estilosReais,
  'html,body{margin:0;max-width:100%;min-height:100%;overflow-x:clip!important;background:#202124;color:#f3f3f1}',
  'body{padding:18px}.fixtureV107{width:min(980px,100%);margin:auto}.fixtureV107 *{box-sizing:border-box}',
  '@media(max-width:600px){body{padding:8px}.fixtureV107{width:100%}.row2,.row3,.painelResumo{grid-template-columns:1fr!important}}',
  '</style></head><body><main class="fixtureV107">',
  '<div style="display:none"><input id="finMes" type="month" value="2026-09"><input id="mensMes" type="month" value="2026-09"><input id="cobMes" type="month" value="2026-09"><input id="ctMes" type="month" value="2026-09"><select id="mensFiltro"><option value="todos">Todos</option></select><span id="badgeCobranca"></span></div>',
  '<div class="card" id="financeiroCorrecoesV104Box" style="border:2px solid var(--yellow);margin-top:18px">',
  '<h2>🧾 Conferir os ajustes de setembro</h2>',
  '<button id="bulkPreview" class="btn secondary" style="width:auto" onclick="preverCorrecaoFinanceiraV104()">1. Verificar sem salvar</button>',
  '<div id="financeiroCorrecoesV103Status"><div class="meta">Aguardando carteira.</div></div>',
  '<div id="financeiroCorrecoesFedaltoV104Status"><div class="meta">Aguardando Fedalto.</div></div>',
  '<div id="financeiroCorrecoesV104Acao"></div>',
  '</div>',
  '<div id="financeiroBox"></div><div id="mensalidadesBox"></div><div id="cobrancaBox"></div><div id="contratosBox"></div><div id="financeiroLancamentosBox"></div><div id="toast"></div>',
  '</main><script>(', bootstrapFixtureV107.toString(), ')();</script>',
  '<script type="module">',
  "import { instalarFinanceiroV104 } from '/financeiro-ui-v104.mjs?v=108';",
  'const deps={db:window.db,collection:window.collection,doc:window.doc,getDocs:window.getDocs,getDoc:window.getDoc,setDoc:window.setDoc,updateDoc:window.updateDoc,runTransaction:window.runTransaction,serverTimestamp:window.serverTimestamp,deleteField:window.deleteField,arrayUnion:window.arrayUnion,slugClienteCanonico:window.slugClienteCanonico,hojeLocal:window.hojeLocal,brl:window.brl,nomeMes:window.nomeMes,esc:window.esc,escAttr:window.escAttr,escJs:window.escJs,mostrarToast:window.mostrarToast,usuarioAtual:()=>window.usuarioAtual,auth:window.auth,registrarLogAutomacao:window.registrarLogAutomacao};',
  'window.__runtimeV107=instalarFinanceiroV104(deps);',
  'window.__renderInicialV107=window.renderFinanceiro();',
  'await window.__renderInicialV107;',
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

async function novaPagina(viewport, { papel = 'Chris', cenario = 'pronta' } = {}) {
  const page = await navegador.newPage({ viewport });
  const pageerrors = [];
  page.on('pageerror', erro => pageerrors.push(String(erro?.message || erro)));
  const url = `${baseUrl}?role=${encodeURIComponent(papel)}&scenario=${encodeURIComponent(cenario)}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__fixtureReady === true);
  return { page, pageerrors };
}

async function lerEstado(page) {
  return page.evaluate(() => {
    const painel = document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box');
    const raiz = document.documentElement;
    const corVariavel = nome => {
      const amostra = document.createElement('span');
      amostra.style.color = `var(${nome})`;
      amostra.style.display = 'none';
      document.body.appendChild(amostra);
      const cor = getComputedStyle(amostra).color;
      amostra.remove();
      return cor;
    };
    const leiturasPorColecao = Object.fromEntries(
      [...new Set(window.__fixtureReads)].map(nome => [nome, window.__fixtureReads.filter(v => v === nome).length]),
    );
    return {
      existe: !!painel,
      estado: painel?.dataset?.estado || '',
      texto: painel?.textContent || '',
      titulo: painel?.querySelector('.top b,h2')?.textContent || '',
      selo: painel?.querySelector('.selo')?.textContent || '',
      botoes: [...(painel?.querySelectorAll('button') || [])].map(v => v.textContent.trim()),
      borda: painel ? getComputedStyle(painel).borderTopColor : '',
      verde: corVariavel('--green'),
      amarelo: corVariavel('--yellow'),
      vermelho: corVariavel('--red'),
      cursor: painel ? getComputedStyle(painel).cursor : '',
      writes: window.__fixtureWrites.length,
      reads: window.__fixtureReads.length,
      leiturasPorColecao,
      previewClicks: window.__fixturePreviewClicks,
      viewport: window.innerWidth,
      documento: document.documentElement.scrollWidth,
      corpo: document.body.scrollWidth,
      larguraPainel: Math.ceil(painel?.getBoundingClientRect().width || 0),
      cssRaiz: getComputedStyle(raiz).getPropertyValue('--green').trim(),
    };
  });
}

function validarSnapshotUnico(resultado, rotulo) {
  exigir(resultado.reads === COLECOES_SNAPSHOT.length, `${rotulo}: render usa um único snapshot financeiro (${COLECOES_SNAPSHOT.length} leituras)`);
  exigir(COLECOES_SNAPSHOT.every(nome => resultado.leiturasPorColecao[nome] === 1), `${rotulo}: cada coleção do snapshot é lida exatamente uma vez`);
  exigir(!Object.prototype.hasOwnProperty.call(resultado.leiturasPorColecao, 'contatos_clientes_financeiro'), `${rotulo}: classificação visual não carrega contatos privados`);
}

function validarSemOverflow(resultado, rotulo) {
  exigir(
    resultado.documento <= resultado.viewport &&
      resultado.corpo <= resultado.viewport &&
      resultado.larguraPainel <= resultado.viewport,
    `${rotulo}: cartão não cria overflow horizontal`,
  );
}

function validarEstado(resultado, esperado, rotulo) {
  exigir(resultado.existe && resultado.estado === esperado, `${rotulo}: cartão declara data-estado="${esperado}"`);
  exigir(resultado.writes === 0, `${rotulo}: renderização e classificação executam zero writes`);
  validarSemOverflow(resultado, rotulo);

  if (esperado === 'resolvida') {
    exigir(/confirmad|conclu/i.test(resultado.texto) && !/confirmar a saída correta/i.test(resultado.titulo), `${rotulo}: texto e título comunicam conclusão, não nova pendência`);
    exigir(/conclu/i.test(resultado.selo), `${rotulo}: selo identifica o cartão como concluído`);
    exigir(resultado.botoes.length === 0, `${rotulo}: cartão resolvido não mantém botão em nenhuma área`);
    exigir(resultado.borda === resultado.verde && resultado.borda !== resultado.amarelo, `${rotulo}: cartão resolvido usa estado visual verde`);
    exigir(resultado.cursor !== 'pointer', `${rotulo}: cartão resolvido não sugere ação pelo cursor`);
  } else if (esperado === 'pronta') {
    exigir(/prévia segura|correção pendente|será mantido/i.test(resultado.texto), `${rotulo}: estado pronto explica a correção pendente`);
    exigir(resultado.botoes.some(texto => /confirmar saída correta/i.test(texto)), `${rotulo}: estado pronto oferece somente a confirmação específica`);
    exigir(!/conferência concluída|ajuste concluído/i.test(resultado.texto), `${rotulo}: estado pronto não apresenta falso sucesso`);
  } else if (esperado === 'bloqueada') {
    exigir(/não é seguro|bloquead|auditoria/i.test(resultado.texto), `${rotulo}: estado bloqueado explica que exige auditoria`);
    exigir(!resultado.botoes.some(texto => /confirmar saída correta/i.test(texto)), `${rotulo}: estado bloqueado não oferece writer`);
    exigir(resultado.borda === resultado.vermelho, `${rotulo}: estado bloqueado usa sinal visual vermelho`);
  } else if (esperado === 'indisponivel') {
    exigir(/indisponível|tentar.*novamente|falha.*leitura/i.test(resultado.texto), `${rotulo}: indisponibilidade não é apresentada como vazio ou sucesso`);
    exigir(!resultado.botoes.some(texto => /confirmar saída correta/i.test(texto)), `${rotulo}: indisponibilidade não oferece writer`);
    exigir(
      !/saída correta.*confirmad/i.test(resultado.titulo) && !/^conclu[ií]do$/i.test(resultado.selo.trim()),
      `${rotulo}: indisponibilidade não produz falso concluído`,
    );
  }
}

async function testarEstado(viewport, cenario, esperado) {
  const contexto = await novaPagina(viewport, { cenario });
  const rotulo = `${viewport.width <= 600 ? 'mobile' : 'desktop'} · ${cenario}`;
  try {
    await contexto.page.waitForFunction(estado =>
      document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.dataset?.estado === estado,
    esperado);
    const resultado = await lerEstado(contexto.page);
    validarEstado(resultado, esperado, rotulo);
    if (cenario !== 'indisponivel') validarSnapshotUnico(resultado, rotulo);
    exigir(contexto.pageerrors.length === 0, `${rotulo}: zero pageerror (${contexto.pageerrors.join(' | ')})`);
    return contexto;
  } catch (erro) {
    await contexto.page.close();
    throw erro;
  }
}

async function testarReloadResolvido() {
  const contexto = await novaPagina({ width: 1280, height: 850 }, { cenario: 'resolvida' });
  try {
    await contexto.page.waitForFunction(() =>
      document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.dataset?.estado === 'resolvida');
    await contexto.page.reload({ waitUntil: 'networkidle' });
    await contexto.page.waitForFunction(() => window.__fixtureReady === true &&
      document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.dataset?.estado === 'resolvida');
    const resultado = await lerEstado(contexto.page);
    validarEstado(resultado, 'resolvida', 'reload resolvido');
    validarSnapshotUnico(resultado, 'reload resolvido');
    exigir(resultado.previewClicks === 0, 'reload resolvido: conclusão aparece automaticamente, sem clique manual');
    exigir(contexto.pageerrors.length === 0, `reload resolvido: zero pageerror (${contexto.pageerrors.join(' | ')})`);
  } finally {
    await contexto.page.close();
  }
}

async function prepararAgregado(page) {
  await page.evaluate(() => {
    window.preverCorrecaoFinanceiraSetembroV103 = async () => {
      window.__correcaoSetembroV103 = { resolvidos: { vitalle: true, monique: true, zeiss: true } };
      return true;
    };
    window.preverCorrecaoFedaltoReguaV104 = async () => {
      window.__correcaoFedaltoV104 = { resolvida: true };
      return true;
    };
    // A V108 acrescentou a conciliação histórica da Fedalto ao agregado. Esta
    // suíte focal V107 isola o estado do Joaquim e, portanto, fixa os demais
    // alvos como resolvidos sem executar writer ou consultar outra fixture.
    window.preverCorrecaoFedaltoAgostoV108 = async () => {
      window.__correcaoFedaltoAgostoV108 = { resolvida: true };
      return true;
    };
    const writer = window.aplicarCorrecaoSaidaCanonicaJoaquinV106;
    window.aplicarCorrecaoSaidaCanonicaJoaquinV106 = async (...args) => {
      window.__fixtureWriterV106Calls += 1;
      return writer(...args);
    };
  });
}

async function testarAgregadoBloqueado() {
  const contexto = await novaPagina({ width: 1280, height: 850 }, { cenario: 'bloqueada' });
  try {
    await contexto.page.waitForFunction(() =>
      document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.dataset?.estado === 'bloqueada');
    await prepararAgregado(contexto.page);
    const resultado = await contexto.page.evaluate(async () => {
      const antes = window.__fixtureWrites.length;
      const ok = await window.preverCorrecaoFinanceiraV104();
      return {
        ok,
        texto: document.getElementById('financeiroCorrecoesV104Acao')?.textContent || '',
        botoes: [...document.querySelectorAll('#financeiroCorrecoesV104Acao button')].map(v => v.textContent.trim()),
        estadoJoaquin: document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.dataset?.estado || '',
        writesAntes: antes,
        writesDepois: window.__fixtureWrites.length,
        writerV106Calls: window.__fixtureWriterV106Calls,
      };
    });
    exigir(!resultado.ok && resultado.estadoJoaquin === 'bloqueada', 'agregado bloqueado: resultado incorpora o bloqueio do Joaquim');
    exigir(!/todos os alvos.*corret|conferência concluída/i.test(resultado.texto), 'agregado bloqueado: não declara conclusão quando Joaquim está bloqueado');
    exigir(resultado.botoes.length === 0, 'agregado bloqueado: não oferece aplicação geral insegura');
    exigir(resultado.writesAntes === resultado.writesDepois && resultado.writerV106Calls === 0, 'agregado bloqueado: prévia não chama writer V106 nem grava dados');
    exigir(contexto.pageerrors.length === 0, `agregado bloqueado: zero pageerror (${contexto.pageerrors.join(' | ')})`);
  } finally {
    await contexto.page.close();
  }
}

async function testarAgregadoResolvido() {
  const contexto = await novaPagina({ width: 1280, height: 850 }, { cenario: 'resolvida' });
  try {
    await contexto.page.waitForFunction(() =>
      document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box')?.dataset?.estado === 'resolvida');
    await prepararAgregado(contexto.page);
    const resultado = await contexto.page.evaluate(async () => {
      const antes = window.__fixtureWrites.length;
      const ok = await window.preverCorrecaoFinanceiraV104();
      return {
        ok,
        texto: document.getElementById('financeiroCorrecoesV104Acao')?.textContent || '',
        botoes: document.querySelectorAll('#financeiroCorrecoesV104Acao button').length,
        writesAntes: antes,
        writesDepois: window.__fixtureWrites.length,
        writerV106Calls: window.__fixtureWriterV106Calls,
      };
    });
    exigir(resultado.ok && /conferência concluída|todos os alvos.*corret/i.test(resultado.texto), 'agregado resolvido: conclusão exige também o estado resolvido do Joaquim');
    exigir(resultado.botoes === 0, 'agregado resolvido: não mantém botão de aplicação quando todos os alvos terminaram');
    exigir(resultado.writesAntes === resultado.writesDepois && resultado.writerV106Calls === 0, 'agregado resolvido: prévia agregada executa zero writes');
    exigir(contexto.pageerrors.length === 0, `agregado resolvido: zero pageerror (${contexto.pageerrors.join(' | ')})`);
  } finally {
    await contexto.page.close();
  }
}

async function testarPapelIndevido(papel) {
  const contexto = await novaPagina({ width: 900, height: 700 }, { papel, cenario: 'resolvida' });
  try {
    const resultado = await contexto.page.evaluate(() => ({
      painel: !!document.getElementById('financeiroCorrecaoSaidaCanonicaJoaquinV106Box'),
      texto: document.body.textContent || '',
      reads: window.__fixtureReads.length,
      writes: window.__fixtureWrites.length,
    }));
    exigir(!resultado.painel && !resultado.texto.includes('Saída correta do Joaquim'), `${papel}: cartão e fato financeiro não entram no DOM`);
    exigir(resultado.reads === 0 && resultado.writes === 0, `${papel}: papel indevido não lê nem escreve fontes financeiras`);
    exigir(contexto.pageerrors.length === 0, `${papel}: zero pageerror (${contexto.pageerrors.join(' | ')})`);
  } finally {
    await contexto.page.close();
  }
}

exigir(fonteUi.includes('renderizarPainelConciliacaoJoaquinV107'), 'módulo expõe o renderer focal V107');
exigir(fonteUi.includes("dataset.estado") || fonteUi.includes("data-estado"), 'módulo declara o estado semântico do cartão');

try {
  for (const viewport of [
    { width: 1365, height: 900 },
    { width: 390, height: 844 },
  ]) {
    for (const [cenario, esperado] of [
      ['pronta', 'pronta'],
      ['resolvida', 'resolvida'],
      ['bloqueada', 'bloqueada'],
      ['indisponivel', 'indisponivel'],
    ]) {
      const contexto = await testarEstado(viewport, cenario, esperado);
      await contexto.page.close();
    }
  }

  await testarReloadResolvido();
  await testarAgregadoBloqueado();
  await testarAgregadoResolvido();
  await testarPapelIndevido('Amanda');
  await testarPapelIndevido('Cecília');
} finally {
  await navegador.close();
  await new Promise(resolve => servidor.close(resolve));
}

exigir(sha256Arquivo(caminhoHtml) === hashesIniciais.html, 'escritorio.html permaneceu no mesmo hash durante a prova');
exigir(sha256Arquivo(caminhoCore) === hashesIniciais.core, 'financeiro-core.mjs permaneceu no mesmo hash durante a prova');
exigir(sha256Arquivo(caminhoUi) === hashesIniciais.ui, 'financeiro-ui-v104.mjs permaneceu no mesmo hash durante a prova');

console.log(`V107 UI ESTADO DA CONCILIAÇÃO: ${total - falhas.length}/${total} verificações aprovadas.`);
console.log(`HASH escritorio.html: ${sha256Arquivo(caminhoHtml)}`);
console.log(`HASH financeiro-core.mjs: ${sha256Arquivo(caminhoCore)}`);
console.log(`HASH financeiro-ui-v104.mjs: ${sha256Arquivo(caminhoUi)}`);
console.log(`HASH teste: ${sha256Arquivo(caminhoTeste)}`);
if (falhas.length) {
  console.error(`V107 UI ESTADO DA CONCILIAÇÃO: ${falhas.length} falha(s) real(is).`);
  process.exitCode = 1;
}
