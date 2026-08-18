#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const regras=ler('firestore.rules');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('V81 vídeos externos: '+mensagem); console.log('PASS ',mensagem); }
function trecho(fonte,inicio,fim){ const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return fonte.slice(a,b); }
function deveFalhar(fn,parte){ try{ fn(); }catch(e){ return String(e?.message||e).includes(parte); } return false; }

exigir(escritorio.includes('value="__externo__"')&&escritorio.includes('videoClienteExternoNome'),'Lançar Vídeos oferece trabalho externo com nome explícito');
exigir(escritorio.includes('Não cadastra cliente, contrato, Portal, calendário, mensalidade nem carteira operacional.'),'interface explica que trabalho pontual não cria uma ficha operacional');

const helpers=trecho(escritorio,'function normalizarNomeClienteExternoVideo','  const EDITORES_GERAL');
const ctxHelpers={}; ctxHelpers.window=ctxHelpers; vm.createContext(ctxHelpers); new vm.Script(helpers).runInContext(ctxHelpers);
const idA=ctxHelpers.identidadeClienteExternoVideo('  Evento\u0000  Associação   Comercial  ');
const idA2=ctxHelpers.identidadeClienteExternoVideo('Evento Associação Comercial');
const idB=ctxHelpers.identidadeClienteExternoVideo('Evento Associacao Comercial');
exigir(idA.nome==='Evento Associação Comercial','nome externo remove controles e colapsa espaços sem perder acentos');
exigir(idA.slug.startsWith('externo--')&&idA.slug===idA2.slug,'identidade externa usa namespace reservado e é determinística');
exigir(idA.slug!==idB.slug&&idA.slug!=='evento-associacao-comercial','hash evita colisão entre nomes semelhantes e com slug de cliente real');
exigir(deveFalhar(()=>ctxHelpers.identidadeClienteExternoVideo(' '),'pelo menos 2'),'nome vazio ou curto é recusado');
exigir(deveFalhar(()=>ctxHelpers.identidadeClienteExternoVideo('x'.repeat(81)),'máximo 80'),'nome externo excessivo é recusado');
exigir(ctxHelpers.ehTrabalhoExternoVideo({trabalhoExterno:true})&&ctxHelpers.ehTrabalhoExternoVideo({vinculoCliente:'externo_pontual'})&&ctxHelpers.ehTrabalhoExternoVideo({cliente:idA.slug}),'consumidores reconhecem flags e identidade externa compatível');

const permissao=trecho(escritorio,'const PESSOAS_DE_CAMPO','  /* ===== FRENTE C3');
for(const pessoa of ['Luís','Nathan','Amanda','Chris']) exigir(permissao.includes(`'${pessoa}'`),'papel de '+pessoa+' permanece autorizado a lançar vídeo');
exigir(permissao.includes('function podeLancarVideo')&&permissao.includes('PESSOAS_QUE_LANCAM_VIDEO.includes(pessoa)'),'lançamento continua protegido pela porta única podeLancarVideo');

const popular=trecho(escritorio,'async function popularClientesVideo','  window.alternarClienteExternoVideo = function');
let htmlSelect=''; let alternou=0,renderizouHoje=0;
const selectCarteira={value:'__externo__',options:[]};
Object.defineProperty(selectCarteira,'innerHTML',{get:()=>htmlSelect,set:valor=>{
  htmlSelect=String(valor); selectCarteira.options=[...htmlSelect.matchAll(/value="([^"]+)"/g)].map(m=>({value:m[1]}));
}});
const estadoCarteira={textContent:'',style:{}};
const ctxPopular={console,Set,Array,usuarioAtual:'Amanda',CLIENTES_LISTA:[{slug:'bluefit',nome:'Bluefit'}],EDITORES_SELECIONAVEIS:['Helo'],
  podeLancarVideo:p=>p==='Amanda',carregarClientesExtras:async()=>false,obterSlugsEntregaDireta:async()=>{throw new Error('permission-denied');},
  document:{getElementById:id=>({videoCliente:selectCarteira,videoCarteiraEstado:estadoCarteira,videoEditorEscolhido:{innerHTML:''},videoData:{value:''}}[id]||null)},
  esc:v=>String(v),hojeLocal:()=> '2026-08-18',renderLancadosHoje:async()=>{renderizouHoje++;},limparEstadoVideosPorTrocaDePapel:()=>{},
  window:{alternarClienteExternoVideo:()=>{alternou++;}}
};
vm.createContext(ctxPopular); new vm.Script(popular+'\nglobalThis.apiPopular=popularClientesVideo;').runInContext(ctxPopular);
const carteiraOk=await ctxPopular.apiPopular();
exigir(carteiraOk===false&&htmlSelect.includes('__externo__')&&htmlSelect.includes('bluefit'),'falha de config mantém último retrato e a opção de trabalho pontual');
exigir(estadoCarteira.textContent.includes('não pôde ser confirmada')&&alternou===1&&renderizouHoje===1,'falha de carteira é explícita sem virar estado vazio');

