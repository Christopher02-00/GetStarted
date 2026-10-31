/* Vínculo de consulta com a demanda normal. Nunca altera sua autoria, entrega ou histórico. */
import {exigirProvidenciaCp140 as e,clienteProvidenciaCp140,competenciaProvidenciaCp140,hashProvidenciaCp140} from './gs-providencias-gravacao-cp140.mjs';
export const ACOES_VINCULOS_CP142=Object.freeze(['conferir','listar','vincular'].map(a=>'providencias_vinculos_'+a+'_cp142'));
export const idDemandaVinculoCp142=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(v)&&!v.startsWith('prov140_');
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const fields=(x,permitidos,obrigatorios=permitidos)=>e(obj(x)&&Object.keys(x).every(k=>permitidos.includes(k))&&obrigatorios.every(k=>Object.hasOwn(x,k)),'Confira os campos do vínculo.','vinculo');
const txt=(s,n)=>{e(typeof s==='string'&&s.trim()&&s.length<=n&&!/[\u0000-\u001f\u007f]/u.test(s),'Confira o recurso e quem realmente o organiza.','vinculo');return s.trim();};
const signature=(x,nulo=false)=>e(nulo&&x===null||typeof x==='string'&&/^[a-f0-9]{64}$/.test(x),'Reconfira a versão inteira antes de vincular.','versao');
export function demandaNormalVinculavelCp142(d,id){
 e(idDemandaVinculoCp142(id)&&d&&(!d.id||d.id===id)&&!d.tipoEspecial&&!d.tipoFuncaoFixa&&typeof d.destinatario==='string'&&d.destinatario&&typeof d.titulo==='string'&&typeof d.descricao==='string'&&typeof d.status==='string','Escolha uma demanda normal pelo seu identificador original.','demanda');
 return d;
}
export const podeLerVinculoCp142=(d,a)=>['Chris','Amanda'].includes(a.papel)||a.papel==='Cecília'&&d.destinatario==='Cecília';
export const finalizadaVinculoCp142=d=>d.excluido===true||d.arquivado===true||['aprovada','cancelada','concluida'].includes(d.status);
export function validarEntradaVinculoCp142(d){
 e(ACOES_VINCULOS_CP142.includes(d?.acao),'Operação de vínculo desconhecida.','vinculo');
 const acao=d.acao.slice('providencias_vinculos_'.length,-'_cp142'.length),comuns=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao'];
 const extras={conferir:['id','operacao'],listar:['cliente','competencia','incluirFinalizadas'],vincular:['operacao','assinaturaDemanda','assinaturaVinculo','assinaturaFonte','vinculo','conferencia']}[acao];
 fields(d,[...comuns,...extras],[...comuns,...extras.filter(k=>!(acao==='conferir'&&k==='operacao'||acao==='listar'))]);
 e(typeof d.sessao==='string'&&d.sessao.length>0&&d.sessao.length<=180,'Reabra o perfil autenticado.','vinculo');
 const r=structuredClone(d);
 if(acao==='listar'){r.cliente=d.cliente||'';r.competencia=d.competencia||'';r.incluirFinalizadas=d.incluirFinalizadas??false;if(r.cliente)clienteProvidenciaCp140(r.cliente);if(r.competencia)competenciaProvidenciaCp140(r.competencia);e(typeof r.incluirFinalizadas==='boolean'&&(!r.incluirFinalizadas||r.cliente&&r.competencia),'Para consultar encerradas, escolha cliente e mês.','filtro');}
 if(acao==='conferir')e(idDemandaVinculoCp142(d.id),'Escolha o identificador da demanda existente.','demanda');
 if(d.operacao!==undefined)e(typeof d.operacao==='string'&&/^vinc142_[a-f0-9]{32}$/.test(d.operacao),'Preserve o identificador da mesma tentativa.','operacao');
 if(acao==='vincular'){
  signature(d.assinaturaDemanda);signature(d.assinaturaVinculo,true);signature(d.assinaturaFonte);
  const v=d.vinculo;fields(v,['demandaId','cliente','competencia','chaveRecurso','responsavelReal','itemIds']);e(idDemandaVinculoCp142(v.demandaId),'Confira a demanda original.','demanda');clienteProvidenciaCp140(v.cliente);competenciaProvidenciaCp140(v.competencia);r.vinculo.chaveRecurso=txt(v.chaveRecurso,160);r.vinculo.responsavelReal=txt(v.responsavelReal,180);
  e(Array.isArray(v.itemIds)&&v.itemIds.length>0&&v.itemIds.length<=100&&new Set(v.itemIds).size===v.itemIds.length&&v.itemIds.every(id=>typeof id==='string'&&/^[A-Za-z0-9_.:-]{1,180}$/.test(id)&&!['.','..'].includes(id)),'Escolha os conteúdos reais, sem repetir identificadores.','vinculos');r.vinculo.itemIds.sort();
  fields(d.conferencia,['confirmada','destinatario','status','prazoData','prazoHora']);e(d.conferencia.confirmada===true&&['destinatario','status','prazoData','prazoHora'].every(k=>typeof d.conferencia[k]==='string'),'Confira a mesma demanda, destinatário, prazo e estado.','conferencia');
 }
 e(new TextEncoder().encode(JSON.stringify(r)).length<=200*1024,'O vínculo ultrapassa200KiB; nada foi cortado.','limite');return {acao,pedido:r};
}
export function validarRegistroVinculoCp142(v,id){
 e(v?.schema===1&&v.demandaId===id&&idDemandaVinculoCp142(id)&&Number.isSafeInteger(v.revisao)&&v.revisao>0&&Array.isArray(v.itens)&&v.itens.length>0,'O vínculo precisa de conferência.','vinculo');clienteProvidenciaCp140(v.cliente);competenciaProvidenciaCp140(v.competencia);txt(v.chaveRecurso,160);txt(v.responsavelReal,180);v.itens.forEach(i=>{e(typeof i.itemId==='string','Conteúdo sem identidade.','vinculos');signature(i.versao);});e(new Set(v.itens.map(i=>i.itemId)).size===v.itens.length,'Conteúdo repetido no vínculo.','vinculos');return v;
}
export function resumoVinculoCp142(v,d){
 validarRegistroVinculoCp142(v,v.demandaId);demandaNormalVinculavelCp142(d,v.demandaId);
 return {id:v.demandaId,vinculoCp142:true,cliente:v.cliente,clienteNome:v.clienteNome,competencia:v.competencia,chaveRecurso:v.chaveRecurso,responsavelReal:v.responsavelReal,titulo:d.titulo,descricao:d.descricao,destinatario:d.destinatario,status:d.status,finalizada:finalizadaVinculoCp142(d),prazoData:d.prazoData||'',prazoHora:d.prazoHora||'',estado:d.excluido?'Excluída na demanda original':d.arquivado?'Arquivada na demanda original':d.status==='aprovada'?'Entrega aprovada':d.status==='concluida_aguardando_aprovacao'?'Aguardando revisão da entrega':d.status==='cancelada'?'Cancelada':d.status==='concluida'?'Concluída':'Pendente na demanda original',itens:structuredClone(v.itens)};
}
export async function prepararVinculoCp142({antes,demanda,rawDemanda,id,pedido,ator,fonte,em}){
 demandaNormalVinculavelCp142(demanda,id);e(['Chris','Amanda'].includes(ator.papel),'Chris ou Amanda conferem os vínculos.','papel');e(!demanda.excluido&&!demanda.arquivado,'Não vincule uma demanda excluída ou arquivada.','estado');
 const p=pedido.vinculo;e(p.demandaId===id,'A mesma demanda precisa ser preservada.','demanda');
 e(await hashProvidenciaCp140(rawDemanda)===pedido.assinaturaDemanda,'A demanda mudou. Releia seu texto, prazo, destinatário e estado antes de vincular.','versao');e((antes?await hashProvidenciaCp140(antes):null)===pedido.assinaturaVinculo,'O vínculo mudou. Reconfira a versão atual.','versao');
 for(const k of ['destinatario','status','prazoData','prazoHora'])e((demanda[k]||'')===pedido.conferencia[k],'A conferência não corresponde à mesma demanda.','conferencia');
 e(!demanda.cliente||demanda.cliente===p.cliente,'O cliente informado na demanda é diferente.','cliente');e(!demanda.competencia||demanda.competencia===p.competencia,'O mês informado na demanda é diferente.','competencia');
 e(fonte?.clienteAtivo&&fonte.cliente===p.cliente&&fonte.competencia===p.competencia&&fonte.assinatura===pedido.assinaturaFonte,'A pauta mudou. Confira cliente, mês e conteúdos.','fonte');
 if(antes){validarRegistroVinculoCp142(antes,id);e(antes.cliente===p.cliente&&antes.competencia===p.competencia&&antes.chaveRecurso===p.chaveRecurso,'Não reetiquete o recurso existente.','vinculo');}
 const itens=p.itemIds.map(itemId=>{const rows=fonte.itens.filter(i=>i.itemId===itemId);e(rows.length===1,'O conteúdo não pertence à mesma pauta.','fonte');return structuredClone(rows[0]);});
 const autoria={uid:ator.uid,papel:ator.papel,atorReal:ator.real};const depois={schema:1,demandaId:id,cliente:p.cliente,clienteNome:fonte.clienteNome,competencia:p.competencia,chaveRecurso:p.chaveRecurso,responsavelReal:p.responsavelReal,itens,revisao:(antes?.revisao||0)+1,criadoEm:antes?.criadoEm||em,criadoPor:antes?.criadoPor||autoria,atualizadoEm:em,atualizadoPor:autoria,operacao:pedido.operacao,assinaturaDemandaConferida:pedido.assinaturaDemanda,assinaturaFonteConferida:pedido.assinaturaFonte};validarRegistroVinculoCp142(depois,id);return depois;
}
