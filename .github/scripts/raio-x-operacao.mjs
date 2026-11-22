// Raio-X da operação (Programa Estabilidade, 21/11/2026). SÓ LEITURA. Cada regra é algo que nunca deveria acontecer na operação:
// o que entra (cliente, gravação, pedido) precisa chegar a alguém ativo, e o que alguém entrega precisa ter quem receba/aprove.
// Uma fonte só para os dois usos:
//   • vigia diário com os dados reais:  node .github/scripts/raio-x-operacao.mjs [--json saida.json]   (GOOGLE_APPLICATION_CREDENTIALS só-leitura)
//   • exportação anonimizada local:     node .github/scripts/raio-x-operacao.mjs --exportacao <pasta> [--hoje AAAA-MM-DD] [--detalhe]
// Vermelho = item que ninguém vai resolver sozinho (o run falha e o GitHub avisa). Amarelo = fila parada com dono (só informa).
// Itens antigos já levados ao Chris e aguardando decisão ficam em `.github/raio-x-conhecidos.json` e aparecem como amarelo "conhecido".
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const COLECOES_RAIO_X = ['usuarios_equipe', 'demandas', 'videos_producao', 'postagens', 'calendarios', 'calendarios_cliente', 'revisoes_ajustes_cp112',
  'calendarios_ajustes_internos_cp123', 'avisos_do_cliente', 'notificacoes_operacionais_i165', 'notificacoes_dispositivos_i165', 'planejamento_social_i155'];
export const EDITORES_RAIO_X = ['Helo', 'João Victor'];
const GESTAO = ['Chris', 'Amanda'];
const POST_FINAL = ['cancelada_manual', 'cancelada_video_trafego', 'arquivada_sem_postagem', 'postado', 'finalizado'];
const ABERTA = s => ['pendente', 'concluida_aguardando_aprovacao', 'em_andamento', undefined, null, ''].includes(s);
const TIPOS_REVISOR_PROPRIO = ['aguardando_resposta', 'providencia_gravacao_cp140', 'organizacao_social_i167', 'planejamento_social_i155'];

export function ts(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (v.__ts) return v.__ts;
  if (typeof v._seconds === 'number') return new Date(v._seconds * 1000).toISOString();
  return '';
}
const curto = (s, n = 60) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

