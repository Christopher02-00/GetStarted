import {resolverProgramacaoCp111} from '../compat-legado-programacao-r83.mjs';
import {exigirI165, idFisicoI165, jsonCanonicoI165, dataCivilI165, horaCivilI165, instanteI165, horarioBrasiliaI165, responsavelLegendaI165} from './gs-contexto-operacional-i165.mjs';
import {REDES_I165, conferirVinculoCanonicoI165, conferirDiretrizAtualI165, validarOperacaoProgramacaoI165} from './gs-diretriz-publicacao-i165.mjs';
import {pendenciaLegendaI79} from './gs-legenda-qualidade-i79.mjs';

const texto = v => typeof v === 'string' ? v.trim() : '';
const atribuido = v => !!v && v.excluido !== true && typeof v.editorAtribuido === 'string' && !!v.editorAtribuido.trim() && ['aguardando_edicao','correcao'].includes(v.status);
const assinaturaAtribuicao = v => jsonCanonicoI165([v.id,v.editorAtribuido,v.editorAtribuidoEm || '',v.edicaoManual?.estado === 'encaminhado' ? v.edicaoManual.tratadoEm || '' : '',v.envioManualI67 || '']);
function origemAtribuicao(v) {
  if (v.edicaoManual) {
    if (v.edicaoManual.estado !== 'encaminhado' || v.edicaoManual.materialConfirmado !== true) return null;
    return {tipo:'I34', marca:v.editorAtribuidoEm || v.edicaoManual.tratadoEm || ''};
  }
  if (v.editorAtribuidoEm) return {tipo:'I53', marca:v.editorAtribuidoEm, operacao:v.correcaoEnvioI53?.operacaoId || ''};
  if (v.envioManualI67) return {tipo:'I67', marca:v.envioManualI67};
  return null;
}
/** Persist the returned episode in a server transaction. A title/notice-read is never an assignment. */
export function reconciliarEpisodioEdicaoI165({anterior = null, atual, episodioPersistido = null, eventoId = '', observacaoLegado = null, agora}) {
  exigirI165(atual && idFisicoI165(atual.id), 'video', 'Confirme o vídeo físico do episódio.');
  const em = instanteI165(agora);
  if (anterior) exigirI165(anterior.id === atual.id, 'video', 'O evento deve comparar o mesmo vídeo.');
  if (episodioPersistido) exigirI165(episodioPersistido.videoId === atual.id, 'episodio', 'O episódio pertence a outro vídeo.');
  if (!atribuido(atual)) return {estado:'sem_obrigacao', atual:null, encerrar:episodioPersistido?.chave || null, motivo:atual.excluido === true ? 'excluido' : 'fonte_avancou'};
  const origem = origemAtribuicao(atual);
  if (atual.edicaoManual && !origem) return {estado:'aguarda_encaminhamento_real', atual:null, encerrar:episodioPersistido?.chave || null};
  const correcao = atual.status === 'correcao';
  const marcaCorrecao = correcao ? atual.correcaoSolicitadaEm || '' : '';
  const mudou = !!anterior && (!atribuido(anterior) || anterior.editorAtribuido !== atual.editorAtribuido || assinaturaAtribuicao(anterior) !== assinaturaAtribuicao(atual) || anterior.status !== atual.status || (correcao && anterior.correcaoSolicitadaEm !== atual.correcaoSolicitadaEm));
  const assinaturaFonte = jsonCanonicoI165([assinaturaAtribuicao(atual),correcao,marcaCorrecao]);
  if (!mudou && episodioPersistido?.assinaturaFonte === assinaturaFonte) return {estado:'mantido', atual:episodioPersistido, encerrar:null};
  let marca = origem?.marca || '';
  let tipo = origem?.tipo || 'legado_observado';
  if (correcao) marca = marcaCorrecao;
  if (mudou) {
    exigirI165(idFisicoI165(eventoId), 'evento', 'A mudança real de atribuição precisa de um evento estável.');
    // A→B→A and re-opening an old material produce distinct episodes, even if legacy fields did not advance.
    marca = eventoId;
    tipo = correcao ? 'correcao_evento' : 'atribuicao_evento';
  } else if (!marca) {
    exigirI165(observacaoLegado?.confirmada === true && observacaoLegado.videoId === atual.id && idFisicoI165(observacaoLegado.id), 'episodio-legado', 'O material legado precisa de uma observação inicial declarada; não será inventada nova atribuição.');
    marca = observacaoLegado.id;
  }
  const chave = jsonCanonicoI165(['edicao',atual.id,atual.editorAtribuido,tipo,marca]);
  const episodio = {schema:1, chave, videoId:atual.id, destinatario:atual.editorAtribuido, tipo, marca, assinaturaFonte, em, correcao};
  return {estado:'novo', atual:episodio, encerrar:episodioPersistido && episodioPersistido.chave !== chave ? episodioPersistido.chave : null};
}

