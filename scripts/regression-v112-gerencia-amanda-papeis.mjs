#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  if(a < 0 || b < 0) return '';
  return fonte.slice(a, b);
}

function itensArrayPessoa(bloco, pessoa){
  const padrao = new RegExp(`['"]${pessoa}['"]\\s*:\\s*\\[([\\s\\S]*?)\\]`);
  const encontrado = bloco.match(padrao);
  if(!encontrado) return [];
  return [...encontrado[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
}

const domPorPapel = trecho('const __sidebarExclusivos', 'function esc(');
const regrasSubabas = trecho('const SUBABAS_OCULTAS_POR_PESSOA', 'window.setGerenciaSub');
const roteadorGerencia = trecho('window.setGerenciaSub = function', '\n  let todasAusencias');
const caminhoPainel = trecho('window.irParaPainelDeControle = function', '/* 01/08/2026');
const caminhoContextual = trecho('window.navegarGerenciaSub = async function', 'window.toggleComandoSecao');
const visibilidadePorFuncao = trecho('const VISIBILIDADE_POR_FUNCAO', 'function papelPodeControlePostagem');
const irParaExtras = trecho('window.irParaExtras = function', 'window.irParaAprovacoes');
const roteadorPrincipal = trecho('const VIEWS_SO_CHRIS', 'window.setCadastroSub');

verificar(Boolean(domPorPapel && regrasSubabas && roteadorGerencia && caminhoPainel && caminhoContextual),
  'contratos V112 foram localizados no HTML');

verificar(
  domPorPapel.includes("definirItemExclusivoNoDOM('subtabGerenciaAvulsos',usuarioAtual==='Chris')") &&
  domPorPapel.includes("definirItemExclusivoNoDOM('gerenciaAvulsos',usuarioAtual==='Chris')"),
  'Projetos Avulsos permanece fisicamente exclusivo do Chris'
);

/* `gerenciaFunilNegocios` usa `sincronizarLeadsParaFunil()` e, portanto,
   consulta a coleção comercial `negocios`. Corrigir o null da Amanda não
   pode reabrir essa rota antiga por acidente. */
verificar(
  domPorPapel.includes("definirItemExclusivoNoDOM('gerenciaFunilNegocios',usuarioAtual==='Chris')"),
  'o painel legado que consulta negocios não existe no DOM da Amanda'
);

/* Amanda é a operadora dos extras. O contrato de menu e `irParaExtras`
   já a autorizam; a fronteira física de sessão não pode retirar sua única
   porta enquanto mantém a função autorizada. */
verificar(
  /['"]Amanda['"]\s*:\s*\[[^\]]*['"]navExtras['"]/.test(visibilidadePorFuncao) &&
  /\[['"]Chris['"],['"]Amanda['"]\]\.includes\(usuarioAtual\)/.test(irParaExtras),
  'matriz e ação canônica autorizam Extras para Amanda'
);
verificar(
  domPorPapel.includes("definirItemExclusivoNoDOM('navExtras',gestao)") ||
  /definirItemExclusivoNoDOM\(['"]navExtras['"],\s*\[['"]Chris['"],['"]Amanda['"]\]\.includes\(usuarioAtual\)\)/.test(domPorPapel),
  'navExtras permanece fisicamente presente para Amanda'
);

const ocultasAmanda = itensArrayPessoa(regrasSubabas, 'Amanda');
verificar(ocultasAmanda.includes('avulsos'),
  'Amanda continua impedida de chamar a rota avulsos');
verificar(ocultasAmanda.includes('funilNegocios'),
  'Amanda continua impedida de chamar a rota funilNegocios');

const posGuardaPapel = roteadorGerencia.indexOf("!['Chris','Amanda'].includes(usuarioAtual)");
const posGuardaSubaba = roteadorGerencia.indexOf('subabaOcultaPara(qual)');
const posPrimeiroPainel = roteadorGerencia.indexOf('document.getElementById(');
verificar(posGuardaPapel >= 0 && posGuardaSubaba > posGuardaPapel && posGuardaSubaba < posPrimeiroPainel,
  'guardas de papel e subaba executam antes de qualquer painel ou renderer');

/* Nó fisicamente removível nunca pode ser desreferenciado em linha única.
   Esse padrão transforma a privacidade correta do DOM em `null.style` para
   um papel ainda autorizado a usar as outras subabas. */
const exclusivosChris = new Set(
  [...domPorPapel.matchAll(/definirItemExclusivoNoDOM\(['"]([^'"]+)['"],\s*usuarioAtual\s*===\s*['"]Chris['"]\)/g)]
    .map(m => m[1])
);
const desreferenciasDiretas = [
  ...fonte.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)\.(style|classList|dataset|innerHTML|textContent|value)\b/g)
].map(m => ({ id:m[1], membro:m[2], indice:m.index }));
const exclusivasDesreferenciadas = desreferenciasDiretas.filter(x => exclusivosChris.has(x.id));
verificar(exclusivasDesreferenciadas.length === 0,
  'nenhum roteador comum desreferencia diretamente nó removível por papel',
  exclusivasDesreferenciadas.map(x => `${x.id}.${x.membro}`).join(', '));

verificar(!/document\.getElementById\(['"]gerenciaAvulsos['"]\)\.style/.test(roteadorGerencia),
  'setGerenciaSub tolera a ausência intencional de gerenciaAvulsos');
verificar(!/document\.getElementById\(['"]gerenciaFunilNegocios['"]\)\.style/.test(roteadorGerencia),
  'setGerenciaSub tolera a ausência intencional de gerenciaFunilNegocios');

verificar(caminhoPainel.includes("navegarGerenciaSub('agora')"),
  'Painel de controle aponta para a rota canônica Agora');
verificar(caminhoContextual.includes('setGerenciaSub(chave, el || null)'),
  'atalhos contextuais convergem no mesmo roteador protegido');
const posValidaView=roteadorPrincipal.indexOf("const viewDestino = document.getElementById('view-'+nome)");
const posDesativaViews=roteadorPrincipal.indexOf("document.querySelectorAll('.view')");
verificar(posValidaView>=0 && posValidaView<posDesativaViews &&
  roteadorPrincipal.includes('if(!viewDestino)') &&
  roteadorPrincipal.includes("mostrarToast('Esta área não está disponível para este perfil.'"),
  'roteador principal valida view removida antes de desmontar a tela atual');
verificar(!/\n\s*el\.classList\.add\(['"]active['"]\)/m.test(roteadorPrincipal) &&
  roteadorPrincipal.includes('if(el?.classList)'),
  'roteador principal tolera botão ausente sem null.classList');
verificar(roteadorPrincipal.includes("viewDestino.classList.add('active')") &&
  !/document\.getElementById\(['"]view-['"]\+nome\)\.classList/.test(roteadorPrincipal),
  'roteador principal ativa somente a view previamente validada');

const renderFunil = trecho('window.renderFunilNegocios = async function', 'window.abrirValorContratoCliente');
const renderAvulsos = trecho('window.renderClientesAvulsos = async function', 'window.__abaFicha');
verificar(renderFunil.includes('sincronizarLeadsParaFunil()'),
  'teste reconhece que funilNegocios é consumidor comercial');
const guardaFunil = renderFunil.search(/(?:usuarioAtual|pessoaDesteRender)\s*!==\s*['"]Chris['"]/);
verificar(guardaFunil >= 0 && guardaFunil < renderFunil.indexOf('sincronizarLeadsParaFunil()'),
  'renderer funilNegocios bloqueia papel indevido antes da leitura comercial');
verificar(renderAvulsos.includes("pessoaDesteRender !== 'Chris'") &&
  renderAvulsos.indexOf("pessoaDesteRender !== 'Chris'") < renderAvulsos.indexOf('sincronizarLeadsParaFunil()'),
  'renderer avulsos ainda bloqueia Amanda antes da rede');

if(falhas.length){
  console.error(`\nREGRESSÃO V112 GERÊNCIA/AMANDA: FALHA REPRODUZIDA (${falhas.length}/${total})`);
  for(const falha of falhas) console.error(' - ' + falha.mensagem + (falha.detalhe ? ': ' + falha.detalhe : ''));
  process.exitCode = 1;
}else{
  console.log(`\nREGRESSÃO V112 GERÊNCIA/AMANDA: APROVADA (${total} verificações)`);
}
