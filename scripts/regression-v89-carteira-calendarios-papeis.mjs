#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
let total=0;
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('V89 carteira/papéis: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio), b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return fonte.slice(a,b);
}

const carga=trecho(escritorio,
  '  const MENSALISTAS_OPERACIONAIS_CONFIRMADOS = new Map([',
  '  /* ===== CLIENTE "SÓ EDIÇÃO"');
const carteira=trecho(escritorio,
  '  window.clientesCalendarioRecorrentesConfirmados = async function(){',
  '  /* ===== VÍDEO DE TRÁFEGO');
const visao=trecho(escritorio,
  '  window.renderVisaoCalendarios = async function(sufixo){',
  '  /* ===== REFEITA — 28/07/2026');
const central=trecho(escritorio,
  '  window.renderControleEditorialCalendarios = async function(){',
  '  window.aplicarFiltrosControleEditorialCalendarios = function(){');

exigir(!carteira.includes('clientesDeConteudoRecorrente()')&&!carteira.includes('castaDosClientes()'),
  'a carteira de calendário não consulta a classificação financeira/gerencial');
exigir(carga.includes('__carteiraCalendarioOperacionalConfirmada'),
  'a projeção operacional mantém um retrato confirmado próprio');
exigir(visao.includes('Promise.all([obterCalendariosCompartilhados(),clientesCalendarioRecorrentesConfirmados()])'),
  'Visão do mês trata calendário e carteira dentro da mesma barreira de erro');
exigir(!central.includes('castaDosClientes()')&&!central.includes('contratos_cliente')&&!central.includes('pagamentos_mensais')&&!central.includes('clientes_encerrados'),
  'Central Editorial da Gabi não consulta classificação financeira/gerencial');

const docsFake=itens=>({forEach(fn){itens.forEach(([id,dados])=>fn({id,data:()=>dados}));}});
const leituras=[];
const contexto={
  console,
  window:{},
  usuarioAtual:'Gabrielle',
  db:{},
  collection:(_db,nome)=>nome,
  getDocs:async nome=>{
    leituras.push(nome);
    if(['contratos_cliente','pagamentos_mensais','clientes_encerrados'].includes(nome)){
      const erro=new Error('Missing or insufficient permissions'); erro.code='permission-denied'; throw erro;
    }
    if(nome==='clientes_config') return docsFake([
      ['iphone-campo-largo',{tipoCliente:'mensalista',nome:'iPhone Campo Largo'}],
      ['novo-mensalista',{tipoCliente:'mensalista',nome:'Novo Mensalista'}],
      ['ikn-brasil',{tipoCliente:'avulso',nome:'IKN Brasil'}],
      ['x-joias',{tipoCliente:'avulso',nome:'X Joias'}],
      ['mensalista-inativo',{tipoCliente:'mensalista',nome:'Inativo',clienteInativo:true}]
    ]);
    if(nome==='clientes_extras') return docsFake([]);
    return docsFake([]);
  },
  slugClienteCanonico:slug=>({'cliente-rodrigo':'rodrigo',zeens:'zeiss'}[String(slug||'')]||String(slug||'')),
  nomeClienteCanonico:(_slug,nome)=>String(nome||''),
  nomeDeSlugSeguro:slug=>String(slug||'').replace(/-/g,' '),
  hojeLocal:()=> '2026-08-19',
  dataOperacionalISO:valor=>String(valor||'').slice(0,10),
  saidaClienteJaEfetiva:(dados,hoje='2026-08-19')=>{
    const data=String(dados?.dataSaida||dados?.saidaProgramadaPara||'').slice(0,10);
    return !!data&&data<=hoje;
  },
  clienteInativoEfetivo:dados=>dados?.clienteInativo===true,
  normNomeCliente:v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim(),
  FORA_DA_META_SEMENTE:{ikn:'cliente avulso','ikn brasil':'cliente avulso','x joias':'cliente avulso'},
  SLUGS_INTERNOS:['get-started'],
  clientesDeConteudoRecorrente:async()=>{ await contexto.getDocs('contratos_cliente'); return []; },
  castaDosClientes:async()=>{ await contexto.getDocs('pagamentos_mensais'); return {}; },
  __cacheCastaConfirmada:false,
  Map, Promise
};
contexto.window=contexto;
vm.createContext(contexto);
new vm.Script(carga+'\n'+carteira+'\nglobalThis.executar=window.clientesCalendarioRecorrentesConfirmados;').runInContext(contexto);
const lista=await contexto.executar();
const slugs=new Set(lista.map(c=>c.slug));

exigir(slugs.has('iphone-campo-largo')&&slugs.has('novo-mensalista'),
  'Gabrielle recebe mensalistas configurados mesmo com financeiro negado');
exigir(!slugs.has('ikn-brasil')&&!slugs.has('x-joias')&&!slugs.has('get-started')&&!slugs.has('rodrigo'),
  'avulsos, cliente interno e plano só edição permanecem fora');
exigir(!slugs.has('mensalista-inativo'),'cliente inativo não volta à carteira');
exigir(!leituras.some(n=>['contratos_cliente','pagamentos_mensais','clientes_encerrados'].includes(n)),
  'execução sob papel Gabrielle não tenta nenhuma coleção financeira/gerencial');

console.log(`REGRESSÃO V89 CARTEIRA/PAPÉIS: APROVADA (${total} verificações)`);
