// J90 (arquivo J60g) — CP237 (19/11/2026, Stokki 2026-12): a Amanda devolveu o PEDIDO DO CLIENTE (o mês fica ajuste_interno por
// 'Amanda'); o Chris corrigiu; ela aprovou. O diagnóstico mandava "A Amanda libera o mês", mas "Liberar correções ao cliente" (CP121)
// não aparecia: a elegibilidade CP121 só aceitava por 'Cliente'. Sem ajustes internos (só o caminho CP121 libera).
//  1. Depois de aprovar, a Amanda tem a liberação das correções (reliberacaoCp121.disponivel).
//  2. Na tela (editor da Amanda) aparece "Revisar e liberar correções ao cliente".
//  3. A liberação leva a correção ao cliente.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { createRequire } from 'node:module';
import { entrarComo, entrarGerencia, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J90';
export const nome = 'Processo novo, só pedido do cliente: depois da Amanda devolver o pedido e aprovar a correção, ela tem "Liberar correções ao cliente" (Stokki)';
const CLIENTE = 'bluefit', NOME = 'Bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const dataDe = dia => `${MES}-${String(dia).padStart(2, '0')}`;

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
  const op = () => 'ensaio_j90_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j90_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp(123|226)$/, ''));
    const d = codec.abrirEnvelopeCentralR80(j.result);
    if (d?.motivoRecusa) throw new Error(acao + ' recusado: ' + d.motivoRecusa);
    return d;
  }
  async function abrirEditor(page) {
      await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 }); await abrirMenuSeMovel(page); await page.click('#navPlanejamentoPreparacaoR80');
      await page.waitForFunction(() => { const v = document.getElementById('view-estrategiaCp109'); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, null, { timeout: 20000 });
      const v = page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
      await v.locator('select').first().selectOption({ label: NOME }); await v.locator('input[type=month]').first().fill(MES);
      await v.getByRole('button', { name: /Abrir cliente e mês/ }).click();
      await page.getByRole('button', { name: /^Abrir materiais do mês$/ }).click({ timeout: 20000 }); await page.waitForTimeout(3000);
      const aba = page.getByRole('button', { name: /^Criar e aprovar$/ }).first(); if (await aba.isVisible().catch(() => false)) { await aba.click(); await page.waitForTimeout(2500); }
      const ed = page.getByRole('button', { name: /^Abrir editor oficial nesta competência$/ }).first(); await ed.evaluate(el => el.scrollIntoView({ block: 'center' })); await ed.click();
      await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 });
      await page.waitForFunction(() => { const s = document.querySelector('.ai123'); return s && !/Conferindo os ajustes internos/.test(s.innerText); }, null, { timeout: 30000 }).catch(() => {});
  }
  const ler = pessoa => chamar(pessoa, 'central_editor_ler', { ciclo: CICLO });
  const ajuste = (d, idA) => d.internosCp123.ajustes.find(x => x.id === idA);

  const cal0 = await seed.get('calendarios', CLIENTE);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06/J56 (dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();

  const { page, erros, fechar } = await nav.novaPagina();
  try {
    let d = await ler('Chris');
    const proprias = [];
    for (const [dia, nome] of [[18, 'Ensaio J90 — Pedido do cliente']]) {
      const itemId = 'adicional_cp142_' + [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
      d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itemId, motivo: 'Peça de apoio da J90.', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
      let x = d.internosCp123.ajustes.find(r => r.itemId === itemId);
      d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, conteudo: { day: dia, fmt: 'Reel', stage: 'Topo', name: nome, ref: '', referenciaDispensada: true, desc: 'Roteiro original ' + nome + '.', legenda: 'Legenda ' + nome + '.', obs: 'Imagens reais da loja.', preparacaoGravacao: '' } });
      x = ajuste(d, x.id); d = await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id });
      d = await ler('Amanda'); x = ajuste(d, x.id); d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, decisao: 'aprovar', motivo: '' });
      d = await ler('Chris'); proprias.push(itemId);
    }
    d = await ler('Amanda');
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const [pD] = proprias;
    // pedido do cliente na peça D (tela real do link)
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    const app = getApps().find(a => a.name === 'ensaio-j90') || initializeApp({ projectId: PROJETO }, 'ensaio-j90');
    const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
    const cli = await nav.novaPagina();
    let opPedido = null;
    try { await cli.page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
      await cli.page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê|Em ajuste|Calendário em revisão/.test(document.body.innerText), null, { timeout: 30000 }); await cli.page.waitForTimeout(1500);
      const k = await cli.page.evaluate(nome => { for (let i = 0; i < 500; i++) { try { openEdit(i); } catch (e) { return -1; } if (document.getElementById('mName')?.value === nome) return i; try { closeModal(); } catch {} } return -1; }, 'Ensaio J90 — Pedido do cliente');
      if (k < 0) throw new Error('o cliente não vê a peça do pedido');
      await cli.page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 15000 }); await cli.page.fill('#mObsCliente', 'Pedido do cliente (J90): trocar a chamada.'); await cli.page.click('#btnEnviarObsCliente');
      opPedido = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === pD && /J90/.test(x.texto || ''))?.operationId; });
    } finally { await cli.fechar(); }
    if (!opPedido) throw new Error('o pedido do cliente não chegou');
    await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    const lerP = async (q = 'Chris') => (await chamar(q, 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === opPedido);
    // Processo novo: o Chris corrige no editor ("Salvar conteúdos"), explica e envia o pedido — o caso real da Fedalto.
    const corrigirEEnviar = async (txt) => { const de = await ler('Chris');
      await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: de.assinatura, itens: [{ itemId: pD, mes: MES, desc: txt }], excluirIds: [], blocos: null });
      let a = await lerP(); a = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, justificativa: 'Ajustado.', execucao: 'Chamada trocada.', dependencia: '' })).ajustes.find(x => x.operationId === opPedido);
      await chamar('Chris', 'ajuste_calendario_enviar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura }); return lerP(); };
    await corrigirEEnviar('Corrigido (J90) — chamada nova');
    let pa = await lerP('Amanda');
    await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'devolver', motivo: 'Trocar de novo a chamada (J90).' });
    // Chris corrige de novo; Amanda aprova
    await corrigirEEnviar('Corrigido de novo (J90) — chamada final');
    pa = await lerP('Amanda'); if (pa?.status === 'enviado') await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: pa.demandaId, operacao: op(), assinaturaEsperada: pa.assinatura, decisao: 'aprovar', motivo: '' });
    d = await ler('Amanda');
    const rel = d.reliberacaoCp121 || d.ajustesCp112?.liberacaoMensal?.reliberacaoCp121 || {};
    fim('1 depois de aprovar a correção, a Amanda tem a liberação das correções', rel.disponivel === true, `reliberação ${rel.disponivel ? 'disponível' : 'INDISPONÍVEL: ' + (rel.motivo || '-')} · marca ${(await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES].status}/${(await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES].por}`);
    // 2) tela da Amanda
    let tela = '';
    { const pg = await nav.novaPagina(); pg.page.on('dialog', x => x.accept());
      try { await entrarComo(pg.page, amb.url(), 'Amanda'); await pg.page.waitForTimeout(2500);
        // mesmo caminho do "Conferir e liberar alterações ao cliente" da aba Aprovações → Calendários (CP232)
        await entrarGerencia(pg.page); await pg.page.waitForTimeout(1500);
        await pg.page.evaluate(() => { window.irParaAprovacoes?.(); }); await pg.page.waitForTimeout(1500); await pg.page.evaluate(() => window.filtrarAprovacoes?.('calendarios'));
        const lib = pg.page.locator(`[data-liberacao-cp160="${CICLO}"]`).first(); await lib.waitFor({ state: 'attached', timeout: 30000 });
        await lib.evaluate(el => { el.closest('details')?.setAttribute('open', ''); el.click(); });
        const b = await esperar(async () => pg.page.evaluate(() => [...document.querySelectorAll('button')].some(x => /Revisar e liberar correções ao cliente|Liberar correções ao cliente/.test(x.textContent))), 30000);
        tela = b ? 'botão de liberar presente' : 'SEM botão de liberar'; await foto(pg.page, 'J90-amanda-editor');
      } catch (e) { tela = 'falha: ' + String(e).replace(/\s+/g, ' ').slice(0, 200); } finally { await pg.fechar(); } }
    fim('2 a Amanda vê o botão de liberar as correções no editor', /presente/.test(tela), tela);
    // 3) libera
    if (rel.disponivel !== true) { fim('3 a liberação leva a correção ao cliente', false, 'reliberação indisponível'); return; }
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const m = (await seed.get('calendarios', CLIENTE)).aprovacaoMeses[MES], ret = m.retratoLiberadoV115?.items || [];
    const ok3 = m.status === 'liberado' && ret.some(i => i.itemId === pD && (i.desc || '').includes('chamada final'));
    fim('3 a liberação leva a correção ao cliente', ok3, `mês ${m.status} · correção ${ok3 ? 'no retrato' : 'FORA'}`);
  } catch (e) { await foto(page, 'J90-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.slice(-8).join(' → ')); }
  finally { await fechar(); }
}
