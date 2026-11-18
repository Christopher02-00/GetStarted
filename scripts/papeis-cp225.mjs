// CP225 (18/11/2026) — quem pode cada função vem de um lugar só: papeis-funcoes.json.
// As rules não aceitam import, então este script escreve as funções de papel nas rules e a lista da tela.
//   node scripts/papeis-cp225.mjs            → só confere; sai com erro se a tela, as rules ou o json divergirem
//   node scripts/papeis-cp225.mjs --aplicar  → reescreve o bloco das rules e a lista da tela a partir do json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = f => readFileSync(join(raiz, f), 'utf8');
const fonte = JSON.parse(ler('papeis-funcoes.json'));
const aplicar = process.argv.includes('--aplicar');
const erros = [];

const FUNCOES_RULES = { legendar: 'papeisLegendarCp225', agendar: 'papeisAgendarCp225' };
const blocoRules = () => [
  '// <papeis-cp225> gerado por scripts/papeis-cp225.mjs a partir de papeis-funcoes.json — não edite à mão',
  ...Object.entries(FUNCOES_RULES).map(([f, nome]) => `function ${nome}(){return [${fonte.funcoes[f].map(p => { const z = fonte.emails[p]; if (!z) throw Error(`papeis-funcoes.json: ${p} sem e-mail`); return z + '()'; }).join(',')}];}`),
  '// </papeis-cp225>'
].join('\n');
const LINHA_TELA = () => `const PAPEIS_LEGENDA_FILA_CP209=Object.freeze([${fonte.funcoes.legendar.map(p => `'${p}'`).join(',')}]);const PAPEIS_LEGENDA_ATIVOS_CP225=Object.freeze([${fonte.funcoes.legendar.filter(p => fonte.ativos.includes(p)).map(p => `'${p}'`).join(',')}]);`;

// 1. Toda função tem pelo menos uma pessoa ativa (tirar alguém da equipe não deixa a função sem dono).
for (const [f, lista] of Object.entries(fonte.funcoes)) {
  if (!lista.some(p => fonte.ativos.includes(p))) erros.push(`a função "${f}" ficou sem nenhuma pessoa ativa`);
}

// 2. Rules: o bloco gerado bate com o json e as regras da legenda usam as funções, não listas soltas.
let rules = ler('firestore.rules');
const reBloco = /\/\/ <papeis-cp225>[\s\S]*?\/\/ <\/papeis-cp225>/;
if (aplicar) rules = reBloco.test(rules) ? rules.replace(reBloco, blocoRules()) : rules.replace(/(function Z40\(\)\{[^\n]*\n)/, `$1${blocoRules()}\n`);
if ((rules.match(reBloco) || [''])[0] !== blocoRules()) erros.push('firestore.rules: o bloco <papeis-cp225> não bate com papeis-funcoes.json (rode --aplicar)');
for (const fn of ['dH', 'dI']) {
  const corpo = (rules.match(new RegExp(`function ${fn}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`)) || [''])[0];
  if (!corpo) { erros.push(`firestore.rules: função ${fn} não encontrada`); continue; }
  if (/B in\[Z/.test(corpo)) erros.push(`firestore.rules: ${fn} ainda tem lista de e-mails solta (use ${Object.values(FUNCOES_RULES).join(' / ')})`);
}

// Vídeo: quem legenda grava o ponteiro postagemId (só quando ele está vazio) — sem isso a Cecília era barrada.
if (!rules.includes("y2()in papeisLegendarCp225()&&\n!XE()&&\naA()&&")) erros.push('firestore.rules: videos_producao não usa papeisLegendarCp225 para o postagemId');

// 3. Tela: a lista de quem legenda na fila é a mesma do json.
let tela = ler('escritorio.html');
const reTela = /const PAPEIS_LEGENDA_FILA_CP209=Object\.freeze\(\[[^\]]*\]\);(?:const PAPEIS_LEGENDA_ATIVOS_CP225=Object\.freeze\(\[[^\]]*\]\);)?/;
if (!reTela.test(tela)) erros.push('escritorio.html: PAPEIS_LEGENDA_FILA_CP209 não encontrada');
else if (aplicar) tela = tela.replace(reTela, LINHA_TELA());
if ((tela.match(reTela) || [''])[0] !== LINHA_TELA()) erros.push('escritorio.html: PAPEIS_LEGENDA_FILA_CP209 diverge de papeis-funcoes.json "legendar"');

// 4. Painel da Stokki (agendar por rede): mesma lista de "agendar".
const stokki = ler('stokki-publicacao.mjs');
const agendaStokki = (stokki.match(/exigir\(\[([^\]]*)\]\.includes\(ctx\.papel\)/) || [])[1];
const igual = (a, b) => [...a].sort().join() === [...b].sort().join();
if (!agendaStokki || !igual(agendaStokki.replace(/'/g, '').split(','), fonte.funcoes.agendar)) erros.push('stokki-publicacao.mjs: quem opera a agenda da Stokki diverge de papeis-funcoes.json "agendar"');

if (aplicar && !erros.length) { writeFileSync(join(raiz, 'firestore.rules'), rules); writeFileSync(join(raiz, 'escritorio.html'), tela); }
if (erros.length) { console.error('❌ papéis divergentes:\n- ' + erros.join('\n- ')); process.exit(1); }
console.log(`✅ papéis iguais na tela e nas rules · ${Object.entries(fonte.funcoes).map(([f, l]) => `${f}: ${l.join(', ')}`).join(' · ')}`);
