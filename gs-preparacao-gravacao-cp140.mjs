/* CP140: preparação pública explícita; o legado permanece literal e não é migrado. */
export const possuiPreparacaoExplicitaCp140=item=>!!item&&Object.hasOwn(item,'preparacaoGravacao');
export function preparacaoPublicaCp140(item){
 return String(possuiPreparacaoExplicitaCp140(item)?item.preparacaoGravacao??'':item?.obs??'');
}
/* Ausente conserva o comportamento anterior. Vazio explícito desliga o fallback. */
export function aplicarPreparacaoExplicitaCp140(item,valor,{confirmada=false,nova=false}={}){
 if(!confirmada&&!nova)return {...item};
 if(typeof valor!=='string'||valor.length>10000)throw Error('A preparação deve ter até 10.000 caracteres.');
 return {...item,preparacaoGravacao:valor};
}
