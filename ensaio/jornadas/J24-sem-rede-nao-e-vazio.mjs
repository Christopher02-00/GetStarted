// J24 — Sem rede, lista não confirmada não vira "Nenhum…" (P12/R5; AGENTS: falha nunca vira lista vazia).
// Achado com a base real (09/11): sem rede, Get Academy dizia "Nenhum curso cadastrado" e o cofre da Cecília
// "Nenhuma credencial ativa", embora houvesse dados. A Cecília entra, a rede cai, e ela abre as duas telas.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J24';
export const nome = 'Sem rede: telas não dizem "nenhum" para lista não confirmada';
const TELAS = [['navGetAcademy', 'view-getAcademy', /Nenhum curso cadastrado/], ['navCofreCecilia', 'view-cofreCecilia', /Nenhuma credencial ativa/]];
const AVISO = /indisponível|sem conexão|não consegui|não foi possível/i;

export async function executar({ amb, nav, erroGrave, registrar }) {
  const { page, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(4000);
    await page.context().setOffline(true);
    const res = [];
    for (const [nav_, view, mentira] of TELAS) {
      await page.evaluate(i => document.getElementById(i)?.click(), nav_);
      await page.waitForTimeout(5000);
      const t = await page.evaluate(v => document.getElementById(v)?.innerText || '', view);
      res.push({ nav_, mentiu: mentira.test(t), avisou: AVISO.test(t) });
    }
    await foto(page, 'J24-cecilia-sem-rede');
    registrar({ jornada: id, caso: 'Cecília sem rede abre Get Academy e cofre', ms: Date.now() - t0, ok: res.every(r => !r.mentiu && r.avisou),
      detalhe: res.map(r => `${r.nav_}: ${r.mentiu ? 'disse NENHUM' : r.avisou ? 'avisou indisponível' : 'sem aviso'}`).join(' · ') });
  } catch (e) { await foto(page, 'J24-falha'); registrar({ jornada: id, caso: 'Cecília sem rede abre Get Academy e cofre', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
  finally { await page.context().setOffline(false).catch(() => {}); await fechar(); }
}
