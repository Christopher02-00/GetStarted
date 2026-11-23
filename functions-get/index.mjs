import {ACOES_PLANOS_PUBLICOS_CP109,operarPlanoPublicoCp109} from './planos-acao-cp109.mjs';
import {ACOES_PEDIDO_AJUSTE_CLIENTE_CP193,operarPedidoAjusteClienteCp193} from './pedido-ajuste-cliente-cp193.mjs';
import {ACOES_COMPOSICAO_COBRANCA_CP195,composicaoCobrancaClienteCp195} from './composicao-cobranca-cliente-cp195.mjs';
import {ACOES_CALENDARIO_CLIENTE_CP200,operarCalendarioClienteCp200,sincronizarCalendarioClienteCp200} from './calendario-cliente-cp200.mjs';
import {executarCentralNoTickI165} from './central/runner-central-i165.mjs';
import {executarRecepcaoPedidosClienteCp175} from './recepcao-pedidos-cliente-cp175.mjs';
import {dependenciasRuntimeUploadPostI166} from './upload-post-servico-i166.mjs';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getMessaging} from 'firebase-admin/messaging';
import {getAuth} from 'firebase-admin/auth';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {onDocumentWritten} from 'firebase-functions/v2/firestore';
import {setGlobalOptions} from 'firebase-functions/v2';
import {defineSecret,defineString} from 'firebase-functions/params';
import {operarI165} from './operacoes.mjs';
import {sincronizarVideoI165,sincronizarPostagemI165} from './acompanhamento.mjs';
import {sincronizarLegendaCalendarioCp190} from './legenda-calendario-cp190.mjs';
import {avisarFichaClienteCp198} from './ficha-cliente-avisa-cp198.mjs';
import {avisarAprovacaoClienteCp191} from './aprovacao-cliente-avisos-cp191.mjs';
import {executarAcompanhamentoI165} from './reconciliacao.mjs';
import {acompanharCp205,eventoVideoCp205,eventoPostagemCp205,eventosCalendarioCp205,eventoAnaliseCp205,eventoAgendamentoCp205} from './acompanhamento-cliente-cp205.mjs';
import {criarPushI165,criarEmailI165} from './despacho.mjs';
import {falhaCanalI165} from './transmissoes.mjs';
import {acompanharLegendaCp214} from './legenda-sem-vinculo-cp214.mjs';
import {acompanharVideoExcluidoCp244} from './video-excluido-postagem-cp244.mjs';
import {acompanharSemAprovadorCp245} from './tarefa-sistema-sem-aprovador-cp245.mjs';
import {pedirFaxinaSeDevidaCp248,rodarFaxinaPedidaCp248} from './faxina-diaria-cp248.mjs';
import {aplicarRetencaoL1,criarCopiaStorageRetencaoL1} from './retencao-l1.mjs';
import {getStorage} from 'firebase-admin/storage';
initializeApp();const db=getFirestore();setGlobalOptions({region:'southamerica-east1',maxInstances:1,memory:'512MiB',serviceAccount:'firebase-adminsdk-fbsvc@get-started-4956d.iam.gserviceaccount.com'});
// Internal deploy capability. Keep this value consistent during deployment analysis and runtime.
const emailDeployAtivoI165=process.env.GET_I165_DEPLOY_EMAIL_ENABLED==='true';
const chaveEmail=emailDeployAtivoI165?defineSecret('GET_I165_EMAILJS_PRIVATE_KEY'):null,servicoEmail=emailDeployAtivoI165?defineString('GET_I165_EMAILJS_SERVICE_ID',{default:''}):null,modeloEmail=emailDeployAtivoI165?defineString('GET_I165_EMAILJS_TEMPLATE_ID',{default:''}):null,publicaEmail=emailDeployAtivoI165?defineString('GET_I165_EMAILJS_PUBLIC_KEY',{default:''}):null;
// The existing dispatcher records a configuration failure before any provider send.
const emailNaoConfiguradoI165=async()=>{throw falhaCanalI165('O canal de e-mail ainda precisa de configuração. O aviso continua na fila do sistema.','antes_envio');};
/* U3 (10/11/2026): a equipe inteira passa por esta callable (aprovar, agendar, publicar, listas). Com maxInstances:1 global
   e 4 pedidos por servidor, o 5º esperava na fila (latência medida até 55 s) e o site esgotava o tempo → faixa vermelha.
   As gravações são transacionais e idempotentes por operacaoId, então vários servidores são seguros. */
