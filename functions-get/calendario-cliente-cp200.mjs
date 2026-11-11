// CP200 (11/11/2026, etapa 2 das regras, ok do Chris) — o link do cliente só lê os meses liberados.
// Antes: o navegador do cliente lia `calendarios/{slug}` inteiro (inclusive o mês que a equipe está montando) e gravava
// aprovação, texto, observação e recado direto nele. Agora:
//  - o servidor mantém a cópia `calendarios_cliente/{slug}` só com o que o cliente pode ver (gatilho + cada ação abaixo);
//  - as quatro gravações do cliente passam por aqui, com a MESMA conferência que o calendario.html fazia;
//  - as rules negam ao cliente o documento original.
// As funções de mês abaixo são cópia fiel das versões I56 do calendario.html (mesmos nomes sem o sufixo).
import GetAprovacaoI68 from './gs-aprovacao-conteudo-i68-editorial.mjs';
import {conferirAcessoClienteTxCp193} from './pedido-ajuste-cliente-cp193.mjs';

export const COLECAO_CLIENTE_CP200 = 'calendarios_cliente';
export const ACOES_CALENDARIO_CLIENTE_CP200 = Object.freeze(['cliente_aprovar_cp200', 'cliente_textos_cp200', 'cliente_observacao_cp200', 'cliente_recado_cp200']);
const COMPETENCIA = /^20\d{2}-(0[1-9]|1[0-2])$/;
const ESTADOS_REVISAO = ['ajuste_interno', 'aguardando_interna', 'aprovado_interno'];
const falha = (code, msg) => Object.assign(new Error(msg), { code });
const exigir = (ok, code, msg) => { if (!ok) throw falha(code, msg); };

