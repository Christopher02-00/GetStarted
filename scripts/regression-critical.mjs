#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escritorio = fs.readFileSync(path.join(raiz, 'escritorio.html'), 'utf8');
const calendario = fs.readFileSync(path.join(raiz, 'calendario.html'), 'utf8');
let total = 0;

function exigir(condicao, mensagem) {
  total++;
  if (!condicao) throw new Error(mensagem);
}

function trecho(fonte, inicio, fim) {
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if (a < 0 || b < 0) throw new Error(`não encontrei o trecho: ${inicio}`);
  return fonte.slice(a, b);
}

function executarSandbox(nome, codigo) {
  const contexto = vm.createContext({ Date, console, window: {} });
  new vm.Script(codigo, { filename: nome }).runInContext(contexto);
  return contexto.api;
}

function testarFinanceiroSandbox() {
  const fonte = trecho(escritorio, 'function competenciaValidaExtra', '/* Alias legado:');
  const api = executarSandbox('financeiro-sandbox.js',
    `function hojeLocal(){ return '2026-08-05'; }\n${fonte}\nglobalThis.api={mesDaRealizacaoExtra,mesDoPagamentoExtra};`);
  for (let ano = 2023; ano <= 2029; ano++) {
    for (let mes = 1; mes <= 12; mes++) {
      const realizacao = `${ano}-${String(mes).padStart(2, '0')}`;
      const prox = new Date(Date.UTC(ano, mes, 1));
      const esperado = `${prox.getUTCFullYear()}-${String(prox.getUTCMonth() + 1).padStart(2, '0')}`;
      exigir(api.mesDoPagamentoExtra({ competenciaRealizacao: realizacao }) === esperado,
        `folha incorreta para ${realizacao}`);
      exigir(api.mesDoPagamentoExtra({ competenciaRealizacao: realizacao, competenciaPagamento: '2099-12' }) === esperado,
        `competência explícita inválida alterou ${realizacao}`);
    }
  }
}

