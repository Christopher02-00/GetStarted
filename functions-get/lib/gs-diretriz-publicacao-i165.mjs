import {exigirI165, idFisicoI165, jsonCanonicoI165, dataCivilI165, horaCivilI165, instanteI165, horarioBrasiliaI165, somarDiasI165, contextoOperacionalI165} from './gs-contexto-operacional-i165.mjs';

export const REDES_I165 = Object.freeze(['instagram', 'linkedin', 'tiktok', 'youtube']);
const texto = v => typeof v === 'string' ? v.trim() : '';
const modalidades = ['data', 'semana', 'a_definir'];
function camposPermitidos(entrada, nomes) {
  exigirI165(entrada && typeof entrada === 'object' && !Array.isArray(entrada), 'entrada', 'Preencha a orientação desta aprovação.');
  exigirI165(Object.keys(entrada).every(k => nomes.includes(k)), 'campo', 'A orientação contém um campo desconhecido.');
}
export function normalizarDiretrizI165(entrada) {
  camposPermitidos(entrada, ['modalidade','data','hora','inicioSemana','fimSemana','programarAte','programarHora','definirAte','definirHora','urgencia','observacao']);
  exigirI165(Object.values(entrada).every(v => typeof v === 'string'), 'tipo-diretriz', 'Os campos desta orientação devem ser textos, datas e horários explícitos.');
  exigirI165(modalidades.includes(entrada.modalidade), 'modalidade', 'Escolha uma data, uma semana ou a definição pendente.');
  const urgencia = entrada.urgencia ?? 'normal', observacao = texto(entrada.observacao);
  exigirI165(['normal','alta','urgente'].includes(urgencia), 'urgencia', 'Confira a urgência da postagem.');
  exigirI165(observacao.length <= 2000, 'observacao', 'A observação deve ter até 2.000 caracteres.');
  const base = {modalidade:entrada.modalidade, urgencia, observacao};
  if (entrada.modalidade === 'a_definir') {
    exigirI165(!entrada.data && !entrada.hora && !entrada.inicioSemana && !entrada.fimSemana && !entrada.programarAte && !entrada.programarHora, 'campos-conflitantes', 'A definição pendente não pode anunciar uma data ou prazo de programação.');
    exigirI165(observacao && dataCivilI165(entrada.definirAte), 'definir-ate', 'Explique a pendência e informe até quando a Amanda vai definir.');
    const definirHora = entrada.definirHora || '19:00';
    exigirI165(horaCivilI165(definirHora), 'hora', 'Confira o horário para definir.');
    return {...base, definirAte:entrada.definirAte, definirHora};
  }
  exigirI165(!entrada.definirAte && !entrada.definirHora, 'campos-conflitantes', 'Não misture definição pendente com data combinada.');
  exigirI165(dataCivilI165(entrada.programarAte), 'programar-ate', 'Informe até quando este conteúdo deve ser agendado.');
  const programarHora = entrada.programarHora || '19:00';
  exigirI165(horaCivilI165(programarHora), 'hora', 'Confira o horário limite de agendamento.');
  if (entrada.modalidade === 'data') {
    exigirI165(dataCivilI165(entrada.data) && !entrada.inicioSemana && !entrada.fimSemana, 'data', 'Informe a data real sem misturar uma semana.');
    exigirI165(!entrada.hora || horaCivilI165(entrada.hora), 'hora', 'Confira o horário da postagem.');
    exigirI165(entrada.programarAte <= entrada.data, 'prazo', 'O prazo de agendamento não pode ficar depois da postagem.');
    exigirI165(entrada.programarAte !== entrada.data || !entrada.hora || programarHora <= entrada.hora, 'prazo', 'No mesmo dia, o prazo de agendamento precisa vir antes da postagem.');
    return {...base, data:entrada.data, hora:entrada.hora || '', programarAte:entrada.programarAte, programarHora};
  }
  exigirI165(!entrada.data && !entrada.hora && dataCivilI165(entrada.inicioSemana), 'semana', 'Informe a segunda-feira da semana combinada.');
  exigirI165(new Date(entrada.inicioSemana + 'T12:00:00Z').getUTCDay() === 1, 'semana', 'A semana começa na segunda-feira; nenhuma data será deslocada automaticamente.');
  const fimSemana = somarDiasI165(entrada.inicioSemana, 6);
  exigirI165(dataCivilI165(fimSemana), 'semana', 'A semana deve caber no intervalo civil suportado de 2000 a 2099.');
  exigirI165(!entrada.fimSemana || entrada.fimSemana === fimSemana, 'semana', 'O fim da semana precisa ser o domingo correspondente.');
  exigirI165(entrada.programarAte <= entrada.inicioSemana, 'prazo', 'Combine o agendamento até o início da semana.');
  return {...base, inicioSemana:entrada.inicioSemana, fimSemana, programarAte:entrada.programarAte, programarHora};
}

