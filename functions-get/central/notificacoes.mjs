import{ocorrenciaOrganizacaoI167,lerOcorrenciaOrganizacaoI167,canaisDaVersaoOrganizacaoI167}from'./organizacao-i167.mjs';
import{TIPO_DEMANDA_REFAZER_CP131,ocorrenciaDemandaRefazerCp131,lerOcorrenciaDemandaRefazerCp131}from'./demandas-refazer-cp131.mjs';
import{programacaoAtivaI165}from'../lib/gs-contexto-operacional-i165.mjs';
const ativacaoOperacionalCp131=n=>n?.origem?.tipo==='organizacao_i167'||n?.origem?.tipo===TIPO_DEMANDA_REFAZER_CP131;
import{fonteFisicaClienteR4,mesDoItemCalendario}from'./lib/guardas-stokki-i165.mjs';
import{carteiraCanonicaI164}from'./lib/gs-carteira-calendarios-i164.mjs';
import{revisaoI148}from'./lib/gs-aprovacoes-calendarios-i148.mjs';
import{transmitirI165}from'./transmissoes.mjs';
import crypto from'node:crypto';
import{contextoLegadoEditorialI172}from'../editorial-legado-i172.mjs';
import{estadoEtapas,dependencias,ETAPAS}from'./lib/gs-planejamento-social-i155.mjs';
import{horarioI165,jsonI165}from'./lib/gs-programacao-i165.mjs';
import{processoAtivoI164}from'./lib/gs-processo-calendarios-i164.mjs';
import{calendarioEnviavelI164}from'./lib/elegibilidade-envio-i164.mjs';
import{chaveEnvioI92,referenciaPublicacaoI92,validarRegistroEnvioI92}from'./lib/gs-envio-calendarios-i92.mjs';
import{ocorrenciasReferenciasCp109}from'../referencias-cp109.mjs';
import{ocorrenciasPlanejamentoCp109}from'../planejamento-estrategico-cp109.mjs';
import{ocorrenciasPlanosCp109}from'../planos-acao-cp109.mjs';
const hash=v=>crypto.createHash('sha256').update(jsonI165(v)).digest('hex');
export const notaCentralI164=n=>!!n&&!n.escopo&&['planejamento','calendario_revisao','calendario_envio','organizacao_i167','referencias_cp109','planejamento_estrategico_cp109','plano_acao_cp109',TIPO_DEMANDA_REFAZER_CP131].includes(n.origem?.tipo);
export function ocorrenciasPlanejamentoI164(c,agora=new Date()){
 if(!c.incluido)return [];const agoraLocal=horarioI165(agora),estados=estadoEtapas(c),out=[];
 for(const [etapa,titulo,padrao]of ETAPAS){const a=c.agenda?.[etapa];if(a?.origemI167||a?.fonteOrganizacaoI167===true||etapa==='revisao'&&c.criacao?.base||estados[etapa]||!a?.prazo||dependencias(c,etapa).length)continue;const prazo=a.prazo+'T'+(a.prazoHora||'19:00'),falta=new Date(prazo+'-03:00').getTime()-agora.getTime();if(falta>86400000)continue;
  const nivel=falta<=0?'atrasado':falta<=14400000?'hoje':'vespera',pessoa=a.responsavel||padrao,versao=hash([c.id,etapa,a,c.documentos,c.lote,c.criacao?.rodada||0]);
  out.push({origem:{tipo:'planejamento',id:c.id,etapa},versao,destinatario:pessoa,nivel,titulo:titulo+' · '+c.clienteNome,texto:'Seu próximo passo está no Planejamento. Prazo '+a.prazo+' às '+(a.prazoHora||'19:00')+'.',prazo,link:{area:'planejar',ciclo:c.id,competencia:c.competencia,etapa}});
  if(falta<=-3600000&&pessoa!=='Amanda')out.push({...out.at(-1),destinatario:'Amanda',nivel:'acompanhar',texto:'Pode conferir o andamento de '+titulo.toLowerCase()+' de '+c.clienteNome+' com '+(pessoa==='Fernanda'?'Júlia':pessoa)+'? O prazo era '+a.prazo+'.'});
 }return out;
}
/* Só publicações novas do processo I155. Ausência de recibos antigos não prova falta de envio. */
export async function ocorrenciasCalendarioEnvioI164(c,cal,registro){
 if(!c?.incluido||!c.criacao?.base||!c.criacao.enviadoRevisao||cal?.excluido===true)return [];
 const mes=c.competencia,m=cal?.aprovacaoMeses?.[mes],foto=m?.retratoLiberadoV115;
 if(cal?.planejamentoBasesI155?.[mes]!==c.criacao.base||m?.status!=='liberado'||m.aprovadoPor!=='Amanda'||!foto||foto.mes!==mes||!Array.isArray(foto.items)||!foto.items.some(x=>x&&!x.excluido)||!m.aprovadoEm||foto.publicadoEm!==m.aprovadoEm)return [];
 const inicio=Date.parse(c.criadoEm),aprovacao=Date.parse(m.aprovadoEm);if(!Number.isFinite(inicio)||!Number.isFinite(aprovacao)||aprovacao<inicio)return [];
 chaveEnvioI92(c.cliente,mes);validarRegistroEnvioI92(registro,c.cliente,mes);
 const ref=await referenciaPublicacaoI92(c.cliente,mes,cal,foto.items);
 if(registro?.enviado===true&&registro.publicacao===ref.assinatura)return [];
 const versao=hash([ref.assinatura,registro?.revision||0,registro?.operacaoId||'']);
 return [{origem:{tipo:'calendario_envio',id:c.id,cliente:c.cliente,competencia:mes,base:c.criacao.base,publicacao:ref.assinatura},versao,destinatario:'Cecília',nivel:'liberado',titulo:'Calendário liberado · '+c.clienteNome,texto:'Amanda liberou '+mes+'. Confira a versão, envie ao cliente e organize a captação. Confirme o envio depois de compartilhar.',link:{area:'enviar',ciclo:c.id,cliente:c.cliente,competencia:mes}}];
}
export function ocorrenciasCalendarioRevisaoI164(c,cal){
 if(!c?.incluido||!c.criacao?.base||cal?.excluido===true)return [];
 const mes=c.competencia,marca=cal?.aprovacaoMeses?.[mes],base=c.criacao.base;
 if(cal?.planejamentoBasesI155?.[mes]!==base||!['aguardando_interna','aprovado_interno'].includes(marca?.status))return [];
 if(!fonteFisicaClienteR4(c.cliente,cal))throw Error('A identidade física da revisão precisa ser conferida.');
 const itens=(cal.items||[]).filter(x=>x&&!x.excluido&&mesDoItemCalendario(cal,x)===mes);
 if(!itens.length)return [];
 const revisao=revisaoI148(c.cliente,mes,cal,itens,marca.status),versao=hash([revisao,base]);
 return [{origem:{tipo:'calendario_revisao',id:c.id,cliente:c.cliente,competencia:mes,base},versao,destinatario:'Amanda',nivel:'revisar',titulo:'Calendário para revisar · '+c.clienteNome,texto:'A versão de '+mes+' está pronta para você conferir. Abra os conteúdos; depois aprove ou escreva o que precisa ajustar.',link:{area:'aprovar',ciclo:c.id,cliente:c.cliente,competencia:mes}}];
}
async function consultarRevisaoCalendarioI164(db,c,agora=new Date()){if(!c?.incluido||!c.criacao?.base)return [];const s=await db.doc('calendarios/'+c.cliente).get();if(!s.exists)return [];const ocorrencias=ocorrenciasCalendarioRevisaoI164(c,s.data());if(!ocorrencias.length)return [];const [extras,configs]=await Promise.all([db.collection('clientes_extras').get(),db.collection('clientes_config').get()]);const rows=s=>s.docs.map(d=>({id:d.id,data:d.data()})),carteira=carteiraCanonicaI164({extras:rows(extras),configs:rows(configs),competencia:c.competencia,hoje:horarioI165(agora).slice(0,10)});return carteira.carteira.some(x=>x.slug===c.cliente)?ocorrencias:[];}
async function consultarEnvioCalendarioI164(db,c,agora=new Date()){
 if(!c?.incluido||!c.criacao?.base||!c?.cliente||!c?.competencia)return [];
 const cal=await db.doc('calendarios/'+c.cliente).get();if(!cal.exists||cal.data()?.aprovacaoMeses?.[c.competencia]?.status!=='liberado')return [];
 const [registro,extras,configs]=await Promise.all([db.doc('calendarios_envios_cecilia_i92/'+chaveEnvioI92(c.cliente,c.competencia)).get(),db.collection('clientes_extras').get(),db.collection('clientes_config').get()]);const rows=s=>s.docs.map(d=>({id:d.id,data:d.data()}));
 if(!calendarioEnviavelI164(c,cal.data(),{extras:rows(extras),configs:rows(configs),agora}))return [];
 return ocorrenciasCalendarioEnvioI164(c,cal.data(),registro.exists?registro.data():null);
}
export async function registrarOcorrenciaI165(db,o,agora=new Date()){
 const id=ativacaoOperacionalCp131(o)?o.id:hash([o.origem,o.versao,o.destinatario,o.nivel]),ref=db.doc('notificacoes_operacionais_i165/'+id);
 const configRef=db.doc(ativacaoOperacionalCp131(o)?'programacao_config_i165/ativo':'processo_calendarios_i164/ativo');
 async function ativacao(tx){const s=await tx.get(configRef),c=s.data();if(o.origem?.tipo===TIPO_DEMANDA_REFAZER_CP131){if(!programacaoAtivaI165(c))throw Error('Os avisos de demandas estão pausados.');}else if(o.origem?.tipo==='organizacao_i167'){if(c?.schema!==1||c.ativo!==true||c.habilidades?.organizacao!==true||typeof c.ativacaoId!=='string')throw Error('A organização está pausada.');}else if(!processoAtivoI164(c))throw Error('O processo de calendários está pausado.');return c.ativacaoId;}

 if(o.origem?.tipo==='organizacao_i167'){await db.runTransaction(async tx=>{const [s,ativacaoId]=await Promise.all([tx.get(ref),ativacao(tx)]),a=s.data();if(a&&(a.origem?.tipo!=='organizacao_i167'||a.origem.id!==o.origem.id))throw Error('O aviso já pertence a outra origem.');if(a?.versao===o.versao&&a.estado==='pendente'){if(a.ativacaoId!==ativacaoId)tx.update(ref,{ativacaoId,conferidaEm:agora.toISOString()});return;}if(a?.versao&&a.versao!==o.versao)tx.set(ref.collection('versoes').doc(a.versao),a);tx.set(ref,{schema:1,...o,id,ativacaoId,criadaEm:a?.criadaEm||agora.toISOString(),conferidaEm:agora.toISOString(),estado:'pendente',canais:canaisDaVersaoOrganizacaoI167(a,o.versao),leituras:a?.leituras||{},reaberturas:(a?.reaberturas||0)+(a?.estado==='resolvida'?1:0)});});return id;}
 await db.runTransaction(async tx=>{
  const [s,ativacaoId]=await Promise.all([tx.get(ref),ativacao(tx)]);
  if(s.exists){
   const antiga=s.data();
   if(jsonI165(antiga.origem)!==jsonI165(o.origem)||antiga.versao!==o.versao||antiga.destinatario!==o.destinatario||antiga.nivel!==o.nivel)throw Error('O aviso já pertence a outra versão ou origem.');
   const patch={...(antiga.ativacaoId!==ativacaoId?{ativacaoId}:{}),...(['calendario_envio','calendario_revisao',TIPO_DEMANDA_REFAZER_CP131].includes(o.origem.tipo)&&antiga.estado==='resolvida'?{estado:'pendente',reabertaEm:agora.toISOString(),reaberturas:(antiga.reaberturas||0)+1,motivo:'A fonte voltou a exigir conferência; canais já aceitos preservados.'}:{})};
   if(Object.keys(patch).length)tx.update(ref,patch);
   return;
  }
  tx.set(ref,{schema:1,...o,id,ativacaoId,criadaEm:agora.toISOString(),estado:'pendente',canais:{push:{estado:'pendente',tentativas:0},email:{estado:'pendente',tentativas:0}}});
 });return id;
}
/* O leitor HTTP e o runner usam a mesma projeção da fonte, sem confirmar entrega por leitura. */
export async function ocorrenciasDaFonteCentralI164(db,n,agora=new Date()){
 if(n.origem?.tipo===TIPO_DEMANDA_REFAZER_CP131){const atual=await lerOcorrenciaDemandaRefazerCp131(db,n.origem.id);return atual?[atual]:[];}
  if(n.origem?.tipo==='referencias_cp109')return ocorrenciasReferenciasCp109(db,n,agora);
  if(n.origem?.tipo==='planejamento_estrategico_cp109')return ocorrenciasPlanejamentoCp109(db,n,agora);
  if(n.origem?.tipo==='plano_acao_cp109')return ocorrenciasPlanosCp109(db,n,agora);
 if(n.origem?.tipo==='organizacao_i167'){
  const atual=await lerOcorrenciaOrganizacaoI167(db,n.origem.id,agora);
  return atual?[atual]:[];
 }
 const id=n.origem?.id;
 if(typeof id!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(id))throw Error('A origem do aviso precisa confirmar o cliente e a competência.');
 const competencia=id.slice(0,7),cliente=id.slice(9);
 const s=await db.doc('planejamento_social_i155/'+id).get();
 if(n.origem.origemEditorial==='continuar_legado'){
  return consultarCalendarioLegadoI164(db,id,agora,n.origem.tipo);
 }
 if(!s.exists)return [];
 const c={...s.data(),id:s.id};
 if(c.schema!==1||c.cliente!==cliente||c.competencia!==competencia)throw Error('A identidade do planejamento precisa de conferência.');
 if(n.origem.tipo==='planejamento')return ocorrenciasPlanejamentoI164(c,agora);
 if(n.origem.tipo==='calendario_revisao')return consultarRevisaoCalendarioI164(db,c,agora);
 if(n.origem.tipo==='calendario_envio')return consultarEnvioCalendarioI164(db,c,agora);
 return [];
}
export async function fonteAindaPendenteI165(db,n,agora=new Date()){
 const config=await db.doc(ativacaoOperacionalCp131(n)?'programacao_config_i165/ativo':'processo_calendarios_i164/ativo').get();
 const atual=config.data();
 if(n.origem?.tipo===TIPO_DEMANDA_REFAZER_CP131){
  if(!programacaoAtivaI165(atual)||n.ativacaoId!==atual.ativacaoId)return false;
 }else if(n.origem?.tipo==='organizacao_i167'){
  if(atual?.schema!==1||atual.ativo!==true||atual.habilidades?.organizacao!==true||n.ativacaoId!==atual.ativacaoId)return false;
 }else if(!processoAtivoI164(atual)||n.ativacaoId!==atual.ativacaoId)return false;
 return (await ocorrenciasDaFonteCentralI164(db,n,agora)).some(x=>x.versao===n.versao&&x.destinatario===n.destinatario&&x.nivel===n.nivel&&jsonI165(x.origem)===jsonI165(n.origem));
}

