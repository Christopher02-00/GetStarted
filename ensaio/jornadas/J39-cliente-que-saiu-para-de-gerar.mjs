// J39 — Cliente que saiu para de gerar kit, demanda e cobrança (auditoria do percurso 10/11/2026, decisão do Chris:
// "parar e avisar"). Cliente encerrado com gravação marcada para amanhã e postagem agendada com data vencida.
// Antes: a Cecília e o filmmaker recebiam o kit de véspera e a Cecília ganhava "📲 Confirmar publicação" do encerrado.
// Esperado: nada disso; em vez disso, 1 demanda "Cliente que saiu ainda tem pendências" para a Cecília e 1 para a Amanda
// listando cada item, e a próxima rodada não repete.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J39';
export const nome = 'Cliente que saiu: sem kit nem "Confirmar publicação"; 1 demanda de pendências para Cecília e Amanda';
const SLUG = 'j39saiu', NOME = 'Cliente J39 que saiu';
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const dia = n => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() + n * 86400000));
const esperar = async (fn, ms = 120000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1500)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString();
  await seed.set('clientes_extras', SLUG, { slug: SLUG, nome: NOME, ativo: false, excluido: true, criadoEm: agora });
  await seed.set('clientes_config', SLUG, { modoAprovacaoCliente: 'manual', prazoTacitaHorasUteis: 24, clienteInativo: true, inativoDesde: dia(-3), excluido: false });
  await seed.set('agendamentos', 'j39-gravacao', { cliente: SLUG, clienteNome: NOME, data: dia(1), hora: '10:00', filmmaker: 'Luís', equipe: 'Luís', status: 'agendado', qtdVideosPlanejados: 2, criadoEm: agora, excluido: false });
  await seed.set('postagens', 'j39-post', { cliente: SLUG, clienteNome: NOME, titulo: 'Ensaio J39 — post do cliente que saiu', legenda: 'Legenda J39', status: 'agendado', dataAgendada: dia(-2), horaAgendada: '10:00', origemManual: true, excluido: false, criadoEm: agora });
  const demandas = async () => (await seed.listar('demandas')).filter(d => d.cliente === SLUG || String(d.clienteNome || '') === NOME || d.postagemId === 'j39-post');
  const logsKit = async () => (await seed.listar('log_automacoes')).filter(l => l.tipo === 'kit_gravacao_enviado').length;

  const rodada = async (r) => {
    await seed.set('sistema', 'motor_lock', { ultimaExecucao: 'liberado-pelo-ensaio', ultimaManutencaoDia: '2000-01-01' });
    await seed.set('sistema', 'kits_gravacao', { ultimaData: '2000-01-01' });
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Chris');
      await esperar(async () => (await seed.get('sistema', 'motor_lock'))?.ultimaManutencaoDia === hoje() && (await seed.get('sistema', 'kits_gravacao'))?.ultimaData === hoje());
      await page.waitForTimeout(4000);
      await foto(page, 'J39-rodada' + r);
      return erros.filter(erroGrave);
    } finally { await fechar(); }
  };
  const t0 = Date.now();
  try {
    const kitsAntes = await logsKit();
    const graves1 = await rodada(1);
    const d1 = await demandas();
    const pend = d1.filter(d => d.tipoEspecial === 'pendencias_cliente_saiu_aud');
    const confirmar = d1.filter(d => /Confirmar publicação/.test(d.titulo || ''));
    const kits = (await logsKit()) - kitsAntes;
    const quem = [...new Set(pend.map(d => d.destinatario))].sort().join(', ');
    const cobreTudo = ['Cecília', 'Amanda'].every(q => pend.some(d => d.destinatario === q && /Gravação/.test(d.descricao) ) && pend.some(d => d.destinatario === q && /Ensaio J39 — post/.test(d.descricao)));
    const graves2 = await rodada(2);
    const repetiu = (await demandas()).filter(d => d.tipoEspecial === 'pendencias_cliente_saiu_aud').length !== pend.length;
    const graves = [...graves1, ...graves2];
    const ok = !confirmar.length && kits === 0 && quem === 'Amanda, Cecília' && cobreTudo && !repetiu && !graves.length;
    registrar({ jornada: id, caso: 'Motor roda 2× com cliente encerrado pendurado', ok, ms: Date.now() - t0,
      detalhe: `kit enviado: ${kits} · "Confirmar publicação": ${confirmar.length} · pendências para: ${quem || 'ninguém'} (${pend.length} demandas${cobreTudo ? ', gravação e postagem listadas' : ', faltou item'}) · 2ª rodada ${repetiu ? 'REPETIU' : 'não repetiu'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { registrar({ jornada: id, caso: 'Motor roda 2× com cliente encerrado pendurado', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 260) }); }
}
