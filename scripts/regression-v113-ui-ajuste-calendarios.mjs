#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fonte=fs.readFileSync(path.join(raiz,'calendario.html'),'utf8');
const inicio=fonte.indexOf('function normalizarIdentidadeItemPedidoV113');
const fim=fonte.indexOf('async function avisarEquipeDaAprovacao',inicio);
if(inicio<0||fim<0) throw new Error('V113 UI: runtime do pedido não localizado');
const runtime=fonte.slice(inicio,fim);
const inicioRecuperacao=fonte.indexOf('let recuperacaoPedidoClienteEmCursoV113=false;');
const fimRecuperacao=fonte.indexOf('/* Esconde da visão do cliente',inicioRecuperacao);
if(inicioRecuperacao<0||fimRecuperacao<0) throw new Error('V113 UI: recuperação formal não localizada');
const runtimeRecuperacao=fonte.slice(inicioRecuperacao,fimRecuperacao);
let total=0;
const falhas=[];
function verificar(condicao,mensagem,detalhe=''){
  total++;
  if(condicao) console.log('PASS ',mensagem);
  else{falhas.push({mensagem,detalhe});console.error('FAIL ',mensagem+(detalhe?' — '+detalhe:''));}
}
const html=`<!doctype html><html><head><meta charset="utf-8"><style>
body{font:16px system-ui;background:#202124;color:#fff}.btn{min-height:44px;padding:10px 16px}
#estado{max-width:680px;white-space:pre-wrap}</style></head><body>
<textarea id="mObsCliente">Trocar a chamada final, por favor.</textarea>
<button id="btnEnviarObsCliente" class="btn">Enviar pedido de ajuste</button><div id="estado"></div>
<button id="btnRecuperar" class="btn">✏️ Já existe pedido do cliente? Reabrir formalmente</button>
</body></html>`;
function codigo({erro=false,legado=false}={}){return `
let editIdx=0;
let mesVisivel='2026-09';
let data={client:"Camargo's",month:'setembro de 2026',updatedAt:'antes',items:[{${legado?'':"itemId:'calitem-camargos-1',mes:'2026-09',"}day:8,name:'Conteúdo principal'}],comments:[]${legado?'':",aprovacaoMeses:{'2026-09':{status:'liberado',mes:'2026-09',por:'Amanda',em:'2026-08-20T11:00:00.000Z'}}"}};
window.__modoCal='cliente';window.__clienteId='camargos';window.__fbAuthUid='uid-cliente-v113';
window.__v113Estado={transacoes:0,gravacoes:[],mensagens:[],fechou:0,renderizou:0,erro:${erro?'true':'false'},avisoExiste:false};
function mesDoTexto(){return '2026-09';}
function mesDoItemNoCalendario(cal,item){return item?.mes||((cal?.month)?'2026-09':'');}
function aprovacaoCompativelNoCalendario(cal,mes){return cal?.aprovacaoMeses?.[mes]||null;}
function estadoPublicadoEfetivoCalendario(_mes,marca){return marca?.status||'';}
function mesHistoricoAnteriorAoControleNoCalendario(){return false;}
function docJaUsaMesesNoCalendario(cal){return ((cal?.items)||[]).some(item=>item?.mes)||!!cal?.aprovacaoMeses||!!cal?.mesLegado;}
function closeModal(){window.__v113Estado.fechou++;}
function renderAll_semSalvar(){window.__v113Estado.renderizou++;}
function renderMeta(){}
function renderAprovacaoInterna(){}
function avisarTela(msg,tipo){window.__v113Estado.mensagens.push({msg,tipo});document.getElementById('estado').textContent=msg;}
window.__fb={db:{},docRef:{path:'calendarios/camargos'},serverTimestamp(){return {servidor:true};},
  doc(_db,colecao,id){return {path:colecao+'/'+id};},
  async runTransaction(_db,executar){
    window.__v113Estado.transacoes++;
    if(window.__v113Estado.erro) throw Object.assign(new Error('negado'),{code:'permission-denied'});
    const tx={async get(ref){
      if(ref.path==='calendarios/camargos') return {exists:()=>true,data:()=>structuredClone(data)};
      return {exists:()=>window.__v113Estado.avisoExiste,data:()=>({})};
    },set(ref,dados,opcoes){window.__v113Estado.gravacoes.push({path:ref.path,dados,opcoes});}};
    return executar(tx);
  }};
${runtime}
document.getElementById('btnEnviarObsCliente').onclick=()=>window.enviarObsDoCliente();
window.__v113Teste={
  async duploClique(){await Promise.all([window.enviarObsDoCliente(),window.enviarObsDoCliente()]);return this.estado();},
  estado(){return {data:structuredClone(data),...structuredClone(window.__v113Estado),botao:document.getElementById('btnEnviarObsCliente').textContent};}
};`}

