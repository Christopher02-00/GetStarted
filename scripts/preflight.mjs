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
  'avulso.html', 'firestore.rules', 'CATALOGO_DE_ERROS.md'
];
for (const arquivo of obrigatorios) {
  if (!fs.existsSync(path.join(raiz, arquivo))) falhar(`arquivo obrigatório ausente: ${arquivo}`);
}
if (erros.length) finalizar();

const escritorio = ler('escritorio.html');
const escritorioLf = escritorio.replace(/\r\n/g, '\n');
const portal = ler('portal-cliente.html');
const catalogoErros = ler('CATALOGO_DE_ERROS.md');

const leisV45 = [
  'Sessão antiga parcialmente enriquecida virou “moderna”',
  'Primeiro mês da ficha não chegava ao contrato',
  'Total recebido e composição pareciam duplicação',
  'Campanhas tinham duas portas e duas fontes',
  'Fallback de ID escrito antes do spread',
  'Subaba inexistente de Campanhas na matriz de calendário',
  'Campanhas estava escondida, mas continuava no DOM de filmmakers'
];
const leisV47 = [
  'Nome parecido não é identidade confirmada',
  'Saída operacional não encerrava a recorrência financeira',
  'Mensalidade cancelada ainda era contada como aberta',
  'Contrato ativo podia sumir da Central por cadastro antigo arquivado',
  'Texto livre de cortesia divergiu do lançamento real'
];
const leisV48 = [
  'Primeiro pagamento misturava conta pessoal e caixa da agência',
  'Variável privada do Financeiro caiu na Central de Demandas',
  'Mensalidade legada era vinculada pelo ID presumido',
  'Destino bancário quase vazou pelo documento da mensalidade'
];
const leisV49 = [
  'Calendário enviado continuava editável pela equipe',
  'Reabertura disputava com o envio da Amanda',
  '“Subi tudo” não foi conferido arquivo por arquivo',
  'Regra publicada e backup do GitHub ficaram em versões diferentes'
];
const leisV50 = [
  'Cofre necessário à operação estava preso à Gerência inteira',
  'Saída antiga sem competência final continuava parecendo conciliada'
];
const leisV51 = [
  'Calendário legado oferecia um envio que a própria trava recusava',
  'Acompanhamento misturava o estado do mês atual com totais de outros meses',
  'Check de Stories parecia ausente e usava identidade derivada do nome'
];
const leisV52 = [
  'Stories esperava verificações sem relação antes de existir no DOM'
];
const leisV53 = [
  'O link de Story parava no escritório e nunca chegava ao Portal',
  'Aviso de choque usava consulta seguida de criação não atômica',
  'Campanha detectada perdia a data completa',
  'Painel editorial somava conteúdo arquivado e priorizava número gigante'
];
const leisV54 = [
  'Posição na grade editorial virou data fixa de publicação',
  'Caixa da agência apareceu como total de mensalidades pagas'
];
const leisV55 = [
  'Alias financeiro retirou a Zeiss da operação da Gabi'
];
const leisV56 = [
  'Alteração de contrato reescrevia a competência já aberta',
  'Ficha geral mantinha um segundo escritor de valor financeiro'
];
const leisV57 = [
  'O próprio autosave impedia a Gabi de enviar o calendário',
  'Cobrança cancelada continuava aparecendo como mensalidade operacional',
  'A Gerência prometia avaliação, mas o Portal não tinha como enviá-la',
  'Cancelar uma saída precisa restaurar a cadeia inteira'
];
if (!catalogoErros.includes('CHECKLIST DE 30 SEGUNDOS — ANTES DE CADA EDIÇÃO') ||
    [...leisV45, ...leisV47, ...leisV48, ...leisV49, ...leisV50, ...leisV51, ...leisV52, ...leisV53, ...leisV54, ...leisV55, ...leisV56, ...leisV57].some(lei => !catalogoErros.includes(lei))) {
  falhar('catálogo mestre não contém o checklist e todas as leis registradas até a V57');
} else provar('catálogo mestre preserva o checklist e as leis registradas até a V57');

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
const etapa = escritorioLf.match(/  async function etapaSegura\(nome, fn, limiteMs\)\{[\s\S]*?\n  \}/)?.[0] || '';
const hashEtapa = crypto.createHash('sha256').update(etapa + (etapa ? '\n' : '')).digest('hex');
const baselineEtapa = 'a7272a98a268b1e56e7816d7623d26542652458c4430b48f5008b49a56d36b31';
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
if (!/^rules_version\s*=\s*'2';/.test(regras)) falhar(`firestore.rules: a linha 1 deve começar exatamente com rules_version = '2';`);
else provar(`firestore.rules começa por rules_version = '2'; na linha 1`);
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