const proxima=(tentativas,agora)=>new Date(agora.getTime()+Math.min(6*3600000,60000*2**Math.min(tentativas,8))).toISOString();
export async function despacharOcorrenciaI165(db,id,{agora=new Date(),enviarPush,enviarEmail,canaisHabilitados=['push','email']}={}){
 const ref=db.doc('notificacoes_operacionais_i165/'+id),token=crypto.randomUUID();let n;
 const claim=await db.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists||!notaCentralI164(s.data())||s.data().estado!=='pendente'||s.data().concessaoAte>new Date().toISOString())return false;n=s.data();tx.update(ref,{concessao:token,concessaoAte:new Date(Date.now()+90000).toISOString()});return true;});if(!claim)return {ocupada:true};
 try{
  const ativo=await db.doc(ativacaoOperacionalCp131(n)?'programacao_config_i165/ativo':'processo_calendarios_i164/ativo').get();const ligada=n.origem?.tipo===TIPO_DEMANDA_REFAZER_CP131?programacaoAtivaI165(ativo.data()):n.origem?.tipo==='organizacao_i167'?ativo.data()?.schema===1&&ativo.data()?.ativo===true&&ativo.data()?.habilidades?.organizacao===true:processoAtivoI164(ativo.data());if(!ligada||!await fonteAindaPendenteI165(db,n,agora)){await finalizar({estado:'resolvida',resolvidaEm:agora.toISOString(),motivo:'A fonte avançou, mudou de versão ou a rotina foi desativada.'});return {resolvida:true};}
  if(n.origem?.tipo==='organizacao_i167'&&n.nivel==='aguardando'){await finalizar({conferidaEm:agora.toISOString()});return {aguardandoPrazo:true};}
   const habilitados=n.origem?.tipo==='referencias_cp109'?[]:canaisHabilitados;
   const canais={...n.canais};for(const canal of habilitados){const a=canais[canal];if(a?.estado!=='resultado_desconhecido'||!a.tentativaId)continue;const recibo=await db.doc('transmissoes_i165/'+a.tentativaId).get(),r=recibo.data();if(r?.estado==='aceita_pelo_provedor'&&r.chave===n.id&&r.canal===canal&&r.destinatario===n.destinatario)canais[canal]={...a,estado:'aceita_pelo_provedor',aceitaEm:r.aceitaEm,recibo:r.recibo,recuperada:true};}
   for(const [canal,enviar]of [['push',enviarPush],['email',enviarEmail]].filter(([c])=>habilitados.includes(c))){const a=canais[canal]||{estado:'pendente',tentativas:0};if(['aceita_pelo_provedor','resultado_desconhecido'].includes(a.estado)||a.proximaTentativa>agora.toISOString())continue;
   // Fonte é relida antes de cada transmissão; nenhum cache encerra ou autoriza envio.
   if(!await fonteAindaPendenteI165(db,n,agora)){await finalizar({estado:'resolvida',resolvidaEm:agora.toISOString(),motivo:'Fonte atualizada antes do envio.'});return {resolvida:true};}
   const tentativas=(a.tentativas||0)+1;
   try{if(!enviar)throw Object.assign(Error('Canal ainda não configurado.'),{classificacaoCanalI165:'antes_envio'});const r=await transmitirI165(db,{chave:n.id,canal,destinatario:n.destinatario,carga:{origem:n.origem,versao:n.versao,nivel:n.nivel,titulo:n.titulo,texto:n.texto,link:n.link}},()=>enviar(n));if(r?.aceita!==true)throw Error(r?.motivo||'O provedor não confirmou o aceite.');canais[canal]={estado:'aceita_pelo_provedor',tentativas,aceitaEm:agora.toISOString(),recibo:r.recibo||'',aviso:r.aviso||''};}
   catch(e){canais[canal]={estado:e.classificacaoCanalI165==='desconhecido'?'resultado_desconhecido':'falha',tentativaId:e.tentativaId||'',tentativas,erro:String(e.message||e).slice(0,500),ultimaTentativa:agora.toISOString(),proximaTentativa:proxima(tentativas,agora)};}
  }
  await finalizar({canais,conferidaEm:agora.toISOString()});return {canais};
 }catch(e){await finalizar({erro:String(e.message).slice(0,500),conferidaEm:agora.toISOString()});throw e;}
 async function finalizar(patch){await db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.concessao===token)tx.update(ref,{...patch,concessao:'',concessaoAte:''});});}
}
export async function sincronizarOcorrenciasI165(db,{agora=new Date(),enviarPush,enviarEmail,canais=['push','email'],limite=60}={}){
 const p=await db.doc('processo_calendarios_i164/ativo').get();if(!processoAtivoI164(p.data()))return {ativa:false};
 const ciclos=await db.collection('planejamento_social_i155').where('incluido','==',true).get();let criadas=0,erros=[];
 for(const d of ciclos.docs){const c={...d.data(),id:d.id};for(const o of ocorrenciasPlanejamentoI164(c,agora)){await registrarOcorrenciaI165(db,o,agora);criadas++;}try{for(const o of await consultarRevisaoCalendarioI164(db,c,agora)){await registrarOcorrenciaI165(db,o,agora);criadas++;}}catch(e){erros.push({origem:'calendario_revisao',ciclo:d.id,erro:e.message});}try{for(const o of await consultarEnvioCalendarioI164(db,c,agora)){await registrarOcorrenciaI165(db,o,agora);criadas++;}}catch(e){erros.push({origem:'calendario_envio',ciclo:d.id,erro:e.message});}}
 const continuidades=await db.collection('continuidade_calendarios_i164').where('ativo','==',true).limit(1001).get();
 if(continuidades.size>1000)throw Error('Há mais continuidades do que esta conferência comporta; nenhuma lista foi truncada.');
 const ciclosAtuais=new Set(ciclos.docs.map(d=>d.id));
 for(const d of continuidades.docs){
  if(d.data().ativacaoId!==p.data().ativacaoId||ciclosAtuais.has(d.id)&&!d.data().preparacaoPreservadaI155)continue;
  try{for(const o of await consultarCalendarioLegadoI164(db,d.id,agora)){await registrarOcorrenciaI165(db,o,agora);criadas++;}}catch(e){erros.push({origem:'calendario_legado',ciclo:d.id,erro:e.message});}
 }
  // A estratégia tem fonte própria: não fabrica ciclo I155 nem demanda para gerar o aviso.
  const estrategias=await db.collection('planejamento_estrategico_cp109').limit(1001).get();
  if(estrategias.size>1000)throw Error('Há mais planejamentos estratégicos que esta conferência comporta; nenhuma fonte foi truncada.');
  for(const d of estrategias.docs)try{for(const o of await ocorrenciasPlanejamentoCp109(db,{origem:{id:d.id}},agora)){await registrarOcorrenciaI165(db,o,agora);criadas++;}}catch(e){erros.push({origem:'planejamento_estrategico_cp109',ciclo:d.id,erro:e.message});}
  const pendentes=await db.collection('notificacoes_operacionais_i165').where('estado','==','pendente').get(),enviar=[];for(const d of pendentes.docs){const n=d.data();if(!notaCentralI164(n)||n.origem?.tipo===TIPO_DEMANDA_REFAZER_CP131)continue;let pendente;try{pendente=await fonteAindaPendenteI165(db,n,agora);}catch(e){erros.push({origem:n.origem?.tipo,aviso:d.id,erro:e.message});continue;}if(!pendente){await d.ref.update({estado:'resolvida',resolvidaEm:agora.toISOString(),motivo:'A fonte foi conferida e avançou ou saiu da operação.'});continue;}const canaisNota=n.origem?.tipo==='referencias_cp109'?[]:canais;if(canaisNota.some(k=>n.canais?.[k]?.estado==='resultado_desconhecido'&&n.canais?.[k]?.tentativaId||!['aceita_pelo_provedor','resultado_desconhecido'].includes(n.canais?.[k]?.estado)&&!(n.canais?.[k]?.proximaTentativa>agora.toISOString())))enviar.push(d);}enviar.sort((a,b)=>(a.data().conferidaEm||'').localeCompare(b.data().conferidaEm||''));for(let i=0;i<Math.min(limite,enviar.length);i+=5)await Promise.all(enviar.slice(i,Math.min(i+5,limite)).map(d=>despacharOcorrenciaI165(db,d.id,{agora,enviarPush,enviarEmail,canaisHabilitados:canais}).catch(e=>erros.push({aviso:d.id,erro:e.message}))));
 await db.doc('servicos_i164/notificacoes').set({estado:erros.length?'conferir_origens':'conferida',ultimaExecucao:agora.toISOString(),ocorrenciasConferidas:criadas,pendentesProcessadas:pendentes.size,erros:erros.slice(0,100),servico:'Functions · executa com o portal fechado'},{merge:true});return {ativa:true,ocorrenciasConferidas:criadas,processadas:pendentes.size,erros};
}

