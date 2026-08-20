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
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('V92 UI contrato incompleto: '+mensagem); console.log('PASS ',mensagem); }
function trecho(inicio,fim){ const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return fonte.slice(a,b); }

const blocoReparo=trecho("const PLANOS_CONTRATO =",'/* Dados da planilha');
const blocoRender=trecho('window.renderContratos = async function','/* ===== CLIENTES AVULSOS');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});

async function executar(viewport){
  const page=await browser.newPage({viewport});
  try{
    await page.setContent('<!doctype html><html><head><style>body{background:#111;color:#fff;font-family:Arial;margin:0;padding:12px}.card,.faixaDem{border:1px solid #555;border-radius:10px;padding:12px;margin:10px 0}.faixaItens{display:none}.faixaDem.aberta .faixaItens{display:block}.row2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.field{min-width:0}.field input,.field select,.field textarea{box-sizing:border-box;width:100%;padding:9px}.btn{padding:10px;border:0;border-radius:8px;background:#ffbe16}.painelResumo{display:flex;gap:8px;flex-wrap:wrap}.resumoCard{padding:8px;border:1px solid #555}@media(max-width:600px){.row2{grid-template-columns:1fr}}</style></head><body><div id="entradaClientesBox" hidden></div><div id="contratosBox"></div></body></html>');
    await page.addScriptTag({content:`
      window.usuarioAtual='Amanda'; window.db={}; window.__toasts=[]; window.__banco=new Map([
        ['clientes_config/iphone-campo-largo',{tipoCliente:'mensalista',clienteInativo:false,semConteudoRecorrente:true,motivoSemConteudo:'saiu da carteira'}],
        ['clientes_extras/iphone-campo-largo',{slug:'iphone-campo-largo',nome:'iPhone Campo Largo',excluido:false}],
        ['clientes_acesso/iphone-campo-largo',{token:'preservado',ativo:true}]
      ]);
      window.esc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); window.escAttr=esc; window.escJs=v=>String(v??'').replace(/'/g,"\\\\'");
      window.slugClienteCanonico=v=>String(v||''); window.competenciaFinanceiraValida=v=>/^\\d{4}-(0[1-9]|1[0-2])$/.test(String(v));
      window.hojeLocal=()=> '2026-08-19'; window.competenciaSeguinte=()=> '2026-09'; window.valorContratoNaCompetencia=c=>Number(c?.valorVigente||c?.valorCheio||0);
      window.contratoOperacionalAtivo=c=>!['pausado','encerrado'].includes(String(c?.status||'')); window.contratosOperacionaisCanonicos=l=>l.filter(contratoOperacionalAtivo);
      window.brl=v=>'R$ '+Number(v||0).toFixed(2).replace('.',','); window.nomeMes=v=>String(v); window.rotuloMesExtras=v=>String(v);
      window.clienteInativoEfetivo=v=>v?.clienteInativo===true; window.statusMensalidadeCanonico=v=>['pago','cancelado','isento'].includes(v?.status)?v.status:'aberto';
      window.ajusteCortesiaMensalidade=(p,mes,permanente,meses)=>permanente||meses.includes(mes)?{status:'isento',cortesiaPermanente:permanente,cortesiaDoMes:!permanente,motivoIsencao:permanente?'cortesia permanente':'cortesia combinada para este mês'}:null;
      window.collection=(_db,nome)=>nome; window.doc=(_db,col,id)=>({path:col+'/'+id}); window.serverTimestamp=()=>({server:true});
      window.deleteField=()=>({__deleteField:true});
      window.__snap=valor=>({exists:()=>valor!==undefined,data:()=>valor});
      window.getDoc=async ref=>__snap(__banco.get(ref.path));
      window.getDocs=async nome=>({forEach(fn){ if(nome==='contratos_cliente') for(const [chave,valor] of __banco){ if(chave.startsWith('contratos_cliente/')) fn({id:chave.split('/')[1],data:()=>valor}); } }});
      window.__validarReferenciasFirestore=refs=>refs.filter(Boolean);
      window.runTransaction=async(_db,fn)=>{ const ops=[]; const tx={get:async ref=>__snap(__banco.get(ref.path)),set:(ref,dados,opt)=>ops.push({ref,dados,merge:opt?.merge===true})}; await fn(tx); for(const op of ops){const atual=op.merge?{...(__banco.get(op.ref.path)||{})}:{};for(const [chave,valor] of Object.entries(op.dados)){if(valor?.__deleteField) delete atual[chave]; else atual[chave]=valor;}__banco.set(op.ref.path,atual);} };
      window.mostrarToast=(msg,tipo)=>__toasts.push({msg,tipo}); window.limparCacheDeClientes=()=>{}; window.limparCacheIndicadores=()=>{};
      window.renderCentralEntradaClientes=async()=>[{tipo:'mensalista',slug:'iphone-campo-largo',nome:'iPhone Campo Largo',plano:'Básico',planoDetalhes:'',valorMensal:0,diaVencimento:0,primeiraCompetencia:'',cortesiaPermanente:false,cortesiaMeses:[],observacoes:'',extraId:'iphone-campo-largo'}];
      window.toggleFaixaDemandas=el=>el.closest('.faixaDem')?.classList.toggle('aberta');
      ${blocoReparo}
      ${blocoRender}
    `});
    await page.evaluate(()=>renderContratos());
    await page.waitForFunction(()=>document.querySelector('#contratosBox')?.textContent.includes('ESTRUTURA FINANCEIRA INCOMPLETA'));
    let texto=await page.locator('#contratosBox').innerText();
    exigir(texto.includes('iPhone Campo Largo')&&texto.includes('sem contrato'),'interface identifica o mensalista real e explica a lacuna');
    await page.locator('[data-faixa="ct_iphone-campo-largo"] .faixaHead').click();
    await page.locator('#ctValorCheio_iphone-campo-largo').fill('800');
    await page.locator('#ctDia_iphone-campo-largo').fill('15');
    await page.locator('#ctPrimeiraCompetencia_iphone-campo-largo').fill('2026-09');
    await page.locator('#ctCortesiaMeses_iphone-campo-largo').fill('');
    const botao=page.locator('#btnCompletarContrato_iphone-campo-largo');
    exigir(await botao.isVisible()&&await botao.isEnabled(),'botão real fica visível e clicável para Amanda');
    const caixa=await botao.boundingBox();
    exigir(!!caixa&&caixa.x>=0&&caixa.x+caixa.width<=viewport.width+1,'ação permanece dentro da tela no viewport testado');
    await botao.click();
    exigir(await page.evaluate(()=>!__banco.has('contratos_cliente/iphone-campo-largo')&&!__banco.has('pagamentos_mensais/iphone-campo-largo_2026-09')),
      'clique sem confirmação humana não cria contrato nem mensalidade');
    exigir(await page.evaluate(()=>__toasts.some(t=>/Confirme que esta identidade/.test(t.msg))),
      'interface explica por que a ação foi bloqueada');
    await page.locator('#ctConfirmarMensalista_iphone-campo-largo').check();
    await botao.click();
    await page.waitForFunction(()=>window.__banco.has('contratos_cliente/iphone-campo-largo')&&window.__banco.has('pagamentos_mensais/iphone-campo-largo_2026-09'));
    const observado=await page.evaluate(()=>({contrato:__banco.get('contratos_cliente/iphone-campo-largo'),mensalidade:__banco.get('pagamentos_mensais/iphone-campo-largo_2026-09'),config:__banco.get('clientes_config/iphone-campo-largo'),acesso:__banco.get('clientes_acesso/iphone-campo-largo'),toasts:__toasts}));
    exigir(observado.contrato.valorVigente===800&&observado.contrato.diaVencimento===15&&observado.contrato.primeiraCompetencia==='2026-09','clique real grava R$ 800, vencimento dia 15 e primeira cobrança em setembro');
    exigir(observado.mensalidade.valorDevido===800&&observado.mensalidade.competencia==='2026-09'&&observado.mensalidade.status==='aberto','primeira mensalidade real nasce em setembro, sem cortesia indevida');
    exigir(observado.config.semConteudoRecorrente===false&&!Object.hasOwn(observado.config,'motivoSemConteudo'),'mesma transação remove a marca antiga de fora da carteira recorrente');
    exigir(observado.acesso.token==='preservado'&&observado.acesso.ativo===true,'clique real preserva o acesso existente do Portal');
    exigir(observado.toasts.some(t=>/Estrutura financeira.*confirmada/.test(t.msg)),'interface só confirma sucesso depois dos recibos');
  } finally { await page.close(); }
}

try{
  await executar({width:1180,height:820});
  await executar({width:390,height:844});
} finally { await browser.close(); }

console.log(`REGRESSÃO V92 UI CONTRATO INCOMPLETO: APROVADA (${total} verificações com cliques reais)`);
