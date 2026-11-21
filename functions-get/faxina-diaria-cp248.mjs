// CP248 (21/11/2026, decisão do Chris: "quero uma correção definitiva… Amanda ou Cecília costumam ter números terríveis de coisas em aberto
// que são verificações do sistema"; autorizou as opções recomendadas). Faxina do servidor (no agendamento de 5 min já existente, no máximo a cada 2 h), idempotente e reversível:
//  1. Postagem AGENDADA cuja data passou há 2 dias conta como publicada ("confirmada automaticamente — agendada na plataforma"), pelo MESMO
//     caminho da confirmação da Cecília (fontes + conferência factual + calendário + vídeo finalizado + demandas do ciclo). Antes disso a
//     Cecília pode confirmar ou retirar ("não saiu"); depois, "desfazer publicação" continua valendo. Stokki (por plataforma), sem horário
//     agendado ou com a fonte que o servidor não confere ficam com a Cecília e entram no relatório.
//  2. Tarefa do sistema concluída pela Amanda esperando uma aprovação que ninguém pode dar fecha (mesma regra da CP245, agora também para o
//     legado de agosto a novembro).
//  3. Postagem que ainda não foi para a rede, com o vídeo na Lixeira, é encerrada (mesma regra da CP244, agora também para o legado).
// Relatório da última rodada em `sistema/faxina_cp248` (o vigia da operação e quem conferir leem ali).
import {fontesPostagemTxI165} from './fontes.mjs';
import {calendarioConclusaoTxI165,demandasCicloTxI165,exigirFonteFactualI165} from './publicacao.mjs';
import {validarAcaoFonteProgramacaoI165} from './compat-legado-programacao-r83.mjs';
import {assinaturaDiretrizI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {instanteI165,horarioBrasiliaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {cicloFonteAlertaCanonicoV135} from './lib/guardas-agendamento-cp101-i165.mjs';
import {semAprovadorCp245,fecharSemAprovadorCp245} from './tarefa-sistema-sem-aprovador-cp245.mjs';
import {sincronizarPostagemVideoExcluidoCp244} from './video-excluido-postagem-cp244.mjs';

export const DIAS_CONFIRMACAO_AUTOMATICA_CP248 = 2;
export const POR_CP248 = 'Sistema (confirmação automática)';
const dataCivil = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const horaCivil = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''));
const dataBr = d => d.split('-').reverse().join('/');

/** Último dia (Brasília) cuja publicação agendada já conta como feita. */
export function limiteConfirmacaoCp248(agora = new Date()) {
  return horarioBrasiliaI165(new Date(agora.getTime() - DIAS_CONFIRMACAO_AUTOMATICA_CP248 * 864e5)).slice(0, 10);
}

/** A postagem pode ser confirmada automaticamente? (só olha o documento; a conferência completa é na transação) */
export function candidataConfirmacaoCp248(p, agora = new Date()) {
  return !!p && p.excluido !== true && !p.arquivado && p.status === 'agendado' && !p.publicacaoStokki && dataCivil(p.dataAgendada) && p.dataAgendada <= limiteConfirmacaoCp248(agora);
}

/** Confirma UMA postagem agendada como publicada, pelo caminho oficial. Idempotente: relê tudo na transação. */
export async function confirmarPublicacaoAutomaticaCp248(db, postagemId, { agora = new Date() } = {}) {
  return db.runTransaction(async tx => {
    const f = await fontesPostagemTxI165(db, tx, postagemId, agora), p = f.post, v = f.video;
    if (!candidataConfirmacaoCp248(p, agora)) return { acao: 'nada' };
    if (!horaCivil(p.horaAgendada)) return { acao: 'pulada', motivo: 'sem horário agendado' };
    exigirFonteFactualI165(f, { retirada: false });
    const em = instanteI165(agora), data = p.dataAgendada, hora = p.horaAgendada, operacaoId = 'auto_cp248_' + p.id;
    const texto = 'Confirmada automaticamente: agendada na plataforma para ' + dataBr(data) + ' às ' + hora + ', sem relato de falha em ' + DIAS_CONFIRMACAO_AUTOMATICA_CP248
      + ' dias (regra autorizada pelo Chris em 21/11/2026). Se não saiu, use "Desfazer publicação" com o motivo.';
    validarAcaoFonteProgramacaoI165(f, { acao: 'publicar', data, hora, prova: texto, rede: 'geral', agora }, { papel: 'Sistema' });
    const as = assinaturaDiretrizI165(f.diretriz);
    const prova = { texto, data, hora, por: POR_CP248, autorUid: '', perfil: 'Sistema', em, operacaoId, ciclo: cicloFonteAlertaCanonicoV135('postagem', p),
      revisaoDiretriz: f.diretriz?.revisao || null, assinaturaDiretriz: f.diretriz ? as : null, promessaPolitica: f.diretriz?.politica || null,
      continuidadeLegadaI165: f.legadoProgramacao || null, automaticaCp248: true };
    const cal = await calendarioConclusaoTxI165(db, tx, f, { publicado: true }), baixas = await demandasCicloTxI165(db, tx, p);
    tx.update(db.doc('postagens/' + p.id), { status: 'postado', postadoPor: POR_CP248, postadoEm: em, provasPublicacaoI165: { ...p.provasPublicacaoI165, geral: prova },
      confirmacaoAutomaticaCp248: { schema: 1, em, dataAgendada: data, horaAgendada: hora },
      historico: [...(Array.isArray(p.historico) ? p.historico : []), { acao: 'Publicação confirmada automaticamente', por: 'Sistema', perfil: 'Sistema', em, detalhe: texto }] });
    if (cal.ref) tx.update(cal.ref, { items: cal.items, updatedAt: em });
    if (v) tx.update(db.doc('videos_producao/' + v.id), { status: 'finalizado', finalizadoEm: em, finalizadoVia: 'postagem_publicada' });
    for (const s of baixas.docs) tx.update(s.ref, { status: 'aprovada', concluidoPor: 'Sistema', concluidoEm: agora,
      notaConclusao: 'Publicação confirmada automaticamente (agendada na plataforma, ' + DIAS_CONFIRMACAO_AUTOMATICA_CP248 + ' dias sem relato de falha).',
      resolucaoPublicacaoI165: { postagemId: p.id, ciclo: baixas.ciclo, operacaoId, acao: 'publicar', em } });
    return { acao: 'publicada', calendario: !!cal.ref, demandas: baixas.docs.length };
  }, { maxAttempts: 3 });
}

