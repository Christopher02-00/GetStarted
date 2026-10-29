/* Adoção explícita da preparação vazia: preserva integralmente I155 e calendário. */
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {validarCadastroI165,hashI165} from './contexto.mjs';
import {programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {processoAtivoI164} from './central/lib/gs-processo-calendarios-i164.mjs';
import {carteiraCanonicaI164} from './central/lib/gs-carteira-calendarios-i164.mjs';
import {assinaturaPostagemCompletaI165} from './central/lib/gs-programacao-i165.mjs';
import {fonteFisicaClienteR4,mesDoItemCalendario} from './lib/guardas-stokki-i165.mjs';
import {hashPreparacaoPreservadaI172,contextoLegadoEditorialI172} from './editorial-legado-i172.mjs';
import {chavesR80,textoR80,cicloR80} from './central-preparacao-validacao-r80.mjs';
import {hashEditorialI172} from './editorial-contrato-i172.mjs';
import {hashConteudoAjusteCp112} from './ajustes-calendarios-cp112.mjs';
import {editorialI148} from './central/lib/gs-aprovacoes-calendarios-i148.mjs';
import {isDeepStrictEqual} from 'node:util';

export const ACOES_ADOCAO_CP129=Object.freeze(['central_editor_adocao_ler_cp129','central_editor_adotar_preparacao_cp129']);
const exigir=(ok,msg)=>{if(!ok)throw Object.assign(new Error(msg),{code:'editorial/adocao-cp129'});};
const hashCompleto=v=>hashI165(assinaturaPostagemCompletaI165(v));
const comuns=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao','ciclo'];
const opValida=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(v);
export function validarEntradaAdocaoCp129(d){
 exigir(ACOES_ADOCAO_CP129.includes(d?.acao),'Ação de adoção desconhecida.');
 const ler=d.acao==='central_editor_adocao_ler_cp129';
 chavesR80(d,[...comuns,...(ler?['operacaoConsultar']:['operacao','assinaturaEsperada'])],[...comuns,...(ler?[]:['operacao','assinaturaEsperada'])]);
 textoR80(d.sessao,180,'a sessão',false);cicloR80(d.ciclo);
 exigir(Buffer.byteLength(JSON.stringify(d),'utf8')<=12000,'O pedido de adoção ultrapassa o limite.');
 if(ler&&d.operacaoConsultar!==undefined)exigir(opValida(d.operacaoConsultar),'Confira a operação consultada.');
 if(!ler)exigir(opValida(d.operacao)&&/^[a-f0-9]{64}$/.test(d.assinaturaEsperada||''),'Confira a operação e a versão da adoção.');return d;
}
function identidadeContinuidade(raw,id,processo){
 return raw?.schema===1&&raw.ativo===true&&raw.modo==='continuar_legado'&&raw.cliente===id.cliente&&raw.competencia===id.competencia&&raw.ativacaoId===processo.ativacaoId&&(typeof raw.revisao==='string'&&/^[a-f0-9]{64}$/.test(raw.revisao)||Number.isInteger(raw.revisao)&&raw.revisao>0);
}
function preparacaoVazia(c,id){
 return c?.schema===1&&c.incluido===true&&c.cliente===id.cliente&&c.competencia===id.competencia&&Number.isInteger(c.revisao)&&c.revisao>0&&typeof c.operacao==='string'&&c.operacao.length>0&&c.documentos&&typeof c.documentos==='object'&&!Array.isArray(c.documentos)&&Object.keys(c.documentos).length===0&&['lote','criacao','entrega','publicacaoAtual'].every(k=>c[k]===null||c[k]===undefined)&&c.contexto===''&&c.pendencias==='';
}
function pinPreparacao(id,c){return {schema:1,id:id.competencia+'__'+id.cliente,revisao:c.revisao,operacao:c.operacao,sha256:hashPreparacaoPreservadaI172(c)};}
function origemPublicacaoObservada(id,r,cal){
 const st=r?.editorialI172;
 if(st?.fase!=='publicada'||Object.hasOwn(st,'publicacaoAtual'))return null;
 exigir(st.schema===1&&st.revisao===1&&st.rodada===0&&!Object.hasOwn(st,'ultimaOperacao')&&(!Object.hasOwn(st,'historico')||Array.isArray(st.historico)&&st.historico.length===0)&&!Object.hasOwn(st,'correcaoIndividualCp115'),'A continuidade possui outra autoridade editorial; a publicação anterior não será adotada como se fosse nova.');
 const marca=cal?.aprovacaoMeses?.[id.competencia],retrato=marca?.retratoLiberadoV115;
 exigir(marca?.status==='liberado'&&retrato?.schemaVersion===1&&retrato.mes===id.competencia&&retrato.publicadoPor==='Amanda'&&marca.aprovadoPor==='Amanda'&&typeof retrato.publicadoEm==='string'&&Number.isFinite(Date.parse(retrato.publicadoEm))&&retrato.publicadoEm===marca.aprovadoEm&&Array.isArray(retrato.items),'A publicação anterior precisa confirmar o mesmo mês, retrato e data já registrados.');
 const raw=(cal.items||[]).filter(i=>i&&!i.excluido&&mesDoItemCalendario(cal,i)===id.competencia),pub=retrato.items.filter(i=>i&&!i.excluido),edicao=items=>items.map(i=>({itemId:i.itemId,hash:hashConteudoAjusteCp112(i,id.competencia)})).sort((a,b)=>a.itemId.localeCompare(b.itemId));
 exigir(raw.length>0&&raw.length<=300&&pub.length===raw.length&&raw.every(i=>typeof i.itemId==='string'&&i.itemId)&&new Set(raw.map(i=>i.itemId)).size===raw.length&&pub.every(i=>typeof i.itemId==='string'&&i.itemId)&&new Set(pub.map(i=>i.itemId)).size===pub.length&&editorialI148(raw)===editorialI148(pub)&&isDeepStrictEqual(edicao(raw),edicao(pub)),'Os conteúdos atuais não correspondem integralmente à publicação preservada. Nenhuma publicação foi fabricada.');
 return {retrato:structuredClone(retrato),retratoHash:hashEditorialI172(retrato),idsEdicao:edicao(raw),publicadoEm:retrato.publicadoEm};
}
async function gatePadrao(tx,db,ator){
 const [cfg,cad,p]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(db.doc('usuarios_equipe/'+ator.email)),tx.get(db.doc('processo_calendarios_i164/ativo'))]);
 validarCadastroI165(ator,cad.data());exigir(['Chris','Amanda'].includes(ator.papel),'A adoção pertence ao Chris e à Amanda.');
 exigir(programacaoAtivaI165(cfg.data())&&cfg.data().habilidades?.preparacaoCentral===true&&processoAtivoI164(p.data()),'O processo editorial precisa estar ativo.');return {cfg:cfg.data(),processo:p.data()};
}
async function fontes(tx,db,id,g,agora,ator){
 const ciclo=id.competencia+'__'+id.cliente,[prep,cont,cal,ex,co]=await Promise.all([tx.get(db.doc('planejamento_social_i155/'+ciclo)),tx.get(db.doc('continuidade_calendarios_i164/'+ciclo)),tx.get(db.doc('calendarios/'+id.cliente)),tx.get(db.collection('clientes_extras').limit(1001)),tx.get(db.collection('clientes_config').limit(1001))]);
 exigir(ex.size<=1000&&co.size<=1000,'A carteira excede o limite; nenhuma leitura parcial foi usada.');
 const rows=s=>s.docs.map(d=>({id:d.id,data:d.data()})),hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(agora),carteira=carteiraCanonicaI164({extras:rows(ex),configs:rows(co),hoje,competencia:id.competencia}).carteira;
 const p=prep.exists?prep.data():null,r=cont.exists?cont.data():null,c=cal.exists?cal.data():null,cliente=carteira.find(x=>x.slug===id.cliente),ativos=(Array.isArray(c?.items)?c.items:[]).filter(i=>i&&!i.excluido&&mesDoItemCalendario(c,i)===id.competencia),motivos=[];
 if(!cliente)motivos.push('O cliente não pertence à carteira desta competência.');
 if(!c||c.excluido||c.arquivado||c.archived||c.deletedAt||!Array.isArray(c.items)||!fonteFisicaClienteR4(id.cliente,c)||!ativos.length)motivos.push('O calendário físico deste mês precisa estar confirmado e ter conteúdos existentes.');
 if(!identidadeContinuidade(r,id,g.processo))motivos.push('A continuidade não confirma o mesmo cliente, mês e ativação.');
 if(p&&!preparacaoVazia(p,id))motivos.push('A preparação não está vazia ou já avançou. Preserve os materiais e reconcilie a origem.');
 if(c?.planejamentoBasesI155?.[id.competencia])motivos.push('O calendário já usa uma base do processo novo.');
 let adotadaAtual=false;if(r&&Object.hasOwn(r,'preparacaoPreservadaI155')){try{contextoLegadoEditorialI172(id,r,g.processo,c,p);adotadaAtual=!!p&&identidadeContinuidade(r,id,g.processo)&&motivos.length===0;}catch{}if(!adotadaAtual)motivos.push('A adoção anterior não corresponde à preparação atual; preserve as fontes antes de reconciliar.');}
 const necessaria=!adotadaAtual&&(!!p||!!r&&Object.hasOwn(r,'preparacaoPreservadaI155'));if(!p&&necessaria)motivos.push('A preparação adotada não foi encontrada.');
 if(p&&c&&identidadeContinuidade(r,id,g.processo)&&preparacaoVazia(p,id)&&!Object.hasOwn(r,'preparacaoPreservadaI155')){try{contextoLegadoEditorialI172(id,{...r,preparacaoPreservadaI155:pinPreparacao(id,p)},g.processo,c,p);}catch(error){if(error.code!=='central/preparacao')throw error;motivos.push(error.message);}}
 let publicacaoObservada=null;
 if(necessaria&&p&&c&&identidadeContinuidade(r,id,g.processo)&&preparacaoVazia(p,id)&&!Object.hasOwn(r,'preparacaoPreservadaI155')){try{exigir(!Object.hasOwn(r,'publicacaoPreservadaCp129'),'Uma observação anterior da publicação foi preservada e precisa de conferência.');publicacaoObservada=origemPublicacaoObservada(id,r,c);if(publicacaoObservada){exigir(ator.real==='Chris'&&ator.papel==='Chris','O Chris autenticado precisa conferir e registrar esta publicação preexistente.');exigir(Buffer.byteLength(JSON.stringify(publicacaoObservada),'utf8')<=840000,'O retrato observado ultrapassa o limite seguro; nada foi cortado ou adotado.');}}catch(error){if(error.code!=='editorial/adocao-cp129')throw error;motivos.push(error.message);}}
 const assinatura=hashCompleto({ciclo,config:g.cfg,processo:g.processo,carteira,preparacao:p,continuidade:r,calendario:c});
 return {ciclo,p,r,c,cliente,ativos,motivos,assinatura,necessaria,adotadaAtual,publicacaoObservada};
}
function dto(f,id,operacao=null){
 return {schema:1,ciclo:f.ciclo,cliente:id.cliente,competencia:id.competencia,somenteConsulta:true,necessaria:f.necessaria,elegivel:f.necessaria&&f.motivos.length===0,motivos:f.motivos,assinatura:f.assinatura,pin:preparacaoVazia(f.p,id)?pinPreparacao(id,f.p):null,quantidadeItens:f.ativos.length,registrarPublicacaoPreexistente:!!f.publicacaoObservada,...(operacao?{operacao}:{})};
}
function conferirRecibo(r,ator,id,operacao,pedidoHash=null){
 exigir(r?.schema===1&&r.ciclo===id.competencia+'__'+id.cliente&&r.operacao===operacao&&r.autorUid===ator.uid&&r.atorReal===ator.real&&r.papel===ator.papel&&(!pedidoHash||r.pedidoHash===pedidoHash),'Esta operação pertence a outra adoção ou perfil.');
 exigir(['adotada','recusada_por_versao'].includes(r.estado),'O recibo de adoção precisa de conferência.');return r;
}
function resultado(r,recuperada=false){return {schema:1,ciclo:r.ciclo,cliente:r.cliente,competencia:r.competencia,necessaria:r.estado!=='adotada',elegivel:false,motivos:r.motivo?[r.motivo]:[],assinatura:r.assinaturaAntes,pin:r.preparacaoPreservadaI155,quantidadeItens:r.quantidadeItens,requerLeituraAtual:true,operacao:{id:r.operacao,estado:r.estado==='adotada'?(recuperada?'recuperado':'novo'):r.estado,confirmada:true,recuperada,motivo:r.motivo||'',calendarioAlterado:false,preparacaoAlterada:false},adotada:r.estado==='adotada',recibo:r};}
export async function operarAdocaoPreparacaoCp129(db,auth,pedido,{gate:gateExterno,agora=new Date()}={}){
 validarEntradaAdocaoCp129(pedido);const ator=validarContaEsperadaI165(auth,pedido);exigir(['Chris','Amanda'].includes(ator.papel),'A adoção pertence ao Chris e à Amanda.');
 const id=cicloR80(pedido.ciclo),ler=pedido.acao==='central_editor_adocao_ler_cp129',operacao=ler?pedido.operacaoConsultar:pedido.operacao;
 const rr=operacao?db.doc('continuidade_calendarios_i164/'+pedido.ciclo+'/adocoes_preparacao_cp129/'+operacao):null;
 const {uidEsperado,atorRealEsperado,papelOperado,sessao,...negocio}=pedido,pedidoHash=ler?null:hashI165({pedido:negocio,autorUid:ator.uid,atorReal:ator.real,papel:ator.papel}),em=agora.toISOString();
 return db.runTransaction(async tx=>{
  const g=typeof gateExterno==='function'?{processo:await gateExterno(db,tx,ator),cfg:(await tx.get(db.doc('programacao_config_i165/ativo'))).data()}:await gatePadrao(tx,db,ator),rec=rr?await tx.get(rr):null;
  if(rec?.exists){const r=conferirRecibo(rec.data(),ator,id,operacao,pedidoHash);if(!ler)return resultado(r,true);const f=await fontes(tx,db,id,g,agora,ator),out=resultado(r,true);return {...dto(f,id,out.operacao),adotada:out.adotada,recibo:out.recibo};}
  const f=await fontes(tx,db,id,g,agora,ator);
  if(ler)return dto(f,id,operacao?{id:operacao,estado:'ausente',confirmada:false}:null);
  const motivo=f.assinatura!==pedido.assinaturaEsperada?'A versão mudou. Confira a preparação e o calendário atuais antes de adotar.':!f.necessaria?'A continuidade já está conferida; nenhuma nova adoção foi necessária.':f.motivos.join(' '),estado=motivo?'recusada_por_versao':'adotada';
  const pin=estado==='adotada'?pinPreparacao(id,f.p):null;
  if(pin)contextoLegadoEditorialI172(id,{...f.r,preparacaoPreservadaI155:pin},g.processo,f.c,f.p);
  const observada=pin&&f.publicacaoObservada?{schema:1,origem:'adocao_publicacao_preexistente_cp129',proveniencia:'publicacao_preexistente_observada',ciclo:pedido.ciclo,cliente:id.cliente,competencia:id.competencia,ativacaoId:g.processo.ativacaoId,publicacao:pedido.operacao,autoridade:rr.path,em:f.publicacaoObservada.publicadoEm,observadaEm:em,observadaPor:ator.real,autorUid:ator.uid,papel:ator.papel,preparacaoPreservadaI155:pin,...f.publicacaoObservada}:null;
  const r={schema:1,ciclo:pedido.ciclo,cliente:id.cliente,competencia:id.competencia,operacao:pedido.operacao,pedidoHash,estado,motivo,autorUid:ator.uid,atorReal:ator.real,papel:ator.papel,em,assinaturaAntes:f.assinatura,quantidadeItens:f.ativos.length,preparacaoPreservadaI155:pin,...(observada?{publicacaoPreservadaCp129:observada}:{})};
  if(pin)tx.update(db.doc('continuidade_calendarios_i164/'+pedido.ciclo),{preparacaoPreservadaI155:pin,...(observada?{publicacaoPreservadaCp129:observada}:{})});
  tx.create(rr,r);return resultado(r,false);
 });
}

