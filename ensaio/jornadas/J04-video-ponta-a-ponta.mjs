// J04 — vídeo ponta a ponta: Amanda distribui → Helo entrega → Chris aprova → Amanda confirma cliente →
// postagem nasce → Chris escreve legenda → Cecília agenda → Cecília confirma publicado → Portal mostra.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J04';
export const nome = 'Vídeo: distribuição → edição → aprovação → cliente → legenda → agendamento → publicado → Portal';

const VID = 'v-mochi-3'; // seed: sem editor, aguardando_edicao (cliente comum; Stokki tem fluxo próprio multi-plataforma → jornada separada)
const esperar = async (fn, ms = 12000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; }; // 1 s: leitura REST frequente aborta transações no emulador
const hojeISO = () => { const d = new Date(Date.now() - 3 * 3600000); /* BRT */ return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const amanhaISO = () => { const d = new Date(Date.now() + 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina();
    const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await acao(page);
      const res = await verificar();
      const graves = erros.filter(erroGrave);
      await foto(page, `J04-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J04-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); return false; }
    finally { await fechar(); }
  };
  const video = async () => (await seed.listar('videos_producao')).find(v => v.id === VID);
  const postagem = async () => (await seed.listar('postagens')).find(p => p.videoId === VID && !p.excluido);

  // 1. Amanda distribui (Gerência → Vídeos → escolher editor → confirmar)
  if (!await passo('1 Amanda distribui para Helo', 'Amanda', async page => {
    await entrarGerencia(page);
    await page.evaluate(() => navegarGerenciaSub('videos'));
    await page.waitForSelector(`[data-i145-video-id="${VID}"] select.editorSelect`, { timeout: 12000 });
    await page.selectOption(`[data-i145-video-id="${VID}"] select.editorSelect`, 'Helo');
    await page.getByRole('button', { name: /Salvar alterações/ }).click({ timeout: 8000 });
  }, () => esperar(async () => { const v = await video(); return v?.editorAtribuido === 'Helo' ? 'editorAtribuido=Helo · status ' + v.status : null; }))) return;

  // 2. Helo entrega (Vídeos → Meus vídeos → link → enviar pra aprovação)
  if (!await passo('2 Helo entrega o vídeo', 'Helo', async page => {
    await page.evaluate(() => irPara('videos', document.getElementById('navVideos')));
    await page.evaluate(() => setVideosSub('meus', null));
    await page.waitForSelector(`#link_${VID}`, { timeout: 12000 });
    await page.fill(`#link_${VID}`, 'https://drive.google.com/file/d/ensaio-j04-final/view');
    await page.evaluate(v => window.enviarVideoParaAprovacao(v), VID);
  }, () => esperar(async () => { const v = await video(); return v?.status === 'aguardando_aprovacao' ? 'status aguardando_aprovacao' : null; }))) return;

  // 3. Chris aprova internamente
  if (!await passo('3 Chris aprova internamente', 'Chris', async page => {
    await entrarGerencia(page);
    await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    const btn = page.locator(`[onclick*="aprovarVideo('${VID}')"]`).first();
    await btn.waitFor({ timeout: 15000 }); await btn.click();
    // U1 (10/11/2026): um clique só — a conferência do servidor roda e aprova na sequência (J31)
  }, () => esperar(async () => { const v = await video(); return v?.status === 'aguardando_cliente' ? 'status aguardando_cliente' : null; }))) return;

  // 4. Amanda confirma aprovação do cliente → postagem nasce
  if (!await passo('4 Amanda confirma cliente → postagem', 'Amanda', async page => {
    await entrarGerencia(page);
    await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    const btn = page.locator(`[onclick*="marcarClienteAprovouVideo('${VID}')"]`).first();
    await btn.waitFor({ timeout: 15000 }); await btn.click();
  }, () => esperar(async () => { const v = await video(); const p = await postagem(); return v?.status === 'aprovado' && p ? `vídeo aprovado · postagem ${p.id} ${p.status}` : null; }))) return;
  const post = await postagem();

  // 5. Chris escreve a legenda
  if (!await passo('5 Chris escreve legenda', 'Chris', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
    await page.evaluate(() => mudarEtapaLegendasI66('videos'));
    await page.waitForSelector(`#legenda_${post.id}`, { timeout: 15000 });
    await page.fill(`#legenda_${post.id}`, 'Legenda escrita no ensaio J04 — receita do mochi de morango. #mochi');
    await page.evaluate(p => window.salvarLegenda(p), post.id);
  }, () => esperar(async () => { const p = await postagem(); return p?.status === 'aguardando_agendamento' ? 'status aguardando_agendamento' : null; }))) return;

  // 6. Cecília agenda
  if (!await passo('6 Cecília agenda a postagem', 'Cecília', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
    await page.waitForSelector(`#dataPost_${post.id}`, { timeout: 15000 });
    // agenda para hoje 00:01 (já passou): assim a confirmação de publicação fica devida no passo 7, como na operação real
    await page.fill(`#dataPost_${post.id}`, hojeISO());
    await page.fill(`#horaPost_${post.id}`, '00:01');
    await page.evaluate(p => window.salvarAgendamentoPostagem(p), post.id); // botão "Revisar agendamento"
    // painel "Conferir agendamento": marcar a conferência e salvar
    const check = page.getByText(/Conferi a origem, a data e o horário/).first();
    await check.waitFor({ timeout: 15000 }); await check.click();
    await page.getByRole('button', { name: /^Salvar agendamento$/ }).click({ timeout: 10000 });
  }, () => esperar(async () => { const p = await postagem(); return p?.status === 'agendado' ? 'status agendado ' + p.dataAgendada : null; }))) return;

  // 7. Cecília confirma publicado
  if (!await passo('7 Cecília confirma publicado', 'Cecília', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('confirmar', null));
    await page.waitForFunction(() => /Publicações para conferir · [1-9]/.test(document.getElementById('view-postagens')?.innerText || ''), null, { timeout: 25000 });
    await page.locator('#view-postagens button').filter({ hasText: /Conferir publicação real/ }).filter({ hasNotText: /Já foi/ }).first().click();
    const painel = page.locator('text=Conferir a publicação real').first(); await painel.waitFor({ timeout: 15000 });
    const data = page.locator('input[type="date"]:visible').last(); await data.fill(hojeISO());
    const hora = page.locator('input[type="time"]:visible').last(); await hora.fill('00:15'); // já passou (o servidor recusa 'fato futuro')
    await page.locator('textarea:visible').last().fill('https://www.instagram.com/p/ensaio-j04/');
    await page.locator('button:visible').filter({ hasText: /Confirmar|Registrar|publicação/ }).filter({ hasNotText: /Conferir publicação real|Fechar|Pedir|Desfazer/ }).last().click();
  }, () => esperar(async () => { const p = await postagem(); return p?.status === 'postado' ? 'status postado' : null; }))) return;

  // 8. Portal da Stokki mostra o conteúdo publicado
  { const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      await page.goto(amb.url('portal-cliente.html', '&c=mochi&t=tok-mochi'), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.innerText.includes('Mochi'), null, { timeout: 20000 }); await page.waitForTimeout(3000);
      let txt = '';
      for (const r of [/Acompanhamento/, /Programados/, /Mais/]) { try { await page.getByText(r).first().click({ timeout: 2500 }); await page.waitForTimeout(2500); } catch {} txt += await page.evaluate(() => document.body.innerText); }
      const ok = txt.includes('Receita do mochi de morango');
      await foto(page, 'J04-8-portal-mochi');
      registrar({ jornada: id, caso: '8 Portal Mochi mostra publicado', ok: ok && !erros.filter(erroGrave).length, ms: Date.now() - t0, detalhe: ok ? 'título visível no Portal' : 'título NÃO apareceu no Portal' });
    } catch (e) { registrar({ jornada: id, caso: '8 Portal Mochi mostra publicado', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); } }
}
