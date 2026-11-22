// J109 — CP254 (22/11/2026, pedido do Chris: "dados e atualizações antigas que pesam e travam o sistema"). O Radar (Gerência → Relatórios →
// Painel Operacional da Amanda; Resumo Executivo do Chris) recalcula a partir das coleções INTEIRAS de agendamentos, vídeos, postagens e
// stories (~2.500 documentos) e faz 2 consultas ao servidor a cada recálculo. A condição só conferia se o elemento existia: depois de aberto
// uma vez, continuava recalculando a cada 60 s, no foco da janela e a cada mudança, em qualquer tela.
// Esperado: fora da tela do Radar, nenhum recálculo; com o Radar à vista, ele continua se atualizando.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J109';
export const nome = 'Radar só recalcula com a tela à vista (fora dela, nenhum recálculo das coleções inteiras)';

export async function executar({ amb, nav, erroGrave, registrar }) {
  const t0 = Date.now();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(3000);
    await entrarGerencia(page); // a Gerência pede a senha de gerência
    const abrirRadar = async () => { await page.evaluate(() => { const b = document.querySelector('.subtab[data-sub="amanda"]'); window.setGerenciaSub('amanda', b); }); // Relatórios → Painel Operacional (Amanda)
      await page.waitForFunction(() => [...document.querySelectorAll('.radar-i110')].some(el => el.getClientRects().length > 0), null, { timeout: 60000 }); await page.waitForTimeout(2000); };
    await abrirRadar();
    // conta cada leitura do Radar (a função global que o agendamento chama)
    await page.evaluate(() => { window.__radarJ109 = 0; const orig = window.atualizarRadarI110; window.atualizarRadarI110 = (...a) => { window.__radarJ109++; return orig(...a); }; });
    // sai da tela do Radar e espera um ciclo inteiro (60 s), com foco da janela e mudança de visibilidade no meio
    await page.evaluate(() => irPara('minhasDemandas', document.getElementById('navMinhasDemandas')));
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(64000);
    const fora = await page.evaluate(() => window.__radarJ109);
    // contraprova: com o Radar à vista, ele continua se atualizando
    await page.evaluate(() => irPara('gerencia', document.getElementById('navitemGerencia'))); await page.waitForTimeout(1500);
    await abrirRadar();
    await page.evaluate(() => { window.__radarJ109 = 0; window.dispatchEvent(new Event('focus')); });
    await page.waitForTimeout(3000);
    const aVista = await page.evaluate(() => window.__radarJ109);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J109-radar');
    registrar({ jornada: id, caso: '1 fora da tela do Radar: nenhum recálculo em 65 s (com foco e visibilidade no meio)', ok: fora === 0 && !graves.length, ms: Date.now() - t0, detalhe: `${fora} recálculo(s) do Radar fora da tela${graves.length ? ' · erro: ' + graves[0] : ''}` });
    registrar({ jornada: id, caso: '2 com o Radar à vista ele continua atualizando', ok: aVista >= 1, ms: Date.now() - t0, detalhe: `${aVista} atualização(ões) com a tela à vista` });
  } catch (e) { await foto(page, 'J109-falha'); registrar({ jornada: id, caso: 'Radar só lê à vista', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