export function origemEditorialI165(fonte) {
  const chaves = ['calendarClienteSlug','calendarCompetencia','calendarItemId'];
  const valores = chaves.map(k => fonte?.[k] ?? '');
  if (valores.every(v => v === '')) return null;
  exigirI165(valores.every(v => idFisicoI165(v)) && /^20\d{2}-(0[1-9]|1[0-2])$/.test(valores[1]), 'origem-incompleta', 'Confira os três identificadores da origem editorial.');
  return Object.fromEntries(chaves.map((k,i) => [k,valores[i]]));
}
export function identidadeMaterialI165(video) {
  exigirI165(video && idFisicoI165(video.id) && idFisicoI165(video.cliente), 'identidade', 'O vídeo e o cliente físicos precisam estar confirmados.');
  exigirI165(video.empresaOtavio == null || typeof video.empresaOtavio === 'string', 'empresa', 'Confira a empresa do conteúdo.');
  return {videoId:video.id, cliente:video.cliente, empresaOtavio:video.empresaOtavio || '', origem:origemEditorialI165(video)};
}
// Titles are deliberately absent: an editorial rename does not create a new delivery or assignment.
export function assinaturaEntregaI165(video) {
  return jsonCanonicoI165({...identidadeMaterialI165(video), editorAtribuido:video.editorAtribuido || '', linkFinalizado:video.linkFinalizado || '', enviadoEm:video.enviadoEm || ''});
}
export const assinaturaVideoAprovacaoI165 = video => jsonCanonicoI165(video);
export const assinaturaDiretrizI165 = diretriz => jsonCanonicoI165(diretriz);

export function conferirVinculoCanonicoI165(postagem, video) {
  exigirI165(postagem && idFisicoI165(postagem.id) && idFisicoI165(postagem.cliente), 'postagem', 'Confirme a postagem física.');
  if (!video) {
    exigirI165(postagem.origemManual === true && !postagem.videoId, 'manual', 'Sem vídeo, somente uma postagem explicitamente manual é válida.');
    return {postagemId:postagem.id, videoId:'', cliente:postagem.cliente, empresaOtavio:postagem.empresaOtavio || '', origem:origemEditorialI165(postagem), manual:true};
  }
  const id = identidadeMaterialI165(video);
  exigirI165(postagem.videoId === video.id && video.postagemId === postagem.id, 'ponteiros', 'Vídeo e postagem não confirmam o mesmo vínculo.');
  exigirI165(postagem.cliente === id.cliente && (postagem.empresaOtavio || '') === id.empresaOtavio, 'cliente-empresa', 'O cliente ou a empresa divergem.');
  exigirI165(jsonCanonicoI165(origemEditorialI165(postagem)) === jsonCanonicoI165(id.origem), 'origem-divergente', 'Vídeo e postagem pertencem a origens editoriais diferentes.');
  return {...id, postagemId:postagem.id, manual:false};
}
function validarCompromisso(diretriz, compromisso, decisao, identidade) {
  if (!compromisso) return;
  exigirI165(compromisso.confirmado === true && idFisicoI165(compromisso.id) && dataCivilI165(compromisso.data), 'campanha-fonte', 'Confirme a campanha física antes de aprovar.');
  exigirI165(compromisso.videoId === identidade.videoId && compromisso.cliente === identidade.cliente && (compromisso.empresaOtavio || '') === identidade.empresaOtavio, 'campanha-vinculo', 'A campanha precisa estar vinculada ao mesmo vídeo, cliente e empresa.');
  exigirI165(!compromisso.hora || horaCivilI165(compromisso.hora), 'campanha-fonte', 'Confira o horário da campanha.');
  const igual = diretriz.modalidade === 'data' && diretriz.data === compromisso.data && (!compromisso.hora || diretriz.hora === compromisso.hora);
  if (igual) return;
  // Decision is a server-loaded record, never a browser boolean. Its source signature binds the current campaign.
  exigirI165(decisao?.autorizada === true && decisao.por === 'Amanda' && texto(decisao.motivo) && decisao.assinaturaCompromisso === jsonCanonicoI165(compromisso) && decisao.assinaturaProposta === jsonCanonicoI165(diretriz), 'campanha-decisao', 'Uma campanha com data combinada exige decisão específica da Amanda para mudar.');
}

