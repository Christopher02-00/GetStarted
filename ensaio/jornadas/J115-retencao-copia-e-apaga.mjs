// J115 — CP261 (23/11/2026, ok nominal do Chris sobre os números de produção: 31.179 registros técnicos antigos). Fase 2 da retenção:
// a rotina (a cada 2 h) COPIA cada registro que sai e só então apaga. Esperado:
//  1. sai exatamente o que a regra pega (fila enviada ou com mais de 30 dias; throttle > 7 dias; log de automações e de acessos > 90 dias);
//     ficam os recentes, a fila não enviada recente e o registro sem data;
//  2. a cópia traz cada registro apagado, com os dados (datas fiéis), antes da exclusão;
//  3. se a cópia falhar, nada daquela coleção é apagado e o relatório diz por quê;
//  4. o limite por rodada é respeitado e a rodada seguinte continua; o relatório fica em sistema/retencao_l1.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { adminDb } from '../lib/chegada.mjs';
export const id = 'J115';
export const nome = 'Retenção L1 copia e só então apaga: exatamente o que a regra pega; sem cópia, nada sai';

export async function executar({ amb, seed, registrar }) {
  const t0 = Date.now(), dia = 864e5, ts = n => new Date(Date.now() - n * dia), db = adminDb(amb);
  const { aplicarRetencaoL1, contarRetencaoL1 } = await import(pathToFileURL(path.join(RAIZ, 'functions-get/retencao-l1.mjs')).href);
  const docs = [
    ['fila_emails', 'j115-enviado-novo', { enviado: true, criadoEm: ts(1), titulo: 'enviado' }, true],
    ['fila_emails', 'j115-pend-velho', { enviado: false, criadoEm: ts(40), titulo: 'pendente velho' }, true],
    ['fila_emails', 'j115-pend-novo', { enviado: false, criadoEm: ts(2), titulo: 'pendente novo' }, false],
    ['email_throttle', 'j115-velho', { enviadoEm: ts(10) }, true],
    ['email_throttle', 'j115-novo', { enviadoEm: ts(1) }, false],
    ['log_automacoes', 'j115-velho', { tipo: 'email_FALHOU', executadoEm: ts(120), detalhe: 'cota' }, true],
    ['log_automacoes', 'j115-novo', { tipo: 'motor_executado', executadoEm: ts(5) }, false],
    ['log_automacoes', 'j115-sem-data', { tipo: 'resumo_checklist_19h', quando: 'x' }, false],
    ['log_acessos', 'j115-velho', { quando: ts(100).toISOString(), pessoa: 'Ensaio' }, true],
    ['log_acessos', 'j115-novo', { quando: ts(3).toISOString(), pessoa: 'Ensaio' }, false]
  ];
  const semear = async () => { for (const [c, k, d] of docs) await seed.set(c, k, d); };
  const existe = async (c, k) => (await db.doc(c + '/' + k).get()).exists;
  try {
    // limpa o que o ensaio já tenha de antigo nessas coleções, para a conta ficar exata
    await aplicarRetencaoL1(db, { gravarCopia: async () => 'ensaio', gravarRelatorio: false });
    // 3) cópia falha → nada sai
    await semear();
    const falha = await aplicarRetencaoL1(db, { gravarCopia: async () => { throw Error('Storage fora do ar (ensaio)'); } });
    const intactos = (await Promise.all(docs.map(([c, k]) => existe(c, k)))).every(Boolean);
    const erros = falha.linhas.filter(l => /cópia falhou/.test(l.erro || '')).length, apagouAlgo = falha.linhas.some(l => l.apagados > 0);
    registrar({ jornada: id, caso: '3 se a cópia falhar, nada sai e o relatório diz por quê', ok: intactos && erros === 4 && !apagouAlgo, ms: Date.now() - t0,
      detalhe: `${intactos ? 'todos os registros continuam' : 'APAGOU SEM CÓPIA'} · ${erros}/4 coleção(ões) com o motivo no relatório` });
    // 1 e 2) cópia ok → sai exatamente o que a regra pega, copiado antes
    const copias = {}, ordem = [];
    const rel = await aplicarRetencaoL1(db, { gravarCopia: async (c, lista) => { ordem.push('copia:' + c); for (const d of lista) if (!(await existe(c, d.id))) throw Error('apagou antes da cópia'); copias[c] = lista; return 'retencao-l1/ensaio/' + c + '.json'; } });
    const difs = [];
    for (const [c, k, , sai] of docs) { const e = await existe(c, k); if (sai && e) difs.push(`${c}/${k} FICOU`); if (!sai && !e) difs.push(`${c}/${k} SAIU`); }
    registrar({ jornada: id, caso: '1 sai exatamente o que a regra pega; recentes, pendente recente e sem data ficam', ok: !difs.length, ms: Date.now() - t0,
      detalhe: difs.length ? difs.join('; ') : rel.linhas.map(l => `${l.colecao} ${l.apagados}`).join(' · ') });
    const saiu = docs.filter(d => d[3]), copiados = saiu.every(([c, k]) => (copias[c] || []).some(x => x.id === k));
    const dataFiel = copias.log_automacoes?.find(x => x.id === 'j115-velho')?.dados?.executadoEm?.__ts?.slice(0, 10) === ts(120).toISOString().slice(0, 10);
    const semExtra = Object.entries(copias).every(([c, l]) => l.every(x => saiu.some(([c2, k]) => c2 === c && k === x.id)));
    registrar({ jornada: id, caso: '2 a cópia traz cada registro apagado, com os dados e datas fiéis, antes da exclusão', ok: copiados && dataFiel && semExtra, ms: Date.now() - t0,
      detalhe: `${copiados ? 'todos copiados' : 'FALTOU CÓPIA'} · data ${dataFiel ? 'fiel' : 'DIFERENTE'} · ${semExtra ? 'nada a mais' : 'COPIOU A MAIS'} · ordem ${ordem.join(',')}` });
    // 4) limite por rodada + relatório
    for (let i = 0; i < 5; i++) await seed.set('email_throttle', 'j115-lote-' + i, { enviadoEm: ts(20) });
    const r1 = await aplicarRetencaoL1(db, { limitePorRodada: 3, gravarCopia: async () => 'ok' });
    const l1 = r1.linhas.find(l => l.colecao === 'email_throttle'), resto = (await contarRetencaoL1(db)).find(l => l.colecao === 'email_throttle').pegaria;
    const r2 = await aplicarRetencaoL1(db, { limitePorRodada: 3, gravarCopia: async () => 'ok' });
    const l2 = r2.linhas.find(l => l.colecao === 'email_throttle');
    const gravado = (await db.doc('sistema/retencao_l1').get()).data();
    registrar({ jornada: id, caso: '4 limite por rodada respeitado, a rodada seguinte continua e o relatório fica gravado', ok: l1.apagados === 3 && l1.limiteAtingido && resto === 2 && l2.apagados === 2 && gravado?.linhas?.length === 4, ms: Date.now() - t0,
      detalhe: `rodada 1: ${l1.apagados} (limite ${l1.limiteAtingido ? 'atingido' : 'não'}) · restavam ${resto} · rodada 2: ${l2.apagados} · relatório ${gravado ? 'gravado' : 'AUSENTE'}` });
    for (const [c, k] of docs) await db.doc(c + '/' + k).delete().catch(() => {});
  } catch (e) { registrar({ jornada: id, caso: 'retenção copia e apaga', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
}
