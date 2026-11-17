// J73 — "Recebi" de mensalidade antiga com a data REAL do pagamento (CP218, caso Cookiery, Chris 16/11/2026).
// A Cookiery pagou a competência de 7 meses atrás no dia 10 daquele mês, mas a mensalidade ficou "aberto".
// Antes: "✔ Recebi" gravava pagoEm = hoje → o dinheiro entrava no caixa do mês atual (errado).
// Esperado: o Chris informa a data real → pagoEm = essa data, competência original intacta, o caixa do mês do
// pagamento sobe R$ 1.700 e o caixa do mês atual não muda. Data no futuro é recusada sem gravar.
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J73';
export const nome = 'Mensalidade antiga marcada como paga na data real: caixa no mês do pagamento, competência original';
const SLUG = 'j73-cookiery', NOME = 'J73 Cookiery';
const fmt = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const HOJE = fmt(new Date()), MES = HOJE.slice(0, 7);
const mesesAtras = n => { const [a, m] = MES.split('-').map(Number); const t = a * 12 + (m - 1) - n; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}`; };
const COMP = mesesAtras(7), PAGO = `${COMP}-10`, ID = `${SLUG}_${COMP}`;
const amanha = fmt(new Date(Date.now() + 86400000));
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

async function abrir(page, navId, boxId, texto) {
  await abrirMenuSeMovel(page);
  await page.evaluate(n => document.getElementById(n)?.click(), navId);
  await page.waitForFunction(([b, t]) => (document.getElementById(b)?.innerText || '').includes(t), [boxId, texto], { timeout: 30000 });
}
// "Caixa real de <mês>: R$ X entradas − ..." do Financeiro, para a competência pedida.
async function entradasCaixa(page, mes) {
  await page.evaluate(m => { const el = document.getElementById('finMes'); if (el) el.value = m; }, mes);
  await page.evaluate(() => window.renderFinanceiro());
  await page.waitForFunction(() => /Caixa real de/.test(document.getElementById('financeiroBox')?.innerText || ''), null, { timeout: 30000 });
  const t = await page.locator('#financeiroBox').innerText();
  const m = t.match(/Caixa real de[^\n]*?R\$\s?([\d.]+,\d{2}) entradas/) || t.match(/R\$\s?([\d.]+,\d{2}) entradas/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN;
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('contratos_cliente', SLUG, { clienteNome: NOME, plano: 'Mensalista', valorCheio: 1700, valorVigente: 1700, diaVencimento: 10, status: 'ativo', ativo: true, excluido: false, primeiraCompetencia: COMP, cortesiaMeses: [] });
  await seed.set('pagamentos_mensais', ID, { cliente: SLUG, clienteNome: NOME, competencia: COMP, valorDevido: 1700, diaVencimento: 10, status: 'aberto', pagoEm: '', comprovante: '', excluido: false });
  const { page, erros, fechar } = await nav.novaPagina();
  const t0 = Date.now();
  const caso = (c, ok, detalhe) => registrar({ jornada: id, caso: c, ok, ms: Date.now() - t0, detalhe });
  try {
    page.on('dialog', d => d.type() === 'prompt' ? d.accept('ensaio-senha-pessoal-123') : d.accept());
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
    await abrir(page, 'navFinanceiro', 'financeiroBox', 'Caixa real de');
    const antesPago = await entradasCaixa(page, COMP), antesHoje = await entradasCaixa(page, MES);
    await abrir(page, 'navMensalidades', 'mensalidadesBox', 'Fórmula única');
    await page.evaluate(m => { const el = document.getElementById('mensMes'); if (el) el.value = m; }, COMP);
    await page.evaluate(() => window.renderMensalidades());
    const campo = page.locator(`[id="mensPagoEm_${ID}"]`);
    const botao = page.locator(`#mensalidadesBox button[onclick*="marcarMensalidadeV103('${ID}','pago')"]`).first();
    await botao.waitFor({ timeout: 20000 });
    let futuroRecusado = null;
    if (await campo.count()) {
      // data no futuro: recusada, nada gravado
      await campo.fill(amanha); await botao.click(); await page.waitForTimeout(1500);
      futuroRecusado = (await seed.get('pagamentos_mensais', ID))?.status === 'aberto';
      await campo.fill(PAGO);
    }
    await botao.click();
    const p = await esperar(async () => { const x = await seed.get('pagamentos_mensais', ID); return x?.status === 'pago' ? x : null; });
    await foto(page, 'J73-mensalidades');
    caso('Recebi grava a data real e mantém a competência', !!p && p.pagoEm === PAGO && p.competencia === COMP && p.valorDevido === 1700,
      p ? `pagoEm ${p.pagoEm} (esperado ${PAGO}) · competência ${p.competencia}` : 'não marcou como pago');
    caso('Data no futuro é recusada sem gravar', futuroRecusado === true, futuroRecusado === null ? 'sem campo de data real' : (futuroRecusado ? 'recusada' : 'gravou com data futura'));
    await abrir(page, 'navFinanceiro', 'financeiroBox', 'Caixa real de');
    const depoisPago = await entradasCaixa(page, COMP), depoisHoje = await entradasCaixa(page, MES);
    await foto(page, 'J73-financeiro');
    caso('Caixa: entra no mês do pagamento, não no mês atual', depoisPago - antesPago === 1700 && depoisHoje === antesHoje,
      `caixa ${COMP}: ${antesPago} → ${depoisPago} · caixa ${MES}: ${antesHoje} → ${depoisHoje}`);
    const graves = erros.filter(erroGrave);
    caso('sem erro grave', !graves.length, graves[0] || 'ok');
  } catch (e) { await foto(page, 'J73-falha'); caso('execução', false, String(e).slice(0, 220)); }
  finally { await fechar(); }
}
