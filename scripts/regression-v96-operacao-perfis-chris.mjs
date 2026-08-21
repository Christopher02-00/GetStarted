#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=nome=>fs.readFileSync(path.join(raiz,nome),'utf8');
const escritorio=ler('escritorio.html');
const calendario=ler('calendario.html');
const calendarios=ler('calendarios.html');
const regras=ler('firestore.rules');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('V96 OPERAÇÃO CHRIS: '+mensagem); }
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('V96 OPERAÇÃO CHRIS: trecho ausente '+inicio);
  return fonte.slice(a,b);
}

exigir(escritorio.includes('2026-08-21-controle-conclusao-calendarios-v101')&&
  escritorio.includes('2026-08-21-registro-autonomo-filmmaker-v100')&&
  escritorio.includes('PAPEIS_OPERAVEIS_POR_CHRIS'),
  'V101 não preserva a cadeia e o contrato operacional introduzidos na V96');
exigir(calendario.includes('2026-08-21-operacao-perfis-chris-v96'),'build V96 ausente no calendário');
exigir(calendario===calendarios,'calendario.html e calendarios.html divergiram');
exigir(!escritorio.includes('__auditoriaPapelAtiva')&&!calendario.includes('modoAuditoria'),'contrato antigo de somente leitura continua ativo');

const perfil=trecho(escritorio,'window.abrirOperacaoPerfisChris','window.sairOperacaoPerfilChris');
exigir(perfil.includes("window.__pessoaAutenticadaReal !== 'Chris'"),'entrada não confere a pessoa Google real');
exigir(perfil.includes('PAPEIS_OPERAVEIS_POR_CHRIS.includes(papel)'),'entrada aceita papel fora da matriz congelada');
exigir(escritorio.includes("{ id:'navOperacaoPerfisChris', rot:'Operar perfil da equipe'")&&!escritorio.includes("'Amanda': [{ id:'navOperacaoPerfisChris'"),'atalho não está exclusivo do Chris');
exigir(escritorio.includes('ALTERAÇÕES ATIVAS E REGISTRADAS'),'banner não diferencia operação real de visualização');
exigir(escritorio.includes('if(!ehGestao){'),'papel de funcionário ainda recebe a exceção de DOM da gerência');
exigir(escritorio.includes("!window.__operacaoDelegadaChris && (usuarioAtual === 'Amanda' || usuarioAtual === 'Chris')")&&
  escritorio.includes("|| window.__operacaoDelegadaChris) return {processadas:[],falhas:[]}"),'motores globais podem rodar durante operação delegada');

const calendarioOperacao=trecho(calendario,'const PAPEIS_OPERAVEIS_POR_CHRIS','function barrar(titulo, texto)');
exigir(calendarioOperacao.includes("modoInternoEquipe && params.get('operacaoChris') === '1'"),'URL pública pode solicitar operação delegada');
exigir(calendario.includes("email!=='christopherveloso0@gmail.com'"),'iframe não confirma o e-mail Firebase real');
exigir(calendario.includes('PAPEIS_OPERAVEIS_POR_CHRIS.includes(papelOperadoSolicitado)'),'iframe aceita papel desconhecido');
exigir(calendarioOperacao.includes("origem:'calendario'")&&calendarioOperacao.includes("collection(db,'log_operacoes_delegadas')"),'calendário não anexa autoria');
exigir(escritorio.includes("'&operacaoChris=1&papelOperado='"),'Escritório não transfere o papel ao iframe');

const regraLog=trecho(regras,'match /log_operacoes_delegadas/{docId}','// Coleções exclusivamente operacionais');
exigir(regraLog.includes('allow read: if ehChris();')&&regraLog.includes('allow create: if ehChris()'),'log não está exclusivo do Chris');
exigir(regraLog.includes('allow update, delete: if false;'),'log não é append-only');
exigir(regraLog.includes("request.resource.data.atorReal == 'Chris'")&&regraLog.includes("request.resource.data.executadoEm == request.time"),'regra aceita ator ou horário forjado');
exigir((regras.match(/allow create, update: if ehAmanda\(\) \|\| ehChris\(\);/g)||[]).length===1&&
  regras.includes('allow read, create, update: if ehAmanda() || ehChris();'),'as duas portas Amanda-only não foram abertas estritamente ao Chris');

/* Prova comportamental isolada: os stubs abaixo não conhecem Firebase nem
   dados reais. Eles aplicam o batch somente se o recibo também for aceito,
   reproduzindo a atomicidade que o wrapper V96 exige. */
