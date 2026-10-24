/* I92: mesma carteira por competência; arquivo calculado explicitamente em Brasília no servidor. */
import{carteiraCanonicaI164}from'./gs-carteira-calendarios-i164.mjs';
import{fonteFisicaClienteR4,mesDoItemCalendario}from'./guardas-stokki-i165.mjs';
export function calendarioEnviavelI164(c,cal,{extras,configs,agora}){
 if(!fonteFisicaClienteR4(c.cliente,cal))throw Error('A identidade física do calendário precisa ser conferida.');
 const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(agora),carteira=carteiraCanonicaI164({extras,configs,hoje,competencia:c.competencia});
 if(!carteira.carteira.some(x=>x.slug===c.cliente))return false;
 if(!Array.isArray(cal.items))throw Error('Os itens do calendário não foram confirmados.');
 if(!cal.items.some(i=>i&&!i.excluido&&mesDoItemCalendario(cal,i)===c.competencia))return false;
 const marca=cal.aprovacaoMeses?.[c.competencia];if(marca?.status!=='liberado')return false;
 const reaberto=Date.parse(marca.reabertoAte||'');if(Number.isFinite(reaberto)&&agora.getTime()<reaberto)return true;
 if(c.competencia>='2026-10'){const [ano,mes]=c.competencia.split('-').map(Number),limite=Date.UTC(ano,mes,30,3,0,0);if(agora.getTime()>=limite)return false;}
 return true;
}
