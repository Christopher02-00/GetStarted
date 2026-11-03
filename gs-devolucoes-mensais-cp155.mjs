/* Shared read-only cache. Never inserts projections into physical demandas. */
const TIPO='calendario_devolucao_cp155',e=(ok,msg)=>{if(!ok)throw Error(msg);},campos=['uid','nome','atorReal','sessao','geracao','anonimo'];
const chave=c=>JSON.stringify(campos.map(k=>c?.[k]??null)),scope=x=>JSON.stringify([x?.ciclo??x?.origem?.id,x?.origemEditorial??x?.origem?.origemEditorial??'']);
export function criarCacheDevolucoesCp155(contexto){
 let identidade='',geracao=0,ultima=0,lote=null,erro='',errosFontes=[];
 function sincronizar(){const c=contexto();if(chave(c)!==identidade){identidade=chave(c);geracao++;ultima=0;lote=null;erro='';errosFontes=[];}return c;}
 function iniciar(){const c=sincronizar();e(c?.nome==='Chris'&&c.uid&&!c.anonimo,'Abra o perfil do Chris.');return {identidade,geracao,consulta:++ultima};}
 function vigente(t){sincronizar();return t?.identidade===identidade&&t.geracao===geracao&&t.consulta===ultima;}
 function aplicar(t,novo){if(!vigente(t))return false;try{
  e(novo?.schema===1&&novo.destinatario==='Chris'&&novo.completa===true&&Array.isArray(novo.linhas),'Não consegui conferir a lista inteira. Os dados anteriores continuam visíveis.');
  const falhas=novo.erros||[];e(Array.isArray(falhas)&&falhas.every(x=>x&&x.codigo==='CP155_FONTE_NAO_CONFERIDA'&&(x.ciclo===null||/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(x.ciclo))&&['','continuar_legado'].includes(x.origemEditorial||'')&&typeof x.mensagem==='string'&&x.mensagem.length<=800),'Não consegui conferir as falhas da lista.');
  const falhasScope=new Set(falhas.filter(x=>x.ciclo).map(scope)),global=falhas.some(x=>x.ciclo===null),ids=new Set(),novas=[];
  for(const d of novo.linhas){e(d.tipo===TIPO&&d.destinatario==='Chris'&&d.estado==='pendente'&&/^retorno_mensal_cp155_[a-f0-9]{64}$/.test(d.id||'')&&!Object.hasOwn(d,'origemNaoConferidaCp155')&&/^[a-f0-9]{64}$/.test(d.versao||'')&&!ids.has(d.id),'A fonte devolvida precisa de conferência.');e(d.origem?.tipo===TIPO&&/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(d.origem.id||'')&&d.origem.id===d.origem.competencia+'__'+d.origem.cliente&&(!d.origem.origemEditorial||d.origem.origemEditorial==='continuar_legado')&&d.fonte?.id===d.origem.id&&d.fonte.colecao===(d.origem.origemEditorial==='continuar_legado'?'continuidade_calendarios_i164':'planejamento_social_i155')&&d.link?.area==='editor'&&d.link.ciclo===d.origem.id&&d.link.cliente===d.origem.cliente&&d.link.competencia===d.origem.competencia&&(d.link.origemEditorial||'')===(d.origem.origemEditorial||''),'A origem e o destino precisam confirmar o mesmo cliente, mês e fluxo.');ids.add(d.id);novas.push({...structuredClone(d),origemNaoConferidaCp155:falhasScope.has(scope(d))});}
  for(const d of lote?.linhas||[])if(!ids.has(d.id)&&(global||falhasScope.has(scope(d))))novas.push({...structuredClone(d),origemNaoConferidaCp155:true});
  lote={...structuredClone(novo),linhas:novas};errosFontes=structuredClone(falhas);erro='';return true;
 }catch(err){erro=err.message||'Não consegui conferir a lista atual.';throw err;}}
 function falhou(t,mensagem){if(!vigente(t))return false;erro=String(mensagem||'Não consegui conferir agora.');return true;}
 function invalidar(mensagem='A fonte avançou; conferindo a versão atual.'){sincronizar();ultima++;erro=String(mensagem);return {geracao,consulta:ultima};}
 function estado(){sincronizar();return {confirmada:!!lote&&!erro&&!errosFontes.length,conferenciaParcial:!!errosFontes.length,desatualizada:!!erro||!!errosFontes.length,erro,erros:structuredClone(errosFontes),linhas:(lote?.linhas||[]).map(d=>({...structuredClone(d),origemNaoConferidaCp155:!!erro||d.origemNaoConferidaCp155===true}))};}
 function linhaConfirmada(id,versao){sincronizar();return !!lote&&!erro&&lote.linhas.some(d=>d.id===id&&d.versao===versao&&!d.origemNaoConferidaCp155);}
 function cobreNota(n){const s=estado();return n?.origem?.tipo===TIPO&&s.linhas.some(d=>linhaConfirmada(d.id,d.versao)&&d.versao===n.versao&&d.destinatario===n.destinatario&&['tipo','id','cliente','competencia'].every(k=>d.origem[k]===n.origem[k])&&(d.origem.origemEditorial||'')===(n.origem.origemEditorial||''));}
 function cobreDemanda(id){const s=estado();return s.linhas.some(d=>linhaConfirmada(d.id,d.versao)&&d.demandaVinculada?.id===id);}
 return {iniciar,aplicar,falhou,invalidar,estado,linhaConfirmada,cobreNota,cobreDemanda};
}