/* Exclusivo CP123: a observação não substitui um recibo I172 de publicação posterior. */
export async function provaPublicacaoAdotadaCp129(db,tx,c,cal){
 const inicial=c?._continuidade?.publicacaoPreservadaCp129;if(!inicial)return null;
 exigir(c.modo==='continuar_legado'&&c.id===c.competencia+'__'+c.cliente,'A observação da publicação pertence a outra origem.');
 const id={cliente:c.cliente,competencia:c.competencia},parent='continuidade_calendarios_i164/'+c.id;
 exigir(inicial.schema===1&&inicial.origem==='adocao_publicacao_preexistente_cp129'&&inicial.proveniencia==='publicacao_preexistente_observada'&&opValida(inicial.publicacao)&&inicial.autoridade===parent+'/adocoes_preparacao_cp129/'+inicial.publicacao,'A autoridade da publicação observada precisa de conferência.');
 const [cs,ps,rs,processo]=await Promise.all([tx.get(db.doc(parent)),tx.get(db.doc('planejamento_social_i155/'+c.id)),tx.get(db.doc(inicial.autoridade)),tx.get(db.doc('processo_calendarios_i164/ativo'))]);
 exigir(cs.exists&&ps.exists&&rs.exists&&processoAtivoI164(processo.data()),'As fontes da publicação observada não foram confirmadas.');
 const raw=cs.data(),p=ps.data(),r=rs.data(),ponte=raw.publicacaoPreservadaCp129;
 exigir(isDeepStrictEqual(ponte,inicial)&&isDeepStrictEqual(ponte,r.publicacaoPreservadaCp129)&&r.schema===1&&r.estado==='adotada'&&r.ciclo===c.id&&r.operacao===ponte.publicacao&&r.autorUid===ponte.autorUid&&r.atorReal==='Chris'&&r.papel==='Chris'&&ponte.observadaPor==='Chris'&&ponte.papel==='Chris'&&ponte.autorUid&&ponte.observadaEm===r.em,'O recibo não comprova a mesma observação autenticada do Chris.');
 exigir(ponte.ciclo===c.id&&ponte.cliente===c.cliente&&ponte.competencia===c.competencia&&ponte.ativacaoId===processo.data().ativacaoId&&identidadeContinuidade(raw,id,processo.data()),'A publicação observada pertence a outra ativação, cliente ou mês.');
 contextoLegadoEditorialI172(id,raw,processo.data(),cal,p);
 exigir(isDeepStrictEqual(raw.preparacaoPreservadaI155,ponte.preparacaoPreservadaI155)&&isDeepStrictEqual(r.preparacaoPreservadaI155,ponte.preparacaoPreservadaI155),'A preparação preservada desta observação mudou.');
 const atual=origemPublicacaoObservada(id,raw,cal);
 exigir(atual&&isDeepStrictEqual(atual.retrato,ponte.retrato)&&atual.retratoHash===ponte.retratoHash&&atual.publicadoEm===ponte.em&&isDeepStrictEqual(atual.idsEdicao,ponte.idsEdicao),'O retrato público ou a edição dos conteúdos mudou depois da observação.');
 return {schema:1,origem:'adocao_publicacao_preexistente_cp129',ciclo:c.id,cliente:c.cliente,competencia:c.competencia,publicacao:ponte.publicacao,em:ponte.em,retratoHash:ponte.retratoHash,autoridade:ponte.autoridade,observadaEm:ponte.observadaEm};
}
