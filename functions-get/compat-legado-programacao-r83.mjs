import {exigirI165,idFisicoI165,jsonCanonicoI165,dataCivilI165,horaCivilI165,horarioBrasiliaI165,programacaoAtivaI165,responsavelLegendaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {validarOperacaoProgramacaoI165,REDES_I165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {camposPendentesI79} from './lib/gs-legenda-qualidade-i79.mjs';
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const keys=(x,names)=>plain(x)&&Object.keys(x).every(k=>names.includes(k));
const canonico=x=>jsonCanonicoI165(x);
const stamp=x=>keys(x,['seconds','nanoseconds'])&&Number.isSafeInteger(x.seconds)&&Number.isInteger(x.nanoseconds)&&x.nanoseconds>=0&&x.nanoseconds<1e9;
export function createTimeLegadoI165(x){
 const seconds=x?.seconds??x?._seconds,nanoseconds=x?.nanoseconds??x?._nanoseconds;
 exigirI165(stamp({seconds,nanoseconds}),'legado-create-time','A criação física deste material precisa ser conferida.');return {seconds,nanoseconds};
}
export function identidadeLegadoProgramacaoI165(x,{video=false}={}){
 exigirI165(x&&idFisicoI165(x.id)&&idFisicoI165(x.cliente),'legado-identidade','Confira a identidade física do conteúdo anterior.');
 const value=k=>{const v=x[k]??'';exigirI165(typeof v==='string'&&(!v||idFisicoI165(v)),'legado-identidade','A identidade anterior mudou ou está incompleta.');return v;};
 return {cliente:x.cliente,empresaOtavio:value('empresaOtavio'),videoId:video?x.id:value('videoId'),origem:{calendarClienteSlug:value('calendarClienteSlug'),calendarCompetencia:value('calendarCompetencia'),calendarItemId:value('calendarItemId')}};
}
function identidadeValida(x){return keys(x,['cliente','empresaOtavio','videoId','origem'])&&idFisicoI165(x.cliente)&&typeof x.empresaOtavio==='string'&&typeof x.videoId==='string'&&keys(x.origem,['calendarClienteSlug','calendarCompetencia','calendarItemId'])&&Object.keys(x.origem).length===3&&Object.values(x.origem).every(v=>typeof v==='string'&&(!v||idFisicoI165(v)));}
export function validarConfigLegadoProgramacaoI165(cfg){
 if(cfg?.legadoProgramacaoI165==null)return null;const l=cfg.legadoProgramacaoI165;
 exigirI165(programacaoAtivaI165(cfg)&&keys(l,['schema','ativacaoId','censoSHA256','capturadoEm','postagens','videos'])&&l.schema===1&&l.ativacaoId===cfg.ativacaoId&&/^[a-f0-9]{64}$/.test(l.censoSHA256||'')&&stamp(l.capturadoEm)&&plain(l.postagens)&&plain(l.videos),'legado-config','A continuidade dos conteúdos anteriores precisa de conferência.');
 exigirI165(Object.keys(l.postagens).length<=60&&Object.keys(l.videos).length<=9,'legado-config','O inventário de continuidade não corresponde ao recorte aprovado.');
 for(const [id,e]of Object.entries(l.postagens)){
  exigirI165(idFisicoI165(id)&&keys(e,['createTime','identidade','video'])&&stamp(e.createTime)&&identidadeValida(e.identidade),'legado-config','Uma postagem anterior precisa ser conferida.');
  exigirI165(e.identidade.videoId?keys(e.video,['createTime','identidade'])&&stamp(e.video.createTime)&&identidadeValida(e.video.identidade)&&e.video.identidade.videoId===e.identidade.videoId:e.video===null,'legado-config','O vídeo físico de uma postagem anterior precisa de conferência.');
 }
 for(const [id,e]of Object.entries(l.videos))exigirI165(idFisicoI165(id)&&keys(e,['createTime','identidade'])&&stamp(e.createTime)&&identidadeValida(e.identidade)&&e.identidade.videoId===id,'legado-config','Uma aprovação anterior precisa ser conferida.');
 return l;
}
export function resolverCompatLegadoProgramacaoI165({cfg,post,video=null,postCreateTime,videoCreateTime,diretriz=null}){
 // Existing guidance ALWAYS wins, including invalid guidance: its normal strict validator decides.
 if(diretriz!=null)return null;const l=validarConfigLegadoProgramacaoI165(cfg);if(!l)return null;
 if(post?.excluido===true||post?.arquivado||video?.excluido===true||video?.arquivado)return null;
 const p=l.postagens[post?.id],v=!p&&video?l.videos[video.id]:null;if(!p&&!v)return null;
 const pi=identidadeLegadoProgramacaoI165(post),pc=createTimeLegadoI165(postCreateTime);
 if(p){
  exigirI165(canonico(pc)===canonico(p.createTime)&&canonico(pi)===canonico(p.identidade),'legado-fonte','Esta postagem anterior mudou de identidade ou foi recriada.');
  if(p.video)exigirI165(video&&canonico(createTimeLegadoI165(videoCreateTime))===canonico(p.video.createTime)&&canonico(identidadeLegadoProgramacaoI165(video,{video:true}))===canonico(p.video.identidade),'legado-fonte','O vídeo físico desta postagem mudou ou foi recriado.');
 }else{
  exigirI165(canonico(createTimeLegadoI165(videoCreateTime))===canonico(v.createTime)&&canonico(identidadeLegadoProgramacaoI165(video,{video:true}))===canonico(v.identidade),'legado-fonte','A aprovação anterior mudou de identidade ou foi recriada.');
  exigirI165(video.postagemId===post.id&&post.videoId===video.id&&pi.cliente===v.identidade.cliente&&pi.empresaOtavio===v.identidade.empresaOtavio&&canonico(pi.origem)===canonico(v.identidade.origem),'legado-fonte','A postagem nova não confirma o mesmo vídeo anterior.');
  exigirI165(pc.seconds>l.capturadoEm.seconds||pc.seconds===l.capturadoEm.seconds&&pc.nanoseconds>=l.capturadoEm.nanoseconds,'legado-fonte','Esta postagem não foi criada depois da conferência da aprovação anterior.');
 }
 return {schema:1,autorizada:true,modo:p?'postagem_anterior':'video_aprovado_anterior',censoSHA256:l.censoSHA256,semDiretriz:true,semReaprovar:true};
}
export const compatLegadoConfirmadaI165=f=>!f?.diretriz&&f?.legadoProgramacao?.schema===1&&f.legadoProgramacao.autorizada===true;
export function validarAcaoFonteProgramacaoI165(f,acao,ator){
 if(f.diretriz)return validarOperacaoProgramacaoI165(f.diretriz,acao);
 exigirI165(compatLegadoConfirmadaI165(f),'diretriz','A orientação precisa ser definida para este conteúdo novo.');
 exigirI165(['agendar','desfazer','publicar','cancelar'].includes(acao.acao)&&['geral',...REDES_I165].includes(acao.rede||'geral'),'acao','Confira esta ação e a plataforma.');
 if(acao.acao==='agendar')exigirI165(dataCivilI165(acao.data)&&horaCivilI165(acao.hora),'agenda','Confira a data e o horário de Brasília.');
 if(acao.acao==='publicar'){
  const prova=typeof acao.prova==='string'?acao.prova.trim():'';
  exigirI165(dataCivilI165(acao.data)&&horaCivilI165(acao.hora)&&prova&&prova.length<=3000,'prova','Registre data, horário e prova da publicação real.');
  exigirI165(acao.data+'T'+acao.hora<=horarioBrasiliaI165(acao.agora),'fato-futuro','Uma publicação futura ainda não é um fato confirmado.');
  return {permitida:true,fato:{data:acao.data,hora:acao.hora,prova,rede:acao.rede||'geral'},divergente:false,semPromessaAnterior:true,alteraPlano:false,continuidadeLegada:true};
 }
 if(acao.acao==='cancelar')exigirI165(ator?.papel==='Amanda'&&typeof acao.motivo==='string'&&acao.motivo.trim(),'papel','A Amanda precisa registrar o motivo da retirada deste conteúdo anterior.');
 return {permitida:true,excecaoAplicada:false,continuidadeLegada:true,resolveObrigacao:false};
}
export function obrigacoesLegadoProgramacaoI165(f,cfg,agora){
 exigirI165(compatLegadoConfirmadaI165(f)&&typeof cfg.permitirAgendarSemLegendaI90==='boolean','legado-config','A continuidade e a política de legenda precisam estar confirmadas.');
 const p=f.post,v=f.video,res={obrigacoes:[],estado:'continuidade_legada',motivo:'conteudo_anterior_sem_inventar_diretriz',postagemId:p.id};
 if(!f.clienteAtivo||f.configEntrega?.modo!=='postagem'||p.excluido===true||p.arquivado||v?.excluido===true)return {...res,estado:'fora_do_escopo'};
 if(['cancelada_manual','arquivada_sem_postagem','finalizado','postado'].includes(p.status)&&!p.publicacaoStokki)return {...res,estado:'encerrado'};
 if(v&&v.clienteAprovou!==true)return {...res,estado:'aguardando_cliente'};
 const add=(tipo,destinatario,extra={})=>{const o={tipo,destinatario,fonte:{colecao:'postagens',id:p.id},videoId:v?.id||'',revisaoDiretriz:0,rede:'geral',prazo:'',urgencia:'normal',bloqueada:false,continuidadeLegada:true,...extra};o.chave=canonico([tipo,p.id,v?.id||'',0,destinatario,o.rede,'continuidade_r83']);o.vencida=!!o.prazo&&o.prazo<=horarioBrasiliaI165(agora);res.obrigacoes.push(o);};
 if(p.status==='em_correcao'||v?.status==='correcao'){const editor=v?.editorAtribuido;add(editor?'corrigir_video':'definir_responsavel_correcao',editor||'Amanda',{bloqueada:false});return {...res,estado:'programacao_suspensa'};}
 if(v&&!['aprovado','finalizado'].includes(v.status))return {...res,estado:'aguardando_cliente'};
 const pendente=p.status==='aguardando_legenda'||camposPendentesI79(p).length>0;
 if(pendente)add('preparar_legenda',responsavelLegendaI165({processoEditorial:f.processoEditorial}));
 const s=p.publicacaoStokki,redes=s?.versao===1?s.selecionadas:['geral'];
 exigirI165(Array.isArray(redes)&&redes.length>0&&redes.length<=4&&new Set(redes).size===redes.length&&redes.every(r=>r==='geral'||REDES_I165.includes(r)),'redes','Confira as plataformas da postagem anterior.');
 for(const rede of redes){const r=rede==='geral'?{data:p.dataAgendada,hora:p.horaAgendada,publicadaEm:p.status==='postado'?p.postadoEm:'',retirada:false}:s.redes?.[rede];exigirI165(r&&typeof r==='object','rede-ausente','Uma plataforma anterior precisa de conferência.');if(r.retirada||r.publicadaEm)continue;
  if(dataCivilI165(r.data)&&horaCivilI165(r.hora))add('confirmar_publicacao','Cecília',{rede,prazo:r.data+'T'+r.hora});
  else add('programar','Cecília',{rede,bloqueada:pendente&&!cfg.permitirAgendarSemLegendaI90});
 }
 return res;
}
