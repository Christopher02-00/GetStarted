import {exigirI165,idFisicoI165,dataCivilI165,horaCivilI165,jsonCanonicoI165} from './lib/gs-contexto-operacional-i165.mjs';
import {hashI165} from './contexto.mjs';
const keys=['campanhaId','clienteSlug','postagemCampanhaId','empresaOtavio','assinaturaFonte'];
export function normalizarEscolhaCampanhaI165(e){
 if(e==null)return null;
 exigirI165(e&&typeof e==='object'&&!Array.isArray(e)&&Object.keys(e).length===keys.length&&Object.keys(e).every(k=>keys.includes(k)),'campanha-escolha','Escolha uma opção física mostrada nesta aprovação.');
 exigirI165([e.campanhaId,e.clienteSlug,e.postagemCampanhaId].every(idFisicoI165)&&typeof e.empresaOtavio==='string'&&e.empresaOtavio.length<=80&&/^[a-f0-9]{64}$/.test(e.assinaturaFonte),'campanha-escolha','A opção da campanha está incompleta.');
 return Object.fromEntries(keys.map(k=>[k,e[k]]));
}
export function lerPostCampanhaI165(campanhaId,c,video,postagemCampanhaId){
 exigirI165([campanhaId,video.cliente,postagemCampanhaId].every(idFisicoI165),'campanha-vinculo','Os identificadores físicos da campanha precisam estar completos.');
 exigirI165(c&&c.excluido!==true&&!c.arquivada&&Array.isArray(c.clientes),'campanha','A campanha física não está disponível.');
 const grupos=c.clientes.filter(x=>x&&x.slug===video.cliente);
 exigirI165(grupos.length>0&&grupos.every(x=>Array.isArray(x.postagens)),'campanha-vinculo','O agrupamento físico da campanha está incompleto.');
 const encontrados=grupos.flatMap(cl=>cl.postagens.filter(p=>p&&p.id===postagemCampanhaId).map(p=>({cl,p})));
 exigirI165(encontrados.length===1&&encontrados[0].p.excluido!==true,'campanha-vinculo','O conteúdo físico da campanha não está disponível uma única vez.');
 const {cl,p}=encontrados[0];exigirI165(!p.empresaOtavio||!cl.empresaOtavio||p.empresaOtavio===cl.empresaOtavio,'campanha-empresa','A empresa do agrupamento e a da postagem divergem.');
 const empresa=p.empresaOtavio||cl.empresaOtavio||'';
 exigirI165(empresa===(video.empresaOtavio||''),'campanha-empresa','Esta campanha não identifica a mesma empresa do vídeo. Nenhuma empresa foi inferida.');
 exigirI165(dataCivilI165(p.dataPublicacao)&&(!p.horaPublicacao||horaCivilI165(p.horaPublicacao)),'campanha-data','O conteúdo da campanha precisa de data física válida.');
 const escolha={campanhaId,clienteSlug:video.cliente,postagemCampanhaId,empresaOtavio:empresa,assinaturaFonte:hashI165({campanhaId,campanha:c,clienteSlug:video.cliente,postagemCampanhaId,empresaOtavio:empresa})};
 return {escolha,campanhaNome:String(c.nome||campanhaId),titulo:String(p.titulo||postagemCampanhaId),data:p.dataPublicacao,hora:p.horaPublicacao||'',prazoProgramacao:p.prazoProgramacao||''};
}
export async function listarOpcoesCampanhaTxI165(db,tx,video){
 const q=await tx.get(db.collection('campanhas').limit(201));
 exigirI165(q.size<=200,'campanha-volume','Há muitas campanhas para esta conferência. Nenhuma lista parcial foi anunciada como completa.');
 const opcoesCampanha=[],campanhasSemOpcao=[];
 for(const s of q.docs){const c=s.data();if(c.excluido===true||c.arquivada)continue;
  const grupos=Array.isArray(c.clientes)?c.clientes.filter(x=>x&&x.slug===video.cliente):[];
  if(!grupos.length)continue;
  if(!grupos.every(g=>Array.isArray(g.postagens))){campanhasSemOpcao.push({campanhaId:s.id,motivo:'Cliente/agrupamento físico incompleto.'});continue;}
  for(const p of grupos.flatMap(g=>g.postagens)){if(!p||p.excluido===true)continue;try{opcoesCampanha.push(lerPostCampanhaI165(s.id,c,video,p.id));}catch(e){campanhasSemOpcao.push({campanhaId:s.id,motivo:e.code||'campanha-incompleta'});}}
 }
 return {opcoesCampanha,campanhasSemOpcao,consultaCompleta:true};
}
export async function escolherCampanhaTxI165(db,tx,video,escolha,ator,em){
 const e=normalizarEscolhaCampanhaI165(escolha);if(!e)return null;
 exigirI165(e.clienteSlug===video.cliente&&e.empresaOtavio===(video.empresaOtavio||''),'campanha-vinculo','A escolha pertence a outro cliente ou empresa.');
 const ref=db.doc('programacao_vinculos_video_i165/'+video.id),old=await tx.get(ref),s=await tx.get(db.doc('campanhas/'+e.campanhaId));
 exigirI165(s.exists,'campanha','A campanha não existe mais.');const atual=lerPostCampanhaI165(e.campanhaId,s.data(),video,e.postagemCampanhaId);
 exigirI165(jsonCanonicoI165(atual.escolha)===jsonCanonicoI165(e),'campanha-avancou','A campanha mudou depois de abrir. Confira a mesma opção novamente.');
 const vinculo=old.data();
 if(old.exists){exigirI165(vinculo.videoId===video.id&&vinculo.cliente===video.cliente&&vinculo.campanhaId===e.campanhaId&&vinculo.clienteSlug===e.clienteSlug&&vinculo.postagemCampanhaId===e.postagemCampanhaId&&(vinculo.empresaOtavio||'')===e.empresaOtavio,'campanha-troca','Este vídeo já tem outro vínculo físico. Uma troca precisa de decisão própria da Amanda.');return {ref,vinculo,gravar:false,opcao:atual,campanha:s.data()};}
 return {ref,vinculo:{schema:1,videoId:video.id,cliente:video.cliente,...e,revisao:1,autoria:{uid:ator.uid,papel:ator.papel,atorReal:ator.real},em},gravar:true,opcao:atual,campanha:s.data()};
}
export function compromissoSelecionadoI165(video,selecao){
 const d=selecao.vinculo,c=selecao.campanha,p=selecao.opcao;
 return {confirmado:true,id:d.campanhaId,videoId:video.id,cliente:video.cliente,empresaOtavio:video.empresaOtavio||'',postagemCampanhaId:d.postagemCampanhaId,data:p.data,hora:p.hora,revisao:c.revisaoI7||0,vinculoRevisao:d.revisao||0,assinaturaFonte:p.escolha.assinaturaFonte};
}
