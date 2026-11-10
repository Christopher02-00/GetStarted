// J44 — Portal do pagador mostra a divisão da cobrança agrupada (CP195, pedido do Chris 10/11/2026).
// Zeiss paga R$ 4.500 por um grupo com 2 empresas de R$ 750: no Portal, a mensalidade mostra "Como se divide este valor"
// com Zeiss R$ 3.000, Hitech R$ 750 e Mochi R$ 750 — a mesma conta do escritório (valor − soma das partes).
import { foto } from '../lib/navegador.mjs';
export const id = 'J44';
export const nome = 'Portal da Zeiss mostra quanto da mensalidade é de cada empresa do grupo';
const MES = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7);
const PAG = 'zeiss_' + MES;

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString();
  const retrato = { pagamentoId: PAG, cliente: 'zeiss', competencia: MES, valor: 4500, diaVencimento: 10, vencimento: MES + '-10' };
  await seed.set('pagamentos_mensais', PAG, { cliente: 'zeiss', clienteNome: 'Zeiss', competencia: MES, valorDevido: 4500, diaVencimento: 10, status: 'aberto', pagoEm: '', comprovante: '', excluido: false,
    cobrancaPortalI38: { versao: 1, estado: 'liberada', por: 'Chris', revisao: 1, operacao: 'ensaio_j44_op', em: agora, inicioOperacao: MES, quitadasAte: '2026-01', retrato } });
  await seed.set('config_financeiro', 'cobranca_agrupada', { grupos: [{ id: 'grupo_zeiss', nome: 'Empresas do Otávio', pagador: 'zeiss', desde: MES, ativo: true,
    membros: [{ slug: 'hitech', parte: 750 }, { slug: 'mochi', parte: 750 }] }], versaoAnterior: [], revisao: 9, atualizadoPor: 'Chris', atualizadoEm: agora });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    await page.goto(amb.url('portal-cliente.html', '&c=zeiss&t=tok-zeiss'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-tab="pagamento"]', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { const a = document.querySelector('[data-tab="pagamento"]'); setTab('pagamento', a); });
    await page.waitForSelector(`[data-composicao-cp195="${PAG}"] .composicaoCp195`, { timeout: 25000 });
    const txt = await page.evaluate(p => document.querySelector(`[data-composicao-cp195="${p}"] .composicaoCp195`)?.innerText || '', PAG);
    const limpo = txt.replace(/\s+/g, ' ');
    const ok = /Zeiss R\$ 3\.000,00/.test(limpo) && /Hitech R\$ 750,00/.test(limpo) && /Mochi R\$ 750,00/.test(limpo);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J44-portal-divisao');
    registrar({ jornada: id, caso: 'Zeiss vê a divisão da mensalidade', ok: ok && !graves.length, ms: Date.now() - t0, detalhe: limpo.slice(0, 200) + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J44-falha'); registrar({ jornada: id, caso: 'Zeiss vê a divisão da mensalidade', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 260) }); }
  finally { await fechar(); }
}
