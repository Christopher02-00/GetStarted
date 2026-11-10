// J36 — Postagem manual agendada (Cecília) num mês que o Chris ainda não montou: o servidor criava o item com mês e sem
// marca de aprovação, e estado() respondia 'liberado' → o editor mostrava "Liberado para o cliente" e recusava criar.
// Esperado: o mês segue em criação (igual ao escritório, estadoMesCal). Auditoria do percurso, 10/11/2026.
import path from 'node:path';
import fs from 'node:fs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J36';
export const nome = 'Postagem manual agendada antes do mês existir não deixa o mês "liberado": o Chris consegue começar a criação';

const CLIENTE = 'hitech', NOME = 'Hitech', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const MANUAL = { itemId: 'calitem_post_j36manual', mes: '2026-12', day: 3, name: 'Ensaio J36 — postagem manual agendada', desc: 'Legenda J36', ref: '', stage: 'meio', fmt: 'Reel', apr: false, posted: false, gravado: true, agendado: true, postagemId: 'j36_manual', dataPostagem: '2026-12-03', dataFlexivel: false, origemAgendamentoManualV118: true, excluido: false };
const DOC = path.join(process.cwd(), 'ensaio/.runtime/j36-hitech-dez.txt');
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

async function abrirCentral(page, viewId) {
  // P16: com a F-09 (PR #41) o primeiro clique abre a Central; insistir esconderia uma regressão da F-09.
  await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 });
  await abrirMenuSeMovel(page);
  await page.click('#navPlanejamentoPreparacaoR80');
  try { await page.waitForFunction(idv => { const v = document.getElementById(idv); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, viewId, { timeout: 15000 }); }
  catch { throw new Error('Central não abriu no primeiro clique: ' + viewId); }
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  fs.mkdirSync(path.dirname(DOC), { recursive: true });
  fs.writeFileSync(DOC, `Referências ${NOME} — dezembro 2026\n\nCampanha de Natal: vitrine de presentes.\nReferência 1: vídeo do balcão.\nOrientação: tom leve e próximo.\n`);
  // a Cecília já agendou uma postagem manual de dezembro (o servidor criou o item com mês e sem marca de aprovação)
  await seed.set('calendarios', CLIENTE, { cliente: CLIENTE, client: NOME, items: [MANUAL], updatedAt: new Date().toISOString() });
  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      if (pessoa) { await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500); }
      await acao(page);
      const res = await verificar(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J36-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J36-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 700) }); return false; }
    finally { await fechar(); }
  };
  const ciclo = async () => (await seed.listar('planejamento_social_i155')).find(c => c.id === CICLO);

  // 1. Amanda inclui o ciclo e envia o documento completo
  if (!await passo('1 Amanda inclui o ciclo e envia o documento', 'Amanda', async page => {
    await abrirCentral(page, 'view-planejamentoPreparacaoR80'); await page.waitForTimeout(3000);
    const v = page.locator('#view-planejamentoPreparacaoR80');
    const sel = v.locator('select').last();
    const opt = await sel.locator('option').filter({ hasText: new RegExp(NOME) }).first().getAttribute('value'); await sel.selectOption(opt);
    await v.getByRole('button', { name: /Abrir documentos deste cliente/ }).click();
    await v.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 10000 }); // "Confere antes de seguir": iniciar a preparação
    await page.waitForFunction(() => /No ciclo|revisão \d/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 20000 });
    await v.locator('input[type=file]').first().setInputFiles(DOC); await page.waitForTimeout(1500);
    await v.getByRole('button', { name: /^Ler documento$/ }).click();
    await page.waitForFunction(() => /Documento lido e guardado/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 20000 });
    await v.getByRole('button', { name: /^Confirmar e enviar documento$/ }).click();
    await v.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 10000 }); // conferência do texto
    await page.waitForFunction(() => !/Confira o documento:/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 30000 });
    await page.waitForTimeout(2000);
  }, () => esperar(async () => { const c = await ciclo(); return c?.incluido === true && c.documentos?.confirmacoes ? `ciclo ${CICLO} incluído · revisão ${c.revisao} · documento confirmado` : null; }, 20000))) return;

  // 2. Chris abre o editor do mês: precisa poder começar a criação (antes: "Liberado para o cliente", sem edição)
  await passo('2 Chris abre o editor do mês com postagem manual', 'Chris', async page => {
    await abrirCentral(page, 'view-estrategiaCp109');
    const v = page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
    await v.locator('select').first().selectOption({ label: NOME }); await v.locator('input[type=month]').first().fill(MES);
    await v.getByRole('button', { name: /Abrir cliente e mês/ }).click();
    await v.getByRole('button', { name: /Abrir editor oficial do mês/ }).click({ timeout: 20000 });
    await page.waitForSelector('#ed172_pecas, #planejamentoEditorI172 [data-action]', { timeout: 30000 }); await page.waitForTimeout(2500);
  }, async page => {
    const txt = await page.evaluate(() => document.getElementById('planejamentoEditorI172')?.innerText || '');
    const comecar = await page.getByRole('button', { name: /^(Começar criação|\+ Novo conteúdo)$/ }).first().isVisible().catch(() => false);
    return comecar && !/Liberado para o cliente/.test(txt) ? 'editor em criação (Começar criação disponível), mês não aparece como liberado' : null;
  });
}
