// O Radar observa as fontes; uma conferência nunca publica ou cancela conteúdo.
export const VERSION = 1;
const DAY = 86400000;
const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d||'') && Number.isFinite(Date.parse(d+'T12:00:00Z')) && new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
export function instant(v) {
  if (!v) return 0;
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  const n = typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(n) ? n : 0;
}
export function startWaiting(post) {
  return Math.max(...['criadoEm','legendaEm','aprovadoEm','desfeitoEm','ajusteEm','reabertoEm'].map(k=>instant(post?.[k])),Number(post?.__liberacaoI90)||0);
}
export function civil(v = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
}
export function civilDays(date, now) {
  return validDate(date) ? Math.max(0, Math.round((Date.parse(civil(now)+'T12:00:00Z') - Date.parse(date+'T12:00:00Z')) / DAY)) : 0;
}
export function stable(x) {
  if (Array.isArray(x)) return '['+x.map(stable).join(',')+']';
  if (x && typeof x === 'object') return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';
  return JSON.stringify(x ?? null);
}
export const slug = r => String(r?.cliente || r?.clienteSlug || '');
export const active = r => !r.excluido && !['cancelada','cancelado','arquivada','arquivado','arquivada_sem_postagem','retirada','retirado'].includes(r.status);
export function title(r) {
  let t=String(r.titulo || r.nome || 'Sem título'), n=String(r.clienteNome || '');
  for(let i=0;i<2 && n;i++) {
    const clean=t.replace(/^✂️?\s*/, '');
    if(clean.toLocaleLowerCase().startsWith(n.toLocaleLowerCase()+' — ')) t=clean.slice(n.length+3); else break;
  }
  return t;
}
const routeNames = {agendamentos:'Abrir gravação',videos_producao:'Abrir vídeo',postagens:'Abrir postagem',stories_semanais:'Abrir Stories'};
export function calculate(data, now=Date.now()) {
  const agendas=data.agendamentos, videos=data.videos_producao, posts=data.postagens, stories=data.stories_semanais;
  if (![agendas,videos,posts,stories].every(Array.isArray)) throw Error('Fontes incompletas. Atualize o Radar para conferir.');
  const items=[];
  const push=(elo,col,r,description,details,signature,extra={})=>{
    items.push({key:elo+'_'+r.id,elo,col,id:r.id,cliente:slug(r),clienteNome:r.clienteNome||slug(r)||'Cliente a conferir',titulo:title(r),description,details,route:routeNames[col],dias:null,kind:'acao',...extra,signature:stable({version:VERSION,elo,col,id:r.id,cliente:slug(r),signature})});
  };
  const linked=new Map(), postByVideo=new Map(), duplicates=new Map();
  for(const v of videos) if(v.agendamentoId) {const k=String(v.agendamentoId);if(!linked.has(k))linked.set(k,[]);linked.get(k).push(v);}
  for(const p of posts) if(p.videoId) {if(!postByVideo.has(p.videoId))postByVideo.set(p.videoId,[]);postByVideo.get(p.videoId).push(p);}
  for(const a of agendas) if(active(a)&&a.status==='realizado') {
    const k=stable([slug(a),a.data,a.hora,a.filmmaker]);if(!duplicates.has(k))duplicates.set(k,[]);duplicates.get(k).push(a.id);
  }
  for(const a of agendas) {
    const qty=Number(a.qtdVideosRealizados);
    if(!active(a)||a.status!=='realizado'||!Number.isFinite(qty)||qty<=0)continue;
    // Lançamento é um fato histórico: descarte posterior não desfaz o envio.
    const found=(linked.get(a.id)||[]).filter(v=>slug(v)===slug(a));
    const twins=duplicates.get(stable([slug(a),a.data,a.hora,a.filmmaker]))||[];
    const modern=Number(a.registroProducaoVersao)>0 || Array.isArray(a.conteudosRealizados);
    if(found.length>=qty&&twins.length<2)continue;
    const kind=twins.length>1||!modern?'conferencia':'acao';
    const description=twins.length>1?'Há outra gravação no mesmo dia, hora e responsável. Confira os registros.':!modern?'Registro antigo sem vínculo suficiente para afirmar que faltam vídeos.':`${qty-found.length} vídeo(s) declarado(s) sem lançamento vinculado a esta gravação.`;
    const details=[`Gravação: ${a.dataProducao||a.data||'data não informada'} ${a.hora||''}`,`Responsável: ${a.registradoPor||a.filmmaker||'a conferir'}`,`Declarados: ${qty} · lançamentos vinculados: ${found.length} (inclui descartados)`,...found.map(v=>`${v.id} · ${title(v)}${!active(v)?' · arquivado':''}`)];
    if(twins.length>1)details.push('Registros semelhantes: '+twins.join(', '));
    push('A','agendamentos',a,description,details,{qty,date:a.data,hora:a.hora,person:a.filmmaker,version:a.registroProducaoVersao,found:found.map(v=>v.id).sort(),twins:[...twins].sort()},{kind,titulo:'Gravação de '+(a.dataProducao||a.data||'data não informada')});
  }
  for(const v of videos) {
    if(!active(v)||v.status==='finalizado'||!(v.status==='aprovado'||v.clienteAprovou===true))continue;
    const ps=(postByVideo.get(v.id)||[]).filter(p=>slug(p)===slug(v));
    if(ps.some(active))continue;
    push('B','videos_producao',v,ps.length?'Vídeo aprovado com postagem arquivada. Confira o motivo e o que aconteceu na operação.':'Vídeo aprovado sem postagem vinculada.',
      ['Confirmação do cliente: '+(v.clienteAprovouEm||'sem data'),...ps.map(p=>`${p.id} · ${p.status||'sem estado'} · ${p.motivoExclusao||'arquivada'}`)],
      {status:v.status,aprovou:v.clienteAprovou,em:v.clienteAprovouEm,posts:ps.map(p=>({id:p.id,status:p.status,excluido:p.excluido,em:p.excluidoEm})).sort((a,b)=>a.id.localeCompare(b.id))},{kind:ps.length?'conferencia':'acao'});
  }
  const videoMap=new Map(videos.map(v=>[v.id,v]));
  for(const p of posts) {
    if(!active(p))continue;
    const v=videoMap.get(p.videoId);
    const returned=Math.max(instant(p.desfeitoEm),instant(p.ajusteEm),instant(p.reabertoEm));
    const released=Math.max(instant(p.criadoEm),instant(p.aprovadoEm),instant(v?.clienteAprovouEm),returned);
    if(['aguardando_legenda','aguardando_agendamento'].includes(p.status)) {
      const start=Math.max(released,p.status==='aguardando_agendamento'?startWaiting(p):0);
      const days=start?Math.max(0,Math.floor((now-start)/DAY)):null;
      if(days!==null&&days<2)continue;
      const caption=p.status==='aguardando_legenda', elo=caption?'C':'D';
      push(elo,'postagens',p,caption?'Legenda pendente.':'Agendamento pendente.',
        [start?'Espera contada desde '+new Date(start).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Sem data confiável para calcular a espera.',...(returned?['O agendamento anterior foi desfeito; a espera recomeça nesse retorno.']:[]),p.calendarCompetencia?'Calendário: '+p.calendarCompetencia:'Sem competência de calendário confirmada'],
        {status:p.status,start,videoId:p.videoId,competencia:p.calendarCompetencia,legenda:p.legenda||''},{dias:days,kind:days===null?'conferencia':'acao'});
    }
    const networks=p.publicacaoStokki?.redes;
    if(networks&&Array.isArray(p.publicacaoStokki.selecionadas)) {
      const due=p.publicacaoStokki.selecionadas.filter(n=>networks[n]&&!networks[n].retirada&&!networks[n].publicadaEm&&civilDays(networks[n].data,now)>0);
      if(!due.length)continue;
      push('E','postagens',p,'Falta confirmar a publicação nas plataformas abaixo. Não significa que o vídeo não saiu.',due.map(n=>`${n}: ${networks[n].data} ${networks[n].hora||''}`),
        {networks:p.publicacaoStokki.redes,selected:p.publicacaoStokki.selecionadas},{dias:Math.max(...due.map(n=>civilDays(networks[n].data,now)))});
    } else if(p.status==='agendado'&&civilDays(p.dataAgendada,now)>0) {
      push('E','postagens',p,'Falta confirmar a publicação no sistema. Confira se ela já saiu.',['Agendada: '+p.dataAgendada+' '+(p.horaAgendada||'')],
        {status:p.status,date:p.dataAgendada,time:p.horaAgendada,em:p.agendadoEm},{dias:civilDays(p.dataAgendada,now)});
    }
  }
  for(const s of stories) {
    if(!active(s)||s.status!=='pendente')continue;
    const start=instant(s.criadoEm),days=start?Math.max(0,Math.floor((now-start)/DAY)):null;
    if(days!==null&&days<3)continue;
    push('F','stories_semanais',s,'Story aguardando retorno do cliente.', ['Semana: '+(s.semana||'a conferir')],
      {status:s.status,semana:s.semana,start,titulo:s.titulo},{dias:days,semana:s.semana||'',kind:days===null?'conferencia':'acao'});
  }
  return items.sort((a,b)=>a.elo.localeCompare(b.elo)||a.clienteNome.localeCompare(b.clienteNome)||a.key.localeCompare(b.key));
}
export function applyFollowups(items, notes, today=civil()) {
  const byKey=new Map(notes.map(n=>[n.chave,n]));
  return items.map(i=>{
    const note=byKey.get(i.key), valid=note?.versao===VERSION&&note?.assinatura===i.signature&&['aberto','acompanhamento','conferido'].includes(note.estado)&&typeof note.motivo==='string'&&note.motivo.trim().length>=5&&(note.estado!=='acompanhamento'||validDate(note.reverEm));
    const expired=valid&&note.estado==='acompanhamento'&&note.reverEm<=today;
    const state=valid&&!expired?note.estado:'aberto';
    return {...i,note,state:state||'aberto',changed:!!note&&!valid,expired};
  });
}
export function validateFollowup({estado,motivo,reverEm}, today=civil()) {
  motivo=String(motivo||'').trim();reverEm=String(reverEm||'');
  if(!['aberto','acompanhamento','conferido'].includes(estado))throw Error('Escolha uma situação.');
  if(motivo.length<5||motivo.length>2000)throw Error('Descreva o motivo (entre 5 e 2.000 caracteres).');
  if(estado==='acompanhamento'&&(!validDate(reverEm)||reverEm<=today))throw Error('Escolha uma data futura para rever.');
  return {estado,motivo,reverEm:estado==='acompanhamento'?reverEm:''};
}
export function summary(items) {
  const aberto=items.filter(i=>i.state!=='conferido'&&i.state!=='acompanhamento');
  return {acao:aberto.filter(i=>i.kind==='acao').length,conferencia:aberto.filter(i=>i.kind==='conferencia').length,acompanhamento:items.filter(i=>i.state==='acompanhamento').length,conferido:items.filter(i=>i.state==='conferido').length};
}
export function digest(items) {
  if(items.erro)return 'Indisponível — não foi possível conferir as fontes.';
  const s=summary(items);
  return `${s.acao} para agir · ${s.conferencia} para conferir · ${s.acompanhamento} em acompanhamento · ${s.conferido} conferido(s). Ver detalhes na Gerência.`;
}