/* ---------- Mês do conteúdo e estado do mês (cópia das versões I56 do calendario.html) ---------- */
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function mesRefDoTexto(valor) {
  const t = String(valor || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const iso = t.match(/\b(20\d{2})[-\/.](0?[1-9]|1[0-2])\b/);
  if (iso) return { mes: parseInt(iso[2], 10) - 1, ano: parseInt(iso[1], 10) };
  const brasileiro = t.match(/\b(0?[1-9]|1[0-2])[-\/](20\d{2})\b/);
  if (brasileiro) return { mes: parseInt(brasileiro[1], 10) - 1, ano: parseInt(brasileiro[2], 10) };
  let i = -1;
  for (let k = 0; k < MESES_PT.length; k++) {
    const nome = MESES_PT[k].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (new RegExp('(?:^|[^a-z])' + nome + '(?:$|[^a-z])').test(t) || new RegExp('(?:^|[^a-z])' + nome.slice(0, 3) + '(?:$|[^a-z])').test(t)) { i = k; break; }
  }
  if (i < 0) return null;
  const a = t.match(/\b(20\d{2})\b/);
  return { mes: i, ano: a ? parseInt(a[1], 10) : new Date().getFullYear() };
}
export function mesDoTextoCp200(txt) { const r = mesRefDoTexto(txt); return r ? r.ano + '-' + String(r.mes + 1).padStart(2, '0') : ''; }
function docJaUsaMeses(cal) { return ((cal && cal.items) || []).some(i => i && i.mes) || !!(cal && cal.aprovacaoMeses) || !!(cal && cal.mesLegado); }
export function mesDoItemCp200(cal, it) {
  if (it && it.mes) return it.mes;
  if (cal && cal.mesLegado) return cal.mesLegado;
  const mesDoDocumento = mesDoTextoCp200(cal && cal.month);
  if (mesDoDocumento) return mesDoDocumento;
  const ap = cal && cal.aprovacaoInterna;
  if (ap && ap.mes) return ap.mes;
  const chaves = Object.keys((cal && cal.aprovacaoMeses) || {}).filter(Boolean);
  if (chaves.length === 1) return chaves[0];
  return '';
}
function aprovacaoCompativel(cal, mes) {
  const porMes = ((cal && cal.aprovacaoMeses) || {})[mes];
  if (porMes && porMes.status) return porMes;
  const ap = cal && cal.aprovacaoInterna;
  if (!ap || !ap.status) return null;
  if (ap.mes) return ap.mes === mes ? ap : null;
  const temMapa = Object.keys((cal && cal.aprovacaoMeses) || {}).length > 0;
  const usaMeses = docJaUsaMeses(cal);
  const legado = (cal && cal.mesLegado) || (usaMeses ? '' : mesDoTextoCp200(cal && cal.month));
  const explicitos = [...new Set(((cal && cal.items) || []).filter(i => i && !i.excluido && i.mes).map(i => i.mes))];
  const unico = explicitos.length === 1 && explicitos[0] === mes;
  return !temMapa && (!mes || !usaMeses || (legado && mes === legado) || unico) ? ap : null;
}
function mesHistoricoAnteriorAoControle(cal, mes) {
  if (!COMPETENCIA.test(String(mes || ''))) return false;
  const controlados = Object.keys((cal && cal.aprovacaoMeses) || {}).filter(m => COMPETENCIA.test(m)).sort();
  if (!controlados.length || mes >= controlados[0]) return false;
  return ((cal && cal.items) || []).some(it => it && !it.excluido && mesDoItemCp200(cal, it) === mes);
}
// Mesmo instante da página (meia-noite de São Paulo do 30º dia depois do fim do mês).
function limiteArquivoAutomatico(mes) {
  if (!COMPETENCIA.test(String(mes || ''))) return null;
  const [ano, numeroMes] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numeroMes, 0 + 30, 3, 0, 0));
}
function estadoPublicadoEfetivo(mes, marca, agora) {
  const registro = marca || {}, status = String(registro.status || '');
  const reabertoAte = new Date(registro.reabertoAte || '');
  if (!Number.isNaN(reabertoAte.getTime()) && agora < reabertoAte) return 'liberado';
  if (['2026-08', '2026-09'].includes(String(mes || '')) && status === 'arquivado' && registro.substituidoPor && registro.arquivamentoManual !== true) return 'liberado';
  if (status === 'liberado' && String(mes || '') >= '2026-10') { const limite = limiteArquivoAutomatico(mes); if (limite && agora >= limite) return 'arquivado'; }
  return status;
}
export function estadoDoMesCp200(cal, mes, agora = new Date()) {
  const explicita = aprovacaoCompativel(cal, mes);
  if (explicita?.status) return estadoPublicadoEfetivo(mes, explicita, agora);
  if (mesHistoricoAnteriorAoControle(cal, mes)) return 'liberado';
  const legado = cal?.mesLegado || (docJaUsaMeses(cal) ? '' : mesDoTextoCp200(cal?.month));
  const temConteudo = ((cal?.items) || []).some(item => item && !item.excluido && mesDoItemCp200(cal, item) === mes);
  return ((!mes || (legado && legado === mes)) && temConteudo) ? 'liberado' : 'rascunho';
}
/** Mesmo hash determinístico do calendario.html (hashDeterministicoPedidoV113). */
export function hashCp200(texto) {
  let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
  for (let i = 0; i < texto.length; i++) { const c = texto.charCodeAt(i); h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0; h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0; }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(2);
}

/* ---------- A cópia do cliente ---------- */
/** O cliente vê o mês liberado, o mês já publicado que está em revisão (versão anterior) e o arquivado. */
export function mesVisivelClienteCp200(cal, mes, agora = new Date()) {
  // Mês vazio só acontece em calendário legado sem competência; a página mostra tudo dele quando está liberado.
  const estado = estadoDoMesCp200(cal, mes, agora);
  if (estado === 'liberado' || estado === 'arquivado') return true;
  if (GetAprovacaoI68.consultaEmRevisao(cal, mes, estado)) return true;
  return ['liberado', 'arquivado'].includes(String(cal?.aprovacaoMeses?.[mes]?.status || ''));
}
const CAMPOS_TOPO = ['client', 'cliente', 'month', 'mesLegado', 'updatedAt', 'excluido', 'deletedAt', 'ativo',
  'canonicalId', 'clienteSlug', 'slug', 'calendarClienteSlug', 'clienteId', 'clientId'];
const minimaMarca = m => ({ status: String(m?.status || ''), ...(m?.mes ? { mes: String(m.mes) } : {}) });

