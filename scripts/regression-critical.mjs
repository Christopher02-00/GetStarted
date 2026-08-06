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
  const contexto = vm.createContext({ Date, console, window: {}, setTimeout, clearTimeout });
  new vm.Script(codigo, { filename: nome }).runInContext(contexto);
  return contexto.api;
}

async function testarLoginSandbox() {
  exigir(escritorio.includes("'heloisaksc@gmail.com':'Helo'") &&
    escritorio.includes("'luissouza280507@gmail.com':'Luís'"),
    'Elô ou Luís perdeu o mapeamento de e-mail autorizado');

  exigir(escritorio.includes('id="btnLoginGoogleEquipe" onclick="entrarComGoogleEquipe()" disabled>Preparando login…</button>'),
    'botão Google voltou a aceitar clique antes de a persistência estar pronta');
  const login = trecho(escritorio, 'window.entrarComGoogleEquipe = async function', '  window.sairDoEscritorio');
  exigir(!login.includes('await setPersistence(') &&
    login.indexOf('signInWithPopup(auth,provedor)') >= 0 &&
    login.indexOf('signInWithPopup(auth,provedor)') < login.indexOf('const cred=await'),
    'Safari voltou a perder o gesto porque há espera antes de abrir o Google');
  exigir(login.includes('if(__loginGoogleEquipeEmCurso) return false;') &&
    login.includes('__loginGoogleEquipeEmCurso = false;'),
    'login Google perdeu a trava contra clique duplo');

  const loginFonte = trecho(escritorio, 'function mensagemErroLoginGoogleEquipe', '  window.sairDoEscritorio');
  const loginApi = executarSandbox('google-primeiro-clique-sandbox.js',
    `let __persistenciaAuthEquipePronta=true;let __loginGoogleEquipeEmCurso=false;let chamadasPopup=0;let aplicacoes=0;let gate='';\n` +
    `const botao={disabled:false,textContent:'Continuar com Google'};const erro={style:{display:'none'},textContent:''};\n` +
    `const document={getElementById:id=>id==='btnLoginGoogleEquipe'?botao:erro};const auth={};\n` +
    `class GoogleAuthProvider{setCustomParameters(v){this.parametros=v;}}\n` +
    `function signInWithPopup(){chamadasPopup++;return Promise.resolve({user:{uid:'luis'}});}\n` +
    `async function aplicarUsuarioGoogle(){aplicacoes++;return true;}\n` +
    `function mostrarGateEquipe(msg){gate=msg;}\n` +
    `${loginFonte}\n` +
    `globalThis.api={entrar:()=>window.entrarComGoogleEquipe(),chamadas:()=>chamadasPopup,aplicacoes:()=>aplicacoes,botao,erro,gate:()=>gate,mensagemErroLoginGoogleEquipe};`);
  const primeiroClique = loginApi.entrar();
  const cliqueDuplicado = loginApi.entrar();
  exigir(loginApi.chamadas() === 1, 'primeiro clique não abriu o Google exatamente uma vez');
  exigir(await cliqueDuplicado === false, 'clique duplo iniciou uma segunda autenticação');
  exigir(await primeiroClique === true && loginApi.aplicacoes() === 1,
    'retorno do Google não aplicou a identidade exatamente uma vez');
  exigir(loginApi.botao.disabled === false && loginApi.botao.textContent === 'Continuar com Google',
    'botão de login não voltou ao estado utilizável após a tentativa');
  exigir(loginApi.mensagemErroLoginGoogleEquipe({code:'auth/popup-blocked'}).includes('auth/popup-blocked'),
    'erro do Google voltou a ser escondido por mensagem genérica');

  const aplicar = trecho(escritorio, 'async function aplicarUsuarioGoogle', 'window.entrarComGoogleEquipe');
  exigir(!aplicar.includes('await window.mudarUsuarioGlobal()') &&
    aplicar.includes('window.__inicializacaoEquipeAtual = Promise.resolve(window.mudarUsuarioGlobal())'),
    'login Google voltou a aguardar toda a carga operacional');

  const mudar = trecho(escritorio, 'window.mudarUsuarioGlobal = async function', '/* ===== FRENTE C1');
  const identidade = mudar.indexOf('usuarioAtual = escolhido');
  const isolamento = mudar.indexOf('atualizarVisibilidadeMenuPorFuncao()');
  const primeiraLeitura = mudar.indexOf("await etapaSegura('abrir sessão da equipe'");
  exigir(identidade >= 0 && isolamento > identidade && primeiraLeitura > isolamento,
    'uma leitura remota voltou a bloquear identidade ou isolamento do DOM');

  const etapaFonte = trecho(escritorio, 'const LIMITE_ETAPA_INICIALIZACAO_MS', '/* ===== AUTORIZAÇÃO DA EQUIPE');
  const api = executarSandbox('login-timeout-sandbox.js',
    `${etapaFonte}\nglobalThis.api={etapaSegura};`);
  const inicio = Date.now();
  await api.etapaSegura('consulta que não responde', () => new Promise(()=>{}), 5);
  exigir(Date.now() - inicio < 250, 'etapa sem resposta ainda prende o login indefinidamente');
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
  exigir(campo.includes('const alvo = await clientesOperacionaisParaCampo()') &&
    !campo.includes('clientesDeConteudoRecorrente()'),
    'modo campo voltou a depender de classificação financeira');
  exigir(campo.includes('const lista = alvo.slice();') && campo.includes("onclick=\"abrirCampoDoCliente("),
    'modo campo voltou a esconder clientes antes de abrir o documento escolhido');
  exigir(!campo.includes('getHours(') && !campo.includes('filter(c => hoje['),
    'horário ou agenda do dia voltou a bloquear a carteira do filmmaker');

  const fonteCarteira = trecho(escritorio, 'function clienteDisponivelParaCampo', 'window.renderCalendarioDeCampo = async function');
  const carteira = executarSandbox('carteira-campo-sandbox.js',
    `const SLUGS_INTERNOS=['get-started'];const FORA_DA_META_SEMENTE={'ex cliente':'saiu'};\n` +
    `function normNomeCliente(x){return String(x||'').toLowerCase();}\n` +
    `function ehClienteSoEdicao(slug){return slug==='so-edicao';}\n` +
    `${fonteCarteira}\nglobalThis.api={clienteDisponivelParaCampo};`);
  exigir(carteira.clienteDisponivelParaCampo({slug:'stokki',nome:'Stokki'}, {}) === true,
    'cliente mensalista sem restrição desapareceu da carteira de campo');
  exigir(carteira.clienteDisponivelParaCampo({slug:'get-started',nome:'Get Started'}, {}) === false,
    'cliente interno vazou para o calendário de campo');
  exigir(carteira.clienteDisponivelParaCampo({slug:'avulso',nome:'Avulso'}, {avulso:{tipoCliente:'avulso'}}) === false,
    'cliente avulso vazou para o calendário de campo');
  exigir(carteira.clienteDisponivelParaCampo({slug:'legado',nome:'Ex Cliente'}, {legado:{semConteudoRecorrente:false}}) === true,
    'configuração explícita não prevaleceu sobre exclusão legada');

  const agenda = trecho(escritorio, 'async function renderMinhaAgendaFilmmaker', 'window.renderMinhaAgendaFilmmaker = renderMinhaAgendaFilmmaker');
  exigir(!agenda.includes('obterCalendariosCompartilhados()') &&
    agenda.includes("getDoc(doc(db,'calendarios',slug))"),
    'Minha agenda do filmmaker voltou a ler todos os calendários');
  exigir(agenda.includes('planejarSessaoGravacao(calAgenda, a)') &&
    agenda.includes('errosCalendariosAgenda.has(slugAgenda)'),
    'agenda não separa a sessão ou converte falha em vazio');
  const fonteIndices = trecho(escritorio, 'function itensDoMesComIndiceGlobal', 'async function renderMinhaAgendaFilmmaker');
  const indices = executarSandbox('indices-calendario-agenda-sandbox.js',
    `function itensDoMesCalendario(cal,mes){return (cal.items||[]).filter(i=>i.mes===mes);}\n` +
    `${fonteIndices}\nglobalThis.api={itensDoMesComIndiceGlobal};`);
  const misturado = {items:[
    {mes:'2026-07',name:'jul-0'}, {mes:'2026-08',name:'ago-1'},
    {mes:'2026-07',name:'jul-2'}, {mes:'2026-08',name:'ago-3'}
  ]};
  exigir(indices.itensDoMesComIndiceGlobal(misturado,'2026-08').map(i=>i.idx).join(',') === '1,3',
    'recorte mensal renumerou o índice global do calendário');
  const gravacoesHoje = trecho(escritorio, 'async function carregarGravacoesDeHoje', 'window.abrirCampoDoCliente');
  exigir(gravacoesHoje.includes("query(collection(db,'agendamentos'), where('data','==',hoje))"),
    'destaque de hoje voltou a ler todos os agendamentos');
  exigir(gravacoesHoje.includes("a.status !== 'agendado'") && gravacoesHoje.includes('sessaoOrdem') &&
    gravacoesHoje.includes('window.__erroGravacoesDeHoje = e'),
    'destaque de hoje inclui gravação encerrada, perde a sessão ou converte erro em vazio');
  const campoAberto = trecho(escritorio, 'window.abrirCampoDoCliente = function', 'window.irParaConfirmarPublicacoes');
  exigir(campoAberto.includes('planejarSessaoGravacao(cal,g)') && campoAberto.includes('inconsistenciasCampo') &&
    !campoAberto.includes('const blocoDe ='),
    'modo Campo voltou a recalcular blocos dinamicamente fora da ordem congelada');
  const listenerCalendarios = trecho(escritorio, '/* Calendários são a fonte comum', 'function onDadosTempoRealMudaram');
  exigir(listenerCalendarios.includes("if(['Chris','Amanda','Cecília'].includes(pessoaDoOuvinte))") &&
    !listenerCalendarios.includes('...PESSOAS_DE_CAMPO'),
    'login do filmmaker voltou a assinar a coleção inteira de calendários');
  exigir(escritorio.includes("'Nathan': ['navVideos','navAgendamento','navCalendarios'") &&
    escritorio.includes("'Luís': ['navVideos','navChecklist','navAgendamento','navCalendarios'") &&
    escritorio.includes("'Luís':      ['campo']") && escritorio.includes("'Nathan':    ['campo']"),
    'Luís ou Nathan perdeu a porta/aterrissagem do calendário de campo');
  exigir(escritorio.includes("ba.textContent = tot ? String(tot) + '+' : '!'") &&
    escritorio.includes("erroFilaCalendariosAprovacao ? '!'"),
    'falha de leitura voltou a aparecer como zero para Amanda');
  exigir(calendario.includes("['viewGrid','viewWeek','viewKanban'].forEach") &&
    calendario.includes('O calendário não foi apagado; o banco não conseguiu entregá-lo agora.'),
    'Gabi voltou a receber uma grade branca quando o Firestore falha');
}

