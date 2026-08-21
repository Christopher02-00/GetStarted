#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = nome => fs.readFileSync(path.join(raiz, nome), 'utf8');
const escritorio = ler('escritorio.html');
const calendario = ler('calendario.html');
const calendarios = ler('calendarios.html');
const regras = ler('firestore.rules');
let total = 0;

function exigir(condicao, mensagem){
  total++;
  if(!condicao) throw new Error('V100 REGISTRO AUTONOMO FILMMAKER: ' + mensagem);
  console.log('PASS ', mensagem);
}

function trecho(fonte, inicio, fim){
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) throw new Error('V100 REGISTRO AUTONOMO FILMMAKER: trecho ausente ' + inicio);
  return fonte.slice(a, b);
}

function sha256(texto){
  return crypto.createHash('sha256').update(texto).digest('hex');
}

function copia(valor){
  return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
}

/* Executa as funções de domínio reais publicadas no HTML. O sandbox não
   recebe Firebase, DOM nem rede. */
const fonteDominio = [
  "const PESSOAS_DE_CAMPO=['Luís','Nathan']; const CAMPO_MAIS_CHRIS=['Chris',...PESSOAS_DE_CAMPO]; const window={};",
  trecho(escritorio, 'function equipeDoAgendamento', 'function rotuloEquipe'),
  trecho(escritorio, 'function nomeItemSessaoCanonico', '/* Agendamentos criados antes'),
  trecho(escritorio, 'function sessaoModernaComPlano', '/* V100 — quantidade'),
  trecho(escritorio, 'function avaliarPlanejamentoSessaoParaPersistir', 'function snapshotItensPlanejadosSessao'),
  trecho(escritorio, 'function prepararMateriaisDeclaradosSessao', 'window.prepararMateriaisDeclaradosSessao'),
  `globalThis.api={
    equipeDoAgendamento,nomeOperacionalCanonico,pessoaNaEquipe,filmmakersDaSessao,
    nomeItemSessaoCanonico,chaveItemSessao,chaveSessaoGravacao,
    sessaoModernaComPlano,sessaoRegistroAutonomo,sessaoLegadaSemVinculo,
    avaliarPlanejamentoSessaoParaPersistir,prepararMateriaisDeclaradosSessao
  };`
].join('\n');

const contextoDominio = vm.createContext({ console });
new vm.Script(fonteDominio, { filename:'v100-registro-autonomo-dominio.js' }).runInContext(contextoDominio);
const api = contextoDominio.api;

/* Calendário é checklist opcional: qualquer estado sem lista exata continua
   agendável e preserva a quantidade esperada apenas como referência. */
const cenariosGate = [
  {
    rotulo:'calendário ausente', plano:{permitidos:[],inconsistencias:[]},
    opcoes:{calendarioDisponivel:false,quantidadeEsperada:5}, codigo:'declaracao_sem_calendario'
  },
  {
    rotulo:'ordem vazia', plano:{permitidos:[],inconsistencias:[]},
    opcoes:{calendarioDisponivel:true,quantidadeEsperada:5}, codigo:'declaracao_ordem_vazia'
  },
  {
    rotulo:'erro de leitura', plano:{permitidos:[],inconsistencias:[]},
    opcoes:{calendarioDisponivel:false,calendarioFalhou:true,quantidadeEsperada:5}, codigo:'declaracao_calendario_indisponivel'
  },
  {
    rotulo:'pauta inconsistente', plano:{permitidos:[{idx:0}],inconsistencias:[{motivo:'fixture divergente'}]},
    opcoes:{calendarioDisponivel:true,quantidadeEsperada:5}, codigo:'declaracao_pauta_inconsistente'
  }
];
cenariosGate.forEach(caso => {
  const r = api.avaliarPlanejamentoSessaoParaPersistir(caso.plano, caso.opcoes);
  exigir(r.ok === true && r.usarChecklist === false && r.modo === 'declaracao_filmmaker' &&
    r.codigo === caso.codigo && r.quantidade === 5,
  'gate não bloqueia ' + caso.rotulo + ' e mantém declaração factual');
});

let gate = api.avaliarPlanejamentoSessaoParaPersistir(
  {permitidos:[{idx:0},{idx:1},{idx:2}],inconsistencias:[]},
  {calendarioDisponivel:true,quantidadeEsperada:2}
);
exigir(gate.ok === true && gate.usarChecklist === true && gate.codigo === 'checklist_calendario_disponivel' &&
  gate.modo === 'calendario_ou_declaracao' && gate.quantidade === 3,
  'lista exata consistente vira checklist sem reduzir a quantidade dos itens');

[-7, 0, Number.NaN, 'inválido'].forEach(valor => {
  const r = api.avaliarPlanejamentoSessaoParaPersistir(
    {permitidos:[],inconsistencias:[]},
    {calendarioDisponivel:false,quantidadeEsperada:valor}
  );
  exigir(r.ok === true && r.quantidade === 1 && r.codigo === 'declaracao_sem_calendario',
    'quantidade inválida normaliza para 1 sem bloquear — ' + String(valor));
});

