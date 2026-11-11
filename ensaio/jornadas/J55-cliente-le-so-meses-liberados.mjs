// J55 — O link do cliente só lê os meses liberados (CP200, etapa 2 das regras, ok do Chris em 11/11/2026).
// Antes: o navegador do cliente lia `calendarios/{slug}` inteiro — inclusive o mês que a equipe ainda está montando
// (pelo console dava para ver o rascunho) — e gravava aprovação/texto/recado direto nele.
// Agora: ele lê `calendarios_cliente/{slug}` (cópia do servidor só com o que ele pode ver), o original é negado a ele,
// a aprovação passa pelo servidor e, quando a equipe libera um mês, a cópia passa a mostrar esse mês sozinha (gatilho).
// Usa o calendário da Bluefit da J06 (dezembro liberado) e acrescenta um conteúdo de janeiro ainda em revisão interna.
import { foto } from '../lib/navegador.mjs';
export const id = 'J55';
export const nome = 'Link do cliente lê só os meses liberados; aprovação pelo servidor; mês liberado aparece sozinho';
const CLIENTE = 'bluefit', MES = '2026-12', OCULTO = '2027-01', TITULO1 = 'Ensaio J06 — Reels de aquecimento', ESCONDIDO = 'Ensaio J55 — rascunho de janeiro';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const cal = await seed.get('calendarios', CLIENTE);
  const i1 = (cal?.items || []).findIndex(i => i?.name === TITULO1 && !i.excluido);
  if (i1 < 0 || cal?.aprovacaoMeses?.[MES]?.status !== 'liberado') { registrar({ jornada: id, caso: 'preparação', ok: false, ms: 0, detalhe: 'depende da J06 (dezembro liberado)' }); return; }
  // preparação: o 1º conteúdo de dezembro sem aprovação; janeiro com um conteúdo em revisão interna (a equipe ainda monta)
  const { postagemId: _p, agendado: _a, dataPostagem: _d, ...limpo } = cal.items[i1];
  cal.items[i1] = { ...limpo, apr: false, aprPor: '', aprEm: '' };
  cal.items = (cal.items || []).filter(i => i?.name !== ESCONDIDO).concat([{ itemId: 'calitem_j55_oculto', name: ESCONDIDO, mes: OCULTO, day: 8, stage: 'roteiro', fmt: 'reels', desc: 'Texto que o cliente ainda não pode ver', legenda: '' }]);
  cal.aprovacaoMeses = { ...(cal.aprovacaoMeses || {}), [OCULTO]: { status: 'aguardando_interna', mes: OCULTO, por: 'Chris', em: new Date().toISOString() } };
  const { id: _x, ...semId } = cal; await seed.set('calendarios', CLIENTE, semId);
  await amb.aguardarFunctionsOciosas?.();

  const { page, erros, fechar } = await nav.novaPagina(); let t0 = Date.now();
  try {
    page.on('dialog', d => d.accept());
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__modoCal === 'cliente' && typeof openEdit === 'function', null, { timeout: 30000 });
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText), null, { timeout: 30000 });
    // A) leitura: o que o navegador do cliente consegue ler
    const leitura = await page.evaluate(async ({ escondido }) => {
      const fb = window.__fb, out = { caminho: fb.docRef?.path || '' };
      const copia = (await fb.getDocFromServer(fb.docRef)).data() || {};
      out.temEscondido = JSON.stringify(copia).includes(escondido) || JSON.stringify(copia).includes('Texto que o cliente ainda não pode ver');
      out.temDezembro = (copia.items || []).some(i => i && i.mes === '2026-12' && !i.excluido);
      try { await fb.getDocFromServer(fb.doc(fb.db, 'calendarios', window.__clienteId)); out.original = 'lido'; } catch (e) { out.original = String(e.code || e.message); }
      return out;
    }, { escondido: ESCONDIDO });
    const okA = leitura.caminho === 'calendarios_cliente/' + CLIENTE && !leitura.temEscondido && leitura.temDezembro; // o original passa a ser negado no PR das rules (CP200 parte 2)
    await foto(page, 'J55-leitura');
    registrar({ jornada: id, caso: 'cliente lê só a cópia com meses liberados', ok: okA && !erros.filter(erroGrave).length, ms: Date.now() - t0,
      detalhe: `lê ${leitura.caminho || '?'} · rascunho de janeiro ${leitura.temEscondido ? 'VISÍVEL' : 'escondido'} · dezembro ${leitura.temDezembro ? 'visível' : 'AUSENTE'} · original → ${leitura.original}` });

    // B) aprovação pelo link: grava no calendário real pelo servidor e a cópia acompanha
    t0 = Date.now();
    const idx = (await seed.get('calendarios_cliente', CLIENTE)).items.findIndex(i => i && i.name === TITULO1 && !i.excluido); // mesma posição do original
    await page.evaluate(i => openEdit(i), idx);
    await page.waitForSelector('#aprBtn', { state: 'visible', timeout: 15000 });
    await page.click('#aprBtn');
    const aprovado = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE), p = await seed.get('calendarios_cliente', CLIENTE);
      const a = c?.items?.find(i => i?.name === TITULO1), b = p?.items?.find(i => i?.name === TITULO1);
      return a?.apr === true && a.aprPor === 'cliente' && b?.apr === true ? { a, b } : null; });
    const tela = await page.evaluate(() => document.body.innerText.includes('Conteúdo aprovado'));
    await foto(page, 'J55-aprovou');
    registrar({ jornada: id, caso: 'aprovação pelo link grava pelo servidor e a cópia acompanha', ok: !!aprovado && tela && !erros.filter(erroGrave).length, ms: Date.now() - t0,
      detalhe: aprovado ? `calendário apr=true por cliente · cópia apr=true · aviso na tela ${tela ? 'ok' : 'AUSENTE'}` : 'aprovação não chegou ao calendário ou à cópia' });

    // C) a equipe libera janeiro → o gatilho põe o mês na cópia, sem ninguém mexer nela
    t0 = Date.now();
    const atual = await seed.get('calendarios', CLIENTE), { id: _y, ...semId2 } = atual;
    semId2.aprovacaoMeses = { ...semId2.aprovacaoMeses, [OCULTO]: { status: 'liberado', mes: OCULTO, por: 'Amanda', em: new Date().toISOString() } };
    // sem o atalho do seed: quem tem que pôr janeiro na cópia é o gatilho do calendário (como em produção)
    await seed.set('calendarios', CLIENTE, { ...semId2, updatedAt: new Date().toISOString() }, { semCopiaCp200: true });
    const liberou = await esperar(async () => { const p = await seed.get('calendarios_cliente', CLIENTE); return (p?.items || []).some(i => i?.name === ESCONDIDO) ? p : null; }, 40000);
    registrar({ jornada: id, caso: 'mês liberado pela equipe aparece na cópia do cliente pelo gatilho', ok: !!liberou, ms: Date.now() - t0,
      detalhe: liberou ? 'janeiro entrou na cópia depois da liberação' : 'a cópia não recebeu janeiro' });
  } catch (e) { await foto(page, 'J55-falha'); registrar({ jornada: id, caso: 'fluxo', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); }
  finally { await fechar(); }
}