const limpeza=trecho(escritorio,'function limparEstadoVideosPorTrocaDePapel','  window.limparEstadoVideosPorTrocaDePapel');
const idsValor=['videoClienteExternoNome','videoData','videoNomesPrincipais','videoNomesBastidores','videoObs'];
const camposLimpeza=Object.fromEntries(idsValor.map(id=>[id,{value:'segredo'}]));
Object.assign(camposLimpeza,{videoCliente:{replaceChildren(){this.limpo=true;}},videoEditorEscolhido:{innerHTML:'dados'},videoOrigemMaterial:{value:'recebido'},videoClienteExternoBox:{style:{display:'block'}},avisoDataAtrasadaVideo:{style:{display:'block'}},videoCarteiraEstado:{textContent:'dados'},badgeCorrecoes:{textContent:'8',style:{display:'inline'}},btnLancarVideos:{disabled:true,textContent:'enviando'},opGravado:{style:{}},opRecebido:{style:{}},ultimaDistribuicao:{replaceChildren(){this.limpo=true;}},lancadosHojeLista:{replaceChildren(){this.limpo=true;}},videosMeus:{replaceChildren(){this.limpo=true;}},videosFinalizados:{replaceChildren(){this.limpo=true;}}});
const ctxLimpeza={document:{getElementById:id=>camposLimpeza[id]||null,querySelectorAll:()=>[]}};
vm.createContext(ctxLimpeza); new vm.Script(limpeza+'\nglobalThis.apiLimpar=limparEstadoVideosPorTrocaDePapel;').runInContext(ctxLimpeza); ctxLimpeza.apiLimpar();
exigir(idsValor.every(id=>camposLimpeza[id].value==='')&&camposLimpeza.videoCliente.limpo&&camposLimpeza.videosMeus.limpo&&camposLimpeza.videosFinalizados.limpo,'troca/logout limpa campos, links e resultados da Central de Vídeos');