/* A versão 2 distingue o registro autônomo do contrato exato V99 e do
   legado; a declaração manual moderna exige abertura explícita do executor. */
const agAutonomo = {
  cliente:'cliente-fixture', status:'agendado', aprovado:true,
  filmmaker:'Luís', equipe:[
    {nome:'Luís',papel:'Filmmaker'},
    {nome:'Nathan',papel:'2º Filmmaker'}
  ],
  sessaoPlanejamentoVersao:2, sessaoRegistroModo:'calendario_opcional'
};
exigir(api.sessaoRegistroAutonomo(agAutonomo) === true &&
  api.sessaoModernaComPlano(agAutonomo) === false && api.sessaoLegadaSemVinculo(agAutonomo) === false,
  'versão 2 é contrato autônomo próprio, sem fingir checklist ou legado');

let preparo = api.prepararMateriaisDeclaradosSessao([], 'Depoimento real', agAutonomo, 'Luiz');
exigir(preparo.ok === false && preparo.videos.length === 0 && preparo.erro.includes('não foi aberta'),
  'declaração manual moderna exige autorização booleana explícita');

preparo = api.prepararMateriaisDeclaradosSessao([], 'Depoimento real', agAutonomo, 'Luiz', {
  declaracaoAutorizada:true, motivoDeclaracao:'declaracao_sem_calendario'
});
exigir(preparo.ok === true && preparo.declaradosCampo.length === 1 &&
  preparo.videos[0].calendarItemIdx === null && preparo.videos[0].calendarItemId === null &&
  preparo.videos[0].calendarClienteSlug === null && preparo.videos[0].vinculoSessao === 'declarado_em_campo' &&
  preparo.videos[0].motivoDeclaracao === 'declaracao_sem_calendario' && preparo.videos[0].responsavel === 'Luiz',
  'declaração autorizada preserva título real e mantém todos os vínculos de calendário nulos');

preparo = api.prepararMateriaisDeclaradosSessao([], 'Vídeo Ágil\n  video   agil ', agAutonomo, 'Luís', {
  declaracaoAutorizada:true
});
exigir(preparo.ok === false && preparo.erro.includes('repetido'),
  'duplicidade normalizada por acento, caixa e espaços é rejeitada');

const exatoFixture = {
  nome:'Roteiro do calendário', calendarItemIdx:4, calendarItemId:'item-4',
  vinculoSessao:'calendario_planejado', responsavel:'Luís'
};
preparo = api.prepararMateriaisDeclaradosSessao([exatoFixture], 'Bastidores reais', agAutonomo, 'Natan', {
  declaracaoAutorizada:true
});
exigir(preparo.ok === true && preparo.videos.length === 2 && preparo.declaradosCampo.length === 1 &&
  preparo.videos[0].calendarItemId === 'item-4' && preparo.videos[1].calendarItemId === null &&
  preparo.videos[1].responsavel === 'Natan',
  'modo misto aceita item exato e declaração isolada por membros normalizados da equipe');

preparo = api.prepararMateriaisDeclaradosSessao([], 'Material real', agAutonomo, 'Pessoa externa', {
  declaracaoAutorizada:true
});
exigir(preparo.ok === false && preparo.erro.includes('pertencer à equipe'),
  'declaração de pessoa fora da equipe permanece bloqueada');

preparo = api.prepararMateriaisDeclaradosSessao(
  [exatoFixture], '  roteiro do CALENDÁRIO ', agAutonomo, 'Luís', {declaracaoAutorizada:true}
);
exigir(preparo.ok === false && preparo.erro.includes('repetido'),
  'mesmo título não pode nascer uma vez exato e outra vez manual');

const agLegado = {cliente:'legado-fixture',status:'agendado',filmmaker:'Luiz'};
preparo = api.prepararMateriaisDeclaradosSessao([], 'Material legado', agLegado, 'Luís');
exigir(preparo.ok === true && preparo.registroLegado === true &&
  preparo.videos[0].vinculoSessao === 'declarado_legado' && preparo.videos[0].calendarItemIdx === null,
  'compatibilidade legada continua isolada do calendário');

/* O escritor de agendamento separa duas autorizações: coordenação pode
   criar uma sessão V2 sem calendário; o filmmaker não pode se atribuir
   transversalmente um cliente sem checklist. Depois de atribuída, a baixa
   factual da sessão deixa de depender do calendário. */
const fonteAgendar = trecho(escritorio, 'window.agendarGravacao = async function(){', '  async function renderListaAgendamentos');
const posLeituraCalendario = fonteAgendar.indexOf("calendarioPlanejamentoSnap = await getDoc(doc(db,'calendarios', clienteSlug))");
const posFalhaCalendario = fonteAgendar.indexOf("falhaLeituraCalendarioPlanejamento = String");
const posAvaliacao = fonteAgendar.indexOf('avaliarPlanejamentoSessaoParaPersistir(planoInicial');
const posCriacao = fonteAgendar.indexOf("addDoc(collection(db,'agendamentos')");
exigir(posLeituraCalendario >= 0 && posFalhaCalendario > posLeituraCalendario &&
  posAvaliacao > posFalhaCalendario && posCriacao > posAvaliacao,
  'agendamento captura falha do calendário, avalia e só então cria a sessão');
