import {faseAvisoI165,preservarCanalIncertoI165} from './lib/gs-cadencia-avisos-i165.mjs';
import {exigirI165,idFisicoI165,jsonCanonicoI165,instanteI165,programacaoAtivaI165,horarioBrasiliaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {assinaturaDiretrizI165,chaveExcecaoI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {reconciliarEpisodioEdicaoI165,obrigacaoEdicaoI165,obrigacoesConteudoI165} from './lib/gs-obrigacoes-operacionais-i165.mjs';
import {ESCOPO_I165,hashI165,clienteTxI165} from './contexto.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
const indiceRef=(db,colecao,id)=>db.doc('programacao_indices_i165/'+hashI165([colecao,id]));
const refAviso=(db,chave)=>db.doc('notificacoes_operacionais_i165/'+hashI165([ESCOPO_I165,chave]));
async function cfgTx(db,tx,habilidade){const s=await tx.get(db.doc('programacao_config_i165/ativo'));return programacaoAtivaI165(s.data())&&s.data().habilidades?.[habilidade]===true?s.data():null;}

function visaoPost(f) {
 const c=f.controle,post={...f.post};
 post.excecoesProgramacaoI165={};post.conferenciasPublicacaoI165={};
 if(c?.assinaturaDiretriz===assinaturaDiretrizI165(f.diretriz)){
  const redes=post.publicacaoStokki?.versao===1?post.publicacaoStokki.selecionadas:['geral'];
  for(const rede of redes){const r=rede==='geral'?{data:post.dataAgendada||'',hora:post.horaAgendada||''}:post.publicacaoStokki.redes?.[rede];if(r){const k=chaveExcecaoI165({acao:'agendar',data:r.data||'',hora:r.hora||'',rede});post.excecoesProgramacaoI165[rede]=c.excecoes?.[k]||null;}const x=c.conferenciasPublicacao?.[rede];if(x)post.conferenciasPublicacaoI165[rede]={...x,motivo:x.motivo||x.observacao||''};}
 }
 return post;
}
export function projetarPostagemServidorI165(f,cfg,agora){
 exigirI165(typeof cfg.permitirAgendarSemLegendaI90==='boolean','i90','O serviço precisa confirmar a política I90 vigente.');
 if(f.post.publicacaoStokki?.versao!==1&&['cancelada_manual','arquivada_sem_postagem','finalizado'].includes(f.post.status))return {estado:'encerrado_sem_pendencia_de_programacao',motivo:'estado_terminal_fisico',postagemId:f.post.id,obrigacoes:[]};
 return obrigacoesConteudoI165({postagem:f.diretriz?visaoPost(f):f.post,video:f.video,diretriz:f.diretriz,configEntrega:f.configEntrega,clienteAtivo:f.clienteAtivo,processoEditorial:f.processoEditorial,permitirAgendarSemLegendaI90:cfg.permitirAgendarSemLegendaI90,agora});
}
function textoAviso(o,fonte){
 const titulos={editar_video:'Um vídeo chegou para edição',corrigir_video:'Tem um ajuste de vídeo para conferir',preparar_legenda:'Tem uma legenda esperando por você',programar:'Conteúdo liberado para agendar',confirmar_publicacao:'Pode conferir esta publicação?',definir_compromisso:'Falta combinar a data deste conteúdo',conferir_publicacao_divergente:'Pode conferir a data da publicação?',conferir_agendamento_divergente:'Pode conferir esta data agendada?',conferir_publicacao_legada:'Pode conferir esta publicação anterior?',definir_responsavel_correcao:'Pode conferir quem vai fazer este ajuste?'};
 return {titulo:titulos[o.tipo]||'Tem um conteúdo para conferir',texto:(fonte.clienteNome||fonte.cliente||'Conteúdo')+' · '+(fonte.titulo||'Conteúdo')+(o.prazo?' · prazo '+o.prazo.replace('T',' às '):'')+'. Abra o sistema para conferir o passo atual.'};
}
async function materializarTx(db,tx,colecao,id,fonte,obrigacoes,em,cfg,{preservar=false}={}){
 const ir=indiceRef(db,colecao,id),is=await tx.get(ir),prev=is.data()||{},antIds=prev.avisos||[];
 exigirI165(Array.isArray(antIds)&&antIds.length<=100&&antIds.every(idFisicoI165),'indice','O índice de avisos precisa de conferência.');
 if(preservar)return {preservadas:antIds.length,criadas:0};
 const atuais=obrigacoes.map(o=>({o,ref:refAviso(db,o.chave)})),refs=[...new Map([...antIds.map(x=>db.doc('notificacoes_operacionais_i165/'+x)),...atuais.map(x=>x.ref)].map(r=>[r.path,r])).values()];
 const snaps=await Promise.all(refs.map(r=>tx.get(r))),map=new Map(snaps.map(s=>[s.id,s]));
 const vivos=new Set(atuais.map(x=>x.ref.id));
 for(const aid of antIds){const a=map.get(aid);if(a?.exists&&!vivos.has(aid)&&a.data().escopo===ESCOPO_I165&&a.data().fonte?.colecao===colecao&&a.data().fonte.id===id)tx.update(a.ref,{estado:'resolvida',resolvidaEm:em,motivoResolucao:'A fonte física foi conferida e avançou.'});}
 for(const {o,ref} of atuais){
  const ant=map.get(ref.id)?.data(),faseAviso=faseAvisoI165(o,horarioBrasiliaI165(em)),abertura=(ant?.aberturaAviso||1)+(ant?.estado==='resolvida'?1:0),versao=hashI165({tipo:o.tipo,chave:o.chave,prazo:o.prazo||'',urgencia:o.urgencia||'normal',bloqueada:!!o.bloqueada,faseAviso,abertura});
  exigirI165(!ant||ant.escopo===ESCOPO_I165&&ant.fonte?.colecao===colecao&&ant.fonte.id===id,'aviso-colisao','O identificador já pertence a outra origem.');
  const texto=textoAviso(o,fonte),view={schema:1,escopo:ESCOPO_I165,id:ref.id,fonte:{colecao,id},chaveObrigacao:o.chave,tipo:o.tipo,destinatario:o.destinatario,rede:o.rede||'geral',versao,faseAviso,aberturaAviso:abertura,estado:'pendente',bloqueada:!!o.bloqueada,prazo:o.prazo||'',urgencia:o.urgencia||'normal',...texto,link:{area:colecao==='videos_producao'?'meus_videos':o.tipo==='preparar_legenda'?'legendas':'agendar',videoId:colecao==='videos_producao'?id:o.videoId||'',postagemId:colecao==='postagens'?id:'',rede:o.rede||'geral'},ativacaoId:cfg.ativacaoId,conferidaEm:em};
  if(ant&&ant.versao!==versao)tx.set(ref.collection('versoes').doc(ant.versao),ant);
  const incertos=Object.fromEntries(['push','email'].map(c=>[c,preservarCanalIncertoI165(ant?.canais?.[c])]).filter(([,v])=>v));
  // Repor o retrato lido na TX preserva campos antigos e substitui o mapa de canais inteiro.
  // merge:true com um canal incerto manteria o aceite do outro canal da fase anterior.
  tx.set(ref,{...(ant||{}),...view,criadaEm:ant?.criadaEm||em,canais:ant?.versao===versao?ant.canais||{}:incertos,pushTentativaI165:ant?.versao===versao||incertos.push?ant?.pushTentativaI165||'':'',emailTentativaI165:ant?.versao===versao||incertos.email?ant?.emailTentativaI165||'':'',leituras:ant?.leituras||{}});
 }
 tx.set(ir,{schema:1,escopo:ESCOPO_I165,fonte:{colecao,id},avisos:[...vivos],atualizadoEm:em});
 return {criadas:atuais.length,encerradas:antIds.filter(x=>!vivos.has(x)).length};
}
export async function sincronizarVideoI165(db,id,{agora=new Date(),eventoId='',antes=null,depoisEvento=null}={}){
 exigirI165(idFisicoI165(id),'video','Vídeo inválido.');const em=instanteI165(agora);
 return db.runTransaction(async tx=>{
  const cfg=await cfgTx(db,tx,'edicao');if(!cfg)return {ativa:false};
  const [vs,es,ls]=await Promise.all([tx.get(db.doc('videos_producao/'+id)),tx.get(db.doc('programacao_episodios_i165/'+id)),tx.get(db.doc('programacao_legado_edicao_i165/'+id))]);
  const atual=vs.exists?{...vs.data(),id}: {id,excluido:true};
  if(vs.exists){const cliente=await clienteTxI165(db,tx,atual.cliente,em);if(!cliente.clienteAtivo)return materializarTx(db,tx,'videos_producao',id,atual,[],em,cfg,{preservar:true});}
  const eventoAtual=depoisEvento&&jsonCanonicoI165({...depoisEvento,id})===jsonCanonicoI165(atual);
  const r=reconciliarEpisodioEdicaoI165({anterior:eventoAtual&&antes?{...antes,id}:null,atual,episodioPersistido:es.data()||null,eventoId:eventoAtual?eventoId:'',observacaoLegado:ls.data()||null,agora:em});
  const obrigacoes=r.atual?obrigacaoEdicaoI165(atual,r.atual):[];
  const notas=await materializarTx(db,tx,'videos_producao',id,atual,obrigacoes,em,cfg);
  if(r.atual)tx.set(db.doc('programacao_episodios_i165/'+id),r.atual);
  else if(es.exists)tx.set(es.ref,{...es.data(),estado:'encerrado',encerradoEm:em});
  return {ativa:true,episodio:r.estado,...notas};
 });
}
export async function sincronizarPostagemI165(db,id,{agora=new Date()}={}){
 exigirI165(idFisicoI165(id),'postagem','Postagem inválida.');const em=instanteI165(agora);
 return db.runTransaction(async tx=>{
  const cfg=await cfgTx(db,tx,'programacao');if(!cfg)return {ativa:false};
  const ps=await tx.get(db.doc('postagens/'+id));
  if(!ps.exists)return materializarTx(db,tx,'postagens',id,{id},[],em,cfg);
  const f=await fontesPostagemTxI165(db,tx,id,em),projecao=projetarPostagemServidorI165(f,cfg,em);
  // The actual video episode owns an editing alert. Its post remains visible in the queue without a second email/push.
  const obr=projecao.obrigacoes.filter(o=>!(f.video&&o.tipo==='corrigir_video'));
  const notas=await materializarTx(db,tx,'postagens',id,f.post,obr,em,cfg,{preservar:!f.clienteAtivo});
  if(f.diretriz){const assinatura=assinaturaDiretrizI165(f.diretriz),mesma=f.controle?.assinaturaDiretriz===assinatura;tx.set(db.doc('programacao_controles_i165/'+id),{schema:1,postagemId:id,videoId:f.video?.id||'',cliente:f.post.cliente,empresaOtavio:f.post.empresaOtavio||'',diretriz:f.diretriz,assinaturaDiretriz:assinatura,revisao:f.diretriz.revisao,excecoes:mesma?f.controle.excecoes||{}:{},conferenciasPublicacao:f.controle?.conferenciasPublicacao||{},ativacaoId:cfg.ativacaoId,atualizadoEm:em});}
  return {ativa:true,estado:projecao.estado,...notas};
 });
}
export async function fontePendenteTxI165(db,tx,nota,{agora=new Date()}={}){
 exigirI165(nota?.escopo===ESCOPO_I165&&['videos_producao','postagens'].includes(nota.fonte?.colecao)&&idFisicoI165(nota.fonte?.id),'escopo','Este serviço acompanha somente seus próprios avisos com fonte física confirmada.');
  const cfg=await cfgTx(db,tx,nota.fonte?.colecao==='videos_producao'?'edicao':'programacao');if(!cfg)return {pendente:true,pausada:true};
  if(nota.fonte?.colecao==='postagens'){
   const ps=await tx.get(db.doc('postagens/'+nota.fonte.id));if(!ps.exists)return {pendente:false};const f=await fontesPostagemTxI165(db,tx,nota.fonte.id,agora);if(!f.clienteAtivo)return {pendente:true,pausada:true};const p=projetarPostagemServidorI165(f,cfg,agora);const o=p.obrigacoes.find(o=>o.chave===nota.chaveObrigacao);return {pendente:!!o,bloqueada:!!o?.bloqueada,prazoAtual:o?.prazo||'',urgenciaAtual:o?.urgencia||'normal'};
  }
  exigirI165(nota.fonte?.colecao==='videos_producao','escopo','Fonte fora da operação I165.');
  const [vs,es]=await Promise.all([tx.get(db.doc('videos_producao/'+nota.fonte.id)),tx.get(db.doc('programacao_episodios_i165/'+nota.fonte.id))]);if(!vs.exists)return {pendente:false};const v={...vs.data(),id:vs.id},cliente=await clienteTxI165(db,tx,v.cliente,agora);if(!cliente.clienteAtivo)return {pendente:true,pausada:true};const o=obrigacaoEdicaoI165(v,es.data()).find(o=>o.chave===nota.chaveObrigacao);return {pendente:!!o,bloqueada:!!o?.bloqueada,prazoAtual:o?.prazo||'',urgenciaAtual:o?.urgencia||'normal'};
}
export async function fontePendenteI165(db,nota,opcoes={}){return db.runTransaction(tx=>fontePendenteTxI165(db,tx,nota,opcoes));}
export function momentoAvisoI165(n,agora){if(n.bloqueada)return false;if(n.urgencia==='urgente'||!n.prazo||['editar_video','corrigir_video'].includes(n.tipo))return true;return faseAvisoI165(n,horarioBrasiliaI165(agora))!=='antecedencia';}
