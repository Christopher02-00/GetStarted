/* Stokki I30. Fonte única: postagens. Projeções não escrevem; o adaptador
   transacional do Escritório confirma sessão, vídeo, identidade e recibo. */
export const REDES=Object.freeze([
  {id:'instagram',campo:'legendaInstagram',nome:'Instagram',cor:'#a52b80'},
  {id:'linkedin',campo:'legendaLinkedin',nome:'LinkedIn',cor:'#0a66c2'},
  {id:'tiktok',campo:'legendaTiktok',nome:'TikTok',cor:'#1664ce'},
  {id:'youtube',campo:'legendaYoutube',nome:'YouTube',cor:'#c5221f'}
]);
export const CHECKS=Object.freeze(['Postagem realizada corretamente','Vídeo correto','Horário correto',
  'Legenda correta','Hashtags corretas','Capa/thumbnail correta','Formato correto','Publicação funcionando corretamente']);
const cp=o=>JSON.parse(JSON.stringify(o));
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const ehStokki=p=>p?.cliente==='stokki';
export const usaFluxo=p=>ehStokki(p)&&p?.publicacaoStokki?.versao===1;
export const assinatura=p=>JSON.stringify([p?.cliente,p?.videoId,p?.calendarClienteSlug,p?.calendarCompetencia,p?.calendarItemId,
  p?.status,p?.excluido,p?.linkVideo,p?.publicacaoStokki,...REDES.map(r=>p?.[r.campo])]);
export function horarioBrasilia(agora=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(agora);
  const v=k=>parts.find(p=>p.type===k).value;
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}
export function dataHoraValida(data,hora){
  return /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(data)&&
    Number.isFinite(Date.parse(data+'T12:00:00Z'))&&new Date(data+'T12:00:00Z').toISOString().slice(0,10)===data&&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}