exigir(!fonteAgendar.includes('if(!avaliacaoPlanejamento.ok)') &&
  fonteAgendar.includes("if(!['Chris','Amanda','Cecília'].includes(usuarioAtual))") &&
  fonteAgendar.includes('if(PESSOAS_DE_CAMPO.includes(usuarioAtual) && !avaliacaoPlanejamento.usarChecklist)') &&
  fonteAgendar.indexOf('return false;', fonteAgendar.indexOf('if(PESSOAS_DE_CAMPO.includes(usuarioAtual) && !avaliacaoPlanejamento.usarChecklist)')) < posCriacao &&
  fonteAgendar.includes('const sessaoItensPlanejados = avaliacaoPlanejamento.usarChecklist') &&
  fonteAgendar.includes('sessaoPlanejamentoVersao:avaliacaoPlanejamento.usarChecklist ? 1 : 2') &&
  fonteAgendar.includes("sessaoRegistroModo:'calendario_opcional'") &&
  fonteAgendar.includes('calendarioObrigatorioParaRegistro:false'),
  'somente coordenação agenda e persiste V2; o filmmaker não cria para si uma sessão transversal');

/* A seguir executamos o núcleo e a trava reais do HTML contra um Firestore
   sintético transacional. Assim os testes observam leituras, ordem das
   escritas, idempotência e duas abas sem tocar dados reais. */
const fonteRegistro = trecho(
  escritorio,
  'async function registrarGravacaoRealizadaNucleo',
  '  function popularClientesReferencia'
);
const fonteContadorVideos = trecho(
  escritorio,
  'window.atualizarContadorVideos = function',
  '  /* ===== AGENDA DE REUNIÕES'
);

exigir(fonteRegistro.includes('if(!PESSOAS_DE_CAMPO.includes(usuarioAtual))') &&
  fonteRegistro.includes('Cecília acompanha pelo controle, sem executar a baixa.') &&
  fonteRegistro.includes('PESSOAS_DE_CAMPO.includes(usuarioAtual) && !pessoaNaEquipe(agDadosAntes, usuarioAtual)') &&
  fonteRegistro.includes('PESSOAS_DE_CAMPO.includes(usuarioAtual) && !pessoaNaEquipe(dadosAtuais,usuarioAtual)'),
  'somente filmmakers executam; Cecília é leitura e a equipe é revalidada antes e dentro da transação');
exigir(fonteRegistro.includes("const calRef = videosDoCalendario.length ? doc(db,'calendarios', clienteSlug) : null") &&
  fonteRegistro.includes('const calAtual = calRef ? await transacao.get(calRef) : null') &&
  fonteRegistro.includes('if(calRef && calAtual && calAtual.exists())'),
  'calendário só entra na transação quando há checkbox exato marcado');
exigir(fonteRegistro.includes('registroProducaoVersao:3') &&
  fonteRegistro.includes("? 'misto' : (qtdVideosVinculadosCalendario ? 'checklist_calendario' : 'declaracao_filmmaker')") &&
  fonteRegistro.includes('qtdVideosVinculadosCalendario, qtdVideosDeclaradosCampo'),
  'baixa grava versão 3, modo e contadores das duas origens');
exigir(!fonteRegistro.includes('saldo_captacao') && !fonteRegistro.includes('prompt(') &&
  !fonteRegistro.includes("collection(db,'postagens')") &&
  fonteRegistro.includes('sem criar tarefa para a Cecília'),
  'saldo esperado não cria prompt, postagem ou tarefa automática para Cecília');
exigir(fonteRegistro.includes("status: 'aguardando_edicao'") &&
  fonteRegistro.includes("editorSugerido: editorSugeridoPeloFilmmaker, editorAtribuido: ''") &&
  fonteRegistro.includes('Os vídeos já estão na fila para a Amanda distribuir.'),
  'vídeos nascem uma única vez na fila de edição que a Amanda distribui');
exigir(fonteRegistro.includes("const codigo = String((e && (e.code || e.message)) || e || 'falha desconhecida')") &&
  fonteRegistro.includes('Nada foi confirmado por esta tentativa; recarregue a sessão e tente novamente.') &&
  fonteRegistro.includes('return false;') && fonteRegistro.includes('}finally{'),
  'wrapper converte exceção inesperada em erro explícito, false e limpeza no finally');