/**
 * Documento que o cliente lê. Mesma forma do calendário (a página continua projetando o retrato como antes), mas:
 * conteúdo de mês escondido vira marcador vazio na MESMA posição (o pedido de ajuste usa a posição),
 * marca de mês escondido fica só com o estado, comentário da revisão interna sai, campos internos saem.
 */
export function projecaoClienteCp200(cal, agora = new Date()) {
  const fonte = cal || {}, visivel = new Map(), ver = m => { if (!visivel.has(m)) visivel.set(m, mesVisivelClienteCp200(fonte, m, agora)); return visivel.get(m); };
  const out = { projecaoCp200: 1 };
  for (const k of CAMPOS_TOPO) if (fonte[k] !== undefined) out[k] = fonte[k];
  out.items = (Array.isArray(fonte.items) ? fonte.items : []).map(it => {
    if (!it || typeof it !== 'object') return it ?? null;
    return ver(mesDoItemCp200(fonte, it)) ? it : { excluido: true, ocultoCp200: true, ...(it.mes ? { mes: it.mes } : {}) };
  });
  out.comments = (Array.isArray(fonte.comments) ? fonte.comments : []).filter(c => c?.origem !== 'revisao_interna');
  if (fonte.aprovacaoMeses && typeof fonte.aprovacaoMeses === 'object') {
    out.aprovacaoMeses = Object.fromEntries(Object.entries(fonte.aprovacaoMeses).map(([m, marca]) => [m, ver(m) ? marca : minimaMarca(marca)]));
  }
  if (fonte.aprovacaoInterna && typeof fonte.aprovacaoInterna === 'object') {
    const ap = fonte.aprovacaoInterna, meses = new Set([...out.items.filter(i => i && !i.excluido).map(i => mesDoItemCp200(fonte, i)), ap.mes].filter(Boolean));
    out.aprovacaoInterna = [...meses].some(m => ver(m) && aprovacaoCompativel(fonte, m) === ap) ? ap : minimaMarca(ap);
  }
  if (fonte.blocosPorMes && typeof fonte.blocosPorMes === 'object') out.blocosPorMes = Object.fromEntries(Object.entries(fonte.blocosPorMes).filter(([m]) => ver(m)));
  if (fonte.pedidosAjusteClienteI71 && typeof fonte.pedidosAjusteClienteI71 === 'object') {
    out.pedidosAjusteClienteI71 = Object.fromEntries(Object.entries(fonte.pedidosAjusteClienteI71).filter(([, p]) => ver(String(p?.competencia || ''))));
  }
  if (fonte.pedidoAjusteCliente && ver(String(fonte.pedidoAjusteCliente.competencia || ''))) out.pedidoAjusteCliente = fonte.pedidoAjusteCliente;
  return out;
}
const refCliente = (db, slug) => db.doc(COLECAO_CLIENTE_CP200 + '/' + slug);
const estavel = v => Array.isArray(v) ? '[' + v.map(estavel).join(',') + ']'
  : v && typeof v === 'object' && v.constructor === Object ? '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + estavel(v[k])).join(',') + '}'
  : JSON.stringify(v ?? null);
const igual = (a, b) => estavel(a) === estavel(b);

/**
 * Gatilho do calendário: regrava a cópia a partir do calendário ATUAL (relido na transação), para que dois gatilhos
 * fora de ordem nunca deixem uma versão velha. Pula quando a escrita não mudou nada do que o cliente vê.
 */
export async function sincronizarCalendarioClienteCp200(db, slug, antes, depois, { agora = new Date() } = {}) {
  if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(String(slug || ''))) return { gravou: false, motivo: 'slug' };
  if (antes && depois && igual(projecaoClienteCp200(antes, agora), projecaoClienteCp200(depois, agora))) return { gravou: false, motivo: 'sem-mudanca-para-o-cliente' };
  return db.runTransaction(async tx => {
    const ref = refCliente(db, slug), [c, p] = await Promise.all([tx.get(db.doc('calendarios/' + slug)), tx.get(ref)]);
    if (!c.exists) { if (p.exists) tx.delete(ref); return { gravou: p.exists, apagou: true }; }
    const nova = projecaoClienteCp200(c.data(), agora);
    if (p.exists && igual(p.data(), nova)) return { gravou: false, motivo: 'igual' };
    tx.set(ref, nova);
    return { gravou: true };
  });
}

