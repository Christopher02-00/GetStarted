// J14 — F-09: clicar em "Calendários e conteúdos" (Central R80) enquanto o Início ainda lista a Entrada de perfil
// não pode ser ignorado em silêncio. Chris espera 6 s depois do login (janela em que a listagem CP126 está em voo) e clica.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J14';
export const nome = 'Central abre mesmo com a listagem da Entrada de perfil em andamento';
export async function executar({ amb, nav, erroGrave, registrar }) {
  for (const espera of [6000, 1200]) {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      await entrarComo(page, amb.url(), 'Chris', { esperarMs: 15000 }); await page.waitForTimeout(espera);
      const r = await page.evaluate(() => { const el = document.getElementById('navPlanejamentoPreparacaoR80'); if (!el) return 'sem-nav'; return String(window.irPara('planejamentoPreparacaoR80', el)); });
      await page.waitForTimeout(2500);
      const vis = await page.evaluate(() => { const v = document.getElementById('view-planejamentoPreparacaoR80'); return !!v && getComputedStyle(v).display !== 'none'; });
      const graves = erros.filter(erroGrave);
      const ok = r !== 'false' && vis && !graves.length;
      if (!ok) await foto(page, `J14-Chris-${espera}`);
      registrar({ jornada: id, caso: `Chris clica na Central ${espera} ms após o login`, ok, ms: Date.now() - t0, detalhe: `irPara=${r} · view visível=${vis}` + (graves.length ? ' | ' + graves[0].slice(0, 120) : '') });
    } catch (e) { registrar({ jornada: id, caso: `Chris clica na Central ${espera} ms após o login`, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); }
  }
}
