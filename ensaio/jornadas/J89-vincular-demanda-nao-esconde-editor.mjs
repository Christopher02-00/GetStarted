// J89 — CP236 (19/11/2026, Clínica dos Olhos Hauer 2026-12): em Planejamento e roteiros, "Vincular uma demanda já recebida, sem
// duplicar" grava um plano só com o vínculo (demandaChrisId, sem itens) e o botão "Abrir editor oficial do mês" sumia — o mês
// sem conteúdos ficava sem caminho para o editor (contornado pela Central: "Registrar base e iniciar criação").
// Esperado: depois de vincular, o mês sem conteúdos continua com "Abrir editor oficial do mês", e o botão abre o editor.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J89';
export const nome = 'Vincular a demanda do Chris em Planejamento e roteiros não esconde "Abrir editor oficial do mês"';
const CLIENTE = 'hitech', MES = '2027-10', CICLO = `${MES}__${CLIENTE}`, DEM = 'j89-demanda-chris';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('demandas', DEM, { titulo: 'Hitech outubro/2027: montar o calendário (J89)', descricao: 'Ensaio J89', destinatario: 'Chris', remetente: 'Amanda', cliente: CLIENTE, clienteSlug: CLIENTE, clienteNome: 'Hitech',
    competencia: MES, status: 'pendente', prazoData: '2027-09-20', prazoHora: '18:00', criadoEm: new Date().toISOString(), excluido: false });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(), caso = 'Chris vincula a demanda e o mês sem conteúdos continua com "Abrir editor oficial do mês"';
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
    await page.evaluate(([cliente, competencia, ciclo]) => window.abrirEtapaCp109('estrategia', { cliente, competencia, ciclo }), [CLIENTE, MES, CICLO]);
    const botaoEditor = () => page.evaluate(() => { const b = [...document.querySelectorAll('[data-action="editorDoMes"]')].find(x => x.offsetParent || x.closest('section')); return b ? { ok: true, off: b.disabled } : null; });
    const antes = await esperar(botaoEditor, 25000);
    const sel = page.locator('[data-demanda-existente]').first(); await sel.waitFor({ state: 'attached', timeout: 20000 });
    await sel.evaluate((el, v) => { if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === v)) { const o = document.createElement('option'); o.value = v; o.textContent = v; el.append(o); } el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('input', { bubbles: true })); }, DEM);
    await page.locator('[data-confirmar-demanda]').first().evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.locator('[data-action="adotar"]').first().evaluate(el => el.click());
    const vinculou = await esperar(async () => (await seed.get('demandas', DEM))?.planejamentoCp109?.ciclo === CICLO || !!(await seed.get('planejamento_estrategico_cp109', CICLO))?.demandaChrisId, 20000);
    await page.waitForTimeout(2500);
    const depois = await botaoEditor();
    let abriu = false;
    if (depois && !depois.off) { await page.locator('[data-action="editorDoMes"]').first().evaluate(el => el.click());
      abriu = !!(await page.waitForSelector('#planejamentoEditorI172', { state: 'attached', timeout: 30000 }).then(() => true).catch(() => false)); }
    const graves = erros.filter(erroGrave);
    await foto(page, 'J89-chris-depois-de-vincular');
    registrar({ jornada: id, caso, ok: !!vinculou && !!depois && !depois.off && abriu && !graves.length, ms: Date.now() - t0,
      detalhe: `antes: botão ${antes ? 'sim' : 'NÃO'} · vínculo ${vinculou ? 'gravado' : 'NÃO gravado'} · depois: botão ${depois ? (depois.off ? 'desligado' : 'sim') : 'SUMIU'} · editor ${abriu ? 'abriu' : 'NÃO abriu'}` + (graves.length ? ' | ' + graves[0].slice(0, 200) : '') });
  } catch (e) { await foto(page, 'J89-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
