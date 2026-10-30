/* Projeção da providência privada no mesmo registry I165. Nenhum segundo motor. */
import crypto from 'node:crypto';
import {TIPO_PROVIDENCIA_GRAVACAO_CP140,META_PROVIDENCIA_CP140,validarRegistroProvidenciaCp140,idProvidenciaValidoCp140} from './lib/gs-providencias-gravacao-cp140.mjs';
import {jsonI165,horarioI165} from './lib/gs-programacao-i165.mjs';
export {TIPO_PROVIDENCIA_GRAVACAO_CP140};
export const COLECAO_PROVIDENCIAS_CP140='providencias_gravacao_cp140';
const hash=v=>crypto.createHash('sha256').update(jsonI165(v)).digest('hex');
export const idAvisoProvidenciaCp140=(origem,versao,destinatario,nivel)=>hash([origem,versao,destinatario,nivel]);
export function ocorrenciaProvidenciaCp140(d,agora=new Date()){
 if(!d||d.excluido===true||d.arquivado===true||['aprovada','cancelada'].includes(d.status))return null;
 validarRegistroProvidenciaCp140(d,d.id);const m=d[META_PROVIDENCIA_CP140];
 const retorno=d.status==='pendente'&&d.refazerUltimoI161||null;
 const revisao=d.status==='concluida_aguardando_aprovacao',destinatario=revisao?'Amanda':'Cecília',local=horarioI165(agora),hoje=local.slice(0,10),hora=local.slice(11,16);
 let nivel=revisao?'revisar':retorno?'ajustar':m.espera?'aguardando_retorno':'providenciar';
 if(!revisao&&!retorno&&d.prazoData){if(d.prazoData<hoje||d.prazoData===hoje&&d.prazoHora&&d.prazoHora<hora)nivel='atrasado';else if(d.prazoData===hoje)nivel='hoje';}
 const origem={tipo:TIPO_PROVIDENCIA_GRAVACAO_CP140,id:d.id},versao=hash({origem,estado:d.status,recurso:m.origem,acao:m.acaoNecessaria,responsavel:m.responsavelReal,decisor:m.decisor,criterio:m.criterio,tipo:m.tipoConfirmacao,espera:m.espera,prazoData:d.prazoData,prazoHora:d.prazoHora,confirmacaoOperacao:revisao?m.confirmacao?.operacao||'':'',retorno:retorno?{operacao:retorno.operacao,motivo:retorno.motivo,em:retorno.em}:null});
 const prazo=d.prazoData?d.prazoData+'T'+(d.prazoHora||'23:59'):'',prazoTexto=d.prazoData?d.prazoData+(d.prazoHora?' às '+d.prazoHora:' · horário a combinar'):'a combinar';
 const texto=retorno?'A Amanda pediu este ajuste na providência: '+retorno.motivo+'\nConfira o compromisso na mesma ficha e envie a comprovação corrigida. Ler não conclui a providência.':revisao?'Cecília confirmou a providência. Confira o compromisso e a comprovação na mesma ficha; aprove ou explique o que falta.':m.acaoNecessaria+'\nResponsável pelo recurso: '+m.responsavelReal+'.'+(m.decisor?' Decisão com '+m.decisor+'.':'')+'\nPrazo: '+prazoTexto+'.'+(m.espera?' Aguardando '+m.espera.pessoa+': '+m.espera.texto:'')+'\nAbrir ou ler não conclui esta providência.';
 return {id:idAvisoProvidenciaCp140(origem,versao,destinatario,nivel),origem,versao,destinatario,nivel,titulo:(revisao?'Providência para revisar · ':retorno?'Ajustar providência · ':'Providência da gravação · ')+String(d.clienteNome||d.cliente).slice(0,100)+' · '+String(d.titulo).slice(0,100),texto: texto.length>1600?texto.slice(0,1500)+'… Abra a ficha para ler tudo.':texto,prazo,link:{area:'providencia_gravacao',demandaId:d.id,cliente:d.cliente,competencia:d.competencia}};
}
export async function lerOcorrenciaProvidenciaCp140(db,id,agora){
 if(!idProvidenciaValidoCp140(id))throw Object.assign(new Error('Abra a providência pelo seu identificador original.'),{code:'i165/providencia-cp140-registro'});
 const s=await db.doc(COLECAO_PROVIDENCIAS_CP140+'/'+id).get();return s.exists?ocorrenciaProvidenciaCp140(s.data(),agora):null;
}
