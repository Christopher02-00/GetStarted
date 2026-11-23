// CP262 (23/11/2026, pedido do Chris: "tudo que for antigo do mês passado vc pode concluir … na parte da Cecília principalmente ali do
// problema que estávamos tendo … com verificação antes"; nunca mais acumular). A faxina CP248 confirma sozinha a postagem agendada cuja data
// passou há 2 dias — menos a Stokki, que é por plataforma e ficava com a Cecília para sempre (em 22/11: 9 plataformas de outubro paradas).
// Agora a mesma regra vale por plataforma da Stokki, pelo MESMO caminho da confirmação manual (lib/stokki-publicacao.mjs `alterar`):
//  - plataforma agendada (data e horário), não retirada, não publicada, com a data há 2 dias ou mais → publicada pelo Sistema, com prova;
//  - a conferência de 8 itens NÃO é marcada (ninguém finge ter conferido): a prova leva `automaticaCp262` e a fila "Publicações para conferir"
//    (gs-fila-publicacoes-cp125.mjs) não pede a conferência dessa plataforma;
//  - "Desfazer publicação" na plataforma continua valendo (limpa publicação e conferência);
//  - quando todas as plataformas ativas ficam publicadas, a postagem vira "postado", o calendário e o vídeo concluem e as demandas do ciclo
//    fecham — exatamente como na confirmação manual.
import * as m from './lib/stokki-publicacao.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
import {calendarioConclusaoTxI165,demandasCicloTxI165,exigirFonteFactualI165} from './publicacao.mjs';
import {validarAcaoFonteProgramacaoI165} from './compat-legado-programacao-r83.mjs';
import {assinaturaDiretrizI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {instanteI165} from './lib/gs-contexto-operacional-i165.mjs';

export const POR_CP262 = 'Sistema (confirmação automática)';
const dataCivil = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const horaCivil = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''));
const dataBr = d => d.split('-').reverse().join('/');

/** Plataformas da Stokki vencidas (data ≤ limite, AAAA-MM-DD) que a faxina pode confirmar. Só olha o documento. */
export function redesVencidasStokkiCp262(p, limite) {
  if (!p || p.excluido === true || p.arquivado || p.cliente !== 'stokki' || p.publicacaoStokki?.versao !== 1 || p.status !== 'agendado' || !dataCivil(limite)) return [];
  const s = p.publicacaoStokki;
  return (s.selecionadas || []).filter(id => { const r = s.redes?.[id]; return !!r && !r.retirada && !r.publicadaEm && dataCivil(r.data) && horaCivil(r.hora) && r.data <= limite; });
}

/** Confirma UMA plataforma da Stokki como publicada, pelo caminho oficial. Idempotente: relê tudo na transação. */
export async function confirmarRedeStokkiAutomaticaCp262(db, postagemId, rede, {agora = new Date(), limite} = {}) {
  return db.runTransaction(async tx => {
    const f = await fontesPostagemTxI165(db, tx, postagemId, agora), p = f.post, v = f.video;
    if (!redesVencidasStokkiCp262(p, limite).includes(rede)) return {acao: 'nada'};
    exigirFonteFactualI165(f);
    if (v && !(v.status === 'aprovado' || v.status === 'finalizado' && v.finalizadoVia === 'publicacao_stokki_i30')) return {acao: 'pulada', motivo: 'o vídeo está em outra operação'};
    const r0 = p.publicacaoStokki.redes[rede], em = instanteI165(agora), operacaoId = 'auto_cp262_' + p.id + '_' + rede;
    const texto = 'Confirmada automaticamente: ' + rede + ' agendada na plataforma para ' + dataBr(r0.data) + ' às ' + r0.hora + ', sem relato de falha em 2 dias '
      + '(regra da faxina estendida à Stokki, autorizada pelo Chris em 23/11/2026). A conferência de 8 itens não é pedida para esta confirmação automática. Se não saiu, use "Desfazer publicação" nesta plataforma com o motivo.';
    validarAcaoFonteProgramacaoI165(f, {acao: 'publicar', data: r0.data, hora: r0.hora, prova: texto, rede, agora}, {papel: 'Sistema'});
    // mesmo `alterar` da confirmação manual; a Stokki é operada no perfil da Cecília, e a autoria registrada é a do Sistema
    const resultado = m.alterar(p, {tipo: 'publicar', rede, operacaoId, url: ''}, {papel: 'Cecília', ator: POR_CP262, em});
    const pl = resultado.patch.publicacaoStokki, r = pl.redes[rede];
    r.data = r0.data; r.hora = r0.hora; // conferência de 8 itens NÃO é marcada (ninguém conferiu); a fila dispensa pela prova automaticaCp262
    const sel = pl.selecionadas.map(k => pl.redes[k]);
    const prox = sel.filter(x => !x.retirada && !x.publicadaEm && x.data).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    const fim = sel.filter(x => !x.retirada && x.data).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora)), x0 = prox[0] || fim[0];
    resultado.patch.dataAgendada = x0?.data || ''; resultado.patch.horaAgendada = x0?.hora || '';
    const mudaConclusao = ['postado', 'cancelada_manual'].includes(p.status) !== resultado.concluiu || (p.status === 'postado') !== resultado.publicado;
    const cal = mudaConclusao ? await calendarioConclusaoTxI165(db, tx, f, {publicado: resultado.publicado, restaurar: !resultado.concluiu, stokki: true}) : {ref: null, items: null};
    const baixas = mudaConclusao && resultado.concluiu ? await demandasCicloTxI165(db, tx, p) : {docs: [], ciclo: ''};
    const as = assinaturaDiretrizI165(f.diretriz);
    // todas as leituras terminaram antes da primeira escrita
    tx.update(db.doc('postagens/' + p.id), {...resultado.patch,
      historico: [...(Array.isArray(p.historico) ? p.historico : []), {...resultado.historico, acao: 'Stokki — publicação confirmada automaticamente / ' + rede, autorUid: '', perfil: 'Sistema'}],
      provasPublicacaoI165: {...p.provasPublicacaoI165, [rede]: {texto, data: r0.data, hora: r0.hora, por: POR_CP262, autorUid: '', perfil: 'Sistema', revisaoDiretriz: f.diretriz?.revisao || null,
        assinaturaDiretriz: f.diretriz ? as : null, promessaPolitica: f.diretriz?.politica || null, continuidadeLegadaI165: f.legadoProgramacao || null, operacao: operacaoId, em, automaticaCp262: true}},
      confirmacaoAutomaticaCp262: {...(p.confirmacaoAutomaticaCp262 || {}), [rede]: {schema: 1, em, data: r0.data, hora: r0.hora}}});
    if (cal.ref) tx.update(cal.ref, {items: cal.items, updatedAt: em});
    if (v && mudaConclusao) tx.update(db.doc('videos_producao/' + v.id), {status: resultado.concluiu ? 'finalizado' : 'aprovado', finalizadoEm: resultado.concluiu ? em : '', finalizadoVia: resultado.concluiu ? 'publicacao_stokki_i30' : ''});
    for (const s of baixas.docs) tx.update(s.ref, {status: resultado.publicado ? 'aprovada' : 'cancelada', concluidoPor: POR_CP262, concluidoEm: new Date(agora),
      notaConclusao: 'Todas as plataformas ativas foram confirmadas (confirmação automática da faxina).'});
    return {acao: 'publicada', rede, concluiu: resultado.concluiu};
  }, {maxAttempts: 3});
}
