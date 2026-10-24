/* Arquivos internos: leitura local, bytes privados e recibo atômico. Não usa URL pública. */
export const LIMITE_ARQUIVO = 4 * 1024 * 1024;
export const TAMANHO_PARTE = 700 * 1024;
export const TIPOS_ARQUIVO = Object.freeze({pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain',md:'text/markdown'});
const digesto = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const base64 = bytes => {let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
const binario = texto => Uint8Array.from(atob(texto),c=>c.charCodeAt(0));
let mammothPromise;
function mammothLocal(){
  if(globalThis.mammoth)return Promise.resolve(globalThis.mammoth);
  return mammothPromise ||= new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL('./vendor-planejamento/mammoth.browser.min.js',import.meta.url).href;
    script.onload=()=>globalThis.mammoth?resolve(globalThis.mammoth):reject(Error('O leitor de DOCX não iniciou. Seu arquivo continua no campo.'));
    script.onerror=()=>{mammothPromise=null;reject(Error('Não consegui carregar o leitor de DOCX. Seu arquivo foi preservado.'));};document.head.append(script);
  });
}
export async function prepararArquivo(file){
  if(!file||!Number.isInteger(file.size)||file.size<1||file.size>LIMITE_ARQUIVO)throw Error('Escolha um PDF, DOCX ou texto de até 4 MB.');
  const extensao=String(file.name||'').split('.').pop().toLowerCase(),tipo=TIPOS_ARQUIVO[extensao];
  if(!tipo)throw Error('Use PDF, DOCX, TXT ou MD. Outros formatos não são enviados.');
  const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);let texto='',paginas=0;
  if(extensao==='pdf'){
    if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw Error('O conteúdo deste arquivo não é um PDF.');
    const pdfjs=await import('./vendor-planejamento/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor-planejamento/pdf.worker.min.mjs',import.meta.url).href;
    const tarefa=pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false,useSystemFonts:false,disableFontFace:true});let pdf;
    try{pdf=await tarefa.promise;if(pdf.numPages>100)throw Error('Este PDF tem mais de 100 páginas. Divida o documento antes de enviar.');paginas=pdf.numPages;
      const partes=[];for(let n=1;n<=pdf.numPages;n++){const pagina=await pdf.getPage(n),conteudo=await pagina.getTextContent();partes.push(conteudo.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join(''));pagina.cleanup();}texto=partes.join('\n\n');
    }finally{await tarefa.destroy();}
  }else if(extensao==='docx'){
    if(bytes[0]!==0x50||bytes[1]!==0x4b)throw Error('O conteúdo deste arquivo não é um DOCX.');
    const leitor=await mammothLocal(),resultado=await leitor.extractRawText({arrayBuffer:buffer.slice(0)},{externalFileAccess:false});texto=resultado.value;
  }else texto=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  texto=String(texto||'').replace(/\u0000/g,'').trim();
  if(!texto)throw Error('Não encontrei texto legível. Se for um documento escaneado, envie a versão com texto ou registre o conteúdo no campo antes de confirmar. Nenhuma etapa foi concluída.');
  if(texto.length>60000)throw Error('O documento tem mais de 60 mil caracteres. Divida em documentos menores; não cortamos o conteúdo.');
  return {nome:String(file.name).slice(0,180),tipo,bytes:bytes.length,sha256:await digesto(bytes),texto,paginas,buffer:bytes};
}
export function criarArquivosPlanejamento(io,contexto){
  const {db,doc,getDocFromServer,writeBatch,serverTimestamp}=io;
  function ctx(){const c={...contexto()};if(!c.uid||!['Chris','Amanda','Fernanda'].includes(c.nome))throw Error('Entre no seu perfil para enviar documentos.');return c;}
  function conferir(c){const n=ctx();if(n.uid!==c.uid||n.nome!==c.nome||n.sessao!==c.sessao||n.atorReal!==c.atorReal)throw Error('O perfil mudou. Reabra o documento; nada foi confirmado para o novo perfil.');}
  const ref=(ciclo,id)=>doc(db,'planejamento_social_i155',ciclo,'arquivos',id);
  async function enviar(ciclo,preparado){
    const c=ctx();if(!/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(ciclo))throw Error('Cliente ou mês inválido.');
    if(!preparado?.buffer||preparado.bytes>LIMITE_ARQUIVO||await digesto(preparado.buffer)!==preparado.sha256)throw Error('O arquivo mudou antes do envio. Selecione novamente.');
    const id='arq_'+preparado.sha256,alvo=ref(ciclo,id),anterior=await getDocFromServer(alvo);conferir(c);
    if(anterior.exists()){
      const v=anterior.data();if(v.sha256!==preparado.sha256||v.bytes!==preparado.bytes||v.texto!==preparado.texto||v.estado!=='completo')throw Error('O recibo do arquivo não corresponde ao conteúdo.');
      return {id,nome:v.nome,sha256:v.sha256,bytes:v.bytes,tipo:v.tipo,texto:v.texto};
    }
    const quantidade=Math.ceil(preparado.bytes/TAMANHO_PARTE),batch=writeBatch(db);
    for(let n=0;n<quantidade;n++)batch.set(doc(db,'planejamento_social_i155',ciclo,'arquivos',id,'partes',String(n)),{indice:n,dados:base64(preparado.buffer.subarray(n*TAMANHO_PARTE,(n+1)*TAMANHO_PARTE)),arquivo:id,ciclo,autorUid:c.uid});
    batch.set(alvo,{schema:1,nome:preparado.nome,tipo:preparado.tipo,bytes:preparado.bytes,sha256:preparado.sha256,texto:preparado.texto,paginas:preparado.paginas,partes:quantidade,ciclo,estado:'completo',autorUid:c.uid,autorNome:c.atorReal||c.nome,perfil:c.nome,criadoEm:serverTimestamp()});
    conferir(c);let erro;try{await batch.commit();}catch(e){erro=e;}
    const receipt=await getDocFromServer(alvo);conferir(c);
    if(!receipt.exists()||receipt.data().sha256!==preparado.sha256||receipt.data().estado!=='completo')throw erro||Error('Não consegui confirmar o arquivo. Mantenha-o selecionado e tente novamente.');
    return {id,nome:preparado.nome,sha256:preparado.sha256,bytes:preparado.bytes,tipo:preparado.tipo,texto:preparado.texto};
  }
  async function ler(ciclo,id){
    const c=ctx(),s=await getDocFromServer(ref(ciclo,id));conferir(c);if(!s.exists())throw Error('Arquivo não encontrado.');const m=s.data();
    if(m.estado!=='completo'||m.ciclo!==ciclo||m.bytes>LIMITE_ARQUIVO||m.partes!==Math.ceil(m.bytes/TAMANHO_PARTE))throw Error('O arquivo está incompleto.');
    const out=new Uint8Array(m.bytes);let offset=0;
    for(let n=0;n<m.partes;n++){const parte=await getDocFromServer(doc(db,'planejamento_social_i155',ciclo,'arquivos',id,'partes',String(n)));conferir(c);if(!parte.exists()||parte.data().indice!==n||parte.data().arquivo!==id)throw Error('Falta uma parte do arquivo; não será aberto como completo.');const b=binario(parte.data().dados);if(offset+b.length>out.length)throw Error('Tamanho do arquivo inconsistente.');out.set(b,offset);offset+=b.length;}
    if(offset!==m.bytes||await digesto(out)!==m.sha256)throw Error('A conferência do arquivo falhou. O original foi preservado.');
    return {...m,id,buffer:out};
  }
  return {enviar,ler};
}
