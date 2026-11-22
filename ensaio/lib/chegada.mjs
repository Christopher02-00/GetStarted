// Prova da chegada perfeita do calendário (V3, 22/11/2026 — pedido do Chris: "a chegada perfeita do calendário ao cliente e à Amanda para
// aprovar deve estar presente com testes e comprovações de 99% de acertividade"). Usado pela J06 (todo PR) e pela J104 (dados reais, todos os
// clientes). Duas conferências, sempre com o que o SERVIDOR gravou, nunca só com o que a tela diz:
//  - chegadaAmanda: a rodada do servidor (a mesma do agendamento de 5 min) gera o aviso "Calendário para revisar" para a Amanda; ela abre o aviso
//    e a revisão mostra cada conteúdo com o mesmo título, dia e legenda que o Chris salvou;
//  - chegadaCliente: o que a Amanda aprovou (retrato liberado), a cópia do cliente (calendarios_cliente) e o calendário batem campo por campo,
//    e o link do cliente mostra cada título e legenda.
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from './emulador.mjs';
import { entrarComo, foto } from './navegador.mjs';

export const CAMPOS_CHEGADA = ['name', 'day', 'legenda', 'desc', 'fmt'];
const norm = v => String(v ?? '').replace(/\s+/g, ' ').trim();

export function adminDb(amb) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + amb.portas.firestore;
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  return getFirestore(getApps().find(a => a.name === 'ensaio-chegada') || initializeApp({ projectId: PROJETO }, 'ensaio-chegada'));
}
const itensDoMes = (cal, mes, titulos) => (cal?.items || []).filter(i => i && !i.excluido && (i.mes === mes || i.competencia === mes) && (!titulos || titulos.includes(i.name)));

/** Amanda recebe o calendário para aprovar: aviso do servidor + revisão com os conteúdos idênticos ao que o Chris salvou. */
export async function chegadaAmanda({ amb, nav, erroGrave, ciclo, cliente, mes, titulos, rotulo = 'chegada' }) {
  const db = adminDb(amb);
  const { sincronizarOcorrenciasI165 } = await import(pathToFileURL(path.join(RAIZ, 'functions-get/central/notificacoes.mjs')).href);
  await sincronizarOcorrenciasI165(db, { canais: [], enviarPush: async () => {}, enviarEmail: async () => {} });
  const notas = (await db.collection('notificacoes_operacionais_i165').where('destinatario', '==', 'Amanda').get()).docs
    .filter(d => d.data().origem?.tipo === 'calendario_revisao' && d.data().origem?.id === ciclo && d.data().estado !== 'resolvida');
  const salvos = itensDoMes((await db.doc('calendarios/' + cliente).get()).data(), mes, titulos);
  if (!notas.length) return { ok: false, detalhe: 'o servidor não gerou o aviso "Calendário para revisar" para a Amanda' };
  const nota = notas[0];
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
    const botao = page.locator(`[data-abrir="${nota.id}"]`).first();
    if (!(await botao.count())) { await page.evaluate(() => window.irPara?.('inicio', document.getElementById('navInicio'))).catch(() => {}); }
    await botao.waitFor({ state: 'visible', timeout: 25000 });
    const tituloAviso = await page.evaluate(id => document.querySelector(`[data-abrir="${id}"]`)?.closest('div[style]')?.querySelector('strong')?.textContent || '', nota.id);
    await botao.scrollIntoViewIfNeeded(); await botao.click();
    await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 }); await page.waitForTimeout(2500);
    const naTela = await page.evaluate(nomes => nomes.map(n => {
      const art = [...document.querySelectorAll('#planejamentoEditorI172 article')].find(a => a.querySelector('h3')?.textContent.trim() === n);
      if (!art) return { name: n, achou: false };
      const val = f => { const el = art.querySelector(`[data-field="${f}"]`); return el ? (el.value ?? el.textContent) : null; };
      return { name: n, achou: true, day: val('day'), legenda: val('legenda') };
    }), salvos.map(i => i.name));
    const difs = [];
    for (const s of salvos) { const t = naTela.find(x => x.name === s.name);
      if (!t?.achou) { difs.push(`"${s.name}" não aparece na revisão`); continue; }
      if (t.day !== null && norm(t.day) !== norm(s.day)) difs.push(`"${s.name}" dia ${t.day} ≠ ${s.day}`);
      if (t.legenda !== null && norm(t.legenda) !== norm(s.legenda)) difs.push(`"${s.name}" legenda diferente`); }
    const graves = erros.filter(erroGrave);
    await foto(page, `chegada-amanda-${rotulo}`);
    const ok = salvos.length > 0 && !difs.length && /Calendário para revisar/.test(tituloAviso) && !graves.length;
    return { ok, detalhe: `aviso "${tituloAviso.trim()}" · ${salvos.length} conteúdo(s) na revisão idênticos ao salvo${difs.length ? ' · DIFERENÇAS: ' + difs.join('; ') : ''}${graves.length ? ' · erro: ' + graves[0] : ''}` };
  } catch (e) { await foto(page, `chegada-amanda-${rotulo}-falha`); return { ok: false, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }; }
  finally { await fechar(); }
}

