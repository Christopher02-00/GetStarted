// J80 — "Cancelar esse vídeo" no cartão "Precisa corrigir" (19/11/2026, Cecília, Cookiery "O Único Carrinho Que Interessa").
// A Cecília é a editora atribuída, aperta "Cancelar esse vídeo", escreve o motivo e nada acontece.
// Causa: o motivo era pedido pela caixinha nativa do navegador (prompt), que não aparecia no tablet → nada acontecia.
// Esperado (sem caixinha nativa): o motivo é escrito num campo do próprio cartão; o vídeo vai para a Lixeira (excluido:true, com motivo), sai de "Precisa corrigir" e a Amanda recebe o aviso.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J80';
export const nome = 'Editora cancela vídeo em "Precisa corrigir": vai para a Lixeira com o motivo e a Amanda é avisada';
const VID = 'j80-cookiery', TIT = 'Cookiery — Vídeo J80 para cancelar', MOTIVO = 'Cliente pediu para apagar (J80)';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('videos_producao', VID, { cliente: 'cookiery', clienteNome: 'Cookiery', titulo: TIT, status: 'correcao', editorAtribuido: 'Cecília',
    enviadoPor: 'Nathan', filmmaker: 'Nathan', excluido: false, avulso: true, linkOriginal: 'https://drive.google.com/file/d/j80/view',
    motivoCorrecao: '[Cliente pediu ajuste] Apagar site e drive', criadoEm: '2026-11-11T10:00:00.000Z' });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(), caso = 'Cecília cancela o vídeo em correção';
  try {
    // Tablet: a caixinha nativa (prompt) não aparece. Simula isso: o prompt volta vazio. O motivo vai no campo do cartão.
    let prompts = 0; page.on('dialog', d => { if (d.type() === 'prompt') { prompts++; d.dismiss(); } else d.accept(); });
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    await page.evaluate(async () => { const c = document.getElementById('videosMeus'); let p = c; while (p) { if (p.style) p.style.display = ''; p = p.parentElement; } await window.renderMeusVideos(); });
    const btn = page.locator('#videosMeus button', { hasText: 'Cancelar esse vídeo' }).first();
    await btn.waitFor({ state: 'attached', timeout: 20000 }); await btn.evaluate(el => el.click());
    const campo = page.locator('#cancelarVideoBox_' + VID + ' textarea'); await campo.waitFor({ state: 'attached', timeout: 10000 });
    await campo.evaluate((el, m) => { el.value = m; el.dispatchEvent(new Event('input', { bubbles: true })); }, MOTIVO);
    await page.locator('#cancelarVideoBox_' + VID + ' button', { hasText: 'Confirmar cancelamento' }).evaluate(el => el.click());
    let v = null; for (let i = 0; i < 20; i++) { await page.waitForTimeout(1000); v = await seed.get('videos_producao', VID); if (v?.excluido) break; }
    const aviso = (await seed.listar('demandas')).find(d => d.destinatario === 'Amanda' && d.videoId === VID && !d.excluido);
    const toast = await page.evaluate(() => [...document.querySelectorAll('.toast,[role=alert],[role=status]')].map(t => t.innerText).filter(Boolean).slice(-2).join(' | '));
    const aindaNaLista = await page.evaluate(t => (document.getElementById('videosMeus')?.innerText || '').includes(t), TIT);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J80-cecilia-cancelou');
    registrar({ jornada: id, caso, ok: v?.excluido === true && v.motivoExclusao === MOTIVO && v.excluidoPor === 'Cecília' && !!aviso && !aindaNaLista && !prompts && !graves.length, ms: Date.now() - t0,
      detalhe: `excluído ${v?.excluido === true ? 'sim' : 'NÃO'} · motivo ${v?.motivoExclusao === MOTIVO ? 'ok' : JSON.stringify(v?.motivoExclusao)} · aviso à Amanda ${aviso ? 'sim' : 'NÃO'} · na lista ${aindaNaLista ? 'AINDA' : 'não'} · caixinha nativa ${prompts ? 'USADA' : 'não'} · toast: ${toast.slice(0, 120)}` + (graves.length ? ' | ' + graves[0].slice(0, 200) : '') });
  } catch (e) { await foto(page, 'J80-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
