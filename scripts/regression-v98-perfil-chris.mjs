#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = nome => fs.readFileSync(path.join(raiz, nome), 'utf8');
const escritorio = ler('escritorio.html');
const calendario = ler('calendario.html');
const calendarios = ler('calendarios.html');
const regras = ler('firestore.rules');
let total = 0;

function exigir(condicao, mensagem){
  total++;
  if(!condicao) throw new Error('V98 PERFIL CHRIS: ' + mensagem);
  console.log('PASS ', mensagem);
}

function trecho(fonte, inicio, fim){
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) throw new Error('V98 PERFIL CHRIS: trecho ausente ' + inicio);
  return fonte.slice(a, b);
}

function sha256(texto){
  return crypto.createHash('sha256').update(texto).digest('hex');
}

exigir(escritorio.includes('2026-08-21-restaura-perfil-chris-v98'), 'build V98 presente');
exigir(escritorio.includes('gs-parent-patch" content="2026-08-21-login-google-redirect-v97'), 'V98 preserva V97 como pai');
exigir(escritorio.includes('gs-grandparent-patch" content="2026-08-21-operacao-perfis-chris-v96'), 'V98 preserva V96 como avô');
exigir(!escritorio.includes('atualizarBannerAuditoriaChris'), 'identificador removido da auditoria V95 não reapareceu');
exigir((escritorio.match(/function atualizarBannerOperacaoPerfilChris\s*\(/g) || []).length === 1, 'banner operacional possui uma definição canônica');

const mudar = trecho(escritorio, 'window.mudarUsuarioGlobal = async function', '/* ===== FRENTE C1');
const posIdentidade = mudar.indexOf('usuarioAtual = escolhido');
const posBanner = mudar.indexOf('atualizarBannerOperacaoPerfilChris()');
const posToggle = mudar.indexOf("document.body.classList.toggle('semUsuario', !escolhido)");
const posIsolamento = mudar.indexOf('atualizarVisibilidadeMenuPorFuncao()');
const posLeitura = mudar.indexOf("await etapaSegura('abrir sessão da equipe'");
exigir(posIdentidade >= 0 && posBanner > posIdentidade, 'banner é sincronizado depois de definir o papel atual');
exigir(posToggle > posBanner, 'inicialização alcança a liberação visual depois do banner');
exigir(posIsolamento > posToggle && posLeitura > posIsolamento, 'DOM é isolado antes da primeira leitura remota');

const limparIdentidade = trecho(escritorio, 'function limparIdentidadeEquipeAnterior', 'async function aplicarUsuarioGoogle');
exigir(limparIdentidade.includes("document.getElementById('bannerOperacaoPerfilChris')?.remove()"), 'troca de conta remove o banner operacional anterior');
exigir(limparIdentidade.includes("document.body.classList.remove('modoOperacaoPerfilChris')"), 'troca de conta remove a classe operacional anterior');

const perfis = trecho(escritorio, 'function atualizarBannerOperacaoPerfilChris', '/* ===== AS FILAS VIRARAM BOTÃO AMARELO');
exigir(perfis.includes("window.__pessoaAutenticadaReal !== 'Chris' || !window.__operacaoDelegadaChris"), 'banner exige identidade real Chris e delegação ativa');
exigir((perfis.match(/atualizarBannerOperacaoPerfilChris\(\)/g) || []).length >= 3, 'entrada, saída e sincronização usam o mesmo banner');
exigir(perfis.includes("window.__operacaoDelegadaChris = ''") && perfis.includes("seletor.value = 'Chris'"), 'retorno limpa a delegação e restaura Chris');
exigir(perfis.includes('await window.mudarUsuarioGlobal()'), 'entrada e retorno reconstruem a jornada pelo inicializador canônico');

/* Reprodução executável da fase que quebrava em produção. O trecho termina
   logo após sincronizar o banner, antes de qualquer leitura ou listener.
   Na V97 ele lança ReferenceError; na V98 precisa aplicar Chris sem falhar. */
const marcadorDepoisDoBanner = '    /* Indicadores incluem regras por pessoa';
const prefixoMudar = mudar.slice(0, mudar.indexOf(marcadorDepoisDoBanner)) +
  "\n    return { escolhido, usuarioAtual, bannerSincronizado: true };\n  };";
const bannerFonte = trecho(escritorio, 'function atualizarBannerOperacaoPerfilChris', 'window.abrirOperacaoPerfisChris');
const classes = new Set(['semUsuario']);
const seletor = { value: 'Chris' };
const contexto = vm.createContext({
  console,
  window: { __pessoaAutenticadaReal: 'Chris', __operacaoDelegadaChris: '' },
  document: {
    body: { classList: { add:n=>classes.add(n), remove:n=>classes.delete(n), contains:n=>classes.has(n) } },
    getElementById: id => id === 'euSouGlobal' ? seletor : null,
    createElement: () => ({ style:{}, remove(){}, innerHTML:'' })
  },
  limparEstadoVideosPorTrocaDePapel(){ contexto.__limpezas = (contexto.__limpezas || 0) + 1; },
  esc: valor => String(valor || ''),
  usuarioAtual: ''
});
new vm.Script(`${bannerFonte}\n${prefixoMudar}\nglobalThis.api={mudar:window.mudarUsuarioGlobal};`, { filename:'v98-inicializacao-chris-sandbox.js' }).runInContext(contexto);
const resultado = await contexto.api.mudar();
exigir(resultado?.escolhido === 'Chris' && resultado?.usuarioAtual === 'Chris', 'Chris atravessa a antiga linha de falha sem ReferenceError');
exigir(contexto.__limpezas === 1, 'limpeza de estado anterior continua antes da reconstrução');
exigir(!classes.has('modoOperacaoPerfilChris'), 'Chris normal não herda o modo delegado');

exigir(escritorio.includes('signInWithPopup(auth,provedor)') && escritorio.includes('signInWithRedirect(auth,provedor)'), 'fallback V97 permanece preservado');
exigir(calendario === calendarios, 'calendario.html e calendarios.html continuam idênticos');
exigir(sha256(regras) === '5bd436eed9cc0512674e286e4349051337e1d365b61b62a64ed93a2332109350', 'firestore.rules permanece inalterada');

console.log(`REGRESSÃO V98 PERFIL CHRIS: APROVADA (${total} verificações)`);
