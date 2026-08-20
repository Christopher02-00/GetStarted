#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fonte=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('V93 consistência: '+mensagem); console.log('PASS ',mensagem); }
function trecho(inicio,fim){ const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return fonte.slice(a,b); }

exigir(fonte.includes('2026-08-20-consistencia-clientes-v93'),'build preserva a entrega-base V93 na cadeia de patches');
exigir(fonte.includes('2026-08-20-saneamento-zeiss-v94'),'build identifica inequivocamente a correção V94');
const helper=trecho('  function consolidarDocumentosClientePorIdentidade','  window.consolidarDocumentosClientePorIdentidade');
const ctx={
  slugClienteCanonico:s=>({'zeens':'zeiss','otica-visao-araucaria':'zeiss'}[String(s||'')]||String(s||'')),
  contratoOperacionalAtivo:v=>v?.status==='ativo'&&v?.ativo!==false&&v?.excluido!==true,
  clienteInativoEfetivo:v=>v?.clienteInativo===true
};
vm.createContext(ctx); vm.runInContext(helper+'\nthis.fn=consolidarDocumentosClientePorIdentidade;',ctx);
const snap=itens=>({docs:itens.map(([id,dados])=>({id,data:()=>dados}))});
let mapa=ctx.fn(snap([
  ['zeiss',{status:'encerrado',ativo:false,excluido:true,valorVigente:1700}],
  ['zeens',{status:'ativo',ativo:true,excluido:false,valorVigente:1700}]
]),'contrato');
exigir(mapa.zeiss.__documentoOrigem==='zeens'&&mapa.zeiss.status==='ativo','contrato ativo do alias vence o canônico arquivado na leitura');
mapa=ctx.fn(snap([
  ['zeiss',{ativo:false,clienteInativo:true,excluido:true}],
  ['zeens',{ativo:true,clienteInativo:false,excluido:false,tipoCliente:'mensalista'}]
]),'config');
exigir(mapa.zeiss.__documentoOrigem==='zeens'&&mapa.zeiss.tipoCliente==='mensalista','configuração ativa do alias mantém Zeiss na operação');
mapa=ctx.fn(snap([
  ['zeiss',{ativo:false,token:'antigo'}],['zeens',{ativo:true,token:'vigente'}]
]),'acesso');
exigir(mapa.zeiss.token==='vigente','Portal ativo do alias vence credencial canônica revogada');

const saneamento=trecho('  function jsonEstavel','  window.salvarClienteAtivoCentral');
exigir(saneamento.includes("runTransaction(db,async tx=>")&&saneamento.includes('const snaps=await Promise.all(todas.map(r=>tx.get(r)))'),'saneamento relê todas as fontes antes de escrever');
exigir(saneamento.includes('assinaturaItensZeiss(calC)!==assinaturaItensZeiss(calA)'),'conteúdos diferentes bloqueiam a fusão antes de qualquer perda');
exigir(saneamento.includes("status:'cancelado',excluido:true,unificadoEm:'zeiss'")&&saneamento.includes("doc(db,'pagamentos_mensais','zeiss_'+mes)"),'mensalidade duplicada é preservada como cancelada e a competência canônica é determinística');
exigir(saneamento.includes("tokenAtivo=String((acessoA.ativo!==false&&acessoA.token)||acessoC.token||'')"),'token atualmente ativo é preservado antes de revogar o alias');
exigir(!saneamento.includes('deleteDoc('),'saneamento não exclui documentos fisicamente');
exigir(saneamento.includes("tipoCliente:'mensalista'")&&saneamento.includes('semConteudoRecorrente:false')&&saneamento.includes('motivoSemConteudo:deleteField()'),'Zeiss canônica volta como mensalista recorrente sem marca de saída');

