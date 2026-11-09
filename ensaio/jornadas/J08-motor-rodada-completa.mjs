// J08 — Motor de automações completa a rodada no login da gerência (P2).
// Para Chris e Amanda: libera a trava de 60 min e força a manutenção diária; a rodada precisa terminar com
// `motor_executado`, sem "motorAutomacoes: falha em …" no console, sem `erro_verificacao` e sem
// `manutencao_diaria_incompleta` novos, e com o dia carimbado em sistema/motor_lock.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J08';
export const nome = 'Motor: rodada completa no login da gerência, sem falha';
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const esperar = async (fn, ms) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1500)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  for (const pessoa of ['Chris', 'Amanda']) {
    await seed.set('sistema', 'motor_lock', { ultimaExecucao: 'liberado-pelo-ensaio', ultimaManutencaoDia: '2000-01-01' });
    const conta = async tipo => (await seed.listar('log_automacoes')).filter(l => l.tipo === tipo).length;
    const antes = { motor: await conta('motor_executado'), erro: await conta('erro_verificacao'), incompleta: await conta('manutencao_diaria_incompleta') };
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      await entrarComo(page, amb.url(), pessoa);
      const terminou = await esperar(async () => (await conta('motor_executado')) > antes.motor, 120000);
      const depois = { erro: await conta('erro_verificacao'), incompleta: await conta('manutencao_diaria_incompleta') };
      const lock = await seed.get('sistema', 'motor_lock');
      const falhas = erros.filter(e => /motorAutomacoes: falha em/.test(e));
      const graves = erros.filter(erroGrave);
      await foto(page, `J08-${pessoa}`);
      const ok = !!terminou && !falhas.length && depois.erro === antes.erro && depois.incompleta === antes.incompleta && lock?.ultimaManutencaoDia === hoje() && !graves.length;
      registrar({ jornada: id, caso: `${pessoa}: rodada completa do motor`, ok, ms: Date.now() - t0,
        detalhe: `motor_executado: ${terminou ? 'sim' : 'não'} · falhas no console: ${falhas.length} · erro_verificacao +${depois.erro - antes.erro} · manutenção carimbada: ${lock?.ultimaManutencaoDia === hoje()}` + (falhas[0] ? ' | ' + falhas[0].slice(0, 120) : graves[0] ? ' | ' + graves[0].slice(0, 120) : '') });
    } catch (e) { await foto(page, `J08-${pessoa}-falha`); registrar({ jornada: id, caso: `${pessoa}: rodada completa do motor`, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); }
  }
}
