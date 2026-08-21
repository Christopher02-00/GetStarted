#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonte = fs.readFileSync(path.join(raiz, 'escritorio.html'), 'utf8');
const estilosReais = [...fonte.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
const diretorioEvidencias = String(process.env.GET_V100_EVIDENCE_DIR || '').trim();
if(diretorioEvidencias) fs.mkdirSync(diretorioEvidencias, { recursive:true });
let total = 0;
const falhas = [];

function exigir(condicao, mensagem){
  total++;
  if(!condicao){
    falhas.push(mensagem);
    console.error('FAIL ', mensagem);
    return false;
  }
  console.log('PASS ', mensagem);
  return true;
}

function trecho(inicio, fim){
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) throw new Error('V100 UI REGISTRO AUTÔNOMO: trecho real ausente: ' + inicio);
  return fonte.slice(a, b);
}

/* O navegador executa as funções reais extraídas do HTML. Os substitutos
   abaixo limitam-se a DOM, relógio e leituras Firestore sintéticas; nenhuma
   regra paralela decide se o filmmaker pode registrar ou se o checklist é
   utilizável. Uma renomeação ou remoção do código entregue quebra o ensaio. */
const funcaoContador = trecho('  window.atualizarContadorVideos = function', '  /* ===== AGENDA DE REUNIÕES');
const funcoesEquipe = trecho('  function equipeDoAgendamento', '  function garantirLinhaEquipe');
const funcoesBlocos = trecho('  function itemNaoPrecisaGravar', '  /* ===== GRADE DE POSTAGENS');
const funcoesSessaoEAgenda = trecho('  function itensDoMesComIndiceGlobal', '  async function popularFiltroClientesCalendario');
const funcoesControle = trecho('  function calcularLinhasControleGravacoes', '  window.filtrarControleGravacoes');
const funcaoPrepararMateriais = trecho('  function prepararMateriaisDeclaradosSessao', '  async function registrarGravacaoRealizadaNucleo');

exigir(fonte.includes('sem esperar Amanda ou Cecília organizar a pauta'), 'HTML explica que a ordem vazia não exige Amanda/Cecília');
exigir(fonte.includes('O envio não depende de organização prévia da Amanda ou da Cecília.'), 'HTML explicita o registro autônomo do filmmaker');
exigir(!fonte.includes('Amanda ou Cecília precisa planejar a ordem'), 'mensagem antiga de bloqueio pré-upload foi removida');
exigir(fonte.includes("calendarItemIdx:null, calendarItemId:null, calendarClienteSlug:null"), 'declaração manual nasce sem vínculo de calendário');

const baseSessao = {
  id:'ag-place-sintetica',
  cliente:'place-sintetica',
  clienteSlug:'place-sintetica',
  clienteNome:'Place Sintética',
  data:'2026-08-20',
  hora:'15:00',
  status:'agendado',
  aprovado:true,
  filmmaker:'Luís',
  equipe:[{ nome:'Luís', papel:'Filmmaker' }],
  mesCalendario:'2026-08',
  sessaoOrdem:2,
  bloco:2,
  sessaoChave:'place-sintetica|2026-08|S02',
  qtdVideosPlanejados:5
};

const itensCalendario = [
  { itemId:'item-sintetico-a', mes:'2026-08', day:12, bloco:2, apr:true, name:'Depoimento sintético' },
  { itemId:'item-sintetico-b', mes:'2026-08', day:15, bloco:2, apr:true, name:'Bastidores sintéticos' },
  { itemId:'item-sintetico-outra-sessao', mes:'2026-08', day:4, bloco:1, apr:true, name:'Item sintético de outra sessão' }
];

const calendarioSintetico = {
  client:'Place Sintética',
  month:'Agosto 2026',
  items:itensCalendario,
  blocosPorMes:{ '2026-08':2 },
  aprovacaoMeses:{ '2026-08':{ status:'liberado', mes:'2026-08' } }
};

