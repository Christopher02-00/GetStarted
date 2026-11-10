// J46 — (cópia da J29) com uma empresa do grupo que SAIU (contrato encerrado). Antes: a parte dela continuava descontada
// do pagador, sem aviso. Agora (auditoria 10/11/2026, decisão do Chris): fica fora da conta e aparece o aviso para revisar.
// Base J29: 1 cobrança no pagador (Zeiss, R$ 4.500) e as
// empresas cobertas mostram a sua parte, sem cobrança própria. O Chris monta o grupo em Mensalidades; a conta
// fecha (4.500 − 800 − 700 = 3.000 da Zeiss) e a Régua só mostra a Zeiss. Contraprova: no main não há editor.
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J46';
export const nome = 'Cobrança agrupada com empresa que saiu: a parte dela fica fora da conta e o escritório avisa';

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
  await seed.set('contratos_cliente', 'j29-clinica', { ...contrato('J29 Clínica São José', 1), status: 'encerrado', ativo: false, ultimaCompetenciaPagamento: '2026-08', dataSaida: '2026-08-31' });
  // empresa nova entra com o 1º mês em cortesia (cadastro da Central): o documento isento também mostra a parte do grupo
  await seed.set('pagamentos_mensais', `j29-otica_${MES}`, { cliente: 'j29-otica', clienteNome: 'J29 Ótica Hauer', competencia: MES, valorDevido: 800, diaVencimento: 10, status: 'isento', cortesiaDoMes: true, motivoIsencao: 'cortesia combinada para este mês', pagoEm: '', comprovante: '', excluido: false });
  // o grupo já existia (como a J29 grava) e depois a J29 Clínica São José saiu
  await seed.set('config_financeiro', 'cobranca_agrupada', { grupos: [{ id: 'grupo_zeiss', nome: 'Empresas do Otávio', pagador: 'zeiss', desde: MES, ativo: true, membros: [{ slug: 'j29-otica', parte: 800 }, { slug: 'j29-clinica', parte: 700 }] }], versaoAnterior: [], revisao: 5, atualizadoPor: 'Chris' });
  const { page, erros, fechar } = await nav.novaPagina();
  const t0 = Date.now();
  const caso = (c, ok, detalhe) => registrar({ jornada: id, caso: c, ok, ms: Date.now() - t0, detalhe });
  try {
    page.on('dialog', d => d.type() === 'prompt' ? d.accept('ensaio-senha-pessoal-123') : d.accept());
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
    await abrir(page, 'navMensalidades', 'mensalidadesBox', 'Dia 10');
    const texto = await page.locator('#mensalidadesBox').innerText();
    const cobertas = (texto.match(/Coberta pelo grupo/gi) || []).length;
    caso('empresa que saiu fica fora: Zeiss fica com R$ 3.700', /3\.700,00/.test(texto) && !/3\.000,00/.test(texto), texto.match(/Zeiss \(restante\)[^\n]*/)?.[0] || 'sem restante');
    caso('aviso para revisar o grupo', /não tem contrato ativo neste mês/.test(texto), (texto.match(/[^\n]*contrato ativo[^\n]*/) || ['sem aviso'])[0].slice(0, 160));
    await foto(page, 'J46-mensalidades');
    const graves = erros.filter(erroGrave);
    caso('sem erro grave', !graves.length, graves[0] || 'ok');
  } catch (e) { await foto(page, 'J46-falha'); caso('execução', false, String(e).slice(0, 200)); }
  finally { await fechar(); }
}
