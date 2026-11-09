// Ensaio Get — navegador real (Chromium via Playwright), login por papel, captura de erros de console.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from './emulador.mjs';
import { EQUIPE, SENHA } from './seed.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const SAIDA = path.join(RAIZ, 'ensaio', 'saida');
/** P10 (ENSAIO_COBERTURA=1): nomes das funções do site que rodaram ao menos uma vez, por arquivo local. */
export const coberturaFuncoes = new Map();
function acumularCobertura(entradas) {
  for (const e of entradas || []) {
    let arq; try { const u = new URL(e.url); if (u.hostname !== '127.0.0.1') continue; arq = u.pathname.replace(/^\//, ''); } catch { continue; }
    const nomes = coberturaFuncoes.get(arq) || new Set();
    for (const f of e.functions || []) if (f.functionName && f.ranges?.[0]?.count > 0) nomes.add(f.functionName.split('.').pop());
    coberturaFuncoes.set(arq, nomes);
  }
}

export async function abrirNavegador(portas) {
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] }); // /dev/shm pequeno em container derruba a aba com páginas grandes
  return {
    browser,
    async novaPagina() {
      // ENSAIO_VIEWPORT=390x844 roda a mesma bateria como celular (iPhone 14/15); padrão = desktop 1400x900
      const vp = (process.env.ENSAIO_VIEWPORT || '1400x900').split('x').map(Number);
      const movel = vp[0] < 700;
      const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', ...(movel ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}) });
      const page = await ctx.newPage();
      const cobrir = !!process.env.ENSAIO_COBERTURA;
      if (cobrir) await page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: false });
      await instalarRotasOffline(page, portas);
      const erros = [];
      page.on('console', m => { if (m.type() === 'error') erros.push('[console] ' + m.text().slice(0, 300)); if (process.env.ENSAIO_CONSOLE) fs.appendFileSync(path.join(RAIZ, 'ensaio/.runtime/console.log'), `${new Date().toISOString()} [${m.type()}] ${m.text().slice(0, 400)}\n`); });
      page.on('pageerror', e => erros.push('[pageerror] ' + String(e).slice(0, 300)));
      page.on('requestfailed', r => { const u = r.url(); if (/127\.0\.0\.1/.test(u)) erros.push('[request] ' + u.slice(0, 200) + ' ' + r.failure()?.errorText); });
      return { ctx, page, erros, async fechar() {
        if (cobrir) { try { acumularCobertura(await page.coverage.stopJSCoverage()); } catch {} }
        await ctx.close();
      } };
    },
    async fechar() { await browser.close(); }
  };
}

/** O ambiente de ensaio não acessa CDNs: serve o SDK Firebase empacotado localmente e neutraliza terceiros. */
const CDN = path.join(RAIZ, 'ensaio', 'cdn');
export async function instalarRotasOffline(page, portas) {
  await page.route(/https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+)\.js/, (route, req) => {
    const nome = req.url().match(/(firebase-[a-z-]+)\.js/)[1];
    const arq = path.join(CDN, nome + '.js');
    if (!fs.existsSync(arq)) return route.fulfill({ status: 404, body: '// ' + nome + ' não empacotado' });
    route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: fs.readFileSync(arq) });
  });
  await page.route(/cdn\.jsdelivr\.net|cdn\.emailjs\.com|unpkg\.com/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.emailjs=window.emailjs||{init(){},send(){return Promise.resolve({status:200,text:"ensaio"})}};' }));
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  // (ordem importa: o Playwright avalia a última rota registrada primeiro — a específica das Functions fica por último)
  await page.route(/^https:\/\/([a-z0-9-]+\.)*(cloudfunctions\.net|run\.app|googleapis\.com|firebaseapp\.com|firebaseio\.com)\//, route => route.abort('connectionrefused'));
  // Cloud Functions: a callable real do repo roda no emulador de Functions; a URL de produção é redirecionada pra lá
  await page.route(/^https:\/\/southamerica-east1-get-started-4956d\.cloudfunctions\.net\/([A-Za-z0-9]+)/, async (route, req) => {
    const fn = req.url().match(/cloudfunctions\.net\/([A-Za-z0-9]+)/)[1];
    if (!portas?.functions) return route.abort('connectionrefused');
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS' } });
    try {
      const h = { ...req.headers() }; delete h.host; delete h.origin; delete h.referer;
      const r = await fetch(`http://127.0.0.1:${portas.functions}/get-started-4956d/southamerica-east1/${fn}`, { method: req.method(), headers: h, body: req.postDataBuffer() });
      const body = Buffer.from(await r.arrayBuffer());
      if (r.status >= 400 || process.env.ENSAIO_LOG_FN) { try { fs.appendFileSync(path.join(RAIZ, 'ensaio', '.runtime', 'functions-chamadas.log'), `${new Date().toISOString()} ${fn} ${r.status} req=${String(req.postData() || '').slice(0, 300)} resp=${body.toString().slice(0, 600)}\n`); } catch {} }
      route.fulfill({ status: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'application/json', 'Access-Control-Allow-Origin': '*' }, body });
    } catch (e) { route.abort('connectionrefused'); }
  });
}

