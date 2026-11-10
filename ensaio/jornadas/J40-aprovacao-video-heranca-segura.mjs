// J40 — Herança da legenda na aprovação do cliente é segura (auditoria do percurso 10/11/2026).
//  B) o mês está em ajuste e o cliente pediu ajuste NESTE conteúdo → antes: a postagem herdava a legenda da versão
//     publicada (a que o cliente recusou) e ia direto para "aguardando agendamento"; agora: nasce sem legenda.
import { entrarComo, entrarGerencia, foto } from '../lib/navegador.mjs';
export const id = 'J40';
export const nome = 'Aprovação do cliente: legenda com ajuste pedido pelo cliente não é herdada pela postagem';
const CLIENTE = 'hitech', MES = '2027-01', T0 = '2026-11-01T12:00:00.000Z', T1 = '2026-11-05T12:00:00.000Z';
const RECUSADA = 'Legenda que o cliente recusou J40';
const OP = 'cal_ajuste_v113_' + 'ab'.repeat(24);
const VA = 'j40-video-item-sumiu', VB = 'j40-video-ajuste-pedido';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const itemA = { itemId: 'j40-a', mes: MES, day: 4, name: 'Ensaio J40 A — item que vai sumir', desc: 'Roteiro J40 A', legenda: 'Legenda J40 A', fmt: 'Reel', apr: true, aprPor: 'cliente', excluido: false };
  const itemB = { itemId: 'j40-b', mes: MES, day: 5, name: 'Ensaio J40 — conteúdo com ajuste pedido', desc: 'Roteiro J40', legenda: RECUSADA, fmt: 'Reel', apr: true, aprPor: 'cliente', excluido: false };
  // 1º o mês liberado normalmente (os dois itens existem) — é assim que os vídeos chegam ao cliente
  await seed.set('calendarios', CLIENTE, { cliente: CLIENTE, client: 'Hitech', updatedAt: T0, items: [itemA, itemB],
    aprovacaoMeses: { [MES]: { status: 'liberado', aprovadoPor: 'Amanda', aprovadoEm: T0, enviadoEm: T0, retratoLiberadoV115: { mes: MES, publicadoEm: T0, items: [{ ...itemA }, { ...itemB }] } } } });
  // depois que os vídeos estão com o cliente: o item A some e o cliente pede ajuste no B (mês volta para ajuste)
  const depoisDoCliente = () => seed.set('calendarios', CLIENTE, { cliente: CLIENTE, client: 'Hitech', updatedAt: T1, items: [{ ...itemB, apr: false, aprPor: '' }],
    aprovacaoMeses: { [MES]: { status: 'ajuste_interno', liberadoEmAnterior: T0, liberadoPorAnterior: 'Amanda', motivoAjuste: 'Pedido do cliente',
      retratoLiberadoV115: { mes: MES, publicadoEm: T0, items: [{ ...itemA }, { ...itemB }] } } },
    pedidosAjusteClienteI71: { [OP]: { operationId: OP, calendarId: CLIENTE, itemId: 'j40-b', itemIdx: 0, itemNome: itemB.name, competencia: MES, texto: 'Troquem a legenda, por favor', criadoEm: T1, por: 'Cliente' } } });
  const agora = new Date().toISOString(), hoje = agora.slice(0, 10);
  const video = (id, itemId, titulo) => ({ cliente: CLIENTE, clienteNome: 'Hitech', titulo, status: 'aguardando_aprovacao', data: hoje,
    editorAtribuido: 'Helo', editorAtribuidoEm: agora, editorAtribuidoPor: 'Amanda', enviadoEm: agora, linkFinalizado: 'https://drive.google.com/file/d/' + id + '/view',
    calendarClienteSlug: CLIENTE, calendarItemId: itemId, calendarCompetencia: MES, criadoEm: agora, excluido: false, nivelEscalonamento: 0 });
    await seed.set('videos_producao', VB, video(VB, 'j40-b', itemB.name));
  await amb.aguardarFunctionsOciosas?.();
  const postagemDe = async v => (await seed.listar('postagens')).find(p => p.videoId === v && !p.excluido);

  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    page.on('dialog', d => d.accept());
    // Chris aprova a qualidade dos dois (um clique) → aguardando_cliente
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
    await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    for (const v of [VB]) { const b = page.locator(`[onclick*="aprovarVideo('${v}')"]`).first(); await b.waitFor({ timeout: 15000 }); await b.click();
      await esperar(async () => (await seed.get('videos_producao', v))?.status === 'aguardando_cliente'); await page.waitForTimeout(800); }
    const naoChegou = [];
    for (const v of [VB]) if ((await seed.get('videos_producao', v))?.status !== 'aguardando_cliente') naoChegou.push(v);
    if (naoChegou.length) throw new Error('a aprovação de qualidade não levou ao cliente: ' + naoChegou.join(', '));
    await depoisDoCliente(); await amb.aguardarFunctionsOciosas?.();
    await fechar();
  } catch (e) { await foto(page, 'J40-falha-chris'); await fechar().catch(() => {}); registrar({ jornada: id, caso: 'preparação (Chris aprova a qualidade)', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 240) }); return; }

  const p2 = await nav.novaPagina();
  try {
    p2.page.on('dialog', d => d.accept());
    await entrarComo(p2.page, amb.url(), 'Amanda'); await p2.page.waitForTimeout(2500);
    await entrarGerencia(p2.page); await p2.page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    const caso = async (nomeCaso, v, esperado) => {
      const t = Date.now();
      const b = p2.page.locator(`[onclick*="marcarClienteAprovouVideo('${v}')"]`).first(); await b.waitFor({ timeout: 15000 }); await b.click();
      // item sumido: o caminho certo é a decisão explícita da origem (Amanda confirma "fora da pauta"), não um erro
      const fora = p2.page.getByRole('button', { name: /^Confirmar conteúdo realmente fora da pauta$/ });
      if (v === VA) { await fora.waitFor({ timeout: 15000 }); await fora.click(); try { await p2.page.getByRole('button', { name: /^Confirmar esta ação$|^Confirmar$/ }).last().click({ timeout: 4000 }); } catch {} }
      const p = await esperar(async () => { const x = await postagemDe(v); return x && (await seed.get('videos_producao', v))?.status === 'aprovado' ? x : null; });
      const vid = await seed.get('videos_producao', v);
      const ok = !!p && p.status === 'aguardando_legenda' && !String(p.legenda || '').trim();
      const graves = p2.erros.filter(erroGrave);
      registrar({ jornada: id, caso: nomeCaso, ok: ok && !graves.length, ms: Date.now() - t,
        detalhe: p ? `vídeo ${vid?.status} · postagem ${p.status} · legenda ${String(p.legenda || '').trim() ? '"' + p.legenda + '"' : 'vazia'} (${esperado})` : `vídeo ficou ${vid?.status} · sem postagem` + (graves.length ? ' | ' + graves[0] : '') });
      await p2.page.waitForTimeout(800);
    };
    await caso('B Legenda com ajuste pedido não é herdada', VB, 'esperado: postagem sem a legenda recusada');
    await foto(p2.page, 'J40-amanda');
  } catch (e) { await foto(p2.page, 'J40-falha').catch(() => {}); registrar({ jornada: id, caso: 'Amanda marca cliente aprovou', ok: false, ms: 0, detalhe: String(e).slice(0, 240) }); }
  finally { await p2.fechar().catch(() => {}); }
}
