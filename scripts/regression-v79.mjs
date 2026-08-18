#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const calendario=ler('calendario.html');
const calendarios=ler('calendarios.html');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('FALHOU: '+mensagem); console.log('PASS ',mensagem); }
function trecho(fonte,inicio,fim){ const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return fonte.slice(a,b); }

exigir(escritorio.includes('<meta name="gs-build" content="2026-08-18-calendario-proximo-mes-v79">'),'build V79 identificado');
exigir(calendario===calendarios,'endereços singular e plural permanecem idênticos');
exigir(escritorio.includes('const mesPadrao=competenciaSeguinte(hojeLocal().slice(0,7))')&&escritorio.includes('mesLink.value=competenciaSeguinte(hojeLocal().slice(0,7))'),'ferramentas começam no mês seguinte');
exigir(escritorio.includes("'&mes=' + encodeURIComponent(mesLink?.value||'')"),'iframe recebe a competência escolhida explicitamente');

const escolha=trecho(calendario,'function mesInicialEquipe','let saveTimer');
const ctx={}; vm.createContext(ctx);
new vm.Script("function mesDoItem(i){return i.mes||''}function mesDoTexto(t){return t==='Agosto 2026'?'2026-08':t==='Outubro 2026'?'2026-10':''}"+escolha+';this.api=mesInicialEquipe;').runInContext(ctx);
exigir(ctx.api({month:'Agosto 2026',items:[{mes:'2026-09',name:'Setembro'}]},'')==='2026-09','rótulo antigo não abre vazio quando setembro possui conteúdo');
exigir(ctx.api({month:'Agosto 2026',items:[{mes:'2026-08'},{mes:'2026-09'}]},'2026-08')==='2026-08','pedido explícito continua vencendo o mês mais recente');
exigir(ctx.api({month:'Outubro 2026',items:[{mes:'2026-09'}]},'2026-10')==='2026-10','pedido explícito de mês ainda vazio permanece visível para produção');

const diagnostico=trecho(escritorio,'function atualizarDiagnosticoCalendarioFerramentas','  window.addEventListener');
exigir(diagnostico.includes('Calendário não confirmado')&&diagnostico.includes('Não considere a tela vazia'),'falha/ausência de leitura não é declarada como vazio');
exigir(diagnostico.includes('está realmente sem conteúdos no documento confirmado')&&diagnostico.includes('conteúdo(s) confirmado(s) no Firestore'),'diagnóstico separa vazio real de mês carregado');

const preparar=trecho(escritorio,'async function prepararLinkCalendarioCliente','  window.prepararLinkCalendarioCliente');
exigir(preparar.includes("estado!=='liberado'&&estado!=='aprovado_interno'")&&preparar.includes("estado==='aguardando_interna'")&&preparar.includes("estado==='ajuste_interno'"),'rascunho, revisão e ajuste permanecem bloqueados');
exigir(preparar.indexOf("garantirTokensDoCliente(slugDocumento,'cliente')")<preparar.indexOf('runTransaction(db'),'token é confirmado antes de liberar a visibilidade');
exigir(preparar.includes("if(!['Chris','Amanda','Cecília'].includes(usuarioAtual))")&&preparar.includes("if(estado!=='aprovado_interno')"),'somente papéis finais liberam e somente após aprovação');
exigir(preparar.includes('tx.get(ref)')&&preparar.includes('itensDoMesCalendario(cal,mes)')&&preparar.includes("status:'liberado',mes"),'transação relê documento, itens e competência antes de liberar');
exigir(preparar.includes("(mes?'&mes='+encodeURIComponent(mes):'')"),'link final preserva a competência exata');
exigir(!preparar.includes('deleteDoc(')&&!preparar.includes('addDoc('),'envio não apaga nem duplica calendário');

for(const arquivo of ['escritorio.html','calendario.html','calendarios.html']){
  const fonte=ler(arquivo);
  const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
  for(const bloco of blocos){ if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]); else new vm.Script(bloco[2]); }
}
exigir(true,'scripts inline alterados compilam');

console.log(`RESULTADO: APROVADO (${total} asserções V79)`);
