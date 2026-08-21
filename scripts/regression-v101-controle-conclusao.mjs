#!/usr/bin/env node

import assert from 'node:assert/strict';
import cryptoNode from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escritorio = fs.readFileSync(path.join(raiz, 'escritorio.html'), 'utf8');
let total = 0;

function exigir(condicao, mensagem){
  total++;
  if(!condicao) throw new Error('V101 CONTROLE DE CONCLUSÃO: ' + mensagem);
  console.log('PASS ', mensagem);
}

function trecho(fonte, inicio, fim){
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) throw new Error('V101 CONTROLE DE CONCLUSÃO: trecho ausente ' + inicio);
  return fonte.slice(a, b);
}

function copia(valor){
  return valor == null ? valor : structuredClone(valor);
}

function snapshot(dados){
  const lista = dados.map(({id, data}) => ({ id, data: () => copia(data) }));
  return { forEach(fn){ lista.forEach(fn); } };
}

function storageSintetico(){
  const dados = new Map();
  return {
    getItem(chave){ return dados.has(String(chave)) ? dados.get(String(chave)) : null; },
    setItem(chave, valor){ dados.set(String(chave), String(valor)); },
    removeItem(chave){ dados.delete(String(chave)); },
    clear(){ dados.clear(); },
    chaves(){ return [...dados.keys()]; }
  };
}

function noSintetico(){
  return {
    innerHTML: '', textContent: '', value: '', checked: false,
    classList: { add(){}, remove(){}, toggle(){ return true; } },
    replaceChildren(){ this.innerHTML = ''; this.textContent = ''; }
  };
}

function referencia(...args){
  const primeira = args.shift();
  const partes = primeira?.path ? [primeira.path, ...args] : (primeira?.__db ? args : [primeira, ...args]);
  return { path: partes.filter(v => v !== undefined && v !== null && v !== '').map(String).join('/') };
}

function snapEstado(valor){
  return {
    exists(){ return valor !== undefined; },
    data(){ return copia(valor); }
  };
}

const blocoV101 = trecho(
  escritorio,
  '  /* ===== CONTROLE DE CONCLUSÃO V101',
  '  window.renderVisaoCalendarios = async function'
);

function criarAmbiente(opcoes = {}){
  const estado = opcoes.estado || new Map();
  const storage = opcoes.storage || storageSintetico();
  const escritas = opcoes.escritas || [];
  const nos = new Map([
    ['controleConclusaoCalendariosBox', noSintetico()],
    ['ccEstadoFonte', noSintetico()],
    ['ccCompetencia', noSintetico()]
  ]);
  const db = { __db: true };
  const window = {
    __pessoaAutenticadaReal: opcoes.real || opcoes.papel || 'Cecília',
    __uid: opcoes.uid || 'uid-fixture'
  };
  const auth = { currentUser: opcoes.uid === '' ? null : { uid: opcoes.uid || 'uid-fixture' } };

  async function getDocPadrao(ref){ return snapEstado(estado.get(ref.path)); }
  async function runTransactionPadrao(_db, executar){
    const pendentes = [];
    const tx = {
      async get(ref){ return snapEstado(estado.get(ref.path)); },
      set(ref, dados){ pendentes.push({ operacao: 'set', path: ref.path, dados: copia(dados) }); },
      update(ref, dados){ pendentes.push({ operacao: 'update', path: ref.path, dados: copia(dados) }); }
    };
    const resultado = await executar(tx);
    pendentes.forEach(registro => {
      const anterior = estado.get(registro.path) || {};
      const dados = registro.operacao === 'update' ? {...copia(anterior), ...copia(registro.dados)} : copia(registro.dados);
      estado.set(registro.path, dados);
      escritas.push({...registro, dados:copia(dados)});
    });
    return resultado;
  }

  const ordem = {
    aguardando_legenda: 2,
    aguardando_agendamento: 3,
    agendado: 4,
    postado: 5
  };
  const contexto = vm.createContext({
    console,
    window,
    document: {
      getElementById(id){ if(!nos.has(id)) nos.set(id, noSintetico()); return nos.get(id); }
    },
    usuarioAtual: opcoes.papel || 'Cecília',
    auth,
    db,
    crypto: cryptoNode.webcrypto,
    TextEncoder,
    sessionStorage: storage,
    collection: (...args) => referencia(...args),
    doc: (...args) => referencia(...args),
    query: ref => ref,
    where: () => ({}),
    getDocs: opcoes.getDocs || (async () => snapshot([])),
    getDoc: opcoes.getDoc || getDocPadrao,
    runTransaction: opcoes.runTransaction || runTransactionPadrao,
    serverTimestamp: () => '2026-08-21T17:30:00.000Z',
    slugClienteCanonico(valor){
      const slug = String(valor || '');
      return ({'cliente-a-alias':'cliente-a','cliente-a-antigo':'cliente-a'}[slug] || slug);
    },
    mesDoItemCalendario(cal, item){ return String(item?.mes || cal?.month || ''); },
    ORDEM_STATUS_POSTAGEM: ordem,
    escolherPostagemCanonicaPorVideo(postagens, preferida){
      const lista = [...(postagens || [])];
      const exata = lista.find(p => String(p.id) === String(preferida || ''));
      if(exata) return exata;
      return lista.sort((a,b)=>(ordem[b.status]||0)-(ordem[a.status]||0))[0] || null;
    },
    obterCalendariosCompartilhados: opcoes.obterCalendariosCompartilhados || (async () => snapshot([])),
    __erroCalendariosCompartilhado: opcoes.erroCalendarios || null,
    hojeLocal: () => '2026-08-21',
    esc: valor => String(valor ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),
    escAttr: valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    mostrarToast(){},
    prompt: () => null,
    confirm: () => true
  });
  new vm.Script(blocoV101, { filename:'v101-controle-conclusao-sandbox.js' }).runInContext(contexto);
  return {
    contexto, api:window.__controleConclusaoV101Teste, window, auth, db,
    estado, storage, escritas, nos, getDocPadrao, runTransactionPadrao
  };
}

function baseAlvo(){
  const item = { itemId:'item_fixture_1', mes:'2026-08', name:'Título sintético', desc:'Roteiro sintético' };
  const video = { id:'video_fixture_1', calendarItemId:item.itemId, calendarClienteSlug:'cliente-a', status:'finalizado', finalizadoVia:'entrega_direta' };
  const postagem = { id:'post_fixture_1', videoId:video.id, status:'aguardando_agendamento' };
  return {
    calendarId:'cliente-a', competencia:'2026-08', itemId:item.itemId,
    clienteCanonico:'cliente-a', item, calAtualizadoEm:'versao-fixture-1',
    videos:[video], postagens:[postagem], encerramento:null
  };
}

