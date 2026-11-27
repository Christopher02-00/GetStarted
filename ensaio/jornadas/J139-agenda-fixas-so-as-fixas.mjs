// J139 — G2b (27/11/2026, custo do Google): a Agenda da gestão baixava as ~5.700 demandas do servidor para usar só as funções fixas.
// Agora a consulta pede só `tipoFuncaoFixa`; a tela tem de mostrar exatamente as mesmas rotinas (e nenhuma demanda comum).
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J139';
export const nome = 'Agenda da gestão mostra as funções fixas lendo só elas';
const esperar = async (fn, ms = 30000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString(), hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  await seed.set('demandas', 'j139-fixa', { titulo: 'Ensaio J139 rotina fixa', descricao: 'rotina', tipoFuncaoFixa: 'redes_sociais', destinatario: 'Cecília', status: 'pendente', prazoData: hoje, prazoHora: '10:00', criadoEm: agora, excluido: false, origem: 'funcoes_fixas' });
  await seed.set('demandas', 'j139-comum', { titulo: 'Ensaio J139 demanda comum', descricao: 'comum', destinatario: 'Cecília', status: 'pendente', prazoData: hoje, prazoHora: '11:00', criadoEm: agora, excluido: false });
  for (const pessoa of ['Amanda', 'Chris']) {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    const caso = `${pessoa}: a Agenda mostra a rotina fixa e não a demanda comum`;
    try {
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('agendaOrganizacao', document.getElementById('navAgendaOrganizacaoI167')));
      const ok = await esperar(async () => (await page.evaluate(() => document.getElementById('agendaBoxI167')?.innerText || '')).includes('Ensaio J139 rotina fixa'));
      const texto = await page.evaluate(() => document.getElementById('agendaBoxI167')?.innerText || '');
      const graves = erros.filter(erroGrave);
      await foto(page, `J139-${pessoa}`);
      registrar({ jornada: id, caso, ok: !!ok && !texto.includes('Ensaio J139 demanda comum') && !graves.length, ms: Date.now() - t0,
        detalhe: `rotina fixa ${ok ? 'aparece' : 'NÃO aparece'} · demanda comum ${texto.includes('Ensaio J139 demanda comum') ? 'APARECE (errado)' : 'fora'}` + (graves.length ? ' | ' + graves[0] : '') + (ok ? '' : ' · tela: ' + texto.replace(/\s+/g, ' ').slice(0, 200)) });
    } catch (e) { await foto(page, `J139-falha-${pessoa}`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
    finally { await fechar(); }
  }
}
