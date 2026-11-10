// J38 — Avisos da aprovação do cliente saem do servidor (CP191, auditoria do percurso 10/11/2026).
// Usa o calendário da Bluefit da J06 (dezembro, 2 conteúdos; a J20 já aprovou o primeiro pelo link).
//  A) o cliente aprova o segundo pelo link → Chris e Amanda recebem 1 aviso cada (sem repetir) e, como o mês ficou
//     todo aprovado, a Cecília recebe "aprovou o calendário de Dezembro 2026 inteiro" (vira demanda) — decisão de 29/07
//     que estava morta numa função do Portal que nada chamava.
//  B) o cliente remove a aprovação → Chris e Amanda recebem "removeu a aprovação" (antes ninguém era avisado).
import { foto } from '../lib/navegador.mjs';
export const id = 'J38';
export const nome = 'Avisos de aprovação do cliente: um por mudança, mês inteiro avisa a Cecília, remoção avisa a equipe';
const CLIENTE = 'bluefit', MES = '2026-12', TITULO1 = 'Ensaio J06 — Reels de aquecimento', TITULO2 = 'Ensaio J06 — Depoimento de aluno';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

async function clicarAprovar(page, amb, seed) {
  await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText), null, { timeout: 30000 });
  await page.waitForFunction(() => typeof openEdit === 'function', null, { timeout: 20000 });
  const idx = (await seed.get('calendarios', CLIENTE)).items.findIndex(i => i && i.name === TITULO2 && !i.excluido);
  await page.evaluate(i => openEdit(i), idx);
  await page.waitForSelector('#aprBtn', { state: 'visible', timeout: 15000 });
  await page.click('#aprBtn');
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const passo = async (caso, fn) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try { page.on('dialog', d => d.accept()); const r = await fn(page); const graves = erros.filter(erroGrave); await foto(page, 'J38-' + caso.replace(/\W+/g, '_'));
      registrar({ jornada: id, caso, ok: r.ok && !graves.length, ms: Date.now() - t0, detalhe: r.detalhe + (graves.length ? ' | ' + graves[0] : '') }); return r.ok; }
    catch (e) { await foto(page, 'J38-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); return false; }
    finally { await fechar(); }
  };
  // preparação: o 1º conteúdo aprovado pelo cliente (J20) e o 2º limpo, sem aprovação nem agendamento
  const cal = await seed.get('calendarios', CLIENTE);
  const i1 = (cal?.items || []).findIndex(i => i?.name === TITULO1 && !i.excluido), i2 = (cal?.items || []).findIndex(i => i?.name === TITULO2 && !i.excluido);
  if (i1 < 0 || i2 < 0) { registrar({ jornada: id, caso: 'preparação', ok: false, ms: 0, detalhe: 'depende da J06' }); return; }
  const agora = new Date().toISOString();
  cal.items[i1] = { ...cal.items[i1], apr: true, aprPor: 'cliente', aprEm: cal.items[i1].aprEm || agora };
  const { postagemId: _p, agendado: _a, dataPostagem: _d, ...limpo } = cal.items[i2];
  cal.items[i2] = { ...limpo, apr: false, aprPor: '', aprEm: '' };
  const { id: _x, ...semId } = cal; await seed.set('calendarios', CLIENTE, semId);
  await amb.aguardarFunctionsOciosas?.();
  const avisos = async re => (await seed.listar('avisos_do_cliente')).filter(a => a.cliente === CLIENTE && re.test(String(a.titulo || '')));

  await passo('A Cliente aprova o último conteúdo do mês', async page => {
    await clicarAprovar(page, amb, seed);
    const mes = await esperar(async () => { const l = await avisos(/aprovou o calendário de Dezembro 2026 inteiro/); return l.some(a => a.paraQuem === 'Cecília') ? l : null; });
    await new Promise(r => setTimeout(r, 3000)); // dá tempo de um aviso repetido aparecer
    const item = (await avisos(/aprovou: Ensaio J06 — Depoimento/));
    const porPessoa = ['Chris', 'Amanda'].map(q => item.filter(a => a.paraQuem === q).length);
    const ceci = (mes || []).find(a => a.paraQuem === 'Cecília');
    const ok = porPessoa.every(n => n === 1) && !!ceci && ceci.viraDemanda === true;
    return { ok, detalhe: `aviso do conteúdo: Chris ${porPessoa[0]} · Amanda ${porPessoa[1]} (esperado 1 cada) · Cecília: ${ceci ? 'mês inteiro aprovado (vira demanda)' : 'sem aviso do mês'}` };
  });

  await passo('B Cliente remove a aprovação', async page => {
    await clicarAprovar(page, amb, seed); // o mesmo botão alterna
    const rem = await esperar(async () => { const l = await avisos(/removeu a aprovação: Ensaio J06 — Depoimento/); return l.length >= 2 ? l : null; });
    const quem = (rem || []).map(a => a.paraQuem).sort().join(', ');
    return { ok: quem === 'Amanda, Chris', detalhe: `aviso de remoção para: ${quem || 'ninguém'}` };
  });
}
