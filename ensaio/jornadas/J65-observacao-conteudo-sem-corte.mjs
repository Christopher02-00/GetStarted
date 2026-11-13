// J65 — CP213 (13/11/2026, Stokki 2026-12): a observação por conteúdo que a Amanda escreve ao devolver era cortada em 1.000
// caracteres sem aviso (o roteiro colado chegou ao Chris terminando no meio da frase). Mesmo caminho da J52, com a Hitech:
// Amanda cola 3.500 caracteres na observação de um conteúdo → contador visível → devolve → o recado chega inteiro ao Chris
// (último trecho presente) no calendário e em "Retornos da Amanda". Colar acima de 8.000 é recusado com aviso.
// Fluxo da J06 com a Zeiss: Amanda inclui o documento → Chris cria e envia → Amanda devolve com 12 mil caracteres.
// cria conteúdos e envia para revisão → Amanda conclui a revisão (libera) → cliente lê pelo link → Luís vê em modo gravação.
// O servidor exige a ordem (central/preparacao); cada etapa é confirmada pelas Cloud Functions reais no emulador.
import path from 'node:path';
import fs from 'node:fs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J65';
export const nome = 'Observação por conteúdo de 3.500 caracteres chega inteira ao Chris (sem corte em 1.000)';

const CLIENTE = 'hitech', NOME = 'Hitech', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const TITULO1 = 'Ensaio J65 — Notebook gamer', TITULO2 = 'Ensaio J65 — Assistência técnica';
const DOC = path.join(process.cwd(), 'ensaio/.runtime/j65-hitech-dez.txt');
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
  fs.writeFileSync(DOC, `Referências ${NOME} — dezembro 2026\n\nCampanha de Natal: treino em família (15/12).\nReferência 1: reels de aquecimento com música animada.\nReferência 2: depoimento de aluno sobre resultados em 2026.\nOrientação: tom motivacional, sem promoções agressivas.\n`);
  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      if (pessoa) { await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500); }
      await acao(page);
      const res = await verificar(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J65-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J65-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 700) }); return false; }
    finally { await fechar(); }
  };
  const ciclo = async () => (await seed.listar('planejamento_social_i155')).find(c => c.id === CICLO);
  const calendario = async () => (await seed.listar('calendarios')).find(c => c.id === CLIENTE);
  const itensMes = cal => (cal?.items || []).filter(i => !i.excluido && (!i.month || i.month === MES || i.mes === MES || i.competencia === MES));

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

  // 2. Chris abre o editor oficial, cria 2 conteúdos, salva e envia para a Amanda revisar
  if (!await passo('2 Chris cria conteúdos e envia para revisão', 'Chris', async page => {
    await abrirCentral(page, 'view-estrategiaCp109');
    const v = page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
    await v.locator('select').first().selectOption({ label: NOME }); await v.locator('input[type=month]').first().fill(MES);
    await v.getByRole('button', { name: /Abrir cliente e mês/ }).click();
    await v.getByRole('button', { name: /Abrir editor oficial do mês/ }).click({ timeout: 20000 });
    await page.waitForSelector('#ed172_pecas', { timeout: 30000 });
    await page.getByRole('button', { name: /^Começar criação$/ }).click();
    await page.waitForFunction(() => /A ação foi confirmada no servidor|Versão confirmada no servidor/.test(document.getElementById('planejamentoEditorI172')?.innerText || ''), null, { timeout: 30000 });
    for (const [titulo, dia] of [[TITULO1, '3'], [TITULO2, '10']]) {
      // o rodapé fixo do editor cobre botões rolados para o fim da tela → centraliza antes de clicar
      const novo = page.getByRole('button', { name: /^\+ Novo conteúdo$/ }).first(); await novo.evaluate(el => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(400); await novo.click(); await page.waitForTimeout(1200);
      // o conteúdo novo nasce com day:1 e vai para o topo da lista ordenada → identifica pelo título vazio, não pela posição
      const item = await page.evaluate(() => { const els = [...document.querySelectorAll('#planejamentoEditorI172 [data-item][data-field="name"]')]; return (els.find(e => !e.value.trim()) || els.at(-1))?.dataset.item; });
      const campo = f => `#planejamentoEditorI172 [data-item="${item}"][data-field="${f}"]`;
      await page.fill(campo('name'), titulo); await page.dispatchEvent(campo('name'), 'input'); await page.dispatchEvent(campo('name'), 'change');
      await page.fill(campo('day'), dia); await page.dispatchEvent(campo('day'), 'change');
      await page.fill(campo('desc'), 'Roteiro do ensaio J06: abertura, demonstração, encerramento com CTA.'); await page.dispatchEvent(campo('desc'), 'change');
      await page.fill(campo('legenda'), 'Legenda do ensaio J06 #bluefit'); await page.dispatchEvent(campo('legenda'), 'change');
      if (await page.locator(campo('fmt')).isVisible().catch(() => false)) { await page.fill(campo('fmt'), 'Reel'); await page.dispatchEvent(campo('fmt'), 'change'); }
      const refs = page.locator(`#planejamentoEditorI172 [data-item="${item}"][data-field="referenciaDispensada"]`); if (await refs.isVisible().catch(() => false)) await refs.check();
      // salva a cada conteúdo (o rascunho com alterações pendentes trava "+ Novo conteúdo")
      await page.getByRole('button', { name: /^Salvar conteúdos$/ }).click();
      // o cabeçalho do cartão vem da versão do servidor: quando mostra o título, o salvar foi confirmado
      await page.waitForFunction(t => [...document.querySelectorAll('#planejamentoEditorI172 article h3')].some(h => h.textContent.trim() === t), titulo, { timeout: 30000 }); await page.waitForTimeout(1000);
    }
    // "Versão confirmada no servidor." = nada pendente; se restar alteração, o próprio editor avisa em [role=alert]
    const txtEditor = await page.evaluate(() => document.getElementById('planejamentoEditorI172')?.innerText || '');
    if (/Alterações no rascunho/.test(txtEditor)) { const alerta = await page.evaluate(() => [...document.querySelectorAll('#planejamentoEditorI172 [role=alert]')].map(e => e.textContent.trim()).join(' | ')); throw new Error('editor ainda com alterações não salvas · ' + alerta.slice(0, 200)); }
    await page.getByRole('button', { name: /^Enviar para a Amanda revisar$/ }).click();
    // conferência antes do envio, se aparecer
    try { await page.getByRole('button', { name: /^Confirmar (esta ação|envio|e enviar)/ }).click({ timeout: 6000 }); } catch {}
    await page.waitForTimeout(6000);
  }, () => esperar(async () => { const cal = await calendario(); const n = itensMes(cal).filter(i => [TITULO1, TITULO2].includes(i.name)).length; const c = await ciclo(); return n === 2 ? `2 conteúdos salvos no calendário · ciclo revisão ${c?.revisao}` : (cal ? `calendário com ${itensMes(cal).length} itens do mês` : null); }, 25000))) return;

  // 3. Amanda cola 3.500 caracteres na observação de um conteúdo e devolve
  const FINAL = 'TRECHO FINAL J65: pessoas que conhecem a loja voltam sempre.';
  const NOTA = ('Roteiro completo colado pela Amanda: abertura com o produto na bancada, close nos detalhes, fala do técnico. '.repeat(40)).slice(0, 3500 - FINAL.length - 1) + ' ' + FINAL;
  let contador = '', avisoAcima = '';
  await passo('3 Amanda devolve com observação de 3.500 caracteres', 'Amanda', async page => {
    await abrirCentral(page, 'view-planejamentoPreparacaoR80'); await page.waitForTimeout(3000);
    const v = page.locator('#view-planejamentoPreparacaoR80');
    const sel = v.locator('select').last();
    const opt = await sel.locator('option').filter({ hasText: new RegExp(NOME) }).first().getAttribute('value'); await sel.selectOption(opt);
    await v.getByRole('button', { name: /Abrir documentos deste cliente/ }).click();
    const aba = v.getByRole('button', { name: /^Criar e aprovar$/ }).first(); await aba.waitFor({ timeout: 20000 }); await aba.evaluate(el => el.scrollIntoView({ block: 'center' })); await aba.click();
    await page.waitForFunction(() => /Amanda precisa revisar esta versão/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 30000 }); await page.waitForTimeout(2500);
    const abrirRev = page.getByRole('button', { name: /^Revisar e aprovar este calendário$/ }).first(); await abrirRev.evaluate(el => el.scrollIntoView({ block: 'center' })); await abrirRev.click();
    await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 }); await page.waitForTimeout(4000);
    const nota = page.locator('[data-nota-cp145]').first(); await nota.waitFor({ state: 'attached', timeout: 20000 });
    await nota.evaluate(ta => { let d = ta.closest('details'); while (d) { d.open = true; d = d.parentElement?.closest('details'); } ta.scrollIntoView({ block: 'center' }); });
    if (!await nota.isVisible()) { const abrir = page.locator('[data-action*="abrir"],[data-abrir-conteudo-cp145],summary').filter({ hasText: /Notebook gamer|Assistência técnica/ }).first(); if (await abrir.count()) await abrir.click(); await page.waitForTimeout(800); }
    // colagem acima de 8.000: recusada com aviso, sem cortar
    await nota.evaluate((ta, t) => { ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); }, 'x'.repeat(8200));
    await page.waitForTimeout(500);
    avisoAcima = await page.evaluate(() => [...document.querySelectorAll('[data-aviso-nota-cp213]')].map(e => e.textContent).join(' '));
    console.log('[J65 diag] alertas', await page.evaluate(() => [...document.querySelectorAll('#planejamentoEditorI172 [role=alert], #planejamentoEditorI172 .erro, #planejamentoEditorI172 [data-dirty]')].map(e => e.textContent.trim()).filter(Boolean).join(' | ').slice(0, 300)), '· notas no DOM', await page.locator('[data-nota-cp145]').count(), '· dentro do editor', await page.locator('#planejamentoEditorI172 [data-nota-cp145]').count());
    // colagem de 3.500 (como a da Stokki)
    await nota.evaluate((ta, t) => { ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new Event('change', { bubbles: true })); }, NOTA);
    contador = await page.evaluate(() => [...document.querySelectorAll('[data-contador-nota-cp213]')].map(e => e.textContent).join(' '));
    await page.locator('[data-action="devolver-form"]').first().click({ timeout: 15000 });
    await page.evaluate(() => { const ta = document.getElementById('ed172_motivo'); ta.value = 'Ajustar o roteiro conforme a observação do conteúdo.'; ta.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.locator('[data-action="decidir-devolver"]').first().click({ timeout: 15000 });
    await page.waitForTimeout(6000);
  }, () => esperar(async () => { const m = (await calendario())?.aprovacaoMeses?.[MES]; if (m?.status !== 'ajuste_interno') return null;
    const inteiro = String(m.motivoAjuste || '').includes(FINAL);
    return inteiro && /3\.500 \/ 8\.000/.test(contador) && /passou de 8\.000/.test(avisoAcima) ? `recado no calendário com ${String(m.motivoAjuste).length} caracteres e o trecho final · contador "${contador.trim()}" · aviso acima de 8.000 mostrado`
      : `NÃO inteiro: final ${inteiro ? 'presente' : 'AUSENTE'} · contador "${contador.trim() || '(sem contador)'}" · aviso acima de 8.000 ${avisoAcima.trim() ? 'mostrado' : 'AUSENTE'}`; }, 25000).then(async r => { if (!(r && /^recado/.test(r))) { const m = (await calendario())?.aprovacaoMeses?.[MES]; console.log('[J65 diag]', r, '· status', m?.status, '· contador', contador, '· aviso', avisoAcima, '· motivo', String(m?.motivoAjuste || '').length); } return r && /^recado/.test(r) ? r : null; }));

  // 4. Chris vê o recado inteiro em "Retornos da Amanda"
  await passo('4 Chris vê o recado inteiro em Retornos da Amanda', 'Chris', async page => {
    await page.evaluate(() => { const el = [...document.querySelectorAll('[onclick*="irPara(\'minhasDemandasAtribuidas\'"]')][0]; irPara('minhasDemandasAtribuidas', el); });
    await page.waitForFunction(() => /Retornos da Amanda/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  }, async page => { const t = await page.evaluate(() => { const c = [...document.querySelectorAll('[data-retornos-mensais-cp155]')].map(e => e.innerText).join(' '); return c || ''; });
    return t.includes(FINAL) ? 'Retornos da Amanda com o trecho final do recado' : null; });
}
