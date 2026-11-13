// CP214 — sincronização ÚNICA dos vídeos que já estavam parados em "aguardando legenda" sem ligação com o calendário.
// Prévia (não grava): node scripts/legenda-sem-vinculo-cp214.mjs   ·   Criar as demandas: node scripts/legenda-sem-vinculo-cp214.mjs --aplicar
// Usa o firebase-admin de functions-get/node_modules; GOOGLE_APPLICATION_CREDENTIALS apontando para a ADC.
// Idempotente: a demanda tem id fixo pela postagem; rodar de novo não duplica (o gatilho cuida dos próximos vídeos).
import {createRequire} from 'node:module';
const require=createRequire(new URL('../functions-get/package.json',import.meta.url));
const {initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
import {semVinculoAguardandoLegendaCp214,sincronizarDemandaLegendaCp214,idDemandaLegendaCp214} from '../functions-get/legenda-sem-vinculo-cp214.mjs';
initializeApp({credential:applicationDefault(),projectId:process.env.GCLOUD_PROJECT||'get-started-4956d'});
const db=getFirestore(),aplicar=process.argv.includes('--aplicar');
const s=await db.collection('postagens').where('status','==','aguardando_legenda').get();let n=0;
for(const d of s.docs){const p=d.data();if(!semVinculoAguardandoLegendaCp214(p))continue;
  if(p.videoId){const v=(await db.doc('videos_producao/'+p.videoId).get()).data();if(!v||v.excluido===true||v.status!=='aprovado')continue;}
  const ja=(await db.doc('demandas/'+idDemandaLegendaCp214(d.id)).get()).exists;n++;
  const r=aplicar&&!ja?await sincronizarDemandaLegendaCp214(db,d.id):{acao:ja?'ja_existe':'previa'};
  console.log(r.acao.padEnd(10),(p.clienteNome||p.cliente)+' · '+p.titulo);}
console.log((aplicar?'Aplicado':'Prévia')+': '+n+' vídeo(s) sem lugar no calendário.');process.exit(0);
