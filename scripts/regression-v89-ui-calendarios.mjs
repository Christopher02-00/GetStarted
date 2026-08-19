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
  if(!condicao) throw new Error('V89 UI calendários: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(inicio,fim){
  const a=fonte.indexOf(inicio), b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return fonte.slice(a,b);
}

const carga=trecho('  const MENSALISTAS_OPERACIONAIS_CONFIRMADOS = new Map([','  /* ===== CLIENTE "SÓ EDIÇÃO"');
const carteira=trecho('  window.clientesCalendarioRecorrentesConfirmados = async function(){','  /* ===== VÍDEO DE TRÁFEGO');
const ferramentas=trecho('  let calendarioFerramentasClientesConfirmados=[];','  let calendarioFerramentasAbertoSlug = null;');
const visao=trecho('  window.renderVisaoCalendarios = async function(sufixo){','  /* ===== REFEITA — 28/07/2026');

const browser=await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});
const page=await browser.newPage({viewport:{width:1180,height:820}});
try{
  await page.setContent(`<!doctype html><html><body>
    <button id="tabEditar" onclick="carregarClientesCalendariosFerramentas()">Montar e editar</button>
    <button id="tabVisao" onclick="renderVisaoCalendarios('2')">Visão do mês</button>
    <select id="resgateCalCliente"></select><select id="resgateCalCliente2"></select>
    <div id="listaLinksCal"></div><div id="listaCalendariosFerramentas"></div>
    <div id="visaoCalendariosBox2"></div><div id="calMesRender2"></div>
  </body></html>`);
  await page.addScriptTag({content:`
    window.usuarioAtual='Gabrielle';
    window.db={}; window.__modoLeitura='sucesso'; window.__leituras=[];
    window.collection=(_db,nome)=>nome;
    window.__docsFake=itens=>({forEach(fn){itens.forEach(([id,dados])=>fn({id,data:()=>dados}));}});
    window.getDocs=async nome=>{
      window.__leituras.push(nome);
      if(window.__modoLeitura==='falha'&&['clientes_config','clientes_extras'].includes(nome)){
        const erro=new Error('indisponível para teste'); erro.code='unavailable'; throw erro;
      }
      if(['contratos_cliente','pagamentos_mensais','clientes_encerrados'].includes(nome)){
        const erro=new Error('coleção gerencial não permitida'); erro.code='permission-denied'; throw erro;
      }
      if(nome==='clientes_config') return __docsFake([
        ['iphone-campo-largo',{tipoCliente:'mensalista',nome:'iPhone Campo Largo'}],
        ['novo-mensalista',{tipoCliente:'mensalista',nome:'Novo Mensalista'}],
        ['ikn-brasil',{tipoCliente:'avulso',nome:'IKN Brasil'}],
        ['x-joias',{tipoCliente:'avulso',nome:'X Joias'}]
      ]);
      return __docsFake([]);
    };
    window.slugClienteCanonico=slug=>({hitech:'rodrigo'}[String(slug||'')]||String(slug||''));
    window.nomeClienteCanonico=(_slug,nome)=>String(nome||'');
    window.nomeDeSlugSeguro=slug=>String(slug||'').replace(/-/g,' ');
    window.clienteInativoEfetivo=dados=>dados?.clienteInativo===true;
    window.normNomeCliente=v=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/\\s+/g,' ').trim();
    window.FORA_DA_META_SEMENTE={ikn:'cliente avulso','ikn brasil':'cliente avulso','x joias':'cliente avulso'};
    window.ehClienteSoEdicao=slug=>slugClienteCanonico(slug)==='rodrigo';
    window.esc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    window.escAttr=esc; window.escJs=v=>String(v??'').replace(/'/g,"\\\\'");
    window.hojeLocal=()=> '2026-08-19'; window.competenciaSeguinte=()=> '2026-09';
    window.htmlFalhaLeituraCalendarios=(titulo,e)=>'<div class="falha"><b>'+esc(titulo)+'</b><span>'+esc(e?.code||'erro')+'</span></div>';
    window.abrirCalendarioFerramentas=()=>{}; window.copiarLinkCalendarioDireto=()=>{}; window.copiarLinkCalendarioEquipe=()=>{};
    window.obterCalendariosCompartilhados=async()=>__docsFake([]);
    window.mapaCalendariosPorIdentidade=()=>({}); window.competenciaOperacionalCalendario=()=> '2026-09';
    window.itensDoMesCalendario=()=>[]; window.progressoEditorialCalendario=()=>({roteiros:0,legendas:0,referencias:0});
    window.estadoMesCal=()=> 'em_montagem'; window.ehCalendarioLegado=()=>false; window.__calAbertoSlug='';
    ${carga}
    ${carteira}
    ${ferramentas}
    ${visao}
    window.__limparCarteiraTeste=()=>{
      __versaoCarteiraCalendario++;
      __carteiraCalendarioOperacionalConfirmada=null;
      __erroCarteiraCalendarioOperacional=null;
      __carregarClientesExtrasEmCurso=null;
      calendarioFerramentasClientesConfirmados=[];
      calendarioFerramentasClientesEstado='nao-carregado';
    };
  `});

  await page.locator('#tabEditar').click();
  await page.waitForFunction(()=>document.querySelector('#listaCalendariosFerramentas')?.textContent.includes('iPhone Campo Largo'));
  let texto=await page.locator('#listaCalendariosFerramentas').innerText();
  exigir(texto.includes('iPhone Campo Largo')&&texto.includes('Novo Mensalista'),'clique real em Montar e editar exibe a carteira mensalista');
  exigir(!texto.includes('IKN Brasil')&&!texto.includes('X Joias'),'clique real não exibe avulsos na carteira');

  await page.locator('#tabVisao').click();
  await page.waitForFunction(()=>!document.querySelector('#visaoCalendariosBox2')?.textContent.includes('Lendo os calendários'));
  texto=await page.locator('#visaoCalendariosBox2').innerText();
  exigir(texto.includes('iPhone Campo Largo'),'clique real em Visão do mês termina e exibe a iPhone Campo Largo');
  exigir(!(await page.evaluate(()=>__leituras.some(n=>['contratos_cliente','pagamentos_mensais','clientes_encerrados'].includes(n)))),'os cliques da Gabi não tentam ler coleções gerenciais');

  await page.evaluate(()=>{ window.__modoLeitura='falha'; });
  await page.locator('#tabEditar').click();
  await page.waitForFunction(()=>document.querySelector('#listaCalendariosFerramentas')?.textContent.includes('último retrato confirmado'));
  texto=await page.locator('#listaCalendariosFerramentas').innerText();
  exigir(texto.includes('iPhone Campo Largo')&&texto.includes('último retrato confirmado'),'falha posterior preserva clientes e mostra indisponibilidade');

  await page.evaluate(()=>{ window.__limparCarteiraTeste(); document.querySelector('#listaCalendariosFerramentas').innerHTML=''; });
  await page.locator('#tabEditar').click();
  await page.waitForFunction(()=>document.querySelector('#listaCalendariosFerramentas')?.textContent.includes('Não consegui confirmar'));
  texto=await page.locator('#listaCalendariosFerramentas').innerText();
  exigir(!texto.includes('Nenhum cliente encontrado'),'falha sem retrato não é transformada em lista vazia');
} finally {
  await browser.close();
}

console.log(`REGRESSÃO V89 UI CALENDÁRIOS: APROVADA (${total} verificações com cliques reais)`);