function criarBackend(documentosIniciais, opcoes = {}){
  const documentos = new Map(Object.entries(copia(documentosIniciais)));
  const leiturasExternas = [];
  const transacoes = [];
  const addDocs = [];
  const demandas = [];
  let sequencia = 0;
  let caudaTransacao = Promise.resolve();
  const db = { kind:'db', path:'' };

  const snapshot = ref => {
    const existe = documentos.has(ref.path);
    const valor = existe ? copia(documentos.get(ref.path)) : undefined;
    return { exists:()=>existe, data:()=>copia(valor) };
  };
  const collection = (base, nome) => ({
    kind:'collection',
    path:[base && base.path, nome].filter(Boolean).join('/')
  });
  const doc = (base, ...partes) => {
    if(base && base.kind === 'collection' && !partes.length){
      return {kind:'doc',path:base.path + '/auto-' + (++sequencia)};
    }
    return {kind:'doc',path:[base && base.path, ...partes].filter(Boolean).join('/')};
  };

  const getDoc = async ref => {
    leiturasExternas.push(ref.path);
    const capturado = snapshot(ref);
    if(opcoes.falhaPreLeitura && ref.path === opcoes.falhaPreLeitura.caminho){
      throw opcoes.falhaPreLeitura.erro;
    }
    if(opcoes.barreiraPreLeitura && ref.path === opcoes.barreiraPreLeitura.caminho){
      await opcoes.barreiraPreLeitura.entrar();
    }
    return capturado;
  };

  const runTransaction = async (_db, executar) => {
    const anterior = caudaTransacao;
    let liberar;
    caudaTransacao = new Promise(resolve => { liberar = resolve; });
    await anterior;
    const log = {operacoes:[],confirmada:false,erro:''};
    transacoes.push(log);
    const pendentes = [];
    const transacao = {
      get:async ref => {
        log.operacoes.push('get:' + ref.path);
        return snapshot(ref);
      },
      update:(ref,dados) => {
        log.operacoes.push('update:' + ref.path);
        pendentes.push({tipo:'update',ref,dados:copia(dados)});
      },
      set:(ref,dados) => {
        log.operacoes.push('set:' + ref.path);
        pendentes.push({tipo:'set',ref,dados:copia(dados)});
      }
    };
    try{
      const retorno = await executar(transacao);
      pendentes.forEach(escrita => {
        if(escrita.tipo === 'set') documentos.set(escrita.ref.path, copia(escrita.dados));
        else documentos.set(escrita.ref.path, {...copia(documentos.get(escrita.ref.path)||{}),...copia(escrita.dados)});
      });
      log.confirmada = true;
      return retorno;
    }catch(erro){
      log.erro = String((erro&&erro.message)||erro);
      throw erro;
    }finally{
      liberar();
    }
  };

  const addDoc = async (colecao,dados) => {
    const ref = doc(colecao);
    documentos.set(ref.path,copia(dados));
    addDocs.push({path:ref.path,dados:copia(dados)});
    return {id:ref.path.split('/').pop(),...ref};
  };

  return {
    db, documentos, leiturasExternas, transacoes, addDocs, demandas,
    firebase:{collection,doc,getDoc,runTransaction,addDoc,serverTimestamp:()=> 'SERVER_TIMESTAMP'}
  };
}

function criarBarreira(quantidade){
  let chegaram = 0;
  let liberar;
  const todos = new Promise(resolve => { liberar = resolve; });
  return {
    entrar:async () => {
      chegaram++;
      if(chegaram === quantidade) liberar();
      await todos;
    }
  };
}

function criarCheckbox({nome,idx,itemId,responsavel}){
  const seletorResponsavel = {value:responsavel};
  return {
    dataset:{nome,idx:String(idx),itemId:itemId||''},
    closest:()=>({querySelector:()=>seletorResponsavel})
  };
}

function criarDocumentoFixture({agId,textoManual='',responsavelManual='Luís',checkboxes=[]}){
  const botao = {
    disabled:false, textContent:'Enviar vídeos gravados e concluir sessão',
    dataset:{qtdPlanejada:'3',podeExecutar:'1'}
  };
  const porId = {
    ['extras_'+agId]:{value:textoManual},
    ['responsavelExtras_'+agId]:{value:responsavelManual},
    ['uber_'+agId]:{checked:false},
    ['uberInput_'+agId]:{value:''},
    ['valorExtra_'+agId]:{value:''},
    ['editorEscolhido_'+agId]:{value:''},
    ['btnConfirmarGravacao_'+agId]:botao,
    ['contadorVideos_'+agId]:{innerHTML:''},
    subtabControleGravacoes:{id:'subtabControleGravacoes'}
  };
  return {
    botao,
    getElementById:id => porId[id] || null,
    querySelectorAll:seletor => {
      if(seletor === '.chkVideoCalendario_'+agId+':checked') return checkboxes;
      if(seletor === '.chkVideoCalendario_'+agId) return checkboxes;
      return [];
    }
  };
}

