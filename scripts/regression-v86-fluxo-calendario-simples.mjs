#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const portal=ler('portal-cliente.html');
const calendario=ler('calendario.html');
const calendarios=ler('calendarios.html');
let total=0;
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('V86: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('V86: trecho ausente '+inicio);
  return fonte.slice(a,b);
}

exigir(calendario===calendarios,'os dois endereços do calendário permanecem byte a byte idênticos');

const helper=trecho(escritorio,'function mapaAprovacaoAposPublicar','  window.mapaAprovacaoAposPublicar');
const contexto={};
vm.createContext(contexto);
new vm.Script(`${helper}\nglobalThis.api=mapaAprovacaoAposPublicar;`).runInContext(contexto);
const agora='2026-08-19T12:00:00.000Z';
const mapa=contexto.api({
  '2026-08':{status:'liberado',mes:'2026-08',em:'antes'},
  '2026-09':{status:'aguardando_interna',mes:'2026-09',em:'fila'},
  '2026-10':{status:'rascunho',mes:'2026-10',em:'rascunho'}
},'2026-09','Amanda',agora,['2026-08']);
exigir(mapa['2026-09'].status==='liberado','aprovação da Amanda publica imediatamente o mês escolhido');
exigir(mapa['2026-08'].status==='arquivado','mês público anterior passa a arquivo quando o novo é publicado');
exigir(mapa['2026-10'].status==='rascunho','publicação não altera outro mês em produção');
exigir(mapa['2026-08'].arquivadoPor==='Amanda'&&mapa['2026-08'].substituidoPor==='2026-09','arquivo registra a troca sem apagar o histórico');

const aprovacao=trecho(escritorio,'window.liberarCalendario = async function','  window.devolverCalendario');
const disparo=trecho(escritorio,'async function dispararCalendarios','  /* Aprovar NÃO envia mais.');
exigir(aprovacao.includes('dispararCalendarios([{slug,mes:alvo,aprovarAgora:true}])')&&disparo.includes('mapaAprovacaoAposPublicar')&&disparo.includes('const snap=await tx.get(ref)'),'Amanda usa uma única transação que relê o estado e aplica a transição centralizada');
exigir(disparo.includes("estadoMesCal(dadosRecibo,a.mes)!=='liberado'")&&disparo.includes('outrosAtivos.length'),'aprovação só confirma após recibo do mês publicado e ausência de outro público');
exigir(!aprovacao.includes("status:'aprovado_interno'"),'aprovação não cria a etapa adicional de envio manual');

const fila=trecho(escritorio,'window.htmlCalendariosParaRevisar = async function','  function idAnaliseCalendarioRevisao');
exigir(fila.includes('Aprovar e publicar')&&!fila.includes('guardar pro dia 15'),'Amanda vê uma única decisão de aprovação/publicação');
exigir((fila.match(/onclick="liberarCalendario/g)||[]).length===1&&!fila.includes('aprovarEEnviarAgora'),'cartão não oferece dois botões concorrentes para a mesma decisão');

const preparar=trecho(escritorio,'async function prepararLinkCalendarioCliente','  window.prepararLinkCalendarioCliente');
exigir(!preparar.includes('runTransaction')&&!preparar.includes("status:'liberado'"),'Cecília copia o link sem publicar ou mudar o calendário');
exigir(preparar.includes("estado!=='liberado'")&&preparar.includes('aprovação da Amanda'),'Cecília recebe uma orientação clara quando Amanda ainda não publicou');
exigir(escritorio.includes("'Cecília': ['visao','editar','links','resgate']"),'Cecília possui a porta visível de links no próprio papel');

const arquivoInterno=trecho(escritorio,'async function abrirCalendarioArquivoInterno','  window.abrirCalendarioArquivoInterno');
exigir(!/setDoc|updateDoc|runTransaction|deleteDoc|addDoc/.test(arquivoInterno),'abrir arquivo para conferência é estritamente somente leitura');
const renderArquivo=trecho(escritorio,'window.renderFilaEnvioCalendarios = async function','  window.enviarUmCalendario');
exigir(renderArquivo.includes('Abrir para conferência')&&renderArquivo.includes('abrirCalendarioArquivoInterno'),'Amanda abre o arquivo sem trocar o calendário público ativo');

const carga=trecho(calendario,'async function load()','function save(){');
exigir(carga.includes("mesVisivel = pedido ||"),'link individual nunca troca silenciosamente o mês explícito por outro mês liberado');
const modoCliente=trecho(calendario,'function aplicarModoCalendario()','/* ===== POR QUE PARECIA VAZIO');
exigir(modoCliente.includes("st === 'arquivado'")&&modoCliente.includes('Calendário arquivado'),'link individual mostra somente a mensagem de arquivo');
exigir(modoCliente.includes("['viewGrid','viewWeek','viewKanban']")&&modoCliente.includes("el.innerHTML = ''"),'conteúdo do mês arquivado é removido antes da mensagem');

const cargaPortal=trecho(portal,'async function carregarCalendario()','  window.aprovarConteudoCalendario');
exigir(cargaPortal.includes("estadoDoMesPortal(mesPedidoValido)==='arquivado'")&&cargaPortal.includes('Calendário arquivado'),'Portal trata arquivo antes de tentar renderizar conteúdo');
exigir(!/Calendário arquivado[\s\S]{0,500}(it\.name|items\.map|quadroCalendario)/.test(cargaPortal),'mensagem arquivada não inclui cartões, iframe ou conteúdo do calendário');

for(const [arquivo,fonte] of [['escritorio.html',escritorio],['portal-cliente.html',portal],['calendario.html',calendario]]){
  const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/\bsrc\s*=/.test(m[1]));
  for(const bloco of blocos){
    if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
    else new vm.Script(bloco[2]);
  }
  exigir(true,arquivo+' mantém JavaScript inline sintaticamente válido');
}

console.log(`REGRESSÃO V86 FLUXO SIMPLES DE CALENDÁRIO: APROVADA (${total} verificações)`);
