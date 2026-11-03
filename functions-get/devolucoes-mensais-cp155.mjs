/* OFF core: an internal, read-only projection. Not a public path/CRUD API.
 * The integrating reader MUST obtain its bundles through gate/fontesTx I172;
 * no user-supplied calendar, preparation, continuation or authority is accepted. */
import {createHash} from 'node:crypto';
export const TIPO_DEVOLUCAO_MENSAL_CP155='calendario_devolucao_cp155';
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const json=v=>JSON.stringify(canon(v)),hash=v=>createHash('sha256').update(json(v)).digest('hex');
const e=(ok,msg)=>{if(!ok)throw Object.assign(Error(msg),{code:'cp155/fonte-nao-conferida'});};
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const vinculoRecebido=(p,c)=>{
 const link=p.demandaVinculada;if(!link)return null;const d=link.data;
 e(link.conferida===true&&typeof link.id==='string'&&d&&d.destinatario==='Chris'&&d.cliente===c.cliente,'O vínculo operacional precisa confirmar a mesma demanda e cliente.');
 if(link.tipo==='origem_i167'){const v=c.agenda?.criacao?.origemI167;e(v&&v.demandaId===link.id&&v.cliente===c.cliente&&v.competencia===c.competencia&&v.etapa==='criacao'&&d.tipoEspecial==='organizacao_social_i167'&&d.agendaOrganizacaoI167?.etapa===v.etapaOrganizacao,'O vínculo I167 não confirma esta criação.');}
 else{e(link.tipo==='etapa_i155'&&d.tipoEspecial==='planejamento_social_i155'&&d.planejamentoI155?.ciclo===c.id&&d.planejamentoI155.etapa==='criacao'&&d.planejamentoI155.base===c.criacao?.base&&d.planejamentoI155.competencia===c.competencia,'A etapa I155 não corresponde à origem deste retorno.');}
 return {id:link.id,colecao:'demandas',tipo:link.tipo,cancelada:['cancelada','cancelado'].includes(d.status)||d.excluido===true||d.arquivado===true,status:d.status||'',prazoData:d.prazoData||null,prazoHora:d.prazoHora||null};
};
export function projetarDevolucaoMensalCp155(p){
 e(p?.schema===1&&p.validadaPeloLeitorI172===true,'A fonte depende do leitor autorizado I172.');
 const c=p.contexto,cal=p.calendario?.data;e(c&&/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(c.id||'')&&c.id===c.competencia+'__'+c.cliente&&p.calendario.path==='calendarios/'+c.cliente&&Number.isInteger(c.revisao)&&c.revisao>=1,'A origem precisa confirmar cliente, mês e revisão.');
 if(c.modo==='estrategico_cp109')return null;
 e(!c.modo||c.modo==='continuar_legado','Modo editorial desconhecido.');
 const legado=c.modo==='continuar_legado',mes=c.competencia,m=cal.aprovacaoMeses?.[mes],st=c._estadoLegado;
 if(cal.excluido||cal.arquivado||cal.archived||cal.deletedAt||(!legado&&c.incluido!==true)||(legado&&c._continuidade?.ativo!==true))return null;
 if(m?.status!=='ajuste_interno')return null; // avanço real da origem, não leitura do aviso
 if(m.correcaoIndividualCp115?.schema===1||st?.correcaoIndividualCp115?.schema===1)return null; // CP112 tem sua própria demanda
 e(m.por==='Amanda'&&iso(m.em)&&typeof m.motivoAjuste==='string'&&!!m.motivoAjuste.trim(),'O retorno mensal ainda não confirma a decisão da Amanda.');
 if(legado)e(st?.fase==='devolvida'&&st.retornoEm===m.em&&st.retornoMotivo===m.motivoAjuste&&Number.isInteger(st.rodada)&&st.rodada>=1,'A continuidade e o retorno mensal não correspondem.');
 else e(c.criacao?.base&&c.criacao.base===c.documentos?.consolidadoEnviado&&cal.planejamentoBasesI155?.[mes]===c.criacao.base,'A base deste retorno já mudou. Preserve as fontes e confira o editor.');
 const ar=p.autoridade,r=ar?.data;
 if(r?.origemEditorial==='estrategico_cp109'||r?.acao?.includes('_interno_'))return null; // não duplica CP109 ou CP123
 e(r?.schema===1&&r.acao==='central_editor_decidir'&&r.ciclo===c.id&&r.papel==='Amanda'&&typeof r.uid==='string'&&!!r.uid&&typeof r.atorReal==='string'&&!!r.atorReal&&r.em===m.em&&r.estado!=='recusada_por_versao'&&/^[A-Za-z0-9_-]{8,80}$/.test(r.operacao||'')&&/^[a-f0-9]{64}$/.test(r.hashPedido||'')&&Number.isInteger(r.revisaoCiclo)&&r.revisaoCiclo>=1,'O recibo da devolução mensal precisa ser conferido.');
 const backup='calendarios_versoes/'+c.cliente+'__i172_'+r.operacao;
 e(ar.path===backup+'/editorial_i172/recibo'&&p.backup?.path===backup&&p.backup.data?.__cliente===c.cliente&&json(p.backup.data.__reciboEditorialI172)===json(r),'O recibo e o backup pertencem a outra operação.');
 let sincronizada=true,rodada;
 if(legado){e(r.origemEditorial==='continuar_legado'&&r.acaoCiclo===null&&st.revisao>=r.revisaoCiclo+1,'O recibo não confirma a continuidade desta devolução.');const hs=(st.historico||[]).filter(h=>h.acao==='central_editor_decidir'&&h.decisao==='devolver'&&h.em===m.em);e(hs.length===1&&hs[0].operacao===r.operacao&&hs[0].uid===r.uid&&hs[0].por===r.atorReal,'O histórico não confirma a mesma rodada devolvida.');rodada=st.rodada;}
 else{
  e((r.origemEditorial===null||r.origemEditorial===undefined)&&r.acaoCiclo==='devolvido_revisao','Este recibo não é uma devolução mensal nativa.');
  sincronizada=c.criacao.retornoEm===m.em&&c.criacao.retornoMotivo===m.motivoAjuste&&c.criacao.enviadoRevisao===false;
  if(sincronizada){const ev=p.eventoCiclo;e(ev?.id===r.operacao+'_ciclo'&&ev.data?.acao==='devolvido_revisao'&&ev.data.operacao===ev.id&&ev.data.perfil==='Amanda'&&ev.data.autorUid===r.uid&&ev.data.autorNome===r.atorReal&&ev.data.pedidoHashEditorialI172===r.hashPedido&&ev.data.revisao===r.revisaoCiclo+1&&c.revisao>=ev.data.revisao,'A etapa do ciclo não confirma a operação devolvida.');e(Number.isInteger(c.criacao.rodada)&&c.criacao.rodada>=2,'A rodada da criação precisa ser conferida.');rodada=c.criacao.rodada;}
  else{e(c.revisao>=r.revisaoCiclo&&Number.isInteger(c.criacao.rodada)&&c.criacao.rodada>=1,'A sincronização pendente não confirma a versão anterior.');rodada=c.criacao.rodada+1;}
 }
 const demanda=vinculoRecebido(p,c);if(demanda?.cancelada)return null;
 const origem={tipo:TIPO_DEVOLUCAO_MENSAL_CP155,id:c.id,cliente:c.cliente,competencia:mes,...(legado?{origemEditorial:'continuar_legado'}:{})},id='retorno_mensal_cp155_'+hash([origem.tipo,c.id,legado?'continuar_legado':'nativo']);
 const versao=hash([origem,legado?c._continuidade.revisao:c.criacao.base,rodada,r.operacao,r.hashPedido,m.em,m.motivoAjuste]);
 return {schema:1,id,tipo:TIPO_DEVOLUCAO_MENSAL_CP155,destinatario:'Chris',origem,fonte:{colecao:legado?'continuidade_calendarios_i164':'planejamento_social_i155',id:c.id},versao,rodada,estado:'pendente',sincronizacao:sincronizada?'confirmada':'pendente',executavel:sincronizada,retorno:{operacao:r.operacao,em:m.em,por:'Amanda',atorReal:r.atorReal,motivo:m.motivoAjuste},titulo:'Ajustes do calendário · '+String(c.clienteNome||cal.client||c.cliente),clienteNome:String(c.clienteNome||cal.client||c.cliente),prazo:null,demandaVinculada:demanda,link:{area:'editor',ciclo:c.id,cliente:c.cliente,competencia:mes,...(legado?{origemEditorial:'continuar_legado'}:{})},leituraNaoResolve:true,autoridade:{operacao:r.operacao,hashPedido:r.hashPedido,revisaoCiclo:r.revisaoCiclo}};
}
export function loteDevolucoesCp155(pacotes,{destinatario='Chris',completa=false}={}){
 e(destinatario==='Chris'&&completa===true&&Array.isArray(pacotes)&&pacotes.length<=1000,'A lista precisa estar completa e no destinatário correto.');
 const mapa=new Map();for(const p of pacotes){const d=projetarDevolucaoMensalCp155(p);if(!d)continue;const old=mapa.get(d.id);e(!old||old.versao===d.versao,'Duas versões ativas disputam a mesma origem.');mapa.set(d.id,d);}return {schema:1,destinatario,completa:true,linhas:[...mapa.values()].sort((a,b)=>a.id.localeCompare(b.id)),somenteLeitura:true};
}
export function conferirAberturaDevolucaoCp155(esperada,atual){
 e(esperada?.tipo===TIPO_DEVOLUCAO_MENSAL_CP155&&typeof esperada.id==='string'&&/^[a-f0-9]{64}$/.test(esperada.versao||''),'Reabra o retorno pela fila atual.');
 if(!atual)return {vigente:false,fonteAvancou:true,link:null};e(atual.id===esperada.id&&json(atual.origem)===json(esperada.origem),'O retorno pertence a outro cliente, mês ou origem.');return atual.versao===esperada.versao?{vigente:true,fonteAvancou:false,link:atual.executavel?structuredClone(atual.link):null,executavel:atual.executavel}:{vigente:false,fonteAvancou:true,link:null};
}
export function ocorrenciaDevolucaoCp155(d){
 e(d?.tipo===TIPO_DEVOLUCAO_MENSAL_CP155&&d.destinatario==='Chris','Origem de aviso inválida.');
 return {origem:structuredClone(d.origem),versao:d.versao,destinatario:'Chris',nivel:'ajustar',titulo:d.titulo,texto:d.sincronizacao==='confirmada'?'A Amanda deixou um retorno neste calendário. Abra o recado e continue pelo mesmo editor.':'O retorno da Amanda foi confirmado, mas a etapa do ciclo ainda precisa de sincronização. Confira a mesma origem; não reenvie o conteúdo por outro caminho.',link:structuredClone(d.link)};
}
/* Restricted Admin read hook for the future typed endpoint. `fontes` is an
 * internal server closure calling fontesTx/gate I172, never a request field. */
