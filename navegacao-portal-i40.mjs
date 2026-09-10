/* I40: navegar preserva a área; recarregar é uma ação explícita. */
export function criarNavegacaoPortalI40({document:dom=globalThis.document,cliente,carregadores,lazy,sempreConferir=[],onErro=()=>{}}){
  const paineis={calendario:'Calendario',acompanhamento:'Acompanhamento',demandas:'Demandas',programados:'Programados',drive:'Drive',videos:'Videos',minhaAgenda:'MinhaAgenda',ideias:'Ideias',stories:'Stories',atas:'Atas',info:'Info',briefing:'Briefing',referencias:'Referencias',proposta:'Proposta',pagamento:'Pagamento',avaliacao:'Avaliacao'};
  const estados=new Map();let clienteDoEstado='',atual='',controle,botao,status;
  function painel(n){return dom.getElementById('painel'+paineis[n]);}
  function sujo(p){
    const quadro=p.querySelector('#quadroCalendario');
    if(quadro){
      try{const pagina=quadro.contentDocument;if(!pagina)return true;
        if(['mObsCliente','textoObservacaoClienteI35','fbText'].some(id=>{const e=pagina.getElementById(id);return e&&e.getClientRects().length>0&&String(e.value||'').trim();}))return true;
      }catch{return true;}
    }
    return [...p.querySelectorAll('input,textarea,select')].some(e=>e.type==='checkbox'||e.type==='radio'?e.checked!==e.defaultChecked:e.tagName==='SELECT'?e.selectedIndex!==Math.max(0,[...e.options].findIndex(o=>o.defaultSelected)):String(e.value??'')!==String(e.defaultValue??''))||!!p.querySelector('[data-edicao-estrelas-i40]');}
  function montarControle(){
    if(controle?.isConnected)return;
    controle=dom.createElement('div');controle.id='controleAtualizacaoPortalI40';controle.style.cssText='display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:12px 0;';
    botao=dom.createElement('button');botao.type='button';botao.className='btn secondary';botao.textContent='Atualizar esta área';botao.style.width='auto';
    status=dom.createElement('span');status.className='meta';status.setAttribute('role','status');controle.append(botao,status);const primeiro=painel('calendario');primeiro?.parentElement?.insertBefore(controle,primeiro);
    botao.addEventListener('click',()=>atualizar());
    dom.getElementById('painelAvaliacao')?.addEventListener('click',e=>{const estrelas=e.target?.closest?.('#estrelasAvaliacaoPortal');if(estrelas)estrelas.setAttribute('data-edicao-estrelas-i40','1');});
  }
  async function carregar(nome,forcar=false){
    const slug=cliente()?.slug||'',p=painel(nome),load=carregadores[nome];if(!slug||!p||!load)return false;
    if(slug!==clienteDoEstado){estados.clear();clienteDoEstado=slug;}
    const existente=estados.get(nome);if(existente?.pendente)return existente.pendente;
    if(existente?.carregado&&!forcar)return true;
    if(forcar&&sujo(p)){status.textContent='Há uma edição nesta área. Conclua o envio ou revise o que digitou antes de atualizar.';return false;}
    const estado={carregado:false};estados.set(nome,estado);
    if(atual===nome){botao.disabled=true;status.textContent='Atualizando esta área…';}
    estado.pendente=(async()=>{try{const resultado=await load();if((cliente()?.slug||'')!==slug)return false;estado.carregado=resultado!==false;if(atual===nome)status.textContent=resultado===false?'Não foi possível atualizar. Confira o aviso nesta área.':'';return resultado!==false;}catch(e){if((cliente()?.slug||'')!==slug)return false;if(atual===nome)status.textContent='Não foi possível atualizar. Tente novamente; isso não significa que seus dados foram apagados.';await onErro(e,nome);return false;}finally{estado.pendente=null;if(atual===nome)botao.disabled=false;}})();
    return estado.pendente;
  }
  async function atualizar(){return carregar(atual,true);}
  function setTab(nome,el){
    if(!Object.hasOwn(paineis,nome))return false;
    const tab=el||dom.querySelector('[data-tab="'+nome+'"]'),p=painel(nome);
    if(!tab||!p||tab.style.display==='none')return false;
    montarControle();const anterior=atual;atual=nome;
    dom.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');
    if(tab.closest?.('#menuMais'))dom.getElementById('tabMais')?.classList.add('active');
    for(const n of Object.keys(paineis)){const e=painel(n);if(e)e.style.display=n===nome?'block':'none';}
    if(anterior!==nome)status.textContent='';botao.disabled=!!estados.get(nome)?.pendente;
    botao.hidden=false;botao.textContent=nome==='calendario'?'Atualizar calendário':'Atualizar esta área';
    if(!el||sempreConferir.includes(nome))void carregar(nome,true);else if(lazy.includes(nome))void carregar(nome);
    return true;
  }
  return {setTab,atualizar,carregar};
}
