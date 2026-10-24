// Funções literais CP101, exportadas para uso puro/servidor; não importa I164.
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

export function gerarItemIdCalendarioV101(semente){
    const segura=String(semente||'').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,120);
    if(segura) return 'calitem_post_'+segura;
    try{
      if(typeof crypto?.randomUUID === 'function') return 'item_' + crypto.randomUUID().replace(/-/g,'');
    }catch(e){}
    return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,14);
  }

export function atualizarItemAgendamentoPautaR1a(item,{acao,data='',postagemId='',competencia='',ator='',agora=''}={}){
    const atual={...(item||{})}, id=String(postagemId||'');
    if(acao==='desfazer'){
      const retrato=atual.agendamentoAnteriorV118&&String(atual.agendamentoAnteriorV118.postagemId||'')===id
        ? atual.agendamentoAnteriorV118:null;
      const restaurado={...atual,day:retrato?.day??atual.day,dataPostagem:retrato?.dataPostagem||'',
        agendado:retrato?.agendado===true,posted:retrato?.posted===true,postagemId:retrato?.postagemIdAnterior||'',
        agendamentoForaCompetenciaV139:retrato?.agendamentoForaCompetenciaV139Anterior||null,
        agendamentoAnteriorV118:null};
      if(restaurado.day===undefined) delete restaurado.day;
      return restaurado;
    }
    if(acao!=='agendar') throw new Error('Operação temporal inválida.');
    if(!data || dataFixaDoItemCalendario({dataPostagem:data})!==data) throw new Error('Escolha uma data de publicação válida.');
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error('A competência editorial é inválida; a pauta foi preservada.');
    // I109: a data real pode antecipar ou adiar a pauta sem mudar sua origem.
    const mesReal=data.slice(0,7), fora=mesReal!==competencia;
    const proximo={...atual,dataPostagem:data,agendado:true,posted:false,postagemId:id,
      agendamentoAnteriorV118:{postagemId:id,day:atual.day??null,dataPostagem:atual.dataPostagem||'',
        agendado:atual.agendado===true,posted:atual.posted===true,postagemIdAnterior:atual.postagemId||'',
        agendamentoForaCompetenciaV139Anterior:atual.agendamentoForaCompetenciaV139||null},
      agendamentoForaCompetenciaV139:fora?{
        competenciaOrigem:competencia,dataReal:data,confirmadoPor:String(ator||''),confirmadoEm:String(agora||'')
      }:null};
    if(!fora) proximo.day=Number(data.slice(8,10));
    return proximo;
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

export function marcadorTemporalAlertaV135(valor){
    if(valor===undefined||valor===null||valor==='') return '';
    if(typeof valor==='string'||typeof valor==='number') return String(valor);
    const segundos=Number(valor.seconds??valor._seconds);
    const nanos=Number(valor.nanoseconds??valor._nanoseconds??0);
    if(Number.isFinite(segundos)) return String(segundos)+'_'+String(Number.isFinite(nanos)?nanos:0);
    return '';
  }

export function chaveCicloAlertaCanonicoV135(tipo,fonte){
    const especie=String(tipo||'').toLowerCase();
    const atual=fonte&&typeof fonte==='object'?fonte:{};
    const data=especie==='postagem'?String(atual.dataAgendada||''):String(atual.data||'');
    const hora=especie==='postagem'?String(atual.horaAgendada||''):String(atual.hora||'');
    const revisao=especie==='postagem'
      ? marcadorTemporalAlertaV135(atual.agendadoEm||atual.reagendadoEm||atual.criadoEm)
      : marcadorTemporalAlertaV135(atual.reagendadoEm||atual.sessaoPlanejadoEm||atual.criadoEm);
    return [especie||'alerta',data||'sem_data',hora||'sem_hora',revisao||'sem_revisao'].join('|');
  }

export function cicloFonteAlertaCanonicoV135(tipo,fonte){
    const especie=String(tipo||'').toLowerCase();
    const atual=fonte&&typeof fonte==='object'?fonte:{};
    const marcador=especie==='postagem'
      ? atual.confirmacaoPostagemCriada
      : atual.alertaGravacaoFantasmaCriado;
    if(marcador===true) return 'legado';
    if(typeof marcador==='string'&&marcador.trim()) return marcador.trim();
    return chaveCicloAlertaCanonicoV135(especie,atual);
  }

export function cicloDemandaAlertaCanonicoV135(demanda){
    return String(demanda?.alertaCicloV135||'').trim()||'legado';
  }

export function demandaPertenceLimpezaCanonicaV135(demanda,alvo){
    const d=demanda||{},a=alvo||{};
    const fonteId=String(a.fonteId||'').trim();
    if(!fonteId) return false;
    if(a.tipo==='agendamento_postagem'){
      const ciclo=String(a.ciclo||'').trim();
      if(!ciclo) return false;
      const idEsperado='reagendar_post_'+fonteId.replace(/[^A-Za-z0-9_-]/g,'_').slice(0,150);
      return String(d.postagemId||'').trim()===fonteId &&
        String(d.tipoEspecial||'')==='reagendar_postagem_v118' &&
        String(d.id||'')===idEsperado &&
        String(d.operationId||'')==='reagendar_post_'+fonteId &&
        cicloDemandaAlertaCanonicoV135(d)===ciclo;
    }
    if(!['gravacao','postagem'].includes(String(a.tipo||''))) return false;
    const ciclo=String(a.ciclo||'').trim();
    if(!ciclo) return false;
    const tipoEspecial=String(d.tipoEspecial||'').trim();
    const titulo=String(d.titulo||'');
    const contratoReconhecido=a.tipo==='gravacao'
      ? (tipoEspecial==='gravacao_sem_registro_v135'||
         (!tipoEspecial&&titulo.includes('Gravação de')&&titulo.includes('sem registro')))
      : (tipoEspecial==='confirmacao_publicacao_v135'||
         (!tipoEspecial&&(titulo.startsWith('📲 Confirmar publicação')||
           (titulo.includes('Postagem de')&&titulo.includes('sem confirmação')))));
    if(!contratoReconhecido) return false;
    const vinculo=vinculoDemandaAlertaCanonicoV135(d);
    return !!vinculo && vinculo.tipo===a.tipo &&
      String(vinculo.fonteId||'')===fonteId &&
      cicloDemandaAlertaCanonicoV135(d)===ciclo;
  }

export function demandaAbertaParaLimpezaV135(demanda){
    const d=demanda||{};
    return d.excluido!==true &&
      !['aprovada','cancelada','cancelada_automaticamente'].includes(String(d.status||''));
  }

export function vinculoDemandaAlertaCanonicoV135(demanda){
    const d=demanda||{};
    /* Decisões e avisos informativos podem carregar o mesmo ponteiro, mas
       têm contrato próprio e não são cobrança de baixa operacional. */
    if(d.ehDecisao===true || d.ehAviso===true) return null;
    const agendamentoId=String(d.agendamentoId||'').trim();
    const agendamentoLegado=String(d.agendamentoRefId||'').trim();
    const postagemId=String(d.postagemId||'').trim();
    const titulo=String(d.titulo||'');
    const tipoEspecial=String(d.tipoEspecial||'');
    const ehAlertaPostagem=!!postagemId&&(
      tipoEspecial==='confirmacao_publicacao_v135'||
      titulo.startsWith('📲 Confirmar publicação')||
      (titulo.includes('Postagem de')&&titulo.includes('sem confirmação'))
    );
    const ehAlertaGravacao=!!(agendamentoId||agendamentoLegado)&&(
      tipoEspecial==='gravacao_sem_registro_v135'||
      (titulo.includes('Gravação de')&&titulo.includes('sem registro'))
    );
    /* Legenda, agendamento editorial e outras demandas também podem ter
       postagemId/agendamentoId. Elas não pertencem a esta reconciliação. */
    if(!ehAlertaPostagem&&!ehAlertaGravacao) return null;
    if(agendamentoId && agendamentoLegado && agendamentoId!==agendamentoLegado){
      return {tipo:'inconsistente',motivo:'dois_agendamentos_divergentes'};
    }
    if((ehAlertaPostagem&&!!(agendamentoId||agendamentoLegado)) ||
       (ehAlertaGravacao&&!!postagemId)){
      return {tipo:'inconsistente',motivo:'duas_fontes_divergentes'};
    }
    if(ehAlertaPostagem) return {tipo:'postagem',fonteId:postagemId};
    if(ehAlertaGravacao) return {tipo:'gravacao',fonteId:agendamentoId||agendamentoLegado};
    return null;
  }

export function dataFixaDoItemCalendario(it){
    if(!it || it.excluido===true || it.dataFlexivel===true) return '';
    const valor=String(it.dataPostagem||'').trim();
    const m=valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return '';
    const ano=Number(m[1]), mes=Number(m[2]), dia=Number(m[3]);
    const data=new Date(Date.UTC(ano,mes-1,dia));
    return data.getUTCFullYear()===ano&&data.getUTCMonth()===mes-1&&data.getUTCDate()===dia ? valor : '';
  }

export function prepararItemCalendarioConfirmacaoR5(post,identidade,cal,id,acao){
    if(!cal){
      if(identidade.moderna) throw new Error('O calendário canônico não existe mais. Nenhuma baixa foi feita.');
      return null;
    }
    const items=(Array.isArray(cal.items)?cal.items:[]).map(it=>it?{...it}:it);
    const candidatos=items.map((it,idx)=>({it,idx})).filter(({it})=>it&&it.excluido!==true&&
      (identidade.moderna
        ? String(it.itemId||'').trim()===identidade.itemId&&mesDoItemCalendario(cal,it)===identidade.competencia
        : String(it.postagemId||'')===id));
    if(candidatos.length>1||(!candidatos.length&&identidade.moderna)) throw new Error('O item editorial está ausente ou duplicado. Nenhum item foi escolhido por posição.');
    if(!candidatos.length) return null;
    const {it,idx}=candidatos[0];
    if(String(it.postagemId||'')!==id) throw new Error('O item aponta para outra postagem. A pauta foi preservada.');
    if(['arquivar','devolver'].includes(acao)&&it.posted===true) throw new Error('O item já registra publicação. Regularize o fato; não arquive como não publicado.');
    items[idx]={...it,agendado:false,...(['confirmar','regularizar'].includes(acao)?{posted:true}: {})};
    return items;
  }
