#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raizPadrao=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const raiz=path.resolve(process.argv[2]||raizPadrao);
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const calendario=ler('calendario.html');
const calendarios=ler('calendarios.html');
const escritorio=ler('escritorio.html');
const regras=ler('firestore.rules');
let total=0;
const falhas=[];
function verificar(condicao,mensagem,detalhe=''){
  total++;
  if(condicao) console.log(`ok ${total} - ${mensagem}`);
  else{falhas.push({mensagem,detalhe});console.error(`not ok ${total} - ${mensagem}${detalhe?' — '+detalhe:''}`);}
}
function entre(texto,inicio,fim){
  const a=texto.indexOf(inicio),b=texto.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error(`V114: trecho ausente: ${inicio}`);
  return texto.slice(a,b);
}

verificar(calendario===calendarios,'aliases singular/plural permanecem byte a byte idênticos');
verificar(calendario.includes('2026-08-25-legenda-editorial-fila-cecilia-v114')||calendario.includes('2026-08-25-continuidade-calendario-gravacao-v115'),'calendário preserva o contrato V114 no build cumulativo');
verificar(escritorio.includes('2026-08-25-legenda-editorial-fila-cecilia-v114')||escritorio.includes('2026-08-25-continuidade-calendario-gravacao-v115'),'Escritório preserva o contrato V114 no build cumulativo');
verificar(calendario.includes('Caminho da legenda:'),'Gabi recebe explicação visível do caminho');
verificar(calendario.includes('confirmarConteudoAntesDoEnvio()'),'ponte só roda depois de o calendário ser confirmado');
verificar(calendario.includes("legendaOrigem:'calendario_editorial_v114'"),'postagem recebe origem auditável');
verificar(calendario.includes("calendarItemId:String(item?.itemId||'')||null"),'escrita preserva identidade canônica do item');
verificar(!entre(calendario,'function classificarVinculoLegendaEditorialV114','window.classificarVinculoLegendaEditorialV114').match(/name|titulo|título|\.day/),'vínculo nunca usa título, nome ou dia');
verificar(escritorio.includes('Fila da Cecília indisponível')&&escritorio.includes('Isso não significa que não existam legendas'),'erro de leitura não vira fila vazia');
verificar(/catch\(e\)\{ console\.error\('Falha ao contar a fila:', e\); return null; \}/.test(escritorio),'contador indisponível não retorna zero');
verificar(regras.includes("match /postagens/{docId}")&&regras.includes('allow create, update: if ehEquipe()'),'regra vigente já permite a transição autenticada da equipe');

const runtimeCalendario=entre(calendario,'function normalizarSlugLegendaV114','async function saveItem()');
const contextoCal={console,Date,String,Number,Object,Array,Map,Promise,Error,structuredClone,window:{},mensagens:[]};
contextoCal.avisarTela=(mensagem,tipo='ok')=>contextoCal.mensagens.push({mensagem,tipo});
contextoCal.window=contextoCal;
vm.createContext(contextoCal);
vm.runInContext(runtimeCalendario,contextoCal);

const itemModerno={itemId:'calitem-camargos-01',legenda:'Legenda confirmada para o post',legendaAtualizadaEm:'2026-08-24T15:00:00.000Z'};
const basePost={id:'post-camargos-01',videoId:'video-camargos-01',cliente:'camargos',calendarClienteSlug:'camargos',calendarItemId:itemModerno.itemId,calendarItemIdx:3,status:'aguardando_legenda',legenda:''};
let classificado=contextoCal.classificarVinculoLegendaEditorialV114(itemModerno,3,'camargos',[basePost]);
verificar(classificado.estado==='pronta_para_enviar'&&classificado.origem==='itemId','itemId moderno encontra uma postagem exata');
classificado=contextoCal.classificarVinculoLegendaEditorialV114(itemModerno,3,'camargos',[{...basePost,calendarItemId:'',calendarItemIdx:3}]);
verificar(classificado.estado==='aguardando_video','item moderno nunca cai para o índice legado');
classificado=contextoCal.classificarVinculoLegendaEditorialV114({legenda:'Legado'},3,'camargos',[{...basePost,calendarItemId:'',calendarItemIdx:3}]);
verificar(classificado.estado==='pronta_para_enviar'&&classificado.origem==='indice_legado','item realmente legado usa índice exato e cliente exato');
classificado=contextoCal.classificarVinculoLegendaEditorialV114(itemModerno,3,'camargos',[basePost,{...basePost,id:'post-duplicado'}]);
verificar(classificado.estado==='ambiguo'&&classificado.total===2,'duplicidade exata é bloqueada sem escolha silenciosa');
classificado=contextoCal.classificarVinculoLegendaEditorialV114(itemModerno,3,'camargos',[{...basePost,cliente:'outro',calendarClienteSlug:'outro'}]);
verificar(classificado.estado==='aguardando_video','cliente diferente não é associado');
classificado=contextoCal.classificarVinculoLegendaEditorialV114(itemModerno,3,'camargos',[{...basePost,excluido:true}]);
verificar(classificado.estado==='aguardando_video','soft-delete não volta para a fila');
classificado=contextoCal.classificarVinculoLegendaEditorialV114(itemModerno,3,'camargos',[{...basePost,status:'agendado'}]);
verificar(classificado.estado==='ja_avancada','estado posterior é reconhecido sem regressão');

