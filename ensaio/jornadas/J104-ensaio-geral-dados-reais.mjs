// J104 — Ensaio geral com DADOS REAIS (Programa Estabilidade, 21/11/2026; pedido do Chris: "99% de assertividade e fluidez" ao fazer os
// calendários da equipe). Roda o ciclo da J06 em JANEIRO para cada cliente da lista, sobre a cópia anonimizada do banco real
// (ENSAIO_DADOS_REAIS): Amanda inclui o mês e envia o documento → Chris abre o editor oficial, cria e envia → o cliente NÃO vê antes →
// Amanda libera → o cliente lê pelo link → o filmmaker vê. O que quebrar com dado real (histórico, calendário grande, Stokki, grupo Zeiss)
// aparece aqui antes de acontecer com a equipe. Sem ENSAIO_DADOS_REAIS a jornada só se registra como "só com dados reais".
// ENSAIO_CLIENTES=slug1,slug2 (padrão: os clientes que mais deram problema) · ENSAIO_MES=2027-01.
import path from 'node:path';
import fs from 'node:fs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J104';
export const nome = 'Ensaio geral com dados reais: ciclo de janeiro inteiro, cliente por cliente (preparação → criação → liberação → cliente → filmmaker)';

let CLIENTE = '', NOME = '', MES = process.env.ENSAIO_MES || '2027-01', CICLO = '';
const PADRAO = 'fedalto-eletro-comercial,stokki,camargos,juliane-nerone,vitalle-odonto,cookiery,zeiss,clinica-dos-olhos-hauer';
const TITULO1 = 'Ensaio J06 — Reels de aquecimento', TITULO2 = 'Ensaio J06 — Depoimento de aluno';
const DOC = path.join(process.cwd(), 'ensaio/.runtime/j104-documento.txt');
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

// A Central da Amanda abre no mês seguinte; janeiro é o campo de mês (data-field="competencia"), como a Amanda faria
async function irParaMes(page) {
  const c = page.locator('#view-planejamentoPreparacaoR80 [data-field="competencia"]').first();
  if (!await c.count()) return;
  if (await c.inputValue() !== MES) { await c.fill(MES); await c.dispatchEvent('change'); await page.waitForTimeout(3500); }
}
// ACHADO F-09: enquanto a Central ainda carrega, o clique em "Calendários e conteúdos" é ignorado em silêncio → repete até a view abrir
async function abrirCentral(page, viewId) {
  // P16: com a F-09 (PR #41) o primeiro clique abre a Central; insistir esconderia uma regressão da F-09.
  await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 });
  await abrirMenuSeMovel(page);
  await page.click('#navPlanejamentoPreparacaoR80');
  try { await page.waitForFunction(idv => { const v = document.getElementById(idv); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, viewId, { timeout: 15000 }); }
  catch { throw new Error('Central não abriu no primeiro clique: ' + viewId); }
}

