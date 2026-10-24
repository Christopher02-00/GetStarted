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
export function montarAvisosCanalI165(root,{io,contexto,abrirEditor,abrirPostagem,central=null,ambiente=ambientePadrao()}={}){
 if(!root||!io||typeof contexto!=='function')throw Error('O painel de avisos precisa de acesso confirmado.');
 const c=Object.freeze({...contexto()}),{db,doc,collection,query,where,onSnapshot,getDocFromServer}=io;
 let vivo=true,ciclo=0,linhas=[],config=null,saude=null,estadoConfig='conferindo',estadoLista='conferindo',estadoSaude='conferindo',teveAtivo=false,aparelho=null,busy=false,recado='',pararConfig=null,pararLista=null,pararSaude=null,pararForeground=null,sdkAtual=null,abertura=0,configSeq=0,foregroundSeq=0;
 let linhasCentral=[],cfgCentral=null,saudeCentral=null,estadoCentral='conferindo',listaCentral='conferindo',teveCentral=false,pararCentralConfig=null,pararCentralLista=null,pararCentralSaude=null,centralSeq=0,centralConfigSeq=0;
 const centralAtiva=()=>!!central&&estadoCentral==='confirmada'&&(central.ativa(cfgCentral)||ativo()&&config.habilidades?.organizacao===true);
 const notaCentral=(n,id)=>idAviso(id)&&n?.destinatario===c.papel&&['pendente','resolvida'].includes(n.estado)&&!n.escopo&&(n.origem?.tipo==='organizacao_i167'?n.link?.area==='organizacao'&&n.link?.demandaId===n.origem.id&&n.link?.cliente===n.origem.cliente&&n.link?.competencia===n.origem.competencia:['planejamento','calendario_revisao','calendario_envio'].includes(n.origem?.tipo)&&n.link?.ciclo===n.origem?.id);
 const vigente=()=>vivo&&root.isConnected!==false&&mesmaIdentidadeAvisosI165(c,contexto());
 const atual=e=>vigente()&&e===ciclo;
 const ativo=()=>estadoConfig==='confirmada'&&programacaoAtivaI165(config);
 const pushAtivo=()=>ativo()&&config.habilidades?.push===true;
 const ambienteBase=()=>ambiente.window.location.href;
 const swURL=()=>new URL('./firebase-messaging-sw.js',ambienteBase()).href;
 const pararCanal=()=>{foregroundSeq++;try{pararForeground?.();}catch{}pararForeground=null;sdkAtual=null;};
 function pararFilhos(){ciclo++;for(const p of [pararLista,pararSaude])try{p?.();}catch{}pararLista=pararSaude=null;pararCanal();aparelho=null;busy=false;}
 const controles='<button type="button" class="btn secondary" data-reconferir>Conferir avisos</button><button type="button" class="btn" data-ativar>Avisar neste aparelho</button>';
 root.innerHTML='<section class="card" style="border-color:#6198cb;margin:0 0 18px" aria-label="Avisos de conteúdos"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0;font-size:19px">Conteúdos que precisam de você <span data-contagem></span></h2><p style="margin:7px 0;color:#c9c9c9;font-size:13px" data-saude></p></div><div style="display:flex;gap:8px;flex-wrap:wrap">'+controles+'</div></div><p style="font-size:13px;margin:8px 0" role="status" aria-live="polite" data-estado></p><p style="font-size:12px;color:#c9c9c9" data-aparelho></p><div data-lista></div><small style="display:block;margin-top:10px;color:#c9c9c9">Abrir ou ler um aviso não conclui a atividade. O sistema acompanha o andamento na origem.</small></section>';
 const el=s=>root.querySelector(s);
 function render(){
  if(!vigente())return;
  root.hidden=!teveAtivo&&!teveCentral&&['conferindo','desligada'].includes(estadoConfig)&&['conferindo','desligada'].includes(estadoCentral);
  const anteriores=linhas.filter(n=>n.ativacaoId!==config?.ativacaoId),pendentes=[...linhas.filter(n=>n.estado==='pendente'&&n.ativacaoId===config?.ativacaoId),...linhasCentral.filter(n=>n.estado==='pendente')];
  const confirmada=(!teveAtivo||ativo()&&estadoLista==='confirmada')&&(!teveCentral||centralAtiva()&&listaCentral==='confirmada');
  el('[data-contagem]').textContent=confirmada?'· '+pendentes.length:pendentes.length?'· '+pendentes.length+' no último retrato':'';
  const postagemOk=ativo()&&estadoSaude==='confirmada'&&saudeAvisosI165(saude,ambiente.agora()),idadeCentral=ambiente.agora()-Date.parse(saudeCentral?.atualizadoEm||''),centralOk=centralAtiva()&&saudeCentral?.estado==='conferida'&&idadeCentral>=0&&idadeCentral<900000;
  el('[data-saude]').textContent=(teveAtivo?'Postagens: '+(postagemOk?'acompanhamento conferido. ':'acompanhamento a conferir. '):'')+(teveCentral?'Calendários: '+(centralOk?'acompanhamento conferido.':'acompanhamento a conferir.'):'')+(teveAtivo&&resumoSaudeCanaisI165(saude)?' '+resumoSaudeCanaisI165(saude):'')+(teveCentral&&resumoSaudeCanaisI165(saudeCentral)?' '+resumoSaudeCanaisI165(saudeCentral):'');
  el('[data-estado]').textContent=recado||(!confirmada?'Não consegui confirmar toda a fila agora. O último retrato foi preservado; isso não confirma fila vazia.':pendentes.length?'Abra o conteúdo para conferir o que precisa ser feito.':'Nenhum aviso pendente na última conferência do servidor.');
  el('[data-aparelho]').textContent=c.papel!==c.atorReal||c.delegada?'Para receber no aparelho, entre com o Google da própria pessoa.':ambiente.Notification?.permission==='denied'?'Os avisos estão bloqueados neste navegador. A fila continua no sistema.':aparelho?.pronto?'Você pode ativar os avisos neste aparelho. A entrega depende do navegador e do serviço.':aparelho?.motivo||'Conferindo se os avisos deste aparelho podem ser ativados.';
  el('[data-ativar]').disabled=busy||!ativo()||!aparelho?.pronto||ambiente.Notification?.permission==='denied';
  el('[data-lista]').innerHTML=pendentes.map(n=>{const confirmou=n._centralI164?centralAtiva()&&listaCentral==='confirmada':ativo()&&estadoLista==='confirmada';return '<div style="padding:12px 0;border-top:1px solid #444;display:flex;gap:12px;justify-content:space-between;align-items:center"><div><strong>'+esc(n.titulo||'Conteúdo para conferir')+'</strong><div style="font-size:13px;color:#ccc;margin-top:4px">'+esc(n.texto||'Confira o próximo passo na origem.')+'</div>'+(n.urgencia==='urgente'?'<b style="color:#ffbe65">Prioridade</b>':'')+(n.bloqueada?'<small style="display:block">Aguardando outra etapa.</small>':'')+(n.faseAviso==='atrasado'?'<small style="display:block;color:#ffbe65">O prazo passou. Confira este conteúdo.</small>':'')+(resumoCanalAvisoI165(n)?'<small style="display:block;color:#ffbe65">'+esc(resumoCanalAvisoI165(n))+'</small>':'')+'</div><button class="btn secondary" type="button" data-abrir="'+esc(n.id)+'" '+(!confirmou?'disabled':'')+'>Abrir conteúdo</button></div>';}).join('')+(anteriores.length?'<p style="font-size:12px;color:#c9c9c9">'+anteriores.length+' aviso(s) de fases anteriores preservado(s), fora da fila atual.</p>':'');
 }
 async function lerConfigFresh(){const s=await getDocFromServer(doc(db,'programacao_config_i165','ativo'));if(!vigente())throw Error('O acesso mudou. Abra o aviso no perfil original.');const d=dados(s);if(!programacaoAtivaI165(d))throw Error('O acompanhamento está pausado. A atividade continua na origem.');return d;}
 async function lerNota(id,{paraNotificar=false}={}){
  if(!vigente()||!idAviso(id))throw Error('Este aviso precisa ser conferido no acesso original.');
  const s=await getDocFromServer(doc(db,'notificacoes_operacionais_i165',id));if(!vigente())throw Error('O acesso mudou. Abra o aviso no perfil original.');
  const antiga=dados(s);if(central&&notaCentral(antiga,id)){
   if(antiga.origem?.tipo==='organizacao_i167'){
    const cfg=await lerConfigFresh();if(!vigente()||cfg.habilidades?.organizacao!==true)throw Error('Os avisos da organização estão pausados. A demanda continua no sistema.');if(paraNotificar&&cfg.habilidades?.push!==true)return null;
   }else{const processo=await getDocFromServer(doc(db,'processo_calendarios_i164','ativo'));if(!vigente()||!central.ativa(dados(processo)))throw Error('A rotina deste aviso está pausada. O histórico continua preservado.');}
   if(!await central.conferir({...antiga,id})||!vigente())throw Error('A origem deste aviso precisa ser conferida.');
   if(paraNotificar&&antiga.estado!=='pendente')return null;return {...antiga,id,_centralI164:true};
  }
  const cfg=await lerConfigFresh();if(paraNotificar&&cfg.habilidades?.push!==true)return null;
  if(!vigente())throw Error('O acesso mudou. Abra o aviso no perfil original.');
  const n=dados(s);if(!avisoFisicoI165(n,id,c.papel)||n.ativacaoId!==cfg.ativacaoId)throw Error('Este aviso mudou ou pertence a outro acesso. Confira a fila atual.');
  const r=await io.lerAviso(id);
  if(!vigente())throw Error('O acesso mudou. Abra o aviso no perfil original.');
  if(!r||r.id!==id||r.escopo!==n.escopo||r.destinatario!==n.destinatario||r.ativacaoId!==cfg.ativacaoId||r.fonte?.colecao!==n.fonte.colecao||r.fonte?.id!==n.fonte.id||r.fonteConferida!==true||r.leituraNaoResolve!==true||r.semAlterarEstadoPersistido!==true||!['pendente','resolvida'].includes(r.estado))throw Error('Não consegui confirmar a origem atual deste aviso. A atividade continua preservada.');
  const conferida={...n,estado:r.estado,estadoPersistido:r.estadoPersistido,fonteAvancou:r.fonteAvancou===true,pausada:r.pausada===true,bloqueada:r.bloqueada===true};
  if(paraNotificar&&(conferida.estado!=='pendente'||conferida.fonteAvancou||conferida.pausada||conferida.bloqueada))return null;
  return conferida;
 }
 async function abrir(id){
  const token=++abertura;
  try{const n=await lerNota(id);if(!vigente()||token!==abertura)return {abriu:false,contextoVigente:false};
   const resultado=await(n._centralI164?central.abrir(id):n.fonte.colecao==='videos_producao'?abrirEditor(n.fonte.id):abrirPostagem(n.fonte.id,n));
   if(!vigente()||token!==abertura)return {abriu:false,contextoVigente:false};
   if(resultado?.abriu===false||resultado===false)throw Error('A origem mudou de etapa. Confira a fila atual.');
   recado=n.estado==='resolvida'?'Este aviso já avançou. A origem atual foi aberta.':'Conteúdo aberto. A pendência só sai quando a atividade avançar na origem.';render();
   const u=new URL(ambienteBase());if(u.searchParams.get('avisoI165')===id){u.searchParams.delete('avisoI165');ambiente.window.history.replaceState(null,'',u.href);}
   return {abriu:true,contextoVigente:true};
  }catch(e){if(vigente()&&token===abertura){recado=e.message||'Não consegui conferir o aviso agora.';render();}return {abriu:false,contextoVigente:vigente()};}
 }
 async function preConferir(e){
  if(!pushAtivo()){aparelho={pronto:false,motivo:'Os avisos de aparelho ainda não estão ligados. A fila continua no sistema.'};render();return null;}
  if(c.papel!==c.atorReal||c.delegada){aparelho={pronto:false,motivo:'Use o Google da própria pessoa para ativar este aparelho.'};render();return null;}
  if(!ambiente.Notification||!ambiente.serviceWorker||!ambiente.crypto?.subtle){aparelho={pronto:false,motivo:'Este navegador não oferece os avisos de aparelho necessários. A fila continua no sistema.'};render();return null;}
  try{
   const [g,s,web]=await Promise.all([io.confirmarGoogle(),getDocFromServer(doc(db,'usuarios_equipe',c.email)),getDocFromServer(doc(db,'config_notificacoes_i165','web'))]);
   if(!atual(e)||!ativo())return null;
   if(!cadastroProprioAvisosI165(c,g,dados(s)))throw Error('O Google e o cadastro ativo da própria pessoa precisam ser confirmados.');
   const opcoesVapid=opcoesVapidAvisosI165(dados(web));
   aparelho={pronto:true,opcoesVapid};render();return aparelho;
  }catch(err){if(atual(e)){aparelho={pronto:false,motivo:err.message||'Não consegui conferir este aparelho.'};render();}return null;}
 }
 async function prepararForeground(e){
  if(!atual(e)||!pushAtivo()||!aparelho?.pronto||ambiente.Notification.permission!=='granted'||pararForeground)return;
  const f=++foregroundSeq;
  try{const sdk=await ambiente.carregarMessaging();if(!atual(e)||!pushAtivo()||f!==foregroundSeq)return;const m=sdk.getMessaging(io.app);
   const parar=sdk.onMessage(m,async p=>{
    if(!atual(e)||!pushAtivo())return;
    try{const n=await lerNota(p?.data?.id,{paraNotificar:true});if(!n||!atual(e)||!pushAtivo())return;
     const reg=await ambiente.serviceWorker.getRegistration(swURL());if(!atual(e)||!pushAtivo()||!reg)return;
     await reg.showNotification('Get · Conteúdos',{body:'Tem uma ação de conteúdo para você conferir no sistema.',tag:'i165_'+n.id,data:{link:linkAvisoI165(n.id)}});
    }catch{/* O feed preserva a pendência; não interpretar falha como resolução. */}
   });
   if(!atual(e)||!pushAtivo()||f!==foregroundSeq){parar?.();return;}pararForeground=parar;sdkAtual=sdk;
  }catch{/* Sem alegar entrega quando o canal não foi confirmado. */}
 }
 function linkAvisoI165(id){const u=new URL('./escritorio.html',ambienteBase());u.searchParams.set('avisoI165',id);return u.href;}
 async function ativar(){
  if(!vigente()||!pushAtivo()||!aparelho?.pronto||busy||c.papel!==c.atorReal||c.delegada||ambiente.Notification?.permission==='denied')return false;
  const e=ciclo;busy=true;recado='Conferindo os avisos deste aparelho…';render();
  try{
   // O pedido nasce do clique, antes de qualquer await; nunca de um listener.
   const permissao=ambiente.Notification.permission==='granted'?'granted':ambiente.Notification.requestPermission();
   if(await permissao!=='granted')throw Error('Os avisos não foram permitidos neste navegador. A fila continua no sistema.');
   const cfg=await lerConfigFresh();if(!atual(e)||!pushAtivo()||cfg.ativacaoId!==config.ativacaoId||cfg.habilidades?.push!==true)return false;
   const a=await preConferir(e);if(!a||!atual(e)||!ativo())return false;
   const sdk=sdkAtual||await ambiente.carregarMessaging();if(!atual(e)||!ativo())return false;
   const reg=await ambiente.serviceWorker.register(swURL());if(!atual(e)||!ativo())return false;
   const token=await sdk.getToken(sdk.getMessaging(io.app),{...a.opcoesVapid,serviceWorkerRegistration:reg});if(!atual(e)||!ativo())return false;
   if(typeof token!=='string'||!token)throw Error('O navegador não confirmou o aparelho.');
   const hash=Array.from(new Uint8Array(await ambiente.crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
   if(!atual(e)||!ativo())return false;
   // Rules revalidam Google/cadastro/config; este lote não altera nenhuma fonte.
   await io.escreverDispositivo({uid:c.uid,pessoa:c.atorReal,token,hash});
   if(!atual(e)||!ativo())return false;
   recado='Aparelho registrado. Os avisos também continuam na fila do sistema.';await prepararForeground(e);return true;
  }catch(err){if(atual(e))recado=err.message||'Não consegui confirmar este aparelho. A fila continua no sistema.';return false;}
  finally{if(atual(e)){busy=false;render();}}
 }
 let pendenteURL;try{pendenteURL=new URL(ambienteBase()).searchParams.get('avisoI165');}catch{}
 function acompanhar(cfg){
  pararFilhos();config=cfg;estadoLista='conferindo';estadoSaude='conferindo';teveAtivo=true;const e=ciclo;
  const q=query(collection(db,'notificacoes_operacionais_i165'),where('destinatario','==',c.papel),where('escopo','==',ESCOPO_AVISOS_I165));
  pararLista=onSnapshot(q,{includeMetadataChanges:true},s=>{
   if(!atual(e))return;if(s.metadata?.fromCache){estadoLista='cache';render();return;}
   const novas=s.docs.map(d=>({...d.data(),_id:d.id}));if(novas.some(n=>!avisoFisicoI165(n,n._id,c.papel))){estadoLista='erro_contrato';recado='Há um aviso que precisa de conferência. O último retrato foi preservado.';render();return;}
   linhas=novas.map(({_id,...n})=>n);estadoLista='confirmada';recado='';render();
  },()=>{if(atual(e)){estadoLista='erro';recado='Não consegui conferir os avisos agora. O último retrato foi preservado.';render();}});
  pararSaude=onSnapshot(doc(db,'servicos_i165','estado'),{includeMetadataChanges:true},s=>{if(!atual(e))return;if(s.metadata?.fromCache){estadoSaude='cache';render();return;}saude=dados(s);estadoSaude='confirmada';render();},()=>{if(atual(e)){estadoSaude='erro';render();}});
  preConferir(e).then(a=>{if(a&&atual(e))prepararForeground(e);});
  if(pendenteURL&&idAviso(pendenteURL)){const id=pendenteURL;pendenteURL=null;abrir(id);}
 }
 function pararListaCentral(){centralSeq++;for(const off of [pararCentralLista,pararCentralSaude])try{off?.();}catch{}pararCentralLista=pararCentralSaude=null;}
 function assinarCentral(){
  if(!central)return;const configToken=++centralConfigSeq;try{pararCentralConfig?.();}catch{}
  pararCentralConfig=onSnapshot(doc(db,'processo_calendarios_i164','ativo'),{includeMetadataChanges:true},snap=>{
   if(!vigente()||configToken!==centralConfigSeq)return;if(snap.metadata?.fromCache){estadoCentral='cache';render();return;}const cfg=dados(snap);pararListaCentral();cfgCentral=cfg;
   if(!central.ativa(cfg)&&!(ativo()&&config.habilidades?.organizacao===true)){estadoCentral='desligada';render();return;}estadoCentral='confirmada';listaCentral='conferindo';teveCentral=true;const consultaToken=centralSeq;
   const q=query(collection(db,'notificacoes_operacionais_i165'),where('destinatario','==',c.papel),where('origem.tipo','in',central.ativa(cfg)?['planejamento','calendario_revisao','calendario_envio','organizacao_i167']:['organizacao_i167']));
   pararCentralLista=onSnapshot(q,{includeMetadataChanges:true},s=>{if(!vigente()||consultaToken!==centralSeq)return;if(s.metadata?.fromCache){listaCentral='cache';render();return;}const novas=s.docs.map(d=>({...d.data(),id:d.id,_centralI164:true}));if(novas.some(n=>!notaCentral(n,n.id))){listaCentral='erro';recado='Há um aviso de calendário que precisa de conferência. O retrato anterior foi preservado.';render();return;}linhasCentral=novas;listaCentral='confirmada';render();},()=>{if(vigente()&&consultaToken===centralSeq){listaCentral='erro';render();}});
   pararCentralSaude=onSnapshot(doc(db,'config_notificacoes_i165','estado'),{includeMetadataChanges:true},s=>{if(vigente()&&consultaToken===centralSeq){saudeCentral=s.metadata?.fromCache?null:dados(s);render();}},()=>{if(vigente()&&consultaToken===centralSeq){saudeCentral=null;render();}});
   if(pendenteURL&&idAviso(pendenteURL)){const id=pendenteURL;pendenteURL=null;abrir(id);}render();
  },()=>{if(vigente()&&configToken===centralConfigSeq){estadoCentral='erro';pararListaCentral();render();}});
 }
 function assinarConfig(){
  const seq=++configSeq;try{pararConfig?.();}catch{}estadoConfig='conferindo';render();
  pararConfig=onSnapshot(doc(db,'programacao_config_i165','ativo'),{includeMetadataChanges:true},s=>{
   if(!vigente()||seq!==configSeq)return;
   if(s.metadata?.fromCache){estadoConfig='cache';pararFilhos();render();return;}
   const cfg=dados(s);if(!programacaoAtivaI165(cfg)){estadoConfig='desligada';config=cfg;pararFilhos();render();return;}
   estadoConfig='confirmada';acompanhar(cfg);assinarCentral();render();
  },()=>{if(vigente()&&seq===configSeq){estadoConfig='erro';pararFilhos();recado='Não consegui confirmar o acompanhamento agora. O último retrato foi preservado.';render();}});
 }
 const click=ev=>{const b=ev.target?.closest?.('[data-abrir],[data-ativar],[data-reconferir]');if(!b||!root.contains(b)||!vigente())return;if(b.hasAttribute('data-abrir'))abrir(b.getAttribute('data-abrir'));else if(b.hasAttribute('data-ativar'))ativar();else{assinarConfig();assinarCentral();}};
 const mensagem=ev=>{if(!vigente()||ev.data?.tipo!=='abrir_aviso_i165'||!idAviso(ev.data.id))return;let origem;try{origem=new URL(ev.source?.scriptURL);}catch{return;}if(origem.href!==swURL()||ev.origin&&ev.origin!==new URL(ambienteBase()).origin)return;ev.ports?.[0]?.postMessage({recebido:true});abrir(ev.data.id);};
 root.addEventListener('click',click);ambiente.serviceWorker?.addEventListener('message',mensagem);
 const timer=ambiente.setInterval(()=>{if(vigente())render();},60000);
 assinarConfig();assinarCentral();render();
 return {abrir,ativar,reconferir:assinarConfig,estado:()=>({estadoConfig,estadoLista,estadoSaude,linhas:structuredClone(linhas),aparelhoPronto:!!aparelho?.pronto,ciclo,vivo}),destroy(){if(!vivo)return;vivo=false;abertura++;pararFilhos();pararListaCentral();try{pararCentralConfig?.();}catch{}pararCentralConfig=null;try{pararConfig?.();}catch{}pararConfig=null;ambiente.clearInterval(timer);ambiente.serviceWorker?.removeEventListener('message',mensagem);root.removeEventListener('click',click);root.replaceChildren();root.hidden=true;}};
}
