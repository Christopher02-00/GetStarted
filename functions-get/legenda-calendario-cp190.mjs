// CP190 (10/11/2026) — a legenda corrigida no calendário chega à postagem.
// A postagem copia a legenda do calendário uma única vez (aprovação do cliente). Depois disso, quem corrige o item
// (Chris no editor, Amanda, o próprio cliente pelo link) só mudava o calendário: o Portal mostrava o texto novo e a
// Cecília publicava o antigo. Decisão do Chris (10/11): postagem ainda não agendada recebe o texto novo sozinha;
// postagem já agendada vira demanda para a Cecília atualizar na rede; texto alterado pelo cliente vira demanda para o Chris.
// Só reage ao item cuja legenda MUDOU nesta gravação do calendário (antes × depois): correções feitas direto na postagem
// não são sobrescritas — se a postagem já não tem o texto antigo do calendário, nada é copiado e o Chris é avisado.
import {hashI165} from './contexto.mjs';
import {legendaUtilizavelI79} from './lib/gs-legenda-qualidade-i79.mjs';
import {mesDoItemCalendario} from './lib/guardas-agendamento-cp101-i165.mjs';

const ENCERRADOS = new Set(['postado', 'arquivada_sem_postagem', 'cancelada_manual', 'cancelada', 'arquivada']);
const texto = v => String(v ?? '').trim();
const dataBr = d => d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const chaveItem = (cal, it) => (it?.itemId || it?.id) ? `${it.itemId || it.id}__${mesDoItemCalendario(cal, it) || ''}` : '';

function itensPorChave(cal) {
  const m = new Map();
  for (const it of Array.isArray(cal?.items) ? cal.items : []) {
    if (!it || it.excluido === true) continue;
    const k = chaveItem(cal, it); if (!k) continue;
    if (m.has(k)) m.set(k, null); else m.set(k, it); // duplicado → ignora (não adivinha qual é)
  }
  return m;
}

/** Itens cuja legenda mudou nesta gravação. */
export function legendasAlteradasCp190(antes, depois) {
  if (!antes || !depois || depois.excluido === true || depois.arquivado || depois.deletedAt) return [];
  const a = itensPorChave(antes), d = itensPorChave(depois), out = [];
  for (const [k, it] of d) {
    const velho = a.get(k);
    if (!it || !velho) continue;
    if (texto(it.legenda) === texto(velho.legenda)) continue;
    out.push({ chave: k, itemId: it.itemId || it.id, mes: mesDoItemCalendario(depois, it), nome: String(it.name || 'Conteúdo'), de: texto(velho.legenda), para: texto(it.legenda), postagemId: String(it.postagemId || ''), porCliente: it.legendaAtualizadaPor === 'Cliente' && it.legendaAtualizadaEm !== velho.legendaAtualizadaEm });
  }
  return out;
}

/** Textos (roteiro/legenda) que o cliente alterou pelo link nesta gravação. */
export function textosDoClienteCp190(antes, depois) {
  if (!antes || !depois) return [];
  const vistos = new Set((antes.comments || []).map(c => c?.operationId).filter(Boolean));
  return (depois.comments || []).filter(c => c?.tipo === 'texto_cliente_i68' && c.operationId && !vistos.has(c.operationId));
}

function demanda(id, { titulo, descricao, destinatario, cliente, agora, extra = {} }) {
  return { id, dados: { titulo, descricao: descricao.slice(0, 4000), destinatario, remetente: 'Sistema', status: 'pendente', prazoData: dataBr(agora), prazoHora: '18:00', cliente, criadoEm: agora.toISOString(), excluido: false, origemCp190: { schema: 1, cliente, ...extra } } };
}

async function postagensDoItem(db, slug, alt) {
  const [porOrigem, porPonteiro] = await Promise.all([
    db.collection('postagens').where('calendarClienteSlug', '==', slug).get(),
    alt.postagemId ? db.doc('postagens/' + alt.postagemId).get() : Promise.resolve(null),
  ]);
  const m = new Map();
  for (const s of porOrigem.docs) { const p = s.data(); if (p.calendarItemId === alt.itemId && p.calendarCompetencia === alt.mes) m.set(s.id, s.ref); }
  if (porPonteiro?.exists && porPonteiro.data().cliente === slug) m.set(porPonteiro.id, porPonteiro.ref);
  return [...m.values()];
}

