import{FieldValue}from'firebase-admin/firestore';
import{agendaDasFontesI167}from'./agenda-organizacao-i167.mjs';
import{criarRepositorio,novaAgenda,ETAPAS,cargaAgenda}from'./lib/gs-planejamento-social-i155.mjs';
import{processoAtivoI164,planoRecorrenciaI164}from'./lib/gs-processo-calendarios-i164.mjs';
import{carteiraCanonicaI164}from'./lib/gs-carteira-calendarios-i164.mjs';
const linhas=s=>s.docs.map(d=>({id:d.id,data:d.data()}));
const snapshotCliente=s=>s.docs?s:{id:s.id,ref:s.ref,exists:()=>s.exists,data:()=>s.data()};
export function agendaDoModeloI164(modelo,entrega,config,ausencias=[]){const agenda=novaAgenda();if(!config.dias?.length)throw Error('Dias de trabalho não configurados.');for(const[k,,p]of ETAPAS){const n=modelo.offsets?.[k];if(!Number.isInteger(n)||n<0||n>90)throw Error('Modelo incompleto.');const d=new Date(entrega+'T12:00:00Z');let faltam=n,limite=0;while(faltam>0){d.setUTCDate(d.getUTCDate()-1);const iso=d.toISOString().slice(0,10);if(config.dias.includes(d.getUTCDay())&&!(config.feriados||[]).includes(iso)&&!ausencias.some(a=>!a.excluido&&(a.pessoa===p||a.nome===p||a.funcionario===p)&&String(a.inicio||a.dataInicio||'')<=iso&&String(a.fim||a.dataFim||'9999')>=iso))faltam--;if(++limite>730)throw Error('Modelo não encontrou janela de trabalho.');}agenda[k]={...agenda[k],inicio:d.toISOString().slice(0,10),prazo:d.toISOString().slice(0,10),prazoHora:modelo.horarios?.[k]||'19:00'};}for(let i=1;i<ETAPAS.length;i++)if(agenda[ETAPAS[i][0]].prazo<agenda[ETAPAS[i-1][0]].prazo)throw Error('O modelo coloca uma etapa antes de sua dependência.');return agenda;}
export function distribuirAgendaRecorrenteI164(plan,config,ciclos,ausencias,hoje){
 const resultado=new Map(),carga=new Map(cargaAgenda(ciclos,config).map(x=>[[x.dia,x.pessoa,x.etapa].join('|'),x.planejado]));
 if(ETAPAS.some(([k])=>!Number.isInteger(config.capacidades?.[k])||config.capacidades[k]<(k==='pesquisa'?12:1)))throw Error('Confirme a capacidade diária de todas as etapas, incluindo referências e entregas.');
 for(const item of plan.filter(x=>x.criar)){let agenda=null;const entrega=new Date(item.entrega+'T12:00:00Z');for(let tentativa=0;tentativa<62;tentativa++){
   const dia=entrega.toISOString().slice(0,10);if(dia<hoje)break;
   if(config.dias.includes(entrega.getUTCDay())&&!(config.feriados||[]).includes(dia)){
    const proposta=agendaDoModeloI164(item.modelo,dia,config,ausencias),cabe=ETAPAS.every(([k,,p])=>{const a=proposta[k],quant=k==='pesquisa'?12:1;return a.prazo>=hoje&&config.dias.includes(new Date(a.prazo+'T12:00:00Z').getUTCDay())&&!(config.feriados||[]).includes(a.prazo)&&!ausencias.some(x=>!x.excluido&&(x.pessoa===p||x.nome===p||x.funcionario===p)&&String(x.inicio||x.dataInicio||'')<=a.prazo&&String(x.fim||x.dataFim||'9999')>=a.prazo)&&(carga.get([a.prazo,p,k].join('|'))||0)+quant<=config.capacidades[k];});
    if(cabe){agenda=proposta;break;}
   }entrega.setUTCDate(entrega.getUTCDate()-1);
  }
  if(!agenda){resultado.set(item.id,{erro:'A agenda não tem capacidade ou janela livre antes da entrega. Amanda pode ajustar as datas e o modelo.'});continue;}
  for(const[k,,p]of ETAPAS){const chave=[agenda[k].prazo,p,k].join('|');carga.set(chave,(carga.get(chave)||0)+(k==='pesquisa'?12:1));}resultado.set(item.id,{agenda});
 }return resultado;
}
async function executarRecorrenciaInternaI164(db,{agora=new Date(),registro=()=>{}}={}){
 const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(agora),[p,co]=await Promise.all([db.doc('processo_calendarios_i164/ativo').get(),db.doc('planejamento_social_config_i155/agenda').get()]);
 if(!processoAtivoI164(p.data())||!co.data()?.recorrencia?.ativa)return {ativa:false,criadas:[],preservadas:[]};
 const config=co.data(),processo=p.data(),r=config.recorrencia;if(!Array.isArray(r.clientes)||!Number.isInteger(r.diaPreparacao)||r.diaPreparacao<1||r.diaPreparacao>28)throw Error('Confira os clientes e o dia da repetição.');if(Number(hoje.slice(8))<r.diaPreparacao)return {ativa:true,criadas:[],preservadas:[]};
 const prox=new Date(hoje+'T12:00:00Z');prox.setUTCDate(15);prox.setUTCMonth(prox.getUTCMonth()+1);const competencia=prox.toISOString().slice(0,7),[ex,cf,ca,ci]=await Promise.all(['clientes_extras','clientes_config','calendarios','planejamento_social_i155'].map(c=>db.collection(c).get())),carteira=carteiraCanonicaI164({extras:linhas(ex),configs:linhas(cf),hoje,competencia}),resultado={ativa:true,criadas:[],preservadas:[]};
 for(const cl of r.clientes){const item={cliente:cl.slug,competencia,id:competencia+'__'+cl.slug};const cal=ca.docs.find(s=>s.id===cl.slug)?.data(),ciclo=ci.docs.find(s=>s.data().cliente===cl.slug&&s.data().competencia===competencia),cfg=carteira.configuracoes[cl.slug]||{};
  const motivo=!carteira.carteira.some(c=>c.slug===cl.slug)?'Cliente fora da carteira confirmada':cfg.semConteudoRecorrente===true||cfg.tipoEntrega==='entrega_direta'&&cfg.semConteudoRecorrente!==false?'Plano sem calendário recorrente':ciclo?'Ciclo existente preservado':(cal?.items||[]).some(x=>!x.excluido&&(x.mes||cal.mesLegado||'')===competencia)||cal?.aprovacaoMeses?.[competencia]?'Calendário existente preservado':'';if(motivo){resultado.preservadas.push({...item,motivo});continue;}
  try{const fontes=await db.collection('demandas').where('cliente','==',cl.slug).get(),agendaInicial=await agendaDasFontesI167({...item,linhas:fontes.docs.map(s=>({id:s.id,documento:s.data()}))});let txAtual=null;
   const io={db,doc:(_, ...ps)=>db.doc(ps.join('/')),collection:(_, ...ps)=>db.collection(ps.join('/')),where:(...a)=>a,query:(q,...ws)=>ws.reduce((v,a)=>v.where(...a),q),getDocFromServer:async ref=>snapshotCliente(await ref.get()),getDocsFromServer:ref=>ref.get(),serverTimestamp:()=>FieldValue.serverTimestamp(),writeBatch:()=>db.batch(),runTransaction:(_,fn)=>db.runTransaction(async tx=>{txAtual=tx;try{return await fn(new Proxy(tx,{get(t,k){if(k==='get')return async ref=>snapshotCliente(await t.get(ref));const v=t[k];return typeof v==='function'?v.bind(t):v;}}));}finally{txAtual=null;}})};
   const repo=criarRepositorio(io,()=>({uid:'servico-planejamento-i164',nome:'Amanda',atorReal:'sistema · organização já confirmada pela Amanda',sessao:processo.ativacaoId}),{clientes:async mes=>{
    const [pc,ac,es,cs,atual,ocupacao,fs]=await Promise.all([txAtual.get(db.doc('processo_calendarios_i164/ativo')),txAtual.get(db.doc('planejamento_social_config_i155/agenda')),txAtual.get(db.collection('clientes_extras')),txAtual.get(db.collection('clientes_config')),txAtual.get(db.doc('calendarios/'+cl.slug)),txAtual.get(db.collection('planejamento_social_i155')),txAtual.get(db.collection('demandas').where('cliente','==',cl.slug))]);
    if(!processoAtivoI164(pc.data())||pc.data().ativacaoId!==processo.ativacaoId||ac.data()?.revisao!==config.revisao||ac.data()?.recorrencia?.ativa!==true||!ac.data().recorrencia.clientes.some(x=>x.slug===cl.slug))throw Error('A agenda ou a troca mudou; reavaliar na próxima execução.');
    if(ocupacao.docs.some(s=>s.data().cliente===cl.slug&&s.data().competencia===mes)||(atual.data()?.items||[]).some(x=>!x.excluido&&(x.mes||atual.data().mesLegado||'')===mes)||atual.data()?.aprovacaoMeses?.[mes])throw Error('Trabalho iniciado no intervalo; preservado sem recriar.');
    const fresca=await agendaDasFontesI167({cliente:cl.slug,competencia:mes,linhas:fs.docs.map(s=>({id:s.id,documento:s.data()}))});for(const k of Object.keys(agendaInicial))delete agendaInicial[k];Object.assign(agendaInicial,fresca);return carteiraCanonicaI164({extras:linhas(es),configs:linhas(cs),hoje,competencia:mes}).carteira;
   },origens:async()=>[],calendario:async()=>({disponivel:false})});
   const op=('rec_'+processo.ativacaoId.replace(/[^A-Za-z0-9_-]/g,'').slice(0,40)+'_'+competencia+'_'+cl.slug).slice(0,100),salvo=await repo.mutar(item.id,'incluir',{cliente:cl.slug,competencia,agendaInicial},0,op);resultado.criadas.push({id:item.id,revisao:salvo.ciclo.revisao,fontesI167:Object.values(agendaInicial).map(a=>a.origemI167.demandaId)});
  }catch(e){registro({tipo:'recorrencia_pendente',ciclo:item.id,erro:e.message});resultado.preservadas.push({...item,motivo:e.message});}
 }
 return resultado;
}

