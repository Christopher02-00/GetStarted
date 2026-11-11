// J54 — A gestão lê a coleção de demandas uma vez por login, não três (medição de 11/11/2026: ~4.800 demandas × 3 =
// ~14 mil leituras por login e "carregar demandas" passando do tempo limite de 8 s). O ouvinte em tempo real já entrega
// a coleção inteira; "carregar" e "recarregar" passam a aproveitá-lo. Conta as consultas avulsas (runQuery) à coleção
// `demandas` durante o login do Chris e confere que as demandas continuam na tela.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J54';
export const nome = 'Gestão lê as demandas uma vez por login (sem as leituras avulsas repetidas)';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const caso = 'login do Chris';
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  const logs = []; page.on('console', m => { if (/Demandas da gestão:/.test(m.text())) logs.push(m.text()); });
  try {
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(8000);
    await page.evaluate(() => irPara('atrasadas', document.getElementById('navAtrasadas')));
    await page.waitForTimeout(2500);
    const n = await seed.listar('demandas').then(l => l.length); const naTela = await page.evaluate(() => document.body.innerText.includes('Agendar gravação Bluefit') || document.body.innerText.includes('Editar Reels treino funcional'));
    const graves = erros.filter(erroGrave);
    await foto(page, 'J54-chris');
    registrar({ jornada: id, caso, ok: logs.some(l => /ouvinte/.test(l)) && !logs.some(l => /leitura direta/.test(l)) && naTela && !graves.length, ms: Date.now() - t0,
      detalhe: `carga: ${logs.map(l => /ouvinte/.test(l) ? 'ouvinte' : 'leitura direta').join(', ') || 'leitura direta (sem aviso)'} · ${n} demandas no banco · ${naTela ? 'demandas na tela' : 'demandas NÃO aparecem'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 240) }); }
  finally { await fechar(); }
}
