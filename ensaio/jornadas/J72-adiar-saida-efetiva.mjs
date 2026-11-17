// J72 — Adiar uma saída que já ficou efetiva, sem cobrança nova (CP217, caso Fior Restaurante, Chris 16/11/2026).
// Fior avisou, a saída foi registrada para hoje com último mês financeiro no mês anterior; depois decidiram continuar
// até as últimas postagens. Como a data é hoje, a saída ficou efetiva e as postagens sumiram da fila da Cecília.
// Antes: o Arquivo só oferecia "Reativar cliente" (pede valor e primeiro mês = cobrança nova).
// Esperado: a Amanda adia a saída no Arquivo (nova data, mesma competência final) → o registro de saída é o mesmo,
// com o adiamento no histórico (quem/quando/de/para) → contrato com a mesma competência final e as mesmas vigências,
// nenhuma mensalidade nova ou reaberta → a Cecília volta a agendar as postagens do cliente até a nova data.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J72';
export const nome = 'Adiar saída já efetiva: mesma competência final, sem mensalidade nova, postagens voltam para a Cecília';
const SLUG = 'j72-fior', NOME = 'J72 Fior Restaurante';
const fmt = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const hoje = () => fmt(new Date());
const dia = n => fmt(new Date(Date.now() + n * 86400000));
const mesAnterior = () => { const [a, m] = hoje().slice(0, 7).split('-').map(Number); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; };
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const POSTS = [['j72-post-a', 'j72-video-a', 'Ensaio J72 — O cardápio que muda tudo', 'aguardando_agendamento', ''], ['j72-post-b', 'j72-video-b', 'Ensaio J72 — A Crise no Buffet', 'agendado', dia(3)]];

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString(), HOJE = hoje(), ULT = mesAnterior(), MES = HOJE.slice(0, 7), NOVA = dia(14);
  const SAIDA = `saida_${SLUG}_${HOJE}`;
  // Estado de uma saída imediata (salvarSaidaClienteCentral com data = hoje), igual ao que a Fior tem no ar.
  const ficha = { nome: NOME, slug: SLUG, tipo: 'mensalista', plano: 'Mensalista', valorMensal: 1500, diaVencimento: 10, primeiraCompetencia: '2026-05', tipoEntrega: 'postagem_completa', incluiStories: false, ultimaCompetenciaPagamento: ULT, tinhaPortal: true, origem: 'central' };
  await seed.set('clientes_extras', SLUG, { slug: SLUG, nome: NOME, casta: 'mensalista', ativo: true, excluido: true, excluidoPor: 'Amanda', motivoExclusao: 'Saída de cliente: encerramento', saidaProgramadaPara: HOJE, criadoEm: '2026-05-01T12:00:00.000Z' });
  await seed.set('clientes_config', SLUG, { nome: NOME, tipoCliente: 'mensalista', tipoEntrega: 'postagem_completa', modoAprovacaoCliente: 'manual', prazoTacitaHorasUteis: 24, excluido: false, clienteInativo: true, inativoDesde: HOJE, inativoMotivo: 'outro', inativoPor: 'Amanda', saidaProgramadaPara: HOJE, saidaMotivo: 'outro', saidaMotivoDetalhe: 'Encerramento do restaurante', saidaAtivaId: SAIDA });
  await seed.set('contratos_cliente', SLUG, { clienteNome: NOME, status: 'encerrado', ativo: true, excluido: false, valorCheio: 1500, valorVigente: 1500, diaVencimento: 10, primeiraCompetencia: '2026-05', ultimaCompetenciaPagamento: ULT, vigencias: [{ inicio: '2026-05', fim: ULT, valor: 1500, cicloId: 'legado-inicial' }], saidaProgramadaPara: HOJE, saidaMotivo: 'outro', encerradoEm: agora, encerradoPor: 'Amanda' });
  await seed.set('clientes_acesso', SLUG, { slug: SLUG, nome: NOME, token: 'tok-' + SLUG, ativo: false, excluido: false, saidaProgramadaPara: HOJE, desativadoPor: 'Amanda' });
  await seed.set('clientes_portal_tokens', 'tok-' + SLUG, { cliente: SLUG, ativo: false, saidaProgramadaPara: HOJE, desativadoPor: 'Amanda', criadoEm: '2026-05-01T12:00:00.000Z' });
  await seed.set('pagamentos_mensais', `${SLUG}_${ULT}`, { cliente: SLUG, clienteNome: NOME, competencia: ULT, valorDevido: 1500, diaVencimento: 10, status: 'pago', pagoEm: `${ULT}-10`, comprovante: '', ultimaCompetenciaDoContrato: true, saidaFinanceiraId: SAIDA });
  await seed.set('pagamentos_mensais', `${SLUG}_${MES}`, { cliente: SLUG, clienteNome: NOME, competencia: MES, valorDevido: 1500, diaVencimento: 10, status: 'cancelado', pagoEm: '', canceladoPorSaida: true, canceladoPorSaidaId: SAIDA, statusAntesSaida: 'aberto', motivoCancelamento: `Competência posterior ao último mês do contrato (${ULT})`, canceladoPor: 'Amanda' });
  await seed.set('clientes_encerrados', SAIDA, { nome: NOME, slug: SLUG, dataAviso: dia(-37), dataSaida: HOJE, ultimaCompetenciaPagamento: ULT, statusSaida: 'encerrada', tipoCliente: 'mensalista', extraId: SLUG, cadastroId: '', leadId: '', leadColecao: '', onboardingId: '', servicos: 'Mensalista', valorMensal: 1500, motivo: 'outro', motivoDetalhe: 'Encerramento do restaurante', pendenciasFinais: 'Últimas postagens', fichaSnapshot: ficha, portalEstadosPreservados: true, origemCentralEntrada: true, criadoPor: 'Amanda', criadoEm: agora, atualizadoPor: 'Amanda', atualizadoEm: agora, excluido: false });
  for (const [post, video, titulo, status, data] of POSTS) {
    await seed.set('videos_producao', video, { cliente: SLUG, clienteNome: NOME, titulo, status: 'aprovado', data: dia(-10), editorAtribuido: 'Helo', editorAtribuidoEm: agora, editorAtribuidoPor: 'Amanda', linkFinalizado: 'https://drive.google.com/file/d/' + video + '/view', clienteAprovou: true, postagemId: post, criadoEm: agora, excluido: false });
    await seed.set('postagens', post, { videoId: video, cliente: SLUG, clienteNome: NOME, titulo, status, dataAgendada: data, horaAgendada: data ? '11:00' : '', legenda: 'Legenda J72', criadoEm: agora, excluido: false });
  }
  await amb.aguardarFunctionsOciosas?.();
  const pagamentosDoCliente = async () => (await seed.listar('pagamentos_mensais')).filter(p => p.cliente === SLUG || String(p.id).startsWith(SLUG + '_'));
  const pagAntes = JSON.stringify((await pagamentosDoCliente()).map(p => [p.id, p.status, p.valorDevido]).sort());
  const saidasAntes = (await seed.listar('clientes_encerrados')).filter(s => s.slug === SLUG).length;

  // Fila da Cecília: quantas postagens do cliente aparecem em "Agendar" e se ela consegue agendar a pendente (servidor confere o cliente).
  const filaCecilia = async (rotulo) => {
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
      await page.waitForFunction(() => { const c = document.getElementById('postagensConteudo'); return c && c.innerText.length > 40 && !/Conferindo/.test(c.innerText); }, null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const texto = await page.evaluate(() => document.getElementById('postagensConteudo')?.innerText || '');
      const vistas = POSTS.filter(([, , t]) => texto.includes(t)).length;
      const [post] = POSTS[0];
      let motivo = '';
      try {
        await page.waitForSelector(`#dataPost_${post}`, { timeout: 10000 });
        await page.fill(`#dataPost_${post}`, dia(2)); await page.fill(`#horaPost_${post}`, '11:00');
        await page.evaluate(p => window.salvarAgendamentoPostagem(p), post);
        const check = page.getByText(/Conferi a origem, a data e o horário/).first();
        await check.waitFor({ timeout: 10000 }); await check.click();
        await page.getByRole('button', { name: /^Salvar agendamento$/ }).click({ timeout: 10000 });
      } catch (e) { motivo = String(e).slice(0, 90); }
      const p = await esperar(async () => { const x = await seed.get('postagens', post); return x?.status === 'agendado' ? x : null; }, 12000);
      const tela = await page.evaluate(() => [...document.querySelectorAll('.toast, #toast')].map(e => e.textContent.trim()).filter(Boolean).join(' | '));
      await foto(page, 'J72-cecilia-' + rotulo);
      return { vistas, agendou: !!p, motivo: (tela || motivo).slice(0, 160), graves: erros.filter(erroGrave) };
    } finally { await fechar(); }
  };

  const t0 = Date.now();
  const antes = await filaCecilia('antes').catch(e => ({ vistas: -1, graves: [String(e).slice(0, 160)] }));
  registrar({ jornada: id, caso: 'Antes: com a saída efetiva a Cecília não consegue agendar', ok: antes.agendou === false, ms: Date.now() - t0,
    detalhe: `${antes.vistas} de ${POSTS.length} postagens listadas · agendar ${antes.agendou ? 'PASSOU' : 'recusado'}${antes.motivo ? ' (' + antes.motivo + ')' : ''}` });

  const t1 = Date.now();
  const { page, erros, fechar } = await nav.novaPagina();
  let telaErro = '';
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(3000);
    await page.evaluate(() => { irPara('cadastro', document.getElementById('navCadastro')); setCadastroSub('arquivo', null); });
    const cartao = page.locator('#arquivoClientesUnico details', { hasText: NOME }).first();
    await cartao.waitFor({ timeout: 40000 });
    await cartao.locator('summary').click();
    const data = cartao.locator('input[type=date][data-adiar-saida-data]').first();
    await data.waitFor({ timeout: 10000 });
    await data.fill(NOVA);
    await cartao.locator('textarea[data-adiar-saida-motivo]').first().fill('Decidiram continuar até as últimas postagens.');
    await cartao.locator('button[data-adiar-saida]').first().click();
    const s = await esperar(async () => { const x = await seed.get('clientes_encerrados', SAIDA); return x?.dataSaida === NOVA ? x : null; });
    telaErro = await page.evaluate(() => [...document.querySelectorAll('.toast, #toast')].map(e => e.textContent.trim()).filter(Boolean).join(' | '));
    await page.waitForTimeout(2000);
    await foto(page, 'J72-amanda');
    const [cfg, ctr, ext, acesso, token] = await Promise.all([seed.get('clientes_config', SLUG), seed.get('contratos_cliente', SLUG), seed.get('clientes_extras', SLUG), seed.get('clientes_acesso', SLUG), seed.get('clientes_portal_tokens', 'tok-' + SLUG)]);
    const pagDepois = JSON.stringify((await pagamentosDoCliente()).map(p => [p.id, p.status, p.valorDevido]).sort());
    const saidasDepois = (await seed.listar('clientes_encerrados')).filter(x => x.slug === SLUG).length;
    const hist = Array.isArray(s?.adiamentosSaida) ? s.adiamentosSaida : [];
    const h = hist[hist.length - 1] || {};
    const graves = erros.filter(erroGrave);
    const checks = {
      'registro de saída adiado (programada)': !!s && s.statusSaida === 'programada' && s.excluido === false,
      'histórico do adiamento (de/para/quem/quando)': h.de === HOJE && h.para === NOVA && h.por === 'Amanda' && !!h.em && h.ultimaCompetenciaPagamento === ULT,
      'mesma competência final': s?.ultimaCompetenciaPagamento === ULT && ctr?.ultimaCompetenciaPagamento === ULT,
      'contrato ativo até a nova data, vigências iguais': ctr?.status === 'ativo' && ctr?.saidaProgramadaPara === NOVA && JSON.stringify(ctr?.vigencias) === JSON.stringify([{ inicio: '2026-05', fim: ULT, valor: 1500, cicloId: 'legado-inicial' }]),
      'nenhuma mensalidade nova ou reaberta': pagAntes === pagDepois,
      'mesma identidade (sem 2º registro de saída)': saidasDepois === saidasAntes && cfg?.saidaAtivaId === SAIDA,
      'cliente ativo até a nova data': cfg?.clienteInativo === false && !cfg?.inativoDesde && cfg?.saidaProgramadaPara === NOVA && ext?.excluido === false,
      'Portal de volta até a nova data': acesso?.ativo === true && token?.ativo === true && acesso?.saidaProgramadaPara === NOVA,
      'sem erro no console': !graves.length,
    };
    const falhas = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    registrar({ jornada: id, caso: 'Amanda adia a saída no Arquivo (mesma competência final)', ok: !falhas.length, ms: Date.now() - t1,
      detalhe: falhas.length ? 'falhou: ' + falhas.join('; ') + (telaErro ? ' · tela: ' + telaErro.slice(0, 160) : '') + (graves.length ? ' | ' + graves[0] : '') : `saída ${HOJE} → ${NOVA}, competência final ${ULT}, mensalidades intactas, 1 registro` });
  } catch (e) {
    await foto(page, 'J72-falha');
    registrar({ jornada: id, caso: 'Amanda adia a saída no Arquivo (mesma competência final)', ok: false, ms: Date.now() - t1, detalhe: 'sem caminho para adiar: ' + String(e).slice(0, 200) + (telaErro ? ' · ' + telaErro : '') });
  } finally { await fechar(); }

  const t2 = Date.now();
  const depois = await filaCecilia('depois').catch(e => ({ vistas: -1, graves: [String(e).slice(0, 160)] }));
  registrar({ jornada: id, caso: 'Depois: as postagens estão na fila da Cecília e ela agenda', ok: depois.vistas === POSTS.length && depois.agendou === true && !depois.graves.length, ms: Date.now() - t2,
    detalhe: `${depois.vistas} de ${POSTS.length} postagens na fila · agendar ${depois.agendou ? 'ok' : 'recusado'}${!depois.agendou && depois.motivo ? ' (' + depois.motivo + ')' : ''}` + (depois.graves.length ? ' | ' + depois.graves[0] : '') });
}
