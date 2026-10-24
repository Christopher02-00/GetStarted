import crypto from 'node:crypto';
import {jsonCanonicoI165 as jsonI165} from './lib/gs-contexto-operacional-i165.mjs';

const hash = value => crypto.createHash('sha256').update(jsonI165(value)).digest('hex');
export function falhaCanalI165(mensagem, classificacao='desconhecido') {
  return Object.assign(new Error(mensagem), {classificacaoCanalI165: classificacao});
}

export function versaoReservaI165(d){
  return hash(Object.fromEntries(['schema','escopo','id','fonte','chaveObrigacao','versao','destinatario','estado'].filter(k=>d?.[k]!==undefined).map(k=>[k,d[k]])));
}
export function manifestoReservaI165(reservas){return reservas.map(r=>({caminho:r.ref.path,campo:r.campo,versao:r.versao||''})).sort((a,b)=>a.caminho.localeCompare(b.caminho)||a.campo.localeCompare(b.campo));}
export function pertenceReciboI165(d,s,canal,destinatario,campo){return d?.canal===canal&&d?.destinatario===destinatario&&d?.manifesto?.some(x=>x.caminho===s.ref.path&&x.campo===campo&&x.versao===versaoReservaI165(s.data()));}

// O recibo antecede a chamada externa. Uma lease expirada não comprova ausência de envio.
export async function transmitirI165(db, {chave, canal, destinatario, carga, reservas=[]}, enviar, {clock=()=>new Date()}={}) {
  const manifesto=manifestoReservaI165(reservas),id=hash([chave,canal,destinatario,carga,manifesto]), ref=db.doc('transmissoes_i165/'+id), token=crypto.randomUUID();
  let anterior, tentativa;
  const claim=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref), itens=await Promise.all(reservas.map(r=>tx.get(r.ref)));
    anterior=snap.data();const agora=clock();
    if(itens.some((s,i)=>!s.exists||reservas[i].versao&&versaoReservaI165(s.data())!==reservas[i].versao))throw falhaCanalI165('A versão da fila mudou antes da confirmação.','antes_envio');
    if(anterior?.estado==='aceita_pelo_provedor'){if(jsonI165(anterior.manifesto||[])!==jsonI165(manifesto))throw Error('O recibo pertence a outro lote.');return 'aceita';}
    if(anterior?.estado==='resultado_desconhecido')return 'desconhecido';
    if(anterior?.estado==='transmitindo'){
      if(anterior.concessaoAte<=agora.toISOString()){
        tx.update(ref,{estado:'resultado_desconhecido',erro:'A execução terminou sem recibo definitivo. Não reenviar automaticamente.',conferidoEm:agora.toISOString()});
        return 'desconhecido';
      }
      return 'ocupada';
    }
    if(itens.some((s,i)=>!s.exists||reservas[i].versao&&versaoReservaI165(s.data())!==reservas[i].versao||s.data()[reservas[i].campo]&&s.data()[reservas[i].campo]!==id))return 'reservada';
    tentativa=(anterior?.tentativas||0)+1;
    const registro={schema:1,escopo:'operacional_i165_cp101',id,chave,canal,destinatario,cargaHash:hash(carga),manifesto,fontes:reservas.map(r=>r.ref.path),estado:'transmitindo',tentativas:tentativa,token,iniciadaEm:agora.toISOString(),concessaoAte:new Date(agora.getTime()+120000).toISOString()};
    tx.set(ref,registro);tx.set(ref.collection('tentativas').doc(String(tentativa)),registro);
    reservas.forEach(r=>tx.update(r.ref,{[r.campo]:id}));return 'enviar';
  });
  if(claim==='aceita')return {aceita:true,recibo:anterior.recibo||'',recuperada:true,tentativaId:id};
  if(claim!=='enviar')throw Object.assign(falhaCanalI165(claim==='ocupada'?'O mesmo envio está em andamento.':'A entrega externa não tem confirmação definitiva. A pendência continua no sistema.',claim==='ocupada'?'ocupada':'desconhecido'),{tentativaId:id});
  let retorno;
  try{
    retorno=await enviar();
    if(retorno?.aceita!==true)throw falhaCanalI165(retorno?.motivo||'O provedor não confirmou o aceite.');
  }catch(e){
    const conhecida=['antes_envio','recusada'].includes(e.classificacaoCanalI165), estado=conhecida?'recusada':'resultado_desconhecido';
    await gravar({estado,erro:String(e.message||e).slice(0,500),conferidoEm:clock().toISOString()},conhecida).catch(()=>{});
    throw Object.assign(falhaCanalI165(e.message,conhecida?'recusada':'desconhecido'),{tentativaId:id});
  }
  const patch={estado:'aceita_pelo_provedor',recibo:retorno.recibo||'',aviso:retorno.aviso||'',aceitaEm:clock().toISOString()};
  let persistida=false;
  // Recuperar a gravação do MESMO aceite nunca chama o provedor de novo.
  for(let n=0;n<3&&!persistida;n++)try{await gravar(patch);persistida=true;}catch{}
  if(!persistida)throw Object.assign(falhaCanalI165('O provedor aceitou, mas o recibo ainda precisa ser recuperado. Nenhum reenvio automático será feito.'),{tentativaId:id});
  return {...retorno,tentativaId:id};

  async function gravar(patch,liberar=false){
    await db.runTransaction(async tx=>{
      const s=await tx.get(ref);if(s.data()?.token!==token)throw Error('A tentativa mudou; conferir o recibo.');
      const itens=liberar?await Promise.all(reservas.map(r=>tx.get(r.ref))):[];
      tx.update(ref,{...patch,concessaoAte:''});tx.set(ref.collection('tentativas').doc(String(tentativa)),patch,{merge:true});
      if(liberar)reservas.forEach((r,i)=>{if(itens[i].data()?.[r.campo]===id)tx.update(r.ref,{[r.campo]:''});});
    });
  }
}
