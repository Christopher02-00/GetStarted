import {novaAgenda,ETAPAS} from './lib/gs-planejamento-social-i155.mjs';
import {candidatasAgendaI167,selecionarFonteAgendaI167,proporVinculoAgendaI167} from './lib/gs-agenda-fonte-i167-i155.mjs';
export async function agendaDasFontesI167({cliente,competencia,linhas}) {
 const c={cliente,competencia,agenda:novaAgenda()},fontes=await candidatasAgendaI167(linhas,c),ids=new Set();
 for(const [etapa]of ETAPAS){const candidatas=fontes.filter(r=>r.etapaSugerida===etapa&&!r.documento.excluido&&!r.documento.agendaOrganizacaoI167?.arquivada&&!['cancelada','cancelado'].includes(r.status));
  if(candidatas.length!==1)throw Error(candidatas.length?'Há mais de um compromisso para '+etapa+'. Amanda precisa vincular as fichas exatas na Central.':'A Organização das datas ainda precisa do compromisso de '+etapa+'. Nenhuma data ou demanda foi criada.');
  const r=selecionarFonteAgendaI167(candidatas,{etapa,empresaId:candidatas[0].empresaId,demandaId:candidatas[0].id});if(ids.has(r.id))throw Error('Um compromisso não pode representar duas etapas.');ids.add(r.id);c.agenda[etapa]={...proporVinculoAgendaI167(r,c,etapa),fonteOrganizacaoI167:true};
 }
 return c.agenda;
}
