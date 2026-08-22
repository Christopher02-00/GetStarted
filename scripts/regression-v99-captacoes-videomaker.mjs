#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = nome => fs.readFileSync(path.join(raiz, nome), 'utf8');
const escritorio = ler('escritorio.html');
const calendario = ler('calendario.html');
const calendarios = ler('calendarios.html');
const regras = ler('firestore.rules');
let total = 0;

function exigir(condicao, mensagem){
  total++;
  if(!condicao) throw new Error('V99 CAPTAÇÕES VIDEOMAKER: ' + mensagem);
  console.log('PASS ', mensagem);
}

function trecho(fonte, inicio, fim){
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) throw new Error('V99 CAPTAÇÕES VIDEOMAKER: trecho ausente ' + inicio);
  return fonte.slice(a, b);
}

function sha256(texto){
  return crypto.createHash('sha256').update(texto).digest('hex');
}

/* Executa as funções reais do HTML. Só as dependências determinísticas do
   mesmo arquivo entram no sandbox; nenhuma API Firebase é exposta. */
const fonteDominio = [
  "const BLOCOS_PADRAO=2; const BLOCOS_MAX=3;",
  "const PESSOAS_DE_CAMPO=['Luís','Nathan']; const CAMPO_MAIS_CHRIS=['Chris',...PESSOAS_DE_CAMPO];",
  trecho(escritorio, 'function equipeDoAgendamento', 'function nomeOperacionalCanonico'),
  trecho(escritorio, 'function nomeOperacionalCanonico', 'function pessoaNaEquipe'),
  trecho(escritorio, 'function filmmakersDaSessao', 'window.filmmakersDaSessao'),
  trecho(escritorio, 'function mesDoTextoConf', 'async function motorAutomacoes'),
  trecho(escritorio, 'function mesDoItemCalendario', 'function itensDoMesCalendario'),
  trecho(escritorio, 'function itensDoMesCalendario', "const PRIMEIRA_COMPETENCIA_CALENDARIO_SITE='2026-07';"),
  "const PRIMEIRA_COMPETENCIA_CALENDARIO_SITE='2026-07';",
  trecho(escritorio, 'function mesPertenceAoPeriodoDoSite', 'function mesUsaCampoLegadoCalendario'),
  trecho(escritorio, 'function mesesDeCalendario', "const PRIMEIRA_COMPETENCIA_ARQUIVO_AUTOMATICO='2026-10';"),
  "const PRIMEIRA_COMPETENCIA_ARQUIVO_AUTOMATICO='2026-10';",
  trecho(escritorio, 'function limiteArquivoAutomaticoCalendario', 'function estadoPublicadoEfetivoCalendario'),
  trecho(escritorio, 'function estadoPublicadoEfetivoCalendario', 'window.estadoPublicadoEfetivoCalendario'),
  trecho(escritorio, 'function estadoMesCal', '/* Publicar um mês'),
  trecho(escritorio, 'function itemNaoPrecisaGravar', 'function rotuloEstadoItem'),
  trecho(escritorio, 'function tamanhosDosBlocos', 'function blocoAutomatico'),
  trecho(escritorio, 'function blocoAutomatico', 'function blocoDoItem'),
  trecho(escritorio, 'function blocoDoItem', 'function quantosBlocos'),
  trecho(escritorio, 'function quantosBlocos', '/* A conta que todas as telas usa'),
  trecho(escritorio, 'function itensDoMesComIndiceGlobal', '/* Identidade compatível para itens antigos'),
  trecho(escritorio, 'function nomeItemSessaoCanonico', 'function chaveItemSessao'),
  trecho(escritorio, 'function chaveSessaoGravacao', '/* Agendamentos criados antes da V32'),
  trecho(escritorio, 'function sessaoModernaComPlano', 'window.sessaoModernaComPlano'),
  trecho(escritorio, 'function sessaoRegistroAutonomo', 'window.sessaoRegistroAutonomo'),
  trecho(escritorio, 'function sessaoLegadaSemVinculo', 'window.sessaoLegadaSemVinculo'),
  trecho(escritorio, 'function avaliarPlanejamentoSessaoParaPersistir', 'window.avaliarPlanejamentoSessaoParaPersistir'),
  trecho(escritorio, 'function snapshotItensPlanejadosSessao', 'window.snapshotItensPlanejadosSessao'),
  trecho(escritorio, 'function assinaturaReplanejamentoSessao', 'window.assinaturaReplanejamentoSessao'),
  trecho(escritorio, 'function planejarSessaoGravacao', 'window.planejarSessaoGravacao'),
  trecho(escritorio, 'function prepararMateriaisDeclaradosSessao', 'window.prepararMateriaisDeclaradosSessao'),
  `globalThis.api={
    equipeDoAgendamento,nomeOperacionalCanonico,filmmakersDaSessao,
    sessaoModernaComPlano,sessaoRegistroAutonomo,sessaoLegadaSemVinculo,
    avaliarPlanejamentoSessaoParaPersistir,snapshotItensPlanejadosSessao,
    assinaturaReplanejamentoSessao,planejarSessaoGravacao,
    prepararMateriaisDeclaradosSessao
  };`
].join('\n');

