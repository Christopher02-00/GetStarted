import {legendaUtilizavelI79,camposPendentesI79,pendenciaLegendaI79} from './gs-legenda-qualidade-i79.mjs?v=i79-1';
// I78: consulta compartilhada. Textos e vínculo de produção nunca são escritos aqui.
export const CAMPOS = {legenda:'Legenda principal',legendaInstagram:'Instagram',legendaYoutube:'YouTube',legendaLinkedin:'LinkedIn',legendaTiktok:'TikTok'};
export const EDITAVEIS = new Set(['aguardando_legenda','aguardando_agendamento','agendado']);
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const chave = r=>JSON.stringify([r.calendarId,r.competencia,r.itemId]);
export function referencia(p){
  if(p.calendarItemId){
    if(!p.calendarCompetencia || !p.calendarClienteSlug)return {invalida:true,nativa:true};
    return {calendarId:p.calendarClienteSlug,competencia:p.calendarCompetencia,itemId:p.calendarItemId,nativa:true};
  }
  return p.referenciaLegendaI78 || null;
}
export function resolver(p,linhas){
  const ref=referencia(p);
  if(!ref)return {estado:'sem_referencia'};
  const hits=ref.invalida?[]:linhas.filter(l=>chave(l)===chave(ref));
  if(hits.length!==1 || hits[0].bloqueio)return {estado:'indisponivel',ref,motivo:hits[0]?.bloqueio||'O conteúdo de referência não foi encontrado. Confira o mês e a origem; nenhum outro conteúdo foi escolhido.'};
  return {estado:'confirmado',ref,linha:hits[0]};
}
const rotuloMes=v=>/^\d{4}-\d{2}$/.test(v||'')?v.slice(5)+'/'+v.slice(0,4):'Mês não informado';
const estados={aguardando_legenda:'Aguardando legenda',aguardando_agendamento:'Pronta para agendar',agendado:'Agendada',publicado:'Publicada',postado:'Publicada',cancelada_manual:'Retirada',arquivada_sem_postagem:'Arquivada'};
function linkVideo(p){try{const u=new URL(p.linkVideo);return ['https:','http:'].includes(u.protocol)?`<a href="${e(u.href)}" target="_blank" rel="noopener">Conferir vídeo ↗</a>`:'';}catch{return '';}}
function blocoTextos(d,origem){
  const campos=Object.keys(CAMPOS).filter(k=>String(d?.[k]||'').trim());
  return campos.length?campos.map(k=>legendaUtilizavelI79(d[k])?`<div class="i78-texto"><b>${e(CAMPOS[k])}</b><div style="white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0">${e(d[k])}</div><button class="btn secondary" type="button" data-copiar="${origem}:${k}">Copiar ${e(CAMPOS[k])}</button></div>`:`<div class="i78-texto"><b>${e(CAMPOS[k])} — anotação anterior, não é legenda</b><p style="white-space:pre-wrap;color:var(--yellow)">${e(d[k])}</p></div>`).join(''):'<p class="meta">Sem legenda preenchida nesta origem.</p>';
}

