// J106 — CP251 (22/11/2026, pedido do Chris: "confiar fielmente no que está ali, nunca eu preciso ficar verificando por fora o que a Amanda
// subiu"). Na aba "Enviar meus documentos", o quadro do mês mostra, cliente por cliente, o que o servidor gravou:
//   ✅ enviado ao Chris (quando, por quem, que arquivo) · ⚠️ guardado mas não enviado ("Ler documento" sem "Confirmar e enviar") ·
//   ⏳ pasta aberta sem documento · ○ sem documento — e a contagem "N de M enviados ao Chris". O Chris vê o mesmo quadro.
// Tudo pelo caminho real da Amanda (servidor no emulador). Mês relativo a hoje (não envelhece).
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J106';
export const nome = 'Quadro dos documentos do mês: enviado, guardado sem enviar, pasta aberta e sem documento, igual para Amanda e Chris';
const { mesPorExtenso, mesAtualBRT, somarMes } = await import(pathToFileURL(path.join(RAIZ, 'gs-estado-mes.mjs')).href);
const MES = somarMes(mesAtualBRT(), 9);
const ENVIADO = 'bluefit', TEXTO = 'stokki', GUARDADO = 'mochi', ABERTA = 'zeiss';
const DOC = path.join(RAIZ, 'ensaio/.runtime/j106-documento.txt');

async function abrirDocumentos(page, { chris = false } = {}) {
  await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 });
  // o Chris chega pela Central (item "Enviar documentos" → área materiais); a Amanda pelo menu
  if (chris) await page.evaluate(() => abrirAreaCentralR87('materiais'));
  else { await abrirMenuSeMovel(page); await page.click('#navPlanejamentoPreparacaoR80'); }
  await page.waitForFunction(() => { const v = document.getElementById('view-planejamentoPreparacaoR80'); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  const v = page.locator('#view-planejamentoPreparacaoR80');
  const mes = v.locator('[data-field="competencia"]').first();
  if (await mes.inputValue() !== MES) { await mes.selectOption(MES); await page.waitForTimeout(3000); }
  // dentro da pasta de um cliente, "Todos os clientes" volta para a lista; se houver campos em edição, a Amanda guarda o rascunho e sai (gestos reais)
  const sel = () => v.locator('select[data-field="documentoClienteCp120"]');
  for (let i = 0; i < 4 && !(await sel().count()); i++) {
    const guardar = v.getByRole('button', { name: /^Guardar rascunho e sair da edição$/ }).first(), todos = v.getByRole('button', { name: /^Todos os clientes$/ }).first(), aba = v.locator('[data-aba="documentos"]').first();
    if (await guardar.count() && await guardar.isVisible()) await guardar.click(); else if (i < 2 && await todos.count()) await todos.click(); else if (await aba.count()) await aba.click();
    await page.waitForTimeout(2500);
  }
  return v;
}
async function abrirCliente(page, v, slug) {
  await v.locator('select[data-field="documentoClienteCp120"]').first().selectOption(slug);
  await v.getByRole('button', { name: /Abrir documentos deste cliente/ }).click();
  await v.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 10000 });
  await page.waitForFunction(() => /No ciclo|revisão \d/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 20000 });
}
const lerQuadro = page => page.evaluate(() => { const q = document.querySelector('#view-planejamentoPreparacaoR80 [data-quadro-documentos-cp251]'); if (!q) return null;
  return { titulo: q.querySelector('h3')?.textContent || '', linhas: Object.fromEntries([...q.querySelectorAll('[data-documento-cp251]')].map(li => [li.dataset.documentoCp251, { estado: li.dataset.estado, texto: li.innerText.replace(/\s+/g, ' ') }])) }; });