/** Aplica as regras a coleções em memória ({nome: [docs com __id]}). Puro: não lê nem grava nada. */
export function raioXOperacao(dados, hoje = new Date().toISOString().slice(0, 10), conhecidos = []) {
  const L = n => Array.isArray(dados[n]) ? dados[n] : [];
  const dias = a => { const d = String(a || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? Math.floor((Date.parse(hoje) - Date.parse(d)) / 864e5) : null; };
  // conhecidos: [{regra, ref}] (um item) ou [{regra, antesDe}] (todo item da regra com data anterior — legado já levado ao Chris)
  const lista = conhecidos instanceof Set ? [...conhecidos].map(k => ({ regra: k.split('|')[0], ref: k.split('|').slice(1).join('|') })) : (conhecidos || []);
  const ehConhecido = (regra, ref, data) => lista.some(k => k.regra === regra.split(' ')[0] && (k.ref ? k.ref === ref : !!k.antesDe && !!data && String(data) < k.antesDe));
  const out = [], add = (grav, regra, ref, detalhe, quem, data = '') => { const conhecido = ehConhecido(regra, ref, data); out.push({ grav: conhecido ? 'amarelo' : grav, conhecido, regra, ref, detalhe, quem }); };
  const ativos = new Set(L('usuarios_equipe').filter(u => u.ativo === true && !u.excluido && !u.desligamentoCp183).map(u => u.pessoa));
  const ativo = p => !p || ativos.has(p) || GESTAO.includes(p);
  const dem = L('demandas').filter(d => !d.excluido), vids = L('videos_producao'), posts = L('postagens'), cals = L('calendarios').filter(c => !c.excluido && !c.arquivado);
  const revs = L('revisoes_ajustes_cp112'), ints = L('calendarios_ajustes_internos_cp123'), copias = new Map(L('calendarios_cliente').map(c => [c.__id, c]));
  const vidPorId = new Map(vids.map(v => [v.__id, v])), postPorId = new Map(posts.map(p => [p.__id, p]));
  const demIds = new Set(L('demandas').map(d => d.__id)), demPorOrig = new Set(L('demandas').filter(d => d.origemAvisoId).map(d => d.origemAvisoId));

  // A — demandas
  for (const d of dem) {
    if (!ABERTA(d.status)) continue;
    const dest = d.destinatario;
    if (dest && !ativo(dest)) add('vermelho', 'A1 demanda aberta com pessoa desligada/inativa', d.__id, `${dest} · “${curto(d.titulo, 70)}” · ${d.status || 'sem status'}`, 'Amanda (redistribuir)');
    if (/^i53_/.test(d.__id) && d.tipoEspecial !== 'retirada' && /Vídeo para editar/.test(d.titulo || '') && dest && !EDITORES_RAIO_X.includes(dest)) add('vermelho', 'A2 demanda de edição aberta para quem não edita', d.__id, `${dest} · “${curto(d.titulo, 70)}”`, 'Amanda (trocar editor)');
    if (d.status === 'concluida_aguardando_aprovacao') {
      const e = dias(ts(d.concluidaEm) || ts(d.concluidoEm) || d.prazoData);
      const semAprovador = String(d.origem || '').toLowerCase() === 'sistema' && dest === 'Amanda' && d.ehAviso !== true && !d.demandaClienteId && !TIPOS_REVISOR_PROPRIO.includes(d.tipoEspecial);
      if (semAprovador && e !== null && e > 1) add('vermelho', 'A6 entrega sem ninguém para aprovar', d.__id, `Amanda · ${e} dias · “${curto(d.titulo)}”`, 'Chris (fechar antigas) — CP245 fecha as novas', ts(d.concluidaEm) || ts(d.concluidoEm) || d.prazoData);
      else if (!semAprovador && e !== null && e > 5) add('amarelo', 'A5 entregue esperando aprovação há mais de 5 dias', d.__id, `de ${dest} · ${e} dias · “${curto(d.titulo)}”`, 'quem aprova');
    }
    const venc = dias(d.prazoData); if (d.status === 'pendente' && venc !== null && venc > 7) add('amarelo', 'A4 demanda pendente vencida há mais de 7 dias', d.__id, `${dest} · ${venc} dias · “${curto(d.titulo)}”`, dest);
  }

  // B/E — pedidos do cliente, meses publicados e identidade dos conteúdos (mês atual e futuros)
  const mesAtual = hoje.slice(0, 7);
  for (const c of cals) {
    for (const [mes, m] of Object.entries(c.aprovacaoMeses || {})) {
      if (!m || mes < mesAtual) continue;
      const ciclo = mes + '__' + c.__id, pub = m.retratoLiberadoV115, desde = pub?.publicadoEm || '';
      const abertos = Object.values(c.pedidosAjusteClienteI71 || {}).filter(p => p?.competencia === mes && !p.cancelamentoCp143 && (!desde || String(p.criadoEm) > desde));
      for (const p of abertos) {
        const dd = dem.find(d => d.operationId === p.operationId || d.origemAvisoId === p.operationId), r = revs.find(x => x.operationId === p.operationId);
        if (!dd && !r && dias(p.criadoEm) > 0) add('vermelho', 'B1 pedido do cliente sem demanda', ciclo, `“${curto(p.itemNome)}” · ${String(p.criadoEm).slice(0, 10)}`, 'Chris');
        else if (dd && !ativo(dd.destinatario)) add('vermelho', 'B2 pedido do cliente com demanda para pessoa desligada', ciclo, `${dd.destinatario} · “${curto(p.itemNome, 50)}”`, 'Chris');
      }
      if (m.status === 'ajuste_interno') {
        const rv = revs.filter(x => x.ciclo === ciclo && x.estado !== 'cancelado'), iv = ints.filter(x => x.ciclo === ciclo && !['publicado', 'substituido', 'descartado', 'cancelado'].includes(x.estado));
        const pend = abertos.length + rv.filter(x => x.estado !== 'aprovado').length + iv.length;
        if (!pend && !rv.some(x => x.estado === 'aprovado') && dias(m.em) > 2) add('amarelo', 'B3 mês reaberto sem nada pendente', ciclo, `ajuste_interno por ${m.por} desde ${String(m.em).slice(0, 10)}`, 'Amanda (liberar ou conferir)');
        for (const x of rv.filter(x => x.estado === 'enviado')) { const e = dias(ts(x.envio?.em) || ts(x.atualizadoEm)); if (e > 2) add('amarelo', 'B4 correção esperando a Amanda há mais de 2 dias', ciclo, `${e} dias · item ${x.itemId}`, 'Amanda'); }
      }
      if (m.status === 'liberado' && pub?.items) {
        const cp = copias.get(c.__id);
        if (!cp) add('vermelho', 'E2 cliente sem cópia do calendário', ciclo, 'calendarios_cliente ausente', 'conferência técnica');
        else {
          const ids = l => new Set((l || []).filter(i => i && !i.excluido && (i.mes === mes || String(i.dataPostagem || '').startsWith(mes))).map(i => i.itemId));
          const a = ids(pub.items), b = ids(cp.items), programadas = new Set((cp.items || []).filter(i => i && (i.agendado === true || i.posted === true)).map(i => i.itemId));
          const falta = [...a].filter(x => !b.has(x)), sobra = [...b].filter(x => !a.has(x) && !programadas.has(x));
          if (falta.length || sobra.length) add('vermelho', 'E2 cópia do cliente diferente do que a Amanda liberou', ciclo, `faltam ${falta.length} · sobram ${sobra.length}`, 'conferência técnica');
        }
      }
      const itens = (c.items || []).filter(i => i && !i.excluido && (i.mes === mes || String(i.dataPostagem || '').startsWith(mes)));
      const semId = itens.filter(i => !i.itemId).length; if (semId) add('vermelho', 'E1 conteúdo sem identidade (itemId)', ciclo, `${semId} conteúdo(s)`, 'Chris (Corrigir identidades)');
      const idl = itens.map(i => i.itemId).filter(Boolean), dup = [...new Set(idl.filter((x, k) => idl.indexOf(x) !== k))];
      if (dup.length) add('vermelho', 'E1 conteúdo com identidade repetida', ciclo, curto(dup.join(', '), 120), 'conferência técnica');
    }
  }

  // C/D — vídeos e postagens
  for (const v of vids) {
    if (v.excluido) continue;
    if (['aguardando_edicao', 'correcao'].includes(v.status)) {
      if (!v.editorAtribuido) { const e = dias(v.data || ts(v.criadoEm)); if (e > 2) add('amarelo', 'C1 vídeo sem editor há mais de 2 dias', v.__id, `${v.clienteNome || v.cliente} · “${curto(v.titulo, 50)}” · ${e} dias`, 'Amanda (distribuir)'); }
      else if (!EDITORES_RAIO_X.includes(v.editorAtribuido)) add('vermelho', 'C2 vídeo para editar com quem não edita', v.__id, `${v.editorAtribuido} · ${v.clienteNome || v.cliente} · “${curto(v.titulo, 50)}”`, 'Amanda (trocar editor)');
    }
    if (v.status === 'aprovado') {
      const p = postPorId.get(v.postagemId || ('video_' + v.__id));
      if (!p) add('vermelho', 'C3 vídeo aprovado sem postagem', v.__id, `${v.clienteNome || v.cliente} · “${curto(v.titulo, 50)}”`, 'conferência técnica');
      else if (p.videoId && p.videoId !== v.__id) add('vermelho', 'C4 ponteiro vídeo↔postagem trocado', v.__id, `postagem ${p.__id} aponta ${p.videoId}`, 'conferência técnica');
    }
  }
  const atrasadasPor = {};
  for (const p of posts) {
    if (p.excluido || POST_FINAL.includes(p.status)) continue;
    if (p.videoId) { const v = vidPorId.get(p.videoId); if (!v || v.excluido) add('vermelho', 'D1 postagem ativa com vídeo excluído/inexistente', p.__id, `${p.clienteNome || p.cliente} · ${p.status} · “${curto(p.titulo, 50)}”`, 'Amanda/Cecília (encerrar) — CP244 encerra as novas'); }
    if (p.status === 'agendado' && p.dataAgendada && dias(p.dataAgendada) > 2) atrasadasPor.Cecília = (atrasadasPor.Cecília || 0) + 1;
    if (p.status === 'aguardando_legenda') { const e = dias(ts(p.criadoEm)); if (e > 3) add('amarelo', 'D3 esperando legenda há mais de 3 dias', p.__id, `${p.clienteNome || p.cliente} · ${e} dias`, 'quem legenda'); }
    if (p.status === 'aguardando_agendamento') { const e = dias(ts(p.legendaEm) || ts(p.criadoEm)); if (e > 3) add('amarelo', 'D4 legenda pronta esperando agendamento há mais de 3 dias', p.__id, `${p.clienteNome || p.cliente} · ${e} dias`, 'Cecília (agendar)'); }
  }
  for (const [q, n] of Object.entries(atrasadasPor)) add('amarelo', 'D2 agendadas que já passaram sem confirmação de publicação', q, `${n} postagem(ns) com data passada há mais de 2 dias`, q + ' (confirmar em Publicações para conferir)');
  // D5 (só com os dados reais): a conferência do próprio servidor (fontesPostagemTxI165) recusa a postagem → na fila ela aparece como
  // "não pôde ser conferido" e a Cecília não consegue programar/confirmar pelo caminho normal (CP247).
  for (const x of Array.isArray(dados.__naoConferidas) ? dados.__naoConferidas : []) add('vermelho', 'D5 postagem que o servidor não consegue conferir', x.id, `${x.cliente} · ${x.status} · “${curto(x.titulo, 50)}” — ${curto(x.motivo, 110)}`, 'conferência técnica (identidade da postagem)');

  // F — o que vem do cliente chega a alguém (desde a conversão I54 com vínculo, 11/09/2026)
  for (const a of L('avisos_do_cliente')) {
    if (a.excluido || a.cancelado || a.cancelamentoCp143) continue;
    const em = ts(a.criadoEm), idade = dias(em);
    if (String(em) >= '2026-09-11' && a.viraDemanda === true && !(a.demandaInternaId && demIds.has(a.demandaInternaId)) && !demPorOrig.has(a.__id) && idade > 1)
      add('vermelho', 'F1 pedido do cliente que não virou demanda', a.__id, `${a.cliente} · ${a.tipo || 'pedido'} · ${String(em).slice(0, 10)} · para ${a.paraQuem}`, 'Chris (converter)');
    // o pedido vira demanda quando o destinatário abre Minhas Demandas (editoriais: servidor CP175 a cada 5 min); mais de 4 h = ninguém abriu
    const horas = em ? (Date.parse(dados.__agora || hoje + 'T15:00:00Z') - Date.parse(em)) / 36e5 : 0;
    if (String(em) >= '2026-09-11' && a.viraDemanda === true && a.lido === false && !a.demandaInternaId && idade !== null && idade <= 1 && horas > 4)
      add('amarelo', 'F3 pedido do cliente esperando a pessoa abrir Minhas Demandas', a.__id, `${a.cliente} · ${a.tipo || 'pedido'} · para ${a.paraQuem}`, (a.paraQuem || 'Amanda') + ' (abrir Minhas Demandas)');
    if (a.paraQuem && !ativo(a.paraQuem) && idade !== null && idade <= 14) add('vermelho', 'F2 aviso do cliente indo para pessoa desligada', a.__id, `${a.cliente} · para ${a.paraQuem} · ${String(em).slice(0, 10)}`, 'conferência técnica');
  }

  // H — documentos da preparação (Amanda → Chris)
  // H1 (CP249, 22/11): ciclo criado para um mês que já tinha passado. Os documentos de janeiro da Master Chef e da Divina Cantina foram para
  // janeiro de 2026 em 20/11/2026 e "sumiram" do mês certo. Some quando o mês certo (mesmo mês, ano seguinte) recebe o documento.
  { const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const ext = m => /^\d{4}-\d{2}$/.test(m || '') ? MES[Number(m.slice(5)) - 1] + ' de ' + m.slice(0, 4) : String(m || '');
    const soma = (m, n) => { const [a, b] = m.split('-').map(Number), d = new Date(Date.UTC(a, b - 1 + n, 1)); return d.toISOString().slice(0, 7); };
    const mesBRT = iso => iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date(iso)).slice(0, 7) : '';
    const preps = L('planejamento_social_i155'), porId = new Map(preps.map(c => [c.__id, c])), atual = hoje.slice(0, 7);
    for (const c of preps) {
      const cr = mesBRT(ts(c.criadoEm)); if (!cr || !c.competencia || c.competencia >= soma(cr, -1)) continue;
      let certo = c.competencia; while (certo < cr) certo = soma(certo, 12);
      if (certo < soma(atual, -1) || porId.get(certo + '__' + c.cliente)?.documentos?.consolidadoEnviado) continue;
      add('amarelo', 'H1 documento enviado para um mês que já passou', c.__id, `${c.clienteNome || c.cliente} · foi para ${ext(c.competencia)} em ${ts(c.documentos?.enviadoEm || c.criadoEm).slice(0, 10)} (${c.documentos?.enviadoPor || c.autorNome || '?'}) · o mês certo é ${ext(certo)}`, 'Amanda (reenviar o documento no mês certo)', ts(c.criadoEm).slice(0, 10));
    }
    // H2 (CP251): versão nova do documento guardada e não enviada há mais de 1 dia — o Chris continua criando sobre a anterior
    for (const c of preps) {
      if (!c.competencia || c.competencia < soma(atual, -1) || c.incluido === false || c.publicacaoAtual) continue; // mês já liberado: a versão nova não muda o que o cliente recebeu
      const d = c.documentos || {};
      for (const [k, rid] of Object.entries(d.rascunhos || {})) {
        if (!k.startsWith('campanha__') || !d.materiais?.[k] || d.materiais[k] === rid) continue;
        const ev = ts(c.atualizadoEm).slice(0, 10), idade = dias(ev);
        if (idade !== null && idade < 1) continue;
        add('amarelo', 'H2 versão nova do documento guardada e não enviada', c.__id + '|' + k, `${c.clienteNome || c.cliente} · ${ext(c.competencia)} · o Chris continua vendo a versão anterior${idade !== null ? ` · há ${idade} dia(s)` : ''}`, 'Amanda (Confirmar e enviar documento, ou descartar a versão nova)', ev);
      }
    }
  }

  // G — avisos da operação: chegam a quem precisa?
  const notas = L('notificacoes_operacionais_i165').filter(n => n.estado === 'pendente'), aparelhos = new Set(L('notificacoes_dispositivos_i165').filter(d => d.ativo === true).map(d => d.pessoa));
  const porPessoa = {};
  for (const n of notas) { if (n.destinatario && !ativo(n.destinatario)) add('vermelho', 'G1 aviso pendente para pessoa desligada', n.__id, `${n.destinatario} · ${n.tipo || n.nivel || '-'}`, 'conferência técnica'); porPessoa[n.destinatario] = (porPessoa[n.destinatario] || 0) + 1; }
  for (const [p, q] of Object.entries(porPessoa)) if (p && !aparelhos.has(p)) add('amarelo', 'G2 pessoa sem celular ligado aos avisos', p, `${q} aviso(s) pendente(s) só aparecem quando ${p} abre o site`, p + ' (Início → Avisos → "Ativar no meu aparelho")');

  const ordem = { vermelho: 0, amarelo: 1 };
  return out.sort((a, b) => ordem[a.grav] - ordem[b.grav] || a.regra.localeCompare(b.regra) || String(a.ref).localeCompare(String(b.ref)));
}

