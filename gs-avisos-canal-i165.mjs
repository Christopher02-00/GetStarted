import {avisosSemDuplicacaoPublicacaoCp125} from './gs-fila-publicacoes-cp125.mjs?v=6b8f5f63f600dfda6e54a987ebd923c79659e9d77828bead696c9378bef74c37';
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

export const ESCOPO_AVISOS_CENTRAL_R87='central_i164';
const TIPOS_CENTRAL_R87=['planejamento','calendario_revisao','calendario_envio','organizacao_i167','demanda_refazer_i161','providencia_gravacao_cp140','providencia_vinculada_cp146'];
const cicloCentralR87=x=>typeof x==='string'&&/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(x);
const mesCentralR87=x=>typeof x==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(x);
const clienteCentralR87=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._-]{0,119}$/.test(x);
function tipoNovoCp109(tipo){return ['referencias_cp109','planejamento_estrategico_cp109','plano_acao_cp109'].includes(tipo);}
export function ordenarAvisosAgendamentoCp110(avisos){
 return avisos.map((n,i)=>({n,i,p:n.tipo==='demanda_refazer_i161'?8:(n.faseAviso==='atrasado'?4:0)+(n.urgencia==='urgente'?2:0)+(n.bloqueada?0:1)})).sort((a,b)=>b.p-a.p||a.i-b.i).map(x=>x.n);
}
export function listaAvisosAgendamentoCp110(avisos,confirmada){
 const linhas=ordenarAvisosAgendamentoCp110(avisos).map(n=>'<article '+(tipoNovoCp109(n.tipo)?'data-aviso-cp109="'+esc(n.tipo)+'" ':'')+'data-aviso-cp110="'+esc(n.id)+'" style="padding:12px 0;border-top:1px solid #555;display:flex;gap:12px;justify-content:space-between;align-items:center"><div><strong>'+esc(n.titulo||'Conteúdo para conferir')+'</strong><div style="font-size:13px;color:#ddd;margin-top:4px;white-space:pre-wrap">'+esc(n.texto||'Confira a orientação na origem antes de continuar.')+'</div>'+(n.faseAviso==='atrasado'?'<b style="display:block;color:#ffbe65">Prazo passado · precisa de atenção</b>':'')+(n.urgencia==='urgente'?'<b style="display:block;color:#ffbe65">Prioridade da fila</b>':'')+(n.bloqueada?'<small style="display:block">Aguardando a etapa indicada na origem.</small>':'')+(resumoCanalAvisoI165(n)?'<small style="display:block;color:#ffbe65">'+esc(resumoCanalAvisoI165(n))+'</small>':'')+'</div><button class="btn secondary" type="button" data-abrir="'+esc(n.id)+'" '+(!confirmada?'disabled':'')+'>'+(n.tipo==='demanda_refazer_i161'?'Ver o ajuste pedido':['providencia_gravacao_cp140','providencia_vinculada_cp146'].includes(n.tipo)?'Conferir providência':'Conferir conteúdo')+'</button></article>');
 return linhas.slice(0,6).join('')+(linhas.length>6?'<details data-demais-avisos-cp110 style="border-top:1px solid #555;padding:12px 0"><summary style="cursor:pointer;font-weight:700">Conferir mais '+(linhas.length-6)+' pendências desta lista</summary>'+linhas.slice(6).join('')+'</details>':'');
}
function idFisicoCp109(v){return typeof v==='string'&&/^[A-Za-z0-9_.-]{1,180}$/.test(v)&&!['.','..'].includes(v);}
function avisoFisicoCp109(d,id,papel,{ativacaoCentralId='',fresco=false}={}){
 if(!/^[a-f0-9]{64}$/.test(id)||d?.schema!==1||d.id!==id||d.escopo!==ESCOPO_AVISOS_CENTRAL_R87||d.destinatario!==papel||!tipoNovoCp109(d.tipo)||d.origem?.tipo!==d.tipo||!/^[a-f0-9]{64}$/.test(d.versao||'')||!['pendente','resolvida'].includes(d.estado)||typeof d.ativacaoId!=='string'||d.ativacaoId.length<12||!fresco&&d.ativacaoId!==ativacaoCentralId||d.origem.origemEditorial!==undefined)return false;
 const o=d.origem,tipo=d.tipo;
 if(tipo==='referencias_cp109'){
  if(papel!=='Gabrielle'||!['diario','reprovada'].includes(o.subtipo))return false;
  if(o.subtipo==='diario'){
   if(!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(o.dia||'')||o.id!=='diario_'+o.dia||o.competencia!==o.dia.slice(0,7)||d.fonte?.colecao!=='notificacoes_operacionais_i165'||d.fonte.id!==d.id)return false;
  }else if(!/^decisao_[a-f0-9]{64}$/.test(o.id||'')||!['referencias','referencias_cliente'].includes(o.colecao)||d.fonte?.colecao!==o.colecao||d.fonte.id!==o.referenciaId||!idFisicoCp109(o.referenciaId)||!idFisicoCp109(o.operacao)||!clienteCentralR87(o.cliente)||!mesCentralR87(o.competencia))return false;
 }else{
  if(!cicloCentralR87(o.id)||o.cliente!==o.id.slice(9)||o.competencia!==o.id.slice(0,7)||d.fonte?.id!==o.id)return false;
  if(tipo==='planejamento_estrategico_cp109'){
   if(d.fonte.colecao!=='planejamento_estrategico_cp109'||!['roteiros','revisao','retorno','envio'].includes(o.etapa)||o.ativacaoId!==d.ativacaoId||papel!==(o.etapa==='revisao'?'Amanda':o.etapa==='envio'?'Cecília':'Chris'))return false;
  }else if(d.fonte.colecao!=='planos_acao_cp109'||papel!=='Amanda'||o.subtipo!=='solicitacao_conteudo'||!idFisicoCp109(o.acaoId)||!idFisicoCp109(o.operacao))return false;
 }
 if(d.fonteAvancou===true||d.estado==='resolvida')return d.link===null;
 const l=d.link;if(!l||typeof l!=='object'||Array.isArray(l))return false;
 if(tipo==='referencias_cp109')return l.area==='referencias_cp109'&&l.competencia===o.competencia&&(o.subtipo==='diario'?(l.cliente||'')==='':l.cliente===o.cliente);
 if(tipo==='plano_acao_cp109')return l.area==='planos_cp109'&&l.cliente===o.cliente&&l.competencia===o.competencia&&l.acaoId===o.acaoId&&idFisicoCp109(l.demandaId);
 return l.area==='estrategico_cp109'&&l.ciclo===o.id&&l.cliente===o.cliente&&l.competencia===o.competencia&&l.etapa===o.etapa;
}
export function avisoFisicoCentralR87(d,id,papel,{ativacaoI165='',ativacaoCentralId='',fresco=false}={}){
 if(tipoNovoCp109(d?.tipo))return avisoFisicoCp109(d,id,papel,{ativacaoCentralId,fresco});
 if(!idAviso(id)||d?.schema!==1||d.id!==id||d.escopo!==ESCOPO_AVISOS_CENTRAL_R87||d.destinatario!==papel||!TIPOS_CENTRAL_R87.includes(d.tipo)||d.origem?.tipo!==d.tipo||!idValido(d.origem?.id)||d.fonte?.id!==d.origem.id||!/^[a-f0-9]{64}$/.test(d.versao||'')||!['pendente','resolvida'].includes(d.estado)||typeof d.ativacaoId!=='string'||d.ativacaoId.length<12)return false;
 const org=d.tipo==='organizacao_i167',devolucao=d.tipo==='demanda_refazer_i161',providencia=d.tipo==='providencia_gravacao_cp140',vinculo=d.tipo==='providencia_vinculada_cp146',legado=d.origem.origemEditorial==='continuar_legado';
 if(d.origem.origemEditorial!==undefined&&!legado)return false;
 if(d.fonte.colecao!==(providencia?'providencias_gravacao_cp140':org||devolucao||vinculo?'demandas':legado?'continuidade_calendarios_i164':'planejamento_social_i155'))return false;
 if(org||devolucao||providencia||vinculo?d.ativacaoId!==ativacaoI165:!fresco&&d.ativacaoId!==ativacaoCentralId)return false;
 if(d.tipo==='calendario_revisao'&&papel!=='Amanda'||d.tipo==='calendario_envio'&&papel!=='Cecília'||d.tipo==='planejamento'&&!['Chris','Amanda','Gabrielle'].includes(papel)||papel==='Gabrielle'&&d.tipo==='planejamento'&&d.origem.etapa!=='pesquisa')return false;
 if(devolucao&&(!/^[a-f0-9]{64}$/.test(id)||!idValido(d.origem.operacao)||d.origem.operacao.length<8||Object.keys(d.origem).some(k=>!['tipo','id','operacao'].includes(k))))return false;
 if(providencia&&(!['Cecília','Amanda'].includes(papel)||!/^[a-f0-9]{64}$/.test(id)||!/^prov140_[a-f0-9]{64}$/.test(d.origem.id)||Object.keys(d.origem).some(k=>!['tipo','id'].includes(k))))return false;
 if(vinculo&&(!['Cecília','Amanda','Chris'].includes(papel)||!/^[a-f0-9]{64}$/.test(id)||d.origem.id.startsWith('prov140_')||Object.keys(d.origem).some(k=>!['tipo','id'].includes(k))))return false;
 if(!org&&!devolucao&&!providencia&&!vinculo&&!cicloCentralR87(d.origem.id))return false;
 if(d.fonteAvancou===true||d.estado==='resolvida')return d.link===null;
 const l=d.link;if(!l||typeof l!=='object'||Array.isArray(l))return false;
 if(providencia)return l.area==='providencia_gravacao'&&l.demandaId===d.origem.id&&clienteCentralR87(l.cliente)&&mesCentralR87(l.competencia)&&Object.keys(l).every(k=>['area','demandaId','cliente','competencia'].includes(k));
 if(vinculo)return l.area==='providencia_vinculada_cp146'&&l.demandaId===d.origem.id&&clienteCentralR87(l.cliente)&&mesCentralR87(l.competencia)&&Object.keys(l).every(k=>['area','demandaId','cliente','competencia'].includes(k));
 if(devolucao)return l.area==='demanda_refazer'&&l.demandaId===d.origem.id&&l.operacao===d.origem.operacao&&Object.keys(l).every(k=>['area','demandaId','operacao'].includes(k));
 if(org)return l.area==='organizacao'&&l.demandaId===d.origem.id&&clienteCentralR87(l.cliente)&&mesCentralR87(l.competencia)&&l.cliente===d.origem.cliente&&l.competencia===d.origem.competencia&&typeof (l.empresaId??'')==='string'&&(l.empresaId??'').length<=80;
 if(l.ciclo!==d.origem.id||!mesCentralR87(l.competencia)||!l.ciclo.startsWith(l.competencia+'__')||(l.origemEditorial||'')!==(d.origem.origemEditorial||''))return false;
 if(d.tipo==='planejamento')return l.area==='planejar'&&['pesquisa','previa','reuniao','consolidado','criacao','revisao','disponivel'].includes(l.etapa)&&l.etapa===d.origem.etapa;
 return l.area===(d.tipo==='calendario_revisao'?'aprovar':'enviar')&&clienteCentralR87(l.cliente)&&l.cliente===d.origem.cliente&&l.competencia===d.origem.competencia&&l.ciclo===l.competencia+'__'+l.cliente;
}
export function avisoHabilitadoNoFeedR87(n,id,papel,config,{ativacaoCentralId='',fresco=false}={}){
 if(n?.escopo===ESCOPO_AVISOS_CENTRAL_R87)return programacaoAtivaI165(config)&&(!['providencia_gravacao_cp140','providencia_vinculada_cp146'].includes(n.tipo)||config.habilidades?.preparacaoCentral===true)&&avisoFisicoCentralR87(n,id,papel,{ativacaoI165:config.ativacaoId,ativacaoCentralId,fresco});
 return avisoFisicoI165(n,id,papel)&&n.ativacaoId===config?.ativacaoId&&fontesAvisosHabilitadasI165(config).includes(n.fonte?.colecao);
}