/* ---------- Conferências copiadas do calendario.html ---------- */
const versaoItem = (cal, item) => GetAprovacaoI68.versaoPublica(item, mesDoItemCp200(cal, item));
function conferirAprovacao(cal, esperado, agora) {
  const mudou = 'Este conteúdo mudou desde que você abriu. Atualize o calendário e confira a versão atual antes de aprovar.';
  exigir(esperado, 'cp200/mudou', mudou);
  const estado = estadoDoMesCp200(cal, esperado.mes, agora);
  exigir(estado === 'liberado' || GetAprovacaoI68.revisaoPublica(cal, esperado.mes, estado), 'cp200/estado', 'Este calendário ainda não está disponível para aprovação.');
  exigir(GetAprovacaoI68.liberacaoPublica(aprovacaoCompativel(cal, esperado.mes), esperado.mes) === esperado.liberacao, 'cp200/mudou', mudou);
  const candidatos = (cal.items || []).map((item, indice) => ({ item, indice })).filter(({ item }) => item && (
    esperado.id ? String(item.itemId || '').trim() === esperado.id
      : !String(item.itemId || '').trim() && mesDoItemCp200(cal, item) === esperado.mes && versaoItem(cal, item) === esperado.versao));
  exigir(candidatos.length === 1, 'cp200/identidade', 'Não foi possível confirmar a identidade deste conteúdo. Atualize o calendário e abra o conteúdo novamente.');
  const alvo = candidatos[0];
  exigir(!GetAprovacaoI68.pedidoDoItem(cal, esperado.mes, alvo.item), 'cp200/em-ajuste', 'Este conteúdo está em ajuste. Os demais continuam disponíveis.');
  exigir(!(alvo.item.excluido || alvo.item.posted || alvo.item.agendado), 'cp200/saiu', 'Este conteúdo saiu da aprovação. Atualize o calendário para conferir sua situação.');
  exigir(mesDoItemCp200(cal, alvo.item) === esperado.mes && versaoItem(cal, alvo.item) === esperado.versao, 'cp200/mudou', mudou);
  return alvo;
}
const nomeCliente = (slug, nome) => slug === 'zeiss' ? 'Zeiss' : String(nome || '');
function lerEsperado(e) {
  exigir(e && typeof e === 'object' && !Array.isArray(e), 'cp200/entrada', 'Conteúdo inválido. Abra o conteúdo novamente.');
  const r = { id: String(e.id ?? ''), mes: String(e.mes ?? ''), versao: String(e.versao ?? ''), aprovado: e.aprovado === true, liberacao: String(e.liberacao ?? '') };
  exigir(COMPETENCIA.test(r.mes) && r.id.length <= 160 && r.versao.length <= 200000 && r.liberacao.length <= 2000, 'cp200/entrada', 'Conteúdo inválido. Abra o conteúdo novamente.');
  return r;
}

/* ---------- As quatro ações do cliente ---------- */
async function abrir(db, tx, auth, agora) {
  const { slug, uid } = await conferirAcessoClienteTxCp193(db, tx, auth?.uid, agora);
  const calRef = db.doc('calendarios/' + slug), cs = await tx.get(calRef);
  exigir(cs.exists, 'cp200/calendario', 'Calendário não encontrado.');
  const cal = cs.data();
  exigir(cal.excluido !== true && !cal.deletedAt, 'cp200/calendario', 'Este calendário foi retirado.');
  return { slug, uid, calRef, cal };
}
function gravar(db, tx, slug, calRef, cal, patch, agora) {
  tx.update(calRef, patch);
  const novo = { ...cal, ...patch }, projecao = projecaoClienteCp200(novo, agora);
  tx.set(refCliente(db, slug), projecao);
  return projecao;
}

