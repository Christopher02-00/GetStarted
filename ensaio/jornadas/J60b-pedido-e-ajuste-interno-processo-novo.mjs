// J60B — CP215 (13/11/2026, Fedalto 2026-12): pedido do cliente aprovado e ajuste interno no MESMO mês se travavam. Réplica no
// processo novo (Bluefit 2026-12, liberado pela J06/J56/J60): (1) Chris envia uma peça adicional (carrossel dia 22) à Amanda;
// (2) o cliente pede ajuste no "Depoimento de aluno" pelo link → o mês vai para ajuste por pedido do cliente → Chris corrige →
// Amanda aprova o pedido. Antes: a base dos ajustes internos exigia o mês 'liberado' → a Amanda não conseguia aprovar a peça, e a
// liberação dos pedidos esperava por ela. Depois: a Amanda aprova a peça e UMA liberação leva o pedido corrigido e a peça nova.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { createRequire } from 'node:module';
import { foto } from '../lib/navegador.mjs';
export const id = 'J60B';
export const nome = 'Pedido do cliente e ajuste interno no mesmo mês (processo novo) saem numa liberação só, sem travar';
const CLIENTE = 'bluefit', NOME = 'Bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const NOVO = { day: 22, fmt: 'Carrossel', stage: 'Topo', name: 'Ensaio J60B — Mais de 30 modelos de ventilador', ref: '', referenciaDispensada: true,
  desc: 'Slide 1: o calor chegou. Slides 2 a 5: três ventiladores e para que serve cada um. Slide 6: chamada para a loja.',
  legenda: 'Calor de dezembro? Separamos os ventiladores certos para cada canto da casa. Passe na loja. (J60B)', obs: 'Usar fotos reais da loja.', preparacaoGravacao: '' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

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
  const op = () => 'ensaio_j60b_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j60b_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp123$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }

  const TITULO = 'Ensaio J06 — Depoimento de aluno', NOVA_DESC = 'Roteiro corrigido conforme o pedido do cliente (J60B).';
  const cal0 = await seed.get('calendarios', CLIENTE);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06/J56/J60 (dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    // (1) Chris envia a peça adicional à Amanda (sobre a publicação atual)
    let d = await chamar('Chris', 'central_editor_ler', { ciclo: CICLO });
    const itemId = 'adicional_cp142_' + [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itemId, motivo: 'Carrossel de ventiladores do dia 22 (J60B).', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
    let a = d.internosCp123.ajustes.find(x => x.itemId === itemId);
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, conteudo: NOVO });
    a = d.internosCp123.ajustes.find(x => x.id === a.id);
    await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    // (2) cliente pede ajuste pelo link → recepção → Chris corrige → Amanda aprova o pedido
    const idx = (await seed.get('calendarios_cliente', CLIENTE)).items.findIndex(i => i && i.name === TITULO && !i.excluido);
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText) && typeof openEdit === 'function', null, { timeout: 30000 });
    await page.evaluate(i => openEdit(i), idx);
    await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 });
    await page.fill('#mObsCliente', 'Pedido do cliente (J60B): trocar a frase final do depoimento.');
    await page.click('#btnEnviarObsCliente');
    const pedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return c?.aprovacaoMeses?.[MES]?.status === 'ajuste_interno' && c.aprovacaoMeses[MES].por === 'Cliente' ? c.aprovacaoMeses[MES].pedidoAjusteOperationId : null; });
    if (!pedido) throw new Error('o pedido do cliente não chegou ao calendário');
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    const app = getApps().find(x => x.name === 'ensaio-j60b') || initializeApp({ projectId: PROJETO }, 'ensaio-j60b');
    const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
    const rec = await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    if ((rec.erros || []).some(x => x.origem === pedido)) throw new Error('recepção recusou o pedido: ' + JSON.stringify(rec.erros));
    d = await chamar('Chris', 'central_editor_ler', { ciclo: CICLO });
    const itemPedido = (await seed.get('calendarios', CLIENTE)).items.find(i => i && i.name === TITULO && !i.excluido).itemId;
    await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itens: [{ itemId: itemPedido, mes: MES, desc: NOVA_DESC }], excluirIds: [], blocos: null });
    let pa = (await chamar('Chris', 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === pedido);
    pa = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, justificativa: 'Frase final trocada.', execucao: 'Roteiro reescrito.', dependencia: '' })).ajustes.find(x => x.operationId === pedido);
    await chamar('Chris', 'ajuste_calendario_enviar_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura });
    pa = (await chamar('Amanda', 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === pedido);
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'aprovar', motivo: '' });
    // (3) a Amanda consegue revisar e aprovar a peça com o mês em ajuste por pedido do cliente
    d = await chamar('Amanda', 'central_editor_ler', { ciclo: CICLO }); a = d.internosCp123.ajustes.find(x => x.id === a.id);
    const podeRevisar = a?.capacidades?.aprovar === true;
    fim('1 com o mês em ajuste por pedido do cliente, a Amanda pode revisar a peça', podeRevisar, `peça "${a?.estadoLabel || a?.estado}" · aprovar ${podeRevisar ? 'disponível' : 'INDISPONÍVEL'} · motivos: ${(d.internosCp123?.motivos || []).join(' | ').slice(0, 220)}`);
    if (!podeRevisar) return;
    d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '' });
    // (4) uma liberação leva o pedido corrigido e a peça
    d = await chamar('Amanda', 'central_editor_ler', { ciclo: CICLO });
    const pode = d.reliberacaoCp121?.disponivel === true && d.internosCp123?.disponivel === true;
    if (!pode) { fim('2 uma liberação leva o pedido corrigido e a peça nova', false, 'liberação indisponível: ' + JSON.stringify({ cp121: d.reliberacaoCp121, internos: d.internosCp123?.motivos }).slice(0, 300)); return; }
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const c3 = await seed.get('calendarios', CLIENTE), m = c3.aprovacaoMeses[MES], itens = m.retratoLiberadoV115?.items || [];
    const comPedido = itens.find(i => i.itemId === itemPedido)?.desc === NOVA_DESC, comPeca = itens.some(i => i.itemId === itemId && i.name === NOVO.name);
    const copia = await esperar(async () => { const c = await seed.get('calendarios_cliente', CLIENTE); return c?.items?.some(i => i && i.itemId === itemId) ? c : null; });
    fim('2 uma liberação leva o pedido corrigido e a peça nova', m.status === 'liberado' && comPedido && comPeca && !!copia && !erros.filter(erroGrave).length,
      `mês ${m.status} · pedido ${comPedido ? 'liberado' : 'FORA'} · peça ${comPeca ? 'liberada' : 'FORA'} · cópia do cliente ${copia ? 'com a peça' : 'SEM a peça'}`);
  } catch (e) { await foto(page, 'J60B-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
  finally { await fechar(); }
}
