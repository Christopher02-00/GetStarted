import {ACOES_PLANOS_PUBLICOS_CP109,operarPlanoPublicoCp109} from './planos-acao-cp109.mjs';
import {executarCentralNoTickI165} from './central/runner-central-i165.mjs';
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
import {executarAcompanhamentoI165} from './reconciliacao.mjs';
import {criarPushI165,criarEmailI165} from './despacho.mjs';
import {falhaCanalI165} from './transmissoes.mjs';
initializeApp();const db=getFirestore();setGlobalOptions({region:'southamerica-east1',maxInstances:1,memory:'512MiB',serviceAccount:'firebase-adminsdk-fbsvc@get-started-4956d.iam.gserviceaccount.com'});
// Internal deploy capability. Keep this value consistent during deployment analysis and runtime.
const emailDeployAtivoI165=process.env.GET_I165_DEPLOY_EMAIL_ENABLED==='true';
const chaveEmail=emailDeployAtivoI165?defineSecret('GET_I165_EMAILJS_PRIVATE_KEY'):null,servicoEmail=emailDeployAtivoI165?defineString('GET_I165_EMAILJS_SERVICE_ID',{default:''}):null,modeloEmail=emailDeployAtivoI165?defineString('GET_I165_EMAILJS_TEMPLATE_ID',{default:''}):null,publicaEmail=emailDeployAtivoI165?defineString('GET_I165_EMAILJS_PUBLIC_KEY',{default:''}):null;
// The existing dispatcher records a configuration failure before any provider send.
const emailNaoConfiguradoI165=async()=>{throw falhaCanalI165('O canal de e-mail ainda precisa de configuração. O aviso continua na fila do sistema.','antes_envio');};
export const programacaoIndependenteGetI165=onCall({timeoutSeconds:120,concurrency:4,cors:['https://get-started.agency','https://www.get-started.agency']},async r=>{try{return ACOES_PLANOS_PUBLICOS_CP109.includes(r.data?.acao)?await operarPlanoPublicoCp109(db,r.data||{}):await operarI165(db,r.auth,r.data||{},{midia:{originBrowser:r.rawRequest?.headers?.origin||'https://get-started.agency'}});}catch(e){throw new HttpsError(e.code==='i165/auth'?'unauthenticated':'failed-precondition',e.message,{codigo:e.code||'i165/falha',naoImplicaAusenciaDeCommit:true});}});
export const videoOperacionalGetI165=onDocumentWritten({document:'videos_producao/{id}',timeoutSeconds:120},e=>sincronizarVideoI165(db,e.params.id,{eventoId:e.id,antes:e.data?.before?.exists?e.data.before.data():null,depoisEvento:e.data?.after?.exists?e.data.after.data():null}));
export const postagemOperacionalGetI165=onDocumentWritten({document:'postagens/{id}',timeoutSeconds:120},e=>sincronizarPostagemI165(db,e.params.id));
export const acompanhamentoOperacionalGetI165=onSchedule({schedule:'every 5 minutes',timeZone:'America/Sao_Paulo',timeoutSeconds:540,concurrency:1,retryCount:0,...(emailDeployAtivoI165?{secrets:[chaveEmail]}:{})},async()=>{const agora=new Date(),enviarPush=criarPushI165(db,{messaging:getMessaging(),auth:getAuth()}),enviarEmail=emailDeployAtivoI165?criarEmailI165(db,{serviceId:servicoEmail.value(),templateId:modeloEmail.value(),publicKey:publicaEmail.value(),privateKey:chaveEmail.value()}):emailNaoConfiguradoI165;const operacional=await executarAcompanhamentoI165(db,{agora,uploadPost:dependenciasRuntimeUploadPostI166(db),enviarPush,enviarEmail});const central=await executarCentralNoTickI165(db,{agora,enviarPush,enviarEmail});return {operacional,central};});