const fonteWrappers=trecho(escritorio,'const PAPEIS_OPERAVEIS_POR_CHRIS','const auth = getAuth(app)');
const estado={aplicadas:[],brutas:[],falharLog:false,seq:0};
function novoLote(){
  const operacoes=[];
  return {
    set(ref,...args){operacoes.push({tipo:'set',ref,args});return this;},
    update(ref,...args){operacoes.push({tipo:'update',ref,args});return this;},
    delete(ref){operacoes.push({tipo:'delete',ref,args:[]});return this;},
    async commit(){
      if(estado.falharLog&&operacoes.some(o=>o.ref.path.startsWith('log_operacoes_delegadas/'))){
        throw Object.assign(new Error('log recusado'),{code:'permission-denied'});
      }
      estado.aplicadas.push(...operacoes);
    }
  };
}
const contexto=vm.createContext({
  console,Proxy,Set,String,Object,Error,window:{__pessoaAutenticadaReal:'Chris',__operacaoDelegadaChris:'Gabrielle'},
  db:{path:'db'},mostrarToast(){},__invalidarCacheDoRef(){},__limparCacheColecoes(){},
  serverTimestamp:()=>({__serverTimestamp:true}),
  collection:(dbAlvo,nome)=>({path:nome,type:'collection'}),
  doc:(...a)=>a.length===1?{path:a[0].path+'/auto-'+(++estado.seq)}:{path:a.slice(1).join('/')},
  _writeBatchFB:()=>novoLote(),
  _addDocFB:async(ref,dados)=>{const criado={path:ref.path+'/raw'};estado.brutas.push({tipo:'add',ref:criado,dados});return criado;},
  _setDocFB:async(ref,...args)=>{estado.brutas.push({tipo:'set',ref,args});},
  _updateDocFB:async(ref,...args)=>{estado.brutas.push({tipo:'update',ref,args});},
  _deleteDocFB:async ref=>{estado.brutas.push({tipo:'delete',ref});},
  _runTransactionFB:async(dbAlvo,executar)=>{
    const lote=novoLote();
    const resultado=await executar(lote);
    await lote.commit();
    return resultado;
  }
});
new vm.Script(`${fonteWrappers}\nglobalThis.api={addDoc,setDoc,updateDoc,deleteDoc,runTransaction,writeBatch,PAPEIS_OPERAVEIS_POR_CHRIS};`,{filename:'v96-wrappers-sandbox.js'}).runInContext(contexto);
const api=contexto.api;
exigir(Array.from(api.PAPEIS_OPERAVEIS_POR_CHRIS).join('|')==='Amanda|Cecília|Gabrielle|Helo|João Victor|Luís|Nathan|Yas','matriz dos oito papéis mudou');

const refLegenda={path:'postagens/SINTETICO-V96'};
await api.setDoc(refLegenda,{legenda:'DADO-SINTETICO'},{merge:true});
exigir(estado.aplicadas.some(o=>o.ref.path===refLegenda.path)&&estado.aplicadas.some(o=>o.ref.path.startsWith('log_operacoes_delegadas/')),'set delegado não foi atômico com o log');
const recibo=estado.aplicadas.find(o=>o.ref.path.startsWith('log_operacoes_delegadas/'))?.args?.[0];
exigir(recibo?.atorReal==='Chris'&&recibo?.papelOperado==='Gabrielle'&&recibo?.operacao==='setDoc','recibo não preserva ator, papel e operação');
exigir(!('payload' in recibo)&&!('dados' in recibo)&&JSON.stringify(recibo).includes('DADO-SINTETICO')===false,'recibo copiou o payload de negócio');

estado.aplicadas.length=0; estado.falharLog=true;
let falhouFechado=false;
try{await api.updateDoc(refLegenda,{status:'SINTETICO'});}catch(e){falhouFechado=e.code==='permission-denied';}
exigir(falhouFechado&&estado.aplicadas.length===0,'falha do log deixou escrita parcial');

estado.falharLog=false; estado.aplicadas.length=0;
await api.runTransaction(contexto.db,async tx=>{tx.update(refLegenda,{status:'SINTETICO-TRANSACAO'});});
exigir(estado.aplicadas.some(o=>o.ref.path===refLegenda.path)&&estado.aplicadas.some(o=>o.ref.path.startsWith('log_operacoes_delegadas/')),'transação delegada não carrega o log na mesma confirmação');

estado.aplicadas.length=0;
const lote=api.writeBatch(contexto.db);
lote.set({path:'demandas/SINTETICO-V96'},{titulo:'SINTETICO'}).update(refLegenda,{status:'SINTETICO-LOTE'});
await lote.commit();
exigir(estado.aplicadas.filter(o=>o.ref.path.startsWith('log_operacoes_delegadas/')).length===1&&estado.aplicadas.length===3,'writeBatch não gera exatamente um recibo para o conjunto');

estado.aplicadas.length=0; estado.brutas.length=0;
contexto.window.__operacaoDelegadaChris='';
await api.setDoc(refLegenda,{normal:true});
exigir(estado.brutas.length===1&&estado.aplicadas.length===0,'modo normal passou pelo log delegado');

contexto.window.__pessoaAutenticadaReal='Amanda';
contexto.window.__operacaoDelegadaChris='Gabrielle';
let identidadeFalsaBloqueada=false;
try{await api.setDoc(refLegenda,{indevido:true});}catch(e){identidadeFalsaBloqueada=e.code==='gs/operacao-delegada-invalida';}
exigir(identidadeFalsaBloqueada,'funcionário conseguiu ativar a delegação alterando só o estado da tela');

console.log(`REGRESSÃO V96 OPERAÇÃO CHRIS: APROVADA (${total} verificações)`);
