/* Política compartilhada da programação. Nenhuma associação por nome ou título. */
export const REDES_I165=['instagram','linkedin','tiktok','youtube'];
export const jsonI165=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export const diaI165=d=>/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d||'')&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
export const horaI165=h=>/^([01]\d|2[0-3]):[0-5]\d$/.test(h||'');
export function horarioI165(agora=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(agora).replace(' ','T');}
export function chaveExcecaoI165(acao,data='',hora='',rede='geral'){if(!['agendar','cancelar'].includes(acao)||!['geral',...REDES_I165].includes(rede))throw Error('Ação ou plataforma inválida.');return [rede,acao,data,hora].join('|');}
export function identidadeI165(post,video){
  const a={calendarId:post.calendarClienteSlug||'',competencia:post.calendarCompetencia||'',itemId:post.calendarItemId||''};
  const b=video?{calendarId:video.calendarClienteSlug||'',competencia:video.calendarCompetencia||'',itemId:video.calendarItemId||''}:a;
  if(video&&video.cliente!==post.cliente)throw Error('Vídeo e postagem pertencem a clientes diferentes.');
  const tem=!!(a.competencia||a.itemId||b.competencia||b.itemId);
  if(tem&&(Object.values(a).some(x=>typeof x!=='string'||!x)||jsonI165(a)!==jsonI165(b)))throw Error('A identidade entre vídeo, postagem e calendário precisa ser conferida.');
  if(video&&(video.postagemId!==post.id||post.videoId!==video.id))throw Error('Vídeo e postagem não confirmam o mesmo vínculo.');
  return tem?a:null;
}
export function promessaI165({post,video,calendario,campanha,vinculo}){
  const origem=identidadeI165(post,video);let item=null,marca='',conferirOrigem=false,motivo='';
  if(origem){
    if(!calendario)throw Error('O calendário de origem não foi confirmado. Nenhuma associação foi inventada.');
    const ap=calendario?.aprovacaoMeses?.[origem.competencia],itens=ap?.retratoLiberadoV115?.items;
    if(!Array.isArray(itens)){conferirOrigem=true;motivo='Calendário anterior sem retrato publicado: confira o compromisso com a Amanda.';}
    else{const hits=itens.filter(x=>x&&!x.excluido&&x.itemId===origem.itemId);if(hits.length!==1)throw Error('O conteúdo não está identificado uma única vez na versão publicada.');item=hits[0];marca=ap.aprovadoEm||ap.retratoLiberadoV115.publicadoEm||'';}
  }else{conferirOrigem=true;motivo=post.origemManual?'Postagem manual: a data é combinada com a Amanda.':'Vídeo legado: o calendário não será associado por aproximação.';}
  const empresa=post.empresaOtavio||video?.empresaOtavio||item?.empresaOtavio||'';
  if([post.empresaOtavio,video?.empresaOtavio,item?.empresaOtavio].filter(Boolean).some(x=>x!==empresa))throw Error('A empresa do material está divergente.');
  let data='',hora='',fixa=false,programarAte='',programarHora='19:00',fonte='calendario';
  if(item){const proposta=item.dataPostagem||((Number.isInteger(Number(item.day))&&Number(item.day)>0)?origem.competencia+'-'+String(item.day).padStart(2,'0'):'');if(diaI165(proposta)){data=proposta;fixa=diaI165(item.dataPostagem)&&item.dataFlexivel!==true;}else{conferirOrigem=true;motivo='A data editorial precisa de conferência.';}hora=horaI165(item.horaPostagem)?item.horaPostagem:'';programarAte=diaI165(item.prazoProgramacao)?item.prazoProgramacao:'';}
  let campanhaFonte=null;
  if(vinculo){
    if(vinculo.cliente!==post.cliente||vinculo.postagemId!==post.id||vinculo.empresaOtavio!==empresa)throw Error('A campanha foi vinculada a outro cliente, empresa ou material.');
    const clientes=campanha?.clientes?.filter(c=>c.slug===vinculo.clienteSlug)||[],posts=clientes.flatMap(c=>(c.postagens||[]).filter(x=>x.id===vinculo.postagemCampanhaId));
    if(clientes.length!==1||posts.length!==1||campanha.arquivada||campanha.excluido)throw Error('A campanha vinculada mudou ou não possui uma identidade única.');
    const p=posts[0];if(!diaI165(p.dataPublicacao)||p.horaPublicacao&&!horaI165(p.horaPublicacao)||p.prazoProgramacao&&!diaI165(p.prazoProgramacao))throw Error('Confira a data, o horário e o prazo desta campanha.');
    if(p.empresaOtavio&&p.empresaOtavio!==empresa)throw Error('A campanha pertence a outra empresa.');
    data=p.dataPublicacao;hora=p.horaPublicacao||'';fixa=true;programarAte=p.prazoProgramacao||data;fonte='campanha';conferirOrigem=false;motivo='';campanhaFonte={id:vinculo.campanhaId,revisao:campanha.revisaoI7||0,clienteSlug:vinculo.clienteSlug,postagemCampanhaId:vinculo.postagemCampanhaId};
  }
  if(!programarAte&&data){const d=new Date(data+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);programarAte=d.toISOString().slice(0,10);}
  if(programarAte&&data&&programarAte>data)throw Error('O prazo de programar está depois da publicação. Amanda precisa ajustar a campanha.');
  return {cliente:post.cliente,empresaOtavio:empresa,origem,videoId:post.videoId||'',fonte:{calendarId:origem?.calendarId||'',competencia:origem?.competencia||'',publicacao:marca,campanha:campanhaFonte,vinculoRevisao:vinculo?.revisao||0},promessa:{data,hora,fixa,programarAte,programarHora,fonte},conferirOrigem,motivoConferencia:motivo};
}
export function exigirOperacaoI165(controle,{acao,data='',hora='',rede='geral',prova=''}={}){
  if(!controle||controle.schema!==1||!Number.isInteger(controle.revisao))throw Error('A programação ainda precisa ser conferida pelo serviço. Seus campos foram preservados.');
  if(acao==='publicar'){if(!String(prova).trim())throw Error('Registre um link ou uma confirmação curta da publicação real.');return;}
  if(acao==='desfazer')return;
  if(acao==='agendar'&&(!diaI165(data)||!horaI165(hora)))throw Error('Confira a data e o horário de Brasília.');
  const p=controle.promessa;
  if(!p.fixa)return;
  if(acao==='agendar'&&data===p.data&&(!p.hora||hora===p.hora))return;
  const ex=controle.excecoes?.[chaveExcecaoI165(acao,data,hora,rede)];
  if(ex?.revisao===controle.revisao&&ex.assinatura===controle.assinatura)return;
  throw Object.assign(Error(acao==='cancelar'?'Este conteúdo tem um compromisso fixo. Peça à Amanda a decisão de não publicar.':'A data combinada é '+p.data+(p.hora?' às '+p.hora:'')+'. Peça uma exceção à Amanda para usar outra data.'),{code:'get/excecao-amanda-necessaria',controleId:controle.id,proposta:{acao,data,hora,rede}});
}

