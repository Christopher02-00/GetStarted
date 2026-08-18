#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const portal=ler('portal-cliente.html');
const rules=ler('firestore.rules');
let total=0;

function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('FALHOU: '+mensagem);
  console.log('PASS ',mensagem);
}

function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio);
  const b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return fonte.slice(a,b);
}

function idSaidaClienteDeterministico(slug,dataSaida){
  return 'saida_'+String(slug||'cliente').replace(/[^a-z0-9_-]/gi,'_')+'_'+String(dataSaida||'sem-data').replace(/[^0-9-]/g,'');
}

function registrarSaidaSimulada(estado,slug,dataSaida){
  const id=idSaidaClienteDeterministico(slug,dataSaida);
  if(estado.saidaAtivaId&&estado.saidaAtivaId!==id) throw new Error('conflito');
  estado.saidaAtivaId=id;
  estado.registros.set(id,{slug,dataSaida});
  return id;
}

function cancelarSaidaSimulado({preservados,acessos,tokens}){
  if(preservados) return {acessos:acessos.map(v=>({...v})),tokens:tokens.map(v=>({...v}))};
  const canonico=acessos.find(v=>v.canonico&&v.token);
  const candidatos=new Set([...acessos.filter(v=>v.ativo!==false&&v.token).map(v=>v.token),...tokens.filter(v=>v.ativo!==false).map(v=>v.id)]);
  const escolhido=canonico?.token||(candidatos.size===1?[...candidatos][0]:'');
  if(!escolhido&&candidatos.size>1) throw new Error('legacy/conflict');
  return {
    acessos:acessos.map(v=>({...v,ativo:v.token===escolhido})),
    tokens:tokens.map(v=>({...v,ativo:v.id===escolhido}))
  };
}

function sessaoPortalValidaSimulada({acesso,tokenDoc,cliente,token,agora}){
  const vigente=d=>!d?.ativoAte||agora<d.ativoAte;
  if(acesso) return acesso.ativo!==false&&vigente(acesso)&&acesso.token===token;
  return !!tokenDoc&&tokenDoc.cliente===cliente&&tokenDoc.ativo!==false&&vigente(tokenDoc);
}

exigir(escritorio.includes('2026-08-18-ciclo-clientes-propostas-v81'),'build V81 identificado');
exigir(escritorio.includes('Central única de clientes')&&escritorio.includes('Interesse → proposta → fechamento → ficha final → conferência da Amanda → ativo → saída programada → arquivo → reativação.'),'ciclo completo está explicitado numa única Central');
exigir(!escritorio.includes('registroRapidoBox.replaceChildren'),'troca de papel não destrói mais o formulário de entrada');
exigir(!escritorio.includes('cadastro-final-onboarding'),'iframe parcial de cadastro final foi removido da Central');

const entrada=trecho(escritorio,'window.abrirCadastroManualMensalista=function','window.ativarAvulsoRecebido');
exigir(escritorio.includes("window.__cadastroOrigemAtivacaoId=''")&&entrada.includes("const box=document.getElementById('registroRapidoBox')")&&entrada.includes("box.style.display='block'"),'cadastro manual abre a mesma conferência oficial');
exigir(escritorio.includes('onclick="registrarClienteDaReuniao()"'),'entrada manual e recebida terminam no mesmo escritor');
exigir(/<input(?=[^>]*id="rrValorMensal")(?=[^>]*type="number")(?![^>]*readonly)[^>]*>/.test(escritorio),'Amanda pode informar o valor na entrada');
exigir(escritorio.includes("idCampoReativacaoCliente(chaveArquivo,'Valor')")&&escritorio.includes("idCampoReativacaoCliente(chaveArquivo,'Vencimento')")&&escritorio.includes("idCampoReativacaoCliente(chaveArquivo,'Competencia')"),'reativação coleta nova condição financeira');
exigir(/id="ecaValor"[^>]*readonly/.test(escritorio),'cliente ativo não ganhou edição retroativa de valor');

const contador=trecho(escritorio,'function aplicarContadorEntradaClientes','window.carregarContadorEntradaClientes=carregarContadorEntradaClientes');
exigir(contador.includes("badge.textContent='!'")&&contador.includes('__contadorEntradaCache'),'falha do contador preserva o último retrato e mostra indisponibilidade');
exigir(!contador.includes("catch(e){ badge.style.display='none'"),'falha de leitura não é ocultada como zero');

