// I108 — arquivo interno de análises. Não escreve em calendários ou no Reportei.
export const COLECAO='analises_mensais_i108';
export const PAPEIS=['Gabrielle','Amanda','Chris'];
export const ROTULOS={pendente:'A fazer',rascunho:'Rascunho',enviado:'Amanda: conferir',ajuste:'Ajuste solicitado',conferido:'Conferida'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mesValido(v){return typeof v==='string'&&/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(v);}
export function hojeBRT(d=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
export function prazoMes(m){if(!mesValido(m))throw Error('Escolha um mês válido.');const [a,n]=m.split('-').map(Number);return m+'-'+new Date(Date.UTC(a,n,0)).getUTCDate();}
export function anterior(m){if(!mesValido(m))throw Error('Mês inválido.');const [a,n]=m.split('-').map(Number);return new Date(Date.UTC(a,n-2,1)).toISOString().slice(0,7);}
export function nomeMes(m){return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-15T12:00:00Z'));}
export function chave(m,c){if(!mesValido(m)||!(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/).test(c))throw Error('Cliente ou mês inválido.');return m+'__'+c;}
export function linkSeguro(v){try{const u=new URL(String(v));return u.protocol==='https:'&&!u.username&&!u.password&&!/\s/.test(v)&&u.hostname.includes('.');}catch{return false;}}
export function texto(v,n){const s=String(v??'').trim();if(s.length>n)throw Error('Texto maior que o limite indicado.');return s;}
export function transicao(anterior,acao,campos,ctx){
 if(!PAPEIS.includes(ctx.nome))throw Error('Esta área é da Gabi e da gestão.');
 let d={cliente:campos.cliente,clienteNome:texto(campos.clienteNome,160),mes:campos.mes,link:texto(campos.link,2000),resumo:texto(campos.resumo,4000),proximos:texto(campos.proximos,2000),status:'rascunho',parecer:anterior?.parecer||''};
 chave(d.mes,d.cliente);if(!d.clienteNome)throw Error('Cliente sem identificação.');
 if(acao==='salvar'||acao==='enviar'){
  if(!['Gabrielle','Chris'].includes(ctx.nome))throw Error('A Gabi prepara e envia a análise.');
  if(d.link&&!linkSeguro(d.link))throw Error('Cole um link HTTPS válido e compartilhável.');
  if(acao==='enviar'&&!d.link)throw Error('Inclua o link do relatório antes de enviar.');
  d.status=acao==='enviar'?'enviado':'rascunho';
 }else if(acao==='conferir'||acao==='ajuste'){
  if(!['Amanda','Chris'].includes(ctx.nome)||anterior?.status!=='enviado')throw Error('Abra uma entrega enviada para conferir.');
  d={...anterior,status:acao==='conferir'?'conferido':'ajuste',parecer:texto(campos.parecer,2000)};
  if(acao==='ajuste'&&!d.parecer)throw Error('Explique o ajuste para a Gabi.');
 }else throw Error('Ação inválida.');
 if(anterior&&(d.cliente!==anterior.cliente||d.mes!==anterior.mes))throw Error('O cliente e o mês desta análise não podem mudar.');
 return Object.fromEntries(['cliente','clienteNome','mes','link','resumo','proximos','status','parecer'].map(k=>[k,d[k]]));
}
export function criarRepositorio(s,contexto){
 const {db,doc,collection,query,where,onSnapshot,runTransaction,serverTimestamp,getDocFromServer,getDocsFromServer}=s;
 const capturar=()=>{const c={...contexto()};if(!c.uid||!PAPEIS.includes(c.nome))throw Error('Acesso não autorizado.');return c;};
 const conferir=c=>{const n=contexto();if(n.uid!==c.uid||n.nome!==c.nome||n.sessao!==c.sessao)throw Error('O perfil mudou. Reabra esta área.');};
 function formato(snap){return snap.exists()?{...snap.data(),id:snap.id}:null;}
 return {
  async ler(id){const c=capturar(),snap=await getDocFromServer(doc(db,COLECAO,id));conferir(c);return formato(snap);},
  async listar(mes){const c=capturar();if(!mesValido(mes))throw Error('Mês inválido.');const snap=await getDocsFromServer(query(collection(db,COLECAO),where('mes','==',mes)));conferir(c);return snap.docs.map(d=>({...d.data(),id:d.id}));},
  observar(mes,ok,erro){const c=capturar();if(!mesValido(mes))throw Error('Mês inválido.');return onSnapshot(query(collection(db,COLECAO),where('mes','==',mes)),{includeMetadataChanges:true},snap=>{try{conferir(c);ok(snap.docs.map(d=>({...d.data(),id:d.id})),!snap.metadata.fromCache&&!snap.metadata.hasPendingWrites);}catch(e){erro(e);}},erro);},
  async historico(id){const c=capturar(),snap=await getDocsFromServer(collection(db,COLECAO,id,'historico'));conferir(c);return snap.docs.map(d=>d.data()).sort((a,b)=>b.revisao-a.revisao);},
  async salvar(id,rev,acao,campos){
   const c=capturar(),op=crypto.randomUUID(),ref=doc(db,COLECAO,id);let resultado;
   try{await runTransaction(db,async tx=>{
    conferir(c);const snap=await tx.get(ref),ant=formato(snap);conferir(c);
    if((ant?.revisao||0)!==rev)throw Error('Esta análise mudou em outra tela. Seu texto foi guardado neste navegador. Reabra a versão atual antes de salvar.');
    const dados=transicao(ant,acao,campos,c);if(id!==chave(dados.mes,dados.cliente))throw Error('Identificação inconsistente.');
    resultado={...dados,revisao:rev+1,operacao:op,autorUid:c.uid,autorNome:c.nome,atualizadoEm:serverTimestamp()};
    tx.set(ref,resultado);tx.set(doc(db,COLECAO,id,'historico',op),resultado);
   });}catch(e){
    // Uma resposta interrompida depois do commit não autoriza envio duplicado.
    try{const recibo=await getDocFromServer(doc(db,COLECAO,id,'historico',op));conferir(c);if(recibo.exists())return await this.ler(id);}catch{}
    throw e;
   }
   conferir(c);return await this.ler(id);
  }
 };
}

export function montarAnalises(root,{repo,contexto,clientes,compacto=false,abrir,mesInicial,aoMudarMes=()=>{}}){
 let vivo=true,geracao=0,abertura=0,off=null,mes=mesValido(mesInicial)?mesInicial:hojeBRT().slice(0,7),carteira=[],registros=[],confirmado=false,carteiraOk=false,selecionado=null,edicao=null,alterado=false,ocupado=false,filtro='',busca='';
 const pessoa=contexto().nome,podeEscrever=['Gabrielle','Chris'].includes(pessoa),gestao=['Amanda','Chris'].includes(pessoa),ctx=contexto();
 const sessaoValida=()=>vivo&&contexto().sessao===ctx.sessao&&contexto().uid===ctx.uid&&contexto().nome===ctx.nome;
 const idDraft=id=>'get-i108:'+ctx.uid+':'+pessoa+':'+id;
 const lerDraft=id=>{try{return JSON.parse(sessionStorage.getItem(idDraft(id))||'null');}catch{return null;}};
 const gravarDraft=(id,v)=>{try{sessionStorage.setItem(idDraft(id),JSON.stringify(v));}catch{aviso('O navegador não conseguiu guardar o rascunho. Mantenha esta tela aberta.');}};
 const limparDraft=id=>{try{sessionStorage.removeItem(idDraft(id));}catch{}};
 root.innerHTML=`<style>
 .a108{--a108-line:#ffffff26;margin:0 0 22px;color:var(--text,#eee)}.a108 *{box-sizing:border-box}.a108 header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.a108 h2{font-size:23px;margin:5px 0 10px}.a108 h3{margin:0 0 12px}.a108 p{margin:6px 0 14px}.a108 small{color:#b9bdc4}.a108 .hero{padding:22px;border:1px solid #ffbe1880;border-radius:16px;background:linear-gradient(115deg,#ffbe1815,#ffffff04)}.a108 .badge{display:inline-block;font-size:12px;font-weight:800;padding:6px 10px;border-radius:8px;background:#ffffff12}.a108 .badge.conferido{color:#76dbac;background:#37ac7520}.a108 .badge.ajuste{color:#ffb3a9}.a108 .badge.enviado{color:#ffce60}.a108 .stats{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.a108 .stat{flex:1;min-width:100px;border:1px solid var(--a108-line);border-radius:12px;padding:12px}.a108 .stat b{font-size:24px;display:block}.a108 .tools{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0;align-items:end}.a108 label{display:block;font-size:13px;font-weight:700;margin-bottom:14px}.a108 label span{display:block;margin-bottom:7px}.a108 input,.a108 select,.a108 textarea{display:block;width:100%;background:#202226;color:#fff;border:1px solid #ffffff36;border-radius:9px;padding:11px;font:inherit;color-scheme:dark}.a108 textarea{min-height:100px;resize:vertical}.a108 .tools label{flex:1;min-width:145px;margin:0}.a108 .list{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}.a108 article,.a108 .editor{padding:18px;border:1px solid var(--a108-line);border-radius:14px;background:#ffffff04}.a108 article h3{font-size:17px;margin:10px 0}.a108 button{font:inherit;cursor:pointer;white-space:normal}.a108 .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.a108 .actions button{min-height:44px}.a108 button:disabled{opacity:.55;cursor:wait}.a108 [hidden]{display:none!important}.a108 .msg{padding:12px;border-left:3px solid #ffbe18;background:#ffbe180b;margin:12px 0;white-space:pre-wrap}.a108 .editor{margin-top:16px;scroll-margin-top:75px}.a108 .preview{white-space:pre-wrap;overflow-wrap:anywhere}.a108 a{color:#8ed9ff;overflow-wrap:anywhere}.a108 details{margin-top:15px}.a108 .history article{margin-top:9px}.a108 .empty{padding:20px}@media(max-width:480px){.a108 .hero{padding:16px}.a108 h2{font-size:21px}.a108 .actions button{flex:1}.a108 .stat{min-width:90px}.a108 .list{grid-template-columns:1fr}}
 </style><section class="a108"><div class="hero"><header><div><span class="badge">GABI → AMANDA · REPORTEI</span><h2>Análises mensais</h2><div class="periodo"></div></div><div class="actions"><a class="btn secondary" href="https://app.reportei.com/login" target="_blank" rel="noopener noreferrer">Abrir Reportei ↗</a><button class="btn abrir" ${compacto?'':'hidden'}>Abrir análises do mês →</button></div></header><div class="stats"></div><small>Relatórios guardados por cliente e mês. Conferência interna da Amanda.</small></div><div class="msg aviso" role="status" aria-live="polite">Carregando análises…</div><div class="tools" ${compacto?'hidden':''}><label><span>Mês da análise</span><input class="mes" type="month" min="2000-01" max="9999-12" value="${mes}"></label><label><span>Buscar cliente</span><input class="busca" type="search" placeholder="Nome do cliente"></label><label><span>Situação</span><select class="filtro"><option value="">Todas</option>${Object.entries(ROTULOS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><button class="btn secondary atualizar">Atualizar</button></div><div class="actions" ${compacto?'':'hidden'}><button class="btn secondary anterior">Ver mês anterior</button></div><div class="list" ${compacto?'hidden':''}></div><div class="editor" hidden></div></section>`;
 const q=s=>root.querySelector(s),aviso=t=>{if(!sessaoValida())return;q('.aviso').hidden=!t;q('.aviso').textContent=t;};
 function linhas(){const mapa=new Map(carteira.map(c=>[c.slug,{cliente:c.slug,clienteNome:c.nome,status:'pendente',ativo:true}]));for(const r of registros){if(r.mes!==mes||r.id!==chave(mes,r.cliente)||!Number.isInteger(r.revisao)||!ROTULOS[r.status])throw Error('Foi encontrado um registro que precisa de conferência. Nenhuma análise foi alterada.');mapa.set(r.cliente,{...r,ativo:mapa.has(r.cliente)});}return [...mapa.values()].sort((a,b)=>a.clienteNome.localeCompare(b.clienteNome,'pt-BR'));}
 function pintar(){
  if(!sessaoValida())return;const pronto=confirmado&&carteiraOk;
  q('.periodo').textContent=nomeMes(mes)+' · entregar até '+prazoMes(mes).split('-').reverse().join('/');
  if(!pronto){q('.stats').textContent='Aguardando confirmação dos dados';q('.list').replaceChildren();return;}
  let dados;try{dados=linhas();}catch(e){confirmado=false;aviso(e.message);return;}
  const total=dados.length,conferidos=dados.filter(d=>d.status==='conferido').length,enviados=dados.filter(d=>d.status==='enviado').length,pendentes=total-conferidos-enviados;
  q('.stats').innerHTML=[['A preparar / ajustar',pendentes],['Amanda: conferir',enviados],['Conferidas',conferidos]].map(([s,n])=>`<div class="stat"><b>${n}</b>${s}</div>`).join('');
  if(compacto)return;
  const visiveis=dados.filter(d=>(!filtro||d.status===filtro)&&(!busca||d.clienteNome.toLocaleLowerCase('pt-BR').includes(busca)));
  q('.list').innerHTML=visiveis.length?visiveis.map(d=>`<article><span class="badge ${esc(d.status)}">${esc(ROTULOS[d.status])}</span><h3>${esc(d.clienteNome)}</h3><small>${d.ativo?'':'Histórico · fora da carteira deste mês · '}${d.revisao?'Versão '+d.revisao:'Ainda sem análise'}${d.status!=='conferido'&&d.status!=='enviado'&&hojeBRT()>prazoMes(mes)?' · entrega em atraso':''}</small><div class="actions"><button class="btn secondary" data-cliente="${esc(d.cliente)}">${d.status==='pendente'?(podeEscrever?'Preparar análise':'Ver pendência'):gestao&&d.status==='enviado'?'Conferir análise':'Abrir análise'}</button></div></article>`).join(''):'<div class="empty">Nenhum cliente neste filtro.</div>';
  if(selecionado&&edicao&&registros.find(r=>r.cliente===selecionado.cliente)?.revisao!==(edicao.revisao||undefined)){const n=q('.nova-versao');if(n)n.hidden=false;}
 }
 async function carregar(forcar=false){
  if(ocupado)return;const g=++geracao;off?.();off=null;confirmado=false;carteiraOk=false;carteira=[];registros=[];selecionado=null;edicao=null;q('.editor').hidden=true;pintar();aviso('Carregando análises e clientes deste mês…');
  try{const c=await clientes(mes,forcar);if(!sessaoValida()||g!==geracao)return;carteira=c;carteiraOk=true;
   off=repo.observar(mes,(lista,fresco)=>{if(!sessaoValida()||g!==geracao)return;if(!fresco){aviso('Aguardando confirmação do servidor. Nenhum envio é permitido com dados desatualizados.');confirmado=false;pintar();return;}registros=lista;confirmado=true;aviso('');pintar();},e=>{if(!sessaoValida()||g!==geracao)return;confirmado=false;pintar();aviso('Não foi possível confirmar as análises. Use Atualizar ou reabra a área. '+e.message);});
  }catch(e){if(sessaoValida()&&g===geracao){pintar();aviso('Clientes não confirmados. Nenhuma análise foi alterada. '+e.message);}}
 }
 function dadosForm(){return {cliente:selecionado.cliente,clienteNome:selecionado.clienteNome,mes,link:q('[name=link]')?.value??edicao.link??'',resumo:q('[name=resumo]')?.value??edicao.resumo??'',proximos:q('[name=proximos]')?.value??edicao.proximos??'',parecer:q('[name=parecer]')?.value??''};}
 function guardar(){if(selecionado&&alterado&&!ocupado)gravarDraft(chave(mes,selecionado.cliente),{rev:edicao.revisao||0,...dadosForm()});}
 async function abrirCliente(cliente){
  if(ocupado||!confirmado||!carteiraOk)return;const g=geracao,ab=++abertura,id=chave(mes,cliente);aviso('Abrindo a versão atual…');
  try{const d=await repo.ler(id);if(!sessaoValida()||g!==geracao||ab!==abertura)return;selecionado=linhas().find(r=>r.cliente===cliente);if(!selecionado)throw Error('Cliente não encontrado neste mês.');edicao=d||{revisao:0,link:'',resumo:'',proximos:'',status:'pendente',parecer:''};const draft=lerDraft(id),aplica=draft&&draft.rev===edicao.revisao,v=aplica?{...edicao,...draft}:edicao;alterado=!!aplica;
   q('.editor').innerHTML=`<header><div><small>${esc(nomeMes(mes))}</small><h3>${esc(selecionado.clienteNome)}</h3><span class="badge ${esc(edicao.status)}">${esc(ROTULOS[edicao.status])}</span></div><button class="btn secondary fechar">Fechar</button></header><div class="msg nova-versao" hidden>Existe uma versão mais recente. Seu texto está preservado. <button class="btn secondary reabrir">Reabrir versão atual</button></div>${draft&&!aplica?'<details><summary>Rascunho anterior preservado neste navegador</summary><p class="preview">'+esc([draft.link,draft.resumo,draft.proximos,draft.parecer].filter(Boolean).join('\n\n'))+'</p><small>Confira a versão atual antes de aproveitar o texto.</small></details>':''}${aplica?'<p><small>Rascunho recuperado deste navegador.</small></p>':''}${edicao.parecer?'<div class="msg">Último retorno da Amanda: '+esc(edicao.parecer)+'</div>':''}
   ${podeEscrever?`<p><small>Cole o link compartilhável do Reportei ou do PDF. Abra o link para conferir se a Amanda tem acesso.</small></p><label><span>Link do relatório</span><input name="link" type="url" maxlength="2000" placeholder="https://…" value="${esc(v.link)}"></label><label><span>Resumo da análise (opcional)</span><textarea name="resumo" maxlength="4000" placeholder="Resultados e pontos de atenção">${esc(v.resumo)}</textarea></label><label><span>Próximos passos (opcional)</span><textarea name="proximos" maxlength="2000" placeholder="O que fazer no próximo mês">${esc(v.proximos)}</textarea></label><div class="actions"><button class="btn secondary" data-acao="salvar">Salvar rascunho</button><button class="btn" data-acao="enviar">Enviar para Amanda</button></div><p><small>Salvar uma alteração reabre a conferência. As versões anteriores ficam no histórico.</small></p>`:`<p class="preview">${esc(edicao.resumo||'Resumo ainda não preenchido.')}</p><p class="preview">${esc(edicao.proximos)}</p>`}
   <p>${linkSeguro(edicao.link)?`<a href="${esc(edicao.link)}" target="_blank" rel="noopener noreferrer">Abrir relatório salvo ↗</a>`:'<small>Nenhum relatório enviado ainda.</small>'}</p>
   ${gestao&&edicao.status==='enviado'?`<label><span>Retorno para a Gabi (obrigatório se pedir ajuste)</span><textarea name="parecer" maxlength="2000">${esc(aplica?v.parecer:'')}</textarea></label><div class="actions"><button class="btn" data-acao="conferir">Marcar como conferida</button><button class="btn secondary" data-acao="ajuste">Pedir ajuste</button></div>`:''}
   <details class="historico"><summary>Histórico desta análise</summary><div class="history">Abra para consultar as versões anteriores.</div></details>`;
   q('.editor').hidden=false;q('.editor').scrollIntoView({block:'start',behavior:'smooth'});aviso('');
   q('.fechar').onclick=()=>{if(ocupado)return;guardar();selecionado=null;edicao=null;q('.editor').hidden=true;};q('.reabrir').onclick=()=>abrirCliente(cliente);
   q('.editor').oninput=()=>{alterado=true;guardar();};
   q('.historico').ontoggle=async e=>{if(!e.target.open)return;try{const hist=await repo.historico(id);if(!sessaoValida()||g!==geracao||selecionado?.cliente!==cliente)return;q('.history').innerHTML=hist.length?hist.map(h=>`<article><b>Versão ${h.revisao} · ${esc(ROTULOS[h.status])}</b><p><small>${esc(h.autorNome)} · ${esc(h.atualizadoEm?.toDate?.().toLocaleString('pt-BR')||'')}</small></p>${linkSeguro(h.link)?`<a href="${esc(h.link)}" target="_blank" rel="noopener noreferrer">Abrir relatório desta versão ↗</a>`:''}<p class="preview">${esc(h.resumo)}</p><p class="preview">${esc(h.proximos)}</p><p class="preview">${esc(h.parecer)}</p></article>`).join(''):'Sem versões salvas.';}catch(e){if(sessaoValida())aviso('Histórico indisponível: '+e.message);}};
  }catch(e){if(sessaoValida()&&g===geracao)aviso(e.message);}
 }
 async function salvar(acao){
  if(ocupado||!selecionado||!confirmado||!carteiraOk)return;const id=chave(mes,selecionado.cliente),campos=dadosForm(),rev=edicao.revisao,g=geracao;guardar();ocupado=true;q('.editor').querySelectorAll('button,input,textarea').forEach(n=>n.disabled=true);q('.mes').disabled=true;aviso('Salvando e confirmando no servidor…');
  try{if(!rev){const atual=await clientes(mes,true);if(!atual.some(c=>c.slug===campos.cliente))throw Error('Este cliente não está confirmado na carteira deste mês.');}
   const salvo=await repo.salvar(id,rev,acao,campos);if(!sessaoValida()||g!==geracao)return;registros=registros.filter(r=>r.id!==id).concat(salvo);confirmado=true;pintar();limparDraft(id);ocupado=false;await abrirCliente(campos.cliente);aviso(acao==='enviar'?'Análise enviada. Amanda já pode conferir.':acao==='conferir'?'Análise conferida. Gabi já vê a conclusão.':acao==='ajuste'?'Ajuste enviado para a Gabi.':'Rascunho salvo. Envie quando terminar.');
  }catch(e){if(sessaoValida()&&g===geracao)aviso(e.message);}finally{ocupado=false;if(sessaoValida()){q('.mes').disabled=false;q('.editor').querySelectorAll('button,input,textarea').forEach(n=>n.disabled=false);}}
 }
 root.addEventListener('click',clique);function clique(e){const a=e.target.closest('[data-acao]');if(a)void salvar(a.dataset.acao);const c=e.target.closest('[data-cliente]');if(c)void abrirCliente(c.dataset.cliente);}
 q('.abrir').onclick=()=>abrir(mes);q('.anterior').onclick=()=>abrir(anterior(mes));
 q('.mes').onchange=e=>{if(ocupado)return;if(!mesValido(e.target.value)){aviso('Escolha um mês válido.');return;}guardar();mes=e.target.value;aoMudarMes(mes);void carregar();};
 q('.busca').oninput=e=>{busca=e.target.value.toLocaleLowerCase('pt-BR');pintar();};q('.filtro').onchange=e=>{filtro=e.target.value;pintar();};
 q('.atualizar').onclick=()=>{if(ocupado)return;guardar();void carregar(true);};
 void carregar();
 return {destroy(){guardar();vivo=false;++geracao;off?.();off=null;root.removeEventListener('click',clique);root.replaceChildren();}};
}