const contexto = vm.createContext({ console });
new vm.Script(fonteDominio, { filename:'v99-captacoes-dominio-sandbox.js' }).runInContext(contexto);
const api = contexto.api;

/* Fronteira moderna × legada: versão e array são um contrato conjunto. */
const tabelaSessao = [
  [{}, false, true, 'sem marcadores'],
  [{sessaoPlanejamentoVersao:1}, false, true, 'versão sem array'],
  [{sessaoItensPlanejados:[]}, false, true, 'array sem versão'],
  [{sessaoPlanejamentoVersao:1,sessaoItensPlanejados:{}}, false, true, 'versão com tipo inválido'],
  [{sessaoPlanejamentoVersao:1,sessaoItensPlanejados:[]}, true, false, 'versão 1 com array vazio'],
  [{sessaoPlanejamentoVersao:1,sessaoItensPlanejados:[{idx:0}]}, true, false, 'versão 1 com item congelado'],
  [{sessaoPlanejamentoVersao:2,sessaoRegistroModo:'calendario_opcional',sessaoItensPlanejados:[]}, false, false, 'versão 2 de registro autônomo']
];
tabelaSessao.forEach(([ag, moderna, legada, rotulo]) => {
  exigir(api.sessaoModernaComPlano(ag) === moderna && api.sessaoLegadaSemVinculo(ag) === legada,
    'truth table moderna/legada — ' + rotulo);
});

/* V100 substitui o portão V99: a lista exata vira checklist opcional e a
   quantidade permanece expectativa, sem bloquear a declaração factual. */
let resultado = api.avaliarPlanejamentoSessaoParaPersistir(
  {permitidos:[{idx:0},{idx:1}],inconsistencias:[]},
  {calendarioDisponivel:true,permitirExtras:false,quantidadeEsperada:99}
);
exigir(resultado.ok && resultado.codigo === 'checklist_calendario_disponivel' && resultado.quantidade === 99 && resultado.usarChecklist,
  'checklist exato preserva a estimativa e continua disponível');

resultado = api.avaliarPlanejamentoSessaoParaPersistir(
  {permitidos:[],inconsistencias:[]},
  {calendarioDisponivel:true,permitirExtras:false,quantidadeEsperada:5}
);
exigir(resultado.ok && resultado.codigo === 'declaracao_ordem_vazia' && resultado.quantidade === 5 && !resultado.usarChecklist,
  'plano vazio abre declaração factual sem inventar título de calendário');
exigir(resultado.mensagem.includes('ordem está vazia'), 'plano vazio permanece identificado honestamente');

resultado = api.avaliarPlanejamentoSessaoParaPersistir(
  {permitidos:[],inconsistencias:[]},
  {calendarioDisponivel:false,permitirExtras:false,quantidadeEsperada:5}
);
exigir(resultado.ok && resultado.codigo === 'declaracao_sem_calendario' && resultado.mensagem.includes('ainda não tem calendário'),
  'calendário ausente é distinto de pauta vazia e não bloqueia');

resultado = api.avaliarPlanejamentoSessaoParaPersistir(
  {permitidos:[],inconsistencias:[{motivo:'O título congelado mudou.'}]},
  {calendarioDisponivel:true,permitirExtras:false,quantidadeEsperada:5}
);
exigir(resultado.ok && resultado.codigo === 'declaracao_pauta_inconsistente' && resultado.mensagem === 'O título congelado mudou.' && !resultado.usarChecklist,
  'inconsistência preserva a causa e cai em declaração isolada');

resultado = api.avaliarPlanejamentoSessaoParaPersistir(
  {permitidos:[{idx:0}],inconsistencias:[{motivo:'O snapshot não corresponde mais à pauta.'}]},
  {calendarioDisponivel:true,permitirExtras:true,quantidadeEsperada:5}
);
exigir(resultado.ok && resultado.codigo === 'declaracao_pauta_inconsistente' && resultado.quantidade === 5 && !resultado.usarChecklist,
  'inconsistência nunca usa item duvidoso no checklist');

resultado = api.avaliarPlanejamentoSessaoParaPersistir(
  {permitidos:[],inconsistencias:[]},
  {calendarioDisponivel:true,permitirExtras:true,quantidadeEsperada:5}
);
exigir(resultado.ok && resultado.codigo === 'declaracao_ordem_vazia' && resultado.quantidade === 5,
  'flag histórica de extras não é mais uma aprovação necessária');

resultado = api.avaliarPlanejamentoSessaoParaPersistir(
  {permitidos:[],inconsistencias:[]},
  {calendarioDisponivel:true,permitirExtras:'false',quantidadeEsperada:5}
);
exigir(resultado.ok && resultado.codigo === 'declaracao_ordem_vazia' && resultado.quantidade === 5,
  'string histórica de extras não muda o modo autônomo');

