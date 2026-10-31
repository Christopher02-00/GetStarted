import {createHash} from 'node:crypto';
import {transmitirI165,versaoReservaI165,falhaCanalI165,codigoCanalSeguroCp146} from './transmissoes.mjs';
const ESCOPO='teste_dispositivo_i165',COOLDOWN=10*60000;
const op=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{12,100}$/.test(x);
const sha=x=>createHash('sha256').update(x).digest('hex');
const motivoPublico=x=>{const codigo=codigoCanalSeguroCp146(x);return codigo?{motivoCodigo:codigo,renovarRegistro:['token_nao_registrado','token_invalido'].includes(codigo)}:{}};
const estados=new Set(['reservado','em_andamento','aceito_pelo_provedor','resultado_desconhecido','recusado']);
export function statusTesteProprioI165(x){return x&&op(x.operacaoId)&&estados.has(x.estado)?{operacaoId:x.operacaoId,estado:x.estado,aceiteProvedor:x.estado==='aceito_pelo_provedor',iniciadaEm:x.iniciadaEm,proximoTesteEm:x.proximoTesteEm,recebimentoNoAparelho:'nao_conferido',reenvioAutomatico:false,...motivoPublico(x)}:null;}
export async function estadoContaDispositivoTxI165(db,tx,ator,agora){
 if(ator.real!==ator.papel)return {perfilProprio:false,testeServidorDisponivel:false,conferenciaCompleta:true,escopo:'conta_google_atual',contaComAparelhoAtivo:false,esteNavegadorConferido:false,ultimoTeste:null,conferidoEm:agora.toISOString()};
 const pr=db.doc('notificacoes_dispositivos_i165/'+ator.uid),p=await tx.get(pr);
 const ts=await tx.get(pr.collection('tokens').where('ativo','==',true).limit(2));
 const proprio=p.exists&&p.data().uid===ator.uid&&p.data().pessoa===ator.real&&p.data().ativo===true;
 const valido=proprio&&ts.docs.some(s=>{const t=s.data();return t.uid===ator.uid&&t.pessoa===ator.real&&t.ativo===true&&typeof t.token==='string'&&t.token.length>20&&s.id===sha(t.token);});
 return {perfilProprio:true,testeServidorDisponivel:true,conferenciaCompleta:valido||ts.docs.length<2,escopo:'conta_google_atual',contaComAparelhoAtivo:valido,esteNavegadorConferido:false,ultimoTeste:proprio?statusTesteProprioI165(p.data().ultimoTesteI165):null,conferidoEm:agora.toISOString()};
}
export async function testarDispositivoProprioI165(db,ator,dados,{agora=new Date(),deps}={}){
 const {exigir,validarCadastro,configAtiva,enviarTeste,conferirUsuario,clock=()=>new Date()}=deps;
 exigir(ator.real===ator.papel,'dispositivo-delegado','Entre com o Google da própria pessoa para testar este aparelho.');
 exigir(op(dados.operacaoId),'dispositivo-teste-id','Confira a mesma tentativa de teste.');
 exigir(typeof dados.token==='string'&&dados.token.length>20&&dados.token.length<5000&&dados.token.trim().length>20,'dispositivo-token','O navegador não confirmou um token válido.');
 const hash=sha(dados.token),pr=db.doc('notificacoes_dispositivos_i165/'+ator.uid),tr=pr.collection('tokens').doc(hash),rr=pr.collection('testes_i165').doc(dados.operacaoId),cfgRef=db.doc('programacao_config_i165/ativo'),cadRef=db.doc('usuarios_equipe/'+ator.email);
 const contrato={schema:1,escopo:ESCOPO,id:dados.operacaoId,fonte:{colecao:'notificacoes_dispositivos_i165',id:ator.uid},chaveObrigacao:sha(ator.uid+':'+dados.operacaoId),versao:1,destinatario:ator.real,estado:'pendente',uid:ator.uid,tokenHash:hash};
 const igual=r=>r?.schema===1&&r.escopo===ESCOPO&&r.id===contrato.id&&r.uid===ator.uid&&r.destinatario===ator.real&&r.tokenHash===hash&&r.chaveObrigacao===contrato.chaveObrigacao&&r.estado==='pendente';
 const validar=(cfg,cad,p,t)=>{validarCadastro(ator,cad);exigir(configAtiva(cfg)&&cfg.habilidades?.push===true,'inativo','Os avisos de aparelho estão pausados. A fila continua no sistema.');exigir(p?.uid===ator.uid&&p.pessoa===ator.real&&p.ativo===true&&t?.uid===ator.uid&&t.pessoa===ator.real&&t.ativo===true&&t.token===dados.token,'dispositivo-nao-registrado','Ative primeiro este aparelho no seu próprio perfil.');};
 const reserva=await db.runTransaction(async tx=>{
  const [cs,ds,ps,ts,rs]=await Promise.all([tx.get(cfgRef),tx.get(cadRef),tx.get(pr),tx.get(tr),tx.get(rr)]);
  validar(cs.data(),ds.data(),ps.data(),ts.data());
  const anterior=rs.data(),ultimo=ps.data().ultimoTesteI165;
  if(rs.exists){exigir(igual(anterior),'dispositivo-teste-versao','Esta tentativa pertence a outro aparelho. Confira a tentativa anterior.');return anterior;}
  exigir(!ultimo||ultimo.operacaoId===dados.operacaoId||!['reservado','em_andamento','resultado_desconhecido'].includes(ultimo.estado),'dispositivo-teste-incerto','O teste anterior ainda não tem confirmação. Confira a mesma tentativa; nenhum reenvio foi feito.');
  exigir(!ultimo||ultimo.operacaoId===dados.operacaoId||Date.parse(ultimo.proximoTesteEm)<=agora.getTime(),'dispositivo-teste-intervalo','Aguarde dez minutos entre testes deste perfil.');
  const criado={...contrato,ativacaoId:cs.data().ativacaoId,iniciadaEm:agora.toISOString(),proximoTesteEm:new Date(agora.getTime()+COOLDOWN).toISOString(),resultado:'reservado'};
  tx.create(rr,criado);tx.update(pr,{ultimoTesteI165:{operacaoId:criado.id,estado:'reservado',iniciadaEm:criado.iniciadaEm,proximoTesteEm:criado.proximoTesteEm}});return criado;
 });
 const resposta=(estado,recuperado=false,motivo=null)=>({schema:1,testeDispositivo:true,operacaoId:dados.operacaoId,estado,aceiteProvedor:estado==='aceito_pelo_provedor',recebimentoNoAparelho:'nao_conferido',reenvioAutomatico:false,recuperado,proximoTesteEm:reserva.proximoTesteEm,...motivoPublico(motivo||reserva)});
 if(['aceito_pelo_provedor','recusado'].includes(reserva.resultado))return resposta(reserva.resultado,true);
 // A reserva técnica é separada dos conteúdos. O mesmo motor grava recibo antes do único envio.
 if(reserva.transmissaoI165){const s=await db.doc('transmissoes_i165/'+reserva.transmissaoI165).get();if(s.data()?.estado==='recusada'){await concluir('recusado',s.data());return resposta('recusado',true,s.data());}}
 try{
  const r=await transmitirI165(db,{chave:ESCOPO+':'+ator.uid+':'+dados.operacaoId,canal:'push',destinatario:ator.real,carga:{tipo:ESCOPO,operacaoId:dados.operacaoId,uid:ator.uid,tokenHash:hash,ativacaoId:reserva.ativacaoId},reservas:[{ref:rr,campo:'transmissaoI165',versao:versaoReservaI165(reserva)}]},async()=>{
   await db.runTransaction(async tx=>{const [cs,ds,ps,ts,rs]=await Promise.all([tx.get(cfgRef),tx.get(cadRef),tx.get(pr),tx.get(tr),tx.get(rr)]);validar(cs.data(),ds.data(),ps.data(),ts.data());exigir(cs.data().ativacaoId===reserva.ativacaoId&&igual(rs.data()),'dispositivo-teste-versao','A configuração ou a tentativa mudou. Confira o aparelho novamente.');}).catch(()=>{throw falhaCanalI165('O aparelho ou a configuração mudou antes do envio.','antes_envio');});
   await conferirUsuario(ator).catch(()=>{throw falhaCanalI165('O Google da própria pessoa não foi confirmado antes do envio.','antes_envio');});
   return enviarTeste(dados.token,dados.operacaoId);
  },{clock});
  await concluir('aceito_pelo_provedor');return resposta('aceito_pelo_provedor',r.recuperada===true);
 }catch(e){const estado=e.classificacaoCanalI165==='ocupada'?'em_andamento':['antes_envio','recusada'].includes(e.classificacaoCanalI165)?'recusado':'resultado_desconhecido';await concluir(estado,e);return resposta(estado,false,e);}
 async function concluir(estado,motivo=null){const extra=motivoPublico(motivo);await db.runTransaction(async tx=>{const [r,p]=await Promise.all([tx.get(rr),tx.get(pr)]);exigir(r.exists&&igual(r.data()),'dispositivo-teste-versao','A tentativa de teste mudou.');tx.update(rr,{resultado:estado,...extra,conferidoEm:clock().toISOString()});if(p.data()?.ultimoTesteI165?.operacaoId===dados.operacaoId)tx.update(pr,{ultimoTesteI165:{operacaoId:dados.operacaoId,estado,...extra,iniciadaEm:reserva.iniciadaEm,proximoTesteEm:reserva.proximoTesteEm}});});}
}
