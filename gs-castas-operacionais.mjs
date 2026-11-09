// Castas operacionais — classificação dos clientes (mensalista/avulso/interno/encerrado/indefinido) para a equipe
// sem abrir coleções financeiras. Ficha: fichas/2026-11-09-casta-cecilia-projecao.md (P1 / F-12).
//
// Quem escreve: o navegador da gerência (Chris/Amanda), que já pode ler contratos e mensalidades, depois de
// classificar com sucesso. Grava só o que mudou e nunca apaga. Quem lê: papéis operacionais (Cecília e equipe).
// Só sai tipo + origem (texto qualitativo, sem valores). As rules validam os campos.

export const COLECAO_CASTAS_OPERACIONAIS = 'castas_operacionais';
export const TIPOS_CASTA = Object.freeze(['interno', 'mensalista', 'avulso', 'encerrado', 'indefinido']);
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const LIMITE_LOTE = 450;

export function criarCastasOperacionais({ db, collection, getDocs, doc, writeBatch, serverTimestamp, quem }) {
  // Falha de leitura sobe como erro: o chamador decide (nunca vira "ninguém é mensalista").
  async function ler() {
    const snap = await getDocs(collection(db, COLECAO_CASTAS_OPERACIONAIS));
    const m = {};
    snap.forEach(d => {
      const v = d.data() || {};
      if (SLUG.test(d.id) && TIPOS_CASTA.includes(v.tipo)) m[d.id] = { tipo: v.tipo, origem: String(v.origem || '') };
    });
    return m;
  }

  // Devolve quantos documentos gravou (0 = projeção já igual).
  async function publicar(casta) {
    const atual = await ler();
    const lote = writeBatch(db);
    let n = 0;
    for (const [slug, c] of Object.entries(casta || {})) {
      if (!SLUG.test(slug) || !TIPOS_CASTA.includes(c?.tipo)) continue;
      const origem = String(c.origem || '').slice(0, 120);
      if (atual[slug]?.tipo === c.tipo && atual[slug]?.origem === origem) continue;
      lote.set(doc(db, COLECAO_CASTAS_OPERACIONAIS, slug), { tipo: c.tipo, origem, atualizadoEm: serverTimestamp(), atualizadoPor: quem() });
      if (++n >= LIMITE_LOTE) break; // o restante entra na próxima abertura da gerência
    }
    if (n) await lote.commit();
    return n;
  }

  return { ler, publicar };
}
