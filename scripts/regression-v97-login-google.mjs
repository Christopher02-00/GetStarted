#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const regras=fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8');
let total=0;
function exigir(condicao,mensagem){total++;if(!condicao)throw new Error('V97 LOGIN GOOGLE: '+mensagem);console.log('PASS ',mensagem);}
function trecho(inicio,fim){
  const a=escritorio.indexOf(inicio),b=escritorio.indexOf(fim,a+inicio.length);
  if(a<0||b<0)throw new Error('V97 LOGIN GOOGLE: trecho ausente '+inicio);
  return escritorio.slice(a,b);
}

exigir(escritorio.includes('2026-08-21-controle-conclusao-calendarios-v101')&&
  escritorio.includes('signInWithPopup(auth,provedor)')&&escritorio.includes('signInWithRedirect(auth,provedor)'),
  'V101 preserva integralmente o fluxo de login introduzido na V97');
exigir(escritorio.includes('signInWithPopup, signInWithRedirect, getRedirectResult'),'SDK Auth não importa popup, redirect e retorno juntos');
exigir(escritorio.includes('id="btnLoginRedirectEquipe"')&&escritorio.includes('Entrar nesta aba'),'fallback explícito não existe no gate');

const popup=trecho('window.entrarComGoogleEquipe = async function','  window.entrarComRedirectEquipe');
const indicePopup=popup.indexOf('signInWithPopup(auth,provedor)');
const antesPopup=popup.slice(0,indicePopup).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
exigir(indicePopup>=0&&!/\bawait\b/.test(antesPopup),'popup deixou de ser a primeira operação assíncrona do gesto');
exigir(popup.includes("mostrarFallbackRedirectEquipe(e)")&&!popup.includes('signInWithRedirect('),'fechamento do popup redireciona automaticamente ou não oferece fallback');

const redirect=trecho('window.entrarComRedirectEquipe = function','  async function processarRetornoRedirectEquipe');
exigir(redirect.includes('marcarSentinelaRedirectEquipe()')&&redirect.includes('signInWithRedirect(auth,provedor)'),'ação explícita não marca estado antes do redirect');
exigir(!/\bawait\b/.test(redirect.slice(0,redirect.indexOf('signInWithRedirect(auth,provedor)'))),'fallback perdeu o gesto por espera anterior ao redirect');

const retorno=trecho('async function processarRetornoRedirectEquipe','  window.sairDoEscritorio');
exigir(retorno.includes('getRedirectResult(auth)')&&retorno.includes('aguardarRetornoRedirectEquipe(retorno)')&&escritorio.includes('auth/redirect-timeout'),'retorno não possui getRedirectResult e timeout controlado');
exigir(retorno.includes('limparSentinelaRedirectEquipe()')&&retorno.includes("auth/redirect-cancelled")&&retorno.includes("auth/redirect-expired"),'sentinela não é limpa em cancelamento/expiração');
exigir(escritorio.includes('limparSentinelaRedirectEquipe();\n    try{ await signOut(auth);'),'logout não limpa o estado de redirect');
exigir(escritorio.includes('aplicarUsuarioGoogleCoordenado')&&escritorio.includes('__aplicacaoAuthEquipePromessa'),'popup/redirect podem duplicar a aplicação da identidade');
exigir(escritorio.includes('window.__retornoRedirectAuthEquipe=processarRetornoRedirectEquipe();'),'getRedirectResult não é processado na inicialização');
const autorizacao=trecho('async function pessoaAutorizadaPeloGoogle','  function limparIdentidadeEquipeAnterior');
exigir(autorizacao.includes("user?.emailVerified !== true")&&autorizacao.includes("usuarios_equipe")&&autorizacao.includes("snap.data().ativo === true"),'fallback enfraqueceu a autorização de conta');
const aplicacao=trecho('async function aplicarUsuarioGoogle(user)','  function aplicarUsuarioGoogleCoordenado');
exigir(aplicacao.includes('if(!autorizado)')&&aplicacao.includes('Este e-mail não está autorizado'),'conta não autorizada deixou de permanecer no gate');

