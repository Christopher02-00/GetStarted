// J120 — CP266 (23/11/2026, Chris: "aprovar mais de uma coisa de uma vez … tudo de uma semana inteira"; caixa de perguntas: "Agendamento
// em lote da Cecília → Sim, conferência única"). A Cecília registrava ~46 agendamentos por semana, um por um, cada um com a sua conferência.
// Esperado, na tela real da Cecília (Postagens → Agendar):
//  1. com 5 postagens prontas, a fila oferece "📅 Agendar várias de uma vez (5)"; o painel lista as 4 com data preenchida, cada uma com a
//     orientação integral, e deixa a 5ª (sem data nem sugestão) "para a ficha de cada uma";
//  2. sem marcar a conferência única, "Salvar" não grava nada;
//  3. com a marcação, salva a 1ª e a 2ª pelo MESMO caminho do servidor (status 'agendado', data e horário escolhidos) e, como a 3ª mudou no
//     servidor depois da conferência, PARA nela sem gravar; a 4ª continua na fila;
//  4. a 5ª continua esperando agendamento; o resumo diz quantas e onde parou; sem erro no console.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J120';
export const nome = 'Cecília agenda várias postagens de uma vez com conferência única (para na que mudou; a sem data fica)';
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const dia = (d = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() + d * 864e5));
const VIDS = [['j120-v1', 'Ensaio J120 primeira', 2, '09:10'], ['j120-v2', 'Ensaio J120 segunda', 3, '10:20'], ['j120-v3', 'Ensaio J120 terceira', 4, '11:30'], ['j120-v4', 'Ensaio J120 quarta', 5, '12:40'], ['j120-v5', 'Ensaio J120 quinta', null, '']];

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const agora = new Date().toISOString(), P = {};
  for (const [vid, titulo] of VIDS) await seed.set('videos_producao', vid, {
    cliente: 'mochi', clienteNome: 'Mochi', titulo, status: 'aguardando_cliente', data: dia(), editorAtribuido: 'Helo', editorAtribuidoEm: agora,
    editorAtribuidoPor: 'Amanda', enviadoEm: agora, linkFinalizado: 'https://drive.google.com/file/d/' + vid + '/view', aprovadoInternoEm: agora,
    aprovadoPor: 'Chris', clienteAprovou: false, ultimaCorrecaoSolicitada: '', enviadoParaCliente: false, criadoEm: agora, excluido: false, nivelEscalonamento: 0 });
  const post = async vid => (await seed.listar('postagens')).find(p => p.videoId === vid && !p.excluido);
  const comPagina = async (pessoa, fn) => { const { page, erros, fechar } = await nav.novaPagina(); try { await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500); return await fn(page, erros); } finally { await fechar(); } };
  try {
    // preparo pelo caminho real (como a J33/J119): Amanda confirma o cliente → Chris escreve as legendas → 5 postagens esperando agendamento
    await comPagina('Amanda', async page => { page.on('dialog', d => d.accept()); await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
      for (const [vid] of VIDS) { const b = page.locator(`[onclick*="marcarClienteAprovouVideo('${vid}')"]`).first(); await b.waitFor({ timeout: 15000 }); await b.click(); await esperar(async () => (await post(vid)) ? 1 : null); } });
    await comPagina('Chris', async page => { await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
      await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500); await page.evaluate(() => mudarEtapaLegendasI66('videos'));
      // a lista redesenha a cada legenda salva: preencher e salvar de novo se a anterior não chegou ao servidor
      for (const [vid, titulo] of VIDS) { for (let t = 0; t < 3; t++) { const p = await post(vid); if (p?.status === 'aguardando_agendamento') break;
        await page.waitForSelector(`#legenda_${p.id}`, { timeout: 15000 }); await page.waitForTimeout(1000);
        await page.fill(`#legenda_${p.id}`, 'Legenda real do ensaio J120 — ' + titulo + ' #mochi'); await page.evaluate(x => window.salvarLegenda(x), p.id);
        if (await esperar(async () => (await post(vid))?.status === 'aguardando_agendamento' ? 1 : null, 15000)) break; } } });
    for (const [vid] of VIDS) P[vid] = (await post(vid)).id;
    const estados = await Promise.all(VIDS.map(([v]) => seed.get('postagens', P[v])));
    if (estados.filter(p => p?.status === 'aguardando_agendamento').length !== 5) throw Error('preparo: ' + estados.map(p => p?.titulo + '=' + p?.status).join(' · '));

    await comPagina('Cecília', async (page, erros) => {
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
      for (const [vid, , d, hora] of VIDS) { if (d === null) continue; await page.waitForSelector(`#dataPost_${P[vid]}`, { timeout: 20000 }); await page.fill(`#dataPost_${P[vid]}`, dia(d)); await page.fill(`#horaPost_${P[vid]}`, hora); }
      await page.fill(`#dataPost_${P['j120-v5']}`, '');
      const botao = page.locator('[data-lote-agendar-cp266]').first();
      const viu = await botao.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
      const texto = viu ? (await botao.innerText()).trim() : '';
      if (!viu) { fim('1 a fila oferece "Agendar várias de uma vez (5)" e o painel separa as prontas', false, 'botão NÃO apareceu'); return; }
      await botao.click();
      const painel = page.locator('[data-lote-painel-cp266]');
      await page.waitForFunction(() => /Salvar os agendamentos marcados|Nenhuma postagem está pronta/.test(document.querySelector('[data-lote-painel-cp266]')?.innerText || ''), null, { timeout: 60000 }).catch(() => {});
      const txt = await painel.innerText().catch(() => '');
      const itensPainel = await painel.locator('[data-lote-item-cp266]').count();
      await foto(page, 'J120-painel');
      fim('1 a fila oferece "Agendar várias de uma vez (5)" e o painel separa as prontas', /Agendar várias de uma vez \(5\)/.test(texto) && itensPainel === 4 && /Salvar os agendamentos marcados/.test(txt) && /Agendar 4 postagens de uma vez/.test(txt)
        && /Ensaio J120 quinta/.test(txt.split('Ficam para a ficha')[1] || '') && /(Data|Organizar|Conferência)/.test(txt),
        `botão “${texto}” · no painel: ${itensPainel} · ${/Ficam para a ficha/.test(txt) ? 'a sem data ficou para a ficha' : 'a sem data NÃO foi separada'}`);
      // 2) sem a conferência única, nada é gravado
      await painel.locator('[data-lote-confirmar-cp266]').click(); await page.waitForTimeout(3000);
      const semAck = (await Promise.all(VIDS.map(([v]) => seed.get('postagens', P[v])))).filter(p => p?.status === 'agendado').length;
      fim('2 sem marcar a conferência única, nada é gravado', semAck === 0, `agendadas sem a marcação: ${semAck}`);
      // 3) a 3ª muda no servidor depois da conferência (outra aba); com a marcação, salva a 1ª e a 2ª e para na 3ª
      const x = await seed.get('postagens', P['j120-v3']); const { id: _i, ...dados } = x; await seed.set('postagens', P['j120-v3'], { ...dados, observacaoEnsaioJ120: 'mudou em outra aba' });
      await page.waitForTimeout(2500);
      await painel.locator('[data-lote-ack-cp266]').check(); await painel.locator('[data-lote-confirmar-cp266]').click();
      await page.waitForFunction(() => /agendamento\(s\) salvo\(s\)\. Parei em|agendamentos salvos de uma vez/.test(document.querySelector('[data-lote-painel-cp266]')?.innerText || ''), null, { timeout: 90000 }).catch(() => {});
      const resumo = await page.evaluate(() => (document.querySelector('[data-lote-painel-cp266]')?.innerText.match(/\d+ (agendamento\(s\) salvo\(s\)\. Parei em[^\n]*|agendamentos salvos de uma vez\.)/) || [''])[0]);
      const s = {}; for (const [vid] of VIDS) s[vid] = await seed.get('postagens', P[vid]);
      fim('3 salva pelo mesmo caminho a 1ª e a 2ª e para na que mudou, sem gravá-la', s['j120-v1']?.status === 'agendado' && s['j120-v1']?.dataAgendada === dia(2) && s['j120-v1']?.horaAgendada === '09:10'
        && s['j120-v2']?.status === 'agendado' && s['j120-v2']?.dataAgendada === dia(3) && s['j120-v2']?.horaAgendada === '10:20'
        && s['j120-v3']?.status === 'aguardando_agendamento' && s['j120-v4']?.status === 'aguardando_agendamento',
        `1ª → ${s['j120-v1']?.status} ${s['j120-v1']?.dataAgendada || ''} ${s['j120-v1']?.horaAgendada || ''} · 2ª → ${s['j120-v2']?.status} ${s['j120-v2']?.dataAgendada || ''} ${s['j120-v2']?.horaAgendada || ''} · 3ª (mudou) → ${s['j120-v3']?.status} · 4ª → ${s['j120-v4']?.status}`);
      await foto(page, 'J120-depois');
      const graves = erros.filter(erroGrave);
      fim('4 a sem data continua esperando; o resumo diz quantas e onde parou; sem erro no console', s['j120-v5']?.status === 'aguardando_agendamento' && /^2 agendamento\(s\) salvo\(s\)\. Parei em .*Ensaio J120 terceira/.test(resumo) && !graves.length,
        `sem data → ${s['j120-v5']?.status} · resumo: “${resumo}” · erros: ${graves.slice(-2).join(' | ').slice(0, 200) || 'nenhum'}`);
    });
  } catch (e) { fim('agendamento em lote', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  for (const pid of Object.values(P)) { const x = await seed.get('postagens', pid); if (x) { const { id: _i, ...d } = x; await seed.set('postagens', pid, { ...d, excluido: true }); } }
  for (const [vid] of VIDS) { const v = await seed.get('videos_producao', vid); if (v) { const { id: _i, ...d } = v; await seed.set('videos_producao', vid, { ...d, excluido: true }); } }
}
