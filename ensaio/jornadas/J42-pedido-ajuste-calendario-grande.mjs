// J42 — Cliente pede ajuste num calendário GRANDE (urgente do Chris, 10/11/2026: Amanda não conseguia na Zeiss).
// Fixture = cópia anonimizada do calendário real da Zeiss (36 conteúdos em 3 meses, pedido antigo de agosto, retratos).
// Antes: o navegador gravava direto e as rules estouravam o limite de 1000 expressões → "Não consegui confirmar o ajuste
// no servidor". Agora o servidor (CP193) confere sessão + token do link e grava o pedido e o aviso para o Chris.
import fs from 'node:fs';
import path from 'node:path';
import { foto } from '../lib/navegador.mjs';
export const id = 'J42';
export const nome = 'Cliente pede ajuste num calendário grande (cópia anonimizada da Zeiss)';
const CLIENTE = 'zeiss', MES = '2026-11', TITULO = 'Ensaio J42 — conteúdo para ajuste', PEDIDO = 'Ensaio J42: destacar a armação dos óculos.';
const conv = v => Array.isArray(v) ? v.map(conv) : v && typeof v === 'object' ? (v.__ts !== undefined ? new Date(v.__ts * 1000) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, conv(x)]))) : v;
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const cal = conv(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'ensaio/fixtures/calendario-grande-j42.json'), 'utf8')));
  const idx = cal.items.findIndex(i => i && !i.excluido && i.mes === MES && !i.agendado && !i.posted && !i.apr);
  cal.items[idx] = { ...cal.items[idx], name: TITULO };
  const ret = cal.aprovacaoMeses?.[MES]?.retratoLiberadoV115; // o cliente vê a versão publicada do mês
  if (ret?.items) ret.items = ret.items.map(i => i?.itemId === cal.items[idx].itemId ? { ...i, name: TITULO } : i);
  await seed.set('calendarios', CLIENTE, cal);
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    page.on('dialog', d => d.accept());
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof openEdit === 'function' && document.body.innerText.length > 400, null, { timeout: 30000 });
    try { await page.getByRole('button', { name: /Lista por semana/ }).click({ timeout: 5000 }); } catch {}
    await page.getByText(/Ensaio J42 — conte/).first().click({ timeout: 15000 });
    await page.fill('#mObsCliente', PEDIDO);
    await page.click('#btnEnviarObsCliente');
    const c = await esperar(async () => { const x = await seed.get('calendarios', CLIENTE); return x?.aprovacaoMeses?.[MES]?.status === 'ajuste_interno' ? x : null; });
    const pedido = c && Object.values(c.pedidosAjusteClienteI71 || {}).find(p => p.texto === PEDIDO);
    const aviso = pedido && await seed.get('avisos_do_cliente', pedido.operationId);
    const graves = erros.filter(erroGrave).filter(e => !/Falha ao registrar o pedido de ajuste V113/.test(e) || !c);
    await foto(page, 'J42-pedido-ajuste');
    const ok = !!pedido && pedido.itemIdx === idx && aviso?.paraQuem === 'Chris' && aviso?.viraDemanda === true && !graves.length;
    registrar({ jornada: id, caso: 'Cliente envia pedido de ajuste', ok, ms: Date.now() - t0,
      detalhe: c ? `mês em ajuste · pedido no item ${pedido?.itemIdx} · aviso para ${aviso?.paraQuem || 'ninguém'}` : 'o pedido não foi gravado (recusado)' + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J42-falha'); registrar({ jornada: id, caso: 'Cliente envia pedido de ajuste', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 300) }); }
  finally { await fechar(); }
}
