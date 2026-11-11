// J53 — Devolução da Amanda com a rodada nova já iniciada (CP196, caso Little Elephant 2026-12; pendência de 10/11/2026).
// Continua a J52 (Zeiss, dezembro em ajuste): Chris reenvia (base A) → Amanda envia documento novo (base B) →
// Chris confirma a nova base → Amanda devolve. Antes: a devolução nunca confirmava e o mês ficava travado.
// cria conteúdos e envia para revisão → Amanda conclui a revisão (libera) → cliente lê pelo link → Luís vê em modo gravação.
// O servidor exige a ordem (central/preparacao); cada etapa é confirmada pelas Cloud Functions reais no emulador.
import path from 'node:path';
import fs from 'node:fs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J53';
export const nome = 'Devolução da Amanda vale quando o Chris já começou a rodada com a base nova (caso Little Elephant)';

const CLIENTE = 'zeiss', NOME = 'Zeiss', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const TITULO1 = 'Ensaio J52 — Lente nova na vitrine', TITULO2 = 'Ensaio J52 — Antes e depois do óculos';
const DOC = path.join(process.cwd(), 'ensaio/.runtime/j53-zeiss-dez-v2.txt');
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

// ACHADO F-09: enquanto a Central ainda carrega, o clique em "Calendários e conteúdos" é ignorado em silêncio → repete até a view abrir
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
  fs.writeFileSync(DOC, `Referências ${NOME} — dezembro 2026 (versão 2)\n\nCampanha de Natal: vitrine com a lente nova e a armação do mês.\nReferência 1: antes e depois da troca de lente.\nOrientação: tom próximo e direto.\n`);
  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      if (pessoa) { await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500); }
      await acao(page);
      const res = await verificar(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J53-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J53-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 700) }); return false; }
    finally { await fechar(); }
  };
  const ciclo = async () => (await seed.listar('planejamento_social_i155')).find(c => c.id === CICLO);
  const calendario = async () => (await seed.listar('calendarios')).find(c => c.id === CLIENTE);
  const c0 = await ciclo(), cal0 = await calendario();
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'ajuste_interno') { registrar({ jornada: id, caso: 'preparação', ok: false, ms: 0, detalhe: 'depende da J52 (dezembro da Zeiss em ajuste)' }); return; }
  const materiais = async page => {
    await abrirCentral(page, 'view-estrategiaCp109');
    const v = page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
    await v.locator('select').first().selectOption({ label: NOME }); await v.locator('input[type=month]').first().fill(MES);
    await v.getByRole('button', { name: /Abrir cliente e mês/ }).click();
    await page.getByRole('button', { name: /^Abrir materiais do mês$/ }).click({ timeout: 20000 }); await page.waitForTimeout(3000);
    const aba = page.getByRole('button', { name: /^Criar e aprovar$/ }).first(); if (await aba.isVisible().catch(() => false)) { await aba.click(); await page.waitForTimeout(2500); }
  };

  // 1. Chris reenvia o mês para a Amanda revisar (base A)
  if (!await passo('1 Chris reenvia para revisão', 'Chris', async page => {
    await materiais(page);
    const ed = page.getByRole('button', { name: /^Abrir editor oficial nesta competência$/ }).first(); await ed.evaluate(el => el.scrollIntoView({ block: 'center' })); await ed.click();
    await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 }); await page.waitForTimeout(1500);
    const env = page.getByRole('button', { name: /^Enviar para a Amanda revisar$/ }).first(); await env.evaluate(el => el.scrollIntoView({ block: 'center' })); await env.click();
    try { await page.getByRole('button', { name: /^Confirmar (esta ação|envio|e enviar)/ }).click({ timeout: 6000 }); } catch {}
    await page.waitForTimeout(6000);
  }, () => esperar(async () => (await calendario())?.aprovacaoMeses?.[MES]?.status === 'aguardando_interna' ? 'dezembro com a Amanda (base A)' : null, 25000))) return;

  // 2. Amanda manda o documento novo (base B) enquanto o mês está com ela
  if (!await passo('2 Amanda envia o documento novo', 'Amanda', async page => {
    await abrirCentral(page, 'view-planejamentoPreparacaoR80'); await page.waitForTimeout(3000);
    const v = page.locator('#view-planejamentoPreparacaoR80');
    const sel = v.locator('select').last();
    const opt = await sel.locator('option').filter({ hasText: new RegExp(NOME) }).first().getAttribute('value'); await sel.selectOption(opt);
    await v.getByRole('button', { name: /Abrir documentos deste cliente/ }).click(); await page.waitForTimeout(2500);
    await v.locator('input[type=file]').first().setInputFiles(DOC); await page.waitForTimeout(1500);
    await v.getByRole('button', { name: /^Ler documento$/ }).click();
    await page.waitForFunction(() => /Documento lido e guardado/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 20000 });
    await v.getByRole('button', { name: /^Confirmar e enviar documento$/ }).click();
    await v.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 10000 });
    await page.waitForTimeout(4000);
  }, () => esperar(async () => { const c = await ciclo(); return c?.documentos?.consolidadoEnviado && c.documentos.consolidadoEnviado !== c0?.documentos?.consolidadoEnviado ? 'base B enviada ao Chris' : null; }, 25000))) return;

  // 3. Chris confirma a base nova (rodada nova) — o calendário continua com a Amanda na base A
  if (!await passo('3 Chris confirma a nova base', 'Chris', async page => {
    await materiais(page);
    const b = page.getByRole('button', { name: /^Confirmar nova base após comparação$/ }).first(); await b.evaluate(el => el.scrollIntoView({ block: 'center' })); await b.click();
    try { await page.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 8000 }); } catch {}
    await page.waitForTimeout(5000);
  }, () => esperar(async () => { const c = await ciclo(); return c?.criacao?.base === c?.documentos?.consolidadoEnviado && c.criacao.base !== c0?.criacao?.base && c.criacao.enviadoRevisao !== true ? 'rodada nova com a base B (não enviada)' : null; }, 25000))) return;

  // 4. Amanda devolve: antes ficava "guardada, mas não confirmada" para sempre; agora volta para o Chris na base B
  await passo('4 Amanda devolve e destrava', 'Amanda', async page => {
    await abrirCentral(page, 'view-planejamentoPreparacaoR80'); await page.waitForTimeout(3000);
    const v = page.locator('#view-planejamentoPreparacaoR80');
    const sel = v.locator('select').last();
    const opt = await sel.locator('option').filter({ hasText: new RegExp(NOME) }).first().getAttribute('value'); await sel.selectOption(opt);
    await v.getByRole('button', { name: /Abrir documentos deste cliente/ }).click();
    const aba = v.getByRole('button', { name: /^Criar e aprovar$/ }).first(); await aba.waitFor({ timeout: 20000 }); await aba.click(); await page.waitForTimeout(3000);
    const abrirRev = page.getByRole('button', { name: /^Revisar e aprovar este calendário$|^Abrir editor oficial nesta competência$/ }).first(); await abrirRev.evaluate(el => el.scrollIntoView({ block: 'center' })); await abrirRev.click();
    await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 }); await page.waitForTimeout(2000);
    await page.locator('[data-action="devolver-form"]').first().click({ timeout: 15000 });
    await page.fill('#ed172_motivo', 'Ensaio J53: ajustar os roteiros para a base nova.');
    await page.locator('[data-action="decidir-devolver"]').first().click({ timeout: 15000 });
    await page.waitForTimeout(6000);
  }, () => esperar(async () => { const cal = await calendario(), c = await ciclo(); const m = cal?.aprovacaoMeses?.[MES]; const itens = (cal?.items || []).filter(i => i && !i.excluido && i.mes === MES).length;
    return m?.status === 'ajuste_interno' && m.por === 'Amanda' && cal.planejamentoBasesI155?.[MES] === c?.criacao?.base && itens === 2 ? 'ajuste_interno na base B · 2 conteúdos intactos' : null; }, 25000));
}
