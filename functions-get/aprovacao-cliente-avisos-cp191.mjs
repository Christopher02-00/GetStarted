// CP191 (10/11/2026) — avisos da aprovação do cliente saem do servidor, um por mudança, sem perder nem repetir.
// Antes: o calendario.html criava os avisos com addDoc (id aleatório) DEPOIS da transação e engolia o erro — rede caindo
// perdia o aviso, aprovar/remover/aprovar gerava 4, remover não avisava ninguém, e o aviso "mês inteiro aprovado → a
// Cecília marca as gravações" (decisão do Chris de 29/07) só existia numa função do Portal que nada chamava.
// Agora o gatilho do calendário compara antes × depois e grava em avisos_do_cliente com id determinístico.
import {hashI165} from './contexto.mjs';
import {mesDoItemCalendario} from './lib/guardas-agendamento-cp101-i165.mjs';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const nomeMes = m => /^20\d{2}-(0[1-9]|1[0-2])$/.test(m || '') ? MESES[Number(m.slice(5, 7)) - 1] + ' ' + m.slice(0, 4) : 'o mês';
const chave = (cal, it) => (it?.itemId || it?.id) ? `${it.itemId || it.id}__${mesDoItemCalendario(cal, it) || ''}` : '';
const vivos = cal => (Array.isArray(cal?.items) ? cal.items : []).filter(it => it && it.excluido !== true);
const pendente = it => !it.apr && !it.posted && !it.postado;

function mapa(cal) { const m = new Map(); for (const it of vivos(cal)) { const k = chave(cal, it); if (k) m.set(k, m.has(k) ? null : it); } return m; }

/** Mudanças de aprovação do cliente nesta gravação: {tipo:'aprovou'|'removeu', item, mes}. */
export function mudancasAprovacaoCp191(antes, depois) {
  if (!antes || !depois || depois.excluido === true || depois.arquivado || depois.deletedAt) return [];
  const a = mapa(antes), out = [];
  for (const [k, it] of mapa(depois)) {
    const velho = a.get(k); if (!it || !velho) continue;
    const mes = mesDoItemCalendario(depois, it);
    if (!velho.apr && it.apr === true && it.aprPor === 'cliente') out.push({ tipo: 'aprovou', item: it, mes });
    else if (velho.apr === true && velho.aprPor === 'cliente' && !it.apr) out.push({ tipo: 'removeu', item: it, mes, aprEmAntes: velho.aprEm || '' });
  }
  return out;
}

export async function avisarAprovacaoClienteCp191(db, slug, antes, depois, { agora = new Date() } = {}) {
  const criados = [];
  const mudancas = mudancasAprovacaoCp191(antes, depois);
  if (!mudancas.length) return { criados };
  const nome = String(depois.client || slug);
  const gravar = async (id, dados) => {
    const ref = db.doc('avisos_do_cliente/' + id);
    const ok = await db.runTransaction(async tx => { const s = await tx.get(ref); if (s.exists) return false; tx.set(ref, dados); return true; });
    if (ok) criados.push(id);
  };
  const base = it => ({ cliente: slug, clienteNome: nome, ...(it?.empresaOtavio ? { empresaOtavio: it.empresaOtavio } : {}), lido: false, criadoEm: agora.toISOString(), origemCp191: { schema: 1, itemId: it?.itemId || it?.id || '' } });
  const mesesTocados = new Set();
  for (const m of mudancas) {
    const it = m.item, doMes = vivos(depois).filter(x => mesDoItemCalendario(depois, x) === m.mes);
    const quantos = doMes.filter(x => x.apr).length, total = doMes.length;
    for (const quem of ['Chris', 'Amanda']) {
      if (m.tipo === 'aprovou') await gravar('cal_apr_cp191_' + hashI165([slug, chave(depois, it), it.aprEm || '', quem]).slice(0, 40), { ...base(it),
        titulo: '✅ ' + nome + ' aprovou: ' + String(it.name || 'conteúdo').slice(0, 50),
        descricao: 'Dia ' + (it.day || '?') + ' — ' + (it.name || '') + '\n\nAprovados até agora: ' + quantos + ' de ' + total + '.' + (String(it.obsCliente || '').trim() ? '\n\nObservação que ele deixou:\n"' + it.obsCliente + '"' : ''),
        paraQuem: quem, viraDemanda: false });
      else await gravar('cal_apr_removida_cp191_' + hashI165([slug, chave(depois, it), m.aprEmAntes, quem]).slice(0, 40), { ...base(it),
        titulo: '↩️ ' + nome + ' removeu a aprovação: ' + String(it.name || 'conteúdo').slice(0, 50),
        descricao: 'Dia ' + (it.day || '?') + ' — ' + (it.name || '') + '\n\nO cliente tirou a aprovação deste conteúdo. Não grave nem agende antes de falar com ele.\n\nAprovados agora: ' + quantos + ' de ' + total + '.',
        paraQuem: quem, viraDemanda: false });
    }
    if (m.tipo === 'aprovou') mesesTocados.add(m.mes);
  }
  // mês inteiro aprovado nesta gravação → Cecília marca as gravações (decisão do Chris de 29/07)
  for (const mes of mesesTocados) {
    const doMes = d => vivos(d).filter(x => mesDoItemCalendario(d, x) === mes);
    const agoraCompleto = doMes(depois).length > 0 && !doMes(depois).some(pendente), antesCompleto = doMes(antes).length > 0 && !doMes(antes).some(pendente);
    if (!agoraCompleto || antesCompleto) continue;
    const assinatura = doMes(depois).map(x => chave(depois, x) + '@' + (x.aprEm || '')).sort();
    for (const quem of ['Cecília', 'Amanda', 'Chris']) await gravar('cal_mes_aprovado_cp191_' + hashI165([slug, mes, assinatura, quem]).slice(0, 40), { ...base(null),
      titulo: '🎬 ' + nome + ' aprovou o calendário de ' + nomeMes(mes) + ' inteiro',
      descricao: 'Os ' + doMes(depois).length + ' conteúdos estão aprovados.' + (quem === 'Cecília' ? ' Já dá pra marcar as gravações desse mês.' : ' Nada pendente com o cliente nesse mês.'),
      paraQuem: quem, viraDemanda: quem === 'Cecília' });
  }
  return { criados };
}