/* Mesmas demandas I167, mesma coleção e mesmo dispatcher. Nenhuma demanda é criada. */
export async function sincronizarOrganizacaoI167(db,{agora=new Date(),enviarPush,enviarEmail,canais=['push','email'],limite=60}={}){
 const cfg=await db.doc('programacao_config_i165/ativo').get();if(cfg.data()?.schema!==1||cfg.data()?.ativo!==true||cfg.data()?.habilidades?.organizacao!==true)return {ativa:false};
 const fontes=await db.collection('demandas').where('tipoEspecial','==','organizacao_social_i167').get();const erros=[];let conferidas=0;
 for(const s of fontes.docs)try{const o=ocorrenciaOrganizacaoI167({...s.data(),id:s.id},agora);if(o){await registrarOcorrenciaI165(db,o,agora);conferidas++;}}catch(e){erros.push({demandaId:s.id,erro:e.message});}
 const notas=await db.collection('notificacoes_operacionais_i165').where('estado','==','pendente').get();let processadas=0;
 for(const s of notas.docs){const n=s.data();if(n.origem?.tipo!=='organizacao_i167')continue;try{if(!await fonteAindaPendenteI165(db,n,agora)){await s.ref.update({estado:'resolvida',resolvidaEm:agora.toISOString(),motivo:'A demanda física avançou ou mudou; nenhuma entrega foi aprovada por este aviso.'});continue;}if(n.nivel==='aguardando'||processadas>=limite)continue;await despacharOcorrenciaI165(db,s.id,{agora,enviarPush,enviarEmail,canaisHabilitados:canais});processadas++;}catch(e){erros.push({aviso:s.id,erro:e.message});}}
 return {ativa:true,conferidas,processadas,erros};
}

