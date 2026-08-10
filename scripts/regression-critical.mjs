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
    escritorio.includes("'yasmocelin@gmail.com':'Yas'") &&
    escritorio.includes("'Yas': 'yasmocelin@gmail.com'") &&
    escritorio.includes("'luissouza280507@gmail.com':'Luís'"),
    'Elô, Yas ou Luís perdeu o mapeamento de e-mail autorizado');
  const regrasLogin = fs.readFileSync(path.join(raiz, 'firestore.rules'), 'utf8');
  const mapaLogin = trecho(escritorio, 'const EMAIL_PARA_PESSOA_EQUIPE', '  let __resolverAuthEquipe');
  const emailsFixos = [...mapaLogin.matchAll(/'([^']+@gmail\.com)'\s*:/g)].map(m=>m[1]);
  const sementeRegras = trecho(regrasLogin, 'function emailDaEquipeSemente()', '    function emailDaEquipeCadastrado');
  exigir(emailsFixos.length >= 9 && emailsFixos.every(email=>sementeRegras.includes(`'${email}'`)),
    'um e-mail fixo do login abre a interface, mas continua sem autorização operacional no Firestore');

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

function testarMensalidadesSandbox() {
  const identidadeClientes = trecho(escritorio, 'const APELIDOS_DE_CONTRATO', '  function dataOperacionalISO');
  const fonte = trecho(escritorio, 'function statusMensalidadeCanonico', '  window.marcarMensalidade = async function');
  const api = executarSandbox('mensalidades-sandbox.js',
    `${identidadeClientes}\n${fonte}\nglobalThis.api={statusMensalidadeCanonico,mensalidadeResolvida,mensalidadesOperacionaisCanonicas,contratosOperacionaisCanonicos,ajusteCortesiaMensalidade,situacaoMensalidade};`);
  exigir(api.statusMensalidadeCanonico({status:' ISENTO '}) === 'isento' &&
    api.mensalidadeResolvida({status:'cortesia'}) === true,
    'cortesia legada/normalizada voltou a ser tratada como cobrança');
  exigir(api.mensalidadeResolvida({status:'pago'}) && api.mensalidadeResolvida({status:'cancelado'}) &&
    !api.mensalidadeResolvida({status:'aberto'}),
    'estado resolvido de mensalidade está inconsistente');
  exigir(api.situacaoMensalidade({status:'isento'},'2026-08').k === 'isento' &&
    api.situacaoMensalidade({status:'cancelado'},'2026-08').k === 'cancelado',
    'grade voltou a transformar cortesia/cancelamento em atraso');

  const abrir = {status:'aberto',competencia:'2026-08'};
  const tornarCortesia = api.ajusteCortesiaMensalidade(abrir,'2026-08',false,['2026-08']);
  exigir(tornarCortesia?.status === 'isento' && tornarCortesia.cortesiaDoMes === true,
    'salvar contrato não sincroniza mensalidade já criada com o mês de cortesia');
  const retirarContrato = api.ajusteCortesiaMensalidade(
    {status:'isento',cortesiaDoMes:true,motivoIsencao:'cortesia combinada para este mês'},'2026-08',false,[]);
  exigir(retirarContrato?.status === 'aberto',
    'retirar cortesia do contrato não reabre a mensalidade criada por ele');
  exigir(api.ajusteCortesiaMensalidade(
    {status:'isento',cortesiaDoMes:false,motivoIsencao:'cortesia manual'},'2026-08',false,[]) === null,
    'editar contrato sobrescreve uma cortesia manual legítima');
  exigir(api.ajusteCortesiaMensalidade({status:'pago'},'2026-08',true,[]) === null,
    'cortesia do contrato sobrescreve pagamento já confirmado');

  const consolidadas=api.mensalidadesOperacionaisCanonicas([
    {id:'master-chef_2026-07',cliente:'master-chef',competencia:'2026-07',status:'pago',valor:1700},
    {id:'master-chef-pizzaria_2026-07',cliente:'master-chef-pizzaria',competencia:'2026-07',status:'aberto',valor:1700},
    {id:'master-chef-pizzaria_2026-08',cliente:'master-chef-pizzaria',competencia:'2026-08',status:'aberto',valor:1700,excluido:true},
    {id:'master-chef_2026-08',cliente:'master-chef',competencia:'2026-08',status:'isento',valor:1700}
  ]);
  exigir(consolidadas.length===2 && consolidadas.every(v=>v.cliente==='master-chef') &&
    consolidadas.find(v=>v.competencia==='2026-07')?.status==='pago' &&
    consolidadas.find(v=>v.competencia==='2026-08')?.status==='isento',
    'aliases/soft-delete de Master Chef voltaram a criar cobrança ou competência duplicada');
  const contratosCanonicos=api.contratosOperacionaisCanonicos([
    {slug:'master-chef-pizzaria',status:'encerrado',clienteNome:'duplicado'},
    {slug:'master-chef',status:'ativo',clienteNome:'Master Chef'}
  ]);
  exigir(contratosCanonicos.length===1 && contratosCanonicos[0].slugCanonico==='master-chef' && contratosCanonicos[0].clienteNome==='Master Chef',
    'contrato duplicado/encerrado de Master Chef voltou à operação');

  const salvarContrato = trecho(escritorio, 'window.salvarContrato = async function', '  window.novoContrato');
  exigir(salvarContrato.includes('const lote = writeBatch(db);') &&
    salvarContrato.includes('ajusteCortesiaMensalidade') && salvarContrato.includes('await lote.commit()'),
    'contrato e mensalidades voltaram a ser salvos em estados divergentes');
  const acoes = trecho(escritorio, 'dias.forEach(dia => {', '    box.innerHTML = html;');
  exigir(acoes.includes("l.sit.k==='isento' && !l.cortesiaPermanente") &&
    acoes.includes('Retirar cortesia') && acoes.includes("!['pago','isento','cancelado'].includes(l.sit.k)"),
    'cliente isento voltou a exibir o botão Recebi como se estivesse em aberto');
  const risco = trecho(escritorio, 'async function renderRfv()', '  /* Salva enquanto ele digita');
  exigir(risco.includes('!mensalidadeResolvida(v) && v.cliente'),
    'RFV voltou a sinalizar cortesia como atraso financeiro');
  const cobranca = trecho(escritorio, 'window.renderCobranca = async function', '  function atualizarBadgeCobranca');
  exigir(cobranca.includes('if(mensalidadeResolvida(p)) return;'),
    'régua de cobrança voltou a incluir mensalidade resolvida');
  const painel = trecho(escritorio, 'window.renderFinanceiro = async function', '  window.renderMensalidades = async function');
  exigir((painel.match(/!\['isento','cancelado'\]\.includes\(statusMensalidadeCanonico\(p\)\)/g)||[]).length >= 5 &&
    painel.includes("doMes.filter(p => statusMensalidadeCanonico(p)==='isento')"),
    'totais, movimento ou concentração do financeiro voltaram a cobrar cortesia/cancelamento');

  const ficha = trecho(escritorio, 'const ETAPAS_ONBOARDING_LOCAL', '  window.registrarClienteDaReuniao');
  const fichaApi = executarSandbox('ficha-cortesia-cliente-sandbox.js',
    `function mesesCortesiaValidos(meses){return (meses||[]).every(m=>/^\\d{4}-(0[1-9]|1[0-2])$/.test(String(m)));}\n${ficha}\nglobalThis.api={validarEntradaClienteMensalista,modelarClienteMensalistaUnificado};`);
  const base={nome:'Cliente Teste',instagram:'@teste',telefone:'41999999999',plano:'Intermediário',planoDetalhes:'',valorMensal:1700,diaVencimento:10,primeiraCompetencia:'2026-08',tipoEntrega:'postagem_completa',incluiStories:false,contrato:'',cortesiaTipo:'meses',cortesiaMeses:['2026-08'],cortesiaPermanente:false,cortesiaInicial:true};
  exigir(fichaApi.validarEntradaClienteMensalista(base).length === 0,
    'ficha da Amanda recusou uma cortesia mensal válida');
  const mensal=fichaApi.modelarClienteMensalistaUnificado(base,'2026-08-07T12:00:00.000Z','token');
  exigir(mensal.contrato.cortesiaMeses[0] === '2026-08' && mensal.mensalidade.status === 'isento' && mensal.mensalidade.cortesiaDoMes === true,
    'cortesia escolhida na ficha não chegou ao contrato e à primeira mensalidade');
  const futura=fichaApi.modelarClienteMensalistaUnificado({...base,cortesiaMeses:['2026-09'],cortesiaInicial:false},'2026-08-07T12:00:00.000Z','token');
  exigir(futura.contrato.cortesiaMeses[0] === '2026-09' && futura.mensalidade.status === 'aberto',
    'cortesia futura isentou o mês errado');
  const permanente=fichaApi.modelarClienteMensalistaUnificado({...base,cortesiaTipo:'permanente',cortesiaMeses:[],cortesiaPermanente:true},'2026-08-07T12:00:00.000Z','token');
  exigir(permanente.contrato.cortesiaPermanente === true && permanente.mensalidade.status === 'isento',
    'cortesia permanente da ficha não chegou ao financeiro');
  exigir(fichaApi.validarEntradaClienteMensalista({...base,cortesiaMeses:['08/2026']}).some(e=>e.includes('formato 2026-08')),
    'ficha aceitou mês de cortesia ambíguo');
  const editarFicha = trecho(escritorio, 'window.salvarClienteAtivoCentral=async function', '  window.arquivarEntradaPendente');
  exigir(editarFicha.includes('ajusteCortesiaMensalidade') && editarFicha.includes('cortesiaPermanente:dados.cortesiaPermanente') &&
    editarFicha.includes('cortesiaMeses:dados.cortesiaMeses') &&
    editarFicha.includes("!['pago','cancelado'].includes(statusMensalidadeCanonico(p))") && editarFicha.includes('if(mudou) tx.set(ref,atualizacao'),
    'editar ficha ativa não sincroniza contrato e mensalidades');
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
    `const __cacheColecoes=new Map();const TTL_CACHE_MS=10000;let backend=0;const db={nome:'teste'};\n` +
    `function doc(banco,caminho){if(!caminho)throw new Error('ref vazia');return {path:caminho,firestore:banco};}\n` +
    `async function _getDocsFB(){backend++;return {forEach(fn){fn({id:'backend',ref:doc(db,'demandas/backend'),data:()=>({origem:'backend'})});}};}\n` +
    `${fonte}\n` +
    `globalThis.api={__cacheColecoes,__alimentarCacheTempoReal,__falhouCacheTempoReal,__snapshotFalso,getDocs,backend:()=>backend};`);
  const snapshot = {
    forEach(fn) {
      fn({ id:'a', ref:{path:'demandas/a'}, data:()=>({status:'pendente'}) });
      fn({ id:'b', ref:{path:'demandas/b'}, data:()=>({status:'aprovada'}) });
    }
  };
  api.__alimentarCacheTempoReal('demandas', snapshot);
  const guardado = api.__cacheColecoes.get('demandas');
  exigir(guardado?.tempoReal === true && guardado.itens.length === 2,
    'snapshot em tempo real não alimentou o cache compartilhado');
  const falso = api.__snapshotFalso(guardado.itens,'demandas');
  exigir(falso.size === 2 && falso.docs[0].id === 'a' && falso.docs[0].ref.path === 'demandas/a' && falso.docs[0].data().status === 'pendente',
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

async function testarCalendariosSandbox() {
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
    `function clienteInativoEfetivo(cfg,hoje='2026-08-07'){const data=String(cfg?.saidaProgramadaPara||'').slice(0,10);return cfg?.clienteInativo===true||!!data&&data<=hoje;}\n` +
    `${fonteCarteira}\nglobalThis.api={clienteDisponivelParaCampo};`);
  exigir(carteira.clienteDisponivelParaCampo({slug:'stokki',nome:'Stokki'}, {}) === true,
    'cliente mensalista sem restrição desapareceu da carteira de campo');
  exigir(carteira.clienteDisponivelParaCampo({slug:'get-started',nome:'Get Started'}, {}) === false,
    'cliente interno vazou para o calendário de campo');
  exigir(carteira.clienteDisponivelParaCampo({slug:'avulso',nome:'Avulso'}, {avulso:{tipoCliente:'avulso'}}) === false,
    'cliente avulso vazou para o calendário de campo');
  exigir(carteira.clienteDisponivelParaCampo({slug:'legado',nome:'Ex Cliente'}, {legado:{semConteudoRecorrente:false}}) === true,
    'configuração explícita não prevaleceu sobre exclusão legada');
  exigir(carteira.clienteDisponivelParaCampo({slug:'futuro',nome:'Futuro'}, {futuro:{saidaProgramadaPara:'2026-08-20'}}) === true &&
    carteira.clienteDisponivelParaCampo({slug:'vence-hoje',nome:'Vence hoje'}, {'vence-hoje':{saidaProgramadaPara:'2026-08-07'}}) === false,
    'saída futura desligou o cliente antes da data ou saída vencida continuou na carteira');

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
  const controleCecilia = trecho(escritorio, 'window.renderControleGravacoes = async function', 'window.filtrarControleGravacoes');
  exigir(controleCecilia.includes('if(ehCampoNoControle) agendamentos=agendamentos.filter(a=>pessoaNaEquipe(a,usuarioAtual))') &&
    controleCecilia.includes("getDoc(doc(db,'calendarios',slug))") &&
    controleCecilia.includes('obterCalendariosCompartilhados()'),
    'controle perdeu visão geral da Cecília ou voltou a expor todos os calendários ao filmmaker');
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

  const revisaoAmanda = trecho(escritorio, 'function idAnaliseCalendarioRevisao', 'window.recarregarFilaCalendarios');
  exigir(revisaoAmanda.includes('ROTEIRO / COPY') && revisaoAmanda.includes('LEGENDA') &&
    revisaoAmanda.includes('Abrir referência') && revisaoAmanda.includes('comentarAnaliseCalendario'),
    'fila da Amanda perdeu roteiro, legenda, referência ou comentário no mesmo cartão');
  exigir(revisaoAmanda.includes('runTransaction') && revisaoAmanda.includes("comments:[registro,...(cal.comments||[])]") &&
    !revisaoAmanda.includes('items:'),
    'comentário da Amanda não é uma gravação parcial/atômica isolada dos conteúdos');
  const revisaoInlineApi = executarSandbox('revisao-inline-amanda-sandbox.js',
    `let usuarioAtual='Amanda';let patchInline=null;let calendarioInline={client:'Cliente X',items:[{mes:'2026-08',name:'Vídeo principal',day:12,fmt:'Reel',desc:'Roteiro completo',legenda:'Legenda final',ref:'https://example.com/ref'}],comments:[],aprovacaoMeses:{'2026-08':{status:'aguardando_interna'}}};\n` +
    `const alvoInline={dataset:{},innerHTML:''};const campoInline={value:'Ajustar somente a chamada final'};const elementosInline={'analiseCal_cliente-x_2026-08':alvoInline,'comentarioCal_analiseCal_cliente-x_2026-08':campoInline};\n` +
    `const document={getElementById:id=>elementosInline[id]||null};const db={};const doc=(...p)=>p.join('/');const esc=v=>String(v??'');const escAttr=esc;const escJs=esc;\n` +
    `class URL{constructor(v){this.href=String(v);this.protocol=this.href.startsWith('https:')?'https:':this.href.startsWith('http:')?'http:':'x:';}}\n` +
    `const snapInline=()=>({exists:()=>true,data:()=>calendarioInline});const getDoc=async()=>snapInline();const itensDoMesCalendario=(cal,mes)=>(cal.items||[]).filter(i=>i.mes===mes);const estadoMesCal=(cal,mes)=>cal.aprovacaoMeses?.[mes]?.status||'';\n` +
    `const runTransaction=async(db,fn)=>fn({get:async()=>snapInline(),update:(ref,p)=>{patchInline=p;calendarioInline={...calendarioInline,comments:p.comments,updatedAt:p.updatedAt};}});function mostrarToast(){}\n` +
    `${revisaoAmanda}\n` +
    `globalThis.api={abrir:window.abrirAnaliseCalendarioRevisao,comentar:window.comentarAnaliseCalendario,alvo:alvoInline,campo:campoInline,patch:()=>patchInline,cal:()=>calendarioInline,setUsuario:v=>{usuarioAtual=v;}};`);
  exigir(await revisaoInlineApi.abrir('cliente-x','2026-08') === true &&
    revisaoInlineApi.alvo.innerHTML.includes('Roteiro completo') &&
    revisaoInlineApi.alvo.innerHTML.includes('Legenda final') &&
    revisaoInlineApi.alvo.innerHTML.includes('https://example.com/ref'),
    'análise inline não abriu roteiro, legenda e referência do mês correto');
  exigir(await revisaoInlineApi.comentar('cliente-x','2026-08',{disabled:false,textContent:'',isConnected:true}) === true &&
    Object.keys(revisaoInlineApi.patch()||{}).sort().join(',') === 'comments,updatedAt' &&
    revisaoInlineApi.cal().items[0].desc === 'Roteiro completo' &&
    revisaoInlineApi.cal().aprovacaoMeses['2026-08'].status === 'aguardando_interna',
    'comentário inline alterou pauta/estado ou não persistiu apenas comentários');
  revisaoInlineApi.setUsuario('Chris');
  revisaoInlineApi.campo.value='Comentário indevido';
  exigir(await revisaoInlineApi.comentar('cliente-x','2026-08',null) === false,
    'papel fora da Amanda conseguiu comentar na revisão interna');
  const feedbackCalendario = trecho(calendario, 'async function salvarComentarioEquipeDuranteRevisao', '/* ===== O AVISO QUE NÃO EXISTIA');
  exigir(feedbackCalendario.includes('runTransaction') && feedbackCalendario.includes("comments:[registro,...(atual.comments||[])]") &&
    !feedbackCalendario.includes('exigirRetiradaAntesDeEditar()'),
    'calendário completo voltou a bloquear comentário durante a revisão da Amanda');
  const feedbackApi = executarSandbox('comentario-revisao-calendario-sandbox.js',
    `let data={month:'Agosto 2026',comments:[],items:[{name:'Roteiro preservado'}]};let mesVisivel='2026-08';let patch=null;let saves=0;\n` +
    `window.__modoCal='equipe';window.__fb={db:{},docRef:{},runTransaction:async(db,fn)=>fn({get:async()=>({exists:()=>true,data:()=>({comments:[]})}),update:(ref,p)=>{patch=p;}})};\n` +
    `const campo={value:'Ajustar a chamada final'};const document={getElementById:id=>campo};\n` +
    `function estadoAprovacao(){return 'aguardando_interna';}function mesDoTexto(){return '2026-08';}\n` +
    `function renderFeedback(){}function avisarTela(){}function save(){saves++;}function salvarComoCliente(){}function avisarEquipeDoRecado(){}\n` +
    `${feedbackCalendario}\nglobalThis.api={enviar:submitFeedback,patch:()=>patch,saves:()=>saves,data};`);
  await feedbackApi.enviar();
  exigir(Object.keys(feedbackApi.patch()||{}).sort().join(',') === 'comments,updatedAt' &&
    feedbackApi.saves() === 0 && feedbackApi.data.items[0].name === 'Roteiro preservado',
    'comentário durante revisão chamou save completo ou alterou conteúdo');
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
    `${fonte}\nglobalThis.api={planejarSessaoGravacao,chaveSessaoGravacao,sessaoLegadaSemVinculo,chaveItemSessao,nomeItemSessaoCanonico};`);

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
  const cookieryLegado = { blocosPorMes:{'2026-08':1}, aprovacaoMeses:{'2026-08':{status:'liberado'}}, items:[
    {mes:'2026-08',day:5,name:'Carrossel 3 '},
    {mes:'2026-08',day:6,name:'"Saindo do Forno" (O Horário do Cookie Quentinho)'}
  ]};
  const planoCookiery = api.planejarSessaoGravacao(cookieryLegado,{cliente:'cookiery',data:'2026-08-05',bloco:1});
  exigir(planoCookiery.permitidos.length === 2 &&
    api.chaveItemSessao(planoCookiery.permitidos[0]) === api.chaveItemSessao({calendarItemIdx:0,nome:'Carrossel 3'}) &&
    api.nomeItemSessaoCanonico('  "Saindo do Forno"   (O Horário do Cookie Quentinho) ') === '"Saindo do Forno" (O Horário do Cookie Quentinho)',
    'Cookiery: espaço residual ou aspas continuam bloqueando o envio do mesmo item legado');
  const divinaLegada = { month:'Julho 2026', items:[
    {mes:'2026-07',day:7,name:'vídeo 1',posted:true},
    {mes:'2026-07',day:20,name:'vídeo 2',agendado:true}
  ]};
  const agDivina = {cliente:'divina-cantina',data:'2026-08-05',filmmaker:'Luís',status:'agendado',qtdVideosPlanejados:9};
  const planoDivina = api.planejarSessaoGravacao(divinaLegada,agDivina);
  exigir(planoDivina.mes === '2026-07' && planoDivina.mesResolvidoPor === 'unico_mes_disponivel',
    'agendamento antigo com um único mês disponível continuou preso ao mês da data');
  exigir(api.sessaoLegadaSemVinculo(agDivina) === true &&
    api.sessaoLegadaSemVinculo({...agDivina,sessaoPlanejamentoVersao:1,sessaoChave:'x'}) === false,
    'compatibilidade de registro vazou para sessões modernas');
  const sessaoLegadaFonte = trecho(escritorio, 'function sessaoLegadaSemVinculo', 'window.sessaoLegadaSemVinculo');
  const materiaisFonte = trecho(escritorio, 'function prepararMateriaisDeclaradosSessao', 'window.prepararMateriaisDeclaradosSessao');
  const materiais = executarSandbox('materiais-pos-filmagem-sandbox.js',
    `const CAMPO_MAIS_CHRIS=['Chris','Luís','Nathan'];\n`+
    `function nomeOperacionalCanonico(n){return String(n||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace('luiz','luis').replace('natan','nathan');}\n`+
    `function equipeDoAgendamento(a){return Array.isArray(a?.equipe)&&a.equipe.length?a.equipe:(a?.filmmaker?[{nome:a.filmmaker,papel:'Filmmaker'}]:[]);}\n`+
    `function filmmakersDaSessao(a){return equipeDoAgendamento(a).map(p=>p.nome);}\n`+
    `${sessaoLegadaFonte}\n${materiaisFonte}\nglobalThis.api={prepararMateriaisDeclaradosSessao};`);
  const declarado = materiais.prepararMateriaisDeclaradosSessao([], 'Prato executivo\nBastidores da cozinha', agDivina, 'Luís');
  exigir(declarado.ok && declarado.videos.length === 2 && declarado.videos.every(v=>v.vinculoSessao==='declarado_legado' && v.calendarItemIdx===null),
    'sessão Divina anterior à V32 não prepara material isolado do calendário');
  exigir(materiais.prepararMateriaisDeclaradosSessao([], 'Extra sem autorização', {...agDivina,sessaoPlanejamentoVersao:1,sessaoChave:'nova'}, 'Luís').ok === false,
    'sessão moderna ganhou texto livre sem autorização');
  exigir(materiais.prepararMateriaisDeclaradosSessao([], 'Vídeo Único\nvideo unico', agDivina, 'Luís').ok === false,
    'nomes duplicados com acento/capitalização passariam a criar vídeos repetidos');
  const equipeDupla={...agDivina,equipe:[{nome:'Luís',papel:'Filmmaker'},{nome:'Nathan',papel:'2º Filmmaker'}]};
  exigir(materiais.prepararMateriaisDeclaradosSessao([{nome:'A',responsavel:'Luís'},{nome:'B',responsavel:'Nathan'}], '', equipeDupla, '').ok === true &&
    materiais.prepararMateriaisDeclaradosSessao([{nome:'A',responsavel:'Outra pessoa'}], '', equipeDupla, '').ok === false,
    'atribuição por conteúdo não respeitou a equipe real da sessão');
  const ambiguo = api.planejarSessaoGravacao({items:[{mes:'2026-07',name:'J'},{mes:'2026-08',name:'A'}]},
    {cliente:'legado',data:'2026-09-01',bloco:1});
  exigir(ambiguo.permitidos.length === 0 && ambiguo.inconsistencias.length === 1,
    'sessão legada ambígua liberou conteúdo de um mês por suposição');

  const agenda = trecho(escritorio, 'async function renderMinhaAgendaFilmmaker', 'window.renderMinhaAgendaFilmmaker = renderMinhaAgendaFilmmaker');
  exigir(agenda.includes('FAZER HOJE') && agenda.includes('NÃO GRAVAR HOJE') &&
    agenda.includes('confirmacaoBloqueada') && agenda.includes('planoSessao.permitidos'),
    'Minha sessão perdeu grupos visuais ou desbloqueou pauta não planejada');
  exigir(agenda.includes('data-nome="${escAttr(it.name)}"') && agenda.includes('aria-label="Quem gravou ${escAttr(it.name'),
    'título com aspas voltou a quebrar o checkbox da sessão do filmmaker');
  exigir(agenda.includes('Registro compatível da sessão antiga') &&
    agenda.includes('não marcará pauta de outra semana') && agenda.includes('sessaoLegadaSemVinculo(a)'),
    'sessão anterior à V32 não recuperou a declaração segura do material gravado');
  exigir(agenda.includes('Responsável que realmente realizou esta sessão') &&
    agenda.includes("const podePlanejarSessao = ['Chris','Amanda','Cecília'].includes(usuarioAtual)") &&
    agenda.includes("PESSOAS_DE_CAMPO.map(p=>"),
    'coordenação perdeu a correção de responsável nas sessões antigas/atrasadas');
  const confirmar = trecho(escritorio, 'async function registrarGravacaoRealizadaNucleo', 'function popularClientesReferencia');
  exigir(confirmar.includes("dadosAtuais.status !== 'agendado'") && confirmar.includes('dadosAtuais.aprovado === false') &&
    confirmar.includes('pessoaNaEquipe(dadosAtuais,usuarioAtual)') && confirmar.includes('permitidosAgora.has(chave)') &&
    confirmar.includes('new Set(planoAntes.permitidos.map(chaveItemSessao))') &&
    confirmar.includes('nomeItemSessaoCanonico(itemAtual.name) === nomeItemSessaoCanonico(videoSelecionado.nome)') &&
    confirmar.includes('Captações extras não estão autorizadas nesta sessão.'),
    'transação de confirmação não revalida status, equipe, aprovação, sessão e extras');
  const prepararMateriais = trecho(escritorio, 'function prepararMateriaisDeclaradosSessao', 'window.prepararMateriaisDeclaradosSessao');
  exigir(prepararMateriais.includes("vinculoSessao:registroLegado ? 'declarado_legado'") &&
    prepararMateriais.includes('Há um vídeo sem nome ou repetido nesta sessão.') &&
    confirmar.includes('agendamentoId:agId') && confirmar.includes("status: 'aguardando_edicao'"),
    'pós-filmagem legado perdeu vínculo, proteção contra duplicata ou entrada na fila de edição');
  exigir(confirmar.includes('producaoPorFilmmaker') && confirmar.includes('conteudosRealizados') &&
    confirmar.includes('dataProducao = agDadosAntes.data || hojeRegistro') && confirmar.includes('filmmaker:v.responsavel'),
    'baixa da gravação não preserva dia real, títulos e filmmaker de cada conteúdo');
  const saldoCaptacao = confirmar.slice(confirmar.indexOf('if(qtdRealizada < qtdPlanejada)'), confirmar.indexOf('    } else {', confirmar.indexOf('if(qtdRealizada < qtdPlanejada)')));
  exigir(saldoCaptacao.includes("tipoPendencia: 'saldo_captacao'") &&
    saldoCaptacao.includes('NÃO dependem de aprovação da Cecília') &&
    saldoCaptacao.includes('vincule nela os conteúdos exatos') &&
    !saldoCaptacao.includes('qtdVideosPlanejados: increment('),
    'Cecília voltou a ser aprovação dos vídeos ou o saldo alterou uma sessão sem itens exatos');

  const fonteProducao = trecho(escritorio, 'function producaoDetalhadaDoAgendamento', 'window.calcularProducaoHojePorFilmmaker');
  const producao = executarSandbox('producao-cecilia-sandbox.js',
    `function equipeDoAgendamento(a){return a.equipe||[];}\n${fonteProducao}\nglobalThis.api={producaoDetalhadaDoAgendamento,calcularProducaoHojePorFilmmaker};`);
  const sessaoDetalhada={producaoPorFilmmaker:[{filmmaker:'Luís',quantidade:2,conteudos:['A','B']},{filmmaker:'Nathan',quantidade:1,conteudos:['C']}]};
  exigir(producao.producaoDetalhadaDoAgendamento(sessaoDetalhada).length===2 &&
    JSON.stringify(producao.calcularProducaoHojePorFilmmaker([{realizadasHoje:[sessaoDetalhada]}]))===JSON.stringify({Luís:2,Nathan:1}),
    'controle da Cecília não separou quantidade e títulos por filmmaker');
  exigir(producao.producaoDetalhadaDoAgendamento({qtdVideosRealizados:3,filmmaker:'Luís'})[0].legado===true,
    'registro antigo foi inventado como se tivesse detalhamento moderno');
  const wrapperConfirmacao = trecho(escritorio, 'const __confirmacoesGravacaoEmCurso', 'function popularClientesReferencia');
  exigir(wrapperConfirmacao.includes('__confirmacoesGravacaoEmCurso.has(agId)') &&
    wrapperConfirmacao.indexOf('__confirmacoesGravacaoEmCurso.add(agId)') < wrapperConfirmacao.indexOf('await registrarGravacaoRealizadaNucleo(agId)'),
    'confirmação perdeu a trava anterior ao primeiro await');

  exigir(calendario.includes('const it={...anterior,itemId:anterior.itemId||') &&
    calendario.includes("data.items[editIdx]={...data.items[editIdx],excluido:true") &&
    calendario.includes("const mbl=document.getElementById('mBloco'); if(mbl) mbl.value='';") &&
    calendario.includes('renderAprovacaoInterna();renderBlocos();'),
    'editor de calendário voltou a apagar campos, excluir fisicamente, herdar bloco ou não atualizar a divisão');
  const visibilidadeAmanda = trecho(escritorio, "'Amanda': [", "    'Cecília': [");
  exigir(['navCentral','navAprovacoes','navChecklist','navAgendamento'].every(id=>visibilidadeAmanda.includes("'"+id+"'")) &&
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
  exigir(trocar.includes('filmmaker: filmmaker ||') && trocar.includes('equipe,') &&
    trocar.includes('nomeOperacionalCanonico(p.nome)') && trocar.includes('renderMinhaAgendaFilmmaker()'),
    'troca de filmmaker perdeu campos compatíveis, normalização ou atualização da agenda');

  const equipeFonte = trecho(escritorio, 'function equipeDoAgendamento', 'function rotuloEquipe');
  const equipe = executarSandbox('equipe-alias-sandbox.js',
    `${equipeFonte}\nglobalThis.api={pessoaNaEquipe};`);
  exigir(equipe.pessoaNaEquipe({filmmaker:'Natan'},'Nathan') && equipe.pessoaNaEquipe({filmmaker:'Luiz'},'Luís'),
    'grafia legada de Natan/Luiz continua escondendo gravações da equipe correta');

  const distribuicao = trecho(escritorio, 'async function avisarEditorDoVideo', 'let editorFuncionarioAtual');
  exigir(distribuicao.includes("updateDoc(doc(db,'videos_producao', videoId)") &&
    distribuicao.includes('editorAtribuido: novoEditor') && distribuicao.includes('await avisarEditorDoVideo') &&
    distribuicao.includes("tipoEspecial: 'video_atribuido'"),
    'atribuição da Amanda não entrega o vídeo à fila/aviso do editor');
  exigir(escritorio.includes("v.editorAtribuido === usuarioAtual && ['aguardando_edicao','correcao'].includes(v.status)"),
    'editor não encontra o vídeo atribuído na própria fila');
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

  const auditoria = trecho(escritorio, 'function __impedirGravacaoDuranteAuditoria', 'const auth = getAuth(app)');
  exigir(['addDoc','setDoc','updateDoc','deleteDoc','runTransaction','writeBatch'].every(nome=>
    new RegExp(`(?:function|async function) ${nome}\\([^)]*\\)\\{\\s*__impedirGravacaoDuranteAuditoria\\(\\)`).test(auditoria)),
    'modo de auditoria não bloqueia todos os caminhos Firestore de gravação');
  const perfis = trecho(escritorio, 'window.abrirAuditoriaPerfisChris', 'window.sairAuditoriaPerfilChris');
  exigir(perfis.includes("window.__pessoaAutenticadaReal !== 'Chris'") &&
    escritorio.includes("{ id:'navAuditoriaPerfisChris', rot:'Auditar perfil da equipe'") &&
    !escritorio.includes("'Amanda': [{ id:'navAuditoriaPerfisChris'"),
    'auditoria por perfil deixou de ser exclusiva da identidade Google real do Chris');
  exigir(calendario.includes("const modoAuditoria = params.get('auditoria') === '1'") &&
    calendario.includes("startsWith('sessoes_cliente/')") &&
    calendario.includes("impedirEscritaAuditoria(doc(db,'calendarios','auditoria'))") &&
    escritorio.includes("window.__auditoriaPapelAtiva?'&auditoria=1':''"),
    'auditoria permitiu gravação pelo iframe do calendário ou bloqueou a sessão necessária à leitura');

  const saida = trecho(escritorio, 'window.salvarSaidaClienteCentral', 'window.cancelarProgramacaoSaidaCentral');
  exigir(saida.includes('saidaProgramadaPara:dataSaida') && saida.includes('clienteInativo:imediata') &&
    saida.includes('ativoAte:limiteAcesso') && saida.includes('statusSaida:imediata') && saida.includes('fichaSnapshot'),
    'saída futura ainda encerra imediatamente ou não limita o Portal na data');
  const efetivar = trecho(escritorio, 'async function efetivarSaidasProgramadas', 'window.efetivarSaidasProgramadas');
  exigir(efetivar.includes("statusSaida==='programada'&&saidaClienteJaEfetiva(v)") &&
    efetivar.includes("statusSaida:'encerrada'") && !efetivar.includes('deleteDoc('),
    'motor de saída programada perdeu idempotência ou soft-delete');
  exigir(escritorio.includes("{ nome: 'saidasProgramadasClientes', fn: efetivarSaidasProgramadas }") &&
    escritorio.includes('function clienteInativoEfetivo(config, hoje)'),
    'saída agendada não está conectada ao motor e aos filtros operacionais');
  const centralClientes = trecho(escritorio, 'window.renderCentralEntradaClientes = async function', 'async function carregarMensalistaRecebidoNosCampos');
  exigir(centralClientes.includes('const fontesLegadas=new Map()') && centralClientes.includes('CLIENTES_BASE.forEach') &&
    centralClientes.includes("cfg.tipoCliente==='avulso'?false") && centralClientes.includes('const slugsArquivadosDeOrigem=new Set') &&
    centralClientes.includes('slugsArquivadosDeOrigem.has(slug)') && centralClientes.includes('const slugsAtivosNaCentral=new Set') &&
    centralClientes.includes('arquivadosDeOrigem.filter(v=>!slugsAtivosNaCentral.has(slugDo(v)))') &&
    centralClientes.includes('const saidasProgramadas=') && centralClientes.includes('id="centralSaidasClientes"') &&
    centralClientes.includes('Portal:</b> dados preservados'),
    'Central da Amanda voltou a esconder clientes legados, saída rápida ou arquivo preservado');
  exigir(centralClientes.includes('const slugDo=v=>slugClienteCanonico(') &&
    centralClientes.includes('Criar/recuperar Portal'),
    'Central voltou a expor alias como cliente separado ou não oferece recuperação do Portal');
  const acessoCentral = trecho(escritorio, 'function linkPortalClienteCentral', 'window.salvarClienteAtivoCentral');
  exigir(acessoCentral.includes('window.garantirPortalClienteCentral=async function') &&
    acessoCentral.includes("doc(db,'clientes_acesso',canonico)") &&
    acessoCentral.includes("doc(db,'clientes_portal_tokens',token)") &&
    acessoCentral.includes('ativo:true'),
    'recuperação do Portal não confirma as duas fontes de autorização no slug canônico');
  const fusao = trecho(escritorio, 'window.fundirClientes = async function', 'window.arquivarClienteDuplicado');
  exigir(fusao.indexOf("doc(db,'clientes_acesso', PARA)") >= 0 &&
    fusao.indexOf('portal preservado em ') < fusao.indexOf("updateDoc(doc(db,'clientes_acesso', DE)"),
    'fusão revoga o Portal duplicado antes de preservar o acesso correto');
  exigir(escritorio.includes("{ rot:'Registrar saída de cliente', acao:\"irParaSaidaClientes()\" }") &&
    escritorio.includes('window.abrirSaidaRapidaCentral=function()'),
    'Amanda perdeu o atalho direto para registrar saída');
  const cacheFirestore = trecho(escritorio, 'function __snapshotFalso(itens, colecao)', 'const auth = getAuth(app)');
  exigir(cacheFirestore.includes('ref: doc(db,caminho)') &&
    (cacheFirestore.match(/__snapshotFalso\([^)]*,nome\)/g)||[]).length >= 3 &&
    cacheFirestore.includes('function __validarReferenciasFirestore(refs, contexto)'),
    'cache voltou a entregar referência undefined às transações da Amanda');
  const cargaClientes = trecho(escritorio, 'async function carregarClientesExtras', 'carregarClientesExtras();');
  exigir(cargaClientes.includes("getDocs(collection(db,'clientes_config'))") &&
    cargaClientes.includes('filter(c=>!clienteInativoEfetivo(configuracoes[c.slug]))'),
    'cliente encerrado pode reaparecer nos seletores gerais após recarregar');
  const regras = fs.readFileSync(path.join(raiz, 'firestore.rules'), 'utf8');
  exigir(regras.includes('function acessoDentroDaVigencia(dados)') &&
    (regras.match(/acessoDentroDaVigencia\(/g)||[]).length >= 4,
    'Portal/calendário interno não expiram pela regra na data de saída');
}

