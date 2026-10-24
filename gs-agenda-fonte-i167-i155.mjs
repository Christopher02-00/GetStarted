/* A obrigação e suas datas permanecem na demanda I167. Esta ponte não escreve nela. */
import {assinaturaOrganizacaoI167} from './gs-organizacao-social-repo-i167.mjs';
const ETAPAS = ['pesquisa','previa','reuniao','consolidado','criacao','revisao','disponivel'];
const CORRESPONDENCIA = Object.freeze({referencias:'pesquisa',pesquisa:'pesquisa',previa:'previa',reuniao:'reuniao',consolidado:'consolidado',criacao:'criacao',revisao:'revisao',liberacao:'disponivel',disponivel:'disponivel'});
const EMPRESAS = ['', 'otica_hauer','otica_sao_jose','clinica_olhos_hauer','clinica_sao_jose'];
const erro = mensagem => {throw Error(mensagem);};
const idValido = v => typeof v==='string' && /^[A-Za-z0-9_-]{1,180}$/u.test(v);
const dados = r => r?.documento || r?.dados || {};
export function camposAgendaI167(d) {
  const m=d?.agendaOrganizacaoI167||{};
  return {inicio:m.inicio||'',prazo:d.prazoData||'',prazoHora:d.prazoHora||'19:00',responsavel:d.destinatario||'',prioridade:m.prioridade||'normal',fixo:m.fixo===true};
}
function validarFonte(d,c,etapa,empresaId) {
  const m=d?.agendaOrganizacaoI167;
  if(d?.tipoEspecial!=='organizacao_social_i167'||m?.versao!==1||d.cliente!==c.cliente||m.mes!==c.competencia)erro('O compromisso pertence a outro cliente ou mês. Abra a organização correta.');
  if(d.excluido||d.arquivado||m.arquivada||['cancelada','cancelado'].includes(d.status))erro('Este compromisso saiu da operação. A ficha e o histórico continuam preservados; escolha uma etapa ativa.');
  if(!ETAPAS.includes(etapa))erro('Confira a etapa do Planejamento.');
  if(!EMPRESAS.includes(empresaId)||String(m.empresaId||'')!==empresaId||String(d.empresaOtavio||'')!==empresaId||c.cliente!=='zeiss'&&empresaId!=='')erro('A empresa do compromisso não corresponde à escolha.');
  if(CORRESPONDENCIA[m.etapa]&&CORRESPONDENCIA[m.etapa]!==etapa)erro('Este compromisso está identificado como outra etapa. Escolha a etapa correspondente.');
  if(!['Chris','Amanda','Fernanda'].includes(d.destinatario)||!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d.prazoData||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.prazoHora||'19:00'))erro('Confira o responsável e o prazo na Organização das datas antes de vincular.');
  return m;
}
export async function candidatasAgendaI167(linhas,{cliente,competencia}) {
  const out=[];
  for(const r of linhas||[]) {
    const d=dados(r),m=d.agendaOrganizacaoI167;
    if(!idValido(r.id)||d.tipoEspecial!=='organizacao_social_i167'||m?.versao!==1||d.cliente!==cliente||m.mes!==competencia)continue;
    out.push({id:r.id,documento:d,assinatura:await assinaturaOrganizacaoI167(d),titulo:d.titulo||'',empresaId:String(m.empresaId||''),etapaOrganizacao:m.etapa,etapaSugerida:CORRESPONDENCIA[m.etapa]||'',status:d.status||'pendente',...camposAgendaI167(d)});
  }
  return out;
}
export function selecionarFonteAgendaI167(candidatas,{etapa,empresaId='',demandaId=''}) {
  const escolhas=candidatas.filter(r=>r.empresaId===empresaId&&(!r.etapaSugerida||r.etapaSugerida===etapa));
  if(!demandaId) {
    if(escolhas.length>1)erro('Há mais de um compromisso para esta etapa. Escolha a ficha exata; nada será mesclado.');
    erro('Escolha explicitamente o compromisso da Organização das datas.');
  }
  const r=escolhas.find(x=>x.id===demandaId);if(!r)erro('O compromisso escolhido não corresponde à empresa e à etapa.');return r;
}
export function proporVinculoAgendaI167(r,c,etapa) {
  if(!idValido(r?.id)||!/^[a-f0-9]{64}$/.test(r.assinatura||''))erro('A versão do compromisso não foi conferida. Consulte novamente.');
  const d=dados(r),empresaId=String(d.agendaOrganizacaoI167?.empresaId||''),m=validarFonte(d,c,etapa,empresaId),campos=camposAgendaI167(d);
  return {...c.agenda[etapa],...campos,origemI167:{schema:1,demandaId:r.id,cliente:c.cliente,competencia:c.competencia,empresaId,etapa,etapaOrganizacao:m.etapa,assinatura:r.assinatura,campos}};
}
export async function conferirVinculoAgendaI167(tx,io,c,etapa,a,{adocao=false}={}) {
  const o=a?.origemI167;
  if(o?.schema!==1||!idValido(o.demandaId)||o.cliente!==c.cliente||o.competencia!==c.competencia||o.etapa!==etapa)erro('O vínculo da organização está inconsistente. Nada foi alterado.');
  const s=await tx.get(io.doc(io.db,'demandas',o.demandaId));if(!s.exists())erro('Não consegui confirmar a ficha de origem. A etapa não foi recriada.');
  const d=s.data(),m=validarFonte(d,c,etapa,o.empresaId),campos=camposAgendaI167(d);
  if(m.etapa!==o.etapaOrganizacao||JSON.stringify(campos)!==JSON.stringify(o.campos)||Object.keys(campos).some(k=>a[k]!==campos[k]))erro('As datas ou o responsável mudaram na Organização das datas. Consulte e confirme essa ficha novamente; as entregas foram preservadas.');
  if(adocao&&await assinaturaOrganizacaoI167(d)!==o.assinatura)erro('A ficha mudou depois da sua leitura. Consulte novamente antes de vincular; a entrega atual foi preservada.');
  return {id:o.demandaId,etapa,empresaId:o.empresaId,titulo:d.titulo||'',status:d.status||'pendente',aguardandoAmanda:d.status==='concluida_aguardando_aprovacao',fonte:'demandas',campos};
}
export function conferirIdsAgendaI167(agenda) {
  const ids=ETAPAS.map(k=>agenda[k]?.origemI167?.demandaId).filter(Boolean);
  if(new Set(ids).size!==ids.length)erro('Uma mesma ficha não pode representar duas etapas. Escolha um compromisso para cada uma.');
}
export async function projetarFontesAgendaI167(io,c) {
  const fontes={};
  for(const etapa of ETAPAS) {
    const o=c.agenda[etapa]?.origemI167;if(!o)continue;
    try {
      const s=await io.getDocFromServer(io.doc(io.db,'demandas',o.demandaId));if(!s.exists())erro('Não consegui confirmar a ficha de origem.');
      const d=s.data();validarFonte(d,c,etapa,o.empresaId);const campos=camposAgendaI167(d);
      fontes[etapa]={id:o.demandaId,status:d.status||'pendente',aguardandoAmanda:d.status==='concluida_aguardando_aprovacao',campos,desatualizada:JSON.stringify(campos)!==JSON.stringify(o.campos),conferida:true};
    } catch(e) {fontes[etapa]={id:o.demandaId,conferida:false,erro:e.message||'A origem não foi conferida.'};}
  }
  Object.defineProperty(c,'fontesAgendaI167',{value:fontes,enumerable:false,configurable:true});return c;
}
