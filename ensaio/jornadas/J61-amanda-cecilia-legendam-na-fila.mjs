// J61 — CP209 (12/11/2026, decisão do Chris): "Nem a Amanda, nem a Cecília conseguem pegar os conteúdos aprovados …
// estão bloqueadas". 23 vídeos aprovados parados em "aguardando legenda" e só Fernanda, Gabrielle e Chris podiam salvar a
// legenda na fila. Cecília e Amanda abrem a fila (Postagens → Legendas), escrevem a legenda e salvam → a postagem segue
// para o agendamento com a autoria certa. As regras do banco precisam aceitar a gravação (o portão falha se negar).
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J61';
export const nome = 'Amanda e Cecília escrevem a legenda na fila e o vídeo segue para o agendamento';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const casos = [['Cecília', 'j61-cecilia'], ['Amanda', 'j61-amanda']];
  for (const [, vid] of casos) {
    await seed.set('videos_producao', vid, { cliente: 'mochi', clienteNome: 'Mochi', titulo: 'Mochi — Vídeo aprovado ' + vid, status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: 'https://drive.google.com/file/d/Ensaio' + vid.replace(/-/g, '') + '/view', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', postagemId: 'video_' + vid, data: hoje, criadoEm: new Date(), excluido: false });
    await seed.set('postagens', 'video_' + vid, { videoId: vid, cliente: 'mochi', clienteNome: 'Mochi', titulo: 'Mochi — Vídeo aprovado ' + vid, linkVideo: 'https://drive.google.com/file/d/Ensaio' + vid.replace(/-/g, '') + '/view', legenda: '', status: 'aguardando_legenda', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', demandaLegendaCriada: true, excluido: false, criadoEm: new Date() });
  }
  await amb.aguardarFunctionsOciosas?.();
  for (const [pessoa, vid] of casos) {
    const post = 'video_' + vid, caso = pessoa + ' legenda na fila e envia ao agendamento';
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
      await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
      await page.evaluate(() => mudarEtapaLegendasI66('videos'));
      await page.waitForSelector(`#legenda_${post}`, { timeout: 20000 });
      const habilitado = await page.evaluate(id => { const t = document.getElementById('legenda_' + id); return !!t && !t.closest('fieldset')?.disabled && !t.disabled; }, post);
      if (!habilitado) { registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: 'campo de legenda BLOQUEADO para ' + pessoa }); continue; }
      const texto = `Legenda escrita por ${pessoa} no ensaio J61 — mochi de morango do dia. #mochi`;
      await page.fill(`#legenda_${post}`, texto);
      await page.evaluate(id => window.salvarLegenda(id), post);
      const p = await esperar(async () => { const x = await seed.get('postagens', post); return x?.status === 'aguardando_agendamento' ? x : null; });
      const graves = erros.filter(erroGrave);
      await foto(page, `J61-${pessoa}`);
      registrar({ jornada: id, caso, ok: !!p && p.legenda === texto && p.legendaPor === pessoa && !graves.length, ms: Date.now() - t0,
        detalhe: p ? `postagem ${p.status} · legenda por ${p.legendaPor}` : 'a legenda NÃO foi salva (postagem continua aguardando legenda)' + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, `J61-${pessoa}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
    finally { await fechar(); }
  }
}