function snapDoc(id,dados){return {id,exists:()=>dados!==null,data:()=>structuredClone(dados)};}
function snapLista(lista){return {forEach(fn){for(const d of lista) fn(snapDoc(d.id,d));}};}
const estado={
  postagens:new Map([[basePost.id,structuredClone(basePost)]]),
  videos:new Map([[basePost.videoId,{id:basePost.videoId,cliente:'camargos',calendarClienteSlug:'camargos',calendarItemId:itemModerno.itemId,calendarItemIdx:3,clienteAprovou:true,status:'aprovado',postagemId:basePost.id}]]),
  transacoes:0,escritas:[]
};
contextoCal.window.__modoCal='equipe';
contextoCal.window.__papelCalendarioEquipe='Gabrielle';
contextoCal.window.__clienteId='camargos';
contextoCal.window.__fb={
  db:{},collection:(_db,nome)=>({nome}),where:(campo,op,valor)=>({campo,op,valor}),query:(colecao,filtro)=>({colecao,filtro}),
  doc:(_db,colecao,id)=>({colecao,id,path:`${colecao}/${id}`}),
  async getDocs(){return snapLista([...estado.postagens.values()]);},
  async runTransaction(_db,executar){
    estado.transacoes++;
    const tx={
      async get(ref){
        const dados=ref.colecao==='postagens'?estado.postagens.get(ref.id):estado.videos.get(ref.id);
        return snapDoc(ref.id,dados||null);
      },
      update(ref,patch){
        estado.escritas.push({path:ref.path,patch:structuredClone(patch)});
        if(ref.colecao==='postagens') estado.postagens.set(ref.id,{...estado.postagens.get(ref.id),...structuredClone(patch)});
      }
    };
    return executar(tx);
  },
  async getDoc(ref){
    const dados=ref.colecao==='postagens'?estado.postagens.get(ref.id):estado.videos.get(ref.id);
    return snapDoc(ref.id,dados||null);
  }
};
const envio=await contextoCal.sincronizarLegendaEditorialComCeciliaV114(itemModerno,3);
verificar(envio.estado==='enviada'&&estado.postagens.get(basePost.id).status==='aguardando_agendamento','salvamento confirmado avança a postagem exata para Cecília');
verificar(estado.postagens.get(basePost.id).legenda===itemModerno.legenda&&estado.postagens.get(basePost.id).legendaPor==='Gabrielle','texto, autoria e data persistem na postagem');
verificar(estado.escritas.length===1&&estado.escritas[0].path===`postagens/${basePost.id}`,'ponte escreve somente uma postagem');
const retry=await contextoCal.sincronizarLegendaEditorialComCeciliaV114(itemModerno,3);
verificar(retry.estado==='ja_avancada'&&estado.transacoes===1&&estado.escritas.length===1,'retry não duplica nem regride a transição');

estado.postagens.set(basePost.id,structuredClone(basePost));
estado.videos.set(basePost.videoId,{...estado.videos.get(basePost.videoId),calendarItemId:'outro-item'});
const antesFalha=estado.escritas.length;
let falhaIdentidade='';
try{await contextoCal.sincronizarLegendaEditorialComCeciliaV114(itemModerno,3);}catch(e){falhaIdentidade=String(e.message||e);}
verificar(falhaIdentidade.includes('não confirmou cliente, conteúdo e aprovação')&&estado.escritas.length===antesFalha,'vídeo divergente bloqueia a passagem sem escrita');

