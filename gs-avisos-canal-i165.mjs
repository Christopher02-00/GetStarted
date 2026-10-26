/* I165 R63: feed independente. Abrir um aviso não conclui a fonte. */
import {programacaoAtivaI165} from './gs-contexto-operacional-i165.mjs';
export const ESCOPO_AVISOS_I165='operacional_i165_cp101';
const idValido=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,220}$/.test(x);
const idAviso=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{12,160}$/.test(x);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dados=s=>s?.exists()?s.data():null;
export function mesmaIdentidadeAvisosI165(a,b){return !!a?.uid&&['uid','papel','atorReal','sessao','geracao','email'].every(k=>a[k]===b?.[k]);}
export function cadastroProprioAvisosI165(c,g,d){
 return c?.papel===c?.atorReal&&!c?.delegada&&g?.uid===c?.uid&&g?.email===c?.email&&g?.emailVerificado===true&&g?.provedor==='google.com'&&d?.ativo===true&&d.excluido!==true&&d.pessoa===c.atorReal&&(!d.uid||d.uid===c.uid)&&(!d.email||String(d.email).trim().toLowerCase()===c.email);
}
export function fontesAvisosHabilitadasI165(config){return programacaoAtivaI165(config)?[...(config.habilidades?.edicao===true?['videos_producao']:[]),...(config.habilidades?.programacao===true?['postagens']:[])]:[];}
export function avisoFisicoI165(d,id,papel){return idAviso(id)&&d?.id===id&&d.escopo===ESCOPO_AVISOS_I165&&d.destinatario===papel&&typeof d.ativacaoId==='string'&&d.ativacaoId.length>=12&&['pendente','resolvida'].includes(d.estado)&&['videos_producao','postagens'].includes(d.fonte?.colecao)&&idValido(d.fonte?.id);}
export function saudeAvisosI165(d,agora=Date.now()){
 const t=Date.parse(d?.ultimaExecucao||'');return d?.escopo===ESCOPO_AVISOS_I165&&d.estado==='conferido'&&Number.isFinite(t)&&agora-t>=-60000&&agora-t<=15*60000;
}
export function resumoCanalAvisoI165(n){
 const canais=['push','email'].map(k=>n?.canais?.[k]?.estado).filter(Boolean);
 if(canais.includes('resultado_desconhecido'))return 'Não consegui confirmar um aviso fora do site. Esta atividade continua aqui; nenhum reenvio automático foi feito.';
 if(canais.includes('falha'))return 'Um aviso fora do site falhou. Abra o conteúdo e siga por aqui enquanto o canal é conferido.';
 if(canais.includes('em_andamento'))return 'O envio do aviso ainda está sendo conferido. A atividade continua na fila.';
 return '';
}
export function resumoSaudeCanaisI165(s){
 const c=s?.canais;if(!c)return '';
 if(c.desconhecidas>0)return 'Há aviso(s) fora do site sem confirmação. Confira as atividades nesta fila.';
 if(c.falhas>0)return 'O canal de avisos precisa de conferência. As atividades continuam nesta fila.';
 return '';
}
export function opcoesVapidAvisosI165(d){
 const k=d?.vapidKey;
 if(typeof k==='string'&&k.length>=80&&k.length<=512)return {vapidKey:k};
 if(k!==undefined&&k!==null&&k!=='')throw Error('Precisa conferir a chave de avisos. A fila continua no sistema.');
 if(d?.vapidMode==='firebase_default')return {};
 throw Error('O canal de aparelho ainda precisa ser configurado. A fila continua no sistema.');
}
function ambientePadrao(){return {window,Notification:globalThis.Notification,serviceWorker:globalThis.navigator?.serviceWorker,crypto:globalThis.crypto,setInterval:(...a)=>globalThis.setInterval(...a),clearInterval:(...a)=>globalThis.clearInterval(...a),agora:()=>Date.now(),carregarMessaging:()=>import('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js')};}
export function esperarServiceWorkerAtivoI165(reg,{vigente=()=>true,timeoutMs=20000,programar=(f,t)=>globalThis.setTimeout(f,t),cancelarTimer=t=>globalThis.clearTimeout(t)}={}){
 let encerrar=()=>{};
 const pronto=new Promise((resolve,reject)=>{
  let fim=false,timer;const workers=new Set();
  const limpar=()=>{cancelarTimer(timer);reg?.removeEventListener?.('updatefound',verificar);for(const w of workers)w.removeEventListener?.('statechange',verificar);};
  const concluir=(codigo)=>{if(fim)return;fim=true;limpar();if(codigo)reject(Object.assign(Error('O serviço de avisos não confirmou a ativação.'),{code:codigo}));else resolve(reg);};
  function verificar(){
   if(fim)return;if(!vigente()){concluir('i165/sw-contexto');return;}
   if(reg?.active?.state==='activated'){concluir();return;}
   if(!reg||typeof reg.addEventListener!=='function'){concluir('i165/sw-falha');return;}
   for(const w of [reg.installing,reg.waiting,reg.active])if(w&&!workers.has(w)){workers.add(w);w.addEventListener?.('statechange',verificar);}
   if(workers.size&&[...workers].every(w=>w.state==='redundant'))concluir('i165/sw-falha');
  }
  encerrar=()=>concluir('i165/sw-contexto');
  timer=programar(()=>concluir(vigente()?'i165/sw-tempo':'i165/sw-contexto'),timeoutMs);
  reg?.addEventListener?.('updatefound',verificar);verificar();
 });
 return {pronto,cancelar:()=>encerrar()};
}
export function mensagemAtivacaoAvisosI165(err){
 if(err?.code==='i165/sw-tempo')return 'Os avisos do navegador ainda estão iniciando. Aguarde um pouco e tente novamente; a fila continua no sistema.';
 if(err?.code==='i165/sw-contexto')return 'A ativação foi interrompida. Confira seu perfil antes de tentar novamente.';
 if(err?.code==='i165/sw-falha'||err?.code==='messaging/failed-service-worker-registration')return 'O serviço de avisos do navegador não iniciou. Recarregue o site e tente novamente; a fila continua no sistema.';
 const locais=new Set(['O Google e o cadastro ativo da própria pessoa precisam ser confirmados.','Precisa conferir a chave de avisos. A fila continua no sistema.','O canal de aparelho ainda precisa ser configurado. A fila continua no sistema.','Os avisos não foram permitidos neste navegador. A fila continua no sistema.','O navegador não confirmou o aparelho.','Não consegui confirmar o registro deste aparelho.']);
 if(locais.has(err?.message))return err.message;
 return 'Não consegui ativar os avisos deste aparelho agora. Recarregue o site e tente novamente; a fila continua no sistema.';
}
export function montarAvisosCanalI165(root,{io,contexto,abrirEditor,abrirPostagem,central=null,ambiente=ambientePadrao()}={}){
 if(!root||!io||central||typeof contexto!=='function')throw Error('Os avisos precisam de acesso confirmado.');
 const c=Object.freeze({...contexto()});
 let vivo=true,ciclo=0,linhas=[],config=null,web=null,cadastro=null,saude=null,estadoConfig='conferindo',estadoLista='conferindo',teveAtivo=false,aparelho=null,busy=false,recado='',truncado=false,consulta=null,abertura=0,pararForeground=null,sdkAtual=null,foregroundSeq=0,cancelarEsperaSW=null,registro=null,teste=null,statusConta=null,tokenRegistrado=null,tentativaTeste=null;
 const vigente=()=>vivo&&root.isConnected!==false&&mesmaIdentidadeAvisosI165(c,contexto());
 const atual=e=>vigente()&&e===ciclo;
 const ativo=()=>estadoConfig==='confirmada'&&fontesAvisosHabilitadasI165(config).length>0;
 const pushAtivo=()=>ativo()&&config.habilidades?.push===true;
 const proprio=()=>vigente()&&c.papel===c.atorReal&&!c.delegada&&!contexto()?.delegada;
 const registroAtual=()=>proprio()&&pushAtivo()&&registro?.uid===c.uid&&registro?.pessoa===c.atorReal&&registro?.ativacaoId===config?.ativacaoId;
 const ambienteBase=()=>ambiente.window.location.href,swURL=()=>new URL('./firebase-messaging-sw.js',ambienteBase()).href;
 const pararCanal=()=>{foregroundSeq++;const cancelar=cancelarEsperaSW;cancelarEsperaSW=null;cancelar?.();try{pararForeground?.();}catch{}pararForeground=null;sdkAtual=null;};
 root.innerHTML='<section class="card" style="border-color:#6198cb;margin:0 0 18px" aria-label="Avisos de conteúdos"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0;font-size:19px">Conteúdos que precisam de você <span data-contagem></span></h2><p style="margin:7px 0;color:#c9c9c9;font-size:13px" data-saude></p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn secondary" data-reconferir>Conferir avisos</button><button type="button" class="btn" data-ativar>Ativar no meu aparelho</button><button type="button" class="btn secondary" data-testar hidden>Enviar teste para mim</button><button type="button" class="btn secondary" data-conferir-teste hidden>Conferir se chegou</button><button type="button" class="btn secondary" data-vi hidden>Vi o aviso de teste</button></div></div><p style="font-size:13px;margin:8px 0" role="status" aria-live="polite" data-estado></p><p style="font-size:13px;color:#c9c9c9" data-aparelho></p><p style="font-size:12px;color:#c9c9c9" role="status" aria-live="polite" data-teste></p><div data-lista></div><small style="display:block;margin-top:10px;color:#c9c9c9">Abrir ou ler um aviso não conclui a atividade. O sistema acompanha o andamento na origem.</small></section>';
 const el=s=>root.querySelector(s);
 function render(){
  if(!vigente())return;
  root.hidden=!teveAtivo&&['conferindo','desligada'].includes(estadoConfig);
  const pendentes=linhas.filter(n=>n.estado==='pendente'&&n.ativacaoId===config?.ativacaoId),confirmada=ativo()&&estadoLista==='confirmada';
  el('[data-contagem]').textContent=confirmada?'· '+pendentes.length+(truncado?' nesta página':''):pendentes.length?'· '+pendentes.length+' no último retrato':'';
  el('[data-saude]').textContent=teveAtivo?'Conteúdos: '+(confirmada&&saudeAvisosI165(saude,ambiente.agora())?'acompanhamento conferido.':'acompanhamento a conferir.')+' '+resumoSaudeCanaisI165(saude):'';
  el('[data-estado]').textContent=recado||(!confirmada?'Não consegui confirmar toda a fila agora. O último retrato foi preservado; isso não confirma fila vazia.':truncado?'Há mais avisos além dos 100 desta página. Confira também a sua fila de conteúdos.':pendentes.length?'Abra o conteúdo para conferir o que precisa ser feito.':'Nenhum aviso pendente na última conferência do servidor.');
  el('[data-aparelho]').textContent=!proprio()?'Você está vendo outro perfil. Cada pessoa precisa entrar com o próprio Google e ativar os avisos no aparelho que usa.':ambiente.Notification?.permission==='denied'?'Os avisos estão bloqueados neste navegador. Libere as notificações nas configurações do site e volte aqui. A fila continua no sistema.':registroAtual()?'Registro deste aparelho confirmado para você nesta entrada. Agora você pode conferir o aviso de teste.':aparelho?.pronto?'Entre com seu próprio Google e toque em “Ativar no meu aparelho”. O registro deste aparelho ainda não foi confirmado nesta entrada.':aparelho?.motivo||'Conferindo se os avisos deste aparelho podem ser ativados.';
  el('[data-ativar]').textContent=registroAtual()?'Conferir meu aparelho':'Ativar no meu aparelho';
  el('[data-ativar]').disabled=busy||!proprio()||!pushAtivo()||!aparelho?.pronto||ambiente.Notification?.permission==='denied';
  el('[data-testar]').hidden=!proprio();el('[data-testar]').textContent=tentativaTeste||['reservado','em_andamento','resultado_desconhecido'].includes(teste?.estado)?'Conferir mesma tentativa':'Enviar teste para mim';
  const esperaTeste=teste?.proximoTesteEm&&Date.parse(teste.proximoTesteEm)>ambiente.agora()&&!tentativaTeste&&!['reservado','em_andamento','resultado_desconhecido'].includes(teste?.estado);
  el('[data-testar]').disabled=busy||!registroAtual()||!tokenRegistrado||statusConta?.testeServidorDisponivel!==true||!!esperaTeste||ambiente.Notification?.permission!=='granted';
  el('[data-conferir-teste]').hidden=!proprio()||!teste?.operacaoId;el('[data-conferir-teste]').disabled=busy||ambiente.Notification?.permission!=='granted';
  el('[data-vi]').hidden=!proprio()||!registroAtual()||!teste?.objetoConfirmado||teste.visto===true;el('[data-vi]').disabled=busy;
  el('[data-teste]').textContent=!proprio()?'O aparelho de outra pessoa não pode ser ativado por este acesso.':teste?.visto?'Você confirmou que viu o teste enviado pelo servidor neste aparelho. Isso não garante todos os avisos futuros.':teste?.objetoConfirmado?'O navegador confirmou o aviso de teste do servidor. Confira a tela e toque em “Vi o aviso de teste”. A exibição pelo aparelho ainda depende dessa conferência.':teste?.estado==='aceito_pelo_provedor'?'O serviço aceitou o envio do teste. Ainda não confirmei que chegou neste navegador. Você pode fechar o site, aguardar o aviso e depois voltar em “Conferir se chegou”.':teste?.estado==='resultado_desconhecido'?'O envio do teste ficou sem confirmação. Nenhum novo envio automático foi feito. Confira a mesma tentativa.':teste?.estado==='em_andamento'||teste?.estado==='reservado'?'A mesma tentativa de teste continua em conferência. Não foi criado outro envio.':teste?.estado==='recusado'?'O serviço recusou o teste. A fila continua no sistema; aguarde dez minutos antes de solicitar um novo teste.':statusConta?.contaComAparelhoAtivo===true?'Sua conta tem aparelho cadastrado. Ative aqui para conferir este navegador e enviar um teste só para você.':'Cada pessoa precisa ativar o aparelho com o próprio Google. Um registro não comprova que o aviso já chegou';
  el('[data-lista]').innerHTML=pendentes.map(n=>'<div style="padding:12px 0;border-top:1px solid #444;display:flex;gap:12px;justify-content:space-between;align-items:center"><div><strong>'+esc(n.titulo||'Conteúdo para conferir')+'</strong><div style="font-size:13px;color:#ccc;margin-top:4px">'+esc(n.texto||'Confira o próximo passo na origem.')+'</div>'+(n.urgencia==='urgente'?'<b style="color:#ffbe65">Prioridade</b>':'')+(n.bloqueada?'<small style="display:block">Aguardando outra etapa.</small>':'')+(n.faseAviso==='atrasado'?'<small style="display:block;color:#ffbe65">O prazo passou. Confira este conteúdo.</small>':'')+(resumoCanalAvisoI165(n)?'<small style="display:block;color:#ffbe65">'+esc(resumoCanalAvisoI165(n))+'</small>':'')+'</div><button class="btn secondary" type="button" data-abrir="'+esc(n.id)+'" '+(!confirmada?'disabled':'')+'>Abrir conteúdo</button></div>').join('');
 }
 function validarConfig(r){
  if(r?.schema!==1||r.configConfirmada!==true||r.config!==null&&typeof r.config!=='object')throw Error('Não consegui confirmar a configuração dos avisos.');
  return r;
 }
 async function configFresh(){const r=validarConfig(await io.configAvisos());if(!vigente())throw Error('O acesso mudou. Abra os avisos no perfil original.');return r;}
 async function preConferir(e,r){
  if(!atual(e)||!pushAtivo())return null;
  if(c.papel!==c.atorReal||c.delegada){aparelho={pronto:false,motivo:'Use o Google da própria pessoa para ativar este aparelho.'};render();return null;}
  if(!ambiente.Notification||!ambiente.serviceWorker||!ambiente.crypto?.subtle){aparelho={pronto:false,motivo:'Este navegador não oferece os avisos de aparelho necessários. A fila continua no sistema.'};render();return null;}
  try{const g=await io.confirmarGoogle();if(!atual(e)||!pushAtivo())return null;
   if(!cadastroProprioAvisosI165(c,g,r?.cadastroProprio))throw Error('O Google e o cadastro ativo da própria pessoa precisam ser confirmados.');
   aparelho={pronto:true,opcoesVapid:opcoesVapidAvisosI165(r.web)};render();return aparelho;
  }catch(err){if(atual(e)){aparelho={pronto:false,motivo:mensagemAtivacaoAvisosI165(err)};render();}return null;}
 }
 async function consultar(){
  if(!vigente())return false;if(consulta)return consulta;
  const e=ciclo;let configuracaoConferida=false;
  consulta=(async()=>{try{
   const r=await configFresh();if(!atual(e))return false;
   config=r.config;web=r.web;cadastro=r.cadastroProprio;saude=r.saude;estadoConfig='confirmada';configuracaoConferida=true;statusConta=r.aparelhoProprio||null;
   adotarTesteDaConta();
   if(registro?.ativacaoId!==config?.ativacaoId){registro=null;tokenRegistrado=null;}
   if(!ativo()){estadoConfig='desligada';aparelho=null;pararCanal();render();return false;}
   teveAtivo=true;
   const a=await preConferir(e,r);if(a&&atual(e)){await prepararForeground(e);await conferirTesteNoNavegador();}
   if(!atual(e))return false;
   const l=await io.listarAvisos();if(!atual(e))return false;
   if(l?.schema!==1||l.listaConfirmada!==true||l.ativacaoId!==config.ativacaoId||!Array.isArray(l.avisos)||l.avisos.length>100||l.limite!==100||typeof l.truncado!=='boolean'||l.avisos.some(n=>!avisoFisicoI165(n,n.id,c.papel)||n.estado!=='pendente'||!fontesAvisosHabilitadasI165(config).includes(n.fonte?.colecao)||n.ativacaoId!==config.ativacaoId))throw Error('A fila de avisos precisa ser conferida. O último retrato foi preservado.');
   linhas=l.avisos;truncado=l.truncado;estadoLista='confirmada';recado='';render();
   if(pendenteURL&&idAviso(pendenteURL)&&atual(e)){const id=pendenteURL;pendenteURL=null;await abrir(id);}
   return true;
  }catch(err){if(atual(e)){estadoLista='erro';if(!configuracaoConferida){estadoConfig='erro';aparelho=null;registro=null;tokenRegistrado=null;pararCanal();}recado='Não consegui conferir toda a fila agora. O último retrato foi preservado. Você pode conferir seu aparelho quando a configuração estiver confirmada.';render();}return false;
  }finally{consulta=null;}})();
  return consulta;
 }
 async function lerNota(id,{paraNotificar=false}={}){
  if(!vigente()||!idAviso(id))throw Error('Este aviso precisa ser conferido no acesso original.');
  const r=await configFresh();if(!fontesAvisosHabilitadasI165(r.config).length)throw Error('O acompanhamento está pausado. A atividade continua na origem.');
  if(paraNotificar&&r.config.habilidades?.push!==true)return null;
  const n=await io.lerAviso(id);if(!vigente())throw Error('O perfil mudou. Abra o aviso no acesso original.');
  if(!avisoFisicoI165(n,id,c.papel)||n.ativacaoId!==r.config.ativacaoId||!fontesAvisosHabilitadasI165(r.config).includes(n.fonte?.colecao)||n.fonteConferida!==true||n.leituraNaoResolve!==true||n.semAlterarEstadoPersistido!==true)throw Error('Não consegui confirmar a origem atual deste aviso. A atividade continua preservada.');
  if(paraNotificar&&(n.estado!=='pendente'||n.fonteAvancou||n.pausada||n.bloqueada))return null;
  return n;
 }
 async function abrir(id){const token=++abertura,navegacao=contexto()?.navegacao;
  try{const n=await lerNota(id);if(!vigente()||token!==abertura||navegacao!==contexto()?.navegacao)return {abriu:false,contextoVigente:false};
   const abrirFonte=n.fonte.colecao==='postagens'?abrirPostagem:abrirEditor;
   if(typeof abrirFonte!=='function')throw Error('Abra a fila de conteúdos para conferir esta atividade.');
   const resultado=await abrirFonte(n.fonte.id);if(!vigente()||token!==abertura)return {abriu:false,contextoVigente:false};
   if(resultado?.abriu===false||resultado===false)throw Error('A origem mudou de etapa. Confira a fila atual.');
   recado=n.estado==='resolvida'?'Este aviso já avançou. A origem atual foi aberta.':'Conteúdo aberto. A pendência só sai quando a atividade avançar na origem.';render();
   const u=new URL(ambienteBase());if(u.searchParams.get('avisoI165')===id){u.searchParams.delete('avisoI165');ambiente.window.history.replaceState(null,'',u.href);}return {abriu:true,contextoVigente:true};
  }catch(err){if(vigente()&&token===abertura){recado=err.message||'Não consegui conferir o aviso agora.';render();}return {abriu:false,contextoVigente:vigente()};}
 }
 function linkAvisoI165(id){const u=new URL('./escritorio.html',ambienteBase());u.searchParams.set('avisoI165',id);return u.href;}
 async function prepararForeground(e){
  if(!atual(e)||!pushAtivo()||!aparelho?.pronto||ambiente.Notification.permission!=='granted'||pararForeground)return;
  const f=++foregroundSeq;try{const sdk=await ambiente.carregarMessaging();if(!atual(e)||!pushAtivo()||f!==foregroundSeq)return;
   const parar=sdk.onMessage(sdk.getMessaging(io.app),async p=>{if(!atual(e)||!pushAtivo())return;try{
    if(p?.data?.tipo==='teste_dispositivo_i165'){
     const id=p.data.testeId;if(!registroAtual()||id!==(tentativaTeste?.operacaoId||teste?.operacaoId))return;
     const reg=await ambiente.serviceWorker.getRegistration(swURL());if(!atual(e)||!registroAtual()||!reg)return;
     await reg.showNotification('Get · Seu teste de aviso',{body:'Este é o teste enviado pelo servidor que você pediu. Volte ao site para confirmar se viu.',tag:'i165_teste_servidor_'+id});return;
    }
    const n=await lerNota(p?.data?.id,{paraNotificar:true});if(!n||!atual(e)||!pushAtivo())return;
    const reg=await ambiente.serviceWorker.getRegistration(swURL());if(!atual(e)||!pushAtivo()||!reg)return;
    await reg.showNotification('Get · Conteúdos',{body:'Tem uma ação de conteúdo para você conferir no sistema.',tag:'i165_'+n.id,data:{link:linkAvisoI165(n.id)}});
   }catch{/* A atividade permanece na fila, sem alegar entrega. */}});
   if(!atual(e)||!pushAtivo()||f!==foregroundSeq){parar?.();return;}pararForeground=parar;sdkAtual=sdk;
  }catch{/* O painel não depende da confirmação do canal. */}
 }
 async function ativar(){
  if(!proprio()||!pushAtivo()||!aparelho?.pronto||busy||ambiente.Notification?.permission==='denied')return false;
  const e=ciclo;busy=true;registro=null;tokenRegistrado=null;recado='Conferindo os avisos deste aparelho…';render();
  try{const permissao=ambiente.Notification.permission==='granted'?'granted':ambiente.Notification.requestPermission();
   if(await permissao!=='granted')throw Error('Os avisos não foram permitidos neste navegador. A fila continua no sistema.');
   const r=await configFresh();if(!atual(e)||!proprio()||!pushAtivo()||r.config?.ativacaoId!==config?.ativacaoId||r.config?.habilidades?.push!==true)return false;
   const a=await preConferir(e,r);if(!a||!atual(e)||!proprio()||!pushAtivo())return false;
   const sdk=sdkAtual||await ambiente.carregarMessaging();if(!atual(e)||!proprio()||!pushAtivo())return false;
   const reg=await ambiente.serviceWorker.register(swURL());if(!atual(e)||!proprio()||!pushAtivo())return false;
   const espera=esperarServiceWorkerAtivoI165(reg,{vigente:()=>atual(e)&&proprio()&&pushAtivo()});cancelarEsperaSW=espera.cancelar;
   try{await espera.pronto;}finally{if(cancelarEsperaSW===espera.cancelar)cancelarEsperaSW=null;}
   if(!atual(e)||!proprio()||!pushAtivo())return false;
   const token=await sdk.getToken(sdk.getMessaging(io.app),{...a.opcoesVapid,serviceWorkerRegistration:reg});if(!atual(e)||!proprio()||!pushAtivo())return false;
   if(typeof token!=='string'||!token)throw Error('O navegador não confirmou o aparelho.');
   const recibo=await io.registrarDispositivo({token});if(!atual(e)||!proprio()||!pushAtivo())return false;
   if(recibo?.schema!==1||recibo.registrado!==true||recibo.uid!==c.uid||recibo.pessoa!==c.atorReal||recibo.ativacaoId!==config.ativacaoId)throw Error('Não consegui confirmar o registro deste aparelho.');
   registro={uid:recibo.uid,pessoa:recibo.pessoa,ativacaoId:recibo.ativacaoId};tokenRegistrado=token;statusConta=r.aparelhoProprio||null;adotarTesteDaConta();
   recado='Registro confirmado para você. Se quiser, confira agora o aviso de teste neste navegador.';await prepararForeground(e);return true;
  }catch(err){if(atual(e))recado=mensagemAtivacaoAvisosI165(err);return false;
  }finally{if(atual(e)){busy=false;render();}}
 }
 function adotarTesteDaConta(){
  const t=statusConta?.ultimoTeste;if(!proprio()||!t||typeof t.operacaoId!=='string'||!['reservado','em_andamento','aceito_pelo_provedor','resultado_desconhecido','recusado'].includes(t.estado))return;
  if(tentativaTeste&&tentativaTeste.operacaoId!==t.operacaoId)return;
  teste={...t,objetoConfirmado:teste?.operacaoId===t.operacaoId&&teste.objetoConfirmado===true,visto:teste?.operacaoId===t.operacaoId&&teste.visto===true};
 }
 async function conferirTesteNoNavegador(){
  if(!proprio()||!teste?.operacaoId||ambiente.Notification?.permission!=='granted')return false;
  const id=teste.operacaoId,e=ciclo;
  try{const reg=await ambiente.serviceWorker.getRegistration(swURL());if(!atual(e)||!proprio()||teste?.operacaoId!==id||typeof reg?.getNotifications!=='function')return false;
   const tag='i165_teste_servidor_'+id,notas=await reg.getNotifications({tag});if(!atual(e)||!proprio()||teste?.operacaoId!==id)return false;
   teste.objetoConfirmado=Array.isArray(notas)&&notas.some(n=>n.tag===tag);render();return teste.objetoConfirmado;
  }catch{return false;}
 }
 async function testarNoServidor(){
  if(!registroAtual()||!tokenRegistrado||busy||statusConta?.testeServidorDisponivel!==true||typeof io.testarDispositivo!=='function'||ambiente.Notification?.permission!=='granted')return false;
  const e=ciclo;busy=true;recado='Conferindo um teste só para você…';render();
  try{
   const r=await configFresh();if(!atual(e)||!registroAtual()||r.config?.ativacaoId!==registro.ativacaoId||r.config?.habilidades?.push!==true||r.aparelhoProprio?.testeServidorDisponivel!==true)return false;
   statusConta=r.aparelhoProprio;adotarTesteDaConta();
   if(!tentativaTeste&&['aceito_pelo_provedor','recusado'].includes(teste?.estado)&&Date.parse(teste.proximoTesteEm)>ambiente.agora()){recado='Aguarde dez minutos entre os testes. Você ainda pode conferir se o teste anterior chegou.';return false;}
   const a=await preConferir(e,r);if(!a||!atual(e)||!registroAtual())return false;
   if(!tentativaTeste){
    const anterior=['reservado','em_andamento','resultado_desconhecido'].includes(teste?.estado)?teste.operacaoId:null;
    const novo=()=>typeof ambiente.crypto.randomUUID==='function'?ambiente.crypto.randomUUID():Array.from(ambiente.crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
    tentativaTeste=Object.freeze({token:tokenRegistrado,operacaoId:anterior||novo()});
   }
   const pedido=tentativaTeste,rsp=await io.testarDispositivo(pedido);if(!atual(e)||!registroAtual()||tentativaTeste!==pedido)return false;
   if(rsp?.schema!==1||rsp.testeDispositivo!==true||rsp.operacaoId!==pedido.operacaoId||!['em_andamento','aceito_pelo_provedor','resultado_desconhecido','recusado'].includes(rsp.estado)||rsp.aceiteProvedor!==(rsp.estado==='aceito_pelo_provedor')||rsp.recebimentoNoAparelho!=='nao_conferido'||rsp.reenvioAutomatico!==false)throw Error('O teste precisa de conferência.');
   teste={...rsp,objetoConfirmado:teste?.operacaoId===rsp.operacaoId&&teste.objetoConfirmado===true,visto:false};
   if(['aceito_pelo_provedor','recusado'].includes(rsp.estado))tentativaTeste=null;
   await conferirTesteNoNavegador();if(!atual(e)||!registroAtual())return false;
   recado='A tentativa do teste foi conferida. Os conteúdos não foram alterados.';return true;
  }catch(err){if(atual(e))recado='Não consegui confirmar o resultado deste teste agora. A mesma tentativa foi preservada; conferir novamente não cria outro teste.';return false;
  }finally{if(atual(e)){busy=false;render();}}
 }
 function confirmarTesteVisto(){if(!registroAtual()||busy||!teste?.objetoConfirmado)return false;teste.visto=true;render();return true;}
 let pendenteURL;try{pendenteURL=new URL(ambienteBase()).searchParams.get('avisoI165');}catch{}
 const click=ev=>{const b=ev.target?.closest?.('[data-abrir],[data-ativar],[data-reconferir],[data-testar],[data-conferir-teste],[data-vi]');if(!b||!root.contains(b)||!vigente())return;if(b.hasAttribute('data-abrir'))abrir(b.getAttribute('data-abrir'));else if(b.hasAttribute('data-ativar'))ativar();else if(b.hasAttribute('data-testar'))testarNoServidor();else if(b.hasAttribute('data-conferir-teste'))conferirTesteNoNavegador();else if(b.hasAttribute('data-vi'))confirmarTesteVisto();else consultar();};
 const mensagem=ev=>{if(!vigente()||ev.data?.tipo!=='abrir_aviso_i165'||!idAviso(ev.data.id))return;let origem;try{origem=new URL(ev.source?.scriptURL);}catch{return;}if(origem.href!==swURL()||ev.origin&&ev.origin!==new URL(ambienteBase()).origin)return;ev.ports?.[0]?.postMessage({recebido:true});abrir(ev.data.id);};
 root.addEventListener('click',click);ambiente.serviceWorker?.addEventListener('message',mensagem);
 const timer=ambiente.setInterval(()=>{if(vigente())consultar();},60000);
 consultar();render();
 return {abrir,ativar,testarNoServidor,conferirTesteNoNavegador,confirmarTesteVisto,reconferir:consultar,estado:()=>({estadoConfig,estadoLista,linhas:structuredClone(linhas),truncado,aparelhoPronto:!!aparelho?.pronto,registroConfirmado:registroAtual(),testeServidor:teste?{operacaoId:teste.operacaoId,estado:teste.estado,aceiteProvedor:teste.aceiteProvedor===true,objetoConfirmado:teste.objetoConfirmado===true,visto:teste.visto===true}:null,ciclo,vivo}),destroy(){if(!vivo)return;vivo=false;ciclo++;abertura++;registro=null;teste=null;tokenRegistrado=null;tentativaTeste=null;pararCanal();ambiente.clearInterval(timer);ambiente.serviceWorker?.removeEventListener('message',mensagem);root.removeEventListener('click',click);root.replaceChildren();root.hidden=true;}};
}
