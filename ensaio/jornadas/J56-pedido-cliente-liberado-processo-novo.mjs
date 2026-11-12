// J56 — Pedido do cliente aprovado pela Amanda volta ao cliente no processo novo (CP203, Zeiss 2026-11 / Vitalle 2026-12, 11/11/2026).
// Continua a J06 (Bluefit, dezembro liberado pelo processo novo I155). Caminho real:
//  cliente pede ajuste pelo link (CP193) → recepção vira demanda (CP175) → Chris corrige o conteúdo e envia o pedido →
//  Amanda aprova o pedido → Amanda vê "Liberar correções ao cliente" e libera → mês volta a liberado, a correção chega à
//  cópia do cliente e a entrega do ciclo registra a nova publicação (preservando a primeira).
// Antes: no processo novo a liberação dos pedidos só existia para a continuidade antiga — o mês ficava travado em ajuste.
// As ações da equipe são as mesmas que a tela chama (programacaoIndependenteGetI165), com o login Google de teste do emulador.
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { foto } from '../lib/navegador.mjs';
export const id = 'J56';
export const nome = 'Pedido do cliente aprovado pela Amanda é liberado ao cliente no processo novo';
const CLIENTE = 'bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`, TITULO = 'Ensaio J06 — Depoimento de aluno';
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const NOVA_DESC = 'Roteiro corrigido conforme o pedido do cliente (J56).';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const p = amb.portas, t0 = Date.now(), etapas = [];
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
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j56_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_|^ajuste_calendario_/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  const op = () => 'ensaio_j56_' + String(++n).padStart(3, '0');
  const fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });

  const cal0 = await seed.get('calendarios', CLIENTE);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06 (dezembro liberado pelo processo novo)'); return; }
  // A J49 muda a ficha da Bluefit para testar o aviso da ficha; com ficha nova o servidor exige que o Chris readote a fonte
  // (CP183) antes de mexer no mês. Aqui a ficha volta à versão que este ciclo adotou — o cenário da Amanda, sem ficha nova.
  const cicloJ56 = await seed.get('planejamento_social_i155', CICLO), adotada = cicloJ56?.documentos?.baseDocumentoUnicoCp183?.infoCliente || cicloJ56?.criacao?.infoClienteCp183;
  if (adotada?.existe) { const { id: _i, ...atual } = (await seed.get('info_extras_cliente', CLIENTE)) || {};
    if (atual.texto !== adotada.texto || atual.clienteNome !== adotada.clienteNome || atual.atualizadoPor !== adotada.atualizadoPor)
      await seed.set('info_extras_cliente', CLIENTE, { ...atual, texto: adotada.texto, clienteNome: adotada.clienteNome, atualizadoPor: adotada.atualizadoPor }); }
  else if (adotada && adotada.existe === false && await seed.get('info_extras_cliente', CLIENTE))
    await fetch(`http://127.0.0.1:${amb.portas.firestore}/v1/projects/${PROJETO}/databases/(default)/documents/info_extras_cliente/${CLIENTE}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    // 1) Cliente pede ajuste pelo link (tela real, CP193)
    const idx = (await seed.get('calendarios_cliente', CLIENTE)).items.findIndex(i => i && i.name === TITULO && !i.excluido);
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText) && typeof openEdit === 'function', null, { timeout: 30000 });
    await page.evaluate(i => openEdit(i), idx);
    await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 });
    await page.fill('#mObsCliente', 'Pedido do cliente (J56): trocar a chamada final do depoimento.');
    await page.click('#btnEnviarObsCliente');
    const pedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return c?.aprovacaoMeses?.[MES]?.status === 'ajuste_interno' && c.aprovacaoMeses[MES].por === 'Cliente' ? c.aprovacaoMeses[MES].pedidoAjusteOperationId : null; });
    if (!pedido) throw new Error('o pedido do cliente não chegou ao calendário');
    await foto(page, 'J56-cliente-pediu');
    // 2) Recepção (no ar ela roda a cada 5 min no servidor; aqui a mesma função é chamada direto no emulador)
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    const app = getApps().find(a => a.name === 'ensaio-j56') || initializeApp({ projectId: PROJETO }, 'ensaio-j56');
    const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
    const rec = await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    if ((rec.erros || []).some(x => x.origem === pedido)) throw new Error('recepção recusou o pedido: ' + JSON.stringify(rec.erros));
    // 3) Chris corrige o conteúdo e envia o pedido para a Amanda
    let d = await chamar('Chris', 'central_editor_ler', { ciclo: CICLO });
    const itemId = (await seed.get('calendarios', CLIENTE)).items.find(i => i && i.name === TITULO && !i.excluido).itemId;
    await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itens: [{ itemId, mes: MES, desc: NOVA_DESC }], excluirIds: [], blocos: null });
    let a = (await chamar('Chris', 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === pedido);
    if (!a) throw new Error('o pedido não chegou à lista do Chris');
    a = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura,
      justificativa: 'Ajustado como pedido.', execucao: 'Chamada final reescrita no roteiro.', dependencia: '' })).ajustes.find(x => x.operationId === pedido);
    await chamar('Chris', 'ajuste_calendario_enviar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura });
    // 4) Amanda aprova o pedido
    a = (await chamar('Amanda', 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === pedido);
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, decisao: 'aprovar', motivo: '' });
    // 5) Amanda vê "Liberar correções ao cliente" e libera
    d = await chamar('Amanda', 'central_editor_ler', { ciclo: CICLO });
    const disponivel = d.reliberacaoCp121?.disponivel === true;
    fim('Amanda vê "Liberar correções ao cliente" com o mês em ajuste pedido pelo cliente', disponivel, disponivel ? 'disponível' : 'indisponível: ' + JSON.stringify(d.reliberacaoCp121) + ' · ' + etapas.join(' → '));
    if (!disponivel) return;
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const cal = await seed.get('calendarios', CLIENTE), m = cal.aprovacaoMeses[MES], ciclo = await seed.get('planejamento_social_i155', CICLO);
    const noRetrato = m.retratoLiberadoV115?.items?.find(i => i.itemId === itemId)?.desc === NOVA_DESC;
    const copia = await esperar(async () => { const c = await seed.get('calendarios_cliente', CLIENTE); return c?.items?.find(i => i && i.itemId === itemId)?.desc === NOVA_DESC ? c : null; });
    const entrega = ciclo?.publicacaoAtual?.retrato?.publicadoEm === m.retratoLiberadoV115?.publicadoEm && !!ciclo?.entrega;
    fim('liberação: mês liberado, correção no retrato e na cópia do cliente, entrega do ciclo atualizada', m.status === 'liberado' && noRetrato && !!copia && entrega && !erros.filter(erroGrave).length,
      `mês ${m.status} · retrato ${noRetrato ? 'com a correção' : 'SEM a correção'} · cópia do cliente ${copia ? 'atualizada' : 'NÃO atualizada'} · publicação atual do ciclo ${entrega ? 'atualizada' : 'DIVERGENTE'}`);
  } catch (e) { await foto(page, 'J56-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
  finally { await fechar(); }
}
