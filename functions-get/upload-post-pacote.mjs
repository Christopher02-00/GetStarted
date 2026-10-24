import {createHash} from 'node:crypto';
import {conferirDiretrizAtualI165,dentroDaDiretrizI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {legendaUtilizavelI79} from './lib/gs-legenda-qualidade-i79.mjs';

// Pure contract. Provenance booleans are supplied ONLY by trusted server/TX readers.
// This module performs no I/O, invents no missing value and grants no permission by itself.
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const texto=x=>typeof x==='string'&&x.trim()===x&&x.length>0;
const id=x=>texto(x)&&x.length<=180&&/^[A-Za-z0-9_.-]+$/u.test(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const instante=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&/^\d{4}-\d{2}-\d{2}T/u.test(x);
export const jsonCanonicoUploadPostI166=x=>JSON.stringify(x,(_k,v)=>obj(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export const hashUploadPostI166=x=>createHash('sha256').update(typeof x==='string'?x:jsonCanonicoUploadPostI166(x)).digest('hex');
export function identidadeUnidadeUploadPostI166({postagemId,rede,instagram_account_id,ocorrenciaId}){
 if(![postagemId,instagram_account_id,ocorrenciaId].every(id)||rede!=='instagram')throw Object.assign(Error('Confira a identidade física desta publicação.'),{code:'i166/identidade'});
 return hashUploadPostI166([postagemId,rede,instagram_account_id,ocorrenciaId]);
}
export function materialEditorialUploadPostI166({fontes,pacote,rede='instagram'}){
 const p=fontes?.post,m=pacote?.midia,l=pacote?.legendas?.[rede],c=pacote?.capa;
 return {pacoteId:pacote?.id,postagemId:p?.id,videoId:fontes?.video?.id||'',cliente:p?.cliente,empresaOtavio:p?.empresaOtavio||'',rede,formato:pacote?.formato,midia:m?{id:m.id,sha256:m.sha256,generation:m.generation,bytes:m.bytes,mimeType:m.mimeType,storageRef:m.storageRef}:null,legenda:l?.texto,capa:c?{thumb_offset:c.thumb_offset,midiaSha256:c.midiaSha256,midiaGeneration:c.midiaGeneration}:null,collaborators:pacote?.collaborators};
}
export const assinaturaEditorialUploadPostI166=entrada=>hashUploadPostI166(materialEditorialUploadPostI166(entrada));
export function assinaturaFonteUploadPostI166(fontes){return hashUploadPostI166({post:fontes.post,video:fontes.video||null,diretriz:fontes.diretriz});}

export function validarPacoteUploadPostI166({fontes,config,pacote,conta,ocorrencia,agenda,rede='instagram',agora=new Date()}={}){
 const impedimentos=[],bloquear=(ok,codigo,responsavel,campo,mensagem)=>{if(!ok)impedimentos.push({codigo,responsavel,campo,mensagem});};
 const p=fontes?.post,v=fontes?.video,d=fontes?.diretriz,m=pacote?.midia,c=pacote?.capa,l=pacote?.legendas?.[rede],a=pacote?.aprovacao,agoraMs=new Date(agora).getTime();
 bloquear(fontes?.conferidaPeloServidor===true&&obj(p)&&id(p.id)&&id(p.cliente)&&obj(d),'fonte','Cecília','fontes','A fonte e a orientação precisam ser conferidas no servidor.');
 bloquear(fontes?.clienteAtivo===true&&fontes?.configEntrega?.modo==='postagem','servico','Amanda','servico','Confira se este serviço inclui publicação.');
 bloquear(config?.ativo===true&&config?.pausado===false,'pausa','Amanda','config','Os novos envios estão pausados ou ainda precisam ser habilitados.');
 bloquear(rede==='instagram'&&pacote?.formato==='REELS','formato','Amanda','formato','Esta rota precisa de um Reel do Instagram autorizado.');
 bloquear(p?.excluido!==true&&!p?.arquivado&&p?.status==='aguardando_agendamento','estado','Cecília','postagem','Confira a etapa atual desta postagem.');
 bloquear(!v||(v.status==='aprovado'&&v.clienteAprovou===true&&p?.videoId===v.id&&v.postagemId===p?.id),'cliente','Amanda','aprovacaoCliente','A aprovação aplicável do cliente e o vínculo da peça precisam estar confirmados.');
 bloquear(!p?.publicacaoStokki||(p.publicacaoStokki.versao===1&&p.publicacaoStokki.selecionadas?.includes(rede)),'rede','Cecília','rede','Esta rede não está na seleção autorizada da peça.');
 bloquear(id(pacote?.id)&&pacote?.postagemId===p?.id&&pacote?.videoId===(v?.id||''),'pacote','Amanda','pacote','O pacote liberado precisa pertencer à mesma peça.');
 bloquear(id(m?.id)&&hash(m?.sha256)&&texto(m?.generation)&&m.generation.length<=180&&Number.isSafeInteger(m?.bytes)&&m.bytes>0&&/^video\/[a-z0-9.+-]+$/u.test(m?.mimeType||'')&&texto(m?.storageRef?.bucket)&&texto(m?.storageRef?.object),'midia','Editor','midia','Confirme o arquivo final, sua versão e o manifesto de armazenamento.');
 bloquear(m?.imutavel===true&&m?.legivel===true&&m?.verificadoPeloServidor===true&&instante(m?.verificadoEm),'midia-servidor','Editor','midia','O arquivo final ainda precisa de leitura e verificação no servidor.');
 bloquear((v?m?.videoId===v.id:m?.postagemId===p?.id)&&(!m?.postagemId||m.postagemId===p?.id),'midia-origem','Editor','midia','O arquivo pertence a outra peça.');
 bloquear(['Amanda','Chris'].includes(a?.por)&&instante(a?.em)&&Number.isFinite(agoraMs)&&Date.parse(a?.em)<=agoraMs&&instante(m?.verificadoEm)&&Date.parse(m.verificadoEm)<Date.parse(a?.em),'aprovacao','Amanda','aprovacao','O arquivo deve ser verificado antes da aprovação desta versão.');
 bloquear(a?.midiaManifestoId===m?.id&&a?.midiaSha256===m?.sha256&&a?.midiaGeneration===m?.generation,'aprovacao-midia','Amanda','aprovacao','A aprovação não corresponde à versão atual do arquivo.');
 const legendaFonte=p?.publicacaoStokki?.versao===1?p?.legendaInstagram:p?.legenda;
 bloquear(legendaUtilizavelI79(l?.texto)&&l?.texto===legendaFonte&&['Amanda','Chris'].includes(l?.aprovadaPor)&&instante(l?.aprovadaEm)&&instante(a?.em)&&Date.parse(l.aprovadaEm)<=Date.parse(a.em),'legenda','Amanda','legendas.instagram','A legenda desta rede precisa estar aprovada e coincidir com o texto da postagem.');
 bloquear(Number.isSafeInteger(c?.thumb_offset)&&c.thumb_offset>=0&&c?.midiaSha256===m?.sha256&&c?.midiaGeneration===m?.generation,'capa','Editor','capa','Escolha explicitamente o quadro da capa desta versão do vídeo.');
 bloquear(Array.isArray(pacote?.collaborators)&&pacote.collaborators.every(x=>typeof x==='string'&&/^[A-Za-z0-9_][A-Za-z0-9_.]{0,29}$/u.test(x))&&new Set(pacote.collaborators).size===pacote.collaborators.length,'collab','Amanda','collaborators','Confira a lista aprovada de colaboradores, mesmo quando estiver vazia.');
 const assinaturaEditorial=assinaturaEditorialUploadPostI166({fontes,pacote,rede});
 bloquear(hash(a?.assinaturaEditorial)&&a.assinaturaEditorial===assinaturaEditorial,'aprovacao-pacote','Amanda','aprovacao.assinaturaEditorial','O texto, a capa ou os colaboradores mudaram após a aprovação.');
 bloquear(conta?.conferidaPeloServidor===true&&conta?.ativa===true&&conta?.pausada===false&&conta?.reauth_required===false&&conta?.cliente===p?.cliente&&(conta?.empresaOtavio||'')===(p?.empresaOtavio||'')&&conta?.rede===rede&&id(conta?.profile_username)&&id(conta?.instagram_account_id)&&texto(conta?.geracao),'conta','Amanda','conta','Confira a conexão e a conta exata deste cliente e empresa.');
 bloquear(ocorrencia?.autorizada===true&&id(ocorrencia?.id)&&ocorrencia?.postagemId===p?.id&&ocorrencia?.rede===rede&&ocorrencia?.instagram_account_id===conta?.instagram_account_id&&ocorrencia?.geracaoConta===conta?.geracao&&id(ocorrencia?.autoria?.uid)&&['Amanda','Chris','Cecília'].includes(ocorrencia?.autoria?.papel)&&instante(ocorrencia?.autorizadaEm)&&Date.parse(ocorrencia.autorizadaEm)<=agoraMs,'ocorrencia','Amanda','ocorrencia','A ocorrência de publicação precisa de uma autorização específica para esta conta.');
 const utc=typeof agenda?.scheduled_date==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z$/u.test(agenda.scheduled_date)?new Date(agenda.scheduled_date):null;
 let dataBrt,horaBrt;try{if(utc&&Number.isFinite(utc.getTime())){const partes=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(utc).map(x=>[x.type,x.value]));dataBrt=partes.year+'-'+partes.month+'-'+partes.day;horaBrt=partes.hour+':'+partes.minute;}}catch{}
 bloquear(agenda?.timeZone==='America/Sao_Paulo'&&dataBrt===agenda?.data&&horaBrt===agenda?.hora&&utc&&utc.getTime()>agoraMs,'agenda','Cecília','agenda','Confira a data e o horário futuro de São Paulo e seu instante correspondente.');
 try{const politica=conferirDiretrizAtualI165(d,v||null,p);bloquear(dentroDaDiretrizI165(politica,agenda?.data,agenda?.hora)||fontes?.excecaoConferida===true,'diretriz','Amanda','agenda','A data está fora do combinado; a Amanda precisa decidir a mudança.');}catch{bloquear(false,'diretriz-fonte','Amanda','diretriz','A orientação desta peça mudou ou não pôde ser conferida.');}
 if(impedimentos.length)return {elegivel:false,impedimentos,normalizado:null,assinatura:null,assinaturaEditorial};
 const normalizado={postagemId:p.id,videoId:v?.id||'',cliente:p.cliente,empresaOtavio:p.empresaOtavio||'',rede,ocorrenciaId:ocorrencia.id,pacoteId:pacote.id,assinaturaEditorial,assinaturaFonte:assinaturaFonteUploadPostI166(fontes),conta:{profile_username:conta.profile_username,instagram_account_id:conta.instagram_account_id,geracao:conta.geracao},video:{id:m.id,sha256:m.sha256,generation:m.generation,bytes:m.bytes,mimeType:m.mimeType,storageRef:structuredClone(m.storageRef)},payload:{profile_username:conta.profile_username,instagram_account_id:conta.instagram_account_id,scheduled_date:utc.toISOString(),instagram_title:l.texto,media_type:'REELS',thumb_offset:c.thumb_offset,collaborators:[...pacote.collaborators]},agenda:{data:agenda.data,hora:agenda.hora,timeZone:agenda.timeZone,scheduled_date:utc.toISOString()}};
 return {elegivel:true,impedimentos:[],normalizado,assinatura:hashUploadPostI166(normalizado),assinaturaEditorial};
}
