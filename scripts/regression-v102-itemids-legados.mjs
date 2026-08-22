#!/usr/bin/env node

import assert from 'node:assert/strict';
import cryptoNode from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const calendario=fs.readFileSync(path.join(raiz,'calendario.html'),'utf8');
const calendarios=fs.readFileSync(path.join(raiz,'calendarios.html'),'utf8');
const rules=fs.readFileSync(path.join(raiz,'firestore.rules'),'utf8');
let total=0;
function ok(cond,msg){total++;if(!cond) throw new Error('V102 ITEMIDS: '+msg);console.log('PASS ',msg);}
function trecho(fonte,inicio,fim){const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);if(a<0||b<0)throw new Error('trecho ausente: '+inicio);return fonte.slice(a,b);}
function copia(v){return v==null?v:structuredClone(v);}
function ref(...args){const p=args.shift();return {path:[...(p?.path?[p.path]:(p?.__db?[]:[p])),...args].filter(Boolean).map(String).join('/')};}
function snap(v){return {exists(){return v!==undefined;},data(){return copia(v);}};}
function snapshot(docs){return {forEach(fn){docs.forEach(d=>fn({id:d.id,data:()=>copia(d.data)}));}};}
function jsonEstavel(v){if(Array.isArray(v))return '['+v.map(jsonEstavel).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+jsonEstavel(v[k])).join(',')+'}';return JSON.stringify(v);}

const bloco=trecho(html,'  /* ===== CONTROLE DE CONCLUSÃO V101','  window.renderVisaoCalendarios = async function');
function ambiente({papel='Chris',real='Chris',estado=new Map()}={}){
  const escritas=[]; const db={__db:true};
  const window={__pessoaAutenticadaReal:real,__uid:'uid-chris-v102'};
  const auth={currentUser:{uid:'uid-chris-v102'}};
  async function getDoc(refAlvo){return snap(estado.get(refAlvo.path));}
  async function runTransaction(_db,executar){
    const pendentes=[];
    const tx={
      async get(r){return snap(estado.get(r.path));},
      set(r,dados,opcoes){pendentes.push({path:r.path,dados:copia(dados),merge:opcoes?.merge===true});},
      update(r,dados){pendentes.push({path:r.path,dados:copia(dados),merge:true});}
    };
    const resultado=await executar(tx);
    pendentes.forEach(w=>{const final=w.merge?{...(estado.get(w.path)||{}),...w.dados}:w.dados;estado.set(w.path,copia(final));escritas.push({...w,dados:copia(final)});});
    return resultado;
  }
  const nos=new Map();
  const contexto=vm.createContext({console,window,document:{getElementById(id){return nos.get(id)||null;}},usuarioAtual:papel,auth,db,
    crypto:cryptoNode.webcrypto,TextEncoder,sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    collection:(...a)=>ref(...a),doc:(...a)=>ref(...a),query:r=>r,where:()=>({}),getDocs:async()=>snapshot([]),getDoc,runTransaction,
    serverTimestamp:()=> 'SERVER_TIMESTAMP_V102',slugClienteCanonico:v=>String(v||''),mesDoItemCalendario:(cal,item)=>String(item?.mes||cal?.month||''),
    jsonEstavel,ORDEM_STATUS_POSTAGEM:{},escolherPostagemCanonicaPorVideo:()=>null,obterCalendariosCompartilhados:async()=>snapshot([]),
    __erroCalendariosCompartilhado:null,hojeLocal:()=> '2026-08-21',esc:String,escAttr:String,mostrarToast(){},confirm:()=>true,prompt:()=>null});
  new vm.Script(bloco,{filename:'v102-itemids-sandbox.js'}).runInContext(contexto);
  return {api:window.__itemIdsLegadosV102Teste,estado,escritas,getDoc,runTransaction,window,contexto};
}

ok(html.includes('2026-08-21-itemids-calendarios-legados-v102'),'build identifica V102');
ok(html.includes('ccMigracaoItemIdsSlot')&&html.includes('data-cc-migracao-v102'),'ferramenta nasce dentro do Controle de conclusão');
ok(html.indexOf('renderFerramentaItemIdsLegadosV102();')<html.indexOf('renderControleConclusaoCalendarios();'),'ferramenta é preparada antes da leitura normal do painel');
ok(!trecho(html,'function renderFerramentaItemIdsLegadosV102','window.preverMigracaoItemIdsV102').includes('setDoc('),'renderização da ferramenta não grava');

