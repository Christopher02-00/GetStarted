// CP214 (13/11/2026, proposta da Amanda aprovada pelo Chris): vídeo aprovado que não tem conteúdo no calendário ganha um
// caminho próprio de legenda — UMA demanda para a Amanda por postagem (chave = id da postagem), com o link para assistir.
// Saídas (todas pelas telas que já existem): escrever a legenda na fila (vai para a Cecília agendar), ligar ao conteúdo do
// calendário (CP207) ou encerrar sem publicar (CP211). A demanda fecha sozinha, com o motivo, quando a postagem anda —
// por qualquer caminho, inclusive pela fila (sem demanda órfã). Não mexe no calendário, em reabertura nem em pedidos de cliente.
export const TIPO_LEGENDA_SEM_VINCULO_CP214 = 'legenda_sem_vinculo_cp214';
export const idDemandaLegendaCp214 = postagemId => 'legenda_sem_vinculo_cp214_' + String(postagemId).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 300);
const dataBr = d => d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const mesDe = v => /^\d{4}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 7) : '';

/** A postagem está parada esperando legenda sem nenhum conteúdo do calendário? */
export function semVinculoAguardandoLegendaCp214(p) {
  return !!p && p.excluido !== true && !p.arquivado && p.status === 'aguardando_legenda' && (!!String(p.videoId || '').trim() || p.origemManual === true)
    && !String(p.calendarItemId || '').trim() && !p.referenciaLegendaI78 && p.origemForaCalendario !== true;
}

/** Por que a demanda deixou de ser necessária (texto que fica registrado ao fechar). */
export function motivoFechamentoCp214(p) {
  if (!p || p.excluido === true || p.arquivado) return 'A postagem foi retirada da fila.';
  if (String(p.calendarItemId || '').trim() || p.referenciaLegendaI78) return 'O vídeo foi ligado a um conteúdo do calendário; a legenda segue pelo calendário.';
  if (p.origemForaCalendario === true && p.status === 'aguardando_legenda') return 'O vídeo foi confirmado como conteúdo fora do calendário.';
  if (['aguardando_agendamento', 'agendado', 'postado'].includes(p.status)) return 'Legenda escrita' + (p.legendaPor ? ' por ' + p.legendaPor : '') + ' e enviada para a Cecília agendar.';
  if (['arquivada_sem_postagem', 'cancelada_manual', 'cancelada', 'arquivada_sem_legenda'].includes(p.status)) return 'Não vai para o feed' + (p.notaCorrecao ? ': ' + String(p.notaCorrecao).slice(0, 500) : '.');
  return 'A postagem saiu da fila de legenda (' + String(p.status || 'sem etapa') + ').';
}

export function demandaLegendaCp214(postagemId, p, video, agora) {
  const cliente = String(p.clienteNome || p.cliente || 'Cliente'), titulo = String(p.titulo || video?.titulo || 'Vídeo');
  const mes = mesDe(video?.calendarCompetencia) || mesDe(video?.data) || mesDe(p.dataAgendada) || '';
  const link = String(p.linkVideo || video?.linkFinalizado || '');
  return {
    titulo: 'Legenda · ' + cliente + ' · ' + titulo,
    descricao: 'Vídeo aprovado sem conteúdo no calendário. Escolha uma saída:\n'
      + '• Escrever a legenda — vai direto para a Cecília agendar.\n'
      + '• Este vídeo é de um conteúdo do calendário — ligue ao conteúdo e use a legenda do calendário.\n'
      + '• Não vai para o feed (tráfego ou entrega direta) — encerre sem publicar.\n\n'
      + 'Cliente: ' + cliente + (mes ? '\nMês: ' + mes : '') + (p.dataAgendada ? '\nData prevista: ' + p.dataAgendada : '') + (link ? '\nAssistir: ' + link : ''),
    destinatario: 'Amanda', remetente: 'Sistema', origem: 'sistema', status: 'pendente',
    tipoEspecial: TIPO_LEGENDA_SEM_VINCULO_CP214, postagemId: String(postagemId),
    cliente: String(p.cliente || ''), clienteNome: cliente, ...(link ? { linkAnexo: link } : {}),
    prazoData: dataBr(agora), prazoHora: '18:00', provaTexto: '', provaImagemUrl: '',
    criadoEm: agora, excluido: false,
    // sem `videoId` no topo: o limpador antifantasma do Escritório fecha demandas com vídeo já fora da edição.
    origemCp214: { schema: 1, postagemId: String(postagemId), videoId: String(p.videoId || ''), mes }
  };
}

/** Cria ou fecha a demanda desta postagem (idempotente: reprocessar não duplica nem reabre). */
export async function sincronizarDemandaLegendaCp214(db, postagemId, { agora = new Date() } = {}) {
  if (!postagemId) return { acao: 'nada' };
  const pRef = db.doc('postagens/' + postagemId), dRef = db.doc('demandas/' + idDemandaLegendaCp214(postagemId));
  return db.runTransaction(async tx => {
    const [ps, ds] = await Promise.all([tx.get(pRef), tx.get(dRef)]);
    const p = ps.exists ? ps.data() : null, d = ds.exists ? ds.data() : null;
    if (semVinculoAguardandoLegendaCp214(p)) {
      if (d) return { acao: 'ja_existe' };
      const vs = p.videoId ? await tx.get(db.doc('videos_producao/' + p.videoId)) : null, v = vs?.exists ? vs.data() : null;
      if (v && (v.excluido === true || v.status !== 'aprovado')) return { acao: 'nada' };
      tx.create(dRef, demandaLegendaCp214(postagemId, p, v, agora));
      return { acao: 'criada' };
    }
    if (d && d.status === 'pendente' && d.tipoEspecial === TIPO_LEGENDA_SEM_VINCULO_CP214) {
      const motivo = motivoFechamentoCp214(p);
      tx.update(dRef, { status: 'aprovada', concluidoPor: 'Sistema', concluidoEm: agora, notaConclusao: motivo, provaTexto: motivo,
        fechamentoCp214: { schema: 1, motivo, statusPostagem: String(p?.status || 'ausente'), em: agora.toISOString() } });
      return { acao: 'fechada', motivo };
    }
    return { acao: 'nada' };
  });
}

/** Ponto único do gatilho: nunca derruba a operação de origem. */
export async function acompanharLegendaCp214(db, postagemId, antes, depois) {
  try {
    if (!semVinculoAguardandoLegendaCp214(depois) && !semVinculoAguardandoLegendaCp214(antes)) return { acao: 'nada' };
    return await sincronizarDemandaLegendaCp214(db, postagemId);
  } catch (e) { console.error('CP214 demanda de legenda sem vínculo:', postagemId, e?.message || e); return { acao: 'erro' }; }
}
