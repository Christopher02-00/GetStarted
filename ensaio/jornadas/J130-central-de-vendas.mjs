// J130 — LZ6 (26/11/2026, Limpeza 2027; Chris: "Central de vendas vamos deixar, o que podemos fazer e melhorar, simplificar, aprimorar e
// tirar os erros dela"). Caso real (export 25/11): 2 pedidos de plano mensal (30/09 e 12/10) e 1 de pessoa física (19/11) parados sem
// negociação, e um erro que derrubaria a Central no primeiro pedido trabalhado: salvar a proposta trocava a origem do pedido para "manual"
// e a sincronização seguinte recusava o registro ("Central de Vendas indisponível"). Esperado (contraprova vermelha no código anterior):
//  1. o pedido do site vira negociação com a data em que CHEGOU, o cartão mostra os dados do pedido e o menu conta 1 pedido novo;
//  2. o mês do pedido conta o pedido (outubro), não o dia em que a Central o leu;
//  3. salvar a proposta desse pedido mantém a origem (mensal) e a Central continua abrindo;
//  4. arquivar a negociação arquiva também o pedido de origem (sai da Entrada da Amanda e dos contadores);
//  5. a Gerência não tem mais Funil, Projetos Avulsos nem as abas de Leads (vendas num lugar só).
import { entrarComo, foto } from '../lib/navegador.mjs';
import { adminDb } from '../lib/chegada.mjs';
export const id = 'J130';
export const nome = 'Central de Vendas: pedido do site vira negociação pela data de chegada, proposta não derruba a tela, arquivar fecha o pedido';
const LEAD = 'j130lead', NEG = 'lead_mensal_' + LEAD;

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const db = adminDb(amb);
  await seed.set('leads_mensalista', LEAD, { nome: 'Prospect J130', whatsapp: '(41) 99999-0130', whatsappNormalizado: '5541999990130', status: 'novo',
    origemLead: 'mensal', protocolo: LEAD, canalOrigem: 'instagram', segmento: 'Clínica', frequencia: 'semanal', observacoes: 'Quer 8 vídeos por mês (J130)',
    criadoEm: new Date('2026-10-12T15:00:00.000Z') });
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(3000);
    const abrir = async () => { await page.evaluate(() => { window.__pessoaLiberada = 'Chris'; irPara('centralVendas', document.getElementById('navCentralVendas')); });
      await page.waitForFunction(() => /Oportunidades|indisponível/.test(document.getElementById('view-centralVendas')?.innerText || ''), null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(1500); };
    await abrir();
    const neg1 = (await db.doc('negocios/' + NEG).get()).data() || {};
    const tela1 = await page.evaluate(() => ({ txt: document.getElementById('view-centralVendas')?.innerText || '', badge: document.getElementById('badgeCentralVendas')?.textContent || '' }));
    fim('1 pedido do site vira negociação com a data de chegada; o cartão mostra o pedido; o menu conta 1 novo',
      neg1.estagio === 'recebido' && String(neg1.leadCriadoEmISO || '').startsWith('2026-10-12') && /Pedido pelo site · protocolo j130lead/.test(tela1.txt) && tela1.badge === '1',
      `estágio ${neg1.estagio || 'SEM NEGÓCIO'} · chegou ${neg1.leadCriadoEmISO || '—'} · cartão ${/Pedido pelo site/.test(tela1.txt) ? 'com o pedido' : 'SEM o pedido'} · menu "${tela1.badge}"`);
    await page.evaluate(() => { const m = document.getElementById('vendasMes'); m.value = '2026-10'; m.dispatchEvent(new Event('change')); });
    await page.waitForTimeout(1500);
    const leadsOutubro = await page.evaluate(() => { const c = [...document.querySelectorAll('#centralVendasResumo .resumoCard')].find(x => /Leads no mês/i.test(x.textContent)); return c?.querySelector('.num')?.textContent || ''; });
    fim('2 outubro (mês em que o pedido chegou) conta o pedido', leadsOutubro === '1', `leads em outubro: ${leadsOutubro || '—'}`);
    await page.evaluate(id => editarPropostaNegocio(id), NEG); await page.waitForTimeout(2000);
    await page.evaluate(() => { const v = (id, x) => { const e = document.getElementById(id); if (e) { e.value = x; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')); } };
      v('vendaNumero', 'J130'); v('vendaVersao', '1'); v('vendaPlano', 'Plano mensal (J130)'); v('vendaValor', 'R$ 1.500,00'); v('vendaEmitidaEm', '2026-11-26'); });
    await page.evaluate(() => salvarPropostaVenda()); await page.waitForTimeout(4000);
    await abrir();
    const neg3 = (await db.doc('negocios/' + NEG).get()).data() || {};
    const txt3 = await page.evaluate(() => document.getElementById('view-centralVendas')?.innerText || '');
    fim('3 salvar a proposta mantém a origem do pedido e a Central continua abrindo', neg3.origemLead === 'mensal' && neg3.leadId === LEAD && !/Central de Vendas indisponível/.test(txt3) && /Prospect J130/.test(txt3),
      `origem ${neg3.origemLead} · proposta ${neg3.propostaPlano || '—'} · tela ${/indisponível/.test(txt3) ? 'INDISPONÍVEL' : 'aberta'}`);
    await foto(page, 'J130-central-vendas');
    await page.evaluate(id => arquivarNegocioVenda(id), NEG); await page.waitForTimeout(3500);
    const neg4 = (await db.doc('negocios/' + NEG).get()).data() || {}, lead4 = (await db.doc('leads_mensalista/' + LEAD).get()).data() || {};
    fim('4 arquivar a negociação arquiva também o pedido de origem', neg4.arquivado === true && lead4.status === 'arquivado' && lead4.statusGerencia === 'arquivado',
      `negócio arquivado ${neg4.arquivado === true} · pedido ${lead4.status}/${lead4.statusGerencia || '—'}`);
    const abas = await page.evaluate(() => ['funilNegocios', 'avulsos', 'leadsAvulsos', 'leadsPessoal', 'leadsMensal'].filter(s => document.querySelector('[data-sub="' + s + '"]') || document.getElementById('gerencia' + s.charAt(0).toUpperCase() + s.slice(1))));
    const graves = erros.filter(erroGrave);
    fim('5 a Gerência não tem Funil, Projetos Avulsos nem abas de Leads; sem erro grave', !abas.length && !graves.length, `abas que restam: ${abas.join(', ') || 'nenhuma'}${graves.length ? ' · erro: ' + graves[0] : ''}`);
  } catch (e) { await foto(page, 'J130-falha'); fim('Central de Vendas', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { await fechar(); }
}
