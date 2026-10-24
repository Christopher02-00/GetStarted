/* Codec de transporte; nenhum objeto de conteúdo é interpretado como tag do servidor. */
export const CODEC_CENTRAL_R80='central-r80-v1';
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exigir=(ok,msg)=>{if(!ok)throw Error(msg);};
function nano(s,n){return Number.isSafeInteger(s)&&Number.isInteger(n)&&n>=0&&n<1e9;}
export function codificarCentralR80(valor){
 const vistos=new Set();
 function enc(v,n=0){
  exigir(n<=80,'O documento ultrapassa a profundidade de transporte.');
  if(v===null||typeof v==='string'||typeof v==='boolean')return v;
  if(typeof v==='number'){exigir(Number.isFinite(v),'Número inválido no documento.');return v;}
  exigir(v!==undefined&&typeof v==='object','Tipo de conteúdo não transportável.');
  if(typeof v.toDate==='function'&&nano(v.seconds??v._seconds,v.nanoseconds??v._nanoseconds??0))return {t:'timestamp',s:v.seconds??v._seconds,n:v.nanoseconds??v._nanoseconds??0};
  if(v instanceof Date){exigir(Number.isFinite(v.getTime()),'Data inválida no documento.');return {t:'date',v:v.toISOString()};}
  exigir(Array.isArray(v)||Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null,'Objeto de documento não transportável.');
  exigir(!vistos.has(v),'Documento circular.');vistos.add(v);
  const out=Array.isArray(v)?{t:'array',v:v.map(x=>enc(x,n+1))}:{t:'map',v:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,enc(x,n+1)]))};
  vistos.delete(v);return out;
 }
 return enc(valor);
}
export function decodificarCentralR80(valor,{timestamp=(s,n)=>({seconds:s,nanoseconds:n,toDate(){return new Date(s*1000+n/1e6);}})}={}){
 function dec(v,n=0){
  exigir(n<=80,'Resposta de transporte muito profunda.');
  if(v===null||typeof v==='string'||typeof v==='boolean')return v;
  if(typeof v==='number'){exigir(Number.isFinite(v),'Número inválido na resposta.');return v;}
  exigir(obj(v)&&typeof v.t==='string','Resposta de transporte inválida.');
  if(v.t==='timestamp'){exigir(Object.keys(v).sort().join('|')==='n|s|t'&&nano(v.s,v.n),'Timestamp inválido.');return timestamp(v.s,v.n);}
  if(v.t==='date'){exigir(Object.keys(v).sort().join('|')==='t|v'&&typeof v.v==='string'&&new Date(v.v).toISOString()===v.v,'Data inválida.');return new Date(v.v);}
  if(v.t==='array'){exigir(Object.keys(v).sort().join('|')==='t|v'&&Array.isArray(v.v),'Lista inválida.');return v.v.map(x=>dec(x,n+1));}
  exigir(v.t==='map'&&Object.keys(v).sort().join('|')==='t|v'&&obj(v.v),'Mapa inválido.');
  return Object.fromEntries(Object.entries(v.v).map(([k,x])=>[k,dec(x,n+1)]));
 }
 return dec(valor);
}
export function separarProjecoesCentralR80(valor){
 const projecoes={};
 function percorrer(v){
  if(!v||typeof v!=='object'||v instanceof Date||typeof v.toDate==='function')return;
  if(typeof v.id==='string'&&v.schema===1&&v.competencia&&v.cliente){
   const p={};for(const k of ['andamentoCalendarioI164','assinaturaCalendarioI164','fontesAgendaI167'])if(Object.hasOwn(v,k))p[k]=v[k];
   if(Object.keys(p).length)projecoes[v.id]=p;
  }
  if(Array.isArray(v))v.forEach(percorrer);else Object.values(v).forEach(percorrer);
 }
 percorrer(valor);return projecoes;
}
export function envelopeCentralR80(valor,{limiteBytes=6*1024*1024}={}){
 const r={schema:1,codec:CODEC_CENTRAL_R80,dados:codificarCentralR80(valor),projecoesPorCiclo:codificarCentralR80(separarProjecoesCentralR80(valor)),completude:{completa:true}};
 const texto=JSON.stringify(r),bytes=new TextEncoder().encode(texto).length;
 exigir(bytes<=limiteBytes,'A resposta é grande demais para esta conferência. Nada foi cortado; refine o cliente ou o mês.');return r;
}
export function abrirEnvelopeCentralR80(r,opcoes){
 exigir(r?.schema===1&&r.codec===CODEC_CENTRAL_R80&&r.completude?.completa===true,'Não consegui confirmar a resposta completa do planejamento.');
 const valor=decodificarCentralR80(r.dados,opcoes),projecoes=decodificarCentralR80(r.projecoesPorCiclo,opcoes);
 exigir(obj(projecoes),'Projeções inválidas.');
 function anexar(v){if(!v||typeof v!=='object'||typeof v.toDate==='function'||v instanceof Date)return;
  if(v.id&&v.schema===1&&v.competencia&&v.cliente){const p=projecoes[v.id];exigir(obj(p)&&obj(p.fontesAgendaI167)&&obj(p.andamentoCalendarioI164)&&typeof p.assinaturaCalendarioI164==='string','A situação atual do ciclo não foi confirmada.');for(const k of ['andamentoCalendarioI164','assinaturaCalendarioI164','fontesAgendaI167'])Object.defineProperty(v,k,{value:p[k],enumerable:false,configurable:true});}
  if(Array.isArray(v))v.forEach(anexar);else Object.values(v).forEach(anexar);
 }
 anexar(valor);return valor;
}
