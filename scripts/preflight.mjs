#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const erros = [];
const provas = [];
const falhar = mensagem => erros.push(mensagem);
const provar = mensagem => provas.push(mensagem);
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

const obrigatorios = [
  'escritorio.html', 'portal-cliente.html', 'calendario.html',
  'calendarios.html', 'cadastro.html', 'cadastros.html',
  'avulso.html', 'firestore.rules'
];
for (const arquivo of obrigatorios) {
  if (!fs.existsSync(path.join(raiz, arquivo))) falhar(`arquivo obrigatório ausente: ${arquivo}`);
}
if (erros.length) finalizar();

const escritorio = ler('escritorio.html');

// Os dois endereços são compatibilidade pública e precisam servir o mesmo código.
if (ler('calendario.html') !== ler('calendarios.html')) {
  falhar('calendario.html e calendarios.html divergiram');
} else provar('calendários singular/plural idênticos');

// Sintaxe dos scripts inline de todos os HTMLs, sem resolver imports ou executar Firebase.
const htmls = obrigatorios.filter(f => f.endsWith('.html'));
let scriptsValidos = 0;
let totalScripts = 0;
for (const arquivo of htmls) {
  const blocos = [...ler(arquivo).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(m => !/\bsrc\s*=/.test(m[1]));
  for (let i = 0; i < blocos.length; i++) {
    totalScripts++;
    try {
      if (/\btype\s*=\s*["']module["']/.test(blocos[i][1])) new vm.SourceTextModule(blocos[i][2]);
      else new vm.Script(blocos[i][2]);
      scriptsValidos++;
    } catch (erro) {
      falhar(`${arquivo}: JavaScript inline ${i + 1} inválido: ${erro.message}`);
    }
  }
}
provar(`${scriptsValidos}/${totalScripts} scripts inline com sintaxe válida`);

// IDs duplicados apenas no HTML estático; templates JS são verificados no navegador.
for (const arquivo of htmls) {
  const semScripts = ler(arquivo).replace(/<script\b[\s\S]*?<\/script>/gi, '');
  const ids = [...semScripts.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
  const duplicados = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicados.length) falhar(`${arquivo}: IDs estáticos duplicados: ${duplicados.join(', ')}`);
}
provar('IDs estáticos sem duplicação');

// Handlers diretos devem apontar para função declarada/atribuída no mesmo arquivo.
const ignorar = new Set(['if', 'for', 'alert', 'confirm', 'setTimeout']);
let totalChamadas = 0;
for (const arquivo of htmls) {
  const fonte = ler(arquivo);
  const atributos = [...fonte.matchAll(/\bon(?:click|change|input|submit)="([^"]+)"/g)].map(m => m[1]);
  const chamadas = atributos.flatMap(a => [...a.matchAll(/(?:^|;)\s*(?:return\s+)?([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
    .filter(nome => !ignorar.has(nome));
  totalChamadas += chamadas.length;
  const declaradas = new Set([...fonte.matchAll(/(?:function\s+|window\.)([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
  const orfas = [...new Set(chamadas.filter(nome => !declaradas.has(nome)))];
  if (orfas.length) falhar(`${arquivo}: handlers diretos sem função: ${orfas.join(', ')}`);
}
provar(`${totalChamadas} chamadas diretas de UI sem handler órfão`);

// Login: alteração intencional exige atualizar explicitamente este baseline.
const etapa = escritorio.match(/  async function etapaSegura\(nome, fn\)\{[\s\S]*?\n  \}/)?.[0] || '';
const hashEtapa = crypto.createHash('sha256').update(etapa + (etapa ? '\n' : '')).digest('hex');
const baselineEtapa = '1b8d3855df1f4dcd3b30a4a311dc7be2b90df7feb1bb7b580d703cfd54ce09b4';
if (hashEtapa !== baselineEtapa) falhar(`etapaSegura mudou (${hashEtapa}); audite login e atualize o baseline conscientemente`);
else provar('etapaSegura preservada');

// Soft-delete: exclusão física operacional é bloqueada; sessões temporárias são a única exceção atual.
const exclusoes = [...escritorio.matchAll(/deleteDoc\(doc\(db,\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
const exclusoesProibidas = exclusoes.filter(c => !['sessoes_gerencia'].includes(c));
if (exclusoesProibidas.length) falhar(`deleteDoc operacional encontrado: ${[...new Set(exclusoesProibidas)].join(', ')}`);
else provar('nenhuma exclusão física operacional no escritório');

const regras = ler('firestore.rules');

// O Console do Firebase rejeita um único delimitador residual. Esta checagem
// ignora comentários e strings e garante que o arquivo entregue fecha todos os
// blocos antes de o usuário tentar publicá-lo.
function delimitadoresBalanceados(fonte) {
  const pilha = [];
  const abre = new Map([['{', '}'], ['(', ')'], ['[', ']']]);
  const fecha = new Set(abre.values());
  let string = null;
  let comentarioLinha = false;
  let comentarioBloco = false;
  for (let i = 0; i < fonte.length; i++) {
    const atual = fonte[i];
    const prox = fonte[i + 1];
    if (comentarioLinha) {
      if (atual === '\n') comentarioLinha = false;
      continue;
    }
    if (comentarioBloco) {
      if (atual === '*' && prox === '/') { comentarioBloco = false; i++; }
      continue;
    }
    if (string) {
      if (atual === '\\') { i++; continue; }
      if (atual === string) string = null;
      continue;
    }
    if (atual === '/' && prox === '/') { comentarioLinha = true; i++; continue; }
    if (atual === '/' && prox === '*') { comentarioBloco = true; i++; continue; }
    if (atual === "'" || atual === '"') { string = atual; continue; }
    if (abre.has(atual)) pilha.push(abre.get(atual));
    else if (fecha.has(atual) && pilha.pop() !== atual) return false;
  }
  return !string && !comentarioBloco && pilha.length === 0;
}
const regrasSemComentariosIniciais = regras.replace(/^\s*(?:\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/\s*)*/, '');
if (!/^rules_version\s*=/.test(regrasSemComentariosIniciais)) falhar('firestore.rules não começa por comentários válidos seguidos de rules_version');
if (!delimitadoresBalanceados(regras)) falhar('firestore.rules contém delimitadores desbalanceados');
else provar('firestore.rules com delimitadores balanceados');

for (const colecao of ['pagamentos_extra', 'pagamentos_mensais', 'calendarios', 'clientes_config']) {
  const inicio = regras.indexOf(`match /${colecao}/`);
  const trecho = inicio >= 0 ? regras.slice(inicio, inicio + 650) : '';
  if (!trecho || !/allow delete:\s*if false/.test(trecho)) falhar(`regra de soft-delete ausente ou não comprovada: ${colecao}`);
}
const regraOperacional = regras.match(/match \/\{colecao\}\/\{docId\} \{[\s\S]*?allow delete:\s*if false;[\s\S]*?\n    \}/)?.[0] || '';
if (!regraOperacional.includes("'demandas'")) falhar('demandas não está protegida pela regra operacional com soft-delete');
provar('regras críticas mantêm delete físico bloqueado');

// Todos os caminhos de criação de extras (addDoc ou lote atômico) precisam
// gravar realização e pagamento.
const pontosEscritaExtras = [
  ...escritorio.matchAll(/addDoc\(collection\(db,'pagamentos_extra'\)/g),
  ...escritorio.matchAll(/lote\.set\(extraRef\s*,/g)
].sort((a,b)=>a.index-b.index);
const escritoresExtras = pontosEscritaExtras.map(m => escritorio.slice(m.index, m.index + 1400));
if (!escritoresExtras.length) falhar('nenhum escritor de pagamentos_extra encontrado');
if (escritoresExtras.some(t => !t.includes('competenciaRealizacao') || !t.includes('competenciaPagamento'))) {
  falhar('há escritor de pagamentos_extra sem as duas competências');
} else provar(`${escritoresExtras.length} escritores de extras com realização e pagamento`);

if (/new Date\(\)\.toISOString\(\)\.slice\(0,(?:7|10)\)/.test(escritorio)) {
  falhar('data/mês civil ainda deriva de UTC; use hojeLocal()');
} else provar('datas civis do escritório usam o fuso local');

const camposAcompanhamentoComSliceUTC = /(enviadoEm|aprovadoInternoEm|clienteAprovouEm|correcaoSolicitadaEm|postadoEm|concluidoEm)[^\n]{0,100}\.slice\(0,(?:7|10)\)/;
if (camposAcompanhamentoComSliceUTC.test(escritorio)) {
  falhar('indicador de acompanhamento ainda corta timestamp UTC diretamente');
} else provar('indicadores diários convertem timestamps para o dia operacional');
if (!escritorio.includes('const correcoesHoje = todos.filter(v => doDia(v.correcaoSolicitadaEm))')) {
  falhar('Produção de hoje mistura a fila histórica com ajustes pedidos hoje');
} else provar('Produção de hoje separa fila de correção e ajustes do dia');
if (!escritorio.includes("d.status === 'aprovada' && mesOperacional(d.concluidoEm) === mesAtual") ||
    !escritorio.includes('v.editorAtribuido === nome && mesOperacional(v.enviadoEm) === mesAtual')) {
  falhar('ranking mensal ainda mistura entregas de outros meses');
} else provar('ranking mensal limita demandas e vídeos ao mês corrente');
if (!escritorio.includes("cacheVideosProducao.filter(v => !v.excluido && ['aguardando_edicao','correcao'].includes(v.status))")) {
  falhar('carga da Amanda ainda atribui ao editor vídeos fora da mão dele');
} else provar('carga por editor conta somente edição e correção');
if (/\.concluidaEm/.test(escritorio)) falhar('acompanhamento ainda usa o campo inexistente concluidaEm');
else provar('acompanhamento de demandas usa concluidoEm');

for (const provaSeguranca of [
  ['token interno não abre Portal', !/tokenEquipe\s*==\s*token/.test(regras.match(/function tokenPortalValido[\s\S]*?\n    \}/)?.[0]||'')],
  ['extras isolados por dono/gestão', /allow read:\s*if ehGerencia\(\) \|\| \(ehEquipe\(\) && ehDonoExtra\(resource\.data\)\)/.test(regras)],
  ['Funções Fixas configuráveis só pela Amanda', /match \/tipos_tarefa_fixa[\s\S]*?allow create, update:\s*if ehAmanda\(\)/.test(regras)],
  ['cliente não lê clientes_acesso', /match \/clientes_acesso[\s\S]*?allow get:\s*if ehEquipe\(\)/.test(regras) && !/getDoc\(doc\(db,'clientes_acesso'/.test(ler('portal-cliente.html'))]
]) {
  if (!provaSeguranca[1]) falhar(provaSeguranca[0]); else provar(provaSeguranca[0]);
}

if (!escritorio.includes('identidadeRecorrenteDemanda') || !escritorio.includes('camposAoAlterarPrazoDemanda(novoPrazoPai')) {
  falhar('proteção de competência/prazo residual ausente');
} else provar('deduplicação mensal e limpeza de prazo residual presentes');

if (!escritorio.includes("definirItemExclusivoNoDOM('navCadastro'") ||
    !escritorio.includes("definirItemExclusivoNoDOM('navgroupVendas'")) {
  falhar('itens privados de clientes/financeiro não são removidos do DOM por papel');
} else provar('itens privados de sidebar são removidos do DOM por papel');

const inicioMeusExtras = escritorio.indexOf('window.htmlMeusExtras = async function');
const fimMeusExtras = escritorio.indexOf('window.alternarCamposExtra', inicioMeusExtras);
const blocoMeusExtras = inicioMeusExtras >= 0 && fimMeusExtras > inicioMeusExtras
  ? escritorio.slice(inicioMeusExtras, fimMeusExtras) : '';
if (!/const meus\s*=\s*todosMeus\.filter/.test(blocoMeusExtras)) {
  falhar('htmlMeusExtras usa a lista mensal sem declará-la');
} else provar('painel Meus extras mantém a lista mensal declarada no próprio escopo');

// Compatibilidade da cápsula: uma chamada manual no botão, sem hard delete ou acionamento recorrente.
const chamadasCapsula = [...escritorio.matchAll(/acionarCapsulaAmanda\s*\(/g)].length;
if (chamadasCapsula !== 1) falhar(`quantidade inesperada de chamadas executáveis à cápsula: ${chamadasCapsula}`);
if (/set(?:Interval|Timeout)\s*\([^)]*acionarCapsulaAmanda/.test(escritorio)) falhar('gatilho temporizado de cápsula encontrado');
else provar('cápsula sem gatilho temporizado direto');

const build = escritorio.match(/<meta name="gs-build" content="([^"]+)">/)?.[1];
if (!build) falhar('marcador gs-build ausente');
else provar(`build: ${build}`);

finalizar();

function finalizar() {
  console.log('PRE-FLIGHT GET STARTED');
  for (const prova of provas) console.log(`PASS  ${prova}`);
  for (const erro of erros) console.error(`FAIL  ${erro}`);
  console.log(erros.length ? `RESULTADO: FALHOU (${erros.length})` : 'RESULTADO: APROVADO');
  process.exitCode = erros.length ? 1 : 0;
}
