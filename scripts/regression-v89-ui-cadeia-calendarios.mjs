#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require('/Users/christopherbrito/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const calendario=fs.readFileSync(path.join(raiz,'calendario.html'),'utf8');
let total=0;
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('V89 UI cadeia: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return fonte.slice(a,b);
}

/* As transições são extraídas dos HTMLs entregues. O ensaio não mantém
   uma cópia paralela da regra de negócio: se os nomes/limites mudarem,
   ele para em vez de continuar validando uma simulação antiga. */
const funcoesMesEditor=[
  trecho(calendario,'function mesDoItemNoCalendario','function carimbarMesDosAntigos'),
  trecho(calendario,'function assinaturaConteudoCalendario','function deveBloquearConflitoCalendario'),
  trecho(calendario,'function docJaUsaMesesNoCalendario','function mesHistoricoAnteriorAoControleNoCalendario')
].join('\n');
const enviarGabi=trecho(calendario,'async function confirmarEnvioAprovacaoNoBanco','function aplicarEnvioAprovacaoConfirmado');
const funcoesMesEscritorio=trecho(escritorio,'  function mesDoItemCalendario','  /* Fonte única do contador e das duas filas');
const publicarAmanda=trecho(escritorio,'async function dispararCalendarios','  /* Aprovação e publicação são uma única decisão da Amanda.');
const linksCecilia=trecho(escritorio,'  async function prepararLinkCalendarioEquipe','  function comTimeoutCalendarioOperacional');
const timeoutELinkCliente=trecho(escritorio,'  function comTimeoutCalendarioOperacional','  window.prepararLinkCalendarioCliente=prepararLinkCalendarioCliente;');

