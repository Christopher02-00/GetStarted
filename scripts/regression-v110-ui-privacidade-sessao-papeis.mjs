#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonte = fs.readFileSync(path.join(raiz, 'escritorio.html'), 'utf8');
let total = 0;

function exigir(condicao, mensagem){
  total++;
  if(!condicao) throw new Error('V110 UI PRIVACIDADE: ' + mensagem);
  console.log('PASS ', mensagem);
}

function trecho(inicio, fim){
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) throw new Error('V110 UI PRIVACIDADE: trecho ausente ' + inicio);
  return fonte.slice(a, b);
}

const limpeza = trecho('function limparEstadoPrivadoTrocaIdentidade', 'window.mudarUsuarioGlobal = async function');
const papeisDom = trecho('const __sidebarExclusivos', 'function esc(');
const visibilidadeSidebar = trecho('function atualizarVisibilidadeSidebarExclusiva', '// FRENTE C1');
const renderVendas = trecho('window.renderCentralVendas=async function', 'function atualizarBadgeFunil');
const renderAvulso = trecho('window.renderClientesAvulsos = async function', 'window.__abaFicha');
const evidenceArg = process.argv.find(arg=>arg.startsWith('--evidence-dir='));
const evidenceDir = evidenceArg ? evidenceArg.slice('--evidence-dir='.length) : '';

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#2c2d2f;color:#f0f1ed;font:15px system-ui}.app{display:flex;min-height:100vh}.sidebar{width:250px;background:#212123;padding:18px}.main{flex:1;padding:24px}.navgroup{margin:8px 0;padding:8px;border:1px solid #3a3a3d}.navitem{display:flex;padding:8px;margin:4px;background:#333;border-radius:6px}.view{border:1px solid #48494d;padding:12px;margin:8px}.subtab{padding:8px;background:#3b3b3e}.card{padding:12px;border:1px solid #fbbc19}
</style></head><body><div class="app"><aside class="sidebar">
  <div id="navCadastro" class="navitem">Cadastro</div>
  <div id="navContratosAmanda" class="navitem">Contratos Amanda</div>
  <div id="navAprovacoes" class="navitem">Aprovações</div>
  <div id="navExtras" class="navitem">Extras</div>
  <div id="navgroupVendas" class="navgroup"><div>Vendas</div><div id="navMensalidades" class="navitem">Mensalidades</div><div id="navFinanceiro" class="navitem">Financeiro</div></div>
  <div id="navMensagensClientesChris" class="navitem">Mensagens</div>
  <div id="navgroupLinksClientes" class="navgroup"><div id="linkCalendarios" class="navitem">Calendários dos Clientes</div><div id="linkCadastro" class="navitem">Cadastro de Cliente Novo</div><div id="linkPedido" class="navitem">Enviar Pedido</div></div>
</aside><main class="main">
  <div id="view-cadastro" class="view"><div id="registroRapidoBox">FORMULÁRIO LIMPO</div></div>
  <div id="view-contratos" class="view">CONTRATOS</div>
  <div id="view-mensalidades" class="view"><div id="mensalidadesBox"></div></div>
  <div id="view-financeiro" class="view"><div id="financeiroBox"></div><div id="financeiroExtrasBox"></div></div>
  <div id="view-cobranca" class="view"><div id="cobrancaBox"></div></div>
  <div id="view-mensagensClientesChris" class="view"></div>
  <div id="view-centralVendas" class="view"><input id="vendasMes"><div id="centralVendasResumo"></div><div id="centralVendasFunil"></div><div id="centralVendasReunioes"></div></div>
  <div id="view-gerencia" class="view"><div id="subtabGerenciaAvulsos" class="subtab" data-sub="avulsos">Projetos Avulsos</div><div id="gerenciaAvulsos"></div><div id="entradaClientesBox"></div></div>
  <div id="view-inicio" class="view">INÍCIO</div>
