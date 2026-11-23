// CP260 (22–23/11/2026, varredura de acúmulo L1). Política ÚNICA de retenção dos registros técnicos que nenhuma tela usa.
// Fase 1 (CP260): só CONTAGEM, em leitura pura — o vigia diário mostra quanto cada regra pegaria.
// Fase 2 (CP261, ok nominal do Chris em 23/11 sobre os números de produção: 31.179 registros): exclusão a cada 2 h, na rodada da faxina CP248, com CÓPIA antes —
// cada registro que sai é copiado ANTES para a coleção `retencao_l1_copias` (blocos JSON de até ~600 KB, só servidor); se a cópia falhar,
// nada daquela coleção é apagado. (23/11: o Storage do projeto não existe — a 1ª rodada recusou a cópia e não apagou nada; por isso a cópia
// fica no próprio Firestore.)
//  - fila_emails: já enviados, ou não enviados com mais de 30 dias (o resumo por e-mail está desligado desde 09/11 — nada enfileira nem
//    lê; se for religado, a fila recente fica intacta).
//  - email_throttle: mais de 7 dias (a trava vale 2 h).
//  - log_automacoes: mais de 90 dias (a Saúde mostra 30 dias; o resumo das 19 h, sem executadoEm, não entra).
//  - log_acessos: mais de 90 dias (o campo `quando` é texto ISO).
import {Timestamp,FieldValue} from 'firebase-admin/firestore';

export const POLITICA_RETENCAO_L1 = Object.freeze([
  Object.freeze({colecao: 'fila_emails', campo: 'criadoEm', dias: 30, tipo: 'ts', tambemEnviados: true, uso: 'nenhum (resumo por e-mail desligado em 09/11)'}),
  Object.freeze({colecao: 'email_throttle', campo: 'enviadoEm', dias: 7, tipo: 'ts', uso: 'trava de 2 h dos e-mails imediatos'}),
  Object.freeze({colecao: 'log_automacoes', campo: 'executadoEm', dias: 90, tipo: 'ts', uso: 'Saúde das Automações (30 dias)'}),
  Object.freeze({colecao: 'log_acessos', campo: 'quando', dias: 90, tipo: 'iso', uso: 'consulta de acessos (botão)'})
]);

/** Limite da regra: antes dele, o registro sai. Timestamp para campos de data; texto ISO para `quando`. */
export function limiteRetencaoL1(regra, agora = new Date()) {
  const d = new Date(agora.getTime() - regra.dias * 864e5);
  return regra.tipo === 'iso' ? d.toISOString() : Timestamp.fromDate(d);
}

const contar = async q => (await q.count().get()).data().count;

/** Só leitura: quantos registros existem e quantos cada regra pegaria hoje. Nada é gravado. */
export async function contarRetencaoL1(db, {agora = new Date()} = {}) {
  const linhas = [];
  for (const regra of POLITICA_RETENCAO_L1) {
    const col = db.collection(regra.colecao), limite = limiteRetencaoL1(regra, agora);
    const total = await contar(col);
    let pegaria;
    if (regra.tambemEnviados) {
      // enviados (contagem agregada) + não enviados antigos (sem índice composto: lê só o campo de data dos não enviados)
      const enviados = await contar(col.where('enviado', '==', true));
      const naoEnviados = (await col.where('enviado', '==', false).select(regra.campo).get()).docs;
      const ms = limite.toMillis();
      pegaria = enviados + naoEnviados.filter(d => { const v = d.get(regra.campo); return v && typeof v.toMillis === 'function' && v.toMillis() < ms; }).length;
    } else {
      pegaria = await contar(col.where(regra.campo, '<', limite));
    }
    linhas.push({colecao: regra.colecao, criterio: `${regra.tambemEnviados ? 'enviado, ou ' : ''}${regra.campo} com mais de ${regra.dias} dias`, uso: regra.uso, total, pegaria, fica: total - pegaria});
  }
  return linhas;
}

export function relatorioRetencaoL1(linhas, quando) {
  const soma = k => linhas.reduce((t, l) => t + l[k], 0);
  return [`## Retenção L1 — contagem (${quando})`,
    'O que a regra ainda pegaria agora (só leitura). A exclusão roda sozinha a cada 2 h, com cópia no Storage antes de apagar (CP261).', '',
    '| Coleção | Regra | Quem usa | Total | Sairia | Fica |', '|---|---|---|---:|---:|---:|',
    ...linhas.map(l => `| \`${l.colecao}\` | ${l.criterio} | ${l.uso} | ${l.total} | ${l.pegaria} | ${l.fica} |`),
    `| **Total** | | | **${soma('total')}** | **${soma('pegaria')}** | **${soma('fica')}** |`].join('\n');
}

export const LIMITE_POR_RODADA_RETENCAO_L1 = 6000;
/** Na rodada da faxina CP248 (a cada 2 h), depois dela: lote menor para caber no tempo da função. */
export const LIMITE_RODADA_FAXINA_RETENCAO_L1 = 2000;