export function relatorioRaioX(out, hoje, { detalhe = false, limite = 8 } = {}) {
  const linhas = [`## Raio-X da operação — ${hoje}`, '', `**${out.filter(o => o.grav === 'vermelho').length} vermelho(s) · ${out.filter(o => o.grav === 'amarelo').length} amarelo(s)**`, ''];
  const grupos = new Map(); for (const o of out) { const k = (o.grav === 'vermelho' ? '🟥 ' : '🟨 ') + o.regra + (o.conhecido ? ' (conhecido, aguarda decisão)' : ''); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(o); }
  for (const [k, l] of grupos) {
    linhas.push(`- ${k}: **${l.length}** — resolve: ${l[0].quem}`);
    for (const o of l.slice(0, detalhe ? l.length : (k.startsWith('🟥') ? limite : 3))) linhas.push(`  - ${o.detalhe}`);
    if (!detalhe && l.length > (k.startsWith('🟥') ? limite : 3)) linhas.push(`  - … e mais ${l.length - (k.startsWith('🟥') ? limite : 3)}`);
  }
  if (!out.length) linhas.push('✅ Nada travado.');
  return linhas.join('\n');
}

function lerConhecidos() {
  try { return JSON.parse(fs.readFileSync(path.join(RAIZ, '.github/raio-x-conhecidos.json'), 'utf8')).itens || []; } catch { return []; }
}

