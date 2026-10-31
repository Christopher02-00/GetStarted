import {ACOES_VINCULOS_CP142_COM_CIENCIA as ACOES_VINCULOS_CP142,operarVinculosProvidenciasCp142} from './providencias-vinculos-cp142.mjs';
import {ACOES_PROVIDENCIAS_CP140,operarProvidenciasGravacaoCp140} from './providencias-gravacoes-cp140.mjs';
import {ACOES_ENTRADA_PERFIL_CP126,operarEntradaPerfilCp126} from './entrada-perfil-cp126.mjs';
import {ACOES_DISPENSA_I118,operarDispensaRetroativaI118} from './dispensa-retroativa-i118.mjs';
import {ACOES_AJUSTES_CP112,operarAjustesCalendariosCp112} from './ajustes-calendarios-cp112.mjs';
import {ACOES_REUNIOES_MENSAIS_CP111,operarReunioesMensaisCp111} from './reunioes-mensais-cp111.mjs';
import {ACOES_AJUSTES_CP109,operarAjustesClientesCp109} from './ajustes-clientes-cp109.mjs';
import {ACOES_REFERENCIAS_CP109,operarReferenciasCp109} from './referencias-cp109.mjs';
import {ACOES_PLANEJAMENTO_CP109,operarPlanejamentoEstrategicoCp109} from './planejamento-estrategico-cp109.mjs';
import {ACOES_PLANOS_CP109,operarPlanosCp109} from './planos-acao-cp109.mjs';
import {ACOES_SAUDE_MIDIA_I166,conferirSaudeMidiaI166} from './saude-midia-i166.mjs';
import {lerNotaCentralTxR87} from './avisos-central-http-i164.mjs';
import {notaCentralI164} from './central/notificacoes.mjs';
import {validarCadastroI165} from './contexto.mjs';
import {ACOES_EDITORIAL_I172,operarEditorialCalendariosI172,fontesTx} from './editorial-calendarios-i172.mjs';
import {ACOES_RESIDUAL_R5_R83,operarResidualPublicacaoR5R83} from './residual-publicacao-r5-r83.mjs';
import {ACOES_CENTRAL_HTTP_R80,operarCentralPreparacaoR80} from './central-preparacao-r80.mjs';
import {ACOES_AVISOS_HTTP_I165,operarAvisosHttpI165} from './avisos-http-i165.mjs';
import {ACOES_MIDIA_I166} from './midia-servico-i166.mjs';
import {operarMidiaRuntimeI166} from './midia-runtime-i166.mjs';
import {ACOES_UPLOAD_POST_I166,despacharUploadPostI166} from './upload-post-dispatcher-i166.mjs';
import {lerDependenciasUploadPostTxI166} from './upload-post-fontes-i166.mjs';
import {prepararStokkiI165,operarStokkiIndependenteI165} from './stokki.mjs';
import {operarLegendasStokkiI165} from './legendas-stokki-i165.mjs';
import {controlarIntencaoI165} from './ciclo-intencao.mjs';
import {operarPublicacaoI165} from './publicacao.mjs';
import {prepararExcecaoI165,solicitarExcecaoI165,decidirExcecaoI165,lerSolicitacaoExcecaoI165,listarSolicitacoesExcecaoI165} from './excecoes.mjs';
import {prepararDiretrizLegadoI165,adotarDiretrizLegadoI165} from './diretriz-legado.mjs';
import {consultarOperacionaisI165} from './leitores-operacionais.mjs';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {exigirI165,idFisicoI165,instanteI165} from './lib/gs-contexto-operacional-i165.mjs';
import {ESCOPO_I165,identidadeTokenI165,contextoTxI165} from './contexto.mjs';
import {aprovarVideoI165,prepararAprovacaoVideoI165,conferirOperacaoI165,abortarOperacaoI165} from './aprovacao.mjs';
import {prepararOrientacaoVideoCp108,salvarOrientacaoVideoCp108} from './orientacao-video-cp108.mjs';
import {sincronizarPostagemI165,fontePendenteTxI165} from './acompanhamento.mjs';
import {exigirProgramacaoTxI165} from './guardas-programacao.mjs';
export {exigirProgramacaoTxI165} from './guardas-programacao.mjs';
import {programarI165,prepararProgramacaoI165,conferirOperacaoProgramacaoI165} from './programar.mjs';
export async function operarI165(db,auth,dados,{agora=new Date(),midia={}}={}){
 exigirI165(dados&&typeof dados==='object'&&!Array.isArray(dados),'entrada','Operação inválida.');
 validarContaEsperadaI165(auth,dados);
 if(ACOES_VINCULOS_CP142.includes(dados.acao))return operarVinculosProvidenciasCp142(db,auth,dados,{agora});
 if(ACOES_PROVIDENCIAS_CP140.includes(dados.acao))return operarProvidenciasGravacaoCp140(db,auth,dados,{agora});
 if(ACOES_ENTRADA_PERFIL_CP126.includes(dados.acao))return operarEntradaPerfilCp126(db,auth,dados,{agora});
 if(ACOES_DISPENSA_I118.includes(dados.acao))return operarDispensaRetroativaI118(db,auth,dados,{agora});
 if(ACOES_AJUSTES_CP112.includes(dados.acao))return operarAjustesCalendariosCp112(db,auth,dados,{agora,fontesEditorialTx:fontesTx});
 if(ACOES_REUNIOES_MENSAIS_CP111.includes(dados.acao))return operarReunioesMensaisCp111(db,auth,dados,{agora});
 if(ACOES_AJUSTES_CP109.includes(dados.acao))return operarAjustesClientesCp109(db,auth,dados,{agora});
 if(ACOES_REFERENCIAS_CP109.includes(dados.acao))return operarReferenciasCp109(db,auth,dados,{agora});
 if(ACOES_PLANEJAMENTO_CP109.includes(dados.acao))return operarPlanejamentoEstrategicoCp109(db,auth,dados,{agora});
 if(ACOES_PLANOS_CP109.includes(dados.acao))return operarPlanosCp109(db,auth,dados,{agora});
 if(ACOES_SAUDE_MIDIA_I166.includes(dados.acao))return conferirSaudeMidiaI166(db,auth,dados,{agora});
 if(ACOES_EDITORIAL_I172.includes(dados.acao))return operarEditorialCalendariosI172(db,auth,dados,{agora});
 if(ACOES_CENTRAL_HTTP_R80.includes(dados.acao))return operarCentralPreparacaoR80(db,auth,dados,{agora});
 if(ACOES_AVISOS_HTTP_I165.includes(dados.acao))return operarAvisosHttpI165(db,auth,dados,{agora});
 if(ACOES_RESIDUAL_R5_R83.includes(dados.acao))return operarResidualPublicacaoR5R83(db,auth,dados,{agora});
 if(ACOES_MIDIA_I166.includes(dados.acao))return operarMidiaRuntimeI166(db,auth,dados,{agora,midia});
 if(ACOES_UPLOAD_POST_I166.includes(dados.acao))return (await despacharUploadPostI166(db,auth,dados,{agora,lerDependenciasTx:lerDependenciasUploadPostTxI166})).resultado;
 if(dados.acao==='legendas_stokki'){const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'legendas_stokki');return operarLegendasStokkiI165(db,ator,dados,agora);}
 if(dados.acao==='preparar_stokki')return prepararStokkiI165(db,auth,dados,{agora});
 if(dados.acao==='stokki')return operarStokkiIndependenteI165(db,auth,dados,{agora});
 if(['conferir_operacao','abortar_operacao'].includes(dados.acao))return controlarIntencaoI165(db,auth,dados,{agora});
 if(dados.acao==='publicacao')return operarPublicacaoI165(db,auth,dados,{agora});
 const excecoes={preparar_excecao:prepararExcecaoI165,solicitar_excecao:solicitarExcecaoI165,decidir_excecao:decidirExcecaoI165,ler_solicitacao_excecao:lerSolicitacaoExcecaoI165,listar_solicitacoes_excecao:listarSolicitacoesExcecaoI165};if(Object.hasOwn(excecoes,dados.acao))return excecoes[dados.acao](db,auth,dados,{agora});
 if(dados.acao==='preparar_diretriz')return prepararDiretrizLegadoI165(db,auth,dados,{agora});
 if(dados.acao==='adotar_diretriz')return adotarDiretrizLegadoI165(db,auth,dados,{agora});
 if(['consultar_postagens','consultar_edicao'].includes(dados.acao))return consultarOperacionaisI165(db,auth,dados,{agora});
 if(dados.acao==='abortar_op')return abortarOperacaoI165(db,auth,dados,{agora});
 if(dados.acao==='preparar_orientacao_video')return prepararOrientacaoVideoCp108(db,auth,dados,{agora});
 if(dados.acao==='salvar_orientacao_video')return salvarOrientacaoVideoCp108(db,auth,dados,{agora});
 if(dados.acao==='aprovar_video')return aprovarVideoI165(db,auth,dados,{agora});
 if(dados.acao==='preparar_aprovacao_video')return prepararAprovacaoVideoI165(db,auth,dados,{agora});
 if(dados.acao==='conferir_op')return conferirOperacaoI165(db,auth,dados,{agora});
 if(dados.acao==='preparar_programacao')return prepararProgramacaoI165(db,auth,dados,{agora});
 if(dados.acao==='programar')return programarI165(db,auth,dados,{agora});
 if(dados.acao==='conferir_op_programacao')return conferirOperacaoProgramacaoI165(db,auth,dados,{agora});
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'operacao');
 if(dados.acao==='preparar'){
  exigirI165(['Amanda','Chris','Cecília'].includes(ator.papel)&&Array.isArray(dados.ids)&&dados.ids.length<=20&&dados.ids.every(idFisicoI165),'lista','Confira até 20 postagens.');
  await db.runTransaction(tx=>contextoTxI165(db,tx,ator,'programacao'));const resultados=[];for(const id of [...new Set(dados.ids)])resultados.push({id,...await sincronizarPostagemI165(db,id,{agora})});return {resultados};
 }
 if(dados.acao==='conferir_programacao')return db.runTransaction(async tx=>{const r=await exigirProgramacaoTxI165(db,tx,ator,dados,agora);return {...r.resultado,somenteDiagnostico:true,naoAutorizaEscritaPosterior:true};});
 if(['ler_aviso','marcar_visto'].includes(dados.acao)){
  exigirI165(idFisicoI165(dados.id),'aviso','Aviso inválido.');return db.runTransaction(async tx=>{
   const ref=db.doc('notificacoes_operacionais_i165/'+dados.id),s=await tx.get(ref),n=s.data();
   if(s.exists&&notaCentralI164(n)){
    exigirI165(n.id===s.id,'aviso','O identificador do aviso precisa de conferência.');
    const [cfg,cad,processo]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(db.doc('usuarios_equipe/'+ator.email)),tx.get(db.doc('processo_calendarios_i164/ativo'))]);
    validarCadastroI165(ator,cad.data());
    const dto=await lerNotaCentralTxR87(db,tx,n,ator,{cfg:cfg.data(),processo:processo.data(),agora});
    if(dados.acao==='marcar_visto')tx.update(ref,{leituras:{...n.leituras,[ator.uid]:{uid:ator.uid,papel:ator.papel,atorReal:ator.real,em:instanteI165(agora)}}});
    return dto;
   }
   exigirI165(s.exists&&n.escopo===ESCOPO_I165&&n.destinatario===ator.papel,'aviso','Este aviso pertence a outro perfil.');
   exigirI165(['videos_producao','postagens'].includes(n.fonte?.colecao)&&idFisicoI165(n.fonte?.id),'aviso-fonte','A origem deste aviso precisa de conferência.');
   const {cfg}=await contextoTxI165(db,tx,ator,n.fonte.colecao==='videos_producao'?'edicao':'programacao');
   exigirI165(n.ativacaoId===cfg.ativacaoId,'aviso-ativacao','Este aviso pertence a uma ativação anterior. Confira a fila atual.');
   const fonte=await fontePendenteTxI165(db,tx,n,{agora});
   exigirI165(fonte&&typeof fonte.pendente==='boolean','aviso-fonte','Não consegui confirmar a origem atual deste aviso.');
   if(dados.acao==='marcar_visto')tx.update(ref,{leituras:{...n.leituras,[ator.uid]:{uid:ator.uid,papel:ator.papel,atorReal:ator.real,em:instanteI165(agora)}}});
   return {id:s.id,escopo:n.escopo,destinatario:n.destinatario,ativacaoId:n.ativacaoId,tipo:n.tipo,fonte:n.fonte,estado:fonte.pendente?'pendente':'resolvida',estadoPersistido:n.estado,titulo:n.titulo,texto:n.texto,link:n.link,bloqueada:fonte.bloqueada===true,pausada:fonte.pausada===true,fonteConferida:true,fonteAvancou:fonte.pendente===false,conferidoEm:instanteI165(agora),leituraNaoResolve:true,semAlterarEstadoPersistido:true};
  });
 }
 throw Object.assign(new Error('Operação desconhecida.'),{code:'i165/acao'});
}
