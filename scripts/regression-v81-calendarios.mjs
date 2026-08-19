#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const portal=ler('portal-cliente.html');
const calendario=ler('calendario.html');
const calendarios=ler('calendarios.html');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('V81: '+mensagem); console.log('PASS ',mensagem); }
function trecho(fonte,inicio,fim){ const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('V81: trecho ausente '+inicio); return fonte.slice(a,b); }
function deveFalhar(fn,parte){ try{ fn(); }catch(e){ return String(e?.message||e).includes(parte); } return false; }
function falhaQualquer(fn){ try{ fn(); }catch(e){ return true; } return false; }

exigir(calendario===calendarios,'calendario.html e calendarios.html continuam byte a byte idênticos');

const aberturaInterna=trecho(escritorio,'window.abrirCalendarioFerramentas = async function','  /* ===== REFERENCIAS DE PERFIL');
exigir(aberturaInterna.includes("'&interno=1&mes='")&&!aberturaInterna.includes('garantirTokensDoCliente('),'editor aberto no Escritório usa a sessão Google da equipe e não depende da credencial externa do cliente');
const portaCalendario=trecho(calendario,'const firebaseConfig =','</script>');
exigir(portaCalendario.includes("const modoInternoEquipe = params.get('interno') === '1'")&&portaCalendario.includes('? initializeApp(firebaseConfig)')&&portaCalendario.includes('aguardarEquipeAutenticada()'),'calendário interno reutiliza o app padrão e espera uma sessão Google não anônima');
exigir(portaCalendario.includes("initializeApp(firebaseConfig, 'getstarted-public')")&&portaCalendario.includes('signInAnonymously(auth)')&&portaCalendario.includes('if(!tokenCliente && !tokenEquipe)'),'links externos continuam isolados, anônimos e obrigatoriamente protegidos por token');
exigir(portaCalendario.indexOf('if(modoInternoEquipe)')<portaCalendario.indexOf('await autenticarCalendarioComRetry()'),'modo interno é resolvido antes de qualquer autenticação anônima');

const competenciaCalendario=trecho(calendario,'function competenciaAtualDoCalendario','/* O mês que está sendo visto agora.');
const contextoCompetencia={};
vm.createContext(contextoCompetencia);
new vm.Script(`${competenciaCalendario}\nglobalThis.api={operacional:competenciaOperacionalDoCalendario,ehOperacional:mesEhCompetenciaOperacional};`).runInContext(contextoCompetencia);
exigir(contextoCompetencia.api.operacional('2026-08-18T12:00:00')==='2026-09','agosto de 2026 opera exclusivamente setembro de 2026');
exigir(contextoCompetencia.api.operacional('2026-12-18T12:00:00')==='2027-01','dezembro faz a virada operacional para janeiro do ano seguinte');
exigir(contextoCompetencia.api.ehOperacional('2026-09','2026-08-18T12:00:00')===true&&contextoCompetencia.api.ehOperacional('2026-10','2026-08-18T12:00:00')===false,'calendário distingue mês seguinte de outros meses futuros');

const mesInicial=trecho(calendario,'function mesInicialEquipe','let saveTimer=');
exigir(mesInicial.includes('competenciaOperacionalDoCalendario()')&&
  mesInicial.includes('if(mesPertenceAoPeriodoDoSite(pedido)) return pedido')&&
  mesInicial.includes('PRIMEIRA_COMPETENCIA_CALENDARIO_SITE'),
  'a equipe usa o próximo mês como sugestão, abre qualquer competência válida solicitada e respeita julho de 2026');

