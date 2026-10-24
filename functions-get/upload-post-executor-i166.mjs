import * as intencoesPadrao from './upload-post-intencoes.mjs';

// Um passo interno por job persistido. O tick R74/R75 continua sendo o único motor.
// Sem scheduler, timer, varredura, browser, credencial, download ou escrita na postagem.
const codigo = e => String(e?.codigo || e?.code || 'CONFERENCIA_PENDENTE').slice(0,120);
const erro = (c,m) => Object.assign(new Error(m),{codigo:c,resultado:'nao_enviado'});
const idsIguais = (a,b) => ['request_id','external_id','idempotency_key'].every(k=>a?.[k]===b?.[k]);
const instante = d => Number.isFinite(Date.parse(d)) ? new Date(d).toISOString() : null;
const redesExatas = r => Array.isArray(r)&&r.length===1&&r[0]==='instagram';
const jobIdValido = x => typeof x==='string'&&/^[A-Za-z0-9_.-]{1,180}$/u.test(x);

function videoDoPacote(v,manifesto) {
  if(!v||v.sha256!==manifesto.sha256||v.versao!==manifesto.generation||v.tamanho!==manifesto.bytes||v.mime!==manifesto.mimeType)throw erro('ATIVO_DIVERGENTE','A resolução da mídia não corresponde ao manifesto aprovado.');
  return v;
}
function esperadoDoJob(c) {
  const p=c.pacote.payload;
  const campos={media_type:p.media_type,instagram_title:p.instagram_title};
  if(p.thumb_offset!==undefined)campos.thumb_offset=String(p.thumb_offset);
  if(p.collaborators!==undefined)campos.collaborators=p.collaborators.join(',');
  return {job_id:c.provedor.job_id,profile_username:p.profile_username,instagram_account_id:p.instagram_account_id,request_id:c.ids.request_id,external_id:c.ids.external_id,scheduled_date:instante(p.scheduled_date),campos};
}
function janela(p) {
  const d=Date.parse(p.scheduled_date);
  if(!Number.isFinite(d))throw erro('AGENDA_INVALIDA','O instante persistido precisa ser conferido.');
  return {profile_username:p.profile_username,from:new Date(d).toISOString(),to:new Date(d+1000).toISOString(),limit:50,offset:0};
}
function detalheExato(j,e,{ignorarExternal=false}={}) {
  return j?.job_id===e.job_id&&j.profile_username===e.profile_username&&redesExatas(j.platforms)&&instante(j.scheduled_date)===e.scheduled_date&&(j.request_id==null||j.request_id===e.request_id)&&(ignorarExternal||j.external_id===e.external_id)&&Object.entries(e.campos).every(([k,v])=>j.form?.[k]===v);
}
async function conferirContaAtual(adaptador,c) {
  const conta=c.pacote.conta,p=await adaptador.lerPerfil(conta.profile_username);
  if(p?.profile_username!==conta.profile_username||p.instagram?.conectado!==true||p.instagram.reauth_required!==false||p.instagram.account_id!==conta.instagram_account_id)throw erro('CONEXAO_INSTAGRAM_NAO_CONFERIDA','A conexão Instagram mudou ou precisa ser conferida.');
}
async function conferirAgenda(adaptador,c) {
  const esperado=esperadoDoJob(c),j=await adaptador.lerJob(esperado.job_id,{esperado});
  if(j.agendamento_conferido===true&&detalheExato(j,esperado))return {...j,scheduled_date:instante(j.scheduled_date)};
  // O detalhe oficial pode omitir external_id. Complemento só por ID físico e perfil/rede/instante exatos.
  if(j.external_id===null&&j.divergencias?.length===1&&j.divergencias[0]==='external_id'&&detalheExato(j,esperado,{ignorarExternal:true})) {
    const lista=await adaptador.listarAgendamentos(janela(c.pacote.payload));
    const linhas=lista.scheduled_posts.filter(x=>x.job_id===esperado.job_id&&x.profile_username===esperado.profile_username&&x.external_id===esperado.external_id&&(x.request_id==null||x.request_id===esperado.request_id)&&redesExatas(x.platforms)&&instante(x.scheduled_date)===esperado.scheduled_date);
    if(linhas.length===1)return {...j,external_id:linhas[0].external_id,scheduled_date:instante(j.scheduled_date),agendamento_conferido:true,divergencias:[],correlacao_complementada:'lista_job_id_external_id'};
  }
  return {resultado:'leitura_falhou',codigo:'READBACK_DIVERGENTE',agendamento_conferido:false,divergencias:j.divergencias||[]};
}
async function recuperarCorrelacao(adaptador,c) {
  // Status/history podem demorar a conhecer um job futuro; vazio/404 nunca libera reenvio.
  let status=null;
  try{status=await adaptador.status({request_id:c.ids.request_id});}catch(e){if(!['HTTP_404','STATUS_ID_DIVERGENTE'].includes(codigo(e)))throw e;}
  const history=await adaptador.history({profile_username:c.pacote.conta.profile_username,request_id:c.ids.request_id,external_id:c.ids.external_id,limit:20,page:1});
  const linhas=[...history.history,...history.in_progress].filter(x=>x.profile_username===c.pacote.conta.profile_username&&x.request_id===c.ids.request_id&&x.external_id===c.ids.external_id&&jobIdValido(x.job_id));
  const encontrados=[...new Set(linhas.map(x=>x.job_id))];
  if(encontrados.length!==1||(status?.job_id&&status.job_id!==encontrados[0]))return {resultado:'leitura_falhou',codigo:'CORRELACAO_AINDA_NAO_CONFERIDA'};
  const detalhe=await conferirAgenda(adaptador,{...c,provedor:{job_id:encontrados[0]}});
  if(detalhe.agendamento_conferido!==true)return detalhe;
  return {estado:'correlacao_recuperada',job_id:encontrados[0],request_id:c.ids.request_id,external_id:c.ids.external_id,profile_username:c.pacote.conta.profile_username,scheduled_date:detalhe.scheduled_date,platforms:[...detalhe.platforms]};
}
function fatoDoStatus(s,c) {
  if(s.job_id!==c.provedor.job_id||(s.external_id!=null&&s.external_id!==c.ids.external_id)||(s.request_id!=null&&s.request_id!==c.ids.request_id))throw erro('STATUS_FORA_DA_INTENCAO','O estado devolvido pertence a outra correlação.');
  return {global:s.global,instagram:s.instagram,job_id:s.job_id,external_id:s.external_id,publicadoConfirmado:false,limite:'Estado do fornecedor; falta correlação final/commit canônico pelo domínio.'};
}

