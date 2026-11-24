// F5 (U5a, preparação) — "este mês tem pedido do cliente aberto?" está escrito em 5 lugares do servidor, cada um com um critério.
// Esta ferramenta mede, sobre uma exportação SÓ LEITURA (calendarios.json), em quais meses reais os critérios discordam. Não grava nada.
//   node ferramentas/f5_comparar_pedido_aberto_u5.mjs <exportacao>/calendarios.json
// Os critérios abaixo são o NÚCLEO de cada cópia (o que depende só da marca do mês); a ferramenta confere que o texto-fonte de cada um
// ainda está no arquivo e para com erro se alguém mudou a cópia (aí a ferramenta precisa ser revista junto).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FG = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'functions-get');
const fonte = f => fs.readFileSync(path.join(FG, f), 'utf8');
const exigirTexto = (f, t) => { if (!fonte(f).includes(t)) throw Error(`a cópia mudou em ${f}: não achei «${t}» — revise esta ferramenta`); };
const OP = /^cal_ajuste_v113_[a-f0-9]{48}$/;
const op = m => OP.test(String(m?.pedidoAjusteOperationId || ''));

const criterios = {
  'cp123:65 pedidoClienteAbertoCp215': ['ajustes-internos-cp123.mjs', "pedidoClienteAbertoCp215=m=>m?.status==='ajuste_interno'&&['Cliente','Amanda'].includes(m.por)",
    m => m?.status === 'ajuste_interno' && ['Cliente', 'Amanda'].includes(m.por) && op(m) && m.retratoLiberadoV115?.schemaVersion === 1],
  'cp112:119 reliberação (sem a conferência da publicação)': ['ajustes-calendarios-cp112.mjs', "pedidoClienteCp193=m.status==='ajuste_interno'&&['Cliente','Amanda'].includes(m.por)",
    m => m?.status === 'ajuste_interno' && ['Cliente', 'Amanda'].includes(m.por) && op(m)],
  'cp112:161 processo novo (qualquer autor)': ['ajustes-calendarios-cp112.mjs', "atualCp241.status==='ajuste_interno'&&/^cal_ajuste_v113_[a-f0-9]{48}$/.test(String(atualCp241.pedidoAjusteOperationId||''))&&atualCp241.retratoLiberadoV115?.schemaVersion===1",
    m => m?.status === 'ajuste_interno' && op(m) && m.retratoLiberadoV115?.schemaVersion === 1],
  'cp115:14 correção individual (só Cliente, liberado antes pela Amanda)': ['correcao-conteudo-pedido-cp115.mjs', "m.por!=='Cliente'||!validaData(m.em)||m.liberadoEmAnterior!==r?.publicadoEm||m.liberadoPorAnterior!=='Amanda'",
    m => m?.status === 'ajuste_interno' && m.por === 'Cliente' && op(m) && m.liberadoPorAnterior === 'Amanda'],
  'cp205:55 acompanhamento do cliente (só Cliente)': ['acompanhamento-cliente-cp205.mjs', "if (st === 'ajuste_interno' && marca.por === 'Cliente') return 'pedido';",
    m => m?.status === 'ajuste_interno' && m.por === 'Cliente'],
};
for (const [, [f, t]] of Object.entries(criterios)) exigirTexto(f, t);

const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), cals = Array.isArray(j) ? j : Object.values(j);
const nomes = Object.keys(criterios), combos = {}, discordantes = [];
let meses = 0, emAjuste = 0;
for (const cal of cals) for (const [mes, m] of Object.entries(cal.aprovacaoMeses || {})) {
  meses++; if (m?.status !== 'ajuste_interno') continue; emAjuste++;
  const v = nomes.map(n => criterios[n][2](m));
  const k = v.map(x => (x ? 'S' : '·')).join(' ');
  combos[k] = (combos[k] || 0) + 1;
  if (v.some(Boolean) && !v.every(Boolean)) discordantes.push(`${cal.__id || cal.client || '?'} ${mes} (por ${m.por || '—'}, operação ${op(m) ? 'válida' : 'ausente'}, retrato ${m.retratoLiberadoV115?.schemaVersion === 1 ? 'sim' : 'não'})`);
}
console.log(`${meses} marcas de mês; ${emAjuste} em ajuste_interno. Colunas (S = "tem pedido do cliente aberto"):`);
nomes.forEach((n, i) => console.log(`  ${i + 1}. ${n}`));
for (const [k, n] of Object.entries(combos).sort((a, b) => b[1] - a[1])) console.log(`  ${k}   × ${n}`);
console.log(`${discordantes.length} mês(es) em que as cópias DISCORDAM:`); for (const d of discordantes) console.log('  - ' + d);

// Tabela-verdade: os casos que podem acontecer, mesmo que não estejam no export de hoje. Onde as cópias discordam, a U5a precisa
// de UMA resposta (decidida na ficha) antes de trocar qualquer chamador.
const OPV = 'cal_ajuste_v113_' + 'a'.repeat(48);
const casos = [];
for (const por of ['Cliente', 'Amanda', 'Chris']) for (const o of [OPV, '']) for (const ret of [1, 0]) for (const ant of ['Amanda', ''])
  casos.push({ status: 'ajuste_interno', por, pedidoAjusteOperationId: o, ...(ret ? { retratoLiberadoV115: { schemaVersion: 1 } } : {}), liberadoPorAnterior: ant });
const divergentes = casos.map(m => ({ m, v: nomes.map(n => criterios[n][2](m)) })).filter(x => x.v.some(Boolean) && !x.v.every(Boolean));
console.log(`Tabela-verdade: ${casos.length} casos possíveis de "ajuste_interno", ${divergentes.length} com cópias discordando:`);
for (const { m, v } of divergentes) console.log(`  ${v.map(x => (x ? 'S' : '·')).join(' ')}   por ${m.por}, operação ${m.pedidoAjusteOperationId ? 'válida' : 'ausente'}, retrato ${m.retratoLiberadoV115 ? 'sim' : 'não'}, liberado antes por ${m.liberadoPorAnterior || '—'}`);