function criarContextoRegistro({backend,agId,usuario='Luís',textoManual='',responsavelManual=usuario,checkboxes=[]}){
  const documento = criarDocumentoFixture({agId,textoManual,responsavelManual,checkboxes});
  const toasts = [];
  const contexto = vm.createContext({
    /* A segunda aba abortada é uma evidência esperada desta regressão; o
       logger sintético impede que o stack esperado pareça falha do teste. */
    console:{log:()=>{},error:()=>{}},
    window:{__voltarControleGravacoes:false},
    document:documento,
    db:backend.db,
    usuarioAtual:usuario,
    PESSOAS_DE_CAMPO:['Luís','Nathan'],
    CAMPO_MAIS_CHRIS:['Chris','Luís','Nathan'],
    ...backend.firebase,
    mostrarToast:(mensagem,tipo='')=>toasts.push({mensagem:String(mensagem),tipo}),
    pessoaNaEquipe:api.pessoaNaEquipe,
    nomeOperacionalCanonico:api.nomeOperacionalCanonico,
    filmmakersDaSessao:api.filmmakersDaSessao,
    nomeItemSessaoCanonico:api.nomeItemSessaoCanonico,
    chaveItemSessao:api.chaveItemSessao,
    chaveSessaoGravacao:api.chaveSessaoGravacao,
    prepararMateriaisDeclaradosSessao:api.prepararMateriaisDeclaradosSessao,
    planejarSessaoGravacao:cal => ({
      permitidos:Array.isArray(cal.fixturePermitidos) ? cal.fixturePermitidos : [],
      inconsistencias:Array.isArray(cal.fixtureInconsistencias) ? cal.fixtureInconsistencias : []
    }),
    hojeLocal:()=> '2026-08-21',
    criarDemandaSegura:async dados => { backend.demandas.push(copia(dados)); return true; },
    formatarDataBR:data => data,
    deslocarCompetenciaExtra:mes => mes,
    dispararEmailIndividual:async()=>true,
    limparCacheIndicadores:()=>{},
    setAgendamentoSub:()=>{},
    renderMinhaAgendaFilmmaker:()=>{},
    __snapshotCalendariosEm:0
  });
  new vm.Script(fonteContadorVideos, {filename:'v100-contador-videos-real.js'}).runInContext(contexto);
  new vm.Script(fonteRegistro, {filename:'v100-registro-autonomo-nucleo.js'}).runInContext(contexto);
  return {contexto,documento,toasts};
}

function agendamentoFixture(sobrescritos = {}){
  return {
    cliente:'cliente-fixture', clienteNome:'Cliente Fixture', data:'2026-08-20',
    status:'agendado', aprovado:true, qtdVideosPlanejados:3,
    filmmaker:'Luís', equipe:[{nome:'Luís',papel:'Filmmaker'}],
    sessaoPlanejamentoVersao:2, sessaoRegistroModo:'calendario_opcional',
    sessaoPlanejamento:'declaracao_sem_calendario', ehClienteNovo:false,
    ...sobrescritos
  };
}

function videosDoBackend(backend){
  return [...backend.documentos.entries()]
    .filter(([chave])=>chave.startsWith('videos_producao/'))
    .map(([path,dados])=>({path,dados}));
}

/* Manual puro: nenhuma leitura ou escrita de calendário, uma baixa atômica,
   nenhum saldo convertido em demanda e campos completos para a Amanda. */
{
  const agId = 'ag-manual';
  const backend = criarBackend({['agendamentos/'+agId]:agendamentoFixture()});
  const execucao = criarContextoRegistro({backend,agId,textoManual:'Depoimento verdadeiro',responsavelManual:'Luiz'});
  const retorno = await execucao.contexto.window.registrarGravacaoRealizada(agId);
  const ag = backend.documentos.get('agendamentos/'+agId);
  const videos = videosDoBackend(backend);
  exigir(retorno === true && ag.status === 'realizado' && videos.length === 1,
    'declaração manual conclui a sessão e cria um único vídeo');
  exigir(backend.leiturasExternas.join(',') === 'agendamentos/'+agId &&
    backend.transacoes[0].operacoes.join(',') === 'get:agendamentos/'+agId+',update:agendamentos/'+agId+',set:'+videos[0].path,
    'manual puro lê só o agendamento e escreve baixa antes do vídeo, sem tocar calendário');
  exigir(ag.registroProducaoVersao === 3 && ag.registroCaptacaoModo === 'declaracao_filmmaker' &&
    ag.qtdVideosRealizados === 1 && ag.qtdVideosVinculadosCalendario === 0 &&
    ag.qtdVideosDeclaradosCampo === 1 && ag.qtdVideosFaltantes === 2 && ag.qtdVideosExcedentes === 0,
    'manual puro persiste versão, modo e contadores esperados');
  exigir(videos[0].dados.calendarItemIdx === null && videos[0].dados.calendarItemId === null &&
    videos[0].dados.calendarClienteSlug === null && videos[0].dados.vinculoSessao === 'declarado_em_campo' &&
    videos[0].dados.status === 'aguardando_edicao' && videos[0].dados.editorAtribuido === '',
    'vídeo manual mantém IDs nulos e entra sem editor atribuído na fila da Amanda');
  exigir(backend.demandas.length === 0 && backend.addDocs.length === 0 &&
    ![...backend.documentos.keys()].some(chave=>chave.startsWith('calendarios/')),
    'diferença para o esperado fica no controle sem demanda, prompt ou escrita de calendário');
}

