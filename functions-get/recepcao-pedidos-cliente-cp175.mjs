import {executarRecepcaoLegendasCp183} from './recepcao-legendas-cp183.mjs';
/* Recepção administrativa limitada. Não escreve calendários, aprovação ou publicação. */
import {createHash} from 'node:crypto';
import GetEmpresasOtavioI144 from './lib/empresas-cp101-i165.mjs';
import {roteamentoPedidoClienteCp151} from './lib/destino-pedidos-cp151.mjs';
import {programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';

export const TIPOS_EDITORIAIS_CP175=Object.freeze(['ajuste_calendario','observacao_calendario','comentario_calendario','pedido_calendario']);
export const CAIXA_CP175='avisos_do_cliente';
export const CONTROLE_CP175='servicos_i165/recepcao_pedidos_cliente_cp175';
const sha=s=>createHash('sha256').update(s).digest('hex');
export const idDemandaClienteCp175=id=>'entrada_i54_'+sha(JSON.stringify([CAIXA_CP175,String(id)]));
const clonar=v=>JSON.parse(JSON.stringify(v));
const exigir=(ok,msg)=>{if(!ok)throw Error(msg);};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,220}$/.test(v);
const fonteCliente=a=>String(a.cliente||a.clienteSlug||a.slug||'');
const familiaZeiss=v=>['zeiss','zeens','otica-visao-araucaria'].includes(String(v||'').trim().toLowerCase());
function fonteFisicaCliente(idCliente,a){
 const campos=['canonicalId','cliente','clienteSlug','clienteSlugRef','slug','slugAtivado','calendarClienteSlug','clienteId','clientId','calendarioDocumentoIdPlanejado','calendarioDocumentoId'];
 const ids=campos.map(k=>a?.[k]).filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
 return !familiaZeiss(idCliente)&&!ids.some(familiaZeiss)||idCliente==='zeiss'&&ids.every(v=>typeof v==='string'&&v.trim().toLowerCase()==='zeiss');
}
function candidata(a){return !!a&&TIPOS_EDITORIAIS_CP175.includes(a.tipo)&&a.viraDemanda===true&&a.lido===false&&!a.cancelado&&!a.excluido&&!a.arquivado&&!a.descartado&&!a.deleted&&!a.deletedAt;}
export function conferirFonteClienteCp175(a,sourceId){
 exigir(id(sourceId)&&a&&(!Object.hasOwn(a,'schemaVersion')||a.schemaVersion===1),'A origem formal precisa da identificação e versão atuais.');
 const cliente=fonteCliente(a),mes=String(a.competencia||a.mes||a.mesRef||'');
 exigir(/^[a-z0-9][a-z0-9._-]{0,119}$/.test(cliente)&&fonteFisicaCliente(cliente,a),'A origem não confirma o cliente físico; nenhum alias foi adotado.');
 const op=String(a.operationId||''),geralSemCompetencia=a.tipo==='pedido_calendario'&&typeof a.autorUid==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(a.autorUid)&&sourceId.startsWith('portal_pedido_cp152_'+a.autorUid+'_')&&/^[a-f0-9]{32}$/.test(sourceId.slice(('portal_pedido_cp152_'+a.autorUid+'_').length))&&a.protocoloCriacaoCp152===sourceId&&a.demandaClienteId===sourceId&&!op&&!mes&&!a.itemId&&!a.itemNome;
 const identidade=a.tipo==='ajuste_calendario'?/^cal_ajuste_v113_[a-f0-9]{48}$/.test(sourceId)&&op===sourceId:a.tipo==='comentario_calendario'?id(a.comentarioId)&&op===a.comentarioId&&sourceId==='cal_recado_cp151_'+a.comentarioId:a.tipo==='observacao_calendario'?/^cal_obs_i35_[a-f0-9]{32}$/.test(op)&&sourceId===op+'_chris'&&a.paraQuem==='Chris':geralSemCompetencia;
 exigir(identidade,'A operação não confirma a mesma origem oficial.');
 exigir(geralSemCompetencia||/^20\d{2}-(0[1-9]|1[0-2])$/.test(mes),'A competência do pedido precisa de conferência.');
 exigir(typeof a.titulo==='string'&&a.titulo.trim()&&a.titulo.length<=2000&&typeof a.descricao==='string'&&a.descricao.trim()&&a.descricao.length<=100000,'O pedido precisa de título e texto completos. Nada foi cortado.');
 if(a.tipo==='ajuste_calendario')exigir(/^cal_ajuste_v113_[a-f0-9]{48}$/.test(sourceId)&&id(a.itemId)&&String(a.calendarId||cliente)===cliente,'O ajuste precisa confirmar o mesmo cliente, conteúdo e operação.');
 const rota=roteamentoPedidoClienteCp151(a,CAIXA_CP175);
 exigir(rota.editorial&&!rota.legenda&&rota.destinatario==='Chris','Esta origem segue outro responsável ou um fluxo histórico.');
 GetEmpresasOtavioI144.campos(cliente,a);
 return {cliente,mes,rota,geralSemCompetencia};
}
export function construirDemandaClienteCp175(a,sourceId,agora=new Date()){
 const {cliente,mes}=conferirFonteClienteCp175(a,sourceId),nome=String(a.clienteNome||cliente||''),em=agora.toISOString();
 let descricao=String(a.descricao||'');if(GetEmpresasOtavioI144.ativo(cliente)&&GetEmpresasOtavioI144.bruto(a))descricao+='\nEmpresa: '+GetEmpresasOtavioI144.nome(a);
 if(mes)descricao+='\n\nMês do pedido: '+mes.split('-').reverse().join('/');if(a.itemNome)descricao+='\nConteúdo: '+String(a.itemNome);
 descricao+='\n\n— veio do portal de '+(nome||'?');
 descricao+='\n\nCentral de ajustes: análise e acompanhamento com Chris. O pedido original do cliente está preservado acima.';
 const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(agora);
 return {titulo:String(a.titulo),descricao,destinatario:'Chris',origem:'cliente',clienteNome:nome,...GetEmpresasOtavioI144.campos(cliente,a),cliente,clienteSlug:cliente,ehAviso:true,demandaClienteId:String(a.demandaClienteId||''),prazoData:a.prazoData||hoje,prazoHora:a.prazoHora||'19:00',status:'pendente',criadoEm:em,origemAvisoColecao:CAIXA_CP175,origemAvisoId:sourceId,operationId:String(a.operationId||''),competencia:mes,itemId:String(a.itemId||''),itemNome:String(a.itemNome||''),tipoPedidoCliente:String(a.tipo),conversaoVersao:'i54',roteamentoPedidosCp151:{schema:1,destino:'Chris',classe:'calendario'},recepcaoAutomaticaCp175:{schema:1,executor:'scheduler',em}};
}
function conferirExistente(d,a,sourceId,demandaId){
 const cliente=fonteCliente(a),mes=String(a.competencia||a.mes||a.mesRef||'');
 exigir(d&&demandaId===idDemandaClienteCp175(sourceId)&&d.origem==='cliente'&&d.origemAvisoColecao===CAIXA_CP175&&d.origemAvisoId===sourceId&&String(d.operationId||'')===String(a.operationId||'')&&(d.clienteSlug||d.cliente)===cliente&&(!d.cliente||d.cliente===cliente)&&d.competencia===mes&&String(d.itemId||'')===String(a.itemId||'')&&d.tipoPedidoCliente===a.tipo,'A demanda existente não confirma a mesma origem, cliente e conteúdo.');
 GetEmpresasOtavioI144.conferir(cliente,a,d);
 exigir(d.destinatario==='Chris'||['aprovada','cancelada','cancelado'].includes(d.status)||d.excluido===true||d.arquivado===true,'O encaminhamento anterior precisa de conferência; nenhum destinatário foi trocado.');
}
export async function receberPedidoClienteTxCp175(db,sourceId,{agora=new Date()}={}){
 exigir(id(sourceId),'A identificação da origem é inválida.');
 return db.runTransaction(async tx=>{
  const origemRef=db.doc(CAIXA_CP175+'/'+sourceId),demandaId=idDemandaClienteCp175(sourceId),demandaRef=db.doc('demandas/'+demandaId);
  const [cfg,s,d]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(origemRef),tx.get(demandaRef)]);
  if(!programacaoAtivaI165(cfg.data())||cfg.data().habilidades?.preparacaoCentral!==true)return {estado:'pausada',demandaId};
  if(!s.exists||!candidata(s.data()))return {estado:'ignorada',demandaId};
  const a=s.data();if(a.tipo==='observacao_calendario'&&String(a.operationId||'').startsWith('cal_obs_i35_')&&String(a.paraQuem||a.destinatario||'')==='Amanda')return {estado:'historica',demandaId};
  conferirFonteClienteCp175(a,sourceId);
  exigir(!a.demandaInternaId||a.demandaInternaId===demandaId,'O recibo anterior aponta outra demanda. Nada foi substituído.');
  if(d.exists)conferirExistente(d.data(),a,sourceId,demandaId);
  else tx.create(demandaRef,construirDemandaClienteCp175(a,sourceId,agora));
  tx.update(origemRef,{lido:true,convertidoEm:agora.toISOString(),demandaInternaId:demandaId,conversaoVersao:'i54'});
  return {estado:d.exists?'ja_existente':'recebida',demandaId};
 });
}
export async function executarRecepcaoPedidosClienteCp175(db,{agora=new Date(),limite=40}={}){
 exigir(Number.isInteger(limite)&&limite>=1&&limite<=100,'O lote de recepção precisa ficar entre1e100.');
 const config=(await db.doc('programacao_config_i165/ativo').get()).data();
 if(!programacaoAtivaI165(config)||config.habilidades?.preparacaoCentral!==true)return {ativa:false,recebidas:0,erros:[]};
 const controle=db.doc(CONTROLE_CP175),anterior=(await controle.get()).data()||{},cursor=typeof anterior.cursor==='string'&&id(anterior.cursor)?anterior.cursor:'';
 // Um filtro simples usa o índice atual; quatro tipos são conferidos localmente e de novo na TX.
 let query=db.collection(CAIXA_CP175).where('lido','==',false).orderBy('__name__').limit(limite+1);if(cursor)query=query.startAfter(cursor);
 const snap=await query.get(),pagina=snap.docs.slice(0,limite),resultado={ativa:true,conferidas:pagina.length,recebidas:0,jaExistentes:0,ignoradas:0,demandaIds:[],erros:[],maisPendentes:snap.docs.length>limite,cursor:''};
 for(const s of pagina){if(!candidata(s.data())){resultado.ignoradas++;continue;}try{const r=await receberPedidoClienteTxCp175(db,s.id,{agora});if(r.estado==='recebida')resultado.recebidas++;else if(r.estado==='ja_existente')resultado.jaExistentes++;else resultado.ignoradas++;if(['recebida','ja_existente'].includes(r.estado))resultado.demandaIds.push(r.demandaId);}catch(e){resultado.erros.push({origem:s.id,erro:String(e.message||e).slice(0,500)});}}
 const limiteLegendas=Math.min(limite,100-resultado.demandaIds.length),legendas=limiteLegendas>0?await executarRecepcaoLegendasCp183(db,{agora,limite:limiteLegendas}):{ativa:true,estado:'aguarda_proximo_lote',demandaIds:[],erros:[],maisPendentes:true};resultado.legendasCp183=legendas;resultado.demandaIds.push(...legendas.demandaIds);resultado.erros.push(...legendas.erros.map(x=>({...x,servico:'legendas_cp183'})));
 resultado.cursor=resultado.maisPendentes?pagina.at(-1).id:'';
 await controle.set({schema:1,estado:resultado.erros.length?'conferir_origens':resultado.maisPendentes?'mais_pendentes':'conferida',ultimaExecucao:agora.toISOString(),cursor:resultado.cursor,conferidas:resultado.conferidas,recebidas:resultado.recebidas,jaExistentes:resultado.jaExistentes,ignoradas:resultado.ignoradas,maisPendentes:resultado.maisPendentes,erros:clonar(resultado.erros),limite,portalAbertoNecessario:false,origem:'cron operacional existente I165'},{merge:true});
 return resultado;
}
