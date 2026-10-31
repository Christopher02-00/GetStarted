/* Uma peça adicional fica privada até a liberação explícita do mesmo mês. */
import {exigirCentralR80 as e,chavesR80,textoR80} from './central-preparacao-validacao-r80.mjs';
export const TIPO_ADICAO_CP142='adicao_cp142';
export const CAMPOS_ADICAO_CP142=Object.freeze(['day','fmt','stage','name','ref','referenciaDispensada','desc','legenda','obs','preparacaoGravacao']);
export const adicaoCp142=r=>r?.tipoAjuste===TIPO_ADICAO_CP142;
export const idAdicionalCp142=id=>/^adicional_cp142_[a-f0-9]{32}$/.test(id||'');
export function validarConteudoAdicaoCp142(v,mes){
 chavesR80(v,CAMPOS_ADICAO_CP142,CAMPOS_ADICAO_CP142);
 e(Number.isInteger(v.day)&&v.day>=1&&v.day<=(mes?new Date(Number(mes.slice(0,4)),Number(mes.slice(5)),0).getDate():31),'Confira o dia da peça adicional neste mês.');
 e(typeof v.referenciaDispensada==='boolean','Confirme se esta peça dispensa uma referência externa.');
 for(const k of CAMPOS_ADICAO_CP142.filter(k=>!['day','referenciaDispensada'].includes(k)))textoR80(v[k],['desc','legenda'].includes(k)?30000:['obs','preparacaoGravacao'].includes(k)?10000:2000,k);
 e(!!v.fmt.trim()&&!!v.stage.trim(),'Informe o formato e a etapa da peça adicional.');return v;
}
export function conteudoInicialAdicaoCp142(){return{day:1,fmt:'Reel',stage:'topo',name:'',ref:'',referenciaDispensada:false,desc:'',legenda:'',obs:'',preparacaoGravacao:''};}
export function baseAdicionalCp142(c,itemId){e(c.modo==='continuar_legado'&&idAdicionalCp142(itemId),'Esta inclusão pertence ao mês legado e a um novo ID reservado.');return{itemId,mes:c.competencia,...conteudoInicialAdicaoCp142()};}
export function conferirAusenciaAdicionalCp142(c,cal,r){e(c.modo==='continuar_legado'&&idAdicionalCp142(r.itemId)&&!(cal.items||[]).some(i=>i?.itemId===r.itemId)&&!(cal.aprovacaoMeses?.[c.competencia]?.retratoLiberadoV115?.items||[]).some(i=>i?.itemId===r.itemId),'O ID reservado já está ocupado. Preserve o rascunho; nenhum conteúdo existente será substituído.');return baseAdicionalCp142(c,r.itemId);}
export function adicaoProntaCp142(c,r){if(!adicaoCp142(r))return true;try{validarConteudoAdicaoCp142(r.conteudo,c.competencia);return ['name','desc','legenda','obs'].every(k=>!!r.conteudo[k].trim())&&(!!r.conteudo.ref.trim()||r.conteudo.referenciaDispensada===true);}catch{return false;}}
export function materializarAdicaoCp142(c,r){e(adicaoProntaCp142(c,r),'Complete a peça adicional antes de liberar.');return{itemId:r.itemId,mes:c.competencia,...structuredClone(r.conteudo),roteiroDispensado:false,dataFlexivel:false,apr:false,aprPor:'',aprEm:'',aprovadoPeloClienteEm:'',revisaoPendenteI68:true,posted:false,agendado:false,gravado:false};}