/* Continuidade explícita do mês físico. Não cria preparação, base ou demanda. */
export async function ocorrenciasCalendarioLegadoI164(raw,cal,registro,processo,preparacao=null){
 const cliente=raw?.cliente,mes=raw?.competencia,id=mes+'__'+cliente;
 if(!processoAtivoI164(processo)||raw?.ativacaoId!==processo.ativacaoId||raw?.ativo!==true)return [];
 const c=contextoLegadoEditorialI172({cliente,competencia:mes},raw,processo,cal,preparacao);
 if(cal?.excluido||cal?.arquivado||cal?.archived||cal?.deletedAt)return [];
 if(!fonteFisicaClienteR4(cliente,cal)||!Array.isArray(cal.items))throw Error('O calendário físico da continuidade precisa ser conferido.');
 const itens=cal.items.filter(x=>x&&!x.excluido&&mesDoItemCalendario(cal,x)===mes);
 if(!itens.length)return [];
 const marca=cal.aprovacaoMeses?.[mes],st=c._estadoLegado;
 const origem={id,cliente,competencia:mes,origemEditorial:'continuar_legado',revisaoContinuidade:raw.revisao};
 if(st.fase==='enviada'&&['aguardando_interna','aprovado_interno'].includes(marca?.status)){
  const revisao=revisaoI148(cliente,mes,cal,itens,marca.status);
  return [{origem:{tipo:'calendario_revisao',...origem},versao:hash([revisao,origem]),destinatario:'Amanda',nivel:'revisar',titulo:'Calendário para revisar · '+c.clienteNome,texto:'O calendário de '+mes+' continua na mesma fonte. Confira os conteúdos e o motivo antes de decidir.',link:{area:'aprovar',ciclo:id,cliente,competencia:mes,origemEditorial:'continuar_legado'}}];
 }
 if(st.fase!=='publicada'||marca?.status!=='liberado'||marca.aprovadoPor!=='Amanda')return [];
 const foto=marca.retratoLiberadoV115;
 if(foto?.mes!==mes||!Array.isArray(foto.items)||!foto.items.some(x=>x&&!x.excluido)||!marca.aprovadoEm||foto.publicadoEm!==marca.aprovadoEm)return [];
 validarRegistroEnvioI92(registro,cliente,mes);
 const ref=await referenciaPublicacaoI92(cliente,mes,cal,foto.items);
 if(registro?.enviado===true&&registro.publicacao===ref.assinatura)return [];
 // Ausência de recibo antigo não significa que o cliente deixou de receber.
 const publicadaAgora=st.publicacaoAtual?.por==='Amanda'&&st.publicacaoAtual.em===marca.aprovadoEm&&jsonI165(st.publicacaoAtual.retrato)===jsonI165(foto);
 const pendenciaConfirmada=raw.envioPendenteI164?.schema===1&&raw.envioPendenteI164.publicacao===ref.assinatura&&raw.envioPendenteI164.confirmadoPor==='Amanda';
 if(!publicadaAgora&&!pendenciaConfirmada)return [];
 return [{origem:{tipo:'calendario_envio',...origem,publicacao:ref.assinatura},versao:hash([origem,ref.assinatura,registro?.revision||0,registro?.operacaoId||'']),destinatario:'Cecília',nivel:'liberado',titulo:'Calendário liberado · '+c.clienteNome,texto:'Amanda liberou '+mes+'. Confira a mesma versão, envie ao cliente e organize a captação. Confirme após compartilhar.',link:{area:'enviar',ciclo:id,cliente,competencia:mes,origemEditorial:'continuar_legado'}}];
}
async function consultarCalendarioLegadoI164(db,id,agora,tipo=''){
 if(!/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(id||''))throw Error('A continuidade precisa confirmar cliente e mês.');
 const cliente=id.slice(9),competencia=id.slice(0,7);
 const [legado,ciclo,cal,processo]=await Promise.all([db.doc('continuidade_calendarios_i164/'+id).get(),db.doc('planejamento_social_i155/'+id).get(),db.doc('calendarios/'+cliente).get(),db.doc('processo_calendarios_i164/ativo').get()]);
 if(!legado.exists||!cal.exists||!processoAtivoI164(processo.data()))return [];
 if(legado.data().cliente!==cliente||legado.data().competencia!==competencia)throw Error('A continuidade não pertence ao cliente e mês desta origem.');
 const [registro,extras,configs]=await Promise.all([db.doc('calendarios_envios_cecilia_i92/'+chaveEnvioI92(cliente,competencia)).get(),db.collection('clientes_extras').get(),db.collection('clientes_config').get()]);
 const rows=s=>s.docs.map(d=>({id:d.id,data:d.data()}));
 const carteira=carteiraCanonicaI164({extras:rows(extras),configs:rows(configs),competencia,hoje:horarioI165(agora).slice(0,10)});
 if(!carteira.carteira.some(x=>x.slug===cliente))return [];
 const ocorrencias=await ocorrenciasCalendarioLegadoI164(legado.data(),cal.data(),registro.exists?registro.data():null,processo.data(),ciclo.exists?ciclo.data():null);
 return ocorrencias.filter(o=>(!tipo||o.origem.tipo===tipo)&&(o.origem.tipo!=='calendario_envio'||calendarioEnviavelI164({cliente,competencia},cal.data(),{extras:rows(extras),configs:rows(configs),agora})));
}

