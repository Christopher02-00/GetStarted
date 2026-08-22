#!/usr/bin/env node

/*
 * Regressão de interface V103 — Financeiro por competência.
 *
 * Executa o HTML e os módulos financeiro-core/financeiro-ui reais em Chrome
 * headless. Firebase, relógio, identidade e dados são substituídos por um
 * banco estritamente sintético em memória. Abrir/renderizar telas deve causar
 * zero writes; as únicas gravações do ensaio partem de ações explícitas.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caminhoHtml = path.join(raiz, 'escritorio.html');
const caminhoCore = path.join(raiz, 'financeiro-core.mjs');
const caminhoUi = path.join(raiz, 'financeiro-ui-v103.mjs');
const fonteHtml = fs.readFileSync(caminhoHtml, 'utf8');
const fonteCore = fs.readFileSync(caminhoCore, 'utf8');
const fonteUi = fs.readFileSync(caminhoUi, 'utf8');
const hashesFonteInicial = {
  html: crypto.createHash('sha256').update(fonteHtml).digest('hex'),
  core: crypto.createHash('sha256').update(fonteCore).digest('hex'),
  ui: crypto.createHash('sha256').update(fonteUi).digest('hex'),
};
const estilosReais = [...fonteHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
const argumentoEvidencia = process.argv.find(arg => arg.startsWith('--evidence-dir='));
const evidencias = path.resolve(
  argumentoEvidencia?.slice('--evidence-dir='.length) ||
  process.env.GET_V103_UI_EVIDENCE_DIR ||
  fs.mkdtempSync('/private/tmp/get-v103-ui-financeiro-'),
);
fs.mkdirSync(evidencias, { recursive: true });

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

function sha256Arquivo(arquivo) {
  return crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex');
}

function trecho(inicio, fim) {
  const a = fonteHtml.indexOf(inicio);
  const b = fonteHtml.indexOf(fim, a + inicio.length);
  if (a < 0 || b < 0) throw new Error(`V103 UI: trecho real ausente: ${inicio}`);
  return fonteHtml.slice(a, b);
}

const viewsFinanceiras = trecho(
  '    <!-- VENDAS — MENSALIDADES E CONTRATOS -->',
  '    <div class="view" id="view-centralVendas">',
) + trecho(
  '    <div class="view" id="view-contratos">',
  '    <!-- ARQUIVO DE ENTREGAS',
);

function contrato(id, nome, { valor = 100, fim = '', programado = null } = {}) {
  return {
    id,
    canonicalId: id,
    cliente: id,
    clienteNome: `${nome} · fixture sintética`,
    primeiraCompetencia: '2026-08',
    valorInicial: valor,
    valorVigente: valor,
    valorCheio: valor,
    diaVencimento: 10,
    status: 'ativo',
    ultimaCompetenciaPagamento: fim,
    ...(programado ? {
      valorProgramado: programado.valor,
      valorProgramadoEm: programado.inicio,
      valorProgramadoMotivo: 'fixture de mudança por competência',
    } : {}),
  };
}

const contratos = [
  contrato('vitalle-odonto', 'Vitalle', { valor: 1500, programado: { valor: 1000, inicio: '2026-09' } }),
  ...Array.from({ length: 18 }, (_, i) => contrato(
    `cliente-sintetico-${String(i + 1).padStart(2, '0')}`,
    `Cliente Sintético ${String(i + 1).padStart(2, '0')}`,
  )),
  contrato('dra-monique', 'Dra. Monique', { valor: 2200, fim: '2026-08' }),
  contrato('joaquin-assados', 'Joaquim Assados', { valor: 900, fim: '2026-08' }),
  contrato('acougue-sao-joaquim', 'Açougue São Joaquim', { valor: 1100, fim: '2026-08' }),
];

// O alias arquivado vem antes do documento canônico de propósito. A ordem da
// coleção nunca pode fazê-lo reaparecer como ficha editável.
const contratoAliasArquivado = {
  ...contratos.find(v => v.id === 'cliente-sintetico-01'),
  id: 'apelido-arquivado-cliente-sintetico-01',
  canonicalId: 'cliente-sintetico-01',
  cliente: 'apelido-arquivado-cliente-sintetico-01',
  clienteNome: 'Alias arquivado · fixture sintética',
  status: 'arquivado',
  arquivado: true,
};
const contratosFisicos = [contratoAliasArquivado, ...contratos];

const pagamentosAgosto = contratos.filter(ct => ct.id !== 'cliente-sintetico-18').map((ct, i) => ({
  id: `${ct.id}_2026-08`,
  canonicalId: ct.id,
  cliente: ct.id,
  clienteNome: ct.clienteNome,
  competencia: '2026-08',
  valorDevido: ct.valorInicial,
  diaVencimento: 10,
  status: i === 1 ? 'aberto' : 'pago',
  // Firestore Timestamp realista pago em setembro, sem mudar a competência.
  pagoEm: i === 1 ? '' : i === 2 ? { __timestamp: '2026-09-05T15:00:00.000Z' } : '2026-08-10',
}));

const pagamentos = [
  ...pagamentosAgosto,
  {
    id: 'cliente-sintetico-03_2026-09', canonicalId: 'cliente-sintetico-03',
    cliente: 'cliente-sintetico-03', clienteNome: 'Cliente Sintético 03 · fixture sintética',
    competencia: '2026-09', valorDevido: 100, diaVencimento: 10,
    // Date nativo cobre a segunda forma aceita pelo núcleo além de Timestamp.
    status: 'pago', pagoEm: { __date: '2026-09-07T15:00:00.000Z' },
  },
  {
    id: 'cliente-sintetico-04_2026-09', canonicalId: 'cliente-sintetico-04',
    cliente: 'cliente-sintetico-04', clienteNome: 'Cliente Sintético 04 · fixture sintética',
    competencia: '2026-09', valorDevido: 100, diaVencimento: 10,
    status: 'isento', motivoIsencao: 'cortesia sintética',
  },
  {
    id: 'cliente-sintetico-05_2026-09', canonicalId: 'cliente-sintetico-05',
    cliente: 'cliente-sintetico-05', clienteNome: 'Cliente Sintético 05 · fixture sintética',
    competencia: '2026-09', valorDevido: 100, diaVencimento: 10,
    status: 'aberto', comprovante: 'https://fixture.invalid/comprovante-sintetico',
  },
  {
    id: 'cliente-sintetico-06_2026-09', canonicalId: 'cliente-sintetico-06',
    cliente: 'cliente-sintetico-06', clienteNome: 'Cliente Sintético 06 · fixture sintética',
    competencia: '2026-09', valorDevido: 100, diaVencimento: 10,
    status: 'aberto', ultimaCobranca: '2026-09-12T09:00:00-03:00', cobrancasFeitas: 1,
  },
  ...['dra-monique', 'joaquin-assados', 'acougue-sao-joaquim'].map(id => ({
    id: `${id}_2026-09`, canonicalId: id, cliente: id, competencia: '2026-09',
    valorDevido: contratos.find(ct => ct.id === id).valorInicial,
    diaVencimento: 10, status: 'cancelado', canceladoPorSaida: true,
  })),
];

const fixtureInicial = {
  contratos_cliente: Object.fromEntries(contratosFisicos.map(v => [v.id, v])),
  pagamentos_mensais: Object.fromEntries(pagamentos.map(v => [v.id, v])),
  clientes_encerrados: {
    'saida-dra-monique-2026-09': {
      slug: 'dra-monique', canonicalId: 'dra-monique', dataSaida: '2026-09-15',
      ultimaCompetenciaPagamento: '2026-08', statusSaida: 'programada', excluido: false,
    },
    'saida-joaquin-assados-2026-09': {
      slug: 'joaquin-assados', canonicalId: 'joaquin-assados', dataSaida: '2026-09-15',
      ultimaCompetenciaPagamento: '2026-08', statusSaida: 'programada', excluido: false,
    },
    'saida-acougue-sao-joaquim-2026-09': {
      slug: 'acougue-sao-joaquim', canonicalId: 'acougue-sao-joaquim', dataSaida: '2026-09-15',
      ultimaCompetenciaPagamento: '2026-08', statusSaida: 'programada', excluido: false,
    },
  },
  recebimentos_entrada_pessoal: {
    'entrada-agencia-sintetica': {
      status: 'pago', valorConfirmado: 300,
      pagoEm: { __timestamp: '2026-09-08T15:00:00.000Z' }, destino: 'conta_agencia',
    },
    'entrada-pessoal-sintetica': {
      status: 'pago', valorConfirmado: 900,
      pagoEm: { __date: '2026-09-08T15:00:00.000Z' }, destino: 'conta_pessoal',
    },
  },
  receitas_avulsas: {
    'receita-avulsa-sintetica': {
      recebido: true, valorRecebido: 200,
      recebidoEm: { __date: '2026-09-09T15:00:00.000Z' },
    },
  },
  financeiro_lancamentos: {
    'custo-fixo-sintetico': {
      schemaVersion: 1, competencia: '2026-09', tipo: 'custo_fixo',
      descricao: 'Custo fixo sintético', valor: 250, status: 'pago',
      dataCaixa: { __timestamp: '2026-09-12T12:00:00.000Z' },
      beneficiarioRef: 'fornecedor_sintetico', observacao: '', autorUid: 'uid-chris-sintetico',
      revision: 1, operationId: 'fin_fixture_custo_0001',
    },
    'custo-agosto-previsto': {
      schemaVersion: 1, competencia: '2026-08', tipo: 'despesa_operacional',
      descricao: 'Custo de agosto pago em setembro · fixture', valor: 400, status: 'previsto',
      dataCaixa: null, beneficiarioRef: 'fornecedor_sintetico', observacao: '',
      autorUid: 'uid-chris-sintetico', revision: 1, operationId: 'fin_fixture_custo_agosto_0001',
    },
  },
  clientes_ciclo_financeiro: {},
  contatos_clientes_financeiro: {
    zeiss: { slug: 'zeiss', nome: 'Zeiss · fixture sintética', whatsapp: '5511999999999' },
  },
};

const fixtureJson = JSON.stringify(fixtureInicial).replace(/</g, '\\u003c');

const htmlHarness = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
${estilosReais}
html,body{margin:0;max-width:100%;min-height:100%;overflow-x:clip!important;background:var(--bg,#202124);color:var(--fg,#f3f3f1)}
body{padding:64px 14px 24px}.fixtureMarcaV103{position:fixed;z-index:2147483647;top:7px;left:7px;right:7px;max-width:1160px;margin:auto;border:2px solid var(--yellow,#ffbc13);border-radius:10px;background:#141416;color:var(--yellow,#ffbc13);padding:9px 12px;font:900 11px/1.35 system-ui;letter-spacing:.065em;text-align:center}
.fixtureShellV103{width:min(1160px,100%);margin:0 auto}.view{display:none!important;position:static!important;width:100%!important;height:auto!important;min-height:0!important;overflow:visible!important}.view.fixtureAtiva{display:block!important}
@media(max-width:600px){body{padding:68px 7px 14px}.fixtureMarcaV103{font-size:9px}.fixtureShellV103{width:100%}.row2,.row3,.painelResumo{grid-template-columns:1fr!important}}
</style></head><body>
<div class="fixtureMarcaV103">FIXTURE SINTÉTICA V103 · FINANCEIRO POR COMPETÊNCIA · SEM FIREBASE REAL · SEM DADOS REAIS</div>
<main class="fixtureShellV103">${viewsFinanceiras}</main><div id="toast"></div>
<script>
window.__fixtureOriginal=${fixtureJson};
window.__usuarioV103='Chris';
window.__fixtureFalha='';
window.__fixtureWrites=[];
window.__fixtureReads=[];
window.__fixtureToasts=[];
window.__fixtureHoje='2026-09-12';
window.__fixtureGetDocFailure=null;
window.__db={path:''};

function __timestamp(iso){return {__iso:String(iso),toDate(){return new Date(this.__iso)},toString(){return 'Timestamp('+this.__iso+')'}}}
function __reviver(v){if(Array.isArray(v))return v.map(__reviver);if(v&&typeof v==='object'){if(v.__timestamp)return __timestamp(v.__timestamp);if(v.__date)return new Date(v.__date);const o={};for(const [k,x] of Object.entries(v))o[k]=__reviver(x);return o}return v}
function __persistir(v){if(v instanceof Date)return __timestamp(v.toISOString());if(v&&typeof v.toDate==='function')return __timestamp(v.toDate().toISOString());if(v&&v.__serverTimestamp)return __timestamp('2026-09-12T15:00:00.000Z');if(v&&v.__arrayUnion)return v.__arrayUnion;if(Array.isArray(v))return v.map(__persistir);if(v&&typeof v==='object'){const o={};for(const [k,x]of Object.entries(v))o[k]=__persistir(x);return o}return v}
function __clonar(v){if(v instanceof Date)return new Date(v.getTime());if(v&&typeof v.toDate==='function')return __timestamp(v.toDate().toISOString());if(Array.isArray(v))return v.map(__clonar);if(v&&typeof v==='object'){const o={};for(const [k,x]of Object.entries(v))o[k]=__clonar(x);return o}return v}
window.__resetFixture=()=>{window.__store=__reviver(window.__fixtureOriginal);window.__fixtureWrites=[];window.__fixtureReads=[];window.__fixtureFalha='';window.__fixtureToasts=[];window.__fixtureGetDocFailure=null;window.__cobrancasPreparadas={};window.__usuarioV103='Chris'};
window.__resetFixture();
window.__colecao=(ref)=>String(ref?.path||'').split('/')[0];
window.__registro=(ref)=>{const [c,id]=String(ref?.path||'').split('/');return {c,id}};
window.__snapDoc=(ref)=>{const {c,id}=__registro(ref);const existe=!!(c&&id&&Object.prototype.hasOwnProperty.call(__store[c]||{},id));return {id,ref,exists:()=>existe,data:()=>existe?__clonar(__store[c][id]):undefined}};
window.collection=(base,...partes)=>({type:'collection',path:[base===__db?'':base?.path||'',...partes.map(String)].filter(Boolean).join('/')});
window.doc=(base,...partes)=>{const path=[base===__db?'':base?.path||'',...partes.map(String)].filter(Boolean).join('/');return {type:'document',path,id:path.split('/').at(-1)||''}};
window.getDocs=async(ref)=>{const c=__colecao(ref);__fixtureReads.push(c);if(__fixtureFalha){const e=new Error(__fixtureFalha+' sintético');e.code=__fixtureFalha;throw e}const docs=Object.entries(__store[c]||{}).map(([id])=>__snapDoc({path:c+'/'+id,id}));return {docs,size:docs.length,empty:!docs.length,forEach(fn){docs.forEach(fn)}}};
window.getDoc=async(ref)=>{const falha=window.__fixtureGetDocFailure;if(falha&&falha.path===ref.path&&falha.remaining>0){falha.remaining-=1;throw new Error('falha pós-commit sintética')}return __snapDoc(ref)};
window.__aplicarSet=(ref,dados,opts={})=>{const {c,id}=__registro(ref);if(!__store[c])__store[c]={};const atual=__store[c][id]||{};__store[c][id]=opts?.merge?{...atual,...__persistir(dados)}:__persistir(dados);__fixtureWrites.push({path:ref.path,merge:opts?.merge===true})};
window.setDoc=async(ref,dados,opts)=>__aplicarSet(ref,dados,opts);
window.updateDoc=async(ref,dados)=>{if(!__snapDoc(ref).exists())throw new Error('not-found sintético');__aplicarSet(ref,dados,{merge:true})};
window.runTransaction=async(_db,fn)=>{const estagios=[];const tx={get:async ref=>__snapDoc(ref),set(ref,dados,opts){estagios.push({ref,dados,opts})},update(ref,dados){estagios.push({ref,dados,opts:{merge:true}})}};const retorno=await fn(tx);estagios.forEach(x=>__aplicarSet(x.ref,x.dados,x.opts));return retorno};
window.serverTimestamp=()=>({__serverTimestamp:true});
window.deleteField=()=>({__deleteField:true});
window.arrayUnion=(...itens)=>({__arrayUnion:itens.map(__persistir)});
window.slugClienteCanonico=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
window.hojeLocal=()=>window.__fixtureHoje;
window.brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
window.nomeMes=comp=>{const [a,m]=String(comp||'').split('-').map(Number);return a&&m?new Date(a,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}):String(comp||'')};
window.esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
window.escAttr=window.esc;window.escJs=v=>String(v??'').replace(/'/g,"\\\\'");
window.mostrarToast=(mensagem,tipo)=>__fixtureToasts.push({mensagem:String(mensagem||''),tipo:String(tipo||'')});
window.registrarLogAutomacao=async()=>{};
window.auth={currentUser:{uid:'uid-chris-sintetico'}};
window.confirm=()=>true;window.prompt=()=>null;
window.toggleFaixaDemandas=()=>{};window.salvarContrato=()=>{};
window.abrirCobranca=async id=>{const linha=window.__cobrancasV103?.[id];if(!linha?.materializada)return false;window.__cobrancasPreparadas[id]={cliente:linha.canonicalId,clienteNome:linha.clienteNome||'',fase:'fixture_vencida',preparadaEm:Date.now()};const botao=document.getElementById('confirmarCobranca_'+id);if(botao)botao.hidden=false;return true};
window.__ativarView=id=>{document.querySelectorAll('.view').forEach(v=>v.classList.remove('fixtureAtiva'));document.getElementById(id)?.classList.add('fixtureAtiva')};
</script>
<script type="module">
import { instalarFinanceiroV103 } from '/financeiro-ui-v103.mjs?v=103';
window.__financeiroInstalado=instalarFinanceiroV103({
  db:window.__db,collection:window.collection,doc:window.doc,getDocs:window.getDocs,getDoc:window.getDoc,
  setDoc:window.setDoc,updateDoc:window.updateDoc,runTransaction:window.runTransaction,
  serverTimestamp:window.serverTimestamp,deleteField:window.deleteField,arrayUnion:window.arrayUnion,
  slugClienteCanonico:window.slugClienteCanonico,hojeLocal:window.hojeLocal,brl:window.brl,nomeMes:window.nomeMes,
  esc:window.esc,escAttr:window.escAttr,escJs:window.escJs,mostrarToast:window.mostrarToast,
  usuarioAtual:()=>window.__usuarioV103,auth:window.auth,registrarLogAutomacao:window.registrarLogAutomacao,
});
window.__fixtureReady=true;
</script></body></html>`;

const servidor = http.createServer((req, res) => {
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
  if (pathname === '/financeiro-ui-v103.mjs') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(fonteUi);
    return;
  }
  res.writeHead(404); res.end('not found');
});

await new Promise((resolve, reject) => {
  servidor.once('error', reject);
  servidor.listen(0, '127.0.0.1', resolve);
});
const endereco = servidor.address();
const url = `http://127.0.0.1:${endereco.port}/fixture.html`;

exigir(fonteHtml.includes('2026-08-21-financeiro-por-competencia-v103'), 'HTML real identifica o build V103 financeiro por competência');
exigir(fonteHtml.includes('instalarFinanceiroV103({'), 'HTML real instala o módulo financeiro V103');
exigir(fonteHtml.includes('./financeiro-core.mjs?v=103') && fonteUi.includes("./financeiro-core.mjs?v=103"), 'HTML e UI usam o mesmo núcleo financeiro V103');
for (const id of ['finMes','mensMes','cobMes','ctMes','financeiroBox','mensalidadesBox','cobrancaBox','contratosBox']) {
  exigir(fonteHtml.includes(`id="${id}"`), `HTML real contém ${id}`);
}
const telefoneLiteralNoRuntime=/(?:whatsapp|telefone)\s*:\s*['"]\+?\d{10,14}['"]/i;
exigir(!telefoneLiteralNoRuntime.test(fonteHtml) && !telefoneLiteralNoRuntime.test(fonteUi), 'telefone financeiro não está hardcoded no pacote público');

const navegador = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});

function rotuloViewport(viewport) { return viewport.width <= 420 ? 'mobile' : 'desktop'; }

async function novaPagina(viewport) {
  const page = await navegador.newPage({ viewport });
  const pageerrors = [];
  page.on('pageerror', erro => pageerrors.push(String(erro)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__fixtureReady === true);
  return { page, pageerrors };
}

async function textoResumo(page, box, rotulo) {
  const card = page.locator(`${box} .resumoCard`).filter({ hasText: rotulo }).first();
  return (await card.locator('.num').innerText()).trim();
}

async function semOverflow(page, rotulo) {
  const medidas = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  exigir(medidas.scroll <= medidas.client + 1, `${rotulo}: zero overflow horizontal`);
}

async function selecionar(page, competencia, origem) {
  await page.evaluate(async ({ competencia, origem }) => {
    await window.sincronizarCompetenciaFinanceiraV103(competencia, origem);
  }, { competencia, origem });
}

async function renderTudo(page, competencia = '2026-09') {
  await page.evaluate(async competencia => {
    ['finMes','mensMes','cobMes','ctMes'].forEach(id => { document.getElementById(id).value = competencia; });
    await window.renderMensalidades();
    await window.renderCobranca();
    await window.renderFinanceiro();
    await window.renderContratos();
  }, competencia);
}

async function testarSuperficies(page, vp) {
  await renderTudo(page, '2026-09');
  const estado = await page.evaluate(async () => {
    const fontes = await window.__financeiroV103.carregarSnapshot();
    const agosto = window.__financeiroV103.projetar(fontes, '2026-08', { regua: false });
    const setembro = window.__financeiroV103.projetar(fontes, '2026-09', { regua: false });
    const setembroRegua = window.__financeiroV103.projetar(fontes, '2026-09', { regua: true });
    return {
      agostoAtivos: agosto.movimentos.totais.ativos,
      setembroAtivos: setembro.movimentos.totais.ativos,
      setembroSaidas: setembro.movimentos.totais.saidas,
      previsto: setembro.obrigacoes.totais.previsto,
      quitado: setembro.obrigacoes.totais.quitado,
      aberto: setembro.obrigacoes.totais.aberto,
      caixaAgencia: setembro.reconciliacao.caixa.totalAgencia,
      caixaFontes: {
        recorrenteAgencia: setembro.reconciliacao.caixa.recorrenteAgencia,
        entradasAgencia: setembro.reconciliacao.caixa.entradasAgencia,
        entradasPessoal: setembro.reconciliacao.caixa.entradasPessoal,
        avulsasAgencia: setembro.reconciliacao.caixa.avulsasAgencia,
      },
      tiposData: {
        mensalTimestamp: typeof window.__store.pagamentos_mensais['cliente-sintetico-02_2026-08']?.pagoEm?.toDate === 'function',
        mensalDate: window.__store.pagamentos_mensais['cliente-sintetico-03_2026-09']?.pagoEm instanceof Date,
        entradaTimestamp: typeof window.__store.recebimentos_entrada_pessoal['entrada-agencia-sintetica']?.pagoEm?.toDate === 'function',
        entradaDate: window.__store.recebimentos_entrada_pessoal['entrada-pessoal-sintetica']?.pagoEm instanceof Date,
        avulsaDate: window.__store.receitas_avulsas['receita-avulsa-sintetica']?.recebidoEm instanceof Date,
      },
      escritaCore: setembro.escritaExecutada,
      writes: window.__fixtureWrites.length,
      regua: {
        anterioresSomenteReais: setembroRegua.regua.anterioresVencidos.itens.every(v => v.materializada === true),
        historicoVirtualAusente: !setembroRegua.regua.anterioresVencidos.itens.some(v => v.canonicalId === 'cliente-sintetico-18'),
        comprovanteSeparado: setembroRegua.regua.comprovantesEmAnalise.itens.some(v => v.canonicalId === 'cliente-sintetico-05'),
        comprovanteForaDoMes: !setembroRegua.regua.competenciaSelecionada.itens.some(v => v.canonicalId === 'cliente-sintetico-05'),
      },
      valores: {
        vitalleAgo: agosto.obrigacoes.linhas.find(v => v.canonicalId === 'vitalle-odonto')?.valorDevido,
        vitalleSet: setembro.obrigacoes.linhas.find(v => v.canonicalId === 'vitalle-odonto')?.valorDevido,
      },
    };
  });
  exigir(estado.agostoAtivos === 22, `${vp}: agosto mostra 22 clientes ativos`);
  exigir(estado.setembroAtivos === 19 && estado.setembroSaidas === 3, `${vp}: setembro mostra 19 ativos e três saídas`);
  exigir(estado.valores.vitalleAgo === 1500 && estado.valores.vitalleSet === 1000, `${vp}: Vitalle preserva 1500 em agosto e usa 1000 em setembro`);
  exigir(estado.previsto === estado.quitado + estado.aberto, `${vp}: previsto = quitado + aberto na projeção única`);
  exigir(estado.escritaCore === false && estado.writes === 0, `${vp}: render das quatro superfícies causa zero writes`);
  exigir(Object.values(estado.tiposData).every(Boolean), `${vp}: fixture entrega Timestamp e Date reais para mensalidade, entrada e receita avulsa`);
  exigir(
    estado.caixaFontes.recorrenteAgencia === 200 &&
    estado.caixaFontes.entradasAgencia === 300 &&
    estado.caixaFontes.entradasPessoal === 900 &&
    estado.caixaFontes.avulsasAgencia === 200,
    `${vp}: caixa classifica mensalidades, entrada e avulsa pelo mês civil da data real`,
  );

  const esperado = await page.evaluate(v => window.brl(v), estado.previsto);
  const mensPrevisto = await textoResumo(page, '#mensalidadesBox', 'Previsto');
  const finPrevisto = await textoResumo(page, '#financeiroBox', 'Receita recorrente prevista');
  exigir(mensPrevisto === esperado && finPrevisto === esperado, `${vp}: Mensalidades e Financeiro exibem o mesmo previsto`);
  const mensQuitado = await textoResumo(page, '#mensalidadesBox', 'Quitado da competência');
  const finQuitado = await textoResumo(page, '#financeiroBox', 'Quitado da competência');
  const mensAberto = await textoResumo(page, '#mensalidadesBox', 'Em aberto da competência');
  const finAberto = await textoResumo(page, '#financeiroBox', 'Em aberto da competência');
  exigir(mensQuitado === finQuitado && mensAberto === finAberto, `${vp}: quitado e aberto reconciliam entre superfícies`);

  const contratosTexto = await page.locator('#contratosBox').innerText();
  exigir(!contratosTexto.includes('MRR/previsto') && !contratosTexto.includes('Quitado da competência') && !contratosTexto.includes('Em aberto da competência'), `${vp}: Contratos não expõe MRR, pagamentos ou caixa`);
  exigir(contratosTexto.includes('Valores recebidos, caixa, custos e contatos privados não são carregados nesta tela'), `${vp}: Contratos explica sua fronteira de privacidade`);
  exigir(contratosTexto.includes('Dra. Monique') && contratosTexto.includes('Joaquim Assados') && contratosTexto.includes('Açougue São Joaquim'), `${vp}: saídas distintas aparecem sem fusão`);
  const ativosNomes = await page.locator('#contratosBox [data-faixa^="ct_"] .faixaHead').allInnerTexts();
  exigir(ativosNomes.length === 19, `${vp}: Contratos renderiza 19 fichas vigentes com data-faixa compatível`);
  exigir(!ativosNomes.some(v => /Monique|Joaquim Assados|Açougue São Joaquim/.test(v)), `${vp}: Monique, Joaquim e Açougue ficam fora da carteira de setembro`);
  exigir(await page.locator('#contratosBox [data-faixa="ct_vitalle-odonto"]').count() === 1, `${vp}: compatibilidade data-faixa ct_<slug> preservada`);
  exigir(await page.locator('#contratosBox [data-faixa="ct_cliente-sintetico-01"]').count() === 1, `${vp}: documento canônico vence o alias arquivado na ficha editável`);
  exigir(await page.locator('#contratosBox [data-faixa="ct_apelido-arquivado-cliente-sintetico-01"]').count() === 0, `${vp}: alias arquivado nunca recebe ficha nem botão de salvar`);
  exigir(!(await page.locator('#contratosBox').innerText()).includes('Alias arquivado'), `${vp}: alias arquivado não reaparece pelo nome no DOM`);
  const primeiraCompetencia = await page.evaluate(() => {
    const campo = document.getElementById('ctPrimeiraCompetencia_cliente-sintetico-01');
    return { readonly: campo?.readOnly === true, aria: campo?.getAttribute('aria-readonly'), valor: campo?.value };
  });
  exigir(primeiraCompetencia.readonly && primeiraCompetencia.aria === 'true' && primeiraCompetencia.valor === '2026-08', `${vp}: primeira competência é histórica e readonly`);
  const statusContrato = await page.evaluate(() => ({
    tipo: document.getElementById('ctStatus_vitalle-odonto')?.type || '',
    editaveis: document.querySelectorAll('#contratosBox [id^="ctStatus_"]:not([type="hidden"])').length,
    orientacao: document.getElementById('contratosBox')?.textContent.includes('entradas e saídas são alteradas somente pela Central') || false,
  }));
  exigir(statusContrato.tipo === 'hidden' && statusContrato.editaveis === 0 && statusContrato.orientacao, `${vp}: situação do ciclo não é editável em Contratos`);
  
  const reguaTexto = await page.locator('#cobrancaBox').innerText();
  exigir(reguaTexto.includes('Atrasados de competências anteriores') && reguaTexto.includes('Competência selecionada') && reguaTexto.includes('Próxima competência'), `${vp}: Régua separa passado, competência e próxima previsão`);
  exigir(reguaTexto.includes('Cliente Sintético 01') && reguaTexto.includes('agosto de 2026'), `${vp}: atraso anterior preserva sua competência`);
  exigir(estado.regua.anterioresSomenteReais && estado.regua.historicoVirtualAusente, `${vp}: Régua exclui obrigação virtual do histórico e cobra apenas documento real anterior`);
  exigir(estado.regua.comprovanteSeparado && estado.regua.comprovanteForaDoMes && reguaTexto.includes('Comprovantes aguardando conferência'), `${vp}: comprovante pendente fica separado da fila de cobrança`);
  exigir((await textoResumo(page, '#cobrancaBox', 'Comprovantes em análise')) === '1', `${vp}: Régua contabiliza um comprovante sintético em análise`);
  exigir(reguaTexto.includes('Cliente Sintético 06') && reguaTexto.includes('cobrado hoje'), `${vp}: cobrança já confirmada hoje recebe selo e sai dos acionáveis`);
  exigir(reguaTexto.includes('Previsão somente leitura; nenhuma cobrança é criada antes da competência.'), `${vp}: próxima competência não oferece ação de cobrança`);

  const leiturasContratos = await page.evaluate(async () => {
    window.__fixtureReads = [];
    window.__financeiroV103.invalidar();
    await window.renderContratos();
    return [...window.__fixtureReads];
  });
  exigir(leiturasContratos.length === 2 && leiturasContratos.includes('contratos_cliente') && leiturasContratos.includes('clientes_encerrados'), `${vp}: Contratos lê somente contratos e saídas, inclusive para Chris`);

  await selecionar(page, '2026-08', 'contratos');
  const seletoresAgo = await page.evaluate(() => ['finMes','mensMes','cobMes','ctMes'].map(id => document.getElementById(id).value));
  exigir(seletoresAgo.every(v => v === '2026-08'), `${vp}: seletor de Contratos sincroniza as quatro superfícies`);
  exigir((await textoResumo(page, '#contratosBox', 'Ativos em')) === '22', `${vp}: retrato compartilhado volta a 22 ativos em agosto`);
  await page.evaluate(() => window.mudarMesContratosV103(1));
  await page.waitForFunction(() => document.getElementById('ctMes').value === '2026-09');
  const seletoresSet = await page.evaluate(() => ['finMes','mensMes','cobMes','ctMes'].map(id => document.getElementById(id).value));
  exigir(seletoresSet.every(v => v === '2026-09'), `${vp}: avanço de mês mantém competência compartilhada`);
  exigir((await textoResumo(page, '#contratosBox', 'Ativos em')) === '19', `${vp}: retorno a setembro restaura 19 ativos`);

  const caixa = await page.locator('#financeiroBox').innerText();
  const entradaEsperada = await page.evaluate(v => window.brl(v), estado.caixaAgencia);
  exigir(caixa.includes(`${entradaEsperada} entradas`), `${vp}: caixa usa a data real, inclusive pagamento tardio de agosto`);
  const custoPago = await textoResumo(page, '#financeiroLancamentosBox', 'Custos pagos no caixa');
  exigir(custoPago === await page.evaluate(() => window.brl(250)), `${vp}: custo pago com Timestamp entra no caixa pela data real`);
  const caixaLiquido = await textoResumo(page, '#financeiroBox', 'Caixa líquido pela data real');
  exigir(caixaLiquido === await page.evaluate(v => window.brl(v), estado.caixaAgencia - 250), `${vp}: caixa líquido desconta custos pagos do mês`);
}

async function testarErrosConflitosAcoes(page, vp) {
  await page.evaluate(() => { window.__financeiroV103.invalidar(); window.__fixtureFalha = 'permission-denied'; });
  exigir(await page.evaluate(() => window.renderMensalidades()) === false, `${vp}: permission-denied bloqueia Mensalidades`);
  exigir((await page.locator('#mensalidadesBox').innerText()).includes('Mensalidades indisponíveis'), `${vp}: permissão negada não vira zero nem vazio`);
  await page.evaluate(() => { window.__financeiroV103.invalidar(); window.__fixtureFalha = 'deadline-exceeded'; });
  exigir(await page.evaluate(() => window.renderFinanceiro()) === false, `${vp}: timeout bloqueia Financeiro`);
  exigir((await page.locator('#financeiroBox').innerText()).includes('Nenhum total foi zerado ou inferido'), `${vp}: timeout não cria total zero`);
  await page.evaluate(() => { window.__financeiroV103.invalidar(); window.__fixtureFalha = ''; });

  await page.evaluate(() => {
    window.__store.pagamentos_mensais['duplicata-fisica-sintetica'] = {
      cliente: 'cliente-sintetico-03', canonicalId: 'cliente-sintetico-03', competencia: '2026-09',
      valorDevido: 999, diaVencimento: 10, status: 'aberto',
    };
    window.__financeiroV103.invalidar();
  });
  await page.evaluate(() => window.renderMensalidades());
  const conflito = await page.locator('#mensalidadesBox').innerText();
  exigir(conflito.includes('conflito(s) bloqueiam parte dos totais') && conflito.includes('PAGAMENTO_DUPLICADO_DIVERGENTE'), `${vp}: duplicata física divergente bloqueia em vez de escolher silenciosamente`);
  exigir(!conflito.includes('R$ 999,00'), `${vp}: valor divergente não entra nos totais nem vira ação`);
  await page.evaluate(() => {
    delete window.__store.pagamentos_mensais['duplicata-fisica-sintetica'];
    window.__store.pagamentos_mensais['cliente-sintetico-07_2026-09'] = {
      cliente: 'cliente-sintetico-07', canonicalId: 'cliente-sintetico-07', competencia: '2026-09',
      valorDevido: 100, diaVencimento: 10, status: 'estado-desconhecido',
    };
    window.__store.pagamentos_mensais['cliente-sintetico-08_2026-09'] = {
      cliente: 'cliente-sintetico-08', canonicalId: 'cliente-sintetico-08', competencia: '2026-09',
      valorDevido: 'valor-inválido', diaVencimento: 10, status: 'aberto',
    };
    window.__financeiroV103.invalidar();
  });
  await page.evaluate(() => window.renderMensalidades());
  const falhaFechada = await page.locator('#mensalidadesBox').innerText();
  const linhasInvalidas = await page.evaluate(() => ({
    status: window.__mensalidadesV103?.['cliente-sintetico-07_2026-09'],
    valor: window.__mensalidadesV103?.['cliente-sintetico-08_2026-09'],
  }));
  exigir(falhaFechada.includes('PAGAMENTO_STATUS_INVALIDO') && falhaFechada.includes('PAGAMENTO_VALOR_INVALIDO'), `${vp}: estado e valor desconhecidos falham fechados com códigos distintos`);
  exigir(!linhasInvalidas.status && !linhasInvalidas.valor && !falhaFechada.includes('NaN'), `${vp}: mensalidades inválidas não viram linha acionável nem total inventado`);
  await page.evaluate(() => {
    delete window.__store.pagamentos_mensais['cliente-sintetico-07_2026-09'];
    delete window.__store.pagamentos_mensais['cliente-sintetico-08_2026-09'];
    window.__financeiroV103.invalidar();
    window.__fixtureWrites = [];
  });

  await page.evaluate(() => window.renderCobranca());
  const vitalleVirtual = await page.evaluate(() => window.__cobrancasV103['vitalle-odonto_2026-09']);
  exigir(vitalleVirtual?.materializada === false && vitalleVirtual?.valorDevido === 1000, `${vp}: Régua mostra a obrigação virtual da Vitalle sem documento`);
  exigir(await page.evaluate(() => window.__fixtureWrites.length) === 0, `${vp}: render da Régua com obrigação virtual causa zero writes`);
  const materializouCobranca = await page.evaluate(() => window.materializarCobrancaV103('vitalle-odonto_2026-09'));
  exigir(materializouCobranca === true, `${vp}: clique próprio cria a cobrança do mês explicitamente`);
  const cobrancaMaterializada = await page.evaluate(() => ({
    doc: window.__store.pagamentos_mensais['vitalle-odonto_2026-09'],
    writes: window.__fixtureWrites.map(v => v.path),
  }));
  exigir(cobrancaMaterializada.doc?.status === 'aberto' && cobrancaMaterializada.doc?.valorDevido === 1000, `${vp}: materialização preserva valor da competência sem fingir pagamento`);
  exigir(cobrancaMaterializada.writes.includes('pagamentos_mensais/vitalle-odonto_2026-09'), `${vp}: documento nasce somente depois da ação Criar cobrança`);

  const preparo = await page.evaluate(async () => {
    const writesAntes = window.__fixtureWrites.length;
    const abriu = await window.abrirCobranca('vitalle-odonto_2026-09');
    return {
      abriu,
      writesAntes,
      writesDepois: window.__fixtureWrites.length,
      preparada: !!window.__cobrancasPreparadas?.['vitalle-odonto_2026-09'],
      confirmarVisivel: !document.getElementById('confirmarCobranca_vitalle-odonto_2026-09')?.hidden,
    };
  });
  exigir(preparo.abriu && preparo.preparada && preparo.confirmarVisivel, `${vp}: abrir conversa revela a confirmação explícita de envio`);
  exigir(preparo.writesAntes === preparo.writesDepois, `${vp}: abrir conversa não registra cobrança automaticamente`);
  exigir(await page.evaluate(() => window.confirmarEnvioCobrancaV103('vitalle-odonto_2026-09')) === true, `${vp}: confirmar envio grava recibo da cobrança`);
  const cobrancaConfirmada = await page.evaluate(() => ({
    doc: window.__store.pagamentos_mensais['vitalle-odonto_2026-09'],
    writes: window.__fixtureWrites.length,
    texto: document.getElementById('cobrancaBox')?.textContent || '',
  }));
  exigir(cobrancaConfirmada.doc?.ultimaCobranca?.slice(0, 10) === '2026-09-12' && cobrancaConfirmada.doc?.cobrancasFeitas === 1, `${vp}: recibo guarda data civil e contador da cobrança`);
  exigir(cobrancaConfirmada.texto.includes('cobrado hoje'), `${vp}: Régua mostra cobrado hoje após confirmação`);
  const retryCobranca = await page.evaluate(async () => {
    await window.abrirCobranca('vitalle-odonto_2026-09');
    const antes = window.__fixtureWrites.length;
    const ok = await window.confirmarEnvioCobrancaV103('vitalle-odonto_2026-09');
    return { ok, antes, depois: window.__fixtureWrites.length, contador: window.__store.pagamentos_mensais['vitalle-odonto_2026-09'].cobrancasFeitas };
  });
  exigir(retryCobranca.ok && retryCobranca.antes === retryCobranca.depois && retryCobranca.contador === 1, `${vp}: retry da confirmação é idempotente e não duplica cobrança`);

  await page.evaluate(() => { window.__fixtureWrites = []; window.__financeiroV103.invalidar(); return window.renderMensalidades(); });
  const mensalidadeVirtual = await page.evaluate(() => window.__mensalidadesV103['cliente-sintetico-07_2026-09']);
  exigir(mensalidadeVirtual?.materializada === false && mensalidadeVirtual?.valorDevido === 100, `${vp}: Mensalidades mantém outra obrigação virtual sem write`);
  const materializouPagamento = await page.evaluate(() => window.marcarMensalidadeV103('cliente-sintetico-07_2026-09', 'pago'));
  exigir(materializouPagamento === true, `${vp}: Recebi é outra ação explícita que materializa`);
  const pagamentoMaterializado = await page.evaluate(() => ({
    doc: window.__store.pagamentos_mensais['cliente-sintetico-07_2026-09'],
    writes: window.__fixtureWrites.map(v => v.path),
  }));
  exigir(pagamentoMaterializado.doc?.status === 'pago' && pagamentoMaterializado.doc?.valorDevido === 100, `${vp}: materialização de Recebi preserva valor e confirma status`);
  exigir(pagamentoMaterializado.writes.includes('pagamentos_mensais/cliente-sintetico-07_2026-09'), `${vp}: Recebi grava somente seu documento canônico`);

  await page.evaluate(() => {
    document.getElementById('finLancTipo').value = 'salario';
    document.getElementById('finLancDescricao').value = 'Salário sintético da equipe';
    document.getElementById('finLancValor').value = '500';
    document.getElementById('finLancStatus').value = 'pago';
    document.getElementById('finLancData').value = '2026-09-20';
    document.getElementById('finLancBeneficiario').value = 'equipe_sintetica';
    document.getElementById('finLancObs').value = 'fixture sem pessoa real';
  });
  exigir(await page.evaluate(() => window.salvarLancamentoFinanceiroV103()) === true, `${vp}: salário explícito grava lançamento e evento atômicos`);
  const lancamentos = await page.evaluate(() => ({
    principais: Object.values(window.__store.financeiro_lancamentos).filter(v => v.tipo === 'salario'),
    eventos: Object.values(window.__store.clientes_ciclo_financeiro).filter(v => v.sourceType === 'financeiro_lancamento'),
  }));
  exigir(lancamentos.principais.length === 1 && lancamentos.eventos.length === 1, `${vp}: salário possui um principal e um recibo de ciclo`);
  exigir((await page.locator('#financeiroLancamentosBox').innerText()).includes('Salário sintético da equipe'), `${vp}: salário salvo reaparece na interface`);
}

async function testarContratoWriterECaixa(page, vp) {
  await page.evaluate(async () => {
    window.__resetFixture();
    ['finMes','mensMes','cobMes','ctMes'].forEach(id => { document.getElementById(id).value = '2026-09'; });
    window.__financeiroV103.invalidar();
    await window.renderContratos();
  });

  const identidadeInicial = await page.evaluate(() => ({
    canonico: document.querySelectorAll('[data-faixa="ct_cliente-sintetico-01"]').length,
    alias: document.querySelectorAll('[data-faixa="ct_apelido-arquivado-cliente-sintetico-01"]').length,
    primeiraReadonly: document.getElementById('ctPrimeiraCompetencia_cliente-sintetico-01')?.readOnly === true,
    primeira: document.getElementById('ctPrimeiraCompetencia_cliente-sintetico-01')?.value,
  }));
  exigir(identidadeInicial.canonico === 1 && identidadeInicial.alias === 0, `${vp}: writer oferece somente o contrato físico canônico, nunca o alias arquivado`);
  exigir(identidadeInicial.primeiraReadonly && identidadeInicial.primeira === '2026-08', `${vp}: writer recebe primeira competência readonly`);

  const salvamentoCanonico = await page.evaluate(async () => {
    document.getElementById('ctPrimeiraCompetencia_cliente-sintetico-01').value = '2020-01';
    document.getElementById('ctDia_cliente-sintetico-01').value = '17';
    document.getElementById('ctObs_cliente-sintetico-01').value = 'ajuste cadastral canônico sintético';
    window.__fixtureWrites = [];
    const ok = await window.salvarContrato('cliente-sintetico-01');
    const contrato = window.__store.contratos_cliente['cliente-sintetico-01'];
    const alias = window.__store.contratos_cliente['apelido-arquivado-cliente-sintetico-01'];
    const pagamentoHistorico = window.__store.pagamentos_mensais['cliente-sintetico-01_2026-08'];
    const evento = window.__store.clientes_ciclo_financeiro[contrato.financeiroOperationId];
    return {
      ok,
      contrato: { primeiraCompetencia: contrato.primeiraCompetencia, diaVencimento: contrato.diaVencimento, revision: contrato.financeiroRevision, operationId: contrato.financeiroOperationId },
      alias: { primeiraCompetencia: alias.primeiraCompetencia, diaVencimento: alias.diaVencimento, observacao: alias.observacao || '' },
      historicoDia: pagamentoHistorico.diaVencimento,
      evento: evento ? { sourceId: evento.sourceId, operationId: evento.operationId, sourceType: evento.sourceType } : null,
      writes: window.__fixtureWrites.map(v => v.path),
    };
  });
  exigir(salvamentoCanonico.ok, `${vp}: edição explícita do contrato canônico confirma`);
  exigir(salvamentoCanonico.contrato.primeiraCompetencia === '2026-08' && salvamentoCanonico.contrato.diaVencimento === 17, `${vp}: primeira competência maliciosamente alterada no DOM é ignorada, mas o cadastro permitido é salvo`);
  exigir(salvamentoCanonico.historicoDia === 10, `${vp}: vencimento da mensalidade histórica anterior não é reescrito`);
  exigir(salvamentoCanonico.alias.primeiraCompetencia === '2026-08' && salvamentoCanonico.alias.diaVencimento === 10 && salvamentoCanonico.alias.observacao === '', `${vp}: alias arquivado permanece byte-lógico sem edição`);
  exigir(!salvamentoCanonico.writes.some(v => v.includes('apelido-arquivado')), `${vp}: nenhuma escrita aponta para o alias arquivado`);
  exigir(salvamentoCanonico.evento?.sourceId === 'cliente-sintetico-01' && salvamentoCanonico.evento?.operationId === salvamentoCanonico.contrato.operationId && salvamentoCanonico.evento?.sourceType === 'contrato', `${vp}: ajuste canônico possui recibo ligado à mesma operação`);

  await page.evaluate(async () => {
    const nome = window.__store.contratos_cliente['cliente-sintetico-10'].clienteNome;
    const base = { canonicalId: 'cliente-sintetico-10', cliente: 'cliente-sintetico-10', clienteNome: nome, valorDevido: 100, diaVencimento: 10 };
    window.__store.pagamentos_mensais['cliente-sintetico-10_2026-08'] = { ...base, id: 'cliente-sintetico-10_2026-08', competencia: '2026-08', status: 'aberto', diaVencimento: 7 };
    window.__store.pagamentos_mensais['cliente-sintetico-10_2026-09'] = { ...base, id: 'cliente-sintetico-10_2026-09', competencia: '2026-09', status: 'aberto' };
    window.__store.pagamentos_mensais['cliente-sintetico-10_2026-10'] = { ...base, id: 'cliente-sintetico-10_2026-10', competencia: '2026-10', status: 'aberto', valor: 100, valorCobrado: 100 };
    window.__store.pagamentos_mensais['cliente-sintetico-10_2026-11'] = { ...base, id: 'cliente-sintetico-10_2026-11', competencia: '2026-11', status: 'isento', valor: 100 };
    window.__store.pagamentos_mensais['cliente-sintetico-10_2026-12'] = { ...base, id: 'cliente-sintetico-10_2026-12', competencia: '2026-12', status: 'pago', pagoEm: '2026-12-10', operationId: 'fin_pago_original' };
    window.__store.pagamentos_mensais['cliente-sintetico-10_2027-01'] = { ...base, id: 'cliente-sintetico-10_2027-01', competencia: '2027-01', status: 'cancelado', operationId: 'fin_cancelado_original' };
    window.__financeiroV103.invalidar();
    await window.renderContratos();
  });
  const reajuste = await page.evaluate(async () => {
    document.getElementById('ctDia_cliente-sintetico-10').value = '17';
    document.getElementById('ctValorProgramado_cliente-sintetico-10').value = '200';
    document.getElementById('ctValorProgramadoEm_cliente-sintetico-10').value = '2026-10';
    document.getElementById('ctValorProgramadoMotivo_cliente-sintetico-10').value = 'reajuste sintético auditável';
    window.__fixtureWrites = [];
    const ok = await window.salvarContrato('cliente-sintetico-10');
    const contrato = window.__store.contratos_cliente['cliente-sintetico-10'];
    const mensal = competencia => window.__store.pagamentos_mensais[`cliente-sintetico-10_${competencia}`];
    const evento = window.__store.clientes_ciclo_financeiro[contrato.financeiroOperationId];
    return {
      ok,
      contrato: { revision: contrato.financeiroRevision, operationId: contrato.financeiroOperationId, valorProgramado: contrato.valorProgramado, valorProgramadoEm: contrato.valorProgramadoEm },
      ago: mensal('2026-08'), set: mensal('2026-09'), out: mensal('2026-10'), nov: mensal('2026-11'), dez: mensal('2026-12'), jan: mensal('2027-01'),
      evento: evento ? { operationId: evento.operationId, sourceId: evento.sourceId, tipo: evento.tipo } : null,
      writes: window.__fixtureWrites.map(v => v.path),
    };
  });
  exigir(reajuste.ok && reajuste.contrato.revision === 1 && reajuste.contrato.valorProgramado === 200 && reajuste.contrato.valorProgramadoEm === '2026-10', `${vp}: reajuste programado salva vigência futura com revisão`);
  exigir(reajuste.ago.valorDevido === 100 && reajuste.ago.diaVencimento === 7, `${vp}: reajuste não reescreve valor nem vencimento de agosto`);
  exigir(reajuste.set.valorDevido === 100 && reajuste.set.diaVencimento === 17, `${vp}: vencimento cadastral alcança aberta da competência editada sem antecipar o reajuste`);
  exigir(reajuste.out.valorDevido === 200 && reajuste.out.valor === 200 && reajuste.out.valorCobrado === 200 && reajuste.out.diaVencimento === 17, `${vp}: reajuste alcança mensalidade futura aberta e seus campos compatíveis`);
  exigir(reajuste.nov.status === 'isento' && reajuste.nov.valorDevido === 200 && reajuste.nov.valor === 200 && reajuste.nov.diaVencimento === 10, `${vp}: reajuste alcança valor futuro isento sem reescrever vencimento terminal`);
  exigir(reajuste.out.financeiroOperationId === reajuste.contrato.operationId && reajuste.nov.financeiroOperationId === reajuste.contrato.operationId, `${vp}: abertas e isentas atualizadas carregam o operationId do contrato`);
  exigir(reajuste.dez.status === 'pago' && reajuste.dez.valorDevido === 100 && reajuste.dez.operationId === 'fin_pago_original', `${vp}: mensalidade paga permanece imutável`);
  exigir(reajuste.jan.status === 'cancelado' && reajuste.jan.valorDevido === 100 && reajuste.jan.operationId === 'fin_cancelado_original', `${vp}: mensalidade cancelada permanece imutável`);
  exigir(reajuste.evento?.operationId === reajuste.contrato.operationId && reajuste.evento?.sourceId === 'cliente-sintetico-10' && reajuste.evento?.tipo === 'alteracao_valor', `${vp}: contrato e mensalidades convergem para um recibo de reajuste`);

  const retryStale = await page.evaluate(async () => {
    document.getElementById('ctRevision_cliente-sintetico-10').value = '0';
    const antes = window.__fixtureWrites.length;
    const ok = await window.salvarContrato('cliente-sintetico-10');
    const contrato = window.__store.contratos_cliente['cliente-sintetico-10'];
    const eventos = Object.values(window.__store.clientes_ciclo_financeiro).filter(v => v.sourceType === 'contrato' && v.sourceId === 'cliente-sintetico-10');
    return { ok, antes, depois: window.__fixtureWrites.length, revision: contrato.financeiroRevision, eventos: eventos.length };
  });
  exigir(retryStale.ok && retryStale.antes === retryStale.depois && retryStale.revision === 1 && retryStale.eventos === 1, `${vp}: retry de uma segunda aba com a mesma intenção confirma o recibo sem nova escrita`);

  const conflitoOutraAba = await page.evaluate(async () => {
    document.getElementById('ctRevision_cliente-sintetico-10').value = '0';
    document.getElementById('ctObs_cliente-sintetico-10').value = 'intenção divergente de outra aba';
    const antes = window.__fixtureWrites.length;
    const ok = await window.salvarContrato('cliente-sintetico-10');
    return { ok, antes, depois: window.__fixtureWrites.length, revision: window.__store.contratos_cliente['cliente-sintetico-10'].financeiroRevision };
  });
  exigir(!conflitoOutraAba.ok && conflitoOutraAba.antes === conflitoOutraAba.depois && conflitoOutraAba.revision === 1, `${vp}: segunda aba divergente é bloqueada por revisão sem escrita parcial`);

  const posCommit = await page.evaluate(async () => {
    document.getElementById('ctObs_cliente-sintetico-11').value = 'confirmação pós-commit sintética';
    const esperado = Number(document.getElementById('ctRevision_cliente-sintetico-11').value || 0);
    window.__fixtureWrites = [];
    window.__fixtureGetDocFailure = { path: 'contratos_cliente/cliente-sintetico-11', remaining: 1 };
    const primeiro = await window.salvarContrato('cliente-sintetico-11');
    const contratoAposErro = window.__store.contratos_cliente['cliente-sintetico-11'];
    const op = contratoAposErro.financeiroOperationId;
    const eventoAposErro = window.__store.clientes_ciclo_financeiro[op];
    const writesCommit = window.__fixtureWrites.length;
    // O DOM conserva a revisão anterior quando a releitura falha. Repetir a
    // mesma intenção deve localizar o recibo, nunca executar outro commit.
    document.getElementById('ctRevision_cliente-sintetico-11').value = String(esperado);
    const segundo = await window.salvarContrato('cliente-sintetico-11');
    const eventos = Object.values(window.__store.clientes_ciclo_financeiro).filter(v => v.sourceType === 'contrato' && v.sourceId === 'cliente-sintetico-11');
    return {
      primeiro, segundo, writesCommit, writesFinal: window.__fixtureWrites.length,
      revision: contratoAposErro.financeiroRevision, op,
      recibo: eventoAposErro ? { operationId: eventoAposErro.operationId, sourceId: eventoAposErro.sourceId } : null,
      eventos: eventos.length,
    };
  });
  exigir(posCommit.primeiro === false && posCommit.revision === 1 && posCommit.recibo?.operationId === posCommit.op, `${vp}: erro de releitura pós-commit não apaga contrato nem recibo já confirmados`);
  exigir(posCommit.segundo === true && posCommit.writesFinal === posCommit.writesCommit && posCommit.eventos === 1, `${vp}: retry após erro pós-commit converge sem duplicar revisão ou recibo`);

  await page.evaluate(async () => {
    document.getElementById('finMes').value = '2026-08';
    window.__financeiroV103.invalidar();
    await window.renderFinanceiro();
  });
  const baixaSemData = await page.evaluate(async () => {
    document.getElementById('finLancBaixaData_custo-agosto-previsto').value = '';
    const antes = window.__fixtureWrites.length;
    const ok = await window.alterarLancamentoFinanceiroV103('custo-agosto-previsto', 'pago');
    return { ok, antes, depois: window.__fixtureWrites.length, status: window.__store.financeiro_lancamentos['custo-agosto-previsto'].status };
  });
  exigir(!baixaSemData.ok && baixaSemData.antes === baixaSemData.depois && baixaSemData.status === 'previsto', `${vp}: baixa sem data real falha antes de qualquer escrita`);

  const baixaComData = await page.evaluate(async () => {
    document.getElementById('finLancBaixaData_custo-agosto-previsto').value = '2026-09-03';
    const ok = await window.alterarLancamentoFinanceiroV103('custo-agosto-previsto', 'pago');
    const lancamento = window.__store.financeiro_lancamentos['custo-agosto-previsto'];
    const evento = Object.values(window.__store.clientes_ciclo_financeiro).find(v => v.sourceType === 'financeiro_lancamento' && v.sourceId === 'custo-agosto-previsto' && v.tipo === 'baixa');
    return {
      ok,
      lancamento: { competencia: lancamento.competencia, status: lancamento.status, revision: lancamento.revision, operationId: lancamento.operationId, data: lancamento.dataCaixa?.toDate?.().toISOString() || '' },
      evento: evento ? { operationId: evento.operationId, competenciaInicio: evento.competenciaInicio, data: evento.dataEfetiva?.toDate?.().toISOString() || '' } : null,
    };
  });
  exigir(baixaComData.ok && baixaComData.lancamento.competencia === '2026-08' && baixaComData.lancamento.status === 'pago' && baixaComData.lancamento.revision === 2, `${vp}: baixa preserva competência agosto e atualiza revisão`);
  exigir(baixaComData.lancamento.data.slice(0, 10) === '2026-09-03' && baixaComData.evento?.data.slice(0, 10) === '2026-09-03', `${vp}: lançamento e recibo usam a data real de setembro`);
  exigir(baixaComData.evento?.operationId === baixaComData.lancamento.operationId && baixaComData.evento?.competenciaInicio === '2026-08', `${vp}: baixa AGO→SET conserva a competência original no recibo`);

  const custoCaixaAgosto = await textoResumo(page, '#financeiroLancamentosBox', 'Custos pagos no caixa');
  exigir(custoCaixaAgosto === await page.evaluate(() => window.brl(0)), `${vp}: custo de agosto pago em setembro não contamina o caixa de agosto`);
  await page.evaluate(async () => {
    document.getElementById('finMes').value = '2026-09';
    window.__financeiroV103.invalidar();
    await window.renderFinanceiro();
  });
  const custoCaixaSetembro = await textoResumo(page, '#financeiroLancamentosBox', 'Custos pagos no caixa');
  exigir(custoCaixaSetembro === await page.evaluate(() => window.brl(650)), `${vp}: caixa de setembro soma custo original de setembro e baixa tardia de agosto`);
}

async function testarPapeis(page, vp) {
  await page.evaluate(() => { window.__usuarioV103 = 'Amanda'; window.__fixtureReads = []; window.__financeiroV103.invalidar(); });
  const resultadoAmanda = await page.evaluate(async () => ({
    mens: await window.renderMensalidades(),
    cob: await window.renderCobranca(),
    fin: await window.renderFinanceiro(),
    contratos: await window.renderContratos(),
    reads: [...window.__fixtureReads],
    contratosTexto: document.getElementById('contratosBox')?.textContent || '',
  }));
  exigir(resultadoAmanda.mens === false && resultadoAmanda.cob === false && resultadoAmanda.fin === false && resultadoAmanda.contratos === true, `${vp}: Amanda acessa somente Contratos entre as quatro superfícies`);
  exigir(!resultadoAmanda.contratosTexto.includes('MRR/previsto') && resultadoAmanda.contratosTexto.includes('Valores recebidos, caixa, custos e contatos privados não são carregados nesta tela'), `${vp}: Amanda recebe ficha contratual sem MRR, pagamentos ou caixa`);
  const permitidasAmanda = new Set(['contratos_cliente','clientes_encerrados']);
  const proibidasAmanda = ['pagamentos_mensais','recebimentos_entrada_pessoal','receitas_avulsas','financeiro_lancamentos','clientes_ciclo_financeiro','contatos_clientes_financeiro'];
  exigir(resultadoAmanda.reads.length === 2 && resultadoAmanda.reads.every(v => permitidasAmanda.has(v)) && proibidasAmanda.every(v => !resultadoAmanda.reads.includes(v)), `${vp}: Amanda lê somente contratos e saídas; não lê pagamentos, ledger, caixa ou contatos`);
  exigir(await page.locator('#contratosBox [data-faixa="ct_vitalle-odonto"]').count() === 1 && await page.locator('#ctValorVigente_vitalle-odonto').count() === 1, `${vp}: Amanda mantém a ficha contratual permitida e o data-faixa legado`);
  exigir(await page.locator('#contratosBox [id^="ctStatus_"]:not([type="hidden"])').count() === 0, `${vp}: Amanda não recebe editor de status do ciclo`);
  exigir((await page.locator('#mensalidadesBox').innerText()).trim() === '' && (await page.locator('#cobrancaBox').innerText()).trim() === '' && (await page.locator('#financeiroBox').innerText()).trim() === '', `${vp}: dados financeiros anteriores são retirados ao trocar para Amanda`);

  for (const papel of ['Cecília','Gabrielle','Luís','Nathan']) {
    const r = await page.evaluate(async papel => {
      window.__usuarioV103 = papel; window.__fixtureReads = []; window.__financeiroV103.invalidar();
      const resultados = await Promise.all([window.renderMensalidades(),window.renderCobranca(),window.renderFinanceiro(),window.renderContratos()]);
      return { resultados, reads: [...window.__fixtureReads] };
    }, papel);
    exigir(r.resultados.every(v => v === false) && r.reads.length === 0, `${vp}: ${papel} não recebe leitura financeira nem contratual`);
    const caixas = await page.evaluate(() => ['mensalidadesBox','cobrancaBox','financeiroBox','contratosBox'].map(id => document.getElementById(id)?.textContent.trim() || ''));
    exigir(caixas.every(v => v === ''), `${vp}: ${papel} não conserva dados financeiros no DOM`);
  }
  await page.evaluate(() => { window.__usuarioV103 = 'Chris'; window.auth.currentUser = { uid: 'uid-chris-sintetico' }; window.__financeiroV103.invalidar(); });
}

async function evidencia(page, viewId, nome, rotulo) {
  await page.evaluate(id => window.__ativarView(id), viewId);
  exigir(await page.locator('.fixtureMarcaV103').isVisible(), `${rotulo}: selo sintético está visível`);
  await semOverflow(page, rotulo);
  await page.screenshot({ path: path.join(evidencias, nome), fullPage: true });
}

const desktop = await novaPagina({ width: 1365, height: 900 });
try {
  await testarSuperficies(desktop.page, 'desktop');
  await evidencia(desktop.page, 'view-financeiro', 'V103_DESKTOP_FINANCEIRO_FIXTURE_SINTETICA.png', 'desktop/Financeiro');
  await pageRender(desktop.page, 'renderCobranca');
  await evidencia(desktop.page, 'view-cobranca', 'V103_DESKTOP_REGUA_FIXTURE_SINTETICA.png', 'desktop/Régua');
  await testarErrosConflitosAcoes(desktop.page, 'desktop');
  await testarContratoWriterECaixa(desktop.page, 'desktop');
  await testarPapeis(desktop.page, 'desktop');
  exigir(desktop.pageerrors.length === 0, `desktop: zero pageerror (${desktop.pageerrors.join(' | ')})`);
} finally {
  await desktop.page.close();
}

const mobile = await novaPagina({ width: 390, height: 844 });
try {
  await testarSuperficies(mobile.page, 'mobile');
  await mobile.page.evaluate(() => window.renderMensalidades());
  await evidencia(mobile.page, 'view-mensalidades', 'V103_MOBILE_MENSALIDADES_FIXTURE_SINTETICA.png', 'mobile/Mensalidades');
  await mobile.page.evaluate(() => window.renderContratos());
  await evidencia(mobile.page, 'view-contratos', 'V103_MOBILE_CONTRATOS_FIXTURE_SINTETICA.png', 'mobile/Contratos');
  await testarPapeis(mobile.page, 'mobile');
  exigir(mobile.pageerrors.length === 0, `mobile: zero pageerror (${mobile.pageerrors.join(' | ')})`);
} finally {
  await mobile.page.close();
}

await navegador.close();
await new Promise(resolve => servidor.close(resolve));

const pngs = fs.readdirSync(evidencias).filter(v => v.endsWith('.png')).sort();
exigir(pngs.length === 4, `foram gerados exatamente quatro PNGs sintéticos (${pngs.length})`);
for (const png of pngs) {
  const arquivo = path.join(evidencias, png);
  exigir(fs.statSync(arquivo).size > 10_000, `${png}: evidência PNG não está vazia`);
}
exigir(sha256Arquivo(caminhoHtml) === hashesFonteInicial.html, 'escritorio.html permaneceu no mesmo hash durante toda a prova');
exigir(sha256Arquivo(caminhoCore) === hashesFonteInicial.core, 'financeiro-core.mjs permaneceu no mesmo hash durante toda a prova');
exigir(sha256Arquivo(caminhoUi) === hashesFonteInicial.ui, 'financeiro-ui-v103.mjs permaneceu no mesmo hash durante toda a prova');

console.log(`V103 UI FINANCEIRO: ${total - falhas.length}/${total} verificações aprovadas.`);
console.log(`HASH escritorio.html: ${sha256Arquivo(caminhoHtml)}`);
console.log(`HASH financeiro-core.mjs: ${sha256Arquivo(caminhoCore)}`);
console.log(`HASH financeiro-ui-v103.mjs: ${sha256Arquivo(caminhoUi)}`);
console.log(`HASH teste: ${sha256Arquivo(fileURLToPath(import.meta.url))}`);
console.log(`EVIDÊNCIAS: ${evidencias}`);
for (const png of pngs) console.log(`PNG ${sha256Arquivo(path.join(evidencias, png))}  ${path.join(evidencias, png)}`);
if (falhas.length) {
  console.error(`V103 UI FINANCEIRO: ${falhas.length} falha(s) real(is).`);
  process.exitCode = 1;
}

async function pageRender(page, nome) {
  await page.evaluate(async nomeFuncao => { await window[nomeFuncao](); }, nome);
}