const central=trecho('  window.renderCentralEntradaClientes = async function','  window.filtrarArquivoClientesUnico');
exigir(central.includes("const configs=consolidarDocumentosClientePorIdentidade(configsSnap,'config')")&&central.includes("const contratos=consolidarDocumentosClientePorIdentidade(contratosSnap,'contrato')")&&central.includes("const acessos=consolidarDocumentosClientePorIdentidade(acessosSnap,'acesso')"),'Central usa a mesma identidade consolidada para configuração, contrato e Portal');
exigir(central.includes("v.tipo==='mensalista'?(v.token?")&&central.includes("Projeto pontual: não possui Portal nem saída mensalista."),'cartão avulso não oferece Portal nem saída de mensalista');
exigir(central.includes("v.leadColecao==='leads_avulsos'&&v.leadId")&&central.includes('Finalizar projeto e arquivar'),'avulso originado no funil recebe somente finalização de projeto');
exigir(central.includes("ativos.filter(v=>v.tipo==='mensalista')"),'seletor de saída continua limitado a mensalistas');

{
  const DEL={__delete:true};
  const banco=new Map([
    ['clientes_config/zeiss',{nome:'Zeiss',ativo:false,clienteInativo:true,excluido:true,unificadoEm:'zeens'}],
    ['clientes_config/zeens',{nome:'Zeens',ativo:true,clienteInativo:false,excluido:false,tipoCliente:'mensalista'}],
    ['clientes_config/otica-visao-araucaria',{ativo:false,clienteInativo:true,excluido:true}],
    ['contratos_cliente/zeiss',{clienteNome:'Zeiss',status:'encerrado',ativo:false,encerrado:true,excluido:true,valorVigente:1700,cortesiaMeses:['2026-08']}],
    ['contratos_cliente/zeens',{clienteNome:'Zeens',status:'ativo',ativo:true,encerrado:false,excluido:false,valorVigente:1700,cortesiaMeses:['2026-08']}],
    ['clientes_acesso/zeiss',{nome:'Zeiss',ativo:false,token:'token-antigo'}],
    ['clientes_acesso/zeens',{nome:'Zeens',ativo:true,token:'token-vigente'}],
    ['clientes_portal_tokens/token-antigo',{cliente:'zeiss',ativo:false}],
    ['clientes_portal_tokens/token-vigente',{cliente:'zeens',ativo:true}],
    ['calendarios/zeiss',{client:'Zeiss',items:[{itemId:'a',mes:'2026-08',name:'Conteúdo'}]}],
    ['calendarios/zeens',{client:'Zeens',items:[{itemId:'a',mes:'2026-08',name:'Conteúdo'}]}],
    ['pagamentos_mensais/zeiss_2026-08',{cliente:'zeiss',competencia:'2026-08',valorDevido:1700,status:'isento'}],
    ['pagamentos_mensais/zeens_2026-08',{cliente:'zeens',competencia:'2026-08',valorDevido:1700,status:'aberto'}],
    ['pagamentos_mensais/zeens_2026-10',{cliente:'zeens',competencia:'2026-10',valorDevido:1700,status:'aberto',unificadoEm:'legado'}],
    ['clientes_extras/zeens',{slug:'zeens',nome:'Zeens',ativo:true,excluido:false}]
  ]);
  const ref=(colecao,id)=>({path:colecao+'/'+id,id});
  const snap=r=>({id:r.id,ref:r,exists:()=>banco.has(r.path),data:()=>structuredClone(banco.get(r.path)||{})});
  const listar=colecao=>({docs:[...banco].filter(([p])=>p.startsWith(colecao+'/')).map(([p])=>{const r=ref(colecao,p.slice(colecao.length+1));return snap(r);}),forEach(fn){this.docs.forEach(fn);}});
  const aplicar=(r,dados,merge)=>{
    const atual=merge?structuredClone(banco.get(r.path)||{}):{};
    for(const [k,v] of Object.entries(structuredClone(dados))){ if(v&&v.__delete) delete atual[k]; else atual[k]=v; }
    banco.set(r.path,atual);
  };
  const lab={
    window:{},usuarioAtual:'Chris',db:{},console,confirm:()=>true,
    doc:(_db,c,id)=>ref(c,id),collection:(_db,c)=>c,
    getDoc:async r=>snap(r),getDocs:async c=>listar(c),
    runTransaction:async(_db,fn)=>fn({get:async r=>snap(r),set:(r,d,o)=>{
      const merge=o?.merge===true;
      if(!merge&&Object.values(d).some(v=>v&&v.__delete)) throw new Error('deleteField() exige set com merge');
      aplicar(r,d,merge);
    }}),
    deleteField:()=>DEL,serverTimestamp:()=>({__server:true}),
    statusMensalidadeCanonico:v=>['pago','isento','cancelado'].includes(v?.status)?v.status:'aberto',
    contratoOperacionalAtivo:v=>v?.status==='ativo'&&v?.ativo!==false&&v?.encerrado!==true&&v?.excluido!==true,
    clienteInativoEfetivo:v=>v?.clienteInativo===true,
    slugClienteCanonico:s=>({'zeens':'zeiss','otica-visao-araucaria':'zeiss'}[String(s||'')]||String(s||'')),
    mostrarToast:()=>{},limparCacheIndicadores:()=>{}
  };
  lab.window.limparCacheDeClientes=()=>{}; lab.window.renderCentralEntradaClientes=async()=>{};
  vm.createContext(lab); vm.runInContext(saneamento,lab);
  const aplicado=await lab.window.sanearIdentidadeZeissZeens();
  exigir(aplicado===true,'clique confirmado executa o saneamento completo no laboratório transacional');
  exigir(banco.get('contratos_cliente/zeiss').status==='ativo'&&banco.get('contratos_cliente/zeens').status==='encerrado','contrato canônico ativa e alias encerra na mesma transação');
  exigir(banco.get('clientes_acesso/zeiss').token==='token-vigente'&&banco.get('clientes_portal_tokens/token-vigente').cliente==='zeiss'&&banco.get('clientes_portal_tokens/token-vigente').ativo===true,'Portal vigente é transferido para Zeiss sem rotação de token');
  exigir(banco.get('pagamentos_mensais/zeiss_2026-08').status==='isento'&&banco.get('pagamentos_mensais/zeens_2026-08').status==='cancelado','agosto canônico isento é preservado e duplicata aberta é cancelada');
  exigir(banco.get('pagamentos_mensais/zeiss_2026-10').status==='aberto'&&!Object.hasOwn(banco.get('pagamentos_mensais/zeiss_2026-10'),'unificadoEm')&&banco.get('pagamentos_mensais/zeens_2026-10').status==='cancelado','competência existente apenas no alias cria o canônico com merge válido e arquiva a duplicata');
  exigir(banco.get('calendarios/zeiss').items.length===1&&banco.get('calendarios/zeens').items.length===1&&banco.get('calendarios/zeens').excluido===true,'calendário canônico permanece íntegro e alias vira arquivo sem perder itens');
  exigir(banco.get('clientes_config/zeiss').semConteudoRecorrente===false&&!Object.hasOwn(banco.get('clientes_config/zeiss'),'motivoSemConteudo'),'configuração canônica volta à recorrência sem motivo legado');
}

const completar=trecho('  window.salvarContratoClienteIncompleto=async function(slug){','  window.renderContratos = async function');
exigir(completar.includes('semConteudoRecorrente:false')&&completar.includes('motivoSemConteudo:deleteField()'),'completar contrato remove a marca obsoleta que tirava iPhone das rotinas');

const modulos=[...fonte.matchAll(/<script\s+type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
exigir(modulos.length>0,'HTML contém o módulo operacional esperado');
modulos.forEach((codigo,i)=>{ new vm.SourceTextModule(codigo,{identifier:'escritorio-modulo-'+i}); });
exigir(true,'módulo completo do Escritório passa no parser JavaScript');

console.log(`REGRESSÃO V93 CONSISTÊNCIA DE CLIENTES: OK (${total} verificações)`);
