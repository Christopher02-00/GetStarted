/* "Postagem Até Quando" — UMA conta para a pergunta "até quando o cliente tem conteúdo" (16/11/2026).
   Antes existiam três contas (tela do controle, tela antiga e resumo do painel) com respostas diferentes.
   Regra (CATALOGO §52.2): a cobertura vem dos registros ativos de `postagens` (qualquer formato) com data
   programada; o calendário mostra o que está planejado e ainda não foi agendado; a anotação manual é nota.
   Funções puras: sem banco, sem DOM global. A identidade do cliente vem injetada (helpers do escritório). */

export const STATUS_COBERTURA_ATE_QUANDO = Object.freeze(['agendado', 'postado']);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function diasEntreISOAteQuando(inicio, fim) {
  if (!ISO.test(String(inicio || '')) || !ISO.test(String(fim || ''))) return null;
  const [ai, mi, di] = inicio.split('-').map(Number), [af, mf, df] = fim.split('-').map(Number);
  return Math.floor((Date.UTC(af, mf - 1, df) - Date.UTC(ai, mi - 1, di)) / 86400000);
}
function somarDiasISO(iso, n) {
  const [a, m, d] = iso.split('-').map(Number), t = new Date(Date.UTC(a, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export function mesSeguinteAteQuando(mes) {
  const [a, m] = String(mes).split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
}
const diasNoMes = mes => { const [a, m] = mes.split('-').map(Number); return new Date(Date.UTC(a, m, 0)).getUTCDate(); };

function carteira(clientes, ident) {
  const ativos = new Map(), porNome = new Map();
  (Array.isArray(clientes) ? clientes : []).forEach(c => {
    const slug = ident.slug(c?.slug || '');
    if (!slug || ativos.has(slug)) return;
    const nome = ident.nome(slug, c?.nome || slug);
    ativos.set(slug, { slug, nome });
    porNome.set(ident.norm(nome), slug);
  });
  const slugDaPostagem = p => {
    const bruto = p.cliente || p.clienteSlug || '';
    let slug = ident.slug(bruto);
    if (!ativos.has(slug)) slug = porNome.get(ident.norm(p.clienteNome || bruto)) || '';
    return ativos.has(slug) ? slug : '';
  };
  return { ativos, slugDaPostagem };
}
const postagemConta = p => !!p && p.excluido !== true && STATUS_COBERTURA_ATE_QUANDO.includes(String(p.status || '')) && ISO.test(String(p.dataAgendada || '').slice(0, 10));

/* A regra de cobertura do alerta da Amanda (§52.2–52.4), movida do escritório sem mudar o resultado. */
export function coberturaPostagensAteQuando(postagens, clientes, hoje, ident) {
  const { ativos, slugDaPostagem } = carteira(clientes, ident);
  const porSlug = new Map();
  (Array.isArray(postagens) ? postagens : []).forEach(p => {
    if (!postagemConta(p)) return;
    const data = String(p.dataAgendada).slice(0, 10), slug = slugDaPostagem(p);
    if (!slug) return;
    const anterior = porSlug.get(slug);
    if (!anterior || data > anterior.ultimaData) porSlug.set(slug, { ...ativos.get(slug), ultimaData: data, qtdNaUltimaData: 1 });
    else if (data === anterior.ultimaData) anterior.qtdNaUltimaData++;
  });
  return [...ativos.values()].map(cliente => {
    const registro = porSlug.get(cliente.slug) || cliente;
    const ultimaData = registro.ultimaData || '';
    const diferenca = ultimaData ? diasEntreISOAteQuando(ultimaData, hoje) : null;
    const temCoberturaFutura = !!ultimaData && ultimaData > hoje;
    const diasSemPostagem = diferenca === null ? null : Math.max(0, diferenca);
    const evento = !!ultimaData && !temCoberturaFutura && diferenca >= 0 && diferenca < 3 ? 'ultima_postagem' :
      (!!ultimaData && !temCoberturaFutura && diferenca >= 3 ? 'tres_dias_sem_postagem' : '');
    return { ...cliente, ultimaData, qtdNaUltimaData: registro.qtdNaUltimaData || 0, temCoberturaFutura, diasSemPostagem, evento };
  });
}

function dataDoItem(item, mes) {
  const direta = String(item?.dataPostagem || '').slice(0, 10);
  if (ISO.test(direta)) return direta;
  const dia = Number(item?.day);
  if (MES.test(String(mes || '')) && Number.isInteger(dia) && dia >= 1 && dia <= diasNoMes(mes)) return `${mes}-${String(dia).padStart(2, '0')}`;
  return '';
}

/* Projeção por cliente. `calendarios`/`manual` = null quando a leitura falhou: a linha diz "indisponível", nunca "nada". */
export function projetarAteQuando({ clientes, postagens, calendarios = null, manual = null, hoje, ident, mesDoItem = (_c, i) => i?.mes || '' }) {
  const cobertura = coberturaPostagensAteQuando(postagens, clientes, hoje, ident);
  const { slugDaPostagem } = carteira(clientes, ident);
  const mesAtual = hoje.slice(0, 7), proximoMes = mesSeguinteAteQuando(mesAtual), inicio30 = somarDiasISO(hoje, -29);
  const porCliente = new Map(cobertura.map(c => [c.slug, { agendados: [], real30: 0, postagensPorId: new Map(), postagensPorItem: new Map() }]));
  (Array.isArray(postagens) ? postagens : []).forEach(p => {
    if (!p || p.excluido === true) return;
    const slug = slugDaPostagem(p), alvo = slug && porCliente.get(slug);
    if (!alvo) return;
    if (p.id) alvo.postagensPorId.set(String(p.id), p);
    if (p.calendarItemId) alvo.postagensPorItem.set(String(p.calendarItemId), p);
    if (!postagemConta(p)) return;
    const data = String(p.dataAgendada).slice(0, 10);
    if (data >= hoje) alvo.agendados.push({ id: String(p.id || ''), data, hora: String(p.horaAgendada || ''), titulo: String(p.titulo || p.tituloConteudo || 'Conteúdo sem título'), formato: String(p.formato || p.fmt || ''), status: String(p.status) });
    if (data >= inicio30 && data <= hoje) alvo.real30++;
  });
  const calPorSlug = new Map();
  if (Array.isArray(calendarios)) calendarios.forEach(c => { const slug = ident.slug(c?.id || ''); if (slug && porCliente.has(slug) && !calPorSlug.has(slug)) calPorSlug.set(slug, c.data || {}); });
  const mapaManual = manual && typeof manual === 'object' ? manual : null;

  return cobertura.map(c => {
    const extra = porCliente.get(c.slug);
    const agendados = extra.agendados.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    const ate = c.ultimaData && c.ultimaData >= hoje ? c.ultimaData : '';
    const dias = ate ? diasEntreISOAteQuando(hoje, ate) : null;
    const faixa = !ate ? 'semNada' : dias <= 3 ? 'acaba3' : dias <= 7 ? 'semana' : 'folga';
    let naoAgendados = null, frequencia = { real30: extra.real30, mes: mesAtual, proximoMes, planejadoMes: null, planejadoProximo: null, porSemana: null, semCalendario: false, calendarioIndisponivel: calendarios === null };
    let flexivel = false;
    if (Array.isArray(calendarios)) {
      const cal = calPorSlug.get(c.slug);
      naoAgendados = [];
      if (!cal) frequencia.semCalendario = true;
      else {
        let noMes = 0, noProximo = 0;
        (Array.isArray(cal.items) ? cal.items : []).forEach(item => {
          if (!item || item.excluido === true) return;
          if (item.dataFlexivel) flexivel = true;
          const data0 = dataDoItem(item, mesDoItem(cal, item) || '');
          const mes = mesDoItem(cal, item) || data0.slice(0, 7);
          if (mes !== mesAtual && mes !== proximoMes) return;
          if (mes === mesAtual) noMes++; else noProximo++;
          const ligada = (item.postagemId && extra.postagensPorId.get(String(item.postagemId))) || (item.itemId && extra.postagensPorItem.get(String(item.itemId))) || null;
          const agendadoDeFato = item.agendado === true || item.posted === true || (ligada && STATUS_COBERTURA_ATE_QUANDO.includes(String(ligada.status || '')));
          if (agendadoDeFato) return;
          const data = dataDoItem(item, mes);
          naoAgendados.push({ itemId: String(item.itemId || ''), data, mes, passou: !!data && data < hoje, titulo: String(item.name || item.titulo || 'Conteúdo sem título'), formato: String(item.fmt || ''), situacaoPostagem: ligada ? String(ligada.status || '') : '' });
        });
        naoAgendados.sort((a, b) => (a.data || a.mes + '-99').localeCompare(b.data || b.mes + '-99'));
        frequencia = { ...frequencia, planejadoMes: noMes, planejadoProximo: noProximo, porSemana: Math.round(noMes / (diasNoMes(mesAtual) / 7) * 10) / 10 };
      }
    }
    const m = mapaManual ? (mapaManual[c.slug] || {}) : null;
    const anotacao = m ? { postagemAte: String(m.postagemAte || ''), videos: m.videosParaAgendar ?? '', obs: String(m.observacoes || ''), atualizadoPor: m.atualizadoPor || '', atualizadoEm: m.atualizadoEm || '' } : null;
    return { ...c, ate, dias, faixa, agendados, naoAgendados, frequencia, flexivel, anotacao,
      divergente: !!(anotacao && anotacao.postagemAte && anotacao.postagemAte !== (ate || c.ultimaData)) };
  });
}

export const ORDEM_FAIXAS_ATE_QUANDO = Object.freeze({ semNada: 0, acaba3: 1, semana: 2, folga: 3 });
export function ordenarAteQuando(linhas) {
  return [...linhas].sort((a, b) => ORDEM_FAIXAS_ATE_QUANDO[a.faixa] - ORDEM_FAIXAS_ATE_QUANDO[b.faixa] || (a.dias ?? -1) - (b.dias ?? -1) || a.nome.localeCompare(b.nome, 'pt-BR'));
}
export function contarFaixasAteQuando(linhas) {
  const r = { acaba3: 0, semana: 0, folga: 0, semNada: 0 };
  (linhas || []).forEach(l => { r[l.faixa]++; });
  return r;
}

// ---- apresentação (strings HTML; o escritório decide onde colocar)
const escH = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const dataBR = iso => ISO.test(String(iso || '')) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const rotuloMes = mes => { const n = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; const [a, m] = String(mes).split('-'); return (n[Number(m) - 1] || mes) + '/' + a; };
export const COR_FAIXA_ATE_QUANDO = Object.freeze({ semNada: 'var(--red)', acaba3: 'var(--red)', semana: 'var(--yellow2)', folga: 'var(--green)' });

export function textoPrazoAteQuando(l) {
  if (!l.ate) return l.ultimaData ? `sem nada programado · último em ${dataBR(l.ultimaData)}` : 'sem nada programado';
  const pre = l.flexivel ? '~' : '';
  return `tem conteúdo até ${pre}${dataBR(l.ate)} · ` + (l.dias === 0 ? 'acaba hoje' : `faltam ${l.dias} dia(s)`);
}
export function textoFrequenciaAteQuando(f) {
  const real = `real: ${f.real30} nos últimos 30 dias`;
  if (f.calendarioIndisponivel) return `planejado: calendário indisponível agora · ${real}`;
  if (f.semCalendario) return `planejado: sem calendário · ${real}`;
  const semana = String(f.porSemana).replace('.', ',');
  return `planejado: ${f.planejadoMes}/mês · ~${semana}/semana (${rotuloMes(f.mes)}; ${rotuloMes(f.proximoMes)}: ${f.planejadoProximo}) · ${real}`;
}
export function htmlResumoAteQuando(contas) {
  const card = (k, cls, lbl) => `<div class="resumoCard ${contas[k] ? cls : (k === 'folga' ? 'green' : '')}" data-ate-quando-resumo="${k}"><div class="num">${contas[k]}</div><div class="lbl">${lbl}</div></div>`;
  return `<div class="painelResumo" style="margin-bottom:16px;">${card('acaba3', 'red', '🔴 acaba em até 3 dias')}${card('semana', 'yellow', '🟡 acaba nesta semana')}${card('folga', 'green', '🟢 com folga')}${card('semNada', 'red', '⚪ sem nada programado')}</div>`;
}
const SITUACAO = { aguardando_agendamento: 'pronto, falta agendar', aguardando_legenda: 'falta legenda', aguardando_aprovacao: 'em aprovação' };
export function htmlDetalheAteQuando(l, { aberto = false } = {}) {
  const ag = l.agendados.length
    ? l.agendados.map(a => `<li data-ate-quando-agendado="${escH(a.id)}" data-data="${a.data}">${dataBR(a.data)}${a.hora ? ' ' + escH(a.hora) : ''} — ${escH(a.titulo)}${a.formato ? ' · ' + escH(a.formato) : ''}${a.status === 'postado' ? ' · ✅ publicado' : ''}</li>`).join('')
    : '<li class="vazio">Nenhuma postagem agendada daqui para frente.</li>';
  const na = l.naoAgendados === null
    ? '<li class="vazio" data-ate-quando-indisponivel>Calendários indisponíveis agora — não dá para listar o que falta agendar. Tente de novo em instantes.</li>'
    : l.naoAgendados.length
      ? l.naoAgendados.map(i => `<li data-ate-quando-nao-agendado="${escH(i.itemId)}" data-data="${i.data}">${i.data ? dataBR(i.data) : 'sem dia · ' + rotuloMes(i.mes)} — ${escH(i.titulo)}${i.formato ? ' · ' + escH(i.formato) : ''}${i.situacaoPostagem ? ' · ' + escH(SITUACAO[i.situacaoPostagem] || i.situacaoPostagem) : ''}${i.passou ? ' · <b style="color:var(--red);">data já passou</b>' : ''}</li>`).join('')
      : `<li class="vazio">${l.frequencia.semCalendario ? 'Cliente sem calendário cadastrado.' : 'Tudo do calendário deste mês e do próximo já está agendado.'}</li>`;
  return `<details class="ateQuandoDetalhe" data-ate-quando-detalhe ${aberto ? 'open' : ''} style="margin-top:10px;">
    <summary style="cursor:pointer;font-weight:700;">Ver agendados (${l.agendados.length}) e não agendados (${l.naoAgendados === null ? '?' : l.naoAgendados.length})</summary>
    <div class="meta" data-ate-quando-frequencia style="margin:8px 0;">📊 ${escH(textoFrequenciaAteQuando(l.frequencia))}</div>
    <div class="meta" style="font-weight:700;margin-top:6px;">📅 Agendado daqui para frente</div>
    <ul data-ate-quando-agendados style="margin:4px 0 8px 18px;padding:0;">${ag}</ul>
    <div class="meta" style="font-weight:700;">📝 No calendário e ainda não agendado (${rotuloMes(l.frequencia.mes)} e ${rotuloMes(l.frequencia.proximoMes)})</div>
    <ul data-ate-quando-nao-agendados style="margin:4px 0 0 18px;padding:0;">${na}</ul>
  </details>`;
}
export function htmlErroAteQuando(mensagem) {
  return `<div class="card" data-ate-quando-erro style="border:2px solid var(--red);"><h2>⚠️ Não consegui montar o "até quando" agora</h2><div class="desc">${escH(mensagem)}</div><div class="meta" style="margin-top:8px;">Nenhum número foi mostrado para não parecer que os clientes estão sem conteúdo. Recarregue a tela em instantes.</div></div>`;
}
