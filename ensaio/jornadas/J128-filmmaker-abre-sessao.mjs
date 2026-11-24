// J128 — CP273 (24/11/2026, Chris: "eles ainda não conseguem abrir sessão dos clientes… há 2 semanas sobem como avulso os mensalistas";
// decisão: "Filmmaker abre a sessão"). Caso real: desde 14/11 nenhuma gravação de mensalista foi marcada na agenda (Hauer, São José,
// Óticas, Place, Master Chef, Cookiery, VIP, Bluefit, Divina) e Luís/Nathan só tinham o "Gravado avulso". Esperado, como o Luís:
//  1. em "Enviar materiais → Gravação da agenda", sem sessão do cliente, aparece "Abrir sessão" com o mensalista na lista;
//  2. ele abre a sessão de hoje: nasce no nome dele, já aprovada, com o checklist do calendário do mês (rules aceitam);
//  3. repetir (clique duplo / outra aba) não cria outra sessão;
//  4. ele marca o conteúdo do calendário e envia: sessão realizada e vídeo ligado ao conteúdo (não é avulso);
//  5. data futura é recusada (a sessão registra gravação que já aconteceu);
//  6. no "Gravado avulso", escolher o mensalista mostra "abra a sessão" e o envio sem marcar "conteúdo extra" é recusado;
//  7. a Cecília vê na agenda que a sessão foi aberta pelo filmmaker.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J128';
export const nome = 'Filmmaker abre a sessão do mensalista na hora do envio (sem depender da agenda) e o vídeo nasce ligado ao calendário';

