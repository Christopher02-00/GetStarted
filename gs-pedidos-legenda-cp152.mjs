/* Pedidos autônomos de legenda: transporte fechado, contexto e replay da mesma entrega. */
import {abrirEnvelopeCentralR80} from './codec-central-r80.mjs?v=000e1d41f7937787cf50c53904f5e8392d2873f152fc10d3a4837697d5e67925';

const TIPOS=new Set(['pedido_legenda','ajuste_legenda','legenda','correcao_legenda']);
const CAIXAS=new Set(['avisos_do_cliente','pedidos_publicos']);
const CAMPOS=['uid','nome','atorReal','sessao','geracao'];
const exigir=(ok,mensagem)=>{if(!ok)throw Error(mensagem);};
const texto=v=>typeof v==='string'?v:'';
export function ehPedidoLegendaClienteCp152(d){
  return !!d&&/^entrada_i54_[a-f0-9]{64}$/.test(texto(d.id))&&d.origem==='cliente'&&(d.destinatario==='Chris'||d.destinatario==='Gabrielle'&&d.status==='aprovada')&&
    TIPOS.has(d.tipoPedidoCliente)&&CAIXAS.has(d.origemAvisoColecao)&&/^[A-Za-z0-9_-]{1,180}$/.test(texto(d.origemAvisoId))&&!d.postagemId;
}
function identidade(d){
  exigir(ehPedidoLegendaClienteCp152(d),'Abra o pedido de legenda original no seu perfil Chris.');
  return {demandaId:d.id,clienteEsperado:texto(d.clienteSlug||d.cliente),origemAvisoColecaoEsperada:d.origemAvisoColecao,origemAvisoIdEsperado:d.origemAvisoId};
}
function provaValida(p,reparo=false){
  return typeof p?.provaTexto==='string'&&typeof p.provaImagemUrl==='string'&&p.provaTexto.length<=10000&&p.provaImagemUrl.length<=2048&&
    (reparo||!!(p.provaTexto||p.provaImagemUrl));
}
export function criarPedidosLegendaCp152({contexto,chamar,storage,autenticado=()=>true,novaOperacao=()=> 'pl152_'+globalThis.crypto.randomUUID().replaceAll('-','')}={}){
  exigir(typeof contexto==='function'&&typeof chamar==='function'&&storage&&typeof storage.getItem==='function'&&typeof storage.setItem==='function'&&typeof storage.removeItem==='function','Não consegui preparar a conferência das legendas.');
  const emCurso=new Map();
  let paginaRecebimento=null;
  function capturar(){
    const c={...contexto()};
    exigir(autenticado()&&!!c.uid&&c.nome==='Chris'&&c.atorReal==='Chris','Entre com o Google do Chris e use o próprio perfil.');
    exigir(typeof c.sessao==='string'&&c.sessao.length>0,'Reabra o pedido no seu acesso.');
    return c;
  }
  function conferirContexto(c){const n=capturar();exigir(CAMPOS.every(k=>n[k]===c[k]),'O perfil mudou. A tentativa continua guardada no acesso original.');}
  const acesso=c=>({uidEsperado:c.uid,atorRealEsperado:c.atorReal,papelOperado:c.nome,sessao:c.sessao});
  const chave=(c,id)=>'get_pedido_legenda_cp152_v1:'+JSON.stringify([c.uid,c.atorReal,c.nome,id]);
  async function solicitar(c,acao,dados={}){
    conferirContexto(c);
    const r=await chamar({acao,...dados,...acesso(c)});
    conferirContexto(c);
    return abrirEnvelopeCentralR80(r?.data);
  }
  function lerPendente(c,i){
    const bruto=storage.getItem(chave(c,i.demandaId));if(bruto===null||bruto===undefined)return null;
    let p;try{p=JSON.parse(bruto);}catch{throw Error('A tentativa guardada precisa de conferência; nenhum envio novo foi criado.');}
    exigir(p?.schema===1&&JSON.stringify(p.identidade)===JSON.stringify(i)&&/^[A-Za-z0-9_-]{8,100}$/.test(texto(p.operacao))&&
      /^[a-f0-9]{64}$/.test(texto(p.assinaturaEsperada))&&typeof p.repararAcompanhamento==='boolean'&&provaValida(p,p.repararAcompanhamento),'A tentativa guardada não corresponde a este pedido. Nenhum envio novo foi criado.');
    return p;
  }
  function guardar(c,i,p){const s=JSON.stringify(p),k=chave(c,i.demandaId);storage.setItem(k,s);exigir(storage.getItem(k)===s,'Não consegui guardar esta tentativa. Nada foi enviado.');}
  function limparMesmaTentativa(c,i,p){try{const k=chave(c,i.demandaId);if(storage.getItem(k)===JSON.stringify(p))storage.removeItem(k);}catch{}}
  const payloadTentativa=p=>({...p.identidade,operacao:p.operacao,assinaturaEsperada:p.assinaturaEsperada,provaTexto:p.provaTexto,provaImagemUrl:p.provaImagemUrl,repararAcompanhamento:p.repararAcompanhamento,...(p.entregaPublicaCp183!==undefined?{entregaPublicaCp183:p.entregaPublicaCp183}:{})});
  function validarRecibo(r,i,p){
    exigir(r?.schema===1&&r.demandaId===i.demandaId&&r.operacao?.id===p.operacao&&r.operacao.confirmada===true&&['novo','recuperado','ja_concluida'].includes(r.operacao.estado)&&r.statusDemanda==='aprovada'&&
      typeof r.reparoApenas==='boolean'&&r.reparoApenas===p.repararAcompanhamento&&r.semAprovacaoEditorial===true&&(r.statusPortal===null||typeof r.statusPortal==='string'),'Não consegui confirmar o recibo desta mesma entrega. A tentativa continua guardada.');
    exigir(p.entregaPublicaCp183===undefined||r.respostaClienteDisponivel===true,'O recibo não confirmou a resposta pública desta entrega. A mesma tentativa continua guardada.');
    return r;
  }
  function validarOne(r,i){
    exigir(r?.schema===1&&r.demandaId===i.demandaId&&r.cliente===i.clienteEsperado&&r.origemAvisoColecao===i.origemAvisoColecaoEsperada&&r.origemAvisoId===i.origemAvisoIdEsperado&&
      TIPOS.has(r.tipoPedidoCliente)&&(r.destinatario==='Chris'||r.destinatario==='Gabrielle'&&r.status==='aprovada')&&/^[a-f0-9]{64}$/.test(texto(r.assinatura))&&typeof r.podeEntregar==='boolean'&&typeof r.podeRepararAcompanhamento==='boolean'&&
      typeof r.provaTexto==='string'&&typeof r.provaImagemUrl==='string'&&r.semAprovacaoEditorial===true,'A identidade e a situação deste pedido não foram confirmadas.');
    return r;
  }
  async function conferir(){
    const c=capturar(),chaveContexto=JSON.stringify(CAMPOS.map(k=>c[k]));
    if(paginaRecebimento?.chave!==chaveContexto)paginaRecebimento=null;
    const extra=paginaRecebimento?{cursores:{...paginaRecebimento.cursores}}:{};
    let r;try{r=await solicitar(c,'pedidos_legenda_conferir_cp152',extra);}catch(e){if(e.details?.codigo==='i165/legenda-cursor'){if(paginaRecebimento?.chave===chaveContexto)paginaRecebimento=null;e.reiniciarConferenciaLegendaCp152=true;}throw e;}
    exigir(r?.schema===1&&['recebidos','jaRecebidos','ignorados','falhas'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&['recebidos','jaRecebidos','ignorados','falhas'].reduce((s,k)=>s+r[k],0)<=150&&typeof r.maisPendentes==='boolean'&&
      r.cursores&&Object.keys(r.cursores).sort().join('|')==='avisos_do_cliente|pedidos_publicos'&&Object.values(r.cursores).every(v=>v===null||typeof v==='string'&&v.length<=180)&&
      r.maisPendentes===Object.values(r.cursores).some(v=>v!==null),'A conferência das legendas não retornou um resultado completo.');
    conferirContexto(c);paginaRecebimento=r.maisPendentes?{chave:chaveContexto,cursores:{...r.cursores}}:null;
    return {recebidos:r.recebidos,atualizados:0,falhas:r.falhas,maisPendentes:r.maisPendentes};
  }
  async function conferirPedido(d){const c=capturar(),i=identidade(d);return validarOne(await solicitar(c,'pedidos_legenda_conferir_cp152',i),i);}
  function tentativaPendente(d){const c=capturar(),p=lerPendente(c,identidade(d));return p?JSON.parse(JSON.stringify(p)):null;}
  function conferirTentativa(d){
    const p=tentativaPendente(d);exigir(p,'Não existe um envio anterior guardado neste acesso.');
    return entregar(d,{provaTexto:p.provaTexto,provaImagemUrl:p.provaImagemUrl,repararAcompanhamento:p.repararAcompanhamento,...(p.entregaPublicaCp183!==undefined?{entregaPublicaCp183:p.entregaPublicaCp183}:{})});
  }
  function conferirVersaoAtual(d){
    const c=capturar(),i=identidade(d),k=chave(c,i.demandaId),p=lerPendente(c,i);
    exigir(p,'Não existe uma tentativa guardada para esta conferência.');
    exigir(!emCurso.has(k),'Espere a confirmação que já está em curso para este pedido.');
    const promessa=(async()=>{
      const r=await solicitar(c,'pedido_legenda_cancelar_tentativa_cp152',payloadTentativa(p));
      if(r?.tentativaCancelada!==true){validarRecibo(r,i,p);exigir(r.operacao.estado==='recuperado','O recibo anterior não foi confirmado.');conferirContexto(c);limparMesmaTentativa(c,i,p);return r;}
      exigir(r.schema===1&&r.demandaId===i.demandaId&&r.operacao?.id===p.operacao&&r.operacao.estado==='cancelada_por_versao'&&r.operacao.confirmada===true&&r.semAlterarNegocio===true&&r.exigeNovaRevisao===true,'Não consegui confirmar o encerramento desta mesma tentativa.');
      validarOne(r.conferenciaAtual,i);exigir(r.conferenciaAtual.assinatura!==p.assinaturaEsperada,'O conflito desta tentativa não foi confirmado.');conferirContexto(c);
      // Keep the same protected operation available if the fresh read fails.
      const atual=validarOne(await solicitar(c,'pedidos_legenda_conferir_cp152',i),i);conferirContexto(c);
      limparMesmaTentativa(c,i,p);return {...r,conferenciaAtual:atual};
    })();
    emCurso.set(k,{tipo:'versao',promessa});
    promessa.finally(()=>{if(emCurso.get(k)?.promessa===promessa)emCurso.delete(k);}).catch(()=>{});
    return promessa;
  }
  function entregar(d,{provaTexto='',provaImagemUrl='',repararAcompanhamento=false,entregaPublicaCp183}={}){
    const c=capturar(),i=identidade(d),k=chave(c,i.demandaId);
    exigir(typeof repararAcompanhamento==='boolean','Confira qual entrega deseja confirmar.');
    const pedido={provaTexto:provaTexto.trim(),provaImagemUrl:provaImagemUrl.trim(),repararAcompanhamento,...(entregaPublicaCp183!==undefined?{entregaPublicaCp183:{texto:entregaPublicaCp183?.texto,link:entregaPublicaCp183?.link}}:{})};
    const validarPublica=()=>{const v=pedido.entregaPublicaCp183;exigir(v&&typeof v.texto==='string'&&typeof v.link==='string'&&v.texto.length<=10000&&v.link.length<=2048&&(v.texto.trim()||v.link.trim()),'Escreva a legenda ou resposta que o cliente receberá, ou informe o link público.');if(v.link.trim()){let u;try{u=new URL(v.link.trim());}catch{}exigir(u&&['http:','https:'].includes(u.protocol)&&!u.username&&!u.password,'Use um link público http ou https, sem senha.');}pedido.entregaPublicaCp183={texto:v.texto.trim(),link:v.link.trim()};};
    if(emCurso.has(k)){
      const atual=emCurso.get(k);exigir(atual.tipo!=='versao'&&atual.assinatura===JSON.stringify(pedido),'Uma entrega deste pedido já está sendo conferida. Preserve o texto atual.');return atual.promessa;
    }
    const promessa=(async()=>{
      let p=lerPendente(c,i);
      if(p){
        exigir(p.repararAcompanhamento===repararAcompanhamento&&(repararAcompanhamento||p.provaTexto===pedido.provaTexto&&p.provaImagemUrl===pedido.provaImagemUrl)&&JSON.stringify(p.entregaPublicaCp183)===JSON.stringify(pedido.entregaPublicaCp183),'Existe uma tentativa guardada com outro texto. Reabra a mesma entrega para conferir esse envio primeiro.');
      }else{
        if(!repararAcompanhamento||entregaPublicaCp183!==undefined)validarPublica();
        const estado=validarOne(await solicitar(c,'pedidos_legenda_conferir_cp152',i),i);conferirContexto(c);
        if(repararAcompanhamento){
          exigir(entregaPublicaCp183===undefined||!estado.respostaClienteDisponivel,'Este pedido já tem resposta pública. Confira a mesma resposta no Portal.');
          exigir(estado.status==='aprovada'&&estado.podeRepararAcompanhamento,'Este acompanhamento não precisa ou não permite confirmação por esta entrega.');
          pedido.provaTexto=estado.provaTexto;pedido.provaImagemUrl=estado.provaImagemUrl;
        }else exigir(estado.podeEntregar,'Este pedido não permite uma nova entrega. Confira sua situação atual.');
        exigir(provaValida(pedido,repararAcompanhamento),'Escreva o que foi entregue ou informe o link da entrega.');
        const operacao=novaOperacao();exigir(/^[A-Za-z0-9_-]{8,100}$/.test(texto(operacao)),'Não consegui identificar esta tentativa.');
        p={schema:1,identidade:i,operacao,assinaturaEsperada:estado.assinatura,...pedido};guardar(c,i,p);
      }
      conferirContexto(c);
      const bruto=await solicitar(c,'pedido_legenda_entregar_cp152',payloadTentativa(p));
      if(bruto?.recusaPublicaCp183===true){exigir(bruto.schema===1&&bruto.demandaId===i.demandaId&&bruto.semAlterarNegocio===true&&bruto.operacao?.id===p.operacao&&bruto.operacao.confirmada===true&&['recusada_sem_resposta_publica','recuperado'].includes(bruto.operacao.estado),'Não consegui confirmar a recusa desta mesma tentativa.');conferirContexto(c);limparMesmaTentativa(c,i,p);throw Error('O serviço encerrou esta tentativa sem alterar a entrega. Escreva a legenda ou resposta pública e confirme pela ficha atual. O preenchimento foi preservado.');}
      const r=validarRecibo(bruto,i,p);
      conferirContexto(c);
      limparMesmaTentativa(c,i,p);
      return r;
    })();
    emCurso.set(k,{assinatura:JSON.stringify(pedido),promessa});
    promessa.finally(()=>{if(emCurso.get(k)?.promessa===promessa)emCurso.delete(k);}).catch(()=>{});
    return promessa;
  }
  return Object.freeze({conferir,conferirPedido,entregar,conferirTentativa,conferirVersaoAtual,tentativaPendente});
}
