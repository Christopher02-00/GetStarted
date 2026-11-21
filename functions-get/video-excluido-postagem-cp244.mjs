// CP244 (21/11/2026, Programa Estabilidade — Raio-X da produção): excluir um vídeo deixava a postagem dele viva para sempre.
// Caso real: Camargo's "Não olhe! (antes e depois)" — cliente pediu ajuste depois de aprovar (postagem → em_correcao), o editor
// excluiu o vídeo em 09/10 ("Vai ser regravado") e a postagem ficou em_correcao há 6 semanas, sem dono (o I165 trata vídeo excluído
// como "fora do escopo" e não gera aviso; a retirada do servidor não aceita em_correcao).
// Agora, por qualquer caminho de exclusão (editor, gerência, Lixeira), este gatilho:
//  • postagem ainda antes da rede (em_correcao, aguardando_reconfirmacao_cliente, aguardando_legenda, aguardando_agendamento)
//    → arquivada_sem_postagem com o motivo e a marca `encerradaPorVideoExcluidoCp244` (etapa anterior guardada);
//  • postagem já agendada na rede → não mexe (está na plataforma); cria UMA demanda para a Cecília tirar do agendamento;
//  • vídeo recuperado da Lixeira → a postagem encerrada por este gatilho volta para a etapa anterior; a demanda aberta fecha.
// Não mexe no calendário (o conteúdo continua previsto — ex.: será regravado), em pedidos de cliente nem em postagens já publicadas.
export const ETAPAS_ANTES_DA_REDE_CP244 = Object.freeze(['em_correcao', 'aguardando_reconfirmacao_cliente', 'aguardando_legenda', 'aguardando_agendamento']);
export const TIPO_DESAGENDAR_CP244 = 'desagendar_video_excluido_cp244';
export const idDemandaDesagendarCp244 = postagemId => 'desagendar_video_excluido_cp244_' + String(postagemId).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 300);
const dataBr = d => d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const excluido = v => !!v && v.excluido === true;

/** Que mudança do vídeo interessa a este gatilho? */
export function eventoVideoCp244(antes, depois) {
  if (!excluido(antes) && excluido(depois)) return 'excluido';
  if (excluido(antes) && depois && !excluido(depois)) return 'recuperado';
  return '';
}

/** A postagem que pertence a este vídeo (mesma identidade dos dois lados). */
export function postagemDoVideoCp244(videoId, v) {
  return String(v?.postagemId || '').trim() || 'video_' + videoId;
}

export function demandaDesagendarCp244(postagemId, p, v, agora) {
  const cliente = String(p.clienteNome || p.cliente || v?.clienteNome || 'Cliente'), titulo = String(p.titulo || v?.titulo || 'Vídeo');
  const quando = [p.dataAgendada, p.horaAgendada].filter(Boolean).join(' às ');
  return {
    titulo: '🗑️ Tirar do agendamento · ' + cliente + ' · ' + titulo,
    descricao: 'O vídeo desta postagem foi para a Lixeira' + (v?.excluidoPor ? ' (' + v.excluidoPor + ')' : '') + ', mas ela já está agendada na rede'
      + (quando ? ' para ' + quando : '') + '.\nTire o agendamento na plataforma e depois retire a postagem na sua fila.'
      + (v?.motivoExclusao ? '\n\nMotivo da exclusão: "' + String(v.motivoExclusao).slice(0, 500) + '"' : '')
      + '\n\nSe foi engano, a Amanda recupera o vídeo na Lixeira (Gerência → Vídeos → Lixeira) e esta tarefa fecha sozinha.',
    destinatario: 'Cecília', remetente: 'Sistema', origem: 'sistema', status: 'pendente', ehAviso: true,
    tipoEspecial: TIPO_DESAGENDAR_CP244, postagemId: String(postagemId),
    cliente: String(p.cliente || ''), clienteNome: cliente,
    prazoData: dataBr(agora), prazoHora: '18:00', provaTexto: '', provaImagemUrl: '',
    criadoEm: agora, excluido: false,
    origemCp244: { schema: 1, postagemId: String(postagemId), videoId: String(p.videoId || ''), dataAgendada: String(p.dataAgendada || '') }
  };
}

