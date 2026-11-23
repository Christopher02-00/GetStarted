// CP260 (22–23/11/2026, varredura de acúmulo L1; exclusão física só com ok nominal do Chris). Política ÚNICA de retenção dos registros
// técnicos que nenhuma tela usa. Fase 1 (esta): só CONTAGEM, em leitura pura — o vigia diário mostra quanto cada regra pegaria.
// Fase 2 (só depois de o Chris confirmar os números): a exclusão reaproveita esta mesma política.
//  - fila_emails: já enviados, ou não enviados com mais de 30 dias (o resumo por e-mail está desligado desde 09/11 — nada enfileira nem
//    lê; se for religado, a fila recente fica intacta).
//  - email_throttle: mais de 7 dias (a trava vale 2 h).
//  - log_automacoes: mais de 90 dias (a Saúde mostra 30 dias; o resumo das 19 h, sem executadoEm, não entra).
//  - log_acessos: mais de 90 dias (o campo `quando` é texto ISO).
import {Timestamp} from 'firebase-admin/firestore';

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
  return [`## Retenção L1 — só contagem (${quando})`,
    'Nada foi apagado. É o que a regra pegaria hoje; a exclusão só acontece com o ok do Chris sobre estes números.', '',
    '| Coleção | Regra | Quem usa | Total | Sairia | Fica |', '|---|---|---|---:|---:|---:|',
    ...linhas.map(l => `| \`${l.colecao}\` | ${l.criterio} | ${l.uso} | ${l.total} | ${l.pegaria} | ${l.fica} |`),
    `| **Total** | | | **${soma('total')}** | **${soma('pegaria')}** | **${soma('fica')}** |`].join('\n');
}
