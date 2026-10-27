/* Uma decisão mensal sobre cobranças existentes; não registra reuniões individuais. */
import {validarContaEsperadaI165} from './intencao-operacao.mjs';
import {contextoTxI165,hashI165} from './contexto.mjs';
export const ACOES_REUNIOES_MENSAIS_CP111=Object.freeze(['reunioes_mes_ler_cp111','reunioes_mes_salvar_cp111']);
const MODOS=['normal','ja_realizadas','dispensadas'],COMUNS=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao','pessoa','mes'];
const exigir=(ok,msg,code='entrada')=>{if(!ok)throw Object.assign(Error(msg),{code:'i165/reunioes-mensais-'+code});};
const idsMes=mes=>['fixa_padrao_agendaReuniao_'+mes,'fixa_padrao_reuniao_'+mes];
const fonteSemMarcador=d=>{const c={...d};delete c.reunioesMensaisCp111;return c;};
const stamp=s=>s?.updateTime?.toJSON?.()||s?.updateTime||null;
const opRef=(db,a,id)=>db.doc('agenda_reunioes_operacoes_cp111/'+hashI165([a.uid,a.papel,a.real,id]));
function politica(raw){const p=raw?.regraMensalCp111;if(!p)return {modo:'normal',motivo:'',revision:0,decisaoId:'',autoria:null,em:''};exigir(MODOS.includes(p.modo)&&Number.isInteger(p.revision)&&p.revision>=1,'A política mensal existente precisa de conferência.','fonte');return p;}
function entrada(d){
 exigir(ACOES_REUNIOES_MENSAIS_CP111.includes(d?.acao),'Ação mensal desconhecida.');const salvar=d.acao==='reunioes_mes_salvar_cp111',extras=salvar?['modo','motivo','assinaturaEsperada','operacaoId']:['operacaoId'];
 exigir(Object.keys(d).every(k=>[...COMUNS,...extras].includes(k)),'A ação mensal não recebe caminhos ou documentos completos.');exigir(d.pessoa==='Amanda'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(d.mes||''),'Confira Amanda e o mês civil.');
 if(d.operacaoId!==undefined)exigir(/^[A-Za-z0-9_-]{8,100}$/.test(d.operacaoId),'Confira a mesma operação mensal.');
 if(salvar){exigir(d.operacaoId&&MODOS.includes(d.modo)&&typeof d.motivo==='string'&&d.motivo.trim()&&d.motivo.length<=2000,'Escolha a situação e deixe o motivo desta decisão.');exigir(/^[a-f0-9]{64}$/.test(d.assinaturaEsperada||''),'Releia a situação mensal antes de salvar.','versao');}return salvar;
}
async function lerFontes(db,tx,d){const ar=db.doc('agenda_reunioes/Amanda_'+d.mes),ids=idsMes(d.mes),[agenda,...snaps]=await Promise.all([tx.get(ar),...ids.map(id=>tx.get(db.doc('demandas/'+id)))]),raw=agenda.exists?agenda.data():null;
 const regra=politica(raw),cobrancas=snaps.map((s,i)=>({id:ids[i],ref:db.doc('demandas/'+ids[i]),raw:s.exists?s.data():null,updateTime:stamp(s)}));
 return {ar,raw,regra,cobrancas,assinatura:hashI165({agenda:raw,agendaUpdateTime:stamp(agenda),cobrancas:cobrancas.map(({id,raw,updateTime})=>({id,raw,updateTime}))})};
}
function dto(d,f){return {schema:1,pessoa:'Amanda',mes:d.mes,agenda:f.raw,regraMensalCp111:f.regra,revisaoMensal:f.regra.revision,assinatura:f.assinatura,demandaIds:idsMes(d.mes),cobrancas:f.cobrancas.map(x=>({id:x.id,existe:!!x.raw,status:x.raw?.status||'',encerradaPorEsteControle:x.raw?.status==='cancelada'&&x.raw.reunioesMensaisCp111?.mes===d.mes})),leituraNaoConclui:true,naoRegistraReuniaoIndividual:true};}
export async function operarReunioesMensaisCp111(db,auth,d,{agora=new Date()}={}){
 const salvar=entrada(d),a=validarContaEsperadaI165(auth,d);exigir((salvar?['Chris','Amanda']:['Chris','Amanda','Cecília']).includes(a.papel),'Esta decisão é da Amanda ou do Chris; Cecília consulta.','papel');
 const negocio=salvar?{pessoa:d.pessoa,mes:d.mes,modo:d.modo,motivo:d.motivo.trim(),assinaturaEsperada:d.assinaturaEsperada,operacaoId:d.operacaoId}:null,pedidoHash=salvar?hashI165({negocio,uid:a.uid,papel:a.papel,atorReal:a.real}):null,em=agora.toISOString();
 return db.runTransaction(async tx=>{
  await contextoTxI165(db,tx,a,'programacao');const f=await lerFontes(db,tx,d),rr=d.operacaoId?opRef(db,a,d.operacaoId):null,ant=rr?await tx.get(rr):null;
  if(ant?.exists){const r=ant.data();exigir(r.tipo==='reunioes_mensais_cp111'&&r.pessoa===d.pessoa&&r.mes===d.mes&&r.autoria?.uid===a.uid&&r.autoria?.papel===a.papel&&r.autoria?.atorReal===a.real,'Este recibo pertence a outra operação mensal.','operacao');if(salvar){exigir(r.pedidoHash===pedidoHash,'O ID já pertence a outro preenchimento; preserve a tentativa original.','operacao');return {estado:'recuperado',recibo:r,...dto(d,f)};}return {...dto(d,f),operacao:{id:d.operacaoId,confirmada:true,recibo:r}};}
  if(!salvar)return {...dto(d,f),...(d.operacaoId?{operacao:{id:d.operacaoId,confirmada:false}}:{})};
  exigir(f.assinatura===d.assinaturaEsperada,'A agenda, a decisão ou uma cobrança mudou. Seus campos foram preservados; confira a versão atual.','versao');
  const historicos=new Map();if(d.modo==='normal')for(const x of f.cobrancas){const m=x.raw?.reunioesMensaisCp111;if(m?.reciboId&&/^[a-f0-9]{64}$/.test(m.reciboId)&&!historicos.has(m.reciboId))historicos.set(m.reciboId,(await tx.get(db.doc('agenda_reunioes_operacoes_cp111/'+m.reciboId))).data()||null);}
  const fechadas=[],reabertas=[],preservadas=[],writes=[];
  for(const x of f.cobrancas){const old=x.raw;if(old)exigir(old.historico===undefined||Array.isArray(old.historico),'O histórico da cobrança precisa de conferência; nada foi substituído.','fonte');if(!old){preservadas.push({id:x.id,motivo:'ausente_sem_criar'});continue;}
   if(d.modo!=='normal'){
    if(old.status!=='pendente'){preservadas.push({id:x.id,motivo:'nao_pendente'});continue;}
    const closed={...old,status:'cancelada',canceladaPor:a.real,canceladaEm:em,motivoCancelamento:'Rotina mensal '+d.mes+': '+negocio.motivo,historico:[...(Array.isArray(old.historico)?old.historico:[]),{acao:'Cobrança mensal encerrada por decisão operacional',modo:d.modo,motivo:negocio.motivo,por:a.real,papel:a.papel,em,operacaoId:d.operacaoId,semRegistrarReuniaoIndividual:true}]};
    const marca={schema:1,pessoa:'Amanda',mes:d.mes,modo:d.modo,decisaoId:d.operacaoId,reciboId:rr.id,statusAnterior:'pendente',fonteAnteriorSHA256:hashI165(old),fonteFechadaSHA256:hashI165(fonteSemMarcador(closed))};writes.push({ref:x.ref,data:{...closed,reunioesMensaisCp111:marca}});fechadas.push({id:x.id,statusAnterior:'pendente',fonteAnteriorSHA256:marca.fonteAnteriorSHA256,fonteFechadaSHA256:marca.fonteFechadaSHA256});
   }else{
    const m=old.reunioesMensaisCp111,r=historicos.get(m?.reciboId),origem=r?.fechadas?.find(v=>v.id===x.id);
    const mesma=old.status==='cancelada'&&m?.schema===1&&m.pessoa==='Amanda'&&m.mes===d.mes&&m.statusAnterior==='pendente'&&r?.tipo==='reunioes_mensais_cp111'&&r.pessoa==='Amanda'&&r.mes===d.mes&&r.operacaoId===m.decisaoId&&r.modo!=='normal'&&origem?.fonteFechadaSHA256===m.fonteFechadaSHA256&&hashI165(fonteSemMarcador(old))===m.fonteFechadaSHA256;
    if(!mesma){preservadas.push({id:x.id,motivo:'nao_foi_fechada_pela_mesma_decisao_ou_fonte_mudou'});continue;}
    writes.push({ref:x.ref,data:{...old,status:m.statusAnterior,reunioesMensaisCp111:{...m,reabertaPor:d.operacaoId,reabertaEm:em},historico:[...(Array.isArray(old.historico)?old.historico:[]),{acao:'Cobrança mensal retomada pela mesma fonte conferida',por:a.real,papel:a.papel,em,operacaoId:d.operacaoId,decisaoFechamento:m.decisaoId}]}});reabertas.push({id:x.id,decisaoFechamento:m.decisaoId});
   }
  }
  const regraMensalCp111={modo:d.modo,motivo:negocio.motivo,revision:f.regra.revision+1,decisaoId:d.operacaoId,autoria:{uid:a.uid,papel:a.papel,atorReal:a.real},em},recibo={schema:1,tipo:'reunioes_mensais_cp111',pessoa:'Amanda',mes:d.mes,operacaoId:d.operacaoId,pedidoHash,modo:d.modo,motivo:negocio.motivo,revision:regraMensalCp111.revision,assinaturaAntes:f.assinatura,autoria:regraMensalCp111.autoria,em,fechadas,reabertas,preservadas,semRegistrarReuniaoIndividual:true};
  tx.set(f.ar,{...(f.raw||{}),regraMensalCp111});for(const w of writes)tx.set(w.ref,w.data);tx.set(rr,recibo);
  // A assinatura definitiva inclui updateTimes: a resposta relê após o commit, abaixo.
  return {estado:'novo',recibo,mes:d.mes,pessoa:'Amanda',aguardaReadback:true};
 }).then(async r=>{if(!r.aguardaReadback)return r;return db.runTransaction(async tx=>{await contextoTxI165(db,tx,a,'programacao');return {estado:r.estado,recibo:r.recibo,...dto(d,await lerFontes(db,tx,d))};});});
}