export async function executar({ amb, nav, erroGrave, registrar }) {
  fs.mkdirSync(path.dirname(DOC), { recursive: true });
  fs.writeFileSync(DOC, `Documento do ensaio J106 — ${mesPorExtenso(MES)}\n\nCampanha do mês: aulas experimentais.\nReferência 1: reels com depoimento.\nReferência 2: carrossel com o passo a passo.\n`);
  const t0 = Date.now();
  // 1) Amanda: um cliente enviado, um com pasta aberta, um com o documento guardado sem enviar
  {
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
      let v = await abrirDocumentos(page);
      const colar = async texto => { const d = v.locator('details[data-texto-completo-cp157]').first(); if (await d.count() && !(await d.evaluate(e => e.open))) await d.locator('summary').click(); // "Conferir ou editar o texto completo"
        await v.locator('[data-field="docTexto"]').first().fill(texto); await v.locator('[data-field="docTexto"]').first().dispatchEvent('input'); };
      const enviar = async () => { await v.getByRole('button', { name: /^Confirmar e enviar documento$/ }).click(); await v.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 15000 });
        await page.waitForFunction(() => !/Confira o documento:/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 30000 }); await page.waitForTimeout(2500); };
      // arquivo → Confirmar e enviar
      await abrirCliente(page, v, ENVIADO);
      await v.locator('input[type=file]').first().setInputFiles(DOC); await page.waitForTimeout(1200); await enviar();
      // só texto colado → Confirmar e enviar (antes: recusado no fim, "Envie o documento completo com o original")
      v = await abrirDocumentos(page); await abrirCliente(page, v, TEXTO);
      await colar(`Texto colado pela Amanda — ${mesPorExtenso(MES)}. Campanha: semana do cliente. Referências: reels de bastidores.`); await enviar();
      // só texto colado → Salvar sem enviar
      v = await abrirDocumentos(page); await abrirCliente(page, v, GUARDADO);
      await colar(`Rascunho da Amanda — ${mesPorExtenso(MES)}. Ainda conferindo as datas.`);
      await v.getByRole('button', { name: /^Salvar sem enviar$/ }).click(); await page.waitForTimeout(4000);
      // pasta aberta sem documento
      v = await abrirDocumentos(page); await abrirCliente(page, v, ABERTA);
      await abrirDocumentos(page);
      await page.waitForSelector('#view-planejamentoPreparacaoR80 [data-quadro-documentos-cp251]', { timeout: 15000 }).catch(() => {});
      const q = await lerQuadro(page), L = q?.linhas || {};
      const ok = !!q && q.titulo.startsWith(`Documentos de ${mesPorExtenso(MES)}: 2 de `) && L[ENVIADO]?.estado === 'enviado' && /Amanda/.test(L[ENVIADO]?.texto || '') && /texto/.test(L[ENVIADO]?.texto || '')
        && L[TEXTO]?.estado === 'enviado' && L[GUARDADO]?.estado === 'guardado' && L[ABERTA]?.estado === 'aberta' && Object.values(L).some(x => x.estado === 'sem');
      const graves = erros.filter(erroGrave);
      await foto(page, 'J106-amanda-quadro');
      registrar({ jornada: id, caso: '1 arquivo e texto colado chegam ao Chris; o quadro do mês mostra o que o servidor gravou', ok: ok && !graves.length, ms: Date.now() - t0,
        detalhe: q ? `"${q.titulo}" · ${ENVIADO}: ${L[ENVIADO]?.texto?.slice(0, 120)} · ${TEXTO} (só texto): ${L[TEXTO]?.estado} · ${GUARDADO}: ${L[GUARDADO]?.estado} · ${ABERTA}: ${L[ABERTA]?.estado}${graves.length ? ' · erro: ' + graves[0] : ''}` : 'quadro não apareceu' });
    } catch (e) { await foto(page, 'J106-amanda-falha'); registrar({ jornada: id, caso: '1 Amanda vê o quadro do mês', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
    finally { await fechar(); }
  }
  // 2) Chris vê o mesmo quadro
  {
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
      await abrirDocumentos(page, { chris: true });
      await page.waitForSelector('#view-planejamentoPreparacaoR80 [data-quadro-documentos-cp251]', { timeout: 15000 }).catch(() => {});
      const q = await lerQuadro(page), L = q?.linhas || {};
      const graves = erros.filter(erroGrave);
      await foto(page, 'J106-chris-quadro');
      registrar({ jornada: id, caso: '2 Chris vê o mesmo quadro', ok: !!q && L[ENVIADO]?.estado === 'enviado' && L[GUARDADO]?.estado === 'guardado' && L[ABERTA]?.estado === 'aberta' && !graves.length, ms: Date.now() - t0,
        detalhe: q ? `"${q.titulo}" · ${ENVIADO}: ${L[ENVIADO]?.estado} · ${GUARDADO}: ${L[GUARDADO]?.estado} · ${ABERTA}: ${L[ABERTA]?.estado}${graves.length ? ' · erro: ' + graves[0] : ''}` : 'quadro não apareceu para o Chris' });
    } catch (e) { await foto(page, 'J106-chris-falha'); registrar({ jornada: id, caso: '2 Chris vê o mesmo quadro', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
    finally { await fechar(); }
  }
}