const regraEntradaPessoal = regras.match(/match \/recebimentos_entrada_pessoal\/\{docId\} \{[\s\S]*?allow delete:\s*if false;[\s\S]*?\n    \}/)?.[0] || '';
if (!regraEntradaPessoal.includes('allow read, update: if ehChris()') ||
    !regraEntradaPessoal.includes('allow create: if ehChris() || (ehAmanda()') ||
    !regraEntradaPessoal.includes("request.resource.data.status == 'pendente'") ||
    !regraEntradaPessoal.includes("!('destino' in request.resource.data)") ||
    !regraEntradaPessoal.includes("!('foraCaixaAgencia' in request.resource.data)")) {
  falhar('controle do primeiro pagamento expõe conta pessoal ou permite confirmação fora do Chris');
} else provar('primeiro pagamento pessoal é legível/editável só por Chris; Amanda cria apenas pendente padronizado');

const blocoDemandasEquipe = escritorio.slice(
  escritorio.indexOf('async function renderDemandasDaEquipe'),
  escritorio.indexOf('  window.renderPainelDemandas', escritorio.indexOf('async function renderDemandasDaEquipe'))
);
if (blocoDemandasEquipe.includes('controleEntradasHTML') || blocoDemandasEquipe.includes('avisoControleEntradaHTML')) {
  falhar('variável privada do Financeiro vazou para a Central de Demandas');
} else provar('variáveis do primeiro pagamento permanecem no escopo exclusivo do Financeiro');

const confirmacaoEntrada = escritorio.slice(
  escritorio.indexOf('window.confirmarRecebimentoEntrada=async function'),
  escritorio.indexOf('  window.desfazerRecebimentoEntrada', escritorio.indexOf('window.confirmarRecebimentoEntrada=async function'))
);
const escritaMensalEntrada = confirmacaoEntrada.match(/tx\.set\(mensalidadeRef,\{([^}]|\}(?!,\{merge:true\}))*\},\{merge:true\}\)/)?.[0] || '';
if (!escritaMensalEntrada.includes("origemRecebimento:'entrada_contrato'") ||
    escritaMensalEntrada.includes('destinoRecebimento') || escritaMensalEntrada.includes('foraCaixaAgencia')) {
  falhar('destino bancário privado vazou para pagamentos_mensais, que o Portal do cliente pode ler');
} else provar('pagamentos_mensais recebe apenas o vínculo; destino bancário fica na coleção exclusiva do Chris');

if (!escritorio.includes('identidadeRecorrenteDemanda') || !escritorio.includes('camposAoAlterarPrazoDemanda(novoPrazoPai')) {
  falhar('proteção de competência/prazo residual ausente');
} else provar('deduplicação mensal e limpeza de prazo residual presentes');

if (!escritorio.includes("'master-chefe': 'master-chef'") ||
    !escritorio.includes("'master-chef-pizzaria': 'master-chef'") ||
    !escritorio.includes("{ nome:'Master Chef',")) {
  falhar('Master Chef perdeu a identidade canônica ou a grafia correta do importador');
} else provar('Master Chef é a única identidade operacional; aliases permanecem apenas para compatibilidade');

const fusaoClientes = escritorio.slice(
  escritorio.indexOf('window.fundirClientes = async function'),
  escritorio.indexOf('window.arquivarClienteDuplicado')
);
if (!fusaoClientes.includes("doc(db,'clientes_acesso', PARA)") ||
    !fusaoClientes.includes("doc(db,'clientes_portal_tokens',tokenTransferido)") ||
    fusaoClientes.indexOf('portal preservado em ') > fusaoClientes.indexOf("updateDoc(doc(db,'clientes_acesso', DE)")) {
  falhar('fusão de cliente pode revogar o Portal duplicado antes de confirmar o acesso canônico');
} else provar('fusão preserva e confirma o Portal canônico antes de revogar o duplicado');

const centralClientes = escritorio.slice(
  escritorio.indexOf('function linkPortalClienteCentral'),
  escritorio.indexOf('window.salvarClienteAtivoCentral')
);
if (!centralClientes.includes('window.garantirPortalClienteCentral=async function') ||
    !centralClientes.includes("doc(db,'clientes_portal_tokens',token)") ||
    !escritorio.includes('Criar/recuperar Portal')) {
  falhar('Central da Amanda/Chris não consegue recuperar Portal ausente de mensalista ativo');
} else provar('Central recupera Portal ausente sem apagar histórico');

const reativacaoCliente = escritorio.slice(
  escritorio.indexOf('window.cancelarProgramacaoSaidaCentral=async function'),
  escritorio.indexOf('async function efetivarSaidasProgramadas')
);
if (!escritorio.includes('Reativar cliente e recuperar Portal') ||
    !reativacaoCliente.includes("statusSaida:'cancelada',excluido:true") ||
    !reativacaoCliente.includes("status:'ativo',encerrado:false,excluido:false,ativo:true") ||
    !reativacaoCliente.includes('status:p.statusAntesSaida') ||
    !reativacaoCliente.includes('ultimaCompetenciaPagamento:deleteField()') ||
    !reativacaoCliente.includes('await window.garantirPortalClienteCentral(slug)') ||
    reativacaoCliente.includes('deleteDoc(')) {
  falhar('reativação de mensalista arquivado não restaura a cadeia completa com soft-delete');
} else provar('reativação restaura operação e Portal mantendo a saída no histórico');

