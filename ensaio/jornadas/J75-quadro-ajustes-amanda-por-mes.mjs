// J75 — CP220 (16/11/2026, Amanda: "nada chega"): o quadro "Alterações de calendário para revisar" do Início mostrava
// "0 para revisar agora" + "Não consegui confirmar as mudanças agora" com 4 ajustes aguardando a Amanda (Mochi 2026-12,
// peças do processo novo; Place 2026-11, mês travado). Causa: a tela recusava o link sem origem editorial dos ajustes do
// processo novo (CP208) e um único ajuste recusado derrubava a fila inteira. Cenário com 2 clientes:
//  A) Bluefit 2026-12 (processo novo, liberado pela J06/J56/J60): Chris envia uma peça adicional CP142 à Amanda.
//  B) Hitech 2027-03 (processo antigo): Chris envia uma peça adicional e o mês é publicado de novo — a peça fica sobre
//     a versão anterior (o estado "travado" da Place).
//  1. Amanda abre o Início: as 2 peças aparecem, sem "Não consegui confirmar".
//  2. Cada "Revisar este conteúdo" abre o editor do cliente e mês certos, com a peça.
//  3. Um registro que não confere (origem divergente) entra na fila: as 2 continuam e o problema aparece com cliente · mês e motivo.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J75';
export const nome = 'Quadro de ajustes da Amanda lista todos os meses, mesmo com um mês com erro';
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const B = { cliente: 'bluefit', mes: '2026-12' }, H = { cliente: 'hitech', mes: '2027-03' };
B.ciclo = `${B.mes}__${B.cliente}`; H.ciclo = `${H.mes}__${H.cliente}`;
const peca = (nome, day) => ({ day, fmt: 'Carrossel', stage: 'Topo', name: nome, ref: '', referenciaDispensada: true,
  desc: 'Slide 1: abertura. Slides 2 a 4: o que mostrar. Slide 5: chamada.', legenda: 'Legenda da peça ' + nome + '.', obs: 'Fotos reais.', preparacaoGravacao: '' });
