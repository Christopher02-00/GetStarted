import {FieldValue} from 'firebase-admin/firestore';
import {getMessaging} from 'firebase-admin/messaging';
import {getAuth} from 'firebase-admin/auth';
import {falhaCanalI165,codigoFcmSeguroCp146} from './transmissoes.mjs';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {validarCadastroI165} from './contexto.mjs';
import {fontePendenteTxI165} from './acompanhamento.mjs';
import {exigirI165,programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {operarAvisosHttpNucleoI165} from './avisos-http-nucleo-i165.mjs';
export {ACOES_AVISOS_HTTP_I165} from './avisos-http-nucleo-i165.mjs';
export function operarAvisosHttpI165(db,auth,dados,{agora=new Date()}={}){return operarAvisosHttpNucleoI165(db,auth,dados,{agora,deps:{exigir:exigirI165,validarConta:validarContaEsperadaI165,validarCadastro:validarCadastroI165,configAtiva:programacaoAtivaI165,fontePendenteTx:fontePendenteTxI165,conferirUsuario:async ator=>{const u=await getAuth().getUser(ator.uid);if(u.disabled||u.emailVerified!==true||String(u.email||'').trim().toLowerCase()!==ator.email)throw Error('Google não confirmado.');},enviarTeste:async(token,operacaoId)=>{try{const recibo=await getMessaging().send({token,data:{tipo:'teste_dispositivo_i165',testeId:operacaoId},webpush:{headers:{TTL:'300'}}});return {aceita:true,recibo};}catch(e){const codigo=codigoFcmSeguroCp146(e.code);throw falhaCanalI165('O serviço não confirmou o envio do teste.',codigo?'recusada':'desconhecido',codigo);}},serverTimestamp:()=>FieldValue.serverTimestamp()}});}
