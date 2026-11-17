// J74 (arquivo J60c: precisa rodar depois da J60/J60B e antes da J64, que deixa dezembro em ajuste) — CP219 (16/11/2026, caso Mochi 2026-11): peça adicional CP142 já liberada não tinha como sair do mês (o editor do mês
// liberado não abre, e o ajuste interno só aceitava correção, substituição e peça nova). Continua a J60 (Bluefit, dezembro liberado
// pelo processo novo, com uma peça adicional CP142 liberada). Caminho:
//  1. Tela: Chris abre o editor oficial, em "Ajustes internos" escolhe a peça adicional, o tipo "Retirar esta peça adicional do mês",
//     escreve o motivo, inicia e envia para a Amanda (sem tocar no texto da peça).
//  2. Amanda aprova a retirada e libera o mês (mesmas ações que a tela chama).
//  3. A peça sai do retrato liberado e da cópia do cliente; no calendário ela fica `excluido` (soft-delete) com o texto intacto.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J74';
export const nome = 'Peça adicional já liberada sai do mês por pedido do Chris e aprovação da Amanda (soft-delete)';
const CLIENTE = 'bluefit', NOME = 'Bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

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
  let n = 0; const op = () => 'ensaio_j74_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ciclo: CICLO, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j74_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp123$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }

  const cal0 = await seed.get('calendarios', CLIENTE);
  const peca = (cal0?.items || []).find(i => i && /^adicional_cp142_[a-f0-9]{32}$/.test(i.itemId || '') && i.mes === MES && !i.excluido);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !peca || !cal0.aprovacaoMeses[MES].retratoLiberadoV115?.items?.some(i => i.itemId === peca.itemId)) {
    fim('preparação', false, 'depende da J60 (peça adicional CP142 liberada em dezembro da Bluefit)'); return;
  }
  const textoAntes = JSON.stringify(['name', 'desc', 'legenda', 'obs', 'day', 'fmt'].map(k => peca[k]));
  await amb.aguardarFunctionsOciosas?.();

  // 1. Tela: Chris pede a retirada da peça em "Ajustes internos" e envia à Amanda
  {
    const { page, erros, fechar } = await nav.novaPagina(); const t1 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
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
      const q = page.locator('.ai123');
      const novo = q.locator('details[data-novo-interno]'); await novo.evaluate(el => { el.open = true; el.scrollIntoView({ block: 'center' }); });
      await q.locator('select[data-start="itemId"]').selectOption(peca.itemId);
      const tipo = q.locator('select[data-start="tipoAjuste"]');
      const temOpcao = await tipo.count() && await tipo.locator('option[value="retirada_cp219"]').count();
      if (!temOpcao) { await foto(page, 'J74-sem-retirada'); throw new Error('a tela não oferece "Retirar esta peça adicional do mês"'); }
      await tipo.selectOption('retirada_cp219');
      await q.locator('textarea[data-start="motivo"]').fill('A peça adicional saiu do planejamento deste mês (J74).');
      await q.locator('button[data-action="iniciar"]').click();
      const card = q.locator('article', { has: page.locator('[data-retirada-cp219]') }).first();
      await card.waitFor({ timeout: 30000 });
      await card.locator('button[data-action="enviar"]').click();
      await page.waitForFunction(() => /Retirada da peça · Aguardando revisão da Amanda/.test(document.querySelector('.ai123')?.innerText || ''), null, { timeout: 30000 });
      await foto(page, 'J74-chris-pediu-retirada');
      const graves = erros.filter(erroGrave);
      registrar({ jornada: id, caso: '1 Chris pede pela tela a retirada da peça adicional e envia à Amanda', ok: !graves.length, ms: Date.now() - t1, detalhe: 'retirada aguardando a Amanda' + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, 'J74-tela-falha'); registrar({ jornada: id, caso: '1 Chris pede pela tela a retirada da peça adicional e envia à Amanda', ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); return; }
    finally { await fechar(); }
  }

  // 2 e 3. Amanda aprova e libera (mesmas ações da tela) → a peça sai do mês sem ser apagada
  try {
    let d = await chamar('Amanda', 'central_editor_ler');
    let a = d.internosCp123.ajustes.find(x => x.itemId === peca.itemId && x.tipoAjuste === 'retirada_cp219' && x.estado === 'enviado');
    if (!a?.capacidades?.aprovar) { fim('2 Amanda aprova e libera a retirada', false, 'aprovação indisponível: ' + JSON.stringify(a?.capacidades || 'retirada não listada')); return; }
    d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '' });
    d = await chamar('Amanda', 'central_editor_ler');
    if (d.internosCp123?.disponivel !== true) { fim('2 Amanda aprova e libera a retirada', false, 'liberação indisponível: ' + (d.internosCp123?.motivos || []).join(' | ').slice(0, 300)); return; }
    await chamar('Amanda', 'central_editor_decidir', { operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const cal = await seed.get('calendarios', CLIENTE), m = cal.aprovacaoMeses[MES], ciclo = await seed.get('planejamento_social_i155', CICLO);
    const item = (cal.items || []).find(i => i?.itemId === peca.itemId);
    const foraDoRetrato = !m.retratoLiberadoV115?.items?.some(i => i.itemId === peca.itemId);
    const softDelete = item?.excluido === true && item.retiradaCp219?.aprovadoPor === 'Amanda' && JSON.stringify(['name', 'desc', 'legenda', 'obs', 'day', 'fmt'].map(k => item[k])) === textoAntes;
    const copia = await esperar(async () => { const c = await seed.get('calendarios_cliente', CLIENTE); return c && !c.items?.some(i => i?.itemId === peca.itemId && !i.excluido) ? c : null; });
    const entrega = ciclo?.publicacaoAtual?.retrato?.publicadoEm === m.retratoLiberadoV115?.publicadoEm;
    const outros = (m.retratoLiberadoV115?.items || []).length === (cal0.aprovacaoMeses[MES].retratoLiberadoV115.items.length - 1);
    const d2 = await chamar('Chris', 'central_editor_ler');
    fim('2 Amanda aprova e libera: a peça sai do retrato e da cópia do cliente, fica marcada como retirada (texto intacto), o resto do mês segue igual',
      m.status === 'liberado' && foraDoRetrato && softDelete && !!copia && entrega && outros && d2.internosCp123?.adicionar === true && !(d2.internosCp123?.motivos || []).length,
      `mês ${m.status} · retrato ${foraDoRetrato ? 'sem a peça' : 'AINDA COM a peça'} · calendário ${softDelete ? 'peça marcada como retirada, texto intacto' : 'SEM soft-delete correto'} · cópia do cliente ${copia ? 'sem a peça' : 'AINDA COM a peça'} · entrega ${entrega ? 'atualizada' : 'DIVERGENTE'} · demais conteúdos ${outros ? 'preservados' : 'MUDARAM'} · ${etapas.join(' → ')}`);
  } catch (e) { fim('2 Amanda aprova e libera a retirada', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
}