async function prepararAlvo(api, estado, alteracoes = {}){
  const alvo = {...baseAlvo(), ...copia(alteracoes)};
  alvo.item = {...baseAlvo().item, ...(alteracoes.item || {})};
  alvo.videos = alteracoes.videos ? copia(alteracoes.videos) : copia(baseAlvo().videos);
  alvo.postagens = alteracoes.postagens ? copia(alteracoes.postagens) : copia(baseAlvo().postagens);
  alvo.encerramento = Object.hasOwn(alteracoes, 'encerramento') ? copia(alteracoes.encerramento) : null;
  estado.set('calendarios/'+alvo.calendarId, { updatedAt:alvo.calAtualizadoEm, items:[copia(alvo.item)] });
  alvo.videos.forEach(v => estado.set('videos_producao/'+v.id, copia(v)));
  alvo.postagens.forEach(p => estado.set('postagens/'+p.id, copia(p)));
  if(alvo.encerramento) estado.set(
    `calendarios_encerramentos/${alvo.calendarId}/competencias/${alvo.competencia}/itens/${alvo.itemId}`,
    copia(alvo.encerramento)
  );
  alvo.assinaturaBase = await api.assinaturaFonteItemConclusao(alvo, false);
  alvo.fonteAssinatura = await api.assinaturaFonteItemConclusao(alvo, true);
  return alvo;
}

/* Estrutura, escopo de papel e integração com V100. */
exigir(escritorio.includes('gs-build" content="2026-08-21-controle-conclusao-calendarios-v101'), 'build V101 identifica a entrega');
exigir(escritorio.includes('data-calsub="conclusao"') && escritorio.includes('id="calSubConclusao"'), 'aba e painel de conclusão existem na experiência atual de Calendários');
const papeisCalendario = trecho(escritorio, '  const CAL_SUBS_POR_PESSOA = {', '  /* As ferramentas de edição');
exigir(/'Cecília':\s*\[[^\]]*'conclusao'/.test(papeisCalendario), 'Cecília recebe a subseção de conclusão');
exigir(/'Chris':\s*\[[^\]]*'conclusao'/.test(papeisCalendario), 'Chris recebe a subseção de auditoria');
exigir(!/'Gabrielle':\s*\[[^\]]*'conclusao'/.test(papeisCalendario), 'Gabi não recebe nova obrigação nem DOM de conclusão');
exigir(!/'Amanda':\s*\[[^\]]*'conclusao'/.test(papeisCalendario), 'Amanda não recebe nova obrigação nem DOM de conclusão');
exigir(!/'Luís':\s*\[[^\]]*'conclusao'/.test(papeisCalendario) && !/'Nathan':\s*\[[^\]]*'conclusao'/.test(papeisCalendario), 'videomakers não recebem a subseção');
exigir(escritorio.includes('Object.keys({visao:1,conclusao:1,editar:1') && escritorio.includes("definirNoCalendarioPorPapel(id, permitidas.includes(chave))"), 'isolamento remove botão e painel do DOM de papéis indevidos');
exigir(escritorio.includes("if(qual === 'conclusao') renderControleConclusaoCalendarios()"), 'roteador da aba aciona o único renderizador V101');

const sincronizacao = trecho(escritorio, '  async function sincronizarItemDoCalendario', '  window.salvarAgendamentoPostagem = async function');
exigir(sincronizacao.indexOf('postagemEhDeclaracaoSemPauta(p)') < sincronizacao.indexOf("doc(db,'calendarios'"), 'V100 manual sem vínculo sai antes de ler ou alterar calendário');
exigir(sincronizacao.includes('calendarioPreservado:true'), 'declaração factual V100 devolve recibo explícito de calendário preservado');
exigir(sincronizacao.includes('itemId: gerarItemIdCalendarioV101(postagemId)'), 'novo item recebe identidade estável derivada da postagem');
exigir(sincronizacao.includes('items[idx].itemId||novoItem.itemId'), 'ação explícita pode endurecer legado sem migração na renderização');
exigir(!blocoV101.includes("setDoc(doc(db,'calendarios'") && !blocoV101.includes("updateDoc(doc(db,'calendarios'"), 'módulo de controle não possui escritor do calendário');

const fonteVinculoPostagem = trecho(escritorio, '  async function postagemComVinculoDaProducao', '  window.escolherPostagemCanonicaPorVideo');
function contextoVinculoPostagem(getDoc){
  const contexto = vm.createContext({
    console:{error(){}},db:{__db:true},doc:(...args)=>referencia(...args),getDoc
  });
  new vm.Script(`${fonteVinculoPostagem}\nglobalThis.confirmarVinculo=postagemComVinculoDaProducao;`).runInContext(contexto);
  return contexto;
}
await assert.rejects(
  contextoVinculoPostagem(async()=>{throw Object.assign(new Error('negado'),{code:'permission-denied'});})
    .confirmarVinculo({videoId:'video_fixture_sem_leitura'}),
  erro => erro?.code === 'permission-denied' && /calendário foi preservado/.test(erro.message)
);
exigir(true, 'falha ao ler vídeo de origem preserva o calendário e não inventa vínculo');
await assert.rejects(
  contextoVinculoPostagem(async()=>snapEstado(undefined)).confirmarVinculo({videoId:'video_fixture_ausente'}),
  erro => erro?.code === 'gs/vinculo-indisponivel'
);
exigir(true, 'vídeo de origem ausente falha fechado antes de sincronizar calendário');

const fonteId = trecho(escritorio, '  function gerarItemIdCalendarioV101', '  async function sincronizarItemDoCalendario');
const contextoId = vm.createContext({crypto:{randomUUID:cryptoNode.randomUUID},Date,Math,window:{}});
new vm.Script(`${fonteId}\nglobalThis.gerar=gerarItemIdCalendarioV101;`).runInContext(contextoId);
exigir(contextoId.gerar('post_fixture_1') === 'calitem_post_post_fixture_1', 'mesma postagem produz o mesmo itemId idempotente');
exigir(contextoId.gerar('post/estranho?') === 'calitem_post_post_estranho_', 'semente é normalizada para identidade segura');
const idsNovos = new Set(Array.from({length:100}, () => contextoId.gerar()));
exigir(idsNovos.size === 100 && [...idsNovos].every(id => /^item_[a-f0-9]{32}$/.test(id)), 'fallback sem semente produz 100 IDs válidos e sem colisão');

