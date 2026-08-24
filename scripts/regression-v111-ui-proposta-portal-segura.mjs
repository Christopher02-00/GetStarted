#!/usr/bin/env node

/*
 * Regressão UI V111 — proposta protegida do Portal.
 *
 * Executa as funções reais da seção "Sua Proposta" extraídas de
 * portal-cliente.html em Google Chrome real. O Firestore é substituído por
 * um adaptador sintético que reproduz a fronteira esperada das regras:
 * índice estreito antes do PIN, gate vinculado à sessão, point-get da
 * projeção e commit atômico canônico+projeção. Não acessa rede externa,
 * Firebase ou dados reais e não contém PII.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caminhoPortal = path.join(raiz, 'portal-cliente.html');
const fontePortal = fs.readFileSync(caminhoPortal, 'utf8');

const simbolosObrigatorios = [
  'buscarIndicesPropostaDoCliente',
  'criarLiberacaoPropostaPortal',
  'buscarPropostasLiberadas',
  'carregarPropostaCliente',
  'atualizarRespostaPropostaProtegida',
  'salvarComprovanteProtegido',
  '__propostasLiberadasIds',
  'limparLiberacoesPropostaPortal',
];
const ausentes = simbolosObrigatorios.filter(simbolo => !fontePortal.includes(simbolo));
if (ausentes.length) {
  console.error('V111 UI PROPOSTA SEGURA: frontend ainda não expõe o contrato esperado: ' + ausentes.join(', '));
  console.error('Este é o estado vermelho esperado antes da correção V111.');
  process.exit(1);
}

const inicioBloco = fontePortal.indexOf('/* ===== SUA PROPOSTA');
const fimBloco = fontePortal.indexOf('async function calcularEtapasProducao', inicioBloco);
if (inicioBloco < 0 || fimBloco < 0) {
  console.error('V111 UI PROPOSTA SEGURA: marcadores da seção real do Portal não foram encontrados.');
  process.exit(1);
}
const blocoPropostaReal = fontePortal.slice(inicioBloco, fimBloco);
function extrairTrecho(inicio, fim) {
  const a = fontePortal.indexOf(inicio);
  const b = fontePortal.indexOf(fim, a + inicio.length);
  if (a < 0 || b < 0) throw new Error(`V111 UI PROPOSTA SEGURA: trecho real ausente: ${inicio}`);
  return fontePortal.slice(a, b);
}
const blocoRespostaProtegida = blocoPropostaReal.includes('async function atualizarRespostaPropostaProtegida')
  ? ''
  : extrairTrecho('  async function atualizarRespostaPropostaProtegida', '  window.responderProposta');
const blocoComprovanteProtegido = blocoPropostaReal.includes('async function salvarComprovanteProtegido')
  ? ''
  : extrairTrecho('  async function salvarComprovanteProtegido', '  window.salvarComprovante');

let total = 0;
const falhas = [];
function exigir(condicao, mensagem) {
  total += 1;
  if (condicao) {
    console.log('PASS ', mensagem);
    return true;
  }
  falhas.push(mensagem);
  console.error('FAIL ', mensagem);
  return false;
}

const camposPublicosPermitidos = new Set([
  'propostaId', 'clienteSlug', 'estagio', 'propostaPlano', 'propostaValor',
  'propostaValidade', 'propostaLink', 'propostaCondicoes', 'respostaCliente',
  'respostaTexto', 'pagamentoComprovante', 'pagamentoEnviadoEm',
  'propostaEnviadaEm', 'propostaRecorrencia', 'tipoInteresse', 'visivel',
  'atualizadoEm', 'portalRevision', 'portalOperationId', 'schemaVersion',
]);

const bootstrapSintetico = String.raw`
  var db = { __fixture: 'v111' };
  var clienteAtual;
  var auth;

  (() => {
    const params = new URLSearchParams(location.search);
    const runId = params.get('run') || 'isolado';
    const papel = params.get('cliente') === 'b' ? 'b' : 'a';
    const storageKey = 'fixture-v111-proposta:' + runId;
    const contadorKey = storageKey + ':sessoes';

    function clone(valor) {
      if (valor === undefined) return undefined;
      return JSON.parse(JSON.stringify(valor));
    }
    function assinatura(valor) {
      if (Array.isArray(valor)) return '[' + valor.map(assinatura).join(',') + ']';
      if (valor && typeof valor === 'object') {
        return '{' + Object.keys(valor).sort().map(k => JSON.stringify(k) + ':' + assinatura(valor[k])).join(',') + '}';
      }
      return JSON.stringify(valor);
    }
    function storeInicial() {
      return {
        negocios: {
          'prop-a': {
            clienteSlug: 'cliente-a', estagio: 'proposta', propostaPlano: 'Plano sintético A',
            propostaValor: 'R$ 1.234,00', propostaValidade: '2099-12-31',
            propostaLink: 'https://example.invalid/proposta-a', propostaCondicoes: 'Condição sintética',
            respostaCliente: '', respostaTexto: '', pagamentoComprovante: '',
            historico: [{ estagio: 'proposta', em: '2026-08-24T10:00:00.000Z', por: 'equipe' }],
            whatsapp: 'DADO_INTERNO_NAO_PODE_SER_LIDO', responsavelComercial: 'SEGREDO_INTERNO_A',
            resumoConversa: 'SEGREDO_INTERNO_A', portalRevision: 1,
          },
          'prop-b': {
            clienteSlug: 'cliente-b', estagio: 'proposta', propostaPlano: 'Plano sintético B',
            propostaValor: 'R$ 9.999,00', propostaValidade: '2099-12-31',
            historico: [{ estagio: 'proposta', em: '2026-08-24T10:00:00.000Z', por: 'equipe' }],
            whatsapp: 'DADO_INTERNO_NAO_PODE_SER_LIDO', responsavelComercial: 'SEGREDO_INTERNO_B',
            portalRevision: 1,
          },
        },
        indices: {
          'prop-a': { propostaId: 'prop-a', clienteSlug: 'cliente-a', temPin: true, visivel: true, schemaVersion: 1 },
          'prop-b': { propostaId: 'prop-b', clienteSlug: 'cliente-b', temPin: true, visivel: true, schemaVersion: 1 },
        },
        verificadores: {
          'prop-a': { propostaId: 'prop-a', clienteSlug: 'cliente-a', pin4: '2468', visivel: true },
          'prop-b': { propostaId: 'prop-b', clienteSlug: 'cliente-b', pin4: '1357', visivel: true },
        },
        publicas: {
          'prop-a': {
            propostaId: 'prop-a', clienteSlug: 'cliente-a', estagio: 'proposta',
            propostaPlano: 'Plano sintético A', propostaValor: 'R$ 1.234,00',
            propostaValidade: '2099-12-31', propostaLink: 'https://example.invalid/proposta-a',
            propostaCondicoes: 'Condição sintética', respostaCliente: '', respostaTexto: '',
            pagamentoComprovante: '', pagamentoEnviadoEm: '', propostaEnviadaEm: '2026-08-24T10:00:00.000Z',
            propostaRecorrencia: 'unica', tipoInteresse: 'avulso', visivel: true,
            atualizadoEm: '2026-08-24T10:00:00.000Z', portalRevision: 1,
            portalOperationId: 'seed-a', schemaVersion: 1,
          },
          'prop-b': {
            propostaId: 'prop-b', clienteSlug: 'cliente-b', estagio: 'proposta',
            propostaPlano: 'Plano sintético B', propostaValor: 'R$ 9.999,00',
            propostaValidade: '2099-12-31', propostaLink: '', propostaCondicoes: '',
            respostaCliente: '', respostaTexto: '', pagamentoComprovante: '', pagamentoEnviadoEm: '',
            propostaEnviadaEm: '2026-08-24T10:00:00.000Z', propostaRecorrencia: 'unica',
            tipoInteresse: 'avulso', visivel: true, atualizadoEm: '2026-08-24T10:00:00.000Z',
            portalRevision: 1, portalOperationId: 'seed-b', schemaVersion: 1,
          },
        },
        gates: {},
      };
    }

    const persistido = localStorage.getItem(storageKey);
    const store = persistido ? JSON.parse(persistido) : storeInicial();
    let contadorSessao = Number(localStorage.getItem(contadorKey) || 0) + 1;
    localStorage.setItem(contadorKey, String(contadorSessao));
    const uid = papel === 'b' ? 'uid-cliente-b' : 'uid-cliente-a';
    const slug = papel === 'b' ? 'cliente-b' : 'cliente-a';
    clienteAtual = { slug, nome: papel === 'b' ? 'Cliente B' : 'Cliente A', escopo: {} };
    auth = { currentUser: { uid } };
    window.__fixtureSessaoPortalAbertaEm = 'sessao-' + runId + '-' + contadorSessao;
    const sessao = { uid, cliente: slug, abertaEm: window.__fixtureSessaoPortalAbertaEm };
    let modo = '';
    let ocultarIndiceA = false;
    let retryBudget = 0;
    let txQueue = Promise.resolve();
    const trace = { reads: [], writeAttempts: [], writes: [], transactions: [], alerts: [], publicReadKeys: [], events: [] };

    function persistir() { localStorage.setItem(storageKey, JSON.stringify(store)); }
    function erro(codigo, mensagem) {
      const e = new Error(mensagem || codigo); e.code = codigo; return e;
    }
    function ref(caminho) { return { __ref: true, path: String(caminho || '').replace(/^\/+|\/+$/g, '') }; }
    function caminhoRef(alvo) { return String(alvo?.path || alvo || '').replace(/^\/+|\/+$/g, ''); }
    function docSnapshot(alvo, dados) {
      const existe = dados !== undefined;
      const id = caminhoRef(alvo).split('/').pop();
      return { id, ref: alvo, exists: () => existe, data: () => clone(dados) };
    }
    function dadosNoCaminho(caminho) {
      const partes = caminho.split('/');
      if (partes[0] === 'negocios') return store.negocios[partes[1]];
      if (partes[0] === 'propostas_portal_indices') return store.indices[partes[1]];
      if (partes[0] === 'propostas_portal_verificadores') return store.verificadores[partes[1]];
      if (partes[0] === 'propostas_portal_publicas') return store.publicas[partes[1]];
      if (partes[0] === 'sessoes_cliente' && partes[2] === 'liberacoes_proposta') return store.gates[partes[1] + '/' + partes[3]];
      return undefined;
    }
    function gateAtivo(propostaId) {
      const gate = store.gates[uid + '/' + propostaId];
      const publica = store.publicas[propostaId];
      return !!gate && gate.clienteSlug === slug && gate.propostaId === propostaId &&
        gate.sessaoAbertaEm === sessao.abertaEm && publica?.clienteSlug === slug && publica?.visivel === true;
    }

    window.collection = function collection(base, ...segmentos) {
      const prefixo = base?.__ref ? caminhoRef(base) + '/' : '';
      return ref(prefixo + segmentos.map(String).join('/'));
    };
    window.doc = function doc(base, ...segmentos) {
      const prefixo = base?.__ref ? caminhoRef(base) + '/' : '';
      return ref(prefixo + segmentos.map(String).join('/'));
    };
    window.where = (campo, operador, valor) => ({ __where: true, campo, operador, valor });
    window.query = (base, ...restricoes) => ({ __query: true, path: caminhoRef(base), restricoes });
    window.serverTimestamp = () => ({ __op: 'serverTimestamp' });
    window.arrayUnion = (...items) => ({ __op: 'arrayUnion', items });
    window.increment = quantidade => ({ __op: 'increment', quantidade: Number(quantidade || 0) });

    window.getDocs = async function getDocs(alvo) {
      const caminho = caminhoRef(alvo);
      trace.reads.push({ tipo: 'list', caminho, restricoes: clone(alvo?.restricoes || []) });
      trace.events.push({ tipo: 'read-list', caminho });
      if (modo === 'erro-indice' && caminho === 'propostas_portal_indices') {
        throw erro('unavailable', 'indisponibilidade sintética do índice');
      }
      if (caminho !== 'propostas_portal_indices') {
        throw erro('permission-denied', 'list não permitida em ' + caminho);
      }
      let entradas = Object.entries(store.indices);
      if (ocultarIndiceA) entradas = entradas.filter(([id]) => id !== 'prop-a');
      for (const filtro of alvo?.restricoes || []) {
        if (filtro?.__where && filtro.operador === '==') entradas = entradas.filter(([, dados]) => dados?.[filtro.campo] === filtro.valor);
      }
      const docs = entradas.map(([id, dados]) => ({ id, ref: ref(caminho + '/' + id), exists: () => true, data: () => clone(dados) }));
      return { docs, size: docs.length, empty: docs.length === 0, forEach: callback => docs.forEach(callback) };
    };

    window.getDoc = async function getDoc(alvo) {
      const caminho = caminhoRef(alvo);
      trace.reads.push({ tipo: 'get', caminho });
      trace.events.push({ tipo: 'read-get', caminho });
      if (caminho.startsWith('negocios/') || caminho.startsWith('propostas_portal_verificadores/')) {
        throw erro('permission-denied', 'documento privado bloqueado: ' + caminho);
      }
      if (caminho.startsWith('propostas_portal_publicas/')) {
        const propostaId = caminho.split('/')[1];
        if (!gateAtivo(propostaId)) throw erro('permission-denied', 'gate ausente ou expirado');
        const dados = store.publicas[propostaId];
        trace.publicReadKeys.push(Object.keys(dados || {}).sort());
        return docSnapshot(alvo, dados);
      }
      return docSnapshot(alvo, dadosNoCaminho(caminho));
    };

    function resolver(valor, anterior) {
      if (valor?.__op === 'serverTimestamp') return '2026-08-24T15:00:00.000Z';
      if (valor?.__op === 'increment') return Number(anterior || 0) + valor.quantidade;
      if (valor?.__op === 'arrayUnion') {
        const base = Array.isArray(anterior) ? clone(anterior) : [];
        for (const item of valor.items || []) if (!base.some(existente => assinatura(existente) === assinatura(item))) base.push(clone(item));
        return base;
      }
      if (Array.isArray(valor)) return valor.map(item => resolver(item));
      if (valor && typeof valor === 'object') {
        return Object.fromEntries(Object.entries(valor).map(([k, item]) => [k, resolver(item, anterior?.[k])]));
      }
      return clone(valor);
    }
    function mesclar(anterior, dados, merge) {
      const base = merge ? clone(anterior || {}) : {};
      for (const [chave, valor] of Object.entries(dados || {})) base[chave] = resolver(valor, anterior?.[chave]);
      return base;
    }
    function gravarCaminho(caminho, dados, merge) {
      const partes = caminho.split('/');
      if (partes[0] === 'negocios') store.negocios[partes[1]] = mesclar(store.negocios[partes[1]], dados, merge);
      else if (partes[0] === 'propostas_portal_publicas') store.publicas[partes[1]] = mesclar(store.publicas[partes[1]], dados, merge);
      else throw erro('permission-denied', 'write fora do contrato V111: ' + caminho);
    }

    window.setDoc = async function setDoc(alvo, dados, opcoes = {}) {
      const caminho = caminhoRef(alvo);
      trace.writeAttempts.push({ tipo: 'set', caminho, dados: clone(dados) });
      trace.events.push({ tipo: 'write-attempt', caminho });
      const match = caminho.match(/^sessoes_cliente\/([^/]+)\/liberacoes_proposta\/([^/]+)$/);
      if (!match) throw erro('permission-denied', 'set direto fora do gate');
      const [, uidAlvo, propostaId] = match;
      const verificador = store.verificadores[propostaId];
      const valido = uidAlvo === uid && dados?.clienteSlug === slug && dados?.propostaId === propostaId &&
        dados?.sessaoAbertaEm === sessao.abertaEm && String(dados?.pin4 || '') === String(verificador?.pin4 || '') &&
        verificador?.clienteSlug === slug && verificador?.visivel === true;
      if (!valido) throw erro('permission-denied', 'PIN ou sessão inválidos');
      store.gates[uid + '/' + propostaId] = mesclar(store.gates[uid + '/' + propostaId], {
        ...dados, liberadoEm: dados?.liberadoEm || serverTimestamp(), schemaVersion: 1,
      }, opcoes?.merge === true);
      trace.writes.push({ tipo: 'set', caminho });
      trace.events.push({ tipo: 'write', caminho });
      persistir();
    };
    window.deleteDoc = async function deleteDoc(alvo) {
      const caminho = caminhoRef(alvo);
      trace.writeAttempts.push({ tipo: 'delete', caminho });
      trace.events.push({ tipo: 'write-attempt', caminho });
      const match = caminho.match(/^sessoes_cliente\/([^/]+)\/liberacoes_proposta\/([^/]+)$/);
      if (!match || match[1] !== uid) throw erro('permission-denied', 'delete fora da própria sessão');
      delete store.gates[uid + '/' + match[2]];
      trace.writes.push({ tipo: 'delete', caminho });
      trace.events.push({ tipo: 'write', caminho });
      persistir();
    };

    window.runTransaction = async function runTransaction(_db, callback) {
      const executar = async () => {
        let tentativas = 0;
        while (true) {
          tentativas += 1;
          const pendentes = [];
          const tx = {
            get: alvo => getDoc(alvo),
            update: (alvo, dados) => pendentes.push({ tipo: 'update', caminho: caminhoRef(alvo), dados: clone(dados), merge: true }),
            set: (alvo, dados, opcoes = {}) => pendentes.push({ tipo: 'set', caminho: caminhoRef(alvo), dados: clone(dados), merge: opcoes?.merge === true }),
          };
          const resultado = await callback(tx);
          if (retryBudget > 0) { retryBudget -= 1; continue; }
          const idsCanonicos = new Set(pendentes.filter(w => w.caminho.startsWith('negocios/')).map(w => w.caminho.split('/')[1]));
          const idsPublicos = new Set(pendentes.filter(w => w.caminho.startsWith('propostas_portal_publicas/')).map(w => w.caminho.split('/')[1]));
          for (const id of new Set([...idsCanonicos, ...idsPublicos])) {
            if (!idsCanonicos.has(id) || !idsPublicos.has(id)) throw erro('failed-precondition', 'commit não atômico para ' + id);
          }
          for (const write of pendentes) gravarCaminho(write.caminho, write.dados, write.merge);
          trace.transactions.push({ tentativas, caminhos: pendentes.map(w => w.caminho), writes: clone(pendentes) });
          trace.writes.push(...pendentes.map(w => ({ tipo: w.tipo, caminho: w.caminho })));
          persistir();
          return resultado;
        }
      };
      const promessa = txQueue.then(executar, executar);
      txQueue = promessa.catch(() => undefined);
      return promessa;
    };
    window.updateDoc = async function updateDoc() { throw erro('failed-precondition', 'updateDoc direto proibido no contrato V111'); };

    window.meusDocs = function meusDocs(colecao, campo) {
      return getDocs(query(collection(db, colecao), where(campo || 'cliente', '==', clienteAtual.slug)));
    };
    window.acessoPortalFoiNegado = erro => String(erro?.code || erro?.message || '').toLowerCase().includes('permission-denied');
    window.so4Digitos = valor => String(valor || '').replace(/\D/g, '').slice(-4);
    window.esc = valor => String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    window.escAttr = valor => esc(valor).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    window.urlHttpsSeguraPortal = valor => {
      try { const url = new URL(String(valor || '').trim()); return url.protocol === 'https:' ? url.href : ''; }
      catch { return ''; }
    };
    window.dataLocalPortal = () => '2026-08-24';
    window.calcularEtapasProducao = async () => [];
    window.alertarEquipe = async (titulo, detalhe) => { trace.alerts.push({ tipo: 'equipe', titulo, detalhe }); };
    window.alert = mensagem => { trace.alerts.push({ tipo: 'alert', mensagem: String(mensagem || '') }); };
    window.confirm = () => true;
    window.prompt = () => '';
    window.mostrarToast = (mensagem, tipo) => { trace.alerts.push({ tipo: tipo || 'toast', mensagem: String(mensagem || '') }); };

    window.__fixtureV111 = {
      resetTrace() { trace.reads.length = 0; trace.writeAttempts.length = 0; trace.writes.length = 0; trace.transactions.length = 0; trace.alerts.length = 0; trace.publicReadKeys.length = 0; trace.events.length = 0; },
      trace: () => clone(trace),
      state: () => clone({ store, sessao, modo, ocultarIndiceA }),
      setMode(valor) { modo = String(valor || ''); },
      ocultarIndiceA(valor) { ocultarIndiceA = !!valor; },
      retryNextTransaction() { retryBudget += 1; },
      async readPublic(propostaId) { return getDoc(doc(db, 'propostas_portal_publicas', propostaId)); },
      clearGate(propostaId) { delete store.gates[uid + '/' + propostaId]; persistir(); },
      resetProposalA() {
        const inicial = storeInicial();
        store.negocios['prop-a'] = inicial.negocios['prop-a'];
        store.publicas['prop-a'] = inicial.publicas['prop-a'];
        persistir();
      },
    };
  })();
`;

const exporApi = String.raw`
  __sessaoPortalAbertaEm = window.__fixtureSessaoPortalAbertaEm;
  window.__apiV111 = {
    carregar: carregarPropostaCliente,
    liberar: window.liberarProposta,
    indices: buscarIndicesPropostaDoCliente,
    buscarLiberadas: buscarPropostasLiberadas,
    responder: atualizarRespostaPropostaProtegida,
    comprovante: salvarComprovanteProtegido,
    limpar: limparLiberacoesPropostaPortal,
    forcarId(id) { __propostasLiberadasIds.add(id); },
    estado() {
      return {
        ids: Array.from(__propostasLiberadasIds),
        liberada: typeof __propostaLiberada === 'undefined' ? __propostasLiberadasIds.size > 0 : __propostaLiberada,
      };
    },
  };
`;

const paginaHarness = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{--paper:#252628;--yellow:#ffbe1a;--red:#ef7e80;--green:#53b77d;--line:#444;color-scheme:dark}
  *{box-sizing:border-box}body{margin:0;background:#202123;color:#f5f5f5;font:15px system-ui;padding:16px}.wrap{max-width:760px;margin:auto}
  .card{background:#292a2d;border:1px solid #444;border-radius:14px;padding:18px;margin:10px 0}.field input{width:100%;padding:12px;margin-top:8px}
  .btn{background:#ffbe1a;color:#222;border-radius:10px;padding:10px}.secondary{background:#3a3b3f;color:#fff}.item{padding:10px;background:#202124;margin:8px 0}.sub,.meta,.empty{color:#b8b8bd}
</style></head><body><main class="wrap"><section id="painelProposta"></section></main>
<script>${bootstrapSintetico}</script><script>${blocoPropostaReal}\n${blocoRespostaProtegida}\n${blocoComprovanteProtegido}\n${exporApi}</script></body></html>`;

const servidor = http.createServer((req, res) => {
  if (req.url?.startsWith('/v111-portal')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(paginaHarness);
    return;
  }
  res.writeHead(404); res.end('not found');
});
await new Promise((resolve, reject) => {
  servidor.once('error', reject);
  servidor.listen(0, '127.0.0.1', resolve);
});
const endereco = servidor.address();
const baseUrl = `http://127.0.0.1:${endereco.port}/v111-portal`;

const navegador = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});

async function instalarPagina(contexto, { run, cliente = 'a', largura = 1280, altura = 850 }) {
  const page = await contexto.newPage({ viewport: { width: largura, height: altura } });
  const erros = [];
  page.on('pageerror', erro => erros.push(String(erro)));
  await page.goto(`${baseUrl}?run=${encodeURIComponent(run)}&cliente=${cliente}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => !!window.__apiV111 && !!window.__fixtureV111, null, { timeout: 5000 });
  } catch (erro) {
    throw new Error(`Harness V111 não inicializou: ${erros.join(' | ') || String(erro)}`);
  }
  return { page, erros };
}

async function executarFluxoPrincipal(page) {
  await page.evaluate(() => window.__fixtureV111.resetTrace());
  await page.evaluate(() => window.__apiV111.carregar());
  const antes = await page.evaluate(() => ({ trace: window.__fixtureV111.trace(), estado: window.__apiV111.estado(), texto: document.getElementById('painelProposta').innerText }));
  exigir(antes.trace.reads.length > 0 && antes.trace.reads.every(r => r.caminho === 'propostas_portal_indices'),
    'antes do PIN o Portal real consulta somente o índice estreito');
  exigir(!antes.trace.reads.some(r => r.caminho.startsWith('negocios/') || r.caminho.startsWith('propostas_portal_publicas/') || r.caminho.startsWith('propostas_portal_verificadores/')),
    'antes do PIN nenhum negócio, verificador ou projeção pública é lido');
  exigir(antes.estado.ids.length === 0 && !antes.texto.includes('R$ 1.234,00'),
    'valor da proposta não chega ao DOM bloqueado');

  await page.locator('#propDigitos').fill('0000');
  await page.evaluate(() => window.__fixtureV111.resetTrace());
  const retornoInvalido = await page.evaluate(async () => {
    try { await window.__apiV111.liberar(); return { erro: '' }; }
    catch (e) { return { erro: String(e?.code || e?.message || e) }; }
  });
  const invalido = await page.evaluate(() => ({ trace: window.__fixtureV111.trace(), estado: window.__apiV111.estado(), texto: document.getElementById('painelProposta').innerText }));
  exigir(!retornoInvalido.erro && invalido.estado.ids.length === 0,
    'PIN inválido recebe feedback controlado e não libera proposta');
  exigir(invalido.trace.writeAttempts.some(w => w.caminho.includes('/liberacoes_proposta/')) &&
    !invalido.trace.reads.some(r => r.caminho.startsWith('propostas_portal_publicas/')),
    'tentativa inválida falha no gate sem ler a projeção');

  await page.locator('#propDigitos').fill('2468');
  await page.evaluate(() => window.__fixtureV111.resetTrace());
  await page.evaluate(() => window.__apiV111.liberar());
  const valido = await page.evaluate(() => ({ trace: window.__fixtureV111.trace(), estado: window.__apiV111.estado(), texto: document.getElementById('painelProposta').innerText }));
  exigir(valido.trace.writes.some(w => w.caminho === 'sessoes_cliente/uid-cliente-a/liberacoes_proposta/prop-a') && valido.estado.ids.includes('prop-a'),
    'PIN válido cria gate determinístico na própria sessão');
  const posicaoGate = valido.trace.events.findIndex(evento => evento.tipo === 'write' && evento.caminho.includes('/liberacoes_proposta/'));
  const posicaoPublica = valido.trace.events.findIndex(evento => evento.tipo === 'read-get' && evento.caminho === 'propostas_portal_publicas/prop-a');
  exigir(posicaoGate >= 0 && posicaoPublica > posicaoGate && valido.texto.includes('R$ 1.234,00'),
    'somente depois do gate o Portal lê e renderiza a projeção pública');
  exigir(!valido.trace.reads.some(r => r.caminho.startsWith('negocios/') || r.caminho.startsWith('propostas_portal_verificadores/')) &&
    !valido.texto.includes('SEGREDO_INTERNO'),
    'PIN nunca exige leitura de WhatsApp/verificador nem expõe campo comercial interno');
  const chavesLidas = valido.trace.publicReadKeys.flat();
  exigir(chavesLidas.length > 0 && chavesLidas.every(chave => camposPublicosPermitidos.has(chave)),
    'snapshot entregue ao cliente contém somente a allowlist pública V111');

  const isolamento = await page.evaluate(async () => {
    try { await window.__fixtureV111.readPublic('prop-b'); return 'leu'; }
    catch (e) { return String(e?.code || e?.message || e); }
  });
  exigir(isolamento.includes('permission-denied'), 'cliente A não faz point-get da projeção do cliente B');

  await page.evaluate(() => { window.__fixtureV111.resetProposalA(); window.__fixtureV111.resetTrace(); });
  const respostaDupla = await page.evaluate(() => Promise.allSettled([
    window.__apiV111.responder('prop-a', 'aceita', ''),
    window.__apiV111.responder('prop-a', 'aceita', ''),
  ]).then(resultados => resultados.map(r => r.status)));
  const depoisResposta = await page.evaluate(() => ({ trace: window.__fixtureV111.trace(), state: window.__fixtureV111.state() }));
  const commitsResposta = depoisResposta.trace.transactions.filter(tx => tx.caminhos.length > 0);
  const historicoAceite = depoisResposta.state.store.negocios['prop-a'].historico.filter(evento => evento.estagio === 'aceita');
  exigir(respostaDupla.every(status => status === 'fulfilled') && historicoAceite.length === 1,
    'clique duplo na resposta converge para um único evento auditável');
  exigir(commitsResposta.length === 1 && commitsResposta[0].caminhos.includes('negocios/prop-a') && commitsResposta[0].caminhos.includes('propostas_portal_publicas/prop-a'),
    'resposta atualiza canônico e projeção no mesmo commit');
  exigir(depoisResposta.state.store.negocios['prop-a'].estagio === 'aceita' && depoisResposta.state.store.publicas['prop-a'].estagio === 'aceita',
    'estado da resposta permanece espelhado entre as duas fontes');

  await page.evaluate(() => { window.__fixtureV111.resetTrace(); window.__fixtureV111.retryNextTransaction(); });
  const comprovanteDuplo = await page.evaluate(() => Promise.allSettled([
    window.__apiV111.comprovante('prop-a', 'https://example.invalid/comprovante-a'),
    window.__apiV111.comprovante('prop-a', 'https://example.invalid/comprovante-a'),
  ]).then(resultados => resultados.map(r => r.status)));
  const depoisComprovante = await page.evaluate(() => ({ trace: window.__fixtureV111.trace(), state: window.__fixtureV111.state() }));
  const commitsComprovante = depoisComprovante.trace.transactions.filter(tx => tx.caminhos.length > 0);
  exigir(comprovanteDuplo.every(status => status === 'fulfilled') && commitsComprovante.length === 1 && commitsComprovante[0].tentativas === 2,
    'retry e clique duplo do comprovante convergem para um único commit');
  exigir(commitsComprovante[0].caminhos.includes('negocios/prop-a') && commitsComprovante[0].caminhos.includes('propostas_portal_publicas/prop-a'),
    'comprovante atualiza canônico e projeção atomicamente');
  exigir(depoisComprovante.state.store.negocios['prop-a'].pagamentoComprovante === 'https://example.invalid/comprovante-a' &&
    depoisComprovante.state.store.publicas['prop-a'].pagamentoComprovante === 'https://example.invalid/comprovante-a',
    'comprovante final fica idêntico nas duas fontes');

  const mutacoes = [...commitsResposta, ...commitsComprovante];
  exigir(mutacoes.every(tx => tx.caminhos.some(c => c.startsWith('negocios/')) && tx.caminhos.some(c => c.startsWith('propostas_portal_publicas/'))),
    'nenhuma mutação do cliente ocorre em apenas uma das fontes');
}

try {
  const contextoDesktop = await navegador.newContext();
  const desktop = await instalarPagina(contextoDesktop, { run: 'desktop', largura: 1280, altura: 850 });
  await executarFluxoPrincipal(desktop.page);

  await desktop.page.reload({ waitUntil: 'load' });
  await desktop.page.waitForFunction(() => !!window.__apiV111 && !!window.__fixtureV111);
  await desktop.page.evaluate(() => window.__fixtureV111.resetTrace());
  await desktop.page.evaluate(() => window.__apiV111.carregar());
  const recarga = await desktop.page.evaluate(() => ({ trace: window.__fixtureV111.trace(), texto: document.getElementById('painelProposta').innerText, sessao: window.__fixtureV111.state().sessao }));
  exigir(recarga.trace.reads.every(r => r.caminho === 'propostas_portal_indices') && !recarga.texto.includes('R$ 1.234,00'),
    'reload abre nova sessão/nonce e volta ao índice sem reutilizar liberação antiga');
  const gateAntigoNegado = await desktop.page.evaluate(async () => {
    try { await window.__fixtureV111.readPublic('prop-a'); return 'leu'; }
    catch (e) { return String(e?.code || e?.message || e); }
  });
  exigir(gateAntigoNegado.includes('permission-denied'), 'gate da sessão anterior não autoriza o novo nonce');

  await desktop.page.evaluate(() => { window.__fixtureV111.setMode('erro-indice'); window.__fixtureV111.resetTrace(); });
  const retornoErro = await desktop.page.evaluate(async () => {
    try { await window.__apiV111.carregar(); return ''; }
    catch (e) { return String(e?.code || e?.message || e); }
  });
  const textoErro = (await desktop.page.locator('#painelProposta').innerText()).toLowerCase();
  exigir(!retornoErro && (textoErro.includes('indispon') || textoErro.includes('não consegui')) && !textoErro.includes('nenhuma proposta'),
    'erro/timeout/permission-denied recebe estado indisponível, nunca vazio legítimo');

  await desktop.page.evaluate(() => { window.__fixtureV111.setMode(''); window.__fixtureV111.ocultarIndiceA(true); });
  await desktop.page.evaluate(() => window.__apiV111.carregar());
  const textoVazio = (await desktop.page.locator('#painelProposta').innerText()).toLowerCase();
  exigir(textoVazio.includes('nenhuma proposta') && !textoVazio.includes('indispon'),
    'vazio legítimo permanece distinto de indisponibilidade');
  exigir(desktop.erros.length === 0, 'jornada desktop termina com zero pageerror');
  await contextoDesktop.close();

  const contextoMobile = await navegador.newContext();
  const mobile = await instalarPagina(contextoMobile, { run: 'mobile', largura: 390, altura: 844 });
  await mobile.page.evaluate(() => window.__apiV111.carregar());
  await mobile.page.locator('#propDigitos').fill('2468');
  await mobile.page.evaluate(() => window.__apiV111.liberar());
  const mobileEstado = await mobile.page.evaluate(() => ({
    texto: document.getElementById('painelProposta').innerText,
    larguraDocumento: document.documentElement.scrollWidth,
    larguraViewport: innerWidth,
    trace: window.__fixtureV111.trace(),
  }));
  exigir(mobileEstado.texto.includes('R$ 1.234,00') && mobileEstado.trace.reads.some(r => r.caminho === 'propostas_portal_publicas/prop-a'),
    'fluxo protegido completo também funciona no viewport mobile');
  exigir(mobileEstado.larguraDocumento <= mobileEstado.larguraViewport + 1,
    'cartão protegido não cria rolagem horizontal no mobile');
  exigir(mobile.erros.length === 0, 'jornada mobile termina com zero pageerror');
  await contextoMobile.close();
} finally {
  await navegador.close();
  await new Promise(resolve => servidor.close(resolve));
}

if (falhas.length) {
  console.error(`REGRESSÃO V111 UI PROPOSTA SEGURA: REPROVADA (${total - falhas.length}/${total}; falhas: ${falhas.join(' | ')})`);
  process.exit(1);
}
console.log(`REGRESSÃO V111 UI PROPOSTA SEGURA: APROVADA (${total}/${total} verificações Chromium real)`);