export function aplicarAprovacaoComDiretrizI165({video, assinaturaEsperada, entrada, ator, operacaoId, reciboAnterior = null, diretrizAnterior = null, compromisso = null, decisaoCompromisso = null, agora}) {
  const ctx = contextoOperacionalI165(ator), politica = normalizarDiretrizI165(entrada), em = instanteI165(agora);
  exigirI165(['Amanda','Chris'].includes(ctx.papel), 'papel', 'A aprovação de qualidade é da Amanda ou do Chris.');
  exigirI165(idFisicoI165(operacaoId) && typeof assinaturaEsperada === 'string' && assinaturaEsperada, 'operacao', 'A aprovação precisa da intenção e da versão que você conferiu.');
  const identidade = identidadeMaterialI165(video);
  const intencao = jsonCanonicoI165({operacaoId, videoId:video.id, assinaturaEsperada, politica, uid:ctx.uid, papel:ctx.papel, atorReal:ctx.atorReal, compromisso:compromisso ? jsonCanonicoI165(compromisso) : null, decisaoCompromisso:decisaoCompromisso ? jsonCanonicoI165(decisaoCompromisso) : null});
  if (reciboAnterior) {
    exigirI165(reciboAnterior.operacaoId === operacaoId && reciboAnterior.intencao === intencao, 'operacao-reutilizada', 'Esta intenção já foi usada com outro conteúdo, perfil ou orientação.');
    return {estado:'recuperado', requerLeituraAtual:true, patchVideo:null, diretriz:null, recibo:reciboAnterior};
  }
  exigirI165(diretrizAnterior?.operacaoId !== operacaoId, 'commit-incompleto', 'A diretriz existe sem o recibo esperado; confira o commit antes de repetir.');
  exigirI165(video.excluido !== true && video.status === 'aguardando_aprovacao' && texto(video.linkFinalizado), 'estado-video', 'A entrega atual não está disponível para esta aprovação.');
  exigirI165(assinaturaVideoAprovacaoI165(video) === assinaturaEsperada, 'versao', 'A entrega mudou depois de abrir. Confira a versão atual.');
  validarCompromisso(politica, compromisso, decisaoCompromisso, identidade);
  exigirI165(!diretrizAnterior || diretrizAnterior.videoId === video.id && Number.isInteger(diretrizAnterior.revisao) && diretrizAnterior.revisao > 0, 'diretriz-anterior', 'Confira a diretriz anterior deste vídeo.');
  const revisao = (diretrizAnterior?.revisao || 0) + 1;
  const autoria = {uid:ctx.uid, papel:ctx.papel, atorReal:ctx.atorReal};
  const diretriz = {schema:1, ...identidade, politica, revisao, operacaoId, assinaturaEntrega:assinaturaEntregaI165(video), assinaturaVideoConferido:assinaturaEsperada, compromisso:compromisso ? jsonCanonicoI165(compromisso) : '', decisaoCompromisso:decisaoCompromisso ? jsonCanonicoI165(decisaoCompromisso) : '', autoria, em};
  const patchVideo = {status:'aguardando_cliente', aprovadoInternoEm:em, aprovadoPor:ctx.papel, clienteAprovou:false, ultimaCorrecaoSolicitada:'', enviadoParaCliente:false};
  const recibo = {schema:1, operacaoId, intencao, videoId:video.id, revisaoDiretriz:revisao, assinaturaDiretriz:assinaturaDiretrizI165(diretriz), autoria, em};
  return {estado:'novo', patchVideo, diretriz, recibo, acaoPosterior:'conferir-configuracao-e-usar-confirmacao-cliente-canonica', requerLeituraAtual:true};
}

