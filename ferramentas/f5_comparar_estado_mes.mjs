// F5 (U2/U3) — compara a regra "estado do mês" do escritório e do link do cliente com o módulo único `gs-estado-mes.mjs`,
// sobre uma exportação SÓ LEITURA do Firestore (calendarios.json). Uso:
//   TZ=America/Sao_Paulo node ferramentas/f5_comparar_estado_mes.mjs <exportacao>/calendarios.json
// Extrai as funções pelo NOME (casando chaves), sem depender de número de linha. Imprime o total, as diferenças e as dos meses vivos.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
function bloco(fonte, inicio) {
  const i = fonte.indexOf(inicio); if (i < 0) throw Error('não achei: ' + inicio);
  const a = fonte.indexOf('{', i); let n = 0, j = a;
  for (; j < fonte.length; j++) { const c = fonte[j]; if (c === '{') n++; else if (c === '}' && --n === 0) break; }
  return fonte.slice(i, j + 1);
}
const linha = (fonte, inicio) => { const i = fonte.indexOf(inicio); if (i < 0) throw Error('não achei: ' + inicio); return fonte.slice(i, fonte.indexOf('\n', i)); };
async function carregar(nome, partes, exporta) {
  const f = path.join(os.tmpdir(), `f5-${nome}-${process.pid}.mjs`);
  fs.writeFileSync(f, partes.join('\n') + '\n' + exporta + '\n'); try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(f, { force: true }); }
}
const esc = ler('escritorio.html'), cli = ler('calendario.html');
const escritorio = await carregar('escritorio', [linha(esc, "const PRIMEIRA_COMPETENCIA_ARQUIVO_AUTOMATICO"), bloco(esc, 'function limiteArquivoAutomaticoCalendario('),
  bloco(esc, 'function estadoPublicadoEfetivoCalendario('), bloco(esc, 'function estadoMesCal(')], 'export { estadoMesCal };');
const cliente = await carregar('cliente', ['let data={};', linha(cli, 'const MESES_PT='), linha(cli, 'const PRIMEIRA_COMPETENCIA_ARQUIVO_AUTOMATICO'), bloco(cli, 'function mesRefDoTexto('), bloco(cli, 'function mesDoTexto('),
  bloco(cli, 'function mesDoItemNoCalendario('), bloco(cli, 'function docJaUsaMesesNoCalendario('), bloco(cli, 'function docJaUsaMeses('),
  bloco(cli, 'function aprovacaoCompativelNoCalendario('), bloco(cli, 'function aprovacaoCompativelDoMes('), bloco(cli, 'function mesHistoricoAnteriorAoControleNoCalendario('),
  bloco(cli, 'function limiteArquivoAutomaticoCalendario('), bloco(cli, 'function estadoPublicadoEfetivoCalendario('), bloco(cli, 'function estadoDoMes(')],
  'export function estadoCliente(cal,mes,ref){data=cal;return estadoDoMes(mes,ref);}');
const { estadoDoMes } = await import(pathToFileURL(path.join(RAIZ, 'gs-estado-mes.mjs')).href);

const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), cals = Array.isArray(j) ? j : Object.values(j);
const meses = []; for (let a = 2026, m = 6; ; m++) { if (m > 12) { m = 1; a++; } meses.push(a + '-' + String(m).padStart(2, '0')); if (a === 2027 && m === 4) break; }
const refs = ['2026-11-23T15:00:00Z', '2026-12-15T15:00:00Z', '2027-01-10T15:00:00Z'].map(x => new Date(x));
for (const [nome, f] of [['escritório', (c, m, r) => escritorio.estadoMesCal(c, m, r)], ['link do cliente', (c, m, r) => cliente.estadoCliente(c, m, r)]]) {
  let total = 0; const dif = [];
  for (const cal of cals) for (const mes of new Set([...meses, ...(cal.mesLegado ? [cal.mesLegado] : [])])) for (const ref of refs) {
    total++; const a = f(cal, mes, ref), b = estadoDoMes(cal, mes, ref); if (a !== b) dif.push({ mes, a, b });
  }
  const grupos = {}; for (const d of dif) { const k = d.mes + ' ' + d.a + '→' + d.b; grupos[k] = (grupos[k] || 0) + 1; }
  console.log(`${nome} × módulo: ${total} comparações, ${dif.length} diferença(s), ${dif.filter(d => d.mes >= '2026-10').length} em meses vivos (≥ 2026-10)`);
  for (const [k, n] of Object.entries(grupos).sort()) console.log('  ' + n + ' × ' + k);
}
