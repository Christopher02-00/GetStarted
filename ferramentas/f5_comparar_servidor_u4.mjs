// F5 (U4a/U4c) — mede, sobre uma exportação SÓ LEITURA do Firestore (calendarios.json), quanto as cópias do SERVIDOR divergem do
// módulo único `functions-get/lib/gs-estado-mes.mjs`. Não grava nada. Uso:
//   TZ=America/Sao_Paulo node ferramentas/f5_comparar_servidor_u4.mjs <exportacao>/calendarios.json
// U4a: `estado(cal,mes)` do editor (editorial-calendarios-i172.mjs, extraída pelo nome) × `estadoDoMes` do módulo.
// U4c: `mesDoItemCalendario` das 3 guardas (lib/guardas-stokki-i165, central/lib/guardas-stokki-i165, lib/guardas-agendamento-cp101-i165)
//      × `mesDoItem` do módulo, item a item.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FG = path.join(RAIZ, 'functions-get');
const ler = f => fs.readFileSync(path.join(FG, f), 'utf8');
function bloco(fonte, inicio) {
  const i = fonte.indexOf(inicio); if (i < 0) throw Error('não achei: ' + inicio);
  const a = fonte.indexOf('{', i); let n = 0, j = a;
  for (; j < fonte.length; j++) { const c = fonte[j]; if (c === '{') n++; else if (c === '}' && --n === 0) break; }
  return fonte.slice(i, j + 1);
}
const linha = (fonte, inicio) => { const i = fonte.indexOf(inicio); if (i < 0) throw Error('não achei: ' + inicio); return fonte.slice(i, fonte.indexOf('\n', i)); };
const importar = f => import(pathToFileURL(path.join(FG, f)).href);
async function carregar(nome, partes) {
  const f = path.join(os.tmpdir(), `f5u4-${nome}-${process.pid}.mjs`);
  fs.writeFileSync(f, partes.join('\n') + '\n'); try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(f, { force: true }); }
}

const modulo = await importar('lib/gs-estado-mes.mjs');
const i172 = ler('editorial-calendarios-i172.mjs');
const editor = await carregar('i172', [
  `import {mesDoItemCalendario} from ${JSON.stringify(pathToFileURL(path.join(FG, 'lib/guardas-stokki-i165.mjs')).href)};`,
  linha(i172, 'const itensMes='), bloco(i172, 'function estado('), bloco(i172, 'function usaLegado('), 'export { estado };']);
const guardas = {
  'lib/guardas-stokki-i165': await importar('lib/guardas-stokki-i165.mjs'),
  'central/lib/guardas-stokki-i165': await importar('central/lib/guardas-stokki-i165.mjs'),
  'lib/guardas-agendamento-cp101-i165': await importar('lib/guardas-agendamento-cp101-i165.mjs'),
};

const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), cals = Array.isArray(j) ? j : Object.values(j);
const meses = []; for (let a = 2026, m = 6; ; m++) { if (m > 12) { m = 1; a++; } meses.push(a + '-' + String(m).padStart(2, '0')); if (a === 2027 && m === 4) break; }
const refs = ['2026-11-23T15:00:00Z', '2026-12-15T15:00:00Z', '2027-01-10T15:00:00Z'].map(x => new Date(x));
const vivo = m => m >= '2026-10';
const resumo = (titulo, total, dif, chave) => {
  const g = {}; for (const d of dif) { const k = chave(d); g[k] = (g[k] || 0) + 1; }
  console.log(`${titulo}: ${total} comparações, ${dif.length} diferença(s), ${dif.filter(d => vivo(d.mes)).length} em meses vivos (≥ 2026-10)`);
  for (const [k, n] of Object.entries(g).sort()) console.log('  ' + n + ' × ' + k);
};

// U4a — o editor do servidor lê a marca crua (+ campo antigo + legado); o módulo dá o estado efetivo.
{ let total = 0; const dif = [];
  for (const cal of cals) for (const mes of new Set([...meses, ...(cal.mesLegado ? [cal.mesLegado] : [])])) for (const ref of refs) {
    total++; const a = editor.estado(cal, mes), b = modulo.estadoDoMes(cal, mes, ref);
    if (a !== b) dif.push({ mes, a, b, ref: ref.toISOString().slice(0, 10), cliente: cal.__id || cal.client || '?' });
  }
  resumo('U4a editor I172 estado() × módulo', total, dif, d => `${d.mes} ${d.a}→${d.b} (ref ${d.ref})`);
  const vivos = dif.filter(d => vivo(d.mes)); if (vivos.length) console.log('  meses vivos: ' + [...new Set(vivos.map(d => d.cliente + ' ' + d.mes))].join(', '));
}

// U4c — mês de cada item: cópias das guardas × módulo.
for (const [nome, g] of Object.entries(guardas)) {
  let total = 0; const dif = [];
  for (const cal of cals) for (const it of cal.items || []) { if (!it) continue; total++;
    const a = g.mesDoItemCalendario(cal, it), b = modulo.mesDoItem(cal, it);
    if (a !== b) dif.push({ mes: b || a, a: a || '∅', b: b || '∅', txt: String(it.date || it.data || '').slice(0, 30) });
  }
  resumo(`U4c ${nome} mesDoItemCalendario × módulo mesDoItem`, total, dif, d => `${d.a}→${d.b}${d.txt ? ' «' + d.txt + '»' : ''}`);
}