function testarBadgesExtrasSandbox() {
  const fonte = trecho(escritorio, 'const extraLiberado =', 'function porMesDePagamentoDosExtras');
  const api = executarSandbox('extras-badges-sandbox.js',
    `function hojeLocal(){ return '2026-08-05'; }\n${fonte}\n` +
    `globalThis.api={dataLimitePagamentoExtra,extraVencidoParaPagamento,extrasVencidosParaPagamento};`);
  const folhaAtual = { id:'jul', competenciaRealizacao:'2026-07', pago:false, aprovadoPeloChris:true, informadoPelaPessoa:true };
  const folhaAnterior = { id:'jun', competenciaRealizacao:'2026-06', pago:false, aprovadoPeloChris:true, informadoPelaPessoa:true };
  exigir(api.dataLimitePagamentoExtra(folhaAtual) === '2026-08-15', 'vencimento do extra não caiu no dia 15 da folha seguinte');
  exigir(api.extraVencidoParaPagamento(folhaAtual, '2026-08-05') === false, 'folha futura virou falso atraso no badge');
  exigir(api.extraVencidoParaPagamento(folhaAtual, '2026-08-15') === true, 'extra não acendeu no próprio vencimento');
  exigir(api.extraVencidoParaPagamento(folhaAnterior, '2026-08-05') === true, 'folha anterior em aberto não apareceu como vencida');
  exigir(api.extraVencidoParaPagamento({ ...folhaAnterior, pago:true }, '2026-08-05') === false, 'extra pago permaneceu no badge');
  exigir(api.extraVencidoParaPagamento({ ...folhaAnterior, excluido:true }, '2026-08-05') === false, 'soft-delete permaneceu no badge');
  exigir(api.extraVencidoParaPagamento({ ...folhaAnterior, aprovadoPeloChris:false }, '2026-08-05') === false, 'extra ainda não conferido foi contado como pagamento vencido');
  exigir(api.extrasVencidosParaPagamento([folhaAtual,folhaAnterior], '2026-08-05').map(x=>x.id).join(',') === 'jun',
    'badge não usa exatamente a lista de pagamentos realmente vencidos');
  exigir(escritorio.includes("encerradoAutomaticamente:'pagamento_extra'"), 'aprovação do extra não encerra o aviso relacionado');
  exigir(escritorio.includes('if(demandaDeExtraJaResolvida(demanda)) return false;'), 'avisos legados resolvidos continuam visíveis');
  const filtroAvisoFonte = trecho(escritorio, 'function demandaDeExtraJaResolvida', 'window.irParaExtras');
  const filtro = executarSandbox('extras-avisos-sandbox.js',
    `const extraLiberado=p=>!p.informadoPelaPessoa||p.aprovadoPeloChris;\n` +
    `let cacheExtrasMenuPronto=true;let cacheExtrasMenu=[` +
    `{id:'pendente',informadoPelaPessoa:true,aprovadoPeloChris:false,pago:false},` +
    `{id:'aprovado',informadoPelaPessoa:true,aprovadoPeloChris:true,pago:false},` +
    `{id:'pago',informadoPelaPessoa:true,aprovadoPeloChris:true,pago:true},` +
    `{id:'excluido',informadoPelaPessoa:true,aprovadoPeloChris:false,pago:false,excluido:true}];\n` +
    `${filtroAvisoFonte}\nglobalThis.api={demandaDeExtraJaResolvida};`);
  exigir(filtro.demandaDeExtraJaResolvida({pagamentoExtraId:'pendente'}) === false, 'aviso de extra ainda não conferido foi escondido');
  exigir(filtro.demandaDeExtraJaResolvida({pagamentoExtraId:'aprovado'}) === true, 'aviso legado aprovado continuou aberto');
  exigir(filtro.demandaDeExtraJaResolvida({pagamentoExtraId:'pago'}) === true, 'aviso legado pago continuou aberto');
  exigir(filtro.demandaDeExtraJaResolvida({pagamentoExtraId:'excluido'}) === true, 'aviso legado de soft-delete continuou aberto');
  exigir(filtro.demandaDeExtraJaResolvida({pagamentoExtraId:'inexistente'}) === true, 'aviso órfão continuou contaminando contador');
  exigir(filtro.demandaDeExtraJaResolvida({}) === false, 'demanda comum foi confundida com aviso de extra');
}

async function testarOrcamentoLeiturasFirestoreSandbox() {
  const fonte = trecho(escritorio, 'function __snapshotFalso', '/* Toda gravação invalida');
  const api = executarSandbox('firestore-cache-sandbox.js',
    `const __cacheColecoes=new Map();const TTL_CACHE_MS=10000;let backend=0;\n` +
    `async function _getDocsFB(){backend++;return {forEach(fn){fn({id:'backend',data:()=>({origem:'backend'})});}};}\n` +
    `${fonte}\n` +
    `globalThis.api={__cacheColecoes,__alimentarCacheTempoReal,__falhouCacheTempoReal,__snapshotFalso,getDocs,backend:()=>backend};`);
  const snapshot = {
    forEach(fn) {
      fn({ id:'a', data:()=>({status:'pendente'}) });
      fn({ id:'b', data:()=>({status:'aprovada'}) });
    }
  };
  api.__alimentarCacheTempoReal('demandas', snapshot);
  const guardado = api.__cacheColecoes.get('demandas');
  exigir(guardado?.tempoReal === true && guardado.itens.length === 2,
    'snapshot em tempo real não alimentou o cache compartilhado');
  const falso = api.__snapshotFalso(guardado.itens);
  exigir(falso.size === 2 && falso.docs[0].id === 'a' && falso.docs[0].data().status === 'pendente',
    'cache em tempo real mudou o formato esperado do snapshot');
  const ref={type:'collection',path:'demandas'};
  for(let i=0;i<50;i++) await api.getDocs(ref);
  exigir(api.backend()===0, 'painéis voltaram a cobrar a coleção depois do snapshot em tempo real');
  api.__falhouCacheTempoReal('demandas');
  exigir(!api.__cacheColecoes.has('demandas'), 'falha do listener deixou cache em tempo real obsoleto');
  await api.getDocs(ref);
  exigir(api.backend()===1, 'fallback do banco não voltou depois da falha do listener');

  const parar = trecho(escritorio, 'function pararListenersTempoReal', 'function iniciarListenersTempoReal');
  exigir(parar.includes('if(limparCachesColecoes !== false) __limparCacheColecoes();'),
    'troca de papel não limpa o cache completo da pessoa anterior');
  exigir(escritorio.includes("if(ehGestao) __alimentarCacheTempoReal('demandas',snap);"),
    'listener de gestão não reaproveita demandas já lidas');
  exigir(escritorio.includes("__alimentarCacheTempoReal('calendarios',snap);"),
    'listener de calendários não reaproveita o snapshot já lido');
  const badgeGerencia = trecho(escritorio, 'async function atualizarBadgeGerencia', 'function atualizarBadgeAprovar');
  exigir(!badgeGerencia.includes("getDocs(collection(db,'demandas'))"),
    'badge da gerência voltou a reler a coleção inteira');
  exigir(escritorio.includes("getDocs(query(collection(db,'anotacoes_pessoais'),where('autor','==',pessoaBadge)))"),
    'badge de anotações voltou a ler dados de todos os funcionários');
  exigir(escritorio.includes('const TTL_CONTADOR_ENTRADA=2*60*1000;'),
    'contador de clientes novos perdeu a deduplicação de leituras');
}

