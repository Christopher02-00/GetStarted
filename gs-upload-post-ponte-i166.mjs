// Browser bridge for the existing Agendar card. Only the existing authenticated onCall is used.
// No provider URL/key/fetch, database writer, timer, scheduler or publication confirmation lives here.
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{1,180}$/u.test(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const canon=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const esc=x=>String(x??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dono=c=>canon([c.uid,c.papel,c.atorReal]);
const chaveContexto=c=>canon([c?.uid,c?.papel,c?.atorReal,c?.sessao,c?.rota]);
const comum=c=>({uidEsperado:c.uid,atorRealEsperado:c.atorReal,papelOperado:c.papel,sessao:c.sessao});
const chave=(c,p,o)=>'get_upload_post_i166_v1_'+encodeURIComponent(canon([dono(c),p,o]));
const congelar=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(congelar);Object.freeze(v);}return v;};
const confirmadoNoGet=j=>j?.estado==='agendamento_conferido'&&j.agendamentoConfirmado===true&&j.canonico?.estado==='confirmado';
const estadosJob=new Set(['pendente','reservada','enviando','incerto','falha_antes_envio','aceito_a_conferir','agendamento_conferido','precisa_atencao','cancelada_confirmada']);
function validarJob(j,s){if(!j||!hash(j.id)||j.id!==s.jobId||j.postagemId!==s.postagemId||j.ocorrenciaId!==s.ocorrenciaId||j.rede!=='instagram'||!estadosJob.has(j.estado)||j.publicadoConfirmado!==false)throw Error('A execução recebida não corresponde a este conteúdo.');return clone(j);}
export function agendaSaoPauloUploadPostI166(data,hora){
 if(!/^20\d{2}-\d{2}-\d{2}$/u.test(data||'')||!/^([01]\d|2[0-3]):[0-5]\d$/u.test(hora||''))throw Error('Informe a data e o horário da postagem.');
 const civil=data+'T'+hora+':00',alvo=Date.parse(civil+'Z');if(!Number.isFinite(alvo)||new Date(alvo).toISOString().slice(0,16)!==civil.slice(0,16))throw Error('Confira a data da postagem.');
 const format=n=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(n)).replace(' ','T');
 let instante=alvo;for(let n=0;n<3;n++)instante+=alvo-Date.parse(format(instante)+'Z');
 if(format(instante)!==civil)throw Error('Este horário precisa ser conferido para São Paulo.');
 return {data,hora,timeZone:'America/Sao_Paulo',scheduled_date:new Date(instante).toISOString()};
}
export function criarPonteUploadPostI166({contexto,chamar,storage,novoId,quandoMuda=()=>{}}){
 if(typeof contexto!=='function'||typeof chamar!=='function'||typeof novoId!=='function'||!storage)throw Error('A programação precisa do acesso e do armazenamento desta sessão.');
 const estados=new Map();let ciclo=0;
 const ctx=()=>{const c=clone(contexto());if(!c.uid||!c.atorReal||!c.sessao||!['Amanda','Chris','Cecília'].includes(c.papel))throw Error('Abra esta programação pelo perfil responsável.');return c;};
 function obter(postagemId,ocorrenciaId,c=ctx()){
  if(!id(postagemId)||!id(ocorrenciaId))throw Error('Abra a postagem e a ocorrência pelo cartão atual.');const k=chave(c,postagemId,ocorrenciaId);if(estados.has(k))return estados.get(k);
  let s;try{const x=JSON.parse(storage.getItem(k)||'null');if(x?.schema===1&&x.postagemId===postagemId&&x.ocorrenciaId===ocorrenciaId&&x.dono===dono(c))s=x;}catch{}
  s||={schema:1,postagemId,ocorrenciaId,dono:dono(c),campos:{data:'',hora:''},estado:'rascunho',mensagem:'Confira a data e o material antes de agendar.',intencao:null,jobId:null,job:null,preparo:null,ticket:0};
  if(s.intencao){s.intencao=congelar(s.intencao);if(['enviando','conferindo'].includes(s.estado)){s.estado='incerta';s.mensagem='Sua tentativa anterior está guardada. Confira o envio antes de continuar.';}}
  estados.set(k,s);return s;
 }
 function salvar(s,c,obrigatorio=false){try{storage.setItem(chave(c,s.postagemId,s.ocorrenciaId),JSON.stringify(s));return true;}catch{if(obrigatorio)throw Error('Não consegui guardar esta tentativa no aparelho. Nada novo foi enviado.');return false;}}
 const emitir=(s,c)=>{salvar(s,c);if(chaveContexto(c)===chaveContexto(contexto()))quandoMuda(clone(s));};
 const capturar=(s,c)=>{const t=++s.ticket,k=ciclo;return()=>t===s.ticket&&k===ciclo&&chaveContexto(c)===chaveContexto(contexto());};
 function editar(p,o,campos){const c=ctx(),s=obter(p,o,c);if(s.intencao||['preparando','enviando','conferindo'].includes(s.estado))return false;if(Object.keys(campos).some(k=>!['data','hora'].includes(k))||Object.values(campos).some(v=>typeof v!=='string'))throw Error('Confira os campos da data e do horário.');Object.assign(s.campos,campos);s.ticket++;s.estado='rascunho';s.preparo=null;emitir(s,c);return true;}
 async function preparar(p,o,campos={}){
  const c=ctx(),s=obter(p,o,c);if(s.intencao){emitir(s,c);return clone(s);}if(['preparando','enviando','conferindo'].includes(s.estado))return {ocupada:true};
  editar(p,o,campos);const agenda=agendaSaoPauloUploadPostI166(s.campos.data,s.campos.hora),operacaoId=novoId();if(!id(operacaoId))throw Error('A tentativa precisa de um identificador válido.');
  const atual=capturar(s,c);s.estado='preparando';s.mensagem='Conferindo o material, a aprovação e a conta…';emitir(s,c);
  try{const r=await chamar('preparar_upload_post',{postagemId:p,rede:'instagram',ocorrenciaId:o,operacaoId,agenda,...comum(c)});if(!atual())return {tardia:true};
   if(!r||!Array.isArray(r.impedimentos)||r.somenteLeitura!==true)throw Error('A conferência ainda não foi recebida.');
   if(!r.elegivel){s.estado='bloqueada';s.preparo=null;s.impedimentos=clone(r.impedimentos);s.mensagem='Falta conferir estes pontos antes de agendar.';}
   else{if(!hash(r.jobId)||!hash(r.assinaturaFonte)||!hash(r.assinaturaPacote)||r.normalizado?.postagemId!==p||r.normalizado?.ocorrenciaId!==o||r.normalizado?.rede!=='instagram'||canon(r.normalizado?.agenda)!==canon(agenda))throw Error('O pacote conferido não corresponde a esta postagem e data.');s.estado='pronta';s.preparo={jobId:r.jobId,assinaturaFonte:r.assinaturaFonte,assinaturaPacote:r.assinaturaPacote,operacaoId,agenda,material:clone(r.normalizado)};s.impedimentos=[];s.mensagem='Material conferido. Confira a prévia e confirme o agendamento.';}
   emitir(s,c);return clone(s);
  }catch(e){if(atual()){s.estado='erro_preparo';s.mensagem='Não consegui conferir agora. Seus campos continuam aqui.';emitir(s,c);}return {erro:true};}
 }
 async function enviarMesmo(s,c){
  const atual=capturar(s,c);s.estado='enviando';s.mensagem='Salvando a intenção no sistema. A confirmação da plataforma vem depois.';salvar(s,c,true);emitir(s,c);
  try{const r=await chamar('criar_upload_post',{...s.intencao,...comum(c)});if(!atual())return{tardia:true};s.job=validarJob(r?.job,s);s.estado=confirmadoNoGet(s.job)?'agendamento_conferido':'registrada';s.mensagem=mensagemJobUploadPostI166(s.job);emitir(s,c);return clone(s);
  }catch(e){if(atual()){s.estado='incerta';s.mensagem='Ainda não consegui confirmar o registro. Confira esta mesma tentativa; seus dados continuam guardados.';emitir(s,c);}return {incerta:true};}
 }
 async function confirmar(p,o){const c=ctx(),s=obter(p,o,c);if(s.intencao||s.estado!=='pronta'||!s.preparo)throw Error('Confira o material atual antes de confirmar.');const r=s.preparo;s.jobId=r.jobId;s.intencao=congelar({postagemId:p,rede:'instagram',ocorrenciaId:o,operacaoId:r.operacaoId,agenda:clone(r.agenda),assinaturaFonteEsperada:r.assinaturaFonte,assinaturaPacoteEsperada:r.assinaturaPacote,...comum(c)});s.estado='enviando';try{salvar(s,c,true);}catch(e){s.intencao=null;s.jobId=null;s.estado='pronta';throw e;}return enviarMesmo(s,c);}
 async function conferir(p,o){const c=ctx(),s=obter(p,o,c);if(!s.intencao||!hash(s.jobId))throw Error('Não existe uma tentativa guardada para este conteúdo.');if(['enviando','conferindo'].includes(s.estado))return{ocupada:true};const atual=capturar(s,c);s.estado='conferindo';s.mensagem='Conferindo a mesma execução no sistema…';emitir(s,c);
  try{const r=await chamar('consultar_upload_post',{jobId:s.jobId,postagemId:p,...comum(c)});if(!atual())return{tardia:true};s.job=validarJob(r?.job,s);s.estado=confirmadoNoGet(s.job)?'agendamento_conferido':'registrada';s.mensagem=mensagemJobUploadPostI166(s.job);emitir(s,c);return clone(s);}catch(e){if(atual()){s.estado='incerta';s.mensagem='Não consegui confirmar agora. A mesma tentativa continua guardada; nada foi reenviado à plataforma.';emitir(s,c);}return{incerta:true};}
 }
 async function retomar(p,o){const c=ctx(),s=obter(p,o,c);if(!s.intencao||s.estado!=='incerta')throw Error('Confira a tentativa anterior antes de retomar.');return enviarMesmo(s,c);}
 const estado=(p,o)=>clone(obter(p,o));
 const invalidar=()=>{ciclo++;};
 return Object.freeze({preparar,editar,confirmar,conferir,retomar,estado,invalidar});
}
export function mensagemJobUploadPostI166(job){
 if(confirmadoNoGet(job))return 'Agendamento conferido na plataforma e no portal. A publicação ainda será acompanhada.';
 if(job.canonico?.estado==='precisa_conciliar')return 'A plataforma confirmou o agendamento. A equipe precisa conferir o registro no portal: '+(job.canonico.mensagem||'a conferência desta mesma execução ficou pendente.');
 if(job.estado==='agendamento_conferido')return 'A plataforma confirmou o agendamento. Falta concluir a conferência no portal; a mesma execução continua sendo acompanhada.';
 if(job.estado==='falha_antes_envio')return 'O material ainda não foi enviado. Confira a pendência indicada; sua intenção está preservada.';
 if(job.estado==='aceito_a_conferir')return 'A plataforma recebeu o pedido. Ainda estamos conferindo o agendamento.';
 if(job.estado==='incerto'||job.estado==='enviando')return 'Conferindo a execução anterior. Nenhum novo envio será feito enquanto ela não for esclarecida.';
 if(job.estado==='cancelada_confirmada')return 'O cancelamento foi conferido. O histórico continua guardado.';
 return 'Pedido registrado no sistema. A confirmação do agendamento ainda está pendente.';
}
export function htmlPonteUploadPostI166(s){
 const p=s.preparo?.material,ocupada=['preparando','enviando','conferindo'].includes(s.estado),fixa=!!s.intencao,off=ocupada||fixa?' disabled':'';
 const campos='<div class="i165-grid"><label>Data da postagem<input data-up166-campo="data" type="date" value="'+esc(s.campos.data)+'"'+off+'></label><label>Horário<input data-up166-campo="hora" type="time" value="'+esc(s.campos.hora)+'"'+off+'></label></div>';
 const pacote=p?'<section class="i165-entrega"><strong>'+esc(p.cliente)+(p.empresaOtavio?' · '+esc(p.empresaOtavio):'')+'</strong><p>Instagram: '+esc(p.conta.profile_username)+'</p><p>'+esc(p.payload.instagram_title)+'</p><p>Capa: '+esc(p.payload.thumb_offset)+' ms · Colaboradores: '+esc(p.payload.collaborators.join(', ')||'nenhum')+'</p></section>':'';
 const impedimentos=(s.job?.impedimentos||s.impedimentos||[]).map(x=>'<li>'+esc(x.mensagem)+' '+esc(x.responsavel?'('+x.responsavel+')':'')+'</li>').join('');
 const botao=fixa?'<button type="button" data-up166-acao="conferir"'+(ocupada?' disabled':'')+'>Conferir envio</button>'+(s.estado==='incerta'?'<button type="button" data-up166-acao="retomar">Retomar a mesma tentativa no sistema</button>':''):'<button type="button" data-up166-acao="preparar"'+(ocupada?' disabled':'')+'>Conferir material</button>'+(s.estado==='pronta'?'<button type="button" data-up166-acao="confirmar">Agendar na plataforma</button>':'');
 return '<section class="i165-post-action" data-upload-post-i166><h3>Agendar este conteúdo</h3>'+campos+pacote+(impedimentos?'<ul>'+impedimentos+'</ul>':'')+'<p role="status">'+esc(s.mensagem)+'</p>'+botao+'<p class="meta">Recebimento, agendamento e publicação são conferências separadas. Pedir outra data ou cancelar continua dependendo da decisão correspondente.</p><p data-up166-erro role="alert"></p></section>';
}
// Integrator inserts this interceptor before existing tratarAgendamento; false alone permits legacy fallback.
export function htmlResumoPacoteUploadPostI166(r,postagemId){
 const p=r?.pacote;if(!p||p.postagemId!==postagemId||!p.midia||!hash(p.midia.sha256)||typeof p.midia.id!=='string'||!p.midia.generation)throw Error('A versão do arquivo ainda não foi confirmada pelo servidor.');
 if(r.capacidades?.upload!==false||r.capacidades?.preview!==false||r.preview!==null)throw Error('A prévia recebida precisa da configuração correspondente.');
 const aprovado=['Amanda','Chris'].includes(p.aprovacao?.por)&&typeof p.aprovacao?.em==='string'&&p.aprovacao?.midiaManifestoId===p.midia.id&&p.aprovacao?.midiaSha256===p.midia.sha256&&String(p.aprovacao?.midiaGeneration)===String(p.midia.generation);
 return '<section class="i165-entrega" data-up166-material><h4>Material desta versão</h4><p>'+esc(p.formato||'Vídeo')+' · arquivo '+esc(p.midia.sha256.slice(0,12))+' · '+esc(p.midia.bytes)+' bytes</p><p>'+esc(aprovado?'Arquivo aprovado nesta versão.':'A aprovação desta versão precisa ser conferida antes de agendar.')+'</p><p>Capa: '+esc(p.capa?.thumb_offset??'a conferir')+' ms · Colaboradores: '+esc((p.collaborators||[]).join(', ')||'nenhum')+'</p><p class="meta">A prévia do arquivo ainda não está disponível. O agendamento só é liberado após a conferência do material e da conta.</p></section>';
}
export function criarUiPonteUploadPostI166({document,contexto,chamar,storage,novoId,obterDestino,obterAlvo,lerPacote,toast=()=>{}}){
 if(typeof lerPacote!=='function')throw Error('Ligue a leitura autenticada da versão do arquivo.');
 const montagens=new Map();let fluxo;
 function estilo(){if(document.getElementById('estiloPonteUploadPostI166'))return;const e=document.createElement('style');e.id='estiloPonteUploadPostI166';e.textContent='[data-up166-montagem]{margin:16px 0;padding:18px;border:1px solid var(--green,#4fb87c);border-radius:14px;background:var(--deep,#202122);overflow-wrap:anywhere}[data-up166-montagem] h3,[data-up166-montagem] h4{margin:0 0 12px}[data-up166-montagem] .i165-entrega{padding:14px;margin:12px 0;border:1px solid var(--line,#444);border-radius:12px}[data-up166-montagem] .i165-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}[data-up166-montagem] label{display:flex;flex-direction:column;gap:7px;margin:12px 0}[data-up166-montagem] input{box-sizing:border-box;min-width:0;width:100%;padding:11px;border:1px solid var(--line,#444);border-radius:9px;background:var(--graphite,#292a2b);color:var(--text,#eee);font:inherit}[data-up166-montagem] button{margin:6px 8px 6px 0;padding:11px 14px;border:1px solid var(--line,#444);border-radius:10px;background:transparent;color:var(--text,#eee);font:inherit;cursor:pointer}[data-up166-montagem] [data-up166-acao=confirmar]{background:var(--green,#4fb87c);color:#102216;font-weight:800}[data-up166-montagem] [role=alert]{color:var(--red,#ef8989)}[data-up166-montagem] :focus-visible{outline:2px solid var(--yellow,#ffc21f);outline-offset:3px}[data-up166-montagem] button:disabled{opacity:.55;cursor:wait}';document.head.appendChild(e);}
 const vigente=m=>m&&m.cont.isConnected&&m.el.isConnected&&m.contexto===chaveContexto(contexto())&&m.alvoTicket===m.cont.__fichaPostI165&&m.alvoPostagem===m.cont.__fichaPostIdI165;
 const desenhar=s=>{const m=montagens.get(s.postagemId+'|'+s.ocorrenciaId);if(!vigente(m))return;const foco=m.el.contains(document.activeElement),campo=document.activeElement?.dataset?.up166Campo,ini=document.activeElement?.selectionStart,fim=document.activeElement?.selectionEnd;m.el.innerHTML=m.resumo+htmlPonteUploadPostI166(s);if(foco&&campo){const input=m.el.querySelector('[data-up166-campo="'+campo+'"]');input?.focus({preventScroll:true});if(typeof ini==='number')try{input.setSelectionRange(ini,fim);}catch{}}};
 fluxo=criarPonteUploadPostI166({contexto,chamar,storage,novoId,quandoMuda:desenhar});
 async function tratarAgendamento(postagemId,entrada={}){
  const ctx=chaveContexto(contexto());let destino;
  try{destino=await obterDestino(postagemId);}catch(e){toast('Não consegui conferir o destino desta programação. Seus campos continuam aqui.','erro');return{tratada:true,resultado:{ok:false}};}
  if(ctx!==chaveContexto(contexto()))return{tratada:true,resultado:{ok:false,contextoMudou:true}};
  if(destino?.rota==='legado_i165')return{tratada:false};
  if(destino?.rota!=='upload_post_i166'){toast('O destino desta programação ainda precisa ser conferido. Nada foi enviado.','erro');return{tratada:true,resultado:{ok:false}};}
  if(entrada.tipo!=='agendar'||entrada.remarcar===true){toast('Confira a execução atual antes de alterar ou cancelar o agendamento. Nenhuma alteração foi feita na plataforma.','erro');return{tratada:true,resultado:{ok:false}};}
  try{const o=destino.ocorrenciaId,cont=obterAlvo(postagemId,entrada.origem);if(!cont?.isConnected)throw Error('Abra novamente o cartão deste conteúdo.');const ticket=cont.__fichaPostI165,alvoPostagem=cont.__fichaPostIdI165;
   const pacote=await lerPacote(postagemId);if(ctx!==chaveContexto(contexto())||!cont.isConnected||ticket!==cont.__fichaPostI165||alvoPostagem!==cont.__fichaPostIdI165)return{tratada:true,resultado:{ok:false,contextoMudou:true}};
   const resumo=htmlResumoPacoteUploadPostI166(pacote,postagemId),k=postagemId+'|'+o;let m=montagens.get(k);if(!m||m.cont!==cont||!vigente(m)){m?.el.remove();estilo();const el=document.createElement('div');el.dataset.up166Montagem='';cont.appendChild(el);m={cont,el,contexto:ctx,resumo,alvoTicket:ticket,alvoPostagem};montagens.set(k,m);el.oninput=e=>{const campo=e.target.dataset?.up166Campo;if(campo&&vigente(m))fluxo.editar(postagemId,o,{[campo]:e.target.value});};el.onclick=async e=>{if(!vigente(m))return;const b=e.target.closest?.('[data-up166-acao]');if(!b)return;try{await fluxo[b.dataset.up166Acao](postagemId,o);}catch(err){if(vigente(m)){const p=el.querySelector('[data-up166-erro]');if(p)p.textContent=err.message;}}};}else m.resumo=resumo;
   desenhar(fluxo.estado(postagemId,o));await fluxo.preparar(postagemId,o,{data:entrada.data||'',hora:entrada.hora||''});return{tratada:true,resultado:{ok:false,conferenciaAbertaI166:true}};
  }catch(e){toast(e.message,'erro');return{tratada:true,resultado:{ok:false}};}
 }
 function destroy(){fluxo.invalidar();for(const m of montagens.values()){m.el.oninput=null;m.el.onclick=null;m.el.remove();}montagens.clear();}
 return Object.freeze({fluxo,tratarAgendamento,destroy});
}
