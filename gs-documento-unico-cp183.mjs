/* Versioned authority over ONE existing I155 document. No editorial text generation. */
export const MODO_DOCUMENTO_UNICO_CP183='documento_unico_cp183';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,180}$/.test(v),sha=v=>/^[a-f0-9]{64}$/.test(v||'');
const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;
export const retratoBaseUnicaCp183=m=>JSON.stringify(canon([1,m.ciclo,m.documentoId,m.versao,m.hashTexto,m.arquivoId,m.hashArquivo,m.bytes,m.mime,m.empresaOtavio,m.infoCliente]));
export const criacaoUsaBaseUnicaCp183=c=>!temDocumentoUnicoCp183(c)||!!fonteDocumentoUnicoCp183(c)&&c.criacao?.fonteBaseCp183===c.documentos.baseDocumentoUnicoCp183.assinaturaBase;
export const temDocumentoUnicoCp183=c=>Object.hasOwn(c?.documentos||{},'baseDocumentoUnicoCp183');
export function fonteDocumentoUnicoCp183(c){
 const d=c?.documentos,m=d?.baseDocumentoUnicoCp183,k='campanha__'+(m?.empresaOtavio||'geral'),f=d?.confirmacoes?.[k];
 if(!m||m.schema!==1||m.modo!==MODO_DOCUMENTO_UNICO_CP183||m.ciclo!==c.competencia+'__'+c.cliente||m.cliente!==c.cliente||m.competencia!==c.competencia||!id(m.documentoId)||!Number.isSafeInteger(m.versao)||m.versao<1||!sha(m.hashTexto)||!sha(m.assinaturaBase)||!m.infoCliente||typeof m.infoCliente!=='object'||!/^arq_[a-f0-9]{64}$/.test(m.arquivoId||'')||m.arquivoId!=='arq_'+m.hashArquivo||!Number.isSafeInteger(m.bytes)||m.bytes<1||m.bytes>4194304||typeof m.mime!=='string'||!m.autorUid||!m.autorNome||!m.confirmadoUid||!m.confirmadoPor||!m.confirmadoEm||!m.operacao||!['Chris','Amanda'].includes(m.perfilAdocao)||!m.adotadoUid||!m.adotadoPor||d.materiais?.[k]!==m.documentoId||d.consolidadoEnviado!==m.documentoId||d.consolidado!==m.documentoId||d.desconsideracoesCp111?.[m.documentoId]||f?.id!==m.documentoId||f.por!==m.confirmadoPor||f.perfil!==m.perfilConfirmacao||f.em!==m.confirmadoEm||!['Chris','Amanda'].includes(f.perfil))return null;
 if(m.empresaOtavio&&(c.cliente!=='zeiss'||!['otica_hauer','otica_sao_jose','clinica_olhos_hauer','clinica_sao_jose'].includes(m.empresaOtavio)))return null;
 return {...m};
}
export function documentoCorrespondeFonteUnicaCp183(c,r,{hashTexto}={}){
 const m=fonteDocumentoUnicoCp183(c);return !!m&&!!r&&r.id===m.documentoId&&r.tipo==='documento'&&r.finalidade==='campanha'&&r.cliente===c.cliente&&r.competencia===c.competencia&&(r.empresaOtavio||'')===(m.empresaOtavio||'')&&r.versao===m.versao&&r.arquivoId===m.arquivoId&&r.arquivo?.sha256===m.hashArquivo&&r.arquivo?.bytes===m.bytes&&r.arquivo?.tipo===m.mime&&r.autorUid===m.autorUid&&r.autorNome===m.autorNome&&(!hashTexto||hashTexto===m.hashTexto);
}
export function estadoDocumentoUnicoCp183(c){
 const f=fonteDocumentoUnicoCp183(c),consolidado=!!f,criacao=consolidado&&criacaoUsaBaseUnicaCp183(c)&&c.criacao?.base===f.documentoId&&c.criacao.enviadoRevisao===true,revisao=criacao&&c.publicacaoAtual?.base===f.documentoId;
 return {pesquisa:false,previa:false,reuniao:false,consolidado,criacao:!!criacao,revisao:!!revisao,disponivel:!!revisao,documentoUnico:consolidado,etapasAnterioresNaoExigidas:true};
}
