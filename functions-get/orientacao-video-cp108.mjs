import {resolverProgramacaoCp111} from './compat-legado-programacao-r83.mjs';
import {hashPedidoI165,refOperacaoI165,conferirReciboPedidoI165} from './intencao-operacao.mjs';
import {listarOpcoesCampanhaTxI165,escolherCampanhaTxI165,compromissoSelecionadoI165} from './campanhas.mjs';
import {exigirI165,idFisicoI165,instanteI165,jsonCanonicoI165,entregaSemPostagemI165} from './lib/gs-contexto-operacional-i165.mjs';
import {normalizarDiretrizI165,identidadeMaterialI165,assinaturaEntregaI165,assinaturaDiretrizI165,conferirDiretrizAtualI165,conferirVinculoCanonicoI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {identidadeTokenI165,contextoTxI165,clienteTxI165,hashI165} from './contexto.mjs';
import {lerOrigemProgramacaoTxCp111,compromissoVideoTxI165} from './fontes.mjs';

const atorAmanda=(auth,d)=>{const a=identidadeTokenI165(auth,d.papelOperado,d.sessao||'orientacao_video_cp108');exigirI165(a.papel==='Amanda','papel','A Amanda combina data, semana, prazo e prioridade. A qualidade permanece com o Chris.');return a;};
const camposVideo=['id','cliente','clienteNome','empresaOtavio','calendarClienteSlug','calendarCompetencia','calendarItemId','titulo','editorAtribuido','linkFinalizado','enviadoEm','status','aprovadoPor','aprovadoInternoEm','clienteAprovou','ultimaCorrecaoSolicitada'];
const selecionar=v=>Object.fromEntries(camposVideo.filter(k=>v[k]!==undefined).map(k=>[k,v[k]]));
const fora=(video,motivo)=>({video,foraDoFluxo:true,motivo,pendente:false});
async function fonteOrientacaoTx(db,tx,id,agora){
 const s=await tx.get(db.doc('videos_producao/'+id));exigirI165(s.exists,'video','O vídeo não existe mais.');const video={...s.data(),id:s.id};
 if(video.excluido===true||video.arquivado||!['aguardando_cliente','aprovado'].includes(video.status))return fora(video,'A qualidade ou a operação deste vídeo está em outra etapa. Nenhuma aprovação será reaberta.');
 exigirI165(typeof video.linkFinalizado==='string'&&video.linkFinalizado.trim(),'entrega','A entrega atual precisa estar disponível para organizar a postagem.');
 const cliente=await clienteTxI165(db,tx,video.cliente,agora);
 if(!cliente.clienteAtivo)return fora(video,'O cliente saiu da operação; nenhuma postagem foi reativada.');
 if(entregaSemPostagemI165(video,cliente.config))return fora(video,'Esta entrega é direta ou pontual e não precisa de organização de postagem.');
 const postSnap=video.postagemId?await tx.get(db.doc('postagens/'+video.postagemId)):null;
 exigirI165(!video.postagemId||postSnap?.exists,'postagem','A postagem vinculada não foi confirmada. Não será criada uma substituta.');
 const post=postSnap?.exists?{...postSnap.data(),id:postSnap.id}:null;
 if(post){conferirVinculoCanonicoI165(post,video);if(post.excluido===true||post.arquivado||!['aguardando_legenda','aguardando_agendamento'].includes(post.status))return fora(video,'O agendamento, publicação ou retirada já avançou. Use o fluxo correspondente, sem reabrir esta aprovação.');}
 const [ds,origemAtual,campanha]=await Promise.all([tx.get(db.doc('video_programacao_i165/'+id)),lerOrigemProgramacaoTxCp111(db,tx,video),compromissoVideoTxI165(db,tx,video)]);
 const origem={tipo:origemAtual.tipo,assinatura:origemAtual.assinatura};
 const diretriz=ds.data()||null,assinaturaEsperada=hashI165({video,post,diretriz,origem,campanha});
 const programacaoCp111=resolverProgramacaoCp111({diretriz,origem:origemAtual,campanha});
 let pendente=!programacaoCp111.disponivel,motivo=pendente?programacaoCp111.motivo:programacaoCp111.modo==='orientacao_amanda'?'A orientação explícita da Amanda está preservada.':programacaoCp111.protegida?'A data específica já está na origem. Amanda pode conferir ou decidir uma exceção.':'Cecília usa a origem do calendário ou organiza a data na fila; Amanda pode orientar quando necessário.';
 if(diretriz)try{const p=conferirDiretrizAtualI165(diretriz,video,post);exigirI165(!diretriz.origemConferida||jsonCanonicoI165(diretriz.origemConferida)===jsonCanonicoI165(origem),'origem-avancou','A origem mudou.');exigirI165((diretriz.compromisso||'')===(campanha.compromisso?jsonCanonicoI165(campanha.compromisso):'')&&(diretriz.decisaoCompromisso||'')===(campanha.decisao?jsonCanonicoI165(campanha.decisao):''),'campanha-avancou','A campanha mudou.');if(p.modalidade==='a_definir'&&!pendente)motivo='Cecília usa a origem do calendário ou organiza a data na fila; a orientação anterior ainda não fixava um dia.';}catch{pendente=true;motivo='O material, a origem ou a campanha mudou. A Amanda precisa reconferir a orientação.';}
 return {video,post,diretriz,origem,campanha,cliente,assinaturaEsperada,pendente,motivo,foraDoFluxo:false};
}

// O mapa vive somente neste callback transacional; queries e opções não entram nele.
function leituraDocumentosCallbackCp108(tx){
 const documentos=new Map();
 return {get(ref,...opcoes){
  const documento=ref&&typeof ref.path==='string'&&typeof ref.id==='string'&&typeof ref.collection==='function';
  if(!documento||opcoes.length)return tx.get(ref,...opcoes);
  if(!documentos.has(ref.path))documentos.set(ref.path,Promise.resolve().then(()=>tx.get(ref)));
  return documentos.get(ref.path);
 }};
}

export async function prepararOrientacaoVideoCp108(db,auth,dados,{agora=new Date()}={}){
 const ator=atorAmanda(auth,dados);
 if(Object.hasOwn(dados,'videoIds')){
  exigirI165(!Object.hasOwn(dados,'videoId')&&Array.isArray(dados.videoIds)&&dados.videoIds.length<=20&&dados.videoIds.every(idFisicoI165)&&new Set(dados.videoIds).size===dados.videoIds.length,'lista','Confira até20 vídeos físicos diferentes nesta página.');
  return db.runTransaction(async txOriginal=>{
   const tx=leituraDocumentosCallbackCp108(txOriginal),linhas=[],erros=[];
   const erro=(id,e)=>({videoId:id,codigo:e.code||'i165/fonte-indisponivel',mensagem:'Não consegui conferir este vídeo. A fonte e a aprovação anteriores foram preservadas.'});
   try{await contextoTxI165(db,tx,ator,'programacao');}catch(e){return {linhas,erros:dados.videoIds.map(id=>erro(id,e)),idsConferidos:[...dados.videoIds],consultaCompleta:true,nenhumaEscrita:true,fluxoCp108:'orientacao_amanda'};}
   for(let inicio=0;inicio<dados.videoIds.length;inicio+=4){
    const grupo=await Promise.all(dados.videoIds.slice(inicio,inicio+4).map(async id=>{
     try{const f=await fonteOrientacaoTx(db,tx,id,agora);return {linha:{videoId:id,titulo:String(f.video.titulo||'Conteúdo'),cliente:String(f.video.cliente||''),clienteNome:String(f.video.clienteNome||''),empresaOtavio:String(f.video.empresaOtavio||''),pendente:f.pendente,foraDoFluxo:f.foraDoFluxo,motivo:f.motivo}};}catch(e){return {erro:erro(id,e)};}
    }));
    for(const resultado of grupo)if(resultado.erro)erros.push(resultado.erro);else linhas.push(resultado.linha);
   }
   return {linhas,erros,idsConferidos:[...dados.videoIds],consultaCompleta:true,nenhumaEscrita:true,fluxoCp108:'orientacao_amanda'};
  });
 }
 exigirI165(idFisicoI165(dados.videoId),'video','Reabra o vídeo físico.');
 return db.runTransaction(async tx=>{await contextoTxI165(db,tx,ator,'programacao');const f=await fonteOrientacaoTx(db,tx,dados.videoId,agora);
  if(f.foraDoFluxo)return {video:selecionar(f.video),foraDoFluxo:true,diretrizNecessaria:false,fluxoCp108:'orientacao_amanda',motivo:f.motivo,nenhumaEscrita:true};
  const opcoes=f.campanha.compromisso?{opcoesCampanha:[],campanhasSemOpcao:[],consultaCompleta:true}:await listarOpcoesCampanhaTxI165(db,tx,f.video);
  return {video:selecionar(f.video),assinaturaEsperada:f.assinaturaEsperada,diretrizAnterior:f.diretriz,compromisso:f.campanha.compromisso,...opcoes,origemConferida:f.origem,pendente:f.pendente,motivo:f.motivo,fluxoCp108:'orientacao_amanda',diretrizNecessaria:true,orientacaoOpcional:!f.pendente,nenhumaEscrita:true,cancelamentoAtomicoDisponivel:true,qualidadePreservada:true,clientePreservado:true,lidoEm:instanteI165(agora)};
 });
}

export async function salvarOrientacaoVideoCp108(db,auth,dados,{agora=new Date()}={}){
 const ator=atorAmanda(auth,dados),em=instanteI165(agora);
 exigirI165(idFisicoI165(dados.videoId)&&idFisicoI165(dados.operacaoId),'intencao','Confira o vídeo e a mesma tentativa de orientação.');
 const politica=normalizarDiretrizI165(dados.diretriz);exigirI165(politica.urgencia==='normal'||politica.observacao,'urgencia-motivo','Conte por que este conteúdo precisa de prioridade.');
 const pedidoHash=hashPedidoI165(ator,dados),rr=refOperacaoI165(db,ator,dados.operacaoId);
 return db.runTransaction(async tx=>{
  const {cfg,ctx}=await contextoTxI165(db,tx,ator,'programacao'),rs=await tx.get(rr);
  if(rs.exists){exigirI165(rs.data().estado==='cancelada'||rs.data().tipo==='orientacao_video_cp108','operacao-reutilizada','Esta tentativa pertence a outra ação anterior.');return {...conferirReciboPedidoI165(rs.data(),ator,pedidoHash),videoPreservado:true,postagemPreservada:true,fluxoCp108:'orientacao_amanda'};}
  const f=await fonteOrientacaoTx(db,tx,dados.videoId,agora);exigirI165(!f.foraDoFluxo,'estado-video',f.motivo);
  exigirI165(f.assinaturaEsperada===dados.assinaturaEsperada&&jsonCanonicoI165(f.campanha.compromisso)===jsonCanonicoI165(dados.compromissoEsperado),'versao','O vídeo, o cliente ou a orientação mudou desde sua conferência. Seus campos foram preservados; confira novamente.');
  const selecao=await escolherCampanhaTxI165(db,tx,f.video,dados.campanhaEscolhida,ator,em),campanha=selecao?{compromisso:compromissoSelecionadoI165(f.video,selecao),decisao:null}:f.campanha,cp=campanha.compromisso;
  if(cp)exigirI165(politica.modalidade==='data'&&politica.data===cp.data&&politica.hora&&(!cp.hora||politica.hora===cp.hora),'campanha-data','Mantenha a data física da campanha e informe o horário. Uma troca de compromisso tem decisão própria.');
  exigirI165(!f.diretriz||Number.isInteger(f.diretriz.revisao)&&f.diretriz.revisao>0,'diretriz-anterior','A versão anterior precisa de conferência antes da alteração.');
  const diretriz={schema:1,...identidadeMaterialI165(f.video),politica,revisao:(f.diretriz?.revisao||0)+1,operacaoId:dados.operacaoId,assinaturaEntrega:assinaturaEntregaI165(f.video),assinaturaVideoConferido:jsonCanonicoI165(f.video),compromisso:cp?jsonCanonicoI165(cp):'',decisaoCompromisso:campanha.decisao?jsonCanonicoI165(campanha.decisao):'',origemConferida:f.origem,autoria:{uid:ctx.uid,papel:ctx.papel,atorReal:ctx.atorReal},em,ativacaoId:cfg.ativacaoId,tipo:'orientacao_video_cp108'};
  const recibo={schema:1,tipo:'orientacao_video_cp108',estado:'confirmada',operacaoId:dados.operacaoId,videoId:f.video.id,pedidoHash,revisaoDiretriz:diretriz.revisao,assinaturaDiretriz:assinaturaDiretrizI165(diretriz),autoria:diretriz.autoria,em,semReaprovarQualidade:true,semReaprovarCliente:true};
  const ref=db.doc('video_programacao_i165/'+f.video.id);if(selecao?.gravar)tx.set(selecao.ref,selecao.vinculo);tx.set(ref,diretriz);tx.set(ref.collection('versoes').doc(String(diretriz.revisao)),diretriz);tx.set(rr,recibo);
  return {estado:'novo',diretriz,recibo,requerLeituraAtual:true,videoPreservado:true,postagemPreservada:true,semReaprovarQualidade:true,semReaprovarCliente:true,fluxoCp108:'orientacao_amanda'};
 });
}
