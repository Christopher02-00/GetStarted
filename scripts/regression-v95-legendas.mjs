#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const regras=fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8');
let total=0;
function exigir(cond,mensagem){ total++; if(!cond) throw new Error('V95 LEGENDAS: '+mensagem); }
function trecho(texto,inicio,fim){
  const a=texto.indexOf(inicio),b=texto.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('V95 LEGENDAS: trecho ausente '+inicio);
  return texto.slice(a,b);
}

const salvar=trecho(escritorio,'window.salvarLegenda = async function','  /* ===================================================================');
const permissaoVideo=trecho(regras,'function podeOperarVideoProducao()','    function podePrepararLinkCalendario()');

exigir(permissaoVideo.includes('amandachamorrosm@gmail.com'),'Amanda perdeu a operação legítima de vídeo');
exigir(!permissaoVideo.includes('gabrielleromaomarketing@gmail.com'),'a correção ampliou indevidamente a permissão geral da Gabi sobre vídeos');
exigir(!salvar.includes('tx.update(videoRef'),'salvar legenda ainda tenta escrever em videos_producao e será negado para a Gabi');
exigir(
  escritorio.includes('gs-build" content="2026-08-21-financeiro-por-competencia-v103"') &&
  escritorio.includes('gs-parent-patch" content="2026-08-21-itemids-calendarios-legados-v102"'),
  'build vigente V103 e pai V102 não foram identificados para reensaiar a correção V95'
);
exigir(salvar.includes("tx.update(postagemRef,dadosLegenda)"),'a legenda deixou de ser gravada na postagem canônica');
exigir(salvar.includes("atual.status!=='aguardando_legenda'"),'a transição deixou de revalidar a etapa atual');
exigir(salvar.includes('const recibo=await getDoc(postagemRef)'),'o sucesso deixou de depender da releitura da postagem');

async function executarComoGabi(){
  const post={
    id:'post-teste',videoId:'video-teste',cliente:'cliente-teste',
    status:'aguardando_legenda',legenda:'',legendaPor:'',legendaEm:''
  };
  const video={id:'video-teste',postagemId:'post-teste',status:'aprovado'};
  const toasts=[],escritas=[];
  const snapshot=(dados)=>({exists:()=>true,data:()=>({...dados})});
  const contexto={
    window:{},console,Set,Date,String,Object,Promise,
    db:{},usuarioAtual:'Gabrielle',
    document:{getElementById:id=>id==='legenda_post-teste'?{value:'Legenda sintética confirmada'}:null},
    doc:(_db,col,id)=>({col,id}),
    getDoc:async ref=>ref.col==='postagens'?snapshot(post):snapshot(video),
    runTransaction:async(_db,fn)=>{
      const pendentes=[];
      const tx={
        get:async ref=>ref.col==='postagens'?snapshot(post):snapshot(video),
        update:(ref,dados)=>{
          if(ref.col==='videos_producao') throw new Error('permission-denied: Gabi não opera vídeos');
          pendentes.push([ref,{...dados}]);
        }
      };
      await fn(tx);
      for(const [ref,dados] of pendentes){
        escritas.push({colecao:ref.col,id:ref.id,dados});
        if(ref.col==='postagens') Object.assign(post,dados);
      }
    },
    ehClienteMultiPlataforma:()=>false,
    mostrarToast:(mensagem,tipo='ok')=>toasts.push({mensagem,tipo}),
    renderLegendasPendentes:()=>{},
    darBaixaDemandaLegenda:async()=>{},
    criarDemandaAgendamentoAutomatica:async()=>{}
  };
  contexto.window=contexto;
  vm.createContext(contexto);
  vm.runInContext(salvar,contexto);
  await Promise.all([
    contexto.window.salvarLegenda('post-teste'),
    contexto.window.salvarLegenda('post-teste')
  ]);
  return {post,video,toasts,escritas};
}

const resultado=await executarComoGabi();
exigir(resultado.post.status==='aguardando_agendamento','o clique da Gabi não avançou a postagem para a Cecília');
exigir(resultado.post.legenda==='Legenda sintética confirmada','o texto digitado não persistiu na postagem');
exigir(resultado.post.legendaPor==='Gabrielle','a autoria da legenda não foi preservada');
exigir(resultado.escritas.length===1&&resultado.escritas[0].colecao==='postagens','o clique escreveu fora da única coleção necessária');
exigir(resultado.escritas.filter(e=>e.colecao==='postagens').length===1,'duplo clique criou mais de uma transição de legenda');
exigir(resultado.video.status==='aprovado'&&resultado.video.postagemId==='post-teste','o salvamento alterou indevidamente o vídeo já aprovado');
exigir(resultado.toasts.some(t=>t.tipo==='ok'&&t.mensagem.includes('fila da Cecília')),'a confirmação visual de sucesso não foi exibida');
exigir(!resultado.toasts.some(t=>t.tipo==='erro'),'o clique terminou com erro para a Gabi');

console.log(`REGRESSÃO V95 LEGENDAS: APROVADA (${total} verificações)`);
