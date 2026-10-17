/* I144 — quatro divisões no cadastro físico ZEISS; não cria clientes/acessos. */
(function(root){
  'use strict';
  const empresas=Object.freeze([
    Object.freeze({id:'otica_hauer',nome:'Ótica Hauer'}),
    Object.freeze({id:'otica_sao_jose',nome:'Ótica São José'}),
    Object.freeze({id:'clinica_olhos_hauer',nome:'Clínica dos Olhos Hauer'}),
    Object.freeze({id:'clinica_sao_jose',nome:'Clínica São José'})
  ]);
  const porId=new Map(empresas.map(e=>[e.id,e]));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ativo=cliente=>cliente==='zeiss';
  const bruto=r=>String(typeof r==='string'?r:r?.empresaOtavio||r?.referenciaLegendaI78?.empresaOtavio||r?.vinculoCalendarioAnteriorV138?.empresaOtavio||'').trim();
  const id=r=>porId.has(bruto(r))?bruto(r):'';
  const nome=r=>porId.get(bruto(r))?.nome||(bruto(r)?'Empresa a conferir':'Geral / anteriores');
  const selecao=v=>v==='geral'||porId.has(v)?v:'todos';
  function corresponde(cliente,r,valor){
    if(!ativo(cliente))return true;
    const filtro=selecao(valor);return filtro==='todos'||(filtro==='geral'?!id(r):id(r)===filtro);
  }
  function filtrar(cliente,itens,valor){return !ativo(cliente)||selecao(valor)==='todos'?itens:itens.filter(r=>corresponde(cliente,r,valor));}
  function campos(cliente,r){
    const valor=bruto(r);
    if(!valor)return {};
    if(!ativo(cliente)||!porId.has(valor))throw Error('Confira a empresa deste material antes de continuar. O cliente e o registro foram preservados.');
    return {empresaOtavio:valor};
  }
  function conferir(cliente,...registros){
    const valores=[...new Set(registros.flatMap(r=>[bruto(r),bruto(r?.referenciaLegendaI78),bruto(r?.vinculoCalendarioAnteriorV138)]).filter(Boolean))];
    if(valores.length>1)throw Error('A empresa deste material não coincide com a origem. Confira a identificação antes de continuar.');
    return campos(cliente,valores[0]||'');
  }
  function projetarPostagem(p,v){
    if(!ativo(p?.cliente)||bruto(p)||!v||!id(v)||!p.id||String(p.videoId||'')!==String(v.id||'')||String(v.postagemId||'')!==p.id||v.cliente!==p.cliente)return p;
    const chaves=['calendarClienteSlug','calendarCompetencia','calendarItemId'];
    if(chaves.some(k=>String(p[k]||'')!==String(v[k]||'')))return p;
    return {...p,empresaOtavio:id(v),__empresaProjetadaI144:true};
  }
  function selo(cliente,r){return ativo(cliente)?'<span class="selo" style="display:inline-block;margin:4px 0;white-space:normal;">'+esc(nome(r))+'</span>':'';}
  function opcoes(valor='',geral='Geral / cadastro atual'){
    const atual=bruto(valor),especial=atual&&!porId.has(atual)?'<option disabled selected value="'+esc(atual)+'">'+(atual==='__escolher__'?'Escolha a empresa':'Empresa a conferir')+'</option>':'';
    return especial+'<option value="" '+(!bruto(valor)?'selected':'')+'>'+esc(geral)+'</option>'+empresas.map(e=>'<option value="'+e.id+'" '+(bruto(valor)===e.id?'selected':'')+'>'+esc(e.nome)+'</option>').join('');
  }
  function campo(cliente,identificador,valor='',geral){
    if(!ativo(cliente))return '';
    return '<div class="field"><label for="'+esc(identificador)+'">Empresa</label><select id="'+esc(identificador)+'" style="width:100%;min-height:44px;">'+opcoes(valor,geral)+'</select></div>';
  }
  function abas(cliente,valor,acao,nota=''){
    if(!ativo(cliente))return '';
    if(!/^[A-Za-z_$][\w$]*$/.test(acao))throw Error('Ação das empresas inválida.');
    const atual=selecao(valor),lista=[{id:'todos',nome:'Todas'},...empresas,{id:'geral',nome:'Geral / anteriores'}];
    return '<section style="padding:12px;margin:12px 0;border:1px solid var(--yellow,#fbbc19);border-radius:12px;"><b>Óticas do Otávio</b><div role="group" aria-label="Empresa dos conteúdos" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">'+lista.map(e=>'<button type="button" class="btn '+(atual===e.id?'':'secondary btn-o')+'" aria-pressed="'+(atual===e.id)+'" style="min-height:44px;width:auto;max-width:100%;white-space:normal;padding:8px 12px;'+(atual===e.id?'background:var(--yellow,#fbbc19);color:#171717;':'')+'" onclick="'+acao+'(\''+e.id+'\')">'+esc(e.nome)+'</button>').join('')+'</div>'+(nota?'<p style="font-size:12px;line-height:1.5;margin:10px 0 0;">'+esc(nota)+'</p>':'')+'</section>';
  }
  root.GetEmpresasOtavioI144=Object.freeze({empresas,ativo,id,nome,bruto,selecao,corresponde,filtrar,campos,conferir,projetarPostagem,selo,opcoes,campo,abas});
})(typeof window==='object'?window:globalThis);
