// J113 — CP259 (22/11) + LZ4 (26/11/2026, Limpeza 2027, catálogo decidido pelo Chris). A CP259 provava que o "Panorama da Semana" do
// Início do Chris lia só os dias da semana. Na LZ4 o Chris decidiu enxugar o Início: o Resumo do Dia fica só com o que pede ação
// (Crítico agora, Quem cobrar hoje, Suas pendências, Clientes) e saem o Panorama da Semana, os números congelados, "Quem mandou bem",
// reincidências e "já estava ontem"; o calendário de gravações do fim da tela, os atalhos de setor e o painel "Somente edição" saem do
// Início. O dia de "agora" é fixado em domingo (antes, o dia do panorama).
// Esperado (contraprova vermelha no código anterior: o panorama, o calendário e os atalhos aparecem):
//  1. no domingo, o redesenho do Início do Chris não faz NENHUMA consulta aos resumos diários (só o de hoje, por id);
//  2. o Resumo do Dia tem as 4 seções de ação e nenhuma das que saíram;
//  3. o Início não tem calendário de gravações, atalhos de setor nem o painel "Somente edição".
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J113';
export const nome = 'Início enxuto (LZ4): Resumo do Dia só com o que pede ação, sem panorama/calendário/atalhos, sem ler resumos antigos';

function alvosDoCorpo(corpo) {
  const out = [];
  for (const par of String(corpo || '').split('&')) {
    const i = par.indexOf('___data__='); if (i < 0) continue;
    let j; try { j = JSON.parse(decodeURIComponent(par.slice(i + 10).replace(/\+/g, ' '))); } catch { continue; }
    const sq = j?.addTarget?.query?.structuredQuery; if (sq) out.push({ colecao: sq.from?.[0]?.collectionId || '', filtro: !!sq.where });
  }
  return out;
}
const diaLocal = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const resumo = n => ({ data: '', numeros: { demandasConcluidas: n, videosEntregues: 0, postagensPublicadas: 0, gravacoesRealizadasOntem: 0, gravacoesPlanejadasOntem: 0, gravacoesHoje: 3 },
    quemCobrar: [{ pessoa: 'Helo', motivo: 'Legenda parada (J113)', dias: 2 }], emDia: [{ pessoa: 'Yas', producao: 2 }], criticos: [{ texto: 'Crítico de teste (J113)' }],
    reincidencias: [{ texto: 'Reincidência de teste (J113)', dias: 3 }], naoResolvidoOntem: ['Pendência de ontem (J113)'], clientes: { entradas: [], ajustes: [], pedidosPendentes: 0 } });
  for (const [n, v] of [[0, 0], [1, 1], [2, 2], [3, 4], [10, 100], [20, 100]]) await seed.set('resumos_diarios', diaLocal(n), { ...resumo(v), data: diaLocal(n) });
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await page.addInitScript(() => { const g = Date.prototype.getDay; Date.prototype.getDay = function () { return window.__diaJ113 != null && Math.abs(this.getTime() - Date.now()) < 5000 ? window.__diaJ113 : g.call(this); }; window.__diaJ113 = 0; });
    let contando = false; const alvos = [];
    page.on('request', r => { if (contando && r.method() === 'POST' && /\/Listen\/channel/.test(r.url())) alvos.push(...alvosDoCorpo(r.postData())); });
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(3000);
    await page.evaluate(() => irPara('inicio', document.getElementById('navInicio')));
    await page.waitForFunction(() => /Resumo do Dia/.test(document.getElementById('resumoDiarioBox')?.innerText || ''), null, { timeout: 60000 });
    await page.waitForTimeout(2000);
    contando = true;
    await page.evaluate(() => { document.getElementById('resumoDiarioBox').insertAdjacentHTML('beforeend', '<i data-j113></i>'); window.dispatchEvent(new Event('focus')); });
    await page.waitForFunction(() => { const b = document.getElementById('resumoDiarioBox'); return b && !b.querySelector('[data-j113]') && /Resumo do Dia/.test(b.innerText || ''); }, null, { timeout: 75000 }).catch(() => {});
    await page.waitForTimeout(2500); contando = false;
    const doResumo = alvos.filter(a => a.colecao === 'resumos_diarios');
    fim('1 no domingo o redesenho não consulta os resumos antigos (nenhuma consulta à coleção)', doResumo.length === 0, `${doResumo.length} consulta(s) aos resumos diários`);
    const txt = await page.evaluate(() => (document.getElementById('resumoDiarioBox')?.innerText || '').replace(/\s+/g, ' '));
    const ficam = ['Crítico agora', 'Quem cobrar hoje', 'Suas pendências', 'Clientes'].filter(t => !txt.includes(t));
    const sairam = ['Panorama da Semana', 'Quem mandou bem', 'Números', 'Reincidências', 'Já estava no resumo de ontem'].filter(t => txt.includes(t));
    fim('2 Resumo do Dia só com as 4 seções de ação', !ficam.length && !sairam.length, `faltando: ${ficam.join(', ') || 'nada'} · ainda aparecem: ${sairam.join(', ') || 'nada'}`);
    const inicio = await page.evaluate(() => ({ cal: !!document.getElementById('calendarioVisualHomeBox'), atalhos: !!document.getElementById('setorAtalhos'),
      somenteEdicao: !!document.getElementById('edicaoManualInicioI34'), texto: (document.getElementById('view-inicio')?.innerText || '') }));
    fim('3 Início sem calendário de gravações, sem atalhos de setor e sem o painel Somente edição', !inicio.cal && !inicio.atalhos && !inicio.somenteEdicao && !/Calendário de Gravações|Direção Geral/.test(inicio.texto),
      `calendário ${inicio.cal ? 'PRESENTE' : 'fora'} · atalhos ${inicio.atalhos ? 'PRESENTES' : 'fora'} · somente edição ${inicio.somenteEdicao ? 'PRESENTE' : 'fora'}`);
    await foto(page, 'J113-inicio-chris');
    const graves = erros.filter(erroGrave);
    fim('4 sem erro grave no Início do Chris', !graves.length, graves.length ? graves[0] : 'nenhum');
  } catch (e) { await foto(page, 'J113-falha'); fim('Início enxuto', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { await fechar(); }
}