/** O cliente vê exatamente o que a Amanda aprovou: retrato liberado = calendário = cópia do cliente (campo por campo) + link do cliente. */
export async function chegadaCliente({ amb, nav, erroGrave, cliente, nome, mes, titulos, token, rotulo = 'chegada' }) {
  const db = adminDb(amb);
  const cal = (await db.doc('calendarios/' + cliente).get()).data(), copia = (await db.doc('calendarios_cliente/' + cliente).get()).data();
  const doCal = itensDoMes(cal, mes, titulos), daCopia = itensDoMes(copia, mes, titulos), retrato = (cal?.aprovacaoMeses?.[mes]?.retratoLiberadoV115?.items || []).filter(i => !titulos || titulos.includes(i.name));
  const difs = [];
  for (const i of doCal) {
    const c = daCopia.find(x => (i.itemId && x.itemId === i.itemId) || x.name === i.name), r = retrato.find(x => (i.itemId && x.itemId === i.itemId) || x.name === i.name);
    if (!c) difs.push(`"${i.name}" falta na cópia do cliente`); else for (const k of CAMPOS_CHEGADA) if (norm(c[k]) !== norm(i[k])) difs.push(`"${i.name}" ${k} na cópia ≠ calendário`);
    if (!r) difs.push(`"${i.name}" falta no que a Amanda aprovou`); else for (const k of ['name', 'day', 'legenda']) if (norm(r[k]) !== norm(i[k])) difs.push(`"${i.name}" ${k} aprovado ≠ calendário`);
  }
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    await page.goto(amb.url('calendario.html', `&cliente=${cliente}&t=${token}&mes=${mes}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /Liberado — o cliente já vê/.test(document.body.innerText), null, { timeout: 30000 });
    try { await page.getByRole('button', { name: /Lista por semana/ }).click({ timeout: 5000 }); } catch {}
    await page.waitForTimeout(1500);
    const html = await page.evaluate(() => document.body.innerText + ' ' + document.body.innerHTML);
    for (const i of doCal) if (!html.includes(i.name)) difs.push(`"${i.name}" não aparece para o cliente`);
    // o cliente toca no conteúdo (openEdit é o que o cartão chama) e vê título, dia e legenda — conferidos contra o calendário
    const abertos = await page.evaluate(nomes => nomes.map(n => { const card = [...document.querySelectorAll('[onclick*="openEdit("]')].find(el => el.textContent.includes(n));
      const idx = card ? Number((card.getAttribute('onclick').match(/openEdit\((\d+)\)/) || [])[1]) : NaN;
      if (!Number.isInteger(idx) || typeof window.openEdit !== 'function') return { name: n, abriu: false };
      window.openEdit(idx); const v = id => document.getElementById(id)?.value ?? null; const r = { name: n, abriu: true, mName: v('mName'), mDay: v('mDay'), mLegenda: v('mLegenda') };
      document.querySelector('#modal .close, [onclick*="closeModal"]')?.click?.(); return r; }), doCal.map(i => i.name));
    for (const i of doCal) { const a = abertos.find(x => x.name === i.name);
      if (!a?.abriu) { difs.push(`"${i.name}" não abre para o cliente`); continue; }
      if (norm(a.mName) !== norm(i.name)) difs.push(`"${i.name}" título aberto ≠ calendário`);
      if (norm(a.mDay) !== norm(i.day)) difs.push(`"${i.name}" dia aberto ${a.mDay} ≠ ${i.day}`);
      if (norm(a.mLegenda) !== norm(i.legenda)) difs.push(`"${i.name}" legenda aberta ≠ calendário`); }
    const graves = erros.filter(erroGrave);
    await foto(page, `chegada-cliente-${rotulo}`);
    return { ok: doCal.length > 0 && !difs.length && !graves.length, detalhe: `${doCal.length} conteúdo(s): aprovado = calendário = cópia do cliente = o que o cliente abre (título, dia, legenda)${difs.length ? ' · DIFERENÇAS: ' + difs.join('; ') : ''}${graves.length ? ' · erro: ' + graves[0] : ''}` };
  } catch (e) { await foto(page, `chegada-cliente-${rotulo}-falha`); return { ok: false, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }; }
  finally { await fechar(); }
}
