import crypto from 'node:crypto';
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function ocorrenciaOrganizacaoI167(d,agora=new Date()) {
 const m=d?.agendaOrganizacaoI167;if(d?.tipoEspecial!=='organizacao_social_i167'||m?.versao!==1||!d.id||!d.cliente||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(m.mes||''))return null;
 if(d.excluido||d.arquivado||m.arquivada||['aprovada','cancelada','cancelado'].includes(d.status))return null;
 const entregue=d.status==='concluida_aguardando_aprovacao';if(!entregue&&!['pendente','em_andamento','refazer'].includes(d.status||''))return null;
 const prazo=String(d.prazoData||'')+'T'+String(d.prazoHora||'19:00'),instante=Date.parse(prazo+'-03:00');if(!Number.isFinite(instante))throw Error('O prazo da demanda I167 precisa de conferência. Nenhuma data foi inventada.');
 const falta=instante-agora.getTime(),nivel=entregue?'revisar':falta<=0?'atrasado':falta<=14400000?'hoje':falta<=86400000?'vespera':'aguardando';
 const destinatario=entregue?'Amanda':d.destinatario;if(!['Chris','Amanda','Fernanda','Cecília','Gabrielle','Helo','João Victor','Luís','Nathan','Yas'].includes(destinatario))throw Error('O responsável da organização precisa de conferência.');
 const origem={tipo:'organizacao_i167',id:d.id,cliente:d.cliente,competencia:m.mes,empresaId:String(m.empresaId||'')};
 const versao=hash([origem,destinatario,nivel,prazo,d.status,m.revisao||0]);
 return {id:hash(['organizacao_i167',d.id]),origem,versao,destinatario,nivel,prazo,titulo:entregue?'Uma entrega está esperando sua conferência':d.titulo||'Seu próximo compromisso',texto:entregue?'A entrega está na mesma demanda. Dá uma olhada na prova antes de aprovar.':(d.clienteNome||d.cliente)+' · prazo '+d.prazoData+' às '+(d.prazoHora||'19:00')+'. Abra a mesma ficha para continuar.',link:{area:'organizacao',demandaId:d.id,cliente:d.cliente,competencia:m.mes,empresaId:String(m.empresaId||'')}};
}
export async function lerOcorrenciaOrganizacaoI167(db,id,agora=new Date()) {
 const s=await db.doc('demandas/'+id).get();return s.exists?ocorrenciaOrganizacaoI167({...s.data(),id:s.id},agora):null;
}
export function canaisDaVersaoOrganizacaoI167(antiga,versao) {
 if(antiga?.versao===versao)return antiga.canais||{};
 // Um envio sem resultado continua reservado; nova fase nunca autoriza repetir às cegas.
 return Object.fromEntries(Object.entries(antiga?.canais||{}).filter(([,v])=>['resultado_desconhecido','em_andamento'].includes(v?.estado)));
}
