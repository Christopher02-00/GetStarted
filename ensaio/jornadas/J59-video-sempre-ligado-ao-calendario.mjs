// J59 — CP207 (12/11/2026, Amanda + conversa social media): 14 de 25 vídeos da fila de legendas apareciam como
// "Conteúdo ainda não identificado" — quem legenda ficava sem roteiro, ideia e recado. Origem: o filmmaker digitava o vídeo
// em "fora da lista do calendário" e ele nascia sem ligação. Fim: a fila não deixava claro como ligar.
//  1. Origem: Luís registra a gravação digitando um vídeo → o sistema pergunta de qual conteúdo do calendário ele é →
//     o vídeo nasce com a referência do conteúdo (roteiro, legenda e recado chegam a quem legenda).
//  2. Extra: digitar e marcar "extra" sem dizer o que é não passa; com a descrição, o vídeo nasce como extra descrito.
//  3. Fim: um vídeo aprovado que já está na fila sem ligação mostra o aviso e o botão "Vincular ao calendário";
//     o Chris liga ao conteúdo certo e o cartão passa a mostrar o conteúdo.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J59';
export const nome = 'Vídeo sempre ligado ao conteúdo do calendário (registro da gravação e fila de legendas)';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date(), hoje = agora.toISOString().slice(0, 10), mes = hoje.slice(0, 7);
  const amanha = new Date(agora.getTime() + 86400000).toISOString().slice(0, 10);
  const cal = await seed.get('calendarios', 'mochi');
  const itens = [...(cal?.items || [])].filter(i => !String(i?.itemId || '').startsWith('calitem_j59'));
  itens.push({ itemId: 'calitem_j59a', mes, day: 18, name: 'Mochi — Prato do dia (J59)', desc: 'Roteiro J59: mostrar o prato do dia saindo da cozinha', legenda: 'Legenda planejada J59a', fmt: 'Reel', excluido: false });
  itens.push({ itemId: 'calitem_j59b', mes, day: 22, name: 'Mochi — Bastidores do sushi (J59)', desc: 'Roteiro J59: o sushiman montando a barca', legenda: 'Legenda planejada J59b', fmt: 'Reel', excluido: false });
  const { id: _x, ...semId } = cal || {};
  await seed.set('calendarios', 'mochi', { cliente: 'mochi', client: 'Mochi', ...semId, items: itens });
  await seed.set('agendamentos', 'ag-j59', { cliente: 'mochi', clienteSlug: 'mochi', clienteNome: 'Mochi', data: amanha, hora: '10:00', filmmaker: 'Luís', equipe: 'Luís', status: 'agendado', qtdVideosPlanejados: 2, criadoEm: new Date().toISOString(), excluido: false });
  await seed.set('videos_producao', 'j59-fila', { cliente: 'mochi', clienteNome: 'Mochi', titulo: 'Mochi — Vídeo sem ligação (J59)', status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: 'https://drive.google.com/file/d/EnsaioJ59fila/view', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', postagemId: 'video_j59-fila', data: hoje, criadoEm: new Date(), excluido: false });
  await seed.set('postagens', 'video_j59-fila', { videoId: 'j59-fila', cliente: 'mochi', clienteNome: 'Mochi', titulo: 'Mochi — Vídeo sem ligação (J59)', linkVideo: 'https://drive.google.com/file/d/EnsaioJ59fila/view', legenda: '', status: 'aguardando_legenda', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', demandaLegendaCriada: true, excluido: false, criadoEm: new Date() });
  await amb.aguardarFunctionsOciosas?.();

  const passo = async (caso, pessoa, acao) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      const r = await acao(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J59-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!r?.ok && !graves.length, ms: Date.now() - t0, detalhe: (r?.detalhe || 'sem resultado') + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, `J59-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 260) }); }
    finally { await fechar(); }
  };
  const abrirRegistro = async page => {
    await page.evaluate(() => irPara('agendamento', document.getElementById('navAgendamento')));
    const b = `button[onclick*="abrirRegistroAgendamentoCampoV115('ag-j59')"]`;
    await page.waitForSelector(b, { timeout: 15000 }); await page.click(b);
    const extras = page.locator('#extras_ag-j59'); await extras.waitFor({ timeout: 15000 });
    return extras;
  };

  // 1+2. Origem: Luís digita dois vídeos; um é o "Prato do dia" do calendário, o outro é extra (primeiro sem descrição).
  await passo('1 Luís registra: cada vídeo digitado é identificado', 'Luís', async page => {
    const extras = await abrirRegistro(page);
    await extras.fill('Ensaio J59 prato saindo\nEnsaio J59 brinde da equipe'); await page.dispatchEvent('#extras_ag-j59', 'input');
    await page.waitForFunction(() => { const b = document.getElementById('btnConfirmarGravacao_ag-j59'); return b && !b.disabled; }, null, { timeout: 8000 });
    await page.click('#btnConfirmarGravacao_ag-j59');
    const dialogo = page.locator('dialog#identificarEnvioI106');
    const perguntou = await dialogo.waitFor({ timeout: 15000 }).then(() => true, () => false);
    if (!perguntou) {
      const vs = await esperar(async () => { const l = (await seed.listar('videos_producao')).filter(v => /Ensaio J59/.test(v.titulo || '')); return l.length ? l : null; }, 15000);
      return { ok: false, detalhe: `o registro NÃO perguntou de qual conteúdo é cada vídeo · ${vs ? vs.length + ' vídeo(s) nasceram sem ligação (' + vs.map(v => v.referenciaLegendaI78 ? 'ligado' : 'sem ligação').join(', ') + ')' : 'nenhum vídeo'}` };
    }
    const semPendente = await dialogo.evaluate(d => ![...d.querySelectorAll('[data-tipo] option')].some(o => o.value === 'pendente'));
    const s0 = dialogo.locator('section[data-linha="0"]'), s1 = dialogo.locator('section[data-linha="1"]');
    await s0.locator('[data-tipo]').selectOption('calendario'); await s0.locator('[data-mes]').selectOption(mes);
    await s0.locator('[data-item]').selectOption(JSON.stringify(['mochi', mes, 'calitem_j59a']));
    await s1.locator('[data-tipo]').selectOption('extra');
    await dialogo.locator('[data-confirmar]').click(); await page.waitForTimeout(600);
    const recusouSemDescricao = /o que é o vídeo/.test(await dialogo.locator('[data-aviso]').innerText());
    await s1.locator('[data-descricao]').fill('Brinde da equipe no fim da gravação, pedido pela dona');
    await dialogo.locator('[data-confirmar]').click();
    const vs = await esperar(async () => { const l = (await seed.listar('videos_producao')).filter(v => /Ensaio J59/.test(v.titulo || '') && !v.excluido); return l.length === 2 ? l : null; }, 25000);
    const prato = vs?.find(v => /prato saindo/.test(v.titulo)), brinde = vs?.find(v => /brinde/.test(v.titulo));
    const ok = semPendente && recusouSemDescricao && prato?.referenciaLegendaI78?.itemId === 'calitem_j59a' && prato?.identificacaoConteudoI106?.modo === 'calendario'
      && brinde?.identificacaoConteudoI106?.modo === 'extra' && /Brinde da equipe/.test(brinde?.identificacaoConteudoI106?.descricao || '');
    return { ok, detalhe: `${semPendente ? 'sem opção "ainda preciso identificar"' : 'AINDA deixa sem identificar'} · extra sem descrição ${recusouSemDescricao ? 'recusado' : 'ACEITO'} · prato ${prato?.referenciaLegendaI78?.itemId || 'SEM ligação'} · brinde ${brinde?.identificacaoConteudoI106?.modo || '?'}${brinde?.identificacaoConteudoI106?.descricao ? ' descrito' : ' sem descrição'}` };
  });

  // 3. Fim: vídeo aprovado já na fila sem ligação → aviso + "Vincular ao calendário" → Chris liga ao conteúdo certo.
  await passo('3 Fila: Vincular ao calendário', 'Chris', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
    await page.evaluate(() => mudarEtapaLegendasI66('videos'));
    const card = page.locator('[data-legenda-post-i66="video_j59-fila"]'); await card.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2000);
    const aviso = await card.locator('[data-sem-vinculo-cp207]').count();
    const botao = card.locator('[data-vincular-calendario-cp207]');
    if (!await botao.count()) return { ok: false, detalhe: `a fila NÃO mostra "Vincular ao calendário" · aviso ${aviso ? 'sim' : 'não'} · tela: ${(await card.innerText()).replace(/\s+/g, ' ').slice(0, 120)}` };
    await botao.click();
    await page.locator('#i78Mes').waitFor({ timeout: 15000 }); await page.selectOption('#i78Mes', mes);
    await page.selectOption('#i78Item', JSON.stringify(['mochi', mes, 'calitem_j59b']));
    await page.locator('button[data-salvar]').click();
    const p = await esperar(async () => { const x = await seed.get('postagens', 'video_j59-fila'); return x?.referenciaLegendaI78?.itemId ? x : null; });
    await page.waitForTimeout(1200);
    const resumo = await card.locator('[data-referencia-resumo-i78]').innerText().catch(() => '');
    const ok = aviso === 1 && p?.referenciaLegendaI78?.itemId === 'calitem_j59b' && /Bastidores do sushi/.test(resumo) && !(await card.locator('[data-vincular-calendario-cp207]').count());
    return { ok, detalhe: `aviso ${aviso ? 'mostrado' : 'ausente'} · ligação ${p?.referenciaLegendaI78?.itemId || 'NÃO gravada'} · cartão ${/Bastidores do sushi/.test(resumo) ? 'mostra o conteúdo' : 'não atualizou: ' + resumo.slice(0, 80)}` };
  });
}
