// CP193 (10/11/2026, urgente do Chris) — o pedido de ajuste do cliente (calendário pelo link) é gravado pelo servidor.
// Antes: o navegador do cliente gravava `calendarios/{slug}` + `avisos_do_cliente` direto, validado pela regra dd()/dP().
// Em calendário grande (Zeiss: 36 itens em 3 meses) a avaliação passava do limite de 1000 expressões das rules e o
// Firestore recusava ("Não consegui confirmar o ajuste no servidor"). Aqui a MESMA conferência da regra roda em JS, sem
// esse limite: sessão do cliente + token do link, item exato, mês liberado/em ajuste, item não agendado/postado, e a
// mesma marca/pedido/aviso que o calendario.html montava. Idempotente por operationId.
import {mesDoItemCalendario} from './lib/guardas-agendamento-cp101-i165.mjs';

import {FieldValue} from 'firebase-admin/firestore';

const FB = { serverTimestamp: () => FieldValue.serverTimestamp() };
/** Mesmo objeto que o calendario.html gravava (contrato lido pela recepção CP175 e pelo teste client-intake). */
export function avisoPedidoAjusteCp193({ slug, nome, item, itemNome, texto, operationId, competencia, itemId, alvo, agora, fb }) {
  const aviso={cliente:slug,clienteNome:nome,
      titulo:'✏️ '+nome+' pediu ajuste em: '+itemNome.slice(0,45),
      descricao:'Conteúdo do dia '+(alvo.item?.day||'?')+' — '+itemNome+'\n\nO que o cliente escreveu:\n"'+texto+'"\n\nAjuste somente este conteúdo e envie para a Amanda revisar. Os demais pedidos têm acompanhamento próprio.',
      texto,itemNome,paraQuem:'Chris',lido:false,viraDemanda:true,tipo:'ajuste_calendario',
      operationId,competencia,itemId,itemIdx:alvo.indice,criadoEm:agora,registradoEm:fb.serverTimestamp()};
  return aviso;
}

export const ACOES_PEDIDO_AJUSTE_CLIENTE_CP193 = Object.freeze(['cliente_pedido_ajuste_cp193']);
const ALIASES_ZEISS = ['zeens', 'otica-visao-araucaria'];
const ESTADOS_AJUSTE = ['ajuste_interno', 'aguardando_interna', 'aprovado_interno'];
const falha = (code, msg) => Object.assign(new Error(msg), { code });
const exigir = (ok, code, msg) => { if (!ok) throw falha(code, msg); };
const vigente = (d, agoraIso) => !d?.ativoAte || String(d.ativoAte) > agoraIso || (typeof d.ativoAte?.toDate === 'function' && d.ativoAte.toDate().toISOString() > agoraIso);

/** Mesma decisão de bq() das rules: o token do link vale para este cliente agora. */
export async function conferirAcessoClienteTxCp193(db, tx, uid, agora = new Date()) {
  exigir(typeof uid === 'string' && uid.length > 0, 'cp193/sessao', 'Abra o link do calendário novamente.');
  const s = await tx.get(db.doc('sessoes_cliente/' + uid)), sessao = s.data();
  exigir(s.exists && sessao.modo !== 'equipe' && typeof sessao.cliente === 'string' && typeof sessao.token === 'string', 'cp193/sessao', 'Abra o link do calendário novamente.');
  const slug = sessao.cliente, token = sessao.token, iso = agora.toISOString();
  exigir(/^[a-z0-9][a-z0-9._-]{0,119}$/.test(slug) && !ALIASES_ZEISS.includes(slug), 'cp193/cliente', 'Este link não pertence a um cliente ativo.');
  const [ts, as] = await Promise.all([tx.get(db.doc('clientes_portal_tokens/' + token)), tx.get(db.doc('clientes_acesso/' + slug))]);
  const acessoOk = as.exists && as.data().ativo !== false && vigente(as.data(), iso);
  const ok = ts.exists
    ? ts.data().cliente === slug && ts.data().ativo !== false && vigente(ts.data(), iso) && (!as.exists || acessoOk)
    : acessoOk && as.data().token === token;
  exigir(ok, 'cp193/token', 'Este link de calendário não está mais ativo. Peça um link novo à equipe.');
  return { slug, uid };
}

