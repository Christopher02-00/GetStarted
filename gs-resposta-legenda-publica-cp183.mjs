/* Public result only: no private work proof or internal history is consumed. */
export function respostaLegendaPublicaCp183(d,{cliente='',origemId=''}={}){
 const r=d?.respostaLegendaPublicaCp183;if(!r)return null;
 const keys=['schema','cliente','origemId','demandaId','texto','link','por','em','operacao'];
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==keys.length||!keys.every(k=>Object.hasOwn(r,k))||r.schema!==1||r.cliente!==cliente||r.origemId!==origemId||!/^entrada_i54_[a-f0-9]{64}$/.test(r.demandaId)||r.por!=='Chris'||!/^[A-Za-z0-9_-]{8,100}$/.test(r.operacao)||typeof r.texto!=='string'||r.texto.length>10000||typeof r.link!=='string'||r.link.length>2048||!(r.texto.trim()||r.link.trim())||typeof r.em!=='string'||!Number.isFinite(Date.parse(r.em)))return null;
 let link='';if(r.link){try{const u=new URL(r.link);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;link=u.href;}catch{return null;}}
 return {texto:r.texto,link,por:r.por,em:r.em};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function htmlRespostaLegendaPublicaCp183(d,identidade){const r=respostaLegendaPublicaCp183(d,identidade);if(!r)return '';return '<section data-resposta-legenda-publica-cp183 style="margin-top:12px;padding:12px;border:1px solid var(--green,#4caf72);border-radius:10px"><b>Resposta da equipe</b>'+(r.texto?'<div style="white-space:pre-wrap;overflow-wrap:anywhere;margin-top:8px">'+esc(r.texto)+'</div>':'')+(r.link?'<a class="btn secondary" href="'+esc(r.link)+'" target="_blank" rel="noopener noreferrer" style="margin-top:10px">Abrir entrega</a>':'')+'<p class="meta">Enviada por '+esc(r.por)+' · '+esc(r.em.slice(0,10).split('-').reverse().join('/'))+'</p></section>';}
