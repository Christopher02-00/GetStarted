// J93 (arquivo J60j) — CP240 (20/11/2026): vigia diário da liberação. Roda o próprio código do servidor (central_editor_ler) como a
// Amanda, só lendo, em todo mês com pedido do cliente ou ajuste interno em andamento. Fica VERMELHO quando está tudo aprovado e a
// Amanda não tem botão de liberar (a classe Fedalto/Stokki) — o "pronto que não estava pronto" passa a ser visto no dia, com o motivo.
//  1. Mês liberado e sem nada pendente: o vigia não acusa nada.
//  2. Pedido aprovado e liberação disponível: amarelo "com a Amanda para liberar".
//  3. Mesmo mês com a publicação anterior incoerente (dado corrompido de propósito no emulador): VERMELHO com o motivo do servidor, e a
//     tela da Amanda mostra "Ainda não dá para liberar este mês" com o mesmo motivo (CP239).
//  4. O vigia nunca grava: a transação que ele recebe recusa escrita.
//  5. Dado restaurado: volta a amarelo; a Amanda libera; o vigia não acusa nada.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { createRequire } from 'node:module';
import { entrarComo, entrarGerencia, foto } from '../lib/navegador.mjs';
export const id = 'J93';
export const nome = 'Vigia diário da liberação: código do servidor como a Amanda, só leitura; vermelho quando tudo aprovado e sem botão';
const CLIENTE = 'bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, registrar }) {
  const p = amb.portas, t0 = Date.now(), etapas = [];
  const fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const codec = await import(pathToFileURL(path.join(RAIZ, 'functions-get/codec-central-r80.mjs')).href);
  const vigia = await import(pathToFileURL(path.join(RAIZ, '.github/scripts/vigia-liberacao.mjs')).href);
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
  const op = () => 'ensaio_j93_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j93_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_/, '').replace(/^ajuste_calendario_/, ''));
    const d = codec.abrirEnvelopeCentralR80(j.result);
    if (d?.motivoRecusa) throw new Error(acao + ' recusado: ' + d.motivoRecusa);
    return d;
  }
  const ler = pessoa => chamar(pessoa, 'central_editor_ler', { ciclo: CICLO });
  const mesDe = i => i && (i.mes === MES || (!i.mes && String(i.dataPostagem || '').startsWith(MES)));
  const livre = i => mesDe(i) && !i.excluido && !i.posted && !i.agendado && !i.gravado && !i.postagemId;

  const cal0 = await seed.get('calendarios', CLIENTE);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06/J56/J60–J60i (dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
  const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  const app = getApps().find(a => a.name === 'ensaio-j93') || initializeApp({ projectId: PROJETO }, 'ensaio-j93');
  const db = getFirestore(app);
  const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
  const linha = async () => (await vigia.vigiarLiberacoesCp240(db, { agora: new Date() })).find(l => l.ciclo === CICLO) || null;

  try {
    // 1) nada pendente
    let l = await linha();
    fim('1 mês liberado e sem nada pendente: o vigia não acusa', !l || l.nivel === 'verde', l ? `${l.nivel}: ${l.resumo}` : 'fora da lista do vigia');

    // 2) pedido aprovado → amarelo com a Amanda
    const ret0 = cal0.aprovacaoMeses[MES].retratoLiberadoV115?.items || [];
    const alvo = (cal0.items || []).filter(livre).find(i => ret0.some(x => x.itemId === i.itemId && !x.excluido));
    let opPedido = null;
    { const cli = await nav.novaPagina();
      try { await cli.page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
        await cli.page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê|Em ajuste|Calendário em revisão/.test(document.body.innerText), null, { timeout: 30000 }); await cli.page.waitForTimeout(1500);
        const k = await cli.page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } if (document.getElementById('mName')?.value === nome) return i; try { closeModal(); } catch {} } return -1; }, alvo.name);
        if (k < 0) throw new Error('o cliente não vê o conteúdo do pedido');
        await cli.page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 }); await cli.page.fill('#mObsCliente', 'Pedido do cliente (J93): trocar a chamada.'); await cli.page.click('#btnEnviarObsCliente');
        opPedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === alvo.itemId && /J93/.test(x.texto || ''))?.operationId; });
      } finally { await cli.fechar(); } }
    if (!opPedido) throw new Error('o pedido do cliente não chegou');
    await recepcao.executarRecepcaoPedidosClienteCp175(db, { agora: new Date(), limite: 40 });
    const lerP = async (q = 'Chris') => (await chamar(q, 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === opPedido);
    let d = await ler('Chris');
    await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itens: [{ itemId: alvo.itemId, mes: MES, desc: 'Chamada nova (J93).' }], excluirIds: [], blocos: null });
    let a = await lerP();
    a = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, justificativa: 'Chamada trocada.', execucao: 'Chamada trocada no roteiro.', dependencia: '' })).ajustes.find(x => x.operationId === opPedido);
    await chamar('Chris', 'ajuste_calendario_enviar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura });
    const pa = await lerP('Amanda');
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'aprovar', motivo: '' });
    l = await linha();
    fim('2 pedido aprovado: amarelo "com a Amanda para liberar"', l?.nivel === 'amarelo' && /com a Amanda para liberar/.test(l.resumo), l ? `${l.nivel}: ${l.resumo}` : 'fora da lista');

    // 3) publicação anterior incoerente → vermelho com o motivo do servidor; a tela da Amanda mostra o mesmo motivo
    const ref = db.doc('calendarios/' + CLIENTE), antes = (await ref.get()).data().aprovacaoMeses[MES].aprovadoPor;
    await ref.update({ [`aprovacaoMeses.${MES}.aprovadoPor`]: 'Ensaio J93 (incoerente)' });
    l = await linha();
    const motivoServidor = (l?.motivos || []).join(' | ');
    let tela = '';
    { const pg = await nav.novaPagina(); pg.page.on('dialog', z => z.accept());
      try { await entrarComo(pg.page, amb.url(), 'Amanda'); await pg.page.waitForTimeout(2500); await entrarGerencia(pg.page); await pg.page.waitForTimeout(1500);
        await pg.page.evaluate(() => { window.irParaAprovacoes?.(); }); await pg.page.waitForTimeout(1500); await pg.page.evaluate(() => window.filtrarAprovacoes?.('calendarios'));
        await pg.page.evaluate(([c, m]) => window.abrirEditorPedidosCp237(c, m), [CLIENTE, MES]);
        await pg.page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 });
        const caixa = await esperar(async () => (await pg.page.locator('[data-sem-liberacao-cp239]').first().innerText().catch(() => '')) || null, 30000);
        tela = caixa ? (caixa.includes('Ainda não dá para liberar') && (l?.motivos || []).some(m => caixa.includes(m)) ? 'a Amanda vê o motivo do servidor' : 'caixa sem o motivo: ' + caixa.replace(/\s+/g, ' ').slice(0, 160)) : 'SEM caixa de motivo';
        await foto(pg.page, 'J93-amanda-sem-liberacao');
      } catch (e) { tela = 'falha: ' + String(e).replace(/\s+/g, ' ').slice(0, 200); } finally { await pg.fechar(); } }
    fim('3 tudo aprovado e sem botão: o vigia fica VERMELHO com o motivo, e a Amanda vê o mesmo motivo na tela', l?.nivel === 'vermelho' && /sem botão de liberar/.test(l.resumo) && !!motivoServidor && tela === 'a Amanda vê o motivo do servidor',
      `${l ? l.nivel + ': ' + l.resumo : 'fora da lista'} · motivo: ${motivoServidor.slice(0, 160) || '-'} · tela: ${tela}`);

    // 3b) CP240b: o mesmo mês travado, visto depois que ele passou, fica amarelo "mês passado" (não derruba o vigia)
    const lp = (await vigia.vigiarLiberacoesCp240(db, { agora: new Date('2027-01-15T12:00:00Z') })).find(x => x.ciclo === CICLO);
    fim('3b mês que já passou: a mesma pendência fica amarela "mês passado", sem derrubar o vigia', lp?.nivel === 'amarelo' && /^mês passado \(não bloqueia\)/.test(lp.resumo), lp ? `${lp.nivel}: ${lp.resumo}` : 'fora da lista');

    // 4) o vigia nunca grava
    let recusa = '';
    try { await vigia.somenteLeitura(db).runTransaction(async tx => tx.update(ref, { updatedAt: 'x' })); recusa = 'GRAVOU'; } catch (e) { recusa = String(e.message || e); }
    fim('4 o vigia nunca grava', /escrita bloqueada/.test(recusa), recusa.slice(0, 120));

    // 5) restaura; volta a amarelo; a Amanda libera; o vigia não acusa nada
    await ref.update({ [`aprovacaoMeses.${MES}.aprovadoPor`]: antes });
    const l5a = await linha();
    d = await ler('Amanda');
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, ...(d.internosCp123?.quantidade ? { assinaturaInternosCp123: d.internosCp123.assinatura } : {}), ...(d.assinaturaMudancasDiretasCp238 ? { assinaturaMudancasDiretasCp238: d.assinaturaMudancasDiretasCp238 } : {}) });
    const l5b = await linha(), m = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES];
    fim('5 dado restaurado: amarelo; depois da liberação o vigia não acusa nada', l5a?.nivel === 'amarelo' && m.status === 'liberado' && (!l5b || l5b.nivel === 'verde'), `antes: ${l5a ? l5a.nivel + ' ' + l5a.resumo : '-'} · mês ${m.status} · depois: ${l5b ? l5b.nivel + ' ' + l5b.resumo : 'fora da lista'}`);
  } catch (e) { fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.slice(-8).join(' → ')); }
}
