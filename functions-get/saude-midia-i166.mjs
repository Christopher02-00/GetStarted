import {createHash} from 'node:crypto';
import {identidadeTokenI165,validarCadastroI165} from './contexto.mjs';

// BUILD-TIME PIN ONLY. Root fills this after native ingestion/readback of the new technical file.
// The request can never choose a bucket, object, generation, file, URL or signing lifetime.
const FIXO_SAUDE_MIDIA_I166=Object.freeze({"pronto":true,"bucket":"get-started-4956d-midias-i166","object":"midias-i166-cp108-tecnico/cp108_midia_video/51e90f61-d002-4ba7-b731-133526318ab9","generation":"1793072225207074","bytes":3895,"sha256":"65530dfe33ccd212181316f5c6bc00397498db78a84598c1c671c9d6c91f05f5","mimeType":"video/mp4","videoId":"cp108_midia_video","uploadId":"51e90f61-d002-4ba7-b731-133526318ab9","ownerUid":"cp108_own_0"});
export const ACOES_SAUDE_MIDIA_I166=Object.freeze(['conferir_saude_midia_i166']);
const falhar=(codigo,texto)=>Object.assign(Error(texto),{code:'midia/saude_'+codigo});
const exigir=(ok,codigo,texto)=>{if(!ok)throw falhar(codigo,texto);};

async function lerHash(stream,expectedBytes){
 let bytes=0,head=Buffer.alloc(0);const digest=createHash('sha256');
 const timer=setTimeout(()=>stream.destroy(falhar('tempo','O arquivo de conferência demorou para ser relido. Tente a mesma conferência novamente.')),10000);timer.unref?.();
 try{
  for await(const part of stream){const b=Buffer.from(part);bytes+=b.length;exigir(bytes<=expectedBytes,'bytes','O arquivo de conferência não corresponde à versão esperada.');if(head.length<12)head=Buffer.concat([head,b.subarray(0,12-head.length)]);digest.update(b);}
  exigir(bytes===expectedBytes&&head.length>=12&&head.toString('ascii',4,8)==='ftyp','bytes','O arquivo de conferência não pôde ser relido por inteiro.');
  return digest.digest('hex');
 }finally{clearTimeout(timer);if(!stream.destroyed)stream.destroy();}
}

function conferirMetadata(m){
 const f=FIXO_SAUDE_MIDIA_I166,x=m?.metadata||{};
 exigir(String(m?.generation||'')===f.generation&&String(m?.size||'')===String(f.bytes)&&m?.contentType===f.mimeType,'versao','O arquivo de conferência mudou. Nenhuma prévia de outra versão foi liberada.');
 exigir(x.videoId===f.videoId&&x.uploadId===f.uploadId&&x.ownerUid===f.ownerUid&&x.expectedBytes===String(f.bytes)&&x.expectedMime===f.mimeType,'origem','A origem do arquivo de conferência não foi confirmada.');
}

export async function conferirSaudeMidiaI166(db,auth,input,{agora=new Date(),storage=null}={}){
 const fields=['acao','uidEsperado','atorRealEsperado','papelOperado','sessao'];
 exigir(input&&typeof input==='object'&&!Array.isArray(input)&&input.acao==='conferir_saude_midia_i166'&&Object.keys(input).every(k=>fields.includes(k)),'entrada','Abra a conferência pela Saúde das Automações.');
 const a=identidadeTokenI165(auth,input.papelOperado,input.sessao||'saude_midia_i166');
 exigir(a.real==='Chris'&&a.papel==='Chris','papel','Esta conferência fica no acesso próprio do Chris.');
 exigir(input.uidEsperado===a.uid&&input.atorRealEsperado===a.real,'conta','O acesso mudou. Reabra a conferência no seu perfil.');
 const cadastro=await db.doc('usuarios_equipe/'+a.email).get();validarCadastroI165(a,cadastro.data());
 const f=FIXO_SAUDE_MIDIA_I166;
 exigir(f.pronto===true&&/^midias-i166-cp108-tecnico\/[A-Za-z0-9_-]+\/[a-f0-9-]{36}$/.test(f.object)&&/^\d+$/.test(f.generation)&&f.bytes===3895&&/^[a-f0-9]{64}$/.test(f.sha256),'pino','O arquivo interno de conferência ainda precisa ser fixado pela implantação. Nenhum conteúdo de cliente foi alterado.');
 exigir(process.env.GET_I166_MIDIA_ENABLED==='true'&&process.env.GET_I166_MIDIA_BUCKET===f.bucket,'config','O armazenamento de arquivos ainda precisa ser conferido no servidor.');
 const now=new Date(agora);exigir(Number.isFinite(now.getTime()),'tempo','Não consegui confirmar o horário desta conferência.');
 storage=storage||(await import('firebase-admin/storage')).getStorage();
 const atual=storage.bucket(f.bucket).file(f.object),pinado=storage.bucket(f.bucket).file(f.object,{generation:f.generation});
 let meta;
 try{[meta]=await atual.getMetadata();}catch{throw falhar('arquivo','O arquivo interno de conferência não está disponível. Nenhum conteúdo de cliente foi alterado.');}
 conferirMetadata(meta);
 const sha256=await lerHash(pinado.createReadStream({validation:'crc32c'}),f.bytes);exigir(sha256===f.sha256,'hash','O arquivo de conferência não corresponde aos bytes preservados.');
 const [depois]=await atual.getMetadata();conferirMetadata(depois);
 const expires=new Date(now.getTime()+180000);let url;
 try{
  [url]=await pinado.getSignedUrl({version:'v4',action:'read',expires,queryParams:{generation:f.generation}});
  const u=new URL(url);exigir(u.protocol==='https:'&&u.hostname==='storage.googleapis.com'&&!u.username&&!u.password&&!u.port&&u.searchParams.get('generation')===f.generation,'preview','A prévia temporária não foi confirmada.');
 }catch{throw falhar('assinatura','O arquivo foi relido, mas a prévia temporária ainda precisa de configuração no servidor.');}
 return {schema:1,estado:'conferido',arquivoTecnico:true,bytes:f.bytes,mimeType:f.mimeType,sha256,generation:f.generation,url,expiraEm:expires.toISOString(),temporaria:true,conferidoEm:now.toISOString(),leituraIntegral:true,mesmaGeneration:true,nenhumaEscrita:true,nenhumConteudoCliente:true,nenhumEnvioInstagram:true};
}