const barreiraDuplicidade = escritorio.slice(
  escritorio.indexOf('async function diagnosticarIdentidadeCliente'),
  escritorio.indexOf('function dataOperacionalISO')
);
if (!barreiraDuplicidade.includes("lerPrimeiroExistente('contratos_cliente')") ||
    !barreiraDuplicidade.includes('slugsCompatibilidadeCliente(slug)') ||
    !barreiraDuplicidade.includes("getDocs(collection(db,'clientes_extras'))") ||
    !barreiraDuplicidade.includes("getDocs(collection(db,'cadastros_clientes'))") ||
    !barreiraDuplicidade.includes("getDocs(collection(db,'clientes_encerrados'))") ||
    escritorio.includes("addDoc(collection(db,'clientes_extras')") ||
    !escritorio.includes("setDoc(doc(db,'clientes_extras',slug)") ||
    !escritorio.includes('existentes.add(slugClienteCanonico(d.id))') ||
    !escritorio.includes('return slugClienteMensalista(nome);')) {
  falhar('barreira sistêmica contra cliente duplicado não cobre todas as entradas ou voltou a usar ID aleatório');
} else provar('entradas de cliente usam identidade canônica, varredura cruzada e documento determinístico');

const reparoIdentidade = escritorio.slice(
  escritorio.indexOf('window.repararIdentidadeClienteCentral=async function'),
  escritorio.indexOf('window.salvarClienteAtivoCentral')
);
const renderArquivoClientes = escritorio.slice(
  escritorio.indexOf('const htmlArquivado=v=>'),
  escritorio.indexOf('box.innerHTML=', escritorio.indexOf('const htmlArquivado=v=>'))
);
if (!escritorio.includes("const NOMES_CLIENTES_CANONICOS = {'master-chef':'Master Chef','zeiss':'Zeiss'}") ||
    !reparoIdentidade.includes("doc(db,'clientes_portal_tokens',atual.token)") ||
    !reparoIdentidade.includes("doc(db,'calendarios',slug)") ||
    !reparoIdentidade.includes('identidadeCanonicaCorrigidaEm') ||
    !renderArquivoClientes.includes('aliasOuFusao') ||
    !renderArquivoClientes.includes('!aliasOuFusao')) {
  falhar('nome canônico/Portal ainda pode herdar alias ou arquivo de fusão pode oferecer reativação');
} else provar('identidade canônica corrige Portal e calendário; alias arquivado permanece somente histórico');
if (!escritorio.includes("'zeens': 'zeiss'") ||
    !escritorio.includes('{nome:"Zeiss", slug:"zeiss"}') ||
    !escritorio.includes('function mapaCalendariosPorIdentidade(snapshot)') ||
    !escritorio.includes('async function resolverSlugCalendarioExistente(slug)') ||
    !escritorio.includes('cals = mapaCalendariosPorIdentidade(snap)')) {
  falhar('Zeiss pode voltar a sumir da carteira ou perder o calendário salvo sob alias legado');
} else provar('Zeiss é identidade operacional estável e calendários legados permanecem acessíveis sem migração destrutiva');

const saldoCaptacao = escritorio.slice(
  escritorio.indexOf('if(qtdRealizada < qtdPlanejada)'),
  escritorio.indexOf('    } else {', escritorio.indexOf('if(qtdRealizada < qtdPlanejada)'))
);
if (!saldoCaptacao.includes("tipoPendencia: 'saldo_captacao'") ||
    !saldoCaptacao.includes('NÃO dependem de aprovação da Cecília') ||
    saldoCaptacao.includes('qtdVideosPlanejados: increment(')) {
  falhar('saldo de captação voltou a bloquear vídeos na Cecília ou alterar contador sem itens exatos');
} else provar('Cecília recebe apenas planejamento do saldo; vídeos realizados seguem para Amanda');

