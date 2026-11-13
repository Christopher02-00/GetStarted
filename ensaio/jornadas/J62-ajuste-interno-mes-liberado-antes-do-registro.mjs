// J62 — CP210 (12/11/2026, Cookiery 2026-11 e mais 10 meses de novembro): mês liberado ANTES do registro editorial ficou
// com a continuidade em "publicada" sem histórico e sem a versão publicada registrada → o servidor não tinha prova de
// publicação → "Ajustes internos" sem nenhum conteúdo e sem "+ Adicionar". Cópia do estado real (Hitech no ensaio):
//  1. Chris lê o mês → o conteúdo liberado aparece para ajuste e a inclusão está disponível.
//  2. Chris ajusta o roteiro, envia → Amanda aprova e libera → o ajuste chega ao retrato e a continuidade passa a ter
//     a publicação registrada (dali em diante vale a conferência de sempre).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
export const id = 'J62';
export const nome = 'Mês liberado antes do registro editorial aceita ajuste interno (caso Cookiery)';
const CLIENTE = 'hitech', MES = '2026-11', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const NOVA_DESC = 'Roteiro ajustado pelo Chris depois da liberação (J62): abrir com o caminho até a loja.';

export async function executar({ amb, seed, registrar }) {
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
  let n = 0; const op = () => 'ensaio_j62_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ciclo: CICLO, origemEditorial: 'continuar_legado', ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j62_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp123$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }

  // Estado real da Cookiery: mês liberado pela Amanda em outubro, continuidade "publicada" sem histórico nem publicação registrada.
  const publicadoEm = '2026-10-16T21:04:27.396Z';
  const cal0 = (await seed.get('calendarios', CLIENTE)) || {}; const { id: _x, ...semId } = cal0;
  const outros = (cal0.items || []).filter(i => i?.mes !== MES);
  const meus = [
    { itemId: 'calitem_j62_trend', mes: MES, day: 20, name: 'Hitech — Trend caminho (J62)', desc: 'Roteiro original da trend do caminho.', legenda: 'Legenda original J62.', obs: 'Corte rápido.', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true },
    { itemId: 'calitem_j62_dica', mes: MES, day: 25, name: 'Hitech — Dica do técnico (J62)', desc: 'Roteiro original da dica.', legenda: 'Legenda da dica J62.', obs: '', fmt: 'Reel', stage: 'Meio', ref: '', excluido: false, apr: true },
  ];
  const cal = { cliente: CLIENTE, client: 'Hitech', ...semId, items: [...outros, ...meus] };
  const retrato = criarRetratoLiberadoV115(cal, MES, 'Amanda', publicadoEm);
  cal.aprovacaoMeses = mapaAprovacaoAposPublicar(cal.aprovacaoMeses || {}, MES, 'Amanda', publicadoEm, [], retrato);
  await seed.set('calendarios', CLIENTE, cal);
  const proc = await seed.get('processo_calendarios_i164', 'ativo');
  await seed.set('continuidade_calendarios_i164', CICLO, { schema: 1, ativo: true, modo: 'continuar_legado', cliente: CLIENTE, competencia: MES, ativacaoId: proc.ativacaoId, revisao: 1,
    editorialI172: { schema: 1, revisao: 1, fase: 'publicada', rodada: 0 } });
  await amb.aguardarFunctionsOciosas?.();

  try {
    let d = await chamar('Chris', 'central_editor_ler');
    const apto = (d.internosCp123?.aptos || []).find(a => a.itemId === 'calitem_j62_trend');
    fim('1 Chris vê o conteúdo liberado para ajuste e a inclusão', !!apto && d.internosCp123.adicionar === true,
      `aptos ${(d.internosCp123?.aptos || []).length} · ${apto ? 'Dia ' + apto.dia + ' · ' + apto.titulo : 'Trend caminho NÃO aparece'} · adicionar ${d.internosCp123?.adicionar === true ? 'sim' : 'NÃO'}`);
    if (!apto) return;
    d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { operacao: op(), assinaturaEsperada: d.assinatura, itemId: apto.itemId, motivo: 'A Amanda pediu para abrir com o caminho até a loja (J62).',
      esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash });
    let a = d.internosCp123.ajustes.find(x => x.itemId === apto.itemId);
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, conteudo: { ...a.conteudo, desc: NOVA_DESC } });
    a = d.internosCp123.ajustes.find(x => x.id === a.id);
    await chamar('Chris', 'central_editor_interno_enviar_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    d = await chamar('Amanda', 'central_editor_ler'); a = d.internosCp123.ajustes.find(x => x.id === a.id);
    await chamar('Amanda', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '' });
    d = await chamar('Amanda', 'central_editor_ler');
    await chamar('Amanda', 'central_editor_decidir', { operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const c2 = await seed.get('calendarios', CLIENTE), m = c2.aprovacaoMeses[MES], k = await seed.get('continuidade_calendarios_i164', CICLO);
    const noRetrato = m.retratoLiberadoV115?.items?.find(i => i.itemId === 'calitem_j62_trend')?.desc === NOVA_DESC;
    const registrada = k?.editorialI172?.publicacaoAtual?.em === m.retratoLiberadoV115?.publicadoEm;
    fim('2 ajuste enviado, aprovado e liberado; a publicação passa a ficar registrada', m.status === 'liberado' && noRetrato && registrada,
      `mês ${m.status} · retrato ${noRetrato ? 'com o ajuste' : 'SEM o ajuste'} · publicação ${registrada ? 'registrada na continuidade' : 'NÃO registrada'} · ${etapas.join(' → ')}`);
  } catch (e) { fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
}
