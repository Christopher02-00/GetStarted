// J27 — Calendário com item legado sem itemId (achado 09/11/2026, Master Chef 2026-12): o salvar do editor I172
// era recusado com "ID ausente ou duplicado" sem dizer onde, e a normalização V102 do Chris dava permission-denied
// (XI() das rules barra items com o processo exclusivo ativo). Esperado: a recusa aponta o item e o caminho; a V102
// aplica com backup e recibo, sem mudar título/estado; depois o salvar grava.
import path from 'node:path';
import fs from 'node:fs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J27';
export const nome = 'Calendário com item antigo sem itemId: recusa explica → V102 aplica (backup+recibo) → salvar grava';

const CLIENTE = 'mochi', NOME = 'Mochi', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const LEGADO = { mes: '2026-08', day: 22, name: 'Ensaio J27 — post antigo sem identidade', desc: '', fmt: 'Reels', ref: '', stage: 'postado', apr: true, agendado: true, gravado: true, posted: true, postagemId: 'video_j27legado', dataPostagem: '2026-08-22', dataFlexivel: false };
const TITULO = 'Ensaio J27 — Conteúdo novo de dezembro';
const DOC = path.join(process.cwd(), 'ensaio/.runtime/j27-mochi-dez.txt');
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

async function abrirCentral(page, viewId) {
  // P16: com a F-09 (PR #41) o primeiro clique abre a Central; insistir esconderia uma regressão da F-09.
  await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 });
  await abrirMenuSeMovel(page);
  await page.click('#navPlanejamentoPreparacaoR80');
  try { await page.waitForFunction(idv => { const v = document.getElementById(idv); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, viewId, { timeout: 15000 }); }
  catch { throw new Error('Central não abriu no primeiro clique: ' + viewId); }
}

