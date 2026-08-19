#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
let total=0;
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('V89 Stories/operação: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(inicio,fim){
  const a=escritorio.indexOf(inicio), b=escritorio.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return escritorio.slice(a,b);
}

const carga=trecho('  let __storyClientesCache = null;','  function estadoCadeiaStoriesCliente');
const render=trecho('  window.renderStoriesCliente = async function(){','  // guarda onde o painel foi desenhado por ultimo');
const troca=trecho('  function pararListenersTempoReal(','  function iniciarListenersTempoReal(){');

exigir(carga.includes('comTimeoutStoriesEquipe('),'clientes de Stories têm limite de espera real');
exigir(carga.includes('__storyClientesLeituraEmCurso'),'leituras concorrentes da carteira de Stories são unificadas');
exigir(carga.includes('__storyClientesErro'),'falha preserva estado explícito em vez de virar lista vazia');
exigir(render.includes("comTimeoutStoriesEquipe(getDocs(collection(db,'stories_links'))"),'links da equipe não carregam indefinidamente');
exigir(render.includes("comTimeoutStoriesEquipe(getDocs(collection(db,'stories_semanais'))"),'roteiros da equipe não carregam indefinidamente');
exigir(render.includes('clientesCalendarioRecorrentesConfirmados()'),'novo cliente de Story nasce da carteira mensalista confirmada');
exigir(!render.includes('const semStory = CLIENTES_LISTA.filter'),'lista geral não oferece avulsos como cliente de Story');
exigir(render.includes('urlHttpsSeguraStoryInterno(v.link||\'\')'),'tabela de links valida HTTPS antes de montar ação');
exigir(render.includes('href="${escAttr(linkSeguro)}"')&&render.includes('rel="noopener noreferrer"'),'link interno usa atributo seguro e isolamento de aba');
exigir(render.includes('data-story-link-invalido="true"'),'link legado inválido fica visível como erro, mas não clicável');
exigir(troca.includes('limparRetratosStoriesEquipe()'),'troca de papel apaga retratos de Stories da pessoa anterior');
exigir(escritorio.includes("story:entrada.incluiStories ? { slug, nome:entrada.nome")&&escritorio.includes("combinado:'Story todo dia útil — ajustar conforme o contrato.', ativo:true"),'entrada mensalista com Stories cria/reativa a identidade operacional na mesma transação');
exigir(escritorio.includes("storiesDoCliente.forEach(ref=>{ if(existe.get(ref.path)) tx.set(ref,{ativoAte:limiteAcesso")&&escritorio.includes("motivoDesativacao:'Saída efetiva do cliente'"),'saída efetiva desativa Stories por alias sem apagar histórico');
exigir(escritorio.includes("const incluiStories=saida.fichaSnapshot?.incluiStories===true||atual.incluiStories===true")&&escritorio.includes("ref.id===slug&&incluiStories"),'reativação recupera somente a identidade canônica quando o contrato confirma Stories');
exigir(portal.includes("const temCampoStories=typeof dados.incluiStories==='boolean'")&&portal.includes("incluiStories:!somenteEdicao && (temCampoStories ? dados.incluiStories===true : temHistoricoStories!==false)"),'Portal usa a ficha explícita como fonte e conserva apenas a compatibilidade histórica de cadastros antigos');

console.log(`REGRESSÃO V89 STORIES/OPERAÇÃO: APROVADA (${total} verificações)`);
