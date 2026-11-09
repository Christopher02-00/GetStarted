// J21 — Cancelar duas gravações do mesmo cliente avisa o filmmaker das duas (backlog Codex P18).
// Antes: o aviso "🚫 Gravação cancelada — Cliente" era considerado duplicado por título + destinatário, e o
// segundo cancelamento (outra sessão) não avisava ninguém enquanto o primeiro aviso estivesse pendente.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J21';
export const nome = 'Cancelamento: duas sessões do mesmo cliente geram dois avisos';
const d = n => { const x = new Date(Date.now() + n * 86400000); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const SESSOES = ['ag-j21-a', 'ag-j21-b'];

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  for (const [i, sid] of SESSOES.entries())
    await seed.set('agendamentos', sid, { cliente: 'mochi', clienteNome: 'Mochi', data: d(4 + i), hora: '10:00', filmmaker: 'Luís', equipe: 'Luís', status: 'agendado', qtdVideosPlanejados: 2, criadoEm: new Date().toISOString(), excluido: false });
  const avisos = async () => (await seed.listar('demandas')).filter(x => x.destinatario === 'Luís' && /Gravação cancelada — Mochi/.test(String(x.titulo || '')) && x.status === 'pendente');
  const antes = (await avisos()).length;
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    for (const sid of SESSOES) {
      const r = await page.evaluate(i => cancelarAgendamento(i, { motivo: 'Ensaio J21: cliente pediu para remarcar' }), sid);
      if (r === false) throw new Error('cancelamento recusado: ' + sid);
      await page.waitForTimeout(2500);
    }
    const lista = await avisos();
    const novos = lista.length - antes;
    const porSessao = new Set(lista.map(x => x.agendamentoId).filter(Boolean));
    const graves = erros.filter(erroGrave);
    await foto(page, 'J21-cecilia-cancelou');
    registrar({ jornada: id, caso: 'Cecília cancela 2 sessões da Mochi', ok: novos === 2 && SESSOES.every(s => porSessao.has(s)) && !graves.length, ms: Date.now() - t0,
      detalhe: `avisos novos para o Luís: ${novos} (esperado 2) · sessões com aviso: ${[...porSessao].join(', ') || 'nenhuma'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J21-falha'); registrar({ jornada: id, caso: 'Cecília cancela 2 sessões da Mochi', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
  finally { await fechar(); }
}
