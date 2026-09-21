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
  // I71: o mês coordena o trabalho interno; cada pedido conserva seu alvo.
  function pedidosPendentes(cal,mes) {
    const marca=cal?.aprovacaoMeses?.[mes]||{};
    if(!['ajuste_interno','aguardando_interna','aprovado_interno'].includes(marca.status))return [];
    const publicado=String(marca.retratoLiberadoV115?.publicadoEm||marca.liberadoEmAnterior||'');
    const todos={...(cal.pedidosAjusteClienteI71||{})},anterior=cal.pedidoAjusteCliente;
    if(anterior?.operationId&&!todos[anterior.operationId])todos[anterior.operationId]=anterior;
    return Object.values(todos).filter(p=>p?.operationId&&p.competencia===mes&&
      (!publicado||String(p.criadoEm||'')>publicado)).sort((a,b)=>String(a.criadoEm).localeCompare(String(b.criadoEm)));
  }
  function pedidoDoItem(cal,mes,item) {
    return pedidosPendentes(cal,mes).filter(p=>{
      if(Object.prototype.hasOwnProperty.call(item||{},'__pedidoAjusteI71'))return item.__pedidoAjusteI71===p.operationId;
      if(p.itemId)return String(item?.itemId||'')===p.itemId;
      const itens=cal?.items||[],alvo=itens[p.itemIdx];
      if(alvo===item&&String(alvo?.name||'')===p.itemNome)return true;
      // Legado: nome repetido não identifica dois conteúdos como um só.
      // O retrato mantém o roteiro anterior enquanto a equipe o corrige.
      const retrato=cal?.aprovacaoMeses?.[mes]?.retratoLiberadoV115?.items||[];
      const candidatos=itens.filter(i=>String(i?.name||'')===p.itemNome&&(i.mes||cal.mesLegado)===mes);
      if(candidatos.length===1){
        const unico=candidatos[0];
        return item===unico||(!item?.itemId&&String(item?.name||'')===p.itemNome)||
          (!!unico.itemId&&unico.itemId===item?.itemId);
      }
      if(!alvo||String(alvo.name||'')!==p.itemNome)return false;
      const originais=retrato.filter(i=>String(i.name||'')===p.itemNome&&Number(i.day)===Number(alvo.day));
      const versao=originais.length===1?originais[0]:alvo;
      return !item?.itemId&&assinatura(item)===assinatura(versao)&&
        candidatos.filter(i=>Number(i.day)===Number(versao.day)).length===1;
    }).at(-1)||null;
  }
  function revisaoPublica(cal,mes,estado) {
    const marca=cal?.aprovacaoMeses?.[mes]||{};
    return ['ajuste_interno','aguardando_interna','aprovado_interno'].includes(estado)&&
      !!(marca.retratoLiberadoV115?.items?.length||marca.liberadoEmAnterior)&&pedidosPendentes(cal,mes).length>0;
  }
  function liberacaoPublica(marca,mes) {
    const m=marca||{};
    return JSON.stringify([mes,String(m.retratoLiberadoV115?.publicadoEm||
      (m.status==='liberado'?m.em:m.liberadoEmAnterior)||''),
      String(m.retratoLiberadoV115?.publicadoPor||(m.status==='liberado'?m.por:m.liberadoPorAnterior)||'')]);
  }
  function versaoPublica(item,mes) {
    const it={...item,mes};
    return JSON.stringify([String(it.itemId||''),campos.map(k=>valor(it,k)),!!it.excluido,!!it.posted,!!it.agendado]);
  }
  function prepararReenvio(cal,mes,em,mesDoItem=(c,it)=>it.mes||c.mesLegado) {
    let items=cal.items,alterou=false;
    for(const p of pedidosPendentes(cal,mes)){
      const alvos=(items||[]).map((item,indice)=>({item,indice})).filter(({item,indice})=>
        item&&mesDoItem(cal,item)===mes&&
        (p.itemId?String(item.itemId||'')===p.itemId:indice===p.itemIdx&&String(item.name||'')===p.itemNome));
      if(alvos.length!==1)throw Error('O conteúdo do pedido de ajuste precisa ser identificado antes do reenvio.');
      const {item,indice}=alvos[0];
      if(item.excluido||item.pedidoRevisadoI68===p.operationId)continue;
      if(!alterou){items=items.slice();alterou=true;}
      items[indice]=revisar(item,item,{por:'Equipe',em,forcar:true,pedido:p.operationId});
    }
    return alterou?{...cal,items}:cal;
  }
  // Duas abas podem ler a mesma versão. As Rules recusam sobrescrever
  // o primeiro pedido; só repetir após comprovar que a fonte mudou.
  async function transacionarPedido(fb,executar) {
    const revisao=cal=>JSON.stringify([cal?.updatedAt||'',cal?.pedidoAjusteCliente?.operationId||'',
      Object.keys(cal?.pedidosAjusteClienteI71||{}).sort()]);
    for(let tentativa=0;;tentativa++){
      let lida=null;
      try{return await fb.runTransaction(fb.db,async tx=>{
        const snap=await tx.get(fb.docRef);
        lida=snap.exists()?revisao(snap.data()):null;
        return executar(tx,snap);
      });}catch(e){
        if(tentativa>=2||lida===null||!String(e?.code||'').includes('permission-denied')||!fb.getDocFromServer)throw e;
        const atual=await fb.getDocFromServer(fb.docRef);
        if(!atual.exists()||revisao(atual.data())===lida)throw e;
      }
    }
  }
  root.GetAprovacaoI68=Object.freeze({campos,marcas,assinatura,mudou,revisar,aprovacaoNoRetrato,prepararReenvio,
    pedidosPendentes,pedidoDoItem,revisaoPublica,liberacaoPublica,versaoPublica,transacionarPedido});
})(typeof window==='undefined'?globalThis:window);
