// J77 (arquivo J60d: roda logo depois da J74, com a Bluefit 2026-12 liberada e com peça CP142 e ajuste CP123 já liberados — o
// mesmo estado da Fedalto 2026-12 em 17/11/2026). O cliente manda 3 pedidos pelo link (um deles na peça CP142). Mede, pela
// tela e pelo servidor: o que o Chris vê em cada pedido, se consegue corrigir no editor, explicar e enviar; se a Amanda
// aprova cada um; e se a liberação mensal fica disponível e leva tudo junto, sem perder peça, ajuste nem histórico.
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { foto, entrarComo, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J77';
export const nome = 'Combinação em mês liberado (caso Fedalto): vários pedidos do cliente + peça CP142 + ajuste CP123 — cada pedido tem próximo passo e o mês libera';
const CLIENTE = 'bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`, TITULO = 'Ensaio J06 — Depoimento de aluno';
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const NOVA_DESC = 'Roteiro corrigido conforme o pedido do cliente (J56).';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

async function abrirEditor(page) { // mesmo caminho da J49b: estratégia → cliente e mês → materiais → editor oficial
  await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 });
  await abrirMenuSeMovel(page); await page.click('#navPlanejamentoPreparacaoR80');
  await page.waitForFunction(() => { const v = document.getElementById('view-estrategiaCp109'); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, null, { timeout: 20000 });
  const v = page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
  await v.locator('select').first().selectOption({ label: 'Bluefit' }); await v.locator('input[type=month]').first().fill(MES);
  await v.getByRole('button', { name: /Abrir cliente e mês/ }).click();
  await page.getByRole('button', { name: /^Abrir materiais do mês$/ }).click({ timeout: 20000 }); await page.waitForTimeout(3000);
  const aba = page.getByRole('button', { name: /^Criar e aprovar$/ }).first(); if (await aba.isVisible().catch(() => false)) { await aba.click(); await page.waitForTimeout(2500); }
  const ed = page.getByRole('button', { name: /^Abrir editor oficial nesta competência$/ }).first();
  await ed.evaluate(el => el.scrollIntoView({ block: 'center' })); await ed.click();
}

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
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j77_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_|^ajuste_calendario_/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  const op = () => 'ensaio_j77_' + String(++n).padStart(3, '0');
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
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado') { fim('preparação', false, 'depende da J06/J56/J60/J74 (dezembro liberado)'); return; }
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + p.firestore;
  const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  const app = getApps().find(a => a.name === 'ensaio-j77') || initializeApp({ projectId: PROJETO }, 'ensaio-j77');
  const recepcao = await import(pathToFileURL(path.join(RAIZ, 'functions-get/recepcao-pedidos-cliente-cp175.mjs')).href);
  const pubAntes = cal0.aprovacaoMeses[MES].retratoLiberadoV115.items, adicionais = pubAntes.filter(i => /^adicional_cp142_/.test(i.itemId)).map(i => i.itemId);
  const copia0 = await seed.get('calendarios_cliente', CLIENTE);
  // conteúdos que já tiveram pedido antes da última liberação ficam para a U5 do CP224 (o CP193 ainda os conta como abertos)
  const jaPedidos = new Set(Object.values(cal0.pedidosAjusteClienteI71 || {}).map(x => x && x.itemId));
  const candidatos = [];
  for (const [k, it] of (copia0.items || []).entries()) { if (!it || jaPedidos.has(it.itemId) || it.excluido || it.posted || it.agendado || (it.mes || MES) !== MES || !pubAntes.some(x => x.itemId === it.itemId)) continue; candidatos.push([k, it.itemId]); }
  candidatos.sort((a, b) => (/^adicional_cp142_/.test(a[1]) ? 1 : 0) - (/^adicional_cp142_/.test(b[1]) ? 1 : 0)); // peça CP142 por último (como na Fedalto, o pedido do dia vem depois)
  const alvos = [], recusados = []; let errosChris = [];
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    // 1) cliente manda 3 pedidos (tela real do link), um por conteúdo
    await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Liberado — o cliente já vê|Em ajuste/.test(document.body.innerText) && typeof openEdit === 'function', null, { timeout: 30000 });
    const ops = [];
    for (const [i, itemId] of candidatos) {
      if (alvos.length >= 3) break; const cp142 = /^adicional_cp142_/.test(itemId);
      if (!cp142 && alvos.filter(a => !/^adicional_cp142_/.test(a)).length >= 2) continue;
      if (recusados.length >= 3) break;
      if (alvos.length) { await page.goto(amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`), { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof openEdit === 'function' && /Calendário em revisão|Liberado — o cliente já vê/.test(document.body.innerText), null, { timeout: 30000 }); await page.waitForTimeout(1500); }
      const nomeAlvo = (copia0.items || []).find(x => x && x.itemId === itemId)?.name || '';
      const idxTela = await page.evaluate(nome => { for (let k = 0; k < 400; k++) { try { openEdit(k); } catch { return -1; } const ok = document.getElementById('mName')?.value === nome; if (ok) return k; try { closeModal(); } catch {} } return -1; }, nomeAlvo);
      if (idxTela < 0) { recusados.push(itemId + ' (não achado na tela)'); continue; }
      const aberto = await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
      if (!aberto) { recusados.push(itemId + (cp142 ? ' (CP142)' : '')); try { await page.evaluate(() => typeof closeModal === 'function' && closeModal()); } catch {} continue; }
      await page.fill('#mObsCliente', `Pedido ${alvos.length + 1} do cliente (J77): trocar a chamada deste conteúdo.`); await page.click('#btnEnviarObsCliente');
      const o = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === itemId && /J77/.test(x.texto || ''))?.operationId; });
      if (!o) { const msg = await page.evaluate(() => [...document.querySelectorAll('.toast,[role=alert],[role=status],.erro,.aviso')].map(e => e.innerText.trim()).filter(Boolean).join(' | ').slice(0, 200)); recusados.push(itemId + ' (enviado, não chegou: ' + msg.slice(0, 60) + ' · console: ' + erros.slice(-2).map(String).join(' / ').slice(0, 300) + ')'); await foto(page, 'J77-recusa'); continue; }
      alvos.push(itemId); ops.push(o);
      try { await page.evaluate(() => typeof closeModal === 'function' && closeModal()); } catch {}
    }
    await recepcao.executarRecepcaoPedidosClienteCp175(getFirestore(app), { agora: new Date(), limite: 40 });
    fim('cliente manda pedidos em 2 conteúdos (um na peça CP142)', ops.length >= 2 && adicionais.some(a => alvos.includes(a)), `${ops.length} pedidos · alvos ${alvos.join(', ')} · peça CP142 ${adicionais.some(a => alvos.includes(a)) ? 'incluída' : 'NÃO incluída'} · sem campo de pedido: ${recusados.join(', ') || 'nenhum'} · peças CP142 no retrato: ${adicionais.length}`);
    if (ops.length < 2) return;
    // 2) o que o Chris vê em cada pedido (servidor): nenhum pedido sem próximo passo
    let lista = (await chamar('Chris', 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.filter(x => ops.includes(x.operationId));
    const semSaida = lista.filter(a => /precisam de conferência/.test(a.correcao?.motivo || ''));
    fim('Chris: nenhum pedido mostra "precisam de conferência" sem saída', lista.length === ops.length && !semSaida.length, `${lista.length} pedidos na lista · sem saída: ${semSaida.length}` + (semSaida[0] ? ' ("' + semSaida[0].correcao.motivo.slice(0, 90) + '")' : ''));
    // 2b) a mesma coisa na tela do Chris: cada pedido diz o próximo passo e leva ao conteúdo no editor
    const ui = await nav.novaPagina(); errosChris = ui.erros;
    try {
      ui.page.on('dialog', x => x.accept());
      await entrarComo(ui.page, amb.url(), 'Chris'); await ui.page.waitForTimeout(2500);
      await abrirEditor(ui.page);
      await ui.page.waitForSelector('[data-painel-ajustes-cp112] [data-pedido]', { timeout: 30000 });
      const telas = await ui.page.evaluate(() => [...document.querySelectorAll('[data-painel-ajustes-cp112] [data-pedido]')].map(c => ({ id: c.dataset.pedido, texto: c.querySelector('[data-motivo-correcao-cp182]')?.innerText || '', ir: !!c.querySelector('[data-action="ir-conteudo-cp224"]') })));
      const dosPedidos = telas.filter(t => lista.some(a => a.demandaId === t.id));
      const enganam = dosPedidos.filter(t => /precisam de conferência/.test(t.texto)), semBotao = dosPedidos.filter(t => !t.ir);
      let foco = '';
      if (dosPedidos[0]?.ir) { const alvo = lista.find(a => a.demandaId === dosPedidos[0].id);
        const b = ui.page.locator(`[data-pedido="${dosPedidos[0].id}"] [data-action="ir-conteudo-cp224"]`); await b.evaluate(el => el.scrollIntoView({ block: 'center' })); await b.click(); await ui.page.waitForTimeout(1200);
        foco = await ui.page.evaluate(item => { const el = document.activeElement; return el?.closest?.('[data-card]')?.dataset.card === item ? 'ok' : 'foco em ' + (el?.tagName || 'nada'); }, alvo.itemId); }
      await foto(ui.page, 'J77-chris-pedidos');
      // CP224 U4: "Por que este mês não avança?" diz com quem está cada pedido e o próximo passo
      const diag = await ui.page.evaluate(() => document.querySelector('[data-diagnostico-cp224]')?.innerText.replace(/\s+/g, ' ') || '');
      const okDiag = /Por que este mês não avança\?/.test(diag) && new RegExp('Com o Chris \\(' + ops.length + '\\)').test(diag) && /corrigir o conteúdo/.test(diag) && /Liberação:/.test(diag);
      fim('Chris (tela): "Por que este mês não avança?" mostra com quem está cada pedido e o próximo passo (U4)', okDiag, diag ? diag.slice(0, 260) : 'diagnóstico ausente');
      fim('Chris (tela): cada pedido diz o próximo passo e o botão leva ao conteúdo no editor', dosPedidos.length === ops.length && !enganam.length && !semBotao.length && foco === 'ok',
        `${dosPedidos.length} pedidos na tela · com "precisam de conferência": ${enganam.length} · sem botão: ${semBotao.length} · botão → ${foco || 'não testado'}` + (dosPedidos[0] ? ' · texto: "' + dosPedidos[0].texto.replace(/\s+/g, ' ').slice(0, 140) + '"' : ''));
    } catch (e) { await foto(ui.page, 'J77-chris-falha'); fim('Chris (tela): cada pedido diz o próximo passo e o botão leva ao conteúdo no editor', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
    finally { await ui.fechar(); }
    // 3) Chris corrige os 3 conteúdos no editor, explica e envia cada pedido
    let d = await chamar('Chris', 'central_editor_ler', { ciclo: CICLO });
    await chamar('Chris', 'central_editor_salvar', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itens: alvos.map(itemId => ({ itemId, mes: MES, desc: 'Corrigido pelo pedido do cliente (J77) — ' + itemId })), excluirIds: [], blocos: null });
    for (const o of ops) {
      let a = (await chamar('Chris', 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === o);
      a = (await chamar('Chris', 'ajuste_calendario_salvar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, justificativa: 'Ajustado como pedido.', execucao: 'Chamada trocada.', dependencia: '' })).ajustes.find(x => x.operationId === o);
      await chamar('Chris', 'ajuste_calendario_enviar_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura });
    }
    fim('Chris corrige, explica e envia os pedidos', true, etapas.slice(-10).join(' → '));
    // 4) Amanda aprova cada um e libera
    for (const o of ops) { const a = (await chamar('Amanda', 'ajuste_calendario_ler_cp112', { ciclo: CICLO })).ajustes.find(x => x.operationId === o);
      await chamar('Amanda', 'ajuste_calendario_decidir_cp112', { ciclo: CICLO, demandaId: a.demandaId, operacao: op(), assinaturaEsperada: a.assinatura, decisao: 'aprovar', motivo: '' }); }
    d = await chamar('Amanda', 'central_editor_ler', { ciclo: CICLO });
    const disp = d.reliberacaoCp121?.disponivel === true;
    fim('Amanda aprova todos e vê a liberação mensal', disp, disp ? 'disponível' : 'indisponível: ' + JSON.stringify(d.reliberacaoCp121).slice(0, 300));
    if (!disp) return;
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const cal = await seed.get('calendarios', CLIENTE), m = cal.aprovacaoMeses[MES], r = m.retratoLiberadoV115.items;
    const corrigidos = alvos.every(a => /J77/.test(r.find(i => i.itemId === a)?.desc || '')), pecas = adicionais.every(a => r.some(i => i.itemId === a) || !pubAntes.some(i => i.itemId === a)), mesmos = pubAntes.every(x => r.some(i => i.itemId === x.itemId));
    fim('liberação leva os pedidos, mantém as peças CP142 e os demais conteúdos', m.status === 'liberado' && corrigidos && pecas && mesmos && !errosChris.filter(erroGrave).length, `mês ${m.status} · corrigidos ${corrigidos} · peças CP142 mantidas ${pecas} · conteúdos mantidos ${mesmos}`);
    // 5) depois da nova liberação, o cliente pede de novo nos MESMOS conteúdos (CP224 U5). O 1º pedido reabre o mês; o 2º,
    // em outro conteúdo que também já teve pedido resolvido, não pode ser recusado por "já está em ajuste" (o pedido antigo
    // é de antes da última liberação).
    const dbA = getFirestore(app), calAntes = (await dbA.doc('calendarios/' + CLIENTE).get()).data(), copiaAntes = (await dbA.doc('calendarios_cliente/' + CLIENTE).get()).data();
    const novos = [], recusas = [], url = amb.url('calendario.html', `&cliente=${CLIENTE}&t=tok-${CLIENTE}&mes=${MES}`);
    for (const itemId of alvos) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof openEdit === 'function' && /Calendário em revisão|Liberado — o cliente já vê|Em ajuste/.test(document.body.innerText), null, { timeout: 30000 }); await page.waitForTimeout(1500);
      const nomeAlvo = (copia0.items || []).find(x => x && x.itemId === itemId)?.name || '';
      const k = await page.evaluate(nome => { for (let k = 0; k < 400; k++) { try { openEdit(k); } catch { return -1; } if (document.getElementById('mName')?.value === nome) return k; try { closeModal(); } catch {} } return -1; }, nomeAlvo);
      const campo = k >= 0 && await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
      if (!campo) { recusas.push(itemId.slice(0, 14) + ' (sem campo de pedido)'); continue; }
      await page.fill('#mObsCliente', `Novo pedido depois da liberação (J77b) em ${itemId}.`); await page.click('#btnEnviarObsCliente');
      const o = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === itemId && /J77b/.test(x.texto || ''))?.operationId; });
      if (o) novos.push(o); else recusas.push(itemId.slice(0, 14) + ' (' + erros.map(String).filter(e => /V113/.test(e)).slice(-1)[0]?.replace(/.*Error: /, '').slice(0, 90) + ')');
    }
    // devolve dezembro liberado para as jornadas seguintes (J64 e outras dependem disso): só dados do emulador
    for (const o of novos) await dbA.doc('avisos_do_cliente/' + o).delete();
    await dbA.doc('calendarios/' + CLIENTE).set(calAntes); await new Promise(r => setTimeout(r, 3000)); await dbA.doc('calendarios_cliente/' + CLIENTE).set(copiaAntes);
    const devolvido = (await seed.get('calendarios', CLIENTE))?.aprovacaoMeses?.[MES]?.status === 'liberado';
    fim('depois de liberar, o cliente pede de novo em conteúdos que já tiveram pedido (U5)', novos.length === alvos.length && devolvido, `${novos.length} de ${alvos.length} aceitos · dezembro devolvido liberado: ${devolvido}` + (recusas.length ? ' · recusados: ' + recusas.join(', ') : ''));
    // 6) CP224 U2: dois pedidos seguidos SEM recarregar a página. O 2º precisa entrar ou dizer com clareza o que fazer
    // (nunca "Não consegui confirmar… tente novamente", que manda repetir o que não vai funcionar).
    const seguidos = [], telas6 = [];
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof openEdit === 'function' && /Calendário em revisão|Liberado — o cliente já vê|Em ajuste/.test(document.body.innerText), null, { timeout: 30000 }); await page.waitForTimeout(1500);
    for (const itemId of alvos) {
      const nomeAlvo = (copia0.items || []).find(x => x && x.itemId === itemId)?.name || '';
      const k = await page.evaluate(nome => { try { closeModal(); } catch {} for (let k = 0; k < 400; k++) { try { openEdit(k); } catch { return -1; } if (document.getElementById('mName')?.value === nome) return k; try { closeModal(); } catch {} } return -1; }, nomeAlvo);
      const campo = k >= 0 && await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
      if (!campo) { telas6.push(itemId.slice(0, 14) + ': sem campo de pedido'); continue; }
      await page.fill('#mObsCliente', `Pedido seguido sem recarregar (J77c) em ${itemId}.`); await page.click('#btnEnviarObsCliente');
      const o = await esperar(async () => { const c = await seed.get('calendarios', CLIENTE); return Object.values(c.pedidosAjusteClienteI71 || {}).find(x => x.itemId === itemId && /J77c/.test(x.texto || ''))?.operationId; }, 12000);
      const aviso = await page.evaluate(() => [...document.querySelectorAll('.toast,[role=alert],[role=status]')].map(e => e.innerText.trim()).filter(Boolean).slice(-1)[0] || '');
      if (o) seguidos.push(o); else telas6.push(itemId.slice(0, 14) + ': "' + aviso.slice(0, 120) + '"');
    }
    for (const o of seguidos) await dbA.doc('avisos_do_cliente/' + o).delete();
    await dbA.doc('calendarios/' + CLIENTE).set(calAntes); await new Promise(r => setTimeout(r, 3000)); await dbA.doc('calendarios_cliente/' + CLIENTE).set(copiaAntes);
    const genericos = telas6.filter(t => /tente novamente|Não consegui confirmar/.test(t));
    fim('dois pedidos seguidos sem recarregar: o 2º entra ou diz o que fazer (U2)', seguidos.length === alvos.length || (seguidos.length >= 1 && !genericos.length && telas6.every(t => /atualiz|recarreg/i.test(t))), `${seguidos.length} de ${alvos.length} aceitos` + (telas6.length ? ' · tela: ' + telas6.join(' | ') : ''));
    // 7) CP224 U2: a equipe muda o conteúdo enquanto o cliente está com ele aberto. A recusa diz o motivo e o próximo passo
    // ("atualize a página"), e não "Não consegui confirmar… tente novamente".
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof openEdit === 'function' && /Liberado — o cliente já vê/.test(document.body.innerText), null, { timeout: 30000 }); await page.waitForTimeout(1500);
    const nome7 = (copia0.items || []).find(x => x && x.itemId === alvos[0])?.name || '';
    await page.evaluate(nome => { for (let k = 0; k < 400; k++) { try { openEdit(k); } catch { return -1; } if (document.getElementById('mName')?.value === nome) return k; try { closeModal(); } catch {} } return -1; }, nome7);
    let aviso7 = 'sem campo de pedido';
    if (await page.waitForSelector('#mObsCliente', { state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)) {
      const c7 = (await dbA.doc('calendarios/' + CLIENTE).get()).data(); c7.items = c7.items.map(x => x && x.itemId === alvos[0] ? { ...x, desc: (x.desc || '') + ' (mudado pela equipe — J77d)' } : x);
      await dbA.doc('calendarios/' + CLIENTE).set(c7);
      // a página do cliente confere pela cópia do cliente: a mudança da equipe chega às duas (sem esperar o espelho das Functions)
      const k7 = (await dbA.doc('calendarios_cliente/' + CLIENTE).get()).data(); k7.items = (k7.items || []).map(x => x && x.itemId === alvos[0] ? { ...x, desc: (x.desc || '') + ' (mudado pela equipe — J77d)' } : x);
      await dbA.doc('calendarios_cliente/' + CLIENTE).set(k7);
      await page.fill('#mObsCliente', 'Pedido em conteúdo que a equipe acabou de mudar (J77d).'); await page.click('#btnEnviarObsCliente');
      await page.waitForTimeout(5000);
      aviso7 = await page.evaluate(() => document.getElementById('avisoSalvamento')?.innerText.trim() || '');
    }
    const entrou7 = Object.values((await seed.get('calendarios', CLIENTE)).pedidosAjusteClienteI71 || {}).filter(x => /J77d/.test(x.texto || ''));
    for (const o of entrou7) await dbA.doc('avisos_do_cliente/' + o.operationId).delete();
    await dbA.doc('calendarios/' + CLIENTE).set(calAntes); await new Promise(r => setTimeout(r, 3000)); await dbA.doc('calendarios_cliente/' + CLIENTE).set(copiaAntes);
    fim('equipe mudou o conteúdo aberto: a recusa manda atualizar a página (U2)', !entrou7.length && /atualize a página/i.test(aviso7) && !/tente novamente/i.test(aviso7), `pedido ${entrou7.length ? 'ENTROU' : 'recusado'} · tela: "${aviso7.slice(0, 160)}"`);
  } catch (e) { await foto(page, 'J77-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.slice(-8).join(' → ')); }
  finally { await fechar(); }
}
