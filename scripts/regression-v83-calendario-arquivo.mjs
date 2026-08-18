import fs from 'node:fs';

const ler = nome => fs.readFileSync(new URL('../'+nome, import.meta.url), 'utf8');
const escritorio = ler('escritorio.html');
const calendario = ler('calendario.html');
const calendarios = ler('calendarios.html');
let ok = 0;
function exigir(condicao, mensagem){
  if(!condicao) throw new Error('FALHOU: '+mensagem);
  ok++;
}
function trecho(fonte, inicio, fim){
  const a=fonte.indexOf(inicio), b=fonte.indexOf(fim,a+inicio.length);
  exigir(a>=0&&b>a, 'trecho '+inicio+' existe');
  return fonte.slice(a,b);
}

exigir(calendario===calendarios, 'os dois enderecos do calendario permanecem byte a byte identicos');

const preparar=trecho(escritorio,'async function prepararLinkCalendarioEquipe','  function resolverMesParaLinkCalendario');
exigir(preparar.includes("'&mes='+encodeURIComponent(mes)"),'link interno preserva a competencia solicitada');
exigir(preparar.includes("'https://get-started.agency/escritorio.html?calArquivo='"),'mes historico volta ao Escritorio autenticado, sem chave anonima');
exigir(preparar.includes("getDoc(doc(db,'calendarios',slugDocumento))"),'link historico confirma o documento antes de copiar');
exigir(preparar.includes('itensDoMesCalendario'),'link historico confirma que o mes existe sem tratar erro como vazio');
exigir(!preparar.includes("'&arquivo=1'"),'link historico nao amplia a validade de token antigo');

const abrir=trecho(escritorio,'async function abrirCalendarioArquivoInterno','  window.abrirCalendarioArquivoInterno');
exigir(abrir.includes("getDoc(doc(db,'calendarios',slugDocumento))"),'arquivo faz leitura pontual depois do login da equipe');
exigir(abrir.includes('itensDoMesCalendario'),'arquivo recorta somente a competencia pedida');
exigir(abrir.includes("usuarioAtual"),'arquivo exige identidade da equipe ja confirmada');
exigir(!abrir.includes('setDoc(')&&!abrir.includes('updateDoc(')&&!abrir.includes('runTransaction('),'arquivo nao possui caminho de escrita');
exigir(escritorio.includes('Arquivo interno · somente leitura'),'tela distingue arquivo de editor operacional');
exigir(escritorio.includes("await etapaSegura('abrir link de calendario historico'"),'deep link e processado somente depois do login seguro');

exigir(escritorio.includes("copiarLinkCalendarioEquipe('${escJs(c.slug)}',this,document.getElementById('mesLinkCal_"),'tela permite copiar o mes escolhido para a equipe');

console.log(`REGRESSAO V83 CALENDARIO ARQUIVO: OK (${ok} verificacoes)`);
