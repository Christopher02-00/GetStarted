/*
 * Get Started — núcleo financeiro puro V103.
 *
 * Este módulo não conhece DOM, Firebase, rede ou dados pessoais. Ele recebe
 * retratos já lidos, projeta competências e devolve conflitos explícitos.
 * Renderizar nunca cria mensalidade: uma obrigação virtual só vira documento
 * quando um escritor externo, explícito e idempotente decidir materializá-la.
 */

const COMPETENCIA_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATA_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function competenciaValida(valor) {
  return COMPETENCIA_RE.test(String(valor || '').trim());
}

function deslocarCompetencia(competencia, delta) {
  if (!competenciaValida(competencia) || !Number.isInteger(delta)) return '';
  const [ano, mes] = competencia.split('-').map(Number);
  const indice = ano * 12 + (mes - 1) + delta;
  const novoAno = Math.floor(indice / 12);
  const novoMes = ((indice % 12) + 12) % 12 + 1;
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`;
}

export function proximaCompetencia(competencia) {
  return deslocarCompetencia(competencia, 1);
}

export function competenciaAnterior(competencia) {
  return deslocarCompetencia(competencia, -1);
}

function conflito(codigo, detalhe = {}, bloqueante = true) {
  return { codigo, bloqueante, ...detalhe };
}

function resultadoIndisponivel(codigo, detalhe = {}) {
  return {
    estado: 'indisponivel',
    conflitos: [conflito(codigo, detalhe)],
  };
}

function lerLista(fonte, nome) {
  if (Array.isArray(fonte)) return { ok: true, lista: fonte };
  if (fonte && fonte.estado === 'indisponivel') {
    return {
      ok: false,
      resultado: resultadoIndisponivel('FONTE_INDISPONIVEL', {
        fonte: nome,
        causa: String(fonte.codigo || fonte.causa || 'não informada'),
      }),
    };
  }
  return {
    ok: false,
    resultado: resultadoIndisponivel('FONTE_INVALIDA', { fonte: nome }),
  };
}

function numeroFinitoNaoNegativo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function dataCivilFinanceira(valor) {
  const convertido = typeof valor?.toDate === 'function'
    ? valor.toDate()
    : (valor instanceof Date ? valor : null);
  if (convertido instanceof Date && !Number.isNaN(convertido.getTime())) {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(convertido);
    const mapa = Object.fromEntries(partes.map(parte => [parte.type, parte.value]));
    return `${mapa.year}-${mapa.month}-${mapa.day}`;
  }
  const civil = String(valor || '').slice(0, 10);
  return dataValida(civil) ? civil : '';
}

function semAcentos(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function statusMensalidade(registro) {
  if (registro?.excluido === true || registro?.excluida === true || registro?.arquivado === true || registro?.arquivada === true) return 'cancelado';
  if (registro?.cancelado === true || registro?.cancelada === true || registro?.encerrado === true || registro?.encerrada === true) return 'cancelado';
  const bruto = semAcentos(registro?.status || '').trim().toLowerCase();
  if (['pago', 'paga', 'quitado', 'quitada', 'recebido', 'recebida'].includes(bruto)) return 'pago';
  if (['isento', 'isenta', 'cortesia'].includes(bruto)) return 'isento';
  if (['cancelado', 'cancelada', 'encerrado', 'encerrada', 'excluido', 'excluida', 'arquivado', 'arquivada', 'finalizado', 'finalizada'].includes(bruto)) return 'cancelado';
  if (['aberto', 'aberta', 'pendente'].includes(bruto)) return 'aberto';
  return 'indisponivel';
}

export function mensalidadeResolvida(registro) {
  return ['pago', 'isento', 'cancelado'].includes(statusMensalidade(registro));
}

export function canonicalizarId(valor, aliases = {}) {
  let atual = String(valor || '').trim();
  const visitados = new Set();
  while (atual && Object.prototype.hasOwnProperty.call(aliases, atual) && !visitados.has(atual)) {
    visitados.add(atual);
    atual = String(aliases[atual] || '').trim();
  }
  return atual;
}

function idDeRegistro(registro) {
  const explicito = registro?.canonicalId || registro?.clienteId || registro?.cliente ||
    registro?.clienteSlug || registro?.slug;
  if (explicito) return String(explicito).trim();
  return String(registro?.id || '').replace(/_\d{4}-\d{2}$/, '').trim();
}

function normalizarIntervalo(bruto, indice, origem, permitirInicioAberto = false) {
  const inicioBruto = bruto?.inicio ?? bruto?.primeiraCompetencia ?? bruto?.competenciaInicio ?? '';
  const fimBruto = bruto?.fim ?? bruto?.ultimaCompetenciaPagamento ?? bruto?.competenciaFim ?? '';
  const inicio = String(inicioBruto || '').trim();
  const fim = String(fimBruto || '').trim();
  const conflitos = [];

  if (inicio && !competenciaValida(inicio)) {
    conflitos.push(conflito('VIGENCIA_INICIO_INVALIDO', { origem, indice, valor: inicio }));
  }
  if (!inicio && !permitirInicioAberto) {
    conflitos.push(conflito('VIGENCIA_SEM_INICIO', { origem, indice }));
  }
  if (fim && !competenciaValida(fim)) {
    conflitos.push(conflito('VIGENCIA_FIM_INVALIDO', { origem, indice, valor: fim }));
  }
  if (inicio && fim && competenciaValida(inicio) && competenciaValida(fim) && fim < inicio) {
    conflitos.push(conflito('VIGENCIA_INTERVALO_INVERTIDO', { origem, indice, inicio, fim }));
  }

  const valor = numeroFinitoNaoNegativo(bruto?.valor ?? bruto?.valorMensal);
  return {
    intervalo: {
      inicio: inicio || null,
      fim: fim || null,
      valor,
      origem,
      cicloId: String(bruto?.cicloId || bruto?.operationId || `${origem}-${indice}`),
    },
    conflitos,
  };
}

function assinaturaIntervalo(intervalo) {
  return [intervalo.inicio || '', intervalo.fim || '', intervalo.valor ?? ''].join('|');
}

/**
 * Normaliza os períodos em que um contrato esteve vigente.
 *
 * `vigencias[]` é autoritativo quando a propriedade existe, inclusive vazio.
 * O legado aceita primeira/última competência e `reativacoes[]`. A competência
 * final do ciclo antigo não é removida ao criar o ciclo reativado, preservando
 * o hiato entre saída e reentrada.
 */
export function normalizarVigencias(contrato = {}, contexto = {}) {
  const conflitos = [];
  const avisos = [];
  const intervalosBrutos = [];
  const possuiVigencias = Object.prototype.hasOwnProperty.call(contrato, 'vigencias');
  let origem = 'legado';

  if (possuiVigencias) {
    origem = 'vigencias';
    if (!Array.isArray(contrato.vigencias)) {
      return resultadoIndisponivel('VIGENCIAS_NAO_E_ARRAY');
    }
    contrato.vigencias.forEach((vigencia, indice) => {
      if (vigencia?.excluido === true) return;
      intervalosBrutos.push({ bruto: vigencia, indice, origem: 'vigencias', permitirInicioAberto: false });
    });
  } else {
    const reativacoesContrato = Array.isArray(contrato.reativacoes) ? contrato.reativacoes : [];
    const reativacoesContexto = Array.isArray(contexto.reativacoes) ? contexto.reativacoes : [];
    const reativacoes = [...reativacoesContrato, ...reativacoesContexto]
      .filter(item => item?.excluido !== true);
    const primeira = String(
      contexto.primeiraCompetenciaOriginal || contrato.primeiraCompetenciaOriginal ||
      contrato.primeiraCompetencia || '',
    ).trim();
    const ultima = String(contrato.ultimaCompetenciaPagamento || contexto.ultimaCompetenciaPagamento || '').trim();

    if (primeira || ultima || reativacoes.length === 0) {
      intervalosBrutos.push({
        bruto: {
          inicio: primeira,
          fim: ultima,
          valor: contrato.valorInicial ?? contrato.valorVigente ?? contrato.valorCheio,
          cicloId: 'legado-inicial',
        },
        indice: 0,
        origem: 'legado',
        permitirInicioAberto: true,
      });
    }

    reativacoes.forEach((reativacao, indice) => {
      intervalosBrutos.push({
        bruto: {
          ...reativacao,
          inicio: reativacao.inicio || reativacao.competencia || reativacao.primeiraCompetencia,
          fim: reativacao.fim || reativacao.ultimaCompetenciaPagamento || '',
          valor: reativacao.valor ?? reativacao.valorMensal ?? contrato.valorVigente ?? contrato.valorCheio,
          cicloId: reativacao.cicloId || reativacao.operationId || `reativacao-${indice + 1}`,
        },
        indice: indice + 1,
        origem: 'reativacao',
        permitirInicioAberto: false,
      });
    });

    const status = semAcentos(contrato.status || '').toLowerCase();
    if (!primeira && !ultima && reativacoes.length === 0 &&
      ['encerrado', 'cancelado', 'arquivado', 'finalizado'].includes(status)) {
      conflitos.push(conflito('CONTRATO_ENCERRADO_SEM_COMPETENCIA_FINAL'));
    }
  }

  const intervalos = [];
  intervalosBrutos.forEach(({ bruto, indice, origem: origemIntervalo, permitirInicioAberto }) => {
    const normalizado = normalizarIntervalo(bruto, indice, origemIntervalo, permitirInicioAberto);
    conflitos.push(...normalizado.conflitos);
    if (!normalizado.conflitos.length) intervalos.push(normalizado.intervalo);
  });

  intervalos.sort((a, b) => {
    if (a.inicio === b.inicio) return String(a.fim || '9999-12').localeCompare(String(b.fim || '9999-12'));
    if (a.inicio === null) return -1;
    if (b.inicio === null) return 1;
    return a.inicio.localeCompare(b.inicio);
  });

  const unicos = [];
  const vistos = new Map();
  intervalos.forEach(intervalo => {
    const chave = assinaturaIntervalo(intervalo);
    if (vistos.has(chave)) {
      avisos.push(conflito('VIGENCIA_DUPLICADA_EQUIVALENTE', {
        cicloId: intervalo.cicloId,
        duplicataDe: vistos.get(chave),
      }, false));
      return;
    }
    vistos.set(chave, intervalo.cicloId);
    unicos.push(intervalo);
  });

  for (let indice = 1; indice < unicos.length; indice += 1) {
    const anterior = unicos[indice - 1];
    const atual = unicos[indice];
    if (anterior.fim === null || atual.inicio === null || atual.inicio <= anterior.fim) {
      conflitos.push(conflito('VIGENCIAS_SOBREPOSTAS', {
        cicloAnterior: anterior.cicloId,
        cicloAtual: atual.cicloId,
      }));
    }
  }

  const bloqueado = conflitos.some(item => item.bloqueante !== false);
  return {
    estado: bloqueado ? 'indisponivel' : unicos.length ? 'confirmado' : 'vazio',
    origem,
    intervalos: unicos,
    conflitos: [...conflitos, ...avisos],
  };
}

function intervaloContem(intervalo, competencia) {
  if (!competenciaValida(competencia)) return false;
  if (intervalo.inicio && competencia < intervalo.inicio) return false;
  if (intervalo.fim && competencia > intervalo.fim) return false;
  return true;
}

export function vigenteNaCompetencia(contratoOuVigencias, competencia, contexto = {}) {
  if (!competenciaValida(competencia)) return false;
  const normalizado = Array.isArray(contratoOuVigencias?.intervalos)
    ? contratoOuVigencias
    : normalizarVigencias(contratoOuVigencias || {}, contexto);
  if (normalizado.estado === 'indisponivel') return false;
  return normalizado.intervalos.some(intervalo => intervaloContem(intervalo, competencia));
}

function alteracoesDeValor(contrato) {
  const alteracoes = [];
  const historico = Array.isArray(contrato?.historicoAlteracoesValor)
    ? contrato.historicoAlteracoesValor
    : [];
  historico.forEach((item, indice) => {
    const inicio = String(item?.inicio || item?.competencia || '').trim();
    const valor = numeroFinitoNaoNegativo(item?.novoValor ?? item?.valor);
    if (competenciaValida(inicio) && valor !== null &&
      !['cancelada', 'cancelado'].includes(semAcentos(item?.acao || '').toLowerCase())) {
      alteracoes.push({ inicio, valor, ordem: String(item?.em || indice).padStart(24, '0'), origem: 'historico' });
    }
  });
  const programadaEm = String(contrato?.valorProgramadoEm || '').trim();
  const programada = numeroFinitoNaoNegativo(contrato?.valorProgramado);
  if (competenciaValida(programadaEm) && programada !== null) {
    alteracoes.push({ inicio: programadaEm, valor: programada, ordem: 'zzzz', origem: 'programacao' });
  }
  return alteracoes.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.ordem.localeCompare(b.ordem));
}

export function valorNaCompetencia(contrato = {}, competencia, contexto = {}) {
  if (!competenciaValida(competencia)) return resultadoIndisponivel('COMPETENCIA_INVALIDA', { competencia });
  const vigencias = normalizarVigencias(contrato, contexto);
  if (vigencias.estado === 'indisponivel') return { ...vigencias, valor: null };
  const intervalo = vigencias.intervalos.find(item => intervaloContem(item, competencia));
  if (!intervalo) return { estado: 'fora_vigencia', valor: 0, origem: 'fora_vigencia', conflitos: [] };

  let valor = intervalo.valor;
  let origem = intervalo.valor !== null ? intervalo.origem : 'contrato';
  if (valor === null) {
    valor = numeroFinitoNaoNegativo(contrato.valorInicial ?? contrato.valorVigente ?? contrato.valorCheio);
  }
  alteracoesDeValor(contrato).filter(item => item.inicio <= competencia).forEach(item => {
    valor = item.valor;
    origem = item.origem;
  });
  if (valor === null) return resultadoIndisponivel('VALOR_CONTRATO_INVALIDO', { competencia });
  return { estado: 'confirmado', valor, origem, intervalo, conflitos: vigencias.conflitos };
}

function pagamentoNormalizado(registro, aliases) {
  const originalId = idDeRegistro(registro);
  const canonicalId = canonicalizarId(originalId, aliases);
  const competencia = String(registro?.competencia || registro?.mes || registro?.mesRef || '').trim();
  const statusOriginal = String(registro?.status || '').trim();
  const valores = [registro?.valorCobrado, registro?.valorDevido, registro?.valor]
    .filter(valor => valor !== null && valor !== undefined && valor !== '')
    .map(numeroFinitoNaoNegativo);
  const valoresValidos = valores.filter(valor => valor !== null);
  const valoresDistintos = [...new Set(valoresValidos)];
  const valorInvalido = valores.some(valor => valor === null);
  return {
    ...registro,
    id: String(registro?.id || `${originalId}_${competencia}`),
    originalId,
    canonicalId,
    competencia,
    statusOriginal,
    status: statusMensalidade(registro),
    valorDevido: !valorInvalido && valoresDistintos.length === 1 ? valoresDistintos[0] : null,
    valorConflitante: valoresDistintos.length > 1,
    diaVencimento: Number(registro?.diaVencimento || 10),
    pagoEm: dataCivilFinanceira(registro?.pagoEm || registro?.recebidoEm || ''),
    excluido: registro?.excluido === true || registro?.arquivado === true,
  };
}

function assinaturaPagamento(registro) {
  return JSON.stringify({
    status: registro.status,
    valorDevido: registro.valorDevido,
    diaVencimento: registro.diaVencimento,
    pagoEm: registro.pagoEm,
    comprovante: String(registro.comprovante || ''),
    origemRecebimento: String(registro.origemRecebimento || ''),
    foraCaixaAgencia: registro.foraCaixaAgencia === true,
  });
}

/** Consolida pagamentos sem escolher silenciosamente entre verdades divergentes. */
export function canonicalizarPagamentos(fonte, { aliases = {} } = {}) {
  const leitura = lerLista(fonte, 'pagamentos');
  if (!leitura.ok) return leitura.resultado;
  const conflitos = [];
  const historico = [];
  const mapa = new Map();

  leitura.lista.forEach((registro, indice) => {
    const item = pagamentoNormalizado(registro, aliases);
    historico.push(item);
    if (!item.canonicalId) {
      conflitos.push(conflito('PAGAMENTO_SEM_IDENTIDADE', { indice, id: item.id }));
      return;
    }
    if (!competenciaValida(item.competencia)) {
      conflitos.push(conflito('PAGAMENTO_COMPETENCIA_INVALIDA', {
        indice,
        id: item.id,
        competencia: item.competencia,
      }));
      return;
    }
    const chave = `${item.canonicalId}|${item.competencia}`;
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push(item);
  });

  const grupos = [];
  for (const [chave, registros] of mapa.entries()) {
    const ativos = registros.filter(item => !item.excluido);
    let selecionado = null;
    let bloqueado = false;
    const conflitosGrupo = [];
    if (ativos.length === 1) {
      [selecionado] = ativos;
    } else if (ativos.length > 1) {
      const assinaturas = new Set(ativos.map(assinaturaPagamento));
      if (assinaturas.size === 1) {
        selecionado = ativos.find(item => item.originalId === item.canonicalId) ||
          [...ativos].sort((a, b) => a.id.localeCompare(b.id))[0];
        conflitosGrupo.push(conflito('PAGAMENTO_DUPLICADO_EQUIVALENTE', {
          chave,
          ids: ativos.map(item => item.id).sort(),
          selecionado: selecionado.id,
        }, false));
      } else {
        bloqueado = true;
        conflitosGrupo.push(conflito('PAGAMENTO_DUPLICADO_DIVERGENTE', {
          chave,
          ids: ativos.map(item => item.id).sort(),
          estados: ativos.map(item => ({ id: item.id, status: item.status, valor: item.valorDevido })),
        }));
      }
    }
    conflitos.push(...conflitosGrupo);
    const [canonicalId, competencia] = chave.split('|');
    grupos.push({ chave, canonicalId, competencia, registros, selecionado, bloqueado, conflitos: conflitosGrupo });
  }

  grupos.sort((a, b) => a.chave.localeCompare(b.chave));
  const bloqueios = conflitos.filter(item => item.bloqueante !== false);
  return {
    estado: bloqueios.length ? 'parcial' : grupos.length ? 'confirmado' : 'vazio',
    grupos,
    historico,
    conflitos,
  };
}

function contratoNormalizado(registro, aliases) {
  const originalId = idDeRegistro(registro) || String(registro?.id || '').trim();
  return {
    ...registro,
    id: String(registro?.id || originalId),
    originalId,
    canonicalId: canonicalizarId(originalId, aliases),
    excluido: registro?.excluido === true || registro?.arquivado === true,
  };
}

function assinaturaContrato(contrato, contexto) {
  const vigencias = normalizarVigencias(contrato, contexto);
  return JSON.stringify({
    estado: vigencias.estado,
    intervalos: vigencias.intervalos || [],
    valor: contrato.valorVigente ?? contrato.valorCheio ?? null,
    programado: contrato.valorProgramado ?? null,
    programadoEm: contrato.valorProgramadoEm || '',
    cortesiaPermanente: contrato.cortesiaPermanente === true,
    cortesiaMeses: Array.isArray(contrato.cortesiaMeses) ? [...contrato.cortesiaMeses].sort() : [],
  });
}

function canonicalizarContratos(fonte, aliases, contextosVigencia) {
  const leitura = lerLista(fonte, 'contratos');
  if (!leitura.ok) return leitura.resultado;
  const mapa = new Map();
  const conflitos = [];
  leitura.lista.forEach((registro, indice) => {
    const item = contratoNormalizado(registro, aliases);
    if (!item.canonicalId) {
      conflitos.push(conflito('CONTRATO_SEM_IDENTIDADE', { indice }));
      return;
    }
    if (!mapa.has(item.canonicalId)) mapa.set(item.canonicalId, []);
    mapa.get(item.canonicalId).push(item);
  });

  const grupos = [];
  for (const [canonicalId, registros] of mapa.entries()) {
    const ativos = registros.filter(item => !item.excluido);
    let selecionado = null;
    let bloqueado = false;
    const conflitosGrupo = [];
    if (ativos.length === 1) {
      [selecionado] = ativos;
    } else if (ativos.length > 1) {
      const assinaturas = new Set(ativos.map(item => assinaturaContrato(item, contextosVigencia?.[canonicalId] || {})));
      if (assinaturas.size === 1) {
        selecionado = ativos.find(item => item.originalId === canonicalId) ||
          [...ativos].sort((a, b) => a.id.localeCompare(b.id))[0];
        conflitosGrupo.push(conflito('CONTRATO_DUPLICADO_EQUIVALENTE', {
          canonicalId,
          ids: ativos.map(item => item.id).sort(),
          selecionado: selecionado.id,
        }, false));
      } else {
        bloqueado = true;
        conflitosGrupo.push(conflito('CONTRATO_DUPLICADO_DIVERGENTE', {
          canonicalId,
          ids: ativos.map(item => item.id).sort(),
        }));
      }
    }
    conflitos.push(...conflitosGrupo);
    grupos.push({ canonicalId, registros, selecionado, bloqueado, conflitos: conflitosGrupo });
  }
  grupos.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  return {
    estado: conflitos.some(item => item.bloqueante !== false) ? 'parcial' : grupos.length ? 'confirmado' : 'vazio',
    grupos,
    conflitos,
  };
}

function cortesiaNaCompetencia(contrato, competencia) {
  return contrato.cortesiaPermanente === true ||
    (Array.isArray(contrato.cortesiaMeses) && contrato.cortesiaMeses.map(String).includes(competencia));
}

function somarTotaisObrigacoes(linhas) {
  const totais = {
    previsto: 0,
    quitado: 0,
    aberto: 0,
    isento: 0,
    cancelado: 0,
    clientes: 0,
    materializadas: 0,
    virtuais: 0,
    conflitos: 0,
  };
  linhas.forEach(linha => {
    if (linha.estado === 'conflito') {
      totais.conflitos += 1;
      return;
    }
    totais.clientes += 1;
    if (linha.materializada) totais.materializadas += 1;
    else totais.virtuais += 1;
    if (linha.status === 'pago') {
      totais.previsto += linha.valorDevido;
      totais.quitado += linha.valorDevido;
    } else if (linha.status === 'aberto') {
      totais.previsto += linha.valorDevido;
      totais.aberto += linha.valorDevido;
    } else if (linha.status === 'isento') {
      totais.isento += 1;
    } else if (linha.status === 'cancelado') {
      totais.cancelado += 1;
    }
  });
  totais.reconciliado = totais.previsto === totais.quitado + totais.aberto;
  totais.confiavel = totais.conflitos === 0;
  return totais;
}

/**
 * Projeta obrigações sem escrever nada. A linha virtual tem a mesma identidade
 * que um futuro documento, mas `materializada:false` e nenhum efeito externo.
 */
export function projetarObrigacoes({
  contratos,
  pagamentos,
  competencia,
  aliases = {},
  contextosVigencia = {},
} = {}) {
  if (!competenciaValida(competencia)) return resultadoIndisponivel('COMPETENCIA_INVALIDA', { competencia });
  const contratosCanonicos = canonicalizarContratos(contratos, aliases, contextosVigencia);
  if (contratosCanonicos.estado === 'indisponivel') return contratosCanonicos;
  const pagamentosCanonicos = canonicalizarPagamentos(pagamentos, { aliases });
  if (pagamentosCanonicos.estado === 'indisponivel') return pagamentosCanonicos;

  const conflitos = [...contratosCanonicos.conflitos, ...pagamentosCanonicos.conflitos];
  const linhas = [];
  const pagamentosPorChave = new Map(pagamentosCanonicos.grupos.map(grupo => [grupo.chave, grupo]));
  const pagamentosConsumidos = new Set();

  contratosCanonicos.grupos.forEach(grupoContrato => {
    const { canonicalId, selecionado: contrato } = grupoContrato;
    if (!contrato || grupoContrato.bloqueado) {
      linhas.push({ canonicalId, competencia, estado: 'conflito', motivo: 'CONTRATO_DIVERGENTE' });
      return;
    }
    const contexto = contextosVigencia[canonicalId] || {};
    const vigencias = normalizarVigencias(contrato, contexto);
    if (vigencias.estado === 'indisponivel') {
      conflitos.push(...vigencias.conflitos.map(item => ({ ...item, canonicalId })));
      linhas.push({ canonicalId, competencia, estado: 'conflito', motivo: 'VIGENCIA_INDISPONIVEL' });
      return;
    }
    if (!vigenteNaCompetencia(vigencias, competencia)) return;
    const valorContrato = valorNaCompetencia(contrato, competencia, contexto);
    if (valorContrato.estado !== 'confirmado') {
      conflitos.push(...(valorContrato.conflitos || []).map(item => ({ ...item, canonicalId })));
      linhas.push({ canonicalId, competencia, estado: 'conflito', motivo: 'VALOR_INDISPONIVEL' });
      return;
    }

    const chave = `${canonicalId}|${competencia}`;
    const grupoPagamento = pagamentosPorChave.get(chave);
    if (grupoPagamento) pagamentosConsumidos.add(chave);
    if (grupoPagamento?.bloqueado) {
      linhas.push({ canonicalId, competencia, estado: 'conflito', motivo: 'PAGAMENTO_DIVERGENTE' });
      return;
    }

    const pagamento = grupoPagamento?.selecionado || null;
    if (!pagamento) {
      const isento = cortesiaNaCompetencia(contrato, competencia);
      linhas.push({
        id: `${canonicalId}_${competencia}`,
        canonicalId,
        competencia,
        estado: 'confirmado',
        status: isento ? 'isento' : 'aberto',
        valorDevido: valorContrato.valor,
        diaVencimento: Number(contrato.diaVencimento || 10),
        materializada: false,
        origem: 'obrigacao_virtual',
      });
      return;
    }

    if (pagamento.status === 'indisponivel') {
      conflitos.push(conflito('PAGAMENTO_STATUS_INVALIDO', {
        canonicalId,
        competencia,
        id: pagamento.id,
        status: pagamento.statusOriginal,
      }));
      linhas.push({ canonicalId, competencia, estado: 'conflito', motivo: 'PAGAMENTO_STATUS_INVALIDO' });
      return;
    }

    if (pagamento.valorDevido === null) {
      const motivo=pagamento.valorConflitante?'PAGAMENTO_VALORES_DIVERGENTES':'PAGAMENTO_VALOR_INVALIDO';
      conflitos.push(conflito(motivo, { canonicalId, competencia, id: pagamento.id }));
      linhas.push({ canonicalId, competencia, estado: 'conflito', motivo });
      return;
    }

    const imutavel = ['pago', 'cancelado'].includes(pagamento.status);
    if (!imutavel && pagamento.valorDevido !== valorContrato.valor) {
      conflitos.push(conflito('VALOR_MATERIALIZADO_DIVERGENTE', {
        canonicalId,
        competencia,
        id: pagamento.id,
        valorMaterializado: pagamento.valorDevido,
        valorContrato: valorContrato.valor,
      }));
      linhas.push({ canonicalId, competencia, estado: 'conflito', motivo: 'VALOR_MATERIALIZADO_DIVERGENTE' });
      return;
    }
    if (imutavel && pagamento.valorDevido !== valorContrato.valor) {
      conflitos.push(conflito('VALOR_HISTORICO_PRESERVADO', {
        canonicalId,
        competencia,
        id: pagamento.id,
        valorHistorico: pagamento.valorDevido,
        valorContratoAtual: valorContrato.valor,
      }, false));
    }
    linhas.push({
      ...pagamento,
      canonicalId,
      competencia,
      estado: 'confirmado',
      materializada: true,
      origem: 'pagamento_materializado',
    });
  });

  pagamentosCanonicos.grupos.forEach(grupoPagamento => {
    if (grupoPagamento.competencia !== competencia || pagamentosConsumidos.has(grupoPagamento.chave)) return;
    const pagamento = grupoPagamento.selecionado;
    if (!pagamento || grupoPagamento.bloqueado) {
      linhas.push({
        canonicalId: grupoPagamento.canonicalId,
        competencia,
        estado: 'conflito',
        motivo: 'PAGAMENTO_ORFAO_DIVERGENTE',
      });
      return;
    }
    conflitos.push(conflito('PAGAMENTO_SEM_CONTRATO_VIGENTE', {
      canonicalId: pagamento.canonicalId,
      competencia,
      id: pagamento.id,
      status: pagamento.status,
    }, pagamento.status !== 'cancelado'));
    linhas.push({
      ...pagamento,
      estado: pagamento.status === 'cancelado' ? 'historico' : 'conflito',
      motivo: 'PAGAMENTO_SEM_CONTRATO_VIGENTE',
      materializada: true,
    });
  });

  linhas.sort((a, b) => String(a.canonicalId).localeCompare(String(b.canonicalId)));
  const totais = somarTotaisObrigacoes(linhas);
  const bloqueios = conflitos.filter(item => item.bloqueante !== false);
  return {
    estado: bloqueios.length ? 'parcial' : linhas.length ? 'confirmado' : 'vazio',
    competencia,
    linhas,
    totais,
    conflitos,
    escritaExecutada: false,
  };
}

function dataValida(valor) {
  const texto = String(valor || '').slice(0, 10);
  if (!DATA_RE.test(texto)) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

function mesDaData(valor) {
  const texto = dataCivilFinanceira(valor);
  return dataValida(texto) ? texto.slice(0, 7) : '';
}

function listaOuIndisponivel(fonte, nome) {
  const leitura = lerLista(fonte, nome);
  return leitura.ok ? leitura.lista : leitura.resultado;
}

/** Separa resultado por competência do dinheiro efetivamente recebido por data. */
export function reconciliarCompetenciaECaixa({
  obrigacoes,
  pagamentos,
  recebimentosEntrada = [],
  receitasAvulsas = [],
  competencia,
  mesCaixa = competencia,
  aliases = {},
  destinosPessoais = ['conta_pessoal'],
} = {}) {
  if (!competenciaValida(competencia) || !competenciaValida(mesCaixa)) {
    return resultadoIndisponivel('COMPETENCIA_INVALIDA', { competencia, mesCaixa });
  }
  if (!obrigacoes || obrigacoes.estado === 'indisponivel') {
    return resultadoIndisponivel('OBRIGACOES_INDISPONIVEIS');
  }
  const canonicos = canonicalizarPagamentos(pagamentos, { aliases });
  if (canonicos.estado === 'indisponivel') return canonicos;
  const entradas = listaOuIndisponivel(recebimentosEntrada, 'recebimentosEntrada');
  if (!Array.isArray(entradas)) return entradas;
  const avulsas = listaOuIndisponivel(receitasAvulsas, 'receitasAvulsas');
  if (!Array.isArray(avulsas)) return avulsas;

  const conflitos = [...(obrigacoes.conflitos || []), ...canonicos.conflitos];
  const destinosPessoaisNormalizados = new Set(
    (Array.isArray(destinosPessoais) ? destinosPessoais : []).map(String),
  );
  let recorrenteAgencia = 0;
  let recorrentePessoal = 0;
  let entradasAgencia = 0;
  let entradasPessoal = 0;
  let avulsasAgencia = 0;

  canonicos.grupos.forEach(grupo => {
    if (grupo.bloqueado || !grupo.selecionado) return;
    const pagamento = grupo.selecionado;
    if (pagamento.status !== 'pago' || pagamento.origemRecebimento === 'entrada_contrato') return;
    const mes = mesDaData(pagamento.pagoEm);
    if (!mes) {
      conflitos.push(conflito('PAGAMENTO_PAGO_SEM_DATA_CAIXA', {
        canonicalId: pagamento.canonicalId,
        competencia: pagamento.competencia,
        id: pagamento.id,
      }));
      return;
    }
    if (mes !== mesCaixa) return;
    if (pagamento.valorDevido === null) {
      conflitos.push(conflito('PAGAMENTO_VALOR_INVALIDO', { id: pagamento.id }));
      return;
    }
    if (pagamento.foraCaixaAgencia === true) recorrentePessoal += pagamento.valorDevido;
    else recorrenteAgencia += pagamento.valorDevido;
  });

  entradas.forEach((entrada, indice) => {
    if (entrada?.excluido === true || statusMensalidade(entrada) !== 'pago') return;
    const data = dataCivilFinanceira(entrada.pagoEm || entrada.recebidoEm || '');
    const mes = mesDaData(data);
    if (!mes) {
      conflitos.push(conflito('ENTRADA_PAGA_SEM_DATA_CAIXA', { indice }));
      return;
    }
    if (mes !== mesCaixa) return;
    const valor = numeroFinitoNaoNegativo(entrada.valorConfirmado ?? entrada.valorPrevisto ?? entrada.valor);
    if (valor === null) {
      conflitos.push(conflito('ENTRADA_VALOR_INVALIDO', { indice }));
      return;
    }
    if (entrada.foraCaixaAgencia === true || destinosPessoaisNormalizados.has(String(entrada.destino || ''))) {
      entradasPessoal += valor;
    }
    else if (entrada.destino === 'conta_agencia') entradasAgencia += valor;
    else conflitos.push(conflito('ENTRADA_DESTINO_INDEFINIDO', { indice }));
  });

  avulsas.forEach((receita, indice) => {
    if (receita?.excluido === true) return;
    const recebida = receita?.recebido === true || ['pago', 'recebido'].includes(statusMensalidade(receita));
    if (!recebida) return;
    const data = dataCivilFinanceira(receita.recebidoEm || receita.pagoEm || '');
    const mes = mesDaData(data);
    if (!mes) {
      conflitos.push(conflito('RECEITA_AVULSA_SEM_DATA_CAIXA', { indice }));
      return;
    }
    if (mes !== mesCaixa) return;
    const valor = numeroFinitoNaoNegativo(receita.valorRecebido ?? receita.valor);
    if (valor === null) conflitos.push(conflito('RECEITA_AVULSA_VALOR_INVALIDO', { indice }));
    else avulsasAgencia += valor;
  });

  const competenciaResumo = {
    competencia,
    previsto: Number(obrigacoes.totais?.previsto || 0),
    quitado: Number(obrigacoes.totais?.quitado || 0),
    aberto: Number(obrigacoes.totais?.aberto || 0),
    reconciliado: obrigacoes.totais?.reconciliado === true,
  };
  const caixa = {
    mes: mesCaixa,
    recorrenteAgencia,
    recorrentePessoal,
    entradasAgencia,
    entradasPessoal,
    avulsasAgencia,
  };
  caixa.totalAgencia = recorrenteAgencia + entradasAgencia + avulsasAgencia;
  caixa.totalPessoal = recorrentePessoal + entradasPessoal;

  const bloqueios = conflitos.filter(item => item.bloqueante !== false);
  return {
    estado: bloqueios.length ? 'parcial' : 'confirmado',
    competencia: competenciaResumo,
    caixa,
    diferencaQuitadoVsCaixaAgencia: competenciaResumo.quitado - caixa.totalAgencia,
    dimensoes: {
      competencia: 'obrigação e quitação pertencem à competência contratual',
      caixa: 'entrada pertence ao mês da data real de pagamento',
    },
    superficies: {
      contratos: { previsto: competenciaResumo.previsto },
      mensalidades: { previsto: competenciaResumo.previsto, aberto: competenciaResumo.aberto },
      financeiro: { previsto: competenciaResumo.previsto, aberto: competenciaResumo.aberto },
      regua: { abertoDaCompetencia: competenciaResumo.aberto },
    },
    conflitos,
  };
}

export function dataVencimentoDaCompetencia(competencia, diaVencimento = 10) {
  if (!competenciaValida(competencia)) return '';
  const [ano, mes] = competencia.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.min(Math.max(Number(diaVencimento) || 10, 1), ultimoDia);
  return `${competencia}-${String(dia).padStart(2, '0')}`;
}

function diasEntre(inicio, fim) {
  if (!dataValida(inicio) || !dataValida(fim)) return null;
  const [ai, mi, di] = inicio.split('-').map(Number);
  const [af, mf, df] = fim.split('-').map(Number);
  return Math.round((Date.UTC(af, mf - 1, df) - Date.UTC(ai, mi - 1, di)) / 86400000);
}

export function classificarCobranca(item, hoje, carenciaDias = 5) {
  if (!dataValida(hoje) || !competenciaValida(item?.competencia)) {
    return { estado: 'indisponivel', codigo: 'DATA_OU_COMPETENCIA_INVALIDA' };
  }
  const vencimento = dataVencimentoDaCompetencia(item.competencia, item.diaVencimento);
  const atraso = diasEntre(vencimento, hoje);
  if (atraso < -1) return { estado: 'a_vencer', dias: atraso, vencimento };
  if (atraso === -1) return { estado: 'vence_amanha', dias: atraso, vencimento };
  if (atraso === 0) return { estado: 'vence_hoje', dias: 0, vencimento };
  if (atraso <= carenciaDias) return { estado: 'carencia', dias: atraso, vencimento };
  return { estado: 'atrasado', dias: atraso, vencimento };
}

function linhasDeObrigacoes(fonte) {
  const fontes = Array.isArray(fonte) ? fonte : [fonte];
  const linhas = [];
  const conflitos = [];
  for (const item of fontes) {
    if (!item || item.estado === 'indisponivel') {
      return resultadoIndisponivel('OBRIGACOES_INDISPONIVEIS');
    }
    if (Array.isArray(item.linhas)) linhas.push(...item.linhas);
    else if (item.canonicalId && item.competencia) linhas.push(item);
    conflitos.push(...(item.conflitos || []));
  }
  return { estado: 'confirmado', linhas, conflitos };
}

/** Régua por competência: passivo anterior, mês selecionado e próxima previsão. */
export function projetarReguaCobranca({
  obrigacoes,
  competencia,
  hoje,
  carenciaDias = 5,
  competenciaInicialOperacao = '',
  competenciasQuitadasAte = '',
} = {}) {
  if (!competenciaValida(competencia) || !dataValida(hoje)) {
    return resultadoIndisponivel('RELOGIO_OU_COMPETENCIA_INVALIDA', { competencia, hoje });
  }
  const fonte = linhasDeObrigacoes(obrigacoes);
  if (fonte.estado === 'indisponivel') return fonte;
  const conflitos = [...fonte.conflitos];
  if (competenciaInicialOperacao && !competenciaValida(competenciaInicialOperacao)) {
    return resultadoIndisponivel('INICIO_DA_REGUA_INVALIDO', { competenciaInicialOperacao });
  }
  if (competenciasQuitadasAte && !competenciaValida(competenciasQuitadasAte)) {
    return resultadoIndisponivel('CORTE_HISTORICO_INVALIDO', { competenciasQuitadasAte });
  }
  const candidatas = fonte.linhas.filter(item =>
    item.estado === 'confirmado' &&
    statusMensalidade(item) === 'aberto' &&
    (!competenciaInicialOperacao || item.competencia >= competenciaInicialOperacao) &&
    (!competenciasQuitadasAte || item.competencia > competenciasQuitadasAte) &&
    // Uma obrigação histórica só vira atraso quando há documento materializado.
    // A ausência de documento antigo não prova que uma cobrança existia.
    (item.competencia >= competencia || item.materializada === true));
  const comprovantes = candidatas.filter(item => String(item.comprovante || '').trim());
  const abertas = candidatas.filter(item => !String(item.comprovante || '').trim());
  const anterior = [];
  const selecionada = [];
  const proxima = [];
  const compSeguinte = proximaCompetencia(competencia);

  abertas.forEach(item => {
    const classificacao = classificarCobranca(item, hoje, carenciaDias);
    const linha = { ...item, cobranca: classificacao };
    if (classificacao.estado === 'indisponivel') {
      conflitos.push(conflito('COBRANCA_INCLASSIFICAVEL', {
        canonicalId: item.canonicalId,
        competencia: item.competencia,
      }));
      return;
    }
    if (item.competencia < competencia && classificacao.dias > 0) anterior.push(linha);
    else if (item.competencia === competencia) selecionada.push(linha);
    else if (item.competencia === compSeguinte) proxima.push(linha);
  });

  const ordenar = lista => lista.sort((a, b) =>
    b.cobranca.dias - a.cobranca.dias || String(a.canonicalId).localeCompare(String(b.canonicalId)));
  ordenar(anterior); ordenar(selecionada); ordenar(proxima);
  const somar = lista => lista.reduce((total, item) => total + Number(item.valorDevido || 0), 0);
  const porEstado = {};
  selecionada.forEach(item => {
    const chave = item.cobranca.estado;
    if (!porEstado[chave]) porEstado[chave] = [];
    porEstado[chave].push(item);
  });
  const bloqueios = conflitos.filter(item => item.bloqueante !== false);
  return {
    estado: bloqueios.length ? 'parcial' : abertas.length ? 'confirmado' : 'vazio',
    competencia,
    hoje,
    competenciaInicialOperacao,
    competenciasQuitadasAte,
    anterioresVencidos: { itens: anterior, quantidade: anterior.length, total: somar(anterior) },
    competenciaSelecionada: {
      itens: selecionada,
      quantidade: selecionada.length,
      totalEmAberto: somar(selecionada),
      porEstado,
    },
    comprovantesEmAnalise: {
      itens: comprovantes,
      quantidade: comprovantes.length,
      total: somar(comprovantes),
    },
    proximaPrevisao: {
      competencia: compSeguinte,
      itens: proxima,
      quantidade: proxima.length,
      totalPrevisto: somar(proxima),
    },
    conflitos,
  };
}

function assinaturaSaida(saida) {
  return JSON.stringify({
    dataSaida: dataCivilFinanceira(saida.dataSaida || ''),
    ultimaCompetenciaPagamento: String(saida.ultimaCompetenciaPagamento || ''),
    statusSaida: String(saida.statusSaida || 'encerrada'),
    cicloId: String(saida.cicloId || ''),
  });
}

/** Deduplica apenas saídas operacionais; canceladas/soft-delete ficam no histórico. */
export function deduplicarSaidas(fonte, { aliases = {} } = {}) {
  const leitura = lerLista(fonte, 'saidas');
  if (!leitura.ok) return leitura.resultado;
  const historico = [];
  const mapa = new Map();
  const conflitos = [];

  leitura.lista.forEach((registro, indice) => {
    const canonicalId = canonicalizarId(idDeRegistro(registro), aliases);
    const item = { ...registro, canonicalId, id: String(registro?.id || `saida-${indice}`) };
    const inativo = registro?.excluido === true ||
      ['cancelada', 'cancelado'].includes(semAcentos(registro?.statusSaida || '').toLowerCase());
    if (inativo) {
      historico.push(item);
      return;
    }
    if (!canonicalId) {
      conflitos.push(conflito('SAIDA_SEM_IDENTIDADE', { indice }));
      historico.push(item);
      return;
    }
    if (!mapa.has(canonicalId)) mapa.set(canonicalId, []);
    mapa.get(canonicalId).push(item);
  });

  const saidas = [];
  for (const [canonicalId, registros] of mapa.entries()) {
    if (registros.length === 1) {
      saidas.push(registros[0]);
      continue;
    }
    const assinaturas = new Set(registros.map(assinaturaSaida));
    if (assinaturas.size === 1) {
      const selecionada = registros.find(item => item.id.includes(canonicalId)) ||
        [...registros].sort((a, b) => a.id.localeCompare(b.id))[0];
      saidas.push(selecionada);
      conflitos.push(conflito('SAIDA_DUPLICADA_EQUIVALENTE', {
        canonicalId,
        ids: registros.map(item => item.id).sort(),
        selecionado: selecionada.id,
      }, false));
    } else {
      conflitos.push(conflito('SAIDA_DUPLICADA_DIVERGENTE', {
        canonicalId,
        ids: registros.map(item => item.id).sort(),
      }));
      historico.push(...registros);
    }
  }
  saidas.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  return {
    estado: conflitos.some(item => item.bloqueante !== false) ? 'parcial' : saidas.length ? 'confirmado' : 'vazio',
    saidas,
    historico,
    conflitos,
  };
}

function competenciaMovimentoSaida(saida) {
  const explicita = String(saida.competenciaMovimento || '').trim();
  if (competenciaValida(explicita)) return explicita;
  const data = dataCivilFinanceira(saida.dataSaida || '');
  if (dataValida(data)) return data.slice(0, 7);
  const ultima = String(saida.ultimaCompetenciaPagamento || '').trim();
  return competenciaValida(ultima) ? proximaCompetencia(ultima) : '';
}

/** Projeta ativos, entradas e saídas de uma competência sem snapshot gravado. */
export function projetarMovimentosCompetencia({
  contratos,
  saidas = [],
  competencia,
  aliases = {},
  contextosVigencia = {},
} = {}) {
  if (!competenciaValida(competencia)) return resultadoIndisponivel('COMPETENCIA_INVALIDA', { competencia });
  const contratosCanonicos = canonicalizarContratos(contratos, aliases, contextosVigencia);
  if (contratosCanonicos.estado === 'indisponivel') return contratosCanonicos;
  const saidasCanonicas = deduplicarSaidas(saidas, { aliases });
  if (saidasCanonicas.estado === 'indisponivel') return saidasCanonicas;
  const conflitos = [...contratosCanonicos.conflitos, ...saidasCanonicas.conflitos];
  const ativos = [];
  const entradas = [];
  const saidasDoMes = [];
  const saidasVistas = new Set();

  contratosCanonicos.grupos.forEach(grupo => {
    const contrato = grupo.selecionado;
    if (!contrato || grupo.bloqueado) return;
    const vigencias = normalizarVigencias(contrato, contextosVigencia[grupo.canonicalId] || {});
    if (vigencias.estado === 'indisponivel') {
      conflitos.push(...vigencias.conflitos.map(item => ({ ...item, canonicalId: grupo.canonicalId })));
      return;
    }
    const intervaloAtivo = vigencias.intervalos.find(intervalo => intervaloContem(intervalo, competencia));
    if (intervaloAtivo) ativos.push({ canonicalId: grupo.canonicalId, contrato, intervalo: intervaloAtivo });
    vigencias.intervalos.forEach(intervalo => {
      if (intervalo.inicio === competencia) {
        entradas.push({ canonicalId: grupo.canonicalId, competencia, origem: intervalo.origem, cicloId: intervalo.cicloId });
      }
      if (intervalo.fim && proximaCompetencia(intervalo.fim) === competencia) {
        saidasDoMes.push({
          canonicalId: grupo.canonicalId,
          competencia,
          ultimaCompetenciaPagamento: intervalo.fim,
          origem: 'vigencia',
          cicloId: intervalo.cicloId,
        });
        saidasVistas.add(grupo.canonicalId);
      }
    });
  });

  saidasCanonicas.saidas.forEach(saida => {
    if (competenciaMovimentoSaida(saida) !== competencia || saidasVistas.has(saida.canonicalId)) return;
    saidasDoMes.push({ ...saida, competencia, origem: 'evento_saida' });
    saidasVistas.add(saida.canonicalId);
  });

  ativos.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  entradas.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  saidasDoMes.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  const bloqueios = conflitos.filter(item => item.bloqueante !== false);
  return {
    estado: bloqueios.length ? 'parcial' : (ativos.length || entradas.length || saidasDoMes.length) ? 'confirmado' : 'vazio',
    competencia,
    ativos,
    entradas,
    saidas: saidasDoMes,
    totais: { ativos: ativos.length, entradas: entradas.length, saidas: saidasDoMes.length },
    conflitos,
  };
}

/**
 * Fachada opcional para consumidores de UI. Todas as superfícies recebem as
 * mesmas projeções; a lista de competências da Régua é explícita para não
 * inventar meses legados que a fonte não comprovou.
 */
export function projetarFinanceiroCompetencia({
  contratos,
  pagamentos,
  saidas = [],
  recebimentosEntrada = [],
  receitasAvulsas = [],
  competencia,
  mesCaixa = competencia,
  hoje,
  aliases = {},
  contextosVigencia = {},
  competenciasRegua = [],
  carenciaDias = 5,
  competenciaInicialOperacao = '',
  competenciasQuitadasAte = '',
  destinosPessoais = ['conta_pessoal'],
} = {}) {
  if (!competenciaValida(competencia) || !competenciaValida(mesCaixa)) {
    return resultadoIndisponivel('COMPETENCIA_INVALIDA', { competencia, mesCaixa });
  }
  const competencias = [...new Set([
    ...competenciasRegua,
    competencia,
    proximaCompetencia(competencia),
  ].filter(competenciaValida))].sort();
  const obrigacoesPorCompetencia = competencias.map(item => projetarObrigacoes({
    contratos,
    pagamentos,
    competencia: item,
    aliases,
    contextosVigencia,
  }));
  const obrigacoes = obrigacoesPorCompetencia.find(item => item.competencia === competencia) ||
    resultadoIndisponivel('OBRIGACOES_DA_COMPETENCIA_AUSENTES');
  const movimentos = projetarMovimentosCompetencia({
    contratos,
    saidas,
    competencia,
    aliases,
    contextosVigencia,
  });
  const reconciliacao = reconciliarCompetenciaECaixa({
    obrigacoes,
    pagamentos,
    recebimentosEntrada,
    receitasAvulsas,
    competencia,
    mesCaixa,
    aliases,
    destinosPessoais,
  });
  const regua = hoje
    ? projetarReguaCobranca({
      obrigacoes: obrigacoesPorCompetencia,
      competencia,
      hoje,
      carenciaDias,
      competenciaInicialOperacao,
      competenciasQuitadasAte,
    })
    : { estado: 'nao_solicitado', conflitos: [] };
  const componentes = [obrigacoes, movimentos, reconciliacao, regua];
  if (componentes.some(item => item.estado === 'indisponivel')) {
    return {
      estado: 'indisponivel',
      competencia,
      obrigacoes,
      obrigacoesPorCompetencia,
      movimentos,
      reconciliacao,
      regua,
      conflitos: componentes.flatMap(item => item.conflitos || []),
    };
  }
  const conflitos = componentes.flatMap(item => item.conflitos || []);
  return {
    estado: conflitos.some(item => item.bloqueante !== false) ? 'parcial' : 'confirmado',
    competencia,
    obrigacoes,
    obrigacoesPorCompetencia,
    movimentos,
    reconciliacao,
    regua,
    conflitos,
    escritaExecutada: false,
  };
}

/** Normaliza número brasileiro para DDI+DDD+número; inválido retorna vazio. */
export function normalizarTelefoneBR(valor) {
  let digitos = String(valor || '').replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (!digitos.startsWith('55') || ![12, 13].includes(digitos.length)) return '';
  const nacional = digitos.slice(2);
  const ddd = Number(nacional.slice(0, 2));
  const assinante = nacional.slice(2);
  if (ddd < 11 || ddd > 99) return '';
  if (assinante.length === 9 && assinante[0] !== '9') return '';
  if (assinante.length === 8 && !/^[2-8]/.test(assinante)) return '';
  if (!/^\d+$/.test(assinante) || /^0+$/.test(assinante)) return '';
  return digitos;
}
