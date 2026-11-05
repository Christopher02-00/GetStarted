import {retornoDocumentoUnicoCp183} from './central/lib/gs-planejamento-social-i155.mjs';
import {retratoInfoClienteI164,mesmaInfoClienteI164} from './central/lib/gs-contexto-cliente-i164.mjs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {exigirI165} from './lib/gs-contexto-operacional-i165.mjs';
import {fonteDocumentoUnicoCp183,documentoCorrespondeFonteUnicaCp183,retratoBaseUnicaCp183} from './central/lib/gs-documento-unico-cp183.mjs';
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const emExecucao=d=>['pendente','em_andamento','refazer'].includes(d?.status);
const terminal=d=>d?.excluido===true||d?.arquivado===true||['aprovada','cancelada','cancelado'].includes(d?.status);
const ex=(v,m)=>exigirI165(v,'cp183-fonte',m);
export async function conferirAutoridadeUnicaTxCp183(db,tx,c,{eventoPendente=null,permitirInfoPosterior=false}={}){
 const m=fonteDocumentoUnicoCp183(c);ex(m&&m.assinaturaBase===sha(retratoBaseUnicaCp183(m)),'A autoridade do documento único mudou; o histórico foi preservado.');
 const [ds,ar,ev]=await Promise.all([tx.get(db.doc('planejamento_social_i155/'+m.ciclo+'/registros/'+m.documentoId)),tx.get(db.doc('planejamento_social_i155/'+m.ciclo+'/arquivos/'+m.arquivoId)),eventoPendente?Promise.resolve(null):tx.get(db.doc('planejamento_social_i155/'+m.ciclo+'/eventos/'+m.operacaoConfirmacao))]);
 const d=ds.data(),arquivo=ar.data(),evento=eventoPendente||ev?.data(),k='campanha__'+(m.empresaOtavio||'geral');
 ex(ds.exists&&documentoCorrespondeFonteUnicaCp183(c,{...d,id:ds.id},{hashTexto:sha(d.texto)}),'O documento integral não corresponde à base única.');
 ex(ar.exists&&arquivo.estado==='completo'&&arquivo.ciclo===m.ciclo&&arquivo.sha256===m.hashArquivo&&arquivo.bytes===m.bytes&&arquivo.tipo===m.mime,'O original não corresponde à base única.');
 ex(evento?.acao==='confirmar_documento'&&evento.operacao===m.operacaoConfirmacao&&evento.autorUid===m.confirmadoUid&&evento.autorNome===m.confirmadoPor&&evento.perfil===m.perfilConfirmacao&&evento.resultado?.confirmado===true&&evento.resultado.id===m.documentoId&&isDeepStrictEqual(evento.depois?.documentos?.confirmacoes?.[k],c.documentos.confirmacoes[k]),'A confirmação original precisa de conferência. Nenhuma autoria será inventada.');
 const info=await tx.get(db.doc('info_extras_cliente/'+c.cliente)),contextoAlterado=!mesmaInfoClienteI164(m.infoCliente,retratoInfoClienteI164(info.exists,info.data()));ex(permitirInfoPosterior||!contextoAlterado,'A ficha do cliente mudou. Chris deve conferir e adotar a fonte atual; o documento e o histórico continuam preservados.');return {fonte:m,documento:d,contextoAlterado};
}
/* Called after factory planning, before any write in the SAME transaction as I155 + CP179. */
export async function prepararDocumentoUnicoNaTxCp183(db,tx,ator,{pedido,writes,stamp,agora=new Date()}={}){
 const cw=writes.find(w=>w.r.path==='planejamento_social_i155/'+pedido.ciclo),ew=writes.find(w=>w.r.path==='planejamento_social_i155/'+pedido.ciclo+'/eventos/'+pedido.operacao),c=cw?.d;
 if(!c?.documentos?.baseDocumentoUnicoCp183||!ew)return null;
 ex(c.incluido===true,'Reinclua explicitamente esta competência antes de receber nova obrigação.');
 const m=fonteDocumentoUnicoCp183(c),acao=pedido.acaoPreparacao,entrega=['confirmar_documento','adotar_documento_unico_cp183'].includes(acao);
 if(!entrega&&acao!=='enviado_revisao')return null;
 const pendente=m?.operacaoConfirmacao===pedido.operacao?ew.d:null;await conferirAutoridadeUnicaTxCp183(db,tx,c,{eventoPendente:pendente});
 const referencia=db.doc('documentos_unicos_cp183/'+sha([pedido.ciclo,m.documentoId,m.versao,m.hashTexto,m.assinaturaBase])),anterior=c.documentos.obrigacaoChrisCp183;
 if(!entrega){
  if(!anterior?.id)return null;const s=await tx.get(db.doc('demandas/'+anterior.id)),d=s.data();ex(s.exists&&d.destinatario==='Chris'&&d.documentoUnicoCp183?.ciclo===pedido.ciclo,'A obrigação de criação precisa de conferência.');if(terminal(d))return null;
  ex(c.criacao?.enviadoRevisao===true&&c.criacao.base===m.documentoId,'A criação ainda não chegou à revisão da Amanda.');
  const status=d.tipoEspecial==='planejamento_social_i155'?'aprovada':'concluida_aguardando_aprovacao',patch={status,historico:[...(d.historico||[]),{acao:'Criação enviada pelo editor oficial para a revisão da Amanda',por:ator.real,perfil:ator.papel,em:agora.toISOString(),operacao:pedido.operacao,base:m.documentoId}],...(status==='concluida_aguardando_aprovacao'?{provaTexto:'Calendário de '+c.clienteNome+' · '+c.competencia+' enviado à revisão da Amanda pelo editor oficial.',concluidaEm:stamp}:{} )};
  return {writes:[{ref:s.ref,patch}],recibo:null};
 }
 ex(ator.papel==='Amanda'&&acao==='confirmar_documento'||ator.papel==='Chris'&&acao==='adotar_documento_unico_cp183','A entrega única pertence à Amanda; a adoção de material já recebido pertence ao Chris.');
 const consulta=await tx.get(db.collection('demandas').where('planejamentoI155.ciclo','==',pedido.ciclo).limit(101));ex(consulta.size<=100,'Há muitas obrigações nesta competência. Nenhuma nova demanda foi criada.');
 const candidatas=new Map(consulta.docs.filter(s=>s.data().destinatario==='Chris'&&s.data().planejamentoI155?.etapa==='criacao'&&!terminal(s.data())&&emExecucao(s.data())).map(s=>[s.id,s]));
 const origem=c.agenda?.criacao?.origemI167;
 if(origem){const s=await tx.get(db.doc('demandas/'+origem.demandaId)),d=s.data();ex(s.exists&&origem.cliente===c.cliente&&origem.competencia===c.competencia&&origem.etapa==='criacao'&&d.tipoEspecial==='organizacao_social_i167'&&d.cliente===c.cliente&&d.agendaOrganizacaoI167?.mes===c.competencia&&d.destinatario==='Chris','A origem da criação não corresponde à obrigação do Chris. Não será transferida por inferência.');if(!terminal(d)&&emExecucao(d))candidatas.set(s.id,s);}
 if(anterior?.id){const s=await tx.get(db.doc('demandas/'+anterior.id)),d=s.data();ex(s.exists&&d.destinatario==='Chris'&&d.documentoUnicoCp183?.ciclo===pedido.ciclo,'A obrigação anterior não foi localizada. Ela não será recriada com outro ID.');if(!terminal(d)&&emExecucao(d))candidatas.set(s.id,s);}
 ex(candidatas.size<=1,'Há mais de uma obrigação de criação aberta para este cliente e mês. Elas foram preservadas; escolha a origem correta antes de confirmar.');
 let ds=[...candidatas.values()][0],rodada=anterior?.rodada||1,dr,d;
 if(ds){dr=ds.ref;d=ds.data();}
 else{ex(!anterior||Number.isSafeInteger(anterior.rodada)&&anterior.rodada>0&&anterior.rodada<100000,'A rodada anterior precisa de conferência.');rodada=anterior?anterior.rodada+1:1;const bruto='sm155_'+pedido.ciclo+'__criacao__Chris__documento_unico_cp183_r'+rodada,id=bruto.length<=180?bruto:'sm155_doc183_'+sha([pedido.ciclo,rodada]);dr=db.doc('demandas/'+id);const s=await tx.get(dr);ex(!s.exists,'Já há uma obrigação com esta identidade. Confira o estado atual antes de outra rodada.');d=null;}
 const reciboAntes=await tx.get(referencia);ex(!reciboAntes.exists,'Esta versão já possui recibo de recebimento. Retome a operação original, sem criar outra obrigação.');
 ex(!d||!Object.hasOwn(d,'historico')||Array.isArray(d.historico),'O histórico da obrigação precisa de conferência.');
 const marca={schema:1,ciclo:pedido.ciclo,cliente:c.cliente,competencia:c.competencia,documentoId:m.documentoId,versao:m.versao,hashTexto:m.hashTexto,empresaOtavio:m.empresaOtavio||'',rodada,reciboId:referencia.id,operacao:pedido.operacao};
 const evento={acao:d?'Novo documento completo recebido na mesma obrigação':'Documento completo recebido para a criação do calendário',por:ator.real,perfil:ator.papel,em:agora.toISOString(),operacao:pedido.operacao,documento:marca};
 const task=d?{...d,...(d.tipoEspecial==='planejamento_social_i155'?{planejamentoI155:{...d.planejamentoI155,base:m.documentoId,revisao:c.revisao}}:{}),documentoUnicoCp183:marca,historico:[...(d.historico||[]),evento]}:{titulo:'Preparar calendário — '+c.clienteNome+' · '+c.competencia,descricao:'A Amanda enviou o documento completo com referências e campanhas. Abra o material e o original, confira a base e inicie ou continue o calendário pelo editor oficial. Não precisa pedir um consolidado, prévia ou reunião extra. A revisão e a liberação do calendário continuam com a Amanda.',destinatario:'Chris',cliente:c.cliente,clienteNome:c.clienteNome,competencia:c.competencia,prazoData:c.agenda?.criacao?.prazo||'',prazoHora:c.agenda?.criacao?.prazoHora||'19:00',tipoEspecial:'planejamento_social_i155',planejamentoI155:{versao:1,ciclo:pedido.ciclo,etapa:'criacao',cliente:c.cliente,competencia:c.competencia,ativo:true,base:m.documentoId,revisao:c.revisao},status:'pendente',origem:'planejamento',criadoPor:ator.real,criadoEm:stamp,provaTexto:'',provaImagemUrl:'',documentoUnicoCp183:marca,historico:[evento]};
 c.documentos.obrigacaoChrisCp183={schema:1,id:dr.id,rodada,documentoId:m.documentoId,versao:m.versao,hashTexto:m.hashTexto,reciboId:referencia.id};
 const recibo={schema:1,tipo:'documento_unico_cp183',id:referencia.id,ciclo:pedido.ciclo,cliente:c.cliente,competencia:c.competencia,documentoId:m.documentoId,versao:m.versao,hashTexto:m.hashTexto,assinaturaBase:m.assinaturaBase,arquivoId:m.arquivoId,demandaChrisId:dr.id,rodada,operacao:pedido.operacao,autorUid:ator.uid,por:ator.real,perfil:ator.papel,em:agora.toISOString(),estado:'recebido'};
 ew.d.resultado.documentoUnicoCp183={reciboId:referencia.id,demandaChrisId:dr.id,ciclo:pedido.ciclo,documentoId:m.documentoId,versao:m.versao,hashTexto:m.hashTexto};
 return {writes:[{ref:dr,data:task}],recibo:{ref:referencia,data:recibo}};
}
export function aplicarDocumentoUnicoNaTxCp183(tx,p){if(!p)return;for(const w of p.writes)w.patch?tx.update(w.ref,w.patch):tx.set(w.ref,w.data);if(p.recibo)tx.create(p.recibo.ref,p.recibo.data);}
export async function lerRecebimentoDocumentoUnicoCp183(db,id,{tx=null}={}){
 ex(/^[a-f0-9]{64}$/.test(id||''),'Recebimento inválido.');const ler=async t=>{const r=await t.get(db.doc('documentos_unicos_cp183/'+id));if(!r.exists)return null;const rec=r.data();ex(rec.schema===1&&rec.id===id&&rec.tipo==='documento_unico_cp183','O recibo de documento precisa de conferência.');const [cs,ds]=await Promise.all([t.get(db.doc('planejamento_social_i155/'+rec.ciclo)),t.get(db.doc('demandas/'+rec.demandaChrisId))]);ex(cs.exists&&ds.exists,'A fonte da obrigação documental não foi localizada.');const c=cs.data(),d=ds.data();if(c.incluido===false||c.documentos?.obrigacaoChrisCp183?.reciboId!==id||terminal(d)||!emExecucao(d)||c.documentos?.desconsideracoesCp111?.[rec.documentoId])return null;ex(d.destinatario==='Chris'&&d.documentoUnicoCp183?.reciboId===id,'A obrigação não corresponde a este recebimento.');const a=await conferirAutoridadeUnicaTxCp183(db,t,c,{permitirInfoPosterior:true});ex(a.fonte.documentoId===rec.documentoId&&a.fonte.hashTexto===rec.hashTexto,'O documento atual mudou sem outra autoridade.');return {recibo:rec,ciclo:c,documento:a.documento,demanda:d,contextoAlterado:a.contextoAlterado};};return tx?ler(tx):db.runTransaction(ler);
}

export async function conferirRetornoDocumentoCp183(db,tx,d){
 const m=retornoDocumentoUnicoCp183(d);if(!m){ex(!d?.retornoDocumentoUnicoCp183,'A devolução documental exige a autoridade original.');return null;}
 const s=await tx.get(db.doc('planejamento_social_i155/'+m.ciclo+'/eventos/'+m.operacao)),v=s.data();
 ex(s.exists&&v.acao==='decidir_entrega_documento_cp154'&&v.operacao===m.operacao&&v.autorUid===m.autorUid&&v.autorNome===m.autorNome&&v.perfil===m.perfil&&v.resultado?.decisao==='devolver'&&v.resultado.id===m.demandaId&&isDeepStrictEqual(v.resultado.retornoDocumentoUnicoCp183,m),'A devolução documental não possui recibo oficial. Nenhuma entrega foi substituída.');return m;
}
