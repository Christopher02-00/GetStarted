/* A casca usa os controladores atuais; não possui banco, credencial ou writer. */
const GESTAO=['Chris','Amanda'];
const ITEM=(id,titulo,grupo)=>({id,titulo,grupo});
export function areasCentralR87(papel){
 if(papel==='Gabrielle')return [ITEM('materiais','Referências e materiais','preparar'),ITEM('datas','Minhas datas','preparar'),ITEM('legendas','Apoiar com legendas','conteudo')];
 if(![...GESTAO,'Cecília'].includes(papel))return [];
 return [
  ...(GESTAO.includes(papel)?[ITEM('materiais','Materiais do mês','preparar'),ITEM('datas','Organização das datas','preparar'),ITEM('informacoes','Informações dos clientes','preparar'),ITEM('acervo','Banco de referências','preparar'),ITEM('resultados','Resultados e análises','preparar')]:[]),
  ITEM('calendarios','Calendários e roteiros','conteudo'),
  ...(GESTAO.includes(papel)?[ITEM('aprovar','Revisar calendários','conteudo'),ITEM('stories','Stories','conteudo')]:[]),
  ITEM('legendas','Legendas','conteudo'),
  ITEM('campanhas','Campanhas e datas','publicar'),ITEM('agendar','Fila de agendamento','publicar'),ITEM('programados','Programados','publicar'),ITEM('envios','Enviar ao cliente','publicar'),ITEM('captacao','Captação','publicar'),ITEM('cobertura','Postagem até quando','publicar')
 ];
}
export function areaDaRotaR87(view,{calSub='',postSub='',ultima=''}={}){
 const mapa={planejamentoPreparacaoR80:'materiais',agendaOrganizacao:'datas',informacoesCentralR87:'informacoes',referencias:'acervo',analisesMensais:'resultados',stories:'stories',campanhas:'campanhas',agendamento:'captacao',controlePostagem:'cobertura'};
 if(view==='postagens')return postSub==='legenda'?'legendas':postSub==='gradeMes'?'programados':'agendar';
 if(view==='calendarios')return ['links','envio'].includes(calSub)?'envios':'calendarios';
 if(view==='gerencia'&&ultima==='aprovar')return 'aprovar';
 return mapa[view]||'';
}
const CSS=`.central-r87{max-width:1240px;margin:0 auto 20px;padding:22px;border:1px solid #e6b94b55;border-radius:19px;background:linear-gradient(120deg,#333127,#242a2d)}.central-r87[hidden]{display:none!important}.central-r87 *{box-sizing:border-box}.central-r87 header{display:flex;justify-content:space-between;gap:16px;align-items:start}.central-r87 small{font-size:10px;letter-spacing:.1em;color:#e4c46d}.central-r87 h1{font-size:25px;margin:6px 0}.central-r87 p{font-size:12px;line-height:1.6;opacity:.84;margin:6px 0 12px}.central-r87 button{border:1px solid #ffffff25;border-radius:11px;background:#ffffff08;color:inherit;padding:11px 14px;font:600 12px system-ui;cursor:pointer}.central-r87 button:hover{background:#ffffff15}.central-r87 button[aria-current]{background:#f4c23c;color:#211c0e;border-color:#f4c23c}.central-r87 nav{display:flex;flex-wrap:wrap;gap:8px}.central-r87 .central-r87-grupos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin:12px 0}.central-r87-grupos button{text-align:left;border-top:3px solid var(--tom,#bba3e9)}.central-r87-grupos button strong,.central-r87-grupos button span{display:block}.central-r87-grupos button span{font-size:10px;opacity:.75;margin-top:5px}.central-r87 [data-grupo=conteudo]{--tom:#edc86d}.central-r87 [data-grupo=publicar]{--tom:#8ac8ad}.central-r87-status{font-size:11px!important}.central-r87 .central-r87-etapas{border-top:1px solid #ffffff18;padding-top:13px}.central-r87-count{display:inline-block;margin-left:6px;background:#bc4b54;color:white;border-radius:20px;padding:2px 6px}@media(max-width:640px){.central-r87{padding:15px}.central-r87 h1{font-size:21px}.central-r87 .central-r87-grupos{gap:6px}.central-r87-grupos button{padding:10px 7px}.central-r87-grupos button strong{font-size:11px}.central-r87-grupos button span{font-size:9px}.central-r87-etapas{flex-wrap:nowrap!important;overflow:auto;padding-bottom:7px}.central-r87-etapas button{flex:0 0 auto}.central-r87 header>button{font-size:10px;padding:8px}}`;
const GRUPOS=[['preparar','1 · Preparar','Cliente, materiais e datas'],['conteudo','2 · Criar e revisar','Roteiros, aprovação e legendas'],['publicar','3 · Publicar','Campanhas, envio e agendamento']];
const NAVS=['navRoteiros','navReferencias','navPostagens','navCalendarios','navAnalisesI108','navStories','navAcompCampanhas','navControlePostagem','navAgendamento'];
const chave=c=>JSON.stringify(['uid','nome','atorReal','sessao','geracao'].map(k=>c?.[k]??''));
export function criarCentralUnificadaR87({documento=document,contexto,abrir,conferir,aoErro=()=>{}}){
 let vivo=true,atual=null,box=null,ultima='',contextKey='',click=null;const escondidos=new Map();
 function restaurar(){for(const [n,v]of escondidos){if(n.isConnected){n.hidden=v.hidden;n.style.display=v.display;delete n.dataset.centralR87Oculto;}}escondidos.clear();}
 function montar(){
  if(box?.isConnected)return box;
  if(!documento.getElementById('central-r87-estilo')){const style=documento.createElement('style');style.id='central-r87-estilo';style.textContent=CSS;documento.head.appendChild(style);}
  box=documento.createElement('section');box.id='centralUnificadaR87';box.className='central-r87';box.hidden=true;box.setAttribute('aria-label','Planejamento Social Media');
  const primeira=documento.querySelector('.view');if(!primeira?.parentNode)return null;primeira.parentNode.insertBefore(box,primeira);
  click=ev=>{const btn=ev.target.closest?.('[data-area-r87],[data-grupo-r87],[data-conferir-r87]');if(!btn||!vivo||!atual?.ativo||chave(contexto())!==contextKey)return;
   if(btn.hasAttribute('data-conferir-r87')){Promise.resolve(conferir()).catch(aoErro);return;}
   const areas=areasCentralR87(contexto().nome),id=btn.dataset.areaR87||areas.find(a=>a.grupo===btn.dataset.grupoR87)?.id;
   if(!areas.some(a=>a.id===id))return;Promise.resolve(abrir(id)).then(ok=>{if(ok!==false&&vivo&&chave(contexto())===contextKey){ultima=id;sincronizar(atual);}}).catch(aoErro);
  };box.addEventListener('click',click);return box;
 }
 function sincronizar(estado){
  if(!vivo)return;const c=contexto(),key=chave(c);if(key!==contextKey){restaurar();ultima='';contextKey=key;}atual=estado;
  const areas=areasCentralR87(c.nome),ativo=estado?.ativo===true&&!!c.uid&&areas.length>0;
  restaurar();if(!ativo){if(box)box.hidden=true;documento.getElementById('navCentralCeciliaR87')?.remove();return;}
  for(const id of NAVS){const n=documento.getElementById(id);if(!n)continue;escondidos.set(n,{hidden:n.hidden,display:n.style.display});n.hidden=true;n.style.display='none';n.dataset.centralR87Oculto='1';}
  if(c.nome==='Cecília'&&!documento.getElementById('navCentralCeciliaR87')){
   const nav=documento.createElement('button');nav.id='navCentralCeciliaR87';nav.type='button';nav.className='navitem';nav.textContent='Planejamento Social Media';nav.style.cssText='background:#d8cdf3;color:#322349;font-weight:800;border:0;width:100%;text-align:left;margin:4px 0';
   nav.onclick=()=>abrir('agendar');documento.getElementById('navInicio')?.insertAdjacentElement('afterend',nav);
  }
  const area=areaDaRotaR87(estado.view,{calSub:estado.calSub,postSub:estado.postSub,ultima}),permitida=areas.find(a=>a.id===area);
  if(!montar())return;box.hidden=!permitida;if(!permitida){ultima='';return;}ultima=area;
  const grupo=permitida.grupo;box.replaceChildren();
  const header=documento.createElement('header'),titulo=documento.createElement('div');
  titulo.innerHTML='<small>DO PLANEJAMENTO À PUBLICAÇÃO</small><h1>Planejamento Social Media</h1><p>O mesmo cliente, os mesmos materiais e o próximo passo no mesmo lugar.</p>';
  header.appendChild(titulo);const retry=documento.createElement('button');retry.type='button';retry.dataset.conferirR87='1';retry.textContent='Conferir processo';header.appendChild(retry);box.appendChild(header);
  const grupos=documento.createElement('nav');grupos.className='central-r87-grupos';grupos.setAttribute('aria-label','Etapas do trabalho');
  for(const [id,t,d]of GRUPOS){if(!areas.some(a=>a.grupo===id))continue;const b=documento.createElement('button');b.type='button';b.dataset.grupoR87=id;b.dataset.grupo=id;if(id===grupo)b.setAttribute('aria-current','true');const strong=documento.createElement('strong');strong.textContent=t;const small=documento.createElement('span');small.textContent=d;b.append(strong,small);grupos.appendChild(b);}box.appendChild(grupos);
  const tabs=documento.createElement('nav');tabs.className='central-r87-etapas';tabs.setAttribute('aria-label','Ferramentas do planejamento');
  for(const a of areas.filter(a=>a.grupo===grupo)){const b=documento.createElement('button');b.type='button';b.dataset.areaR87=a.id;b.textContent=a.titulo;if(a.id===area)b.setAttribute('aria-current','page');tabs.appendChild(b);}box.appendChild(tabs);
  const status=documento.createElement('p');status.className='central-r87-status';status.textContent=c.nome==='Gabrielle'?'Referências e documentos por cliente e mês. O apoio de legenda conserva a mesma publicação.':'As datas vêm da Organização; cada conteúdo mantém sua origem, sua legenda e seu histórico.';box.appendChild(status);
 }
 return{sincronizar,selecionar:id=>{ultima=id;},destroy(){vivo=false;restaurar();box?.removeEventListener('click',click);box?.remove();documento.getElementById('navCentralCeciliaR87')?.remove();}};
}
