// Ensaio Get — portão de jornadas. Uso: node ensaio/rodar.mjs [--jornadas J01,J02] [--movel] [--mutante caminho.js]
// --movel = mesma bateria em 390x844 (celular), obrigatório antes de publicar mudança de interface.
// Sobe emulador + seed + navegador real, roda as jornadas, imprime tabela, grava ensaio/saida/resultado.json. Sai com código 1 se algo falhar.
import fs from 'node:fs';
import path from 'node:path';
import { subir, RAIZ } from './lib/emulador.mjs';
import { criarSeed, seedPadrao, seedReal } from './lib/seed.mjs';
import { abrirNavegador, SAIDA } from './lib/navegador.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const filtro = (opt('--jornadas') || '').split(',').filter(Boolean);
if (args.includes('--movel') && !process.env.ENSAIO_VIEWPORT) process.env.ENSAIO_VIEWPORT = '390x844';
if (process.env.ENSAIO_VIEWPORT) console.log(`[ensaio] viewport ${process.env.ENSAIO_VIEWPORT}`);
const dirJ = path.join(RAIZ, 'ensaio', 'jornadas');
const arquivos = fs.readdirSync(dirJ).filter(f => f.endsWith('.mjs')).sort().filter(f => !filtro.length || filtro.some(j => f.startsWith(j)));

/** Ruído conhecido do ambiente offline (não é defeito do site): Cloud Functions inalcançáveis e CDNs. */
const RUIDO = [/cloudfunctions|FirebaseError: internal|gs-callable-get/, /false for '(get|list)' @ L\d+|Missing or insufficient permissions|sessão de gerência|classificar as castas/, /ERR_CONNECTION_REFUSED|ERR_ABORTED|net::ERR_/, /Failed to load resource/, /emailjs/i,
];
// F-07 corrigido em 08/11: 'Falha na agenda de reuniões… responsabilidade atual' voltou a ser erro grave (não está mais em RUIDO).
export const erroGrave = e => !RUIDO.some(r => r.test(e));

const resultados = [];
const registrar = r => { resultados.push(r); console.log(`${r.ok ? '✅' : '❌'} ${r.jornada} · ${r.caso} · ${r.ms} ms · ${r.detalhe}`); };

fs.rmSync(SAIDA, { recursive: true, force: true }); fs.mkdirSync(SAIDA, { recursive: true });
const amb = await subir();
let nav;
try {
  const seed = criarSeed(amb.portas);
  if (process.env.ENSAIO_DADOS_REAIS) await seedReal(seed, process.env.ENSAIO_DADOS_REAIS, { portas: amb.portas }); else await seedPadrao(seed);
  await amb.aguardarFunctionsOciosas();
  nav = await abrirNavegador(amb.portas);
  for (const f of arquivos) {
    const j = await import(path.join(dirJ, f));
    console.log(`\n── ${j.id} — ${j.nome}`);
    try { await j.executar({ amb, seed, nav, erroGrave, registrar }); }
    catch (e) { registrar({ jornada: j.id, caso: 'execução', ok: false, ms: 0, detalhe: 'exceção: ' + String(e).slice(0, 200) }); }
  }
  // Sentinela das rules. O que o log do emulador prova: toda negação (PERMISSION_DENIED) aqui é negação em produção também.
  // As frases "maximum of 1000 expressions" e "evaluation error" que acompanham uma negação são diagnóstico verboso do
  // emulador (DefaultEmulatorRulesAuthorizer.withVerboseErrors reavalia a regra sem curto-circuito) — não ocorrem em produção
  // e não são sinal de regra quebrada (provado na R2 por bisseção: A só e B só passam, A||B "estoura"). Por isso o portão
  // olha o que importa: ESCRITA negada = o site tentou gravar onde a regra proíbe (bug do site ou da regra) → vermelho.
  // Leitura negada é esperada para papéis sem acesso (F-03) → só informativo.
  try {
    const log = fs.readFileSync(path.join(RAIZ, 'ensaio/.runtime/firestore-debug.log'), 'utf8');
    // REST: "PERMISSION_DENIED: \n<detalhe>"; SDK (WebChannel): "Operation failed: \n<detalhe>" — o detalhe traz "for 'update' @ L…"
    const blocos = [...log.matchAll(/(?:PERMISSION_DENIED|Operation failed): ?\n([^\n]*for '(?:get|list|create|update|delete)'[^\n]*)/g)].map(m => m[1]);
    const metodos = b => [...new Set([...b.matchAll(/for '(get|list|create|update|delete)' @ (L\d+)/g)].map(m => m[1] + '@' + m[2]))];
    const escritas = [], leituras = [];
    for (const b of blocos) { const ms = metodos(b); (ms.some(m => /^(create|update|delete)@/.test(m)) ? escritas : leituras).push(ms.join(',')); }
    const resumo = arr => Object.entries(arr.reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {})).map(([k, n]) => `${n}× ${k}`).join(' | ');
    registrar({ jornada: 'RULES', caso: 'nenhuma ESCRITA negada pelas rules (site não tenta gravar onde a regra proíbe)', ok: escritas.length === 0, ms: 0, detalhe: escritas.length ? resumo(escritas) : 'ok' });
    registrar({ jornada: 'RULES', caso: 'leituras negadas (informativo — negação legítima por papel)', ok: true, ms: 0, detalhe: leituras.length ? resumo(leituras) : 'nenhuma' });
  } catch (e) { registrar({ jornada: 'RULES', caso: 'leitura do log do emulador', ok: false, ms: 0, detalhe: String(e).slice(0, 120) }); }
} finally { try { await nav?.fechar(); } catch {} await amb.parar(); }

const ok = resultados.filter(r => r.ok).length, total = resultados.length;
fs.writeFileSync(path.join(SAIDA, 'resultado.json'), JSON.stringify({ em: new Date().toISOString(), git: (() => { try { return fs.readFileSync(path.join(RAIZ, '.git', 'HEAD'), 'utf8').trim(); } catch { return '?'; } })(), ok, total, resultados }, null, 2));
console.log(`\nRESULTADO: ${ok}/${total} casos OK ${ok === total ? '— PORTÃO VERDE' : '— PORTÃO VERMELHO'}`);
process.exit(ok === total ? 0 : 1);