export async function sincronizarLegendaCalendarioCp190(db, slug, antes, depois, { agora = new Date() } = {}) {
  const resultado = { atualizadas: [], demandas: [] };
  if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(slug || '') || !antes || !depois) return resultado;
  const nomeCliente = String(depois.client || slug);
  const gravarDemanda = async ({ id, dados }) => {
    const ref = db.doc('demandas/' + id);
    const criada = await db.runTransaction(async tx => { const s = await tx.get(ref); if (s.exists) return false; tx.set(ref, dados); return true; });
    if (criada) resultado.demandas.push(id);
  };

  for (const c of textosDoClienteCp190(antes, depois)) {
    const mudouLegenda = texto(c.antes?.legenda) !== texto(c.depois?.legenda), mudouRoteiro = texto(c.antes?.desc) !== texto(c.depois?.desc);
    if (!mudouLegenda && !mudouRoteiro) continue;
    const nome = String(c.text || '').replace(/^Texto atualizado pelo cliente — /, '') || 'Conteúdo';
    const partes = [];
    if (mudouRoteiro) partes.push('ROTEIRO\nAntes: ' + (texto(c.antes?.desc) || '(vazio)') + '\nAgora: ' + (texto(c.depois?.desc) || '(vazio)'));
    if (mudouLegenda) partes.push('LEGENDA\nAntes: ' + (texto(c.antes?.legenda) || '(vazia)') + '\nAgora: ' + (texto(c.depois?.legenda) || '(vazia)'));
    await gravarDemanda(demanda('cp190_cliente_' + hashI165([slug, c.operationId]).slice(0, 40), {
      titulo: `Cliente alterou o texto · ${nomeCliente} · ${nome}`,
      descricao: `O cliente mudou pelo link do calendário (${c.mes || c.competencia || ''}) o ${[mudouRoteiro && 'roteiro', mudouLegenda && 'legenda'].filter(Boolean).join(' e ')} de "${nome}". Confira se está certo.\n\n${partes.join('\n\n')}`,
      destinatario: 'Chris', cliente: slug, agora, extra: { tipo: 'texto_cliente', operationId: c.operationId, itemId: c.itemId || '' },
    }));
  }

  for (const alt of legendasAlteradasCp190(antes, depois)) {
    if (slug === 'stokki') continue; // Stokki tem legenda por rede e escritor próprio
    const refs = await postagensDoItem(db, slug, alt);
    for (const ref of refs) {
      const r = await db.runTransaction(async tx => {
        const s = await tx.get(ref); if (!s.exists) return null;
        const p = s.data();
        if (p.excluido === true || p.arquivado || p.publicacaoStokki != null || ENCERRADOS.has(String(p.status || ''))) return null;
        const atual = texto(p.legenda);
        if (atual === alt.para) return null; // já está certo
        // aguardando_legenda: a fila já oferece a legenda do calendário; outros estados (correção etc.) seguem o próprio fluxo.
        if (!['aguardando_agendamento', 'agendado'].includes(p.status)) return null;
        if (p.status === 'aguardando_agendamento' && atual === alt.de && legendaUtilizavelI79(alt.para)) {
          tx.update(ref, { legenda: alt.para, legendaEm: agora.toISOString(), legendaOrigem: 'calendario_sincronizado_cp190',
            legendaSincronizadaCp190: { schema: 1, de: hashI165(alt.de), para: hashI165(alt.para), itemId: alt.itemId, competencia: alt.mes, em: agora.toISOString() } });
          return { tipo: 'atualizada', id: s.id };
        }
        return { tipo: p.status === 'agendado' ? 'agendada' : 'divergente', id: s.id, p };
      });
      if (!r) continue;
      if (r.tipo === 'atualizada') { resultado.atualizadas.push(r.id); continue; }
      const base = { cliente: slug, agora, extra: { tipo: r.tipo, postagemId: r.id, itemId: alt.itemId, competencia: alt.mes, para: hashI165(alt.para) } };
      const id = 'cp190_' + r.tipo + '_' + hashI165([r.id, alt.para]).slice(0, 40);
      if (r.tipo === 'agendada') await gravarDemanda(demanda(id, { ...base, destinatario: 'Cecília',
        titulo: `Legenda mudou depois de agendada · ${nomeCliente} · ${alt.nome}`,
        descricao: `A legenda de "${alt.nome}" foi corrigida no calendário depois que a postagem foi agendada (${r.p.dataAgendada || 'data no sistema'}). Atualize o texto na rede antes de publicar.\n\nLEGENDA NOVA:\n${alt.para || '(vazia)'}\n\nLegenda antiga:\n${alt.de || '(vazia)'}` }));
      else await gravarDemanda(demanda(id, { ...base, destinatario: 'Chris',
        titulo: `Duas legendas diferentes · ${nomeCliente} · ${alt.nome}`,
        descricao: `A legenda de "${alt.nome}" mudou no calendário, mas a postagem já tinha outro texto (corrigido direto na postagem${legendaUtilizavelI79(alt.para) ? '' : ', ou o texto novo é um recado e não uma legenda'}). Nada foi sobrescrito. Escolha qual vale.\n\nNO CALENDÁRIO:\n${alt.para || '(vazia)'}\n\nNA POSTAGEM:\n${texto(r.p.legenda) || '(vazia)'}` }));
    }
  }
  return resultado;
}
