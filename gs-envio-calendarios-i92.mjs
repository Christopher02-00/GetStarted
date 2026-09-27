/* I92: organização de compartilhamento; nunca escreve na fonte editorial. */
export const COLECAO_ENVIOS_I92='calendarios_envios_cecilia_i92';
export function chaveEnvioI92(cliente,mes){
  if(!/^[a-zA-Z0-9_-]{1,180}$/.test(String(cliente))||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(mes)))throw new Error('Cliente ou mês inválido para a confirmação.');
  return cliente+'__'+mes;
}
export function marcaPublicacaoI92(cal,mes){
  const marca=cal?.aprovacaoMeses?.[mes];
  if(marca&&typeof marca==='object')return marca;
  const antiga=cal?.aprovacaoInterna;
  return antiga&&(!antiga.mes||antiga.mes===mes)?antiga:{};
}
function tempoI92(v){
  if(typeof v==='string')return v;
  if(v&&typeof v.toDate==='function')return v.toDate().toISOString();
  if(v&&typeof v.seconds==='number')return new Date(v.seconds*1000).toISOString();
  return '';
}
export async function referenciaPublicacaoI92(cliente,mes,cal,itens){
  chaveEnvioI92(cliente,mes);
  const marca=marcaPublicacaoI92(cal,mes),foto=marca.retratoLiberadoV115;
  const retrato=foto?.mes===mes&&Array.isArray(foto.items)?foto:null;
  const publicadoEm=tempoI92(retrato?.publicadoEm)||tempoI92(marca.aprovadoEm)||tempoI92(marca.enviadoEm);
  // O instante da liberação identifica a edição. Marcar gravado, aprovar como
  // cliente, comentar ou agendar não significa que Amanda publicou outra vez.
  // Para legado sem instante, comparar somente conteúdo editorial, nunca índices.
  const campos=['itemId','day','name','desc','roteiroDispensado','legenda','ref','referenciaDispensada','obs','obsCliente','fmt','dataFlexivel','dataPostagem','bloco'];
  const editorial=publicadoEm?null:(retrato?.items||itens||[]).filter(i=>i&&!i.excluido).map(i=>
    Object.fromEntries(campos.map(k=>[k,i[k]??null]))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const dados=JSON.stringify([cliente,mes,publicadoEm,editorial]);
  const hash=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(dados));
  return {assinatura:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),publicadoEm};
}
export function situacaoEnvioI92({pronto,registro,referencia,estado}){
  const confirmado=registro?.enviado===true;
  const atualizado=confirmado&&pronto&&registro.publicacao!==referencia.assinatura;
  if(!pronto)return {grupo:'aguardando',atualizado:false,rotulo:estado==='arquivado'?'Arquivado':estado==='ajuste_interno'?'Em ajuste':['aguardando_interna','aprovado_interno'].includes(estado)?'Com Amanda':'Em preparação'};
  return {grupo:confirmado&&!atualizado?'enviados':'prontos',atualizado,rotulo:atualizado?'Atualizado — conferir reenvio':confirmado?'Envio confirmado':'Liberado para enviar'};
}
export function exigirRevisaoEnvioI92(atual,esperada){
  if((atual?.revision||0)!==esperada)throw new Error('A confirmação mudou em outra aba. Atualize a lista antes de continuar.');
}
export function validarRegistroEnvioI92(r,cliente,mes){
  if(!r)return true;
  if(r.cliente!==cliente||r.mes!==mes||r.schemaVersion!==1||!Number.isInteger(r.revision)||r.revision<1||typeof r.enviado!=='boolean'||!/^[a-f0-9]{64}$/.test(r.publicacao||''))throw new Error('A confirmação deste cliente precisa ser conferida. Nenhuma marca foi substituída.');
  return true;
}
