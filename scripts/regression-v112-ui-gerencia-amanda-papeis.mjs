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
const falhas = [];

function verificar(condicao, mensagem, detalhe = ''){
  total++;
  if(condicao) console.log('PASS ', mensagem);
  else {
    falhas.push({ mensagem, detalhe });
    console.error('FAIL ', mensagem + (detalhe ? ` — ${detalhe}` : ''));
  }
}

function trecho(inicio, fim){
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) throw new Error('V112 UI: trecho ausente ' + inicio);
  return fonte.slice(a, b);
}

const domPorPapel = trecho('const __sidebarExclusivos', 'function esc(');
const regrasSubabas = trecho('const SUBABAS_OCULTAS_POR_PESSOA', 'window.setGerenciaSub');
const roteadorGerencia = trecho('window.setGerenciaSub = function', '\n  let todasAusencias');
const caminhoPainel = trecho('window.irParaPainelDeControle = function', '/* 01/08/2026');
const caminhoContextual = trecho('window.navegarGerenciaSub = async function', 'window.toggleComandoSecao');
const roteadorPrincipal = trecho('const VIEWS_SO_CHRIS', 'window.setCadastroSub');

const inicioMenu = fonte.indexOf('id="conteudoGerencia"');
const fimMenu = fonte.indexOf('<div class="gerenciaConteudo">', inicioMenu);
if(inicioMenu < 0 || fimMenu < 0) throw new Error('V112 UI: menu da Gerência ausente');
const menuGerencia = fonte.slice(inicioMenu, fimMenu);
const subtabsMenu = [...new Set([...menuGerencia.matchAll(/data-sub="([^"]+)"/g)].map(m => m[1]))];

/* Contrato visual estável, independente da implementação do roteador. Hoje o
   código usa 40 atribuições diretas; a correção pode substituí-las por uma
   tabela/um helper null-safe sem esvaziar a cobertura deste teste. Todas as
   subtabs visíveis seguem o contrato `chave -> gerencia${Chave}`. */
const mapaPainel = Object.fromEntries(subtabsMenu.map(chave => [
  chave,
  'gerencia' + chave.slice(0, 1).toUpperCase() + chave.slice(1)
]));
mapaPainel.funilNegocios = 'gerenciaFunilNegocios';
const idsRoteador = [...new Set([
  ...[...roteadorGerencia.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]),
  'gerenciaFunilNegocios', 'gerenciaAvulsos', 'gerenciaAgora', 'iframePainelTVInterno'
])];
const idsExclusivos = [
  'navCadastro','view-cadastro','navContratosAmanda','view-contratos','navAprovacoes','navExtras',
  'navgroupVendas','view-mensalidades','view-financeiro','view-cobranca','navMensagensClientesChris',
  'view-mensagensClientesChris','view-centralVendas','subtabGerenciaAvulsos','gerenciaAvulsos',
  'gerenciaFunilNegocios','navAcompCampanhas','view-campanhas','navCofreCecilia','view-cofreCecilia',
  'navVideos','view-videos'
];
/* Depois da V112, o roteador usa uma tabela segura em vez de dezenas de
   getElementById diretos. O harness precisa materializar também todos os
   painéis derivados do menu para continuar testando cada rota permitida. */
const idsTodos = [...new Set([...idsRoteador, ...idsExclusivos, ...Object.values(mapaPainel)])];

const renderers = [...new Set([
  ...[...roteadorGerencia.matchAll(/if\(qual===['"][^'"]+['"]\)\s*([A-Za-z_$][\w$]*)\(/g)].map(m => m[1]),
  'renderAgora','renderClientesAvulsos','renderFunilNegocios','pararCentralComando','irParaAprovacoes'
])];

const htmlSubtabs = subtabsMenu.map(chave =>
  `<button class="subtab" data-sub="${chave}"${chave === 'avulsos' ? ' id="subtabGerenciaAvulsos"' : ''}>${chave}</button>`
).join('');
const htmlNos = idsTodos
  .filter(id => id !== 'subtabGerenciaAvulsos' && id !== 'gerenciaAgora' && id !== 'gerenciaAvulsos' && id !== 'gerenciaFunilNegocios')
  .map(id => `<div id="${id}"></div>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  .view{display:none}.view.active{display:block}.subtab{display:block}.painel{display:none}
</style></head><body>
  <button id="navitemGerencia" class="navitem">Gerência</button>
  <div id="view-gerencia" class="view"><div id="conteudoGerencia">${htmlSubtabs}
    <div id="gerenciaFunilNegocios" class="painel"></div>
    <div id="gerenciaAvulsos" class="painel"></div>
    <div id="gerenciaAgora" class="painel"></div>
    ${htmlNos}
  </div></div>
</body></html>`;

const prefixo = [
  "let usuarioAtual='';",
  'let gerenciaAutenticada=true;',
  'let gerenciaSubPendente=null;',
  'window.__v112Chamadas={};window.__v112Toasts=[];window.__v112ErrosAssincronos=[];',
  `window.__v112MapaPainel=${JSON.stringify(mapaPainel)};`,
  `window.__v112Subtabs=${JSON.stringify(subtabsMenu)};`,
  `for(const nome of ${JSON.stringify(renderers)}){window[nome]=function(){window.__v112Chamadas[nome]=(window.__v112Chamadas[nome]||0)+1;};}`,
  "window.mostrarToast=function(msg,tipo){window.__v112Toasts.push({msg,tipo});};",
  "window.papelPodeAbrirVideos=function(pessoa){return ['Chris','Amanda','Cecília','Helo','João Victor','Nathan','Luís'].includes(pessoa);};",
  "window.irPara=function(nome,el){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));if(el)el.classList.add('active');const view=document.getElementById('view-'+nome);if(view)view.classList.add('active');return !!view;};",
  "window.tentarAbrirGerenciaLembrada=async()=>true;",
  "window.addEventListener('unhandledrejection',evento=>{window.__v112ErrosAssincronos.push(String(evento.reason));evento.preventDefault();});"
].join('\n');

const api = `
window.__v112={
  trocar(pessoa){usuarioAtual=pessoa;sincronizarSidebarDOMPorPapel();aplicarSubabasPorPessoa();this.zerar();},
  zerar(){window.__v112Chamadas={};window.__v112Toasts=[];window.__v112ErrosAssincronos=[];},
  chamar(chave){
    let erro='';
    try{setGerenciaSub(chave,document.querySelector('#conteudoGerencia .subtab[data-sub="'+chave+'"]'));}
    catch(e){erro=String(e);}
    const id=window.__v112MapaPainel[chave];
    const painel=id?document.getElementById(id):null;
    return {chave,erro,id,painelExiste:!!painel,display:painel?.style?.display||'',chamadas:{...window.__v112Chamadas},toasts:[...window.__v112Toasts]};
  },
  estado(){return {
    pessoa:usuarioAtual,
    extrasExiste:!!document.getElementById('navExtras'),
    avulsosExiste:!!document.getElementById('gerenciaAvulsos'),
    funilExiste:!!document.getElementById('gerenciaFunilNegocios'),
    avulsosOculta:subabaOcultaPara('avulsos'),
    funilOculta:subabaOcultaPara('funilNegocios'),
    agoraDisplay:document.getElementById('gerenciaAgora')?.style?.display||'',
    viewAtiva:document.getElementById('view-gerencia')?.classList.contains('active')||false,
    errosAssincronos:[...window.__v112ErrosAssincronos],
    chamadas:{...window.__v112Chamadas}
  };}
};`;

const scriptAplicacao = [prefixo, domPorPapel, regrasSubabas, roteadorGerencia, caminhoContextual, caminhoPainel, api].join('\n');

const navegador = await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});
const page = await navegador.newPage({ viewport:{ width:1280, height:850 } });
const errosPagina = [];
page.on('pageerror', erro => errosPagina.push(String(erro)));

try{
  await page.setContent(html);
  await page.addScriptTag({ content:scriptAplicacao });

  verificar(subtabsMenu.length >= 20, 'harness encontrou todas as subabas reais da Gerência', String(subtabsMenu.length));

  await page.evaluate(() => window.__v112.trocar('Amanda'));
  let estadoAmanda = await page.evaluate(() => window.__v112.estado());
  verificar(estadoAmanda.extrasExiste,
    'Amanda mantém navExtras no DOM como porta operacional autorizada', JSON.stringify(estadoAmanda));
  verificar(!estadoAmanda.avulsosExiste && estadoAmanda.avulsosOculta,
    'Amanda não recebe Projetos Avulsos e a rota permanece negada');
  verificar(!estadoAmanda.funilExiste && estadoAmanda.funilOculta,
    'Amanda não recebe Funil de Negócios e a rota permanece negada', JSON.stringify(estadoAmanda));

  /* Jornada exata relatada: botão amarelo -> Gerência -> Agora. */
  await page.evaluate(() => { window.__v112.zerar(); window.irParaPainelDeControle(); });
  await page.waitForTimeout(500);
  const jornadaPainel = await page.evaluate(() => window.__v112.estado());
  verificar(jornadaPainel.viewAtiva, 'Painel de controle abre a view Gerência');
  verificar(jornadaPainel.agoraDisplay === 'block' && (jornadaPainel.chamadas.renderAgora||0) === 1,
    'Painel de controle abre e renderiza Agora para Amanda', JSON.stringify(jornadaPainel));
  verificar(jornadaPainel.errosAssincronos.length === 0,
    'jornada Painel de controle termina sem rejeição assíncrona', jornadaPainel.errosAssincronos.join(' | '));

  const subtabsAmanda = await page.evaluate(() => {
    const permitidas = window.__v112Subtabs.filter(chave => !subabaOcultaPara(chave));
    return permitidas.map(chave => { window.__v112.zerar(); return window.__v112.chamar(chave); });
  });
  const subtabsComErro = subtabsAmanda.filter(x => x.erro);
  const subtabsSemAbrir = subtabsAmanda.filter(x => x.id && (!x.painelExiste || x.display !== 'block'));
  verificar(subtabsAmanda.length >= 20, 'Amanda conserva o conjunto operacional de subabas permitidas', String(subtabsAmanda.length));
  verificar(subtabsComErro.length === 0,
    'todas as subabas permitidas da Amanda abrem sem exceção',
    subtabsComErro.map(x => `${x.chave}: ${x.erro}`).join(' | '));
  verificar(subtabsSemAbrir.length === 0,
    'cada subaba permitida ativa o painel correspondente',
    subtabsSemAbrir.map(x => `${x.chave}:${x.id}:${x.display||'vazio'}`).join(', '));

  const bloqueiosAmanda = await page.evaluate(() => {
    window.__v112.zerar();
    const avulsos=window.__v112.chamar('avulsos');
    window.__v112.zerar();
    const funil=window.__v112.chamar('funilNegocios');
    return {avulsos,funil,estado:window.__v112.estado()};
  });
  verificar(!bloqueiosAmanda.avulsos.erro && !bloqueiosAmanda.avulsos.painelExiste &&
    !(bloqueiosAmanda.avulsos.chamadas.renderClientesAvulsos||0),
    'chamada direta de Amanda para avulsos é bloqueada antes de DOM e renderer', JSON.stringify(bloqueiosAmanda.avulsos));
  verificar(!bloqueiosAmanda.funil.erro && !bloqueiosAmanda.funil.painelExiste &&
    !(bloqueiosAmanda.funil.chamadas.renderFunilNegocios||0),
    'chamada direta de Amanda para negocios é bloqueada antes de DOM e renderer', JSON.stringify(bloqueiosAmanda.funil));

  const chris = await page.evaluate(() => {
    window.__v112.trocar('Chris');
    const avulsos=window.__v112.chamar('avulsos');
    window.__v112.zerar();
    const funil=window.__v112.chamar('funilNegocios');
    window.__v112.zerar();
    const agora=window.__v112.chamar('agora');
    return {estado:window.__v112.estado(),avulsos,funil,agora};
  });
  verificar(chris.estado.avulsosExiste && chris.estado.funilExiste,
    'Chris recupera os dois painéis comerciais sem reload');
  verificar(!chris.avulsos.erro && !chris.funil.erro && !chris.agora.erro,
    'rotas representativas do Chris continuam funcionais', JSON.stringify(chris));

  const matriz = await page.evaluate(() => {
    const papeis=['Cecília','Gabrielle','Helo','João Victor','Nathan','Luís','Yas'];
    return papeis.map(pessoa=>{
      window.__v112.trocar(pessoa);
      const chamada=window.__v112.chamar('agora');
      const existe=id=>!!document.getElementById(id);
      return {
        pessoa,chamada,
        extras:existe('navExtras'),
        avulsos:existe('gerenciaAvulsos'),funil:existe('gerenciaFunilNegocios'),
        cadastro:[existe('navCadastro'),existe('view-cadastro')],
        campanhas:[existe('navAcompCampanhas'),existe('view-campanhas')],
        cofre:[existe('navCofreCecilia'),existe('view-cofreCecilia')],
        videos:[existe('navVideos'),existe('view-videos')],
        financeiro:[existe('view-mensalidades'),existe('view-financeiro'),existe('view-cobranca')]
      };
    });
  });
  const matrizRotaFalha = matriz.filter(x => x.chamada.erro || (x.chamada.chamadas.renderAgora||0));
  const matrizComercialPresente = matriz.filter(x => x.avulsos || x.funil);
  const paresDivergentes = matriz.filter(x =>
    x.cadastro[0] !== x.cadastro[1] || x.campanhas[0] !== x.campanhas[1] ||
    x.cofre[0] !== x.cofre[1] || x.videos[0] !== x.videos[1]
  );
  verificar(matrizRotaFalha.length === 0,
    'papéis fora da gerência são bloqueados antes do roteador e renderer', JSON.stringify(matrizRotaFalha));
  verificar(matrizComercialPresente.length === 0,
    'nenhum funcionário recebe painéis comerciais no DOM', JSON.stringify(matrizComercialPresente));
  verificar(matriz.every(x => x.extras === false),
    'navExtras não vaza para papéis sem autorização', JSON.stringify(matriz.filter(x => x.extras)));
  verificar(paresDivergentes.length === 0,
    'menus e views removíveis permanecem em pares coerentes nos demais papéis', JSON.stringify(paresDivergentes));
  verificar(matriz.every(x => x.financeiro.every(v => v === false)),
    'módulos financeiros continuam ausentes de todos os funcionários testados');

  await page.setViewportSize({ width:375, height:740 });
  const mobileAmanda = await page.evaluate(() => {
    window.__v112.trocar('Amanda');
    return window.__v112.chamar('agora');
  });
  verificar(!mobileAmanda.erro && mobileAmanda.display === 'block',
    'Amanda abre Agora também no viewport mobile', JSON.stringify(mobileAmanda));

  /* Duas abas independentes e reload real do mesmo documento. O harness entra
     no próprio data URL para que `reload()` reconstrua DOM, identidade e
     roteadores do zero, em vez de reutilizar estado injetado pelo teste. */
  const scriptRecarregavel = scriptAplicacao.replace(/<\/script/gi, '<\\/script');
  const htmlRecarregavel = html.replace('</body>', `<script>${scriptRecarregavel}</script></body>`);
  const urlHarness = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlRecarregavel);
  const abaUm = await navegador.newPage({ viewport:{ width:1280, height:850 } });
  const abaDois = await navegador.newPage({ viewport:{ width:1280, height:850 } });
  const errosAbas = [];
  abaUm.on('pageerror', erro => errosAbas.push('aba 1: ' + String(erro)));
  abaDois.on('pageerror', erro => errosAbas.push('aba 2: ' + String(erro)));
  await Promise.all([abaUm.goto(urlHarness), abaDois.goto(urlHarness)]);
  await Promise.all([abaUm, abaDois].map(aba => aba.evaluate(() => {
    window.__v112.trocar('Amanda');
    window.irParaPainelDeControle();
  })));
  await Promise.all([abaUm.waitForTimeout(500), abaDois.waitForTimeout(500)]);
  const estadosDuasAbas = await Promise.all([abaUm, abaDois].map(aba =>
    aba.evaluate(() => window.__v112.estado())
  ));
  verificar(estadosDuasAbas.every(estado => estado.viewAtiva && estado.agoraDisplay === 'block' &&
      (estado.chamadas.renderAgora||0) === 1),
    'duas abas abrem Painel de controle → Agora para Amanda de forma independente',
    JSON.stringify(estadosDuasAbas));

  await abaDois.reload();
  await abaDois.evaluate(() => {
    window.__v112.trocar('Amanda');
    window.irParaPainelDeControle();
  });
  await abaDois.waitForTimeout(500);
  const estadoPosReload = await abaDois.evaluate(() => window.__v112.estado());
  verificar(estadoPosReload.viewAtiva && estadoPosReload.agoraDisplay === 'block' &&
      (estadoPosReload.chamadas.renderAgora||0) === 1 && errosAbas.length === 0,
    'reload real reconstrói o perfil Amanda e mantém Painel de controle → Agora funcional',
    JSON.stringify({estadoPosReload,errosAbas}));

  const isolamentoAbaUm = await abaUm.evaluate(() => {
    window.__v112.trocar('Chris');
    return window.__v112.estado();
  });
  const isolamentoAbaDois = await abaDois.evaluate(() => window.__v112.estado());
  verificar(isolamentoAbaUm.pessoa === 'Chris' && isolamentoAbaDois.pessoa === 'Amanda' &&
      isolamentoAbaDois.agoraDisplay === 'block',
    'troca de papel numa aba não contamina a outra aba',
    JSON.stringify({isolamentoAbaUm,isolamentoAbaDois}));
  await Promise.all([abaUm.close(), abaDois.close()]);

  /* Callback antigo + view retirada por papel não pode lançar
     null.classList nem apagar a tela atual. Executa a função real. */
  const pageRouter=await navegador.newPage({viewport:{width:900,height:700}});
  const errosRouter=[];pageRouter.on('pageerror',erro=>errosRouter.push(String(erro)));
  await pageRouter.setContent('<button id="navInicio" class="navitem active">Início</button><div id="view-inicio" class="view active">INÍCIO</div>');
  const scriptRouter=[
    "let usuarioAtual='Amanda';let viewAtiva='inicio';",
    "window.__v112Router={toasts:[],renders:0};",
    "function mostrarToast(msg,tipo){window.__v112Router.toasts.push({msg,tipo});}",
    "function papelPodeAbrirVideos(){return true;}",
    "function papelPodeControlePostagem(){return true;}",
    "function papelPodeControleEditorialCalendarios(){return true;}",
    "function pararOuvinteCalendarioCampo(){}",
    "function registrarAtividadeUsuario(){}",
    "function pararCentralComando(){}",
    "function popularClientesCampanha(){window.__v112Router.renders++;}",
    "function renderCampanhasKanban(){window.__v112Router.renders++;}"
  ].join('\n')+'\n'+roteadorPrincipal;
  await pageRouter.addScriptTag({content:scriptRouter});
  const rotaAusente=await pageRouter.evaluate(()=>({
    retorno:irPara('campanhas',null),
    inicioAtivo:document.getElementById('view-inicio').classList.contains('active'),
    toasts:[...window.__v112Router.toasts]
  }));
  verificar(rotaAusente.retorno===false && rotaAusente.inicioAtivo &&
    rotaAusente.toasts.some(x=>/não está disponível para este perfil/i.test(x.msg)),
    'view ausente falha fechada, preserva a tela atual e explica o bloqueio',JSON.stringify(rotaAusente));
  const rotaRestaurada=await pageRouter.evaluate(()=>{
    const nav=document.createElement('button');nav.id='navCampanhas';nav.className='navitem';document.body.appendChild(nav);
    const view=document.createElement('div');view.id='view-campanhas';view.className='view';document.body.appendChild(view);
    irPara('campanhas',nav);
    return {viewAtiva:view.classList.contains('active'),navAtivo:nav.classList.contains('active'),renders:window.__v112Router.renders};
  });
  verificar(rotaRestaurada.viewAtiva&&rotaRestaurada.navAtivo&&rotaRestaurada.renders===2,
    'view restaurada abre normalmente pelo mesmo roteador',JSON.stringify(rotaRestaurada));
  const callbackAntigo=await pageRouter.evaluate(()=>{
    document.getElementById('view-inicio').classList.add('active');
    document.getElementById('view-campanhas').remove();
    const retorno=irPara('campanhas',document.getElementById('navCampanhas'));
    return {retorno,inicioAtivo:document.getElementById('view-inicio').classList.contains('active')};
  });
  verificar(callbackAntigo.retorno===false&&callbackAntigo.inicioAtivo&&errosRouter.length===0,
    'callback antigo após remoção do DOM não derruba a navegação',JSON.stringify({callbackAntigo,errosRouter}));
  await pageRouter.close();
  verificar(errosPagina.length === 0,
    'harness Chromium termina sem pageerror', errosPagina.join(' | '));
} finally {
  await navegador.close();
}

if(falhas.length){
  console.error(`\nREGRESSÃO V112 UI GERÊNCIA/AMANDA: FALHA REPRODUZIDA (${falhas.length}/${total})`);
  for(const falha of falhas) console.error(' - ' + falha.mensagem + (falha.detalhe ? ': ' + falha.detalhe : ''));
  process.exitCode = 1;
}else{
  console.log(`\nREGRESSÃO V112 UI GERÊNCIA/AMANDA: APROVADA (${total} verificações Chromium real)`);
}
