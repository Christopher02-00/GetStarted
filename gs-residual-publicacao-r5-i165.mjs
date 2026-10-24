// Presentation and retry state only. Business decisions, CAS and receipts belong to the typed service.
const copy=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{1,180}$/.test(x);
const owner=c=>({uid:c.uid,papel:c.papel,atorReal:c.atorReal});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const modes=['postado','fonte_ausente','acoes_canonicas','encerrada','indisponivel'];

export function conferirPreparoResidualR5(r,demandaId){
 if(r?.schema!==1||r.demandaId!==demandaId||!id(r.postagemId)||typeof r.ciclo!=='string'||!modes.includes(r.modo)||r.demanda?.id!==demandaId||typeof r.demanda.encerrada!=='boolean'||!r.fonte||typeof r.fonte.existe!=='boolean'||r.somenteLeitura!==true||r.nenhumaEscrita!==true||r.naoAutorizaEscritaPosterior!==true||!Array.isArray(r.decisoesPermitidas)||!r.decisoesPermitidas.every(x=>['regularizar','arquivar'].includes(x))||!Array.isArray(r.opcoesCanonicas))throw Error('O serviço não confirmou a mesma demanda e o ciclo atual.');
 if(!r.demanda.encerrada&&(!/^[a-f0-9]{64}$/.test(r.assinaturaEsperada||'')))throw Error('A versão desta demanda não foi confirmada.');
 if(r.modo==='postado'&&(!r.fonte.existe||r.fonte.status!=='postado'||r.decisoesPermitidas.some(x=>x!=='regularizar')))throw Error('A publicação atual precisa ser conferida.');
 if(r.modo==='fonte_ausente'&&(r.fonte.existe||r.decisoesPermitidas.some(x=>x!=='arquivar')))throw Error('A ausência da fonte não foi confirmada.');
 if(r.modo==='acoes_canonicas'&&(r.fonte.status!=='agendado'||r.decisoesPermitidas.length))throw Error('A decisão deve seguir pela postagem atual.');
 if(['encerrada','indisponivel'].includes(r.modo)&&(r.decisoesPermitidas.length||r.opcoesCanonicas.length))throw Error('Esta demanda não permite nova resolução.');
 for(const a of r.opcoesCanonicas)if(a.postagemId!==r.postagemId||!(['publicacao','programar'].includes(a.acao))||!['publicar','cancelar','desfazer'].includes(a.tipo)||a.acao==='programar'&&a.tipo!=='desfazer'||a.acao==='publicacao'&&a.tipo==='desfazer')throw Error('O atalho não corresponde à mesma postagem.');
 return r;
}
export function intencaoResidualR5(preparo,decisao,campos,operacaoId){
 if(!id(operacaoId)||preparo.demanda.encerrada||!preparo.decisoesPermitidas.includes(decisao))throw Error('Confira a decisão disponível nesta versão.');
 const textoInformado=String(campos.provaTexto||'').trim(),imagemInformada=String(campos.provaImagemUrl||'').trim(),motivo=String(campos.motivo||'').trim();
 const provaTexto=textoInformado===String(preparo.demanda.provaTexto||'').trim()?'':textoInformado,provaImagemUrl=imagemInformada===String(preparo.demanda.provaImagemUrl||'').trim()?'':imagemInformada;
 if(provaTexto.length>3000||provaImagemUrl.length>3000||motivo.length>2000)throw Error('O texto ou o link passou do limite indicado.');
 if(provaImagemUrl){let u;try{u=new URL(provaImagemUrl);}catch{}if(!u||!['http:','https:'].includes(u.protocol))throw Error('Confira o link da prova.');}
 if(decisao==='regularizar'&&!provaTexto&&!provaImagemUrl&&!preparo.demanda.provaTexto&&!preparo.demanda.provaImagemUrl)throw Error('Deixe a prova da publicação ou confira a que já está guardada.');
 if(decisao==='arquivar'&&!motivo)throw Error('Conta rapidinho por que esta confirmação deve ser arquivada.');
 return {demandaId:preparo.demandaId,operacaoId,assinaturaEsperada:preparo.assinaturaEsperada,decisao,...(provaTexto?{provaTexto}:{}),...(provaImagemUrl?{provaImagemUrl}:{}),...(motivo?{motivo}:{})};
}
export function reciboResidualConfereR5(preparo,pendente){
 const r=preparo?.confirmacao,p=pendente?.intencao;
 return !!p&&preparo.demanda?.encerrada===true&&r?.estado==='concluida'&&r.demandaId===pendente.demandaId&&r.postagemId===pendente.postagemId&&r.ciclo===pendente.ciclo&&r.operacaoId===p.operacaoId&&r.decisao===p.decisao&&['uid','papel','atorReal'].every(k=>r.autoria?.[k]===pendente.dono[k]);
}
export function criarFluxoResidualR5({demandaId,chamar,contexto,storage,novoId}){
 if(!id(demandaId))throw Error('Abra a mesma demanda pela sua ficha.');
 const original=copy(contexto()),dono=owner(original),key='get_r5_residual_i165_v1_'+encodeURIComponent(JSON.stringify([dono.uid,dono.papel,dono.atorReal,demandaId]));
 let preparo=null,pendente=null,mensagem='Conferindo a fonte atual…',confirmada=false;
 const vigente=()=>equal(original,contexto());
 const exigir=()=>{if(!vigente())throw Error('O perfil ou a tela mudou. A tentativa continua no acesso original.');};
 function restaurar(){const raw=storage.getItem(key);if(!raw)return;let p;try{p=JSON.parse(raw);}catch{throw Error('A tentativa guardada não pôde ser lida. Nenhum novo envio será feito.');}
  const allowed=['demandaId','operacaoId','assinaturaEsperada','decisao','provaTexto','provaImagemUrl','motivo'];
  if(p?.schema!==1||p.demandaId!==demandaId||!equal(p.dono,dono)||!id(p.postagemId)||typeof p.ciclo!=='string'||!p.intencao||p.intencao.demandaId!==demandaId||!id(p.intencao.operacaoId)||!Object.keys(p.intencao).every(k=>allowed.includes(k)))throw Error('A tentativa guardada pertence a outra origem. Nenhum envio será feito.');pendente=p;
 }
 restaurar();
 function estado(){return copy({preparo,pendente,mensagem,confirmada});}
 async function conferir(){exigir();const r=await chamar('preparar_residual_publicacao_r5',{demandaId});exigir();preparo=copy(conferirPreparoResidualR5(r,demandaId));confirmada=false;
  if(pendente&&reciboResidualConfereR5(preparo,pendente)){confirmada=true;try{storage.removeItem(key);}catch{}mensagem='A decisão foi confirmada nesta mesma demanda e no mesmo ciclo.';}
  else if(pendente){mensagem=preparo.demanda.encerrada?'A demanda já foi encerrada, mas esta tentativa não tem o mesmo recibo. O histórico foi preservado.':'Uma tentativa anterior continua aguardando conferência. Só o mesmo envio pode ser repetido.';}
  else mensagem=preparo.demanda.encerrada?'Esta demanda já está encerrada. O histórico continua guardado.':'Fonte atual conferida. Nenhuma decisão foi salva ainda.';
  return estado();
 }
 async function enviar(){exigir();if(!pendente)throw Error('Não há tentativa para repetir.');mensagem='Enviando a mesma decisão e conferindo o resultado…';
  try{const r=await chamar('resolver_residual_publicacao_r5',copy(pendente.intencao));exigir();if(r?.schema!==1||!['novo','recuperado'].includes(r.estado)||r.demandaEncerrada!==true||r.requerLeituraAtual!==true)throw Error('O resultado ainda precisa ser conferido.');await conferir();if(!confirmada)throw Error('O serviço respondeu, mas o recibo atual da mesma tentativa ainda não foi confirmado.');return estado();}
  catch(e){mensagem='Não consegui confirmar o resultado. A tentativa continua guardada; confira ou repita o mesmo envio. '+(e.message||'');throw e;}
 }
 async function decidir(decisao,campos){exigir();if(pendente)throw Error('Confira a tentativa anterior antes de escolher outra decisão.');if(!preparo)throw Error('Confira a fonte atual antes de decidir.');
  const intencao=intencaoResidualR5(preparo,decisao,campos,novoId());const p={schema:1,dono,demandaId,postagemId:preparo.postagemId,ciclo:preparo.ciclo,intencao};
  try{storage.setItem(key,JSON.stringify(p));}catch{throw Error('Não consegui guardar esta tentativa no navegador. Seus campos continuam aqui; nenhum envio foi feito.');}pendente=copy(p);return enviar();
 }
 return {estado,conferir,decidir,repetir:enviar,vigente};
}

