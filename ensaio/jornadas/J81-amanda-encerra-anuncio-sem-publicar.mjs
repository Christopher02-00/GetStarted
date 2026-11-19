// J81 — 19/11/2026, Amanda: "conteúdos só pra anúncio — vou em não postar, pede as informações e pede pra enviar e combinar
// com a Amanda, porém não encerra. Como sou Amanda, quando eu colocar não publicar e o motivo, o sistema poderia só validar".
// Mesmo cenário da J63 (vídeo sem ligação com o calendário, legenda pronta, fila "2 · Agendar"), agora com a Amanda.
// Esperado: com o motivo, a postagem sai da fila (arquivada_sem_postagem) e o vídeo vai para Entregas Finalizadas, sem
// abrir pedido de mudança para a própria Amanda.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J81';
export const nome = 'Amanda encerra sem publicar o vídeo só de anúncio (sem ligação), com motivo, sem pedir a si mesma';
const VID = 'j81-anuncio', POST = 'video_' + VID;
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = new Date().toISOString().slice(0, 10), link = 'https://drive.google.com/file/d/EnsaioJ81anuncio/view';
  await seed.set('videos_producao', VID, { cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Bluefit — Comparação (J81)', status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: link, calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', postagemId: POST, data: hoje, criadoEm: new Date(), excluido: false });
  await seed.set('postagens', POST, { videoId: VID, cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Bluefit — Comparação (J81)', linkVideo: link, legenda: 'Legenda escrita para o tráfego pago (J81).', legendaPor: 'Chris', legendaEm: new Date().toISOString(), status: 'aguardando_agendamento', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', demandaLegendaCriada: true, excluido: false, criadoEm: new Date() });
  await amb.aguardarFunctionsOciosas?.();
  const caso = 'Amanda tira da fila o vídeo de anúncio (sem ligação) com motivo';
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    const respostas = ['', 'Vídeo só para anúncio (J81), não vai para o feed.']; const vistos = [];
    page.on('dialog', async d => { vistos.push(d.type() + ':' + d.message().slice(0, 60)); if (d.type() === 'prompt') await d.accept(respostas.shift() ?? ''); else await d.accept(); });
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('agendar', null)); await page.waitForTimeout(4000);
    const botao = page.locator(`button[onclick*="marcarPostagemSemAgendamento('${POST}'"]`).first();
    await botao.waitFor({ timeout: 20000 });
    // 1ª tentativa sem motivo → nada muda
    await botao.click(); await page.waitForTimeout(3000);
    const abriuConteudo = await page.evaluate(() => !!document.querySelector('dialog[open]') && /Conteúdo e legenda/.test(document.querySelector('dialog[open]')?.innerText || ''));
    if (abriuConteudo) { await foto(page, 'J81-exigiu-calendario'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: 'abriu "Conteúdo e legenda" exigindo um conteúdo do calendário — o vídeo não sai da fila' }); return; }
    const semMotivo = await seed.get('postagens', POST);
    // Painel "Encerrar sem publicação" (I165): sem motivo não encerra; com motivo encerra
    const painel = page.locator('section,div').filter({ hasText: /Encerrar sem publicação/ }).last();
    const encerrar = page.getByRole('button', { name: /^Encerrar sem publicar$/ }).first();
    if (await encerrar.count()) {
      await encerrar.click(); await page.waitForTimeout(3000);
      const aposVazio = await seed.get('postagens', POST); if (aposVazio?.status !== 'aguardando_agendamento') semMotivo.status = aposVazio?.status;
      const motivo = page.locator('textarea').filter({ hasNot: page.locator('[id^="legenda_"]') }).last();
      await page.getByLabel(/Conta o motivo/).fill('Vídeo só para anúncio (J81), não vai para o feed.').catch(async () => { await motivo.fill('Vídeo só para anúncio (J81), não vai para o feed.'); });
      await encerrar.click(); await page.waitForTimeout(4000);
    } else await page.evaluate(id => window.marcarPostagemSemAgendamento(id), POST);
    const tela = await page.evaluate(() => [...document.querySelectorAll('dialog[open],[role=alert],.toast,#toast')].map(e => e.innerText.trim()).filter(Boolean).join(' | ').slice(0, 300));
    const p = await esperar(async () => { const x = await seed.get('postagens', POST); return x && x.status !== 'aguardando_agendamento' ? x : null; });
    const v = await seed.get('videos_producao', VID);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J81-cecilia');
    const ok = semMotivo?.status === 'aguardando_agendamento' && p?.status === 'arquivada_sem_postagem' && v?.status === 'finalizado' && JSON.stringify(p?.historico || []).includes('só para anúncio') && !graves.length;
    registrar({ jornada: id, caso, ok, ms: Date.now() - t0,
      detalhe: `sem motivo: ${semMotivo?.status === 'aguardando_agendamento' ? 'recusado, continua na fila' : 'SAIU SEM MOTIVO'} · com motivo: ${p ? 'saiu da fila (' + p.status + ')' : 'NÃO saiu da fila'} · vídeo ${v?.status} · histórico ${(p?.historico || []).length ? 'com o motivo' : 'sem registro'} · diálogos: ${vistos.join(' / ') || 'nenhum'} · tela: ${tela || '-'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J81-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }

  // Caso 2: o vídeo de anúncio ainda está na fila de LEGENDAS (anúncio não precisa de legenda). A Amanda usa
  // "📦 Arquivar — não vai ser postado" com o motivo → sai da fila, vídeo finalizado, sem pedido a ela mesma.
  {
    const VID2 = 'j81-anuncio-sem-legenda', POST2 = 'video_' + VID2, link2 = 'https://drive.google.com/file/d/EnsaioJ81semlegenda/view';
    await seed.set('videos_producao', VID2, { cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Bluefit — Anúncio sem legenda (J81)', status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: link2, calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', postagemId: POST2, data: hoje, criadoEm: new Date(), excluido: false });
    await seed.set('postagens', POST2, { videoId: VID2, cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Bluefit — Anúncio sem legenda (J81)', linkVideo: link2, legenda: '', status: 'aguardando_legenda', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', demandaLegendaCriada: true, excluido: false, criadoEm: new Date() });
    await amb.aguardarFunctionsOciosas?.();
    const caso2 = 'Amanda arquiva pela fila de legendas o vídeo de anúncio (sem legenda), com motivo';
    const { page, erros, fechar } = await nav.novaPagina(); const t1 = Date.now();
    try {
      const vistos = []; const toasts = [];
      page.on('dialog', async d => { vistos.push(d.type() + ':' + d.message().slice(0, 50)); if (d.type() === 'prompt') await d.accept('Vídeo só para anúncio (J81), sem legenda.'); else await d.accept(); });
      await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
      await page.evaluate(() => { const o = window.mostrarToast; window.__toastsJ81 = []; window.mostrarToast = (m, k) => { window.__toastsJ81.push(String(m)); try { o?.(m, k); } catch (e) {} }; });
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
      await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
      await page.evaluate(() => mudarEtapaLegendasI66('videos'));
      const btn = page.locator(`button[onclick*="arquivarSemLegenda('${POST2}'"]`).first();
      await btn.waitFor({ state: 'attached', timeout: 20000 }); await btn.evaluate(el => el.click()); await page.waitForTimeout(4000);
      // Se a tela abrir um painel de encerramento com motivo (sem caixinha), preenche e confirma
      const enc = page.getByRole('button', { name: /^Encerrar sem publicar$/ }).first();
      let painelTxt = '';
      if (await enc.count()) {
        painelTxt = await enc.evaluate(b => { const f = b.closest('form,section,dialog,div[class]'); return (f?.innerText || '').replace(/\s+/g, ' ').slice(0, 500) + ' ## ' + [...(f?.querySelectorAll('textarea,input,select') || [])].map(x => (x.labels?.[0]?.innerText || x.name || x.type).slice(0, 40)).join(' / ') + ' ## visivel ' + !!b.offsetParent; });
        const campoMotivo = enc.locator('xpath=ancestor::*[self::form or self::section or self::dialog][1]').locator('textarea').first();
        if (await campoMotivo.count()) await campoMotivo.fill('Vídeo só para anúncio (J81), sem legenda.');
        await enc.click(); await page.waitForTimeout(4000);
      }
      const p2 = await esperar(async () => { const x = await seed.get('postagens', POST2); return x && x.status !== 'aguardando_legenda' ? x : null; }, 15000);
      const v2 = await seed.get('videos_producao', VID2);
      const pedidos = (await seed.listar('demandas')).filter(d => d.destinatario === 'Amanda' && !d.excluido && JSON.stringify(d).includes(POST2) && /mudan|exce/i.test(d.titulo || ''));
      const t = await page.evaluate(() => (window.__toastsJ81 || []).join(' | ') + ' || ' + [...document.querySelectorAll('section,div,dialog')].filter(e => /sem publica|Encerrar/i.test(e.innerText || '') && (e.innerText || '').length < 900).map(e => e.innerText.replace(/\s+/g, ' ')).slice(-1).join('').slice(0, 400));
      const graves = erros.filter(erroGrave);
      await foto(page, 'J81-amanda-legendas');
      registrar({ jornada: id, caso: caso2, ok: p2?.status === 'arquivada_sem_postagem' && v2?.status === 'finalizado' && JSON.stringify(p2?.historico || []).includes('só para anúncio') && !pedidos.length && !graves.length, ms: Date.now() - t1,
        detalhe: `postagem ${p2?.status || 'CONTINUA aguardando_legenda'} · vídeo ${v2?.status} · motivo no histórico ${JSON.stringify(p2?.historico || []).includes('só para anúncio') ? 'sim' : 'NÃO'} · pedido à própria Amanda: ${pedidos.length} · diálogos: ${vistos.join(' / ') || 'nenhum'} · tela: ${t.slice(0, 120) || '-'}` + (graves.length ? ' | ' + graves[0].slice(0, 200) : '') });
    } catch (e) { await foto(page, 'J81-legendas-falha'); registrar({ jornada: id, caso: caso2, ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
    finally { await fechar(); }
  }
}