async function aprovar(db, auth, dados, agora) {
  const esperado = lerEsperado(dados.esperado), aprovarItem = dados.aprovar === true, portal = dados.origem === 'portal';
  exigir(typeof dados.aprovar === 'boolean' && (!portal || aprovarItem), 'cp200/entrada', 'Aprovação inválida.');
  return db.runTransaction(async tx => {
    const { slug, calRef, cal } = await abrir(db, tx, auth, agora);
    const alvo = conferirAprovacao(cal, esperado, agora);
    if (!!alvo.item.apr === aprovarItem) return { schema: 1, mudou: false, indice: alvo.indice, item: alvo.item, projecao: projecaoClienteCp200(cal, agora) };
    const items = (cal.items || []).map(it => it ? ({ ...it }) : it), em = agora.toISOString(), item = items[alvo.indice];
    if (portal) { item.revisaoPendenteI68 = false; item.apr = true; item.aprPor = 'cliente'; item.aprEm = em; item.aprovadoPeloClienteEm = em; }
    else { item.revisaoPendenteI68 = aprovarItem ? false : !!alvo.item.revisaoPendenteI68; item.apr = aprovarItem; item.aprPor = aprovarItem ? 'cliente' : ''; item.aprEm = aprovarItem ? em : ''; }
    const projecao = gravar(db, tx, slug, calRef, cal, { items, updatedAt: em }, agora);
    return { schema: 1, mudou: true, indice: alvo.indice, item, projecao };
  });
}

async function textos(db, auth, dados, agora) {
  const esperado = lerEsperado(dados.esperado), t = dados.textos || {};
  exigir(typeof t.desc === 'string' && typeof t.legenda === 'string', 'cp200/entrada', 'Texto inválido.');
  exigir(t.desc.length <= 20000 && t.legenda.length <= 20000, 'cp200/tamanho', 'Use até 20.000 caracteres em cada texto.');
  const novos = { desc: t.desc, legenda: t.legenda }, operationId = String(dados.operationId || '');
  exigir(/^cal_texto_i68_[a-f0-9]{32}$/.test(operationId), 'cp200/entrada', 'Identificador inválido.');
  return db.runTransaction(async tx => {
    const { slug, calRef, cal } = await abrir(db, tx, auth, agora);
    const anterior = (cal.comments || []).find(x => x?.operationId === operationId);
    if (anterior) {
      const itens = (cal.items || []).filter(x => x && !x.excluido && String(x.itemId || '') === String(anterior.itemId || esperado.id) && mesDoItemCp200(cal, x) === esperado.mes);
      exigir(itens.length === 1 && String(itens[0].desc || '') === novos.desc && String(itens[0].legenda || '') === novos.legenda, 'cp200/reuso', 'O texto já foi salvo e recebeu outra alteração. Atualize para conferir; seu rascunho está preservado.');
      return { schema: 1, mudou: false, itemId: String(itens[0].itemId || ''), projecao: projecaoClienteCp200(cal, agora) };
    }
    const alvo = conferirAprovacao(cal, esperado, agora);
    const antigo = { desc: String(alvo.item.desc || ''), legenda: String(alvo.item.legenda || '') };
    if (antigo.desc === novos.desc && antigo.legenda === novos.legenda) return { schema: 1, mudou: false, itemId: String(alvo.item.itemId || ''), projecao: projecaoClienteCp200(cal, agora) };
    const em = agora.toISOString(), alterado = { ...alvo.item, ...novos };
    if (!String(alterado.itemId || '').trim()) {
      alterado.origemLegadaI68 = GetAprovacaoI68.assinatura({ ...alvo.item, mes: esperado.mes });
      alterado.itemId = 'calitem_i68_' + hashCp200(JSON.stringify([slug, esperado.mes, esperado.versao]));
    }
    if (novos.desc.trim()) alterado.roteiroDispensado = false;
    if (novos.legenda !== antigo.legenda) { alterado.legendaAtualizadaPor = 'Cliente'; alterado.legendaAtualizadaEm = em; }
    alterado.textosPublicadosClienteI68 = { ...novos, roteiroDispensado: !!alterado.roteiroDispensado, em };
    const item = GetAprovacaoI68.revisar(alvo.item, alterado, { por: 'Cliente', em });
    const items = cal.items.slice(); items[alvo.indice] = item;
    const comentario = { operationId, itemId: item.itemId, competencia: esperado.mes, mes: esperado.mes, who: 'Cliente', por: 'Cliente', porCliente: true, date: em,
      text: 'Texto atualizado pelo cliente — ' + String(item.name || 'Conteúdo'), antes: antigo, depois: novos, tipo: 'texto_cliente_i68' };
    const projecao = gravar(db, tx, slug, calRef, cal, { items, comments: [...(cal.comments || []), comentario], updatedAt: em }, agora);
    return { schema: 1, mudou: true, itemId: String(item.itemId || ''), projecao };
  });
}

