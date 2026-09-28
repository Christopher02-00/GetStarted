/* I96 — recados privados por origem exata. Não participa do estado editorial. */
export const COLECAO='calendarios_recados_equipe';
const PAPÉIS=new Set(['Chris','Amanda','Gabrielle','Cecília']);
const texto=v=>String(v??'');
// O Firestore não garante a ordem das propriedades de um mapa.
export const mesmaSelecao=(a,b)=>a==null&&b==null||!!a&&!!b&&a.origem===b.origem&&a.inicio===b.inicio&&a.fim===b.fim;
export function chave(alvo){
  if(!alvo||![alvo.calendarId,alvo.itemId].every(v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(v))||!/^\d{4}-(0[1-9]|1[0-2])$/.test(alvo.competencia))throw Error('Conteúdo sem origem confirmada. Abra o conteúdo salvo no calendário.');
  return [alvo.calendarId,alvo.competencia,alvo.itemId].join('|');
}
const ativo=i=>i&&i.excluido!==true&&i.ativo!==false&&i.arquivado!==true&&i.archived!==true&&!i.deletedAt;
export function localizar(cal,alvo,mesDoItem){
  chave(alvo);
  if(!ativo(cal))throw Error('Este calendário foi retirado. Nenhum recado foi alterado.');
  const indices=(cal.items||[]).map((i,n)=>({i,n})).filter(({i})=>i.itemId===alvo.itemId&&mesDoItem(cal,i)===alvo.competencia);
  if(indices.length!==1||!ativo(indices[0].i))throw Error('Conteúdo ausente, retirado ou duplicado neste mês. Confira a origem.');
  return indices[0];
}
export function separar(cal,alvo,origem,inicio,fim,mesDoItem){
  const {i,n}=localizar(cal,alvo,mesDoItem);
  if(texto(i.obs)!==origem||!Number.isInteger(inicio)||!Number.isInteger(fim)||inicio<0||fim>origem.length||fim<=inicio||!origem.slice(inicio,fim).trim())throw Error('A orientação mudou ou o trecho não foi selecionado. Reabra a conferência.');
  const trecho=origem.slice(inicio,fim),restante=origem.slice(0,inicio)+origem.slice(fim);
  const patch={items:cal.items.map((it,j)=>j===n?{...it,obs:restante}:it)},backup={obs:origem};
  const marca=cal.aprovacaoMeses?.[alvo.competencia],retrato=marca?.retratoLiberadoV115;
  if(retrato){
    if(retrato.mes!==alvo.competencia||!Array.isArray(retrato.items))throw Error('O retrato publicado precisa ser conferido antes da separação.');
    const alvos=retrato.items.filter(it=>it.itemId===alvo.itemId);
    if(alvos.length>1)throw Error('Há identificação duplicada na versão publicada. Nenhum texto foi alterado.');
    if(alvos.length){
      if(texto(alvos[0].obs)!==origem)throw Error('A orientação publicada é diferente da atual. Peça à gerência para conferir as duas versões antes de separar.');
      backup.retratoObs=texto(alvos[0].obs);
      patch.aprovacaoMeses={...cal.aprovacaoMeses,[alvo.competencia]:{...marca,retratoLiberadoV115:{...retrato,items:retrato.items.map(it=>it.itemId===alvo.itemId?{...it,obs:restante}:it)}}};
    }
  }
  return {patch,backup,trecho,restante};
}
export function criarRepositorio({db,sdk,contexto,validarContexto,mesDoItem,validarFonte=(_r,d)=>d}){
  const {doc,getDocFromServer,runTransaction,serverTimestamp}=sdk;
  const conferir=c=>{validarContexto(c);if(!c.uid||!PAPÉIS.has(c.papel))throw Error('Entre com o Google autorizado da equipe para editar recados.');};
  const ref=a=>doc(db,COLECAO,chave(a));
  const verificarRegistro=(d,a)=>{if(d&&[...['calendarId','competencia','itemId']].some(k=>d[k]!==a[k]))throw Error('O recado não corresponde ao conteúdo. Nada foi alterado.');return d;};
  async function ler(a,c){conferir(c);const [s,cs]=await Promise.all([getDocFromServer(ref(a)),getDocFromServer(doc(db,'calendarios',a.calendarId))]);conferir(c);if(!cs.exists())throw Error('Calendário não encontrado.');const cal=validarFonte(doc(db,'calendarios',a.calendarId),cs.data());const {i}=localizar(cal,a,mesDoItem);return {nota:verificarRegistro(s.exists()?s.data():null,a),obs:texto(i.obs),titulo:texto(i.name)};}
  async function salvar(a,pedido,c){
    conferir(c);const r=ref(a),evento=doc(db,COLECAO,chave(a),'historico',pedido.operacaoId),cr=doc(db,'calendarios',a.calendarId);
    if(!/^[A-Za-z0-9_-]{8,80}$/.test(pedido.operacaoId||'')||typeof pedido.texto!=='string'||pedido.texto.length>8000||!Number.isInteger(pedido.revisao))throw Error('Recado inválido ou maior que 8.000 caracteres.');
    try{await runTransaction(db,async tx=>{
      conferir(c);const [ns,cs,es]=await Promise.all([tx.get(r),tx.get(cr),tx.get(evento)]);
      if(es.exists()){
        const e=es.data();if(e.autorUid!==c.uid||e.pedidoTexto!==pedido.texto||!mesmaSelecao(e.selecao,pedido.selecao))throw Error('Esta operação já pertence a outro texto. Reabra o recado.');return;
      }
      if(!cs.exists())throw Error('Calendário não encontrado.');
      const cal=validarFonte(cr,cs.data());localizar(cal,a,mesDoItem);
      const antes=verificarRegistro(ns.exists()?ns.data():null,a),revisao=antes?.revisao||0;
      if(revisao!==pedido.revisao)throw Error('Outro recado foi salvo. Seu rascunho foi mantido; confira a versão salva antes de tentar novamente.');
      const movido=pedido.selecao?separar(cal,a,pedido.selecao.origem,pedido.selecao.inicio,pedido.selecao.fim,mesDoItem):null;
      const novo=movido?[pedido.texto,movido.trecho].filter(Boolean).join('\n\n'):pedido.texto;
      if(novo.length>8000)throw Error('O recado com o trecho ultrapassa 8.000 caracteres. Reduza o texto antes de separar.');
      const nota={schemaVersion:1,calendarId:a.calendarId,competencia:a.competencia,itemId:a.itemId,texto:novo,revisao:revisao+1,operacaoId:pedido.operacaoId,autorUid:c.uid,por:texto(c.ator||c.papel),perfil:c.papel,em:serverTimestamp()};
      conferir(c);tx.set(r,nota);tx.set(evento,{...nota,antes:texto(antes?.texto),pedidoTexto:pedido.texto,selecao:pedido.selecao||null,backup:movido?.backup||null});
      if(movido)tx.update(cr,movido.patch);
    });}catch(e){
      // Resposta interrompida não autoriza repetir uma escrita já confirmada.
      let recibo;try{recibo=await getDocFromServer(evento);}catch{}conferir(c);
      if(!recibo?.exists()||recibo.data().autorUid!==c.uid||recibo.data().pedidoTexto!==pedido.texto||!mesmaSelecao(recibo.data().selecao,pedido.selecao))throw e;
    }
    const [atual,e]=await Promise.all([ler(a,c),getDocFromServer(evento)]);conferir(c);
    if(!e.exists())throw Error('Não recebi a confirmação do salvamento. Seu rascunho foi mantido.');
    return {...atual,gravado:e.data()};
  }
  async function historico(a,c){conferir(c);const s=await sdk.getDocs(sdk.collection(db,COLECAO,chave(a),'historico'));conferir(c);if(s.metadata.fromCache||s.metadata.hasPendingWrites)throw Error('Não foi possível confirmar o histórico no servidor. Tente novamente.');return s.docs.map(d=>d.data()).sort((a,b)=>b.revisao-a.revisao);}
  return {ler,salvar,historico};
}
function estilos(document){if(document.getElementById('estilo-recado-i96'))return;const s=document.createElement('style');s.id='estilo-recado-i96';s.textContent=`.recado-i96{padding:16px;border:1px solid #6b7591;border-radius:12px;background:#232731;color:#f4f4f4;margin:12px 0}.recado-i96 h3{margin:0 0 6px;font-size:17px}.recado-i96 p{font-size:13px;line-height:1.5;margin:6px 0 12px;color:#cdd2dd}.recado-i96 textarea{display:block;width:100%;box-sizing:border-box;min-height:100px;background:#171a21;color:#fff;border:1px solid #687084;border-radius:8px;padding:10px;font:inherit;resize:vertical}.recado-i96 button{border:1px solid #687084;border-radius:8px;background:#303747;color:#fff;padding:10px 14px;margin:8px 8px 0 0;font:inherit;cursor:pointer}.recado-i96 button.principal{background:#ffbf13;color:#191919;border-color:#ffbf13;font-weight:700}.recado-i96 button:disabled{opacity:.5;cursor:wait}.recado-i96 summary{cursor:pointer;margin-top:14px}.recado-i96 pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:13px}.recado-i96 [role=status]{white-space:pre-wrap;font-size:13px;margin-top:10px}.dialogo-recado-i96{margin:auto;width:min(620px,92vw);max-height:85vh;box-sizing:border-box;background:#202329;color:#fff;border:1px solid #737d91;border-radius:14px;padding:16px}.dialogo-recado-i96::backdrop{background:#000a}`;document.head.append(s);}
export function montar({root,alvo,repo,contexto,antesSeparar=()=>{},separado=()=>{}}){
  const document=root.ownerDocument;estilos(document);let vivo=true,busy=false,foto=null,operacao=null,preview=null;
  const c=contexto(),draftKey='gs-recado-i96:'+c.uid+':'+chave(alvo),storage=document.defaultView.sessionStorage;
  let rascunho;try{rascunho=JSON.parse(storage.getItem(draftKey)||'null');}catch{}
  root.classList.add('recado-i96');root.replaceChildren();
  function el(tag,txt,parent=root){const e=document.createElement(tag);if(txt)e.textContent=txt;parent.append(e);return e;}
  el('h3','Recado interno · só a equipe');el('p','Gabi, Cecília e Amanda usam este espaço. O cliente não recebe este texto.');
  const titulo=el('p',alvo.titulo||''),label=el('label','Recado para a equipe'),input=el('textarea',null,label);input.maxLength=8000;input.setAttribute('aria-label','Recado para a equipe');input.disabled=true;
  const salvar=el('button','Salvar recado');salvar.type='button';salvar.className='principal';salvar.disabled=true;
  const atualizar=el('button','Conferir recado salvo');atualizar.type='button';
  const aviso=el('div');aviso.setAttribute('role','status');
  const conflito=el('pre');conflito.hidden=true;
  const usar=el('button','Usar texto salvo');usar.type='button';usar.hidden=true;
  const antigo=el('details'),sum=el('summary','Separar um recado antigo da orientação pública',antigo);
  el('p','Selecione somente o trecho interno. Você verá a orientação que continuará aparecendo ao cliente antes de confirmar.',antigo);
  const publico=el('textarea',null,antigo);publico.readOnly=true;publico.setAttribute('aria-label','Orientação visível ao cliente');
  const selecionar=el('button','Prévia da separação',antigo);selecionar.type='button';
  const previa=el('pre',null,antigo);previa.hidden=true;
  const confirmar=el('button','Confirmar separação',antigo);confirmar.type='button';confirmar.hidden=true;
  const hist=el('details'),hs=el('summary','Versões anteriores do recado',hist),historicos=el('div',null,hist);
  const guardar=()=>{try{storage.setItem(draftKey,JSON.stringify({texto:input.value,revisao:foto?.nota?.revisao??rascunho?.revisao??0}));}catch{}};
  function botões(){salvar.disabled=busy||!foto;selecionar.disabled=busy||!foto;confirmar.disabled=busy||!preview;atualizar.disabled=busy;}
  input.oninput=()=>{guardar();operacao=null;};
  async function carregar(inicial=false){
    if(busy)return;busy=true;botões();aviso.textContent='Conferindo recado…';
    try{const nova=await repo.ler(alvo,c);if(!vivo)return;foto=nova;titulo.textContent=nova.titulo+' · '+alvo.competencia;
      if(inicial)input.value=rascunho?.texto??nova.nota?.texto??'';
      input.disabled=false;publico.value=nova.obs;antigo.hidden=!nova.obs.trim();preview=null;confirmar.hidden=true;previa.hidden=true;
      const local=input.value,remoto=nova.nota?.texto||'';conflito.hidden=local===remoto;usar.hidden=local===remoto;
      conflito.textContent='Texto salvo: '+(remoto||'(sem recado)');
      aviso.textContent=local===remoto?(remoto?'Recado carregado.':'Nenhum recado interno salvo.'):'Seu rascunho foi mantido. Confira o texto salvo antes de salvar.';
    }catch(e){if(vivo)aviso.textContent=e.message;}finally{busy=false;if(vivo)botões();}
  }
  usar.onclick=()=>{if(!foto||busy)return;input.value=foto.nota?.texto||'';rascunho=null;operacao=null;guardar();usar.hidden=true;conflito.hidden=true;aviso.textContent='Texto salvo carregado no campo.';};
  atualizar.onclick=()=>carregar();
  selecionar.onclick=()=>{try{antesSeparar();const s=separar({items:[{itemId:alvo.itemId,mes:alvo.competencia,obs:foto.obs}]},alvo,foto.obs,publico.selectionStart,publico.selectionEnd,(_c,i)=>i.mes);preview={origem:foto.obs,inicio:publico.selectionStart,fim:publico.selectionEnd};previa.textContent='VAI PARA A EQUIPE:\n'+s.trecho+'\n\nCONTINUA PARA O CLIENTE:\n'+(s.restante||'(sem orientação)');previa.hidden=false;confirmar.hidden=false;botões();}catch(e){aviso.textContent=e.message;}};
  async function gravar(selecao=null){
    if(busy||!foto)return;
    const capturado=input.value;
    if(selecao){try{antesSeparar();}catch(e){aviso.textContent=e.message;return;}}
    const assinatura=JSON.stringify([capturado,selecao,foto.nota?.revisao||0]);if(!operacao||operacao.assinatura!==assinatura)operacao={assinatura,id:crypto.randomUUID()};
    busy=true;botões();aviso.textContent='Salvando recado…';
    try{const salvo=await repo.salvar(alvo,{texto:capturado,revisao:foto.nota?.revisao||0,operacaoId:operacao.id,selecao},c);
      if(!vivo)return;foto=salvo;operacao=null;
      if(input.value===capturado){input.value=salvo.nota?.texto||'';try{storage.removeItem(draftKey);}catch{}rascunho=null;}else guardar();
      publico.value=salvo.obs;antigo.hidden=!salvo.obs.trim();preview=null;confirmar.hidden=true;previa.hidden=true;conflito.hidden=true;usar.hidden=true;
      aviso.textContent=selecao?'Trecho separado. A preparação restante e as aprovações foram preservadas.':'Recado salvo. Conteúdo, aprovações e agendamentos preservados.';
      if(input.value!==(salvo.nota?.texto||''))aviso.textContent+=' Há texto novo no campo ainda não salvo.';
      if(selecao)separado(salvo);
    }catch(e){guardar();if(vivo)aviso.textContent=e.message;}finally{busy=false;if(vivo)botões();}
  }
  salvar.onclick=()=>gravar();confirmar.onclick=()=>gravar(preview);
  hist.ontoggle=async()=>{if(!hist.open)return;historicos.textContent='Carregando…';try{const rows=await repo.historico(alvo,c);if(!vivo)return;historicos.replaceChildren();for(const r of rows.slice(0,20)){const d=el('details',null,historicos);el('summary','Versão '+r.revisao+' · '+r.por,d);el('pre',r.texto||'(recado vazio)',d);}if(!rows.length)historicos.textContent='Sem versões anteriores.';}catch(e){if(vivo)historicos.textContent=e.message;}};
  carregar(true);
  return {fechar(){if(input.disabled===false&&input.value!==(foto?.nota?.texto||''))guardar();vivo=false;root.replaceChildren();},ocupado:()=>busy};
}
export function abrirDialogo(opcoes){
  const document=opcoes.document;estilos(document);const dialog=document.createElement('dialog');dialog.className='dialogo-recado-i96';dialog.setAttribute('aria-label','Recado interno da equipe');
  const fechar=document.createElement('button');fechar.type='button';fechar.textContent='Fechar';fechar.style.cssText='float:right;padding:10px;border-radius:8px;cursor:pointer';dialog.append(fechar);
  const root=document.createElement('section');dialog.append(root);document.body.append(dialog);const editor=montar({...opcoes,root});
  const sair=()=>{editor.fechar();dialog.close();dialog.remove();};fechar.onclick=sair;dialog.addEventListener('cancel',e=>{e.preventDefault();sair();});dialog.showModal();return {fechar:sair};
}
