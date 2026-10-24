/* Agenda isolada: demandas normais são a única fonte da obrigação. Não importa I155/I164. */
export const TIPO_ORGANIZACAO_I167 = 'organizacao_social_i167';
export const CONFIG_ORGANIZACAO_I167 = 'organizacao_social_i167';
const RECIBO = 'org_i167_op__';
const PESSOAS = ['Chris','Amanda','Cecília','Gabrielle','Fernanda','Helo','João Victor','Luís','Nathan','Yas'];
const EMPRESAS = ['', 'otica_hauer','otica_sao_jose','clinica_olhos_hauer','clinica_sao_jose'];
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export class ErroOrganizacaoI167 extends Error {
  constructor(codigo, mensagem) { super(mensagem); this.name='ErroOrganizacaoI167'; this.codigo=codigo; }
}
const falha = (codigo,mensagem) => { throw new ErroOrganizacaoI167(codigo,mensagem); };
function str(v,n,campo,vazio=true) {
  if(typeof v!=='string'||v.length>n||(!vazio&&!v.trim())||/[\x00\x7f]/u.test(v)) falha('ENTRADA_INVALIDA','Confira '+campo+'.');
  return v;
}
function inteiro(v,min,max,campo) { if(!Number.isSafeInteger(v)||v<min||v>max)falha('ENTRADA_INVALIDA','Confira '+campo+'.'); return v; }
function somente(d,ks) { if(!obj(d)||Object.keys(d).some(k=>!ks.includes(k)))falha('ENTRADA_INVALIDA','Campos não reconhecidos nesta organização.'); }
function mes(v) { if(!/^20\d{2}-(0[1-9]|1[0-2])$/u.test(v||''))falha('ENTRADA_INVALIDA','Confira o mês da organização.');return v; }
function dia(v,vazio=false) {
  if(vazio&&v==='')return v;
  if(typeof v!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u.test(v)||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)falha('ENTRADA_INVALIDA','Confira a data.');return v;
}
function pessoa(v) { if(!PESSOAS.includes(v))falha('ENTRADA_INVALIDA','Escolha uma pessoa da equipe.');return v; }
function operacao(v) { if(!/^[A-Za-z0-9_-]{12,100}$/u.test(v||''))falha('OPERACAO_INVALIDA','A operação precisa de um identificador estável.');return v; }
function id(v) { if(!/^[A-Za-z0-9_-]{1,180}$/u.test(v||''))falha('ENTRADA_INVALIDA','Registro inválido.');return v; }
function versao(v) { if(v!==null&&!/^[a-f0-9]{64}$/u.test(v||''))falha('VERSAO_INVALIDA','Reabra este registro antes de salvar.');return v; }
function canonico(v) {
  if(v===null||typeof v!=='object')return v;
  if(typeof v.toMillis==='function')return {__timestamp:[v.seconds,v.nanoseconds]};
  if(v instanceof Date)return {__date:v.toISOString()};
  if(Array.isArray(v))return v.map(canonico);
  return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonico(v[k])]));
}
export async function assinaturaOrganizacaoI167(d) {
  const bytes=new TextEncoder().encode(JSON.stringify(canonico(d)));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
function normalizarEntrada(d) {
  somente(d,['id','cliente','clienteNome','empresaId','titulo','descricao','destinatario','prazoData','prazoHora','linkAnexo','mes','etapa','ordem','quantidade','unidade','inicio','fixo','prioridade']);
  if(!/^[a-z0-9][a-z0-9._-]{0,119}$/u.test(d.cliente||''))falha('ENTRADA_INVALIDA','Escolha o cliente físico.');
  const empresaId=d.empresaId??'';
  if(!EMPRESAS.includes(empresaId)||(d.cliente!=='zeiss'&&empresaId!==''))falha('ENTRADA_INVALIDA','Confira a empresa deste compromisso.');
  if(!/^[a-z0-9][a-z0-9_-]{0,59}$/u.test(d.etapa||''))falha('ENTRADA_INVALIDA','Confira a etapa.');
  const prazoData=dia(d.prazoData),inicio=dia(d.inicio??'',true),prazoHora=d.prazoHora||'19:00';
  if(inicio&&inicio>prazoData||!/^([01]\d|2[0-3]):[0-5]\d$/u.test(prazoHora))falha('ENTRADA_INVALIDA','Confira início, prazo e horário.');
  if(typeof d.fixo!=='boolean'||!['normal','alta','urgente'].includes(d.prioridade??'normal'))falha('ENTRADA_INVALIDA','Confira prioridade e compromisso fixo.');
  const linkAnexo=str(d.linkAnexo??'',8000,'link');
  if(linkAnexo){let u;try{u=new URL(linkAnexo);}catch{falha('ENTRADA_INVALIDA','Confira o link.');}if(!['https:','http:'].includes(u.protocol))falha('ENTRADA_INVALIDA','Use um link de material válido.');}
  return {cliente:d.cliente,clienteNome:str(d.clienteNome??'',180,'nome do cliente'),empresaId,titulo:str(d.titulo,300,'título',false),descricao:str(d.descricao??'',20000,'descrição'),destinatario:pessoa(d.destinatario),prazoData,prazoHora,linkAnexo,mes:mes(d.mes),etapa:d.etapa,ordem:inteiro(d.ordem,0,1000000,'ordem'),quantidade:inteiro(d.quantidade,1,1000,'quantidade'),unidade:str(d.unidade,60,'unidade',false),inicio,fixo:d.fixo,prioridade:d.prioridade??'normal'};
}
function normalizarConfig(c) {
  somente(c,['diasTrabalho','modelos']);
  if(!Array.isArray(c.diasTrabalho)||!c.diasTrabalho.length||c.diasTrabalho.length>7||new Set(c.diasTrabalho).size!==c.diasTrabalho.length||c.diasTrabalho.some(n=>!Number.isInteger(n)||n<0||n>6)||!Array.isArray(c.modelos)||c.modelos.length>20)falha('ENTRADA_INVALIDA','Confira dias e modelos.');
  const ids=new Set();
  const modelos=c.modelos.map(m=>{
    somente(m,['id','nome','etapas']);id(m.id);if(ids.has(m.id))falha('ENTRADA_INVALIDA','Modelos com identidade repetida.');ids.add(m.id);
    if(!Array.isArray(m.etapas)||!m.etapas.length||m.etapas.length>30)falha('ENTRADA_INVALIDA','Confira as etapas do modelo.');
    const etapasIds=new Set();
    const etapas=m.etapas.map(e=>{
      somente(e,['id','titulo','destinatario','offsetDias','quantidade','unidade','ordem']);
      if(!/^[a-z0-9][a-z0-9_-]{0,59}$/u.test(e.id||'')||etapasIds.has(e.id))falha('ENTRADA_INVALIDA','Confira as identidades das etapas.');etapasIds.add(e.id);
      return {id:e.id,titulo:str(e.titulo,300,'título da etapa',false),destinatario:pessoa(e.destinatario),offsetDias:inteiro(e.offsetDias,-365,365,'intervalo'),quantidade:inteiro(e.quantidade,1,1000,'quantidade'),unidade:str(e.unidade,60,'unidade',false),ordem:inteiro(e.ordem,0,1000000,'ordem')};
    });
    return {id:m.id,nome:str(m.nome,100,'nome do modelo',false),etapas};
  });
  return {diasTrabalho:[...c.diasTrabalho].sort(),modelos};
}

export function criarRepositorioOrganizacaoI167(io,contexto) {
  const {db,doc,collection,query,where,getDocFromServer,getDocsFromServer,runTransaction,serverTimestamp,validarClienteTx}=io;
  if([doc,collection,query,where,getDocFromServer,getDocsFromServer,runTransaction,serverTimestamp,validarClienteTx,contexto].some(f=>typeof f!=='function'))falha('DEPENDENCIA_AUSENTE','A organização precisa da leitura física do cliente e do servidor.');
  function ctx() {
    const c=contexto(),p=c?.pessoa??c?.nome;
    if(typeof c?.uid!=='string'||!c.uid||!PESSOAS.includes(p)||!PESSOAS.includes(c.atorReal)||(c.atorReal!==p&&c.atorReal!=='Chris'))falha('SESSAO_INVALIDA','Selecione um perfil autenticado compatível.');
    return {uid:c.uid,pessoa:p,atorReal:c.atorReal,sessao:c.sessao??''};
  }
  function conferirSessao(c,escrita=false) {
    if(JSON.stringify(ctx())!==JSON.stringify(c))falha('SESSAO_MUDOU','O perfil mudou; seus campos foram preservados.');
    if(escrita&&!['Chris','Amanda'].includes(c.pessoa))falha('PAPEL_SEM_EDICAO','Amanda e Chris organizam estes compromissos.');
  }
  const refDemanda=d=>doc(db,'demandas',id(d));
  const refRecibo=op=>doc(db,'config_painel',RECIBO+operacao(op));
  const refConfig=()=>doc(db,'config_painel',CONFIG_ORGANIZACAO_I167);
  function propria(d) { return d?.tipoEspecial===TIPO_ORGANIZACAO_I167&&d.agendaOrganizacaoI167?.versao===1; }
  function reciboProprio(d,c) { return d?.schema===1&&d.tipo==='recibo_organizacao_i167'&&d.autorUid===c.uid&&d.perfil===c.pessoa&&d.autorReal===c.atorReal&&['salvar','cancelar','restaurar','config'].includes(d.acao)&&(d.acao==='config'?d.alvoColecao==='config_painel'&&d.alvoId===CONFIG_ORGANIZACAO_I167:d.alvoColecao==='demandas'&&/^[A-Za-z0-9_-]{1,180}$/u.test(d.alvoId||''))&&/^[a-f0-9]{64}$/u.test(d.assinaturaPedido||''); }
  async function item(did,d) {
    if(!propria(d))falha('REGISTRO_INCOMPATIVEL','Este registro não é da organização.');
    const assinatura=await assinaturaOrganizacaoI167(d);
    return {id:did,...d,assinatura,versao:assinatura};
  }
  async function ler(did) {
    const c=ctx(),s=await getDocFromServer(refDemanda(did));conferirSessao(c);
    if(!s.exists())falha('NAO_ENCONTRADO','O compromisso não foi encontrado no servidor.');
    const r=await item(did,s.data());conferirSessao(c);return r;
  }
  async function lerConfig() {
    const c=ctx(),s=await getDocFromServer(refConfig());conferirSessao(c);
    if(!s.exists())return {schema:1,tipo:'agenda_organizacao_i167',diasTrabalho:[1,2,3,4,5],modelos:[],revisao:0,assinatura:null,versao:null,origem:'servidor',completo:true};
    const d=s.data();if(d.schema!==1||d.tipo!=='agenda_organizacao_i167')falha('CONFIG_INCOMPATIVEL','A configuração encontrada não é desta agenda.');
    normalizarConfig({diasTrabalho:d.diasTrabalho,modelos:d.modelos});const assinatura=await assinaturaOrganizacaoI167(d);conferirSessao(c);
    return {...d,assinatura,versao:assinatura,origem:'servidor',completo:true};
  }
  async function retornoRecibo(r,c,recuperado) {
    conferirSessao(c);
    const alvo=r.alvoColecao==='demandas'?await ler(r.alvoId):await lerConfig();conferirSessao(c);
    return {...alvo,recuperado,operacaoConfirmada:true,operacaoId:r.operacaoId,atualizadoAposOperacao:r.alvoColecao==='demandas'?alvo.agendaOrganizacaoI167.operacao!==r.operacaoId:alvo.operacao!==r.operacaoId};
  }
  async function retomarOperacao(op) {
    const c=ctx();conferirSessao(c,true);const s=await getDocFromServer(refRecibo(op));conferirSessao(c,true);
    if(!s.exists())return null;
    const r=s.data();if(!reciboProprio(r,c)||r.operacaoId!==op)falha('RECIBO_INCOMPATIVEL','A operação pertence a outro contexto.');
    return retornoRecibo(r,c,true);
  }
  function camposPrazo(data,hora,ator) {
    // Mesma política CP101 camposAoAlterarPrazoDemanda; não envia e-mail de criação outra vez.
    return {prazoData:data,prazoHora:hora||'19:00',prazoAlteradoPor:ator,prazoAlteradoEm:new Date().toISOString(),prazoSolicitado:'',prazoSolicitadoPor:'',motivoPrazo:'',urgenciaManual:'',urgenciaFixadaPor:'',urgenciaFixadaEm:'',nivelEscalonamentoDemanda:0,lembretePrazoHojeEm:'',avisoRetaFinalEm:''};
  }
  async function mutar(acao,alvoId,entrada,opcoes={}) {
    const c=ctx();conferirSessao(c,true);
    const op=operacao(opcoes.operacaoId),esperada=versao(opcoes.versaoEsperada),config=acao==='config';
    const alvo=config?CONFIG_ORGANIZACAO_I167:id(alvoId??('org167_'+op));
    const pedido={acao,alvo,entrada,esperada},assinaturaPedido=await assinaturaOrganizacaoI167(pedido);
    const dr=config?refConfig():refDemanda(alvo),rr=refRecibo(op);
    let repetida=false;
    const confereRecibo=r=>reciboProprio(r,c)&&r.operacaoId===op&&r.acao===acao&&r.alvoId===alvo&&r.alvoColecao===(config?'config_painel':'demandas')&&r.assinaturaPedido===assinaturaPedido;
    try {
      await runTransaction(db,async tx=>{
        const rs=await tx.get(rr);conferirSessao(c,true);
        if(rs.exists()){if(!confereRecibo(rs.data()))falha('OPERACAO_DIVERGENTE','Esta operação já tem outro conteúdo ou destino.');repetida=true;return;}
        const ds=await tx.get(dr);conferirSessao(c,true);const antes=ds.exists()?ds.data():null;
        if((antes?await assinaturaOrganizacaoI167(antes):null)!==esperada)falha('VERSAO_MUDOU','O compromisso ou a entrega mudou. Confira a versão atual; seus campos foram preservados.');
        let depois,revisao;
        if(config){
          if(antes&&(antes.schema!==1||antes.tipo!=='agenda_organizacao_i167'))falha('CONFIG_INCOMPATIVEL','Configuração incompatível; nada foi alterado.');
          revisao=(antes?.revisao||0)+1;depois={schema:1,tipo:'agenda_organizacao_i167',...entrada,revisao,operacao:op,autorUid:c.uid,autorReal:c.atorReal,perfil:c.pessoa,atualizadoEm:serverTimestamp()};
        }else{
          if(antes&&!propria(antes))falha('REGISTRO_INCOMPATIVEL','A demanda encontrada não pertence a esta agenda.');
          if(!antes&&acao!=='salvar')falha('NAO_ENCONTRADO','O compromisso não foi encontrado.');
          const meta=antes?.agendaOrganizacaoI167??{};revisao=(meta.revisao||0)+1;
          const historico=[...(Array.isArray(antes?.historico)?antes.historico:[])];
          if(acao==='salvar'){
            if(antes?.excluido||meta.arquivada)falha('REGISTRO_ARQUIVADO','Restaure o compromisso antes de editar.');
            const canon=await validarClienteTx(tx,{cliente:entrada.cliente,clienteNome:entrada.clienteNome,mes:entrada.mes,empresaId:entrada.empresaId},c);conferirSessao(c,true);
            if(canon?.cliente!==entrada.cliente||canon.ativo!==true||typeof canon.clienteNome!=='string'||!canon.clienteNome.trim())falha('CLIENTE_NAO_CONFERIDO','O cliente físico/ativo não foi confirmado.');
            const {mes,etapa,ordem,quantidade,unidade,inicio,fixo,prioridade,empresaId,...comum}=entrada;
            depois={...(antes??{status:'pendente',provaTexto:'',provaImagemUrl:'',criadoEm:serverTimestamp(),criadoPor:c.pessoa,origem:c.pessoa.toLowerCase(),protocoloCriacao:op}),...comum,clienteNome:canon.clienteNome,empresaOtavio:empresaId,tipoEspecial:TIPO_ORGANIZACAO_I167,agendaOrganizacaoI167:{...meta,versao:1,mes,etapa,ordem,quantidade,unidade,inicio,fixo,prioridade,empresaId,revisao,operacao:op,arquivada:false}};
            if(antes&&(antes.prazoData!==entrada.prazoData||antes.prazoHora!==entrada.prazoHora))Object.assign(depois,camposPrazo(entrada.prazoData,entrada.prazoHora,c.pessoa));
          }else if(acao==='cancelar'){
            if(meta.arquivada||antes.excluido)falha('REGISTRO_ARQUIVADO','Este compromisso já está arquivado.');
            depois={...antes,status:'cancelada',excluido:true,excluidoPor:c.pessoa,excluidoEm:new Date().toISOString(),motivoExclusao:entrada.motivo,agendaOrganizacaoI167:{...meta,revisao,operacao:op,arquivada:true,statusAnterior:antes.status,canceladaPorI167:true}};
          }else{
            if(!meta.arquivada||meta.canceladaPorI167!==true)falha('RESTAURO_INCOMPATIVEL','Este compromisso não foi arquivado por esta agenda.');
            const status=antes.status==='cancelada'?meta.statusAnterior:antes.status;
            if(!['pendente','concluida_aguardando_aprovacao','aprovada','cancelada'].includes(status))falha('RESTAURO_INCOMPATIVEL','Confira o estado anterior antes de restaurar.');
            depois={...antes,status,excluido:false,restauradoPor:c.pessoa,restauradoEm:new Date().toISOString(),agendaOrganizacaoI167:{...meta,revisao,operacao:op,arquivada:false,canceladaPorI167:false}};
          }
          const retrato=d=>d?{prazoData:d.prazoData,prazoHora:d.prazoHora,destinatario:d.destinatario,mes:d.agendaOrganizacaoI167.mes,etapa:d.agendaOrganizacaoI167.etapa,ordem:d.agendaOrganizacaoI167.ordem,quantidade:d.agendaOrganizacaoI167.quantidade,unidade:d.agendaOrganizacaoI167.unidade,estado:d.status}:null;
          historico.push({acao:acao==='salvar'?(antes?'Organização atualizada':'Compromisso de organização criado'):acao==='cancelar'?'Compromisso arquivado na organização':'Compromisso restaurado na organização',por:c.pessoa,atorReal:c.atorReal,em:new Date().toISOString(),operacaoI167:op,antes:retrato(antes),depois:retrato(depois)});
          depois.historico=historico;depois.atualizadoEm=serverTimestamp();
        }
        conferirSessao(c,true);
        tx.set(dr,depois);
        tx.set(rr,{schema:1,tipo:'recibo_organizacao_i167',operacaoId:op,acao,alvoColecao:config?'config_painel':'demandas',alvoId:alvo,assinaturaPedido,autorUid:c.uid,autorReal:c.atorReal,perfil:c.pessoa,revisao,em:serverTimestamp()});
      });
    }catch(e){
      conferirSessao(c,true);
      try{const s=await getDocFromServer(rr);conferirSessao(c,true);if(s.exists()&&confereRecibo(s.data()))return retornoRecibo(s.data(),c,true);}catch(recuperacao){if(recuperacao?.codigo==='SESSAO_MUDOU')throw recuperacao;}
      throw e;
    }
    const r=await getDocFromServer(rr);conferirSessao(c,true);
    if(!r.exists()||!confereRecibo(r.data()))falha('CONFIRMACAO_PENDENTE','A operação pode ter sido gravada. Confira os mesmos IDs antes de tentar novamente.');
    return retornoRecibo(r.data(),c,repetida);
  }
  return Object.freeze({
    ler,lerConfig,retomarOperacao,
    async listar({mes:competencia,incluirArquivados=false}={}) {
      mes(competencia);if(typeof incluirArquivados!=='boolean')falha('ENTRADA_INVALIDA','Filtro inválido.');
      const c=ctx(),s=await getDocsFromServer(query(collection(db,'demandas'),where('tipoEspecial','==',TIPO_ORGANIZACAO_I167),where('agendaOrganizacaoI167.mes','==',competencia)));conferirSessao(c);
      const itens=[];
      for(const x of s.docs){const d=x.data();if(!propria(d))falha('REGISTRO_INCOMPATIVEL','Há um registro de organização não conferido.');if(d.agendaOrganizacaoI167.mes!==competencia||(!incluirArquivados&&(d.excluido||d.agendaOrganizacaoI167.arquivada)))continue;itens.push(await item(x.id,d));}
      conferirSessao(c);itens.sort((a,b)=>a.prazoData.localeCompare(b.prazoData)||(a.prazoHora||'').localeCompare(b.prazoHora||'')||a.agendaOrganizacaoI167.ordem-b.agendaOrganizacaoI167.ordem||a.id.localeCompare(b.id));
      return {itens,origem:'servidor',completo:true};
    },
    salvar(entrada,opcoes) { const n=normalizarEntrada(entrada);return mutar('salvar',entrada.id??null,n,opcoes); },
    cancelar(did,opcoes={}) { return mutar('cancelar',did,{motivo:str(opcoes.motivo??'Arquivado na organização',1000,'motivo',false)},opcoes); },
    restaurar(did,opcoes) { return mutar('restaurar',did,{},opcoes); },
    salvarConfig(entrada,opcoes) { return mutar('config',CONFIG_ORGANIZACAO_I167,normalizarConfig(entrada),opcoes); }
  });
}