</main></div></body></html>`;

const baseScript = `
  let usuarioAtual='';
  let __geracaoIdentidade=0;
  let __negociosCentralVendas=[];
  let __reunioesCentralVendas=[];
  let __leadsAvulsosCache=[];
  let __leadsPessoalCache=[];
  let __leadsMensalCache=[];
  let onboardingProcessos=[];
  let onboardingAberto=null;
  window.__redeAvulso=0;
  function papelPodeAbrirVideos(){return false;}
  function limparFormularioEntradaCliente(){window.__formularioLimpo=(window.__formularioLimpo||0)+1;}
  window.limparFormularioEntradaCliente=limparFormularioEntradaCliente;
  ${papeisDom}
  ${visibilidadeSidebar}
  ${limpeza}
  ${renderAvulso}
  window.__apiV110={
    trocar(pessoa){limparEstadoPrivadoTrocaIdentidade();usuarioAtual=pessoa;atualizarVisibilidadeSidebarExclusiva();},
    sincronizar:atualizarVisibilidadeSidebarExclusiva,
    limpar:limparEstadoPrivadoTrocaIdentidade,
    renderAvulso:window.renderClientesAvulsos,
    estado(){return {usuarioAtual,__geracaoIdentidade,__negociosCentralVendas,__reunioesCentralVendas,onboardingProcessos,onboardingAberto};},
    popular(){
      window.__projecaoCicloClientes={telefone:'41999999999'};
      window.__clientesArquivadosCentral={x:{valor:1700}};
      window.__saidasProgramadasPorSlug={x:{motivo:'privado'}};
      window.__entradaClientesAtivos={x:{token:'segredo'}};
      window.__entradaClientesAtivosConfirmadosEm=123;
      window.__fichasAvulso={x:{proposta:'R$ 2.000'}};
      __negociosCentralVendas=[{clienteNome:'SIGILOSO'}];
      __reunioesCentralVendas=[{resumo:'SIGILOSO'}];
      __leadsAvulsosCache=[{nome:'SIGILOSO'}];
      __leadsPessoalCache=[{nome:'SIGILOSO'}];
      __leadsMensalCache=[{nome:'SIGILOSO'}];
      onboardingProcessos=[{cliente:'SIGILOSO'}];onboardingAberto={cliente:'SIGILOSO'};
      ['centralVendasResumo','centralVendasFunil','centralVendasReunioes','financeiroBox','financeiroExtrasBox','mensalidadesBox','cobrancaBox','gerenciaAvulsos','entradaClientesBox'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='DADO-ANTERIOR';});
    }
  };
