// J122 — CP267 (23/11/2026, Stokki 2026-12, pedido urgente do Chris). Mês liberado da Stokki: o quadro "Ajustes internos" dizia só
// "Não há ajuste interno iniciado neste mês" — o servidor devolvia nenhum conteúdo apto (a Stokki era excluída pelo nome) — e, mesmo
// que abrisse, o ajuste só editava roteiro, legenda principal e orientação (não as legendas de cada plataforma). Esperado:
//  1. Tela do Chris (editor do mês, aberto pelo calendário do cliente): "Iniciar um ajuste interno" oferece os conteúdos sem agendamento; o agendado aparece em
//     "Conteúdos que não podem receber ajuste interno agora" com o motivo em linguagem simples;
//  2. o ajuste do conteúdo com legendas por plataforma traz os campos Instagram, TikTok, YouTube e LinkedIn; o Chris muda TikTok e
//     YouTube, salva e envia à Amanda;
//  3. a Amanda aprova e libera: o calendário e a versão liberada trazem as legendas novas de TikTok e YouTube; Instagram, LinkedIn e a
//     legenda principal continuam as de antes; a legenda fica marcada como atualizada pelo Chris; a versão anterior fica guardada;
//  4. o Portal (calendário do cliente Stokki) mostra as legendas novas por plataforma;
//  5. contraprova Mochi (só legenda principal): o ajuste continua com os três campos de sempre (roteiro, legenda, orientação).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J122';
export const nome = 'Ajuste interno em mês liberado da Stokki edita as legendas por plataforma (e diz por que um conteúdo não entra)';
const MES = '2027-02', EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const L = (p, r) => `Legenda ${r} original J122 ${p}.`;
const NOVO_TT = 'Legenda TikTok NOVA J122: viralizar é sorte, entregar é sistema.', NOVO_YT = 'Legenda YouTube NOVA J122: o caminho do pedido em 60 segundos.';

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
  let n = 0; const op = () => 'ensaio_j122_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, cliente, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ciclo: `${MES}__${cliente}`, origemEditorial: 'continuar_legado', ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j122_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp123$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  // mês liberado antes do registro editorial (mesma prova da J62), como os meses reais de dezembro
  async function liberar(cliente, nomeCli, meus) {
    const cal0 = (await seed.get('calendarios', cliente)) || {}; const { id: _x, ...semId } = cal0;
    const cal = { cliente, client: nomeCli, ...semId, items: [...(cal0.items || []).filter(i => i?.mes !== MES), ...meus] };
    const retrato = criarRetratoLiberadoV115(cal, MES, 'Amanda', '2026-11-20T19:53:32.444Z');
    cal.aprovacaoMeses = mapaAprovacaoAposPublicar(cal.aprovacaoMeses || {}, MES, 'Amanda', '2026-11-20T19:53:32.444Z', [], retrato);
    await seed.set('calendarios', cliente, cal);
    const proc = await seed.get('processo_calendarios_i164', 'ativo');
    await seed.set('continuidade_calendarios_i164', `${MES}__${cliente}`, { schema: 1, ativo: true, modo: 'continuar_legado', cliente, competencia: MES, ativacaoId: proc.ativacaoId, revisao: 1,
      editorialI172: { schema: 1, revisao: 1, fase: 'publicada', rodada: 0 } });
  }
  const redes = x => ({ legenda: L(x, 'principal'), legendaInstagram: L(x, 'Instagram'), legendaTiktok: L(x, 'TikTok'), legendaYoutube: L(x, 'YouTube'), legendaLinkedin: L(x, 'LinkedIn') });
  const base = (itemId, day, name, extra) => ({ itemId, mes: MES, day, name, desc: 'Roteiro original ' + name, obs: 'Corte seco.', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true, ...extra });
  await liberar('stokki', 'Stokki', [
    base('calitem_j122_a', 3, 'Stokki — TikTok Shop (J122)', redes('A')),
    base('calitem_j122_b', 10, 'Stokki — Já agendado (J122)', { ...redes('B'), agendado: true }),
    base('calitem_j122_c', 15, 'Stokki — Chique na logística (J122)', redes('C'))
  ]);
  await liberar('mochi', 'Mochi', [
    base('calitem_j122_m', 5, 'Mochi — Só legenda (J122)', { legenda: 'Legenda única Mochi J122.' }),
    base('calitem_j122_m2', 9, 'Mochi — Variantes iguais (J122)', { legenda: 'Legenda repetida Mochi J122.', legendaInstagram: 'Legenda repetida Mochi J122.' })
  ]);
  await amb.aguardarFunctionsOciosas?.();

  // 1–2) tela do Chris: editor oficial da Stokki
  let ajuste = null;
  { const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
      // mês do modo antigo (como a Stokki 2026-12): o editor do mês abre pelo calendário do cliente (Calendários e conteúdos)
      await page.waitForFunction(() => typeof window.abrirCalendarioFerramentas === 'function', null, { timeout: 30000 });
      await page.evaluate(m => window.abrirCalendarioFerramentas('stokki', 'Stokki', m), MES);
      await page.waitForSelector('.ai123', { timeout: 40000 });
      await page.waitForFunction(() => { const s = document.querySelector('.ai123'); return s && !/Conferindo os ajustes internos/.test(s.innerText); }, null, { timeout: 30000 }).catch(() => {});
      const q = page.locator('.ai123');
      const opcoes = await q.locator('select[data-start="itemId"] option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
      const naoAptos = await q.locator('[data-nao-aptos-cp267]').evaluate(el => { el.open = true; return el.innerText; }).catch(() => '');
      await foto(page, 'J122-quadro-stokki');
      fim('1 o quadro oferece os conteúdos sem agendamento e diz por que o agendado não entra', opcoes.includes('calitem_j122_a') && opcoes.includes('calitem_j122_c') && !opcoes.includes('calitem_j122_b')
        && /Já agendado \(J122\) — já está agendado na plataforma/.test(naoAptos) && !erros.filter(erroGrave).length,
        `no início: ${opcoes.filter(x => /j122/.test(x)).join(', ') || 'NENHUM'} · motivo: ${naoAptos.replace(/\s+/g, ' ').match(/Dia 10[^·]*· [^—]*— [^D]*/)?.[0] || naoAptos.replace(/\s+/g, ' ').slice(0, 160) || 'NÃO mostrado'}`);
      if (!opcoes.includes('calitem_j122_a')) throw new Error('sem início para a Stokki');
      const novo = q.locator('details[data-novo-interno]'); await novo.evaluate(el => { el.open = true; el.scrollIntoView({ block: 'center' }); });
      await q.locator('select[data-start="itemId"]').selectOption('calitem_j122_a');
      await q.locator('textarea[data-start="motivo"]').fill('A Andrea pediu correção nas legendas de TikTok e YouTube (J122).');
      await q.locator('button[data-action="iniciar"]').click();
      await page.waitForFunction(() => !!document.querySelector('.ai123 textarea[data-field="legendaTiktok"]'), null, { timeout: 30000 });
      const campos = await q.locator('textarea[data-field]').evaluateAll(ts => ts.map(t => t.dataset.field));
      const tt = q.locator('textarea[data-field="legendaTiktok"]').first(), yt = q.locator('textarea[data-field="legendaYoutube"]').first();
      await tt.fill(NOVO_TT); await yt.fill(NOVO_YT);
      await q.locator('button[data-action="salvar"]').first().click();
      await page.waitForFunction(() => !document.querySelector('.ai123 button[data-action="enviar"]')?.disabled, null, { timeout: 30000 });
      await q.locator('button[data-action="enviar"]').first().click();
      ajuste = await (async () => { for (let k = 0; k < 30; k++) { const rows = (await seed.listar('calendarios_ajustes_internos_cp123')).filter(r => r.cliente === 'stokki' && r.itemId === 'calitem_j122_a'); const r = rows.find(x => x.estado === 'enviado'); if (r) return r; await page.waitForTimeout(1000); } return null; })();
      await foto(page, 'J122-enviado');
      fim('2 o ajuste traz as legendas por plataforma; o Chris muda TikTok e YouTube e envia à Amanda', ['legendaInstagram', 'legendaTiktok', 'legendaYoutube', 'legendaLinkedin'].every(k => campos.includes(k))
        && ajuste?.conteudo?.legendaTiktok === NOVO_TT && ajuste?.conteudo?.legendaYoutube === NOVO_YT && ajuste?.conteudo?.legendaInstagram === L('A', 'Instagram') && !erros.filter(erroGrave).length,
        `campos na tela: ${campos.join(', ')} · registro ${ajuste ? ajuste.estado + ' · TikTok ' + (ajuste.conteudo.legendaTiktok === NOVO_TT ? 'novo' : 'antigo') + ' · YouTube ' + (ajuste.conteudo.legendaYoutube === NOVO_YT ? 'novo' : 'antigo') : 'NÃO enviado'}`);
    } catch (e) { await foto(page, 'J122-falha-tela').catch(() => {}); fim('tela do Chris', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
    finally { await fechar(); } }

  // 3) Amanda aprova e libera (as mesmas ações do servidor que a tela dela usa)
  try {
    if (!ajuste) throw new Error('sem ajuste enviado');
    let d = await chamar('Amanda', 'stokki', 'central_editor_ler'); let a = d.internosCp123.ajustes.find(x => x.id === ajuste.id);
    await chamar('Amanda', 'stokki', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '' });
    d = await chamar('Amanda', 'stokki', 'central_editor_ler');
    await chamar('Amanda', 'stokki', 'central_editor_decidir', { operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const c2 = await seed.get('calendarios', 'stokki'), it = c2.items.find(i => i.itemId === 'calitem_j122_a'), ret = c2.aprovacaoMeses[MES].retratoLiberadoV115.items.find(i => i.itemId === 'calitem_j122_a');
    const reg = (await seed.listar('calendarios_ajustes_internos_cp123')).find(r => r.id === ajuste.id);
    const ok = [it, ret].every(x => x?.legendaTiktok === NOVO_TT && x?.legendaYoutube === NOVO_YT && x?.legendaInstagram === L('A', 'Instagram') && x?.legendaLinkedin === L('A', 'LinkedIn') && x?.legenda === L('A', 'principal'))
      && it.legendaAtualizadaPor === 'Chris' && reg?.estado === 'publicado' && Array.isArray(it.aprovacoesAnterioresI68) && it.aprovacoesAnterioresI68.length >= 1;
    // a versão anterior fica guardada: a cópia de segurança da liberação (calendarios_versoes) tem o calendário de antes, com as legendas antigas
    const copias = (await seed.listar('calendarios_versoes')).filter(v => v.__cliente === 'stokki' && String(v.id || '').startsWith('stokki__i172_ensaio_j122'));
    const anterior = copias.map(v => (v.items || []).find(i => i?.itemId === 'calitem_j122_a')).find(i => i?.legendaTiktok === L('A', 'TikTok') && i?.legendaYoutube === L('A', 'YouTube'));
    fim('3 Amanda aprova e libera: só TikTok e YouTube mudam; legenda marcada como atualizada; versão anterior guardada', ok && !!anterior && reg.historico.some(h => h.acao === 'central_editor_decidir'),
      `versão anterior ${anterior ? 'guardada com o TikTok e o YouTube antigos' : 'NÃO encontrada'} (${copias.length} cópia(s)) · ` +
      `calendário: TikTok ${it?.legendaTiktok === NOVO_TT ? 'novo' : 'antigo'} · YouTube ${it?.legendaYoutube === NOVO_YT ? 'novo' : 'antigo'} · Instagram ${it?.legendaInstagram === L('A', 'Instagram') ? 'igual' : 'MUDOU'} · LinkedIn ${it?.legendaLinkedin === L('A', 'LinkedIn') ? 'igual' : 'MUDOU'} · principal ${it?.legenda === L('A', 'principal') ? 'igual' : 'MUDOU'} · versão liberada ${ret?.legendaTiktok === NOVO_TT ? 'com as novas' : 'SEM as novas'} · atualizada por ${it?.legendaAtualizadaPor || '-'} · aprovação anterior guardada ${it?.aprovacoesAnterioresI68?.length || 0} · registro ${reg?.estado} · ${etapas.slice(-3).join(' → ')}`);
  } catch (e) { fim('3 aprovação e liberação', false, String(e).replace(/\s+/g, ' ').slice(0, 300) + ' · ' + etapas.join(' → ')); }

  // 4) Portal: o calendário do cliente Stokki mostra as legendas novas por plataforma
  { const { page, erros, fechar } = await nav.novaPagina();
    try {
      const copia = await (async () => { for (let k = 0; k < 30; k++) { const c = await seed.get('calendarios_cliente', 'stokki'); const i = c?.items?.find(x => x?.itemId === 'calitem_j122_a'); if (i?.legendaTiktok === NOVO_TT) return c; await new Promise(r => setTimeout(r, 1000)); } return null; })();
      await page.goto(amb.url('calendario.html', `&cliente=stokki&t=tok-stokki&mes=${MES}`), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__modoCal === 'cliente' && typeof openEdit === 'function', null, { timeout: 30000 });
      await page.waitForTimeout(2500);
      const idx = copia ? copia.items.findIndex(i => i && i.itemId === 'calitem_j122_a') : -1;
      if (idx >= 0) await page.evaluate(i => openEdit(i), idx);
      await page.waitForTimeout(2000);
      const txt = await page.evaluate(() => document.body.innerText);
      await foto(page, 'J122-portal');
      fim('4 o Portal mostra as legendas novas por plataforma', !!copia && txt.includes(NOVO_TT) && txt.includes(NOVO_YT) && txt.includes(L('A', 'Instagram')) && !txt.includes(L('A', 'TikTok')) && !erros.filter(erroGrave).length,
        `cópia do cliente ${copia ? 'com as novas' : 'SEM as novas'} · tela: TikTok ${txt.includes(NOVO_TT) ? 'novo' : 'NÃO'} · YouTube ${txt.includes(NOVO_YT) ? 'novo' : 'NÃO'} · Instagram ${txt.includes(L('A', 'Instagram')) ? 'mantido' : 'NÃO'} · TikTok antigo ${txt.includes(L('A', 'TikTok')) ? 'AINDA aparece' : 'saiu'}`);
    } catch (e) { await foto(page, 'J122-falha-portal').catch(() => {}); fim('4 Portal', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
    finally { await fechar(); } }

  // 5) contraprova Mochi: só legenda principal (e variante que só repete a principal) → os três campos de sempre
  try {
    let d = await chamar('Chris', 'mochi', 'central_editor_ler');
    const aptos = (d.internosCp123?.aptos || []).map(x => x.itemId);
    d = await chamar('Chris', 'mochi', 'central_editor_interno_iniciar_cp123', { operacao: op(), assinaturaEsperada: d.assinatura, itemId: 'calitem_j122_m2', motivo: 'Contraprova J122.', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash });
    const a = d.internosCp123.ajustes.find(x => x.itemId === 'calitem_j122_m2');
    const chaves = Object.keys(a?.conteudo || {}).sort().join(',');
    fim('5 contraprova Mochi: só legenda principal continua com roteiro, legenda e orientação', aptos.includes('calitem_j122_m') && aptos.includes('calitem_j122_m2') && chaves === 'desc,legenda,obs',
      `aptos Mochi ${aptos.filter(x => /j122/.test(x)).length}/2 · campos do ajuste: ${chaves || 'nenhum'}`);
  } catch (e) { fim('5 contraprova Mochi', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
}
