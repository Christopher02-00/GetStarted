#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonte = fs.readFileSync(path.join(raiz, 'escritorio.html'), 'utf8');
const evidenceArg = process.argv.find(arg => arg.startsWith('--evidence-dir='));
const evidenceDir = evidenceArg ? path.resolve(evidenceArg.slice('--evidence-dir='.length)) : '';
let total = 0;

function exigir(condicao, mensagem){
  total++;
  if(!condicao) throw new Error('V99 UI CAPTAÇÕES: ' + mensagem);
  console.log('PASS ', mensagem);
}

function trecho(inicio, fim){
  const a = fonte.indexOf(inicio);
  const b = fonte.indexOf(fim, a + inicio.length);
  if(a < 0 || b < 0) throw new Error('V99 UI CAPTAÇÕES: trecho real ausente: ' + inicio);
  return fonte.slice(a, b);
}

/* O ensaio usa o classificador, o planejador e o renderizador entregues no
   HTML. Os mocks abaixo substituem apenas DOM, relógio e leituras Firestore;
   nenhuma regra visual paralela decide se a sessão é moderna, legada ou
   executável. Se o código real mudar de nome ou limite, a extração falha. */
const funcoesEquipe = trecho('  function equipeDoAgendamento', '  function garantirLinhaEquipe');
const funcoesBlocos = trecho('  function itemNaoPrecisaGravar', '  /* ===== GRADE DE POSTAGENS');
const funcoesSessaoEAgenda = trecho('  function itensDoMesComIndiceGlobal', '  async function popularFiltroClientesCalendario');

exigir(fonte.includes('data-planejamento-vazio='), 'HTML real identifica o card de ordem vazia');
exigir(fonte.includes('data-replanejar-vazio='), 'HTML real identifica a ação gerencial de replanejamento');
exigir(fonte.includes("const confirmacaoBloqueada = falhouCalendarioAgenda || planejamentoInconsistente || semExecucaoPermitida || !podeExecutarSessao;"), 'bloqueio do envio deriva dos estados reais da sessão');

const baseSintetica = {
  id:'ag-sintetico',
  cliente:'cliente-sintetico-alfa',
  clienteSlug:'cliente-sintetico-alfa',
  clienteNome:'Cliente Sintético Alfa',
  data:'2026-08-20',
  hora:'15:00',
  status:'agendado',
  aprovado:true,
  filmmaker:'Luís',
  equipe:[{ nome:'Luís', papel:'Filmmaker' }],
  mesCalendario:'2026-08',
  sessaoOrdem:1,
  bloco:1,
  sessaoChave:'cliente-sintetico-alfa|2026-08|S01',
  qtdVideosPlanejados:5
};

const itensSinteticos = Array.from({ length:5 }, (_, indice) => ({
  itemId:'sintetico-' + (indice + 1),
  mes:'2026-08',
  day:indice + 3,
  bloco:1,
  apr:true,
  name:'Conteúdo sintético ' + (indice + 1)
}));

const calendarioSintetico = {
  month:'Agosto 2026',
  items:itensSinteticos,
  blocosPorMes:{ '2026-08':1 },
  aprovacaoMeses:{ '2026-08':{ status:'liberado', mes:'2026-08' } }
};

const cenarios = {
  modernoVazio:{
    agenda:{ ...baseSintetica, sessaoPlanejamentoVersao:1, sessaoItensPlanejados:[] },
    calendario:calendarioSintetico
  },
  legadoParcial:{
    agenda:{ ...baseSintetica, id:'ag-legado-sintetico' },
    calendario:calendarioSintetico
  },
  modernoValido:{
    agenda:{
      ...baseSintetica,
      id:'ag-moderno-valido',
      sessaoPlanejamentoVersao:1,
      sessaoItensPlanejados:itensSinteticos.map((item, indice) => ({
        idx:indice, itemId:item.itemId, nome:item.name, ordem:indice + 1,
        grupo:'fazerHoje', vinculo:'manual'
      }))
    },
    calendario:calendarioSintetico
  },
  indisponivel:{
    agenda:{ ...baseSintetica, id:'ag-indisponivel', sessaoPlanejamentoVersao:1, sessaoItensPlanejados:[] },
    calendario:calendarioSintetico,
    falharCalendario:true
  }
};