// Uma concessão curta evita duas instâncias planejarem simultaneamente; a transação de cada ciclo relê também ocupação/ausências.
export async function executarRecorrenciaI164(db,opcoes={}){
 const ativo=await db.doc('processo_calendarios_i164/ativo').get();if(!processoAtivoI164(ativo.data()))return {ativa:false,criadas:[],preservadas:[]};
 const agora=opcoes.agora||new Date(),token=crypto.randomUUID(),ref=db.doc('servicos_i164/recorrencia');
 const obtida=await db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.concessaoAte>agora.toISOString())return false;tx.set(ref,{token,concessaoAte:new Date(agora.getTime()+180000).toISOString(),inicio:agora.toISOString(),estado:'executando'},{merge:true});return true;});
 if(!obtida)return {ativa:true,adiada:true,criadas:[],preservadas:[]};
 try{const r=await executarRecorrenciaInternaI164(db,opcoes);await db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.token===token)tx.set(ref,{estado:'conferida',concessaoAte:'',termino:new Date().toISOString(),criadas:r.criadas.length,pendencias:r.preservadas.filter(x=>x.motivo).map(x=>({cliente:x.cliente,motivo:x.motivo})).slice(0,100)},{merge:true});});return r;}
 catch(e){await db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.token===token)tx.set(ref,{estado:'falha',concessaoAte:'',erro:e.message,termino:new Date().toISOString()},{merge:true});});throw e;}
}
