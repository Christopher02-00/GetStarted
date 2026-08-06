#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escritorio = fs.readFileSync(path.join(raiz, 'escritorio.html'), 'utf8');
const calendario = fs.readFileSync(path.join(raiz, 'calendario.html'), 'utf8');
let total = 0;

function exigir(condicao, mensagem) {
  total++;
  if (!condicao) throw new Error(mensagem);
}

function trecho(fonte, inicio, fim) {
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if (a < 0 || b < 0) throw new Error(`não encontrei o trecho: ${inicio}`);
  return fonte.slice(a, b);
}

function executarSandbox(nome, codigo) {
  const contexto = vm.createContext({ Date, console, window: {} });
  new vm.Script(codigo, { filename: nome }).runInContext(contexto);
  return contexto.api;
}

function testarFinanceiroSandbox() {
  const fonte = trecho(escritorio, 'function competenciaValidaExtra', '/* Alias legado:');
  const api = executarSandbox('financeiro-sandbox.js',
    `function hojeLocal(){ return '2026-08-05'; }\n${fonte}\nglobalThis.api={mesDaRealizacaoExtra,mesDoPagamentoExtra};`);
  for (let ano = 2023; ano <= 2029; ano++) {
    for (let mes = 1; mes <= 12; mes++) {
      const realizacao = `${ano}-${String(mes).padStart(2, '0')}`;
      const prox = new Date(Date.UTC(ano, mes, 1));
      const esperado = `${prox.getUTCFullYear()}-${String(prox.getUTCMonth() + 1).padStart(2, '0')}`;
      exigir(api.mesDoPagamentoExtra({ competenciaRealizacao: realizacao }) === esperado,
        `folha incorreta para ${realizacao}`);
      exigir(api.mesDoPagamentoExtra({ competenciaRealizacao: realizacao, competenciaPagamento: '2099-12' }) === esperado,
        `competência explícita inválida alterou ${realizacao}`);
    }
  }
}

function testarDatasOperacionaisSandbox() {
  const fonte = trecho(escritorio, 'function dataLocal(d)', 'function hojeLocal()');
  const api = executarSandbox('datas-sandbox.js', `${fonte}\nglobalThis.api={dataLocal,diaOperacional,mesOperacional};`);
  exigir(api.diaOperacional('2026-08-05') === '2026-08-05', 'data civil recuou um dia');
  exigir(api.mesOperacional('2026-08-05') === '2026-08', 'mês civil incorreto');
  const instante = new Date(2026, 7, 5, 23, 30, 0);
  exigir(api.diaOperacional(instante.toISOString()) === '2026-08-05', 'timestamp noturno saiu do dia local');
  exigir(api.diaOperacional({ seconds: Math.floor(instante.getTime() / 1000) }) === '2026-08-05', 'Timestamp Firestore saiu do dia local');
}

function testarAcompanhamentoSandbox() {
  const fonte = trecho(escritorio, 'function dataLocal(d)', 'function hojeLocal()');
  const api = executarSandbox('acompanhamento-sandbox.js', `${fonte}\nglobalThis.api={diaOperacional,mesOperacional};`);
  const hoje = '2026-08-05';
  const videos = [
    { id:'entrega-local', enviadoEm:new Date(2026,7,5,23,30).toISOString(), status:'aguardando_aprovacao', editorAtribuido:'Helo' },
    { id:'correcao-hoje', correcaoSolicitadaEm:new Date(2026,7,5,10).toISOString(), status:'correcao', editorAtribuido:'Helo' },
    { id:'correcao-antiga', correcaoSolicitadaEm:new Date(2026,6,20,10).toISOString(), status:'correcao', editorAtribuido:'Helo' },
    { id:'com-cliente', enviadoEm:new Date(2026,7,4,10).toISOString(), status:'aguardando_cliente', editorAtribuido:'Helo' },
    { id:'apagado', enviadoEm:new Date(2026,7,5,10).toISOString(), status:'aguardando_aprovacao', editorAtribuido:'Helo', excluido:true }
  ].filter(v=>!v.excluido);
  const entreguesHoje = videos.filter(v=>api.diaOperacional(v.enviadoEm)===hoje);
  const ajustesHoje = videos.filter(v=>api.diaOperacional(v.correcaoSolicitadaEm)===hoje);
  const filaEditor = videos.filter(v=>['aguardando_edicao','correcao'].includes(v.status));
  exigir(entreguesHoje.length===1, 'entregas do dia ignoraram fuso ou soft-delete');
  exigir(ajustesHoje.length===1, 'ajustes históricos entraram no indicador de hoje');
  exigir(filaEditor.length===2, 'carga do editor incluiu vídeo que já saiu da mão dele');
  exigir(videos.filter(v=>api.mesOperacional(v.enviadoEm)==='2026-08').length===2, 'entregas mensais misturaram competência');
}