async function observacao(db, auth, dados, agora) {
  const mes = String(dados.mes || ''), itemId = String(dados.itemId || ''), revisao = String(dados.revisao || ''), texto = String(dados.texto || '');
  exigir(COMPETENCIA.test(mes) && itemId && itemId.length <= 160 && revisao && revisao.length <= 2000 && texto.trim() && texto.length <= 3000, 'cp200/entrada', 'Confira o conteúdo e escreva uma observação de até 3.000 caracteres.');
  return db.runTransaction(async tx => {
    const { slug: cliente, uid, calRef, cal } = await abrir(db, tx, auth, agora);
    const operationId = 'cal_obs_i35_' + hashCp200(JSON.stringify([uid, cliente, mes, itemId, revisao, texto]));
    const comments = cal.comments || [];
    exigir(Array.isArray(comments), 'cp200/comentarios', 'Os comentários precisam ser conferidos pela equipe.');
    const existente = comments.find(c => c?.id === operationId);
    if (existente) {
      exigir(existente.autorUid === uid && existente.text === texto && existente.itemId === itemId && existente.mes === mes, 'cp200/reuso', 'O recibo mudou. Confira os comentários antes de reenviar.');
      return { schema: 1, registro: existente, jaConfirmado: true };
    }
    const marca = cal.aprovacaoMeses?.[mes];
    exigir(ESTADOS_REVISAO.includes(estadoDoMesCp200(cal, mes, agora)) && GetAprovacaoI68.liberacaoPublica(marca, mes) === revisao, 'cp200/estado', 'A revisão deste mês mudou. Seu texto continua nesta tela; reabra o conteúdo para conferir o estado atual.');
    const retrato = marca?.retratoLiberadoV115, lista = Array.isArray(retrato?.items) ? retrato.items : [];
    const alvos = lista.filter(i => i && i.itemId === itemId && !i.excluido && mesDoItemCp200(cal, { ...i, mes: i.mes || mes }) === mes);
    exigir(alvos.length === 1 && !(alvos[0].posted || alvos[0].agendado), 'cp200/item', 'O conteúdo não está disponível para observação nesta versão. Confira com a equipe.');
    const item = alvos[0], agoraIso = agora.toISOString(), nome = nomeCliente(cliente, cal.client || cliente);
    const registro = { id: operationId, text: texto, date: agoraIso, porCliente: true, por: 'Cliente', origem: 'observacao_conteudo_i35', mes, itemId, itemNome: String(item.name || ''), autorUid: uid, revisao };
    gravar(db, tx, cliente, calRef, cal, { comments: [registro, ...comments], updatedAt: agoraIso }, agora);
    const paraQuem = 'Chris';
    { const agora = agoraIso;
    // Mesmo aviso que o calendario.html criava (contrato lido pela recepção CP175 e pelo teste client-intake).
    tx.set(db.doc('avisos_do_cliente/' + operationId + '_chris'), {cliente,clienteNome:nome,titulo:'💬 '+nome+' comentou: '+String(item.name||'conteúdo').slice(0,70),descricao:'Observação adicional durante ajuste — '+texto+'\n\nConteúdo: '+String(item.name||'')+'\nMês: '+mes+'\nA aprovação continua pausada até a equipe publicar a revisão.',texto,paraQuem,lido:false,viraDemanda:true,tipo:'observacao_calendario',operationId,competencia:mes,itemId,criadoEm:agora});
    }
    return { schema: 1, registro, jaConfirmado: false };
  });
}

