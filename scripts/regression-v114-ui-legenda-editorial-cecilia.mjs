#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const calendario=fs.readFileSync(path.join(raiz,'calendario.html'),'utf8');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
function entre(texto,inicio,fim){const a=texto.indexOf(inicio),b=texto.indexOf(fim,a+inicio.length);if(a<0||b<0)throw new Error('V114 UI: trecho ausente '+inicio);return texto.slice(a,b);}
const runtimeCal=entre(calendario,'function normalizarSlugLegendaV114','async function saveItem()');
const runtimeFila=entre(escritorio,'async function renderAgendarPostagens()','  /* ===== MARCAR MANUALMENTE');
let total=0;const falhas=[];
function verificar(condicao,mensagem,detalhe=''){total++;if(condicao)console.log('PASS ',mensagem);else{falhas.push({mensagem,detalhe});console.error('FAIL ',mensagem+(detalhe?' — '+detalhe:''));}}
const navegador=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});

async function cenario(nome,viewport,{semPost=false,erro=false,ambiguo=false}={}){
  const page=await navegador.newPage({viewport});
  const pageerrors=[];page.on('pageerror',e=>pageerrors.push(String(e)));
  await page.setContent(`<!doctype html><html><body style="font:16px system-ui;background:#202124;color:#fff"><div id="info">Caminho da legenda: Salvar confirma a passagem para Cecília.</div><button id="salvar">Salvar legenda</button><div id="resultado"></div></body></html>`);
  await page.addScriptTag({content:`
window.__modoCal='equipe';window.__papelCalendarioEquipe='Gabrielle';window.__clienteId='camargos';
window.__estado={mensagens:[],transacoes:0,escritas:[],erro:${erro},semPost:${semPost}};
const item={itemId:'item-1',legenda:'Legenda de teste',legendaAtualizadaEm:'2026-08-24T15:00:00.000Z'};
const base={id:'post-1',videoId:'video-1',cliente:'camargos',calendarClienteSlug:'camargos',calendarItemId:'item-1',calendarItemIdx:2,status:'aguardando_legenda',legenda:''};
window.__postagens=window.__estado.semPost?[]:[base${ambiguo?",{...base,id:'post-2'}":''}];
window.__video={cliente:'camargos',calendarClienteSlug:'camargos',calendarItemId:'item-1',calendarItemIdx:2,clienteAprovou:true,status:'aprovado',postagemId:'post-1'};
function snap(id,dados){return {id,exists:()=>!!dados,data:()=>structuredClone(dados)}}
function lista(dados){return {forEach(fn){dados.forEach(d=>fn(snap(d.id,d)))}}}
function avisarTela(msg,tipo){window.__estado.mensagens.push({msg,tipo:tipo||'ok'});document.getElementById('resultado').textContent=msg;document.getElementById('resultado').dataset.tipo=tipo||'ok';}
window.__fb={db:{},collection:(_d,n)=>({n}),where:(...a)=>a,query:(...a)=>a,doc:(_d,c,id)=>({colecao:c,id,path:c+'/'+id}),
 getDocs:async()=>{if(window.__estado.erro)throw Object.assign(new Error('sem permissão'),{code:'permission-denied'});return lista(window.__postagens)},
 runTransaction:async(_d,fn)=>{window.__estado.transacoes++;const tx={get:async ref=>ref.colecao==='postagens'?snap(ref.id,window.__postagens.find(p=>p.id===ref.id)):snap(ref.id,window.__video),update:(ref,patch)=>{window.__estado.escritas.push({path:ref.path,patch});Object.assign(window.__postagens.find(p=>p.id===ref.id),patch)}};return fn(tx)},
 getDoc:async ref=>snap(ref.id,window.__postagens.find(p=>p.id===ref.id))};
${runtimeCal}
document.getElementById('salvar').onclick=async()=>{try{await sincronizarLegendaEditorialComCeciliaV114(item,2)}catch(e){avisarTela(e.message,'erro')}};
`});
  await page.click('#salvar');
  await page.waitForTimeout(30);
  const resultado=await page.evaluate(()=>({texto:document.getElementById('resultado').textContent,tipo:document.getElementById('resultado').dataset.tipo,estado:structuredClone(window.__estado),status:window.__postagens[0]?.status,info:document.getElementById('info').textContent}));
  verificar(pageerrors.length===0,`${nome}: zero pageerror`,pageerrors.join(' | '));
  verificar(resultado.info.includes('Cecília'),`${nome}: caminho fica visível`);
  if(erro){
    verificar(resultado.tipo==='erro'&&resultado.texto.includes('sem permissão'),`${nome}: permission-denied aparece como erro`);
    verificar(resultado.estado.escritas.length===0,`${nome}: falha de leitura fica zero-write`);
  }else if(ambiguo){
    verificar(resultado.tipo==='erro'&&resultado.texto.includes('vínculos concorrentes'),`${nome}: ambiguidade fica visível`);
    verificar(resultado.estado.escritas.length===0,`${nome}: ambiguidade fica zero-write`);
  }else if(semPost){
    verificar(resultado.tipo==='ok'&&resultado.texto.includes('confirmada no calendário'),`${nome}: ausência de postagem preserva planejamento`);
    verificar(resultado.estado.escritas.length===0,`${nome}: planejamento não inventa postagem`);
  }else{
    verificar(resultado.tipo==='ok'&&resultado.texto.includes('confirmada na fila da Cecília'),`${nome}: sucesso só aparece com recibo`);
    verificar(resultado.status==='aguardando_agendamento'&&resultado.estado.escritas.length===1,`${nome}: uma única postagem avança`);
  }
  await page.close();
}
await cenario('desktop sucesso',{width:1440,height:900});
await cenario('mobile sem postagem aprovada',{width:390,height:844},{semPost:true});
await cenario('desktop ambiguidade',{width:1440,height:900},{ambiguo:true});
await cenario('mobile permission-denied',{width:390,height:844},{erro:true});

{
  const page=await navegador.newPage({viewport:{width:390,height:844}});const pageerrors=[];page.on('pageerror',e=>pageerrors.push(String(e)));
  await page.setContent('<div id="postagensConteudo"></div>');
  await page.addScriptTag({content:`const db={};function collection(){return {}}function where(){return {}}function query(){return {}}async function getDocs(){throw Object.assign(new Error('negado'),{code:'permission-denied'})}function esc(v){return String(v)}function hojeLocal(){return '2026-08-25'}${runtimeFila}`});
  await page.evaluate(()=>renderAgendarPostagens());
  const texto=await page.locator('#postagensConteudo').innerText();
  verificar(pageerrors.length===0,'mobile fila Cecília indisponível: zero pageerror',pageerrors.join(' | '));
  verificar(texto.includes('Fila da Cecília indisponível')&&texto.includes('não significa que não existam legendas'),'mobile fila Cecília: erro nunca vira vazio');
  verificar(!texto.includes('Nenhuma postagem esperando'),'mobile fila Cecília: falha não exibe estado vazio');
  await page.close();
}
await navegador.close();
console.log(`V114 UI: ${total-falhas.length}/${total} verificações aprovadas.`);
if(falhas.length){for(const f of falhas)console.error(' - '+f.mensagem+(f.detalhe?': '+f.detalhe:''));process.exitCode=1;}
