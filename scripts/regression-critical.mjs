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

function testarCoberturaPostagensSandbox() {
  const fonte = trecho(escritorio,
    'function diasCivisEntreISO',
    '  /* ===== REDE DE SEGURANÇA COMPLETA DO CICLO DE POSTAGEM');
  const api = executarSandbox('cobertura-postagens-v64.js',
    `const APELIDOS={zeens:'zeiss'};\n`+
    `function slugClienteCanonico(v){return APELIDOS[v]||String(v||'');}\n`+
    `function nomeClienteCanonico(slug,nome){return nome||slug;}\n`+
    `function normNomeCliente(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim();}\n`+
    `${fonte}\n`+
    `globalThis.api={calcularCoberturaPostagens,alertaCoberturaAindaValido,idAlertaCoberturaPostagem};`);
  const clientes=[
    {slug:'vitalle-odonto',nome:'Vitalle Odonto'},
    {slug:'divina-cantina',nome:'Divina Cantina'},
    {slug:'bluefit',nome:'Bluefit'},
    {slug:'zeiss',nome:'Zeiss'}
  ];
  const posts=[
    {cliente:'vitalle-odonto',clienteNome:'Vitalle Odonto',status:'agendado',dataAgendada:'2026-08-13',formato:'foto'},
    {cliente:'vitalle-odonto',clienteNome:'Vitalle Odonto',status:'postado',dataAgendada:'2026-08-12',formato:'video'},
    {cliente:'divina-cantina',status:'postado',dataAgendada:'2026-08-10',formato:'arte'},
    {cliente:'bluefit',status:'agendado',dataAgendada:'2026-08-16',formato:'carrossel'},
    {cliente:'zeiss',status:'agendado',dataAgendada:'2026-08-13',formato:'foto'},
    {cliente:'zeens',status:'agendado',dataAgendada:'2026-08-13',formato:'video'},
    {cliente:'cliente-encerrado',status:'agendado',dataAgendada:'2026-08-13'},
    {cliente:'divina-cantina',status:'agendado',dataAgendada:'2026-08-20',excluido:true},
    {cliente:'divina-cantina',status:'aguardando_agendamento',dataAgendada:'2026-08-20'}
  ];
  const cobertura=api.calcularCoberturaPostagens(posts,clientes,'2026-08-13');
  const porSlug=Object.fromEntries(cobertura.map(e=>[e.slug,e]));
  exigir(cobertura.length===4 && !porSlug['cliente-encerrado'],
    'alerta de cobertura voltou a incluir cliente fora da carteira recorrente');
  exigir(porSlug['vitalle-odonto'].evento==='ultima_postagem' && porSlug['vitalle-odonto'].qtdNaUltimaData===1,
    'última postagem do dia não gerou o evento único independentemente do formato');
  const retroativo=api.calcularCoberturaPostagens([
    {cliente:'vitalle-odonto',status:'postado',dataAgendada:'2026-08-12',formato:'foto'}
  ],[clientes[0]],'2026-08-13')[0];
  exigir(retroativo.evento==='ultima_postagem' && retroativo.diasSemPostagem===1,
    'motor desligado no último dia perdeu o alerta antes de completar três dias');
  exigir(porSlug['divina-cantina'].evento==='tres_dias_sem_postagem' && porSlug['divina-cantina'].diasSemPostagem===3,
    'terceiro dia sem postagem não gerou o alerta correto');
  exigir(porSlug.bluefit.evento==='' && porSlug.bluefit.temCoberturaFutura===true,
    'cliente com postagem futura recebeu falso alerta');
  exigir(porSlug.zeiss.evento==='ultima_postagem' && porSlug.zeiss.qtdNaUltimaData===2,
    'aliases ou formatos diferentes criaram duas coberturas para o mesmo cliente');
  exigir(api.alertaCoberturaAindaValido({etapaCobertura:'ultima_postagem',ultimaPostagemProgramada:'2026-08-13'},
      {...porSlug['vitalle-odonto'],diasSemPostagem:2})===true &&
    api.alertaCoberturaAindaValido({etapaCobertura:'ultima_postagem',ultimaPostagemProgramada:'2026-08-10'},porSlug['divina-cantina'])===false &&
    api.alertaCoberturaAindaValido({etapaCobertura:'tres_dias_sem_postagem',ultimaPostagemProgramada:'2026-08-10'},porSlug['divina-cantina'])===true,
    'transição da última postagem para três dias deixou alertas simultâneos ou encerrou cedo');
  exigir(api.idAlertaCoberturaPostagem(porSlug.zeiss)===api.idAlertaCoberturaPostagem({...porSlug.zeiss,nome:'Outro nome'}),
    'identidade do alerta depende do nome visual e pode duplicar');

  const verificador=trecho(escritorio,'async function verificarCoberturaPostagensAmanda','window.verificarCoberturaPostagensAmanda');
  exigir(verificador.includes("destinatario:'Amanda'") && verificador.includes('runTransaction') &&
    verificador.includes("status:'cancelado_automaticamente',excluido:true") &&
    !verificador.includes("'capsulas_clientes'") && !verificador.includes('acionarCapsulaAmanda'),
    'alerta não é atômico/soft-delete, vazou para terceiro ou voltou a acionar cápsula automaticamente');
  exigir(escritorio.includes("{ nome: 'coberturaPostagensAmanda', fn: verificarCoberturaPostagensAmanda }") &&
    escritorio.includes("'Amanda': ['navCentral','navAprovacoes','navAgendamento','navVideos','navStories','navPostagens','navControlePostagem'") &&
    escritorio.includes("if(nome === 'controlePostagem' && !papelPodeControlePostagem(usuarioAtual))"),
    'motor ou acesso real da Amanda ao controle de postagem não foi ligado com guarda por papel');
  const papelFonte=trecho(escritorio,'function papelPodeControlePostagem','window.papelPodeControlePostagem');
  const papelApi=executarSandbox('papel-controle-postagens-v64.js',`${papelFonte}\nglobalThis.api={papelPodeControlePostagem};`);
  exigir(['Chris','Amanda','Cecília'].every(p=>papelApi.papelPodeControlePostagem(p)) &&
    ['Gabrielle','Helo','João Victor','Nathan','Luís','Yas',''].every(p=>!papelApi.papelPodeControlePostagem(p)),
    'guarda do controle de postagem liberou outro papel ou bloqueou Amanda/Cecília/Chris');
  const controle=trecho(escritorio,'window.renderControlePostagem = async function','window.salvarControlePostagem');
  exigir(controle.includes('clientes = await clientesControlePostagemPorPapel()') &&
    controle.includes('calcularCoberturaPostagens') && controle.includes('irParaCapsulaAmanda()'),
    'painel voltou à lista bruta, ao cálculo só de vídeo ou perdeu o caminho manual da Amanda');
  const carteiraControle=trecho(escritorio,'async function clientesControlePostagemPorPapel','window.clientesControlePostagemPorPapel');
  exigir(carteiraControle.includes("if(['Chris','Amanda'].includes(usuarioAtual)) return clientesDeConteudoRecorrente()") &&
    carteiraControle.includes("getDocs(collection(db,'clientes_config'))") &&
    !carteiraControle.includes("'contratos_cliente'") && !carteiraControle.includes("'pagamentos_mensais'") &&
    !carteiraControle.includes("'clientes_encerrados'"),
    'controle operacional da Cecília voltou a consultar contratos, mensalidades ou arquivo gerencial');
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
    `${identidadeClientes}\n${fonte}\nglobalThis.api={statusMensalidadeCanonico,mensalidadeResolvida,mensalidadesOperacionaisCanonicas,contratosOperacionaisCanonicos,destinoRecebimentoEntradaValido,recebimentosEntradaOperacionais,resumoRecebimentosEntradaNoMes,competenciaFinanceiraValida,pagamentoPertenceAoCliente,analisarPagamentosParaSaida,contratoVigenteNaCompetencia,mensalidadeVisivelNaGradeOperacional,competenciaSeguinte,valorContratoNaCompetencia,ajusteValorProgramadoMensalidade,ajusteCortesiaMensalidade,situacaoMensalidade};`);
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

  const resumoEntradas=api.resumoRecebimentosEntradaNoMes([
    {id:'pessoal',status:'pago',destino:'conta_pessoal_chris',pagoEm:'2026-08-03',valorConfirmado:1700},
    {id:'agencia',status:'pago',destino:'conta_agencia',pagoEm:'2026-08-04',valorConfirmado:1200},
    {id:'outro-mes',status:'pago',destino:'conta_agencia',pagoEm:'2026-07-31',valorConfirmado:900},
    {id:'pendente',status:'pendente',destino:'conta_pessoal_chris',pagoEm:'',valorPrevisto:2500},
    {id:'apagado',status:'pago',destino:'conta_agencia',pagoEm:'2026-08-04',valorConfirmado:9999,excluido:true}
  ],'2026-08');
  exigir(resumoEntradas.totalPessoal===1700&&resumoEntradas.totalAgencia===1200&&resumoEntradas.pagos.length===2,
    'primeiro pagamento pessoal/agência voltou a se misturar, contar pendência ou ignorar soft-delete');
  exigir(api.destinoRecebimentoEntradaValido('conta_pessoal_chris')&&api.destinoRecebimentoEntradaValido('conta_agencia')&&!api.destinoRecebimentoEntradaValido('qualquer'),
    'controle de entrada aceitou uma conta não prevista');

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
  exigir(api.contratoVigenteNaCompetencia({primeiraCompetencia:'2026-08',ultimaCompetenciaPagamento:'2026-09'},'2026-07')===false &&
    api.contratoVigenteNaCompetencia({primeiraCompetencia:'2026-08',ultimaCompetenciaPagamento:'2026-09'},'2026-08')===true &&
    api.contratoVigenteNaCompetencia({primeiraCompetencia:'2026-08',ultimaCompetenciaPagamento:'2026-09'},'2026-10')===false &&
    api.contratoVigenteNaCompetencia({},'2026-01')===true,
    'primeira/última competência não limita a cobrança ou apagou compatibilidade de contrato legado');
  exigir(api.mensalidadeVisivelNaGradeOperacional({status:'cancelado'},{ultimaCompetenciaPagamento:'2026-08'},'2026-09')===false &&
    api.mensalidadeVisivelNaGradeOperacional({status:'aberto'},{ultimaCompetenciaPagamento:'2026-08'},'2026-09')===false &&
    api.mensalidadeVisivelNaGradeOperacional({status:'pago'},{ultimaCompetenciaPagamento:'2026-08'},'2026-08')===true,
    'cliente encerrado reaparece na grade operacional após a última competência ou some do histórico válido');
  const vitalle={valorVigente:1700,valorProgramado:1000,valorProgramadoEm:'2026-09'};
  exigir(api.competenciaSeguinte('2026-08')==='2026-09'&&api.competenciaSeguinte('2026-12')==='2027-01',
    'cálculo do próximo mês falhou na troca comum ou na virada do ano');
  exigir(api.valorContratoNaCompetencia(vitalle,'2026-08')===1700&&
    api.valorContratoNaCompetencia(vitalle,'2026-09')===1000&&
    api.valorContratoNaCompetencia(vitalle,'2026-10')===1000,
    'alteração programada da Vitalle reescreveu agosto ou não perdurou após setembro');
  const vitalleComNovaMudanca={...vitalle,valorProgramado:900,valorProgramadoEm:'2026-11',historicoAlteracoesValor:[{acao:'programada',novoValor:1000,inicio:'2026-09',em:'2026-08-11T12:00:00.000Z'}]};
  exigir(api.valorContratoNaCompetencia(vitalleComNovaMudanca,'2026-10')===1000&&api.valorContratoNaCompetencia(vitalleComNovaMudanca,'2026-11')===900,
    'uma segunda alteração futura apagou a vigência intermediária já registrada');
  exigir(api.ajusteValorProgramadoMensalidade({status:'aberto',valorDevido:1700},'2026-09',1000,'2026-09')?.valorDevido===1000&&
    api.ajusteValorProgramadoMensalidade({status:'isento',valorDevido:1700},'2026-09',1000,'2026-09')?.valorDevido===1000&&
    api.ajusteValorProgramadoMensalidade({status:'aberto',valorDevido:1700},'2026-08',1000,'2026-09')===null&&
    api.ajusteValorProgramadoMensalidade({status:'pago',valorDevido:1700},'2026-09',1000,'2026-09')===null,
    'sincronização do novo valor alterou mês anterior/pago ou ignorou cobrança futura aberta/isenta');
  const analiseSaida=api.analisarPagamentosParaSaida([
    {id:'zeiss_2026-08',cliente:'zeiss',competencia:'2026-08',status:'pago'},
    {id:'zeens_2026-09',cliente:'zeens',competencia:'2026-09',status:'aberto'},
    {id:'zeens_2026-10',cliente:'zeens',competencia:'2026-10',status:'pago'},
    {id:'zeens_2026-07',cliente:'zeens',competencia:'2026-07',status:'cancelado',canceladoPorSaida:true,canceladoPorSaidaId:'saida-1',statusAntesSaida:'isento'}
  ],'zeens','2026-09','saida-1');
  exigir(analiseSaida.posteriores.length===1 && analiseSaida.pagosPosteriores[0]?.competencia==='2026-10' && analiseSaida.reabrir[0]?.competencia==='2026-07',
    'análise da saída não reconhece alias, pagamento posterior ou reabertura da própria programação');
  const joaquins=api.analisarPagamentosParaSaida([
    {id:'joaquin-assados_2026-08',cliente:'joaquin-assados',competencia:'2026-08',status:'pago'},
    {id:'joaquin-assados_2026-09',cliente:'joaquin-assados',competencia:'2026-09',status:'aberto'},
    {id:'acougue-sao-joaquim_2026-09',cliente:'acougue-sao-joaquim',competencia:'2026-09',status:'isento',cortesiaPermanente:true}
  ],'joaquin-assados','2026-08','saida-joaquin');
  exigir(joaquins.posteriores.length===1 && joaquins.posteriores[0].competencia==='2026-09' && joaquins.pagosPosteriores.length===0,
    'Joaquin Assados voltou a manter setembro depois da competência final de agosto');
  const acougue=api.analisarPagamentosParaSaida([
    {id:'acougue-sao-joaquim_2026-09',cliente:'acougue-sao-joaquim',competencia:'2026-09',status:'isento',cortesiaPermanente:true}
  ],'acougue-sao-joaquim','2026-08','saida-acougue');
  exigir(acougue.posteriores.length===1 && acougue.pagosPosteriores.length===0,
    'cortesia permanente posterior à saída do Açougue São Joaquim permaneceu na recorrência');
  let bloqueouCompetenciaAusente=false;
  try{ api.analisarPagamentosParaSaida([], 'joaquin-assados', '', 'saida-antiga'); }catch(e){ bloqueouCompetenciaAusente=String(e.message).includes('último mês financeiro'); }
  exigir(bloqueouCompetenciaAusente,
    'saída antiga sem competência final voltou a passar como conciliada');

  const salvarContrato = trecho(escritorio, 'window.salvarContrato = async function', '  window.novoContrato');
  exigir(salvarContrato.includes('const lote = writeBatch(db);') &&
    salvarContrato.includes('ajusteCortesiaMensalidade') && salvarContrato.includes('ajusteValorProgramadoMensalidade') &&
    salvarContrato.includes('historicoAlteracoesValor') && salvarContrato.includes('await lote.commit()'),
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
  const resumoFinanceiro=trecho(painel,'let html = `<div class="painelResumo financeiroResumoMes"','/* Seção própria de saída');
  exigir((resumoFinanceiro.match(/resumoCard/g)||[]).length===4 &&
    resumoFinanceiro.includes('${brl(quitadoMensal)}') && resumoFinanceiro.includes('Mensalidades pagas em') &&
    resumoFinanceiro.includes('${brl(totalEntrou)}') && resumoFinanceiro.includes('Entrou no caixa da agência') &&
    !painel.includes('📈 Últimos 6 meses (recebido)') && !painel.includes('⚠️ Concentração de receita'),
    'Financeiro voltou a confundir caixa com mensalidades quitadas ou a exibir mais de quatro indicadores principais');
  const geradorMensal = trecho(escritorio, 'window.renderMensalidades = async function', '  function atualizarBadgeMensalidades');
  exigir(geradorMensal.includes('if(!contratoVigenteNaCompetencia(ct, competencia)) continue;') &&
    geradorMensal.includes('valorDevido: valorContratoNaCompetencia(ct,competencia)') &&
    geradorMensal.includes("!['isento','cancelado'].includes(l.sit.k)") &&
    geradorMensal.includes("!['pago','isento','cancelado'].includes(l.sit.k)"),
    'gerador/grade mensal voltou a criar ou contar cobrança fora do contrato/cancelada');

  const ficha = trecho(escritorio, 'const ETAPAS_ONBOARDING_LOCAL', '  window.registrarClienteDaReuniao');
  const fichaApi = executarSandbox('ficha-cortesia-cliente-sandbox.js',
    `function slugClienteCanonico(s){return s;}function mesesCortesiaValidos(meses){return (meses||[]).every(m=>/^\\d{4}-(0[1-9]|1[0-2])$/.test(String(m)));}function numeroWhatsAppBrasil(valor){let digitos=String(valor||'').replace(/\\D/g,'');if(digitos.length===10||digitos.length===11)digitos='55'+digitos;return /^55\\d{10,11}$/.test(digitos)?digitos:'';}\n${ficha}\nglobalThis.api={validarEntradaClienteMensalista,modelarClienteMensalistaUnificado};`);
  const base={nome:'Cliente Teste',instagram:'@teste',telefone:'41999999999',plano:'Intermediário',planoDetalhes:'',valorMensal:1700,diaVencimento:10,primeiraCompetencia:'2026-08',tipoEntrega:'postagem_completa',incluiStories:false,contrato:'',cortesiaTipo:'meses',cortesiaMeses:['2026-08'],cortesiaPermanente:false,cortesiaInicial:true};
  exigir(fichaApi.validarEntradaClienteMensalista(base).length === 0,
    'ficha da Amanda recusou uma cortesia mensal válida');
  const mensal=fichaApi.modelarClienteMensalistaUnificado(base,'2026-08-07T12:00:00.000Z','token','entrada-isenta');
  exigir(mensal.contrato.cortesiaMeses[0] === '2026-08' && mensal.contrato.primeiraCompetencia==='2026-08' && mensal.mensalidade.status === 'isento' && mensal.mensalidade.cortesiaDoMes === true && mensal.recebimentoEntrada===null &&
    mensal.contatoFinanceiro.whatsapp==='5541999999999' && !Object.prototype.hasOwnProperty.call(mensal.config,'whatsappCobranca'),
    'cortesia ou WhatsApp privado da ficha não chegou ao destino correto e à primeira mensalidade');
  const futura=fichaApi.modelarClienteMensalistaUnificado({...base,cortesiaMeses:['2026-09'],cortesiaInicial:false},'2026-08-07T12:00:00.000Z','token','entrada-cliente-teste');
  exigir(futura.contrato.cortesiaMeses[0] === '2026-09' && futura.mensalidade.status === 'aberto' &&
    futura.mensalidade.recebimentoEntradaId==='entrada-cliente-teste' && futura.mensalidade.pagamentoEntradaPendente===true &&
    futura.recebimentoEntrada?.mensalidadeId==='cliente-teste_2026-08' && futura.recebimentoEntrada.status==='pendente',
    'cortesia futura isentou o mês errado ou o primeiro pagamento não ficou ligado uma única vez');
  let recusouSemId=false;
  try{ fichaApi.modelarClienteMensalistaUnificado({...base,cortesiaTipo:'nenhuma',cortesiaMeses:[],cortesiaInicial:false},'2026-08-07T12:00:00.000Z','token',''); }catch{ recusouSemId=true; }
  exigir(recusouSemId,'cadastro cobrável aceitou nascer sem controle do primeiro pagamento');
  const permanente=fichaApi.modelarClienteMensalistaUnificado({...base,cortesiaTipo:'permanente',cortesiaMeses:[],cortesiaPermanente:true},'2026-08-07T12:00:00.000Z','token','entrada-permanente');
  exigir(permanente.contrato.cortesiaPermanente === true && permanente.mensalidade.status === 'isento' && permanente.recebimentoEntrada===null,
    'cortesia permanente da ficha não chegou ao financeiro');
  exigir(fichaApi.validarEntradaClienteMensalista({...base,cortesiaMeses:['08/2026']}).some(e=>e.includes('formato 2026-08')),
    'ficha aceitou mês de cortesia ambíguo');
  exigir(fichaApi.validarEntradaClienteMensalista({...base,telefone:'9999-9999'}).some(e=>e.includes('WhatsApp brasileiro válido')),
    'ficha aceitou WhatsApp sem DDD ou fora do formato brasileiro');
  const ativacaoAvulso=trecho(escritorio,'window.ativarAvulsoRecebido=async function','  const ETAPAS_ONBOARDING_LOCAL');
  exigir(ativacaoAvulso.includes('lead.whatsappCobranca||lead.whatsappNormalizado||lead.whatsapp||lead.telefone') &&
    ativacaoAvulso.includes("doc(db,'contatos_clientes_financeiro',slug)") &&
    ativacaoAvulso.includes("origem:'ativacao_avulso'") &&
    !ativacaoAvulso.includes('whatsappCobranca,semConteudoRecorrente:true') &&
    ativacaoAvulso.indexOf('if(!whatsappCobranca)')<ativacaoAvulso.indexOf('runTransaction'),
    'ativação de cliente avulso voltou a perder o WhatsApp privado coletado no link');
  const formularioPublico=fs.readFileSync(path.join(raiz, 'avulso.html'), 'utf8');
  exigir(formularioPublico.includes('function normalizarWhatsAppBrasilCadastro') &&
    (formularioPublico.match(/whatsappNormalizado=normalizarWhatsAppBrasilCadastro\(whatsapp\)/g)||[]).length===3 &&
    formularioPublico.includes('nome, slug, instagram, telefone, whatsappCobranca, aniversario, contatos'),
    'algum caminho público voltou a aceitar ou encaminhar contato sem normalização');
  const editarFicha = trecho(escritorio, 'window.salvarClienteAtivoCentral=async function', '  window.arquivarEntradaPendente');
  exigir(editarFicha.includes('ajusteCortesiaMensalidade') && editarFicha.includes('cortesiaPermanente:dados.cortesiaPermanente') &&
    editarFicha.includes('cortesiaMeses:dados.cortesiaMeses') &&
    editarFicha.includes("!['pago','cancelado'].includes(statusMensalidadeCanonico(p))") && editarFicha.includes('if(mudou) tx.set(ref,atualizacao'),
    'editar ficha ativa não sincroniza contrato e mensalidades');
  exigir(!editarFicha.includes('valorVigente:dados.valorMensal')&&!editarFicha.includes('valorDevido:dados.valorMensal')&&
    escritorio.includes('id="ecaValor" value="${Number(v.valorMensal||0)}" readonly'),
    'ficha geral voltou a criar um segundo caminho retroativo para alterar mensalidade');

  const painelFinanceiro=trecho(escritorio,'window.confirmarRecebimentoEntrada=async function','  window.renderMensalidades = async function');
  exigir(painelFinanceiro.includes("usuarioAtual!=='Chris'")&&
    painelFinanceiro.includes("getDocs(collection(db,'recebimentos_entrada_pessoal')).catch")&&
    painelFinanceiro.includes("origemRecebimento:'entrada_contrato'")&&
    painelFinanceiro.includes("foraCaixaAgencia:destino==='conta_pessoal_chris'")&&
    painelFinanceiro.includes("valorConfirmado:valorRecebido")&&painelFinanceiro.includes("if(!(valorRecebido>0))")&&
    painelFinanceiro.includes('const totalEntrou = recebidoMensalAgencia + receitaAvulsa')&&
    painelFinanceiro.includes('Controle privado de entradas indisponível'),
    'primeiro pagamento perdeu isolamento, vínculo atômico, exclusão do caixa pessoal ou estado de erro');
  const marcarMensalidade=trecho(escritorio,'window.marcarMensalidade = async function','  /* ===== PAINEL FINANCEIRO');
  exigir(marcarMensalidade.includes("atual.pagamentoEntradaPendente===true||atual.origemRecebimento==='entrada_contrato'"),
    'primeiro pagamento ainda pode ser alterado pelo botão mensal genérico e duplicar o caixa');
  const confirmarEntrada=trecho(escritorio,'window.confirmarRecebimentoEntrada=async function','  window.desfazerRecebimentoEntrada');
  const escritaMensalConfirmacao=confirmarEntrada.match(/tx\.set\(mensalidadeRef,\{([^}]|\}(?!,\{merge:true\}))*\},\{merge:true\}\)/)?.[0]||'';
  exigir(escritaMensalConfirmacao.includes("origemRecebimento:'entrada_contrato'")&&
    !escritaMensalConfirmacao.includes('destinoRecebimento')&&!escritaMensalConfirmacao.includes('foraCaixaAgencia'),
    'destino da conta pessoal vazou para pagamentos_mensais, coleção legível pelo Portal do cliente');
  const centralDemandas=trecho(escritorio,'async function renderDemandasDaEquipe','  window.renderPainelDemandas');
  exigir(!centralDemandas.includes('controleEntradasHTML')&&!centralDemandas.includes('avisoControleEntradaHTML'),
    'variável privada do Financeiro vazou novamente para a Central de Demandas');

  const regras=fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8');
  const regraEntrada=trecho(regras,'match /recebimentos_entrada_pessoal/{docId}',"    match /pagamentos_extra/{docId}");
  exigir(regraEntrada.includes('allow read, update: if ehChris()')&&
    regraEntrada.includes('allow create: if ehChris() || (ehAmanda()')&&
    regraEntrada.includes("request.resource.data.status == 'pendente'")&&
    regraEntrada.includes("!('destino' in request.resource.data)")&&
    regraEntrada.includes("!('foraCaixaAgencia' in request.resource.data)")&&
    regraEntrada.includes('allow delete: if false;'),
    'Firestore expõe a conta pessoal ou permite que Amanda confirme/altere o recebimento');
}

