#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
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

function planoMigracaoSimulado(configs,privados){
  const normalizar=valor=>{
    let numero=String(valor||'').replace(/\D/g,'');
    if(numero.length===10||numero.length===11) numero='55'+numero;
    return /^55\d{10,11}$/.test(numero)?numero:'';
  };
  const canonico=id=>({'hitech-rodrigo':'hitech'}[id]||id);
  const aliases=slug=>slug==='hitech'?['hitech','hitech-rodrigo']:[slug];
  const candidatos=new Map();
  for(const [id,dados] of Object.entries(configs)){
    if(!Object.hasOwn(dados,'whatsappCobranca')) continue;
    const numero=normalizar(dados.whatsappCobranca),slug=canonico(id);
    if(!numero) continue;
    const numeros=candidatos.get(slug)||new Set();
    numeros.add(numero); candidatos.set(slug,numeros);
  }
  const copiar=[];
  for(const [slug,numeros] of candidatos){
    if(aliases(slug).some(id=>normalizar(privados[id]?.whatsapp))) continue;
    if(numeros.size===1) copiar.push({slug,numero:[...numeros][0]});
  }
  return copiar;
}

const regraContato=trecho(rules,'function contatoFinanceiroValido','match /capsulas_clientes');
exigir(regraContato.includes("dados.whatsapp.matches('55[0-9]{10,11}')"),'regra valida WhatsApp canônico com DDI brasileiro');
exigir(regraContato.includes('function contatoFinanceiroAmandaValido')&&
  regraContato.includes("dados.origem in ['ativacao_mensalista','ativacao_avulso','reativacao']"),
  'Amanda só pode escrever contato nos três eventos autorizados do ciclo');
exigir(regraContato.includes("dados.atualizadoPor == 'Amanda'")&&
  regraContato.includes("'slug','whatsapp','nome','origem','atualizadoPor','atualizadoEm'"),
  'escrita da Amanda tem autoria e chaves limitadas');
exigir(regraContato.includes('allow read: if ehChris();')&&regraContato.includes('allow delete: if false;'),
  'coleção privada só é lida por Chris e não admite exclusão física');

const editorAtivo=trecho(escritorio,'window.salvarClienteAtivoCentral=async function','window.arquivarEntradaPendente');
exigir(!editorAtivo.includes("ecaContatoFinanceiro")&&!editorAtivo.includes("contatos_clientes_financeiro")&&
  !editorAtivo.includes('numeroWhatsAppBrasil(dados.telefone)'),
  'ficha ativa não possui escritor morto nem reaproveita telefone legado na agenda privada');
exigir(!escritorio.includes("origem:'edicao_financeiro_explicita'"),
  'ramo sem campo visível foi removido em vez de simular uma edição financeira');

const config=trecho(escritorio,'function renderConfigAprovacao','async function carregarGerencia');
exigir(!config.includes('whatsappCobranca'),'Config por Cliente não exibe nem grava contato financeiro');

const contatos=trecho(escritorio,'async function carregarContatosFinanceirosChris','async function carregarMensalistaRecebidoNosCampos');
exigir(contatos.includes("_getDocsFB(collection(db,'contatos_clientes_financeiro'))")&&
  contatos.includes("if(usuarioAtual!=='Chris') throw"),
  'agenda privada ignora o cache compartilhado e exige Chris');
exigir(contatos.includes('const pessoaDaLeitura=usuarioAtual')&&
  contatos.includes("throw new Error('A identidade mudou durante a leitura privada.')"),
  'leitura privada revalida a identidade depois da espera');
const renderMensagens=trecho(escritorio,'window.renderMensagensClientesChris=async function','async function carregarMensalistaRecebidoNosCampos');
exigir(renderMensagens.includes('const ativos=await window.renderCentralEntradaClientes()')&&
  renderMensagens.includes('contatos=await carregarContatosFinanceirosChris()')&&
  renderMensagens.indexOf('const ativos=await window.renderCentralEntradaClientes()')<renderMensagens.indexOf('contatos=await carregarContatosFinanceirosChris()'),
  'Mensagens confirma a projeção ativa antes de carregar telefones');
exigir(contatos.includes('slugsCompatibilidadeCliente(slug).some')&&
  contatos.includes('grupo.numeros.size!==1')&&contatos.includes('reciboMigracao')&&
  contatos.includes('await runTransaction(db,async tx=>')&&contatos.includes('const atual=await tx.get(ref)')&&
  contatos.includes('if(atual.exists()) return;'),
  'migração preserva alias/privado, bloqueia conflito, revalida concorrência e exige recibo');
exigir(!contatos.includes('deleteDoc(')&&!contatos.includes('whatsappCobranca:deleteField()'),
  'migração é cópia reversível e não apaga a origem legada');
