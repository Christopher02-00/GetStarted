/* Aviso da demanda normal vinculada: não cria nem altera uma demanda. */
import {ocorrenciaDemandaRefazerCp131} from './demandas-refazer-cp131.mjs';
import {createHash} from 'node:crypto';
import {jsonI165,horarioI165} from './lib/gs-programacao-i165.mjs';
import {validarRegistroVinculoCp142,demandaNormalVinculavelCp142,finalizadaVinculoCp142} from './lib/gs-providencias-vinculos-cp142.mjs';
import {versaoConferenciaCp146} from '../conferencia-providencias-cp146.mjs';
export const TIPO_VINCULO_CP146='providencia_vinculada_cp146';
const hash=v=>createHash('sha256').update(jsonI165(v)).digest('hex');
export const idAvisoVinculoCp146=(origem,versao,destinatario,nivel)=>hash([origem,versao,destinatario,nivel]);
export function ocorrenciaVinculoCp146(v,d,agora=new Date()){
 validarRegistroVinculoCp142(v,v.demandaId);demandaNormalVinculavelCp142(d,v.demandaId);
 if(finalizadaVinculoCp142(d)||['concluida_aguardando_aprovacao','cancelado','concluido'].includes(d.status))return null;
 if(ocorrenciaDemandaRefazerCp131(d))return null;
 if(d.status!=='pendente'||!['Chris','Amanda','Cecília'].includes(d.destinatario))throw Error('A situação ou o destinatário do compromisso precisa de conferência.');
 const local=horarioI165(agora),prazo=d.prazoData?d.prazoData+'T'+(d.prazoHora||'23:59'):'',nivel=d.bloqueio?.ativo?'aguardando_retorno':prazo&&prazo<local.slice(0,16)?'atrasado':d.prazoData===local.slice(0,10)?'hoje':'providenciar',origem={tipo:TIPO_VINCULO_CP146,id:d.id},versao=versaoConferenciaCp146(v,d);
 const texto=String(d.descricao||'')+'\nQuem organiza o recurso: '+v.responsavelReal+'.\nPrazo de confirmar os preparativos: '+(d.prazoData||'a combinar')+(d.prazoHora?' às '+d.prazoHora:'')+'.'+(d.bloqueio?.ativo?' Aguardando '+d.bloqueio.pessoa+': '+d.bloqueio.texto:'')+'\nAbra a mesma demanda no Início. Ler ou confirmar ciência não conclui este trabalho.';
 return {id:idAvisoVinculoCp146(origem,versao,d.destinatario,nivel),origem,versao,destinatario:d.destinatario,nivel,titulo:'Preparativos da gravação · '+String(d.titulo).slice(0,170),texto:texto.length>1600?texto.slice(0,1500)+'… Abra a demanda para ler tudo.':texto,prazo,link:{area:'providencia_vinculada_cp146',demandaId:d.id,cliente:v.cliente,competencia:v.competencia}};
}
export async function lerOcorrenciaVinculoCp146(db,id,agora){
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,180}$/.test(id)||id.startsWith('prov140_'))throw Error('Confira o identificador da demanda original.');
 const [v,d]=await Promise.all([db.doc('providencias_vinculos_cp142/'+id).get(),db.doc('demandas/'+id).get()]);if(!v.exists)return null;if(!d.exists)throw Error('O vínculo está sem a demanda original; não foi considerado concluído.');return ocorrenciaVinculoCp146(v.data(),{...d.data(),id:d.id},agora);
}
