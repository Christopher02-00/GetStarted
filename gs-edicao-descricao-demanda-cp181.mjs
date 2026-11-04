/* CP181: edit only the orientation of the same ordinary task. No delivery/calendar writer. */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=c=>JSON.stringify([c.uid,c.nome,c.atorReal,c.sessao,c.geracao]);
const author=c=>JSON.stringify([c.uid,c.nome,c.atorReal]);
const idOk=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(id);
const opOk=id=>/^desc181_[a-f0-9]{32}$/.test(id||'');
export function podeEditarDescricaoDemandaCp181(d,id=d?.id){return !!d&&idOk(id)&&!id.startsWith('entrada_')&&!id.startsWith('prov140_')&&!d.tipoEspecial&&!d.tipoFuncaoFixa&&!d.tipoPedidoCliente&&!d.agendaOrganizacaoI167&&!d.ehDecisao&&!d.ehAviso&&!d.origemAvisoColecao&&!d.origemDemandaCliente&&!d.conclusaoAutomaticaDocumentoCp179&&!d.excluido&&!d.arquivado&&d.status==='pendente'&&typeof d.titulo==='string'&&typeof d.descricao==='string'&&typeof d.destinatario==='string'&&(!Object.hasOwn(d,'historico')||Array.isArray(d.historico));}
export function criarEdicaoDescricaoDemandaCp181({documento=document,contexto,chamar,storage,visivel=()=>true,aoAtualizar=async()=>{},voltar=()=>{},idOperacao=()=> 'desc181_'+crypto.randomUUID().replaceAll('-','')}={}){
 let tela=null,geracao=0;
 function ctx(){const c=contexto();if(!c?.uid||!c.sessao||!Number.isSafeInteger(c.geracao)||!['Chris','Amanda'].includes(c.nome)||!['Chris','Amanda'].includes(c.atorReal))throw Error('Entre com o Google de Chris ou Amanda para editar esta orientação.');return {...c};}
 function vivo(t){try{return tela===t&&t.g===geracao&&key(ctx())===key(t.c)&&t.host.isConnected&&visivel();}catch{return false;}}
 const draftKey=(c,id)=>'get_descricao_cp181_'+author(c)+'_'+id;
 function ler(c,id){const p=JSON.parse(storage?.getItem(draftKey(c,id))||'null');if(!p)return null;if(p.schema!==1||p.autoria!==author(c)||p.id!==id||typeof p.texto!=='string'||p.tentativa&&(!opOk(p.tentativa.operacaoId)||p.tentativa.id!==id||p.tentativa.descricao!==p.texto))throw Error('A tentativa guardada precisa de conferência. Nada foi substituído.');return p;}
 function guardar(t){if(!storage)throw Error('Não consegui guardar seus campos neste navegador. Copie o texto antes de sair.');const anterior=ler(t.c,t.id);if(anterior?.tentativa&&anterior.tentativa.operacaoId!==t.tentativa?.operacaoId)throw Error('Outra tentativa já está guardada nesta demanda. Confira antes de substituir.');const p={schema:1,autoria:author(t.c),id:t.id,texto:t.texto,assinatura:t.base?.assinatura||'',tentativa:t.tentativa||null,incerta:!!t.incerta};storage.setItem(draftKey(t.c,t.id),JSON.stringify(p));if(storage.getItem(draftKey(t.c,t.id))!==JSON.stringify(p))throw Error('Não consegui reler o rascunho guardado.');}
 function limpar(t){const p=ler(t.c,t.id);if(p?.tentativa&&p.tentativa.operacaoId!==t.tentativa?.operacaoId)throw Error('Outra tentativa foi guardada. A confirmação não a removeu.');storage?.removeItem(draftKey(t.c,t.id));}
 function aviso(t,texto,erro=false){if(!vivo(t))return;const e=t.host.querySelector('[data-aviso]');e.textContent=texto;e.setAttribute('role',erro?'alert':'status');e.tabIndex=-1;e.focus?.({preventScroll:true});e.scrollIntoView?.({block:'center'});}
 function exibir(t){
  if(!vivo(t))return;const b=t.base,p=t.tentativa;
  t.host.innerHTML=`<h2>Editar descrição</h2><p><b>${esc(b?.titulo||'Demanda')}</b></p><p>Altere somente a orientação. A pessoa, o prazo, o estado e os vínculos continuam iguais.</p><p data-aviso role="status" style="white-space:pre-wrap"></p>${b?`${t.conflitoRascunho?`<div class="card"><b>Orientação atual no servidor</b><div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(b.descricao)}</div><button type="button" class="btn secondary" data-acao="reconcile">Conferi a versão atual; manter meu texto para nova edição</button></div>`:''}<label>Descrição completa<textarea data-texto maxlength="30000" rows="12" style="width:100%;white-space:pre-wrap">${esc(t.texto)}</textarea></label><div data-preview hidden><h3>Confira o texto completo antes de salvar</h3><div data-conteudo style="white-space:pre-wrap;overflow-wrap:anywhere"></div></div><div class="btnrow"><button type="button" class="btn secondary" data-acao="preview">Conferir texto</button><button type="button" class="btn" data-acao="save" disabled>Salvar descrição</button>${p?'<button type="button" class="btn secondary" data-acao="check">Conferir tentativa anterior</button>':''}<button type="button" class="btn secondary" data-acao="cancel">Cancelar edição</button></div>`:`<p>Conferindo a demanda no servidor…</p>${p?'<button type="button" class="btn secondary" data-acao="check">Conferir tentativa anterior</button>':''}<button type="button" class="btn secondary" data-acao="cancel">Cancelar</button>`}`;
  const area=t.host.querySelector('[data-texto]');if(area){area.disabled=!!p;area.addEventListener('input',()=>{if(!vivo(t)||t.busy||t.tentativa)return;t.texto=area.value;t.preview=null;t.host.querySelector('[data-preview]').hidden=true;t.host.querySelector('[data-acao="save"]').disabled=true;try{guardar(t);}catch(e){aviso(t,e.message,true);}});}
  for(const e of t.host.querySelectorAll('[data-acao]'))e.addEventListener('click',()=>{Promise.resolve(acao(t,e.dataset.acao)).catch(e=>aviso(t,e.message,true));});
  if(p){const preview=t.host.querySelector('[data-acao="preview"]'),save=t.host.querySelector('[data-acao="save"]');if(preview)preview.disabled=true;if(save)save.disabled=t.incerta||!t.reenvioPermitido;}
 }
 function validarResposta(t,r){if(r?.schema!==1||r.demanda&&r.demanda.id!==t.id)throw Error('A resposta não confirmou a mesma demanda.');return r;}
 function busy(t,b){t.busy=b;if(!vivo(t))return;for(const e of t.host.querySelectorAll('button,textarea'))e.disabled=b;if(!b){const p=t.tentativa;t.host.querySelector('[data-texto]')?.toggleAttribute('disabled',!!p);const save=t.host.querySelector('[data-acao="save"]');if(save)save.disabled=p?!!t.incerta||!t.reenvioPermitido:t.preview!==t.texto;const preview=t.host.querySelector('[data-acao="preview"]');if(preview)preview.disabled=!!p;}}
 async function confirmar(t,r){
  const rec=r.recibo,p=t.tentativa;
  if(r.estado!=='confirmada'||!p||rec?.schema!==1||rec.id!==t.id||rec.operacaoId!==p.operacaoId||rec.assinaturaAntes!==p.assinaturaEsperada||rec.descricaoDepois!==p.descricao||rec.autoria?.uid!==t.c.uid||rec.autoria?.atorReal!==t.c.atorReal||rec.autoria?.papel!==t.c.nome)throw Error('O recibo não confirmou este mesmo texto e autoria. Preserve a tentativa e confira.');
  limpar(t);t.confirmada=true;t.incerta=false;t.reenvioPermitido=false;await aoAtualizar(r.demanda,r);
  if(!vivo(t))return;
  t.host.innerHTML=`<h2>Descrição salva</h2><p data-aviso role="status">${r.fonteAvancou?'A edição foi confirmada, mas a demanda já recebeu outro avanço. Reabra a versão atual; nada foi sobrescrito.':'A orientação foi atualizada na mesma demanda. Os preparativos continuam com a pessoa responsável.'}</p><div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.demanda?.descricao||rec.descricaoDepois)}</div><button class="btn secondary" type="button" data-voltar>Voltar à demanda</button>`;
  t.host.querySelector('[data-voltar]').onclick=()=>{if(vivo(t)){++geracao;tela=null;voltar(t.id);}};
 }
 async function acao(t,a){
  if(!vivo(t)||t.busy)return;
  if(a==='cancel'){if(t.tentativa){guardar(t);++geracao;tela=null;voltar(t.id);return;}limpar(t);++geracao;tela=null;voltar(t.id);return;}
  if(a==='reconcile'){t.conflitoRascunho=false;t.preview=null;guardar(t);exibir(t);aviso(t,'Seu texto foi mantido. Confira a prévia completa antes de salvar sobre esta versão atual.');return;}
  if(a==='preview'){if(t.conflitoRascunho){aviso(t,'Confira primeiro a orientação atual no servidor e escolha explicitamente manter seu texto.',true);return;}t.texto=t.host.querySelector('[data-texto]').value;if(!t.texto.trim()||t.texto.length>30000){aviso(t,'Escreva a orientação completa em até 30 mil caracteres.',true);return;}if(t.texto===t.base.descricao){aviso(t,'O texto continua igual. Nenhuma edição foi enviada.');return;}t.preview=t.texto;t.host.querySelector('[data-conteudo]').textContent=t.texto;t.host.querySelector('[data-preview]').hidden=false;t.host.querySelector('[data-acao="save"]').disabled=false;return;}
  if(a==='save'){
   if(!t.tentativa){if(t.conflitoRascunho||t.preview!==t.texto)return;t.tentativa={id:t.id,operacaoId:idOperacao(),assinaturaEsperada:t.base.assinatura,descricao:t.texto};if(!opOk(t.tentativa.operacaoId))throw Error('Identificador de tentativa inválido.');}
   else if(t.incerta||!t.reenvioPermitido)return;
   t.incerta=true;t.reenvioPermitido=false;try{guardar(t);}catch(e){aviso(t,e.message,true);return;}
  }else if(a!=='check'||!t.tentativa)return;
  busy(t,true);aviso(t,a==='check'?'Conferindo a mesma tentativa, sem reenviar…':'Salvando a descrição na mesma demanda…');
  try{
   const r=validarResposta(t,await chamar(a==='check'?'conferir_descricao_demanda_cp181':'salvar_descricao_demanda_cp181',t.tentativa));if(!vivo(t))return;
   if(r.estado==='confirmada'){await confirmar(t,r);return;}
   if(a==='check'&&r.estado==='ausente_no_instante'){
    if(!t.base){t.base=r.demanda;exibir(t);}
    t.incerta=false;t.reenvioPermitido=r.mesmaBase===true;guardar(t);aviso(t,r.mesmaBase?'Nenhuma confirmação foi encontrada agora. Se desejar, Salvar descrição retoma esta mesma tentativa; não há reenvio automático.':'A demanda mudou. Sua orientação está guardada, mas não será sobrescrita. Copie seu texto e reabra a versão atual.',!r.mesmaBase);
   }else throw Error('A operação precisa de conferência. Preserve esta tentativa.');
  }catch(e){if(vivo(t)){t.incerta=true;try{guardar(t);}catch{}exibir(t);aviso(t,(e.message||'Resposta não confirmada.')+' Use Conferir tentativa anterior antes de repetir.',true);}}
  finally{if(vivo(t))busy(t,false);}
 }
 async function abrir({id,host}){
  if(!idOk(id)||!host?.isConnected)throw Error('Abra a mesma ficha antes de editar.');
  const c=ctx(),p=ler(c,id),t={id,host,c,g:++geracao,base:null,texto:p?.texto||'',tentativa:p?.tentativa||null,incerta:!!p?.tentativa,reenvioPermitido:false,busy:false,preview:null};tela=t;exibir(t);
  try{if(t.tentativa){await acao(t,'check');return vivo(t);}
   const r=validarResposta(t,await chamar('preparar_descricao_demanda_cp181',{id}));if(!vivo(t))return false;if(r.estado!=='preparada'||r.demanda?.editavel!==true)throw Error('A demanda mudou de situação ou possui fluxo próprio.');t.base=r.demanda;t.conflitoRascunho=!!p&&p.assinatura!==r.demanda.assinatura;if(!p)t.texto=r.demanda.descricao;exibir(t);if(p)aviso(t,p.tentativa?'Uma tentativa anterior está guardada. Confira o envio antes de continuar.':p.assinatura!==r.demanda.assinatura?'A demanda mudou desde seu rascunho. Seu texto foi preservado; confira a orientação atual antes de editar.':'Seu rascunho foi retomado, ainda sem salvar.',p.assinatura!==r.demanda.assinatura);return true;}
  catch(e){if(vivo(t)){exibir(t);aviso(t,e.message,true);}return false;}
 }
 return Object.freeze({abrir,canLeave:()=>!tela||!vivo(tela)||!tela.busy,destroy:()=>{++geracao;tela=null;}});
}
