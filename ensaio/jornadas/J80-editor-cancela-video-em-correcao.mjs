// J80 — "Cancelar esse vídeo" no cartão "Precisa corrigir" (19/11/2026, Cecília, Cookiery "O Único Carrinho Que Interessa").
// A Cecília era a editora atribuída, apertou "Cancelar esse vídeo", escreveu o motivo e nada aconteceu. Desde a CP242 (20/11) a
// Cecília não edita mais: a jornada usa a Helo (o cartão é o mesmo para todo editor).
// Causa: o motivo era pedido pela caixinha nativa do navegador (prompt), que não aparecia no tablet → nada acontecia.
// Esperado (sem caixinha nativa): o motivo é escrito num campo do próprio cartão; o vídeo vai para a Lixeira (excluido:true, com motivo), sai de "Precisa corrigir" e a Amanda recebe o aviso.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J80';
export const nome = 'Editora cancela vídeo em "Precisa corrigir": vai para a Lixeira com o motivo e a Amanda é avisada';
const VID = 'j80-cookiery', TIT = 'Cookiery — Vídeo J80 para cancelar', MOTIVO = 'Cliente pediu para apagar (J80)';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('videos_producao', VID, { cliente: 'cookiery', clienteNome: 'Cookiery', titulo: TIT, status: 'correcao', editorAtribuido: 'Helo',
    enviadoPor: 'Nathan', filmmaker: 'Nathan', excluido: false, avulso: true, linkOriginal: 'https://drive.google.com/file/d/j80/view',
    motivoCorrecao: '[Cliente pediu ajuste] Apagar site e drive', criadoEm: '2026-11-11T10:00:00.000Z' });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(), caso = 'Editora (Helo) cancela o vídeo em correção';
  try {
    // Tablet: a caixinha nativa (prompt) não aparece. Simula isso: o prompt volta vazio. O motivo vai no campo do cartão.
    let prompts = 0; page.on('dialog', d => { if (d.type() === 'prompt') { prompts++; d.dismiss(); } else d.accept(); });
    await entrarComo(page, amb.url(), 'Helo'); await page.waitForTimeout(2500);
    await page.evaluate(async () => { const c = document.getElementById('videosMeus'); let p = c; while (p) { if (p.style) p.style.display = ''; p = p.parentElement; } await window.renderMeusVideos(); });
    const btn = page.locator('#videosMeus button', { hasText: 'Cancelar esse vídeo' }).first();
    await btn.waitFor({ state: 'attached', timeout: 20000 }); await page.waitForTimeout(3000);
    // A lista pode se redesenhar enquanto a caixa está aberta (bateria inteira é mais lenta): abre, preenche e confirma de novo se sumir.
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      await page.locator('#videosMeus button', { hasText: 'Cancelar esse vídeo' }).first().evaluate(el => el.click());
      const campo = page.locator('#cancelarVideoBox_' + VID + ' textarea'); if (!await campo.waitFor({ state: 'attached', timeout: 10000 }).then(() => true).catch(() => false)) continue;
      await campo.evaluate((el, m) => { el.value = m; el.dispatchEvent(new Event('input', { bubbles: true })); }, MOTIVO);
      const ok = page.locator('#cancelarVideoBox_' + VID + ' button', { hasText: 'Confirmar cancelamento' }); if (!await ok.count()) continue;
      await ok.evaluate(el => el.click());
      let feito = false; for (let i = 0; i < 30 && !feito; i++) { await page.waitForTimeout(1000); feito = (await seed.get('videos_producao', VID))?.excluido === true; }
      if (feito) break;
    }
    let v = null; for (let i = 0; i < 20; i++) { await page.waitForTimeout(1000); v = await seed.get('videos_producao', VID); if (v?.excluido) break; }
    // O aviso à Amanda e o redesenho da lista vêm logo depois da exclusão; na bateria inteira levam alguns segundos.
    let aviso = null; for (let i = 0; i < 20 && !aviso; i++) { aviso = (await seed.listar('demandas')).find(d => d.destinatario === 'Amanda' && d.videoId === VID && !d.excluido); if (!aviso) await page.waitForTimeout(1000); }
    await page.waitForFunction(t => !(document.getElementById('videosMeus')?.innerText || '').includes(t), TIT, { timeout: 15000 }).catch(() => {});
    const toast = await page.evaluate(() => [...document.querySelectorAll('.toast,[role=alert],[role=status]')].map(t => t.innerText).filter(Boolean).slice(-2).join(' | '));
    const aindaNaLista = await page.evaluate(t => (document.getElementById('videosMeus')?.innerText || '').includes(t), TIT);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J80-cecilia-cancelou');
    registrar({ jornada: id, caso, ok: v?.excluido === true && v.motivoExclusao === MOTIVO && v.excluidoPor === 'Helo' && !!aviso && !aindaNaLista && !prompts && !graves.length, ms: Date.now() - t0,
      detalhe: `excluído ${v?.excluido === true ? 'sim' : 'NÃO'} · motivo ${v?.motivoExclusao === MOTIVO ? 'ok' : JSON.stringify(v?.motivoExclusao)} · aviso à Amanda ${aviso ? 'sim' : 'NÃO'} · na lista ${aindaNaLista ? 'AINDA' : 'não'} · caixinha nativa ${prompts ? 'USADA' : 'não'} · toast: ${toast.slice(0, 120)}` + (graves.length ? ' | ' + graves[0].slice(0, 200) : '') });
  } catch (e) { await foto(page, 'J80-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
