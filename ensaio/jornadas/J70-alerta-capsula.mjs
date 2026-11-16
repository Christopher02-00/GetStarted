// J70 — Aviso de cápsula (16/11/2026, pedido do Chris: "trazer de volta o aviso de conteúdo cápsula"). Dentro da §52.3:
// o motor só AVISA a Amanda; a decisão e o painel são manuais. Faltava o caso do cliente com calendário e NENHUMA postagem
// ativa — esse cliente nunca era avisado. Casos:
//  (a) cliente com calendário e sem postagem → 1 alerta para a Amanda, com o texto de cápsula e o botão para o painel manual;
//  (b) a 2ª rodada do motor não duplica;
//  (c) postagem futura agendada → o alerta fecha sozinho (soft-delete), sem alerta novo;
//  (d) nada é gravado em `capsulas_clientes`.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J70';
export const nome = 'Cliente sem postagem programada: 1 aviso de cápsula para a Amanda, sem duplicar, fecha sozinho, sem cápsula automática';
const SLUG = 'j70gelato', NOME = 'Gelateria J70';
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const somar = (iso, n) => { const [a, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10); };
const esperar = async (fn, ms = 120000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1500)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = hojeSP(), agora = new Date().toISOString();
  await seed.set('clientes_extras', SLUG, { slug: SLUG, nome: NOME, ativo: true, excluido: false, criadoEm: agora });
  await seed.set('clientes_config', SLUG, { modoAprovacaoCliente: 'manual', tipoCliente: 'mensalista', excluido: false });
  await seed.set('calendarios', SLUG, { cliente: SLUG, client: NOME, updatedAt: agora, items: [
    { itemId: 'calitem_j70_1', mes: hoje.slice(0, 7), day: Number(somar(hoje, 3).slice(8)), dataPostagem: somar(hoje, 3), name: 'Gelato de pistache (J70)', fmt: 'Reel', desc: '', legenda: '', excluido: false }] });
  await amb.aguardarFunctionsOciosas?.();
  const capsulasAntes = (await seed.listar('capsulas_clientes')).length;
  const alertas = async () => (await seed.listar('demandas')).filter(d => d.tipoEspecial === 'alerta_cobertura_postagem' && (d.cliente === SLUG || d.clienteSlugRef === SLUG));

  // só a rodada frequente (onde mora a cobertura): libera a trava sem forçar a manutenção diária
  const rodada = async (r, acao, pronto = null) => {
    await seed.set('sistema', 'motor_lock', { ultimaExecucao: 'liberado-pelo-ensaio', ultimaManutencaoDia: hoje });
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Amanda');
      await esperar(async () => (await seed.get('sistema', 'motor_lock'))?.ultimaExecucao !== 'liberado-pelo-ensaio');
      if (pronto) await esperar(pronto, 60000);
      await page.waitForTimeout(6000);
      const extra = acao ? await acao(page) : null;
      await foto(page, 'J70-rodada' + r);
      return { graves: erros.filter(erroGrave), extra };
    } finally { await fechar(); }
  };
  const t0 = Date.now();
  // (a) primeira rodada: 1 alerta com cápsula + botão para o painel manual
  try {
    const r1 = await rodada(1, async page => {
      const a = (await alertas()).find(d => d.status === 'pendente'); if (!a) return { botao: false };
      await page.waitForFunction(id => (window.todasDemandas || []).some?.(d => d.id === id), a.id, { timeout: 30000 }).catch(() => {});
      await page.evaluate(id => abrirDemandaMinha(id), a.id); await page.waitForTimeout(1500);
      const botao = await page.locator('#modalConteudo [data-alerta-capsula-acao="painel"]').count();
      if (botao) { await page.locator('#modalConteudo [data-alerta-capsula-acao="painel"]').click(); await page.waitForTimeout(2000); }
      return { botao: botao === 1, painel: await page.evaluate(() => !!document.getElementById('view-capsulaAmanda')?.classList.contains('active')) };
    }, async () => (await alertas()).length > 0);
    const l1 = await alertas(), abertos = l1.filter(d => d.status === 'pendente' && d.excluido !== true);
    const a = abertos[0];
    const ok = abertos.length === 1 && l1.length === 1 && a.destinatario === 'Amanda' && a.etapaCobertura === 'sem_postagem_programada' && /cápsula/.test(a.titulo || '') && /cápsula/i.test(a.descricao || '') && r1.extra?.botao && r1.extra?.painel && !r1.graves.length;
    registrar({ jornada: id, caso: 'a cliente sem postagem → 1 aviso de cápsula para a Amanda com o botão do painel', ok, ms: Date.now() - t0,
      detalhe: a ? `"${a.titulo}" para ${a.destinatario} · etapa ${a.etapaCobertura} · ${l1.length} alerta(s) · botão do painel ${r1.extra?.botao ? 'sim' : 'NÃO'} · painel ${r1.extra?.painel ? 'abriu' : 'NÃO abriu'}` + (r1.graves.length ? ' | ' + r1.graves[0] : '') : `nenhum alerta (${l1.length})` });
  } catch (e) { registrar({ jornada: id, caso: 'a cliente sem postagem → 1 aviso de cápsula para a Amanda com o botão do painel', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 260) }); }
  // (b) segunda rodada não duplica
  { const t = Date.now();
    try { const r2 = await rodada(2); const l2 = await alertas();
      registrar({ jornada: id, caso: 'b 2ª rodada do motor não duplica', ok: l2.length === 1 && l2[0].status === 'pendente' && !r2.graves.length, ms: Date.now() - t, detalhe: `${l2.length} alerta(s) · ${l2.map(d => d.status).join(',')}` + (r2.graves.length ? ' | ' + r2.graves[0] : '') });
    } catch (e) { registrar({ jornada: id, caso: 'b 2ª rodada do motor não duplica', ok: false, ms: Date.now() - t, detalhe: String(e).slice(0, 260) }); } }
  // (c) postagem futura → alerta fecha sozinho, sem alerta novo
  { const t = Date.now();
    try {
      await seed.set('postagens', 'j70-post', { cliente: SLUG, clienteNome: NOME, titulo: 'Gelato de pistache (J70)', legenda: 'Legenda J70', status: 'agendado', dataAgendada: somar(hoje, 3), horaAgendada: '11:00', calendarItemId: 'calitem_j70_1', origemManual: true, excluido: false, criadoEm: agora });
      await amb.aguardarFunctionsOciosas?.();
      const r3 = await rodada(3, null, async () => (await alertas()).some(d => d.status === 'cancelado_automaticamente')); const l3 = await alertas();
      const fechado = l3.find(d => d.etapaCobertura === 'sem_postagem_programada');
      const abertos = l3.filter(d => d.status === 'pendente' && d.excluido !== true);
      registrar({ jornada: id, caso: 'c postagem agendada fecha o aviso sozinho (soft-delete)', ok: !!fechado && fechado.status === 'cancelado_automaticamente' && fechado.excluido === true && !abertos.length && !r3.graves.length, ms: Date.now() - t,
        detalhe: `aviso ${fechado ? fechado.status + ' · ' + (fechado.motivoExclusao || '') : 'SUMIU'} · abertos ${abertos.length}` + (r3.graves.length ? ' | ' + r3.graves[0] : '') });
    } catch (e) { registrar({ jornada: id, caso: 'c postagem agendada fecha o aviso sozinho (soft-delete)', ok: false, ms: Date.now() - t, detalhe: String(e).slice(0, 260) }); } }
  // (d) nenhuma cápsula automática
  { const depois = await seed.listar('capsulas_clientes');
    registrar({ jornada: id, caso: 'd nada gravado em capsulas_clientes', ok: depois.length === capsulasAntes, ms: 0, detalhe: `${capsulasAntes} → ${depois.length} documento(s)` }); }
}
