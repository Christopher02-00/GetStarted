#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const calendario=ler('calendario.html');
const calendarios=ler('calendarios.html');
const portal=ler('portal-cliente.html');
let total=0;
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('V88: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('V88: trecho ausente '+inicio);
  return fonte.slice(a,b);
}

exigir(calendario===calendarios,'calendario.html e calendarios.html continuam byte a byte idênticos');
for(const fonte of [escritorio,calendario,portal]) exigir(fonte.includes('2026-08-19-calendarios-stories-v90'),'todos os consumidores identificam a mesma V90');

const helper=trecho(escritorio,"const PRIMEIRA_COMPETENCIA_ARQUIVO_AUTOMATICO='2026-10';",'  window.estadoPublicadoEfetivoCalendario');
const contexto={Date};
vm.createContext(contexto);
new vm.Script(`${helper}\nglobalThis.estado=estadoPublicadoEfetivoCalendario;`).runInContext(contexto);
const estado=contexto.estado;
exigir(estado('2026-08',{status:'arquivado',substituidoPor:'2026-09'},new Date('2027-02-01T12:00:00-03:00'))==='liberado','agosto arquivado pela regra antiga volta a ficar aberto');
exigir(estado('2026-09',{status:'arquivado',substituidoPor:'2026-10'},new Date('2027-02-01T12:00:00-03:00'))==='liberado','setembro arquivado pela regra antiga volta a ficar aberto');
exigir(estado('2026-08',{status:'arquivado',arquivamentoManual:true},new Date('2027-02-01T12:00:00-03:00'))==='arquivado','arquivo manual explícito não é reaberto por compatibilidade');
exigir(estado('2026-10',{status:'liberado'},new Date('2026-11-29T23:59:59-03:00'))==='liberado','outubro permanece aberto antes do prazo de 30 dias');
exigir(estado('2026-10',{status:'liberado'},new Date('2026-11-30T00:00:00-03:00'))==='arquivado','outubro arquiva 30 dias depois do fim do mês');
exigir(estado('2026-10',{status:'liberado',reabertoAte:'2027-01-15T12:00:00-03:00'},new Date('2027-01-10T12:00:00-03:00'))==='liberado','reabertura mantém somente o mês escolhido disponível durante o prazo');
exigir(estado('2026-10',{status:'liberado',reabertoAte:'2027-01-15T12:00:00-03:00'},new Date('2027-01-16T12:00:00-03:00'))==='arquivado','mês reaberto volta ao arquivo ao terminar o prazo');

const publicar=trecho(escritorio,'function mapaAprovacaoAposPublicar','  window.mapaAprovacaoAposPublicar');
const c2={}; vm.createContext(c2); new vm.Script(`${publicar}\nglobalThis.publicar=mapaAprovacaoAposPublicar;`).runInContext(c2);
const mapa=c2.publicar({'2026-08':{status:'liberado',em:'original'},'2026-10':{status:'rascunho'}},'2026-09','Amanda','2026-08-19T12:00:00.000Z',['2026-08']);
exigir(mapa['2026-08'].status==='liberado'&&mapa['2026-08'].em==='original','publicar setembro não altera agosto');
exigir(mapa['2026-09'].status==='liberado','publicar libera somente setembro');
exigir(mapa['2026-10'].status==='rascunho','publicar setembro não altera outubro em produção');
exigir(!publicar.includes("status:'arquivado'")&&!publicar.includes('substituidoPor:alvo'),'publicação não contém mais o arquivamento lateral antigo');

