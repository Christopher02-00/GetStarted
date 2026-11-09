// J19 — Pessoa desligada não entra pela lista fixa (P8). Gabrielle foi desligada em 04/11/2026.
// Antes: o e-mail dela continuava na lista fixa das rules (dY) e no mapa de login do site; sem cadastro em
// usuarios_equipe, a regra aceitava (aA: "sem documento = vale a lista") e ela lia dados da equipe.
// Agora: o site não reconhece o e-mail e as rules negam. O e-mail é lido do próprio firestore.rules (Z4).
import fs from 'node:fs';
import path from 'node:path';
import { foto } from '../lib/navegador.mjs';
import { RAIZ } from '../lib/emulador.mjs';
export const id = 'J19';
export const nome = 'Desligada (Gabrielle, sem cadastro) não entra nem lê dados';

export async function executar({ amb, nav, registrar }) {
  const email = fs.readFileSync(path.join(RAIZ, 'firestore.rules'), 'utf8').match(/function Z4\(\)\{return '([^']+)';/)?.[1];
  const { page, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    if (!email) throw new Error('e-mail histórico da Gabrielle não encontrado nas rules');
    await page.goto(amb.url(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__ensaioLogin === 'function', null, { timeout: 20000 });
    await page.evaluate(([e, n]) => window.__ensaioLogin(e, n), [email, 'Gabrielle']);
    await page.waitForTimeout(6000);
    const entrou = await page.evaluate(() => window.__pessoaAutenticadaReal === 'Gabrielle');
    const leitura = await page.evaluate(async () => {
      try {
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
        const f = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const snap = await f.getDocs(f.query(f.collection(f.getFirestore(getApp()), 'demandas'), f.limit(1)));
        return 'permitida (' + snap.size + ')';
      } catch (e) { return String(e.code || e.message); }
    });
    await foto(page, 'J19-gabrielle');
    registrar({ jornada: id, caso: 'Gabrielle sem cadastro tenta entrar', ok: !entrou && /permission/i.test(leitura), ms: Date.now() - t0,
      detalhe: `site reconheceu como Gabrielle: ${entrou} · leitura de demandas: ${leitura}` });
  } catch (e) { await foto(page, 'J19-falha'); registrar({ jornada: id, caso: 'Gabrielle sem cadastro tenta entrar', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
  finally { await fechar(); }
}