const confirmacaoGravacao = escritorio.slice(
  escritorio.indexOf('async function registrarGravacaoRealizadaNucleo'),
  escritorio.indexOf('function popularClientesReferencia')
);
const preparacaoMateriaisGravacao = escritorio.slice(
  escritorio.indexOf('function prepararMateriaisDeclaradosSessao'),
  escritorio.indexOf('window.prepararMateriaisDeclaradosSessao')
);
if (!escritorio.includes('NÃO GRAVAR HOJE') || !escritorio.includes('sessaoItensPlanejados') ||
    !confirmacaoGravacao.includes("dadosAtuais.status !== 'agendado'") ||
    !confirmacaoGravacao.includes('permitidosAgora.has(chave)')) {
  falhar('ordem da sessão ou revalidação atômica da gravação ausente');
} else provar('gravação limitada à ordem planejada da sessão');
if (!escritorio.includes('function chaveItemSessao(item)') ||
    !escritorio.includes('nomeItemSessaoCanonico(itemAtual.name) === nomeItemSessaoCanonico(videoSelecionado.nome)') ||
    !escritorio.includes('data-nome="${escAttr(it.name)}"')) {
  falhar('compatibilidade de títulos legados com espaços/aspas ausente na gravação');
} else provar('Cookiery e legados preservam aspas e ignoram apenas espaços residuais no vínculo da sessão');
if (!escritorio.includes('function __snapshotFalso(itens, colecao)') ||
    !escritorio.includes('ref: doc(db,caminho)') ||
    !escritorio.includes("__path:d.ref?.path || (nome+'/'+d.id)") ||
    (escritorio.match(/__snapshotFalso\([^)]*,nome\)/g)||[]).length < 3 ||
    !escritorio.includes('function __validarReferenciasFirestore(refs, contexto)')) {
  falhar('cache do Firestore perdeu DocumentReference e quebra transações da Central de Clientes');
} else provar('cache preserva DocumentReference usado ao salvar/ativar clientes');
if (!escritorio.includes('Registro compatível da sessão antiga') ||
    !preparacaoMateriaisGravacao.includes("vinculoSessao:registroLegado ? 'declarado_legado'") ||
    !confirmacaoGravacao.includes('sessaoLegadaSemVinculo(dadosAtuais)') ||
    !preparacaoMateriaisGravacao.includes('Há um vídeo sem nome ou repetido nesta sessão.')) {
  falhar('compatibilidade pós-filmagem anterior à V32 está ausente ou sem proteções');
} else provar('pós-filmagem legado registra material sem vincular pauta de outra sessão');
const trocaResponsavelGravacao = escritorio.slice(
  escritorio.indexOf('window.trocarFilmmakerAgendamento'),
  escritorio.indexOf('/* ===== A CECÍLIA PRECISA PODER DESFAZER')
);
if (!escritorio.includes('Responsável que realmente realizou esta sessão') ||
    !trocaResponsavelGravacao.includes('nomeOperacionalCanonico(p.nome)') ||
    !trocaResponsavelGravacao.includes('renderMinhaAgendaFilmmaker()')) {
  falhar('coordenação não consegue corrigir responsável de gravação atrasada sem ampliar acesso');
} else provar('coordenação corrige responsável legado e atualiza a agenda isolada');
const distribuicaoVideo = escritorio.slice(
  escritorio.indexOf('async function avisarEditorDoVideo'),
  escritorio.indexOf('let editorFuncionarioAtual')
);
if (!distribuicaoVideo.includes('editorAtribuido: novoEditor') ||
    !distribuicaoVideo.includes('await avisarEditorDoVideo') ||
    !escritorio.includes("v.editorAtribuido === usuarioAtual && ['aguardando_edicao','correcao'].includes(v.status)")) {
  falhar('cadeia pós-filmagem → distribuição Amanda → fila do editor incompleta');
} else provar('pós-filmagem chega à distribuição e à fila do editor após atribuição');