function testarDatasOperacionaisSandbox() {
  const fonte = trecho(escritorio, 'function dataLocal(d)', 'function hojeLocal()');
  const api = executarSandbox('datas-sandbox.js', `${fonte}\nglobalThis.api={dataLocal,diaOperacional,mesOperacional};`);
  exigir(api.diaOperacional('2026-08-05') === '2026-08-05', 'data civil recuou um dia');
  exigir(api.mesOperacional('2026-08-05') === '2026-08', 'mês civil incorreto');
  const instante = new Date(2026, 7, 5, 23, 30, 0);
  exigir(api.diaOperacional(instante.toISOString()) === '2026-08-05', 'timestamp noturno saiu do dia local');
  exigir(api.diaOperacional({ seconds: Math.floor(instante.getTime() / 1000) }) === '2026-08-05', 'Timestamp Firestore saiu do dia local');
}

function testarAcompanhamentoSandbox() {
  const fonte = trecho(escritorio, 'function dataLocal(d)', 'function hojeLocal()');
  const api = executarSandbox('acompanhamento-sandbox.js', `${fonte}\nglobalThis.api={diaOperacional,mesOperacional};`);
  const hoje = '2026-08-05';
  const videos = [
    { id:'entrega-local', enviadoEm:new Date(2026,7,5,23,30).toISOString(), status:'aguardando_aprovacao', editorAtribuido:'Helo' },
    { id:'correcao-hoje', correcaoSolicitadaEm:new Date(2026,7,5,10).toISOString(), status:'correcao', editorAtribuido:'Helo' },
    { id:'correcao-antiga', correcaoSolicitadaEm:new Date(2026,6,20,10).toISOString(), status:'correcao', editorAtribuido:'Helo' },
    { id:'com-cliente', enviadoEm:new Date(2026,7,4,10).toISOString(), status:'aguardando_cliente', editorAtribuido:'Helo' },
    { id:'apagado', enviadoEm:new Date(2026,7,5,10).toISOString(), status:'aguardando_aprovacao', editorAtribuido:'Helo', excluido:true }
  ].filter(v=>!v.excluido);
  const entreguesHoje = videos.filter(v=>api.diaOperacional(v.enviadoEm)===hoje);
  const ajustesHoje = videos.filter(v=>api.diaOperacional(v.correcaoSolicitadaEm)===hoje);
  const filaEditor = videos.filter(v=>['aguardando_edicao','correcao'].includes(v.status));
  exigir(entreguesHoje.length===1, 'entregas do dia ignoraram fuso ou soft-delete');
  exigir(ajustesHoje.length===1, 'ajustes históricos entraram no indicador de hoje');
  exigir(filaEditor.length===2, 'carga do editor incluiu vídeo que já saiu da mão dele');
  exigir(videos.filter(v=>api.mesOperacional(v.enviadoEm)==='2026-08').length===2, 'entregas mensais misturaram competência');
}

