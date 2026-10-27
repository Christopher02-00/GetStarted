import {refIntencaoI165,pedidoBrutoHashI165,conferirTombstoneI165,controleOperacaoI165} from './ciclo-intencao.mjs';
import {exigirI165,idFisicoI165,instanteI165,jsonCanonicoI165,horarioBrasiliaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {identidadeTokenI165,contextoTxI165,hashI165} from './contexto.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
import {exigirProgramacaoTxI165,conferenciaOrientacaoCp110} from './guardas-programacao.mjs';
import {camposPendentesI79} from './lib/gs-legenda-qualidade-i79.mjs';
import {origemEditorialI165,assinaturaDiretrizI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import empresas from './lib/empresas-cp101-i165.mjs';
import {gerarItemIdCalendarioV101,atualizarItemAgendamentoPautaR1a,mesDoItemCalendario,cicloFonteAlertaCanonicoV135,cicloDemandaAlertaCanonicoV135,demandaAbertaParaLimpezaV135,demandaPertenceLimpezaCanonicaV135} from './lib/guardas-agendamento-cp101-i165.mjs';
const permitido=ator=>exigirI165(['Amanda','Chris','Cecília'].includes(ator.papel),'papel','Esta operação é da programação de conteúdos.');
const assinatura=p=>{const s=jsonCanonicoI165(p);exigirI165(s.length<=180000,'fonte-grande','A ficha está grande demais para esta conferência. Nenhuma informação será cortada.');return s;};
const refRecibo=(db,a,op)=>refIntencaoI165(db,a,'programar',{operacaoId:op});
const summary=p=>p?{id:p.id,status:p.status,dataAgendada:p.dataAgendada||'',horaAgendada:p.horaAgendada||'',agendadoEm:p.agendadoEm||''}:null;
export async function prepararProgramacaoI165(db,auth,dados,{agora=new Date()}={}){
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'programacao');permitido(ator);exigirI165(idFisicoI165(dados.postagemId),'postagem','Confira a postagem física.');
 return db.runTransaction(async tx=>{await contextoTxI165(db,tx,ator,'programacao');const f=await fontesPostagemTxI165(db,tx,dados.postagemId,agora);const qs=await tx.get(db.collection('programacao_solicitacoes_i165').where('postagemId','==',f.post.id).limit(51));exigirI165(qs.size<=50,'solicitacoes-volume','Há muitos pedidos deste conteúdo. Nenhuma decisão foi omitida de uma lista anunciada como completa.');const fonteAssinatura=jsonCanonicoI165({post:f.post,video:f.video,diretriz:f.diretriz}),as=f.diretriz?assinaturaDiretrizI165(f.diretriz):'';const solicitacoes=qs.docs.map(s=>{const x=s.data();return{id:s.id,estado:x.estado,motivo:x.motivo,proposta:x.proposta,revisaoDiretriz:x.revisaoDiretriz,em:x.em,autoria:x.autoria,decisao:x.decisao||null,atualDaDiretriz:!!as&&x.assinaturaDiretriz===as,fonteConfere:x.assinaturaFonte===fonteAssinatura};});return {solicitacoesExcecao:solicitacoes,solicitacoesConsultaCompleta:true,postagem:f.post,diretriz:f.diretriz,conferenciaOrientacaoCp110:conferenciaOrientacaoCp110(f),assinaturaEsperada:assinatura(f.post),configEntrega:f.configEntrega,clienteAtivo:f.clienteAtivo,semDiretriz:!f.diretriz,legadoProgramacao:f.legadoProgramacao,controleOperacao:controleOperacaoI165('programar'),controlesOperacao:{publicacao:controleOperacaoI165('publicacao'),...(f.post.cliente==='stokki'?{stokki:controleOperacaoI165('stokki')}:{})},somenteLeitura:true,nenhumaEscrita:true,naoAutorizaEscritaPosterior:true};});
}
export async function conferirOperacaoProgramacaoI165(db,auth,dados,{agora=new Date()}={}){
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'programacao');permitido(ator);exigirI165(idFisicoI165(dados.operacaoId),'operacao','Confira a mesma intenção.');
 return db.runTransaction(async tx=>{await contextoTxI165(db,tx,ator,'programacao');const r=await tx.get(refRecibo(db,ator,dados.operacaoId));if(!r.exists)return{estado:'ausente_no_instante',conferidoEm:instanteI165(agora),retrySomenteMesmaIntencao:true,naoAutorizaNovaIntencao:true};const d=r.data();if(d.estado==='cancelada'){exigirI165(d.autoria?.uid===ator.uid&&d.autoria.papel===ator.papel&&d.autoria.atorReal===ator.real,'operacao-dono','Esta tentativa pertence a outro acesso.');return{estado:'cancelada',cancelamentoAtomico:true,recibo:d,nenhumaEscrita:true};}exigirI165(d.autoria?.uid===ator.uid&&d.autoria.papel===ator.papel&&d.autoria.atorReal===ator.real,'operacao-dono','Esta tentativa pertence a outro acesso.');const p=await tx.get(db.doc('postagens/'+d.postagemId));return{estado:'confirmada',recibo:d,postagemAtual:p.exists?summary({...p.data(),id:p.id}):null,requerLeituraAtual:true,nenhumaEscrita:true};});
}
export async function programarI165(db,auth,dados,{agora=new Date(),conferirExternoTx=null,concluirExternoTx=null}={}){
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'programacao');permitido(ator);
 exigirI165(idFisicoI165(dados.postagemId)&&idFisicoI165(dados.operacaoId)&&['agendar','desfazer'].includes(dados.tipo),'operacao','Confira a postagem, a ação e a intenção desta operação.');
 exigirI165(typeof dados.assinaturaEsperada==='string'&&dados.assinaturaEsperada.length>0&&dados.assinaturaEsperada.length<=180000,'versao','Reabra a postagem para conferir a versão atual.');
 const input={postagemId:dados.postagemId,operacaoId:dados.operacaoId,tipo:dados.tipo,data:dados.tipo==='agendar'?dados.data||'':'',hora:dados.tipo==='agendar'?dados.hora||'':'',remarcar:dados.remarcar===true,assinaturaEsperada:dados.assinaturaEsperada,...(Object.hasOwn(dados,'confirmacaoOrientacaoCp110')?{confirmacaoOrientacaoCp110:dados.confirmacaoOrientacaoCp110}:{})};
 const raw=pedidoBrutoHashI165(ator,dados);
 const intencao=jsonCanonicoI165({...input,uid:ator.uid,papel:ator.papel,atorReal:ator.real}),em=instanteI165(agora),hoje=horarioBrasiliaI165(agora).slice(0,10),rr=refRecibo(db,ator,input.operacaoId);
 return db.runTransaction(async tx=>{
  const {cfg}=await contextoTxI165(db,tx,ator,'programacao'),rec=await tx.get(rr);
  if(rec.exists){const cancelada=conferirTombstoneI165(rec.data(),ator,raw);if(cancelada)return cancelada;exigirI165(rec.data().intencao===intencao,'operacao-reutilizada','Esta tentativa já pertence a outra intenção.');const current=await tx.get(db.doc('postagens/'+input.postagemId));return{estado:'recuperado',recibo:rec.data(),postagemAtual:current.exists?summary({...current.data(),id:current.id}):null,requerLeituraAtual:true};}
  const externo=conferirExternoTx?await conferirExternoTx({db,tx,ator,input,agora}):null;
  const guard=await exigirProgramacaoTxI165(db,tx,ator,{postagemId:input.postagemId,tipo:input.tipo,data:input.data,hora:input.hora,rede:'geral',confirmacaoOrientacaoCp110:input.confirmacaoOrientacaoCp110},agora),f=guard.fontes,p=f.post,v=f.video;
  exigirI165(p.excluido!==true&&!p.arquivado,'postagem','A postagem foi retirada e não será alterada.');
  if(p.uploadPostI166!=null)exigirI165(p.uploadPostI166.versao===1&&p.uploadPostI166.rota==='upload_post_i166'&&input.tipo==='agendar'&&!input.remarcar&&typeof conferirExternoTx==='function'&&typeof concluirExternoTx==='function'&&!!externo,'rota-externa','Esta postagem exige a conferência externa da mesma execução. Agendamento, remarcação e desfazer pelo caminho manual não foram autorizados.');
  exigirI165(!p.publicacaoStokki,'stokki','Esta publicação usa plataformas separadas. Use o escritor próprio de Stokki; nenhuma baixa geral foi feita.');
  exigirI165(assinatura(p)===input.assinaturaEsperada,'versao','A postagem mudou desde que você abriu. Seu texto continua na tela.');
  const states=input.tipo==='desfazer'?['agendado']:input.remarcar?['agendado']:cfg.permitirAgendarSemLegendaI90?['aguardando_legenda','aguardando_agendamento']:['aguardando_agendamento'];
  exigirI165(states.includes(p.status),'estado','A postagem avançou em outra aba. Nada foi sobrescrito.');
  const origem=origemEditorialI165(p),moderna=!!v&&!!origem,manual=!v&&p.origemManual===true,usaCal=moderna||manual,slug=moderna?origem.calendarClienteSlug:p.cliente;
  const cr=usaCal?db.doc('calendarios/'+slug):null,cs=cr?await tx.get(cr):null;
  exigirI165(!moderna||cs.exists,'calendario','O calendário físico não existe mais.');
  const cal=cs?.exists?cs.data():{client:p.clienteNome||p.cliente,month:'',items:[],comments:[]};let items=usaCal?(Array.isArray(cal.items)?structuredClone(cal.items):[]):null,idx=-1,como='legado sem pauta',deDia=null,praDia=null;
  if(usaCal){
   exigirI165(cal.excluido!==true&&!cal.arquivado&&!cal.archived&&!cal.deletedAt,'calendario','O calendário foi retirado da operação.');
   const manualId=gerarItemIdCalendarioV101(p.id),hits=items.map((it,i)=>({it,i})).filter(({it})=>it&&(moderna?it.excluido!==true&&(it.itemId||it.id)===origem.calendarItemId&&mesDoItemCalendario(cal,it)===origem.calendarCompetencia:(it.itemId===manualId||String(it.postagemId||'')===p.id)));
   exigirI165(hits.length<=1&&(!moderna||hits.length===1),'item','A peça exata está ausente ou duplicada; nenhuma posição ou título foi usado.');
   idx=hits[0]?.i??-1;como=moderna?'itemId + competência':'postagemId manual';
   if(idx>=0){exigirI165(!items[idx].postagemId||String(items[idx].postagemId)===p.id,'ponteiro','A peça agora aponta para outra postagem.');if(input.tipo==='agendar')exigirI165(items[idx].posted!==true,'publicado','O item já está publicado e não será reagendado.');}
   if(input.tipo==='agendar')empresas.conferir(p.cliente,p,v,idx>=0?items[idx]:null);
  }
  const demandaId='reagendar_post_'+p.id.replace(/[^A-Za-z0-9_-]/g,'_').slice(0,150),dr=db.doc('demandas/'+demandaId),ds=await tx.get(dr);
  // Query bounded and read before any write. A failed/incomplete read cannot close a task.
  const dq=db.collection('demandas').where('postagemId','==',p.id).limit(101),demands=await tx.get(dq);exigirI165(demands.size<=100,'demandas-volume','Há muitas demandas deste conteúdo. Nenhuma baixa parcial foi feita.');
  const cicloAnterior=cicloFonteAlertaCanonicoV135('postagem',p),cicloDemanda=ds.exists?cicloDemandaAlertaCanonicoV135({...ds.data(),id:ds.id}):'';
  const close=[];
  for(const s of demands.docs){const d={...s.data(),id:s.id};if(!demandaAbertaParaLimpezaV135(d))continue;
   const alvo=input.tipo==='agendar'&&d.id===demandaId&&cicloDemanda?{tipo:'agendamento_postagem',fonteId:p.id,ciclo:cicloDemanda}:((input.remarcar||input.tipo==='desfazer')?{tipo:'postagem',fonteId:p.id,ciclo:cicloAnterior}:null);
   if(alvo&&demandaPertenceLimpezaCanonicaV135(d,alvo))close.push({snap:s,tipo:alvo.tipo,ciclo:alvo.ciclo});
  }
  let patch;
  if(input.tipo==='agendar'){
   patch={dataAgendada:input.data,horaAgendada:input.hora,agendadoPor:ator.real,agendadoEm:em,status:'agendado',confirmacaoPostagemCriada:false,...(camposPendentesI79(p).length?{legendaPendenteAoAgendarI90:true,legendaPendenteAgendamentoPorI90:ator.real,legendaPendenteAgendamentoEmI90:em}:{})};
   if(usaCal){const dia=Number(input.data.slice(8,10)),base={...empresas.campos(p.cliente,p),itemId:gerarItemIdCalendarioV101(p.id),day:dia,name:p.titulo,desc:p.legenda||'',ref:p.linkVideo||'',stage:'meio',fmt:'Reel',apr:false,posted:false,gravado:true,agendado:true,postagemId:p.id,mes:input.data.slice(0,7),dataFlexivel:false,dataPostagem:input.data,origemAgendamentoManualV118:manual,excluido:false};
    if(idx<0){items.push(base);idx=items.length-1;praDia=dia;}else{const old=items[idx];deDia=old.day;items[idx]=moderna?atualizarItemAgendamentoPautaR1a(old,{acao:'agendar',data:input.data,postagemId:p.id,competencia:origem.calendarCompetencia,ator:ator.real,agora:em}):{...old,itemId:old.itemId||base.itemId,day:dia,agendado:true,posted:false,postagemId:p.id,dataPostagem:input.data,excluido:false,excluidoPor:'',excluidoEm:'',motivoExclusao:'',agendamentoAnteriorV118:{postagemId:p.id,day:old.day??null,dataPostagem:old.dataPostagem||'',agendado:old.agendado===true,posted:old.posted===true,postagemIdAnterior:old.postagemId||''}};if(input.remarcar)items[idx].agendamentoAnteriorV118=old.agendamentoAnteriorV118||null;praDia=items[idx].day;}
   }
  }else{
   patch={status:'aguardando_agendamento',dataAgendada:'',horaAgendada:'',confirmacaoPostagemCriada:false,desfeitoPor:ator.real,desfeitoEm:em};
   if(usaCal&&idx>=0){const old=items[idx];if(manual&&old.origemAgendamentoManualV118===true)items[idx]={...old,agendado:false,posted:false,dataPostagem:'',postagemId:'',excluido:true,excluidoPor:ator.real,excluidoEm:em,motivoExclusao:'Agendamento manual desfeito'};else items[idx]=atualizarItemAgendamentoPautaR1a(old,{acao:'desfazer',postagemId:p.id});}
  }
  if(input.tipo==='agendar'&&guard.midiaArquivoI166?.aplicavel)patch.midiaAgendadaI166={...guard.midiaArquivoI166.snapshot,agendadoEm:em,agendadoPor:ator.real};
  if(externo?.uploadPostI166)patch.uploadPostI166=externo.uploadPostI166;
  if(input.tipo==='agendar')patch.ultimaConferenciaAgendamentoCp110={...guard.conferenciaOrientacaoCp110,operacaoId:input.operacaoId};
  // All reads ended above; quality/client/caption data are not rewritten by scheduling.
  const pr=db.doc('postagens/'+p.id);tx.update(pr,patch);
  if(usaCal){if(cs.exists)tx.update(cr,{items,updatedAt:em});else tx.set(cr,{...cal,items,updatedAt:em});}
  for(const x of close)tx.update(x.snap.ref,{status:x.tipo==='postagem'?'cancelada_automaticamente':'aprovada',...(x.tipo==='postagem'?{excluido:true,motivoExclusao:'Ciclo de publicação substituído por reagendamento.',cicloEncerradoV135:x.ciclo}:{}),concluidoPor:'sistema',concluidoEm:new Date(agora),notaConclusao:x.tipo==='postagem'?'Alerta encerrado porque o ciclo exato de publicação foi desfeito.':'Concluída automaticamente pelo sistema — postagem foi agendada.'});
  if(input.tipo==='desfazer'){
   const old=ds.data()||{};if(ds.exists)tx.set(dr.collection('ciclos_i165').doc(hashI165([cicloDemanda,input.operacaoId])),{schema:1,anterior:old,operacaoId:input.operacaoId,preservadoEm:em});
   tx.set(dr,{titulo:'📅 Reagendar postagem — '+(p.clienteNome||p.cliente),descricao:'Agendamento desfeito por '+ator.real+'.\n\nVídeo: '+(p.titulo||'')+(p.linkVideo?'\nLink: '+p.linkVideo:'')+(p.legenda?'\n\nLegenda: '+p.legenda:''),origem:'sistema',clienteNome:p.clienteNome||'',destinatario:'Cecília',postagemId:p.id,tipoEspecial:'reagendar_postagem_v118',operationId:'reagendar_post_'+p.id,alertaCicloV135:'reagendar_postagem|'+em,prazoData:hoje,prazoHora:'19:00',status:'pendente',provaTexto:'',provaImagemUrl:'',criadoEm:old.criadoEm||new Date(agora),atualizadoEm:new Date(agora)});
  }
  const recibo={schema:1,pedidoBrutoHash:raw,escopo:'operacional_i165_cp101',tipo:'programar',operacaoId:input.operacaoId,intencao,postagemId:p.id,videoId:v?.id||'',autoria:{uid:ator.uid,papel:ator.papel,atorReal:ator.real},ativacaoId:cfg.ativacaoId,em,antesAssinatura:input.assinaturaEsperada,depoisAssinatura:assinatura({...p,...patch}),acao:input.tipo,remarcar:input.remarcar,calendario:{alterado:usaCal,slug:usaCal?slug:'',como,competencia:origem?.calendarCompetencia||'',itemId:usaCal?items[idx]?.itemId||'':''},demandasEncerradas:close.map(x=>x.snap.id),cicloAnterior,excecaoAplicada:guard.resultado.excecaoAplicada===true,continuidadeLegadaI165:guard.resultado.continuidadeLegada===true?f.legadoProgramacao:null,conferenciaOrientacaoCp110:guard.conferenciaOrientacaoCp110,midiaAgendadaI166:input.tipo==='agendar'?patch.midiaAgendadaI166||null:null};
  tx.set(rr,recibo);if(concluirExternoTx)concluirExternoTx({db,tx,ator,input,agora,externo,recibo,postagem:{...p,...patch}});return{estado:'novo',recibo,postagemAtual:summary({...p,...patch}),calendarioAtualizado:usaCal,calendarioPreservado:!usaCal,deDia,praDia,mudouDia:deDia!==null&&deDia!==praDia,requerLeituraAtual:true};
 });
}

