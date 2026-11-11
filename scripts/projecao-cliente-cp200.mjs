// CP200 — preenche `calendarios_cliente/{slug}` (a cópia que o link do cliente lê) para todos os calendários.
// Prévia sem gravar: node scripts/projecao-cliente-cp200.mjs   ·   Gravar: node scripts/projecao-cliente-cp200.mjs --aplicar
// Usa o firebase-admin de functions-get/node_modules; GOOGLE_APPLICATION_CREDENTIALS apontando para a ADC.
// Idempotente: a cópia é derivada do calendário; rodar de novo só regrava o mesmo conteúdo.
import {createRequire} from 'node:module';
const require=createRequire(new URL('../functions-get/package.json',import.meta.url));
const {initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
import {projecaoClienteCp200} from '../functions-get/calendario-cliente-cp200.mjs';
initializeApp({credential:applicationDefault(),projectId:process.env.GCLOUD_PROJECT||'get-started-4956d'});
const db=getFirestore(),aplicar=process.argv.includes('--aplicar');
const s=await db.collection('calendarios').get();let n=0;
for(const d of s.docs){
  const p=projecaoClienteCp200(d.data());
  if(aplicar)await db.doc('calendarios_cliente/'+d.id).set(p);
  n++;console.log((aplicar?'gravado ':'prévia  ')+d.id,JSON.stringify(p).length,'bytes');
}
console.log((aplicar?'Gravadas ':'Prévia de ')+n+' cópias.');