export function obrigacaoEdicaoI165(video, episodio) {
  if (!atribuido(video)) return [];
  exigirI165(episodio?.videoId === video.id && episodio.destinatario === video.editorAtribuido, 'episodio', 'Confira o episódio real de edição antes de avisar.');
  exigirI165(episodio.assinaturaFonte === jsonCanonicoI165([assinaturaAtribuicao(video),video.status === 'correcao',video.status === 'correcao' ? video.correcaoSolicitadaEm || '' : '']), 'episodio-avancou', 'A atribuição avançou; reconcilie o episódio antes de avisar.');
  return [{chave:jsonCanonicoI165(['edicao',video.id,episodio.chave,video.editorAtribuido]), tipo:video.status === 'correcao' ? 'corrigir_video' : 'editar_video', fonte:{colecao:'videos_producao',id:video.id}, episodio:episodio.chave, destinatario:video.editorAtribuido, prazo:video.prazoEntrega || '', urgencia:'normal', bloqueada:false}];
}

function redesDaPostagem(post) {
  const s = post.publicacaoStokki;
  if (!s) return [{rede:'geral', data:post.dataAgendada || '', hora:post.horaAgendada || '', publicadaEm:post.status === 'postado' ? post.postadoEm || 'sem_marca_legada' : '', retirada:['cancelada_manual','arquivada_sem_postagem'].includes(post.status)}];
  exigirI165(s.versao === 1 && Array.isArray(s.selecionadas) && s.selecionadas.length > 0 && new Set(s.selecionadas).size === s.selecionadas.length && s.selecionadas.every(r => REDES_I165.includes(r)), 'redes', 'As plataformas selecionadas precisam estar confirmadas.');
  return s.selecionadas.map(rede => { const r = s.redes?.[rede]; exigirI165(r && typeof r === 'object', 'rede-ausente', 'A leitura de uma plataforma falhou; ela não foi concluída.'); return {rede,...r}; });
}
/** Returns obligations, never writes a post, completes a task or equates a provider receipt with a human action. */
export function obrigacoesConteudoI165({postagem, video = null, diretriz = null, programacaoCp111 = null, configEntrega, processoEditorial = null, responsavelLegendaExplicito, permitirAgendarSemLegendaI90, agora, clienteAtivo}) {
  exigirI165(typeof clienteAtivo === 'boolean' && ['postagem','entrega_direta'].includes(configEntrega?.modo), 'configuracao', 'Confirme o estado operacional e o modo real de entrega do cliente.');
  exigirI165(typeof permitirAgendarSemLegendaI90 === 'boolean', 'i90', 'Confirme a política existente de agendamento com legenda pendente.');
  conferirVinculoCanonicoI165(postagem, video);
  const local = horarioBrasiliaI165(agora);
  const resultado = {obrigacoes:[], estado:'acompanhado', motivo:'', postagemId:postagem.id};
  if (!clienteAtivo || postagem.excluido === true || video?.excluido === true || configEntrega.modo === 'entrega_direta') return {...resultado, estado:'fora_do_escopo', motivo:!clienteAtivo ? 'cliente_inativo_conferir_transicao' : configEntrega.modo === 'entrega_direta' ? 'entrega_direta' : 'excluido'};
  const add = (tipo,destinatario,extra={}) => {
    const o = {tipo,destinatario,fonte:{colecao:'postagens',id:postagem.id},videoId:video?.id || '',revisaoDiretriz:diretriz?.revisao || 0,rede:'geral',prazo:'',urgencia:diretriz?.politica?.urgencia || 'normal',bloqueada:false,...extra};
    o.chave = jsonCanonicoI165([tipo,postagem.id,video?.id || '',diretriz?.revisao || 0,destinatario,o.rede,o.episodio || '']);
    o.vencida = !!o.prazo && o.prazo <= local;
    resultado.obrigacoes.push(o);
  };
  const corrigindo = postagem.status === 'em_correcao' || video?.status === 'correcao';
  if (corrigindo) {
    const editor = texto(video?.editorAtribuido);
    add(editor ? 'corrigir_video' : 'definir_responsavel_correcao',editor || 'Amanda',{episodio:video?.correcaoSolicitadaEm || postagem.correcaoSolicitadaEm || 'correcao_sem_marca_conferir'});
    return {...resultado,estado:'programacao_suspensa',motivo:'video_em_correcao'};
  }
  // Quality approval alone is insufficient; it must follow the existing client confirmation contract.
  const finalizadoPorPublicacao=video?.status==='finalizado'&&(postagem.status==='postado'&&['postagem_publicada','publicacao_stokki_i30'].includes(video.finalizadoVia)||postagem.status==='cancelada_manual'&&video.finalizadoVia==='publicacao_stokki_i30'&&postagem.publicacaoStokki?.versao===1&&Array.isArray(postagem.publicacaoStokki.selecionadas)&&postagem.publicacaoStokki.selecionadas.length>0&&postagem.publicacaoStokki.selecionadas.every(r=>postagem.publicacaoStokki.redes?.[r]?.retirada===true));
  if (video && ((!finalizadoPorPublicacao&&video.status !== 'aprovado') || video.clienteAprovou !== true)) return {...resultado,estado:'aguardando_cliente',motivo:'sem_liberacao_cliente'};
  const referencia=programacaoCp111||resolverProgramacaoCp111({diretriz});
  if(referencia.modo!=='orientacao_amanda'){
    const pendente=postagem.status==='aguardando_legenda'||pendenciaLegendaI79(postagem);
    if(pendente)add('preparar_legenda',responsavelLegendaI165({processoEditorial,responsavelExplicito:responsavelLegendaExplicito}));
    for(const r of redesDaPostagem(postagem)){
      if(r.retirada||r.publicadaEm)continue;
      if(r.data){exigirI165(dataCivilI165(r.data)&&horaCivilI165(r.hora),'agenda-fonte','A data agendada precisa ser conferida.');if(r.data+'T'+r.hora<=local)add('confirmar_publicacao','Cecília',{rede:r.rede,prazo:r.data+'T'+r.hora});continue;}
      const bloqueada=!referencia.disponivel||pendente&&!permitirAgendarSemLegendaI90;
      add('programar','Cecília',{rede:r.rede,bloqueada,motivoBloqueio:!referencia.disponivel?'origem_programacao_a_conferir':pendente&&!permitirAgendarSemLegendaI90?'aguardando_legenda_politica_I90':'',conferenciaOrientacaoCp110Obrigatoria:true,fonteProgramacaoCp111:referencia.modo});
    }
    return {...resultado,estado:referencia.disponivel?'referencia_programacao_atual':'conferir_origem',motivo:referencia.motivo||''};
  }
  const p = conferirDiretrizAtualI165(diretriz,video,postagem);
  const orientacaoAmanda = diretriz.autoria?.papel === 'Amanda';
  let precisaOrientacaoAmanda = false;
  if (p.modalidade === 'a_definir') add('definir_compromisso','Amanda',{prazo:p.definirAte + 'T' + p.definirHora});
  const legendaPendente = postagem.status === 'aguardando_legenda' || pendenciaLegendaI79(postagem);
  if (legendaPendente) add('preparar_legenda',responsavelLegendaI165({processoEditorial,responsavelExplicito:responsavelLegendaExplicito}),{prazo:p.programarAte ? p.programarAte + 'T' + p.programarHora : ''});
  for (const r of redesDaPostagem(postagem)) {
    if (r.retirada === true) continue;
    if (r.publicadaEm) {
      const prova = postagem.provasPublicacaoI165?.[r.rede];
      if (!prova) { add('conferir_publicacao_legada','Amanda',{rede:r.rede}); continue; }
      const fato = validarOperacaoProgramacaoI165(diretriz,{acao:'publicar',data:prova.data,hora:prova.hora,prova:prova.texto,rede:r.rede,agora});
      const recibo = postagem.conferenciasPublicacaoI165?.[r.rede];
      if (fato.divergente && !(recibo?.por === 'Amanda' && texto(recibo.motivo) && recibo.prova === jsonCanonicoI165(prova))) add('conferir_publicacao_divergente','Amanda',{rede:r.rede,episodio:jsonCanonicoI165(prova),fato:fato.fato,alteraPlano:false});
      continue;
    }
    const agendada = !!r.data;
    if (agendada) {
      exigirI165(dataCivilI165(r.data) && horaCivilI165(r.hora), 'agenda-fonte', 'A data agendada precisa ser conferida; ela não foi concluída.');
      try { validarOperacaoProgramacaoI165(diretriz,{acao:'agendar',data:r.data,hora:r.hora,rede:r.rede,excecao:postagem.excecoesProgramacaoI165?.[r.rede]}); }
      catch(e) { if (e.code !== 'i165/excecao-necessaria') throw e; add('conferir_agendamento_divergente','Amanda',{rede:r.rede,prazo:r.data + 'T' + r.hora}); }
      if (r.data + 'T' + r.hora <= local) add('confirmar_publicacao','Cecília',{rede:r.rede,prazo:r.data + 'T' + r.hora});
      continue;
    }
    if (!orientacaoAmanda) precisaOrientacaoAmanda = true;
    add('programar','Cecília',{rede:r.rede,prazo:p.programarAte ? p.programarAte + 'T' + p.programarHora : '',bloqueada:!orientacaoAmanda || p.modalidade === 'a_definir' || legendaPendente && !permitirAgendarSemLegendaI90,motivoBloqueio:!orientacaoAmanda ? 'aguardando_orientacao_Amanda' : p.modalidade === 'a_definir' ? 'aguardando_definicao_Amanda' : legendaPendente && !permitirAgendarSemLegendaI90 ? 'aguardando_legenda_politica_I90' : '',conferenciaOrientacaoCp110Obrigatoria:true});
  }
  if (precisaOrientacaoAmanda && p.modalidade !== 'a_definir') add('definir_compromisso','Amanda',{legadoSemDiretriz:true,motivoBloqueio:'novo_agendamento_exige_orientacao_Amanda'});
  return resultado;
}

