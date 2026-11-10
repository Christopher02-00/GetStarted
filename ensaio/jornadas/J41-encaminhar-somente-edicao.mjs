// J41 — "Encaminhar ao editor" de vídeo SOMENTE EDIÇÃO (takes avulsos, sem gravação) funciona (urgente do Chris, 10/11/2026).
// Cópia do caso real (Mochi — Conteúdo compartilhável, sinalizado pelo Luís no checklist, sem gravação): a Amanda escolhe
// o editor, confirma o material e clica "Encaminhar ao editor" → o vídeo vai para aguardando_edicao com o editor.
import { entrarComo, entrarGerencia, foto } from '../lib/navegador.mjs';
export const id = 'J41';
export const nome = 'Encaminhar ao editor um vídeo "somente edição" (takes avulsos) funciona';
const VID = 'j41-somente-edicao';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString(), hoje = agora.slice(0, 10), mes = hoje.slice(0, 7);
  const cal = await seed.get('calendarios', 'mochi');
  const itens = [...(cal?.items || [])];
  if (!itens.some(i => i?.itemId === 'calitem_j41')) itens.push({ itemId: 'calitem_j41', mes, day: 20, name: 'Mochi — Conteúdo compartilhável (J41)', desc: 'Roteiro', legenda: '', fmt: 'Reel', excluido: false });
  const { id: _x, ...semId } = cal || {}; await seed.set('calendarios', 'mochi', { cliente: 'mochi', client: 'Mochi', ...semId, items: itens });
  await seed.set('videos_producao', VID, {
    editorAtribuido: '', agendamentoId: 'ag-j41', vinculoSessao: 'somente_edicao_calendario_i34',
    historico: [{ em: agora, por: 'Luís', detalhe: 'Enviado para Amanda pelo checklist; sem gravação.', acao: 'Sinalizado como somente edição' }],
    data: hoje, registradoPor: 'Luís', calendarCompetencia: mes, titulo: 'Mochi — Conteúdo compartilhável (J41)', origemMaterial: 'recebido',
    observacao: 'Utilizar takes de brindes e pratos com a mesa cheia', linkFinalizado: '', calendarItemId: 'calitem_j41',
    materialUrl: 'https://drive.google.com/drive/folders/ensaio-j41',
    edicaoManual: { versao: 1, revisao: 1, uid: 'uid-luis', tratadoPor: '', enviadoEm: agora, tratadoEm: '', por: 'Luís', estado: 'pendente', materialConfirmado: false, tratadoUid: '', observacao: 'Utilizar takes de brindes e pratos com a mesa cheia', materialUrl: 'https://drive.google.com/drive/folders/ensaio-j41' },
    filmmaker: '', sessaoChave: 'mochi|' + mes + '|S02', criadoEm: new Date(), soEdicao: true, dataRegistro: hoje, enviadoPor: 'Luís',
    status: 'aguardando_encaminhamento', cliente: 'mochi', calendarClienteSlug: 'mochi', clienteNome: 'Mochi', calendarItemIdx: itens.length - 1, excluido: false,
  });
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  const toasts = []; page.on('console', m => { if (/Não alterei|encaminh/i.test(m.text())) toasts.push(m.text()); });
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
    await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('videos'));
    const card = page.locator(`[data-edicao-video="${VID}"]`);
    await card.waitFor({ timeout: 20000 });
    await card.locator('[data-edicao-editor]').selectOption({ index: 1 });
    const editor = await card.locator('[data-edicao-editor]').inputValue();
    await card.locator('[data-edicao-confirmado]').check();
    await card.getByRole('button', { name: /^Encaminhar ao editor$/ }).click();
    const v = await esperar(async () => { const x = await seed.get('videos_producao', VID); return x?.status === 'aguardando_edicao' ? x : null; });
    const toast = await page.evaluate(() => [...document.querySelectorAll('.toast, #toast, [role=alert]')].map(e => e.textContent.trim()).filter(Boolean).join(' | '));
    const graves = erros.filter(erroGrave);
    await foto(page, 'J41-amanda-encaminha');
    registrar({ jornada: id, caso: 'Amanda encaminha vídeo somente edição ao editor', ok: !!v && v.editorAtribuido === editor && !graves.length, ms: Date.now() - t0,
      detalhe: v ? `aguardando_edicao com ${v.editorAtribuido}` : `não encaminhou · tela: ${toast || '(sem mensagem)'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J41-falha'); registrar({ jornada: id, caso: 'Amanda encaminha vídeo somente edição ao editor', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 300) }); }
  finally { await fechar(); }
}
