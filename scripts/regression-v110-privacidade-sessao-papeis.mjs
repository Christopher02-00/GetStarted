#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escritorio = fs.readFileSync(path.join(raiz, 'escritorio.html'), 'utf8');
const portal = fs.readFileSync(path.join(raiz, 'portal-cliente.html'), 'utf8');
const config = fs.readFileSync(path.join(raiz, '_config.yml'), 'utf8');
let total = 0;
const falhas = [];

function verificar(condicao, mensagem){
  total++;
  if(condicao) console.log('PASS ', mensagem);
  else { falhas.push(mensagem); console.error('FAIL ', mensagem); }
}

function trecho(inicio, fim){
  const a = escritorio.indexOf(inicio);
  const b = escritorio.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) return '';
  return escritorio.slice(a, b);
}

function sha256(caminho){
  return createHash('sha256').update(fs.readFileSync(path.join(raiz, caminho))).digest('hex');
}

verificar((escritorio.includes('gs-build" content="2026-08-25-legenda-editorial-fila-cecilia-v114')||
  escritorio.includes('gs-build" content="2026-08-25-continuidade-calendario-gravacao-v115'))&&
  escritorio.includes('gs-v112-patch" content="2026-08-24-roteador-gerencia-papeis-v112')&&
  escritorio.includes('gs-v111-patch" content="2026-08-24-proposta-portal-protegida-v111')&&
  escritorio.includes('gs-v110-patch" content="2026-08-24-privacidade-sessao-papeis-v110'),
  'build cumulativo preserva V112, V111 e a fronteira V110 de sessão e papéis');
verificar(config.includes('- rollback_v110/'), 'rollback V110 permanece excluído do runtime público');

for(const [arquivo,hashLinhaBase] of Object.entries({
  'avulso.html':'15aa50ff81a500a7f285f4f92f9a3fb97bef04a5e3eb203fef179cece38d62b6',
  'firestore.rules':'66bed60400f8ed73c524cb65e9524729e957788e43dad35cb4a00bbca398fa47',
  'financeiro-core.mjs':'ce6b55f78bef54d50d78378730329b2b84199961e20de0dd7ee86e98ce42d844',
  'financeiro-ui-v103.mjs':'ab63cde2b36e68b08523cd4e01e54557b25db969beb861e5e59394909c404cfc',
  'financeiro-ui-v104.mjs':'eb152a1d5760ae3343e6189909dcc4a8926b903874c8838bec8beb9077a516ac'
})) verificar(sha256(arquivo)===hashLinhaBase, `${arquivo} permanece byte a byte na linha-base esperada`);
verificar(portal.includes('mesVisivelPortalV115')&&!portal.includes("collection(db,'negocios')"),
  'Portal V115 muda somente a continuidade do calendário e continua sem ler a coleção comercial privada');

const limpeza = trecho('function limparEstadoPrivadoTrocaIdentidade', 'window.mudarUsuarioGlobal = async function');
verificar(Boolean(limpeza), 'existe uma função canônica de limpeza privada');
for(const contrato of [
  'window.__projecaoCicloClientes',
  'window.__clientesArquivadosCentral',
  'window.__saidasProgramadasPorSlug',
  'window.__entradaClientesAtivos',
  'window.__entradaClientesAtivosConfirmadosEm',
  '__negociosCentralVendas',
  '__reunioesCentralVendas',
  '__leadsAvulsosCache',
  '__leadsPessoalCache',
  '__leadsMensalCache',
  'window.__fichasAvulso',
  'window.__cadastroOrigemAtivacaoId',
  'onboardingProcessos',
  'onboardingAberto'
]) verificar(limpeza.includes(contrato), `limpeza cobre ${contrato}`);
verificar(limpeza.includes('__geracaoIdentidade++'), 'troca invalida resultados assíncronos anteriores');
verificar(limpeza.includes("'financeiroBox'") && limpeza.includes("'mensalidadesBox'") && limpeza.includes("'cobrancaBox'"), 'conteúdo financeiro renderizado é apagado em toda troca');
verificar(limpeza.includes("'centralVendasResumo'") && limpeza.includes("'centralVendasFunil'") && limpeza.includes("'centralVendasReunioes'"), 'conteúdo comercial renderizado é apagado em toda troca');

