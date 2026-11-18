// J61b — CP225 (18/11/2026): "Não estou conseguindo salvar a legenda solicitada para a Stokki" (Amanda) → "Missing or
// insufficient permissions". A tela deixa salvar (PAPEIS_LEGENDA_FILA_CP209), mas as rules da primeira legenda por
// plataforma da Stokki (dH) só aceitavam Gabrielle, Fernanda e Chris. Cada papel de "quem legenda" salva a primeira
// legenda de um vídeo aprovado: Stokki com as 4 redes, Stokki sem o postagemId no vídeo (legado) e vídeo comum sem
// vínculo de postagem. Todas passam para aguardando_agendamento e o vídeo fica com o postagemId.
// Contraprova: um editor (Helo) não legenda e vê a mensagem clara (sem "Missing or insufficient permissions").
// Roda logo depois da J61 (mesmo assunto): no fim da bateria o emulador tem centenas de postagens e a fila de legendas
// passa do tempo da tela ("Sem conexão com o servidor") no emulador, o que derrubava a jornada no CI.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J61b';
export const nome = 'Quem legenda salva a primeira legenda (Stokki 4 redes, legado, comum); editor continua barrado';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const REDES = [['instagram', 'legendaInstagram'], ['linkedin', 'legendaLinkedin'], ['tiktok', 'legendaTiktok'], ['youtube', 'legendaYoutube']];

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = new Date().toISOString().slice(0, 10);
  await seed.set('clientes_config', 'stokki', { modoAprovacaoCliente: 'manual', prazoTacitaHorasUteis: 24, whatsappCobranca: '', excluido: false, clienteInativo: false, tipoEntrega: 'postagem_completa' });
  const criar = async (vid, cliente, nomeCli, comPonteiro) => {
    const post = 'video_' + vid;
    await seed.set('videos_producao', vid, { cliente, clienteNome: nomeCli, titulo: nomeCli + ' — J61b ' + vid, status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: 'https://drive.google.com/file/d/Ensaio' + vid.replace(/-/g, '') + '/view', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', postagemId: comPonteiro ? post : '', data: hoje, criadoEm: new Date(), excluido: false });
    await seed.set('postagens', post, { videoId: vid, cliente, clienteNome: nomeCli, titulo: nomeCli + ' — J61b ' + vid, linkVideo: 'https://drive.google.com/file/d/Ensaio' + vid.replace(/-/g, '') + '/view', legenda: '', status: 'aguardando_legenda', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', demandaLegendaCriada: true, excluido: false, criadoEm: new Date() });
    return post;
  };
  const casos = [];
  for (const pessoa of ['Amanda', 'Cecília', 'Chris']) {
    const s = pessoa.normalize('NFD').replace(/[^a-z]/gi, '').toLowerCase();
    casos.push({ pessoa, tipo: 'Stokki 4 redes', post: await criar(`j61b-${s}-stokki`, 'stokki', 'Stokki', true), stokki: true });
    casos.push({ pessoa, tipo: 'Stokki sem ponteiro no vídeo', post: await criar(`j61b-${s}-stokki-leg`, 'stokki', 'Stokki', false), stokki: true });
    casos.push({ pessoa, tipo: 'vídeo comum sem ponteiro', post: await criar(`j61b-${s}-mochi`, 'mochi', 'Mochi', false), stokki: false });
  }
  const contra = { pessoa: 'Helo', tipo: 'contraprova editor', post: await criar('j61b-helo-stokki', 'stokki', 'Stokki', true), stokki: true };
  await amb.aguardarFunctionsOciosas?.();

  for (const c of [...casos, contra]) {
    const caso = `${c.pessoa} · ${c.tipo}`;
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(); const filaErro = [];
    try {
      page.on('dialog', d => d.accept());
      page.on('console', m => { if (/Falha ao confirmar a fila/.test(m.text())) filaErro.push(m.text()); });
      await entrarComo(page, amb.url(), c.pessoa); await page.waitForTimeout(2500);
      if (c === contra) {
        // O editor não tem a fila de legendas: chamar a gravação direto mostra a mensagem clara e não grava nada.
        const msg = await page.evaluate(async id => { const t = []; const o = window.mostrarToast; window.mostrarToast = (m, k) => { t.push(String(m)); try { o?.(m, k); } catch (e) {} }; try { await window.salvarLegenda?.(id); } catch (e) { t.push(String(e?.message || e)); } window.mostrarToast = o; return t.join(' | '); }, c.post);
        const p = await seed.get('postagens', c.post);
        registrar({ jornada: id, caso, ok: p.status === 'aguardando_legenda' && !/Missing or insufficient permissions/i.test(msg) && msg.length > 0, ms: Date.now() - t0, detalhe: `postagem ${p.status} · mensagem: ${msg.slice(0, 160)}` });
        continue;
      }
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
      await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
      await page.evaluate(() => mudarEtapaLegendasI66('videos'));
      const texto = `Conheça o showroom novo, com móveis planejados para cada cômodo da casa. Escrita por ${c.pessoa}. #j61b`;
      if (c.stokki) {
        const form = page.locator(`[data-stokki-legendas="${c.post}"]`); await form.waitFor({ timeout: 20000 });
        for (const [r, campo] of REDES) { await form.locator(`[data-stokki-selecao="${r}"]`).check(); await page.fill(`#legenda_${c.post}_${campo}`, `${texto} ${r}`); }
      } else {
        await page.waitForSelector(`#legenda_${c.post}`, { timeout: 20000 });
        await page.fill(`#legenda_${c.post}`, texto);
      }
      const toasts = [];
      page.on('console', m => { if (/Falha ao confirmar|Legenda recusada|permiss/i.test(m.text())) toasts.push(m.text()); });
      await page.evaluate(id => window.salvarLegenda(id), c.post);
      const p = await esperar(async () => { const x = await seed.get('postagens', c.post); return x?.status === 'aguardando_agendamento' ? x : null; });
      const v = await seed.get('videos_producao', c.post.replace(/^video_/, ''));
      // Vídeo legado sem ponteiro: a tela pede a confirmação manual e grava pelo corredor V123, sem publicacaoStokki (desenho atual).
      const redesOk = !c.stokki || (c.tipo.includes('sem ponteiro') ? !p?.publicacaoStokki : String(p?.publicacaoStokki?.selecionadas) === 'instagram,linkedin,tiktok,youtube');
      const graves = erros.filter(erroGrave);
      await foto(page, `J61b-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!p && p.legendaPor === c.pessoa && redesOk && v?.postagemId === c.post && !graves.length, ms: Date.now() - t0,
        detalhe: p ? `postagem ${p.status} · por ${p.legendaPor} · redes ${p.publicacaoStokki?.selecionadas?.join('+') || '-'} · vídeo.postagemId ${v?.postagemId || '(vazio)'}` : 'NÃO salvou · ' + (toasts.slice(-1)[0] || graves[0] || erros.slice(-1)[0] || '').slice(0, 200) });
    } catch (e) { await foto(page, `J61b-${c.pessoa}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: (filaErro[0] ? 'fila: ' + filaErro[0].slice(0, 300) + ' · ' : '') + String(e).replace(/\s+/g, ' ').slice(0, 200) }); }
    // a tela segue gravando em segundo plano (baixa da demanda da legenda): fechar antes deixa a trava da transação presa
    finally { await page.waitForTimeout(3000).catch(() => {}); await fechar(); await amb.aguardarFunctionsOciosas?.(); }
  }
}
