#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const portal=fs.readFileSync(path.join(raiz,'portal-cliente.html'),'utf8');
let total=0;
function ok(cond,mensagem){ total++; if(!cond) throw new Error('V74: '+mensagem); }
function trecho(texto,inicio,fim){ const a=texto.indexOf(inicio),b=texto.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('V74: trecho ausente '+inicio); return texto.slice(a,b); }
function executar(codigo,exportacao){ const ctx={window:{}}; ctx.window=ctx; vm.createContext(ctx); vm.runInContext(codigo+'\n'+exportacao,ctx); return ctx.api; }

const identidadeFonte=trecho(escritorio,'const APELIDOS_DE_CONTRATO','  function mapaCalendariosPorIdentidade');
const identidade=executar(identidadeFonte,'globalThis.api={slugClienteCanonico,nomeClienteCanonico,consolidarClientesAtivosPorIdentidade,whatsappCobrancaPorIdentidade};');
ok(identidade.slugClienteCanonico('emanuelle')==='emanuelle-bernaski-nutri','Emanuelle legada não converge para o cadastro canônico existente');
ok(['hitech','cliente-rodrigo','rodrigo'].every(s=>identidade.slugClienteCanonico(s)==='rodrigo'),'Hitech/Cliente Rodrigo não convergem para Rodrigo');
ok(identidade.slugClienteCanonico('zeens')==='zeiss','alias financeiro da Zeiss foi perdido');
const configs={hitech:{whatsappCobranca:'5541999999999'},zeens:{whatsappCobranca:'5541888888888'},'emanuelle-bernaski-nutri':{whatsappCobranca:'5541777777777'}};
ok(identidade.whatsappCobrancaPorIdentidade(configs,'cliente-rodrigo')==='5541999999999','contato de alias não chega à identidade Rodrigo');
ok(identidade.whatsappCobrancaPorIdentidade(configs,'zeiss')==='5541888888888','contato legado da Zeiss não chega à identidade canônica');
const consolidados=identidade.consolidarClientesAtivosPorIdentidade([
  {slug:'emanuelle',nome:'Emanuelle',origem:'legado',telefone:''},
  {slug:'emanuelle-bernaski-nutri',nome:'Emanuelle Bernaski nutri',cadastroId:'cad',whatsappCobranca:'5541777777777'},
  {slug:'hitech',nome:'Hitech',whatsappCobranca:'5541999999999'},
  {slug:'cliente-rodrigo',nome:'Cliente Rodrigo'},
  {slug:'rodrigo',nome:'Rodrigo'}
]);
ok(consolidados.length===2,'aliases ainda geram cartões/cadastros operacionais duplicados');
ok(consolidados.find(v=>v.slug==='emanuelle-bernaski-nutri')?.whatsappCobranca==='5541777777777','consolidação apagou telefone da Emanuelle canônica');
ok(consolidados.find(v=>v.slug==='rodrigo')?.whatsappCobranca==='5541999999999','consolidação apagou telefone de Rodrigo/Hitech');
ok(!trecho(escritorio,'function consolidarClientesAtivosPorIdentidade','  window.nomeClienteCanonico').match(/(?:setDoc|addDoc|updateDoc|runTransaction)\s*\(/),'consolidação de leitura passou a gravar ou criar cliente');

const postagemFonte=trecho(escritorio,'const ORDEM_STATUS_POSTAGEM','  async function localizarPostagemExistenteDoVideo');
const postagem=executar(postagemFonte,'globalThis.api={escolherPostagemCanonicaPorVideo,idPostagemDeterministicaDoVideo};');
ok(postagem.idPostagemDeterministicaDoVideo('abc/123')==='video_abc_123','ID de postagem por vídeo não é determinístico/seguro');
ok(postagem.escolherPostagemCanonicaPorVideo([
  {id:'antiga',status:'aguardando_legenda',criadoEm:'2026-08-10'},
  {id:'avancada',status:'aguardando_agendamento',criadoEm:'2026-08-11'}
],'antiga').id==='avancada','postagem atrasada vence uma cópia que já avançou');
ok(postagem.escolherPostagemCanonicaPorVideo([
  {id:'primeira',status:'aguardando_legenda',criadoEm:'2026-08-10'},
  {id:'segunda',status:'aguardando_legenda',criadoEm:'2026-08-11'}
]).id==='primeira','empate de duplicatas não escolhe a origem mais antiga de forma estável');

const aprovacao=trecho(escritorio,'async function confirmarAprovacaoClienteCore','  window.marcarClienteAprovouVideo');
ok(!aprovacao.includes("addDoc(collection(db,'postagens')"),'aprovação ainda cria postagem aleatória por clique');
ok(aprovacao.includes('localizarPostagemExistenteDoVideo')&&aprovacao.includes('idPostagemDeterministicaDoVideo')&&aprovacao.includes('runTransaction'),'aprovação não reutiliza legado e não cria a nova postagem atomicamente');
ok(aprovacao.includes('postagemId:existente.id')&&aprovacao.includes('postagemId:postagemRef.id'),'vídeo não guarda a postagem canônica escolhida');
ok(aprovacao.indexOf('const reciboPostagem=await getDoc(postagemRef)')<aprovacao.indexOf("return postagemRef.id"),'aprovação declara sucesso antes do recibo da postagem');

const fila=trecho(escritorio,'async function consolidarFilaLegendaConfirmada','  async function renderLegendasPendentes');
ok(fila.includes("where('videoId','in',lote)")&&fila.includes('escolherPostagemCanonicaPorVideo'),'fila da Gabi não compara duplicatas do mesmo vídeo em outras etapas');
ok(fila.includes("escolhida?.status==='aguardando_legenda'"),'postagem já avançada ainda pode reaparecer com a Gabi');
const salvar=trecho(escritorio,'window.salvarLegenda = async function','  /* ===================================================================');
ok(salvar.indexOf('__salvandoLegendas.add(id)')<salvar.indexOf('await getDoc(postagemRef)'),'trava de duplo clique nasce depois da primeira espera');
ok(salvar.includes('await runTransaction')&&salvar.includes("atual.status!=='aguardando_legenda'")&&salvar.includes('não será regredida'),'salvar legenda não revalida a etapa nem bloqueia regressão');
ok(salvar.includes('const recibo=await getDoc(postagemRef)')&&salvar.includes("recibo.data().status!=='aguardando_agendamento'"),'toast da Cecília não depende do recibo da transição');

const referenciaFonte=trecho(portal,'function hashReferenciaCliente','  window.enviarReferenciaCliente = async function');
const referencia=executar(referenciaFonte,'globalThis.api={idReferenciaClienteDeterministico,referenciaClienteConfirmada};');
const dadosRef={cliente:'cliente-teste',link:'https://exemplo.test/ref',imagemCapa:'',descricao:'Teste',observacoes:'Obs'};
const refId=referencia.idReferenciaClienteDeterministico(dadosRef);
ok(refId===referencia.idReferenciaClienteDeterministico({...dadosRef}),'retentativa da mesma referência muda o ID');
ok(refId!==referencia.idReferenciaClienteDeterministico({...dadosRef,descricao:'Outro'}),'conteúdo diferente colide no mesmo ID de referência');
ok(referencia.referenciaClienteConfirmada({id:refId,exists:()=>true,data:()=>({...dadosRef,status:'nao_utilizada',criadoPorTipo:'cliente'})},refId,dadosRef),'recibo válido de referência foi recusado');
ok(!referencia.referenciaClienteConfirmada({id:refId,exists:()=>true,data:()=>({...dadosRef,status:'utilizada',criadoPorTipo:'cliente'})},refId,dadosRef),'recibo com estado divergente foi aceito');
const envioRef=trecho(portal,'window.enviarReferenciaCliente = async function','  window.aprovarReferenciaCliente');
ok(!envioRef.includes('addDoc(')&&envioRef.includes('runTransaction')&&envioRef.includes('const recibo=await getDoc(referenciaRef)'),'referência do Portal ainda usa escrita sem unicidade/recibo');
ok(envioRef.indexOf('__enviandoReferenciaCliente=true')<envioRef.indexOf('await runTransaction'),'trava da referência nasce depois da escrita');
ok(envioRef.includes('if(criada)')&&envioRef.includes('apenas o aviso para a equipe falhou'),'falha do aviso ainda pode induzir reenvio da referência já confirmada');
ok(escritorio.includes("getDocs(collection(db,'referencias_cliente'))")&&escritorio.includes('O cliente mandou'),'Hub interno não lê diretamente as referências do Portal');

const copiaCliente=trecho(escritorio,'window.copiarLinkCalendarioDireto = async function','  window.abrirLinkCliente');
const copiaEquipe=trecho(escritorio,'window.copiarLinkCalendarioEquipe = async function','  window.copiarLinkCalendarioDireto');
const clipboard=trecho(escritorio,'function copiarTextoLegado','  async function prepararLinkCalendarioEquipe');
ok(copiaCliente.indexOf('copiarTextoPreparadoDuranteClique')<copiaCliente.indexOf('await copia'),'link do cliente perde o gesto antes de preparar a cópia');
ok(copiaEquipe.indexOf('copiarTextoPreparadoDuranteClique')<copiaEquipe.indexOf('await copia'),'link interno perde o gesto antes de preparar a cópia');
ok(clipboard.includes('ClipboardItem')&&clipboard.includes("document.execCommand('copy')")&&clipboard.includes("window.prompt('Seu navegador bloqueou"),'cópia não possui cadeias moderna, legada e manual');
const prepararLink=trecho(escritorio,'async function prepararLinkCalendarioCliente','  window.prepararLinkCalendarioCliente');
ok(prepararLink.includes("estado!=='liberado'&&estado!=='aprovado_interno'")&&prepararLink.includes("if(estado!=='aprovado_interno')")&&
  prepararLink.includes("status:'liberado',mes")&&prepararLink.includes("'&mes='+encodeURIComponent(mes)"),'fallback de cópia perdeu a validação/competência mensal');

ok(portal.includes("const CLIENTES_SO_EDICAO = ['rodrigo','hitech','cliente-rodrigo']"),'Portal pode liberar áreas indevidas em alias de Rodrigo/Hitech');

console.log(`RESULTADO: APROVADO (${total} asserções V74)`);
