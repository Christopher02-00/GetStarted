/* Continuidade administrativa de um mês físico: não cria ciclo ou consolidado I155. */
import {exigirCentralR80 as e} from './central-preparacao-validacao-r80.mjs';
import {createHash} from 'node:crypto';
import {assinaturaPostagemCompletaI165} from './central/lib/gs-programacao-i165.mjs';
export const ORIGEM_LEGADO_EDITORIAL_I172='continuar_legado';
export const legadoEditorialI172=p=>p?.origemEditorial===ORIGEM_LEGADO_EDITORIAL_I172;
/* A adoção vincula o documento inteiro, incluindo Timestamp em segundos/nanos.
 * Nenhum campo ou subdocumento preparatório é criado, concluído ou apagado. */
export const hashPreparacaoPreservadaI172=c=>createHash('sha256').update(assinaturaPostagemCompletaI165(c)).digest('hex');
export function validarPreparacaoPreservadaI172(id,raw,cal,ciclo=null){
 e(!cal.planejamentoBasesI155?.[id.competencia],'Este mês possui uma base do processo novo. Preserve a origem e reconcilie o ciclo.');
 const pin=raw.preparacaoPreservadaI155;
 if(ciclo===null){e(pin===undefined,'A preparação adotada não está mais presente. Confira a mesma origem antes de continuar.');return;}
 e(pin?.schema===1&&pin.id===id.competencia+'__'+id.cliente&&Number.isInteger(pin.revisao)&&pin.revisao>0&&typeof pin.operacao==='string'&&pin.operacao.length>0&&/^[a-f0-9]{64}$/.test(pin.sha256||''),'Este cliente e mês já possuem preparação. A continuidade exige a adoção explícita da versão preservada.');
 e(ciclo.schema===1&&ciclo.incluido===true&&ciclo.cliente===id.cliente&&ciclo.competencia===id.competencia&&ciclo.revisao===pin.revisao&&ciclo.operacao===pin.operacao,'A preparação mudou ou pertence a outra origem. Preserve as duas fontes e confira a adoção.');
 e(ciclo.documentos&&typeof ciclo.documentos==='object'&&!Array.isArray(ciclo.documentos)&&Object.keys(ciclo.documentos).length===0&&['lote','criacao','entrega','publicacaoAtual'].every(k=>ciclo[k]===null||ciclo[k]===undefined)&&ciclo.contexto===''&&ciclo.pendencias==='','Esta preparação já avançou. Preserve os documentos e reconcilie a continuidade sem inventar uma base.');
 e(hashPreparacaoPreservadaI172(ciclo)===pin.sha256,'A versão completa da preparação mudou. Preserve o calendário e confira a mesma origem antes de continuar.');
}
export function contextoLegadoEditorialI172(id,raw,processo,cal,preparacao=null){
 e(raw?.schema===1&&raw.ativo===true&&raw.modo===ORIGEM_LEGADO_EDITORIAL_I172&&raw.cliente===id.cliente&&raw.competencia===id.competencia&&raw.ativacaoId===processo.ativacaoId,'A continuidade deste cliente e mês não está confirmada para o processo atual.');
 e(typeof raw.revisao==='string'&&/^[a-f0-9]{64}$/.test(raw.revisao)||Number.isInteger(raw.revisao)&&raw.revisao>0,'A revisão da continuidade precisa ser conferida.');
 validarPreparacaoPreservadaI172(id,raw,cal,preparacao);
 const st=raw.editorialI172||{schema:1,revisao:1,fase:'nao_iniciada',rodada:0};
 e(st.schema===1&&Number.isInteger(st.revisao)&&st.revisao>=1&&st.revisao<=1e9&&['nao_iniciada','aberta','enviada','devolvida','publicada'].includes(st.fase)&&Number.isInteger(st.rodada)&&st.rodada>=0,'O estado editorial da continuidade está incompleto.');
 return {id:id.competencia+'__'+id.cliente,cliente:id.cliente,clienteNome:String(cal.client||id.cliente),competencia:id.competencia,revisao:st.revisao,modo:ORIGEM_LEGADO_EDITORIAL_I172,_continuidade:raw,_estadoLegado:st};
}
export function stampLegadoEditorialI172(c){const s=c._estadoLegado;return {id:c.id,revisao:c.revisao,cliente:c.cliente,clienteNome:c.clienteNome,competencia:c.competencia,modo:ORIGEM_LEGADO_EDITORIAL_I172,continuidade:{iniciada:s.fase!=='nao_iniciada',fase:s.fase,rodada:s.rodada,retornoMotivo:s.retornoMotivo||'',retornoEm:s.retornoEm||''}};}
export function assinaturaLegadoEditorialI172(c){return {ativacaoId:c._continuidade.ativacaoId,revisaoAdocao:c._continuidade.revisao,estado:c._estadoLegado,...(c._continuidade.preparacaoPreservadaI155?{preparacaoPreservadaI155:c._continuidade.preparacaoPreservadaI155}:{})};}
export function capacidadesLegadoEditorialI172(c,st,ator,ativos){const f=c._estadoLegado.fase,editar=['aberta','devolvida'].includes(f)&&['rascunho','ajuste_interno'].includes(st);return {iniciar:['Chris','Amanda'].includes(ator.papel)&&ativos>0&&['rascunho','ajuste_interno'].includes(st)&&(f==='nao_iniciada'||['enviada','publicada'].includes(f)),editar:['Chris','Amanda'].includes(ator.papel)&&editar,enviar:['Chris','Amanda'].includes(ator.papel)&&editar&&ativos>0,decidir:ator.papel==='Amanda'&&f==='enviada'&&['aguardando_interna','aprovado_interno'].includes(st),adicionar:false,excluir:false,blocos:false};}
export function proximoEstadoLegadoEditorialI172(c,pedido,ator,em,{retrato=null}={}){
 const s=c._estadoLegado,h=s.historico||[];e(Array.isArray(h)&&h.length<1000,'O histórico desta continuidade precisa de conferência; nada foi descartado.');
 const inicio=pedido.acao==='central_editor_iniciar',decisao=pedido.acao==='central_editor_decidir';
 const fase=inicio?'aberta':pedido.acao==='central_editor_enviar_revisao'?'enviada':decisao?(pedido.decisao==='devolver'?'devolvida':'publicada'):s.fase;
 return {...s,schema:1,revisao:s.revisao+1,fase,rodada:inicio?s.rodada+1:s.rodada,por:ator.real,autorUid:ator.uid,em,ultimaOperacao:pedido.operacao,...(decisao&&pedido.decisao==='devolver'?{retornoMotivo:pedido.motivo.trim(),retornoEm:em}:{}),...(decisao&&pedido.decisao==='publicar'?{publicacaoAtual:{por:'Amanda',em,retrato}}:{}),historico:[...h,{acao:pedido.acao,decisao:pedido.decisao||'',por:ator.real,uid:ator.uid,operacao:pedido.operacao,em}]};
}
export const contextoDepoisLegadoEditorialI172=(c,estado)=>({...c,revisao:estado.revisao,_estadoLegado:estado,_continuidade:{...c._continuidade,editorialI172:estado}});
