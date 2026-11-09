// J17 — Conciliador V118 para de insistir no mesmo vídeo (P6/D-01).
// Vídeo aprovado pelo cliente cuja postagem canônica foi arquivada por outro motivo: a V118 recusa reativar.
// Antes, o motor tentava em toda rodada para sempre (196 logs de um só vídeo em produção). Agora: 3 recusas,
// um aviso `postagem_orfa_suspensa`, e as rodadas seguintes não tentam mais.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J17';
export const nome = 'Conciliador V118: para de tentar um vídeo depois de 3 recusas';

const VIDEO = 'j17-video-orfao';
const RODADAS = 5;
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const esperar = async (fn, ms = 60000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1500)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('videos_producao', VIDEO, {
    cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Ensaio J17 vídeo com postagem arquivada', data: hoje(),
    status: 'aprovado', clienteAprovou: true, postagemId: 'video_' + VIDEO, excluido: false,
  });
  await seed.set('postagens', 'video_' + VIDEO, {
    videoId: VIDEO, cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Ensaio J17 vídeo com postagem arquivada',
    status: 'aguardando_legenda', excluido: true, motivoExclusao: 'Arquivada pela gestão (ensaio J17)',
  });
  const logsDoVideo = async tipo => (await seed.listar('log_automacoes')).filter(l => l.tipo === tipo && l.alvo === VIDEO).length;

  const t0 = Date.now(); let detalhes = [], ok = true;
  for (let r = 1; r <= RODADAS; r++) {
    // libera a trava de 60 min do motor e força a manutenção diária (é nela que a conciliação roda, 1×/dia em produção)
    await seed.set('sistema', 'motor_lock', { ultimaExecucao: 'liberado-pelo-ensaio', ultimaManutencaoDia: '2000-01-01' });
    const antes = await logsDoVideo('postagem_orfa_bloqueada');
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      await entrarComo(page, amb.url(), 'Chris');
      const esperado = r <= 3 ? 1 : 0;
      // sinal de fim: o log novo deste vídeo (rodadas 1–3) ou o motor registrar a manutenção do dia (4–5); limite de 120 s
      await esperar(async () => (await logsDoVideo('postagem_orfa_bloqueada')) > antes ||
        (await seed.get('sistema', 'motor_lock'))?.ultimaManutencaoDia === hoje(), 120000);
      if (!esperado) await page.waitForTimeout(5000);
      const depois = await logsDoVideo('postagem_orfa_bloqueada');
      // a recusa do próprio conciliador é o cenário deste teste (rodadas 1–3); qualquer outro erro continua grave
      const graves = erros.filter(erroGrave).filter(e => !/V118: órfão preservado para conferência/.test(e));
      detalhes.push(`r${r}:+${depois - antes}`);
      if (depois - antes !== esperado || graves.length) { ok = false; if (graves.length) detalhes.push(graves[0]); }
    } finally { await foto(page, `J17-rodada${r}`); await fechar(); }
  }
  const suspensos = await logsDoVideo('postagem_orfa_suspensa');
  const cont = (await seed.get('sistema', 'conciliador_orfas_v118'))?.recusas?.[VIDEO]?.n;
  registrar({ jornada: id, caso: `${RODADAS} rodadas do motor: tenta 3 vezes e para`, ok: ok && suspensos === 1 && cont === 3, ms: Date.now() - t0,
    detalhe: `${detalhes.join(' ')} · avisos de suspensão: ${suspensos} · contador: ${cont ?? 'ausente'}` });
}
