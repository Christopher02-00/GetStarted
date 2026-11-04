/* Client caption intake and its generic work receipt only. This does not write
 * calendar content, posts, editorial approval or the public request payload. */
import {createHash} from 'node:crypto';
import {FieldValue,FieldPath} from 'firebase-admin/firestore';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {validarCadastroI165,hashI165} from './contexto.mjs';
import {exigirI165 as e,idFisicoI165} from './lib/gs-contexto-operacional-i165.mjs';
import GetEmpresasOtavioI144 from './lib/empresas-cp101-i165.mjs';
import {envelopeCentralR80} from './codec-central-r80.mjs';

export const ACOES_PEDIDOS_LEGENDA_CP152=Object.freeze(['pedidos_legenda_conferir_cp152','pedido_legenda_entregar_cp152','pedido_legenda_cancelar_tentativa_cp152']);
const TIPOS=Object.freeze(['pedido_legenda','ajuste_legenda','legenda','correcao_legenda']);
const CAIXAS=Object.freeze(['avisos_do_cliente','pedidos_publicos']);
const COMUNS=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao'];
const ORIGEM=['demandaId','clienteEsperado','origemAvisoColecaoEsperada','origemAvisoIdEsperado'];
const texto=(v,n)=>typeof v==='string'&&v.length<=n;
const idI54=(caixa,id)=>'entrada_i54_'+createHash('sha256').update(JSON.stringify([caixa,String(id)])).digest('hex');
const clienteFonte=a=>String(a.cliente||a.clienteSlug||a.slug||'');
function familiaZeissR4(valor){return ['zeiss','zeens','otica-visao-araucaria'].includes(String(valor||'').trim().toLowerCase());}
function fonteFisicaClienteR4(id,dados){
 const campos=['canonicalId','cliente','clienteSlug','clienteSlugRef','slug','slugAtivado','calendarClienteSlug','clienteId','clientId','calendarioDocumentoIdPlanejado','calendarioDocumentoId'];
 const ids=campos.map(k=>dados?.[k]).filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
 if(!familiaZeissR4(id)&&!ids.some(familiaZeissR4))return true;
 return String(id||'')==='zeiss'&&ids.every(v=>typeof v==='string'&&v.trim().toLowerCase()==='zeiss');
}
// Same group calculation as Office calcularStatusPortalPorDemandas.
export function calcularStatusPortalPorDemandasCp152(grupo,statusFallback){
 const ativas=(grupo||[]).filter(d=>d&&!d.excluido);
 if(!ativas.length)return {status:statusFallback||'pendente',responsaveisStatus:{}};
 const encerrada=d=>['aprovada','cancelada'].includes(String(d.status||''));
 const todosEncerrados=ativas.every(encerrada);
 const alguemAndou=ativas.some(d=>encerrada(d)||d.status==='concluida_aguardando_aprovacao');
 const responsaveisStatus={};
 ativas.forEach(d=>{if(d.destinatario)responsaveisStatus[d.destinatario]=encerrada(d)?'concluida':(d.status==='concluida_aguardando_aprovacao'?'andamento':'pendente');});
 return {status:todosEncerrados?'concluida':(alguemAndou?'andamento':'pendente'),responsaveisStatus};
}
function validar(d){
 e(d&&typeof d==='object'&&!Array.isArray(d)&&ACOES_PEDIDOS_LEGENDA_CP152.includes(d.acao),'legenda-entrada','Ação de legenda inválida.');
 const entrega=d.acao!=='pedidos_legenda_conferir_cp152',individual=entrega||Object.hasOwn(d,'demandaId');
 const keys=[...COMUNS,...(individual?ORIGEM:[]),...(!individual&&Object.hasOwn(d,'cursores')?['cursores']:[]),...(entrega?['operacao','assinaturaEsperada','provaTexto','provaImagemUrl','repararAcompanhamento']:[])];
 e(Object.keys(d).length===keys.length&&Object.keys(d).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(d,k)),'legenda-campos','Confira os campos desta tentativa.');
 e(texto(d.sessao,180)&&d.sessao.length>0,'legenda-sessao','Confira a sessão atual.');
 if(!individual&&Object.hasOwn(d,'cursores'))e(d.cursores&&typeof d.cursores==='object'&&!Array.isArray(d.cursores)&&Object.keys(d.cursores).length===2&&CAIXAS.every(c=>Object.hasOwn(d.cursores,c)&&(d.cursores[c]===null||d.cursores[c]===''||idFisicoI165(d.cursores[c]))),'legenda-cursor','Recomece esta conferência de pedidos.');
 if(individual)e(/^entrada_i54_[a-f0-9]{64}$/.test(d.demandaId)&&texto(d.clienteEsperado,180)&&CAIXAS.includes(d.origemAvisoColecaoEsperada)&&idFisicoI165(d.origemAvisoIdEsperado),'legenda-origem','Confira a mesma origem do pedido.');
 if(entrega)e(/^[A-Za-z0-9_-]{8,100}$/.test(d.operacao)&&/^[a-f0-9]{64}$/.test(d.assinaturaEsperada)&&texto(d.provaTexto,10000)&&texto(d.provaImagemUrl,2048)&&typeof d.repararAcompanhamento==='boolean'&&(d.repararAcompanhamento||d.provaTexto.trim()||d.provaImagemUrl.trim()),'legenda-prova','Registre a prova e preserve a mesma tentativa.');
}
function atorEsperado(auth,d){
 const ator=validarContaEsperadaI165(auth,d);
 e(ator.papel==='Chris'&&ator.real==='Chris','legenda-papel','Este recebimento pertence ao Chris no próprio perfil.');
 return ator;
}
async function cadastroTx(db,tx,ator){const s=await tx.get(db.doc('usuarios_equipe/'+ator.email));validarCadastroI165(ator,s.data());}
function conferirFonte(a,caixa,id){
 e(a&&TIPOS.includes(a.tipo)&&CAIXAS.includes(caixa)&&idFisicoI165(id)&&['Chris','Gabrielle'].includes(String(a.paraQuem||a.destinatario||'').trim()),'legenda-tipo','A fonte não confirma um pedido de legenda atual ou sua origem legada.');
 const cliente=clienteFonte(a);
 const aliases=['cliente','clienteSlug','slug','canonicalId','clienteSlugRef','slugAtivado','calendarClienteSlug','clienteId','clientId','calendarioDocumentoIdPlanejado','calendarioDocumentoId'];
 e(aliases.every(k=>a[k]===undefined||a[k]===null||a[k]===''||typeof a[k]==='string'&&a[k]===cliente),'legenda-alias','A fonte contém identidades de cliente divergentes.');
 GetEmpresasOtavioI144.campos(cliente,a);
 e((!cliente||idFisicoI165(cliente))&&fonteFisicaClienteR4(cliente,a)&&a.viraDemanda!==false&&!a.excluido&&!a.cancelado&&!a.arquivado,'legenda-fonte','A fonte deste pedido não está disponível.');
 return cliente;
}
function conferirDemanda(d,a,caixa,sourceId,demandaId){
 const cliente=conferirFonte(a,caixa,sourceId);
 e(d&&demandaId===idI54(caixa,sourceId)&&d.origem==='cliente'&&(d.destinatario==='Chris'||d.destinatario==='Gabrielle'&&d.status==='aprovada')&&TIPOS.includes(d.tipoPedidoCliente)&&d.tipoPedidoCliente===a.tipo&&d.origemAvisoColecao===caixa&&d.origemAvisoId===sourceId&&d.conversaoVersao==='i54'&&d.ehAviso===true&&!d.excluido&&!d.arquivado&&!['cancelada','cancelado'].includes(d.status),'legenda-vinculo','A demanda não confirma a mesma legenda e origem.');
 e(String(d.clienteSlug||d.cliente||'')===cliente&&(!d.cliente||d.cliente===cliente)&&String(d.demandaClienteId||'')===String(a.demandaClienteId||'')&&String(d.operationId||'')===String(a.operationId||'')&&String(d.competencia||'')===String(a.competencia||a.mes||a.mesRef||'')&&String(d.itemId||'')===String(a.itemId||'')&&a.demandaInternaId===demandaId&&a.lido===true,'legenda-identidade','O cliente, conteúdo ou recibo do pedido mudou.');
 e(!d.postagemId&&!d.agendamentoId&&!d.videoId&&!d.entregaDocumentoCp138&&!d.entradaPerfilCp150&&!d.providenciaGravacaoCp140,'legenda-especial','Esta tarefa tem um fluxo próprio. Abra a mesma entrega.');
 e(['cliente','clienteSlug'].every(k=>d[k]===undefined||d[k]===null||d[k]===''||typeof d[k]==='string'&&d[k]===cliente),'legenda-demanda-alias','A demanda contém identidades de cliente divergentes.');
 GetEmpresasOtavioI144.conferir(cliente,a,d);
 e(GetEmpresasOtavioI144.bruto(a)===GetEmpresasOtavioI144.bruto(d),'legenda-empresa','A empresa da demanda não confirma a origem.');
 return cliente;
}
function conferirParent(p,cliente,a){
 e(p&&!p.excluido&&!p.cancelado&&p.status!=='cancelada'&&p.origemRegistro!=='equipe'&&!p.acompanhamentoManualI93?.status,'legenda-acompanhamento','O acompanhamento está cancelado, excluído ou foi decidido manualmente. Nada foi refeito.');
 e(p.cliente===cliente&&typeof p.texto==='string'&&p.texto===String(a.descricao||''),'legenda-parent','O acompanhamento não confirma o mesmo cliente e texto.');
 GetEmpresasOtavioI144.conferir(cliente,a,p);
 e(GetEmpresasOtavioI144.bruto(a)===GetEmpresasOtavioI144.bruto(p),'legenda-parent-empresa','A empresa do acompanhamento não confirma a origem.');
}
function construirI54(a,caixa,sourceId,em,hoje){
 const cliente=conferirFonte(a,caixa,sourceId),nome=String(a.clienteNome||cliente||''),competencia=String(a.competencia||a.mes||a.mesRef||''),itemId=String(a.itemId||'');
 let descricao=String(a.descricao||'');
 if(GetEmpresasOtavioI144.ativo(cliente)&&GetEmpresasOtavioI144.bruto(a))descricao+='\nEmpresa: '+GetEmpresasOtavioI144.nome(a);
 if(/^20\d{2}-(0[1-9]|1[0-2])$/.test(competencia))descricao+='\n\nMês do pedido: '+competencia.split('-').reverse().join('/');
 if(a.itemNome)descricao+='\nConteúdo: '+String(a.itemNome);
 descricao+='\n\n— veio do '+(caixa==='pedidos_publicos'?'formulário de pedidos do site':'portal de '+(nome||'?'));
 // Company identities are retained; the caption service never chooses one.
 const empresa=GetEmpresasOtavioI144.campos(cliente,a);
 return {titulo:String(a.titulo||('Pedido de '+(nome||'cliente'))),descricao,destinatario:'Chris',origem:'cliente',clienteNome:nome,...empresa,...(cliente?{cliente,clienteSlug:cliente}:{}),ehAviso:true,demandaClienteId:String(a.demandaClienteId||''),prazoData:a.prazoData||hoje,prazoHora:a.prazoHora||'19:00',status:'pendente',criadoEm:em,origemAvisoColecao:caixa,origemAvisoId:sourceId,operationId:String(a.operationId||''),competencia,itemId,itemNome:String(a.itemNome||''),tipoPedidoCliente:String(a.tipo||''),conversaoVersao:'i54',roteamentoPedidosCp151:{schema:1,destino:'Chris',classe:'legenda'}};
}
async function converterTx(db,ator,caixa,sourceId,agora){
 return db.runTransaction(async tx=>{
  await cadastroTx(db,tx,ator);
  const origemRef=db.doc(caixa+'/'+sourceId),id=idI54(caixa,sourceId),demandaRef=db.doc('demandas/'+id),[s,d]=await Promise.all([tx.get(origemRef),tx.get(demandaRef)]);
  if(!s.exists)return 'ignorado';const a=s.data();if(a.viraDemanda===false||a.cancelado||a.excluido||a.arquivado)return 'ignorado';conferirFonte(a,caixa,sourceId);
  if(a.lido){if(d.exists)conferirDemanda(d.data(),a,caixa,sourceId,id);return 'jaRecebido';}
  e(!a.demandaInternaId||a.demandaInternaId===id,'legenda-recibo','O recibo aponta a outra demanda.');
  const parentId=String(a.demandaClienteId||'');if(parentId){e(idFisicoI165(parentId),'legenda-parent-id','O acompanhamento precisa ser conferido.');const parent=await tx.get(db.doc('demandas_cliente/'+parentId));conferirParent(parent.data(),clienteFonte(a),a);}
  if(d.exists){const semRecibo={...a,lido:true,demandaInternaId:id};conferirDemanda(d.data(),semRecibo,caixa,sourceId,id);}else tx.create(demandaRef,construirI54(a,caixa,sourceId,agora.toISOString(),new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(agora)));
  tx.update(origemRef,{lido:true,convertidoEm:agora.toISOString(),demandaInternaId:id,conversaoVersao:'i54'});return 'recebido';
 });
}
async function fontesTx(db,tx,ator,p){
 await cadastroTx(db,tx,ator);
 const dref=db.doc('demandas/'+p.demandaId),ds=await tx.get(dref);e(ds.exists,'legenda-demanda','A demanda não foi encontrada.');const d=ds.data();
 e(d.origemAvisoColecao===p.origemAvisoColecaoEsperada&&d.origemAvisoId===p.origemAvisoIdEsperado&&String(d.clienteSlug||d.cliente||'')===p.clienteEsperado,'legenda-expectativa','A fonte ou o cliente mudou desde a leitura.');
 const aref=db.doc(d.origemAvisoColecao+'/'+d.origemAvisoId),as=await tx.get(aref);e(as.exists,'legenda-origem-ausente','A origem não foi encontrada.');const a=as.data(),cliente=conferirDemanda(d,a,d.origemAvisoColecao,d.origemAvisoId,p.demandaId),parentId=String(d.demandaClienteId||'');let parent=null,pref=null,grupo=[];
 if(parentId){e(idFisicoI165(parentId),'legenda-parent-id','Confira o acompanhamento.');pref=db.doc('demandas_cliente/'+parentId);const [ps,gs]=await Promise.all([tx.get(pref),tx.get(db.collection('demandas').where('demandaClienteId','==',parentId).limit(151))]);parent=ps.data();conferirParent(parent,cliente,a);e(gs.size<=150,'legenda-limite-grupo','O grupo precisa de conferência pela gestão.');grupo=gs.docs.map(s=>({id:s.id,body:s.data()})).sort((x,y)=>x.id.localeCompare(y.id));e(grupo.some(r=>r.id===p.demandaId)&&grupo.every(r=>['cliente','clienteSlug'].every(k=>r.body[k]===undefined||r.body[k]===null||r.body[k]===''||typeof r.body[k]==='string'&&r.body[k]===cliente)),'legenda-grupo','O grupo não confirma o mesmo cliente.');}
 const assinatura=hashI165({demanda:d,origem:a,parent,grupo});return {dref,d,a,parent,pref,grupo,cliente,assinatura};
}
function dto(f,p){return {schema:1,demandaId:p.demandaId,cliente:f.cliente,origemAvisoColecao:f.d.origemAvisoColecao,origemAvisoId:f.d.origemAvisoId,destinatario:f.d.destinatario,tipoPedidoCliente:f.d.tipoPedidoCliente,status:f.d.status,assinatura:f.assinatura,provaTexto:String(f.d.provaTexto||''),provaImagemUrl:String(f.d.provaImagemUrl||''),podeEntregar:['pendente','em_andamento','andamento'].includes(f.d.status),podeRepararAcompanhamento:f.d.destinatario==='Chris'&&f.d.status==='aprovada'&&!!f.parent,acompanhamento:{necessario:!!f.parent,status:f.parent?.status||null},semAprovacaoEditorial:true};}
export async function operarPedidosLegendaCp152(db,auth,p,{agora=new Date()}={}){
 validar(p);const ator=atorEsperado(auth,p);
 // Active physical registration precedes every collection query, and is checked
 // again inside each transaction that reads or changes business state.
 await db.runTransaction(tx=>cadastroTx(db,tx,ator));
 if(p.acao==='pedidos_legenda_conferir_cp152'){
  if(p.demandaId)return envelopeCentralR80(await db.runTransaction(async tx=>dto(await fontesTx(db,tx,ator,p),p)));
  const cursores=p.cursores||Object.fromEntries(CAIXAS.map(c=>[c,'']));
  const conjuntos=await Promise.all(CAIXAS.map(async c=>{
   if(cursores[c]===null)return {docs:[],size:0,encerrada:true};
   let q=db.collection(c).where('tipo','in',TIPOS).where(c==='avisos_do_cliente'?'paraQuem':'destinatario','==','Chris').where('lido','==',false).where('viraDemanda','==',true).orderBy(FieldPath.documentId());
   if(cursores[c]){const ultimo=await db.doc(c+'/'+cursores[c]).get();e(ultimo.exists&&TIPOS.includes(ultimo.data().tipo)&&String(ultimo.data().paraQuem||ultimo.data().destinatario||'').trim()==='Chris','legenda-cursor','O ponto da conferência mudou. Recomece a conferência; nenhuma entrega foi descartada.');q=q.startAfter(ultimo);}
   return q.limit(151).get();
  }));
  const r={schema:1,recebidos:0,jaRecebidos:0,ignorados:0,falhas:0,maisPendentes:false,cursores:{}},observados=[],consumidos=Object.fromEntries(CAIXAS.map(c=>[c,0]));
  for(let i=0;i<Math.max(...conjuntos.map(s=>s.docs.length));i++)for(let c=0;c<CAIXAS.length;c++)if(conjuntos[c].docs[i])observados.push({caixa:CAIXAS[c],snap:conjuntos[c].docs[i]});
  for(const fonte of observados.slice(0,150)){
   consumidos[fonte.caixa]++;r.cursores[fonte.caixa]=fonte.snap.id;
   const a=fonte.snap.data();if(a.viraDemanda===false||a.cancelado||a.excluido||a.arquivado){r.ignorados++;continue;}
   try{const estado=await converterTx(db,ator,fonte.caixa,fonte.snap.id,agora);if(estado==='recebido')r.recebidos++;else if(estado==='jaRecebido')r.jaRecebidos++;else r.ignorados++;}catch(error){r.falhas++;}
  }
  for(let i=0;i<CAIXAS.length;i++){const c=CAIXAS[i],s=conjuntos[i];if(s.encerrada||consumidos[c]===s.docs.length&&s.size<151)r.cursores[c]=null;else if(r.cursores[c]===undefined)r.cursores[c]=cursores[c];}
  r.maisPendentes=CAIXAS.some(c=>r.cursores[c]!==null);
  return envelopeCentralR80(r);
 }
 const cancelarTentativa=p.acao==='pedido_legenda_cancelar_tentativa_cp152';
 const {sessao:geracaoDeTela,...pedidoDaTela}=p;
 const pedidoEstavel={...pedidoDaTela,acao:'pedido_legenda_entregar_cp152'};
 const hashPedido=hashI165({ator:{uid:ator.uid,papel:ator.papel,real:ator.real},pedido:pedidoEstavel}),opref=db.doc('pedidos_legenda_cp152/'+p.demandaId+'/operacoes/'+p.operacao);
 const resultado=await db.runTransaction(async tx=>{
  await cadastroTx(db,tx,ator);const op=await tx.get(opref);
  if(op.exists){const r=op.data();e(r.hashPedido===hashPedido&&r.uid===ator.uid&&r.atorReal===ator.real&&r.papel===ator.papel,'legenda-replay','Esta tentativa pertence a outra prova ou acesso.');if(r.estado==='cancelada_por_versao'){e(cancelarTentativa,'legenda-tentativa-cancelada','Esta tentativa foi encerrada após um conflito confirmado. Confira a nova versão antes de criar outra tentativa.');return r.resultado;}return {...r.resultado,operacao:{id:p.operacao,estado:'recuperado',confirmada:true}};}
  const f=await fontesTx(db,tx,ator,p);
  if(cancelarTentativa){
   e(f.assinatura!==p.assinaturaEsperada,'legenda-sem-conflito','A versão continua igual. A tentativa ainda pode estar em curso; nada foi descartado.');
   const r={schema:1,demandaId:p.demandaId,operacao:{id:p.operacao,estado:'cancelada_por_versao',confirmada:true},tentativaCancelada:true,semAlterarNegocio:true,exigeNovaRevisao:true,conferenciaAtual:dto(f,p)};
   tx.create(opref,{schema:1,estado:'cancelada_por_versao',hashPedido,uid:ator.uid,atorReal:ator.real,papel:ator.papel,em:agora.toISOString(),motivo:'conflito_de_versao_confirmado',assinaturaOriginal:p.assinaturaEsperada,assinaturaConferida:f.assinatura,resultado:r});return r;
  }
  e(f.assinatura===p.assinaturaEsperada,'legenda-versao','A legenda ou o acompanhamento mudou. Preserve a prova e confira a versão atual.');
  const aprovada=f.d.status==='aprovada',textoProva=aprovada?p.provaTexto:p.provaTexto.trim(),imagem=aprovada?p.provaImagemUrl:p.provaImagemUrl.trim();
  e(['pendente','em_andamento','andamento','aprovada'].includes(f.d.status),'legenda-estado','Esta entrega pertence a outra revisão.');
  if(aprovada)e(String(f.d.provaTexto||'')===textoProva&&String(f.d.provaImagemUrl||'')===imagem,'legenda-prova-anterior','A prova concluída não corresponde a esta tentativa. Nada foi refeito.');
  e(!p.repararAcompanhamento||aprovada&&f.d.destinatario==='Chris','legenda-reparo','O reparo apenas acompanha uma legenda já concluída.');
  const atualizarParent=!!f.parent&&(!aprovada||p.repararAcompanhamento),finalizada={...f.d,status:'aprovada'},calculado=atualizarParent?calcularStatusPortalPorDemandasCp152(f.grupo.map(r=>r.id===p.demandaId?finalizada:r.body),'concluida'):null;
  const r={schema:1,demandaId:p.demandaId,operacao:{id:p.operacao,estado:aprovada&&!p.repararAcompanhamento?'ja_concluida':'novo',confirmada:true},statusDemanda:'aprovada',statusPortal:calculado?.status||f.parent?.status||null,reparoApenas:aprovada&&p.repararAcompanhamento,semAprovacaoEditorial:true};
  if(!aprovada){e(Array.isArray(f.d.historico||[])&&(f.d.historico||[]).length<1000,'legenda-historico','Preserve o histórico antes de continuar.');tx.update(f.dref,{status:'aprovada',provaTexto:textoProva,provaImagemUrl:imagem,concluidaEm:FieldValue.serverTimestamp(),concluidoPor:ator.real,notaConclusao:'Aviso — não precisa de aprovação.',entregaLegendaCp152:{schema:1,operacao:p.operacao,autorUid:ator.uid,atorReal:ator.real,papelOperado:ator.papel,em:agora.toISOString()},historico:[...(f.d.historico||[]),{acao:'Concluiu o pedido de legenda do cliente',por:ator.real,papelOperado:ator.papel,autorUid:ator.uid,em:agora.toISOString(),operacao:p.operacao}]});}
  if(atualizarParent){const patch={status:calculado.status,responsaveisStatus:calculado.responsaveisStatus,atualizadoEm:FieldValue.serverTimestamp()};if(calculado.status==='concluida'&&f.parent.status!=='concluida')patch.concluidaEmI93=FieldValue.serverTimestamp();if(calculado.status!=='concluida'&&f.parent.status==='concluida')patch.concluidaEmI93=null;tx.update(f.pref,patch);}
  tx.create(opref,{schema:1,hashPedido,uid:ator.uid,atorReal:ator.real,papel:ator.papel,em:agora.toISOString(),resultado:r});return r;
 });
 return envelopeCentralR80(resultado);
}

export {conferirFonte as conferirFonteLegendaCp152,conferirParent as conferirAcompanhamentoLegendaCp152,construirI54 as construirDemandaLegendaCp152,conferirDemanda as conferirDemandaLegendaCp152};
