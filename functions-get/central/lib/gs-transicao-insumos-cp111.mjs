/* Projeção pura I155. Registros antigos continuam história; validade não é inferida do texto. */
export const ACOES_CORRECAO_I155_CP111=Object.freeze(['desconsiderar_confirmacao','registrar_insumos_transicao']);
export const SITUACOES_REUNIAO_CP111=Object.freeze(['normal','nao_houve','anterior_sem_previa']);
const docs=c=>c?.documentos||{};
const iguais=(a,b)=>JSON.stringify(Object.entries(a||{}).sort())===JSON.stringify(Object.entries(b||{}).sort());
export function desconsideracaoI155Cp111(c,id){return id?docs(c).desconsideracoesCp111?.[id]||null:null;}
export function documentoEfetivoI155Cp111(c,tipo){const id=docs(c)[tipo]||'';return id&&!desconsideracaoI155Cp111(c,id)?id:'';}
export function materiaisEfetivosI155Cp111(c){return Object.fromEntries(Object.entries(docs(c).materiais||{}).filter(([,id])=>id&&!desconsideracaoI155Cp111(c,id)));}
export function situacaoReuniaoI155Cp111(c){
 const d=docs(c),id=documentoEfetivoI155Cp111(c,'reuniao'),f=d.reuniaoSituacaoCp111;
 if(!id)return {id:'',situacao:'pendente',factual:false};
 if(f?.id===id&&['nao_houve','anterior_sem_previa'].includes(f.situacao)&&f.motivo)return {id,situacao:f.situacao,factual:true,motivo:f.motivo};
 return {id,situacao:'normal',factual:false};
}
/* CP124: the documentary branch starts only with an explicit, versioned confirmation. */
export function fontePesquisaDocumentalCp124(c){
 const d=docs(c),pacote=d.entregaReferenciasCp124;if(!pacote||pacote.schema!==1||pacote.ciclo!==c?.competencia+'__'+c?.cliente||pacote.cliente!==c?.cliente||pacote.competencia!==c?.competencia)return null;
 const fontes=pacote.fontes||{[pacote.chaveMaterial]:pacote},validas=[];
 for(const [k,r]of Object.entries(fontes)){const cf=d.confirmacoes?.[k],empresa=String(r?.empresaOtavio||'');if(!r||r.schema!==1||r.ciclo!==pacote.ciclo||r.cliente!==c.cliente||r.competencia!==c.competencia||r.chaveMaterial!==k||k!=='referencias__'+(empresa||'geral')||empresa&&(c.cliente!=='zeiss'||!['otica_hauer','otica_sao_jose','clinica_olhos_hauer','clinica_sao_jose'].includes(empresa))||!/^[A-Za-z0-9_.-]{1,180}$/.test(r.documentoId||'')||!Number.isInteger(r.versao)||r.versao<1||!/^[a-f0-9]{64}$/.test(r.hashTexto||'')||!r.autorUid||!r.autorNome||!['Gabrielle','Chris','Amanda'].includes(r.perfil)||!r.confirmadoUid||!r.confirmadoPor||!r.confirmadoEm||!r.operacao||d.materiais?.[k]!==r.documentoId||cf?.id!==r.documentoId||cf.por!==r.confirmadoPor||cf.em!==r.confirmadoEm||!['Gabrielle','Chris'].includes(cf.perfil)||desconsideracaoI155Cp111(c,r.documentoId))continue;validas.push({chaveMaterial:k,documentoId:r.documentoId,versao:r.versao,hashTexto:r.hashTexto,autorUid:r.autorUid,autorNome:r.autorNome,perfil:r.perfil,empresaOtavio:empresa});}
 if(!validas.length)return null;validas.sort((a,b)=>a.chaveMaterial.localeCompare(b.chaveMaterial));const atual=validas.find(x=>x.documentoId===pacote.documentoId)||validas[0];return {tipo:'documento',ciclo:pacote.ciclo,...atual,fontes:validas};
}
export function fontePesquisaCp124(c){if(Object.hasOwn(docs(c),'entregaReferenciasCp124'))return fontePesquisaDocumentalCp124(c);return c?.lote&&docs(c).insumosTransicaoCp111?.ativa!==true?{tipo:'lote',versao:c.lote.versao}:null;}
export function mesmaFontePesquisaCp124(a,b){const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;return !!a&&!!b&&JSON.stringify(canon(a))===JSON.stringify(canon(b));}
export function estadoEtapasI155Cp111(c){
 const d=docs(c),fontePesquisa=fontePesquisaCp124(c),pesquisa=!!fontePesquisa;
 const previaId=documentoEfetivoI155Cp111(c,'previa'),reuniaoId=documentoEfetivoI155Cp111(c,'reuniao'),consolidadoId=documentoEfetivoI155Cp111(c,'consolidado'),enviado=documentoEfetivoI155Cp111(c,'consolidadoEnviado');
 const previa=pesquisa&&!!previaId&&(fontePesquisa.tipo==='documento'?mesmaFontePesquisaCp124(d.previaFontePesquisaCp124,fontePesquisa):!d.previaFontePesquisaCp124&&d.previaLote===c.lote.versao),r=situacaoReuniaoI155Cp111(c);
 const reuniao=!!reuniaoId&&(r.factual||previa&&d.reuniaoBasePrevia===previaId);
 const consolidado=reuniao&&!!enviado&&enviado===consolidadoId&&d.enviadoReuniao===reuniaoId&&d.enviadoCampanha===documentoEfetivoI155Cp111(c,'campanha')&&iguais(d.enviadoMateriais,materiaisEfetivosI155Cp111(c));
 const criacao=consolidado&&!!c.criacao?.enviadoRevisao&&c.criacao.base===enviado,revisao=criacao&&!!c.publicacaoAtual&&c.publicacaoAtual.base===enviado;
 return {pesquisa,previa,reuniao,consolidado,criacao,revisao,disponivel:revisao};
}
export function validadeBaseI155Cp111(c){
 const d=docs(c),baseId=d.consolidadoEnviado||'',e=estadoEtapasI155Cp111(c),motivos=[];
 if(!baseId)return {estado:'ausente',valida:false,baseId:'',motivos:['Ainda não há consolidado enviado.']};
 if(desconsideracaoI155Cp111(c,baseId))motivos.push('A confirmação deste envio foi desconsiderada.');
 if(!e.reuniao)motivos.push('O registro efetivo de reunião ou de ausência precisa ser conferido.');
 if(documentoEfetivoI155Cp111(c,'consolidado')!==baseId)motivos.push('O consolidado atual não corresponde a este envio.');
 if(d.enviadoReuniao!==documentoEfetivoI155Cp111(c,'reuniao'))motivos.push('O registro de reunião mudou.');
 if(d.enviadoCampanha!==documentoEfetivoI155Cp111(c,'campanha'))motivos.push('A campanha mudou.');
 if(!iguais(d.enviadoMateriais,materiaisEfetivosI155Cp111(c)))motivos.push('Há materiais atuais diferentes dos materiais deste envio.');
 if(!e.consolidado&&!motivos.length)motivos.push('Esta base não está válida para a criação atual.');
 return {estado:e.consolidado?'vigente':'historico_invalido',valida:e.consolidado,baseId,motivos};
}
export function assinaturaTriagemI155Cp111(r){return JSON.stringify(['fonte','link','ideia','motivo','adaptacao','filtro'].map(k=>r?.[k]||''));}
export function estadoTriagemI155Cp111(r){return r?.estadoTriagemCp111==='analisada'&&r.triagemCp111?.estado==='analisada'&&r.triagemCp111.autorUid&&r.triagemCp111.assinatura===assinaturaTriagemI155Cp111(r)?'analisada':'pendente';}
export function conferenciaI155Cp111(c,id){
 const revogada=desconsideracaoI155Cp111(c,id);
 return revogada?{estado:'desconsiderada',valida:false,motivo:revogada.motivo,por:revogada.por,perfil:revogada.perfil,em:revogada.em}:{estado:'registrada',valida:true};
}

export function assinaturaPedidoCorrecaoI155Cp111(v){const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;return JSON.stringify(canon(v));}
