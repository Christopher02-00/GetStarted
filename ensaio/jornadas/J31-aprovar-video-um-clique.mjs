// J31 — Aprovação de vídeo em UM clique (U1, pedido do Chris 09–10/11/2026).
// O vídeo chega com o link colado sem "https://" (caso real de editor). Antes: o painel exigia um 2º botão
// ("Aprovar a qualidade do vídeo") e esse link travava a conferência no front ("não consigo aprovar").
// Agora: um clique em "Aprovar" confere no servidor (mesma assinatura e recibo) e já aprova.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J31';
export const nome = 'Chris aprova a qualidade do vídeo com um clique (link sem https não trava)';
const VID = 'j31-link-sem-https';
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString(), hoje = agora.slice(0, 10);
  await seed.set('videos_producao', VID, {
    cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Ensaio J31 aprovação em um clique', status: 'aguardando_aprovacao',
    data: hoje, editorAtribuido: 'Helo', editorAtribuidoEm: agora, editorAtribuidoPor: 'Amanda', enviadoEm: agora,
    linkFinalizado: 'drive.google.com/file/d/ensaio-j31/view', criadoEm: agora, excluido: false, nivelEscalonamento: 0,
  });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  const caso = 'Chris clica Aprovar uma vez → vídeo vai para o cliente';
  try {
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
    await entrarGerencia(page);
    await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    const btn = page.locator(`[onclick*="aprovarVideo('${VID}')"]`).first();
    await btn.waitFor({ timeout: 15000 }); await btn.click();
    const v = await esperar(async () => { const x = await seed.get('videos_producao', VID); return x?.status === 'aguardando_cliente' ? x : null; });
    const segundoBotao = await page.getByRole('button', { name: /Aprovar a qualidade do vídeo/ }).count();
    const graves = erros.filter(erroGrave);
    await foto(page, 'J31-um-clique');
    registrar({ jornada: id, caso, ok: !!v && v.aprovadoPor === 'Chris' && !graves.length, ms: Date.now() - t0,
      detalhe: (v ? `status ${v.status} · aprovadoPor ${v.aprovadoPor}` : 'continuou esperando o 2º clique ou travou na conferência') + ` · 2º botão na tela: ${segundoBotao}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J31-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
  finally { await fechar(); }
}
