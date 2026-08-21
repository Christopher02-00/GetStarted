#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonte = fs.readFileSync(path.join(raiz, 'escritorio.html'), 'utf8');
const estilosReais = [...fonte.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
const argumentoEvidencia = process.argv.find(arg => arg.startsWith('--evidence-dir='));
const diretorioConfigurado = argumentoEvidencia?.slice('--evidence-dir='.length) || process.env.GET_V101_EVIDENCE_DIR || '';
const diretorioEvidencias = diretorioConfigurado
  ? path.resolve(diretorioConfigurado)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'get-v101-ui-'));
fs.mkdirSync(diretorioEvidencias, { recursive:true });

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
  if(a < 0 || b < 0) throw new Error('V101 UI CONTROLE DE CONCLUSÃO: trecho real ausente: ' + inicio);
  return fonte.slice(a, b);
}

/* O navegador executa o roteador por papel, o resolvedor, o renderizador e
   a trava de persistência que estão no HTML entregue. O harness substitui
   apenas Firebase, relógio e dados por fixtures explicitamente sintéticas.
   Nenhuma regra visual paralela decide quem vê, o que está concluído ou se
   uma ação é conferível. Remover ou renomear o código real quebra o ensaio. */
const blocoRoteamento = trecho(
  '  const CAL_SUBS_POR_PESSOA =',
  '  /* ===== CONTROLE DE CONCLUSÃO V101'
);
const blocoControle = trecho(
  '  /* ===== CONTROLE DE CONCLUSÃO V101',
  '  window.renderVisaoCalendarios = async function'
);

exigir(fonte.includes('2026-08-21-controle-conclusao-calendarios-v101'), 'build V101 identifica a entrega do controle de conclusão');
exigir(fonte.includes('data-calsub="conclusao"'), 'subaba Controle de conclusão existe na tela real de Calendários');
exigir(fonte.includes("'Cecília': ['visao','conclusao'"), 'Cecília recebe a subaba no mapa real de papéis');
exigir(fonte.includes("'Chris':     ['visao','conclusao'"), 'Chris recebe a subaba no mapa real de papéis');
exigir(!fonte.match(/'(Gabrielle|Amanda|Luís|Nathan)'\s*:\s*\[[^\]]*'conclusao'/), 'nenhum outro papel recebe a subaba por conveniência');
exigir(fonte.includes('data-cc-operacional') && fonte.includes('data-cc-conferencia'), 'HTML separa progresso operacional de conferência administrativa');
exigir(fonte.includes('data-cc-estado="pendencias-anteriores"'), 'HTML mantém bloco rastreável para pendências anteriores');
exigir(fonte.includes('item legado: somente leitura'), 'item legado é explicitamente somente leitura');
exigir(fonte.includes('Nada foi somado nem liberado até a identidade ser resolvida.'), 'fonte ambígua não é convertida em progresso');
exigir(fonte.includes('Não converti erro, timeout, cota ou permissão negada em 0%.'), 'erro de leitura não é rotulado como vazio');
exigir(fonte.includes('FIXTURE SINTÉTICA V101') === false, 'selo de fixture não vazou para o HTML público');

const navegador = await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});

function nomeViewport(viewport){
  return viewport.width <= 390 ? 'mobile' : 'desktop';
}

