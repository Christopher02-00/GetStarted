// CP194 (10/11/2026, urgente do Chris) — "Encaminhar ao editor" / "Salvar como aguardando material" de vídeo
// SOMENTE EDIÇÃO (takes avulsos, sem gravação) é gravado pelo servidor.
// Antes: o navegador da gestão gravava `videos_producao` direto; as rules do vídeo passam do limite de 1000 expressões
// e o Firestore recusava ("Não alterei o encaminhamento:" sem motivo). Aqui as MESMAS conferências da tela e da regra
// rodam em JS, numa transação: papel (Amanda/Chris), vídeo pendente de somente edição, mesma revisão, sem demanda de
// arte, cliente ativo, link https e editor da lista. Idempotente pela revisão: a segunda tentativa vê a revisão nova.
import {FieldValue} from 'firebase-admin/firestore';
import {validarCadastroI165,clienteTxI165} from './contexto.mjs';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {exigirI165,idFisicoI165} from './lib/gs-contexto-operacional-i165.mjs';

export const ACOES_SOMENTE_EDICAO_CP194 = Object.freeze(['somente_edicao_tratar_cp194']);
export const EDITORES_SOMENTE_EDICAO_CP194 = Object.freeze(['Helo', 'João Victor', 'Cecília', 'Nathan']); // mesma lista das rules

export function materialUrlCp194(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  exigirI165(texto.length <= 2000, 'cp194-link', 'O link do material é muito longo.');
  let url; try { url = new URL(texto); } catch { exigirI165(false, 'cp194-link', 'Informe um link completo do material, começando com https://.'); }
  exigirI165(url.protocol === 'https:' && !url.username && !url.password, 'cp194-link', 'Use um link https:// do material, sem usuário ou senha no endereço.');
  return url.href;
}

export async function operarSomenteEdicaoCp194(db, auth, d, { agora = new Date() } = {}) {
  const a = validarContaEsperadaI165(auth, d);
  exigirI165(ACOES_SOMENTE_EDICAO_CP194.includes(d.acao), 'cp194-acao', 'Encaminhamento inválido. Reabra a fila.');
  exigirI165(['Amanda', 'Chris'].includes(a.papel) && ['Amanda', 'Chris'].includes(a.real), 'cp194-papel', 'Este encaminhamento é da gestão.');
  exigirI165(idFisicoI165(d.videoId) && ['aguardar', 'encaminhar'].includes(d.tipo) && Number.isInteger(d.revisao), 'cp194-entrada', 'Encaminhamento inválido. Reabra a fila.');
  const encaminhar = d.tipo === 'encaminhar', materialUrl = materialUrlCp194(d.materialUrl), observacao = String(d.observacao || '').trim();
  exigirI165(observacao.length <= 2000, 'cp194-entrada', 'A observação deve ter até 2.000 caracteres.');
  exigirI165(!encaminhar || (d.materialConfirmado === true && EDITORES_SOMENTE_EDICAO_CP194.includes(d.editor)), 'cp194-editor', 'Escolha o editor e confirme que o material está disponível.');
  const ref = db.doc('videos_producao/' + d.videoId), em = agora.toISOString();
  return db.runTransaction(async tx => {
    const cadastro = await tx.get(db.doc('usuarios_equipe/' + a.email)); validarCadastroI165(a, cadastro.data());
    const [snap, arte] = await Promise.all([tx.get(ref), tx.get(db.doc('demandas/arte_yas_' + d.videoId))]);
    exigirI165(!arte.exists, 'cp194-arte', 'Este registro já tem uma demanda de arte. Confira o encaminhamento para Yas antes de distribuir como vídeo.');
    exigirI165(snap.exists, 'cp194-video', 'Este vídeo não existe mais.');
    const v = snap.data();
    const cli = await clienteTxI165(db, tx, v.cliente, agora);
    exigirI165(cli.clienteAtivo, 'cp194-cliente', 'Este cliente está fora da carteira ativa.');
    const pendente = v.excluido !== true && v.edicaoManual?.versao === 1 && v.edicaoManual.estado !== 'encaminhado';
    if (!pendente && v.edicaoManual?.revisao === d.revisao + 1 && (encaminhar ? v.editorAtribuido === d.editor : v.edicaoManual.estado === 'aguardando_material'))
      return { schema: 1, recuperado: true, titulo: v.titulo, clienteNome: v.clienteNome, revisao: v.edicaoManual.revisao };
    exigirI165(pendente && v.status === 'aguardando_encaminhamento' && !v.editorAtribuido, 'cp194-estado', 'Este item já foi encaminhado ou alterado. Atualize a fila.');
    exigirI165(v.edicaoManual.revisao === d.revisao, 'cp194-revisao', 'Este item mudou em outra aba. Atualize a fila antes de confirmar.');
    const edicaoManual = { ...v.edicaoManual, revisao: v.edicaoManual.revisao + 1, estado: encaminhar ? 'encaminhado' : 'aguardando_material', materialUrl, observacao,
      materialConfirmado: encaminhar, tratadoPor: a.real, tratadoUid: a.uid, tratadoEm: em };
    const patch = { edicaoManual, observacao, materialUrl, historico: FieldValue.arrayUnion({ acao: encaminhar ? 'Encaminhado para edição' : 'Aguardando material para edição', detalhe: encaminhar ? 'Editor: ' + d.editor : observacao, por: a.real, em }) };
    if (encaminhar) Object.assign(patch, { status: 'aguardando_edicao', editorAtribuido: d.editor, editorAtribuidoPor: a.real, editorAtribuidoEm: em });
    tx.update(ref, patch);
    return { schema: 1, recuperado: false, titulo: v.titulo, clienteNome: v.clienteNome, revisao: edicaoManual.revisao };
  });
}