export async function executarPassoUploadPostI166(db,jobId,{workerId,adaptador,resolverVideo,lerDependenciasTx,agora=()=>new Date(),leaseMs=120000,aguardarMs=30000,intencoes=intencoesPadrao}={}) {
  if(typeof agora!=='function'||typeof resolverVideo!=='function'||typeof lerDependenciasTx!=='function'||!adaptador||['prepararAgendamento','criarAgendamento','lerPerfil','lerJob','listarAgendamentos','status','history'].some(k=>typeof adaptador[k]!=='function'))throw erro('DEPENDENCIAS_AUSENTES','O executor precisa dos transportes e leitores internos confiáveis.');
  const c=await intencoes.claimExecucaoUploadPostI166(db,jobId,{workerId,leaseMs,lerDependenciasTx,agora:agora()});
  if(!c.adquirida)return {jobId,executou:false,motivo:c.motivo,job:c.job,publicadoConfirmado:false};
  let preparado=null,transporte=null,fatoProvedor=null,resultado,transporteInvocado=false;
  if(c.modo==='enviar') {
    // Nenhum POST pode ocorrer antes do recibo persistente de marcarEnvio.
    try {
      if(c.permitirPost!==true)throw erro('POST_NAO_AUTORIZADO','Esta posse permite somente conferência.');
      const video=videoDoPacote(await resolverVideo(structuredClone(c.pacote.video),{jobId,claim:c.claim}),c.pacote.video);
      const entrada={...c.pacote.payload,...c.ids,video};
      preparado=adaptador.prepararAgendamento(entrada);
      if(!idsIguais(preparado.payload_limpo,c.ids))throw erro('IDS_DIVERGENTES','A preparação mudou a correlação da intenção.');
      const marcado=await intencoes.marcarEnvioUploadPostI166(db,jobId,c.claim,{fingerprint:preparado.fingerprint,ids:c.ids,lerDependenciasTx,agora:agora()});
      if(marcado.postPermitidoUmaVez!==true)throw erro('POST_NAO_AUTORIZADO','A intenção não autorizou este envio.');
      try {
        transporteInvocado=true;
        transporte=await adaptador.criarAgendamento(entrada); // ÚNICA chamada que pode executar POST neste passo.
        if(transporte?.estado!=='aceito_a_conferir'||transporte.fingerprint!==preparado.fingerprint||!idsIguais(transporte.ids,c.ids))throw Object.assign(erro('RETORNO_DIVERGENTE','O retorno não corresponde ao mesmo envio.'),{resultado:'incerto'});
        resultado=transporte;
      }catch(e){resultado={resultado:e?.resultado==='recusado'?'recusado':'incerto',codigo:codigo(e),ids:c.ids,fingerprint:preparado.fingerprint,antesDePost:false};}
    }catch(e){resultado={resultado:transporteInvocado?'incerto':'nao_enviado',codigo:codigo(e),antesDePost:!transporteInvocado,...(preparado?{ids:c.ids,fingerprint:preparado.fingerprint}:{})};}
  }else if(c.modo==='consultar') {
    try {
      await conferirContaAtual(adaptador,c);
      if(!c.provedor?.job_id)resultado=await recuperarCorrelacao(adaptador,c);
      else if(Date.parse(c.pacote.payload.scheduled_date)<=new Date(agora()).getTime()&&c.job.estado==='agendamento_conferido') {
        const status=await adaptador.status({job_id:c.provedor.job_id});fatoProvedor=fatoDoStatus(status,c);
        resultado={resultado:'leitura_falhou',codigo:status.instagram?.estado==='evidencia_externa_a_correlacionar'?'PUBLICACAO_EXTERNA_A_CORRELACIONAR':status.instagram?.estado==='skipped'?'INSTAGRAM_NAO_TENTADO':'PUBLICACAO_NAO_COMPROVADA'};
      }else resultado=await conferirAgenda(adaptador,c);
      await conferirContaAtual(adaptador,c);
    }catch(e){fatoProvedor=null;resultado={resultado:'leitura_falhou',codigo:codigo(e)};}
  }else throw erro('MODO_INVALIDO','O claim não possui uma ação reconhecida.');

  try {
    const persistido=await intencoes.registrarResultadoUploadPostI166(db,jobId,c.claim,resultado,{agora:agora(),aguardarMs});
    return {jobId,executou:true,modo:c.modo,persistencia:persistido,resultado:{estado:resultado.estado??resultado.resultado,agendamento_conferido:resultado.agendamento_conferido===true,codigo:resultado.codigo??null,job_id:resultado.job_id??null},fatoProvedor,publicadoConfirmado:false,nenhumRetryAutomatico:true};
  }catch(e){
    // Lease vencida ou recibo indisponível após transporte: job/IDs existentes são a recuperação.
    return {jobId,executou:true,modo:c.modo,registroPendente:true,codigo:codigo(e),ids:c.ids,fingerprint:preparado?.fingerprint??null,resultado:{estado:resultado.estado??resultado.resultado,job_id:resultado.job_id??null},fatoProvedor,publicadoConfirmado:false,nenhumRetryAutomatico:true};
  }
}