[-7, 0, Number.NaN, 'não é número'].forEach(valor => {
  const normalizado = api.avaliarPlanejamentoSessaoParaPersistir(
    {permitidos:[],inconsistencias:[]},
    {calendarioDisponivel:true,permitirExtras:true,quantidadeEsperada:valor}
  );
  exigir(normalizado.ok && normalizado.codigo === 'declaracao_ordem_vazia' && normalizado.quantidade === 1,
    'declaração normaliza quantidade inválida para 1 — ' + String(valor));
});

const snapshot = api.snapshotItensPlanejadosSessao({
  fazerHoje:[{idx:7}],
  permitidos:[
    {idx:7,itemId:'itm-7',name:'Depoimento',vinculo:'manual',campoIgnorado:'x'},
    {idx:9,itemId:'',name:'Bastidores',vinculo:'derivado'}
  ]
});
exigir(JSON.stringify(snapshot) === JSON.stringify([
  {idx:7,itemId:'itm-7',nome:'Depoimento',ordem:1,grupo:'fazerHoje',vinculo:'manual'},
  {idx:9,itemId:'',nome:'Bastidores',ordem:2,grupo:'pendencia',vinculo:'derivado'}
]), 'snapshot congela somente identidade, ordem, grupo e vínculo exatos');

const cal = {
  blocosPorMes:{'2026-08':2},
  aprovacaoMeses:{'2026-08':{status:'liberado'}},
  updatedAt:'fixture-v99',
  items:[
    {mes:'2026-08',day:1,itemId:'itm-a',name:'Roteiro A',bloco:1,apr:true},
    {mes:'2026-08',day:2,itemId:'itm-b',name:'Roteiro B',bloco:1,apr:true},
    {mes:'2026-08',day:8,itemId:'itm-c',name:'Roteiro C',bloco:2,apr:true},
    {mes:'2026-08',day:9,itemId:'itm-d',name:'Roteiro D',bloco:2,apr:true}
  ]
};
const agBase = {
  cliente:'cliente-fixture', data:'2026-08-20', mesCalendario:'2026-08',
  sessaoOrdem:1, sessaoChave:'cliente-fixture|2026-08|S01',
  status:'agendado', qtdVideosPlanejados:2, filmmaker:'Luís'
};
const agModerno = {
  ...agBase, sessaoPlanejamentoVersao:1,
  sessaoItensPlanejados:[
    {idx:1,itemId:'itm-b',nome:'Roteiro B',ordem:1,grupo:'fazerHoje',vinculo:'manual'},
    {idx:0,itemId:'itm-a',nome:'Roteiro A',ordem:2,grupo:'pendencia',vinculo:'manual'}
  ]
};
const planoCongelado = api.planejarSessaoGravacao(cal, agModerno);
exigir(planoCongelado.planejamentoCongelado === true && planoCongelado.permitidos.map(x=>x.itemId).join(',') === 'itm-b,itm-a',
  'sessão moderna executa exatamente o snapshot congelado');
exigir(planoCongelado.naoGravarHoje.map(x=>x.itemId).join(',') === 'itm-c,itm-d',
  'itens de outra sessão permanecem fora da execução');

const agModernoVazio = {...agBase,sessaoPlanejamentoVersao:1,sessaoItensPlanejados:[]};
const planoModernoVazio = api.planejarSessaoGravacao(cal, agModernoVazio);
resultado = api.avaliarPlanejamentoSessaoParaPersistir(planoModernoVazio, {
  calendarioDisponivel:true, permitirExtras:false, quantidadeEsperada:5
});
exigir(planoModernoVazio.planejamentoCongelado === true && planoModernoVazio.permitidos.length === 0,
  'v1 + array vazio continua moderno e não deriva itens por conveniência');
exigir(resultado.ok && resultado.codigo === 'declaracao_ordem_vazia' && !resultado.usarChecklist,
  'v1 + array vazio permanece sem checklist, mas aceita declaração factual isolada');

/* Corrupção parcial do array moderno não pode derrubar a tela nem reabrir a
   compatibilidade legada. Cada variante permanece moderna, vira
   inconsistência explícita e é bloqueada antes de qualquer declaração. */
