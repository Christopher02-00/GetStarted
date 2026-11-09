// J20 — Aviso "Aprovados até agora: X de Y" conta só o mês do conteúdo aprovado (backlog Codex P16/P37).
// Usa o calendário da Bluefit que a J06 cria e libera (dezembro, 2 conteúdos) e acrescenta um conteúdo de
// novembro já aprovado. O cliente aprova um conteúdo de dezembro: o aviso para Chris/Amanda deve dizer "1 de 2"
// (o mês), não "2 de 3" (todos os meses).
import { foto } from '../lib/navegador.mjs';
export const id = 'J20';
export const nome = 'Aviso de aprovação do cliente conta só o mês do conteúdo';
const CLIENTE = 'bluefit', MES = '2026-12', TITULO1 = 'Ensaio J06 — Reels de aquecimento';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const caso = 'Cliente aprova 1 conteúdo de dezembro';
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    const cal = await seed.get('calendarios', CLIENTE);
    const dez = (cal?.items || []).filter(i => i && !i.excluido && (i.mes === MES));
    if (dez.length !== 2) throw new Error(`depende da J06: esperava 2 conteúdos de ${MES}, achei ${dez.length}`);
    cal.items.push({ itemId: 'j20-novembro', name: 'Ensaio J20 — conteúdo de novembro', mes: '2026-11', day: 3, apr: true, excluido: false });
    const { id: _ignora, ...semId } = cal;
    await seed.set('calendarios', CLIENTE, semId);
    const avisosAntes = (await seed.listar('avisos_do_cliente')).length;
    page.on('dialog', d => d.accept());
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText), null, { timeout: 30000 });
    try { await page.getByRole('button', { name: /Lista por semana/ }).click({ timeout: 5000 }); } catch {}
    const idx = cal.items.findIndex(i => i && i.name === TITULO1);
    await page.waitForFunction(() => typeof openEdit === 'function', null, { timeout: 20000 });
    await page.evaluate(i => openEdit(i), idx);
    await page.waitForSelector('#aprBtn', { state: 'visible', timeout: 15000 });
    await page.click('#aprBtn');
    const avisos = await esperar(async () => { const l = (await seed.listar('avisos_do_cliente')).filter(a => /aprovou/.test(String(a.titulo || ''))); return l.length > avisosAntes ? l : null; });
    const desc = String(avisos?.[avisos.length - 1]?.descricao || '');
    const conta = (desc.match(/Aprovados até agora: (\d+) de (\d+)/) || []).slice(1).join(' de ');
    const graves = erros.filter(erroGrave);
    await foto(page, 'J20-cliente-aprovou');
    registrar({ jornada: id, caso, ok: conta === '1 de 2' && !graves.length, ms: Date.now() - t0, detalhe: `aviso diz: ${conta || 'sem aviso'} (esperado 1 de 2)` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J20-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
  finally { await fechar(); }
}