/** Aplica a regra para um vídeo (idempotente: reprocessar não duplica, não reabre e não desfaz decisão de pessoa). */
export async function sincronizarPostagemVideoExcluidoCp244(db, videoId, { agora = new Date() } = {}) {
  if (!videoId) return { acao: 'nada' };
  const vRef = db.doc('videos_producao/' + videoId);
  return db.runTransaction(async tx => {
    const vs = await tx.get(vRef); if (!vs.exists) return { acao: 'nada' };
    const v = vs.data(), postagemId = postagemDoVideoCp244(videoId, v), pRef = db.doc('postagens/' + postagemId), dRef = db.doc('demandas/' + idDemandaDesagendarCp244(postagemId));
    const [ps, ds] = await Promise.all([tx.get(pRef), tx.get(dRef)]);
    const p = ps.exists ? ps.data() : null, d = ds.exists ? ds.data() : null, em = agora.toISOString();
    if (!p || String(p.videoId || '') !== String(videoId) || p.excluido === true) return { acao: 'nada' };
    if (excluido(v)) {
      if (ETAPAS_ANTES_DA_REDE_CP244.includes(p.status)) {
        const motivo = 'Vídeo excluído' + (v.excluidoPor ? ' por ' + v.excluidoPor : '') + (v.motivoExclusao ? ': ' + String(v.motivoExclusao).slice(0, 500) : '.');
        tx.update(pRef, { status: 'arquivada_sem_postagem', arquivadaPor: 'Sistema (vídeo excluído)', arquivadaEm: em, notaCorrecao: motivo,
          encerradaPorVideoExcluidoCp244: { schema: 1, statusAnterior: p.status, videoId: String(videoId), excluidoPor: String(v.excluidoPor || ''), em },
          historico: [...(Array.isArray(p.historico) ? p.historico : []), { acao: 'Encerrada: o vídeo foi para a Lixeira', por: 'Sistema', em, detalhe: motivo }] });
        return { acao: 'encerrada', statusAnterior: p.status };
      }
      if (p.status === 'agendado' && !d) { tx.create(dRef, demandaDesagendarCp244(postagemId, p, v, agora)); return { acao: 'demanda_cecilia' }; }
      return { acao: 'nada' };
    }
    // vídeo de volta: só desfaz o que este gatilho fez
    let acao = 'nada';
    const marca = p.encerradaPorVideoExcluidoCp244;
    if (p.status === 'arquivada_sem_postagem' && marca?.schema === 1 && marca.videoId === String(videoId) && ETAPAS_ANTES_DA_REDE_CP244.includes(marca.statusAnterior)) {
      tx.update(pRef, { status: marca.statusAnterior, arquivadaPor: '', arquivadaEm: '', notaCorrecao: '', encerradaPorVideoExcluidoCp244: null,
        historico: [...(Array.isArray(p.historico) ? p.historico : []), { acao: 'Reaberta: o vídeo voltou da Lixeira', por: 'Sistema', em, detalhe: 'Etapa restaurada: ' + marca.statusAnterior }] });
      acao = 'reaberta';
    }
    if (d && d.status === 'pendente' && d.tipoEspecial === TIPO_DESAGENDAR_CP244) {
      const nota = 'O vídeo voltou da Lixeira; o agendamento continua valendo.';
      tx.update(dRef, { status: 'aprovada', concluidoPor: 'Sistema', concluidoEm: agora, notaConclusao: nota, provaTexto: nota });
      acao = acao === 'nada' ? 'demanda_fechada' : acao;
    }
    return { acao };
  });
}

/** Ponto único do gatilho: nunca derruba a operação de origem. */
export async function acompanharVideoExcluidoCp244(db, videoId, antes, depois) {
  try {
    if (!eventoVideoCp244(antes, depois)) return { acao: 'nada' };
    return await sincronizarPostagemVideoExcluidoCp244(db, videoId);
  } catch (e) { console.error('CP244 postagem de vídeo excluído:', videoId, e?.message || e); return { acao: 'erro' }; }
}
