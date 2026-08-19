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
  if(!condicao) throw new Error('V91 UI publicados: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(inicio,fim){
  const a=fonte.indexOf(inicio), b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return fonte.slice(a,b);
}
const renderer=trecho(
  '  function consolidarCalendariosPublicadosDaCarteira(',
  '  window.reabrirCalendarioArquivado=async function');

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1180,height:820}});
try{
  await page.setContent('<!doctype html><html><body><button id="abrir" onclick="renderFilaEnvioCalendarios()">Publicados e arquivo</button><div id="filaEnvioCalendarios"></div></body></html>');
  await page.addScriptTag({content:`
    window.usuarioAtual='Chris';
    window.__docsFake=itens=>({forEach(fn){itens.forEach(([id,dados])=>fn({id,data:()=>dados}));}});
    window.__calendarios=__docsFake([
      ['zeiss',{client:'Zeiss',items:[{mes:'2026-08'},{mes:'2026-08'}],aprovacaoMeses:{'2026-08':{status:'liberado'}}}],
      ['zeens',{client:'Zeiss alias',items:[{mes:'2026-08'}],aprovacaoMeses:{'2026-08':{status:'liberado'}}}],
      ['hitech',{client:'Hitech',items:[{mes:'2026-09'}],aprovacaoMeses:{'2026-09':{status:'liberado'}}}],
      ['auditoria-v87-nao-e-cliente',{client:'AUDITORIA V87 — NÃO É CLIENTE',items:[{mes:'2026-09'}],aprovacaoMeses:{'2026-09':{status:'liberado'}}}],
      ['ikn-brasil',{client:'IKN Brasil',items:[{mes:'2026-09'}],aprovacaoMeses:{'2026-09':{status:'liberado'}}}]
    ]);
    window.obterCalendariosCompartilhados=async()=>__calendarios;
    window.clientesCalendarioRecorrentesConfirmados=async()=>[{slug:'zeiss',nome:'Zeiss'},{slug:'hitech',nome:'Hitech'}];
    window.slugClienteCanonico=s=>({'zeens':'zeiss'}[String(s||'')]||String(s||''));
    window.mesesDeCalendario=cal=>[...new Set((cal.items||[]).map(i=>i.mes).filter(Boolean))];
    window.itensDoMesCalendario=(cal,mes)=>(cal.items||[]).filter(i=>i.mes===mes&&!i.excluido);
    window.estadoMesCal=(cal,mes)=>cal.aprovacaoMeses?.[mes]?.status||'rascunho';
    window.nomeDeSlugSeguro=s=>String(s||'');
    window.linhasCalendariosAguardandoRevisao=()=>[];
    window.esc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    window.escJs=v=>String(v??'').replace(/'/g,"\\\\'");
    window.htmlFalhaLeituraCalendarios=(t,e)=>'<b>'+esc(t)+'</b>';
    ${renderer}
  `});
  await page.locator('#abrir').click();
  await page.waitForFunction(()=>document.querySelector('#filaEnvioCalendarios')?.textContent.includes('Calendários públicos agora'));
  const texto=await page.locator('#filaEnvioCalendarios').innerText();
  exigir(texto.includes('Calendários públicos agora (2)'),'clique real mostra duas identidades públicas canônicas');
  exigir((texto.match(/Zeiss · Agosto 2026/g)||[]).length===1,'Zeiss/Agosto aparece uma única vez');
  exigir(texto.includes('Hitech · Setembro 2026'),'Hitech permanece como empresa independente');
  exigir(!texto.includes('AUDITORIA V87')&&!texto.includes('IKN Brasil'),'teste sintético e avulso não aparecem no arquivo visual');
} finally {
  await browser.close();
}
console.log(`REGRESSÃO V91 UI PUBLICADOS: APROVADA (${total} verificações com clique real)`);