/* Mesmo tick, registro e dispatcher I165. A fonte I161 continua sendo a demanda. */
export async function sincronizarDemandasRefazerCp131(db,{agora=new Date(),enviarPush,enviarEmail,canais=['push','email'],limite=60}={}){
 const cfg=(await db.doc('programacao_config_i165/ativo').get()).data();if(!programacaoAtivaI165(cfg))return {ativa:false};
 const fontes=await db.collection('demandas').where('refazerUltimoI161.operacao','>=','').limit(1001).get();
 if(fontes.size>1000)throw Error('Há mais devoluções que esta conferência comporta. Nenhuma lista foi cortada.');
 const canaisAtivos=canais.filter(c=>cfg.habilidades?.[c]===true),erros=[];let conferidas=0,processadas=0;
 for(const s of fontes.docs)try{const o=ocorrenciaDemandaRefazerCp131({...s.data(),id:s.id});if(o){await registrarOcorrenciaI165(db,o,agora);conferidas++;}}catch(e){erros.push({demandaId:s.id,erro:String(e.message).slice(0,500)});}
 const notas=await db.collection('notificacoes_operacionais_i165').where('origem.tipo','==',TIPO_DEMANDA_REFAZER_CP131).where('estado','==','pendente').limit(1001).get();
 if(notas.size>1000)throw Error('Há mais avisos devolvidos que esta conferência comporta. Nenhuma lista foi cortada.');
 const enviar=[];
 for(const s of notas.docs)try{const n=s.data();if(!await fonteAindaPendenteI165(db,n,agora)){await s.ref.update({estado:'resolvida',resolvidaEm:agora.toISOString(),motivo:'A mesma demanda foi entregue, repassada, arquivada ou mudou de rodada.'});continue;}if(canaisAtivos.some(k=>n.canais?.[k]?.estado==='resultado_desconhecido'&&n.canais?.[k]?.tentativaId||!['aceita_pelo_provedor','resultado_desconhecido'].includes(n.canais?.[k]?.estado)&&!(n.canais?.[k]?.proximaTentativa>agora.toISOString())))enviar.push(s);}catch(e){erros.push({aviso:s.id,erro:String(e.message).slice(0,500)});}
 enviar.sort((a,b)=>(a.data().conferidaEm||'').localeCompare(b.data().conferidaEm||'')||a.id.localeCompare(b.id));
 for(const s of enviar.slice(0,limite))try{await despacharOcorrenciaI165(db,s.id,{agora,enviarPush,enviarEmail,canaisHabilitados:canaisAtivos});processadas++;}catch(e){erros.push({aviso:s.id,erro:String(e.message).slice(0,500)});}
 return {ativa:true,conferidas,processadas,erros};
}
