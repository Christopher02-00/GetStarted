// J137 — Volta de telas que a Amanda usava (27/11/2026). Demandas da Amanda ao Chris (26/11): "Não está aparecendo mais o quadro de
// campanha pra mim … voltar ele pra mim e pra Cecília acompanhar as datas e conferências de postagens de CAMPANHA" (saiu na LZ3e) e
// "Sumir da parte equipe - conferência individual de cada colaborador … onde eu podia ajustar prazos e observações" ("Ver ambiente de
// cada um", saiu na LZ5a). Esperado (contraprova vermelha no código da Limpeza):
//  1. a Amanda vê, na Gerência → Equipe, "Ver ambiente de cada um" e a tela mostra o ambiente de cada pessoa;
//  2. a Amanda abre o quadro de Campanhas pela Central ("Campanhas e datas" — o processo novo esconde o item do menu desde 27/10);
//  3. a Cecília também abre o quadro pela Central.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J137';
export const nome = 'Amanda tem de volta "Ver ambiente de cada um" e o quadro de Campanhas; a Cecília também vê Campanhas';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  let p = await nav.novaPagina();
  try {
    p.page.on('dialog', d => d.accept());
    await entrarComo(p.page, amb.url(), 'Amanda'); await p.page.waitForTimeout(3000);
    await p.page.evaluate(() => irPara('gerencia', document.getElementById('navitemGerencia')));
    await p.page.waitForFunction(() => !!document.getElementById('gerenciaAgora') && getComputedStyle(document.getElementById('gerenciaAgora')).display !== 'none', null, { timeout: 30000 }).catch(() => {});
    const temAba = await p.page.evaluate(() => !!document.querySelector('[data-sub="equipeVisao"]'));
    let txt = '';
    if (temAba) {
      await p.page.evaluate(() => setGerenciaSub('equipeVisao', document.querySelector('[data-sub="equipeVisao"]')));
      await p.page.waitForFunction(() => (document.getElementById('gerenciaEquipeVisao')?.innerText || '').length > 40, null, { timeout: 30000 }).catch(() => {});
      txt = await p.page.evaluate(() => document.getElementById('gerenciaEquipeVisao')?.innerText || '');
    }
    await foto(p.page, 'J137-ambiente');
    fim('1 a Amanda abre "Ver ambiente de cada um" e vê o ambiente da equipe', temAba && /Helo|Cecília|Luís|Nathan/.test(txt), `aba ${temAba ? 'sim' : 'NÃO'} · ${txt.replace(/\s+/g, ' ').slice(0, 120) || 'vazio'}`);
    // o processo novo (27/10) esconde o item do menu; a Amanda abre o quadro pela Central → "Campanhas e datas"
    const abriu = await p.page.evaluate(() => { try { return window.abrirAreaCentralR87('campanhas') !== false; } catch (e) { return 'erro: ' + e.message; } });
    const tela = await p.page.waitForFunction(() => { const v = document.getElementById('view-campanhas'); return v && getComputedStyle(v).display !== 'none' && v.innerText.length > 20; }, null, { timeout: 20000 }).then(() => true).catch(() => false);
    await foto(p.page, 'J137-campanhas');
    fim('2 a Amanda abre o quadro de Campanhas pela Central ("Campanhas e datas")', abriu === true && tela, `abrir ${abriu} · tela ${tela ? 'abriu' : 'não abriu'}`);
    const graves = p.erros.filter(erroGrave);
    fim('4 sem erro grave (Amanda)', !graves.length, graves[0] ? String(graves[0]).slice(0, 250) : 'nenhum');
  } catch (e) { await foto(p.page, 'J137-falha'); fim('Amanda', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { await p.fechar(); }
  p = await nav.novaPagina();
  try {
    await entrarComo(p.page, amb.url(), 'Cecília'); await p.page.waitForTimeout(3000);
    const abriu = await p.page.evaluate(() => { try { return window.abrirAreaCentralR87('campanhas') !== false; } catch (e) { return 'erro: ' + e.message; } });
    const tela = await p.page.waitForFunction(() => { const v = document.getElementById('view-campanhas'); return v && getComputedStyle(v).display !== 'none' && v.innerText.length > 20; }, null, { timeout: 20000 }).then(() => true).catch(() => false);
    fim('3 a Cecília abre o quadro de Campanhas pela Central', abriu === true && tela, `abrir ${abriu} · tela ${tela ? 'abriu' : 'não abriu'}`);
  } catch (e) { fim('3 Cecília', false, String(e).slice(0, 200)); }
  finally { await p.fechar(); }
}
