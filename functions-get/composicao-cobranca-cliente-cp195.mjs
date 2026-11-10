// CP195 (10/11/2026, pedido do Chris) — o Portal do pagador de uma cobrança agrupada mostra quanto é de cada empresa.
// Somente leitura. Confere a sessão + token do link (mesma decisão das rules, CP193) e devolve, para cada mensalidade do
// próprio pagador a partir do `desde` do grupo: valor total, parte do pagador e a parte de cada empresa coberta.
// A conta é a mesma do escritório (financeiro-core.mjs → projetarGruposCobranca): partePagador = valor − soma das partes.
import {conferirAcessoClienteTxCp193} from './pedido-ajuste-cliente-cp193.mjs';

export const ACOES_COMPOSICAO_COBRANCA_CP195 = Object.freeze(['cliente_cobranca_composicao_cp195']);
const falha = (code, msg) => Object.assign(new Error(msg), { code });

export async function composicaoCobrancaClienteCp195(db, auth, dados, { agora = new Date() } = {}) {
  if (!dados || !ACOES_COMPOSICAO_COBRANCA_CP195.includes(dados.acao)) throw falha('cp195/entrada', 'Consulta inválida.');
  return db.runTransaction(async tx => {
    const { slug } = await conferirAcessoClienteTxCp193(db, tx, auth?.uid, agora);
    const cfg = (await tx.get(db.doc('config_financeiro/cobranca_agrupada'))).data() || {};
    const grupos = (Array.isArray(cfg.grupos) ? cfg.grupos : []).filter(g => g && g.ativo !== false && g.excluido !== true && g.pagador === slug);
    if (!grupos.length) return { schema: 1, cliente: slug, composicoes: [] };
    const pags = await tx.get(db.collection('pagamentos_mensais').where('cliente', '==', slug));
    const membros = [...new Set(grupos.flatMap(g => (g.membros || []).map(m => m.slug || m.canonicalId)).filter(Boolean))];
    const nomes = new Map();
    for (const m of [slug, ...membros]) { const e = await tx.get(db.doc('clientes_extras/' + m)); nomes.set(m, String(e.data()?.nome || m)); }
    const composicoes = [];
    for (const d of pags.docs) {
      const p = d.data(), comp = String(p.competencia || '');
      const g = grupos.find(x => /^20\d{2}-(0[1-9]|1[0-2])$/.test(x.desde || '') && comp >= x.desde);
      if (!g || ['isento', 'cancelado'].includes(String(p.status || ''))) continue;
      const valor = Number(p.valorDevido || 0);
      const partes = (g.membros || []).map(m => ({ cliente: m.slug || m.canonicalId, nome: nomes.get(m.slug || m.canonicalId) || m.slug, parte: Number(m.parte || 0) }));
      const soma = partes.reduce((t, x) => t + x.parte, 0);
      if (!(valor > 0) || valor - soma < 0) continue; // conta que não fecha não é mostrada ao cliente (o escritório aponta o conflito)
      composicoes.push({ pagamentoId: d.id, competencia: comp, valor, partePagador: valor - soma, nomePagador: nomes.get(slug), partes, grupo: String(g.nome || g.id || '') });
    }
    composicoes.sort((a, b) => a.competencia.localeCompare(b.competencia));
    return { schema: 1, cliente: slug, composicoes };
  });
}