async function umCliente({ amb, seed, nav, erroGrave, registrar }) {
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
      await foto(page, `J104-${CLIENTE}-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J104-${CLIENTE}-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 700) }); return false; }
    finally { await fechar(); }
  };
  const ciclo = async () => (await seed.listar('planejamento_social_i155')).find(c => c.id === CICLO);
  const calendario = async () => (await seed.listar('calendarios')).find(c => c.id === CLIENTE);
  const itensMes = cal => (cal?.items || []).filter(i => !i.excluido && (!i.month || i.month === MES || i.mes === MES || i.competencia === MES));

  // 1. Amanda inclui o ciclo e envia o documento completo
  if (!await passo('1 Amanda inclui o ciclo e envia o documento', 'Amanda', async page => {
    await abrirCentral(page, 'view-planejamentoPreparacaoR80'); await page.waitForTimeout(3000); await irParaMes(page);
    const v = page.locator('#view-planejamentoPreparacaoR80');
    // seletor de cliente pelo campo (clientes de grupo, como a Zeiss, ganham um seletor "Empresa" depois dele)
    const sel = v.locator('select[data-field="documentoClienteCp120"]').first();
    await sel.selectOption(CLIENTE); // pelo identificador: "Zeiss" também casaria com "Clínica Zeiss Araucária"
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
  }, () => esperar(async () => { const c = await ciclo(); // clientes de grupo (ex.: Zeiss) guardam a confirmação no formato do documento único: vale confirmação OU documento enviado ao Chris
    return c?.incluido === true && (c.documentos?.confirmacoes || c.documentos?.consolidadoEnviado) ? `ciclo ${CICLO} incluído · revisão ${c.revisao} · documento confirmado` : null; }, 20000))) return;

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

  // 3a. Antes da liberação, o cliente NÃO pode ver o mês (contraprova permanente: o mutante "qualquer mês liberado" cai aqui)
  if (!await passo('3a Cliente não vê o mês antes da liberação', null, async page => {
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.includes('Bluefit') || document.body.innerText.length > 400, null, { timeout: 30000 }); await page.waitForTimeout(6000);
  }, async page => {
    const visivel = await page.evaluate(() => document.body.innerText); const html = await page.evaluate(() => document.body.innerHTML);
    const ok = /Calendário em produção/.test(visivel) && !visivel.includes(TITULO1) && !visivel.includes(TITULO2);
    const noDom = html.includes(TITULO1) ? ' · ATENÇÃO F-11: o título existe no DOM (oculto) antes da liberação' : '';
    return ok ? 'tela "Calendário em produção", nenhum título visível' + noDom : null; })) return;

  // 3. Amanda conclui a revisão (libera ao cliente)
  if (!await passo('3 Amanda conclui a revisão e libera', 'Amanda', async page => {
    await abrirCentral(page, 'view-planejamentoPreparacaoR80'); await page.waitForTimeout(3000); await irParaMes(page);
    const v = page.locator('#view-planejamentoPreparacaoR80');
    // seletor de cliente pelo campo (clientes de grupo, como a Zeiss, ganham um seletor "Empresa" depois dele)
    const sel = v.locator('select[data-field="documentoClienteCp120"]').first();
    await sel.selectOption(CLIENTE); // pelo identificador: "Zeiss" também casaria com "Clínica Zeiss Araucária"
    await v.getByRole('button', { name: /Abrir documentos deste cliente/ }).click();
    const aba = v.getByRole('button', { name: /^Criar e aprovar$/ }).first(); await aba.waitFor({ timeout: 20000 }); await aba.evaluate(el => el.scrollIntoView({ block: 'center' })); await aba.click();
    await page.waitForFunction(() => /Amanda precisa revisar esta versão/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 30000 }); await page.waitForTimeout(2500);
    const abrirRev = page.getByRole('button', { name: /^Revisar e aprovar este calendário$/ }).first(); await abrirRev.evaluate(el => el.scrollIntoView({ block: 'center' })); await abrirRev.click();
    await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 }); await page.waitForTimeout(2000);
    const btn = page.getByRole('button', { name: /Concluir revisão do calendário|Aprovar e liberar calendário/ }).first();
    await btn.waitFor({ timeout: 30000 }); await btn.evaluate(el => el.scrollIntoView({ block: 'center' })); await btn.click();
    const conf = page.locator('#ed172_confirma_publicacao'); try { await conf.waitFor({ timeout: 6000 }); await conf.check(); } catch {}
    try { await page.getByRole('button', { name: /^(Confirmar|Liberar|Aprovar)/ }).filter({ hasNotText: /Devolver|Voltar|Cancelar/ }).last().click({ timeout: 8000 }); } catch {}
    await page.waitForTimeout(8000);
  }, () => esperar(async () => { const cal = await calendario(); const ap = cal?.aprovacaoMeses?.[MES]; const st = typeof ap === 'string' ? ap : ap?.status || ap?.estado; return /liberado/.test(String(st || '')) ? `aprovacaoMeses[${MES}] = ${st}` : null; }, 25000))) return;

  // 4. Cliente lê pelo link público (calendario.html?cliente=&t=&mes=). A página lê a cópia do cliente (calendarios_cliente), que o gatilho
  //    CP200 atualiza depois da liberação: espera a cópia (até 3 min) e registra quanto demorou.
  { const t1 = Date.now(); const copia = await esperar(async () => { const c = await seed.get('calendarios_cliente', CLIENTE); return ['liberado', 'arquivado'].includes(c?.aprovacaoMeses?.[MES]?.status) ? c : null; }, 180000);
    registrar({ jornada: id, caso: '4a cópia do cliente atualizada depois da liberação', ok: !!copia, ms: Date.now() - t1, detalhe: copia ? `em ${Math.round((Date.now() - t1) / 1000)} s` : 'a cópia não recebeu o mês liberado em 3 min' }); }
  if (!await passo('4 Cliente lê o calendário liberado pelo link', null, async page => {
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText), null, { timeout: 30000 });
    try { await page.getByRole('button', { name: /Lista por semana/ }).click({ timeout: 5000 }); } catch {}
    await page.waitForFunction(t => (document.body.innerText + ' ' + document.body.innerHTML).includes(t), TITULO1, { timeout: 20000 });
  }, async page => { const txt = await page.evaluate(() => document.body.innerText + ' ' + document.body.innerHTML); const lib = /Liberado — o cliente já vê/.test(txt); return lib && txt.includes(TITULO1) && txt.includes(TITULO2) ? 'mês liberado · os 2 títulos aparecem para o cliente' : (lib ? 'liberado, mas títulos não encontrados' : null); })) return;

  // 5. Luís vê o calendário do cliente em modo gravação
  await passo('5 Luís vê o calendário em modo gravação', 'Luís', async page => {
    await page.evaluate(() => window.irParaCalendarioDeCampo());
    await page.waitForSelector('#campoClientes', { timeout: 15000 });
    const alvo = page.locator('#campoClientes').getByText(new RegExp('^\\s*' + NOME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$|·|—|-)')).first(); // começa com o nome: não casa "Clínica Zeiss Araucária" await alvo.click({ timeout: 10000 });
    // a tela de campo abre no mês corrente com conteúdo; o filmmaker troca para o mês da pauta pela aba do mês (data-campo-competencia)
    const aba = page.locator(`[data-campo-competencia="${MES}"]`).first(); await aba.waitFor({ timeout: 20000 }); await aba.click({ timeout: 10000 });
    await page.waitForFunction(m => document.querySelector(`[data-campo-competencia="${m}"]`)?.classList.contains('green'), MES, { timeout: 15000 }).catch(() => {});
    await page.waitForFunction(t => (document.getElementById('campoConteudo')?.innerText || '').includes(t), TITULO1, { timeout: 25000 });
  }, async page => { const txt = await page.evaluate(() => document.getElementById('campoConteudo')?.innerText || ''); return txt.includes(TITULO1) ? 'conteúdo do mês visível para o filmmaker' : null; });
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  if (!process.env.ENSAIO_DADOS_REAIS) { registrar({ jornada: id, caso: 'só com dados reais (ENSAIO_DADOS_REAIS)', ok: true, ms: 0, detalhe: 'pulada na bateria comum' }); return; }
  // carregar a cópia real dispara milhares de gatilhos; o ensaio só começa com a fila vazia (senão a cópia do cliente atrasa por fila, não por defeito)
  { const t0 = Date.now(), log = path.join(process.cwd(), 'ensaio/.runtime/emulator.log'), conta = () => (fs.readFileSync(log, 'utf8').match(/Beginning execution of/g) || []).length;
    let ultimo = -1, desde = Date.now(); while (Date.now() - t0 < 15 * 60e3) { const n = conta(); if (n !== ultimo) { ultimo = n; desde = Date.now(); } else if (Date.now() - desde > 30e3) break; await new Promise(r => setTimeout(r, 2000)); }
    await amb.aguardarFunctionsOciosas?.(60e3); registrar({ jornada: id, caso: 'fila de gatilhos do seed esvaziada', ok: true, ms: Date.now() - t0, detalhe: `${Math.round((Date.now() - t0) / 1000)} s · ${ultimo} execuções` }); }
  const clientes = (process.env.ENSAIO_CLIENTES || PADRAO).split(',').map(x => x.trim()).filter(Boolean);
  const configs = await seed.listar('clientes_config'), cals = await seed.listar('calendarios');
  for (const slug of clientes) {
    CLIENTE = slug; CICLO = `${MES}__${slug}`;
    NOME = cals.find(c => c.id === slug)?.client || configs.find(c => c.id === slug)?.nome || slug;
    // o link do cliente usa um token; na cópia anonimizada cada cliente ganha um token de ensaio
    await seed.set('clientes_portal_tokens', 'tok-' + slug, { cliente: slug, ativo: true, criadoEm: new Date().toISOString() });
    await seed.set('clientes_acesso', slug, { slug, nome: NOME, token: 'tok-' + slug, ativo: true, excluido: false });
    const reg = r => registrar({ ...r, jornada: id, caso: `${NOME} · ${r.caso}` });
    try { await umCliente({ amb, seed, nav, erroGrave, registrar: reg }); }
    catch (e) { reg({ caso: 'execução', ok: false, ms: 0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); }
    await amb.aguardarFunctionsOciosas?.();
  }
}
