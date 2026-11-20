// J94 (arquivo J60k) — CP241 (20/11/2026, Fedalto e Stokki 2026-12): no processo novo, a Amanda devolver UM pedido do cliente regravava
// o mês inteiro ("ajuste_interno" por 'Amanda', motivo do pedido) e reabria a criação do calendário (rodada nova, enviadoRevisao:false).
// Efeitos lidos no código e nos dados reais: a fila de retornos do Chris (CP155) ganha um erro sem saída ("o recibo único ainda precisa de
// conferência" — não existe devolução mensal), o cliente recebe no Acompanhamento "Calendário de dezembro em preparação pela equipe" para
// um mês que ele já tem, e cada leitor do estado precisava de remendo (CP233, CP237).
//  1. Devolver o pedido muda só o pedido: o mês continua "pedido do cliente" e a criação não reabre.
//  2. A fila de retornos do Chris não ganha erro para este mês.
//  3. O cliente não recebe "em preparação" no Acompanhamento.
//  4. O Chris refaz, a Amanda aprova e a liberação leva a correção (o caminho de sempre continua).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { createRequire } from 'node:module';
export const id = 'J94';
export const nome = 'Processo novo: devolver um pedido do cliente muda só o pedido — o mês não reabre, o Chris não recebe erro e o cliente não lê "em preparação"';
const CLIENTE = 'bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

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
  const op = () => 'ensaio_j94_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j94_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_/, '').replace(/^ajuste_calendario_/, ''));
    const d = codec.abrirEnvelopeCentralR80(j.result);
    if (d?.motivoRecusa) throw new Error(acao + ' recusado: ' + d.motivoRecusa);
    return d;
  }
  const ler = pessoa => chamar(pessoa, 'central_editor_ler', { ciclo: CICLO });
  const mesDe = i => i && (i.mes === MES || (!i.mes && String(i.dataPostagem || '').startsWith(MES)));
  const livre = i => mesDe(i) && !i.excluido && !i.posted && !i.agendado && !i.gravado && !i.postagemId;
  const preparacoes = async () => ((await seed.get('processos_cliente', CLIENTE))?.timelineAuto || []).filter(x => x?.origem === 'calendario' && x.origemId === MES && x.estado === 'preparacao').length;

  const cal0 = await seed.get('calendarios', CLIENTE);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06/J56/J60–J60j (dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
  const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  const app = getApps().find(a => a.name === 'ensaio-j94') || initializeApp({ projectId: PROJETO }, 'ensaio-j94');
  const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);

  try {
    const ret0 = cal0.aprovacaoMeses[MES].retratoLiberadoV115?.items || [];
    const alvo = (cal0.items || []).filter(livre).find(i => ret0.some(x => x.itemId === i.itemId && !x.excluido));
    let opPedido = null;
    { const cli = await nav.novaPagina();
      try { await cli.page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
        await cli.page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê|Em ajuste|Calendário em revisão/.test(document.body.innerText), null, { timeout: 30000 }); await cli.page.waitForTimeout(1500);
        const k = await cli.page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } if (document.getElementById('mName')?.value === nome) return i; try { closeModal(); } catch {} } return -1; }, alvo.name);
        if (k < 0) throw new Error('o cliente não vê o conteúdo do pedido');
        await cli.page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 }); await cli.page.fill('#mObsCliente', 'Pedido do cliente (J94): trocar o final.'); await cli.page.click('#btnEnviarObsCliente');
        opPedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === alvo.itemId && /J94/.test(x.texto || ''))?.operationId; });
      } finally { await cli.fechar(); } }
    if (!opPedido) throw new Error('o pedido do cliente não chegou');
    await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    const lerP = async (q = 'Chris') => (await chamar(q, 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === opPedido);
    const corrigirEEnviar = async txt => { const de = await ler('Chris');
      await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: de.assinatura, itens: [{ itemId: alvo.itemId, mes: MES, desc: txt }], excluirIds: [], blocos: null });
      let a = await lerP(); a = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, justificativa: 'Final trocado.', execucao: 'Final trocado no roteiro.', dependencia: '' })).ajustes.find(x => x.operationId === opPedido);
      await chamar('Chris', 'ajuste_calendario_enviar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura }); };
    await corrigirEEnviar('Final novo (J94).');
    await amb.aguardarFunctionsOciosas?.(); await new Promise(r => setTimeout(r, 3000));
    const marcaAntes = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES], prepAntes = await preparacoes();

    // Amanda devolve o pedido
    let pa = await lerP('Amanda');
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'devolver', motivo: 'Final ainda longo (J94).' });
    await amb.aguardarFunctionsOciosas?.(); await new Promise(r => setTimeout(r, 5000));
    const m = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES], ciclo = await seed.get('planejamento_social_i155', CICLO);
    const status = (await lerP('Chris'))?.status;
    fim('1 devolver o pedido muda só o pedido: o mês continua "pedido do cliente" e a criação não reabre',
      m.status === 'ajuste_interno' && m.por === marcaAntes.por && m.em === marcaAntes.em && ciclo?.criacao?.enviadoRevisao === true && status === 'devolvido',
      `mês ${m.status} por ${m.por} (antes ${marcaAntes.por}) · criação ${ciclo?.criacao?.enviadoRevisao === true ? 'enviada' : 'REABERTA (rodada ' + ciclo?.criacao?.rodada + ')'} · pedido ${status}`);

    // 2) fila de retornos do Chris (CP155) sem erro para este mês
    const fila = await chamar('Chris', 'central_editor_devolucoes_fila_cp155', {}).catch(e => ({ erro: String(e.message || e) }));
    const erros = (fila.erros || []).filter(x => x.ciclo === CICLO);
    fim('2 a fila de retornos do Chris não ganha erro sem saída', !fila.erro && !erros.length, fila.erro ? 'fila: ' + fila.erro.slice(0, 160) : erros.length ? 'ERRO: ' + erros[0].mensagem.slice(0, 160) : 'sem erro para ' + CICLO);

    // 3) cliente não lê "em preparação"
    const prepDepois = await preparacoes();
    fim('3 o cliente não recebe "Calendário … em preparação pela equipe" no Acompanhamento', prepDepois === prepAntes, `entradas "em preparação" de ${MES}: antes ${prepAntes} · depois ${prepDepois}`);

    // 4) Chris refaz, Amanda aprova, liberação leva a correção
    await corrigirEEnviar('Final curto (J94) — versão final');
    pa = await lerP('Amanda'); await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'aprovar', motivo: '' });
    const d = await ler('Amanda');
    if (d.reliberacaoCp121?.disponivel !== true && d.internosCp123?.disponivel !== true) throw new Error('liberação indisponível: ' + (d.reliberacaoCp121?.motivo || '-'));
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, ...(d.internosCp123?.quantidade ? { assinaturaInternosCp123: d.internosCp123.assinatura } : {}), ...(d.assinaturaMudancasDiretasCp238 ? { assinaturaMudancasDiretasCp238: d.assinaturaMudancasDiretasCp238 } : {}) });
    const mf = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES], item = (mf.retratoLiberadoV115?.items || []).find(i => i.itemId === alvo.itemId);
    fim('4 o Chris refaz, a Amanda aprova e a liberação leva a correção', mf.status === 'liberado' && /versão final/.test(item?.desc || ''), `mês ${mf.status} · correção ${/versão final/.test(item?.desc || '') ? 'no retrato' : 'FORA'}`);
  } catch (e) { fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.slice(-8).join(' → ')); }
}
