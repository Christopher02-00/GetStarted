/* CP109: um plano físico cliente/mês. Auth/equipe e capacidade pública são entradas distintas. */
import {createHash,timingSafeEqual} from 'node:crypto';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {validarCadastroI165} from './contexto.mjs';
import {programacaoAtivaI165,exigirI165,jsonCanonicoI165,dataCivilI165} from './lib/gs-contexto-operacional-i165.mjs';
import {processoAtivoI164,ativoCompetenciaI164} from './central/lib/gs-processo-calendarios-i164.mjs';
import {carteiraCanonicaI164} from './central/lib/gs-carteira-calendarios-i164.mjs';
import {fonteReferencia} from './central/lib/gs-planejamento-social-i155.mjs';
import {criarReferenciaDePlanoCp109} from './referencias-cp109.mjs';

export const ACOES_PLANOS_CP109=Object.freeze(['planos_ler_cp109','planos_salvar_cp109','planos_solicitar_conteudo_cp109','planos_adicionar_ideia_cp109','planos_publicar_cp109','planos_compartilhar_cp109','planos_revogar_compartilhamento_cp109','planos_conferir_operacao_cp109']);
export const ACOES_PLANOS_PUBLICOS_CP109=Object.freeze(['planos_cliente_ler_cp109','planos_cliente_check_cp109']);
const EDITORES=['Gabrielle','Amanda','Chris'],LEITORES=[...EDITORES,'Cecília'];
const ESTADOS=['pendente','em_andamento','concluida','cancelada'];
const hash=v=>createHash('sha256').update(typeof v==='string'?v:jsonCanonicoI165(v)).digest('hex');
const e=(ok,c,m)=>exigirI165(ok,'plano-'+c,m);
const objeto=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/.test(v);
const mes=v=>typeof v==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(v);
const texto=(v,max,nome,obrigatorio=false)=>{e((v===undefined||typeof v==='string')&&(!v||v.length<=max),'campo','Confira '+nome+'.');const r=(v||'').trim();e(!obrigatorio||!!r,'campo','Preencha '+nome+'.');return r;};
const agoraIso=agora=>{e(agora instanceof Date&&Number.isFinite(agora.getTime()),'tempo','Confira o instante da operação.');return agora.toISOString();};
const igualHash=(a,b)=>typeof a==='string'&&typeof b==='string'&&/^[a-f0-9]{64}$/.test(a)&&/^[a-f0-9]{64}$/.test(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
export function idPlanoCp109(cliente,competencia){e(id(cliente)&&cliente===cliente.toLowerCase()&&!['zeens','otica-visao-araucaria'].includes(cliente)&&mes(competencia),'identidade','Confirme o cliente físico e o mês do plano.');return competencia+'__'+cliente;}
function identidadePlano(planoId){e(typeof planoId==='string'&&planoId.length<=129,'identidade','Plano inválido.');const competencia=planoId.slice(0,7),cliente=planoId.slice(9);e(planoId===idPlanoCp109(cliente,competencia),'identidade','Plano inválido.');return {cliente,competencia};}
function identPedido(d){const planoId=idPlanoCp109(d.cliente,d.competencia);e(!d.planoId||d.planoId===planoId,'identidade','O plano pertence a outro cliente ou mês.');return {planoId,cliente:d.cliente,competencia:d.competencia};}
function listaTexto(v,maxItens,max,nome){e(v===undefined||Array.isArray(v)&&v.length<=maxItens,'campo','Confira '+nome+'.');return (v||[]).map(x=>texto(x,max,nome,true));}
function normalizarAcoes(v){
 e(Array.isArray(v)&&v.length<=80,'acoes','Confira até 80 ações por plano.');const usados=new Set();
 return v.map(a=>{e(objeto(a)&&id(a.id)&&!usados.has(a.id),'acao-id','Cada ação precisa de um ID único e estável.');usados.add(a.id);e(a.arquivada===undefined||typeof a.arquivada==='boolean','campo','Confira o arquivo da ação.');
  const prazo=texto(a.prazo,10,'o prazo');e(!prazo||dataCivilI165(prazo),'prazo','Informe uma data real para o prazo.');e(ESTADOS.includes(a.status||'pendente'),'status','Confira o status da ação.');
  return {id:a.id,descricao:texto(a.descricao,3000,'a descrição',true),objetivo:texto(a.objetivo,2000,'o objetivo da ação'),orientacoes:texto(a.orientacoes,6000,'as orientações'),etapas:listaTexto(a.etapas,30,1000,'as etapas'),responsaveis:listaTexto(a.responsaveis,12,160,'os responsáveis'),prazo,status:a.status||'pendente',observacoes:texto(a.observacoes,6000,'as observações internas'),resultados:texto(a.resultados,6000,'os resultados internos'),arquivada:a.arquivada===true};
 });
}
function publicadoSeguro(p){
 const acoes=p.acoes.filter(a=>!a.arquivada).map(a=>Object.fromEntries(['id','descricao','objetivo','orientacoes','etapas','responsaveis','prazo','status'].map(k=>[k,a[k]])));
 e(p.objetivoPrincipal&&acoes.length&&acoes.every(a=>a.orientacoes||a.etapas.length),'publicacao','Antes de compartilhar, preencha o objetivo e as orientações ou etapas de cada ação.');
 return {schema:1,planoId:p.id,clienteNome:p.clienteNome,competencia:p.competencia,objetivoPrincipal:p.objetivoPrincipal,acoes};
}
function validarPlano(p,i){e(p?.schema===1&&p.id===i.planoId&&p.cliente===i.cliente&&p.competencia===i.competencia&&Number.isInteger(p.revisao)&&Array.isArray(p.acoes),'fonte','A fonte física do plano precisa de conferência.');e(new Set(p.acoes.map(a=>a.id)).size===p.acoes.length&&p.acoes.every(a=>id(a.id)),'fonte','A fonte possui ações sem identidade estável.');}
function dtoInterno(p,ator,operacao=null){return {schema:1,plano:p?{id:p.id,cliente:p.cliente,clienteNome:p.clienteNome,competencia:p.competencia,revisao:p.revisao,objetivoPrincipal:p.objetivoPrincipal,acoes:p.acoes,respostasCliente:p.respostasCliente||{},solicitacoes:p.solicitacoes||{},ideias:p.ideias||{},publicado:p.publicado?{revisao:p.publicado.revisao,em:p.publicado.em,assinatura:p.publicado.assinatura}:null,compartilhamento:p.compartilhamento?{ativo:p.compartilhamento.ativo===true,expiraEm:p.compartilhamento.expiraEm,publicacaoAtual:p.compartilhamento.publicacaoAssinatura===p.publicado?.assinatura}:null,criadoEm:p.criadoEm,atualizadoEm:p.atualizadoEm}:null,capacidades:{editar:EDITORES.includes(ator.papel),publicar:EDITORES.includes(ator.papel)},...(operacao?{operacao}:{} )};}
async function gates(db,tx,ator=null){
 const [cfg,processo,cad]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(db.doc('processo_calendarios_i164/ativo')),ator?tx.get(db.doc('usuarios_equipe/'+ator.email)):Promise.resolve(null)]);
 if(ator)validarCadastroI165(ator,cad.data());e(programacaoAtivaI165(cfg.data())&&cfg.data().habilidades?.preparacaoCentral===true&&processoAtivoI164(processo.data()),'inativo','O processo de planejamento está pausado.');return {cfg:cfg.data(),processo:processo.data()};
}
async function clienteExistente(db,tx,i,agora,escrita){
 const [extras,configs]=await Promise.all([tx.get(db.collection('clientes_extras').limit(1001)),tx.get(db.collection('clientes_config').limit(1001))]);e(extras.size<=1000&&configs.size<=1000,'carteira','A carteira excedeu o limite de conferência; nenhum cliente foi omitido.');
 const rows=q=>q.docs.map(s=>({id:s.id,data:s.data()})),hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(agora),carteira=carteiraCanonicaI164({extras:rows(extras),configs:rows(configs),hoje,competencia:i.competencia});
 const c=carteira.porSlug.find(x=>x.slug===i.cliente),config=carteira.configuracoes[i.cliente]||{};e(c&&(!escrita||ativoCompetenciaI164(config,i.competencia)),'cliente','Confirme um cliente existente e ativo nesta competência.');return c;
}
function opRef(db,planoId,ator,op){return db.doc('planos_acao_cp109/'+planoId+'/operacoes/'+hash([ator.uid,ator.real,ator.papel,op]));}
function conferirRecibo(r,ator,assinatura){e(r?.schema===1&&r.uid===ator.uid&&r.atorReal===ator.real&&r.papel===ator.papel&&r.pedidoHash===assinatura,'operacao','Esta tentativa pertence a outro conteúdo ou acesso.');}
const autor=(a,em)=>({uid:a.uid,atorReal:a.real,papel:a.papel,em});
export async function operarPlanosCp109(db,auth,dados,{agora=new Date()}={}){
 e(objeto(dados)&&ACOES_PLANOS_CP109.includes(dados.acao),'entrada','Operação de plano inválida.');
 const ator=validarContaEsperadaI165(auth,dados);e(LEITORES.includes(ator.papel),'perfil','Este acesso não acompanha os planos de ação.');
 e(Buffer.byteLength(jsonCanonicoI165(dados))<=250000,'volume','O plano excede o limite de gravação; nada foi cortado.');
 const i=identPedido(dados),em=agoraIso(agora),ler=dados.acao==='planos_ler_cp109',conferir=dados.acao==='planos_conferir_operacao_cp109';
 if(!ler)e(id(dados.operacaoId),'operacao','Preserve o identificador desta tentativa.');if(!ler&&!conferir)e(EDITORES.includes(ator.papel),'perfil','A elaboração do plano pertence à Gabi e à gestão.');
 const pedidoHash=hash({...dados,uid:ator.uid,atorReal:ator.real,papel:ator.papel,capability:dados.capability?hash(dados.capability):null});
 return db.runTransaction(async tx=>{
  const escritas=[];const gate=await gates(db,tx,ator),c=await clienteExistente(db,tx,i,agora,!ler&&!conferir),ref=db.doc('planos_acao_cp109/'+i.planoId),s=await tx.get(ref),ant=s.exists?s.data():null;if(ant)validarPlano(ant,i);
  if(ler)return dtoInterno(ant,ator);
  const rr=opRef(db,i.planoId,ator,dados.operacaoId),rs=await tx.get(rr);
  if(conferir){if(!rs.exists)return {...dtoInterno(ant,ator),operacao:{id:dados.operacaoId,estado:'nao_encontrada',confirmada:false}};const r=rs.data();e(r.uid===ator.uid&&r.atorReal===ator.real&&r.papel===ator.papel,'operacao','A tentativa pertence a outro acesso.');return {...dtoInterno(ant,ator),operacao:{id:dados.operacaoId,estado:'recuperada',confirmada:true,acao:r.acao,resultado:r.resultado,compartilhamentoAtual:r.acao==='planos_compartilhar_cp109'&&ant?.compartilhamento?.ativo===true&&ant.compartilhamento.tokenHash===r.resultado?.tokenHash}};}
  if(rs.exists){conferirRecibo(rs.data(),ator,pedidoHash);return dtoInterno(ant,ator,{id:dados.operacaoId,estado:'recuperada',confirmada:true,resultado:rs.data().resultado});}
  e(Number.isInteger(dados.esperadaRevisao)&&dados.esperadaRevisao===(ant?.revisao||0),'conflito','O plano mudou em outra tela. Releia e compare antes de salvar.');
  let p=ant?structuredClone(ant):{schema:1,id:i.planoId,cliente:i.cliente,clienteNome:c.nome,competencia:i.competencia,revisao:0,objetivoPrincipal:'',acoes:[],respostasCliente:{},solicitacoes:{},ideias:{},criadoEm:em,criadoPor:autor(ator,em)};let resultado={};
  if(dados.acao==='planos_salvar_cp109'){
   e(objeto(dados.plano),'campo','Confira o conteúdo do plano.');const acoes=normalizarAcoes(dados.plano.acoes);e(p.acoes.every(a=>acoes.some(b=>b.id===a.id)),'historico','Preserve as ações anteriores; para retirá-las da próxima publicação, marque Arquivada.');
   p={...p,objetivoPrincipal:texto(dados.plano.objetivoPrincipal,4000,'o objetivo principal'),acoes};
   const vr=db.doc('planos_acao_cp109/'+i.planoId+'/versoes/'+String(p.revisao+1)),vs=await tx.get(vr);e(!vs.exists,'historico','A revisão de destino já existe e precisa de conferência.');escritas.push([vr,{schema:1,planoId:i.planoId,cliente:i.cliente,competencia:i.competencia,revisao:p.revisao+1,objetivoPrincipal:p.objetivoPrincipal,acoes,em,por:autor(ator,em)}]);
  }else{
   e(ant,'ausente','Salve o plano antes desta ação.');
   if(['planos_solicitar_conteudo_cp109','planos_adicionar_ideia_cp109'].includes(dados.acao)){
    const a=p.acoes.find(a=>a.id===dados.acaoId&&!a.arquivada);e(a,'acao-id','A ação não pertence a este plano ativo.');
    if(dados.acao==='planos_solicitar_conteudo_cp109'){
     const objetivo=texto(dados.objetivo,3000,'o objetivo do conteúdo',true),formato=texto(dados.formato,120,'o formato desejado',true),prazo=texto(dados.prazo,10,'o prazo necessário',true);e(dataCivilI165(prazo),'prazo','Informe uma data real para a solicitação.');
     const demandaId='plano_cp109_'+hash([i.planoId,a.id]).slice(0,48),dr=db.doc('demandas/'+demandaId),ds=await tx.get(dr),origem={planoId:i.planoId,acaoId:a.id,cliente:i.cliente,competencia:i.competencia};
     if(ds.exists){const d=ds.data();e(d.tipoEspecial==='plano_conteudo_cp109'&&jsonCanonicoI165(d.origemPlanoCp109)===jsonCanonicoI165(origem)&&d.destinatario==='Amanda','demanda','A demanda encontrada pertence a outra ação.');resultado={demandaId,reutilizada:true,status:d.status};}
     else{escritas.push([dr,{titulo:'Conteúdo para ação · '+p.clienteNome,descricao:'Objetivo: '+objetivo+'\nFormato: '+formato+'\nAção: '+a.descricao+'\nPlano: '+i.competencia,cliente:i.cliente,clienteNome:p.clienteNome,origem:'equipe',tipoEspecial:'plano_conteudo_cp109',origemPlanoCp109:origem,destinatario:'Amanda',criadoPor:ator.papel,autorUid:ator.uid,criadoPorReal:ator.real,prazoData:prazo,prazoHora:'19:00',prioridade:'normal',status:'pendente',provaTexto:'',provaImagemUrl:'',historico:[{acao:'Solicitação de conteúdo vinculada ao plano',por:ator.real,em}],pedidoConteudoCp109:{objetivo,formato,prazo,operacao:dados.operacaoId},criadoEm:new Date(agora)}]);resultado={demandaId,reutilizada:false,status:'pendente'};}
     const pedido=ds.exists?ds.data().pedidoConteudoCp109:{objetivo,formato,prazo,operacao:dados.operacaoId};e(pedido&&id(pedido.operacao),'demanda','A solicitação existente precisa preservar sua intenção.');
     p.solicitacoes={...p.solicitacoes,[a.id]:{demandaId,...pedido,solicitadaEm:p.solicitacoes?.[a.id]?.solicitadaEm||em}};
     const ocorrencia=ocorrenciaSolicitacao(p,a.id),nr=db.doc('notificacoes_operacionais_i165/'+hash([ocorrencia.origem,ocorrencia.versao,ocorrencia.destinatario,ocorrencia.nivel])),ns=await tx.get(nr);
     if(ns.exists)e(jsonCanonicoI165(ns.data().origem)===jsonCanonicoI165(ocorrencia.origem)&&ns.data().versao===ocorrencia.versao,'aviso','O aviso encontrado pertence a outra fonte.');else escritas.push([nr,{schema:1,...ocorrencia,id:nr.id,ativacaoId:gate.processo.ativacaoId,criadaEm:em,estado:'pendente',canais:{push:{estado:'pendente',tentativas:0},email:{estado:'pendente',tentativas:0}}}]);
    }else{
     const proposta=criarReferenciaDePlanoCp109({cliente:i.cliente,clienteNome:p.clienteNome,competencia:i.competencia,planoId:i.planoId,acaoId:a.id,descricao:texto(dados.descricao||a.descricao,3000,'a ideia',true),link:dados.link||'',formato:dados.formato||'',classificacao:dados.classificacao||'',ator,agora});
     e(['referencias','referencias_cliente'].includes(proposta.colecao)&&id(proposta.id),'referencia','A ideia precisa usar o banco canônico existente.');const rf=db.doc(proposta.colecao+'/'+proposta.id),old=await tx.get(rf);let destino={colecao:proposta.colecao,id:proposta.id},reutilizada=old.exists;
     if(old.exists){const r=old.data();e(r.cliente===i.cliente&&r.origemPlanoCp109?.planoId===i.planoId&&r.origemPlanoCp109?.acaoId===a.id,'referencia','A referência encontrada pertence a outra origem.');}
     else if(proposta.documento.link){const fonte=fonteReferencia(proposta.documento.link),encontradas=[];for(const colecao of ['referencias','referencias_cliente']){const qs=await tx.get(db.collection(colecao).where('cliente','==',i.cliente).limit(1001));e(qs.size<=1000,'referencia','O banco excedeu o limite; nenhuma referência foi omitida.');for(const d of qs.docs){const r=d.data();let igual=false;try{igual=!!r.link&&fonteReferencia(r.link)===fonte;}catch{}if(igual)encontradas.push({colecao,id:d.id,raw:r});}}if(encontradas.length){encontradas.sort((a,b)=>(a.colecao+'/'+a.id).localeCompare(b.colecao+'/'+b.id));e(encontradas[0].raw.excluido!==true,'referencia','Esta referência foi retirada; confira a origem no banco antes de reutilizar.');destino={colecao:encontradas[0].colecao,id:encontradas[0].id};reutilizada=true;}else escritas.push([rf,proposta.documento]);}
     else escritas.push([rf,proposta.documento]);
     p.ideias={...p.ideias,[a.id]:{...destino,em:p.ideias?.[a.id]?.em||em}};resultado={...p.ideias[a.id],reutilizada};
    }
   }else if(dados.acao==='planos_publicar_cp109'){
    const conteudo=publicadoSeguro(p),assinatura=hash({revisao:p.revisao,conteudo});p.publicado={revisao:p.revisao,conteudo,assinatura,em,por:autor(ator,em)};
    if(p.compartilhamento?.publicacaoAssinatura!==assinatura&&p.compartilhamento)p.compartilhamento={...p.compartilhamento,ativo:false,revogadoEm:em,motivo:'Nova versão publicada; gere um novo link.'};resultado={publicacaoAssinatura:assinatura};
   }else if(dados.acao==='planos_compartilhar_cp109'){
    e(p.publicado?.conteudo&&p.publicado.revisao===p.revisao,'publicacao','Publique a revisão atual antes de gerar o link.');e(typeof dados.capability==='string'&&/^[A-Za-z0-9_-]{43}$/.test(dados.capability),'acesso','Gere uma chave de 32 bytes para este link.');
    e(Number.isInteger(dados.validadeDias)&&dados.validadeDias>=1&&dados.validadeDias<=90,'validade','Escolha validade de 1 a 90 dias.');const tokenHash=hash(dados.capability),ar=db.doc('planos_acao_acessos_cp109/'+tokenHash),anterior=await tx.get(ar);e(!anterior.exists,'acesso','Gere outra chave para o compartilhamento.');
    const expiraEm=new Date(agora.getTime()+dados.validadeDias*86400000).toISOString();p.compartilhamento={ativo:true,tokenHash,expiraEm,publicacaoAssinatura:p.publicado.assinatura,criadoEm:em,por:autor(ator,em)};
    escritas.push([ar,{schema:1,planoId:i.planoId,cliente:i.cliente,competencia:i.competencia,tokenHash,ativo:true,expiraEm,publicacaoAssinatura:p.publicado.assinatura,criadoEm:em}]);resultado={compartilhamentoConfirmado:true,expiraEm,tokenHash};
   }else if(dados.acao==='planos_revogar_compartilhamento_cp109'){
    if(p.compartilhamento)p.compartilhamento={...p.compartilhamento,ativo:false,revogadoEm:em,por:autor(ator,em)};resultado={revogado:true};
   }
  }
  // Revisão é do conteúdo editável; efeitos/checklist não tornam o rascunho desatualizado.
  if(dados.acao==='planos_salvar_cp109')p.revisao++;
  p.atualizadoEm=em;p.atualizadoPor=autor(ator,em);
  for(const [alvo,valor]of escritas)tx.create(alvo,valor);
  tx.set(ref,p);tx.create(rr,{schema:1,acao:dados.acao,operacaoId:dados.operacaoId,pedidoHash,uid:ator.uid,atorReal:ator.real,papel:ator.papel,planoId:i.planoId,revisao:p.revisao,em,resultado});
  return dtoInterno(p,ator,{id:dados.operacaoId,estado:'confirmada',confirmada:true,resultado});
 });
}