const snapshotsModernosMalformados = [
  {
    rotulo:'entrada nula',
    itens:[null]
  },
  {
    rotulo:'objeto sem identidade válida',
    itens:[{ordem:1,grupo:'fazerHoje'}]
  },
  {
    rotulo:'entrada duplicada',
    itens:[
      {idx:0,itemId:'itm-a',nome:'Roteiro A',ordem:1,grupo:'fazerHoje'},
      {idx:0,itemId:'itm-a',nome:'Roteiro A',ordem:2,grupo:'pendencia'}
    ]
  },
  {
    rotulo:'duplicidade cruzada itemId versus índice e nome',
    itens:[
      {idx:0,itemId:'itm-a',nome:'Roteiro A',ordem:1,grupo:'fazerHoje'},
      {idx:0,itemId:'',nome:'Roteiro A',ordem:2,grupo:'pendencia'}
    ]
  }
];
snapshotsModernosMalformados.forEach(caso => {
  const agMalformado = {
    ...agBase,
    sessaoPlanejamentoVersao:1,
    sessaoItensPlanejados:caso.itens
  };
  let planoMalformado = null, erroMalformado = null;
  try{
    planoMalformado = api.planejarSessaoGravacao(cal, agMalformado);
  }catch(erro){
    erroMalformado = erro;
  }
  exigir(!erroMalformado && planoMalformado && planoMalformado.planejamentoCongelado === true,
    'snapshot moderno malformado não lança TypeError — ' + caso.rotulo);
  exigir(api.sessaoModernaComPlano(agMalformado) === true && api.sessaoLegadaSemVinculo(agMalformado) === false,
    'snapshot malformado permanece moderno — ' + caso.rotulo);
  const gateMalformado = api.avaliarPlanejamentoSessaoParaPersistir(planoMalformado, {
    calendarioDisponivel:true,
    permitirExtras:true,
    quantidadeEsperada:5
  });
  exigir((planoMalformado.inconsistencias||[]).length >= 1 && gateMalformado.ok && gateMalformado.codigo === 'declaracao_pauta_inconsistente' && !gateMalformado.usarChecklist,
    'snapshot malformado produz inconsistência e nunca libera checklist duvidoso — ' + caso.rotulo);
  const textoMalformado = api.prepararMateriaisDeclaradosSessao([], 'Texto livre não autorizado', agMalformado, 'Luís');
  exigir(!textoMalformado.ok && textoMalformado.videos.length === 0,
    'snapshot malformado jamais cai em legado ou texto livre — ' + caso.rotulo);
});

/* Identidade operacional e compatibilidade legada continuam isoladas. */
exigir(api.nomeOperacionalCanonico('Luís') === api.nomeOperacionalCanonico('Luiz'), 'Luís/Luiz são a mesma identidade operacional');
exigir(api.nomeOperacionalCanonico('Nathan') === api.nomeOperacionalCanonico('Natan'), 'Nathan/Natan são a mesma identidade operacional');
exigir(api.filmmakersDaSessao({equipe:[
  {nome:'Luiz',papel:'Filmmaker'}, {nome:'Natan',papel:'2º Filmmaker'}, {nome:'Luís',papel:'Assistente'}
]}).join(',') === 'Luís,Nathan', 'aliases são normalizados e deduplicados na equipe da sessão');

const legadoPuro = {cliente:'legado-fixture',status:'agendado',filmmaker:'Luiz'};
const preparadoLegado = api.prepararMateriaisDeclaradosSessao([], 'Vídeo institucional\nBastidores', legadoPuro, 'Luís');
exigir(preparadoLegado.ok && preparadoLegado.videos.length === 2 && preparadoLegado.videos.every(v =>
  v.vinculoSessao === 'declarado_legado' && v.calendarItemIdx === null && v.calendarItemId === null
), 'legado puro prepara declaração isolada do calendário');

const legadoEnriquecido = {...legadoPuro,filmmaker:'Natan',mesCalendario:'2026-08',sessaoOrdem:2,sessaoChave:'legado-fixture|2026-08|S02'};
const preparadoEnriquecido = api.prepararMateriaisDeclaradosSessao([], 'Material legítimo', legadoEnriquecido, 'Nathan');
exigir(preparadoEnriquecido.ok && preparadoEnriquecido.registroLegado === true && preparadoEnriquecido.videos[0].vinculoSessao === 'declarado_legado',
  'legado parcialmente enriquecido mantém a porta compatível isolada');

const textoEmModernoVazio = api.prepararMateriaisDeclaradosSessao([], 'Texto livre indevido', agModernoVazio, 'Luís');
exigir(!textoEmModernoVazio.ok && textoEmModernoVazio.videos.length === 0,
  'helper não abre declaração moderna sem a autorização explícita do executor');

const extraAutorizado = api.prepararMateriaisDeclaradosSessao([], 'Captação declarada', agModernoVazio, 'Luiz', {declaracaoAutorizada:true});
exigir(extraAutorizado.ok && extraAutorizado.videos[0].vinculoSessao === 'declarado_em_campo' &&
  extraAutorizado.videos[0].calendarItemId === null && extraAutorizado.videos[0].calendarClienteSlug === null,
  'declaração do executor recebe vínculo próprio sem tocar calendário');

const extraStringFalse = api.prepararMateriaisDeclaradosSessao(
  [], 'Texto não autorizado', {...agModernoVazio,permitirCaptacoesExtras:'false'}, 'Luís'
);
exigir(!extraStringFalse.ok && extraStringFalse.videos.length === 0,
  'campo histórico de extras não substitui a autorização do executor');

/* V100 preserva a disciplina V99 de quantidade e sessão, mas calendário
   agora é checklist opcional. Quantidade explícita continua obrigatória. */