function testarCampanhasMensaisSandbox(){
  const inicio=escritorio.indexOf('  const normTextoCampanha');
  const fim=escritorio.indexOf('  window.riscoPostCampanha=riscoPostCampanha;',inicio);
  exigir(inicio>=0&&fim>inicio,'funções puras do quadro mensal de campanhas não foram encontradas');
  const fonte=escritorio.slice(inicio,fim+'  window.riscoPostCampanha=riscoPostCampanha;'.length);
  const api=executarSandbox('campanhas-mensais-sandbox.js',
    `const crypto={randomUUID:()=>\"id\"};const ETAPAS_CAMPANHA=[{chave:'planejamento'},{chave:'aprovacao'},{chave:'gravacao'},{chave:'edicao'},{chave:'programacao'},{chave:'finalizado'},{chave:'postado'}];\n`+
    `function hojeLocal(){return '2026-08-10';}function dataLocal(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}function slugClienteCanonico(v){return String(v||'').toLowerCase().replace(/\\s+/g,'-');}\n`+
    `${fonte}\nglobalThis.api={normalizarCampanhaMensal,statusAutomaticoPostCampanha,riscoPostCampanha};`);
  const legado=api.normalizarCampanhaMensal({nome:'Dia da Pizza',cliente:'bluefit',clienteNome:'Bluefit',dataInicio:'2026-08-10',dataFim:'2026-08-12',etapa:'producao'});
  exigir(legado.mesRef==='2026-08'&&legado.clientes.length===1&&legado.clientes[0].postagens.length===1,
    'campanha legada desaparece ou perde mês/cliente ao abrir o quadro novo');
  const moderno=api.normalizarCampanhaMensal({mesRef:'2026-09',clientes:[{slug:'a',nome:'A',postagens:[{titulo:'Post 1'},{titulo:'Post 2'}]}]});
  exigir(moderno.clientes[0].postagens.length===2&&moderno.clientes[0].postagens.every(p=>p.id),
    'campanha moderna não preserva postagens individuais ou IDs estáveis');
  const cliente={slug:'bluefit',nome:'Bluefit'},post={titulo:'Setembro Amarelo',status:'planejamento',prazoGravacao:'2026-08-11'};
  const pipeline={'bluefit|setembro amarelo':{videoStatus:'aguardando_edicao'}};
  exigir(api.statusAutomaticoPostCampanha(post,cliente,pipeline)==='gravacao',
    'status não avançou por vínculo exato com a cadeia de vídeo');
  exigir(api.riscoPostCampanha(post,cliente,{},'2026-08-10')?.tipo==='vence_amanha',
    'Amanda não recebe risco de prazo incompleto no dia anterior');
  const bloco=trecho(escritorio,'/* ===== V45 — QUADRO MENSAL ÚNICO DE CAMPANHAS','async function demandaCalendariosDoMes');
  exigir(bloco.includes("const PODE_PLANEJAR_CAMPANHA = ['Gabrielle','Chris']")&&
    bloco.includes("const PODE_PRAZO_CAMPANHA = ['Amanda','Chris']")&&
    bloco.includes("const PODE_STATUS_CAMPANHA = ['Cecília','Amanda','Chris']"),
    'responsabilidades de Gabi/Amanda/Cecília voltaram a se misturar');
  exigir(bloco.includes('excluido:true')&&bloco.includes('arquivada:true')&&!bloco.includes('deleteDoc('),
    'campanhas perderam soft-delete/arquivo mensal');
  exigir(bloco.includes('window.atualizarBadgeRiscosCampanhas=async function')&&
    escritorio.includes('if(window.atualizarBadgeRiscosCampanhas) atualizarBadgeRiscosCampanhas()'),
    'riscos de Campanhas só aparecem depois de abrir a tela e não alertam no menu');
  exigir((escritorio.match(/id="navAcompCampanhas"/g)||[]).length===1&&!escritorio.includes('id="navCampanhas"'),
    'duas portas de Campanhas voltaram ao menu lateral');
  const registroDomExclusivo=trecho(escritorio,
    "['navCadastro','navAprovacoes','navExtras'",
    'function definirItemExclusivoNoDOM');
  exigir(['navAcompCampanhas','view-campanhas','navVideos','view-videos'].every(id=>registroDomExclusivo.includes(`'${id}'`)) &&
    escritorio.includes("definirItemExclusivoNoDOM('navAcompCampanhas',podeCampanhas)") &&
    escritorio.includes("definirItemExclusivoNoDOM('view-campanhas',podeCampanhas)"),
    'Campanhas voltou a permanecer escondida no DOM de papéis sem acesso');
  const regras=fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8');
  const regraCamp=trecho(regras,'match /campanhas/{docId}',"    // Coleções exclusivamente operacionais");
  exigir(regraCamp.includes('ehGabi()')&&regraCamp.includes('ehAmanda()')&&regraCamp.includes('ehCecilia()')&&
    !regras.match(/colecao in \[[\s\S]*?'campanhas'/),
    'Firestore voltou a liberar Campanhas para toda a equipe');
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
  exigir(parar.includes('if(limparCachesColecoes !== false){') && parar.includes('__limparCacheColecoes();') &&
    parar.includes('window.__mensagensClientesLista=[]') && parar.includes('window.__cobrancasFila={}'),
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

  const resumoMinhas = trecho(escritorio,
    'const resumoHtml = `<div class="painelResumo painelResumoDemandas"',
    '/* ===== FILA DE APROVACAO');
  exigir((resumoMinhas.match(/resumoCard clicavel/g)||[]).length === 5 && !resumoMinhas.includes('grid-column:span 2'),
    'resumo de Minhas Demandas voltou a criar lacuna ou cartão condicional');
  for (const destino of ['atrasadas','hoje','proximas','aguardando','enviei']) {
    exigir(resumoMinhas.includes(`setFiltroMinhasDemandas('${destino}', null)`),
      `cartão de Minhas Demandas perdeu o destino ${destino}`);
  }

  const central = trecho(escritorio, 'async function renderDemandasDaEquipe', 'window.renderPainelDemandas');
  exigir(central.includes("const visiveis = filtroFaixa === 'todas' ? abertas : abertas.filter") &&
    central.includes('visiveis.forEach(d => por[faixaDaDemanda(d)].push(d))'),
    'filtro visual da Central de Demandas não controla a lista exibida');
  exigir(central.includes('<details class="distribuicaoDemandas">') &&
    central.includes('Nenhuma demanda corresponde a este filtro.'),
    'Central de Demandas perdeu o recolhimento ou o estado vazio do filtro');
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
  const fonteCompetenciaSeguinte = trecho(escritorio,
    'function competenciaSeguinte(competencia)',
    'function valorContratoNaCompetencia');
  const fonteFila = trecho(escritorio, 'function mesDoItemCalendario', 'window.linhasCalendariosAguardandoRevisao');
  const fila = executarSandbox('calendarios-aprovacao-sandbox.js',
    `function mesDoTextoConf(txt){const s=String(txt||'');const iso=s.match(/(20\\d{2})-(\\d{2})/);if(iso)return iso[1]+'-'+iso[2];const t=s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();const nomes=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];const i=nomes.findIndex(n=>t.includes(n)),ano=(t.match(/(20\\d{2})/)||[])[1];return i>=0&&ano?ano+'-'+String(i+1).padStart(2,'0'):'';}\n` +
    `function competenciaFinanceiraValida(v){return /^\\d{4}-(0[1-9]|1[0-2])$/.test(String(v||''));}\n${fonteCompetenciaSeguinte}\n` +
    `function slugClienteCanonico(slug){return ({zeens:'zeiss','otica-visao-araucaria':'zeiss'}[slug]||slug);}\n` +
    `${fonteFila}\nglobalThis.api={estadoMesCal,itensDoMesCalendario,linhasCalendariosAguardandoRevisao,mesHistoricoForaDaRevisao};`);
  const registro = (id, dados) => ({ id, data:()=>dados });
  const setembroPendente = registro('cliente-x', {
    client:'Cliente X', items:[{mes:'2026-09',name:'A',ref:'https://ref'}],
    aprovacaoMeses:{'2026-09':{status:'aguardando_interna',por:'Gabrielle',em:'2026-08-06T01:00:00Z'}}
  });
  exigir(fila.linhasCalendariosAguardandoRevisao([setembroPendente],new Date(2026,7,16,12)).length === 1,
    'envio do mês seguinte da Gabi não chegou à fila da Amanda');
  /* Incidente Juliane (14/08): cinco conteúdos antigos não tinham `mes`,
     o documento ainda dizia Agosto 2026 e somente setembro possuía uma
     aprovação mensal. A chave de setembro não pode reclassificar agosto. */
  const itensJuliane = [
    ...Array.from({length:5},(_,i)=>({name:'Legado '+i})),
    ...Array.from({length:4},(_,i)=>({mes:'2026-08',name:'Agosto '+i})),
    ...Array.from({length:20},(_,i)=>({mes:'2026-09',name:'Setembro '+i}))
  ];
  const julianeSemAncora = registro('juliane-nerone', {
    client:'Juliane Nerone', month:'Agosto 2026', items:itensJuliane,
    aprovacaoInterna:{status:'aguardando_interna',mes:'2026-09',por:'Gabrielle',em:'2026-08-14T12:00:00Z'},
    aprovacaoMeses:{'2026-09':{status:'aguardando_interna',por:'Gabrielle',em:'2026-08-14T12:00:00Z'}}
  });
  exigir(fila.itensDoMesCalendario(julianeSemAncora.data(),'2026-08').length===9 &&
    fila.itensDoMesCalendario(julianeSemAncora.data(),'2026-09').length===20,
    'conteúdo legado de agosto voltou a ser classificado pela aprovação única de setembro');
  const filaJuliane=fila.linhasCalendariosAguardandoRevisao([julianeSemAncora],new Date(2026,7,16,12));
  exigir(filaJuliane.length===1&&filaJuliane[0].mesKey==='2026-09'&&filaJuliane[0].itens===20,
    'análise da Amanda voltou a misturar os cinco conteúdos antigos no calendário de setembro');

  const mesItemEditorFonte=trecho(calendario,'function mesDoItemNoCalendario','/* ===== A ARMADILHA');
  const mesItemEditorApi=executarSandbox('calendario-competencia-juliane-v67.js',
    `let data={month:'Agosto 2026',aprovacaoInterna:{mes:'2026-09'},aprovacaoMeses:{'2026-09':{status:'aguardando_interna'}}};`+
    `function mesDoTexto(txt){return txt==='Agosto 2026'?'2026-08':'';}`+
    `${mesItemEditorFonte}\nglobalThis.api={mesDoItem};`);
  exigir(mesItemEditorApi.mesDoItem({name:'Legado'})==='2026-08'&&
    mesItemEditorApi.mesDoItem({mes:'2026-09',name:'Novo'})==='2026-09',
    'editor oficial voltou a deixar aprovação moderna vencer a competência do documento legado');
  const mistoLegado = registro('cliente-legado', {
    client:'Legado', mesLegado:'2026-07', items:[{name:'antigo'},{mes:'2026-08',name:'novo'}],
    aprovacaoMeses:{'2026-07':{status:'aguardando_interna',por:'Gabrielle'},'2026-08':{status:'rascunho'}}
  });
  const filaLegado = fila.linhasCalendariosAguardandoRevisao([mistoLegado],new Date(2026,7,12,12));
  exigir(filaLegado.length === 0 && fila.mesHistoricoForaDaRevisao('2026-07',new Date(2026,7,12,12))===true,
    'mês histórico explicitamente contaminado continuou na fila operacional da Amanda');
  exigir(fila.linhasCalendariosAguardandoRevisao([registro('ok', {
    items:[{mes:'2026-08',name:'A'}], aprovacaoMeses:{'2026-08':{status:'liberado'}}
  })]).length === 0, 'calendário já liberado continuou pedindo aprovação');
  /* Incidente Mochi (12/08): julho era a âncora legada, mas setembro
     enviado também era espelhado em `aprovacaoInterna`. O fallback global
     fazia julho entrar junto na fila com o mesmo horário de setembro. */
  const julhoSetembro = registro('mochi', {
    client:'Mochi', mesLegado:'2026-07',
    items:[{mes:'2026-07',name:'Julho concluído'},{mes:'2026-09',name:'Setembro novo'}],
    aprovacaoInterna:{status:'aguardando_interna',mes:'2026-09',por:'Gabrielle',em:'2026-08-10T19:55:11Z'},
    aprovacaoMeses:{'2026-09':{status:'aguardando_interna',mes:'2026-09',por:'Gabrielle',em:'2026-08-10T19:55:11Z'}}
  });
  const filaJulhoSetembro = fila.linhasCalendariosAguardandoRevisao([julhoSetembro]);
  exigir(filaJulhoSetembro.length === 1 && filaJulhoSetembro[0].mesKey === '2026-09' &&
    fila.estadoMesCal(julhoSetembro.data(),'2026-07') === 'liberado',
    'status global de setembro voltou a duplicar julho na fila da Amanda');
  const vipContaminado=registro('vip',{
    client:'VIP',mesLegado:'2026-07',items:[
      ...Array.from({length:6},(_,i)=>({mes:'2026-07',name:'Julho '+i})),
      ...Array.from({length:15},(_,i)=>({mes:'2026-09',name:'Setembro '+i}))
    ],aprovacaoMeses:{
      '2026-07':{status:'aguardando_interna',por:'Gabrielle',em:'2026-08-12T10:00:00Z'},
      '2026-09':{status:'aguardando_interna',por:'Gabrielle',em:'2026-08-12T10:00:01Z'}
    }
  });
  const vipFila=fila.linhasCalendariosAguardandoRevisao([vipContaminado],new Date(2026,7,12,12));
  exigir(vipFila.length===1&&vipFila[0].mesKey==='2026-09'&&vipFila[0].itens===15,
    'VIP voltou a mostrar julho e setembro juntos na fila da Amanda');
  const aliasesMesmoMes=fila.linhasCalendariosAguardandoRevisao([
    registro('zeens',{client:'Zeens',items:[{mes:'2026-09',name:'A'}],aprovacaoMeses:{'2026-09':{status:'aguardando_interna',em:'2026-08-12T10:00:00Z'}}}),
    registro('zeiss',{client:'Zeiss',items:[{mes:'2026-09',name:'A'}],aprovacaoMeses:{'2026-09':{status:'aguardando_interna',em:'2026-08-12T10:00:00Z'}}})
  ],new Date(2026,7,12,12));
  exigir(aliasesMesmoMes.length===1&&aliasesMesmoMes[0].slug==='zeiss',
    'aliases do mesmo cliente/mês voltaram a criar duas decisões para Amanda');
  const barreiraHistorico=trecho(calendario,
    'window.enviarParaAprovacaoInterna = async function',
    'window.retirarDaAprovacaoInterna = async function');
  exigir(barreiraHistorico.includes('if(!mesEhCompetenciaOperacional(mesVisivel))') &&
    barreiraHistorico.includes('Os outros meses ficam apenas no arquivo'),
    'mês fora da competência seguinte voltou a poder ser reenviado para a fila da Amanda');
  const historicoApi=executarSandbox('mes-historico-v81.js',
    `${trecho(calendario,'function competenciaAtualDoCalendario','/* O mês que está sendo visto agora.')}\nglobalThis.api={competenciaOperacionalDoCalendario,mesEhCompetenciaOperacional};`);
  exigir(historicoApi.competenciaOperacionalDoCalendario('2026-08-12T12:00:00')==='2026-09' &&
    historicoApi.competenciaOperacionalDoCalendario('2026-12-12T12:00:00')==='2027-01' &&
    historicoApi.mesEhCompetenciaOperacional('2026-10','2026-08-12T12:00:00')===false,
    'barreira operacional não diferencia mês seguinte, virada de ano e outro mês futuro');
  const portalFonte=trecho(fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8'),
    'function estadoDoMesPortal(mes)','const mesesDoDoc');
  const portalMesApi=executarSandbox('portal-mes-isolado-v59.js',
    `const aprMeses={'2026-09':{status:'aguardando_interna',mes:'2026-09'}};const todosItens=[{mes:'2026-07'},{mes:'2026-09'}];const usaMeses=true,legado='2026-07';const dadosCal={aprovacaoMeses:aprMeses,mesLegado:legado,items:todosItens,aprovacaoInterna:{status:'aguardando_interna',mes:'2026-09'}};\n${portalFonte}\nglobalThis.api={estadoDoMesPortal};`);
  exigir(portalMesApi.estadoDoMesPortal('2026-07')==='liberado' && portalMesApi.estadoDoMesPortal('2026-09')==='aguardando_interna',
    'Portal voltou a herdar a aprovação de setembro no mês legado de julho');
  const portalCompetenciaFonte=trecho(fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8'),
    'const mesDoRotuloPortal = txt =>','    /* A MESMA função do calendário');
  const portalCompetenciaApi=executarSandbox('portal-competencia-juliane-v67.js',
    `const todosItens=[...Array.from({length:5},(_,i)=>({name:'Legado '+i})),...Array.from({length:4},(_,i)=>({mes:'2026-08',name:'Agosto '+i})),...Array.from({length:20},(_,i)=>({mes:'2026-09',name:'Setembro '+i}))];`+
    `const dadosCal={month:'Agosto 2026',items:todosItens,aprovacaoInterna:{mes:'2026-09'},aprovacaoMeses:{'2026-09':{status:'aguardando_interna'}}};const aprMeses=dadosCal.aprovacaoMeses;`+
    `${portalCompetenciaFonte}\nglobalThis.api={mesDoItemPortal,contar:m=>todosItens.filter(i=>mesDoItemPortal(i)===m).length};`);
  exigir(portalCompetenciaApi.contar('2026-08')===9&&portalCompetenciaApi.contar('2026-09')===20,
    'Portal voltou a esconder legado de agosto ou mostrá-lo junto de setembro');

  /* A compatibilidade legada não pode oferecer um botão impossível:
     ausência de status explícito permite entrar no ciclo formal, mas um
     mês efetivamente liberado continua imutável. */
  const envioFonte = trecho(calendario,
    'window.enviarParaAprovacaoInterna = async function',
    '/* ===== REABRIR ANTES DO ENVIO');
  const envioApi = executarSandbox('envio-calendario-legado-sandbox.js',
    `let data={month:'Setembro 2026',items:[{mes:'2026-09',name:'Legado'}]};let mesVisivel='2026-09',confirmacoesConteudo=0,transacoes=0,recusas=0,confirmacoes=0;\n` +
    `window.__modoCal='equipe';window.__enviandoAprovacaoInterna=false;\n` +
    `const document={body:{classList:{add(){},remove(){}}}};\n` +
    `function ehCalendarioLegado(){const m=data.aprovacaoMeses?.[mesVisivel];return !(m?.status||data.aprovacaoInterna?.status);}\n` +
    `function mesUsaCampoLegadoLocal(mes){const usa=(data.items||[]).some(i=>i&&i.mes)||!!data.aprovacaoMeses||!!data.mesLegado;return !usa||!!mes&&!!data.mesLegado&&mes===data.mesLegado;}\n` +
    `function mesEhCompetenciaOperacional(m){return m==='2026-09';}function competenciaOperacionalDoCalendario(){return '2026-09';}function textoDoMes(){return 'Setembro 2026';}\n` +
    `function estadoAprovacao(){return data.aprovacaoMeses?.[mesVisivel]?.status||data.aprovacaoInterna?.status||(data.items.length?'liberado':'rascunho');}\n` +
    `function edicaoBloqueadaPorRevisao(){return ['aguardando_interna','aprovado_interno','liberado'].includes(estadoAprovacao());}\n` +
    `function exigirRetiradaAntesDeEditar(){recusas++;return true;}function itensDoMes(m){return data.items.filter(i=>!i.mes||i.mes===m);}\n` +
    `function confirm(){confirmacoes++;return true;}function prompt(){return 'Gabrielle';}function mesDoTexto(){return '2026-09';}\n` +
    `async function confirmarConteudoAntesDoEnvio(){confirmacoesConteudo++;return {ok:true};}\n` +
    `async function confirmarEnvioAprovacaoNoBanco(p){transacoes++;return {ok:true,marca:p.marca,updatedAt:'confirmado'};}\n` +
    `function aplicarEnvioAprovacaoConfirmado(p,r){data.aprovacaoMeses={...(data.aprovacaoMeses||{}),[p.mes]:r.marca};data.updatedAt=r.updatedAt;}\n` +
    `function limparEnvioPendente(){}function renderAprovacaoInterna(){}function avisarTela(){}\n` +
    `function guardarEnvioPendente(){}function guardarRascunho(){}function pintarEstado(){}function mostrarEnvioPendente(){}function agendarEnvioPendente(){}\n` +
    `${envioFonte}\n` +
    `globalThis.api={enviar:window.enviarParaAprovacaoInterna,dados:()=>data,confirmacoesConteudo:()=>confirmacoesConteudo,transacoes:()=>transacoes,recusas:()=>recusas,confirmacoes:()=>confirmacoes,explicito:()=>{data={month:'Setembro 2026',items:[{mes:'2026-09',name:'Enviado'}],aprovacaoMeses:{'2026-09':{status:'liberado'}},aprovacaoInterna:{status:'liberado'}};}};`);
  const btnEnvio = {disabled:false,textContent:'',isConnected:true};
  await envioApi.enviar(btnEnvio);
  exigir(envioApi.confirmacoesConteudo() === 1 && envioApi.transacoes() === 1 && envioApi.confirmacoes() === 1 &&
    envioApi.dados().aprovacaoMeses['2026-09'].status === 'aguardando_interna',
    'calendário legado continuou bloqueado ou não entrou na fila da Amanda');
  envioApi.explicito();
  await envioApi.enviar(btnEnvio);
  exigir(envioApi.transacoes() === 1 && envioApi.recusas() === 1 &&
    envioApi.dados().aprovacaoMeses['2026-09'].status === 'liberado',
    'exceção do legado desbloqueou calendário realmente enviado ao cliente');

  const assinaturaConflitoFonte = trecho(calendario,'function assinaturaConteudoCalendario','/* ===== O QUE ACONTECEU COM A GABI');
  const conflitoApi = executarSandbox('envio-calendario-autosave-v57.js',
    `${assinaturaConflitoFonte}\nglobalThis.api={deveBloquearConflitoCalendario};`);
  const servidorEco={client:'Cliente',items:[{name:'A'}],updatedAt:'servidor',aprovacaoInterna:{status:'rascunho'}};
  const envioLocal={client:'Cliente',items:[{name:'A'}],updatedAt:'local',aprovacaoInterna:{status:'aguardando_interna',em:'envio-1'}};
  exigir(conflitoApi.deveBloquearConflitoCalendario(true,true,servidorEco,envioLocal,'envio-1','envio-1')===false,
    'eco idêntico do autosave continua impedindo a Gabi de enviar para Amanda');
  exigir(conflitoApi.deveBloquearConflitoCalendario(true,true,{...servidorEco,items:[{name:'Outra edição'}]},envioLocal,'envio-1','envio-1')===true &&
    conflitoApi.deveBloquearConflitoCalendario(true,false,servidorEco,envioLocal,'','')===true &&
    conflitoApi.deveBloquearConflitoCalendario(true,true,servidorEco,envioLocal,'envio-1','decisao-amanda')===true,
    'exceção do envio formal permitiu sobrescrever conteúdo concorrente ou decisão mais recente');

  const filaGravacaoFonte=trecho(calendario,'function gravarComSeguranca()','async function executarGravacaoComSeguranca');
  const filaGravacaoApi=executarSandbox('fila-gravacao-calendario-v68.js',
    `let pendingWrite=false,gravacoesCalendarioNaFila=0,filaGravacaoCalendario=Promise.resolve({ok:true}),inicios=[],resolucoes=[];\n`+
    `function executarGravacaoComSeguranca(){inicios.push(inicios.length+1);return new Promise(resolve=>resolucoes.push(resolve));}\n`+
    `${filaGravacaoFonte}\n`+
    `globalThis.api={gravar:gravarComSeguranca,inicios:()=>inicios.slice(),resolver:i=>resolucoes[i]({ok:true}),fila:()=>gravacoesCalendarioNaFila,pendente:()=>pendingWrite};`);
  const primeiraGravacao=filaGravacaoApi.gravar();
  const segundaGravacao=filaGravacaoApi.gravar();
  await Promise.resolve();await Promise.resolve();
  exigir(filaGravacaoApi.inicios().length===1 && filaGravacaoApi.fila()===2 && filaGravacaoApi.pendente()===true,
    'fila V68 iniciou dois autosaves em paralelo');
  filaGravacaoApi.resolver(0);await primeiraGravacao;await Promise.resolve();
  exigir(filaGravacaoApi.inicios().length===2,
    'fila V68 não iniciou o segundo autosave depois da confirmação do primeiro');
  filaGravacaoApi.resolver(1);await segundaGravacao;
  exigir(filaGravacaoApi.fila()===0 && filaGravacaoApi.pendente()===false,
    'fila V68 permaneceu marcada como pendente depois de todas as confirmações');

  /* Reproduz a operação real da V68: a fila da Amanda só muda depois de
     reler o documento, conferir o conteúdo e gravar um patch com merge.
     O teste também prova reenvio idempotente, conflito e compatibilidade
     com a caixa de saída criada pela V67. */
  const envioTransacionalFonte =
    trecho(calendario,'function assinaturaConteudoCalendario','/* ===== O QUE ACONTECEU COM A GABI') + '\n' +
    trecho(calendario,'function mesDoItemNoCalendario','/* ===== A ARMADILHA') + '\n' +
    trecho(calendario,'function docJaUsaMesesNoCalendario','function estadoDoMes') + '\n' +
    trecho(calendario,'async function confirmarEnvioAprovacaoNoBanco','function aplicarEnvioAprovacaoConfirmado');
  const envioTransacionalApi=executarSandbox('envio-calendario-transacional-v68.js',
    `let servidor={client:'Cliente',month:'Setembro 2026',items:[{mes:'2026-09',name:'Conteúdo A'}],aprovacaoMeses:{'2026-09':{status:'rascunho'}},campoDesconhecido:'preservar',updatedAt:'antes'};let patches=[];\n`+
    `function mesDoTexto(){return '2026-09';}function mesEhCompetenciaOperacional(m){return m==='2026-09';}function competenciaOperacionalDoCalendario(){return '2026-09';}\n`+
    `window.__fb={db:{},docRef:{path:'calendarios/cliente'},runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>true,data:()=>servidor}),set:(_ref,patch,opts)=>patches.push({patch,opts})})};\n`+
    `${envioTransacionalFonte}\n`+
    `const pacote=()=>({mes:'2026-09',por:'Gabrielle',em:'2026-08-17T10:30:00.000Z',marca:{status:'aguardando_interna',por:'Gabrielle',em:'2026-08-17T10:30:00.000Z',mes:'2026-09'},data:{...servidor,aprovacaoMeses:{...servidor.aprovacaoMeses}}});\n`+
    `globalThis.api={confirmar:confirmarEnvioAprovacaoNoBanco,pacote,servidor:v=>{servidor=v;},ler:()=>servidor,patches:()=>patches,limpar:()=>{patches=[];}};`);
  const pacoteV68=envioTransacionalApi.pacote();
  const confirmadoV68=await envioTransacionalApi.confirmar(pacoteV68);
  const patchesV68=envioTransacionalApi.patches();
  exigir(confirmadoV68.ok===true && confirmadoV68.jaConfirmado===false && patchesV68.length===1 &&
    patchesV68[0].opts.merge===true && patchesV68[0].patch.aprovacaoMeses['2026-09'].status==='aguardando_interna' &&
    !Object.hasOwn(patchesV68[0].patch,'items') && !Object.hasOwn(patchesV68[0].patch,'client') &&
    !Object.hasOwn(patchesV68[0].patch,'campoDesconhecido'),
    'envio V68 não permaneceu estreito, transacional ou preservador de campos desconhecidos');
  envioTransacionalApi.limpar();
  envioTransacionalApi.servidor({...pacoteV68.data,aprovacaoMeses:{'2026-09':pacoteV68.marca}});
  const repetidoV68=await envioTransacionalApi.confirmar(pacoteV68);
  exigir(repetidoV68.ok===true && repetidoV68.jaConfirmado===true && envioTransacionalApi.patches().length===0,
    'reenvio V68 deixou de ser idempotente ou regravou aprovação confirmada');
  envioTransacionalApi.servidor({...pacoteV68.data,items:[{mes:'2026-09',name:'Edição concorrente'}]});
  const conflitoV68=await envioTransacionalApi.confirmar(pacoteV68);
  exigir(conflitoV68.ok===false && conflitoV68.motivo==='conflito' && envioTransacionalApi.patches().length===0,
    'envio V68 sobrescreveu conteúdo concorrente');
  envioTransacionalApi.servidor({...pacoteV68.data,aprovacaoMeses:{'2026-09':{status:'liberado',mes:'2026-09'}}});
  const decisaoV68=await envioTransacionalApi.confirmar(pacoteV68);
  exigir(decisaoV68.ok===false && decisaoV68.motivo==='decisao-posterior' && envioTransacionalApi.patches().length===0,
    'envio V68 sobrescreveu decisão posterior da Amanda/cliente');
  envioTransacionalApi.limpar();
  envioTransacionalApi.servidor({...pacoteV68.data,aprovacaoMeses:{'2026-09':{status:'rascunho'}}});
  const pacoteV67={mes:'2026-09',por:'Gabrielle',em:'2026-08-17T10:30:00.000Z',data:{...pacoteV68.data,aprovacaoMeses:{'2026-09':pacoteV68.marca}}};
  const compatibilidadeV67=await envioTransacionalApi.confirmar(pacoteV67);
  exigir(compatibilidadeV67.ok===true && envioTransacionalApi.patches().length===1 &&
    envioTransacionalApi.patches()[0].patch.aprovacaoMeses['2026-09'].status==='aguardando_interna',
    'V68 deixou órfã a tentativa pendente criada pela V67');

  const progressoFonte = trecho(escritorio,
    'function progressoEditorialCalendario',
    '  const MESES_CAL');
  const progressoApi = executarSandbox('progresso-editorial-calendario-sandbox.js',
    `${progressoFonte}\nglobalThis.api={progressoEditorialCalendario};`);
  const progresso = progressoApi.progressoEditorialCalendario([
    {desc:'Roteiro 1',legenda:'Legenda',ref:'https://ref'},
    {desc:'  ',legenda:'',ref:''},
    {desc:'Roteiro 3',legenda:'',ref:'https://ref-3'}
  ]);
  exigir(JSON.stringify(progresso) === JSON.stringify({total:3,roteiros:2,legendas:1,referencias:2}),
    'progresso editorial contou campo vazio como roteiro/legenda/referência');
  const visaoFonte = trecho(escritorio, 'window.renderVisaoCalendarios = async function', '/* ===== REFEITA — 28/07/2026');
  exigir(visaoFonte.includes('itensDoMesCalendario(cal, mesAtual)') &&
    visaoFonte.includes("['Amanda','Gabrielle'].includes(usuarioAtual)") &&
    visaoFonte.includes('data-calendarios-progresso-editorial='),
    'visão compartilhada voltou a misturar meses ou vazar detalhes para outro papel');

  const storiesFonte = trecho(escritorio,
    'window.toggleStoryDiario = async function',
    '// ===== BIT — CENTRAL DE DUVIDAS');
  const storiesApi = executarSandbox('check-stories-gabi-sandbox.js',
    `let usuarioAtual='Gabrielle',gravacoes=[],renders=0;const db={};const atual={dias:{segunda:false},detalhes:{}};\n`+
    `function doc(_db,c,id){return {c,id};}async function getDoc(){return {exists:()=>true,data:()=>atual};}\n`+
    `async function setDoc(ref,dados,opts){gravacoes.push({ref,dados,opts});}function serverTimestamp(){return 'SERVIDOR';}\n`+
    `function mostrarToast(){}async function renderStoriesDiarios(){renders++;}async function sincronizarChecklistStoriesGabrielle(){}\n${storiesFonte}\n`+
    `globalThis.api={marcar:window.toggleStoryDiario,gravacoes,renders:()=>renders,papel:v=>{usuarioAtual=v;}};`);
  const btnStory = {disabled:false};
  exigir(await storiesApi.marcar('vitalle-odonto_2026-W33','segunda',true,btnStory) === true &&
    storiesApi.gravacoes.length === 1 && storiesApi.gravacoes[0].dados.dias.segunda === true &&
    storiesApi.gravacoes[0].dados.detalhes.segunda.por === 'Gabrielle' && storiesApi.renders() === 1,
    'check de Story informou sucesso sem persistir autoria e dia');
  storiesApi.papel('Amanda'); btnStory.disabled=false;
  exigir(await storiesApi.marcar('vitalle-odonto_2026-W33','terca',true,btnStory) === false &&
    storiesApi.gravacoes.length === 1,
    'papel diferente da Gabi conseguiu alterar o checklist diário de Stories');
  const renderStoriesFonte = trecho(escritorio, 'async function renderStoriesDiarios', 'window.toggleStoryDiario');
  exigir(renderStoriesFonte.includes('Promise.all(clientes.map') &&
    renderStoriesFonte.includes('slugEstavelStory(c)') &&
    escritorio.includes('function slugEstavelStory(cliente)') &&
    renderStoriesFonte.includes('data-story-check='),
    'check de Stories voltou a carregar em série, derivar identidade do nome ou esconder o controle');
  const aberturaChecklistFonte = trecho(escritorio,
    'window.abrirChecklist = async function',
    'function renderChecklist');
  exigir(aberturaChecklistFonte.indexOf('renderStoriesDiarios();') >= 0 &&
    aberturaChecklistFonte.indexOf('renderStoriesDiarios();') < aberturaChecklistFonte.indexOf('await autoVerificarChecklist()') &&
    aberturaChecklistFonte.includes('cont.appendChild(storiesBoxAntecipado)'),
    'check de Stories voltou a esperar streak/auto-verificação ou a recriar o nó durante a carga');

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
  exigir(listenerCalendarios.includes("if(['Chris','Amanda','Gabrielle','Cecília'].includes(pessoaDoOuvinte))") &&
    !listenerCalendarios.includes('...PESSOAS_DE_CAMPO'),
    'Gabi perdeu atualização ao vivo ou o filmmaker voltou a assinar a coleção inteira de calendários');
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

  /* O incidente V65 só aparece no trajeto completo: no mobile, o painel era
     renderizado depois de todos os botões. Este gate gera o cartão real,
     extrai seu onclick e executa esse atributo com `this`, em vez de chamar
     o handler diretamente como a cobertura anterior fazia. */
  const htmlFilaRevisao = trecho(escritorio, 'window.htmlCalendariosParaRevisar = async function', '  function idAnaliseCalendarioRevisao');
  const aberturaRevisao = trecho(escritorio, 'function idAnaliseCalendarioRevisao', '  const __comentariosCalendarioEmCurso');
  const cliqueRevisaoApi = executarSandbox('clique-real-analise-calendario-v65.js',
    `let usuarioAtual='Amanda';let __erroCalendariosCompartilhado=null;let scrolls=0;\n`+
    `const linha={slug:'bluefit',mesKey:'2026-09',nome:'Bluefit',mes:'Setembro 2026',itens:2,refs:1,por:'Gabrielle',em:'2026-08-13T12:00:00.000Z'};const linhas=[linha,{...linha,slug:'mochi',nome:'Mochi'},{...linha,slug:"cliente-d'ouro",nome:"Cliente d'Ouro"}];\n`+
    `const cal={client:'Bluefit',items:[{mes:'2026-09',name:'Roteiro Bluefit',day:10,fmt:'Reel',desc:'Texto real do roteiro',legenda:'Legenda',ref:'https://example.com/bluefit'}],comments:[]};\n`+
    `const alvo={dataset:{},innerHTML:'',scrollIntoView:()=>{scrolls++;}};const attrs={};const botao={disabled:false,textContent:'📝 Analisar roteiro e comentar',setAttribute:(k,v)=>{attrs[k]=v;}};\n`+
    `const elementos={'analiseCal_bluefit_2026-09':alvo,'btn_analiseCal_bluefit_2026-09':botao};const document={getElementById:id=>elementos[id]||null};\n`+
    `const obterCalendariosCompartilhados=async()=>[];const linhasCalendariosAguardandoRevisao=()=>linhas;const esc=v=>String(v??'');const escAttr=esc;const escJs=v=>String(v??'').replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'");\n`+
    `let falharLeitura=false;const db={};const doc=(...p)=>p.join('/');const getDoc=async()=>({exists:()=>!falharLeitura,data:()=>cal});const itensDoMesCalendario=(c,m)=>(c.items||[]).filter(i=>i.mes===m);function mostrarToast(){}\n`+
    `class URL{constructor(v){this.href=String(v);this.protocol=this.href.startsWith('https:')?'https:':'x:';}}\n`+
    `${htmlFilaRevisao}\n${aberturaRevisao}\n`+
    `globalThis.abrirAnaliseCalendarioRevisao=window.abrirAnaliseCalendarioRevisao;\n`+
    `globalThis.api={gerar:window.htmlCalendariosParaRevisar,alvo,botao,attrs,scrolls:()=>scrolls,setFalha:v=>{falharLeitura=v;},clicar:codigo=>Function('abrirAnaliseCalendarioRevisao',codigo).call(botao,window.abrirAnaliseCalendarioRevisao)};`);
  const filaRenderizada = await cliqueRevisaoApi.gerar();
  const botaoMatch = filaRenderizada.match(/<button[^>]+id="btn_analiseCal_bluefit_2026-09"[^>]+onclick="([^"]+)"[^>]*>/);
  exigir(!!botaoMatch && botaoMatch[1].includes('this') && botaoMatch[1].includes("'bluefit','2026-09'"),
    'botão renderizado da Bluefit perdeu handler, mês correto ou referência ao próprio controle');
  exigir(filaRenderizada.includes('btn_analiseCal_mochi_2026-09') &&
    filaRenderizada.includes("abrirAnaliseCalendarioRevisao('cliente-d\\'ouro','2026-09',this)"),
    'Mochi ou identidade com apóstrofo gerou alvo/onclick inválido na fila da Amanda');
  exigir(filaRenderizada.indexOf('btn_analiseCal_bluefit_2026-09') < filaRenderizada.indexOf('analiseCal_bluefit_2026-09') &&
    filaRenderizada.indexOf('analiseCal_bluefit_2026-09') < filaRenderizada.indexOf('↗ Abrir calendário completo'),
    'painel da análise voltou a nascer depois das decisões, fora do campo visível no mobile');
  exigir(await cliqueRevisaoApi.clicar(botaoMatch[1]) === true &&
    cliqueRevisaoApi.alvo.innerHTML.includes('Texto real do roteiro') &&
    cliqueRevisaoApi.attrs['aria-expanded'] === 'true' &&
    cliqueRevisaoApi.botao.textContent.includes('Fechar análise') && cliqueRevisaoApi.scrolls() >= 2,
    'clique do botão HTML não abriu/expôs a análise real da Bluefit no campo visível');
  exigir(await cliqueRevisaoApi.clicar(botaoMatch[1]) === true &&
    cliqueRevisaoApi.alvo.innerHTML === '' && cliqueRevisaoApi.attrs['aria-expanded'] === 'false' &&
    cliqueRevisaoApi.botao.textContent.includes('Analisar roteiro'),
    'segundo clique não fechou a análise nem restaurou o botão');
  cliqueRevisaoApi.setFalha(true);
  exigir(await cliqueRevisaoApi.clicar(botaoMatch[1]) === false &&
    cliqueRevisaoApi.alvo.innerHTML.includes('Não consegui carregar a análise') &&
    cliqueRevisaoApi.attrs['aria-expanded'] === 'true' &&
    cliqueRevisaoApi.botao.textContent.includes('Tentar abrir análise novamente'),
    'erro de leitura voltou a parecer clique morto, fila vazia ou calendário apagado');
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

  const travaEdicaoCalendario = trecho(calendario,
    'function edicaoBloqueadaPorRevisao()',
    'function atualizarTravaVisualDoMes()');
  const travaApi = executarSandbox('trava-calendario-enviado-sandbox.js',
    `let status='rascunho',ultimoAviso='',mesVisivel='2026-09';window.__modoCal='equipe';function estadoAprovacao(){return status;}function mesEhCompetenciaOperacional(){return true;}function avisarTela(m){ultimoAviso=m;}\n` +
    `${travaEdicaoCalendario}\n` +
    `globalThis.api={travada:edicaoBloqueadaPorRevisao,exigir:exigirRetiradaAntesDeEditar,status:v=>{status=v;},modo:v=>{window.__modoCal=v;},aviso:()=>ultimoAviso};`);
  travaApi.status('rascunho');
  exigir(travaApi.travada() === false, 'rascunho deixou de ser editável pela equipe');
  travaApi.status('aprovado_interno');
  exigir(travaApi.travada() === true, 'aprovação interna deixou de travar edição direta');
  travaApi.status('liberado');
  exigir(travaApi.travada() === true && travaApi.exigir() === true && travaApi.aviso().includes('já foi enviado ao cliente'),
    'calendário liberado continuou editável ou sem aviso específico');
  travaApi.modo('cliente');
  exigir(travaApi.travada() === false, 'trava visual da equipe vazou para o modo cliente');

  const reaberturaCalendario = trecho(calendario,
    'window.retirarDaAprovacaoInterna = async function',
    '/* Esconde da visão do cliente');
  const reaberturaApi = executarSandbox('reabrir-calendario-antes-envio-sandbox.js',
    `let data={month:'Agosto 2026',items:[{itemId:'item-1',mes:'2026-08',name:'Roteiro preservado'}],aprovacaoMeses:{'2026-08':{status:'aprovado_interno',mes:'2026-08'}},aprovacaoInterna:{status:'aprovado_interno',mes:'2026-08'}};\n` +
    `let mesVisivel='2026-08',servidor=JSON.parse(JSON.stringify(data)),patch=null,mergeOpt=null,avisos=[],transacoes=0,ultimaAssinaturaSalva='',temNaoSalvo=false,bloqueadoPorConflito=false;\n` +
    `window.__modoCal='equipe';window.__enviandoAprovacaoInterna=false;window.__fb={db:{},docRef:{path:'calendarios/cliente-x'},runTransaction:async(db,fn)=>{transacoes++;return fn({get:async()=>({exists:()=>true,data:()=>servidor}),set:(ref,p,o)=>{patch=p;mergeOpt=o;servidor={...servidor,...p};}});}};\n` +
    `function estadoAprovacao(){return data.aprovacaoMeses['2026-08'].status;}function mesDoTexto(){return '2026-08';}function assinaturaCalendario(v){return JSON.stringify(v);}\n` +
    `function confirm(){return true;}function prompt(){return 'Gabrielle';}function avisarTela(m,t){avisos.push({m,t});}function renderAprovacaoInterna(){}function limparRascunho(){}function limparEnvioPendente(){}function closeModal(){}function renderGrid(){}function renderWeek(){}function renderKanban(){}function renderProgress(){}function renderMeta(){}function renderSeletorMes(){}function renderBlocos(){}function pintarEstado(){}\n` +
    `${reaberturaCalendario}\n` +
    `globalThis.api={reabrir:window.retirarDaAprovacaoInterna,patch:()=>patch,merge:()=>mergeOpt,avisos:()=>avisos,transacoes:()=>transacoes,data,cenario:(local,remoto)=>{data.aprovacaoMeses['2026-08']={status:local,mes:'2026-08'};data.aprovacaoInterna={status:local,mes:'2026-08'};servidor={month:data.month,items:JSON.parse(JSON.stringify(data.items)),aprovacaoMeses:{'2026-08':{status:remoto,mes:'2026-08'}},aprovacaoInterna:{status:remoto,mes:'2026-08'}};patch=null;mergeOpt=null;avisos=[];window.__enviandoAprovacaoInterna=false;}};`);
  const botaoReabrir = {disabled:false,textContent:'',isConnected:true};
  await reaberturaApi.reabrir(botaoReabrir);
  const patchReabertura = reaberturaApi.patch() || {};
  exigir(reaberturaApi.transacoes() === 1 && reaberturaApi.merge()?.merge === true,
    'reabertura do calendário não ocorreu em uma única transação com merge');
  exigir(Object.keys(patchReabertura).sort().join(',') === 'aprovacaoInterna,aprovacaoMeses,updatedAt' &&
    patchReabertura.aprovacaoMeses['2026-08'].status === 'rascunho' &&
    patchReabertura.aprovacaoMeses['2026-08'].retiradoDe === 'aprovado_interno' &&
    patchReabertura.aprovacaoMeses['2026-08'].exigeNovaAprovacao === true &&
    reaberturaApi.data.items[0].name === 'Roteiro preservado',
    'reabrertura pré-envio alterou pauta, perdeu histórico ou não exigiu nova aprovação');
  reaberturaApi.cenario('aprovado_interno','liberado');
  await reaberturaApi.reabrir(botaoReabrir);
  exigir(reaberturaApi.patch() === null &&
    reaberturaApi.data.aprovacaoMeses['2026-08'].status === 'aprovado_interno' &&
    reaberturaApi.avisos().some(a=>a.m.includes('já enviou este mês ao cliente')),
    'corrida com envio da Amanda reabriu ou alterou calendário já liberado');
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
  const vitalParcialmenteEnriquecida = {...agDivina,mesCalendario:'2026-08',sessaoOrdem:1,sessaoChave:'vital-seg|2026-08|S01'};
  exigir(api.sessaoLegadaSemVinculo(agDivina) === true &&
    api.sessaoLegadaSemVinculo(vitalParcialmenteEnriquecida) === true &&
    api.sessaoLegadaSemVinculo({...vitalParcialmenteEnriquecida,sessaoPlanejamentoVersao:1,sessaoItensPlanejados:[]}) === false,
    'compatibilidade não cobre o legado parcialmente enriquecido ou vazou para sessões modernas');
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
  const declaradoVital = materiais.prepararMateriaisDeclaradosSessao([], 'Conteúdo institucional\nBastidores', vitalParcialmenteEnriquecida, 'Luís');
  exigir(declaradoVital.ok && declaradoVital.videos.length === 2 && declaradoVital.videos.every(v=>v.vinculoSessao==='declarado_legado' && v.calendarItemId===null),
    'Vital Seg parcialmente enriquecida continuou sem porta segura de envio');
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
  exigir(videosSub.includes("qual==='lancar' && podeLancarVideo(usuarioAtual)") &&
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
  const marcadorFinalExistente=trecho(saida,'const baseFinal=','if(!snapFinal?.exists())');
  exigir(saida.includes('saidaProgramadaPara:dataSaida') && saida.includes('clienteInativo:imediata') &&
    saida.includes('ativoAte:limiteAcesso') && saida.includes('statusSaida:imediata') && saida.includes('fichaSnapshot') &&
    saida.includes('ultimaCompetenciaPagamento') && saida.includes('analisarPagamentosParaSaida') &&
    saida.includes('pagosPosteriores.length') && saida.includes("status:'cancelado',canceladoPorSaida:true") &&
    saida.includes('ultimaCompetenciaDoContrato:true') && !marcadorFinalExistente.includes('valorDevido'),
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
    centralClientes.includes('Object.entries(contratos).forEach') && centralClientes.includes('contratoAtivo') &&
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
  const tokensCalendario = trecho(escritorio, 'async function garantirTokensDoCliente', 'function copiarTextoLegado');
  exigir(acessoCentral.includes('window.garantirPortalClienteCentral=async function') &&
    acessoCentral.includes("garantirTokensDoCliente(canonico,'cliente')") &&
    tokensCalendario.includes("const ref=doc(db,'clientes_acesso',slug)") &&
    tokensCalendario.includes("collection(db,'clientes_portal_tokens')") &&
    tokensCalendario.includes('await runTransaction(db,async tx=>') &&
    tokensCalendario.includes('tokensAtivos.size>1') &&
    tokensCalendario.includes('reciboConfirmado:true'),
    'recuperação do Portal não preserva/adota a autorização legada com recibo canônico');
  const reativacaoArquivado = trecho(escritorio, 'window.cancelarProgramacaoSaidaCentral=async function', 'async function efetivarSaidasProgramadas');
  exigir(escritorio.includes('Reativar esta ficha e recuperar Portal') &&
    reativacaoArquivado.includes('reativarEfetiva') &&
    reativacaoArquivado.includes("status:'ativo',encerrado:false,excluido:false,ativo:true") &&
    reativacaoArquivado.includes('status:statusRestaurado') &&
    reativacaoArquivado.includes('ultimaCompetenciaPagamento:deleteField()') &&
    /statusSaida:'cancelada'[\s\S]*?excluido:true/.test(reativacaoArquivado) &&
    reativacaoArquivado.includes('await window.garantirPortalClienteCentral(slug)') &&
    !reativacaoArquivado.includes('deleteDoc('),
    'arquivo de clientes não reativa mensalista e Portal preservando o histórico');
  exigir(reativacaoArquivado.includes('nomeClienteCanonico(slug') &&
    reativacaoArquivado.includes('clienteNome:nomeReativado') &&
    reativacaoArquivado.includes("tx.set(doc(db,'clientes_config',slug),{nome:nomeReativado") &&
    reativacaoArquivado.includes('nome:ref.path===credencialRestaurada.acessoPath?nomeReativado:(snap.data().nome||nomeReativado)') &&
    !reativacaoArquivado.includes('nome:saida.nome'),
    'reativação deixou de fixar o nome canônico na ficha/credencial escolhida ou passou a sobrescrever aliases com nome legado');
  exigir(reativacaoArquivado.includes('normalizarDadosReativacaoMensalista(dadosReativacao)') &&
    reativacaoArquivado.includes('valorProgramadoEm:reativacao.primeiraCompetencia') &&
    reativacaoArquivado.includes("origem:'reativacao'") &&
    reativacaoArquivado.includes('origemAindaArquivada') &&
    escritorio.includes('Conferir valor e ativar'),
    'entrada/reativação mensalista pode voltar a ignorar valor, competência ou recibo do arquivo');
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

function testarCofreCeciliaSandbox() {
  const regras = fs.readFileSync(path.join(raiz, 'firestore.rules'), 'utf8');
  const blocoRegra = trecho(regras, 'match /cofre_senhas/{docId}', 'match /receitas_avulsas/{docId}');
  exigir(blocoRegra.includes('allow read: if ehGerencia() || ehCecilia();') &&
    blocoRegra.includes('allow create, update: if ehGerencia();') &&
    blocoRegra.includes('allow delete: if false;'),
    'Cecília perdeu a leitura do cofre ou recebeu permissão de escrita/exclusão');

  const isolamento = trecho(escritorio, 'const __sidebarExclusivos', 'function esc(s)');
  exigir(isolamento.includes("'navCofreCecilia','view-cofreCecilia'") &&
    isolamento.includes("definirItemExclusivoNoDOM('navCofreCecilia',usuarioAtual==='Cecília')") &&
    isolamento.includes("definirItemExclusivoNoDOM('view-cofreCecilia',usuarioAtual==='Cecília')"),
    'menu/view do cofre operacional voltou a permanecer no DOM de outros papéis');

  const navegacao = trecho(escritorio, 'window.irPara = function(nome, el)', 'function renderAvisoInicio');
  exigir(navegacao.includes("if(nome === 'cofreCecilia' && usuarioAtual!=='Cecília')") &&
    navegacao.includes("if(nome === 'cofreCecilia') renderCofreCecilia();"),
    'porta do cofre da Cecília confia apenas no menu ou não renderiza a tela autorizada');

  const leitura = trecho(escritorio, 'async function renderCofreCecilia', 'window.excluirSenhaCofre');
  exigir(leitura.includes("if(usuarioAtual!=='Cecília')") &&
    leitura.includes('carregarRegistrosCofre()') &&
    leitura.includes('revelarSenhaCofreCecilia') &&
    leitura.includes('Cofre indisponível') &&
    !leitura.includes('salvarSenhaCofre(') && !leitura.includes('excluirSenhaCofre('),
    'tela operacional da Cecília ganhou escrita ou voltou a transformar erro em lista vazia');

  const escrita = trecho(escritorio, 'window.salvarSenhaCofre', 'async function revelarSenhaCofreNoAlvo');
  const exclusao = trecho(escritorio, 'window.excluirSenhaCofre', '// ===== CALENDARIOS ENVIADOS');
  exigir(escrita.includes("!['Chris','Amanda'].includes(usuarioAtual)") &&
    exclusao.includes("!['Chris','Amanda'].includes(usuarioAtual)"),
    'handlers de escrita do cofre não possuem guarda própria de Gerência');
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
    `let usuarioAtual='Amanda';const chamadas=[];const avisos=[];const db={};\n`+
    `function slugClienteCanonico(s){return {'master-chefe':'master-chef','master-chef-pizzaria':'master-chef'}[s]||s;}\n`+
    `function nomeClienteCanonico(s,n){return slugClienteCanonico(s)==='master-chef'?'Master Chef':n;}\n`+
    `function doc(b,c,id){return {path:c+'/'+id};}function serverTimestamp(){return 'SERVIDOR';}\n`+
    `async function getDoc(){return {exists:()=>false,data:()=>({})};}\n`+
    `async function garantirTokensDoCliente(slug,tipo){chamadas.push({slug,tipo});return {token:'token-legado-preservado',adotouLegado:false,reciboConfirmado:true};}\n`+
    `function mostrarToast(m,t){avisos.push({m,t});}\n`+
    `window.__entradaClientesAtivos={'master-chef':{slug:'master-chef',nome:'Master Chef',tipo:'mensalista',token:''}};\n`+
    `window.renderCentralEntradaClientes=async()=>true;\n${recuperarPortalFonte}\n`+
    `globalThis.api={recuperar:window.garantirPortalClienteCentral,chamadas,avisos,ativos:window.__entradaClientesAtivos};`);
  await portalApi.recuperar('master-chefe');
  exigir(portalApi.chamadas.length===1 &&
    portalApi.chamadas[0].slug==='master-chef' &&
    portalApi.chamadas[0].tipo==='cliente' &&
    portalApi.ativos['master-chef'].token==='token-legado-preservado',
    'recuperação do Portal de Master Chef não delegou a adoção transacional na identidade canônica');
}

async function testarIdentidadeClienteSandbox() {
  const identidadeFonte = trecho(escritorio, 'const APELIDOS_DE_CONTRATO', '  function dataOperacionalISO');
  const banco = new Map();
  const colecoes = new Map([
    ['clientes_extras', []], ['cadastros_clientes', []], ['clientes_encerrados', []]
  ]);
  const contexto = vm.createContext({ Date, console, window: {}, setTimeout, clearTimeout, __banco:banco, __colecoes:colecoes });
  new vm.Script(
    `let usuarioAtual='Amanda';const db={};const banco=globalThis.__banco;const colecoes=globalThis.__colecoes;\n`+
    `function doc(_db,col,id){return {path:col+'/'+id,col,id};}function collection(_db,col){return {col};}\n`+
    `async function getDoc(ref){const v=banco.get(ref.path);return {exists:()=>v!==undefined,data:()=>v};}\n`+
    `async function getDocs(ref){if(globalThis.__falharLeitura)throw new Error('sem leitura');const itens=colecoes.get(ref.col)||[];return {docs:itens.map(v=>({id:v.id,data:()=>v.dados}))};}\n`+
    `function clienteInativoEfetivo(v){return v.clienteInativo===true;}\n`+
    `${identidadeFonte}\n`+
    `globalThis.api={diagnosticar:diagnosticarIdentidadeCliente,mensagem:mensagemIdentidadeClienteExistente,nome:nomeClienteCanonico,slug:slugClienteCanonico,mapa:mapaCalendariosPorIdentidade,consolidar:consolidarClientesAtivosPorIdentidade};`,
    {filename:'identidade-cliente-sandbox.js'}
  ).runInContext(contexto);
  const api=contexto.api;
  exigir(api.slug('zeiss')==='zeiss'&&api.slug('zeens')==='zeiss'&&api.slug('otica-visao-araucaria')==='zeiss',
    'identidade operacional da Zeiss voltou a apontar para o cadastro financeiro legado');
  banco.set('contratos_cliente/zeens',{clienteNome:'Zeens',status:'ativo'});
  const zeissLegada=await api.diagnosticar('Zeiss');
  exigir(zeissLegada.slug==='zeiss'&&zeissLegada.ativo&&zeissLegada.fontes.some(v=>v.fonte==='contrato'),
    'barreira de duplicidade não encontra o contrato legado Zeens ao conferir Zeiss');
  const mapaLegado=api.mapa({forEach(fn){
    fn({id:'zeiss',data:()=>({items:[]})});
    fn({id:'zeens',data:()=>({items:[{name:'Roteiro preservado'}]})});
  }});
  exigir(mapaLegado.zeiss?.__documentoId==='zeens'&&mapaLegado.zeiss.items.length===1,
    'calendário legado preenchido ficou escondido por documento canônico vazio');
  const mapaCanonico=api.mapa({forEach(fn){
    fn({id:'zeiss',data:()=>({items:[{name:'Atual'}]})});
    fn({id:'zeens',data:()=>({items:[{name:'Antigo 1'},{name:'Antigo 2'}]})});
  }});
  exigir(mapaCanonico.zeiss?.__documentoId==='zeiss'&&mapaCanonico.zeiss.items[0].name==='Atual',
    'alias legado voltou a substituir um calendário canônico preenchido');
  const ativosConsolidados=api.consolidar([
    {slug:'zeens',nome:'Zeens',origem:'legado',valorMensal:1700,token:'token-legado'},
    {slug:'otica-visao-araucaria',nome:'Ótica Visão',origem:'legado'},
    {slug:'zeiss',nome:'Zeiss',cadastroId:'ficha-oficial',valorMensal:1700},
    {slug:'bluefit',nome:'Bluefit',cadastroId:'bluefit-oficial'}
  ]);
  exigir(ativosConsolidados.length===2&&ativosConsolidados.filter(v=>v.slug==='zeiss').length===1&&
    ativosConsolidados.find(v=>v.slug==='zeiss')?.nome==='Zeiss'&&
    ativosConsolidados.find(v=>v.slug==='zeiss')?.cadastroId==='ficha-oficial'&&
    ativosConsolidados.find(v=>v.slug==='zeiss')?.token==='token-legado',
    'Central voltou a renderizar aliases Zeiss como clientes ativos distintos ou perdeu campos preservados');
  banco.clear();
  banco.set('contratos_cliente/master-chef',{clienteNome:'Master Chef',status:'ativo'});
  const ativa=await api.diagnosticar('Master Chefe');
  exigir(ativa.slug==='master-chef'&&ativa.ativo&&ativa.fontes.some(v=>v.fonte==='contrato'),
    'alias de Master Chef não foi bloqueado pela identidade canônica ativa');
  banco.clear();
  colecoes.set('clientes_encerrados',[{id:'saida-1',dados:{slug:'master-chef',nome:'Master Chef',excluido:false}}]);
  const arquivada=await api.diagnosticar('Master Chef Pizzaria');
  exigir(arquivada.slug==='master-chef'&&arquivada.arquivado&&!arquivada.ativo&&api.mensagem(arquivada).includes('Reativar cliente'),
    'cliente arquivado poderia ser recadastrado em vez de reativado');
  contexto.__falharLeitura=true;
  let falhouFechado=false;
  try{ await api.diagnosticar('Cliente Novo'); }catch(e){ falhouFechado=String(e.message).includes('sem leitura'); }
  exigir(falhouFechado,'falha de leitura ainda poderia ser interpretada como identidade livre');

  exigir(api.nome('master-chef-pizzaria','Master chef pizzaria')==='Master Chef' &&
    api.nome('master-chef','Master chef pizzaria')==='Master Chef',
    'nome legado voltou a aparecer no Portal depois da canonicalização do slug');
  const arquivoFonte=trecho(escritorio, 'const htmlArquivado=v=>', 'box.innerHTML=', escritorio.indexOf('const htmlArquivado=v=>'));
  exigir(arquivoFonte.includes('aliasOuFusao')&&arquivoFonte.includes('!aliasOuFusao'),
    'registro arquivado de alias/unificação voltou a oferecer reativação');
}

async function testarV54Sandbox() {
  const progressoFonte=trecho(escritorio,'function progressoEditorialCalendario','  const MESES_CAL');
  const progressoApi=executarSandbox('progresso-editorial-v53.js',`${progressoFonte}\nglobalThis.api={progressoEditorialCalendario};`);
  const progresso=progressoApi.progressoEditorialCalendario([
    {desc:'Roteiro',legenda:'Legenda',ref:'https://ref'},
    {desc:'',legenda:'',ref:''},
    {desc:'Não contar',legenda:'Não contar',ref:'x',excluido:true}
  ]);
  exigir(progresso.total===2&&progresso.roteiros===1&&progresso.legendas===1&&progresso.referencias===1,
    'progresso editorial voltou a contar item em soft-delete ou inflar roteiros');

  const detectarFonte=trecho(escritorio,'window.detectarCampanhas = function','  function montarPipelineCampanhas');
  const detectarApi=executarSandbox('campanhas-datas-v53.js',
    `const PALAVRAS_CAMPANHA=['campanha'];function mesDoItemCalendario(cal,it){return it.mes||'';}function mesDoTextoConf(){return '';}function dataLocal(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}${detectarFonte}\nglobalThis.api={detectar:window.detectarCampanhas};`);
  const detectadas=detectarApi.detectar([{id:'cliente',client:'Cliente',items:[
    {name:'Campanha A',mes:'2026-08',day:17,dataPostagem:'2026-08-18'},
    {name:'Campanha B',mes:'2026-08',day:22},
    {name:'Campanha inválida',mes:'2026-02',day:31},
    {name:'Campanha arquivada',mes:'2026-08',day:5,excluido:true}
  ]}]);
  exigir(detectadas.length===3&&detectadas[0].dataCampanha==='2026-08-18'&&detectadas[1].dataCampanha==='2026-08-22'&&detectadas[2].dataCampanha==='',
    'campanha detectada perdeu dataPostagem, derivou data inválida ou voltou a contar arquivada');

  const demandaFonte=trecho(escritorio,'function demandaOperacionalVisivel','  window.demandaOperacionalVisivel');
  const demandaApi=executarSandbox('demandas-canceladas-v53.js',
    `let usuarioAtual='Cecília';function demandaDeExtraJaResolvida(){return false;}function hojeLocal(){return '2026-08-11';}${demandaFonte}\nglobalThis.api={visivel:demandaOperacionalVisivel};`);
  exigir(!demandaApi.visivel({status:'cancelada'})&&!demandaApi.visivel({status:'cancelada_video_trafego'})&&demandaApi.visivel({status:'pendente'}),
    'demanda cancelada voltou a aparecer como trabalho operacional');

  const choqueFonte=trecho(escritorio,'function dataFixaDoItemCalendario','  function precisaGravarAinda');
  const choqueApi=executarSandbox('datas-fixas-v54.js',`${choqueFonte}\nglobalThis.api={dataFixaDoItemCalendario,itensDaDataFixa};`);
  exigir(choqueApi.dataFixaDoItemCalendario({day:17,mes:'2026-08'})==='' &&
    choqueApi.dataFixaDoItemCalendario({day:17,dataPostagem:'2026-08-17'})==='2026-08-17' &&
    choqueApi.dataFixaDoItemCalendario({dataPostagem:'2026-08-17',dataFlexivel:true})==='' &&
    choqueApi.dataFixaDoItemCalendario({dataPostagem:'2026-02-31'})==='' &&
    choqueApi.dataFixaDoItemCalendario({dataPostagem:'2026-08-17',excluido:true})==='',
    'grade, data flexível, data inválida ou item arquivado voltou a gerar conflito para a Cecília');
  const itens=[
    {name:'Campanha A',day:17,dataPostagem:'2026-08-17'},
    {name:'Conteúdo comum',day:17},
    {name:'Campanha B',day:22,dataPostagem:'2026-08-17'},
    {name:'Campanha flexível',day:17,dataPostagem:'2026-08-17',dataFlexivel:true}
  ];
  exigir(choqueApi.itensDaDataFixa(itens,'2026-08-17').length===2,
    'conflito de campanha voltou a contar conteúdo comum ou flexível da mesma posição editorial');
  const varreduraFonte=trecho(escritorio,'window.varrerChoquesDeData = async function','/* ===== ALERTAS DE GARGALO');
  exigir(varreduraFonte.includes("status:'cancelado_automaticamente'")&&varreduraFonte.includes('excluido:true')&&
    varreduraFonte.includes("excluidoPor:'sistema_regra_data_fixa'")&&!varreduraFonte.includes('deleteDoc('),
    'limpeza de alertas antigos perdeu soft-delete ou introduziu exclusão física');

  const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
  const regras=fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8');
  const storiesPortal=trecho(portal,'async function carregarStories','  /* ===== SUA PROPOSTA');
  exigir(storiesPortal.includes("clienteAtual.slug+'_'+semana")&&storiesPortal.includes("revisaoInterna==='liberado'")&&storiesPortal.includes('liberadoCliente===true'),
    'Portal voltou a listar ou mostrar links de Stories sem liberação explícita');
  exigir(regras.includes('resource.data.cliente == clienteDaSessao()')&&regras.includes('resource.data.liberadoCliente == true'),
    'Firestore voltou a permitir Stories de outro cliente ou ainda não liberados');
  const cadastroStories=trecho(escritorio,'window.carregarClientesDeStory = async function','window.salvarClienteDeStory');
  exigir(cadastroStories.includes("getDocs(collection(db,'stories_clientes'))") &&
    cadastroStories.includes('c.ativo !== false') && cadastroStories.includes('!saidaClienteJaEfetiva(c)') &&
    !cadastroStories.includes('STORY_CLIENTES_SEED') &&
    !cadastroStories.includes('await setDoc('),
    'abrir Stories voltou a depender de seed paralelo, escrita automática ou registro inativo');
  const storiesDiariosFonte=trecho(escritorio,'async function renderStoriesDiarios','  window.toggleStoryDiario');
  const cobrancaStoriesFonte=trecho(escritorio,'async function cobrarStoriesDaSemana','  async function lembrarExtrasDosFilmmakers');
  const saidaEfetivaStoriesFonte=trecho(escritorio,'function dataOperacionalISO','  function clienteInativoEfetivo');
  exigir(!escritorio.includes('CLIENTES_COM_STORY')&&!escritorio.includes('STORIES_CLIENTES_PADRAO')&&
    !escritorio.includes("collection(db,'stories_diarios_config')")&&
    storiesDiariosFonte.includes('Nenhum cliente ativo de Stories')&&
    !storiesDiariosFonte.includes('addDoc(')&&!storiesDiariosFonte.includes('setDoc(')&&
    cobrancaStoriesFonte.includes('const slugsStory = registrados.map(c => c.slug)')&&
    !cobrancaStoriesFonte.includes('registrados.length ?'),
    'Stories voltou a reativar contrato por seed, segunda coleção ou escrita durante leitura');
  const clientesStoriesApi=executarSandbox('stories-clientes-ativos-v67.js',
    `let __storyClientesCache=null,documentos=[],falhar=false;const db={};function collection(){return {};}`+
    `async function getDocs(){if(falhar)throw new Error('leitura indisponível');return {forEach:fn=>documentos.forEach((v,i)=>fn({id:v.slug||String(i),data:()=>v}))};}`+
    `function hojeLocal(){return '2026-08-18';}${saidaEfetivaStoriesFonte}${cadastroStories}\nglobalThis.api={listar:window.carregarClientesDeStory,definir:v=>{documentos=v;falhar=false;__storyClientesCache=null;},indisponivel:()=>{falhar=true;__storyClientesCache=null;}};`);
  clientesStoriesApi.definir([{slug:'juliane-nerone',nome:'Juliane',ativo:false},{slug:'vitalle-odonto',nome:'Vitalle',ativo:true}]);
  const apenasAtivos=await clientesStoriesApi.listar(true);
  exigir(apenasAtivos.length===1&&apenasAtivos[0].slug==='vitalle-odonto',
    'documento inativo de Stories voltou ao seletor operacional da Gabi');
  clientesStoriesApi.definir([{slug:'juliane-nerone',nome:'Juliane',ativo:false}]);
  exigir((await clientesStoriesApi.listar(true)).length===0,
    'zero clientes ativos voltou a ser preenchido por seed silencioso');
  clientesStoriesApi.indisponivel();
  let leituraStoriesFalhou=false;
  try{await clientesStoriesApi.listar(true);}catch(e){leituraStoriesFalhou=String(e.message).includes('indisponível');}
  exigir(leituraStoriesFalhou,'falha de leitura de Stories voltou a ser convertida em lista vazia');
  const estadoStoriesFonte=trecho(escritorio,'function estadoCadeiaStoriesCliente','window.estadoCadeiaStoriesCliente');
  const semanaStoriesFonte=trecho(escritorio,'function semanaStoryDerivadaDoTexto','  window.validarSemanaDoRoteiroStory=validarSemanaDoRoteiroStory;');
  const estadoStoriesApi=executarSandbox('stories-cadeia-v60.js',
    `function dataLocal(d){const dt=new Date(d);return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');}`+
    `function segundaDaSemana(d){const data=new Date(d);const dow=data.getDay(),recuo=dow===0?6:dow-1;data.setDate(data.getDate()-recuo);return dataLocal(data);}`+
    `${semanaStoriesFonte}${estadoStoriesFonte}\nglobalThis.api={estadoCadeiaStoriesCliente};`);
  exigir(estadoStoriesApi.estadoCadeiaStoriesCliente('vitalle-odonto','2026-08-10',[],null).codigo==='nao_criado' &&
    estadoStoriesApi.estadoCadeiaStoriesCliente('vitalle-odonto','2026-08-10',[{cliente:'vitalle-odonto',semana:'2026-08-10',revisaoInterna:'aguardando_interna'}],null).codigo==='aguardando_amanda' &&
    estadoStoriesApi.estadoCadeiaStoriesCliente('vitalle-odonto','2026-08-10',[{cliente:'vitalle-odonto',semana:'2026-08-10',revisaoInterna:'liberado'}],null).codigo==='liberado_portal' &&
    estadoStoriesApi.estadoCadeiaStoriesCliente('outro','2026-08-10',[{cliente:'vitalle-odonto',semana:'2026-08-10',revisaoInterna:'liberado'}],null).codigo==='nao_criado',
    'cadeia de Stories voltou a confundir cliente cadastrado, semana errada, revisão da Amanda e liberação no Portal');
  exigir(escritorio.includes('data-story-cadeia-cliente=')&&escritorio.includes('data-story-cadeia-estado=')&&
    portal.includes('data-stories-estado="aguardando-equipe"'),
    'estado ponta a ponta de Stories deixou de ficar explícito para equipe ou cliente');
  const escopoPortalFonte=trecho(portal,'function nomeLegivelPortal','function aplicarEscopoPortal');
  const escopoPortalApi=executarSandbox('portal-escopo-v61.js',
    `const CLIENTES_SO_EDICAO=['rodrigo'];\n${escopoPortalFonte}\nglobalThis.api={nomeLegivelPortal,escopoPortalDaFicha};`);
  exigir(escopoPortalApi.nomeLegivelPortal('vitalle-odonto','')==='Vitalle Odonto' &&
    escopoPortalApi.escopoPortalDaFicha('vitalle-odonto',{nome:'slug antigo'},{nome:'Vitalle Odonto',incluiStories:true},false).nome==='Vitalle Odonto',
    'Portal voltou a exibir slug técnico quando a ficha privada tem identidade legível');
  exigir(escopoPortalApi.escopoPortalDaFicha('bluefit',{nome:'Bluefit'},{incluiStories:false},true).incluiStories===false &&
    escopoPortalApi.escopoPortalDaFicha('legado',{nome:'Legado'},{},true).incluiStories===true &&
    escopoPortalApi.escopoPortalDaFicha('legado',{nome:'Legado'},{},false).incluiStories===false &&
    escopoPortalApi.escopoPortalDaFicha('rodrigo',{nome:'Rodrigo'},{incluiStories:true},true).incluiStories===false,
    'escopo do Portal voltou a liberar Stories por ausência de regra, contrariar false explícito ou expor plano só edição');
  const entradaPortal=trecho(portal,"window.entrarPortal = function",'window.sairPortal');
  exigir(entradaPortal.includes('aplicarEscopoPortal()')&&entradaPortal.includes("if(clienteAtual.escopo.incluiStories===true) carregarStories()"),
    'Portal voltou a carregar Stories antes de confirmar que o serviço pertence ao cliente');
  exigir(portal.includes('carregarFichaPortalSegura(slug,dadosAcesso)')&&
    portal.includes("getDoc(doc(db,'cadastros_clientes',id))")&&
    portal.includes("getDoc(doc(db,'contratos_cliente',slug))")&&
    !portal.includes("query(collection(db,'cadastros_clientes')")&&
    portal.includes('escopoPortalDaFicha(slug,dadosAcesso,fichaPortal,temHistoricoStories)'),
    'entrada autenticada deixou de resolver nome e escopo por leitura pontual da ficha/contrato do próprio cliente');
  exigir(escritorio.includes('const canonico=slugClienteCanonico(v.cliente)')&&
    escritorio.includes('if(!tokenPorCliente[canonico] || v.cliente===canonico) tokenPorCliente[canonico]=v;'),
    'Central voltou a indexar tokens por alias bruto e duplicar a identidade canônica do cliente');
  const renderStoriesFonte=trecho(escritorio,'window.renderStoriesCliente = async function','  // guarda onde o painel foi desenhado');
  exigir(renderStoriesFonte.includes('clientesStory.some(c=>c.slug===window.__storyClienteSel)')&&
    renderStoriesFonte.includes("s.cliente === clienteStorySelecionado")&&
    renderStoriesFonte.includes('semanaEfetivaStory(s) === semana'),
    'seleção de Stories voltou a misturar conteúdo semanal de clientes diferentes');
  const avaliacaoPortal=trecho(portal,'async function carregarAvaliacaoCliente','/* ===== PROGRAMADOS');
  const carregarAvaliacaoPortal=trecho(avaliacaoPortal,'async function carregarAvaliacaoCliente','window.salvarAvaliacaoCliente');
  const regraAvaliacao=trecho(regras,'match /avaliacoes_clientes/{docId}','match /demandas_cliente/{docId}');
  exigir(portal.includes('data-tab="avaliacao"')&&avaliacaoPortal.includes("doc(db,'avaliacoes_clientes',idAvaliacaoPortal())")&&
    carregarAvaliacaoPortal.includes("getDocs(query(collection(db,'avaliacoes_clientes'), where('cliente','==',clienteAtual.slug)))")&&
    !carregarAvaliacaoPortal.includes('getDoc(')&&
    avaliacaoPortal.includes("cliente:clienteAtual.slug")&&avaliacaoPortal.includes("origem:'portal_cliente'")&&
    regraAvaliacao.includes('resource.data.cliente == clienteDaSessao()')&&
    regraAvaliacao.includes("affectedKeys().hasOnly(['clienteNome','nota','mes','comentario','origem','atualizadoEm'])")&&
    regraAvaliacao.includes('allow delete: if false;'),
    'primeira avaliação voltou a depender de documento existente ou ampliou leitura/escrita');
}

function testarCentralEditorialCalendariosSandbox(){
  const papelFonte=trecho(escritorio,'function papelPodeControleEditorialCalendarios','  window.papelPodeControleEditorialCalendarios');
  const papelApi=executarSandbox('central-editorial-papeis-v66.js',
    `${papelFonte}\nglobalThis.api={papelPodeControleEditorialCalendarios};`);
  exigir(papelApi.papelPodeControleEditorialCalendarios('Amanda')===true &&
    papelApi.papelPodeControleEditorialCalendarios('Gabrielle')===true &&
    ['Chris','Cecília','Luís','Nathan','Helo','Yas',''].every(p=>papelApi.papelPodeControleEditorialCalendarios(p)===false),
    'Central Editorial deixou de ser exclusiva da Amanda e da Gabi');

  const montagemFonte=trecho(escritorio,'function papelPodeControleEditorialCalendarios','  function instanteControleCalendario');
  const montagemApi=executarSandbox('central-editorial-dom-v66.js',
    `class E{constructor(tag,id=''){this.tagName=tag;this.id=id;this.children=[];this.parentElement=null;this.attrs={};this._classes=new Set();this.classList={add:(...v)=>v.forEach(x=>this._classes.add(x)),remove:(...v)=>v.forEach(x=>this._classes.delete(x)),contains:v=>this._classes.has(v)};this.innerHTML='';}}\n`+
    `E.prototype.appendChild=function(e){e.parentElement=this;this.children.push(e);return e;};\n`+
    `E.prototype.insertBefore=function(e,b){e.parentElement=this;const i=this.children.indexOf(b);if(i<0)this.children.push(e);else this.children.splice(i,0,e);return e;};\n`+
    `E.prototype.remove=function(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;};\n`+
    `E.prototype.setAttribute=function(k,v){this.attrs[k]=v;if(k==='class')String(v).split(/\\s+/).forEach(x=>this._classes.add(x));};\n`+
    `const grupo=new E('div','navgroupDia'),label=new E('div','labelNavDia'),main=new E('main','main'),inicio=new E('div','view-inicio'),navInicio=new E('div','navInicio');grupo.appendChild(label);main.appendChild(inicio);grupo.appendChild(navInicio);\n`+
    `function achar(no,id){if(no.id===id)return no;for(const f of no.children){const r=achar(f,id);if(r)return r;}return null;}\n`+
    `globalThis.document={getElementById:id=>achar(grupo,id)||achar(main,id),createElement:t=>new E(t),querySelector:q=>q==='.main'?main:null};\n`+
    `let usuarioAtual='',viewAtiva='inicio';function mostrarToast(){}function irPara(){}\n`+
    `${montagemFonte}\n`+
    `function estado(p){usuarioAtual=p;montarControleEditorialCalendariosPorPapel();return {nav:!!document.getElementById('navControleEditorialCalendarios'),view:!!document.getElementById('view-controleEditorialCalendarios'),navs:grupo.children.filter(x=>x.id==='navControleEditorialCalendarios').length,views:main.children.filter(x=>x.id==='view-controleEditorialCalendarios').length};}\n`+
    `globalThis.api={estado};`);
  const domAmanda=montagemApi.estado('Amanda'),domGabi=montagemApi.estado('Gabrielle'),domChris=montagemApi.estado('Chris');
  exigir(domAmanda.nav&&domAmanda.view&&domAmanda.navs===1&&domAmanda.views===1&&
    domGabi.nav&&domGabi.view&&domGabi.navs===1&&domGabi.views===1&&
    !domChris.nav&&!domChris.view&&domChris.navs===0&&domChris.views===0,
    'botão/view da Central Editorial duplicou ou permaneceu no DOM de Chris/outro papel');

  const consolidarFonte=trecho(escritorio,'function consolidarMesesControleEditorial','  window.consolidarMesesControleEditorial');
  const consolidarApi=executarSandbox('central-editorial-identidade-v66.js',
    `const aliases={zeens:'zeiss'};\n`+
    `function slugClienteCanonico(v){return aliases[v]||v;}\n`+
    `function nomeDeSlugSeguro(v){return v;}\n`+
    `function mesesDeCalendario(c){return [...new Set((c.items||[]).map(i=>i.mes).filter(Boolean))].sort();}\n`+
    `function itensDoMesCalendario(c,m){return (c.items||[]).filter(i=>i.mes===m);}\n`+
    `function estadoMesCal(c,m){return c.aprovacaoMeses?.[m]?.status||'rascunho';}\n`+
    `function estadoDoCalendario(){return 'liberado';}\n`+
    `function instanteControleCalendario(v){return v?new Date(v).getTime():0;}\n`+
    `${consolidarFonte}\n`+
    `globalThis.api={consolidarMesesControleEditorial};`);
  const doc=(id,dados)=>({id,data:()=>dados});
  const docs=[
    doc('zeiss',{client:'Zeiss',items:[{mes:'2026-09',name:'Setembro canônico'}],aprovacaoMeses:{'2026-09':{status:'aguardando_interna',em:'2026-08-13T10:00:00Z'}}}),
    doc('zeens',{client:'Zeiss antigo',items:[{mes:'2026-07',name:'Julho preservado'},{mes:'2026-09',name:'Setembro alias antigo'}],aprovacaoMeses:{'2026-07':{status:'liberado',em:'2026-07-01T10:00:00Z'},'2026-09':{status:'rascunho',em:'2026-08-12T10:00:00Z'}}}),
    doc('zeiss-arquivado',{client:'Não deve entrar',excluido:true,items:[{mes:'2026-09',name:'Apagado'}]})
  ];
  const consolidado=consolidarApi.consolidarMesesControleEditorial({forEach:fn=>docs.forEach(fn)});
  exigir(Object.keys(consolidado).length===1 && Object.keys(consolidado.zeiss.meses).sort().join(',')==='2026-07,2026-09',
    'Central Editorial perdeu competência histórica, duplicou alias ou incluiu calendário arquivado');
  exigir(consolidado.zeiss.meses['2026-09'].itens.length===1 &&
    consolidado.zeiss.meses['2026-09'].itens[0].name==='Setembro canônico' &&
    consolidado.zeiss.meses['2026-07'].itens[0].name==='Julho preservado',
    'Central Editorial somou aliases no mesmo mês ou escolheu um documento inteiro e perdeu o histórico');

  const renderFonte=trecho(escritorio,'window.renderControleEditorialCalendarios = async function','  /* ===== FRENTE C1 — VISIBILIDADE TOTAL DA SIDEBAR');
  exigir(renderFonte.includes("getDocs(collection(db,'clientes_config'))") &&
    renderFonte.includes("getDocs(collection(db,'clientes_extras'))") &&
    !renderFonte.includes("'contratos_cliente'") && !renderFonte.includes("'pagamentos_mensais'") &&
    renderFonte.includes("htmlFalhaLeituraCalendarios('Não consegui confirmar a Central de Calendários'"),
    'Central Editorial consultou finanças no papel da Gabi ou transformou falha de leitura em lista vazia');

  const filtroFonte=trecho(escritorio,'window.aplicarFiltrosControleEditorialCalendarios = function','  /* ===== FRENTE C1 — VISIBILIDADE TOTAL DA SIDEBAR');
  const filtroApi=executarSandbox('central-editorial-render-v66.js',
    `const els={controleEditorialCalendariosBox:{innerHTML:''},centralCalBusca:{value:''},centralCalMes:{value:'2026-09'},centralCalSituacao:{value:'todos'},centralCalCarteira:{value:'ativos'}};\n`+
    `globalThis.document={getElementById:id=>els[id]||null};let usuarioAtual='Amanda';\n`+
    `function normNomeCliente(v){return String(v||'').toLowerCase();}function competenciaCalendarioAtual(){return '2026-09';}function atualizarBadgeControleEditorial(){}function rotuloCompetenciaControleEditorial(){return 'Setembro de 2026';}function rotuloFaseControleEditorial(f){return f;}function esc(v){return String(v??'');}function escAttr(v){return esc(v);}function escJs(v){return esc(v).replace(/'/g,"\\\\'");}\n`+
    `window.__controleEditorialCalendariosDados={linhas:[{slug:'bluefit',nome:'Bluefit',ativo:true,mes:'2026-09',fase:'revisao',total:1,roteiros:1,legendas:0,referencias:1,itens:[{day:4,name:'Campanha de setembro',fmt:'Reel',desc:'Roteiro',ref:'https://exemplo.test'}]},{slug:'vip-antigo',nome:'VIP histórico',ativo:false,mes:'2026-09',fase:'liberado',total:1,roteiros:1,legendas:1,referencias:1,itens:[{day:8,name:'Título preservado'}]}]};\n`+
    `${filtroFonte}\n`+
    `function render(){window.aplicarFiltrosControleEditorialCalendarios();return els.controleEditorialCalendariosBox.innerHTML;}function carteira(v){els.centralCalCarteira.value=v;return render();}function situacao(v){els.centralCalSituacao.value=v;return render();}globalThis.api={render,carteira,situacao};`);
  const htmlAtivos=filtroApi.render();
  exigir(htmlAtivos.includes('Bluefit')&&htmlAtivos.includes('Campanha de setembro')&&htmlAtivos.includes('1/1')&&!htmlAtivos.includes('VIP histórico'),
    'Central Editorial não exibiu título/progresso real ou misturou arquivo na carteira ativa');
  exigir(filtroApi.carteira('todos').includes('VIP histórico')&&filtroApi.situacao('faltando').includes('Nenhum cliente corresponde'),
    'filtros de carteira/situação não alteraram o conjunto renderizado de forma compreensível');
}

async function testarChecklistViradaStoriesEVideosV69Sandbox(){
  const chaveFonte=trecho(escritorio,'function chaveExecucao','  let checklistExecAtual');
  const chaveApi=executarSandbox('checklist-virada-v69.js',
    `function dataLocal(d){const dt=d?new Date(d):new Date();return new Date(dt.getTime()-dt.getTimezoneOffset()*60000).toISOString().slice(0,10);}\n`+
    `${chaveFonte}\nglobalThis.api={chaveExecucao};`);
  const dia=new Date(2026,7,17,19,0,0),antesMeiaNoite=new Date(2026,7,17,23,59,59),depoisMeiaNoite=new Date(2026,7,18,0,0,0);
  exigir(chaveApi.chaveExecucao('Gabrielle','Diário',dia)==='Gabrielle_diario_2026-08-17' &&
    chaveApi.chaveExecucao('Gabrielle','Diário',antesMeiaNoite)==='Gabrielle_diario_2026-08-17' &&
    chaveApi.chaveExecucao('Gabrielle','Diário',depoisMeiaNoite)==='Gabrielle_diario_2026-08-18',
    'checklist diário ainda troca às 19h ou não cria uma chave nova depois da meia-noite');

  const edicaoChecklist=trecho(escritorio,'let checklistExecAtual','  function contarStreakDiario');
  exigir(edicaoChecklist.includes("if(!checklistChaveAtual || checklistChaveAtual !== chaveAgora)") &&
    edicaoChecklist.includes("throw new Error('CHECKLIST_DIA_MUDOU')") &&
    edicaoChecklist.includes('if(!await garantirChecklistAtualAntesDeEditar()) return false;') &&
    edicaoChecklist.includes('if(!await salvarChecklistProtegendoVirada()) return false;') &&
    edicaoChecklist.includes("new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 0, 150)"),
    'aba aberta pode voltar a gravar o estado antigo no documento do dia novo');

  const resumoFonte=trecho(escritorio,'function pendenciasChecklistDoResumo','  /* Resumo das 19h por e-mail');
  const resumoApi=executarSandbox('checklist-resumo-19h-v69.js',
    `${resumoFonte}\nglobalThis.api={pendenciasChecklistDoResumo,textoPendenciasChecklist};`);
  const pendencias=resumoApi.pendenciasChecklistDoResumo([
    {nome:'Gabrielle',feitos:8,total:10,concluido:false},
    {nome:'Luís',feitos:18,total:18,concluido:true},
    {nome:'Nathan',feitos:0,total:18,concluido:false}
  ]);
  exigir(JSON.stringify(pendencias)===JSON.stringify([{nome:'Gabrielle',abertos:2},{nome:'Nathan',abertos:18}]) &&
    resumoApi.textoPendenciasChecklist(pendencias)==='Gabrielle: 2 em aberto · Nathan: 18 em aberto',
    'aviso das 19h não lista somente quem ficou pendente com a quantidade aberta');
  const envio19h=trecho(escritorio,'async function enviarResumoChecklist19h','  async function renderDemandasAtrasadasDetalhe');
  exigir(!envio19h.includes("'checklist_execucoes'") && envio19h.includes('if(!pendencias.length) return;') &&
    envio19h.includes("titulo: '📋 Pendências dos checklists — ' + resumo"),
    'rotina das 19h voltou a limpar checklist, avisar concluídos ou enviar mensagem sem pendência');

  const historiasFonte=trecho(escritorio,'const DIAS_SEMANA_ORDEM','  async function renderStoriesDiarios');
  const historiasApi=executarSandbox('stories-checklist-diario-v69.js',
    `let falhar=false;const db={};\n`+
    `async function carregarClientesDeStory(){return [{slug:'juliane-nerone',nome:'Juliane',dias:[1,2,3,4,5]},{slug:'vitalle-odonto',nome:'Vitalle',dias:[1]}];}\n`+
    `function doc(_db,_col,id){return {id};}async function getDoc(ref){if(falhar)throw new Error('indisponivel');const feito=ref.id.startsWith('juliane-nerone');return {data:()=>({dias:{segunda:feito}})};}\n`+
    `async function setDoc(){}let usuarioAtual='',checklistPeriodoAtual='',checklistChaveAtual='',checklistExecAtual={itensFeitos:{}};function chaveExecucao(){return '';}function renderChecklist(){}\n`+
    `${historiasFonte}\nglobalThis.api={estadoStoriesPrevistosNoDia,falhar:v=>{falhar=v;}};`);
  const estadoStories=await historiasApi.estadoStoriesPrevistosNoDia(new Date(2026,7,17,12,0,0));
  exigir(estadoStories.total===2 && estadoStories.feitos===1 && estadoStories.abertos===1 && estadoStories.completo===false,
    'item diário da Gabi não deriva corretamente os Stories previstos e confirmados na fonte existente');
  historiasApi.falhar(true);
  let falhouFechado=false;
  try{await historiasApi.estadoStoriesPrevistosNoDia(new Date(2026,7,17,12,0,0));}catch(e){falhouFechado=true;}
  exigir(falhouFechado,'falha ao ler checks de Stories virou zero ou conclusão automática');
  exigir(escritorio.includes("id:'g_d_10'") && escritorio.includes("'g_d_10': { desc:") &&
    escritorio.includes('await sincronizarChecklistStoriesGabrielle(new Date())') &&
    escritorio.includes("{ itensFeitos:{ g_d_10:execucao.itensFeitos.g_d_10 } }") &&
    escritorio.includes("{ itensFeitos:{ g_d_10:deleteField() } }"),
    'Stories não foi ligado ao checklist diário efetivo e à confirmação granular da Gabi');

  const permissaoVideoFonte=trecho(escritorio,'const PESSOAS_QUE_LANCAM_VIDEO','  /* ===== FRENTE C3');
  const permissaoVideoApi=executarSandbox('video-amanda-v69.js',
    `const PESSOAS_DE_CAMPO=['Luís','Nathan'];const CAMPO_MAIS_CHRIS=['Chris',...PESSOAS_DE_CAMPO];let usuarioAtual='';\n`+
    `${permissaoVideoFonte}\nglobalThis.api={podeLancarVideo};`);
  exigir(['Amanda','Chris','Luís','Nathan'].every(p=>permissaoVideoApi.podeLancarVideo(p)) &&
    ['Gabrielle','Cecília','Helo','João Victor','Yas',''].every(p=>!permissaoVideoApi.podeLancarVideo(p)) &&
    !escritorio.includes("const CAMPO_MAIS_CHRIS = ['Chris', 'Amanda'"),
    'Amanda não recebeu a permissão própria ou foi indevidamente promovida a papel de campo');
  const lancamento=trecho(escritorio,'window.lancarVideos = async function','  /* ===== O QUE ENTREGAR, POR DIA');
  exigir(lancamento.indexOf('if(!podeLancarVideo(usuarioAtual))') < lancamento.indexOf("const sel = document.getElementById('videoCliente')") &&
    escritorio.includes("const temLancar = podeLancarVideo(usuarioAtual);") &&
    escritorio.includes("(qual==='lancar' && podeLancarVideo(usuarioAtual))") &&
    escritorio.includes("{ rot:'Subir vídeo de cliente', acao:\"irParaSubirEdicao()\" }") &&
    lancamento.includes("origemMaterial === 'recebido'") && lancamento.includes("soEdicao: origemMaterial === 'recebido'"),
    'Amanda não tem o caminho completo protegido para material recebido ou o fluxo voltou a contar como gravação');
}

function testarIncidentesStoriesCalendarioGravacaoV70Sandbox(){
  const storyFonte=trecho(escritorio,'function semanaStoryDerivadaDoTexto','  window.validarSemanaDoRoteiroStory=validarSemanaDoRoteiroStory;');
  const storyApi=executarSandbox('stories-semana-vitalle-v70.js',
    `function dataLocal(d){const dt=new Date(d);return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');}\n`+
    `function segundaDaSemana(d){const data=new Date(d);const dow=data.getDay(),recuo=dow===0?6:dow-1;data.setDate(data.getDate()-recuo);return dataLocal(data);}\n`+
    `${storyFonte}\nglobalThis.api={semanaStoryDerivadaDoTexto,semanaEfetivaStory,validarSemanaDoRoteiroStory};`);
  const vitalle={semana:'2026-08-10',titulo:'Vitalle — Semana 17 á 22/08',descricao:'17/08 bastidor\n19/08 enquete\n22/08 chamada'};
  exigir(storyApi.semanaEfetivaStory(vitalle)==='2026-08-17',
    'registro real da Vitalle não foi recuperado na semana de 17/08');
  exigir(storyApi.semanaEfetivaStory({semana:'2026-08-10',titulo:'Bastidores',descricao:'Sem datas fechadas'})==='2026-08-10' &&
    storyApi.semanaEfetivaStory({semana:'2026-08-10',titulo:'17/08 e 24/08',descricao:''})==='2026-08-10',
    'compatibilidade de Stories tentou adivinhar texto sem data ou roteiro ambíguo');
  exigir(storyApi.validarSemanaDoRoteiroStory('2026-08-10',vitalle.titulo,vitalle.descricao).ok===false &&
    storyApi.validarSemanaDoRoteiroStory('2026-08-17',vitalle.titulo,vitalle.descricao).ok===true &&
    storyApi.semanaEfetivaStory({...vitalle,semanaConteudo:'2026-08-24'})==='2026-08-24',
    'nova gravação de Story aceita competência contraditória ou ignora campo explícito');

  const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
  const portalFonte=trecho(portal,'function semanaStoryDerivadaPortal','  window.semanaEfetivaStoryPortal=semanaEfetivaStoryPortal;');
  const portalApi=executarSandbox('stories-portal-vitalle-v70.js',
    `function dataLocal(d){const dt=new Date(d);return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');}\n`+
    `function segundaDaSemanaPortal(d){const data=new Date(d);const dow=data.getDay(),recuo=dow===0?6:dow-1;data.setDate(data.getDate()-recuo);return dataLocal(data);}\n`+
    `${portalFonte}\nglobalThis.api={semanaEfetivaStoryPortal};`);
  exigir(portalApi.semanaEfetivaStoryPortal(vitalle)===storyApi.semanaEfetivaStory(vitalle),
    'Escritório e Portal voltaram a discordar sobre a semana efetiva do mesmo Story');

  exigir(calendario===fs.readFileSync(path.join(raiz,'calendarios.html'),'utf8') &&
    calendario.includes("const mesSolicitado = params.get('mes') || ''") &&
    calendario.includes('pedido && lib.includes(pedido)') && calendario.includes("u.searchParams.set('mes',m)"),
    'dois endereços do calendário divergiram ou o mês explícito deixou de ser respeitado');
  const abrirItem=trecho(calendario,'function openEdit','function saveItem');
  exigir(abrirItem.includes('const somenteConsulta=edicaoBloqueadaPorRevisao()') &&
    !abrirItem.includes('if(exigirRetiradaAntesDeEditar())return') && abrirItem.includes('aplicarModoConsultaItem(true)'),
    'mês aprovado voltou a impedir consulta ou a liberar edição silenciosa');

  const linkCliente=trecho(escritorio,'async function prepararLinkCalendarioCliente','window.prepararLinkCalendarioCliente');
  const copiarLinkCliente=trecho(escritorio,'window.copiarLinkCalendarioDireto = async function','window.abrirLinkCliente');
  exigir(linkCliente.includes("estado!=='liberado'&&estado!=='aprovado_interno'") &&
    linkCliente.includes("if(estado!=='aprovado_interno')") && linkCliente.includes("status:'liberado',mes") &&
    linkCliente.includes("(mes?'&mes='+encodeURIComponent(mes):'')") &&
    copiarLinkCliente.includes('prepararLinkCalendarioCliente(slug,mesEscolhido)'),
    'link mensal pode copiar mês inexistente/não liberado ou perder a competência na URL');
  const conciliacao=trecho(escritorio,'window.abrirConciliacaoGravacaoAntiga','  function popularClientesAgendamento');
  exigir(conciliacao.includes('marcados.length!==alvo') && conciliacao.includes('await runTransaction') &&
    conciliacao.includes("vinculoSessao:'conciliacao_legada'") && !conciliacao.includes("collection(db,'videos_producao')") &&
    conciliacao.includes('item.agendamentoId&&item.agendamentoId!==agId'),
    'conciliação antiga pode duplicar vídeo, alterar quantidade ou tomar item de outra sessão');
}

try {
  testarCoberturaPostagensSandbox();
  await testarLoginSandbox();
  testarFinanceiroSandbox();
  testarMensalidadesSandbox();
  testarCampanhasMensaisSandbox();
  testarBadgesExtrasSandbox();
  await testarOrcamentoLeiturasFirestoreSandbox();
  testarDatasOperacionaisSandbox();
  testarAcompanhamentoSandbox();
  testarDemandasSandbox();
  await testarCalendariosSandbox();
  testarSessoesGravacaoSandbox();
  testarPermissoesAcoesSandbox();
  testarCofreCeciliaSandbox();
  await testarCentralClientesAmandaSandbox();
  await testarIdentidadeClienteSandbox();
  await testarV54Sandbox();
  testarCentralEditorialCalendariosSandbox();
  await testarChecklistViradaStoriesEVideosV69Sandbox();
  testarIncidentesStoriesCalendarioGravacaoV70Sandbox();
  console.log(`REGRESSÃO CRÍTICA: APROVADA (${total} asserções)`);
} catch (erro) {
  console.error(`REGRESSÃO CRÍTICA: FALHOU — ${erro.stack || erro.message}`);
  process.exitCode = 1;
}
