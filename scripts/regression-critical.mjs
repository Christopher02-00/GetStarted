import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../escritorio.html',import.meta.url),'utf8');
let total=0;
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('FALHOU: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(inicio,fim){
  const a=html.indexOf(inicio), b=html.indexOf(fim,a);
  if(a<0 || b<0) throw new Error('Trecho não encontrado: '+inicio);
  return html.slice(a,b);
}

const blocoDemanda=trecho('function validarDemandaConfirmada','  window.criarDemandaModal = async function');
exigir(blocoDemanda.includes("doc(collection(db,'demandas'))"),'demanda reserva IDs antes da gravação');
exigir(blocoDemanda.includes('const lote=writeBatch(db)') && blocoDemanda.includes('await lote.commit()'),'demanda em grupo usa um único lote atômico');
exigir(blocoDemanda.includes('return await confirmarRefsDeDemandas(pendente.registros)'),'sucesso depende da releitura dos mesmos IDs');
exigir(!blocoDemanda.includes('addDoc('),'fluxo confirmado não usa addDoc otimista');

let sequencia=0, commits=0, falhaLeitura=false, falhaCommit=false;
const armazenados=new Map();
const contexto={
  window:{__criacaoDemandaPendente:null},db:{},console,
  __cacheColecoes:new Map(),
  collection:()=>({type:'collection',path:'demandas'}),
  doc:()=>({id:'id'+(++sequencia),path:'demandas/id'+sequencia}),
  writeBatch:()=>{
    const preparados=[];
    return {
      set:(ref,dados)=>preparados.push({ref,dados}),
      commit:async()=>{
        commits++;
        if(falhaCommit) throw new Error('commit indisponível');
        preparados.forEach(v=>armazenados.set(v.ref.id,v.dados));
      }
    };
  },
  getDoc:async ref=>{
    if(falhaLeitura) throw new Error('leitura indisponível');
    const dados=armazenados.get(ref.id);
    return {exists:()=>!!dados,data:()=>dados};
  }
};
vm.createContext(contexto);
new vm.Script(blocoDemanda).runInContext(contexto);

const base={titulo:'Pedido confirmado',origem:'gabrielle',destinatario:'Chris',status:'pendente',protocoloCriacao:'p1'};
const grupo={titulo:'Parte da Amanda',origem:'gabrielle',destinatario:'Amanda',status:'pendente',protocoloCriacao:'p2'};
let confirmados=await contexto.window.gravarEConfirmarDemandas([base,grupo]);
exigir(confirmados.length===2 && commits===1 && armazenados.size===2,'lote completo é relido e confirmado uma única vez');

contexto.window.__criacaoDemandaPendente=null;
falhaLeitura=true;
let erroConfirmacao=null;
try{ await contexto.window.gravarEConfirmarDemandas([{...base,protocoloCriacao:'p3'}]); }catch(e){ erroConfirmacao=e; }
exigir(erroConfirmacao?.confirmacaoDemandaPendente===true && commits===2,'falha após commit fica marcada como confirmação pendente');
const idPendente=contexto.window.__criacaoDemandaPendente.registros[0].ref.id;
falhaLeitura=false;
confirmados=await contexto.window.gravarEConfirmarDemandas([{...base,protocoloCriacao:'ignorado-na-retentativa'}]);
exigir(commits===2 && confirmados[0].id===idPendente,'retentativa relê o mesmo ID sem segunda gravação');

contexto.window.__criacaoDemandaPendente=null;
falhaCommit=true;
try{ await contexto.window.gravarEConfirmarDemandas([{...base,protocoloCriacao:'p4'}]); }catch(e){}
exigir(contexto.window.__criacaoDemandaPendente===null,'falha atômica de commit libera uma nova tentativa limpa');

const snap=dados=>({exists:()=>true,data:()=>dados});
exigir(contexto.window.validarDemandaConfirmada(snap(base),base)===true,'recibo aceita todos os campos de roteamento esperados');
exigir(contexto.window.validarDemandaConfirmada(snap({...base,destinatario:'Amanda'}),base)===false,'recibo rejeita destinatário divergente');
exigir(contexto.window.validarDemandaConfirmada(snap({...base,status:'cancelada'}),base)===false,'recibo rejeita estado não operacional');

const numeroFonte=trecho('function numeroWhatsAppBrasil','  window.numeroWhatsAppBrasil=numeroWhatsAppBrasil;')+'\nthis.numeroWhatsAppBrasil=numeroWhatsAppBrasil;';
const numeroCtx={}; vm.createContext(numeroCtx); new vm.Script(numeroFonte).runInContext(numeroCtx);
exigir(numeroCtx.numeroWhatsAppBrasil('(41) 99908-8357')==='5541999088357','telefone brasileiro recebe país sem perder DDD');
exigir(numeroCtx.numeroWhatsAppBrasil('5541999088357')==='5541999088357','telefone já internacional não duplica país');
exigir(numeroCtx.numeroWhatsAppBrasil('99908-8357')==='','telefone sem DDD é recusado');

const posRegua=html.indexOf('id="navCobranca"'), posMensagens=html.indexOf('id="navMensagensClientesChris"');
exigir(posRegua>=0 && posMensagens>posRegua && posMensagens-posRegua<500,'botão de mensagens fica logo abaixo da Régua de Cobrança');
exigir(html.includes("definirItemExclusivoNoDOM('navMensagensClientesChris',usuarioAtual==='Chris')") &&
  html.includes("definirItemExclusivoNoDOM('view-mensagensClientesChris',usuarioAtual==='Chris')") &&
  html.includes("'mensagensClientesChris']"),'menu, view e porta pertencem somente ao Chris');
exigir(html.includes('const ativos=await window.renderCentralEntradaClientes()') &&
  html.includes('if(!Array.isArray(ativos))') && html.includes('Nenhuma lista antiga foi exibida'),
  'mensagens falha fechada quando a carteira ativa não é confirmada');
exigir(html.includes("const url='https://wa.me/'+numero+'?text='+encodeURIComponent(mensagem)") &&
  html.includes('Confira e envie no WhatsApp.'),'atalho endereça e preenche sem afirmar envio automático');

console.log(`RESULTADO: APROVADO (${total} asserções V71)`);
