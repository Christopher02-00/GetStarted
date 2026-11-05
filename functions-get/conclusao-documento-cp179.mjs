import {conferirRetornoDocumentoCp183} from './documento-unico-cp183.mjs';
/* CP179: conclusão de uma obrigação documental, nunca da criação do calendário. */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {retornoDocumentoUnicoCp183,assinaturaOrigemDemandaCp138,finalidadeOrigemDocumentalCp138,identidadeOrigemCompativelCp138,documentoReentregavelCp154,empresaMaterial} from './central/lib/gs-planejamento-social-i155.mjs';
import {cicloR80,exigirCentralR80 as e} from './central-preparacao-validacao-r80.mjs';

export const ACAO_RECONCILIAR_DOCUMENTOS_CP179='central_documentos_reconciliar_cp179';
export const ACAO_SOLICITACAO_DOCUMENTAL_CP179='central_documento_solicitacao_cp179';
export const COLECAO_RECIBOS_DOCUMENTO_CP179='recibos_documento_cp179';
export const COLECAO_SOLICITACOES_DOCUMENTO_CP179='solicitacoes_documento_cp179';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const textoHash=x=>createHash('sha256').update(x,'utf8').digest('hex');
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(x);
const finalidades=['campanha','referencias'];
const finais=['aprovada','cancelada','cancelado'];
const abertas=['pendente','em_andamento','refazer','concluida_aguardando_aprovacao'];
const clone=x=>JSON.parse(JSON.stringify(x));
const excluida=d=>!d||d.excluido||d.arquivado||d.agendaOrganizacaoI167?.arquivada;
const papelFinalidade=t=>t==='campanha'?'Amanda':'Gabrielle';
function conferirAtor(ator){e(ator?.uid&&['Amanda','Gabrielle','Chris'].includes(ator.papel)&&typeof ator.real==='string'&&ator.real,'O envio documental precisa do responsável autenticado.');}
function gestao(ator){return ['Amanda','Chris'].includes(ator.papel);}
function clienteDaDemanda(d){const values=[d.cliente,d.clienteSlug,d.planejamentoI155?.cliente].filter(Boolean);return values.length&&values.every(x=>x===values[0])?values[0]:'';}
function descritorBase(d,demandaId){
 if(!id(demandaId)||excluida(d)||!['Amanda','Gabrielle'].includes(d.destinatario))return null;
 const tipo=finalidadeOrigemDocumentalCp138(d),p=d.planejamentoI155;
 // A competência I155 é editorial. O mês operacional I167 e o prazo não a substituem.
 if(tipo&&d.tipoEspecial==='planejamento_social_i155'&&p?.versao===1&&p.ativo===true&&Number.isInteger(p.revisao)&&demandaId.startsWith('sm155_'+p.ciclo+'__'+p.etapa+'__'+d.destinatario+'__')&&p.competencia&&p.ciclo===p.competencia+'__'+p.cliente&&d.destinatario===papelFinalidade(tipo))return {schema:1,demandaId,cliente:p.cliente,competencia:p.competencia,finalidade:tipo,empresaOtavio:String(d.empresaOtavio||''),modo:'documento_completo',fonte:'planejamento_i155'};
 return null;
}
export function identidadeSolicitacaoDocumentoCp179(d,demandaId){
 if(!id(demandaId)||excluida(d))return null;
 const retorno=retornoDocumentoUnicoCp183(d);if(retorno&&retorno.demandaId===demandaId)return {schema:1,solicitacaoId:'cp179s_'+hash([demandaId,retorno.cliente,retorno.competencia,'campanha',retorno.empresaOtavio]),demandaId,cliente:retorno.cliente,competencia:retorno.competencia,finalidade:'campanha',empresaOtavio:retorno.empresaOtavio,modo:'documento_completo',fonte:'retorno_documental_cp183',retornoOperacao:retorno.operacao};
 const base=descritorBase(d,demandaId);if(base)return base;
 const s=d?.solicitacaoDocumentoCp179;
 if(!id(demandaId)||excluida(d)||!s||s.schema!==1||s.demandaId!==demandaId||s.modo!=='documento_completo'||!finalidades.includes(s.finalidade)||!/^cp179s_[a-f0-9]{64}$/.test(s.solicitacaoId||'')||d.destinatario!==papelFinalidade(s.finalidade)||clienteDaDemanda(d)!==s.cliente)return null;
 if(!identidadeOrigemCompativelCp138(d,s))return null;
 return s;
}
export async function registrarSolicitacaoDocumentoCp179(db,ator,pedido,{conferirGate,stamp,agora=new Date()}={}){
 conferirAtor(ator);e(gestao(ator)&&typeof conferirGate==='function','A gestão confirma a obrigação documental.');
 const {cliente,competencia}=cicloR80(pedido.ciclo),p=pedido.solicitacao;
 e(p?.puramenteDocumental===true&&id(p.demandaId)&&/^[a-f0-9]{64}$/.test(p.assinaturaDemanda||'')&&finalidades.includes(p.finalidade),'Confirme a mesma tarefa puramente documental.');empresaMaterial(cliente,p.empresaOtavio||'');
 const sid='cp179s_'+hash([p.demandaId,cliente,competencia,p.finalidade,p.empresaOtavio||'']);
 return db.runTransaction(async tx=>{
  await conferirGate(tx);const dr=db.doc('demandas/'+p.demandaId),sr=db.doc(COLECAO_SOLICITACOES_DOCUMENTO_CP179+'/'+sid),[ds,ss]=await Promise.all([tx.get(dr),tx.get(sr)]),d=ds.data();
  await conferirRetornoDocumentoCp183(db,tx,d);
  e(ds.exists&&!excluida(d)&&d.destinatario===papelFinalidade(p.finalidade)&&clienteDaDemanda(d)===cliente,'A tarefa não pertence ao responsável e ao cliente deste documento.');
  e(d.tipoEspecial==='organizacao_social_i167'||d.tipoEspecial==='planejamento_social_i155','Uma demanda genérica não é uma obrigação documental.');
  e(!['criacao','revisao','disponivel','liberacao'].includes(d.agendaOrganizacaoI167?.etapa||d.planejamentoI155?.etapa),'Criar, revisar ou liberar calendário não se conclui com um documento.');
  const identidade={cliente,competencia,finalidade:p.finalidade,empresaOtavio:p.empresaOtavio||''};e(identidadeOrigemCompativelCp138(d,identidade),'O pedido contém outra identidade editorial. O mês operacional não foi inferido.');
  const canonica=finalidadeOrigemDocumentalCp138(d);e(!canonica||canonica===p.finalidade,'O tipo documental da origem é diferente.');
  let documentoInicial=null;if(p.documentoId){const cr=db.doc('planejamento_social_i155/'+pedido.ciclo),cs=await tx.get(cr);e(cs.exists,'A pasta documental não foi encontrada.');const a=await autoridadeDocumento(tx,cr,cs.data(),p.documentoId);e(a.m.finalidade===p.finalidade&&(a.m.empresaOtavio||'')===(p.empresaOtavio||'')&&a.m.versao===p.versaoDocumento&&a.hashTexto===p.hashTextoDocumento,'A versão documental mudou antes da identificação. Nada foi associado.');documentoInicial={documentoId:p.documentoId,versao:p.versaoDocumento,hashTexto:p.hashTextoDocumento};}
  if(d.solicitacaoDocumentoCp179){e(ss.exists&&d.solicitacaoDocumentoCp179.solicitacaoId===sid&&isDeepStrictEqual(ss.data().solicitacao,d.solicitacaoDocumentoCp179),'A tarefa já possui outra solicitação documental; nada foi substituído.');return {solicitacao:d.solicitacaoDocumentoCp179,jaRegistrada:true};}
  e(!finais.includes(d.status)&&await assinaturaOrigemDemandaCp138(d)===p.assinaturaDemanda,'A demanda mudou ou já foi encerrada. Confira a origem atual.');
  e(!ss.exists,'Já existe um recibo sem o vínculo correspondente. Nada foi sobrescrito.');
  const solicitacao={schema:1,solicitacaoId:sid,demandaId:p.demandaId,...identidade,modo:'documento_completo',fonte:'classificacao_explicita_gestao',...(documentoInicial?{documentoInicial}:{}),registradoUid:ator.uid,registradoPor:ator.real,perfil:ator.papel,em:agora.toISOString()};
  e(d.historico===undefined||Array.isArray(d.historico)&&d.historico.length<1000,'O histórico desta demanda precisa ser preservado.');
  tx.create(sr,{schema:1,solicitacao,assinaturaOrigem:p.assinaturaDemanda,criadoEm:stamp});
  tx.update(dr,{solicitacaoDocumentoCp179:solicitacao,historico:[...(d.historico||[]),{acao:'Solicitação documental identificada explicitamente',por:ator.real,perfil:ator.papel,em:solicitacao.em,solicitacao,descricaoAnterior:d.descricao||''}]});
  return {solicitacao,jaRegistrada:false};
 });
}
async function autoridadeDocumento(tx,cr,c,documentoId,eventosDepois=[]){
 const ms=await tx.get(cr.collection('registros').doc(documentoId)),m=ms.data();
 e(ms.exists&&m.tipo==='documento'&&finalidades.includes(m.finalidade)&&m.cliente===c.cliente&&m.competencia===c.competencia&&Number.isInteger(m.versao)&&m.versao>0&&typeof m.texto==='string'&&m.texto.trim(),'O documento confirmado precisa ser conferido.');
 const k=m.finalidade+'__'+(m.empresaOtavio||'geral'),cf=c.documentos?.confirmacoes?.[k];
 e(c.documentos?.materiais?.[k]===documentoId&&cf?.id===documentoId&&typeof cf.em==='string'&&Number.isFinite(Date.parse(cf.em))&&!c.documentos?.desconsideracoesCp111?.[documentoId]&&(!c.documentos?.rascunhos?.[k]||c.documentos.rascunhos[k]===documentoId),'Há outra versão, rascunho ou desconsideração. Nenhuma tarefa foi concluída.');
 const eventos=await tx.get(cr.collection('eventos').where('resultado.id','==',documentoId).limit(101));e(eventos.size<=100,'A autoridade documental ultrapassou esta conferência.');
 const conjunto=[...eventos.docs,...eventosDepois.filter(x=>x.id&&x.data().resultado?.id===documentoId)];const autoridades=conjunto.filter(s=>{const v=s.data();return v.acao==='confirmar_documento'&&v.operacao===s.id&&v.resultado?.confirmado===true&&v.resultado.id===documentoId&&Number.isInteger(v.revisao)&&v.revisao<=c.revisao&&v.autorUid&&v.autorNome===cf.por&&v.perfil===cf.perfil&&v.depois?.documentos?.materiais?.[k]===documentoId&&isDeepStrictEqual(v.depois?.documentos?.confirmacoes?.[k],cf);});
 e(autoridades.length===1,'A confirmação original não é única ou não foi demonstrada.');
 const a=autoridades[0];return {m,cf,confirmacaoOperacao:a.id,autoridade:a.data(),hashTexto:textoHash(m.texto)};
}
export async function prepararConclusoesDocumentaisNaTxCp179(db,tx,ator,{ciclo,documentoId='',cicloDepois=null,eventosDepois=[],demandasDepois=new Map(),pedidoOrigem=null}={}, {stamp,agora=new Date()}={}){
 conferirAtor(ator);const identidade=cicloR80(ciclo);if(documentoId)e(id(documentoId),'Documento inválido.');
  const cr=db.doc('planejamento_social_i155/'+ciclo),cs=await tx.get(cr),c=cicloDepois||cs.data();
  e(cs.exists&&c.schema===1&&c.cliente===identidade.cliente&&c.competencia===identidade.competencia&&Number.isInteger(c.revisao),'A pasta do cliente e mês não foi confirmada.');
  const paginas=await Promise.all(['cliente','clienteSlug','planejamentoI155.cliente'].map(campo=>tx.get(db.collection('demandas').where(campo,'==',c.cliente).limit(1001))));e(paginas.every(p=>p.size<=1000),'Há mais de1000tarefas deste cliente; a conclusão não usou uma lista parcial.');
  const unicas=new Map(paginas.flatMap(p=>p.docs).map(d=>[d.id,d]));e(unicas.size<=1000,'Há mais de1000tarefas deste cliente; a conclusão não usou uma lista parcial.');const tasks={docs:[...unicas.values()]};
  const candidatas=[];for(const ds of tasks.docs){const original=ds.data(),d=demandasDepois.get(ds.id)||original;let s=identidadeSolicitacaoDocumentoCp179(d,ds.id);
   if(!s&&pedidoOrigem?.origem?.id===ds.id){const o=pedidoOrigem.origem,tipo=finalidadeOrigemDocumentalCp138(original),etapa=original.agendaOrganizacaoI167?.etapa||original.planejamentoI155?.etapa;const segura=o.classificacaoConfirmada===true&&o.cliente===c.cliente&&o.competencia===c.competencia&&finalidades.includes(o.finalidade)&&original.destinatario===papelFinalidade(o.finalidade)&&['Chris','Amanda'].includes(original.criadoPor)&&['organizacao_social_i167','planejamento_social_i155'].includes(original.tipoEspecial)&&!['criacao','revisao','disponivel','liberacao'].includes(etapa)&&(!tipo||tipo===o.finalidade)&&identidadeOrigemCompativelCp138(original,o)&&await assinaturaOrigemDemandaCp138(original)===o.assinatura;e(segura,'Esta origem não é uma obrigação puramente documental. A confirmação não foi gravada.');s={schema:1,solicitacaoId:'cp179s_'+hash([ds.id,c.cliente,c.competencia,o.finalidade,o.empresaOtavio]),demandaId:ds.id,cliente:c.cliente,competencia:c.competencia,finalidade:o.finalidade,empresaOtavio:o.empresaOtavio,modo:'documento_completo',fonte:'confirmacao_explicita_origem',confirmacaoOperacao:pedidoOrigem.operacao,registradoUid:ator.uid,registradoPor:ator.real,perfil:ator.papel,em:agora.toISOString()};}
   if(!s||s.cliente!==c.cliente||s.competencia!==c.competencia||!identidadeOrigemCompativelCp138(d,s)||!(d.destinatario===ator.papel||ator.papel==='Chris'&&ator.real==='Chris'))continue;
   if(s.fonte==='retorno_documental_cp183')await conferirRetornoDocumentoCp183(db,tx,original);
   if(s.fonte==='classificacao_explicita_gestao'){const r=await tx.get(db.doc(COLECAO_SOLICITACOES_DOCUMENTO_CP179+'/'+s.solicitacaoId));e(r.exists&&isDeepStrictEqual(r.data().solicitacao,s),'A solicitação documental não possui autoridade confirmada.');}
   if(s.fonte==='confirmacao_explicita_origem'&&s.confirmacaoOperacao!==pedidoOrigem?.operacao){const ev=await tx.get(cr.collection('eventos').doc(s.confirmacaoOperacao)),v=ev.data();e(ev.exists&&v.autorUid===s.registradoUid&&v.autorNome===s.registradoPor&&v.perfil===s.perfil&&v.resultado?.origemDemandaCp138?.demandaId===ds.id,'A confirmação explícita da solicitação precisa de autoridade.');}
   candidatas.push({ds,d,s});}
  e(candidatas.length<=40,'Há mais de40solicitações documentais nesta pasta. Nenhuma conclusão parcial foi feita.');
  const out={schema:1,ciclo,concluidas:[],jaConcluidas:[],operacoesDocumentoCp179:[],aguardandoDocumento:[],calendarioAlterado:false},cache=new Map(),writes=[];
  for(const {ds,d,s}of candidatas){
   const k=s.finalidade+'__'+(s.empresaOtavio||'geral'),rid=c.documentos?.materiais?.[k];if(!rid||documentoId&&documentoId!==rid){out.aguardandoDocumento.push(ds.id);continue;}
   if(!cache.has(rid))cache.set(rid,await autoridadeDocumento(tx,cr,c,rid,eventosDepois));const a=cache.get(rid);e(a.m.finalidade===s.finalidade&&(a.m.empresaOtavio||'')===s.empresaOtavio,'Documento e solicitação têm tipos ou empresas diferentes.');
   const operacao='cp179_'+hash([ds.id,ciclo,rid,a.m.versao,a.hashTexto]),rr=db.doc(COLECAO_RECIBOS_DOCUMENTO_CP179+'/'+operacao),rs=await tx.get(rr),anterior=d.conclusaoAutomaticaDocumentoCp179;
   if(rs.exists){e(isDeepStrictEqual(rs.data().conclusao,anterior)&&anterior?.demandaId===ds.id&&anterior.documentoId===rid&&anterior.hashTexto===a.hashTexto,'O recibo pertence a outra entrega. Nada foi repetido.');if(d.status==='aprovada'){out.jaConcluidas.push(ds.id);out.operacoesDocumentoCp179.push(operacao);}else{e(d.refazerUltimoI161&&abertas.includes(d.status),'A entrega antiga precisa de conferência.');out.aguardandoDocumento.push(ds.id);}continue;}
   if(finais.includes(d.status))continue;
   if(!anterior&&s.documentoInicial)e(s.documentoInicial.documentoId===rid&&s.documentoInicial.versao===a.m.versao&&s.documentoInicial.hashTexto===a.hashTexto,'O documento mudou depois da identificação autorizada. Nada foi concluído.');
   e(abertas.includes(d.status),'A situação da tarefa documental precisa ser conferida.');
   if(anterior){e(anterior.documentoId!==rid&&a.m.versao>anterior.versao&&d.refazerUltimoI161,'A tarefa devolvida precisa de uma nova versão documental.');}
   if(d.entregaDocumentoCp138)e(documentoReentregavelCp154(d,ciclo,rid,a.m,ds.id)||d.status==='concluida_aguardando_aprovacao'&&d.entregaDocumentoCp138.documentoId===rid,'A devolução documental ainda não possui versão nova.');
   e(d.historico===undefined||Array.isArray(d.historico)&&d.historico.length<1000,'O histórico desta demanda precisa ser preservado.');
   const conclusao={schema:1,estado:'concluida',demandaId:ds.id,ciclo,cliente:c.cliente,competencia:c.competencia,finalidade:s.finalidade,empresaOtavio:s.empresaOtavio,documentoId:rid,versao:a.m.versao,hashTexto:a.hashTexto,operacao,confirmacaoOperacao:a.confirmacaoOperacao,confirmacaoOriginal:clone(a.cf),autorConfirmacaoUid:a.autoridade.autorUid,autorConfirmacaoNome:a.autoridade.autorNome,perfilConfirmacao:a.autoridade.perfil,executadoUid:ator.uid,executadoPor:ator.real,perfilExecutado:ator.papel,em:agora.toISOString()};
   const prova='Documento completo confirmado: '+c.clienteNome+' · '+c.competencia+' · '+(s.finalidade==='campanha'?'Campanhas e orientações':'Referências')+' · versão '+a.m.versao+' · '+rid;
   writes.push({ref:ds.ref,rec:rr,conclusao,patch:{...((s.fonte==='confirmacao_explicita_origem'&&!d.solicitacaoDocumentoCp179)||s.fonte==='retorno_documental_cp183'?{solicitacaoDocumentoCp179:s}:{}),status:'aprovada',concluidoPor:'sistema (documento confirmado)',concluidoEm:stamp,provaTexto:prova,conclusaoAutomaticaDocumentoCp179:conclusao,historico:[...(d.historico||[]),{acao:'Demanda documental concluída automaticamente após confirmação',por:ator.real,perfil:ator.papel,em:conclusao.em,operacao,documento:conclusao,statusAnterior:d.status,...(s.fonte==='retorno_documental_cp183'?{solicitacaoAnterior:d.solicitacaoDocumentoCp179||null}:{}),provaAnterior:{texto:d.provaTexto||'',link:d.provaImagemUrl||''}}]},antes:{status:d.status,provaTexto:d.provaTexto||'',provaImagemUrl:d.provaImagemUrl||''}});out.concluidas.push(ds.id);out.operacoesDocumentoCp179.push(operacao);
  }
  return {resultado:out,escritas:writes};
}
export function aplicarConclusoesDocumentaisNaTxCp179(tx,pacote,stamp){for(const w of pacote.escritas){tx.update(w.ref,w.patch);tx.create(w.rec,{schema:1,demandaId:w.conclusao.demandaId,ciclo:w.conclusao.ciclo,conclusao:w.conclusao,antes:w.antes,criadoEm:stamp});}}
export async function concluirDocumentosConfirmadosCp179(db,ator,alvo, {conferirGate,stamp,agora=new Date()}={}){e(typeof conferirGate==='function','Use a preparação documental oficial.');return db.runTransaction(async tx=>{await conferirGate(tx);const p=await prepararConclusoesDocumentaisNaTxCp179(db,tx,ator,alvo,{stamp,agora});aplicarConclusoesDocumentaisNaTxCp179(tx,p,stamp);return p.resultado;});}
export async function lerRecebimentoDocumentoCp179(db,operacao,{tx=null}={}){
 e(/^cp179_[a-f0-9]{64}$/.test(operacao||''),'Recibo documental inválido.');
 const ler=async t=>{
  const rs=await t.get(db.doc(COLECAO_RECIBOS_DOCUMENTO_CP179+'/'+operacao));if(!rs.exists)return null;
  const r=rs.data().conclusao;e(r?.schema===1&&r.operacao===operacao&&r.estado==='concluida'&&id(r.demandaId),'O recibo documental não confirma a identidade.');
  const ci=cicloR80(r.ciclo);e(ci.cliente===r.cliente&&ci.competencia===r.competencia&&finalidades.includes(r.finalidade),'O recibo aponta outra pasta.');
  const cr=db.doc('planejamento_social_i155/'+r.ciclo),[ds,cs]=await Promise.all([t.get(db.doc('demandas/'+r.demandaId)),t.get(cr)]);
  if(!ds.exists||!cs.exists)return null;const d=ds.data(),c=cs.data();
  if(excluida(d)||d.status!=='aprovada'||!isDeepStrictEqual(d.conclusaoAutomaticaDocumentoCp179,r))return null;
  e(clienteDaDemanda(d)===r.cliente&&c.cliente===r.cliente&&c.competencia===r.competencia,'A identidade da recepção documental mudou.');
  const chave=r.finalidade+'__'+(r.empresaOtavio||'geral');
  if(c.documentos?.materiais?.[chave]!==r.documentoId||c.documentos?.confirmacoes?.[chave]?.id!==r.documentoId||c.documentos?.desconsideracoesCp111?.[r.documentoId]||c.documentos?.rascunhos?.[chave]&&c.documentos.rascunhos[chave]!==r.documentoId)return null;
  const a=await autoridadeDocumento(t,cr,c,r.documentoId);e(a.hashTexto===r.hashTexto&&a.m.versao===r.versao&&a.confirmacaoOperacao===r.confirmacaoOperacao&&isDeepStrictEqual(a.cf,r.confirmacaoOriginal),'A autoridade do documento recebido mudou.');
  return {conclusao:r,ciclo:c,documento:a.m};
 };
 if(tx)return ler(tx);if(typeof db.runTransaction==='function')return db.runTransaction(ler);
 return ler({get:ref=>ref.get()});
}
