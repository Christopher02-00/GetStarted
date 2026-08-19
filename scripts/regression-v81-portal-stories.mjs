#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('V81 Portal/Stories: '+mensagem); console.log('PASS ',mensagem); }
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('V81 Portal/Stories: trecho ausente '+inicio);
  return fonte.slice(a,b);
}

const entrada=trecho(portal,'window.entrarPortal = function','  window.sairPortal = function');
exigir(entrada.includes("tokenConfirmado||new URLSearchParams(location.search).get('t')||localStorage.getItem('portalClienteToken')")&&
  entrada.includes("if(tokenPersistir) localStorage.setItem('portalClienteToken',tokenPersistir)"),'reentrada sem parâmetros preserva o token local já confirmado');
exigir(!entrada.includes("localStorage.setItem('portalClienteToken','')")&&!entrada.includes('localStorage.setItem("portalClienteToken","")'),'entrada nunca substitui token válido por string vazia');

const inicializacao=trecho(portal,"window.addEventListener('DOMContentLoaded', async () => {",'</script>');
exigir(inicializacao.includes("const token = slugUrl ? tokenUrl : localStorage.getItem('portalClienteToken')")&&
  /window\.entrarPortal\(slug,\s*escopo\.nome,\s*escopo,\s*token\)/.test(inicializacao),'autoentrada repassa à sessão o token da URL ou o token local confirmado');

const fonteTimeout=trecho(portal,'function comTimeoutPortal','  const auth = getAuth(app);');
const contextoTimeout={Promise,setTimeout,clearTimeout,Error}; vm.createContext(contextoTimeout);
new vm.Script(`${fonteTimeout}\nglobalThis.api=comTimeoutPortal;`).runInContext(contextoTimeout);
exigir(await contextoTimeout.api(Promise.resolve('confirmado'),'leitura rápida',30)==='confirmado','timeout preserva uma leitura confirmada dentro do prazo');
let erroTimeout=null;
try{ await contextoTimeout.api(new Promise(()=>{}),'Stories',15); }catch(e){ erroTimeout=e; }
exigir(erroTimeout?.code==='gs/timeout-leitura'&&String(erroTimeout.message).includes('Stories'),'leitura sem resposta termina com erro explícito, não com lista vazia');

const fonteEscopo=trecho(portal,'const CLIENTES_SO_EDICAO','  function aplicarEscopoPortal');
const contextoEscopo={window:{}}; vm.createContext(contextoEscopo);
new vm.Script(`${fonteEscopo}\nglobalThis.api=escopoPortalDaFicha;`).runInContext(contextoEscopo);
exigir(contextoEscopo.api('cliente-a',{nome:'A'},{incluiStories:false},true).incluiStories===false,'false explícito da ficha continua soberano sobre qualquer histórico');
exigir(contextoEscopo.api('cliente-a',{nome:'A'},{},true).incluiStories===true,'cadastro legado confirmado com histórico mantém a aba Stories');
exigir(contextoEscopo.api('cliente-a',{nome:'A'},{},false).incluiStories===false,'ausência confirmada de histórico não inventa serviço contratado');
exigir(contextoEscopo.api('cliente-a',{nome:'A'},{},null).incluiStories===true,'falha não confirmada do histórico preserva a aba em vez de escondê-la');
exigir(contextoEscopo.api('rodrigo',{nome:'Rodrigo'},{},null).incluiStories===false,'plano só edição continua sem Stories mesmo durante falha de leitura');

const descobertaHistorico=trecho(portal,'let temHistoricoStories=','    const escopo=escopoPortalDaFicha');
exigir(descobertaHistorico.includes('let temHistoricoStories=null'),'histórico de Stories começa desconhecido, não como ausência falsa');
exigir(descobertaHistorico.includes('comTimeoutPortal')&&descobertaHistorico.includes("stories_semanais"),'descoberta inicial de Stories também tem limite de leitura');
exigir(descobertaHistorico.includes('localStorage.getItem')&&descobertaHistorico.includes('localStorage.setItem')&&/stories/i.test(descobertaHistorico),'última confirmação de escopo fica disponível para uma falha posterior');

const stories=trecho(portal,'async function carregarStories()','  /* ===== SUA PROPOSTA');
exigir((stories.match(/comTimeoutPortal\(/g)||[]).length>=2,'conteúdo semanal e documento de links possuem timeouts independentes');
exigir(stories.includes('Promise.allSettled'),'falha dos links é separada da falha do conteúdo principal');
exigir(stories.includes('__storiesPortalConfirmado')&&stories.includes('cacheDaSemana')&&/últim[oa] (?:versão|retrato) confirmad[oa]/i.test(stories),'falha do Firestore reutiliza o último retrato confirmado sem declarar vazio');
exigir(/linksConfirmad|falhaLinks|leituraLinks/.test(stories)&&/links[^<\n]*(indispon|confirm)/i.test(stories),'estado indisponível dos links aparece explicitamente e não é tratado como ausência');
exigir(!/getDoc\(doc\(db,'stories_links'[\s\S]{0,300}catch\([\s\S]{0,180}return null/.test(stories),'erro ao ler links não é convertido em documento inexistente');
exigir(stories.includes("codigoLinks.includes('permission-denied')")&&stories.includes('Os links desta semana ainda não foram liberados')&&stories.includes('Não consegui confirmar os links desta semana agora'),'Portal distingue link interno não liberado de falha real de rede sem declarar ausência');

exigir(/urlHttpsSeguraPortal\(d\?*\.link\)/.test(stories)&&stories.includes('urlHttpsSeguraPortal(s.linkReferencia)'),'links de documentos e referências passam pelo mesmo validador HTTPS');
exigir(stories.includes('escAttr(')&&(stories.match(/rel="noopener noreferrer"/g)||[]).length>=2,'URLs de Stories são escapadas como atributo e abrem sem acesso à janela de origem');
exigir(!stories.includes('href="${esc(d.link)}"')&&!stories.includes("href=\"'+esc(s.linkReferencia)+'\""),'renderização antiga de URL sem escape de atributo foi removida');

const fonteUrl=trecho(portal,'function urlHttpsSeguraPortal','  async function carregarFichaPortalSegura');
const contextoUrl={URL}; vm.createContext(contextoUrl);
new vm.Script(`${fonteUrl}\nglobalThis.api=urlHttpsSeguraPortal;`).runInContext(contextoUrl);
exigir(contextoUrl.api('https://drive.google.com/document/d/abc')==='https://drive.google.com/document/d/abc','validador conserva link HTTPS válido');
exigir(contextoUrl.api('javascript:alert(1)')===''&&contextoUrl.api('http://exemplo.com')===''&&contextoUrl.api('https://u:p@exemplo.com')==='','validador recusa protocolos e credenciais inseguras');

const scripts=[...portal.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
for(const bloco of scripts){
  if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
  else new vm.Script(bloco[2]);
}
exigir(true,'portal-cliente.html mantém JavaScript inline sintaticamente válido');

console.log(`RESULTADO: APROVADO (${total} asserções V81 Portal/Stories)`);