async function testarCentralClientesAmandaSandbox() {
  const snapshotFonte = trecho(escritorio, 'function __snapshotFalso(itens, colecao)', '  /* 06/08/2026 — o listener');
  const validarRefsFonte = trecho(escritorio, 'function __validarReferenciasFirestore(refs, contexto)', '  /* Toda gravação invalida');
  const api = executarSandbox('central-clientes-amanda-sandbox.js',
    `const db={nome:'sandbox'};function doc(banco,caminho){return {firestore:banco,path:caminho};}\n`+
    `${snapshotFonte}\n${validarRefsFonte}\n`+
    `globalThis.api={snapshot:__snapshotFalso,validar:__validarReferenciasFirestore};`);
  const snap=api.snapshot([{__id:'cliente-teste',__dados:{nome:'Teste'}}],'clientes_config');
  exigir(snap.docs.length===1 && snap.docs[0].ref.path==='clientes_config/cliente-teste' && snap.docs[0].ref.firestore.nome==='sandbox',
    'snapshot em cache ainda perde a referência usada pela Amanda ao salvar');
  exigir(api.validar([null,snap.docs[0].ref],'teste').length===1,
    'referência opcional nula não foi tratada sem contaminar a transação');
  let bloqueouUndefined=false;
  try{ api.validar([undefined,snap.docs[0].ref],'teste'); }catch(e){ bloqueouUndefined=String(e.message).includes('nenhum dado foi alterado'); }
  exigir(bloqueouUndefined,'transação da Amanda ainda aceita referência undefined');
  let bloqueouSnapshotSemCaminho=false;
  try{ api.snapshot([{__id:'cliente-teste',__dados:{}}]); }catch(e){ bloqueouSnapshotSemCaminho=String(e.message).includes('nenhuma alteração foi feita'); }
  exigir(bloqueouSnapshotSemCaminho,'cache sem coleção voltou a produzir DocumentReference indefinida');

  const recuperarPortalFonte = trecho(escritorio, 'window.garantirPortalClienteCentral=async function', '  window.abrirPortalClienteCentral');
  const portalApi = executarSandbox('portal-master-chef-sandbox.js',
    `let usuarioAtual='Amanda';const gravacoes=[];const avisos=[];const db={};\n`+
    `function slugClienteCanonico(s){return {'master-chefe':'master-chef','master-chef-pizzaria':'master-chef'}[s]||s;}\n`+
    `function doc(b,c,id){return {path:c+'/'+id};}function serverTimestamp(){return 'SERVIDOR';}\n`+
    `async function getDoc(){return {exists:()=>false,data:()=>({})};}\n`+
    `async function setDoc(ref,dados,opts){gravacoes.push({ref,dados,opts});}\n`+
    `function mostrarToast(m,t){avisos.push({m,t});}\n`+
    `window.__entradaClientesAtivos={'master-chef':{slug:'master-chef',nome:'Master Chef',tipo:'mensalista',token:''}};\n`+
    `window.renderCentralEntradaClientes=async()=>true;\n${recuperarPortalFonte}\n`+
    `globalThis.api={recuperar:window.garantirPortalClienteCentral,gravacoes,avisos,ativos:window.__entradaClientesAtivos};`);
  await portalApi.recuperar('master-chefe');
  exigir(portalApi.gravacoes.length===2 &&
    portalApi.gravacoes[0].ref.path==='clientes_acesso/master-chef' &&
    portalApi.gravacoes[1].ref.path.startsWith('clientes_portal_tokens/') &&
    portalApi.gravacoes[1].dados.cliente==='master-chef' &&
    portalApi.ativos['master-chef'].token,
    'recuperação do Portal de Master Chef não escreveu acesso e token na identidade canônica');
}

try {
  await testarLoginSandbox();
  testarFinanceiroSandbox();
  testarMensalidadesSandbox();
  testarBadgesExtrasSandbox();
  await testarOrcamentoLeiturasFirestoreSandbox();
  testarDatasOperacionaisSandbox();
  testarAcompanhamentoSandbox();
  testarDemandasSandbox();
  await testarCalendariosSandbox();
  testarSessoesGravacaoSandbox();
  testarPermissoesAcoesSandbox();
  await testarCentralClientesAmandaSandbox();
  console.log(`REGRESSÃO CRÍTICA: APROVADA (${total} asserções)`);
} catch (erro) {
  console.error(`REGRESSÃO CRÍTICA: FALHOU — ${erro.stack || erro.message}`);
  process.exitCode = 1;
}
