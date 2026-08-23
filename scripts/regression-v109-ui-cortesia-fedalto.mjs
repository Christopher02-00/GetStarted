#!/usr/bin/env node

/*
 * Regressão UI V109 — pagamento de agosto e cortesia de setembro da Fedalto.
 *
 * Executa a UI financeira real num Google Chrome real, em desktop e mobile,
 * contra um Firestore sintético. A fixture não contém PII nem acessa Firebase.
 * O armazenamento sintético persiste apenas no localStorage isolado da página
 * para que uma recarga real possa provar o estado terminal e a idempotência.
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

function bootstrapFixtureV109() {
  const parametros = new URLSearchParams(location.search);
  window.usuarioAtual = parametros.get('role') || 'Chris';
  window.db = { path: '' };
  window.auth = { currentUser: { uid: 'uid-sintetico-v109' } };
  window.__fixtureWrites = [];
  window.__fixtureReads = [];
  window.__fixtureToasts = [];
  window.__fixtureConfirms = [];
  window.__fixtureRenderCalls = [];
  window.__txQueue = Promise.resolve();

  const runId = parametros.get('run') || 'isolado';
  const storageKey = `fixture-v109-fedalto:${runId}`;

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

  function serializar(valor) {
    if (valor instanceof Date) return { __fixtureDate: valor.toISOString() };
    if (Array.isArray(valor)) return valor.map(serializar);
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, serializar(item)]));
    }
    return valor;
  }

  function reviver(valor) {
    if (Array.isArray(valor)) return valor.map(reviver);
    if (valor && typeof valor === 'object') {
      if (Object.keys(valor).length === 1 && typeof valor.__fixtureDate === 'string') {
        return new Date(valor.__fixtureDate);
      }
      return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, reviver(item)]));
    }
    return valor;
  }

  function storeInicial() {
    return {
      contratos_cliente: {
        'fedalto-eletro-comercial': {
          canonicalId: 'fedalto-eletro-comercial',
          clienteNome: 'Fedalto Eletro Comercial · fixture sintética',
          primeiraCompetencia: '2026-09',
          ultimaCompetenciaPagamento: '',
          valorInicial: 1700,
          valorVigente: 1700,
          valorCheio: 1700,
          diaVencimento: 10,
          status: 'ativo',
          cortesiaMeses: ['2026-09'],
          financeiroRevision: 4,
          vigencias: [{ inicio: '2026-09', fim: '', valor: 1700, cicloId: 'fixture-fedalto' }],
        },
      },
      pagamentos_mensais: {
        'fedalto-eletro-comercial_2026-07': {
          cliente: 'fedalto-eletro-comercial', canonicalId: 'fedalto-eletro-comercial',
          clienteNome: 'Fedalto Eletro Comercial · fixture sintética', competencia: '2026-07',
          valorDevido: 1700, diaVencimento: 10, status: 'pago', pagoEm: '2026-08-11',
          cortesiaDoMes: false, comprovante: 'recibo-sintetico-julho-preservado',
          marcadorPreservado: { origem: 'fixture-v109', ordem: 7 },
        },
        'fedalto-eletro-comercial_2026-08': {
          cliente: 'fedalto-eletro-comercial', canonicalId: 'fedalto-eletro-comercial',
          clienteNome: 'Fedalto Eletro Comercial · fixture sintética', competencia: '2026-08',
          valorDevido: 1700, diaVencimento: 10, status: 'isento', pagoEm: '',
          cortesiaDoMes: false, motivoIsencao: 'cortesia manual',
        },
        'fedalto-eletro-comercial_2026-09': {
          cliente: 'fedalto-eletro-comercial', canonicalId: 'fedalto-eletro-comercial',
          clienteNome: 'Fedalto Eletro Comercial · fixture sintética', competencia: '2026-09',
          valorDevido: 1700, diaVencimento: 10, status: 'isento', pagoEm: '',
          cortesiaDoMes: false,
          motivoIsencao: 'cortesia manual',
          marcadorPreservado: { origem: 'fixture-v109', ordem: 9 },
        },
      },
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
        },
      },
      clientes_config: {
        'fedalto-eletro-comercial': {
          nome: 'Fedalto Eletro Comercial · fixture sintética',
          tipoCliente: 'mensalista',
          clienteInativo: false,
        },
      },
      contatos_clientes_financeiro: {},
    };
  }

  function persistirStore() {
    localStorage.setItem(storageKey, JSON.stringify(serializar(window.__store)));
  }

  const persistido = localStorage.getItem(storageKey);
  window.__store = persistido ? reviver(JSON.parse(persistido)) : storeInicial();
  window.__fixtureFoiRecarregada = !!persistido;
  window.__assinaturaFixtureV109 = assinatura;

  function slug(valor) {
    return String(valor || '').trim().toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  window.slugClienteCanonico = slug;
  window.hojeLocal = () => '2026-08-23';
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
    if (valor && valor.__op === 'serverTimestamp') return new Date('2026-08-23T15:00:00.000Z');
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
    persistirStore();
    window.__fixtureWrites.push({ tipo: 'setDoc', caminhos: [ref.path] });
  }

  async function updateDoc(ref, dados) {
    if (!window.__store[ref.colecao]?.[ref.id]) throw new Error(`Documento ausente: ${ref.path}`);
    aplicarSet(window.__store, ref, dados, true);
    persistirStore();
    window.__fixtureWrites.push({ tipo: 'updateDoc', caminhos: [ref.path] });
  }

  async function runTransaction(_db, callback) {
    const executar = async function() {
      const operacoes = [];
      const tx = {
        get: async ref => snapshotDocumento(ref),
        set: (ref, dados, opcoes = {}) => operacoes.push({ ref, dados: clone(dados), merge: opcoes.merge === true }),
        update: (ref, dados) => operacoes.push({ ref, dados: clone(dados), merge: true, exigeExistencia: true }),
      };
      const resultado = await callback(tx);
      for (const operacao of operacoes) {
        if (operacao.exigeExistencia && !window.__store[operacao.ref.colecao]?.[operacao.ref.id]) {
          throw new Error(`Documento ausente: ${operacao.ref.path}`);
        }
      }
      const proximoStore = clone(window.__store);
      for (const operacao of operacoes) aplicarSet(proximoStore, operacao.ref, operacao.dados, operacao.merge);
      window.__store = proximoStore;
      if (operacoes.length) {
        persistirStore();
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
  'body{padding:18px}.fixtureV109{width:min(980px,100%);margin:auto}.fixtureV109 *{box-sizing:border-box}',
  '@media(max-width:600px){body{padding:8px}.fixtureV109{width:100%}.row2,.row3,.painelResumo{grid-template-columns:1fr!important}}',
  '</style></head><body><main class="fixtureV109">',
  '<div style="display:none"><input id="finMes" type="month" value="2026-08"><input id="mensMes" type="month" value="2026-08"><input id="cobMes" type="month" value="2026-08"><input id="ctMes" type="month" value="2026-08"><select id="mensFiltro"><option value="todos">Todos</option></select><span id="badgeCobranca"></span></div>',
  '<div id="financeiroCorrecoesV104Box" class="card" style="border:2px solid var(--yellow)">',
  '<h2>🧾 Conferir os ajustes financeiros</h2>',
  '<div id="financeiroCorrecoesV103Status"><div class="meta">Aguardando carteira.</div></div>',
  '<div id="financeiroCorrecoesFedaltoV104Status"><div class="meta">Aguardando Fedalto.</div></div>',
  '<div id="financeiroCorrecoesV104Acao"></div>',
  '</div>',
  '<div id="financeiroBox"></div><div id="mensalidadesBox"></div><div id="cobrancaBox"></div><div id="contratosBox"></div><div id="financeiroLancamentosBox"></div><div id="toast"></div>',
  '</main><script>(', bootstrapFixtureV109.toString(), ')();</script>',
  '<script type="module">',
  "import { instalarFinanceiroV104 } from '/financeiro-ui-v104.mjs?v=109';",
  'const deps={db:window.db,collection:window.collection,doc:window.doc,getDocs:window.getDocs,getDoc:window.getDoc,setDoc:window.setDoc,updateDoc:window.updateDoc,runTransaction:window.runTransaction,serverTimestamp:window.serverTimestamp,deleteField:window.deleteField,arrayUnion:window.arrayUnion,slugClienteCanonico:window.slugClienteCanonico,hojeLocal:window.hojeLocal,brl:window.brl,nomeMes:window.nomeMes,esc:window.esc,escAttr:window.escAttr,escJs:window.escJs,mostrarToast:window.mostrarToast,usuarioAtual:()=>window.usuarioAtual,auth:window.auth,registrarLogAutomacao:window.registrarLogAutomacao};',
  'window.__runtimeV109=instalarFinanceiroV104(deps);',
  'window.__stubRendersV109=()=>{window.renderFinanceiro=async()=>{window.__fixtureRenderCalls.push("financeiro");return true;};window.renderMensalidades=async()=>{window.__fixtureRenderCalls.push("mensalidades");return true;};window.renderCobranca=async()=>{window.__fixtureRenderCalls.push("cobranca");return true;};window.renderContratos=async()=>{window.__fixtureRenderCalls.push("contratos");return true;};};',
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

let sequenciaPaginas = 0;
async function novaPagina(viewport, papel = 'Chris') {
  sequenciaPaginas += 1;
  const page = await navegador.newPage({ viewport });
  const pageerrors = [];
  page.on('pageerror', erro => pageerrors.push(String(erro?.message || erro)));
  const run = `${papel}-${sequenciaPaginas}`;
  await page.goto(`${baseUrl}?role=${encodeURIComponent(papel)}&run=${encodeURIComponent(run)}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__fixtureReady === true);
  return { page, pageerrors };
}

async function dimensoesPainel(page) {
  return page.evaluate(() => {
    const painel = document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    return {
      viewport: window.innerWidth,
      documento: document.documentElement.scrollWidth,
      corpo: document.body.scrollWidth,
      painel: Math.ceil(painel?.getBoundingClientRect().width || 0),
    };
  });
}

function exigirSemOverflow(largura, rotulo) {
  exigir(
    largura.documento <= largura.viewport && largura.corpo <= largura.viewport && largura.painel <= largura.viewport,
    `${rotulo}: painel V109 permanece sem overflow horizontal`,
  );
}

async function testarFluxoPrincipal(page, rotulo) {
  const inicial = await page.evaluate(() => ({
    presente: !!document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status'),
    estado: document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status')?.dataset?.estado || '',
    writes: window.__fixtureWrites.length,
    reads: window.__fixtureReads.length,
  }));
  exigir(inicial.presente && inicial.estado === 'aguardando' && inicial.writes === 0 && inicial.reads === 0, `${rotulo}: depois da autorização Financeiro o painel nasce em aguardando sem executar leitura ou write`);

  const previaOk = await page.evaluate(() => window.preverCorrecaoFedaltoAgostoV109());
  await page.waitForFunction(() => document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status')?.dataset?.estado === 'pronta');
  const previa = await page.evaluate(() => {
    const alvo = document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    const botoes = [...alvo.querySelectorAll('button')];
    return {
      estado: alvo.dataset.estado,
      classe: alvo.className,
      texto: alvo.textContent || '',
      botoes: botoes.length,
      botao: botoes[0]?.textContent || '',
      writes: window.__fixtureWrites.length,
      reads: window.__fixtureReads.length,
    };
  });
  exigir(previaOk && previa.estado === 'pronta' && previa.classe.includes('correcaoFinanceiraEstado-pronta'), `${rotulo}: prévia real classifica o retrato auditado como pronto`);
  exigir(previa.writes === 0 && previa.reads === 9, `${rotulo}: prévia consulta as nove fontes e executa zero write`);
  exigir(previa.botoes === 1 && previa.botao.includes('Confirmar ajuste da Fedalto'), `${rotulo}: escrita exige um único botão explícito para o lote dirigido`);
  exigir(previa.texto.includes('Prévia segura; nada foi salvo') && previa.texto.includes('Julho permanece pago') && previa.texto.includes('setembro permanece cortesia'), `${rotulo}: prévia explica preservações e ausência de gravação`);
  exigirSemOverflow(await dimensoesPainel(page), `${rotulo} pronta`);

  const antes = await page.evaluate(() => ({
    julho: window.__assinaturaFixtureV109(window.__store.pagamentos_mensais['fedalto-eletro-comercial_2026-07']),
    config: window.__assinaturaFixtureV109(window.__store.clientes_config['fedalto-eletro-comercial']),
  }));
  await page.evaluate(() => window.__stubRendersV109());
  await page.click('#financeiroCorrecaoFedaltoAgostoV109Status button');
  await page.waitForFunction(() => document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status')?.dataset?.estado === 'resolvida');

  const depois = await page.evaluate(antesFixture => {
    const s = window.__store;
    const contrato = s.contratos_cliente['fedalto-eletro-comercial'];
    const agosto = s.pagamentos_mensais['fedalto-eletro-comercial_2026-08'];
    const setembro = s.pagamentos_mensais['fedalto-eletro-comercial_2026-09'];
    const evento = s.clientes_ciclo_financeiro.fin_v109_fedalto_agosto_setembro_20260815;
    const commits = window.__fixtureWrites.filter(item => item.tipo === 'transaction');
    const alvo = document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    return {
      julhoPreservado: window.__assinaturaFixtureV109(s.pagamentos_mensais['fedalto-eletro-comercial_2026-07']) === antesFixture.julho,
      configPreservada: window.__assinaturaFixtureV109(s.clientes_config['fedalto-eletro-comercial']) === antesFixture.config,
      contrato,
      agosto,
      setembro,
      evento: evento ? { ...evento, dataEfetivaIso: evento.dataEfetiva instanceof Date ? evento.dataEfetiva.toISOString() : String(evento.dataEfetiva || '') } : null,
      commits: commits.length,
      caminhos: [...(commits[0]?.caminhos || [])].sort(),
      writes: window.__fixtureWrites.length,
      confirma: window.__fixtureConfirms.slice(),
      renderCalls: window.__fixtureRenderCalls.slice(),
      estado: alvo.dataset.estado,
      classe: alvo.className,
      cursor: getComputedStyle(alvo).cursor,
      texto: alvo.textContent || '',
      botoes: alvo.querySelectorAll('button').length,
      selo: alvo.querySelector('.selo')?.textContent || '',
    };
  }, antes);

  exigir(depois.commits === 1 && depois.writes === 1 && JSON.stringify(depois.caminhos) === JSON.stringify([
    'clientes_ciclo_financeiro/fin_v109_fedalto_agosto_setembro_20260815',
    'contratos_cliente/fedalto-eletro-comercial',
    'pagamentos_mensais/fedalto-eletro-comercial_2026-08',
    'pagamentos_mensais/fedalto-eletro-comercial_2026-09',
  ]), `${rotulo}: clique faz uma transação atômica somente em contrato, agosto, setembro e ledger`);
  exigir(depois.contrato?.primeiraCompetencia === '2026-07' && depois.contrato?.vigencias?.length === 1 && depois.contrato.vigencias[0]?.inicio === '2026-07' && !depois.contrato.vigencias[0]?.fim, `${rotulo}: contrato passa a cobrir julho, agosto, setembro e outubro sem abrir intervalo paralelo`);
  exigir(depois.contrato?.financeiroRevision === 5 && depois.contrato?.financeiroOperationId === 'fin_v109_fedalto_agosto_setembro_20260815', `${rotulo}: contrato recebe revisão monotônica e operationId determinístico`);
  exigir(depois.agosto?.status === 'pago' && depois.agosto?.pagoEm === '2026-08-15' && depois.agosto?.cortesiaDoMes === false && !Object.prototype.hasOwnProperty.call(depois.agosto, 'motivoIsencao'), `${rotulo}: agosto vira pago na data exata e deixa de carregar a isenção incorreta`);
  exigir(depois.setembro?.status === 'isento' && depois.setembro?.valorDevido === 1700 && depois.setembro?.pagoEm === '' && depois.setembro?.cortesiaDoMes === true && depois.setembro?.motivoIsencao === 'Cortesia promocional da agência em setembro de 2026' && depois.setembro?.financeiroOperationId === 'fin_v109_fedalto_agosto_setembro_20260815', `${rotulo}: setembro continua isento e recebe somente a cortesia promocional canônica e sua auditoria`);
  exigir(depois.setembro?.marcadorPreservado?.origem === 'fixture-v109' && depois.setembro?.marcadorPreservado?.ordem === 9, `${rotulo}: campo lateral de setembro é preservado`);
  exigir(depois.evento?.operationId === 'fin_v109_fedalto_agosto_setembro_20260815' && depois.evento?.clienteId === 'fedalto-eletro-comercial' && depois.evento?.sourceType === 'contrato' && depois.evento?.dataEfetivaIso.startsWith('2026-08-15T15:00:00.000Z'), `${rotulo}: ledger append-only registra identidade, fonte e data efetiva esperadas`);
  exigir(depois.julhoPreservado && depois.configPreservada, `${rotulo}: julho e ficha permanecem byte a byte`);
  exigir(depois.confirma.length === 1 && depois.confirma[0].includes('sem alterar julho') && depois.confirma[0].includes('cortesia promocional'), `${rotulo}: confirmação humana repete o impacto antes do commit`);
  exigir(depois.renderCalls.sort().join(',') === 'cobranca,contratos,financeiro,mensalidades', `${rotulo}: consumidores são solicitados somente depois do recibo confirmado`);
  exigir(depois.estado === 'resolvida' && depois.classe.includes('correcaoFinanceiraEstado-resolvida') && depois.cursor === 'default', `${rotulo}: cartão inteiro converge para o estado terminal verde`);
  exigir(depois.selo.trim() === 'Concluído' && depois.botoes === 0 && depois.texto.includes('Não existe ação pendente'), `${rotulo}: estado concluído remove todo botão e comunica que não há nova ação`);
  exigirSemOverflow(await dimensoesPainel(page), `${rotulo} concluída`);

  const retry = await page.evaluate(async () => {
    const antesWrites = window.__fixtureWrites.length;
    const antesConfirms = window.__fixtureConfirms.length;
    const ok = await window.aplicarCorrecaoFedaltoAgostoV109();
    const estado = document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    return {
      ok,
      antesWrites,
      depoisWrites: window.__fixtureWrites.length,
      antesConfirms,
      depoisConfirms: window.__fixtureConfirms.length,
      toast: window.__fixtureToasts.at(-1)?.mensagem || '',
      estado: estado.dataset.estado,
      botoes: estado.querySelectorAll('button').length,
    };
  });
  exigir(retry.ok && retry.antesWrites === retry.depoisWrites && retry.antesConfirms === retry.depoisConfirms, `${rotulo}: retry resolvido não grava nem reabre confirmação`);
  exigir(retry.toast.includes('já estava conciliado') && retry.estado === 'resolvida' && retry.botoes === 0, `${rotulo}: retry mantém feedback terminal e zero ação residual`);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__fixtureReady === true);
  const recarregou = await page.evaluate(() => window.renderFinanceiro());
  await page.waitForFunction(() => document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status')?.dataset?.estado === 'resolvida');
  const reload = await page.evaluate(() => {
    const alvo = document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    return {
      recarregada: window.__fixtureFoiRecarregada,
      writes: window.__fixtureWrites.length,
      reads: window.__fixtureReads.length,
      estado: alvo.dataset.estado,
      classe: alvo.className,
      selo: alvo.querySelector('.selo')?.textContent || '',
      botoes: alvo.querySelectorAll('button').length,
      contratoInicio: window.__store.contratos_cliente['fedalto-eletro-comercial']?.primeiraCompetencia,
      agosto: window.__store.pagamentos_mensais['fedalto-eletro-comercial_2026-08'],
      setembro: window.__store.pagamentos_mensais['fedalto-eletro-comercial_2026-09'],
      evento: window.__store.clientes_ciclo_financeiro.fin_v109_fedalto_agosto_setembro_20260815 || null,
    };
  });
  exigir(recarregou && reload.recarregada && reload.writes === 0 && reload.reads === 9, `${rotulo}: recarga real relê as fontes e executa zero nova gravação`);
  exigir(reload.estado === 'resolvida' && reload.classe.includes('correcaoFinanceiraEstado-resolvida') && reload.selo.trim() === 'Concluído' && reload.botoes === 0, `${rotulo}: recarga restaura cartão verde, concluído e sem botão`);
  exigir(reload.contratoInicio === '2026-07' && reload.agosto?.pagoEm === '2026-08-15' && reload.evento?.operationId === 'fin_v109_fedalto_agosto_setembro_20260815', `${rotulo}: contrato, agosto e ledger persistem depois da recarga`);
  exigir(reload.setembro?.status === 'isento' && reload.setembro?.cortesiaDoMes === true && reload.setembro?.pagoEm === '', `${rotulo}: setembro permanece cortesia sem data de caixa depois da recarga`);
  exigirSemOverflow(await dimensoesPainel(page), `${rotulo} após reload`);

  const futuro = await page.evaluate(async () => {
    const contrato = window.__store.contratos_cliente['fedalto-eletro-comercial'];
    contrato.status = 'encerrado';
    contrato.ultimaCompetenciaPagamento = '2026-10';
    contrato.financeiroRevision = 6;
    contrato.financeiroOperationId = 'fin_saida_futura_fedalto_20261031';
    contrato.vigencias = contrato.vigencias.map(vigencia => ({ ...vigencia, fim: '2026-10' }));
    window.__store.clientes_encerrados.saida_futura_fedalto = {
      canonicalId: 'fedalto-eletro-comercial',
      status: 'encerrado',
      excluido: false,
      ultimaCompetenciaPagamento: '2026-10',
    };
    window.__runtimeV109.invalidar();
    const antesWrites = window.__fixtureWrites.length;
    const ok = await window.renderFinanceiro();
    const alvo = document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    return {
      ok,
      writes: window.__fixtureWrites.length - antesWrites,
      estado: alvo?.dataset?.estado || '',
      selo: alvo?.querySelector('.selo')?.textContent?.trim() || '',
      botoes: alvo?.querySelectorAll('button').length || 0,
    };
  });
  exigir(futuro.ok && futuro.writes === 0 && futuro.estado === 'resolvida' && futuro.selo === 'Concluído' && futuro.botoes === 0, `${rotulo}: uma saída financeira futura legítima não reabre nem repete a conciliação histórica V109`);

  const reciboDivergente = await page.evaluate(async () => {
    const evento = window.__store.clientes_ciclo_financeiro.fin_v109_fedalto_agosto_setembro_20260815;
    evento.postHash = evento.preHash;
    window.__runtimeV109.invalidar();
    const antesWrites = window.__fixtureWrites.length;
    const ok = await window.renderFinanceiro();
    const alvo = document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    return {
      ok,
      writes: window.__fixtureWrites.length - antesWrites,
      estado: alvo?.dataset?.estado || '',
      texto: alvo?.textContent || '',
    };
  });
  exigir(reciboDivergente.ok && reciboDivergente.writes === 0 && reciboDivergente.estado === 'bloqueada' && reciboDivergente.texto.includes('recibo V109 existe'), `${rotulo}: recibo divergente nunca é apresentado silenciosamente como concluído`);
}

async function testarPapelIndevido(page, papel) {
  const resultado = await page.evaluate(async () => {
    const presenteAntes = !!document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    const antesLeituras = window.__fixtureReads.length;
    const antesWrites = window.__fixtureWrites.length;
    const previa = await window.preverCorrecaoFedaltoAgostoV109();
    const aplicacao = await window.aplicarCorrecaoFedaltoAgostoV109();
    const alvo = document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    return {
      previa,
      aplicacao,
      presenteAntes,
      presenteDepois: !!alvo,
      leituras: window.__fixtureReads.length - antesLeituras,
      writes: window.__fixtureWrites.length - antesWrites,
      texto: alvo?.textContent?.trim() || '',
      botoes: alvo?.querySelectorAll('button').length || 0,
    };
  });
  exigir(!resultado.previa && !resultado.aplicacao && resultado.leituras === 0 && resultado.writes === 0, `${papel}: papel indevido não lê nem escreve a correção financeira`);
  exigir(!resultado.presenteAntes && !resultado.presenteDepois && resultado.texto === '' && resultado.botoes === 0, `${papel}: DOM, fatos e ações financeiras permanecem ausentes`);
}

async function testarPrecondicaoBloqueada(page, mutacao, trechoEsperado, rotulo) {
  const resultado = await page.evaluate(async ({ mutacao, trechoEsperado }) => {
    if (mutacao === 'julho-data') {
      window.__store.pagamentos_mensais['fedalto-eletro-comercial_2026-07'].pagoEm = '2026-08-10';
    } else if (mutacao === 'setembro-cortesia') {
      window.__store.pagamentos_mensais['fedalto-eletro-comercial_2026-09'].motivoIsencao = 'cortesia genérica';
    }
    const antesWrites = window.__fixtureWrites.length;
    const ok = await window.preverCorrecaoFedaltoAgostoV109();
    const alvo = document.getElementById('financeiroCorrecaoFedaltoAgostoV109Status');
    return {
      ok,
      writes: window.__fixtureWrites.length - antesWrites,
      estado: alvo?.dataset?.estado || '',
      texto: alvo?.textContent || '',
      contem: (alvo?.textContent || '').includes(trechoEsperado),
      botoesConfirmacao: [...(alvo?.querySelectorAll('button') || [])]
        .filter(botao => botao.textContent.includes('Confirmar ajuste')).length,
    };
  }, { mutacao, trechoEsperado });
  exigir(!resultado.ok && resultado.writes === 0 && resultado.estado === 'bloqueada' && resultado.contem && resultado.botoesConfirmacao === 0, `${rotulo}: divergência auditada bloqueia a correção, explica a causa e executa zero write`);
}

exigir(fonteHtml.includes('2026-08-23-canonicalizacao-cortesia-fedalto-v109'), 'HTML real identifica o build V109 da Fedalto');
exigir(fonteHtml.includes('financeiro-core.mjs?v=109') && fonteHtml.includes('financeiro-ui-v104.mjs?v=109'), 'HTML real instala core e UI com cache-buster V109');
exigir(!fonteHtml.includes('financeiroCorrecaoFedaltoAgostoV109Status'), 'HTML público não contém o alvo nem fatos financeiros estáticos da V109');
exigir(fonteUi.includes('preverCorrecaoFedaltoAgostoV109') && fonteUi.includes('aplicarCorrecaoFedaltoAgostoV109'), 'UI real expõe prévia e confirmação separadas');
exigir(fonteUi.includes('garantirPainelCorrecaoFedaltoAgostoV109') && fonteUi.includes("if(!canFinanceiro()){existente?.remove();return null;}"), 'UI cria o painel V109 somente depois de confirmar o papel Financeiro');
exigir(fonteUi.includes("operationId:'fin_v109_fedalto_agosto_setembro_20260815'") && fonteUi.includes("augustPaidAt:'2026-08-15'"), 'UI real fixa identidade idempotente e data civil confirmada');
exigir(fonteUi.includes("julyPaidAt:'2026-08-11'") && fonteUi.includes("septemberCourtesyReason:'Cortesia promocional da agência em setembro de 2026'"), 'UI real fixa julho e a cortesia de setembro como pré-condições exatas');

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

  for (const papel of ['Amanda', 'Gabi', 'Cecília', 'Luís', 'Nathan', 'Cliente', 'Anônimo']) {
    const contexto = await novaPagina({ width: 900, height: 700 }, papel);
    try {
      await testarPapelIndevido(contexto.page, papel);
      exigir(contexto.pageerrors.length === 0, `${papel}: zero pageerror (${contexto.pageerrors.join(' | ')})`);
    } finally {
      await contexto.page.close();
    }
  }

  for (const caso of [
    { mutacao: 'julho-data', trecho: '11/08/2026', rotulo: 'pré-condição de julho' },
    { mutacao: 'setembro-cortesia', trecho: 'Setembro não corresponde à cortesia manual auditada', rotulo: 'pré-condição de setembro' },
  ]) {
    const contexto = await novaPagina({ width: 900, height: 700 });
    try {
      await testarPrecondicaoBloqueada(contexto.page, caso.mutacao, caso.trecho, caso.rotulo);
      exigir(contexto.pageerrors.length === 0, `${caso.rotulo}: zero pageerror (${contexto.pageerrors.join(' | ')})`);
    } finally {
      await contexto.page.close();
    }
  }
} finally {
  await navegador.close();
  await new Promise(resolve => servidor.close(resolve));
}

exigir(sha256Arquivo(caminhoHtml) === hashesIniciais.html, 'escritorio.html permaneceu no mesmo hash durante a prova');
exigir(sha256Arquivo(caminhoCore) === hashesIniciais.core, 'financeiro-core.mjs permaneceu no mesmo hash durante a prova');
exigir(sha256Arquivo(caminhoUi) === hashesIniciais.ui, 'financeiro-ui-v104.mjs permaneceu no mesmo hash durante a prova');

console.log(`V109 UI CORTESIA FEDALTO: ${total - falhas.length}/${total} verificações aprovadas.`);
console.log(`HASH escritorio.html: ${sha256Arquivo(caminhoHtml)}`);
console.log(`HASH financeiro-core.mjs: ${sha256Arquivo(caminhoCore)}`);
console.log(`HASH financeiro-ui-v104.mjs: ${sha256Arquivo(caminhoUi)}`);
console.log(`HASH teste: ${sha256Arquivo(caminhoTeste)}`);
if (falhas.length) {
  console.error(`V109 UI CORTESIA FEDALTO: ${falhas.length} falha(s) real(is).`);
  process.exitCode = 1;
}
