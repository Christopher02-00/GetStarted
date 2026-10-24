import {falhaCanalI165,transmitirI165,versaoReservaI165,pertenceReciboI165} from './transmissoes.mjs';
import {ESCOPO_I165,configuracaoI165} from './contexto.mjs';
import {fontePendenteI165,momentoAvisoI165} from './acompanhamento.mjs';
export function linkNotaI165(id){const u=new URL('https://get-started.agency/escritorio.html');u.searchParams.set('avisoI165',id);return u.href;}
async function estadoCanalTx(db,ref,base,canal,estado){return db.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists||versaoReservaI165(s.data())!==versaoReservaI165(base))return false;tx.update(ref,{['canais.'+canal]:estado});return true;});}
export async function despacharNotaI165(db,id,{agora=new Date(),enviarPush,enviarEmail}={}){
 const cfg=await configuracaoI165(db);if(!cfg)return {ativa:false};const ref=db.doc('notificacoes_operacionais_i165/'+id),s=await ref.get(),n=s.data();
 if(!n||n.escopo!==ESCOPO_I165||n.estado!=='pendente')return {foraDoEscopo:true};
 const fonte=await fontePendenteI165(db,n,{agora});if(fonte.pausada||fonte.bloqueada)return {pausada:true};if(!fonte.pendente){await ref.update({estado:'resolvida',resolvidaEm:agora.toISOString(),motivoResolucao:'A fonte foi revalidada e avançou.'});return {resolvida:true};}
 if(!momentoAvisoI165(n,agora))return {aguardandoPrazo:true};
 const resultados=[];
 for(const canal of ['push','email']){
  const enviar=canal==='push'?enviarPush:enviarEmail;if(cfg.habilidades?.[canal]!==true||!enviar)continue;
  const cs=n.canais?.[canal];
  const tentativa=n[canal+'TentativaI165']||cs?.tentativaId;
  if(tentativa){const tr=await db.doc('transmissoes_i165/'+tentativa).get(),t=tr.data();if(t?.estado==='aceita_pelo_provedor'&&pertenceReciboI165(t,s,canal,n.destinatario,canal+'TentativaI165')){await estadoCanalTx(db,ref,n,canal,{estado:'aceita_pelo_provedor',aceitaEm:t.aceitaEm,recibo:t.recibo||'',tentativaId:tentativa,recuperada:true});resultados.push({canal,aceita:true,recuperada:true});continue;}}
  if(cs?.estado==='aceita_pelo_provedor'){resultados.push({canal,aceita:true,estado:cs.estado,jaRegistrada:true});continue;}
  if(cs?.estado==='resultado_desconhecido'){resultados.push({canal,aceita:false,estado:cs.estado,desconhecido:true,pendenteConferencia:true});continue;}
  if(cs?.proximaTentativa>agora.toISOString()){resultados.push({canal,aceita:false,estado:cs.estado||'falha',aguardandoNovaTentativa:true});continue;}
  const carga={id:n.id,titulo:n.titulo,texto:n.texto,destinatario:n.destinatario,link:linkNotaI165(n.id),nivel:n.urgencia==='urgente'?'atrasado':'normal'};
  try{
   const r=await transmitirI165(db,{chave:ESCOPO_I165+'|'+n.id+'|'+n.versao,canal,destinatario:n.destinatario,carga,reservas:[{ref,campo:canal+'TentativaI165',versao:versaoReservaI165(n)}]},async()=>{
    const atual=await fontePendenteI165(db,n,{agora:new Date()});if(!atual.pendente||atual.pausada||atual.bloqueada||atual.prazoAtual!==(n.prazo||'')||atual.urgenciaAtual!==(n.urgencia||'normal'))throw falhaCanalI165('A fonte ou o prazo mudou antes do envio. O aviso precisa ser reconciliado.','antes_envio');
    return enviar({...carga,canal,fonte:n.fonte});
   });
   const mesmaVersao=await estadoCanalTx(db,ref,n,canal,{estado:'aceita_pelo_provedor',aceitaEm:agora.toISOString(),recibo:r.recibo||'',tentativaId:r.tentativaId});resultados.push({canal,aceita:true,mesmaVersao});
  }catch(e){const desconhecido=!['antes_envio','recusada','ocupada'].includes(e.classificacaoCanalI165);await estadoCanalTx(db,ref,n,canal,{estado:desconhecido?'resultado_desconhecido':e.classificacaoCanalI165==='ocupada'?'em_andamento':'falha',erro:String(e.message).slice(0,500),tentativaId:e.tentativaId||'',proximaTentativa:desconhecido?'':new Date(agora.getTime()+3600000).toISOString()});resultados.push({canal,aceita:false,desconhecido,estado:desconhecido?'resultado_desconhecido':e.classificacaoCanalI165==='ocupada'?'em_andamento':'falha',classificacao:e.classificacaoCanalI165||'desconhecido'});}
 }
 return {resultados};
}
export function criarPushI165(db,{messaging,auth}){
 return async n=>{
  let chamouProvedor=false;try{
  const [cadastros,aparelhos]=await Promise.all([db.collection('usuarios_equipe').where('pessoa','==',n.destinatario).get(),db.collection('notificacoes_dispositivos_i165').where('pessoa','==',n.destinatario).get()]);
  const ativos=cadastros.docs.filter(d=>d.data().ativo===true&&d.data().excluido!==true);let dispositivos=[];
  for(const pessoa of aparelhos.docs){if(pessoa.data().ativo!==true)continue;const u=await auth.getUser(pessoa.id).catch(()=>null);if(!u||u.disabled||!u.emailVerified||!ativos.some(d=>String(d.data().email||d.id).toLowerCase()===String(u.email||'').toLowerCase()&&(!d.data().uid||d.data().uid===u.uid)))continue;
   const ts=await pessoa.ref.collection('tokens').get();dispositivos.push(...ts.docs.filter(d=>d.data().ativo===true&&d.data().uid===u.uid&&typeof d.data().token==='string'&&d.data().token));
  }
  if(!dispositivos.length)throw falhaCanalI165('Não há aparelho ativo confirmado; a ação continua no sistema.','antes_envio');
  chamouProvedor=true;const r=await messaging.sendEachForMulticast({tokens:[...new Set(dispositivos.map(d=>d.data().token))].slice(0,100),data:{id:n.id,titulo:'Get · '+n.titulo,texto:'Tem uma ação de conteúdo esperando por você no sistema.',link:n.link},webpush:{headers:{TTL:'1800',Urgency:n.nivel==='atrasado'?'high':'normal'}}});
  if(!r.successCount)throw falhaCanalI165('O serviço de push não confirmou aceite.','recusada');
  return {aceita:true,recibo:r.responses.filter(x=>x.success).map(x=>x.messageId).join(','),aviso:r.failureCount?'Há aparelhos sem aceite.':''};
  }catch(e){if(!chamouProvedor&&!e.classificacaoCanalI165)throw falhaCanalI165(e.message,'antes_envio');throw e;}
 };
}
export function criarEmailI165(db,{serviceId,templateId,publicKey,privateKey,fetchImpl=fetch}){
 return async n=>{
  let chamouProvedor=false;try{
  if(!serviceId||!templateId||!publicKey||!privateKey)throw falhaCanalI165('O canal de e-mail independente não está configurado.','antes_envio');
  const cad=await db.collection('usuarios_equipe').where('pessoa','==',n.destinatario).get(),ativos=cad.docs.filter(d=>d.data().ativo===true&&d.data().excluido!==true);
  if(ativos.length!==1)throw falhaCanalI165('O destinatário de e-mail precisa de conferência.','antes_envio');
  const email=String(ativos[0].data().email||ativos[0].id);if(!email.includes('@'))throw falhaCanalI165('O e-mail ativo não foi confirmado.','antes_envio');
  // Own interval and own notes only. No read or mutation of fila_emails, finance or the legacy digest.
  const ir=db.doc('servicos_i165/intervalo_email'),espera=await db.runTransaction(async tx=>{const s=await tx.get(ir),agora=Date.now(),inicio=Math.max(agora,s.data()?.proximoMs||0);if(inicio-agora>5000)throw falhaCanalI165('O canal aguarda uma fila externa; tente depois.','antes_envio');tx.set(ir,{proximoMs:inicio+1100});return inicio-agora;});
  if(espera>0)await new Promise(r=>setTimeout(r,espera));
  chamouProvedor=true;const r=await fetchImpl('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:serviceId,template_id:templateId,user_id:publicKey,accessToken:privateKey,template_params:{to_email:email,to_name:n.destinatario,titulo:n.titulo,conteudo:n.texto,link:n.link,tipo_aviso:'operacional_i165'}}),signal:AbortSignal.timeout(8000)});
  if(r.status===200)return {aceita:true,recibo:'EmailJS HTTP200 · '+new Date().toISOString()};
  throw falhaCanalI165('Canal de e-mail recusou a transmissão ('+r.status+').',r.status>=400&&r.status<500?'recusada':'desconhecido');
  }catch(e){if(!chamouProvedor&&!e.classificacaoCanalI165)throw falhaCanalI165(e.message,'antes_envio');throw e;}
 };
}
