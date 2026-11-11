// J51 — O link do cliente não apaga conteúdos nem comentários do calendário (CP199, auditoria 10/11/2026, ok do Chris).
// Antes: a regra do cliente só exigia mexer em items/comments/updatedAt — pelo console, quem tivesse o link podia gravar a
// lista inteira (apagar conteúdos, zerar comentários). Agora: mudar o número de conteúdos ou diminuir comentários é negado.
// As ações normais do cliente (aprovar, texto, recado) continuam cobertas pelas J20/J35/J38/J34.
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from '../lib/emulador.mjs';
import { foto } from '../lib/navegador.mjs';
export const id = 'J51';
export const nome = 'Link do cliente não apaga conteúdos nem comentários do calendário';
const CLIENTE = 'bluefit', MES = '2026-12';

function linhasRegra() {
  const L = fs.readFileSync(path.join(RAIZ, 'firestore.rules'), 'utf8').split('\n');
  const a = L.findIndex(l => l.startsWith('match/calendarios/{AP}')); if (a < 0) return null;
  const b = L.findIndex((l, i) => i > a && l.startsWith('match/calendarios_versoes/'));
  return [a + 1, b];
}

export async function executar({ amb, seed, nav, erroGrave, registrar, esperarNegacao }) {
  const caso = 'cliente tenta apagar conteúdo e comentários pelo console';
  const antes = await seed.get('calendarios', CLIENTE);
  if (!antes?.aprovacaoMeses?.[MES]) { registrar({ jornada: id, caso, ok: false, ms: 0, detalhe: 'depende da J06' }); return; }
  const faixa = linhasRegra(); if (faixa) esperarNegacao(id, 'update', faixa, 2);
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__fb?.docRef && window.__modoCal === 'cliente', null, { timeout: 30000 });
    const r = await page.evaluate(async () => {
      const fb = window.__fb, out = [];
      const tenta = async (patch) => { try { await fb.setDoc(fb.docRef, { ...patch, updatedAt: new Date().toISOString() }, { merge: true }); return 'permitido'; } catch (e) { return String(e.code || e.message); } };
      const snap = await fb.getDocFromServer(fb.docRef), d = snap.data();
      out.push(await tenta({ items: (d.items || []).slice(1) }));
      out.push(await tenta({ comments: [] }));
      return out;
    });
    const depois = await seed.get('calendarios', CLIENTE);
    const intacto = (depois.items || []).length === (antes.items || []).length && (depois.comments || []).length === (antes.comments || []).length;
    await foto(page, 'J51-cliente');
    registrar({ jornada: id, caso, ok: r.every(x => /permission/i.test(x)) && intacto, ms: Date.now() - t0,
      detalhe: `apagar conteúdo → ${r[0]} · zerar comentários → ${r[1]} · calendário ${intacto ? 'intacto' : 'ALTERADO'}` });
  } catch (e) { registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 260) }); }
  finally { await fechar(); }
}