/* Checklist exato: o item permitido é relido dentro da transação e somente
   ele recebe a marca de gravado. */
{
  const agId = 'ag-exato';
  const item = {idx:0,itemId:'item-exato',name:'Roteiro exato'};
  const backend = criarBackend({
    ['agendamentos/'+agId]:agendamentoFixture({
      sessaoPlanejamentoVersao:1,
      sessaoItensPlanejados:[{idx:0,itemId:'item-exato',nome:'Roteiro exato'}]
    }),
    'calendarios/cliente-fixture':{
      fixturePermitidos:[item],
      items:[{itemId:'item-exato',name:'Roteiro exato',gravado:false}]
    }
  });
  const checkbox = criarCheckbox({nome:'Roteiro exato',idx:0,itemId:'item-exato',responsavel:'Luís'});
  const execucao = criarContextoRegistro({backend,agId,checkboxes:[checkbox]});
  const retorno = await execucao.contexto.window.registrarGravacaoRealizada(agId);
  const ag = backend.documentos.get('agendamentos/'+agId);
  const video = videosDoBackend(backend)[0];
  const cal = backend.documentos.get('calendarios/cliente-fixture');
  exigir(retorno === true && ag.registroCaptacaoModo === 'checklist_calendario' &&
    ag.qtdVideosVinculadosCalendario === 1 && ag.qtdVideosDeclaradosCampo === 0,
    'checklist exato persiste origem e contadores próprios');
  exigir(backend.leiturasExternas.join(',') === 'agendamentos/'+agId+',calendarios/cliente-fixture' &&
    backend.transacoes[0].operacoes.join(',') ===
      'get:agendamentos/'+agId+',get:calendarios/cliente-fixture,update:agendamentos/'+agId+',set:'+video.path+',update:calendarios/cliente-fixture',
    'checklist relê agenda e calendário antes de baixar, cria o vídeo e só depois marca a pauta');
  exigir(video.dados.calendarItemIdx === 0 && video.dados.calendarItemId === 'item-exato' &&
    video.dados.calendarClienteSlug === 'cliente-fixture' && video.dados.status === 'aguardando_edicao' &&
    cal.items[0].gravado === true && cal.items[0].agendamentoId === agId,
    'item exato conserva os IDs e somente o item correspondente é marcado');
  exigir(backend.demandas.length === 0 && ag.qtdVideosFaltantes === 2,
    'checklist abaixo da estimativa não cria tarefa automática de saldo');
}

/* Misto: os dois vídeos nascem juntos, mas somente o exato altera pauta. */
{
  const agId = 'ag-misto';
  const item = {idx:0,itemId:'item-misto',name:'Roteiro marcado'};
  const backend = criarBackend({
    ['agendamentos/'+agId]:agendamentoFixture({
      sessaoPlanejamentoVersao:1,
      sessaoItensPlanejados:[{idx:0,itemId:'item-misto',nome:'Roteiro marcado'}],
      sessaoPlanejamento:'checklist_calendario_disponivel'
    }),
    'calendarios/cliente-fixture':{
      fixturePermitidos:[item],
      items:[{itemId:'item-misto',name:'Roteiro marcado',gravado:false}]
    }
  });
  const checkbox = criarCheckbox({nome:'Roteiro marcado',idx:0,itemId:'item-misto',responsavel:'Luís'});
  const execucao = criarContextoRegistro({
    backend,agId,checkboxes:[checkbox],textoManual:'Cena espontânea real',responsavelManual:'Luiz'
  });
  const retorno = await execucao.contexto.window.registrarGravacaoRealizada(agId);
  const ag = backend.documentos.get('agendamentos/'+agId);
  const videos = videosDoBackend(backend);
  exigir(retorno === true && videos.length === 2 && ag.registroCaptacaoModo === 'misto' &&
    ag.qtdVideosVinculadosCalendario === 1 && ag.qtdVideosDeclaradosCampo === 1 &&
    ag.qtdVideosRealizados === 2 && ag.qtdVideosFaltantes === 1,
    'modo misto cria os dois vídeos atomicamente e separa suas contagens');
  exigir(videos.filter(v=>v.dados.calendarItemId === 'item-misto').length === 1 &&
    videos.filter(v=>v.dados.calendarItemId === null && v.dados.calendarItemIdx === null && v.dados.calendarClienteSlug === null).length === 1,
    'modo misto marca somente o item exato e mantém a declaração manual isolada');
  exigir(backend.transacoes[0].operacoes.filter(op=>op.startsWith('set:videos_producao/')).length === 2 &&
    backend.transacoes[0].operacoes.at(-1) === 'update:calendarios/cliente-fixture',
    'modo misto grava ambos na fila antes de atualizar somente a pauta selecionada');
}

