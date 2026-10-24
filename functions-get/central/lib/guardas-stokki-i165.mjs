export function familiaZeissR4(valor){return ['zeiss','zeens','otica-visao-araucaria'].includes(String(valor||'').trim().toLowerCase());}
export function fonteFisicaClienteR4(id,dados){
 const campos=['canonicalId','cliente','clienteSlug','clienteSlugRef','slug','slugAtivado','calendarClienteSlug','clienteId','clientId','calendarioDocumentoIdPlanejado','calendarioDocumentoId'];
 const ids=campos.map(k=>dados?.[k]).filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
 if(!familiaZeissR4(id)&&!ids.some(familiaZeissR4))return true;
 return String(id||'')==='zeiss'&&ids.every(v=>typeof v==='string'&&v.trim().toLowerCase()==='zeiss');
}
export function confirmarIdentidadeCalendarioVideoPostagemV118(postagem,video){
    const post=postagem||{},vid=video||{};
    const postItemId=String(post.calendarItemId||'').trim();
    const postCompetencia=String(post.calendarCompetencia||'').trim();
    const postSlug=String(post.calendarClienteSlug||post.cliente||'').trim();
    const videoItemId=String(vid.calendarItemId||'').trim();
    const videoCompetencia=String(vid.calendarCompetencia||'').trim();
    const videoSlug=String(vid.calendarClienteSlug||vid.cliente||'').trim();
    const postTemParte=!!postItemId||!!postCompetencia;
    const videoTemParte=!!videoItemId||!!videoCompetencia;
    if(!postTemParte&&!videoTemParte){
      return {estado:'legado',moderna:false,itemId:'',competencia:'',slug:''};
    }
    const postCompleta=!!postItemId&&!!postCompetencia&&!!postSlug;
    const videoCompleta=!!videoItemId&&!!videoCompetencia&&!!videoSlug;
    if(!postCompleta||!videoCompleta){
      return {estado:'incompleta',moderna:false,motivo:'Vídeo e postagem não possuem, nos dois documentos, item, competência e cliente completos.'};
    }
    if(postItemId!==videoItemId||postCompetencia!==videoCompetencia||postSlug.toLowerCase()!==videoSlug.toLowerCase()){
      return {estado:'divergente',moderna:false,motivo:'Vídeo e postagem divergem em item, competência ou cliente.'};
    }
    return {estado:'moderna',moderna:true,itemId:videoItemId,competencia:videoCompetencia,slug:videoSlug};
  }
export function clientePermiteReagendarR5(config,hoje=hojeLocal(),slug=''){
    if(!config || !(config.ativo===true||config.clienteInativo===false)) return false;
    if(['zeens','otica-visao-araucaria'].includes(slug.toLowerCase())) return false;
    if(config.clienteInativo===true||config.ativo===false||config.excluido===true||
       config.arquivado===true||config.arquivadoEm||config.unificadoEm||config.unificadoPara||
       config.semConteudoRecorrente===true||config.tipoEntrega==='entrega_direta'||
       ['inativo','encerrado','arquivado','cancelado'].includes(String(config.status||config.statusGerencia||''))) return false;
    if(config.slug && String(config.slug)!==slug) return false;
    const datas=['dataSaida','saidaProgramadaPara','inativoDesde','ativoAte'].filter(k=>config[k]);
    for(const k of datas){
      const valor=String(config[k]);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(valor)||!Number.isFinite(Date.parse(valor+'T12:00:00Z'))||
         new Date(valor+'T12:00:00Z').toISOString().slice(0,10)!==valor||valor<=hoje) return false;
    }
    if(config.saidaAtivaId&&!datas.length) return false;
    if(config.statusSaida && !['cancelada','programada'].includes(String(config.statusSaida))) return false;
    if(config.statusSaida==='programada'&&!datas.length) return false;
    return true;
  }

export function mesDoTextoConf(txt){
    const t = (txt||'').trim().toLowerCase();
    const nomes = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const semAcento = x => x.normalize('NFD').replace(/[̀-ͯ]/g,'');
    const textoSemAcento = semAcento(t);
    const i = nomes.findIndex(n => textoSemAcento.includes(semAcento(n)));
    const ano = (t.match(/(20\d{2})/)||[])[1];
    if(i < 0 || !ano) return '';
    return ano + '-' + String(i+1).padStart(2,'0');
  }

