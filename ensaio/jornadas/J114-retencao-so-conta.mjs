// J114 — CP260 (22–23/11/2026, varredura de acúmulo; exclusão física só com ok nominal do Chris). Fase 1 da retenção: o vigia diário CONTA,
// em leitura pura, quantos registros técnicos antigos cada regra pegaria (fila_emails, email_throttle, log_automacoes, log_acessos).
// Esperado: (1) a contagem bate exatamente com o critério (antigos/enviados entram; recentes, pendentes recentes e registros sem data ficam);
// (2) nada é gravado nem apagado; (3) o script do vigia imprime o relatório com os mesmos números.
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { adminDb } from '../lib/chegada.mjs';
export const id = 'J114';
export const nome = 'Retenção L1 só conta (leitura pura): números exatos por regra, nada gravado nem apagado';

export async function executar({ amb, seed, registrar }) {
  const t0 = Date.now(), dia = 864e5, ts = n => new Date(Date.now() - n * dia);
  const db = adminDb(amb);
  // linha de base: o que já existe no ensaio
  const { contarRetencaoL1, relatorioRetencaoL1 } = await import(pathToFileURL(path.join(RAIZ, 'functions-get/retencao-l1.mjs')).href);
  try {
    const base = Object.fromEntries((await contarRetencaoL1(db)).map(l => [l.colecao, l]));
    const docs = [
      ['fila_emails', 'j114-enviado-novo', { enviado: true, criadoEm: ts(1) }, true],
      ['fila_emails', 'j114-pend-velho', { enviado: false, criadoEm: ts(40) }, true],
      ['fila_emails', 'j114-pend-novo', { enviado: false, criadoEm: ts(2) }, false],
      ['email_throttle', 'j114-velho', { enviadoEm: ts(10) }, true],
      ['email_throttle', 'j114-novo', { enviadoEm: ts(1) }, false],
      ['log_automacoes', 'j114-velho', { tipo: 'email_FALHOU', executadoEm: ts(120) }, true],
      ['log_automacoes', 'j114-novo', { tipo: 'motor_executado', executadoEm: ts(5) }, false],
      ['log_automacoes', 'j114-sem-data', { tipo: 'resumo_checklist_19h', quando: 'x' }, false],
      ['log_acessos', 'j114-velho', { quando: ts(100).toISOString(), pessoa: 'Ensaio' }, true],
      ['log_acessos', 'j114-novo', { quando: ts(3).toISOString(), pessoa: 'Ensaio' }, false]
    ];
    for (const [c, k, d] of docs) await seed.set(c, k, d);
    const esperado = {};
    for (const [c, , , sai] of docs) { esperado[c] ??= { total: 0, pegaria: 0 }; esperado[c].total++; if (sai) esperado[c].pegaria++; }
    const agoraL = await contarRetencaoL1(db), difs = [];
    for (const l of agoraL) {
      const e = esperado[l.colecao] || { total: 0, pegaria: 0 }, b = base[l.colecao] || { total: 0, pegaria: 0 };
      if (l.total - b.total !== e.total) difs.push(`${l.colecao} total +${l.total - b.total} (esperado +${e.total})`);
      if (l.pegaria - b.pegaria !== e.pegaria) difs.push(`${l.colecao} sairia +${l.pegaria - b.pegaria} (esperado +${e.pegaria})`);
    }
    registrar({ jornada: id, caso: '1 a contagem bate com o critério (antigos e enviados entram; recentes e sem data ficam)', ok: !difs.length, ms: Date.now() - t0,
      detalhe: difs.length ? 'DIFERENÇAS: ' + difs.join('; ') : agoraL.map(l => `${l.colecao} ${l.pegaria}/${l.total}`).join(' · ') });
    // 2) nada gravado nem apagado
    const intactos = (await Promise.all(docs.map(([c, k]) => db.doc(c + '/' + k).get()))).every(s => s.exists);
    const relatorioGravado = (await db.doc('sistema/retencao_l1').get()).exists;
    registrar({ jornada: id, caso: '2 nada é gravado nem apagado', ok: intactos && !relatorioGravado, ms: Date.now() - t0,
      detalhe: `${intactos ? 'todos os registros continuam' : 'REGISTRO SUMIU'} · ${relatorioGravado ? 'GRAVOU sistema/retencao_l1' : 'nenhuma gravação'}` });
    // 3) o script do vigia imprime o mesmo
    const saida = execFileSync(process.execPath, [path.join(RAIZ, '.github/scripts/contar-retencao-l1.mjs'), '--projeto', PROJETO],
      { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:' + amb.portas.firestore, GITHUB_STEP_SUMMARY: '' }, encoding: 'utf8', timeout: 60000 });
    const esperadoTxt = relatorioRetencaoL1(agoraL, 'X').split('\n').filter(l => l.startsWith('| `')).map(l => l.split('|').slice(-4, -1).join('|').trim());
    const linhasScript = saida.split('### Última rodada')[0].split('\n').filter(l => l.startsWith('| `')).map(l => l.split('|').slice(-4, -1).join('|').trim());
    const igual = esperadoTxt.length === 4 && JSON.stringify(esperadoTxt) === JSON.stringify(linhasScript) && /só leitura/.test(saida);
    registrar({ jornada: id, caso: '3 o script do vigia imprime o relatório com os mesmos números', ok: igual, ms: Date.now() - t0,
      detalhe: igual ? '4 coleções iguais; "só leitura" no relatório' : 'script: ' + saida.replace(/\s+/g, ' ').slice(0, 240) });
    for (const [c, k] of docs) await db.doc(c + '/' + k).delete(); // só os documentos do ensaio
  } catch (e) { registrar({ jornada: id, caso: 'retenção só conta', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
}