function mesDoTexto(t) {
  const m = String(t || '').toLowerCase().match(/(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(\d{4})/);
  if (!m) return '';
  const n = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'].indexOf(m[1] === 'marco' ? 'março' : m[1]) + 1;
  return m[2] + '-' + String(n).padStart(2, '0');
}

export async function operarPedidoAjusteClienteCp193(db, auth, dados, { agora = new Date() } = {}) {
  exigir(dados && typeof dados === 'object' && ACOES_PEDIDO_AJUSTE_CLIENTE_CP193.includes(dados.acao), 'cp193/entrada', 'Pedido de ajuste inválido.');
  const { competencia, itemId = '', itemIdx, texto, operationId } = dados;
  exigir(/^20\d{2}-(0[1-9]|1[0-2])$/.test(competencia || ''), 'cp193/entrada', 'Competência inválida.');
  exigir(/^cal_ajuste_v113_[a-f0-9]{48}$/.test(operationId || ''), 'cp193/entrada', 'Identificador do pedido inválido.');
  exigir(typeof texto === 'string' && texto.trim().length >= 1 && texto.length <= 2000, 'cp193/entrada', 'Escreva o ajuste (até 2.000 caracteres).');
  exigir(Number.isInteger(itemIdx) && itemIdx >= 0 && typeof itemId === 'string' && itemId.length <= 160, 'cp193/entrada', 'Conteúdo inválido.');
  return db.runTransaction(async tx => {
    const { slug, uid } = await conferirAcessoClienteTxCp193(db, tx, auth?.uid, agora);
    const calRef = db.doc('calendarios/' + slug), avisoRef = db.doc('avisos_do_cliente/' + operationId);
    const [cs, avs] = await Promise.all([tx.get(calRef), tx.get(avisoRef)]);
    exigir(cs.exists, 'cp193/calendario', 'Calendário não encontrado.');
    const cal = cs.data();
    exigir(cal.excluido !== true && !cal.deletedAt, 'cp193/calendario', 'Este calendário foi retirado.');
    const pedidos = { ...(cal.pedidosAjusteClienteI71 || {}) };
    const existente = pedidos[operationId];
    if (existente) { // mesma tentativa repetida (rede caiu depois do commit)
      exigir(existente.competencia === competencia && existente.texto === texto && existente.itemId === itemId, 'cp193/reuso', 'O recibo não corresponde a este pedido.');
      return { schema: 1, jaConfirmado: true, marca: cal.aprovacaoMeses?.[competencia] || null, pedido: existente, updatedAt: String(cal.updatedAt || '') };
    }
    exigir(!avs.exists, 'cp193/reuso', 'Este pedido já foi registrado.');
    const itens = Array.isArray(cal.items) ? cal.items : [], item = itens[itemIdx];
    exigir(item && item.excluido !== true, 'cp193/item', 'O conteúdo mudou. Recarregue antes de pedir o ajuste.');
    const mesItem = mesDoItemCalendario(cal, item) || (item.mes ? '' : (cal.mesLegado || mesDoTexto(cal.month)));
    exigir(String(item.itemId || '') === itemId && (itemId !== '' || String(item.name || item.nome || '').trim() !== '') && mesItem === competencia, 'cp193/item', 'O conteúdo mudou de identidade ou competência. Recarregue antes de pedir o ajuste.');
    exigir(item.posted !== true && item.postado !== true && item.agendado !== true, 'cp193/item', 'Este conteúdo já está agendado ou publicado; fale com a equipe.');
    const mapa = { ...(cal.aprovacaoMeses || {}) }, anterior = mapa[competencia] || {};
    const status = String(anterior.status || '');
    exigir(status === 'liberado' || (ESTADOS_AJUSTE.includes(status) && String(anterior.liberadoEmAnterior || '') !== ''), 'cp193/estado', 'O calendário não está disponível para novos pedidos.');
    const jaAberto = Object.values(pedidos).some(p => p && p.competencia === competencia && String(p.itemId || '') === itemId && !p.cancelamentoCp143 && p.operationId !== operationId && status !== 'liberado');
    exigir(!jaAberto, 'gs/ajuste-ja-aberto', 'Este conteúdo já está em ajuste. Você pode enviar pedidos nos outros conteúdos.');
    const em = agora.toISOString(), itemNome = String(item.name || item.nome || '').trim();
    const liberadoEm = status === 'liberado' ? String(anterior.em || anterior.aprovadoEm || '') : String(anterior.liberadoEmAnterior || anterior.retratoLiberadoV115?.publicadoEm || '');
    const liberadoPor = status === 'liberado' ? String(anterior.por || anterior.enviadoPor || '') : String(anterior.liberadoPorAnterior || anterior.retratoLiberadoV115?.publicadoPor || '');
    const marca = { ...anterior, status: 'ajuste_interno', mes: competencia, por: 'Cliente', em, motivoAjuste: texto, pedidoAjusteOperationId: operationId,
      pedidoAjusteItemId: itemId, pedidoAjusteItemIdx: itemIdx, liberadoEmAnterior: liberadoEm, liberadoPorAnterior: liberadoPor };
    mapa[competencia] = marca;
    const pedido = { schemaVersion: 1, operationId, calendarId: slug, competencia, itemId, itemIdx, itemNome, texto, por: 'Cliente', autorUid: uid, criadoEm: em, registradoEm: FB.serverTimestamp() };
    pedidos[operationId] = pedido;
    const nome = String(cal.client || slug);
    tx.update(calRef, { aprovacaoMeses: mapa, pedidoAjusteCliente: pedido, pedidosAjusteClienteI71: pedidos, updatedAt: em });
    tx.set(avisoRef, avisoPedidoAjusteCp193({ slug, nome, item, itemNome, texto, operationId, competencia, itemId, alvo: { indice: itemIdx, item }, agora: em, fb: FB }));
    return { schema: 1, jaConfirmado: false, marca, pedido: { ...pedido, registradoEm: null }, updatedAt: em };
  });
}
