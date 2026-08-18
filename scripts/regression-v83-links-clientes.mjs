import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const regras=fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8');
const calendario=fs.readFileSync(path.join(raiz,'calendario.html'),'utf8');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
let total=0;
function exigir(c,m){ if(!c) throw new Error('FALHOU: '+m); total++; }
function trecho(f,i,fim){const a=f.indexOf(i),b=f.indexOf(fim,a+i.length);exigir(a>=0&&b>a,'trecho '+i+' existe');return f.slice(a,b);}

function tokenValido({acesso,tokenDoc,cliente,token,agora}){
  const vigente=d=>!d?.ativoAte||agora<d.ativoAte;
  const acessoAtivo=!!acesso&&acesso.ativo!==false&&vigente(acesso);
  const canonico=acessoAtivo&&acesso.token===token;
  const historico=!!tokenDoc&&tokenDoc.cliente===cliente&&tokenDoc.ativo!==false&&vigente(tokenDoc)&&(!acesso||acessoAtivo);
  return canonico||historico;
}

exigir(tokenValido({acesso:{ativo:true,token:'novo'},tokenDoc:{cliente:'vitalle',ativo:true},cliente:'vitalle',token:'antigo',agora:10}),
  'cliente ativo conserva link historico ativo do proprio cliente');
exigir(!tokenValido({acesso:{ativo:false,token:'novo'},tokenDoc:{cliente:'vitalle',ativo:true},cliente:'vitalle',token:'antigo',agora:10}),
  'saida do cliente revoga inclusive link historico ainda marcado ativo');
exigir(!tokenValido({acesso:{ativo:true,token:'novo'},tokenDoc:{cliente:'outro',ativo:true},cliente:'vitalle',token:'antigo',agora:10}),
  'token de outro cliente nunca atravessa a identidade');
exigir(!tokenValido({acesso:{ativo:true,token:'novo'},tokenDoc:{cliente:'vitalle',ativo:false},cliente:'vitalle',token:'antigo',agora:10}),
  'reativacao nao ressuscita token historico desativado');
exigir(!tokenValido({acesso:{ativo:true,token:'novo',ativoAte:9},tokenDoc:{cliente:'vitalle',ativo:true},cliente:'vitalle',token:'antigo',agora:10}),
  'vigencia expirada do cliente bloqueia todos os links');

const portal=trecho(regras,'function tokenPortalValido(cliente, token)','    function urlHttpsOuVazia');
exigir(portal.includes('tokenPortalHistoricoAtivo(cliente, token)'),'regra reutiliza helper restrito para link historico');
exigir(portal.includes('acessoPortalCanonicoAtivo(cliente)'),'token antigo depende do acesso atual continuar ativo');
const helper=trecho(regras,'function acessoPortalCanonicoAtivo','    function tokenPortalValido');
exigir(helper.includes('clientes_portal_tokens/$(token)')&&helper.includes('.data.cliente == cliente'),'helper exige documento do token e mesmo cliente');
exigir(helper.includes(".data.ativo != false")&&helper.includes('acessoDentroDaVigencia'),'helper exige token e acesso dentro da vigencia');

exigir(calendario.includes('function mesesLiberados()'),'calendario mantem seletor de competencias liberadas');
exigir(calendario.includes('const meses = equipe ? mesesExistentes() : mesesLiberados()'),'cliente navega somente entre meses liberados, sem ver rascunhos');
exigir(calendario.includes("pedido && lib.includes(pedido) ? pedido"),'mes solicitado abre quando esta liberado');

const resolver=trecho(escritorio,'function resolverMesParaLinkCalendario','  window.resolverMesParaLinkCalendario');
exigir(resolver.includes("estadoMesCal(cal,pedido)==='liberado'")&&resolver.includes('return pedido'),'copiador aceita qualquer competência explicitamente já liberada');
exigir(resolver.includes('A primeira liberação operacional é somente'),'mês não liberado continua sujeito ao próximo ciclo operacional');
exigir(resolver.indexOf("estadoMesCal(cal,pedido)==='liberado'")<resolver.indexOf('pedido!==operacional'),'arquivo liberado é reconhecido antes da barreira de primeira liberação');

console.log(`REGRESSAO V83 LINKS DE CLIENTES: OK (${total} verificacoes)`);
