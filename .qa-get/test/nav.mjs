import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {moduleURL,MUTANT,until} from './runtime.mjs';
const shell=await import(moduleURL('gs-central-unificada-r87.mjs',MUTANT==='nav'?'nav':''));
function fixture(role){
 const w=new Window(),d=w.document,calls=[];
 d.body.innerHTML='<aside>'+['navPostagens','navCalendarios','navControlePostagem','navPlanejamentoPreparacaoR80'].map(id=>'<div id="'+id+'" style="display:flex">'+id+'</div>').join('')+'</aside><main><div class="view" id="view-postagens"></div></main>';
 const context={uid:'qa_'+role,nome:role,atorReal:role,sessao:'qa_cp183_nav',geracao:1};
 const state={ativo:true,view:'postagens',postSub:'legenda'};
 const controller=shell.criarCentralUnificadaR87({documento:d,contexto:()=>context,abrir:async area=>{calls.push(area);return true;},conferir:async()=>true});
 controller.sincronizar(state);
 return {w,d,calls,context,controller,state,close(){controller.destroy();w.happyDOM.abort();}};
}
export async function runNav(){
 const a=fixture('Amanda'),c=fixture('Chris'),g=fixture('Gabrielle'),ce=fixture('Cecília');
 try{
  const oldEntry=a.d.getElementById('navPostagens');
  assert.equal(oldEntry.hidden,false,'Amanda conserva a entrada familiar de legendas e postagens');
  assert.equal(oldEntry.style.display,'flex');
  assert.equal(a.d.querySelectorAll('#navPostagens').length,1);
  for(const f of[a,c]){
   const button=f.d.querySelector('[data-area-r87="legendas"]');
   assert(button,'Legendas disponível na Central do mesmo papel');
   assert.equal(f.d.querySelectorAll('[data-area-r87="legendas"]').length,1);
   for(let i=0;i<4;i++){
    f.d.querySelector('[data-area-r87="legendas"]').click();await until(()=>f.calls.length===i+1,'mesma área de legendas');
    assert.equal(f.calls[i],'legendas');
   }
  }
  assert.equal(c.d.getElementById('navPostagens').hidden,true,'Chris usa a mesma Central sem outro atalho paralelo');
  assert.deepEqual(shell.areasCentralR87('Gabrielle'),[],'Gabrielle não possui ferramentas ativas após saída');
  assert.equal(g.d.querySelector('[data-area-r87]'),null);assert.deepEqual(g.calls,[]);
  assert.equal(ce.d.getElementById('navPostagens').hidden,false,'Entrada familiar Cecília preservada');
  assert.equal(ce.d.getElementById('navCalendarios').hidden,false);assert.equal(ce.d.getElementById('navControlePostagem').hidden,false);
  a.controller.destroy();assert.equal(oldEntry.hidden,false,'Desmontar restaura o menu anterior');
  return {AmandaSameEntry:true,ChrisSameCentral:true,internalClicks:8,GabrielleNoActiveArea:true,CeciliaEntriesPreserved:3,qualification:'R87 literal DOM; permissões/Office/SDK testados em camadas separadas. Sem escritor nem conta pessoal.'};
 }finally{for(const f of[a,c,g,ce])f.close();}
}