export function saudeAvisosI165(d,agora=Date.now()){
 const t=Date.parse(d?.ultimaExecucao||'');return d?.escopo===ESCOPO_AVISOS_I165&&d.estado==='conferido'&&Number.isFinite(t)&&agora-t>=-60000&&agora-t<=15*60000;
}
export function resumoCanalAvisoI165(n){
 if(n?.canais?.push?.motivoCodigo==='sem_aparelho_ativo')return 'Os avisos deste aparelho ainda não foram ativados com o Google da própria pessoa. A atividade continua nesta fila.';
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
export const VERSAO_SERVICO_AVISOS_I171='get-i171-ativacao-explicita-r86-v1';
let sequenciaServicoI171=0;
export function conferirVersaoWorkerI171(worker,{vigente=()=>true,MessageChannel=globalThis.MessageChannel,timeoutMs=1200,programar=(f,t)=>globalThis.setTimeout(f,t),cancelarTimer=t=>globalThis.clearTimeout(t)}={}){
 if(!worker||!vigente()||typeof MessageChannel!=='function')return Promise.resolve(false);
 return new Promise(resolve=>{let fim=false,timer;const canal=new MessageChannel(),nonce='sw_i171_'+Date.now()+'_'+(++sequenciaServicoI171);
  const concluir=v=>{if(fim)return;fim=true;cancelarTimer(timer);canal.port1.close();canal.port2.close();resolve(v&&vigente());};
  canal.port1.onmessage=e=>concluir(e.data?.tipo==='versao_avisos_i171'&&e.data.nonce===nonce&&e.data.versao===VERSAO_SERVICO_AVISOS_I171);
  timer=programar(()=>concluir(false),timeoutMs);
  try{worker.postMessage({tipo:'conferir_versao_avisos_i171',nonce},[canal.port2]);}catch{concluir(false);}
 });
}
export function ativarWorkerEsperandoI171(reg,worker,{serviceWorker,vigente=()=>true,timeoutMs=20000,programar=(f,t)=>globalThis.setTimeout(f,t),cancelarTimer=t=>globalThis.clearTimeout(t)}={}){
 let encerrar=()=>{};
 const pronto=new Promise((resolve,reject)=>{let fim=false,timer;const controleAnterior=serviceWorker?.controller;
  const limpar=()=>{cancelarTimer(timer);worker?.removeEventListener?.('statechange',verificar);serviceWorker?.removeEventListener?.('controllerchange',verificar);};
  const concluir=code=>{if(fim)return;fim=true;limpar();if(code)reject(Object.assign(Error('A versão dos avisos não confirmou a ativação.'),{code}));else resolve(reg);};
  function verificar(){if(fim)return;if(!vigente()){concluir('i165/sw-contexto');return;}if(worker?.state==='redundant'){concluir('i165/sw-falha');return;}if(reg?.active===worker&&worker?.state==='activated'&&(!controleAnterior||serviceWorker?.controller===worker))concluir();}
  encerrar=()=>concluir('i165/sw-contexto');
  if(!vigente()||!worker||reg?.waiting!==worker){concluir('i165/sw-contexto');return;}
  timer=programar(()=>concluir(vigente()?'i165/sw-tempo':'i165/sw-contexto'),timeoutMs);worker.addEventListener?.('statechange',verificar);serviceWorker?.addEventListener?.('controllerchange',verificar);
  try{worker.postMessage({tipo:'ativar_versao_avisos_i171',versao:VERSAO_SERVICO_AVISOS_I171});}catch{concluir('i165/sw-falha');}verificar();
 });
 return {pronto,cancelar:()=>encerrar()};
}
export function mensagemAtivacaoAvisosI165(err){
 if(err?.code==='i165/renovacao-contexto')return 'O perfil mudou durante a renovação. Volte ao seu próprio perfil; nenhum aparelho de outra pessoa foi registrado.';
 if(err?.code==='i165/renovacao-legado')return 'Não consegui finalizar a troca de um registro antigo dos avisos neste navegador. Recarregue a página e confira novamente; sua fila e a tentativa anterior continuam guardadas.';
 if(err?.code==='i165/renovacao-falha')return 'Não consegui renovar o registro deste navegador agora. A fila e a tentativa de teste anterior continuam preservadas.';
 if(err?.code==='i165/sw-tempo')return 'Os avisos do navegador ainda estão iniciando. Aguarde um pouco e tente novamente; a fila continua no sistema.';
 if(err?.code==='i165/sw-contexto')return 'A ativação foi interrompida. Confira seu perfil antes de tentar novamente.';
 if(err?.code==='i165/sw-falha'||err?.code==='messaging/failed-service-worker-registration')return 'O serviço de avisos do navegador não iniciou. Recarregue o site e tente novamente; a fila continua no sistema.';
 const locais=new Set(['O Google e o cadastro ativo da própria pessoa precisam ser confirmados.','Precisa conferir a chave de avisos. A fila continua no sistema.','O canal de aparelho ainda precisa ser configurado. A fila continua no sistema.','Os avisos não foram permitidos neste navegador. A fila continua no sistema.','O navegador não confirmou o aparelho.','Não consegui confirmar o registro deste aparelho.']);
 if(locais.has(err?.message))return err.message;
 return 'Não consegui ativar os avisos deste aparelho agora. Recarregue o site e tente novamente; a fila continua no sistema.';
}
// Cache FCM é por appId. Somente o escopo padrão push-only deste Get pode ser reconciliado.
// A API Window não comprova Clients0 ou execução stopped; nenhum desses estados é inferido.
export async function reconciliarEscopoLegadoProprioCp146({serviceWorker,regRaiz,app,baseURL,vigente=()=>false,timeoutMs=10000,programar=(f,t)=>globalThis.setTimeout(f,t),cancelarTimer=t=>globalThis.clearTimeout(t)}={}){
 const erro=(reason)=>Object.assign(Error('A inscrição antiga dos avisos precisa de conferência.'),{code:'i165/renovacao-legado',reason});
 const check=()=>{if(!vigente())throw Object.assign(Error('Contexto alterado.'),{code:'i165/renovacao-contexto'});};
 check();let u;try{u=new URL(baseURL);}catch{throw erro('origem');}
 if(!['https://get-started.agency','https://www.get-started.agency'].includes(u.origin)||u.username||u.password||app?.options?.projectId!=='get-started-4956d'||app?.options?.appId!=='1:27813235721:web:38c8e840153e2ae3853cd8'||typeof serviceWorker?.getRegistrations!=='function')throw erro('aplicacao');
 const scopeRaiz=u.origin+'/',scopeLegado=u.origin+'/firebase-cloud-messaging-push-scope',script=u.origin+'/firebase-messaging-sw.js',workerRaiz=regRaiz?.active,controlador=serviceWorker.controller;
 function raiz(){check();if(regRaiz?.scope!==scopeRaiz||regRaiz.installing||regRaiz.waiting||!workerRaiz||regRaiz.active!==workerRaiz||workerRaiz.state!=='activated'||workerRaiz.scriptURL!==script||serviceWorker.controller!==controlador||typeof regRaiz.pushManager?.getSubscription!=='function')throw erro('raiz_mudou');}
 const bytes=b=>{if(b==null)throw erro('inscricao');try{return Array.from(new Uint8Array(b)).join(',');}catch{throw erro('inscricao');}};
 const assinatura=s=>{if(s===null)return null;if(!s||typeof s.endpoint!=='string'||!s.endpoint||typeof s.getKey!=='function')throw erro('inscricao');return JSON.stringify([s.endpoint,bytes(s.getKey('auth')),bytes(s.getKey('p256dh')),s.options?.applicationServerKey==null?null:bytes(s.options.applicationServerKey)]);};
 raiz();const subRaiz=await regRaiz.pushManager.getSubscription();raiz();const assinaturaRaiz=assinatura(subRaiz);
 async function registros(){raiz();const regs=await serviceWorker.getRegistrations();raiz();if(!Array.isArray(regs)||regs.length>100)throw erro('registros');const roots=regs.filter(r=>r.scope===scopeRaiz);if(roots.length!==1||roots[0].active!==workerRaiz||roots[0].waiting||roots[0].installing)throw erro('raiz_mudou');return regs;}
 async function conferirRaiz(){const atual=await regRaiz.pushManager.getSubscription();raiz();if(assinatura(atual)!==assinaturaRaiz)throw erro('inscricao_raiz_mudou');}
 let regs=await registros();raiz();const legados=regs.filter(r=>r.scope===scopeLegado);if(legados.length>1)throw erro('ambiguo');
 if(!legados.length){await conferirRaiz();raiz();return {reconciliado:true,legadoEncontrado:false,unregister:0,semTesteAutomatico:true};}
 const legado=legados[0],workerAntigo=legado.active;
 const conferirLegado=()=>{raiz();if(legado.scope!==scopeLegado||legado===regRaiz||legado.installing||legado.waiting||!workerAntigo||legado.active!==workerAntigo||workerAntigo.scriptURL!==script||workerAntigo.state!=='activated'||workerAntigo===workerRaiz||workerAntigo===controlador||typeof legado.unregister!=='function'||typeof legado.pushManager?.getSubscription!=='function')throw erro('legado_ambiguo');};
 conferirLegado();const subAntiga=await legado.pushManager.getSubscription();conferirLegado();if(subAntiga&&(typeof subAntiga.unsubscribe!=='function'||typeof subAntiga.endpoint!=='string'||!subAntiga.endpoint))throw erro('inscricao_legada');if(legado.pushManager===regRaiz.pushManager||subAntiga&&subRaiz&&(subAntiga===subRaiz||subAntiga.endpoint===subRaiz.endpoint))throw erro('inscricao_compartilhada');
 regs=await registros();conferirLegado();if(regs.filter(r=>r.scope===scopeLegado).length!==1||regs.find(r=>r.scope===scopeLegado).active!==workerAntigo)throw erro('legado_mudou');await conferirRaiz();conferirLegado();
 const retirou=await legado.unregister();raiz();if(retirou!==true)throw erro('unregister_nao_confirmado');
 if(workerAntigo.state!=='redundant')await new Promise((resolve,reject)=>{let fim=false,timer;const limpar=()=>{cancelarTimer(timer);workerAntigo.removeEventListener?.('statechange',verificar);};const encerrar=e=>{if(fim)return;fim=true;limpar();e?reject(e):resolve();};function verificar(){try{raiz();if(legado.waiting||legado.installing)throw erro('legado_em_transicao');if(workerAntigo.state==='redundant')encerrar();}catch(e){encerrar(e);}}timer=programar(()=>{try{raiz();encerrar(erro('tempo'));}catch(e){encerrar(e);}},timeoutMs);workerAntigo.addEventListener?.('statechange',verificar);verificar();});
 raiz();if(legado.waiting||legado.installing)throw erro('legado_em_transicao');regs=await registros();raiz();if(regs.some(r=>r.scope===scopeLegado))throw erro('legado_recriado');
 if(subAntiga){const ok=await subAntiga.unsubscribe();raiz();if(ok!==true&&ok!==false)throw erro('unsubscribe_nao_confirmado');}
 const restante=await legado.pushManager.getSubscription();raiz();if(restante!==null)throw erro('inscricao_legada_persistiu');
 await conferirRaiz();raiz();regs=await registros();raiz();if(regs.some(r=>r.scope===scopeLegado))throw erro('legado_recriado');
 return {reconciliado:true,legadoEncontrado:true,unregister:1,semTesteAutomatico:true};
}

// Somente APIs públicas: gira a inscrição deste SW; nunca apaga Auth ou o banco do navegador.
export async function renovarTokenProprioCp146({sdk,messaging,reg,opcoes={},vigente=()=>false,tokenAnterior=''}={}){
 const check=()=>{if(!vigente())throw Object.assign(Error('Contexto alterado.'),{code:'i165/renovacao-contexto'});},fail=()=>{throw Object.assign(Error('A renovação deste navegador não foi confirmada.'),{code:'i165/renovacao-falha'});};check();if(typeof sdk?.deleteToken!=='function'||typeof sdk?.getToken!=='function'||!reg)fail();
 let antigo=tokenAnterior;
 // getToken associa publicamente o SW correto antes de deleteToken; a instância nova não usa um SW padrão diferente.
 try{const atual=await sdk.getToken(messaging,{...opcoes,serviceWorkerRegistration:reg});check();if(typeof atual==='string'&&atual)antigo=atual;}catch(err){check();if(err?.code!=='messaging/token-update-failed')throw err;}
 try{const apagou=await sdk.deleteToken(messaging);check();if(apagou!==true)fail();}catch(err){check();if(err?.code!=='messaging/token-unsubscribe-failed')throw err;
  // Um token já revogado pode retornar404 antes do SDK limpar seu cache. Nova inscrição faz o próprio SDK renovar só esse cache.
  if(typeof reg.pushManager?.getSubscription!=='function')fail();const sub=await reg.pushManager.getSubscription();check();if(sub){const ok=await sub.unsubscribe();check();if(ok!==true)fail();}
 }
 check();const token=await sdk.getToken(messaging,{...opcoes,serviceWorkerRegistration:reg});check();if(typeof token!=='string'||!token||antigo&&token===antigo)fail();return token;
}
export function montarAvisosCanalI165(root,{io,contexto,abrirEditor,abrirPostagem,abrirCentral,central=null,publicacoesUnificadas=false,coberturaPublicacoes=()=>null,atualizarPublicacoes=()=>{},ambiente=ambientePadrao()}={}){
 if(!root||!io||central||typeof contexto!=='function')throw Error('Os avisos precisam de acesso confirmado.');
 const c=Object.freeze({...contexto()});
 let vivo=true,ciclo=0,linhas=[],ativacaoCentralId='',config=null,web=null,cadastro=null,saude=null,estadoConfig='conferindo',estadoLista='conferindo',teveAtivo=false,aparelho=null,busy=false,recado='',truncado=false,consulta=null,abertura=0,pararForeground=null,sdkAtual=null,foregroundSeq=0,cancelarEsperaSW=null,registro=null,teste=null,statusConta=null,tokenRegistrado=null,tentativaTeste=null,servico=null,servicoSeq=0,cancelarAtualizacaoSW=null;
 const vigente=()=>vivo&&root.isConnected!==false&&mesmaIdentidadeAvisosI165(c,contexto());
 const atual=e=>vigente()&&e===ciclo;
 const ativo=()=>estadoConfig==='confirmada'&&programacaoAtivaI165(config);
 const pushAtivo=()=>ativo()&&config.habilidades?.push===true;
 const proprio=()=>vigente()&&c.papel===c.atorReal&&!c.delegada&&!contexto()?.delegada;
 const registroAtual=()=>proprio()&&pushAtivo()&&registro?.uid===c.uid&&registro?.pessoa===c.atorReal&&registro?.ativacaoId===config?.ativacaoId;
 const ambienteBase=()=>ambiente.window.location.href,swURL=()=>new URL('./firebase-messaging-sw.js',ambienteBase()).href;
 const pararCanal=()=>{foregroundSeq++;servicoSeq++;servico=null;cancelarAtualizacaoSW?.();cancelarAtualizacaoSW=null;const cancelar=cancelarEsperaSW;cancelarEsperaSW=null;cancelar?.();try{pararForeground?.();}catch{}pararForeground=null;sdkAtual=null;};
 root.innerHTML='<section class="card" style="border-color:#6198cb;margin:0 0 18px" aria-label="Avisos de conteúdos"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0;font-size:19px"><span data-titulo>Conteúdos que precisam de você </span><span data-contagem></span></h2><p style="margin:7px 0;color:#c9c9c9;font-size:13px" data-saude></p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn secondary" data-reconferir>Conferir avisos</button><button type="button" class="btn" data-ativar>Ativar no meu aparelho</button><button type="button" class="btn secondary" data-renovar hidden>Renovar avisos neste navegador</button><button type="button" class="btn secondary" data-servico hidden>Conferir versão dos avisos</button><button type="button" class="btn secondary" data-testar hidden>Enviar teste para mim</button><button type="button" class="btn secondary" data-conferir-teste hidden>Conferir se chegou</button><button type="button" class="btn secondary" data-vi hidden>Vi o aviso de teste</button></div></div><p style="font-size:13px;margin:8px 0" role="status" aria-live="polite" data-estado></p><p style="font-size:13px;color:#c9c9c9" data-aparelho></p><p style="font-size:12px;color:#c9c9c9" role="status" aria-live="polite" data-servico-estado></p><p style="font-size:12px;color:#c9c9c9" role="status" aria-live="polite" data-teste></p><div data-orientacao-cp110 hidden role="status" aria-live="polite" style="border:1px solid #e7ba45;border-left:5px solid #e7ba45;border-radius:10px;background:#3c3420;color:#ffe3a1;padding:13px;margin:12px 0;font-weight:700;line-height:1.6"></div>'+(publicacoesUnificadas&&c.papel==='Cecília'?'<div data-fila-publicacoes-cp125></div><h3 data-outras-pendencias-cp125>Outras pendências</h3>':'')+'<div data-lista></div><small style="display:block;margin-top:10px;color:#c9c9c9">Abrir ou ler um aviso não conclui a atividade. O sistema acompanha o andamento na origem.</small></section>';
 const el=s=>root.querySelector(s);
 function render(){
  if(!vigente())return;
  root.hidden=!teveAtivo&&['conferindo','desligada'].includes(estadoConfig);
  const pendentesLidos=linhas.filter(n=>n.estado==='pendente'&&avisoHabilitadoNoFeedR87(n,n.id,c.papel,config,{ativacaoCentralId})),pendentes=publicacoesUnificadas&&c.papel==='Cecília'?avisosSemDuplicacaoPublicacaoCp125(pendentesLidos,coberturaPublicacoes()||{}):pendentesLidos,confirmada=ativo()&&estadoLista==='confirmada',conferindo=estadoConfig==='conferindo'||estadoLista==='conferindo';
  root.classList.toggle('avisos-central-cp109',pendentes.some(n=>tipoNovoCp109(n.tipo)));
  root.classList.toggle('avisos-obrigatorios-cp110',c.papel==='Cecília');
  el('[data-titulo]').textContent=c.papel==='Cecília'?'Sua fila de conteúdos ':'Avisos que precisam de você ';
  const painelCp110=el('[data-orientacao-cp110]');painelCp110.hidden=c.papel!=='Cecília';
  painelCp110.textContent=!confirmada?'A conferência desta fila ainda não terminou. O último retrato foi preservado. Para agendar, confira a origem e a proposta atual da postagem.':pendentes.length?pendentes.length+' pendência(s) nesta lista · '+pendentes.filter(n=>n.faseAviso==='atrasado').length+' com prazo passado · '+pendentes.filter(n=>n.urgencia==='urgente').length+' prioritária(s). Antes de agendar, confira a data do calendário e a programação do cliente. Campanhas e orientações específicas da Amanda continuam obrigatórias. As pendências continuam aqui até a atividade avançar na origem.':'Nenhuma pendência nesta conferência. Todo novo agendamento exige a conferência da origem e da proposta atual. Campanhas e compromissos mantêm suas datas protegidas.';
  if(publicacoesUnificadas&&c.papel==='Cecília')painelCp110.textContent='A confirmação de publicação fica somente em Publicações para conferir, logo abaixo. As demais tarefas ficam em Outras pendências. As datas das campanhas e orientações específicas da Amanda continuam obrigatórias.';
  el('[data-contagem]').textContent=publicacoesUnificadas&&c.papel==='Cecília'?'':confirmada?'· '+pendentes.length+(truncado?' nesta página':''):pendentes.length?'· '+pendentes.length+' no último retrato':'';
  const outras=el('[data-outras-pendencias-cp125]');if(outras)outras.textContent='Outras pendências'+(confirmada?' · '+pendentes.length+(truncado?' nesta página':''):' · conferência pendente');
  el('[data-saude]').textContent=teveAtivo?'Conteúdos: '+(confirmada&&saudeAvisosI165(saude,ambiente.agora())?'acompanhamento conferido.':'acompanhamento a conferir.')+' '+resumoSaudeCanaisI165(saude):'';
  el('[data-estado]').textContent=recado||(!confirmada?(conferindo?'Conferindo os avisos atuais. As atividades continuam na sua fila.':'Não consegui confirmar toda a fila agora. O último retrato foi preservado; isso não confirma fila vazia.'):truncado?'Há mais avisos além dos 100 desta página. Confira também a sua fila de conteúdos.':pendentes.length?'Abra o conteúdo para conferir o que precisa ser feito.':'Nenhum aviso pendente na última conferência do servidor.');
  el('[data-aparelho]').textContent=!proprio()?'Você está vendo outro perfil. Cada pessoa precisa entrar com o próprio Google e ativar os avisos no aparelho que usa.':ambiente.Notification?.permission==='denied'?'Os avisos estão bloqueados neste navegador. Libere as notificações nas configurações do site e volte aqui. A fila continua no sistema.':registroAtual()?'Registro deste aparelho confirmado para você nesta entrada. Agora você pode conferir o aviso de teste.':aparelho?.pronto?(statusConta?.contaComAparelhoAtivo===true?'Seu Google já tem aparelho cadastrado. Toque em “Conferir este navegador” para confirmar o recebimento aqui.':'Ative os avisos neste aparelho para receber os lembretes fora do site. A fila continua disponível mesmo se você não permitir.'):aparelho?.motivo||'Conferindo se os avisos deste aparelho podem ser ativados.';
  if(proprio())el('[data-aparelho]').textContent+=' Renovar avisos também confere um registro antigo deste navegador, sem apagar seus dados e sem enviar um teste sozinho.';
  el('[data-ativar]').textContent=registroAtual()?'Conferir meu aparelho':statusConta?.contaComAparelhoAtivo===true?'Conferir este navegador':'Ativar no meu aparelho';
  el('[data-ativar]').disabled=busy||!proprio()||!pushAtivo()||!aparelho?.pronto||ambiente.Notification?.permission==='denied';
  el('[data-renovar]').hidden=!proprio()||!pushAtivo();el('[data-renovar]').disabled=busy||!aparelho?.pronto||ambiente.Notification?.permission!=='granted'||!!tentativaTeste||['reservado','em_andamento','resultado_desconhecido'].includes(teste?.estado);
  el('[data-testar]').hidden=!proprio();el('[data-testar]').textContent=tentativaTeste||['reservado','em_andamento','resultado_desconhecido'].includes(teste?.estado)?'Conferir mesma tentativa':'Enviar teste para mim';
  const esperaTeste=teste?.proximoTesteEm&&Date.parse(teste.proximoTesteEm)>ambiente.agora()&&!tentativaTeste&&!['reservado','em_andamento','resultado_desconhecido'].includes(teste?.estado);
  el('[data-servico]').hidden=!proprio()||!pushAtivo();el('[data-servico]').disabled=busy||!aparelho?.pronto;el('[data-servico]').textContent=servico?.esperandoConfirmado?'Atualizar avisos neste navegador':'Conferir versão dos avisos';
  el('[data-servico-estado]').textContent=!proprio()?'':servico?.pronto?'A versão atual dos avisos está ativa neste navegador. Isso ainda não comprova a chegada de um teste.':servico?.esperandoConfirmado?'Há uma versão nova aguardando. Toque em “Atualizar avisos neste navegador”; seus textos e sua tentativa anterior ficam preservados.':servico?.falha?'Não consegui confirmar a versão ativa agora. O teste está pausado; sua fila e a tentativa anterior continuam preservadas.':servico?.temAtivo?'Há um serviço ativo, mas a versão atual ainda não foi confirmada. Confira a versão antes de pedir um teste.':'A versão dos avisos deste navegador ainda não foi conferida.';
  el('[data-testar]').disabled=busy||servico?.pronto!==true||!registroAtual()||!tokenRegistrado||statusConta?.testeServidorDisponivel!==true||!!esperaTeste||ambiente.Notification?.permission!=='granted';
  el('[data-conferir-teste]').hidden=!proprio()||!teste?.operacaoId;el('[data-conferir-teste]').disabled=busy||ambiente.Notification?.permission!=='granted';
  el('[data-vi]').hidden=!proprio()||!registroAtual()||!teste?.objetoConfirmado||teste.visto===true;el('[data-vi]').disabled=busy;
  el('[data-teste]').textContent=!proprio()?'O aparelho de outra pessoa não pode ser ativado por este acesso.':teste?.visto?'Você confirmou que viu o teste enviado pelo servidor neste aparelho. Isso não garante todos os avisos futuros.':teste?.objetoConfirmado?'O navegador confirmou o aviso de teste do servidor. Confira a tela e toque em “Vi o aviso de teste”. A exibição pelo aparelho ainda depende dessa conferência.':teste?.estado==='aceito_pelo_provedor'?'O serviço aceitou o envio do teste. Ainda não confirmei que chegou neste navegador. Você pode fechar o site, aguardar o aviso e depois voltar em “Conferir se chegou”.':teste?.estado==='resultado_desconhecido'?'O envio do teste ficou sem confirmação. Nenhum novo envio automático foi feito. Confira a mesma tentativa.':teste?.estado==='em_andamento'||teste?.estado==='reservado'?'A mesma tentativa de teste continua em conferência. Não foi criado outro envio.':teste?.estado==='recusado'?(teste.renovarRegistro===true?'O registro deste navegador foi recusado pelo serviço. Toque em “Renovar avisos neste navegador”. O teste anterior e o intervalo de dez minutos continuam preservados.':'O serviço recusou o teste. Você pode renovar o registro deste navegador; a fila e o intervalo de dez minutos continuam preservados.'):statusConta?.contaComAparelhoAtivo===true?'Sua conta tem aparelho cadastrado. Ative aqui para conferir este navegador e enviar um teste só para você.':'Cada pessoa precisa ativar o aparelho com o próprio Google. Um registro não comprova que o aviso já chegou';
  el('[data-lista]').innerHTML=c.papel==='Cecília'?listaAvisosAgendamentoCp110(pendentes,confirmada):pendentes.map(n=>'<div '+(tipoNovoCp109(n.tipo)?'data-aviso-cp109="'+esc(n.tipo)+'" ':'')+'style="padding:12px 0;border-top:1px solid #444;display:flex;gap:12px;justify-content:space-between;align-items:center"><div><strong>'+esc(n.titulo||'Conteúdo para conferir')+'</strong><div style="font-size:13px;color:#ccc;margin-top:4px">'+esc(n.texto||'Confira o próximo passo na origem.')+'</div>'+(n.urgencia==='urgente'?'<b style="color:#ffbe65">Prioridade</b>':'')+(n.bloqueada?'<small style="display:block">Aguardando outra etapa.</small>':'')+(n.faseAviso==='atrasado'?'<small style="display:block;color:#ffbe65">O prazo passou. Confira este conteúdo.</small>':'')+(resumoCanalAvisoI165(n)?'<small style="display:block;color:#ffbe65">'+esc(resumoCanalAvisoI165(n))+'</small>':'')+'</div><button class="btn secondary" type="button" data-abrir="'+esc(n.id)+'" '+(!confirmada?'disabled':'')+'>'+(n.tipo==='demanda_refazer_i161'?'Ver o ajuste pedido':['providencia_gravacao_cp140','providencia_vinculada_cp146'].includes(n.tipo)?'Conferir providência':'Abrir conteúdo')+'</button></div>').join('');
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
  estadoLista='conferindo';recado='';render();
  consulta=(async()=>{try{
   const r=await configFresh();if(!atual(e))return false;
   config=r.config;web=r.web;cadastro=r.cadastroProprio;saude=r.saude;estadoConfig='confirmada';configuracaoConferida=true;statusConta=r.aparelhoProprio||null;
   adotarTesteDaConta();
   if(registro?.ativacaoId!==config?.ativacaoId){registro=null;tokenRegistrado=null;}
   if(!ativo()){estadoConfig='desligada';aparelho=null;pararCanal();render();return false;}
   teveAtivo=true;
   if(proprio())void conferirServico();
   const a=await preConferir(e,r);if(a&&atual(e)){await prepararForeground(e);await conferirTesteNoNavegador();}
   if(!atual(e))return false;
   const l=await io.listarAvisos();if(!atual(e))return false;
   if(l?.schema!==1||l.listaConfirmada!==true||l.ativacaoId!==config.ativacaoId||!Array.isArray(l.avisos)||l.avisos.length>100||l.limite!==100||typeof l.truncado!=='boolean'||l.ativacaoCentralId!==undefined&&typeof l.ativacaoCentralId!=='string'||l.avisos.some(n=>!avisoHabilitadoNoFeedR87(n,n.id,c.papel,config,{ativacaoCentralId:l.ativacaoCentralId||''})||n.estado!=='pendente'))throw Error('A fila de avisos precisa ser conferida. O último retrato foi preservado.');
   linhas=l.avisos;ativacaoCentralId=l.ativacaoCentralId||'';truncado=l.truncado;estadoLista='confirmada';recado='';render();
   if(pendenteURL&&idAviso(pendenteURL)&&atual(e)){const id=pendenteURL;pendenteURL=null;await abrir(id);}
   return true;
  }catch(err){if(atual(e)){estadoLista='erro';if(!configuracaoConferida){estadoConfig='erro';aparelho=null;registro=null;tokenRegistrado=null;pararCanal();}recado='Não consegui conferir toda a fila agora. O último retrato foi preservado. Você pode conferir seu aparelho quando a configuração estiver confirmada.';render();}return false;
  }finally{consulta=null;}})();
  return consulta;
 }
 async function lerNota(id,{paraNotificar=false}={}){
  if(!vigente()||!idAviso(id))throw Error('Este aviso precisa ser conferido no acesso original.');
  const r=await configFresh();if(!programacaoAtivaI165(r.config))throw Error('O acompanhamento está pausado. A atividade continua na origem.');
  if(paraNotificar&&r.config.habilidades?.push!==true)return null;
  const n=await io.lerAviso(id);if(!vigente())throw Error('O perfil mudou. Abra o aviso no acesso original.');
  if(!avisoHabilitadoNoFeedR87(n,id,c.papel,r.config,{ativacaoCentralId,fresco:true})||n.fonteConferida!==true||n.leituraNaoResolve!==true||n.semAlterarEstadoPersistido!==true)throw Error('Não consegui confirmar a origem atual deste aviso. A atividade continua preservada.');
  if(paraNotificar&&(n.estado!=='pendente'||n.fonteAvancou||n.pausada||n.bloqueada))return null;
  return n;
 }
 async function abrir(id){const token=++abertura,navegacao=contexto()?.navegacao;
  try{const n=await lerNota(id);if(!vigente()||token!==abertura||navegacao!==contexto()?.navegacao)return {abriu:false,contextoVigente:false};
   if(n.escopo===ESCOPO_AVISOS_CENTRAL_R87&&(n.estado!=='pendente'||n.fonteAvancou||!n.link)){recado='Esta atividade já avançou na origem. Confira a fila atual; nenhuma pendência foi concluída por esta leitura.';render();return {abriu:false,fonteAvancou:true,contextoVigente:true};}
   const abrirFonte=n.escopo===ESCOPO_AVISOS_CENTRAL_R87?abrirCentral:n.fonte.colecao==='postagens'?abrirPostagem:abrirEditor;
   if(typeof abrirFonte!=='function')throw Error('Abra a fila de conteúdos para conferir esta atividade.');
   const resultado=await abrirFonte(n.escopo===ESCOPO_AVISOS_CENTRAL_R87?n:n.fonte.id,n);if(!vigente()||token!==abertura)return {abriu:false,contextoVigente:false};
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
 async function ativar(renovar=false){
  if(!proprio()||!pushAtivo()||!aparelho?.pronto||busy||ambiente.Notification?.permission==='denied')return false;
  if(renovar&&(tentativaTeste||['reservado','em_andamento','resultado_desconhecido'].includes(teste?.estado))){recado='Confira a mesma tentativa de teste antes de renovar o registro; nenhum novo envio foi feito.';render();return false;}const anteriorToken=tokenRegistrado,e=ciclo;busy=true;registro=null;tokenRegistrado=null;recado=renovar?'Renovando somente os avisos deste navegador…':'Conferindo os avisos deste aparelho…';render();
  try{const permissao=ambiente.Notification.permission==='granted'?'granted':ambiente.Notification.requestPermission();
   if(await permissao!=='granted')throw Error('Os avisos não foram permitidos neste navegador. A fila continua no sistema.');
   const r=await configFresh();if(!atual(e)||!proprio()||!pushAtivo()||r.config?.ativacaoId!==config?.ativacaoId||r.config?.habilidades?.push!==true)return false;
   if(renovar&&['reservado','em_andamento','resultado_desconhecido'].includes(r.aparelhoProprio?.ultimoTeste?.estado)){statusConta=r.aparelhoProprio;adotarTesteDaConta();recado='Confira a mesma tentativa de teste antes de renovar o registro; nenhum novo envio foi feito.';return false;}const a=await preConferir(e,r);if(!a||!atual(e)||!proprio()||!pushAtivo())return false;
   const sdk=sdkAtual||await ambiente.carregarMessaging();if(!atual(e)||!proprio()||!pushAtivo())return false;
   const reg=await ambiente.serviceWorker.register(swURL());if(!atual(e)||!proprio()||!pushAtivo())return false;
   const espera=esperarServiceWorkerAtivoI165(reg,{vigente:()=>atual(e)&&proprio()&&pushAtivo()});cancelarEsperaSW=espera.cancelar;
   try{await espera.pronto;}finally{if(cancelarEsperaSW===espera.cancelar)cancelarEsperaSW=null;}
   if(!atual(e)||!proprio()||!pushAtivo())return false;
   if(renovar){await reconciliarEscopoLegadoProprioCp146({serviceWorker:ambiente.serviceWorker,regRaiz:reg,app:io.app,baseURL:ambienteBase(),vigente:()=>atual(e)&&proprio()&&pushAtivo()});if(!atual(e)||!proprio()||!pushAtivo())return false;}
   const token=renovar?await renovarTokenProprioCp146({sdk,messaging:sdk.getMessaging(io.app),reg,opcoes:a.opcoesVapid,vigente:()=>atual(e)&&proprio()&&pushAtivo(),tokenAnterior:anteriorToken||''}):await sdk.getToken(sdk.getMessaging(io.app),{...a.opcoesVapid,serviceWorkerRegistration:reg});if(!atual(e)||!proprio()||!pushAtivo())return false;
   if(typeof token!=='string'||!token)throw Error('O navegador não confirmou o aparelho.');
   const recibo=await io.registrarDispositivo({token});if(!atual(e)||!proprio()||!pushAtivo())return false;
   if(recibo?.schema!==1||recibo.registrado!==true||recibo.uid!==c.uid||recibo.pessoa!==c.atorReal||recibo.ativacaoId!==config.ativacaoId)throw Error('Não consegui confirmar o registro deste aparelho.');
   registro={uid:recibo.uid,pessoa:recibo.pessoa,ativacaoId:recibo.ativacaoId};tokenRegistrado=token;statusConta=r.aparelhoProprio||null;adotarTesteDaConta();
   await conferirServico(reg);if(!atual(e)||!registroAtual())return false;
   recado=renovar?'Registro antigo conferido e avisos renovados somente neste navegador. Nenhum teste novo foi enviado; a tentativa anterior e o intervalo de dez minutos foram preservados.':'Registro confirmado para você. Se quiser, confira agora o aviso de teste neste navegador.';await prepararForeground(e);return true;
  }catch(err){if(atual(e))recado=mensagemAtivacaoAvisosI165(err);return false;
  }finally{if(atual(e)){busy=false;render();}}
 }
 async function conferirServico(regFornecido=null){
  if(!proprio()||!pushAtivo())return false;const s=++servicoSeq,e=ciclo;
  try{const reg=regFornecido||await ambiente.serviceWorker.getRegistration(swURL());if(!atual(e)||s!==servicoSeq||!proprio())return false;
   const ativoWorker=reg?.active,esperandoWorker=reg?.waiting,op={vigente:()=>atual(e)&&s===servicoSeq&&proprio()&&pushAtivo(),MessageChannel:ambiente.MessageChannel||globalThis.MessageChannel};
   const [ativoConfirmado,esperandoConfirmado]=await Promise.all([conferirVersaoWorkerI171(ativoWorker,op),conferirVersaoWorkerI171(esperandoWorker,op)]);
   if(!op.vigente())return false;
   servico={reg,ativoWorker,esperandoWorker,temAtivo:!!reg?.active,ativoConfirmado:ativoConfirmado&&reg.active===ativoWorker,esperandoConfirmado:esperandoConfirmado&&reg.waiting===esperandoWorker,pronto:ativoConfirmado&&reg.active===ativoWorker&&ativoWorker.state==='activated',falha:false};render();return servico.pronto;
  }catch{if(atual(e)&&s===servicoSeq){servico={pronto:false,falha:true};render();}return false;}
 }
 async function atualizarServico(){
  if(!proprio()||!pushAtivo()||!aparelho?.pronto||busy)return false;
  const anterior=servico,e=ciclo;busy=true;render();
  try{const r=await configFresh();if(!atual(e)||!proprio()||r.config?.ativacaoId!==config?.ativacaoId||r.config?.habilidades?.push!==true)return false;
   const a=await preConferir(e,r);if(!a||!atual(e)||!proprio())return false;
   if(!anterior?.esperandoConfirmado){const reg=await ambiente.serviceWorker.register(swURL());if(!atual(e)||!proprio())return false;await reg.update?.();if(!atual(e)||!proprio())return false;await conferirServico(reg);recado=servico?.esperandoConfirmado?'A nova versão foi encontrada. Toque em “Atualizar avisos neste navegador” para ativar.':'Versão conferida. Se a atualização ainda estiver iniciando, aguarde um pouco e confira novamente.';return servico?.pronto===true;}
   const reg=await ambiente.serviceWorker.getRegistration(swURL());if(!atual(e)||!proprio()||reg?.waiting!==anterior.esperandoWorker)return false;
   if(!await conferirVersaoWorkerI171(reg.waiting,{vigente:()=>atual(e)&&proprio()&&pushAtivo(),MessageChannel:ambiente.MessageChannel||globalThis.MessageChannel}))throw Object.assign(Error('Versão não confirmada.'),{code:'i165/sw-falha'});
   if(!atual(e)||!proprio()||reg.waiting!==anterior.esperandoWorker)return false;
   const espera=ativarWorkerEsperandoI171(reg,anterior.esperandoWorker,{serviceWorker:ambiente.serviceWorker,vigente:()=>atual(e)&&proprio()&&pushAtivo()});cancelarAtualizacaoSW=espera.cancelar;
   try{await espera.pronto;}finally{if(cancelarAtualizacaoSW===espera.cancelar)cancelarAtualizacaoSW=null;}
   if(!atual(e)||!proprio())return false;const pronto=await conferirServico(reg);if(!atual(e)||!proprio())return false;
   recado=pronto?'A nova versão dos avisos está ativa. Sua tentativa anterior foi preservada; nenhum teste foi reenviado.':'A versão ainda precisa ser conferida. Nenhum teste foi reenviado.';return pronto;
  }catch(err){if(atual(e)){servico={pronto:false,falha:true};recado=mensagemAtivacaoAvisosI165(err);}return false;
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
   if(!await conferirServico()||!atual(e)||!registroAtual()){recado='Confira e, se necessário, atualize a versão dos avisos antes de pedir o teste. A tentativa anterior foi preservada.';return false;}
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
 const click=ev=>{const b=ev.target?.closest?.('[data-abrir],[data-ativar],[data-reconferir],[data-testar],[data-conferir-teste],[data-vi],[data-servico],[data-renovar]');if(!b||!root.contains(b)||!vigente())return;if(b.hasAttribute('data-abrir'))abrir(b.getAttribute('data-abrir'));else if(b.hasAttribute('data-ativar'))ativar();else if(b.hasAttribute('data-renovar'))ativar(true);else if(b.hasAttribute('data-servico'))atualizarServico();else if(b.hasAttribute('data-testar'))testarNoServidor();else if(b.hasAttribute('data-conferir-teste'))conferirTesteNoNavegador();else if(b.hasAttribute('data-vi'))confirmarTesteVisto();else{consultar();if(publicacoesUnificadas&&c.papel==='Cecília')void atualizarPublicacoes();}};
 const mensagem=ev=>{if(!vigente()||ev.data?.tipo!=='abrir_aviso_i165'||!idAviso(ev.data.id))return;let origem;try{origem=new URL(ev.source?.scriptURL);}catch{return;}if(origem.href!==swURL()||ev.origin&&ev.origin!==new URL(ambienteBase()).origin)return;ev.ports?.[0]?.postMessage({recebido:true});abrir(ev.data.id);};
 root.addEventListener('click',click);ambiente.serviceWorker?.addEventListener('message',mensagem);
 const timer=ambiente.setInterval(()=>{if(vigente()){consultar();if(publicacoesUnificadas&&c.papel==='Cecília')void atualizarPublicacoes();}},60000);
 consultar();render();
 return {abrir,ativar,renovarRegistro:()=>ativar(true),conferirServico,atualizarServico,testarNoServidor,conferirTesteNoNavegador,confirmarTesteVisto,reconferir:consultar,sincronizarFilaPublicacoes:render,estado:()=>({estadoConfig,estadoLista,linhas:structuredClone(linhas),truncado,aparelhoPronto:!!aparelho?.pronto,registroConfirmado:registroAtual(),servicoAvisos:servico?{versaoEsperada:VERSAO_SERVICO_AVISOS_I171,ativoConfirmado:servico.ativoConfirmado===true,esperandoConfirmado:servico.esperandoConfirmado===true,pronto:servico.pronto===true}:null,testeServidor:teste?{operacaoId:teste.operacaoId,estado:teste.estado,aceiteProvedor:teste.aceiteProvedor===true,objetoConfirmado:teste.objetoConfirmado===true,visto:teste.visto===true}:null,ciclo,vivo}),destroy(){if(!vivo)return;vivo=false;ciclo++;abertura++;registro=null;teste=null;tokenRegistrado=null;tentativaTeste=null;pararCanal();ambiente.clearInterval(timer);ambiente.serviceWorker?.removeEventListener('message',mensagem);root.removeEventListener('click',click);root.classList.remove('avisos-central-cp109');root.classList.remove('avisos-obrigatorios-cp110');root.replaceChildren();root.hidden=true;}};
}