exigir((escritorio.match(/migrarContatosFinanceirosLegados\(\)/g)||[]).length===1&&
  escritorio.includes('onclick="migrarContatosFinanceirosLegados()"'),
  'migração só começa por ação explícita do Chris');

const salvarRapido=trecho(escritorio,'window.salvarWhatsRapido = async function','window.novaReceitaAvulsa');
exigir(salvarRapido.includes("doc(db,'contatos_clientes_financeiro'")&&
  !salvarRapido.includes("doc(db,'clientes_config'")&&salvarRapido.includes('const recibo=await getDoc(ref)'),
  'Régua salva e confirma o número somente na coleção privada');

const regua=trecho(escritorio,'async function numeroCobrancaConfirmado','window.confirmarEnvioCobranca=async function');
exigir(regua.includes("getDoc(doc(db,'contatos_clientes_financeiro'")&&
  regua.includes('slugsCompatibilidadeCliente(canonico)')&&
  !regua.includes("getDoc(doc(db,'clientes_config'"),
  'consulta individual da cobrança usa coleção privada e aliases');
const renderRegua=trecho(escritorio,'window.renderCobranca = async function','function atualizarBadgeCobranca');
exigir(renderRegua.includes("_getDocsFB(collection(db,'contatos_clientes_financeiro'))")&&
  !renderRegua.includes("getDocs(collection(db,'clientes_config')"),
  'Régua inteira carrega contatos privados sem cache compartilhado');
exigir(renderRegua.includes('const pessoaDaTela=usuarioAtual')&&
  renderRegua.includes("if(usuarioAtual!==pessoaDaTela){ box.replaceChildren(); window.__cobrancasFila={}; return false; }"),
  'Régua revalida Chris após leituras assíncronas');

const fronteira=trecho(escritorio,'function pararListenersTempoReal','function iniciarListenersTempoReal');
for(const global of ['window.__mensagensClientesLista=[]','window.__cobrancasFila={}','window.__cobrancasPreparadas={}']){
  exigir(fronteira.includes(global),'troca de papel limpa '+global);
}
const ouvintes=trecho(escritorio,'function iniciarListenersTempoReal','/* 04/08/2026 — a equipe inteira');
exigir(['clientes_encerrados','clientes_config','contatos_clientes_financeiro'].every(nome=>ouvintes.includes(nome)),
  'lista aberta reage a saída, reativação e alteração da agenda privada');

const referenciasConfig=[...escritorio.matchAll(/whatsappCobranca/g)].map(m=>m.index);
const migracaoInicio=escritorio.indexOf('window.migrarContatosFinanceirosLegados=async function');
const migracaoFim=escritorio.indexOf('function contatoWhatsAppCliente',migracaoInicio);
const entradaInicio=escritorio.indexOf('async function carregarMensalistaRecebidoNosCampos');
const entradaFim=escritorio.indexOf('window.ativarMensalistaRecebido',entradaInicio);
const avulsoInicio=escritorio.indexOf('window.ativarAvulsoRecebido');
const avulsoFim=escritorio.indexOf('function modelarClienteMensalistaUnificado',avulsoInicio);
exigir(referenciasConfig.every(i=>(i>=migracaoInicio&&i<migracaoFim)||(i>=entradaInicio&&i<entradaFim)||(i>=avulsoInicio&&i<avulsoFim)),
  'campo legado só permanece na migração explícita e na compatibilidade de entradas pendentes');

const plano=planoMigracaoSimulado({
  hitech:{whatsappCobranca:'41 99820-1999'},
  'hitech-rodrigo':{whatsappCobranca:'41 99820-1999'},
  vitalle:{whatsappCobranca:'41 98859-9585'},
  conflito:{whatsappCobranca:'41 99999-0000'},
  invalido:{whatsappCobranca:'123'}
},{hitech:{whatsapp:'5541998201999'}});
exigir(!plano.some(v=>v.slug==='hitech')&&plano.some(v=>v.slug==='vitalle'),
  'sandbox: contato privado existente vence o legado e contato único ausente é copiado');
const conflito=planoMigracaoSimulado({
  hitech:{whatsappCobranca:'41 99999-0000'},
  'hitech-rodrigo':{whatsappCobranca:'41 98888-0000'}
},{});
exigir(conflito.length===0,'sandbox: dois números legados para a mesma identidade são bloqueados');

const blocos=[...escritorio.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
for(const bloco of blocos){
  if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
  else new vm.Script(bloco[2]);
}
exigir(true,'scripts inline do Escritório compilam');

console.log(`REGRESSÃO V81 CONTATOS: OK (${total} verificações)`);
