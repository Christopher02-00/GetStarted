// J136 — Volta do Acompanhamento (27/11/2026). A Cecília perguntou por que não conseguia mais marcar os vídeos que já foram gravados:
// a LZ7a (Limpeza 2027) tirou o bloco "organização" do Acompanhamento achando que não tinha dados — o export só lista o nível de cima
// e a marcação fica em gravacoes_cliente/{cliente}/meses/{mês}/itens (subcoleção). Esperado (contraprova vermelha no código da LZ7a):
//  1. o Início da Cecília tem o cartão "Gravações e acompanhamento";
//  2. no Acompanhamento ela escolhe cliente e mês e o editor dela abre com "Marcar gravado" nos conteúdos;
//  3. os filmmakers voltam a ver o item Acompanhamento no menu.
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J136';
export const nome = 'Acompanhamento de volta: a Cecília marca o que foi gravado (bloco de organização) e os filmmakers veem o item';
const CLIENTE = 'bluefit', MES = '2026-12';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const cal = await seed.get('calendarios', CLIENTE);
  if (!(cal?.items || []).some(i => i && i.mes === MES && !i.excluido)) { fim('preparação', false, 'depende da J06 (dezembro da Bluefit)'); return; }
  let p = await nav.novaPagina();
  try {
    p.page.on('dialog', d => d.accept());
    await entrarComo(p.page, amb.url(), 'Cecília'); await p.page.waitForTimeout(3500);
    const cartao = await p.page.evaluate(() => document.getElementById('gravacoesInicioI61')?.textContent || '');
    fim('1 o Início da Cecília tem o cartão de gravações e acompanhamento', /Gravações e acompanhamento/i.test(cartao), cartao ? cartao.slice(0, 80) : 'cartão ausente');
    await p.page.evaluate(() => irPara('acompanhamento', document.getElementById('navAcompanhamento')));
    const temSeletor = await p.page.waitForFunction(() => document.getElementById('g61Cliente')?.options?.length > 1, null, { timeout: 30000 }).then(() => true).catch(() => false);
    let botoes = 0, aviso = '';
    if (temSeletor) {
      await p.page.evaluate(({ c, m }) => { const s = document.getElementById('g61Cliente'), me = document.getElementById('g61Mes'); me.value = m; me.dispatchEvent(new Event('change')); s.value = c; s.dispatchEvent(new Event('change')); }, { c: CLIENTE, m: MES });
      await p.page.waitForFunction(() => [...document.querySelectorAll('#g61Conteudos button')].some(b => /Marcar gravado/.test(b.textContent)), null, { timeout: 30000 }).catch(() => {});
      ({ botoes, aviso } = await p.page.evaluate(() => ({ botoes: [...document.querySelectorAll('#g61Conteudos button')].filter(b => /Marcar gravado/.test(b.textContent)).length, aviso: document.getElementById('g61Aviso')?.textContent || '' })));
    }
    await foto(p.page, 'J136-cecilia-acompanhamento');
    fim('2 a Cecília escolhe cliente e mês e o editor abre com "Marcar gravado"', temSeletor && botoes > 0, `seletor ${temSeletor ? 'sim' : 'NÃO'} · botões "Marcar gravado" ${botoes} · ${aviso.slice(0, 100)}`);
    const graves = p.erros.filter(erroGrave);
    fim('4 sem erro grave (Cecília)', !graves.length, graves[0] ? String(graves[0]).slice(0, 250) : 'nenhum');
  } catch (e) { await foto(p.page, 'J136-falha'); fim('Cecília no Acompanhamento', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { await p.fechar(); }
  p = await nav.novaPagina();
  try {
    await entrarComo(p.page, amb.url(), 'Luís'); await p.page.waitForTimeout(3000);
    const visivel = await p.page.evaluate(() => { const n = document.getElementById('navAcompanhamento'); return !!n && getComputedStyle(n).display !== 'none'; });
    fim('3 o Luís (filmmaker) vê o item Acompanhamento no menu', visivel, visivel ? 'visível' : 'escondido');
  } catch (e) { fim('3 filmmaker', false, String(e).slice(0, 200)); }
  finally { await p.fechar(); }
}