function redeVazia(){return {data:'',hora:'',retirada:false,publicadaEm:'',publicadaPor:'',url:'',checks:[],conferidaEm:'',conferidaPor:''};}
function exigir(ok,mensagem){if(!ok)throw new Error(mensagem);}
export function validarPlano(p){
  exigir(usaFluxo(p),'Esta postagem não usa a operação por plataforma. O legado foi preservado.');
  const s=p.publicacaoStokki;
  exigir(Array.isArray(s.selecionadas)&&s.selecionadas.length>0&&s.selecionadas.length<=4&&
    new Set(s.selecionadas).size===s.selecionadas.length&&s.selecionadas.every(id=>REDES.some(r=>r.id===id)),'Seleção de plataformas inconsistente.');
  exigir(Number.isInteger(s.revisao)&&s.revisao>0&&s.redes&&Object.keys(s.redes).every(id=>s.selecionadas.includes(id)),'Plano de publicação inconsistente.');
  for(const id of s.selecionadas){const r=s.redes[id];
    exigir(r&&typeof r.retirada==='boolean'&&['data','hora','publicadaEm','publicadaPor','url','conferidaEm','conferidaPor'].every(k=>typeof r[k]==='string')&&
      Array.isArray(r.checks)&&new Set(r.checks).size===r.checks.length&&r.checks.every(x=>Number.isInteger(x)&&x>=0&&x<CHECKS.length),'Conferência inconsistente.');
    exigir(!r.conferidaEm||(!!r.publicadaEm&&r.checks.length===CHECKS.length),'Conferência sem publicação ou sem os oito itens.');
    exigir((!r.data&&!r.hora)||dataHoraValida(r.data,r.hora),'Data ou horário gravado inválido. Corrija o registro antes de continuar.');
  }
  return s;
}
export function prepararLegendas(p,selecionadas,textos,por,em){
  exigir(ehStokki(p),'Cliente diferente da Stokki.');
  exigir(Array.isArray(selecionadas)&&selecionadas.length&&new Set(selecionadas).size===selecionadas.length&&
    selecionadas.every(id=>REDES.some(r=>r.id===id)),'Selecione pelo menos uma plataforma.');
  exigir(!p.publicacaoStokki||Object.values(p.publicacaoStokki.redes||{}).every(r=>!r.publicadaEm),'Existe publicação registrada. Corrija pela operação de publicações, preservando o fato anterior.');
  const escolhidas=REDES.filter(r=>selecionadas.includes(r.id));
  const patch={};
  for(const r of REDES){
    const texto=String(textos[r.id]||'').trim();
    if(selecionadas.includes(r.id))exigir(texto.length>0&&texto.length<=20000,`Preencha a legenda de ${r.nome} (até 20 mil caracteres).`);
    patch[r.campo]=selecionadas.includes(r.id)?texto:'';
  }
  patch.legenda=patch[escolhidas[0].campo];
  patch.publicacaoStokki={versao:1,revisao:(p.publicacaoStokki?.revisao||0)+1,selecionadas:escolhidas.map(r=>r.id),
    redes:Object.fromEntries(escolhidas.map(r=>[r.id,redeVazia()])),por,em,operacaoId:''};
  return patch;
}
export function estadoGeral(s){
  const redes=s.selecionadas.map(id=>s.redes[id]).filter(r=>!r.retirada);
  if(!redes.length)return 'cancelada_manual';
  if(redes.every(r=>r.publicadaEm))return 'postado';
  return redes.some(r=>r.data||r.publicadaEm)?'agendado':'aguardando_agendamento';
}
export function alterar(p,acao,ctx){
  exigir(p?.excluido!==true,'Postagem arquivada; nenhum dado foi alterado.');
  exigir(['Amanda','Cecília','Chris'].includes(ctx.papel),'Esta operação é de Amanda/Cecília; Chris mantém auditoria.');
  if(acao.tipo==='definir_redes'){
    exigir(ehStokki(p)&&!p.publicacaoStokki&&p.status==='aguardando_agendamento','Somente um vídeo do fluxo anterior, ainda não agendado, pode entrar manualmente. Plano de outra versão exige atualizar a página.');
    exigir(acao.operacaoId&&String(acao.motivo||'').trim(),'Informe o motivo da definição manual de plataformas.');
    const patch=prepararLegendas(p,acao.selecionadas,acao.textos,ctx.ator,ctx.em);
    patch.publicacaoStokki.operacaoId=acao.operacaoId;
    Object.assign(patch,{status:'aguardando_agendamento',legendaPor:ctx.ator,legendaEm:ctx.em,dataAgendada:'',horaAgendada:''});
    return {patch,concluiu:false,publicado:false,historico:{acao:'Stokki — definir plataformas manualmente',por:ctx.ator,em:ctx.em,
      detalhe:JSON.stringify({operacaoId:acao.operacaoId,motivo:acao.motivo,legendasAnteriores:Object.fromEntries(['legenda',...REDES.map(r=>r.campo)].map(k=>[k,p[k]||'']))})}};
  }
  exigir(['aguardando_agendamento','agendado','postado','cancelada_manual'].includes(p.status),'O vídeo mudou de etapa. Aguarde a aprovação e as legendas atuais.');
  const s=cp(validarPlano(p));
  const nova=acao.tipo==='adicionar';
  if(nova){
    exigir(REDES.some(d=>d.id===acao.rede)&&!s.selecionadas.includes(acao.rede),'Escolha uma plataforma ainda não incluída. Para rede retirada, use Restaurar.');
    s.selecionadas.push(acao.rede);s.redes[acao.rede]=redeVazia();
  }
  const r=s.redes[acao.rede];
  exigir(r&&s.selecionadas.includes(acao.rede),'A plataforma não pertence a esta postagem.');
  exigir(acao.operacaoId&&typeof acao.operacaoId==='string','Identificador da ação ausente.');
  const exigeMotivo=['desagendar','retirar','restaurar','desfazer_publicacao','corrigir_legenda','adicionar'].includes(acao.tipo)||
    (acao.tipo==='agendar'&&r.data);
  if(exigeMotivo)exigir(String(acao.motivo||'').trim(),'Informe um motivo curto para a correção.');
  if(r.retirada)exigir(acao.tipo==='restaurar','Esta rede foi retirada. Restaure-a antes de continuar.');
  const antes={...cp(r),...(acao.tipo==='corrigir_legenda'?{legenda:p[REDES.find(x=>x.id===acao.rede).campo]||''}:{})};
  const patch={};
  switch(acao.tipo){
    case 'agendar':
      exigir(!r.publicadaEm,'Desfaça a confirmação equivocada antes de reagendar.');
      exigir(dataHoraValida(acao.data,acao.hora),'Informe data e horário válidos. Horários são de Brasília.');
      r.data=acao.data;r.hora=acao.hora;r.checks=[];r.conferidaEm='';r.conferidaPor='';break;
    case 'desagendar':
      exigir(!r.publicadaEm,'A rede já tem publicação confirmada.');r.data='';r.hora='';break;
    case 'publicar': {
      exigir(!r.publicadaEm,'Esta publicação já foi confirmada.');
      exigir(dataHoraValida(r.data,r.hora),'Registre primeiro a data e o horário desta publicação.');
      exigir(`${r.data}T${r.hora}`<=horarioBrasilia(new Date(ctx.em)),'O horário ainda não chegou. Se ocorreu antes, corrija a data/hora primeiro.');
      const url=String(acao.url||'').trim();
      if(url){let u;try{u=new URL(url);}catch{}exigir(u?.protocol==='https:'&&!u.username&&!u.password,'Use um link HTTPS válido, ou deixe em branco.');}
      r.publicadaEm=ctx.em;r.publicadaPor=ctx.ator;r.url=url;r.checks=[];r.conferidaEm='';r.conferidaPor='';break;
    }
    case 'conferir':
      exigir(r.publicadaEm,'Confirme primeiro que esta plataforma foi publicada.');
      exigir(Array.isArray(acao.checks)&&CHECKS.every((_,i)=>acao.checks.includes(i))&&new Set(acao.checks).size===CHECKS.length,'Confira os oito itens antes de concluir.');
      exigir(!r.conferidaEm,'A conferência já foi concluída.');
      r.checks=CHECKS.map((_,i)=>i);r.conferidaEm=ctx.em;r.conferidaPor=ctx.ator;break;
    case 'desfazer_publicacao':
      exigir(r.publicadaEm,'Não existe publicação confirmada para desfazer.');
      r.publicadaEm='';r.publicadaPor='';r.url='';r.checks=[];r.conferidaEm='';r.conferidaPor='';break;
    case 'retirar':
      exigir(!r.publicadaEm,'Publicação real não pode ser apagada. Se a confirmação foi um engano, desfaça-a primeiro.');
      r.retirada=true;r.data='';r.hora='';r.checks=[];break;
    case 'restaurar':r.retirada=false;r.data='';r.hora='';break;
    case 'adicionar':
    case 'corrigir_legenda': {
      const texto=String(acao.texto||'').trim();exigir(texto&&texto.length<=20000,'Informe a legenda correta, até 20 mil caracteres.');
      const def=REDES.find(x=>x.id===acao.rede);patch[def.campo]=texto;
      if(s.selecionadas[0]===acao.rede)patch.legenda=texto;
      r.checks=[];r.conferidaEm='';r.conferidaPor='';break;
    }
    default:throw new Error('Ação desconhecida. Nada foi alterado.');
  }
  s.revisao++;s.operacaoId=acao.operacaoId;s.por=ctx.ator;s.em=ctx.em;
  const status=estadoGeral(s);
  const proximas=s.selecionadas.map(id=>s.redes[id]).filter(x=>!x.retirada&&!x.publicadaEm&&x.data).sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
  const final=s.selecionadas.map(id=>s.redes[id]).filter(x=>!x.retirada&&x.data).sort((a,b)=>(b.data+b.hora).localeCompare(a.data+a.hora));
  const referencia=proximas[0]||final[0];
  Object.assign(patch,{publicacaoStokki:s,status,dataAgendada:referencia?.data||'',horaAgendada:referencia?.hora||'',
    confirmacaoPostagemCriada:false,postadoEm:status==='postado'?(p.postadoEm||ctx.em):'',postadoPor:status==='postado'?(p.postadoPor||ctx.ator):''});
  const historico={acao:'Stokki — '+acao.tipo+' / '+acao.rede,por:ctx.ator,em:ctx.em,
    detalhe:JSON.stringify({operacaoId:acao.operacaoId,motivo:acao.motivo||'',antes,depois:r})};
  return {patch,historico,concluiu:['postado','cancelada_manual'].includes(status),publicado:status==='postado'};
}
export function eventos(posts){
  const out=[];
  for(const p of posts){
    if(!usaFluxo(p)||p.excluido===true||!['agendado','postado'].includes(p.status))continue;
    const s=validarPlano(p);
    for(const id of s.selecionadas){const r=s.redes[id],d=REDES.find(x=>x.id===id);
      if(r.retirada||!dataHoraValida(r.data,r.hora))continue;
      out.push({postagemId:p.id,rede:id,nome:d.nome,cor:d.cor,titulo:p.titulo||'Vídeo',data:r.data,hora:r.hora,
        legenda:p[d.campo]||'',publicada:!!r.publicadaEm,conferida:!!r.conferidaEm,url:r.url||''});
    }
  }
  return out.sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
}
export function pendencias(posts,agora=horarioBrasilia()){
  const out=[];
  for(const p of posts){
    if(!usaFluxo(p)||p.excluido===true||!['aguardando_agendamento','agendado','postado'].includes(p.status))continue;
    const s=validarPlano(p);
    for(const id of s.selecionadas){const r=s.redes[id],d=REDES.find(x=>x.id===id);
      if(r.retirada||r.conferidaEm)continue;
      const tipo=r.publicadaEm?'conferir':!r.data?'agendar':`${r.data}T${r.hora}`<=agora?'confirmar':'';
      if(tipo)out.push({id:p.id,rede:id,tipo,titulo:p.titulo||'Vídeo',nome:d.nome});
    }
  }
  return out;
}
export function formularioLegendas(p){
  const selecionadas=p.publicacaoStokki?.selecionadas||[];
  return `<section data-stokki-legendas="${esc(p.id)}"><p>Escolha onde este vídeo será publicado. Só as redes selecionadas seguem para Cecília.</p>
    <div style="display:flex;flex-wrap:wrap;gap:12px">${REDES.map(r=>`<label style="display:flex;align-items:center;gap:5px;color:${r.cor}"><input type="checkbox" data-stokki-selecao="${r.id}" style="width:auto" ${selecionadas.includes(r.id)?'checked':''}> ${r.nome}</label>`).join('')}</div>
    ${REDES.map(r=>`<div class="field" data-stokki-campo="${r.id}" ${selecionadas.includes(r.id)?'':'hidden'}><label>${r.nome}</label><textarea id="legenda_${esc(p.id)}_${r.campo}" data-stokki-texto="${r.id}" maxlength="20000">${esc(p[r.campo]||'')}</textarea></div>`).join('')}</section>`;
}
export function lerLegendas(form){
  const selecionadas=Array.from(form.querySelectorAll('[data-stokki-selecao]:checked'),x=>x.dataset.stokkiSelecao);
  const textos=Object.fromEntries(Array.from(form.querySelectorAll('[data-stokki-texto]'),x=>[x.dataset.stokkiTexto,x.value]));
  return {selecionadas,textos};
}
export function instalarCampos(doc){
  if(doc.__stokkiCampos)return;doc.__stokkiCampos=true;
  doc.addEventListener('input',ev=>{const form=ev.target.closest?.('[data-stokki-legendas]');if(form)form.dataset.stokkiSujo='true';});
  doc.addEventListener('change',ev=>{const input=ev.target.closest?.('[data-stokki-selecao]');if(!input)return;
    const form=input.closest('[data-stokki-legendas]');
    form.dataset.stokkiSujo='true';
    form.querySelectorAll('[data-stokki-campo]').forEach(c=>{const box=Array.from(form.querySelectorAll('[data-stokki-selecao]')).find(x=>x.dataset.stokkiSelecao===c.dataset.stokkiCampo);c.hidden=!box?.checked;});
  });
}
const rotulo={agendar:'Agendar',confirmar:'Confirmar publicação',conferir:'Publicação confirmada — conferir'};
function badge(r){return `<span style="display:inline-block;background:${r.cor};color:white;padding:4px 9px;border-radius:6px;font-weight:700">${r.nome}</span>`;}
export function linkSeguro(url,rotulo){
  try{const u=new URL(String(url||''));if(u.protocol!=='https:'||u.username||u.password)return '';}
  catch{return '';}
  return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="color:#79bdff;overflow-wrap:anywhere">${esc(rotulo)}</a>`;
}
function historicoLegivel(h){
  let d={};try{d=JSON.parse(h.detalhe||'{}');}catch{return esc(h.detalhe||'');}
  return esc(d.motivo||'Registro operacional confirmado')+
    (d.antes?.data?'<br>Antes: '+esc(d.antes.data)+' '+esc(d.antes.hora):'')+
    (d.depois?.data?'<br>Depois: '+esc(d.depois.data)+' '+esc(d.depois.hora):'')+
    (d.antes?.legenda?'<details><summary>Legenda anterior preservada</summary><p style="white-space:pre-wrap">'+esc(d.antes.legenda)+'</p></details>':'');
}
export function htmlCalendario(posts,mes){
  exigir(/^20\d{2}-(0[1-9]|1[0-2])$/.test(mes),'Mês inválido.');
  const es=eventos(posts).filter(e=>e.data.slice(0,7)===mes);
  const dias=[...new Set(es.map(e=>e.data))];
  const grupos=dias.map(d=>`<section class="card"><h3>${esc(d.split('-').reverse().join('/'))}</h3>${es.filter(e=>e.data===d).map(e=>`<article style="margin:12px 0;padding:12px;border-left:4px solid ${e.cor};overflow-wrap:anywhere">
    <strong>${e.hora} · ${esc(e.titulo)}</strong> ${badge({nome:e.nome,cor:e.cor})}<div>${e.publicada?'Publicação confirmada':'Agendada — publicação ainda não confirmada'}${e.conferida?' · Conferida':''}</div>
    <details><summary>Ver legenda</summary><p style="white-space:pre-wrap">${esc(e.legenda)}</p></details></article>`).join('')}</section>`).join('');
  return `<h2>Calendário de Postagens — Stokki</h2><p>Somente publicações programadas ou confirmadas, por plataforma. Horários de Brasília. Não inclui gravações ou produção.</p>
    <label>Mês <input type="month" data-stokki-mes value="${mes}" style="max-width:220px"></label>${grupos||'<div class="card">Nenhuma publicação programada neste mês.</div>'}`;
}
export function criarOperacao(api){
  const doc=api.document||document;instalarCampos(doc);
  let posts=[],erro='',painel=null,ocupado=false,geracao=0,retratos=new Map(),timer=null,mostrarHistorico=false;
  const contexto=()=>api.contexto();
  function formulario(p,r){
    const s=p.publicacaoStokki,d=REDES.find(x=>x.id===r),v=s.redes[r];
    const a=(tipo,texto)=>`<button type="button" class="btn secondary" data-stokki-acao="${tipo}" style="width:auto">${texto}</button>`;
    return `<section data-stokki-rede="${r}" style="border:1px solid var(--line,#777);border-radius:10px;padding:14px;margin:12px 0;min-width:0">
      ${badge(d)} <b>${v.retirada?'Retirada do plano':v.conferidaEm?'Conferida por '+esc(v.conferidaPor):v.publicadaEm?'Publicação confirmada — conferir':v.data?'Agendada':'Aguardando agendamento'}</b>
      <details><summary>Legenda / correção manual</summary><textarea data-stokki-legenda maxlength="20000" style="width:100%;min-height:100px">${esc(p[d.campo]||'')}</textarea><button type="button" data-stokki-copiar>Copiar legenda</button>${!v.retirada?a('corrigir_legenda','Salvar legenda corrigida'):''}<p>Corrigir aqui registra o texto usado na rede. Se já publicou, ajuste também na plataforma; a conferência será reaberta.</p></details>
      ${v.retirada?a('restaurar','Restaurar esta plataforma'):!v.publicadaEm?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0"><label>Data<input data-stokki-data type="date" value="${esc(v.data)}"></label><label>Horário de Brasília<input data-stokki-hora type="time" value="${esc(v.hora)}"></label></div>
        ${a('agendar',v.data?'Corrigir data/horário':'Registrar agendamento')}${v.data?a('desagendar','Desfazer agendamento'):''}
        ${v.data?`<label>Link da publicação (opcional)<input data-stokki-url type="url" placeholder="https://..."></label>${a('publicar','Confirmar que publicou nesta plataforma')}`:''}
        ${a('retirar','Retirar esta plataforma do plano')}`:`<p>${esc(v.data)} às ${esc(v.hora)} · Confirmada por ${esc(v.publicadaPor)}<br>${linkSeguro(v.url,'Abrir publicação para conferir')}</p>
        ${!v.conferidaEm?CHECKS.map((t,i)=>`<label style="display:flex;align-items:flex-start;gap:8px;margin:8px 0"><input type="checkbox" data-stokki-check="${i}" style="width:auto">${t}</label>`).join('')+a('conferir','Concluir conferência para Amanda e Cecília'):''}
        ${a('desfazer_publicacao','Desfazer confirmação feita por engano')}`}
    </section>`;
  }
  function desenhar(){
    if(!painel?.isConnected||ocupado)return;
    retratos=new Map(posts.map(p=>[p.id,cp(p)]));
    painel.innerHTML=`<div style="position:sticky;top:-20px;z-index:1;background:#252627;padding:8px 0;display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 style="margin:0;font-size:19px">Stokki — publicações e conferências</h2><button data-stokki-fechar type="button" style="flex-shrink:0;background:#ffd029;color:#171717;border:0;border-radius:6px;padding:9px">Fechar ×</button></div><p>Uma linha por plataforma. Alterações são manuais; nenhuma publicação é marcada pelo relógio. Correções ficam no histórico.</p><div data-stokki-feedback role="status"></div>`;
    if(erro){painel.insertAdjacentHTML('beforeend',`<p role="alert">${esc(erro)}</p><button data-stokki-recarregar>Recarregar</button>`);return;}
    const registros=posts.filter(p=>ehStokki(p)&&p.excluido!==true&&(usaFluxo(p)||p.status==='aguardando_agendamento'));
    const encerrado=p=>{try{return usaFluxo(p)&&['postado','cancelada_manual'].includes(p.status)&&Object.values(validarPlano(p).redes).every(r=>r.retirada||r.conferidaEm);}catch{return false;}};
    const validos=registros.filter(p=>mostrarHistorico||!encerrado(p));
    painel.insertAdjacentHTML('beforeend',`<button type="button" class="btn secondary" data-stokki-historico>${mostrarHistorico?'Mostrar somente em operação':'Mostrar também concluídos e retirados'} (${registros.filter(encerrado).length})</button>`);
    painel.insertAdjacentHTML('beforeend',validos.map(p=>{
      const video=linkSeguro(p.linkVideo,'Abrir vídeo aprovado')||'<span>Link do vídeo indisponível: confira a origem na esteira de vídeos.</span>';
      if(!p.publicacaoStokki)return `<article data-stokki-post="${esc(p.id)}" class="card"><h3>${esc(p.titulo||'Vídeo')}</h3><p>${video}</p><p>Fluxo anterior: ainda não agendado. Pode definir as redes manualmente. Nada é convertido ao abrir esta tela.</p><details><summary>Legenda já existente (para copiar)</summary><p style="white-space:pre-wrap">${esc(p.legenda||'')}</p></details><section data-stokki-rede="">${formularioLegendas(p)}<button type="button" class="btn" data-stokki-acao="definir_redes">Confirmar plataformas e legendas deste vídeo</button></section></article>`;
      try{validarPlano(p);return `<article data-stokki-post="${esc(p.id)}" class="card"><h3>${esc(p.titulo||'Vídeo')}</h3><p>${video}</p>
        ${['aguardando_agendamento','agendado','postado','cancelada_manual'].includes(p.status)?p.publicacaoStokki.selecionadas.map(r=>formulario(p,r)).join('')+
          (p.publicacaoStokki.selecionadas.length<4?`<details><summary>Adicionar uma plataforma que faltou</summary><section data-stokki-rede=""><label>Plataforma<select data-stokki-adicionar>${REDES.filter(r=>!p.publicacaoStokki.selecionadas.includes(r.id)).map(r=>`<option value="${r.id}">${r.nome}</option>`).join('')}</select></label><label>Legenda<textarea data-stokki-legenda maxlength="20000"></textarea></label><button type="button" class="btn secondary" data-stokki-acao="adicionar">Adicionar plataforma e legenda</button></section></details>`:''):'<p>O vídeo está em revisão/legenda. As publicações anteriores ficam preservadas; aguarde o fluxo de aprovação.</p>'}
        <details><summary>Histórico de correções</summary>${(p.historico||[]).filter(x=>String(x.acao).startsWith('Stokki —')).slice().reverse().map(x=>`<div style="margin:10px 0">${esc(x.em)} · ${esc(x.por)} · ${esc(x.acao)}<br><small>${historicoLegivel(x)}</small></div>`).join('')||'Sem correções registradas.'}</details></article>`;}
      catch(e){return `<p role="alert">${esc(p.titulo)}: ${esc(e.message)}</p>`;}
    }).join('')||'<p>Nenhum vídeo no novo fluxo ainda. Os antigos continuam na fila anterior; os novos entram após a Gabi selecionar as plataformas.</p>');
  }
  async function abrir(){
    if(!['Amanda','Cecília','Chris'].includes(contexto().papel))return;
    if(painel)painel.remove();
    painel=doc.createElement('dialog');painel.dataset.stokkiPainel='';painel.style.cssText='width:min(900px,94vw);max-height:90vh;overflow:auto;color:inherit;background:var(--bg,#242526);border:1px solid #888;border-radius:12px;padding:20px;box-sizing:border-box';
    doc.body.append(painel);painel.showModal();desenhar();
    painel.addEventListener('click',async ev=>{
      if(ev.target.closest('[data-stokki-fechar]')){if(!ocupado){painel.close();painel.remove();painel=null;}return;}
      if(ev.target.closest('[data-stokki-recarregar]')){await carregar();return;}
      if(ev.target.closest('[data-stokki-historico]')){mostrarHistorico=!mostrarHistorico;desenhar();return;}
      if(ev.target.closest('[data-stokki-copiar]')){
        const campo=ev.target.closest('[data-stokki-rede]').querySelector('[data-stokki-legenda]');
        try{await navigator.clipboard.writeText(campo.value);api.toast('Legenda copiada.');}
        catch{campo.focus();campo.select();api.toast('Texto selecionado. Use Copiar no seu dispositivo.');}return;
      }
      const botao=ev.target.closest('[data-stokki-acao]');if(!botao||ocupado)return;
      const bloco=botao.closest('[data-stokki-rede]'),id=botao.closest('[data-stokki-post]').dataset.stokkiPost;
      const p=retratos.get(id),tipo=botao.dataset.stokkiAcao,rede=bloco.dataset.stokkiRede||bloco.querySelector('[data-stokki-adicionar]')?.value;
      const acao={tipo,rede,operacaoId:crypto.randomUUID(),data:bloco.querySelector('[data-stokki-data]')?.value||'',hora:bloco.querySelector('[data-stokki-hora]')?.value||'',
        texto:bloco.querySelector('[data-stokki-legenda]')?.value||'',url:bloco.querySelector('[data-stokki-url]')?.value||'',checks:Array.from(bloco.querySelectorAll('[data-stokki-check]:checked'),e=>Number(e.dataset.stokkiCheck))};
      if(tipo==='definir_redes')Object.assign(acao,lerLegendas(bloco.querySelector('[data-stokki-legendas]')));
      if(['desagendar','retirar','restaurar','desfazer_publicacao','corrigir_legenda','adicionar','definir_redes'].includes(tipo)||(tipo==='agendar'&&p.publicacaoStokki.redes[rede].data)){
        const motivo=api.prompt('Motivo curto desta correção (fica no histórico):');if(motivo===null)return;acao.motivo=motivo;
      }
      if(tipo==='publicar'&&!api.confirm('Confirma que este vídeo realmente foi publicado nesta plataforma? O checklist ficará pendente para Amanda e Cecília.'))return;
      const feedback=painel.querySelector('[data-stokki-feedback]');feedback.textContent='Salvando e confirmando no servidor…';ocupado=true;botao.disabled=true;
      try{alterar(p,acao,{...contexto(),em:new Date().toISOString()});await api.salvar(p,acao,contexto());ocupado=false;await carregar();api.toast('Registro confirmado. Amanda e Cecília veem a mesma situação.');}
      catch(e){ocupado=false;botao.disabled=false;feedback.textContent=e.message||String(e);feedback.setAttribute('role','alert');}
    });
    await carregar();
  }
  function avisar(){
    let el=doc.getElementById('stokkiAvisosI30');
    if(!['Amanda','Cecília','Chris'].includes(contexto().papel)){el?.remove();return;}
    if(!el){el=doc.createElement('aside');el.id='stokkiAvisosI30';el.style.cssText='margin:8px 0 14px;padding:10px 14px;border:1px solid #ffc400;border-radius:10px;background:#262626;color:#fff;font-size:13px';(doc.querySelector('.main')||doc.body).prepend(el);el.addEventListener('click',abrir);}
    let ps=[];try{ps=pendencias(posts);}catch(e){erro='Stokki indisponível: '+e.message;}
    const html=`<button type="button" style="background:none;color:inherit;border:0;text-align:left;cursor:pointer"><b>Stokki · ${erro?'leitura indisponível':ps.length+' pendência(s)'}</b><br>${esc(erro||ps.slice(0,2).map(p=>`${rotulo[p.tipo]} · ${p.nome} · ${p.titulo}`).join(' / ')||'Abrir publicações e conferências')}</button>`;
    if(el.innerHTML!==html)el.innerHTML=html;
  }
  async function carregar(){const g=++geracao,c=contexto();try{const novos=await api.listar();if(g!==geracao||JSON.stringify(c)!==JSON.stringify(contexto()))return;posts=novos;erro='';}
    catch(e){if(g!==geracao)return;erro='Não foi possível conferir as publicações da Stokki. '+e.message;}
    avisar();desenhar();}
  return {abrir,carregar,receber(novos){posts=novos;erro='';avisar();
      if(!timer)timer=setInterval(avisar,30000); // Só relógio/projeção; zero gravações automáticas.
      if(painel?.isConnected&&!ocupado&&novos.some(p=>retratos.has(p.id)&&assinatura(p)!==assinatura(retratos.get(p.id)))){
        const feedback=painel.querySelector('[data-stokki-feedback]');
        feedback.innerHTML='A publicação foi atualizada em outra ação. Seu preenchimento foi preservado. <button type="button" data-stokki-recarregar>Conferir dados atuais</button>';
      }
    },
    falhar(e){erro='Não foi possível atualizar a Stokki. '+(e.message||e);avisar();},
    parar(){geracao++;posts=[];erro='';if(timer)clearInterval(timer);timer=null;painel?.remove();painel=null;doc.getElementById('stokkiAvisosI30')?.remove();}};
}
