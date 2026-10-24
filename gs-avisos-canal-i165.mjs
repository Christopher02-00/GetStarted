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
 let vivo=true,ciclo=0,linhas=[],config=null,web=null,cadastro=null,saude=null,estadoConfig='conferindo',estadoLista='conferindo',teveAtivo=false,aparelho=null,busy=false,recado='',truncado=false,consulta=null,abertura=0,pararForeground=null,sdkAtual=null,foregroundSeq=0,cancelarEsperaSW=null;
 const vigente=()=>vivo&&root.isConnected!==false&&mesmaIdentidadeAvisosI165(c,contexto());
 const atual=e=>vigente()&&e===ciclo;
 const ativo=()=>estadoConfig==='confirmada'&&programacaoAtivaI165(config)&&config.habilidades?.edicao===true;
 const pushAtivo=()=>ativo()&&config.habilidades?.push===true;
 const ambienteBase=()=>ambiente.window.location.href,swURL=()=>new URL('./firebase-messaging-sw.js',ambienteBase()).href;
 const pararCanal=()=>{foregroundSeq++;const cancelar=cancelarEsperaSW;cancelarEsperaSW=null;cancelar?.();try{pararForeground?.();}catch{}pararForeground=null;sdkAtual=null;};
 root.innerHTML='<section class="card" style="border-color:#6198cb;margin:0 0 18px" aria-label="Avisos de conteúdos"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0;font-size:19px">Conteúdos que precisam de você <span data-contagem></span></h2><p style="margin:7px 0;color:#c9c9c9;font-size:13px" data-saude></p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn secondary" data-reconferir>Conferir avisos</button><button type="button" class="btn" data-ativar>Avisar neste aparelho</button></div></div><p style="font-size:13px;margin:8px 0" role="status" aria-live="polite" data-estado></p><p style="font-size:12px;color:#c9c9c9" data-aparelho></p><div data-lista></div><small style="display:block;margin-top:10px;color:#c9c9c9">Abrir ou ler um aviso não conclui a atividade. O sistema acompanha o andamento na origem.</small></section>';
 const el=s=>root.querySelector(s);
 function render(){
  if(!vigente())return;
  root.hidden=!teveAtivo&&['conferindo','desligada'].includes(estadoConfig);
  const pendentes=linhas.filter(n=>n.estado==='pendente'&&n.ativacaoId===config?.ativacaoId),confirmada=ativo()&&estadoLista==='confirmada';
  el('[data-contagem]').textContent=confirmada?'· '+pendentes.length+(truncado?' nesta página':''):pendentes.length?'· '+pendentes.length+' no último retrato':'';
  el('[data-saude]').textContent=teveAtivo?'Edição: '+(confirmada&&saudeAvisosI165(saude,ambiente.agora())?'acompanhamento conferido.':'acompanhamento a conferir.')+' '+resumoSaudeCanaisI165(saude):'';
  el('[data-estado]').textContent=recado||(!confirmada?'Não consegui confirmar toda a fila agora. O último retrato foi preservado; isso não confirma fila vazia.':truncado?'Há mais avisos além dos 100 desta página. Confira também a sua fila de edição.':pendentes.length?'Abra o conteúdo para conferir o que precisa ser feito.':'Nenhum aviso pendente na última conferência do servidor.');
  el('[data-aparelho]').textContent=c.papel!==c.atorReal||c.delegada?'Para receber no aparelho, entre com o Google da própria pessoa.':ambiente.Notification?.permission==='denied'?'Os avisos estão bloqueados neste navegador. A fila continua no sistema.':aparelho?.pronto?'Você pode ativar os avisos neste aparelho. A entrega depende do navegador e do serviço.':aparelho?.motivo||'Conferindo se os avisos deste aparelho podem ser ativados.';
  el('[data-ativar]').disabled=busy||!pushAtivo()||!aparelho?.pronto||ambiente.Notification?.permission==='denied';
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
  const e=ciclo;
  consulta=(async()=>{try{
   const r=await configFresh();if(!atual(e))return false;
   config=r.config;web=r.web;cadastro=r.cadastroProprio;saude=r.saude;estadoConfig='confirmada';
   if(!ativo()){estadoConfig='desligada';aparelho=null;pararCanal();render();return false;}
   teveAtivo=true;
   const l=await io.listarAvisos();if(!atual(e))return false;
   if(l?.schema!==1||l.listaConfirmada!==true||l.ativacaoId!==config.ativacaoId||!Array.isArray(l.avisos)||l.avisos.length>100||l.limite!==100||typeof l.truncado!=='boolean'||l.avisos.some(n=>!avisoFisicoI165(n,n.id,c.papel)||n.estado!=='pendente'||n.fonte?.colecao!=='videos_producao'||n.ativacaoId!==config.ativacaoId))throw Error('A fila de avisos precisa ser conferida. O último retrato foi preservado.');
   linhas=l.avisos;truncado=l.truncado;estadoLista='confirmada';recado='';render();
   const a=await preConferir(e,r);if(a&&atual(e))await prepararForeground(e);
   if(pendenteURL&&idAviso(pendenteURL)&&atual(e)){const id=pendenteURL;pendenteURL=null;await abrir(id);}
   return true;
  }catch(err){if(atual(e)){estadoConfig='erro';estadoLista='erro';aparelho=null;pararCanal();recado=err.message||'Não consegui conferir os avisos agora. O último retrato foi preservado.';render();}return false;
  }finally{consulta=null;}})();
  return consulta;
 }
 async function lerNota(id,{paraNotificar=false}={}){
  if(!vigente()||!idAviso(id))throw Error('Este aviso precisa ser conferido no acesso original.');
  const r=await configFresh();if(!programacaoAtivaI165(r.config)||r.config.habilidades?.edicao!==true)throw Error('O acompanhamento está pausado. A atividade continua na origem.');
  if(paraNotificar&&r.config.habilidades?.push!==true)return null;
  const n=await io.lerAviso(id);if(!vigente())throw Error('O perfil mudou. Abra o aviso no acesso original.');
  if(!avisoFisicoI165(n,id,c.papel)||n.ativacaoId!==r.config.ativacaoId||n.fonte?.colecao!=='videos_producao'||n.fonteConferida!==true||n.leituraNaoResolve!==true||n.semAlterarEstadoPersistido!==true)throw Error('Não consegui confirmar a origem atual deste aviso. A atividade continua preservada.');
  if(paraNotificar&&(n.estado!=='pendente'||n.fonteAvancou||n.pausada||n.bloqueada))return null;
  return n;
 }
 async function abrir(id){const token=++abertura,navegacao=contexto()?.navegacao;
  try{const n=await lerNota(id);if(!vigente()||token!==abertura||navegacao!==contexto()?.navegacao)return {abriu:false,contextoVigente:false};
   const resultado=await abrirEditor(n.fonte.id);if(!vigente()||token!==abertura)return {abriu:false,contextoVigente:false};
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
    const n=await lerNota(p?.data?.id,{paraNotificar:true});if(!n||!atual(e)||!pushAtivo())return;
    const reg=await ambiente.serviceWorker.getRegistration(swURL());if(!atual(e)||!pushAtivo()||!reg)return;
    await reg.showNotification('Get · Conteúdos',{body:'Tem uma ação de conteúdo para você conferir no sistema.',tag:'i165_'+n.id,data:{link:linkAvisoI165(n.id)}});
   }catch{/* A atividade permanece na fila, sem alegar entrega. */}});
   if(!atual(e)||!pushAtivo()||f!==foregroundSeq){parar?.();return;}pararForeground=parar;sdkAtual=sdk;
  }catch{/* O painel não depende da confirmação do canal. */}
 }
 async function ativar(){
  if(!vigente()||!pushAtivo()||!aparelho?.pronto||busy||c.papel!==c.atorReal||c.delegada||ambiente.Notification?.permission==='denied')return false;
  const e=ciclo;busy=true;recado='Conferindo os avisos deste aparelho…';render();
  try{const permissao=ambiente.Notification.permission==='granted'?'granted':ambiente.Notification.requestPermission();
   if(await permissao!=='granted')throw Error('Os avisos não foram permitidos neste navegador. A fila continua no sistema.');
   const r=await configFresh();if(!atual(e)||!pushAtivo()||r.config?.ativacaoId!==config?.ativacaoId||r.config?.habilidades?.push!==true)return false;
   const a=await preConferir(e,r);if(!a||!atual(e)||!pushAtivo())return false;
   const sdk=sdkAtual||await ambiente.carregarMessaging();if(!atual(e)||!pushAtivo())return false;
   const reg=await ambiente.serviceWorker.register(swURL());if(!atual(e)||!pushAtivo())return false;
   const espera=esperarServiceWorkerAtivoI165(reg,{vigente:()=>atual(e)&&pushAtivo()});cancelarEsperaSW=espera.cancelar;
   try{await espera.pronto;}finally{if(cancelarEsperaSW===espera.cancelar)cancelarEsperaSW=null;}
   if(!atual(e)||!pushAtivo())return false;
   const token=await sdk.getToken(sdk.getMessaging(io.app),{...a.opcoesVapid,serviceWorkerRegistration:reg});if(!atual(e)||!pushAtivo())return false;
   if(typeof token!=='string'||!token)throw Error('O navegador não confirmou o aparelho.');
   await io.registrarDispositivo({token});if(!atual(e)||!pushAtivo())return false;
   recado='Aparelho registrado. Os avisos também continuam na fila do sistema.';await prepararForeground(e);return true;
  }catch(err){if(atual(e))recado=mensagemAtivacaoAvisosI165(err);return false;
  }finally{if(atual(e)){busy=false;render();}}
 }
 let pendenteURL;try{pendenteURL=new URL(ambienteBase()).searchParams.get('avisoI165');}catch{}
 const click=ev=>{const b=ev.target?.closest?.('[data-abrir],[data-ativar],[data-reconferir]');if(!b||!root.contains(b)||!vigente())return;if(b.hasAttribute('data-abrir'))abrir(b.getAttribute('data-abrir'));else if(b.hasAttribute('data-ativar'))ativar();else consultar();};
 const mensagem=ev=>{if(!vigente()||ev.data?.tipo!=='abrir_aviso_i165'||!idAviso(ev.data.id))return;let origem;try{origem=new URL(ev.source?.scriptURL);}catch{return;}if(origem.href!==swURL()||ev.origin&&ev.origin!==new URL(ambienteBase()).origin)return;ev.ports?.[0]?.postMessage({recebido:true});abrir(ev.data.id);};
 root.addEventListener('click',click);ambiente.serviceWorker?.addEventListener('message',mensagem);
 const timer=ambiente.setInterval(()=>{if(vigente())consultar();},60000);
 consultar();render();
 return {abrir,ativar,reconferir:consultar,estado:()=>({estadoConfig,estadoLista,linhas:structuredClone(linhas),truncado,aparelhoPronto:!!aparelho?.pronto,ciclo,vivo}),destroy(){if(!vivo)return;vivo=false;ciclo++;abertura++;pararCanal();ambiente.clearInterval(timer);ambiente.serviceWorker?.removeEventListener('message',mensagem);root.removeEventListener('click',click);root.replaceChildren();root.hidden=true;}};
}
