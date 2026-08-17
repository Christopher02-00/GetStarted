#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
let total=0;
function ok(cond,mensagem){ total++; if(!cond) throw new Error('V75: '+mensagem); }
function trecho(texto,inicio,fim){ const a=texto.indexOf(inicio),b=texto.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('V75: trecho ausente '+inicio); return texto.slice(a,b); }

const normalizacaoFonte=trecho(escritorio,'function idCampoReativacaoCliente','  window.confirmarReativacaoClienteCentral');
const contextoNormalizacao={window:{}}; contextoNormalizacao.window=contextoNormalizacao;
vm.createContext(contextoNormalizacao);
vm.runInContext(normalizacaoFonte+'\nglobalThis.api={idCampoReativacaoCliente,normalizarDadosReativacaoMensalista};',contextoNormalizacao);
const normalizar=contextoNormalizacao.api.normalizarDadosReativacaoMensalista;
ok(!normalizar({valorMensal:'',diaVencimento:10,primeiraCompetencia:'2026-08'}).ok,'reativação aceita valor vazio');
ok(!normalizar({valorMensal:1000,diaVencimento:0,primeiraCompetencia:'2026-08'}).ok,'reativação aceita vencimento zero');
ok(!normalizar({valorMensal:1000,diaVencimento:32,primeiraCompetencia:'2026-08'}).ok,'reativação aceita vencimento acima de 31');
ok(!normalizar({valorMensal:1000,diaVencimento:10.5,primeiraCompetencia:'2026-08'}).ok,'reativação aceita vencimento fracionado');
ok(!normalizar({valorMensal:1000,diaVencimento:10,primeiraCompetencia:'08/2026'}).ok,'reativação aceita competência ambígua');
const dadosValidos=normalizar({valorMensal:'1499.90',diaVencimento:'12',primeiraCompetencia:'2026-09'});
ok(dadosValidos.ok&&dadosValidos.valorMensal===1499.9&&dadosValidos.diaVencimento===12,'dados financeiros válidos não são normalizados corretamente');
ok(contextoNormalizacao.api.idCampoReativacaoCliente('cadastros/clientes #1','Valor')==='reativarValor_cadastros_clientes__1','ID de campo não neutraliza caracteres inseguros');

const handler=trecho(escritorio,'window.ativarMensalistaRecebido=async function','  window.cancelarEdicaoEntradaCliente');
let carregou=0,registrou=0,previu=0,focou=0,selecionou=0,rolou=0,toast='';
const elementos={
  registroRapidoBox:{style:{display:'none'},scrollIntoView(){rolou++;}},
  rrValorMensal:{focus(){focou++;},select(){selecionou++;}}
};
const contextoHandler={
  window:{registrarClienteDaReuniao(){registrou++;},previsualizarCadastroMensalista(){previu++;}},
  carregarMensalistaRecebidoNosCampos:async()=>{carregou++;},
  document:{getElementById:id=>elementos[id]||null},
  mostrarToast:mensagem=>{toast=mensagem;},String
};
contextoHandler.window.window=contextoHandler.window;
vm.createContext(contextoHandler);
vm.runInContext(handler,contextoHandler);
await contextoHandler.window.ativarMensalistaRecebido('cadastro-1');
ok(carregou===1,'botão principal não carrega o cadastro recebido');
ok(registrou===0,'botão principal ainda grava antes da conferência humana');
ok(elementos.registroRapidoBox.style.display==='block'&&rolou===1,'formulário de conferência não é exibido');
ok(previu===1&&focou===1&&selecionou===1,'valor não recebe foco e prévia antes da ativação');
ok(toast.includes('Nada foi criado ainda'),'interface não esclarece que a conferência ainda não gravou dados');

const entradaHtml=trecho(escritorio,'<div id="registroRapidoBox"','    <!-- MANUAL DE FUNCAO -->');
ok(/id="rrValorMensal"(?![^>]*readonly)/.test(entradaHtml),'valor da entrada mensalista não está editável para Amanda');
ok(entradaHtml.includes('onclick="registrarClienteDaReuniao()"'),'confirmação explícita final da entrada desapareceu');
const editorAtivo=trecho(escritorio,'function htmlEditorClienteAtivoCentral','  window.editarClienteAtivoCentral');
ok(/id="ecaValor"[^>]*readonly/.test(editorAtivo),'ficha ativa voltou a ser um segundo escritor de valor financeiro');
ok(editorAtivo.includes('mudanças de valor são programadas em <b>Contratos</b>'),'ficha ativa não orienta a fonte financeira correta');

