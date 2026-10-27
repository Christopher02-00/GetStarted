/* Autorização privada por I54; o mês e o retrato público permanecem intactos. */
import {isDeepStrictEqual} from 'node:util';
import {hashEditorialI172} from './editorial-contrato-i172.mjs';
import {exigirCentralR80 as e,chavesR80,textoR80} from './central-preparacao-validacao-r80.mjs';
import {mesDoItemCalendario} from './lib/guardas-stokki-i165.mjs';
import aprovacao from './gs-aprovacao-conteudo-i68-editorial.mjs';
import {mesclarCompetenciaCalendarioV125} from './editorial-helpers-oficiais-i172.mjs';
export const ACOES_CORRECAO_CONTEUDO_CP115=Object.freeze(['ajuste_calendario_iniciar_correcao_cp115','ajuste_calendario_salvar_conteudo_cp115']);
export const CAMPOS_CORRECAO_CP115=Object.freeze({ref:2000,desc:30000,legenda:30000,obs:10000});
export function validarConteudoCp115(v){chavesR80(v,Object.keys(CAMPOS_CORRECAO_CP115),[]);e(Object.keys(v).length>0,'Informe o conteúdo deste pedido.');for(const [k,t]of Object.entries(v))textoR80(t,CAMPOS_CORRECAO_CP115[k],k);}
const validaData=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
function contextoPublicado(c,cal){
 const m=cal.aprovacaoMeses?.[c.competencia],r=m?.retratoLiberadoV115,st=c._estadoLegado,p=st?.publicacaoAtual,scope=st?.correcaoIndividualCp115;
 const escopado=scope?.schema===1&&scope.ciclo===c.id&&scope.retratoPublicadoEm===r?.publicadoEm&&scope.retratoHash===hashEditorialI172(r||{})&&['aberta','enviada','devolvida'].includes(st?.fase)&&['ajuste_interno','aguardando_interna','aprovado_interno'].includes(m?.status);
 if(c.modo!=='continuar_legado'||!(m?.status==='liberado'&&st?.fase==='publicada'||escopado)||r?.schemaVersion!==1||r.mes!==c.competencia||r.publicadoPor!=='Amanda'||!validaData(r.publicadoEm)||!Array.isArray(r.items)||p?.em!==r.publicadoEm||!isDeepStrictEqual(p.retrato,r))return null;
 const evento=[...(st.historico||[])].reverse().find(x=>x.acao==='central_editor_decidir'&&x.decisao==='publicar');
 if(!evento||!/^[A-Za-z0-9_-]{8,80}$/.test(evento.operacao||'')||typeof evento.uid!=='string'||!evento.uid||!evento.por||evento.em!==r.publicadoEm)return null;
 return {evento,retrato:r,retratoHash:hashEditorialI172(r)};
}
export function pedidoElegivelCorrecaoCp115(r){return !!r.d&&!r.inativo&&!r.histPublico&&!r.cancelado&&r.d.destinatario==='Chris'&&r.d.status==='pendente'&&!['enviado','aprovado'].includes(r.s?.estado)&&!r.item.excluido&&!r.item.posted&&!r.item.postado&&!r.item.agendado;}
export async function provaPublicacaoCorrecaoTxCp115(db,tx,c,cal){
 const v=contextoPublicado(c,cal);if(!v)return null;
 const ref=db.doc('calendarios_versoes/'+c.cliente+'__i172_'+v.evento.operacao+'/editorial_i172/recibo'),s=await tx.get(ref);if(!s.exists)return null;const p=s.data();
 if(p.schema!==1||p.origemEditorial!=='continuar_legado'||p.acao!=='central_editor_decidir'||p.ciclo!==c.id||p.operacao!==v.evento.operacao||p.papel!=='Amanda'||p.atorReal!==v.evento.por||p.uid!==v.evento.uid||p.em!==v.evento.em||!isDeepStrictEqual(p.retratoPublicacao,v.retrato))return null;
 return {schema:1,publicacao:p.operacao,em:p.em,retratoHash:v.retratoHash,autoridade:ref.path};
}
function autorizacao(r,ator){const a=r.s?.correcaoConteudoCp115,p=r.provaCorrecaoCp115;return !!a&&a.schema===1&&a.ciclo===r.s.ciclo&&a.demandaId===r.id&&a.itemId===r.item.itemId&&a.operationId===r.p.operationId&&a.uid===ator.uid&&a.atorReal===ator.real&&a.papel==='Chris'&&a.hashConteudo===r.hashConteudo&&a.retratoHash===p?.retratoHash&&a.publicacao===p?.publicacao&&Number.isInteger(a.revisao)&&a.revisao>0;}
export function dtoCorrecaoCp115(r,ator){
 const old=r.s?.correcaoConteudoCp115,propria=!old||old.uid===ator.uid&&old.atorReal===ator.real&&old.demandaId===r.id&&old.itemId===r.item.itemId;const apto=propria&&ator.papel==='Chris'&&ator.real==='Chris'&&pedidoElegivelCorrecaoCp115(r)&&!!r.provaCorrecaoCp115,iniciada=apto&&autorizacao(r,ator);
 return {correcao:{iniciada,revisao:Number.isInteger(old?.revisao)&&old.revisao>0?old.revisao:0,item:{itemId:r.item.itemId,...Object.fromEntries(Object.keys(CAMPOS_CORRECAO_CP115).map(k=>[k,typeof r.item[k]==='string'?r.item[k]:'']))}},iniciarCorrecao:apto&&!iniciada,salvarConteudo:iniciada};
}
export async function prepararCorrecaoPedidoTxCp115(db,tx,{r,c,cal,ator,pedido,em,s,hashPedido,hashConteudo}){
 e(ator.papel==='Chris'&&ator.real==='Chris'&&pedidoElegivelCorrecaoCp115(r)&&r.provaCorrecaoCp115,'Este pedido não permite corrigir conteúdo nesta versão liberada. Os envios anteriores foram preservados.');
 const publicos=r.provaCorrecaoCp115&&cal.aprovacaoMeses[c.competencia].retratoLiberadoV115.items.filter(i=>i.itemId===r.item.itemId&&mesDoItemCalendario({items:[i],month:c.competencia},i)===c.competencia);e(publicos?.length===1,'O retrato liberado não confirma um único conteúdo deste pedido.');
 const iniciar=pedido.acao==='ajuste_calendario_iniciar_correcao_cp115',old=s.correcaoConteudoCp115,prova=r.provaCorrecaoCp115;
 if(iniciar){e(!old||old.schema===1&&old.uid===ator.uid&&old.atorReal===ator.real&&old.demandaId===r.id&&old.itemId===r.item.itemId&&Number.isInteger(old.revisao)&&old.revisao>0,'A autorização privada pertence a outra origem.');e(!autorizacao(r,ator),'A correção deste pedido já está iniciada. Confira a versão atual.');s.correcaoConteudoCp115={schema:1,ciclo:c.id,demandaId:r.id,itemId:r.item.itemId,operationId:r.p.operationId,uid:ator.uid,atorReal:ator.real,papel:ator.papel,revisao:(old?.revisao||0)+1,iniciadaEm:em,ultimaOperacao:pedido.operacao,hashConteudo:r.hashConteudo,retratoHash:prova.retratoHash,publicacao:prova.publicacao};return {s,calendarioAlterado:false,writes:[]};}
 e(autorizacao(r,ator),'Inicie a correção deste pedido e confira sua versão atual antes de salvar.');
 const editado={...r.item,...pedido.conteudo};e(aprovacao.mudou(r.item,editado),'O conteúdo permanece igual. Nenhum ajuste foi marcado como executado.');
 const revisado=aprovacao.revisar(r.item,editado,{por:ator.real,em,pedido:r.p.operationId}),items=cal.items.map(i=>i===r.item?revisado:i),local={...cal,items};
 const merge=mesclarCompetenciaCalendarioV125(cal,local,cal,c.competencia,'');e(merge.ok,'A identidade da competência precisa de conferência. Nada foi substituído.');
 e(items.length===cal.items.length&&items.every((i,n)=>cal.items[n]===r.item||isDeepStrictEqual(i,cal.items[n])),'Outro conteúdo foi alterado.');
 const b=db.doc('calendarios_versoes/'+c.cliente+'__cp115_'+pedido.operacao),a=db.doc(b.path+'/correcao_cp115/recibo'),[bs,as]=await Promise.all([tx.get(b),tx.get(a)]);e(!bs.exists&&!as.exists,'Este backup pertence a outra tentativa. Preserve o recibo anterior.');
 const recibo={schema:1,acao:pedido.acao,ciclo:c.id,demandaId:r.id,itemId:r.item.itemId,operationId:r.p.operationId,operacao:pedido.operacao,hashPedido,uid:ator.uid,papel:ator.papel,atorReal:ator.real,em,hashConteudoAntes:r.hashConteudo,hashConteudoDepois:hashConteudo(revisado,c.competencia),publicacaoPreservada:prova,retratoPreservado:true,publicacaoAtualPreservada:true,continuidadeWorkflowEscopada:true};
 s.correcaoConteudoCp115={...old,revisao:old.revisao+1,atualizadaEm:em,ultimaOperacao:pedido.operacao,hashConteudo:recibo.hashConteudoDepois};
 const fluxo=fluxoEscopadoCp115(c,cal,r,ator,em,pedido.operacao,'aberta',recibo.hashConteudoDepois);
 return {s,calendarioAlterado:true,itemDepois:revisado,writes:[{tipo:'create',ref:b,dados:{...cal,__cliente:c.cliente,__salvoEm:em,__itens:cal.items.length,__reciboCorrecaoCp115:recibo}},{tipo:'create',ref:a,dados:recibo},{tipo:'update',ref:db.doc('calendarios/'+c.cliente),dados:{items,...fluxo.calendario,updatedAt:em}},{tipo:'update',ref:db.doc('continuidade_calendarios_i164/'+c.id),dados:{editorialI172:fluxo.continuidade}}]};
}

