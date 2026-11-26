// GUARDIÃO · Sexta-Feira (Fase 1, 26/11/2026)
// Puro e sem dependências: recebe o Cofre (regras.json) e itens de calendário, devolve achados com o TRECHO EXATO.
// Não lê nem grava nada. O mesmo código roda no CI (gabarito), no vigia do GitHub (dados reais) e na página do Escritório.
// Regra de ouro: só itens ATIVOS (sem excluido/retirado). Texto do cliente = título + roteiro antes de "── PARA A EQUIPE" + legendas + preparação.

const CAMPOS_LEGENDA = ['legenda', 'legendaInstagram', 'legendaTiktok', 'legendaYoutube', 'legendaLinkedin'];
const MARCA_EQUIPE = /──\s*PARA A EQUIPE/i;

export function ativo(i) { return !!i && !i.excluido && !i.retirado; }

/** Separa o texto do item em blocos com nome de campo, para o achado dizer ONDE está o erro. */
export function blocos(i) {
  const desc = String(i.desc || '');
  const corte = desc.search(MARCA_EQUIPE);
  const out = [
    { campo: 'titulo', cliente: true, texto: String(i.name || i.titulo || '') },
    { campo: 'roteiro', cliente: true, texto: corte >= 0 ? desc.slice(0, corte) : desc },
    { campo: 'roteiro·equipe', cliente: false, texto: corte >= 0 ? desc.slice(corte) : '' },
    { campo: 'preparacao', cliente: true, texto: String(i.preparacaoGravacao || '') },
    { campo: 'edicao', cliente: false, texto: String(i.obs || '') }
  ];
  for (const k of CAMPOS_LEGENDA) if (i[k]) out.push({ campo: k, cliente: true, texto: String(i[k]) });
  return out.filter(b => b.texto.trim());
}

function vale(regra, slug, grupos) {
  const c = regra.clientes;
  if (c === '*') return true;
  if (typeof c === 'string' && c.startsWith('@')) return (grupos[c.slice(1)] || []).includes(slug);
  return Array.isArray(c) && c.includes(slug);
}

function trecho(texto, ini, fim) {
  const a = Math.max(0, ini - 40), b = Math.min(texto.length, fim + 40);
  return (a > 0 ? '…' : '') + texto.slice(a, b).replace(/\s+/g, ' ').trim() + (b < texto.length ? '…' : '');
}

function dataPostagem(i) {
  if (i.dataPostagem && /^\d{4}-\d{2}-\d{2}$/.test(i.dataPostagem)) return i.dataPostagem;
  if (i.mes && i.day) return `${i.mes}-${String(i.day).padStart(2, '0')}`;
  return '';
}
const ehVideo = i => /reel|v[ií]deo|tiktok|short/i.test(String(i.fmt || ''));

/**
 * Audita os itens de UM cliente. Devolve [{regra, nivel, msg, campo, trecho, dia, mes, titulo, itemId}].
 * Cada achado de texto traz o trecho que realmente existe no conteúdo (prova anti-alucinação).
 */
export function auditar(cofre, slug, itens) {
  const grupos = cofre.grupos || {};
  const regras = (cofre.regras || []).filter(r => vale(r, slug, grupos));
  const achados = [];
  for (const i of (itens || []).filter(ativo)) {
    const base = { cliente: slug, mes: i.mes || '', dia: i.day ?? '', titulo: String(i.name || i.titulo || '').slice(0, 90), itemId: i.itemId || '' };
    const bs = blocos(i);
    for (const r of regras) {
      if (r.tipo === 'video_em_data') {
        const d = dataPostagem(i);
        if (d && ehVideo(i) && r.datas.includes(d.slice(5))) achados.push({ ...base, regra: r.id, nivel: r.nivel, msg: r.msg, campo: 'data', trecho: `${d} · ${i.fmt}` });
        continue;
      }
      if (r.tipo === 'gravacao_depois') {
        const prep = String(i.preparacaoGravacao || '');
        const [lm, ld] = r.limite.split('-').map(Number);
        const re = /\b(?:at[ée]|dia|em)\s+(\d{1,2})\/(\d{1,2})\b/gi; let m;
        while ((m = re.exec(prep))) {
          const dd = +m[1], mm = +m[2];
          if (mm === lm && dd > ld) achados.push({ ...base, regra: r.id, nivel: r.nivel, msg: r.msg, campo: 'preparacao', trecho: trecho(prep, m.index, m.index + m[0].length) });
        }
        continue;
      }
      if (r.tipo === 'telefone_permitido') {
        for (const b of bs) {
          const re = /\(?\b\d{2}\)?\s?9\s?\d{4}[-\s]?\d{4}\b/g; let m;
          while ((m = re.exec(b.texto))) {
            const num = m[0].replace(/\D/g, '');
            if (!r.permitidos.includes(num)) achados.push({ ...base, regra: r.id, nivel: r.nivel, msg: r.msg, campo: b.campo, trecho: trecho(b.texto, m.index, m.index + m[0].length) });
          }
        }
        continue;
      }
      const re = new RegExp(r.padrao, 'giu');
      for (const b of bs) {
        if (r.campos === 'cliente' && !b.cliente) continue;
        re.lastIndex = 0; let m;
        while ((m = re.exec(b.texto))) {
          achados.push({ ...base, regra: r.id, nivel: r.nivel, msg: r.msg, campo: b.campo, trecho: trecho(b.texto, m.index, m.index + m[0].length) });
          if (!m[0].length) re.lastIndex++;
        }
      }
    }
  }
  // prova: todo trecho de texto precisa existir no item (sem as reticências)
  return achados;
}

/** Audita vários calendários: {slug: items[]} filtrando os meses pedidos. */
export function auditarTudo(cofre, calendarios, meses) {
  const out = [];
  for (const [slug, items] of Object.entries(calendarios || {})) {
    out.push(...auditar(cofre, slug, (items || []).filter(i => !meses || meses.includes(i.mes))));
  }
  return out;
}
