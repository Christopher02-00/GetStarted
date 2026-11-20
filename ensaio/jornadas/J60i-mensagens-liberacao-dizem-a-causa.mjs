// J92 (arquivo J60i) — CP239 (20/11/2026, vídeo da Amanda na Fedalto 2026-12): com todos os pedidos do cliente aprovados e um ajuste
// interno ainda em preparação, o editor da Amanda dizia "O mês ainda tem pedidos sem aprovação individual" e "Revisar cada pedido
// acima", e o painel de pedidos dizia "Todos os pedidos estão aprovados. A Amanda libera o mês na revisão do calendário" — as duas
// frases erradas para aquele estado (quem travava era o ajuste interno, com o Chris).
//  1. Tela da Amanda: a caixa de bloqueio diz que a liberação espera os ajustes internos e o botão leva a eles (não aos pedidos).
//  2. Painel de pedidos (Amanda): "Por que este mês não avança?" não promete que a Amanda libera; aponta o fim do editor e o que falta.
//  3. Depois que o ajuste interno é aprovado, a caixa some e o botão de liberar fica ativo; a liberação devolve o mês ao estado liberado.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { createRequire } from 'node:module';
import { entrarComo, entrarGerencia, foto } from '../lib/navegador.mjs';
export const id = 'J92';
export const nome = 'Liberação travada por ajuste interno: a tela da Amanda diz a causa certa (não "pedidos sem aprovação") e o painel não promete o botão';
const CLIENTE = 'bluefit', NOME = 'Bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const hex = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
const FRASE_ERRADA_PEDIDOS = 'O mês ainda tem pedidos sem aprovação individual', FRASE_ERRADA_PAINEL = 'A Amanda libera o mês na revisão do calendário';

