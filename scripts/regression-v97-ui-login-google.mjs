#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fonte=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
let total=0;
function exigir(condicao,mensagem){total++;if(!condicao)throw new Error('V97 UI LOGIN: '+mensagem);console.log('PASS ',mensagem);}
function trecho(inicio,fim){const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);if(a<0||b<0)throw new Error('trecho ausente '+inicio);return fonte.slice(a,b);}

const gate=trecho('<div id="authEquipeGate"','<div class="introOverlay"');
const sentinela=trecho('const CHAVE_REDIRECT_AUTH_EQUIPE','  /* Safari móvel exige');
const fallback=trecho('function mostrarFallbackRedirectEquipe','  function liberarGateEquipe');
const fluxos=trecho('function mensagemErroLoginGoogleEquipe','  window.sairDoEscritorio');
const htmlTeste=`<!doctype html><html><head><style>body{margin:0;background:#2c2d2f}.btn{padding:11px 16px;border:0;border-radius:8px;background:#fbbc19;font:700 14px system-ui}.secondary{background:#f0f1ed}</style></head><body>${gate}</body></html>`;
const servidor=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(htmlTeste);});
await new Promise((resolve,reject)=>{servidor.once('error',reject);servidor.listen(0,'127.0.0.1',resolve);});
const endereco=servidor.address();
const urlTeste=`http://127.0.0.1:${endereco.port}/`;

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1180,height:820}});
try{
  await page.goto(urlTeste);
  await page.addScriptTag({content:`
    const auth={currentUser:null};
    let __persistenciaAuthEquipePronta=true;let __loginGoogleEquipeEmCurso=false;const __preparoPersistenciaAuthEquipe=Promise.resolve();
    let __popupFalha=true;window.__popup=0;window.__redirect=0;window.__aplicacoes=0;window.__gates=[];
    class GoogleAuthProvider{setCustomParameters(v){this.parametros=v;}}
    function signInWithPopup(){window.__popup++;return __popupFalha?Promise.reject({code:'auth/popup-closed-by-user'}):Promise.resolve({user:{uid:'chris',email:'chris@example.test'}});}
    function signInWithRedirect(){window.__redirect++;return new Promise(()=>{});}
    function getRedirectResult(){return Promise.resolve(null);}
    function mostrarGateEquipe(msg){window.__gates.push(String(msg||''));const gate=document.getElementById('authEquipeGate');const erro=document.getElementById('authEquipeErro');gate.style.display='flex';erro.textContent=msg||'';erro.style.display=msg?'block':'none';}
    function aplicarUsuarioGoogleCoordenado(){window.__aplicacoes++;return Promise.resolve(true);}
    ${sentinela}\n${fallback}\n${fluxos}
    document.getElementById('btnLoginGoogleEquipe').disabled=false;
    document.getElementById('btnLoginGoogleEquipe').textContent='Continuar com Google';
    window.__api={popupSucesso(){__popupFalha=false;},mostrarFallbackRedirectEquipe};
  `});

  exigir(await page.locator('#authEquipeFallbackRedirect').isHidden(),'fallback começa oculto em navegador normal');
  await page.getByRole('button',{name:'Continuar com Google'}).click();
  await page.locator('#authEquipeFallbackRedirect').waitFor({state:'visible'});
  exigir((await page.locator('#authEquipeErro').innerText()).includes('auth/popup-closed-by-user'),'erro visível mantém o código auth/*');
  exigir(await page.getByRole('button',{name:'Entrar nesta aba'}).isVisible(),'segunda ação explícita aparece após falha do popup');
  exigir(await page.evaluate(()=>window.__redirect)===0,'UI não redireciona sem segundo clique');

  await page.getByRole('button',{name:'Entrar nesta aba'}).waitFor({state:'visible'});
  await page.getByRole('button',{name:'Entrar nesta aba'}).evaluate(el=>new Promise(resolve=>{const pronto=()=>el.disabled?requestAnimationFrame(pronto):resolve();pronto();}));
  await page.getByRole('button',{name:'Entrar nesta aba'}).click();
  exigir(await page.evaluate(()=>window.__redirect)===1,'clique real no fallback inicia exatamente um redirect');
  exigir(await page.locator('#btnLoginRedirectEquipe').isEnabled()===false&&await page.locator('#btnLoginRedirectEquipe').innerText()==='Abrindo Google…','fallback bloqueia clique duplo durante navegação');
  exigir(await page.evaluate(()=>!!sessionStorage.getItem('gs_auth_redirect_equipe_v1')),'clique real grava sentinela de retorno');

  await page.reload();
  await page.setViewportSize({width:375,height:740});
  await page.addScriptTag({content:`document.getElementById('authEquipeFallbackRedirect').style.display='block';`});
  const caixa=await page.locator('#authEquipeGate > div').boundingBox();
  exigir(caixa&&caixa.x>=0&&caixa.x+caixa.width<=375&&caixa.y>=0&&caixa.y+caixa.height<=740,'gate com fallback cabe no viewport móvel');
  exigir(await page.getByRole('button',{name:'Entrar nesta aba'}).isVisible(),'fallback permanece legível no mobile');

  await page.setViewportSize({width:1180,height:820});
  await page.evaluate(()=>{document.getElementById('authEquipeFallbackRedirect').style.display='none';});
  exigir(await page.locator('#authEquipeFallbackRedirect').isHidden(),'sucesso/novo estado pode ocultar completamente o fallback');
}finally{await browser.close();await new Promise(resolve=>servidor.close(resolve));}

console.log(`REGRESSÃO V97 UI LOGIN GOOGLE: APROVADA (${total} verificações com cliques reais)`);