const navegador=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
async function cenario(nome,viewport,opcoes={}){
  const page=await navegador.newPage({viewport});
  const erros=[];page.on('pageerror',e=>erros.push(String(e)));
  await page.setContent(html);
  await page.addScriptTag({content:codigo(opcoes)});
  const resultado=await page.evaluate(()=>window.__v113Teste.duploClique());
  verificar(erros.length===0,`${nome}: zero pageerror`,erros.join(' | '));
  verificar(resultado.transacoes===1,`${nome}: clique duplo inicia uma única transação`,String(resultado.transacoes));
  if(opcoes.erro){
    verificar(resultado.gravacoes.length===0&&resultado.data.aprovacaoMeses['2026-09'].status==='liberado',`${nome}: permission-denied preserva estado e fica zero-write`);
    verificar(resultado.mensagens.at(-1)?.tipo==='erro'&&resultado.mensagens.at(-1)?.msg.includes('Nada foi reaberto'),`${nome}: falha não vira sucesso visual`);
  }else if(opcoes.legado){
    verificar(resultado.gravacoes.length===0,`${nome}: legado sem estado explícito não é associado por suposição`);
    verificar(resultado.mensagens.at(-1)?.msg.includes('reaberto pela equipe'),`${nome}: legado orienta recuperação humana`);
  }else{
    verificar(resultado.gravacoes.length===2,`${nome}: calendário e aviso são preparados juntos`,String(resultado.gravacoes.length));
    verificar(resultado.data.aprovacaoMeses['2026-09'].status==='ajuste_interno',`${nome}: confirmação libera edição da Gabi`);
    verificar(resultado.mensagens.at(-1)?.msg.includes('Pedido confirmado'),`${nome}: sucesso só aparece depois da confirmação`);
    verificar(resultado.botao==='Enviar pedido de ajuste',`${nome}: botão é restaurado após conclusão`);
  }
  await page.close();
}
await cenario('desktop',{width:1440,height:900});
await cenario('mobile',{width:390,height:844});
await cenario('desktop permission-denied',{width:1440,height:900},{erro:true});
await cenario('mobile legado',{width:390,height:844},{legado:true});

{
  const page=await navegador.newPage({viewport:{width:1440,height:900}});
  const erros=[];page.on('pageerror',e=>erros.push(String(e)));
  await page.setContent(html);
  await page.addScriptTag({content:`
let mesVisivel='2026-09';
let data={client:"Camargo's",month:'setembro de 2026',updatedAt:'antes',items:[{itemId:'calitem-camargos-1',mes:'2026-09',day:8,name:'Conteúdo principal'}],comments:[],aprovacaoMeses:{'2026-09':{status:'liberado',mes:'2026-09',por:'Amanda',em:'2026-08-20T11:00:00.000Z'}}};
let ultimaAssinaturaSalva='';let temNaoSalvo=false;let bloqueadoPorConflito=false;
window.__modoCal='equipe';window.__clienteId='camargos';window.__papelCalendarioEquipe='Gabrielle';
window.prompt=()=> 'Trocar a chamada final solicitada pelo cliente';window.confirm=()=>true;
window.__v113Rec={transacoes:0,gravacoes:[],mensagens:[],renderizou:0};
function mesDoTexto(){return '2026-09';}
function estadoDoMes(mes){return data.aprovacaoMeses?.[mes]?.status||'';}
function aprovacaoCompativelNoCalendario(cal,mes){return cal?.aprovacaoMeses?.[mes]||null;}
function estadoPublicadoEfetivoCalendario(_mes,marca){return marca?.status||'';}
function mesHistoricoAnteriorAoControleNoCalendario(){return false;}
function docJaUsaMesesNoCalendario(){return true;}
function assinaturaCalendario(){return 'assinatura';}function limparRascunho(){}
function renderAll_semSalvar(){window.__v113Rec.renderizou++;}function renderMeta(){}function renderAprovacaoInterna(){}
function avisarTela(msg,tipo){window.__v113Rec.mensagens.push({msg,tipo});document.getElementById('estado').textContent=msg;}
window.__fb={db:{},docRef:{path:'calendarios/camargos'},async runTransaction(_db,executar){
  window.__v113Rec.transacoes++;
  const tx={async get(){return {exists:()=>true,data:()=>structuredClone(data)};},set(ref,dados,opcoes){window.__v113Rec.gravacoes.push({path:ref.path,dados,opcoes});}};
  return executar(tx);
}};
${runtime}
${runtimeRecuperacao}
window.__v113RecTeste=async()=>{
  const btn=document.getElementById('btnRecuperar');
  await Promise.all([window.reabrirCalendarioPorPedidoClienteV113(btn),window.reabrirCalendarioPorPedidoClienteV113(btn)]);
  return {data:structuredClone(data),...structuredClone(window.__v113Rec),botao:btn.textContent,desabilitado:btn.disabled};
};
`});
  const resultado=await page.evaluate(()=>window.__v113RecTeste());
  verificar(erros.length===0,'desktop recuperação Camargo: zero pageerror',erros.join(' | '));
  verificar(resultado.transacoes===1,'desktop recuperação Camargo: clique duplo inicia uma única transação',String(resultado.transacoes));
  verificar(resultado.gravacoes.length===1,'desktop recuperação Camargo: grava somente o calendário',String(resultado.gravacoes.length));
  verificar(resultado.data.aprovacaoMeses['2026-09'].status==='ajuste_interno','desktop recuperação Camargo: mês antigo é liberado para a Gabi');
  verificar(resultado.mensagens.at(-1)?.msg.includes('Gabi já pode editar'),'desktop recuperação Camargo: confirmação visual é objetiva');
  verificar(resultado.botao.includes('Reabrir formalmente')&&resultado.desabilitado===false,'desktop recuperação Camargo: botão volta ao estado utilizável');
  await page.close();
}
await navegador.close();
console.log(`V113 UI: ${total-falhas.length}/${total} verificações aprovadas.`);
if(falhas.length){for(const f of falhas) console.error(' - '+f.mensagem+(f.detalhe?': '+f.detalhe:''));process.exitCode=1;}
