// J34 — O comentário que a Amanda faz na revisão interna (origem `revisao_interna`) não aparece para o cliente.
// Usa o calendário da Bluefit que a J06 cria e libera (dezembro). Grava no calendário um comentário interno e um
// recado do cliente; o cliente abre "Sugestões e comentários" pelo link: vê o próprio recado e não vê o interno
// (nem no HTML da lista).
import { foto } from '../lib/navegador.mjs';
export const id = 'J34';
export const nome = 'Comentário interno da revisão não aparece para o cliente';
const CLIENTE = 'bluefit', MES = '2026-12';
const INTERNO = 'J34 interno: o Chris precisa refazer o gancho do reels', DO_CLIENTE = 'J34 cliente: adorei o calendário de dezembro';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const caso = 'Cliente abre os comentários do mês liberado';
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    const cal = await seed.get('calendarios', CLIENTE);
    if (!cal?.aprovacaoMeses?.[MES]) throw new Error(`depende da J06: calendário ${CLIENTE} sem ${MES}`);
    const agora = new Date().toISOString();
    const comments = [
      { id: 'revisao_j34', text: INTERNO, date: agora, por: 'Amanda', porCliente: false, origem: 'revisao_interna', mes: MES },
      { id: 'comentario_j34', text: DO_CLIENTE, date: agora, por: 'Cliente', porCliente: true, origem: 'calendario', mes: MES },
      ...(cal.comments || []),
    ];
    const { id: _ignora, ...semId } = cal;
    await seed.set('calendarios', CLIENTE, { ...semId, comments });
    page.on('dialog', d => d.accept());
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText), null, { timeout: 30000 });
    await page.waitForFunction(() => typeof openFeedback === 'function', null, { timeout: 20000 });
    await page.evaluate(() => openFeedback());
    await page.waitForFunction(t => (document.getElementById('fbList')?.innerText || '').includes(t), DO_CLIENTE, { timeout: 15000 });
    const lista = await page.evaluate(() => document.getElementById('fbList')?.innerHTML || '');
    const vazou = lista.includes(INTERNO), veOProprio = lista.includes(DO_CLIENTE);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J34-comentarios-do-cliente');
    registrar({ jornada: id, caso, ok: !vazou && veOProprio && !graves.length, ms: Date.now() - t0,
      detalhe: (vazou ? 'o comentário interno da Amanda aparece para o cliente' : 'interno escondido') + ' · ' + (veOProprio ? 'recado do cliente visível' : 'recado do cliente sumiu') + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J34-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
  finally { await fechar(); }
}