const reabrir=trecho(escritorio,'window.reabrirCalendarioArquivado=async function','  window.enviarUmCalendario');
exigir(reabrir.includes('runTransaction')&&reabrir.includes('const snap=await tx.get(ref)'),'reabertura relê o mês dentro de transação');
exigir(reabrir.includes("estadoMesCal(cal,mes,agora)!=='arquivado'")&&reabrir.includes('reabertoAte:ate.toISOString()'),'reabertura exige arquivo confirmado e grava prazo isolado');
exigir(reabrir.includes('const recibo=await getDoc(ref)')&&reabrir.includes("estadoMesCal(recibo.data()||{},mes)!=='liberado'"),'reabertura exige recibo de liberação');
exigir(!/deleteDoc|\.delete\(/.test(reabrir),'reabertura não apaga calendário nem outro mês');

const disparo=trecho(escritorio,'async function dispararCalendarios','  /* Aprovação e publicação são uma única decisão da Amanda.');
exigir(!disparo.includes('outrosAtivos')&&!disparo.includes('ativosAntes'),'publicação não impõe mais um único mês público');
exigir(disparo.includes('outros meses preservados'),'histórico registra a preservação dos outros meses');

for(const [nome,fonte] of [['Escritório',escritorio],['calendário direto',calendario],['Portal',portal]]){
  exigir(fonte.includes("PRIMEIRA_COMPETENCIA_ARQUIVO_AUTOMATICO='2026-10'"),nome+' aplica a mesma data inicial');
  exigir(fonte.includes("['2026-08','2026-09']")&&fonte.includes('reabertoAte'),nome+' preserva agosto/setembro e respeita reabertura');
}

exigir(escritorio.includes("'ikn': 'cliente avulso'")&&escritorio.includes("'ikn brasil': 'cliente avulso'")&&escritorio.includes("'x joias': 'cliente avulso'"),'IKN, IKN Brasil e X Joias são avulsos confirmados');
exigir(escritorio.includes("FORA_DA_META_SEMENTE[nome] === 'cliente avulso'")&&escritorio.includes("return marca(slug, 'avulso', 'avulso confirmado pela gestão')"),'casta avulsa confirmada vence contrato legado inconsistente');
exigir(escritorio.includes('tipoOperacionalConfirmado')&&escritorio.includes("motivo==='cliente avulso'")&&escritorio.includes("tipo:'avulso'"),'Central projeta os avulsos confirmados como avulsos');
exigir(escritorio.includes("ativos.filter(cliente=>cliente?.tipo==='mensalista')"),'agenda de contatos continua aceitando somente recorrentes');

for(const [slug,nome] of [
  ['acougue-sao-joaquim','Açougue São Joaquim'],
  ['iphone-campo-largo','iPhone Campo Largo'],
  ['joaquin-assados','Joaquin Assados'],
  ['zeiss','Zeiss']
]){
  exigir(escritorio.includes(`['${slug}','${nome}']`),nome+' permanece na carteira mensalista de compatibilidade');
}
const carteira=trecho(escritorio,'async function carregarClientesExtras','  /* ===== CLIENTE "SÓ EDIÇÃO"');
exigir(carteira.includes("dados?.tipoCliente!=='mensalista'")&&carteira.includes('Object.entries(configuracoes)'), 'mensalista existente somente em clientes_config também entra na carteira operacional');
exigir(carteira.includes('clienteInativoEfetivo(dados)')&&carteira.includes('MENSALISTAS_OPERACIONAIS_CONFIRMADOS.forEach'), 'projeção mensalista preserva inativação e compatibilidade sem criar dados');
const fonteCarteira=trecho(escritorio,'  const MENSALISTAS_OPERACIONAIS_CONFIRMADOS = new Map([','  /* ===== CLIENTE "SÓ EDIÇÃO"');
const docsFake=itens=>({forEach(fn){itens.forEach(([id,dados])=>fn({id,data:()=>dados}));}});
const contextoCarteira={
  console,
  db:{},
  collection:(_db,nome)=>nome,
  getDocs:async nome=>nome==='clientes_config'
    ? docsFake([
        ['acougue-sao-joaquim',{tipoCliente:'mensalista',nome:'Açougue São Joaquim'}],
        ['iphone-campo-largo',{tipoCliente:'mensalista',nome:'iPhone Campo Largo'}],
        ['novo-mensalista',{tipoCliente:'mensalista',nome:'Novo Mensalista'}],
        ['mensalista-inativo',{tipoCliente:'mensalista',nome:'Mensalista Inativo',clienteInativo:true}],
        ['ikn-brasil',{tipoCliente:'avulso',nome:'IKN Brasil'}],
        ['x-joias',{tipoCliente:'avulso',nome:'X Joias'}]
      ])
    : docsFake([]),
  slugClienteCanonico:slug=>String(slug||''),
  nomeClienteCanonico:(_slug,nome)=>String(nome||''),
  nomeDeSlugSeguro:slug=>String(slug||'').replace(/-/g,' '),
  clienteInativoEfetivo:dados=>dados?.clienteInativo===true,
  normNomeCliente:v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim(),
  FORA_DA_META_SEMENTE:{ikn:'cliente avulso','ikn brasil':'cliente avulso','x joias':'cliente avulso'}
};
vm.createContext(contextoCarteira);
new vm.Script(`${fonteCarteira}\nglobalThis.executarCarteira=carregarClientesExtras;globalThis.lista=CLIENTES_LISTA;`).runInContext(contextoCarteira);
await contextoCarteira.executarCarteira();
const slugsCarteira=new Set(contextoCarteira.lista.map(c=>c.slug));
for(const slug of ['acougue-sao-joaquim','iphone-campo-largo','joaquin-assados','zeiss','novo-mensalista'])
  exigir(slugsCarteira.has(slug),'execução real da projeção inclui '+slug);
exigir(!slugsCarteira.has('mensalista-inativo'),'execução real da projeção mantém mensalista inativo fora');
exigir(!slugsCarteira.has('ikn-brasil')&&!slugsCarteira.has('x-joias'),'execução real da projeção não promove config avulsa a mensalista');
const casta=trecho(escritorio,'window.castaDosClientes = async function','  window.castaDoClienteSync');
exigir(casta.indexOf("FORA_DA_META_SEMENTE[nome] === 'cliente avulso'")<casta.indexOf('MENSALISTAS_OPERACIONAIS_CONFIRMADOS.has(apelido)'), 'avulso confirmado continua vencendo a compatibilidade mensalista');
exigir(casta.indexOf('explicito[apelido]')<casta.indexOf('MENSALISTAS_OPERACIONAIS_CONFIRMADOS.has(apelido)'), 'classificação manual explícita continua vencendo a compatibilidade legada');

const acesso=trecho(escritorio,'function millisDoLimiteDeAcessoPortal','  async function garantirTokensDoCliente');
const c3={Date}; c3.window=c3; vm.createContext(c3); new vm.Script(`${acesso}\nglobalThis.estadoAcesso=estadoAcessoPortalParaLink;`).runInContext(c3);
const validarAcesso=c3.estadoAcesso;
const agora=Date.parse('2026-08-19T12:00:00-03:00');
exigir(validarAcesso({ativo:true,token:'canonico'},'canonico',agora).ok===true,'link canônico ativo e vigente é confirmado antes da cópia');
exigir(validarAcesso({ativo:false,token:'canonico'},'canonico',agora).codigo==='inativo','acesso desativado é bloqueado antes de chegar ao cliente');
exigir(validarAcesso({ativo:true,token:'canonico',ativoAte:'2026-08-18T12:00:00-03:00'},'canonico',agora).codigo==='expirado','acesso vencido é bloqueado antes da cópia');
exigir(validarAcesso({ativo:true,token:'canonico',ativoAte:'valor-inválido'},'canonico',agora).codigo==='vigencia_invalida','vigência ilegível falha fechada em vez de produzir link quebrado');
exigir(validarAcesso({ativo:true,token:'outro'},'canonico',agora).codigo==='token_divergente','recibo com token diferente bloqueia a cópia');
const tokens=trecho(escritorio,'async function garantirTokensDoCliente','  function copiarTextoLegado');
exigir(tokens.includes('estadoAcessoPortalParaLink(atual')&&tokens.includes('estadoAcessoPortalParaLink(confirmado,esperado.token'),'gerador valida estado antes da transação e novamente no recibo');

for(const [arquivo,fonte] of [['escritorio.html',escritorio],['portal-cliente.html',portal],['calendario.html',calendario]]){
  const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/\bsrc\s*=/.test(m[1]));
  for(const bloco of blocos){
    if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
    else new vm.Script(bloco[2]);
  }
  exigir(true,arquivo+' mantém JavaScript inline sintaticamente válido');
}

console.log(`REGRESSÃO V88 ARQUIVO/AVULSOS: APROVADA (${total} verificações)`);
