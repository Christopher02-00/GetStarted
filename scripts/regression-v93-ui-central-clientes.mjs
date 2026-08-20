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
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('V93 UI Central: '+mensagem); console.log('PASS ',mensagem); }
function trecho(inicio,fim){ const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return fonte.slice(a,b); }

const renderer=trecho('      const itemAtivo=v=>{','      const arquivadosDeOrigem=[')
  .replace('      const itemAtivo=v=>{','      window.itemAtivo=v=>{');

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
async function executar(viewport){
  const page=await browser.newPage({viewport});
  try{
    await page.setContent('<!doctype html><html><head><style>.card{border:1px solid #777;padding:12px}.btnrow{display:flex;gap:8px;flex-wrap:wrap}.btn{padding:9px}.meta{font-size:12px}</style></head><body><section id="mensal"></section><section id="ikn"></section><section id="legado"></section></body></html>');
    await page.addScriptTag({content:`
      window.__acoes=[];
      window.competenciaFinanceiraValida=()=>true; window.brl=v=>'R$ '+Number(v||0).toFixed(2);
      window.esc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
      window.escJs=v=>String(v??'').replace(/'/g,"\\\\'"); window.formatarDataBR=v=>String(v||'');
      window.nomeClienteCanonico=(_slug,nome)=>String(nome||''); window.ehClienteSoEdicao=()=>false;
      window.abrirPortalClienteCentral=s=>__acoes.push('portal:'+s); window.copiarPortalClienteCentral=s=>__acoes.push('copiar:'+s);
      window.garantirPortalClienteCentral=s=>__acoes.push('criar-portal:'+s); window.abrirCalendarioDeCliente=s=>__acoes.push('calendario:'+s);
      window.abrirOnboardingCentral=()=>{}; window.navegarGerenciaSub=()=>{}; window.editarClienteAtivoCentral=()=>{};
      window.abrirSaidaClienteCentral=s=>__acoes.push('saida:'+s); window.repararIdentidadeClienteCentral=()=>{};
      window.finalizarLeadAvulso=id=>__acoes.push('finalizar:'+id);
      ${renderer}
      const base={instagram:'',aniversario:'',contatos:'',plano:'Básico',planoDetalhes:'',valorMensal:800,diaVencimento:15,primeiraCompetencia:'2026-09',ultimaCompetenciaPagamento:'',tipoEntrega:'postagem_completa',incluiStories:false,cortesiaPermanente:false,cortesiaMeses:[],onboardingStatus:'concluido',observacoes:'',saida:null,identidadeDivergente:false};
      document.querySelector('#mensal').innerHTML=itemAtivo({...base,tipo:'mensalista',slug:'iphone-campo-largo',nome:'iPhone Campo Largo',token:'vigente'});
      document.querySelector('#ikn').innerHTML=itemAtivo({...base,tipo:'avulso',slug:'ikn-brasil',nome:'IKN Brasil',token:'',leadColecao:'leads_avulsos',leadId:'lead-ikn'});
      document.querySelector('#legado').innerHTML=itemAtivo({...base,tipo:'avulso',slug:'projeto-legado',nome:'Projeto legado',token:''});
    `});
    exigir(await page.locator('#mensal button',{hasText:'Abrir Portal'}).count()===1,'mensalista mantém Portal');
    exigir(await page.locator('#mensal button',{hasText:'Calendário'}).count()===1,'mensalista recorrente mantém Calendário');
    exigir(await page.locator('#mensal button',{hasText:'Programar saída'}).count()===1,'mensalista mantém saída contratual');
    exigir(await page.locator('#ikn button',{hasText:'Abrir Portal'}).count()===0,'IKN avulso não recebe Portal');
    exigir(await page.locator('#ikn button',{hasText:'Calendário'}).count()===0,'IKN avulso não recebe Calendário');
    exigir(await page.locator('#ikn button',{hasText:'Programar saída'}).count()===0,'IKN avulso não recebe saída de mensalista');
    const finalizar=page.locator('#ikn button',{hasText:'Finalizar projeto e arquivar'});
    exigir(await finalizar.count()===1&&await finalizar.isVisible(),'IKN recebe apenas finalização de projeto');
    await finalizar.click();
    exigir(await page.evaluate(()=>window.__acoes.includes('finalizar:lead-ikn')),'clique real de IKN aciona a finalização do lead correto');
    const legado=await page.locator('#legado').innerText();
    exigir(legado.includes('Projeto pontual: não possui Portal nem saída mensalista.'),'avulso legado explica o estado sem inventar ação');
    exigir(await page.locator('#legado button').count()===2,'avulso legado preserva somente ficha operacional e edição cadastral');
  } finally { await page.close(); }
}

try{
  await executar({width:1180,height:820});
  await executar({width:390,height:844});
} finally { await browser.close(); }
console.log(`REGRESSÃO V93 UI CENTRAL: APROVADA (${total} verificações com cliques reais)`);