const salvarCliente=trecho(calendario,'async function salvarComoCliente','/* Redesenha sem passar pelo save()');
const patchCliente=(salvarCliente.match(/transacao\.set\(docRef,\{([\s\S]*?)\},\{merge:true\}\)/)||[])[1]||'';
exigir(salvarCliente.includes('runTransaction')&&salvarCliente.includes('await transacao.get(docRef)'),'ação do cliente relê o calendário dentro da transação');
exigir(['items:itens','comments:comentarios','updatedAt:'].every(chave=>patchCliente.includes(chave)),'ação do cliente grava somente itens, comentários e carimbo de atualização');
exigir(!/ultimaAcaoDoCliente|aprovacaoInterna|aprovacaoMeses|\bclient\s*:|\bmonth\s*:/.test(patchCliente)&&salvarCliente.includes('{merge:true}'),'patch do cliente não reenvia estado interno, identidade ou documento inteiro');

const cargaCalendario=trecho(calendario,'async function load()','function save(){');
exigir(cargaCalendario.includes('timerPrimeiroSnapshot=setTimeout')&&cargaCalendario.includes('},12000)'),'primeiro snapshot tem limite explícito de 12 segundos');
exigir(cargaCalendario.includes('Nada foi considerado vazio')&&cargaCalendario.includes('clearTimeout(timerPrimeiroSnapshot)'),'timeout não converte falha em vazio e é cancelado quando há resposta');

const fonteResolver=trecho(escritorio,'function resolverMesParaLinkCalendario','  window.resolverMesParaLinkCalendario');
const contexto={};
vm.createContext(contexto);
new vm.Script(`
  function competenciaCalendarioAtual(ref){const d=ref instanceof Date?ref:new Date(ref||Date.now());return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  function competenciaSeguinte(m){const [a,mm]=m.split('-').map(Number);const d=new Date(a,mm,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  function competenciaOperacionalCalendario(ref){return competenciaSeguinte(competenciaCalendarioAtual(ref));}
  function mesPertenceAoPeriodoDoSite(mes){return /^20\\d{2}-(0[1-9]|1[0-2])$/.test(String(mes||''))&&String(mes)>='2026-07';}
  function mesesDeCalendario(cal){return [...new Set((cal.items||[]).map(i=>i.mes).filter(Boolean))].sort();}
  function itensDoMesCalendario(cal,mes){return (cal.items||[]).filter(i=>i.mes===mes);}
  function estadoMesCal(cal,mes){return cal.aprovacaoMeses?.[mes]?.status||'rascunho';}
  ${fonteResolver}
  globalThis.api=resolverMesParaLinkCalendario;
`).runInContext(contexto);

const agosto='2026-08-18T12:00:00';
const varios={items:[{mes:'2026-08',name:'Agosto'},{mes:'2026-09',name:'Setembro'},{mes:'2026-10',name:'Outubro'}],aprovacaoMeses:{'2026-08':{status:'liberado'},'2026-09':{status:'aguardando_interna'},'2026-10':{status:'arquivado'}}};
exigir(contexto.api(varios,'',agosto)==='2026-08','sem escolha explícita, Cecília recebe o único mês já publicado');
exigir(contexto.api(varios,'2026-08',agosto)==='2026-08','escolha explícita do mês público preserva a competência exata');
exigir(deveFalhar(()=>contexto.api(varios,'2026-09',agosto),'aprovação da Amanda'),'mês em revisão não é publicado pelo ato de copiar');
exigir(deveFalhar(()=>contexto.api(varios,'2026-10',agosto),'arquivado'),'arquivo não é confundido com calendário público atual');
exigir(falhaQualquer(()=>contexto.api({items:[{mes:'2026-08'}],aprovacaoMeses:{'2026-08':{status:'aprovado_interno'}}},'2026-08',agosto)),'estado intermediário legado não fura a aprovação da Amanda');
exigir(contexto.api({items:[{mes:'2026-10'}],aprovacaoMeses:{'2026-10':{status:'liberado'}}},'',agosto)==='2026-10','o único mês efetivamente publicado é resolvido sem depender do relógio');
exigir(contexto.api({items:[{mes:'2027-01'}],aprovacaoMeses:{'2027-01':{status:'liberado'}}},'','2026-12-18T12:00:00')==='2027-01','resolução do link preserva dezembro para janeiro quando publicado');
exigir(falhaQualquer(()=>contexto.api({items:[]},'',agosto)),'documento confirmado sem itens não vira link ambíguo');
exigir(falhaQualquer(()=>contexto.api({items:[{mes:'2026-07'},{mes:'2026-10'}],aprovacaoMeses:{'2026-07':{status:'liberado'},'2026-10':{status:'liberado'}}},'',agosto)),'sem mês explícito, fallback não escolhe silenciosamente entre arquivos liberados');
exigir(deveFalhar(()=>contexto.api(varios,'setembro',agosto),'começam em julho de 2026'),'valor de mês inválido é recusado em vez de perder o parâmetro');

