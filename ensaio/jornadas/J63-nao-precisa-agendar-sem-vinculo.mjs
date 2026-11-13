// J63 — CP211 (12/11/2026, Bluefit): 4 vídeos de tráfego pago (Comparação, Tour completo, O que eu mais gosto aqui, Só acontece
// aqui) não vão para o feed e não existem no calendário. Na fila "2 · Agendar", "🚫 Não precisa agendar" abria a conferência
// I165 exigindo escolher um conteúdo do calendário → não havia como tirá-los da fila.
// Conferido em 12/11: o caminho já existe e funciona (painel I165 "Encerrar sem publicação": motivo obrigatório →
// "Encerrar sem publicar"); a janela de "Conteúdo e legenda" relatada não se reproduziu. Esta jornada protege o comportamento.
// Esperado: postagem SEM ligação com o calendário sai da fila com motivo escrito obrigatório, registrado no histórico, e o
// vídeo vai para Entregas Finalizadas. Sem motivo, nada muda. (A CP207 continua: legenda sem ligação não vira agendamento.)
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J63';
export const nome = '"Não precisa agendar" tira da fila vídeo sem ligação com o calendário, com motivo obrigatório';
const VID = 'j63-trafego', POST = 'video_' + VID;
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = new Date().toISOString().slice(0, 10), link = 'https://drive.google.com/file/d/EnsaioJ63trafego/view';
  await seed.set('videos_producao', VID, { cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Bluefit — Comparação (J63)', status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: link, calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', postagemId: POST, data: hoje, criadoEm: new Date(), excluido: false });
  await seed.set('postagens', POST, { videoId: VID, cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Bluefit — Comparação (J63)', linkVideo: link, legenda: 'Legenda escrita para o tráfego pago (J63).', legendaPor: 'Chris', legendaEm: new Date().toISOString(), status: 'aguardando_agendamento', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', demandaLegendaCriada: true, excluido: false, criadoEm: new Date() });
  await amb.aguardarFunctionsOciosas?.();
  const caso = 'Cecília tira da fila o vídeo de tráfego (sem ligação) com motivo';
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    const respostas = ['', 'Material de tráfego pago (J63), não vai para o feed.']; const vistos = [];
    page.on('dialog', async d => { vistos.push(d.type() + ':' + d.message().slice(0, 60)); if (d.type() === 'prompt') await d.accept(respostas.shift() ?? ''); else await d.accept(); });
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('agendar', null)); await page.waitForTimeout(4000);
    const botao = page.locator(`button[onclick*="marcarPostagemSemAgendamento('${POST}'"]`).first();
    await botao.waitFor({ timeout: 20000 });
    // 1ª tentativa sem motivo → nada muda
    await botao.click(); await page.waitForTimeout(3000);
    const abriuConteudo = await page.evaluate(() => !!document.querySelector('dialog[open]') && /Conteúdo e legenda/.test(document.querySelector('dialog[open]')?.innerText || ''));
    if (abriuConteudo) { await foto(page, 'J63-exigiu-calendario'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: 'abriu "Conteúdo e legenda" exigindo um conteúdo do calendário — o vídeo não sai da fila' }); return; }
    const semMotivo = await seed.get('postagens', POST);
    // Painel "Encerrar sem publicação" (I165): sem motivo não encerra; com motivo encerra
    const painel = page.locator('section,div').filter({ hasText: /Encerrar sem publicação/ }).last();
    const encerrar = page.getByRole('button', { name: /^Encerrar sem publicar$/ }).first();
    if (await encerrar.count()) {
      await encerrar.click(); await page.waitForTimeout(3000);
      const aposVazio = await seed.get('postagens', POST); if (aposVazio?.status !== 'aguardando_agendamento') semMotivo.status = aposVazio?.status;
      const motivo = page.locator('textarea').filter({ hasNot: page.locator('[id^="legenda_"]') }).last();
      await page.getByLabel(/Conta o motivo/).fill('Material de tráfego pago (J63), não vai para o feed.').catch(async () => { await motivo.fill('Material de tráfego pago (J63), não vai para o feed.'); });
      await encerrar.click(); await page.waitForTimeout(4000);
    } else await page.evaluate(id => window.marcarPostagemSemAgendamento(id), POST);
    const tela = await page.evaluate(() => [...document.querySelectorAll('dialog[open],[role=alert],.toast,#toast')].map(e => e.innerText.trim()).filter(Boolean).join(' | ').slice(0, 300));
    const p = await esperar(async () => { const x = await seed.get('postagens', POST); return x && x.status !== 'aguardando_agendamento' ? x : null; });
    const v = await seed.get('videos_producao', VID);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J63-cecilia');
    const ok = semMotivo?.status === 'aguardando_agendamento' && p?.status === 'arquivada_sem_postagem' && v?.status === 'finalizado' && JSON.stringify(p?.historico || []).includes('tráfego pago') && !graves.length;
    registrar({ jornada: id, caso, ok, ms: Date.now() - t0,
      detalhe: `sem motivo: ${semMotivo?.status === 'aguardando_agendamento' ? 'recusado, continua na fila' : 'SAIU SEM MOTIVO'} · com motivo: ${p ? 'saiu da fila (' + p.status + ')' : 'NÃO saiu da fila'} · vídeo ${v?.status} · histórico ${(p?.historico || []).length ? 'com o motivo' : 'sem registro'} · diálogos: ${vistos.join(' / ') || 'nenhum'} · tela: ${tela || '-'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J63-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
