// I79: qualidade de legenda, sem alterar dados ou decisões editoriais.
export const CAMPOS_I79 = ['legenda','legendaInstagram','legendaLinkedin','legendaTiktok','legendaYoutube'];
export const EXTERNA_I79 = '[Legenda já definida fora do site — combinado com o cliente]';
export function legendaUtilizavelI79(valor){
  const texto=String(valor??'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
  if(!texto || texto.length>20000 || /^[\p{P}\s]+$/u.test(texto))return false;
  const recado=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\p{P}\s]+/gu,' ').trim();
  return !['disponivel no calendario','legenda disponivel no calendario','disponivel no doc','ja foi postado','esse video tera que esperar o lancamento nao postar','legenda ja definida fora do site combinado com o cliente'].includes(recado);
}
export function legendaExternaAprovadaI79(p){return p?.legendaOrigem==='pulo_aprovado_amanda_v118'&&p?.legenda===EXTERNA_I79;}
export function camposPendentesI79(p){
  if(legendaExternaAprovadaI79(p))return [];
  if(p?.cliente==='stokki'&&p?.publicacaoStokki?.versao===1&&Array.isArray(p.publicacaoStokki.selecionadas)){
    const mapa={instagram:'legendaInstagram',linkedin:'legendaLinkedin',tiktok:'legendaTiktok',youtube:'legendaYoutube'};
    return p.publicacaoStokki.selecionadas.filter(r=>!p.publicacaoStokki.redes?.[r]?.retirada).map(r=>mapa[r]).filter(k=>!legendaUtilizavelI79(p[k]));
  }
  return CAMPOS_I79.filter(k=>(k==='legenda'||String(p?.[k]||'').trim())&&!legendaUtilizavelI79(p?.[k]));
}
export function pendenciaAgendadaI90(p){return p?.legendaPendenteAoAgendarI90===true&&p?.excluido!==true&&['aguardando_agendamento','agendado','postado'].includes(p?.status)&&camposPendentesI79(p).length>0;}
export function pendenciaLegendaI79(p){return pendenciaAgendadaI90(p)||(p?.excluido!==true && ['aguardando_agendamento','agendado'].includes(p?.status)&&camposPendentesI79(p).length>0);}
export function exigirLegendaI79(texto){if(!legendaUtilizavelI79(texto))throw Error('Preencha a legenda com o texto da publicação. Ponto, vírgula e “Disponível no calendário” não são legendas. O que você digitou foi mantido.');return String(texto).trim();}
export function exigirPostagemI79(p){if(camposPendentesI79(p).length)throw Error('Esta postagem ainda precisa de legenda. Abra “Conteúdo e legenda” para conferir e completar o texto antes de agendar. As datas já registradas foram preservadas.');}
// Apenas campos faltantes podem ser reparados; etapa, datas e editoriais permanecem.
export function prepararReparoI79(p,textos,ctx){
  if(!['Gabrielle','Cecília','Amanda','Chris'].includes(ctx.papel)||!pendenciaLegendaI79(p))throw Error('Esta postagem não está disponível para completar legenda. Atualize a conferência.');
  const faltantes=camposPendentesI79(p),patch={};
  if(Object.keys(textos).some(k=>!faltantes.includes(k)))throw Error('Uma legenda já preenchida não será sobrescrita. Atualize a conferência.');
  for(const k of faltantes){if(!(k in textos))throw Error('Confira todas as legendas pendentes.');patch[k]=exigirLegendaI79(textos[k]);}
  return patch;
}
