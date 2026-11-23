// CP263 (23/11/2026, pedido do Chris: "tudo que for antigo do mês passado vc pode concluir … não quero que deixe nada que não é desse mês"
// + "demandas que chegam e que nunca saem"; aprovado na caixa de perguntas: "Encerrar todos"). Na rodada da faxina CP248:
//  1. REGRA (para não voltar): aviso "X está esperando você" (CP149, tipoEspecial 'aguardando_resposta') ainda aberto cuja demanda de ORIGEM
//     já está encerrada (aprovada, cancelada), apagada/arquivada ou não existe → o aviso fecha, com a nota do motivo. A espera acabou.
//     (Em 22/11: 8 de 10 avisos presos da Amanda apontavam para origens já aprovadas; 1 para origem apagada.)
//  2. REGRA: decisão "liberar pular a legenda?" (tipoEspecial 'pular_legenda') ainda aberta cuja POSTAGEM já está encerrada (cancelada,
//     arquivada, postada, finalizada), apagada ou não existe → fecha. Não há mais o que decidir. (Em 22/11: 4 de agosto, todas canceladas.)
//  3. ENCERRAMENTO AUTORIZADO (uma vez): os 18 itens antigos listados ao Chris em 23/11 (17 da Amanda, agosto–outubro, e 1 da Cecília)
//     fecham com a nota da autorização. Só se ainda estiverem abertos; nada além desta lista é encerrado por autorização.
// Cada fechamento é uma transação que relê o documento (idempotente). Status 'aprovada' (como a CP245), com marca `encerramentoCp263`.
export const POR_CP263 = 'Sistema (encerramento automático)';
const ABERTO = ['pendente', 'concluida_aguardando_aprovacao'];
const ORIGEM_ENCERRADA = ['aprovada', 'cancelada', 'cancelada_automaticamente', 'cancelado', 'cancelado_automaticamente'];
const POSTAGEM_ENCERRADA = ['cancelada_manual', 'arquivada_sem_postagem', 'cancelada_video_trafego', 'postado', 'finalizado'];
export const NOTA_AUTORIZADO_CP263 = 'Item antigo (mês passado ou antes), encerrado por autorização do Chris em 23/11/2026.';
export const AUTORIZADOS_CP263 = Object.freeze([
  'MqVDd2fs2wR33s2sscPG', 'emSnHtw7QjujLcUtdUQw', 'i53_ee3d63e3dd8a4c27936e09be339db36e_saida', 'bkgkOeq0SaNfdtRPcq8h', 'xGZbmFjp6fHWAJpLgcPz',
  'Aino1OSTAgT2yvGMUuRg', 'sDrK8Y92zquBHgk2iZcr', 'dzLngOK7snnugnPZBO8o', 'xIzeIxS7iBQckUnNlUCj', 'clahD4C4LsRo0zQTdjXG', 'lMaCf0ouruOReeUlaGXf',
  'BYgYgYKuw3xWRB6gM10z', 'QMhtBP80w1hN6NWMz3zs', 'SaCeOsMEr7BpVsoNGZ71', 'CNYwJPJ5QtjZ64o0h8iZ', 'KXfjjGE5BFqzJOW19WoR', 'xQiQXtJcN75dUeKBjmX2',
  '1nJMsh2fqwqwtfD2U4wF'
]);

const aberto = d => !!d && d.excluido !== true && !d.arquivado && ABERTO.includes(d.status);

/** Motivo pelo qual o aviso/decisão pode fechar sozinho (só olha os documentos), ou null. */
export function motivoEncerramentoCp263(d, fonte) {
  if (!aberto(d)) return null;
  if (d.tipoEspecial === 'aguardando_resposta' && typeof d.demandaOrigemId === 'string' && d.demandaOrigemId) {
    if (!fonte) return 'A tarefa de origem não existe mais; a espera acabou.';
    if (fonte.excluido === true || fonte.arquivado) return 'A tarefa de origem foi apagada; a espera acabou.';
    if (ORIGEM_ENCERRADA.includes(fonte.status)) return 'A tarefa de origem já foi encerrada; a espera acabou.';
    return null;
  }
  if (d.tipoEspecial === 'pular_legenda' && typeof d.postagemId === 'string' && d.postagemId) {
    if (!fonte) return 'A postagem não existe mais; não há o que decidir.';
    if (fonte.excluido === true || fonte.arquivado) return 'A postagem foi apagada; não há o que decidir.';
    if (POSTAGEM_ENCERRADA.includes(fonte.status)) return 'A postagem já foi encerrada; não há o que decidir.';
    return null;
  }
  return null;
}

const refFonte = (db, d) => d.tipoEspecial === 'aguardando_resposta' ? db.doc('demandas/' + d.demandaOrigemId) : d.tipoEspecial === 'pular_legenda' ? db.doc('postagens/' + d.postagemId) : null;

/** Fecha UM item (relê tudo na transação). tipo: 'regra' | 'autorizado'. */
export async function encerrarItemCp263(db, id, {agora = new Date(), tipo = 'regra'} = {}) {
  const ref = db.doc('demandas/' + id);
  return db.runTransaction(async tx => {
    const s = await tx.get(ref), d = s.exists ? s.data() : null;
    if (!aberto(d)) return {acao: 'nada'};
    let motivo = null;
    if (tipo === 'autorizado') { if (!AUTORIZADOS_CP263.includes(id)) return {acao: 'nada'}; motivo = NOTA_AUTORIZADO_CP263; }
    else { const rf = refFonte(db, d); const f = rf ? await tx.get(rf) : null; motivo = rf ? motivoEncerramentoCp263(d, f?.exists ? f.data() : null) : null; if (!motivo) return {acao: 'nada'}; }
    tx.update(ref, {status: 'aprovada', concluidoPor: d.concluidoPor || POR_CP263, concluidoEm: d.concluidoEm || agora, notaConclusao: motivo,
      encerramentoCp263: {schema: 1, tipo, em: agora.toISOString(), statusAnterior: d.status, motivo}});
    return {acao: 'encerrado', motivo};
  });
}

/** Rodada: autorizados (uma vez) + regras (sempre). Nunca para no primeiro erro. */
export async function executarEncerramentosCp263(db, {agora = new Date(), semTempo = () => false} = {}) {
  const r = {encerrados: [], erros: []};
  for (const id of AUTORIZADOS_CP263) {
    if (semTempo()) break;
    try { const x = await encerrarItemCp263(db, id, {agora, tipo: 'autorizado'}); if (x.acao === 'encerrado') r.encerrados.push({id, tipo: 'autorizado'}); }
    catch (e) { r.erros.push({id, etapa: 'autorizado_cp263', erro: String(e?.message || e).slice(0, 200)}); }
  }
  for (const tipoEspecial of ['aguardando_resposta', 'pular_legenda']) {
    for (const status of ABERTO) {
      const q = await db.collection('demandas').where('tipoEspecial', '==', tipoEspecial).where('status', '==', status).get();
      for (const s of q.docs) {
        if (semTempo()) return r;
        const d = s.data(), rf = refFonte(db, d); if (!rf) continue;
        const f = await rf.get(); if (!motivoEncerramentoCp263(d, f.exists ? f.data() : null)) continue;
        try { const x = await encerrarItemCp263(db, s.id, {agora, tipo: 'regra'}); if (x.acao === 'encerrado') r.encerrados.push({id: s.id, tipo: tipoEspecial}); }
        catch (e) { r.erros.push({id: s.id, etapa: 'regra_cp263', erro: String(e?.message || e).slice(0, 200)}); }
      }
    }
  }
  return r;
}
