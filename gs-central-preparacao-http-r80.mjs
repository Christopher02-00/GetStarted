/* Fachada de preparação: usa o mesmo repositório no servidor, sem Firestore no navegador. */
import {abrirEnvelopeCentralR80} from './codec-central-r80.mjs?v=000e1d41f7937787cf50c53904f5e8392d2873f152fc10d3a4837697d5e67925';
const MAX_RAW=4*1024*1024,PART=700*1024,MAX_WIRE=6*1024*1024,MAX_NORMAL=1024*1024;
const MES=/^20\d{2}-(0[1-9]|1[0-2])$/,CLIENTE=/^[a-z0-9][a-z0-9._-]{0,119}$/,CICLO=/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/;
const PREPARACAO=new Set(['incluir','agenda','contexto','referencia','entregar_lote','excluir_referencia','restaurar_referencia','excluir_lote','documento','confirmar_documento','enviar_consolidado','retirar','desconsiderar_confirmacao','registrar_insumos_transicao']);
const TIPOS=new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown']);
const exigir=(ok,m)=>{if(!ok)throw Error(m);};
/* Proveniência local: depois de chamar o transporte, uma falha nunca prova ausência de commit. */
function falhaEnvioCp144(original,iniciado){
 const erro=Error(original?.message||'Não consegui confirmar o envio.');erro.envioCentralCp144=iniciado?'resultado_incerto':'nao_iniciado';
 if(typeof original?.code==='string')erro.code=original.code;return erro;
}
const selecionar=(v,keys)=>Object.fromEntries(keys.filter(k=>v?.[k]!==undefined).map(k=>[k,v[k]]));
const mesmo=(a,b)=>!!a?.uid&&['uid','nome','atorReal','sessao','geracao'].every(k=>a[k]===b?.[k]);
const utf8=v=>new TextEncoder().encode(JSON.stringify(v)).length;
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
const bytes64=s=>{exigir(typeof s==='string'&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s),'Uma parte do arquivo não foi confirmada.');const b=Uint8Array.from(atob(s),c=>c.charCodeAt(0));exigir(b64(b)===s,'Uma parte do arquivo mudou durante o transporte.');return b;};
const digest=async(b,crypto)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
export function criarRepositorioCentralHttpR80({chamar,contexto,timestamp,ambiente=globalThis}={}){
 exigir(typeof chamar==='function'&&typeof contexto==='function','Entre novamente no seu perfil.');
 const c=Object.freeze({...contexto()});let vivo=true;const jobs=new Map();
 const conferir=()=>exigir(vivo&&mesmo(c,contexto()),'O perfil mudou. Reabra o planejamento; seus campos continuam guardados.');
 const mes=m=>exigir(MES.test(m||''),'Escolha o mês dos conteúdos.');
 const cliente=x=>exigir(CLIENTE.test(x||''),'Escolha um cliente existente.');
 const ciclo=id=>exigir(CICLO.test(id||''),'Abra o cliente e o mês corretos.');
 async function pedir(acao,dados={}){
  let iniciado=false;
  try{
   conferir();exigir(utf8({acao,...dados})<=(acao==='central_arquivo_enviar'?MAX_WIRE:MAX_NORMAL),'Este envio é grande demais. Divida o documento; nenhum texto foi cortado.');
   iniciado=true;const r=await chamar(acao,dados);conferir();exigir(utf8(r)<=MAX_WIRE,'Não consegui conferir a resposta inteira. Os dados anteriores foram preservados.');
   return abrirEnvelopeCentralR80(r,{timestamp});
  }catch(erro){throw falhaEnvioCp144(erro,iniciado);}
 }
 async function ler(id){ciclo(id);const r=await pedir('central_ler',{ciclo:id});exigir(r?.ciclo?.id===id&&Array.isArray(r.registros),'O ciclo lido precisa ser conferido.');return r;}
 async function listar(m){mes(m);const r=await pedir('central_listar',{competencia:m});exigir(Array.isArray(r)&&r.every(x=>x.competencia===m),'Não consegui conferir todos os ciclos deste mês.');return r;}
 async function config(m){mes(m);return pedir('central_config_ler',{competencia:m});}
 async function salvarConfig(d,rev,m){mes(m);exigir(Number.isInteger(rev)&&rev>=0,'Confira a versão da organização.');return pedir('central_config_salvar',{competencia:m,config:selecionar(d,['dias','capacidades','modelos','indisponibilidades','feriados','recorrencia']),esperadaRevisao:rev});}
 const EDITORIAL=new Set(['central_editor_ler','central_editor_interno_conferir_cp142','central_editor_iniciar','central_editor_preparacao_cp140','central_editor_salvar','central_editor_enviar_revisao','central_editor_decidir','central_editor_interno_iniciar_cp123','central_editor_interno_salvar_cp123','central_editor_interno_enviar_cp123','central_editor_interno_decidir_cp123','central_editor_adocao_ler_cp129','central_editor_adotar_preparacao_cp129']);
 async function editorial(acao,dados){
  const ajusteCp112=['ajuste_calendario_cancelar_cp143','ajuste_calendario_ler_cp112','ajuste_calendario_salvar_cp112','ajuste_calendario_enviar_cp112','ajuste_calendario_adotar_cp112','ajuste_calendario_decidir_cp112','ajuste_calendario_iniciar_correcao_cp115','ajuste_calendario_salvar_conteudo_cp115'].includes(acao);
  let origem;
  try{
   conferir();exigir(['Chris','Amanda'].includes(c.nome)&&(EDITORIAL.has(acao)||ajusteCp112),'Esta etapa pertence à criação do Chris e à revisão da Amanda.');
   ciclo(dados?.ciclo);origem=dados?.origemEditorial||'';exigir(origem===''||origem==='continuar_legado'||origem==='estrategico_cp109','Origem editorial inválida.');
   if(acao==='central_editor_preparacao_cp140')exigir(c.nome==='Chris'&&c.atorReal==='Chris'&&origem!=='estrategico_cp109','Somente Chris pode complementar a preparação desta primeira revisão. A revisão e a liberação continuam com a Amanda.');
  }catch(erro){throw falhaEnvioCp144(erro,false);}
  if(ajusteCp112){const r=await pedir(acao,dados);exigir(r?.schema===1&&r.ciclo===dados.ciclo&&Array.isArray(r.ajustes)&&r.liberacaoMensal&&r.ajustes.every(x=>typeof x.demandaId==='string'&&typeof x.assinatura==='string'),'Não consegui confirmar a revisão dos pedidos. Preserve a mesma tentativa.');return r;}
  if(['central_editor_adocao_ler_cp129','central_editor_adotar_preparacao_cp129'].includes(acao)){const r=await pedir(acao,dados);exigir(r?.schema===1&&r.ciclo===dados.ciclo&&typeof r.necessaria==='boolean'&&typeof r.elegivel==='boolean'&&Array.isArray(r.motivos)&&/^[a-f0-9]{64}$/.test(r.assinatura||'')&&(acao==='central_editor_adocao_ler_cp129'||r.operacao?.id===dados.operacao&&r.operacao.confirmada===true&&r.operacao.calendarioAlterado===false),'Não consegui confirmar a adoção desta versão. Preserve a mesma tentativa.');return r;}
  if(acao==='central_editor_interno_conferir_cp142'){
   const r=await pedir(acao,dados),op=r?.operacao;
   exigir(r?.schema===1&&r.ciclo?.id===dados.ciclo&&typeof r.assinatura==='string'&&(origem==='continuar_legado'?r.ciclo.modo==='continuar_legado':!['continuar_legado','estrategico_cp109'].includes(r.ciclo.modo))&&op?.id===dados.operacao&&op.leituraSomenteCp142===true&&op.calendarioAlterado===false&&((op.estado==='recuperado'&&op.confirmada===true&&Number.isInteger(op.versaoConfirmada)&&/^[a-f0-9]{64}$/.test(op.assinaturaConfirmada||''))||(op.estado==='nao_localizada'&&op.confirmada===false)),'Não consegui conferir o recibo desta mesma tentativa. Preserve os textos.');return r;
  }
  const r=await pedir(acao,dados),recusa=r?.operacao?.estado==='recusada_por_versao',internoCp123=acao.startsWith('central_editor_interno_')&&acao.endsWith('_cp123'),d=recusa&&!internoCp123?r.estadoAtual:r;
  exigir(r?.schema===1&&d?.ciclo?.id===dados.ciclo&&typeof d.assinatura==='string'&&
    (origem==='continuar_legado'?d.ciclo.modo==='continuar_legado':origem==='estrategico_cp109'?d.ciclo.modo==='estrategico_cp109':!['continuar_legado','estrategico_cp109'].includes(d.ciclo.modo))&&
    (!recusa||r.operacao.id===dados.operacao&&r.operacao.confirmada===true&&r.operacao.calendarioAlterado===false&&r.requerComparacao===true),
    'Não consegui confirmar a versão editorial. Preserve a mesma tentativa.');return r;
 }
 async function mutar(id,acao,dados,esperada,operacao){
  ciclo(id);
  if(acao==='iniciar_criacao'){
   await editorial('central_editor_iniciar',{ciclo:id,esperadaRevisao:esperada,operacao,pecas:dados.pecas||[],confirmarDelta:dados.confirmarDelta===true});return ler(id);
  }
  if(['enviado_revisao','devolvido_revisao','entrega'].includes(acao)){
   const r=await editorial('central_editor_ler',{ciclo:id});
   exigir(acao==='entrega'?r.estado==='liberado'&&!!r.ciclo.entrega:acao==='devolvido_revisao'?r.estado==='ajuste_interno':['aguardando_interna','aprovado_interno','liberado'].includes(r.estado),'Abra o editor desta competência para concluir a etapa. Esta conferência não altera o calendário.');return ler(id);
  }
  exigir(PREPARACAO.has(acao),'Esta etapa será liberada depois da preparação. Mantenham os envios atuais.');
  exigir(Number.isInteger(esperada)&&esperada>=0&&/^[A-Za-z0-9_-]{8,100}$/.test(operacao||''),'Confira a mesma tentativa antes de continuar.');
  if(acao==='referencia')dados={referencia:selecionar(dados?.referencia,['id','empresaOtavio','link','autorPerfil','postadoEm','consultadoEm','ideia','motivo','adaptacao','metricas','comentarios','filtro','selecionada','parecerAmanda','origemColecao','origemId','estadoTriagemCp111'])};
  const r=await pedir('central_mutar',{ciclo:id,acaoPreparacao:acao,dados,esperadaRevisao:esperada,operacao});
  exigir(r?.ciclo?.id===id&&Array.isArray(r.registros),'Não consegui confirmar o ciclo desta gravação. Confira a mesma tentativa.');return r;
 }
 async function fontesAgendaI167(cl,m){cliente(cl);mes(m);return pedir('central_fontes_organizacao',{cliente:cl,competencia:m});}
 async function clientes(m,forcar=true){mes(m);exigir(forcar===true,'Confira a carteira atual antes de continuar.');return pedir('central_clientes',{competencia:m,forcar:true});}
 async function origens(cl){cliente(cl);return pedir('central_referencias_origem',{cliente:cl});}
 async function analise(cl,m){cliente(cl);mes(m);return pedir('central_analise',{cliente:cl,competenciaResultados:m});}
 async function historico(id){ciclo(id);return pedir('central_historico',{ciclo:id});}
 async function capacidades(){const r=await pedir('central_capacidades');exigir(r?.papelConfirmado===c.nome&&r?.atorReal===c.atorReal,'Não consegui confirmar o seu perfil nesta área.');return r;}
 async function enviarArquivo(id,p){
  ciclo(id);exigir(p?.buffer instanceof Uint8Array&&Number.isInteger(p.bytes)&&p.bytes>=1&&p.bytes<=MAX_RAW&&p.buffer.length===p.bytes,'Escolha um arquivo de até 4 MB.');
  exigir(typeof p.nome==='string'&&p.nome.length>=1&&p.nome.length<=180&&TIPOS.has(p.tipo)&&typeof p.texto==='string'&&p.texto.trim()&&p.texto.length<=60000&&Number.isInteger(p.paginas)&&p.paginas>=0&&p.paginas<=100,'Confira o arquivo e o texto antes de enviar.');
  if(p.tipo==='application/pdf')exigir(new TextDecoder().decode(p.buffer.subarray(0,5))==='%PDF-','O conteúdo deste arquivo não é um PDF.');
  if(p.tipo==='application/vnd.openxmlformats-officedocument.wordprocessingml.document')exigir(p.buffer[0]===0x50&&p.buffer[1]===0x4b,'O conteúdo deste arquivo não é um DOCX.');
  if(p.tipo==='text/plain'||p.tipo==='text/markdown')new TextDecoder('utf-8',{fatal:true}).decode(p.buffer);
  exigir(/^[a-f0-9]{64}$/.test(p.sha256||'')&&await digest(p.buffer,ambiente.crypto)===p.sha256,'O arquivo mudou. Selecione novamente; os campos foram preservados.');conferir();
  const partesBase64=[];for(let n=0;n<Math.ceil(p.bytes/PART);n++)partesBase64.push({indice:n,dados:b64(p.buffer.subarray(n*PART,(n+1)*PART))});
  const r=await pedir('central_arquivo_enviar',{ciclo:id,arquivo:{nome:p.nome,tipo:p.tipo,bytes:p.bytes,sha256:p.sha256,texto:p.texto,paginas:p.paginas,partesBase64}});
  exigir(r?.id==='arq_'+p.sha256&&r.sha256===p.sha256&&r.bytes===p.bytes&&r.texto===p.texto,'O recibo do arquivo precisa ser conferido. Mantenha-o selecionado.');return r;
 }
 async function lerArquivo(id,arquivoId){
  ciclo(id);exigir(/^arq_[a-f0-9]{64}$/.test(arquivoId||''),'Escolha um arquivo confirmado.');
  const r=await pedir('central_arquivo_ler',{ciclo:id,arquivoId}),m=r?.arquivo,parts=r?.partesBase64;
  exigir(m?.id===arquivoId&&m.ciclo===id&&m.estado==='completo'&&TIPOS.has(m.tipo)&&Number.isInteger(m.bytes)&&m.bytes>=1&&m.bytes<=MAX_RAW&&Array.isArray(parts)&&parts.length===Math.ceil(m.bytes/PART)&&parts.length<=6,'O arquivo ainda não foi confirmado por inteiro.');
  const buffer=new Uint8Array(m.bytes);let offset=0;
  for(let i=0;i<parts.length;i++){exigir(parts[i].indice===i,'As partes do arquivo mudaram de ordem.');const b=bytes64(parts[i].dados);exigir(b.length===Math.min(PART,m.bytes-offset),'O tamanho de uma parte do arquivo mudou.');buffer.set(b,offset);offset+=b.length;}
  exigir(offset===m.bytes&&await digest(buffer,ambiente.crypto)===m.sha256&&arquivoId==='arq_'+m.sha256,'A conferência do arquivo falhou. O original foi preservado.');conferir();return {...m,buffer};
 }
 function assinar(id,cl,m,tipo,proximo,erro){
  ciclo(id);cliente(cl);mes(m);exigir(id===m+'__'+cl,'Escolha o cliente e o mês desta etapa.');conferir();
  let job=jobs.get(id);if(!job){job={id,cl,m,assinantes:new Set(),timer:null,pendente:null,geracao:0};jobs.set(id,job);job.timer=ambiente.setInterval(()=>consultar(job),60000);}
  const s={tipo,proximo,erro,vivo:true};job.assinantes.add(s);consultar(job);
  return ()=>{s.vivo=false;job.assinantes.delete(s);if(!job.assinantes.size){job.geracao++;ambiente.clearInterval(job.timer);jobs.delete(id);}};
 }
 async function consultar(job){
  if(!vivo||!mesmo(c,contexto())||jobs.get(job.id)!==job||job.pendente)return;
  const g=job.geracao;job.pendente=(async()=>{try{const r=await pedir('central_versao_ciclo',{ciclo:job.id,cliente:job.cl,competencia:job.m});
   if(!vivo||g!==job.geracao||jobs.get(job.id)!==job)return;
   exigir(r?.ciclo?.id===job.id&&Number.isInteger(r.ciclo.revisao),'Não consegui acompanhar a versão atual deste ciclo.');
   for(const s of job.assinantes)if(s.vivo){try{s.proximo(s.tipo==='ciclo'?r.ciclo:r.calendario??null);}catch{}}
  }catch(e){if(vivo&&g===job.geracao&&jobs.get(job.id)===job&&mesmo(c,contexto()))for(const s of job.assinantes)if(s.vivo)try{s.erro?.(e);}catch{}
  }finally{job.pendente=null;}})();return job.pendente;
 }
 const ouvir=(id,proximo,erro)=>{ciclo(id);const m=id.slice(0,7),cl=id.slice(9);return assinar(id,cl,m,'ciclo',proximo,erro);};
 const ouvirCalendario=(cl,proximo,erro,{ciclo:id,competencia:m}={})=>assinar(id,cl,m,'calendario',proximo,erro);
 function destroy(){if(!vivo)return;vivo=false;for(const job of jobs.values()){job.geracao++;ambiente.clearInterval(job.timer);job.assinantes.clear();}jobs.clear();}
 return {ler,listar,config,salvarConfig,mutar,editorial,fontesAgendaI167,clientes,origens,analise,ausencias:()=>pedir('central_ausencias'),historico,arquivos:{enviar:enviarArquivo,ler:lerArquivo},ouvir,ouvirCalendario,capacidades,destroy};
}
