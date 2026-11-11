// J48 — Pedido de legenda pelo Portal vira a legenda do conteúdo (CP197, decisão do Chris 10/11/2026).
// O cliente pede pelo Portal ("Legenda de publicação") → o pedido chega ao Chris em Minhas Demandas → o Chris entrega o
// texto e escolhe o conteúdo ("Este texto é a legenda nova de qual conteúdo?") → a legenda do item no calendário é trocada
// e (CP190) a postagem ainda não agendada recebe o texto. Antes: a demanda fechava e a postagem continuava com a antiga.
import crypto from 'node:crypto';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J48';
export const nome = 'Pedido de legenda pelo Portal: o Chris entrega escolhendo o conteúdo e a postagem recebe a legenda';
const CLIENTE = 'mochi', ITEM = 'calitem_j48_legenda', POST = 'j48_post_legenda';
const VELHA = 'Legenda antiga J48 do mochi de morango', NOVA = 'Legenda nova J48 — o mochi de morango voltou, só esta semana!';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const mes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7);
  const cal = await seed.get('calendarios', CLIENTE) || { cliente: CLIENTE, client: 'Mochi', items: [] };
  const { id: _x, ...semId } = cal;
  await seed.set('postagens', POST, { cliente: CLIENTE, clienteNome: 'Mochi', titulo: 'Ensaio J48 — mochi de morango', legenda: VELHA, status: 'aguardando_agendamento', origemManual: true, excluido: false, criadoEm: new Date().toISOString() });
  await seed.set('calendarios', CLIENTE, { ...semId, items: [...(semId.items || []).filter(i => i?.itemId !== ITEM), { itemId: ITEM, mes, day: 27, name: 'Ensaio J48 — mochi de morango', desc: 'Roteiro', legenda: VELHA, fmt: 'Reel', postagemId: POST, excluido: false }] });
  await amb.aguardarFunctionsOciosas?.();
  const t0 = Date.now();
  // 1) cliente pede pelo Portal
  const p1 = await nav.novaPagina();
  try {
    p1.page.on('dialog', d => d.accept());
    await p1.page.goto(amb.url('portal-cliente.html', `&c=${CLIENTE}&t=tok-${CLIENTE}`), { waitUntil: 'domcontentloaded' });
    await p1.page.waitForSelector('[data-tab="demandas"]', { state: 'attached', timeout: 30000 }); await p1.page.waitForTimeout(2000);
    await p1.page.evaluate(() => setTab('demandas', document.querySelector('[data-tab="demandas"]')));
    await p1.page.waitForSelector('#novaDemandaDestino', { state: 'visible', timeout: 20000 });
    await p1.page.selectOption('#novaDemandaDestino', 'pedido_legenda');
    await p1.page.fill('#novaDemandaTexto', 'Troquem a legenda do mochi de morango, por favor: ' + NOVA);
    await p1.page.evaluate(() => window.enviarDemandaCliente());
  } finally { await p1.fechar(); }
  const aviso = await esperar(async () => (await seed.listar('avisos_do_cliente')).find(a => a.cliente === CLIENTE && a.tipo === 'pedido_legenda' && /mochi de morango/.test(a.descricao || '')));
  if (!aviso) { registrar({ jornada: id, caso: 'cliente pede pelo Portal', ok: false, ms: Date.now() - t0, detalhe: 'o pedido do Portal não chegou' }); return; }
  const demandaId = 'entrada_i54_' + crypto.createHash('sha256').update(JSON.stringify(['avisos_do_cliente', aviso.id])).digest('hex');
  // 2) Chris recebe, entrega o texto e escolhe o conteúdo
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
    await page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas')));
    await page.waitForSelector('#atualizarPedidosClienteI55', { timeout: 20000 });
    await page.evaluate(() => window.atualizarPedidosClienteI55());
    const dem = await esperar(async () => seed.get('demandas', demandaId));
    if (!dem) throw new Error('a demanda do pedido não nasceu');
    await page.waitForTimeout(2500);
    await page.evaluate(i => window.abrirDemandaMinha(i), demandaId);
    await page.waitForSelector('#provaTextoInput', { timeout: 15000 });
    await page.fill('#provaTextoInput', NOVA);
    await page.waitForFunction(v => [...(document.getElementById('aplicarLegendaCp197')?.options || [])].some(o => o.value.endsWith('|' + v)), ITEM, { timeout: 15000 });
    await page.selectOption('#aplicarLegendaCp197', mes + '|' + ITEM);
    await page.click('#btnEnviarProva');
    const post = await esperar(async () => { const p = await seed.get('postagens', POST); return p?.legenda === NOVA ? p : null; });
    const it = ((await seed.get('calendarios', CLIENTE))?.items || []).find(i => i?.itemId === ITEM);
    const d2 = await seed.get('demandas', demandaId);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J48-chris-entrega');
    registrar({ jornada: id, caso: 'Chris entrega a legenda escolhendo o conteúdo', ok: !!post && it?.legenda === NOVA && d2?.status === 'aprovada' && !graves.length, ms: Date.now() - t0,
      detalhe: `demanda ${d2?.status} · calendário ${it?.legenda === NOVA ? 'com a legenda nova' : 'com a antiga'} · postagem ${post ? 'recebeu a legenda nova' : 'continua com a antiga'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J48-falha'); registrar({ jornada: id, caso: 'Chris entrega a legenda escolhendo o conteúdo', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 300) }); }
  finally { await fechar(); }
}
