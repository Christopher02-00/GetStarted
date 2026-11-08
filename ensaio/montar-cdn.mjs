// Gera ensaio/cdn/firebase-{app,firestore,auth}.js equivalentes aos bundles da gstatic (sem rede).
import * as esbuild from 'esbuild';
import fs from 'node:fs';
const out='cdn'; fs.mkdirSync(out,{recursive:true});
const URL_APP='https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
const externoApp={name:'externo-app',setup(b){b.onResolve({filter:/^@firebase\/app$/},()=>({path:URL_APP,external:true}));}};
await esbuild.build({entryPoints:['node_modules/firebase/app/dist/esm/index.esm.js'],bundle:true,format:'esm',outfile:`${out}/firebase-app.js`,platform:'browser',target:'es2020',logLevel:'error'});
for(const m of ['firestore','auth','functions']){
  await esbuild.build({entryPoints:[`node_modules/firebase/${m}/dist/esm/index.esm.js`],bundle:true,format:'esm',outfile:`${out}/firebase-${m}.js`,platform:'browser',target:'es2020',plugins:[externoApp],logLevel:'error'});
}
for(const f of fs.readdirSync(out)) console.log(f, fs.statSync(`${out}/${f}`).size,'bytes');
