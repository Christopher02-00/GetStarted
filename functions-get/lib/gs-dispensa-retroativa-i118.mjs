/* Projeção administrativa: não é publicação, aprovação ou checklist de qualidade. */
const SELO=Symbol('dispensaRetroativaTipadaI118');
const redesValidas=['geral','instagram','linkedin','tiktok','youtube'];
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const normal=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'||Number.isInteger(v._seconds))return {nanoseconds:v.nanoseconds??v._nanoseconds??0,seconds:v.seconds??v._seconds};return Array.isArray(v)?v.map(normal):Object.fromEntries(Object.keys(v).sort().map(k=>[k,normal(v[k])]));};
export const textoCanonicoDispensaI118=v=>JSON.stringify(normal(v));
export function redesPostagemDispensaI118(p){return p?.publicacaoStokki?.versao===1&&Array.isArray(p.publicacaoStokki.selecionadas)?p.publicacaoStokki.selecionadas:['geral'];}
export function agendaRedeDispensaI118(p,rede='geral'){return rede==='geral'?{data:p?.dataAgendada||'',hora:p?.horaAgendada||'',publicadaEm:p?.status==='postado'?p.postadoEm||'sem_marca_legada':'',conferidaEm:''}:p?.publicacaoStokki?.redes?.[rede]||null;}
export function assinaturaAgendaRedeDispensaI118(p,rede='geral'){
 const a=agendaRedeDispensaI118(p,rede);if(!a||!redesPostagemDispensaI118(p).includes(rede))return '';const ultima=rede==='geral'?null:[...(p.historico||[])].reverse().find(h=>String(h.acao||'').startsWith('Stokki — ')&&String(h.acao||'').endsWith(' / '+rede));
 return textoCanonicoDispensaI118({postagemId:p.id,cliente:p.cliente,empresaOtavio:p.empresaOtavio||'',videoId:p.videoId||'',calendarClienteSlug:p.calendarClienteSlug||'',calendarCompetencia:p.calendarCompetencia||'',calendarItemId:p.calendarItemId||'',calendarItemIdx:p.calendarItemIdx??null,origemManual:p.origemManual===true,excluido:p.excluido===true,arquivado:!!p.arquivado,estado:rede==='geral'?p.status:'',correcao:p.status==='em_correcao',agendadoEm:p.agendadoEm||null,reagendadoEm:p.reagendadoEm||null,...(ultima?{ultimaOperacaoRede:ultima}:{}),rede,data:a.data||'',hora:a.hora||'',retirada:a.retirada===true,publicadaEm:a.publicadaEm||'',conferidaEm:a.conferidaEm||'',legenda:rede==='geral'?p.legenda||'':p[{instagram:'legendaInstagram',linkedin:'legendaLinkedin',tiktok:'legendaTiktok',youtube:'legendaYoutube'}[rede]]||'',prova:p.provasPublicacaoI165?.[rede]||null});
}
export function registroRedeDispensadaI118(p,rede,registro,{createTime,assinaturaContexto}={}){
 if(!plain(registro)||registro.schema!==1||registro.origem!=='dispensa_confirmacao_retroativa_i118'||registro.postagemId!==p?.id||!plain(registro.redes)||p.excluido===true||p.arquivado||!['aguardando_agendamento','agendado','postado'].includes(p.status))return null;
 if(createTime&&textoCanonicoDispensaI118(createTime)!==textoCanonicoDispensaI118(registro.createTime)||assinaturaContexto&&assinaturaContexto!==registro.assinaturaContexto)return null;
 const r=registro.redes[rede];if(!plain(r)||r.rede!==rede||r.dispensada!==true||r.agendaAssinatura!==assinaturaAgendaRedeDispensaI118(p,rede)||!r.operacaoId||typeof r.em!=='string')return null;
 return r;
}
export function aplicarProjecoesDispensaI118(posts,resposta){
 if(resposta?.schema!==1||resposta.nenhumaEscrita!==true||!Array.isArray(resposta.projecoes)||!Array.isArray(resposta.erros))throw Error('A dispensa retroativa não foi conferida. A fila anterior foi preservada.');
 if(resposta.erros.length)throw Error('Uma origem da dispensa retroativa não foi conferida. A fila anterior foi preservada.');
 const ids=new Set();for(const x of resposta.projecoes){if(!x||typeof x.postagemId!=='string'||ids.has(x.postagemId)||!Array.isArray(x.redes))throw Error('A projeção retroativa precisa ser conferida.');ids.add(x.postagemId);}
 return posts.map(p=>{const copia={...p},dto=resposta.projecoes.find(x=>x.postagemId===p.id);const mapa={};for(const r of dto?.redes||[]){if(!redesValidas.includes(r.rede)||r.dispensada!==true||r.agendaAssinatura!==assinaturaAgendaRedeDispensaI118(p,r.rede))throw Error('A agenda mudou depois da conferência retroativa. Confira novamente.');mapa[r.rede]=Object.freeze({...r});}Object.defineProperty(copia,SELO,{value:Object.freeze(mapa)});return copia;});
}
export function copiarProjecaoDispensaI118(origem,copia){if(origem?.[SELO])Object.defineProperty(copia,SELO,{value:origem[SELO]});return copia;}
export function dispensaRetroativaRedeI118(post,rede='geral'){const r=post?.[SELO]?.[rede];return r?.dispensada===true&&r.agendaAssinatura===assinaturaAgendaRedeDispensaI118(post,rede)?r:null;}
export function todasCobrancasRetroativasDispensadasI118(post){const rs=redesPostagemDispensaI118(post).filter(r=>!agendaRedeDispensaI118(post,r)?.retirada);return rs.length>0&&rs.every(r=>agendaRedeDispensaI118(post,r)?.conferidaEm||dispensaRetroativaRedeI118(post,r));}
