/* I68: revisão do conteúdo; não modifica agenda, produção ou permissões. */
(function (root) {
  'use strict';
  const campos = ['name','desc','legenda','ref','obs','day','mes','stage','fmt',
    'roteiroDispensado','referenciaDispensada','dataFlexivel','bloco','dataPostagem'];
  const marcas = ['apr','aprPor','aprEm','aprovadoPeloClienteEm','revisaoPendenteI68',
    'aprovacoesAnterioresI68','pedidoRevisadoI68'];
  const booleanos = new Set(['roteiroDispensado','referenciaDispensada','dataFlexivel']);
  const valor = (it,k) => booleanos.has(k) ? !!it?.[k] : String(it?.[k] ?? '');
  const assinatura = it => JSON.stringify(campos.map(k=>valor(it,k)));
  const mudou = (a,b) => campos.some(k => valor(a,k) !== valor(b,k));
  function revisar(antes, depois, {por='Equipe',em,forcar=false,pedido=''}={}) {
    if ((!forcar&&!mudou(antes,depois)) || depois.excluido || depois.posted || depois.agendado) return {...depois};
    const item={...depois};
    if(antes.apr) {
      if(antes.aprovacoesAnterioresI68!=null&&!Array.isArray(antes.aprovacoesAnterioresI68))throw Error('O histórico deste conteúdo precisa ser conferido antes da alteração.');
      item.aprovacoesAnterioresI68=[...(antes.aprovacoesAnterioresI68||[]),{
        aprPor:String(antes.aprPor||''),aprEm:String(antes.aprEm||antes.aprovadoPeloClienteEm||''),
        substituidaEm:em,substituidaPor:por
      }];
    }
    item.apr=false;item.aprPor='';item.aprEm='';item.aprovadoPeloClienteEm='';
    item.revisaoPendenteI68=true;
    if(pedido)item.pedidoRevisadoI68=pedido;
    return item;
  }
  function aprovacaoNoRetrato(retrato, atuais, publicadoEm='') {
    // O retrato protege o texto editorial. Fatos de produção continuam atuais.
    const porId=new Map();
    atuais.forEach(a=>{const id=String(a?.itemId||'').trim();if(id)porId.set(id,[...(porId.get(id)||[]),a]);});
    const presentes=new Set(retrato.map(it=>String(it?.itemId||'').trim()).filter(Boolean));
    const resultado=retrato.map(it=>{
      const id=String(it.itemId||'').trim();
      const encontrados=id?atuais.filter(a=>String(a.itemId||'').trim()===id):atuais.filter(a=>(!a.itemId&&!mudou(it,a))||a.origemLegadaI68===assinatura(it));
      if(encontrados.length!==1)return {...it};
      const a=encontrados[0],t=a.textosPublicadosClienteI68;
      const copia=t&&String(t.em||'')>String(publicadoEm)&&typeof t.desc==='string'&&typeof t.legenda==='string'?{...it,desc:t.desc,legenda:t.legenda,roteiroDispensado:!!t.roteiroDispensado}:{...it};
      if(!mudou(copia,a))for(const k of marcas){if(a[k]===undefined)delete copia[k];else copia[k]=a[k];}
      if(!a.excluido){
        for(const k of ['posted','agendado','gravado'])if(a[k]!==undefined)copia[k]=a[k];
        // A data editorial só acompanha uma postagem já programada/publicada.
        if((a.posted===true||a.agendado===true)&&/^\d{4}-\d{2}-\d{2}$/.test(String(a.dataPostagem||''))){
          copia.dataPostagem=a.dataPostagem;
          if(Number.isInteger(Number(a.day))&&Number(a.day)>=1&&Number(a.day)<=31)copia.day=a.day;
        }
      }
      return copia;
    });
    // Conteúdo criado pela postagem após a liberação já é público. Um novo
    // rascunho ou apenas gravado continua fora até a Amanda liberar.
    atuais.forEach(a=>{
      const id=String(a?.itemId||'').trim();
      if(id&&!presentes.has(id)&&porId.get(id)?.length===1&&!a.excluido&&(a.posted===true||a.agendado===true)){
        resultado.push({...a});presentes.add(id);
      }
    });
    return resultado;
  }
  function prepararReenvio(cal,mes,em,mesDoItem=(c,it)=>it.mes||c.mesLegado) {
    const p=cal.pedidoAjusteCliente;
    if(!p?.operationId || p.competencia!==mes)return cal;
    const alvos=(cal.items||[]).map((item,indice)=>({item,indice})).filter(({item,indice})=>
      item&&mesDoItem(cal,item)===mes&&
      (p.itemId?String(item.itemId||'')===p.itemId:indice===p.itemIdx&&String(item.name||'')===p.itemNome));
    if(alvos.length!==1)throw Error('O conteúdo do pedido de ajuste precisa ser identificado antes do reenvio.');
    const {item,indice}=alvos[0];
    if(item.excluido||item.pedidoRevisadoI68===p.operationId)return cal;
    const items=cal.items.slice();
    items[indice]=revisar(item,item,{por:'Equipe',em,forcar:true,pedido:p.operationId});
    return {...cal,items};
  }
  root.GetAprovacaoI68=Object.freeze({campos,marcas,assinatura,mudou,revisar,aprovacaoNoRetrato,prepararReenvio});
})(typeof window==='undefined'?globalThis:window);
