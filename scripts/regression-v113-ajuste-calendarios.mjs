import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { resolve } from 'node:path';

const raiz=resolve(import.meta.dirname,'..');
const calendario=readFileSync(resolve(raiz,'calendario.html'),'utf8');
const calendarios=readFileSync(resolve(raiz,'calendarios.html'),'utf8');
const regras=readFileSync(resolve(raiz,'firestore.rules'),'utf8');

let aprovados=0;
const falhas=[];
function caso(nome,condicao){
  if(condicao){ aprovados++; console.log(`ok ${aprovados+falhas.length} - ${nome}`); return; }
  falhas.push(nome); console.error(`not ok ${aprovados+falhas.length} - ${nome}`);
}

caso('aliases de calendário continuam idênticos',calendario===calendarios);
caso('pedido explícito possui operação determinística',calendario.includes('idOperacaoPedidoAjusteClienteV113'));
caso('pedido explícito usa transação dedicada',calendario.includes('registrarPedidoAjusteClienteNoBancoV113'));
caso('pedido explícito deixa de depender da dupla salvar + addDoc',
  !/salvarComoCliente[\s\S]{0,1400}pedirAjusteDoCliente/.test(
    calendario.slice(calendario.indexOf('window.enviarObsDoCliente'),calendario.indexOf('async function avisarEquipeDaAprovacao'))
  ));
caso('transição formal libera a Gabi somente em ajuste_interno',
  calendario.includes("status:'ajuste_interno'")&&calendario.includes('pedidoAjusteCliente'));
caso('pedido e aviso usam a mesma operação atômica',
  calendario.includes("doc(fb.db,'avisos_do_cliente',operationId)")&&calendario.includes('transacao.set(avisoRef'));
caso('retry reconhece operação já confirmada',calendario.includes('jaConfirmado:true'));
caso('recuperação de pedido legado é explícita',calendario.includes('reabrirCalendarioPorPedidoClienteV113'));
caso('comentário geral não chama a reabertura',
  !calendario.slice(calendario.indexOf('window.submitFeedback'),calendario.indexOf('window.enviarObsDoCliente')).includes('registrarPedidoAjusteClienteNoBancoV113'));
caso('regra tem contrato dedicado para o ajuste do cliente',regras.includes('pedidoAjusteCalendarioClienteValidoV113'));
caso('regra geral do cliente não aceita aprovação mensal sem o contrato dedicado',
  regras.includes("hasOnly(['items','comments','updatedAt'])")&&
  regras.includes('pedidoAjusteCalendarioClienteValidoV113(slug)'));
caso('regra limita a uma competência dinâmica',
  regras.includes("mapaDepois.diff(mapaAntes).affectedKeys().hasOnly([pedido.competencia])"));
caso('regra exige liberado para ajuste_interno',
  regras.includes("get('status', '') == 'liberado'")&&regras.includes("marcaDepois.status == 'ajuste_interno'"));
caso('regra atrela aviso e calendário ao mesmo commit',
  regras.includes('existsAfter(/databases/$(database)/documents/avisos_do_cliente/$(pedido.operationId))'));
caso('recuperação antiga exige confirmação humana e é idempotente',
  calendario.includes("if(!confirm('Reabrir '")&&
  calendario.includes("atual.pedidoAjusteOperationId===operationId")&&
  calendario.includes("origemAjuste:'recuperacao_pedido_anterior_v113'"));
caso('edição da Gabi remove aprovação antiga do item alterado',
  calendario.includes("estadoDoMes(alvoMes)==='ajuste_interno'")&&
  calendario.includes("it.apr=false; it.aprPor=''; it.aprEm=''; it.aprovadoPeloClienteEm='';"));
caso('pedido geral não reabre calendário',
  !calendario.slice(calendario.indexOf('async function avisarEquipeDoRecado'),calendario.indexOf('function renderFeedback')).includes('ajuste_interno'));
caso('identidade antiga nunca usa somente título parecido',
  calendario.includes('candidatos.length===1')&&calendario.includes('Number(item?.day||0)===Number(itemOriginal?.day||0)'));

