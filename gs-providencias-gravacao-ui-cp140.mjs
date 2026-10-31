import {criarVinculosUiCp142} from './gs-providencias-vinculos-ui-cp142.mjs?v=e5912dd8797ca5499fd77dd6641e9f7c4c0b061922f79d0228d81ee045e2af42';
import {providenciaEhCp140,resumoProvidenciaCp140,idProvidenciaGravacaoCp140,hashProvidenciaCp140} from './gs-providencias-gravacao-cp140.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gestor=c=>['Chris','Amanda'].includes(c.nome);
const permitido=c=>!!c.uid&&['Chris','Amanda','Cecília'].includes(c.nome);
const ativa=d=>!d.excluido&&!['aprovada','cancelada'].includes(d.status);
const key=c=>JSON.stringify([c.uid,c.nome,c.atorReal||c.nome,c.sessao,c.geracao]);
const autoriaKey=c=>JSON.stringify([c.uid,c.nome,c.atorReal||c.nome]);
const clonar=v=>structuredClone(v);
const assinaturaValida=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const idValido=v=>typeof v==='string'&&/^prov140_[a-f0-9]{64}$/.test(v);
const campo=(nome,label,valor='',tipo='text',max=180)=>`<label style="display:grid;gap:6px;margin:12px 0;">${label}<input data-campo="${nome}" type="${tipo}" maxlength="${max}" value="${esc(valor)}"></label>`;
const area=(nome,label,valor='',max=4000)=>`<label style="display:grid;gap:6px;margin:12px 0;">${label}<textarea data-campo="${nome}" maxlength="${max}" rows="3">${esc(valor)}</textarea></label>`;
const botao=(acao,texto,classe='secondary')=>`<button type="button" class="btn ${classe}" data-acao="${acao}" style="width:auto;">${texto}</button>`;
const listaOrigem=r=>r.origem.itens.map(i=>`<li>Dia ${esc(i.dia||'a combinar')} · ${esc(i.titulo)}<br><small>${esc(i.itemId)} · versão ${esc(i.versao.slice(0,12))}</small></li>`).join('');

