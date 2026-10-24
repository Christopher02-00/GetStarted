import {FieldValue} from 'firebase-admin/firestore';
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {validarCadastroI165} from './contexto.mjs';
import {fontePendenteTxI165} from './acompanhamento.mjs';
import {exigirI165,programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {operarAvisosHttpNucleoI165} from './avisos-http-nucleo-i165.mjs';
export {ACOES_AVISOS_HTTP_I165} from './avisos-http-nucleo-i165.mjs';
export function operarAvisosHttpI165(db,auth,dados,{agora=new Date()}={}){return operarAvisosHttpNucleoI165(db,auth,dados,{agora,deps:{exigir:exigirI165,validarConta:validarContaEsperadaI165,validarCadastro:validarCadastroI165,configAtiva:programacaoAtivaI165,fontePendenteTx:fontePendenteTxI165,serverTimestamp:()=>FieldValue.serverTimestamp()}});}
