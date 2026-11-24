// J125 — CP270 (24/11/2026, vídeo do Chris do tablet da Cecília: "a Cecília precisa tirar os vídeos que já foram postados senão eles vão
// ficar todos misturados"). Caso real (export 23/11): 4 vídeos de outubro já postados ficavam na lista de trabalho porque 11 de 12
// plataformas foram confirmadas pelo Sistema (CP262, prova automaticaCp262) — a fila CP125 não pede os 8 itens dessas, o painel pedia.
// Esperado no painel "Stokki — publicações e conferências", como a Cecília:
//  1. vídeo postado só com plataformas confirmadas pelo Sistema NÃO aparece na lista de trabalho (vai para "concluídos");
//  2. a lista vem por etapa, nesta ordem: Para agendar → Agendadas → Já publicadas (só a conferência);
//  3. no vídeo misto, a plataforma do Sistema diz "conferência dispensada" e não mostra as 8 caixinhas abertas; a de pessoa mostra;
//  4. o botão de histórico mostra o vídeo concluído, no grupo "Concluídos e retirados".
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J125';
export const nome = 'Stokki: o que já foi publicado sai da lista de trabalho da Cecília e a lista vem por etapa';

const rv = (x = {}) => ({ data: '', hora: '', retirada: false, publicadaEm: '', publicadaPor: '', url: '', checks: [], conferidaEm: '', conferidaPor: '', ...x });
const dia = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const SIS = 'Sistema (confirmação automática)';
const auto = () => ({ automaticaCp262: true, por: SIS, em: new Date(Date.now() - 864e5).toISOString() });
const POSTS = {
  // 1) postado, todas as plataformas confirmadas pelo Sistema (como "engenharia de processos")
  'j125-postado-sistema': { titulo: 'Stokki — J125 postado pelo Sistema', status: 'postado', sel: ['instagram', 'linkedin'],
    redes: { instagram: rv({ data: dia(-30), hora: '10:00', publicadaEm: new Date(Date.now() - 864e5).toISOString(), publicadaPor: SIS }),
      linkedin: rv({ data: dia(-30), hora: '11:00', publicadaEm: new Date(Date.now() - 864e5).toISOString(), publicadaPor: SIS }) },
    provas: { instagram: auto(), linkedin: auto() } },
  // 2) postado, uma confirmada por pessoa (conferência real) + uma pelo Sistema (como "O mito do Volume")
  'j125-postado-misto': { titulo: 'Stokki — J125 falta conferir', status: 'postado', sel: ['instagram', 'tiktok'],
    redes: { instagram: rv({ data: dia(-28), hora: '10:00', publicadaEm: new Date(Date.now() - 20 * 864e5).toISOString(), publicadaPor: 'Chris' }),
      tiktok: rv({ data: dia(-28), hora: '12:00', publicadaEm: new Date(Date.now() - 864e5).toISOString(), publicadaPor: SIS }) },
    provas: { tiktok: auto() } },
  // 3) agendada no futuro, ainda não publicada
  'j125-agendada': { titulo: 'Stokki — J125 agendada', status: 'agendado', sel: ['youtube'], redes: { youtube: rv({ data: dia(5), hora: '09:00' }) } },
  // 4) para agendar (sem data), como "Ranqueando práticas"
  'j125-para-agendar': { titulo: 'Stokki — J125 para agendar', status: 'aguardando_agendamento', sel: ['instagram', 'tiktok'],
    redes: { instagram: rv(), tiktok: rv() } },
};

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  for (const [pid, x] of Object.entries(POSTS))
    await seed.set('postagens', pid, { cliente: 'stokki', clienteNome: 'Stokki', titulo: x.titulo, status: x.status, excluido: false, criadoEm: new Date(),
      linkVideo: 'https://drive.google.com/file/d/ensaio-j125/view', legendaInstagram: 'Ensaio J125 instagram #stokki', legendaTiktok: 'Ensaio J125 tiktok #stokki',
      legendaLinkedin: 'Ensaio J125 linkedin', legendaYoutube: 'Ensaio J125 youtube',
      publicacaoStokki: { versao: 1, revisao: 1, selecionadas: x.sel, redes: x.redes }, ...(x.provas ? { provasPublicacaoI165: x.provas } : {}) });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  const fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    await page.evaluate(() => window.abrirStokkiI30());
    await page.waitForSelector('[data-stokki-post="j125-para-agendar"]', { timeout: 25000 });
    await page.waitForTimeout(1500);
    const lista = () => page.evaluate(() => [...document.querySelectorAll('[data-stokki-post], [data-stokki-etapa]')]
      .map(e => e.dataset.stokkiPost ? 'post:' + e.dataset.stokkiPost : 'etapa:' + e.dataset.stokkiEtapa + ':' + e.textContent.trim()));
    const l1 = await lista(), meus = l1.filter(x => /j125|etapa:/.test(x));
    await foto(page, 'J125-lista-de-trabalho');
    fim('1 vídeo postado só com plataformas do Sistema não fica na lista de trabalho', !l1.includes('post:j125-postado-sistema'),
      `lista: ${meus.join(' | ')}`);
    const pos = k => l1.indexOf('post:' + k), et = n => l1.findIndex(x => x.startsWith('etapa:' + n + ':'));
    fim('2 lista por etapa: Para agendar → Agendadas → Já publicadas',
      et(0) >= 0 && et(0) < pos('j125-para-agendar') && pos('j125-para-agendar') < et(1) && et(1) < pos('j125-agendada') && pos('j125-agendada') < et(2) && et(2) < pos('j125-postado-misto'),
      `ordem: ${meus.join(' | ')}`);
    const misto = await page.evaluate(() => {
      const card = document.querySelector('[data-stokki-post="j125-postado-misto"]'); if (!card) return null;
      const rede = r => card.querySelector(`[data-stokki-rede="${r}"]`);
      // aberta = não está dentro de um <details> fechado (no Chromium atual o conteúdo fechado ainda tem offsetParent)
      const visiveis = r => [...(rede(r)?.querySelectorAll('[data-stokki-check]') || [])].filter(c => { for (let d = c.closest('details'); d; d = d.parentElement?.closest('details')) if (!d.open) return false; return true; }).length;
      return { tk: rede('tiktok')?.innerText.split('\n')[0] || '', tkCaixas: visiveis('tiktok'), igCaixas: visiveis('instagram') };
    });
    fim('3 no vídeo misto: Sistema = conferência dispensada (sem caixinhas abertas); pessoa = 8 caixinhas',
      misto && /dispensada/i.test(misto.tk) && misto.tkCaixas === 0 && misto.igCaixas === 8, JSON.stringify(misto));
    await page.locator('[data-stokki-historico]').click(); await page.waitForTimeout(1500);
    const l2 = await lista();
    await foto(page, 'J125-com-historico');
    fim('4 com o histórico, o vídeo concluído aparece em "Concluídos e retirados"',
      l2.includes('post:j125-postado-sistema') && l2.findIndex(x => x.startsWith('etapa:3:')) >= 0 && l2.findIndex(x => x.startsWith('etapa:3:')) < l2.indexOf('post:j125-postado-sistema'),
      `com histórico: ${l2.filter(x => /j125|etapa:/.test(x)).join(' | ')}`);
    const graves = erros.filter(erroGrave);
    fim('5 sem erro grave no console', !graves.length, graves[0] || 'nenhum');
  } catch (e) { await foto(page, 'J125-falha'); fim('painel da Stokki', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally {
    await fechar();
    // limpeza de cortesia: o emulador às vezes devolve "Transaction lock timeout" logo depois do painel; não é parte da prova
    for (const pid of Object.keys(POSTS)) { try { const s = await seed.get('postagens', pid); if (s) { const { id: _i, ...d } = s; await seed.set('postagens', pid, { ...d, excluido: true }); } } catch (e) {} }
  }
}
