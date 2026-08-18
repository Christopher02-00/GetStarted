#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
let total=0;

function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error(mensagem);
}

function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio);
  const b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error(`não encontrei o trecho: ${inicio}`);
  return fonte.slice(a,b);
}

function executar(codigo,extras={}){
  const contexto=vm.createContext({URL,console,...extras});
  new vm.Script(codigo,{filename:'regression-v81-vendas-sandbox.js'}).runInContext(contexto);
  return contexto.api;
}

function helpersReais(){
  const helpers=trecho(escritorio,
    'function normalizarChaveFamiliaProposta',
    '  const ETAPAS_PROPOSTA_POSTERIORES');
  const valor=trecho(escritorio,'function valorDeTexto(t){','  /* ===== "R$ 14,00"');
  const atributo=trecho(escritorio,'function escAttr(s){','  const GRADE_DIAS');
  return executar(`${atributo}\n${helpers}\n${valor}\n`+
    'globalThis.api={normalizarChaveFamiliaProposta,urlHttpsPropostaVenda,recorrenciaPropostaVenda,chaveFamiliaPropostaVenda,idPropostaDeterministica,valorDeTexto,escAttr};',{
      slugClienteCanonico:v=>String(v||'').trim().toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''),
      esc:v=>String(v||'')
    });
}

function repositorioPropostas(api){
  const docs=new Map();
  const etapasPosteriores=new Set(['analise','ajuste','aceita','producao','entregue','perdido']);

  function salvar(entrada,editandoId=''){
    const chave=api.chaveFamiliaPropostaVenda(entrada);
    if(!chave) throw new Error('family/missing');
    const id=editandoId||api.idPropostaDeterministica(chave);
    const hash=String(entrada.propostaDocumentoSha256||'').toLowerCase();
    const duplicado=[...docs.values()].find(d=>d.id!==editandoId&&
      (d.propostaFamiliaChave===chave||(hash&&d.propostaDocumentoSha256===hash)));
    if(duplicado) throw new Error('proposal/duplicate');
    if(!editandoId&&docs.has(id)) throw new Error('proposal/duplicate');
    if(editandoId&&!docs.has(id)) throw new Error('proposal/missing');
    const anterior=docs.get(id)||{};
    const estagio=editandoId&&etapasPosteriores.has(anterior.estagio)
      ? anterior.estagio
      : (entrada.estagio||'preparada');
    const slugs=[...new Set(entrada.clienteSlugs||[])];
    const gravado={...anterior,...entrada,id,
      propostaFamiliaChave:chave,
      propostaDocumentoSha256:hash,
      clienteSlugs:slugs,
      clienteSlug:estagio==='preparada'?'':(slugs[0]||''),
      propostaEnviadaEm:estagio==='preparada'?'':String(entrada.propostaEnviadaEm||anterior.propostaEnviadaEm||''),
      estagio,protocolo:id
    };
    docs.set(id,gravado);
    const recibo=docs.get(id);
    if(!recibo||recibo.protocolo!==id||recibo.propostaFamiliaChave!==chave) throw new Error('receipt/not-confirmed');
    return recibo;
  }

  return {docs,salvar};
}

function testarIdentidadeEDeduplicacao(api){
  const repo=repositorioPropostas(api);
  const base={clienteNome:'HiTech',propostaNumero:'006/2026',propostaVersao:'v1.0',
    propostaEmitidaEm:'2026-08-01',propostaDocumentoSha256:'a'.repeat(64),
    clienteSlugs:['hitech'],estagio:'preparada'};
  const primeira=repo.salvar(base);
  exigir(primeira.id==='proposta_hitech-006-2026-2026',
    'ID da proposta não foi derivado deterministicamente da família');
  let repetidaBloqueada=false;
  try{ repo.salvar({...base}); }catch(e){ repetidaBloqueada=e.message==='proposal/duplicate'; }
  exigir(repetidaBloqueada&&repo.docs.size===1,
    'salvar a mesma família/hash duas vezes criou mais de um documento');
  let hashBloqueado=false;
  try{ repo.salvar({...base,propostaFamiliaChave:'outra-familia'}); }
  catch(e){ hashBloqueado=e.message==='proposal/duplicate'; }
  exigir(hashBloqueado&&repo.docs.size===1,
    'o mesmo hash com outra chave familiar escapou da deduplicação');

  const versao2=repo.salvar({...base,propostaVersao:'v2.0',
    propostaDocumentoSha256:'b'.repeat(64)},primeira.id);
  exigir(repo.docs.size===1&&versao2.id===primeira.id&&versao2.propostaVersao==='v2.0',
    'nova versão da mesma família criou outro documento ou não atualizou a versão');

  const salvarFonte=trecho(escritorio,'window.salvarPropostaVenda=async function','  window.abrirBoasVindasVenda');
  exigir(salvarFonte.includes('idPropostaDeterministica(base.propostaFamiliaChave)')&&
    salvarFonte.includes('await runTransaction(db,async tx=>')&&
    salvarFonte.includes('if(!editandoId&&atual.exists())')&&
    salvarFonte.includes('receipt/not-confirmed'),
    'implementação real perdeu ID determinístico, deduplicação transacional ou recibo');
}

