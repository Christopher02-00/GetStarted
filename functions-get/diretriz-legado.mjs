import {refIntencaoI165,pedidoBrutoHashI165,conferirTombstoneI165,controleOperacaoI165} from './ciclo-intencao.mjs';
import {exigirI165,idFisicoI165,instanteI165,jsonCanonicoI165,entregaSemPostagemI165} from './lib/gs-contexto-operacional-i165.mjs';
import {normalizarDiretrizI165,identidadeMaterialI165,assinaturaEntregaI165,assinaturaDiretrizI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {identidadeTokenI165,contextoTxI165,hashI165} from './contexto.mjs';
import {fontesPostagemTxI165,origemTxI165,compromissoVideoTxI165} from './fontes.mjs';
const prepararAtor=(auth,d)=>{const a=identidadeTokenI165(auth,d.papelOperado,d.sessao||'diretriz');exigirI165(a.papel==='Amanda','papel','A Amanda precisa conferir as orientações de conteúdos anteriores.');return a;};
const limite=s=>{exigirI165(s.length<=180000,'fonte-grande','Esta ficha excedeu o limite de conferência; nada foi cortado.');return s;};
async function fontesLegado(db,tx,id,agora){
 const f=await fontesPostagemTxI165(db,tx,id,agora,{conferirDiretriz:false});
 exigirI165(f.clienteAtivo&&f.configEntrega.modo==='postagem'&&f.post.excluido!==true&&!f.post.arquivado&&['aguardando_legenda','aguardando_agendamento','agendado'].includes(f.post.status),'legado-estado','Este conteúdo não está na operação de programação. O histórico foi mantido.');
 if(f.video)exigirI165(f.video.status==='aprovado'&&f.video.clienteAprovou===true&&!entregaSemPostagemI165(f.video,f.config),'cliente','A confirmação real do cliente precisa estar concluída. Não aprovamos de novo a qualidade ou o cliente.');
 const origem=f.video?await origemTxI165(db,tx,f.video):null,campanha=f.video?await compromissoVideoTxI165(db,tx,f.video):{compromisso:null,decisao:null};
 return {...f,origemConferida:origem,campanha,assinaturaFonte:limite(jsonCanonicoI165({post:f.post,video:f.video,diretriz:f.diretriz,origem,campanha}))};
}
export async function prepararDiretrizLegadoI165(db,auth,d,{agora=new Date()}={}){
 const ator=prepararAtor(auth,d);exigirI165(idFisicoI165(d.postagemId),'postagem','Reabra a postagem física.');
 return db.runTransaction(async tx=>{await contextoTxI165(db,tx,ator,'programacao');const f=await fontesLegado(db,tx,d.postagemId,agora);return{postagem:f.post,video:f.video,diretrizAnterior:f.diretriz,assinaturaFonte:f.assinaturaFonte,compromissoEsperado:f.campanha.compromisso,controleOperacao:controleOperacaoI165('adotar_diretriz'),somenteLeitura:true,nenhumaEscrita:true,coberturaCampanha:f.campanha.compromisso?'vinculo_fisico_confirmado':'sem_vinculo_fisico_nao_comprova_ausencia_de_campanha'};});
}
export async function adotarDiretrizLegadoI165(db,auth,d,{agora=new Date()}={}){
 const ator=prepararAtor(auth,d),em=instanteI165(agora);
 exigirI165(idFisicoI165(d.postagemId)&&idFisicoI165(d.operacaoId)&&typeof d.assinaturaFonte==='string'&&d.assinaturaFonte&&d.assinaturaFonte.length<=180000&&Object.hasOwn(d,'compromissoEsperado'),'intencao','Confira a fonte e a intenção desta orientação.');
 exigirI165(d.campanhaEscolhida==null,'campanha-vinculo','Esta conferência conserva somente vínculos físicos já existentes. Não vincula campanha por título.');
 const politica=normalizarDiretrizI165(d.diretriz);exigirI165(politica.urgencia==='normal'||politica.observacao,'urgencia-motivo','Conte por que este conteúdo precisa de prioridade.');
 const raw=pedidoBrutoHashI165(ator,d);
 const pedidoHash=hashI165({postagemId:d.postagemId,operacaoId:d.operacaoId,assinaturaFonte:d.assinaturaFonte,compromissoEsperado:d.compromissoEsperado,politica,uid:ator.uid,papel:ator.papel,atorReal:ator.real}),rr=refIntencaoI165(db,ator,'adotar_diretriz',d);
 return db.runTransaction(async tx=>{
  const {cfg,ctx}=await contextoTxI165(db,tx,ator,'programacao'),rs=await tx.get(rr);
  if(rs.exists){const cancelada=conferirTombstoneI165(rs.data(),ator,raw);if(cancelada)return cancelada;exigirI165(rs.data().pedidoHash===pedidoHash,'operacao-reutilizada','A tentativa anterior pertence a outra orientação.');return{estado:'recuperado',recibo:rs.data(),requerLeituraAtual:true};}
  const f=await fontesLegado(db,tx,d.postagemId,agora);exigirI165(f.assinaturaFonte===d.assinaturaFonte&&jsonCanonicoI165(f.campanha.compromisso)===jsonCanonicoI165(d.compromissoEsperado),'versao','A fonte mudou depois da conferência. Sua orientação foi preservada; confira novamente.');
  const cp=f.campanha.compromisso;if(cp)exigirI165(politica.modalidade==='data'&&politica.data===cp.data&&politica.hora&&(!cp.hora||politica.hora===cp.hora),'campanha-data','Mantenha a data física da campanha e informe o horário. Troca de vínculo não faz parte desta ação.');
  exigirI165(!f.diretriz||Number.isInteger(f.diretriz.revisao)&&f.diretriz.revisao>0,'diretriz-anterior','A versão anterior precisa de reconciliação explícita.');
  const identidade=f.video?identidadeMaterialI165(f.video):{videoId:'',postagemId:f.post.id,cliente:f.post.cliente,empresaOtavio:f.post.empresaOtavio||'',origem:{calendarClienteSlug:f.post.calendarClienteSlug,calendarCompetencia:f.post.calendarCompetencia,calendarItemId:f.post.calendarItemId}};
  if(!f.video&&Object.values(identidade.origem).every(x=>!x))identidade.origem=null;
  const diretriz={schema:1,...identidade,politica,revisao:(f.diretriz?.revisao||0)+1,operacaoId:d.operacaoId,assinaturaEntrega:f.video?assinaturaEntregaI165(f.video):'',assinaturaVideoConferido:f.video?jsonCanonicoI165(f.video):'',compromisso:cp?jsonCanonicoI165(cp):'',decisaoCompromisso:f.campanha.decisao?jsonCanonicoI165(f.campanha.decisao):'',origemConferida:f.origemConferida,autoria:{uid:ctx.uid,papel:ctx.papel,atorReal:ctx.atorReal},em,ativacaoId:cfg.ativacaoId,tipo:'adocao_legado_manual'};
  const ref=db.doc((f.video?'video_programacao_i165/':'post_programacao_i165/')+(f.video?.id||f.post.id)),recibo={schema:1,pedidoBrutoHash:raw,tipo:'adotar_diretriz',estado:'confirmada',operacaoId:d.operacaoId,pedidoHash,postagemId:f.post.id,videoId:f.video?.id||'',revisao:diretriz.revisao,assinaturaDiretriz:assinaturaDiretrizI165(diretriz),autoria:diretriz.autoria,em,semReaprovarQualidade:true,semReaprovarCliente:true};
  tx.set(ref,diretriz);tx.set(ref.collection('versoes').doc(String(diretriz.revisao)),diretriz);tx.set(rr,recibo);
  return{estado:'novo',diretriz,recibo,requerLeituraAtual:true,postagemPreservada:true,videoPreservado:true};
 });
}
