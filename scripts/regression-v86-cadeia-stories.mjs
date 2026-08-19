#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
const regras=fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8');
let total=0;
function exigir(ok,msg){ total++; if(!ok) throw new Error('V86 Stories: '+msg); console.log('PASS ',msg); }
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio), b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('V86 Stories: trecho ausente '+inicio);
  return fonte.slice(a,b);
}

const criacao=trecho(escritorio,'window.criarSemanaStories = async function','  window.liberarStory = async function');
exigir(criacao.includes('__salvandoStorySemana')&&criacao.indexOf('__salvandoStorySemana=true')<criacao.indexOf('await '),'trava de criação nasce antes da primeira espera');
exigir(criacao.includes('storySemanalId(')&&criacao.includes('runTransaction(db'),'novo Story semanal usa identidade determinística e transação');
exigir(criacao.includes("where('cliente','==',slug)")&&criacao.includes('semanaEfetivaStory'),'legado da mesma semana é confirmado antes de criar outro registro');
exigir(criacao.includes("gestor ? 'liberado' : 'aguardando_interna'")&&criacao.includes("status: 'aguardando'"),'envio da Gabi sempre nasce aguardando Amanda');

const aprovar=trecho(escritorio,'window.liberarStory = async function','  window.devolverStory = async function');
exigir(aprovar.includes('runTransaction(db')&&/\.revisaoInterna\s*!==\s*'aguardando_interna'/.test(aprovar)&&/\.revisaoInterna\s*===\s*'liberado'/.test(aprovar),'aprovação relê o estado e é idempotente');
exigir(aprovar.includes('recibo')&&aprovar.includes("revisaoInterna!=='liberado'"),'sucesso da aprovação depende de recibo liberado');

const devolver=trecho(escritorio,'window.devolverStory = async function','  /* Guarda os links');
exigir(devolver.includes('runTransaction(db')&&/\.revisaoInterna\s*!==\s*'aguardando_interna'/.test(devolver),'devolução não sobrescreve estado concorrente');

const links=trecho(escritorio,'window.salvarLinkStory = async function','  window.renderStoriesCliente = async function');
exigir(links.includes('runTransaction(db')&&links.includes('urlHttpsSeguraStoryInterno'),'links são validados e gravados sem sobrescrever outro dia concorrentemente');
exigir(/\.revisaoInterna\s*!==\s*'aguardando_interna'/.test(links)&&links.includes('recibo'),'aprovar/devolver links exige estado confirmado e recibo');

const render=trecho(escritorio,'window.renderStoriesCliente = async function','  // guarda onde o painel');
exigir(render.includes('__storiesEquipeConfirmado')&&render.includes('__linksStoryDocsConfirmados'),'tela interna preserva o último retrato confirmado de roteiro e links');
exigir(/não significa que (?:os dados|os links) sumiram/i.test(render)&&!render.includes('catch(e){ console.error(\'Falha ao ler os links:\', e); window.__linksStorySemana = {};'),'falha de leitura não é convertida em lista vazia');
exigir(render.includes('urlHttpsSeguraStoryInterno')&&render.includes('escAttr(')&&render.includes('noopener noreferrer'),'links internos usam HTTPS, escape de atributo e isolamento da janela');

const regraStory=trecho(regras,'match /stories_semanais/{docId}','    match /stories_links/{docId}');
exigir(regraStory.includes('storyClientePodeAtualizar()')&&!regraStory.includes('allow update: if ehEquipe() || meuDocPermaneceMeu()'),'cliente não pode reescrever roteiro, autoria, semana ou cliente do Story');
const helperRegra=trecho(regras,'function vouCarimbarCerto()','    function acessoDentroDaVigencia');
exigir(helperRegra.includes('function storyClientePodeAtualizar')&&helperRegra.includes('affectedKeys().hasOnly'),'regra enumera somente respostas permitidas ao cliente');

const portalStories=trecho(portal,'async function carregarStories()','  /* ===== SUA PROPOSTA');
exigir(portalStories.includes('Promise.allSettled')&&portalStories.includes('__storiesPortalConfirmado'),'Portal preserva retrato confirmado e separa falha de roteiro e links');
exigir(portalStories.includes("(s.revisaoInterna || 'liberado') === 'liberado'")&&portalStories.includes("revisaoInterna==='liberado'")&&portalStories.includes('liberadoCliente===true'),'Portal só renderiza material liberado pela Amanda');
exigir(portalStories.includes('urlHttpsSeguraPortal')&&portalStories.includes('escAttr('),'Portal não abre URL de Story sem validação HTTPS');
exigir(portalStories.includes('clienteAtual.slug+\'_\'+semana'),'documento de links é isolado por cliente e semana');

for(const fonte of [escritorio,portal]){
  const scripts=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
  for(const bloco of scripts){
    if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
    else new vm.Script(bloco[2]);
  }
}
exigir(true,'HTMLs do Escritório e Portal mantêm JavaScript válido');

console.log(`RESULTADO: APROVADO (${total} asserções V86 Stories)`);
