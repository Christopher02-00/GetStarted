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
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('V91.1 Rodrigo/Central: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(inicio,fim){
  const a=fonte.indexOf(inicio), b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return fonte.slice(a,b);
}

exigir(fonte.includes('<meta name="gs-base-patch" content="2026-08-19-rodrigo-so-edicao-v91-1">'),'marcador do patch-base V91.1 está presente');
exigir(fonte.includes("v.tipo==='mensalista'&&!ehClienteSoEdicao(v.slug)?'<button"),'atalho real reutiliza a barreira de cliente somente edição');

const renderer=trecho('      const itemAtivo=v=>{','      const arquivadosDeOrigem=[')
  .replace('      const itemAtivo=v=>{','      window.itemAtivo=v=>{');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1080,height:720}});
try{
  await page.setContent('<!doctype html><html><body><section id="hitech"></section><section id="rodrigo"></section></body></html>');
  await page.addScriptTag({content:`
    window.__calendarioAberto='';
    window.competenciaFinanceiraValida=()=>true;
    window.brl=v=>'R$ '+Number(v||0).toFixed(2);
    window.esc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    window.escJs=v=>String(v??'').replace(/'/g,"\\\\'");
    window.formatarDataBR=v=>String(v||'');
    window.nomeClienteCanonico=(_slug,nome)=>String(nome||'');
    window.ehClienteSoEdicao=slug=>String(slug||'')==='rodrigo';
    window.abrirCalendarioDeCliente=slug=>{ window.__calendarioAberto=slug; };
    window.abrirPortalClienteCentral=()=>{}; window.copiarPortalClienteCentral=()=>{};
    window.garantirPortalClienteCentral=()=>{}; window.navegarGerenciaSub=()=>{};
    window.editarClienteAtivoCentral=()=>{}; window.abrirSaidaClienteCentral=()=>{};
    ${renderer}
    const base={tipo:'mensalista',instagram:'',telefone:'',aniversario:'',contatos:'',plano:'Premium',planoDetalhes:'',valorMensal:1000,diaVencimento:10,primeiraCompetencia:'2026-09',ultimaCompetenciaPagamento:'',tipoEntrega:'postagem_completa',incluiStories:false,cortesiaPermanente:false,cortesiaMeses:[],onboardingStatus:'',observacoes:'',token:'ok',saida:null,identidadeDivergente:false};
    document.querySelector('#hitech').innerHTML=itemAtivo({...base,slug:'hitech',nome:'Hitech'});
    document.querySelector('#rodrigo').innerHTML=itemAtivo({...base,slug:'rodrigo',nome:'Rodrigo',tipoEntrega:'entrega_direta'});
  `});
  const botaoHitech=page.locator('#hitech button',{hasText:'Calendário'});
  const botaoRodrigo=page.locator('#rodrigo button',{hasText:'Calendário'});
  exigir(await botaoHitech.count()===1,'Hitech mantém exatamente um atalho de calendário');
  exigir(await botaoRodrigo.count()===0,'Rodrigo não possui atalho de calendário na Central');
  await botaoHitech.click();
  exigir(await page.evaluate(()=>window.__calendarioAberto)==='hitech','clique real abre o calendário da Hitech independente');
  exigir((await page.locator('#rodrigo').innerText()).includes('Rodrigo'),'cartão do Rodrigo e demais controles permanecem renderizados');
} finally {
  await browser.close();
}
console.log(`REGRESSÃO V91.1 RODRIGO/CENTRAL: APROVADA (${total} verificações com clique real)`);