const inicioRuntime=calendario.indexOf('function normalizarIdentidadeItemPedidoV113');
const fimRuntime=calendario.indexOf('let pedidoAjusteClienteEmCursoV113',inicioRuntime);
const runtimeV113=calendario.slice(inicioRuntime,fimRuntime);
const estado={calendario:null,avisoExiste:false,gravacoes:[]};
const contexto=vm.createContext({
  console,crypto:webcrypto,TextEncoder,Uint8Array,Date,Object,String,Number,Error,Promise,
  window:{
    __modoCal:'cliente',__clienteId:'camargos',__fbAuthUid:'uid-cliente-v113',
    __fb:{
      db:{},docRef:{path:'calendarios/camargos'},
      doc(_db,colecao,id){return {path:`${colecao}/${id}`};},
      serverTimestamp(){return {__serverTimestamp:true};},
      async runTransaction(_db,executar){
        const tx={
          async get(ref){
            if(ref.path==='calendarios/camargos') return {exists:()=>true,data:()=>structuredClone(estado.calendario)};
            return {exists:()=>estado.avisoExiste,data:()=>({operationId:'existente'})};
          },
          set(ref,dados,opcoes){estado.gravacoes.push({ref:ref.path,dados,opcoes});}
        };
        return executar(tx);
      }
    }
  },
  mesVisivel:'2026-09',
  data:{client:"Camargo's",month:'setembro de 2026'},
  mesDoTexto(){return '2026-09';},
  mesDoItemNoCalendario(cal,item){return item?.mes||((cal?.month)?'2026-09':'');},
  aprovacaoCompativelNoCalendario(cal,mes){return cal?.aprovacaoMeses?.[mes]||null;},
  estadoPublicadoEfetivoCalendario(_mes,marca){return marca?.status||'';},
  mesHistoricoAnteriorAoControleNoCalendario(){return false;},
  docJaUsaMesesNoCalendario(cal){return ((cal?.items)||[]).some(item=>item?.mes)||!!cal?.aprovacaoMeses||!!cal?.mesLegado;},
  structuredClone
});
vm.runInContext(runtimeV113,contexto);
const item={itemId:'calitem-camargos-1',mes:'2026-09',day:8,name:'Conteúdo principal'};
const texto='Trocar a chamada final, por favor.';
const op1=await contexto.idOperacaoPedidoAjusteClienteV113('camargos','2026-09',item,0,texto);
const op2=await contexto.idOperacaoPedidoAjusteClienteV113('camargos','2026-09',item,0,texto);
const op3=await contexto.idOperacaoPedidoAjusteClienteV113('camargos','2026-09',item,0,texto+' Agora.');
caso('hash operacional é estável e muda quando o pedido muda',op1===op2&&op1!==op3&&/^cal_ajuste_v113_[a-f0-9]{48}$/.test(op1));

const baseCalendario=()=>({client:"Camargo's",month:'setembro de 2026',updatedAt:'antes',items:[item,{itemId:'calitem-2',mes:'2026-09',day:15,name:'Outro'}],comments:[],
  aprovacaoMeses:{'2026-08':{status:'liberado',mes:'2026-08',por:'Amanda',em:'agosto'},'2026-09':{status:'liberado',mes:'2026-09',por:'Amanda',em:'setembro'}}});
estado.calendario=baseCalendario();estado.avisoExiste=false;estado.gravacoes=[];
const confirmado=await contexto.registrarPedidoAjusteClienteNoBancoV113({item,itemIdx:0,texto,operationId:op1});
const escritaCal=estado.gravacoes.find(g=>g.ref==='calendarios/camargos');
const escritaAviso=estado.gravacoes.find(g=>g.ref===`avisos_do_cliente/${op1}`);
caso('transação comportamental grava só projeção mensal e aviso determinístico',
  confirmado.marca.status==='ajuste_interno'&&estado.gravacoes.length===2&&
  Object.keys(escritaCal.dados).sort().join(',')==='aprovacaoMeses,pedidoAjusteCliente,updatedAt'&&
  !('items' in escritaCal.dados)&&escritaCal.dados.aprovacaoMeses['2026-08'].em==='agosto'&&
  escritaAviso.dados.paraQuem==='Gabrielle'&&escritaAviso.dados.viraDemanda===true);

estado.calendario={...baseCalendario(),pedidoAjusteCliente:{...confirmado.pedido,operationId:op1,competencia:'2026-09'},
  aprovacaoMeses:{...baseCalendario().aprovacaoMeses,'2026-09':confirmado.marca}};
estado.avisoExiste=true;estado.gravacoes=[];
const retry=await contexto.registrarPedidoAjusteClienteNoBancoV113({item,itemIdx:0,texto,operationId:op1});
caso('retry comportamental não repete nenhuma gravação',retry.jaConfirmado===true&&estado.gravacoes.length===0);

const duplicados=[{mes:'2026-09',day:8,name:'Mesmo título'},{mes:'2026-09',day:8,name:'Mesmo título'}];
const localizadoAmbiguo=contexto.localizarItemPedidoAjusteV113({items:duplicados},{mes:'2026-09',day:8,name:'Mesmo título'},99,'2026-09');
caso('legado ambíguo sem índice confirmado é recusado',localizadoAmbiguo===null);

estado.calendario={client:'Legado',month:'setembro de 2026',items:[{day:8,name:'Antigo'}],comments:[]};
estado.avisoExiste=false;estado.gravacoes=[];
let codigoLegado='';
try{await contexto.registrarPedidoAjusteClienteNoBancoV113({item:{day:8,name:'Antigo'},itemIdx:0,texto,operationId:op1});}
catch(erro){codigoLegado=erro.code;}
caso('legado sem liberação mensal exige recuperação humana e fica zero-write',codigoLegado==='gs/legado-sem-estado-explicito'&&estado.gravacoes.length===0);

console.log(`\nV113 ajuste de calendários: ${aprovados} aprovado(s), ${falhas.length} falha(s).`);
if(falhas.length){
  for(const nome of falhas) console.error(` - ${nome}`);
  process.exitCode=1;
}
