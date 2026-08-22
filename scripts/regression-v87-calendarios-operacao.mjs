import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const escritorio = fs.readFileSync(new URL('../escritorio.html', import.meta.url), 'utf8');
const calendario = fs.readFileSync(new URL('../calendario.html', import.meta.url), 'utf8');
const calendarios = fs.readFileSync(new URL('../calendarios.html', import.meta.url), 'utf8');
const portal = fs.readFileSync(new URL('../portal-cliente.html', import.meta.url), 'utf8');

let verificacoes = 0;
function ok(condicao, mensagem){ assert.ok(condicao, mensagem); verificacoes++; }
function contem(fonte, trecho, mensagem){ ok(fonte.includes(trecho), mensagem); }
function naoContem(fonte, trecho, mensagem){ ok(!fonte.includes(trecho), mensagem); }

function extrairAtribuicaoAsync(nome){
  const inicio = `window.${nome} = async function(){`;
  const i = escritorio.indexOf(inicio);
  assert.notEqual(i, -1, `função ${nome} não encontrada`);
  const fim = escritorio.indexOf('\n  };', i);
  assert.notEqual(fim, -1, `fim de ${nome} não encontrado`);
  return escritorio.slice(i, fim + 5);
}

async function testarCarteiraEditorialReal(){
  const codigo = extrairAtribuicaoAsync('clientesCalendarioRecorrentesConfirmados');
  const contexto = {
    window: {},
    __carteiraCalendarioOperacionalConfirmada: [
      {slug:'iphone-campo-largo',nome:'iPhone Campo Largo'}
    ],
    carregarClientesExtras: async()=>true,
    slugClienteCanonico: slug=>slug
  };
  vm.runInNewContext(codigo, contexto);
  const lista = await contexto.window.clientesCalendarioRecorrentesConfirmados();
  assert.deepEqual(Array.from(lista, c=>c.slug), ['iphone-campo-largo']);
  verificacoes++;
  ok(!lista.some(c=>c.slug==='ikn'), 'IKN avulso não pode entrar na carteira de calendário');
  ok(!lista.some(c=>c.slug==='get-started'), 'cliente interno não pode entrar na carteira de calendário');
  ok(!lista.some(c=>c.slug==='rodrigo'), 'plano só edição não pode entrar na carteira de calendário');

  contexto.__carteiraCalendarioOperacionalConfirmada = null;
  await assert.rejects(
    contexto.window.clientesCalendarioRecorrentesConfirmados(),
    /carteira operacional/
  );
  verificacoes++;
}

await testarCarteiraEditorialReal();

ok(
  escritorio.includes('gs-build" content="2026-08-22-correcao-financeiro-real-v104"') &&
  escritorio.includes('gs-parent-patch" content="2026-08-21-financeiro-por-competencia-v103"') &&
  escritorio.includes('gs-grandparent-patch" content="2026-08-21-itemids-calendarios-legados-v102"'),
  'build vigente V104, pai V103 e avô V102 identificados para reensaiar a cadeia V87'
);
contem(escritorio, '__carteiraCalendarioOperacionalConfirmada', 'carteira editorial possui retrato operacional confirmado');
contem(escritorio, 'CLIENTES_SEM_CALENDARIO_OPERACIONAL', 'exclusões operacionais são centralizadas');
naoContem(extrairAtribuicaoAsync('clientesCalendarioRecorrentesConfirmados'), 'castaDosClientes()', 'carteira editorial não consulta classificação financeira');
naoContem(escritorio, 'renderListaCalendariosFerramentas(CLIENTES_LISTA)', 'lista geral não alimenta calendário principal');
contem(escritorio, 'const lista=await clientesCalendarioRecorrentesConfirmados();', 'carteira principal usa fonte confirmada');
contem(escritorio, "castaOperacional[slug]!=='avulso'", 'Cecília também exclui avulso operacional');
contem(escritorio, "getDocs(collection(db,'clientes_extras'))", 'casta de clientes extras é consultada');
const central=escritorio.slice(escritorio.indexOf('window.renderControleEditorialCalendarios = async function(){'),escritorio.indexOf('window.aplicarFiltrosControleEditorialCalendarios = function(){'));
naoContem(central, 'castaDosClientes()', 'Central Editorial da Gabi não consulta financeiro');

contem(escritorio, "calendarioFerramentasLeituraEstado='ausente';", 'documento ausente tem estado próprio');
contem(escritorio, 'Este calendário ainda não foi iniciado.', 'ausência real gera orientação correta');
contem(escritorio, "document.getElementById('iframeCalendarioFerramentas').src = 'calendario.html?cliente='", 'editor abre mesmo sem documento');
naoContem(escritorio, "throw new Error('O documento do calendário ainda não existe.')", 'ausência não bloqueia mais a Gabi');
contem(escritorio, "calendarioFerramentasLeituraEstado='falha';", 'erro real não é tratado como calendário vazio');

