// J121 — CP266 + CP235 (23/11/2026). No agendamento em lote da Cecília, uma postagem cujo conteúdo do calendário tem data específica e
// recebe outra data é decisão da Amanda (CP235, J88). Esperado: o lote salva a anterior (data livre), PARA na de data marcada sem
// agendá-la, abre na postagem o "Pedir uma mudança para a Amanda" com a data e o horário escolhidos e diz no resumo onde parou.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J121';
export const nome = 'Agendamento em lote: a postagem com data marcada no calendário para o lote e abre o pedido à Amanda';
const CLIENTE = 'hitech', MES = '2027-10';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const CASOS = [
  { item: 'calitem_j121_livre', vid: 'j121-livre', nome: 'Hitech — Data livre (J121)', flex: true, dia: 14, quero: `${MES}-14`, criado: Date.now() - 3 * 864e5 },
  { item: 'calitem_j121_marcada', vid: 'j121-marcada', nome: 'Hitech — Data marcada (J121)', flex: false, dia: 20, quero: `${MES}-23`, criado: Date.now() - 2 * 864e5 }
];

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const cal0 = (await seed.get('calendarios', CLIENTE)) || {}; const { id: _x, ...semId } = cal0;
  const itens = CASOS.map(c => ({ itemId: c.item, mes: MES, day: c.dia, dataPostagem: `${MES}-${c.dia}`, dataFlexivel: c.flex, name: c.nome, desc: 'Roteiro J121.', legenda: 'Legenda J121.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true }));
  await seed.set('calendarios', CLIENTE, { cliente: CLIENTE, client: 'Hitech', ...semId, items: [...(cal0.items || []).filter(i => !CASOS.some(c => c.item === i?.itemId)), ...itens] });
  for (const c of CASOS) {
    const link = 'https://drive.google.com/file/d/Ensaio' + c.vid + '/view', post = 'video_' + c.vid, quando = new Date(c.criado);
    await seed.set('videos_producao', c.vid, { cliente: CLIENTE, clienteNome: 'Hitech', titulo: c.nome, status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: link,
      calendarItemId: c.item, calendarClienteSlug: CLIENTE, calendarCompetencia: MES, postagemId: post, data: quando.toISOString().slice(0, 10), criadoEm: quando, excluido: false });
    await seed.set('postagens', post, { videoId: c.vid, cliente: CLIENTE, clienteNome: 'Hitech', titulo: c.nome, linkVideo: link, legenda: 'Legenda pronta J121.', legendaPor: 'Chris', legendaEm: quando.toISOString(),
      status: 'aguardando_agendamento', calendarItemId: c.item, calendarClienteSlug: CLIENTE, calendarCompetencia: MES, demandaLegendaCriada: true, excluido: false, criadoEm: quando });
  }
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
    for (const c of CASOS) { await page.waitForSelector(`#dataPost_video_${c.vid}`, { timeout: 20000 }); await page.fill(`#dataPost_video_${c.vid}`, c.quero); await page.fill(`#horaPost_video_${c.vid}`, '12:00'); }
    await page.locator('[data-lote-agendar-cp266]').first().click({ timeout: 20000 });
    const painel = page.locator('[data-lote-painel-cp266]');
    await page.waitForFunction(() => /Salvar os agendamentos marcados|Nenhuma postagem está pronta/.test(document.querySelector('[data-lote-painel-cp266]')?.innerText || ''), null, { timeout: 90000 });
    const noPainel = await painel.locator('[data-lote-item-cp266]').evaluateAll(els => els.map(e => e.dataset.loteItemCp266));
    // só as duas do ensaio ficam marcadas (a Cecília pode tirar do lote o que não quer agendar agora)
    for (const el of await painel.locator('[data-lote-item-cp266]').all()) { if (!/j121/.test(await el.getAttribute('data-lote-item-cp266'))) await el.locator('[data-lote-incluir-cp266]').uncheck(); }
    await painel.locator('[data-lote-ack-cp266]').check(); await painel.locator('[data-lote-confirmar-cp266]').click();
    await page.waitForFunction(() => /agendamento\(s\) salvo\(s\)\. Parei em|agendamentos salvos de uma vez/.test(document.querySelector('[data-lote-painel-cp266]')?.innerText || ''), null, { timeout: 90000 }).catch(() => {});
    const resumo = await page.evaluate(() => (document.querySelector('[data-lote-painel-cp266]')?.innerText.match(/\d+ (agendamento\(s\) salvo\(s\)\. Parei em[^\n]*|agendamentos salvos de uma vez\.)/) || [''])[0]);
    await foto(page, 'J121-painel');
    await page.evaluate(() => window.fecharModal?.());
    const pedido = await esperar(async () => page.evaluate(() => { const h = [...document.querySelectorAll('h2,h3,h4')].find(x => /Pedir uma mudança para a Amanda/.test(x.textContent) && x.offsetParent);
      if (!h) return null; let box = h.parentElement; while (box && !box.querySelector('input[type=date]')) box = box.parentElement;
      return { datas: [...(box?.querySelectorAll('input[type=date]') || [])].map(i => i.value), horas: [...(box?.querySelectorAll('input[type=time]') || [])].map(i => i.value), card: box?.closest('[data-postagem-i165]')?.dataset.postagemI165 || '' }; }), 20000);
    await foto(page, 'J121-pedido');
    const livre = await seed.get('postagens', 'video_j121-livre'), marcada = await seed.get('postagens', 'video_j121-marcada');
    const graves = erros.filter(erroGrave);
    fim('1 o lote salva a de data livre e para na de data marcada, sem agendá-la', noPainel.includes('video_j121-livre') && noPainel.includes('video_j121-marcada') && livre?.status === 'agendado' && livre?.dataAgendada === `${MES}-14`
      && marcada?.status === 'aguardando_agendamento' && /Parei em .*Data marcada \(J121\).*pedido para a Amanda/.test(resumo),
      `no painel: ${noPainel.filter(x => /j121/.test(x)).length} do ensaio · livre → ${livre?.status} ${livre?.dataAgendada || ''} · marcada → ${marcada?.status} · resumo: “${resumo.slice(0, 220)}”`);
    fim('2 abre na postagem o pedido à Amanda com a data e o horário escolhidos', !!pedido && pedido.datas.includes(`${MES}-23`) && pedido.horas.includes('12:00') && !graves.length,
      pedido ? `pedido aberto (cartão ${pedido.card || '?'}) · ${pedido.datas.join('/')} ${pedido.horas.join('/')}` : 'pedido NÃO aberto' + (graves.length ? ' · ' + graves[0].slice(0, 200) : ''));
  } catch (e) { await foto(page, 'J121-falha').catch(() => {}); fim('lote com data marcada', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { await fechar(); }
  for (const c of CASOS) { const x = await seed.get('postagens', 'video_' + c.vid); if (x) { const { id: _i, ...d } = x; await seed.set('postagens', 'video_' + c.vid, { ...d, excluido: true }); } }
}
