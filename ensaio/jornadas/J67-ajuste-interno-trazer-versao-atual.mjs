// J67 — CP215 (13/11/2026): rascunho de ajuste interno feito sobre uma publicação anterior ficava preso ("A publicação deste mês
// mudou…") sem botão. Cenário (Hitech, fev/2027, processo antigo; ninguém mais usa este mês): peça adicional CP142 enviada sobre P1;
// o mês é publicado de novo (P2). Esperado: a tela diz quem faz o quê e oferece "Trazer para a versão atual"; trazida, a peça volta a
// rascunho com o MESMO texto (o anterior fica no histórico); Chris envia; Amanda aprova; a liberação leva a peça ao cliente.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { foto } from '../lib/navegador.mjs';
export const id = 'J67';
export const nome = 'Ajuste interno feito sobre publicação anterior é trazido para a versão atual (mesmo texto), aprovado e liberado';
const CLIENTE = 'hitech', MES = '2027-02', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const NOVA_DESC = 'Roteiro corrigido conforme o pedido do cliente (J67).';
const PECA = { day: 8, fmt: 'Carrossel', stage: 'Topo', name: 'Ensaio J67 — O calor chegou: ventiladores', ref: '', referenciaDispensada: true,
  desc: 'Slide 1: o calor chegou. Slides 2 a 5: modelos. Slide 6: chamada para a loja.', legenda: 'Calor? Venha escolher o seu ventilador. (J67)', obs: 'Fotos reais da loja.', preparacaoGravacao: '' };
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
  let n = 0; const op = () => 'ensaio_j67_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ciclo: CICLO, origemEditorial: 'continuar_legado', ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j67_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?|^ajuste_calendario_/, '').replace(/_cp1\d\d$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }
  // mês liberado antes do registro editorial (mesma montagem da J62), com uma publicação em `publicadoEm`
  const publicar = async (publicadoEm, alterar = {}) => {
    const cal0 = (await seed.get('calendarios', CLIENTE)) || {}; const { id: _x, ...semId } = cal0;
    const outros = (cal0.items || []).filter(i => i?.mes !== MES);
    const base = [
      { itemId: 'calitem_j67_reels', mes: MES, day: 12, name: 'Hitech — Reels da vitrine (J67)', desc: 'Roteiro original da vitrine.', legenda: 'Legenda da vitrine J67.', obs: '', fmt: 'Reel', stage: 'Topo', ref: '', excluido: false, apr: true },
      { itemId: 'calitem_j67_dica', mes: MES, day: 20, name: 'Hitech — Dica do técnico (J67)', desc: 'Roteiro original da dica.', legenda: 'Legenda da dica J67.', obs: '', fmt: 'Reel', stage: 'Meio', ref: '', excluido: false, apr: true },
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
    // (b) peça adicional enviada sobre P1
    await publicar('2026-10-20T12:00:00.000Z');
    let d = await chamar('Chris', 'central_editor_ler');
    const itemId = 'adicional_cp142_' + [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { operacao: op(), assinaturaEsperada: d.assinatura, itemId, motivo: 'A Amanda pediu um carrossel novo (J67).', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
    let a = d.internosCp123.ajustes.find(x => x.itemId === itemId);
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, conteudo: PECA });
    a = d.internosCp123.ajustes.find(x => x.id === a.id);
    await chamar('Chris', 'central_editor_interno_enviar_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    // o mês é publicado de novo (P2, com outro roteiro na dica) → a peça fica sobre uma versão anterior
    await publicar('2026-11-05T12:00:00.000Z', { calitem_j67_dica: { desc: 'Roteiro da dica revisado na publicação P2.' } });

    // 1) a peça antiga mostra "trazer para a versão atual" e a tela diz quem faz o quê
    d = await chamar('Amanda', 'central_editor_ler');
    a = d.internosCp123.ajustes.find(x => x.itemId === itemId);
    const quem = (d.internosCp123.motivos || []).join(' | ');
    fim('1 peça sobre versão anterior oferece "trazer para a versão atual" e diz quem faz o quê', !!a?.rebaseCp215?.disponivel && /traga o ajuste interno/.test(quem),
      a ? `trazer ${a.rebaseCp215?.disponivel ? 'disponível' : 'INDISPONÍVEL'} · motivos: ${quem.slice(0, 200) || '(nenhum)'}` : 'peça não listada');
    if (!a?.rebaseCp215?.disponivel) return;
    // 2) trazer, enviar, aprovar
    d = await chamar('Chris', 'central_editor_interno_rebase_cp123', { operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    const novo = d.internosCp123.ajustes.find(x => x.itemId === itemId);
    const mesmoTexto = novo?.conteudo?.name === PECA.name && novo?.estado === 'rascunho';
    await chamar('Chris', 'central_editor_interno_enviar_cp123', { operacao: op(), assinaturaEsperada: novo.assinatura, ajusteId: novo.id });
    d = await chamar('Amanda', 'central_editor_ler'); let nv = d.internosCp123.ajustes.find(x => x.id === novo.id);
    d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { operacao: op(), assinaturaEsperada: nv.assinatura, ajusteId: nv.id, decisao: 'aprovar', motivo: '' });
    nv = d.internosCp123.ajustes.find(x => x.id === novo.id);
    fim('2 peça trazida com o mesmo texto, enviada e aprovada pela Amanda', mesmoTexto && nv?.estado === 'aprovado', `texto ${mesmoTexto ? 'mantido (rascunho)' : 'PERDIDO'} · estado ${nv?.estado}`);
    // 3) a liberação leva a peça trazida para a versão atual
    d = await chamar('Amanda', 'central_editor_ler');
    const pode = d.internosCp123?.disponivel === true;
    if (!pode) { fim('3 a peça trazida é liberada ao cliente', false, 'liberação indisponível: ' + JSON.stringify(d.internosCp123?.motivos)); return; }
    await chamar('Amanda', 'central_editor_decidir', { operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const c3 = await seed.get('calendarios', CLIENTE), m = c3.aprovacaoMeses[MES], itens = m.retratoLiberadoV115?.items || [];
    const comPeca = itens.some(i => i.itemId === itemId && i.name === PECA.name);
    fim('3 a peça trazida é liberada ao cliente', m.status === 'liberado' && comPeca && !erros.filter(erroGrave).length, `mês ${m.status} · peça ${comPeca ? 'liberada' : 'FORA'} · ${etapas.slice(-4).join(' → ')}`);
  } catch (e) { await foto(page, 'J67-falha'); fim('fluxo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
  finally { await fechar(); }
}
