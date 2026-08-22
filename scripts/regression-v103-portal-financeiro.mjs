#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
let total=0;
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('V103 PORTAL FINANCEIRO: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(inicio,fim){
  const a=portal.indexOf(inicio),b=portal.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('V103 PORTAL FINANCEIRO: trecho ausente '+inicio);
  return portal.slice(a,b);
}

exigir(portal.includes('<meta name="gs-build" content="2026-08-19-calendarios-stories-v91">')&&
  portal.includes('<meta name="gs-patch" content="2026-08-21-portal-financeiro-v103">'),
  'base publicada V91 e patch isolado V103 do Portal permanecem identificáveis');

const helpers=trecho('  function statusPagamentoPortal','  async function dadosPagamentoCliente');
const contextoHelpers={MESES:['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']};
vm.createContext(contextoHelpers);
vm.runInContext(helpers+`
  this.api={statusPagamentoPortal,competenciaPagamentoPortal,valorPagamentoPortal,
    rotuloCompetenciaPagamentoPortal,prepararPagamentosPortal};`,contextoHelpers);
const api=contextoHelpers.api;

for(const [registro,esperado] of [
  [{status:'aberto'},'aberto'],[{status:'pendente'},'aberto'],[{status:'pago'},'pago'],
  [{status:'cortesia'},'isento'],[{status:'cancelado'},'cancelado'],
  [{status:'EXCLUÍDO'},'excluido'],[{status:'encerrada'},'encerrado'],
  [{status:'aberto',cancelado:true},'cancelado'],[{status:'aberto',excluido:true},'excluido'],
  [{status:'aberto',encerrado:true},'encerrado'],[{status:'estado_novo'},'indisponivel'],
  [{},'indisponivel']
]) exigir(api.statusPagamentoPortal(registro)===esperado,
  `estado ${JSON.stringify(registro)} normaliza para ${esperado}`);

exigir(api.valorPagamentoPortal({valorCobrado:1000,valor:2000,valorDevido:3000})===null,
  'campos monetários divergentes falham fechados');
exigir(api.valorPagamentoPortal({valor:1100,valorDevido:3000})===null,
  'valor legado divergente não vence silenciosamente valorDevido');
exigir(api.valorPagamentoPortal({valorCobrado:900,valor:900,valorDevido:900})===900,
  'campos monetários equivalentes convergem para um valor');
exigir(api.valorPagamentoPortal({valorDevido:900})===900,
  'valorDevido permanece compatível sem consultar o contrato');
exigir(api.valorPagamentoPortal({valorCobrado:0})===0&&api.valorPagamentoPortal({valorCobrado:'inválido'})===null,
  'zero explícito é válido e valor inválido falha fechado');
exigir(api.competenciaPagamentoPortal({competencia:'2026-09'})==='2026-09'&&
  api.competenciaPagamentoPortal({competencia:'09/2026'})==='',
  'competência vem do pagamento e exige AAAA-MM');
exigir(api.rotuloCompetenciaPagamentoPortal('2026-09')==='setembro de 2026',
  'competência recebe rótulo humano sem mudar sua identidade');

const matriz=[
  {id:'out',competencia:'2026-10',valor:1100,status:'aberto'},
  {id:'jul-cancelado',competencia:'2026-07',valor:800,status:'cancelado'},
  {id:'set',competencia:'2026-09',valorCobrado:1000,status:'aberto'},
  {id:'ago-pago',competencia:'2026-08',valorDevido:900,status:'pago'},
  {id:'jun-excluido',competencia:'2026-06',valor:700,status:'aberto',excluido:true},
  {id:'mai-encerrado',competencia:'2026-05',valor:600,status:'encerrado'},
  {id:'sem-estado',competencia:'2026-11',valor:1200},
  {id:'sem-competencia',valor:1300,status:'aberto'}
];
const preparado=api.prepararPagamentosPortal(matriz);
exigir(preparado.abertos.map(p=>p.id).join(',')==='set,out',
  'abertos ficam em ordem cronológica pela competência mensal');
