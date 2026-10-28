import {refDispensaI118,tempoFisicoI118} from './dispensa-retroativa-suporte-i118.mjs';
import {resolverCompatLegadoProgramacaoI165,resolverProgramacaoCp111} from './compat-legado-programacao-r83.mjs';
import {lerPostCampanhaI165} from './campanhas.mjs';
import {exigirI165,idFisicoI165,jsonCanonicoI165,dataCivilI165,horaCivilI165,entregaSemPostagemI165} from './lib/gs-contexto-operacional-i165.mjs';
import {origemEditorialI165,conferirVinculoCanonicoI165,conferirDiretrizAtualI165,retratoEditorialProgramacaoI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {clienteTxI165,hashI165} from './contexto.mjs';
const fisico=s=>s?.exists?{...s.data(),id:s.id}:null;
export async function lerOrigemProgramacaoTxCp111(db,tx,video) {
 const o=origemEditorialI165(video);if(!o)return {tipo:'extra_ou_legado_sem_origem',assinatura:hashI165(null)};
 exigirI165(o.calendarClienteSlug===video.cliente,'origem-cliente','A origem precisa usar o mesmo cliente físico; aliases exigem reconciliação explícita.');
 const s=await tx.get(db.doc('calendarios/'+o.calendarClienteSlug));exigirI165(s.exists&&s.data().excluido!==true,'calendario','O calendário físico não foi confirmado.');
 const c=s.data(),ap=c.aprovacaoMeses?.[o.calendarCompetencia],foto=ap?.retratoLiberadoV115;
 const publicados=Array.isArray(foto?.items)?foto.items:null;
 const itens=publicados||c.items;
 exigirI165(Array.isArray(itens),'calendario','A versão da origem editorial não foi confirmada.');
 const encontrados=itens.filter(i=>i&&i.excluido!==true&&(i.itemId||i.id)===o.calendarItemId&&(publicados||i.mes===o.calendarCompetencia));
 exigirI165(encontrados.length===1,'item','A peça editorial precisa existir uma única vez na competência exata.');
 const item=encontrados[0];exigirI165((item.empresaOtavio||'')===(video.empresaOtavio||''),'empresa','A empresa da peça e a do vídeo divergem.');
 const retrato=retratoEditorialProgramacaoI165(item,video.postagemId||'');
 const erro=retrato.dataPostagem&&!dataCivilI165(retrato.dataPostagem)?'A data específica do calendário é inválida; ela não foi trocada pelo dia editorial.':'';
 const porDia=Number.isInteger(retrato.day)?o.calendarCompetencia+'-'+String(retrato.day).padStart(2,'0'):'';
 return {tipo:publicados?'retrato_publicado':'item_mes_explicito',...(erro?{erro}:{}),identidade:o,assinatura:hashI165({o,item:retrato,publicacao:publicados?ap.aprovadoEm||foto.publicadoEm||'':''}),dataSugerida:retrato.dataPostagem||(dataCivilI165(porDia)?porDia:''),dataFixa:retrato.dataFlexivel!==true?retrato.dataPostagem||'':'',hora:horaCivilI165(retrato.horaPostagem)?retrato.horaPostagem:''};
}
export async function origemTxI165(db,tx,video) {const o=await lerOrigemProgramacaoTxCp111(db,tx,video);return {tipo:o.tipo,assinatura:o.assinatura};}
export async function compromissoVideoTxI165(db,tx,video) {
 const v=await tx.get(db.doc('programacao_vinculos_video_i165/'+video.id));if(!v.exists)return {compromisso:null,decisao:null};const d=v.data();
 exigirI165(d.videoId===video.id&&d.cliente===video.cliente&&(d.empresaOtavio||'')===(video.empresaOtavio||'')&&[d.campanhaId,d.clienteSlug,d.postagemCampanhaId].every(idFisicoI165),'campanha-vinculo','Confira o vínculo físico da campanha.');
 const c=await tx.get(db.doc('campanhas/'+d.campanhaId));exigirI165(c.exists&&c.data().excluido!==true&&!c.data().arquivada,'campanha','A campanha não foi confirmada.');
 exigirI165(d.clienteSlug===video.cliente,'campanha-vinculo','A campanha não confirma o mesmo cliente físico.');
 const opcao=lerPostCampanhaI165(d.campanhaId,c.data(),video,d.postagemCampanhaId),compromisso={confirmado:true,id:d.campanhaId,videoId:video.id,cliente:video.cliente,empresaOtavio:video.empresaOtavio||'',postagemCampanhaId:d.postagemCampanhaId,data:opcao.data,hora:opcao.hora,revisao:c.data().revisaoI7||0,vinculoRevisao:d.revisao||0,assinaturaFonte:opcao.escolha.assinaturaFonte};
 const decisao=d.decisaoId?await tx.get(db.doc('programacao_decisoes_campanha_i165/'+d.decisaoId)):null;
 return {compromisso,decisao:decisao?.data()||null};
}
export async function fontesPostagemTxI165(db,tx,id,agora,{conferirDiretriz=true}={}) {
 exigirI165(idFisicoI165(id),'postagem','Postagem inválida.');const ps=await tx.get(db.doc('postagens/'+id));exigirI165(ps.exists,'postagem','A postagem não existe.');const post=fisico(ps);
 const vs=post.videoId?await tx.get(db.doc('videos_producao/'+post.videoId)):null,video=fisico(vs);exigirI165(!post.videoId||video,'video','O vídeo da postagem não foi confirmado.');
 conferirVinculoCanonicoI165(post,video);
 const [diretriz,controle,editorial,dispensa]=await Promise.all([tx.get(db.doc((video?'video_programacao_i165/':'post_programacao_i165/')+(video?.id||post.id))),tx.get(db.doc('programacao_controles_i165/'+id)),tx.get(db.doc('processo_calendarios_i164/ativo')),tx.get(refDispensaI118(db,id))]);
 const cliente=await clienteTxI165(db,tx,post.cliente,agora),d=diretriz.data()||null;
 const legadoProgramacao=d?null:resolverCompatLegadoProgramacaoI165({cfg:(await tx.get(db.doc('programacao_config_i165/ativo'))).data(),post,video,postCreateTime:ps.createTime,videoCreateTime:vs?.createTime,diretriz:d});
 if(d&&conferirDiretriz){conferirDiretrizAtualI165(d,video,post);if(video&&d.origemConferida){const origem=await origemTxI165(db,tx,video);exigirI165(jsonCanonicoI165(origem)===jsonCanonicoI165(d.origemConferida),'origem-avancou','A peça editorial mudou; a Amanda precisa reconferir o compromisso.');}if(video){const campanha=await compromissoVideoTxI165(db,tx,video);exigirI165((d.compromisso||'')===(campanha.compromisso?jsonCanonicoI165(campanha.compromisso):'')&&(d.decisaoCompromisso||'')===(campanha.decisao?jsonCanonicoI165(campanha.decisao):''),'campanha-avancou','A campanha mudou depois da orientação. A Amanda precisa reconferir a data antes de programar.');}}
 let origem=null,campanha=null;
 try{origem=await lerOrigemProgramacaoTxCp111(db,tx,video||{...post,postagemId:post.id});}catch(e){origem={erro:e.message,codigo:e.code||'i165/origem-indisponivel'};}
 if(video)try{campanha=await compromissoVideoTxI165(db,tx,video);}catch(e){campanha={erro:e.message,codigo:e.code||'i165/campanha-indisponivel'};}
 const programacaoCp111=resolverProgramacaoCp111({diretriz:d,origem,campanha});
 return {post,postCreateTime:tempoFisicoI118(ps.createTime),dispensaRetroativaI118:dispensa.data()||null,video,diretriz:d,programacaoCp111,legadoProgramacao,controle:controle.data()||null,processoEditorial:editorial.data()||null,...cliente,configEntrega:entregaSemPostagemI165(video||{cliente:post.cliente},cliente.config)?{modo:'entrega_direta'}:cliente.configEntrega};
}
