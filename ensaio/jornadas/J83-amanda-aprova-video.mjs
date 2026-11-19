// J83 — CP230 (19/11/2026, pedido do Chris): "precisamos deixar que seja possível para a Amanda aprovar vídeos assim como eu faço".
// Antes (CP108): o servidor recusava — "A revisão principal de qualidade é do Chris. A Amanda organiza a postagem na fila dela."
// Agora: a Amanda clica "Aprovar" uma vez, o servidor confere (mesma assinatura e recibo) e o vídeo vai para o cliente,
// com aprovadoPor 'Amanda'. Mesmo caminho da J31 (Chris).
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J83';
export const nome = 'Amanda aprova a qualidade do vídeo com um clique, como o Chris';
const VID = 'j83-amanda-aprova';
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString(), hoje = agora.slice(0, 10);
  await seed.set('videos_producao', VID, {
    cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Ensaio J83 Amanda aprova', status: 'aguardando_aprovacao',
    data: hoje, editorAtribuido: 'Helo', editorAtribuidoEm: agora, editorAtribuidoPor: 'Amanda', enviadoEm: agora,
    linkFinalizado: 'drive.google.com/file/d/ensaio-j83/view', criadoEm: agora, excluido: false, nivelEscalonamento: 0,
  });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  const caso = 'Amanda clica Aprovar uma vez → vídeo vai para o cliente';
  try {
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
    await entrarGerencia(page);
    await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    const btn = page.locator(`[onclick*="aprovarVideo('${VID}')"]`).first();
    await btn.waitFor({ timeout: 15000 }); await btn.click();
    const v = await esperar(async () => { const x = await seed.get('videos_producao', VID); return x?.status === 'aguardando_cliente' ? x : null; });
    const toastTxt = await page.evaluate(() => [...document.querySelectorAll('.toast,[role=alert]')].map(t => t.innerText).filter(Boolean).slice(-2).join(' | '));
    const segundoBotao = await page.getByRole('button', { name: /Aprovar a qualidade do vídeo/ }).count();
    const graves = erros.filter(erroGrave);
    await foto(page, 'J83-amanda-aprova');
    registrar({ jornada: id, caso, ok: !!v && v.aprovadoPor === 'Amanda' && !graves.length, ms: Date.now() - t0,
      detalhe: (v ? `status ${v.status} · aprovadoPor ${v.aprovadoPor}` : 'continuou esperando o 2º clique ou travou na conferência') + ` · 2º botão na tela: ${segundoBotao} · tela: ${toastTxt.slice(0, 160)}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J83-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
  finally { await fechar(); }
}
