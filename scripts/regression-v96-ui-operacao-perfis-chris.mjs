#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fonte=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
let total=0;
function exigir(condicao,mensagem){total++;if(!condicao)throw new Error('V96 UI OPERAÇÃO CHRIS: '+mensagem);console.log('PASS ',mensagem);}
function trecho(inicio,fim){
  const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0)throw new Error('V96 UI OPERAÇÃO CHRIS: trecho ausente '+inicio);
  return fonte.slice(a,b);
}

const ui=trecho('function atualizarBannerOperacaoPerfilChris','/* ===== AS FILAS VIRARAM BOTÃO AMARELO');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1180,height:820}});
try{
  await page.setContent(`<!doctype html><html><head><style>
    :root{--yellow:#FBBC19;--fg:#F0F1ED;--deep:#212123}.card{background:#26272a;color:var(--fg);border-radius:12px;padding:18px;font:14px system-ui}.desc{line-height:1.55;color:#ccc}.field label{display:block;margin-bottom:5px}.field select{width:100%;padding:10px}.btnrow{display:flex;gap:8px;margin-top:14px}.btn{padding:10px 14px;background:var(--yellow);border:0;border-radius:8px;font-weight:800}.secondary{background:#eee}
  </style></head><body>
    <button id="atalho" onclick="abrirOperacaoPerfisChris()">Operar perfil da equipe</button>
    <select id="euSouGlobal"><option>Chris</option><option>Amanda</option><option>Cecília</option><option>Gabrielle</option><option>Helo</option><option>João Victor</option><option>Luís</option><option>Nathan</option><option>Yas</option></select>
  </body></html>`);
  await page.addScriptTag({content:
    `const PAPEIS_OPERAVEIS_POR_CHRIS=Object.freeze(['Amanda','Cecília','Gabrielle','Helo','João Victor','Luís','Nathan','Yas']);\n`+
    `window.__pessoaAutenticadaReal='Chris';window.__operacaoDelegadaChris='';window.__trocas=0;\n`+
    `function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}\n`+
    `function pararMotorAutomacoes(){window.__motorParado=true;}window.mudarUsuarioGlobal=async()=>{window.__trocas++;};\n`+
    ui
  });

  await page.locator('#atalho').click();
  exigir(await page.locator('#painelOperacaoPerfisChris').count()===1,'clique real abre o modal exclusivo');
  exigir(await page.locator('#operacaoPapelEscolhido option').count()===8,'modal oferece exatamente os oito papéis congelados');
  exigir((await page.locator('#painelOperacaoPerfisChris').innerText()).includes('as ações serão reais'),'modal avisa que a edição é operacional');

  await page.locator('#operacaoPapelEscolhido').selectOption('Gabrielle');
  await page.getByRole('button',{name:'Operar este perfil'}).click();
  exigir(await page.evaluate(()=>window.__operacaoDelegadaChris)==='Gabrielle','clique conserva Gabrielle como papel operado');
  exigir(await page.locator('#bannerOperacaoPerfilChris').count()===1&&
    (await page.locator('#bannerOperacaoPerfilChris').innerText()).includes('ALTERAÇÕES ATIVAS E REGISTRADAS'),'banner torna a operação ativa inequívoca');
  exigir(await page.locator('#euSouGlobal').inputValue()==='Gabrielle'&&await page.evaluate(()=>window.__motorParado===true),'troca o papel visual e para o motor global');

  await page.getByRole('button',{name:'Voltar ao Chris'}).click();
  exigir(await page.evaluate(()=>window.__operacaoDelegadaChris)===''&&await page.locator('#bannerOperacaoPerfilChris').count()===0,'retorno limpa a delegação e remove o banner');
  exigir(await page.locator('#euSouGlobal').inputValue()==='Chris'&&await page.evaluate(()=>window.__trocas===2),'retorno reaplica o perfil Chris pela mesma troca protegida');

  await page.evaluate(()=>{window.__pessoaAutenticadaReal='Amanda';});
  await page.locator('#atalho').click();
  exigir(await page.locator('#painelOperacaoPerfisChris').count()===0,'identidade Amanda não abre o modal mesmo com chamada direta do atalho');

  await page.setViewportSize({width:375,height:740});
  await page.evaluate(()=>{window.__pessoaAutenticadaReal='Chris';});
  await page.locator('#atalho').click();
  const caixa=await page.locator('#painelOperacaoPerfisChris > .card').boundingBox();
  exigir(caixa&&caixa.x>=0&&caixa.x+caixa.width<=375&&caixa.y>=0&&caixa.y+caixa.height<=740,'modal cabe no viewport móvel sem corte lateral ou vertical');
}finally{await browser.close();}

console.log(`REGRESSÃO V96 UI OPERAÇÃO CHRIS: APROVADA (${total} verificações com cliques reais)`);
