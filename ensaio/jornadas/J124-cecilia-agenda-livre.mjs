// J124 — CP269 (23/11/2026, Chris: "isso daí tem que ser livre pra ela, ela não pode se prender a uma coisa dessa, porque quem decide
// quando vai ser postado é dependendo da falta de conteúdo"; caixa de perguntas: "Livre em tudo"). A Cecília recebia "Esta data é
// diferente da combinada no calendário. Abri o pedido para a Amanda" (print da Zeiss, 23/11) há semanas. Esperado:
//  1. regra do servidor: data fixa do calendário, data de campanha e orientação da Amanda viram SUGESTÃO — agendar em outra data é
//     permitido sem exceção e devolve o que era combinado; retirar sem publicar continua com a regra de antes;
//  2. tela real: a Amanda define a orientação (data X) na ficha da postagem; a Cecília agenda em outra data (Y) e o agendamento salva
//     direto, sem pedido à Amanda; a postagem guarda "combinado X";
//  3. a Amanda abre a mesma ficha e vê "Agendada fora da data combinada … o combinado era X" (só informação, nada para aprovar).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J124';
export const nome = 'Cecília agenda em qualquer data: calendário, campanha e orientação da Amanda viram sugestão (fica registrado)';
const CLIENTE = 'hitech', MES = '2027-11', ITEM = 'calitem_j124', VID = 'j124-video', POST = 'video_' + VID, X = `${MES}-10`, Y = `${MES}-17`;
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  // 1) regra pura do servidor (as mesmas funções que o agendamento chama)
  try {
    const c = await import(pathToFileURL(path.join(RAIZ, 'functions-get/compat-legado-programacao-r83.mjs')).href);
    const d = await import(pathToFileURL(path.join(RAIZ, 'functions-get/lib/gs-diretriz-publicacao-i165.mjs')).href);
    const ref = modo => ({ programacaoCp111: { schema: 1, disponivel: true, protegida: true, modo, dataSugerida: X, horaSugerida: '10:00' }, diretriz: null });
    const r1 = c.validarProgramacaoCp111(ref('compromisso_calendario'), { acao: 'agendar', data: Y, hora: '12:00', rede: 'geral' });
    const r2 = c.validarProgramacaoCp111(ref('campanha'), { acao: 'agendar', data: Y, hora: '12:00', rede: 'geral' });
    const diretriz = { schema: 1, revisao: 1, politica: { modalidade: 'data', data: X, hora: '10:00', programarAte: `${MES}-09`, programarHora: '19:00', urgencia: 'normal', observacao: '' } };
    const r3 = d.validarOperacaoProgramacaoI165(diretriz, { acao: 'agendar', data: Y, hora: '12:00', rede: 'geral' });
    let cancelarPede = false; try { d.validarOperacaoProgramacaoI165({ ...diretriz, politica: { ...diretriz.politica } }, { acao: 'cancelar', rede: 'geral' }); } catch (e) { cancelarPede = e.code === 'i165/excecao-necessaria' || /Amanda precisa decidir/.test(e.message); }
    const ok = [r1, r2, r3].every(r => r.permitida === true && r.excecaoAplicada === false && r.foraDoCombinadoCp269?.dataCombinada === X) && r1.foraDoCombinadoCp269.modo === 'compromisso_calendario' && r2.foraDoCombinadoCp269.modo === 'campanha' && r3.foraDoCombinadoCp269.modo === 'orientacao_amanda' && cancelarPede;
    fim('1 regra: calendário, campanha e orientação da Amanda são sugestão; retirar continua como antes', ok,
      `data fixa → ${r1.permitida ? 'permitido' : 'RECUSADO'} · campanha → ${r2.permitida ? 'permitido' : 'RECUSADO'} · orientação → ${r3.permitida ? 'permitido' : 'RECUSADO'} · combinado guardado ${[r1, r2, r3].every(r => r.foraDoCombinadoCp269?.dataCombinada === X) ? 'sim' : 'NÃO'} · retirar sem exceção ${cancelarPede ? 'continua pedindo a Amanda' : 'MUDOU'}`);
  } catch (e) { fim('1 regra do servidor', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }

  // seed: conteúdo de data flexível + vídeo aprovado + postagem esperando agendamento (como a J88)
  const cal0 = (await seed.get('calendarios', CLIENTE)) || {}; const { id: _x, ...semId } = cal0;
  const item = { itemId: ITEM, mes: MES, day: 10, dataPostagem: X, dataFlexivel: true, name: 'Hitech — Orientação J124', desc: 'Roteiro J124.', legenda: 'Legenda J124.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true };
  await seed.set('calendarios', CLIENTE, { cliente: CLIENTE, client: 'Hitech', ...semId, items: [...(cal0.items || []).filter(i => i?.itemId !== ITEM), item] });
  const link = 'https://drive.google.com/file/d/EnsaioJ124/view', agora = new Date();
  await seed.set('videos_producao', VID, { cliente: CLIENTE, clienteNome: 'Hitech', titulo: 'Hitech — Orientação J124', status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: link,
    calendarItemId: ITEM, calendarClienteSlug: CLIENTE, calendarCompetencia: MES, postagemId: POST, data: agora.toISOString().slice(0, 10), criadoEm: agora, excluido: false });
  await seed.set('postagens', POST, { videoId: VID, cliente: CLIENTE, clienteNome: 'Hitech', titulo: 'Hitech — Orientação J124', linkVideo: link, legenda: 'Legenda pronta J124.', legendaPor: 'Chris', legendaEm: agora.toISOString(),
    status: 'aguardando_agendamento', calendarItemId: ITEM, calendarClienteSlug: CLIENTE, calendarCompetencia: MES, demandaLegendaCriada: true, excluido: false, criadoEm: agora });
  await amb.aguardarFunctionsOciosas?.();
  const abrirFicha = async page => { await page.waitForFunction(() => typeof window.abrirPostagemDeAtraso === 'function', null, { timeout: 30000 }); await page.evaluate(p => window.abrirPostagemDeAtraso(p), POST); await page.waitForSelector('#modalConteudo [data-ficha165]', { timeout: 30000 }); };

  // 2a) Amanda define a orientação (data X) pela ficha da postagem
  let orientou = false;
  { const { page, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept()); await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500); await abrirFicha(page);
      await page.locator('#modalConteudo [data-ficha165="adotar"]').first().click();
      const form = page.locator('#modalConteudo [id^="postagemOperacionalI165_adotar_diretriz_"]').first(); await form.waitFor({ timeout: 30000 });
      await page.waitForFunction(() => !!document.querySelector('#modalConteudo [data-post165-campo="modalidade"]') && !document.querySelector('#modalConteudo [data-post165-campo="modalidade"]').disabled, null, { timeout: 30000 });
      await form.locator('[data-post165-campo="modalidade"]').selectOption('data'); await page.waitForTimeout(500);
      await form.locator('[data-post165-campo="data"]').fill(X); await form.locator('[data-post165-campo="hora"]').fill('10:00');
      await form.locator('[data-post165-campo="programarAte"]').fill(`${MES}-09`); await form.locator('[data-post165-campo="programarHora"]').fill('19:00');
      await form.locator('[data-post165-acao="confirmar"]').first().click();
      orientou = !!await esperar(async () => (await seed.get('video_programacao_i165', VID)) || (await seed.get('post_programacao_i165', POST)), 30000);
      await foto(page, 'J124-amanda-orienta');
    } catch (e) { await foto(page, 'J124-falha-amanda').catch(() => {}); fim('2 Amanda define a orientação', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
    finally { await fechar(); } }

  // 2b) Cecília agenda em outra data (Y): salva direto, sem pedido à Amanda
  if (orientou) { const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept()); await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
      await page.evaluate(() => { const o = window.mostrarToast; window.__toastsJ124 = []; window.mostrarToast = (m, k) => { window.__toastsJ124.push(String(m)); try { o?.(m, k); } catch (e) {} }; });
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
      await page.waitForSelector(`#dataPost_${POST}`, { timeout: 20000 }); await page.fill(`#dataPost_${POST}`, Y); await page.fill(`#horaPost_${POST}`, '12:00');
      await page.evaluate(p => window.salvarAgendamentoPostagem(p), POST);
      const check = page.getByText(/Conferi a (origem, a data e o horário|data ou semana)/).first(); await check.waitFor({ timeout: 20000 }); await check.click();
      await page.getByRole('button', { name: /^Salvar agendamento$/ }).click({ timeout: 10000 });
      const p1 = await esperar(async () => { const x = await seed.get('postagens', POST); return x?.status === 'agendado' ? x : null; }, 30000) || await seed.get('postagens', POST);
      await page.waitForTimeout(1500);
      const pedido = await page.evaluate(() => [...document.querySelectorAll('h2,h3,h4')].some(x => /Pedir uma mudança para a Amanda/.test(x.textContent) && x.offsetParent));
      const reg = p1?.agendamentoForaDoCombinadoCp269, graves = erros.filter(erroGrave);
      await foto(page, 'J124-cecilia-agenda');
      fim('2 Cecília agenda fora da orientação da Amanda: salva direto, sem pedido, e guarda o combinado', p1?.status === 'agendado' && p1.dataAgendada === Y && !pedido && reg?.modo === 'orientacao_amanda' && reg.dataCombinada === X && reg.data === Y && !graves.length,
        `postagem ${p1?.status} ${p1?.dataAgendada || ''} · pedido à Amanda ${pedido ? 'ABERTO' : 'não abriu'} · registro ${reg ? reg.modo + ': combinado ' + reg.dataCombinada + ' → ' + reg.data : 'AUSENTE'} · tela: ${(await page.evaluate(() => (window.__toastsJ124 || []).join(' | '))).slice(0, 140)}`);
    } catch (e) { await foto(page, 'J124-falha-cecilia').catch(() => {}); fim('2 Cecília agenda', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
    finally { await fechar(); } }
  else fim('2 Cecília agenda fora da orientação da Amanda', false, 'a orientação da Amanda não foi gravada');

  // 3) Amanda vê o registro na ficha (sem nada para aprovar)
  { const { page, erros, fechar } = await nav.novaPagina();
    try {
      await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500); await abrirFicha(page);
      const txt = await esperar(async () => { const t = await page.locator('#modalConteudo [data-fora-combinado-cp269]').innerText().catch(() => ''); return t || null; }, 20000) || '';
      await foto(page, 'J124-amanda-ve');
      fim('3 Amanda vê "Agendada fora da data combinada" na ficha', /Agendada fora da data combinada/.test(txt) && txt.includes('17/11/2027') && txt.includes('10/11/2027') && !erros.filter(erroGrave).length, txt.replace(/\s+/g, ' ').slice(0, 220) || 'registro NÃO mostrado');
    } catch (e) { await foto(page, 'J124-falha-ficha').catch(() => {}); fim('3 ficha da Amanda', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
    finally { await fechar(); } }
  const x = await seed.get('postagens', POST); if (x) { const { id: _i, ...dd } = x; await seed.set('postagens', POST, { ...dd, excluido: true }); }
}