const calendarioEditor = ler('calendario.html');
const reabrirCalendario = calendarioEditor.slice(
  calendarioEditor.indexOf('window.retirarDaAprovacaoInterna = async function'),
  calendarioEditor.indexOf('/* Esconde da visão do cliente')
);
if (!calendarioEditor.includes('2026-08-11-estabilidade-clientes-v57') ||
    !calendarioEditor.includes("return st === 'aguardando_interna' || st === 'aprovado_interno' || st === 'liberado'") ||
    !reabrirCalendario.includes('fb.runTransaction') ||
    !reabrirCalendario.includes("estadoServidor === 'liberado'") ||
    !reabrirCalendario.includes("code:'gs/calendario-ja-enviado'") ||
    !reabrirCalendario.includes('exigeNovaAprovacao:true') ||
    reabrirCalendario.includes('gravarComSeguranca()')) {
  falhar('reabertura do calendário não está atômica, limitada ao pré-envio ou exige nova aprovação');
} else provar('Gabi reabre calendário aprovado antes do envio; liberado permanece imutável');
const envioCalendario = calendarioEditor.slice(
  calendarioEditor.indexOf('window.enviarParaAprovacaoInterna = async function'),
  calendarioEditor.indexOf('/* ===== REABRIR ANTES DO ENVIO')
);
if (!envioCalendario.includes('const legado = ehCalendarioLegado()') ||
    !envioCalendario.includes('edicaoBloqueadaPorRevisao() && !legado') ||
    !envioCalendario.includes("status:'aguardando_interna'") ||
    !calendarioEditor.includes('Enviar calendário legado para a Amanda') ||
    !calendarioEditor.includes('function deveBloquearConflitoCalendario') ||
    !calendarioEditor.includes('assinaturaConteudoCalendario(servidor)!==assinaturaConteudoCalendario(local)')) {
  falhar('calendário legado voltou a exibir envio que a própria trava impede');
} else provar('envio formal tolera só o eco idêntico do autosave; edição concorrente e calendário liberado continuam travados');
const storiesChecklist = escritorio.slice(
  escritorio.indexOf('async function renderStoriesDiarios'),
  escritorio.indexOf('// ===== BIT — CENTRAL DE DUVIDAS')
);
if (!storiesChecklist.includes('Promise.all(clientes.map') ||
    !storiesChecklist.includes('String(c.id || c.slug || c.clienteNome') ||
    !storiesChecklist.includes('data-story-check=') ||
    !storiesChecklist.includes("usuarioAtual !== 'Gabrielle'") ||
    !storiesChecklist.includes('Nada foi marcado.')) {
  falhar('check de Stories perdeu carregamento paralelo, identidade estável, controle visível ou falha fechada');
} else provar('check de Stories carrega em paralelo, usa slug estável e só confirma após gravação');
const aberturaChecklist = escritorio.slice(
  escritorio.indexOf('window.abrirChecklist = async function'),
  escritorio.indexOf('function renderChecklist')
);
if (aberturaChecklist.indexOf('renderStoriesDiarios();') < 0 ||
    aberturaChecklist.indexOf('renderStoriesDiarios();') > aberturaChecklist.indexOf('await autoVerificarChecklist()') ||
    !aberturaChecklist.includes('cont.appendChild(storiesBoxAntecipado)')) {
  falhar('Stories voltou a esperar auto-verificação/streak antes de existir no DOM');
} else provar('Stories nasce antes das verificações independentes e preserva o mesmo nó durante a montagem');
const visaoCalendarios = escritorio.slice(
  escritorio.indexOf('function progressoEditorialCalendario'),
  escritorio.indexOf('/* ===== REFEITA — 28/07/2026')
);
if (!visaoCalendarios.includes('itensDoMesCalendario(cal, mesAtual)') ||
    !visaoCalendarios.includes("['Amanda','Gabrielle'].includes(usuarioAtual)") ||
    !visaoCalendarios.includes('data-calendarios-progresso-editorial=') ||
    !escritorio.includes("['Chris','Amanda','Gabrielle','Cecília'].includes(pessoaDoOuvinte)")) {
  falhar('acompanhamento editorial não está mensal, isolado para Amanda/Gabi ou atualizado pelo listener comum');
} else provar('Amanda e Gabi acompanham roteiros do mês correto pela fonte em tempo real');
if (!calendarioEditor.includes("const modoAuditoria = params.get('auditoria') === '1'") ||
    !calendarioEditor.includes('function impedirEscritaAuditoria(ref)') ||
    !escritorio.includes("window.__auditoriaPapelAtiva?'&auditoria=1':''")) {
  falhar('iframe do calendário não preserva o modo somente leitura da auditoria');
} else provar('auditoria mantém calendário em modo somente leitura');
if (!calendarioEditor.includes('const it={...anterior,itemId:anterior.itemId||') ||
    !calendarioEditor.includes('excluido:true,excluidoPor:')) {
  falhar('item de calendário não preserva campos/ID ou perdeu soft-delete');
} else provar('itens de calendário preservam campos, ID estável e soft-delete');
const revisaoCalendario = escritorio.slice(
  escritorio.indexOf('function htmlItemAnaliseCalendario'),
  escritorio.indexOf('window.recarregarFilaCalendarios')
);
const comentarioCalendario = calendarioEditor.slice(
  calendarioEditor.indexOf('async function salvarComentarioEquipeDuranteRevisao'),
  calendarioEditor.indexOf('/* ===== O AVISO QUE NÃO EXISTIA')
);
if (!revisaoCalendario.includes('ROTEIRO / COPY') || !revisaoCalendario.includes('LEGENDA') ||
    !revisaoCalendario.includes('Abrir referência') || !revisaoCalendario.includes('runTransaction') ||
    !comentarioCalendario.includes('runTransaction') || comentarioCalendario.includes('exigirRetiradaAntesDeEditar()')) {
  falhar('revisão da Amanda não comprova análise/comentário sem desbloquear o calendário');
} else provar('Amanda analisa roteiro/referência e comenta sem editar a pauta');

const regraCalendario = regras.slice(regras.indexOf('match /calendarios/{slug}'), regras.indexOf('match /videos_producao'));
if (!regraCalendario.includes('temSessaoCalendarioEquipe() && slug == clienteDaSessao()')) {
  falhar('link interno do calendário continua sem permissão compatível de gravação');
} else provar('link interno do calendário grava somente o cliente da própria sessão');