function dtoPublico(p,operacao=null){
 const conteudo=p.publicado.conteudo,acoes=conteudo.acoes.map(a=>{const r=p.respostasCliente?.[a.id],atual=r?.acaoAssinatura===hash(a);return {...a,concluida:atual?r.concluida:a.status==='concluida',respostaRevisao:r?.revisao||0,respondidaEm:atual?r.em:''};});
 // Allowlist independente: nenhuma observação/resultado/autor/pedido interno atravessa esta fronteira.
 return {schema:1,acesso:{tipo:'capability',clientAuthed:false},plano:{planoId:p.id,clienteNome:conteudo.clienteNome,competencia:conteudo.competencia,objetivoPrincipal:conteudo.objetivoPrincipal,publicadoEm:p.publicado.em,publicacaoAssinatura:p.publicado.assinatura,acoes:acoes.map(a=>Object.fromEntries(['id','descricao','objetivo','orientacoes','etapas','responsaveis','prazo','status','concluida','respostaRevisao','respondidaEm'].map(k=>[k,a[k]])))},...(operacao?{operacao}:{})};
}
/** Entrada pública exclusiva: não é Auth de equipe nem sessão/token geral do Portal. */
export async function operarPlanoPublicoCp109(db,dados,{agora=new Date()}={}){
 e(objeto(dados)&&ACOES_PLANOS_PUBLICOS_CP109.includes(dados.acao),'publico','Acesso ao plano indisponível.');e(typeof dados.capability==='string'&&/^[A-Za-z0-9_-]{43}$/.test(dados.capability),'publico','Acesso ao plano indisponível.');
 const i={planoId:dados.planoId,...identidadePlano(dados.planoId)},tokenHash=hash(dados.capability),em=agoraIso(agora),check=dados.acao==='planos_cliente_check_cp109';
 if(check||dados.operacaoId)e(id(dados.operacaoId),'publico','Preserve a tentativa de resposta.');
 e(!check||id(dados.acaoId)&&typeof dados.concluida==='boolean'&&Number.isInteger(dados.esperadaRespostaRevisao)&&dados.esperadaRespostaRevisao>=0,'publico','Confira a resposta da ação.');
 return db.runTransaction(async tx=>{
  await gates(db,tx);const [as,ps]=await Promise.all([tx.get(db.doc('planos_acao_acessos_cp109/'+tokenHash)),tx.get(db.doc('planos_acao_cp109/'+i.planoId))]);const cap=as.data(),p=ps.data();
  e(as.exists&&ps.exists&&cap.schema===1&&cap.ativo===true&&cap.planoId===i.planoId&&cap.cliente===i.cliente&&cap.competencia===i.competencia&&cap.expiraEm>em&&p.compartilhamento?.ativo===true&&p.compartilhamento.expiraEm>em&&igualHash(p.compartilhamento.tokenHash,tokenHash)&&p.publicado?.assinatura===cap.publicacaoAssinatura&&p.compartilhamento.publicacaoAssinatura===cap.publicacaoAssinatura,'publico','Acesso ao plano indisponível.');validarPlano(p,i);
  const rr=dados.operacaoId?db.doc('planos_acao_cp109/'+i.planoId+'/respostas_operacoes/'+hash([tokenHash,dados.operacaoId])):null,rs=rr?await tx.get(rr):null;
  if(!check)return dtoPublico(p,rr?{id:dados.operacaoId,confirmada:rs.exists,estado:rs.exists?'recuperada':'nao_encontrada'}:null);
  const pedidoHash=hash({acaoId:dados.acaoId,concluida:dados.concluida,esperadaRespostaRevisao:dados.esperadaRespostaRevisao,tokenHash,publicacao:cap.publicacaoAssinatura});
  if(rs.exists){e(rs.data().pedidoHash===pedidoHash,'operacao','Esta tentativa pertence a outra resposta.');return dtoPublico(p,{id:dados.operacaoId,confirmada:true,estado:'recuperada'});}
  e(p.publicado.conteudo.acoes.some(a=>a.id===dados.acaoId),'publico','A ação não pertence a este plano compartilhado.');const anterior=p.respostasCliente?.[dados.acaoId];e((anterior?.revisao||0)===dados.esperadaRespostaRevisao,'check-conflito','A resposta mudou em outra tela. Atualize o plano antes de marcar novamente.');
  const resposta={concluida:dados.concluida,revisao:(anterior?.revisao||0)+1,em,publicacaoAssinatura:cap.publicacaoAssinatura,acaoAssinatura:hash(p.publicado.conteudo.acoes.find(a=>a.id===dados.acaoId)),origem:'capability'},novo={...p,respostasCliente:{...(p.respostasCliente||{}),[dados.acaoId]:resposta}};
  tx.update(ps.ref,{respostasCliente:novo.respostasCliente});tx.create(rr,{schema:1,pedidoHash,acaoId:dados.acaoId,revisao:resposta.revisao,resposta,em});return dtoPublico(novo,{id:dados.operacaoId,confirmada:true,estado:'confirmada'});
 });
}
export const operarPlanoClienteCp109=operarPlanoPublicoCp109;


