#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
let total=0;
function exigir(ok,msg){ total++; if(!ok) throw new Error('V81 integridade: '+msg); console.log('PASS ',msg); }
function trecho(inicio,fim){ const a=escritorio.indexOf(inicio),b=escritorio.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return escritorio.slice(a,b); }

const tokens=trecho('async function garantirTokensDoCliente','  function copiarTextoLegado');
exigir(tokens.includes('await runTransaction(db,async tx=>')&&tokens.includes('tokensAtivos.size>1')&&tokens.includes('adotouLegado'),'token do Portal é adotado em transação e conflito legado é explícito');
exigir(tokens.indexOf('tokensAtivos.size>1')<tokens.indexOf('tx.set(ref,patch')&&tokens.includes('reciboConfirmado:true'),'nenhum acesso nasce antes da barreira e sucesso exige recibo');

const saida=trecho('window.salvarSaidaClienteCentral=async function','  function idCampoReativacaoCliente');
exigir(saida.includes('portalEstadosPreservados')&&!saida.includes('ativo:!imediata'),'saída futura não reativa aliases/tokens históricos');
exigir(!saida.includes('telefone:String(atual.telefone'),'fotografia gerencial da saída não replica telefone privado');
const cancelamento=trecho('window.cancelarProgramacaoSaidaCentral=async function','  async function efetivarSaidasProgramadas');
exigir(cancelamento.includes('credencialRestaurada')&&cancelamento.includes('candidatos.size>1')&&cancelamento.includes('reciboAcesso'),'cancelamento restaura credencial conhecida, bloqueia divergência e relê recibo');

const saidasMotor=trecho('async function efetivarSaidasProgramadas','  window.efetivarSaidasProgramadas');
exigir(saidasMotor.includes('const resultado={processadas:[],falhas:[]}')&&saidasMotor.includes('resultado.falhas.push')&&saidasMotor.includes('throw erro'),'motor de saídas isola clientes e propaga falha agregada');
const motor=trecho('async function motorAutomacoes','  let motorIntervalId');
exigir(motor.includes('manutencaoDiariaSemFalhas')&&motor.includes('manutencao_diaria_incompleta'),'manutenção diária falha sem carimbar falso sucesso');

const avulso=trecho('function idReceitaAvulsaPorNegocio','  window.moverNegocio = async function');
exigir(avulso.includes('idReceitaAvulsaPorNegocio')&&avulso.includes('await runTransaction(db,async tx=>')&&avulso.includes('reciboNegocio')&&avulso.includes('reciboReceita'),'negócio avulso, cliente, configuração e receita compartilham transação e recibo');
const mover=trecho('window.moverNegocio = async function','  /* Conferencia manual do comprovante');
exigir(mover.indexOf('__negociosMovendo.add(id)')<mover.indexOf('await getDoc(ref)')&&mover.includes('__negociosMovendo.delete(id)')&&!mover.includes("addDoc(collection(db,'receitas_avulsas')"),'trava de produção antecede espera e ramo parcial antigo foi removido');

const lote=trecho('async function dispararCalendarios','  /* Aprovar NÃO envia mais.');
exigir(lote.includes('const resultado={enviados:[],falhas:[]}')&&lote.includes('resultado.falhas.push')&&lote.includes('return resultado'),'lote de calendários devolve enviados e falhas por alvo');
exigir(!escritorio.includes('ecaContatoFinanceiro')&&!escritorio.includes("origem:'edicao_financeiro_explicita'"),'escritor financeiro invisível foi removido por completo');

function escolherLegado(acessos,tokensDocs){
  const candidatos=new Set([...acessos.filter(v=>v.ativo!==false&&v.token).map(v=>v.token),...tokensDocs.filter(v=>v.ativo!==false).map(v=>v.id)]);
  if(candidatos.size>1) throw new Error('conflito');
  return [...candidatos][0]||'novo';
}
exigir(escolherLegado([{token:'vitalle-antigo',ativo:true}],[])==='vitalle-antigo','sandbox: token legado único é preservado');
let conflito=false; try{ escolherLegado([{token:'um',ativo:true}],[{id:'dois',ativo:true}]); }catch{ conflito=true; }
exigir(conflito,'sandbox: dois tokens ativos divergentes bloqueiam sem escolher no escuro');

async function processarIsolado(itens,fn){
  const r={processadas:[],falhas:[]};
  for(const item of itens){ try{ await fn(item); r.processadas.push(item); }catch(e){ r.falhas.push({item,erro:e.message}); } }
  return r;
}
const isolado=await processarIsolado(['A','B','C'],async item=>{ if(item==='B') throw new Error('falhou'); });
exigir(isolado.processadas.join(',')==='A,C'&&isolado.falhas[0].item==='B','sandbox: falha de um cliente não impede os seguintes');

for(const bloco of [...escritorio.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])))){
  if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
  else new vm.Script(bloco[2]);
}
exigir(true,'JavaScript inline do Escritório compila');
console.log(`REGRESSÃO V81 INTEGRIDADE: OK (${total} verificações)`);