export const programacaoIndependenteGetI165=onCall({timeoutSeconds:120,concurrency:4,maxInstances:10,cors:['https://get-started.agency','https://www.get-started.agency']},async r=>{try{return ACOES_PLANOS_PUBLICOS_CP109.includes(r.data?.acao)?await operarPlanoPublicoCp109(db,r.data||{}):ACOES_PEDIDO_AJUSTE_CLIENTE_CP193.includes(r.data?.acao)?await operarPedidoAjusteClienteCp193(db,r.auth,r.data||{}):ACOES_COMPOSICAO_COBRANCA_CP195.includes(r.data?.acao)?await composicaoCobrancaClienteCp195(db,r.auth,r.data||{}):ACOES_CALENDARIO_CLIENTE_CP200.includes(r.data?.acao)?await operarCalendarioClienteCp200(db,r.auth,r.data||{}):await operarI165(db,r.auth,r.data||{},{midia:{originBrowser:r.rawRequest?.headers?.origin||'https://get-started.agency'}});}catch(e){throw new HttpsError(e.code==='i165/auth'?'unauthenticated':'failed-precondition',e.message,{codigo:e.code||'i165/falha',naoImplicaAusenciaDeCommit:true});}});
export const videoOperacionalGetI165=onDocumentWritten({document:'videos_producao/{id}',timeoutSeconds:120},e=>sincronizarVideoI165(db,e.params.id,{eventoId:e.id,antes:e.data?.before?.exists?e.data.before.data():null,depoisEvento:e.data?.after?.exists?e.data.after.data():null}));
export const postagemOperacionalGetI165=onDocumentWritten({document:'postagens/{id}',timeoutSeconds:120},e=>sincronizarPostagemI165(db,e.params.id));
// CP190 (10/11/2026): legenda corrigida no calendário chega à postagem (ou vira demanda para a Cecília/Chris).
// CP191: avisos de aprovação/remoção do cliente e "mês inteiro aprovado" (Cecília), um por mudança.
// CP198: ficha do cliente mudou depois do documento confirmado → demanda para o Chris readotar (a trava continua).
export const fichaClienteGetCp198=onDocumentWritten({document:'info_extras_cliente/{slug}',timeoutSeconds:120},e=>avisarFichaClienteCp198(db,e.params.slug,e.data?.before?.exists?e.data.before.data():null,e.data?.after?.exists?e.data.after.data():null));
export const calendarioLegendaGetCp190=onDocumentWritten({document:'calendarios/{slug}',timeoutSeconds:120},async e=>{const antes=e.data?.before?.exists?e.data.before.data():null,depois=e.data?.after?.exists?e.data.after.data():null;try{await sincronizarCalendarioClienteCp200(db,e.params.slug,antes,depois);}catch(erro){console.error('CP200: cópia do cliente não atualizada',e.params.slug,erro);}await acompanharCp205(db,eventosCalendarioCp205(e.params.slug,antes,depois));await avisarAprovacaoClienteCp191(db,e.params.slug,antes,depois);return sincronizarLegendaCalendarioCp190(db,e.params.slug,antes,depois);});
// CP205 (11/11/2026): o Acompanhamento do Portal se atualiza sozinho (vídeo, postagem, relatório do mês, gravação; calendário no gatilho acima).
const antesDepoisCp205=e=>[e.data?.before?.exists?e.data.before.data():null,e.data?.after?.exists?e.data.after.data():null];
export const acompanhamentoVideoGetCp205=onDocumentWritten({document:'videos_producao/{id}',timeoutSeconds:60},e=>acompanharCp205(db,eventoVideoCp205(e.params.id,...antesDepoisCp205(e))));
export const acompanhamentoPostagemGetCp205=onDocumentWritten({document:'postagens/{id}',timeoutSeconds:60},e=>acompanharCp205(db,eventoPostagemCp205(e.params.id,...antesDepoisCp205(e))));
// CP214: vídeo aprovado sem conteúdo no calendário → uma demanda de legenda para a Amanda; fecha sozinha quando a postagem anda.
export const legendaSemVinculoGetCp214=onDocumentWritten({document:'postagens/{id}',timeoutSeconds:60},e=>acompanharLegendaCp214(db,e.params.id,...antesDepoisCp205(e)));
// CP244: vídeo na Lixeira encerra a postagem que ainda não foi para a rede (ou pede à Cecília para tirar do agendamento); recuperar desfaz.
export const videoExcluidoPostagemGetCp244=onDocumentWritten({document:'videos_producao/{id}',timeoutSeconds:60},e=>acompanharVideoExcluidoCp244(db,e.params.id,...antesDepoisCp205(e)));
// CP245: tarefa do sistema concluída pela Amanda fecha direto (ninguém mais pode aprovar; antes ficava "aguardando aprovação" para sempre).
export const tarefaSistemaSemAprovadorGetCp245=onDocumentWritten({document:'demandas/{id}',timeoutSeconds:30,maxInstances:3},e=>acompanharSemAprovadorCp245(db,e.params.id,...antesDepoisCp205(e)));
export const acompanhamentoAnaliseGetCp205=onDocumentWritten({document:'analises_mensais_i108/{id}',timeoutSeconds:60},e=>acompanharCp205(db,eventoAnaliseCp205(e.params.id,...antesDepoisCp205(e))));
export const acompanhamentoGravacaoGetCp205=onDocumentWritten({document:'agendamentos/{id}',timeoutSeconds:60},e=>acompanharCp205(db,eventoAgendamentoCp205(e.params.id,...antesDepoisCp205(e))));
// CP248 (21/11, decisão do Chris): faxina em função própria, disparada pelo pedido que o agendamento grava (no máx. a cada 2 h; continua se
// a rodada anterior parou) — agendada com 2 dias passados vira publicada (caminho oficial, desfazível), entrega do sistema sem aprovador
// fecha, postagem de vídeo na Lixeira encerra; limite de 30 s por item; relatório em sistema/faxina_cp248 (gravado durante a rodada).
export const faxinaOperacaoGetCp248=onDocumentWritten({document:'sistema/faxina_cp248_pedido',timeoutSeconds:540,memory:'1GiB'},async e=>{try{const r=await rodarFaxinaPedidaCp248(db,e.data?.before?.exists?e.data.before.data():null,e.data?.after?.exists?e.data.after.data():null);if(r.estado!=='nada')console.log('CP248 faxina',JSON.stringify(r));}catch(err){console.error('CP248: faxina precisa de conferência',String(err?.message||err).slice(0,500));}});
// CP261 (23/11, ok nominal do Chris sobre os números de produção): retenção dos registros técnicos antigos (fila_emails, email_throttle,
// log_automacoes, log_acessos — política única em retencao-l1.mjs). Função própria, a cada 2 h, no máximo 6.000 por coleção e rodada;
// cada lote é copiado para o Storage (retencao-l1/AAAA-MM-DD/…) ANTES de apagar; sem cópia, nada é apagado. Relatório em sistema/retencao_l1.
export const retencaoRegistrosGetL1=onSchedule({schedule:'every 2 hours',timeZone:'America/Sao_Paulo',timeoutSeconds:540,memory:'1GiB',retryCount:0},async()=>{const r=await aplicarRetencaoL1(db,{gravarCopia:criarCopiaStorageRetencaoL1({storage:getStorage()})});console.log('Retenção L1',JSON.stringify(r.linhas));});
export const acompanhamentoOperacionalGetI165=onSchedule({schedule:'every 5 minutes',timeZone:'America/Sao_Paulo',timeoutSeconds:540,concurrency:1,retryCount:0,...(emailDeployAtivoI165?{secrets:[chaveEmail]}:{})},async()=>{const agora=new Date(),enviarPush=criarPushI165(db,{messaging:getMessaging(),auth:getAuth()}),enviarEmail=emailDeployAtivoI165?criarEmailI165(db,{serviceId:servicoEmail.value(),templateId:modeloEmail.value(),publicKey:publicaEmail.value(),privateKey:chaveEmail.value()}):emailNaoConfiguradoI165;let recepcao;try{recepcao=await executarRecepcaoPedidosClienteCp175(db,{agora});}catch(e){console.error('CP175: recepção automática precisa de conferência',String(e.message||e).slice(0,500));recepcao={ativa:true,estado:'conferir_origens',erros:[{servico:'recepcao_pedidos_cliente_cp175',erro:String(e.message||e).slice(0,500)}]};}const operacional=await executarAcompanhamentoI165(db,{agora,uploadPost:dependenciasRuntimeUploadPostI166(db),enviarPush,enviarEmail});const central=await executarCentralNoTickI165(db,{demandaIdsCp175:recepcao?.demandaIds||[],errosRecepcaoCp175:recepcao?.erros||[],agora,enviarPush,enviarEmail});/* CP248: aqui só se PEDE a faxina (documento pequeno); ela roda na função própria faxinaOperacaoGetCp248. A 1ª versão rodava aqui, travou numa confirmação e derrubou as voltas seguintes dos avisos (21/11). */let faxina=null;try{faxina=await pedirFaxinaSeDevidaCp248(db,{agora});}catch(e){console.error('CP248: pedido da faxina precisa de conferência',String(e.message||e).slice(0,500));faxina={estado:'erro'};}return {recepcao,operacional,central,faxina};});
