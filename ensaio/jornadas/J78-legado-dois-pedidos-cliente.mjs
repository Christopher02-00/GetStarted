// J78 — CP224 U3 (18/11/2026): processo ANTIGO (continuar_legado), mês liberado pela Central, e o cliente manda DOIS pedidos
// pelo link (um em cada conteúdo). A prova CP115 de reabertura do cliente vale só para o pedido mais recente; o outro mostrava
// "A publicação anterior e a origem deste pedido precisam de conferência…" sem saída. Esperado: cada pedido mostra um próximo
// passo verdadeiro, o Chris corrige os dois, a Amanda aprova os dois e uma liberação leva os dois.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { foto } from '../lib/navegador.mjs';
export const id = 'J78';
export const nome = 'Processo antigo: dois pedidos do cliente no mesmo mês liberado — cada um tem próximo passo e saem numa liberação só';
const CLIENTE = 'hitech', MES = '2027-05', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const NOVA_DESC = 'Roteiro da vitrine corrigido conforme o pedido do cliente (J78).';
const PECA = { day: 28, fmt: 'Carrossel', stage: 'Topo', name: 'Ensaio J71 — Black Friday na loja', ref: '', referenciaDispensada: true,
  desc: 'Slide 1: é oficial, a Black Friday chegou. Slides 2 a 5: ofertas. Slide 6: Centro de Campo Largo, do lado da Matriz.', legenda: 'A Black Friday chegou. (J78)', obs: 'Fotos reais da loja.', preparacaoGravacao: '' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const p = amb.portas, t0 = Date.now(), etapas = [];
  const fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const codec = await import(pathToFileURL(path.join(RAIZ, 'functions-get/codec-central-r80.mjs')).href);
  const { criarRetratoLiberadoV115, mapaAprovacaoAposPublicar } = await import(pathToFileURL(path.join(RAIZ, 'functions-get/editorial-helpers-oficiais-i172.mjs')).href);
  const contas = {};
  async function entrar(pessoa) {
    if (contas[pessoa]) return contas[pessoa];
    const email = EMAILS[pessoa], token = JSON.stringify({ sub: 'ensaio-' + email.replace(/[^a-z0-9]/gi, '-'), email, email_verified: true, name: pessoa });
    const r = await fetch(`http://127.0.0.1:${p.auth}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-api-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postBody: 'id_token=' + encodeURIComponent(token) + '&providerId=google.com', requestUri: 'http://localhost', returnSecureToken: true }) });
    const j = await r.json(); if (!j.idToken) throw new Error('login ' + pessoa + ': ' + JSON.stringify(j).slice(0, 200));
    return contas[pessoa] = { idToken: j.idToken, uid: j.localId };
  }
  let n = 0; const op = () => 'ensaio_j78_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ciclo: CICLO, origemEditorial: 'continuar_legado', ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j78_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?|^ajuste_calendario_/, '').replace(/_cp1\d\d$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  // monta o mês publicado em `publicadoEm`; com `registro`, como publicação feita pela Central (histórico + recibo I172)
  const publicar = async (publicadoEm, alterar = {}, registro = null) => {
    const cal0 = (await seed.get('calendarios', CLIENTE)) || {}; const { id: _x, ...semId } = cal0;
    const outros = (cal0.items || []).filter(i => i?.mes !== MES);
    const base = [
      { itemId: 'calitem_j78_vitrine', mes: MES, day: 26, name: 'Hitech — Reels da vitrine (J78)', desc: 'Roteiro original da vitrine.', legenda: 'Legenda da vitrine J78.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: false },
      { itemId: 'calitem_j78_dica', mes: MES, day: 20, name: 'Hitech — Dica do técnico (J78)', desc: 'Roteiro original da dica.', legenda: 'Legenda da dica J78.', obs: '', fmt: 'Reel', stage: 'Meio', ref: '', excluido: false, apr: false },
    ].map(i => ({ ...i, ...(alterar[i.itemId] || {}) }));
    const cal = { cliente: CLIENTE, client: 'Hitech', ...semId, items: [...outros, ...base] };
    const retrato = criarRetratoLiberadoV115(cal, MES, 'Amanda', publicadoEm);
    cal.aprovacaoMeses = mapaAprovacaoAposPublicar(cal.aprovacaoMeses || {}, MES, 'Amanda', publicadoEm, [], retrato);
    await seed.set('calendarios', CLIENTE, cal);
    const proc = await seed.get('processo_calendarios_i164', 'ativo');
    const ed = registro
      ? { schema: 1, revisao: 2, fase: 'publicada', rodada: 1, por: 'Amanda', autorUid: registro.uid, em: publicadoEm, ultimaOperacao: registro.operacao, publicacaoAtual: { por: 'Amanda', em: publicadoEm, retrato },
          historico: [{ acao: 'central_editor_decidir', decisao: 'publicar', por: 'Amanda', uid: registro.uid, operacao: registro.operacao, em: publicadoEm }] }
      : { schema: 1, revisao: 1, fase: 'publicada', rodada: 0 };
    await seed.set('continuidade_calendarios_i164', CICLO, { schema: 1, ativo: true, modo: 'continuar_legado', cliente: CLIENTE, competencia: MES, ativacaoId: proc.ativacaoId, revisao: registro ? 2 : 1, editorialI172: ed });
    if (registro) await seed.set(`calendarios_versoes/${CLIENTE}__i172_${registro.operacao}/editorial_i172`, 'recibo', { schema: 1, origemEditorial: 'continuar_legado', acao: 'central_editor_decidir', ciclo: CICLO,
      operacao: registro.operacao, papel: 'Amanda', atorReal: 'Amanda', uid: registro.uid, em: publicadoEm, retratoPublicacao: retrato });
    await amb.aguardarFunctionsOciosas?.();
  };
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    const amanda = await entrar('Amanda');
    await publicar('2026-11-05T12:00:00.000Z', {}, { uid: amanda.uid, operacao: 'ensaio_j78_pub_p1' });
    const copia = await esperar(async () => { const c = await seed.get('calendarios_cliente', CLIENTE); return c?.items?.some(i => i?.itemId === 'calitem_j78_vitrine') ? c : null; });
    if (!copia) throw new Error('a cópia do cliente não recebeu o mês');
    const url = amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), ops = [];
    for (const [itemId, nomeItem] of [['calitem_j78_vitrine', 'Hitech — Reels da vitrine (J78)'], ['calitem_j78_dica', 'Hitech — Dica do técnico (J78)']]) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê|Calendário em revisão|Em ajuste/.test(document.body.innerText), null, { timeout: 30000 }); await page.waitForTimeout(1500);
      const k = await page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } if (document.getElementById('mName')?.value === nome) return i; closeModal(); } return -1; }, nomeItem);
      if (k < 0) throw new Error('a página do cliente não mostra ' + nomeItem);
      await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 });
      await page.fill('#mObsCliente', `Pedido do cliente (J78) em ${nomeItem}.`); await page.click('#btnEnviarObsCliente');
      const o = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === itemId && /J78/.test(x.texto || ''))?.operationId; });
      if (!o) throw new Error('o pedido em ' + nomeItem + ' não chegou: ' + (await page.evaluate(() => document.getElementById('avisoSalvamento')?.innerText || '')));
      ops.push(o);
    }
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    const app = getApps().find(x => x.name === 'ensaio-j78') || initializeApp({ projectId: PROJETO }, 'ensaio-j78');
    const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
    await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    // 1) o que o Chris vê em cada pedido
    const ler = async (q = 'Chris') => (await chamar(q, 'ajuste_calendario_ler_cp112')).ajustes.filter(x => ops.includes(x.operationId));
    let lista = await ler();
    const passo = a => a.capacidades?.iniciarCorrecao ? 'iniciar correção' : a.capacidades?.salvarConteudo ? 'salvar conteúdo' : (a.correcao?.motivo || '(sem motivo)');
    const sem = lista.filter(a => !a.capacidades?.iniciarCorrecao && !a.capacidades?.salvarConteudo && /precisam de conferência/.test(a.correcao?.motivo || ''));
    fim('1 cada pedido do cliente tem um próximo passo (processo antigo, 2 pedidos)', lista.length === 2 && !sem.length, lista.map(a => a.titulo.slice(0, 30) + ': ' + passo(a).slice(0, 110)).join(' | '));
    // 2) o Chris segue o próximo passo de cada um, corrige, explica e envia
    for (let volta = 0; volta < 4; volta++) {
      lista = await ler(); const a = lista.find(x => x.capacidades?.iniciarCorrecao || x.capacidades?.salvarConteudo && x.correcao?.item?.desc !== 'Corrigido (J78) — ' + x.itemId);
      if (!a) break;
      let r = a;
      if (r.capacidades.iniciarCorrecao) r = (await chamar('Chris', 'ajuste_calendario_iniciar_correcao_cp115', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura })).ajustes.find(x => x.demandaId === a.demandaId);
      r = (await chamar('Chris', 'ajuste_calendario_salvar_conteudo_cp115', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura, conteudo: { desc: 'Corrigido (J78) — ' + r.itemId } })).ajustes.find(x => x.demandaId === a.demandaId);
      r = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura, justificativa: 'Ajustado como pedido.', execucao: 'Roteiro trocado.', dependencia: '' })).ajustes.find(x => x.demandaId === a.demandaId);
      await chamar('Chris', 'ajuste_calendario_enviar_cp112', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura });
    }
    lista = await ler();
    fim('2 o Chris corrige e envia os dois pedidos', lista.every(a => a.status === 'enviado'), lista.map(a => a.titulo.slice(0, 30) + ': ' + a.status + (a.status === 'enviado' ? '' : ' · ' + passo(a).slice(0, 110))).join(' | ') + ' · ' + etapas.slice(-6).join(' → '));
    if (!lista.every(a => a.status === 'enviado')) return;
    // 3) a Amanda aprova os dois e uma liberação leva os dois
    for (const o of ops) { const a = (await ler('Amanda')).find(x => x.operationId === o); await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, decisao: 'aprovar', motivo: '' }); }
    let d = await chamar('Amanda', 'central_editor_ler');
    if (!d.capacidades?.decidir) { fim('3 uma liberação leva os dois pedidos', false, 'liberação indisponível: ' + JSON.stringify(d.ajustesCp112?.liberacaoMensal || d.capacidades).slice(0, 300)); return; }
    await chamar('Amanda', 'central_editor_decidir', { operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const m = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES], itens = m.retratoLiberadoV115?.items || [];
    const ambos = ['calitem_j78_vitrine', 'calitem_j78_dica'].every(k => /Corrigido \(J78\)/.test(itens.find(i => i.itemId === k)?.desc || ''));
    fim('3 uma liberação leva os dois pedidos', m.status === 'liberado' && ambos && !erros.filter(erroGrave).filter(e => !/400 \(Bad Request\)|V113/.test(String(e))).length, `mês ${m.status} · dois corrigidos no retrato: ${ambos}`);
    // 4) célula 6 da matriz: com um pedido do cliente aberto, o Chris abre a revisão do mês inteiro (sem escopo CP115). O pedido
    // continua com próximo passo e o mês inteiro não pode ser enviado (nem devolvido) por cima dele: a célula 6 não se forma.
    const r4 = []; let ok4 = false;
    try {
      const pedir = async (itemId, nomeItem, marca) => {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê|Calendário em revisão|Em ajuste/.test(document.body.innerText), null, { timeout: 30000 }); await page.waitForTimeout(1500);
        await page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } if (document.getElementById('mName')?.value === nome) return i; closeModal(); } return -1; }, nomeItem);
        if (!await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) return 'sem campo: ' + (await page.evaluate(() => document.getElementById('avisoSalvamento')?.innerText || ''));
        await page.fill('#mObsCliente', `Pedido ${marca} do cliente em ${nomeItem}.`); await page.click('#btnEnviarObsCliente');
        const o = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === itemId && x.texto.includes(marca))?.operationId; }, 15000);
        await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
        return o || 'recusado: ' + (await page.evaluate(() => document.getElementById('avisoSalvamento')?.innerText || ''));
      };
      const o1 = await pedir('calitem_j78_vitrine', 'Hitech — Reels da vitrine (J78)', 'R2'); r4.push('pedido R2 ' + (o1.startsWith('cal_') ? 'ok' : o1));
      let d4 = await chamar('Chris', 'central_editor_ler'); r4.push('iniciar ' + (d4.capacidades?.iniciar ? 'disponível' : 'indisponível'));
      d4 = await chamar('Chris', 'central_editor_iniciar', { operacao: op(), esperadaRevisao: d4.ciclo.revisao, pecas: [], confirmarDelta: false });
      d4 = await chamar('Chris', 'central_editor_ler');
      d4 = await chamar('Chris', 'central_editor_salvar', { operacao: op(), assinaturaEsperada: d4.assinatura, itens: [{ itemId: 'calitem_j78_vitrine', mes: MES, desc: 'Revisão inteira (J78 R2).' }], excluirIds: [], blocos: null });
      const a2 = (await chamar('Chris', 'ajuste_calendario_ler_cp112')).ajustes.find(x => x.operationId === o1);
      r4.push('R2 → ' + (a2 ? passo(a2).slice(0, 120) : 'não listado'));
      d4 = await chamar('Chris', 'central_editor_ler');
      let recusa = '';
      try { await chamar('Chris', 'central_editor_enviar_revisao', { operacao: op(), assinaturaEsperada: d4.assinatura, esperadaRevisao: d4.ciclo.revisao }); } catch (e) { recusa = String(e.message || e); }
      r4.push('enviar o mês inteiro: ' + (recusa ? 'recusado ("' + recusa.replace(/^[^:]*: /, '').slice(0, 90) + '")' : 'ACEITO'));
      ok4 = !!a2 && !/precisam de conferência/.test(passo(a2)) && /Abra cada pedido/.test(recusa);
    } catch (e) { r4.push('PAROU: ' + String(e).replace(/\s+/g, ' ').slice(0, 220)); }
    fim('4 revisão inteira aberta com pedido do cliente: o pedido tem próximo passo e o mês inteiro não sai por cima dele (célula 6)', ok4, r4.join(' · ') + ' · ' + etapas.slice(-6).join(' → '));
  } catch (e) { await foto(page, 'J78-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
  finally { await fechar(); }
}
