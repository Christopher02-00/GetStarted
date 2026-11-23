// J123 — CP268 (23/11/2026, Chris: "se vc recomenda fazer isso que vai melhorar tudo eu aprovo pode fazer"). Depois da CP267 a peça
// adicional ("+ Adicionar conteúdo interno") ainda excluía a Stokki pelo nome, porque não tinha legenda por plataforma. Esperado:
//  1. tela do Chris (editor da Stokki, mês liberado com legendas por plataforma): "+ Adicionar conteúdo interno" aparece; a peça nasce com
//     os campos Instagram, TikTok, YouTube e LinkedIn; o Chris preenche e envia à Amanda;
//  2. a Amanda aprova e libera: a peça entra no calendário e na versão liberada com as quatro legendas por plataforma;
//  3. o Portal (calendário do cliente Stokki) mostra as legendas por plataforma da peça nova;
//  4. contraprova Mochi (só legenda principal): a peça adicional nasce com os campos de sempre, sem legendas por plataforma;
//  5. Zeiss (empresas): a peça adicional continua fora, e o quadro diz o motivo.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J123';
export const nome = 'Peça adicional da Stokki nasce com as legendas por plataforma (Mochi igual; Zeiss segue fora com o motivo)';
const MES = '2027-03', EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const PECA = { name: 'Stokki — Peça nova J123', desc: 'Roteiro da peça nova J123.', legenda: 'Legenda principal da peça J123.', obs: 'Cortes rápidos.',
  legendaInstagram: 'Instagram J123: o pedido certo na hora certa.', legendaTiktok: 'TikTok J123: viralizar é sorte, entregar é sistema.',
  legendaYoutube: 'YouTube J123: o caminho do pedido em 60 segundos.', legendaLinkedin: 'LinkedIn J123: como a operação escala sem erro.' };

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
  let n = 0; const op = () => 'ensaio_j123_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, cliente, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ciclo: `${MES}__${cliente}`, origemEditorial: 'continuar_legado', ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j123_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp123$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
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
  const base = (itemId, day, name, extra) => ({ itemId, mes: MES, day, name, desc: 'Roteiro ' + name, obs: 'Corte seco.', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true, ...extra });
  await liberar('stokki', 'Stokki', [base('calitem_j123_s', 4, 'Stokki — Existente (J123)', { legenda: 'Principal J123.', legendaInstagram: 'IG J123 existente.', legendaTiktok: 'TT J123 existente.', legendaYoutube: '', legendaLinkedin: 'LI J123 existente.' })]);
  await liberar('mochi', 'Mochi', [base('calitem_j123_m', 6, 'Mochi — Só legenda (J123)', { legenda: 'Legenda única Mochi J123.' })]);
  await liberar('zeiss', 'Zeiss', [base('calitem_j123_z', 7, 'Zeiss — Conteúdo (J123)', { legenda: 'Legenda Zeiss J123.' })]);
  await amb.aguardarFunctionsOciosas?.();

  // 1) tela do Chris: "+ Adicionar conteúdo interno" na Stokki, com as legendas por plataforma
  let reg = null;
  { const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
      await page.waitForFunction(() => typeof window.abrirCalendarioFerramentas === 'function', null, { timeout: 30000 });
      await page.evaluate(m => window.abrirCalendarioFerramentas('stokki', 'Stokki', m), MES);
      await page.waitForSelector('.ai123', { timeout: 40000 });
      await page.waitForFunction(() => { const s = document.querySelector('.ai123'); return s && !/Conferindo os ajustes internos/.test(s.innerText); }, null, { timeout: 30000 }).catch(() => {});
      const q = page.locator('.ai123'), botao = q.locator('[data-action="preparar-adicional"]');
      const tem = await botao.count();
      if (!tem) { await foto(page, 'J123-sem-adicionar'); throw new Error('a tela não oferece "+ Adicionar conteúdo interno" para a Stokki'); }
      await botao.click();
      await q.locator('textarea[data-start="motivo"]').waitFor({ timeout: 20000 });
      await q.locator('textarea[data-start="motivo"]').fill('A Andrea pediu uma peça extra de dezembro (J123).');
      await q.locator('button[data-action="iniciar"]').click();
      await page.waitForFunction(() => !!document.querySelector('.ai123 [data-field="name"]'), null, { timeout: 30000 });
      const campos = await q.locator('[data-field]').evaluateAll(es => [...new Set(es.map(e => e.dataset.field))]);
      for (const [k, v] of Object.entries(PECA)) await q.locator(`textarea[data-field="${k}"]`).first().fill(v);
      await q.locator('input[data-field="day"]').first().fill('12');
      await q.locator('input[data-field="referenciaDispensada"]').first().check();
      await q.locator('button[data-action="salvar"]').first().click();
      await page.waitForFunction(() => { const b = document.querySelector('.ai123 button[data-action="enviar"]'); return b && !b.disabled; }, null, { timeout: 30000 });
      await q.locator('button[data-action="enviar"]').first().click();
      for (let k = 0; k < 30 && !reg; k++) { reg = (await seed.listar('calendarios_ajustes_internos_cp123')).find(r => r.cliente === 'stokki' && r.tipoAjuste === 'adicao_cp142' && r.competencia === MES && r.estado === 'enviado') || null; if (!reg) await page.waitForTimeout(1000); }
      await foto(page, 'J123-enviado');
      fim('1 Stokki: "+ Adicionar" aparece; a peça nasce com as legendas por plataforma; o Chris preenche e envia', ['legendaInstagram', 'legendaTiktok', 'legendaYoutube', 'legendaLinkedin'].every(k => campos.includes(k))
        && reg?.conteudo?.legendaTiktok === PECA.legendaTiktok && reg?.conteudo?.legendaLinkedin === PECA.legendaLinkedin && !erros.filter(erroGrave).length,
        `campos: ${campos.join(', ')} · registro ${reg ? reg.estado + ' · TikTok ' + (reg.conteudo.legendaTiktok === PECA.legendaTiktok ? 'ok' : 'NÃO') : 'NÃO enviado'}`);
    } catch (e) { await foto(page, 'J123-falha-tela').catch(() => {}); fim('1 tela do Chris', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
    finally { await fechar(); } }

  // 2) Amanda aprova e libera
  try {
    if (!reg) throw new Error('sem peça enviada');
    let d = await chamar('Amanda', 'stokki', 'central_editor_ler'); const a = d.internosCp123.ajustes.find(x => x.id === reg.id);
    await chamar('Amanda', 'stokki', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '' });
    d = await chamar('Amanda', 'stokki', 'central_editor_ler');
    await chamar('Amanda', 'stokki', 'central_editor_decidir', { operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const c2 = await seed.get('calendarios', 'stokki'), it = c2.items.find(i => i.itemId === reg.itemId), ret = c2.aprovacaoMeses[MES].retratoLiberadoV115.items.find(i => i.itemId === reg.itemId);
    const ok = [it, ret].every(x => ['legendaInstagram', 'legendaTiktok', 'legendaYoutube', 'legendaLinkedin', 'legenda', 'name'].every(k => x?.[k] === PECA[k])) && it.day === 12;
    fim('2 Amanda aprova e libera: a peça entra no calendário e na versão liberada com as quatro legendas', ok,
      `calendário ${it ? 'com a peça (dia ' + it.day + ')' : 'SEM a peça'} · legendas por plataforma ${ok ? 'iguais às escritas' : 'DIFERENTES'} · ${etapas.slice(-3).join(' → ')}`);
  } catch (e) { fim('2 aprovação e liberação', false, String(e).replace(/\s+/g, ' ').slice(0, 300) + ' · ' + etapas.join(' → ')); }

  // 3) Portal
  { const { page, erros, fechar } = await nav.novaPagina();
    try {
      const copia = await (async () => { for (let k = 0; k < 30; k++) { const c = await seed.get('calendarios_cliente', 'stokki'); const i = c?.items?.find(x => x?.itemId === reg?.itemId); if (i?.legendaTiktok === PECA.legendaTiktok) return c; await new Promise(r => setTimeout(r, 1000)); } return null; })();
      await page.goto(amb.url('calendario.html', `&cliente=stokki&t=tok-stokki&mes=${MES}`), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__modoCal === 'cliente' && typeof openEdit === 'function', null, { timeout: 30000 }); await page.waitForTimeout(2500);
      const idx = copia ? copia.items.findIndex(i => i && i.itemId === reg?.itemId) : -1; if (idx >= 0) await page.evaluate(i => openEdit(i), idx); await page.waitForTimeout(2000);
      const txt = await page.evaluate(() => document.body.innerText);
      await foto(page, 'J123-portal');
      fim('3 o Portal mostra as legendas por plataforma da peça nova', !!copia && [PECA.legendaInstagram, PECA.legendaTiktok, PECA.legendaYoutube, PECA.legendaLinkedin].every(t => txt.includes(t)) && !erros.filter(erroGrave).length,
        `cópia do cliente ${copia ? 'com a peça' : 'SEM a peça'} · tela: ${[PECA.legendaInstagram, PECA.legendaTiktok, PECA.legendaYoutube, PECA.legendaLinkedin].filter(t => txt.includes(t)).length}/4 legendas`);
    } catch (e) { fim('3 Portal', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
    finally { await fechar(); } }

  // 4) contraprova Mochi e 5) Zeiss
  try {
    let d = await chamar('Chris', 'mochi', 'central_editor_ler');
    const adicionarMochi = d.internosCp123?.adicionar === true, itemId = 'adicional_cp142_' + 'a'.repeat(32);
    d = await chamar('Chris', 'mochi', 'central_editor_interno_iniciar_cp123', { operacao: op(), assinaturaEsperada: d.assinatura, itemId, motivo: 'Contraprova J123.', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
    const chaves = Object.keys(d.internosCp123.ajustes.find(x => x.itemId === itemId)?.conteudo || {}).sort().join(',');
    fim('4 contraprova Mochi: a peça adicional nasce com os campos de sempre', adicionarMochi && chaves === 'day,desc,fmt,legenda,name,obs,preparacaoGravacao,ref,referenciaDispensada,stage', `adicionar ${adicionarMochi ? 'sim' : 'NÃO'} · campos: ${chaves}`);
  } catch (e) { fim('4 contraprova Mochi', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  try {
    const d = await chamar('Chris', 'zeiss', 'central_editor_ler');
    fim('5 Zeiss: a peça adicional segue fora e o quadro diz o motivo', d.internosCp123?.adicionar !== true && /empresa/.test(d.internosCp123?.motivoAdicionarCp267 || '') && (d.internosCp123?.aptos || []).some(a => a.itemId === 'calitem_j123_z'),
      `adicionar ${d.internosCp123?.adicionar === true ? 'SIM' : 'não'} · motivo: ${d.internosCp123?.motivoAdicionarCp267 || '(nenhum)'} · corrigir o conteúdo: ${(d.internosCp123?.aptos || []).some(a => a.itemId === 'calitem_j123_z') ? 'disponível' : 'NÃO'}`);
  } catch (e) { fim('5 Zeiss', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
}
