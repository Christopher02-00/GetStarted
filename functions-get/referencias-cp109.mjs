/* Banco existente: origens físicas, DTO limitado e operações com CAS. Sem SDK genérico. */
import {createHash} from 'node:crypto';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {validarCadastroI165} from './contexto.mjs';
import {programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {processoAtivoI164} from './central/lib/gs-processo-calendarios-i164.mjs';
import {carteiraCanonicaI164} from './central/lib/gs-carteira-calendarios-i164.mjs';
import {fonteReferencia} from './central/lib/gs-planejamento-social-i155.mjs';
import {mesDoItemCalendario,fonteFisicaClienteR4} from './lib/guardas-stokki-i165.mjs';

export const ACOES_REFERENCIAS_CP109=Object.freeze(['referencias_resumo_cp109','referencias_listar_cp109','referencias_salvar_cp109','referencias_decidir_cp109','cliente_consultar_cp109','referencias_avisos_cp109']);
export const TIPO_AVISO_REFERENCIAS_CP109='referencias_cp109';
export const FORMATOS_REFERENCIAS_CP109=Object.freeze(['video','carrossel','imagem','outro']);
export const CLASSIFICACOES_REFERENCIAS_CP109=Object.freeze(['atracao','qualificacao','conversao']);
const COLECOES=new Set(['referencias','referencias_cliente']),PAPEIS=['Chris','Amanda','Gabrielle'];
const gabiEmail='gabrielleromaomarketing@gmail.com',LIMITE=1000;
const exigir=(ok,message)=>{if(!ok)throw Object.assign(new Error(message),{code:'cp109/referencias'});};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,180}$/.test(v)&&!['.','..'].includes(v);
const mes=v=>typeof v==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(v);
const texto=(v,n,obrigatorio=false)=>{exigir(typeof v==='string'&&v.length<=n&&(!obrigatorio||v.trim()),'Confira o texto e seu tamanho; nenhum conteúdo foi cortado.');return v.trim();};
function canon(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(typeof v.toJSON==='function')return canon(v.toJSON());if(Array.isArray(v))return '['+v.map(canon).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';}
const hash=v=>createHash('sha256').update(canon(v)).digest('hex');
const assinatura=d=>hash(d);
export function assinaturaReferenciaCp109(raw){return assinatura(raw);}
const dataLocal=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const horaLocal=d=>Number(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',hourCycle:'h23'}).format(d));
const proximoMes=v=>{const d=new Date(v+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,7);};
function origem(v){exigir(v&&Object.keys(v).every(k=>['colecao','id'].includes(k))&&COLECOES.has(v.colecao)&&id(v.id),'Abra uma referência da origem física correta.');return {colecao:v.colecao,id:v.id};}
function url(v){v=texto(v,2000,true);let u;try{u=new URL(v);}catch{exigir(false,'Informe um link HTTPS válido.');}exigir(u.protocol==='https:'&&!u.username&&!u.password,'Use um link HTTPS sem credenciais.');return u.href;}
const iguaisUso=(a,b)=>!!a&&!!b&&['calendarId','competencia','itemId'].every(k=>a[k]===b[k]);
function validarUso(uso,cliente,competencia){exigir(uso&&Object.keys(uso).every(k=>['calendarId','competencia','itemId'].includes(k))&&uso.calendarId===cliente&&uso.competencia===competencia&&id(uso.itemId),'O uso precisa apontar ao mesmo cliente, mês e item físico.');return {calendarId:cliente,competencia,itemId:uso.itemId};}
const fonte=r=>{try{return r.link?fonteReferencia(r.link):'';}catch{return '';}};
function usosFisicos(raw,calendario){return (Array.isArray(calendario?.items)?calendario.items:[]).filter(i=>i&&!i.excluido&&fonte({link:i.ref})&&fonte({link:i.ref})===fonte(raw)).map(i=>({calendarId:raw.cliente,competencia:mesDoItemCalendario(calendario,i),itemId:i.itemId||''}));}
function referenciaDto(colecao,refId,d,competencia){
 const c=d.cp109||{},completa=!!(fonte(d)&&String(d.descricao||d.ideia||'').trim()&&FORMATOS_REFERENCIAS_CP109.includes(c.formato)&&CLASSIFICACOES_REFERENCIAS_CP109.includes(c.classificacao));
 const legadoStatus=d.status||'',utilizada=!!c.uso||['no_calendario','concluida','publicada'].includes(legadoStatus),reprovada=['reprovada','nao_aprovada'].includes(c.status||legadoStatus),arquivada=c.status==='arquivada'||d.arquivada===true;
 const status=d.excluido===true?'excluida':utilizada?'utilizada':reprovada?'reprovada':arquivada?'arquivada':c.status==='aprovada'||legadoStatus==='aprovada'?'aprovada':'disponivel';
 return {id:refId,colecao,cliente:d.cliente,clienteNome:typeof d.clienteNome==='string'?d.clienteNome:d.cliente,link:typeof d.link==='string'?d.link:'',descricao:typeof (d.descricao||d.ideia)==='string'?(d.descricao||d.ideia):'',formato:c.formato||'',formatoOutro:c.formatoOutro||'',classificacao:c.classificacao||'',status,completa,disponivel:completa&&['disponivel','aprovada'].includes(status),motivo:c.motivo||'',arquivadaPara:c.arquivadaPara||'',podeRecuperar:arquivada&&!!c.arquivadaPara&&competencia>=c.arquivadaPara,revisao:c.revisao||0,assinatura:assinatura(d),autor:typeof d.criadoPor==='string'?d.criadoPor:typeof d.autorNome==='string'?d.autorNome:'',criadaEm:c.criadaEm||iso(d.criadoEm)||'',uso:c.uso?{calendarId:c.uso.calendarId,competencia:c.uso.competencia,itemId:c.uso.itemId}:null,historico:(c.historico||[]).map(h=>({acao:h.acao,por:h.por,perfil:h.perfil,em:h.em,motivo:h.motivo||'',competencia:h.competencia||''})),legado:c.schema!==1};
}
function iso(v){try{if(typeof v==='string')return Number.isFinite(Date.parse(v))?v:'';if(typeof v?.toDate==='function')return v.toDate().toISOString();if(v?.seconds!==undefined)return new Date(v.seconds*1000).toISOString();}catch{}return '';}
function validarHistorico(c){exigir(!c||c.schema===1&&Number.isSafeInteger(c.revisao)&&c.revisao>=1&&Array.isArray(c.historico)&&c.historico.length<500,'O histórico desta referência precisa de conferência. Nada foi sobrescrito.');}
function extender(raw,patch,ator,operacao,agora,acao,competencia){const c=raw.cp109;validarHistorico(c);return {...c,schema:1,revisao:(c?.revisao||0)+1,...patch,operacao,editadoEm:agora.toISOString(),editadoPor:ator.real,editadoPerfil:ator.papel,historico:[...(c?.historico||[]),{acao,por:ator.real,perfil:ator.papel,em:agora.toISOString(),operacao,competencia,motivo:patch.motivo||''}]};}
async function gate(db,tx,ator){
 const [cfg,cad,processo]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(db.doc('usuarios_equipe/'+ator.email)),tx.get(db.doc('processo_calendarios_i164/ativo'))]);
 validarCadastroI165(ator,cad.data());exigir(programacaoAtivaI165(cfg.data())&&cfg.data().habilidades?.preparacaoCentral===true&&processoAtivoI164(processo.data()),'Esta preparação está pausada. A última leitura foi preservada.');return {cfg:cfg.data(),processo:processo.data()};
}
async function limitado(tx,q){const s=await tx.get(typeof q.limit==='function'?q.limit(LIMITE+1):q);exigir(s.size<=LIMITE,'Há mais registros que esta leitura comporta. Nenhum resultado foi truncado.');return s.docs;}
async function carteiraTx(db,tx,competencia,agora){const [co,ex]=await Promise.all([limitado(tx,db.collection('clientes_config')),limitado(tx,db.collection('clientes_extras'))]);return carteiraCanonicaI164({configs:co.map(d=>({id:d.id,data:d.data()})),extras:ex.map(d=>({id:d.id,data:d.data()})),competencia,hoje:dataLocal(agora)}).carteira;}
async function clienteTx(db,tx,cliente,competencia,agora){exigir(id(cliente)&&mes(competencia),'Escolha o cliente e o mês.');const c=(await carteiraTx(db,tx,competencia,agora)).find(x=>x.slug===cliente);exigir(c,'Este cliente não pertence à carteira desta competência.');return c;}
async function bancoTx(db,tx,cliente,competencia){
 const [a,b,regs,cal]=await Promise.all([limitado(tx,db.collection('referencias').where('cliente','==',cliente)),limitado(tx,db.collection('referencias_cliente').where('cliente','==',cliente)),limitado(tx,db.collection('planejamento_social_i155/'+competencia+'__'+cliente+'/registros').where('tipo','==','referencia')),tx.get(db.doc('calendarios/'+cliente))]);
 const rows=[...a.map(d=>({colecao:'referencias',id:d.id,raw:d.data()})),...b.map(d=>({colecao:'referencias_cliente',id:d.id,raw:d.data()}))];
 const mapa=new Map(rows.map(r=>[r.colecao+'/'+r.id,r]));for(const doc of regs){const r=doc.data();if(r.cliente!==cliente||!COLECOES.has(r.origemColecao)||!id(r.origemId))continue;const p=mapa.get(r.origemColecao+'/'+r.origemId);if(p){p.preparacao??=[];p.preparacao.push({ciclo:competencia+'__'+cliente,id:doc.id,selecionada:r.selecionada===true});}}
 const calendario=cal.exists?cal.data():null;if(calendario)exigir(fonteFisicaClienteR4(cliente,calendario),'A identidade física do calendário precisa ser conferida.');
 return rows.map(r=>{const dto=referenciaDto(r.colecao,r.id,r.raw,competencia);const usado=(calendario?.items||[]).find(it=>it&&!it.excluido&&fonte({link:it.ref})&&fonte({link:it.ref})===fonte(r.raw));if(usado&&dto.status!=='excluida'){dto.status='utilizada';dto.disponivel=false;dto.uso??={calendarId:cliente,competencia:mesDoItemCalendario(calendario,usado),itemId:usado.itemId||''};}return {...dto,preparacao:r.preparacao||[]};});
}
function indicador(referencias){const fontes=new Set(referencias.filter(r=>r.disponivel).map(r=>fonte(r)));return {disponiveis:fontes.size,meta:20,percentual:Math.min(100,Math.round(fontes.size*5)),abaixoMeta:fontes.size<20};}
async function resumoTx(db,tx,competencia,agora){
 const clientes=await carteiraTx(db,tx,competencia,agora),[a,b,cals,diario]=await Promise.all([limitado(tx,db.collection('referencias')),limitado(tx,db.collection('referencias_cliente')),Promise.all(clientes.map(c=>tx.get(db.doc('calendarios/'+c.slug)))),diarioTx(db,tx,agora)]);
 const rows=[...a.map(d=>({colecao:'referencias',id:d.id,raw:d.data()})),...b.map(d=>({colecao:'referencias_cliente',id:d.id,raw:d.data()}))];
 return {schema:1,competencia,diario,clientes:clientes.map((c,index)=>{const cal=cals[index].exists?cals[index].data():null;if(cal)exigir(fonteFisicaClienteR4(c.slug,cal),'A identidade física do calendário precisa ser conferida.');const usadas=new Set((cal?.items||[]).filter(i=>i&&!i.excluido&&i.ref).map(i=>fonte({link:i.ref}))),refs=rows.filter(r=>r.raw.cliente===c.slug).map(r=>{const dto=referenciaDto(r.colecao,r.id,r.raw,competencia);return usadas.has(fonte(r.raw))?{...dto,status:'utilizada',disponivel:false}:dto;});return {slug:c.slug,nome:c.nome,indicador:indicador(refs)};})};
}
async function diarioTx(db,tx,agora){
 const dia=dataLocal(agora),docs=[];for(const colecao of COLECOES)for(const campo of ['criadoPor','cp109.criadaPorPerfil']){const s=await limitado(tx,db.collection(colecao).where(campo,'==','Gabrielle'));for(const d of s)docs.push({colecao,id:d.id,raw:d.data()});}
 const unicos=new Map(docs.map(r=>[r.colecao+'/'+r.id,r])),fontes=new Set();for(const {raw}of unicos.values()){const c=raw.cp109||{},instante=iso(raw.criadoEm)||c.criadaEm||'',d=instante?dataLocal(new Date(instante)):'';if(d!==dia||raw.excluido||raw.origemPlanoCp109||c.importada===true)continue;const r=referenciaDto('', '',raw,dia.slice(0,7));if(r.completa&&fonte(raw))fontes.add(fonte(raw));}return {dia,novas:fontes.size,meta:10,faltam:Math.max(0,10-fontes.size)};
}