export function criarProvidenciasGravacoesUiCp140({documento=document,contexto,chamar,demandas,clientes,sessoes=()=>[],hoje,aoAtualizar,abrirModal,storage,visivel=()=>true,fechar,estadoDemandas=()=>'pronto',abrirDemanda,aoAtualizarProjecao=()=>{}}){
 let tela=null,abertura=0,ultimoPainel='',ultimoRetrato=null,projecao=null;const hostsProjecao=new Map(),colecaoPrivada='providencias_gravacao_cp140';const abaRascunho=crypto.randomUUID();
 const vinculos=criarVinculosUiCp142({documento,contexto,chamar,clientes,demandas,storage,novaTela,exigirTela,aviso,abrirDemanda,aoAtualizar,permitirTroca});
 const pendenteKey=c=>'get_cp140_tentativa_'+autoriaKey(c);
 const pendenteLegadoKey=c=>'get_cp140_tentativa_'+key(c);
 function pendente(c){try{const bruto=storage?.getItem(pendenteKey(c))||storage?.getItem(pendenteLegadoKey(c));return bruto?JSON.parse(bruto):null;}catch{throw Error('A tentativa guardada precisa ser conferida. Nada será substituído.');}}
 function guardar(c,v){if(!storage)throw Error('Não consegui guardar a tentativa neste navegador. Libere o armazenamento antes de enviar.');const anterior=pendente(c);if(anterior&&(anterior.operacao!==v.operacao||anterior.hashPayload&&anterior.hashPayload!==v.hashPayload))throw Error('Outra tentativa está guardada neste perfil. Confira antes de enviar outra.');storage.setItem(pendenteKey(c),JSON.stringify(v));if(JSON.stringify(pendente(c))!==JSON.stringify(v))throw Error('Não consegui reler a mesma tentativa guardada.');}
 function limpar(c,p){const atual=pendente(c);if(atual&&(!p||atual.operacao!==p.operacao||atual.hashPayload&&atual.hashPayload!==p.hashPayload))throw Error('Outra tentativa foi guardada neste perfil. A confirmação anterior não a removeu.');storage?.removeItem(pendenteKey(c));storage?.removeItem(pendenteLegadoKey(c));}
 async function conferirTentativa(c,p){if(!p||!idValido(p.id)||!['salvar','esperar','confirmar','cancelar','substituir','revisar'].includes(p.acao)||p.payload?.operacao!==p.operacao||!/^prov140_[a-f0-9]{32}$/.test(p.operacao))throw Error('A tentativa guardada não confirma sua identidade. Preserve o registro e reabra.');const hash=await hashProvidenciaCp140(p.payload);if(p.hashPayload&&hash!==p.hashPayload||p.autoria&&p.autoria!==autoriaKey(c))throw Error('O conteúdo ou o perfil da tentativa guardada mudou. Nada foi reenviado.');return {...clonar(p),schema:1,autoria:autoriaKey(c),hashPayload:hash};}
 async function conferirRecibo(t,r,p){const rec=r.operacao?.recibo;if(r.operacao?.confirmada!==true||r.operacao.id!==p.operacao||rec?.id!==p.id||rec.operacao!==p.operacao||rec.acao!==p.acao||!['confirmada','recusada'].includes(rec.estado)||rec.autoria?.uid!==t.ctx.uid||rec.autoria?.papel!==t.ctx.nome||rec.autoria?.atorReal!==(t.ctx.atorReal||t.ctx.nome))throw Error('A resposta não confirmou esta mesma tentativa e autoria. Consulte antes de repetir.');const negocio=Object.fromEntries(Object.keys(p.payload).map(k=>[k,rec.pedido?.[k]]));if(await hashProvidenciaCp140(negocio)!==p.hashPayload)throw Error('O recibo pertence a outro conteúdo. Seus dados e a tentativa foram mantidos.');if(r.providencia&&r.providencia.id!==p.id)throw Error('A resposta abriu outra providência. A tentativa foi mantida.');return rec;}
 function podeSair(){if(!tela||!vigente(tela))return true;try{return !tela.busy&&!pendente(tela.ctx)&&!tela.sujo?.();}catch{return false;}}
 function permitirTroca(){if(!tela||!vigente(tela))return true;if(tela.busy){aviso(tela.painel,'Aguarde a confirmação desta tentativa antes de sair.',true);return false;}if(tela.sujo?.()){try{tela.guardarAntesSair?.();guardarRascunho(tela);}catch(e){aviso(tela.painel,e.message,true);return false;}const confirmar=documento.defaultView?.confirm?.bind(documento.defaultView);if(!confirmar||!confirmar('Seus campos ficam guardados neste aparelho. Quer sair desta ficha agora?'))return false;}return true;}
  const rascunhoPrefixo=c=>'get_cp140_rascunho_'+autoriaKey(c);
 const rascunhoKey=(c,token=abaRascunho)=>rascunhoPrefixo(c)+'_'+token;
 function lerRascunhos(c){try{const keys=new Set([rascunhoKey(c),rascunhoPrefixo(c)]);for(let i=0;i<(storage?.length||0);i++){const k=storage.key(i);if(k?.startsWith(rascunhoPrefixo(c)+'_'))keys.add(k);}return [...keys].map(k=>{const r=JSON.parse(storage?.getItem(k)||'null');return r?{...r,chaveStorage:k}:null;}).filter(r=>r&&r.schema===1&&r.autoria===autoriaKey(c));}catch{throw Error('Não consegui conferir os rascunhos guardados. Seus campos abertos continuam aqui.');}}
 function lerRascunho(c){const rows=lerRascunhos(c);return rows.find(r=>r.chaveStorage===rascunhoKey(c))||rows.at(-1)||null;}
 function escreverRascunho(c,r,token=abaRascunho){if(!storage)throw Error('Não consegui guardar seus campos neste aparelho. Copie os textos antes de sair.');const k=rascunhoKey(c,token);storage.setItem(k,JSON.stringify({...r,schema:1,autoria:autoriaKey(c),tokenRascunho:token}));}
 function guardarRascunho(t){if(t.rascunho&&t.sujo?.())escreverRascunho(t.ctx,t.rascunho(),t.tokenRascunho||abaRascunho);}
 function guardarConfirmada(t,p){escreverRascunho(t.ctx,{tipo:'confirmada',id:p.id,operacao:p.operacao,payload:p.payload},t.tokenRascunho||abaRascunho);}
 function oferecerRascunho(t){let rows;try{rows=lerRascunhos(t.ctx);}catch(e){aviso(t.painel,e.message,true);return;}const el=t.painel.querySelector('[data-rascunho]');if(!rows.length){el.replaceChildren();return;}el.innerHTML=rows.map((r,i)=>'<div class="card"><p>'+ (r.tipo==='confirmada'?'Este envio já foi confirmado. Você pode conferir a ficha atual sem repetir o envio.':'Há campos guardados neste aparelho. Retome a ficha e confira a fonte atual antes de salvar.')+'</p><button class="btn secondary" type="button" data-acao="retomar-rascunho" data-rascunho-indice="'+i+'">'+(r.tipo==='confirmada'?'Conferir envio confirmado':'Retomar campos guardados')+'</button></div>').join('');el.querySelectorAll('[data-rascunho-indice]').forEach(b=>b.addEventListener('click',()=>{const r=rows[Number(b.dataset.rascunhoIndice)];void (r.tipo==='confirmada'?abrir(r.id):r.tipo==='detalhe'?abrir(r.id,r):formulario(r.dto||null,r));}));}
 function retorno(t){const el=t.painel.querySelector('[data-navegacao]');el.innerHTML=botao('lista','Voltar à lista');el.querySelector('button').addEventListener('click',()=>{void listar();});}
 const valor=(p,n)=>String(p.querySelector(`[data-campo="${n}"]`)?.value||'').trim();
 function aviso(p,texto,erro=false){const el=p.querySelector('[data-mensagem]');if(el){el.textContent=texto;el.setAttribute('role',erro?'alert':'status');}}
 function vigente(t){return tela===t&&t.n===abertura&&key(contexto())===key(t.ctx)&&t.painel.isConnected&&visivel();}
 function exigirTela(t){if(!vigente(t))throw Error('O perfil ou a ficha mudou. Reabra a providência.');}
 function base(t){return {id:t.dto.providencia.id,assinaturaEsperada:t.dto.assinatura};}
 function htmlCartao(r){
  const atraso=r.status==='pendente'&&r.prazoData&&r.prazoData<hoje(),espera=r.espera;
  return `<article class="item" style="margin:12px 0;border-left:4px solid ${atraso?'var(--red)':'var(--yellow)'};padding:16px;">
   <div class="meta">${esc(r.clienteNome||r.cliente)} · ${esc(r.competencia)}</div><h3 style="margin:7px 0;">${esc(r.titulo)}</h3>
   <div style="white-space:pre-wrap;">${esc(r.descricao)}</div><p><b>${esc(r.estado)}</b> · ${esc(r.prazoLabel)}${atraso?' · prazo passou, continua pendente':''}</p>
   <div class="meta">Cecília organiza · quem executa: ${esc(r.responsavelReal)}${r.decisor?' · decisão: '+esc(r.decisor):''}</div>
   ${r.motivoDevolucao?`<p class="card" style="white-space:pre-wrap;"><b>A Amanda pediu:</b> ${esc(r.motivoDevolucao)}</p>`:''}${espera?`<p style="white-space:pre-wrap;">Aguardando ${esc(espera.pessoa)}: ${esc(espera.texto)}${espera.previsaoData?' · retorno combinado: '+esc(espera.previsaoData):''}</p>`:''}
   <button class="btn secondary" type="button" data-abrir="${esc(r.id)}" style="margin-top:10px;">Conferir e acompanhar</button></article>`;
 }
 function bindAbrir(el){el.querySelectorAll('[data-abrir]').forEach(b=>b.addEventListener('click',()=>{void abrir(b.dataset.abrir);}));}
 function estadoProjecao(){
  const c=contexto(),k=key(c);if(!projecao||projecao.key!==k){projecao={key:k,rows:[],estado:'carregando',em:0,promise:null};ultimoPainel='';ultimoRetrato=null;}return projecao;
 }
 function linhasProjecao(modo='minhas'){
  if(!permitido(contexto()))return [];const rows=estadoProjecao().rows;
  return modo==='revisao'?contexto().nome==='Amanda'?rows.filter(r=>r.status==='concluida_aguardando_aprovacao'):[]:rows;
 }
 function contadores(){const c=contexto();if(!permitido(c))return {minhas:0,atrasadas:0,aprovar:0,estado:'oculto'};const s=estadoProjecao(),pend=s.rows.filter(r=>r.status==='pendente'&&!r.espera&&r.prazoData),minhas=c.nome==='Cecília'?pend.filter(r=>r.prazoData<=hoje()).length:0;return {minhas,atrasadas:c.nome==='Cecília'?pend.filter(r=>r.prazoData<hoje()).length:0,aprovar:c.nome==='Amanda'?s.rows.filter(r=>r.status==='concluida_aguardando_aprovacao').length:0,estado:s.estado};}
 function validarListaPrivada(r){if(r?.schema!==1||r.fonteColecao!==colecaoPrivada||r.completo!==true||!Array.isArray(r.itens)||r.itens.length>300||new Set(r.itens.map(x=>x.id)).size!==r.itens.length||r.itens.some(x=>!idValido(x.id)||x.coordenadora!=='Cecília'||!['pendente','concluida_aguardando_aprovacao','aprovada','cancelada'].includes(x.status)))throw Error('A lista privada de providências não foi confirmada. O último retrato foi preservado.');return r;}
 function renderProjecao(el,modo='minhas'){
  if(!el)return;hostsProjecao.set(el,modo);const c=contexto();el.hidden=!permitido(c)||(modo==='revisao'&&c.nome!=='Amanda');if(el.hidden){el.replaceChildren();return;}
  const s=estadoProjecao(),rows=linhasProjecao(modo),titulo=modo==='revisao'?'Providências para revisar':c.nome==='Cecília'?'Providências das gravações':'Providências das gravações · coordenação';
  el.innerHTML=`<section class="card" style="border:1px solid var(--yellow);margin:12px 0;"><h2>${titulo}${rows.length?' · '+rows.length:''}</h2><p class="desc">${modo==='revisao'?'Confira a comprovação da Cecília e aprove ou explique o que falta.':c.nome==='Cecília'?'Organize os compromissos abaixo. Esperar alguém ou ler não encerra a tarefa.':'Chris e Amanda acompanham a preparação; a Cecília organiza e a Amanda revisa a entrega.'}</p>${s.estado==='erro'?'<p role="alert">Não consegui atualizar as providências. O último retrato confirmado continua abaixo; confira novamente antes de decidir.</p>':s.estado==='carregando'?'<p role="status">Conferindo as providências no servidor…</p>':''}${rows.map(htmlCartao).join('')}${!rows.length&&s.estado==='pronto'?'<p>Nenhuma providência ativa nesta etapa.</p>':''}${botao('conferir-projecao','Conferir providências no servidor')}${modo==='minhas'?botao('lista','Ver acompanhamento e histórico'):''}</section>`;
  el.querySelector('[data-acao="conferir-projecao"]').addEventListener('click',()=>{void atualizarProjecao(true);});el.querySelector('[data-acao="lista"]')?.addEventListener('click',()=>{void listar();});bindAbrir(el);
 }
 function redesenharProjecoes(){for(const[el,modo]of hostsProjecao){if(el.isConnected===false){hostsProjecao.delete(el);continue;}renderProjecao(el,modo);}renderInicio(false);}
 async function atualizarProjecao(forcar=false){
  const c={...contexto()},s=estadoProjecao();if(!permitido(c)){s.rows=[];s.estado='oculto';redesenharProjecoes();return;}if(s.promise){if(!forcar)return s.promise;await s.promise;if(projecao!==s||key(contexto())!==key(c))return;return atualizarProjecao(true);}if(!forcar&&Date.now()-s.em<60000)return;
  s.estado=s.em?'atualizando':'carregando';s.promise=(async()=>{try{const r=validarListaPrivada(await Promise.resolve().then(()=>chamar('providencias_gravacao_listar_cp140',{incluirFinalizadas:false})));if(projecao!==s||key(contexto())!==key(c))return;s.rows=clonar(r.itens);s.estado='pronto';s.em=Date.now();}
   catch(e){if(projecao===s&&key(contexto())===key(c)){s.estado='erro';s.em=Date.now();}}
   finally{if(projecao===s&&key(contexto())===key(c)){s.promise=null;redesenharProjecoes();try{aoAtualizarProjecao();}catch{}}}})();return s.promise;
 }
 function renderMinhas(el){renderProjecao(el,'minhas');void atualizarProjecao();}
 function renderRevisao(el){renderProjecao(el,'revisao');void atualizarProjecao();}
 function renderInicio(consultar=true){
  const el=documento.getElementById('providenciasGravacoesCp140'),c=contexto();if(!el)return;el.hidden=c.nome!=='Cecília'||!c.uid;if(el.hidden){el.replaceChildren();estadoProjecao();return;}
  const s=estadoProjecao(),rows=s.rows,mark=key(c)+s.estado+JSON.stringify(rows);if(mark!==ultimoPainel){ultimoPainel=mark;el.innerHTML=`<section class="card" style="border:2px solid var(--yellow);margin:12px 0 20px;"><h2>Providências das gravações${rows.length?' · '+rows.length:''}</h2><p class="desc">Confira os combinados antes de seguir. A confirmação de leitura não encerra o trabalho: organize e envie sua entrega na mesma demanda.</p>${s.estado==='erro'?'<p role="alert">Não consegui atualizar as providências; o último retrato confirmado foi preservado.</p>':s.estado==='carregando'?'<p role="status">Conferindo as providências no servidor…</p>':''}${rows.map(htmlCartao).join('')}<div data-vinculos-cp142></div>${botao('lista','Conferir lista no servidor')}</section>`;el.querySelector('[data-acao="lista"]').addEventListener('click',()=>{void listar();});bindAbrir(el);}void vinculos.renderInicio(el.querySelector('[data-vinculos-cp142]'));if(consultar)void atualizarProjecao();
 }
 function renderEntradas(){
  const c=contexto();void atualizarProjecao();for(const id of ['providenciasEntradaCalendariosCp140','providenciasEntradaCentralCp140']){
   const el=documento.getElementById(id);if(!el)continue;el.hidden=!gestor(c)||!c.uid;
   if(!el.hidden&&!el.firstChild){el.innerHTML=`<div class="card"><b>Preparar as gravações</b><p class="desc">Depois de autorizar a versão concreta, reúna aqui os materiais e as combinações que a Cecília precisa acompanhar.</p>${botao('abrir','Providências das gravações')}</div>`;el.querySelector('button').addEventListener('click',()=>{void listar();});}
   if(el.hidden)el.replaceChildren();
  }
 }
 function novaTela(titulo){
  const ctx={...contexto()};if(!permitido(ctx)||!permitirTroca())return null;
  const painel=documento.createElement('section');abrirModal(painel);
  const t={n:++abertura,ctx,painel,dto:null,busy:false,sujo:null,rascunho:null};tela=t;
  painel.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;"><h2>${esc(titulo)}</h2>${botao('fechar','Fechar')}</div><div data-conteudo></div><p data-mensagem role="status"></p><div data-recuperacao></div><div data-rascunho></div><div data-navegacao></div>`;painel.querySelector('[data-acao="fechar"]').addEventListener('click',()=>{if(typeof fechar==='function'){fechar();}else if(permitirTroca()){tela=null;++abertura;painel.remove();}});painel.addEventListener('input',()=>{if(!vigente(t))return;try{t.guardarAntesSair?.();guardarRascunho(t);}catch(e){aviso(painel,e.message,true);}});painel.addEventListener('change',()=>{if(!vigente(t))return;try{t.guardarAntesSair?.();guardarRascunho(t);}catch(e){aviso(painel,e.message,true);}});retorno(t);oferecerRascunho(t);return t;
 }
 function recuperacao(t){
  let pending;const el=t.painel.querySelector('[data-recuperacao]');try{pending=pendente(t.ctx);}catch(e){aviso(t.painel,e.message,true);return true;}if(!pending){el.replaceChildren();return false;}
  el.innerHTML=`<div class="card" style="border:1px solid var(--yellow);"><p>A confirmação desta tentativa ainda precisa ser conferida. Seus dados estão guardados; confira antes de fazer outro envio.</p>${botao('recuperar','Conferir a mesma tentativa')}</div>`;
  el.querySelector('button').addEventListener('click',()=>{void recuperar(t,pending);});return true;
 }
 async function recuperar(t,p){
  if(t.busy)return;t.busy=true;aviso(t.painel,'Conferindo a mesma tentativa…');
  try{exigirTela(t);p=await conferirTentativa(t.ctx,p);exigirTela(t);const r=await chamar('providencias_gravacao_ler_cp140',{id:p.id,operacao:p.operacao});exigirTela(t);
   if(r.operacao?.confirmada){const rec=await conferirRecibo(t,r,p);exigirTela(t);if(rec.estado!=='recusada')guardarConfirmada(t,p);limpar(t.ctx,p);if(rec.estado==='recusada'){recusa(t,r);return;}t.sujo=null;try{await atualizarProjecao(true);await aoAtualizar();}catch{}exigirTela(t);t.busy=false;await abrir(p.id);}
   else{if(r.operacao?.id!==p.operacao||r.operacao?.estado!=='ausente')throw Error('A consulta não confirmou a ausência da mesma tentativa.');aviso(t.painel,'Não encontrei confirmação desta tentativa. Você pode repetir o mesmo envio, sem criar outra providência.');const el=t.painel.querySelector('[data-recuperacao]');el.innerHTML=botao('repetir','Repetir o mesmo envio');el.querySelector('button').addEventListener('click',()=>{void enviar(t,p.acao,p.payload,p.id,true);});}
  }catch(e){if(vigente(t))aviso(t.painel,e.message||'Não consegui conferir. A tentativa foi mantida.',true);}finally{t.busy=false;}
 }
 function recusa(t,r){
  aviso(t.painel,r.motivoRecusa||r.operacao?.recibo?.motivo||'A versão mudou. Seus campos continuam aqui; confira a versão atual antes de preparar outra tentativa.',true);
  const el=t.painel.querySelector('[data-recuperacao]');el.innerHTML=r.providencia?'<div class="card"><b>Há uma versão atual para comparar.</b><p>Seu formulário não foi substituído. Abra a ficha atual para conferir seus vínculos antes de alterar a mesma providência.</p>'+botao('comparar','Conferir registro atual')+'</div>':'<p>Seus campos foram preservados. Confira novamente a fonte antes de tentar salvar.</p>';
  el.querySelector('button')?.addEventListener('click',()=>{void abrir(r.providencia.id);});
  t.recusada=true;t.recusaRegistro=!!r.providencia;
 }
 async function enviar(t,acao,payload,id,repetir=false){
  if(t.busy)return;exigirTela(t);if(t.recusada)throw Error('Confira o registro atual antes de enviar outra tentativa. Seus campos foram preservados.');
  const anterior=pendente(t.ctx);if(anterior&&!repetir){recuperacao(t);aviso(t.painel,'Confira a tentativa anterior antes de enviar outra.',true);return;}
  t.busy=true;const box=t.painel.querySelector('[data-conteudo]');box.inert=true;
  let tentativa=null,confirmada=false;
  try{
   const operacao=repetir?payload.operacao:'prov140_'+crypto.randomUUID().replaceAll('-',''),request=clonar(repetir?payload:{...payload,operacao});
   tentativa=await conferirTentativa(t.ctx,{schema:1,id,operacao,acao,payload:request,autoria:autoriaKey(t.ctx),...(repetir&&anterior?.hashPayload?{hashPayload:anterior.hashPayload}:{})});exigirTela(t);
   guardar(t.ctx,tentativa);aviso(t.painel,'Conferindo e salvando no servidor…');
   const r=await chamar('providencias_gravacao_'+acao+'_cp140',clonar(request));exigirTela(t);const rec=await conferirRecibo(t,r,tentativa);exigirTela(t);if(rec.estado!=='recusada')guardarConfirmada(t,tentativa);limpar(t.ctx,tentativa);confirmada=true;
   if(rec.estado==='recusada'){recusa(t,r);return;}
   t.sujo=null;try{await atualizarProjecao(true);await aoAtualizar();}catch{}exigirTela(t);t.busy=false;await abrir(id);
  }catch(e){if(vigente(t)){aviso(t.painel,(confirmada?'A operação foi confirmada. Não repita o envio. ':'')+(e.message||'Não consegui confirmar. Seus campos e a tentativa estão guardados.'),true);recuperacao(t);}}
  finally{t.busy=false;if(vigente(t))box.inert=false;}
 }
 async function listar(){
  const t=novaTela('Providências das gravações');if(!t)return;
  const box=t.painel.querySelector('[data-conteudo]');box.innerHTML='<p>Conferindo a lista…</p>';t.painel.querySelector('[data-navegacao]').innerHTML=botao('tentar','Conferir novamente');t.painel.querySelector('[data-navegacao] button').addEventListener('click',()=>{void listar();});recuperacao(t);
  try{const r=await chamar('providencias_gravacao_listar_cp140',{incluirFinalizadas:false});exigirTela(t);
   validarListaPrivada(r);
   box.innerHTML=`<p class="desc">Uma providência pode servir a vários conteúdos. Cada cliente e mês mantém seus próprios vínculos e histórico.</p><div class="card"><label style="display:grid;gap:6px;">Cliente para consulta<select data-campo="filtroCliente"><option value="">Todos os clientes · pendentes</option>${clientes().map(c=>`<option value="${esc(c.slug)}">${esc(c.nome||c.name||c.slug)}</option>`).join('')}</select></label>${campo('filtroCompetencia','Mês para consulta','','month')}${botao('filtrar','Conferir pendentes com estes filtros')}<p class="desc">Para consultar encerradas, escolha um cliente e um mês. A lista inicial mantém todas as pendências.</p></div>${gestor(t.ctx)?botao('nova','Registrar providência autorizada',''):''}<div data-lista>${r.itens.length?r.itens.map(htmlCartao).join(''):'<p>Nenhuma providência ativa neste momento.</p>'}</div>${botao('historico','Consultar também as encerradas')}`;
   box.querySelector('[data-acao="nova"]')?.addEventListener('click',()=>{void formulario();});bindAbrir(box);
   const consultar=async incluirFinalizadas=>{if(t.busy)return;try{exigirTela(t);const cliente=valor(box,'filtroCliente'),competencia=valor(box,'filtroCompetencia'),filtro=JSON.stringify([cliente,competencia]);if(incluirFinalizadas&&(!cliente||!competencia))throw Error('Escolha um cliente e um mês para consultar também as providências encerradas.');t.busy=true;const r=await chamar('providencias_gravacao_listar_cp140',{incluirFinalizadas,...(cliente?{cliente}:{}),...(competencia?{competencia}:{})});exigirTela(t);if(filtro!==JSON.stringify([valor(box,'filtroCliente'),valor(box,'filtroCompetencia')]))throw Error('Os filtros mudaram durante a consulta. Confira a seleção antes de consultar novamente.');validarListaPrivada(r);box.querySelector('[data-lista]').innerHTML=r.itens.map(htmlCartao).join('')||'<p>Nenhuma providência registrada com estes filtros.</p>';bindAbrir(box.querySelector('[data-lista]'));await vinculos.listarNo(box,t,{incluirFinalizadas,...(cliente?{cliente}:{}),...(competencia?{competencia}:{})});exigirTela(t);aviso(t.painel,incluirFinalizadas?'Providências ativas e encerradas deste cliente e mês conferidas.':'Providências pendentes conferidas.');}catch(e){if(vigente(t))aviso(t.painel,e.message,true);}finally{t.busy=false;}};
   box.querySelector('[data-acao="historico"]').addEventListener('click',()=>{void consultar(true);});box.querySelector('[data-acao="filtrar"]').addEventListener('click',()=>{void consultar(false);});await vinculos.listarNo(box,t);
  }catch(e){if(vigente(t))aviso(t.painel,e.message,true);}
 }
 async function abrir(id,rascunho=null){
  const t=novaTela('Acompanhar providência');if(!t)return;t.tokenRascunho=rascunho?.tokenRascunho;const box=t.painel.querySelector('[data-conteudo]');box.innerHTML='<p>Conferindo a versão atual…</p>';recuperacao(t);
  try{t.dto=await chamar('providencias_gravacao_ler_cp140',{id});exigirTela(t);if(t.dto?.fonteColecao!==colecaoPrivada||t.dto?.providencia?.id!==id||!assinaturaValida(t.dto.assinatura))throw Error('A ficha não confirmou a mesma providência.');const r=t.dto.resumo,d=t.dto.providencia,m=d.providenciaGravacaoCp140,c=t.dto.capacidades;
   box.innerHTML=`${htmlCartao(r)}${!t.dto.fonteConferida?`<p role="alert" style="color:var(--yellow);">${esc(t.dto.motivoFonte)}</p>`:''}
    <div class="card"><b>Quando está atendido?</b><p style="white-space:pre-wrap;">${esc(r.criterio)}</p>${d.refazerUltimoI161?.motivo?`<p><b>${d.status==='pendente'?'Amanda pediu para ajustar:':'Último ajuste pedido · histórico:'}</b> ${esc(d.refazerUltimoI161.motivo)}</p>`:''}
    ${d.provaTexto?`<p><b>Confirmação registrada</b></p><div style="white-space:pre-wrap;">${esc(d.provaTexto)}</div>${d.provaImagemUrl?`<p>${esc(d.provaImagemUrl)}</p>`:''}`:''}</div>
    <details><summary>Conteúdos e versão de origem</summary><ul>${listaOrigem(r)}</ul>${m.sessaoId?`<p>Gravação vinculada: ${esc(m.sessaoId)}</p>`:''}</details>
    ${c.esperar?`<div class="card"><h3>Precisa de um retorno?</h3>${campo('aguardandoPor','De quem você está esperando?',m.espera?.pessoa||'')}${area('motivoEspera','O que falta ou qual foi o retorno?',m.espera?.texto||'')}${campo('previsaoData','Próximo retorno combinado (opcional)',m.espera?.previsaoData||'','date')}${botao('esperar','Registrar espera')}${m.espera?botao('retomar','O retorno chegou — retomar'):''}</div>`:''}
    ${c.confirmar?`<div class="card"><h3>O combinado já está atendido?</h3>${area('provaTexto','Conta o que foi confirmado e com quem. Um texto claro basta para um combinado simples.','',10000)}${campo('provaLink','Link do material ou da confirmação, se precisar','','url',2000)}<label><input type="checkbox" data-campo="criterioConfirmado"> Conferi o compromisso acima e ele foi atendido.</label><p class="desc">A Amanda confere a entrega. Não é confirmação de postagem nem aprovação do calendário.</p>${botao('confirmar','Confirmar e enviar à Amanda','green')}</div>`:''}
    ${c.aprovar||c.refazer?`<div class="card"><h3>Revisão da Amanda</h3>${c.aprovar?botao('aprovar','Conferi esta entrega — aprovar','green'):''}${c.refazer?`${area('motivoRefazer','Se precisar ajustar, explique o que falta')}${botao('refazer','Pedir para refazer')}`:''}</div>`:''}
    ${c.salvar?botao('editar','Reconferir ou atualizar esta providência'):''}
    ${c.cancelar||c.substituir?`<details style="margin:14px 0;"><summary>Cancelar ou substituir</summary>${area('motivoCancelar','Explique a decisão')}${c.cancelar?botao('cancelar','Cancelar esta providência'):''}${c.substituir?`${campo('substituidaPorId','Identificador da providência que atende este compromisso')}${botao('substituir','Vincular substituta e encerrar esta')}`:''}</details>`:''}
    <details style="margin:14px 0;"><summary>Histórico · ${d.historico.length}</summary>${d.historico.map(h=>`<p><b>${esc(h.acao.replace('providencia_gravacao_','').replace('_cp140',''))}</b> · ${esc(h.por)}${h.atorReal!==h.por?' (operado por '+esc(h.atorReal)+')':''} · ${esc(h.em)}${h.motivo?'<br>'+esc(h.motivo):''}</p>`).join('')}</details>${botao('lista','Voltar à lista')}`;
   box.querySelectorAll('[data-abrir]').forEach(b=>b.remove());const inicialDetalhe=JSON.stringify([...box.querySelectorAll('[data-campo]')].map(e=>[e.dataset.campo,e.type==='checkbox'?e.checked:e.value]));t.sujo=()=>JSON.stringify([...box.querySelectorAll('[data-campo]')].map(e=>[e.dataset.campo,e.type==='checkbox'?e.checked:e.value]))!==inicialDetalhe;t.rascunho=()=>({tipo:'detalhe',id,dto:clonar(t.dto),campos:[...box.querySelectorAll('[data-campo]')].map(e=>[e.dataset.campo,e.type==='checkbox'?e.checked:e.value])});if(rascunho?.campos){for(const [n,v]of rascunho.campos){const el=box.querySelector(`[data-campo="${n}"]`);if(el){if(el.type==='checkbox')el.checked=v===true;else el.value=String(v);}}aviso(t.painel,'Campos guardados retomados. Confira a versão atual antes de enviar.');}const confirmadoLocal=lerRascunho(t.ctx);if(confirmadoLocal?.tipo==='confirmada'&&confirmadoLocal.id===id){storage?.removeItem(confirmadoLocal.chaveStorage);t.painel.querySelector('[data-rascunho]').replaceChildren();}
   box.addEventListener('click',async ev=>{const a=ev.target.closest('[data-acao]')?.dataset.acao;if(!a||t.busy)return;try{exigirTela(t);
    if(a==='lista')return void listar();if(a==='editar')return void formulario(t.dto);
    if(a==='esperar'||a==='retomar'){const motivo=valor(box,'motivoEspera');if(!motivo)throw Error('Conta o que falta ou o que foi resolvido.');return await enviar(t,'esperar',{...base(t),aguardandoPor:a==='retomar'?'':valor(box,'aguardandoPor'),motivo,previsaoData:a==='retomar'?'':valor(box,'previsaoData')},id);}
    if(a==='confirmar'){const provaTexto=valor(box,'provaTexto'),ok=box.querySelector('[data-campo="criterioConfirmado"]')?.checked;if(!ok||!provaTexto)throw Error('Confira o compromisso e conta como ele foi atendido.');return await enviar(t,'confirmar',{...base(t),criterioConfirmado:true,provaTexto,provaLink:valor(box,'provaLink')},id);}
    if(a==='aprovar'||a==='refazer'){const motivo=a==='refazer'?valor(box,'motivoRefazer'):'';if(a==='refazer'&&!motivo)throw Error('Escreve o que precisa ajustar.');return await enviar(t,'revisar',{...base(t),decisao:a,motivo},id);}
    if(a==='cancelar'||a==='substituir'){const motivo=valor(box,'motivoCancelar');if(!motivo)throw Error('Escreve o motivo desta decisão.');return await enviar(t,a,{...base(t),motivo,...(a==='substituir'?{substituidaPorId:valor(box,'substituidaPorId')}:{})},id);}
   }catch(e){if(vigente(t))aviso(t.painel,e.message,true);}});
  }catch(e){if(vigente(t))aviso(t.painel,e.message,true);}
 }
 async function formulario(dto=null,rascunho=null){
  if(!gestor(contexto()))return;const t=novaTela(dto?'Atualizar a mesma providência':'Registrar providência autorizada');if(!t)return;
  const box=t.painel.querySelector('[data-conteudo]'),d=dto?.providencia,m=d?.providenciaGravacaoCp140,origem=m?.origem;
  t.dto=dto;t.tokenRascunho=rascunho?.tokenRascunho;recuperacao(t);
  box.innerHTML=`<p class="desc">Use depois de o Chris autorizar a versão e sua montagem. Registre a ação completa; se um material servir a vários conteúdos, marque todos aqui e mantenha a mesma chave nas atualizações.</p>
   <label style="display:grid;gap:6px;">Cliente<select data-campo="cliente" ${d?'disabled':''}><option value="">Escolha o cliente</option>${clientes().map(c=>`<option value="${esc(c.slug)}" ${origem?.cliente===c.slug?'selected':''}>${esc(c.nome||c.name||c.slug)}</option>`).join('')}</select></label>
   ${campo('competencia','Mês da pauta',origem?.competencia||'','month')}${botao('fonte','Conferir os conteúdos deste mês')}
   <div data-form hidden></div>${botao('lista','Voltar à lista')}`;
  if(d)box.querySelector('[data-campo="competencia"]').disabled=true;
  let fonte=null,assinaturaFonte='',selecao='';
  const retratoForm=()=>JSON.stringify([...box.querySelectorAll('[data-campo],[data-item]')].map(e=>[e.dataset.campo||e.dataset.item,e.type==='checkbox'?e.checked:e.value]));let inicialForm=retratoForm();t.sujo=()=>retratoForm()!==inicialForm;t.rascunho=()=>({tipo:'formulario',dto:dto?clonar(dto):null,campos:[...box.querySelectorAll('[data-campo]')].map(e=>[e.dataset.campo,e.type==='checkbox'?e.checked:e.value]),itemIds:[...box.querySelectorAll('[data-item]:checked')].map(e=>e.dataset.item),itens:fonte?.itens||[]});
  function travarOrigem(){box.querySelector('[data-campo="cliente"]').disabled=true;box.querySelector('[data-campo="competencia"]').disabled=true;}
  const atual=()=>JSON.stringify([valor(box,'cliente'),valor(box,'competencia')]);
  box.querySelector('[data-acao="lista"]').addEventListener('click',()=>{void listar();});
  const carregarFonte=async()=>{
   if(t.busy)return;try{exigirTela(t);const c=valor(box,'cliente'),mes=valor(box,'competencia'),antes=atual();if(!c||!mes)throw Error('Escolha o cliente e o mês da pauta.');
    t.busy=true;const selecaoAnterior=[...box.querySelectorAll('[data-item]:checked')].map(e=>e.dataset.item),r=await chamar('providencias_gravacao_listar_fonte_cp140',{cliente:c,competencia:mes});exigirTela(t);if(antes!==atual())throw Error('O cliente ou mês mudou. Confira a nova seleção.');
    if(!r.capacidades?.salvar||r.fonte?.cliente!==c||r.fonte?.competencia!==mes||!assinaturaValida(r.assinaturaFonte)||!Array.isArray(r.itens)||!r.itens.length||new Set(r.itens.map(i=>i.itemId)).size!==r.itens.length||r.itens.some(i=>!i.itemId||!assinaturaValida(i.versao)))throw Error('Essa pauta ainda não confirma os conteúdos e a mesma versão para registrar a providência.');const faltantes=selecaoAnterior.filter(id=>!r.itens.some(i=>i.itemId===id));if(faltantes.length){fonte=null;throw Error('Um conteúdo marcado deixou de estar disponível. Seus campos e vínculos anteriores foram preservados. Desmarque o vínculo retirado e confira a pauta novamente antes de salvar.');}fonte=r;assinaturaFonte=r.assinaturaFonte;selecao=antes;t.recusada=!!t.recusaRegistro;travarOrigem();
    const form=box.querySelector('[data-form]'),primeiraAbertura=form.hidden;if(form.hidden){
     form.innerHTML=`${campo('chaveRecurso','Nome curto do recurso (mantenha o mesmo ao atualizar)',origem?.chaveRecurso||'','text',160)}${campo('titulo','Nome da providência',d?.titulo||'','text',300)}${area('acaoNecessaria','O que a Cecília precisa organizar?',m?.acaoNecessaria||'',8000)}
      ${campo('responsavelReal','Quem executa ou fornece de verdade?',m?.responsavelReal||'')}${campo('decisor','Quem decide, se for outra pessoa?',m?.decisor||'')}
      <label style="display:grid;gap:6px;">Tipo de compromisso<select data-campo="tipoConfirmacao">${[['material','Material'],['participantes','Participantes'],['local','Local'],['decisao','Decisão'],['informacao','Informação ou arquivo'],['outro','Outro combinado']].map(([v,n])=>`<option value="${v}" ${m?.tipoConfirmacao===v?'selected':''}>${n}</option>`).join('')}</select></label>
      ${area('criterio','O que precisa estar confirmado para considerar atendido?',m?.criterio||'',3000)}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;">${campo('prazoData','Prazo combinado (vazio = a combinar)',d?.prazoData||'','date')}${campo('prazoHora','Horário combinado, se houver',d?.prazoHora||'','time')}</div>
      <label style="display:grid;gap:6px;">Gravação, se já estiver marcada<select data-campo="sessaoId"><option value="">Ainda não vinculada</option>${sessoes().filter(a=>!a.excluido&&a.status!=='cancelado'&&(a.clienteSlug||a.cliente)===c).map(a=>`<option value="${esc(a.id)}" ${m?.sessaoId===a.id?'selected':''}>${esc(a.data||'Sem data')} · ${esc(a.hora||a.horario||'')} ${esc(a.local||'')}</option>`).join('')}</select></label>
      <fieldset><legend>Conteúdos atendidos por esta providência</legend><div data-itens></div></fieldset>
      ${d?area('motivo','O que mudou e por quê?'):''}
      <label style="display:block;margin:15px 0;"><input type="checkbox" data-campo="autorizacaoChris"> Esta versão e sua montagem foram autorizadas pelo Chris.</label>
      ${botao('salvar','Salvar e encaminhar à Cecília','')}`;form.hidden=false;
     form.querySelector('[data-acao="salvar"]').addEventListener('click',async()=>{if(t.busy)return;try{exigirTela(t);if(!fonte||t.recusada||atual()!==selecao)throw Error('Confira a versão atual da pauta antes de salvar. Seus campos continuam aqui.');
       const p={cliente:valor(box,'cliente'),competencia:valor(box,'competencia'),chaveRecurso:valor(form,'chaveRecurso'),titulo:valor(form,'titulo'),acaoNecessaria:valor(form,'acaoNecessaria'),responsavelReal:valor(form,'responsavelReal'),decisor:valor(form,'decisor'),criterio:valor(form,'criterio'),tipoConfirmacao:valor(form,'tipoConfirmacao'),prazoData:valor(form,'prazoData'),prazoHora:valor(form,'prazoHora'),itemIds:[...form.querySelectorAll('[data-item]:checked')].map(e=>e.dataset.item),empresaOtavio:origem?.empresaOtavio||'',sessaoId:valor(form,'sessaoId'),autorizacaoChris:form.querySelector('[data-campo="autorizacaoChris"]').checked};
       if(!p.autorizacaoChris||!p.itemIds.length||!p.chaveRecurso||!p.titulo||!p.acaoNecessaria||!p.responsavelReal||!p.criterio)throw Error('Preencha a ação, quem executa, o critério, os conteúdos e a autorização.');
       const id=await idProvidenciaGravacaoCp140(p.cliente,p.competencia,p.chaveRecurso);exigirTela(t);if(d&&id!==d.id)throw Error('Mantenha o mesmo cliente, mês e nome curto do recurso.');
       await enviar(t,'salvar',{assinaturaEsperada:dto?.assinatura||null,assinaturaFonte,providencia:p,motivo:valor(form,'motivo')},id);
      }catch(e){if(vigente(t))aviso(t.painel,e.message,true);}});
    }
    if(d)form.querySelector('[data-campo="chaveRecurso"]').disabled=true;form.querySelector('[data-itens]').innerHTML=r.itens.map(i=>`<label style="display:block;padding:8px 0;"><input type="checkbox" data-item="${esc(i.itemId)}" ${(primeiraAbertura?origem?.itens.some(x=>x.itemId===i.itemId):selecaoAnterior.includes(i.itemId))?'checked':''}> Dia ${esc(i.dia)} · ${esc(i.titulo)}${i.empresaOtavio?' · '+esc(i.empresaOtavio):''}</label>`).join('');
    form.querySelector('[data-campo="autorizacaoChris"]').checked=false;if(primeiraAbertura)inicialForm=retratoForm();aviso(t.painel,'Pauta conferida. Cliente e mês ficaram fixos nesta ficha; os campos e os conteúdos marcados são preservados nas consultas. Confira a autorização desta versão antes de salvar.');
   }catch(e){if(vigente(t))aviso(t.painel,e.message,true);}finally{t.busy=false;}
  };
  box.querySelector('[data-acao="fonte"]').addEventListener('click',()=>{void carregarFonte();});
  if(rascunho?.campos){
   for(const [n,v]of rascunho.campos)if(['cliente','competencia'].includes(n)){const el=box.querySelector(`[data-campo="${n}"]`);if(el)el.value=String(v);}
   await carregarFonte();if(!vigente(t))return;
   const form=box.querySelector('[data-form]');if(form.hidden){aviso(t.painel,'Seus campos continuam guardados. Não consegui conferir a mesma fonte para retomá-los.',true);return;}
   for(const [n,v]of rascunho.campos){const el=box.querySelector(`[data-campo="${n}"]`);if(el&&!['cliente','competencia','autorizacaoChris'].includes(n)){if(el.type==='checkbox')el.checked=v===true;else el.value=String(v);}}
   const faltantes=(rascunho.itemIds||[]).filter(id=>!fonte?.itens.some(i=>i.itemId===id));
   for(const e of form.querySelectorAll('[data-item]'))e.checked=(rascunho.itemIds||[]).includes(e.dataset.item);
   if(faltantes.length){for(const id of faltantes){const i=rascunho.itens?.find(x=>x.itemId===id);form.querySelector('[data-itens]').insertAdjacentHTML('beforeend',`<label style="display:block;color:var(--yellow);"><input type="checkbox" data-item="${esc(id)}" checked> ${esc(i?.titulo||id)} — não localizado nesta versão. Reconcilie este vínculo antes de salvar.</label>`);}fonte=null;}
   form.querySelector('[data-campo="autorizacaoChris"]').checked=false;guardarRascunho(t);aviso(t.painel,faltantes.length?'Campos e vínculos guardados retomados. Há conteúdo não localizado; confira os vínculos antes de salvar.':'Campos guardados retomados. Confirme novamente a autorização da versão antes de salvar.',!!faltantes.length);
  }
 }
 return {abrir,listar,formulario,renderInicio,renderEntradas,renderMinhas,renderRevisao,atualizarProjecao,contadores,podeSair,canLeave:permitirTroca,eh:providenciaEhCp140};
}