const snapshotExato = itensCalendario.slice(0, 2).map((item, indice) => ({
  idx:indice,
  itemId:item.itemId,
  nome:item.name,
  ordem:indice + 1,
  grupo:'fazerHoje',
  vinculo:'manual'
}));

const cenarios = {
  modernoVazio:{
    agenda:{ ...baseSessao, id:'ag-moderno-vazio', sessaoPlanejamentoVersao:1, sessaoItensPlanejados:[] },
    calendario:calendarioSintetico
  },
  semCalendario:{
    agenda:{ ...baseSessao, id:'ag-sem-calendario', sessaoPlanejamentoVersao:2, sessaoRegistroModo:'calendario_opcional' },
    calendario:null
  },
  erroCalendario:{
    agenda:{ ...baseSessao, id:'ag-erro-calendario', sessaoPlanejamentoVersao:2, sessaoRegistroModo:'calendario_opcional' },
    calendario:calendarioSintetico,
    falharCalendario:true
  },
  inconsistente:{
    agenda:{
      ...baseSessao,
      id:'ag-inconsistente',
      sessaoPlanejamentoVersao:1,
      sessaoItensPlanejados:[{ idx:0, itemId:'item-removido-sintetico', nome:'Título anterior sintético', ordem:1, grupo:'fazerHoje', vinculo:'manual' }]
    },
    calendario:calendarioSintetico
  },
  checklistExato:{
    agenda:{ ...baseSessao, id:'ag-checklist-exato', sessaoPlanejamentoVersao:1, sessaoItensPlanejados:snapshotExato },
    calendario:calendarioSintetico
  }
};

const navegador = await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});

function rotuloViewport(viewport){
  return viewport.width <= 390 ? 'mobile' : 'desktop';
}

async function salvarEvidencia(page, nome){
  if(!diretorioEvidencias) return;
  await page.screenshot({ path:path.join(diretorioEvidencias,nome), fullPage:true });
}

