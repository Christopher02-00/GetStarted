// Identificação editorial. Não altera a reserva de produção nem aprova material.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const chaveI106=r=>JSON.stringify([r.calendarId,r.competencia,r.itemId]);
export function referenciaI106(p){
  if(p.calendarItemId||p.calendarCompetencia){
    return {calendarId:p.calendarClienteSlug,competencia:p.calendarCompetencia,itemId:p.calendarItemId,nativa:true};
  }
  return p.referenciaLegendaI78||null;
}
export function resolverI106(p,linhas,disponivel=true){
  const ref=referenciaI106(p);
  if(!ref)return {estado:p.identificacaoConteudoI106?.modo==='extra'?'extra':'pendente'};
  if(!disponivel)return {estado:'indisponivel',ref};
  if(!ref.calendarId||!ref.itemId||!/^\d{4}-(0[1-9]|1[0-2])$/.test(ref.competencia||''))return {estado:'inconsistente',ref};
  const hits=linhas.filter(l=>chaveI106(l)===chaveI106(ref));
  if(hits.length!==1||hits[0].bloqueio||hits[0].derivadaPostagemI84)return {estado:'inconsistente',ref};
  return {estado:'confirmado',ref,linha:hits[0]};
}
export function referenciaEscolhidaI106(l,cliente,por,em){
  if(!l||l.bloqueio||l.derivadaPostagemI84||!l.itemId||!/^\d{4}-(0[1-9]|1[0-2])$/.test(l.competencia||''))throw Error('Escolha um conteúdo identificado e confira a prévia.');
  return {calendarId:l.calendarId,competencia:l.competencia,itemId:l.itemId,cliente,tituloNoMomento:l.titulo,confirmadoPor:por,em,operacaoId:'i106_'+crypto.randomUUID()};
}
export function precisaRevisarI106(p){
  const ultima=(p.historicoReferenciasLegendaI78||[]).at(-1);
  const em=Date.parse(ultima?.em||p.referenciaLegendaI78?.em||'');
  return Number.isFinite(em)&&em>(Date.parse(p.legendaEm||'')||0)&&['legenda','legendaInstagram','legendaTiktok','legendaLinkedin','legendaYoutube'].some(k=>String(p[k]||'').trim());
}
export function resumoI106(p,res){
  const r=res||{estado:'pendente'},mes=r.linha?.competencia||r.ref?.competencia;
  const rotulos={extra:'Conteúdo extra · sem calendário',pendente:'Conteúdo ainda não identificado',indisponivel:'Origem indisponível · tente conferir novamente',inconsistente:'Origem precisa de conferência'};
  return `<div data-identidade-conteudo-i106><strong>${esc(r.estado==='confirmado'?r.linha.titulo:rotulos[r.estado]||rotulos.pendente)}</strong>${mes?`<div class="meta">Calendário: ${esc(mes.slice(5)+'/'+mes.slice(0,4))}</div>`:''}<div class="meta">Nome do vídeo: ${esc(p.titulo||'Sem título')}</div>${precisaRevisarI106(p)?'<p style="color:var(--yellow)">Referência alterada · confira se a legenda corresponde ao vídeo.</p>':''}</div>`;
}

