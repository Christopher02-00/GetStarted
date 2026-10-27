import {compatLegadoConfirmadaI165,validarAcaoFonteProgramacaoI165} from './compat-legado-programacao-r83.mjs';
import {refIntencaoI165,pedidoBrutoHashI165,conferirTombstoneI165,controleOperacaoI165} from './ciclo-intencao.mjs';
import {exigirI165,idFisicoI165,instanteI165,jsonCanonicoI165,horarioBrasiliaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {validarOperacaoProgramacaoI165,assinaturaDiretrizI165,chaveExcecaoI165,origemEditorialI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {identidadeTokenI165,contextoTxI165,hashI165} from './contexto.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
import {confirmarIdentidadeCalendarioVideoPostagemV118,prepararItemCalendarioConfirmacaoR5,gerarItemIdCalendarioV101,cicloFonteAlertaCanonicoV135,demandaAbertaParaLimpezaV135,demandaPertenceLimpezaCanonicaV135,mesDoItemCalendario} from './lib/guardas-agendamento-cp101-i165.mjs';
import {clientePermiteReagendarR5} from './lib/guardas-stokki-i165.mjs';
import empresas from './lib/empresas-cp101-i165.mjs';
const texto=v=>typeof v==='string'?v.trim():'';
export async function calendarioConclusaoTxI165(db,tx,f,{publicado,restaurar=false,stokki=false}={}){
 const p=f.post,v=f.video,o=origemEditorialI165(p),moderna=!!v&&!!o,manual=!v&&p.origemManual===true;
 if(!moderna&&!manual)return{ref:null,items:null,como:'legado_sem_pauta_preservado'};
 const slug=moderna?o.calendarClienteSlug:p.cliente,ref=db.doc('calendarios/'+slug),s=await tx.get(ref);
 exigirI165(!moderna||s.exists,'calendario','O calendário físico não existe mais. Nenhuma baixa foi feita.');if(!s.exists)return{ref:null,items:null,como:'manual_sem_item_preservado'};
 const cal=s.data();exigirI165(cal.excluido!==true&&!cal.arquivado&&!cal.archived&&!cal.deletedAt,'calendario','O calendário foi retirado da operação.');
 if(stokki&&moderna){const occ=await tx.get(db.doc('calendarios_ocupacao/'+slug+'/competencias/'+o.calendarCompetencia+'/itens/'+o.calendarItemId));exigirI165(occ.exists&&occ.data().videoId===v.id,'ocupacao','A ocupação física não confirma este vídeo da Stokki.');}
 const identidade=moderna?confirmarIdentidadeCalendarioVideoPostagemV118(p,v):{moderna:false,slug},acao=publicado?'confirmar':'arquivar';
 let items;if(restaurar){items=structuredClone(cal.items||[]);const hits=items.map((it,i)=>({it,i})).filter(({it})=>it&&it.excluido!==true&&(moderna?it.itemId===o.calendarItemId&&mesDoItemCalendario(cal,it)===o.calendarCompetencia:String(it.postagemId||'')===p.id));exigirI165(hits.length<=1&&(!moderna||hits.length===1),'item','A peça física está ausente ou duplicada.');if(!hits.length)return{ref:null,items:null,como:'manual_sem_item_preservado'};const {it,i}=hits[0];exigirI165(it.postagemId===p.id,'ponteiro','A peça aponta para outra postagem.');empresas.conferir(p.cliente,p,v,it);items[i]={...it,posted:false,agendado:publicado===false&&p.status==='postado'};
 }else{items=prepararItemCalendarioConfirmacaoR5(p,identidade,cal,p.id,acao);if(items){const it=items.find(it=>it?.postagemId===p.id);empresas.conferir(p.cliente,p,v,it);}}
 return{ref:items?ref:null,items,como:moderna?'itemId_competencia':'postagemId_manual'};
}
export async function demandasCicloTxI165(db,tx,p){
 const q=await tx.get(db.collection('demandas').where('postagemId','==',p.id).limit(101));exigirI165(q.size<=100,'demandas-volume','Há muitas demandas deste conteúdo. Nenhuma baixa parcial foi feita.');const ciclo=cicloFonteAlertaCanonicoV135('postagem',p);return{ciclo,docs:q.docs.filter(s=>demandaAbertaParaLimpezaV135({...s.data(),id:s.id})&&demandaPertenceLimpezaCanonicaV135({...s.data(),id:s.id},{tipo:'postagem',fonteId:p.id,ciclo}))};
}
export function exigirFonteFactualI165(f){
 exigirI165(f.post.excluido!==true&&!f.post.arquivado&&f.configEntrega.modo==='postagem'&&(f.diretriz||compatLegadoConfirmadaI165(f)||f.programacaoCp111?.schema===1),'fonte','A postagem e a orientação precisam estar confirmadas.');
 if(f.video)exigirI165(f.video.excluido!==true&&f.video.clienteAprovou===true&&['aprovado','finalizado'].includes(f.video.status),'cliente','O vídeo e a confirmação real do cliente precisam estar preservados.');
}
export async function operarPublicacaoI165(db,auth,d,{agora=new Date()}={}){
 const a=identidadeTokenI165(auth,d.papelOperado,d.sessao||'publicacao'),em=instanteI165(agora);exigirI165(['Amanda','Chris','Cecília'].includes(a.papel)&&idFisicoI165(d.postagemId)&&idFisicoI165(d.operacaoId)&&['publicar','cancelar','desfazer_publicacao','conferir_divergencia'].includes(d.tipo),'operacao','Confira a postagem e esta decisão.');
 exigirI165(typeof d.assinaturaEsperada==='string'&&d.assinaturaEsperada&&d.assinaturaEsperada.length<=180000,'versao','Confira a versão atual da postagem.');
 const raw=pedidoBrutoHashI165(a,d);
 const input={postagemId:d.postagemId,operacaoId:d.operacaoId,tipo:d.tipo,assinaturaEsperada:d.assinaturaEsperada,rede:d.rede||'geral',dataReal:d.dataReal||'',horaReal:d.horaReal||'',prova:texto(d.prova),motivo:texto(d.motivo)},pedidoHash=hashI165({...input,uid:a.uid,papel:a.papel,atorReal:a.real}),rr=refIntencaoI165(db,a,'publicacao',d);
 exigirI165(input.prova.length<=3000&&input.motivo.length<=2000&&(d.tipo==='publicar'||input.motivo),'motivo','Deixe um recado curto sobre esta correção.');if(d.tipo==='conferir_divergencia')exigirI165(a.papel==='Amanda','papel','A Amanda confere uma publicação que saiu diferente do combinado.');
 return db.runTransaction(async tx=>{
  const {cfg}=await contextoTxI165(db,tx,a,'programacao'),rs=await tx.get(rr);if(rs.exists){const cancelada=conferirTombstoneI165(rs.data(),a,raw);if(cancelada)return cancelada;exigirI165(rs.data().pedidoHash===pedidoHash,'operacao-reutilizada','Esta tentativa pertence a outra ação.');return{estado:'recuperado',recibo:rs.data(),requerLeituraAtual:true};}
  const f=await fontesPostagemTxI165(db,tx,input.postagemId,agora),p=f.post,v=f.video;exigirFonteFactualI165(f);exigirI165(!p.publicacaoStokki||input.tipo==='conferir_divergencia','stokki','A Stokki usa uma confirmação por plataforma. Nenhuma baixa geral foi feita.');exigirI165(p.publicacaoStokki?['instagram','linkedin','tiktok','youtube'].includes(input.rede)&&p.publicacaoStokki.selecionadas.includes(input.rede):input.rede==='geral','rede','Confira a plataforma física desta conferência.');exigirI165(jsonCanonicoI165(p)===input.assinaturaEsperada,'versao','A postagem mudou em outra aba. Seu preenchimento continua aqui.');
  const as=assinaturaDiretrizI165(f.diretriz),controle=f.controle?.assinaturaDiretriz===as?f.controle:null;
  let resultado=null,patch=null,cal={ref:null,items:null},baixas={docs:[],ciclo:''},provaAnterior=p.provasPublicacaoI165?.[input.rede]||null;
  if(input.tipo==='publicar'){
   exigirI165(p.status==='agendado','estado','A postagem não está mais agendada.');resultado=validarAcaoFonteProgramacaoI165(f,{acao:'publicar',data:input.dataReal,hora:input.horaReal,prova:input.prova,rede:'geral',agora},a);
   const prova={texto:input.prova,data:input.dataReal,hora:input.horaReal,por:a.real,autorUid:a.uid,perfil:a.papel,em,operacaoId:input.operacaoId,ciclo:cicloFonteAlertaCanonicoV135('postagem',p),revisaoDiretriz:f.diretriz?.revisao||null,assinaturaDiretriz:f.diretriz?as:null,promessaPolitica:f.diretriz?.politica||null,continuidadeLegadaI165:f.legadoProgramacao||null};
   patch={status:'postado',postadoPor:a.real,postadoEm:em,provasPublicacaoI165:{...p.provasPublicacaoI165,geral:prova}};cal=await calendarioConclusaoTxI165(db,tx,f,{publicado:true});baixas=await demandasCicloTxI165(db,tx,p);
  }else if(input.tipo==='cancelar'){
   exigirI165(['aguardando_legenda','aguardando_agendamento','agendado'].includes(p.status),'estado','Um fato publicado não pode ser arquivado como se não tivesse saído.');const excecao=controle?.excecoes?.[chaveExcecaoI165({acao:'cancelar',rede:'geral'})];resultado=validarAcaoFonteProgramacaoI165(f,{acao:'cancelar',rede:'geral',excecao,motivo:input.motivo,agora},a);if(f.diretriz)exigirI165(excecao.assinaturaFonte===jsonCanonicoI165({post:f.post,video:f.video,diretriz:f.diretriz}),'excecao-fonte','A postagem mudou depois da decisão de retirada. Confira esta versão antes de cancelar.');
   patch={status:'arquivada_sem_postagem',arquivadaPor:a.real,arquivadaEm:em,notaCorrecao:input.motivo};cal=await calendarioConclusaoTxI165(db,tx,f,{publicado:false});baixas=await demandasCicloTxI165(db,tx,p);
  }else if(input.tipo==='desfazer_publicacao'){
   exigirI165(p.status==='postado'&&provaAnterior&&f.clienteAtivo&&clientePermiteReagendarR5(f.config,horarioBrasiliaI165(agora).slice(0,10),p.cliente),'estado','Confira o cliente ativo e a confirmação exata antes de corrigir o registro.');
   exigirI165(!v||v.status==='finalizado'&&v.finalizadoVia==='postagem_publicada','video-estado','O vídeo mudou depois da publicação; nenhuma etapa foi reaberta.');
   patch={status:'agendado',postadoEm:'',postadoPor:'',confirmacaoPostagemCriada:false,provasPublicacaoI165:{...p.provasPublicacaoI165,geral:{...provaAnterior,invalidada:true,invalidadaPor:a.real,invalidadaEm:em,invalidacaoMotivo:input.motivo}}};cal=await calendarioConclusaoTxI165(db,tx,f,{publicado:false,restaurar:true});
  }else{
   exigirI165(!!f.diretriz,'legado-sem-promessa','Este conteúdo anterior não possui uma promessa de data para conferir como divergente.');
   exigirI165((p.publicacaoStokki?p.publicacaoStokki.redes?.[input.rede]?.publicadaEm:p.status==='postado')&&provaAnterior&&!provaAnterior.invalidada,'prova','Confira a publicação real e sua prova atual.');resultado=validarOperacaoProgramacaoI165(f.diretriz,{acao:'publicar',data:provaAnterior.data,hora:provaAnterior.hora,prova:provaAnterior.texto,rede:input.rede,agora});
   const registro={prova:jsonCanonicoI165(provaAnterior),motivo:input.motivo,por:'Amanda',autorUid:a.uid,atorReal:a.real,em};tx.set(db.doc('programacao_controles_i165/'+p.id),{...f.controle,schema:1,postagemId:p.id,videoId:v?.id||'',cliente:p.cliente,diretriz:f.diretriz,assinaturaDiretriz:as,revisao:f.diretriz.revisao,ativacaoId:cfg.ativacaoId,excecoes:controle?.excecoes||{},conferenciasPublicacao:{...f.controle?.conferenciasPublicacao,[input.rede]:registro},atualizadoEm:em});tx.set(db.doc('programacao_controles_i165/'+p.id+'/conferencias/'+hashI165([input.rede,registro.prova])),registro);
  }
  const recibo={schema:1,pedidoBrutoHash:raw,tipo:'publicacao',estado:'confirmada',operacaoId:input.operacaoId,pedidoHash,postagemId:p.id,videoId:v?.id||'',acao:input.tipo,autoria:{uid:a.uid,papel:a.papel,atorReal:a.real},em,ativacaoId:cfg.ativacaoId,divergente:resultado?.divergente===true,continuidadeLegadaI165:f.legadoProgramacao||null,excecaoAplicada:resultado?.excecaoAplicada===true,baixas:baixas.docs.map(s=>s.id),calendarioAtualizado:!!cal.ref};
  if(patch){const h={acao:'Programação I165 — '+input.tipo,por:a.real,autorUid:a.uid,perfil:a.papel,em,detalhe:input.motivo||input.prova};patch.historico=[...(p.historico||[]),h];if(provaAnterior)tx.set(db.doc('postagens/'+p.id+'/provas_historico_i165/'+hashI165(['geral',input.operacaoId])),{rede:'geral',prova:provaAnterior,operacaoId:input.operacaoId,em});tx.update(db.doc('postagens/'+p.id),patch);if(cal.ref)tx.update(cal.ref,{items:cal.items,updatedAt:em});
   if(v)tx.update(db.doc('videos_producao/'+v.id),input.tipo==='desfazer_publicacao'?{status:'aprovado',finalizadoEm:'',finalizadoVia:''}:{status:'finalizado',finalizadoEm:em,finalizadoVia:input.tipo==='publicar'?'postagem_publicada':'arquivada_sem_postagem'});
   for(const s of baixas.docs)tx.update(s.ref,{status:input.tipo==='publicar'?'aprovada':'cancelada',concluidoPor:a.real,concluidoEm:new Date(agora),notaConclusao:input.tipo==='publicar'?'Publicação real confirmada junto à fonte.':'Arquivada sem declarar publicação: '+input.motivo,resolucaoPublicacaoI165:{postagemId:p.id,ciclo:baixas.ciclo,operacaoId:input.operacaoId,acao:input.tipo,em},...(input.tipo==='publicar'?{provaTexto:input.prova}:{})});
  }
  tx.set(rr,recibo);return{estado:'novo',recibo,postagemAtual:patch?{...p,...patch}:p,requerLeituraAtual:true,planoPreservado:true};
 });
}