async function criarESalvar(page) {
  const v = page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
  await v.locator('select').first().selectOption({ label: NOME }); await v.locator('input[type=month]').first().fill(MES);
  await v.getByRole('button', { name: /Abrir cliente e mês/ }).click();
  await v.getByRole('button', { name: /Abrir editor oficial do mês/ }).click({ timeout: 20000 });
  // 1ª vez: "Começar criação" (campo #ed172_pecas); depois o editor já abre em criação com "+ Novo conteúdo"
  await page.waitForSelector('#ed172_pecas, #planejamentoEditorI172 [data-action]', { timeout: 30000 }); await page.waitForTimeout(1500);
  const comecar = page.getByRole('button', { name: /^Começar criação$/ });
  if (await comecar.isVisible().catch(() => false)) {
    await comecar.click();
    await page.waitForFunction(() => /A ação foi confirmada no servidor|Versão confirmada no servidor/.test(document.getElementById('planejamentoEditorI172')?.innerText || ''), null, { timeout: 30000 });
  }
  const novo = page.getByRole('button', { name: /^\+ Novo conteúdo$/ }).first(); await novo.evaluate(el => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(400); await novo.click(); await page.waitForTimeout(1200);
  const item = await page.evaluate(() => { const els = [...document.querySelectorAll('#planejamentoEditorI172 [data-item][data-field="name"]')]; return (els.find(e => !e.value.trim()) || els.at(-1))?.dataset.item; });
  const campo = f => `#planejamentoEditorI172 [data-item="${item}"][data-field="${f}"]`;
  await page.fill(campo('name'), TITULO); await page.dispatchEvent(campo('name'), 'input'); await page.dispatchEvent(campo('name'), 'change');
  await page.fill(campo('day'), '5'); await page.dispatchEvent(campo('day'), 'change');
  await page.fill(campo('desc'), 'Roteiro do ensaio J27.'); await page.dispatchEvent(campo('desc'), 'change');
  await page.fill(campo('legenda'), 'Legenda do ensaio J27'); await page.dispatchEvent(campo('legenda'), 'change');
  if (await page.locator(campo('fmt')).isVisible().catch(() => false)) { await page.fill(campo('fmt'), 'Reel'); await page.dispatchEvent(campo('fmt'), 'change'); }
  const refs = page.locator(`#planejamentoEditorI172 [data-item="${item}"][data-field="referenciaDispensada"]`); if (await refs.isVisible().catch(() => false)) await refs.check();
  await page.getByRole('button', { name: /^Salvar conteúdos$/ }).click();
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  fs.mkdirSync(path.dirname(DOC), { recursive: true });
  fs.writeFileSync(DOC, `Referências ${NOME} — dezembro 2026\n\nCampanha de Natal: combos de presente.\nReferência 1: vídeo do balcão com música animada.\nOrientação: tom leve e próximo.\n`);
  await seed.set('calendarios', CLIENTE, { cliente: CLIENTE, items: [LEGADO], updatedAt: new Date().toISOString() });
  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      if (pessoa) { await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500); }
      await acao(page);
      const res = await verificar(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J27-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J27-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 700) }); return false; }
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

  // 2. Chris salva: o servidor recusa, e a mensagem aponta o item antigo e o caminho de correção
  if (!await passo('2 Salvar é recusado e a mensagem aponta o item', 'Chris', async page => {
    await abrirCentral(page, 'view-estrategiaCp109');
    await criarESalvar(page);
    await page.waitForFunction(() => /ID ausente ou duplicado/.test([...document.querySelectorAll('#planejamentoEditorI172 [role=alert]')].map(e => e.textContent).join(' ')), null, { timeout: 30000 });
    await page.waitForTimeout(1500);
  }, async page => {
    const alerta = await page.evaluate(() => [...document.querySelectorAll('#planejamentoEditorI172 [role=alert]')].map(e => e.textContent.trim()).join(' | '));
    const cal = await calendario(); const gravou = (cal?.items || []).some(i => i.name === TITULO);
    const aponta = alerta.includes('Trava encontrada em mochi') && alerta.includes('2026-08 dia 22') && alerta.includes('item #0') && /Corrigir identidades de calendários antigos/.test(alerta);
    return aponta && !gravou ? 'recusado sem gravar · mensagem aponta mochi 2026-08 dia 22 item #0 e o caminho' : null;
  })) return;

  // 3. Chris aplica a normalização V102 (prévia → aplicar): backup + recibo, título e estado intactos
  if (!await passo('3 Chris aplica a correção de identidades (V102)', 'Chris', async page => {
    await page.evaluate(() => { irPara('calendarios', document.getElementById('navCalendarios')); });
    await page.waitForTimeout(2000);
    await page.evaluate(() => setCalSub('conclusao', document.querySelector('[data-calsub="conclusao"]')));
    await page.waitForSelector('[data-cc-migracao-v102]', { timeout: 20000 });
    await page.locator('[data-cc-migracao-v102]').getByRole('button', { name: /^Ver prévia$/ }).click();
    await page.waitForFunction(() => !document.getElementById('ccMigracaoV102Aplicar')?.disabled, null, { timeout: 20000 });
    await page.click('#ccMigracaoV102Aplicar');
    await page.waitForFunction(() => /concluíd|confirmad|Aplicação parcial|falh/i.test(document.getElementById('ccMigracaoV102Estado')?.innerText || ''), null, { timeout: 30000 });
  }, async page => {
    const estado = await page.evaluate(() => document.getElementById('ccMigracaoV102Estado')?.innerText || '');
    const cal = await calendario(); const it = (cal?.items || [])[0] || {};
    const okItem = /^legacy_[0-9a-f]{64}$/.test(it.itemId || '') && it.name === LEGADO.name && it.posted === true && it.postagemId === LEGADO.postagemId;
    const op = cal?.itemIdMigracaoUltimaOperacao || '';
    const recibo = op ? await seed.get(`calendarios_itemid_migracoes/${CLIENTE}/operacoes`, op) : null;
    const backup = op ? await seed.get('calendarios_versoes', `${CLIENTE}__v102_itemids__${op}`) : null;
    const ok = okItem && recibo?.status === 'aplicada' && backup?.__tipo === 'antes_itemids_v102' && !(backup?.items || [])[0]?.itemId;
    return ok ? `item recebeu ${it.itemId.slice(0, 15)}… · título/estado intactos · recibo e backup gravados` : `estado: ${estado.slice(0, 160)} · itemId: ${it.itemId || 'ausente'} · recibo: ${!!recibo} · backup: ${!!backup}`;
  })) return;

  // 4. Depois da correção, o mesmo salvar grava
  await passo('4 Salvar grava depois da correção', 'Chris', async page => {
    await abrirCentral(page, 'view-estrategiaCp109');
    await criarESalvar(page);
    await page.waitForFunction(t => [...document.querySelectorAll('#planejamentoEditorI172 article h3')].some(h => h.textContent.trim() === t), TITULO, { timeout: 30000 });
  }, () => esperar(async () => { const cal = await calendario(); const novo = (cal?.items || []).find(i => i.name === TITULO); return novo?.itemId && (cal.items || []).every(i => i.itemId) ? `conteúdo novo gravado (${cal.items.length} itens, todos com itemId)` : null; }, 20000));
}
