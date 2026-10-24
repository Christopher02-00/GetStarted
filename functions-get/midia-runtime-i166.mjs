import {getStorage} from 'firebase-admin/storage';
import {programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {identidadeTokenI165,validarCadastroI165,clienteTxI165} from './contexto.mjs';
import {assinaturaEditorialUploadPostI166} from './upload-post-pacote.mjs';
import {legendaUtilizavelI79} from './lib/gs-legenda-qualidade-i79.mjs';
import {operarMidiaI166} from './midia-servico-i166.mjs';

const ORIGENS=Object.freeze(['https://get-started.agency','https://www.get-started.agency']);
export function dependenciasRuntimeMidiaI166(db,{storage=getStorage(),config=null,originBrowser=process.env.GET_I166_MIDIA_ORIGIN||ORIGENS[0]}={}){
 if(!ORIGENS.includes(originBrowser))throw Object.assign(Error('A origem desta prévia não está configurada.'),{code:'midia/origem_config'});
 if(!config&&process.env.GET_I166_MIDIA_ENABLED!=='true')throw Object.assign(Error('O armazenamento de arquivos ainda precisa ser habilitado no servidor.'),{code:'midia/inativo'});
 const settings=config||{bucket:process.env.GET_I166_MIDIA_BUCKET,prefix:process.env.GET_I166_MIDIA_PREFIX||'midias-i166',maxBytes:128*1024*1024,mimeTypes:['video/mp4','video/quicktime'],maxThumbOffsetMs:600000,hashTimeoutMs:60000,previewTtlSeconds:180,originBrowser};
 return {db,storage,config:{...settings,originBrowser},identidadeToken:identidadeTokenI165,validarCadastro:validarCadastroI165,clienteTx:clienteTxI165,assinaturaEditorial:assinaturaEditorialUploadPostI166,legendaUtilizavel:legendaUtilizavelI79,programacaoAtiva:programacaoAtivaI165};
}
export function operarMidiaRuntimeI166(db,auth,dados,{agora=new Date(),midia={}}={}){
 return operarMidiaI166(dependenciasRuntimeMidiaI166(db,midia),auth,dados,{agora});
}
