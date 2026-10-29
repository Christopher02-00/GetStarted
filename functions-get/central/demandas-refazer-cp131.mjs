/* Uma rodada da mesma demanda I161. Não muda a tarefa nem cria destinatários. */
import crypto from 'node:crypto';
import {jsonI165} from './lib/gs-programacao-i165.mjs';

export const TIPO_DEMANDA_REFAZER_CP131='demanda_refazer_i161';
export const PAPEIS_DEMANDA_REFAZER_CP131=Object.freeze(['Chris','Amanda','Cecília','Gabrielle','Fernanda','Helo','João Victor','Luís','Nathan','Yas']);
const finais=new Set(['concluida_aguardando_aprovacao','aprovada','cancelada','cancelado','concluida','concluido']);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,220}$/.test(v);
const exigir=(ok,mensagem)=>{if(!ok)throw Object.assign(new Error(mensagem),{code:'i165/demanda-refazer'});};
const hash=v=>crypto.createHash('sha256').update(jsonI165(v)).digest('hex');
export const idAvisoDemandaRefazerCp131=(origem,destinatario)=>hash([TIPO_DEMANDA_REFAZER_CP131,origem.id,origem.operacao,destinatario]);

export function ocorrenciaDemandaRefazerCp131(d){
 if(!d||d.excluido===true||d.arquivado===true||finais.has(d.status)||!Object.hasOwn(d,'refazerUltimoI161'))return null;
 const r=d.refazerUltimoI161;
 exigir(id(d.id)&&PAPEIS_DEMANDA_REFAZER_CP131.includes(d.destinatario),'O retorno precisa confirmar a mesma demanda e seu responsável atual.');
 exigir(d.status==='pendente','A situação da demanda devolvida precisa de conferência; espera e início continuam na mesma pendência.');
 exigir(r&&typeof r==='object'&&!Array.isArray(r)&&id(r.operacao)&&r.operacao.length>=8&&typeof r.motivo==='string'&&r.motivo.trim().length>0&&r.motivo.length<=4000&&['Chris','Amanda'].includes(r.por)&&typeof r.em==='string'&&Number.isFinite(Date.parse(r.em)),'O motivo e a rodada da devolução precisam de conferência.');
 if(typeof d.redirecionadaEm==='string'&&Number.isFinite(Date.parse(d.redirecionadaEm))&&Date.parse(d.redirecionadaEm)>=Date.parse(r.em))return null;
 const origem={tipo:TIPO_DEMANDA_REFAZER_CP131,id:d.id,operacao:r.operacao};
 const versao=hash([origem,d.destinatario,r.motivo,r.em,r.por]);
 const motivo=r.motivo.trim(),previa=motivo.length>1000?motivo.slice(0,1000)+'… (recado completo na demanda)':motivo;
 return {id:idAvisoDemandaRefazerCp131(origem,d.destinatario),origem,versao,destinatario:d.destinatario,nivel:'ajustar',titulo:'Demanda devolvida · '+String(d.titulo||'Ajuste pedido').slice(0,200),texto:(r.por==='Amanda'?'A Amanda':'O Chris')+' pediu um ajuste:\n'+previa+'\nAbra a mesma demanda para ajustar e enviar novamente. Ler este aviso não conclui a tarefa.',link:{area:'demanda_refazer',demandaId:d.id,operacao:r.operacao}};
}

export async function lerOcorrenciaDemandaRefazerCp131(db,idDemanda){
 exigir(id(idDemanda),'Abra a demanda pelo seu identificador original.');
 const s=await db.doc('demandas/'+idDemanda).get();
 return s.exists?ocorrenciaDemandaRefazerCp131({...s.data(),id:s.id}):null;
}
