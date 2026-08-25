#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const calendario=fs.readFileSync(path.join(raiz,'calendario.html'),'utf8');
const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
function entre(txt,a,b){const i=txt.indexOf(a),f=txt.indexOf(b,i+a.length);if(i<0||f<0)throw new Error('V115 UI: trecho ausente '+a);return txt.slice(i,f);}
const normalizadorCalendario=entre(calendario,'function normalizeUrl','function updateRefLink');
const normalizadorPortal=entre(portal,'function urlHttpsSeguraPortal','async function carregarFichaPortalSegura');
let total=0;const falhas=[];
function ok(condicao,nome,detalhe=''){total++;if(condicao)console.log('PASS ',nome);else{falhas.push(nome);console.error('FAIL ',nome+(detalhe?' — '+detalhe:''));}}

const navegador=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
for(const [nome,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
  const page=await navegador.newPage({viewport});const erros=[];page.on('pageerror',e=>erros.push(String(e)));
  await page.setContent('<main><div id="cal"></div><div id="portal"></div><div id="erro"></div></main>');
  await page.addScriptTag({content:`${normalizadorCalendario}\nconst urlCalendario=normalizeUrl('drive.google.com/mochi/ref-1');const ruimCalendario=normalizeUrl('javascript://alert');document.getElementById('cal').innerHTML=urlCalendario?'<a id="refCal" href="'+urlCalendario+'" target="_blank" rel="noopener noreferrer">Abrir referência</a>':'';${normalizadorPortal}\nconst urlPortal=urlHttpsSeguraPortal('youtube.com/watch?v=1');const ruimPortal=urlHttpsSeguraPortal('http://inseguro.test');document.getElementById('portal').innerHTML=urlPortal?'<a id="refPortal" href="'+urlPortal+'" target="_blank" rel="noopener noreferrer">Ver a referência</a>':'';if(!ruimCalendario&&!ruimPortal)document.getElementById('erro').textContent='Referência inválida — peça um novo link';`});
  const estado=await page.evaluate(()=>({cal:document.querySelector('#refCal')?.href,portal:document.querySelector('#refPortal')?.href,erro:document.querySelector('#erro')?.textContent,largura:document.documentElement.scrollWidth}));
  ok(erros.length===0,`${nome}: zero pageerror`,erros.join(' | '));
  ok(estado.cal==='https://drive.google.com/mochi/ref-1',`${nome}: calendário abre referência sem esquema`,estado.cal);
  ok(estado.portal==='https://youtube.com/watch?v=1',`${nome}: Portal abre referência sem esquema`,estado.portal);
  ok(estado.erro.includes('Referência inválida'),`${nome}: destino inseguro recebe explicação`);
  ok(estado.largura<=viewport.width,`${nome}: referência não cria overflow`);
  await page.close();
}
await navegador.close();
console.log(`V115 UI continuidade/referências: ${total-falhas.length}/${total} aprovadas.`);
if(falhas.length)process.exitCode=1;
