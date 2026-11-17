// J71 — CP216 (16/11/2026, Place 2026-11): pedido do cliente em correção individual (CP115) e peça adicional CP142 feita antes da
// última publicação, no MESMO mês da continuidade antiga. Antes: a base dos ajustes internos exigia o mês publicado e sem escopo CP115
// → peça "A publicação deste mês mudou…", sem "Trazer para a versão atual", sem aprovação da Amanda, liberação bloqueada.
// Cenário (Hitech, abr/2027; a J75 usa mar/2027, ninguém mais usa abril): P1 → peça enviada sobre P1 → P2 registrada pela Central (recibo I172) →
// cliente pede ajuste pelo link → Chris corrige (CP115) e envia à Amanda. Esperado: a peça vem para a versão atual com o MESMO texto,
// a Amanda aprova o pedido e a peça, e UMA liberação leva os dois.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { foto } from '../lib/navegador.mjs';
export const id = 'J71';
export const nome = 'Pedido em correção individual (CP115) e peça adicional antiga no mesmo mês saem numa liberação só';
const CLIENTE = 'hitech', MES = '2027-04', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const NOVA_DESC = 'Roteiro da vitrine corrigido conforme o pedido do cliente (J71).';
const PECA = { day: 28, fmt: 'Carrossel', stage: 'Topo', name: 'Ensaio J71 — Black Friday na loja', ref: '', referenciaDispensada: true,
  desc: 'Slide 1: é oficial, a Black Friday chegou. Slides 2 a 5: ofertas. Slide 6: Centro de Campo Largo, do lado da Matriz.', legenda: 'A Black Friday chegou. (J71)', obs: 'Fotos reais da loja.', preparacaoGravacao: '' };
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
  let n = 0; const op = () => 'ensaio_j71_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ciclo: CICLO, origemEditorial: 'continuar_legado', ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j71_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?|^ajuste_calendario_/, '').replace(/_cp1\d\d$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  // monta o mês publicado em `publicadoEm`; com `registro`, como publicação feita pela Central (histórico + recibo I172)
  const publicar = async (publicadoEm, alterar = {}, registro = null) => {
    const cal0 = (await seed.get('calendarios', CLIENTE)) || {}; const { id: _x, ...semId } = cal0;
    const outros = (cal0.items || []).filter(i => i?.mes !== MES);
    const base = [
      { itemId: 'calitem_j71_vitrine', mes: MES, day: 26, name: 'Hitech — Reels da vitrine (J71)', desc: 'Roteiro original da vitrine.', legenda: 'Legenda da vitrine J71.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: false },
      { itemId: 'calitem_j71_dica', mes: MES, day: 20, name: 'Hitech — Dica do técnico (J71)', desc: 'Roteiro original da dica.', legenda: 'Legenda da dica J71.', obs: '', fmt: 'Reel', stage: 'Meio', ref: '', excluido: false, apr: false },
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
    // (b) peça adicional enviada sobre P1
    await publicar('2026-10-20T12:00:00.000Z');
    let d = await chamar('Chris', 'central_editor_ler');
    const itemId = 'adicional_cp142_' + [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { operacao: op(), assinaturaEsperada: d.assinatura, itemId, motivo: 'Carrossel da Black Friday (J71).', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
    let a = d.internosCp123.ajustes.find(x => x.itemId === itemId);
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, conteudo: PECA });
    a = d.internosCp123.ajustes.find(x => x.id === a.id);
    await chamar('Chris', 'central_editor_interno_enviar_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    // P2 registrada pela Central (outro roteiro na dica) → a peça fica sobre a publicação anterior
    const amanda = await entrar('Amanda');
    await publicar('2026-11-05T12:00:00.000Z', { calitem_j71_dica: { desc: 'Roteiro da dica revisado na publicação P2.' } }, { uid: amanda.uid, operacao: 'ensaio_j71_pub_p2' });

    // (a) cliente pede ajuste pelo link → recepção → Chris corrige o conteúdo (CP115) e envia à Amanda
    const copia = await esperar(async () => { const c = await seed.get('calendarios_cliente', CLIENTE); return c?.items?.some(i => i?.itemId === 'calitem_j71_vitrine') ? c : null; });
    if (!copia) throw new Error('a cópia do cliente não recebeu o mês');
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    // mesma espera da J56/J60B: a página do cliente usa a cópia do cliente (calendarios_cliente), de onde vem o índice
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText) && typeof openEdit === 'function', null, { timeout: 30000 });
    // o índice é o da lista da página (outros meses do cliente mudam a posição na bateria inteira), achado pelo itemId
    // `data` é interno do módulo da página: acha o índice abrindo cada conteúdo e lendo o nome no editor
    const idxPagina = await page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } const achou = document.getElementById('mName')?.value === nome; closeModal(); if (achou) return i; } return -1; }, 'Hitech — Reels da vitrine (J71)');
    if (idxPagina < 0) throw new Error('a página do cliente não mostra o conteúdo da vitrine');
    await page.evaluate(i => openEdit(i), idxPagina);
    await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 });
    await page.fill('#mObsCliente', 'Pedido do cliente (J71): trocar o roteiro da vitrine.');
    await page.click('#btnEnviarObsCliente');
    const pedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return c?.aprovacaoMeses?.[MES]?.status === 'ajuste_interno' && c.aprovacaoMeses[MES].por === 'Cliente' ? c.aprovacaoMeses[MES].pedidoAjusteOperationId : null; });
    if (!pedido) throw new Error('o pedido do cliente não chegou ao calendário');
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    const app = getApps().find(x => x.name === 'ensaio-j71') || initializeApp({ projectId: PROJETO }, 'ensaio-j71');
    const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
    const rec = await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    if ((rec.erros || []).some(x => x.origem === pedido)) throw new Error('recepção recusou o pedido: ' + JSON.stringify(rec.erros));
    const acharPa = r => r.ajustes.find(x => x.operationId === pedido);
    let pa = acharPa(await chamar('Chris', 'ajuste_calendario_ler_cp112'));
    if (!pa?.capacidades?.iniciarCorrecao) throw new Error('correção individual indisponível: ' + (pa?.correcao?.motivo || 'pedido não listado'));
    pa = acharPa(await chamar('Chris', 'ajuste_calendario_iniciar_correcao_cp115', { demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura }));
    pa = acharPa(await chamar('Chris', 'ajuste_calendario_salvar_conteudo_cp115', { demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, conteudo: { desc: NOVA_DESC } }));
    pa = acharPa(await chamar('Chris', 'ajuste_calendario_salvar_cp112', { demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, justificativa: 'Roteiro da vitrine trocado.', execucao: 'Roteiro reescrito.', dependencia: '' }));
    await chamar('Chris', 'ajuste_calendario_enviar_cp112', { demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura });
    const cont = await seed.get('continuidade_calendarios_i164', CICLO);
    if (!cont?.editorialI172?.correcaoIndividualCp115) throw new Error('a correção individual CP115 não ficou registrada (fase ' + cont?.editorialI172?.fase + ')');

    // 1) com o pedido em correção individual, a peça antiga oferece "trazer para a versão atual" e a tela diz quem faz o quê
    d = await chamar('Amanda', 'central_editor_ler');
    a = d.internosCp123.ajustes.find(x => x.itemId === itemId);
    const quem = (d.internosCp123.motivos || []).join(' | ');
    fim('1 com o pedido em correção individual, a peça antiga oferece "trazer para a versão atual" e diz quem faz o quê', !!a?.rebaseCp215?.disponivel && /traga o ajuste interno/.test(quem) && !/outra versão editorial/.test(quem),
      a ? `trazer ${a.rebaseCp215?.disponivel ? 'disponível' : 'INDISPONÍVEL'} · motivos: ${quem.slice(0, 240) || '(nenhum)'}` : 'peça não listada');
    if (!a?.rebaseCp215?.disponivel) return;
    // 2) trazer (Amanda), enviar (Chris), aprovar (Amanda) — mesmo texto
    d = await chamar('Amanda', 'central_editor_interno_rebase_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    const novo = d.internosCp123.ajustes.find(x => x.itemId === itemId);
    const mesmoTexto = novo?.estado === 'rascunho' && ['name', 'desc', 'legenda', 'obs'].every(k => novo?.conteudo?.[k] === PECA[k]);
    await chamar('Chris', 'central_editor_interno_enviar_cp123', { operacao: op(), assinaturaEsperada: novo.assinatura, ajusteId: novo.id });
    d = await chamar('Amanda', 'central_editor_ler'); let nv = d.internosCp123.ajustes.find(x => x.id === novo.id);
    const podeAprovar = nv?.capacidades?.aprovar === true;
    if (podeAprovar) d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: nv.assinatura, ajusteId: nv.id, decisao: 'aprovar', motivo: '' });
    nv = d.internosCp123.ajustes.find(x => x.id === novo.id);
    fim('2 peça trazida com o mesmo texto, enviada e aprovada pela Amanda', mesmoTexto && nv?.estado === 'aprovado', `texto ${mesmoTexto ? 'mantido (rascunho)' : 'PERDIDO'} · aprovar ${podeAprovar ? 'disponível' : 'INDISPONÍVEL'} · estado ${nv?.estado}`);
    // 3) Amanda aprova o pedido; UMA liberação leva o pedido corrigido e a peça
    pa = acharPa(await chamar('Amanda', 'ajuste_calendario_ler_cp112'));
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'aprovar', motivo: '' });
    d = await chamar('Amanda', 'central_editor_ler');
    if (!(d.internosCp123?.disponivel === true && d.capacidades?.decidir)) { fim('3 uma liberação leva o pedido corrigido e a peça', false, 'liberação indisponível: ' + JSON.stringify({ decidir: d.capacidades?.decidir, internos: d.internosCp123?.motivos, pedidos: d.ajustesCp112?.motivos }).slice(0, 300)); return; }
    await chamar('Amanda', 'central_editor_decidir', { operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const c3 = await seed.get('calendarios', CLIENTE), m = c3.aprovacaoMeses[MES], itens = m.retratoLiberadoV115?.items || [];
    const comPedido = itens.find(i => i.itemId === 'calitem_j71_vitrine')?.desc === NOVA_DESC, comPeca = itens.some(i => i.itemId === itemId && i.name === PECA.name && i.desc === PECA.desc);
    const c4 = await seed.get('continuidade_calendarios_i164', CICLO), escopoLimpo = !c4?.editorialI172?.correcaoIndividualCp115 && c4?.editorialI172?.fase === 'publicada';
    fim('3 uma liberação leva o pedido corrigido e a peça', m.status === 'liberado' && comPedido && comPeca && escopoLimpo && !erros.filter(erroGrave).length,
      `mês ${m.status} · pedido ${comPedido ? 'liberado' : 'FORA'} · peça ${comPeca ? 'liberada' : 'FORA'} · continuidade ${c4?.editorialI172?.fase}${escopoLimpo ? '' : ' (escopo CP115 SOBROU)'} · ${etapas.slice(-4).join(' → ')}`);
  } catch (e) { await foto(page, 'J71-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
  finally { await fechar(); }
}
