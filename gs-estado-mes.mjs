// Estado do mês do calendário — UMA regra para todos (F5 do Programa Estabilidade, 21/11/2026).
// Antes havia três cópias completas (escritorio.html estadoMesCal, calendario.html estadoDoMes, functions-get CP200) e ~15 leituras cruas
// de aprovacaoMeses[mes].status no servidor. Este é o código da CP200 (cópia fiel da I56 do calendario.html), sem nenhuma mudança de
// regra. A cópia da raiz (gs-estado-mes.mjs) e a do servidor (functions-get/lib/gs-estado-mes.mjs) são idênticas (verificar_duplicatas).
export const COMPETENCIA = /^20\d{2}-(0[1-9]|1[0-2])$/;
export const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export function mesRefDoTexto(valor) {
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
export function mesDoTexto(txt) { const r = mesRefDoTexto(txt); return r ? r.ano + '-' + String(r.mes + 1).padStart(2, '0') : ''; }
export function docJaUsaMeses(cal) { return ((cal && cal.items) || []).some(i => i && i.mes) || !!(cal && cal.aprovacaoMeses) || !!(cal && cal.mesLegado); }
export function mesDoItem(cal, it) {
  if (it && it.mes) return it.mes;
  if (cal && cal.mesLegado) return cal.mesLegado;
  const mesDoDocumento = mesDoTexto(cal && cal.month);
  if (mesDoDocumento) return mesDoDocumento;
  const ap = cal && cal.aprovacaoInterna;
  if (ap && ap.mes) return ap.mes;
  const chaves = Object.keys((cal && cal.aprovacaoMeses) || {}).filter(Boolean);
  if (chaves.length === 1) return chaves[0];
  return '';
}
export function aprovacaoCompativel(cal, mes) {
  const porMes = ((cal && cal.aprovacaoMeses) || {})[mes];
  if (porMes && porMes.status) return porMes;
  const ap = cal && cal.aprovacaoInterna;
  if (!ap || !ap.status) return null;
  if (ap.mes) return ap.mes === mes ? ap : null;
  const temMapa = Object.keys((cal && cal.aprovacaoMeses) || {}).length > 0;
  const usaMeses = docJaUsaMeses(cal);
  const legado = (cal && cal.mesLegado) || (usaMeses ? '' : mesDoTexto(cal && cal.month));
  const explicitos = [...new Set(((cal && cal.items) || []).filter(i => i && !i.excluido && i.mes).map(i => i.mes))];
  const unico = explicitos.length === 1 && explicitos[0] === mes;
  return !temMapa && (!mes || !usaMeses || (legado && mes === legado) || unico) ? ap : null;
}
export function mesHistoricoAnteriorAoControle(cal, mes) {
  if (!COMPETENCIA.test(String(mes || ''))) return false;
  const controlados = Object.keys((cal && cal.aprovacaoMeses) || {}).filter(m => COMPETENCIA.test(m)).sort();
  if (!controlados.length || mes >= controlados[0]) return false;
  return ((cal && cal.items) || []).some(it => it && !it.excluido && mesDoItem(cal, it) === mes);
}
// Mesmo instante da página (meia-noite de São Paulo do 30º dia depois do fim do mês).
export function limiteArquivoAutomatico(mes) {
  if (!COMPETENCIA.test(String(mes || ''))) return null;
  const [ano, numeroMes] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numeroMes, 0 + 30, 3, 0, 0));
}
export function estadoPublicadoEfetivo(mes, marca, agora) {
  const registro = marca || {}, status = String(registro.status || '');
  const reabertoAte = new Date(registro.reabertoAte || '');
  if (!Number.isNaN(reabertoAte.getTime()) && agora < reabertoAte) return 'liberado';
  if (['2026-08', '2026-09'].includes(String(mes || '')) && status === 'arquivado' && registro.substituidoPor && registro.arquivamentoManual !== true) return 'liberado';
  if (status === 'liberado' && String(mes || '') >= '2026-10') { const limite = limiteArquivoAutomatico(mes); if (limite && agora >= limite) return 'arquivado'; }
  return status;
}
export function estadoDoMes(cal, mes, agora = new Date()) {
  const explicita = aprovacaoCompativel(cal, mes);
  if (explicita?.status) return estadoPublicadoEfetivo(mes, explicita, agora);
  if (mesHistoricoAnteriorAoControle(cal, mes)) return 'liberado';
  const legado = cal?.mesLegado || (docJaUsaMeses(cal) ? '' : mesDoTexto(cal?.month));
  const temConteudo = ((cal?.items) || []).some(item => item && !item.excluido && mesDoItem(cal, item) === mes);
  return ((!mes || (legado && legado === mes)) && temConteudo) ? 'liberado' : 'rascunho';
}