const saida=trecho(escritorio,'let __salvandoSaidaCliente=false','function idCampoReativacaoCliente');
exigir(saida.includes('idSaidaClienteDeterministico(slug,dataSaida)'),'saída usa protocolo determinístico');
exigir(!saida.includes("addDoc(collection(db,'clientes_encerrados')"),'saída não cria documento com ID aleatório');
exigir(saida.indexOf('__salvandoSaidaCliente=true')<saida.indexOf('await Promise.all'),'trava de clique é armada antes da primeira espera');
exigir(saida.includes('...Object.values(refs),encerRef'),'documento da saída é relido dentro da transação');
exigir(saida.includes('saidaAtivaId:encerRef.id')&&saida.includes("Outra aba já registrou a saída"),'ponteiro canônico impede duas saídas concorrentes');
exigir(saida.includes('storiesDoCliente')&&saida.includes("motivoDesativacao:'Saída efetiva do cliente'"),'saída atualiza Stories junto dos demais acessos');
exigir(saida.includes('reciboSaida')&&saida.includes('reciboConfig')&&saida.includes('Não repita'),'sucesso depende de recibo da saída e do ponteiro');
exigir(saida.includes('portalEstadosPreservados')&&saida.includes('Programar uma saída não reativa aliases/tokens históricos')&&!saida.includes('telefone:String(atual.telefone'), 'programação preserva credenciais e fotografia compartilhada não copia telefone');

const estado={saidaAtivaId:'',registros:new Map()};
const primeira=registrarSaidaSimulada(estado,'vitalle-odonto','2026-08-31');
const repetida=registrarSaidaSimulada(estado,'vitalle-odonto','2026-08-31');
exigir(primeira===repetida&&estado.registros.size===1,'sandbox: duas abas com a mesma saída convergem em um registro');
let conflito=false;
try{ registrarSaidaSimulada(estado,'vitalle-odonto','2026-09-30'); }catch{ conflito=true; }
exigir(conflito&&estado.registros.size===1,'sandbox: segunda saída divergente é recusada sem duplicar');

const reativacao=trecho(escritorio,'window.cancelarProgramacaoSaidaCentral=async function','async function efetivarSaidasProgramadas');
exigir(reativacao.includes("origemDados.statusSaida==='cancelada'")&&reativacao.includes('nenhuma segunda reativação foi criada'),'reativação repetida é barrada pelo estado relido');
exigir(reativacao.includes('origemDados.portalEstadosPreservados===true')&&reativacao.includes('candidatos.size>1')&&reativacao.includes('credencialRestaurada'),'cancelamento preserva estado novo e bloqueia credenciais legadas divergentes');
exigir(reativacao.includes('saidaAtivaId:deleteField()'),'reativação limpa o ponteiro da saída vigente');
const aliasUnico=cancelarSaidaSimulado({preservados:false,acessos:[{id:'alias',token:'legado',ativo:true}],tokens:[{id:'legado',ativo:true},{id:'antigo',ativo:false}]});
exigir(aliasUnico.acessos[0].ativo&&aliasUnico.tokens.filter(t=>t.ativo).map(t=>t.id).join(',')==='legado','sandbox: cancelamento legado restaura credencial alias-only sem rotação');
let conflitoCredencial=false;
try{ cancelarSaidaSimulado({preservados:false,acessos:[{id:'a',token:'um',ativo:true},{id:'b',token:'dois',ativo:true}],tokens:[]}); }catch{ conflitoCredencial=true; }
exigir(conflitoCredencial,'sandbox: credenciais legadas divergentes bloqueiam antes de escrever');

const motor=trecho(escritorio,'async function efetivarSaidasProgramadas','window.renderCentralEntradaClientes');
exigir(motor.includes("statusSaida==='programada'")&&motor.includes('saidaAtivaId'),'motor só efetiva a saída programada canônica');
exigir(motor.includes("const stories=saida.tipoCliente==='mensalista'")&&motor.includes("const tokens=[...new Map")&&motor.includes("motivoDesativacao:'Saída efetiva do cliente'"),'motor diário encerra Stories e tokens compatíveis');
exigir(motor.includes('const resultado={processadas:[],falhas:[]}')&&motor.includes("resultado.falhas.push")&&motor.includes('throw erro'),'motor isola cada cliente e propaga falhas depois de processar os demais');

