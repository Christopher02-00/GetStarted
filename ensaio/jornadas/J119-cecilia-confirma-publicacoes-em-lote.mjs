// J119 — CP265 (23/11/2026, Chris: "aprovar mais de uma coisa de uma vez, por exemplo aprovar tudo de uma semana inteira"; "Sim, começar").
// A Cecília confirmava cada publicação que saiu no horário com um toque por postagem ("✔ Saiu no horário", U4). Esperado, na tela real:
//  1. com 4 publicações vencidas e 1 futura, a fila oferece "✔ Confirmar as 4 que saíram no horário"; a futura não conta;
//  2. a confirmação lista as 4; durante a confirmação, a 3ª é reprogramada para amanhã (mudou) → o lote confirma a 1ª e a 2ª, uma depois da
//     outra, pelo MESMO caminho do botão (status 'postado', prova "saiu no horário agendado") e PARA na que mudou, sem confirmá-la;
//  3. o que vem depois da parada continua na lista (nada às cegas) e a futura continua agendada;
//  4. o resumo diz quantas foram e onde parou; sem erro no console.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J119';
export const nome = 'Cecília confirma de uma vez as publicações que saíram no horário (para na que mudou; a futura fica)';
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const dia = (d = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() + d * 864e5));
const VIDS = [['j119-v1', 'Ensaio J119 primeira', 0, '00:01'], ['j119-v2', 'Ensaio J119 segunda', 0, '00:02'], ['j119-v3', 'Ensaio J119 terceira', 0, '00:03'], ['j119-v4', 'Ensaio J119 quarta', 0, '00:04'], ['j119-v5', 'Ensaio J119 futura', 1, '10:00']];

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const agora = new Date().toISOString();
  for (const [vid, titulo] of VIDS) await seed.set('videos_producao', vid, {
    cliente: 'mochi', clienteNome: 'Mochi', titulo, status: 'aguardando_cliente', data: dia(), editorAtribuido: 'Helo', editorAtribuidoEm: agora,
    editorAtribuidoPor: 'Amanda', enviadoEm: agora, linkFinalizado: 'https://drive.google.com/file/d/' + vid + '/view', aprovadoInternoEm: agora,
    aprovadoPor: 'Chris', clienteAprovou: false, ultimaCorrecaoSolicitada: '', enviadoParaCliente: false, criadoEm: agora, excluido: false, nivelEscalonamento: 0 });
  const P = {};
  const post = async vid => (await seed.listar('postagens')).find(p => p.videoId === vid && !p.excluido);
  const comPagina = async (pessoa, fn) => { const { page, erros, fechar } = await nav.novaPagina(); try { page.on('dialog', d => d.accept()); await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500); return await fn(page, erros); } finally { await fechar(); } };
  try {
    // preparo pelo caminho real (como a J33): Amanda confirma o cliente → Chris escreve as legendas → Cecília agenda as 5
    await comPagina('Amanda', async page => { await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
      for (const [vid] of VIDS) { const b = page.locator(`[onclick*="marcarClienteAprovouVideo('${vid}')"]`).first(); await b.waitFor({ timeout: 15000 }); await b.click(); await esperar(async () => (await post(vid)) ? 1 : null); } });
    await comPagina('Chris', async page => { await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
      await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500); await page.evaluate(() => mudarEtapaLegendasI66('videos'));
      for (const [vid, titulo] of VIDS) { const p = await post(vid); await page.waitForSelector(`#legenda_${p.id}`, { timeout: 15000 });
        await page.fill(`#legenda_${p.id}`, 'Legenda real do ensaio J119 — ' + titulo + ' #mochi'); await page.evaluate(x => window.salvarLegenda(x), p.id);
        await esperar(async () => (await post(vid))?.status === 'aguardando_agendamento' ? 1 : null); } });
    for (const [vid] of VIDS) P[vid] = (await post(vid)).id;
    await comPagina('Cecília', async page => { await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
      for (const [vid, , d, hora] of VIDS) { const pid = P[vid];
        await page.waitForSelector(`#dataPost_${pid}`, { timeout: 15000 }); await page.fill(`#dataPost_${pid}`, dia(d)); await page.fill(`#horaPost_${pid}`, hora);
        await page.evaluate(p => window.salvarAgendamentoPostagem(p), pid);
        const check = page.getByText(/Conferi a origem, a data e o horário/).first(); await check.waitFor({ timeout: 15000 }); await check.click();
        await page.getByRole('button', { name: /^Salvar agendamento$/ }).click({ timeout: 10000 });
        await esperar(async () => (await seed.get('postagens', pid))?.status === 'agendado' ? 1 : null, 20000); await page.waitForTimeout(1500); } });
    const agendadas = (await Promise.all(VIDS.map(([v]) => seed.get('postagens', P[v])))).filter(p => p?.status === 'agendado').length;
    if (agendadas !== 5) throw Error('preparo: só ' + agendadas + ' de 5 agendadas');

    await comPagina('Cecília', async (page, erros) => {
      page.removeAllListeners('dialog');
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => setPostagensSub('confirmar', null));
      const lote = page.locator('[data-cp125-lote]').first();
      const viu = await lote.waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
      await page.waitForFunction(() => !document.querySelector('[data-cp125-lote]')?.disabled, null, { timeout: 20000 }).catch(() => {});
      const texto = viu ? (await lote.innerText()).trim() : '';
      await foto(page, 'J119-antes');
      fim('1 a fila oferece "Confirmar as 4 que saíram no horário"; a futura não conta', viu && /Confirmar as 4 que saíram no horário/.test(texto), viu ? '“' + texto + '”' : 'botão NÃO apareceu');
      if (!viu) return;
      // durante a confirmação, a 3ª é reprogramada para amanhã (outra aba / a Amanda mudou)
      let dialogo = '';
      page.once('dialog', async d => { dialogo = d.message(); const x = await seed.get('postagens', P['j119-v3']); const { id: _i, ...dados } = x; await seed.set('postagens', P['j119-v3'], { ...dados, dataAgendada: dia(1), horaAgendada: '11:00' }); await new Promise(r => setTimeout(r, 1500)); await d.accept(); });
      await lote.click();
      await page.waitForFunction(() => /Parei em|publicações confirmadas de uma vez/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {});
      const resumo = await page.evaluate(() => (document.body.innerText.match(/\d+ (confirmada\(s\)\. Parei em[^\n]*|publicações confirmadas de uma vez\.)/) || [''])[0]);
      const s = {}; for (const [vid] of VIDS) s[vid] = await seed.get('postagens', P[vid]);
      const prova = x => /saiu no horário agendado/.test(JSON.stringify(x?.provasPublicacaoI165 || {}));
      fim('2 confirma a 1ª e a 2ª pelo mesmo caminho e para na que mudou', /Ensaio J119 primeira/.test(dialogo) && /Ensaio J119 quarta/.test(dialogo) && !/futura/.test(dialogo)
        && s['j119-v1']?.status === 'postado' && prova(s['j119-v1']) && s['j119-v2']?.status === 'postado' && prova(s['j119-v2']) && s['j119-v3']?.status === 'agendado',
        `confirmação: “${dialogo.split('\n')[0]}” · 1ª → ${s['j119-v1']?.status} · 2ª → ${s['j119-v2']?.status} · 3ª (mudou) → ${s['j119-v3']?.status} ${s['j119-v3']?.dataAgendada} ${s['j119-v3']?.horaAgendada}`);
      await page.waitForTimeout(2000);
      const quartaNaLista = await page.locator(`[data-cp125-post="${P['j119-v4']}"][data-cp125-rapida]`).count();
      fim('3 a que vem depois da parada continua na lista e a futura continua agendada', s['j119-v4']?.status === 'agendado' && quartaNaLista > 0 && s['j119-v5']?.status === 'agendado',
        `4ª → ${s['j119-v4']?.status} (na lista: ${quartaNaLista ? 'sim' : 'não'}) · futura → ${s['j119-v5']?.status}`);
      await foto(page, 'J119-depois');
      const graves = erros.filter(erroGrave);
      fim('4 o resumo diz quantas e onde parou, sem erro no console', /^2 confirmada\(s\)\. Parei em .*Ensaio J119 terceira/.test(resumo) && !graves.length, `resumo: “${resumo}” · erros: ${graves.slice(-2).join(' | ').slice(0, 200) || 'nenhum'}`);
    });
  } catch (e) { fim('confirmação em lote das publicações', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  // limpeza: postagens e vídeos do ensaio saem das filas (as próximas jornadas da Cecília não os veem)
  for (const pid of Object.values(P)) { const x = await seed.get('postagens', pid); if (x) { const { id: _i, ...d } = x; await seed.set('postagens', pid, { ...d, excluido: true }); } }
  for (const [vid] of VIDS) { const v = await seed.get('videos_producao', vid); if (v) { const { id: _i, ...d } = v; await seed.set('videos_producao', vid, { ...d, excluido: true }); } }
}
