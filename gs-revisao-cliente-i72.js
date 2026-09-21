/* I72: sinal informativo isolado. Nunca escreve aprovações ou conteúdos. */
(function(root){
  'use strict';
  const colecao='revisoes_calendario_cliente';
  const mesValido=m=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(m||''));
  const chave=(slug,mes)=>slug+'__'+mes;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function marca(cal,mes){
    const antiga=cal?.aprovacaoInterna||{};
    return cal?.aprovacaoMeses?.[mes]||((antiga.mes===mes||cal?.mesLegado===mes)?antiga:{});
  }
  function publicacao(cal,mes){
    const m=marca(cal,mes);
    return String(m.retratoLiberadoV115?.publicadoEm||(m.status==='liberado'?m.em:m.liberadoEmAnterior)||'');
  }
  function disponivel(cal,mes){
    const m=marca(cal,mes),st=m.status||'';
    const legadoAberto=['2026-08','2026-09'].includes(mes)&&st==='arquivado'&&!!m.substituidoPor&&m.arquivamentoManual!==true;
    const reaberto=new Date(m.reabertoAte||'').getTime()>Date.now();
    return mesValido(mes)&&(st==='liberado'||legadoAberto||reaberto||
      (['ajuste_interno','aguardando_interna','aprovado_interno'].includes(st)&&!!publicacao(cal,mes))||
      (!st&&(cal?.items||[]).some(i=>i&&!i.excluido&&(i.mes||cal.mesLegado)===mes)));
  }
  function texto(registro,cal,mes){
    if(!registro)return {titulo:'Revisão ainda não sinalizada',detalhe:'Opcional — o processo pode continuar.',atual:false};
    const atual=registro.publicacaoEm===publicacao(cal,mes);
    const em=registro.registradoEm?.toDate?.()||new Date(registro.registradoEm||'');
    const data=Number.isNaN(em.getTime())?'':em.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
    return {atual,titulo:atual?'✓ Cliente concluiu a revisão':'Revisão sinalizada na versão anterior',
      detalhe:(data?data+' · ':'')+'Não substitui as aprovações de cada conteúdo.'};
  }
  function resumo(registro,cal,mes,erro=false){
    const t=erro?{titulo:'Sinalização indisponível',detalhe:'Abra o calendário para conferir. O processo pode continuar.'}:texto(registro,cal,mes);
    return '<div data-revisao-cliente-i72 style="margin:10px 0;padding:12px;border:1px solid '+(t.atual?'#4caf72':'#65656a')+';border-radius:10px"><strong>'+esc(t.titulo)+'</strong><div style="font-size:12px;opacity:.8;margin-top:5px">'+esc(t.detalhe)+'</div></div>';
  }
  async function confirmar(fb,{slug,mes,uid,versao,validar=()=>true}){
    if(!mesValido(mes)||!uid)throw Error('Reabra o calendário para confirmar a sessão.');
    const ref=fb.doc(fb.db,colecao,chave(slug,mes));
    const op='rev_'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
    const evento=fb.doc(fb.db,colecao,chave(slug,mes),'eventos',op);
    try{await fb.runTransaction(fb.db,async tx=>{
      const calSnap=await tx.get(fb.docRef),atual=await tx.get(ref);
      if(!validar())throw Error('O mês mudou. Confirme no calendário que está aberto.');
      if(!calSnap.exists()||!disponivel(calSnap.data(),mes)||publicacao(calSnap.data(),mes)!==versao)
        throw Error('O calendário mudou. Confira a versão publicada antes de sinalizar a revisão.');
      if(atual.exists()&&atual.data().publicacaoEm===versao)return;
      const registro={schemaVersion:1,calendarId:slug,competencia:mes,publicacaoEm:versao,
        autorUid:uid,operationId:op,itemIdx:(calSnap.data().items||[]).findIndex(i=>i&&!i.excluido&&(i.mes||calSnap.data().mesLegado)===mes),registradoEm:fb.serverTimestamp()};
      tx.set(ref,registro);tx.set(evento,registro);
    });}catch(e){
      // Outra aba pode ter confirmado a mesma versão. Conferir, nunca repetir a escrita.
      if(!String(e?.code||'').includes('permission-denied'))throw e;
      const [atual,cal]=await Promise.all([fb.getDocFromServer(ref),fb.getDocFromServer(fb.docRef)]);
      if(!validar()||!atual.exists()||!cal.exists()||atual.data().publicacaoEm!==versao||publicacao(cal.data(),mes)!==versao)throw e;
    }
    const recibo=await fb.getDocFromServer(ref);
    if(!recibo.exists()||recibo.data().publicacaoEm!==versao)throw Error('A confirmação ainda não foi conferida. Atualize este aviso antes de tentar novamente.');
    return recibo.data();
  }
  let contexto=null,ouvinte=null,alvo='',registro=null,erro='',carregando=true,ocupado=false;
  function desenhar(){
    if(!contexto)return;
    const {cal,mes,modo,publico}=contexto;
    let box=document.getElementById('revisaoClienteI72');
    if(!box){
      const antes=document.getElementById('boxAprovacaoInterna');if(!antes)return;
      box=document.createElement('section');box.id='revisaoClienteI72';box.setAttribute('aria-label','Conclusão da revisão');
      box.style.cssText='margin:14px 0;padding:16px;border:1px solid #65656a;border-radius:12px;background:rgba(255,255,255,.03)';
      antes.after(box);
    }
    box.hidden=modo!=='equipe'&&!publico;
    if(box.hidden)return;
    const t=texto(registro,cal,mes),cliente=modo==='cliente';
    box.innerHTML='<strong>Revisão do calendário · '+esc(mes.split('-').reverse().join('/'))+'</strong>'+
      '<div role="status" style="margin:9px 0;font-size:13px">'+esc(erro|| (carregando?'Conferindo sinalização…':t.titulo))+'</div>'+
      (!erro&&!carregando&&registro?'<div style="font-size:12px;opacity:.8;margin:8px 0">'+esc(t.detalhe)+'</div>':'')+
      (cliente?'<p style="font-size:12px;line-height:1.5;margin:8px 0">Opcional. Avise a equipe quando terminar sua revisão. Você ainda pode pedir ajustes e aprovar cada conteúdo.</p>':'<div style="font-size:12px;opacity:.8">A sinalização é opcional. O trabalho da equipe pode continuar.</div>')+
      (cliente&&publico&&(!t.atual||erro)?'<button type="button" data-confirmar-revisao-i72 class="btn btn-g" style="margin-top:8px;padding:12px;white-space:normal;width:100%" '+(ocupado||carregando?'disabled':'')+'>'+(ocupado?'Confirmando…':'✓ TODOS OS CONTEÚDOS REVISADOS')+'</button>':'')+
      (erro?'<button type="button" class="btn btn-o" data-reler-revisao-i72 style="margin-top:8px">Conferir sinalização</button>':'');
    box.querySelector('[data-reler-revisao-i72]')?.addEventListener('click',()=>{alvo='';renderCalendario(contexto);});
    box.querySelector('[data-confirmar-revisao-i72]')?.addEventListener('click',async()=>{
      if(ocupado)return;
      const c=contexto,key=alvo,versao=publicacao(c.cal,c.mes);ocupado=true;erro='';desenhar();
      try{
        const r=await confirmar(c.fb,{slug:c.slug,mes:c.mes,uid:c.uid,versao,validar:()=>alvo===key&&contexto.modo==='cliente'});
        if(alvo===key)registro=r;
      }catch(e){if(alvo===key)erro=e.message||'Não foi possível confirmar. Seus conteúdos continuam disponíveis.';}
      finally{ocupado=false;desenhar();}
    });
  }
  function renderCalendario(c){
    contexto=c;
    if(!mesValido(c.mes)||!c.fb?.db)return;
    const key=chave(c.slug,c.mes);
    if(key!==alvo){
      ouvinte?.();alvo=key;registro=null;erro='';carregando=true;
      ouvinte=c.fb.onSnapshot(c.fb.doc(c.fb.db,colecao,key),{includeMetadataChanges:true},snap=>{
        if(alvo!==key||snap.metadata.hasPendingWrites||snap.metadata.fromCache)return;registro=snap.exists()?snap.data():null;erro='';carregando=false;desenhar();
      },()=>{if(alvo!==key)return;erro='Não foi possível conferir a sinalização. O calendário continua disponível.';carregando=false;desenhar();});
    }
    desenhar();
  }
  root.GetRevisaoClienteI72=Object.freeze({colecao,chave,marca,publicacao,disponivel,texto,resumo,confirmar,renderCalendario});
})(typeof window==='undefined'?globalThis:window);
