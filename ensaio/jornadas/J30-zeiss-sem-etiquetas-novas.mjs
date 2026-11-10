// J30 — Empresas do Otávio viraram clientes próprios (09/11/2026): a Zeiss não oferece mais escolher/filtrar
// "Óticas do Otávio" em conteúdo novo (Portal, escritório), e as 3 etiquetas antigas continuam só para leitura.
// Contraprova: no main o Portal da Zeiss mostra as abas "Óticas do Otávio" e o formulário pede a empresa.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J30';
export const nome = 'Zeiss sem etiquetas novas: Portal sem abas de empresa; etiqueta antiga só leitura';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now();
  const caso = (c, ok, detalhe) => registrar({ jornada: id, caso: c, ok, ms: Date.now() - t0, detalhe });
  // 1) Portal da Zeiss
  {
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      await page.goto(amb.url('portal-cliente.html', '&c=zeiss&t=tok-zeiss'), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('Zeiss'), null, { timeout: 20000 });
      await page.waitForTimeout(4000);
      let txt = '';
      for (const rotulo of [/Acompanhamento/, /Programados/, /Mais/]) {
        try { await page.getByText(rotulo).first().click({ timeout: 2500 }); await page.waitForTimeout(2000); } catch {}
        txt += '\n' + await page.evaluate(() => document.body.innerText);
      }
      const graves = erros.filter(erroGrave);
      await foto(page, 'J30-portal-zeiss');
      caso('Portal Zeiss sem abas "Óticas do Otávio"', !/Óticas do Otávio/i.test(txt) && !graves.length, (/Óticas do Otávio/i.test(txt) ? 'abas ainda aparecem' : 'sem abas') + (graves[0] ? ' | ' + graves[0] : ''));
    } catch (e) { await foto(page, 'J30-portal-falha'); caso('Portal Zeiss', false, String(e).slice(0, 200)); }
    finally { await fechar(); }
  }
  // 2) Escritório: o módulo carregado no site real (mesmo arquivo do Portal e do calendário)
  {
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
      const r = await page.evaluate(() => {
        const E = window.GetEmpresasOtavioI144;
        return {
          novo: E.campo('zeiss', 'x', '__escolher__'),
          legado: E.campo('zeiss', 'x', 'otica_sao_jose'),
          camposNovo: JSON.stringify(E.campos('zeiss', '')),
          camposLegado: JSON.stringify(E.campos('zeiss', { empresaOtavio: 'otica_sao_jose' })),
          seloLegado: E.selo('zeiss', { empresaOtavio: 'otica_sao_jose' }),
          seloNovo: E.selo('zeiss', {}),
          filtro: E.filtrar('zeiss', [{ empresaOtavio: 'otica_hauer' }, {}], 'otica_hauer').length,
        };
      });
      const graves = erros.filter(erroGrave);
      caso('conteúdo novo da Zeiss não pede empresa', r.novo === '' && r.camposNovo === '{}', `campo: ${r.novo ? 'aparece' : 'não aparece'} · campos: ${r.camposNovo}`);
      caso('etiqueta antiga continua (só leitura)', /etiqueta antiga/.test(r.legado) && /otica_sao_jose/.test(r.camposLegado) && /Ótica São José/.test(r.seloLegado) && r.seloNovo === '', `selo antigo: ${/Ótica São José/.test(r.seloLegado)} · selo novo vazio: ${r.seloNovo === ''}`);
      caso('nenhum filtro esconde conteúdo da Zeiss', r.filtro === 2 && !graves.length, `itens: ${r.filtro}` + (graves[0] ? ' | ' + graves[0] : ''));
    } catch (e) { await foto(page, 'J30-escritorio-falha'); caso('escritório', false, String(e).slice(0, 200)); }
    finally { await fechar(); }
  }
}
