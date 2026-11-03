/* Recepção interna somente de leitura. Insumos confirmados não são autorização para criar ou publicar. */
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x),slug=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._-]{0,119}$/.test(x),month=x=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(x||''),rid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(x),txt=x=>typeof x==='string'?x:'',clone=x=>JSON.parse(JSON.stringify(x));
const TYPES=['previa','reuniao','consolidado','diagnostico','campanha','referencias'],MATERIAL=['diagnostico','campanha','referencias'],EMPRESAS=['otica_hauer','otica_sao_jose','clinica_olhos_hauer','clinica_sao_jose'];
const labels={previa:'Prévia para reunião',reuniao:'Retorno da reunião',consolidado:'Base do calendário',diagnostico:'Resultados e contexto',campanha:'Campanhas',referencias:'Referências'};
const canonical=x=>JSON.stringify((function sort(v){return Array.isArray(v)?v.map(sort):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;})(x));
const require=(v,m)=>{if(!v)throw Error(m);};
function catalogoConfirmado(r,mes){
 require(r?.estado==='confirmada'&&r.competencia===mes&&Array.isArray(r.clientes)&&Array.isArray(r.ciclos),'A carteira e os ciclos do mês não foram confirmados.');
 require(r.clientes.length<=200,'A carteira tem mais de 200 clientes. A coleta não foi cortada; precisa de uma leitura em lotes autorizada.');
 const clientes=new Map(),ciclos=new Map();
 for(const c of r.clientes){const key=c?.slug||c?.id;require(slug(key)&&!clientes.has(key),'A carteira contém identificação inválida ou repetida.');clientes.set(key,{cliente:key,nome:txt(c.nome||c.name)||key});}
 for(const c of r.ciclos){require(plain(c)&&slug(c.cliente)&&c.competencia===mes&&c.id===mes+'__'+c.cliente&&Number.isInteger(c.revisao)&&c.revisao>=0&&!ciclos.has(c.id),'Os ciclos do mês não confirmaram uma identificação e revisão únicas.');ciclos.set(c.id,c);}
 return {clientes,ciclos,assinatura:canonical({clientes:[...clientes.values()].sort((a,b)=>a.cliente.localeCompare(b.cliente)),ciclos:[...ciclos.values()].filter(c=>clientes.has(c.cliente)).map(c=>({id:c.id,revisao:c.revisao,incluido:c.incluido,documentos:c.documentos||{}})).sort((a,b)=>a.id.localeCompare(b.id))})};
}
function alvosConfirmados(c){
 const d=plain(c.documentos)?c.documentos:{},headers=new Map(),ignored=new Set();
 const add=(key,id,base=false)=>{require(rid(id),'Um ponteiro de documento confirmado está inválido.');if(d.desconsideracoesCp111?.[id]){ignored.add(id);return;}let h=headers.get(id);if(!h){h={id,chaves:[],base};headers.set(id,h);}h.base=h.base||base;if(!h.chaves.includes(key))h.chaves.push(key);};
 require(d.materiais===undefined||plain(d.materiais),'Os materiais confirmados precisam de conferência.');
 for(const [key,id]of Object.entries(d.materiais||{}))if(id)add(key,id);
 for(const key of TYPES)if(d[key]&&!(MATERIAL.includes(key)&&d.materiais?.[key+'__geral']))add(key,d[key]);
 if(d.consolidadoEnviado)add('consolidado',d.consolidadoEnviado,true);
 return {headers:[...headers.values()],desconsiderados:ignored.size,rascunhos:new Set(Object.values(d.rascunhos||{}).filter(id=>rid(id)&&!headers.has(id))).size};
}
function documentoConfirmado(c,r,h,nome){
 const d=c.documentos||{},tipo=r?.finalidade,empresa=txt(r?.empresaOtavio),key=MATERIAL.includes(tipo)?tipo+'__'+(empresa||'geral'):tipo;
 require(r?.id===h.id&&r.tipo==='documento'&&r.cliente===c.cliente&&r.competencia===c.competencia&&TYPES.includes(tipo)&&(!empresa||c.cliente==='zeiss'&&EMPRESAS.includes(empresa))&&(!empresa||MATERIAL.includes(tipo))&&h.chaves.every(k=>k===key||k===tipo)&&(!r.chaveMaterial||r.chaveMaterial===key),'O documento não corresponde à confirmação, empresa, cliente e mês esperados.');
 require(Number.isInteger(r.versao)&&r.versao>=1&&typeof r.texto==='string'&&r.texto.trim()&&r.texto.length<=60000&&txt(r.autorNome)&&txt(r.autorUid)&&['Chris','Amanda','Gabrielle','Fernanda','Júlia','Julia'].includes(r.perfil)&&txt(r.criadoEm),'Texto, versão e autoria deste documento não foram confirmados.');
 const cf=d.confirmacoes?.[key]||d.confirmacoes?.[tipo];
 require(h.base||cf?.id===r.id&&txt(cf.por)&&txt(cf.perfil)&&txt(cf.em),'A confirmação desta mesma versão não foi encontrada.');
 let arquivo=null;if(r.arquivoId){const a=r.arquivo;require(/^arq_[a-f0-9]{64}$/.test(r.arquivoId)&&plain(a)&&a.id===r.arquivoId&&a.sha256===r.arquivoId.slice(4)&&txt(a.nome)&&txt(a.tipo)&&Number.isInteger(a.bytes)&&a.bytes>0&&a.bytes<=4194304,'O vínculo do arquivo original precisa de conferência.');arquivo={...clone(a),ciclo:c.id,caminho:'planejamento_social_i155/'+c.id+'/arquivos/'+a.id,integridade:'metadados_vinculados; bytes não relidos nesta consulta'};}
 require(!r.link||/^https:\/\//.test(r.link),'O link de origem deste documento precisa de conferência.');
 return {id:r.id,ciclo:c.id,cliente:c.cliente,clienteNome:nome,competencia:c.competencia,empresa,finalidade:tipo,titulo:labels[tipo],estado:h.base?'base_enviada':'confirmado',chaves:h.chaves,versao:r.versao,autoria:{nome:r.autorNome,perfil:r.perfil,uid:r.autorUid,criadoEm:r.criadoEm},confirmacao:cf?.id===r.id?clone(cf):null,corpoDisponivel:true,corpo:{texto:r.texto,fonte:txt(r.fonte),link:txt(r.link),arquivoId:txt(r.arquivoId),arquivo,pendencias:txt(r.pendencias),datasCampanha:Array.isArray(r.datasCampanha)?clone(r.datasCampanha):[],referencias:Array.isArray(r.referencias)?clone(r.referencias):[],decisoes:Array.isArray(r.decisoes)?clone(r.decisoes):[]}};
}
export async function coletarRecepcaoMateriaisCp163({mes,lerCatalogo,lerPasta,vigente=()=>true,progresso=()=>{},agora=()=>new Date().toISOString(),concorrencia=3}={}){
 require(month(mes)&&typeof lerCatalogo==='function'&&typeof lerPasta==='function'&&Number.isInteger(concorrencia)&&concorrencia>=1&&concorrencia<=4,'Confira o mês e os leitores autorizados dos materiais.');
 const exigirVigente=()=>require(vigente(),'A tela, o mês ou o perfil mudou. A consulta anterior foi descartada.');
 const result={schema:1,tipo:'materiais_confirmados_cp163',somenteLeitura:true,mesSelecionado:mes,iniciadaEm:agora(),lidoEm:'',estado:'carregando',documentosI155:[],clientes:[],falhas:[],cobertura:{carteira:0,pastasElegiveis:0,pastasLidas:0,pastasFalharam:0,semCiclo:0,foraDoCiclo:0,semMaterial:0,rascunhosNaoEnviados:0,desconsiderados:0,ciclosForaDaCarteira:0,confirmados:0,completa:false},limites:['Insumos privados confirmados; esta consulta não cria, confirma, conclui, aprova, consolida ou publica.','Os originais são identificados por vínculo e metadados; seus bytes não foram relidos neste pacote. Links remotos não foram lidos ou congelados.','Base enviada é um estado anterior preservado, não autorização nova: a validade para criação continua no fluxo oficial.','Leituras finitas, não atômicas; catálogo e revisões dos ciclos são comparados ao final.','Rascunhos, versões históricas e confirmações desconsideradas não são materiais atuais. A carteira e o mês selecionados delimitam esta consulta.']};
 let initial;try{exigirVigente();initial=catalogoConfirmado(await lerCatalogo(mes),mes);exigirVigente();}catch(e){exigirVigente();result.estado='falha';result.falhas.push({etapa:'catalogo',erro:e?.message||'A leitura do catálogo falhou.'});result.lidoEm=agora();return result;}
 result.cobertura.carteira=initial.clientes.size;result.cobertura.ciclosForaDaCarteira=[...initial.ciclos.values()].filter(c=>!initial.clientes.has(c.cliente)).length;
 const jobs=[];
 for(const cl of initial.clientes.values()){
  const c=initial.ciclos.get(mes+'__'+cl.cliente),row={...cl,ciclo:c?.id||'',estado:'sem_ciclo',documentos:0};result.clientes.push(row);
  if(!c){result.cobertura.semCiclo++;continue;}if(c.incluido!==true){row.estado='fora_do_ciclo';result.cobertura.foraDoCiclo++;continue;}
  try{const alvos=alvosConfirmados(c);result.cobertura.rascunhosNaoEnviados+=alvos.rascunhos;result.cobertura.desconsiderados+=alvos.desconsiderados;if(!alvos.headers.length){row.estado='sem_material_confirmado';result.cobertura.semMaterial++;continue;}jobs.push({c,row,alvos});}catch(e){row.estado='falha';result.falhas.push({cliente:cl.cliente,ciclo:c.id,etapa:'ponteiros',erro:e.message});}
 }
 result.cobertura.pastasElegiveis=jobs.length;let cursor=0;
 await Promise.all(Array.from({length:Math.min(concorrencia,jobs.length)},async()=>{
  while(cursor<jobs.length){exigirVigente();const {c,row,alvos}=jobs[cursor++];try{
   const r=await lerPasta(c.id);exigirVigente();require(r?.ciclo?.id===c.id&&r.ciclo.cliente===c.cliente&&r.ciclo.competencia===mes&&r.ciclo.revisao===c.revisao&&r.ciclo.incluido===true&&canonical(r.ciclo.documentos||{})===canonical(c.documentos||{})&&Array.isArray(r.registros),'A pasta mudou ou não confirmou esta mesma revisão. Confira novamente.');
   const registros=new Map();for(const item of r.registros){require(rid(item?.id)&&!registros.has(item.id),'Os registros da pasta repetiram uma identificação ou vieram incompletos.');registros.set(item.id,item);}
   const docs=alvos.headers.map(h=>documentoConfirmado(r.ciclo,registros.get(h.id),h,row.nome));result.documentosI155.push(...docs);row.estado='confirmada';row.revisao=c.revisao;row.documentos=docs.length;result.cobertura.pastasLidas++;
  }catch(e){exigirVigente();row.estado='falha';result.cobertura.pastasFalharam++;result.falhas.push({cliente:c.cliente,ciclo:c.id,etapa:'pasta',erro:e?.message||'A pasta não foi confirmada.'});}progresso(clone(result.cobertura));}
 }));
 exigirVigente();try{const final=catalogoConfirmado(await lerCatalogo(mes),mes);exigirVigente();require(final.assinatura===initial.assinatura,'A carteira ou as versões dos materiais mudaram durante a consulta. Confira novamente; este pacote não é completo.');}catch(e){exigirVigente();result.falhas.push({etapa:'releitura_final',erro:e?.message||'A releitura final falhou.'});}
 result.documentosI155.sort((a,b)=>a.cliente.localeCompare(b.cliente)||a.finalidade.localeCompare(b.finalidade)||a.id.localeCompare(b.id));result.clientes.sort((a,b)=>a.cliente.localeCompare(b.cliente));result.cobertura.pastasFalharam=result.clientes.filter(c=>c.estado==='falha').length;result.cobertura.confirmados=result.documentosI155.length;result.cobertura.completa=!result.falhas.length;result.estado=result.cobertura.completa?'confirmada':'parcial';result.lidoEm=agora();return result;
}