const mudar = trecho('window.mudarUsuarioGlobal = async function', '/* ===== FRENTE C1');
const posLimpeza = mudar.indexOf('limparEstadoPrivadoTrocaIdentidade()');
const posIdentidade = mudar.indexOf('usuarioAtual = escolhido');
const posAwait = mudar.indexOf('await ');
verificar(posLimpeza >= 0 && posLimpeza < posIdentidade && posLimpeza < posAwait, 'limpeza canônica é síncrona, anterior à identidade e à rede');

verificar(escritorio.includes('id="subtabGerenciaAvulsos"'), 'subaba legada de avulsos possui identidade DOM controlável');
verificar(escritorio.includes('id="gerenciaAvulsos"'), 'painel legado de avulsos permanece identificável');
const sidebar = trecho('function sincronizarSidebarDOMPorPapel', 'function esc(');
verificar(sidebar.includes("definirItemExclusivoNoDOM('subtabGerenciaAvulsos',usuarioAtual==='Chris')"), 'Projetos Avulsos só nasce no DOM do Chris');
verificar(sidebar.includes("definirItemExclusivoNoDOM('gerenciaAvulsos',usuarioAtual==='Chris')"), 'painel de Projetos Avulsos só nasce no DOM do Chris');
for(const id of ['view-mensalidades','view-financeiro','view-cobranca']){
  verificar(sidebar.includes(`definirItemExclusivoNoDOM('${id}',usuarioAtual==='Chris')`), `${id} não existe no DOM de papel indevido`);
}
verificar(sidebar.includes("definirItemExclusivoNoDOM('view-cadastro',gestao)"), 'view-cadastro não existe no DOM fora da gerência');

const limparUid = trecho('function limparIdentidadeEquipeAnterior', 'async function aplicarUsuarioGoogle');
verificar(limparUid.includes('limparEstadoPrivadoTrocaIdentidade()'), 'troca real de conta Google reutiliza a fronteira privada');