const env=ambiente();
const api=env.api;
ok(api&&typeof api.normalizarItensCalendarioV102==='function','núcleo V102 está exposto ao ensaio isolado');
const cal={client:'Cliente Sintético',month:'2026-08',updatedAt:'antes',campoPreservado:{x:1},items:[
  {name:'Título repetido',day:1,mes:'2026-08',posted:false},
  {name:'Título repetido',day:1,mes:'2026-08',posted:false},
  {itemId:'item_existente',name:'Moderno',day:2,mes:'2026-08',apr:true},
  {name:'Excluído histórico',day:3,mes:'2026-08',excluido:true}
]};
const analise=api.analisarCalendarioItemIdsV102('cliente-sintetico',cal);
ok(analise.faltantes===3&&!analise.bloqueado,'prévia conta legado inclusive soft-delete sem alterar o dado');
const normalizado=await api.normalizarItensCalendarioV102('cliente-sintetico',cal);
ok(normalizado.adicionados===3&&normalizado.itens.length===4,'normalização cobre todos os itens sem mudar a quantidade');
ok(normalizado.itens[0].itemId!==normalizado.itens[1].itemId,'títulos iguais recebem identidades diferentes sem casamento por nome');
ok(normalizado.itens[2].itemId==='item_existente','ID moderno existente permanece byte a byte');
ok(normalizado.itens[3].excluido===true&&normalizado.itens[3].itemId.startsWith('legacy_'),'soft-delete recebe ID e preserva o histórico');
ok(normalizado.itens.every(i=>/^[A-Za-z0-9_-]{1,160}$/.test(i.itemId)),'IDs gerados satisfazem o contrato canônico');
const semIds=v=>v.map(({itemId,...resto})=>resto);
assert.equal(jsonEstavel(semIds(normalizado.itens)),jsonEstavel(semIds(cal.items)));total++;console.log('PASS  campos, ordem e estados de negócio permanecem iguais');
const repetido=await api.normalizarItensCalendarioV102('cliente-sintetico',{...cal,items:normalizado.itens});
ok(repetido.adicionados===0&&repetido.hashAntes===repetido.hashDepois,'segunda execução é idempotente');
await assert.rejects(()=>api.normalizarItensCalendarioV102('x',{items:[{itemId:'dup'},{itemId:'dup'}]}),/duplicado/i);total++;console.log('PASS  ID duplicado bloqueia fechado');
await assert.rejects(()=>api.normalizarItensCalendarioV102('x',{items:[{itemId:'inválido/com-barra'}]}),/inválido/i);total++;console.log('PASS  ID inválido não é substituído silenciosamente');

const previa=api.analisarSnapshotItemIdsV102(snapshot([{id:'a',data:cal},{id:'b',data:{items:[{itemId:'ok'}]}}]));
ok(previa.totalCalendarios===1&&previa.totalItens===3,'prévia agregada distingue calendários já modernos');
ok(JSON.stringify(previa).includes('Título repetido')===false,'prévia não copia título nem conteúdo pessoal');

env.estado.set('calendarios/cliente-sintetico',copia(cal));
const resultado=await api.migrarCalendarioItemIdsV102('cliente-sintetico',{runTransaction:env.runTransaction,getDoc:env.getDoc});
ok(resultado.ok&&resultado.confirmado&&resultado.adicionados===3,'migração confirma o recibo após o commit');
ok(env.escritas.length===3,'transação escreve exatamente calendário, backup e recibo');
ok(env.escritas.some(w=>w.path==='calendarios/cliente-sintetico'&&w.merge),'calendário é atualizado por merge');
const backup=env.escritas.find(w=>w.path.startsWith('calendarios_versoes/'));
const recibo=env.escritas.find(w=>w.path.startsWith('calendarios_itemid_migracoes/'));
ok(!!backup&&backup.dados.__tipo==='antes_itemids_v102'&&backup.dados.items[0].itemId===undefined,'backup integral preserva o estado anterior');
ok(!!recibo&&recibo.dados.status==='aplicada'&&recibo.dados.quantidade===3,'recibo registra contagem e operação');
ok(!('titulo' in recibo.dados)&&!('items' in recibo.dados)&&!('clienteNome' in recibo.dados),'recibo não duplica pauta ou PII');
const final=env.estado.get('calendarios/cliente-sintetico');
ok(final.client===cal.client&&final.campoPreservado.x===1&&final.items.length===cal.items.length,'migração preserva todos os campos raiz e a quantidade');
ok(final.items.every(i=>i.itemId),'calendário confirmado termina sem legado');
const antesRetry=env.escritas.length;
const retry=await api.migrarCalendarioItemIdsV102('cliente-sintetico',{runTransaction:env.runTransaction,getDoc:env.getDoc});
ok(retry.semAlteracao&&env.escritas.length===antesRetry,'retry após sucesso faz zero escrita');

const negado=ambiente({papel:'Cecília',real:'Cecília'});
negado.estado.set('calendarios/x',{items:[{name:'x'}]});
await assert.rejects(()=>negado.api.migrarCalendarioItemIdsV102('x',{runTransaction:negado.runTransaction,getDoc:negado.getDoc}),/Somente Chris/);total++;console.log('PASS  Cecília não executa a migração');
ok(negado.escritas.length===0,'papel indevido falha antes da primeira escrita');

ok(calendario===calendarios,'calendario.html e calendarios.html seguem byte a byte idênticos');
for(const fonte of [calendario,calendarios]){
  ok(fonte.includes("const removeriaItemId=[...idsServidor].some(id=>!idsDepois.has(id))"),'editor bloqueia remoção de ID conhecido pelo servidor');
  ok(fonte.includes("motivo:removeriaItemId?'itemids-protegidos':'conflito'"),'bloqueio devolve causa específica e honesta');
  ok(fonte.includes("'itemIdMigracaoVersao','itemIdMigradoEm','itemIdMigradoPor','itemIdMigracaoUltimaOperacao'"),'editor preserva metadados V102 no setDoc integral');
}
ok(html.includes('const combinado=await normalizarItensCalendarioV102')&&html.includes('const normalizado=await normalizarItensCalendarioV102(slug'),'varredura e restauração não reintroduzem legado');
ok(rules.includes('match /calendarios_itemid_migracoes/{calendarId}')&&rules.includes("request.resource.data.status == 'aplicada'"),'regras contêm contrato dedicado do recibo');
ok(rules.includes('existsAfter(/databases/$(database)/documents/calendarios_versoes/')&&rules.includes('existsAfter(/databases/$(database)/documents/calendarios_itemid_migracoes/$(slug)/operacoes/'),'calendário exige recibo e o recibo exige backup no mesmo commit');
ok(rules.includes('allow update, delete: if false;'),'recibo e eventos continuam append-only');

console.log(`REGRESSÃO V102 ITEMIDS LEGADOS: APROVADA (${total} verificações)`);
