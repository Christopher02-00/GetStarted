// J113 — CP259 (22/11/2026, varredura de acúmulo). De sexta a domingo o Início do Chris mostra o "Panorama da Semana" e redesenha a cada
// minuto (atualização dos retornos mensais). Cada redesenho baixava do servidor TODOS os resumos diários (116 documentos, ~0,9 MB nos dados
// reais; a coleção não tem ouvinte, então é leitura de fato) para somar só os dias da semana. Esperado: o redesenho pede só os dias da semana
// (consulta com filtro pelo identificador, que é a data) e o panorama soma exatamente os mesmos dias — os resumos antigos não entram.
// O dia da semana de "agora" é fixado em domingo na página (getDay), para a jornada não depender do dia em que roda.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J113';
export const nome = 'Panorama da Semana do Início lê só os dias da semana (não os 116 resumos)';

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
  const t0 = Date.now();
  // semana (domingo fixado: começa 6 dias atrás): hoje (0, já gerado) + 3 resumos com 1+2+4 = 7 concluídas; fora da semana: 2 resumos com 100 cada
  const resumo = n => ({ data: '', numeros: { demandasConcluidas: n, videosEntregues: 0, postagensPublicadas: 0, gravacoesRealizadasOntem: 0, gravacoesPlanejadasOntem: 0 }, quemCobrar: [], emDia: [], criticos: [], reincidencias: [], naoResolvidoOntem: [], clientes: {} });
  for (const [n, v] of [[0, 0], [1, 1], [2, 2], [3, 4], [10, 100], [20, 100]]) await seed.set('resumos_diarios', diaLocal(n), { ...resumo(v), data: diaLocal(n) });
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await page.addInitScript(() => { const g = Date.prototype.getDay; Date.prototype.getDay = function () { return window.__diaJ113 != null && Math.abs(this.getTime() - Date.now()) < 5000 ? window.__diaJ113 : g.call(this); }; window.__diaJ113 = 0; }); // só o "agora" vira domingo; datas calculadas seguem reais
    let contando = false; const alvos = [];
    page.on('request', r => { if (contando && r.method() === 'POST' && /\/Listen\/channel/.test(r.url())) alvos.push(...alvosDoCorpo(r.postData())); });
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(3000);
    await page.evaluate(() => irPara('inicio', document.getElementById('navInicio')));
    await page.waitForFunction(() => /Resumo do Dia/.test(document.getElementById('resumoDiarioBox')?.innerText || ''), null, { timeout: 60000 });
    await page.waitForTimeout(2000);
    // o redesenho periódico (o mesmo do minuto) é disparado pelo foco da janela
    contando = true;
    await page.evaluate(() => { document.getElementById('resumoDiarioBox').insertAdjacentHTML('beforeend', '<i data-j113></i>'); window.dispatchEvent(new Event('focus')); });
    await page.waitForFunction(() => { const b = document.getElementById('resumoDiarioBox'); return b && !b.querySelector('[data-j113]') && /Panorama da Semana/.test(b.innerText || ''); }, null, { timeout: 75000 }).catch(() => {});
    await page.waitForTimeout(2000); contando = false;
    const txt = await page.evaluate(() => (document.getElementById('resumoDiarioBox')?.innerHTML || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    const doResumo = alvos.filter(a => a.colecao === 'resumos_diarios'), inteiras = doResumo.filter(a => !a.filtro).length;
    const soma = (txt.match(/Concluídas:\s*(\d+)\s*demandas/) || [])[1];
    const graves = erros.filter(erroGrave);
    await foto(page, 'J113-panorama');
    registrar({ jornada: id, caso: '1 o redesenho pede só os dias da semana (nenhuma leitura de todos os resumos)', ok: doResumo.length >= 1 && inteiras === 0, ms: Date.now() - t0,
      detalhe: `${doResumo.length} consulta(s) aos resumos · ${inteiras} de todos os resumos` });
    registrar({ jornada: id, caso: '2 o panorama soma os mesmos dias (7 concluídas; os antigos não entram)', ok: soma === '7' && !graves.length, ms: Date.now() - t0,
      detalhe: `panorama: ${soma ?? 'NÃO APARECEU'} concluída(s)${graves.length ? ' · erro: ' + graves[0] : ''}` });
  } catch (e) { await foto(page, 'J113-falha'); registrar({ jornada: id, caso: 'panorama lê só a semana', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