export async function lerDevolucaoMensalTxCp155(db,tx,ator,{fontes,esperada=null,lerVinculo}={}){
 e((ator?.papel==='Chris'||ator?.sistemaSomenteLeituraCp155===true)&&typeof fontes==='function','A fila de retornos pertence ao Chris e ao leitor I172.');
 const {c,cal}=await fontes(tx);e(c&&cal&&c.id===c.competencia+'__'+c.cliente,'O leitor não confirmou a fonte mensal.');
 const m=cal.aprovacaoMeses?.[c.competencia];let devolucao=null;
 const ativa=!cal.excluido&&!cal.arquivado&&!cal.archived&&!cal.deletedAt&&(c.modo==='continuar_legado'?c._continuidade?.ativo===true:c.incluido===true);
 if(ativa&&m?.status==='ajuste_interno'&&c.modo!=='estrategico_cp109'&&!m.correcaoIndividualCp115?.schema&&!c._estadoLegado?.correcaoIndividualCp115?.schema){
  e(iso(m.em),'O marco mensal precisa de uma data de autoridade confirmada.');
  // One equality filter plus a field mask: do not scan historical editorial text.
  const q=db.collection('calendarios_versoes').where('__reciboEditorialI172.em','==',m.em).select('__cliente','__reciboEditorialI172').limit(101),s=await tx.get(q);
  e(s.size<=100,'Mais de100autoridades compartilham este instante; refine a conferência sem truncar a lista.');
  const legado=c.modo==='continuar_legado',matches=s.docs.filter(x=>{const d=x.data(),r=d?.__reciboEditorialI172;return d?.__cliente===c.cliente&&r?.ciclo===c.id&&r.acao==='central_editor_decidir'&&r.papel==='Amanda'&&(r.origemEditorial||null)===(legado?'continuar_legado':null)&&r.acaoCiclo===(legado?null:'devolvido_revisao')&&r.estado!=='recusada_por_versao';});
  e(matches.length===1,'O retorno está no calendário, mas seu recibo único ainda precisa de conferência. A lista anterior não foi substituída por vazio.');
  const b=matches[0],r=b.data().__reciboEditorialI172,expected='calendarios_versoes/'+c.cliente+'__i172_'+r.operacao;e(b.ref.path===expected,'O backup não corresponde ao cliente e à operação do retorno.');
  const [rs,ev,link]=await Promise.all([tx.get(db.doc(expected+'/editorial_i172/recibo')),legado?null:tx.get(db.doc('planejamento_social_i155/'+c.id+'/eventos/'+r.operacao+'_ciclo')),typeof lerVinculo==='function'?lerVinculo(tx,c):null]);
  e(rs.exists,'O recibo privado da devolução precisa ser conferido.');
  devolucao=projetarDevolucaoMensalCp155({schema:1,validadaPeloLeitorI172:true,contexto:c,calendario:{path:'calendarios/'+c.cliente,data:cal},autoridade:{path:expected+'/editorial_i172/recibo',data:rs.data()},backup:{path:expected,data:b.data()},...(ev?.exists?{eventoCiclo:{id:ev.id,data:ev.data()}}:{}),...(link?{demandaVinculada:link}:{})});
 }
 return {schema:1,ciclo:c.id,somenteLeitura:true,fonteConferida:true,devolucao,...(esperada?{comparacao:conferirAberturaDevolucaoCp155(esperada,devolucao)}:{})};
}

