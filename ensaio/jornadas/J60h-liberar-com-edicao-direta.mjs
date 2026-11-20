// J91 (arquivo J60h) — CP238 (20/11/2026, Fedalto e Stokki 2026-12): no mês já publicado e reaberto por pedido do cliente,
// o Chris corrigiu o pedido no editor e, no mesmo editor ("Salvar conteúdos"), mudou o texto de outro conteúdo, retirou um
// conteúdo e incluiu um conteúdo novo. A Amanda aprovou, mas a liberação recusava para sempre ("O conteúdo do mês mudou depois
// da publicação" / "outra versão editorial ainda não reconciliada") e o envio do mês inteiro ficava travado pelo pedido:
// ninguém liberava. Caso real lido em produção (somente leitura, exportação de 20/11 11:54): Fedalto 2026-12 (pedidos + ajustes
// internos aprovados + 2 retirados e 1 texto mudado no editor) e Stokki 2026-12 (pedido + 1 conteúdo novo no editor).
// Necessidade (áudio da Amanda, 20/11): "tudo aprovado → checklist → liberar → aviso verde → o cliente vê → sai das demandas".
// Rodada A = Stokki (só pedido → "Liberar correções ao cliente"); rodada B = Fedalto (pedido + peça CP142 aprovada →
// "Liberar ajustes internos ao cliente"). Em cada rodada:
//  1. Com tudo aprovado e as edições diretas, a liberação fica disponível e lista as 3 mudanças feitas direto no editor.
//  2. O servidor recusa liberar sem a conferência dessas mudanças (tela antiga não publica às cegas).
//  3. Tela da Amanda (Aprovações → Calendários → "Conferir e liberar"): botão de liberar, checklist com as 3 mudanças; sem
//     marcar não libera; marcando, libera.
//  4. O cliente recebe tudo: correção do pedido, texto mudado, conteúdo novo (e a peça, na B); o retirado some do link.
//  5. O mês sai da fila de liberação da Amanda.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { createRequire } from 'node:module';
import { entrarComo, entrarGerencia, foto } from '../lib/navegador.mjs';
export const id = 'J91';
export const nome = 'Mês publicado com pedido do cliente e edições diretas no editor: a Amanda confere as mudanças no checklist e libera tudo ao cliente (Stokki e Fedalto)';
const CLIENTE = 'bluefit', NOME = 'Bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const hex = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');

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
  const op = () => 'ensaio_j91_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j91_' + pessoa } }) });
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
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06/J56/J60–J60g (dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
  const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  const app = getApps().find(a => a.name === 'ensaio-j91') || initializeApp({ projectId: PROJETO }, 'ensaio-j91');
  const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);

  async function rodada(tag, comPeca) {
    const NOVO_TITULO = `Ensaio J91${tag} — Conteúdo novo pelo editor`, TEXTO_DIRETO = `Texto mudado direto no editor (J91${tag}).`, CORRECAO = `Correção do pedido (J91${tag}) — versão final`, PECA = `Ensaio J91${tag} — Peça adicional aprovada`;
    const caso = (k, txt, ok, det) => fim(`${tag}${k} ${txt}`, ok, det);
    const cal = await seed.get('calendarios', CLIENTE), ret0 = cal.aprovacaoMeses[MES].retratoLiberadoV115?.items || [];
    if (cal.aprovacaoMeses[MES].status !== 'liberado') { caso(0, 'preparação', false, 'o mês não está liberado: ' + cal.aprovacaoMeses[MES].status); return false; }
    // Três conteúdos livres e publicados: um recebe o pedido do cliente, um muda de texto, um é retirado.
    const livres = (cal.items || []).filter(livre).filter(i => ret0.some(x => x.itemId === i.itemId && !x.excluido));
    const comPedido = new Set(Object.values(cal.pedidosAjusteClienteI71 || {}).filter(x => x.competencia === MES).map(x => x.itemId));
    const ordem = [...livres.filter(i => !comPedido.has(i.itemId)), ...livres.filter(i => comPedido.has(i.itemId))];
    if (ordem.length < 3) { caso(0, 'preparação', false, `o mês precisa de 3 conteúdos livres publicados; tem ${ordem.length}`); return false; }
    const [alvoPedido, alvoTexto, alvoRetirar] = ordem;

    // Pedido do cliente pela tela real do link.
    let opPedido = null;
    { const cli = await nav.novaPagina();
      try { await cli.page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
        await cli.page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê|Em ajuste|Calendário em revisão/.test(document.body.innerText), null, { timeout: 30000 }); await cli.page.waitForTimeout(1500);
        const k = await cli.page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } if (document.getElementById('mName')?.value === nome) return i; try { closeModal(); } catch {} } return -1; }, alvoPedido.name);
        if (k < 0) throw new Error('o cliente não vê o conteúdo do pedido');
        await cli.page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 }); await cli.page.fill('#mObsCliente', `Pedido do cliente (J91${tag}): trocar a abertura.`); await cli.page.click('#btnEnviarObsCliente');
        opPedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === alvoPedido.itemId && (x.texto || '').includes(`J91${tag}`))?.operationId; });
      } finally { await cli.fechar(); } }
    if (!opPedido) throw new Error('o pedido do cliente não chegou');
    await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    const lerP = async (q = 'Chris') => (await chamar(q, 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === opPedido);

    // Chris no editor ("Salvar conteúdos"): corrige o pedido e, na mesma edição, muda outro texto, retira um conteúdo e inclui um novo.
    const novoId = 'ed_' + hex();
    const de = await ler('Chris');
    await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: de.assinatura, itens: [
      { itemId: alvoPedido.itemId, mes: MES, desc: CORRECAO },
      { itemId: alvoTexto.itemId, mes: MES, desc: TEXTO_DIRETO },
      { itemId: novoId, mes: MES, day: 24, name: NOVO_TITULO, desc: `Roteiro do conteúdo novo (J91${tag}).`, legenda: `Legenda do conteúdo novo da J91${tag} com texto completo.`, obs: '', preparacaoGravacao: '', fmt: 'Reel', stage: 'topo', empresaOtavio: '', roteiroDispensado: false, referenciaDispensada: true, dataFlexivel: false }
    ], excluirIds: [alvoRetirar.itemId], blocos: null });
    let a = await lerP();
    a = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, justificativa: 'Abertura trocada.', execucao: 'Abertura trocada no roteiro.', dependencia: '' })).ajustes.find(x => x.operationId === opPedido);
    await chamar('Chris', 'ajuste_calendario_enviar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura });
    const pa = await lerP('Amanda');
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'aprovar', motivo: '' });

    // Rodada B (Fedalto): também uma peça adicional pelo caminho dos ajustes internos, aprovada pela Amanda.
    let pecaId = null;
    if (comPeca) {
      let d = await ler('Chris'); pecaId = 'adicional_cp142_' + hex();
      d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itemId: pecaId, motivo: 'Peça adicional da J91.', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
      let x = d.internosCp123.ajustes.find(r => r.itemId === pecaId);
      d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, conteudo: { day: 20, fmt: 'Reel', stage: 'Topo', name: PECA, ref: '', referenciaDispensada: true, desc: 'Roteiro da peça adicional da J91.', legenda: 'Legenda da peça adicional da J91.', obs: 'Imagens reais.', preparacaoGravacao: '' } });
      x = d.internosCp123.ajustes.find(r => r.id === x.id); d = await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id });
      d = await ler('Amanda'); x = d.internosCp123.ajustes.find(r => r.id === x.id);
      await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, decisao: 'aprovar', motivo: '' });
    }

    // 1) servidor: liberação disponível e lista as mudanças diretas (sem o pedido e sem a peça, que têm registro aprovado)
    let d = await ler('Amanda');
    const caminho = comPeca ? d.internosCp123 : d.reliberacaoCp121, diretas = d.mudancasDiretasCp238 || [];
    const tipos = Object.fromEntries(diretas.map(x => [x.itemId, x.tipo]));
    const ok1 = caminho?.disponivel === true && tipos[novoId] === 'novo' && tipos[alvoRetirar.itemId] === 'retirado' && tipos[alvoTexto.itemId] === 'alterado' && !tipos[alvoPedido.itemId] && (!pecaId || !tipos[pecaId]) && diretas.length === 3 && /^[a-f0-9]{64}$/.test(d.assinaturaMudancasDiretasCp238 || '');
    caso(1, 'com tudo aprovado e edições diretas, a liberação fica disponível e lista as mudanças', ok1,
      `${comPeca ? 'ajustes internos' : 'correções'} ${caminho?.disponivel ? 'disponível' : 'INDISPONÍVEL: ' + (caminho?.motivo || (caminho?.motivos || []).join(' | ') || '-')} · mudanças diretas: ${diretas.map(x => x.tipo + ' “' + x.titulo + '”').join(', ') || 'nenhuma'}`);
    if (!ok1) return false;

    // 2) servidor recusa liberar sem conferir as mudanças diretas
    let recusa = '';
    try { await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, ...(d.internosCp123?.quantidade ? { assinaturaInternosCp123: d.internosCp123.assinatura } : {}) }); recusa = 'LIBEROU sem conferir'; }
    catch (e) { recusa = String(e.message || e); }
    caso(2, 'sem conferir as mudanças diretas, o servidor não libera', /mudanças feitas direto no editor/.test(recusa) && (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES].status !== 'liberado', recusa.slice(0, 220));

    // 3) tela da Amanda: Aprovações → Calendários → Conferir e liberar → checklist → confirmar
    let tela = '';
    { const pg = await nav.novaPagina(); pg.page.on('dialog', x => x.accept());
      try { await entrarComo(pg.page, amb.url(), 'Amanda'); await pg.page.waitForTimeout(2500);
        await entrarGerencia(pg.page); await pg.page.waitForTimeout(1500);
        await pg.page.evaluate(() => { window.irParaAprovacoes?.(); }); await pg.page.waitForTimeout(1500); await pg.page.evaluate(() => window.filtrarAprovacoes?.('calendarios'));
        const lib = pg.page.locator(`[data-liberacao-cp160="${CICLO}"]`).first(); await lib.waitFor({ state: 'attached', timeout: 30000 });
        await lib.evaluate(el => { el.closest('details')?.setAttribute('open', ''); el.click(); });
        const btn = pg.page.locator('#planejamentoEditorI172 [data-action="publicar-form"]').first();
        await btn.waitFor({ state: 'visible', timeout: 30000 }); await esperar(async () => btn.isEnabled(), 20000);
        const rotulo = (await btn.innerText()).trim();
        await btn.click();
        const lista = pg.page.locator('[data-mudancas-diretas-cp238]').first(); await lista.waitFor({ state: 'visible', timeout: 15000 });
        const txt = await lista.innerText();
        const listou = [NOVO_TITULO, alvoRetirar.name, alvoTexto.name].every(t => txt.includes(t));
        const confirmar = pg.page.locator('[data-action="decidir-publicar"]').first();
        await confirmar.click(); await pg.page.waitForTimeout(2500);   // sem marcar o checklist, nada é liberado
        const travado = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES].status !== 'liberado';
        if (!(await pg.page.locator('#ed172_confirma_publicacao').first().isVisible().catch(() => false))) await btn.click();
        await pg.page.locator('#ed172_confirma_publicacao').first().waitFor({ state: 'visible', timeout: 15000 });
        await pg.page.check('#ed172_confirma_publicacao'); await foto(pg.page, `J91${tag}-amanda-checklist`);
        await pg.page.locator('[data-action="decidir-publicar"]').first().click();
        const liberado = await esperar(async () => (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES].status === 'liberado', 40000);
        await pg.page.waitForTimeout(2500); await foto(pg.page, `J91${tag}-amanda-liberou`);
        tela = `botão “${rotulo}” · checklist ${listou ? 'lista as 3 mudanças' : 'SEM a lista: ' + txt.slice(0, 160).replace(/\s+/g, ' ')} · sem marcar ${travado ? 'não libera' : 'LIBEROU sem marcar'} · ${liberado ? 'liberado' : 'NÃO liberou'}`;
      } catch (e) { tela = 'falha: ' + String(e).replace(/\s+/g, ' ').slice(0, 220); await foto(pg.page, `J91${tag}-falha-tela`); } finally { await pg.fechar(); } }
    caso(3, 'a Amanda confere o checklist com as mudanças diretas e libera pela tela', /lista as 3 mudanças · sem marcar não libera · liberado$/.test(tela), tela);

    // 4) o cliente recebe tudo
    const m = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES], ret = m.retratoLiberadoV115?.items || [];
    const noRetrato = id => ret.find(i => i.itemId === id && !i.excluido);
    const retOk = m.status === 'liberado' && (noRetrato(alvoPedido.itemId)?.desc || '').includes('versão final') && noRetrato(alvoTexto.itemId)?.desc === TEXTO_DIRETO && !!noRetrato(novoId) && !noRetrato(alvoRetirar.itemId) && (!pecaId || !!noRetrato(pecaId));
    let link = '';
    { const cli = await nav.novaPagina();
      try { await cli.page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
        const vis = await esperar(async () => cli.page.evaluate(([novo, saiu, peca]) => { const t = document.body.innerText; return t.includes(novo) && !t.includes(saiu) && (!peca || t.includes(peca)) ? 'ok' : null; }, [NOVO_TITULO, alvoRetirar.name, pecaId ? PECA : '']), 30000);
        link = vis ? 'o link do cliente mostra o novo' + (pecaId ? ' e a peça' : '') + ' e não mostra o retirado' : 'o link NÃO reflete a liberação';
      } catch (e) { link = 'falha no link: ' + String(e).slice(0, 160); } finally { await cli.fechar(); } }
    caso(4, 'o cliente recebe a correção, o texto mudado e o conteúdo novo' + (comPeca ? ' e a peça' : '') + '; o retirado some', retOk && /^o link do cliente mostra/.test(link), `retrato ${retOk ? 'completo' : 'INCOMPLETO'} · ${link}`);

    // 5) o mês sai da fila de liberação da Amanda
    d = await ler('Amanda');
    const fila = await chamar('Amanda', 'central_editor_interno_fila_cp123', {}).catch(e => ({ erro: String(e.message || e) }));
    const ainda = (fila.resumoCiclosCp232 || []).some(r => r.ciclo === CICLO && r.podeLiberar);
    caso(5, 'o mês sai da fila de liberação da Amanda', !fila.erro && !ainda && d.reliberacaoCp121?.disponivel !== true && d.internosCp123?.disponivel !== true, fila.erro ? 'fila: ' + fila.erro.slice(0, 160) : ainda ? 'o mês CONTINUA na fila para liberar' : 'fora da fila');
    return retOk;
  }

  try {
    if (await rodada('A', false)) await rodada('B', true);
  } catch (e) { fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.slice(-8).join(' → ')); }
}
