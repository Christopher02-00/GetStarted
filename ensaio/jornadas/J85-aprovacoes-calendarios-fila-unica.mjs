// J85 — CP232 (19/11/2026, Amanda: "Não recebi os ajustes da Juliane"; Cookiery/Fedalto "aprovei e não libera"): a aba
// Calendários de Aprovações listava só ajustes internos; pedidos do cliente (CP112) aguardando a Amanda não apareciam, e o
// motivo da liberação travada só estava na tela do calendário. Cenário próprio: Hitech, jul/2027, processo antigo, 3 pedidos.
//  1. Amanda abre Aprovações → Calendários: os 3 pedidos aparecem (título atual) e o contador soma os 3.
//  2. Ela devolve 1 e aprova 2 (mesmas ações do calendário): o devolvido aparece "Com o Chris · refazer"; o botão de liberar
//     aparece desativado com o motivo ("Falta: dia …, com o Chris").
//  3. O Chris refaz e envia; ela aprova: o botão de liberar fica ativo.
//  4. Contraprova: a Cecília não vê a fila nem os botões.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { foto, entrarComo } from '../lib/navegador.mjs';
export const id = 'J85';
export const nome = 'Aba Calendários de Aprovações: pedidos do cliente e ajustes internos numa fila só, com o que trava a liberação';
const CLIENTE = 'hitech', MES = '2027-07', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const NOVA_DESC = 'Roteiro da vitrine corrigido conforme o pedido do cliente (J85).';
const PECA = { day: 28, fmt: 'Carrossel', stage: 'Topo', name: 'Ensaio J71 — Black Friday na loja', ref: '', referenciaDispensada: true,
  desc: 'Slide 1: é oficial, a Black Friday chegou. Slides 2 a 5: ofertas. Slide 6: Centro de Campo Largo, do lado da Matriz.', legenda: 'A Black Friday chegou. (J85)', obs: 'Fotos reais da loja.', preparacaoGravacao: '' };
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
  let n = 0; const op = () => 'ensaio_j85_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ciclo: CICLO, origemEditorial: 'continuar_legado', ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j85_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?|^ajuste_calendario_/, '').replace(/_cp1\d\d$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  // monta o mês publicado em `publicadoEm`; com `registro`, como publicação feita pela Central (histórico + recibo I172)
  const publicar = async (publicadoEm, alterar = {}, registro = null) => {
    const cal0 = (await seed.get('calendarios', CLIENTE)) || {}; const { id: _x, ...semId } = cal0;
    const outros = (cal0.items || []).filter(i => i?.mes !== MES);
    const base = [
      { itemId: 'calitem_j85_vitrine', mes: MES, day: 26, name: 'Hitech — Reels da vitrine (J85)', desc: 'Roteiro original da vitrine.', legenda: 'Legenda da vitrine J85.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: false },
      { itemId: 'calitem_j85_dica', mes: MES, day: 20, name: 'Hitech — Dica do técnico (J85)', desc: 'Roteiro original da dica.', legenda: 'Legenda da dica J85.', obs: '', fmt: 'Reel', stage: 'Meio', ref: '', excluido: false, apr: false },
      { itemId: 'calitem_j85_promo', mes: MES, day: 23, name: 'Hitech — Promoção de julho (J85)', desc: 'Roteiro original da promoção.', legenda: 'Legenda da promoção J85.', obs: '', fmt: 'Reel', stage: 'Fundo', ref: '', excluido: false, apr: false },
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
    await publicar('2026-11-05T12:00:00.000Z', {}, { uid: amanda.uid, operacao: 'ensaio_j85_pub_p1' });
    const copia = await esperar(async () => { const c = await seed.get('calendarios_cliente', CLIENTE); return c?.items?.some(i => i?.itemId === 'calitem_j85_vitrine') ? c : null; });
    if (!copia) throw new Error('a cópia do cliente não recebeu o mês');
    const url = amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), ops = [];
    for (const [itemId, nomeItem] of [['calitem_j85_vitrine', 'Hitech — Reels da vitrine (J85)'], ['calitem_j85_dica', 'Hitech — Dica do técnico (J85)'], ['calitem_j85_promo', 'Hitech — Promoção de julho (J85)']]) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê|Calendário em revisão|Em ajuste/.test(document.body.innerText), null, { timeout: 30000 }); await page.waitForTimeout(1500);
      const k = await page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } if (document.getElementById('mName')?.value === nome) return i; closeModal(); } return -1; }, nomeItem);
      if (k < 0) throw new Error('a página do cliente não mostra ' + nomeItem);
      await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 });
      await page.fill('#mObsCliente', `Pedido do cliente (J85) em ${nomeItem}.`); await page.click('#btnEnviarObsCliente');
      const o = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === itemId && /J85/.test(x.texto || ''))?.operationId; });
      if (!o) throw new Error('o pedido em ' + nomeItem + ' não chegou: ' + (await page.evaluate(() => document.getElementById('avisoSalvamento')?.innerText || '')));
      ops.push(o);
    }
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    const app = getApps().find(x => x.name === 'ensaio-j85') || initializeApp({ projectId: PROJETO }, 'ensaio-j85');
    const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
    await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    // 1) o que o Chris vê em cada pedido
    const ler = async (q = 'Chris') => (await chamar(q, 'ajuste_calendario_ler_cp112')).ajustes.filter(x => ops.includes(x.operationId));
    let lista = await ler();
    const passo = a => a.capacidades?.iniciarCorrecao ? 'iniciar correção' : a.capacidades?.salvarConteudo ? 'salvar conteúdo' : (a.correcao?.motivo || '(sem motivo)');
    const sem = lista.filter(a => !a.capacidades?.iniciarCorrecao && !a.capacidades?.salvarConteudo && /precisam de conferência/.test(a.correcao?.motivo || ''));
    if (lista.length !== 3 || sem.length) fim('preparação: 3 pedidos com próximo passo', false, lista.map(a => a.titulo.slice(0, 30) + ': ' + passo(a).slice(0, 110)).join(' | '));
    // 2) o Chris segue o próximo passo de cada um, corrige, explica e envia
    for (let volta = 0; volta < 6; volta++) {
      lista = await ler(); const a = lista.find(x => x.capacidades?.iniciarCorrecao || x.capacidades?.salvarConteudo && x.correcao?.item?.desc !== 'Corrigido (J85) — ' + x.itemId);
      if (!a) break;
      let r = a;
      if (r.capacidades.iniciarCorrecao) r = (await chamar('Chris', 'ajuste_calendario_iniciar_correcao_cp115', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura })).ajustes.find(x => x.demandaId === a.demandaId);
      r = (await chamar('Chris', 'ajuste_calendario_salvar_conteudo_cp115', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura, conteudo: { desc: 'Corrigido (J85) — ' + r.itemId } })).ajustes.find(x => x.demandaId === a.demandaId);
      r = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura, justificativa: 'Ajustado como pedido.', execucao: 'Roteiro trocado.', dependencia: '' })).ajustes.find(x => x.demandaId === a.demandaId);
      await chamar('Chris', 'ajuste_calendario_enviar_cp112', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura });
    }
    lista = await ler();
    if (!lista.every(a => a.status === 'enviado')) fim('preparação: o Chris envia os 3 pedidos', false, lista.map(a => a.titulo.slice(0, 30) + ': ' + a.status + (a.status === 'enviado' ? '' : ' · ' + passo(a).slice(0, 110))).join(' | ') + ' · ' + etapas.slice(-6).join(' → '));
    if (!lista.every(a => a.status === 'enviado')) return;
    // Tela da Amanda: Aprovações → Calendários
    const abaCalendarios = async (pessoa) => {
      const pg = await nav.novaPagina(); pg.page.on('dialog', d => d.accept());
      await entrarComo(pg.page, amb.url(), pessoa); await pg.page.waitForTimeout(2500);
      await pg.page.evaluate(() => { window.irParaAprovacoes?.(); }); await pg.page.waitForTimeout(1500);
      await pg.page.evaluate(() => window.filtrarAprovacoes?.('calendarios'));
      await pg.page.waitForFunction(() => !document.querySelector('[data-fila-interna-cp123][role="status"]'), null, { timeout: 20000 }).catch(() => {});
      await pg.page.waitForTimeout(2500);
      const r = await pg.page.evaluate(ciclo => { const g = document.querySelector(`[data-grupo-revisao-cp145="${ciclo}"]`);
        const chipCal = [...document.querySelectorAll('button')].find(b => /Calendários/.test(b.textContent) && b.getAttribute('onclick')?.includes("filtrarAprovacoes('calendarios')"));
        const pedidos = g ? [...g.querySelectorAll('[data-pedido-fila-cp232]')].map(a => a.innerText.replace(/\s+/g, ' ')) : [];
        const bloq = g?.querySelector('[data-liberar-bloqueado-cp232]'); const lib = g ? [...g.querySelectorAll('[data-liberacao-cp160]')].find(b => !b.disabled) : null;
        return { grupo: !!g, pedidos, chip: chipCal?.innerText.replace(/\s+/g, ' ') || '', bloqueado: bloq ? { disabled: bloq.disabled, txt: bloq.innerText } : null, liberarAtivo: !!lib,
          diag: g?.querySelector('[data-por-que-nao-libera-cp232]')?.innerText.replace(/\s+/g, ' ') || '', fila: !!document.querySelector('[data-fila-interna-cp123]') }; }, CICLO);
      await foto(pg.page, `J85-${pessoa}-aba-calendarios`); const graves = pg.erros.filter(erroGrave); await pg.fechar(); return { ...r, graves };
    };
    let t = await abaCalendarios('Amanda');
    const nChip = Number((t.chip.match(/(\d+)/) || [])[1] || 0);
    fim('1 Amanda: os 3 pedidos do cliente aparecem na aba Calendários (título atual) e o contador soma os 3', t.pedidos.length === 3 && t.pedidos.every(x => /Hitech — .*\(J85\)/.test(x) && /Amanda · revisar/.test(x)) && nChip >= 3 && !t.graves.length,
      `grupo ${t.grupo ? 'sim' : 'NÃO'} · ${t.pedidos.length} pedido(s) · contador "${t.chip}"` + (t.graves.length ? ' | ' + t.graves[0].slice(0, 160) : ''));
    // 2) devolve 1, aprova 2
    const doAmanda = async () => (await chamar('Amanda', 'ajuste_calendario_ler_cp112')).ajustes.filter(x => ops.includes(x.operationId));
    let la = await doAmanda(); const dev = la.find(a => a.itemId === 'calitem_j85_promo');
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { demandaId: dev.demandaId, operacao: op(), assinaturaEsperada: dev.assinatura, decisao: 'devolver', motivo: 'Trocar o preço da promoção (J85).' });
    for (const a of (await doAmanda()).filter(x => x.status === 'enviado')) await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, decisao: 'aprovar', motivo: '' });
    t = await abaCalendarios('Amanda');
    const devTxt = t.pedidos.find(x => /Promoção de julho/.test(x)) || '';
    fim('2 devolvido aparece "Com o Chris · refazer" e o botão de liberar fica desativado com o motivo', /Com o Chris · refazer/.test(devTxt) && t.bloqueado?.disabled === true && /dia 23.*com o Chris/.test(t.bloqueado.txt) && /Falta: dia 23/.test(t.diag),
      `devolvido: ${devTxt.slice(0, 90) || '(não listado)'} · botão ${t.bloqueado ? (t.bloqueado.disabled ? 'desativado' : 'ATIVO') + ': ' + t.bloqueado.txt.slice(0, 120) : 'AUSENTE'} · diag: ${t.diag.slice(0, 160)}`);
    // 3) Chris refaz e envia; Amanda aprova → libera
    for (let volta = 0; volta < 3; volta++) { const a = (await ler()).find(x => x.itemId === 'calitem_j85_promo'); if (!a || a.status === 'enviado') break; let r = a;
      if (r.capacidades.iniciarCorrecao) r = (await chamar('Chris', 'ajuste_calendario_iniciar_correcao_cp115', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura })).ajustes.find(x => x.demandaId === a.demandaId);
      if (r.capacidades.salvarConteudo) r = (await chamar('Chris', 'ajuste_calendario_salvar_conteudo_cp115', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura, conteudo: { desc: 'Corrigido de novo (J85) — preço novo' } })).ajustes.find(x => x.demandaId === a.demandaId);
      r = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura, justificativa: 'Preço trocado.', execucao: 'Roteiro com o preço novo.', dependencia: '' })).ajustes.find(x => x.demandaId === a.demandaId);
      await chamar('Chris', 'ajuste_calendario_enviar_cp112', { demandaId: r.demandaId, operacao: op(), assinaturaEsperada: r.assinatura }); }
    const a3 = (await doAmanda()).find(x => x.itemId === 'calitem_j85_promo');
    if (a3?.status === 'enviado') await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { demandaId: a3.demandaId, operacao: op(), assinaturaEsperada: a3.assinatura, decisao: 'aprovar', motivo: '' });
    t = await abaCalendarios('Amanda');
    fim('3 tudo aprovado: o botão de liberar fica ativo na aba', t.liberarAtivo && !t.bloqueado, `liberar ${t.liberarAtivo ? 'ativo' : 'INATIVO'} · bloqueio ${t.bloqueado ? t.bloqueado.txt.slice(0, 100) : 'nenhum'} · pedidos ${t.pedidos.length}`);
    // 4) contraprova: Cecília
    const c4 = await abaCalendarios('Cecília');
    fim('4 contraprova: a Cecília não vê a fila nem os botões', !c4.grupo && !c4.pedidos.length && !c4.liberarAtivo, `grupo ${c4.grupo ? 'VISÍVEL' : 'não'} · fila ${c4.fila ? 'VISÍVEL' : 'não'}`);
  } catch (e) { await foto(page, 'J85-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.slice(-6).join(' → ')); }
  finally { await fechar(); }
}
