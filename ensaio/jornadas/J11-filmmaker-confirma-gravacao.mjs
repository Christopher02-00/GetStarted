// J11 — Luís confirma a gravação (V100, sem calendário: títulos declarados) → vídeos nascem em `videos_producao`
// como aguardando_edicao SEM editor → aparecem na fila de distribuição da Amanda (Gerência → Vídeos) → sessão concluída.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J11';
export const nome = 'Gravação: Luís envia materiais da sessão → vídeos sem editor na fila da Amanda';

const AG = 'ag-bluefit-1'; // seed: Bluefit, Luís, 4 planejados, sem calendário
const NOMES = ['Ensaio J11 treino de pernas', 'Ensaio J11 depoimento da recepção'];
const TITULOS = NOMES.map(n => 'Bluefit — ' + n); // o app prefixa o nome do cliente
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await acao(page);
      const res = await verificar(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J11-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J11-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); return false; }
    finally { await fechar(); }
  };
  const videosNovos = async () => (await seed.listar('videos_producao')).filter(v => NOMES.some(n => String(v.titulo || '').includes(n)) && !v.excluido);

  // 1. Luís envia os materiais da sessão: Minha agenda → "Enviar materiais desta sessão" → tela Enviar materiais (Gravação da agenda)
  //    → textarea "Quais vídeos foram gravados?" → "Enviar para Amanda e concluir sessão"
  if (!await passo('1 Luís envia 2 materiais da sessão', 'Luís', async page => {
    await page.evaluate(() => irPara('agendamento', document.getElementById('navAgendamento')));
    await page.waitForSelector(`button[onclick*="abrirRegistroAgendamentoCampoV115('${AG}')"]`, { timeout: 15000 });
    await page.click(`button[onclick*="abrirRegistroAgendamentoCampoV115('${AG}')"]`);
    const extras = page.locator(`#extras_${AG}`); await extras.waitFor({ timeout: 15000 });
    await extras.fill(NOMES.join('\n')); await page.dispatchEvent(`#extras_${AG}`, 'input');
    await page.waitForFunction(idd => { const b = document.getElementById('btnConfirmarGravacao_' + idd); return b && !b.disabled; }, AG, { timeout: 8000 });
    await page.click(`#btnConfirmarGravacao_${AG}`);
    // CP207: cada vídeo digitado é identificado (conteúdo do calendário ou extra com descrição). Sem calendário: extra.
    const dialogo = page.locator('dialog#identificarEnvioI106'); await dialogo.waitFor({ timeout: 15000 });
    for (let i = 0; i < NOMES.length; i++) { const s = dialogo.locator(`section[data-linha="${i}"]`); await s.locator('[data-tipo]').selectOption('extra'); await s.locator('[data-descricao]').fill('Vídeo extra do ensaio J11: ' + NOMES[i]); }
    await dialogo.locator('[data-confirmar]').click();
    // sinal da UI antes de ler o banco: o cartão sai da lista (sessão concluída) ou o botão some/desabilita
    await page.waitForFunction(idd => { const b = document.getElementById('btnConfirmarGravacao_' + idd); return !b || b.disabled; }, AG, { timeout: 30000 });
    await page.waitForTimeout(2500);
  }, () => esperar(async () => {
    const vs = await videosNovos(); const ag = (await seed.listar('agendamentos')).find(a => a.id === AG);
    if (vs.length !== NOMES.length) return null;
    const ok = vs.every(v => v.status === 'aguardando_edicao' && !v.editorAtribuido && v.cliente === 'bluefit' && v.identificacaoConteudoI106?.modo === 'extra' && /ensaio J11/.test(v.identificacaoConteudoI106?.descricao || ''));
    return ok ? `${vs.length} vídeos aguardando_edicao sem editor · sessão ${ag?.status}` : `vídeos com estado inesperado: ${vs.map(v => v.status + '/' + (v.editorAtribuido || '-')).join(', ')}`;
  }, 25000))) return;

  // 2. Amanda vê os vídeos novos na fila de distribuição
  await passo('2 Amanda vê os vídeos na fila de distribuição', 'Amanda', async page => {
    await entrarGerencia(page);
    await page.evaluate(() => navegarGerenciaSub('videos'));
    await page.waitForFunction(t => (document.getElementById('view-gerencia')?.innerText || document.body.innerText).includes(t), NOMES[0], { timeout: 20000 });
  }, async page => {
    const vs = await videosNovos();
    const ids = await page.evaluate(() => [...document.querySelectorAll('[data-i145-video-id]')].map(e => e.getAttribute('data-i145-video-id')));
    const todos = vs.every(v => ids.includes(v.id));
    return todos ? `${vs.length} vídeos com select de editor na Gerência` : null;
  });
}