if (!escritorio.includes("definirItemExclusivoNoDOM('navCadastro'") ||
    !escritorio.includes("definirItemExclusivoNoDOM('navgroupVendas'") ||
    !escritorio.includes("definirItemExclusivoNoDOM('navAcompCampanhas',podeCampanhas)") ||
    !escritorio.includes("definirItemExclusivoNoDOM('view-campanhas',podeCampanhas)")) {
  falhar('itens privados de clientes/financeiro não são removidos do DOM por papel');
} else provar('itens privados e Campanhas são removidos do DOM por papel');

if (!escritorio.includes('function __impedirGravacaoDuranteAuditoria') ||
    !['addDoc','setDoc','updateDoc','deleteDoc','runTransaction','writeBatch'].every(nome =>
      new RegExp(`(?:function|async function) ${nome}\\([^)]*\\)\\{\\s*__impedirGravacaoDuranteAuditoria\\(\\)`).test(escritorio)) ||
    !escritorio.includes("window.__pessoaAutenticadaReal !== 'Chris'")) {
  falhar('auditoria de perfis não está exclusiva do Chris ou não é integralmente somente leitura');
} else provar('auditoria de perfis exclusiva do Chris e sem gravação Firestore');

if (!escritorio.includes('producaoPorFilmmaker') || !escritorio.includes('conteudosRealizados') ||
    !escritorio.includes('function producaoDetalhadaDoAgendamento') ||
    !escritorio.includes('Baixas das gravações — quem fez e quais conteúdos')) {
  falhar('controle da Cecília perdeu autoria, quantidade ou títulos por gravação');
} else provar('controle da Cecília detalha filmmaker, quantidade e conteúdos');
const controleGravacoes = escritorio.slice(escritorio.indexOf('window.renderControleGravacoes = async function'), escritorio.indexOf('window.filtrarControleGravacoes'));
if (!controleGravacoes.includes('agendamentos.filter(a=>pessoaNaEquipe(a,usuarioAtual))') ||
    !controleGravacoes.includes("getDoc(doc(db,'calendarios',slug))")) {
  falhar('controle de gravações do filmmaker lista calendários fora da própria equipe');
} else provar('controle de gravações limita filmmaker às próprias sessões');

if (!escritorio.includes('function saidaClienteJaEfetiva') ||
    !escritorio.includes('async function efetivarSaidasProgramadas') ||
    !escritorio.includes("statusSaida:'encerrada'") ||
    !regras.includes('function acessoDentroDaVigencia(dados)')) {
  falhar('saída programada não cobre filtros, motor e expiração do Portal');
} else provar('saída programada preserva operação até a data e expira acessos');
const cargaClientes = escritorio.slice(escritorio.indexOf('async function carregarClientesExtras'), escritorio.indexOf('carregarClientesExtras();'));
if (!cargaClientes.includes("getDocs(collection(db,'clientes_config'))") ||
    !cargaClientes.includes('filter(c=>!clienteInativoEfetivo(configuracoes[c.slug]))')) {
  falhar('seletores gerais podem ressuscitar cliente após a data de saída');
} else provar('carteira operacional remove saídas efetivas de todos os seletores');

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
if (build !== '2026-08-11-estabilidade-clientes-v57') {
  falhar(`build V57 inesperado: ${build || 'ausente'}`);
} else provar('V57 fecha envio de calendário, saída operacional e avaliação do Portal');

const salvarContratoProgramado = escritorio.slice(
  escritorio.indexOf('window.salvarContrato = async function'),
  escritorio.indexOf('window.novoContrato')
);
const fichaClienteAtivo = escritorio.slice(
  escritorio.indexOf('window.salvarClienteAtivoCentral=async function'),
  escritorio.indexOf('window.arquivarEntradaPendente')
);
if (!escritorio.includes('function valorContratoNaCompetencia') ||
    !escritorio.includes('function ajusteValorProgramadoMensalidade') ||
    !salvarContratoProgramado.includes('historicoAlteracoesValor') ||
    !salvarContratoProgramado.includes('A alteração deve começar no próximo mês ou depois') ||
    fichaClienteAtivo.includes('valorVigente:dados.valorMensal') ||
    fichaClienteAtivo.includes('valorDevido:dados.valorMensal')) {
  falhar('mudança programada de contrato perdeu competência, histórico ou fonte financeira única');
} else provar('alteração de contrato tem vigência futura, histórico e não reescreve o valor pela ficha geral');
if (!escritorio.includes('function mensalidadeVisivelNaGradeOperacional') ||
    !escritorio.includes('mensalidadeVisivelNaGradeOperacional(v,contratosHistoricosPorSlug[slug],competencia)')) {
  falhar('grade de mensalidades voltou a exibir cancelado ou competência posterior à saída');
} else provar('mensalidade cancelada/pós-saída permanece só no histórico, fora da grade operacional');