/* Integração estratégica: o chamador valida e grava o item/calendário NO MESMO tx. */
export async function lerReferenciaDisponivelTxCp109(db,tx,rawOrigem,{cliente,competencia,assinatura:esperada,uso}={}){
 const o=origem(rawOrigem),ref=db.doc(o.colecao+'/'+o.id),s=await tx.get(ref);exigir(s.exists&&s.data().cliente===cliente,'A referência física não pertence a este cliente.');const raw=s.data(),referencia=referenciaDto(o.colecao,o.id,raw,competencia);
 const cal=await tx.get(db.doc('calendarios/'+cliente));if(cal.exists)exigir(fonteFisicaClienteR4(cliente,cal.data()),'A identidade física do calendário precisa ser conferida.');const usos=usosFisicos(raw,cal.exists?cal.data():null);
 exigir(!usos.length||usos.length===1&&iguaisUso(usos[0],uso),'A referência já aparece em outro conteúdo físico.');
 exigir(!esperada||esperada===referencia.assinatura,'A referência mudou. Compare a versão atual antes de continuar.');exigir(referencia.disponivel||referencia.status==='utilizada'&&iguaisUso(raw.cp109?.uso,uso),'A referência não está disponível para este conteúdo.');return {ref,raw,referencia};
}
export function patchUsoReferenciaCp109(raw,uso,ator,operacao,agora=new Date()){
 validarUso(uso,raw.cliente,uso?.competencia);exigir(['Amanda','Chris'].includes(ator.papel),'A utilização pertence à revisão da Amanda.');const atual=raw.cp109?.uso;exigir(!atual||iguaisUso(atual,uso),'A referência já foi utilizada em outro item; o vínculo foi preservado.');if(iguaisUso(atual,uso))return {cp109:raw.cp109};
 return {cp109:extender(raw,{status:'utilizada',uso:{...uso},motivo:'',arquivadaPara:''},ator,operacao,agora,'utilizada',uso.competencia)};
}
export function criarReferenciaDePlanoCp109({cliente,clienteNome,competencia,planoId,acaoId,descricao,link='',formato='',classificacao='',ator,agora=new Date()}){
 exigir(id(cliente)&&mes(competencia)&&id(planoId)&&id(acaoId)&&PAPEIS.includes(ator?.papel),'Confira a origem do plano.');texto(descricao,3000,true);if(link)link=url(link);exigir(!formato||FORMATOS_REFERENCIAS_CP109.includes(formato),'Formato inválido.');exigir(!classificacao||CLASSIFICACOES_REFERENCIAS_CP109.includes(classificacao),'Classificação inválida.');const refId='plano_cp109_'+hash([cliente,planoId,acaoId]);
 return {colecao:'referencias',id:refId,documento:{cliente,clienteNome,link,descricao,criadoPor:ator.papel,criadoPorReal:ator.real,criadoEm:agora.toISOString(),origemPlanoCp109:{planoId,acaoId,cliente,competencia},cp109:extender({}, {status:'disponivel',formato,classificacao,formatoOutro:'',criadaEm:agora.toISOString(),criadaPorPerfil:ator.papel,tipo:'ideia',importada:false},ator,refId,agora,'ideia_do_plano',competencia)}};
}

 const SENSIVEL=/(?:senha|password|access[_ -]?token|refresh[_ -]?token|private[_ -]?key|credencia|sal[aá]rio|folha de pagamento|conta banc[aá]ria|chave pix|nota financeira|comiss[aã]o interna)/iu;
