// J126 — CP271 (24/11/2026, Chris: "Pode" — tirar da Stokki o "Pedir mudança à Amanda"). Depois da CP269 a data é livre: o botão por
// plataforma não servia mais para agendar e repetia em todo cartão (vídeo do tablet da Cecília). Retirar uma plataforma com orientação
// da Amanda ainda precisa dela — essa saída passa a aparecer no próprio retirar (mesmo padrão do "Encerrar sem publicação").
// Esperado no painel "Stokki — publicações e conferências":
//  1. Cecília: nenhum "Pedir mudança à Amanda", nenhum bloco "Organização desta publicação" e nenhum "Pedidos e recados" vazio;
//  2. Amanda: o bloco continua com "Definir data, semana e prioridade";
//  3. Cecília clica "Retirar esta plataforma do plano": a conferência mostra "Combinar esta retirada com a Amanda", e o botão abre o
//     pedido à Amanda para retirar ESTA plataforma.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J126';
export const nome = 'Stokki: sem "Pedir mudança à Amanda" por plataforma; a combinação com a Amanda aparece no próprio retirar';

const rv = (x = {}) => ({ data: '', hora: '', retirada: false, publicadaEm: '', publicadaPor: '', url: '', checks: [], conferidaEm: '', conferidaPor: '', ...x });
const PID = 'j126-stokki-para-agendar';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('postagens', PID, { cliente: 'stokki', clienteNome: 'Stokki', titulo: 'Stokki — J126 para agendar', status: 'aguardando_agendamento', excluido: false, criadoEm: new Date(),
    linkVideo: 'https://drive.google.com/file/d/ensaio-j126/view', legendaInstagram: 'Ensaio J126 instagram #stokki', legendaTiktok: 'Ensaio J126 tiktok #stokki',
    publicacaoStokki: { versao: 1, revisao: 1, selecionadas: ['instagram', 'tiktok'], redes: { instagram: rv(), tiktok: rv() } } });
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const painel = async (pessoa, fn) => {
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.type() === 'prompt' ? d.accept('Ensaio J126: retirar') : d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await page.evaluate(() => window.abrirStokkiI30());
      await page.waitForSelector(`[data-stokki-post="${PID}"]`, { timeout: 25000 });
      await page.waitForTimeout(6000); // o bloco I165 e os pedidos chegam depois do desenho (consulta ao servidor)
      return await fn(page, erros);
    } catch (e) { await foto(page, `J126-${pessoa}-falha`); throw e; } finally { await fechar(); }
  };
  const cartao = page => page.evaluate(p => { const c = document.querySelector(`[data-stokki-post="${p}"]`); return c ? c.innerText : ''; }, PID);
  try {
    await painel('Cecília', async (page, erros) => {
      const t = await cartao(page); await foto(page, 'J126-cecilia-cartao');
      fim('1 Cecília: sem "Pedir mudança à Amanda", sem bloco de organização e sem "Pedidos e recados" vazio',
        t && !/Pedir mudança à Amanda/.test(t) && !/Organização desta publicação/.test(t) && !/Nenhum pedido registrado/.test(t),
        t ? (t.match(/Pedir mudança à Amanda|Organização desta publicação|Nenhum pedido registrado/g) || ['limpo']).join(', ') : 'cartão não apareceu');
      // 3. retirar uma plataforma: a conferência traz a combinação com a Amanda, e ela abre o pedido para ESTA plataforma
      const bloco = page.locator(`[data-stokki-post="${PID}"] [data-stokki-rede="instagram"]`);
      await bloco.locator('[data-stokki-acao="retirar"]').click();
      const combinar = page.locator(`[data-stokki-post="${PID}"] [data-fato165-pedir]`).first();
      await combinar.waitFor({ timeout: 20000 });
      const redeBotao = await combinar.getAttribute('data-rede');
      await combinar.click();
      await page.waitForFunction(p => /Pedir uma mudança para a Amanda/.test(document.querySelector(`[data-stokki-post="${p}"]`)?.innerText || ''), PID, { timeout: 20000 });
      const pedido = await page.evaluate(p => { const c = document.querySelector(`[data-stokki-post="${p}"]`); const t = c?.innerText || ''; const sel = c?.querySelector('[data-post165-campo="tipo"]');
        return { plataforma: (t.match(/Plataforma: (\w+)/) || [])[1] || '', tipo: sel?.value || '' }; }, PID);
      await foto(page, 'J126-cecilia-combinar-retirada');
      fim('3 retirar mostra "Combinar esta retirada com a Amanda" e abre o pedido de retirada desta plataforma',
        redeBotao === 'instagram' && pedido.plataforma.toLowerCase() === 'instagram' && pedido.tipo === 'cancelar', `botão rede=${redeBotao} · pedido ${JSON.stringify(pedido)}`);
      const graves = erros.filter(erroGrave);
      fim('4 sem erro grave no console (Cecília)', !graves.length, graves[0] || 'nenhum');
    });
    await painel('Amanda', async page => {
      const t = await cartao(page); await foto(page, 'J126-amanda-cartao');
      fim('2 Amanda: o bloco continua com "Definir data, semana e prioridade" e sem "Pedir mudança à Amanda"',
        /Organização desta publicação/.test(t) && /Definir data, semana e prioridade/.test(t) && !/Pedir mudança à Amanda/.test(t), (t.match(/Organização desta publicação|Definir data, semana e prioridade|Pedir mudança à Amanda/g) || []).join(', ') || 'nada');
    });
  } catch (e) { fim('painel da Stokki', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { try { const s = await seed.get('postagens', PID); if (s) { const { id: _i, ...d } = s; await seed.set('postagens', PID, { ...d, excluido: true }); } } catch (e) {} }
}