/* Papéis e carteira/equipe continuam sendo autorização, não o calendário. */
{
  const agId = 'ag-papeis';
  for(const pessoa of ['Luís','Nathan']){
    const backendPermitido = criarBackend({
      ['agendamentos/'+agId]:agendamentoFixture({
        filmmaker:pessoa,
        equipe:[{nome:pessoa,papel:'Filmmaker'}]
      })
    });
    const alias = pessoa === 'Luís' ? 'Luiz' : 'Natan';
    const permitido = criarContextoRegistro({
      backend:backendPermitido,agId,usuario:pessoa,
      textoManual:'Registro atribuído de '+pessoa,responsavelManual:alias
    });
    exigir(await permitido.contexto.window.registrarGravacaoRealizada(agId) === true &&
      backendPermitido.transacoes.length === 1 && videosDoBackend(backendPermitido).length === 1,
      pessoa+' atribuído à sessão pode registrar uma única baixa');
  }

  const backendCecilia = criarBackend({['agendamentos/'+agId]:agendamentoFixture()});
  const cecilia = criarContextoRegistro({
    backend:backendCecilia,agId,usuario:'Cecília',textoManual:'Tentativa de baixa'
  });
  exigir(await cecilia.contexto.window.registrarGravacaoRealizada(agId) === false &&
    backendCecilia.leiturasExternas.length === 0 && backendCecilia.transacoes.length === 0 &&
    cecilia.toasts.some(t=>t.mensagem.includes('acompanha pelo controle')),
    'Cecília permanece somente leitura e é recusada antes de qualquer leitura');

  const backendAmanda = criarBackend({['agendamentos/'+agId]:agendamentoFixture()});
  const amanda = criarContextoRegistro({backend:backendAmanda,agId,usuario:'Amanda',textoManual:'Tentativa'});
  exigir(await amanda.contexto.window.registrarGravacaoRealizada(agId) === false &&
    backendAmanda.leiturasExternas.length === 0 && backendAmanda.transacoes.length === 0,
    'papel fora do executor de captação é recusado antes de qualquer leitura');

  const backendForaEquipe = criarBackend({
    ['agendamentos/'+agId]:agendamentoFixture({filmmaker:'Nathan',equipe:[{nome:'Nathan',papel:'Filmmaker'}]})
  });
  const luis = criarContextoRegistro({backend:backendForaEquipe,agId,usuario:'Luís',textoManual:'Tentativa'});
  exigir(await luis.contexto.window.registrarGravacaoRealizada(agId) === false &&
    backendForaEquipe.transacoes.length === 0 && videosDoBackend(backendForaEquipe).length === 0,
    'filmmaker fora da equipe da sessão não registra nem cria vídeo');
}

/* Falha da pré-leitura é indisponibilidade, nunca “gravação inexistente”.
   O wrapper real precisa encerrar a tentativa, restaurar o botão e não
   permitir que qualquer transação ou escrita comece. */
{
  const casos = [
    {rotulo:'permission-denied',codigo:'permission-denied',mensagem:'leitura negada'},
    {rotulo:'timeout',codigo:'deadline-exceeded',mensagem:'tempo limite excedido'},
    {rotulo:'offline',codigo:'unavailable',mensagem:'cliente offline'}
  ];
  for(const caso of casos){
    const agId = 'ag-preleitura-' + caso.rotulo;
    const erro = Object.assign(new Error(caso.mensagem),{code:caso.codigo});
    const inicial = agendamentoFixture();
    const backend = criarBackend(
      {['agendamentos/'+agId]:inicial},
      {falhaPreLeitura:{caminho:'agendamentos/'+agId,erro}}
    );
    const execucao = criarContextoRegistro({
      backend,agId,textoManual:'Título preservado na interface',responsavelManual:'Luís'
    });
    const retorno = await execucao.contexto.window.registrarGravacaoRealizada(agId);
    const toastErro = execucao.toasts.find(t=>t.tipo === 'erro');
    exigir(retorno === false && backend.leiturasExternas.join(',') === 'agendamentos/'+agId &&
      backend.transacoes.length === 0 && backend.addDocs.length === 0 && backend.demandas.length === 0 &&
      videosDoBackend(backend).length === 0 &&
      JSON.stringify(backend.documentos.get('agendamentos/'+agId)) === JSON.stringify(inicial),
      caso.rotulo+' na pré-leitura retorna false e produz zero transação/escrita');
    exigir(toastErro?.mensagem.includes('('+caso.codigo+')') &&
      toastErro.mensagem.includes('Nada foi confirmado') &&
      !toastErro.mensagem.includes('não existe mais') &&
      execucao.documento.botao.textContent === 'Enviar vídeos gravados e concluir sessão' &&
      execucao.documento.botao.disabled === false,
      caso.rotulo+' mostra o código, não vira vazio e restaura o botão');
  }

  const agIdVazio = 'ag-realmente-ausente';
  const backendVazio = criarBackend({});
  const vazio = criarContextoRegistro({
    backend:backendVazio,agId:agIdVazio,textoManual:'Título não persistido',responsavelManual:'Luís'
  });
  const retornoVazio = await vazio.contexto.window.registrarGravacaoRealizada(agIdVazio);
  exigir(retornoVazio === false && vazio.toasts.some(t=>t.mensagem.includes('Essa gravação não existe mais.')) &&
    !vazio.toasts.some(t=>t.mensagem.includes('Nada foi confirmado por esta tentativa')) &&
    backendVazio.transacoes.length === 0 && videosDoBackend(backendVazio).length === 0,
    'documento realmente ausente usa estado vazio distinto dos erros de leitura');
}

