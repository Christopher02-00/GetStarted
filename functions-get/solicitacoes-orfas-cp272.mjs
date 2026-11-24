// CP272 (24/11/2026, ok nominal do Chris). A faxina do servidor fecha, com nota, o pedido de mudança à Amanda que ficou pendente depois de a
// postagem sair da operação (ninguém consegue mais decidi-lo). Idempotente e reversível: grava o estado anterior em `encerramentoCp272`;
// desfazer = voltar `estado` para 'pendente' e apagar `encerramentoCp272`. Pedido de postagem ainda na operação nunca é tocado.
import {postagemDecidivelCp272, situacaoPostagemCp272, POR_CP272} from './lib/gs-solicitacoes-orfas-cp272.mjs';

export async function encerrarSolicitacoesOrfasCp272(db, {agora = new Date(), semTempo = () => false, limite = 200} = {}) {
  const q = await db.collection('programacao_solicitacoes_i165').where('estado', '==', 'pendente').limit(limite).get();
  const encerradas = [], erros = [];
  for (const d of q.docs) {
    if (semTempo()) break;
    try {
      const r = await db.runTransaction(async tx => {
        const s = await tx.get(d.ref);
        if (!s.exists || s.data().estado !== 'pendente') return 'nada';
        const x = s.data(), ps = x.postagemId ? await tx.get(db.doc('postagens/' + x.postagemId)) : null, p = ps?.exists ? ps.data() : null;
        if (postagemDecidivelCp272(p)) return 'ativa';
        tx.update(d.ref, {estado: 'encerrada_sem_decisao', encerramentoCp272: {schema: 1, por: POR_CP272, em: agora.toISOString(), estadoAnterior: 'pendente',
          situacaoPostagem: situacaoPostagemCp272(p), motivo: 'A postagem saiu da operação antes da decisão da Amanda; não há mais o que decidir.'}});
        return 'encerrada';
      });
      if (r === 'encerrada') encerradas.push(d.id);
    } catch (e) { erros.push({id: d.id, etapa: 'solicitacoes_orfas_cp272', erro: String(e?.message || e).slice(0, 200)}); }
  }
  return {encerradas, erros};
}