/* Mapeamento cliente + competência e ambiguidade fechada. */
const ambiente = criarAmbiente();
const api = ambiente.api;
let cards = api.mapaCalendariosControlePorClienteCompetencia(snapshot([
  {id:'cliente-a',data:{client:'Cliente A',items:[
    {itemId:'i-ago',mes:'2026-08',name:'Agosto'},
    {itemId:'i-set',mes:'2026-09',name:'Setembro'},
    {itemId:'i-fora',mes:'2026-08',name:'Arquivado',excluido:true},
    {itemId:'i-sem-mes',name:'Sem competência'}
  ]}},
  {id:'cliente-excluido',data:{excluido:true,items:[{itemId:'x',mes:'2026-08'}]}}
]));
exigir(cards.length === 2, 'um documento gera um cartão por competência válida');
exigir(cards.map(c=>c.competencia).join(',') === '2026-08,2026-09', 'competências são separadas e ordenadas');
exigir(cards[0].itens.length === 1 && cards[0].itens[0].item.itemId === 'i-ago', 'excluídos e itens sem competência não entram no total');

cards = api.mapaCalendariosControlePorClienteCompetencia(snapshot([
  {id:'cliente-a',data:{client:'Cliente A',items:[{itemId:'i-1',mes:'2026-08'}]}},
  {id:'cliente-a-alias',data:{client:'Cliente A antigo',items:[{itemId:'i-2',mes:'2026-08'}]}}
]));
exigir(cards.length === 1 && cards[0].ambigua === true, 'canônico e alias preenchidos na mesma competência viram fonte ambígua');
exigir(cards[0].itens.length === 0 && cards[0].origens.length === 2, 'ambiguidade não soma itens nem escolhe origem por suposição');

cards = api.mapaCalendariosControlePorClienteCompetencia(snapshot([
  {id:'cliente-a',data:{items:[{itemId:'duplicado',mes:'2026-08'},{itemId:'duplicado',mes:'2026-08'}]}}
]));
exigir(cards[0].itemIdsDuplicados.has('duplicado'), 'itemId duplicado é marcado como inconsistência rastreável');

