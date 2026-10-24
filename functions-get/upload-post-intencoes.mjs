import {jsonCanonicoI165} from './lib/gs-contexto-operacional-i165.mjs';
import {randomUUID} from 'node:crypto';
import {identidadeTokenI165,contextoTxI165} from './contexto.mjs';
import {exigirProgramacaoTxI165} from './guardas-programacao.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
import {validarPacoteUploadPostI166,identidadeUnidadeUploadPostI166,hashUploadPostI166,assinaturaFonteUploadPostI166,jsonCanonicoUploadPostI166} from './upload-post-pacote.mjs';

// No network transport or canonical post/calendar writes live here.
// claim/mark/result are INTERNAL SERVICE methods, never unvalidated onCall actions.
export const ESTADOS_UPLOAD_POST_I166=Object.freeze(['pendente','reservada','enviando','incerto','falha_antes_envio','aceito_a_conferir','agendamento_conferido','precisa_atencao','cancelada_confirmada']);
const enviarEstados=new Set(['pendente','reservada','falha_antes_envio']);
const consultarEstados=new Set(['enviando','incerto','aceito_a_conferir','agendamento_conferido']);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{1,180}$/u.test(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const fail=(codigo,mensagem)=>Object.assign(Error(mensagem),{code:'i166/'+codigo});
const exigir=(ok,c,m)=>{if(!ok)throw fail(c,m);};
const ms=agora=>{const n=new Date(agora).getTime();exigir(Number.isFinite(n),'relogio','Confira o relógio do serviço.');return n;};
const iso=agora=>new Date(ms(agora)).toISOString();
const utcIso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+00:00)$/u.test(x)&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const refs=(db,jobId)=>db.doc('upload_post_execucoes_i166/'+jobId);
const autoria=a=>({uid:a.uid,email:a.email,papel:a.papel,atorReal:a.real,sessao:a.sessao});
const atorDoJob=j=>({uid:j.autorizacaoAtual.uid,email:j.autorizacaoAtual.email,papel:j.autorizacaoAtual.papel,real:j.autorizacaoAtual.atorReal,sessao:j.autorizacaoAtual.sessao});
const publico=j=>({id:j.id,postagemId:j.postagemId,rede:j.rede,ocorrenciaId:j.ocorrenciaId,estado:j.estado,assinatura:j.assinatura,ids:j.ids,job_id:j.provedor?.job_id||null,lease:j.lease?{modo:j.lease.modo,ate:j.lease.ate}:null,nextAttempt:j.nextAttempt,ultimaLeitura:j.ultimaLeitura||null,impedimentos:j.impedimentos||[],erro:j.erro||null,agendamentoExternoConferido:j.estado==='agendamento_conferido',agendamentoConfirmado:j.canonico?.estado==='confirmado',canonico:j.canonico||null,publicadoConfirmado:false});
async function concluidaTx(db,tx,ator,dados,agora){
 await contextoTxI165(db,tx,ator,'programacao');const f=await fontesPostagemTxI165(db,tx,dados.postagemId,agora),jid=f.post.uploadPostI166?.jobId;if(!jid)return null;
 const s=await tx.get(refs(db,jid)),j=s.data();exigir(s.exists&&j.canonico?.estado==='confirmado'&&j.postagemId===f.post.id&&j.rede===dados.rede&&j.ocorrenciaId===dados.ocorrenciaId,'commit','A ligação da execução precisa de conferência.');
 exigir(f.post.status==='agendado'&&f.post.dataAgendada===j.pacote.agenda.data&&f.post.horaAgendada===j.pacote.agenda.hora&&dados.agenda?.data===j.pedido.agenda.data&&dados.agenda?.hora===j.pedido.agenda.hora&&dados.agenda?.timeZone===j.pedido.agenda.timeZone&&utcIso(dados.agenda?.scheduled_date)===utcIso(j.pedido.agenda.scheduled_date),'agenda-ja-registrada','Esta ocorrência já foi agendada; outra data exige um fluxo explícito de remarcação. Nenhum reenvio foi liberado.');
 return {jobId:j.id,job:publico(j),assinaturaFonte:j.assinaturaFonte,assinaturaPacote:j.assinatura,normalizado:j.pacote,impedimentos:[]};
}
function validarDados(d){exigir(d&&id(d.postagemId)&&id(d.operacaoId)&&d.rede==='instagram'&&id(d.ocorrenciaId)&&d.agenda,'entrada','Confira a peça, a ocorrência e esta mesma tentativa.');}
function papel(ator){exigir(['Amanda','Cecília','Chris'].includes(ator.papel),'papel','Abra esta programação pelo perfil responsável.');}
async function conferirTx(db,tx,ator,dados,lerDependenciasTx,agora){
 exigir(typeof lerDependenciasTx==='function','dependencias','O servidor precisa conferir as fontes do pacote.');
 await contextoTxI165(db,tx,ator,'programacao');
 const inicial=await fontesPostagemTxI165(db,tx,dados.postagemId,agora),redeProgramacao=inicial.post.publicacaoStokki?.versao===1?'instagram':'geral';
 const g=await exigirProgramacaoTxI165(db,tx,ator,{postagemId:dados.postagemId,tipo:'agendar',data:dados.agenda?.data,hora:dados.agenda?.hora,rede:redeProgramacao},agora);
 const fontes={...g.fontes,conferidaPeloServidor:true,excecaoConferida:g.resultado.excecaoAplicada===true};
 // This injected reader must read trusted docs through tx, not accept body data as approval.
 const dep=await lerDependenciasTx({db,tx,fontes,ator,dados,agora});
 const r=validarPacoteUploadPostI166({...dep,fontes,agenda:dados.agenda,rede:dados.rede,agora});
 exigir(dep?.ocorrencia?.id===dados.ocorrenciaId,'ocorrencia','A ocorrência mudou; confira o mesmo conteúdo.');
 return {...r,fontes,assinaturaFonte:assinaturaFonteUploadPostI166(fontes)};
}
export async function prepararIntencaoUploadPostI166(db,auth,dados,{lerDependenciasTx,agora=new Date()}={}){
 validarDados(dados);const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'upload_post');papel(ator);
 return db.runTransaction(async tx=>{const concluida=await concluidaTx(db,tx,ator,dados,agora);if(concluida)return {...concluida,elegivel:false,jaAgendada:true,somenteLeitura:true};const r=await conferirTx(db,tx,ator,dados,lerDependenciasTx,agora);return {elegivel:r.elegivel,impedimentos:r.impedimentos,assinaturaFonte:r.assinaturaFonte,assinaturaPacote:r.assinatura,jobId:r.elegivel?identidadeUnidadeUploadPostI166({postagemId:dados.postagemId,rede:dados.rede,instagram_account_id:r.normalizado.conta.instagram_account_id,ocorrenciaId:dados.ocorrenciaId}):null,normalizado:r.normalizado,somenteLeitura:true};});
}
export async function criarIntencaoUploadPostI166(db,auth,dados,{lerDependenciasTx,agora=new Date()}={}){
 validarDados(dados);exigir(hash(dados.assinaturaFonteEsperada)&&hash(dados.assinaturaPacoteEsperada),'versao','Confira o pacote atual antes de agendar.');
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'upload_post');papel(ator);const em=iso(agora);
 return db.runTransaction(async tx=>{
  const concluida=await concluidaTx(db,tx,ator,dados,agora);if(concluida){exigir(concluida.assinaturaFonte===dados.assinaturaFonteEsperada&&concluida.assinaturaPacote===dados.assinaturaPacoteEsperada,'pacote-mudou','Confira a execução concluída da mesma peça.');return {estado:'existente',job:concluida.job,nenhumNovoEnvio:true,jaAgendada:true};}
  const r=await conferirTx(db,tx,ator,dados,lerDependenciasTx,agora);exigir(r.elegivel,'pacote-bloqueado',r.impedimentos.map(x=>x.mensagem).join(' '));
  exigir(r.assinaturaFonte===dados.assinaturaFonteEsperada&&r.assinatura===dados.assinaturaPacoteEsperada,'pacote-mudou','A peça ou o pacote mudou. Nada foi enviado; confira a versão atual.');
  const jobId=identidadeUnidadeUploadPostI166({postagemId:dados.postagemId,rede:dados.rede,instagram_account_id:r.normalizado.conta.instagram_account_id,ocorrenciaId:dados.ocorrenciaId}),ref=refs(db,jobId),trava=db.doc('upload_post_ocorrencias_i166/'+hashUploadPostI166([dados.postagemId,dados.rede,dados.ocorrenciaId])),ar=ref.collection('intencoes').doc(hashUploadPostI166([ator.uid,ator.papel,ator.real,dados.operacaoId]));
  const [s,lock,audit]=await Promise.all([tx.get(ref),tx.get(trava),tx.get(ar)]),j=s.data();
  exigir(!lock.exists||lock.data().jobId===jobId,'destino-mudou','Esta ocorrência já possui uma execução em outra conta. Confira a anterior antes de substituir.');
  exigir(!j||j.assinatura===r.assinatura,'pacote-mudou','Esta publicação já tem uma intenção com outro pacote. Confira a execução existente.');
  exigir(!audit.exists||audit.data().assinatura===r.assinatura,'operacao-reutilizada','A tentativa anterior pertence a outro preenchimento.');
  if(j){if(!audit.exists){tx.set(ar,{schema:1,operacaoId:dados.operacaoId,jobId,assinatura:r.assinatura,autoria:autoria(ator),em});tx.update(ref,{autorizacaoAtual:autoria(ator)});}return {estado:'existente',job:publico(j),nenhumNovoEnvio:true};}
  const ids={request_id:'get_i166_'+jobId,external_id:'get_i166_'+jobId,idempotency_key:'get_i166_'+jobId},job={schema:1,id:jobId,postagemId:dados.postagemId,videoId:r.normalizado.videoId,rede:dados.rede,ocorrenciaId:dados.ocorrenciaId,estado:'pendente',assinatura:r.assinatura,assinaturaFonte:r.assinaturaFonte,pacote:r.normalizado,assinaturaPostAnterior:jsonCanonicoI165(r.fontes.post),ids,pedido:{postagemId:dados.postagemId,rede:dados.rede,ocorrenciaId:dados.ocorrenciaId,operacaoId:dados.operacaoId,agenda:structuredClone(dados.agenda)},autoriaInicial:autoria(ator),autorizacaoAtual:autoria(ator),criadaEm:em,revisao:1,lease:null,nextAttempt:em,tentativasPost:0,provedor:null,impedimentos:[]};
  tx.set(trava,{schema:1,jobId,postagemId:dados.postagemId,rede:dados.rede,ocorrenciaId:dados.ocorrenciaId,contaNativa:r.normalizado.conta.instagram_account_id,criadaEm:em});tx.set(ref,job);tx.set(ar,{schema:1,operacaoId:dados.operacaoId,jobId,assinatura:r.assinatura,autoria:autoria(ator),em});return {estado:'novo',job:publico(job),nenhumEnvioExterno:true};
 });
}
function claimVigente(j,claim,agora){exigir(claim&&j.lease?.token===claim.token&&j.lease.workerId===claim.workerId&&j.lease.revisao===claim.revisao&&Date.parse(j.lease.ate)>ms(agora),'lease','A posse desta tentativa mudou ou venceu. Confira a execução atual.');}
async function revalidarEnvioTx(db,tx,j,lerDependenciasTx,agora){
 const r=await conferirTx(db,tx,atorDoJob(j),j.pedido,lerDependenciasTx,agora);exigir(r.elegivel,'pacote-bloqueado',r.impedimentos.map(x=>x.mensagem).join(' '));exigir(r.assinatura===j.assinatura,'pacote-mudou','O pacote mudou antes do envio. A intenção anterior foi preservada.');return r;
}
export async function claimExecucaoUploadPostI166(db,jobId,{workerId,leaseMs=60000,lerDependenciasTx,agora=new Date(),novoToken=()=>randomUUID()}={}){
 exigir(hash(jobId)&&id(workerId)&&Number.isSafeInteger(leaseMs)&&leaseMs>=1000&&leaseMs<=120000,'claim','Confira o executor e a duração da posse.');
 return db.runTransaction(async tx=>{
  const ref=refs(db,jobId),s=await tx.get(ref);exigir(s.exists,'job','A execução não foi encontrada.');const j=s.data();
  if(j.lease&&Date.parse(j.lease.ate)>ms(agora))return {adquirida:false,motivo:'ocupada',job:publico(j)};
  if(Date.parse(j.nextAttempt)>ms(agora))return {adquirida:false,motivo:'aguardar',job:publico(j)};
  const modo=enviarEstados.has(j.estado)?'enviar':consultarEstados.has(j.estado)?'consultar':null;if(!modo)return {adquirida:false,motivo:'estado_sem_execucao',job:publico(j)};
  if(modo==='enviar')await revalidarEnvioTx(db,tx,j,lerDependenciasTx,agora);
  const token=novoToken();exigir(id(token),'claim','A posse precisa de um identificador válido.');const lease={token,workerId,modo,revisao:j.revisao+1,ate:new Date(ms(agora)+leaseMs).toISOString()},estado=modo==='enviar'?'reservada':j.estado;
  tx.update(ref,{estado,revisao:lease.revisao,lease});return {adquirida:true,modo,permitirPost:modo==='enviar',claim:lease,job:{...publico(j),estado},pacote:structuredClone(j.pacote),ids:structuredClone(j.ids),provedor:structuredClone(j.provedor)};
 });
}
export async function marcarEnvioUploadPostI166(db,jobId,claim,{fingerprint,ids,lerDependenciasTx,agora=new Date()}={}){
 exigir(hash(jobId)&&hash(fingerprint),'envio','Confira a assinatura exata do envio.');
 return db.runTransaction(async tx=>{const ref=refs(db,jobId),s=await tx.get(ref);exigir(s.exists,'job','A execução não foi encontrada.');const j=s.data();claimVigente(j,claim,agora);exigir(j.estado==='reservada'&&j.lease.modo==='enviar','nao-reenviar','Esta execução só permite conferência, sem outro envio.');exigir(jsonCanonicoUploadPostI166(ids)===jsonCanonicoUploadPostI166(j.ids),'ids','A correlação do envio mudou.');await revalidarEnvioTx(db,tx,j,lerDependenciasTx,agora);tx.update(ref,{estado:'enviando',fingerprintProvedor:fingerprint,envioIniciadoEm:iso(agora),tentativasPost:j.tentativasPost+1});return {estado:'enviando',jobId,claim:structuredClone(j.lease),ids:structuredClone(j.ids),fingerprint,postPermitidoUmaVez:true};});
}
export async function registrarResultadoUploadPostI166(db,jobId,claim,resultado,{agora=new Date(),aguardarMs=30000}={}){
 exigir(hash(jobId)&&resultado&&typeof resultado==='object'&&Number.isSafeInteger(aguardarMs)&&aguardarMs>=1000&&aguardarMs<=86400000,'resultado','Confira o resultado específico desta execução.');
 return db.runTransaction(async tx=>{
  const ref=refs(db,jobId),s=await tx.get(ref);exigir(s.exists,'job','A execução não foi encontrada.');const j=s.data();claimVigente(j,claim,agora);const consulta=j.lease.modo==='consultar';
  const antesDoEnvio=!consulta&&j.lease.modo==='enviar'&&['reservada','enviando'].includes(j.estado)&&resultado.resultado==='nao_enviado'&&resultado.antesDePost===true&&typeof resultado.codigo==='string'&&resultado.codigo.length>0;
  exigir(consulta||j.estado==='enviando'||antesDoEnvio,'resultado-estado','O envio ainda não foi registrado.');
  let estado,provedor=j.provedor||null,erro=null;
  if(resultado.estado==='aceito_a_conferir'){
   exigir(!consulta&&jsonCanonicoUploadPostI166(resultado.ids)===jsonCanonicoUploadPostI166(j.ids)&&resultado.fingerprint===j.fingerprintProvedor,'retorno-identidade','O aceite pertence a outro envio.');
   exigir(resultado.job_id===null||id(resultado.job_id),'job-fornecedor','Confira o identificador devolvido pelo fornecedor.');
   estado=resultado.job_id?'aceito_a_conferir':'incerto';provedor={job_id:resultado.job_id,request_id_fornecedor:typeof resultado.request_id_fornecedor==='string'?resultado.request_id_fornecedor:null,esperado_job:resultado.esperado_job||null,http_status:resultado.http_status||null};
  }else if(resultado.estado==='correlacao_recuperada'){
   exigir(consulta&&id(resultado.job_id)&&(!provedor?.job_id||provedor.job_id===resultado.job_id)&&resultado.request_id===j.ids.request_id&&resultado.external_id===j.ids.external_id&&resultado.profile_username===j.pacote.conta.profile_username,'retorno-identidade','A execução recuperada não corresponde aos identificadores e à conta desta intenção.');
   exigir(utcIso(resultado.scheduled_date)===j.pacote.payload.scheduled_date&&Array.isArray(resultado.platforms)&&resultado.platforms.length===1&&resultado.platforms[0]==='instagram','retorno-identidade','A data ou a plataforma da execução recuperada diverge desta intenção.');
   estado='aceito_a_conferir';provedor={...provedor,job_id:resultado.job_id,request_id_fornecedor:resultado.request_id,correlacaoRecuperadaEm:iso(agora)};
  }else if(resultado.agendamento_conferido===true){
   exigir(consulta&&provedor?.job_id&&resultado.job_id===provedor.job_id&&resultado.external_id===j.ids.external_id&&resultado.profile_username===j.pacote.conta.profile_username&&utcIso(resultado.scheduled_date)===j.pacote.payload.scheduled_date&&Array.isArray(resultado.platforms)&&resultado.platforms.length===1&&resultado.platforms[0]==='instagram','retorno-identidade','O agendamento conferido não corresponde a esta publicação.');
   estado='agendamento_conferido';provedor={...provedor,agendamentoConferidoEm:iso(agora),conferencia:{job_id:resultado.job_id,external_id:resultado.external_id,profile_username:resultado.profile_username,scheduled_date:utcIso(resultado.scheduled_date),platforms:[...resultado.platforms]}};
  }else if(antesDoEnvio){
   if(j.estado==='enviando')exigir(resultado.fingerprint===j.fingerprintProvedor&&jsonCanonicoUploadPostI166(resultado.ids)===jsonCanonicoUploadPostI166(j.ids),'retorno-identidade','A falha anterior ao transporte pertence a outro envio.');
   estado='falha_antes_envio';erro={codigo:String(resultado.codigo).slice(0,120),mensagem:'O envio não foi iniciado. Confira a pendência antes de tentar novamente.'};
  }else{
   // Unknown errors, timeouts, missing job/detail and refused-after-POST are NOT permission to POST again.
   if(!consulta)exigir(resultado.fingerprint===j.fingerprintProvedor&&jsonCanonicoUploadPostI166(resultado.ids)===jsonCanonicoUploadPostI166(j.ids),'retorno-identidade','O resultado pertence a outro envio.');
   exigir(consulta||['incerto','recusado','leitura_falhou','nao_enviado'].includes(resultado.resultado),'resultado','O resultado ainda precisa de uma classificação explícita.');
   estado=j.estado==='agendamento_conferido'?'agendamento_conferido':'incerto';erro={codigo:String(resultado.codigo||'CONFERENCIA_PENDENTE').slice(0,120),mensagem:'Confirmando a execução anterior. Nenhum novo envio foi liberado.'};
  }
  const impedimentos=antesDoEnvio?[{codigo:erro.codigo,responsavel:'Amanda',campo:'envio',mensagem:erro.mensagem}]:[];
  const patch={estado,provedor,erro,impedimentos,lease:null,ultimaLeitura:iso(agora),nextAttempt:new Date(ms(agora)+aguardarMs).toISOString()};tx.update(ref,patch);return {job:publico({...j,...patch}),naoAlterouPostagem:true,naoConfirmaPublicacao:true};
 });
}
export async function consultarIntencaoUploadPostI166(db,auth,jobId,{agora=new Date(),papelOperado=null,sessao='consulta_upload_post'}={}){
 exigir(hash(jobId),'job','Confira a execução.');const ator=identidadeTokenI165(auth,papelOperado,sessao);papel(ator);
 return db.runTransaction(async tx=>{await contextoTxI165(db,tx,ator,'programacao');const s=await tx.get(refs(db,jobId));exigir(s.exists,'job','A execução não foi encontrada.');await fontesPostagemTxI165(db,tx,s.data().postagemId,agora,{conferirDiretriz:false});return {job:publico(s.data()),somenteLeitura:true};});
}
