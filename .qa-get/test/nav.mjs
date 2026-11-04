import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {moduleURL,MUTANT,until,read} from './runtime.mjs';
import vm from 'node:vm';
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
async function conferirDelegacao(){
 const source=read('escritorio.html'),declaration=source.match(/const PAPEIS_OPERAVEIS_POR_CHRIS = Object\.freeze\(\[[^\n]+\]\);/),entry=source.match(/window\.entrarOperacaoPerfilChris = async function\(\)\{[\s\S]*?\n  \};/),guard=source.match(/function __operacaoDelegadaChrisAtiva\(\)\{[\s\S]*?\n  \}/);
 assert(declaration&&entry&&guard,'Contratos de operação presentes no Office completo');
 const w=new Window(),d=w.document;let changes=0,banners=0,motor=0;
 d.body.innerHTML='<select id="operacaoPapelEscolhido"><option>Gabrielle</option><option>Amanda</option></select><select id="euSouGlobal"><option>Chris</option><option>Amanda</option><option>Gabrielle</option></select><div id="painelOperacaoPerfisChris"></div>';
 w.__pessoaAutenticadaReal='Chris';w.__operacaoDelegadaChris='';w.mudarUsuarioGlobal=async()=>{changes++;};
 const ctx=vm.createContext({window:w,document:d,Option:w.Option,podeSairDiarioI118:()=>true,pararMotorAutomacoes:()=>{motor++;},atualizarBannerOperacaoPerfilChris:()=>{banners++;},mostrarToast:()=>{}});
 vm.runInContext(declaration[0]+'\n'+entry[0]+'\n'+guard[0],ctx);
 try{
  d.getElementById('operacaoPapelEscolhido').value='Gabrielle';await w.entrarOperacaoPerfilChris();
  assert.equal(w.__operacaoDelegadaChris,'','Nome recusado antes de registrar operação ou banner ativo');assert.equal(changes,0);assert.equal(banners,0);assert.equal(motor,0);assert(d.getElementById('painelOperacaoPerfisChris'));
  w.__operacaoDelegadaChris='Gabrielle';assert.throws(()=>vm.runInContext('__operacaoDelegadaChrisAtiva()',ctx),e=>e.code==='gs/operacao-delegada-invalida','Flag antiga não autoriza escritor delegado');w.__operacaoDelegadaChris='';
  d.getElementById('operacaoPapelEscolhido').value='Amanda';await w.entrarOperacaoPerfilChris();assert.equal(w.__operacaoDelegadaChris,'Amanda');assert.equal(changes,1);assert.equal(banners,1);assert.equal(motor,1);assert.equal(d.getElementById('euSouGlobal').value,'Amanda');assert.equal(vm.runInContext('__operacaoDelegadaChrisAtiva()',ctx),true);
  w.__pessoaAutenticadaReal='Cecília';w.__operacaoDelegadaChris='';await w.entrarOperacaoPerfilChris();assert.equal(w.__operacaoDelegadaChris,'');assert.equal(changes,1);
  return {GabrielleRejectedBeforeState:true,staleFlagDenied:true,AmandaPositive:true,nonChrisDenied:true,qualification:'Callbacks literais do Office em DOM/VM; não é login pessoal nem escrita SDK.'};
 }finally{w.happyDOM.abort();}
}
export async function runNav(){
 const delegation=await conferirDelegacao();
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
  return {AmandaSameEntry:true,ChrisSameCentral:true,internalClicks:8,GabrielleNoActiveArea:true,CeciliaEntriesPreserved:3,delegation,qualification:'R87 literal DOM e callbacks de delegação do Office; demais permissões/SDK em camadas separadas. Sem escritor nem conta pessoal.'};
 }finally{for(const f of[a,c,g,ce])f.close();}
}
