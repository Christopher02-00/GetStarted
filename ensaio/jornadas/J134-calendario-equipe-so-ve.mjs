// J134 — LZ9 (26/11/2026, ok do Chris: "pode fazer tudo"). A página calendario.html no modo da equipe (aberta com o login do
// Escritório) não grava em nenhum caso: as rules recusam a escrita do calendário por ela e a criação/revisão acontece na Central de
// Calendários (processo novo, 27/10). Para Chris e Amanda a página já mostrava o aviso e o link da Central; para o resto da equipe ela
// abria a edição, que falhava só na hora de salvar ("Não consegui confirmar o salvamento"). Esperado (contraprova vermelha antes):
//  1. a Cecília abre a página no modo da equipe e vê o calendário com o aviso "Esta página só mostra o calendário" e o link da Central;
//  2. o caminho de gravação da página recusa antes de tentar (nada sai para o servidor);
//  (o link do cliente não muda: J51 e J55 provam o modo do cliente.)
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J134';
export const nome = 'Calendário no modo da equipe só mostra (a Central é o lugar de criar e revisar); o link do cliente segue igual';
const CLIENTE = 'mochi', MES = '2027-03', TITULO = 'Ensaio J134 — conteúdo de março';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const atual = await seed.get('calendarios', CLIENTE) || {};
  const { id: _i, ...semId } = atual;
  await seed.set('calendarios', CLIENTE, { ...semId, items: (atual.items || []).filter(i => i?.name !== TITULO).concat([{ itemId: 'calitem_j134', name: TITULO, mes: MES, day: 5, stage: 'roteiro', fmt: 'reels', desc: 'Texto J134' }]) });
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&interno=1&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => ['equipe', 'bloqueado'].includes(window.__modoCal), null, { timeout: 45000 });
    await page.waitForTimeout(3000);
    const tela = await page.evaluate(t => ({ modo: window.__modoCal, aviso: document.getElementById('bloqueioAliasCentralR87')?.textContent || '',
      link: document.querySelector('#bloqueioAliasCentralR87 a')?.getAttribute('href') || '', calendario: /Março 2027 \(\d+\)/.test(document.body.innerText) /* outras jornadas também põem conteúdo em março */, trecho: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200) }), TITULO);
    fim('1 a Cecília vê o calendário com o aviso de que a página só mostra e o link da Central', tela.modo === 'equipe' && /só mostra o calendário/i.test(tela.aviso) && /central=calendarios/.test(tela.link) && tela.calendario,
      `modo ${tela.modo} · aviso "${tela.aviso.slice(0, 90) || '—'}" · link ${tela.link ? 'sim' : 'não'} · calendário ${tela.calendario ? 'visível' : 'NÃO visível: ' + tela.trecho}`);
    const gravacao = await page.evaluate(async () => { try { await window.__exigirAliasEditorialPermitidoR87(); return 'liberada'; } catch (e) { return 'recusada: ' + e.message; } });
    const depois = await seed.get('calendarios', CLIENTE) || {};
    fim('2 o caminho de gravação da página recusa antes de tentar', /^recusada/.test(gravacao) && (depois.items || []).some(i => i?.name === TITULO),
      gravacao.slice(0, 160));
    await foto(page, 'J134-equipe-so-ve');
    const graves = erros.filter(erroGrave);
    fim('3 sem erro grave', !graves.length, graves[0] ? String(graves[0]).slice(0, 300) : 'nenhum');
  } catch (e) { await foto(page, 'J134-falha'); fim('Calendário modo equipe', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { await fechar(); }
}
