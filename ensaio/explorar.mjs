// Exploração: sobe tudo, loga como Chris, tira foto, lista menu e erros. Uso: node ensaio/explorar.mjs [Pessoa]
import { subir } from './lib/emulador.mjs';
import { criarSeed, seedPadrao } from './lib/seed.mjs';
import { abrirNavegador, entrarComo, foto, menuVisivel } from './lib/navegador.mjs';

const pessoa = process.argv[2] || 'Chris';
const amb = await subir();
try {
  const seed = criarSeed(amb.portas);
  await seedPadrao(seed);
  const nav = await abrirNavegador(amb.portas);
  const { page, erros, fechar } = await nav.novaPagina();
  const t0 = Date.now();
  try {
    await entrarComo(page, amb.url(), pessoa);
    console.log(`[explorar] ${pessoa} autenticado em ${Date.now() - t0} ms`);
    await page.waitForTimeout(4000);
    console.log('[explorar] menu visível:', (await menuVisivel(page)).join(', '));
    console.log('[explorar] view ativa:', await page.evaluate(() => document.querySelector('.view.ativa, [class*="view"][style*="block"]')?.id || window.viewAtiva || '?'));
    console.log('[explorar] foto:', await foto(page, 'explorar-' + pessoa));
  } catch (e) {
    console.log('[explorar] FALHA:', String(e).slice(0, 400));
    console.log('[explorar] foto:', await foto(page, 'explorar-' + pessoa + '-falha'));
    console.log('[explorar] gate texto:', await page.evaluate(() => document.getElementById('authEquipeErro')?.textContent || document.body.innerText.slice(0, 500)));
  }
  console.log(`[explorar] erros de console (${erros.length}):`); erros.slice(0, 25).forEach(e => console.log('   ', e));
  await fechar(); await nav.fechar();
} finally { await amb.parar(); }