const preparar=trecho(escritorio,'async function prepararLinkCalendarioCliente','  window.prepararLinkCalendarioCliente');
exigir(preparar.includes("getDoc(doc(db,'calendarios',slugDocumento))")&&preparar.includes('resolverMesParaLinkCalendario(calConfirmado,mesEscolhido)'),'link nasce somente depois de leitura confirmada do calendário e resolução exata do mês');
exigir(preparar.includes("if(estado!=='liberado')")&&preparar.includes('aprovação da Amanda'),'revisão, ajuste, arquivo e rascunho continuam bloqueados na cópia');
exigir(!preparar.includes('runTransaction')&&!preparar.includes("status:'liberado'")&&preparar.includes("'&mes='+encodeURIComponent(mes)"),'Cecília copia a URL exata sem alterar a publicação');
exigir(!preparar.includes('deleteDoc(')&&!preparar.includes('addDoc(')&&!preparar.includes('setDoc('),'cópia não apaga, duplica nem regrava calendários');

const contextoLink={window:{},console,URL,Blob,encodeURIComponent}; contextoLink.window=contextoLink;
const DateReal=Date;
contextoLink.Date=class DateFixa extends DateReal{
  constructor(...args){ super(...(args.length?args:['2026-08-18T12:00:00'])); }
  static now(){ return new DateReal('2026-08-18T12:00:00').getTime(); }
};
vm.createContext(contextoLink);
new vm.Script(`
  let usuarioAtual='Cecília',gravacoes=0,historicos=0;
  let cal={client:'Cliente Teste',items:[{mes:'2026-09',name:'Setembro'}],aprovacaoMeses:{'2026-09':{status:'liberado'}}};
  const db={};
  const doc=(...partes)=>({path:partes.slice(1).join('/')});
  const snapshot=()=>({exists:()=>true,data:()=>cal});
  const getDoc=async()=>snapshot();
  const comTimeoutCalendarioOperacional=async promessa=>promessa;
  const resolverSlugCalendarioExistente=async slug=>slug;
  const garantirTokensDoCliente=async()=>({token:'token-cliente'});
  const registrarHistorico=()=>{historicos++;};
  const runTransaction=async(_db,fn)=>fn({get:async()=>snapshot(),set:(_ref,patch)=>{gravacoes++;cal={...cal,...patch};}});
  function competenciaCalendarioAtual(ref){const d=new Date(ref||Date.now());return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  function competenciaSeguinte(m){const [a,mm]=m.split('-').map(Number);const d=new Date(a,mm,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  function competenciaOperacionalCalendario(ref){return competenciaSeguinte(competenciaCalendarioAtual(ref));}
  function mesPertenceAoPeriodoDoSite(mes){return /^20\\d{2}-(0[1-9]|1[0-2])$/.test(String(mes||''))&&String(mes)>='2026-07';}
  function mesesDeCalendario(v){return [...new Set((v.items||[]).map(i=>i.mes).filter(Boolean))].sort();}
  function itensDoMesCalendario(v,mes){return (v.items||[]).filter(i=>i.mes===mes);}
  function estadoMesCal(v,mes){return v.aprovacaoMeses?.[mes]?.status||'rascunho';}
  function mesUsaCampoLegadoCalendario(){return false;}
  ${fonteResolver}
  ${preparar}
  globalThis.api={preparar:prepararLinkCalendarioCliente,cal:()=>cal,gravacoes:()=>gravacoes,historicos:()=>historicos,
    cenario:(status,itens=true)=>{gravacoes=0;historicos=0;cal={client:'Cliente Teste',items:itens?[{mes:'2026-09',name:'Setembro'}]:[],aprovacaoMeses:{'2026-09':{status}}};}};
`).runInContext(contextoLink);
const linkPreparado=await contextoLink.api.preparar('cliente-teste','2026-09');
exigir(new URL(linkPreparado).searchParams.get('mes')==='2026-09'&&contextoLink.api.cal().aprovacaoMeses['2026-09'].status==='liberado','Cecília recebe a URL exata do mês que Amanda já publicou');
exigir(contextoLink.api.gravacoes()===0&&contextoLink.api.historicos()===0,'cópia do link não grava nem muda histórico do calendário');
const linkRepetido=await contextoLink.api.preparar('cliente-teste','2026-09');
exigir(new URL(linkRepetido).searchParams.get('mes')==='2026-09'&&contextoLink.api.gravacoes()===0,'retentativa de cópia continua sem escrita');
contextoLink.api.cenario('aguardando_interna');
let erroRevisao=''; try{ await contextoLink.api.preparar('cliente-teste','2026-09'); }catch(e){ erroRevisao=String(e?.message||e); }
exigir(erroRevisao.includes('aprovação da Amanda')&&contextoLink.api.gravacoes()===0,'mês ainda na fila da Amanda não é liberado pela cópia');
contextoLink.api.cenario('liberado',false);
let erroVazio=''; try{ await contextoLink.api.preparar('cliente-teste','2026-09'); }catch(e){ erroVazio=String(e?.message||e); }
exigir(/(?:não existe|sem) conteúdo confirmado/i.test(erroVazio)&&contextoLink.api.gravacoes()===0,'mês vazio confirmado não recebe link nem escrita');

