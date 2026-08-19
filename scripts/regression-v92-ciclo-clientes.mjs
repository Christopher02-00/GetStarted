#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('FALHOU: '+mensagem); console.log('PASS ',mensagem); }
function trecho(inicio,fim){ const a=escritorio.indexOf(inicio),b=escritorio.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return escritorio.slice(a,b); }

const render=trecho('window.renderContratos = async function','/* ===== CLIENTES AVULSOS');
const editor=trecho('function htmlEditorClienteAtivoCentral','window.arquivarEntradaPendente');
const escritor=trecho('window.salvarContratoClienteIncompleto=async function','/* Dados da planilha');

exigir(render.includes('window.renderCentralEntradaClientes()')&&render.includes('A carteira ativa não foi confirmada'),
  'Contratos cruza a mesma projeção confirmada da Central e falha fechado');
exigir(render.includes("v?.tipo==='mensalista'")&&render.includes('!slugsComContrato.has'),
  'somente mensalista ativo sem documento entra na reparação financeira');
exigir(render.includes('estadosDivergentes')&&render.includes('não reativou nem criou contrato automaticamente'),
  'contrato encerrado/pausado divergente não é reativado por suposição');
exigir(/id="ecaValor"[^>]*readonly/.test(editor)&&/id="ecaVencimento"[^>]*readonly/.test(editor),
  'ficha operacional mantém valor e vencimento na única porta financeira');
exigir(!editor.includes("if(mensal && (!(dados.valorMensal>0)")&&editor.includes('const financeiroCompleto='),
  'contrato ausente não bloqueia a edição dos demais dados operacionais');
exigir(editor.includes('...(financeiroCompleto?{valorMensal:dados.valorMensal,diaVencimento:dados.diaVencimento}:{})'),
  'ficha incompleta não sobrescreve cadastro legado com valor zero');
exigir(escritor.includes("doc(db,'contratos_cliente',slug)")&&escritor.includes("doc(db,'pagamentos_mensais',slug+'_'+primeiraCompetencia)"),
  'reparação usa IDs canônicos e determinísticos para contrato e mensalidade');
for(const colecao of ['clientes_acesso','calendarios','stories_clientes','clientes_portal_tokens']){
  exigir(!new RegExp(`tx\\.set\\([^\\n]*${colecao}`).test(escritor),`reparação não recria nem altera ${colecao}`);
}

function snapshot(valor){ return {exists:()=>valor!==undefined,data:()=>valor}; }
function criarLaboratorio({pagamentoInicial,contratoInicial,tipo='mensalista'}={}){
  const banco=new Map([
    ['clientes_config/iphone-campo-largo',{tipoCliente:'mensalista',clienteInativo:false}],
    ['clientes_extras/iphone-campo-largo',{slug:'iphone-campo-largo',nome:'iPhone Campo Largo',excluido:false}],
    ['clientes_acesso/iphone-campo-largo',{token:'preservado',ativo:true}],
    ...(pagamentoInicial===undefined?[]:[['pagamentos_mensais/iphone-campo-largo_2026-08',pagamentoInicial]]),
    ...(contratoInicial===undefined?[]:[['contratos_cliente/iphone-campo-largo',contratoInicial]])
  ]);
  const elementos=new Map([
    ['ctValorCheio_iphone-campo-largo',{value:'800'}],
    ['ctDia_iphone-campo-largo',{value:'10'}],
    ['ctPrimeiraCompetencia_iphone-campo-largo',{value:'2026-08'}],
    ['ctPlano_iphone-campo-largo',{value:'Básico'}],
    ['ctObs_iphone-campo-largo',{value:'Plano básico mensal'}],
    ['ctConfirmarMensalista_iphone-campo-largo',{checked:true}],
    ['ctCortesiaPerm_iphone-campo-largo',{checked:false}],
    ['ctCortesiaMeses_iphone-campo-largo',{value:'2026-08\n2026-09'}],
    ['btnCompletarContrato_iphone-campo-largo',{disabled:false,textContent:'',isConnected:true}]
  ]);
  const toasts=[];
  const ctx={
    window:{__contratosClientesIncompletos:{'iphone-campo-largo':{tipo,slug:'iphone-campo-largo',nome:'iPhone Campo Largo',plano:'Básico',planoDetalhes:'',valorMensal:0,diaVencimento:0,primeiraCompetencia:'',cortesiaPermanente:false,cortesiaMeses:[],observacoes:'',extraId:'iphone-campo-largo'}}},
    usuarioAtual:'Amanda',db:{},__contratosIncompletosEmGravacao:new Set(),
    document:{getElementById:id=>elementos.get(id)||null},
    slugClienteCanonico:v=>v,
    competenciaFinanceiraValida:v=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(v)),
    clienteInativoEfetivo:v=>v?.clienteInativo===true,
    statusMensalidadeCanonico:v=>['pago','cancelado','isento'].includes(v?.status)?v.status:'aberto',
    ajusteCortesiaMensalidade:(p,competencia,permanente,meses)=>permanente||meses.includes(competencia)?{status:'isento',cortesiaPermanente:permanente,cortesiaDoMes:!permanente,motivoIsencao:permanente?'cortesia permanente':'cortesia combinada para este mês'}:null,
    doc:(_db,col,id)=>({path:col+'/'+id}),
    __validarReferenciasFirestore:refs=>refs.filter(Boolean),
    serverTimestamp:()=>({server:true}),
    mostrarToast:(msg,tipoToast)=>toasts.push({msg,tipo:tipoToast}),
    limparCacheIndicadores:()=>{},renderContratos:async()=>true,
    console,
    getDoc:async ref=>snapshot(banco.get(ref.path)),
    runTransaction:async(_db,fn)=>{
      const operacoes=[];
      const tx={
        get:async ref=>snapshot(banco.get(ref.path)),
        set:(ref,dados,opcoes)=>operacoes.push({ref,dados,merge:opcoes?.merge===true})
      };
      await fn(tx);
      for(const op of operacoes){ const atual=op.merge?(banco.get(op.ref.path)||{}):{}; banco.set(op.ref.path,{...atual,...op.dados}); }
    }
  };
  ctx.window.window=ctx.window;
  ctx.window.limparCacheDeClientes=()=>{};
  vm.createContext(ctx);
  vm.runInContext(escritor,ctx);
  return {ctx,banco,toasts,elementos};
}