const cofreCecilia = escritorio.slice(
  escritorio.indexOf('async function renderCofreCecilia'),
  escritorio.indexOf('window.excluirSenhaCofre')
);
const syncDomPapel = escritorio.slice(
  escritorio.indexOf('const __sidebarExclusivos'),
  escritorio.indexOf('function esc(s)')
);
if (!escritorio.includes('id="navCofreCecilia"') ||
    !escritorio.includes('id="view-cofreCecilia"') ||
    !syncDomPapel.includes("'navCofreCecilia','view-cofreCecilia'") ||
    !syncDomPapel.includes("definirItemExclusivoNoDOM('navCofreCecilia',usuarioAtual==='Cecília')") ||
    !escritorio.includes("if(nome === 'cofreCecilia' && usuarioAtual!=='Cecília')") ||
    !cofreCecilia.includes("if(usuarioAtual!=='Cecília')") ||
    cofreCecilia.includes('salvarSenhaCofre(') || cofreCecilia.includes('excluirSenhaCofre(') ||
    !regras.includes('allow read: if ehGerencia() || ehCecilia();') ||
    !regras.includes('allow create, update: if ehGerencia();')) {
  falhar('cofre da Cecília perdeu leitura mínima, isolamento real de DOM ou separação das escritas de Gerência');
} else provar('Cecília recebe cofre somente leitura; menu/view saem do DOM dos demais e regras não liberam escrita');

const saidaFinanceira = escritorio.slice(
  escritorio.indexOf('window.salvarSaidaClienteCentral=async function'),
  escritorio.indexOf('window.cancelarProgramacaoSaidaCentral=async function')
);
if (!escritorio.includes('id="saidaUltimaCompetencia"') ||
    !saidaFinanceira.includes('analisarPagamentosParaSaida') ||
    !saidaFinanceira.includes("status:'cancelado',canceladoPorSaida:true") ||
    !saidaFinanceira.includes('pagosPosteriores.length') ||
    !saidaFinanceira.includes('ultimaCompetenciaDoContrato:true') ||
    !escritorio.includes("String(competencia||'') > fim") ||
    !escritorio.includes('financeiroLegadoPendente') ||
    !escritorio.includes('FINANCEIRO PENDENTE') ||
    !escritorio.includes('Definir último mês')) {
  falhar('saída de cliente não fecha toda a cadeia financeira pela última competência');
} else provar('saída bloqueia pagamento posterior, cancela futuro sem apagar, limita novas competências e denuncia legado incompleto');

const resumoMinhas = escritorio.slice(
  escritorio.indexOf('const resumoHtml = `<div class="painelResumo painelResumoDemandas"'),
  escritorio.indexOf('/* ===== FILA DE APROVACAO', escritorio.indexOf('const resumoHtml = `<div class="painelResumo painelResumoDemandas"'))
);
if (!resumoMinhas || (resumoMinhas.match(/resumoCard clicavel/g) || []).length !== 5 || resumoMinhas.includes('grid-column:span 2')) {
  falhar('Minhas Demandas não preserva os cinco cartões clicáveis sem lacuna no topo');
} else provar('Minhas Demandas tem cinco cartões fixos, clicáveis e sem grid-column residual');

const centralDemandas = escritorio.slice(
  escritorio.indexOf('async function renderDemandasDaEquipe'),
  escritorio.indexOf('window.renderPainelDemandas', escritorio.indexOf('async function renderDemandasDaEquipe'))
);
if (!centralDemandas.includes('Central de Demandas') ||
    !centralDemandas.includes('filtrosDemandas') ||
    !centralDemandas.includes('setFiltroFaixaDemandas') ||
    !centralDemandas.includes('<details class="distribuicaoDemandas">')) {
  falhar('Demandas ainda não expõe cartões, filtros identificados e distribuição recolhível');
} else provar('Demandas expõe central, filtros nomeados e distribuição por pessoa recolhível');

const salvarLinksStories = escritorio.slice(escritorio.indexOf('window.salvarLinkStory'), escritorio.indexOf('window.renderStoriesCliente'));
const carregarStoriesPortal = portal.slice(portal.indexOf('async function carregarStories'), portal.indexOf('/* ===== SUA PROPOSTA'));
if (!salvarLinksStories.includes("revisaoInterna='aguardando_interna'") ||
    !salvarLinksStories.includes('window.liberarLinksStory') ||
    !salvarLinksStories.includes('window.devolverLinksStory') ||
    !salvarLinksStories.includes('window.enviarLinksStoryParaRevisao') ||
    !carregarStoriesPortal.includes("doc(db,'stories_links',clienteAtual.slug+'_'+semana)") ||
    !carregarStoriesPortal.includes("linksDaSemana?.revisaoInterna==='liberado'") ||
    !regras.includes('resource.data.liberadoCliente == true') ||
    !regras.includes("resource.data.revisaoInterna == 'liberado'")) {
  falhar('cadeia de links de Stories não fecha revisão Amanda → regra isolada → Portal do próprio cliente');
} else provar('links de Stories chegam ao Portal somente após revisão e com isolamento por cliente/semana');

