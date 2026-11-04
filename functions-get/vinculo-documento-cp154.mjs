import {conferirRetornoDocumentoCp183} from './documento-unico-cp183.mjs';
/* CP154: entregar a mesma demanda usando um documento já confirmado.
 * Não reconfirma o material, não avança o ciclo e não modifica a base editorial. */
import {createHash} from 'node:crypto';
import {prepararConclusoesDocumentaisNaTxCp179,aplicarConclusoesDocumentaisNaTxCp179} from './conclusao-documento-cp179.mjs';
import {isDeepStrictEqual} from 'node:util';
import {assinaturaOrigemDemandaCp138,hashPedidoDocumentoCp138,identidadeOrigemCompativelCp138,validarOrigemDemandaCp138,podeEntregarOrigemCp138,documentoReentregavelCp154,finalidadeOrigemDocumentalCp138} from './central/lib/gs-planejamento-social-i155.mjs';
import {exigirCentralR80 as e,cicloR80} from './central-preparacao-validacao-r80.mjs';

export const ACAO_VINCULO_DOCUMENTO_CP154='vincular_entrega_documento_cp154';
export function retratoDocumentoCp154(id,material,ciclo){
 const chave=material.chaveMaterial||material.finalidade+'__'+(material.empresaOtavio||'geral');
 return {documentoId:id,versao:material.versao,texto:material.texto,finalidade:material.finalidade,cliente:material.cliente,competencia:material.competencia,empresaOtavio:material.empresaOtavio||'',confirmacao:ciclo.documentos?.confirmacoes?.[chave]||null,rascunhoId:ciclo.documentos?.rascunhos?.[chave]||'',desconsideracao:ciclo.documentos?.desconsideracoesCp111?.[id]||null};
}
export async function vincularEntregaDocumentoCp154(db,ator,pedido,{conferirGate,stamp,agora=new Date()}={}){
 e(pedido.acao==='central_mutar'&&pedido.acaoPreparacao===ACAO_VINCULO_DOCUMENTO_CP154&&typeof conferirGate==='function','O vínculo pertence somente ao envio documental oficial.');
 const {cliente,competencia}=cicloR80(pedido.ciclo),dados=pedido.dados,o=dados.origemDemandaCp138;
 validarOrigemDemandaCp138(o,{cliente,competencia,finalidade:dados.finalidade,empresaOtavio:o.empresaOtavio});
 e(dados.finalidade==='campanha'?ator.papel==='Amanda':['Gabrielle','Chris'].includes(ator.papel),'Abra o perfil responsável por este material.');
 const hash=await hashPedidoDocumentoCp138({id:pedido.ciclo,acao:ACAO_VINCULO_DOCUMENTO_CP154,dados,esperada:pedido.esperadaRevisao,operacao:pedido.operacao});
 const cr=db.doc('planejamento_social_i155/'+pedido.ciclo),mr=cr.collection('registros').doc(dados.id),dr=db.doc('demandas/'+o.id),er=cr.collection('eventos').doc(pedido.operacao),em=agora.toISOString();
 return db.runTransaction(async tx=>{
  await conferirGate(tx);
  const [cs,ms,ds,es]=await Promise.all([tx.get(cr),tx.get(mr),tx.get(dr),tx.get(er)]);
  if(es.exists){const v=es.data();e(v.acao===ACAO_VINCULO_DOCUMENTO_CP154&&v.operacao===pedido.operacao&&v.autorUid===ator.uid&&v.autorNome===ator.real&&v.perfil===ator.papel&&v.resultado?.pedidoHashCp138===hash,'A mesma tentativa pertence a outro vínculo ou perfil.');return {...v.resultado,recuperadoCp154:true};}
  const c=cs.data(),material=ms.data(),origem=ds.data();
  e(cs.exists&&c?.schema===1&&c.cliente===cliente&&c.competencia===competencia&&Number.isInteger(c.revisao)&&c.revisao>=0,'A pasta deste cliente e mês precisa ser conferida.');
  e(ds.exists&&['Amanda','Gabrielle'].includes(origem.destinatario)&&(origem.destinatario===ator.papel||ator.papel==='Chris'&&ator.real==='Chris'),'Esta demanda não está disponível para este perfil.');
  const chave=dados.finalidade+'__'+(o.empresaOtavio||'geral'),cf=c.documentos?.confirmacoes?.[chave],rascunho=c.documentos?.rascunhos?.[chave]||'';
  let assinatura='';if(ms.exists)assinatura=await hashPedidoDocumentoCp138(retratoDocumentoCp154(dados.id,material,c));
  const valido=ms.exists&&material.tipo==='documento'&&material.finalidade===dados.finalidade&&material.cliente===cliente&&material.competencia===competencia&&(material.empresaOtavio||'')===o.empresaOtavio&&Number.isInteger(material.versao)&&material.versao>0&&typeof material.texto==='string'&&!!material.texto.trim()&&material.texto.length<=60000&&c.documentos?.materiais?.[chave]===dados.id&&cf?.id===dados.id&&typeof cf.em==='string'&&Number.isFinite(Date.parse(cf.em))&&typeof cf.por==='string'&&!!cf.por&&['Chris','Amanda','Gabrielle'].includes(cf.perfil)&&!c.documentos?.desconsideracoesCp111?.[dados.id]&&(!rascunho||rascunho===dados.id);
  const mudou=c.revisao!==pedido.esperadaRevisao||!podeEntregarOrigemCp138(origem,{nome:ator.papel,atorReal:ator.real})||await assinaturaOrigemDemandaCp138(origem)!==o.assinatura||!identidadeOrigemCompativelCp138(origem,o)||!valido||!documentoReentregavelCp154(origem,pedido.ciclo,dados.id,material,o.id)||assinatura!==dados.assinaturaDocumentoCp154;
  if(mudou){const resultado={recusadaCp138:true,pedidoHashCp138:hash,origemDemandaCp138:structuredClone(o),codigo:'CP154_VERSAO_MUDOU',motivo:'A demanda ou o documento confirmado mudou. Nada foi vinculado, reenviado ou concluído. Confira a mesma demanda e a versão vigente.'};tx.create(er,{terminalCp138:true,acao:ACAO_VINCULO_DOCUMENTO_CP154,operacao:pedido.operacao,revisao:c.revisao,autorUid:ator.uid,autorNome:ator.real,perfil:ator.papel,em:stamp,resultado});return resultado;}
  await conferirRetornoDocumentoCp183(db,tx,origem);
  if(origem.entregaDocumentoCp138){const anterior=origem.entregaDocumentoCp138,ps=await tx.get(cr.collection('eventos').doc(anterior.operacao)),pe=ps.data();e(ps.exists&&['confirmar_documento','vincular_entrega_documento_cp154'].includes(pe.acao)&&pe.operacao===anterior.operacao&&pe.autorUid===anterior.autorUid&&pe.autorNome===anterior.por&&pe.perfil===anterior.perfil&&isDeepStrictEqual(pe.resultado?.origemDemandaCp138,anterior),'A autoridade da entrega anterior precisa ser conferida antes da reentrega.');}
  // A confirmação precisa conservar sua autoridade anterior, não apenas um apontador.
  const eventos=await tx.get(cr.collection('eventos').where('resultado.id','==',dados.id).limit(101));
  e(eventos.size<=100,'Há mais de100eventos para este documento. Preserve as versões para conferência.');
  const autoridades=eventos.docs.filter(s=>{const v=s.data();return v.acao==='confirmar_documento'&&v.operacao===s.id&&v.resultado?.confirmado===true&&v.resultado.id===dados.id&&Number.isInteger(v.revisao)&&v.revisao<=c.revisao&&typeof v.autorUid==='string'&&!!v.autorUid&&v.autorNome===cf.por&&v.perfil===cf.perfil&&v.depois?.documentos?.materiais?.[chave]===dados.id&&isDeepStrictEqual(v.depois?.documentos?.confirmacoes?.[chave],cf);});
  e(autoridades.length===1,'A confirmação original deste documento precisa ser conferida. Nada foi reenviado ou entregue.');
  const autoridade=autoridades[0],anterior=autoridade.data();
  e(origem.historico===undefined||Array.isArray(origem.historico)&&origem.historico.length<1000,'Preserve o histórico desta demanda antes de continuar.');
  const vinculoConfirmadoCp154={schema:1,em,autorUid:ator.uid,por:ator.real,perfil:ator.papel,revisaoCiclo:c.revisao,assinaturaDocumento:dados.assinaturaDocumentoCp154,confirmacaoOperacao:autoridade.id,confirmacaoRevisao:anterior.revisao,confirmacaoOriginal:structuredClone(cf)};
  const rec={schema:1,demandaId:o.id,ciclo:pedido.ciclo,cliente,competencia,finalidade:dados.finalidade,empresaOtavio:o.empresaOtavio,documentoId:dados.id,versao:material.versao,hashTexto:createHash('sha256').update(material.texto,'utf8').digest('hex'),operacao:pedido.operacao,autorUid:ator.uid,por:ator.real,perfil:ator.papel,em:cf.em,vinculoConfirmadoCp154};
  const prova='Documento confirmado: '+c.clienteNome+' · '+competencia+' · '+({referencias:'Documento de referências',campanha:'Campanhas e datas importantes'}[rec.finalidade])+' · versão '+material.versao+' · '+dados.id;
  const resultado={id:dados.id,confirmado:true,vinculoConfirmadoCp154:true,pedidoHashCp138:hash,origemDemandaCp138:rec};
  const entregaPreparadaCp179={status:'concluida_aguardando_aprovacao',provaTexto:prova,concluidaEm:stamp,entregaDocumentoCp138:rec,historico:[...(origem.historico||[]),{acao:'Entrega vinculada ao documento já confirmado',por:ator.real,perfil:ator.papel,em,operacao:pedido.operacao,documento:rec,provaAnterior:{texto:origem.provaTexto||'',link:origem.provaImagemUrl||''}}]};
  const conclusoesCp179=await prepararConclusoesDocumentaisNaTxCp179(db,tx,ator,{ciclo:pedido.ciclo,documentoId:dados.id,cicloDepois:c,demandasDepois:new Map([[o.id,{...origem,...entregaPreparadaCp179}]]),pedidoOrigem:{origem:o,operacao:pedido.operacao}},{stamp,agora});resultado.conclusoesDocumentaisCp179=conclusoesCp179.resultado;
  tx.update(dr,entregaPreparadaCp179);
  tx.create(er,{acao:ACAO_VINCULO_DOCUMENTO_CP154,operacao:pedido.operacao,revisao:c.revisao,autorUid:ator.uid,autorNome:ator.real,perfil:ator.papel,em:stamp,resultado});
  aplicarConclusoesDocumentaisNaTxCp179(tx,conclusoesCp179,stamp);
  return resultado;
 });
}

