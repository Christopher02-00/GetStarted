import {hashI165} from './contexto.mjs';
import {exigirI165,dataCivilI165,horaCivilI165,horarioBrasiliaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {redesPostagemDispensaI118,agendaRedeDispensaI118,assinaturaAgendaRedeDispensaI118,registroRedeDispensadaI118,textoCanonicoDispensaI118} from './lib/gs-dispensa-retroativa-i118.mjs';
import {cicloFonteAlertaCanonicoV135,demandaPertenceLimpezaCanonicaV135} from './lib/guardas-agendamento-cp101-i165.mjs';
export const refDispensaI118=(db,id)=>db.doc('programacao_controles_i165/'+id+'/dispensas_retroativas_i118/ativo');
export const tempoFisicoI118=t=>t?{seconds:t.seconds??t._seconds,nanoseconds:t.nanoseconds??t._nanoseconds??0}:null;
export const assinaturaContextoDispensaI118=f=>hashI165({diretriz:f.diretriz,programacao:f.programacaoCp111,legado:f.legadoProgramacao,video:f.video?{id:f.video.id,status:f.video.status,clienteAprovou:f.video.clienteAprovou,excluido:f.video.excluido===true}:null,clienteAtivo:f.clienteAtivo,modo:f.configEntrega?.modo});
export function dispensaServidorRedeI118(f,rede){if(!f.clienteAtivo||f.configEntrega?.modo!=='postagem')return null;return registroRedeDispensadaI118(f.post,rede,f.dispensaRetroativaI118,{createTime:f.postCreateTime,assinaturaContexto:assinaturaContextoDispensaI118(f)});}
export function alvoDispensaI118(f,corte){
 const p=f.post;if(!f.clienteAtivo||f.configEntrega?.modo!=='postagem'||p.excluido===true||p.arquivado||!['aguardando_agendamento','agendado','postado'].includes(p.status)||f.video&&(f.video.excluido===true||!['aprovado','finalizado'].includes(f.video.status)||f.video.clienteAprovou!==true))return null;
 const limite=horarioBrasiliaI165(corte),redes=[];if(!f.postCreateTime||f.postCreateTime.seconds*1000>new Date(corte).getTime())return null;
 for(const rede of redesPostagemDispensaI118(p)){
  const r=agendaRedeDispensaI118(p,rede);if(!r||r.retirada||r.conferidaEm||!dataCivilI165(r.data)||!horaCivilI165(r.hora)||r.data+'T'+r.hora>limite||dispensaServidorRedeI118(f,rede)||rede==='geral'&&p.status!=='agendado')continue;
  redes.push({rede,data:r.data,hora:r.hora,tipos:r.publicadaEm?['conferir_publicacao_legada']:['confirmar_publicacao'],agendaAssinatura:assinaturaAgendaRedeDispensaI118(p,rede)});
 }
 if(!redes.length)return null;
 return {postagemId:p.id,createTime:f.postCreateTime,cliente:p.cliente,titulo:p.titulo||'Conteúdo',assinaturaFonte:hashI165({post:p,createTime:f.postCreateTime,contexto:assinaturaContextoDispensaI118(f)}),ciclo:cicloFonteAlertaCanonicoV135('postagem',p),redes};
}
export async function demandasRetroativasTxI118(db,tx,f){
 if(!redesPostagemDispensaI118(f.post).some(r=>dispensaServidorRedeI118(f,r)))return [];
 if(!redesPostagemDispensaI118(f.post).every(r=>agendaRedeDispensaI118(f.post,r)?.retirada||agendaRedeDispensaI118(f.post,r)?.conferidaEm||dispensaServidorRedeI118(f,r)))return [];
 const q=await tx.get(db.collection('demandas').where('postagemId','==',f.post.id).limit(101));exigirI165(q.size<=100,'i118-volume','Há muitas cobranças desta origem. Nada foi encerrado parcialmente.');
 const ciclo=cicloFonteAlertaCanonicoV135('postagem',f.post);
 return q.docs.filter(s=>{const d={...s.data(),id:s.id};return d.status==='pendente'&&d.origem==='sistema'&&d.destinatario==='Cecília'&&!d.provaTexto&&!d.provaImagemUrl&&demandaPertenceLimpezaCanonicaV135(d,{tipo:'postagem',fonteId:f.post.id,ciclo})&&(!d.dataFonteV135||d.dataFonteV135===f.post.dataAgendada)&&(!d.horaFonteV135||d.horaFonteV135===f.post.horaAgendada);});
}
export function encerrarDemandasRetroativasI118(tx,docs,f,em,operacaoId,ator){for(const d of docs)tx.update(d.ref,{status:'cancelada_automaticamente',concluidoEm:em,concluidoPor:ator||'Sistema',notaConclusao:'Cobrança retroativa dispensada administrativamente; não confirma publicação nem qualidade.',resolucaoCobrancaRetroativaI118:{schema:1,postagemId:f.post.id,ciclo:cicloFonteAlertaCanonicoV135('postagem',f.post),operacaoId,em,administrativa:true}});}
