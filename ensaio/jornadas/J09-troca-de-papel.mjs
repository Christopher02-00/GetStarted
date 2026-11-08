// J09 — na mesma aba: Chris entra (vê Financeiro) → sai → Amanda entra (Financeiro não existe no DOM) → sai → Chris volta (Financeiro de novo).
import { entrarComo, foto, idsNoDom } from '../lib/navegador.mjs';
export const id = 'J09';
export const nome = 'Troca de papel na mesma aba limpa DOM e caches';
export async function executar({ amb, nav, erroGrave, registrar }) {
  const { page, erros, fechar } = await nav.novaPagina();
  const t0 = Date.now();
  try {
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
    const a = await idsNoDom(page, ['navFinanceiro', 'navCentralVendas']);
    await page.evaluate(() => window.__ensaioSair());
    await page.waitForFunction(() => !window.__pessoaAutenticadaReal, null, { timeout: 10000 });
    await page.evaluate(([e, s]) => window.__ensaioLogin(e, s), ['amandachamorrosm@gmail.com', 'Amanda']);
    await page.waitForFunction(() => window.__pessoaAutenticadaReal === 'Amanda', null, { timeout: 15000 }); await page.waitForTimeout(2500);
    const b = await idsNoDom(page, ['navFinanceiro', 'navCentralVendas', 'navitemGerencia']);
    await foto(page, 'J09-amanda');
    await page.evaluate(() => window.__ensaioSair());
    await page.waitForFunction(() => !window.__pessoaAutenticadaReal, null, { timeout: 10000 });
    await page.evaluate(([e, s]) => window.__ensaioLogin(e, s), ['christopherveloso0@gmail.com', 'Chris']);
    await page.waitForFunction(() => window.__pessoaAutenticadaReal === 'Chris', null, { timeout: 15000 }); await page.waitForTimeout(2500);
    const c = await idsNoDom(page, ['navFinanceiro', 'navCentralVendas']);
    const graves = erros.filter(erroGrave);
    const ok = a.navFinanceiro && a.navCentralVendas && !b.navFinanceiro && !b.navCentralVendas && b.navitemGerencia && c.navFinanceiro && c.navCentralVendas && !graves.length;
    registrar({ jornada: id, caso: 'Chris→Amanda→Chris', ok, ms: Date.now() - t0, detalhe: ok ? 'Financeiro some para Amanda e volta para Chris' : `chris1 ${JSON.stringify(a)} amanda ${JSON.stringify(b)} chris2 ${JSON.stringify(c)} ${graves[0] || ''}` });
  } catch (e) { await foto(page, 'J09-falha'); registrar({ jornada: id, caso: 'Chris→Amanda→Chris', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
  finally { await fechar(); }
}
