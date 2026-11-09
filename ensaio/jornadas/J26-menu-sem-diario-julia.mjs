// J26 — Diário da Júlia fora do menu (decisão do Chris, 09/11/2026): a conta dela (Fernanda) está desligada.
// Esperado: Amanda e Chris entram e "Registro do dia" (navDiarioI118) não aparece no menu; o registro salvo
// em diario_equipe_i118 continua lá (nada apagado) e o resto do menu da gestão segue visível.
import { entrarComo, foto, menuVisivel } from '../lib/navegador.mjs';
export const id = 'J26';
export const nome = 'Menu: Registro do dia da Júlia sai da Amanda e do Chris, sem apagar dados';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('diario_equipe_i118', 'Fernanda_2026-10-07', { schemaVersion: 1, funcionario: 'Fernanda', data: '2026-10-07', linhas: [], resumo: 'Ensaio J26', estado: 'conferido' });
  for (const [pessoa, segue] of [['Amanda', 'navVideos'], ['Chris', 'navFinanceiro']]) {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(3500);
      const menu = await menuVisivel(page);
      const registro = (await seed.listar('diario_equipe_i118')).some(d => d.id === 'Fernanda_2026-10-07');
      const graves = erros.filter(erroGrave);
      await foto(page, `J26-${pessoa}`);
      registrar({ jornada: id, caso: `${pessoa}: menu sem o Diário`, ms: Date.now() - t0,
        ok: !menu.includes('navDiarioI118') && menu.includes(segue) && registro && !graves.length,
        detalhe: `Diário no menu: ${menu.includes('navDiarioI118')} · ${segue} no menu: ${menu.includes(segue)} · registro preservado: ${registro}` + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, `J26-${pessoa}-falha`); registrar({ jornada: id, caso: `${pessoa}: menu sem o Diário`, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); }
  }
}
