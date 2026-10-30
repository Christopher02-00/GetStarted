/* Contrato privado compartilhado: uma providência é uma demanda, não um calendário ou publicação. */
export const TIPO_PROVIDENCIA_GRAVACAO_CP140='providencia_gravacao_cp140';
export const META_PROVIDENCIA_CP140='providenciaGravacaoCp140';
export const ACOES_PROVIDENCIAS_CP140=Object.freeze(['ler','listar_fonte','listar','salvar','esperar','confirmar','cancelar','substituir','revisar'].map(a=>'providencias_gravacao_'+a+'_cp140'));
export const TIPOS_CONFIRMACAO_CP140=Object.freeze(['material','participantes','local','decisao','informacao','outro']);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const clone=v=>structuredClone(v);
export function exigirProvidenciaCp140(ok,mensagem,codigo='entrada'){if(!ok)throw Object.assign(new Error(mensagem),{code:'i165/providencia-cp140-'+codigo});}
const e=exigirProvidenciaCp140;
function campos(v,permitidos,obrigatorios=permitidos){e(obj(v)&&Object.keys(v).every(k=>permitidos.includes(k))&&obrigatorios.every(k=>Object.hasOwn(v,k)),'Confira os campos desta providência.');}
function texto(v,max,vazio=true){e(typeof v==='string'&&v.length<=max&&(vazio||!!v.trim())&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v),'Confira o texto e seu tamanho.');return v.trim();}
export function clienteProvidenciaCp140(v){e(typeof v==='string'&&/^[a-z0-9][a-z0-9._-]{0,119}$/u.test(v)&&!['zeens','otica-visao-araucaria'].includes(v),'Confira o cliente físico desta providência.','cliente');return v;}
export function competenciaProvidenciaCp140(v){e(/^20\d{2}-(0[1-9]|1[0-2])$/u.test(v||''),'Escolha o mês correto da pauta.','competencia');return v;}
export function idProvidenciaValidoCp140(v){return typeof v==='string'&&/^prov140_[a-f0-9]{64}$/u.test(v);}
function idItem(v){e(typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,180}$/u.test(v)&&!['.','..'].includes(v),'Confira o conteúdo físico da pauta.');return v;}
function data(v){e(v===''||typeof v==='string'&&/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u.test(v)&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v,'Informe uma data real ou deixe a combinar.','prazo');return v;}
function hora(v){e(v===''||typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/u.test(v),'Confira o horário combinado.','prazo');return v;}
function link(v){texto(v,2000);if(v){let u;try{u=new URL(v);}catch{}e(u?.protocol==='https:'&&!u.username&&!u.password,'Use um link https sem credenciais.','prova');}return v;}
function assinatura(v,nula=false){e(nula&&v===null||typeof v==='string'&&/^[a-f0-9]{64}$/u.test(v),'Releia a versão antes de continuar.','versao');return v;}
export function canonicoProvidenciaCp140(v){
 const vistos=new Set();
 function n(x,depth=0){
  e(depth<=30,'A providência ultrapassa o limite de profundidade.');
  if(x===undefined)return {__undefinedCp140:true};
  if(x===null||['string','boolean'].includes(typeof x))return x;
  if(typeof x==='number'){e(Number.isFinite(x),'Número inválido.');return Object.is(x,-0)?0:x;}
  e(typeof x==='object'&&!vistos.has(x),'Objeto inválido ou circular.');
  if(x instanceof Date){e(Number.isFinite(x.getTime()),'Data inválida.');return {__dateCp140:x.toISOString()};}
  if(typeof x.toDate==='function'){const seconds=x.seconds??x._seconds,nanoseconds=x.nanoseconds??x._nanoseconds??0;e(Number.isSafeInteger(seconds)&&Number.isInteger(nanoseconds),'Timestamp inválido.');return {__timestampCp140:{nanoseconds,seconds}};}
  e(Array.isArray(x)||obj(x),'Objeto não serializável.');vistos.add(x);
  const r=Array.isArray(x)?x.map(y=>n(y,depth+1)):Object.fromEntries(Object.keys(x).sort().map(k=>{e(!['__proto__','constructor','prototype'].includes(k),'Campo reservado.');return [k,n(x[k],depth+1)];}));vistos.delete(x);return r;
 }
 return JSON.stringify(n(v));
}
export async function hashProvidenciaCp140(v){const b=new TextEncoder().encode(canonicoProvidenciaCp140(v)),h=await globalThis.crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,'0')).join('');}
export async function idProvidenciaGravacaoCp140(cliente,competencia,chaveRecurso){clienteProvidenciaCp140(cliente);competenciaProvidenciaCp140(competencia);texto(chaveRecurso,160,false);return 'prov140_'+await hashProvidenciaCp140(['providencia_gravacao_cp140',cliente,competencia,chaveRecurso.trim()]);}
export function normalizarProvidenciaCp140(v){
 campos(v,['cliente','competencia','chaveRecurso','titulo','acaoNecessaria','responsavelReal','decisor','criterio','tipoConfirmacao','prazoData','prazoHora','itemIds','empresaOtavio','sessaoId','autorizacaoChris']);
 clienteProvidenciaCp140(v.cliente);competenciaProvidenciaCp140(v.competencia);
 e(Array.isArray(v.itemIds)&&v.itemIds.length>0&&v.itemIds.length<=100&&new Set(v.itemIds).size===v.itemIds.length,'Vincule pelo menos um conteúdo, sem repetir IDs.','vinculos');v.itemIds.forEach(idItem);
 e(TIPOS_CONFIRMACAO_CP140.includes(v.tipoConfirmacao),'Escolha o compromisso que precisa ser confirmado.');
 e(v.autorizacaoChris===true,'Registre somente a versão concreta autorizada pelo Chris.','autorizacao');
 const empresaOtavio=texto(v.empresaOtavio,120);e(!empresaOtavio||v.cliente==='zeiss'&&['otica_hauer','otica_sao_jose','clinica_olhos_hauer','clinica_sao_jose'].includes(empresaOtavio),'Confira a empresa da pauta.','cliente');
 const prazoData=data(v.prazoData),prazoHora=hora(v.prazoHora);e(prazoData||!prazoHora,'Um horário exige uma data combinada.','prazo');
 const sessaoId=texto(v.sessaoId,180);e(!sessaoId||/^[A-Za-z0-9_.:-]+$/u.test(sessaoId),'Confira a sessão vinculada.');
 return {cliente:v.cliente,competencia:v.competencia,chaveRecurso:texto(v.chaveRecurso,160,false),titulo:texto(v.titulo,300,false),acaoNecessaria:texto(v.acaoNecessaria,8000,false),responsavelReal:texto(v.responsavelReal,180,false),decisor:texto(v.decisor,180),criterio:texto(v.criterio,3000,false),tipoConfirmacao:v.tipoConfirmacao,prazoData,prazoHora,itemIds:[...v.itemIds].sort(),empresaOtavio,sessaoId,autorizacaoChris:true};
}
export function validarEntradaProvidenciaCp140(d){
 e(ACOES_PROVIDENCIAS_CP140.includes(d?.acao),'Operação de providência desconhecida.');
 const acao=d.acao.slice('providencias_gravacao_'.length,-'_cp140'.length),comuns=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao'];
 const extras={ler:['id','operacao'],listar_fonte:['cliente','competencia'],listar:['cliente','competencia','incluirFinalizadas'],salvar:['operacao','assinaturaEsperada','assinaturaFonte','providencia','motivo'],esperar:['id','operacao','assinaturaEsperada','aguardandoPor','motivo','previsaoData'],confirmar:['id','operacao','assinaturaEsperada','criterioConfirmado','provaTexto','provaLink'],cancelar:['id','operacao','assinaturaEsperada','motivo'],substituir:['id','operacao','assinaturaEsperada','motivo','substituidaPorId'],revisar:['id','operacao','assinaturaEsperada','decisao','motivo']}[acao];
 const opcionais=acao==='ler'?['operacao']:acao==='listar'?extras:[];
 campos(d,[...comuns,...extras],[...comuns,...extras.filter(k=>!opcionais.includes(k))]);texto(d.sessao,180,false);
 const r=clone(d);
 if(d.id!==undefined)e(idProvidenciaValidoCp140(d.id),'Abra a mesma providência.');
 if(d.operacao!==undefined)e(typeof d.operacao==='string'&&/^[A-Za-z0-9_-]{8,100}$/u.test(d.operacao),'Mantenha o identificador da mesma tentativa.','operacao');
 if(Object.hasOwn(d,'assinaturaEsperada'))assinatura(d.assinaturaEsperada,acao==='salvar');
 if(acao==='listar_fonte'){clienteProvidenciaCp140(d.cliente);competenciaProvidenciaCp140(d.competencia);}
 if(acao==='listar'){r.cliente=d.cliente??'';r.competencia=d.competencia??'';r.incluirFinalizadas=d.incluirFinalizadas??false;if(r.cliente)clienteProvidenciaCp140(r.cliente);if(r.competencia)competenciaProvidenciaCp140(r.competencia);e(typeof r.incluirFinalizadas==='boolean','Filtro inválido.');}
 if(acao==='salvar'){r.providencia=normalizarProvidenciaCp140(d.providencia);assinatura(d.assinaturaFonte);r.motivo=texto(d.motivo,4000);}
 if(acao==='esperar'){r.aguardandoPor=texto(d.aguardandoPor,180);r.motivo=texto(d.motivo,4000,false);r.previsaoData=data(d.previsaoData);e(r.aguardandoPor||!r.previsaoData,'Uma previsão precisa de quem vai retornar.');}
 if(acao==='confirmar'){e(d.criterioConfirmado===true,'Confira o compromisso antes de confirmar.','prova');r.provaTexto=texto(d.provaTexto,10000,false);r.provaLink=link(d.provaLink);}
 if(['cancelar','substituir','revisar'].includes(acao))r.motivo=texto(d.motivo,4000,acao==='revisar'&&d.decisao==='aprovar');
 if(acao==='substituir')e(idProvidenciaValidoCp140(d.substituidaPorId)&&d.substituidaPorId!==d.id,'Escolha outra providência existente para substituir esta.');
 if(acao==='revisar'){e(['aprovar','refazer'].includes(d.decisao),'Escolha aprovar ou pedir para refazer.');e(d.decisao!=='aprovar'||r.motivo==='','A aprovação não recebe motivo de devolução.');}
 e(new TextEncoder().encode(canonicoProvidenciaCp140(r)).length<=200*1024,'O pedido ultrapassa200KiB; nada foi cortado.','limite');
 return {acao,pedido:r};
}
export function providenciaEhCp140(d){return d?.tipoEspecial===TIPO_PROVIDENCIA_GRAVACAO_CP140&&d?.[META_PROVIDENCIA_CP140]?.schema===1;}
export function validarRegistroProvidenciaCp140(d,id){
 e(providenciaEhCp140(d)&&idProvidenciaValidoCp140(id)&&d.id===id&&d.destinatario==='Cecília'&&['pendente','concluida_aguardando_aprovacao','aprovada','cancelada'].includes(d.status),'A demanda não confirma o contrato desta providência.','registro');
 const m=d[META_PROVIDENCIA_CP140];e(Number.isSafeInteger(m.revisao)&&m.revisao>0&&m.coordenadora==='Cecília'&&m.aprovador==='Amanda'&&obj(m.origem)&&Array.isArray(m.origem.itens)&&m.origem.itens.length>0&&Array.isArray(d.historico),'Confira a versão e a origem desta providência.','registro');
 clienteProvidenciaCp140(m.origem.cliente);competenciaProvidenciaCp140(m.origem.competencia);texto(m.origem.chaveRecurso,160,false);m.origem.itens.forEach(i=>{idItem(i.itemId);assinatura(i.versao);});
 e(d.cliente===m.origem.cliente&&d.competencia===m.origem.competencia&&new Set(m.origem.itens.map(i=>i.itemId)).size===m.origem.itens.length,'A origem física desta providência está divergente.','registro');
 return d;
}
export function resumoProvidenciaCp140(d){
 validarRegistroProvidenciaCp140(d,d.id);const m=d[META_PROVIDENCIA_CP140];
 const estado=d.status==='aprovada'?'Confirmada e revisada':d.status==='cancelada'?(m.substituidaPorId?'Substituída':'Cancelada'):d.status==='concluida_aguardando_aprovacao'?'Aguardando revisão da Amanda':m.espera?'Aguardando retorno':'A providenciar';
 return {id:d.id,cliente:d.cliente,clienteNome:d.clienteNome,competencia:d.competencia,titulo:d.titulo,descricao:d.descricao,status:d.status,estado,coordenadora:'Cecília',responsavelReal:m.responsavelReal,decisor:m.decisor,criterio:m.criterio,tipoConfirmacao:m.tipoConfirmacao,prazoData:d.prazoData,prazoHora:d.prazoHora,prazoLabel:d.prazoData?(d.prazoData+(d.prazoHora?' às '+d.prazoHora:'')):'A combinar',origem:clone(m.origem),espera:clone(m.espera),revisao:m.revisao,atualizadoEm:d.atualizadoEm,substituidaPorId:m.substituidaPorId||''};
}
const autoria=a=>({uid:a.uid,papel:a.papel,atorReal:a.real});
const gestor=a=>['Chris','Amanda'].includes(a.papel);
const requisito=d=>{const m=d[META_PROVIDENCIA_CP140];return {origem:m.origem,acaoNecessaria:m.acaoNecessaria,responsavelReal:m.responsavelReal,decisor:m.decisor,criterio:m.criterio,tipoConfirmacao:m.tipoConfirmacao,sessaoId:m.sessaoId};};
export async function assinaturaRequisitoProvidenciaCp140(d){return hashProvidenciaCp140(requisito(d));}
export async function transicionarProvidenciaCp140({antes,id,acao,pedido,ator,fonte,em,substituta=null}){
 e(['Chris','Amanda','Cecília'].includes(ator?.papel)&&typeof ator.uid==='string'&&ator.uid&&typeof ator.real==='string','Este perfil não opera providências.','papel');
 e(typeof em==='string'&&Number.isFinite(Date.parse(em)),'Informe a data real da operação.');
 if(antes)validarRegistroProvidenciaCp140(antes,id);
 e(acao==='salvar'||antes,'A providência não foi encontrada.','registro');
 const a=autoria(ator),d=antes?clone(antes):null;let depois=d;
 if(acao==='salvar'){
  e(gestor(ator),'Chris e Amanda registram a preparação autorizada.','papel');const p=pedido.providencia;
  e(id===await idProvidenciaGravacaoCp140(p.cliente,p.competencia,p.chaveRecurso),'A identidade do recurso não confere.','cliente');
  e(fonte?.cliente===p.cliente&&fonte.competencia===p.competencia&&fonte.assinatura===pedido.assinaturaFonte,'A pauta mudou. Confira a mesma versão antes de registrar.','fonte');
  const itens=p.itemIds.map(itemId=>{const linhas=fonte.itens.filter(i=>i.itemId===itemId);e(linhas.length===1,'Um conteúdo não pertence mais a esta pauta.','fonte');const i=linhas[0];e(!p.empresaOtavio||i.empresaOtavio===p.empresaOtavio,'Os conteúdos são de outra empresa.','cliente');return {itemId:i.itemId,versao:i.versao,titulo:i.titulo,dia:i.dia,empresaOtavio:i.empresaOtavio};});
  const origem={cliente:p.cliente,competencia:p.competencia,chaveRecurso:p.chaveRecurso,empresaOtavio:p.empresaOtavio,itens};
  const meta={schema:1,revisao:(d?.[META_PROVIDENCIA_CP140].revisao||0)+1,coordenadora:'Cecília',aprovador:'Amanda',origem,acaoNecessaria:p.acaoNecessaria,responsavelReal:p.responsavelReal,decisor:p.decisor,criterio:p.criterio,tipoConfirmacao:p.tipoConfirmacao,sessaoId:p.sessaoId,autorizacaoChris:{declarada:true,por:a,em,assinaturaFonte:fonte.assinatura},espera:d?.[META_PROVIDENCIA_CP140].espera||null,confirmacao:null,revisaoAmanda:null,cancelamento:null,substituidaPorId:'',operacao:pedido.operacao};
  if(d){
   e(d.status==='pendente'&&!d.excluido,'Uma entrega, aprovação ou cancelamento não reabre automaticamente.','estado');
   const old=d[META_PROVIDENCIA_CP140];e(old.origem.cliente===p.cliente&&old.origem.competencia===p.competencia&&old.origem.chaveRecurso===p.chaveRecurso,'Não reetiquete a origem do recurso.','cliente');
   const remove=old.origem.itens.some(x=>!p.itemIds.includes(x.itemId));
   const mudouRequisito=canonicoProvidenciaCp140(requisito(d))!==canonicoProvidenciaCp140({origem,acaoNecessaria:p.acaoNecessaria,responsavelReal:p.responsavelReal,decisor:p.decisor,criterio:p.criterio,tipoConfirmacao:p.tipoConfirmacao,sessaoId:p.sessaoId});
   e(!(remove||mudouRequisito||d.prazoData!==p.prazoData||d.prazoHora!==p.prazoHora)||!!pedido.motivo,'Explique a mudança da providência; o atraso e a versão anterior serão preservados.','motivo');
  }
  depois={...(d||{id,status:'pendente',origem:ator.papel.toLowerCase(),criadoPor:ator.papel,autorRealCp140:ator.real,autorUidCp140:ator.uid,criadoEm:em,provaTexto:'',provaImagemUrl:'',linkAnexo:'',historico:[]}),tipoEspecial:TIPO_PROVIDENCIA_GRAVACAO_CP140,cliente:p.cliente,clienteNome:fonte.clienteNome,competencia:p.competencia,empresaOtavio:p.empresaOtavio,titulo:p.titulo,descricao:p.acaoNecessaria,destinatario:'Cecília',prazoData:p.prazoData,prazoHora:p.prazoHora,bloqueio:meta.espera?{pessoa:meta.espera.pessoa,texto:meta.espera.texto,desde:meta.espera.desde,por:meta.espera.por.papel}:null,[META_PROVIDENCIA_CP140]:meta};
 }else{
  const m=depois[META_PROVIDENCIA_CP140];
  if(acao==='esperar'){
   e(d.status==='pendente'&&!d.excluido,'A espera pertence à providência ainda pendente.','estado');
   m.espera=pedido.aguardandoPor?{pessoa:pedido.aguardandoPor,texto:pedido.motivo,previsaoData:pedido.previsaoData,desde:m.espera?.desde||em,atualizadaEm:em,por:a}:null;
   depois.bloqueio=m.espera?{pessoa:m.espera.pessoa,texto:m.espera.texto,desde:m.espera.desde,por:ator.papel}:null;
  }else if(acao==='confirmar'){
   e(d.status==='pendente'&&!d.excluido,'Confirme a mesma providência pendente.','estado');
   e(!m.espera,'Resolva a espera antes de confirmar o compromisso.','espera');
   m.confirmacao={criterioConfirmado:true,criterio:m.criterio,tipoConfirmacao:m.tipoConfirmacao,provaTexto:pedido.provaTexto,provaLink:pedido.provaLink,por:a,em,operacao:pedido.operacao,assinaturaRequisito:await assinaturaRequisitoProvidenciaCp140(d)};
   depois.status='concluida_aguardando_aprovacao';depois.provaTexto=pedido.provaTexto;depois.provaImagemUrl=pedido.provaLink;depois.concluidoPor=ator.papel;depois.concluidoEm=em;m.revisaoAmanda=null;
  }else if(acao==='revisar'){
   e(ator.papel==='Amanda','A revisão desta providência pertence à Amanda.','papel');
   e(d.status==='concluida_aguardando_aprovacao'&&!d.excluido&&m.confirmacao?.criterioConfirmado===true&&m.confirmacao.assinaturaRequisito===await assinaturaRequisitoProvidenciaCp140(d)&&m.confirmacao.provaTexto===d.provaTexto&&m.confirmacao.provaLink===d.provaImagemUrl,'Confira a entrega exata antes de revisar.','prova');
   m.revisaoAmanda={decisao:pedido.decisao,motivo:pedido.motivo,por:a,em,operacao:pedido.operacao,confirmacao:clone(m.confirmacao)};
   if(pedido.decisao==='aprovar'){depois.status='aprovada';depois.aprovadoPor='Amanda';depois.aprovadoEm=em;}
   else {depois.status='pendente';depois.rejeitadoMotivo=pedido.motivo;depois.provaTexto='';depois.provaImagemUrl='';depois.concluidoPor='';depois.concluidoEm='';depois.refazerUltimoI161={schema:1,operacao:pedido.operacao,motivo:pedido.motivo,por:'Amanda',atorReal:ator.real,uid:ator.uid,em,entregaAnterior:{texto:d.provaTexto||'',link:d.provaImagemUrl||'',concluidaEm:d.concluidoEm||null}};m.confirmacao=null;}
  }else if(acao==='cancelar'||acao==='substituir'){
   e(gestor(ator),'Chris e Amanda decidem o cancelamento ou a substituição.','papel');e(d.status!=='cancelada'&&!d.excluido,'Esta providência já foi cancelada.','estado');
   if(acao==='substituir'){validarRegistroProvidenciaCp140(substituta,pedido.substituidaPorId);e(substituta.cliente===d.cliente&&substituta.competencia===d.competencia&&!substituta.excluido&&substituta.status!=='cancelada','A substituta precisa existir no mesmo cliente e mês.','cliente');m.substituidaPorId=substituta.id;}
   m.cancelamento={motivo:pedido.motivo,por:a,em,statusAnterior:d.status,substituidaPorId:m.substituidaPorId||''};depois.status='cancelada';depois.excluido=true;depois.excluidoPor=ator.papel;depois.excluidoEm=em;depois.motivoExclusao=pedido.motivo;
  }else e(false,'Transição desconhecida.');
  m.revisao++;m.operacao=pedido.operacao;
 }
 const m=depois[META_PROVIDENCIA_CP140];
 depois.providenciaAtivaCp140=!depois.excluido&&['pendente','concluida_aguardando_aprovacao'].includes(depois.status);
 depois.providenciaEscopoCp140=depois.competencia+'__'+depois.cliente;
 e(depois.historico.length<250,'O histórico atingiu250operações; nenhum registro foi apagado.','limite');
 const retrato=x=>x?{status:x.status,prazoData:x.prazoData,prazoHora:x.prazoHora,meta:clone(x[META_PROVIDENCIA_CP140]),provaTexto:x.provaTexto,provaImagemUrl:x.provaImagemUrl}:null;
 depois.historico.push({acao:'providencia_gravacao_'+acao+'_cp140',por:ator.papel,atorReal:ator.real,uid:ator.uid,em,operacaoCp140:pedido.operacao,motivo:pedido.motivo||'',antes:retrato(antes),depois:retrato({...depois,historico:[]})});depois.atualizadoEm=em;
 e(new TextEncoder().encode(canonicoProvidenciaCp140(depois)).length<=750*1024,'A providência ultrapassa750KiB; nada foi truncado.','limite');
 validarRegistroProvidenciaCp140(depois,id);return depois;
}
