// Vigia da liberação (CP240, 20/11/2026). SÓ LEITURA. Roda o próprio código do servidor (central_editor_ler do editor I172) como a
// Amanda em cada mês com pedido do cliente ou ajuste interno em andamento e classifica:
//   VERMELHO  — mês atual ou futuro: tudo aprovado, há o que liberar e a Amanda NÃO tem botão (classe Fedalto/Stokki), pedido sem saída
//               ou editor que não abre (mês que já passou: amarelo "mês passado", CP240b);
//   AMARELO   — esperando alguém (Chris corrigir/enviar, Amanda revisar/liberar) — mostra com quem;
//   VERDE     — nada pendente.
// Uso: node .github/scripts/vigia-liberacao.mjs [--json saida.json]   (credencial: GOOGLE_APPLICATION_CREDENTIALS, conta só-leitura)
//      No ensaio: FIRESTORE_EMULATOR_HOST=… node … --projeto <id>
// Nunca grava: as transações recebem um objeto que só lê, e a conta do workflow só tem leitura (Cloud Datastore Viewer).
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
const mod = f => import(pathToFileURL(path.join(RAIZ, 'functions-get', f)).href);

const ESTADOS_ABERTOS_PEDIDO = ['pendente', 'rascunho', 'dependencia', 'enviado', 'devolvido', 'aprovado'];
const FINAIS_INTERNO = ['publicado', 'substituido', 'descartado', 'cancelado'];

