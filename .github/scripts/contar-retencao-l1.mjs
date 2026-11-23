// CP260 — contagem diária da retenção L1, SÓ LEITURA (conta do vigia: Cloud Datastore Viewer). Mostra no resumo do run quantos registros
// técnicos antigos cada regra pegaria. Não grava nada; a exclusão (fase 2) só existe com o ok nominal do Chris.
// Uso: node .github/scripts/contar-retencao-l1.mjs [--projeto <id>]   (com FIRESTORE_EMULATOR_HOST, lê o emulador)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function main() {
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  const { initializeApp, applicationDefault } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  const projectId = process.argv.includes('--projeto') ? process.argv[process.argv.indexOf('--projeto') + 1] : 'get-started-4956d';
  initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId } : { credential: applicationDefault(), projectId });
  const { contarRetencaoL1, relatorioRetencaoL1 } = await import(pathToFileURL(path.join(RAIZ, 'functions-get/retencao-l1.mjs')).href);
  const quando = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16) + ' (Brasília)';
  const texto = relatorioRetencaoL1(await contarRetencaoL1(getFirestore()), quando);
  console.log(texto);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + texto + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exitCode = 2; });
