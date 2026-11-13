// J66 — CP214 (13/11/2026, proposta da Amanda aprovada pelo Chris): vídeo aprovado sem conteúdo no calendário vira UMA demanda
// de legenda para a Amanda, com o link para assistir. Casos:
//  (a) o vídeo entra na fila sem ligação → 1 demanda para a Amanda; ela escreve a legenda → a postagem vai para a Cecília agendar
//      e a demanda fecha sozinha com o motivo;
//  (b) ligar o vídeo a um conteúdo do calendário pela fila fecha a demanda;
//  (c) "Não vai para o feed" pela demanda encerra igual à CP211 (motivo obrigatório) e fecha a demanda;
//  (d) reprocessar (de novo, e mexer na postagem) não duplica a demanda.
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J66';
export const nome = 'Vídeo aprovado sem conteúdo no calendário vira demanda de legenda da Amanda (sem duplicar, fecha sozinha)';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const DEM = pid => 'legenda_sem_vinculo_cp214_' + pid;

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = new Date().toISOString().slice(0, 10), mes = hoje.slice(0, 7);
  const cal = await seed.get('calendarios', 'mochi');
  const itens = [...(cal?.items || [])].filter(i => i?.itemId !== 'calitem_j66');
  itens.push({ itemId: 'calitem_j66', mes, day: 26, name: 'Mochi — Sobremesa da semana (J66)', desc: 'Roteiro J66', legenda: 'Legenda planejada J66', fmt: 'Reel', excluido: false });
  const { id: _x, ...semId } = cal || {}; await seed.set('calendarios', 'mochi', { cliente: 'mochi', client: 'Mochi', ...semId, items: itens });
  const novo = async vid => {
    const pid = 'video_' + vid, link = 'https://drive.google.com/file/d/Ensaio' + vid.replace(/-/g, '') + '/view';
    await seed.set('videos_producao', vid, { cliente: 'mochi', clienteNome: 'Mochi', titulo: 'Mochi — Vídeo sem lugar ' + vid, status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', linkFinalizado: link, calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', postagemId: pid, data: hoje, criadoEm: new Date(), excluido: false });
    await seed.set('postagens', pid, { videoId: vid, cliente: 'mochi', clienteNome: 'Mochi', titulo: 'Mochi — Vídeo sem lugar ' + vid, linkVideo: link, legenda: '', status: 'aguardando_legenda', calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo', demandaLegendaCriada: true, excluido: false, criadoEm: new Date() });
    return pid;
  };
  const [pa, pb, pc] = [await novo('j66-a'), await novo('j66-b'), await novo('j66-c')];
  const demanda = pid => esperar(async () => seed.get('demandas', DEM(pid)));
  const fechada = pid => esperar(async () => { const d = await seed.get('demandas', DEM(pid)); return d?.status === 'aprovada' ? d : null; });

  const passo = async (caso, pessoa, acao) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      const r = await acao(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J66-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!r?.ok && !graves.length, ms: Date.now() - t0, detalhe: (r?.detalhe || '-') + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, `J66-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
    finally { await fechar(); }
  };

  // (a) demanda criada para a Amanda → ela escreve a legenda pela demanda → Cecília agenda; demanda fecha
  const da = await demanda(pa);
  registrar({ jornada: id, caso: 'a1 vídeo sem ligação gera 1 demanda para a Amanda', ok: !!da && da.destinatario === 'Amanda' && da.status === 'pendente' && /Legenda · Mochi · /.test(da.titulo || '') && /Assistir: https:/.test(da.descricao || ''), ms: 0,
    detalhe: da ? `"${da.titulo}" para ${da.destinatario} · ${da.status} · link ${/Assistir: https:/.test(da.descricao || '') ? 'presente' : 'AUSENTE'}` : 'NENHUMA demanda criada' });
  if (da) await passo('a2 Amanda escreve a legenda pela demanda e vai para a Cecília', 'Amanda', async page => {
    await page.evaluate(() => { const el = [...document.querySelectorAll('[onclick*="irPara(\'minhasDemandasAtribuidas\'"]')][0]; irPara('minhasDemandasAtribuidas', el); });
    await page.waitForFunction(id => (window.todasDemandas || []).some?.(d => d.id === id) || typeof abrirDemandaMinha === 'function', DEM(pa), { timeout: 20000 }); await page.waitForTimeout(3000);
    await page.evaluate(id => abrirDemandaMinha(id), DEM(pa));
    await page.locator('[data-cp214-acao="legenda"]').click({ timeout: 15000 });
    await page.waitForSelector(`#legenda_${pa}`, { timeout: 20000 });
    await page.fill(`#legenda_${pa}`, 'Legenda escrita pela Amanda pela demanda (J66) — mochi de pistache. #mochi');
    await page.evaluate(id => window.salvarLegenda(id), pa);
    const p = await esperar(async () => { const x = await seed.get('postagens', pa); return x?.status === 'aguardando_agendamento' ? x : null; });
    const d = await fechada(pa);
    return { ok: !!p && p.legendaPor === 'Amanda' && !!d && /Legenda escrita por Amanda/.test(d.notaConclusao || ''), detalhe: `postagem ${p ? p.status + ' (legenda por ' + p.legendaPor + ')' : 'NÃO foi para a Cecília'} · demanda ${d ? 'fechada: ' + d.notaConclusao : 'continua aberta'}` };
  });

  // (b) ligar pela fila fecha a demanda
  if (await demanda(pb)) await passo('b ligar ao calendário pela fila fecha a demanda', 'Chris', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
    await page.evaluate(() => mudarEtapaLegendasI66('videos'));
    const card = page.locator(`[data-legenda-post-i66="${pb}"]`); await card.waitFor({ timeout: 20000 }); await page.waitForTimeout(2000);
    await card.locator('[data-vincular-calendario-cp207]').click();
    await page.locator('#i78Mes').waitFor({ timeout: 15000 }); await page.selectOption('#i78Mes', mes);
    await page.selectOption('#i78Item', JSON.stringify(['mochi', mes, 'calitem_j66']));
    await page.locator('button[data-salvar]').click();
    const d = await fechada(pb);
    return { ok: !!d && /ligado a um conteúdo do calendário/.test(d.notaConclusao || ''), detalhe: d ? 'demanda fechada: ' + d.notaConclusao : 'demanda continua aberta (órfã)' };
  });

  // (c) "Não vai para o feed" pela demanda: encerramento CP211 com motivo → demanda fecha
  if (await demanda(pc)) await passo('c não vai para o feed encerra igual à CP211', 'Amanda', async page => {
    await page.evaluate(() => { const el = [...document.querySelectorAll('[onclick*="irPara(\'minhasDemandasAtribuidas\'"]')][0]; irPara('minhasDemandasAtribuidas', el); });
    await page.waitForTimeout(3500);
    await page.evaluate(id => abrirDemandaMinha(id), DEM(pc));
    await page.locator('[data-cp214-acao="fora-do-feed"]').click({ timeout: 15000 });
    await page.waitForTimeout(4000);
    console.log('[J66 diag] botões', await page.evaluate(() => [...document.querySelectorAll('#modalConteudo button, #modalConteudo summary')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0, 50)).join(' | ')));
    const encerrar = page.getByRole('button', { name: /^Encerrar sem publicar$/ }).first();
    await encerrar.waitFor({ timeout: 20000 });
    await page.getByLabel(/Conta o motivo/).fill('Material de tráfego pago (J66), não vai para o feed.');
    await encerrar.click();
    const p = await esperar(async () => { const x = await seed.get('postagens', pc); return x && x.status !== 'aguardando_legenda' ? x : null; });
    const d = await fechada(pc);
    return { ok: !!p && ['arquivada_sem_postagem', 'cancelada_manual'].includes(p.status) && !!d && /Não vai para o feed/.test(d.notaConclusao || ''), detalhe: `postagem ${p?.status || 'continua aguardando legenda'} · demanda ${d ? 'fechada: ' + d.notaConclusao.slice(0, 90) : 'continua aberta'}` };
  });

  // (d) reprocessar não duplica: sincronização de novo + mexer na postagem
  { const t0 = Date.now();
    try {
      const pd = await novo('j66-d'); await demanda(pd);
      const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + amb.portas.firestore;
      const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
      const app = getApps().find(a => a.name === 'ensaio-j66') || initializeApp({ projectId: PROJETO }, 'ensaio-j66');
      const m = await import(pathToFileURL(path.join(RAIZ, 'functions-get/legenda-sem-vinculo-cp214.mjs')).href);
      const r1 = await m.sincronizarDemandaLegendaCp214(getFirestore(app), pd), r2 = await m.sincronizarDemandaLegendaCp214(getFirestore(app), pd);
      const atual = await seed.get('postagens', pd); const { id: _p, ...semIdP } = atual; await seed.set('postagens', pd, { ...semIdP, observacaoEnsaioJ66: 'mexeu' });
      await amb.aguardarFunctionsOciosas?.(); await new Promise(r => setTimeout(r, 3000));
      const todas = (await seed.listar('demandas')).filter(d => d.postagemId === pd && d.tipoEspecial === 'legenda_sem_vinculo_cp214');
      registrar({ jornada: id, caso: 'd reprocessar não duplica', ok: todas.length === 1 && r1.acao === 'ja_existe' && r2.acao === 'ja_existe', ms: Date.now() - t0, detalhe: `${todas.length} demanda(s) para a postagem · reprocessos: ${r1.acao}, ${r2.acao}` });
    } catch (e) { registrar({ jornada: id, caso: 'd reprocessar não duplica', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 300) }); }
  }
}
