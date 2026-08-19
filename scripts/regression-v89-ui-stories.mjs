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
  if(!condicao) throw new Error('V89 UI Stories: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(inicio,fim){
  const a=fonte.indexOf(inicio), b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return fonte.slice(a,b);
}

const stories=trecho('  const DIAS_STORY = [','  // guarda onde o painel foi desenhado por ultimo');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1180,height:900}});
page.on('pageerror',erro=>console.error('PAGEERROR',erro.message));
try{
  await page.setContent('<!doctype html><html><body><button id="abrirStories" onclick="renderStoriesCliente()">Abrir Stories</button><div id="storiesConteudo"></div></body></html>');
  await page.addScriptTag({content:`
    window.usuarioAtual='Gabrielle'; window.db={}; window.__modoStory='sucesso'; window.__leiturasStory=[];
    window.__storyClientesDocs={
      'vitalle-odonto':{slug:'vitalle-odonto',nome:'Vitalle Odonto',ativo:true,porSemana:5,dias:[1,2],combinado:'Story de segunda e terça'}
    };
    window.collection=(_db,nome)=>nome;
    window.doc=(_db,colecao,id)=>({colecao,id,path:colecao+'/'+id});
    window.serverTimestamp=()=> '2026-08-19T15:00:00.000Z';
    window.setDoc=async(ref,patch)=>{
      if(ref.colecao!=='stories_clientes') throw new Error('coleção inesperada no teste');
      window.__storyClientesDocs[ref.id]={...(window.__storyClientesDocs[ref.id]||{}),...structuredClone(patch)};
    };
    window.__docsFake=itens=>({forEach(fn){itens.forEach(([id,dados])=>fn({id,data:()=>dados}));}});
    window.getDocs=async nome=>{
      window.__leiturasStory.push(nome);
      if(window.__modoStory==='falha') throw Object.assign(new Error('indisponível no teste'),{code:'unavailable'});
      if(nome==='stories_clientes') return __docsFake(Object.entries(window.__storyClientesDocs));
      if(nome==='stories_links') return __docsFake([
        ['vitalle-odonto_2026-08-17',{cliente:'vitalle-odonto',semana:'2026-08-17',revisaoInterna:'aguardando_interna',dias:{1:{link:'https://docs.google.com/document/d/seguro'},2:{link:'javascript:alert(1)'}}}]
      ]);
      if(nome==='stories_semanais') return __docsFake([]);
      return __docsFake([]);
    };
    window.clientesCalendarioRecorrentesConfirmados=async()=>[
      {slug:'iphone-campo-largo',nome:'iPhone Campo Largo'}
    ];
    window.slugClienteCanonico=v=>String(v||'');
    window.saidaClienteJaEfetiva=()=>false;
    window.dataLocal=d=>{ const x=new Date(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
    window.esc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    window.escAttr=v=>esc(v).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    window.escJs=v=>String(v??'').replace(/'/g,'&#39;');
    window.mostrarToast=()=>{}; window.confirm=()=>true; window.prompt=()=>'';
    ${stories}
  `});

  await page.locator('#abrirStories').click();
  await page.waitForFunction(()=>document.querySelector('#storiesConteudo')?.textContent.includes('Vitalle Odonto'));
  let texto=await page.locator('#storiesConteudo').innerText();
  exigir(texto.includes('Vitalle Odonto'),'clique real abre o cliente de Story já confirmado');
  exigir(texto.includes('iPhone Campo Largo'),'mensalista confirmado aparece como candidato a novo Story');
  exigir(!texto.includes('IKN')&&!texto.includes('X Joias'),'avulsos não aparecem na inclusão de Story');
  exigir(await page.locator('a[href="https://docs.google.com/document/d/seguro"]').count()===1,'link HTTPS válido vira ação clicável');
  exigir(await page.locator('[data-story-link-invalido="true"]').count()===1&&await page.locator('a[href^="javascript:"]').count()===0,'link inválido é sinalizado e nunca vira clique');

  await page.locator('#novoStoryCliente').selectOption('iphone-campo-largo');
  await page.getByRole('button',{name:'Adicionar aos clientes de story'}).click();
  await page.waitForFunction(()=>document.querySelector('#storiesConteudo')?.textContent.includes('iPhone Campo Largo')&&document.querySelector('#scNome_iphone-campo-largo'));
  exigir(await page.locator('#scNome_iphone-campo-largo').count()===1,'clique real ativa o mensalista de Story sem duplicar sua ficha');
  await page.locator('#scNome_iphone-campo-largo').locator('xpath=ancestor::div[contains(@class,"metaSec")]').getByRole('button',{name:'Tirar da lista'}).click();
  await page.waitForFunction(()=>!document.querySelector('#scNome_iphone-campo-largo'));
  const ciclo=await page.evaluate(()=>window.__storyClientesDocs['iphone-campo-largo']);
  exigir(ciclo.ativo===false&&!!ciclo.removidoEm,'retirada do Story é lógica: sai da rotina e preserva o registro');
  exigir(await page.locator('#scNome_vitalle-odonto').count()===1,'alterar outro cliente não remove o Story confirmado da Vitalle');

  await page.evaluate(async()=>{
    window.__modoStory='falha';
    await window.carregarClientesDeStory(true);
    await window.renderStoriesCliente();
  });
  await page.waitForFunction(()=>document.querySelector('#storiesConteudo')?.textContent.includes('último retrato confirmado'));
  texto=await page.locator('#storiesConteudo').innerText();
  exigir(texto.includes('Vitalle Odonto')&&texto.includes('último retrato confirmado'),'falha posterior preserva o cliente e mostra indisponibilidade');

  const timeout=await page.evaluate(async()=>{
    try{ await window.comTimeoutStoriesEquipe(new Promise(()=>{}),'o teste isolado',35); return ''; }
    catch(e){ return {code:e.code,message:e.message}; }
  });
  exigir(timeout.code==='gs/timeout-stories'&&timeout.message.includes('Tempo excedido'),'leitura pendurada termina como timeout explícito');

  await page.evaluate(async()=>{
    window.limparRetratosStoriesEquipe();
    document.querySelector('#storiesConteudo').innerHTML='';
    await window.renderStoriesCliente();
  });
  await page.waitForFunction(()=>document.querySelector('#storiesConteudo')?.textContent.includes('Não consegui confirmar os clientes'));
  texto=await page.locator('#storiesConteudo').innerText();
  exigir(!texto.includes('Nenhum cliente com story'),'falha sem retrato não é apresentada como lista vazia');
} finally {
  await browser.close();
}

console.log(`REGRESSÃO V89 UI STORIES: APROVADA (${total} verificações com cliques reais)`);