const portas=[...escritorio.matchAll(/onclick="copiarLinkCalendarioDireto\(([^\"]*)\)"/g)].map(m=>m[1]);
exigir(portas.length>=4&&portas.every(c=>(c.match(/,/g)||[]).length>=2),'todas as portas visíveis enviam uma competência explícita ao copiador');
const atual=trecho(escritorio,'window.copiarLinkCalendarioAtual = function','  /* ===== OS DOIS LINKS');
exigir((atual.includes('competenciaOperacionalCalendario()')||atual.includes('competenciaSeguinte(competenciaCalendarioAtual())')||atual.includes('competenciaSeguinte(hojeLocal().slice(0,7))'))&&
  !atual.includes('__calDados')&&/copiarLinkCalendarioDireto\([^;]+,mes\)/.test(atual),'porta compatível antiga ignora mês em cache e fixa exatamente a competência operacional');

const copia=trecho(escritorio,'window.copiarLinkCalendarioDireto = async function','  window.abrirLinkCliente');
exigir(copia.indexOf('copiarTextoPreparadoDuranteClique')<copia.indexOf('await copia'),'Clipboard começa no gesto do clique antes da leitura assíncrona');
exigir(copia.includes("dataset.copiandoCalendario==='1'")&&copia.includes('btn.disabled=true'),'duplo clique é bloqueado antes da primeira espera');
const clipboard=trecho(escritorio,'function copiarTextoLegado','  async function prepararLinkCalendarioEquipe');
exigir(clipboard.includes('ClipboardItem')&&clipboard.includes("document.execCommand('copy')")&&clipboard.includes('mostrarLinkCalendarioParaCopiaManual'),'desktop, compatibilidade legada e seleção manual móvel permanecem disponíveis');

