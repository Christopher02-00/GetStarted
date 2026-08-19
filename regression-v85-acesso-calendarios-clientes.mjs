#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=nome=>fs.readFileSync(path.join(raiz,nome),'utf8');
const calendario=ler('calendario.html');
const calendarios=ler('calendarios.html');
const portal=ler('portal-cliente.html');
const regras=ler('firestore.rules');
let total=0;
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('V85: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('V85: trecho ausente '+inicio);
  return fonte.slice(a,b);
}

exigir(calendario===calendarios,'os dois endereços do calendário permanecem byte a byte idênticos');

/* Executa as funções reais do calendário sobre o formato encontrado em
   produção: agosto já preenchido, setembro em revisão e sem mesLegado. */
const funcoesMes=[
  trecho(calendario,'function mesDoTexto','function competenciaAtualDoCalendario'),
  trecho(calendario,'function mesDoItemNoCalendario','function carimbarMesDosAntigos'),
  trecho(calendario,'function docJaUsaMesesNoCalendario','function estadoAprovacao')
].join('\n');
const contexto={};
vm.createContext(contexto);
new vm.Script(`
  let data={};
  ${funcoesMes}
  globalThis.api={
    usar:valor=>{data=valor;},
    estado:mes=>estadoDoMes(mes),
    liberados:()=>mesesExistentesTeste().filter(m=>estadoDoMes(m)==='liberado')
  };
  function mesesExistentesTeste(){
    return [...new Set((data.items||[]).filter(i=>i&&!i.excluido).map(i=>mesDoItemNoCalendario(data,i)).filter(Boolean))].sort();
  }
`).runInContext(contexto);

const formatoVitalle={
  month:'Setembro 2026',
  items:[
    {mes:'2026-08',name:'Arquivo de agosto'},
    {mes:'2026-09',name:'Calendário de setembro'}
  ],
  aprovacaoMeses:{'2026-09':{status:'aguardando_interna',mes:'2026-09'}}
};
contexto.api.usar(formatoVitalle);
exigir(contexto.api.estado('2026-08')==='liberado','agosto anterior ao primeiro controle mensal continua acessível ao cliente');
exigir(contexto.api.estado('2026-09')==='aguardando_interna','setembro em revisão não vaza para o cliente');
exigir(JSON.stringify(contexto.api.liberados())===JSON.stringify(['2026-08']),'seletor do cliente oferece agosto e não oferece setembro em preparação');

contexto.api.usar({...formatoVitalle,aprovacaoMeses:{
  '2026-08':{status:'rascunho',mes:'2026-08'},
  '2026-09':{status:'aguardando_interna',mes:'2026-09'}
}});
exigir(contexto.api.estado('2026-08')==='rascunho','estado explícito de agosto vence a compatibilidade histórica');

contexto.api.usar({...formatoVitalle,items:[...formatoVitalle.items,{mes:'2026-10',name:'Outubro'}]});
exigir(contexto.api.estado('2026-10')==='rascunho','mês posterior sem liberação permanece oculto');

contexto.api.usar({...formatoVitalle,items:[{mes:'2026-09',name:'Setembro'}]});
exigir(contexto.api.estado('2026-08')!=='liberado','mês histórico sem conteúdo não é inventado nem liberado');

const carga=trecho(calendario,'async function load()','function save(){');
exigir(carga.includes('pedido && lib.includes(pedido) ? pedido'),'link individual honra a competência histórica quando ela está liberada');
exigir(carga.includes("monthName').value=mesVisivel?textoDoMes(mesVisivel)"),'cabeçalho mostra o mês realmente solicitado, não o rótulo operacional mais novo do documento');
exigir(calendario.includes('mesHistoricoAnteriorAoControleNoCalendario(data,mes)'),'calendário aplica a compatibilidade antes de declarar rascunho');

const cargaPortal=trecho(portal,'async function carregarCalendario()','  window.aprovarConteudoCalendario');
exigir(cargaPortal.includes('function mesHistoricoAnteriorAoControlePortal'),'Portal possui a mesma compatibilidade para meses entregues antes do mapa mensal');
exigir(cargaPortal.includes("if(mesHistoricoAnteriorAoControlePortal(mes)) return 'liberado'"),'Portal reconhece o arquivo histórico antes do fallback de rascunho');
exigir(cargaPortal.includes('mesPedidoValido&&!mesesLib.includes(mesPedidoValido)'),'Portal não troca silenciosamente o mês solicitado');

const token=trecho(regras,'function tokenPortalValido(cliente, token)','    function urlHttpsOuVazia');
exigir(token.includes('tokenPortalHistoricoAtivo(cliente, token)'),'regras preparadas aceitam link histórico ativo do mesmo cliente');
exigir(token.includes('acessoPortalCanonicoAtivo(cliente)'),'saída ou vencimento canônico continua revogando todos os links');
exigir(!token.includes("!exists(/databases/$(database)/documents/clientes_acesso/$(cliente)) &&\n        exists(/databases/$(database)/documents/clientes_portal_tokens/$(token))"),'regra antiga que derrubava o link histórico não permanece');

for(const [arquivo,fonte] of [['calendario.html',calendario],['portal-cliente.html',portal]]){
  const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
  for(const bloco of blocos){
    if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
    else new vm.Script(bloco[2]);
  }
  exigir(true,arquivo+' mantém JavaScript inline sintaticamente válido');
}

console.log(`REGRESSÃO V85 ACESSO A CALENDÁRIOS: APROVADA (${total} verificações)`);
