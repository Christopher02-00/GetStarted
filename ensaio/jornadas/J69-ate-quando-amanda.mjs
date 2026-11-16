// J69 — "Postagem Até Quando" (16/11/2026). Com a Central R87 ativa (estado real, seed padrão), a Amanda tinha perdido a
// porta da barra lateral (§52.1). E a tela respondia com a data MANUAL, sem mostrar o que está agendado, o que falta agendar
// nem a frequência. Casos:
//  (a) Amanda e Cecília abrem pela barra lateral; o Chris pela Central ("Postagem até quando") — a barra dele não muda;
//  (b) cliente semeado: data até = última postagem agendada ativa; lista de agendados; lista do calendário ainda não agendado;
//      frequência planejada (calendário) e real (últimos 30 dias); a anotação manual diferente aparece só como divergência;
//  (c) a tela antiga e o resumo do painel dão a MESMA resposta (uma projeção);
//  (d) Helo não tem a porta e a tela não renderiza.
import { entrarComo, foto, menuVisivel, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J69';
export const nome = 'Postagem Até Quando: Amanda pela barra lateral, uma conta só (agendados, não agendados, frequência)';
const SLUG = 'j69padaria', NOME = 'Padaria J69';
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const somar = (iso, n) => { const [a, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10); };
const mesSeg = mes => { const [a, m] = mes.split('-').map(Number); return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = hojeSP(), mes = hoje.slice(0, 7), prox = mesSeg(mes), agora = new Date().toISOString();
  const d2 = somar(hoje, 2), d4 = somar(hoje, 4), d9 = somar(hoje, 9);
  await seed.set('clientes_extras', SLUG, { slug: SLUG, nome: NOME, ativo: true, excluido: false, criadoEm: agora });
  await seed.set('clientes_config', SLUG, { modoAprovacaoCliente: 'manual', tipoCliente: 'mensalista', excluido: false });
  const post = (pid, campos) => seed.set('postagens', pid, { cliente: SLUG, clienteNome: NOME, legenda: 'Legenda J69', origemManual: true, excluido: false, criadoEm: agora, ...campos });
  await post('j69-a', { titulo: 'Pão de queijo saindo do forno (J69)', formato: 'REELS', status: 'agendado', dataAgendada: d2, horaAgendada: '10:00', calendarItemId: 'calitem_j69_1' });
  await post('j69-b', { titulo: 'Carrossel do cardápio (J69)', formato: 'CARROSSEL', status: 'agendado', dataAgendada: d9, horaAgendada: '18:30', calendarItemId: 'calitem_j69_2' });
  await post('j69-c', { titulo: 'Bolo de fubá (J69)', status: 'postado', dataAgendada: somar(hoje, -5), postadoEm: agora, postadoPor: 'Cecília' });
  await post('j69-d', { titulo: 'Café coado (J69)', status: 'postado', dataAgendada: somar(hoje, -12), postadoEm: agora, postadoPor: 'Cecília' });
  await post('j69-e', { titulo: 'Retirado (J69)', status: 'agendado', dataAgendada: somar(hoje, 20), excluido: true });
  await post('j69-f', { titulo: 'Pronto sem agenda (J69)', status: 'aguardando_agendamento', dataAgendada: somar(hoje, 25) });
  const mesDe = iso => iso.slice(0, 7);
  const itens = [
    { itemId: 'calitem_j69_1', mes: mesDe(d2), day: +d2.slice(8), dataPostagem: d2, name: 'Pão de queijo saindo do forno (J69)', fmt: 'Reel', agendado: true, postagemId: 'j69-a' },
    { itemId: 'calitem_j69_2', mes: mesDe(d9), day: +d9.slice(8), dataPostagem: d9, name: 'Carrossel do cardápio (J69)', fmt: 'Carrossel' },
    { itemId: 'calitem_j69_3', mes: mesDe(d4), day: +d4.slice(8), dataPostagem: d4, name: 'Foto do café da manhã (J69)', fmt: 'Foto' },
    { itemId: 'calitem_j69_4', mes: prox, day: 10, name: 'Story bastidores (J69)', fmt: 'Story' },
    { itemId: 'calitem_j69_5', mes, day: 1, name: 'Excluído (J69)', fmt: 'Reel', excluido: true },
  ].map(i => ({ desc: '', legenda: '', excluido: false, ...i }));
  await seed.set('calendarios', SLUG, { cliente: SLUG, client: NOME, items: itens, updatedAt: agora });
  await seed.set('controle_postagens', SLUG, { clienteNome: NOME, postagemAte: somar(hoje, 30), observacoes: 'anotação antiga J69', atualizadoPor: 'Cecília', atualizadoEm: agora });
  await amb.aguardarFunctionsOciosas?.();
  const planejadoMes = itens.filter(i => !i.excluido && i.mes === mes).length, planejadoProx = itens.filter(i => !i.excluido && i.mes === prox).length;
  const esperadoNaoAg = ['calitem_j69_3', 'calitem_j69_4'];

  const lerTela = page => page.evaluate(slug => {
    const card = document.querySelector(`#controlePostagemBox [data-ate-quando-cliente="${slug}"]`); if (!card) return null;
    const num = k => document.querySelector(`#controlePostagemBox [data-ate-quando-resumo="${k}"] .num`)?.textContent.trim();
    return { ate: card.dataset.ate, faixa: card.dataset.faixa, prazo: card.querySelector('[data-ate-quando-prazo]')?.textContent.trim(),
      agendados: [...card.querySelectorAll('[data-ate-quando-agendado]')].map(li => li.dataset.ateQuandoAgendado),
      naoAgendados: [...card.querySelectorAll('[data-ate-quando-nao-agendado]')].map(li => li.dataset.ateQuandoNaoAgendado),
      frequencia: card.querySelector('[data-ate-quando-frequencia]')?.textContent.trim() || '',
      divergencia: /A anotação diz/.test(card.textContent),
      resumo: ['acaba3', 'semana', 'folga', 'semNada'].map(num).join('/') };
  }, SLUG);
  const conferir = t => {
    const falhas = [];
    if (!t) return ['cartão do cliente não apareceu'];
    if (t.ate !== d9) falhas.push(`até ${t.ate} (esperado ${d9})`);
    if (t.faixa !== 'folga') falhas.push('faixa ' + t.faixa);
    if (t.agendados.join(',') !== 'j69-a,j69-b') falhas.push('agendados ' + t.agendados.join(','));
    if (t.naoAgendados.join(',') !== esperadoNaoAg.join(',')) falhas.push('não agendados ' + t.naoAgendados.join(','));
    if (!t.frequencia.includes(`planejado: ${planejadoMes}/mês`) || !t.frequencia.includes(`: ${planejadoProx})`) || !t.frequencia.includes('real: 2 nos últimos 30 dias')) falhas.push('frequência "' + t.frequencia + '"');
    if (!t.divergencia) falhas.push('anotação manual diferente sem aviso de divergência');
    return falhas;
  };

  const passo = async (caso, pessoa, acao) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(3500);
      const r = await acao(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J69-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!r?.ok && !graves.length, ms: Date.now() - t0, detalhe: (r?.detalhe || '-') + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, `J69-${caso.replace(/\W+/g, '_')}-falha`).catch(() => {}); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
    finally { await fechar(); }
  };
  const pelaBarra = async page => {
    const menu = await menuVisivel(page);
    if (!menu.includes('navControlePostagem')) return { ok: false, detalhe: '"Postagem Até Quando" não está na barra lateral' };
    await abrirMenuSeMovel(page); await page.click('#navControlePostagem');
    await page.waitForSelector(`#controlePostagemBox [data-ate-quando-cliente="${SLUG}"]`, { timeout: 30000 });
    await page.locator(`#controlePostagemBox [data-ate-quando-cliente="${SLUG}"] summary`).click();
    const t = await lerTela(page), f = conferir(t);
    return { ok: !f.length, detalhe: f.length ? f.join(' · ') : `pela barra: ${t.prazo} · ${t.frequencia} · resumo ${t.resumo}` };
  };

  await passo('a1 Amanda abre pela barra lateral com a Central ativa', 'Amanda', pelaBarra);
  await passo('a2 Cecília abre pela barra lateral', 'Cecília', pelaBarra);
  await passo('a3 Chris abre pela Central e as três telas dão a mesma resposta', 'Chris', async page => {
    const menu = await menuVisivel(page);
    await page.evaluate(() => window.abrirEntradaCentralR87());
    await page.waitForSelector('#centralUnificadaR87:not([hidden]) [data-grupo-r87="publicar"]', { timeout: 30000 });
    await page.click('#centralUnificadaR87 [data-grupo-r87="publicar"]');
    await page.waitForSelector('#centralUnificadaR87 [data-area-r87="cobertura"]', { timeout: 20000 });
    await page.click('#centralUnificadaR87 [data-area-r87="cobertura"]');
    await page.waitForSelector(`#controlePostagemBox [data-ate-quando-cliente="${SLUG}"]`, { timeout: 30000 });
    const t = await lerTela(page), f = conferir(t);
    const outras = await page.evaluate(async slug => {
      const ler = raiz => { const c = raiz.querySelector(`[data-ate-quando-cliente="${slug}"]`); return { ate: c?.dataset.ate ?? null, resumo: ['acaba3', 'semana', 'folga', 'semNada'].map(k => raiz.querySelector(`[data-ate-quando-resumo="${k}"] .num`)?.textContent.trim()).join('/') }; };
      await renderConteudoAteQuando(); const b = ler(document.getElementById('gerenciaConteudoAteQuando'));
      const div = document.createElement('div'); div.innerHTML = await htmlPostagemAteQuandoResumo(); const c = ler(div);
      return { b, c };
    }, SLUG);
    if (outras.b.ate !== t?.ate || outras.b.resumo !== t?.resumo) f.push(`tela antiga diz ${outras.b.ate} · ${outras.b.resumo}`);
    if (outras.c.resumo !== t?.resumo) f.push(`resumo do painel diz ${outras.c.resumo}`);
    return { ok: !f.length, detalhe: (f.length ? f.join(' · ') : `Central → até ${t.ate} · três telas com resumo ${t.resumo}`) + ` · barra do Chris ${menu.includes('navControlePostagem') ? 'COM' : 'sem'} o item (como antes)` };
  });
  await passo('d Helo não tem a porta nem a tela', 'Helo', async page => {
    const menu = await menuVisivel(page);
    const r = await page.evaluate(async () => { try { irPara('controlePostagem', document.getElementById('navControlePostagem')); } catch (e) {} await new Promise(r => setTimeout(r, 2500));
      return { cards: document.querySelectorAll('[data-ate-quando-cliente]').length, ativa: !!document.getElementById('view-controlePostagem')?.classList.contains('active') }; });
    const ok = !menu.includes('navControlePostagem') && r.cards === 0 && !r.ativa;
    return { ok, detalhe: `item na barra: ${menu.includes('navControlePostagem') ? 'SIM' : 'não'} · tela ativa: ${r.ativa ? 'SIM' : 'não'} · cartões: ${r.cards}` };
  });
}