const fila=trecho(escritorio,'function linhasCalendariosAguardandoRevisao','  window.linhasCalendariosAguardandoRevisao');
exigir((escritorio.match(/function linhasCalendariosAguardandoRevisao/g)||[]).length===1&&fila.includes("estadoMesCal(v, m) !== 'aguardando_interna'")&&!fila.includes('mesForaDaCompetenciaOperacional'),'Amanda continua com uma única fila e não perde outubro ou outro mês válido enviado pela Gabi');
exigir(!escritorio.includes('function mesForaDaCompetenciaOperacional'),'a barreira temporal antiga foi removida em vez de permanecer como regra paralela');

const renderFila=trecho(escritorio,'window.renderFilaEnvioCalendarios = async function','  window.enviarUmCalendario');
exigir(renderFila.includes("st==='arquivado'")&&renderFila.includes('Abrir para conferência')&&renderFila.includes('abrirCalendarioArquivoInterno'),'arquivo da Amanda é separado do mês público e abre somente para conferência');
const visaoOperacional=trecho(escritorio,'window.renderVisaoCalendarios = async function','  function etapaDoConteudo');
exigir(visaoOperacional.includes('const mesAtual = competenciaOperacionalCalendario()')&&
  !visaoOperacional.includes('meses[meses.length-1]'),'visão principal não mistura outro mês mais recente com a competência operacional');
const auditoriaVisibilidade=trecho(escritorio,'window.varrerVisibilidadeClientes = async function','  let __varreduraAchados');
exigir(auditoriaVisibilidade.includes('const mesOperacional=competenciaOperacionalCalendario()')&&
  auditoriaVisibilidade.includes('itensDoMesCalendario(cal,mesOperacional)'),'auditoria de visibilidade e seu botão de envio conferem o mesmo mês seguinte');
const aprovacao=trecho(escritorio,'window.liberarCalendario = async function','  window.devolverCalendario');
exigir(aprovacao.includes('dispararCalendarios([{slug,mes:alvo,aprovarAgora:true}])')&&aprovacao.includes('já está vendo'),'aprovação da Amanda usa o único fluxo que publica e confirma ao cliente');
const disparo=trecho(escritorio,'async function dispararCalendarios','  /* Aprovar NÃO envia mais.');
exigir(disparo.includes('runTransaction')&&disparo.includes('const snap=await tx.get(ref)')&&disparo.includes('mapaAprovacaoAposPublicar'),'publicação relê estado/conteúdo e preserva outros meses na mesma transação');
exigir(disparo.includes('const recibo=await getDoc(ref)')&&disparo.includes("estadoMesCal(dadosRecibo,a.mes)!=='liberado'")&&!disparo.includes('outrosAtivos.length'),'aprovação confirma o próprio mês sem exigir um único mês público');
exigir(disparo.includes('const resultado={enviados:[],falhas:[]}')&&disparo.includes('resultado.falhas.push')&&disparo.includes('return resultado'),'disparo em lote devolve recibos enviados e falhas individualizadas');
const lote=trecho(escritorio,'window.enviarTodosOsCalendarios = async function','  async function dispararCalendarios');
exigir(lote.includes('resultado.falhas.map')&&lote.includes("Falharam ")&&lote.includes('resultado.enviados.length'),'lote informa nomes/erros parciais e não exibe falso sucesso agregado');

for(const [rotulo,bloco] of [
  ['envio individual',trecho(escritorio,'window.enviarUmCalendario = async function','  window.enviarTodosOsCalendarios')],
  ['envio em lote',lote],
  ['disparo',disparo],
  ['aprovação interna',aprovacao]
]) exigir(!bloco.includes('mesForaDaCompetenciaOperacional')&&bloco.includes('20\\d{2}-(0[1-9]|1[0-2])'),rotulo+' aceita qualquer competência válida e rejeita formato inválido');

