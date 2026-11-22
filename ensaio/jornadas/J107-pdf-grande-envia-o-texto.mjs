// J107 — CP252 (22/11/2026, documentos da Amanda "não iam"): um PDF acima de 4 MB era recusado no próprio navegador ("Escolha um PDF, DOCX
// ou texto de até 4 MB"), sem rastro no servidor e sem saída. Esperado: a tela lê o texto do PDF grande e pergunta se a Amanda quer enviar
// o TEXTO completo como o documento do mês; confirmando, o documento chega ao Chris (quadro do mês: enviado, formato texto).
// Mês relativo a hoje (não envelhece). O PDF é gerado aqui: 1 página com texto + um bloco binário que leva o arquivo a ~5 MB.
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J107';
export const nome = 'PDF acima de 4 MB: a Amanda envia o texto completo dele e o documento chega ao Chris';
const { mesPorExtenso, mesAtualBRT, somarMes } = await import(pathToFileURL(path.join(RAIZ, 'gs-estado-mes.mjs')).href);
const MES = somarMes(mesAtualBRT(), 10), CLIENTE = 'bluefit', CICLO = `${MES}__${CLIENTE}`;
const PDF = path.join(RAIZ, 'ensaio/.runtime/j107-documento-grande.pdf'), FRASE = 'Campanha de verao J107 com aulas ao ar livre';

function pdfGrande() { // PDF mínimo válido (xref com offsets reais) + objeto de 5 MB não referenciado pelas páginas
  const conteudo = `BT /F1 14 Tf 72 720 Td (Documento grande do ensaio J107) Tj 0 -24 Td (${FRASE}) Tj 0 -24 Td (Referencia: reels com depoimento de aluno) Tj ET`;
  const bloco = Buffer.alloc(5 * 1024 * 1024, 0x41);
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', null];
  const partes = [Buffer.from('%PDF-1.4\n')], offsets = []; let pos = partes[0].length;
  objs.forEach((o, i) => { offsets.push(pos); const b = o === null ? Buffer.concat([Buffer.from(`${i + 1} 0 obj\n<< /Length ${bloco.length} >>\nstream\n`), bloco, Buffer.from('\nendstream\nendobj\n')]) : Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`); partes.push(b); pos += b.length; });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  partes.push(Buffer.from(xref)); return Buffer.concat(partes);
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  fs.mkdirSync(path.dirname(PDF), { recursive: true }); fs.writeFileSync(PDF, pdfGrande());
  const t0 = Date.now(), mb = (fs.statSync(PDF).size / 1048576).toFixed(1);
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
    await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 }); await abrirMenuSeMovel(page); await page.click('#navPlanejamentoPreparacaoR80');
    await page.waitForFunction(() => { const v = document.getElementById('view-planejamentoPreparacaoR80'); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    const v = page.locator('#view-planejamentoPreparacaoR80');
    const mesCampo = v.locator('[data-field="competencia"]').first();
    if (await mesCampo.inputValue() !== MES) { if (await mesCampo.evaluate(el => el.tagName) === 'SELECT') await mesCampo.selectOption(MES); else { await mesCampo.fill(MES); await mesCampo.dispatchEvent('change'); } await page.waitForTimeout(3000); }
    await v.locator('select[data-field="documentoClienteCp120"]').first().selectOption(CLIENTE);
    await v.getByRole('button', { name: /Abrir documentos deste cliente/ }).click();
    await v.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 10000 });
    await page.waitForFunction(() => /No ciclo|revisão \d/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 20000 });
    await v.locator('input[type=file]').first().setInputFiles(PDF); await page.waitForTimeout(1200);
    await v.getByRole('button', { name: /^Confirmar e enviar documento$/ }).click();
    // 1ª pergunta (CP252): enviar o texto do PDF grande? · 2ª: conferência do texto antes de enviar (a de sempre)
    let perguntou = false;
    for (let i = 0; i < 2; i++) {
      const ok = await page.waitForFunction(() => [...document.querySelectorAll('#view-planejamentoPreparacaoR80 button')].some(b => /^Confirmar esta ação$/.test(b.textContent.trim()) && b.offsetParent), null, { timeout: 30000 }).then(() => true).catch(() => false);
      if (!ok) break;
      const texto = await page.evaluate(() => document.getElementById('view-planejamentoPreparacaoR80')?.innerText || '');
      if (/Enviar o texto\?/.test(texto.replace(/\s+/g, ' '))) perguntou = true;
      const botao = v.getByRole('button', { name: /^Confirmar esta ação$/ });
      if (!(await botao.count())) break;
      await botao.first().click(); await page.waitForTimeout(2500);
    }
    await page.waitForFunction(() => !/Confira o documento:/.test(document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const c = (await seed.listar('planejamento_social_i155')).find(x => x.id === CICLO), d = c?.documentos || {};
    const base = d.baseDocumentoUnicoCp183, regs = c ? await seed.listar(`planejamento_social_i155/${CICLO}/registros`).catch(() => []) : [];
    const textoChegou = regs.some(r => String(r.texto || '').includes(FRASE));
    const tela = await page.evaluate(() => document.getElementById('view-planejamentoPreparacaoR80')?.innerText.replace(/\s+/g, ' ') || '');
    const graves = erros.filter(erroGrave);
    await foto(page, 'J107-amanda-pdf-grande');
    registrar({ jornada: id, caso: `1 PDF de ${mb} MB: a Amanda envia o texto completo e o documento chega ao Chris`, ok: perguntou && !!d.consolidadoEnviado && base?.mime === 'text/plain' && textoChegou && !graves.length, ms: Date.now() - t0,
      detalhe: `pergunta "enviar o texto?" ${perguntou ? 'sim' : 'NÃO'} · enviado ao Chris ${d.consolidadoEnviado ? 'sim' : 'NÃO'} · original ${base?.mime || '-'} · frase do PDF no documento ${textoChegou ? 'sim' : 'NÃO'}${!d.consolidadoEnviado ? ' · tela: "' + (tela.match(/tem [\d,]+ MB[^.]*\./) || [''])[0].slice(0, 140) + '"' : ''}${graves.length ? ' · erro: ' + graves[0] : ''}` });
  } catch (e) { await foto(page, 'J107-falha'); registrar({ jornada: id, caso: 'PDF acima de 4 MB', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