const PB = peca('Ensaio J75 — Peça nova Bluefit dezembro', 22), PH = peca('Ensaio J75 — Peça nova Hitech março', 9);

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
  let n = 0; const op = () => 'ensaio_j75_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j75_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp1\d\d$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  // Chris reserva, completa e envia uma peça adicional CP142 à Amanda; devolve o id do ajuste
  async function enviarPeca(base, conteudo) {
    let d = await chamar('Chris', 'central_editor_ler', base);
    if (d.internosCp123?.adicionar !== true) throw new Error(base.ciclo + ': o servidor não oferece a inclusão (' + JSON.stringify(d.internosCp123?.motivos || []).slice(0, 200) + ')');
    const itemId = 'adicional_cp142_' + [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ...base, operacao: op(), assinaturaEsperada: d.assinatura, itemId, motivo: 'A Amanda pediu uma peça nova (J75).',
      esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
    let a = d.internosCp123.ajustes.find(x => x.itemId === itemId); if (!a) throw new Error(base.ciclo + ': rascunho não criado');
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ...base, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, conteudo });
    a = d.internosCp123.ajustes.find(x => x.id === a.id);
    await chamar('Chris', 'central_editor_interno_enviar_cp123', { ...base, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    return a.id;
  }
  // Hitech 2027-03: mês liberado antes do registro editorial (mesma montagem da J62/J67), publicado em `publicadoEm`
  const publicarHitech = async (publicadoEm, descDica) => {
    const cal0 = (await seed.get('calendarios', H.cliente)) || {}; const { id: _x, ...semId } = cal0;
    const outros = (cal0.items || []).filter(i => i?.mes !== H.mes);
    const base = [
      { itemId: 'calitem_j75_reels', mes: H.mes, day: 12, name: 'Hitech — Reels da bancada (J75)', desc: 'Roteiro original da bancada.', legenda: 'Legenda da bancada J75.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true },
      { itemId: 'calitem_j75_dica', mes: H.mes, day: 20, name: 'Hitech — Dica do mês (J75)', desc: descDica, legenda: 'Legenda da dica J75.', obs: '', fmt: 'Reel', stage: 'Meio', ref: '', excluido: false, apr: true },
    ];
    const cal = { cliente: H.cliente, client: 'Hitech', ...semId, items: [...outros, ...base] };
    const retrato = criarRetratoLiberadoV115(cal, H.mes, 'Amanda', publicadoEm);
    cal.aprovacaoMeses = mapaAprovacaoAposPublicar(cal.aprovacaoMeses || {}, H.mes, 'Amanda', publicadoEm, [], retrato);
    await seed.set('calendarios', H.cliente, cal);
    const proc = await seed.get('processo_calendarios_i164', 'ativo');
    await seed.set('continuidade_calendarios_i164', H.ciclo, { schema: 1, ativo: true, modo: 'continuar_legado', cliente: H.cliente, competencia: H.mes, ativacaoId: proc.ativacaoId, revisao: 1,
      editorialI172: { schema: 1, revisao: 1, fase: 'publicada', rodada: 0 } });
    await amb.aguardarFunctionsOciosas?.();
  };

  const cal0 = await seed.get('calendarios', B.cliente);
  if (cal0?.aprovacaoMeses?.[B.mes]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', B.ciclo))) { fim('preparação', false, 'depende da J06/J56/J60 (Bluefit dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();
  let idB, idH;
  try {
    idB = await enviarPeca({ ciclo: B.ciclo }, PB);
    await publicarHitech('2026-10-21T12:00:00.000Z', 'Roteiro original da dica.');
    idH = await enviarPeca({ ciclo: H.ciclo, origemEditorial: 'continuar_legado' }, PH);
    await publicarHitech('2026-11-06T12:00:00.000Z', 'Roteiro da dica revisado na publicação P2.');
  } catch (e) { fim('preparação: Chris envia as 2 peças', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); return; }

  // lê o quadro do Início da Amanda depois de a fila terminar de carregar
  async function lerQuadro(page) {
    await page.waitForFunction(() => { const s = document.querySelector('#avisosCalendariosI148 section[data-fila-interna-cp123]'); return s && /Alterações de calendário para revisar/.test(s.innerText); }, null, { timeout: 40000 }).catch(() => {});
    await page.waitForTimeout(1500);
    return page.evaluate(([b, h]) => { const s = document.querySelector('#avisosCalendariosI148 section[data-fila-interna-cp123]'); const t = s?.innerText || '';
      return { existe: !!s, b: !!s?.querySelector(`[data-interno-fila-cp123="${b}"]`), h: !!s?.querySelector(`[data-interno-fila-cp123="${h}"]`), falha: /Não consegui confirmar as mudanças agora/.test(t),
        resumo: (t.match(/\d+ para revisar agora[^\n]*/) || [''])[0], problemas: [...(s?.querySelectorAll('[data-problema-fila-cp220]') || [])].map(x => x.innerText.replace(/\s+/g, ' ')) }; }, [idB, idH]);
  }
  const abrir = async (page, idAjuste) => {
    const botao = page.locator(`#avisosCalendariosI148 [data-interno-fila-cp123="${idAjuste}"] button`).first();
    await botao.evaluate(el => { el.closest('details')?.setAttribute('open', ''); el.scrollIntoView({ block: 'center' }); }); await botao.click();
    await page.waitForFunction(() => { const h = document.getElementById('planejamentoEditorI172'); return h && !h.hidden && h.querySelector('article'); }, null, { timeout: 40000 }).catch(() => {});
    await page.waitForTimeout(2000);
    return page.evaluate(() => { const h = document.getElementById('planejamentoEditorI172'); return { aberto: !!h && !h.hidden, texto: (h?.innerText || '').replace(/\s+/g, ' ') }; });
  };

  // 1 e 2. Tela da Amanda: o quadro lista as 2 peças e cada link abre o calendário certo
  {
    const { page, erros, fechar } = await nav.novaPagina(); const t1 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Amanda');
      const q = await lerQuadro(page); await foto(page, 'J75-amanda-inicio');
      registrar({ jornada: id, caso: '1 Amanda vê no Início as peças da Bluefit (processo novo) e da Hitech (mês sobre versão anterior)', ok: q.b && q.h && !q.falha, ms: Date.now() - t1,
        detalhe: `quadro ${q.existe ? 'presente' : 'AUSENTE'} · Bluefit ${q.b ? 'listada' : 'FORA'} · Hitech ${q.h ? 'listada' : 'FORA'} · ${q.falha ? '"Não consegui confirmar" NA TELA' : 'sem falha'} · ${q.resumo}` });
      if (q.b) {
        const r = await abrir(page, idB); await foto(page, 'J75-amanda-editor-bluefit');
        const ok = r.aberto && r.texto.includes(PB.name) && /Bluefit/.test(r.texto) && !r.texto.includes(PH.name);
        registrar({ jornada: id, caso: '2a "Revisar este conteúdo" da Bluefit abre o editor da Bluefit · dezembro com a peça', ok, ms: Date.now() - t1,
          detalhe: r.aberto ? (ok ? 'editor da Bluefit com a peça' : 'editor sem a peça/cliente: ' + r.texto.slice(0, 200)) : 'editor NÃO abriu' });
      } else registrar({ jornada: id, caso: '2a "Revisar este conteúdo" da Bluefit abre o editor da Bluefit · dezembro com a peça', ok: false, ms: Date.now() - t1, detalhe: 'peça fora do quadro' });
      const graves = erros.filter(erroGrave);
      if (graves.length) registrar({ jornada: id, caso: '2 sem erro grave no console', ok: false, ms: Date.now() - t1, detalhe: graves[0].slice(0, 300) });
    } catch (e) { await foto(page, 'J75-falha-1'); registrar({ jornada: id, caso: '1/2a tela da Amanda', ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); }
    finally { await fechar(); }
  }
  {
    const { page, fechar } = await nav.novaPagina(); const t1 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Amanda');
      const q = await lerQuadro(page);
      if (q.h) {
        const r = await abrir(page, idH); await foto(page, 'J75-amanda-editor-hitech');
        const ok = r.aberto && r.texto.includes(PH.name) && /Hitech/.test(r.texto) && !r.texto.includes(PB.name);
        registrar({ jornada: id, caso: '2b "Revisar este conteúdo" da Hitech abre o editor da Hitech · março com a peça', ok, ms: Date.now() - t1,
          detalhe: r.aberto ? (ok ? 'editor da Hitech com a peça' : 'editor sem a peça/cliente: ' + r.texto.slice(0, 200)) : 'editor NÃO abriu' });
      } else registrar({ jornada: id, caso: '2b "Revisar este conteúdo" da Hitech abre o editor da Hitech · março com a peça', ok: false, ms: Date.now() - t1, detalhe: 'peça fora do quadro' + (q.falha ? ' (quadro em falha)' : '') });
    } catch (e) { await foto(page, 'J75-falha-2b'); registrar({ jornada: id, caso: '2b tela da Amanda', ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); }
    finally { await fechar(); }
  }

  // 3. Um registro que não confere (cópia da peça da Hitech com outra origem) entra na fila: os outros continuam
  const base = `http://127.0.0.1:${p.firestore}/v1/projects/${PROJETO}/databases/(default)/documents/calendarios_ajustes_internos_cp123`, HD = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
  const idX = 'interno_cp123_' + [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
  {
    const { page, fechar } = await nav.novaPagina(); const t1 = Date.now();
    try {
      const orig = await (await fetch(`${base}/${idH}`, { headers: HD })).json();
      const fields = { ...orig.fields, id: { stringValue: idX } };
      const w = await fetch(`${base}/${idX}`, { method: 'PATCH', headers: HD, body: JSON.stringify({ fields }) }); if (!w.ok) throw new Error('gravar registro divergente: ' + w.status);
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Amanda');
      const q = await lerQuadro(page); await foto(page, 'J75-amanda-mes-com-erro');
      const prob = q.problemas.find(t => /Hitech/.test(t) && /março/i.test(t) && /Chris/.test(t));
      registrar({ jornada: id, caso: '3 com um registro que não confere, as 2 peças continuam e o problema aparece com cliente · mês, motivo e quem faz', ok: q.b && q.h && !!prob, ms: Date.now() - t1,
        detalhe: `Bluefit ${q.b ? 'listada' : 'FORA'} · Hitech ${q.h ? 'listada' : 'FORA'} · ${q.falha ? 'quadro em falha · ' : ''}problemas: ${q.problemas.length ? q.problemas.join(' | ').slice(0, 300) : 'nenhum mostrado'}` });
    } catch (e) { await foto(page, 'J75-falha-3'); registrar({ jornada: id, caso: '3 registro que não confere', ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); }
    finally { await fechar(); await fetch(`${base}/${idX}`, { method: 'DELETE', headers: HD }).catch(() => {}); }
  }
}
