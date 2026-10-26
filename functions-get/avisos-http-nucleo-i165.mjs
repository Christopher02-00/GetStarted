// Operações fechadas de avisos. Somente o adaptador do servidor fornece as dependências.
import {createHash} from 'node:crypto';
import {estadoContaDispositivoTxI165,testarDispositivoProprioI165} from './teste-dispositivo-i165.mjs';
export const ACOES_AVISOS_HTTP_I165=Object.freeze(['config_avisos','listar_avisos','registrar_dispositivo','desativar_dispositivo','testar_dispositivo']);
const ESCOPO='operacional_i165_cp101',LIMITE=100;
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,220}$/.test(x);
const texto=(x,n)=>typeof x==='string'?x.slice(0,n):'';
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?x:null;
const inteiro=x=>Number.isSafeInteger(x)&&x>=0?x:0;
function configPublica(c,ativa){return {schema:1,ativo:ativa,revisao:ativa?c.revisao:0,ativacaoId:ativa?c.ativacaoId:'',permitirAgendarSemLegendaI90:ativa&&c.permitirAgendarSemLegendaI90===true,habilidades:{edicao:ativa&&c.habilidades?.edicao===true,push:ativa&&c.habilidades?.push===true,aprovacao:ativa&&c.habilidades?.aprovacao===true,programacao:ativa&&c.habilidades?.programacao===true}};}
function webPublica(w){if(typeof w?.vapidKey==='string'&&/^[A-Za-z0-9_-]{80,512}$/.test(w.vapidKey))return {vapidKey:w.vapidKey};return w?.vapidMode==='firebase_default'?{vapidMode:'firebase_default'}:null;}
function saudePublica(s){return s?.escopo===ESCOPO?{schema:1,escopo:ESCOPO,estado:['conferido','conferir_origens','conferir_canais'].includes(s.estado)?s.estado:'conferir_origens',ultimaExecucao:iso(s.ultimaExecucao),canais:{falhas:inteiro(s.canais?.falhas),desconhecidas:inteiro(s.canais?.desconhecidas)}}:null;}
function canaisPublicos(c){const out={};for(const nome of ['push','email']){const estado=c?.[nome]?.estado;if(['pendente','enviado','falha','resultado_desconhecido','em_andamento','desligado','sem_destino'].includes(estado))out[nome]={estado};}return out;}
function notaPublica(n,idNota,f,agora){return {schema:1,id:idNota,escopo:ESCOPO,destinatario:n.destinatario,ativacaoId:n.ativacaoId,tipo:texto(n.tipo,100),fonte:{colecao:n.fonte.colecao,id:n.fonte.id},estado:'pendente',estadoPersistido:'pendente',titulo:texto(n.titulo,240),texto:texto(n.texto,1600),link:n.fonte.colecao==='postagens'?{area:'agendar',postagemId:n.fonte.id}:{area:'meus_videos',videoId:n.fonte.id},bloqueada:f.bloqueada===true,pausada:f.pausada===true,urgencia:texto(f.urgenciaAtual||n.urgencia,40),faseAviso:texto(n.faseAviso,40),prazo:iso(f.prazoAtual||n.prazo),canais:canaisPublicos(n.canais),fonteConferida:true,fonteAvancou:false,conferidoEm:agora,leituraNaoResolve:true,semAlterarEstadoPersistido:true};}
export async function operarAvisosHttpNucleoI165(db,auth,dados,{agora=new Date(),deps}={}){
 const {exigir,validarConta,validarCadastro,configAtiva,fontePendenteTx,serverTimestamp}=deps;
 exigir(dados&&typeof dados==='object'&&!Array.isArray(dados)&&ACOES_AVISOS_HTTP_I165.includes(dados.acao),'avisos-entrada','Operação de avisos inválida.');
 const dispositivo=['registrar_dispositivo','desativar_dispositivo','testar_dispositivo'].includes(dados.acao),permitidas=new Set(['acao','uidEsperado','atorRealEsperado','papelOperado','sessao',...(dispositivo?['token']:[]),...(dados.acao==='testar_dispositivo'?['operacaoId']:[])]);
 exigir(Object.keys(dados).every(k=>permitidas.has(k)),'avisos-campos','Confira os dados desta operação de avisos.');
 const ator=validarConta(auth,dados),em=agora.toISOString();
 if(dispositivo){exigir(ator.real===ator.papel,'dispositivo-delegado','Entre com o Google da própria pessoa para configurar este aparelho.');exigir(typeof dados.token==='string'&&dados.token.length>20&&dados.token.length<5000&&dados.token.trim().length>20,'dispositivo-token','O navegador não confirmou um token de aparelho válido.');}
 if(dados.acao==='testar_dispositivo')return testarDispositivoProprioI165(db,ator,dados,{agora,deps});
 return db.runTransaction(async tx=>{
  const cfgRef=db.doc('programacao_config_i165/ativo'),cadRef=db.doc('usuarios_equipe/'+ator.email);
  const [cs,ds]=await Promise.all([tx.get(cfgRef),tx.get(cadRef)]);const cfg=cs.data(),cad=ds.data();validarCadastro(ator,cad);const ativa=configAtiva(cfg);
  if(dados.acao==='config_avisos'){
   const [w,s]=await Promise.all([tx.get(db.doc('config_notificacoes_i165/web')),tx.get(db.doc('servicos_i165/estado'))]);
   return {schema:1,configConfirmada:true,config:configPublica(cfg,ativa),web:webPublica(w.data()),saude:saudePublica(s.data()),aparelhoProprio:await estadoContaDispositivoTxI165(db,tx,ator,agora),cadastroProprio:{uid:ator.uid,pessoa:ator.real,email:ator.email,ativo:true,excluido:false}};
  }
  if(dados.acao==='listar_avisos'){
   const fontes=[...(cfg?.habilidades?.edicao===true?['videos_producao']:[]),...(cfg?.habilidades?.programacao===true?['postagens']:[])];
   exigir(ativa&&fontes.length>0,'inativo','Os avisos de conteúdos ainda não estão ativos. A atividade continua na sua fila.');
   const q=db.collection('notificacoes_operacionais_i165').where('escopo','==',ESCOPO).where('destinatario','==',ator.papel).where('estado','==','pendente').where('ativacaoId','==',cfg.ativacaoId).where('fonte.colecao',fontes.length===1?'==':'in',fontes.length===1?fontes[0]:fontes).orderBy('__name__').limit(LIMITE+1);
   const qs=await tx.get(q),avisos=[];
   const candidatas=qs.docs.slice(0,LIMITE);
   for(let i=0;i<candidatas.length;i+=4){
    const bloco=await Promise.allSettled(candidatas.slice(i,i+4).map(async s=>{const n=s.data();exigir(id(s.id)&&/^[A-Za-z0-9_-]{12,160}$/.test(s.id)&&n.id===s.id&&n.escopo===ESCOPO&&n.destinatario===ator.papel&&n.estado==='pendente'&&n.ativacaoId===cfg.ativacaoId&&fontes.includes(n.fonte?.colecao)&&id(n.fonte.id),'aviso-contrato','Um aviso precisa de conferência. A última lista foi preservada.');const f=await fontePendenteTx(db,tx,n,{agora});exigir(f&&typeof f.pendente==='boolean','aviso-fonte','Não consegui confirmar a origem de um aviso.');return f.pendente?notaPublica(n,s.id,f,em):null;}));
    for(const r of bloco){if(r.status==='rejected')throw r.reason;if(r.value)avisos.push(r.value);}
   }
   return {schema:1,listaConfirmada:true,ativacaoId:cfg.ativacaoId,avisos,limite:LIMITE,truncado:qs.size>LIMITE,conferidoEm:em};
  }
  const hash=createHash('sha256').update(dados.token).digest('hex'),pr=db.doc('notificacoes_dispositivos_i165/'+ator.uid),tr=pr.collection('tokens').doc(hash);
  const [ps,ts]=await Promise.all([tx.get(pr),tx.get(tr)]),p=ps.data(),t=ts.data();
  exigir(!ps.exists||p.uid===ator.uid&&p.pessoa===ator.real,'dispositivo-vinculo','O cadastro deste aparelho precisa de conferência.');
  exigir(!ts.exists||t.uid===ator.uid&&t.pessoa===ator.real&&t.token===dados.token,'dispositivo-vinculo','O token deste aparelho precisa de conferência.');
  if(dados.acao==='desativar_dispositivo'){
   const recuperado=!ts.exists||t.ativo===false;if(!recuperado)tx.set(tr,{ativo:false,atualizadoEm:serverTimestamp()},{merge:true});
   return {schema:1,desativado:true,recuperado};
  }
  exigir(ativa&&cfg.habilidades?.push===true,'inativo','Os avisos de aparelho ainda não estão liberados. A atividade continua no sistema.');
  const recuperado=ps.exists&&ts.exists&&p.ativo===true&&t.ativo===true;
  if(!recuperado){const base={uid:ator.uid,pessoa:ator.real,ativo:true,atualizadoEm:serverTimestamp()};tx.set(pr,base,{merge:true});tx.set(tr,{...base,token:dados.token},{merge:true});}
  return {schema:1,registrado:true,recuperado,uid:ator.uid,pessoa:ator.real,ativacaoId:cfg.ativacaoId};
 });
}