function profissional(d,campos){const out={},restritos=[];for(const k of campos){const valor=d?.[k];if(typeof valor!=='string')continue;let linkSeguro=true;if(['link','ref'].includes(k)&&valor){try{const u=new URL(valor);linkSeguro=u.protocol==='https:'&&!u.username&&!u.password;}catch{linkSeguro=false;}}if(!linkSeguro||valor.length>60000||SENSIVEL.test(valor)){restritos.push(k);continue;}out[k]=valor;}return {...out,...(restritos.length?{conteudoRestrito:restritos,aviso:'Há conteúdo que precisa de revisão da gestão antes de ser compartilhado nesta consulta.'}:{})};}
async function consultaTx(db,tx,cliente,competencia){
 const [info,briefing,atas,cal]=await Promise.all([tx.get(db.doc('info_extras_cliente/'+cliente)),tx.get(db.doc('briefings_cliente/'+cliente)),limitado(tx,db.collection('atas_reuniao').where('cliente','==',cliente)),tx.get(db.doc('calendarios/'+cliente))]);
 const calendario=cal.exists?cal.data():null;if(calendario)exigir(fonteFisicaClienteR4(cliente,calendario),'O calendário não confirma a identidade física.');
 return {schema:1,cliente,competencia,somenteConsulta:true,informacoes:{existe:info.exists,...profissional(info.data(),['texto','clienteNome'])},briefing:{existe:briefing.exists,...profissional(briefing.data(),['texto','link','clienteNome'])},atas:atas.map(s=>({id:s.id,...profissional(s.data(),['titulo','data','texto','resumo','participantes','assuntos','decisoes','proximosPassos'])})),calendario:{existe:!!calendario,itens:(calendario?.items||[]).filter(i=>i&&!i.excluido&&mesDoItemCalendario(calendario,i)===competencia).map(i=>({itemId:typeof i.itemId==='string'?i.itemId:'',day:Number.isInteger(i.day)?i.day:null,...profissional(i,['name','desc','legenda','ref','tema','objetivo','estrategia','direcionamentoRoteiro'])}))}};
}
function validarEntrada(d){
 exigir(d&&typeof d==='object'&&!Array.isArray(d)&&ACOES_REFERENCIAS_CP109.includes(d.acao),'Operação desconhecida.');const campos=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao','cliente','competencia',...({referencias_salvar_cp109:['origem','referencia','assinaturaEsperada','operacaoId'],referencias_decidir_cp109:['origem','decisao','motivo','arquivadaPara','uso','assinaturaEsperada','operacaoId']}[d.acao]||[])];exigir(Object.keys(d).every(k=>campos.includes(k)),'Há campos fora deste contrato.');exigir(mes(d.competencia),'Escolha o mês.');if(!['referencias_avisos_cp109','referencias_resumo_cp109'].includes(d.acao))exigir(id(d.cliente),'Escolha o cliente físico.');
}
export async function operarReferenciasCp109(db,auth,dados,{agora=new Date()}={}){
 validarEntrada(dados);const ator=validarContaEsperadaI165(auth,dados);exigir(PAPEIS.includes(ator.papel),'Esta consulta pertence à Gabi, Amanda e Chris.');const a=dados.acao;
 if(a==='referencias_resumo_cp109')return db.runTransaction(async tx=>{await gate(db,tx,ator);return resumoTx(db,tx,dados.competencia,agora);});
 if(a==='referencias_avisos_cp109')return db.runTransaction(async tx=>{await gate(db,tx,ator);exigir(ator.papel==='Gabrielle','A rotina diária pertence à Gabi.');return {schema:1,diario:await diarioTx(db,tx,agora)};});
 if(a==='referencias_listar_cp109'||a==='cliente_consultar_cp109')return db.runTransaction(async tx=>{await gate(db,tx,ator);await clienteTx(db,tx,dados.cliente,dados.competencia,agora);if(a==='cliente_consultar_cp109')return consultaTx(db,tx,dados.cliente,dados.competencia);const [referencias,diario]=await Promise.all([bancoTx(db,tx,dados.cliente,dados.competencia),diarioTx(db,tx,agora)]);return {schema:1,cliente:dados.cliente,competencia:dados.competencia,referencias,indicador:indicador(referencias),diario};});
 exigir(id(dados.operacaoId)&&dados.operacaoId.length>=8,'Mantenha a mesma tentativa de gravação.');const opRef=db.doc('referencias_operacoes_cp109/'+hash([ator.uid,ator.real,ator.papel,dados.operacaoId])),pedidoHash=hash(dados),o=dados.origem?origem(dados.origem):{colecao:'referencias',id:'ref109_'+hash([ator.uid,ator.papel,dados.operacaoId])},ref=db.doc(o.colecao+'/'+o.id);
 const resultado=await db.runTransaction(async tx=>{
  const g=await gate(db,tx,ator),cliente=await clienteTx(db,tx,dados.cliente,dados.competencia,agora),[rec,s]=await Promise.all([tx.get(opRef),tx.get(ref)]),old=s.exists?s.data():null;
  if(rec.exists){exigir(rec.data().pedidoHash===pedidoHash&&rec.data().origem.colecao===o.colecao&&rec.data().origem.id===o.id,'Esta tentativa já pertence a outro conteúdo.');return {...rec.data(),recuperada:true};}
  exigir(!old||old.cliente===dados.cliente,'A referência pertence a outro cliente.');exigir(dados.origem?!!old:!old,'A referência de origem não foi confirmada.');exigir(!old||typeof dados.assinaturaEsperada==='string'&&assinatura(old)===dados.assinaturaEsperada,'A referência mudou. Compare a versão atual antes de salvar.');exigir(!old||old.excluido!==true,'Referência excluída preservada.');let documento;
  if(old){const cal=await tx.get(db.doc('calendarios/'+dados.cliente));if(cal.exists)exigir(fonteFisicaClienteR4(dados.cliente,cal.data()),'A identidade física do calendário precisa ser conferida.');const usados=usosFisicos(old,cal.exists?cal.data():null);exigir(!usados.length||a==='referencias_decidir_cp109'&&dados.decisao==='utilizada','Esta referência já foi usada fisicamente. O conteúdo e a fonte foram preservados.');}
  if(a==='referencias_salvar_cp109'){
   const r=dados.referencia;exigir(r&&Object.keys(r).every(k=>['link','descricao','formato','formatoOutro','classificacao'].includes(k)),'Confira os campos da referência.');const link=url(r.link),descricao=texto(r.descricao,3000,true);exigir(FORMATOS_REFERENCIAS_CP109.includes(r.formato)&&CLASSIFICACOES_REFERENCIAS_CP109.includes(r.classificacao),'Escolha o formato e a classificação estratégica.');const formatoOutro=texto(r.formatoOutro||'',120,r.formato==='outro');
   const bancos=await Promise.all([...COLECOES].map(colecao=>limitado(tx,db.collection(colecao).where('cliente','==',dados.cliente)).then(docs=>docs.map(d=>({colecao,id:d.id,raw:d.data()})))));
   exigir(!bancos.flat().some(x=>x.raw.excluido!==true&&(x.colecao!==o.colecao||x.id!==o.id)&&fonte(x.raw)===fonte({link})),'Esta referência já existe no banco do cliente. Abra a origem existente para completar os campos.');
   exigir(ator.papel!=='Gabrielle'||!old||[old.criadoPor,old.autorNome,old.cp109?.criadaPorPerfil].includes('Gabrielle'),'A autoria desta referência é preservada; peça a edição à gestão.');
   const atual=old?referenciaDto(o.colecao,o.id,old,dados.competencia):null;exigir(!atual||!['utilizada','reprovada','arquivada'].includes(atual.status),'A decisão da Amanda permanece. Recupere a referência antes de editá-la.');
   documento={...(old||{cliente:dados.cliente,clienteNome:cliente.nome,criadoPor:ator.papel,criadoPorReal:ator.real,criadoEm:agora.toISOString()}),link,descricao,cp109:extender(old||{}, {formato:r.formato,formatoOutro,classificacao:r.classificacao,status:'disponivel',...(old?{}:{criadaEm:agora.toISOString(),criadaPorPerfil:ator.papel,importada:false})},ator,dados.operacaoId,agora,old?'editar':'cadastrar',dados.competencia)};
  }else{
   exigir(ator.papel==='Amanda'||ator.papel==='Chris','A decisão das referências pertence à Amanda.');exigir(old,'Abra a referência.');const estado=referenciaDto(o.colecao,o.id,old,dados.competencia);exigir(['aprovada','reprovada','arquivada','disponivel','utilizada'].includes(dados.decisao),'Decisão inválida.');let patch={status:dados.decisao,motivo:typeof dados.motivo==='string'?texto(dados.motivo,3000):'',arquivadaPara:''};
   if(dados.decisao==='reprovada')exigir(patch.motivo,'Informe o motivo da reprovação.');
   if(dados.decisao==='arquivada'){exigir(mes(dados.arquivadaPara)&&dados.arquivadaPara>dados.competencia,'Escolha um mês futuro para recuperar a referência.');patch.arquivadaPara=dados.arquivadaPara;}
   if(dados.decisao==='disponivel')exigir(estado.status==='reprovada'||estado.status==='arquivada'&&estado.podeRecuperar,'Confira o mês e a decisão antes de recuperar.');
   exigir(estado.status!=='utilizada'||dados.decisao==='utilizada','O histórico de uso permanece vinculado ao calendário.');
   if(dados.decisao==='utilizada'){
    const uso=validarUso(dados.uso,dados.cliente,dados.competencia),cal=await tx.get(db.doc('calendarios/'+uso.calendarId)),c=cal.data();exigir(cal.exists&&fonteFisicaClienteR4(uso.calendarId,c),'O calendário físico precisa ser confirmado.');const itens=(c.items||[]).filter(i=>i&&!i.excluido&&i.itemId===uso.itemId&&mesDoItemCalendario(c,i)===uso.competencia);exigir(itens.length===1&&fonte({link:itens[0].ref})===fonte(old),'Salve a mesma referência no conteúdo original antes de concluir seu uso.');patch=patchUsoReferenciaCp109(old,uso,ator,dados.operacaoId,agora).cp109;
   }else patch=extender(old,patch,ator,dados.operacaoId,agora,dados.decisao,dados.competencia);
   documento={...old,cp109:patch};
  }
  const registro={schema:1,pedidoHash,origem:o,cliente:dados.cliente,competencia:dados.competencia,operacaoId:dados.operacaoId,revisao:documento.cp109.revisao,autorUid:ator.uid,autorReal:ator.real,papel:ator.papel,confirmada:true};
  tx.set(ref,documento);tx.set(opRef,registro);
  if(a==='referencias_decidir_cp109'&&dados.decisao==='reprovada'){const nota=notaReprovada(o,documento,g.processo,agora);tx.set(db.doc('notificacoes_operacionais_i165/'+nota.id),nota);}
  return registro;
 });
 return db.runTransaction(async tx=>{await gate(db,tx,ator);const s=await tx.get(ref);exigir(s.exists&&s.data().cliente===dados.cliente,'A releitura desta referência precisa de conferência. Preserve a mesma tentativa.');return {schema:1,operacao:resultado,referencia:referenciaDto(o.colecao,o.id,s.data(),dados.competencia)};});
}

