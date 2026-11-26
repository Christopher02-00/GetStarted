// VARREDURA AO VIVO · Sexta-Feira (Fase 1, 26/11/2026). SÓ LEITURA.
// Roda o Guardião (mesmo código do gabarito) em todos os calendários abertos e escreve o resultado no resumo do run.
//   node sexta-feira/varrer-ao-vivo.mjs [--meses 2026-12,2027-01] [--json saida.json] [--incluir-passado]
// Meses padrão: o mês atual e os 2 seguintes. Credencial: GOOGLE_APPLICATION_CREDENTIALS (conta só-leitura).
// Não falha por achado (achado é trabalho, não quebra): falha só se não conseguir ler o servidor.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { auditarTudo } from './guardiao.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const arg = n => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);

function mesesPadrao(hoje = new Date()) {
  const out = [];
  for (let k = 0; k < 3; k++) { const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + k, 1)); out.push(d.toISOString().slice(0, 7)); }
  return out;
}

const cofre = JSON.parse(fs.readFileSync(path.join(AQUI, 'cofre/regras.json'), 'utf8'));
const meses = (arg('--meses') || '').split(',').filter(Boolean);
const mesesUsados = meses.length ? meses : mesesPadrao();

const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
const { initializeApp, applicationDefault } = req('firebase-admin/app');
const { getFirestore } = req('firebase-admin/firestore');
const projectId = arg('--projeto') || 'get-started-4956d';
initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId } : { credential: applicationDefault(), projectId });

const snap = await getFirestore().collection('calendarios').get();
const cal = {};
snap.forEach(s => { cal[s.id] = s.data().items || []; });
// Só o que ainda vai ao ar: conteúdo com data anterior a hoje (Brasília) já foi postado e é histórico, não trabalho.
// (1ª rodada na main, 26/11: o mês corrente trouxe 20+ itens de novembro já publicados, de antes das regras.)
const hojeBR = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const dataItem = i => (i.dataPostagem && /^\d{4}-\d{2}-\d{2}$/.test(i.dataPostagem)) ? i.dataPostagem : (i.mes && i.day ? `${i.mes}-${String(i.day).padStart(2, '0')}` : '');
const incluirPassado = process.argv.includes('--incluir-passado');
for (const k of Object.keys(cal)) cal[k] = cal[k].filter(i => incluirPassado || !dataItem(i) || dataItem(i) >= hojeBR);
const achados = auditarTudo(cofre, cal, mesesUsados);

const grupos = {};
for (const a of achados) {
  const k = `${a.cliente} · ${a.mes}-${String(a.dia).padStart(2, '0')} · ${a.regra}`;
  (grupos[k] ||= { nivel: a.nivel, msg: a.msg, titulo: a.titulo, trechos: [] }).trechos.push(`${a.campo}: ${a.trecho}`);
}
const erros = Object.entries(grupos).filter(([, g]) => g.nivel === 'erro');
const avisos = Object.entries(grupos).filter(([, g]) => g.nivel !== 'erro');
const linha = ([k, g]) => `- **${k}** — ${g.msg}  \n  “${g.titulo}” · ${g.trechos[0]}${g.trechos.length > 1 ? ` (+${g.trechos.length - 1})` : ''}`;
const texto = [
  `## Guardião ao vivo · Cofre ${cofre.versao} · meses ${mesesUsados.join(', ')} · ${incluirPassado ? 'com o já postado' : `de ${hojeBR} em diante`}`,
  `${snap.size} calendários lidos · ${erros.length} item(ns) com ERRO · ${avisos.length} aviso(s)`,
  '', '### Erros (precisam de correção)', ...(erros.length ? erros.map(linha) : ['- nenhum']),
  '', '### Avisos (conferir)', ...(avisos.length ? avisos.map(linha) : ['- nenhum'])
].join('\n');
console.log(texto);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, texto + '\n');
const saida = arg('--json');
if (saida) fs.writeFileSync(saida, JSON.stringify({ versao: cofre.versao, meses: mesesUsados, quando: new Date().toISOString(), achados }, null, 2));