export function criarConferencia(api){
  const doc=api.document,rascunhos=new Map();
  let dialog,corpo,estado,input,ctx,seq=0,busy=false,postId='',escolha='',mes='',editar=false;
  const vigente=()=>JSON.stringify(ctx)===JSON.stringify(api.contexto());
  const post=()=>estado?.postagens.find(p=>p.id===postId);
  const linha=()=>estado?.linhas.find(l=>chave(l)===escolha);
  const copiaManual=p=>!!input?.derivadaPostagemI84&&p?.id===input.postId&&!referencia(p);
  const pode=p=>!copiaManual(p)&&estado?.podeEditar && EDITAVEIS.has(p?.status) && !referencia(p)?.nativa;
  function rascunho(p){if(!rascunhos.has(p.id))rascunhos.set(p.id,{textos:{},origens:{}});return rascunhos.get(p.id);}
  function podeReparar(p){return estado?.podeEditar&&pendenciaLegendaI79(p)&&(!(p.cliente==='stokki'&&p.publicacaoStokki?.versao===1)||['Cecília','Amanda','Chris'].includes(estado.papel));}
  function formularioReparo(p,l,r){
    if(!pendenciaLegendaI79(p))return '';
    if(!podeReparar(p))return '<p class="meta">Legenda pendente. Na Stokki, Cecília ou Amanda confirma o texto das plataformas nesta mesma conferência.</p>';
    const draft=rascunho(p),confirmada=r?.estado==='confirmado'?r.linha:null;
    return `<section><h3>Completar legenda da postagem</h3><p class="meta">Confira o vídeo e o texto. Datas, aprovação e calendário permanecem.</p>${camposPendentesI79(p).map(k=>{
      const fonte=legendaUtilizavelI79(confirmada?.[k])?k:legendaUtilizavelI79(confirmada?.legenda)?'legenda':'';
      return `<label for="i79-${k}">${e(CAMPOS[k])}</label><textarea id="i79-${k}" data-texto-i79="${k}" rows="5" maxlength="20000" style="width:100%;box-sizing:border-box" ${busy?'disabled':''}>${e(draft.textos[k]||'')}</textarea>${fonte&&r?.estado==='confirmado'?`<button class="btn secondary" type="button" data-fonte-i79="${k}" data-campo-fonte="${fonte}" ${busy?'disabled':''}>Usar legenda do calendário${k!=='legenda'?' em '+e(CAMPOS[k]):''}</button>`:''}`;
    }).join('')}<button type="button" class="btn" data-reparar-i79 ${busy?'disabled':''}>Confirmar legenda da postagem</button></section>`;
  }
  function conferir(){if(!vigente())throw Error('O perfil mudou. Feche e abra esta conferência novamente.');}
  function aviso(t){const el=dialog.querySelector('[data-aviso]');el.textContent=t;el.focus();}
  function montar(){
    if(dialog)return;
    const style=doc.createElement('style');style.textContent=`#conferenciaLegendaI78{margin:auto;inset:0;width:min(820px,94vw);max-height:90dvh;box-sizing:border-box;border:1px solid var(--yellow,#ffbf00);border-radius:16px;background:var(--bg,#242527);color:var(--fg,#eee);padding:0}#conferenciaLegendaI78::backdrop{background:#000a}#conferenciaLegendaI78 header{position:sticky;top:0;background:var(--bg,#242527);display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line,#555);z-index:1}#conferenciaLegendaI78 header h2{margin:0;font-size:20px}#conferenciaLegendaI78 main{padding:16px 20px}#conferenciaLegendaI78 section{border:1px solid var(--line,#555);border-radius:12px;padding:16px;margin:0 0 14px}#conferenciaLegendaI78 h3{font-size:17px;margin:0 0 8px}#conferenciaLegendaI78 .btn{width:auto;max-width:100%;white-space:normal}#conferenciaLegendaI78 a{color:var(--yellow,#ffbf00)}#conferenciaLegendaI78 .btn{margin:3px}#conferenciaLegendaI78 label{display:block;margin:12px 0 5px}#conferenciaLegendaI78 select{width:100%;min-height:44px}#conferenciaLegendaI78 .i78-texto{padding:12px;border-radius:8px;background:var(--deep,#1c1d1f);margin:10px 0}#conferenciaLegendaI78 [data-aviso]{outline:none;margin:8px 0;color:var(--yellow,#ffbf00)}`;
    doc.head.append(style);dialog=doc.createElement('dialog');dialog.id='conferenciaLegendaI78';
    dialog.innerHTML='<header><h2>Conteúdo e legenda da postagem</h2><button class="btn secondary" type="button" data-fechar aria-label="Fechar conferência">✕</button></header><main><p data-aviso role="status" tabindex="-1"></p><div data-corpo></div></main>';
    doc.body.append(dialog);corpo=dialog.querySelector('[data-corpo]');
    dialog.querySelector('[data-fechar]').onclick=()=>{if(!busy)dialog.close();};
    dialog.addEventListener('close',()=>{++seq;});
    dialog.addEventListener('cancel',ev=>{if(busy)ev.preventDefault();});
    dialog.addEventListener('input',ev=>{const k=ev.target.dataset.textoI79,p=post();if(k&&p){const d=rascunho(p);d.textos[k]=ev.target.value;delete d.origens[k];}});
    dialog.addEventListener('change',ev=>{
      try{conferir();if(busy)return;
        if(ev.target.matches('[data-post]')){postId=ev.target.value;editar=false;iniciarEscolha();}
        if(ev.target.matches('[data-mes]')){mes=ev.target.value;escolha='';}
        if(ev.target.matches('[data-item]'))escolha=ev.target.value;
        render();
      }catch(err){aviso(err.message);}
    });
    dialog.addEventListener('click',async ev=>{
      const b=ev.target.closest('button');if(!b||b.hasAttribute('data-fechar')||busy)return;
      try{conferir();
        if(b.hasAttribute('data-trocar')){editar=true;escolha='';render();}
        if(b.hasAttribute('data-voltar')){editar=false;iniciarEscolha();render();}
        if(b.hasAttribute('data-copiar')){
          const [origem,campo]=b.dataset.copiar.split(':'),valor=(origem==='post'?post():linha())?.[campo];
          if(!CAMPOS[campo]||!legendaUtilizavelI79(valor))throw Error('Nenhum texto para copiar.');
          await api.copiar(String(valor));conferir();aviso('Legenda copiada.');
        }
        if(b.hasAttribute('data-salvar')||b.hasAttribute('data-remover')){
          const p=post(),l=b.hasAttribute('data-remover')?null:linha();
          if(!pode(p)||(!l&&!b.hasAttribute('data-remover')))throw Error('Escolha a postagem e o conteúdo primeiro.');
          if(l?.bloqueio)throw Error(l.bloqueio);
          if(l?.derivadaPostagemI84)throw Error('Escolha um conteúdo de origem. Esta linha foi criada pela própria postagem.');
          busy=true;render();aviso('Confirmando a referência…');
          try{
            const novo=await api.salvar(p,l,estado,ctx);conferir();
            estado.postagens=estado.postagens.map(v=>v.id===novo.id?novo:v);editar=false;iniciarEscolha();
            api.atualizado?.(novo);aviso(l?'Referência confirmada. A legenda original foi preservada.':'Referência manual retirada. Histórico preservado.');
          }finally{busy=false;if(dialog.open&&vigente())render();}
        }
        if(b.hasAttribute('data-fonte-i79')){
          const p=post(),r=resolver(p,estado.linhas),k=b.dataset.fonteI79,campo=b.dataset.campoFonte;
          if(!podeReparar(p)||r.estado!=='confirmado'||!legendaUtilizavelI79(r.linha[campo]))throw Error('Confirme primeiro o conteúdo de origem.');
          const d=rascunho(p);d.textos[k]=String(r.linha[campo]).trim();d.origens[k]={campo,assinatura:r.linha.assinatura};render();aviso('Texto trazido para conferência. Confirme abaixo para salvar.');
        }
        if(b.hasAttribute('data-reparar-i79')){
          const p=post();if(!podeReparar(p))throw Error('Reabra a postagem com o perfil responsável.');
          const d=rascunho(p),textos=Object.fromEntries(camposPendentesI79(p).map(k=>[k,d.textos[k]||'']));
          busy=true;render();aviso('Confirmando a legenda…');
          try{const novo=await api.reparar(p,textos,d.origens,estado,ctx);conferir();estado.postagens=estado.postagens.map(v=>v.id===novo.id?novo:v);rascunhos.delete(p.id);api.atualizado?.(novo);aviso('Legenda confirmada. Datas e aprovações preservadas.');}
          finally{busy=false;if(dialog.open&&vigente())render();}
        }
        if(b.hasAttribute('data-postagens')){dialog.close();await api.postagens(post());}
        if(b.hasAttribute('data-reler'))await carregar();
      }catch(err){aviso(err.message||String(err));}
    });
  }
  function iniciarEscolha(){
    const p=post(),r=p?resolver(p,estado.linhas):null;
    escolha=r?.linha?chave(r.linha):input.calendarId&&(!p||(!referencia(p)&&pode(p)))?chave(input):'';
    mes=linha()?.competencia||input.competencia||p?.calendarCompetencia||estado.mesAtual;
  }
  function render(){
    const selects=[...corpo.querySelectorAll('select')],foco=doc.activeElement?.id,scroll=dialog.scrollTop;
    const p=post(),r=p?resolver(p,estado.linhas):null,l=copiaManual(p)?null:linha(),manual=!!p&&pode(p)&&(editar||r.estado!=='confirmado');
    const fixo=input.postId,refNativa=referencia(p||{})?.nativa;
    const meses=[...new Set(estado.linhas.map(l=>l.competencia))].sort().reverse();
    const itens=estado.linhas.filter(l=>l.competencia===mes);
    corpo.innerHTML=`<section><h3>${e(estado.nomeCliente)}</h3>${fixo?'':`<label for="i78Post">Postagem / vídeo</label><select id="i78Post" data-post ${busy?'disabled':''}><option value="">Selecione a postagem</option>${estado.postagens.map(v=>`<option value="${e(v.id)}" ${v.id===postId?'selected':''}>${e(v.titulo||'Sem título')} · ${e(pendenciaLegendaI79(v)?'Legenda pendente':estados[v.status]||v.status)}${resolver(v,estado.linhas).linha&&chave(resolver(v,estado.linhas).linha)===chave(input)?' · deste conteúdo':''}</option>`).join('')}</select>`}
      ${p?`<h3 style="margin-top:12px">${e(p.titulo)}</h3><p class="meta">${e(pendenciaLegendaI79(p)?'Legenda pendente · '+(p.status==='agendado'?'agendamento preservado':'aguardando agendamento'):estados[p.status]||p.status)}${p.dataAgendada?' · '+e(p.dataAgendada)+' '+e(p.horaAgendada||''):''}</p>${linkVideo(p)}`:'<p class="meta">Escolha o vídeo que vai usar esta legenda. Sem ligação pelo título.</p>'}</section>
      ${copiaManual(p)?'<section><h3>Material incluído na postagem</h3><p class="meta">Esta é a postagem vinculada ao calendário. Sua legenda está abaixo.</p></section>':`<section><h3>Conteúdo de origem no calendário</h3>
        ${r?.estado==='indisponivel'?`<p role="alert">${e(r.motivo)}</p>`:''}
        ${manual?`<p class="meta">Escolha manualmente e confira o roteiro e a legenda abaixo.</p><label for="i78Mes">Mês do calendário</label><select id="i78Mes" data-mes ${busy?'disabled':''}><option value="">Escolha o mês</option>${meses.map(v=>`<option value="${e(v)}" ${mes===v?'selected':''}>${e(rotuloMes(v))}</option>`).join('')}</select><label for="i78Item">Conteúdo do calendário</label><select id="i78Item" data-item ${busy?'disabled':''}><option value="">Escolha o conteúdo</option>${itens.map(v=>`<option value="${e(chave(v))}" ${v.bloqueio||v.derivadaPostagemI84?'disabled':''} ${escolha===chave(v)?'selected':''}>${e(v.titulo)} · dia ${e(v.dia||'a definir')}${v.bloqueio?' · conferir identificação':v.derivadaPostagemI84?' · cópia da postagem':''}</option>`).join('')}</select>`:''}
        ${l?`${p&&r?.estado!=='confirmado'?'<p class="meta">Prévia — referência ainda não confirmada.</p>':''}<h3 style="margin-top:14px">${e(l.titulo)}</h3><p class="meta">Calendário ${e(rotuloMes(l.competencia))} · dia ${e(l.dia||'a definir')} · ${e(l.formato||'Conteúdo')}</p><p class="meta">${l.aprovado?'Conteúdo aprovado pelo cliente.':'Confira a liberação deste conteúdo antes de publicar.'}</p><details><summary>Conferir roteiro</summary><div style="white-space:pre-wrap;margin-top:10px">${e(l.roteiro||'Sem roteiro preenchido.')}</div></details>`:!manual?'<p class="meta">Sem referência confirmada. Uma postagem avulsa pode usar sua própria legenda.</p>':''}
        ${manual?`<button type="button" class="btn" data-salvar style="margin-top:14px" ${busy||!l||l.bloqueio||l.derivadaPostagemI84?'disabled':''}>Confirmar este conteúdo para esta postagem</button>${r.estado==='confirmado'?'<button type="button" class="btn secondary" data-voltar>Cancelar escolha</button>':''}`:''}
        ${pode(p)&&r.estado==='confirmado'&&!editar?'<button type="button" class="btn secondary" data-trocar style="margin-top:12px">Trocar referência</button>':''}
        ${pode(p)&&p.referenciaLegendaI78?`<button type="button" class="btn secondary" data-remover ${busy?'disabled':''} style="margin-top:12px">Retirar referência manual</button>`:''}
        ${refNativa?'<p class="meta">Ligação original da produção. Ela é preservada.</p>':''}
      </section>`}
      ${l?`<section><h3>Legenda atual do calendário</h3>${blocoTextos(l,'cal')}</section>`:''}
      ${p?formularioReparo(p,l,r):''}
      ${p?`<section><h3>Texto enviado com esta postagem</h3><p class="meta">Confira o texto que será usado na publicação. Recados e sinais isolados são tratados como pendência.</p>${blocoTextos(p,'post')}</section>`:''}
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn secondary" data-reler ${busy?'disabled':''}>Atualizar conferência</button>${!fixo&&p&&['aguardando_agendamento','agendado'].includes(p.status)?'<button type="button" class="btn" data-postagens>Ir para Postagens</button>':''}</div>`;    // Mantém o controle em uso durante mudanças de mês/conteúdo (inclusive teclado).
    for(const anterior of selects){const novo=corpo.querySelector('#'+anterior.id);if(novo){anterior.innerHTML=novo.innerHTML;anterior.disabled=novo.disabled;novo.replaceWith(anterior);}}
    if(foco)doc.getElementById(foco)?.focus({preventScroll:true});
    dialog.scrollTop=scroll;
  }
  async function carregar(){
    const n=++seq;corpo.innerHTML='<p>Conferindo a postagem e o calendário…</p>';
    try{const result=await api.ler(input);if(n!==seq||!dialog.open)return;conferir();estado=result;
      postId=input.postId||'';
      if(!postId&&input.calendarId){const ligados=estado.postagens.filter(p=>{const r=resolver(p,estado.linhas);return r.linha&&chave(r.linha)===chave(input);});if(ligados.length===1)postId=ligados[0].id;}
      editar=false;iniciarEscolha();render();
      if(post())api.atualizado?.(post());
      aviso('Conferência atualizada.');
    }catch(err){if(n===seq&&dialog.open){corpo.innerHTML='<p>A consulta não foi confirmada. Feche e tente novamente.</p>';aviso(err.message);}}
  }
  return {async abrir(alvo){montar();if(busy)throw Error('A confirmação anterior ainda está em andamento.');input=alvo;const novoContexto=api.contexto();if(JSON.stringify(ctx)!==JSON.stringify(novoContexto))rascunhos.clear();ctx=novoContexto;estado=null;aviso('');if(!dialog.open)dialog.showModal();await carregar();}};
}
