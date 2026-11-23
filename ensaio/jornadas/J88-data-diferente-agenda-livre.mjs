// J88 — CP235 (19/11/2026, Cecília, Zeiss; decisão do Chris "Pedido à Amanda"): o conteúdo do calendário tem data específica e a
// Cecília agenda em outra data (o 12/11 já tinha passado; ela agendou 19/11 no Instagram). A tela recusava com "A Amanda precisa
// decidir esta mudança. Nada mudou nesta postagem" e não oferecia saída: a postagem ficava parada.
// CP269 (23/11/2026, Chris: "isso daí tem que ser livre pra ela"; caixa: "Livre em tudo") revogou a CP235: a data do calendário é
// sugestão. Esperado agora: a Cecília agenda em outra data e o agendamento SALVA direto (sem pedido à Amanda); a postagem guarda o
// que era combinado (agendamentoForaDoCombinadoCp269) e a tela não abre "Pedir uma mudança para a Amanda".
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J88';
export const nome = 'Agendar em data diferente da do calendário: salva direto e guarda o que era combinado (CP269)';
const CLIENTE = 'hitech', MES = '2027-09', ITEM = 'calitem_j88_data', VID = 'j88-video', POST = 'video_' + VID;
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const cal0 = (await seed.get('calendarios', CLIENTE)) || {}; const { id: _x, ...semId } = cal0;
  const item = { itemId: ITEM, mes: MES, day: 20, dataPostagem: `${MES}-20`, dataFlexivel: false, name: 'Hitech — Data marcada (J88)', desc: 'Roteiro J88.', legenda: 'Legenda J88.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true };
  await seed.set('calendarios', CLIENTE, { cliente: CLIENTE, client: 'Hitech', ...semId, items: [...(cal0.items || []).filter(i => i?.itemId !== ITEM), item] });
  const link = 'https://drive.google.com/file/d/EnsaioJ88/view', agora = new Date();
  await seed.set('videos_producao', VID, { cliente: CLIENTE, clienteNome: 'Hitech', titulo: 'Hitech — Data marcada (J88)', status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: link,
    calendarItemId: ITEM, calendarClienteSlug: CLIENTE, calendarCompetencia: MES, postagemId: POST, data: agora.toISOString().slice(0, 10), criadoEm: agora, excluido: false });
  await seed.set('postagens', POST, { videoId: VID, cliente: CLIENTE, clienteNome: 'Hitech', titulo: 'Hitech — Data marcada (J88)', linkVideo: link, legenda: 'Legenda pronta J88.', legendaPor: 'Chris', legendaEm: agora.toISOString(),
    status: 'aguardando_agendamento', calendarItemId: ITEM, calendarClienteSlug: CLIENTE, calendarCompetencia: MES, demandaLegendaCriada: true, excluido: false, criadoEm: agora });
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(), caso = 'Cecília agenda em outra data: salva direto, sem pedido à Amanda, e guarda o que era combinado';
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    await page.evaluate(() => { const o = window.mostrarToast; window.__toastsJ88 = []; window.mostrarToast = (m, k) => { window.__toastsJ88.push(String(m)); try { o?.(m, k); } catch (e) {} }; });
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
    await page.waitForSelector(`#dataPost_${POST}`, { timeout: 20000 });
    await page.fill(`#dataPost_${POST}`, `${MES}-23`); await page.fill(`#horaPost_${POST}`, '12:00');
    await page.evaluate(p => window.salvarAgendamentoPostagem(p), POST);
    const check = page.getByText(/Conferi a origem, a data e o horário/).first();
    if (await check.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)) { await check.click(); await page.getByRole('button', { name: /^Salvar agendamento$/ }).click({ timeout: 10000 }); }
    const p1 = await esperar(async () => { const x = await seed.get('postagens', POST); return x?.status === 'agendado' ? x : null; }, 30000) || await seed.get('postagens', POST);
    await page.waitForTimeout(1500);
    const pedidoAberto = await page.evaluate(() => [...document.querySelectorAll('h2,h3,h4')].some(x => /Pedir uma mudança para a Amanda/.test(x.textContent) && x.offsetParent));
    const toasts = await page.evaluate(() => (window.__toastsJ88 || []).join(' | '));
    const graves = erros.filter(erroGrave), reg = p1?.agendamentoForaDoCombinadoCp269;
    await foto(page, 'J88-cecilia-agenda-livre');
    registrar({ jornada: id, caso, ok: p1?.status === 'agendado' && p1.dataAgendada === `${MES}-23` && p1.horaAgendada === '12:00' && !pedidoAberto && reg?.modo === 'compromisso_calendario' && reg.dataCombinada === `${MES}-20` && reg.data === `${MES}-23` && reg.por === 'Cecília' && !graves.length, ms: Date.now() - t0,
      detalhe: `postagem ${p1?.status} ${p1?.dataAgendada || ''} ${p1?.horaAgendada || ''} · pedido à Amanda ${pedidoAberto ? 'ABERTO' : 'não abriu'} · registro ${reg ? reg.modo + ': combinado ' + reg.dataCombinada + ' → agendado ' + reg.data + ' por ' + reg.por : 'AUSENTE'} · tela: ${toasts.slice(0, 160)}` + (graves.length ? ' | ' + graves[0].slice(0, 200) : '') });
  } catch (e) { await foto(page, 'J88-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
