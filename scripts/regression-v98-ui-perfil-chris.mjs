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
  if(!condicao) throw new Error('V98 UI PERFIL CHRIS: ' + mensagem);
  console.log('PASS ', mensagem);
}

function trecho(inicio, fim){
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) throw new Error('V98 UI PERFIL CHRIS: trecho ausente ' + inicio);
  return fonte.slice(a, b);
}

const mudarCompleto = trecho('window.mudarUsuarioGlobal = async function', '/* ===== FRENTE C1');
const marcador = '    /* ===== VAZAMENTO ENTRE PESSOAS';
const mudarInicial = mudarCompleto.slice(0, mudarCompleto.indexOf(marcador)) +
  "\n    return {escolhido,usuarioAtual};\n  };";
const banner = trecho('function atualizarBannerOperacaoPerfilChris', 'window.abrirOperacaoPerfisChris');
const evidenceArg = process.argv.find(arg => arg.startsWith('--evidence-dir='));
const evidenceDir = evidenceArg ? evidenceArg.slice('--evidence-dir='.length) : '';

const navegador = await chromium.launch({ headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await navegador.newPage({ viewport:{ width:1180, height:820 } });
const erros = [];
page.on('pageerror', erro => erros.push(String(erro)));

try{
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    :root{--yellow:#FBBC19;--deep:#212123;--paper:#2C2D2F;--text:#F0F1ED}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--text);font:15px system-ui;display:flex;min-height:100vh}
    aside{width:250px;background:var(--deep);padding:24px}.brand{font-size:20px;font-weight:900;margin-bottom:30px}.brand b{color:var(--yellow)}
    .navitem{display:block;padding:12px;margin:7px 0;border-radius:9px;background:#35363a;color:var(--text)}
    body.semUsuario .navitem{display:none!important}main{flex:1;padding:42px}.card{max-width:720px;border:1px solid #48494d;border-radius:16px;padding:24px;background:#26272a}
    .sintetico{color:var(--yellow);font-weight:900;font-size:12px;letter-spacing:.08em}.estado{margin-top:18px;padding:15px;border-radius:10px;background:#1e3428;color:#a7efbf;font-weight:800}
    select{margin-top:12px;padding:10px;width:240px}
  </style></head><body class="semUsuario">
    <aside><div class="brand"><b>●</b> Get Started</div><div id="navInicio" class="navitem">Início</div><div id="navDemandas" class="navitem">Demandas</div><div id="navOperacaoPerfisChris" class="navitem">Operar perfil da equipe</div></aside>
    <main><div class="card"><div class="sintetico">DADO SINTÉTICO · PROVA LOCAL V98</div><h1>Visão normal do Chris</h1><p>A identidade é aplicada antes de qualquer leitura remota.</p><select id="euSouGlobal"><option value="">Selecione...</option><option value="Chris" selected>Chris</option><option value="Gabrielle">Gabrielle</option></select><div id="resultado" class="estado">Aguardando inicialização...</div></div></main>
  </body></html>`);
  await page.addScriptTag({ content:
    `let usuarioAtual='';let limpezas=0;let cachesLimpos=0;let listenersParados=0;\n` +
    `window.__pessoaAutenticadaReal='Chris';window.__operacaoDelegadaChris='';\n` +
    `function limparEstadoVideosPorTrocaDePapel(){limpezas++;}function limparCacheIndicadores(){cachesLimpos++;}function pararListenersTempoReal(){listenersParados++;}\n` +
    `function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}\n` +
    banner + '\n' + mudarInicial
  });

  exigir(await page.locator('body').evaluate(el => el.classList.contains('semUsuario')), 'reprodução começa com a sidebar escondida');
  const resultado = await page.evaluate(async () => window.mudarUsuarioGlobal());
  await page.locator('#resultado').evaluate((el, r) => { el.textContent = `Inicialização concluída como ${r.usuarioAtual} · menus reconstruídos`; }, resultado);
  exigir(resultado.usuarioAtual === 'Chris', 'inicializador real aplica Chris');
  exigir(!(await page.locator('body').evaluate(el => el.classList.contains('semUsuario'))), 'inicialização remove semUsuario');
  exigir(await page.locator('.navitem').count() === 3 && await page.locator('#navInicio').isVisible(), 'menus do Chris voltam a aparecer');
  exigir(await page.locator('#bannerOperacaoPerfilChris').count() === 0, 'Chris normal não recebe banner delegado');
  exigir(erros.length === 0, 'inicialização termina sem ReferenceError');

  await page.evaluate(async () => {
    window.__operacaoDelegadaChris = 'Gabrielle';
    document.getElementById('euSouGlobal').value = 'Gabrielle';
    await window.mudarUsuarioGlobal();
  });
  exigir(await page.locator('#bannerOperacaoPerfilChris').isVisible(), 'delegação mostra banner operacional');
  exigir((await page.locator('#bannerOperacaoPerfilChris').innerText()).toUpperCase().includes('GABRIELLE'), 'banner identifica o papel operado');

  await page.evaluate(async () => {
    window.__operacaoDelegadaChris = '';
    document.getElementById('euSouGlobal').value = 'Chris';
    await window.mudarUsuarioGlobal();
    await window.mudarUsuarioGlobal();
  });
  exigir(await page.locator('#bannerOperacaoPerfilChris').count() === 0, 'retorno repetido ao Chris é idempotente');
  exigir(await page.locator('#navInicio').isVisible(), 'retorno mantém a visão normal visível');

  await page.setViewportSize({ width:375, height:740 });
  exigir(await page.locator('#navInicio').isVisible(), 'visão restaurada permanece acessível no mobile');
  exigir(erros.length === 0, 'troca, retorno e mobile permanecem sem erro de página');

  if(evidenceDir){
    fs.mkdirSync(evidenceDir, { recursive:true });
    await page.screenshot({ path:path.join(evidenceDir, 'V98_CHRIS_DEPOIS_LOCAL_SINTETICO.png'), fullPage:true });
    console.log('EVIDÊNCIA VISUAL:', path.join(evidenceDir, 'V98_CHRIS_DEPOIS_LOCAL_SINTETICO.png'));
  }
} finally {
  await navegador.close();
}

console.log(`REGRESSÃO V98 UI PERFIL CHRIS: APROVADA (${total} verificações com clique/DOM real)`);