export function conferirDiretrizAtualI165(diretriz, video, postagem = null) {
  exigirI165(diretriz?.schema === 1 && Number.isInteger(diretriz.revisao) && diretriz.revisao > 0, 'diretriz', 'A orientação de programação precisa estar confirmada.');
  if (video) {
    const id = identidadeMaterialI165(video);
    exigirI165(diretriz.videoId === id.videoId && diretriz.cliente === id.cliente && diretriz.empresaOtavio === id.empresaOtavio && jsonCanonicoI165(diretriz.origem) === jsonCanonicoI165(id.origem) && diretriz.assinaturaEntrega === assinaturaEntregaI165(video), 'fonte-avancou', 'O material mudou; a Amanda precisa reconferir a orientação.');
    if (postagem) conferirVinculoCanonicoI165(postagem, video);
  } else {
    const id = conferirVinculoCanonicoI165(postagem, null);
    exigirI165(!diretriz.videoId && diretriz.postagemId === id.postagemId && diretriz.cliente === id.cliente && diretriz.empresaOtavio === id.empresaOtavio && jsonCanonicoI165(diretriz.origem) === jsonCanonicoI165(id.origem), 'fonte-avancou', 'Confira a orientação desta postagem manual.');
  }
  return normalizarDiretrizI165(diretriz.politica);
}
export function dentroDaDiretrizI165(politica, data, hora) {
  const p = normalizarDiretrizI165(politica);
  if (p.modalidade === 'a_definir') return false;
  return p.modalidade === 'semana' ? data >= p.inicioSemana && data <= p.fimSemana : data === p.data && (!p.hora || hora === p.hora);
}
export function chaveExcecaoI165({acao, data = '', hora = '', rede = 'geral'}) {
  exigirI165(['agendar','cancelar'].includes(acao) && ['geral',...REDES_I165].includes(rede), 'acao', 'Ação ou rede inválida.');
  return jsonCanonicoI165({acao,data,hora,rede});
}
export function validarOperacaoProgramacaoI165(diretriz, {acao, data = '', hora = '', rede = 'geral', prova = '', excecao = null, agora} = {}) {
  exigirI165(diretriz?.schema === 1 && Number.isInteger(diretriz.revisao) && diretriz.revisao > 0, 'diretriz', 'A orientação precisa estar confirmada no serviço.');
  exigirI165(['agendar','cancelar','publicar','desfazer'].includes(acao) && ['geral',...REDES_I165].includes(rede), 'acao', 'Ação ou rede inválida.');
  const politica = normalizarDiretrizI165(diretriz.politica);
  if (acao === 'desfazer') return {permitida:true, resolveObrigacao:false};
  if (acao === 'publicar') {
    exigirI165(dataCivilI165(data) && horaCivilI165(hora) && texto(prova) && texto(prova).length <= 3000, 'prova', 'Registre data, horário e prova da publicação real.');
    exigirI165(data + 'T' + hora <= horarioBrasiliaI165(agora), 'fato-futuro', 'Uma publicação futura ainda não é um fato confirmado.');
    return {permitida:true, fato:{data,hora,prova:texto(prova),rede}, divergente:!dentroDaDiretrizI165(politica,data,hora), alteraPlano:false};
  }
  if (acao === 'agendar') exigirI165(dataCivilI165(data) && horaCivilI165(hora), 'agenda', 'Confira a data e o horário de Brasília.');
  if (acao === 'agendar' && dentroDaDiretrizI165(politica,data,hora)) return {permitida:true, excecaoAplicada:false};
  const proposta = chaveExcecaoI165({acao,data,hora,rede});
  // The endpoint must load this immutable decision. Passing client-controlled JSON is not authorization.
  exigirI165(excecao?.autorizada === true && excecao.por === 'Amanda' && texto(excecao.motivo) && excecao.revisaoDiretriz === diretriz.revisao && excecao.assinaturaDiretriz === assinaturaDiretrizI165(diretriz) && excecao.proposta === proposta, 'excecao-necessaria', 'A Amanda precisa decidir esta mudança específica antes de continuar.');
  return {permitida:true, excecaoAplicada:true};
}

// Scheduling changes operational fields of the same editorial item. V118 freezes its original day/date.
export function retratoEditorialProgramacaoI165(item,postagemId='') {
  exigirI165(item&&typeof item==='object'&&!Array.isArray(item),'item','Confira a peça editorial física.');
  const retrato={...item},anterior=item.agendamentoAnteriorV118;
  if(postagemId&&anterior?.postagemId===postagemId&&item.postagemId===postagemId){retrato.day=anterior.day;retrato.dataPostagem=anterior.dataPostagem||'';}
  if(retrato.day==null)delete retrato.day;
  retrato.dataPostagem=String(retrato.dataPostagem||'');
  for(const k of ['agendado','posted','postagemId','agendamentoAnteriorV118','agendamentoForaCompetenciaV139','origemAgendamentoManualV118'])delete retrato[k];
  return retrato;
}
