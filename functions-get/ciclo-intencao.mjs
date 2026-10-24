import {exigirI165,idFisicoI165,jsonCanonicoI165,instanteI165} from './lib/gs-contexto-operacional-i165.mjs';
import {identidadeTokenI165,contextoTxI165,hashI165} from './contexto.mjs';
export const TIPOS_OPERACAO_I165=Object.freeze(['programar','adotar_diretriz','solicitar_excecao','decidir_excecao','publicacao','stokki']);
export const controleOperacaoI165=tipoOperacao=>({tipoOperacao,conferencia:true,cancelamentoAtomico:true});
export function pedidoBrutoHashI165(a,d){const pedido={...d};delete pedido.acao;const s=jsonCanonicoI165({uid:a.uid,papel:a.papel,atorReal:a.real,pedido});exigirI165(s.length<=400000,'intencao-grande','A intenção excedeu o limite. Nada foi cortado.');return hashI165(s);}
export function refIntencaoI165(db,a,tipo,d){
 exigirI165(TIPOS_OPERACAO_I165.includes(tipo),'tipo-operacao','Confira o tipo da intenção.');const id=tipo==='stokki'?d.acaoStokki?.operacaoId:d.operacaoId;exigirI165(idFisicoI165(id),'operacao','Confira a mesma intenção anterior.');
 return db.doc('programacao_operacoes_i165/'+hashI165([tipo,a.uid,a.papel,a.real,id]));
}
export function conferirTombstoneI165(r,a,raw){
 exigirI165(r.autoria?.uid===a.uid&&r.autoria?.papel===a.papel&&r.autoria?.atorReal===a.real&&r.pedidoBrutoHash===raw,'operacao-reutilizada','Esta tentativa pertence a outro acesso ou preenchimento.');
 return r.estado==='cancelada'?{estado:'cancelada',cancelamentoAtomico:true,recibo:r,requerLeituraAtual:true}:null;
}
export async function controlarIntencaoI165(db,auth,d,{agora=new Date()}={}){
 const a=identidadeTokenI165(auth,d.papelOperado,d.sessao||'conferencia'),tipo=d.tipoOperacao,pedido=d.pedido;
 exigirI165(TIPOS_OPERACAO_I165.includes(tipo)&&pedido&&typeof pedido==='object'&&!Array.isArray(pedido),'intencao','Envie a mesma intenção que ficou guardada.');
 exigirI165(['Amanda','Chris','Cecília'].includes(a.papel)&&(!['adotar_diretriz','decidir_excecao'].includes(tipo)||a.papel==='Amanda'),'papel','Confira esta tentativa no mesmo perfil responsável.');
 exigirI165(pedido.uidEsperado===a.uid&&pedido.atorRealEsperado===a.real&&pedido.papelOperado===a.papel,'operacao-dono','Esta tentativa pertence a outro perfil ou Google.');
 const raw=pedidoBrutoHashI165(a,pedido),ref=refIntencaoI165(db,a,tipo,pedido),em=instanteI165(agora);
 return db.runTransaction(async tx=>{await contextoTxI165(db,tx,a,'programacao');const s=await tx.get(ref);if(s.exists){const cancelada=conferirTombstoneI165(s.data(),a,raw);return cancelada||{estado:'confirmada',recibo:s.data(),requerLeituraAtual:true,nenhumaEscrita:true};}
  if(d.acao==='conferir_operacao')return{estado:'ausente_no_instante',conferidoEm:em,retrySomenteMesmaIntencao:true,naoAutorizaNovaIntencao:true,nenhumaEscrita:true};
  exigirI165(d.acao==='abortar_operacao','acao','Confira a ação de recuperação.');const recibo={schema:1,tipoOperacao:tipo,estado:'cancelada',autoria:{uid:a.uid,papel:a.papel,atorReal:a.real},pedidoBrutoHash:raw,operacaoId:tipo==='stokki'?pedido.acaoStokki.operacaoId:pedido.operacaoId,postagemId:pedido.postagemId||'',solicitacaoId:pedido.solicitacaoId||'',em};tx.set(ref,recibo);return{estado:'cancelada',cancelamentoAtomico:true,recibo,nenhumaFonteAlterada:true};
 });
}