const renderArquivo=trecho(escritorio,'const htmlArquivado=v=>','      box.innerHTML=',);
ok(renderArquivo.includes('Valor mensal (R$)')&&renderArquivo.includes('Dia de vencimento')&&renderArquivo.includes('Primeiro mês após reativação'),'arquivo não coleta a condição financeira completa');
ok(renderArquivo.includes('confirmarReativacaoClienteCentral'),'arquivo ainda chama reativação sem validação dos campos');
ok(escritorio.includes("const chaveArquivoCliente=v=>(v.arquivoColecao||'clientes_encerrados')+'__'+v.id"),'arquivos de coleções diferentes ainda podem colidir pelo mesmo ID');
ok(renderArquivo.includes('Nenhum cadastro novo será criado'),'interface não explicita a preservação da identidade');
ok(renderArquivo.includes('aliasOuFusao')&&renderArquivo.includes('!aliasOuFusao'),'alias/fusão arquivado pode voltar a ser reativado como cliente independente');

const reativacao=trecho(escritorio,'window.cancelarProgramacaoSaidaCentral=async function','  async function efetivarSaidasProgramadas');
ok(reativacao.includes("if(!['Amanda','Chris'].includes(usuarioAtual))"),'reativação não está limitada à gerência');
ok(reativacao.includes("['clientes_encerrados','cadastros_clientes','leads_avulsos','leads_pessoa_fisica']"),'origem do arquivo não é validada por lista fechada');
ok(reativacao.includes("arquivoColecao==='cadastros_clientes'?saida.id:''"),'cadastro mensalista legado não reutiliza a própria ficha');
ok(reativacao.includes("'legado_'+arquivoColecao+'_'+saida.id"),'histórico legado não recebe identidade determinística');
ok(reativacao.includes('origemAindaArquivada')&&reativacao.includes('runTransaction'),'estado do arquivo não é relido dentro da transação');
ok(reativacao.includes("doc(db,'clientes_config',slug)")&&reativacao.includes("doc(db,'contratos_cliente',slug)"),'reativação não usa o slug canônico nas fontes centrais');
ok(reativacao.includes("valorProgramadoEm:reativacao.primeiraCompetencia")&&reativacao.includes("origem:'reativacao'"),'contrato existente não registra valor datado e auditável');
ok(reativacao.includes('if(existe.get(contratoRef.path))')&&reativacao.includes('else Object.assign(atualizacaoContrato'),'contrato ausente não possui recuperação explícita');
ok(reativacao.includes('valorVigente:reativacao.valorMensal')&&reativacao.includes('primeiraCompetencia:reativacao.primeiraCompetencia'),'contrato recuperado não nasce com valor e competência');
ok(reativacao.includes("!['pago','cancelado'].includes(String(statusRestaurado))"),'reativação pode sobrescrever mensalidade paga ou cancelada');
ok(/statusSaida:'cancelada'[\s\S]*?excluido:true/.test(reativacao)&&!reativacao.includes('deleteDoc('),'registro de saída não permanece em soft-delete');
ok(!reativacao.includes('addDoc('),'reativação pode criar cliente com ID aleatório');
ok(reativacao.includes('await window.garantirPortalClienteCentral(slug)'),'Portal não é confirmado após a mesma ficha ser reativada');

ok(escritorio.includes('Conferir valor e ativar'),'fila não encaminha Amanda à conferência do valor');
ok(!handler.includes('registrarClienteDaReuniao'),'handler imediato ainda contém o escritor final');
ok(!escritorio.includes("cancelarProgramacaoSaidaCentral('${escJs(slug)}','${escJs(v.id)}',true)"),'arquivo ainda oferece o caminho antigo sem dados financeiros');

console.log(`RESULTADO: APROVADO (${total} asserções V75)`);