/* Resolvedor usa fontes existentes e mantém conferência fora do workflow. */
const resolver = api.resolverEstadoItemConclusao;
const item = {itemId:'item-1',postagemId:'post-direto'};
const video = {id:'video-1',calendarItemId:'item-1',calendarClienteSlug:'cliente-a',status:'finalizado',finalizadoVia:'entrega_direta'};
let resolucao = resolver({item,videos:[video],postagens:[{id:'post-1',videoId:'video-1',status:'postado'}],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'publicado' && resolucao.terminal && resolucao.conferivel, 'postagem publicada é conclusão operacional automática');

for(const finalizadoVia of ['trabalho_externo','so_edicao','video_trafego','entrega_direta','arquivado_sem_legenda','marcado_manual_sem_agendamento']){
  resolucao = resolver({item,videos:[{...video,finalizadoVia}],postagens:[],clienteCanonico:'cliente-a'});
  exigir(resolucao.tipo === 'entregue_diretamente' && resolucao.terminal, `finalização direta reconhecida — ${finalizadoVia}`);
}
for(const finalizadoVia of [
  'entrega_direta (conciliador)','video_trafego (conciliador)',
  'entrega_direta (conciliador retroativo)','video_trafego (conciliador retroativo)'
]){
  resolucao = resolver({item,videos:[{...video,finalizadoVia}],postagens:[],clienteCanonico:'cliente-a'});
  exigir(resolucao.tipo === 'entregue_diretamente' && resolucao.terminal, `finalização conciliada reconhecida — ${finalizadoVia}`);
}
resolucao = resolver({item,videos:[{...video,finalizadoVia:'valor_desconhecido'}],postagens:[],clienteCanonico:'cliente-a'});
exigir(!resolucao.terminal && resolucao.tipo === 'planejado', 'status finalizado sem origem permitida não falsifica conclusão');

const intermediariosPost = [
  ['agendado','agendado'],
  ['aguardando_agendamento','aguardando_agendamento'],
  ['aguardando_legenda','aguardando_legenda']
];
for(const [status,tipo] of intermediariosPost){
  resolucao = resolver({item,videos:[{...video,status:'aguardando_edicao',finalizadoVia:''}],postagens:[{id:'post-1',videoId:'video-1',status}],clienteCanonico:'cliente-a'});
  exigir(resolucao.tipo === tipo && !resolucao.terminal, `estado intermediário de postagem permanece pendente — ${status}`);
}
for(const [status,tipo] of [['aguardando_cliente','aguardando_cliente'],['aguardando_aprovacao','aguardando_aprovacao'],['correcao','correcao'],['aguardando_edicao','aguardando_edicao']]){
  resolucao = resolver({item,videos:[{...video,status,finalizadoVia:''}],postagens:[],clienteCanonico:'cliente-a'});
  exigir(resolucao.tipo === tipo && !resolucao.terminal, `estado intermediário de vídeo permanece pendente — ${status}`);
}
resolucao = resolver({item:{...item,gravado:true},videos:[],postagens:[],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'captado' && !resolucao.terminal, 'captação sozinha não significa conclusão mensal');
resolucao = resolver({item,videos:[],postagens:[],clienteCanonico:'cliente-a',fontes:{erroProducao:true}});
exigir(resolucao.tipo === 'indisponivel' && resolucao.erro && !resolucao.terminal, 'erro/timeout/permissão não vira 0% nem pendência legítima');
resolucao = resolver({item,videos:[],postagens:[],clienteCanonico:'cliente-a',ambigua:true});
exigir(resolucao.tipo === 'inconsistente' && resolucao.erro, 'vínculo ambíguo bloqueia cálculo');

resolucao = resolver({item:{name:'Legado',posted:true},videos:[],postagens:[],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'legado_publicado' && resolucao.terminal && !resolucao.conferivel, 'legado publicado permanece visível e somente leitura');
resolucao = resolver({item:{name:'Legado'},videos:[],postagens:[],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'legado_pendente' && !resolucao.terminal && !resolucao.conferivel, 'legado sem itemId não recebe escrita silenciosa');
resolucao = resolver({item,videos:[{...video,calendarItemId:null,vinculoSessao:'declarado_sem_pauta'}],postagens:[],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'planejado' && !resolucao.terminal, 'vídeo manual V100 sem calendarItemId nunca casa por título');
resolucao = resolver({item,videos:[{...video,calendarClienteSlug:'outro-cliente'}],postagens:[],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'planejado', 'vídeo de outro cliente não conclui o item');
resolucao = resolver({item,videos:[],postagens:[{id:'post-direto',status:'postado',cliente:'cliente-a',excluido:true}],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'planejado' && !resolucao.terminal, 'postagem direta excluída não conclui o item');
resolucao = resolver({item,videos:[],postagens:[{id:'post-direto',status:'postado',cliente:'outro-cliente'}],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'planejado' && !resolucao.terminal, 'postagem direta de outro cliente não conclui o item');
resolucao = resolver({item,videos:[],postagens:[{id:'post-direto',status:'postado',cliente:'cliente-a'}],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'publicado' && resolucao.terminal, 'postagem direta íntegra do mesmo cliente conclui o item');
resolucao = resolver({
  item,videos:[video],
  postagens:[{id:'post-ligado-outro-cliente',videoId:video.id,status:'postado',cliente:'outro-cliente'}],
  clienteCanonico:'cliente-a'
});
exigir(
  resolucao.tipo === 'inconsistente' && resolucao.erro && !resolucao.terminal,
  'postagem ligada ao vídeo com cliente divergente bloqueia conclusão'
);
resolucao = resolver({item,videos:[video,{...video,id:'video-2'}],postagens:[],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'inconsistente' && resolucao.erro, 'dois vídeos no mesmo item não são escolhidos por conveniência');
resolucao = resolver({item,videos:[video],postagens:[
  {id:'post-1',videoId:'video-1',status:'agendado'},
  {id:'post-2',videoId:'video-1',status:'agendado'}
],clienteCanonico:'cliente-a'});
exigir(resolucao.tipo === 'inconsistente' && resolucao.erro, 'empate de postagens canônicas bloqueia conclusão');

const fechamentoValido = {encerrado:true,fonteAssinatura:'base-correta'};
resolucao = resolver({item,videos:[],postagens:[],clienteCanonico:'cliente-a',assinaturaBase:'base-correta',encerramento:fechamentoValido});
exigir(resolucao.tipo === 'encerrado_com_justificativa' && resolucao.excepcional && resolucao.terminal, 'encerramento excepcional só conta com assinatura atual');
resolucao = resolver({item,videos:[],postagens:[],clienteCanonico:'cliente-a',assinaturaBase:'base-nova',encerramento:fechamentoValido});
exigir(!resolucao.terminal && resolucao.tipo === 'planejado', 'mudança operacional invalida encerramento antigo sem apagar histórico');
const comConferencia = resolver({item,videos:[video],postagens:[],clienteCanonico:'cliente-a',conferencia:{conferido:true}});
const semConferencia = resolver({item,videos:[video],postagens:[],clienteCanonico:'cliente-a'});
exigir(comConferencia.tipo === semConferencia.tipo && comConferencia.terminal === semConferencia.terminal, 'conferência da Cecília não altera o estado operacional');

/* Assinatura mínima: determinística, sensível ao estado e sem texto/PII. */
const assinaturaA = baseAlvo();
assinaturaA.item.name = 'Pessoa Real Não Deve Entrar';
assinaturaA.item.desc = 'Roteiro com informação privada';
assinaturaA.videos[0].titulo = 'Título privado';
assinaturaA.postagens[0].legenda = 'Legenda privada';
const assinaturaB = copia(assinaturaA);
assinaturaB.item.name = 'Outro título';
assinaturaB.item.desc = 'Outro roteiro';
assinaturaB.videos[0].titulo = 'Outro título de vídeo';
assinaturaB.postagens[0].legenda = 'Outra legenda';
let hashA = await api.assinaturaFonteItemConclusao(assinaturaA, false);
let hashB = await api.assinaturaFonteItemConclusao(assinaturaB, false);
exigir(hashA === hashB, 'título, roteiro e legenda não entram na assinatura persistida');
exigir(/^[a-f0-9]{64}$/.test(hashA) && !hashA.includes('Pessoa'), 'assinatura é SHA-256 opaca, sem PII legível');
const apenasUpdatedAtGlobal = {...copia(assinaturaA),calAtualizadoEm:'outra-competencia-alterou-o-documento'};
exigir(hashA === await api.assinaturaFonteItemConclusao(apenasUpdatedAtGlobal,false), 'updatedAt global do calendário não invalida item de outra competência');
assinaturaB.videos[0].status = 'correcao';
hashB = await api.assinaturaFonteItemConclusao(assinaturaB, false);
exigir(hashA !== hashB, 'mudança no estado operacional altera a assinatura');
const videoExcluidoAssinatura = copia(assinaturaA); videoExcluidoAssinatura.videos[0].excluido = true;
const videoOutroClienteAssinatura = copia(assinaturaA); videoOutroClienteAssinatura.videos[0].cliente = 'outro-cliente';
const postExcluidoAssinatura = copia(assinaturaA); postExcluidoAssinatura.postagens[0].excluido = true;
const postOutroClienteAssinatura = copia(assinaturaA); postOutroClienteAssinatura.postagens[0].cliente = 'outro-cliente';
exigir(
  (await api.assinaturaFonteItemConclusao(videoExcluidoAssinatura,false)) !== hashA &&
  (await api.assinaturaFonteItemConclusao(videoOutroClienteAssinatura,false)) !== hashA &&
  (await api.assinaturaFonteItemConclusao(postExcluidoAssinatura,false)) !== hashA &&
  (await api.assinaturaFonteItemConclusao(postOutroClienteAssinatura,false)) !== hashA,
  'soft-delete e identidade de cliente de vídeo/postagem participam da assinatura'
);
const ordenada = baseAlvo();
ordenada.videos.push({...ordenada.videos[0],id:'video_fixture_2',calendarItemId:'outro'});
ordenada.postagens.push({...ordenada.postagens[0],id:'post_fixture_2',videoId:'video_fixture_2'});
const invertida = {...copia(ordenada),videos:[...copia(ordenada.videos)].reverse(),postagens:[...copia(ordenada.postagens)].reverse()};
exigir(await api.assinaturaFonteItemConclusao(ordenada,false) === await api.assinaturaFonteItemConclusao(invertida,false), 'ordem de leitura não altera a assinatura');
const comFechamento = {...baseAlvo(),encerramento:{encerrado:true,revision:1,fonteAssinatura:'a'.repeat(64)}};
exigir(await api.assinaturaFonteItemConclusao(comFechamento,false) === await api.assinaturaFonteItemConclusao({...comFechamento,encerramento:{...comFechamento.encerramento,revision:2}},false), 'assinatura base não depende da projeção de encerramento');
exigir(await api.assinaturaFonteItemConclusao(comFechamento,true) !== await api.assinaturaFonteItemConclusao({...comFechamento,encerramento:{...comFechamento.encerramento,revision:2}},true), 'assinatura de conferência detecta encerramento alterado');

const fonteSha = trecho(escritorio, '  function sha256PuroControle', '  async function assinaturaFonteItemConclusao');
const contextoShaPuro = vm.createContext({TextEncoder});
new vm.Script(`${fonteSha}\nglobalThis.sha256ControleTeste=sha256Controle;`).runInContext(contextoShaPuro);
exigir(
  await contextoShaPuro.sha256ControleTeste('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  'fallback SHA-256 puro confere com vetor conhecido'
);
const contextoShaSemEncoder = vm.createContext({});
new vm.Script(`${fonteSha}\nglobalThis.sha256ControleTeste=sha256Controle;`).runInContext(contextoShaSemEncoder);
await assert.rejects(
  contextoShaSemEncoder.sha256ControleTeste('abc'),
  erro => erro?.code === 'gs/sha256-indisponivel'
);
exigir(true, 'assinatura falha fechada sem TextEncoder');

/* Interface: progresso operacional e conferência aparecem separados. */
function estadoUi(nome, tipo, terminal, conferivel, conferenciaAtual=false, extras={}){
  return {
    item:{name:nome,itemId:extras.itemId || 'item_'+nome.replace(/\W/g,'_')},
    erroConferencia:!!extras.erroConferencia, erroEncerramento:!!extras.erroEncerramento,
    alvo:{
      itemId:extras.itemId || 'item_'+nome.replace(/\W/g,'_'),
      resolucao:{tipo,rotulo:tipo,terminal,conferivel,erro:!!extras.erro,legado:!!extras.legado},
      conferenciaAtual, conferencia:conferenciaAtual?{conferido:true,fonteAssinatura:'x'}:null,
      fonteAssinatura:'x',assinaturaBase:'x',encerramento:null
    }
  };
}
const dadosUi = {cards:[
  {calendarId:'cliente-a',clienteCanonico:'cliente-a',nome:'Cliente A',competencia:'2026-08',estados:[
    estadoUi('Publicado','publicado',true,true,false),
    estadoUi('Pendente','aguardando_edicao',false,false,false)
  ]},
  {calendarId:'cliente-antigo',clienteCanonico:'cliente-antigo',nome:'Cliente anterior',competencia:'2026-07',estados:[
    estadoUi('Antigo','planejado',false,false,false)
  ]}
]};
let renderizou = api.renderizarControleConclusaoComDados(dadosUi,'2026-08',api.estado().geracao);
let html = ambiente.nos.get('controleConclusaoCalendariosBox').innerHTML;
exigir(renderizou === true && html.includes('1/2 · 50%'), 'cartão calcula 50% a partir do workflow, sem depender de checkbox');
exigir(html.includes('Conferência Cecília: 0/1') && html.includes('Fluxo:'), 'interface separa progresso operacional de conferência administrativa');
exigir(html.includes('Pendências de competências anteriores') && html.includes('Cliente anterior'), 'pendência atravessa a virada de competência');
exigir(!html.includes('1/2 · 100%'), 'checkbox ou total conferido não falsifica 100% operacional');

const uiErro = {cards:[{calendarId:'cliente-a',nome:'Falha sintética',competencia:'2026-08',estados:[estadoUi('Erro','indisponivel',false,false,false,{erro:true})]}]};
api.renderizarControleConclusaoComDados(uiErro,'2026-08',api.estado().geracao);
html = ambiente.nos.get('controleConclusaoCalendariosBox').innerHTML;
exigir(html.includes('data-cc-estado="indisponivel"') && html.includes('não deve ser tratado como confirmação final'), 'falha de fonte é indisponibilidade explícita, não mês vazio');
const ambienteChrisErro = criarAmbiente({papel:'Chris',real:'Chris',uid:'uid-chris'});
ambienteChrisErro.api.renderizarControleConclusaoComDados(uiErro,'2026-08',ambienteChrisErro.api.estado().geracao);
const htmlChrisErro = ambienteChrisErro.nos.get('controleConclusaoCalendariosBox').innerHTML;
exigir(
  !htmlChrisErro.includes('data-cc-acao="conferencia"') && !htmlChrisErro.includes('data-cc-acao="encerramento"'),
  'erro de calendário bloqueia conferência e encerramento, inclusive para Chris'
);

const ambienteGabi = criarAmbiente({papel:'Gabrielle',real:'Gabrielle',uid:'uid-gabi'});
let loaderGabi = 0;
ambienteGabi.api.definirLoaderSintetico(async()=>{loaderGabi++;return {cards:[],fontes:{}};});
exigir(await ambienteGabi.window.renderControleConclusaoCalendarios() === false && loaderGabi === 0, 'papel indevido não aciona nem o loader da seção');

let liberarLoader;
const promessaLoader = new Promise(resolve => { liberarLoader = resolve; });
api.definirLoaderSintetico(() => promessaLoader);
const renderAntigo = ambiente.window.renderControleConclusaoCalendarios();
api.limparControleConclusaoCalendarios();
liberarLoader({cards:[],fontes:{videos:{erros:[]},postagens:{erros:[]},postagensDiretas:{erros:[]},conferencias:{erros:[]},encerramentos:{erros:[]}}});
exigir(await renderAntigo === false, 'troca/limpeza de papel invalida renderização assíncrona antiga');
exigir(ambiente.nos.get('controleConclusaoCalendariosBox').innerHTML === '', 'resultado atrasado não repovoa o DOM depois da limpeza');
api.limparLoaderSintetico();

/* Toda competência permanece disponível até fluxo + conferência serem provados. */
const ambienteRecorte = criarAmbiente({
  papel:'Cecília',real:'Cecília',uid:'uid-cecilia',
  obterCalendariosCompartilhados:async()=>snapshot([
    {id:'cliente-agosto',data:{client:'Agosto',items:[{itemId:'i-ago',mes:'2026-08',posted:false}]}},
    {id:'cliente-julho',data:{client:'Julho',items:[{itemId:'i-jul',mes:'2026-07',posted:true}]}},
    {id:'cliente-junho',data:{client:'Junho pendente',items:[{itemId:'i-jun',mes:'2026-06',posted:false}]}},
    {id:'cliente-maio',data:{client:'Maio publicado',items:[{itemId:'i-mai',mes:'2026-05',posted:true}]}}
  ])
});
const dadosRecorte = await ambienteRecorte.api.carregarControleConclusaoCalendarios(true);
exigir(
  dadosRecorte.cards.map(c=>c.competencia).join(',') === '2026-05,2026-06,2026-07,2026-08' &&
  dadosRecorte.competenciasDisponiveis.includes('2026-05'),
  'carregamento preserva todas as competências até conclusão composta comprovada'
);
ambienteRecorte.api.renderizarControleConclusaoComDados(dadosRecorte,'2026-08',ambienteRecorte.api.estado().geracao);
const htmlRecorte = ambienteRecorte.nos.get('controleConclusaoCalendariosBox').innerHTML;
exigir(
  htmlRecorte.includes('Pendências de competências anteriores') && htmlRecorte.includes('Maio publicado'),
  'card antigo com posted=true mas sem conferência continua no bloco de pendências'
);
exigir(
  blocoV101.includes('__ccCache=null;\n    renderControleConclusaoCalendarios(true);'),
  'troca de competência invalida cache e força leitura do mês escolhido'
);

const ativosProjecao={calendarios_conferencias:0,calendarios_encerramentos:0};
const maxAtivosProjecao={calendarios_conferencias:0,calendarios_encerramentos:0};
const chamadasProjecao={calendarios_conferencias:0,calendarios_encerramentos:0};
const cardsLote=Array.from({length:13},(_,i)=>({
  id:'cliente-lote-'+i,
  data:{client:'Cliente lote '+i,items:[{itemId:'item-lote-'+i,mes:'2026-08',posted:false}]}
}));
const ambienteLotes = criarAmbiente({
  papel:'Cecília',real:'Cecília',uid:'uid-cecilia',
  obterCalendariosCompartilhados:async()=>snapshot(cardsLote),
  async getDocs(ref){
    const raizProjecao=['calendarios_conferencias','calendarios_encerramentos'].find(raiz=>String(ref?.path||'').startsWith(raiz+'/'));
    if(raizProjecao){
      chamadasProjecao[raizProjecao]++;
      ativosProjecao[raizProjecao]++;
      maxAtivosProjecao[raizProjecao]=Math.max(maxAtivosProjecao[raizProjecao],ativosProjecao[raizProjecao]);
      await new Promise(resolve=>setImmediate(resolve));
      ativosProjecao[raizProjecao]--;
    }
    return snapshot([]);
  }
});
await ambienteLotes.api.carregarControleConclusaoCalendarios(true);
exigir(
  chamadasProjecao.calendarios_conferencias===13 && chamadasProjecao.calendarios_encerramentos===13 &&
  maxAtivosProjecao.calendarios_conferencias===12 && maxAtivosProjecao.calendarios_encerramentos===12,
  'leituras de cada projeção usam lotes concorrentes de no máximo 12 cards'
);

const fonteCalendariosCompartilhados = trecho(escritorio, '  async function obterCalendariosCompartilhados', '  window.obterCalendariosCompartilhados');
exigir(
  fonteCalendariosCompartilhados.indexOf('__erroCalendariosCompartilhado = erro') <
    fonteCalendariosCompartilhados.indexOf('if(__snapshotCalendariosCompartilhado) return __snapshotCalendariosCompartilhado'),
  'snapshot antigo retornado após falha conserva marcador de erro para bloquear todos os cards'
);

/* Writer transacional, recibo, retry, duas abas e fronteiras de coleção. */
const writer = trecho(escritorio, '  async function persistirControleConclusaoV101', '  window.salvarConferenciaConclusao=async function');
exigir(writer.includes("if(!['conferencia','encerramento'].includes(tipo))"), 'writer falha fechado para tipo fora do contrato');
exigir(writer.indexOf('__ccAcoesEmCurso.add(lockKey)') >= 0 && writer.indexOf('__ccAcoesEmCurso.add(lockKey)') < writer.indexOf('await '), 'trava de clique duplo é armada antes do primeiro await');
exigir(writer.includes('operationIdPendenteControle') && blocoV101.includes('sessionStorage.getItem(storageKey)'), 'retry reutiliza operationId pendente com expiração');
exigir(writer.includes('await tx.get(eventoRef)') && writer.includes('if(eventoSnap.exists())'), 'evento existente torna a tentativa idempotente');
exigir(writer.includes('await api.getDoc(retratoRef)') && writer.includes('gs/recibo-superado'), 'sucesso exige releitura e recibo coerente');
exigir(
  writer.includes('tipoCompativel') && writer.includes('valorCompativel') && writer.includes('textoCompativel') &&
  writer.includes('e.atorRealPapel===ator.real'),
  'retry só aceita evento compatível em tipo, valor, texto, autoria e papel real'
);
exigir(
  writer.includes('reciboValor!==desejadoSolicitado') && writer.includes('reciboTexto!==textoSolicitado') &&
  writer.includes("dados.fonteAssinatura||'')!==String(resultado.assinatura||''"),
  'recibo valida intenção e assinatura antes de anunciar sucesso'
);
exigir(blocoV101.includes("const storageKey='gs_cc_v101_'+await sha256Controle(String(chave))"), 'chave de retry é hash SHA-256 da intenção completa');
exigir(writer.includes("if(!atual&&!desejado) throw new Error('A primeira ação precisa ser uma conferência"), 'writer alinha a primeira criação ao contrato conferido=true das regras');
exigir(blocoV101.includes("salvarConferenciaConclusao('${token}',true,true)") && blocoV101.includes('Conferir e salvar observação'), 'primeira observação confirma explicitamente em vez de criar retrato falso');
exigir(!writer.includes("tx.set(doc(db,'calendarios'") && !writer.includes("tx.update(doc(db,'calendarios'"), 'writer não possui caminho de escrita na pauta');
exigir(!writer.includes("tx.set(doc(db,'videos_producao'") && !writer.includes("tx.set(doc(db,'postagens'"), 'writer não possui caminho de escrita em vídeo ou postagem');

const ambConf = criarAmbiente({papel:'Cecília',real:'Cecília',uid:'uid-cecilia'});
const alvoConf = await prepararAlvo(ambConf.api,ambConf.estado);
let resultadoWriter = await ambConf.api.persistirControleConclusaoV101('conferencia',alvoConf,{desejado:true,observacao:'Conferido na fixture'});
exigir(resultadoWriter.ok && resultadoWriter.recibo.conferido === true, 'Cecília grava conferência e recebe recibo');
exigir(ambConf.escritas.length === 2, 'conferência cria exatamente retrato e evento no mesmo commit');
exigir(ambConf.escritas.every(w=>w.path.startsWith('calendarios_conferencias/')), 'conferência escreve somente na projeção dedicada');
exigir(!ambConf.escritas.some(w=>/^(calendarios|videos_producao|postagens)\//.test(w.path)), 'conferência não muta fontes operacionais');
const principalConf = ambConf.escritas.find(w=>!w.path.includes('/eventos/')).dados;
exigir(!Object.hasOwn(principalConf,'status') && !Object.hasOwn(principalConf,'titulo') && !Object.hasOwn(principalConf,'resolucao'), 'projeção não copia workflow, título ou resolução');
exigir(principalConf.atorRealPapel === 'Cecília' && principalConf.papelOperado === 'Cecília', 'autoria real e papel operado ficam auditáveis');

const ambPrimeiraDesmarca = criarAmbiente({papel:'Cecília',real:'Cecília',uid:'uid-cecilia'});
const alvoPrimeiraDesmarca = await prepararAlvo(ambPrimeiraDesmarca.api,ambPrimeiraDesmarca.estado);
await assert.rejects(
  ambPrimeiraDesmarca.api.persistirControleConclusaoV101('conferencia',alvoPrimeiraDesmarca,{desejado:false,observacao:'Não deve nascer desmarcado'}),
  /primeira ação precisa ser uma conferência/
);
exigir(ambPrimeiraDesmarca.escritas.length === 0, 'retrato novo nunca nasce desmarcado nem diverge das regras');

const ambDelegado = criarAmbiente({papel:'Cecília',real:'Chris',uid:'uid-chris'});
const alvoDelegado = await prepararAlvo(ambDelegado.api,ambDelegado.estado);
resultadoWriter = await ambDelegado.api.persistirControleConclusaoV101('conferencia',alvoDelegado,{desejado:true,observacao:''});
exigir(resultadoWriter.ok && resultadoWriter.recibo.atorRealPapel === 'Chris' && resultadoWriter.recibo.papelOperado === 'Cecília', 'Chris operando explicitamente como Cecília mantém identidade real na auditoria');

const ambGabiWriter = criarAmbiente({papel:'Gabrielle',real:'Gabrielle',uid:'uid-gabi'});
const alvoGabi = await prepararAlvo(ambGabiWriter.api,ambGabiWriter.estado);
await assert.rejects(
  ambGabiWriter.api.persistirControleConclusaoV101('conferencia',alvoGabi,{desejado:true,observacao:''}),
  /Somente Cecília/
);
exigir(ambGabiWriter.escritas.length === 0, 'papel indevido falha antes de qualquer escrita de conferência');

const ambChris = criarAmbiente({papel:'Chris',real:'Chris',uid:'uid-chris'});
const alvoChris = await prepararAlvo(ambChris.api,ambChris.estado,{
  videos:[{...baseAlvo().videos[0],status:'aguardando_edicao',finalizadoVia:''}],
  postagens:[]
});
resultadoWriter = await ambChris.api.persistirControleConclusaoV101('encerramento',alvoChris,{desejado:true,motivo:'Cliente encerrou esta pauta excepcionalmente.'});
exigir(resultadoWriter.ok && resultadoWriter.recibo.encerrado === true, 'Chris pode encerrar excepcionalmente com motivo explícito');
exigir(ambChris.escritas.length === 2 && ambChris.escritas.every(w=>w.path.startsWith('calendarios_encerramentos/')), 'encerramento escreve somente retrato e evento dedicados');
exigir(ambChris.escritas.find(w=>w.path.includes('/eventos/')).dados.tipo === 'fechar', 'histórico registra evento append-only de fechamento');

const ambChrisTerminal = criarAmbiente({papel:'Chris',real:'Chris',uid:'uid-chris'});
const alvoChrisTerminal = await prepararAlvo(ambChrisTerminal.api,ambChrisTerminal.estado);
await assert.rejects(
  ambChrisTerminal.api.persistirControleConclusaoV101('encerramento',alvoChrisTerminal,{desejado:true,motivo:'Tentativa sintética em item já concluído.'}),
  erro => erro?.code === 'gs/item-ja-concluido'
);
exigir(ambChrisTerminal.escritas.length === 0, 'encerramento excepcional é negado quando o fluxo já concluiu o item');

const ambTipoInvalido = criarAmbiente({papel:'Chris',real:'Chris',uid:'uid-chris'});
const alvoTipoInvalido = await prepararAlvo(ambTipoInvalido.api,ambTipoInvalido.estado);
await assert.rejects(
  ambTipoInvalido.api.persistirControleConclusaoV101('fora_do_contrato',alvoTipoInvalido,{desejado:true,motivo:'Não pode contornar a fronteira terminal.'}),
  /Tipo de operação de conclusão inválido/
);
exigir(ambTipoInvalido.escritas.length === 0, 'tipo desconhecido não contorna papel, coleção ou bloqueio terminal');

const ambCeciliaFecha = criarAmbiente({papel:'Cecília',real:'Cecília',uid:'uid-cecilia'});
const alvoCeciliaFecha = await prepararAlvo(ambCeciliaFecha.api,ambCeciliaFecha.estado);
await assert.rejects(
  ambCeciliaFecha.api.persistirControleConclusaoV101('encerramento',alvoCeciliaFecha,{desejado:true,motivo:'Motivo sintético suficientemente longo.'}),
  /Somente Chris/
);
exigir(ambCeciliaFecha.escritas.length === 0, 'Cecília não encerra competência por conveniência');

const ambMotivo = criarAmbiente({papel:'Chris',real:'Chris',uid:'uid-chris'});
const alvoMotivo = await prepararAlvo(ambMotivo.api,ambMotivo.estado);
await assert.rejects(
  ambMotivo.api.persistirControleConclusaoV101('encerramento',alvoMotivo,{desejado:true,motivo:'curto'}),
  /pelo menos 10 caracteres/
);
exigir(ambMotivo.escritas.length === 0, 'encerramento sem justificativa suficiente não grava');

/* Falha de recibo após commit: retry reaproveita o evento em vez de duplicar. */
const estadoRetry = new Map();
const storageRetry = storageSintetico();
const escritasRetry = [];
let falharRecibo = true;
let ambRetry;
ambRetry = criarAmbiente({
  papel:'Cecília',real:'Cecília',uid:'uid-cecilia',estado:estadoRetry,storage:storageRetry,escritas:escritasRetry,
  async getDoc(ref){
    if(falharRecibo && ref.path.startsWith('calendarios_conferencias/')){
      falharRecibo=false;
      throw Object.assign(new Error('rede caiu após commit'),{code:'unavailable'});
    }
    return snapEstado(estadoRetry.get(ref.path));
  }
});
const alvoRetry = await prepararAlvo(ambRetry.api,estadoRetry);
await assert.rejects(
  ambRetry.api.persistirControleConclusaoV101('conferencia',alvoRetry,{desejado:true,observacao:'Retry sintético'}),
  /rede caiu após commit/
);
exigir(escritasRetry.length === 2 && storageRetry.chaves().length === 1, 'falha de recibo preserva commit e operationId para confirmação');
exigir(/^gs_cc_v101_[a-f0-9]{64}$/.test(storageRetry.chaves()[0]), 'operationId pendente usa chave opaca SHA-256, sem texto da intenção');
resultadoWriter = await ambRetry.api.persistirControleConclusaoV101('conferencia',alvoRetry,{desejado:true,observacao:'Retry sintético'});
exigir(resultadoWriter.ok && resultadoWriter.idempotente && escritasRetry.length === 2, 'retry encontra o mesmo evento e não duplica escrita');
exigir(storageRetry.chaves().length === 0, 'operationId só é limpo depois do recibo confirmado');

/* Evento reaproveitado e recibo precisam corresponder à intenção integral. */
const estadoConflito = new Map();
const storageConflito = storageSintetico();
const ambConflito = criarAmbiente({papel:'Cecília',real:'Cecília',uid:'uid-cecilia',estado:estadoConflito,storage:storageConflito});
const alvoConflito = await prepararAlvo(ambConflito.api,estadoConflito);
const textoConflito = 'Intenção correta';
const chaveIntencaoConflito = `calendarios_conferencias|${alvoConflito.calendarId}|${alvoConflito.competencia}|${alvoConflito.itemId}|true|${textoConflito}`;
const storageKeyConflito = 'gs_cc_v101_'+cryptoNode.createHash('sha256').update(chaveIntencaoConflito).digest('hex');
const operationIdConflito = 'op_fixture_conflito_123';
storageConflito.setItem(storageKeyConflito,JSON.stringify({id:operationIdConflito,em:Date.now()}));
estadoConflito.set(
  `calendarios_conferencias/${alvoConflito.calendarId}/competencias/${alvoConflito.competencia}/itens/${alvoConflito.itemId}/eventos/${operationIdConflito}`,
  {autorUid:'uid-cecilia',atorRealPapel:'Cecília',operationId:operationIdConflito,tipo:'conferir',conferido:true,observacao:'Outra intenção',fonteAssinatura:alvoConflito.fonteAssinatura}
);
await assert.rejects(
  ambConflito.api.persistirControleConclusaoV101('conferencia',alvoConflito,{desejado:true,observacao:textoConflito}),
  /Identificador de operação em conflito/
);
exigir(ambConflito.escritas.length === 0, 'retry rejeita evento existente com texto divergente');

const estadoReciboDivergente = new Map();
const storageReciboDivergente = storageSintetico();
let ambReciboDivergente;
ambReciboDivergente = criarAmbiente({
  papel:'Cecília',real:'Cecília',uid:'uid-cecilia',estado:estadoReciboDivergente,storage:storageReciboDivergente,
  async getDoc(ref){
    const salvo=estadoReciboDivergente.get(ref.path);
    return snapEstado(salvo?{...salvo,observacao:'Outra aba alterou o texto'}:salvo);
  }
});
const alvoReciboDivergente = await prepararAlvo(ambReciboDivergente.api,estadoReciboDivergente);
await assert.rejects(
  ambReciboDivergente.api.persistirControleConclusaoV101('conferencia',alvoReciboDivergente,{desejado:true,observacao:'Texto esperado no recibo'}),
  erro => erro?.code === 'gs/recibo-superado' && erro?.operacaoRegistrada === true
);
exigir(
  ambReciboDivergente.escritas.length === 2 && storageReciboDivergente.chaves().length === 0,
  'recibo divergente reconhece commit, bloqueia sucesso e encerra retry obsoleto'
);

/* Clique duplo: o segundo chamado é barrado enquanto o primeiro aguarda. */
const estadoDuplo = new Map();
const escritasDuplo = [];
let liberarTransacao;
const portaTransacao = new Promise(resolve=>{liberarTransacao=resolve;});
let ambDuplo;
ambDuplo = criarAmbiente({
  papel:'Cecília',real:'Cecília',uid:'uid-cecilia',estado:estadoDuplo,escritas:escritasDuplo,
  async runTransaction(db, executar){ await portaTransacao; return ambDuplo.runTransactionPadrao(db,executar); }
});
const alvoDuplo = await prepararAlvo(ambDuplo.api,estadoDuplo);
const primeiraAcao = ambDuplo.api.persistirControleConclusaoV101('conferencia',alvoDuplo,{desejado:true,observacao:'Duplo clique'});
const segundaAcao = await ambDuplo.api.persistirControleConclusaoV101('conferencia',alvoDuplo,{desejado:true,observacao:'Duplo clique'});
exigir(segundaAcao.duplicado === true && escritasDuplo.length === 0, 'segundo clique é bloqueado antes de iniciar outra transação');
liberarTransacao();
exigir((await primeiraAcao).ok && escritasDuplo.length === 2, 'primeiro clique conclui uma única escrita atômica');

/* Duas abas independentes convergem no mesmo retrato sem segundo evento. */
const estadoAbas = new Map();
const escritasAbas = [];
const abaA = criarAmbiente({papel:'Cecília',real:'Cecília',uid:'uid-cecilia',estado:estadoAbas,storage:storageSintetico(),escritas:escritasAbas});
const alvoAbaA = await prepararAlvo(abaA.api,estadoAbas);
await abaA.api.persistirControleConclusaoV101('conferencia',alvoAbaA,{desejado:true,observacao:'Mesmo estado'});
const abaB = criarAmbiente({papel:'Cecília',real:'Cecília',uid:'uid-cecilia',estado:estadoAbas,storage:storageSintetico(),escritas:escritasAbas});
const alvoAbaB = await prepararAlvo(abaB.api,estadoAbas);
resultadoWriter = await abaB.api.persistirControleConclusaoV101('conferencia',alvoAbaB,{desejado:true,observacao:'Mesmo estado'});
exigir(resultadoWriter.ok && resultadoWriter.idempotente && escritasAbas.length === 2, 'duas abas com a mesma intenção não criam evento ou revisão duplicados');

/* Corrida de estado: reler dentro da transação bloqueia fonte alterada. */
const ambRace = criarAmbiente({papel:'Cecília',real:'Cecília',uid:'uid-cecilia'});
const alvoRace = await prepararAlvo(ambRace.api,ambRace.estado);
ambRace.estado.set('videos_producao/video_fixture_1',{...ambRace.estado.get('videos_producao/video_fixture_1'),status:'correcao',finalizadoVia:''});
await assert.rejects(
  ambRace.api.persistirControleConclusaoV101('conferencia',alvoRace,{desejado:true,observacao:'Estado mudou'}),
  erro => erro?.code === 'gs/fonte-alterada'
);
exigir(ambRace.escritas.length === 0, 'mudança em outra aba é detectada antes de qualquer escrita');

/* Abertura é somente leitura e consultas ficam por identidade estável. */
const loader = trecho(escritorio, '  async function carregarControleConclusaoCalendarios', '  function caminhoRetratoControle');
exigir(!/\b(setDoc|updateDoc|addDoc|runTransaction)\s*\(/.test(loader), 'renderização/loader não cria documentos silenciosamente');
exigir(loader.includes("consultarControleEmBlocos('videos_producao','calendarItemId',itemIds)"), 'vídeos são consultados por itemId estável');
exigir(loader.includes("consultarControleEmBlocos('postagens','videoId',videoIds)"), 'postagens são consultadas por videoId estável');
exigir(!loader.includes("where('titulo'") && !loader.includes("where('name'"), 'loader nunca vincula produção por título');
exigir(loader.includes("lerProjecoesControle(cards,'calendarios_conferencias')") && loader.includes("lerProjecoesControle(cards,'calendarios_encerramentos')"), 'progresso e projeções mínimas são lidos de fontes separadas');
exigir(loader.includes('const erroProducao=erroCalendarios||'), 'falha de calendário contamina o estado derivado e bloqueia ações');

console.log(`REGRESSÃO V101 CONTROLE DE CONCLUSÃO: APROVADA (${total} verificações)`);
