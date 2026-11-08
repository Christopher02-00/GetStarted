// J05 — Portal do cliente: Bluefit entra pelo link com token e vê só o que é da Bluefit; Stokki idem. Cliente A nunca vê B.
import { foto } from '../lib/navegador.mjs';
export const id = 'J05';
export const nome = 'Portal: cliente A não enxerga nada do cliente B';

const CASOS = [
  { slug: 'bluefit', nome: 'Bluefit', deveVer: ['Aula experimental'], naoPodeVer: ['Tour pela loja', 'Combo de outono', 'Bastidores da cozinha', 'Stokki', 'Hitech', 'Mochi', 'Zeiss'] },
  { slug: 'mochi', nome: 'Mochi', deveVer: ['Combo de outono', 'Bastidores da cozinha'], naoPodeVer: ['Aula experimental', 'Tour pela loja', 'Bluefit', 'Stokki', 'Hitech'] },
];
export async function executar({ amb, nav, erroGrave, registrar }) {
  for (const c of CASOS) {
    const { page, erros, fechar } = await nav.novaPagina();
    const t0 = Date.now();
    try {
      await page.goto(amb.url('portal-cliente.html', `&c=${c.slug}&t=tok-${c.slug}`), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(n => document.body.innerText.includes(n), c.nome, { timeout: 20000 });
      await page.waitForTimeout(4000);
      // percorrer as abas do portal como o cliente faria e somar o texto visto
      let txt = '';
      for (const rotulo of [/Acompanhamento/, /Programados/, /Mais/, /Vídeos|Publica/i]) {
        try { await page.getByText(rotulo).first().click({ timeout: 2500 }); await page.waitForTimeout(2500); } catch {}
        txt += '\n' + await page.evaluate(() => document.body.innerText);
      }
      const faltou = c.deveVer.filter(t => !txt.includes(t));
      const vazou = c.naoPodeVer.filter(t => txt.includes(t));
      const graves = erros.filter(erroGrave);
      await foto(page, `J05-${c.slug}`);
      registrar({ jornada: id, caso: c.nome, ok: !faltou.length && !vazou.length && !graves.length, ms: Date.now() - t0,
        detalhe: [faltou.length ? 'não mostrou: ' + faltou.join(',') : '', vazou.length ? 'VAZOU de outro cliente: ' + vazou.join(',') : '', ...graves.slice(0, 2)].filter(Boolean).join(' | ') || 'ok' });
    } catch (e) { await foto(page, `J05-${c.slug}-falha`); registrar({ jornada: id, caso: c.nome, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); }
  }
}
