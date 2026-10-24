import {normalizarDiretrizI165} from './gs-diretriz-publicacao-i165.mjs';
import {idFisicoI165,jsonCanonicoI165,programacaoAtivaI165,dataCivilI165,horaCivilI165} from './gs-contexto-operacional-i165.mjs';

const copiar=x=>JSON.parse(JSON.stringify(x));
const congelar=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(congelar);Object.freeze(x);}return x;};
export const escI165=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function urlSeguraI165(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function resumoContinuidadePostagemI165(l){
 const a=l?.legadoProgramacao,p=l?.postagem;
 if(l?.politica!=null||a?.schema!==1||a.autorizada!==true||a.semDiretriz!==true||!['postagem_anterior','video_aprovado_anterior'].includes(a.modo)||!idFisicoI165(p?.id))return null;
 const mostrar=(data,hora)=>data.split('-').reverse().join('/')+' às '+hora;
 const datas=[];
 if(p.status==='agendado'&&dataCivilI165(p.dataAgendada)&&horaCivilI165(p.horaAgendada))datas.push(mostrar(p.dataAgendada,p.horaAgendada));
 else for(const o of l.obrigacoes||[]){const prazo=o?.prazo;
  if(o?.tipo!=='confirmar_publicacao'||o.fonte?.colecao!=='postagens'||o.fonte?.id!==p.id||typeof prazo!=='string'||!/^20\d{2}-\d\d-\d\dT\d\d:\d\d$/.test(prazo)||!dataCivilI165(prazo.slice(0,10))||!horaCivilI165(prazo.slice(11)))continue;
  const redes={geral:'',instagram:'Instagram: ',linkedin:'LinkedIn: ',tiktok:'TikTok: ',youtube:'YouTube: '};
  if(Object.hasOwn(redes,o.rede||'geral'))datas.push(redes[o.rede||'geral']+mostrar(prazo.slice(0,10),prazo.slice(11)));
 }
 return {prazo:'Conteúdo já em andamento',compromisso:datas.length?'Agendamento registrado: '+[...new Set(datas)].join(' · '):p.status==='agendado'?'Agendamento registrado. Abra a ficha para conferir a data.':'Continue pela etapa indicada abaixo.',recado:l.estado==='aguardando_cliente'?'A confirmação do cliente ainda está em andamento.':'As informações e as aprovações anteriores continuam preservadas.'};
}

const chaveContexto=c=>jsonCanonicoI165([c?.uid||'',c?.papel||'',c?.atorReal||'',c?.sessao||'',c?.rota||'']);
const dono=c=>jsonCanonicoI165([c.uid,c.papel,c.atorReal]);
const prefixo=c=>'get_i165_aprovacao_v1_'+encodeURIComponent(dono(c))+'_';
const key=(c,id)=>prefixo(c)+encodeURIComponent(id);
const vazio=()=>({modalidade:'data',data:'',hora:'',inicioSemana:'',programarAte:'',programarHora:'19:00',urgencia:'normal',observacao:'',campanhaChave:''});
const pendente=s=>!!s?.intencao&&['enviando','incerta','conferindo'].includes(s.estado);
export function politicaFormularioI165(campos){
 const c={modalidade:campos.modalidade,programarAte:campos.programarAte||'',programarHora:campos.programarHora||'19:00',urgencia:campos.urgencia||'normal',observacao:String(campos.observacao||'').trim()};
 if(c.urgencia!=='normal'&&!c.observacao)throw Error('Conta rapidinho por que este conteúdo precisa de prioridade.');
 if(c.modalidade==='data'){c.data=campos.data||'';c.hora=campos.hora||'';}else if(c.modalidade==='semana')c.inicioSemana=campos.inicioSemana||'';else throw Error('Escolha uma data ou uma semana para este conteúdo.');
 return normalizarDiretrizI165(c);
}
const CAMPANHA_CHAVES=Object.freeze(['campanhaId','clienteSlug','postagemCampanhaId','empresaOtavio','assinaturaFonte']);
export function conferirCampanhasPreparoI165(snapshot){
 const temOp=Object.hasOwn(snapshot,'opcoesCampanha'),temSem=Object.hasOwn(snapshot,'campanhasSemOpcao');
 if(!temOp&&!temSem)return null;
 if(snapshot.consultaCompleta!==true||!Array.isArray(snapshot.opcoesCampanha)||!Array.isArray(snapshot.campanhasSemOpcao))throw Error('As campanhas não foram conferidas por inteiro.');
 const vistos=new Set();
 for(const o of snapshot.opcoesCampanha){const e=o?.escolha;
  if(!e||Object.keys(e).length!==CAMPANHA_CHAVES.length||!Object.keys(e).every(k=>CAMPANHA_CHAVES.includes(k))||![e.campanhaId,e.clienteSlug,e.postagemCampanhaId].every(idFisicoI165)||typeof e.empresaOtavio!=='string'||typeof e.assinaturaFonte!=='string'||!e.assinaturaFonte||e.clienteSlug!==snapshot.video?.cliente||e.empresaOtavio!==(snapshot.video?.empresaOtavio||'')||!dataCivilI165(o.data)||typeof o.hora!=='string'||o.hora&&!horaCivilI165(o.hora)||typeof o.campanhaNome!=='string'||typeof o.titulo!=='string'||typeof o.prazoProgramacao!=='string'||o.prazoProgramacao&&!dataCivilI165(o.prazoProgramacao))throw Error('A opção de campanha não confirmou a mesma empresa, conteúdo ou data.');
  const k=jsonCanonicoI165(e);if(vistos.has(k))throw Error('A campanha apareceu mais de uma vez nesta conferência.');vistos.add(k);
 }
 for(const a of snapshot.campanhasSemOpcao)if(!idFisicoI165(a?.campanhaId)||typeof a.motivo!=='string'||!a.motivo)throw Error('Uma campanha pendente ainda precisa de conferência.');
 return snapshot.opcoesCampanha;
}
export function opcaoCampanhaI165(snapshot,chave){
 if(!chave)return null;if(snapshot.compromisso)throw Error('Este conteúdo já tem uma campanha vinculada. A escolha atual será mantida.');
 const o=conferirCampanhasPreparoI165(snapshot)?.find(o=>jsonCanonicoI165(o.escolha)===chave);
 if(!o)throw Error('A campanha escolhida mudou. Confira as opções atuais antes de aprovar.');return o;
}
/** Pure state controller with explicit IO adapters. Storage is scoped to the actual UID/profile. */
export function criarFluxoAprovacaoI165({contexto,chamar,storage,novoId,quandoMuda=()=>{},aposConfirmar=async()=>{}}){
 const estados=new Map();
 function ctx(){const c=contexto();if(!c?.uid||!['Amanda','Chris'].includes(c.papel)||!c.atorReal||!c.sessao)throw Error('Abra de novo no seu perfil da gerência.');return copiar(c);}
 function restaurar(id,c=ctx()){
  const k=key(c,id);if(estados.has(k))return estados.get(k);let s=null;
  try{const salvo=JSON.parse(storage.getItem(k)||'null');if(salvo?.schema===1&&salvo.videoId===id&&salvo.dono===dono(c))s=salvo;}catch{}
  if(!s)s={schema:1,videoId:id,dono:dono(c),campos:vazio(),snapshot:null,intencao:null,estado:'rascunho',mensagem:''};
  if(s.estado==='enviando'||s.estado==='conferindo')s.estado='incerta';
  if(s.intencao)s.intencao=congelar(s.intencao);estados.set(k,s);return s;
 }
 function salvar(s,c,obrigatorio=false){try{storage.setItem(key(c,s.videoId),JSON.stringify(s));return true;}catch{if(obrigatorio)throw Error('Não consegui guardar esta tentativa neste aparelho. Nada foi enviado; mantenha a tela aberta e tente de novo.');return false;}}
 function emitir(s,c){salvar(s,c);if(chaveContexto(c)===chaveContexto(contexto()))quandoMuda(copiar(s),c);}
 const atual=(c,s,ticket)=>chaveContexto(c)===chaveContexto(contexto())&&s.ticket===ticket;
 async function concluida(s,c,r){
  s.estado='confirmada';s.resultado=r;s.mensagem='A aprovação aqui dentro foi salva. A confirmação do cliente segue no fluxo de sempre.';salvar(s,c);emitir(s,c);
  if(chaveContexto(c)!==chaveContexto(contexto())||s.continuidade==='conferida'&&s.continuidadeOperacao===s.intencao?.operacaoId)return;
  try{await aposConfirmar({id:s.videoId,resultado:r,contexto:c,snapshot:s.snapshot});s.continuidade='conferida';s.continuidadeOperacao=s.intencao?.operacaoId;}
  catch{ s.continuidade='conferir';s.mensagem='A aprovação foi salva. A próxima etapa ainda precisa de conferência; não aprove de novo.'; }
  emitir(s,c);
 }
 async function abrir(id){
  if(!idFisicoI165(id))throw Error('Reabra o vídeo pela lista.');const c=ctx(),s=restaurar(id,c);if(pendente(s)){emitir(s,c);return copiar(s);}
  const ticket=(s.ticket||0)+1;s.ticket=ticket;s.aberta=true;s.estado='preparando';s.mensagem='Conferindo a entrega que chegou…';emitir(s,c);
  try{const r=await chamar('preparar_aprovacao_video',{videoId:id,papelOperado:c.papel,sessao:c.sessao,uidEsperado:c.uid,atorRealEsperado:c.atorReal});
   if(!atual(c,s,ticket))return {tardia:true};
   if(r?.video?.id!==id||!r.assinaturaEsperada||!urlSeguraI165(r.video.linkFinalizado))throw Error('A entrega e o link ainda não foram confirmados.');
   conferirCampanhasPreparoI165(r);s.snapshot=r;s.estado='pronta';s.mensagem='Confira o vídeo e combine a postagem antes de aprovar.';
   const anterior=r.diretrizAnterior?.politica;
   if(!s.editado&&r.compromisso?.data)s.campos={...s.campos,modalidade:'data',data:r.compromisso.data,hora:r.compromisso.hora||''};
   else if(!s.editado&&anterior&&['data','semana'].includes(anterior.modalidade))s.campos={...vazio(),...anterior};
   emitir(s,c);return copiar(s);
  }catch(e){if(atual(c,s,ticket)){s.estado='erro_preparo';s.mensagem='Não consegui conferir a entrega agora. Seu formulário foi mantido. '+String(e.message||'');emitir(s,c);}return {erro:true};}
 }
 function editar(id,campos){const c=ctx(),s=restaurar(id,c);if(pendente(s)||s.estado==='confirmada')return false;const permitidos=Object.keys(vazio());for(const [k,v]of Object.entries(campos)){if(!permitidos.includes(k)||typeof v!=='string')throw Error('Campo inválido.');if(k==='campanhaChave'&&v){if(!s.snapshot||s.snapshot.diretrizNecessaria===false)throw Error('Confira primeiro se este conteúdo terá postagem.');const o=opcaoCampanhaI165(s.snapshot,v);s.campos={...s.campos,modalidade:'data',data:o.data,hora:o.hora};}s.campos[k]=v;}s.editado=true;salvar(s,c);return true;}
 async function enviar(s,c){
  s.estado='enviando';s.mensagem='Salvando esta aprovação…';salvar(s,c,true);emitir(s,c);
  try{const r=await chamar('aprovar_video',s.intencao);
   if(['novo','recuperado','confirmada'].includes(r?.estado))await concluida(s,c,r);
   else if(r?.estado==='cancelada'&&r.cancelamentoAtomico===true){s.estado='cancelada';s.intencao=null;s.snapshot=null;s.mensagem='A tentativa anterior foi encerrada sem aprovação. Confira a entrega novamente.';emitir(s,c);}
   else throw Error('O servidor ainda não confirmou o resultado.');
   return r;
  }catch(e){s.estado='incerta';s.mensagem='Ainda não consegui confirmar esta tentativa. Use “Conferir anterior” antes de mudar qualquer coisa.';s.erro=String(e.message||'');emitir(s,c);return {incerta:true};}
 }
 async function confirmar(id){const c=ctx(),s=restaurar(id,c);if(pendente(s))throw Error('Confira a tentativa anterior antes de enviar outra.');if(s.estado!=='pronta'||!s.snapshot)throw Error('Confira a entrega atual antes de aprovar.');
  const escolha=opcaoCampanhaI165(s.snapshot,s.campos.campanhaChave);if(escolha&&s.snapshot.diretrizNecessaria===false)throw Error('Uma entrega direta não pode receber campanha de postagem.');
  let diretriz;if(s.snapshot.diretrizNecessaria!==false){diretriz=politicaFormularioI165(s.campos);const cp=s.snapshot.compromisso||escolha;if(cp&&(diretriz.modalidade!=='data'||diretriz.data!==cp.data||!diretriz.hora||cp.hora&&diretriz.hora!==cp.hora))throw Error('Este conteúdo tem uma campanha com data combinada. Mantenha a data e informe o horário correto da postagem.');}
  const payload={videoId:id,operacaoId:novoId(),assinaturaEsperada:s.snapshot.assinaturaEsperada,papelOperado:c.papel,sessao:c.sessao,uidEsperado:c.uid,atorRealEsperado:c.atorReal,campanhaEscolhida:escolha?copiar(escolha.escolha):null,compromissoEsperado:copiar(s.snapshot.compromisso||null),...(diretriz?{diretriz}:{})};
  if(!idFisicoI165(payload.operacaoId))throw Error('Não consegui identificar esta tentativa.');s.intencao=congelar(copiar(payload));s.estado='enviando';try{salvar(s,c,true);}catch(e){s.intencao=null;s.estado='pronta';throw e;}return enviar(s,c);
 }
 async function conferir(id){const c=ctx(),s=restaurar(id,c);if(!s.intencao)throw Error('Não há tentativa anterior para conferir.');s.estado='conferindo';s.mensagem='Conferindo a mesma tentativa…';emitir(s,c);
  try{const r=await chamar('conferir_op',{operacaoId:s.intencao.operacaoId,papelOperado:c.papel,sessao:c.sessao,uidEsperado:c.uid,atorRealEsperado:c.atorReal});
   if(r.estado==='confirmada'||r.estado==='recuperado')await concluida(s,c,r);
   else if(r.estado==='cancelada'&&r.cancelamentoAtomico===true){s.estado='cancelada';s.intencao=null;s.snapshot=null;s.mensagem='A tentativa anterior foi encerrada sem aprovação. Confira a entrega novamente.';emitir(s,c);}
   else {s.estado='incerta';s.mensagem='Ainda não há confirmação. Você pode tentar exatamente o mesmo envio ou pedir para liberar uma nova conferência.';emitir(s,c);}return r;
  }catch{ s.estado='incerta';s.mensagem='Não consegui conferir agora. A tentativa anterior continua guardada.';emitir(s,c);return {incerta:true};}
 }
 async function repetir(id){const c=ctx(),s=restaurar(id,c);if(!s.intencao||s.estado!=='incerta')throw Error('Confira a tentativa anterior.');return enviar(s,c);}
 async function liberarNova(id){const c=ctx(),s=restaurar(id,c);if(!s.intencao||s.estado!=='incerta')throw Error('Confira a tentativa anterior.');const r=await chamar('abortar_op',s.intencao);if(r.estado==='confirmada'||r.estado==='recuperado'){await concluida(s,c,r);return r;}if(r.estado!=='cancelada'||r.cancelamentoAtomico!==true)throw Error('O servidor não liberou uma nova orientação; sua tentativa continua guardada.');s.estado='cancelada';s.intencao=null;s.snapshot=null;s.mensagem='A tentativa anterior foi encerrada sem aprovação. Agora confira a entrega novamente.';emitir(s,c);return r;}
 function listarPendentes(){const c=ctx(),ids=new Set();for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(prefixo(c)))try{const s=JSON.parse(storage.getItem(k));if(s?.dono===dono(c)&&s.intencao&&['enviando','incerta','conferindo'].includes(s.estado))ids.add(s.videoId);}catch{}}return [...ids].slice(0,50).map(id=>copiar(restaurar(id,c)));}
 function listarAbertas(){const c=ctx(),ids=new Set();for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(prefixo(c)))try{const s=JSON.parse(storage.getItem(k));if(s?.dono===dono(c)&&s.aberta&&s.estado!=='confirmada')ids.add(s.videoId);}catch{}}return [...ids].slice(0,50).map(id=>copiar(restaurar(id,c)));}
 return {abrir,editar,confirmar,conferir,repetir,liberarNova,listarPendentes,listarAbertas,estado:id=>copiar(restaurar(id)),pendente:id=>pendente(restaurar(id))};
}

