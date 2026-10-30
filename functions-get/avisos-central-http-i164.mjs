/* A mesma caixa de avisos, com leitura tipada das fontes da Central.
 * Não cria demanda, não conclui atividade e não expõe documentos privados. */
import {notaCentralI164, ocorrenciasDaFonteCentralI164} from './central/notificacoes.mjs';
import {TIPO_PROVIDENCIA_GRAVACAO_CP140,idAvisoProvidenciaCp140} from './central/providencias-gravacao-cp140.mjs';
import {TIPO_DEMANDA_REFAZER_CP131,PAPEIS_DEMANDA_REFAZER_CP131,idAvisoDemandaRefazerCp131} from './central/demandas-refazer-cp131.mjs';
import {processoAtivoI164} from './central/lib/gs-processo-calendarios-i164.mjs';
import {programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {jsonI165} from './central/lib/gs-programacao-i165.mjs';

export const ESCOPO_AVISOS_CENTRAL_R87 = 'central_i164';
export const TIPOS_AVISOS_CENTRAL_R87 = Object.freeze(['planejamento', 'calendario_revisao', 'calendario_envio', 'referencias_cp109', 'planejamento_estrategico_cp109', 'plano_acao_cp109']);
const tipos = new Set([...TIPOS_AVISOS_CENTRAL_R87, 'organizacao_i167',TIPO_DEMANDA_REFAZER_CP131,TIPO_PROVIDENCIA_GRAVACAO_CP140]);
const id = v => typeof v === 'string' && /^[A-Za-z0-9_.-]{1,220}$/.test(v) && !['.', '..'].includes(v);
const exigir = (ok, mensagem) => { if (!ok) throw Object.assign(new Error(mensagem), {code: 'i164/aviso'}); };
const texto = (v, limite) => typeof v === 'string' ? v.slice(0, limite) : '';
function cicloCp109(v){return typeof v==='string'&&/^20\d{2}-(0[1-9]|1[0-2])__[a-z0-9][a-z0-9._-]{0,119}$/.test(v);}
function clienteCp109(v){return typeof v==='string'&&/^[a-z0-9][a-z0-9._-]{0,119}$/.test(v);}
function novoCp109(tipo){return ['referencias_cp109','planejamento_estrategico_cp109','plano_acao_cp109'].includes(tipo);}
function validarNotaCp109(n,papel){
 const o=n.origem;exigir(/^[a-f0-9]{64}$/.test(n.id),'O aviso novo precisa do ID físico determinístico.');
 if(o.tipo==='referencias_cp109'){
  exigir(papel==='Gabrielle','O retorno das referências pertence à Gabi.');
  if(o.subtipo==='diario'){exigir(/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(o.dia||'')&&o.id==='diario_'+o.dia,'Confira o dia da rotina de referências.');}
  else exigir(o.subtipo==='reprovada'&&/^decisao_[a-f0-9]{64}$/.test(o.id)&&['referencias','referencias_cliente'].includes(o.colecao)&&id(o.referenciaId)&&id(o.operacao)&&clienteCp109(o.cliente),'O retorno precisa confirmar a origem física da referência.');
 }else if(o.tipo==='planejamento_estrategico_cp109'){
  exigir(cicloCp109(o.id)&&['roteiros','revisao','retorno','envio'].includes(o.etapa)&&o.ativacaoId===n.ativacaoId,'A estratégia precisa confirmar o mesmo cliente, mês e ativação.');
  exigir(papel===(o.etapa==='revisao'?'Amanda':o.etapa==='envio'?'Cecília':'Chris'),'Esta etapa estratégica pertence a outro responsável.');
 }else exigir(cicloCp109(o.id)&&o.subtipo==='solicitacao_conteudo'&&id(o.acaoId)&&id(o.operacao)&&papel==='Amanda','Esta solicitação pertence à Amanda e à mesma ação física.');
}
function origemDtoCp109(n,atual){const o=n.origem,tipo=o.tipo;
 if(tipo==='referencias_cp109')return {tipo,id:o.id,subtipo:o.subtipo,...(o.subtipo==='diario'?{dia:o.dia,competencia:o.dia.slice(0,7)}:{colecao:o.colecao,referenciaId:o.referenciaId,operacao:o.operacao,cliente:o.cliente,competencia:(atual?.link?.competencia||n.link?.competencia||'')})};
 return {tipo,id:o.id,cliente:o.id.slice(9),competencia:o.id.slice(0,7),...(tipo==='planejamento_estrategico_cp109'?{etapa:o.etapa,ativacaoId:o.ativacaoId}:{subtipo:o.subtipo,acaoId:o.acaoId,operacao:o.operacao})};
}
function fonteDtoCp109(n){const o=n.origem;if(o.tipo==='referencias_cp109')return o.subtipo==='diario'?{colecao:'notificacoes_operacionais_i165',id:n.id}:{colecao:o.colecao,id:o.referenciaId};return {colecao:o.tipo==='plano_acao_cp109'?'planos_acao_cp109':'planejamento_estrategico_cp109',id:o.id};}

/* Adaptador só de leitura: todas as fontes pertencem à mesma transação.
 * Cache é da requisição, nunca compartilhado por Google/perfil/revisão. */
export function leituraCentralTxR87(db, tx) {
  const cache = new Map();
  const ler = (chave, ref, colecao = false) => {
    if (!cache.has(chave)) cache.set(chave, Promise.resolve(tx.get(ref)).then(s => {
      if (colecao) exigir(s.size <= 1000, 'A origem tem mais registros que esta conferência comporta. Nenhum dado foi cortado.');
      return s;
    }));
    return cache.get(chave);
  };
  const consulta = (ref, chave) => ({
    where: (campo, op, valor) => consulta(ref.where(campo, op, valor), chave + '|' + jsonI165([campo, op, valor])),
    get: () => ler(chave, ref.limit(1001), true)
  });
  return {
    doc: caminho => ({get: () => ler(caminho, db.doc(caminho))}),
    collection: caminho => consulta(db.collection(caminho), caminho)
  };
}

export function validarPapelNotaCentralR87(n, papel) {
  exigir(notaCentralI164(n) && n.schema === 1 && id(n.id) && ['pendente', 'resolvida'].includes(n.estado) && /^[a-f0-9]{64}$/.test(n.versao || ''), 'O aviso precisa confirmar sua origem e revisão.');
  exigir(n.destinatario === papel, 'Este aviso pertence a outro perfil.');
  const tipo = n.origem.tipo;
  exigir(tipos.has(tipo) && id(n.origem.id), 'O tipo de aviso não pertence à Central.');
  if (tipo === 'calendario_revisao') exigir(papel === 'Amanda', 'A revisão pertence à Amanda.');
  if (tipo === 'calendario_envio') exigir(papel === 'Cecília', 'O envio pertence à Cecília.');
  if (tipo === 'planejamento') {
    exigir(['Chris', 'Amanda', 'Gabrielle'].includes(papel), 'Esta etapa pertence à preparação.');
    if (papel === 'Gabrielle') exigir(n.origem.etapa === 'pesquisa', 'A pesquisa não dá acesso à criação ou revisão editorial.');
  }
  if(tipo===TIPO_DEMANDA_REFAZER_CP131)exigir(PAPEIS_DEMANDA_REFAZER_CP131.includes(papel)&&n.id===idAvisoDemandaRefazerCp131(n.origem,papel)&&id(n.origem.operacao)&&n.origem.operacao.length>=8&&Object.keys(n.origem).every(k=>['tipo','id','operacao'].includes(k)),'O retorno precisa confirmar a rodada da própria demanda.');
  if(tipo===TIPO_PROVIDENCIA_GRAVACAO_CP140)exigir(['Cecília','Amanda'].includes(papel)&&/^prov140_[a-f0-9]{64}$/.test(n.origem.id)&&Object.keys(n.origem).every(k=>['tipo','id'].includes(k))&&n.id===idAvisoProvidenciaCp140(n.origem,n.versao,papel,n.nivel),'A providência precisa confirmar a mesma demanda e seu destinatário.');
  if(novoCp109(tipo))validarNotaCp109(n,papel);
  return tipo;
}

export async function candidatasCentralTxR87(db, tx, ator, cfg, limite = 100) {
  const ps = await tx.get(db.doc('processo_calendarios_i164/ativo')), processo = ps.data();
  if (ps.exists && processo?.ativo !== false) exigir(processoAtivoI164(processo), 'A configuração do processo precisa de conferência; a lista anterior foi preservada.');
  const centralAtiva = processoAtivoI164(processo), organizacaoAtiva = cfg?.habilidades?.organizacao === true, devolucoesAtivas=programacaoAtivaI165(cfg)&&PAPEIS_DEMANDA_REFAZER_CP131.includes(ator.papel);
  const providenciasAtivas=programacaoAtivaI165(cfg)&&cfg.habilidades?.preparacaoCentral===true&&['Cecília','Amanda'].includes(ator.papel);
  const base = () => db.collection('notificacoes_operacionais_i165').where('destinatario', '==', ator.papel).where('estado', '==', 'pendente');
  const consultas = [];
  if (centralAtiva && ['Chris', 'Amanda', 'Gabrielle', 'Cecília'].includes(ator.papel)) {
    consultas.push(base().where('ativacaoId', '==', processo.ativacaoId).where('origem.tipo', 'in', TIPOS_AVISOS_CENTRAL_R87).orderBy('__name__').limit(limite + 1));
  }
  if(devolucoesAtivas)consultas.push(base().where('ativacaoId','==',cfg.ativacaoId).where('origem.tipo','==',TIPO_DEMANDA_REFAZER_CP131).orderBy('__name__').limit(limite+1));
  if(providenciasAtivas)consultas.push(base().where('ativacaoId','==',cfg.ativacaoId).where('origem.tipo','==',TIPO_PROVIDENCIA_GRAVACAO_CP140).orderBy('__name__').limit(limite+1));
  if (organizacaoAtiva) consultas.push(base().where('ativacaoId', '==', cfg.ativacaoId).where('origem.tipo', '==', 'organizacao_i167').orderBy('__name__').limit(limite + 1));
  const snapshots = await Promise.all(consultas.map(q => tx.get(q)));
  return {processo, centralAtiva, organizacaoAtiva, devolucoesAtivas, docs: snapshots.flatMap(s => s.docs), truncado: snapshots.some(s => s.size > limite)};
}

function canaisPublicos(canais) {
  const saida = {};
  const estados = ['pendente', 'enviado', 'aceita_pelo_provedor', 'falha', 'resultado_desconhecido', 'em_andamento', 'desligado', 'sem_destino'];
  for (const canal of ['push', 'email']) if (estados.includes(canais?.[canal]?.estado)) saida[canal] = {estado: canais[canal].estado};
  return saida;
}

export async function lerNotaCentralTxR87(db, tx, n, ator, {cfg, processo, agora = new Date(), leitura} = {}) {
  const tipo = validarPapelNotaCentralR87(n, ator.papel);
  exigir(programacaoAtivaI165(cfg), 'Os avisos operacionais estão pausados. A fila anterior foi preservada.');
  const organizacao = tipo === 'organizacao_i167',devolucao=tipo===TIPO_DEMANDA_REFAZER_CP131,providencia=tipo===TIPO_PROVIDENCIA_GRAVACAO_CP140;
  exigir(providencia?programacaoAtivaI165(cfg)&&cfg.habilidades?.preparacaoCentral===true:devolucao?programacaoAtivaI165(cfg):organizacao ? cfg?.schema === 1 && cfg.ativo === true && cfg.habilidades?.organizacao === true : processoAtivoI164(processo), 'Esta rotina está pausada. Confira a fila atual.');
  exigir(n.ativacaoId === (organizacao||devolucao||providencia ? cfg.ativacaoId : processo.ativacaoId), 'Este aviso pertence a uma ativação anterior. Confira a fila atual.');
  const ocorrencias = await ocorrenciasDaFonteCentralI164(leitura || leituraCentralTxR87(db, tx), n, agora);
  const atual = ocorrencias.find(o => o.versao === n.versao && o.destinatario === n.destinatario && o.nivel === n.nivel && jsonI165(o.origem) === jsonI165(n.origem));
  const origem = atual?.origem || n.origem;
  const fonte = novoCp109(tipo)?fonteDtoCp109(n):{colecao: organizacao||devolucao||providencia ? 'demandas' : origem.origemEditorial === 'continuar_legado' ? 'continuidade_calendarios_i164' : 'planejamento_social_i155', id: origem.id};
  const prazo = atual?.prazo || n.prazo || '';
  const prazoIso = prazo && Number.isFinite(Date.parse(prazo + '-03:00')) ? new Date(prazo + '-03:00').toISOString() : null;
  return {
    schema: 1, id: n.id, escopo: ESCOPO_AVISOS_CENTRAL_R87, destinatario: n.destinatario,
    ativacaoId: n.ativacaoId, tipo, fonte,
    origem: devolucao?{tipo,id:origem.id,operacao:origem.operacao}:novoCp109(tipo)?origemDtoCp109(n,atual):{tipo, id: origem.id, ...(origem.etapa ? {etapa: origem.etapa} : {}), ...(origem.cliente ? {cliente: origem.cliente, competencia: origem.competencia} : {}), ...(origem.origemEditorial ? {origemEditorial: origem.origemEditorial} : {})},
    versao: n.versao, estado: atual ? 'pendente' : 'resolvida', estadoPersistido: n.estado,
    titulo: texto(atual?.titulo || n.titulo, 240), texto: texto(atual?.texto || n.texto, 1600),
    link: atual ? {...atual.link} : null, bloqueada: false, pausada: false,
    urgencia: ['atrasado', 'hoje'].includes(atual?.nivel || n.nivel) ? 'alta' : 'normal',
    faseAviso: texto(atual?.nivel || n.nivel, 40), prazo: prazoIso, canais: canaisPublicos(n.canais),
    fonteConferida: true, fonteAvancou: !atual, conferidoEm: agora.toISOString(),
    leituraNaoResolve: true, semAlterarEstadoPersistido: true
  };
}
