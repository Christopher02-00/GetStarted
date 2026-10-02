// Direção de Filmagem: fonte privada, sem writers de agenda, vídeo ou portal.
export const INICIO_ROTINA = '2026-09-28';
const COL='direcao_filmagem', PAPEIS=['Luís','Chris','Amanda'];
export const permitido = p => PAPEIS.includes(p);
export const gestao = p => ['Chris','Amanda'].includes(p);
const copy=x=>JSON.parse(JSON.stringify(x));
export function estavel(x){return JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
export function hojeBRT(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function diaValido(d){return /^20\d{2}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;}
export function somarDias(d,n){if(!diaValido(d))throw Error('Confira a data.');const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);}
export function segunda(d){if(!diaValido(d))throw Error('Confira a semana.');return somarDias(d,-((new Date(d+'T12:00:00Z').getUTCDay()+6)%7));}
export const diasGet=d=>[0,2,4].map(n=>somarDias(segunda(d),n)).filter(x=>x>=INICIO_ROTINA);
const br=d=>diaValido(d)?d.split('-').reverse().join('/'):'A combinar';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function linkSeguro(v){try{const u=new URL(String(v).trim());return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
const link=(v,label='Abrir link ↗')=>linkSeguro(v)?`<a href="${esc(linkSeguro(v))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'';
const texto=(v,max,label)=>{v=String(v??'').trim();if(v.length>max)throw Error(label+' está muito longo.');return v;};
function links(v){const lines=texto(v,12000,'As referências').split('\n').map(x=>x.trim()).filter(Boolean);if(lines.length>30||lines.some(x=>!linkSeguro(x)))throw Error('Use até 30 links https completos, um por linha.');return lines.join('\n');}
export function validar(id,d){
  if(!/^(p_|e_|g_|r_(p_|e_|g_))[A-Za-z0-9._:-]{1,180}$/.test(id))throw Error('Registro inválido. Reabra a área.');
  let n;
  if(id.startsWith('r_')){n={estado:d.estado,texto:texto(d.texto,5000,'O retorno'),versao:Number(d.versao)};if(!['ciente','ajustar'].includes(n.estado)||!Number.isInteger(n.versao)||n.versao<1||n.estado==='ajustar'&&!n.texto)throw Error('Escreva o que precisa ser ajustado.');}
  else if(id.startsWith('p_')){n={texto:texto(d.texto,20000,'O planejamento'),referencias:links(d.referencias),necessidades:texto(d.necessidades,5000,'A preparação')};if(!n.texto)throw Error('Descreva o que pretende fazer nesta gravação.');}
  else if(id.startsWith('e_')){
    n={texto:texto(d.texto,15000,'O resumo'),diferente:texto(d.diferente,8000,'As mudanças'),referencias:links(d.referencias),arquivos:!!d.arquivos,estado:d.estado,extras:[]};
    if(!['em_andamento','entregue'].includes(n.estado))throw Error('Confira a situação da entrega.');
    if(!Array.isArray(d.extras)||d.extras.length>30)throw Error('Use até 30 materiais extras por conferência.');
    n.extras=d.extras.map(x=>({id:texto(x.id,80,'O identificador'),titulo:texto(x.titulo,200,'O título'),formato:x.formato,url:texto(x.url,2000,'O link'),referencia:texto(x.referencia,2000,'A referência')}));
    if(n.extras.some(x=>!x.id||!x.titulo||!['video','carrossel','foto','story','outro'].includes(x.formato)||(x.url&&!linkSeguro(x.url))||(x.referencia&&!linkSeguro(x.referencia)))||new Set(n.extras.map(x=>x.id)).size!==n.extras.length)throw Error('Confira título, formato e links https dos materiais extras.');
    if(!n.texto)throw Error('Conte brevemente o que foi realizado.');
    if(n.estado==='entregue'&&(!n.arquivos||(!n.referencias&&!n.extras.some(x=>x.url))||n.extras.some(x=>!x.url)))throw Error('Para concluir a conferência, confirme os arquivos e informe os links dos materiais, inclusive os extras.');
  }else{
    if(!diaValido(id.slice(2))||!diasGet(id.slice(2)).includes(id.slice(2)))throw Error('A rotina Get usa segunda, quarta e sexta, a partir de 28/09/2026.');
    n={titulo:texto(d.titulo,200,'O título'),formato:d.formato,texto:texto(d.texto,12000,'A ideia'),referencias:links(d.referencias),url:texto(d.url,2000,'O material'),estado:d.estado};
    if(!n.titulo||!['video','carrossel'].includes(n.formato)||!['planejado','em_producao','entregue'].includes(n.estado)||(n.url&&!linkSeguro(n.url))||(n.estado==='entregue'&&!n.url))throw Error('Informe título, formato e situação. Uma entrega precisa do link do material.');
  }
  return n;
}
// I113: o aviso é uma leitura da revisão salva, nunca outra demanda.
export function planosSemConferencia(rows){
  const byId=new Map(rows.map(r=>[r.id,r]));
  return rows.filter(r=>r.id.startsWith('p_')&&String(r.data?.texto||'').trim()).filter(r=>{
    const v=byId.get('r_'+r.id)?.data;
    return !(v?.versao===r.revisao&&['ciente','ajustar'].includes(v.estado));
  });
}
export function avisosPlanejamento(rows,agendas){
  const byId=new Map(agendas.map(a=>[a.id,a]));
  return planosSemConferencia(rows).map(r=>({...r,agenda:byId.get(r.id.slice(2))||null}))
    .filter(r=>!r.agenda?.excluido&&r.agenda?.status!=='cancelado')
    .sort((a,b)=>String(b.atualizadoEm?.seconds||'').localeCompare(String(a.atualizadoEm?.seconds||''),undefined,{numeric:true})||a.id.localeCompare(b.id));
}
export function criarRepositorio(s,contexto){
  const {db,doc,collection,query,where,documentId,onSnapshot,runTransaction,serverTimestamp,getDocFromServer,getDocsFromServer}=s;
  const ref=id=>doc(db,COL,id),hist=(id,op)=>doc(db,COL,id,'historico',op);
  const guard=()=>{const c=contexto();if(!c.uid||!permitido(c.nome))throw Error('A direção é exclusiva de Luís, Chris e Amanda.');return {...c};};
  const current=c=>{const n=guard();if(n.sessao!==c.sessao||n.nome!==c.nome||n.uid!==c.uid)throw Error('O perfil mudou. Reabra esta área.');};
  const read=async id=>{const c=guard(),r=await getDocFromServer(ref(id));current(c);return r.exists()?{id:r.id,...r.data()}:null;};
  return {
    read,
    async readMany(ids){const c=guard(),out=[];for(let i=0;i<ids.length;i+=30){const snap=await getDocsFromServer(query(collection(db,COL),where(documentId(),'in',ids.slice(i,i+30))));current(c);out.push(...snap.docs.map(d=>({id:d.id,...d.data()})));}return out;},
    async historico(id){const c=guard(),r=await getDocsFromServer(collection(db,COL,id,'historico'));current(c);return r.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.revisao-a.revisao);},
    watch(meses,ok,fail){const c=guard(),periodos=[...new Set(meses)],grupos=[];for(let i=0;i<periodos.length;i+=10)grupos.push(periodos.slice(i,i+10));const rows=new Map();
      const offs=grupos.map((values,i)=>onSnapshot(query(collection(db,COL),where('periodo','in',values)),{includeMetadataChanges:true},snap=>{try{current(c);if(snap.metadata.fromCache){ok(null,{cache:true});return;}rows.set(i,snap.docs.map(d=>({id:d.id,...d.data()})));if(rows.size===grupos.length)ok([...rows.values()].flat(),{cache:false});}catch{}},e=>{try{current(c);fail(e);}catch{}}));return()=>offs.forEach(f=>f());},
    watchPlanejamentos(ok,fail){
      const c=guard();if(c.nome!=='Amanda')throw Error('Este aviso é da Amanda.');
      let ativo=true,geracao=0,chave=null,offsAgenda=[],rows=new Map(),agendas=new Map(),confirmados=new Set(),agendaPronta=new Set(),grupos=0;
      const valido=()=>{if(!ativo)return false;try{current(c);return true;}catch{return false;}};
      const erro=e=>{if(valido())fail(e);};
      const emitir=()=>{if(!valido())return;if(confirmados.size!==2||agendaPronta.size!==grupos){ok(null,{cache:true});return;}ok(avisosPlanejamento([...rows.values()].flat(),[...agendas.values()].flat()),{cache:false});};
      const atualizarAgenda=()=>{
        const ids=[...new Set(planosSemConferencia([...rows.values()].flat()).map(r=>r.id.slice(2)))].sort(),next=ids.join('|');
        if(chave===next){emitir();return;}chave=next;const n=++geracao;offsAgenda.forEach(f=>f());offsAgenda=[];agendas.clear();agendaPronta.clear();grupos=Math.ceil(ids.length/30);
        if(!grupos){emitir();return;}ok(null,{cache:true});
        for(let i=0;i<ids.length;i+=30){const part=i/30;offsAgenda.push(onSnapshot(query(collection(db,'agendamentos'),where(documentId(),'in',ids.slice(i,i+30))),{includeMetadataChanges:true},snap=>{
          if(!valido()||n!==geracao)return;if(snap.metadata.fromCache){agendaPronta.delete(part);emitir();return;}
          agendas.set(part,snap.docs.map(d=>({...d.data(),id:d.id})));agendaPronta.add(part);emitir();
        },e=>{if(n===geracao){agendaPronta.delete(part);erro(e);}}));}
      };
      const offs=['p_','r_p_'].map(prefix=>onSnapshot(query(collection(db,COL),where(documentId(),'>=',prefix),where(documentId(),'<',prefix+'\uf8ff')),{includeMetadataChanges:true},snap=>{
        if(!valido())return;if(snap.metadata.fromCache){confirmados.delete(prefix);emitir();return;}
        rows.set(prefix,snap.docs.map(d=>({...d.data(),id:d.id})));confirmados.add(prefix);if(confirmados.size===2)atualizarAgenda();else emitir();
      },e=>{confirmados.delete(prefix);erro(e);}));
      return()=>{ativo=false;++geracao;offs.forEach(f=>f());offsAgenda.forEach(f=>f());};
    },
    async save(id,data,periodo,revisao){
      const c=guard(),retorno=id.startsWith('r_');
      if(retorno?!gestao(c.nome):c.nome!=='Luís')throw Error(retorno?'A conferência pertence a Chris e Amanda.':'O planejamento e a entrega são registrados pelo Luís.');
      if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(periodo))throw Error('Período inválido.');
      const normal=validar(id,data),op=crypto.randomUUID(),h=hist(id,op);let result;
      try{
        await runTransaction(db,async tx=>{
          current(c);const old=await tx.get(ref(id)),v=old.exists()?old.data():null;
          if((v?.revisao||0)!==revisao)throw Object.assign(Error('Este registro mudou. Seu rascunho está preservado. Confira a versão atual antes de reenviar.'),{code:'conflito'});
          if(retorno){const target=await tx.get(ref(id.slice(2)));if(!target.exists()||target.data().revisao!==normal.versao)throw Object.assign(Error('Luís atualizou este conteúdo. Abra a versão atual antes de conferir.'),{code:'conflito'});}
          if(v&&estavel(v.data)===estavel(normal)){result={id,...v,semAlteracao:true};return;}
          const value={data:normal,periodo,revisao:revisao+1,operacao:op,autorUid:c.uid,autorNome:c.nome,atualizadoEm:serverTimestamp()};
          tx.set(ref(id),value);tx.set(h,value);result={id,...value};
        });
        current(c);const confirmed=await read(id);
        if(result.semAlteracao)return confirmed;
        if(confirmed?.operacao===op)return confirmed;
        const event=await getDocFromServer(h);current(c);
        if(event.exists())return {id,...event.data()};
        throw Error('Não foi possível confirmar a gravação. Mantenha o rascunho e confira novamente.');
      }catch(e){
        current(c);
        if(e.code==='conflito')throw e;
        try{const event=await getDocFromServer(h);current(c);if(event.exists())return {id,...event.data()};}catch{}
        throw e;
      }
    }
  };
}

const CSS=`
.dir101{--d-gold:#ffca28;--d-line:#45474b;--d-soft:#acb0b8;--d-bg:#25272b;color:#f3f3f4;margin:18px 0;font-size:14px;line-height:1.5}.dir101 *{box-sizing:border-box}.dir101 .d-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.dir101 .d-kicker{font-size:11px;font-weight:800;letter-spacing:1.6px;color:var(--d-gold);text-transform:uppercase}.dir101 h2{font-size:24px;line-height:1.2;margin:6px 0}.dir101 h3{font-size:17px;margin:0 0 8px}.dir101 p{margin:6px 0}.dir101 .d-muted{color:var(--d-soft);font-size:13px}.dir101 .d-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.dir101 .d-card{min-width:0;padding:18px;border:1px solid var(--d-line);border-radius:16px;background:var(--d-bg);margin-bottom:14px}.dir101 .d-card.gold{border-color:#887333;background:linear-gradient(140deg,#373023,#25272b 85%)}.dir101 .d-card.green{border-color:#45846b}.dir101 .d-card.red{border-color:#b87570}.dir101 .d-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px}.dir101 .d-between{justify-content:space-between}.dir101 .d-pill{display:inline-flex;border:1px solid #65666d;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;white-space:normal}.dir101 .d-pill.gold{color:#ffda67;border-color:#806b32}.dir101 .d-pill.green{color:#97dfb6;border-color:#477c5b}.dir101 .d-pill.red{color:#ffb0a9;border-color:#a16964}.dir101 .d-number{font-size:25px;font-weight:800}.dir101 .d-progress{height:5px;border-radius:4px;background:#414145;margin:12px 0;overflow:hidden}.dir101 .d-progress span{height:100%;display:block;background:var(--d-gold)}.dir101 .d-btn{border:1px solid #585b63;background:#33353a;color:#fff;border-radius:10px;padding:10px 14px;min-height:42px;cursor:pointer;font-size:13px;font-weight:700;white-space:normal}.dir101 .d-btn.primary{background:var(--d-gold);border-color:var(--d-gold);color:#24221a}.dir101 .d-btn:disabled{opacity:.5;cursor:wait}.dir101 .d-btn:focus-visible,.dir101 input:focus-visible,.dir101 textarea:focus-visible,.dir101 select:focus-visible{outline:2px solid var(--d-gold);outline-offset:3px}.dir101 a{color:#ffe39c;overflow-wrap:anywhere}.dir101 label{display:block;font-size:13px;font-weight:700;margin-bottom:6px}.dir101 input:not([type=checkbox]),.dir101 textarea,.dir101 select{width:100%;border:1px solid #5a5c63;border-radius:10px;background:#202226;color:#fff;padding:11px 12px;font:inherit}.dir101 textarea{min-height:120px;resize:vertical}.dir101 input[type=checkbox]{width:18px;height:18px;accent-color:var(--d-gold)}.dir101 .d-field{margin-bottom:16px}.dir101 .d-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.dir101 .d-fields .d-field{margin-bottom:0}.dir101 .d-list{display:grid;grid-template-columns:1fr 1fr;gap:14px}.dir101 .d-week{border-top:1px solid var(--d-line);padding-top:18px;margin-top:16px}.dir101 .d-empty{padding:16px;border:1px dashed #55585d;border-radius:12px;color:var(--d-soft)}.dir101 .d-status{white-space:pre-wrap;margin:10px 0;overflow-wrap:anywhere}.dir101 .d-status.error{color:#ffb4a9}.dir101 .d-preserve{white-space:pre-wrap;overflow-wrap:anywhere}.dir101 details{border:1px solid #44474c;border-radius:10px;padding:12px;margin-top:12px}.dir101 summary{cursor:pointer;font-weight:700}.dir101 .d-extras{border-left:3px solid #ffca28;padding:14px;background:#202226;border-radius:10px;margin:12px 0}.dir101 .d-preview{max-height:130px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}.dir101 .d-toolbar{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin:14px 0}.dir101 .d-toolbar label{margin:0}.dir101 .d-toolbar input{max-width:190px}.dir101 .d-editor{scroll-margin-top:24px}.dir101 .d-plan-title{border-left:3px solid #ffca28;padding-left:14px;margin-bottom:18px}.dir101 .d-save{position:sticky;bottom:6px;padding:12px;background:#27292ef2;border:1px solid #50525b;border-radius:12px;margin-top:18px;z-index:2}.dir101 .d-check{display:flex;align-items:flex-start;gap:10px;font-weight:500}.dir101 [hidden]{display:none!important}@media(max-width:760px){.dir101 .d-grid,.dir101 .d-list,.dir101 .d-fields{grid-template-columns:1fr}.dir101 .d-head{align-items:flex-start;flex-direction:column}.dir101 h2{font-size:22px}.dir101 .d-card{padding:15px}.dir101 .d-toolbar{align-items:stretch}.dir101 .d-btn{min-height:44px}.dir101 .d-save .d-row{align-items:stretch;flex-direction:column}}
`;

export function montarAvisosPlanejamento(root,{repo,abrir,aoContar,avisar}){
  let ativo=true,off=null,rows=[],erro='',cache=true,primeiro=true,ultimas=new Set();
  root.classList.add('dir101');
  function render(){
    if(!ativo)return;aoContar?.(rows.length,{cache,erro:!!erro});
    root.innerHTML=`<style>${CSS}</style><section class="d-card gold" aria-label="Avisos de planejamento"><div class="d-row d-between"><div><span class="d-kicker">Luís → Amanda</span><h2>Planejamentos para conferir${rows.length?' · '+rows.length:''}</h2></div><button class="d-btn" data-atualizar>Ainda falta algo? Atualizar</button></div>
      <p class="d-muted">Confira ou peça uma alteração. Se Luís atualizar o plano, ele aparece aqui novamente.</p>
      ${erro?'<p class="d-status error" role="status">Não foi possível atualizar os avisos. A última lista foi mantida; tente atualizar.</p>':cache?'<p class="d-muted" role="status">Conferindo os avisos com o servidor…</p>':''}
      ${!rows.length&&!cache&&!erro?'<p class="d-empty">Todos os planejamentos compartilhados estão conferidos.</p>':''}
      <div class="d-list">${rows.map(r=>`<article class="d-card" data-plano="${esc(r.id)}"><div class="d-row d-between"><h3>${esc(r.agenda?.clienteNome||r.agenda?.cliente||'Sessão não localizada')}</h3><span class="d-pill gold">${r.revisao>1?'Planejamento atualizado':'Planejamento recebido'}</span></div><p class="d-muted">Gravação · ${br(r.agenda?.data)}${r.agenda?.hora?' · '+esc(r.agenda.hora):''}</p>${r.agenda?`<button class="d-btn primary" data-conferir="${esc(r.id)}">Conferir planejamento</button>`:'<p class="d-status error">A agenda deste plano precisa ser conferida. O planejamento continua salvo.</p>'}</article>`).join('')}</div></section>`;
  }
  function iniciar(){off?.();erro='';cache=true;render();off=repo.watchPlanejamentos((data,meta)=>{
    if(!ativo)return;cache=meta.cache;
    if(data){rows=data;erro='';const next=new Set(rows.map(r=>r.id+':'+r.revisao));if(!primeiro&&[...next].some(k=>!ultimas.has(k)))avisar?.('Luís compartilhou um planejamento. Confira em Direção de Filmagem.');ultimas=next;primeiro=false;}render();
  },()=>{if(ativo){erro='erro';cache=false;render();}});}
  const click=e=>{const b=e.target.closest('button');if(b?.dataset.conferir)abrir(b.dataset.conferir);else if(b?.hasAttribute('data-atualizar'))iniciar();};
  root.addEventListener('click',click);iniciar();
  return {destroy(){ativo=false;off?.();root.removeEventListener('click',click);root.replaceChildren();root.classList.remove('dir101');}};
}

export function montarDirecao(root,{repo,contexto,sessoes,materiais,abrirEnvio,abrirPautas,compacto=false,abrirArea,abrirRotina,abrirDemandas,registroInicial='',agora=()=>new Date()}){
  const ctx={...contexto()};if(!permitido(ctx.nome))return {destroy(){}};
  let vivo=true,seq=0,off=[],agenda=[],registros=new Map(),selecionado=null,salvando=false,semana=segunda(hojeBRT(agora())),mes=hojeBRT(agora()).slice(0,7),erro='',ready=false,cache=false,filtroSessoes='ativas',alvoInicial=registroInicial;
  const manager=gestao(ctx.nome),valido=()=>vivo&&contexto().sessao===ctx.sessao&&contexto().uid===ctx.uid&&contexto().nome===ctx.nome;
  const key=id=>'get:i101:'+ctx.uid+':'+ctx.nome+':'+id;
  const draft={get(id){try{return JSON.parse(localStorage.getItem(key(id))||'null');}catch{return null;}},set(id,v){try{localStorage.setItem(key(id),JSON.stringify(v));return true;}catch{return false;}},del(id){try{localStorage.removeItem(key(id));}catch{}}};
  root.classList.add('dir101');root.innerHTML=`<style>${CSS}</style><div data-dashboard></div><div class="d-editor" data-editor></div>`;
  const dash=root.querySelector('[data-dashboard]'),editor=root.querySelector('[data-editor]');
  const btn=(text,action,primary=false,attrs='')=>`<button type="button" class="d-btn ${primary?'primary':''}" data-action="${action}" ${action==='open'&&!ready?'disabled':''} ${attrs}>${text}</button>`;
  const pill=(text,cls='')=>`<span class="d-pill ${cls}">${esc(text)}</span>`;
  const retorno=r=>{const v=registros.get('r_'+r?.id);return v?.data?.versao===r?.revisao?v:null;};
  function etiqueta(r,defaultText='Ainda não preparado'){
    if(!r)return pill(defaultText);
    const v=retorno(r);if(v)return pill(v.data.estado==='ajustar'?'Alteração solicitada':'Conferido pela gestão',v.data.estado==='ajustar'?'red':'green');
    return pill(manager?'Novo para conferir':'Compartilhado com a gestão','gold');
  }
  const sessaoPeriodo=a=>(/^20\d{2}-\d{2}$/.test(a.mesCalendario||'')?a.mesCalendario:diaValido(a.data)?a.data.slice(0,7):mes);
  const noMes=a=>diaValido(a.data)?a.data.startsWith(mes):sessaoPeriodo(a)===mes;
  const periodosLigados=()=>[...registros.values()].filter(r=>!r.id.startsWith('g_')&&!r.id.startsWith('r_')&&agenda.some(a=>noMes(a)&&a.id===r.id.slice(2))).map(r=>r.periodo);
  function dashboard(){
    if(!valido())return;
    const slots=diasGet(semana),done=slots.filter(d=>registros.get('g_'+d)?.data.estado==='entregue').length;
    const todasSessoes=agenda.filter(a=>noMes(a)&&(!a.excluido||registros.has('p_'+a.id)||registros.has('e_'+a.id))).sort((a,b)=>String(a.data+' '+(a.hora||'')).localeCompare(String(b.data+' '+(b.hora||''))));
    const futuros=todasSessoes.filter(a=>!a.excluido&&a.status==='agendado'&&a.data>=hojeBRT(agora()));
    const fechar=todasSessoes.filter(a=>!a.excluido&&a.status!=='cancelado'&&a.data>=INICIO_ROTINA&&(a.status==='realizado'||a.data<hojeBRT(agora()))&&registros.get('e_'+a.id)?.data.estado!=='entregue');
    const sessoesVisiveis=filtroSessoes==='todas'?todasSessoes:filtroSessoes==='fechar'?fechar:todasSessoes.filter(a=>futuros.includes(a)||fechar.includes(a));
    const novidades=[...registros.values()].filter(r=>!r.id.startsWith('r_')&&(!retorno(r)||retorno(r).data.estado==='ajustar'));
    const ajustes=novidades.filter(r=>retorno(r)?.data.estado==='ajustar');
    const conferidosGet=slots.filter(d=>{const r=registros.get('g_'+d);return r?.data.estado==='entregue'&&retorno(r)?.data.estado==='ciente';}).length;
    const sessionCard=a=>{
      const p=registros.get('p_'+a.id),e=registros.get('e_'+a.id);
      return `<article class="d-card"><div class="d-row d-between"><h3>${esc(a.clienteNome||a.cliente||'Gravação')}</h3>${pill(a.excluido?'Arquivada':a.status==='cancelado'?'Cancelada':a.status==='realizado'?'Gravação registrada':'Na agenda')}</div><p>${br(a.data)} · ${esc(a.hora||'A combinar')}</p><p class="d-muted">Pauta: ${esc(sessaoPeriodo(a).split('-').reverse().join('/'))} · ${esc(a.local||'Local a confirmar')}</p><div class="d-row" style="margin:12px 0"><div><strong>1 · Preparação</strong><br>${etiqueta(p)}</div><div><strong>2 · Entrega e extras</strong><br>${e?pill(e.data.estado==='entregue'?'Entrega apresentada':'Em andamento',e.data.estado==='entregue'?'green':'gold'):pill('Ainda não apresentada')}</div><div><strong>3 · Conferência da entrega</strong><br>${etiqueta(e,'Aguardar apresentação')}</div></div><div class="d-row">${btn(manager?'Ver planejamento':'Preparar gravação','open',true,`data-id="p_${esc(a.id)}"`)}${btn(manager?'Ver entrega':'Conferir entrega','open',false,`data-id="e_${esc(a.id)}"`)}</div></article>`;
    };
    dash.innerHTML=`<div class="d-head"><div><div class="d-kicker">${manager?'Acompanhamento da direção':'Seu espaço de direção'}</div><h2>${manager?'Direção de Filmagem · Luís':'Luís · Diretor de Filmagem'}</h2><p class="d-muted">Preparação, entrega e conferência — cada etapa no seu lugar.</p></div><div class="d-row">${compacto?btn('Abrir direção','area'):''}${btn('Atualizar','refresh')}</div></div>
      <div class="d-row" style="margin-bottom:16px">${abrirRotina?btn(manager?'Conferir checklist de filmmaker':'Meu checklist de filmmaker','rotina'):''}${abrirDemandas?btn(manager?'Demandas da equipe':'Minhas demandas pontuais','demandas'):''}</div>
      ${ready&&ajustes.length?`<section class="d-card red" aria-label="Ajustes solicitados"><h3>Retornos para resolver · ${ajustes.length}</h3>${ajustes.map(r=>`<div class="d-row d-between" style="padding:10px 0"><div><strong>${esc(tituloRegistro(r.id))}</strong><p class="d-muted d-preserve">${esc(retorno(r).data.texto)}</p></div>${btn(manager?'Ver retorno':'Resolver ajuste','open',true,`data-id="${esc(r.id)}"`)}</div>`).join('')}</section>`:''}
      <div class="d-toolbar"><label>Mês das gravações<input type="month" data-mes value="${esc(mes)}"></label><label>Semana Get<input type="date" data-semana value="${semana}"></label>${btn('← Semana','prev')}${btn('Semana →','next')}</div>
      ${erro?`<div class="d-card red" role="alert">${esc(erro)} ${btn('Tentar novamente','refresh')}</div>`:''}
      ${!ready?'<p role="status" class="d-empty">Conferindo agenda e registros no servidor…</p>':''}${cache?'<p class="d-muted" role="status">Aguardando conexão. Os dados anteriores continuam na tela.</p>':''}
      ${ready?`<div class="d-grid"><div class="d-card gold"><span class="d-kicker">Próximas gravações</span><div class="d-number">${futuros.length}</div><p class="d-muted">No mês selecionado</p></div><div class="d-card"><span class="d-kicker">Gravações para fechar</span><div class="d-number">${fechar.length}</div><p class="d-muted">Entrega ainda não apresentada</p></div><div class="d-card"><span class="d-kicker">${manager?'Para acompanhar':'Retornos e compartilhamentos'}</span><div class="d-number">${novidades.length}</div><p class="d-muted">Nos períodos abertos nesta tela</p></div></div>`:''}
      <section class="d-week" ${!ready?'hidden':''}><div class="d-row d-between"><h3>Conteúdos Get · ${br(semana)} a ${br(somarDias(semana,6))}</h3>${pill(`${done} de ${slots.length} entregues`,done===3?'green':'gold')}${pill(`${conferidosGet} de ${slots.length} conferidos pela gestão`,conferidosGet===3?'green':'')}</div><p class="d-muted">Segunda, quarta e sexta · vídeo ou carrossel · uma entrega por dia.</p><div class="d-progress"><span style="width:${done/3*100}%"></span></div><div class="d-grid">${slots.map((d,i)=>{const r=registros.get('g_'+d),v=r?.data,late=d<hojeBRT(agora())&&v?.estado!=='entregue';return `<article class="d-card ${v?.estado==='entregue'?'green':d===hojeBRT(agora())?'gold':''}"><div class="d-row d-between"><strong>${['Segunda','Quarta','Sexta'][i]}</strong><span class="d-muted">${br(d)}</span></div><h3 style="margin-top:14px">${esc(v?.titulo||'Definir conteúdo')}</h3><p class="d-muted">${v?.formato==='carrossel'?'Carrossel':v?.formato==='video'?'Vídeo':'Vídeo ou carrossel'}</p><div class="d-row" style="margin:12px 0">${pill(v?.estado==='entregue'?'✓ Material entregue':v?.estado==='em_producao'?'Em produção':late?'Entrega pendente':d===hojeBRT(agora())?'Para hoje':'Planejado',v?.estado==='entregue'?'green':late?'red':'gold')}${r?etiqueta(r):''}</div>${v?.url?`<p>${link(v.url,'Ver material ↗')}</p>`:''}${btn(manager?'Ver conteúdo':'Planejar / entregar','open',true,`data-id="g_${d}"`)}</article>`;}).join('')}</div>${!slots.length?'<p class="d-empty">Esta rotina começa em 28/09/2026. Não há cobrança de semanas anteriores.</p>':''}</section>
      ${ready?`<section><div class="d-row d-between" style="margin:18px 0 12px"><h3>Gravações · ${esc(mes.split('-').reverse().join('/'))}</h3><label>Mostrar<select data-session-filter>${[['ativas','Próximas e para fechar'],['fechar','Gravações para fechar'],['todas','Todas / histórico']].map(([v,l])=>`<option value="${v}" ${v===filtroSessoes?'selected':''}>${l}</option>`).join('')}</select></label></div><div class="d-list">${(compacto?sessoesVisiveis.slice(0,4):sessoesVisiveis).map(sessionCard).join('')}</div>${!sessoesVisiveis.length?'<div class="d-empty">Nenhuma sessão do Luís neste filtro. Consulte Todas / histórico ou outro mês.</div>':''}${compacto&&sessoesVisiveis.length>4?btn(`Ver as ${sessoesVisiveis.length} gravações`,'area'):''}<p class="d-muted">O histórico anterior a 28/09 permanece consultável, sem criar cobranças retroativas de direção.</p></section>`:''}
      ${ready&&novidades.length?`<details><summary>${manager?'Compartilhamentos e alterações para conferir':'Meus registros e retornos'} (${novidades.length})</summary>${novidades.map(r=>`<div class="d-row d-between" style="padding:10px 0;border-bottom:1px solid #41434a"><span>${esc(tituloRegistro(r.id))} · ${etiqueta(r)}</span>${btn('Abrir','open',false,`data-id="${esc(r.id)}"`)}</div>`).join('')}</details>`:''}`;
  }
  function tituloRegistro(id){if(id.startsWith('g_'))return 'Get · '+br(id.slice(2));const a=agenda.find(a=>a.id===id.slice(2));return (id.startsWith('p_')?'Planejamento':'Entrega')+' · '+(a?.clienteNome||a?.cliente||'Sessão anterior')+' · '+br(a?.data);}
  async function carregar(){
    const n=++seq;off.forEach(f=>f());off=[];erro='';ready=false;cache=false;dashboard();
    try{
      const a=await sessoes();if(!valido()||n!==seq)return;agenda=a;if(alvoInicial){const item=agenda.find(x=>x.id===alvoInicial.slice(2));if(diaValido(item?.data))mes=item.data.slice(0,7);}
      const meses=[mes,...diasGet(semana).map(d=>d.slice(0,7))];
      const linked=agenda.filter(noMes).flatMap(a=>['p_'+a.id,'e_'+a.id]).flatMap(id=>[id,'r_'+id]);
      const other=new Map();
      // IDs de sessão sobrevivem à remarcação para outro mês; leitura direta
      // recupera seu planejamento anterior sem copiar/migrar dados.
      const recuperados=await repo.readMany(linked);if(!valido()||n!==seq)return;recuperados.forEach(r=>other.set(r.id,r));
      if(!valido()||n!==seq)return;
      off.push(repo.watch([...meses,...[...other.values()].map(r=>r.periodo)],(rows,meta)=>{
        if(!valido()||n!==seq)return;cache=meta.cache;
        if(rows){registros=new Map(other);rows.forEach(r=>registros.set(r.id,r));ready=true;erro='';}
        dashboard();avisoVersao();if(ready&&alvoInicial){const id=alvoInicial;alvoInicial='';open(id);}
      },e=>{if(valido()&&n===seq){erro='Não foi possível conferir a direção. Isso não significa que os registros sumiram. '+(e.code==='permission-denied'?'Confira a publicação das permissões desta área.':'Tente atualizar.');dashboard();}}));
    }catch(e){if(valido()&&n===seq){erro='Não foi possível carregar a agenda da direção. Nenhuma gravação foi alterada.';dashboard();}}
  }
  const input=(name,label,value='',type='text')=>`<div class="d-field"><label for="d101-${name}">${label}</label><input id="d101-${name}" name="${name}" type="${type}" value="${esc(value)}"></div>`;
  const area=(name,label,value='',placeholder='')=>`<div class="d-field"><label for="d101-${name}">${label}</label><textarea id="d101-${name}" name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`;
  const select=(name,label,value,items)=>`<div class="d-field"><label for="d101-${name}">${label}</label><select id="d101-${name}" name="${name}">${items.map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('')}</select></div>`;
  const estados=[['planejado','Planejado'],['em_producao','Em produção'],['entregue','Material entregue']];
  function vazio(id){return id.startsWith('p_')?{texto:'',referencias:'',necessidades:''}:id.startsWith('e_')?{texto:'',diferente:'',referencias:'',arquivos:false,estado:'em_andamento',extras:[]}:{titulo:'',formato:'video',texto:'',referencias:'',url:'',estado:'planejado'};}
  function extra(x){return `<div class="d-extras" data-extra="${esc(x.id)}"><div class="d-row d-between"><strong>Material extra / diferente</strong>${btn('Retirar deste rascunho','remove-extra',false,`data-extra-id="${esc(x.id)}"`)}</div><div class="d-fields">${input('extra-titulo-'+x.id,'Título do material',x.titulo)}${select('extra-formato-'+x.id,'Formato',x.formato,[['video','Vídeo'],['carrossel','Carrossel'],['foto','Foto'],['story','Story'],['outro','Outro']])}</div>${input('extra-url-'+x.id,'Link do material',x.url,'url')}${input('extra-ref-'+x.id,'Link de referência (opcional)',x.referencia,'url')}</div>`;}
  function formulario(d){
    const id=selecionado.id;
    if(id.startsWith('p_'))return area('texto','O que pretendo fazer',d.texto,'Vídeos, ideias, cenas, mudanças, Stories, dinâmica da gravação…')+area('referencias','Links de referência — um por linha',d.referencias,'https://…')+area('necessidades','Preparação e decisões necessárias',d.necessidades,'Produtos, pessoas, equipamentos e o que precisa de alinhamento.');
    if(id.startsWith('e_'))return area('texto','O que foi realizado',d.texto)+area('diferente','O que fiz a mais ou diferente',d.diferente,'Explique mudanças, conteúdos extras, aprendizados ou pendências.')+area('referencias','Links dos materiais e referências — um por linha',d.referencias,'https://…')+`<div data-extras>${(d.extras||[]).map(extra).join('')}</div>${btn('+ Adicionar material extra','add-extra')}<p class="d-muted">Apresentar um extra aqui não o envia novamente para edição.</p>`+select('estado','Situação da conferência',d.estado,[['em_andamento','Em andamento / com pendências'],['entregue','Entrega apresentada à gestão']])+`<label class="d-check"><input type="checkbox" name="arquivos" ${d.arquivos?'checked':''}>Conferi os arquivos e os links desta entrega.</label>`;
    return `<div class="d-fields">${input('titulo','Nome do conteúdo',d.titulo)}${select('formato','Formato',d.formato,[['video','Vídeo'],['carrossel','Carrossel']])}</div>`+area('texto','Ideia e execução',d.texto)+area('referencias','Links de referência — um por linha',d.referencias)+input('url','Link do material entregue',d.url,'url')+select('estado','Situação',d.estado,estados);
  }
  function resumo(d,id){
    if(!d)return '<div class="d-empty">Luís ainda não compartilhou este registro.</div>';
    const fields=id.startsWith('p_')?[['Planejamento',d.texto],['Preparação e decisões',d.necessidades]]:id.startsWith('e_')?[['O que foi realizado',d.texto],['A mais ou diferente',d.diferente]]:[['Conteúdo',d.titulo],['Ideia e execução',d.texto]];
    return fields.map(([k,v])=>`<div class="d-card"><h3>${k}</h3><div class="d-preserve">${esc(v||'Não informado')}</div></div>`).join('')+(d.estado?`<p>${pill(d.estado==='entregue'?'Entrega apresentada':d.estado==='em_producao'?'Em produção':'Em andamento',d.estado==='entregue'?'green':'gold')}</p>`:'')+(d.url?`<p>${link(d.url,'Ver material ↗')}</p>`:'')+(d.referencias?`<div class="d-card"><h3>Materiais e referências</h3>${d.referencias.split('\n').map((x,i)=>`<p>${link(x,'Abrir link '+(i+1)+' ↗')}</p>`).join('')}</div>`:'')+(d.extras||[]).map(x=>`<div class="d-extras"><h3>${esc(x.titulo)}</h3>${pill(x.formato)}<p>${link(x.url,'Ver material extra ↗')}</p><p>${link(x.referencia,'Ver referência ↗')}</p></div>`).join('');
  }
  function campos(){const f=editor.querySelector('form');if(!f)return null;const fd=new FormData(f),v=Object.fromEntries(fd);if(selecionado.id.startsWith('e_')){v.arquivos=fd.has('arquivos');v.extras=[...f.querySelectorAll('[data-extra]')].map(el=>{const i=el.dataset.extra;return {id:i,titulo:v['extra-titulo-'+i],formato:v['extra-formato-'+i],url:v['extra-url-'+i],referencia:v['extra-ref-'+i]};});for(const k of Object.keys(v))if(k.startsWith('extra-'))delete v[k];}return v;}
  function guardar(){
    if(!selecionado||!valido())return;
    const id=manager?'r_'+selecionado.id:selecionado.id,el=editor.querySelector('[name=retorno]');
    const d=manager?(el?{texto:el.value,versao:selecionado.revisao}:null):campos();if(!d)return;
    const stored=registros.get(id),igual=manager?stored?.data?.versao===d.versao&&stored.data.texto===d.texto:stored?.revisao===selecionado.revisao&&estavel(stored.data)===estavel(d);
    if(igual){draft.del(id);return;}
    if(!draft.set(id,{data:d,revisao:manager?selecionado.retornoRevisao:selecionado.revisao,periodo:selecionado.periodo}))status('O navegador não conseguiu guardar seu rascunho local. Mantenha esta tela aberta até salvar.',true);
  }
  function status(s,error=false){let box=editor.querySelector('[data-form-status]');if(!box&&error){editor.innerHTML='<div data-form-status role="status"></div>';box=editor.querySelector('[data-form-status]');}if(box){box.className='d-status'+(error?' error':'');box.textContent=s;}}
  function avisoVersao(){if(!selecionado)return;const r=registros.get(selecionado.id),box=editor.querySelector('[data-version]');if(box)box.textContent=!salvando&&r&&r.revisao!==selecionado.revisao?'Há uma versão mais recente no servidor. Seu texto não foi substituído.':'';const rv=registros.get('r_'+selecionado.id),fb=editor.querySelector('[data-feedback]');if(fb&&rv)fb.innerHTML=`<div class="d-card ${rv.data.estado==='ajustar'?'red':'green'}"><strong>${esc(rv.autorNome)} · ${rv.data.estado==='ajustar'?'Pediu alteração':'Conferiu'}${rv.data.versao!==selecionado.revisao?' uma versão anterior':''}</strong><p class="d-preserve">${esc(rv.data.texto||'Conferência registrada.')}</p></div>`;}
  function desenharEditor(data){
    const s=selecionado,r=registros.get(s.id),rev=registros.get('r_'+s.id),a=agenda.find(a=>a.id===s.id.slice(2));
    editor.innerHTML=`<div class="d-card gold"><div class="d-row d-between"><div class="d-plan-title"><span class="d-kicker">${s.id.startsWith('p_')?'Planejamento livre':s.id.startsWith('e_')?'Conferência da gravação':'Rotina Get'}</span><h2>${esc(tituloRegistro(s.id))}</h2></div>${btn('Fechar','close')}</div><p class="d-muted">${a?'Sessão da agenda · '+esc(a.status)+(a.excluido?' · arquivada':'')+' · pauta '+esc(sessaoPeriodo(a)):'Segunda, quarta e sexta · vídeo ou carrossel'}</p><div class="d-status error" data-version role="status"></div><div data-feedback>${rev?`<div class="d-card ${rev.data.estado==='ajustar'?'red':'green'}"><strong>${esc(rev.autorNome)} · ${rev.data.estado==='ajustar'?'Pediu alteração':'Conferiu'}${rev.data.versao!==s.revisao?' uma versão anterior':''}</strong><p class="d-preserve">${esc(rev.data.texto||'Conferência registrada.')}</p></div>`:''}</div>
      ${manager?resumo(r?.data,s.id):`<form novalidate>${formulario(data)}<div class="d-save"><div class="d-row">${btn(s.id.startsWith('g_')?'Salvar conteúdo da Get':s.id.startsWith('e_')?'Apresentar entrega':'Salvar e compartilhar','save',true)}${btn('Conferir versão atual','reload-record')}</div><p class="d-muted">Chris e Amanda recebem na página inicial. Ao compartilhar um planejamento, Amanda também recebe um aviso. Rascunho local até salvar.</p></div></form>`}
      ${manager&&r?`<div class="d-card"><h3>Sua conferência · versão ${r.revisao}</h3>${area('retorno','Retorno para o Luís',rev?.data?.versao===r.revisao?rev.data.texto:'','Explique o ajuste necessário ou deixe uma orientação.') }<div class="d-row">${btn('Pedir alteração','request',true)}${btn('Marcar como conferido','ack')}</div></div>`:''}
      <div data-form-status class="d-status" role="status"></div><div class="d-row" style="margin-top:18px">${btn('Ver histórico','history')}${manager?btn('Conferir versão atual','reload-record'):''}${!manager&&draft.get(s.id)?btn('Recuperar meu rascunho','restore-draft'):''}</div><div data-history></div>
      ${a?`<details><summary>Agenda, pauta e materiais já enviados</summary><p class="d-muted">${esc(a.estilo||'')} ${esc(a.obsFilmmaker||'')}</p>${(a.referencias||[]).map(u=>`<p>${link(u,'Referência da agenda ↗')}</p>`).join('')}<div class="d-row">${btn('Consultar calendários','pautas')}${a.status==='agendado'&&!a.excluido?btn('Enviar materiais desta sessão','envio'):''}${btn('Ver materiais registrados','materials')}</div><div data-materials></div></details>`:''}</div>`;
    const form=editor.querySelector('form');form?.addEventListener('input',guardar);form?.addEventListener('change',guardar);form?.addEventListener('submit',e=>e.preventDefault());const rt=editor.querySelector('[name=retorno]');const dr=draft.get('r_'+s.id);if(rt&&dr?.data.versao===s.revisao){rt.value=dr.data.texto;status('Seu retorno em rascunho foi recuperado. Ainda não foi enviado.');}rt?.addEventListener('input',guardar);avisoVersao();
  }
  async function open(id,{fresh=false}={}){
    if(salvando||!ready)return;guardar();const n=++seq;off.forEach(f=>f());off=[];
    try{
      const [r,rv]=await Promise.all([repo.read(id),repo.read('r_'+id)]);if(!valido()||n!==seq)return;
      if(r)registros.set(id,r);else registros.delete(id);if(rv)registros.set(rv.id,rv);else registros.delete('r_'+id);
      const a=agenda.find(x=>x.id===id.slice(2));if(!id.startsWith('g_')&&!a)throw Error('A sessão não foi encontrada. Atualize a agenda.');
      selecionado={id,revisao:r?.revisao||0,retornoRevisao:rv?.revisao||0,periodo:r?.periodo||(id.startsWith('g_')?id.slice(2,9):diaValido(a?.data)?a.data.slice(0,7):sessaoPeriodo(a))};
      const d=draft.get(id),restaurar=!manager&&!fresh&&d&&d.revisao===selecionado.revisao;
      desenharEditor(restaurar?d.data:r?.data||vazio(id));if(restaurar)status('Rascunho recuperado neste navegador. Ainda não foi compartilhado.');else if(!manager&&d)status('Existe um rascunho anterior. Compare com a versão atual antes de recuperá-lo.');
      editor.scrollIntoView({behavior:'smooth',block:'start'});
      await observar();
    }catch(e){if(valido())status(e.message,true);await observar();}
  }
  async function observar(){
    const n=seq;if(!valido())return;off.forEach(f=>f());off=[];
    off.push(repo.watch([mes,...diasGet(semana).map(d=>d.slice(0,7)),...periodosLigados(),...(selecionado?[selecionado.periodo]:[])],(rows,meta)=>{if(!valido()||seq!==n)return;cache=meta.cache;if(rows){rows.forEach(r=>registros.set(r.id,r));ready=true;erro='';}dashboard();avisoVersao();},()=>{if(valido()){erro='A conexão da direção foi interrompida. Seu formulário continua preservado.';dashboard();}}));
  }
  async function save(){
    if(!selecionado||salvando||manager)return;const s={...selecionado},before=campos();guardar();salvando=true;editor.querySelectorAll('[data-action=save]').forEach(b=>b.disabled=true);status('Salvando e conferindo no servidor…');
    try{
      const result=await repo.save(s.id,before,s.periodo,s.revisao);if(!valido()||selecionado?.id!==s.id)return;
      const after=campos();registros.set(s.id,result);selecionado.revisao=result.revisao;
      if(estavel(after)===estavel(before)){draft.del(s.id);desenharEditor(result.data);status('Salvo. Chris e Amanda já podem conferir na página inicial.');}
      else{guardar();status('A versão enviada foi salva. As alterações que você digitou durante a espera continuam neste rascunho.');}
      dashboard();
    }catch(e){if(valido())status(e.message||'Não foi possível salvar. Seu rascunho foi preservado.',true);}
    finally{salvando=false;if(valido()){editor.querySelectorAll('[data-action=save]').forEach(b=>b.disabled=false);avisoVersao();}}
  }
  async function review(state){
    if(!manager||!selecionado||salvando)return;const s={...selecionado},message=editor.querySelector('[name=retorno]')?.value||'';salvando=true;editor.querySelectorAll('[data-action=request],[data-action=ack]').forEach(b=>b.disabled=true);
    try{guardar();const r=await repo.save('r_'+s.id,{estado:state,texto:message,versao:s.revisao},s.periodo,s.retornoRevisao);if(!valido())return;
      const after=editor.querySelector('[name=retorno]')?.value||'';registros.set(r.id,r);selecionado.retornoRevisao=r.revisao;
      if(after===message){draft.del(r.id);desenharEditor(registros.get(s.id)?.data);status(state==='ajustar'?'Alteração solicitada. O Luís recebe o retorno nesta mesma ficha.':'Conferência registrada para esta versão.');}
      else{guardar();status('Retorno enviado. O texto digitado durante a espera continua em rascunho.');}dashboard();}
    catch(e){if(valido())status(e.message,true);}finally{salvando=false;if(valido())editor.querySelectorAll('[data-action=request],[data-action=ack]').forEach(b=>b.disabled=false);}
  }
  async function action(e){
    const el=e.target.closest('[data-action]');if(!el||!root.contains(el)||!valido())return;const ac=el.dataset.action;
    try{
      if(ac==='save')return await save();if(ac==='request'||ac==='ack')return await review(ac==='request'?'ajustar':'ciente');
      if(salvando){status('Aguarde a confirmação do salvamento.');return;}
      if(ac==='area'){guardar();abrirArea?.();}
      else if(ac==='rotina'){guardar();abrirRotina?.();}
      else if(ac==='demandas'){guardar();abrirDemandas?.();}
      else if(ac==='refresh'){guardar();await carregar();}
      else if(ac==='open')await open(el.dataset.id);
      else if(ac==='close'){guardar();selecionado=null;editor.replaceChildren();dashboard();}
      else if(ac==='prev'||ac==='next'){guardar();semana=somarDias(semana,ac==='prev'?-7:7);mes=semana.slice(0,7);selecionado=null;editor.replaceChildren();await carregar();}
      else if(ac==='reload-record')await open(selecionado.id,{fresh:true});
      else if(ac==='restore-draft'){const d=draft.get(selecionado.id);if(d){desenharEditor(d.data);status('Rascunho recuperado. Confira antes de salvar sobre a versão atual.');}}
      else if(ac==='add-extra'){const items=editor.querySelectorAll('[data-extra]');if(items.length>=30)throw Error('Limite de 30 materiais por conferência.');editor.querySelector('[data-extras]').insertAdjacentHTML('beforeend',extra({id:crypto.randomUUID(),titulo:'',formato:'video',url:'',referencia:''}));guardar();}
      else if(ac==='remove-extra'){el.closest('[data-extra]').remove();guardar();}
      else if(ac==='history'){const id=selecionado.id,[rows,reviews]=await Promise.all([repo.historico(id),repo.historico('r_'+id)]);if(!valido()||selecionado?.id!==id)return;
        editor.querySelector('[data-history]').innerHTML=(rows.length?'<h3 style="margin-top:16px">Versões compartilhadas</h3>'+rows.map(r=>`<details><summary>Versão ${r.revisao} · ${esc(r.autorNome)}</summary>${resumo(r.data,id)}</details>`).join(''):'<p class="d-muted">Nenhuma versão salva ainda.</p>')+(reviews.length?'<h3 style="margin-top:16px">Conferências da gestão</h3>'+reviews.map(r=>`<details><summary>${esc(r.autorNome)} · ${r.data.estado==='ajustar'?'Pediu alteração':'Conferiu'} · versão ${r.data.versao}</summary><p class="d-preserve">${esc(r.data.texto||'Conferência registrada.')}</p></details>`).join(''):'');} 
      else if(ac==='materials'){const id=selecionado.id,rows=await materiais(id.slice(2));if(!valido()||selecionado?.id!==id)return;editor.querySelector('[data-materials]').innerHTML=rows.length?rows.map(v=>`<div class="d-extras"><strong>${esc(v.titulo||'Material')}</strong><p class="d-muted">${esc(v.status||'Registrado')} · ${esc(v.filmmaker||v.registradoPor||'')}</p>${link(v.linkFinalizado||v.materialUrl||'','Ver material ↗')}</div>`).join(''):'<p class="d-empty">Nenhum material registrado para esta sessão. Use o envio existente quando o material estiver disponível.</p>';}
      else if(ac==='envio'){guardar();await abrirEnvio(selecionado.id.slice(2));}
      else if(ac==='pautas'){guardar();abrirPautas();}
    }catch(e){if(valido())status(e.message,true);}
  }
  async function filtro(e){if(e.target.matches('[data-session-filter]')){filtroSessoes=e.target.value;dashboard();return;}if(!e.target.matches('[data-mes],[data-semana]'))return;if(salvando){dashboard();return;}guardar();try{if(e.target.matches('[data-mes]'))mes=e.target.value;else{semana=segunda(e.target.value);mes=semana.slice(0,7);}if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(mes))throw Error('Mês inválido');selecionado=null;editor.replaceChildren();await carregar();}catch{erro='Escolha um mês e uma semana válidos.';dashboard();}}
  const unloading=()=>guardar();root.addEventListener('click',action);root.addEventListener('change',filtro);window.addEventListener('beforeunload',unloading);carregar();
  return {destroy(){guardar();vivo=false;++seq;off.forEach(f=>f());off=[];root.removeEventListener('click',action);root.removeEventListener('change',filtro);window.removeEventListener('beforeunload',unloading);root.replaceChildren();root.classList.remove('dir101');}};
}