export async function executar({ amb, seed, nav, registrar }) {
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
  const op = () => 'ensaio_j92_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j92_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_/, '').replace(/^ajuste_calendario_/, ''));
    const d = codec.abrirEnvelopeCentralR80(j.result);
    if (d?.motivoRecusa) throw new Error(acao + ' recusado: ' + d.motivoRecusa);
    return d;
  }
  const ler = pessoa => chamar(pessoa, 'central_editor_ler', { ciclo: CICLO });
  async function abrirEditor(page) { // Amanda: Aprovações → Calendários → a mesma função do botão "Conferir e liberar" (CP237)
    await entrarGerencia(page); await page.waitForTimeout(1500);
    await page.evaluate(() => { window.irParaAprovacoes?.(); }); await page.waitForTimeout(1500); await page.evaluate(() => window.filtrarAprovacoes?.('calendarios'));
    await page.locator(`[data-liberacao-cp160="${CICLO}"]`).first().waitFor({ state: 'attached', timeout: 30000 });
    await page.evaluate(([c, m]) => window.abrirEditorPedidosCp237(c, m), [CLIENTE, MES]);
    await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 });
    await page.waitForFunction(() => { const s = document.querySelector('.ai123'); return s && !/Conferindo os ajustes internos/.test(s.innerText); }, null, { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector('[data-diagnostico-cp224]') || /Não há pedidos de ajuste/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  const mesDe = i => i && (i.mes === MES || (!i.mes && String(i.dataPostagem || '').startsWith(MES)));
  const livre = i => mesDe(i) && !i.excluido && !i.posted && !i.agendado && !i.gravado && !i.postagemId;

  const cal0 = await seed.get('calendarios', CLIENTE);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06/J56/J60–J60h (dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
  const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  const app = getApps().find(a => a.name === 'ensaio-j92') || initializeApp({ projectId: PROJETO }, 'ensaio-j92');
  const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);

  try {
    const ret0 = cal0.aprovacaoMeses[MES].retratoLiberadoV115?.items || [];
    const comPedido = new Set(Object.values(cal0.pedidosAjusteClienteI71 || {}).filter(x => x.competencia === MES).map(x => x.itemId));
    const livres = (cal0.items || []).filter(livre).filter(i => ret0.some(x => x.itemId === i.itemId && !x.excluido));
    const alvo = [...livres.filter(i => !comPedido.has(i.itemId)), ...livres][0];
    if (!alvo) { fim('preparação', false, 'sem conteúdo livre publicado no mês'); return; }

    // Pedido do cliente pelo link → Chris corrige e envia → Amanda aprova
    let opPedido = null;
    { const cli = await nav.novaPagina();
      try { await cli.page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
        await cli.page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê|Em ajuste|Calendário em revisão/.test(document.body.innerText), null, { timeout: 30000 }); await cli.page.waitForTimeout(1500);
        const k = await cli.page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } if (document.getElementById('mName')?.value === nome) return i; try { closeModal(); } catch {} } return -1; }, alvo.name);
        if (k < 0) throw new Error('o cliente não vê o conteúdo do pedido');
        await cli.page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 }); await cli.page.fill('#mObsCliente', 'Pedido do cliente (J92): mudar o gancho.'); await cli.page.click('#btnEnviarObsCliente');
        opPedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === alvo.itemId && /J92/.test(x.texto || ''))?.operationId; });
      } finally { await cli.fechar(); } }
    if (!opPedido) throw new Error('o pedido do cliente não chegou');
    await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    const lerP = async (q = 'Chris') => (await chamar(q, 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === opPedido);
    let d = await ler('Chris');
    await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itens: [{ itemId: alvo.itemId, mes: MES, desc: 'Gancho novo (J92).' }], excluirIds: [], blocos: null });
    let a = await lerP();
    a = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, justificativa: 'Gancho trocado.', execucao: 'Gancho trocado no roteiro.', dependencia: '' })).ajustes.find(x => x.operationId === opPedido);
    await chamar('Chris', 'ajuste_calendario_enviar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura });
    const pa = await lerP('Amanda');
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'aprovar', motivo: '' });

    // Chris começa uma peça adicional e deixa em preparação (não envia)
    d = await ler('Chris'); const pecaId = 'adicional_cp142_' + hex();
    d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itemId: pecaId, motivo: 'Peça adicional da J92.', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
    let x = d.internosCp123.ajustes.find(r => r.itemId === pecaId);
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, conteudo: { day: 21, fmt: 'Reel', stage: 'Topo', name: 'Ensaio J92 — Peça em preparação', ref: '', referenciaDispensada: true, desc: 'Roteiro da peça da J92.', legenda: 'Legenda da peça adicional da J92.', obs: 'Imagens reais da loja.', preparacaoGravacao: '' } });
    x = d.internosCp123.ajustes.find(r => r.id === x.id);

    // 1 e 2) tela da Amanda no editor do mês
    let t1 = '', t2 = '';
    { const pg = await nav.novaPagina(); pg.page.on('dialog', z => z.accept());
      try { await entrarComo(pg.page, amb.url(), 'Amanda'); await pg.page.waitForTimeout(2500); await abrirEditor(pg.page);
        const editor = await pg.page.locator('#planejamentoEditorI172').innerText();
        const caixa = editor.includes('A liberação ainda espera os ajustes internos deste mês'), errada = editor.includes(FRASE_ERRADA_PEDIDOS), botao = /Ver os ajustes internos/.test(editor);
        t1 = `caixa ${caixa ? 'diz que espera os ajustes internos' : 'NÃO cita os ajustes internos'} · ${errada ? 'AINDA diz "pedidos sem aprovação"' : 'sem "pedidos sem aprovação"'} · botão ${botao ? '"Ver os ajustes internos"' : 'SEM "Ver os ajustes internos"'}`;
        const diag = await pg.page.locator('[data-diagnostico-cp224]').first().innerText().catch(() => '');
        t2 = diag.includes(FRASE_ERRADA_PAINEL) ? 'painel AINDA promete "A Amanda libera o mês"' : /fim do editor deste mês/.test(diag) ? 'painel aponta o fim do editor e o que falta' : 'painel sem a frase esperada: ' + diag.replace(/\s+/g, ' ').slice(0, 160);
        await foto(pg.page, 'J92-amanda-editor-travado');
      } catch (e) { t1 = t1 || 'falha: ' + String(e).replace(/\s+/g, ' ').slice(0, 200); t2 = t2 || t1; await foto(pg.page, 'J92-falha'); } finally { await pg.fechar(); } }
    fim('1 tela da Amanda: a caixa diz que a liberação espera os ajustes internos (não "pedidos sem aprovação")', /^caixa diz que espera os ajustes internos · sem "pedidos sem aprovação" · botão "Ver os ajustes internos"$/.test(t1), t1);
    fim('2 painel de pedidos não promete que a Amanda libera; aponta o fim do editor', t2 === 'painel aponta o fim do editor e o que falta', t2);

    // 3) Chris envia a peça; Amanda aprova; a caixa some e a liberação volta a funcionar
    d = await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id });
    d = await ler('Amanda'); x = d.internosCp123.ajustes.find(r => r.id === x.id);
    await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, decisao: 'aprovar', motivo: '' });
    let t3 = '';
    { const pg = await nav.novaPagina(); pg.page.on('dialog', z => z.accept());
      try { await entrarComo(pg.page, amb.url(), 'Amanda'); await pg.page.waitForTimeout(2500); await abrirEditor(pg.page);
        const editor = await pg.page.locator('#planejamentoEditorI172').innerText();
        const btn = pg.page.locator('#planejamentoEditorI172 [data-action="publicar-form"]').first();
        const ativo = await btn.isVisible().catch(() => false) && await btn.isEnabled().catch(() => false);
        t3 = `${/A liberação ainda espera|pedidos sem aprovação|Ainda não dá para liberar/.test(editor) ? 'caixa de bloqueio AINDA aparece' : 'sem caixa de bloqueio'} · botão de liberar ${ativo ? 'ativo' : 'INATIVO'}`;
      } catch (e) { t3 = 'falha: ' + String(e).replace(/\s+/g, ' ').slice(0, 200); } finally { await pg.fechar(); } }
    d = await ler('Amanda');
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, ...(d.internosCp123?.quantidade ? { assinaturaInternosCp123: d.internosCp123.assinatura } : {}), ...(d.assinaturaMudancasDiretasCp238 ? { assinaturaMudancasDiretasCp238: d.assinaturaMudancasDiretasCp238 } : {}) });
    const m = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES];
    fim('3 com o ajuste interno aprovado, a caixa some, o botão fica ativo e a liberação leva tudo', /^sem caixa de bloqueio · botão de liberar ativo$/.test(t3) && m.status === 'liberado', `${t3} · mês ${m.status}`);
  } catch (e) { fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.slice(-8).join(' → ')); }
}