const tokensLink=trecho(escritorio,'async function garantirTokensDoCliente','  function copiarTextoLegado');
exigir(tokensLink.includes('await runTransaction(db,async tx=>')&&tokensLink.includes('tokensAtivos.size>1')&&tokensLink.includes('adotouLegado')&&tokensLink.includes('reciboConfirmado:true'),'gerador de link adota token legado único em transação, bloqueia divergência e exige recibo');
exigir(tokensLink.indexOf('tokensAtivos.size>1')<tokensLink.indexOf('tx.set(ref,patch'),'conflito de tokens é barrado antes de criar o acesso canônico');

const motorGeral=trecho(escritorio,'async function motorAutomacoes','  let motorIntervalId');
exigir(motorGeral.includes('manutencaoDiariaSemFalhas')&&motorGeral.includes('manutencao_diaria_incompleta')&&motorGeral.includes('rodarManutencaoDiaria&&manutencaoDiariaSemFalhas'),'motor não carimba o dia quando uma rotina diária falha');

exigir(escritorio.includes('historicoSaidasCanceladas')&&escritorio.includes('Histórico de saídas canceladas e reativações')&&escritorio.includes('não são clientes arquivados nem criam outra identidade'),'histórico cancelado fica visível sem voltar ao arquivo ativo');
exigir(escritorio.includes('window.__projecaoCicloClientes={confirmadaEm:Date.now()'),'painéis e contagens derivam da mesma projeção confirmada');
exigir(!escritorio.includes('window.adicionarClienteExtra =')&&!escritorio.includes('window.adicionarClienteExtra='),'segundo escritor técnico de cliente foi removido');
exigir(escritorio.includes('Esta lista não cria acesso automaticamente'),'lista de links não cria Portais implicitamente');
exigir(escritorio.includes('window.novoContrato = async function(){')&&escritorio.includes('window.abrirCadastroManualMensalista?.()'),'novo contrato redireciona à entrada única');

const sessaoRules=trecho(rules,'function temSessaoCliente()','function ehDonoExtra');
exigir(sessaoRules.includes('tokenPortalValido(')&&sessaoRules.includes('tokenCalendarioEquipeValido('),'cada leitura de sessão revalida token e vigência');
exigir(sessaoRules.includes("get(/databases/$(database)/documents/clientes_acesso/$(cliente)).data.token == token"),'acesso canônico define o token válido');
exigir(sessaoRules.includes('!exists(/databases/$(database)/documents/clientes_acesso/$(cliente))'),'token avulso só é fallback quando não existe acesso canônico');
exigir(sessaoRules.includes('request.time < dados.ativoAte'),'vigência do acesso é aplicada pelas regras');

exigir(sessaoPortalValidaSimulada({acesso:{ativo:true,token:'novo'},tokenDoc:{cliente:'c',ativo:true},cliente:'c',token:'antigo',agora:10})===false,'sandbox: token histórico não vence o acesso canônico');
exigir(sessaoPortalValidaSimulada({acesso:{ativo:true,token:'novo',ativoAte:10},cliente:'c',token:'novo',agora:11})===false,'sandbox: sessão já aberta perde acesso após a vigência');
exigir(sessaoPortalValidaSimulada({acesso:{ativo:true,token:'novo',ativoAte:20},cliente:'c',token:'novo',agora:11})===true,'sandbox: token canônico dentro da vigência continua válido');

const cadastroRules=trecho(rules,'match /cadastros_clientes/{docId}','match /leads_mensalista/{docId}');
exigir(cadastroRules.includes('allow create: if ehGerencia() || (')&&cadastroRules.includes("cadastroTipo == 'mensalista_fechado'")&&cadastroRules.includes("statusGerencia == 'aguardando_validacao'"),'regra aceita o escritor gerencial sem afrouxar o formulário público');
exigir(portal.includes('invalidarSessaoPortalLocal')&&portal.includes("localStorage.removeItem('portalClienteToken')"),'Portal limpa sessão local negada ou expirada');

for(const arquivo of ['escritorio.html','portal-cliente.html']){
  const fonte=ler(arquivo);
  const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
  for(const bloco of blocos){
    if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
    else new vm.Script(bloco[2]);
  }
}
exigir(true,'scripts inline de Escritório e Portal compilam');

console.log(`REGRESSÃO V81 CLIENTES: OK (${total} verificações)`);
