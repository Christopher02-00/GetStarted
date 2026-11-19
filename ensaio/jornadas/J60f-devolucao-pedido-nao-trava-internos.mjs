// J86 (arquivo J60f) — CP233 (19/11/2026, Fedalto 2026-12, processo novo): a Amanda devolveu um pedido do cliente e o mês
// foi reaberto com por 'Amanda' e a criação reaberta (enviadoRevisao:false). O servidor deixou de reconhecer a publicação: os
// ajustes internos aprovados e o aguardando passaram a mostrar "A publicação deste mês mudou… use Trazer para a versão atual"
// SEM o botão, e a liberação sumiu. Peças próprias (4 peças CP142 liberadas) na Bluefit 2026-12.
//  1. Depois da devolução do pedido, os 3 internos continuam sem erro de base, com ação.
//  2. A Amanda devolve o interno aguardando pela tela (Revisar este conteúdo → Devolver).
//  3. Chris refaz pedido e interno; Amanda aprova tudo; a liberação leva tudo ao cliente.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { createRequire } from 'node:module';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J86';
export const nome = 'Processo novo: devolução de pedido do cliente não trava os ajustes internos do mês (Fedalto)';
const CLIENTE = 'bluefit', NOME = 'Bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const dataDe = dia => `${MES}-${String(dia).padStart(2, '0')}`;

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const p = amb.portas, t0 = Date.now(), etapas = [];
  const fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const codec = await import(pathToFileURL(path.join(RAIZ, 'functions-get/codec-central-r80.mjs')).href);
  const contas = {};
  async function entrar(pessoa) {
    if (contas[pessoa]) return contas[pessoa];
    const email = EMAILS[pessoa], token = JSON.stringify({ sub: 'ensaio-' + email.replace(/[^a-z0-9]/gi, '-'), email, email_verified: true, name: pessoa });
    const r = await fetch(`http://127.0.0.1:${p.auth}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-api-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postBody: 'id_token=' + encodeURIComponent(token) + '&providerId=google.com', requestUri: 'http://localhost', returnSecureToken: true }) });
    const j = await r.json(); if (!j.idToken) throw new Error('login ' + pessoa + ': ' + JSON.stringify(j).slice(0, 200));
    return contas[pessoa] = { idToken: j.idToken, uid: j.localId };
  }
  let n = 0;
  const op = () => 'ensaio_j86_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j86_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp(123|226)$/, ''));
    const d = codec.abrirEnvelopeCentralR80(j.result);
    if (d?.motivoRecusa) throw new Error(acao + ' recusado: ' + d.motivoRecusa);
    return d;
  }
  async function abrirEditor(page) {
      await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 }); await abrirMenuSeMovel(page); await page.click('#navPlanejamentoPreparacaoR80');
      await page.waitForFunction(() => { const v = document.getElementById('view-estrategiaCp109'); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, null, { timeout: 20000 });
      const v = page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
      await v.locator('select').first().selectOption({ label: NOME }); await v.locator('input[type=month]').first().fill(MES);
      await v.getByRole('button', { name: /Abrir cliente e mês/ }).click();
      await page.getByRole('button', { name: /^Abrir materiais do mês$/ }).click({ timeout: 20000 }); await page.waitForTimeout(3000);
      const aba = page.getByRole('button', { name: /^Criar e aprovar$/ }).first(); if (await aba.isVisible().catch(() => false)) { await aba.click(); await page.waitForTimeout(2500); }
      const ed = page.getByRole('button', { name: /^Abrir editor oficial nesta competência$/ }).first(); await ed.evaluate(el => el.scrollIntoView({ block: 'center' })); await ed.click();
      await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 });
      await page.waitForFunction(() => { const s = document.querySelector('.ai123'); return s && !/Conferindo os ajustes internos/.test(s.innerText); }, null, { timeout: 30000 }).catch(() => {});
  }
  const ler = pessoa => chamar(pessoa, 'central_editor_ler', { ciclo: CICLO });
  const ajuste = (d, idA) => d.internosCp123.ajustes.find(x => x.id === idA);

  const cal0 = await seed.get('calendarios', CLIENTE);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06/J56 (dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();

  const { page, erros, fechar } = await nav.novaPagina();
  try {
    let d = await ler('Chris');
    const proprias = [];
    for (const [dia, nome] of [[4, 'Ensaio J86 — Interno A'], [6, 'Ensaio J86 — Interno B'], [16, 'Ensaio J86 — Interno C'], [17, 'Ensaio J86 — Pedido do cliente']]) {
      const itemId = 'adicional_cp142_' + [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
      d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itemId, motivo: 'Peça de apoio da J86.', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
      let x = d.internosCp123.ajustes.find(r => r.itemId === itemId);
      d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, conteudo: { day: dia, fmt: 'Reel', stage: 'Topo', name: nome, ref: '', referenciaDispensada: true, desc: 'Roteiro original ' + nome + '.', legenda: 'Legenda ' + nome + '.', obs: 'Imagens reais da loja.', preparacaoGravacao: '' } });
      x = ajuste(d, x.id); d = await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id });
      d = await ler('Amanda'); x = ajuste(d, x.id); d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, decisao: 'aprovar', motivo: '' });
      d = await ler('Chris'); proprias.push(itemId);
    }
    d = await ler('Amanda');
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const [pA, pB, pC, pD] = proprias;
    // 3 ajustes internos comuns: A e B aprovados, C aguardando a Amanda
    const interno = async (itemId) => { let d0 = await ler('Chris'); let d1 = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d0.assinatura, itemId, motivo: 'Trocar o roteiro (J86).', esperadaRevisao: d0.ciclo.revisao, publicacaoHash: d0.internosCp123.publicacaoHash });
      let a = d1.internosCp123.ajustes.find(r => r.itemId === itemId && !r.tipoAjuste); d1 = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, conteudo: { desc: 'Roteiro interno novo (J86) ' + itemId.slice(-6), legenda: a.conteudo.legenda, obs: a.conteudo.obs, preparacaoGravacao: a.conteudo.preparacaoGravacao ?? '' } });
      a = ajuste(d1, a.id); await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id }); return a.id; };
    const iA = await interno(pA), iB = await interno(pB), iC = await interno(pC);
    for (const idA of [iA, iB]) { const d2 = await ler('Amanda'); const a = ajuste(d2, idA); await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '' }); }
    // pedido do cliente na peça D (tela real do link)
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    const app = getApps().find(a => a.name === 'ensaio-j86') || initializeApp({ projectId: PROJETO }, 'ensaio-j86');
    const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
    const cli = await nav.novaPagina();
    let opPedido = null;
    try { await cli.page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
      await cli.page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê|Em ajuste|Calendário em revisão/.test(document.body.innerText), null, { timeout: 30000 }); await cli.page.waitForTimeout(1500);
      const k = await cli.page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } if (document.getElementById('mName')?.value === nome) return i; try { closeModal(); } catch {} } return -1; }, 'Ensaio J86 — Pedido do cliente');
      if (k < 0) throw new Error('o cliente não vê a peça do pedido');
      await cli.page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 }); await cli.page.fill('#mObsCliente', 'Pedido do cliente (J86): trocar a chamada.'); await cli.page.click('#btnEnviarObsCliente');
      opPedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === pD && /J86/.test(x.texto || ''))?.operationId; });
    } finally { await cli.fechar(); }
    if (!opPedido) throw new Error('o pedido do cliente não chegou');
    await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    const lerP = async (q = 'Chris') => (await chamar(q, 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === opPedido);
    // Processo novo: o Chris corrige no editor ("Salvar conteúdos"), explica e envia o pedido — o caso real da Fedalto.
    const corrigirEEnviar = async (txt) => { const de = await ler('Chris');
      await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: de.assinatura, itens: [{ itemId: pD, mes: MES, desc: txt }], excluirIds: [], blocos: null });
      let a = await lerP(); a = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, justificativa: 'Ajustado.', execucao: 'Chamada trocada.', dependencia: '' })).ajustes.find(x => x.operationId === opPedido);
      await chamar('Chris', 'ajuste_calendario_enviar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura }); return lerP(); };
    await corrigirEEnviar('Corrigido (J86) — chamada nova');
    let pa = await lerP('Amanda');
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'devolver', motivo: 'Trocar de novo a chamada (J86).' });
    // 1) internos depois da devolução
    d = await ler('Amanda');
    const est = id => ajuste(d, id);
    const erroBase = (d.internosCp123.motivos || []).filter(m => /publicação deste mês mudou|outra versão editorial/.test(m)).concat([iA, iB, iC].map(x => est(x)?.erro || est(x)?.motivoBloqueio || '').filter(m => /publicação deste mês mudou/.test(m)));
    const cOk = est(iC)?.capacidades?.aprovar === true && est(iC)?.capacidades?.devolver === true;
    fim('1 depois da Amanda devolver um pedido do cliente, os ajustes internos continuam com ação (sem "a publicação mudou")', !erroBase.length && est(iA)?.estado === 'aprovado' && est(iB)?.estado === 'aprovado' && cOk,
      `A ${est(iA)?.estado} · B ${est(iB)?.estado} · C aprovar/devolver ${cOk ? 'sim' : 'NÃO'} · ${erroBase.length ? 'ERRO: ' + erroBase[0].slice(0, 160) : 'sem erro de base'} · motivos: ${(d.internosCp123.motivos || []).join(' | ').slice(0, 200)}`);
    // 2) Amanda devolve C pela tela
    let tela2 = '';
    { const pg = await nav.novaPagina(); pg.page.on('dialog', x => x.accept());
      try { await entrarComo(pg.page, amb.url(), 'Amanda'); await pg.page.waitForTimeout(2500);
        await pg.page.evaluate(id => window.abrirAjusteInternoFilaCp123?.(id), iC);
        const card = pg.page.locator(`[data-interno-cp123="${iC}"]`); await card.waitFor({ state: 'attached', timeout: 40000 });
        const bt = card.locator('[data-action="devolver-form"]'); await bt.waitFor({ state: 'attached', timeout: 15000 }); await bt.evaluate(el => el.click());
        await card.locator('textarea').last().fill('Usar a referência nova (J86).'); await card.locator('[data-action="devolver"]').evaluate(el => el.click());
        const ok = await esperar(async () => (await seed.get('calendarios_ajustes_internos_cp123', iC))?.estado === 'devolvido', 20000);
        tela2 = ok ? 'ok' : 'não devolveu: ' + (await pg.page.locator('.ai123 .aviso').first().innerText().catch(() => '(sem aviso)')).replace(/\s+/g, ' ').slice(0, 200);
        if (!ok) await foto(pg.page, 'J86-devolver-falha');
      } catch (e) { tela2 = 'falha: ' + String(e).replace(/\s+/g, ' ').slice(0, 220); await foto(pg.page, 'J86-devolver-falha').catch(() => {}); }
      finally { await pg.fechar(); } }
    fim('2 a Amanda devolve o ajuste interno aguardando pela tela (Revisar este conteúdo → Devolver)', tela2 === 'ok', tela2);
    // 3) Chris refaz; Amanda aprova; liberação
    await corrigirEEnviar('Corrigido de novo (J86) — chamada final');
    pa = await lerP('Amanda'); if (pa?.status === 'enviado') await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'aprovar', motivo: '' });
    if (tela2 === 'ok') { d = await ler('Chris'); let c = ajuste(d, iC);
      d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: c.assinatura, ajusteId: c.id, conteudo: { desc: 'Roteiro interno refeito com a referência nova (J86)', legenda: c.conteudo.legenda, obs: c.conteudo.obs, preparacaoGravacao: c.conteudo.preparacaoGravacao ?? '' } });
      c = ajuste(d, iC); await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: c.assinatura, ajusteId: c.id });
      d = await ler('Amanda'); c = ajuste(d, iC); await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: c.assinatura, ajusteId: c.id, decisao: 'aprovar', motivo: '' }); }
    d = await ler('Amanda');
    const disp = d.internosCp123?.disponivel === true || d.capacidades?.decidir === true;
    if (!disp) { fim('3 tudo aprovado: a liberação fica disponível e leva pedido e internos ao cliente', false, 'liberação indisponível: ' + JSON.stringify({ i: d.internosCp123?.motivos, p: d.ajustesCp112?.liberacaoMensal?.motivos }).slice(0, 400)); return; }
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const m = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES], ret = m.retratoLiberadoV115?.items || [];
    const tem = (id, txt) => ret.some(i => i.itemId === id && (i.desc || '').includes(txt));
    fim('3 tudo aprovado: a liberação fica disponível e leva pedido e internos ao cliente', m.status === 'liberado' && tem(pA, 'Roteiro interno novo') && tem(pC, 'referência nova') && tem(pD, 'chamada final'),
      `mês ${m.status} · A ${tem(pA, 'Roteiro interno novo') ? 'ok' : 'FORA'} · C ${tem(pC, 'referência nova') ? 'ok' : 'FORA'} · pedido ${tem(pD, 'chamada final') ? 'ok' : 'FORA'}`);
  } catch (e) { await foto(page, 'J86-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.slice(-8).join(' → ')); }
  finally { await fechar(); }
}