export function incidentePublicacaoI165(controle,post,rede='geral'){
 const prova=post?.provasPublicacaoI165?.[rede];if(!prova)return null;const promessa=prova.promessaControle;
 if(!promessa||!diaI165(prova.data)||!horaI165(prova.hora))return{prova,esperada:'a conferir',motivo:'A prova precisa de conferência antes de encerrar o acompanhamento.'};
 const excecao=prova.excecaoAplicavel,autorizada=excecao?.revisao===prova.revisaoControle&&excecao?.assinatura===prova.assinatura;
 if(!promessa.fixa||prova.data===promessa.data&&(!promessa.hora||prova.hora===promessa.hora)||autorizada)return null;
 const recibo=controle.conferenciasPublicacao?.[rede];if(recibo?.prova===jsonI165(prova))return null;
 return{prova,esperada:promessa.data+(promessa.hora?' às '+promessa.hora:''),motivo:'Publicado em '+prova.data+' às '+prova.hora+'; combinado da versão: '+promessa.data+(promessa.hora?' às '+promessa.hora:'')+'. O fato foi preservado. Amanda precisa registrar o acompanhamento.'};
}
export function projetarLinhaI165(controle,post,agora=new Date()){
 if(!controle||!post||post.excluido||post.publicacaoStokki?.versao!==1&&['cancelada_manual','arquivada_sem_postagem'].includes(post.status))return [];
 const agoraLocal=horarioI165(agora),p=controle.promessa||{},redes=post.publicacaoStokki?.versao===1?post.publicacaoStokki.selecionadas:['geral'];
 return redes.flatMap(rede=>{
  const r=rede==='geral'?{data:post.dataAgendada,hora:post.horaAgendada,publicadaEm:post.status==='postado'?post.postadoEm:'',retirada:false}:post.publicacaoStokki.redes[rede];if(!r||r.retirada)return [];
  const incidente=r.publicadaEm?incidentePublicacaoI165(controle,post,rede):null;if(r.publicadaEm&&!incidente)return [];
  const programada=!!r.data,ex=controle.excecoes?.[chaveExcecaoI165('agendar',r.data,r.hora,rede)],autorizada=ex?.revisao===controle.revisao&&ex?.assinatura===controle.assinatura,divergente=programada&&p.fixa&&(r.data!==p.data||!!p.hora&&r.hora!==p.hora)&&!autorizada;
  const prazo=(p.programarAte||p.data||'')+'T'+(p.programarHora||'19:00'),publicacao=(r.data||p.data||'')+'T'+(r.hora||p.hora||'23:59');
  const fase=incidente?'publicacao_divergente':post.status==='em_correcao'?'aguardando_ajuste':divergente?'divergente':programada&&publicacao<=agoraLocal?'conferir_publicacao':programada?'programado':post.status==='aguardando_legenda'?'preparar_legenda':'programar';
  const vencida=!!incidente||divergente||!programada&&p.programarAte&&prazo<=agoraLocal||programada&&publicacao<=agoraLocal;
  return [{id:controle.id+'|'+rede,controleId:controle.id,postagemId:post.id,cliente:post.cliente,clienteNome:post.clienteNome||post.cliente,empresaOtavio:controle.empresaOtavio,titulo:post.titulo||'Conteúdo',rede,fase,vencida:!!vencida,programarAte:p.programarAte||'',publicarEm:p.data||'',hora:p.hora||'',dataAgendada:r.data||'',horaAgendada:r.hora||'',fixa:!!p.fixa,conferirOrigem:!!incidente||controle.conferirOrigem,motivoConferencia:incidente?.motivo||controle.motivoConferencia,versao:controle.assinatura+'|'+(r.publicadaEm||marcaTemporalI165(post.agendadoEm)||marcaTemporalI165(post.desfeitoEm)||post.status),responsavel:incidente?'Amanda':['aguardando_legenda','em_correcao'].includes(post.status)?'Chris':'Cecília'}];
 });
}
export function ordenarFilaI165(linhas){return [...linhas].sort((a,b)=>Number(b.vencida)-Number(a.vencida)||(a.programarAte||a.publicarEm||'9999').localeCompare(b.programarAte||b.publicarEm||'9999')||a.clienteNome.localeCompare(b.clienteNome,'pt-BR')||a.id.localeCompare(b.id));}

export function marcaTemporalI165(v){if(!v)return '';if(typeof v==='string')return v;if(typeof v.toDate==='function')return v.toDate().toISOString();if(v instanceof Date)return v.toISOString();const sec=v.seconds??v._seconds;if(Number.isFinite(sec))return new Date(sec*1000+Math.floor((v.nanoseconds??v._nanoseconds??0)/1000000)).toISOString();throw Error('A data da programação precisa ser conferida.');}

export function assinaturaPostagemCompletaI165(v){const normalizar=x=>{if(x&&typeof x.toDate==='function'){const s=x.seconds??x._seconds,n=x.nanoseconds??x._nanoseconds??0;if(Number.isFinite(s))return{__timestampI165:{seconds:s,nanoseconds:n}};}if(Array.isArray(x))return x.map(normalizar);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalizar(x[k])]));return x;};return jsonI165(normalizar(v));}
