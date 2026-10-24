/* Fases finitas do mesmo compromisso. Nenhuma fase confirma ação humana ou entrega. */
const instanteLocal=/^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d$/;
export function faseAvisoI165(n,local){
 if(typeof local!=='string'||!instanteLocal.test(local))throw Error('O relógio local do aviso precisa de conferência.');
 if(!n?.prazo)return 'sem_prazo';
 const p=String(n.prazo),dia=p.slice(0,10),somenteDia=/^20\d{2}-\d{2}-\d{2}$/.test(p),limite=somenteDia?p+'T23:59':p;
 if(!instanteLocal.test(limite)||!Number.isFinite(Date.parse(limite+'-03:00')))return 'prazo_a_conferir';
 if(limite<=local)return 'atrasado';
 if(dia===local.slice(0,10))return 'hoje';
 if(Date.parse(limite+'-03:00')-Date.parse(local+'-03:00')<=86400000)return 'proximo_prazo';
 return 'antecedencia';
}
export function preservarCanalIncertoI165(c){
 // Uma nova fase não prova ausência do envio anterior. A reserva continua bloqueada.
 return c?.estado==='resultado_desconhecido'||c?.estado==='em_andamento'?{...c,pendenteConferencia:true}:null;
}
export function resumirDespachosI165(resultados=[]){
 const r={aceitas:0,falhas:0,desconhecidas:0,emAndamento:0,aguardandoPrazo:0,resolvidas:0,pausadas:0};
 for(const x of resultados){
  if(x?.aguardandoPrazo)r.aguardandoPrazo++;
  if(x?.resolvida)r.resolvidas++;
  if(x?.pausada)r.pausadas++;
  for(const c of x?.resultados||[]){
   if(c.estado==='resultado_desconhecido'||c.desconhecido)r.desconhecidas++;
   else if(c.estado==='em_andamento')r.emAndamento++;
   else if(c.aceita===true)r.aceitas++;
   else if(c.aceita===false||c.estado==='falha')r.falhas++;
  }
 }
 return {...r,alcance:'lote_desta_execucao',estado:r.falhas||r.desconhecidas?'conferir_canais':r.emAndamento?'em_andamento':'sem_falha_registrada',aceiteNaoProvaExibicao:true};
}