function testarSessoesGravacaoSandbox() {
  const fonte = trecho(escritorio, 'function itensDoMesComIndiceGlobal', 'async function renderMinhaAgendaFilmmaker');
  const api = executarSandbox('sessao-gravacao-sandbox.js',
    `const BLOCOS_MAX=3;\n` +
    `function itensDoMesCalendario(cal,mes){return (cal.items||[]).filter(i=>!mes||i.mes===mes);}\n` +
    `function mesesDeCalendario(cal){return [...new Set((cal.items||[]).map(i=>i.mes).filter(Boolean))].sort();}\n` +
    `function quantosBlocos(cal,mes){return Number(cal.blocosPorMes?.[mes])||2;}\n` +
    `function blocoDoItem(item,pos,total,quantos){if(Number(item.bloco)>=1)return Number(item.bloco);const base=Math.floor(total/quantos),resto=total%quantos;let acc=0;for(let i=0;i<quantos;i++){acc+=base+(i<resto?1:0);if(pos<acc)return i+1;}return quantos;}\n` +
    `function itemNaoPrecisaGravar(i){return !!(i.gravado||i.agendado||i.posted);}\n` +
    `function estadoMesCal(cal,mes){return cal.aprovacaoMeses?.[mes]?.status||'';}\n` +
    `${fonte}\nglobalThis.api={planejarSessaoGravacao,chaveSessaoGravacao};`);

  const cal = { blocosPorMes:{'2026-08':2}, aprovacaoMeses:{'2026-08':{status:'liberado'}}, items:[
    {itemId:'a',mes:'2026-08',day:1,name:'Semana 1 A',bloco:1},
    {itemId:'b',mes:'2026-08',day:2,name:'Semana 1 B',bloco:1},
    {itemId:'c',mes:'2026-08',day:8,name:'Semana 2 A',bloco:2},
    {itemId:'d',mes:'2026-08',day:9,name:'Semana 2 B',bloco:2}
  ]};
  const ag = {cliente:'kerry',data:'2026-08-06',mesCalendario:'2026-08',sessaoOrdem:1,sessaoPlanejamentoVersao:1,
    sessaoItensPlanejados:[
      {idx:0,itemId:'a',nome:'Semana 1 A',ordem:1,grupo:'fazerHoje'},
      {idx:1,itemId:'b',nome:'Semana 1 B',ordem:2,grupo:'fazerHoje'}
    ]};
  const plano = api.planejarSessaoGravacao(cal,ag);
  exigir(plano.permitidos.map(i=>i.itemId).join(',') === 'a,b', 'sessão Kerry misturou pauta da semana/sessão 2');
  exigir(plano.naoGravarHoje.map(i=>i.itemId).join(',') === 'c,d', 'pauta futura não foi separada em NÃO GRAVAR HOJE');

  const depoisPrimeiro = JSON.parse(JSON.stringify(cal));
  depoisPrimeiro.items[0].gravado = true;
  const estavel = api.planejarSessaoGravacao(depoisPrimeiro,ag);
  exigir(estavel.permitidos.map(i=>i.itemId).join(',') === 'b' && estavel.inconsistencias.length === 0,
    'snapshot da sessão derivou outra divisão depois de um item concluído');

  const legado = { blocosPorMes:{'2026-08':2}, aprovacaoMeses:{'2026-08':{status:'liberado'}}, items:[
    {mes:'2026-08',day:1,name:'L1'}, {mes:'2026-08',day:2,name:'L2'},
    {mes:'2026-08',day:8,name:'L3'}, {mes:'2026-08',day:9,name:'L4'}
  ]};
  const planoLegado = api.planejarSessaoGravacao(legado,{cliente:'legado',data:'2026-08-06',bloco:1});
  exigir(planoLegado.permitidos.map(i=>i.name).join(',') === 'L1,L2' && planoLegado.usaDerivacaoLegada === true,
    'calendário legado seguro não derivou a primeira sessão sem migrar dados');
  const ambiguo = api.planejarSessaoGravacao({items:[{mes:'2026-07',name:'J'},{mes:'2026-08',name:'A'}]},
    {cliente:'legado',data:'2026-09-01',bloco:1});
  exigir(ambiguo.permitidos.length === 0 && ambiguo.inconsistencias.length === 1,
    'sessão legada ambígua liberou conteúdo de um mês por suposição');

  const agenda = trecho(escritorio, 'async function renderMinhaAgendaFilmmaker', 'window.renderMinhaAgendaFilmmaker = renderMinhaAgendaFilmmaker');
  exigir(agenda.includes('FAZER HOJE') && agenda.includes('NÃO GRAVAR HOJE') &&
    agenda.includes('confirmacaoBloqueada') && agenda.includes('planoSessao.permitidos'),
    'Minha sessão perdeu grupos visuais ou desbloqueou pauta não planejada');
  const confirmar = trecho(escritorio, 'async function registrarGravacaoRealizadaNucleo', 'function popularClientesReferencia');
  exigir(confirmar.includes("dadosAtuais.status !== 'agendado'") && confirmar.includes('dadosAtuais.aprovado === false') &&
    confirmar.includes('pessoaNaEquipe(dadosAtuais,usuarioAtual)') && confirmar.includes('permitidosAgora.has(chave)') &&
    confirmar.includes('Captações extras não estão autorizadas nesta sessão.'),
    'transação de confirmação não revalida status, equipe, aprovação, sessão e extras');
  const wrapperConfirmacao = trecho(escritorio, 'const __confirmacoesGravacaoEmCurso', 'function popularClientesReferencia');
  exigir(wrapperConfirmacao.includes('__confirmacoesGravacaoEmCurso.has(agId)') &&
    wrapperConfirmacao.indexOf('__confirmacoesGravacaoEmCurso.add(agId)') < wrapperConfirmacao.indexOf('await registrarGravacaoRealizadaNucleo(agId)'),
    'confirmação perdeu a trava anterior ao primeiro await');

  exigir(calendario.includes('const it={...anterior,itemId:anterior.itemId||') &&
    calendario.includes("data.items[editIdx]={...data.items[editIdx],excluido:true") &&
    calendario.includes("const mbl=document.getElementById('mBloco'); if(mbl) mbl.value='';") &&
    calendario.includes('renderAprovacaoInterna();renderBlocos();'),
    'editor de calendário voltou a apagar campos, excluir fisicamente, herdar bloco ou não atualizar a divisão');
  exigir(escritorio.includes("'Amanda': ['navCentral','navAprovacoes','navChecklist','navAgendamento'") &&
    escritorio.includes("window.replanejarSessaoGravacao = async function"),
    'Amanda perdeu acesso ao planejamento das sessões');

  const agendar = trecho(escritorio, 'window.agendarGravacao = async function', 'window.toggleFormGravacao');
  exigir(agendar.includes('equipePermitidaNoAgendamento(lerEquipeDoFormulario(), usuarioAtual)') &&
    agendar.includes("if(!equipe.length)") && agendar.includes('sessaoItensPlanejados'),
    'agendamento não fixa equipe ou não congela a pauta da sessão');
  exigir(agendar.indexOf('__agendamentoEmCurso = true;') < agendar.indexOf('await getDocs(') &&
    agendar.includes('finally') && agendar.includes('__agendamentoEmCurso = false;'),
    'agendamento perdeu a trava de clique duplo antes da primeira leitura');

  const trocar = trecho(escritorio, 'window.trocarFilmmakerAgendamento', '/* ===== A CECÍLIA PRECISA PODER DESFAZER');
  exigir(trocar.includes('filmmaker: filmmaker ||') && trocar.includes('equipe,'),
    'troca de filmmaker voltou a atualizar somente um dos modelos compatíveis');
}

