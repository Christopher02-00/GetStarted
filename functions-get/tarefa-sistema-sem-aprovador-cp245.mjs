// CP245 (21/11/2026, Programa Estabilidade — Raio-X da produção): tarefa do sistema concluída pela Amanda ficava "aguardando aprovação"
// para sempre. Quem aprova uma entrega é decidido por `aprovacaoEhDe` (escritorio.html): origem 'sistema' → Amanda; e a Amanda não aprova a
// própria entrega (a lista dela exclui o que é dela). Resultado: ninguém aprova. Retrato de 21/11: 143 tarefas assim (agosto–setembro;
// ex.: "🎬 Distribuir 3 vídeos pros editores", "📸 Aprovar os stories de …") e 2 de hoje (alerta de cobertura, conferência de campanha).
// As rules só deixam a própria pessoa fechar direto um AVISO (ehAviso/origem cliente); por isso o fechamento é feito aqui, no servidor:
// a entrega da Amanda numa tarefa do sistema vira 'aprovada', com a nota e a marca `fechamentoSemAprovadorCp245`. A prova dela fica intacta.
// Fora (têm revisor próprio ou outro fluxo): avisos, espera CP149, providência CP140, organização/planejamento (CP154/I155), pedidos do cliente.
export const TIPOS_COM_REVISOR_PROPRIO_CP245 = Object.freeze(['aguardando_resposta', 'providencia_gravacao_cp140', 'organizacao_social_i167', 'planejamento_social_i155']);
export const NOTA_CP245 = 'Tarefa do sistema concluída pela Amanda — não há outra pessoa para aprovar.';

/** A entrega está esperando uma aprovação que ninguém pode dar? */
export function semAprovadorCp245(d) {
  return !!d && d.excluido !== true && !d.arquivado && d.status === 'concluida_aguardando_aprovacao'
    && String(d.origem || '').trim().toLowerCase() === 'sistema' && d.destinatario === 'Amanda'
    && d.ehAviso !== true && !String(d.demandaClienteId || '').trim() && !TIPOS_COM_REVISOR_PROPRIO_CP245.includes(d.tipoEspecial);
}

/** Fecha a entrega (idempotente: relê na transação; só age se ainda estiver presa). */
export async function fecharSemAprovadorCp245(db, demandaId, { agora = new Date() } = {}) {
  const ref = db.doc('demandas/' + demandaId);
  return db.runTransaction(async tx => {
    const s = await tx.get(ref); const d = s.exists ? s.data() : null;
    if (!semAprovadorCp245(d)) return { acao: 'nada' };
    tx.update(ref, { status: 'aprovada', concluidoPor: d.concluidoPor || 'Amanda', concluidoEm: d.concluidoEm || agora, notaConclusao: NOTA_CP245,
      fechamentoSemAprovadorCp245: { schema: 1, em: agora.toISOString(), statusAnterior: d.status } });
    return { acao: 'fechada' };
  });
}

/** Ponto único do gatilho: nunca derruba a operação de origem. */
export async function acompanharSemAprovadorCp245(db, demandaId, antes, depois) {
  try {
    if (!semAprovadorCp245(depois)) return { acao: 'nada' };
    return await fecharSemAprovadorCp245(db, demandaId);
  } catch (e) { console.error('CP245 tarefa do sistema sem aprovador:', demandaId, e?.message || e); return { acao: 'erro' }; }
}