const avaliacaoPortal = portal.slice(portal.indexOf('async function carregarAvaliacaoCliente'), portal.indexOf('/* ===== PROGRAMADOS'));
const regraAvaliacao = regras.slice(regras.indexOf('match /avaliacoes_clientes/{docId}'), regras.indexOf('match /demandas_cliente/{docId}'));
if (!portal.includes('data-tab="avaliacao"') ||
    !avaliacaoPortal.includes("doc(db,'avaliacoes_clientes',idAvaliacaoPortal())") ||
    !avaliacaoPortal.includes("cliente:clienteAtual.slug") ||
    !avaliacaoPortal.includes("origem:'portal_cliente'") ||
    !regraAvaliacao.includes('resource.data.cliente == clienteDaSessao()') ||
    !regraAvaliacao.includes("affectedKeys().hasOnly(['clienteNome','nota','mes','comentario','origem','atualizadoEm'])") ||
    regraAvaliacao.includes('allow delete: if true')) {
  falhar('avaliação do Portal não fecha escritor, isolamento e soft-delete');
} else provar('cliente avalia no próprio Portal; Firestore limita leitura/escrita ao slug da sessão');

const choqueData = escritorio.slice(escritorio.indexOf('function dataFixaDoItemCalendario'), escritorio.indexOf('/* ===== ALERTAS DE GARGALO'));
if (!choqueData.includes("const avisoId = 'choque_'") || !choqueData.includes('await runTransaction') ||
    choqueData.includes('await criarDemandaSegura') || !choqueData.includes('it.dataPostagem') ||
    !choqueData.includes('it.dataFlexivel===true') || !choqueData.includes("excluido:true") ||
    !choqueData.includes("excluidoPor:'sistema_regra_data_fixa'") || choqueData.includes('Number(it.day)')) {
  falhar('choque ainda usa a grade como data fixa, duplica ou não arquiva alertas antigos por soft-delete');
} else provar('alerta usa somente dataPostagem não flexível, transação determinística e arquiva avisos antigos sem apagar');

const financeiroV54 = escritorio.slice(escritorio.indexOf('let html = `<div class="painelResumo financeiroResumoMes"'), escritorio.indexOf('/* Seção própria de saída'));
if ((financeiroV54.match(/resumoCard/g)||[]).length !== 4 ||
    !financeiroV54.includes('${brl(quitadoMensal)}') ||
    !financeiroV54.includes('Mensalidades pagas em') ||
    !financeiroV54.includes('${brl(totalEntrou)}') ||
    escritorio.includes('📈 Últimos 6 meses (recebido)') || escritorio.includes('⚠️ Concentração de receita')) {
  falhar('Financeiro não está limitado aos quatro indicadores atuais ou voltou a confundir caixa com mensalidades pagas');
} else provar('Financeiro mostra quatro indicadores do mês e separa mensalidades quitadas do caixa da agência');

const campanhasDetectadas = escritorio.slice(escritorio.indexOf('window.detectarCampanhas'), escritorio.indexOf('function montarPipelineCampanhas'));
if (!campanhasDetectadas.includes('it.dataPostagem') || !campanhasDetectadas.includes('dataCampanha') ||
    !escritorio.includes('chavesManuais') || !escritorio.includes('data ainda não definida no calendário')) {
  falhar('quadro de campanhas ainda perde data completa ou duplica a janela do calendário');
} else provar('campanhas preservam data completa, sinalizam ausência e deduplicam sem criar nova fonte');

const progressoEditorialV53 = escritorio.slice(escritorio.indexOf('function progressoEditorialCalendario'), escritorio.indexOf('const MESES_CAL'));
const visaoCalendariosV53 = escritorio.slice(escritorio.indexOf('window.renderVisaoCalendarios = async function'), escritorio.indexOf('/* ===== REFEITA — 28/07/2026'));
if (!progressoEditorialV53.includes('i.excluido!==true') || !visaoCalendariosV53.includes('calendariosCompletos') ||
    !visaoCalendariosV53.includes('Roteiros: ${l.roteiros} de ${l.total} prontos') || visaoCalendariosV53.includes('roteiros preenchidos')) {
  falhar('painel editorial ainda conta arquivados ou apresenta agregado global confuso');
} else provar('painel editorial conta somente itens ativos e explica progresso real por calendário');

finalizar();

function finalizar() {
  console.log('PRE-FLIGHT GET STARTED');
  for (const prova of provas) console.log(`PASS  ${prova}`);
  for (const erro of erros) console.error(`FAIL  ${erro}`);
  console.log(erros.length ? `RESULTADO: FALHOU (${erros.length})` : 'RESULTADO: APROVADO');
  process.exitCode = erros.length ? 1 : 0;
}
