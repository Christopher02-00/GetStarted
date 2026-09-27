// Acompanhamento do cliente: independente da execução individual da equipe.
export function tempoDemandaI93(v){
  if(typeof v?.toMillis==='function')return v.toMillis();
  if(v&&Number.isFinite(v.seconds))return v.seconds*1000+(v.nanoseconds||0)/1e6;
  if(typeof v==='string')return Date.parse(v)||0;
  return 0;
}
export function statusDemandaI93(d){
  if(d?.status==='cancelada'||d?.cancelado===true)return 'cancelada';
  const manual=d?.acompanhamentoManualI93?.status;
  return ['concluida','andamento'].includes(manual)?manual:String(d?.status||'pendente');
}
export function gruposDemandasI93(lista,agora=Date.now()){
  const grupos={abertas:[],recentes:[],historico:[]};
  for(const d of lista||[]){
    if(!d||d.excluido)continue;
    const status=statusDemandaI93(d),em=tempoDemandaI93(d.acompanhamentoManualI93?.status==='concluida'?d.acompanhamentoManualI93.concluidoEm:d.concluidaEmI93);
    if(status==='cancelada')grupos.historico.push(d);
    else if(status!=='concluida')grupos.abertas.push(d);
    else if(em>0&&agora-em<5*86400000)grupos.recentes.push(d);
    else grupos.historico.push(d);
  }
  return grupos;
}
export function assinaturaDemandaI93(d){
  return JSON.stringify(['cliente','clienteNome','titulo','texto','descricao','observacoes','prazoData','excluido','acompanhamentoManualI93','revisaoAcompanhamentoI93'].map(k=>d?.[k]??null));
}
export function camposEdicaoI93(v){
  const titulo=String(v.titulo||'').trim(),descricao=String(v.descricao||'').trim(),observacoes=String(v.observacoes||'').trim(),prazoData=String(v.prazoData||'');
  if(!titulo)throw Error('Informe o título.');
  if(titulo.length>500||descricao.length>15000||observacoes.length>15000)throw Error('O texto está muito longo. Reduza antes de salvar.');
  if(prazoData&&!/^\d{4}-\d{2}-\d{2}$/.test(prazoData))throw Error('Confira a data de entrega.');
  return {titulo,texto:titulo,descricao,observacoes,prazoData};
}
export function patchSincroniaDemandaI93(atual,calculado,agora){
  const manual=atual.acompanhamentoManualI93?.status;
  const status=['concluida','andamento'].includes(manual)?manual:calculado.status;
  const patch={status,responsaveisStatus:calculado.responsaveisStatus,atualizadoEm:agora};
  // Legado concluído sem data continua sem data; repetição não renova a janela.
  if(!manual&&status==='concluida'&&atual.status!=='concluida')patch.concluidaEmI93=agora;
  if(!manual&&status!=='concluida'&&atual.status==='concluida')patch.concluidaEmI93=null;
  return patch;
}