{
  const lab=criarLaboratorio();
  lab.elementos.get('ctConfirmarMensalista_iphone-campo-largo').checked=false;
  const ok=await lab.ctx.window.salvarContratoClienteIncompleto('iphone-campo-largo');
  exigir(ok===false&&!lab.banco.has('contratos_cliente/iphone-campo-largo')&&!lab.banco.has('pagamentos_mensais/iphone-campo-largo_2026-08'),
    'sem confirmação humana de mensalista, nenhuma estrutura financeira é criada');
  exigir(lab.toasts.some(t=>/Confirme que esta identidade/.test(t.msg)),
    'interface explica a confirmação necessária sem transformar ausência em sucesso');
}

{
  const lab=criarLaboratorio();
  const acessoAntes=structuredClone(lab.banco.get('clientes_acesso/iphone-campo-largo'));
  const ok=await lab.ctx.window.salvarContratoClienteIncompleto('iphone-campo-largo');
  exigir(ok===true,'Amanda conclui a estrutura financeira ausente');
  const contrato=lab.banco.get('contratos_cliente/iphone-campo-largo');
  const mensalidade=lab.banco.get('pagamentos_mensais/iphone-campo-largo_2026-08');
  exigir(contrato.valorVigente===800&&contrato.plano==='Básico'&&contrato.diaVencimento===10&&contrato.primeiraCompetencia==='2026-08',
    'contrato recebe valor, plano, vencimento e competência informados');
  exigir(mensalidade.valorDevido===800&&mensalidade.status==='isento'&&mensalidade.cliente==='iphone-campo-largo',
    'primeira mensalidade nasce vinculada e respeita a cortesia informada');
  exigir(JSON.stringify(lab.banco.get('clientes_acesso/iphone-campo-largo'))===JSON.stringify(acessoAntes),
    'Portal existente permanece byte a byte inalterado no laboratório');
  exigir(![...lab.banco.keys()].some(k=>k.startsWith('calendarios/')||k.startsWith('stories_clientes/')||k.startsWith('clientes_portal_tokens/')),
    'reparação não cria calendário, Stories nem token paralelo');
  const quantidadeAntes=lab.banco.size;
  const repetido=await lab.ctx.window.salvarContratoClienteIncompleto('iphone-campo-largo');
  exigir(repetido===false&&lab.banco.size===quantidadeAntes,
    'segunda aba/tentativa encontra o contrato e não duplica documentos');
}

{
  const lab=criarLaboratorio({pagamentoInicial:{cliente:'iphone-campo-largo',competencia:'2026-08',valorDevido:900,status:'aberto'}});
  const ok=await lab.ctx.window.salvarContratoClienteIncompleto('iphone-campo-largo');
  exigir(ok===false&&!lab.banco.has('contratos_cliente/iphone-campo-largo'),
    'mensalidade preexistente com valor divergente bloqueia a transação inteira');
  exigir(lab.banco.get('pagamentos_mensais/iphone-campo-largo_2026-08').valorDevido===900,
    'valor financeiro divergente é preservado para conferência humana');
}

{
  const lab=criarLaboratorio({tipo:'avulso'});
  const ok=await lab.ctx.window.salvarContratoClienteIncompleto('iphone-campo-largo');
  exigir(ok===false&&!lab.banco.has('contratos_cliente/iphone-campo-largo'),
    'chamada direta não converte avulso em contrato mensal');
}

exigir(escritorio.includes("{ nome:'Hitech',")&&escritorio.includes("{ nome:'Rodrigo',")&&escritorio.includes("const CLIENTES_SO_EDICAO = ['rodrigo']"),
  'Hitech e Rodrigo continuam identidades e contratos distintos; Rodrigo permanece só edição');

console.log(`REGRESSÃO V92 CICLO DE CLIENTES: OK (${total} verificações)`);