function testarPermissoesAcoesSandbox() {
  const aplicar = trecho(escritorio, 'async function aplicarUsuarioGoogle', 'window.entrarComGoogleEquipe');
  exigir(aplicar.indexOf('limparIdentidadeEquipeAnterior') < aplicar.indexOf('await pessoaAutorizadaPeloGoogle'),
    'troca de conta valida a nova pessoa antes de limpar dados da anterior');
  const videosSub = trecho(escritorio, 'window.setVideosSub = function', '/* ===== FRENTE B5');
  exigir(videosSub.includes("qual==='lancar' && CAMPO_MAIS_CHRIS.includes(usuarioAtual)") &&
    videosSub.includes("qual==='meus' && [...EDITORES_SELECIONAVEIS,'Chris'].includes(usuarioAtual)"),
    'sub-abas de vídeo voltaram a confiar só em display:none');
  const excluir = trecho(escritorio, 'window.excluirVideoComMotivo', 'window.excluirVideoGerencia');
  exigir(excluir.indexOf("getDoc(doc(db,'videos_producao', id))") < excluir.indexOf("prompt('Por que este vídeo") &&
    excluir.includes('ehDonoVideo') && excluir.includes('ehGestaoVideo'),
    'exclusão de vídeo não confirma propriedade antes de pedir/efetuar a exclusão');
  const stories = trecho(escritorio, 'window.liberarStory', '/* Guarda os links por cliente');
  exigir((stories.match(/\!\['Chris','Amanda'\]\.includes\(usuarioAtual\)/g)||[]).length === 2,
    'liberar/devolver Stories perdeu a guarda de gestão');
}

try {
  await testarLoginSandbox();
  testarFinanceiroSandbox();
  testarBadgesExtrasSandbox();
  await testarOrcamentoLeiturasFirestoreSandbox();
  testarDatasOperacionaisSandbox();
  testarAcompanhamentoSandbox();
  testarDemandasSandbox();
  testarCalendariosSandbox();
  testarSessoesGravacaoSandbox();
  testarPermissoesAcoesSandbox();
  console.log(`REGRESSÃO CRÍTICA: APROVADA (${total} asserções)`);
} catch (erro) {
  console.error(`REGRESSÃO CRÍTICA: FALHOU — ${erro.stack || erro.message}`);
  process.exitCode = 1;
}