async function criarPagina(viewport){
  const page = await navegador.newPage({ viewport });
  const errosPagina = [];
  page.on('pageerror', erro => errosPagina.push(String(erro)));
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    ${estilosReais}
    html,body{margin:0;max-width:100%;overflow-x:clip;background:var(--bg,#202124);color:var(--fg,#f3f3f1)}
    body{padding:54px 18px 18px}.fixtureMarca{position:fixed;z-index:9999;top:8px;left:8px;right:8px;max-width:1080px;margin:0 auto;color:var(--yellow,#ffbc13);background:#171719;border:1px solid var(--yellow,#ffbc13);border-radius:8px;padding:8px 10px;font:900 11px/1.4 system-ui;letter-spacing:.08em}
    .fixtureShell{width:100%;max-width:1080px;margin:0 auto}.fixtureShell>section{width:100%;min-width:0}
    @media(max-width:600px){body{padding:66px 8px 8px}.fixtureMarca{font-size:9px}.fixtureShell{max-width:100%}.row2{grid-template-columns:1fr!important}.btnrow>*{max-width:100%}}
  </style></head><body>
    <div class="fixtureMarca">FIXTURE SINTÉTICA V100 · PLACE SINTÉTICA · SEM DADOS REAIS</div>
    <main class="fixtureShell">
      <section id="agendamentoMinhaAgenda"></section>
      <section id="agendamentoControleGravacoes"></section>
    </main>
  </body></html>`);

  const suporte = `
    var PESSOAS_DE_CAMPO=['Luís','Nathan'];
    var CAMPO_MAIS_CHRIS=['Chris',...PESSOAS_DE_CAMPO];
    var EDITORES_SELECIONAVEIS=['Editor Sintético'];
    var CLIENTES_LISTA=[{slug:'place-sintetica',nome:'Place Sintética'}];
    var BLOCOS_PADRAO=2, BLOCOS_MAX=3;
    var usuarioAtual='Luís';
    var __cacheTempoRealPronto={agendamentos:true};
    var cacheAgendamentos=[];
    var __fixtureCalendarios={};
    var __fixtureFalhas=new Set();
    var __acoes=[];
    var db={};
    window.__voltarControleGravacoes=false;
    function collection(_db,nome){return {colecao:nome};}
    function doc(_db,colecao,id){return {colecao,id};}
    async function getDocs(){throw new Error('getDocs não deve ser chamado: o harness usa cache sintético.');}
    async function getDoc(ref){
      if(ref.colecao!=='calendarios') throw new Error('Leitura não prevista no harness: '+String(ref.colecao));
      if(__fixtureFalhas.has(ref.id)) throw new Error('falha-sintetica-calendario');
      const dados=__fixtureCalendarios[ref.id];
      return {exists:()=>!!dados,data:()=>dados?structuredClone(dados):undefined};
    }
    async function etapaSegura(_nome,fn){return await fn();}
    async function obterRefsPerfilCompartilhadas(){return [];}
    async function htmlAgendaReunioes(){return '';}
    function hojeLocal(){return '2026-08-21';}
    function formatarDataBR(dataISO){const [a,m,d]=String(dataISO||'').slice(0,10).split('-');return a&&m&&d?d+'/'+m+'/'+a:String(dataISO||'');}
    function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function escAttr(s){return esc(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
    function escJs(s){return String(s??'');}
    function mesDoTextoConf(){return '';}
    function estadoMesCal(cal,mes){return cal?.aprovacaoMeses?.[mes]?.status||'liberado';}
    function mesDoItemCalendario(_cal,item){return item?.mes||'';}
    function itensDoMesCalendario(cal,mes){return (cal?.items||[]).filter(item=>!mes||mesDoItemCalendario(cal,item)===mes);}
    function mesesDeCalendario(cal){return [...new Set((cal?.items||[]).map(item=>mesDoItemCalendario(cal,item)).filter(Boolean))].sort();}
    function nomeDeSlugSeguro(slug){return String(slug||'').replace(/[-_]+/g,' ').replace(/(^|\\s)\\S/g,m=>m.toUpperCase());}
    function trocarFilmmakerAgendamento(){}
    function toggleFormGravacao(){}
    function toggleFaixaDemandas(){}
    function setAgendamentoSub(){}
    function reagendarGravacao(){}
    function cancelarGravacaoAgendada(){}
    function registrarGravacaoRealizada(){}
    function renderMinhaAgendaFilmmakerAcao(){return window.renderMinhaAgendaFilmmaker();}
    function replanejarSessaoGravacao(id){__acoes.push({acao:'replanejar',id});}
    function abrirCalendarioDeCliente(slug,nome){__acoes.push({acao:'calendario',slug,nome});}
    function abrirConciliacaoGravacaoAntiga(){}
  `;
  await page.addScriptTag({
    content:[suporte, funcaoContador, funcoesEquipe, funcoesBlocos, funcoesSessaoEAgenda, funcoesControle, funcaoPrepararMateriais].join('\n')
  });
  const carregadas = await page.evaluate(() => ({
    agenda:typeof window.renderMinhaAgendaFilmmaker,
    controle:typeof window.renderControleGravacoes,
    contador:typeof window.atualizarContadorVideos,
    materiais:typeof window.prepararMateriaisDeclaradosSessao
  }));
  exigir(Object.values(carregadas).every(tipo=>tipo==='function'), `${rotuloViewport(viewport)}: funções reais carregam no VM do navegador`);
  return { page, errosPagina };
}

async function renderizarAgenda(page, papel, cenario){
  await page.evaluate(({ papel, cenario }) => {
    usuarioAtual = papel;
    cacheAgendamentos = [structuredClone(cenario.agenda)];
    __fixtureCalendarios = cenario.calendario ? { [cenario.agenda.clienteSlug]:structuredClone(cenario.calendario) } : {};
    __fixtureFalhas = new Set(cenario.falharCalendario ? [cenario.agenda.clienteSlug] : []);
    document.getElementById('agendamentoMinhaAgenda').replaceChildren();
    document.getElementById('agendamentoControleGravacoes')?.replaceChildren();
  }, { papel, cenario });
  await page.evaluate(async () => { await window.renderMinhaAgendaFilmmaker(); });
}

async function semOverflow(page, rotulo){
  const largura = await page.evaluate(() => ({
    scroll:document.documentElement.scrollWidth,
    cliente:document.documentElement.clientWidth
  }));
  exigir(largura.scroll <= largura.cliente + 1, `${rotulo}: interface não cria rolagem horizontal`);
}

async function executarViewport(viewport){
  const vp = rotuloViewport(viewport);
  const { page, errosPagina } = await criarPagina(viewport);
  try{
    await renderizarAgenda(page, 'Luís', cenarios.modernoVazio);
    const formVazio = page.locator('#formGrav_ag-moderno-vazio');
    const textoVazio = await formVazio.innerText();
    exigir(await page.locator('[data-planejamento-vazio="ag-moderno-vazio"]').isVisible(), `${vp}: sessão moderna vazia mostra estado orientado`);
    exigir(await page.locator('#extras_ag-moderno-vazio').isVisible(), `${vp}: sessão moderna vazia oferece declaração manual`);
    exigir(textoVazio.includes('sem esperar Amanda ou Cecília organizar a pauta'), `${vp}: sessão moderna vazia remove aprovação pré-upload`);
    exigir(!textoVazio.includes('precisa planejar a ordem'), `${vp}: sessão moderna vazia não repete o bloqueio antigo`);
    const btnVazio = page.locator('#btnConfirmarGravacao_ag-moderno-vazio');
    exigir(await btnVazio.isDisabled(), `${vp}: envio começa travado quando nenhum título foi informado`);
    await page.locator('#extras_ag-moderno-vazio').fill('Depoimento factual sintético');
    exigir(await btnVazio.isEnabled(), `${vp}: um título factual habilita o envio sem aprovação gerencial`);
    exigir((await page.locator('#contadorVideos_ag-moderno-vazio').innerText()).includes('1 vídeo(s)'), `${vp}: contador acompanha a declaração factual`);
    exigir(await page.locator('[data-replanejar-vazio]').count() === 0, `${vp}: filmmaker não recebe replanejamento como pré-condição`);
    await semOverflow(page, `${vp}/moderno-vazio`);
    await salvarEvidencia(page, `V100_${vp.toUpperCase()}_DECLARACAO_SEM_CALENDARIO_SINTETICA.png`);

    await renderizarAgenda(page, 'Luís', cenarios.semCalendario);
    const textoSemCalendario = await page.locator('#formGrav_ag-sem-calendario').innerText();
    exigir(textoSemCalendario.includes('O calendário ainda não trouxe títulos para esta sessão'), `${vp}: calendário ausente aparece como checklist não disponível, sem inventar dados`);
    exigir(textoSemCalendario.includes('não marca conteúdo de outra sessão'), `${vp}: calendário ausente explica o isolamento do registro`);
    exigir(!textoSemCalendario.includes('Calendário indisponível agora'), `${vp}: documento ausente não é rotulado como erro de leitura`);
    exigir(await page.locator('#extras_ag-sem-calendario').isVisible(), `${vp}: ausência de calendário mantém declaração factual`);

    await renderizarAgenda(page, 'Luís', cenarios.erroCalendario);
    const formErro = page.locator('#formGrav_ag-erro-calendario');
    const textoErro = await formErro.innerText();
    exigir(textoErro.includes('Calendário indisponível agora'), `${vp}: erro de leitura aparece como indisponibilidade`);
    exigir(textoErro.includes('Isso não virou uma ordem vazia'), `${vp}: erro de leitura não vira vazio legítimo`);
    exigir(!textoErro.includes('O checklist do calendário mudou'), `${vp}: erro de leitura não é confundido com inconsistência`);
    exigir(await page.locator('[data-planejamento-vazio="ag-erro-calendario"]').count() === 0, `${vp}: erro não recebe marcador de vazio`);
    const btnErro = page.locator('#btnConfirmarGravacao_ag-erro-calendario');
    await page.locator('#extras_ag-erro-calendario').fill('Registro factual durante falha sintética');
    exigir(await btnErro.isEnabled(), `${vp}: falha do checklist não bloqueia declaração isolada`);

    await renderizarAgenda(page, 'Luís', cenarios.inconsistente);
    const textoInconsistente = await page.locator('#formGrav_ag-inconsistente').innerText();
    exigir(textoInconsistente.includes('O checklist do calendário mudou'), `${vp}: snapshot divergente aparece como inconsistência`);
    exigir(textoInconsistente.includes('use a declaração factual abaixo'), `${vp}: inconsistência orienta a alternativa segura`);
    exigir(textoInconsistente.includes('não depende de aprovação de Amanda ou Cecília'), `${vp}: inconsistência não recria aprovação pré-upload`);
    exigir(!textoInconsistente.includes('Calendário indisponível agora'), `${vp}: inconsistência não é rotulada como erro de leitura`);
    exigir(await page.locator('.chkVideoCalendario_ag-inconsistente').count() === 0, `${vp}: checklist inconsistente não oferece itens marcáveis`);
    exigir(await page.locator('#extras_ag-inconsistente').isVisible(), `${vp}: checklist inconsistente mantém declaração isolada`);

    await renderizarAgenda(page, 'Luís', cenarios.checklistExato);
    const checkboxes = page.locator('.chkVideoCalendario_ag-checklist-exato');
    exigir(await checkboxes.count() === 2, `${vp}: checklist exato preserva apenas os dois títulos congelados`);
    exigir((await page.locator('#formGrav_ag-checklist-exato').innerText()).includes('NÃO GRAVAR HOJE'), `${vp}: item de outra sessão continua não executável`);
    const btnChecklist = page.locator('#btnConfirmarGravacao_ag-checklist-exato');
    exigir(await btnChecklist.isDisabled(), `${vp}: checklist exato também exige uma seleção factual`);
    await checkboxes.first().check();
    exigir(await btnChecklist.isEnabled(), `${vp}: marcar título exato habilita o envio`);
    const manual = page.locator('#extras_ag-checklist-exato');
    const atributosManual = await manual.evaluate(el => ({
      idx:el.getAttribute('data-idx'), itemId:el.getAttribute('data-item-id'), cliente:el.getAttribute('data-calendar-cliente-slug')
    }));
    exigir(Object.values(atributosManual).every(v=>v===null), `${vp}: campo manual não carrega IDs do calendário no DOM`);
    const quantidadeChecklistAntes = await checkboxes.count();
    await manual.fill('Título manual sintético A\nTítulo manual sintético B');
    exigir(await checkboxes.count() === quantidadeChecklistAntes, `${vp}: digitar títulos manuais não fabrica checkboxes nem vínculos visuais`);
    const materiais = await page.evaluate(() => window.prepararMateriaisDeclaradosSessao(
      [], 'Título manual sintético A\nTítulo manual sintético B', cacheAgendamentos[0], 'Luís',
      { declaracaoAutorizada:true, motivoDeclaracao:'fixture_v100' }
    ));
    exigir(materiais.ok && materiais.declaradosCampo.length === 2, `${vp}: núcleo real aceita as duas declarações sintéticas`);
    exigir(materiais.declaradosCampo.every(v=>v.calendarItemIdx===null && v.calendarItemId===null && v.calendarClienteSlug===null), `${vp}: declarações manuais persistíveis permanecem sem vínculo de calendário`);
    await semOverflow(page, `${vp}/checklist-exato`);

    for(const papel of ['Amanda','Gabrielle']){
      await renderizarAgenda(page, papel, cenarios.modernoVazio);
      exigir(await page.locator('#extras_ag-moderno-vazio').count() === 0, `${vp}: ${papel} não recebe campo de execução`);
      exigir(await page.locator('[data-confirmar-gravacao="ag-moderno-vazio"]').count() === 0, `${vp}: ${papel} não recebe botão de concluir sessão`);
      exigir((await page.locator('#formGrav_ag-moderno-vazio').innerText()).includes('Visão de controle'), `${vp}: ${papel} recebe somente a leitura de controle`);
    }

    const realizado = {
      ...baseSessao,
      id:'ag-controle-realizado',
      status:'realizado',
      qtdVideosPlanejados:5,
      qtdVideosRealizados:3,
      qtdVideosFaltantes:2,
      qtdVideosExcedentes:0,
      registroCaptacaoModo:'declaracao_filmmaker',
      registradoPor:'Luís',
      finalizadoPor:'Luís',
      finalizadoEm:'2026-08-20T18:15:00.000Z',
      producaoPorFilmmaker:[{
        filmmaker:'Luís', quantidade:3,
        conteudos:['Depoimento factual sintético','Bastidores factuais sintéticos','Produto factual sintético']
      }]
    };
    const calendarioControle = {
      ...calendarioSintetico,
      items:[
        { itemId:'controle-resolvido', mes:'2026-08', day:3, name:'Checklist sintético resolvido', gravado:true },
        { itemId:'controle-pendente', mes:'2026-08', day:8, name:'Checklist sintético pendente' }
      ]
    };
    await page.evaluate(({ realizado, calendarioControle }) => {
      usuarioAtual='Luís';
      cacheAgendamentos=[structuredClone(realizado)];
      __fixtureCalendarios={ 'place-sintetica':structuredClone(calendarioControle) };
      __fixtureFalhas=new Set();
      const box=document.getElementById('agendamentoControleGravacoes');
      if(!box){
        const novo=document.createElement('section'); novo.id='agendamentoControleGravacoes';
        document.querySelector('.fixtureShell').appendChild(novo);
      }
    }, { realizado, calendarioControle });
    await page.evaluate(async () => { await window.renderControleGravacoes(); });
    const controle = page.locator('#agendamentoControleGravacoes');
    const textoControle = await controle.textContent();
    exigir(textoControle.includes('Duas leituras honestas'), `${vp}: controle separa checklist editorial de produção declarada`);
    exigir(textoControle.includes('1 pendente(s) no checklist'), `${vp}: controle mantém o saldo do checklist`);
    exigir(textoControle.includes('3 vídeo(s) realmente registrados no mês'), `${vp}: controle mostra a produção factual separadamente`);
    await controle.locator('summary').click();
    const textoDetalhe = await controle.textContent();
    exigir(await controle.getByText('3 de 5 esperado(s)', { exact:true }).isVisible(), `${vp}: baixa mostra realizado versus esperado`);
    exigir(textoDetalhe.includes('declaração do filmmaker sem marcar calendário'), `${vp}: controle identifica a origem manual sem falsear checklist`);
    exigir(textoDetalhe.includes('2 abaixo do esperado'), `${vp}: saldo restante fica visível sem criar aprovação`);
    exigir(textoDetalhe.includes('Depoimento factual sintético'), `${vp}: controle preserva os títulos realmente declarados`);
    await semOverflow(page, `${vp}/controle`);
    await salvarEvidencia(page, `V100_${vp.toUpperCase()}_CONTROLE_PRODUCAO_SINTETICA.png`);

    exigir(errosPagina.length === 0, `${vp}: matriz visual termina sem pageerror`);
  } finally {
    await page.close();
  }
}

try{
  await executarViewport({ width:1180, height:820 });
  await executarViewport({ width:375, height:812 });
} finally {
  await navegador.close();
}

if(falhas.length){
  throw new Error(`V100 UI REGISTRO AUTÔNOMO: ${falhas.length} falha(s) em ${total} verificações:\n- ${falhas.join('\n- ')}`);
}
console.log(`REGRESSÃO V100 UI REGISTRO AUTÔNOMO FILMMAKER: APROVADA (${total} verificações em desktop e mobile)`);
