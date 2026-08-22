#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fonte=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const estilos=[...fonte.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
const a=fonte.indexOf('  /* ===== CONTROLE DE CONCLUSÃO V101');
const b=fonte.indexOf('  window.renderVisaoCalendarios = async function',a);
if(a<0||b<0) throw new Error('V102 UI: bloco real ausente');
const bloco=fonte.slice(a,b);
const evidenciaArg=process.argv.find(v=>v.startsWith('--evidence-dir='));
const evidencias=path.resolve(evidenciaArg?.slice(15)||process.env.GET_V102_EVIDENCE_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'get-v102-ui-')));
fs.mkdirSync(evidencias,{recursive:true});
let total=0;const falhas=[];
function exigir(v,msg){total++;if(v)console.log('PASS ',msg);else{falhas.push(msg);console.error('FAIL ',msg);}}
exigir(fonte.includes('2026-08-21-itemids-calendarios-legados-v102'),'build V102 está no HTML real');
exigir(fonte.includes('ccMigracaoItemIdsSlot'),'slot da migração existe no Controle de conclusão');

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
for(const viewport of [{width:1180,height:820},{width:375,height:812}]){
  const vp=viewport.width<500?'mobile':'desktop';
  const page=await browser.newPage({viewport});const erros=[];page.on('pageerror',e=>erros.push(String(e)));
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${estilos}
    html,body{height:auto!important;overflow:auto!important;background:var(--graphite);color:var(--offwhite)}body{padding:58px 12px 20px}.fixture{position:fixed;z-index:99;top:6px;left:6px;right:6px;background:#151517;border:2px solid var(--yellow);border-radius:9px;padding:8px;text-align:center;color:var(--yellow);font:900 10px system-ui}.shell{max-width:900px;margin:auto}</style></head><body>
    <div class="fixture">FIXTURE SINTÉTICA V102 · SEM FIREBASE REAL · SEM DADOS REAIS</div><main class="shell"><div id="ccMigracaoItemIdsSlot"></div><div id="controleConclusaoCalendariosBox"></div><div id="ccEstadoFonte"></div><select id="ccCompetencia"></select></main></body></html>`);
  await page.addScriptTag({content:`
    var usuarioAtual='Chris';var auth={currentUser:{uid:'uid-chris-sintetico-v102'}};var db={path:''};
    window.__pessoaAutenticadaReal='Chris';window.__uid='uid-chris-sintetico-v102';window.__previewV102='legado';
    function jsonEstavel(v){if(Array.isArray(v))return '['+v.map(jsonEstavel).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+jsonEstavel(v[k])).join(',')+'}';return JSON.stringify(v);}
    function slugClienteCanonico(v){return String(v||'');}function mesDoItemCalendario(cal,item){return String(item?.mes||cal?.month||'');}function hojeLocal(){return '2026-08-21';}
    function esc(v){return String(v??'');}function escAttr(v){return String(v??'');}function mostrarToast(){}function confirm(){return true;}function prompt(){return null;}
    function doc(base,...p){return {path:[base?.path||'',...p].filter(Boolean).join('/')};}function collection(base,...p){return {path:[base?.path||'',...p].filter(Boolean).join('/')};}function query(r){return r;}function where(){return {};}
    function serverTimestamp(){return 'SERVER_TIMESTAMP';}async function getDoc(){throw new Error('sem leitura real');}async function runTransaction(){throw new Error('sem escrita real');}
    function snapDocs(lista){return {forEach(fn){lista.forEach(d=>fn({id:d.id,data:()=>structuredClone(d.data)}));}};}
    async function getDocs(){
      if(window.__previewV102==='erro'){const e=new Error('timeout sintético');e.code='deadline-exceeded';throw e;}
      if(window.__previewV102==='moderno')return snapDocs([{id:'cliente-sintetico',data:{items:[{itemId:'item_moderno'}]}}]);
      if(window.__previewV102==='bloqueado')return snapDocs([{id:'cliente-sintetico',data:{items:[{itemId:'duplicado'},{itemId:'duplicado'},{name:'legado sintético'}]}}]);
      return snapDocs([{id:'cliente-sintetico',data:{items:[{name:'legado sintético A',mes:'2026-08'},{name:'legado sintético B',mes:'2026-08'},{itemId:'item_moderno'}]}}]);
    }
    var ORDEM_STATUS_POSTAGEM={};function escolherPostagemCanonicaPorVideo(){return null;}async function obterCalendariosCompartilhados(){return snapDocs([]);}var __erroCalendariosCompartilhado=null;
    ${bloco}
  `});
  exigir(await page.evaluate(()=>window.renderFerramentaItemIdsLegadosV102()),`${vp}: Chris real recebe a ferramenta`);
  exigir(await page.locator('[data-cc-migracao-v102]').isVisible(),`${vp}: card administrativo está visível`);
  await page.getByRole('button',{name:'Ver prévia'}).click();
  await page.waitForFunction(()=>document.getElementById('ccMigracaoV102Estado')?.textContent.includes('2 item(ns)'));
  exigir(!(await page.locator('#ccMigracaoV102Aplicar').isDisabled()),`${vp}: prévia limpa habilita a ação explícita`);
  exigir((await page.locator('#ccMigracaoV102Estado').innerText()).includes('2 item(ns) sem ID em 1 calendário'),`${vp}: prévia comunica apenas contagens`);
  exigir(!(await page.locator('#ccMigracaoV102Estado').innerText()).includes('legado sintético'),`${vp}: título sintético não vaza para o resumo`);

  await page.evaluate(()=>window.__previewV102='bloqueado');await page.getByRole('button',{name:'Ver prévia'}).click();
  await page.waitForFunction(()=>document.getElementById('ccMigracaoV102Estado')?.textContent.includes('bloquearam'));
  exigir(await page.locator('#ccMigracaoV102Aplicar').isDisabled(),`${vp}: duplicidade bloqueia aplicação`);
  await page.evaluate(()=>window.__previewV102='erro');await page.getByRole('button',{name:'Ver prévia'}).click();
  await page.waitForFunction(()=>document.getElementById('ccMigracaoV102Estado')?.textContent.includes('Prévia indisponível'));
  exigir((await page.locator('#ccMigracaoV102Estado').innerText()).includes('deadline-exceeded'),`${vp}: erro aparece com código e não como zero legado`);

  await page.evaluate(()=>{usuarioAtual='Cecília';window.__pessoaAutenticadaReal='Cecília';auth.currentUser={uid:'uid-cecilia'};window.renderFerramentaItemIdsLegadosV102();});
  exigir(await page.locator('[data-cc-migracao-v102]').count()===0,`${vp}: Cecília não recebe controles de migração no DOM`);
  await page.evaluate(()=>{usuarioAtual='Chris';window.__pessoaAutenticadaReal='Chris';auth.currentUser={uid:'uid-chris-sintetico-v102'};window.__previewV102='legado';window.renderFerramentaItemIdsLegadosV102();});
  await page.getByRole('button',{name:'Ver prévia'}).click();
  await page.waitForFunction(()=>document.getElementById('ccMigracaoV102Estado')?.textContent.includes('2 item(ns)'));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);
  exigir(overflow,`${vp}: ferramenta não cria overflow horizontal`);
  exigir(erros.length===0,`${vp}: zero pageerror`);
  await page.screenshot({path:path.join(evidencias,`V102_ITEMIDS_LEGADOS_${vp.toUpperCase()}_FIXTURE_SINTETICA.png`),fullPage:true});
  await page.close();
}
await browser.close();
console.log(`V102 UI ITEMIDS LEGADOS: ${total-falhas.length}/${total} verificações aprovadas.`);
console.log(`EVIDÊNCIAS: ${evidencias}`);
if(falhas.length) process.exitCode=1;
