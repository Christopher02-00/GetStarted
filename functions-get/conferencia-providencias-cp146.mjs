/* Ciência é separada da entrega. Não escreve demanda, vínculo ou calendário. */
import {createHash} from 'node:crypto';
import {jsonI165} from './central/lib/gs-programacao-i165.mjs';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {gateProvidenciasCp140} from './providencias-gravacoes-cp140.mjs';
import {demandaNormalVinculavelCp142,validarRegistroVinculoCp142,podeLerVinculoCp142,finalizadaVinculoCp142} from './central/lib/gs-providencias-vinculos-cp142.mjs';
const hash=v=>createHash('sha256').update(jsonI165(v)).digest('hex');
const e=(ok,m)=>{if(!ok)throw Object.assign(Error(m),{code:'i165/conferencia-cp146'});};
export const ACOES_CIENCIA_CP146=Object.freeze(['providencias_vinculos_ciencia_cp146','providencias_vinculos_ciencia_ler_cp146']);
export const autoriaCienciaCp146=a=>({uid:a.uid,papel:a.papel,atorReal:a.real});
export const chaveCienciaCp146=(a,id)=>hash([a.uid,a.real,a.papel,id]);
export function versaoConferenciaCp146(v,d){
 validarRegistroVinculoCp142(v,v.demandaId);demandaNormalVinculavelCp142(d,v.demandaId);
 const campos=['titulo','descricao','destinatario','status','prazoData','prazoHora','excluido','arquivado','esperandoCliente','bloqueio','espera','esperaI161','aguardandoI161','refazerUltimoI161','redirecionadaEm'];
 return hash({schema:1,vinculo:{cliente:v.cliente,competencia:v.competencia,chaveRecurso:v.chaveRecurso,responsavelReal:v.responsavelReal,itens:v.itens},demanda:Object.fromEntries(campos.map(k=>[k,d[k]??null]))});
}
export async function estadoCienciaCp146(db,tx,a,v,d){
 const versao=versaoConferenciaCp146(v,d),s=await tx.get(db.doc('providencias_ciencias_cp146/'+chaveCienciaCp146(a,d.id))),c=s.exists?s.data():null;
 if(c)e(c.schema===1&&c.demandaId===d.id&&jsonI165(c.autoria)===jsonI165(autoriaCienciaCp146(a)),'O registro de ciência pertence a outra identidade.');
 return {schema:1,versao,confirmada:!!c&&c.versao===versao,obrigatoria:a.papel==='Cecília'&&d.destinatario==='Cecília'&&d.status==='pendente'&&!finalizadaVinculoCp142(d),delegada:a.real!==a.papel,autoria:autoriaCienciaCp146(a),em:c?.versao===versao?c.em:null,leituraNaoConclui:true};
}
export async function operarCienciaProvidenciasCp146(db,auth,p,{agora=new Date()}={}){
 e(ACOES_CIENCIA_CP146.includes(p?.acao),'Operação de ciência desconhecida.');const ler=p.acao.endsWith('_ler_cp146'),keys=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao','id','operacao',...(ler?[]:['versaoEsperada','confirmada'])];
 e(p&&Object.keys(p).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(p,k)),'Confira todos os campos da mesma conferência.');
 e(typeof p.id==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(p.id)&&!p.id.startsWith('prov140_')&&/^cien146_[a-f0-9]{32}$/.test(p.operacao||'')&&typeof p.sessao==='string'&&p.sessao.length>0&&p.sessao.length<=180,'Confira a mesma demanda, sessão e tentativa.');
 if(!ler)e(p.confirmada===true&&/^[a-f0-9]{64}$/.test(p.versaoEsperada||''),'Confirme explicitamente a orientação atual.');
 const a=validarContaEsperadaI165(auth,p);e(a.papel==='Cecília','Esta ciência pertence à Cecília, no seu próprio compromisso.');const autoria=autoriaCienciaCp146(a),ref=db.doc('providencias_ciencias_cp146/'+chaveCienciaCp146(a,p.id)),rr=ref.collection('operacoes').doc(p.operacao),pedidoHash=ler?null:hash({autoria,id:p.id,versaoEsperada:p.versaoEsperada,confirmada:true});
 return db.runTransaction(async tx=>{
  await gateProvidenciasCp140(db,tx,a);const [ds,vs,rs]=await Promise.all([tx.get(db.doc('demandas/'+p.id)),tx.get(db.doc('providencias_vinculos_cp142/'+p.id)),tx.get(rr)]);
  e(ds.exists&&vs.exists,'A demanda ou seu vínculo precisa ser conferido; nada foi concluído.');const d={...ds.data(),id:ds.id},v=vs.data();e(podeLerVinculoCp142(d,a)&&d.destinatario==='Cecília','Este compromisso pertence a outro destinatário.');const ciencia=await estadoCienciaCp146(db,tx,a,v,d),rec=rs.exists?rs.data():null;
  if(rec)e(rec.schema===1&&rec.operacao===p.operacao&&rec.demandaId===p.id&&jsonI165(rec.autoria)===jsonI165(autoria)&&(!pedidoHash||rec.pedidoHash===pedidoHash),'Esta tentativa pertence a outro conteúdo ou identidade.');
  if(ler||rec)return {schema:1,id:p.id,ciencia,operacao:{id:p.operacao,confirmada:!!rec,recibo:rec},demandaNaoAlterada:true};
  const aceita=ciencia.obrigatoria&&ciencia.versao===p.versaoEsperada,em=agora.toISOString(),recibo={schema:1,operacao:p.operacao,demandaId:p.id,autoria,pedidoHash,versao:p.versaoEsperada,em,estado:aceita?'confirmada':'recusada',motivo:aceita?'Ciência explícita; a demanda continua em seu fluxo.':'A orientação ou a situação mudou; confira a versão atual.',leituraNaoConclui:true};
  if(aceita){tx.set(ref,{schema:1,demandaId:p.id,autoria,versao:p.versaoEsperada,em,operacao:p.operacao});tx.set(ref.collection('versoes').doc(p.versaoEsperada),{schema:1,demandaId:p.id,autoria,versao:p.versaoEsperada,em,operacao:p.operacao});}
  tx.create(rr,recibo);return {schema:1,id:p.id,ciencia:{...ciencia,...(aceita?{confirmada:true,em}:{})},operacao:{id:p.operacao,confirmada:true,recibo},demandaNaoAlterada:true};
 });
}
