// J28 — Item de calendário criado a partir de postagem/vídeo manual sempre grava itemId (pedido de 09/11/2026).
// Origem dos 3 itens sem ID em produção: a sincronizarItemDoCalendario anterior à V101 (aposentada). Hoje o agendamento
// manual passa pelo servidor (programar.mjs). Esperado: postagem manual sem item → item novo com itemId calitem_post_*;
// postagem manual com item antigo sem itemId → o agendamento completa o itemId, sem duplicar o item.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J28';
export const nome = 'Agendar postagem manual grava itemId no calendário (novo e legado)';
const CLIENTE = 'zeiss';
const hojeISO = () => { const d = new Date(Date.now() - 3 * 3600000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const POSTS = [
  { id: 'j28_novo', titulo: 'Ensaio J28 — manual sem item' },
  { id: 'j28_legado', titulo: 'Ensaio J28 — manual com item antigo' },
];
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  for (const p of POSTS) await seed.set('postagens', p.id, { cliente: CLIENTE, clienteNome: 'Zeiss', titulo: p.titulo, legenda: 'Legenda do ensaio J28', status: 'aguardando_agendamento', origemManual: true, excluido: false, criadoEm: new Date().toISOString() });
  await seed.set('calendarios', CLIENTE, { cliente: CLIENTE, client: 'Zeiss', items: [
    { mes: hojeISO().slice(0, 7), day: 1, name: POSTS[1].titulo, desc: '', ref: '', stage: 'meio', fmt: 'Reel', apr: false, posted: false, gravado: true, agendado: false, postagemId: POSTS[1].id, dataFlexivel: false, dataPostagem: '' },
  ], updatedAt: new Date().toISOString() });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
    for (const p of POSTS) {
      await page.waitForSelector(`#dataPost_${p.id}`, { timeout: 15000 });
      await page.fill(`#dataPost_${p.id}`, hojeISO()); await page.fill(`#horaPost_${p.id}`, '23:50');
      await page.evaluate(id => window.salvarAgendamentoPostagem(id), p.id);
      const check = page.getByText(/Conferi a origem, a data e o horário/).first(); await check.waitFor({ timeout: 15000 }); await check.click();
      await page.getByRole('button', { name: /^Salvar agendamento$/ }).click({ timeout: 10000 });
      await esperar(async () => (await seed.get('postagens', p.id))?.status === 'agendado');
      await page.waitForTimeout(1500);
    }
    const cal = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return (c?.items || []).filter(i => POSTS.some(p => p.id === i.postagemId && i.agendado)).length === 2 ? c : null; });
    const itens = (cal?.items || []);
    const doNovo = itens.filter(i => i.postagemId === POSTS[0].id), doLegado = itens.filter(i => i.postagemId === POSTS[1].id);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J28-cecilia');
    const ok = doNovo.length === 1 && /^calitem_post_/.test(doNovo[0].itemId || '') && doLegado.length === 1 && !!doLegado[0].itemId && itens.every(i => i.itemId) && !graves.length;
    registrar({ jornada: id, caso: 'Cecília agenda 2 postagens manuais', ok, ms: Date.now() - t0,
      detalhe: `novo: ${doNovo.map(i => i.itemId || 'SEM itemId').join(',') || 'ausente'} · legado: ${doLegado.map(i => i.itemId || 'SEM itemId').join(',') || 'ausente'} (${doLegado.length} item) · total ${itens.length}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J28-falha'); registrar({ jornada: id, caso: 'Cecília agenda 2 postagens manuais', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
  finally { await fechar(); }
}