const fonteAgendar = trecho(escritorio, 'window.agendarGravacao = async function(){', '  async function renderListaAgendamentos');
const blocoQuantidadeObrigatoria = trecho(
  fonteAgendar,
  "const qtdPlanejadaLida = parseInt(document.getElementById('agQtdPlanejada').value);",
  '    const qtdPlanejada = qtdPlanejadaLida;'
);
const executarQuantidadeObrigatoria = new vm.Script(
  `(function(valor){
    let focos=0; const avisos=[];
    const document={getElementById:()=>({value:valor,focus:()=>{focos++;}})};
    const mostrarToast=(mensagem,tipo)=>avisos.push({mensagem,tipo});
    ${blocoQuantidadeObrigatoria}
    return {ok:true,qtdPlanejadaLida,focos,avisos};
  })`,
  {filename:'v100-quantidade-obrigatoria-sandbox.js'}
).runInNewContext();
exigir(executarQuantidadeObrigatoria('') === false && executarQuantidadeObrigatoria('0') === false,
  'escritor recusa quantidade vazia ou menor que 1');
const quantidadeValida = executarQuantidadeObrigatoria('5');
exigir(quantidadeValida.ok === true && quantidadeValida.qtdPlanejadaLida === 5,
  'escritor aceita quantidade esperada explícita');

const posAvaliacao = fonteAgendar.indexOf('avaliarPlanejamentoSessaoParaPersistir(planoInicial');
const posPortaFilmmaker = fonteAgendar.indexOf('if(PESSOAS_DE_CAMPO.includes(usuarioAtual) && !avaliacaoPlanejamento.usarChecklist)');
const posPrimeiroAdd = fonteAgendar.indexOf("addDoc(collection(db,'agendamentos')");
exigir(fonteAgendar.includes("if(!['Chris','Amanda','Cecília'].includes(usuarioAtual))") &&
  !fonteAgendar.includes("if(!['Chris','Amanda','Cecília', ...PESSOAS_DE_CAMPO].includes(usuarioAtual))"),
  'escritor de nova sessão pertence só à coordenação; filmmaker opera apenas sessão atribuída');
exigir(posAvaliacao >= 0 && posPortaFilmmaker > posAvaliacao && posPrimeiroAdd > posPortaFilmmaker &&
  !fonteAgendar.slice(0,posPortaFilmmaker).includes('addDoc('),
  'criação avalia checklist e aplica a porta do filmmaker antes da primeira escrita');

const blocoPortaFilmmaker = trecho(
  fonteAgendar,
  'if(PESSOAS_DE_CAMPO.includes(usuarioAtual) && !avaliacaoPlanejamento.usarChecklist){',
  '      const sessaoItensPlanejados = '
);
const executarPortaFilmmaker = new vm.Script(
  `(function(usuarioAtual,PESSOAS_DE_CAMPO,usarChecklist){
    const avaliacaoPlanejamento={usarChecklist}; const avisos=[];
    const mostrarToast=(mensagem,tipo)=>avisos.push({mensagem,tipo});
    ${blocoPortaFilmmaker}
    return true;
  })`,
  {filename:'v100-porta-filmmaker-sandbox.js'}
).runInNewContext();
exigir(executarPortaFilmmaker('Luís',['Luís','Nathan'],false) === false &&
  executarPortaFilmmaker('Nathan',['Luís','Nathan'],false) === false &&
  executarPortaFilmmaker('Luís',['Luís','Nathan'],true) === true,
  'defesa interna também impede autoabertura sem checklist antes da primeira escrita');

const expressaoItensCriacao = trecho(
  fonteAgendar,
  'const sessaoItensPlanejados = ',
  ';\n      const qtdPlanejadaFinal = '
).slice('const sessaoItensPlanejados = '.length).trim();
const itensSemChecklist = new vm.Script(`(${expressaoItensCriacao})`, {filename:'v100-itens-criacao-sandbox.js'}).runInNewContext({
  avaliacaoPlanejamento:{usarChecklist:false},
  planoInicial:{permitidos:[{idx:99}]},
  snapshotItensPlanejadosSessao:()=>{ throw new Error('snapshot não deveria ser chamado'); }
});
const expressaoVersaoCriacao = trecho(
  fonteAgendar,
  'sessaoPlanejamentoVersao:',
  ', sessaoItensPlanejados'
).slice('sessaoPlanejamentoVersao:'.length).trim();
const versaoSemChecklist = new vm.Script(`(${expressaoVersaoCriacao})`, {filename:'v100-versao-criacao-sandbox.js'}).runInNewContext({
  avaliacaoPlanejamento:{usarChecklist:false}
});
exigir(executarPortaFilmmaker('Cecília',['Luís','Nathan'],false) === true &&
  versaoSemChecklist === 2 && Array.isArray(itensSemChecklist) && itensSemChecklist.length === 0 &&
  fonteAgendar.includes("sessaoRegistroModo:'calendario_opcional'") &&
  fonteAgendar.includes('calendarioObrigatorioParaRegistro:false'),
  'coordenação pode criar V2 calendário-opcional sem inventar snapshot vazio');