async function recado(db, auth, dados, agora) {
  const r = dados.registro || {}, txt = String(r.text || '');
  exigir(typeof r.id === 'string' && /^comentario_\d{10,16}_[a-z0-9]{1,12}$/.test(r.id) && txt.trim() && txt.length <= 5000 && typeof r.date === 'string' && r.date.length <= 40 && typeof r.mes === 'string' && r.mes.length <= 20, 'cp200/entrada', 'O comentário de origem precisa ser conferido antes de avisar a equipe.');
  const registro = { id: r.id, text: txt, date: r.date, porCliente: true, por: 'Cliente', origem: 'calendario', mes: r.mes };
  return db.runTransaction(async tx => {
    const { slug: cliente, calRef, cal } = await abrir(db, tx, auth, agora);
    const avisoId = 'cal_recado_cp151_' + registro.id, avisoRef = db.doc('avisos_do_cliente/' + avisoId), comments = cal.comments;
    exigir(Array.isArray(comments ?? []), 'cp200/comentarios', 'Os comentários de origem precisam ser conferidos.');
    const lista = comments || [], alvos = lista.map((c, i) => ({ c, i })).filter(({ c }) => c?.id === registro.id);
    exigir(alvos.length <= 1, 'cp200/comentarios', 'O comentário de origem não é único neste calendário.');
    const atual = alvos.length ? alvos[0].c : registro, indice = alvos.length ? alvos[0].i : -1;
    exigir(atual.porCliente === true && atual.text === txt && atual.date === registro.date && atual.mes === registro.mes, 'cp200/comentarios', 'O comentário de origem mudou. Nenhum aviso foi enviado.');
    const marca = { schema: 1, avisoId, paraQuem: 'Chris', texto: txt };
    if (Object.hasOwn(atual, 'encaminhamentoCp151')) {
      const m = atual.encaminhamentoCp151;
      exigir(m && typeof m === 'object' && !Array.isArray(m) && Object.keys(m).sort().join('|') === 'avisoId|paraQuem|schema|texto' && m.schema === 1 && m.avisoId === avisoId && m.paraQuem === 'Chris' && m.texto === txt, 'cp200/reuso', 'O recibo do comentário precisa ser conferido.');
      return { schema: 1, registro: atual, comments: projecaoClienteCp200(cal, agora).comments, jaConfirmado: true };
    }
    const nome = nomeCliente(cliente, cal.client || cliente);
    const atualizado = { ...atual, encaminhamentoCp151: marca }, novos = lista.slice(); if (indice < 0) novos.unshift(atualizado); else novos[indice] = atualizado;
    // Mesmo aviso que o calendario.html criava (contrato lido pela recepção CP175 e pelo teste client-intake).
    tx.set(avisoRef,{
        cliente,clienteNome:nome,titulo:'💬 '+nome+' comentou no calendário',
        descricao:'"'+txt+'"\n\nEstá no calendário dele, na aba de comentários. Confira o pedido na Central de ajustes.',
        texto:txt,paraQuem:'Chris',tipo:'comentario_calendario',operationId:registro.id,comentarioId:registro.id,
        competencia:registro.mes,lido:false,viraDemanda:true,criadoEm:registro.date
      });
    const projecao = gravar(db, tx, cliente, calRef, cal, { comments: novos, ...(indice < 0 ? { updatedAt: agora.toISOString() } : {}) }, agora);
    return { schema: 1, registro: atualizado, comments: projecao.comments, jaConfirmado: false };
  });
}

export async function operarCalendarioClienteCp200(db, auth, dados, { agora = new Date() } = {}) {
  exigir(dados && typeof dados === 'object' && ACOES_CALENDARIO_CLIENTE_CP200.includes(dados.acao), 'cp200/entrada', 'Ação do calendário inválida.');
  if (dados.acao === 'cliente_aprovar_cp200') return aprovar(db, auth, dados, agora);
  if (dados.acao === 'cliente_textos_cp200') return textos(db, auth, dados, agora);
  if (dados.acao === 'cliente_observacao_cp200') return observacao(db, auth, dados, agora);
  return recado(db, auth, dados, agora);
}
