// J35 — Legenda corrigida no calendário chega à postagem (CP190, decisão do Chris de 10/11).
// Usa o calendário da Bluefit que a J06 cria e libera (dezembro). Liga os 2 conteúdos a 2 postagens manuais:
//  A) "aguardando agendamento" — o CLIENTE corrige a legenda pelo link (✍️ Editar roteiro ou legenda) →
//     a postagem recebe o texto novo sozinha e o Chris recebe a demanda "Cliente alterou o texto".
//  C) postagem corrigida direto: o calendário mudar depois não sobrescreve; o Chris recebe "Duas legendas diferentes".
//  B) "agendado" — a equipe corrige a legenda no calendário → a postagem NÃO muda (já está na rede) e a Cecília
//     recebe a demanda "Legenda mudou depois de agendada" com o texto novo, e a vê em Minhas Demandas.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J35';
export const nome = 'Legenda corrigida no calendário chega à postagem (ou vira demanda)';
const CLIENTE = 'bluefit', MES = '2026-12';
const TITULO1 = 'Ensaio J06 — Reels de aquecimento', TITULO2 = 'Ensaio J06 — Depoimento de aluno';
const VELHA_A = 'Legenda antiga J35 A — aquecimento em 3 passos', NOVA_A = 'Legenda nova J35 A — o cliente reescreveu o aquecimento';
const VELHA_B = 'Legenda antiga J35 B — depoimento do aluno', NOVA_B = 'Legenda nova J35 B — corrigida pela equipe depois de agendar';
const PA = 'j35_post_a', PB = 'j35_post_b';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const amanha = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const passo = async (caso, fn) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try { page.on('dialog', d => d.accept()); const r = await fn(page); const graves = erros.filter(erroGrave); await foto(page, 'J35-' + caso.replace(/\W+/g, '_'));
      registrar({ jornada: id, caso, ok: r.ok && !graves.length, ms: Date.now() - t0, detalhe: r.detalhe + (graves.length ? ' | ' + graves[0] : '') }); return r.ok; }
    catch (e) { await foto(page, 'J35-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); return false; }
    finally { await fechar(); }
  };
  // preparação: 2 postagens manuais ligadas aos 2 conteúdos de dezembro
  const cal = await seed.get('calendarios', CLIENTE);
  const i1 = (cal?.items || []).findIndex(i => i?.name === TITULO1 && !i.excluido), i2 = (cal?.items || []).findIndex(i => i?.name === TITULO2 && !i.excluido);
  if (i1 < 0 || i2 < 0) { registrar({ jornada: id, caso: 'preparação', ok: false, ms: 0, detalhe: 'depende da J06: conteúdos de dezembro da Bluefit ausentes' }); return; }
  const base = { cliente: CLIENTE, clienteNome: 'Bluefit', origemManual: true, excluido: false, criadoEm: new Date().toISOString() };
  await seed.set('postagens', PA, { ...base, titulo: TITULO1, legenda: VELHA_A, status: 'aguardando_agendamento' });
  await seed.set('postagens', PB, { ...base, titulo: TITULO2, legenda: VELHA_B, status: 'agendado', dataAgendada: amanha(), horaAgendada: '18:00' });
  cal.items[i1] = { ...cal.items[i1], legenda: VELHA_A, postagemId: PA };
  cal.items[i2] = { ...cal.items[i2], legenda: VELHA_B, postagemId: PB, agendado: true, dataPostagem: amanha() };
  const { id: _x, ...semId } = cal; await seed.set('calendarios', CLIENTE, semId);
  await amb.aguardarFunctionsOciosas?.();

  // A) cliente corrige a legenda pelo link
  await passo('A Cliente corrige a legenda pelo link', async page => {
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText), null, { timeout: 30000 });
    await page.waitForFunction(() => typeof openEdit === 'function', null, { timeout: 20000 });
    const idx = (await seed.get('calendarios', CLIENTE)).items.findIndex(i => i && i.name === TITULO1 && !i.excluido); // como a J20
    await page.evaluate(i => openEdit(i), idx);
    await page.getByRole('button', { name: /Editar roteiro ou legenda/ }).click({ timeout: 15000 });
    await page.fill('#legendaClienteI68', NOVA_A);
    await page.click('#salvarTextosClienteI68');
    const salvo = await esperar(async () => (await seed.get('calendarios', CLIENTE)).items.some(i => i?.postagemId === PA && i.legenda === NOVA_A));
    if (!salvo) return { ok: false, detalhe: 'o texto do cliente não foi salvo no calendário' };
    const post = await esperar(async () => { const p = await seed.get('postagens', PA); return p?.legenda === NOVA_A ? p : null; });
    const dem = await esperar(async () => (await seed.listar('demandas')).find(d => /^cp190_cliente_/.test(d.id) && d.destinatario === 'Chris' && d.descricao.includes(NOVA_A)));
    return { ok: !!post && !!dem, detalhe: `postagem A: ${post ? 'recebeu a legenda nova' : 'continua com a antiga'} · Chris: ${dem ? 'demanda "' + dem.titulo + '"' : 'sem demanda'}` };
  });

  // B) equipe corrige a legenda no calendário depois de agendada
  await passo('B Equipe corrige legenda já agendada', async page => {
    const c = await seed.get('calendarios', CLIENTE);
    const k = c.items.findIndex(i => i?.postagemId === PB); c.items[k] = { ...c.items[k], legenda: NOVA_B };
    const { id: _y, ...sem } = c; await seed.set('calendarios', CLIENTE, sem);
    const dem = await esperar(async () => (await seed.listar('demandas')).find(d => /^cp190_agendada_/.test(d.id) && d.destinatario === 'Cecília' && d.descricao.includes(NOVA_B)));
    const post = await seed.get('postagens', PB);
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
    let naTela = false;
    if (dem) { await page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas')));
      naTela = await page.waitForFunction(t => document.getElementById('view-minhasDemandasAtribuidas')?.innerHTML.includes(t), dem.titulo, { timeout: 15000 }).then(() => true).catch(() => false); }
    const intacta = post?.legenda === VELHA_B && post?.status === 'agendado';
    return { ok: !!dem && naTela && intacta, detalhe: `Cecília: ${dem ? 'demanda criada' + (naTela ? ' e visível em Minhas Demandas' : ' mas NÃO aparece na tela') : 'sem demanda'} · postagem B ${intacta ? 'intacta (agendada)' : 'alterada: ' + post?.legenda}` };
  });

  // C) a postagem foi corrigida direto (fila de legendas) e depois o calendário muda → nada é sobrescrito, o Chris escolhe
  await passo('C Correção feita na postagem não é sobrescrita', async () => {
    const DIRETA = 'Legenda J35 A corrigida direto na postagem', DE_NOVO = 'Legenda J35 A — terceira versão no calendário';
    await seed.set('postagens', PA, { ...(await seed.get('postagens', PA)), legenda: DIRETA });
    const c = await seed.get('calendarios', CLIENTE);
    const k = c.items.findIndex(i => i?.postagemId === PA); c.items[k] = { ...c.items[k], legenda: DE_NOVO };
    const { id: _z, ...sem } = c; await seed.set('calendarios', CLIENTE, sem);
    const dem = await esperar(async () => (await seed.listar('demandas')).find(d => /^cp190_divergente_/.test(d.id) && d.destinatario === 'Chris' && d.descricao.includes(DE_NOVO) && d.descricao.includes(DIRETA)));
    const post = await seed.get('postagens', PA);
    return { ok: !!dem && post?.legenda === DIRETA, detalhe: `postagem ${post?.legenda === DIRETA ? 'mantém a correção direta' : 'foi sobrescrita: ' + post?.legenda} · Chris: ${dem ? 'demanda "' + dem.titulo + '"' : 'sem demanda'}` };
  });
}