const expressaoQtdCriacao = trecho(
  fonteAgendar,
  'const qtdPlanejadaFinal = ',
  '\n\n      const agRef = await addDoc'
).slice('const qtdPlanejadaFinal = '.length).trim().replace(/;$/, '');
const planoCincoItens = api.avaliarPlanejamentoSessaoParaPersistir(
  {permitidos:Array.from({length:5}, (_,idx)=>({idx})),inconsistencias:[]},
  {calendarioDisponivel:true,permitirExtras:true,quantidadeEsperada:2}
);
const executarQtdCriacao = contextoQtd => new vm.Script(`(${expressaoQtdCriacao})`, {
  filename:'v100-qtd-criacao-sandbox.js'
}).runInNewContext(contextoQtd);
exigir(planoCincoItens.quantidade === 5 && executarQtdCriacao({
  qtdPlanejada:2, sessaoItensPlanejados:Array.from({length:5},(_,idx)=>({idx}))
}) === 5, 'checklist nunca reduz a quantidade abaixo dos itens exatos');
exigir(executarQtdCriacao({qtdPlanejada:4,sessaoItensPlanejados:[]}) === 4 &&
  fonteAgendar.includes('qtdVideosPlanejados: qtdPlanejadaFinal'),
  'V2 sem checklist persiste a quantidade explícita como estimativa');