/** Uma rodada completa da faxina. Nunca para no primeiro erro: cada item é uma transação e entra no relatório. */
// 21/11 (1ª rodada em produção): a 12ª confirmação ficou esperando lock (os gatilhos das confirmações anteriores do mesmo cliente
// mexem no calendário e nas postagens) e a volta estourou os 9 min sem relatório. Agora: limite por item, progresso gravado a cada 10.
export const LIMITE_ITEM_MS_CP248 = 30e3;
const comLimite = (promessa, ms) => { let t; return Promise.race([promessa, new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(Error('tempo esgotado neste item; volta na próxima rodada'), { code: 'cp248/tempo' })), ms); })]).finally(() => clearTimeout(t)); };
export async function executarFaxinaCp248(db, { agora = new Date(), gravarRelatorio = true, prazoMs = Infinity, limiteItemMs = LIMITE_ITEM_MS_CP248 } = {}) {
  const r = { schema: 1, em: agora.toISOString(), limiteConfirmacao: limiteConfirmacaoCp248(agora), publicadas: [], puladas: [], fechadasSemAprovador: [], postagensEncerradas: [], erros: [], parcial: false };
  const inicio = Date.now(), semTempo = () => { if (Date.now() - inicio > prazoMs) { r.parcial = true; return true; } return false; };
  const relatorio = (extra = {}) => ({ ...r, puladas: r.puladas.slice(0, 200), atualizadoEm: new Date().toISOString(), totais: { publicadas: r.publicadas.length, puladas: r.puladas.length, fechadasSemAprovador: r.fechadasSemAprovador.length, postagensEncerradas: r.postagensEncerradas.length, erros: r.erros.length }, ...extra });
  let feitos = 0; const progresso = async () => { if (gravarRelatorio && ++feitos % 10 === 0) await db.doc('sistema/faxina_cp248').set(relatorio({ emAndamento: true, parcial: true })); };
  if (gravarRelatorio) await db.doc('sistema/faxina_cp248').set(relatorio({ emAndamento: true, parcial: true }));
  // 1) publicações agendadas vencidas
  const ag = await db.collection('postagens').where('status', '==', 'agendado').get();
  for (const s of ag.docs) {
    if (semTempo()) break;
    const p = { ...s.data(), id: s.id };
    if (!candidataConfirmacaoCp248(p, agora)) { if (p.publicacaoStokki && dataCivil(p.dataAgendada) && p.dataAgendada <= r.limiteConfirmacao) r.puladas.push({ id: s.id, motivo: 'Stokki: confirmação por plataforma' }); continue; }
    try { const x = await comLimite(confirmarPublicacaoAutomaticaCp248(db, s.id, { agora }), limiteItemMs); if (x.acao === 'publicada') r.publicadas.push(s.id); else if (x.acao === 'pulada') r.puladas.push({ id: s.id, motivo: x.motivo }); }
    catch (e) { r.puladas.push({ id: s.id, motivo: String(e?.message || e).slice(0, 200) }); if (e?.code === 'cp248/tempo') r.parcial = true; }
    await progresso();
  }
  // 2) entregas do sistema sem aprovador possível (CP245, inclusive o legado)
  const ent = await db.collection('demandas').where('status', '==', 'concluida_aguardando_aprovacao').get();
  for (const s of ent.docs) {
    if (semTempo()) break;
    if (!semAprovadorCp245(s.data())) continue;
    try { const x = await comLimite(fecharSemAprovadorCp245(db, s.id, { agora }), limiteItemMs); if (x.acao === 'fechada') r.fechadasSemAprovador.push(s.id); }
    catch (e) { r.erros.push({ id: s.id, etapa: 'sem_aprovador', erro: String(e?.message || e).slice(0, 200) }); if (e?.code === 'cp248/tempo') r.parcial = true; }
    await progresso();
  }
  // 3) postagens antes da rede com o vídeo na Lixeira (CP244, inclusive o legado)
  const vids = await db.collection('videos_producao').where('excluido', '==', true).get();
  for (const s of vids.docs) {
    if (semTempo()) break;
    const pid = String(s.data().postagemId || '').trim() || 'video_' + s.id, ps = await db.doc('postagens/' + pid).get();
    if (!ps.exists || ps.data().excluido === true || ['arquivada_sem_postagem', 'cancelada_manual', 'cancelada_video_trafego', 'postado', 'finalizado'].includes(ps.data().status)) continue;
    try { const x = await comLimite(sincronizarPostagemVideoExcluidoCp244(db, s.id, { agora }), limiteItemMs); if (x.acao === 'encerrada') r.postagensEncerradas.push(pid); }
    catch (e) { r.erros.push({ id: pid, etapa: 'video_excluido', erro: String(e?.message || e).slice(0, 200) }); if (e?.code === 'cp248/tempo') r.parcial = true; }
  }
  if (gravarRelatorio) await db.doc('sistema/faxina_cp248').set(relatorio({ emAndamento: false, parcial: r.parcial }));
  return r;
}

