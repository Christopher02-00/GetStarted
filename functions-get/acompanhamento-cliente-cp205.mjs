// CP205 (11/11/2026, sugestão da Amanda): o "Acompanhamento" do Portal se atualiza sozinho com o andamento real.
// Antes: a linha do tempo do cliente (processos_cliente/{slug}.timeline) só mudava quando alguém da equipe registrava à mão —
// com muitos clientes ficava desatualizada. Agora o servidor observa vídeos, postagens, calendário, relatório mensal e
// gravações e escreve frases para o cliente em `timelineAuto` (campo separado: não disputa com o registro manual da equipe).
// Só entra texto pensado para o cliente: nunca motivo de ajuste, parecer, revisão interna ou nome de quem revisou.
import {FieldValue} from 'firebase-admin/firestore';
import {estadoDoMesCp200} from './calendario-cliente-cp200.mjs';

export const COLECAO_ACOMPANHAMENTO_CP205 = 'processos_cliente';
const LIMITE = 150; // últimas entradas automáticas por cliente (o documento não cresce sem fim)
const SLUG = /^[a-z0-9][a-z0-9._-]{0,119}$/;
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = m => /^20\d{2}-(0[1-9]|1[0-2])$/.test(String(m || '')) ? MESES[Number(m.slice(5)) - 1] + ' de ' + m.slice(0, 4) : 'do mês';
const ddmm = d => /^\d{4}-\d{2}-\d{2}/.test(String(d || '')) ? String(d).slice(8, 10) + '/' + String(d).slice(5, 7) : '';
const titulo = (x, padrao) => String(x?.titulo || x?.name || padrao).replace(/\s+/g, ' ').trim().slice(0, 120) || padrao;
const empresa = x => typeof x?.empresaOtavio === 'string' && x.empresaOtavio ? { empresaOtavio: x.empresaOtavio } : {};
const ativo = x => x && x.excluido !== true && !x.deletedAt && SLUG.test(String(x.cliente || ''));

/** Vídeo: em edição, em ajuste, pronto para aprovação do cliente, aprovado. (A revisão interna não aparece.) */
export function eventoVideoCp205(id, antes, depois) {
  if (!ativo(depois)) return null;
  const st = String(depois.status || '');
  if (st === String(antes?.status || '')) return null;
  const t = titulo(depois, 'seu vídeo');
  const mapa = {
    aguardando_edicao: ['Vídeos em edição', 'Vídeo em edição: ' + t],
    correcao: ['Vídeos em edição', 'Vídeo em ajuste: ' + t],
    aguardando_cliente: ['Conteúdo aguardando aprovação', 'Vídeo pronto para a sua aprovação: ' + t],
    aprovado: ['Conteúdo aprovado', 'Vídeo aprovado: ' + t]
  }[st];
  return mapa ? { cliente: depois.cliente, origem: 'video', origemId: id, estado: st, etapa: mapa[0], status: mapa[1], ...empresa(depois) } : null;
}

/** Postagem: agendada (com a data) e publicada. */
export function eventoPostagemCp205(id, antes, depois) {
  if (!ativo(depois)) return null;
  const st = String(depois.status || ''), t = titulo(depois, 'seu conteúdo');
  const data = ddmm(depois.dataAgendada || depois.dataPostagem);
  const chave = st === 'agendado' ? 'agendado' + (data ? '_' + data : '') : st;
  const chaveAntes = String(antes?.status || '') === 'agendado' ? 'agendado' + (ddmm(antes.dataAgendada || antes.dataPostagem) ? '_' + ddmm(antes.dataAgendada || antes.dataPostagem) : '') : String(antes?.status || '');
  if (chave === chaveAntes) return null;
  if (st === 'agendado') return { cliente: depois.cliente, origem: 'postagem', origemId: id, estado: chave, etapa: 'Conteúdo agendado', status: 'Conteúdo agendado: ' + t + (data ? ' (' + data + ')' : ''), ...empresa(depois) };
  if (st === 'postado') return { cliente: depois.cliente, origem: 'postagem', origemId: id, estado: 'postado', etapa: 'Conteúdo agendado', status: 'Conteúdo publicado: ' + t, ...empresa(depois) };
  return null;
}