export function ordenarObrigacoesI165(linhas) {
  const peso = {normal:0,alta:1,urgente:2};
  return [...linhas].sort((a,b) => Number(b.vencida)-Number(a.vencida) || (peso[b.urgencia] || 0)-(peso[a.urgencia] || 0) || (a.prazo || '9999').localeCompare(b.prazo || '9999') || a.chave.localeCompare(b.chave));
}
export function reconciliarObrigacoesI165(anteriores, projecao, {fonteConfirmada}) {
  exigirI165(fonteConfirmada === true && Array.isArray(anteriores) && Array.isArray(projecao?.obrigacoes), 'origem-indisponivel', 'Leitura indisponível não encerra pendências.');
  exigirI165(idFisicoI165(projecao.postagemId) && [...anteriores,...projecao.obrigacoes].every(o => o.fonte?.colecao === 'postagens' && o.fonte.id === projecao.postagemId), 'escopo-reconciliacao', 'A reconciliação deve acompanhar uma única postagem física.');
  // Inactive client is a transition to be reviewed, not proof that the old work was completed.
  if (projecao.estado === 'fora_do_escopo' && projecao.motivo === 'cliente_inativo_conferir_transicao') return {manter:anteriores,ativas:[],encerrar:[],requerConferencia:true};
  const chaves = new Set(projecao.obrigacoes.map(o => o.chave));
  return {manter:[],ativas:projecao.obrigacoes,encerrar:anteriores.filter(o => !chaves.has(o.chave)).map(o => ({chave:o.chave,motivo:'fonte_confirmada_avancou'})),requerConferencia:false};
}