const runtimeEscritorio=entre(escritorio,'async function localizarPostagemExistenteDoVideo','  window.marcarClienteAprovouVideo');
async function cenarioAprovacao({legenda=true,direta=false}={}){
  const video={cliente:'camargos',clienteNome:"Camargo's",titulo:'Conteúdo 1',linkFinalizado:'https://drive.exemplo/video',calendarClienteSlug:'camargos',calendarItemId:'calitem-camargos-01',calendarItemIdx:3,status:'aguardando_cliente',postagemId:'',aprovadoPor:'Amanda',aprovadoInternoEm:'2026-08-23T10:00:00.000Z'};
  const calendarioDados={items:[{itemId:'calitem-camargos-01',legenda:legenda?'Legenda planejada':'',legendaAtualizadaPor:'Gabrielle',legendaAtualizadaEm:'2026-08-24T15:00:00.000Z'}]};
  const gravacoes=[],logs=[];
  const posts=new Map();
  const ctx={console,Date,String,Number,Object,Array,Promise,Error,structuredClone,window:{},db:{},
    doc:(_db,colecao,id)=>({colecao,id,path:`${colecao}/${id}`}),
    collection:(_db,colecao)=>({colecao}),where:(...a)=>a,query:(...a)=>a,
    getDocs:async()=>({docs:[]}),
    getDoc:async ref=>{
      if(ref.colecao==='videos_producao') return snapDoc(ref.id,video);
      if(ref.colecao==='calendarios') return snapDoc(ref.id,calendarioDados);
      if(ref.colecao==='postagens') return snapDoc(ref.id,posts.get(ref.id)||null);
      return snapDoc(ref.id,null);
    },
    updateDoc:async(ref,patch)=>{gravacoes.push({tipo:'update',path:ref.path,patch});if(ref.colecao==='videos_producao') Object.assign(video,patch);},
    runTransaction:async(_db,executar)=>{
      const tx={
        async get(ref){
          if(ref.colecao==='videos_producao') return snapDoc(ref.id,video);
          if(ref.colecao==='postagens') return snapDoc(ref.id,posts.get(ref.id)||null);
          return snapDoc(ref.id,null);
        },
        set(ref,dados){gravacoes.push({tipo:'set',path:ref.path,dados:structuredClone(dados)});posts.set(ref.id,structuredClone(dados));},
        update(ref,patch){gravacoes.push({tipo:'update',path:ref.path,patch:structuredClone(patch)});if(ref.colecao==='videos_producao') Object.assign(video,patch);}
      };
      return executar(tx);
    },
    escolherPostagemCanonicaPorVideo:()=>null,
    idPostagemDeterministicaDoVideo:id=>'postagem_video_'+id,
    postagemEhDeclaracaoSemPauta:()=>false,
    ehTrabalhoExternoVideo:()=>false,
    obterConfigCliente:async()=>({tipoEntrega:direta?'entrega_direta':'postagem'}),
    ehVideoDeTrafego:()=>false,ehClienteSoEdicao:()=>false,
    serverTimestamp:()=>({servidor:true}),
    registrarHistorico:(...a)=>logs.push(['historico',...a]),registrarLogAutomacao:(...a)=>logs.push(['log',...a]),
    criarDemandaAgendamentoAutomatica:async id=>logs.push(['fila',id])
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(runtimeEscritorio,ctx);
  const resultado=await ctx.confirmarAprovacaoClienteCore('video-01','Amanda');
  await Promise.resolve();
  return {resultado,video,posts,gravacoes,logs};
}
const aprovadoComLegenda=await cenarioAprovacao({legenda:true});
const postCriado=aprovadoComLegenda.posts.get('postagem_video_video-01');
verificar(postCriado?.status==='aguardando_agendamento'&&postCriado?.legenda==='Legenda planejada','aprovação futura cria postagem já pronta para Cecília');
verificar(postCriado?.calendarItemId==='calitem-camargos-01'&&postCriado?.legendaOrigem==='calendario_editorial_v114','aprovação preserva identidade e origem da legenda');
verificar(aprovadoComLegenda.logs.some(l=>l[0]==='fila'&&l[1]==='postagem_video_video-01'),'entrada na fila recebe confirmação auxiliar idempotente');
const aprovadoSemLegenda=await cenarioAprovacao({legenda:false});
verificar(aprovadoSemLegenda.posts.get('postagem_video_video-01')?.status==='aguardando_legenda','sem legenda planejada o fluxo antigo da Gabi é preservado');
const entregaDireta=await cenarioAprovacao({legenda:true,direta:true});
verificar(entregaDireta.resultado==='finalizado'&&entregaDireta.posts.size===0,'entrega direta continua fora de legenda e agendamento');

console.log(`\nV114 legenda editorial → Cecília: ${total-falhas.length}/${total} verificações aprovadas.`);
if(falhas.length){
  for(const falha of falhas) console.error(` - ${falha.mensagem}${falha.detalhe?': '+falha.detalhe:''}`);
  process.exitCode=1;
}