export function htmlFormularioI165(s){
 const v=s.snapshot?.video,c=s.campos||vazio(),travado=pendente(s)||s.estado==='confirmada',off=travado?' disabled':'',valor=k=>escI165(c[k]||''),link=urlSeguraI165(v?.linkFinalizado),d=s.snapshot?.diretrizNecessaria!==false;
 const opcoes=s.snapshot?.opcoesCampanha||[],selecionada=opcoes.find(o=>jsonCanonicoI165(o.escolha)===c.campanhaChave),cp=s.snapshot?.compromisso||selecionada;
 const campo=(k,label,type='text',extra='')=>`<label>${label}<input data-i165-campo="${k}" type="${type}" value="${valor(k)}"${off} ${extra}></label>`;
 const material=v?`<div class="i165-entrega"><b>Entrega que chegou</b><strong>${escI165(v.titulo)}</strong><span>${escI165(v.clienteNome||v.cliente)}${v.empresaOtavio?' · '+escI165(v.empresaOtavio):''} · ${escI165(v.editorAtribuido||'editor a conferir')}</span>${v.enviadoEm?'<span>Enviada em '+escI165(v.enviadoEm)+'</span>':''}${link?'<a class="btn secondary" href="'+escI165(link)+'" target="_blank" rel="noopener noreferrer">Abrir esta entrega ↗</a>':''}${v.ultimaCorrecaoSolicitada?'<p>'+escI165(v.ultimaCorrecaoSolicitada)+'</p>':''}</div>`:'';
 const campanha=!d?'':s.snapshot?.compromisso?'<div class="i165-entrega"><b>Campanha já vinculada</b><span>A data combinada é '+escI165(cp.data)+(cp.hora?' às '+escI165(cp.hora):' · informe o horário abaixo')+'. A campanha atual será mantida.</span></div>':Array.isArray(s.snapshot?.opcoesCampanha)?'<label>Faz parte de alguma campanha? (opcional)<select data-i165-campo="campanhaChave"'+off+'><option value="">Sem nova campanha</option>'+(c.campanhaChave&&!selecionada?'<option value="'+escI165(c.campanhaChave)+'" selected disabled>A escolha anterior mudou — confira as opções atuais</option>':'')+opcoes.map(o=>'<option value="'+escI165(jsonCanonicoI165(o.escolha))+'"'+(selecionada===o?' selected':'')+'>'+escI165(o.campanhaNome+' · '+o.titulo+' · '+o.data+(o.hora?' às '+o.hora:' · horário a combinar')+(o.escolha.empresaOtavio?' · '+o.escolha.empresaOtavio:''))+'</option>').join('')+'</select></label>'+(selecionada?.prazoProgramacao?'<p class="meta">Na campanha, o prazo de programação está em '+escI165(selecionada.prazoProgramacao)+'. Confira e combine o limite de agendamento abaixo.</p>':'')+(!opcoes.length?'<p class="meta">Nenhuma campanha com data confirmada disponível para este conteúdo.</p>':'')+(s.snapshot.campanhasSemOpcao?.length?'<p class="meta">Algumas campanhas ainda precisam de conferência: '+s.snapshot.campanhasSemOpcao.map(x=>escI165(x.motivo)).join(' · ')+'.</p>':''):'<p class="meta">As opções de campanha ainda não foram conferidas por este serviço. Um vínculo existente será mantido.</p>';
 const form=d?`${campanha}<div class="i165-grid"><label>Quando vai sair?<select data-i165-campo="modalidade"${off}${cp&&c.modalidade==='data'&&c.data===cp.data?' disabled':''}><option value="data"${c.modalidade==='data'?' selected':''}>Em uma data marcada</option><option value="semana"${c.modalidade==='semana'?' selected':''}>Durante uma semana</option></select></label>${c.modalidade==='semana'?campo('inicioSemana','Semana que começa na segunda-feira','date'):campo('data','Dia da postagem','date',cp&&c.data===cp.data?'readonly':'')+campo('hora',cp?'Horário da campanha (obrigatório)':'Horário da postagem (se já combinado)','time',cp?.hora&&c.hora===cp.hora?'readonly':'')}${campo('programarAte','Agendar até qual dia?','date')}${campo('programarHora','Até que horário?','time')}<label>Prioridade da postagem<select data-i165-campo="urgencia"${off}>${[['normal','Normal'],['alta','Alta'],['urgente','Urgente']].map(([v,t])=>'<option value="'+v+'"'+(c.urgencia===v?' selected':'')+'>'+t+'</option>').join('')}</select></label></div><label>${c.urgencia==='normal'?'Recado para a programação (opcional)':'Por que precisa dessa prioridade?'}<textarea data-i165-campo="observacao" maxlength="2000"${off}>${valor('observacao')}</textarea></label><p class="meta">A prioridade de postagem não muda o prazo da edição. Se escolher uma semana, a Cecília recebe a janela inteira para organizar o dia.</p>`:'<p class="meta">Este trabalho é entrega direta ou pontual. A aprovação segue sem criar data ou tarefa de postagem.</p>';
 const a=pendente(s)?'<button type="button" data-i165-acao="conferir">Conferir anterior</button><button type="button" data-i165-acao="repetir">Tentar o mesmo envio</button>'+(s.snapshot?.cancelamentoAtomicoDisponivel===true?'<button type="button" data-i165-acao="liberar">Liberar nova conferência</button>':'<p class="meta">Uma nova orientação só fica disponível depois que o serviço encerrar esta tentativa.</p>'):s.estado==='pronta'?'<button type="button" data-i165-acao="confirmar" class="i165-primario">Aprovar esta entrega</button><button type="button" data-i165-acao="abrir">Conferir a versão atual</button>':s.estado==='confirmada'?'':s.estado==='preparando'?'':'<button type="button" data-i165-acao="abrir">Conferir a entrega atual</button>';
 return `<section class="i165-operacional" data-i165-video="${escI165(s.videoId)}"><h3>Conferir e organizar a postagem</h3>${material}<p role="status">${escI165(s.mensagem)}</p>${s.snapshot?form:''}<div class="i165-acoes">${a}</div><p class="i165-erro" data-i165-erro role="alert"></p></section>`;
}

