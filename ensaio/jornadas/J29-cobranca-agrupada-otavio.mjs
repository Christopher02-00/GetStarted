// J29 — Cobrança agrupada (empresas do Otávio, 09/11/2026): 1 cobrança no pagador (Zeiss, R$ 4.500) e as
// empresas cobertas mostram a sua parte, sem cobrança própria. O Chris monta o grupo em Mensalidades; a conta
// fecha (4.500 − 800 − 700 = 3.000 da Zeiss) e a Régua só mostra a Zeiss. Contraprova: no main não há editor.
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J29';
export const nome = 'Cobrança agrupada: grupo salvo → empresas cobertas com a parte → Régua só cobra o pagador';

const hoje = new Date();
const MES = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7); // fuso do site
const contrato = (nome, valor) => ({ clienteNome: nome, plano: 'Intermediário', valorCheio: valor, valorVigente: valor, diaVencimento: 10, status: 'ativo', ativo: true, excluido: false, primeiraCompetencia: '2026-07', cortesiaMeses: [] });

async function abrir(page, navId, boxId, texto) {
  await abrirMenuSeMovel(page);
  await page.evaluate(n => document.getElementById(n)?.click(), navId);
  await page.waitForFunction(([b, t]) => (document.getElementById(b)?.innerText || '').includes(t), [boxId, texto], { timeout: 30000 });
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('contratos_cliente', 'zeiss', contrato('Zeiss', 4500));
  await seed.set('contratos_cliente', 'j29-otica', contrato('J29 Ótica Hauer', 800));
  await seed.set('contratos_cliente', 'j29-clinica', contrato('J29 Clínica São José', 1));
  const { page, erros, fechar } = await nav.novaPagina();
  const t0 = Date.now();
  const caso = (c, ok, detalhe) => registrar({ jornada: id, caso: c, ok, ms: Date.now() - t0, detalhe });
  try {
    page.on('dialog', d => d.type() === 'prompt' ? d.accept('ensaio-senha-pessoal-123') : d.accept());
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
    await abrir(page, 'navMensalidades', 'mensalidadesBox', 'Dia 10');
    const temEditor = await page.locator('#cagPagador').count();
    caso('editor do grupo em Mensalidades', temEditor === 1, `#cagPagador: ${temEditor}`);
    if (!temEditor) { await foto(page, 'J29-sem-editor'); return; }
    await page.evaluate(() => document.querySelector('[data-cobranca-agrupada] details')?.setAttribute('open', ''));
    await page.fill('#cagPagador', 'zeiss'); await page.fill('#cagDesde', MES);
    await page.fill('#cagMembros', 'j29-otica = 800\nj29-clinica = 700');
    await page.evaluate(() => window.salvarCobrancaAgrupadaV104());
    await page.waitForSelector('[data-grupo-cobranca][data-grupo-fecha="true"]', { timeout: 30000 });
    const doc = await seed.get('config_financeiro', 'cobranca_agrupada');
    const gravou = doc?.revisao === 1 && doc?.grupos?.[0]?.pagador === 'zeiss' && doc.grupos[0].membros?.length === 2;
    caso('grupo gravado em config_financeiro', gravou, JSON.stringify(doc?.grupos?.[0] || null).slice(0, 160));
    const texto = await page.locator('#mensalidadesBox').innerText();
    const cobertas = (texto.match(/Coberta pelo grupo/gi) || []).length;
    caso('conta fecha: Zeiss fica com R$ 3.000', /Conta fechada/i.test(texto) && /3\.000,00/.test(texto), texto.match(/Zeiss \(restante\)[^\n]*/)?.[0] || 'sem restante');
    caso('2 empresas cobertas, sem botão de cobrança', cobertas === 2, `cobertas: ${cobertas}`);
    await foto(page, 'J29-mensalidades');
    await abrir(page, 'navCobranca', 'cobrancaBox', 'Zeiss');
    const regua = await page.locator('#cobrancaBox').innerText();
    caso('Régua cobra só o pagador', /Zeiss/.test(regua) && !/J29 Ótica Hauer|J29 Clínica São José/.test(regua), regua.replace(/\s+/g, ' ').slice(0, 160));
    await foto(page, 'J29-regua');
    const graves = erros.filter(erroGrave);
    caso('sem erro grave', !graves.length, graves[0] || 'ok');
  } catch (e) { await foto(page, 'J29-falha'); caso('execução', false, String(e).slice(0, 200)); }
  finally { await fechar(); }
}
