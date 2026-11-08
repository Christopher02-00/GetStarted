// J10 — Financeiro abre para Chris (competência, régua renderizam); Amanda não tem DOM nem rota.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J10';
export const nome = 'Financeiro: abre para Chris; bloqueado para Amanda';
export async function executar({ amb, nav, erroGrave, registrar }) {
  for (const pessoa of ['Chris', 'Amanda']) {
    const { page, erros, fechar } = await nav.novaPagina();
    const t0 = Date.now();
    try {
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      // a área de dinheiro pede senha pessoal por prompt(): no primeiro acesso define, depois confere
      page.on('dialog', d => d.type() === 'prompt' ? d.accept('ensaio-senha-pessoal-123') : d.accept());
      const r = await page.evaluate(() => { try { const el = document.getElementById('navFinanceiro'); if (!el) return 'sem-nav'; el.click(); return 'click'; } catch (e) { return 'erro:' + e.message; } });
      await page.waitForTimeout(3000);
      const vis = await page.evaluate(() => { const v = document.getElementById('view-financeiro'); return v ? getComputedStyle(v).display !== 'none' && v.innerText.length > 200 : false; });
      const graves = erros.filter(erroGrave);
      await foto(page, `J10-${pessoa}`);
      const ok = pessoa === 'Chris' ? (vis && !graves.length) : (!vis && !graves.filter(e => /null|undefined/.test(e)).length);
      registrar({ jornada: id, caso: pessoa, ok, ms: Date.now() - t0, detalhe: `irPara→${r.slice(0, 40)} · view visível: ${vis}` + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, `J10-${pessoa}-falha`); registrar({ jornada: id, caso: pessoa, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); }
  }
}
