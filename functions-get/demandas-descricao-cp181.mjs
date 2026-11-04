import crypto from 'node:crypto';
import {validarCadastroI165} from './contexto.mjs';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {exigirI165,idFisicoI165,instanteI165} from './lib/gs-contexto-operacional-i165.mjs';
export const ACOES_DESCRICAO_CP181=Object.freeze(['preparar_descricao_demanda_cp181','salvar_descricao_demanda_cp181','conferir_descricao_demanda_cp181']);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
// Preserve SDK types: a Timestamp is not equivalent to a plain map with the same numbers.
export function assinaturaCorpoDescricaoCp181(v,pilha=new Set()){
 if(v===null)return 'N';if(typeof v==='string')return 'S'+JSON.stringify(v);if(typeof v==='boolean')return v?'B1':'B0';if(typeof v==='number'&&Number.isFinite(v))return 'D'+(Object.is(v,-0)?'-0':String(v));
 exigirI165(v&&typeof v==='object'&&!pilha.has(v),'cp181-dados','Um campo da demanda não pôde ser comparado com segurança.');pilha.add(v);
 try{if(Array.isArray(v))return 'A['+v.map(x=>assinaturaCorpoDescricaoCp181(x,pilha)).join(',')+']';const p=Object.getPrototypeOf(v);if(![Object.prototype,null].includes(p)){if(p?.constructor?.name==='Timestamp'&&Number.isSafeInteger(v.seconds)&&Number.isSafeInteger(v.nanoseconds))return 'T"Timestamp":'+String(v.seconds)+':'+String(v.nanoseconds);exigirI165(typeof v.toJSON==='function','cp181-dados','Um campo da demanda não pôde ser comparado com segurança.');return 'T'+JSON.stringify(p?.constructor?.name||'SDK')+':'+assinaturaCorpoDescricaoCp181(v.toJSON(),pilha);}return 'M{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+assinaturaCorpoDescricaoCp181(v[k],pilha)).join(',')+'}';}finally{pilha.delete(v);}
}
export const hashCorpoDescricaoCp181=d=>sha(assinaturaCorpoDescricaoCp181(d));
export function demandaNormalDescricaoCp181(d,id){
 return !!d&&idFisicoI165(id)&&!id.startsWith('entrada_')&&!id.startsWith('prov140_')&&!d.tipoEspecial&&!d.tipoFuncaoFixa&&!d.tipoPedidoCliente&&!d.agendaOrganizacaoI167&&!d.ehDecisao&&!d.ehAviso&&!d.origemAvisoColecao&&!d.origemDemandaCliente&&!d.conclusaoAutomaticaDocumentoCp179&&!d.excluido&&!d.arquivado&&d.status==='pendente'&&typeof d.titulo==='string'&&typeof d.descricao==='string'&&typeof d.destinatario==='string'&&(!Object.hasOwn(d,'historico')||Array.isArray(d.historico));
}
function dto(id,d){return {schema:1,id,titulo:d.titulo,descricao:d.descricao,destinatario:d.destinatario,status:d.status,prazoData:d.prazoData||'',prazoHora:d.prazoHora||'',assinatura:hashCorpoDescricaoCp181(d),editavel:demandaNormalDescricaoCp181(d,id)};}
const baseKeys=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao','id'];
function validar(d,mutacao){exigirI165(d&&typeof d==='object'&&!Array.isArray(d)&&Object.keys(d).every(k=>[...baseKeys,...(mutacao?['operacaoId','assinaturaEsperada','descricao']:[])].includes(k)),'cp181-entrada','A edição contém campos não reconhecidos.');exigirI165(idFisicoI165(d.id)&&typeof d.sessao==='string'&&d.sessao.length>0&&d.sessao.length<=180,'cp181-identidade','Confira a mesma demanda e sessão.');if(mutacao){exigirI165(/^desc181_[a-f0-9]{32}$/.test(d.operacaoId||'')&&/^[a-f0-9]{64}$/.test(d.assinaturaEsperada||''),'cp181-tentativa','Confira a mesma tentativa de edição.');exigirI165(typeof d.descricao==='string'&&d.descricao.trim().length>0&&d.descricao.length<=30000,'cp181-texto','Escreva a orientação completa em até 30 mil caracteres.');}}
function hashPedido(a,d){return sha(JSON.stringify([1,a.uid,a.real,a.papel,d.id,d.operacaoId,d.assinaturaEsperada,d.descricao]));}
function refOp(db,a,op){return db.doc('demandas_descricoes_operacoes_cp181/'+sha(JSON.stringify([a.uid,a.real,a.papel,op])));}
export async function operarDescricaoDemandaCp181(db,auth,d,{agora=new Date()}={}){
 const a=validarContaEsperadaI165(auth,d),preparar=d.acao==='preparar_descricao_demanda_cp181',conferir=d.acao==='conferir_descricao_demanda_cp181';
 exigirI165(ACOES_DESCRICAO_CP181.includes(d.acao),'cp181-acao','Operação de descrição inválida.');validar(d,!preparar);
 exigirI165(['Chris','Amanda'].includes(a.real)&&['Chris','Amanda'].includes(a.papel),'cp181-papel','Chris e Amanda podem corrigir a descrição de uma demanda normal.');
 return db.runTransaction(async tx=>{
  const cadastro=await tx.get(db.doc('usuarios_equipe/'+a.email));validarCadastroI165(a,cadastro.data());
  const ref=db.doc('demandas/'+d.id),op=preparar?null:refOp(db,a,d.operacaoId);
  const [s,r]=await Promise.all([tx.get(ref),op?tx.get(op):Promise.resolve(null)]),atual=s.exists?s.data():null;
  if(r?.exists){const recibo=r.data();exigirI165(recibo.schema===1&&recibo.id===d.id&&recibo.pedidoHash===hashPedido(a,d)&&recibo.autoria.uid===a.uid&&recibo.autoria.atorReal===a.real&&recibo.autoria.papel===a.papel,'cp181-reuso','Esta tentativa pertence a outro texto, demanda ou acesso.');return {schema:1,estado:'confirmada',repetida:true,recibo,demanda:atual?dto(d.id,atual):null,fonteAvancou:!atual||hashCorpoDescricaoCp181(atual)!==recibo.assinaturaDepois,nenhumaNovaEscrita:true};}
  exigirI165(!!atual,'cp181-ausente','Essa demanda não existe mais. Nenhuma tarefa será recriada.');
  if(conferir)return {schema:1,estado:'ausente_no_instante',mesmaBase:hashCorpoDescricaoCp181(atual)===d.assinaturaEsperada,demanda:dto(d.id,atual),nenhumaEscrita:true,naoAutorizaRetryAutomatico:true};
  exigirI165(demandaNormalDescricaoCp181(atual,d.id),'cp181-tipo','Esta demanda mudou de situação ou possui fluxo próprio. Abra a orientação atual; nada será reaberto.');
  if(preparar)return {schema:1,estado:'preparada',demanda:dto(d.id,atual),nenhumaEscrita:true};
  exigirI165(hashCorpoDescricaoCp181(atual)===d.assinaturaEsperada,'cp181-conflito','A demanda mudou durante a edição. Seu texto foi preservado; confira a versão atual antes de salvar.');
  exigirI165(d.descricao!==atual.descricao,'cp181-sem-mudanca','A descrição já está igual. Nenhuma edição foi criada.');
  const em=instanteI165(agora),evento={acao:'Descrição atualizada por '+a.real,por:a.real,em,detalhe:'Orientação corrigida no mesmo registro; prazo, responsável, estado e vínculos preservados.',autorUid:a.uid,perfilOperado:a.papel,operacaoDescricaoCp181:d.operacaoId,descricaoAnterior:atual.descricao,descricaoNovaSha256:sha(d.descricao)};
  const patch={descricao:d.descricao,historico:[...(atual.historico||[]),evento]},depois={...atual,...patch};
  const recibo={schema:1,id:d.id,operacaoId:d.operacaoId,estado:'confirmada',pedidoHash:hashPedido(a,d),assinaturaAntes:d.assinaturaEsperada,assinaturaDepois:hashCorpoDescricaoCp181(depois),descricaoAntes:atual.descricao,descricaoDepois:d.descricao,em,autoria:{uid:a.uid,atorReal:a.real,papel:a.papel},somenteDescricaoEHistorico:true};
  tx.update(ref,patch);tx.create(op,recibo);
  return {schema:1,estado:'confirmada',repetida:false,recibo,demanda:dto(d.id,depois),fonteAvancou:false};
 });
}
