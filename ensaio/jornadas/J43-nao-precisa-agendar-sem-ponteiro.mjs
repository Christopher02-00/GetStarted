// J43 — "Não precisa agendar" funciona quando o item do calendário ainda não aponta para a postagem (urgente do Chris,
// 10/11/2026: Fedalto "VÍDEO 2 (ANÚNCIO DARK POST)" — "O item aponta para outra postagem. A pauta foi preservada.").
// O item nunca foi agendado, então não tem `postagemId`; a saída sem publicação exigia o ponteiro e recusava.
// Esperado: a Cecília retira com motivo → postagem arquivada_sem_postagem; o item do calendário fica intacto.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J43';
export const nome = '"Não precisa agendar" com item do calendário sem ponteiro para a postagem';
const CLIENTE = 'bluefit', VID = 'j43-video-dark-post', POST = 'video_j43-video-dark-post', ITEM = 'calitem_j43_dark_post';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString(), hoje = agora.slice(0, 10), mes = hoje.slice(0, 7);
  const cal = await seed.get('calendarios', CLIENTE) || { cliente: CLIENTE, client: 'Bluefit', items: [] };
  const { id: _x, ...semId } = cal;
  const items = [...(semId.items || []).filter(i => i?.itemId !== ITEM), { itemId: ITEM, mes, day: 28, name: 'Ensaio J43 — anúncio dark post', desc: 'Roteiro', legenda: 'Legenda J43', fmt: 'Reel', apr: true, aprPor: 'cliente', agendado: false, posted: false, gravado: true, excluido: false }];
  await seed.set('calendarios', CLIENTE, { ...semId, items });
  const origem = { calendarClienteSlug: CLIENTE, calendarItemId: ITEM, calendarCompetencia: mes };
  await seed.set('videos_producao', VID, { cliente: CLIENTE, clienteNome: 'Bluefit', titulo: 'Ensaio J43 — anúncio dark post', status: 'aprovado', data: hoje, editorAtribuido: 'Helo',
    editorAtribuidoEm: agora, editorAtribuidoPor: 'Amanda', linkFinalizado: 'https://drive.google.com/file/d/j43/view', clienteAprovou: true, postagemId: POST, criadoEm: agora, excluido: false, ...origem });
  await seed.set('postagens', POST, { videoId: VID, cliente: CLIENTE, clienteNome: 'Bluefit', titulo: 'Ensaio J43 — anúncio dark post', status: 'aguardando_agendamento', dataAgendada: '', legenda: 'Legenda J43',
    criadoEm: agora, excluido: false, ...origem });
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
    const b = page.locator(`[onclick*="marcarPostagemSemAgendamento('${POST}')"]`).first(); await b.waitFor({ timeout: 15000 }); await b.click();
    await page.locator('text=Encerrar sem publicação').first().waitFor({ timeout: 15000 });
    await page.locator('textarea:visible').last().fill('Anúncio dark post: vai só para tráfego, não é publicado no perfil.');
    await page.locator('button:visible').filter({ hasText: /^Encerrar sem publicar$/ }).last().click();
    const p = await esperar(async () => { const x = await seed.get('postagens', POST); return x?.status === 'arquivada_sem_postagem' ? x : null; });
    const it = ((await seed.get('calendarios', CLIENTE))?.items || []).find(i => i?.itemId === ITEM);
    const tela = await page.evaluate(() => (document.body.innerText.match(/[^\n]*aponta para outra postagem[^\n]*/) || [''])[0]);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J43-cecilia');
    const ok = !!p && !!it && it.excluido !== true && !it.postagemId && !graves.length;
    registrar({ jornada: id, caso: 'Cecília retira o anúncio da fila sem publicar', ok, ms: Date.now() - t0,
      detalhe: p ? `postagem arquivada_sem_postagem · item do calendário ${it && !it.excluido ? 'intacto' : 'alterado'}` : `não saiu da fila${tela ? ' · tela: ' + tela.trim() : ''}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J43-falha'); registrar({ jornada: id, caso: 'Cecília retira o anúncio da fila sem publicar', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 300) }); }
  finally { await fechar(); }
}