function testarDemandasSandbox() {
  const fonte = trecho(escritorio, 'const norm = t =>', 'window.criarDemandaSegura');
  const api = executarSandbox('demandas-sandbox.js',
    `function mesDaDemandaFixa(d){return d.mesRef||'';}\n${fonte}\nglobalThis.api={mesmaDemandaPendente};`);
  const jul = { titulo: 'Calendário Cliente X', tipoFuncaoFixa: true, funcaoFixaChave: 'calendario|2026-07', clienteSlug: 'x' };
  const ago = { ...jul, funcaoFixaChave: 'calendario|2026-08' };
  exigir(api.mesmaDemandaPendente(jul, { ...jul }) === true, 'mesma recorrência não deduplicou');
  exigir(api.mesmaDemandaPendente(jul, ago) === false, 'meses diferentes foram tratados como duplicata');

  const prazoFonte = trecho(escritorio, 'function camposAoAlterarPrazoDemanda', 'function demandaTemAtrasoResidual');
  const prazo = executarSandbox('prazo-sandbox.js', `${prazoFonte}\nglobalThis.api={camposAoAlterarPrazoDemanda};`)
    .camposAoAlterarPrazoDemanda('2026-08-20', '18:00', 'Amanda');
  exigir(prazo.prazoData === '2026-08-20' && prazo.prazoHora === '18:00', 'novo prazo não foi preservado');
  exigir(prazo.nivelEscalonamentoDemanda === 0 && prazo.urgenciaManual === '' && prazo.lembretePrazoHojeEm === '',
    'prazo alterado manteve cicatriz de atraso');
}

function testarCalendariosSandbox() {
  const fonte = trecho(calendario, "const MESES_PT=", '/* ===== VÁRIOS MESES');
  const api = executarSandbox('calendario-sandbox.js',
    `let data={month:'Agosto 2026'};let mesVisivel='';\n${fonte}\n` +
    `globalThis.api={mesRefDoTexto,offsetDoMes,diasDoMes,setMes:v=>{mesVisivel=v;}};`);
  exigir(api.mesRefDoTexto('Calendário de Agosto 2026').mes === 7, 'mês por extenso não reconhecido');
  exigir(api.mesRefDoTexto('AGO/2026').mes === 7, 'mês abreviado não reconhecido');
  exigir(api.mesRefDoTexto('2028-02').mes === 1, 'mês ISO não reconhecido');
  for (let ano = 2024; ano <= 2028; ano++) {
    for (let mes = 1; mes <= 12; mes++) {
      api.setMes(`${ano}-${String(mes).padStart(2, '0')}`);
      exigir(api.offsetDoMes() === new Date(ano, mes - 1, 1).getDay(), `coluna do dia 1 incorreta em ${ano}-${mes}`);
      exigir(api.diasDoMes() === new Date(ano, mes, 0).getDate(), `quantidade de dias incorreta em ${ano}-${mes}`);
    }
  }
}

try {
  testarFinanceiroSandbox();
  testarDatasOperacionaisSandbox();
  testarAcompanhamentoSandbox();
  testarDemandasSandbox();
  testarCalendariosSandbox();
  console.log(`REGRESSÃO CRÍTICA: APROVADA (${total} asserções)`);
} catch (erro) {
  console.error(`REGRESSÃO CRÍTICA: FALHOU — ${erro.stack || erro.message}`);
  process.exitCode = 1;
}
