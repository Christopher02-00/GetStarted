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
  if(!condicao) throw new Error('V90 carteira real: '+mensagem);
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

const docsFake=itens=>({forEach(fn){itens.forEach(([id,dados])=>fn({id,data:()=>dados}));}});
const contexto={
  console,
  window:{},
  db:{},
  collection:(_db,nome)=>nome,
  getDocs:async nome=>{
    if(nome==='clientes_config') return docsFake([
      ['ikn-brasil',{tipoCliente:'avulso',nome:'IKN Brasil'}],
      ['x-joias',{tipoCliente:'avulso',nome:'X Joias'}],
      ['she-joias',{tipoCliente:'mensalista',tipoEntrega:'entrega_direta',nome:'She Joias'}],
      ['saida-efetiva',{tipoCliente:'mensalista',clienteInativo:true,nome:'Saída efetiva'}]
    ]);
    if(nome==='clientes_extras') return docsFake([
      ['acougue-sao-joaquim',{slug:'acougue-sao-joaquim',nome:'Açougue São Joaquim',casta:'outro'}],
      ['cookiery',{slug:'cookiery',nome:'Cookiery',casta:'outro'}],
      ['dra-julia',{slug:'dra-julia',nome:'Dra Júlia',casta:'outro'}],
      ['emanuelle',{slug:'emanuelle',nome:'Emanuelle Bernaski Nutri',casta:'outro'}],
      ['hitech',{slug:'hitech',nome:'Hitech',casta:'outro'}],
      ['iphone-campo-largo',{slug:'iphone-campo-largo',nome:'iPhone Campo Largo',casta:'outro'}],
      ['joaquin-assados',{slug:'joaquin-assados',nome:'Joaquin Assados',casta:'outro'}],
      ['avulso-explicito',{slug:'avulso-explicito',nome:'Avulso explícito',casta:'avulso'}]
    ]);
    return docsFake([]);
  },
  slugClienteCanonico:slug=>({emanuelle:'emanuelle-bernaski-nutri','cliente-rodrigo':'rodrigo'}[String(slug||'')]||String(slug||'')),
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
  Map, Promise
};
contexto.window=contexto;
vm.createContext(contexto);
new vm.Script(carga+'\n'+carteira+'\nglobalThis.executar=window.clientesCalendarioRecorrentesConfirmados;').runInContext(contexto);
const lista=await contexto.executar();
const slugs=new Set(lista.map(c=>c.slug));

const mensalistasEsperados=[
  'acougue-sao-joaquim','cookiery','dra-julia','emanuelle-bernaski-nutri',
  'hitech','iphone-campo-largo','joaquin-assados'
];
mensalistasEsperados.forEach(slug=>exigir(slugs.has(slug),slug+' permanece na carteira apesar da casta legada ambígua'));
exigir(!slugs.has('ikn-brasil')&&!slugs.has('x-joias'),'IKN e X Joias permanecem fora como avulsos confirmados');
exigir(!slugs.has('she-joias'),'entrega direta permanece fora da carteira editorial');
exigir(!slugs.has('saida-efetiva'),'saída efetiva permanece fora');
exigir(!slugs.has('avulso-explicito'),'casta avulsa explícita não é promovida por tolerância legada');
exigir(slugs.has('hitech')&&!slugs.has('rodrigo'),'Hitech permanece mensalista separado e Rodrigo só edição fica fora');

console.log(`REGRESSÃO V90 CARTEIRA REAL: APROVADA (${total} verificações)`);
