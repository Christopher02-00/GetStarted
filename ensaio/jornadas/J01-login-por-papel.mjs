// J01 — cada papel entra, a Início abre sem erro de página e o menu é o do papel (DOM, não CSS).
import { entrarComo, foto, menuVisivel, idsNoDom } from '../lib/navegador.mjs';

export const id = 'J01';
export const nome = 'Login de cada papel abre a Início; menu e DOM só do papel';

// Nota: 'navitemGerencia' (cadeado) existe para todos e é protegido por senha — não é vazamento.
// O que cada papel DEVE ver e o que NÃO PODE existir no DOM (invariantes do AGENTS.md).
const ESPERADO = {
  'Chris':       { ve: ['navInicio', 'navitemGerencia', 'navFinanceiro', 'navMensalidades', 'navCentralVendas'], naoDom: [] },
  'Amanda':      { ve: ['navInicio', 'navitemGerencia', 'navVideos', 'navContratosAmanda'], naoDom: ['navFinanceiro', 'navMensalidades', 'navCentralVendas', 'navCobranca'] },
  // Com o processo exclusivo ativo (processo_calendarios_i164/ativo → central_capacidades.processoExclusivoAtivo), a Central R87
  // tira "Gravações" (navAgendamento) e "Campanhas" da barra da Cecília e põe os atalhos amarelos "Nova gravação" / "Controle de gravações".
  // É o estado real da operação 4.0 (CP183). Se um dia o processo for desligado, navAgendamento volta — este caso precisa seguir o backend.
  'Cecília':     { ve: ['navInicio', 'navPostagens', 'navCofreCecilia', 'navMinhasDemandasAtribuidas'], veTexto: ['Nova gravação', 'Controle de gravações'], naoDom: ['navFinanceiro', 'navCentralVendas', 'navMensalidades'] },
  'Helo':        { ve: ['navInicio', 'navMinhasDemandasAtribuidas', 'navVideos'], naoDom: ['navFinanceiro', 'navAcompCampanhas', 'navCofreCecilia', 'navMensalidades'] },
  'João Victor': { ve: ['navInicio', 'navMinhasDemandasAtribuidas'], naoDom: ['navFinanceiro', 'navAcompCampanhas', 'navCofreCecilia'] },
  'Nathan':      { ve: ['navInicio', 'navMinhasDemandasAtribuidas'], naoDom: ['navFinanceiro', 'navAcompCampanhas', 'navCofreCecilia'] },
  'Luís':        { ve: ['navInicio', 'navMinhasDemandasAtribuidas'], naoDom: ['navFinanceiro', 'navAcompCampanhas', 'navCofreCecilia'] },
  'Yas':         { ve: ['navInicio', 'navMinhasDemandasAtribuidas'], naoDom: ['navFinanceiro', 'navAcompCampanhas', 'navCofreCecilia'] },
};

export async function executar({ amb, nav, erroGrave, registrar }) {
  for (const [pessoa, esp] of Object.entries(ESPERADO)) {
    const { page, erros, fechar } = await nav.novaPagina();
    const t0 = Date.now();
    try {
      await entrarComo(page, amb.url(), pessoa);
      await page.waitForTimeout(3500);
      const menu = await menuVisivel(page);
      const dom = await idsNoDom(page, [...esp.ve, ...esp.naoDom]);
      const textos = await page.evaluate(() => Array.from(document.querySelectorAll('#navgroupDia .navitem, #atalhoDestaque div')).filter(el => el.offsetParent !== null).map(el => el.textContent.trim()));
      const faltando = [...esp.ve.filter(x => !menu.includes(x)), ...(esp.veTexto || []).filter(t => !textos.some(x => x.startsWith(t)))];
      const vazou = esp.naoDom.filter(x => dom[x]);
      const graves = erros.filter(erroGrave);
      await foto(page, `J01-${pessoa}`);
      const ok = !faltando.length && !vazou.length && !graves.length;
      registrar({ jornada: id, caso: pessoa, ok, ms: Date.now() - t0,
        detalhe: [faltando.length ? 'menu sem: ' + faltando.join(',') : '', vazou.length ? 'VAZOU no DOM: ' + vazou.join(',') : '', ...graves.slice(0, 3)].filter(Boolean).join(' | ') || 'ok' });
    } catch (e) {
      await foto(page, `J01-${pessoa}-falha`);
      registrar({ jornada: id, caso: pessoa, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) });
    } finally { await fechar(); }
  }
}
