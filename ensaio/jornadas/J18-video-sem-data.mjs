// J18 — Vídeo sem `data` (legado) não mostra "undefined" na tela de vídeos do editor (P5/F-17).
// Em produção os 1.101 vídeos têm data hoje, mas o campo é de legado e 6 templates imprimiam `${v.data}` cru.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J18';
export const nome = 'Vídeo sem data não mostra "undefined" na lista do editor';
const TITULO = 'Ensaio J18 vídeo legado sem data';
export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('videos_producao', 'j18-sem-data', {
    cliente: 'bluefit', clienteNome: 'Bluefit', titulo: TITULO, status: 'aguardando_edicao',
    editorAtribuido: 'Helo', editorAtribuidoEm: new Date().toISOString(), editorAtribuidoPor: 'Amanda', excluido: false,
  });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    await entrarComo(page, amb.url(), 'Helo'); await page.waitForTimeout(2500);
    await page.evaluate(() => { irPara('videos', document.getElementById('navVideos')); return setVideosSub('meus', document.querySelector('#view-videos .subtab')); });
    await page.waitForFunction(t => (document.getElementById('view-videos')?.innerText || '').includes(t), TITULO, { timeout: 20000 });
    await page.waitForTimeout(1500);
    const tela = await page.evaluate(() => document.getElementById('view-videos')?.innerText || '');
    const trecho = (tela.match(/.{0,60}undefined.{0,20}/) || [''])[0];
    const graves = erros.filter(erroGrave);
    await foto(page, 'J18-helo-meus-videos');
    registrar({ jornada: id, caso: 'Helo vê o vídeo sem data', ok: tela.includes(TITULO) && !trecho && !graves.length, ms: Date.now() - t0,
      detalhe: `vídeo na tela: ${tela.includes(TITULO)} · "undefined" na tela: ${trecho ? JSON.stringify(trecho.replace(/\s+/g, ' ')) : 'não'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J18-falha'); registrar({ jornada: id, caso: 'Helo vê o vídeo sem data', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
  finally { await fechar(); }
}
