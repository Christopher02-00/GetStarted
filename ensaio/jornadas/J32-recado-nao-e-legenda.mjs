// J32 — Recado no lugar da legenda não chega à Cecília (U2, 10/11/2026).
// Caso real: "Place — Vídeo telão" ganhou a legenda "Não precisa de legenda!!!!", passou no validador e caiu na
// fila de agendamento. Agora: (1) salvar esse texto é recusado com mensagem clara; (2) uma postagem antiga que já
// está na fila com recado aparece como legenda pendente, com o agendamento travado.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J32';
export const nome = 'Recado ("Não precisa de legenda") não vira legenda nem libera agendamento';
const RECADO = 'Não precisa de legenda!!!!';
const iso = d => d.toISOString(), dia = d => d.toISOString().slice(0, 10), mais = n => new Date(Date.now() + n * 86400000);
async function par(seed, pid, vid, titulo, status, legenda) {
  await seed.set('postagens', pid, { videoId: vid, cliente: 'mochi', clienteNome: 'Mochi', titulo, status, dataAgendada: '', legenda, criadoEm: iso(mais(-3)), excluido: false });
  await seed.set('videos_producao', vid, { cliente: 'mochi', clienteNome: 'Mochi', titulo, status: 'aprovado', data: dia(mais(-6)), editorAtribuido: 'Helo', editorAtribuidoEm: iso(mais(-5)), editorAtribuidoPor: 'Amanda', criadoEm: iso(mais(-5)), excluido: false, nivelEscalonamento: 0, postagemId: pid, aprovadoEm: iso(mais(-3)), aprovadoPor: 'Chris', clienteAprovou: true, clienteAprovouEm: iso(mais(-3)) });
}
export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await par(seed, 'j32-p-nova', 'j32-v-nova', 'Ensaio J32 vídeo telão', 'aguardando_legenda', '');
  await par(seed, 'j32-p-fila', 'j32-v-fila', 'Ensaio J32 telão antigo na fila', 'aguardando_agendamento', RECADO);
  await new Promise(r => setTimeout(r, 2500));
  // Caso 1 — Chris tenta salvar o recado como legenda
  { const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(); const caso = 'Chris salva "Não precisa de legenda" → recusado, fica em aguardando_legenda';
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
      await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
      await page.evaluate(() => mudarEtapaLegendasI66('videos'));
      await page.waitForSelector('#legenda_j32-p-nova', { timeout: 15000 });
      await page.fill('#legenda_j32-p-nova', RECADO);
      await page.evaluate(() => window.salvarLegenda('j32-p-nova'));
      await page.waitForTimeout(6000);
      const p = await seed.get('postagens', 'j32-p-nova');
      const tela = await page.evaluate(() => document.body.innerText);
      const avisou = /é um recado, não uma legenda/.test(tela);
      const graves = erros.filter(erroGrave);
      await foto(page, 'J32-chris-recado-recusado');
      registrar({ jornada: id, caso, ok: p?.status === 'aguardando_legenda' && !String(p?.legenda || '').trim() && avisou && !graves.length, ms: Date.now() - t0,
        detalhe: `status ${p?.status} · legenda ${JSON.stringify(p?.legenda || '')} · aviso na tela: ${avisou}` + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, 'J32-caso1-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
    finally { await fechar(); } }
  // Caso 2 — a postagem antiga com recado aparece pendente na fila da Cecília, com o agendamento travado
  { const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(); const caso = 'Cecília vê o recado antigo como legenda pendente, agendamento travado';
    try {
      await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
      await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
      const botao = page.locator(`[onclick*="salvarAgendamentoPostagem('j32-p-fila'"]`).first();
      await botao.waitFor({ timeout: 20000 }); await page.waitForTimeout(1500);
      const r = await botao.evaluate(b => { let card = b; while (card.parentElement && !card.querySelector('#dataPost_j32-p-fila')) card = card.parentElement;
        return { texto: (card.innerText || '').slice(0, 2500) + ' || ' + b.textContent, revisarLivre: !b.disabled && /^\s*Revisar agendamento\s*$/.test(b.textContent) }; });
      const pendente = /legenda pendente|complete a legenda/i.test(r.texto);
      const graves = erros.filter(erroGrave);
      await foto(page, 'J32-cecilia-fila');
      registrar({ jornada: id, caso, ok: pendente && !r.revisarLivre && !graves.length, ms: Date.now() - t0,
        detalhe: `pendência visível: ${pendente} · "Revisar agendamento" liberado: ${r.revisarLivre}` + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, 'J32-caso2-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
    finally { await fechar(); } }
}
