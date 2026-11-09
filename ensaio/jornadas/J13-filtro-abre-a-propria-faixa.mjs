// J13 — Minhas Demandas: o chip de filtro escolhido abre a faixa de mesmo nome (F-01).
// Helo tem uma demanda para amanhã (seed d-helo-1) → chip "Próximos 7 dias" precisa mostrar o cartão,
// mesmo que a pessoa tenha deixado essa faixa recolhida numa visita anterior (estado guardado no navegador).
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J13';
export const nome = 'Minhas Demandas: o filtro escolhido abre a própria faixa, acima do estado guardado';
export async function executar({ amb, nav, erroGrave, registrar }) {
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    await entrarComo(page, amb.url(), 'Helo'); await page.waitForTimeout(2500);
    // estado guardado de uma visita anterior: faixa "próximas" recolhida
    await page.evaluate(() => localStorage.setItem('faixasDemandas_Helo', JSON.stringify({ proximas: false })));
    await page.evaluate(() => document.getElementById('navMinhasDemandasAtribuidas')?.click()); await page.waitForTimeout(3500);
    const chip = await page.evaluate(() => { const c = [...document.querySelectorAll('#listaMinhasDemandasAtribuidas .chip')].find(x => /Próximos 7 dias/.test(x.textContent)); if (!c) return false; c.click(); return true; });
    if (!chip) throw new Error('chip "Próximos 7 dias" não encontrado');
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const faixa = document.querySelector('#listaMinhasDemandasAtribuidas .faixaDem[data-faixa="proximas"]');
      if (!faixa) return { faixa: false };
      const itens = faixa.querySelector('.faixaItens');
      const cartoes = [...faixa.querySelectorAll('.faixaItens .item, .faixaItens [data-dem-id], .faixaItens .demCard, .faixaItens .grupoDem')].filter(el => el.offsetParent !== null);
      return { faixa: true, aberta: faixa.classList.contains('aberta'), itensVisiveis: itens ? getComputedStyle(itens).display !== 'none' : false, cartoes: cartoes.length, qtd: (faixa.querySelector('.qtd')?.textContent || '').trim(), texto: (itens?.innerText || '').slice(0, 80) };
    });
    const graves = erros.filter(erroGrave);
    const ok = r.faixa && r.aberta && r.itensVisiveis && r.cartoes > 0 && !graves.length;
    if (!ok) await foto(page, 'J13-Helo-proximas');
    registrar({ jornada: id, caso: 'Helo filtra "Próximos 7 dias" com a faixa recolhida de antes', ok, ms: Date.now() - t0, detalhe: `faixa ${r.faixa ? (r.aberta ? 'aberta' : 'RECOLHIDA') : 'ausente'} · itens visíveis: ${r.itensVisiveis} · cartões: ${r.cartoes} · contador ${r.qtd}` + (graves.length ? ' | ' + graves[0].slice(0, 120) : '') });
  } catch (e) { await foto(page, 'J13-falha'); registrar({ jornada: id, caso: 'Helo filtra "Próximos 7 dias"', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
  finally { await fechar(); }
}
