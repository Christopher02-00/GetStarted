/* Módulo de trabalho injetável: não initializeApp, não exporta Scheduler, não cria canais. */
import {executarRecorrenciaI164} from './agenda.mjs';
import {sincronizarOcorrenciasI165,sincronizarOrganizacaoI167} from './notificacoes.mjs';
import {processoAtivoI164} from './lib/gs-processo-calendarios-i164.mjs';
import {tickRefsCp109} from '../referencias-cp109.mjs';
const linkNota=id=>{const u=new URL('https://get-started.agency/escritorio.html');u.searchParams.set('avisoI165',id);return u.href;};
export function resumirCanaisCentralI165(linhas,canais) {
 const r={aceitas:0,falhas:0,desconhecidas:0,emAndamento:0,pendentes:0,aguardandoPrazo:0,canaisHabilitados:canais.length};
 for(const n of linhas){if(n.estado!=='pendente')continue;if(n.origem?.tipo==='referencias_cp109'){r.somenteSite=(r.somenteSite||0)+1;continue;}if(n.origem?.tipo==='organizacao_i167'&&n.nivel==='aguardando'){r.aguardandoPrazo++;continue;}
  for(const c of canais){const estado=n.canais?.[c]?.estado;if(estado==='aceita_pelo_provedor')r.aceitas++;else if(estado==='falha')r.falhas++;else if(estado==='resultado_desconhecido')r.desconhecidas++;else if(estado==='em_andamento')r.emAndamento++;else r.pendentes++;}
 }
 r.estado=r.falhas||r.desconhecidas||r.emAndamento||r.pendentes?'conferir_canais':canais.length?'conferidos':'sem_canais_ativos';return r;
}
export async function executarCentralNoTickI165(db,{agora=new Date(),enviarPush,enviarEmail,limite=40,operadores={}}={}) {
 const cfg=(await db.doc('programacao_config_i165/ativo').get()).data(),processo=(await db.doc('processo_calendarios_i164/ativo').get()).data();
 const canais=['push','email'].filter(c=>cfg?.schema===1&&cfg.ativo===true&&cfg.habilidades?.[c]===true&&(c==='push'?enviarPush:enviarEmail));
 const push=enviarPush?(n=>enviarPush({...n,link:linkNota(n.id)})):undefined,email=enviarEmail?(n=>enviarEmail({...n,link:linkNota(n.id)})):undefined;
 const executarAgenda=operadores.recorrencia||executarRecorrenciaI164,executarNotas=operadores.notas||sincronizarOcorrenciasI165,executarOrganizacao=operadores.organizacao||sincronizarOrganizacaoI167,executarReferencias=operadores.referencias||tickRefsCp109;
 const r={organizacao:{ativa:false},agenda:{ativa:false},referencias:{ativa:false},notas:{ativa:false},erros:[]};
 // Agenda já publicada usa a ativação operacional I165 existente; não depende do corte editorial I164.
 if(cfg?.schema===1&&cfg.ativo===true&&cfg.habilidades?.organizacao===true)try{r.organizacao=await executarOrganizacao(db,{agora,enviarPush:push,enviarEmail:email,canais,limite});}catch(e){r.erros.push({servico:'organizacao_i167',erro:String(e.message).slice(0,500)});}
 if(processoAtivoI164(processo)) {
  try{r.agenda=await executarAgenda(db,{agora});}catch(e){r.erros.push({servico:'recorrencia_i164',erro:String(e.message).slice(0,500)});}
  // Obrigação diária própria: não depende da configuração automática mensal I167.
  try{r.referencias=await executarReferencias(db,{agora});}catch(e){r.erros.push({servico:'referencias_cp109',erro:String(e.message).slice(0,500)});}
  try{r.notas=await executarNotas(db,{agora,enviarPush:push,enviarEmail:email,canais,limite});}catch(e){r.erros.push({servico:'notificacoes_central',erro:String(e.message).slice(0,500)});}
 }
 for(const [servico,x]of [['organizacao_i167',r.organizacao],['notificacoes_central',r.notas]])for(const e of x.erros||[])r.erros.push({servico,...e});
 const tipos=[...(r.organizacao.ativa?['organizacao_i167']:[]),...(processoAtivoI164(processo)?['planejamento','calendario_revisao','calendario_envio','referencias_cp109','planejamento_estrategico_cp109','plano_acao_cp109']:[])];
 try{const ler=operadores.notasAtuais||(async()=>{const s=await db.collection('notificacoes_operacionais_i165').where('estado','==','pendente').get();return s.docs.map(d=>d.data());});const notas=await ler();r.canais=resumirCanaisCentralI165(notas.filter(n=>!n.escopo&&tipos.includes(n.origem?.tipo)),canais);}catch(e){r.erros.push({servico:'saude_canais_central',erro:String(e.message).slice(0,500)});r.canais={estado:'nao_conferido',falhas:0,desconhecidas:0};}
 const estado=r.erros.length?'conferir_origens':r.canais.estado==='conferidos'?'conferida':'conferir_canais',em=agora.toISOString();
 await db.doc('servicos_i164/execucao').set({estado,ultimaExecucao:em,agendaCriadas:r.agenda.criadas?.length||0,organizacaoConferida:r.organizacao.conferidas||0,notas:r.notas.processadas||0,canais:r.canais,erros:r.erros.slice(0,100),origem:'tick operacional I165 existente',portalAbertoNecessario:false},{merge:true});
 await db.doc('config_notificacoes_i165/estado').set({estado,atualizadoEm:em,canais:r.canais,erros:r.erros.slice(0,100),alcance:'execução corrente e canais das notas pendentes nos escopos ativos; aceite não comprova exibição no aparelho'},{merge:true});
 return r;
}