function nota(origem,versao,processo,agora,titulo,descricao,nivel){const destinatario='Gabrielle',identifier=hash([origem,versao,destinatario,nivel]);return {schema:1,id:identifier,origem,versao,destinatario,nivel,ativacaoId:processo.ativacaoId,titulo,texto:descricao,link:{area:'referencias_cp109',cliente:origem.cliente||'',competencia:dataLocal(agora).slice(0,7)},criadaEm:agora.toISOString(),estado:'pendente',canais:{push:{estado:'desligado',tentativas:0},email:{estado:'desligado',tentativas:0}}};}
function notaReprovada(o,d,processo,agora){const origem={tipo:TIPO_AVISO_REFERENCIAS_CP109,id:'decisao_'+hash([o.colecao,o.id]),subtipo:'reprovada',cliente:d.cliente,colecao:o.colecao,referenciaId:o.id,operacao:d.cp109.operacao};return nota(origem,hash([origem,d.cp109.revisao,d.cp109.motivo]),processo,agora,'Referência não aprovada · '+(d.clienteNome||d.cliente),d.cp109.motivo+' Cadastre outra referência para recompor o banco.','ajuste');}
function notaDiaria(dia,processo,agora){const origem={tipo:TIPO_AVISO_REFERENCIAS_CP109,id:'diario_'+dia,subtipo:'diario',dia};return nota(origem,hash([origem,10]),processo,agora,'Referências do dia','Bom dia, Gabi. Cadastre 10 novas referências e confira os bancos abaixo da meta.','rotina');}
async function gateTick(db,tx){const [cfg,p,cad]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(db.doc('processo_calendarios_i164/ativo')),tx.get(db.doc('usuarios_equipe/'+gabiEmail))]);const c=cad.data();return programacaoAtivaI165(cfg.data())&&cfg.data().habilidades?.preparacaoCentral===true&&processoAtivoI164(p.data())&&c?.pessoa==='Gabrielle'&&c.ativo===true&&c.excluido!==true?p.data():null;}
export async function tickRefsCp109(db,{agora=new Date()}={}){
 return db.runTransaction(async tx=>{const processo=await gateTick(db,tx);if(!processo)return {schema:1,ativa:false};if(horaLocal(agora)<8)return {schema:1,ativa:true,aguardandoManha:true};const diario=await diarioTx(db,tx,agora),n=notaDiaria(diario.dia,processo,agora),ref=db.doc('notificacoes_operacionais_i165/'+n.id),atual=await tx.get(ref);if(!atual.exists&&diario.novas<10)tx.set(ref,n);return {schema:1,ativa:true,criada:!atual.exists&&diario.novas<10,diario};});
}
/* Root conecta este revalidador ao reader/dispatcher existentes antes de ativar o tick. */
export async function ocorrenciasReferenciasCp109(db,n,agora=new Date()){
 const ler=callback=>typeof db.runTransaction==='function'?db.runTransaction(callback):callback({get:ref=>ref.get()});
 return ler(async tx=>{const processo=await gateTick(db,tx);if(!processo||n.ativacaoId&&n.ativacaoId!==processo.ativacaoId||n.destinatario!=='Gabrielle'||n.origem?.tipo!==TIPO_AVISO_REFERENCIAS_CP109)return [];const o=n.origem;
  if(o.subtipo==='diario'){const diario=await diarioTx(db,tx,agora);if(o.dia!==diario.dia||horaLocal(agora)<8||diario.novas>=10)return [];return [notaDiaria(diario.dia,processo,agora)];}
  if(o.subtipo==='reprovada'&&COLECOES.has(o.colecao)&&id(o.referenciaId)){const s=await tx.get(db.doc(o.colecao+'/'+o.referenciaId)),d=s.data();if(!s.exists||d.cliente!==o.cliente||d.excluido||d.cp109?.status!=='reprovada'||d.cp109.operacao!==o.operacao)return [];return [notaReprovada({colecao:o.colecao,id:o.referenciaId},d,processo,agora)];}return [];
 });
}
