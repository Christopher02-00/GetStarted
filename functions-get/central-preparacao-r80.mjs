/* Preparação interna via callable existente. Não publica, não migra e não ativa a troca I164. */
import {FieldValue} from 'firebase-admin/firestore';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {validarCadastroI165} from './contexto.mjs';
import {programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {criarRepositorio} from './central/lib/gs-planejamento-social-i155.mjs';
import {carteiraCanonicaI164} from './central/lib/gs-carteira-calendarios-i164.mjs';
import {obterFeriados} from './central-feriados-copia-r80.mjs';
import {criarIoAdminCentralR80} from './central-preparacao-io-r80.mjs';
import {entradaCentralR80,prepararArquivoWireR80,ACOES_CENTRAL_HTTP_R80,exigirCentralR80 as e,PARTE_R80} from './central-preparacao-validacao-r80.mjs';
import {envelopeCentralR80} from './codec-central-r80.mjs';
export {ACOES_CENTRAL_HTTP_R80};
import {PAPEIS_PLANEJAMENTO_R81} from './central/lib/gs-papeis-planejamento-r81.mjs';
const papeis=PAPEIS_PLANEJAMENTO_R81;
const linhas=s=>s.docs.map(d=>({id:d.id,data:d.data()}));
const DTO_ORIGEM=['link','descricao','ideia','autorPerfil','autor','empresaOtavio','cliente','excluido'];
function calendarioMes(c,mes){if(!c)return null;return {excluido:c.excluido||false,planejamentoBasesI155:{[mes]:c.planejamentoBasesI155?.[mes]||''},aprovacaoMeses:{[mes]:c.aprovacaoMeses?.[mes]||null},items:(c.items||[]).filter(x=>x?.mes===mes),blocosPorMes:{[mes]:c.blocosPorMes?.[mes]||null}};}
export async function operarCentralPreparacaoR80(db,auth,pedido,{agora=new Date()}={}){
 entradaCentralR80(pedido);const ator=validarContaEsperadaI165(auth,pedido);e(papeis.includes(ator.papel),'A preparação pertence ao Christopher, Amanda e Gabi.');
 async function gate(tx,{capacidades=false}={}){
  const [cfg,cad,processo]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(db.doc('usuarios_equipe/'+ator.email)),tx.get(db.doc('processo_calendarios_i164/ativo'))]);
  validarCadastroI165(ator,cad.data());const hold=!processo.exists||processo.data()?.ativo===false,ativa=programacaoAtivaI165(cfg.data())&&cfg.data().habilidades?.preparacaoCentral===true&&hold;
  if(!capacidades)e(ativa,'A preparação está pausada. Os calendários atuais continuam no fluxo de sempre.');
  return {preparacaoAtiva:ativa,manterFluxoAtual:true,papelConfirmado:ator.papel,atorReal:ator.real};
 }
 if(pedido.acao==='central_capacidades')return envelopeCentralR80(await db.runTransaction(tx=>gate(tx,{capacidades:true})));
 await db.runTransaction(tx=>gate(tx));
 const stamp=FieldValue.serverTimestamp(),{io,contexto}=criarIoAdminCentralR80(db,{ator,pedido,conferirGate:gate,stamp});
 const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(agora);
 async function clientes(mes){const [ex,co]=await Promise.all([io.getDocsFromServer(io.collection(db,'clientes_extras')),io.getDocsFromServer(io.collection(db,'clientes_config'))]);return carteiraCanonicaI164({extras:linhas(ex),configs:linhas(co),hoje,competencia:mes}).carteira;}
 async function origens(cliente){const snaps=await Promise.all(['referencias','referencias_cliente'].map(col=>io.getDocsFromServer(io.query(io.collection(db,col),io.where('cliente','==',cliente)))));return snaps.flatMap((s,i)=>s.docs.filter(d=>d.data().excluido!==true).map(d=>({id:d.id,origemColecao:i?'referencias_cliente':'referencias',...Object.fromEntries(DTO_ORIGEM.filter(k=>d.data()[k]!==undefined).map(k=>[k,d.data()[k]]))})));}
 const repo=criarRepositorio(io,contexto,{clientes,origens,calendario:async()=>{throw Error('A preparação não libera calendários ao cliente.');},ausencias:async()=>{const s=await io.getDocsFromServer(io.collection(db,'ausencias'));return s.docs.map(d=>({...d.data(),id:d.id}));},feriados:async mes=>{const ano=Number(mes.slice(0,4));return [...new Set([...obterFeriados(ano-1),...obterFeriados(ano),...obterFeriados(ano+1)])];}});
 let dados;
 switch(pedido.acao){
  case 'central_ler':dados=await repo.ler(pedido.ciclo);break;
  case 'central_listar':dados=await repo.listar(pedido.competencia);break;
  case 'central_config_ler':dados=await repo.config(pedido.competencia);break;
  case 'central_config_salvar':dados=await repo.salvarConfig(pedido.config,pedido.esperadaRevisao,pedido.competencia);break;
  case 'central_mutar':dados=await repo.mutar(pedido.ciclo,pedido.acaoPreparacao,pedido.dados,pedido.esperadaRevisao,pedido.operacao);break;
  case 'central_fontes_organizacao':dados=await repo.fontesAgendaI167(pedido.cliente,pedido.competencia);break;
  case 'central_clientes':dados=await repo.clientes(pedido.competencia,true);break;
  case 'central_referencias_origem':dados=await repo.origens(pedido.cliente);break;
  case 'central_analise':dados=await repo.analise(pedido.cliente,pedido.competenciaResultados);break;
  case 'central_ausencias':dados=await repo.ausencias();break;
  case 'central_historico':dados=await repo.historico(pedido.ciclo);break;
  case 'central_arquivo_enviar':dados=await repo.arquivos.enviar(pedido.ciclo,prepararArquivoWireR80(pedido.arquivo));break;
  case 'central_arquivo_ler':{
   const a=await repo.arquivos.ler(pedido.ciclo,pedido.arquivoId),{buffer,...arquivo}=a,partesBase64=[];for(let i=0;i<buffer.length;i+=PARTE_R80)partesBase64.push({indice:partesBase64.length,dados:Buffer.from(buffer.subarray(i,i+PARTE_R80)).toString('base64')});dados={arquivo,partesBase64};break;
  }
  case 'central_versao_ciclo':{
   const [s,cal]=await Promise.all([io.getDocFromServer(io.doc(db,'planejamento_social_i155',pedido.ciclo)),io.getDocFromServer(io.doc(db,'calendarios',pedido.cliente))]);e(s.exists(),'O ciclo não foi encontrado; a última leitura foi preservada.');const c=s.data();e(c.cliente===pedido.cliente&&c.competencia===pedido.competencia,'A versão pertence a outro ciclo.');dados={ciclo:{id:s.id,revisao:c.revisao,operacao:c.operacao||''},calendario:calendarioMes(cal.exists()?cal.data():null,pedido.competencia)};break;
  }
  default:e(false,'Ação fora da preparação.');
 }
 // Readback só sai ao mesmo Google/cadastro e capacidade ainda válidos após a operação.
 await db.runTransaction(tx=>gate(tx));return envelopeCentralR80(dados);
}