const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const ITEM = 'calitem_j128', NOME_ITEM = 'Mochi — Bastidores da cozinha (J128)';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = hojeSP(), mes = hoje.slice(0, 7), AG = `cp273_mochi_${hoje}_luis`;
  const cal = await seed.get('calendarios', 'mochi'), itens = [...(cal?.items || [])].filter(i => i?.itemId !== ITEM);
  itens.push({ itemId: ITEM, mes, day: Number(hoje.slice(8, 10)), name: NOME_ITEM, desc: 'Roteiro J128', legenda: '', fmt: 'Reel', excluido: false });
  const { id: _x, ...semId } = cal || {};
  await seed.set('calendarios', 'mochi', { cliente: 'mochi', client: 'Mochi', ...semId, items: itens, aprovacaoMeses: { ...(semId.aprovacaoMeses || {}), [mes]: { status: 'liberado', por: 'Amanda', em: new Date().toISOString() } } });
  // produção já tem a preparação I28 concluída (calendarios_vinculos_controle/i28 pronto, versão 28); o seed padrão não
  await seed.set('calendarios_vinculos_controle', 'i28', { pronto: true, versao: 28, quantidade: 0, hashInventario: '0'.repeat(64), criadoEm: new Date().toISOString(), criadoPor: 'ensaio' });
  await amb.aguardarFunctionsOciosas?.();
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const pagina = async (pessoa, fn) => {
    const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await page.evaluate(() => { const o = window.mostrarToast; window.__toastsJ128 = []; window.mostrarToast = (m, k) => { window.__toastsJ128.push(String(m)); try { o?.(m, k); } catch (e) {} }; });
      return await fn(page, erros);
    } catch (e) { await foto(page, `J128-${pessoa}-falha`); throw e; } finally { await fechar(); }
  };
  const toasts = page => page.evaluate(() => (window.__toastsJ128 || []).slice(-3).join(' | '));
  const abrirEnvio = async page => {
    await page.evaluate(() => irPara('videos', document.getElementById('navVideos'))); await page.waitForTimeout(1200);
    await page.evaluate(() => escolherOrigemMaterial('gravado'));
    await page.locator('#sessaoEnvioI52').waitFor({ state: 'attached', timeout: 25000 });
  };
  const sessoes = async () => (await seed.listar('agendamentos')).filter(a => (a.cliente === 'mochi' || a.clienteSlug === 'mochi') && a.aberturaFilmmakerCp273 && !a.excluido);
  try {
    await pagina('Luís', async (page, erros) => {
      await abrirEnvio(page);
      const bloco = await page.evaluate(() => { const b = document.querySelector('[data-abrir-sessao-cp273]'); return b ? { opcoes: [...b.querySelectorAll('#clienteSessaoCp273 option')].map(o => o.value) } : null; });
      fim('1 sem sessão na agenda, o envio oferece "Abrir sessão" com o mensalista', bloco && bloco.opcoes.includes('mochi') && !bloco.opcoes.some(v => v.startsWith('externo--')), JSON.stringify(bloco));
      // 5. data futura recusada antes de gravar
      const amanha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() + 864e5));
      await page.evaluate(d => window.abrirSessaoFilmmakerCp273('mochi', d), amanha); await page.waitForTimeout(1500);
      const tFut = await toasts(page);
      fim('5 data futura é recusada (a sessão registra gravação que já aconteceu)', /hoje ou de um dia anterior/.test(tFut) && !(await sessoes()).some(a => a.data === amanha), tFut);
      // 2. abre a sessão de hoje pelo botão
      await page.selectOption('#clienteSessaoCp273', 'mochi'); await page.fill('#dataSessaoCp273', hoje);
      await page.click('#btnAbrirSessaoCp273');
      const ag = await esperar(async () => (await seed.get('agendamentos', AG)) || null);
      const selecionada = await page.waitForFunction(ag => document.getElementById('sessaoEnvioI52')?.value === ag, AG, { timeout: 25000 }).then(() => true).catch(() => false);
      await foto(page, 'J128-luis-abriu-sessao');
      fim('2 a sessão nasce no nome dele, aprovada, com o checklist do mês, e fica selecionada no envio',
        ag && ag.status === 'agendado' && ag.aprovado === true && ag.filmmaker === 'Luís' && JSON.stringify(ag.equipe) === JSON.stringify([{ nome: 'Luís', papel: 'Filmmaker' }]) &&
        ag.aberturaFilmmakerCp273?.por === 'Luís' && ag.mesCalendario === mes && (ag.sessaoItensPlanejados || []).some(x => x.itemId === ITEM) && selecionada,
        ag ? `status ${ag.status} · aprovado ${ag.aprovado} · mês ${ag.mesCalendario} · checklist ${(ag.sessaoItensPlanejados || []).length} item(ns) · selecionada ${selecionada} · ${await toasts(page)}` : 'sessão não criada · ' + await toasts(page));
      // 3. repetir não cria outra
      await page.evaluate(() => window.abrirSessaoFilmmakerCp273('mochi', new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()))); await page.waitForTimeout(2500);
      const s3 = await sessoes();
      fim('3 repetir não cria outra sessão', s3.filter(a => a.data === hoje).length === 1, `${s3.length} sessão(ões) aberta(s) pelo filmmaker para a Mochi`);
      const graves = erros.filter(erroGrave);
      fim('8 sem erro grave no console (abrir sessão)', !graves.length, graves[0] || 'nenhum');
    });
    // 7. a Cecília vê na agenda
    await pagina('Cecília', async page => {
      await page.evaluate(() => irPara('agendamento', document.getElementById('navAgendamento')));
      const ok = await page.waitForFunction(() => /aberta pelo filmmaker/.test(document.getElementById('view-agendamento')?.innerText || ''), null, { timeout: 25000 }).then(() => true).catch(() => false);
      await foto(page, 'J128-cecilia-agenda');
      fim('7 a Cecília vê na agenda que a sessão foi aberta pelo filmmaker', ok, ok ? 'rótulo visível' : 'rótulo não apareceu');
    });
    // 4. o Luís marca o conteúdo e envia pela sessão
    await pagina('Luís', async (page, erros) => {
      await abrirEnvio(page);
      await page.selectOption('#sessaoEnvioI52', AG); await page.waitForTimeout(2500);
      const chk = page.locator(`.chkVideoCalendario_${AG}[data-item-id="${ITEM}"]`); await chk.waitFor({ state: 'attached', timeout: 25000 });
      await page.evaluate(sel => { const c = document.querySelector(sel); c?.scrollIntoView(); if (c && !c.checked) c.click(); }, `.chkVideoCalendario_${AG}[data-item-id="${ITEM}"]`); await page.waitForTimeout(800);
      await page.evaluate(ag => { const b = document.getElementById('btnConfirmarGravacao_' + ag); if (b) { b.disabled = false; b.click(); } }, AG);
      const abriu = await page.waitForFunction(() => !!document.querySelector('dialog#identificarEnvioI106[open] [data-confirmar]'), null, { timeout: 15000 }).then(() => true).catch(() => false);
      if (abriu) await page.evaluate(() => [...document.querySelectorAll('dialog#identificarEnvioI106[open]')].pop()?.querySelector('[data-confirmar]')?.click());
      const ag = await esperar(async () => { const x = await seed.get('agendamentos', AG); return x?.status === 'realizado' ? x : null; }, 40000);
      const vid = (await seed.listar('videos_producao')).find(v => v.agendamentoId === AG && !v.excluido);
      await foto(page, 'J128-luis-enviou');
      fim('4 marca o conteúdo e envia: sessão realizada e vídeo ligado ao conteúdo do calendário (não avulso)',
        ag && vid && vid.calendarItemId === ITEM && vid.origemRegistro !== 'video_avulso_i67',
        `sessão ${ag?.status || '?'} · vídeo ${vid ? vid.titulo + ' · item ' + (vid.calendarItemId || '-') + ' · origem ' + (vid.origemRegistro || 'sessão') : 'não criado'} · ${await toasts(page)}`);
      const graves = erros.filter(erroGrave);
      fim('9 sem erro grave no console (envio pela sessão)', !graves.length, graves[0] || 'nenhum');
    });
    // 6. avulso de mensalista manda abrir a sessão
    await pagina('Luís', async page => {
      await page.evaluate(() => irPara('videos', document.getElementById('navVideos'))); await page.waitForTimeout(1200);
      await page.evaluate(() => escolherOrigemMaterial('avulso'));
      await page.waitForFunction(() => [...document.querySelectorAll('#videoCliente option')].some(o => o.value === 'mochi'), null, { timeout: 25000 });
      await page.selectOption('#videoCliente', 'mochi'); await page.waitForTimeout(2500);
      const aviso = await page.evaluate(() => !document.getElementById('avisoMensalistaCp273')?.hidden);
      await page.fill('#videoNomesPrincipais', 'Vídeo avulso J128').catch(() => {});
      const antes = (await seed.listar('videos_producao')).filter(v => v.cliente === 'mochi' && /avulso J128/.test(v.titulo || '')).length;
      await page.evaluate(() => window.lancarVideos()); await page.waitForTimeout(2500);
      const depois = (await seed.listar('videos_producao')).filter(v => v.cliente === 'mochi' && /avulso J128/.test(v.titulo || '')).length;
      const t = await toasts(page);
      await foto(page, 'J128-luis-avulso-mensalista');
      fim('6 avulso de mensalista: aviso "abra a sessão" e envio recusado sem marcar conteúdo extra', aviso && depois === antes && /abra a sessão/.test(t), `aviso ${aviso} · vídeos ${antes}→${depois} · ${t}`);
    });
  } catch (e) { fim('filmmaker abre a sessão', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
}