const subabas = trecho('const SUBABAS_OCULTAS_POR_PESSOA', 'window.setGerenciaSub');
verificar(/['"]Amanda['"]\s*:\s*\[[^\]]*['"]avulsos['"]/.test(subabas), 'rota interna de Projetos Avulsos é negada à Amanda');

const renderAvulso = trecho('window.renderClientesAvulsos = async function', 'window.__abaFicha');
const posGuardaAvulso = renderAvulso.indexOf("pessoaDesteRender !== 'Chris'");
const posLeituraAvulso = renderAvulso.indexOf('sincronizarLeadsParaFunil()');
verificar(posGuardaAvulso >= 0 && posGuardaAvulso < posLeituraAvulso, 'renderer avulso bloqueia papel antes de consultar negócios');
verificar(renderAvulso.includes('geracaoDesteRender!==__geracaoIdentidade') || renderAvulso.includes('geracaoDesteRender !== __geracaoIdentidade'), 'renderer avulso descarta resposta de identidade antiga');

const renderVendas = trecho('window.renderCentralVendas=async function', 'function atualizarBadgeFunil');
const posGuardaVendas = renderVendas.indexOf("pessoaDesteRender !== 'Chris'");
const posLeituraVendas = renderVendas.indexOf('Promise.all');
const posAtribuiVendas = renderVendas.indexOf('__negociosCentralVendas=');
verificar(posGuardaVendas >= 0 && posGuardaVendas < posLeituraVendas, 'Central de Vendas nega papel antes da leitura');
verificar(renderVendas.includes('geracaoDesteRender!==__geracaoIdentidade') || renderVendas.includes('geracaoDesteRender !== __geracaoIdentidade'), 'Central de Vendas descarta resposta de identidade antiga');
verificar(posAtribuiVendas > renderVendas.indexOf('geracaoDesteRender'), 'cache comercial só é publicado depois da guarda de identidade');

const visibilidade = trecho('function atualizarVisibilidadeSidebarExclusiva', '// FRENTE C1');
const posRestaura = visibilidade.indexOf("n.style.display = ''");
const posCecilia = visibilidade.indexOf("if(gClientes && usuarioAtual === 'Cecília')");
verificar(posRestaura >= 0 && posRestaura < posCecilia, 'links permitidos são restaurados antes do filtro da Cecília');

/* Execução isolada do limpador: a prova não consulta rede nem Firebase e
   usa dados sintéticos deliberadamente sensíveis. */
if(limpeza){
  const nos = new Map();
  for(const id of ['financeiroBox','mensalidadesBox','cobrancaBox','centralVendasResumo','centralVendasFunil','centralVendasReunioes','entradaClientesBox','registroRapidoBox']){
    nos.set(id,{conteudo:'DADO-SENSIVEL',style:{display:'block'},replaceChildren(){this.conteudo='';}});
  }
  const contexto = vm.createContext({
    console,
    window:{
      __projecaoCicloClientes:{telefone:'41999999999'},
      __clientesArquivadosCentral:{x:{valorMensal:1700}},
      __saidasProgramadasPorSlug:{x:{motivo:'privado'}},
      __entradaClientesAtivos:{x:{token:'segredo'}},
      __entradaClientesAtivosConfirmadosEm:123,
      __fichasAvulso:{x:{propostaValor:'R$ 2.000'}},
      __cadastroOrigemAtivacaoId:'cadastro_privado',
      limparFormularioEntradaCliente(){ contexto.formularioLimpo = true; }
    },
    document:{getElementById:id=>nos.get(id)||null},
    __geracaoIdentidade:7,
    __negociosCentralVendas:[{clienteNome:'SIGILOSO'}],
    __reunioesCentralVendas:[{resumo:'SIGILOSO'}],
    onboardingProcessos:[{cliente:'SIGILOSO'}],
    onboardingAberto:{cliente:'SIGILOSO'}
  });
  try{
    new vm.Script(`${limpeza}\nlimparEstadoPrivadoTrocaIdentidade();\nglobalThis.prova={geracao:__geracaoIdentidade,negocios:__negociosCentralVendas,reunioes:__reunioesCentralVendas,onboardingProcessos,onboardingAberto};`).runInContext(contexto);
    verificar(contexto.prova.geracao === 8, 'execução incrementa uma única geração');
    verificar(contexto.prova.negocios.length === 0 && contexto.prova.reunioes.length === 0, 'execução remove caches comerciais sintéticos');
    verificar(Object.keys(contexto.window.__entradaClientesAtivos||{}).length === 0 && Object.keys(contexto.window.__projecaoCicloClientes||{}).length === 0, 'execução remove projeções operacionais sintéticas');
    verificar(contexto.prova.onboardingProcessos.length === 0 && contexto.prova.onboardingAberto === null, 'execução remove estado de onboarding');
    verificar([...nos.entries()].filter(([id])=>id!=='registroRapidoBox').every(([,no])=>no.conteudo===''), 'execução esvazia todo DOM sintético restrito sem destruir o formulário');
    verificar(contexto.formularioLimpo === true, 'execução limpa formulário compartilhado');
  }catch(erro){
    verificar(false, 'limpador executa isoladamente sem exceção: ' + String(erro?.message||erro));
  }
}

if(falhas.length){
  console.error(`\nREGRESSÃO V110 PRIVACIDADE: REPRODUZIDA COMO FALHA (${falhas.length}/${total})`);
  process.exitCode = 1;
}else{
  console.log(`\nREGRESSÃO V110 PRIVACIDADE: APROVADA (${total} verificações)`);
}