export function criarUiOperacionalI165({document,window,contexto,carregarConfig,chamar,storage,novoId,aposConfirmar,toast=()=>{},abrirEditor,abrirPostagem}){
 const montagens=new Map(),fluxo=criarFluxoAprovacaoI165({contexto,chamar,storage,novoId,aposConfirmar,quandoMuda:s=>desenhar(s)});
 function estilo(){if(document.getElementById('estiloOperacionalI165'))return;const s=document.createElement('style');s.id='estiloOperacionalI165';s.textContent='.i165-operacional{margin:14px 0;padding:18px;border:1px solid var(--yellow);border-radius:14px;background:var(--deep);overflow-wrap:anywhere}.i165-operacional h3{margin:0 0 12px}.i165-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}.i165-operacional label{display:flex;flex-direction:column;gap:7px;margin:12px 0;font-size:13px;font-weight:700}.i165-operacional input,.i165-operacional select,.i165-operacional textarea{box-sizing:border-box;min-width:0;width:100%;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--graphite);color:var(--text);font:inherit}.i165-operacional textarea{min-height:90px}.i165-entrega{display:grid;gap:8px;padding:14px;border-radius:12px;border:1px solid var(--line)}.i165-entrega span{font-size:12px;color:var(--muted)}.i165-acoes{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.i165-acoes button,.i165-linha button{padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);font:inherit;cursor:pointer}.i165-acoes .i165-primario{background:var(--green);color:#102216;font-weight:800}.i165-erro{color:var(--red)}.i165-linha{padding:14px;margin:12px 0;border-left:4px solid #7bb8ff;border-radius:10px;background:var(--deep)}.i165-linha strong,.i165-linha span{display:block;margin:5px 0}';document.head.appendChild(s);}
 function desenhar(s){const m=montagens.get(s.videoId);if(!m||!m.el.isConnected||m.ctx!==chaveContexto(contexto()))return;const foco=document.activeElement?.dataset?.i165Campo,ini=document.activeElement?.selectionStart,fim=document.activeElement?.selectionEnd;m.el.innerHTML=htmlFormularioI165(s);if(foco){const f=m.el.querySelector('[data-i165-campo="'+foco+'"]');if(f){f.focus({preventScroll:true});if(typeof ini==='number'&&['text','textarea'].includes(f.type||f.tagName?.toLowerCase()))try{f.setSelectionRange(ini,fim);}catch{}}}}
 function montar(id,cont){estilo();let el=document.getElementById('formProgramacaoI165_'+id);if(!el){el=document.createElement('div');el.id='formProgramacaoI165_'+id;cont.appendChild(el);}montagens.set(id,{el,ctx:chaveContexto(contexto())});el.oninput=e=>{const k=e.target.dataset?.i165Campo;if(!k)return;try{fluxo.editar(id,{[k]:e.target.value});if(['modalidade','urgencia','campanhaChave'].includes(k))desenhar(fluxo.estado(id));}catch(err){toast(err.message,'erro');}};el.onclick=async e=>{const b=e.target.closest?.('[data-i165-acao]');if(!b)return;const a=b.dataset.i165Acao;b.disabled=true;try{if(a==='liberar')await fluxo.liberarNova(id);else await fluxo[{abrir:'abrir',confirmar:'confirmar',conferir:'conferir',repetir:'repetir'}[a]](id);}catch(err){if(el.isConnected&&montagens.get(id)?.ctx===chaveContexto(contexto())){const t=el.querySelector('[data-i165-erro]');if(t)t.textContent=err.message;}}finally{if(b.isConnected)b.disabled=false;}};desenhar(fluxo.estado(id));return el;}
 async function habilitada(){const cfg=await carregarConfig();return programacaoAtivaI165(cfg)&&cfg.habilidades?.aprovacao===true;}
 async function tratarAprovacao(id){try{const ctx=copiar(contexto()),existe=fluxo.pendente(id),ativa=await habilitada();if(chaveContexto(ctx)!==chaveContexto(contexto()))return true;if(!ativa&&!existe)return false;const c=document.getElementById('itemAprovacao_'+id)||document.getElementById('gerenciaAprovarVideos');if(!c)throw Error('Abra novamente a lista de aprovação.');montar(id,c);await fluxo.abrir(id);}catch(e){toast('Não consegui abrir a conferência. '+e.message,'erro');}return true;}
 async function permitirLote(){const ctx=chaveContexto(contexto());try{const ativa=await habilitada();if(ctx!==chaveContexto(contexto()))return false;if(ativa||fluxo.listarPendentes().length){toast('Abra um vídeo por vez para combinar a postagem de cada um.','erro');return false;}return true;}catch{toast('Não consegui confirmar a configuração da aprovação. Tente novamente.','erro');return false;}}
 async function restaurarAprovacoes(cont){if(!['Amanda','Chris'].includes(contexto().papel))return;for(const s of fluxo.listarAbertas()){const c=document.getElementById('itemAprovacao_'+s.videoId)||(pendente(s)?cont:null);if(c)montar(s.videoId,c);}}
 async function anexarLeitura(cont,ids,acao,tipo,deslocamento=0){
  estilo();const todos=[...new Set(ids)];ids=todos.slice(deslocamento,deslocamento+20);
  const inicial=copiar(contexto()),captura=chaveContexto(inicial),ticket={};cont.__leituraI165=ticket;if(!ids.length)return;let slot=cont.querySelector('[data-i165-resumo="'+tipo+'"]');if(!slot){slot=document.createElement('section');slot.dataset.i165Resumo=tipo;cont.prepend(slot);}const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Conferindo os compromissos deste conteúdo…';slot.prepend(status);
  try{const cfg=await carregarConfig();if(captura!==chaveContexto(contexto())||cont.__leituraI165!==ticket||!cont.isConnected)return;if(!programacaoAtivaI165(cfg)||cfg.habilidades?.[tipo==='edicao'?'edicao':'programacao']!==true){slot.remove();return;}
   const linhas=[],erros=[];for(let i=0;i<ids.length;i+=20){if(captura!==chaveContexto(contexto())||cont.__leituraI165!==ticket)return;const r=await chamar(acao,{ids:ids.slice(i,i+20),papelOperado:inicial.papel,sessao:inicial.sessao,uidEsperado:inicial.uid,atorRealEsperado:inicial.atorReal});linhas.push(...r.linhas||[]);erros.push(...r.erros||[]);}
   if(captura!==chaveContexto(contexto())||cont.__leituraI165!==ticket||!cont.isConnected)return;
   const encontrados=new Set();for(const l of linhas){const id=tipo==='edicao'?l.video?.id:l.postagem?.id;if(!idFisicoI165(id)||!ids.includes(id)||encontrados.has(id))throw Error('A resposta não confirmou os mesmos conteúdos.');encontrados.add(id);}for(const erro of erros){if(!ids.includes(erro.id)||encontrados.has(erro.id))throw Error('A resposta não confirmou os mesmos conteúdos.');encontrados.add(erro.id);}if(encontrados.size!==ids.length)throw Error('A resposta não confirmou todos os conteúdos.');
   const inner=linhas.map(l=>{const p=l.politica,continuidade=tipo==='postagem'?resumoContinuidadePostagemI165(l):null,id=tipo==='edicao'?l.video.id:l.postagem.id,compromisso=continuidade?.compromisso||(p?.modalidade==='data'?'Postar em '+p.data+(p.hora?' às '+p.hora:''):p?.modalidade==='semana'?'Postar entre '+p.inicioSemana+' e '+p.fimSemana:'Data a conferir com a Amanda');const prazo=continuidade?.prazo||(tipo==='edicao'?(l.video?.prazoEntrega?'Editar até '+l.video.prazoEntrega:'Prazo da edição a combinar com a Amanda'):(p?.programarAte?'Agendar até '+p.programarAte+' às '+p.programarHora:'Prazo de programação a conferir'));const orientacao=continuidade?'<p class="meta">'+escI165(continuidade.recado)+'</p>':tipo==='postagem'&&p?'<span>Prioridade: '+escI165(({urgente:'Urgente',alta:'Alta',normal:'Normal'})[p.urgencia]||'A conferir')+'</span>'+(p.observacao?'<p style="white-space:pre-line"><b>Recado da Amanda:</b> '+escI165(p.observacao)+'</p>':''):'';return '<article class="i165-linha"><strong>'+escI165((tipo==='edicao'?l.video?.titulo:l.postagem?.titulo)||'Conteúdo')+'</strong><span>'+escI165(prazo)+'</span>'+(tipo==='postagem'?'<span>'+escI165(compromisso)+'</span>':'')+orientacao+'<span>'+escI165((l.obrigacoes||[]).map(o=>rotuloObrigacao(o)).join(' · ')||l.motivo||'Sem pendência nesta conferência')+'</span><button type="button" data-i165-abrir="'+escI165(id)+'">Abrir este conteúdo na fila</button></article>';}).join('');
   slot.innerHTML='<h3>'+(tipo==='edicao'?'O que chegou para você editar':'Compromissos da programação')+'</h3>'+inner+(erros.length?'<p role="alert">Não consegui conferir '+erros.length+' conteúdo(s). A fila e os campos anteriores foram mantidos.</p>':'')+(todos.length>20?'<div class="i165-acoes"><span>Conferindo '+(deslocamento+1)+' a '+Math.min(deslocamento+20,todos.length)+' de '+todos.length+'</span>'+(deslocamento?'<button type="button" data-i165-pagina="'+Math.max(0,deslocamento-20)+'">Anteriores</button>':'')+(deslocamento+20<todos.length?'<button type="button" data-i165-pagina="'+(deslocamento+20)+'">Próximos conteúdos</button>':'')+'</div>':'');slot.onclick=e=>{const pagina=e.target.closest?.('[data-i165-pagina]');if(pagina){const n=Number(pagina.dataset.i165Pagina);if(Number.isInteger(n)&&n>=0&&n<todos.length)void anexarLeitura(cont,todos,acao,tipo,n);return;}const b=e.target.closest?.('[data-i165-abrir]');if(!b)return;const id=b.dataset.i165Abrir;if(tipo==='edicao')abrirEditor(id);else abrirPostagem(id);};
  }catch{if(captura===chaveContexto(contexto())&&cont.__leituraI165===ticket&&status.isConnected)status.textContent='Não consegui conferir os compromissos agora. A fila e os campos anteriores continuam aqui; tente atualizar novamente.';}
 }
 function rotuloObrigacao(o){const t={preparar_legenda:'Legenda pendente',programar:'Agendamento pendente',confirmar_publicacao:'Conferir publicação real',corrigir_video:'Ajuste do vídeo',editar_video:'Edição pendente',definir_compromisso:'Data com a Amanda'};return(t[o.tipo]||'Conferir andamento')+' · '+(o.destinatario==='Fernanda'?'Júlia':o.destinatario)+(o.bloqueada?' (aguardando etapa anterior)':'');}
 return {tratarAprovacao,permitirLote,restaurarAprovacoes,anexarPostagens:(cont,ids)=>anexarLeitura(cont,ids,'consultar_postagens','postagem'),anexarEdicao:(cont,ids)=>anexarLeitura(cont,ids,'consultar_edicao','edicao'),fluxo};
}