/** No agendamento de 5 min: só PEDE a rodada (grava um documento pequeno), nunca roda a faxina ali — a 1ª rodada dentro do agendamento
 * travou numa confirmação e derrubou as voltas seguintes dos avisos. A rodada roda na função própria disparada por esse pedido. */
export async function pedirFaxinaSeDevidaCp248(db, { agora = new Date(), intervaloMs = 2 * 3600e3 } = {}) {
  const s = await db.doc('sistema/faxina_cp248').get(), ult = s.exists ? s.data() : null, t = agora.getTime();
  if (ult?.emAndamento === true && Date.parse(ult.atualizadoEm || ult.em) > t - 12 * 60e3) return { estado: 'em_andamento' };
  if (ult && ult.parcial !== true && ult.emAndamento !== true && Date.parse(ult.em) > t - intervaloMs) return { estado: 'aguardando', ultima: ult.em };
  const p = await db.doc('sistema/faxina_cp248_pedido').get();
  if (p.exists && Date.parse(p.data().em) > t - 12 * 60e3) return { estado: 'pedido_recente' };
  await db.doc('sistema/faxina_cp248_pedido').set({ em: agora.toISOString(), motivo: !ult ? 'primeira' : ult.parcial ? 'continuar' : 'intervalo' });
  return { estado: 'pedida' };
}

/** Função própria (gatilho em sistema/faxina_cp248_pedido): uma rodada com até 7 min, sem disputar o tempo do agendamento dos avisos. */
export async function rodarFaxinaPedidaCp248(db, antes, depois, { prazoMs = 420e3 } = {}) {
  if (!depois?.em || antes?.em === depois.em) return { estado: 'nada' };
  const r = await executarFaxinaCp248(db, { agora: new Date(), prazoMs });
  return { estado: r.parcial ? 'parcial' : 'completa', publicadas: r.publicadas.length, puladas: r.puladas.length, fechadas: r.fechadasSemAprovador.length, encerradas: r.postagensEncerradas.length };
}

/** Ponto de entrada no agendamento que já existe (acompanhamentoOperacionalGetI165, a cada 5 min): roda no máximo a cada 2 h, ou de novo
 * na próxima volta se a rodada anterior parou no limite de tempo. Uma função agendada própria exigiria permissão de IAM que a publicação não tem. */
export async function faxinaSeDevidaCp248(db, { agora = new Date(), intervaloMs = 2 * 3600e3, prazoMs = 240e3 } = {}) {
  const s = await db.doc('sistema/faxina_cp248').get(), ult = s.exists ? s.data() : null;
  if (ult && ult.parcial !== true && Date.parse(ult.em) > agora.getTime() - intervaloMs) return { estado: 'aguardando', ultima: ult.em };
  const r = await executarFaxinaCp248(db, { agora, prazoMs });
  return { estado: r.parcial ? 'parcial' : 'completa', publicadas: r.publicadas.length, puladas: r.puladas.length, fechadas: r.fechadasSemAprovador.length, encerradas: r.postagensEncerradas.length, erros: r.erros.length };
}
