import {legendaUtilizavelI79} from './gs-legenda-qualidade-i79.mjs?v=i90-1';
import {eventos} from './stokki-publicacao.mjs?v=i90-1';

// Projeção de leitura. Não injeta texto operacional no calendário editorial.
const campos=[['legenda','Legenda da publicação'],['legendaInstagram','Legenda · Instagram'],['legendaTiktok','Legenda · TikTok'],['legendaYoutube','Legenda · YouTube'],['legendaLinkedin','Legenda · LinkedIn']];
const ativo=x=>x&&x.excluido!==true&&x.arquivado!==true&&x.archived!==true&&!x.deletedAt;
// Marcas encontradas no legado exigem conferência; nunca são apagadas ou
// transformadas automaticamente em uma legenda editorial aprovada.
function textoOperacionalConferivel(texto){
  const n=String(texto||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  return !['mandei no wpp','mandei no whatsapp','enviado no whatsapp','roteiro disponivel no doc'].includes(n)&&!/^\d+$/.test(n);
}
export function textosCalendarioI95(item){
  const vistos=new Set();
  return campos.flatMap(([campo,rotulo])=>{
    const texto=String(item?.[campo]||'').trim();
    if(!legendaUtilizavelI79(texto)||vistos.has(texto))return [];
    vistos.add(texto);return [{campo,rotulo,texto}];
  });
}
function vinculoExato(p,origem,cliente,mes){
  // Referência nativa incompleta não cai na referência manual nem no título.
  if(p.calendarItemId)return p.calendarClienteSlug===cliente&&p.calendarCompetencia===mes&&p.calendarItemId===origem.itemId;
  if(origem.origemAgendamentoManualV118===true&&origem.postagemId===p.id&&origem.itemId==='calitem_post_'+p.id)return true;
  const r=p.referenciaLegendaI78;
  return !!r&&r.calendarId===cliente&&r.competencia===mes&&r.itemId===origem.itemId;
}
export function legendaClienteI95({item,cliente,mes,origens=[],postagens=[],leitura='carregando'}){
  const editorial=textosCalendarioI95(item);
  if(editorial.length)return {estado:'calendario',textos:editorial};
  if(!ativo(item)||!item.itemId||!cliente||!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes||''))return {estado:'pendente',textos:[]};
  const fontes=origens.filter(o=>ativo(o)&&o.itemId===item.itemId&&o.mes===mes);
  if(fontes.length!==1)return {estado:'conferir',textos:[]};
  if(leitura!=='confirmada')return {estado:leitura==='erro'?'erro':'carregando',textos:[]};
  const ligadas=postagens.filter(p=>ativo(p)&&p.cliente===cliente&&['agendado','postado'].includes(p.status)&&vinculoExato(p,fontes[0],cliente,mes));
  if(ligadas.length>1)return {estado:'conferir',textos:[]};
  if(!ligadas.length)return {estado:'pendente',textos:[]};
  const p=ligadas[0];let textos;
  if(p.publicacaoStokki){
    // Mesmo filtro usado em Programados: só plataformas públicas do plano válido.
    try{textos=eventos([p]).filter(e=>legendaUtilizavelI79(e.legenda)).map(e=>({rotulo:'Legenda da postagem · '+e.nome,texto:e.legenda,campo:e.rede}));}
    catch{return {estado:'conferir',textos:[]};}
  }else textos=textosCalendarioI95(p).map(t=>({...t,rotulo:t.campo==='legenda'?'Legenda da postagem':t.rotulo.replace('Legenda ·','Legenda da postagem ·')}));
  const conferiveis=textos.filter(t=>textoOperacionalConferivel(t.texto));
  if(textos.length!==conferiveis.length)return {estado:'conferir',textos:[]};
  return textos.length?{estado:'postagem',postagemId:p.id,textos}:{estado:'pendente',textos:[]};
}