/** JSON fiel do documento (Timestamp → {__ts}, referência → {__ref}), para a cópia poder ser restaurada. */
export function paraJsonRetencaoL1(v) {
  if (v === null || v === undefined || typeof v !== 'object') return v ?? null;
  if (typeof v.toDate === 'function' && typeof v.toMillis === 'function') return {__ts: v.toDate().toISOString()};
  if (typeof v.path === 'string' && v.firestore) return {__ref: v.path};
  if (Array.isArray(v)) return v.map(paraJsonRetencaoL1);
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, paraJsonRetencaoL1(x)]));
}

async function candidatosRetencaoL1(db, regra, agora, limite) {
  const col = db.collection(regra.colecao), corte = limiteRetencaoL1(regra, agora), porCaminho = new Map();
  if (regra.tambemEnviados) {
    for (const d of (await col.where('enviado', '==', true).limit(limite).get()).docs) porCaminho.set(d.ref.path, d);
    const ms = corte.toMillis();
    for (const d of (await col.where('enviado', '==', false).get()).docs) { const v = d.get(regra.campo); if (v && typeof v.toMillis === 'function' && v.toMillis() < ms) porCaminho.set(d.ref.path, d); }
  } else {
    for (const d of (await col.where(regra.campo, '<', corte).limit(limite).get()).docs) porCaminho.set(d.ref.path, d);
  }
  return [...porCaminho.values()].slice(0, limite);
}

/** Fase 2: copia e apaga, coleção por coleção, no máximo `limitePorRodada` por coleção. Sem cópia confirmada, nada é apagado. */
export async function aplicarRetencaoL1(db, {agora = new Date(), limitePorRodada = LIMITE_POR_RODADA_RETENCAO_L1, gravarCopia, gravarRelatorio = true} = {}) {
  if (typeof gravarCopia !== 'function') throw Error('Retenção sem cópia: nada é apagado.');
  const linhas = [];
  for (const regra of POLITICA_RETENCAO_L1) {
    const lista = await candidatosRetencaoL1(db, regra, agora, limitePorRodada);
    const linha = {colecao: regra.colecao, encontrados: lista.length, copiados: 0, apagados: 0, arquivo: null, limiteAtingido: lista.length >= limitePorRodada};
    if (lista.length) {
      try { linha.arquivo = await gravarCopia(regra.colecao, lista.map(d => ({id: d.id, dados: paraJsonRetencaoL1(d.data())}))); linha.copiados = lista.length; }
      catch (e) { linha.erro = 'A cópia falhou; nada desta coleção foi apagado: ' + String(e?.message || e).slice(0, 200); linhas.push(linha); continue; }
      for (let i = 0; i < lista.length; i += 400) { const lote = db.batch(); for (const d of lista.slice(i, i + 400)) lote.delete(d.ref); await lote.commit(); linha.apagados += Math.min(400, lista.length - i); }
    }
    linhas.push(linha);
  }
  const relatorio = {schema: 1, em: agora.toISOString(), linhas};
  if (gravarRelatorio) await db.doc('sistema/retencao_l1').set({...relatorio, atualizadoEm: FieldValue.serverTimestamp()});
  return relatorio;
}

/** Cópia no próprio Firestore: `retencao_l1_copias/<coleção>__<instante>__<parte>`, blocos de até ~600 KB (o limite do documento é 1 MiB).
 *  Gravada e confirmada ANTES da exclusão; devolve a lista dos ids das cópias. Nenhuma tela lê esta coleção. */
export function criarCopiaFirestoreRetencaoL1({db, agora = () => new Date(), limiteBytes = 600000} = {}) {
  return async (colecao, docs) => {
    const quando = agora(), partes = []; let atual = [], tamanho = 0;
    for (const d of docs) { const t = Buffer.byteLength(JSON.stringify(d)); if (atual.length && tamanho + t > limiteBytes) { partes.push(atual); atual = []; tamanho = 0; } atual.push(d); tamanho += t; }
    if (atual.length) partes.push(atual);
    const ids = partes.map((_, i) => `${colecao}__${quando.getTime()}__${String(i + 1).padStart(3, '0')}`);
    for (let i = 0; i < partes.length; i += 20) {
      const lote = db.batch();
      partes.slice(i, i + 20).forEach((docsParte, k) => lote.set(db.doc('retencao_l1_copias/' + ids[i + k]),
        {schema: 1, colecao, em: quando.toISOString(), parte: i + k + 1, partes: partes.length, total: docs.length, ids: docsParte.map(x => x.id), docs: JSON.stringify(docsParte)}));
      await lote.commit();
    }
    return ids.length === 1 ? ids[0] : `${ids[0]} … ${ids.length} partes`;
  };
}

/** Texto da última rodada de exclusão (sistema/retencao_l1), para o vigia mostrar. */
export function relatorioRodadaRetencaoL1(r) {
  if (!r?.linhas) return '### Última rodada da exclusão\nAinda não houve rodada.';
  return [`### Última rodada da exclusão (${r.em})`, '| Coleção | Encontrados | Copiados | Apagados | Cópia | Observação |', '|---|---:|---:|---:|---|---|',
    ...r.linhas.map(l => `| \`${l.colecao}\` | ${l.encontrados} | ${l.copiados} | ${l.apagados} | ${l.arquivo ? '`' + l.arquivo + '`' : '—'} | ${l.erro || (l.limiteAtingido ? 'limite da rodada; continua na próxima' : '—')} |`)].join('\n');
}