/* Replanejamento: uma transação, revalidação e nenhuma escrita solta. */
const fonteReplanejar = trecho(escritorio, 'async function replanejarSessaoGravacaoNucleo', '  const __replanejamentosSessaoEmCurso');
const posTransacao = fonteReplanejar.indexOf('await runTransaction(db');
const posAtualizacao = fonteReplanejar.indexOf('transacao.update(agRef');
exigir(posTransacao >= 0 && posAtualizacao > posTransacao, 'replanejamento persiste somente dentro de transação');
exigir((fonteReplanejar.match(/transacao\.get\(/g) || []).length >= 2 &&
  fonteReplanejar.includes('assinaturaReplanejamentoSessao(agAtual) !== assinaturaBase'),
  'transação relê sessão e calendário e rejeita mudança de outra aba');
exigir(fonteReplanejar.includes('JSON.stringify(listaAtual) !== JSON.stringify(lista)') &&
  fonteReplanejar.indexOf('avaliarPlanejamentoSessaoParaPersistir(planoAtual') < posAtualizacao,
  'transação repete gate e compara o snapshot antes de escrever');
exigir(!/(^|[^.])\bupdateDoc\s*\(/m.test(fonteReplanejar) && !fonteReplanejar.includes('addDoc(') && !fonteReplanejar.includes('setDoc('),
  'replanejamento não possui updateDoc/addDoc/setDoc fora da transação');

/* Replanejamento continua opcional e só congela listas exatas não vazias. */
const posGuardaLista = fonteReplanejar.indexOf('if(!avaliacao.ok || !avaliacao.usarChecklist || !lista.length)');
const posListaAtual = fonteReplanejar.indexOf('const listaAtual = snapshotItensPlanejadosSessao(planoAtual)');
const posGuardaListaAtual = fonteReplanejar.indexOf('if(!avaliacaoAtual.ok || !avaliacaoAtual.usarChecklist || !listaAtual.length)');
exigir(posGuardaLista >= 0 && posGuardaLista < posTransacao &&
  posListaAtual > posTransacao && posGuardaListaAtual > posListaAtual && posGuardaListaAtual < posAtualizacao,
  'replanejamento recusa lista vazia antes e dentro da transação');
exigir(fonteReplanejar.includes('Não salvei uma ordem vazia.') &&
  fonteReplanejar.includes('sessaoItensPlanejados:listaAtual') &&
  !fonteReplanejar.includes('sessaoItensPlanejados:[]'),
  'replanejamento opcional jamais persiste snapshot vazio');

/* Declaração manual é uma ação explícita do executor e não toca a pauta. */
const fonteConfirmacao = trecho(
  escritorio,
  'async function registrarGravacaoRealizadaNucleo',
  '  const __confirmacoesGravacaoEmCurso'
);
const posLeituraCalendarioCondicional = fonteConfirmacao.indexOf('if(videosDoCalendario.length){');
const posLeituraCalendario = fonteConfirmacao.indexOf("getDoc(doc(db,'calendarios',clienteSlug))", posLeituraCalendarioCondicional);
const posTextoManual = fonteConfirmacao.indexOf('const textoExtras =', posLeituraCalendarioCondicional);
exigir(posLeituraCalendarioCondicional >= 0 && posLeituraCalendario > posLeituraCalendarioCondicional &&
  posTextoManual > posLeituraCalendario &&
  fonteConfirmacao.includes('{ declaracaoAutorizada:true, motivoDeclaracao:'),
  'baixa abre declaração manual explicitamente; calendário só é pré-lido quando há checkbox');
exigir(fonteConfirmacao.includes("const calRef = videosDoCalendario.length ? doc(db,'calendarios', clienteSlug) : null") &&
  fonteConfirmacao.includes('const calAtual = calRef ? await transacao.get(calRef) : null') &&
  fonteConfirmacao.includes('if(calRef && calAtual && calAtual.exists())'),
  'baixa exclusivamente manual não lê nem escreve calendário dentro da transação');

const blocoPapelConfirmacao = trecho(
  fonteConfirmacao,
  'if(!PESSOAS_DE_CAMPO.includes(usuarioAtual)){',
  '    const agRef = '
);
const executarPapelConfirmacao = new vm.Script(
  `(function(usuarioAtual,PESSOAS_DE_CAMPO){
    const avisos=[]; const mostrarToast=(mensagem,tipo)=>avisos.push({mensagem,tipo});
    ${blocoPapelConfirmacao}
    return true;
  })`,
  {filename:'v100-papel-confirmacao-sandbox.js'}
).runInNewContext();
exigir(executarPapelConfirmacao('Cecília',['Luís','Nathan']) === false &&
  executarPapelConfirmacao('Luís',['Luís','Nathan']) === true &&
  executarPapelConfirmacao('Nathan',['Luís','Nathan']) === true &&
  fonteConfirmacao.includes('Cecília acompanha pelo controle, sem executar a baixa.'),
  'Cecília permanece read-only; Luís e Nathan chegam à validação da sessão');

/* Executa a trava real: dois cliques/duas chamadas concorrentes do mesmo ID
   não entram no núcleo, e o finally libera uma tentativa posterior. */
const fonteTrava = trecho(escritorio, 'const __replanejamentosSessaoEmCurso', '  function prepararMateriaisDeclaradosSessao');
let chamadasNucleo = 0;
const liberacoes = [];
const contextoTrava = vm.createContext({
  window:{},
  replanejarSessaoGravacaoNucleo: async () => {
    chamadasNucleo++;
    return await new Promise(resolve => liberacoes.push(resolve));
  }
});
new vm.Script(fonteTrava, {filename:'v99-replanejamento-trava-sandbox.js'}).runInContext(contextoTrava);
const primeira = contextoTrava.window.replanejarSessaoGravacao('ag-fixture');
const segunda = await contextoTrava.window.replanejarSessaoGravacao('ag-fixture');
exigir(segunda === false && chamadasNucleo === 1, 'clique duplo no mesmo agendamento entra no núcleo uma única vez');
liberacoes.shift()(true);
exigir(await primeira === true, 'primeiro replanejamento conclui normalmente');
const terceira = contextoTrava.window.replanejarSessaoGravacao('ag-fixture');
exigir(chamadasNucleo === 2, 'finally libera nova tentativa após a conclusão');
liberacoes.shift()(true);
await terceira;

const assinaturaBase = api.assinaturaReplanejamentoSessao(agModerno);
const assinaturaClone = api.assinaturaReplanejamentoSessao(JSON.parse(JSON.stringify(agModerno)));
const assinaturaOutraAba = api.assinaturaReplanejamentoSessao({
  ...agModerno,
  sessaoItensPlanejados:[...agModerno.sessaoItensPlanejados,{idx:2,itemId:'itm-c',nome:'Roteiro C',ordem:3,grupo:'fazerHoje'}]
});
exigir(assinaturaBase === assinaturaClone, 'assinatura é estável para o mesmo estado aberto em duas abas');
exigir(assinaturaBase !== assinaturaOutraAba, 'assinatura detecta alteração concorrente dos itens congelados');
exigir(assinaturaBase !== api.assinaturaReplanejamentoSessao({...agModerno,status:'realizado'}),
  'assinatura detecta encerramento concorrente da sessão');
exigir(assinaturaBase === api.assinaturaReplanejamentoSessao({...agModerno,clienteNome:'Rótulo visual novo'}),
  'rótulo visual irrelevante não cria falso conflito operacional');

/* O sugeridor é assíncrono e o formulário pode mudar enquanto o Firestore
   responde. Executamos a implementação real com respostas controladas para
   provar as duas barreiras: sequência da consulta e assinatura do contexto. */
const fonteSugeridor = trecho(
  escritorio,
  'let __sugestaoQtdBlocoSequencia = 0;',
  '  window.alternarCaptacoesExtrasAgendamento = function()'
);
exigir((fonteSugeridor.match(/tokenConsulta !== __sugestaoQtdBlocoSequencia \|\| assinaturaInicial !== assinaturaContextoSugestaoQtdBloco\(\)/g) || []).length === 2,
  'sugeridor valida sequência e assinatura tanto na resposta quanto no erro');

function adiar(){
  let resolver, rejeitar;
  const promise = new Promise((resolve,reject) => { resolver=resolve; rejeitar=reject; });
  return {promise,resolver,rejeitar};
}
const elementosSugestao = {
  agCliente:{value:'cliente-a'},
  agCompetenciaCalendario:{value:'2026-08'},
  agData:{value:'2026-08-20'},
  agBloco:{value:'1'},
  agPermitirExtras:{checked:false},
  agQtdPlanejada:{value:'',dataset:{}},
  dicaQtdBloco:{innerHTML:'',textContent:''}
};
const consultasSugestao = [];
const contextoSugestao = vm.createContext({
  console,
  window:{}, db:{},
  document:{getElementById:id=>elementosSugestao[id] || null},
  hojeLocal:()=> '2026-08-21',
  doc:(...partes)=>partes.join('/'),
  getDoc:()=>{
    const consulta=adiar();
    consultasSugestao.push(consulta);
    return consulta.promise;
  },
  quantosBlocos:()=>3,
  planejarSessaoGravacao:calFixture=>({
    permitidos:Array.from({length:Number(calFixture.quantidade)||0}, (_,idx)=>({idx})),
    inconsistencias:[]
  })
});
new vm.Script(fonteSugeridor, {filename:'v99-sugeridor-assinatura-sandbox.js'}).runInContext(contextoSugestao);
const snapSugestao = quantidade => ({exists:()=>true,data:()=>({quantidade})});

/* Duas consultas com contextos diferentes: a mais nova vence mesmo que a
   resposta antiga chegue depois. */
const consultaAntiga = contextoSugestao.window.sugerirQtdPeloBloco();
elementosSugestao.agCliente.value = 'cliente-b';
const consultaNova = contextoSugestao.window.sugerirQtdPeloBloco();
consultasSugestao[1].resolver(snapSugestao(3));
await consultaNova;
consultasSugestao[0].resolver(snapSugestao(9));
const retornoAntigo = await consultaAntiga;
exigir(elementosSugestao.agQtdPlanejada.value === 3 && elementosSugestao.agQtdPlanejada.dataset.planejamento === 'definido' && retornoAntigo === false,
  'resposta obsoleta não sobrescreve a sugestão da consulta mais nova');

/* Alteração do formulário sem iniciar outra consulta: o token ainda é o
   mesmo, portanto somente a assinatura pode impedir a resposta velha. */
elementosSugestao.agCliente.value = 'cliente-c';
elementosSugestao.agBloco.value = '1';
elementosSugestao.agQtdPlanejada.value = 7;
elementosSugestao.agQtdPlanejada.dataset.planejamento = 'preservado';
elementosSugestao.dicaQtdBloco.innerHTML = 'dica preservada';
const consultaContextoAntigo = contextoSugestao.window.sugerirQtdPeloBloco();
elementosSugestao.agBloco.value = '2';
consultasSugestao[2].resolver(snapSugestao(8));
const retornoContextoAntigo = await consultaContextoAntigo;
exigir(retornoContextoAntigo === false && elementosSugestao.agQtdPlanejada.value === 7 &&
  elementosSugestao.agQtdPlanejada.dataset.planejamento === 'preservado' && elementosSugestao.dicaQtdBloco.innerHTML === 'dica preservada',
  'assinatura ignora resposta do contexto anterior sem apagar o estado atual');

/* Mesmo contexto, duas consultas: a falha antiga chega por último e não
   pode trocar um resultado novo por “indisponível”. */
elementosSugestao.agCliente.value = 'cliente-d';
elementosSugestao.agBloco.value = '1';
const erroAntigo = contextoSugestao.window.sugerirQtdPeloBloco();
const sucessoNovo = contextoSugestao.window.sugerirQtdPeloBloco();
consultasSugestao[4].resolver(snapSugestao(4));
await sucessoNovo;
const dicaNova = elementosSugestao.dicaQtdBloco.innerHTML;
consultasSugestao[3].rejeitar(new Error('timeout obsoleto'));
const retornoErroAntigo = await erroAntigo;
exigir(retornoErroAntigo === false && elementosSugestao.agQtdPlanejada.value === 4 &&
  elementosSugestao.agQtdPlanejada.dataset.planejamento === 'definido' &&
  elementosSugestao.dicaQtdBloco.innerHTML === dicaNova && !dicaNova.includes('Não foi possível'),
  'erro obsoleto não substitui a resposta nova por indisponibilidade');

/* Invariantes de entrega e segurança. */
exigir(escritorio.includes('gs-build" content="2026-08-21-financeiro-por-competencia-v103"') &&
  escritorio.includes('gs-parent-patch" content="2026-08-21-itemids-calendarios-legados-v102"') &&
  escritorio.includes('gs-grandparent-patch" content="2026-08-21-controle-conclusao-calendarios-v101"') &&
  escritorio.includes('gs-great-grandparent-patch" content="2026-08-21-registro-autonomo-filmmaker-v100"'),
  'build V103 preserva V102, V101 e V100 na cadeia direta');
exigir(regras.includes('match /calendarios_conferencias/{calendarId}') &&
  regras.includes('match /calendarios_encerramentos/{calendarId}') &&
  regras.includes('allow delete: if false;'),
  'V101 amplia somente a projeção de conclusão e preserva delete físico bloqueado');
exigir(calendario === calendarios, 'calendario.html e calendarios.html permanecem byte a byte idênticos');
exigir(sha256(calendario) === '451d6cb3ee6d2b01ca40c62b648dbe2856c3321d303ef8b5f6c06a1b66c5ee45',
  'par de calendários contém a trava V102 sem divergência entre aliases');

console.log(`REGRESSÃO V99 CAPTAÇÕES VIDEOMAKER: APROVADA (${total} verificações)`);
