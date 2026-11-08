// Ensaio Get — navegador real (Chromium via Playwright), login por papel, captura de erros de console.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from './emulador.mjs';
import { EQUIPE, SENHA } from './seed.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const SAIDA = path.join(RAIZ, 'ensaio', 'saida');

export async function abrirNavegador() {
  const browser = await chromium.launch();
  return {
    browser,
    async novaPagina() {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
      const page = await ctx.newPage();
      await instalarRotasOffline(page);
      const erros = [];
      page.on('console', m => { if (m.type() === 'error') erros.push('[console] ' + m.text().slice(0, 300)); });
      page.on('pageerror', e => erros.push('[pageerror] ' + String(e).slice(0, 300)));
      page.on('requestfailed', r => { const u = r.url(); if (/127\.0\.0\.1/.test(u)) erros.push('[request] ' + u.slice(0, 200) + ' ' + r.failure()?.errorText); });
      return { ctx, page, erros, async fechar() { await ctx.close(); } };
    },
    async fechar() { await browser.close(); }
  };
}

/** O ambiente de ensaio não acessa CDNs: serve o SDK Firebase empacotado localmente e neutraliza terceiros. */
const CDN = path.join(RAIZ, 'ensaio', 'cdn');
export async function instalarRotasOffline(page) {
  await page.route(/https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+)\.js/, (route, req) => {
    const nome = req.url().match(/(firebase-[a-z-]+)\.js/)[1];
    const arq = path.join(CDN, nome + '.js');
    if (!fs.existsSync(arq)) return route.fulfill({ status: 404, body: '// ' + nome + ' não empacotado' });
    route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: fs.readFileSync(arq) });
  });
  await page.route(/cdn\.jsdelivr\.net|cdn\.emailjs\.com|unpkg\.com/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.emailjs=window.emailjs||{init(){},send(){return Promise.resolve({status:200,text:"ensaio"})}};' }));
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route(/^https:\/\/([a-z0-9-]+\.)*(cloudfunctions\.net|run\.app|googleapis\.com|firebaseapp\.com|firebaseio\.com)\//, route => route.abort('connectionrefused'));
}

export function emailDe(pessoa) { const p = EQUIPE.find(e => e.pessoa === pessoa); if (!p) throw new Error('pessoa desconhecida ' + pessoa); return p.email; }

/** Abre o Escritório no ensaio e autentica como a pessoa (via gancho __ensaioLogin). */
export async function entrarComo(page, url, pessoa, { esperarMs = 15000 } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__ensaioLogin === 'function', null, { timeout: 20000 });
  await page.evaluate(([email, senha]) => window.__ensaioLogin(email, senha), [emailDe(pessoa), SENHA]);
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
export async function menuVisivel(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('[id^="nav"]'))
    .filter(el => el.id !== 'navgroup' && el.offsetParent !== null && getComputedStyle(el).display !== 'none')
    .map(el => el.id));
}
export async function idsNoDom(page, ids) {
  return page.evaluate(lista => Object.fromEntries(lista.map(id => [id, !!document.getElementById(id)])), ids);
}
