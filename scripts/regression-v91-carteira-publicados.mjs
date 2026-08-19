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
  if(!condicao) throw new Error('V91 carteira/publicados: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio), b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return fonte.slice(a,b);
}

exigir(escritorio.includes('2026-08-19-calendarios-stories-v91'),'marcador V91 está presente');
exigir(escritorio.includes('mensalistaConfirmadoDisponivelNoCalendario'),'há uma única decisão explícita para legados confirmados');
exigir(escritorio.includes('consolidarCalendariosPublicadosDaCarteira'),'arquivo público consolida aliases e elimina identidades fora da carteira');

const carga=trecho(escritorio,
  '  const MENSALISTAS_OPERACIONAIS_CONFIRMADOS = new Map([',
  '  /* ===== CLIENTE "SÓ EDIÇÃO"');
const carteira=trecho(escritorio,
  '  window.clientesCalendarioRecorrentesConfirmados = async function(){',
  '  /* ===== VÍDEO DE TRÁFEGO');

const docsFake=itens=>({forEach(fn){itens.forEach(([id,dados])=>fn({id,data:()=>dados}));}});
const contexto={
  console,window:{},db:{},Map,Promise,
  collection:(_db,nome)=>nome,
  getDocs:async nome=>{
    if(nome==='clientes_config') return docsFake([
      ['iphone-campo-largo',{tipoCliente:'avulso',clienteInativo:true,nome:'iPhone Campo Largo'}],
      ['acougue-sao-joaquim',{tipoCliente:'mensalista',clienteInativo:true,saidaProgramadaPara:'2026-09-15',nome:'Açougue São Joaquim'}],
      ['joaquin-assados',{tipoCliente:'mensalista',clienteInativo:true,saidaProgramadaPara:'2026-09-15',nome:'Joaquin Assados'}],
      ['hitech',{tipoCliente:'mensalista',nome:'Hitech'}],
      ['zeiss',{tipoCliente:'mensalista',nome:'Zeiss'}],
      ['saida-efetiva',{tipoCliente:'mensalista',clienteInativo:true,inativoDesde:'2026-08-01',nome:'Saída efetiva'}],
      ['ikn-brasil',{tipoCliente:'avulso',nome:'IKN Brasil'}],
      ['x-joias',{tipoCliente:'avulso',nome:'X Joias'}]
    ]);
    if(nome==='clientes_extras') return docsFake([
      ['iphone-campo-largo',{slug:'iphone-campo-largo',nome:'iPhone Campo Largo',casta:'avulso'}],
      ['acougue-sao-joaquim',{slug:'acougue-sao-joaquim',nome:'Açougue São Joaquim',casta:'outro'}],
      ['joaquin-assados',{slug:'joaquin-assados',nome:'Joaquin Assados',casta:'outro'}],
      ['hitech',{slug:'hitech',nome:'Hitech',casta:'outro'}],
      ['zeiss',{slug:'zeiss',nome:'Zeiss',casta:'outro'}]
    ]);
    return docsFake([]);
  },
  hojeLocal:()=> '2026-08-19',
  dataOperacionalISO:v=>String(v||'').slice(0,10),
  saidaClienteJaEfetiva:(dados,hoje='2026-08-19')=>{
    const data=String(dados?.dataSaida||dados?.saidaProgramadaPara||'').slice(0,10);
    return !!data&&data<=hoje;
  },
  slugClienteCanonico:slug=>({'zeens':'zeiss','cliente-rodrigo':'rodrigo'}[String(slug||'')]||String(slug||'')),
  nomeClienteCanonico:(_slug,nome)=>String(nome||''),
  nomeDeSlugSeguro:slug=>String(slug||'').replace(/-/g,' '),
  clienteInativoEfetivo:dados=>dados?.clienteInativo===true,
  normNomeCliente:v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim(),
  FORA_DA_META_SEMENTE:{'ikn brasil':'cliente avulso','x joias':'cliente avulso'}
};
contexto.window=contexto;
vm.createContext(contexto);
new vm.Script(carga+'\n'+carteira+'\nglobalThis.executar=window.clientesCalendarioRecorrentesConfirmados;').runInContext(contexto);
const lista=await contexto.executar();
const slugs=new Set(lista.map(c=>c.slug));

['iphone-campo-largo','acougue-sao-joaquim','joaquin-assados','hitech','zeiss'].forEach(slug=>
  exigir(slugs.has(slug),slug+' permanece disponível enquanto é mensalista confirmado e não saiu efetivamente'));
exigir(!slugs.has('saida-efetiva'),'saída efetiva continua fora');
exigir(!slugs.has('ikn-brasil')&&!slugs.has('x-joias'),'IKN e X Joias continuam fora como avulsos');
exigir(!slugs.has('rodrigo'),'Rodrigo só edição continua fora do calendário');

const publico=trecho(escritorio,
  '  function consolidarCalendariosPublicadosDaCarteira(',
  '  window.renderFilaEnvioCalendarios = async function(){');
const ctxPublico={
  window:{},Map,
  slugClienteCanonico:slug=>({'zeens':'zeiss'}[String(slug||'')]||String(slug||'')),
  mesesDeCalendario:cal=>[...new Set((cal.items||[]).map(i=>i.mes).filter(Boolean))],
  itensDoMesCalendario:(cal,mes)=>(cal.items||[]).filter(i=>i.mes===mes&&!i.excluido),
  estadoMesCal:(cal,mes)=>cal.aprovacaoMeses?.[mes]?.status||'rascunho',
  nomeDeSlugSeguro:slug=>slug
};
ctxPublico.window=ctxPublico;
vm.createContext(ctxPublico);
new vm.Script(publico+'\nglobalThis.consolidar=consolidarCalendariosPublicadosDaCarteira;').runInContext(ctxPublico);
const snapPublico=docsFake([
  ['zeiss',{client:'Zeiss legado',items:[{mes:'2026-08'},{mes:'2026-08'}],aprovacaoMeses:{'2026-08':{status:'liberado'}}}],
  ['zeens',{client:'Zeiss alias',items:[{mes:'2026-08'}],aprovacaoMeses:{'2026-08':{status:'liberado'}}}],
  ['hitech',{client:'Hitech',items:[{mes:'2026-09'}],aprovacaoMeses:{'2026-09':{status:'liberado'}}}],
  ['auditoria-v87-nao-e-cliente',{client:'AUDITORIA V87 — NÃO É CLIENTE',items:[{mes:'2026-09'}],aprovacaoMeses:{'2026-09':{status:'liberado'}}}],
  ['ikn-brasil',{client:'IKN Brasil',items:[{mes:'2026-09'}],aprovacaoMeses:{'2026-09':{status:'liberado'}}}]
]);
const linhas=ctxPublico.consolidar(snapPublico,[{slug:'zeiss',nome:'Zeiss'},{slug:'hitech',nome:'Hitech'}]);
exigir(linhas.length===2,'arquivo público contém somente identidades da carteira e uma linha por cliente/mês');
exigir(linhas.filter(l=>l.slug==='zeiss'&&l.mes==='2026-08').length===1,'Zeiss/Agosto não duplica entre aliases');
exigir(linhas.some(l=>l.slug==='zeiss'&&l.qtd===2),'a cópia mais completa de Zeiss é preservada');
exigir(!linhas.some(l=>/auditoria|ikn/i.test(l.nome)),'teste V87 e IKN não aparecem como calendários públicos');

console.log(`REGRESSÃO V91 CARTEIRA/PUBLICADOS: APROVADA (${total} verificações)`);
