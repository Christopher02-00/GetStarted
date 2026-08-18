#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const regras=ler('firestore.rules');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('FALHOU: '+mensagem); console.log('PASS ',mensagem); }
function trecho(inicio,fim){ const a=escritorio.indexOf(inicio),b=escritorio.indexOf(fim,a); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return escritorio.slice(a,b); }

exigir(/<meta name="gs-build" content="2026-08-18-(?:contatos-arquivo-unico-v78|calendario-proximo-mes-v79)">/.test(escritorio),'build V78 ou sucessor identificado');
exigir(escritorio.includes('Contatos ativos e mensagens')&&escritorio.includes('Área exclusiva do Chris dentro do Financeiro'),'contatos ficam explicitamente no Financeiro do Chris');
exigir(escritorio.includes("definirItemExclusivoNoDOM('navMensagensClientesChris',usuarioAtual==='Chris')")&&escritorio.includes("definirItemExclusivoNoDOM('view-mensagensClientesChris',usuarioAtual==='Chris')"),'menu e view de contatos saem do DOM dos demais papéis');
exigir(escritorio.includes("const VIEWS_SO_CHRIS = ['mensalidades','contratos','financeiro','centralVendas','cobranca','mensagensClientesChris']"),'porta de navegação mantém contatos exclusiva do Chris');

const cadastro=trecho("window.setCadastroSub = function","  function entradaClientePendente");
exigir(cadastro.includes("qual === 'central' || qual === 'arquivo'")&&cadastro.includes("window.__centralClientesModo=qual"),'Entrada e arquivo usam a mesma Central, sem segunda implementação');
exigir(escritorio.includes("setCadastroSub('arquivo', this)")&&escritorio.includes('id="arquivoClientesUnico"'),'arquivo único possui acesso e contêiner próprios');
exigir(escritorio.includes("const arquivoUnico=new Map()")&&escritorio.includes("const chave=slugDo(v)||('registro-'+v.id)")&&escritorio.includes('if(!anterior || v.origemCentralEntrada)'),'arquivo consolida por identidade e prefere a saída oficial');
exigir(escritorio.includes("const slugsAtivosNaCentral=new Set(ativos.map(v=>v.slug))")&&escritorio.includes('!slugsAtivosNaCentral.has(slugDo(v))'),'registro antigo de cliente ativo não cria cartão no arquivo');
exigir(escritorio.includes("const saidasProgramadas=arquivadosDoLink.filter")&&escritorio.includes("const arquivoEfetivo=arquivadosDoLink.filter"),'saída futura fica separada do arquivo efetivo');
exigir(escritorio.includes("window.__clientesArquivadosCentral=Object.fromEntries")&&escritorio.includes('confirmarReativacaoClienteCentral'),'reativação usa o mesmo mapa do arquivo oficial');
exigir(escritorio.includes('Contato financeiro:</b> preservado e acessível somente ao Chris no Financeiro'),'ficha arquivada não expõe telefone na Central compartilhada');
exigir(escritorio.includes('O telefone não é exibido nesta Central compartilhada')&&!trecho('function htmlEditorClienteAtivoCentral','  window.editarClienteAtivoCentral').includes('id="ecaTelefone"'),'editor compartilhado não monta o telefone ativo no DOM');
exigir(trecho('window.salvarClienteAtivoCentral','  window.ativarMensalistaRecebido').includes("telefone:String(atual.telefone||atual.whatsappCobranca||'').trim()"),'edição compartilhada preserva o telefone sem exigir campo visível');
exigir(escritorio.includes('data-arquivo-cliente=')&&escritorio.includes('window.filtrarArquivoClientesUnico=function'),'arquivo único oferece busca sem criar outra coleção');

const mensagens=trecho('/* ===== MENSAGENS PARA CLIENTES','  async function carregarMensalistaRecebidoNosCampos');
exigir(mensagens.includes('window.__mensagensClientesLista=ativos.map'),'planilha de contatos nasce somente do retrato ativo confirmado');
exigir(mensagens.includes('window.salvarContatoFinanceiroCliente=async function')&&mensagens.includes("if(usuarioAtual!=='Chris')"),'edição do número é bloqueada fora do perfil Chris');
exigir(mensagens.includes('const ativos=await window.renderCentralEntradaClientes()')&&mensagens.includes("if(!cliente){ mostrarToast('Contato não salvo: o cliente não está mais na carteira ativa"),'salvar contato relê a carteira e bloqueia cliente encerrado');
exigir(mensagens.includes('const recibo=await getDoc(ref)')&&mensagens.includes('recibo.data().whatsappCobranca'),'salvar contato confirma o mesmo número por recibo');
const abrir=trecho('window.abrirWhatsAppClienteAtivo=async function','  window.abrirArquivoClientesUnico');
exigir(abrir.indexOf("window.open('about:blank','_blank')")<abrir.indexOf('await window.renderCentralEntradaClientes()'),'aba do WhatsApp nasce no gesto antes da revalidação');
exigir(abrir.includes('Este cliente saiu da carteira ativa')&&abrir.includes('aba.close()'),'cliente encerrado não recebe conversa por cache antigo');
exigir(abrir.includes('aba.location.replace(url)'),'WhatsApp só navega depois de contato e atividade confirmados');

const listeners=trecho('function pararListenersTempoReal','    /* A liberação não depende');
exigir(listeners.includes("pessoaDoOuvinte==='Chris'")&&listeners.includes("collection(db,'clientes_encerrados')"),'somente Chris acompanha saídas para atualizar a planilha aberta');
exigir(listeners.includes("viewAtiva!=='mensagensClientesChris'")&&listeners.includes('window.renderMensagensClientesChris()'),'mudança de saída atualiza somente a tela de contatos quando aberta');
exigir(listeners.includes('clearTimeout(window.__timerAtualizarContatosAtivos)'),'troca de papel limpa atualização pendente da planilha');

exigir(escritorio.includes("tx.set(refs.config,{...agenda,clienteInativo:imediata")&&escritorio.includes("tx.set(encerRef,{nome:atual.nome,slug,dataAviso,dataSaida"),'saída efetiva desativa a carteira e preserva a fotografia no mesmo fluxo');
exigir(escritorio.includes("statusSaida:'cancelada'")&&escritorio.includes('Arquivamento cancelado; cliente reativado sem apagar histórico'),'reativação continua por soft-delete sem duplicar a ficha');
exigir(!mensagens.includes("addDoc(collection(db,'clientes"),'planilha e arquivo não criam cadastro paralelo');
exigir(regras.includes("match /clientes_encerrados/{docId} { allow read, create, update: if ehGerencia(); allow delete: if false; }"),'arquivo continua gerencial e sem exclusão física');

for(const arquivo of ['escritorio.html']){
  const fonte=ler(arquivo);
  const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
  for(const bloco of blocos){ if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]); else new vm.Script(bloco[2]); }
}
exigir(true,'scripts inline alterados compilam');

console.log(`RESULTADO: APROVADO (${total} asserções V78)`);