const authInicio=escritorio.indexOf('const CHAVE_REDIRECT_AUTH_EQUIPE');
const authFim=escritorio.indexOf('/* ===== FASE 11',authInicio);
const blocoAuth=escritorio.slice(authInicio,authFim);
exigir(!blocoAuth.includes("collection(db,")&&!blocoAuth.includes('getDocs('),'fallback introduziu leitura Firestore antes da identidade');
exigir(regras===fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8'),'teste detectou alteração inesperada de regras');

const fonteSentinela=trecho('const CHAVE_REDIRECT_AUTH_EQUIPE','  /* Safari móvel exige');
const fonteFallback=trecho('function mostrarFallbackRedirectEquipe','  function liberarGateEquipe');
const fonteFluxos=trecho('function mensagemErroLoginGoogleEquipe','  window.sairDoEscritorio');

function criarCenario(opcoes={}){
  const elementos={
    btnLoginGoogleEquipe:{disabled:false,textContent:'Continuar com Google',style:{}},
    btnLoginRedirectEquipe:{disabled:false,textContent:'Entrar nesta aba',style:{}},
    authEquipeErro:{textContent:'',style:{display:'none'}},
    authEquipeFallbackRedirect:{style:{display:'none'}}
  };
  const memoria=new Map();
  const estado={popup:0,redirect:0,retorno:0,aplicacoes:0,gates:[]};
  const contexto=vm.createContext({
    console,Date,Promise,JSON,Number,String,Object,Array,setTimeout,clearTimeout,
    window:{__uid:'',__ultimoErroLoginGoogleEquipe:null},
    document:{getElementById:id=>elementos[id]||null},
    sessionStorage:{getItem:k=>memoria.has(k)?memoria.get(k):null,setItem:(k,v)=>memoria.set(k,String(v)),removeItem:k=>memoria.delete(k)},
    auth:{currentUser:opcoes.currentUser||null},
    GoogleAuthProvider:class{setCustomParameters(v){this.parametros=v;}},
    signInWithPopup(){estado.popup++;return opcoes.popup?opcoes.popup():Promise.resolve({user:{uid:'chris',email:'chris@example.test'}});},
    signInWithRedirect(){estado.redirect++;return opcoes.redirect?opcoes.redirect():new Promise(()=>{});},
    getRedirectResult(){estado.retorno++;return opcoes.retorno?opcoes.retorno():Promise.resolve(null);},
    mostrarGateEquipe(msg){estado.gates.push(String(msg||''));},
    aplicarUsuarioGoogleCoordenado(user){estado.aplicacoes++;return opcoes.aplicar?opcoes.aplicar(user,estado):Promise.resolve(true);},
    __persistenciaAuthEquipePronta:true,
    __loginGoogleEquipeEmCurso:false,
    __preparoPersistenciaAuthEquipe:Promise.resolve()
  });
  const fonteSentinelaCenario=opcoes.timeoutCurto?fonteSentinela.replace('LIMITE_RETORNO_REDIRECT_AUTH_EQUIPE_MS = 12000','LIMITE_RETORNO_REDIRECT_AUTH_EQUIPE_MS = 5'):fonteSentinela;
  new vm.Script(`${fonteSentinelaCenario}\n${fonteFallback}\n${fonteFluxos}\n`+
    `globalThis.api={entrar:window.entrarComGoogleEquipe,entrarRedirect:window.entrarComRedirectEquipe,processar:processarRetornoRedirectEquipe,marcar:marcarSentinelaRedirectEquipe,ler:lerSentinelaRedirectEquipe,limpar:limparSentinelaRedirectEquipe,mensagemErroLoginGoogleEquipe};`,
    {filename:'v97-login-sandbox.js'}).runInContext(contexto);
  return {api:contexto.api,elementos,memoria,estado,contexto};
}

{
  let liberarPopup;
  const c=criarCenario({popup:()=>new Promise(resolve=>{liberarPopup=resolve;})});
  const primeira=c.api.entrar();
  const dupla=c.api.entrar();
  exigir(c.estado.popup===1,'primeiro clique não chama popup exatamente uma vez');
  exigir(await dupla===false,'clique duplo abriu outra autenticação');
  liberarPopup({user:{uid:'chris',email:'chris@example.test'}});
  exigir(await primeira===true&&c.estado.aplicacoes===1,'popup normal não continua pela cadeia única de identidade');
  exigir(c.estado.redirect===0&&c.elementos.btnLoginGoogleEquipe.textContent==='Continuar com Google','popup normal acionou redirect ou deixou botão preso');
}

{
  const c=criarCenario({popup:()=>Promise.reject({code:'auth/popup-closed-by-user'})});
  exigir(await c.api.entrar()===false,'popup fechado foi tratado como sucesso');
  exigir(c.estado.redirect===0,'popup fechado iniciou redirect automático');
  exigir(c.elementos.authEquipeFallbackRedirect.style.display==='block','popup fechado não revelou a segunda ação explícita');
  exigir(c.estado.gates.at(-1).includes('auth/popup-closed-by-user'),'mensagem escondeu o código real do popup');
  exigir(c.api.entrarRedirect()===true&&c.estado.redirect===1&&!!c.api.ler(),'fallback explícito não iniciou redirect com sentinela');
  exigir(c.api.entrarRedirect()===false&&c.estado.redirect===1,'clique duplo no fallback iniciou segundo redirect');
}

{
  const c=criarCenario({retorno:()=>Promise.resolve({user:{uid:'chris',email:'chris@example.test'}})});
  c.api.marcar();
  exigir(await c.api.processar()===true&&c.estado.retorno===1&&c.estado.aplicacoes===1,'retorno do redirect não aplica a identidade exatamente uma vez');
  exigir(c.api.ler()===null,'sucesso do redirect não limpou a sentinela');
  exigir(c.elementos.btnLoginGoogleEquipe.disabled===false&&c.elementos.btnLoginGoogleEquipe.textContent==='Continuar com Google','retorno deixou o botão preso');
}

{
  const c=criarCenario({retorno:()=>Promise.resolve(null)});
  c.api.marcar();
  exigir(await c.api.processar()===false&&c.estado.gates.at(-1).includes('auth/redirect-cancelled'),'cancelamento do redirect não aparece com código honesto');
  exigir(c.api.ler()===null,'cancelamento do redirect não limpou a sentinela');
  const gatesAntes=c.estado.gates.length;
  exigir(await c.api.processar()===false&&c.estado.gates.length===gatesAntes,'recarregamento sem sentinela criou loop/mensagem nova');
}

{
  const c=criarCenario({retorno:()=>Promise.resolve(null),currentUser:{uid:'chris',email:'chris@example.test'}});
  c.api.marcar();
  exigir(await c.api.processar()===true&&c.estado.aplicacoes===1,'sessão já existente não conclui o retorno sem nova autenticação');
  exigir(c.api.ler()===null&&c.estado.popup===0&&c.estado.redirect===0,'sessão existente abriu outro popup/redirect ou manteve sentinela');
}

{
  const c=criarCenario({retorno:()=>Promise.reject({code:'auth/network-request-failed'})});
  c.api.marcar();
  exigir(await c.api.processar()===false&&c.estado.gates.at(-1).includes('auth/network-request-failed'),'erro do provedor foi ocultado');
  exigir(c.api.ler()===null,'erro do provedor não limpou a sentinela');
}

{
  const c=criarCenario({redirect:()=>{throw {code:'auth/operation-not-allowed'};}});
  exigir(c.api.entrarRedirect()===false&&c.estado.gates.at(-1).includes('auth/operation-not-allowed'),'erro síncrono do redirect deixou botão/sentinela presos');
  exigir(c.api.ler()===null&&c.elementos.btnLoginGoogleEquipe.disabled===false,'falha síncrona do redirect não restaurou o estado');
}

{
  const c=criarCenario({retorno:()=>new Promise(()=>{}),timeoutCurto:true});
  c.api.marcar();
  exigir(await c.api.processar()===false&&c.estado.gates.at(-1).includes('auth/redirect-timeout'),'timeout do retorno não libera o gate com código explícito');
  exigir(c.api.ler()===null,'timeout não limpou a sentinela');
}

{
  const c=criarCenario({retorno:()=>Promise.resolve(null)});
  c.memoria.set('gs_auth_redirect_equipe_v1',JSON.stringify({versao:1,criadoEm:Date.now()-11*60*1000}));
  exigir(await c.api.processar()===false&&c.estado.gates.at(-1).includes('auth/redirect-expired'),'sentinela expirada não foi recusada com mensagem honesta');
  exigir(c.api.ler()===null,'sentinela expirada não foi removida');
}

{
  const c=criarCenario({aplicar:(user,estado)=>{estado.gates.push('Este e-mail não está autorizado');return Promise.resolve(false);}});
  exigir(await c.api.entrar()===true&&c.estado.aplicacoes===1&&c.estado.gates.at(-1).includes('não está autorizado'),'conta não autorizada escapou da mesma cadeia de bloqueio');
}

{
  const c=criarCenario({popup:()=>Promise.reject({code:'auth/operation-not-allowed'})});
  await c.api.entrar();
  exigir(c.elementos.authEquipeFallbackRedirect.style.display==='none','erro não relacionado a popup ofereceu redirect indevido');
}

console.log(`REGRESSÃO V97 LOGIN GOOGLE: APROVADA (${total} verificações)`);