function testarPreparadaEPortal(api){
  const repo=repositorioPropostas(api);
  const preparada=repo.salvar({clienteNome:'Cliente Ativo',propostaPlano:'Premium',
    propostaEmitidaEm:'2026-08-18',clienteSlugs:['cliente-ativo'],estagio:'preparada'});
  exigir(preparada.propostaEnviadaEm===''&&preparada.clienteSlug==='',
    'proposta preparada ganhou data de envio ou chave primária do Portal');
  const visiveis=lista=>lista.filter(n=>n.clienteSlug==='cliente-ativo'&&n.estagio!=='preparada');
  exigir(visiveis([...repo.docs.values()]).length===0,
    'proposta preparada ficou visível na consulta simulada do Portal');
  const enviada=repo.salvar({...preparada,estagio:'proposta',propostaEnviadaEm:'2026-08-18'},preparada.id);
  exigir(enviada.clienteSlug==='cliente-ativo'&&visiveis([...repo.docs.values()]).length===1,
    'registro de envio real não liberou a proposta correta no Portal');

  const salvarFonte=trecho(escritorio,'window.salvarPropostaVenda=async function','  window.abrirBoasVindasVenda');
  const buscaPortal=trecho(portal,'async function buscarNegociosDoCliente','  window.liberarProposta');
  exigir(salvarFonte.includes("clienteSlug:estagioFinal==='preparada'?'':dados.clienteSlug")&&
    salvarFonte.includes("propostaEnviadaEm:estagioFinal==='preparada'?'':")&&
    buscaPortal.includes("n.estagio!=='preparada'"),
    'barreira real entre preparada, envio comprovado e Portal foi removida');
}

function testarRenovacaoSemEfeitoAvulso(){
  const efeitos={negocios:0,clientesExtras:0,receitasAvulsas:0};
  function moverParaProducao(n,clientesAtivos){
    const slugs=n.clienteSlugs||[];
    if(n.tipoInteresse==='renovacao'){
      if(!slugs.length||slugs.some(s=>!clientesAtivos.has(s))) throw new Error('renewal/inactive');
      efeitos.negocios++;
      return {clienteSlug:slugs[0],clienteSlugs:slugs,clienteVinculoEstado:'ativo'};
    }
    efeitos.clientesExtras++;
    efeitos.receitasAvulsas++;
    return {};
  }
  const vinculo=moverParaProducao({tipoInteresse:'renovacao',clienteSlugs:['hitech']},new Set(['hitech']));
  exigir(vinculo.clienteSlug==='hitech'&&efeitos.negocios===1&&efeitos.clientesExtras===0&&efeitos.receitasAvulsas===0,
    'renovação ativa criou cliente extra ou receita avulsa no runtime isolado');
  let inativaBloqueada=false;
  try{ moverParaProducao({tipoInteresse:'renovacao',clienteSlugs:['arquivado']},new Set()); }
  catch(e){ inativaBloqueada=e.message==='renewal/inactive'; }
  exigir(inativaBloqueada&&efeitos.clientesExtras===0&&efeitos.receitasAvulsas===0,
    'renovação sem cliente ativo avançou ou gerou efeito avulso');

  const mover=trecho(escritorio,'window.moverNegocio = async function','  /* Conferencia manual do comprovante');
  const ramoRenovacao=mover.indexOf("if(n.tipoInteresse==='renovacao')",mover.indexOf("if(novoEstagio === 'producao')"));
  const ramoAvulso=mover.indexOf('moverNegocioAvulsoParaProducaoAtomico');
  exigir(mover.includes('verificarRenovacaoPropostaAtiva')&&ramoRenovacao>=0&&ramoAvulso>=0&&
    mover.includes("n.tipoInteresse!=='renovacao'")&&mover.includes('Nenhum cliente avulso ou receita avulsa foi criado.'),
    'implementação real de renovação não valida ativo ou alcança a criação avulsa');

  const atomico=trecho(escritorio,'function idReceitaAvulsaPorNegocio','  window.moverNegocio = async function');
  exigir(atomico.includes("'negocio_'+String(negocioId")&&atomico.includes('await runTransaction(db,async tx=>')&&
    atomico.includes('tx.get(ref)')&&atomico.includes('tx.get(extraRef)')&&atomico.includes('tx.get(configRef)')&&atomico.includes('tx.get(receitaRef)')&&
    atomico.includes('reciboNegocio')&&atomico.includes('reciboReceita'),
    'produção avulsa perdeu ID determinístico, transação única ou recibo completo');
  exigir(mover.indexOf('__negociosMovendo.add(id)')<mover.indexOf('await getDoc(ref)')&&mover.includes('__negociosMovendo.delete(id)'),
    'movimentação para produção perdeu trava antes da primeira espera ou liberação no finally');
  exigir(!mover.includes("addDoc(collection(db,'receitas_avulsas')")&&!mover.includes('Falha ao criar receita avulsa'),
    'ramo antigo podia confirmar produção mesmo após falha parcial da receita');
}

