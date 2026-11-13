// J64 — CP212 (13/11/2026, Mochi 2026-12): o Chris retirou do calendário 2 conteúdos que tinham pedido do cliente em aberto.
// A tela recusou, mas o servidor gravou a exclusão e o mês travou ("O conteúdo de um pedido ativo está excluído").
// Continua a J06/J56/J60 (Bluefit, dezembro liberado pelo processo novo). Caminho real, com as ações que a tela chama:
//  1. Cliente pede ajuste no "Reels de aquecimento" (link real) → recepção vira demanda.
//  2. Chris tenta retirar esse conteúdo pelo editor → o SERVIDOR recusa e nada é gravado.
//  3. Estado da Mochi (exclusão já gravada) → o mês abre; o pedido aparece como "conteúdo retirado", só com "encerrar".
//  4. Chris encerra com a explicação ao cliente → demanda e aviso encerrados, o mês segue, e o cliente vê a explicação
//     no Acompanhamento do Portal.
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { foto } from '../lib/navegador.mjs';
export const id = 'J64';
export const nome = 'Conteúdo com pedido do cliente em aberto: servidor recusa retirar; retirado de propósito encerra o pedido sem travar o mês';
const CLIENTE = 'bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`, TITULO = 'Ensaio J06 — Reels de aquecimento';
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const EXPLICACAO = 'Conforme combinado com a Amanda, este conteúdo sai do calendário por causa do recesso, sem substituição. (J64)';
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
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j64_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_|^ajuste_calendario_/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  const op = () => 'ensaio_j64_' + String(++n).padStart(3, '0');
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
  // Jornadas anteriores (ex.: J35) corrigem textos de dezembro direto no calendário, sem nova publicação — o servidor
  // recusa liberar nesse caso (correto). Aqui o mês parte sem edições soltas: os campos editoriais voltam ao publicado.
  { const cal = await seed.get('calendarios', CLIENTE), pub = cal?.aprovacaoMeses?.[MES]?.retratoLiberadoV115?.items || [];
    const CAMPOS = ['day','name','desc','roteiroDispensado','legenda','legendaInstagram','legendaTiktok','legendaYoutube','legendaLinkedin','ref','referenciaDispensada','obs','preparacaoGravacao','obsFilmmaker','obsCliente','fmt','stage','dataFlexivel','dataPostagem','bloco','empresaOtavio'];
    let mexeu = false;
    const items = (cal.items || []).map(it => { const p = it && it.mes === MES && !it.excluido && pub.find(x => x.itemId === it.itemId); if (!p || it.agendado || it.posted) return it;
      const c = { ...it }; for (const k of CAMPOS) { if (JSON.stringify(c[k] ?? null) !== JSON.stringify(p[k] ?? null)) { mexeu = true; if (p[k] === undefined) delete c[k]; else c[k] = p[k]; } } return c; });
    if (mexeu) { const { id: _c, ...semId } = cal; await seed.set('calendarios', CLIENTE, { ...semId, items }); } }
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    // 1) Cliente pede ajuste pelo link (tela real, CP193) + recepção (CP175)
    const idx = (await seed.get('calendarios_cliente', CLIENTE)).items.findIndex(i => i && i.name === TITULO && !i.excluido);
    if (idx < 0) throw new Error('o conteúdo ' + TITULO + ' não está no calendário liberado');
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText) && typeof openEdit === 'function', null, { timeout: 30000 });
    await page.evaluate(i => openEdit(i), idx);
    await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 });
    await page.fill('#mObsCliente', 'Pedido do cliente (J64): trocar a música do aquecimento.');
    await page.click('#btnEnviarObsCliente');
    const pedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return c?.aprovacaoMeses?.[MES]?.status === 'ajuste_interno' && c.aprovacaoMeses[MES].por === 'Cliente' ? c.aprovacaoMeses[MES].pedidoAjusteOperationId : null; });
    if (!pedido) throw new Error('o pedido do cliente não chegou ao calendário');
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    const app = getApps().find(a => a.name === 'ensaio-j64') || initializeApp({ projectId: PROJETO }, 'ensaio-j64');
    const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
    const rec = await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    if ((rec.erros || []).some(x => x.origem === pedido)) throw new Error('recepção recusou o pedido: ' + JSON.stringify(rec.erros));
    const itemId = (await seed.get('calendarios', CLIENTE)).items.find(i => i && i.name === TITULO && !i.excluido).itemId;

    // 2) Chris tenta retirar o conteúdo com o pedido em aberto → o servidor recusa
    let d = await chamar('Chris', 'central_editor_ler', { ciclo: CICLO });
    let recusou = '';
    try { await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itens: [], excluirIds: [itemId], blocos: null }); }
    catch (e) { recusou = String(e.message || e); }
    const aindaLa = (await seed.get('calendarios', CLIENTE)).items.find(i => i && i.itemId === itemId);
    fim('2 servidor recusa retirar conteúdo com pedido do cliente em aberto', /pedido do cliente em aberto/.test(recusou) && aindaLa && !aindaLa.excluido,
      recusou ? 'recusado: ' + recusou.slice(0, 140) : 'o servidor GRAVOU a exclusão (conteúdo ' + (aindaLa?.excluido ? 'excluído' : 'presente') + ')');

    // 3) Estado real da Mochi: a exclusão já está gravada → o mês precisa abrir e o pedido só pode ser encerrado
    { const cal = await seed.get('calendarios', CLIENTE); const { id: _c, ...semId } = cal;
      await seed.set('calendarios', CLIENTE, { ...semId, items: cal.items.map(i => i && i.itemId === itemId ? { ...i, excluido: true, excluidoPor: 'Chris', excluidoEm: new Date().toISOString() } : i) });
      await amb.aguardarFunctionsOciosas?.(); }
    let lista;
    try { lista = await chamar('Chris', 'ajuste_calendario_ler_cp112', { ciclo: CICLO }); }
    catch (e) { fim('3 mês abre com o conteúdo retirado; pedido só pode ser encerrado', false, 'o mês NÃO abre: ' + String(e.message || e).slice(0, 160)); return; }
    let a = lista.ajustes.find(x => x.operationId === pedido);
    const soEncerrar = !!a && a.conteudoRetiradoCp212 === true && a.capacidades.cancelar === true && !a.capacidades.salvar && !a.capacidades.enviar;
    fim('3 mês abre com o conteúdo retirado; pedido só pode ser encerrado', soEncerrar, a ? `estado "${a.statusLabel}" · encerrar ${a.capacidades.cancelar ? 'sim' : 'NÃO'} · salvar ${a.capacidades.salvar ? 'SIM' : 'não'}` : 'pedido não listado');
    if (!soEncerrar) return;

    // 4) Chris encerra com a explicação ao cliente
    lista = await chamar('Chris', 'ajuste_calendario_cancelar_cp143', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura,
      assinaturaCancelamentoCp143: a.assinaturaCancelamentoCp143, motivo: EXPLICACAO, conteudoRetiradoCp212: true });
    a = lista.ajustes.find(x => x.operationId === pedido);
    const dem = await seed.get('demandas', a.demandaId), aviso = await seed.get('avisos_do_cliente', pedido);
    const acomp = await esperar(async () => { const x = await seed.get('processos_cliente', CLIENTE); return (x?.timelineAuto || []).some(e => e.origem === 'pedido_ajuste' && /recesso/.test(e.status || '')) ? x : null; });
    d = await chamar('Chris', 'central_editor_ler', { ciclo: CICLO });
    const ok = dem?.status === 'cancelada' && aviso?.cancelado === true && dem?.cancelamentoCp143?.conteudoRetiradoCp212 === true && !!acomp && !!d?.assinatura && !erros.filter(erroGrave).length;
    fim('4 pedido encerrado com a explicação; o cliente vê no Acompanhamento; o mês continua abrindo', ok,
      `demanda ${dem?.status} · aviso ${aviso?.cancelado ? 'encerrado' : 'ativo'} · Acompanhamento do cliente ${acomp ? 'com a explicação' : 'SEM a explicação'} · editor ${d?.assinatura ? 'abre' : 'não abre'}`);
  } catch (e) { await foto(page, 'J64-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
  finally { await fechar(); }
}
