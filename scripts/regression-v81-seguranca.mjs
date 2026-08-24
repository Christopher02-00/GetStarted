#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const regras=fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8');
const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
let total=0;

function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error(mensagem);
  console.log('PASS  '+mensagem);
}

function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio), b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('trecho ausente: '+inicio);
  return fonte.slice(a,b);
}

function testarFichaPontual(){
  exigir(!portal.includes("meusDocs('cadastros_clientes'")&&
    !portal.includes("query(collection(db,'cadastros_clientes')"),
    'Portal não faz query/list na coleção privada de cadastros');
  const helper=trecho(portal,'async function carregarFichaPortalSegura','  function meusDocs');
  exigir(helper.includes("getDoc(doc(db,'cadastros_clientes',id))")&&
    helper.includes("getDoc(doc(db,'contratos_cliente',slug))"),
    'ficha usa getDoc pontual e contrato canônico como fallback legado');
  const info=trecho(portal,'async function carregarInfo','  window.salvarInfoExtras');
  exigir(info.includes('clienteAtual?.escopo?.ficha||{}')&&!info.includes('cadastros_clientes'),
    'aba de informações reutiliza somente a ficha já autorizada');
}

function testarComprovantes(){
  const mensal=trecho(portal,'window.enviarComprovanteMensal','  window.comprovantePeloWhats');
  exigir(mensal.includes('urlHttpsSeguraPortal(link)')&&
    mensal.includes('comprovante: linkSeguro')&&mensal.includes('linkSeguro)'),
    'comprovante mensal é normalizado em HTTPS antes da escrita e do alerta');
  const regraMensal=trecho(regras,'match /pagamentos_mensais','// O registro da conta pessoal');
  exigir(regraMensal.includes("request.resource.data.comprovante != ''")&&
    regraMensal.includes('urlHttpsOuVazia(request.resource.data.comprovante)')&&
    regraMensal.includes('comprovanteEnviadoEm.size() <= 40'),
    'regra mensal limita URL, conteúdo e carimbo do comprovante');
  exigir(escritorio.includes('const comprovanteSeguro=urlHttpsPropostaVenda(l.comprovante)')&&
    escritorio.includes('href="\'+escAttr(comprovanteSeguro)+\'" target="_blank" rel="noopener"')&&
    escritorio.includes('Comprovante legado bloqueado'),
    'Financeiro bloqueia comprovante legado e usa href escapado sem opener');
}

function testarPropostas(){
  const salvar=trecho(escritorio,'window.salvarPropostaVenda=async function','  window.abrirBoasVindasVenda');
  exigir(salvar.includes('if(clienteSlugs.length>1)')&&
    escritorio.includes('Cliente vinculado (slug único)')&&
    salvar.includes('clienteSlug:clienteSlugs[0]'),
    'nova proposta admite exatamente um vínculo explícito de Portal');
  const regraNegocio=trecho(regras,'match /negocios','match /reunioes_vendas');
  exigir(regras.includes("resource.data.estagio in ['proposta','analise','ajuste']")&&
    regras.includes("request.resource.data.estagio in ['aceita','ajuste','perdido']"),
    'cliente só responde proposta em etapas comerciais respondíveis');
  const atualizacaoNegocio=trecho(regras,'function atualizacaoNegocioClienteValida','function atualizacaoPublicaClienteValida');
  exigir(regraNegocio.includes('atualizacaoNegocioClienteValida(docId)')&&
    atualizacaoNegocio.includes('respostaPropostaClienteValida(resource.data.clienteSlug)')&&
    regras.includes('historicoRespostaClienteValido(clienteSlug)')&&
    regras.includes('historico.hasAll(resource.data.historico)'),
    'resposta exige histórico crescente e preserva todas as entradas anteriores');
  const ramoResposta=trecho(atualizacaoNegocio,
    "alterados.hasAny(['estagio','respostaCliente','respostaTexto','historico'])",
    ') && respostaPropostaClienteValida');
  exigir(!ramoResposta.includes('pagamentoComprovante')&&!ramoResposta.includes('urlHttpsOuVazia'),
    'resposta não revalida comprovante legado que permaneceu inalterado');
  exigir(atualizacaoNegocio.includes("request.resource.data.pagamentoComprovante != ''")&&
    atualizacaoNegocio.includes('urlHttpsOuVazia(request.resource.data.pagamentoComprovante)'),
    'alteração do comprovante da proposta continua aceitando somente HTTPS');
}

function testarPapeis(){
  for(const nome of ['ehGerencia','ehAmanda','ehChris','ehGabi','ehCecilia','podePrepararLinkCalendario']){
    const bloco=trecho(regras,`function ${nome}() {`,'    }');
    exigir(bloco.includes('emailDaSementeNaoRevogado()'),`${nome} respeita revogação da conta-semente`);
  }
  const negocio=trecho(regras,'match /negocios','match /reunioes_vendas');
  const reuniao=trecho(regras,'match /reunioes_vendas','match /contratos_cliente');
  exigir(negocio.includes('allow read: if ehChris()')&&negocio.includes('allow create: if ehChris()')&&
    negocio.includes('allow update: if ehChris() || atualizacaoNegocioClienteValida(docId);')&&
    (negocio.match(/allow update:/g)||[]).length===1&&
    regras.includes('revisaoPropostaPortalAvanca(resource.data, request.resource.data)')&&
    regras.includes('liberacaoPropostaPortalAtiva(propostaId, resource.data.clienteSlug)')&&
    regras.includes('respostaPropostaPortalEspelhada(propostaId)')&&
    regras.includes('comprovantePropostaPortalEspelhado(propostaId)')&&
    reuniao.includes('allow read, create, update: if ehChris()'),
    'Central continua exclusiva para leitura/criação; cliente só atualiza proposta liberada, revisada e espelhada');
}

function compilarScriptsInline(){
  for(const [arquivo,fonte] of [['portal-cliente.html',portal],['escritorio.html',escritorio]]){
    const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
    for(const bloco of blocos){
      if(/\bsrc\s*=/.test(bloco[1])) continue;
      if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
      else new vm.Script(bloco[2]);
    }
    exigir(true,arquivo+' mantém JavaScript inline compilável');
  }
}

try{
  testarFichaPontual();
  testarComprovantes();
  testarPropostas();
  testarPapeis();
  compilarScriptsInline();
  console.log(`REGRESSÃO V81 SEGURANÇA: OK (${total} verificações)`);
}catch(erro){
  console.error('REGRESSÃO V81 SEGURANÇA: FALHOU — '+(erro?.message||erro));
  process.exitCode=1;
}