const lancar=trecho(escritorio,'window.lancarVideos = async function()','  /* ===== O QUE ENTREGAR');
exigir(lancar.includes("identidadeClienteExternoVideo(document.getElementById('videoClienteExternoNome')?.value)"),'lançamento deriva nome e identidade pelo normalizador seguro');
exigir(lancar.includes("trabalhoExterno: true")&&lancar.includes("vinculoCliente: 'externo_pontual'")&&lancar.includes('clienteExternoNome: clienteNome'),'documento do vídeo carrega classificação e nome externo explícitos');
exigir(lancar.includes("origemMaterial, soEdicao: origemMaterial === 'recebido'")&&lancar.includes("origemMaterial === 'recebido' ? '✂️ ' : ''"),'gravação própria e material recebido mantêm semânticas distintas');
exigir(lancar.includes('const editor = ehGestao ?')&&lancar.includes("usuarioAtual === 'Amanda' || usuarioAtual === 'Chris'")&&lancar.includes("const sugerido = ehGestao ? editor : (editorManual || '')"),'gestão atribui e filmmaker envia para distribuição sem apropriar editor');
exigir(lancar.includes('decidirEditor(clienteSlug, trabalhoExterno)'),'trabalho externo ignora afinidade histórica na distribuição automática');
exigir((lancar.match(/addDoc\(collection\(db,'videos_producao'\)/g)||[]).length===1,'lançamento possui um único escritor, em videos_producao');
for(const colecao of ['clientes_extras','clientes_config','cadastros_clientes','contratos_cliente','pagamentos_mensais','clientes_acesso','calendarios']){
  exigir(!lancar.includes(`collection(db,'${colecao}')`)&&!lancar.includes(`doc(db,'${colecao}'`),'lançamento externo não lê/escreve '+colecao);
}
exigir(lancar.includes("if(String(v.cliente||'') !== clienteSlug) return;"),'trava de repetição compara somente a mesma identidade segura');

function contextoLancamento(usuario,origem,{externo=true,editorManual=''}={}){
  const gravados=[]; let avisos=0,decisoes=0;
  const campos={
    videoCliente:{value:externo?'__externo__':'bluefit',selectedOptions:[{dataset:{nome:'Bluefit'}}]},
    videoClienteExternoNome:{value:'Evento Associação Comercial'},videoOrigemMaterial:{value:origem},
    videoData:{value:'2026-08-18'},videoObs:{value:'teste pontual'},videoEditorEscolhido:{value:editorManual},
    videoNomesPrincipais:{value:'Vídeo institucional'},videoNomesBastidores:{value:''},
    btnLancarVideos:{disabled:false,textContent:'Registrar e distribuir'},ultimaDistribuicao:{innerHTML:''}
  };
  const contexto={window:{},console,Date,Math,Intl,
    usuarioAtual:usuario,db:{},
    document:{getElementById:id=>campos[id]||null},
    podeLancarVideo:p=>['Luís','Nathan','Amanda','Chris'].includes(p),
    mostrarToast:()=>{},hojeLocal:()=> '2026-08-18',confirm:()=>true,
    collection:(_db,nome)=>({nome}),getDocs:async()=>({forEach:()=>{}}),
    addDoc:async(ref,dados)=>{gravados.push({colecao:ref.nome,dados});return {id:'video-'+gravados.length};},
    serverTimestamp:()=>({mock:true}),
    decidirEditor:async(_slug,ignorar)=>{decisoes++; exigir(ignorar===externo,'distribuição automática recebe a classificação externa correta');return 'Helo';},
    registrarLogAutomacao:()=>{},criarAvisoParaGestao:async()=>{avisos++;},
    dispararEmailIndividual:async()=>{},popularClientesVideo:async()=>{},renderLancadosHoje:async()=>{},
    esc:v=>String(v??''),setTimeout
  };
  contexto.window=contexto;
  vm.createContext(contexto);
  new vm.Script(helpers+'\n'+lancar).runInContext(contexto);
  return {contexto,campos,gravados,avisos:()=>avisos,decisoes:()=>decisoes};
}

for(const [usuario,origem,editorManual] of [['Luís','gravado','Helo'],['Nathan','recebido','Cecília'],['Amanda','recebido','João Victor'],['Chris','gravado','']]){
  const teste=contextoLancamento(usuario,origem,{editorManual});
  await teste.contexto.lancarVideos();
  exigir(teste.gravados.length===1&&teste.gravados[0].colecao==='videos_producao',usuario+' cria somente um registro de vídeo');
  const v=teste.gravados[0].dados;
  exigir(v.cliente.startsWith('externo--')&&v.clienteNome==='Evento Associação Comercial'&&v.trabalhoExterno===true&&v.vinculoCliente==='externo_pontual',usuario+' preserva identidade e nome externo no próprio vídeo');
  exigir(v.origemMaterial===origem&&v.soEdicao===(origem==='recebido'),usuario+' preserva a origem do material');
  exigir(['Amanda','Chris'].includes(usuario)?!!v.editorAtribuido:(!v.editorAtribuido&&teste.avisos()===1),usuario+' respeita a distribuição do papel');
}

const normal=contextoLancamento('Amanda','gravado',{externo:false,editorManual:'Helo'});
await normal.contexto.lancarVideos();
const normalVideo=normal.gravados[0].dados;
exigir(normalVideo.cliente==='bluefit'&&normalVideo.clienteNome==='Bluefit'&&!('trabalhoExterno' in normalVideo),'caminho de cliente cadastrado permanece sem flags externas');

const nucleo=trecho(escritorio,'async function confirmarAprovacaoClienteCore','  window.marcarClienteAprovouVideo');
let leiturasConfig=0,criacaoPostagem=0,transacoes=0,patchFinal=null;
const ctxCore={console,db:{},
  doc:(_db,colecao,id)=>({colecao,id}),
  getDoc:async()=>({exists:()=>true,data:()=>({cliente:idA.slug,clienteNome:idA.nome,titulo:idA.nome+' — Vídeo institucional',trabalhoExterno:true,vinculoCliente:'externo_pontual'})}),
  updateDoc:async(_ref,patch)=>{patchFinal=patch;},
  obterConfigCliente:async()=>{leiturasConfig++;return {tipoEntrega:'postagem_completa'};},
  ehTrabalhoExternoVideo:v=>ctxHelpers.ehTrabalhoExternoVideo(v),ehVideoDeTrafego:()=>false,ehClienteSoEdicao:()=>false,
  registrarHistorico:()=>{},registrarLogAutomacao:()=>{},
  localizarPostagemExistenteDoVideo:async()=>{criacaoPostagem++;return null;},
  collection:()=>{criacaoPostagem++;return {};},query:()=>{},where:()=>{},getDocs:async()=>({docs:[]}),
  runTransaction:async()=>{transacoes++;},serverTimestamp:()=>({})
};
vm.createContext(ctxCore); new vm.Script(nucleo+'\nglobalThis.apiCore=confirmarAprovacaoClienteCore;').runInContext(ctxCore);
const resultadoCore=await ctxCore.apiCore('video-externo','Amanda');
exigir(resultadoCore==='finalizado'&&patchFinal?.status==='finalizado'&&patchFinal?.finalizadoVia==='trabalho_externo','aprovação do cliente finaliza trabalho externo pela rota própria');
exigir(leiturasConfig===0&&criacaoPostagem===0&&transacoes===0,'aprovação externa não consulta clientes_config nem cria postagem/transação de calendário');

const reatribuir=trecho(escritorio,'window.reatribuirVideo = async function','  let editorFuncionarioAtual');
exigir(reatribuir.includes("if(!['Chris','Amanda'].includes(usuarioAtual))")&&reatribuir.includes('trabalhoExterno = ehTrabalhoExternoVideo(v)')&&reatribuir.indexOf('if(trabalhoExterno)')<reatribuir.indexOf("doc(db, 'editores_afinidade'"),'reatribuição é da gestão e externa termina antes de criar afinidade');
const conciliador=trecho(escritorio,'async function conciliarPostagensOrfas','  /* ===== CONCILIADOR 2');
exigir(conciliador.includes('const ehExternoConc = ehTrabalhoExternoVideo(v)')&&conciliador.includes('if(ehExternoConc) continue;')&&conciliador.indexOf('if(ehExternoConc) continue;')<conciliador.indexOf('if(videoIdsComPostagem.has(docSnap.id))'),'conciliador classifica externo antes do short-circuit por postagem');
exigir(conciliador.indexOf('if(ehExternoConc) continue;')<conciliador.indexOf("addDoc(collection(db,'postagens')"),'conciliador nunca cria postagem para trabalho pontual');
const tacitas=trecho(escritorio,'async function confirmarAprovacoesTacitas','  function gerarDicaMelhoria');
exigir(tacitas.includes('if(ehTrabalhoExternoVideo(v)) continue;'),'trabalho pontual não depende de aprovação tácita/configuração de cliente');
const finalizados=trecho(escritorio,'async function renderEntregasFinalizadas','  async function contarAbertosPorEditor');
exigir(finalizados.includes('chaveIdentidadeVideo(v)')&&finalizados.includes('🧰 Trabalho pontual —'),'Entregas Finalizadas agrupa pontual pela identidade, não somente pelo nome');

const arquivo=trecho(escritorio,'async function popularClientesArquivoEntregas','  /* ===== VARREDURA DE CLIENTES SEM TIPO');
exigir(arquivo.includes('__pontuais__')&&arquivo.includes("status: trabalhoPontual ? 'trabalho_pontual' : 'entrega_direta'")&&arquivo.includes("filter(r=>r.trabalhoExterno!==true && r.cliente)"),'Arquivo separa pontuais do filtro e contador de clientes');
const esteira=trecho(escritorio,'function renderEsteiraConteudo','  async function renderStatusCompletoPipeline');
exigir(esteira.includes('porTrabalhoPontual')&&esteira.includes('Finalizados (trabalhos pontuais)')&&esteira.includes('postagensPontuaisResiduais'),'Esteira separa pontuais e não contamina contadores de postagem/cliente');
const whatsapp=trecho(escritorio,'window.cobrarClienteWhatsApp = async function','  window.renderGerenciaVideos');
exigir(whatsapp.includes("String(clienteSlug||'').startsWith('externo--')")&&whatsapp.indexOf('if(trabalhoExterno)')<whatsapp.indexOf('numeroCobrancaConfirmado(clienteSlug)'),'confirmação pontual, mesmo sem cache, termina antes da consulta financeira');

const domPapel=trecho(escritorio,'const __sidebarExclusivos','  function esc(s)');
exigir(domPapel.includes("'navVideos','view-videos'")&&domPapel.includes("definirItemExclusivoNoDOM('view-videos',papelPodeAbrirVideos(usuarioAtual))"),'view e menu de Vídeos saem do DOM de Gabi/Yas');
const rota=trecho(escritorio,"const VIEWS_SO_CHRIS","if(nome !== 'calendarios')");
exigir(rota.includes("if(nome === 'videos' && !papelPodeAbrirVideos(usuarioAtual))"),'rota direta da Central de Vídeos possui porta por papel');
const troca=trecho(escritorio,'window.mudarUsuarioGlobal = async function','  ultimoRegistroAtividade = 0');
exigir(troca.indexOf('limparEstadoVideosPorTrocaDePapel();')<troca.indexOf('usuarioAtual = escolhido;'),'troca de papel limpa vídeo antes de aplicar a nova identidade');
const ocultos=trecho(escritorio,'const ITENS_OCULTOS_POR_PESSOA','  window.itemOcultoPara');
exigir(!/['"]Chris['"]\s*:\s*\[[^\]]*navVideos/.test(ocultos),'Chris mantém porta visível para Vídeos');

const helperRegra=trecho(regras,'function podeLancarVideoProducao','    function podePrepararLinkCalendario');
for(const email of ['christopherveloso0@gmail.com','amandachamorrosm@gmail.com','luissouza280507@gmail.com','nathanocosta652@gmail.com']) exigir(helperRegra.includes(email),'rules CREATE preserva lançador '+email);
for(const email of ['heloisaksc@gmail.com','vitoriaboaron215@gmail.com','victorvieiraj814@gmail.com']) exigir(helperRegra.includes(email),'rules UPDATE preserva editor '+email);
exigir(!helperRegra.includes('gabrielleromaomarketing@gmail.com')&&!helperRegra.includes('yasmocelin@gmail.com'),'rules de vídeo excluem Gabi/Yas das mutações');
const regraVideos=trecho(regras,'match /videos_producao/{docId}','match /postagens/{docId}');
exigir(regraVideos.includes('allow create: if podeLancarVideoProducao()')&&regraVideos.includes('allow update: if podeOperarVideoProducao() || meuDocPermaneceMeu()')&&regraVideos.includes('allow delete: if false'),'rules alinham criação/operação aos papéis e mantêm exclusão física proibida');

const blocos=[...escritorio.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
for(const bloco of blocos){ if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]); else new vm.Script(bloco[2]); }
exigir(true,'JavaScript inline do Escritório compila após a mudança');

console.log(`RESULTADO: APROVADO (${total} asserções V81 vídeos externos)`);
