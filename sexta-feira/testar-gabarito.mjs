// Roda o gabarito do Guardião. Sai com erro se UM caso falhar (falta de veto ou veto a mais).
// Uso: node sexta-feira/testar-gabarito.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditar, blocos } from './guardiao.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const cofre = JSON.parse(fs.readFileSync(path.join(aqui, 'cofre/regras.json'), 'utf8'));
const { casos } = JSON.parse(fs.readFileSync(path.join(aqui, 'gabarito/guardiao.json'), 'utf8'));

// 1) Toda regra do Cofre precisa ter pelo menos um caso que a prove (regra sem teste não entra).
const provadas = new Set(casos.flatMap(c => c.deve));
// toda regra de texto precisa compilar (26/11: um parêntese a mais quase entrou no Cofre)
for (const r of cofre.regras) if (r.padrao) { try { new RegExp(r.padrao, 'giu'); } catch (e) { console.error(`REGRA QUEBRADA ${r.id}: ${e.message}`); process.exit(1); } }
const semProva = cofre.regras.map(r => r.id).filter(id => !provadas.has(id));

let falhas = 0;
const linhas = [];
for (const c of casos) {
  const achados = auditar(cofre, c.cliente, [c.item]);
  const pegou = [...new Set(achados.map(a => a.regra))].sort();
  const esperado = [...c.deve].sort();
  const faltou = esperado.filter(x => !pegou.includes(x));
  const sobrou = pegou.filter(x => !esperado.includes(x));
  // prova anti-alucinação: cada trecho citado existe no texto do item
  const textoItem = blocos(c.item).map(b => b.texto).join(' ').replace(/\s+/g, ' ');
  const semLastro = achados.filter(a => a.campo !== 'data' && !textoItem.includes(a.trecho.replace(/^…|…$/g, '').slice(0, 20)));
  const ok = !faltou.length && !sobrou.length && !semLastro.length;
  if (!ok) falhas++;
  linhas.push(`${ok ? 'OK  ' : 'FALHOU'} ${c.id}${faltou.length ? ` · não pegou ${faltou.join(',')}` : ''}${sobrou.length ? ` · barrou a mais ${sobrou.join(',')}` : ''}${semLastro.length ? ` · ${semLastro.length} trecho(s) sem lastro` : ''}`);
}
console.log(linhas.join('\n'));
console.log(`\n${casos.length - falhas}/${casos.length} casos certos · regras no Cofre: ${cofre.regras.length} · regras sem caso no gabarito: ${semProva.length ? semProva.join(', ') : 'nenhuma'}`);
if (semProva.length) { falhas++; console.error('Regra sem caso no gabarito não entra: ' + semProva.join(', ')); }
if (falhas) { console.error(`\nGABARITO REPROVADO: ${falhas} caso(s). Nada entra até corrigir.`); process.exit(1); }
