// J84 — CP231 (19/11/2026, Cookiery 2026-11, dia 23): conteúdo NORMAL de mês liberado não podia ser retirado (a retirada CP219
// valia só para peça adicional) e o ajuste interno devolvido pela Amanda ("pode excluir também do calendário") não tinha saída:
// a liberação travava e os outros aprovados não chegavam ao cliente. Cenário próprio: Hitech, jun/2027, processo antigo.
//  1. Liberação presa ao ajuste devolvido mostra as saídas (refazer, descartar, retirar).
//  2. Chris transforma o ajuste devolvido em retirada (mesmo registro, "substituído por retirada"), envia; Amanda aprova.
//  3. Chris descarta outro ajuste devolvido, com motivo → sai da liberação, versão liberada mantida.
//  4. Conteúdo com postagem agendada → retirada recusada com mensagem clara.
//  5. Conteúdo com vídeo na fila (sem postagem publicada) → retirada aceita com o aviso de que a Amanda arquiva o vídeo.
//  6. Contraprova: a Amanda não pede retirada.
//  7. Liberação: os retirados saem do retrato (marcados excluido, nada apagado); o aprovado chega ao cliente; postagem intacta.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { foto, entrarComo, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J84';
export const nome = 'Retirar conteúdo normal de mês liberado; ajuste devolvido vira retirada ou é descartado; liberação não fica presa';
const CLIENTE = 'hitech', MES = '2027-06', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
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
  let n = 0; const op = () => 'ensaio_j84_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ciclo: CICLO, origemEditorial: 'continuar_legado', ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j84_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?|^ajuste_calendario_/, '').replace(/_cp1\d\d$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  // mês liberado antes do registro editorial (mesma montagem da J62), com uma publicação em `publicadoEm`
  const publicar = async (publicadoEm, alterar = {}) => {
    const cal0 = (await seed.get('calendarios', CLIENTE)) || {}; const { id: _x, ...semId } = cal0;
    const outros = (cal0.items || []).filter(i => i?.mes !== MES);
    const base = [
      { itemId: 'calitem_j84_a', mes: MES, day: 23, name: 'Hitech — Preparo na fábrica (J84)', desc: 'Roteiro A J84.', legenda: 'Legenda A J84.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true },
      { itemId: 'calitem_j84_b', mes: MES, day: 21, name: 'Hitech — Vitrine (J84)', desc: 'Roteiro B J84.', legenda: 'Legenda B J84.', obs: '', fmt: 'Reel', stage: 'Meio', ref: '', excluido: false, apr: true },
      { itemId: 'calitem_j84_c', mes: MES, day: 9, name: 'Hitech — Agendado (J84)', desc: 'Roteiro C J84.', legenda: 'Legenda C J84.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true },
      { itemId: 'calitem_j84_d', mes: MES, day: 15, name: 'Hitech — Dica (J84)', desc: 'Roteiro D J84.', legenda: 'Legenda D J84.', obs: '', fmt: 'Reel', stage: 'Meio', ref: '', excluido: false, apr: true },
      { itemId: 'calitem_j84_e', mes: MES, day: 5, name: 'Hitech — Vídeo na fila (J84)', desc: 'Roteiro E J84.', legenda: 'Legenda E J84.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true },
    ].map(i => ({ ...i, ...(alterar[i.itemId] || {}) }));
    const cal = { cliente: CLIENTE, client: 'Hitech', ...semId, items: [...outros, ...base] };
    const retrato = criarRetratoLiberadoV115(cal, MES, 'Amanda', publicadoEm);
    cal.aprovacaoMeses = mapaAprovacaoAposPublicar(cal.aprovacaoMeses || {}, MES, 'Amanda', publicadoEm, [], retrato);
    await seed.set('calendarios', CLIENTE, cal);
    const proc = await seed.get('processo_calendarios_i164', 'ativo');
    await seed.set('continuidade_calendarios_i164', CICLO, { schema: 1, ativo: true, modo: 'continuar_legado', cliente: CLIENTE, competencia: MES, ativacaoId: proc.ativacaoId, revisao: 1,
      editorialI172: { schema: 1, revisao: 1, fase: 'publicada', rodada: 0 } });
    await amb.aguardarFunctionsOciosas?.();
  };
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    await publicar('2026-11-10T12:00:00.000Z');
    const hoje = new Date().toISOString();
    await seed.set('postagens', 'video_j84_c', { videoId: 'j84-c', cliente: CLIENTE, clienteNome: 'Hitech', titulo: 'Hitech — Agendado (J84)', status: 'agendado', dataAgendada: '2027-06-09', calendarItemId: 'calitem_j84_c', calendarClienteSlug: CLIENTE, calendarCompetencia: MES, excluido: false, criadoEm: hoje });
    await seed.set('postagens', 'video_j84_e', { videoId: 'j84-e', cliente: CLIENTE, clienteNome: 'Hitech', titulo: 'Hitech — Vídeo na fila (J84)', status: 'aguardando_legenda', legenda: '', calendarItemId: 'calitem_j84_e', calendarClienteSlug: CLIENTE, calendarCompetencia: MES, excluido: false, criadoEm: hoje });
    const ajuste = (d, f) => d.internosCp123.ajustes.find(f);
    const iniciar = async (itemId, motivo, tipoAjuste) => { const d0 = await chamar('Chris', 'central_editor_ler'); return chamar('Chris', 'central_editor_interno_iniciar_cp123', { operacao: op(), assinaturaEsperada: d0.assinatura, itemId, motivo, esperadaRevisao: d0.ciclo.revisao, publicacaoHash: d0.internosCp123.publicacaoHash, ...(tipoAjuste ? { tipoAjuste } : {}) }); };
    const corrigirEDevolver = async (itemId, devolucao) => {
      let d = await iniciar(itemId, 'Trocar o roteiro (J84).'); let a = ajuste(d, x => x.itemId === itemId);
      d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, conteudo: { desc: 'Roteiro novo ' + itemId, legenda: a.conteudo.legenda, obs: a.conteudo.obs } });
      a = ajuste(d, x => x.id === a.id); await chamar('Chris', 'central_editor_interno_enviar_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
      d = await chamar('Amanda', 'central_editor_ler'); a = ajuste(d, x => x.id === a.id);
      if (devolucao) d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'devolver', motivo: devolucao });
      else d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '' });
      return ajuste(d, x => x.id === a.id);
    };
    const A = await corrigirEDevolver('calitem_j84_a', 'O cliente não aprovou o vídeo. Pode excluir também do calendário.');
    const B = await corrigirEDevolver('calitem_j84_b', '');
    const D = await corrigirEDevolver('calitem_j84_d', 'Refazer a dica (J84).');
    // 1) liberação presa mostra as saídas
    let d = await chamar('Amanda', 'central_editor_ler');
    const motivos = (d.internosCp123.motivos || []).join(' | ');
    fim('1 liberação presa ao ajuste devolvido mostra as saídas (refazer, descartar, retirar)', d.internosCp123.disponivel !== true && /Descartar este ajuste/.test(motivos) && /Retirar este conteúdo do mês/.test(motivos),
      `liberação ${d.internosCp123.disponivel ? 'DISPONÍVEL' : 'presa'} · ${motivos.slice(0, 260)}`);
    // 2) devolvido → retirada no mesmo registro
    d = await chamar('Chris', 'central_editor_ler'); let a = ajuste(d, x => x.id === A.id);
    const oferece = a?.capacidades?.retirarCp231 === true && a?.capacidades?.descartarCp231 === true;
    d = await chamar('Chris', 'central_editor_interno_retirar_cp231', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, motivo: 'Vídeo não aprovado pelo cliente; sai do calendário (J84).' });
    a = ajuste(d, x => x.id === A.id);
    const mesmo = a?.tipoAjuste === 'retirada_cp219' && a.estado === 'rascunho';
    await chamar('Chris', 'central_editor_interno_enviar_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    d = await chamar('Amanda', 'central_editor_ler'); a = ajuste(d, x => x.id === A.id);
    d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '' });
    a = ajuste(d, x => x.id === A.id);
    const docA = await seed.get('calendarios_ajustes_internos_cp123', A.id);
    fim('2 ajuste devolvido vira retirada no mesmo registro ("substituído por retirada"), enviado e aprovado', oferece && mesmo && a?.estado === 'aprovado' && docA?.substituidoPorRetiradaCp231?.anterior?.conteudo?.desc === 'Roteiro novo calitem_j84_a',
      `saídas ${oferece ? 'oferecidas' : 'NÃO oferecidas'} · mesmo registro retirada ${mesmo ? 'sim' : 'NÃO'} · estado ${a?.estado} · histórico do anterior ${docA?.substituidoPorRetiradaCp231 ? 'guardado' : 'AUSENTE'}`);
    // 3) descartar devolvido — pela TELA (botão, motivo obrigatório, confirmar), como o Chris faria
    let tela3 = '';
    { const pg = await nav.novaPagina();
      try {
        pg.page.on('dialog', x => x.accept()); await entrarComo(pg.page, amb.url(), 'Chris'); await pg.page.waitForTimeout(2500);
        await pg.page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 }); await abrirMenuSeMovel(pg.page); await pg.page.click('#navPlanejamentoPreparacaoR80');
        const v = pg.page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
        await v.locator('select').first().selectOption({ label: 'Hitech' }); await v.locator('input[type=month]').first().fill(MES);
        await v.getByRole('button', { name: /Abrir cliente e mês/ }).click(); await pg.page.waitForTimeout(3000);
        const existente = pg.page.getByRole('button', { name: /^Abrir calendário existente$/ }).first();
        if (await existente.isVisible().catch(() => false)) await existente.click();
        else { await pg.page.getByRole('button', { name: /^Abrir materiais do mês$/ }).click({ timeout: 20000 }); await pg.page.waitForTimeout(3000);
          const aba = pg.page.getByRole('button', { name: /^Criar e aprovar$/ }).first(); if (await aba.isVisible().catch(() => false)) { await aba.click(); await pg.page.waitForTimeout(2500); }
          const ed = pg.page.getByRole('button', { name: /^Abrir editor oficial nesta competência$/ }).first(); await ed.evaluate(el => el.scrollIntoView({ block: 'center' })); await ed.click(); }
        const card = pg.page.locator(`[data-interno-cp123="${D.id}"]`); await card.waitFor({ state: 'attached', timeout: 30000 });
        await card.locator('[data-action="descartar-form"]').evaluate(el => el.click());
        await card.locator('[data-motivo-cp231]').fill('A dica fica como foi liberada (J84).');
        await card.locator('[data-action="descartar"]').evaluate(el => el.click());
        const ok = await esperar(async () => (await seed.get('calendarios_ajustes_internos_cp123', D.id))?.estado === 'substituido', 20000);
        tela3 = ok ? 'ok' : 'recusado: ' + (await pg.page.locator('.ai123 .aviso').first().innerText().catch(() => '(sem aviso)')).replace(/\s+/g, ' ').slice(0, 200);
        if (!ok) await foto(pg.page, 'J84-descartar-falha');
      } catch (e) { tela3 = 'falha: ' + String(e).replace(/\s+/g, ' ').slice(0, 220); await foto(pg.page, 'J84-descartar-falha').catch(() => {}); }
      finally { await pg.fechar(); } }
    d = await chamar('Chris', 'central_editor_ler');
    const docD = await seed.get('calendarios_ajustes_internos_cp123', D.id);
    fim('3 ajuste devolvido é descartado pela tela com motivo (versão liberada mantida)', tela3 === 'ok' && !ajuste(d, x => x.id === D.id) && docD?.estado === 'substituido' && !!docD?.descarteCp231?.motivo,
      `tela: ${tela3} · registro ${docD?.estado} · descarte ${docD?.descarteCp231 ? 'registrado' : 'AUSENTE'}`);
    // 4) postagem agendada → recusa
    d = await iniciar('calitem_j84_c', 'Retirar o agendado (J84).', 'retirada_cp219');
    fim('4 conteúdo com postagem agendada: retirada recusada com mensagem clara', /postagem agendada/.test(d.motivoRecusa || '') && !ajuste(d, x => x.itemId === 'calitem_j84_c'), d.motivoRecusa || 'ACEITA');
    // 5) vídeo na fila → aceita com aviso; envia e Amanda aprova
    d = await iniciar('calitem_j84_e', 'Vídeo não vai ao ar (J84).', 'retirada_cp219');
    let e5 = ajuste(d, x => x.itemId === 'calitem_j84_e');
    const aviso = e5?.avisoFilaCp231 || '';
    if (e5) { await chamar('Chris', 'central_editor_interno_enviar_cp123', { operacao: op(), assinaturaEsperada: e5.assinatura, ajusteId: e5.id }); d = await chamar('Amanda', 'central_editor_ler'); e5 = ajuste(d, x => x.id === e5.id);
      d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: e5.assinatura, ajusteId: e5.id, decisao: 'aprovar', motivo: '' }); e5 = ajuste(d, x => x.id === e5.id); }
    fim('5 conteúdo normal com vídeo na fila: retirada aceita com aviso de que a Amanda arquiva o vídeo', e5?.estado === 'aprovado' && /Amanda precisa arquiv/.test(aviso), `estado ${e5?.estado} · aviso: ${aviso.slice(0, 140) || '(nenhum)'}`);
    // 6) contraprova: Amanda não pede retirada
    let barrada = ''; try { const d6 = await chamar('Amanda', 'central_editor_ler'); await chamar('Amanda', 'central_editor_interno_iniciar_cp123', { operacao: op(), assinaturaEsperada: d6.assinatura, itemId: 'calitem_j84_b', motivo: 'x', esperadaRevisao: d6.ciclo.revisao, publicacaoHash: d6.internosCp123.publicacaoHash, tipoAjuste: 'retirada_cp219' }); } catch (e) { barrada = String(e.message || e); }
    fim('6 contraprova: a Amanda não pede retirada', /Somente o Chris/.test(barrada), barrada.slice(0, 160) || 'a Amanda conseguiu');
    // 7) liberação
    d = await chamar('Amanda', 'central_editor_ler');
    if (d.internosCp123?.disponivel !== true) { fim('7 liberação: retirados saem, aprovado chega ao cliente', false, 'liberação indisponível: ' + JSON.stringify(d.internosCp123?.motivos)); return; }
    await chamar('Amanda', 'central_editor_decidir', { operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '', assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const cal = await seed.get('calendarios', CLIENTE), m = cal.aprovacaoMeses[MES], ret = m.retratoLiberadoV115?.items || [];
    const it = id => (cal.items || []).find(i => i.itemId === id);
    const foraA = !ret.some(i => i.itemId === 'calitem_j84_a') && it('calitem_j84_a')?.excluido === true && !!it('calitem_j84_a')?.retiradaCp219 && it('calitem_j84_a')?.desc === 'Roteiro A J84.';
    const foraE = !ret.some(i => i.itemId === 'calitem_j84_e') && it('calitem_j84_e')?.excluido === true;
    const bOk = ret.some(i => i.itemId === 'calitem_j84_b' && i.desc === 'Roteiro novo calitem_j84_b');
    const dOk = ret.some(i => i.itemId === 'calitem_j84_d' && i.desc === 'Roteiro D J84.');
    const postC = await seed.get('postagens', 'video_j84_c'), postE = await seed.get('postagens', 'video_j84_e');
    fim('7 liberação: retirados saem do retrato (marcados, nada apagado), aprovado chega, descartado fica como liberado, postagens intactas', m.status === 'liberado' && foraA && foraE && bOk && dOk && postC?.status === 'agendado' && postE?.status === 'aguardando_legenda' && !erros.filter(erroGrave).length,
      `mês ${m.status} · A ${foraA ? 'fora (marcado, texto mantido)' : 'ERRADO'} · E ${foraE ? 'fora' : 'ERRADO'} · B ${bOk ? 'atualizado' : 'ERRADO'} · D ${dOk ? 'como liberado' : 'ERRADO'} · postagens ${postC?.status}/${postE?.status}`);
  } catch (e) { await foto(page, 'J84-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.slice(-6).join(' → ')); }
  finally { await fechar(); }
}