function ocorrenciaSolicitacao(p,acaoId){
 const s=p.solicitacoes?.[acaoId];e(s&&id(s.demandaId)&&id(s.operacao),'aviso','A solicitação precisa de vínculo físico.');
 const origem={tipo:'plano_acao_cp109',id:p.id,acaoId,subtipo:'solicitacao_conteudo',operacao:s.operacao},versao=hash({demandaId:s.demandaId,objetivo:s.objetivo,formato:s.formato,prazo:s.prazo});
 return {origem,versao,destinatario:'Amanda',nivel:'solicitacao',titulo:'Conteúdo para ação · '+p.clienteNome,texto:'A Gabi encaminhou uma ação de '+p.competencia+'. Confira objetivo, formato e prazo na mesma demanda.',prazo:s.prazo+'T19:00',link:{area:'planos_cp109',cliente:p.cliente,competencia:p.competencia,acaoId,demandaId:s.demandaId}};
}
/** Releitura tipada para leitor/dispatcher: aviso não executa nem conclui produção. */
export async function ocorrenciasPlanosCp109(db,n,agora=new Date()){
 if(n?.origem?.tipo!=='plano_acao_cp109'||n.origem.subtipo!=='solicitacao_conteudo'||!id(n.origem.acaoId)||!id(n.origem.operacao))return [];
 const i={planoId:n.origem.id,...identidadePlano(n.origem.id)};agoraIso(agora);
 const ler=fn=>typeof db.runTransaction==='function'?db.runTransaction(fn):fn({get:ref=>ref.get()});
 return ler(async tx=>{await gates(db,tx);const ps=await tx.get(db.doc('planos_acao_cp109/'+i.planoId));if(!ps.exists)return [];const p=ps.data();validarPlano(p,i);const s=p.solicitacoes?.[n.origem.acaoId];if(!s)return [];
  const ds=await tx.get(db.doc('demandas/'+s.demandaId));if(!ds.exists)return [];const d=ds.data();if(d.excluido||d.status!=='pendente'||d.destinatario!=='Amanda'||d.tipoEspecial!=='plano_conteudo_cp109'||d.origemPlanoCp109?.planoId!==p.id||d.origemPlanoCp109?.acaoId!==n.origem.acaoId||d.origemPlanoCp109?.cliente!==p.cliente)return [];
  const o=ocorrenciaSolicitacao(p,n.origem.acaoId);return jsonCanonicoI165(o.origem)===jsonCanonicoI165(n.origem)&&o.versao===n.versao?[o]:[];
 });
}
