// J49b — A ficha do cliente mudou depois do documento confirmado (estado que a J49 deixa na Bluefit 2026-12, igual ao
// caso real da Little Elephant 2026-12 em 17/11/2026) → o Chris acha, pela tela que ele abre, o botão para conferir e
// readotar a base com a ficha atual → readota → o editor oficial do mês abre de novo. Documento e histórico preservados.
// Antes: o editor só dizia "A ficha do cliente mudou…" e ficava em "Conferindo a versão no servidor…", sem botão, e a
// página do cliente e mês não oferecia o botão docAdotarUnicoCp183 em nenhuma aba.
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J49b';
export const nome = 'Ficha mudou depois do documento confirmado: Chris acha o botão, readota e o editor abre';
const CLIENTE = 'bluefit', NOME = 'Bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const FICHA = /A ficha do cliente mudou/;
const ADOTAR = /Conferir \/ atualizar base com a ficha atual|Conferir e readotar a base com a ficha atual/;

async function abrirEditor(page, continuar = false) {
  await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 });
  await abrirMenuSeMovel(page);
  await page.click('#navPlanejamentoPreparacaoR80');
  await page.waitForFunction(() => { const v = document.getElementById('view-estrategiaCp109'); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, null, { timeout: 20000 });
  const v = page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
  await v.locator('select').first().selectOption({ label: NOME }); await v.locator('input[type=month]').first().fill(MES);
  await v.getByRole('button', { name: /Abrir cliente e mês/ }).click();
  await page.getByRole('button', { name: /^Abrir materiais do mês$/ }).click({ timeout: 20000 }); await page.waitForTimeout(3000);
  const aba = page.getByRole('button', { name: /^Criar e aprovar$/ }).first(); if (await aba.isVisible().catch(() => false)) { await aba.click(); await page.waitForTimeout(2500); }
  const ed = page.getByRole('button', { name: /^Abrir editor oficial nesta competência$/ }).first();
  if (continuar && !await ed.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) { // depois de readotar: ligar a criação à base readotada
    const base = page.getByRole('button', { name: /^(Conferir base e continuar|Confirmar nova base após comparação)$/ }).first(); await base.evaluate(el => el.scrollIntoView({ block: 'center' })); await base.click();
    try { await page.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 8000 }); } catch {}
    await ed.waitFor({ timeout: 30000 }); }
  await ed.evaluate(el => el.scrollIntoView({ block: 'center' })); await ed.click();
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const caso = 'ficha mudou → Chris readota pela tela → editor abre';
  const ciclo0 = await seed.get('planejamento_social_i155', CICLO);
  if (!ciclo0?.documentos?.baseDocumentoUnicoCp183) { registrar({ jornada: id, caso, ok: false, ms: 0, detalhe: 'depende da J06 + J49 (Bluefit 2026-12 com documento único)' }); return; }
  const docId = ciclo0.documentos.baseDocumentoUnicoCp183.documentoId, regs0 = (await seed.listar(`planejamento_social_i155/${CICLO}/registros`)).length;
  const calMes = async () => JSON.stringify(((await seed.get('calendarios', CLIENTE))?.items || []).filter(i => i && i.mes === MES && !i.excluido).map(i => [i.itemId, i.name, i.desc, i.legenda]).sort()), cal0 = await calMes();
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(), passos = [];
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
    // 1. o editor travado mostra o aviso da ficha E o caminho para readotar
    await abrirEditor(page);
    const travado = await page.waitForFunction(r => r.test(document.body.innerText), FICHA, { timeout: 30000 }).then(() => true).catch(() => false);
    passos.push(travado ? 'editor travado pela ficha' : 'editor NÃO mostrou o aviso da ficha');
    if (!travado) throw new Error('pré-condição: o editor não travou pela ficha');
    const ir = page.getByRole('button', { name: /Conferir e readotar a base/ }).first();
    if (!await ir.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)) { await foto(page, 'J49b-editor-sem-botao'); throw new Error('o editor travado não oferece o botão para readotar a base'); }
    await ir.evaluate(el => el.scrollIntoView({ block: 'center' })); await ir.click(); passos.push('editor → readotar');
    // 2. a página do cliente e mês mostra o botão de adotar (o mesmo documento confirmado)
    const adotar = page.getByRole('button', { name: ADOTAR }).first();
    if (!await adotar.waitFor({ timeout: 20000 }).then(() => true).catch(() => false)) { await foto(page, 'J49b-pagina-sem-botao'); throw new Error('a página do cliente e mês não mostra o botão de readotar'); }
    await adotar.evaluate(el => el.scrollIntoView({ block: 'center' })); await adotar.click();
    await page.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 10000 });
    const readotado = await (async () => { const f = Date.now() + 30000; while (Date.now() < f) { const c = await seed.get('planejamento_social_i155', CICLO), info = await seed.get('info_extras_cliente', CLIENTE);
      if (c?.documentos?.baseDocumentoUnicoCp183?.infoCliente?.texto === info?.texto) return c; await new Promise(r => setTimeout(r, 1000)); } return null; })();
    if (!readotado) { await foto(page, 'J49b-nao-readotou'); throw new Error('a base não foi readotada com a ficha atual'); }
    passos.push('base readotada');
    const preservado = readotado.documentos.baseDocumentoUnicoCp183.documentoId === docId && (await seed.listar(`planejamento_social_i155/${CICLO}/registros`)).length >= regs0;
    // 3. o editor oficial abre de novo, sem o aviso da ficha (Conferir base e continuar liga a criação à base readotada)
    await abrirEditor(page, true);
    const abriu = await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 }).then(() => true).catch(() => false);
    const aindaFicha = FICHA.test(await page.evaluate(() => document.getElementById('planejamentoEditorI172')?.innerText || ''));
    passos.push(abriu && !aindaFicha ? 'editor abriu' : 'editor continua travado');
    // 4. a demanda CP198 aponta o caminho que a tela oferece
    const dem = (await seed.listar('demandas')).find(d => /^cp198_ficha_/.test(d.id) && d.cliente === CLIENTE);
    const textoOk = !!dem && /editor oficial do mês.*Conferir e readotar a base/.test(dem.descricao || '');
    passos.push(textoOk ? 'demanda aponta o caminho certo' : 'demanda aponta caminho que não existe');
    const calOk = await calMes() === cal0; passos.push(calOk ? 'calendário do mês igual' : 'CALENDÁRIO DO MÊS MUDOU');
    const graves = erros.filter(erroGrave);
    await foto(page, 'J49b-chris');
    registrar({ jornada: id, caso, ok: abriu && !aindaFicha && preservado && calOk && textoOk && !graves.length, ms: Date.now() - t0, detalhe: passos.join(' → ') + (preservado ? ' · documento e registros preservados' : ' · DOCUMENTO/REGISTROS ALTERADOS') + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: passos.join(' → ') + ' | ' + String(e).replace(/\s+/g, ' ').slice(0, 400) }); }
  finally { await fechar(); }
}
