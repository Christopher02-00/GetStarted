/**
 * @license
 * Copyright 2017 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * CP146: transport/codec adapted from Firebase JS SDK10.12.2 functions
 * serializer.ts, error.ts and service.ts. Changed: one closed Get endpoint,
 * public Auth only, explicit context guards, no optional Messaging header or
 * internal SDK provider. Existing operation IDs and receipt recovery are callers'.
 */
const URL_GET='https://southamerica-east1-get-started-4956d.cloudfunctions.net/programacaoIndependenteGetI165';
const APP_GET='1:27813235721:web:38c8e840153e2ae3853cd8';
const CODES=Object.freeze({OK:'ok',CANCELLED:'cancelled',UNKNOWN:'unknown',INVALID_ARGUMENT:'invalid-argument',DEADLINE_EXCEEDED:'deadline-exceeded',NOT_FOUND:'not-found',ALREADY_EXISTS:'already-exists',PERMISSION_DENIED:'permission-denied',UNAUTHENTICATED:'unauthenticated',RESOURCE_EXHAUSTED:'resource-exhausted',FAILED_PRECONDITION:'failed-precondition',ABORTED:'aborted',OUT_OF_RANGE:'out-of-range',UNIMPLEMENTED:'unimplemented',INTERNAL:'internal',UNAVAILABLE:'unavailable',DATA_LOSS:'data-loss'});
function erro(code,message,details,incerto=false){const e=new Error(message||'');e.name='FirebaseError';e.code='functions/'+code;e.details=details;if(incerto)e.resultadoIncerto=true;return e;}
function mapear(o,f){const r={};for(const k of Object.keys(o))Object.defineProperty(r,k,{value:f(o[k]),enumerable:true,writable:true,configurable:true});return r;}
export function codificarCallableCp146(d){
  if(d==null)return null;if(d instanceof Number)d=d.valueOf();
  if(typeof d==='number'&&Number.isFinite(d)||d===true||d===false||Object.prototype.toString.call(d)==='[object String]')return d;
  if(d instanceof Date)return d.toISOString();if(Array.isArray(d))return d.map(codificarCallableCp146);
  if(typeof d==='object'||typeof d==='function')return mapear(d,codificarCallableCp146);
  throw Error('Data cannot be encoded in JSON: '+String(d));
}
export function decodificarCallableCp146(d){
  if(d==null)return d;
  if(d['@type']){if(!['type.googleapis.com/google.protobuf.Int64Value','type.googleapis.com/google.protobuf.UInt64Value'].includes(d['@type']))throw Error('Data cannot be decoded from JSON');const n=Number(d.value);if(Number.isNaN(n))throw Error('Data cannot be decoded from JSON');return n;}
  if(Array.isArray(d))return d.map(decodificarCallableCp146);if(typeof d==='object'||typeof d==='function')return mapear(d,decodificarCallableCp146);return d;
}
function codigoHttp(s){return s>=200&&s<300?'ok':({0:'internal',400:'invalid-argument',401:'unauthenticated',403:'permission-denied',404:'not-found',409:'aborted',429:'resource-exhausted',499:'cancelled',500:'internal',501:'unimplemented',503:'unavailable',504:'deadline-exceeded'}[s]||'unknown');}
export function erroRespostaCallableCp146(status,body){
  let code=codigoHttp(status),message=code,details;
  try{const e=body&&body.error;if(e){if(typeof e.status==='string'){if(!Object.hasOwn(CODES,e.status))return erro('internal','internal');code=CODES[e.status];message=e.status;}if(typeof e.message==='string')message=e.message;details=e.details;if(details!==undefined)details=decodificarCallableCp146(details);}}catch{}
  return code==='ok'?null:erro(code,message,details);
}
/** No URL/project/token injection and no Messaging SDK dependency. */
export function criarChamadaGetCp146({app,obterAuth,contexto,timeout=45000,fetchImpl=globalThis.fetch,programar=globalThis.setTimeout,cancelarTimer=globalThis.clearTimeout}={}){
  if(app?.options?.projectId!=='get-started-4956d'||app?.options?.appId!==APP_GET||![45000,120000].includes(timeout)||typeof obterAuth!=='function'||typeof contexto!=='function'||typeof fetchImpl!=='function')throw erro('failed-precondition','O serviço deste projeto não foi confirmado.');
  return async payload=>{
    const auth=obterAuth(),user=auth?.currentUser,c={...contexto()},keys=['uid','nome','atorReal','sessao','geracao'];
    if(!user?.uid||typeof user.getIdToken!=='function'||c.uid!==user.uid)throw erro('unauthenticated','Entre novamente no seu acesso.');
    let enviado=false,expirou=false,timer;
    const validar=()=>{const n=contexto();if(expirou)throw erro('deadline-exceeded','deadline-exceeded',undefined,enviado);if(auth.currentUser!==user||keys.some(k=>n[k]!==c[k]))throw erro('cancelled','O perfil mudou. A tentativa continua no acesso original.',undefined,enviado);};
    const corpo=JSON.stringify({data:codificarCallableCp146(payload)});
    for(const [k,v] of Object.entries({uidEsperado:c.uid,atorRealEsperado:c.atorReal,papelOperado:c.nome,sessao:c.sessao}))if(payload&&Object.hasOwn(payload,k)&&payload[k]!==v)throw erro('cancelled','O acesso do pedido mudou. Reabra a mesma ficha.');
    const limite=new Promise((_,reject)=>{timer=programar(()=>{expirou=true;reject(erro('deadline-exceeded','deadline-exceeded',undefined,enviado));},timeout);});
    const executar=async()=>{
      let token;try{token=await user.getIdToken();}catch{validar();throw erro('unauthenticated','Não consegui confirmar seu Google. Entre novamente.');}validar();
      if(typeof token!=='string'||!token)throw erro('unauthenticated','Não consegui confirmar seu Google. Entre novamente.');
      let response;try{validar();enviado=true;response=await fetchImpl(URL_GET,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:corpo,redirect:'error'});}catch(e){validar();throw erro('internal','internal',undefined,true);}validar();
      let body=null;try{body=await response.json();}catch{}validar();
      const falha=erroRespostaCallableCp146(response.status,body);if(falha)throw falha;
      if(!body||typeof body!=='object')throw erro('internal','Response is not valid JSON object.',undefined,true);
      const data=body.data===undefined?body.result:body.data;if(data===undefined)throw erro('internal','Response is missing data field.',undefined,true);
      return {data:decodificarCallableCp146(data)};
    };
    try{return await Promise.race([executar(),limite]);}finally{cancelarTimer(timer);}
  };
}
