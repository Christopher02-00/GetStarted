/* Extrações literais publicadas V125/V115, sem DOM. */
import {mesDoItemCalendario as mesDoItemNoCalendario} from './lib/guardas-stokki-i165.mjs';
const itensDoMesCalendario=(cal,mes)=>(cal.items||[]).filter(i=>i&&mesDoItemNoCalendario(cal,i)===mes);
const CAMPOS_EDITORIAIS_CAL_V125=[
  'empresaOtavio','day','name','desc','roteiroDispensado','legenda','legendaInstagram','legendaTiktok','legendaYoutube','legendaLinkedin','ref','referenciaDispensada','obs','mes','stage','fmt',
  'dataFlexivel','bloco','dataPostagem','legendaAtualizadaPor',
  'legendaAtualizadaEm','apr','aprPor','aprEm','aprovadoPeloClienteEm',
  'excluido','excluidoPor','excluidoEm','revisaoPendenteI68','aprovacoesAnterioresI68','pedidoRevisadoI68'
];


function clonarCalendarioV125(valor){
  if(valor===undefined) return undefined;
  return JSON.parse(JSON.stringify(valor));
}
function iguaisCalendarioV125(a,b){ return JSON.stringify(a)===JSON.stringify(b); }
function identidadeItemCalendarioV125(item){ return String(item&&item.itemId||'').trim(); }
function itensDaCompetenciaV125(cal,competencia){
  return ((cal&&cal.items)||[]).filter(item=>item&&mesDoItemNoCalendario(cal,item)===competencia);
}
function projecaoEditorialItemV125(item){
  const saida={itemId:identidadeItemCalendarioV125(item)};
  CAMPOS_EDITORIAIS_CAL_V125.forEach(campo=>{ if(item&&item[campo]!==undefined) saida[campo]=campo==='aprovacoesAnterioresI68'&&Array.isArray(item[campo])?item[campo].map(x=>Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)))):item[campo]; });
  return saida;
}
function assinaturaConteudoCompetenciaV125(cal,competencia){
  if(!cal||!competencia) return '';
  const itens=itensDaCompetenciaV125(cal,competencia).map(projecaoEditorialItemV125)
    .sort((a,b)=>String(a.itemId).localeCompare(String(b.itemId)));
  return JSON.stringify({competencia,itens,blocos:clonarCalendarioV125((cal.blocosPorMes||{})[competencia]||null)});
}
function indiceItensPorIdV125(cal){
  const mapa=new Map(),duplicados=[],semId=[];
  ((cal&&cal.items)||[]).forEach((item,indice)=>{
    const id=identidadeItemCalendarioV125(item);
    if(!id){ semId.push({item,indice}); return; }
    if(mapa.has(id)) duplicados.push(id); else mapa.set(id,{item,indice});
  });
  return {mapa,duplicados:[...new Set(duplicados)],semId};
}
function camposAlteradosV125(base,versao){
  return CAMPOS_EDITORIAIS_CAL_V125.filter(campo=>!iguaisCalendarioV125(base&&base[campo],versao&&versao[campo]));
}
function mesclarCompetenciaCalendarioV125(base,local,servidor,competencia,preferencia){
  const b=base||servidor||{},l=local||{},s=servidor||{};
  const ib=indiceItensPorIdV125(b),il=indiceItensPorIdV125(l),is=indiceItensPorIdV125(s);
  const conflitos=[];
  [ ['base',ib],['aba',il],['banco',is] ].forEach(([origem,indice])=>{
    indice.duplicados.forEach(itemId=>conflitos.push({tipo:'itemId-duplicado',origem,itemId}));
  });
  const legadoRelevante=[...ib.semId.map(x=>({origem:'base',...x})),...il.semId.map(x=>({origem:'aba',...x})),...is.semId.map(x=>({origem:'banco',...x}))]
    .filter(x=>mesDoItemNoCalendario(x.origem==='base'?b:x.origem==='aba'?l:s,x.item)===competencia);
  legadoRelevante.forEach(x=>conflitos.push({tipo:'item-sem-itemId',origem:x.origem,indice:x.indice}));
  if(conflitos.length) return {ok:false,conflitos,competencia};

  const ids=new Set();
  [ib,il,is].forEach(indice=>indice.mapa.forEach(({item},id)=>{
    const esteveNaBase=ib.mapa.has(id)&&mesDoItemNoCalendario(b,ib.mapa.get(id).item)===competencia;
    if(esteveNaBase||mesDoItemNoCalendario(indice===ib?b:indice===il?l:s,item)===competencia) ids.add(id);
  }));
  const substituicoes=new Map();
  const novosLocais=[];
  ids.forEach(itemId=>{
    const baseItem=ib.mapa.get(itemId)?.item;
    const localItem=il.mapa.get(itemId)?.item;
    const serverItem=is.mapa.get(itemId)?.item;
    if(!baseItem){
      if(localItem&&!serverItem){ novosLocais.push(clonarCalendarioV125(localItem)); return; }
      if(!localItem&&serverItem) return;
      if(localItem&&serverItem){
        if(iguaisCalendarioV125(projecaoEditorialItemV125(localItem),projecaoEditorialItemV125(serverItem))) return;
        conflitos.push({tipo:'item-novo-concorrente',itemId}); return;
      }
      return;
    }
    if(!serverItem){ conflitos.push({tipo:'item-removido-do-banco',itemId}); return; }
    const localEfetivo=localItem||baseItem;
    const localMudou=camposAlteradosV125(baseItem,localEfetivo);
    const bancoMudou=camposAlteradosV125(baseItem,serverItem);
    const exclusaoLocal=localMudou.includes('excluido');
    const exclusaoBanco=bancoMudou.includes('excluido');
    if((exclusaoLocal&&bancoMudou.some(c=>c!=='excluido'))||(exclusaoBanco&&localMudou.some(c=>c!=='excluido'))){
      conflitos.push({tipo:'exclusao-concorrente',itemId}); return;
    }
    const combinado=clonarCalendarioV125(serverItem);
    CAMPOS_EDITORIAIS_CAL_V125.forEach(campo=>{
      const bv=baseItem[campo],lv=localEfetivo[campo],sv=serverItem[campo];
      if(iguaisCalendarioV125(lv,sv)) return;
      if(iguaisCalendarioV125(lv,bv)) return;
      if(iguaisCalendarioV125(sv,bv)||preferencia==='aba'){
        if(lv===undefined) delete combinado[campo]; else combinado[campo]=clonarCalendarioV125(lv);
        return;
      }
      if(preferencia==='banco') return;
      conflitos.push({tipo:'campo-concorrente',itemId,campo,base:clonarCalendarioV125(bv),aba:clonarCalendarioV125(lv),banco:clonarCalendarioV125(sv)});
    });
    substituicoes.set(itemId,combinado);
  });
  if(conflitos.length) return {ok:false,conflitos,competencia};
  const itens=((s&&s.items)||[]).map(item=>substituicoes.get(identidadeItemCalendarioV125(item))||clonarCalendarioV125(item));
  novosLocais.forEach(item=>{ if(!itens.some(atual=>identidadeItemCalendarioV125(atual)===identidadeItemCalendarioV125(item))) itens.push(item); });
  const blocosServidor=clonarCalendarioV125((s.blocosPorMes||{})[competencia]);
  const blocosBase=clonarCalendarioV125((b.blocosPorMes||{})[competencia]);
  const blocosLocal=clonarCalendarioV125((l.blocosPorMes||{})[competencia]);
  let blocos=blocosServidor;
  if(!iguaisCalendarioV125(blocosLocal,blocosBase)){
    if(iguaisCalendarioV125(blocosServidor,blocosBase)||iguaisCalendarioV125(blocosLocal,blocosServidor)||preferencia==='aba') blocos=blocosLocal;
    else if(preferencia!=='banco') return {ok:false,competencia,conflitos:[{tipo:'blocos-concorrentes',campo:'blocosPorMes'}]};
  }
  const documento={...clonarCalendarioV125(s),items:itens};
  documento.blocosPorMes={...(clonarCalendarioV125(s.blocosPorMes)||{})};
  if(blocos===undefined) delete documento.blocosPorMes[competencia]; else documento.blocosPorMes[competencia]=blocos;
  /* Workflow é do servidor. A única exceção editorial é o nascimento
     explícito de uma competência nova ainda inexistente como rascunho. */
  documento.aprovacaoMeses={...(clonarCalendarioV125(s.aprovacaoMeses)||{})};
  const aprovacaoBase=clonarCalendarioV125((b.aprovacaoMeses||{})[competencia]);
  const aprovacaoLocal=clonarCalendarioV125((l.aprovacaoMeses||{})[competencia]);
  const aprovacaoServidor=clonarCalendarioV125((s.aprovacaoMeses||{})[competencia]);
  if(!aprovacaoServidor&&!aprovacaoBase&&aprovacaoLocal&&aprovacaoLocal.status==='rascunho'){
    documento.aprovacaoMeses[competencia]=aprovacaoLocal;
  }
  return {ok:true,competencia,documento,itens,blocos};
}

  function itemRetratoLiberadoV115(item,mes){
    const campos=['empresaOtavio','itemId','day','name','desc','roteiroDispensado','legenda','legendaInstagram','legendaTiktok','legendaYoutube','legendaLinkedin','ref','referenciaDispensada','obs','obsFilmmaker','obsCliente','stage','fmt','apr','posted','agendado','gravado','dataFlexivel','dataPostagem','bloco'];
    const retrato={mes:String(item?.mes||mes||'')};
    campos.forEach(campo=>{if(item&&item[campo]!==undefined) retrato[campo]=JSON.parse(JSON.stringify(item[campo]));});
    return retrato;
  }
  function criarRetratoLiberadoV115(calendario,alvo,pessoa,agora){
    const itens=itensDoMesCalendario(calendario||{},alvo).filter(i=>i&&!i.excluido)
      .map(i=>itemRetratoLiberadoV115(i,alvo));
    return {schemaVersion:1,mes:alvo,publicadoPor:String(pessoa||'Amanda'),
      publicadoEm:String(agora||new Date().toISOString()),items:itens};
  }


  function mapaAprovacaoAposPublicar(mapaAtual, alvo, pessoa, agora, mesesAtivosAntes,retratoLiberadoV115){
    const mapa={...(mapaAtual||{})};
    const operador=String(pessoa||'Amanda');
    const instante=String(agora||new Date().toISOString());
    mapa[alvo]={...(mapa[alvo]||{}),status:'liberado',mes:alvo,por:operador,
      aprovadoPor:operador,aprovadoEm:instante,enviadoPor:operador,enviadoEm:instante,
      em:instante,motivoAjuste:'',arquivadoPor:'',arquivadoEm:'',substituidoPor:'',
      reabertoAte:'',reabertoPor:'',reabertoEm:'',arquivamentoManual:false,
      retratoLiberadoV115:retratoLiberadoV115||mapa[alvo]?.retratoLiberadoV115||null};
    return mapa;
  }



export {mesclarCompetenciaCalendarioV125,assinaturaConteudoCompetenciaV125,criarRetratoLiberadoV115,mapaAprovacaoAposPublicar};