`;

async function instalar(page){
  await page.setContent(html);
  await page.addScriptTag({content:baseScript});
}

const navegador = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await navegador.newPage({viewport:{width:1280,height:850}});
const erros=[];
page.on('pageerror',e=>erros.push(String(e)));

try{
  await instalar(page);

  await page.evaluate(()=>window.__apiV110.trocar('Chris'));
  exigir(await page.locator('#view-centralVendas').count()===1, 'Chris recebe Central de Vendas no DOM');
  exigir(await page.locator('#view-financeiro').count()===1 && await page.locator('#view-mensalidades').count()===1, 'Chris recebe módulos financeiros no DOM');
  exigir(await page.locator('#subtabGerenciaAvulsos').count()===1 && await page.locator('#gerenciaAvulsos').count()===1, 'Chris recebe Projetos Avulsos legado');
  exigir(await page.locator('#view-cadastro').count()===1, 'Chris recebe cadastro operacional');

  await page.evaluate(()=>{window.__apiV110.popular();window.__apiV110.trocar('Amanda');});
  const amanda=await page.evaluate(()=>({estado:window.__apiV110.estado(),projecao:window.__projecaoCicloClientes,ativos:window.__entradaClientesAtivos,fichas:window.__fichasAvulso}));
  exigir(amanda.estado.__negociosCentralVendas.length===0 && amanda.estado.__reunioesCentralVendas.length===0, 'Chris → Amanda elimina negócios e reuniões antes de rede');
  exigir(Object.keys(amanda.projecao).length===0 && Object.keys(amanda.ativos).length===0 && Object.keys(amanda.fichas).length===0, 'Chris → Amanda elimina projeções e fichas globais');
  exigir(await page.locator('#view-centralVendas').count()===0, 'Amanda não recebe Central de Vendas no DOM');
  exigir(await page.locator('#view-financeiro').count()===0 && await page.locator('#view-mensalidades').count()===0 && await page.locator('#view-cobranca').count()===0, 'Amanda não recebe módulos financeiros no DOM');
  exigir(await page.locator('#subtabGerenciaAvulsos').count()===0 && await page.locator('#gerenciaAvulsos').count()===0, 'Amanda não recebe a porta incompatível de Projetos Avulsos');
  exigir(await page.locator('#view-cadastro').count()===1, 'Amanda conserva a Central operacional permitida');
  exigir(await page.locator('#entradaClientesBox').textContent()==='', 'conteúdo da Central de Clientes não atravessa Chris → Amanda');

  await page.evaluate(()=>window.__apiV110.trocar('Cecília'));
  exigir(await page.locator('#view-cadastro').count()===0, 'Cecília não recebe cadastro operacional no DOM');
  const linksCecilia=await page.locator('#navgroupLinksClientes .navitem').evaluateAll(nos=>nos.map(n=>({texto:n.textContent,display:n.style.display})));
  exigir(linksCecilia.filter(x=>x.display!=='none').length===1 && linksCecilia.find(x=>x.display!=='none').texto.includes('Calendários'), 'Cecília recebe somente o link de Calendários');

  await page.evaluate(()=>window.__apiV110.trocar('Chris'));
  exigir(await page.locator('#view-centralVendas').count()===1 && await page.locator('#view-financeiro').count()===1, 'Cecília → Chris restaura módulos permitidos sem reload');
  const linksChris=await page.locator('#navgroupLinksClientes .navitem').evaluateAll(nos=>nos.map(n=>n.style.display));
  exigir(linksChris.every(display=>display===''), 'Cecília → Chris restaura todos os links permitidos');
  exigir((await page.locator('#view-centralVendas').innerText()).includes('DADO-ANTERIOR')===false, 'DOM restaurado não recupera conteúdo comercial da sessão anterior');

  await page.evaluate(()=>window.__apiV110.trocar('Gabrielle'));
  exigir(await page.locator('#view-centralVendas').count()===0 && await page.locator('#view-financeiro').count()===0 && await page.locator('#view-cadastro').count()===0, 'funcionário indevido não recebe módulos restritos');

  /* Mesmo que alguém injete manualmente o container antigo no DOM, a
     guarda de papel deve retornar antes de tocar a rede. */
  const bloqueioAmanda=await page.evaluate(async()=>{
    window.__apiV110.trocar('Amanda');
    const painel=document.createElement('div');painel.id='gerenciaAvulsos';painel.textContent='SENTINELA';document.body.appendChild(painel);
    window.sincronizarLeadsParaFunil=async()=>{window.__redeAvulso++;return {negocios:[]};};
    const resultado=await window.__apiV110.renderAvulso();
    return {resultado,rede:window.__redeAvulso,texto:painel.textContent};
  });
  exigir(bloqueioAmanda.resultado===false && bloqueioAmanda.rede===0 && bloqueioAmanda.texto==='', 'chamada direta de Amanda é bloqueada antes de DOM privilegiado e rede');

  /* Rede atrasada: usa a função real de produção, mas resolve a leitura
     somente depois da troca Chris → Amanda. */
  await page.evaluate((fonteRender)=>{
    window.__apiV110.trocar('Chris');
    window.hojeLocal=()=> '2026-08-24';
    window.nomeMes=v=>v; window.brl=v=>String(v);window.esc=v=>String(v||'');
    window.collection=()=>({});window.db={};
    window.__deferSync={};window.__deferReunioes={};
    window.sincronizarLeadsParaFunil=()=>new Promise(resolve=>window.__deferSync.resolve=resolve);
    window.getDocs=()=>new Promise(resolve=>window.__deferReunioes.resolve=resolve);
    (0,eval)(fonteRender);
  }, renderVendas);
  const promessa=page.evaluate(()=>window.renderCentralVendas());
  await page.waitForFunction(()=>typeof window.__deferSync?.resolve==='function'&&typeof window.__deferReunioes?.resolve==='function');
  await page.evaluate(()=>{
    window.__apiV110.trocar('Amanda');
    window.__deferSync.resolve({negocios:[{id:'vazamento',clienteNome:'NÃO PODE VOLTAR'}]});
    window.__deferReunioes.resolve({forEach(cb){cb({id:'r1',data:()=>({resumo:'NÃO PODE VOLTAR'})});}});
  });
  const resultadoAtrasado=await promessa;
  const depoisAtraso=await page.evaluate(()=>window.__apiV110.estado());
  exigir(resultadoAtrasado===false && depoisAtraso.__negociosCentralVendas.length===0 && depoisAtraso.__reunioesCentralVendas.length===0, 'resposta atrasada do Chris é descartada depois da troca');
  exigir(await page.locator('#view-centralVendas').count()===0, 'resposta atrasada não recria DOM comercial para Amanda');

  await page.setViewportSize({width:375,height:740});
  await page.evaluate(()=>window.__apiV110.trocar('Chris'));
  exigir(await page.locator('#view-centralVendas').count()===1 && await page.locator('#view-financeiro').count()===1, 'restauração funciona no viewport mobile');
  await page.evaluate(()=>window.__apiV110.trocar('Cecília'));
  exigir(await page.locator('#view-centralVendas').count()===0 && await page.locator('#view-financeiro').count()===0, 'isolamento funciona no viewport mobile');

  const page2=await navegador.newPage({viewport:{width:900,height:700}});
  const erros2=[];page2.on('pageerror',e=>erros2.push(String(e)));
  await instalar(page2);
  await page2.evaluate(()=>window.__apiV110.trocar('Chris'));
  exigir(await page2.locator('#view-centralVendas').count()===1, 'segunda aba inicia Chris de forma independente');
  exigir(await page.locator('#view-centralVendas').count()===0, 'segunda aba não altera o isolamento da primeira aba');
  await page2.evaluate(()=>window.__apiV110.trocar('Amanda'));
  exigir(await page2.locator('#view-centralVendas').count()===0, 'segunda aba também remove Central de Vendas ao trocar');
  exigir(erros2.length===0, 'segunda aba não gerou erro de página');
  await page2.close();

  const pageReload=await navegador.newPage({viewport:{width:1280,height:850}});
  const errosReload=[];pageReload.on('pageerror',e=>errosReload.push(String(e)));
  await instalar(pageReload);
  await pageReload.evaluate(()=>window.__apiV110.trocar('Chris'));
  exigir(await pageReload.locator('#view-centralVendas').count()===1 && await pageReload.locator('#view-financeiro').count()===1, 'recarregamento sintético reconstrói o papel sem estado residual');
  if(erros.length) console.error('PAGEERRORS V110:',JSON.stringify(erros));
  exigir(erros.length===0 && errosReload.length===0, 'toda a jornada desktop/mobile termina sem erro de página');

  if(evidenceDir){
    fs.mkdirSync(evidenceDir,{recursive:true});
    await pageReload.screenshot({path:path.join(evidenceDir,'V110_PRIVACIDADE_SESSAO_CHRIS_RESTAURADO.png'),fullPage:true});
    console.log('EVIDÊNCIA VISUAL:',path.join(evidenceDir,'V110_PRIVACIDADE_SESSAO_CHRIS_RESTAURADO.png'));
  }
  await pageReload.close();
}finally{
  await navegador.close();
}

console.log(`REGRESSÃO V110 UI PRIVACIDADE: APROVADA (${total} verificações Chromium real)`);
