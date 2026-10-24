import crypto from 'node:crypto';
import {exigirI165,idFisicoI165,jsonCanonicoI165,programacaoAtivaI165,contextoOperacionalI165,horarioBrasiliaI165,dataCivilI165,entregaSemPostagemI165} from './lib/gs-contexto-operacional-i165.mjs';
export const ESCOPO_I165='operacional_i165_cp101';
export const hashI165=v=>crypto.createHash('sha256').update(typeof v==='string'?v:jsonCanonicoI165(v)).digest('hex');
export const EMAILS_I165=Object.freeze({'christopherveloso0@gmail.com':'Chris','amandachamorrosm@gmail.com':'Amanda','vitoriaboaron215@gmail.com':'Cecília','gabrielleromaomarketing@gmail.com':'Gabrielle','luanamassoquetojulia@gmail.com':'Fernanda','yasmocelin@gmail.com':'Yas','heloisaksc@gmail.com':'Helo','luissouza280507@gmail.com':'Luís','nathanocosta652@gmail.com':'Nathan','victorvieiraj814@gmail.com':'João Victor'});
export function identidadeTokenI165(auth,papelOperado,sessao='servidor') {
 exigirI165(idFisicoI165(auth?.uid)&&auth.token?.email_verified===true&&auth.token?.firebase?.sign_in_provider==='google.com','auth','Entre com o Google da equipe.');
 const email=String(auth.token.email||'').trim().toLowerCase(),real=EMAILS_I165[email];
 exigirI165(!!real,'auth','Este acesso não pertence à equipe autorizada.');
 const papel=papelOperado||real;
 exigirI165(Object.values(EMAILS_I165).includes(papel)&&(papel===real||real==='Chris'),'delegacao','Perfil operado inválido.');
 return {uid:auth.uid,email,real,papel,sessao};
}
export function validarCadastroI165(ator,cadastro) {
 exigirI165(cadastro?.ativo===true&&cadastro.excluido!==true&&cadastro.pessoa===ator.real&&(!cadastro.uid||cadastro.uid===ator.uid)&&(!cadastro.email||String(cadastro.email).toLowerCase()===ator.email),'cadastro','O cadastro ativo da equipe precisa estar confirmado.');
 return contextoOperacionalI165({uid:ator.uid,papel:ator.papel,atorReal:ator.real,sessao:ator.sessao,cadastroAtivo:true});
}
export async function contextoTxI165(db,tx,ator,habilidade) {
 const [cfg,cad]=await Promise.all([tx.get(db.doc('programacao_config_i165/ativo')),tx.get(db.doc('usuarios_equipe/'+ator.email))]);
 exigirI165(programacaoAtivaI165(cfg.data())&&cfg.data().habilidades?.[habilidade]===true,'inativo','Esta operação independente ainda não está ativa.');
 return {cfg:cfg.data(),ctx:validarCadastroI165(ator,cad.data())};
}
export async function configuracaoI165(db) {const s=await db.doc('programacao_config_i165/ativo').get();return programacaoAtivaI165(s.data())?s.data():null;}
function diaSaida(v){if(typeof v==='string')return v.slice(0,10);if(typeof v?.toDate==='function')return v.toDate().toISOString().slice(0,10);return '';}
export function saidaEfetivaI165(d,hoje){if(!d||d.excluido===true||d.statusSaida==='cancelada')return false;const dia=diaSaida(d.dataSaida||d.saidaProgramadaPara);return dataCivilI165(dia)&&dia<=hoje;}
export async function clienteTxI165(db,tx,slug,agora) {
 exigirI165(idFisicoI165(slug)&&!['zeens','otica-visao-araucaria'].includes(slug),'cliente','Confirme o cadastro canônico do cliente.');
 const [cfg,enc]=await Promise.all([tx.get(db.doc('clientes_config/'+slug)),tx.get(db.doc('clientes_encerrados/'+slug))]);
 const c=cfg.data()||{},hoje=horarioBrasiliaI165(agora).slice(0,10);
 const ativo=c.clienteInativo!==true&&c.ativo!==false&&c.excluido!==true&&!c.arquivado&&!c.unificadoPara&&!saidaEfetivaI165(c,hoje)&&!saidaEfetivaI165(enc.data(),hoje);
 return {config:{modoAprovacaoCliente:'manual',tipoEntrega:'postagem_completa',...c},clienteAtivo:ativo,configEntrega:{modo:entregaSemPostagemI165({cliente:slug},c)?'entrega_direta':'postagem'}};
}