function testarDemandasSandbox() {
  const fonte = trecho(escritorio, 'const norm = t =>', 'window.criarDemandaSegura');
  const api = executarSandbox('demandas-sandbox.js',
    `function mesDaDemandaFixa(d){return d.mesRef||'';}\n${fonte}\nglobalThis.api={mesmaDemandaPendente};`);
  const jul = { titulo: 'Calendário Cliente X', tipoFuncaoFixa: true, funcaoFixaChave: 'calendario|2026-07', clienteSlug: 'x' };
  const ago = { ...jul, funcaoFixaChave: 'calendario|2026-08' };
  exigir(api.mesmaDemandaPendente(jul, { ...jul }) === true, 'mesma recorrência não deduplicou');
  exigir(api.mesmaDemandaPendente(jul, ago) === false, 'meses diferentes foram tratados como duplicata');

  const prazoFonte = trecho(escritorio, 'function camposAoAlterarPrazoDemanda', 'function demandaTemAtrasoResidual');
  const prazo = executarSandbox('prazo-sandbox.js', `${prazoFonte}\nglobalThis.api={camposAoAlterarPrazoDemanda};`)
    .camposAoAlterarPrazoDemanda('2026-08-20', '18:00', 'Amanda');
  exigir(prazo.prazoData === '2026-08-20' && prazo.prazoHora === '18:00', 'novo prazo não foi preservado');
  exigir(prazo.nivelEscalonamentoDemanda === 0 && prazo.urgenciaManual === '' && prazo.lembretePrazoHojeEm === '',
    'prazo alterado manteve cicatriz de atraso');
}