/** Calendário: cada mês em preparação, pedido de ajuste recebido, disponível ao cliente. */
export function eventosCalendarioCp205(slug, antes, depois, agora = new Date()) {
  if (!depois || depois.excluido === true || depois.deletedAt || !SLUG.test(String(slug || ''))) return [];
  const out = [], meses = Object.keys(depois.aprovacaoMeses || {}).filter(m => /^20\d{2}-(0[1-9]|1[0-2])$/.test(m));
  const categoria = (cal, m) => {
    if (!cal?.aprovacaoMeses?.[m]) return '';
    const marca = cal.aprovacaoMeses[m], st = estadoDoMesCp200(cal, m, agora);
    if (st === 'liberado') return 'liberado';
    if (st === 'ajuste_interno' && marca.por === 'Cliente') return 'pedido';
    if (['rascunho', 'aguardando_interna', 'aprovado_interno', 'ajuste_interno'].includes(st)) return 'preparacao';
    return '';
  };
  for (const m of meses) {
    const c = categoria(depois, m);
    if (!c || c === categoria(antes, m)) continue;
    const texto = { preparacao: 'Calendário de ' + nomeMes(m) + ' em preparação pela equipe', pedido: 'Recebemos seu pedido de ajuste no calendário de ' + nomeMes(m), liberado: 'Calendário de ' + nomeMes(m) + ' disponível para você' }[c];
    const etapa = c === 'liberado' ? 'Calendário enviado para aprovação' : 'Calendário editorial em desenvolvimento';
    out.push({ cliente: slug, origem: 'calendario', origemId: m, estado: c, etapa, status: texto });
  }
  return out;
}

/** Relatório do mês: em elaboração e concluído. (Parecer e pedidos internos de ajuste não aparecem.) */
export function eventoAnaliseCp205(id, antes, depois) {
  if (!ativo(depois)) return null;
  const cat = x => ['rascunho', 'enviado', 'ajuste'].includes(String(x?.status || '')) ? 'elaboracao' : String(x?.status || '') === 'conferido' ? 'pronto' : '';
  const c = cat(depois);
  if (!c || c === cat(antes)) return null;
  const mes = nomeMes(String(depois.mes || String(id).split('__')[0]));
  return c === 'elaboracao'
    ? { cliente: depois.cliente, origem: 'analise', origemId: id, estado: c, etapa: 'Relatório do perfil em elaboração', status: 'Relatório de ' + mes + ' em elaboração' }
    : { cliente: depois.cliente, origem: 'analise', origemId: id, estado: c, etapa: 'Estratégia do perfil sendo atualizada', status: 'Relatório de ' + mes + ' concluído' };
}

/** Gravação: agendada (ou remarcada), realizada, cancelada. */
export function eventoAgendamentoCp205(id, antes, depois) {
  if (!ativo(depois) || depois.tipo !== 'gravacao') return null;
  const st = String(depois.status || ''), quando = ddmm(depois.data) + (depois.hora ? ' às ' + String(depois.hora).slice(0, 5) : '');
  const chave = st === 'agendado' ? 'agendado_' + String(depois.data || '') + '_' + String(depois.hora || '') : st;
  const chaveAntes = String(antes?.status || '') === 'agendado' ? 'agendado_' + String(antes.data || '') + '_' + String(antes.hora || '') : String(antes?.status || '');
  if (chave === chaveAntes) return null;
  const remarcada = String(antes?.status || '') === 'agendado' && st === 'agendado';
  const texto = st === 'agendado' ? (remarcada ? 'Gravação remarcada para ' : 'Gravação agendada para ') + quando
    : st === 'realizado' ? 'Gravação realizada (' + ddmm(depois.data) + ')'
    : st === 'cancelado' ? 'Gravação de ' + ddmm(depois.data) + ' cancelada' : '';
  return texto ? { cliente: depois.cliente, origem: 'gravacao', origemId: id, estado: chave, etapa: 'Conteúdos em produção', status: texto, ...empresa(depois) } : null;
}

/** Grava a entrada no acompanhamento do cliente, uma vez por mudança (o mesmo gatilho repetido não duplica). */
export async function registrarAcompanhamentoCp205(db, evento, { agora = new Date() } = {}) {
  if (!evento || !SLUG.test(String(evento.cliente || ''))) return { gravou: false };
  const ref = db.doc(COLECAO_ACOMPANHAMENTO_CP205 + '/' + evento.cliente);
  return db.runTransaction(async tx => {
    const s = await tx.get(ref), lista = Array.isArray(s.data()?.timelineAuto) ? s.data().timelineAuto : [];
    const ultima = [...lista].reverse().find(x => x?.origem === evento.origem && x?.origemId === evento.origemId);
    if (ultima && ultima.estado === evento.estado) return { gravou: false, motivo: 'repetido' };
    const data = agora.toISOString();
    const entrada = { status: evento.status, etapa: evento.etapa, data, responsavel: 'Equipe Get Started', auto: true, origem: evento.origem, origemId: String(evento.origemId), estado: evento.estado, ...(evento.empresaOtavio ? { empresaOtavio: evento.empresaOtavio } : {}) };
    const novas = [...lista, entrada].slice(-LIMITE);
    tx.set(ref, { cliente: evento.cliente, timelineAuto: novas, etapaAtualAuto: evento.etapa, etapaAtualAutoEm: data, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    return { gravou: true };
  });
}

/** Ponto único dos gatilhos: nunca derruba a operação de origem. */
export async function acompanharCp205(db, eventos, opcoes) {
  for (const ev of [].concat(eventos || []).filter(Boolean)) {
    try { await registrarAcompanhamentoCp205(db, ev, opcoes); } catch (e) { console.error('CP205: acompanhamento do cliente não atualizado', ev.cliente, ev.origem, e?.message); }
  }
}
