import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "firebase/firestore";

const aqui=dirname(fileURLToPath(import.meta.url));
const rulesPath=join(aqui,"..","..","firestore.rules");
const projectId="demo-get-conclusao-v101";
const rules=await readFile(rulesPath,"utf8");
const rulesHash=createHash("sha256").update(rules).digest("hex");
const [host,rawPort]=(process.env.FIRESTORE_EMULATOR_HOST||"127.0.0.1:9299").split(":");
const port=Number(rawPort);
const env=await initializeTestEnvironment({projectId,firestore:{host,port,rules}});

const clienteId="camargos-v113-sintetico";
const outroClienteId="outro-v113-sintetico";
const uidCliente="uid-cliente-v113";
const uidOutro="uid-outro-v113";
const competencia="2026-09";
const operationId="cal_ajuste_v113_"+"a".repeat(48);
const token="token-cliente-v113-seguro";
const tokenOutro="token-outro-v113-seguro";
const contextoCliente=env.authenticatedContext(uidCliente);
const contextoOutro=env.authenticatedContext(uidOutro);
const contextoGabi=env.authenticatedContext("uid-gabi-v113",{
  email:"gabrielleromaomarketing@gmail.com",email_verified:true
});
const dbCliente=contextoCliente.firestore();
const dbOutro=contextoOutro.firestore();
const dbGabi=contextoGabi.firestore();

let passou=0;
let falhou=0;
async function caso(nome,execucao){
  try{await execucao();passou++;console.log(`ok ${passou+falhou} - ${nome}`);}
  catch(erro){falhou++;console.error(`not ok ${passou+falhou} - ${nome}`);console.error(erro);}
}
const baseCalendario=()=>({
  client:"Camargo's",month:"setembro de 2026",updatedAt:"2026-08-20T12:00:00.000Z",
  items:[
    {itemId:"calitem-camargos-1",mes:competencia,day:8,name:"Conteúdo principal",apr:true,aprPor:"cliente",aprEm:"2026-08-20T10:00:00.000Z"},
    {itemId:"calitem-camargos-2",mes:competencia,day:15,name:"Segundo conteúdo",apr:false}
  ],
  comments:[],
  aprovacaoMeses:{
    [competencia]:{status:"liberado",mes:competencia,por:"Amanda",em:"2026-08-20T11:00:00.000Z",motivoAjuste:""},
    "2026-08":{status:"liberado",mes:"2026-08",por:"Amanda",em:"2026-07-20T11:00:00.000Z",motivoAjuste:""}
  }
});
function montarOperacao({
  id=operationId,cliente=clienteId,itemIdx=0,itemId="calitem-camargos-1",
  itemNome="Conteúdo principal",texto="Trocar a chamada final, por favor.",
  mudarOutroMes=false,mudarItems=false,campoExtra=false,paraQuem="Gabrielle",
  timestampServidor=true
}={}){
  const criadoEm="2026-08-25T03:00:00.000Z";
  const anterior=baseCalendario();
  const marcaAnterior=anterior.aprovacaoMeses[competencia];
  const pedido={schemaVersion:1,operationId:id,calendarId:cliente,competencia,itemId,itemIdx,itemNome,texto,
    por:"Cliente",autorUid:uidCliente,criadoEm,registradoEm:timestampServidor?serverTimestamp():new Date("2026-08-25T03:00:00.000Z")};
  if(campoExtra) pedido.extra="não permitido";
  const marca={...marcaAnterior,status:"ajuste_interno",mes:competencia,por:"Cliente",em:criadoEm,
    motivoAjuste:texto,pedidoAjusteOperationId:id,pedidoAjusteItemId:itemId,pedidoAjusteItemIdx:itemIdx,
    liberadoEmAnterior:marcaAnterior.em,liberadoPorAnterior:marcaAnterior.por};
  const calendario={...anterior,updatedAt:criadoEm,pedidoAjusteCliente:pedido,
    aprovacaoMeses:{...anterior.aprovacaoMeses,[competencia]:marca}};
  if(mudarOutroMes) calendario.aprovacaoMeses["2026-08"]={...calendario.aprovacaoMeses["2026-08"],por:"intruso"};
  if(mudarItems) calendario.items=[...calendario.items,{itemId:"injetado",mes:competencia,day:22,name:"Não permitido"}];
  const aviso={cliente,clienteNome:"Camargo's",titulo:"✏️ Camargo's pediu ajuste em: Conteúdo principal",
    descricao:"Conteúdo do dia 8 — Conteúdo principal\n\nO que o cliente escreveu:\n\""+texto+"\"\n\nO mês voltou formalmente para ajuste. Corrija e envie novamente para a Amanda.",
    texto,itemNome,paraQuem,lido:false,viraDemanda:true,tipo:"ajuste_calendario",operationId:id,
    competencia,itemId,itemIdx,criadoEm,registradoEm:timestampServidor?serverTimestamp():new Date("2026-08-25T03:00:00.000Z")};
  return {calendario,aviso};
}
async function semRegras(execucao){return env.withSecurityRulesDisabled(ctx=>execucao(ctx.firestore()));}
async function semear({estado="liberado"}={}){
  await env.clearFirestore();
  await semRegras(async db=>{
    await setDoc(doc(db,"clientes_acesso",clienteId),{token,tokenEquipe:"token-equipe-v113",nome:"Camargo's",ativo:true});
    await setDoc(doc(db,"clientes_acesso",outroClienteId),{token:tokenOutro,tokenEquipe:"token-equipe-outro-v113",nome:"Outro",ativo:true});
    await setDoc(doc(db,"sessoes_cliente",uidCliente),{cliente:clienteId,token,modo:"cliente"});
    await setDoc(doc(db,"sessoes_cliente",uidOutro),{cliente:outroClienteId,token:tokenOutro,modo:"cliente"});
    const cal=baseCalendario();cal.aprovacaoMeses[competencia].status=estado;
    await setDoc(doc(db,"calendarios",clienteId),cal);
    await setDoc(doc(db,"calendarios",outroClienteId),{...cal,client:"Outro"});
  });
}
async function gravarAtomico(db,{calendario,aviso},id=operationId){
  const batch=writeBatch(db);
  batch.set(doc(db,"calendarios",clienteId),calendario);
  batch.set(doc(db,"avisos_do_cliente",id),aviso);
  return batch.commit();
}
async function gravarComoRuntime(db,operacao,id=operationId){
  return runTransaction(db,async tx=>{
    const snap=await tx.get(doc(db,"calendarios",clienteId));
    assert.equal(snap.exists(),true);
    tx.set(doc(db,"calendarios",clienteId),operacao.calendario);
    tx.set(doc(db,"avisos_do_cliente",id),operacao.aviso);
  });
}