function fluxoEscopadoCp115(c,cal,r,ator,em,operacao,fase,hashDepois=r.hashConteudo){
 const st=c._estadoLegado,h=st.historico||[],p=r.provaCorrecaoCp115;e(p&&Array.isArray(h)&&h.length<1000,'A autoridade e o histórico da continuidade precisam de conferência.');
 const old=st.correcaoIndividualCp115,base=old?.retratoHash===p.retratoHash?old:{schema:1,ciclo:c.id,competencia:c.competencia,publicacao:p.publicacao,retratoPublicadoEm:p.em,retratoHash:p.retratoHash,itens:{}};
 const scope={...base,revisao:(base.revisao||0)+1,itens:{...base.itens,[r.item.itemId]:{demandaId:r.id,operationId:r.p.operationId,operacao,em,hashConteudo:hashDepois}}};
 const m={...cal.aprovacaoMeses[c.competencia],status:fase==='enviada'?'aguardando_interna':'ajuste_interno',liberadoEmAnterior:p.em,liberadoPorAnterior:'Amanda',correcaoIndividualCp115:scope};
 return {calendario:{aprovacaoMeses:{...cal.aprovacaoMeses,[c.competencia]:m},...(cal.aprovacaoInterna?.mes===c.competencia?{aprovacaoInterna:m}:{})},continuidade:{...st,revisao:st.revisao+1,fase,rodada:st.rodada+(old?0:1),correcaoIndividualCp115:scope,por:ator.real,autorUid:ator.uid,em,ultimaOperacao:operacao,historico:[...h,{acao:fase==='enviada'?'ajuste_calendario_enviar_cp112':'ajuste_calendario_salvar_conteudo_cp115',por:ator.real,uid:ator.uid,em,operacao,itemId:r.item.itemId,demandaId:r.id}]}};
}
export function prepararEnvioCorrecaoCp115(db,c,cal,r,ator,em,operacao){
 if(!r.s?.correcaoConteudoCp115)return [];
 e(r.provaCorrecaoCp115&&c._estadoLegado?.correcaoIndividualCp115?.schema===1,'A revisão individual precisa conservar a publicação anterior.');
 const f=fluxoEscopadoCp115(c,cal,r,ator,em,operacao,'enviada');return [{ref:db.doc('calendarios/'+c.cliente),patch:{...f.calendario,updatedAt:em}},{ref:db.doc('continuidade_calendarios_i164/'+c.id),patch:{editorialI172:f.continuidade}}];
}