contem(calendario, 'id="novoMesCalendarioEquipe" min="\'+PRIMEIRA_COMPETENCIA_CALENDARIO_SITE+\'"', 'equipe pode escolher competências a partir de julho de 2026');
contem(calendario, 'function escAttr(s)', 'seletor de mês possui escape de atributo no mesmo escopo');
contem(calendario, "replace(/\"/g,'&quot;')", 'escape de atributo cobre aspas duplas');
contem(calendario, 'window.abrirMesCalendarioEquipe', 'troca de mês da equipe existe');
contem(calendario, "if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(alvo))", 'envio valida formato, não data atual');
naoContem(calendario, 'mesForaDaCompetenciaOperacional', 'barreira temporal antiga não voltou');
contem(calendario, "st === 'arquivado'", 'arquivo continua somente leitura');
contem(calendario, 'Calendário arquivado', 'cliente recebe mensagem simples de arquivo');
contem(calendario, "itensDoMes(mesVisivel).length > 0", 'mês vazio novo não é rotulado como legado visível');
contem(calendario, "const PRIMEIRA_COMPETENCIA_CALENDARIO_SITE='2026-07'", 'início do calendário no site está centralizado em julho de 2026');
contem(calendario, 'String(mes)>=PRIMEIRA_COMPETENCIA_CALENDARIO_SITE', 'junho de 2026 e anteriores são rejeitados');
contem(calendario, "mesAindaVazio && !aprovacaoCompativelDoMes(alvoMes)", 'primeiro conteúdo de mês novo inicializa estado mensal');
contem(calendario, "[alvoMes]:{status:'rascunho',mes:alvoMes", 'mês novo não pode herdar visibilidade legada');
contem(calendario, 'const mesUnicoInequivoco=mesesExplicitos.length===1&&mesesExplicitos[0]===mes;', 'primeiro mês já salvo por versão intermediária recupera o estado global sem virar legado');
contem(calendario, "mesSolicitado<'2026-07'", 'link direto anterior a julho é barrado com mensagem própria');
contem(calendario, 'pendingWrite=gravacoesCalendarioNaFila>0;\n    pintarEstado();', 'indicador visual é repintado quando a fila de gravação termina');
contem(calendario, "window.__checarLiberacaoCalendarioCliente?.();\n    if(window.__modoCal==='cliente'&&estadoAprovacao()!=='liberado')", 'snapshot confirmado remove aviso provisório antes de renderizar mês liberado');
contem(calendario, "window.__modoCal === 'cliente'", 'separação entre equipe e cliente preservada');
contem(calendario, "const lib = mesesLiberados();", 'cliente escolhe somente meses liberados');

ok(calendario === calendarios, 'calendario.html e calendarios.html precisam ser byte a byte idênticos');
contem(escritorio, "const slugDocumento=await resolverSlugCalendarioExistente(slugCanonico);", 'alias legado é resolvido antes de abrir');
contem(escritorio, "'&interno=1&mes='", 'mês solicitado é explícito no editor interno');
contem(escritorio, "if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(mes)) return;", 'mensagem do iframe rejeita mês inválido');
contem(escritorio, "const PRIMEIRA_COMPETENCIA_CALENDARIO_SITE='2026-07'", 'Escritório usa o mesmo início de competência');
contem(escritorio, 'return ms.filter(mesPertenceAoPeriodoDoSite).sort();', 'listas internas não exibem competências anteriores a julho');
contem(escritorio, 'type="month" min="2026-07" id="mesLinkCal_', 'Cecília não seleciona mês anterior ao início do produto');
contem(portal, "const primeiraCompetenciaCalendarioSite='2026-07'", 'Portal usa o mesmo início de competência');
contem(portal, 'filter(mesDoPeriodoDoSite)', 'Portal não lista calendário anterior a julho');
contem(portal, 'mesesExplicitos.length===1 && mesesExplicitos[0]===mes', 'Portal preserva o estado inequívoco de documento mensal único');

// O fluxo de Stories não deve ser alterado por esta correção de calendário.
contem(escritorio, "collection(db,'stories_semanais')", 'cadeia de Stories continua presente');
contem(escritorio, 'stories_links', 'links de Stories continuam presentes');

console.log(`REGRESSÃO V87 CALENDÁRIOS/OPERAÇÃO: APROVADA (${verificacoes} verificações)`);
