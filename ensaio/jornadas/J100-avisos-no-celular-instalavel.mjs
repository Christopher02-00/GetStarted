// J100 — CP246 (21/11/2026, Programa Estabilidade, Raio-X G2): só o Chris e a Helo têm celular ligado aos avisos; a Amanda (18 avisos
// pendentes), a Cecília (192) e o João Victor (5) só veem o que travou quando abrem o site. No iPhone o aviso no aparelho só existe com
// o site instalado na Tela de Início — e o Escritório não era instalável (sem manifest) e a tela dizia só "este navegador não oferece".
// Esperado:
//  1. O Escritório é instalável: manifest servido (standalone, abre o escritorio.html) com ícones PNG reais; ícone do iPhone no ar.
//  2. No iPhone sem o Get instalado, a tela diz o passo exato ("Adicionar à Tela de Início" → abrir pelo ícone → "Ativar no meu aparelho");
//     instalado em iOS antigo pede atualização; outro navegador sem avisos indica Chrome (Android) ou instalar (iPhone).
//  3. O Escritório carrega com o manifest e o módulo de avisos novo (hash do import confere) sem erro de console.
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J100';
export const nome = 'Avisos no celular: Escritório instalável e passo exato no iPhone para ligar os avisos';

export async function executar({ amb, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const base = amb.url().split('?')[0].replace(/[^/]*$/, '');
  // 1) instalável
  try {
    const r = await fetch(base + 'manifest-escritorio.webmanifest'); const m = r.ok ? await r.json() : null;
    const icones = await Promise.all((m?.icons || []).map(async i => { const x = await fetch(base + i.src); const b = Buffer.from(await x.arrayBuffer()); return x.ok && b.slice(1, 4).toString() === 'PNG'; }));
    const apple = await fetch(base + 'apple-touch-icon.png');
    const ok = !!m && m.display === 'standalone' && /escritorio\.html/.test(m.start_url || '') && icones.length >= 2 && icones.every(Boolean) && apple.ok;
    fim('1 Escritório instalável (manifest standalone, ícones PNG, ícone do iPhone)', ok, m ? `display ${m.display} · início ${m.start_url} · ícones ${icones.filter(Boolean).length}/${icones.length} · ícone iPhone ${apple.ok ? 'ok' : 'FALTA'}` : 'manifest ausente (HTTP ' + r.status + ')');
  } catch (e) { fim('1 Escritório instalável', false, String(e).slice(0, 200)); }
  // 2) mensagem por aparelho
  try {
    const { motivoSemAvisosCp246: f } = await import(pathToFileURL(path.join(RAIZ, 'gs-avisos-canal-i165.mjs')).href);
    const safari = f({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1' });
    const ipad = f({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15', maxTouchPoints: 5 });
    const instalado = f({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X)', standalone: true });
    const outro = f({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0' });
    const ok = /Adicionar à Tela de Início/.test(safari) && /Ativar no meu aparelho/.test(safari) && /Adicionar à Tela de Início/.test(ipad) && /iOS 16\.4/.test(instalado) && /Chrome \(Android\)/.test(outro);
    fim('2 iPhone sem o Get instalado: a tela diz o passo exato', ok, `iPhone: “${safari.slice(0, 90)}…” · iPad ${/Tela de Início/.test(ipad) ? 'ok' : 'NÃO'} · instalado/iOS antigo ${/16\.4/.test(instalado) ? 'ok' : 'NÃO'} · outro ${/Android/.test(outro) ? 'ok' : 'NÃO'}`);
  } catch (e) { fim('2 mensagem por aparelho', false, String(e).slice(0, 200)); }
  // 3) o Escritório carrega com o manifest e o módulo novo
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(3000);
    const head = await page.evaluate(() => ({ manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href') || '', apple: !!document.querySelector('link[rel=apple-touch-icon]'),
      modulo: [...document.querySelectorAll('script[type=module]')].map(s => s.textContent).join('\n').match(/gs-avisos-canal-i165\.mjs\?v=([0-9a-f]{64})/)?.[1] || '' }));
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(RAIZ, 'gs-avisos-canal-i165.mjs'))).digest('hex');
    const graves = erros.filter(erroGrave);
    fim('3 Escritório carrega com o manifest e o módulo de avisos atual, sem erro', head.manifest === 'manifest-escritorio.webmanifest' && head.apple && head.modulo === hash && !graves.length,
      `manifest ${head.manifest || 'NÃO'} · ícone iPhone ${head.apple ? 'sim' : 'NÃO'} · hash do módulo ${head.modulo === hash ? 'confere' : 'DIFERENTE'}${graves.length ? ' · erro: ' + graves[0] : ''}`);
    await foto(page, 'J100-amanda');
  } catch (e) { await foto(page, 'J100-falha'); fim('3 Escritório carrega', false, String(e).replace(/\s+/g, ' ').slice(0, 220)); } finally { await fechar(); }
}
