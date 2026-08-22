#!/usr/bin/env node

/*
 * Regressão sintética do núcleo financeiro V103.
 *
 * Não usa Firebase, DOM, rede ou dados operacionais. Os cenários verificam a
 * matemática e os contratos de competência antes de qualquer integração com
 * a interface. Cada asserção incrementa o contador de prova exibido no fim.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canonicalizarId,
  canonicalizarPagamentos,
  classificarCobranca,
  competenciaAnterior,
  competenciaValida,
  dataVencimentoDaCompetencia,
  deduplicarSaidas,
  mensalidadeResolvida,
  normalizarTelefoneBR,
  normalizarVigencias,
  proximaCompetencia,
  projetarFinanceiroCompetencia,
  projetarMovimentosCompetencia,
  projetarObrigacoes,
  projetarReguaCobranca,
  reconciliarCompetenciaECaixa,
  statusMensalidade,
  valorNaCompetencia,
  vigenteNaCompetencia,
} from '../financeiro-core.mjs';

let verificacoes = 0;

function ok(valor, mensagem) {
  verificacoes += 1;
  assert.ok(valor, mensagem);
}

function igual(atual, esperado, mensagem) {
  verificacoes += 1;
  assert.deepEqual(atual, esperado, mensagem);
}

function codigo(resultado, esperado, mensagem) {
  ok(resultado?.conflitos?.some(item => item.codigo === esperado), mensagem || esperado);
}

function congelarProfundo(valor) {
  if (!valor || typeof valor !== 'object' || Object.isFrozen(valor)) return valor;
  Object.freeze(valor);
  Object.values(valor).forEach(congelarProfundo);
  return valor;
}

function linha(resultado, canonicalId) {
  return resultado.linhas.find(item => item.canonicalId === canonicalId);
}

// ---------------------------------------------------------------------------
// 1. Superfície pública, pureza e competência
// ---------------------------------------------------------------------------

const fonteCore = readFileSync(new URL('../financeiro-core.mjs', import.meta.url), 'utf8');
[
  ['setDoc(', 'não chama setDoc'],
  ['updateDoc(', 'não chama updateDoc'],
  ['addDoc(', 'não chama addDoc'],
  ['deleteDoc(', 'não chama deleteDoc'],
  ['document.', 'não acessa document'],
  ['window.', 'não acessa window'],
  ['localStorage', 'não acessa localStorage'],
  ['sessionStorage', 'não acessa sessionStorage'],
  ['fetch(', 'não acessa rede'],
  ["from 'firebase", 'não importa Firebase'],
].forEach(([trecho, mensagem]) => ok(!fonteCore.includes(trecho), mensagem));

[
  ['2026-01', true],
  ['2026-09', true],
  ['2026-12', true],
  ['2026-00', false],
  ['2026-13', false],
  ['26-09', false],
  ['2026-9', false],
  ['', false],
  [null, false],
].forEach(([entrada, esperado]) => igual(competenciaValida(entrada), esperado, `competência ${entrada}`));

igual(proximaCompetencia('2026-09'), '2026-10', 'avança um mês');
igual(proximaCompetencia('2026-12'), '2027-01', 'avança o ano');
igual(competenciaAnterior('2026-09'), '2026-08', 'retrocede um mês');
igual(competenciaAnterior('2026-01'), '2025-12', 'retrocede o ano');
igual(proximaCompetencia('inválida'), '', 'não inventa próxima competência');
igual(competenciaAnterior(''), '', 'não inventa competência anterior');

// ---------------------------------------------------------------------------
// 2. Estados mensais e telefone brasileiro
// ---------------------------------------------------------------------------

[
  ['pago', 'pago', true],
  ['PAGA', 'pago', true],
  ['quitado', 'pago', true],
  ['recebida', 'pago', true],
  ['isenta', 'isento', true],
  ['cortesia', 'isento', true],
  ['cancelada', 'cancelado', true],
  ['encerrado', 'cancelado', true],
  ['aberto', 'aberto', false],
  ['pendente', 'aberto', false],
  ['', 'indisponivel', false],
  ['estado-inventado', 'indisponivel', false],
].forEach(([status, normalizado, resolvido]) => {
  igual(statusMensalidade({ status }), normalizado, `normaliza ${status || 'vazio'}`);
  igual(mensalidadeResolvida({ status }), resolvido, `resolve ${status || 'vazio'}`);
});

[
  ['(11) 91234-5678', '5511912345678'],
  ['+55 11 91234-5678', '5511912345678'],
  ['005511912345678', '5511912345678'],
  ['11 2345-6789', '551123456789'],
  ['551123456789', '551123456789'],
  ['10 91234-5678', ''],
  ['11 81234-5678', ''],
  ['11 1234-5678', ''],
  ['00000000000', ''],
  ['', ''],
].forEach(([entrada, esperado]) => igual(normalizarTelefoneBR(entrada), esperado, `telefone ${entrada || 'vazio'}`));

igual(canonicalizarId('apelido-a', { 'apelido-a': 'ponte-a', 'ponte-a': 'cliente-a' }), 'cliente-a', 'resolve cadeia de alias');
igual(canonicalizarId('cliente-a', { 'apelido-a': 'cliente-a' }), 'cliente-a', 'preserva canônico');
igual(canonicalizarId('ciclo-a', { 'ciclo-a': 'ciclo-b', 'ciclo-b': 'ciclo-a' }), 'ciclo-a', 'encerra ciclo de aliases');

// ---------------------------------------------------------------------------
// 3. Vigências modernas, legado, reativação e valor por competência
// ---------------------------------------------------------------------------

const contratoModernoComHiato = congelarProfundo({
  canonicalId: 'cliente-hiato-moderno',
  vigencias: [
    { inicio: '2026-01', fim: '2026-08', valor: 1500, cicloId: 'ciclo-1' },
    { inicio: '2026-11', valor: 1000, cicloId: 'ciclo-2' },
  ],
});
const vigenciasModernas = normalizarVigencias(contratoModernoComHiato);
igual(vigenciasModernas.estado, 'confirmado', 'vigências modernas são confirmadas');
igual(vigenciasModernas.origem, 'vigencias', 'vigencias[] é fonte autoritativa');
igual(vigenciasModernas.intervalos.length, 2, 'preserva dois ciclos');
igual(vigenciasModernas.intervalos[0].fim, '2026-08', 'preserva fim do ciclo antigo');
igual(vigenciasModernas.intervalos[1].inicio, '2026-11', 'preserva início da reativação');
igual(vigenteNaCompetencia(contratoModernoComHiato, '2026-01'), true, 'ativo no início');
igual(vigenteNaCompetencia(contratoModernoComHiato, '2026-08'), true, 'ativo no último mês pago');
igual(vigenteNaCompetencia(contratoModernoComHiato, '2026-09'), false, 'não reabre setembro');
igual(vigenteNaCompetencia(contratoModernoComHiato, '2026-10'), false, 'não reabre outubro');
igual(vigenteNaCompetencia(contratoModernoComHiato, '2026-11'), true, 'reativa somente em novembro');

const contratoLegadoReativado = congelarProfundo({
  canonicalId: 'cliente-hiato-legado',
  primeiraCompetencia: '2026-01',
  ultimaCompetenciaPagamento: '2026-08',
  valorInicial: 1500,
  reativacoes: [{ inicio: '2026-11', valor: 1000, cicloId: 'retorno-1' }],
});
const vigenciasLegadas = normalizarVigencias(contratoLegadoReativado);
igual(vigenciasLegadas.estado, 'confirmado', 'legado reativado é normalizável');
igual(vigenciasLegadas.origem, 'legado', 'identifica origem legada');
igual(vigenciasLegadas.intervalos.length, 2, 'legado produz dois intervalos');
igual(vigenteNaCompetencia(contratoLegadoReativado, '2026-08'), true, 'legado mantém agosto');
igual(vigenteNaCompetencia(contratoLegadoReativado, '2026-09'), false, 'legado mantém hiato setembro');
igual(vigenteNaCompetencia(contratoLegadoReativado, '2026-10'), false, 'legado mantém hiato outubro');
igual(vigenteNaCompetencia(contratoLegadoReativado, '2026-11'), true, 'legado retorna novembro');

const vigenciasVaziasAutoritativas = normalizarVigencias({
  canonicalId: 'cliente-sem-ciclo',
  vigencias: [],
  primeiraCompetencia: '2026-01',
});
igual(vigenciasVaziasAutoritativas.estado, 'vazio', 'vigencias[] vazio não cai no legado');
igual(vigenciasVaziasAutoritativas.intervalos.length, 0, 'não inventa intervalo legado');
igual(vigenteNaCompetencia({ vigencias: [] }, '2026-09'), false, 'vigência vazia não fica ativa');

const vigenciasDuplicadas = normalizarVigencias({
  vigencias: [
    { inicio: '2026-01', fim: '2026-08', valor: 500, cicloId: 'a' },
    { inicio: '2026-01', fim: '2026-08', valor: 500, cicloId: 'b' },
  ],
});
igual(vigenciasDuplicadas.estado, 'confirmado', 'duplicata equivalente não bloqueia');
igual(vigenciasDuplicadas.intervalos.length, 1, 'deduplica intervalo equivalente');
codigo(vigenciasDuplicadas, 'VIGENCIA_DUPLICADA_EQUIVALENTE', 'explicita duplicata equivalente');

const vigenciasSobrepostas = normalizarVigencias({
  vigencias: [
    { inicio: '2026-01', fim: '2026-08', valor: 500 },
    { inicio: '2026-08', fim: '2026-12', valor: 600 },
  ],
});
igual(vigenciasSobrepostas.estado, 'indisponivel', 'sobreposição bloqueia cálculo');
codigo(vigenciasSobrepostas, 'VIGENCIAS_SOBREPOSTAS');

const vigenciaInvertida = normalizarVigencias({ vigencias: [{ inicio: '2026-09', fim: '2026-08', valor: 500 }] });
igual(vigenciaInvertida.estado, 'indisponivel', 'intervalo invertido é indisponível');
codigo(vigenciaInvertida, 'VIGENCIA_INTERVALO_INVERTIDO');

const contratoValorProgramado = congelarProfundo({
  canonicalId: 'cliente-valor-programado',
  primeiraCompetencia: '2026-01',
  valorInicial: 1500,
  valorProgramado: 1000,
  valorProgramadoEm: '2026-09',
});
igual(valorNaCompetencia(contratoValorProgramado, '2026-08').valor, 1500, 'agosto preserva 1500');
igual(valorNaCompetencia(contratoValorProgramado, '2026-09').valor, 1000, 'setembro muda para 1000');
igual(valorNaCompetencia(contratoValorProgramado, '2026-10').valor, 1000, 'outubro mantém 1000');
igual(valorNaCompetencia(contratoValorProgramado, '2026-09').origem, 'programacao', 'informa origem programada');
igual(valorNaCompetencia({ vigencias: [] }, '2026-09').estado, 'fora_vigencia', 'fora da vigência não cobra');
igual(valorNaCompetencia({}, 'inválida').estado, 'indisponivel', 'valor exige competência válida');

// ---------------------------------------------------------------------------
// 4. Canonização de pagamentos, histórico e conflitos
// ---------------------------------------------------------------------------

const aliases = congelarProfundo({ 'apelido-cliente-a': 'cliente-a', 'apelido-saida': 'cliente-saida' });
const duplicadosEquivalentes = canonicalizarPagamentos([
  { id: 'alias-doc', clienteId: 'apelido-cliente-a', competencia: '2026-09', status: 'pago', valorDevido: 1000, pagoEm: '2026-09-10' },
  { id: 'cliente-a_2026-09', clienteId: 'cliente-a', competencia: '2026-09', status: 'pago', valorDevido: 1000, pagoEm: '2026-09-10' },
], { aliases });
igual(duplicadosEquivalentes.estado, 'confirmado', 'duplicata equivalente não bloqueia pagamentos');
igual(duplicadosEquivalentes.grupos.length, 1, 'aliases convergem no mesmo grupo');
igual(duplicadosEquivalentes.grupos[0].canonicalId, 'cliente-a', 'grupo usa ID canônico');
igual(duplicadosEquivalentes.grupos[0].selecionado.id, 'cliente-a_2026-09', 'prefere documento canônico');
igual(duplicadosEquivalentes.historico.length, 2, 'preserva ambos no histórico');
codigo(duplicadosEquivalentes, 'PAGAMENTO_DUPLICADO_EQUIVALENTE');

const duplicadosDivergentes = canonicalizarPagamentos([
  { id: 'pago-a', clienteId: 'cliente-a', competencia: '2026-09', status: 'pago', valorDevido: 1000, pagoEm: '2026-09-10' },
  { id: 'aberto-a', clienteId: 'cliente-a', competencia: '2026-09', status: 'aberto', valorDevido: 1000 },
]);
igual(duplicadosDivergentes.estado, 'parcial', 'verdades divergentes bloqueiam');
igual(duplicadosDivergentes.grupos[0].bloqueado, true, 'grupo divergente está bloqueado');
igual(duplicadosDivergentes.grupos[0].selecionado, null, 'não escolhe verdade silenciosamente');
codigo(duplicadosDivergentes, 'PAGAMENTO_DUPLICADO_DIVERGENTE');

const historicoExcluido = canonicalizarPagamentos([
  { id: 'ativo', clienteId: 'cliente-a', competencia: '2026-09', status: 'aberto', valorDevido: 1000 },
  { id: 'antigo', clienteId: 'cliente-a', competencia: '2026-09', status: 'pago', valorDevido: 1500, excluido: true },
]);
igual(historicoExcluido.estado, 'confirmado', 'soft-delete não conflita com atual');
igual(historicoExcluido.grupos[0].selecionado.id, 'ativo', 'seleciona registro vigente');
igual(historicoExcluido.historico.length, 2, 'soft-delete continua auditável');

const pagamentoInvalido = canonicalizarPagamentos([{ id: 'sem-competencia', clienteId: 'cliente-a', competencia: 'x' }]);
igual(pagamentoInvalido.estado, 'parcial', 'competência inválida não desaparece');
codigo(pagamentoInvalido, 'PAGAMENTO_COMPETENCIA_INVALIDA');
igual(canonicalizarPagamentos([]).estado, 'vazio', 'fonte vazia é vazio legítimo');
igual(canonicalizarPagamentos({ estado: 'indisponivel', codigo: 'timeout' }).estado, 'indisponivel', 'timeout não vira vazio');

// ---------------------------------------------------------------------------
// 5. Obrigações virtuais, valor imutável e três competências
// ---------------------------------------------------------------------------

const contratosBase = congelarProfundo([
  {
    canonicalId: 'cliente-a',
    primeiraCompetencia: '2026-01',
    valorInicial: 1500,
    valorProgramado: 1000,
    valorProgramadoEm: '2026-09',
    diaVencimento: 10,
  },
  { canonicalId: 'cliente-b', primeiraCompetencia: '2026-09', valorInicial: 800, diaVencimento: 15 },
  { canonicalId: 'cliente-c', primeiraCompetencia: '2026-09', valorInicial: 500, cortesiaMeses: ['2026-09'], diaVencimento: 10 },
  { canonicalId: 'cliente-d', primeiraCompetencia: '2026-09', valorInicial: 700, diaVencimento: 1 },
]);

const pagamentosBase = congelarProfundo([
  { id: 'cliente-a_2026-08', clienteId: 'cliente-a', competencia: '2026-08', status: 'pago', valorDevido: 1500, pagoEm: '2026-08-10' },
  { id: 'cliente-a_2026-09', clienteId: 'cliente-a', competencia: '2026-09', status: 'aberto', valorDevido: 1000, diaVencimento: 10 },
  { id: 'cliente-a_2026-10', clienteId: 'cliente-a', competencia: '2026-10', status: 'aberto', valorDevido: 1000, diaVencimento: 10 },
  { id: 'cliente-b_2026-09', clienteId: 'cliente-b', competencia: '2026-09', status: 'pago', valorDevido: 800, pagoEm: '2026-10-02', diaVencimento: 15 },
  { id: 'cliente-c_2026-09', clienteId: 'cliente-c', competencia: '2026-09', status: 'isento', valorDevido: 500, diaVencimento: 10 },
  { id: 'cliente-d_2026-09', clienteId: 'cliente-d', competencia: '2026-09', status: 'pago', valorDevido: 700, pagoEm: '2026-10-05', origemRecebimento: 'entrada_contrato', diaVencimento: 1 },
]);

const agosto = projetarObrigacoes({ contratos: contratosBase, pagamentos: pagamentosBase, competencia: '2026-08' });
const setembro = projetarObrigacoes({ contratos: contratosBase, pagamentos: pagamentosBase, competencia: '2026-09' });
const outubro = projetarObrigacoes({ contratos: contratosBase, pagamentos: pagamentosBase, competencia: '2026-10' });

igual(agosto.estado, 'confirmado', 'agosto é calculável');
igual(agosto.totais.previsto, 1500, 'agosto preserva valor histórico');
igual(agosto.totais.quitado, 1500, 'agosto está quitado');
igual(agosto.totais.aberto, 0, 'agosto sem aberto');
igual(linha(agosto, 'cliente-a').valorDevido, 1500, 'pago antigo é imutável');
igual(linha(agosto, 'cliente-a').materializada, true, 'agosto usa documento existente');

igual(setembro.estado, 'confirmado', 'setembro é calculável');
igual(setembro.linhas.length, 4, 'setembro tem quatro clientes vigentes');
igual(setembro.totais.previsto, 2500, 'setembro soma somente pago e aberto');
igual(setembro.totais.quitado, 1500, 'setembro separa quitação');
igual(setembro.totais.aberto, 1000, 'setembro separa aberto');
igual(setembro.totais.isento, 1, 'setembro conta cortesia sem somar receita');
igual(setembro.totais.reconciliado, true, 'previsto = quitado + aberto');
igual(setembro.totais.materializadas, 4, 'setembro respeita documentos já existentes');
igual(setembro.totais.virtuais, 0, 'não inventa virtual quando materializado');
igual(setembro.escritaExecutada, false, 'projeção não escreve');
igual(linha(setembro, 'cliente-a').valorDevido, 1000, 'mudança programada vale em setembro');
igual(linha(setembro, 'cliente-c').status, 'isento', 'cortesia continua explícita');

igual(outubro.estado, 'confirmado', 'outubro futuro é calculável');
igual(outubro.linhas.length, 4, 'outubro projeta quatro obrigações');
igual(outubro.totais.previsto, 3000, 'outubro projeta valores vigentes');
igual(outubro.totais.aberto, 3000, 'outubro futuro permanece aberto');
igual(outubro.totais.materializadas, 1, 'um documento futuro já materializado');
igual(outubro.totais.virtuais, 3, 'demais obrigações são virtuais');
igual(linha(outubro, 'cliente-a').materializada, true, 'preserva materialização futura');
igual(linha(outubro, 'cliente-b').materializada, false, 'projeta sem gravar cliente-b');
igual(linha(outubro, 'cliente-b').id, 'cliente-b_2026-10', 'ID virtual é determinístico');
igual(linha(outubro, 'cliente-c').id, 'cliente-c_2026-10', 'segundo ID virtual é determinístico');
igual(outubro.escritaExecutada, false, 'mês futuro não grava na leitura');

const pagoHistoricoDivergente = projetarObrigacoes({
  contratos: [{ canonicalId: 'cliente-imutavel', primeiraCompetencia: '2026-01', valorInicial: 1000 }],
  pagamentos: [{ id: 'cliente-imutavel_2026-09', clienteId: 'cliente-imutavel', competencia: '2026-09', status: 'pago', valorDevido: 1500, pagoEm: '2026-09-10' }],
  competencia: '2026-09',
});
igual(pagoHistoricoDivergente.estado, 'confirmado', 'pago divergente é preservado, não reescrito');
igual(pagoHistoricoDivergente.totais.quitado, 1500, 'pago imutável mantém valor real');
codigo(pagoHistoricoDivergente, 'VALOR_HISTORICO_PRESERVADO');

const abertoDivergente = projetarObrigacoes({
  contratos: [{ canonicalId: 'cliente-aberto', primeiraCompetencia: '2026-01', valorInicial: 1000 }],
  pagamentos: [{ id: 'cliente-aberto_2026-09', clienteId: 'cliente-aberto', competencia: '2026-09', status: 'aberto', valorDevido: 1500 }],
  competencia: '2026-09',
});
igual(abertoDivergente.estado, 'parcial', 'aberto divergente não é somado silenciosamente');
igual(abertoDivergente.totais.previsto, 0, 'total bloqueia linha divergente');
codigo(abertoDivergente, 'VALOR_MATERIALIZADO_DIVERGENTE');

const contratoEncerrado = congelarProfundo({
  canonicalId: 'cliente-saida',
  primeiraCompetencia: '2026-01',
  ultimaCompetenciaPagamento: '2026-08',
  valorInicial: 900,
});
const saidaSetembro = projetarObrigacoes({
  contratos: [contratoEncerrado],
  pagamentos: [{ id: 'cliente-saida_2026-09', clienteId: 'cliente-saida', competencia: '2026-09', status: 'aberto', valorDevido: 900 }],
  competencia: '2026-09',
});
igual(saidaSetembro.estado, 'parcial', 'cobrança após saída vira conflito');
igual(saidaSetembro.totais.previsto, 0, 'saída em agosto não entra em setembro');
igual(saidaSetembro.linhas[0].estado, 'conflito', 'documento órfão é visível');
codigo(saidaSetembro, 'PAGAMENTO_SEM_CONTRATO_VIGENTE');
igual(projetarObrigacoes({ contratos: [contratoEncerrado], pagamentos: [], competencia: '2026-10' }).totais.clientes, 0, 'saída em agosto não entra em outubro');

const canceladoForaVigencia = projetarObrigacoes({
  contratos: [contratoEncerrado],
  pagamentos: [{ id: 'cancelado', clienteId: 'cliente-saida', competencia: '2026-09', status: 'cancelado', valorDevido: 900 }],
  competencia: '2026-09',
});
igual(canceladoForaVigencia.estado, 'confirmado', 'cancelado histórico não bloqueia');
igual(canceladoForaVigencia.linhas[0].estado, 'historico', 'cancelado fica auditável');
igual(canceladoForaVigencia.totais.previsto, 0, 'cancelado não vira receita');

// ---------------------------------------------------------------------------
// 6. Reconciliação: competência contratual versus caixa pela data real
// ---------------------------------------------------------------------------

const recebimentosEntrada = congelarProfundo([
  { id: 'entrada-agencia', status: 'pago', valorConfirmado: 700, pagoEm: '2026-10-05', destino: 'conta_agencia' },
  { id: 'entrada-pessoal', status: 'pago', valorConfirmado: 200, pagoEm: '2026-10-07', destino: 'conta_pessoal' },
]);
const receitasAvulsas = congelarProfundo([
  { id: 'avulsa-outubro', recebido: true, valorRecebido: 300, recebidoEm: '2026-10-08' },
  { id: 'avulsa-futura', recebido: false, valor: 400, recebidoEm: '2026-10-09' },
]);

const reconciliacaoSetembro = reconciliarCompetenciaECaixa({
  obrigacoes: setembro,
  pagamentos: pagamentosBase,
  recebimentosEntrada,
  receitasAvulsas,
  competencia: '2026-09',
  mesCaixa: '2026-09',
});
igual(reconciliacaoSetembro.estado, 'confirmado', 'reconciliação setembro é confiável');
igual(reconciliacaoSetembro.competencia.previsto, 2500, 'competência preserva previsto');
igual(reconciliacaoSetembro.competencia.quitado, 1500, 'competência registra quitado mesmo pago depois');
igual(reconciliacaoSetembro.caixa.totalAgencia, 0, 'caixa setembro não antecipa recebimento de outubro');
igual(reconciliacaoSetembro.caixa.totalPessoal, 0, 'caixa pessoal setembro também vazio');
igual(reconciliacaoSetembro.diferencaQuitadoVsCaixaAgencia, 1500, 'diferença entre competência e caixa é explícita');

const reconciliacaoOutubroCaixa = reconciliarCompetenciaECaixa({
  obrigacoes: setembro,
  pagamentos: pagamentosBase,
  recebimentosEntrada,
  receitasAvulsas,
  competencia: '2026-09',
  mesCaixa: '2026-10',
});
igual(reconciliacaoOutubroCaixa.caixa.recorrenteAgencia, 800, 'mensalidade atrasada entra no caixa outubro');
igual(reconciliacaoOutubroCaixa.caixa.entradasAgencia, 700, 'entrada de contrato entra uma vez');
igual(reconciliacaoOutubroCaixa.caixa.avulsasAgencia, 300, 'receita avulsa recebida entra no caixa');
igual(reconciliacaoOutubroCaixa.caixa.totalAgencia, 1800, 'caixa agência soma fontes sem duplicar entrada');
igual(reconciliacaoOutubroCaixa.caixa.entradasPessoal, 200, 'separa conta pessoal');
igual(reconciliacaoOutubroCaixa.caixa.totalPessoal, 200, 'total pessoal não contamina agência');
igual(reconciliacaoOutubroCaixa.competencia.previsto, 2500, 'mudar mês de caixa não muda competência');
igual(reconciliacaoOutubroCaixa.superficies.contratos.previsto, 2500, 'Contratos usa mesmo previsto');
igual(reconciliacaoOutubroCaixa.superficies.mensalidades.previsto, 2500, 'Mensalidades usa mesmo previsto');
igual(reconciliacaoOutubroCaixa.superficies.financeiro.previsto, 2500, 'Financeiro usa mesmo previsto');
igual(reconciliacaoOutubroCaixa.superficies.regua.abertoDaCompetencia, 1000, 'Régua usa mesmo aberto');
igual(reconciliacaoOutubroCaixa.superficies.mensalidades.aberto, reconciliacaoOutubroCaixa.superficies.financeiro.aberto, 'superfícies reconciliam aberto');

// ---------------------------------------------------------------------------
// 7. Régua por competência com relógio controlado
// ---------------------------------------------------------------------------

const linhasRegua = congelarProfundo([
  { canonicalId: 'cliente-antigo', competencia: '2026-08', estado: 'confirmado', status: 'aberto', valorDevido: 400, diaVencimento: 10, materializada: true },
  { canonicalId: 'cliente-antigo-virtual', competencia: '2026-08', estado: 'confirmado', status: 'aberto', valorDevido: 999, diaVencimento: 10, materializada: false },
  { canonicalId: 'cliente-dia-1', competencia: '2026-09', estado: 'confirmado', status: 'aberto', valorDevido: 500, diaVencimento: 1 },
  { canonicalId: 'cliente-dia-10', competencia: '2026-09', estado: 'confirmado', status: 'aberto', valorDevido: 600, diaVencimento: 10 },
  { canonicalId: 'cliente-dia-15', competencia: '2026-09', estado: 'confirmado', status: 'aberto', valorDevido: 700, diaVencimento: 15 },
  { canonicalId: 'cliente-seguinte', competencia: '2026-10', estado: 'confirmado', status: 'aberto', valorDevido: 800, diaVencimento: 10 },
  { canonicalId: 'cliente-pago', competencia: '2026-09', estado: 'confirmado', status: 'pago', valorDevido: 900, diaVencimento: 1 },
]);

igual(dataVencimentoDaCompetencia('2026-02', 31), '2026-02-28', 'limita vencimento ao último dia');
igual(dataVencimentoDaCompetencia('2028-02', 31), '2028-02-29', 'respeita ano bissexto');
igual(dataVencimentoDaCompetencia('inválida', 10), '', 'data não nasce de competência inválida');
igual(classificarCobranca(linhasRegua[2], '2026-09-01').estado, 'vence_hoje', 'vence hoje');
igual(classificarCobranca(linhasRegua[3], '2026-09-09').estado, 'vence_amanha', 'vence amanhã');
igual(classificarCobranca(linhasRegua[3], '2026-09-10').estado, 'vence_hoje', 'vence no dia dez');
igual(classificarCobranca(linhasRegua[3], '2026-09-12').estado, 'carencia', 'sábado após vencimento permanece em carência configurada');
igual(classificarCobranca(linhasRegua[3], '2026-09-16').estado, 'atrasado', 'após carência fica atrasado');
igual(classificarCobranca(linhasRegua[5], '2026-09-01').estado, 'a_vencer', 'próxima competência é previsão');

const reguaInicioMes = projetarReguaCobranca({ obrigacoes: linhasRegua, competencia: '2026-09', hoje: '2026-09-01', carenciaDias: 5 });
igual(reguaInicioMes.estado, 'confirmado', 'régua inicial é calculável');
igual(reguaInicioMes.anterioresVencidos.quantidade, 1, 'passivo anterior fica em bloco próprio');
igual(reguaInicioMes.anterioresVencidos.total, 400, 'totaliza passivo anterior');
igual(reguaInicioMes.competenciaSelecionada.quantidade, 3, 'somente abertos do mês entram na seleção');
igual(reguaInicioMes.competenciaSelecionada.totalEmAberto, 1800, 'total aberto do mês selecionado');
igual(reguaInicioMes.competenciaSelecionada.porEstado.vence_hoje.length, 1, 'dia um vence hoje');
igual(reguaInicioMes.competenciaSelecionada.porEstado.a_vencer.length, 2, 'dia dez e quinze ainda não atrasam');
igual(reguaInicioMes.proximaPrevisao.competencia, '2026-10', 'próximo mês é explícito');
igual(reguaInicioMes.proximaPrevisao.quantidade, 1, 'próxima previsão separada');
igual(reguaInicioMes.proximaPrevisao.totalPrevisto, 800, 'total da próxima previsão');

const reguaFimCarencia = projetarReguaCobranca({ obrigacoes: linhasRegua, competencia: '2026-09', hoje: '2026-09-12', carenciaDias: 5 });
igual(reguaFimCarencia.competenciaSelecionada.porEstado.atrasado.length, 1, 'dia um está atrasado no dia doze');
igual(reguaFimCarencia.competenciaSelecionada.porEstado.carencia.length, 1, 'dia dez está em carência no sábado');
igual(reguaFimCarencia.competenciaSelecionada.porEstado.a_vencer.length, 1, 'dia quinze ainda está a vencer');
igual(reguaFimCarencia.anterioresVencidos.quantidade, 1, 'fim de semana não apaga atraso anterior');
igual(projetarReguaCobranca({ obrigacoes: [], competencia: '2026-09', hoje: '2026-09-01' }).estado, 'vazio', 'régua vazia é vazio legítimo');
igual(projetarReguaCobranca({ obrigacoes: { estado: 'indisponivel' }, competencia: '2026-09', hoje: '2026-09-01' }).estado, 'indisponivel', 'falha não vira régua vazia');
igual(projetarReguaCobranca({ obrigacoes: [], competencia: '2026-09', hoje: 'data' }).estado, 'indisponivel', 'relógio inválido bloqueia régua');

// ---------------------------------------------------------------------------
// 8. Ativos 22→19, entradas, saídas, aliases e reativação
// ---------------------------------------------------------------------------

const contratos22 = congelarProfundo(Array.from({ length: 22 }, (_, indice) => ({
  canonicalId: `cliente-carteira-${String(indice + 1).padStart(2, '0')}`,
  primeiraCompetencia: '2026-01',
  ultimaCompetenciaPagamento: indice >= 19 ? '2026-08' : '',
  valorInicial: 100,
})));

const agosto22 = projetarMovimentosCompetencia({ contratos: contratos22, competencia: '2026-08' });
const setembro19 = projetarMovimentosCompetencia({ contratos: contratos22, competencia: '2026-09' });
const outubro19 = projetarMovimentosCompetencia({ contratos: contratos22, competencia: '2026-10' });
igual(agosto22.totais.ativos, 22, 'agosto tem 22 ativos');
igual(setembro19.totais.ativos, 19, 'setembro tem 19 ativos');
igual(setembro19.totais.saidas, 3, 'setembro mostra três saídas de agosto');
igual(setembro19.totais.entradas, 0, 'setembro não inventa entradas');
igual(outubro19.totais.ativos, 19, 'outubro mantém 19 ativos');
igual(outubro19.totais.saidas, 0, 'saída não se repete em outubro');
igual(new Set(setembro19.ativos.map(item => item.canonicalId)).size, 19, 'ativos não duplicam');
igual(new Set(setembro19.saidas.map(item => item.canonicalId)).size, 3, 'saídas não duplicam');

const movimentoReativadoSet = projetarMovimentosCompetencia({ contratos: [contratoLegadoReativado], competencia: '2026-09' });
const movimentoReativadoOut = projetarMovimentosCompetencia({ contratos: [contratoLegadoReativado], competencia: '2026-10' });
const movimentoReativadoNov = projetarMovimentosCompetencia({ contratos: [contratoLegadoReativado], competencia: '2026-11' });
igual(movimentoReativadoSet.totais.ativos, 0, 'reativação não reabre setembro');
igual(movimentoReativadoOut.totais.ativos, 0, 'reativação não reabre outubro');
igual(movimentoReativadoNov.totais.ativos, 1, 'reativação ativa novembro');
igual(movimentoReativadoNov.totais.entradas, 1, 'reativação é entrada em novembro');
igual(movimentoReativadoNov.entradas[0].cicloId, 'retorno-1', 'movimento preserva ciclo da reativação');

const saidasEquivalentes = deduplicarSaidas([
  { id: 'saida-alias', clienteId: 'apelido-saida', dataSaida: '2026-08-20', ultimaCompetenciaPagamento: '2026-08', statusSaida: 'encerrada' },
  { id: 'cliente-saida-evento', clienteId: 'cliente-saida', dataSaida: '2026-08-20', ultimaCompetenciaPagamento: '2026-08', statusSaida: 'encerrada' },
], { aliases });
igual(saidasEquivalentes.estado, 'confirmado', 'saídas equivalentes não bloqueiam');
igual(saidasEquivalentes.saidas.length, 1, 'deduplica saída por canonicalId');
igual(saidasEquivalentes.saidas[0].canonicalId, 'cliente-saida', 'saída usa ID canônico');
igual(saidasEquivalentes.historico.length, 0, 'duplicata equivalente não vira saída extra');
codigo(saidasEquivalentes, 'SAIDA_DUPLICADA_EQUIVALENTE');

const saidasDivergentes = deduplicarSaidas([
  { id: 'saida-1', clienteId: 'cliente-saida', dataSaida: '2026-08-20', ultimaCompetenciaPagamento: '2026-08' },
  { id: 'saida-2', clienteId: 'cliente-saida', dataSaida: '2026-09-02', ultimaCompetenciaPagamento: '2026-09' },
]);
igual(saidasDivergentes.estado, 'parcial', 'datas de saída divergentes bloqueiam');
igual(saidasDivergentes.saidas.length, 0, 'não escolhe saída divergente');
igual(saidasDivergentes.historico.length, 2, 'preserva divergências no histórico');
codigo(saidasDivergentes, 'SAIDA_DUPLICADA_DIVERGENTE');

const saidaCancelada = deduplicarSaidas([{ id: 'saida-cancelada', clienteId: 'cliente-x', statusSaida: 'cancelada', excluido: true }]);
igual(saidaCancelada.estado, 'vazio', 'saída cancelada não é operacional');
igual(saidaCancelada.saidas.length, 0, 'saída cancelada não reduz carteira');
igual(saidaCancelada.historico.length, 1, 'saída cancelada continua auditável');

// ---------------------------------------------------------------------------
// 9. Fachada, sinais de erro/vazio e ausência de mutação
// ---------------------------------------------------------------------------

const fachada = projetarFinanceiroCompetencia({
  contratos: contratosBase,
  pagamentos: pagamentosBase,
  competencia: '2026-09',
  mesCaixa: '2026-10',
  hoje: '2026-09-12',
  competenciasRegua: ['2026-08'],
  recebimentosEntrada,
  receitasAvulsas,
});
igual(fachada.estado, 'confirmado', 'fachada agrega componentes confirmados');
igual(fachada.obrigacoes.competencia, '2026-09', 'fachada expõe competência selecionada');
igual(fachada.obrigacoes.totais.previsto, 2500, 'fachada não recalcula total diferente');
igual(fachada.movimentos.totais.ativos, 4, 'fachada usa mesma carteira');
igual(fachada.reconciliacao.caixa.totalAgencia, 1800, 'fachada preserva caixa por data');
igual(fachada.regua.anterioresVencidos.quantidade, 0, 'agosto quitado não vira atraso');
igual(fachada.regua.competenciaSelecionada.totalEmAberto, 1000, 'régua da fachada usa aberto setembro');
igual(fachada.regua.proximaPrevisao.totalPrevisto, 3000, 'régua da fachada projeta outubro');
igual(fachada.obrigacoesPorCompetencia.length, 3, 'fachada calcula meses explícitos sem varrer história');
igual(fachada.escritaExecutada, false, 'fachada é data-only');

const fachadaSemRelogio = projetarFinanceiroCompetencia({
  contratos: [], pagamentos: [], competencia: '2026-09', mesCaixa: '2026-09',
});
igual(fachadaSemRelogio.regua.estado, 'nao_solicitado', 'régua só roda com relógio explícito');
igual(fachadaSemRelogio.escritaExecutada, false, 'fachada vazia também não escreve');

igual(projetarObrigacoes({ contratos: [], pagamentos: [], competencia: '2026-09' }).estado, 'vazio', 'obrigação vazia é legítima');
igual(projetarObrigacoes({ contratos: { estado: 'indisponivel', codigo: 'timeout' }, pagamentos: [], competencia: '2026-09' }).estado, 'indisponivel', 'timeout de contratos não vira zero');
igual(projetarObrigacoes({ contratos: [], pagamentos: { estado: 'indisponivel', codigo: 'permission-denied' }, competencia: '2026-09' }).estado, 'indisponivel', 'permissão negada não vira zero');
igual(projetarMovimentosCompetencia({ contratos: [], competencia: '2026-09' }).estado, 'vazio', 'carteira vazia é sinal próprio');
igual(projetarMovimentosCompetencia({ contratos: { estado: 'indisponivel', codigo: 'offline' }, competencia: '2026-09' }).estado, 'indisponivel', 'offline não vira carteira vazia');
igual(reconciliarCompetenciaECaixa({ obrigacoes: { estado: 'indisponivel' }, pagamentos: [], competencia: '2026-09' }).estado, 'indisponivel', 'obrigação indisponível bloqueia caixa');
igual(projetarFinanceiroCompetencia({ contratos: [], pagamentos: [], competencia: 'x' }).estado, 'indisponivel', 'fachada rejeita competência inválida');

// Os objetos congelados só chegariam aqui se nenhuma projeção tentasse mutá-los.
igual(Object.isFrozen(contratosBase), true, 'fixture de contratos permaneceu congelada');
igual(Object.isFrozen(pagamentosBase), true, 'fixture de pagamentos permaneceu congelada');
igual(contratosBase[0].valorProgramado, 1000, 'contrato de entrada não foi alterado');
igual(pagamentosBase[0].valorDevido, 1500, 'pagamento de entrada não foi alterado');

ok(verificacoes >= 100, `matriz executou pelo menos 100 verificações (executou ${verificacoes})`);
console.log(`OK V103 financeiro competências: ${verificacoes}/${verificacoes} verificações sintéticas`);
