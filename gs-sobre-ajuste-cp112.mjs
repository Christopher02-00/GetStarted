/* Nota pública: somente o retrato efetivamente liberado. Nenhum campo bruto do item. */
const mapa=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sobreAjusteLiberadoCp112(calendario,mes,itemId){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes||'')||typeof itemId!=='string'||!itemId)return null;
 const r=calendario?.aprovacaoMeses?.[mes]?.retratoLiberadoV115;
 if(!mapa(r)||r.mes!==mes||!Array.isArray(r.items)||!r.publicadoEm||!r.publicadoPor||!r.items.some(i=>i?.itemId===itemId&&!i.excluido))return null;
 const n=mapa(r.sobreAjustesCp112)&&Object.hasOwn(r.sobreAjustesCp112,itemId)?r.sobreAjustesCp112[itemId]:null;
 if(!mapa(n)||n.schema!==1||n.mes!==mes||n.itemId!==itemId||typeof n.texto!=='string'||!n.texto.trim()||n.texto.length>4000||n.aprovadoPor!=='Amanda'||typeof n.aprovadoEm!=='string'||!Number.isFinite(Date.parse(n.aprovadoEm))||!Number.isInteger(n.revisao)||n.revisao<1)return null;
 return {texto:n.texto,por:typeof n.por==='string'?n.por:'',aprovadoPor:n.aprovadoPor,aprovadoEm:n.aprovadoEm,revisao:n.revisao};
}
export function htmlSobreAjusteLiberadoCp112(calendario,mes,itemId){
 const n=sobreAjusteLiberadoCp112(calendario,mes,itemId);
 return n?'<section class="rcBloco rcSobreAjusteCp112" style="white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;box-sizing:border-box" aria-label="Sobre este ajuste"><b>Sobre este ajuste</b>'+esc(n.texto)+'</section>':'';
}
