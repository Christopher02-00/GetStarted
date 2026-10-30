/* I148: identidade da revisão editorial. Não grava nem decide a publicação. */
const campos = ['itemId','day','name','desc','roteiroDispensado','legenda','ref','referenciaDispensada','obs','preparacaoGravacao','obsFilmmaker','obsCliente','fmt','stage','dataFlexivel','dataPostagem','bloco','empresaOtavio'];
function ordenar(v){return Array.isArray(v)?v.map(ordenar):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar(v[k])])):v;}
export function editorialI148(itens,blocos=null){
  return JSON.stringify(ordenar({itens:(itens||[]).filter(i=>i&&i.excluido!==true).map(i=>Object.fromEntries(campos.filter(k=>i[k]!==undefined).map(k=>[k,i[k]]))),blocos}));
}
export function revisaoI148(slug,mes,cal,itens,estado){
  if(!slug||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(mes)||!Array.isArray(itens)||!itens.some(i=>i&&!i.excluido))throw Error('Não há uma revisão mensal confirmada.');
  const marca=cal.aprovacaoMeses?.[mes]||cal.aprovacaoInterna||{};
  return {slug,mes,estado,envio:JSON.stringify([marca.por||'',marca.em||'']),editorial:editorialI148(itens,cal.blocosPorMes?.[mes]||null)};
}
export function exigirRevisaoI148(vista,atual){
  if(!vista||!atual||!['aguardando_interna','aprovado_interno'].includes(atual.estado)||['slug','mes','estado','envio','editorial'].some(k=>vista[k]!==atual[k]))throw Error('O calendário mudou depois que você abriu a revisão. Seu comentário continua aqui. Feche e abra a análise para conferir a nova versão antes de decidir.');
  return true;
}
export function reciboPublicacaoI148(cal,mes,vista,instante){
  const marca=cal?.aprovacaoMeses?.[mes]||cal?.aprovacaoInterna||{};
  const retrato=marca.retratoLiberadoV115;
  return !!vista&&marca.status==='liberado'&&marca.aprovadoEm===instante&&retrato?.mes===mes&&editorialI148(retrato.items,cal.blocosPorMes?.[mes]||null)===vista.editorial;
}
export function novosAvisosI148(linhas,vistos){const anteriores=new Set(Array.isArray(vistos)?vistos:[]);return linhas.filter(x=>!anteriores.has(x.chave));}