const devolucao=trecho(escritorio,'window.devolverCalendario = async function','  /* ===== 👥 EQUIPE');
exigir(devolucao.includes('runTransaction')&&/await\s+tx\.get\(ref\)/.test(devolucao),'devolução relê documento e estado dentro da transação');
exigir(devolucao.includes("estado!=='aguardando_interna'")&&devolucao.indexOf("estado!=='aguardando_interna'")<Math.max(devolucao.indexOf('tx.set('),devolucao.indexOf('tx.update(')),'devolução recusa qualquer estado concorrente antes de gravar, inclusive liberado');
exigir(!devolucao.includes('updateDoc(')&&!devolucao.includes('getDoc(')&&!devolucao.includes('mesForaDaCompetenciaOperacional'),'devolução não usa leitura obsoleta nem reintroduz bloqueio temporal');

const carregarPortal=trecho(portal,'async function carregarCalendario()','  window.aprovarConteudoCalendario');
exigir(carregarPortal.includes("new URLSearchParams(location.search).get('mes')")&&carregarPortal.includes('mesPedidoValido&&!mesesLib.includes(mesPedidoValido)'),'Portal honra o mês pedido e bloqueia troca silenciosa por outra competência');
exigir(carregarPortal.includes("estadoDoMesPortal(mesPedidoValido)==='arquivado'")&&carregarPortal.includes('Calendário arquivado'),'Portal mostra somente a mensagem correta para mês arquivado');
exigir(carregarPortal.indexOf('mesPedidoValido&&!mesesLib.includes')<carregarPortal.indexOf('mesesLib[mesesLib.length-1]'),'fallback para o último mês ocorre somente quando não existe pedido explícito');
exigir(carregarPortal.includes('Calendário temporariamente indisponível')&&carregarPortal.includes('não significa que o calendário esteja vazio ou apagado'),'falha do Firestore não vira calendário vazio');
exigir(carregarPortal.includes('__calendarioPortalConfirmado')&&carregarPortal.includes('última versão confirmada'),'Portal preserva o último retrato confirmado quando a leitura seguinte falha');
exigir(carregarPortal.includes("'&mes='+encodeURIComponent(mesEscolhido)")&&carregarPortal.includes("mesEscolhido?'&mes='+encodeURIComponent(mesEscolhido):''"),'iframe e link de tela cheia abrem a mesma competência confirmada');
exigir(carregarPortal.includes('data-item-id="${escAttr(it.itemId||\'\')}"')&&carregarPortal.includes('data-item-indice="${Number(it.__indiceBanco)}"'),'Portal leva itemId e índice bruto confirmado no botão de aprovação');
const aprovarPortal=trecho(portal,'window.aprovarConteudoCalendario = async function','  async function carregarDemandas');
exigir(aprovarPortal.includes('runTransaction')&&aprovarPortal.includes("findIndex(item=>String(item?.itemId||'')===itemId)"),'aprovação do Portal procura primeiro a identidade estável dentro da transação');
exigir(aprovarPortal.includes('Number(items[indice].day)===dia')&&aprovarPortal.includes('nomeItemLegadoPortal(items[indice].name)===nome')&&aprovarPortal.includes('candidatos.length===1'),'fallback legado exige índice/dia/nome ou uma única correspondência inequívoca');
exigir(!/findIndex\([^\n]*Number\([^\n]*\.day[^\n]*===\s*dia[^\n]*!.*apr/.test(aprovarPortal)&&aprovarPortal.includes("tx.set(ref,{items,updatedAt:agora},{merge:true})"),'Portal não aprova o primeiro item do dia e limita o patch a itens mais carimbo');

for(const [arquivo,fonte] of [['escritorio.html',escritorio],['portal-cliente.html',portal]]){
  const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
  for(const bloco of blocos){
    if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
    else new vm.Script(bloco[2]);
  }
  exigir(true,arquivo+' mantém JavaScript inline sintaticamente válido');
}

console.log(`RESULTADO: APROVADO (${total} asserções V81 calendários)`);