export const ACOES_LEITURA_DEVOLUCAO_CP155=Object.freeze(['central_editor_devolucoes_fila_cp155','central_editor_devolucao_ler_cp155']);
const CURSOR_PREFIX='cp155_';
export function cursorDevolucoesCp155(valor){
 if(valor===undefined||valor==='')return {schema:1,fase:'nativo',ultimo:''};
 e(typeof valor==='string'&&valor.length<=500&&valor.startsWith(CURSOR_PREFIX),'Cursor da fila inválido.');
 const encoded=valor.slice(CURSOR_PREFIX.length),bytes=Buffer.from(encoded,'base64url');e(bytes.toString('base64url')===encoded,'Cursor da fila inválido.');let c;try{c=JSON.parse(bytes.toString('utf8'));}catch{e(false,'Cursor da fila inválido.');}
 e(c&&Object.keys(c).length===3&&c.schema===1&&['nativo','legado'].includes(c.fase)&&typeof c.ultimo==='string'&&(!c.ultimo||/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(c.ultimo)),'Cursor da fila inválido.');return c;
}
const codificarCursorCp155=c=>CURSOR_PREFIX+Buffer.from(JSON.stringify(c)).toString('base64url');
export function identidadeDevolucaoCp155(ciclo,origemEditorial=''){
 e(/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(ciclo||'')&&['','continuar_legado'].includes(origemEditorial),'Origem da devolução inválida.');
 const origem={tipo:TIPO_DEVOLUCAO_MENSAL_CP155,id:ciclo,cliente:ciclo.slice(9),competencia:ciclo.slice(0,7),...(origemEditorial?{origemEditorial}:{})};return {id:'retorno_mensal_cp155_'+hash([origem.tipo,ciclo,origemEditorial||'nativo']),origem};
}
async function vinculoOperacionalTxCp155(db,tx,c){
 if(c.modo==='continuar_legado')return null;
 const a=c.agenda?.criacao,v=a?.origemI167;let id,tipo;
 if(v){id=v.demandaId;tipo='origem_i167';}
 else if(a&&a.fonteOrganizacaoI167!==true&&(a.responsavel||'Chris')==='Chris'&&c.criacao?.retornoEm&&!c.criacao.enviadoRevisao){const rodada=c.criacao.rodada>1?'__r'+c.criacao.rodada:'';id='sm155_'+c.id+'__criacao__Chris__'+c.criacao.base+rodada;tipo='etapa_i155';}
 if(!id)return null;e(typeof id==='string'&&/^[A-Za-z0-9_.-]{1,500}$/.test(id),'O vínculo da criação precisa de conferência.');
 const s=await tx.get(db.doc('demandas/'+id));e(!v||s.exists,'A demanda explicitamente vinculada à criação não foi encontrada.');return s.exists?{id,tipo,conferida:true,data:s.data()}:null;
}
export async function operarLeituraDevolucoesCp155(db,tx,ator,pedido,{fontes,gate}={}){
 e((ator?.papel==='Chris'||ator?.sistemaSomenteLeituraCp155===true)&&typeof fontes==='function'&&typeof gate==='function','A fila de retornos pertence ao Chris e ao serviço I172.');await gate(tx);
 const ler=(ciclo,modo,esperada=null)=>lerDevolucaoMensalTxCp155(db,tx,ator,{fontes:()=>fontes(tx,ciclo,modo),esperada,lerVinculo:(t,c)=>vinculoOperacionalTxCp155(db,t,c)});
 if(pedido.acao==='central_editor_devolucao_ler_cp155'){
  const i=identidadeDevolucaoCp155(pedido.ciclo,pedido.origemEditorial||''),origemRef=db.doc((pedido.origemEditorial==='continuar_legado'?'continuidade_calendarios_i164':'planejamento_social_i155')+'/'+pedido.ciclo),[os,cs]=await Promise.all([tx.get(origemRef),tx.get(db.doc('calendarios/'+i.origem.cliente))]);const fonte=os.data(),cal=cs.data();if(!os.exists||!cs.exists||cal.excluido||cal.arquivado||cal.archived||cal.deletedAt||(pedido.origemEditorial==='continuar_legado'?fonte.ativo!==true:fonte.incluido!==true))return {schema:1,ciclo:pedido.ciclo,somenteLeitura:true,fonteConferida:true,devolucao:null,comparacao:{vigente:false,fonteAvancou:true,link:null}};const esperada={tipo:TIPO_DEVOLUCAO_MENSAL_CP155,id:i.id,origem:i.origem,versao:pedido.versaoEsperada};return ler(pedido.ciclo,pedido.origemEditorial||'',esperada);
 }
 e(pedido.acao==='central_editor_devolucoes_fila_cp155','Leitura desconhecida de devoluções.');
 let cursor=cursorDevolucoesCp155(pedido.apos),remaining=150,proxima=null;const linhas=[],erros=[],conferidas=[],calCache=new Map();
 const calAtual=cliente=>{if(!calCache.has(cliente))calCache.set(cliente,tx.get(db.doc('calendarios/'+cliente)));return calCache.get(cliente);};
 while(remaining>0){
  const legado=cursor.fase==='legado',col=legado?'continuidade_calendarios_i164':'planejamento_social_i155',field=legado?'ativo':'incluido';let q=db.collection(col).where(field,'==',true).orderBy('__name__').limit(remaining+1);if(cursor.ultimo)q=q.startAfter(cursor.ultimo);const snap=await tx.get(q),visited=snap.docs.slice(0,remaining);remaining-=visited.length;
  for(const s of visited){const id=s.id,raw=s.data(),modo=legado?'continuar_legado':'';try{
   e(/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(id),'O ID da fonte mensal precisa de conferência.');const identidade=identidadeDevolucaoCp155(id,modo);e(raw.schema===1&&raw.cliente===identidade.origem.cliente&&raw.competencia===identidade.origem.competencia,'A identidade da fonte não corresponde ao ciclo físico.');
   if(legado?raw.editorialI172?.fase!=='devolvida':!raw.criacao?.base){conferidas.push({ciclo:id,origemEditorial:modo});continue;}
   const cs=await calAtual(identidade.origem.cliente);if(!cs.exists){e(!legado&&!raw.criacao?.retornoEm,'O calendário do retorno não foi encontrado.');conferidas.push({ciclo:id,origemEditorial:modo});continue;}
   const cal=cs.data();if(cal.excluido||cal.arquivado||cal.archived||cal.deletedAt||cal.aprovacaoMeses?.[identidade.origem.competencia]?.status!=='ajuste_interno'){conferidas.push({ciclo:id,origemEditorial:modo});continue;}
   // Empty I155 preparation explicitly adopted by a continuity is not a second monthly source.
   if(!legado&&!cal.planejamentoBasesI155?.[identidade.origem.competencia]){conferidas.push({ciclo:id,origemEditorial:modo});continue;}
   const r=await ler(id,modo);if(r.devolucao)linhas.push(r.devolucao);conferidas.push({ciclo:id,origemEditorial:modo});
  }catch(error){erros.push({ciclo:/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(id)?id:null,origemEditorial:modo,referencia:hash([col,id]),codigo:'CP155_FONTE_NAO_CONFERIDA',mensagem:String(error.message||'Fonte não conferida.').slice(0,800)});}}
  if(snap.docs.length>visited.length){proxima=codificarCursorCp155({schema:1,fase:cursor.fase,ultimo:visited.at(-1).id});break;}
  if(!legado){cursor={schema:1,fase:'legado',ultimo:''};if(!remaining){proxima=codificarCursorCp155(cursor);break;}continue;}break;
 }
 return {schema:1,destinatario:'Chris',completa:!proxima,proxima,linhas,erros,conferidas,somenteLeitura:true,limiteCandidatos:150};
}
