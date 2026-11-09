// J24 — Sem rede, lista não confirmada não vira "Nenhum…" nem "Carregando" eterno (P12/R5; AGENTS: falha nunca vira lista vazia).
// Achado com a base real (09/11): sem rede, Get Academy dizia "Nenhum curso cadastrado" e o cofre da Cecília
// "Nenhuma credencial ativa", embora houvesse dados; Atrasadas (Cecília) ficava carregando para sempre. O Diário (Amanda) já avisava ("não carregou") e fica como guarda.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J24';
export const nome = 'Sem rede: telas avisam indisponível em vez de "nenhum" ou "carregando" eterno';
const CASOS = [
  ['Cecília', [['navGetAcademy', 'view-getAcademy', /Nenhum curso cadastrado/], ['navCofreCecilia', 'view-cofreCecilia', /Nenhuma credencial ativa/],
    ['navAtrasadas', 'view-atrasadas', /Carregando suas demandas/]]],
  ['Amanda', [['navDiarioI118', 'view-diarioEquipe', /Carregando o (registro|diár)/]]],
];
const AVISO = /indisponível|sem conexão|não consegui|não foi possível|não respondeu|não carregou/i;

export async function executar({ amb, nav, registrar }) {
  for (const [pessoa, telas] of CASOS) {
    const { page, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.dismiss().catch(() => {}));
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(4000);
      await page.context().setOffline(true);
      const res = [];
      for (const [nav_, view, mentira] of telas) {
        await page.evaluate(i => document.getElementById(i)?.click(), nav_);
        await page.waitForTimeout(14000); // acima do limite de 12 s das telas
        const t = await page.evaluate(v => document.getElementById(v)?.innerText || '', view);
        res.push({ nav_, mentiu: mentira.test(t) && !AVISO.test(t), avisou: AVISO.test(t) });
      }
      await foto(page, `J24-${pessoa}-sem-rede`);
      registrar({ jornada: id, caso: `${pessoa} sem rede`, ms: Date.now() - t0, ok: res.every(r => !r.mentiu && r.avisou),
        detalhe: res.map(r => `${r.nav_}: ${r.mentiu ? 'NENHUM/CARREGANDO' : r.avisou ? 'avisou indisponível' : 'sem aviso'}`).join(' · ') });
    } catch (e) { await foto(page, `J24-${pessoa}-falha`); registrar({ jornada: id, caso: `${pessoa} sem rede`, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await page.context().setOffline(false).catch(() => {}); await fechar(); }
  }
}