export function mesDoItemCalendario(cal, item){
    if(item && item.mes) return item.mes;
    if(cal && cal.mesLegado) return cal.mesLegado;
    /* O rótulo do documento é a âncora usada pelo próprio editor para
       carimbar conteúdo antigo. Ele precisa vencer metadados de aprovação:
       aprovação de setembro não pode transformar conteúdo legado de agosto
       em conteúdo de setembro. */
    const mesDoDocumento = mesDoTextoConf((cal&&cal.month)||'');
    if(mesDoDocumento) return mesDoDocumento;
    const ap = cal && cal.aprovacaoInterna;
    if(ap && ap.mes) return ap.mes;
    /* Algumas versões chegaram a gravar o mês somente na aprovação por
       mês. Se houver uma única chave, ela identifica com segurança os
       conteúdos antigos que ainda não têm `item.mes`. */
    const chavesAprovacao = Object.keys((cal&&cal.aprovacaoMeses)||{}).filter(Boolean);
    if(chavesAprovacao.length === 1) return chavesAprovacao[0];
    return '';
  }

export function resolverPostagemCanonicaLegendaV118(registros,video){
    const dadosVideo=video||{};
    const videoId=String(dadosVideo.id||dadosVideo.videoId||'').trim();
    const ativas=(Array.isArray(registros)?registros:[]).filter(p=>{
      if(!p||p.excluido===true) return false;
      return !videoId||String(p.videoId||'').trim()===videoId;
    });
    const itemId=String(dadosVideo.calendarItemId||'').trim();
    const competencia=String(dadosVideo.calendarCompetencia||'').trim();
    const slug=String(dadosVideo.calendarClienteSlug||dadosVideo.cliente||'').trim().toLowerCase();
    const temIdentidadeParcial=!!itemId||!!competencia;
    const identidadeModernaCompleta=!!itemId&&!!competencia&&!!slug;
    const postagemConfirmaIdentidade=p=>
      String(p?.calendarItemId||'').trim()===itemId&&
      String(p?.calendarCompetencia||'').trim()===competencia&&
      String(p?.calendarClienteSlug||p?.cliente||'').trim().toLowerCase()===slug;
    const postagemId=String(dadosVideo.postagemId||'').trim();
    if(postagemId){
      const exata=ativas.find(p=>String(p.id||'')===postagemId)||null;
      if(!exata) return {estado:'ponteiro_ausente',postagem:null,postagemId,candidatos:ativas};
      const identidadeExata=confirmarIdentidadeCalendarioVideoPostagemV118(exata,dadosVideo);
      if(identidadeExata.estado==='incompleta') return {estado:'identidade_incompleta',postagem:null,postagemId,candidatos:ativas};
      if(identidadeExata.estado==='divergente') return {estado:'identidade_divergente',postagem:null,postagemId,candidatos:ativas};
      return {estado:'confirmado',postagem:exata,origem:'video.postagemId',candidatos:ativas};
    }
    if(!temIdentidadeParcial){
      const incompativeis=ativas.filter(p=>confirmarIdentidadeCalendarioVideoPostagemV118(p,dadosVideo).estado!=='legado');
      if(incompativeis.length) return {estado:'identidade_divergente',postagem:null,candidatos:incompativeis};
      return {estado:'confirmacao_manual',postagem:null,candidatos:ativas};
    }
    if(!identidadeModernaCompleta) return {estado:'identidade_incompleta',postagem:null,candidatos:ativas};
    const exatas=ativas.filter(postagemConfirmaIdentidade);
    if(exatas.length===1) return {estado:'confirmado',postagem:exatas[0],origem:'calendarItemId+competencia+cliente',candidatos:ativas};
    if(exatas.length>1) return {estado:'ambiguo',postagem:null,candidatos:exatas};
    return {estado:'sem_postagem',postagem:null,candidatos:ativas};
  }