async function criarPagina(viewport){
  const page = await navegador.newPage({ viewport });
  const errosPagina = [];
  page.on('pageerror', erro => errosPagina.push(String(erro)));
  await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    ${estilosReais}
    html,body{margin:0;max-width:100%;height:auto!important;min-height:100%;overflow-x:clip!important;overflow-y:auto!important;background:var(--bg,#202124);color:var(--fg,#f3f3f1)}
    body{padding:58px 18px 24px}.fixtureMarcaV101{position:fixed;z-index:2147483647;top:8px;left:8px;right:8px;max-width:1120px;margin:0 auto;color:var(--yellow,#ffbc13);background:#151517;border:2px solid var(--yellow,#ffbc13);border-radius:10px;padding:8px 11px;font:900 11px/1.35 system-ui;letter-spacing:.07em;text-align:center}
    .fixtureShellV101{width:min(1120px,100%);height:auto!important;margin:0 auto;overflow:visible!important}.fixtureShellV101>.view{display:block;width:100%;height:auto!important;min-height:0!important;min-width:0;overflow:visible!important;position:static!important}
    @media(max-width:600px){body{padding:68px 8px 12px}.fixtureMarcaV101{font-size:9px}.fixtureShellV101{width:100%}}
  </style></head><body>
    <div class="fixtureMarcaV101">FIXTURE SINTÉTICA V101 · CLIENTES E ESTADOS FICTÍCIOS · SEM FIREBASE REAL</div>
    <main class="fixtureShellV101">
      <section class="view" id="view-calendarios">
        <h1>Calendários <span class="y">Editoriais</span></h1>
        <div class="sub">Ensaio isolado do controle de conclusão.</div>
        <div class="subtabs" id="subtabsCalendario">
          <div class="subtab active" data-calsub="visao" onclick="setCalSub('visao',this)">Visão do mês</div>
          <div class="subtab" data-calsub="conclusao" onclick="setCalSub('conclusao',this)">Controle de conclusão</div>
          <div class="subtab" data-calsub="editar" onclick="setCalSub('editar',this)">Montar e editar</div>
          <div class="subtab" data-calsub="refs" onclick="setCalSub('refs',this)">Perfis de referência</div>
          <div class="subtab" data-calsub="links" onclick="setCalSub('links',this)">Links e envio</div>
          <div class="subtab" data-calsub="campo" onclick="setCalSub('campo',this)">Modo gravação</div>
          <div class="subtab" data-calsub="envio" onclick="setCalSub('envio',this)">Publicados e arquivo</div>
          <div class="subtab" data-calsub="resgate" onclick="setCalSub('resgate',this)">Resgatar</div>
        </div>
        <div id="calSubVisao"><div id="visaoCalendariosBox2"></div></div>
        <div id="calSubConclusao" style="display:none">
          <div class="card" style="border:2px solid var(--yellow)">
            <h2>✅ Controle de conclusão</h2>
            <div class="desc">O progresso vem da produção real. Conferir não muda o fluxo.</div>
            <div class="ccToolbar"><div class="field"><label>Competência principal</label><select id="ccCompetencia" onchange="selecionarCompetenciaConclusao(this.value)"></select></div></div>
            <div id="ccEstadoFonte" class="ccEstadoFonte">O painel só lê quando esta seção é aberta.</div>
          </div>
          <div id="controleConclusaoCalendariosBox" aria-live="polite"></div>
        </div>
        <div id="calSubEditar" style="display:none"></div><div id="calSubRefs" style="display:none"></div>
        <div id="calSubLinks" style="display:none"></div><div id="calSubCampo" style="display:none"></div>
        <div id="calSubEnvio" style="display:none"></div><div id="calSubResgate" style="display:none"></div>
      </section>
    </main>
  </body></html>`);

  const suporte = `
    var usuarioAtual='Cecília';
    var auth={currentUser:{uid:'uid-cecilia-sintetica'}};
    var db={tipo:'db-sintetico'};
    var ORDEM_STATUS_POSTAGEM={aguardando_legenda:1,aguardando_agendamento:2,agendado:3,postado:4};
    window.__uid='uid-cecilia-sintetica';
    window.__pessoaAutenticadaReal='Cecília';
    window.__toastsSinteticos=[];
    function slugClienteCanonico(valor){return String(valor||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
    function mesDoItemCalendario(_cal,item){return String(item?.mes||'');}
    function escolherPostagemCanonicaPorVideo(lista,idPreferido){return (lista||[]).find(p=>String(p.id)===String(idPreferido||''))||[...(lista||[])].sort((a,b)=>(ORDEM_STATUS_POSTAGEM[b.status]||0)-(ORDEM_STATUS_POSTAGEM[a.status]||0))[0]||null;}
    function hojeLocal(){return '2026-08-21';}
    function esc(valor){return String(valor??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');}
    function escAttr(valor){return esc(valor);}
    function escJs(valor){return String(valor??'');}
    function mostrarToast(mensagem,tipo){window.__toastsSinteticos.push({mensagem:String(mensagem||''),tipo:String(tipo||'')});}
    function caminhoBase(base){return base===db?'':String(base?.path||'');}
    function doc(base,...partes){const caminho=[caminhoBase(base),...partes.map(String)].filter(Boolean).join('/');return {path:caminho,id:String(partes.at(-1)||base?.id||'')};}
    function collection(base,...partes){const caminho=[caminhoBase(base),...partes.map(String)].filter(Boolean).join('/');return {path:caminho,id:String(partes.at(-1)||'')};}
    function query(ref,...restricoes){return {...ref,restricoes};}
    function where(campo,op,valor){return {campo,op,valor};}
    async function getDocs(){throw new Error('Fixture V101 não permite leitura Firestore real.');}
    async function getDoc(){throw new Error('Fixture V101 não permite leitura Firestore real.');}
    async function runTransaction(){throw new Error('Fixture V101 exige dependência transacional sintética explícita.');}
    function serverTimestamp(){return '2026-08-21T15:00:00.000Z';}
    function renderVisaoCalendarios(){}
    function filtrarCalendariosFerramentas(){}
    function renderCalendarioDeCampo(){}
    function renderFilaEnvioCalendarios(){}
    function carregarClientesCalendariosFerramentas(){return Promise.resolve([]);}
    function preencherSeletoresCalendariosRecorrentes(){}
    var calendarioFerramentasClientesEstado='confirmado';
    var calendarioFerramentasClientesConfirmados=[];
  `;
  const instrumentacao = `
    window.__ajustarAbasCalendarioV101Teste=ajustarAbasCalendario;
    window.__calSubsPorPessoaV101Teste=CAL_SUBS_POR_PESSOA;
  `;
  await page.addScriptTag({ content:[suporte,blocoRoteamento,instrumentacao,blocoControle].join('\n') });
  const carregado = await page.evaluate(() => ({
    seam:typeof window.__controleConclusaoV101Teste,
    render:typeof window.renderControleConclusaoCalendarios,
    ajustar:typeof window.__ajustarAbasCalendarioV101Teste
  }));
  exigir(Object.values(carregado).every(v=>v==='object'||v==='function'), `${nomeViewport(viewport)}: código real V101 carrega no navegador isolado`);
  if(carregado.seam!=='object' || carregado.render!=='function' || carregado.ajustar!=='function'){
    throw new Error('V101 UI: bloco real não carregou: '+JSON.stringify(carregado)+' · '+errosPagina.join(' | '));
  }

  await page.evaluate(async () => {
    const seam=window.__controleConclusaoV101Teste;
    const fontesVazias=()=>({videos:{erros:[]},postagens:{erros:[]},postagensDiretas:{erros:[]},conferencias:{erros:[]},encerramentos:{erros:[]}});
    function estado({calendarId='cliente-sintetico-alfa',competencia='2026-08',clienteCanonico='cliente-sintetico-alfa',nome,itemId='',videos=[],postagens=[],ambigua=false,erroProducao=false,conferido=false,legadoPostado=false}){
      const item={itemId,mes:competencia,name:nome,posted:legadoPostado};
      const resolucao=seam.resolverEstadoItemConclusao({item,videos,postagens,clienteCanonico,ambigua,fontes:{erroProducao}});
      const fonteAssinatura='assinatura_'+(itemId||nome).replace(/[^A-Za-z0-9]/g,'_');
      const conferencia=conferido?{conferido:true,fonteAssinatura,observacao:'Conferência sintética'}:null;
      return {item,itemId,erroConferencia:false,erroEncerramento:false,alvo:{calendarId,competencia,itemId,item,calAtualizadoEm:'2026-08-21T10:00:00.000Z',clienteCanonico,videos,postagens,encerramento:null,conferencia,assinaturaBase:'base_'+fonteAssinatura,fonteAssinatura,conferenciaAtual:conferido,resolucao}};
    }
    const publicado=estado({nome:'Conteúdo publicado sintético',itemId:'item-publicado',videos:[{id:'video-publicado',calendarItemId:'item-publicado',calendarClienteSlug:'cliente-sintetico-alfa',status:'finalizado',postagemId:'post-publicado'}],postagens:[{id:'post-publicado',videoId:'video-publicado',status:'postado'}],conferido:true});
    const pendente=estado({nome:'Conteúdo pendente sintético',itemId:'item-pendente'});
    const legado=estado({nome:'Conteúdo legado sintético'});
    const entregue=estado({calendarId:'cliente-sintetico-beta',clienteCanonico:'cliente-sintetico-beta',nome:'Entrega direta sintética',itemId:'item-entregue',videos:[{id:'video-entregue',calendarItemId:'item-entregue',calendarClienteSlug:'cliente-sintetico-beta',status:'finalizado',finalizadoVia:'entrega_direta'}],conferido:true});
    const indisponivel=estado({calendarId:'cliente-sintetico-erro',clienteCanonico:'cliente-sintetico-erro',nome:'Fonte indisponível sintética',itemId:'item-indisponivel',erroProducao:true});
    const clienteDivergente=estado({calendarId:'cliente-sintetico-divergente',clienteCanonico:'cliente-sintetico-divergente',nome:'Vínculo divergente sintético',itemId:'item-divergente',videos:[{id:'video-divergente',calendarItemId:'item-divergente',calendarClienteSlug:'cliente-sintetico-divergente',status:'finalizado',postagemId:'post-divergente'}],postagens:[{id:'post-divergente',videoId:'video-divergente',calendarClienteSlug:'outro-cliente-sintetico',status:'postado'}]});
    const foraWhitelist=estado({calendarId:'cliente-sintetico-fora-whitelist',clienteCanonico:'cliente-sintetico-fora-whitelist',nome:'Finalização não autorizada sintética',itemId:'item-fora-whitelist',videos:[{id:'video-fora-whitelist',calendarItemId:'item-fora-whitelist',calendarClienteSlug:'cliente-sintetico-fora-whitelist',status:'finalizado',finalizadoVia:'atalho_nao_autorizado'}]});
    const anteriorPendente=estado({calendarId:'cliente-sintetico-antigo',competencia:'2026-07',clienteCanonico:'cliente-sintetico-antigo',nome:'Pendência antiga sintética',itemId:'item-antigo'});
    const anteriorCompleto=estado({calendarId:'cliente-sintetico-antigo-ok',competencia:'2026-07',clienteCanonico:'cliente-sintetico-antigo-ok',nome:'Concluído antigo sintético',itemId:'item-antigo-ok',videos:[{id:'video-antigo-ok',calendarItemId:'item-antigo-ok',calendarClienteSlug:'cliente-sintetico-antigo-ok',status:'finalizado',finalizadoVia:'entrega_direta'}],conferido:true});
    window.__dadosControleV101Sinteticos={carregadoEm:Date.now(),fontes:fontesVazias(),cards:[
      {calendarId:'cliente-sintetico-alfa',clienteCanonico:'cliente-sintetico-alfa',nome:'Cliente Sintético Alfa',competencia:'2026-08',ambigua:false,estados:[publicado,pendente,legado]},
      {calendarId:'cliente-sintetico-beta',clienteCanonico:'cliente-sintetico-beta',nome:'Cliente Sintético Beta',competencia:'2026-08',ambigua:false,estados:[entregue]},
      {calendarId:'cliente-sintetico-erro',clienteCanonico:'cliente-sintetico-erro',nome:'Cliente Sintético Indisponível',competencia:'2026-08',ambigua:false,estados:[indisponivel]},
      {calendarId:'cliente-sintetico-divergente',clienteCanonico:'cliente-sintetico-divergente',nome:'Cliente Sintético Vínculo Divergente',competencia:'2026-08',ambigua:false,estados:[clienteDivergente]},
      {calendarId:'cliente-sintetico-fora-whitelist',clienteCanonico:'cliente-sintetico-fora-whitelist',nome:'Cliente Sintético Fora da Whitelist',competencia:'2026-08',ambigua:false,estados:[foraWhitelist]},
      {calendarId:'cliente-sintetico-vazio',clienteCanonico:'cliente-sintetico-vazio',nome:'Cliente Sintético Mês Vazio',competencia:'2026-08',ambigua:false,estados:[]},
      {calendarId:'cliente-sintetico-ambiguo-a',clienteCanonico:'cliente-sintetico-ambiguo',nome:'Cliente Sintético Ambíguo',competencia:'2026-08',ambigua:true,estados:[]},
      {calendarId:'cliente-sintetico-antigo',clienteCanonico:'cliente-sintetico-antigo',nome:'Cliente Sintético Antigo',competencia:'2026-07',ambigua:false,estados:[anteriorPendente]},
      {calendarId:'cliente-sintetico-antigo-ok',clienteCanonico:'cliente-sintetico-antigo-ok',nome:'Cliente Sintético Antigo Concluído',competencia:'2026-07',ambigua:false,estados:[anteriorCompleto]}
    ]};
    seam.definirLoaderSintetico(async()=>window.__dadosControleV101Sinteticos);
  });
  return { page,errosPagina };
}

async function definirPapel(page,operado,real=operado){
  await page.evaluate(({operado,real})=>{
    usuarioAtual=operado;
    window.__pessoaAutenticadaReal=real;
    window.__uid='uid-'+real.toLowerCase().normalize('NFD').replace(/[^a-z]/g,'');
    auth.currentUser={uid:window.__uid};
    window.__ajustarAbasCalendarioV101Teste();
  },{operado,real});
}

async function renderizarPainel(page,operado='Cecília',real=operado){
  await definirPapel(page,operado,real);
  await page.evaluate(async()=>{
    const aba=document.querySelector('#subtabsCalendario [data-calsub="conclusao"]');
    window.setCalSub('conclusao',aba);
    await window.renderControleConclusaoCalendarios(true);
  });
}

function cardPorNome(page,nome){
  return page.locator('[data-cc-card]').filter({hasText:nome});
}

async function semOverflow(page,rotulo){
  const largura=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,cliente:document.documentElement.clientWidth}));
  exigir(largura.scroll<=largura.cliente+1,`${rotulo}: painel não cria rolagem horizontal`);
}

async function executarViewport(viewport){
  const vp=nomeViewport(viewport);
  const {page,errosPagina}=await criarPagina(viewport);
  try{
    for(const papel of ['Cecília','Chris','Gabrielle','Amanda','Luís','Nathan']){
      await definirPapel(page,papel);
      const esperado=['Cecília','Chris'].includes(papel);
      exigir((await page.locator('#subtabsCalendario [data-calsub="conclusao"]').count()===1)===esperado,`${vp}: subaba ${esperado?'existe':'não existe'} no DOM de ${papel}`);
      exigir((await page.locator('#calSubConclusao').count()===1)===esperado,`${vp}: painel ${esperado?'existe':'não existe'} no DOM de ${papel}`);
    }

    await renderizarPainel(page,'Cecília','Cecília');
    exigir(await page.locator('.fixtureMarcaV101').isVisible(),`${vp}: evidência mostra selo FIXTURE SINTÉTICA V101`);
    const alfa=cardPorNome(page,'Cliente Sintético Alfa');
    exigir(await alfa.count()===1,`${vp}: card por cliente e competência é renderizado`);
    const operacional=await alfa.locator('[data-cc-operacional]').innerText();
    const conferencia=await alfa.locator('[data-cc-conferencia]').innerText();
    exigir(/1\/3/.test(operacional)&&operacional.includes('verificação parcial')&&!operacional.includes('%'),`${vp}: progresso operacional deriva 1 de 3 e não declara percentual final por causa do legado`);
    exigir(/1\/1/.test(conferencia)&&conferencia.includes('Conferência Cecília'),`${vp}: conferência administrativa tem contador próprio`);
    exigir(operacional!==conferencia,`${vp}: fluxo e conferência permanecem informações distintas`);

    const blocoAntigo=page.locator('[data-cc-estado="pendencias-anteriores"]');
    exigir(await blocoAntigo.count()===1&&await blocoAntigo.isVisible(),`${vp}: pendência de julho permanece fixada em agosto`);
    exigir((await blocoAntigo.innerText()).includes('Cliente Sintético Antigo'),`${vp}: cliente antigo pendente aparece no bloco fixado`);
    exigir(!(await blocoAntigo.innerText()).includes('Antigo Concluído'),`${vp}: competência anterior totalmente concluída não polui a fila`);

    const ordemItens=await alfa.evaluate(card=>{
      const titulos=[...card.querySelectorAll('[data-cc-item] .ccItemTitulo')];
      const pendente=titulos.find(el=>el.textContent.includes('Conteúdo pendente sintético'))?.closest('[data-cc-item]');
      const publicado=titulos.find(el=>el.textContent.includes('Conteúdo publicado sintético'))?.closest('[data-cc-item]');
      return !!pendente&&!!publicado&&!pendente.closest('[data-cc-concluidos]')&&!!publicado.closest('[data-cc-concluidos]')&&!!(pendente.compareDocumentPosition(publicado)&Node.DOCUMENT_POSITION_FOLLOWING);
    });
    exigir(ordemItens,`${vp}: itens pendentes aparecem antes dos concluídos`);
    const recolhiveis=alfa.locator('[data-cc-concluidos]');
    exigir(await recolhiveis.count()===1&&!await recolhiveis.evaluate(el=>el.open),`${vp}: itens concluídos do card parcial começam recolhidos`);
    const beta=cardPorNome(page,'Cliente Sintético Beta');
    exigir(await beta.locator('details.ccItens').count()===1&&!await beta.locator('details.ccItens').evaluate(el=>el.open),`${vp}: card 100% concluído começa recolhido`);

    const legado=alfa.locator('[data-cc-item]').filter({hasText:'Conteúdo legado sintético'});
    exigir(await legado.count()===1&&(await legado.innerText()).includes('somente leitura'),`${vp}: legado sem itemId recebe limite explícito`);
    exigir(await legado.locator('[data-cc-acao]').count()===0,`${vp}: legado sem identidade não recebe checkbox nem encerramento`);
    exigir(await cardPorNome(page,'Cliente Sintético Ambíguo').getAttribute('data-cc-estado')==='ambiguo',`${vp}: identidade ambígua possui estado visual próprio`);
    const cardIndisponivel=cardPorNome(page,'Cliente Sintético Indisponível');
    exigir(await cardIndisponivel.getAttribute('data-cc-estado')==='indisponivel',`${vp}: falha de fonte possui estado indisponível próprio`);
    const progressoIndisponivel=await cardIndisponivel.locator('[data-cc-operacional]').innerText();
    exigir(!progressoIndisponivel.includes('0%')&&/indisponível|—/i.test(progressoIndisponivel),`${vp}: fonte indisponível não vira percentual 0%`);
    const cardDivergente=cardPorNome(page,'Cliente Sintético Vínculo Divergente');
    exigir(await cardDivergente.getAttribute('data-cc-estado')==='indisponivel'&&(await cardDivergente.innerText()).includes('Postagem vinculada pertence a outro cliente'),`${vp}: postagem de cliente divergente falha fechada e fica explícita`);
    exigir(await cardDivergente.locator('[data-cc-acao]').count()===0,`${vp}: vínculo de cliente divergente não recebe conferência nem encerramento`);
    const cardForaWhitelist=cardPorNome(page,'Cliente Sintético Fora da Whitelist');
    exigir((await cardForaWhitelist.locator('[data-cc-item]').getAttribute('data-cc-estado'))==='planejado',`${vp}: finalizadoVia fora da whitelist não falsifica estado terminal`);
    exigir(await cardForaWhitelist.locator('[data-cc-acao="conferencia"]').count()===0,`${vp}: finalização fora da whitelist não pode ser conferida pela Cecília`);
    const cardVazio=cardPorNome(page,'Cliente Sintético Mês Vazio');
    exigir(await cardVazio.getAttribute('data-cc-estado')==='vazio',`${vp}: mês vazio legítimo é distinto de pendência e erro`);
    exigir(!(await cardVazio.innerText()).includes('0%'),`${vp}: mês vazio não finge progresso zerado`);

    await recolhiveis.evaluate(el=>{el.open=true;});
    const publicado=alfa.locator('[data-cc-item]').filter({hasText:'Conteúdo publicado sintético'});
    exigir(await publicado.locator('[data-cc-acao="conferencia"]').count()===1,`${vp}: Cecília recebe checkbox só no item terminal conferível`);
    exigir(await publicado.locator('[data-cc-acao="observacao"]').count()===1,`${vp}: Cecília recebe observação opcional`);
    exigir(await alfa.locator('[data-cc-item]').filter({hasText:'Conteúdo pendente sintético'}).locator('[data-cc-acao="conferencia"]').count()===0,`${vp}: item ainda pendente não pode ser falsamente conferido`);
    await publicado.locator('[data-cc-acao="observacao"]').click();
    exigir(await publicado.locator('textarea.ccObs').isVisible(),`${vp}: observação fica escondida até ação explícita`);
    exigir(await publicado.getByRole('button',{name:'Salvar observação'}).isVisible(),`${vp}: ao abrir observação, o controle de salvar também fica acessível`);
    exigir(await page.locator('[data-cc-acao="encerramento"]').count()===0,`${vp}: Cecília não recebe encerramento excepcional`);

    await renderizarPainel(page,'Cecília','Chris');
    exigir(await page.locator('[data-cc-acao="conferencia"]').count()>=1,`${vp}: Chris operando explicitamente como Cecília pode conferir com auditoria delegada`);
    exigir(await page.locator('[data-cc-acao="encerramento"]').count()===0,`${vp}: Chris delegado não mistura conferência com poder excepcional`);

    await renderizarPainel(page,'Chris','Chris');
    exigir(await page.locator('[data-cc-acao="conferencia"]').count()===0,`${vp}: Chris no perfil real não substitui a rotina de conferência da Cecília`);
    exigir(await page.locator('[data-cc-acao="encerramento"]').count()>=1,`${vp}: Chris real recebe encerramento/reabertura auditável`);
    const publicadoChris=cardPorNome(page,'Cliente Sintético Alfa').locator('[data-cc-item]').filter({hasText:'Conteúdo publicado sintético'});
    const entregueChris=cardPorNome(page,'Cliente Sintético Beta').locator('[data-cc-item]').filter({hasText:'Entrega direta sintética'});
    exigir(await publicadoChris.locator('[data-cc-acao="encerramento"]').count()===0,`${vp}: item já publicado não oferece encerramento excepcional ao Chris`);
    exigir(await entregueChris.locator('[data-cc-acao="encerramento"]').count()===0,`${vp}: entrega direta terminal não oferece encerramento excepcional ao Chris`);
    exigir(await cardPorNome(page,'Cliente Sintético Alfa').locator('[data-cc-item]').filter({hasText:'Conteúdo pendente sintético'}).locator('[data-cc-acao="encerramento"]').count()===1,`${vp}: encerramento excepcional do Chris fica restrito ao item realmente pendente`);

    await renderizarPainel(page,'Cecília','Cecília');
    const duplo=await page.evaluate(async()=>{
      const seam=window.__controleConclusaoV101Teste;
      const alvo=window.__dadosControleV101Sinteticos.cards[0].estados.find(e=>e.itemId==='item-publicado').alvo;
      alvo.conferencia=null; alvo.conferenciaAtual=false;
      alvo.assinaturaBase=await seam.assinaturaFonteItemConclusao(alvo,false);
      alvo.fonteAssinatura=await seam.assinaturaFonteItemConclusao(alvo,true);
      const documentos=new Map();
      documentos.set('calendarios/'+alvo.calendarId,{items:[structuredClone(alvo.item)],updatedAt:alvo.calAtualizadoEm});
      for(const video of alvo.videos) documentos.set('videos_producao/'+video.id,structuredClone(video));
      for(const postagem of alvo.postagens) documentos.set('postagens/'+postagem.id,structuredClone(postagem));
      let liberar; let transacoes=0; let gravacoes=0;
      const barreira=new Promise(resolve=>{liberar=resolve;});
      const snap=(valor)=>({exists:()=>valor!==undefined,data:()=>structuredClone(valor)});
      const deps={
        async runTransaction(_db,callback){
          transacoes++;
          await barreira;
          const pendentes=new Map();
          const tx={
            async get(ref){return snap(pendentes.has(ref.path)?pendentes.get(ref.path):documentos.get(ref.path));},
            set(ref,valor){gravacoes++;pendentes.set(ref.path,structuredClone(valor));}
          };
          await callback(tx);
          pendentes.forEach((valor,chave)=>documentos.set(chave,valor));
        },
        async getDoc(ref){return snap(documentos.get(ref.path));}
      };
      const primeira=seam.persistirControleConclusaoV101('conferencia',alvo,{desejado:true,observacao:'Conferência sintética'},deps);
      const segunda=seam.persistirControleConclusaoV101('conferencia',alvo,{desejado:true,observacao:'Conferência sintética'},deps);
      const limite=performance.now()+2000;
      while(transacoes!==1&&performance.now()<limite){await new Promise(resolve=>setTimeout(resolve,0));}
      const transacoesAntes=transacoes;
      liberar();
      const [r1,r2]=await Promise.all([primeira,segunda]);
      return {transacoesAntes,transacoes,gravacoes,primeira:r1,segunda:r2};
    });
    exigir(duplo.transacoesAntes===1&&duplo.transacoes===1&&duplo.segunda?.duplicado===true,`${vp}: clique duplo entra em uma única transação e a repetição é bloqueada`);
    exigir(duplo.primeira?.ok===true&&duplo.gravacoes===2,`${vp}: operação válida grava um retrato e um evento append-only`);

    const corridaDuasAbas=await page.evaluate(async()=>{
      const seam=window.__controleConclusaoV101Teste;
      const alvo=window.__dadosControleV101Sinteticos.cards[0].estados.find(e=>e.itemId==='item-publicado').alvo;
      alvo.conferencia=null; alvo.conferenciaAtual=false;
      alvo.assinaturaBase=await seam.assinaturaFonteItemConclusao(alvo,false);
      alvo.fonteAssinatura=await seam.assinaturaFonteItemConclusao(alvo,true);
      const documentos=new Map();
      documentos.set('calendarios/'+alvo.calendarId,{items:[structuredClone(alvo.item)],updatedAt:alvo.calAtualizadoEm});
      for(const video of alvo.videos) documentos.set('videos_producao/'+video.id,structuredClone(video));
      for(const postagem of alvo.postagens) documentos.set('postagens/'+postagem.id,structuredClone(postagem));
      let transacoes=0; let gravacoes=0; let caminhoRetrato='';
      const snap=(valor)=>({exists:()=>valor!==undefined,data:()=>structuredClone(valor)});
      const deps={
        async runTransaction(_db,callback){
          transacoes++;
          const pendentes=new Map();
          const tx={
            async get(ref){return snap(pendentes.has(ref.path)?pendentes.get(ref.path):documentos.get(ref.path));},
            set(ref,valor){gravacoes++;pendentes.set(ref.path,structuredClone(valor));if(!ref.path.includes('/eventos/')) caminhoRetrato=ref.path;}
          };
          await callback(tx);
          pendentes.forEach((valor,chave)=>documentos.set(chave,valor));
          const sobreposto=structuredClone(documentos.get(caminhoRetrato));
          sobreposto.observacao='Alteração sintética feita pela segunda aba';
          sobreposto.revision=Number(sobreposto.revision||0)+1;
          documentos.set(caminhoRetrato,sobreposto);
        },
        async getDoc(ref){return snap(documentos.get(ref.path));}
      };
      try{
        await seam.persistirControleConclusaoV101('conferencia',alvo,{desejado:true,observacao:'Primeira aba sintética'},deps);
        return {capturado:false,transacoes,gravacoes};
      }catch(erro){
        return {capturado:erro?.code==='gs/recibo-superado'&&erro?.operacaoRegistrada===true,codigo:String(erro?.code||''),transacoes,gravacoes};
      }
    });
    exigir(corridaDuasAbas.capturado&&corridaDuasAbas.transacoes===1&&corridaDuasAbas.gravacoes===2,`${vp}: corrida sintética de duas abas detecta recibo superado sem duplicar a operação`);

    await page.evaluate(()=>{
      window.__controleConclusaoV101Teste.definirLoaderSintetico(()=>new Promise(resolve=>{window.__resolverLeituraV101=resolve;}));
      usuarioAtual='Cecília';window.__pessoaAutenticadaReal='Cecília';window.__uid='uid-cecilia-sintetica';auth.currentUser={uid:window.__uid};
      window.__ajustarAbasCalendarioV101Teste();
      window.__leituraPendenteV101=window.renderControleConclusaoCalendarios(true);
    });
    await page.waitForFunction(()=>typeof window.__resolverLeituraV101==='function');
    await page.evaluate(async()=>{
      usuarioAtual='Gabrielle';window.__pessoaAutenticadaReal='Gabrielle';window.__uid='uid-gabi-sintetica';auth.currentUser={uid:window.__uid};
      window.__ajustarAbasCalendarioV101Teste();
      window.__resolverLeituraV101(window.__dadosControleV101Sinteticos);
      await window.__leituraPendenteV101;
    });
    exigir(await page.locator('#calSubConclusao').count()===0&&await page.locator('[data-cc-card]').count()===0,`${vp}: leitura iniciada pela Cecília não repovoa o DOM após troca para Gabi`);

    await definirPapel(page,'Cecília','Cecília');
    await page.evaluate(async()=>{
      window.__controleConclusaoV101Teste.definirLoaderSintetico(async()=>{const erro=new Error('timeout-sintetico-v101');erro.code='deadline-exceeded';throw erro;});
      await window.renderControleConclusaoCalendarios(true);
    });
    const erro=page.locator('[data-cc-estado="erro"]');
    exigir(await erro.count()===1&&(await erro.innerText()).includes('Estado indisponível'),`${vp}: erro de leitura aparece como indisponibilidade explícita`);
    exigir(await erro.locator('[data-cc-operacional]').count()===0&&(await erro.innerText()).includes('Não converti erro, timeout, cota ou permissão negada em 0%.'),`${vp}: erro geral nunca vira mês vazio ou placar operacional 0%`);

    await page.evaluate(()=>{
      const seam=window.__controleConclusaoV101Teste;
      seam.definirLoaderSintetico(async()=>window.__dadosControleV101Sinteticos);
      const geracao=seam.estado().geracao;
      seam.renderizarControleConclusaoComDados(window.__dadosControleV101Sinteticos,'2026-09',geracao);
    });
    const vazio=page.locator('.card.ccVazio[data-cc-estado="vazio"]');
    exigir(await vazio.count()===1&&(await vazio.innerText()).includes('mês vazio, não uma falha'),`${vp}: competência legitimamente vazia é apresentada sem ambiguidade`);

    await renderizarPainel(page,'Cecília','Cecília');
    await semOverflow(page,`${vp}/controle-conclusao`);
    exigir(errosPagina.length===0,`${vp}: navegador não registra pageerror (${errosPagina.join(' | ')||'nenhum'})`);
    const evidencia=path.join(diretorioEvidencias,`V101_CONTROLE_CONCLUSAO_${vp.toUpperCase()}_FIXTURE_SINTETICA.png`);
    await page.screenshot({path:evidencia,fullPage:true});
    exigir(fs.existsSync(evidencia),`${vp}: evidência visual sintética foi gerada`);
  }finally{
    await page.close();
  }
}

try{
  await executarViewport({width:1440,height:1000});
  await executarViewport({width:375,height:812});
}finally{
  await navegador.close();
}

console.log(`\nV101 UI CONTROLE DE CONCLUSÃO: ${total-falhas.length}/${total} verificações aprovadas.`);
console.log('EVIDENCE_DIR=' + diretorioEvidencias);
if(falhas.length){
  console.error('\nFalhas:');
  falhas.forEach(f=>console.error('- '+f));
  process.exitCode=1;
}else{
  console.log('PASS: desktop/mobile, papéis, estados, concorrência e evidências sintéticas aprovados.');
}