const browser=await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});
const page=await browser.newPage({viewport:{width:1260,height:850}});
try{
  await page.setContent(`<!doctype html><html><body>
    <h1>Cadeia de calendário — teste isolado</h1>
    <section id="gabi"><h2>Gabi</h2><button id="gabiEnviar" onclick="acaoGabi(this)">Enviar setembro para aprovação</button><output id="gabiEstado"></output></section>
    <section id="amanda"><h2>Amanda</h2><button id="amandaPublicar" onclick="acaoAmanda(this)">Aprovar e publicar setembro</button><output id="amandaEstado"></output></section>
    <section id="cecilia"><h2>Cecília</h2><button id="ceciliaOutubro" onclick="acaoCeciliaInterno(this,'2026-10')">Abrir outubro interno</button><button id="ceciliaSetembro" onclick="acaoCeciliaCliente(this,'2026-09')">Copiar setembro para cliente</button><output id="ceciliaEstado"></output></section>
    <section id="cliente"><h2>Cliente</h2><button id="clienteAgosto" onclick="acaoCliente('2026-08')">Abrir agosto</button><button id="clienteSetembro" onclick="acaoCliente('2026-09')">Abrir setembro</button><button id="clienteOutubro" onclick="acaoCliente('2026-10')">Abrir outubro</button><div id="clienteEstado"></div></section>
  </body></html>`);
  await page.addScriptTag({content:`
    window.__doc={
      client:'iPhone Campo Largo',month:'Outubro 2026',updatedAt:'2026-08-19T12:00:00.000Z',
      items:[
        {itemId:'ago-1',mes:'2026-08',day:5,name:'Arquivo de agosto'},
        {itemId:'set-1',mes:'2026-09',day:4,name:'Lançamento de setembro'},
        {itemId:'out-1',mes:'2026-10',day:3,name:'Rascunho de outubro'}
      ],
      aprovacaoMeses:{
        '2026-08':{status:'liberado',mes:'2026-08',em:'2026-08-01T12:00:00.000Z'},
        '2026-09':{status:'rascunho',mes:'2026-09'},
        '2026-10':{status:'rascunho',mes:'2026-10'}
      }
    };
    window.__historico=[]; window.__logs=[]; window.__tocados=[];
    window.db={}; window.usuarioAtual='Gabrielle';
    window.doc=(_db,colecao,id)=>({colecao,id,path:colecao+'/'+id});
    window.collection=(_db,nome)=>nome;
    window.__snap=()=>({id:'iphone-campo-largo',exists:()=>true,data:()=>structuredClone(__doc)});
    window.getDoc=async()=>__snap();
    window.runTransaction=async(_db,fn)=>fn({
      get:async()=>__snap(),
      set:(_ref,patch)=>{ __doc={...__doc,...structuredClone(patch)}; __tocados.push(Object.keys(patch)); },
      update:(_ref,patch)=>{ __doc={...__doc,...structuredClone(patch)}; __tocados.push(Object.keys(patch)); }
    });
    window.__fb={db,docRef:doc(db,'calendarios','iphone-campo-largo'),runTransaction};
    window.mesDoTexto=txt=>{
      const nomes=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
      const t=String(txt||'').toLowerCase(),indice=nomes.findIndex(n=>t.includes(n)),ano=(t.match(/20\\d{2}/)||[])[0];
      return indice>=0&&ano?ano+'-'+String(indice+1).padStart(2,'0'):'';
    };
    ${funcoesMesEditor}
    ${enviarGabi}
    window.acaoGabi=async btn=>{
      btn.disabled=true;
      const pacote={mes:'2026-09',data:structuredClone(__doc),marca:{status:'aguardando_interna',mes:'2026-09',por:'Gabrielle',em:'2026-08-19T14:00:00.000Z'}};
      const r=await confirmarEnvioAprovacaoNoBanco(pacote);
      gabiEstado.textContent=r.ok?'aguardando_interna':'falhou: '+r.motivo;
      btn.disabled=false;
    };

    window.mesDoTextoConf=mesDoTexto;
    window.competenciaSeguinte=mes=>{const [a,m]=mes.split('-').map(Number),d=new Date(a,m,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
    ${funcoesMesEscritorio}
    window.nomeDeSlugSeguro=()=> 'iPhone Campo Largo';
    window.registrarHistorico=(...a)=>__historico.push(a);
    window.registrarLogAutomacao=(...a)=>__logs.push(a);
    window.sincronizarBadgeAposDecisaoDeCalendario=async()=>{};
    ${publicarAmanda}
    window.acaoAmanda=async btn=>{
      usuarioAtual='Amanda'; btn.disabled=true;
      const r=await dispararCalendarios([{slug:'iphone-campo-largo',mes:'2026-09'}]);
      amandaEstado.textContent=r.enviados.length?'liberado':'falhou: '+(r.falhas[0]?.erro||'');
      btn.disabled=false;
    };

    window.resolverSlugCalendarioExistente=async slug=>slug;
    window.garantirTokensDoCliente=async()=>({token:'token-isolado-confirmado'});
    ${linksCecilia}
    ${timeoutELinkCliente}
    window.acaoCeciliaInterno=async(_btn,mes)=>{
      usuarioAtual='Cecília';
      try{ceciliaEstado.textContent=await prepararLinkCalendarioEquipe('iphone-campo-largo',mes);}catch(e){ceciliaEstado.textContent='erro: '+e.message;}
    };
    window.acaoCeciliaCliente=async(_btn,mes)=>{
      usuarioAtual='Cecília';
      try{ceciliaEstado.textContent=await prepararLinkCalendarioCliente('iphone-campo-largo',mes);}catch(e){ceciliaEstado.textContent='erro: '+e.message;}
    };
    window.acaoCliente=mes=>{
      const estado=estadoMesCal(__doc,mes,new Date('2026-08-19T15:00:00-03:00'));
      const itens=itensDoMesCalendario(__doc,mes).filter(i=>!i.excluido);
      if(estado==='arquivado') clienteEstado.textContent='Calendário arquivado';
      else if(estado!=='liberado') clienteEstado.textContent='Calendário em preparação';
      else clienteEstado.textContent=mes+' | '+itens.map(i=>i.name).join(' | ');
    };
  `});

  await page.locator('#gabiEnviar').click();
  await page.waitForFunction(()=>gabiEstado.textContent==='aguardando_interna');
  exigir(await page.locator('#gabiEstado').innerText()==='aguardando_interna','Gabi clica e o mesmo documento entra em aguardando_interna');

  await page.locator('#amandaPublicar').click();
  await page.waitForFunction(()=>amandaEstado.textContent==='liberado');
  exigir(await page.locator('#amandaEstado').innerText()==='liberado','Amanda clica e publica setembro com recibo confirmado');
  const estados=await page.evaluate(()=>({
    agosto:estadoMesCal(__doc,'2026-08',new Date('2026-08-19T15:00:00-03:00')),
    setembro:estadoMesCal(__doc,'2026-09',new Date('2026-08-19T15:00:00-03:00')),
    outubro:estadoMesCal(__doc,'2026-10',new Date('2026-08-19T15:00:00-03:00')),
    itens:__doc.items.map(i=>i.itemId),tocados:__tocados
  }));
  exigir(estados.agosto==='liberado'&&estados.setembro==='liberado'&&estados.outubro==='rascunho','publicar setembro preserva agosto e o rascunho de outubro de forma isolada');
  exigir(JSON.stringify(estados.itens)===JSON.stringify(['ago-1','set-1','out-1']),'a cadeia não apaga nem duplica conteúdos de outros meses');

  await page.locator('#ceciliaOutubro').click();
  await page.waitForFunction(()=>ceciliaEstado.textContent.includes('calArquivo=iphone-campo-largo'));
  let link=await page.locator('#ceciliaEstado').innerText();
  exigir(link.includes('calArquivo=iphone-campo-largo')&&link.includes('mes=2026-10'),'Cecília abre outubro internamente mesmo antes da publicação ao cliente');

  await page.locator('#ceciliaSetembro').click();
  await page.waitForFunction(()=>ceciliaEstado.textContent.includes('calendario.html'));
  link=await page.locator('#ceciliaEstado').innerText();
  exigir(link.includes('cliente=iphone-campo-largo')&&link.includes('mes=2026-09')&&link.includes('token-isolado-confirmado'),'Cecília prepara o link do mês publicado exato sem alterar estado');

  await page.locator('#clienteAgosto').click();
  exigir((await page.locator('#clienteEstado').innerText()).includes('Arquivo de agosto'),'cliente continua abrindo agosto depois da publicação de setembro');
  await page.locator('#clienteSetembro').click();
  exigir((await page.locator('#clienteEstado').innerText()).includes('Lançamento de setembro'),'cliente abre setembro publicado e vê o conteúdo correto');
  await page.locator('#clienteOutubro').click();
  exigir(await page.locator('#clienteEstado').innerText()==='Calendário em preparação','cliente não vê o rascunho de outubro e recebe mensagem correta');
} finally {
  await browser.close();
}

console.log(`REGRESSÃO V89 UI CADEIA DE CALENDÁRIOS: APROVADA (${total} verificações com cliques reais)`);