// Um diálogo por lote; escolhas ficam por linha, nunca por semelhança de nome.
export function escolherConteudosI106({document:doc,nomes,linhas,cliente,validar,disponivel=true,anteriores=[]}){
  const dialog=doc.createElement('dialog');dialog.id='identificarEnvioI106';
  dialog.style.cssText='margin:auto;width:min(760px,94vw);max-height:90dvh;box-sizing:border-box;padding:20px;border:1px solid var(--yellow);border-radius:16px;background:var(--bg,#242527);color:var(--fg,#eee)';
  const meses=[...new Set(linhas.map(l=>l.competencia))].sort().reverse();
  dialog.innerHTML=`<h2>Identificar os conteúdos</h2><p>${esc(cliente)} · confira qual conteúdo corresponde a cada vídeo.</p>${!disponivel?'<p role="alert">Não foi possível consultar o calendário. Você pode registrar o material para identificar depois.</p>':''}<div data-lista></div><p role="status" data-aviso></p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button class="btn" type="button" data-confirmar>Confirmar identificação e continuar</button><button class="btn secondary" type="button" data-cancelar>Voltar ao envio</button></div>`;
  const lista=dialog.querySelector('[data-lista]');
  nomes.forEach((nome,i)=>{
    const el=doc.createElement('section');el.dataset.linha=String(i);el.style.cssText='padding:14px;margin:12px 0;border:1px solid var(--line,#555);border-radius:12px';
    el.innerHTML=`<h3>${esc(nome)}</h3><label for="i106-tipo-${i}">Este vídeo é</label><select id="i106-tipo-${i}" data-tipo style="width:100%;min-height:44px"><option value="">Escolha</option><option value="calendario" ${disponivel&&meses.length?'':'disabled'}>Um conteúdo do calendário</option><option value="extra">Conteúdo extra / fora do calendário</option><option value="pendente">Ainda preciso identificar</option></select><div data-origem hidden><label for="i106-mes-${i}">Mês do calendário</label><select id="i106-mes-${i}" data-mes style="width:100%;min-height:44px"><option value="">Escolha o mês</option>${meses.map(m=>`<option value="${esc(m)}">${esc(m.slice(5)+'/'+m.slice(0,4))}</option>`).join('')}</select><label for="i106-item-${i}">Conteúdo</label><select id="i106-item-${i}" data-item style="width:100%;min-height:44px"></select><div data-previa></div></div>`;
    lista.append(el);
    const tipo=el.querySelector('[data-tipo]'),mes=el.querySelector('[data-mes]'),item=el.querySelector('[data-item]');
    const atualizarItens=()=>{item.innerHTML='<option value="">Escolha o conteúdo</option>'+linhas.filter(l=>l.competencia===mes.value).map(l=>`<option value="${esc(chaveI106(l))}" ${l.bloqueio||l.derivadaPostagemI84?'disabled':''}>${esc(l.titulo)} · dia ${esc(l.dia||'a definir')}${l.bloqueio||l.derivadaPostagemI84?' · indisponível para ligação':''}</option>`).join('');el.querySelector('[data-previa]').replaceChildren();};
    const previa=()=>{const l=linhas.find(l=>chaveI106(l)===item.value);el.querySelector('[data-previa]').innerHTML=l?`<p><strong>${esc(l.titulo)}</strong></p><details><summary>Conferir roteiro e legenda</summary><p style="white-space:pre-wrap">${esc(l.roteiro||'Sem roteiro')}</p><p style="white-space:pre-wrap">${esc(l.legenda||'Legenda ainda não preenchida')}</p></details>`:'';};
    tipo.onchange=()=>{el.querySelector('[data-origem]').hidden=tipo.value!=='calendario';};mes.onchange=atualizarItens;item.onchange=previa;
    const a=anteriores[i];if(a){tipo.value=a.modo||'';if(a.linha){mes.value=a.linha.competencia;atualizarItens();item.value=chaveI106(a.linha);previa();}tipo.onchange();}
  });
  return new Promise(resolve=>{
    let terminou=false;const fechar=value=>{if(terminou)return;terminou=true;dialog.close();dialog.remove();resolve(value);};
    dialog.querySelector('[data-cancelar]').onclick=()=>fechar(null);
    dialog.addEventListener('cancel',ev=>{ev.preventDefault();fechar(null);});
    dialog.querySelector('[data-confirmar]').onclick=()=>{try{
      validar();const escolhidas=[...lista.children].map(el=>{const modo=el.querySelector('[data-tipo]').value;if(!modo)throw Error('Escolha a identificação de cada vídeo.');const linha=modo==='calendario'?linhas.find(l=>chaveI106(l)===el.querySelector('[data-item]').value):null;if(modo==='calendario'&&(!linha||linha.bloqueio||linha.derivadaPostagemI84))throw Error('Escolha o conteúdo e confira o mês.');return {modo,linha};});
      const chaves=escolhidas.filter(v=>v.linha).map(v=>chaveI106(v.linha));if(new Set(chaves).size!==chaves.length)throw Error('Dois vídeos deste lote apontam para o mesmo conteúdo. Confira as escolhas antes de enviar.');
      fechar(escolhidas);
    }catch(e){dialog.querySelector('[data-aviso]').textContent=e.message;}};
    doc.body.append(dialog);dialog.showModal();
  });
}
