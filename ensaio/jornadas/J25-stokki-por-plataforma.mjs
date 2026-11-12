// J25 — Stokki por plataforma (P3): Amanda confirma o cliente → postagem nasce → Chris escolhe Instagram + TikTok e
// escreve uma legenda para cada → Cecília agenda as duas no painel da Stokki → confirma publicado no Instagram
// (status fica "agendado": falta o TikTok) → confirma no TikTok → status "postado".
// Cadastro da Stokki igual ao de produção (09/11): clienteInativo:false, tipoEntrega:postagem_completa.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J25';
export const nome = 'Stokki: legenda por plataforma → agendar por rede → publicar por rede';
const VID = 'v-stokki-j25'; // criado aqui sem editor; percorre o caminho real (como a J04) para nascer com os campos de produção
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
// Data/hora JÁ PASSADAS em São Paulo, sem depender do fuso do computador nem da virada da meia-noite
// (pendência de 10/11/2026: o CI rodou às 00:0x e "hoje 00:15" ainda era futuro → o servidor recusou "fato futuro").
const agoraSP = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value])); return { data: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) }; };
const ontemSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() - 86400000));
const passadoSP = () => { const a = agoraSP(); if (process.env.ENSAIO_MADRUGADA) a.min = 5; return a.min >= 40 ? { data: a.data, agenda: '00:01', publicada: '00:15' } : { data: ontemSP(), agenda: '23:30', publicada: '23:40' }; };
const hojeISO = () => passadoSP().data;

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('clientes_config', 'stokki', { modoAprovacaoCliente: 'manual', prazoTacitaHorasUteis: 24, whatsappCobranca: '', excluido: false, clienteInativo: false, tipoEntrega: 'postagem_completa' });
  const d = new Date(Date.now() - 6 * 86400000), dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await seed.set('videos_producao', VID, { cliente: 'stokki', clienteNome: 'Stokki', titulo: 'Ensaio J25 tour do showroom', status: 'aguardando_edicao', data: dia, editorAtribuido: '', excluido: false });
  const postagem = async () => (await seed.listar('postagens')).find(p => p.videoId === VID && !p.excluido);
  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.type() === 'prompt' ? d.accept('Ensaio J25') : d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await acao(page);
      const res = await verificar();
      const graves = erros.filter(erroGrave);
      await foto(page, `J25-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J25-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 240) }); return false; }
    finally { await fechar(); }
  };
  const abrirPainelStokki = async page => {
    await page.evaluate(() => window.abrirStokkiI30());
    await page.waitForSelector('[data-stokki-post]', { timeout: 20000 });
  };
  // Com o servidor ativo (I165) cada ação abre uma conferência no próprio cartão: marcar o que ela pede e confirmar.
  const confirmarNoCartao = async (page, pid, obrigatorio = true) => {
    const card = page.locator(`[data-stokki-post="${pid}"]`);
    const botao = card.getByRole('button', { name: /Confirmar ação nesta plataforma/ }).first();
    try { await botao.waitFor({ timeout: obrigatorio ? 15000 : 6000 }); } catch (e) { if (obrigatorio) throw e; return; }
    for (const cb of await card.locator('input[type=checkbox]:visible').all()) { if (!(await cb.isChecked()) && !(await cb.getAttribute('data-stokki-check'))) await cb.check().catch(() => {}); }
    await botao.scrollIntoViewIfNeeded(); await botao.click();
  };
  const redeNoPainel = (page, pid, rede) => page.locator(`[data-stokki-post="${pid}"] [data-stokki-rede="${rede}"]`);

  const video = async () => seed.get('videos_producao', VID);
  // 0a–0c. Mesmo caminho da J04: Amanda distribui → Helo entrega com link → Chris aprova a qualidade
  if (!await passo('0a Amanda distribui para Helo', 'Amanda', async page => {
    await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('videos'));
    await page.waitForSelector(`[data-i145-video-id="${VID}"] select.editorSelect`, { timeout: 15000 });
    await page.selectOption(`[data-i145-video-id="${VID}"] select.editorSelect`, 'Helo');
    await page.getByRole('button', { name: /Salvar alterações/ }).click({ timeout: 8000 });
  }, () => esperar(async () => (await video())?.editorAtribuido === 'Helo' ? 'editor Helo' : null))) return;
  if (!await passo('0b Helo entrega o vídeo', 'Helo', async page => {
    await page.evaluate(() => irPara('videos', document.getElementById('navVideos'))); await page.evaluate(() => setVideosSub('meus', null));
    await page.waitForSelector(`#link_${VID}`, { timeout: 15000 });
    await page.fill(`#link_${VID}`, 'https://drive.google.com/file/d/ensaio-j25-stokki/view');
    await page.evaluate(v => window.enviarVideoParaAprovacao(v), VID);
  }, () => esperar(async () => (await video())?.status === 'aguardando_aprovacao' ? 'aguardando_aprovacao' : null))) return;
  if (!await passo('0c Chris aprova a qualidade', 'Chris', async page => {
    await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    const btn = page.locator(`[onclick*="aprovarVideo('${VID}')"]`).first(); await btn.waitFor({ timeout: 15000 }); await btn.click();
    // U1 (10/11/2026): um clique só — conferência e aprovação na sequência (J31)
  }, () => esperar(async () => (await video())?.status === 'aguardando_cliente' ? 'aguardando_cliente' : null))) return;

  // 1. Amanda confirma que o cliente aprovou → postagem nasce
  if (!await passo('1 Amanda confirma cliente → postagem', 'Amanda', async page => {
    await entrarGerencia(page);
    await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    const btn = page.locator(`[onclick*="marcarClienteAprovouVideo('${VID}')"]`).first();
    await btn.waitFor({ timeout: 15000 }); await btn.click();
  }, () => esperar(async () => { const p = await postagem(); return p ? `postagem ${p.id} ${p.status}` : null; }))) return;
  const post = await postagem();

  // 1b. CP204 (11/11/2026, diretriz da Andrea): "gôndola" é termo proibido na Stokki → a legenda não segue; o formulário mostra a diretriz.
  if (!await passo('1b Chris usa termo proibido → recusado pela diretriz', 'Chris', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
    await page.evaluate(() => mudarEtapaLegendasI66('videos'));
    const form = page.locator(`[data-stokki-legendas="${post.id}"]`);
    await form.waitFor({ timeout: 20000 });
    await form.locator('[data-stokki-selecao="instagram"]').check();
    await page.fill(`#legenda_${post.id}_legendaInstagram`, 'Ensaio J25 — a ponta de gôndola do showroom Stokki. #stokki');
    await page.evaluate(p => window.salvarLegenda(p), post.id);
    await page.waitForFunction(() => /gôndola" é proibido na Stokki/.test(document.body.innerText), null, { timeout: 15000 });
  }, async () => { const p = await postagem(); return p?.status === 'aguardando_legenda' && !/g[oô]ndola/i.test(p.legendaInstagram || '') ? 'recusado · postagem segue aguardando legenda' : null; })) return;

  // 2. Chris escolhe Instagram + TikTok e escreve uma legenda para cada
  if (!await passo('2 Chris escreve legendas de Instagram e TikTok', 'Chris', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
    await page.evaluate(() => mudarEtapaLegendasI66('videos'));
    const form = page.locator(`[data-stokki-legendas="${post.id}"]`);
    await form.waitFor({ timeout: 20000 });
    for (const r of ['instagram', 'tiktok']) await form.locator(`[data-stokki-selecao="${r}"]`).check();
    await page.fill(`#legenda_${post.id}_legendaInstagram`, 'Ensaio J25 — Instagram: bastidores do showroom Stokki. #stokki');
    await page.fill(`#legenda_${post.id}_legendaTiktok`, 'Ensaio J25 — TikTok: um tour rápido pelo showroom! #stokki #tour');
    await page.evaluate(p => window.salvarLegenda(p), post.id);
  }, () => esperar(async () => { const p = await postagem(); const s = p?.publicacaoStokki; return p?.status === 'aguardando_agendamento' && String(s?.selecionadas) === 'instagram,tiktok' && /TikTok/.test(p.legendaTiktok || '') ? `aguardando_agendamento · redes ${s.selecionadas.join('+')}` : null; }))) return;

  // 3. Cecília agenda as duas redes
  if (!await passo('3 Cecília agenda Instagram e TikTok', 'Cecília', async page => {
    await abrirPainelStokki(page);
    for (const r of ['instagram', 'tiktok']) {
      const bloco = redeNoPainel(page, post.id, r); await bloco.waitFor({ timeout: 15000 });
      await bloco.locator('[data-stokki-data]').fill(hojeISO()); await bloco.locator('[data-stokki-hora]').fill(passadoSP().agenda);
      await bloco.locator('[data-stokki-acao="agendar"]').click();
      await confirmarNoCartao(page, post.id);
      const ok = await esperar(async () => (await postagem())?.publicacaoStokki?.redes?.[r]?.data ? true : null, 20000);
      if (!ok) throw new Error(`agendar ${r} não confirmou · painel: ` + (await page.evaluate(() => document.querySelector('[data-stokki-feedback]')?.innerText || '(sem mensagem)')).slice(0, 200));
      await page.waitForTimeout(1000);
    }
  }, () => esperar(async () => { const p = await postagem(); const rd = p?.publicacaoStokki?.redes || {}; return rd.instagram?.data && rd.tiktok?.data && p.status === 'agendado' ? `agendado · IG ${rd.instagram.hora} · TikTok ${rd.tiktok.hora}` : null; }))) return;

  // 4–5. Com o servidor ativo, publicação se confirma em Postagens → "Publicações para conferir" (o botão do painel só
  // redireciona). Uma confirmação por plataforma: Instagram primeiro (status fica "agendado"), depois TikTok ("postado").
  const confirmarPublicacao = async (page, rede, link) => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('confirmar', null));
    await page.waitForFunction(() => /Publicações para conferir · [1-9]/.test(document.getElementById('view-postagens')?.innerText || ''), null, { timeout: 25000 });
    await page.locator('#view-postagens button').filter({ hasText: /Conferir publicação real/ }).filter({ hasNotText: /Já foi/ }).first().click();
    // para a Stokki, a fila abre o painel por plataforma no contexto da conferência
    const bloco = redeNoPainel(page, post.id, rede); await bloco.waitFor({ timeout: 15000 });
    await bloco.locator('[data-stokki-url]').fill(link);
    await bloco.locator('[data-stokki-acao="publicar"]').click();
    await page.waitForTimeout(2500);
    // conferência do servidor: dia e hora reais (no passado; o servidor recusa fato futuro) e a prova
    const card = page.locator(`[data-stokki-post="${post.id}"]`);
    await card.locator('[data-post165-campo][type=date]:visible').last().fill(hojeISO());
    await card.locator('[data-post165-campo][type=time]:visible').last().fill(passadoSP().publicada);
    await card.locator('textarea[data-post165-campo]:visible').last().fill(link);
    await confirmarNoCartao(page, post.id, true);
  };
  if (!await passo('4 Cecília confirma Instagram publicado', 'Cecília', page => confirmarPublicacao(page, 'instagram', 'https://www.instagram.com/p/ensaio-j25/'),
    () => esperar(async () => { const p = await postagem(); const rd = p?.publicacaoStokki?.redes || {}; const n = [rd.instagram, rd.tiktok].filter(r => r?.publicadaEm).length; return n === 1 && p.status === 'agendado' ? `1 rede publicada (${rd.instagram?.publicadaEm ? 'Instagram' : 'TikTok'}) · status agendado` : null; }, 25000))) return;
  await passo('5 Cecília confirma a outra rede → postado', 'Cecília', page => confirmarPublicacao(page, 'tiktok', 'https://www.tiktok.com/@stokki/video/ensaio-j25'),
    () => esperar(async () => { const p = await postagem(); const rd = p?.publicacaoStokki?.redes || {}; return rd.instagram?.publicadaEm && rd.tiktok?.publicadaEm && p.status === 'postado' ? 'as duas redes publicadas · status postado' : null; }, 25000));
}