const navegador = await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});

function nomeViewport(viewport){
  return viewport.width === 375 ? 'mobile' : 'desktop';
}

async function criarPagina(viewport){
  const page = await navegador.newPage({ viewport });
  const errosPagina = [];
  page.on('pageerror', erro => errosPagina.push(String(erro)));
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    :root{--bg:#202124;--deep:#242528;--paper:#2b2c2f;--line:#4a4b50;--fg:#f3f3f1;--muted:#a6a7ab;--yellow:#ffbc13;--yellow2:#f4ca62;--green:#48bb78;--red:#ff666d}
    *{box-sizing:border-box}html,body{margin:0;max-width:100%;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}body{padding:18px}
    #marcaSintetica{max-width:1040px;margin:0 auto 10px;color:var(--yellow);font-size:11px;font-weight:900;letter-spacing:.08em}
    #agendamentoMinhaAgenda{width:100%;max-width:1040px;margin:0 auto}.card,.item,.painelResumo,.avisoBanner{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:12px;margin:8px 0}
    .painelResumo{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.resumoCard{padding:8px;background:var(--deep);border-radius:8px}.resumoCard .num{font-size:20px;font-weight:900}.resumoCard .lbl,.meta,.desc{color:var(--muted);font-size:12px}
    .faixaHead{padding:10px 2px;font-weight:900}.faixaItens{display:grid;gap:10px}.top,.btnrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.top{justify-content:space-between}.nome{font-weight:900}.selo{font-size:11px}.btn,button{appearance:none;border:1px solid var(--line);border-radius:9px;padding:10px 12px;background:var(--deep);color:var(--fg);font-weight:800}.btn.green{background:var(--green);color:#102419}.btn.red{border-color:var(--red)}button:disabled{opacity:.43;cursor:not-allowed}
    .field{margin:11px 0}.field label{display:block;font-weight:800;margin-bottom:5px}select,input[type=text],textarea{width:100%;max-width:100%;background:var(--deep);border:1px solid var(--line);border-radius:8px;color:var(--fg);padding:10px}textarea{min-height:90px}.linhaCaptacaoSessao{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;gap:7px;align-items:center}
    @media(max-width:600px){body{padding:8px}.painelResumo{grid-template-columns:repeat(2,minmax(0,1fr))}.btnrow{display:grid;grid-template-columns:1fr}.btnrow>*{width:100%}.linhaCaptacaoSessao{grid-template-columns:auto auto minmax(0,1fr)}.responsavelCaptacaoRotulo{grid-column:1/-1!important}.item{max-width:100%;overflow:hidden}}
  </style></head><body><div id="marcaSintetica">FIXTURE 100% SINTÉTICA · CLIENTE ALFA · SEM DADOS REAIS</div><main id="agendamentoMinhaAgenda"></main></body></html>`);

  const suporte = `
    var PESSOAS_DE_CAMPO=['Luís','Nathan'];
    var CAMPO_MAIS_CHRIS=['Chris',...PESSOAS_DE_CAMPO];
    var EDITORES_SELECIONAVEIS=['Editor Sintético'];
    var BLOCOS_PADRAO=2, BLOCOS_MAX=3;
    var usuarioAtual='Luís';
    var __cacheTempoRealPronto={agendamentos:true};
    var cacheAgendamentos=[];
    var __fixtureCalendarios={};
    var __fixtureFalhas=new Set();
    var __acoes=[];
    var db={};
    function collection(_db,nome){return {colecao:nome};}
    function doc(_db,colecao,id){return {colecao,id};}
    async function getDocs(){throw new Error('getDocs não deve ser chamado: a agenda sintética usa cache local.');}
    async function getDoc(ref){
      if(ref.colecao!=='calendarios') throw new Error('Leitura não prevista no harness: '+String(ref.colecao));
      if(__fixtureFalhas.has(ref.id)) throw new Error('falha-sintetica-calendario');
      const dados=__fixtureCalendarios[ref.id];
      return {exists:()=>!!dados,data:()=>structuredClone(dados)};
    }
    async function etapaSegura(_nome,fn){return await fn();}
    async function obterRefsPerfilCompartilhadas(){return [];}
    async function htmlAgendaReunioes(){return '';}
    function hojeLocal(){return '2026-08-21';}
    function formatarDataBR(dataISO){const [a,m,d]=String(dataISO||'').slice(0,10).split('-');return a&&m&&d?d+'/'+m+'/'+a:String(dataISO||'');}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function escAttr(s){return esc(s).replace(/\"/g,'&quot;').replace(/'/g,'&#39;');}
    function escJs(s){return String(s||'');}
    function mesDoTextoConf(){return '';}
    function estadoMesCal(cal,mes){return cal?.aprovacaoMeses?.[mes]?.status||'liberado';}
    function mesDoItemCalendario(_cal,item){return item?.mes||'';}
    function itensDoMesCalendario(cal,mes){return (cal?.items||[]).filter(item=>!mes||mesDoItemCalendario(cal,item)===mes);}
    function mesesDeCalendario(cal){return [...new Set((cal?.items||[]).map(item=>mesDoItemCalendario(cal,item)).filter(Boolean))].sort();}
    function atualizarContadorVideos(){}
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
  `;
  await page.addScriptTag({ content:suporte + '\n' + funcoesEquipe + '\n' + funcoesBlocos + '\n' + funcoesSessaoEAgenda });
  const renderCarregado = await page.evaluate(() => typeof window.renderMinhaAgendaFilmmaker === 'function');
  if(!renderCarregado) throw new Error('V99 UI CAPTAÇÕES: render real não carregou: ' + errosPagina.join(' | '));
  return { page, errosPagina };
}

async function renderizar(page, papel, cenario){
  await page.evaluate(({ papel, cenario }) => {
    usuarioAtual = papel;
    cacheAgendamentos = [structuredClone(cenario.agenda)];
    __fixtureCalendarios = { [cenario.agenda.clienteSlug]:structuredClone(cenario.calendario) };
    __fixtureFalhas = new Set(cenario.falharCalendario ? [cenario.agenda.clienteSlug] : []);
    __acoes = [];
  }, { papel, cenario });
  await page.evaluate(async () => { await window.renderMinhaAgendaFilmmaker(); });
}

async function salvarEvidencia(page, nome){
  if(!evidenceDir) return;
  fs.mkdirSync(evidenceDir, { recursive:true });
  const destino = path.join(evidenceDir, nome);
  await page.screenshot({ path:destino, fullPage:true });
  console.log('EVIDÊNCIA VISUAL:', destino);
}

async function executarViewport(viewport){
  const rotulo = nomeViewport(viewport);
  const { page, errosPagina } = await criarPagina(viewport);
  try{
    await renderizar(page, 'Luís', cenarios.modernoVazio);
    const cardVazio = page.locator('[data-planejamento-vazio="ag-sintetico"]');
    exigir(await cardVazio.isVisible(), `${rotulo}: sessão moderna vazia mostra card de bloqueio`);
    const corBorda = await cardVazio.evaluate(el => getComputedStyle(el).borderTopColor);
    exigir(corBorda === 'rgb(255, 102, 109)', `${rotulo}: card da ordem vazia usa a sinalização vermelha`);
    const confirmarVazio = page.locator('[data-confirmar-gravacao="ag-sintetico"]');
    exigir(await confirmarVazio.count() === 1 && await confirmarVazio.isDisabled(), `${rotulo}: envio da sessão moderna vazia fica desabilitado`);
    exigir(await page.locator('[data-replanejar-vazio]').count() === 0, `${rotulo}: Luís não recebe o controle gerencial de replanejar`);
    exigir(await page.getByRole('button', { name:'Abrir calendário deste cliente' }).count() === 0, `${rotulo}: Luís não recebe o controle gerencial de abrir calendário`);
    await salvarEvidencia(page, `V99_CAPTACOES_${rotulo.toUpperCase()}_MODERNO_VAZIO_LUIS_SINTETICO.png`);

    for(const papel of ['Chris','Amanda','Cecília']){
      await renderizar(page, papel, cenarios.modernoVazio);
      exigir(await page.locator('[data-replanejar-vazio="ag-sintetico"]').isVisible(), `${rotulo}: ${papel} vê replanejamento da ordem vazia`);
      exigir(await page.getByRole('button', { name:'Abrir calendário deste cliente' }).isVisible(), `${rotulo}: ${papel} vê abertura do calendário correto`);
      await page.locator('[data-replanejar-vazio="ag-sintetico"]').click();
      await page.getByRole('button', { name:'Abrir calendário deste cliente' }).click();
      const acoes = await page.evaluate(() => structuredClone(__acoes));
      exigir(acoes.length === 2 && acoes[0].acao === 'replanejar' && acoes[1].acao === 'calendario', `${rotulo}: ações gerenciais de ${papel} estão conectadas aos handlers`);
    }

    await renderizar(page, 'Luís', cenarios.legadoParcial);
    const textareaLegado = page.locator('#extras_ag-legado-sintetico');
    exigir(await textareaLegado.isVisible(), `${rotulo}: legado parcialmente enriquecido mantém declaração textual isolada`);
    exigir((await page.locator('#formGrav_ag-legado-sintetico').innerText()).includes('não marcará pauta de outra semana'), `${rotulo}: legado explica que não marca conteúdo de outra sessão`);
    exigir(await page.locator('[data-planejamento-vazio="ag-legado-sintetico"]').count() === 0, `${rotulo}: legado parcial não é confundido com moderno vazio`);

    await renderizar(page, 'Luís', cenarios.modernoValido);
    exigir(await page.locator('.chkVideoCalendario_ag-moderno-valido').count() === 5, `${rotulo}: sessão moderna válida mostra os cinco títulos congelados`);
    const confirmarValido = page.locator('[data-confirmar-gravacao="ag-moderno-valido"]');
    exigir(await confirmarValido.count() === 1 && await confirmarValido.isEnabled(), `${rotulo}: sessão moderna válida habilita o envio`);
    exigir(await page.locator('[data-planejamento-vazio="ag-moderno-valido"]').count() === 0, `${rotulo}: sessão moderna válida não mostra falso vazio`);
    await salvarEvidencia(page, `V99_CAPTACOES_${rotulo.toUpperCase()}_MODERNO_VALIDO_LUIS_SINTETICO.png`);

    await renderizar(page, 'Luís', cenarios.indisponivel);
    const textoIndisponivel = await page.locator('#formGrav_ag-indisponivel').innerText();
    exigir(textoIndisponivel.includes('Calendário indisponível agora'), `${rotulo}: falha de leitura aparece como indisponibilidade`);
    exigir(!textoIndisponivel.includes('A ordem desta sessão está vazia'), `${rotulo}: indisponibilidade não é convertida em vazio`);
    exigir(await page.locator('[data-planejamento-vazio="ag-indisponivel"]').count() === 0, `${rotulo}: falha de leitura não recebe marcador de vazio`);
    exigir(await page.locator('[data-confirmar-gravacao="ag-indisponivel"]').isDisabled(), `${rotulo}: falha de leitura bloqueia o envio sem apagar a agenda`);

    const largura = await page.evaluate(() => ({ scroll:document.documentElement.scrollWidth, cliente:document.documentElement.clientWidth }));
    exigir(largura.scroll <= largura.cliente + 1, `${rotulo}: agenda sintética permanece dentro do viewport ${viewport.width}x${viewport.height}`);
    exigir(errosPagina.length === 0, `${rotulo}: matriz de papéis e estados termina sem erro de página`);
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

console.log(`REGRESSÃO V99 UI CAPTAÇÕES VIDEOMAKER: APROVADA (${total} verificações em desktop e mobile)`);