export function emailDe(pessoa) { const p = EQUIPE.find(e => e.pessoa === pessoa); if (!p) throw new Error('pessoa desconhecida ' + pessoa); return p.email; }

/** Abre o Escritório no ensaio e autentica como a pessoa (via gancho __ensaioLogin). */
export async function entrarComo(page, url, pessoa, { esperarMs = 15000 } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__ensaioLogin === 'function', null, { timeout: 20000 });
  await page.evaluate(([email, nome]) => window.__ensaioLogin(email, nome), [emailDe(pessoa), pessoa]);
  // gate some e identidade aplicada
  await page.waitForFunction(p => window.__pessoaAutenticadaReal === p, pessoa, { timeout: esperarMs });
  await page.waitForFunction(() => { const g = document.getElementById('authEquipeGate'); return !g || g.style.display === 'none'; }, null, { timeout: esperarMs });
}

export async function foto(page, nome) {
  fs.mkdirSync(SAIDA, { recursive: true });
  const p = path.join(SAIDA, nome + '.png');
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

/** Itens de menu visíveis (nav* com display != none) — para checar isolamento por papel. */
// no celular a barra lateral fica fechada: a pessoa toca no hambúrguer (como na vida real) antes de enxergar o menu
export async function abrirMenuSeMovel(page) {
  const vp = page.viewportSize(); if (!vp || vp.width >= 700) return;
  const h = page.locator('#hamburgerBtn');
  if (await h.isVisible().catch(() => false) && !(await page.evaluate(() => document.getElementById('sidebarEl')?.classList.contains('open')))) { await h.click(); await page.waitForTimeout(600); }
}
export async function menuVisivel(page) {
  await abrirMenuSeMovel(page);
  return page.evaluate(() => Array.from(document.querySelectorAll('[id^="nav"]'))
    .filter(el => el.id !== 'navgroup' && el.offsetParent !== null && getComputedStyle(el).display !== 'none')
    .map(el => el.id));
}
export async function idsNoDom(page, ids) {
  return page.evaluate(lista => Object.fromEntries(lista.map(id => [id, !!document.getElementById(id)])), ids);
}

/** Entra na Gerência (senha padrão do ensaio) de forma robusta; dispensa o aviso de troca de senha. */
export async function entrarGerencia(page) {
  // o roteador pode recusar a navegação enquanto o boot ainda confere a sessão: insistir até a tela existir de verdade
  await page.waitForFunction(() => {
    try { irPara('gerencia', document.getElementById('navitemGerencia')); } catch (e) {}
    const i = document.getElementById('senhaGerencia'); return !!i && i.getBoundingClientRect().width > 0;
  }, null, { timeout: 30000, polling: 1000 });
  await page.fill('#senhaGerencia', 'Cg@102030');
  await page.evaluate(() => window.entrarGerencia());
  await page.waitForTimeout(2500);
  // com a senha padrão, o escritório sugere trocar a senha; a pessoa pode adiar ("Agora não")
  try { await page.getByRole('button', { name: /Agora não/ }).click({ timeout: 2000 }); await page.waitForTimeout(500); } catch {}
}