/* A trava cobre clique duplo na mesma aba; a transação cobre duas abas, que
   têm Sets independentes e chegam juntas ao mesmo agendamento. */
{
  const agId = 'ag-clique-duplo';
  const backend = criarBackend({['agendamentos/'+agId]:agendamentoFixture()});
  const execucao = criarContextoRegistro({backend,agId,textoManual:'Vídeo único'});
  const primeira = execucao.contexto.window.registrarGravacaoRealizada(agId);
  const segunda = await execucao.contexto.window.registrarGravacaoRealizada(agId);
  exigir(segunda === false, 'clique duplo na mesma aba é barrado pela trava real');
  exigir(await primeira === true && videosDoBackend(backend).length === 1 && backend.transacoes.length === 1,
    'clique duplo conclui uma única transação e cria um único vídeo');
}

{
  const agId = 'ag-duas-abas';
  const barreira = criarBarreira(2);
  const backend = criarBackend(
    {['agendamentos/'+agId]:agendamentoFixture()},
    {barreiraPreLeitura:{caminho:'agendamentos/'+agId,entrar:barreira.entrar}}
  );
  const abaA = criarContextoRegistro({backend,agId,textoManual:'Mesmo vídeo real'});
  const abaB = criarContextoRegistro({backend,agId,textoManual:'Mesmo vídeo real'});
  const resultados = await Promise.all([
    abaA.contexto.window.registrarGravacaoRealizada(agId),
    abaB.contexto.window.registrarGravacaoRealizada(agId)
  ]);
  exigir(resultados.filter(Boolean).length === 1 && resultados.filter(v=>v === false).length === 1,
    'duas abas com pré-leitura simultânea têm exatamente um commit vencedor');
  exigir(backend.transacoes.length === 2 && backend.transacoes.filter(t=>t.confirmada).length === 1 &&
    backend.transacoes.some(t=>t.erro === 'Esta gravação já foi encerrada ou alterada em outra aba.') &&
    videosDoBackend(backend).length === 1,
    'segunda transação relê o status, aborta com a mensagem atual e não duplica vídeo');
}

/* Strings e ordem críticas da transação são parte do contrato auditável. */
const posTransacao = fonteRegistro.indexOf('await runTransaction(db');
const posLeAg = fonteRegistro.indexOf('const agAtual = await transacao.get(agRef)', posTransacao);
const posGuardaStatus = fonteRegistro.indexOf("if(dadosAtuais.status !== 'agendado')", posLeAg);
const posAtualizaAg = fonteRegistro.indexOf('transacao.update(agRef', posGuardaStatus);
const posCriaVideos = fonteRegistro.indexOf('videosParaTransacao.forEach(v => transacao.set', posAtualizaAg);
const posAtualizaCalendario = fonteRegistro.indexOf('transacao.update(calRef', posCriaVideos);
exigir(posTransacao >= 0 && posLeAg > posTransacao && posGuardaStatus > posLeAg &&
  posAtualizaAg > posGuardaStatus && posCriaVideos > posAtualizaAg && posAtualizaCalendario > posCriaVideos,
  'ordem do núcleo é reler, revalidar, baixar agendamento, criar vídeos e por fim marcar calendário');
exigir(fonteRegistro.includes('Um conteúdo marcado pertence a outra sessão. Reabra a ordem do dia.') &&
  fonteRegistro.includes('O responsável de um conteúdo não pertence mais à equipe desta sessão. Reabra e confira.') &&
  fonteRegistro.includes('Nenhum vídeo foi criado.'),
  'mensagens atuais preservam causa, isolamento de sessão/equipe e atomicidade');

/* A V101 acrescenta uma projeção separada sem ampliar o writer V100. */
exigir(regras.includes('function podeLancarVideoProducao()') &&
  regras.includes('match /calendarios_conferencias/{calendarId}') &&
  regras.includes('match /calendarios_encerramentos/{calendarId}'),
  'V101 preserva o writer V100 e acrescenta somente as projeções de conclusão');
exigir(calendario === calendarios,
  'calendario.html e calendarios.html permanecem byte a byte idênticos');
exigir(sha256(calendario) === '9fc8a2266acdf0fa7a122b29fe33c12c304c91cdf83bc94126dc8e7681006a0c',
  'par de calendários mantém o hash conhecido');

console.log(`REGRESSÃO V100 REGISTRO AUTÔNOMO FILMMAKER: APROVADA (${total} verificações)`);