export function montarResidualPublicacaoR5(root,{demandaId,chamar,contexto,storage,novoId,preenchimento={},confirmar=()=>true,estaVisivel=()=>true,aposConfirmar=()=>{},acaoCanonica=()=>{},anexarCanonicas=()=>{}}){
 const ticket={};root.__residualR5=ticket;let vivo=true,ocupado=false;
 const fluxo=criarFluxoResidualR5({demandaId,chamar,contexto,storage,novoId});
 const atual=()=>vivo&&root.isConnected&&root.__residualR5===ticket&&estaVisivel()&&fluxo.vigente();
 const inputs=()=>Object.fromEntries([['provaTexto','[data-r5-prova]'],['provaImagemUrl','[data-r5-link]'],['motivo','[data-r5-motivo]']].flatMap(([k,s])=>{const e=root.querySelector(s);return e?[[k,e.value||'']]:[];}));
 function desenhar(){if(!atual())return;const s=fluxo.estado(),r=s.preparo,p=s.pendente?.intencao||{},val=(k,f='')=>esc(p[k]??preenchimento[k]??r?.demanda?.[k]??f);
  root.innerHTML='<h2>'+esc(r?.demanda?.titulo||'Conferência da publicação')+'</h2><p role="status">'+esc(s.mensagem)+'</p>'+(r?'<p><strong>'+esc(({postado:'Publicação já registrada',fonte_ausente:'Conteúdo não está mais disponível',acoes_canonicas:'Ainda agendado',encerrada:'Conferência já encerrada',indisponivel:'Conteúdo precisa de conferência'})[r.modo]||'Conferindo a publicação')+'</strong></p>':'');
  if(s.confirmada){root.insertAdjacentHTML('beforeend','<p>A decisão desta tentativa foi relida no servidor. A postagem, o vídeo e o calendário não foram alterados por esta regularização.</p>');return;}
  if(r?.modo==='acoes_canonicas'&&!s.pendente){root.insertAdjacentHTML('beforeend','<p>Esta postagem ainda está agendada. Registre o que aconteceu na própria fonte; esta consulta não autoriza uma baixa por fora.</p>'+r.opcoesCanonicas.filter(a=>a.acao==='publicacao').map(a=>'<button type="button" class="btn secondary" data-r5-canonica="'+esc(a.tipo)+'">'+(a.tipo==='publicar'?'Confirmar publicação na fonte':'Retirar esta postagem com motivo')+'</button>').join(''));void anexarCanonicas(root,r,atual);}
  else if(r&&!r.demanda.encerrada&&['postado','fonte_ausente'].includes(r.modo))root.insertAdjacentHTML('beforeend','<p>Vamos organizar esta pendência sem mudar o conteúdo.</p>'+(r.modo==='postado'?'<div class="field"><label>Prova da publicação</label><textarea data-r5-prova maxlength="3000">'+val('provaTexto')+'</textarea></div><div class="field"><label>Link da prova (se houver)</label><input data-r5-link maxlength="3000" value="'+val('provaImagemUrl')+'"></div>':'<div class="field"><label>Por que esta pendência pode ser arquivada?</label><textarea data-r5-motivo maxlength="2000">'+val('motivo')+'</textarea></div>')+(!s.pendente?r.decisoesPermitidas.map(d=>'<button type="button" class="btn secondary" data-r5-decidir="'+d+'">'+(d==='regularizar'?'Confirmar a prova e resolver a pendência':'Arquivar esta pendência')+'</button>').join(''):''));
  else if(r?.modo==='indisponivel')root.insertAdjacentHTML('beforeend','<p>Esta fonte precisa de conferência na sua etapa atual. Nenhuma decisão será enviada por este menu.</p>');
  if(s.pendente&&!s.confirmada)root.insertAdjacentHTML('beforeend','<button type="button" class="btn secondary" data-r5-conferir>Conferir a tentativa anterior</button>'+(!r?.demanda.encerrada?'<button type="button" class="btn secondary" data-r5-repetir>Repetir o mesmo envio</button>':''));
  root.insertAdjacentHTML('beforeend','<p data-r5-erro role="alert"></p>');
  if(s.pendente)root.querySelectorAll('input,textarea').forEach(e=>e.disabled=true);
 }
 async function executar(acao){if(ocupado||!atual())return;preenchimento={...preenchimento,...inputs()};ocupado=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await acao();if(!atual())return;desenhar();if(fluxo.estado().confirmada)await aposConfirmar(fluxo.estado());}
  catch(e){if(atual()){desenhar();const erro=root.querySelector('[data-r5-erro]');if(erro)erro.textContent=e.message||'Não consegui conferir. Nenhum sucesso foi presumido.';}}
  finally{ocupado=false;if(atual())root.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 root.onclick=e=>{if(!atual()||ocupado)return;const b=e.target.closest?.('button');if(!b||!root.contains(b))return;
  if(b.hasAttribute('data-r5-conferir'))return void executar(()=>fluxo.conferir());
  if(b.hasAttribute('data-r5-repetir'))return void executar(()=>fluxo.repetir());
  if(b.dataset.r5Decidir){const d=b.dataset.r5Decidir;if(!confirmar(d==='arquivar'?'Arquivar esta demanda sem declarar publicação?':'Você conferiu que a prova corresponde a esta publicação?'))return;const campos=inputs();return void executar(()=>fluxo.decidir(d,campos));}
  if(b.dataset.r5Canonica){const r=fluxo.estado().preparo,a=r.opcoesCanonicas.find(a=>a.tipo===b.dataset.r5Canonica&&a.acao==='publicacao');if(a)void acaoCanonica(a,root,atual);}
 };
 const ready=executar(()=>fluxo.conferir());return {ready,destroy(){vivo=false;if(root.__residualR5===ticket)root.onclick=null;},fluxo};
}
