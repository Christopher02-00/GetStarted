// J68 — CP216 (16/11/2026, Luís + Amanda, empresas do Otávio): a sessão estava aberta só para a Zeiss e o Luís precisou
// subir vídeos da Ótica Hauer pelo "Gravado avulso". Os vídeos saíam "Ótica Hauer — Vídeo" e a Amanda ainda via
// "Identificar conteúdo", mesmo com o conteúdo escolhido.
//  1. Luís: Gravado avulso → digita "Vídeo" → escolhe o conteúdo do calendário → o vídeo nasce com o título do conteúdo
//     e a ligação nativa (calendarItemId/competência/cliente + ocupação I28), igual ao vídeo da sessão.
//  2. Amanda: na distribuição o cartão mostra o conteúdo e não oferece "Identificar conteúdo".
//  3. Cecília: na lista de gravações, "Agendar a mesma saída para outro cliente" copia a saída para o formulário,
//     com o cliente vazio para escolher o próximo; o aviso "uma sessão por cliente" está no formulário.
import { entrarComo, entrarGerencia, foto } from '../lib/navegador.mjs';
export const id = 'J68';
export const nome = 'Gravado avulso sai completo (título e ligação do calendário) e "Agendar a mesma saída" para outro cliente';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = hojeSP(), mes = hoje.slice(0, 7);
  const [a, m, d] = hoje.split('-').map(Number);
  const amanha = new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
  const SLUG = 'otica-hauer', NOME = 'Ótica Hauer', ITEM = 'calitem_j68a', CONTEUDO = 'Lentes de contato para o verão (J68)';
  await seed.set('clientes_config', SLUG, { modoAprovacaoCliente: 'manual', prazoTacitaHorasUteis: 24, whatsappCobranca: '', excluido: false });
  await seed.set('clientes_extras', SLUG, { slug: SLUG, nome: NOME, ativo: true, excluido: false, criadoEm: new Date().toISOString() });
  await seed.set('calendarios', SLUG, { cliente: SLUG, client: NOME, excluido: false, items: [
    { itemId: ITEM, mes, day: 20, name: CONTEUDO, desc: 'Roteiro J68: provador de lentes na vitrine', legenda: 'Legenda planejada J68', fmt: 'Reel', excluido: false },
  ] });
  // Preparação I28 concluída (estado de produção que libera a ligação nativa da sessão).
  await seed.set('calendarios_vinculos_controle', 'i28', { pronto: true, versao: 28, quantidade: 0, hashInventario: '0'.repeat(64), criadoEm: new Date().toISOString(), criadoPor: 'ensaio' });
  await seed.set('agendamentos', 'ag-j68', { cliente: 'zeiss', clienteSlug: 'zeiss', clienteNome: 'Zeiss', data: amanha, hora: '09:30', local: 'Rua do Ensaio J68, Araucária', tipo: 'fixo',
    estilo: 'Estilo J68: depoimento do Otávio + vitrine', referencias: ['https://exemplo.invalid/j68'], obsFilmmaker: 'Obs J68: falar com a recepção',
    filmmaker: 'Luís', equipe: [{ nome: 'Luís', papel: 'Filmmaker' }], status: 'agendado', qtdVideosPlanejados: 3, criadoEm: new Date().toISOString(), excluido: false });
  await amb.aguardarFunctionsOciosas?.();

  const passo = async (caso, pessoa, acao) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', dl => dl.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      if (pessoa === 'Amanda') await entrarGerencia(page);
      const r = await acao(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J68-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!r?.ok && !graves.length, ms: Date.now() - t0, detalhe: (r?.detalhe || 'sem resultado') + (graves.length ? ' | ' + graves[0] : '') });
      return r;
    } catch (e) { await foto(page, `J68-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 260) }); return null; }
    finally { await fechar(); }
  };

  // 1. Luís: Gravado avulso com nome genérico, identificado ao conteúdo do calendário.
  const r1 = await passo('1 Luís: avulso "Vídeo" nasce com título e ligação do calendário', 'Luís', async page => {
    await page.evaluate(() => irPara('videos', document.getElementById('navVideos')));
    await page.evaluate(() => escolherOrigemMaterial('avulso'));
    await page.waitForSelector(`#videoCliente option[value="${SLUG}"]`, { state: 'attached', timeout: 20000 });
    await page.selectOption('#videoCliente', SLUG);
    await page.fill('#videoData', hoje);
    await page.fill('#videoNomesPrincipais', 'Vídeo');
    await page.locator('#btnLancarVideos').scrollIntoViewIfNeeded(); await page.click('#btnLancarVideos');
    const dialogo = page.locator('dialog#identificarEnvioI106'); await dialogo.waitFor({ timeout: 15000 });
    const s0 = dialogo.locator('section[data-linha="0"]');
    await s0.locator('[data-tipo]').selectOption('calendario'); await s0.locator('[data-mes]').selectOption(mes);
    await s0.locator('[data-item]').selectOption(JSON.stringify([SLUG, mes, ITEM]));
    await dialogo.locator('[data-confirmar]').click();
    const v = await esperar(async () => (await seed.listar('videos_producao')).find(x => x.cliente === SLUG && String(x.envioManualI67 || '').startsWith('i67_') && !x.excluido));
    await page.waitForTimeout(1500);
    const ocup = v ? await seed.get(`calendarios_ocupacao/${SLUG}/competencias/${mes}/itens`, ITEM) : null;
    const tituloOk = v?.titulo === `${NOME} — ${CONTEUDO}`;
    const nativo = v?.calendarItemId === ITEM && v?.calendarCompetencia === mes && v?.calendarClienteSlug === SLUG;
    const ok = tituloOk && nativo && ocup?.videoId === v?.id && v?.identificacaoConteudoI106?.modo === 'calendario';
    return { ok, id: v?.id, detalhe: v ? `título "${v.titulo}" · ligação ${nativo ? 'nativa' : 'SÓ referência (' + (v.referenciaLegendaI78?.itemId || 'nenhuma') + ')'} · ocupação ${ocup?.videoId === v.id ? 'ok' : 'ausente'}` : 'vídeo não foi criado' };
  });

  // 2. Amanda: o cartão da distribuição mostra o conteúdo, sem "Identificar conteúdo".
  await passo('2 Amanda: cartão sem "Identificar conteúdo"', 'Amanda', async page => {
    if (!r1?.id) return { ok: false, detalhe: 'sem vídeo do passo 1' };
    await page.evaluate(() => navegarGerenciaSub('videos'));
    const card = page.locator(`[data-i145-video-id="${r1.id}"]`); await card.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    const txt = (await card.innerText()).replace(/\s+/g, ' ');
    const botao = await card.locator('button', { hasText: 'Identificar conteúdo' }).count();
    return { ok: !botao && txt.includes(CONTEUDO), detalhe: `${botao ? 'AINDA mostra "Identificar conteúdo"' : 'sem "Identificar conteúdo"'} · ${txt.includes(CONTEUDO) ? 'mostra o conteúdo' : 'não mostra o conteúdo: ' + txt.slice(0, 120)}` };
  });

  // 3. Cecília: "Agendar a mesma saída para outro cliente" preenche o formulário.
  await passo('3 Cecília: "Agendar a mesma saída" preenche o formulário', 'Cecília', async page => {
    await page.evaluate(() => irPara('agendamento', document.getElementById('navAgendamento')));
    const b = page.locator('[data-mesma-saida-cp216="ag-j68"]');
    const tem = await b.waitFor({ timeout: 20000 }).then(() => true, () => false);
    const aviso = await page.locator('#view-agendamento').innerText().then(t => t.includes('Gravação com vários clientes? Agende uma sessão por cliente'));
    if (!tem) return { ok: false, detalhe: `botão "Agendar a mesma saída" ausente · aviso ${aviso ? 'sim' : 'não'}` };
    await b.scrollIntoViewIfNeeded(); await b.click(); await page.waitForTimeout(800);
    const f = await page.evaluate(() => ({
      data: agData.value, hora: agHora.value, local: agLocal.value, estilo: agEstilo.value, obs: agObsFilmmaker.value, refs: agReferencias.value, tipo: agTipo.value,
      cliente: agCliente.value, foco: document.activeElement?.id || '', equipe: [...document.querySelectorAll('#agEquipeLinhas .agEquipePessoa')].map(s => s.value),
    }));
    const ok = aviso && f.data === amanha && f.hora === '09:30' && f.local === 'Rua do Ensaio J68, Araucária' && /Estilo J68/.test(f.estilo) && /Obs J68/.test(f.obs)
      && /exemplo\.invalid\/j68/.test(f.refs) && f.tipo === 'fixo' && f.cliente === '' && f.foco === 'agCliente' && f.equipe[0] === 'Luís';
    return { ok, detalhe: `data ${f.data} · hora ${f.hora} · local ${f.local ? 'ok' : 'vazio'} · equipe ${f.equipe.join('+') || 'vazia'} · cliente "${f.cliente}" · foco ${f.foco} · aviso ${aviso ? 'sim' : 'não'}` };
  });

  // Devolve a preparação I28 ao estado do seed padrão (não pronta) para não influir em outras jornadas.
  await seed.set('calendarios_vinculos_controle', 'i28', { pronto: false, versao: 28 });
}