function testarMetricas(api){
  const oportunidades=[
    {propostaRecorrencia:'mensal',propostaValor:'R$ 2.500,00'},
    {propostaRecorrencia:'mensal',propostaValor:'R$ 1.500,00'},
    {propostaRecorrencia:'unico',propostaValor:'R$ 5.400,00'},
    {propostaRecorrencia:'outro',propostaValor:'R$ 900,00'}
  ];
  const somar=tipo=>oportunidades.filter(n=>api.recorrenciaPropostaVenda(n)===tipo)
    .reduce((s,n)=>s+api.valorDeTexto(n.propostaValor),0);
  exigir(somar('mensal')===4000&&somar('unico')===5400&&somar('outro')===900,
    'MRR, projeto único e outra condição foram misturados');
  const render=trecho(escritorio,'window.renderCentralVendas=async function','  function atualizarBadgeFunil');
  exigir(render.includes('valorPipelineMrr')&&render.includes('valorPipelineUnico')&&
    render.includes('<b>MRR potencial:</b>')&&render.includes('<b>Projetos únicos:</b>'),
    'painel real voltou a somar MRR e projetos únicos no mesmo indicador');
}

function testarUrlEAtributo(api){
  exigir(api.urlHttpsPropostaVenda('https://example.com/proposta.pdf')==='https://example.com/proposta.pdf',
    'URL HTTPS válida foi recusada');
  for(const url of ['http://example.com/a','javascript:alert(1)','https://u:p@example.com/a','https://example.com/a b','https://example.com/\"x']){
    exigir(api.urlHttpsPropostaVenda(url)==='',`URL insegura foi aceita: ${url}`);
  }
  exigir(api.escAttr('\" onmouseover=\"x\' <tag>')==='&quot; onmouseover=&quot;x&#39; &lt;tag&gt;',
    'escAttr não protege aspas/apóstrofo/HTML no atributo');
  exigir(escritorio.includes("href=\"'+escAttr(linkSeguro)+'\"")&&
    portal.includes('href="${escAttr(linkSeguro)}"')&&portal.includes('urlHttpsSeguraPortal(n.propostaLink)'),
    'link da proposta deixou de passar por HTTPS + escAttr em alguma ponta');
}

async function testarTravasEDeterminismo(){
  let trava=false,gravacoes=0;
  async function salvarComTrava(){
    if(trava) return false;
    trava=true;
    try{ await Promise.resolve(); gravacoes++; return true; }
    finally{ trava=false; }
  }
  const resultados=await Promise.all([salvarComTrava(),salvarComTrava()]);
  exigir(resultados.filter(Boolean).length===1&&gravacoes===1,
    'duplo clique atravessou a trava no runtime isolado');

  const reuniao=trecho(escritorio,'window.salvarReuniaoVenda=async function','  async function verificarVinculosPropostaAtivos');
  const proposta=trecho(escritorio,'window.salvarPropostaVenda=async function','  window.abrirBoasVindasVenda');
  exigir(reuniao.indexOf('if(__salvandoVenda) return;')>=0&&
    reuniao.indexOf('__salvandoVenda=true')<reuniao.indexOf('await setDoc')&&
    reuniao.includes('protocolo:ref.id')&&reuniao.includes('receipt/not-confirmed'),
    'reunião perdeu trava antecipada, protocolo ou recibo');
  exigir(proposta.indexOf('if(__salvandoVenda) return;')>=0&&
    proposta.indexOf('__salvandoVenda=true')<proposta.indexOf('await diagnosticarIdentidadeCliente')&&
    proposta.includes('idPropostaDeterministica')&&proposta.includes('runTransaction'),
    'proposta perdeu trava antecipada, ID determinístico ou transação');
  const formulario=trecho(escritorio,'window.mostrarFormularioVenda=function','  function resumoReuniaoVenda');
  exigir(['vendaFamiliaChave','vendaHash','vendaNumero','vendaVersao','vendaEmitidaEm','vendaRecorrencia',
    'vendaPlano','vendaCondicoes','vendaDecisor','vendaEventoEm','vendaClienteSlugs'].every(id=>formulario.includes(`id="${id}"`)),
    'formulário real perdeu um dos campos estruturais V81');
  const editar=trecho(escritorio,'window.editarPropostaNegocio = async function','  window.prepararEnvioPropostaVenda');
  exigir(editar.includes("mostrarFormularioVenda('proposta'")&&!editar.includes('prompt('),
    'edição de proposta voltou a usar prompts em vez do formulário único');
}

try{
  const api=helpersReais();
  testarIdentidadeEDeduplicacao(api);
  testarPreparadaEPortal(api);
  testarRenovacaoSemEfeitoAvulso();
  testarMetricas(api);
  testarUrlEAtributo(api);
  await testarTravasEDeterminismo();
  console.log(`REGRESSÃO V81 VENDAS: OK (${total} verificações)`);
}catch(erro){
  console.error('REGRESSÃO V81 VENDAS: FALHOU — '+(erro?.message||erro));
  process.exitCode=1;
}
