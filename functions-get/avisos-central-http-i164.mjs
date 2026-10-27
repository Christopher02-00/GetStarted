/* A mesma caixa de avisos, com leitura tipada das fontes da Central.
 * Não cria demanda, não conclui atividade e não expõe documentos privados. */
import {notaCentralI164, ocorrenciasDaFonteCentralI164} from './central/notificacoes.mjs';
import {processoAtivoI164} from './central/lib/gs-processo-calendarios-i164.mjs';
import {programacaoAtivaI165} from './lib/gs-contexto-operacional-i165.mjs';
import {jsonI165} from './central/lib/gs-programacao-i165.mjs';

export const ESCOPO_AVISOS_CENTRAL_R87 = 'central_i164';
export const TIPOS_AVISOS_CENTRAL_R87 = Object.freeze(['planejamento', 'calendario_revisao', 'calendario_envio']);
const tipos = new Set([...TIPOS_AVISOS_CENTRAL_R87, 'organizacao_i167']);
const id = v => typeof v === 'string' && /^[A-Za-z0-9_.-]{1,220}$/.test(v) && !['.', '..'].includes(v);
const exigir = (ok, mensagem) => { if (!ok) throw Object.assign(new Error(mensagem), {code: 'i164/aviso'}); };
const texto = (v, limite) => typeof v === 'string' ? v.slice(0, limite) : '';

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
  return tipo;
}

export async function candidatasCentralTxR87(db, tx, ator, cfg, limite = 100) {
  const ps = await tx.get(db.doc('processo_calendarios_i164/ativo')), processo = ps.data();
  if (ps.exists && processo?.ativo !== false) exigir(processoAtivoI164(processo), 'A configuração do processo precisa de conferência; a lista anterior foi preservada.');
  const centralAtiva = processoAtivoI164(processo), organizacaoAtiva = cfg?.habilidades?.organizacao === true;
  const base = () => db.collection('notificacoes_operacionais_i165').where('destinatario', '==', ator.papel).where('estado', '==', 'pendente');
  const consultas = [];
  if (centralAtiva && ['Chris', 'Amanda', 'Gabrielle', 'Cecília'].includes(ator.papel)) {
    consultas.push(base().where('ativacaoId', '==', processo.ativacaoId).where('origem.tipo', 'in', TIPOS_AVISOS_CENTRAL_R87).orderBy('__name__').limit(limite + 1));
  }
  if (organizacaoAtiva) consultas.push(base().where('ativacaoId', '==', cfg.ativacaoId).where('origem.tipo', '==', 'organizacao_i167').orderBy('__name__').limit(limite + 1));
  const snapshots = await Promise.all(consultas.map(q => tx.get(q)));
  return {processo, centralAtiva, organizacaoAtiva, docs: snapshots.flatMap(s => s.docs), truncado: snapshots.some(s => s.size > limite)};
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
  const organizacao = tipo === 'organizacao_i167';
  exigir(organizacao ? cfg?.schema === 1 && cfg.ativo === true && cfg.habilidades?.organizacao === true : processoAtivoI164(processo), 'Esta rotina está pausada. Confira a fila atual.');
  exigir(n.ativacaoId === (organizacao ? cfg.ativacaoId : processo.ativacaoId), 'Este aviso pertence a uma ativação anterior. Confira a fila atual.');
  const ocorrencias = await ocorrenciasDaFonteCentralI164(leitura || leituraCentralTxR87(db, tx), n, agora);
  const atual = ocorrencias.find(o => o.versao === n.versao && o.destinatario === n.destinatario && o.nivel === n.nivel && jsonI165(o.origem) === jsonI165(n.origem));
  const origem = atual?.origem || n.origem;
  const fonte = {colecao: organizacao ? 'demandas' : origem.origemEditorial === 'continuar_legado' ? 'continuidade_calendarios_i164' : 'planejamento_social_i155', id: origem.id};
  const prazo = atual?.prazo || n.prazo || '';
  const prazoIso = prazo && Number.isFinite(Date.parse(prazo + '-03:00')) ? new Date(prazo + '-03:00').toISOString() : null;
  return {
    schema: 1, id: n.id, escopo: ESCOPO_AVISOS_CENTRAL_R87, destinatario: n.destinatario,
    ativacaoId: n.ativacaoId, tipo, fonte,
    origem: {tipo, id: origem.id, ...(origem.etapa ? {etapa: origem.etapa} : {}), ...(origem.cliente ? {cliente: origem.cliente, competencia: origem.competencia} : {}), ...(origem.origemEditorial ? {origemEditorial: origem.origemEditorial} : {})},
    versao: n.versao, estado: atual ? 'pendente' : 'resolvida', estadoPersistido: n.estado,
    titulo: texto(atual?.titulo || n.titulo, 240), texto: texto(atual?.texto || n.texto, 1600),
    link: atual ? {...atual.link} : null, bloqueada: false, pausada: false,
    urgencia: ['atrasado', 'hoje'].includes(atual?.nivel || n.nivel) ? 'alta' : 'normal',
    faseAviso: texto(atual?.nivel || n.nivel, 40), prazo: prazoIso, canais: canaisPublicos(n.canais),
    fonteConferida: true, fonteAvancou: !atual, conferidoEm: agora.toISOString(),
    leituraNaoResolve: true, semAlterarEstadoPersistido: true
  };
}