exigir(!preparado.abertos.some(p=>['jul-cancelado','jun-excluido','mai-encerrado'].includes(p.id)),
  'cancelado, excluído e encerrado nunca entram na fila aberta');
exigir(preparado.historico.map(p=>p.id).join(',')==='ago-pago,jul-cancelado,jun-excluido,mai-encerrado',
  'histórico terminal fica em ordem decrescente por competência');
exigir(preparado.indisponiveis.map(p=>p.id).sort().join(',')==='sem-competencia,sem-estado',
  'estado ou competência ausente vira indisponível, não vazio nem aberto');

const leitura=trecho('  async function dadosPagamentoCliente','  function diasParaVencer');
exigir(leitura.includes("doc(db,'contratos_cliente', clienteAtual.slug)")&&
  leitura.includes("meusDocs('pagamentos_mensais')"),
  'leituras permanecem limitadas à identidade autenticada do Portal');
const meusDocs=trecho('  function meusDocs','  function comTimeoutPortal');
exigir(meusDocs.includes("where(campo || 'cliente', '==', clienteAtual.slug)"),
  'query mensal não lista pagamentos de outros clientes');

const render=trecho('  async function carregarPagamentoCliente','  /* Faixa suave no topo do portal');
const lembrete=trecho('  async function mostrarLembretePagamento','  window.responderProposta');
for(const [nome,codigo] of [['render',render],['lembrete',lembrete],['helpers',helpers]]){
  exigir(!/\b(?:setDoc|addDoc|updateDoc|deleteDoc|runTransaction)\s*\(/.test(codigo),
    `${nome} financeiro não introduz escrita`);
}
exigir(!render.includes('contrato.valorVigente')&&!render.includes('contrato.valorCheio'),
  'render financeiro não exibe valor atual do contrato como valor histórico');
exigir(render.includes('atual.__valorPortal')&&render.includes('atual.__competenciaPortal'),
  'cartão de pagamento usa projeção do documento mensal');

function escaparHtml(valor){return String(valor??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escaparAtributo(valor){return escaparHtml(valor).replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function criarContextoRender(fonte){
  const painel={innerHTML:''};
  const erros=[];
  const ctx={
    prepararPagamentosPortal:api.prepararPagamentosPortal,
    rotuloCompetenciaPagamentoPortal:api.rotuloCompetenciaPagamentoPortal,
    dadosPagamentoCliente:async()=>fonte(),
    diasParaVencer:()=>5,
    esc:escaparHtml,escAttr:escaparAtributo,
    formatarDataBR:v=>String(v||'').slice(0,10).split('-').reverse().join('/'),
    brlPortal:v=>'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
    PIX_GET:{chave:'00.000.000/0000-00',tipo:'CNPJ',banco:'Banco sintético',titular:'Titular sintético'},
    document:{getElementById:id=>id==='painelPagamento'?painel:null},
    console:{error:(...args)=>erros.push(args),log:()=>{}},
    window:{}
  };
  vm.createContext(ctx); vm.runInContext(render+'\nthis.executar=carregarPagamentoCliente;',ctx);
  return {ctx,painel,erros};
}

{
  const lab=criarContextoRender(()=>({
    contrato:{plano:'Plano sintético',valorVigente:9999,diaVencimento:10},
    pagamentos:matriz.filter(p=>!['sem-estado','sem-competencia'].includes(p.id))
  }));
  await lab.ctx.executar();
  exigir(lab.painel.innerHTML.includes('R$ 1.000,00')&&!lab.painel.innerHTML.includes('R$ 9.999,00'),
    'UI real extraída mostra setembro pelo valor mensal e não pelo contrato vigente');
  exigir(lab.painel.innerHTML.includes('setembro de 2026')&&lab.painel.innerHTML.includes('Histórico por competência'),
    'UI real rotula competência e separa histórico ordenado');
  exigir(lab.painel.innerHTML.includes('Cancelado')&&lab.painel.innerHTML.includes('Arquivado')&&lab.painel.innerHTML.includes('Encerrado'),
    'estados terminais aparecem somente como histórico sem virar cobrança');
  exigir((lab.painel.innerHTML.match(/Enviar comprovante/g)||[]).length===1,
    'somente a competência aberta mais antiga recebe a ação de comprovante');
}

{
  const lab=criarContextoRender(()=>({contrato:null,pagamentos:[]}));
  await lab.ctx.executar();
  exigir(lab.painel.innerHTML.includes('Nenhuma cobrança mensal foi registrada')&&
    !lab.painel.innerHTML.includes('temporariamente indisponível'),
    'vazio legítimo é informado como vazio, sem inventar erro');
}

{
  const lab=criarContextoRender(()=>{throw Object.assign(new Error('falha sintética'),{code:'permission-denied'});});
  await lab.ctx.executar();
  exigir(lab.painel.innerHTML.includes('Financeiro temporariamente indisponível')&&
    !lab.painel.innerHTML.includes('Nenhuma cobrança mensal foi registrada'),
    'permission-denied/erro de leitura não vira vazio financeiro');
}

{
  const lab=criarContextoRender(()=>({contrato:{valorVigente:9999},pagamentos:[{id:'desconhecido',competencia:'2026-09',valor:1000,status:'novo_estado'}]}));
  await lab.ctx.executar();
  exigir(lab.painel.innerHTML.includes('Parte do financeiro está indisponível')&&
    !lab.painel.innerHTML.includes('Copiar chave PIX'),
    'estado mensal desconhecido falha fechado sem oferecer pagamento');
}

async function executarLembrete(pagamentos){
  let inserido=null,criados=0;
  const ctx={
    dadosPagamentoCliente:async()=>({contrato:{valorVigente:9999},pagamentos}),
    prepararPagamentosPortal:api.prepararPagamentosPortal,
    diasParaVencer:()=>0,
    brlPortal:v=>'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
    rotuloCompetenciaPagamentoPortal:api.rotuloCompetenciaPagamentoPortal,
    setTab:()=>{},console:{error:()=>{}},
    document:{
      createElement:()=>{criados++;return {style:{},children:[],appendChild(v){this.children.push(v);},addEventListener(){},textContent:''};},
      querySelector:seletor=>seletor==='.tabs'?{parentElement:{insertBefore:v=>{inserido=v;}}}:null
    },window:{}
  };
  vm.createContext(ctx); vm.runInContext(lembrete+'\nthis.executar=mostrarLembretePagamento;',ctx);
  await ctx.executar();
  return {inserido,criados};
}

const semLembrete=await executarLembrete([
  {id:'c',competencia:'2026-09',valor:1000,status:'cancelado'},
  {id:'x',competencia:'2026-10',valor:1100,status:'aberto',excluido:true},
  {id:'e',competencia:'2026-11',valor:1200,status:'encerrado'}
]);
exigir(semLembrete.inserido===null&&semLembrete.criados===0,
  'cancelado, excluído e encerrado não geram faixa de cobrança');

const comLembrete=await executarLembrete([{id:'a',competencia:'2026-09',valorCobrado:1000,status:'aberto'}]);
exigir(comLembrete.inserido?.children?.[0]?.textContent.includes('R$ 1.000,00')&&
  comLembrete.inserido.children[0].textContent.includes('setembro de 2026')&&
  !comLembrete.inserido.children[0].textContent.includes('9.999'),
  'lembrete usa valor e competência da mensalidade, nunca valor do contrato');

const modulos=[...portal.matchAll(/<script\s+type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
exigir(modulos.length===1,'Portal mantém um único módulo operacional');
modulos.forEach((codigo,i)=>new vm.SourceTextModule(codigo,{identifier:'portal-v103-'+i}));
exigir(true,'módulo completo do Portal passa no parser JavaScript');

console.log(`REGRESSÃO V103 PORTAL FINANCEIRO: OK (${total} verificações)`);