export function somenteLeitura(db) {
  const recusa = () => { throw Error('vigia: escrita bloqueada (somente leitura)'); };
  const tx = { get: r => r.get(), getAll: (...rs) => db.getAll(...rs), set: recusa, update: recusa, create: recusa, delete: recusa };
  return new Proxy(db, { get(t, k) {
    if (k === 'runTransaction') return async fn => fn(tx);
    if (k === 'batch' || k === 'bulkWriter') return recusa;
    const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
}

/** Classifica um dto do editor (central_editor_ler) lido como a Amanda. */
export function classificarCp240(dto) {
  const mes = dto?.ciclo?.competencia, st = dto?.calendario?.aprovacaoMeses?.[mes]?.status || '';
  const pedidos = dto?.ajustesCp112 || {}, internos = dto?.internosCp123 || {}, rel = dto?.reliberacaoCp121 || {};
  const motivos = [...(pedidos.motivos || []), ...(internos.motivos || [])].filter(Boolean);
  const semSaida = motivos.filter(m => /precisa de conferência|precisam de conferência/i.test(m));
  const tudoAprovado = pedidos.liberacaoPermitida === true && (!(internos.quantidade > 0) || internos.liberacaoPermitida === true);
  const temAlgo = rel.quantidade > 0 || internos.quantidade > 0;
  const botao = dto?.capacidades?.decidir === true;
  if (semSaida.length) return { nivel: 'vermelho', estado: st, resumo: 'pedido ou ajuste sem saída', motivos: semSaida };
  if (st === 'ajuste_interno' && tudoAprovado && temAlgo && !botao)
    return { nivel: 'vermelho', estado: st, resumo: 'tudo aprovado e a Amanda sem botão de liberar', motivos: [rel.motivo, ...(internos.motivos || [])].filter(Boolean) };
  if (tudoAprovado && temAlgo && botao) return { nivel: 'amarelo', estado: st, resumo: 'tudo aprovado: com a Amanda para liberar', motivos: (dto.mudancasDiretasCp238 || []).map(x => 'mudança direta no checklist: ' + x.tipo + ' “' + x.titulo + '”') };
  if (motivos.length) return { nivel: 'amarelo', estado: st, resumo: 'em andamento', motivos };
  if (st === 'ajuste_interno') return { nivel: 'amarelo', estado: st, resumo: 'mês reaberto sem pedido nem ajuste pendente', motivos: [] };
  return { nivel: 'verde', estado: st, resumo: 'nada pendente', motivos: [] };
}

/** Lista os meses com trabalho de ajuste em andamento e lê cada um como a Amanda. */
export async function vigiarLiberacoesCp240(dbReal, { agora = new Date(), emailAmanda = 'amandachamorrosm@gmail.com' } = {}) {
  const db = somenteLeitura(dbReal);
  const { operarEditorialCalendariosI172 } = await mod('editorial-calendarios-i172.mjs');
  const { abrirEnvelopeCentralR80 } = await mod('codec-central-r80.mjs');
  const cad = (await dbReal.doc('usuarios_equipe/' + emailAmanda).get()).data() || {};
  const uid = cad.uid || 'vigia-cp240-amanda';
  const auth = { uid, token: { email: emailAmanda, email_verified: true, firebase: { sign_in_provider: 'google.com' } } };
  const mesMin = new Date(agora.getTime() - 40 * 864e5).toISOString().slice(0, 7);
  const ciclos = new Map();
  const add = (ciclo, motivo) => { if (/^20\d{2}-\d{2}__/.test(ciclo) && ciclo.slice(0, 7) >= mesMin) ciclos.set(ciclo, [...(ciclos.get(ciclo) || []), motivo]); };
  for (const s of (await dbReal.collection('calendarios').get()).docs) {
    const c = s.data(); if (c.excluido || c.arquivado || c.archived || c.deletedAt) continue;
    for (const [m, v] of Object.entries(c.aprovacaoMeses || {})) if (['ajuste_interno', 'aguardando_interna', 'aprovado_interno'].includes(v?.status) && v?.retratoLiberadoV115) add(m + '__' + s.id, 'mês ' + v.status);
  }
  for (const s of (await dbReal.collection('revisoes_ajustes_cp112').get()).docs) { const r = s.data(); if (ESTADOS_ABERTOS_PEDIDO.includes(r.estado)) add(r.ciclo, 'pedido ' + r.estado); }
  for (const s of (await dbReal.collection('calendarios_ajustes_internos_cp123').get()).docs) { const r = s.data(); if (r.estado && !FINAIS_INTERNO.includes(r.estado)) add(r.ciclo, 'ajuste interno ' + r.estado); }
  const linhas = [], mesAtual = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora).slice(0, 7);
  for (const [ciclo, porque] of [...ciclos].sort()) {
    const legado = (await dbReal.doc('continuidade_calendarios_i164/' + ciclo).get()).data()?.ativo === true;
    const pedido = { acao: 'central_editor_ler', ciclo, uidEsperado: uid, atorRealEsperado: 'Amanda', papelOperado: 'Amanda', sessao: 'vigia_cp240', ...(legado ? { origemEditorial: 'continuar_legado' } : {}) };
    try {
      const dto = abrirEnvelopeCentralR80(await operarEditorialCalendariosI172(db, auth, pedido, { agora }));
      linhas.push({ ciclo, processo: legado ? 'antigo' : 'novo', porque, ...classificarCp240(dto) });
    } catch (e) {
      linhas.push({ ciclo, processo: legado ? 'antigo' : 'novo', porque, nivel: 'vermelho', estado: '', resumo: 'o editor não abre para a Amanda', motivos: [String(e.message || e).slice(0, 400)] });
    }
    /* CP240b (20/11/2026, decisão do Chris: "a Ynayhe fica sem calendário em outubro, foi em documento"): mês que já passou não recebe mais
       liberação; a pendência antiga continua listada, em amarelo, sem derrubar o vigia. Mês atual e futuros continuam vermelhos. */
    const l = linhas.at(-1); if (l.nivel === 'vermelho' && ciclo.slice(0, 7) < mesAtual) { l.nivel = 'amarelo'; l.resumo = 'mês passado (não bloqueia): ' + l.resumo; }
  }
  return linhas;
}

export function relatorioCp240(linhas, agora = new Date()) {
  const icone = { vermelho: '🟥', amarelo: '🟨', verde: '🟩' };
  const t = [`# Vigia da liberação — ${agora.toISOString().slice(0, 16).replace('T', ' ')} UTC`, '',
    `${linhas.filter(l => l.nivel === 'vermelho').length} travado(s) · ${linhas.filter(l => l.nivel === 'amarelo').length} em andamento · ${linhas.length} mês(es) conferido(s)`, '',
    '| | Cliente · mês | Situação | Detalhes |', '|---|---|---|---|'];
  for (const l of linhas) t.push(`| ${icone[l.nivel]} | ${l.ciclo.slice(9)} · ${l.ciclo.slice(0, 7)} | ${l.resumo} (${l.estado || '—'}) | ${(l.motivos || []).slice(0, 6).join('<br>').replace(/\|/g, '/') || '—'} |`);
  return t.join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const { initializeApp } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  const app = initializeApp({ projectId: opt('--projeto') || 'get-started-4956d' }, 'vigia-cp240');
  const agora = new Date(), linhas = await vigiarLiberacoesCp240(getFirestore(app), { agora });
  const md = relatorioCp240(linhas, agora); process.stdout.write(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(linhas, null, 1));
  process.exit(linhas.some(l => l.nivel === 'vermelho') ? 1 : 0);
}