function testarCalendariosSandbox() {
  const fonte = trecho(calendario, "const MESES_PT=", '/* ===== VÁRIOS MESES');
  const api = executarSandbox('calendario-sandbox.js',
    `let data={month:'Agosto 2026'};let mesVisivel='';\n${fonte}\n` +
    `globalThis.api={mesRefDoTexto,offsetDoMes,diasDoMes,setMes:v=>{mesVisivel=v;}};`);
  exigir(api.mesRefDoTexto('Calendário de Agosto 2026').mes === 7, 'mês por extenso não reconhecido');
  exigir(api.mesRefDoTexto('AGO/2026').mes === 7, 'mês abreviado não reconhecido');
  exigir(api.mesRefDoTexto('2028-02').mes === 1, 'mês ISO não reconhecido');
  for (let ano = 2024; ano <= 2028; ano++) {
    for (let mes = 1; mes <= 12; mes++) {
      api.setMes(`${ano}-${String(mes).padStart(2, '0')}`);
      exigir(api.offsetDoMes() === new Date(ano, mes - 1, 1).getDay(), `coluna do dia 1 incorreta em ${ano}-${mes}`);
      exigir(api.diasDoMes() === new Date(ano, mes, 0).getDate(), `quantidade de dias incorreta em ${ano}-${mes}`);
    }
  }

  /* A mesma implementação precisa reconhecer a marca gravada pela Gabi e
     alimentar a lista/contador da Amanda, inclusive em documentos legados. */
  const fonteFila = trecho(escritorio, 'function mesDoItemCalendario', 'window.linhasCalendariosAguardandoRevisao');
  const fila = executarSandbox('calendarios-aprovacao-sandbox.js',
    `function mesDoTextoConf(txt){const m=String(txt||'').match(/(20\\d{2})-(\\d{2})/);return m?m[1]+'-'+m[2]:'';}\n` +
    `${fonteFila}\nglobalThis.api={estadoMesCal,itensDoMesCalendario,linhasCalendariosAguardandoRevisao};`);
  const registro = (id, dados) => ({ id, data:()=>dados });
  const agostoPendente = registro('cliente-x', {
    client:'Cliente X', items:[{mes:'2026-08',name:'A',ref:'https://ref'}],
    aprovacaoMeses:{'2026-08':{status:'aguardando_interna',por:'Gabrielle',em:'2026-08-06T01:00:00Z'}}
  });
  exigir(fila.linhasCalendariosAguardandoRevisao([agostoPendente]).length === 1,
    'envio mensal da Gabi não chegou à fila da Amanda');
  const mistoLegado = registro('cliente-legado', {
    client:'Legado', mesLegado:'2026-07', items:[{name:'antigo'},{mes:'2026-08',name:'novo'}],
    aprovacaoMeses:{'2026-07':{status:'aguardando_interna',por:'Gabrielle'},'2026-08':{status:'rascunho'}}
  });
  const filaLegado = fila.linhasCalendariosAguardandoRevisao([mistoLegado]);
  exigir(filaLegado.length === 1 && filaLegado[0].itens === 1 && filaLegado[0].mesKey === '2026-07',
    'conteúdo legado sumiu da fila mensal da Amanda');
  exigir(fila.linhasCalendariosAguardandoRevisao([registro('ok', {
    items:[{mes:'2026-08',name:'A'}], aprovacaoMeses:{'2026-08':{status:'liberado'}}
  })]).length === 0, 'calendário já liberado continuou pedindo aprovação');

  /* O filmmaker não pode depender da leitura dos 21 documentos para abrir
     um único cliente; o documento escolhido mantém o listener próprio. */
  const campo = trecho(escritorio, 'window.renderCalendarioDeCampo = async function', '/* ===== A GRAVAÇÃO DE HOJE');
  exigir(!campo.includes('obterCalendariosCompartilhados()'),
    'modo campo voltou a listar a coleção inteira de calendários');
  exigir(campo.includes('const lista = alvo.slice();') && campo.includes("onclick=\"abrirCampoDoCliente("),
    'modo campo voltou a esconder clientes antes de abrir o documento escolhido');
  const listenerCalendarios = trecho(escritorio, '/* Calendários são a fonte comum', 'function onDadosTempoRealMudaram');
  exigir(listenerCalendarios.includes("if(['Chris','Amanda','Cecília'].includes(pessoaDoOuvinte))") &&
    !listenerCalendarios.includes('...PESSOAS_DE_CAMPO'),
    'login do filmmaker voltou a assinar a coleção inteira de calendários');
  exigir(escritorio.includes("'Nathan': ['navVideos','navAgendamento','navCalendarios'") &&
    escritorio.includes("'Luís': ['navVideos','navChecklist','navAgendamento','navCalendarios'") &&
    escritorio.includes("'Luís':      ['campo','visao']") && escritorio.includes("'Nathan':    ['campo','visao']"),
    'Luís ou Nathan perdeu a porta/aterrissagem do calendário de campo');
  exigir(escritorio.includes("ba.textContent = tot ? String(tot) + '+' : '!'") &&
    escritorio.includes("erroFilaCalendariosAprovacao ? '!'"),
    'falha de leitura voltou a aparecer como zero para Amanda');
  exigir(calendario.includes("['viewGrid','viewWeek','viewKanban'].forEach") &&
    calendario.includes('O calendário não foi apagado; o banco não conseguiu entregá-lo agora.'),
    'Gabi voltou a receber uma grade branca quando o Firestore falha');
}

try {
  testarFinanceiroSandbox();
  testarBadgesExtrasSandbox();
  await testarOrcamentoLeiturasFirestoreSandbox();
  testarDatasOperacionaisSandbox();
  testarAcompanhamentoSandbox();
  testarDemandasSandbox();
  testarCalendariosSandbox();
  console.log(`REGRESSÃO CRÍTICA: APROVADA (${total} asserções)`);
} catch (erro) {
  console.error(`REGRESSÃO CRÍTICA: FALHOU — ${erro.stack || erro.message}`);
  process.exitCode = 1;
}
