/* I94: primeiro recebimento, nos mesmos documentos criados pela ativação.
 * Sem migração, baixa automática ou alteração do contrato. */
import * as Core from './financeiro-core.mjs?v=109';
const texto=v=>String(v??'').trim();
const finais=['pago','isento','cancelado'];
const igual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validarDadosEntradaI94(dados,hoje){
  const valor=Number(dados.valor), data=texto(dados.data), destino=texto(dados.destino);
  if(!Number.isFinite(valor)||valor<=0||Math.abs(valor*100-Math.round(valor*100))>0.00001) throw Error('Informe o valor recebido, com até duas casas decimais.');
  const parsed=new Date(data+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==data||data>hoje) throw Error('Informe a data real, sem usar uma data futura.');
  if(!['conta_pessoal_chris','conta_agencia'].includes(destino)) throw Error('Escolha a conta que recebeu o pagamento.');
  return {valor:Math.round(valor*100)/100,data,destino};
}
export function validarVinculoEntradaI94(id,entrada,mensalidade,contrato,canonico){
  const cliente=canonico(entrada.cliente), competencia=texto(entrada.competencia);
  if(!cliente||!Core.competenciaValida(competencia)||entrada.mensalidadeId!==cliente+'_'+competencia) throw Error('O primeiro pagamento precisa ter cliente e competência vinculados à mensalidade. Confira o cadastro na Central de Clientes.');
  if(entrada.excluido===true||entrada.status!=='pendente') throw Error('Este primeiro pagamento já foi tratado. Atualize a tela.');
  if(!mensalidade||!contrato) throw Error('O contrato ou a primeira mensalidade não foi encontrado. Confira o cadastro na Central de Clientes.');
  if(canonico(mensalidade.cliente)!==cliente||mensalidade.competencia!==competencia||mensalidade.recebimentoEntradaId!==id||mensalidade.pagamentoEntradaPendente!==true) throw Error('O vínculo do primeiro pagamento diverge da mensalidade. Nada será substituído. Confira o cadastro na Central de Clientes.');
  if(finais.includes(Core.statusMensalidade(mensalidade))) throw Error('Esta mensalidade já foi encerrada. O histórico será preservado.');
  const p=Core.projetarObrigacoes({contratos:[{...contrato,id:cliente,slug:cliente,canonicalId:cliente}],pagamentos:[{...mensalidade,id:entrada.mensalidadeId,canonicalId:cliente}],competencia});
  const linha=p.linhas.find(v=>v.canonicalId===cliente&&v.estado==='confirmado');
  if(!linha||!(Number(linha.valorDevido)>0)) throw Error('O contrato e a mensalidade precisam ser conferidos antes do recebimento. Abra os dados do contrato.');
  return {cliente,competencia,valorPrevisto:Number(linha.valorDevido),mensalidadeId:entrada.mensalidadeId};
}
function versao(entrada,mensalidade,contrato){
  // Comparação sem ordem de mapas; apenas os campos que governam esta ação.
  return [entrada.cliente,entrada.competencia,entrada.mensalidadeId,entrada.status,entrada.excluido===true,entrada.valorPrevisto,
    mensalidade.cliente,mensalidade.competencia,mensalidade.status,mensalidade.valorDevido,mensalidade.recebimentoEntradaId,mensalidade.pagamentoEntradaPendente,
    contrato.financeiroRevision??0,contrato.status,contrato.primeiraCompetencia,contrato.ultimaCompetenciaPagamento,contrato.valorVigente,contrato.valorProgramado,contrato.valorProgramadoEm];
}
export function instalarEntradaFinanceiraI94(deps){
  const {db,doc,runTransaction,getDocFromServer,serverTimestamp,auth,usuarioAtual,canFinanceiro,slugClienteCanonico,hojeLocal,brl,nomeMes,esc,escAttr,escJs,mostrarToast,aposConfirmar}=deps;
  const w=globalThis;let atual=null,geracao=0;
  function autorizado(uid){if(!canFinanceiro()||!auth.currentUser?.uid||(uid&&uid!==auth.currentUser.uid)) throw Error('Reabra o Financeiro com a conta do Chris.');}
  function refs(id,e){return {entrada:doc(db,'recebimentos_entrada_pessoal',id),mensalidade:doc(db,'pagamentos_mensais',e.mensalidadeId),contrato:doc(db,'contratos_cliente',slugClienteCanonico(e.cliente))};}
  async function ler(id){
    autorizado();const s=await getDocFromServer(doc(db,'recebimentos_entrada_pessoal',id));
    if(!s.exists()) throw Error('O controle de primeiro pagamento não foi encontrado. Atualize a tela.');
    const e=s.data();
    if(!texto(e.mensalidadeId)||e.mensalidadeId.includes('/')||!texto(e.cliente)) throw Error('O controle de entrada está sem vínculo com a mensalidade. Confira o cadastro na Central de Clientes.');
    const r=refs(id,e),[p,c]=await Promise.all([getDocFromServer(r.mensalidade),getDocFromServer(r.contrato)]);
    const m=p.exists()?p.data():null,ct=c.exists()?c.data():null;
    const vinculo=validarVinculoEntradaI94(id,e,m,ct,slugClienteCanonico);
    return {e,m,ct,r,vinculo,versao:versao(e,m,ct)};
  }
  function mensagem(textoErro){const el=document.getElementById('entradaI94Aviso');if(el){el.textContent=textoErro;el.hidden=false;}else mostrarToast(textoErro,'erro');}
  w.fecharEntradaFinanceiraI94=()=>{if(atual?.ocupado)return false;geracao++;atual=null;document.getElementById('overlayView')?.classList.remove('show');return true;};
  w.abrirEntradaFinanceiraI94=async id=>{
    if(atual?.ocupado)return false;
    const g=++geracao;const uid=auth.currentUser?.uid;
    try{
      autorizado(uid);const dados=await ler(texto(id));autorizado(uid);if(g!==geracao)return false;
      const modal=document.getElementById('modalConteudo'),overlay=document.getElementById('overlayView');
      if(!modal||!overlay)throw Error('Não foi possível abrir o primeiro pagamento. Reabra o Financeiro.');
      atual={...dados,id,uid,ocupado:false,op:'entrada_i94_'+crypto.randomUUID(),enviado:null};
      modal.innerHTML=`<div data-entrada-i94><style>#overlayView:has([data-entrada-i94]){z-index:500}</style><h2>Confirmar primeiro pagamento</h2><div class="item"><b>${esc(dados.e.clienteNome||dados.e.cliente)}</b><div class="meta">${esc(nomeMes(dados.vinculo.competencia))} · previsto ${brl(dados.vinculo.valorPrevisto)}</div></div><p class="desc">Preencha o que recebeu. A mensalidade será quitada; o contrato mantém seu valor.</p><div class="row2"><div class="field"><label for="entradaI94Valor">Valor recebido</label><input id="entradaI94Valor" type="number" min="0.01" step="0.01" value="${escAttr(dados.vinculo.valorPrevisto.toFixed(2))}"></div><div class="field"><label for="entradaI94Data">Data do recebimento</label><input id="entradaI94Data" type="date" max="${escAttr(hojeLocal())}" value="${escAttr(hojeLocal())}"></div></div><div class="field"><label for="entradaI94Conta">Conta que recebeu</label><select id="entradaI94Conta"><option value="">Selecione a conta</option><option value="conta_pessoal_chris">Conta pessoal do Chris</option><option value="conta_agencia">Conta da agência</option></select></div><p id="entradaI94Aviso" role="status" hidden style="color:var(--red)"></p><div class="btnrow"><button class="btn green" id="entradaI94Confirmar" onclick="confirmarEntradaFinanceiraI94()">Confirmar recebimento</button><button class="btn secondary" id="entradaI94Fechar" onclick="fecharEntradaFinanceiraI94()">Fechar</button></div></div>`;
      overlay.classList.add('show');document.getElementById('entradaI94Valor')?.focus();return true;
    }catch(e){mostrarToast(e.message||String(e),'erro');return false;}
  };
  w.abrirPrimeiroPagamentoMensalidadeI94=async mensalidadeId=>{
    try{autorizado();const s=await getDocFromServer(doc(db,'pagamentos_mensais',mensalidadeId));if(!s.exists()||!texto(s.data().recebimentoEntradaId))throw Error('O primeiro pagamento está sem controle de entrada vinculado. Confira o cadastro na Central de Clientes.');return w.abrirEntradaFinanceiraI94(s.data().recebimentoEntradaId);}catch(e){mostrarToast(e.message,'erro');return false;}
  };
  async function conferirRecibo(ctx){
    const [e,m]=await Promise.all([getDocFromServer(ctx.r.entrada),getDocFromServer(ctx.r.mensalidade)]);
    const a=e.data(),b=m.data();
    return e.exists()&&m.exists()&&a.operationIdI94===ctx.op&&a.status==='pago'&&b.status==='pago'&&b.recebimentoEntradaId===ctx.id&&b.origemRecebimento==='entrada_contrato'&&b.pagamentoEntradaPendente===false&&a.pagoEm===ctx.enviado.data&&b.pagoEm===ctx.enviado.data&&a.valorConfirmado===ctx.enviado.valor&&a.destino===ctx.enviado.destino;
  }
  w.confirmarEntradaFinanceiraI94=async()=>{
    const ctx=atual;if(!ctx||ctx.ocupado)return false;
    try{autorizado(ctx.uid);}catch(e){mensagem(e.message);return false;}
    if(!ctx.enviado){
      let d;try{d=validarDadosEntradaI94({valor:document.getElementById('entradaI94Valor')?.value,data:document.getElementById('entradaI94Data')?.value,destino:document.getElementById('entradaI94Conta')?.value},hojeLocal());}catch(e){mensagem(e.message);return false;}
      if(!confirm(`Confirmar ${brl(d.valor)} recebido em ${d.data.split('-').reverse().join('/')} na ${d.destino==='conta_agencia'?'conta da agência':'conta pessoal do Chris'} e quitar esta primeira mensalidade?`))return false;
      ctx.enviado=d;
    }
    ctx.ocupado=true;const botao=document.getElementById('entradaI94Confirmar');
    ['entradaI94Valor','entradaI94Data','entradaI94Conta','entradaI94Confirmar','entradaI94Fechar'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=true;});
    let comprovado=false;
    try{
      autorizado(ctx.uid);
      await runTransaction(db,async tx=>{
        autorizado(ctx.uid);const [e,m,c]=await Promise.all([tx.get(ctx.r.entrada),tx.get(ctx.r.mensalidade),tx.get(ctx.r.contrato)]);
        if(!e.exists()||!m.exists()||!c.exists())throw Error('Uma fonte deste recebimento mudou ou não foi encontrada. Reabra o controle.');
        const a=e.data(),b=m.data(),ct=c.data();
        if(a.operationIdI94===ctx.op&&a.status==='pago')return;
        const v=validarVinculoEntradaI94(ctx.id,a,b,ct,slugClienteCanonico);
        if(!igual(ctx.versao,versao(a,b,ct)))throw Error('Os dados mudaram em outra aba. Seu formulário foi preservado; reabra o controle para conferir a nova versão.');
        const d=ctx.enviado;
        tx.update(ctx.r.entrada,{status:'pago',destino:d.destino,foraCaixaAgencia:d.destino==='conta_pessoal_chris',pagoEm:d.data,valorConfirmado:d.valor,valorPrevisto:v.valorPrevisto,confirmadoPor:usuarioAtual(),confirmadoEm:serverTimestamp(),atualizadoEm:serverTimestamp(),operationIdI94:ctx.op});
        tx.update(ctx.r.mensalidade,{status:'pago',pagoEm:d.data,origemRecebimento:'entrada_contrato',pagamentoEntradaPendente:false,recebimentoEntradaId:ctx.id,atualizadoPor:usuarioAtual(),atualizadoEm:serverTimestamp()});
      });
      comprovado=await conferirRecibo(ctx);
      if(!comprovado)throw Error('O servidor ainda não confirmou os dois registros. Use “Conferir confirmação” sem lançar outro pagamento.');
    }catch(e){
      try{autorizado(ctx.uid);comprovado=await conferirRecibo(ctx);}catch{}
      if(!comprovado)mensagem((e.message||String(e))+' O texto permanece nesta tela.');
    }finally{
      ctx.ocupado=false;
      // Após tentativa, conservar payload/operação para retentativa segura.
      ['entradaI94Confirmar','entradaI94Fechar'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=false;});
      if(botao)botao.textContent='Conferir confirmação';
    }
    if(!comprovado)return false;
    if(atual===ctx){w.fecharEntradaFinanceiraI94();}
    mostrarToast('Primeiro pagamento confirmado. Mensalidade quitada e conta registrada.');
    try{autorizado(ctx.uid);await aposConfirmar();}catch{mostrarToast('Pagamento confirmado. Reabra o Financeiro para atualizar os totais.','erro');}
    return true;
  };
  return {html(fontes,competencia){
    const entradas=(fontes.recebimentos_entrada_pessoal||[]).filter(e=>e.excluido!==true);
    const pendentes=entradas.filter(e=>e.status==='pendente').sort((a,b)=>texto(a.competencia).localeCompare(texto(b.competencia))||texto(a.clienteNome).localeCompare(texto(b.clienteNome)));
    const revisoes=new Map();
    for(const e of pendentes){try{validarVinculoEntradaI94(e.id,e,(fontes.pagamentos||[]).find(p=>p.id===e.mensalidadeId),(fontes.contratos||[]).find(c=>c.id===slugClienteCanonico(e.cliente)),slugClienteCanonico);}catch(erro){revisoes.set(e.id,erro.message);}}
    const pagos=entradas.filter(e=>e.status==='pago'&&texto(e.pagoEm).slice(0,7)===competencia);
    const linha=e=>`<div class="item"><div class="top"><b>${esc(e.clienteNome||e.cliente)}</b><span class="selo ${e.status==='pago'?'aprovada':'hoje'}">${e.status==='pago'?'Recebido':revisoes.has(e.id)?'Conferir cadastro':'Primeiro pagamento pendente'}</span></div><div class="meta">${esc(nomeMes(e.competencia))} · ${brl(e.status==='pago'?e.valorConfirmado??e.valorPrevisto:e.valorPrevisto)}</div>${e.status==='pendente'&&revisoes.has(e.id)?`<p class="desc">${esc(revisoes.get(e.id))}</p>`:e.status==='pendente'?`<button class="btn green" style="width:auto;margin-top:8px" onclick="abrirEntradaFinanceiraI94('${escJs(e.id)}')">Confirmar primeiro pagamento</button>`:`<div class="meta">Recebido em ${esc(e.pagoEm)} · ${e.destino==='conta_agencia'?'Conta da agência':e.destino==='conta_pessoal_chris'?'Conta pessoal do Chris':'Conta a conferir'}</div>`}</div>`;
    return `<section class="card" data-primeiros-pagamentos-i94><h2>Primeiros pagamentos</h2><p class="desc">Pendências de entrada de todos os meses. Confirme somente valores já recebidos.</p>${pendentes.map(linha).join('')||'<div class="empty">Nenhum primeiro pagamento pendente.</div>'}${pagos.length?`<details style="margin-top:12px"><summary>Recebidos em ${esc(nomeMes(competencia))} (${pagos.length})</summary>${pagos.map(linha).join('')}</details>`:''}</section>`;
  }};
}
