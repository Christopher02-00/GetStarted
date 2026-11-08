// Ensaio Get — portão de jornadas. Uso: node ensaio/rodar.mjs [--jornadas J01,J02] [--mutante caminho.js]
// Sobe emulador + seed + navegador real, roda as jornadas, imprime tabela, grava ensaio/saida/resultado.json. Sai com código 1 se algo falhar.
import fs from 'node:fs';
import path from 'node:path';
import { subir, RAIZ } from './lib/emulador.mjs';
import { criarSeed, seedPadrao } from './lib/seed.mjs';
import { abrirNavegador, SAIDA } from './lib/navegador.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const filtro = (opt('--jornadas') || '').split(',').filter(Boolean);
const dirJ = path.join(RAIZ, 'ensaio', 'jornadas');
const arquivos = fs.readdirSync(dirJ).filter(f => f.endsWith('.mjs')).sort().filter(f => !filtro.length || filtro.some(j => f.startsWith(j)));

/** Ruído conhecido do ambiente offline (não é defeito do site): Cloud Functions inalcançáveis e CDNs. */
const RUIDO = [/cloudfunctions|FirebaseError: internal|gs-callable-get/, /false for '(get|list)' @ L\d+|Missing or insufficient permissions|sessão de gerência|classificar as castas/, /ERR_CONNECTION_REFUSED|ERR_ABORTED|net::ERR_/, /Failed to load resource/, /emailjs/i];
export const erroGrave = e => !RUIDO.some(r => r.test(e));

const resultados = [];
const registrar = r => { resultados.push(r); console.log(`${r.ok ? '✅' : '❌'} ${r.jornada} · ${r.caso} · ${r.ms} ms · ${r.detalhe}`); };

fs.rmSync(SAIDA, { recursive: true, force: true }); fs.mkdirSync(SAIDA, { recursive: true });
const amb = await subir();
let nav;
try {
  const seed = criarSeed(amb.portas);
  await seedPadrao(seed);
  nav = await abrirNavegador();
  for (const f of arquivos) {
    const j = await import(path.join(dirJ, f));
    console.log(`\n── ${j.id} — ${j.nome}`);
    try { await j.executar({ amb, seed, nav, erroGrave, registrar }); }
    catch (e) { registrar({ jornada: j.id, caso: 'execução', ok: false, ms: 0, detalhe: 'exceção: ' + String(e).slice(0, 200) }); }
  }
} finally { try { await nav?.fechar(); } catch {} await amb.parar(); }

const ok = resultados.filter(r => r.ok).length, total = resultados.length;
fs.writeFileSync(path.join(SAIDA, 'resultado.json'), JSON.stringify({ em: new Date().toISOString(), git: (() => { try { return fs.readFileSync(path.join(RAIZ, '.git', 'HEAD'), 'utf8').trim(); } catch { return '?'; } })(), ok, total, resultados }, null, 2));
console.log(`\nRESULTADO: ${ok}/${total} casos OK ${ok === total ? '— PORTÃO VERDE' : '— PORTÃO VERMELHO'}`);
process.exit(ok === total ? 0 : 1);