async function lerFirestore() {
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  const { initializeApp, applicationDefault } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  const projectId = process.argv.includes('--projeto') ? process.argv[process.argv.indexOf('--projeto') + 1] : 'get-started-4956d';
  initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId } : { credential: applicationDefault(), projectId });
  return lerDadosRaioX(getFirestore());
}

/** Lê as coleções do Raio-X e roda a conferência D5. SÓ LEITURA: get() de coleções e transações readOnly. */
export async function lerDadosRaioX(db) {
  const dados = {};
  for (const c of COLECOES_RAIO_X) {
    let q = db.collection(c);
    if (c === 'notificacoes_operacionais_i165') q = q.where('estado', '==', 'pendente');
    dados[c] = (await q.get()).docs.map(s => ({ __id: s.id, ...s.data() }));
  }
  // D5: a mesma conferência que a fila da Cecília usa, em transação SÓ LEITURA, para cada postagem ativa
  const { fontesPostagemTxI165 } = await import(pathToFileURL(path.join(RAIZ, 'functions-get/fontes.mjs')).href);
  dados.__naoConferidas = [];
  for (const p of dados.postagens.filter(p => !p.excluido && !POST_FINAL.includes(p.status))) {
    try { await db.runTransaction(tx => fontesPostagemTxI165(db, tx, p.__id, new Date()), { readOnly: true }); }
    catch (e) { dados.__naoConferidas.push({ id: p.__id, status: p.status, cliente: p.clienteNome || p.cliente, titulo: p.titulo, motivo: String(e?.message || e).slice(0, 200) }); }
  }
  return dados;
}

async function main() {
  const arg = k => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null;
  const hoje = arg('--hoje') || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  let dados;
  if (arg('--exportacao')) { dados = {}; for (const c of COLECOES_RAIO_X) { try { dados[c] = JSON.parse(fs.readFileSync(path.join(arg('--exportacao'), c + '.json'), 'utf8')); } catch { dados[c] = []; } } }
  else { dados = await lerFirestore(); dados.__agora = new Date().toISOString(); }
  const out = raioXOperacao(dados, hoje, lerConhecidos()), texto = relatorioRaioX(out, hoje, { detalhe: process.argv.includes('--detalhe') });
  console.log(texto);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, texto + '\n');
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(out, null, 1));
  const vermelhos = out.filter(o => o.grav === 'vermelho');
  if (vermelhos.length) { console.log(`::error::${vermelhos.length} item(ns) travado(s) sem dono — veja o resumo do run`); process.exitCode = 1; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exitCode = 2; });
