/* I61: organização manual. Não altera pauta, agenda, edição ou postagem. */
(function(global){
  'use strict';
  const estados={a_gravar:'Falta ser gravado',gravado:'Gravado',sem_gravacao:'Não precisa de gravação',a_organizar:'A organizar / revisar'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>JSON.parse(JSON.stringify(v));
  const canonical=v=>JSON.stringify(Object.fromEntries(Object.keys(v||{}).sort().map(k=>[k,v[k]??''])));
  const mesValido=m=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(m);
  const dataValida=d=>d===''||(/^20\d{2}-(0[1-9]|1[0-2])-\d{2}$/.test(d)&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d);
  const br=d=>d?d.split('-').reverse().join('/'):'A combinar';
  const msg=e=>e?.code==='permission-denied'?'Acesso não autorizado ou regras ainda não publicadas.':e?.message||'Não foi possível confirmar. Tente novamente.';
  async function assinatura(item){
    // Aprovação, data de postagem, posição, flags e chaves reordenadas não mudam o roteiro.
    const campos=['name','fmt','obs','desc','legenda','ref'];
    const texto=canonical(Object.fromEntries(campos.map(k=>[k,String(item?.[k]??'').replace(/\r\n/g,'\n')])));
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(texto)))].map(v=>v.toString(16).padStart(2,'0')).join('');
  }
  function situacao(registro,fonte){return registro&&registro.fonteAssinatura===fonte&&estados[registro.estado]?registro.estado:'a_organizar';}
  // I65: continuidade das captações anteriores à conferência manual I61.
  // Não publica novas baixas automaticamente nem abre a confirmação privada V122.
  const inicioManualI61=Date.parse('2026-09-11T17:39:00.000Z');
  function captacoesAnteriores(cliente,mes,agendas){
    const result={};
    for(const a of agendas||[]){
      const fim=typeof a.finalizadoEm?.toMillis==='function'?a.finalizadoEm.toMillis():Date.parse(a.finalizadoEm);
      const data=String(a.dataProducao||a.data||'');
      if(a.cliente!==cliente||a.excluido||a.status!=='realizado'||!Number.isFinite(fim)||fim>inicioManualI61||!data||!dataValida(data))continue;
      for(const i of Array.isArray(a.conteudosRealizados)?a.conteudosRealizados:[]){
        const id=String(i?.calendarItemId||'');
        if(!/^[\w-]{1,180}$/.test(id)||i.calendarCompetencia!==mes)continue;
        // Um conteúdo permanece único mesmo em sessões repetidas. Não usar índice/título.
        if(!result[id]||data<result[id].dataGravada)result[id]={estado:'gravado',grupo:'',preparo:'',dataGravada:data,registroAnterior:true};
      }
    }
    return result;
  }
  function registroEfetivo(registro,fonte,anterior,item){
    if(registro&&registro.fonteAssinatura!==fonte)return {...registro,estado:'a_organizar'};
    if(registro&&estados[registro.estado]&&registro.estado!=='a_organizar')return registro;
    const previo=anterior||(item?.gravado===true?{estado:'gravado',dataGravada:'',registroAnterior:true,marcacaoCalendario:true}:null);
    return previo?{...previo,grupo:registro?.grupo||'',preparo:registro?.preparo||''}:registro;
  }
  function situacaoEfetiva(registro,fonte,anterior,item){
    const r=registroEfetivo(registro,fonte,anterior,item);
    return r?.registroAnterior?r.estado:situacao(r,fonte);
  }
  function valores(kind,d={}){return kind==='itens'?{estado:d.estado||'a_organizar',grupo:String(d.grupo||''),dataGravada:d.dataGravada||'',preparo:d.preparo||''}:{data:d.data||'',hora:d.hora||'',modelo:d.modelo||'',preparo:d.preparo||''};}
  function validar(kind,v){
    if(v.preparo.length>1500)throw Error('Use até 1.500 caracteres na preparação.');
    if(kind==='itens'){
      if(!estados[v.estado]||!['','1','2','3'].includes(v.grupo))throw Error('Confira a situação e a gravação.');
      if(v.estado==='a_gravar'&&!v.grupo)throw Error('Escolha a gravação deste conteúdo.');
      if(!dataValida(v.dataGravada)||(v.estado==='gravado'&&!v.dataGravada))throw Error('Informe a data em que este conteúdo foi gravado.');
      if(v.estado!=='gravado')v.dataGravada='';
      if(v.estado==='sem_gravacao')v.grupo='';
    }else if(!dataValida(v.data)||!/^$|^([01]\d|2[0-3]):[0-5]\d$/.test(v.hora)||v.modelo.length>200)throw Error('Confira data, horário e modelo (até 200 caracteres).');
    return v;
  }
  function store({fb,uid,canEdit,monthOf,validateCalendar}){
    const caminho=(c,m,k,id)=>fb.doc(fb.db,'gravacoes_cliente',c,'meses',m,k,id);
    const ler=s=>s.exists()?s.data():null;
    async function read(c,m,k){const snap=await fb.getDocs(fb.collection(fb.db,'gravacoes_cliente',c,'meses',m,k));return Object.fromEntries(snap.docs.map(d=>[d.id,d.data()]));}
    async function readAnteriores(c,m){
      const snap=await fb.getDocs(fb.query(fb.collection(fb.db,'agendamentos'),fb.where('cliente','==',c)));
      return captacoesAnteriores(c,m,snap.docs.map(d=>d.data()));
    }
    return {read,readAnteriores,async save({cliente,mes,kind,id,values,base,source,operationId}){
      if(!canEdit()||!uid())throw Error('Abra esta área no perfil da Cecília.');
      if(!mesValido(mes)||!['itens','grupos'].includes(kind)||!/^[\w-]{1,180}$/.test(id)||kind==='grupos'&&!['1','2','3'].includes(id))throw Error('Identificação inválida. Reabra a lista.');
      const v=validar(kind,clone(values)),ator=uid(),op=operationId||'i61_'+crypto.randomUUID().replace(/-/g,'');
      const ref=caminho(cliente,mes,kind,id),ev=fb.doc(ref,'eventos',op);
      try{return await fb.runTransaction(fb.db,async tx=>{
        const calSnap=await tx.get(fb.doc(fb.db,'calendarios',cliente));
        const snap=await tx.get(ref),evento=await tx.get(ev),atual=ler(snap);
        if(!canEdit()||uid()!==ator)throw Error('O perfil mudou. Seu rascunho foi preservado.');
        if(evento.exists()){if(atual?.operationId!==op)throw Error('Esta operação foi confirmada, mas outra edição foi salva depois. Confira a versão atual.');return {registro:evento.data().depois,operationId:op,repetido:true};}
        if(!calSnap.exists())throw Error('O calendário não foi encontrado.');
        const cal=validateCalendar?validateCalendar(cliente,calSnap.data()):calSnap.data();
        if(cal.excluido===true)throw Error('O calendário está arquivado.');
        if((Number(atual?.revision)||0)!==(Number(base?.revision)||0))throw Error('Outra alteração foi salva nesta linha. Confira a versão atual antes de tentar novamente. Seu rascunho continua aqui.');
        let hash='',sourceIndex=-1;
        if(kind==='itens'){
          const encontrados=(cal.items||[]).filter(i=>i.itemId===id&&!i.excluido&&monthOf(cal,i)===mes);
          if(encontrados.length!==1)throw Error('O conteúdo mudou de mês, foi excluído ou não tem identificação única. Atualize a lista.');
          sourceIndex=cal.items.indexOf(encontrados[0]);
          hash=await assinatura(encontrados[0]);
          if(hash!==source)throw Error('O roteiro foi alterado pela equipe. Atualize a lista e confira antes de salvar. Seu rascunho foi preservado.');
        }
        const depois={schemaVersion:1,calendarId:cliente,competencia:mes,registroId:id,...v,...(kind==='itens'?{fonteAssinatura:hash,sourceIndex}:{}),revision:(Number(atual?.revision)||0)+1,operationId:op,atualizadoEm:fb.serverTimestamp(),atualizadoPor:'Cecília'};
        tx.set(ref,depois);tx.set(ev,{operationId:op,autorUid:ator,papelOperado:'Cecília',criadoEm:fb.serverTimestamp(),antes:atual,depois});
        return {registro:depois,operationId:op,repetido:false};
      });}catch(e){
        if(/permission-denied|failed-precondition/.test(String(e.code||''))&&canEdit()&&uid()===ator){
          let atual;try{atual=ler(await fb.getDoc(ref));}catch(leitura){}
          if(atual&&atual.operationId!==op&&(Number(atual.revision)||0)!==(Number(base?.revision)||0))throw Error('Outra alteração foi salva nesta linha. Confira a versão atual antes de tentar novamente. Seu rascunho continua aqui.');
        }
        throw e;
      }
    },watch(c,m,cb,onError){
      const result={itens:null,grupos:null,anteriores:null};let disposed=false;
      const timer=setTimeout(()=>{if(!disposed&&(!result.itens||!result.grupos||!result.anteriores))onError(Error('O servidor ainda não confirmou a leitura. Tente novamente.'));},12000);
      const emitir=()=>{if(!disposed&&result.itens&&result.grupos&&result.anteriores){clearTimeout(timer);cb(result);}};
      readAnteriores(c,m).then(v=>{result.anteriores=v;emitir();}).catch(e=>{if(!disposed){clearTimeout(timer);onError(e);}});
      const stops=['itens','grupos'].map(k=>fb.onSnapshot(fb.collection(fb.db,'gravacoes_cliente',c,'meses',m,k),{includeMetadataChanges:true},s=>{
        if(disposed||s.metadata?.fromCache)return;result[k]=Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));emitir();
      },e=>{if(!disposed){result[k]=null;clearTimeout(timer);onError(e);}}));
      return ()=>{disposed=true;clearTimeout(timer);stops.forEach(f=>f());};
    }};
  }
  function style(){
    if(document.getElementById('style-gravacoes-i61'))return;
    const el=document.createElement('style');el.id='style-gravacoes-i61';el.textContent=`
      .g61{--g61line:#48494d;--g61muted:#c2c3c8;background:#26272a;color:#f4f4f5;border:1px solid var(--g61line);border-radius:16px;padding:18px;margin:14px 0;font-family:inherit;font-size:14px;line-height:1.5;overflow-wrap:anywhere}
      .g61 h2,.g61 h3{margin:0 0 8px}.g61 p{margin:8px 0;color:var(--g61muted)}.g61 .g61bar,.g61 .g61fields{display:flex;gap:10px;flex-wrap:wrap;align-items:end}.g61 .g61bar{margin:12px 0;align-items:center}
      .g61 button,.g61 summary{cursor:pointer}.g61 button{background:#343539;color:#fff;border:1px solid #62636a;border-radius:9px;padding:11px 14px;font:inherit;min-height:42px;width:auto}.g61 button[aria-pressed=true],.g61 button.g61save{background:#ffc21b;color:#161719;border-color:#ffc21b;font-weight:700}.g61 button:disabled{opacity:.5;cursor:wait}
      .g61 label{display:flex;flex:1 1 150px;flex-direction:column;gap:5px;font-size:13px;letter-spacing:normal;text-transform:none;color:#eee}.g61 input,.g61 select,.g61 textarea{box-sizing:border-box;width:100%;background:#202124;border:1px solid #61636a;border-radius:8px;color:#fff;padding:10px;font:inherit;min-height:42px}.g61 textarea{min-height:75px;resize:vertical}.g61 .g61wide{flex-basis:100%}
      .g61 article,.g61 .g61group{border:1px solid var(--g61line);border-radius:12px;padding:14px;margin:12px 0}.g61 article{border-left:3px solid #ffc21b}.g61 .g61note{color:var(--g61muted);font-size:13px;white-space:pre-wrap}.g61 .g61error{color:#ffb4b4}.g61 .g61status{display:inline-block;border-radius:6px;background:#3e3f44;padding:3px 8px;font-size:12px;margin:5px 0}.g61 details>summary{padding:8px 0}.g61 [hidden]{display:none!important}.g61 .g61receipt{min-height:20px;margin-top:7px;white-space:pre-wrap}.g61 .g61script{white-space:pre-wrap;color:#d8d9dd;max-height:320px;overflow:auto}
      @media(max-width:550px){.g61{padding:12px}.g61 .g61fields>label{flex-basis:100%}.g61 .g61bar button{flex:1 1 130px}.g61 h2{font-size:20px}}
    `;document.head.append(el);
  }
  const readers=new WeakMap();
  function stopReader(el){const old=readers.get(el);if(old){old.stop?.();old.alive=false;readers.delete(el);}}
  async function reader(el,{cliente,mes,itens,store:db,open=false}){
    if(!el)return;style();
    const sig=cliente+'|'+mes+'|'+JSON.stringify(itens),old=readers.get(el);
    if(old?.key===sig)return;
    stopReader(el);const ctx={key:sig,alive:true,filter:'a_gravar',open};readers.set(el,ctx);
    el.classList.add('g61');el.innerHTML='<h2>Suas gravações</h2><p>Conferindo a organização da Cecília…</p>';
    const hashes=Object.fromEntries(await Promise.all(itens.map(async i=>[i.itemId,await assinatura(i)])));
    if(!ctx.alive)return;
    const render=r=>{
      if(!ctx.alive||!el.isConnected)return;
      const rows=itens.filter(i=>!i.excluido).map(i=>({i,r:registroEfetivo(r.itens[i.itemId],hashes[i.itemId],r.anteriores?.[i.itemId],i),s:situacaoEfetiva(r.itens[i.itemId],hashes[i.itemId],r.anteriores?.[i.itemId],i)}));
      const counts=Object.fromEntries(Object.keys(estados).map(s=>[s,rows.filter(x=>x.s===s).length]));
      const shown=rows.filter(x=>x.s===ctx.filter),groups=ctx.filter==='a_gravar'?['1','2','3']:[''];
      el.innerHTML=`<h2>Suas gravações · ${esc(mes.split('-').reverse().join('/'))}</h2><p>Gravações anteriores preservadas. Cecília organiza e confere as próximas.</p><div class="g61bar">${Object.entries(estados).map(([s,l])=>`<button type="button" data-filter="${s}" aria-pressed="${ctx.open&&ctx.filter===s}">${l} (${counts[s]})</button>`).join('')}</div><div data-body ${ctx.open?'':'hidden'}>${counts.a_organizar?`<p>${counts.a_organizar} conteúdo(s) ainda precisam de organização ou nova conferência da equipe.</p>`:''}${shown.length?groups.map(g=>{
        const list=shown.filter(x=>!g||x.r?.grupo===g);if(!list.length)return '';
        const group=r.grupos[g]||{};
        return `<section class="g61group">${g?`<h3>Gravação ${g}</h3><p>${esc(br(group.data))}${group.hora?' · '+esc(group.hora):''}${group.modelo?' · Modelo: '+esc(group.modelo):''}</p>${group.preparo?`<div class="g61note">${esc(group.preparo)}</div>`:''}`:''}${list.map(({i,r:reg,s})=>`<article><strong>${esc(i.name||'Conteúdo')}</strong><div><span class="g61status">${estados[s]}</span>${s==='gravado'?' · '+esc(reg.dataGravada?br(reg.dataGravada):'Data não informada')+(reg.marcacaoCalendario?' · Marcação anterior do calendário':reg.registroAnterior?' · Registro anterior':''):''}</div>${s!=='a_organizar'&&reg?.preparo?`<div class="g61note">${esc(reg.preparo)}</div>`:''}<details><summary>Ver roteiro e orientações</summary><div class="g61script">${esc(i.obs||i.desc||'A equipe ainda não adicionou orientações a este conteúdo.')}</div></details></article>`).join('')}</section>`;
      }).join(''):`<p>${ctx.filter==='a_gravar'?'Nenhum conteúdo foi separado como “Falta ser gravado”. Confira também os itens a organizar.':'Nenhum conteúdo nesta situação.'}</p>`}</div>`;
      el.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{ctx.filter=b.dataset.filter;ctx.open=true;render(r);});
    };
    ctx.stop=db.watch(cliente,mes,render,e=>{if(ctx.alive)el.innerHTML=`<h2>Suas gravações</h2><p class="g61error">Não foi possível conferir a organização. ${esc(msg(e))}</p><button type="button" data-retry>Tentar novamente</button>`;el.querySelector('[data-retry]')?.addEventListener('click',()=>{stopReader(el);reader(el,{cliente,mes,itens,store:db,open:ctx.open});});});
  }
  const dirtyForms=new Set();
  global.addEventListener('beforeunload',e=>{if([...dirtyForms].some(f=>f.isConnected)){e.preventDefault();e.returnValue='';}});
  function editor(el,{cliente,mes,itens,registros,grupos,anteriores={},store:db,uid,canEdit}){
    let alive=true;style();el.classList.add('g61');el.innerHTML=`<h2>Organização das gravações</h2><p>Abra uma gravação para combinar data, modelo e preparação.</p><div data-groups></div><h3>Conteúdos do mês (${itens.length})</h3><p>“A organizar” exige sua conferência. Datas de gravação podem pertencer a outro mês.</p><label>Buscar conteúdo<input data-search type="search" placeholder="Nome do conteúdo…"></label><div data-items></div>`;
    el.querySelector('[data-search]').oninput=e=>{const q=e.target.value.trim().toLocaleLowerCase('pt-BR');el.querySelectorAll('[data-item-search]').forEach(n=>n.hidden=!n.dataset.itemSearch.includes(q));};
    const append=async(kind,id,item,base)=>{
      const source=item?await assinatura(item):'',key=['get_i61_rascunho',uid(),cliente,mes,kind,id].join('|');
      if(!alive||!el.isConnected)return;
      const form=document.createElement('form');form.className='g61group';form.dataset.registro=id;
      let original=base||null,initial=valores(kind,base),draft=null,op='',busy=false;
      try{draft=JSON.parse(localStorage.getItem(key)||'null');}catch(e){}
      const v=draft?.values||initial;
      const fields=kind==='grupos'?`<label>Data<input name="data" type="date" value="${esc(v.data)}"></label><label>Horário<input name="hora" type="time" value="${esc(v.hora)}"></label><label>Modelo / participante<input name="modelo" maxlength="200" value="${esc(v.modelo)}"></label>`:`<label>Situação<select name="estado">${Object.entries(estados).map(([s,l])=>`<option value="${s}" ${v.estado===s?'selected':''}>${l}</option>`).join('')}</select></label><label>Gravação<select name="grupo"><option value="">A definir</option>${['1','2','3'].map(g=>`<option value="${g}" ${v.grupo===g?'selected':''}>Gravação ${g}</option>`).join('')}</select></label><label>Gravado em<input name="dataGravada" type="date" value="${esc(v.dataGravada)}"></label>`;
      form.innerHTML=`<h3>${kind==='grupos'?'Gravação '+id:esc(item.name||'Conteúdo')}</h3>${item?`<div class="g61status" data-status>${estados[situacao(base,source)]}</div>${anteriores[id]?.produzido?'<p>Referência anterior: marcado como produzido no controle interno. Confira a situação e a data antes de publicar aqui.</p>':''}<details><summary>Conferir roteiro</summary><div class="g61script">${esc(item.obs||item.desc||'Sem orientações registradas.')}</div></details>`:''}<div class="g61fields">${fields}<label class="g61wide">${kind==='grupos'?'O que separar / preparação desta gravação':'Orientações para este conteúdo (visíveis ao cliente)'}<textarea name="preparo" maxlength="1500">${esc(v.preparo)}</textarea></label></div><div class="g61bar"><button class="g61save" type="submit">Salvar ${kind==='grupos'?'gravação':'conteúdo'}</button><button type="button" data-current>Conferir versão atual</button></div><div class="g61receipt" role="status">${draft?'Rascunho recuperado. Confira antes de salvar.':''}</div>`;
      if(kind==='itens'&&!/^[\w-]{1,180}$/.test(id)){form.innerHTML+='<p class="g61error">Conteúdo sem identificação estável. A equipe precisa conferir o vínculo antes de organizar.</p>';form.querySelectorAll('input,textarea,select,button').forEach(x=>x.disabled=true);}
      const capture=()=>Object.fromEntries(new FormData(form));
      const receipt=form.querySelector('.g61receipt');
      const fold=document.createElement('details');fold.className='g61group';
      if(kind==='itens')fold.dataset.itemSearch=String(item.name||'Conteúdo').toLocaleLowerCase('pt-BR');
      fold.innerHTML='<summary><strong>'+esc(kind==='grupos'?'Gravação '+id:item.name||'Conteúdo')+'</strong> · <span data-summary-status>'+esc(kind==='grupos'?br(base?.data):estados[situacao(base,source)])+'</span></summary>';
      fold.append(form);form.classList.remove('g61group');
      const remember=()=>{op='';dirtyForms.add(form);receipt.textContent='Alterações ainda não salvas.';try{localStorage.setItem(key,JSON.stringify({values:capture(),revision:original?.revision||0}));}catch(e){receipt.textContent+=' O navegador não conseguiu guardar uma cópia do rascunho.';}};
      if(draft){dirtyForms.add(form);if(draft.revision!==(original?.revision||0))receipt.textContent+=' Existe uma versão mais recente. Confira a versão atual antes de salvar.';}
      form.addEventListener('input',remember);form.addEventListener('change',remember);
      form.onsubmit=async e=>{
        e.preventDefault();if(busy)return;
        if(!canEdit()){receipt.textContent='Seu perfil mudou. Reabra como Cecília.';return;}
        if(draft&&draft.revision!==(original?.revision||0)){receipt.textContent='Confira a versão atual antes de salvar o rascunho antigo.';return;}
        busy=true;form.querySelectorAll('input,textarea,select,button').forEach(b=>b.disabled=true);receipt.classList.remove('g61error');receipt.textContent='Salvando e confirmando…';
        try{
          // FormData ignora campos desabilitados; leia os valores explicitamente.
          const values=Object.fromEntries([...form.querySelectorAll('[name]')].map(n=>[n.name,n.value]));
          op=op||'i61_'+crypto.randomUUID().replace(/-/g,'');
          const result=await db.save({cliente,mes,kind,id,values,base:original,source,operationId:op});
          original=result.registro;draft=null;op='';dirtyForms.delete(form);try{localStorage.removeItem(key);}catch(e){}
          // I61A: a tela reflete os campos normalizados no registro confirmado.
          for(const [campo,valor] of Object.entries(valores(kind,original)))form.elements.namedItem(campo).value=valor;
          receipt.textContent='✓ Salvo e confirmado. A organização do cliente foi atualizada.';
          const badge=form.querySelector('[data-status]');if(badge)badge.textContent=estados[situacao(original,source)];fold.querySelector('[data-summary-status]').textContent=kind==='grupos'?br(original.data):estados[situacao(original,source)];
        }catch(e){receipt.textContent='Não confirmado: '+msg(e)+' O rascunho foi mantido.';receipt.classList.add('g61error');}
        finally{busy=false;form.querySelectorAll('input,textarea,select,button').forEach(b=>b.disabled=false);}
      };
      form.querySelector('[data-current]').onclick=async()=>{
        if(busy)return;
        try{
          const all=await db.read(cliente,mes,kind),current=all[id]||null;
          receipt.textContent='Versão atual: '+JSON.stringify(valores(kind,current))+'.';
          if(!confirm('Carregar a versão salva desta linha? As alterações não salvas desta linha serão substituídas. As outras linhas ficam preservadas.'))return;
          original=current;draft=null;op='';for(const[k,v]of Object.entries(valores(kind,current)))form.elements.namedItem(k).value=v;
          dirtyForms.delete(form);try{localStorage.removeItem(key);}catch(e){}receipt.textContent='Versão atual carregada. Faça os ajustes necessários e salve.';
        }catch(e){receipt.textContent=msg(e);}
      };
      el.querySelector(kind==='grupos'?'[data-groups]':'[data-items]').append(fold);
    };
    const ready=(async()=>{for(const g of ['1','2','3'])await append('grupos',g,null,grupos[g]);for(const i of itens)await append('itens',String(i.itemId||''),i,registros[i.itemId]);})();
    return {ready,dirty:()=>[...el.querySelectorAll('form')].some(f=>dirtyForms.has(f)),dispose:()=>{alive=false;el.querySelectorAll('form').forEach(f=>dirtyForms.delete(f));}};
  }
  global.GetGravacoesI61={esc,assinatura,situacao,captacoesAnteriores,registroEfetivo,situacaoEfetiva,valores,validar,store,reader,stopReader,editor,mesValido,style};
})(window);