/* CP154: revisão documental pelo mesmo serviço autorizado; o navegador não lê paths privados. */
export const ACAO_DECISAO_DOCUMENTO_CP154='decidir_entrega_documento_cp154';
export function revisorDocumentoCp154(id,d){
 const r=d?.entregaDocumentoCp138,canonica=finalidadeOrigemDocumentalCp138(d),tipo=canonica||r?.finalidade,origem=String(d?.origem||'').toLowerCase();
 if(d?.tipoEspecial!=='organizacao_social_i167'||d.excluido||d.arquivado||d.agendaOrganizacaoI167?.arquivada||!['organizacao','chris','amanda'].includes(origem)||!['referencias','campanha'].includes(tipo)||!r||r.schema!==1||r.demandaId!==id||r.finalidade!==tipo||r.perfil!==d.destinatario||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(r.competencia||'')||!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(r.cliente||'')||r.ciclo!==r.competencia+'__'+r.cliente||!/^[A-Za-z0-9_-]{1,180}$/.test(r.documentoId||'')||!Number.isInteger(r.versao)||r.versao<1||!/^[a-f0-9]{64}$/.test(r.hashTexto||'')||!/^[A-Za-z0-9_-]{8,100}$/.test(r.operacao||'')||typeof r.autorUid!=='string'||!r.autorUid||typeof r.por!=='string'||!r.por||typeof r.em!=='string'||!Number.isFinite(Date.parse(r.em))||typeof r.empresaOtavio!=='string')return null;
 if(![d.cliente,d.clienteSlug].some(v=>v===r.cliente)||!identidadeOrigemCompativelCp138(d,r))return null;
 const autor=origem==='chris'?'Chris':origem==='amanda'?'Amanda':['Chris','Amanda'].includes(d.criadoPor)?d.criadoPor:null;
 return autor?(autor===d.destinatario?(autor==='Amanda'?'Chris':'Amanda'):autor):null;
}
async function conferirAutoridadeEntregaCp154(tx,cr,c,d,id){
 const r=d.entregaDocumentoCp138,chave=r.finalidade+'__'+(r.empresaOtavio||'geral');
 const [ms,es]=await Promise.all([tx.get(cr.collection('registros').doc(r.documentoId)),tx.get(cr.collection('eventos').doc(r.operacao))]),m=ms.data(),ev=es.data(),cf=c.documentos?.confirmacoes?.[chave],v=r.vinculoConfirmadoCp154;
 const confirmado=ev?.acao==='confirmar_documento'&&!v||ev?.acao===ACAO_VINCULO_DOCUMENTO_CP154&&v?.schema===1&&ev.resultado?.vinculoConfirmadoCp154===true&&v.autorUid===r.autorUid&&v.por===r.por&&v.perfil===r.perfil&&typeof v.em==='string'&&Number.isFinite(Date.parse(v.em))&&Number.isInteger(v.revisaoCiclo)&&v.revisaoCiclo>=0&&/^[a-f0-9]{64}$/.test(v.assinaturaDocumento||'')&&/^[A-Za-z0-9_-]{8,100}$/.test(v.confirmacaoOperacao||'')&&Number.isInteger(v.confirmacaoRevisao)&&v.confirmacaoRevisao<=v.revisaoCiclo&&isDeepStrictEqual(v.confirmacaoOriginal,cf);
 e(ms.exists&&es.exists&&m.tipo==='documento'&&m.cliente===r.cliente&&m.competencia===r.competencia&&m.finalidade===r.finalidade&&(m.empresaOtavio||'')===r.empresaOtavio&&m.versao===r.versao&&typeof m.texto==='string'&&m.texto.trim()&&m.texto.length<=60000&&c.documentos?.materiais?.[chave]===r.documentoId&&cf?.id===r.documentoId&&cf.em===r.em&&!c.documentos?.desconsideracoesCp111?.[r.documentoId]&&(!c.documentos?.rascunhos?.[chave]||c.documentos.rascunhos[chave]===r.documentoId)&&confirmado&&ev.operacao===r.operacao&&ev.autorUid===r.autorUid&&ev.autorNome===r.por&&ev.perfil===r.perfil&&isDeepStrictEqual(ev.resultado?.origemDemandaCp138,r),'A confirmação documental mudou. Confira a versão atual antes de decidir esta entrega.');
 if(v){const os=await tx.get(cr.collection('eventos').doc(v.confirmacaoOperacao)),o=os.data();e(os.exists&&o.acao==='confirmar_documento'&&o.operacao===v.confirmacaoOperacao&&o.revisao===v.confirmacaoRevisao&&o.resultado?.confirmado===true&&o.resultado.id===r.documentoId&&typeof o.autorUid==='string'&&!!o.autorUid&&o.autorNome===cf.por&&o.perfil===cf.perfil&&o.depois?.documentos?.materiais?.[chave]===r.documentoId&&isDeepStrictEqual(o.depois?.documentos?.confirmacoes?.[chave],cf),'A confirmação original deste documento precisa ser conferida antes da decisão.');}
 e(createHash('sha256').update(m.texto,'utf8').digest('hex')===r.hashTexto,'O texto confirmado não corresponde ao recibo desta entrega.');
 return r;
}
export async function decidirEntregaDocumentoCp154(db,ator,pedido,{conferirGate,stamp,agora=new Date()}={}){
 e(pedido.acao==='central_mutar'&&pedido.acaoPreparacao===ACAO_DECISAO_DOCUMENTO_CP154&&typeof conferirGate==='function','A decisão pertence somente à revisão documental oficial.');
 e(['Chris','Amanda'].includes(ator.papel),'A revisão documental pertence ao responsável de gestão.');
 const {cliente,competencia}=cicloR80(pedido.ciclo),dados=pedido.dados,o=dados.origemDemandaCp138;
 validarOrigemDemandaCp138(o,{cliente,competencia,finalidade:o.finalidade,empresaOtavio:o.empresaOtavio});
 const hash=await hashPedidoDocumentoCp138({id:pedido.ciclo,acao:ACAO_DECISAO_DOCUMENTO_CP154,dados,esperada:pedido.esperadaRevisao,operacao:pedido.operacao}),cr=db.doc('planejamento_social_i155/'+pedido.ciclo),dr=db.doc('demandas/'+o.id),er=cr.collection('eventos').doc(pedido.operacao),em=agora.toISOString();
 return db.runTransaction(async tx=>{
  await conferirGate(tx);
  const [cs,ds,es]=await Promise.all([tx.get(cr),tx.get(dr),tx.get(er)]);
  if(es.exists){const v=es.data();e(v.acao===ACAO_DECISAO_DOCUMENTO_CP154&&v.operacao===pedido.operacao&&v.autorUid===ator.uid&&v.autorNome===ator.real&&v.perfil===ator.papel&&v.resultado?.pedidoHashCp138===hash,'A mesma tentativa pertence a outra decisão ou perfil.');return {...v.resultado,recuperadoCp154:true};}
  const c=cs.data(),d=ds.data();e(cs.exists&&c.schema===1&&c.cliente===cliente&&c.competencia===competencia&&Number.isInteger(c.revisao)&&ds.exists,'A entrega e a pasta deste cliente e mês precisam ser conferidas.');
  const revisor=revisorDocumentoCp154(o.id,d);e(revisor&&revisor===ator.papel,'Esta entrega documental aguarda o outro responsável pela revisão.');
  e(d.entregaDocumentoCp138.ciclo===pedido.ciclo&&d.entregaDocumentoCp138.cliente===cliente&&d.entregaDocumentoCp138.competencia===competencia&&d.entregaDocumentoCp138.finalidade===o.finalidade&&d.entregaDocumentoCp138.empresaOtavio===o.empresaOtavio,'O recibo pertence a outro cliente, mês, tipo de documento ou empresa.');
  const mudou=c.revisao!==pedido.esperadaRevisao||d.status!=='concluida_aguardando_aprovacao'||await assinaturaOrigemDemandaCp138(d)!==o.assinatura||await hashPedidoDocumentoCp138(d)!==dados.assinaturaEntregaCp154||!identidadeOrigemCompativelCp138(d,o);
  if(mudou){const resultado={recusadaCp138:true,pedidoHashCp138:hash,origemDemandaCp138:structuredClone(o),codigo:'CP154_DECISAO_VERSAO_MUDOU',motivo:'A entrega ou a pasta mudou depois da sua leitura. Nenhuma aprovação ou devolução foi aplicada. Confira a mesma demanda e a versão atual.'};tx.create(er,{terminalCp138:true,acao:ACAO_DECISAO_DOCUMENTO_CP154,operacao:pedido.operacao,revisao:c.revisao,autorUid:ator.uid,autorNome:ator.real,perfil:ator.papel,em:stamp,resultado});return resultado;}
  const recibo=await conferirAutoridadeEntregaCp154(tx,cr,c,d,o.id);
  e(d.historico===undefined||Array.isArray(d.historico)&&d.historico.length<1000,'Preserve o histórico desta demanda antes de continuar.');
  const historico=d.historico||[],devolver=dados.decisao==='devolver';let patch;
  if(devolver){const anterior={texto:d.provaTexto||'',link:d.provaImagemUrl||'',concluidaEm:d.concluidaEm||null},documentoAnteriorCp154=structuredClone(recibo),retorno={operacao:pedido.operacao,motivo:dados.motivo,por:ator.papel,atorReal:ator.real,em,entregaAnterior:anterior,documentoAnteriorCp154};patch={status:'pendente',provaTexto:'',provaImagemUrl:'',rejeitadoEm:em,refazerUltimoI161:retorno,historico:[...historico,{acao:'Devolvida para ajustar',por:ator.papel,atorReal:ator.real,perfil:ator.papel,em,detalhe:dados.motivo,operacao:pedido.operacao,provaAnterior:anterior,documentoAnteriorCp154}]};}
  else patch={status:'aprovada',aprovadoEm:em,aprovadoPor:ator.papel,historico:[...historico,{acao:'Entrega documental aprovada',por:ator.real,perfil:ator.papel,em,operacao:pedido.operacao,documento:structuredClone(recibo)}]};
  if(devolver&&d.destinatario==='Gabrielle'){
   const m={schema:1,origem:'retorno_documental_gabi_cp183',demandaId:o.id,ciclo:recibo.ciclo,cliente:recibo.cliente,competencia:recibo.competencia,empresaOtavio:recibo.empresaOtavio,finalidadeAnterior:recibo.finalidade,finalidade:'campanha',destino:'Amanda',operacao:pedido.operacao,autorUid:ator.uid,autorNome:ator.real,perfil:ator.papel,em};
   patch.destinatario='Amanda';patch.retornoDocumentoUnicoCp183=m;patch.refazerUltimoI161.retornoDocumentoUnicoCp183=m;patch.historico[patch.historico.length-1].retornoDocumentoUnicoCp183=m;
  }
  const resultado={decisaoDocumentoCp154:true,decisao:dados.decisao,id:o.id,estado:patch.status,operacao:pedido.operacao,pedidoHashCp138:hash,documentoId:recibo.documentoId,versao:recibo.versao,autorUid:ator.uid,por:ator.real,perfil:ator.papel,em,calendarioAlterado:false,materialReconfirmado:false,...(patch.retornoDocumentoUnicoCp183?{retornoDocumentoUnicoCp183:patch.retornoDocumentoUnicoCp183}:{} )};
  tx.update(dr,patch);tx.create(er,{acao:ACAO_DECISAO_DOCUMENTO_CP154,operacao:pedido.operacao,revisao:c.revisao,autorUid:ator.uid,autorNome:ator.real,perfil:ator.papel,em:stamp,resultado});return resultado;
 });
}