await caso("cliente reabre competência liberada e cria aviso no mesmo commit",async()=>{
  await semear();
  await assertSucceeds(gravarComoRuntime(dbCliente,montarOperacao()));
  const cal=(await getDoc(doc(dbCliente,"calendarios",clienteId))).data();
  assert.equal(cal.aprovacaoMeses[competencia].status,"ajuste_interno");
  assert.equal(cal.aprovacaoMeses["2026-08"].por,"Amanda");
  const aviso=await getDoc(doc(dbCliente,"avisos_do_cliente",operationId));
  assert.equal(aviso.exists(),true);assert.equal(aviso.data().paraQuem,"Gabrielle");
});
await caso("calendário sem aviso atômico é negado",async()=>{
  await semear();
  await assertFails(setDoc(doc(dbCliente,"calendarios",clienteId),montarOperacao().calendario));
});
await caso("aviso sem transição atômica é negado",async()=>{
  await semear();
  await assertFails(setDoc(doc(dbCliente,"avisos_do_cliente",operationId),montarOperacao().aviso));
});
await caso("aviso concorrente não pode ser sobrescrito para forçar o ajuste",async()=>{
  await semear();
  await semRegras(db=>setDoc(doc(db,"avisos_do_cliente",operationId),{cliente:clienteId,tipo:"recado",operationId}));
  await assertFails(gravarAtomico(dbCliente,montarOperacao()));
});
await caso("rascunho não pode saltar para ajuste interno",async()=>{
  await semear({estado:"rascunho"});
  await assertFails(gravarAtomico(dbCliente,montarOperacao()));
});
await caso("item divergente é negado",async()=>{
  await semear();
  await assertFails(gravarAtomico(dbCliente,montarOperacao({itemId:"item-errado"})));
});
await caso("mudança simultânea de conteúdo é negada",async()=>{
  await semear();
  await assertFails(gravarAtomico(dbCliente,montarOperacao({mudarItems:true})));
});
await caso("outra competência não pode ser modificada junto",async()=>{
  await semear();
  await assertFails(gravarAtomico(dbCliente,montarOperacao({mudarOutroMes:true})));
});
await caso("campo extra no pedido é negado",async()=>{
  await semear();
  await assertFails(gravarAtomico(dbCliente,montarOperacao({campoExtra:true})));
});
await caso("timestamp escolhido no navegador é negado",async()=>{
  await semear();
  await assertFails(gravarAtomico(dbCliente,montarOperacao({timestampServidor:false})));
});
await caso("aviso para destinatário diferente é negado",async()=>{
  await semear();
  await assertFails(gravarAtomico(dbCliente,montarOperacao({paraQuem:"Amanda"})));
});
await caso("sessão de outro cliente não escreve Camargo's",async()=>{
  await semear();
  await assertFails(gravarAtomico(dbOutro,montarOperacao()));
});
await caso("aprovação comum do próprio item continua compatível",async()=>{
  await semear();
  const cal=baseCalendario();cal.items[0]={...cal.items[0],apr:false,aprPor:"",aprEm:""};cal.updatedAt="2026-08-25T03:05:00.000Z";
  await assertSucceeds(setDoc(doc(dbCliente,"calendarios",clienteId),cal));
});
await caso("retry do runtime não cria segundo aviso",async()=>{
  await semear();
  await assertSucceeds(gravarAtomico(dbCliente,montarOperacao()));
  const calAntes=(await getDoc(doc(dbCliente,"calendarios",clienteId))).data();
  const avisoAntes=(await getDoc(doc(dbCliente,"avisos_do_cliente",operationId))).data();
  assert.equal(calAntes.pedidoAjusteCliente.operationId,operationId);
  assert.equal(avisoAntes.operationId,operationId);
  await assertFails(gravarAtomico(dbCliente,montarOperacao()));
  const avisoDepois=(await getDoc(doc(dbCliente,"avisos_do_cliente",operationId))).data();
  assert.equal(avisoDepois.operationId,operationId);
});
await caso("Gabi mantém a recuperação operacional da equipe",async()=>{
  await semear();
  const cal=baseCalendario();
  cal.aprovacaoMeses[competencia]={...cal.aprovacaoMeses[competencia],status:"ajuste_interno",por:"Gabrielle",motivoAjuste:"Pedido anterior confirmado"};
  cal.updatedAt="2026-08-25T03:10:00.000Z";
  await assertSucceeds(setDoc(doc(dbGabi,"calendarios",clienteId),cal));
});

await env.cleanup();
console.log(`V113_RULES_SUMMARY passed=${passou} failed=${falhou} rules_sha256=${rulesHash}`);
if(falhou) process.exitCode=1;
