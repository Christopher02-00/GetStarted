import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DIR, sha, until } from './runtime.mjs';

export async function checkFilledDocument({ root, w, button, C, cycle, ui, docA }) {
  const choose = (bytes, name) => {
    const input = root.querySelector('[data-arquivo-i164]');
    Object.defineProperty(input, 'files', { value: [new File([bytes], name)], configurable: true });
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const edit = (key, value) => {
    const el = root.querySelector('[data-field="' + key + '"]');
    el.value = value;
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
  };
  const current = async () => {
    const read = await C.ler(cycle);
    const id = read.ciclo.documentos.materiais?.[ui.chaveMaterial('campanha', '')];
    assert(id, 'Salvar original/rascunho semconfirmar não é entrega');
    return { read, doc: read.registros.find(x => x.id === id) };
  };
  const waitSaved = version => until(() => root.querySelector('[data-resumo-salvo-cp120]')?.textContent.includes('versão ' + version) && !button('arquivoEnviar').disabled, 'nova versão confirmada/releitura ' + version);
  const beforeA = structuredClone(docA);
  const bytesB = fs.readFileSync(path.join(DIR, 'fixtures', 'CP177_DOCUMENTO_B_FICTICIO.txt'));
  choose(bytesB, 'CP177_DOCUMENTO_B_FICTICIO.txt');
  button('docEnviarCompletoCp157').click();
  await until(() => !!button('confirmarAcao') || root.textContent.includes('Este documento já foi enviado') || root.textContent.includes('Um link de origem, sozinho, não importa o conteúdo do documento.'), 'arquivo B depois de A');
  assert(button('confirmarAcao'), 'Arquivo B selecionado deve ter conferência própria; A já enviada não prova B.');
  const preview = root.querySelector('[data-conferencia-documento-cp177]');
  assert(preview?.textContent.includes('DOCUMENTO B FICTÍCIO COMPLETO'), 'Conferência precisa mostrar o texto de B.');
  assert(preview.textContent.includes('https://example.test/cp177/ref-1'));
  assert(preview.textContent.includes('https://example.test/cp177/ref-2'));
  button('confirmarAcao').click();
  await waitSaved(2);
  const { read: readB, doc: docB } = await current();
  assert.equal(docB.versao, 2);
  assert.equal(docB.texto, bytesB.toString('utf8').trim());
  assert.equal(docB.arquivoId, 'arq_' + sha(bytesB));
  assert.deepEqual(readB.registros.find(x => x.id === beforeA.id), beforeA, 'A confirmada deve permanecer inteira no histórico.');
  assert(Buffer.from((await C.arquivos.ler(cycle, docB.arquivoId)).buffer).equals(bytesB));
  const beforeB = structuredClone(docB);
  edit('campanhaTitulo_0', 'Campanha fictícia com data editada');
  edit('campanhaData_0', '2026-12-25');
  edit('campanhaHora_0', '12:00');
  edit('campanhaPrazo_0', '2026-12-24');
  choose(bytesB, 'CP177_DOCUMENTO_B_FICTICIO.txt');
  button('docEnviarCompletoCp157').click();
  await until(() => !!button('confirmarAcao') || root.querySelector('[data-arquivo-estado]').textContent.includes('Este mesmo arquivo já está confirmado'), 'mesmo arquivo com data editada');
  assert(button('confirmarAcao'), 'Data editada do mesmo arquivo precisa permanecer pendente até confirmação da nova versão.');
  assert.equal(root.querySelector('[data-field=campanhaData_0]').value, '2026-12-25');
  button('confirmarAcao').click();
  await waitSaved(3);
  const { read: readC, doc: docC } = await current();
  assert.equal(docC.versao, 3);
  assert.equal(docC.texto, beforeB.texto);
  assert.equal(docC.arquivoId, beforeB.arquivoId);
  assert.deepEqual(docC.datasCampanha, [{ titulo: 'Campanha fictícia com data editada', data: '2026-12-25', hora: '12:00', programarAte: '2026-12-24', empresaOtavio: '' }]);
  assert.deepEqual(readC.registros.find(x => x.id === beforeA.id), beforeA);
  assert.deepEqual(readC.registros.find(x => x.id === beforeB.id), beforeB);
  assert.equal(readC.registros.filter(x => x.tipo === 'documento' && x.finalidade === 'campanha').length, 3);
  return { AtoB: { newVersion: 2, ownTextAndOriginal: true, previousWholePreserved: true }, sameOriginalWithEditedDate: { newVersion: 3, explicitConfirmation: true, dateExact: true, previousWholePreserved: true } };
}
