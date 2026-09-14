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
    return retrato.map(it=>{
      const id=String(it.itemId||'').trim();
      const encontrados=id?atuais.filter(a=>String(a.itemId||'').trim()===id):atuais.filter(a=>(!a.itemId&&!mudou(it,a))||a.origemLegadaI68===assinatura(it));
      if(encontrados.length!==1)return {...it};
      const a=encontrados[0],t=a.textosPublicadosClienteI68;
      const copia=t&&String(t.em||'')>String(publicadoEm)&&typeof t.desc==='string'&&typeof t.legenda==='string'?{...it,desc:t.desc,legenda:t.legenda,roteiroDispensado:!!t.roteiroDispensado}:{...it};
      if(mudou(copia,a))return copia;
      for(const k of marcas){if(a[k]===undefined)delete copia[k];else copia[k]=a[k];}
      return copia;
    });
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
