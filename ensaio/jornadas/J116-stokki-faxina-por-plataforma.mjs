// J116 — CP262 (23/11/2026, pedido do Chris: concluir o antigo do mês passado na área da Cecília — o problema do "já postado" da Stokki — e
// nunca mais acumular). A faxina confirma sozinha a postagem agendada cuja data passou há 2 dias; a Stokki (por plataforma) ficava de fora e
// acumulava (9 plataformas de outubro em 22/11). Agora a mesma regra vale por plataforma, pelo caminho oficial. Esperado:
//  1. a plataforma vencida fica publicada pelo Sistema, com prova (automática); a conferência de 8 itens NÃO é marcada; a outra continua pendente;
//  2. a plataforma confirmada sai da fila "Publicações para conferir" da Cecília; a pendente continua lá;
//  3. com todas confirmadas, a postagem vira "postado" e o vídeo conclui (como na confirmação manual);
//  4. repetir não muda nada (idempotente);
//  5. a faxina chama a confirmação para a plataforma vencida (ligação) e não toca a que ainda não venceu.
// A postagem nasce pelo caminho real (passos da J25): distribuição → entrega → qualidade → cliente → legendas por plataforma → agendamento.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { adminDb } from '../lib/chegada.mjs';
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J116';
export const nome = 'Stokki: a faxina confirma por plataforma a publicação vencida (conferência dispensada e marcada) e a fila da Cecília esvazia';
const VID = 'v-stokki-j116';
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
  await seed.set('videos_producao', VID, { cliente: 'stokki', clienteNome: 'Stokki', titulo: 'Ensaio J116 confirmação automática', status: 'aguardando_edicao', data: dia, editorAtribuido: '', excluido: false });
  const postagem = async () => (await seed.listar('postagens')).find(p => p.videoId === VID && !p.excluido);
  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.type() === 'prompt' ? d.accept('Ensaio J116') : d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await acao(page);
      const res = await verificar();
      const graves = erros.filter(erroGrave);
      await foto(page, `J116-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J116-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 240) }); return false; }
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

  // 2. Chris escolhe Instagram + TikTok e escreve uma legenda para cada
  if (!await passo('2 Chris escreve legendas de Instagram e TikTok', 'Chris', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
    await page.evaluate(() => mudarEtapaLegendasI66('videos'));
    const form = page.locator(`[data-stokki-legendas="${post.id}"]`);
    await form.waitFor({ timeout: 20000 });
    for (const r of ['instagram', 'tiktok']) await form.locator(`[data-stokki-selecao="${r}"]`).check();
    await page.fill(`#legenda_${post.id}_legendaInstagram`, 'Ensaio J116 — Instagram: bastidores do showroom Stokki. #stokki');
    await page.fill(`#legenda_${post.id}_legendaTiktok`, 'Ensaio J116 — TikTok: um tour rápido pelo showroom! #stokki #tour');
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

  const db = adminDb(amb), t1 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t1, detalhe });
  const cp = await import(pathToFileURL(path.join(RAIZ, 'functions-get/stokki-confirmacao-automatica-cp262.mjs')).href);
  const filaCecilia = async () => { const { page, fechar } = await nav.novaPagina(); try {
      await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('confirmar', null); } catch (e) {} });
      await page.waitForFunction(() => /Lista conferida na origem|Não consegui conferir/.test(document.getElementById('filaPublicacoesCp125')?.innerText || ''), null, { timeout: 60000 });
      return await page.evaluate(pid => [...document.querySelectorAll('#filaPublicacoesCp125 article[data-cp125-key]')].map(a => a.dataset.cp125Key).filter(k => k.includes(pid)), post.id);
    } finally { await fechar(); } };
  try {
    const hoje = hojeISO();
    // 1) Instagram vencido (limite = hoje): publicado pelo Sistema, conferência dispensada; TikTok pendente
    const x1 = await cp.confirmarRedeStokkiAutomaticaCp262(db, post.id, 'instagram', { limite: hoje });
    const p1 = await postagem(), ig = p1?.publicacaoStokki?.redes?.instagram || {}, tk = p1?.publicacaoStokki?.redes?.tiktok || {};
    fim('1 a plataforma vencida fica publicada pelo Sistema, com prova automática (8 itens não marcados); a outra continua pendente',
      x1.acao === 'publicada' && !!ig.publicadaEm && ig.publicadaPor === cp.POR_CP262 && !ig.conferidaEm && (ig.checks || []).length === 0 && p1.provasPublicacaoI165?.instagram?.automaticaCp262 === true && !tk.publicadaEm && p1.status === 'agendado',
      `ação ${x1.acao} · Instagram ${ig.publicadaEm ? 'publicado por ' + ig.publicadaPor : 'NÃO publicado'} · 8 itens ${ig.conferidaEm ? 'MARCADOS' : 'não marcados'} · prova ${p1.provasPublicacaoI165?.instagram?.automaticaCp262 ? 'automática' : 'AUSENTE'} · TikTok ${tk.publicadaEm ? 'PUBLICADO' : 'pendente'} · status ${p1?.status}`);
    // 2) fila da Cecília: Instagram saiu, TikTok continua
    const fila = await filaCecilia();
    fim('2 a plataforma confirmada sai da fila da Cecília; a pendente continua', !fila.some(k => k.includes('instagram')) && fila.some(k => k.includes('tiktok')), `linhas desta postagem na fila: ${fila.join(', ') || 'nenhuma'}`);
    // 3) TikTok: postado e vídeo concluído
    const x3 = await cp.confirmarRedeStokkiAutomaticaCp262(db, post.id, 'tiktok', { limite: hoje });
    const p3 = await postagem(), v3 = await video();
    fim('3 com todas confirmadas, a postagem vira postado e o vídeo conclui', x3.acao === 'publicada' && x3.concluiu === true && p3?.status === 'postado' && v3?.status === 'finalizado',
      `ação ${x3.acao} · status ${p3?.status} · vídeo ${v3?.status}`);
    // 4) idempotente
    const x4 = await cp.confirmarRedeStokkiAutomaticaCp262(db, post.id, 'tiktok', { limite: hoje }), p4 = await postagem();
    fim('4 repetir não muda nada', x4.acao === 'nada' && JSON.stringify(p4.publicacaoStokki) === JSON.stringify(p3.publicacaoStokki), `ação ${x4.acao}`);
    // 5) ligação pela faxina: plataforma vencida há 5 dias é tentada; a futura não
    const STK2 = 'j116-stokki-faxina', d5 = new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10), fut = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    const rv = () => ({ data: '', hora: '', retirada: false, publicadaEm: '', publicadaPor: '', url: '', checks: [], conferidaEm: '', conferidaPor: '' });
    await seed.set('postagens', STK2, { cliente: 'stokki', clienteNome: 'Stokki', titulo: 'Stokki — J116 faxina', status: 'agendado', dataAgendada: d5, horaAgendada: '10:00', excluido: false, criadoEm: new Date(),
      publicacaoStokki: { versao: 1, revisao: 1, selecionadas: ['instagram', 'linkedin'], redes: { instagram: { ...rv(), data: d5, hora: '10:00' }, linkedin: { ...rv(), data: fut, hora: '10:00' } } } });
    const fx = await import(pathToFileURL(path.join(RAIZ, 'functions-get/faxina-diaria-cp248.mjs')).href);
    const r5 = await fx.executarFaxinaCp248(db, { gravarRelatorio: false });
    const tentou = [...r5.publicadas, ...r5.puladas.map(x => x.id)].filter(x => String(x).startsWith(STK2 + '#'));
    fim('5 a faxina tenta a plataforma vencida e não toca a futura', tentou.includes(STK2 + '#instagram') && !tentou.includes(STK2 + '#linkedin'),
      `tentou: ${tentou.join(', ') || 'nenhuma'} · ${r5.publicadas.includes(STK2 + '#instagram') ? 'publicada' : 'pulada: ' + (r5.puladas.find(x => x.id === STK2 + '#instagram')?.motivo || '').slice(0, 90)}`);
    const s2 = await seed.get('postagens', STK2); if (s2) { const { id: _i, ...dd } = s2; await seed.set('postagens', STK2, { ...dd, excluido: true }); }
  } catch (e) { fim('confirmação automática da Stokki', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
}
