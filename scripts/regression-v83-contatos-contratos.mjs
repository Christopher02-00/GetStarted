#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const rules=ler('firestore.rules');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('FALHOU: '+mensagem); console.log('PASS ',mensagem); }
function trecho(fonte,inicio,fim){
  const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a+inicio.length);
  if(a<0||b<0) throw new Error('Trecho ausente: '+inicio);
  return fonte.slice(a,b);
}

const contatos=trecho(escritorio,'function numeroWhatsAppBrasil','async function carregarContatosFinanceirosChris');
const caixa={window:{},slugsCompatibilidadeCliente:slug=>slug==='rodrigo'?['rodrigo','hitech']:[slug]};
vm.createContext(caixa);
vm.runInContext(`${contatos}\nglobalThis.api={numeroWhatsAppBrasil,contatoLegadoPorIdentidade};`,caixa);
const api=caixa.api;

exigir(api.numeroWhatsAppBrasil('41 99268-8449')==='5541992688449','normalização mantém DDD e acrescenta DDI brasileiro');
exigir(api.numeroWhatsAppBrasil('123')==='','número incompleto continua bloqueado');
exigir(api.contatoLegadoPorIdentidade({rodrigo:{whatsappCobranca:'41 99820-1999'},hitech:{whatsappCobranca:'41 99820-1999'}},'rodrigo').numero==='5541998201999',
  'aliases com o mesmo número produzem uma compatibilidade inequívoca');
const conflito=api.contatoLegadoPorIdentidade({rodrigo:{whatsappCobranca:'41 99820-1999'},hitech:{whatsappCobranca:'41 99999-0000'}},'rodrigo');
exigir(!conflito.numero&&conflito.conflito===true,'aliases divergentes são bloqueados sem escolha automática');

const fonteConsulta=trecho(escritorio,'async function numeroCobrancaConfirmado','function revelarConfirmacaoCobranca');
async function consultar(banco,slug='rodrigo'){
  const contexto={
    usuarioAtual:'Chris',db:{},
    slugClienteCanonico:v=>v,
    slugsCompatibilidadeCliente:v=>v==='rodrigo'?['rodrigo','hitech']:[v],
    numeroWhatsAppBrasil:api.numeroWhatsAppBrasil,
    doc:(_db,col,id)=>col+'/'+id,
    getDoc:async ref=>({exists:()=>Object.hasOwn(banco,ref),data:()=>banco[ref]||{}})
  };
  vm.createContext(contexto);
  vm.runInContext(`${fonteConsulta}\nglobalThis.executar=numeroCobrancaConfirmado;`,contexto);
  return contexto.executar(slug);
}
const privado=await consultar({
  'contatos_clientes_financeiro/rodrigo':{whatsapp:'5541991111111'},
  'clientes_config/rodrigo':{whatsappCobranca:'5541992222222'}
});
exigir(privado.numero==='5541991111111'&&privado.origem==='agenda financeira privada','contato privado vence um legado diferente');
const legado=await consultar({'clientes_config/rodrigo':{whatsappCobranca:'41 99820-1999'},'clientes_config/hitech':{whatsappCobranca:'41 99820-1999'}});
exigir(legado.numero==='5541998201999'&&/compatibilidade/.test(legado.origem),'clique funciona antes da migração quando o legado é inequívoco');
const legadoConflitante=await consultar({'clientes_config/rodrigo':{whatsappCobranca:'41 99820-1999'},'clientes_config/hitech':{whatsappCobranca:'41 99999-0000'}});
exigir(!legadoConflitante.numero&&legadoConflitante.conflito===true,'clique continua desativado diante de conflito real');

const renderMensagens=trecho(escritorio,'window.renderMensagensClientesChris=async function','async function carregarMensalistaRecebidoNosCampos');
exigir(renderMensagens.indexOf('contatos=await carregarContatosFinanceirosChris()')<renderMensagens.indexOf('legados=await carregarContatosLegadosChris()'),
  'tela confirma primeiro a fonte privada e trata o legado como fallback');
exigir(renderMensagens.includes("contatoOrigem:privado?'agenda financeira privada'")&&renderMensagens.includes('contatoConflito:!privado&&legado.conflito'),
  'cartão distingue fonte privada, compatibilidade e conflito');
exigir(renderMensagens.includes("catch(e){ legadoDisponivel=false")&&renderMensagens.includes('Contatos privados confirmados continuam disponíveis'),
  'falha da fonte antiga não derruba contatos privados confirmados');
exigir(renderMensagens.includes("ativos.filter(cliente=>cliente?.tipo==='mensalista').map"),
  'agenda de contatos projeta somente mensalistas ativos');
const salvarContato=trecho(escritorio,'window.salvarContatoFinanceiroCliente=async function','window.abrirWhatsAppClienteAtivo');
const abrirContato=trecho(escritorio,'window.abrirWhatsAppClienteAtivo=async function','window.abrirArquivoClientesUnico');
exigir(salvarContato.includes("v.slug===slug&&v.tipo==='mensalista'"),'chamada direta não salva contato de avulso');
exigir(abrirContato.includes("v.slug===slug&&v.tipo==='mensalista'"),'chamada direta não abre WhatsApp de avulso');

const renderRegua=trecho(escritorio,'window.renderCobranca = async function','function atualizarBadgeCobranca');
exigir(renderRegua.indexOf("contatos_clientes_financeiro")<renderRegua.indexOf("clientes_config")&&renderRegua.includes('if(whatsPorCliente.has(slug)) return;'),
  'Régua mantém precedência privada antes da compatibilidade');
exigir(renderRegua.includes('contatoLegadoPorIdentidade(configs,slug)'),'Régua reutiliza a mesma decisão inequívoca da tela de contatos');

const exclusivos=trecho(escritorio,'const __sidebarExclusivos','function esc(s)');
exigir(exclusivos.includes("'navContratosAmanda','view-contratos'")&&exclusivos.includes("definirItemExclusivoNoDOM('navContratosAmanda',usuarioAtual==='Amanda')"),
  'Amanda recebe uma porta própria de contratos e a view é removida de outros papéis');
exigir(exclusivos.includes("definirItemExclusivoNoDOM('navgroupVendas',usuarioAtual==='Chris')"),
  'liberar contratos não libera o grupo Financeiro/Vendas do Chris');
const navegacao=trecho(escritorio,'const VIEWS_SO_CHRIS','window.irParaCentralClientes');
exigir(!/VIEWS_SO_CHRIS\s*=\s*\[[^\]]*'contratos'/.test(navegacao)&&navegacao.includes("nome === 'contratos' && !['Chris','Amanda'].includes(usuarioAtual)"),
  'rota de contratos autoriza somente Chris e Amanda');
exigir(/id="navContratosAmanda"[^>]*onclick="irPara\('contratos'/.test(escritorio),'botão da Amanda abre a mesma fonte única de contratos');

const salvarContrato=trecho(escritorio,'window.salvarContrato = async function','window.novoContrato');
exigir(salvarContrato.includes("if(!['Chris','Amanda'].includes(usuarioAtual))"),'escritor contratual valida o papel sem depender do botão');
exigir(salvarContrato.includes('valorVigenteSalvo>0 && valorVigenteInformado!==valorVigenteSalvo')&&salvarContrato.includes('Use “Alteração programada”'),
  'valor positivo vigente não é reescrito retroativamente');
exigir(salvarContrato.includes('if(programacaoMudou && inicioProgramado<minimo)')&&salvarContrato.includes('historicoAlteracoesValor=arrayUnion'),
  'reajuste exige próxima competência e deixa histórico auditável');
const ajusteValor=trecho(escritorio,'function ajusteValorProgramadoMensalidade','window.competenciaSeguinte');
exigir(salvarContrato.includes('ajusteValorProgramadoMensalidade')&&ajusteValor.includes("['pago','cancelado'].includes(statusMensalidadeCanonico(pagamento))"),
  'sincronização não sobrescreve mensalidades pagas ou canceladas');
exigir(/id="ecaValor"[^>]*readonly/.test(escritorio)&&escritorio.includes('abrirValorContratoCliente'),
  'ficha geral permanece não retroativa e oferece atalho ao fluxo correto');

const renderContratos=trecho(escritorio,'window.renderContratos = async function','/* ===== CLIENTES AVULSOS');
exigir(renderContratos.includes("if(!['Chris','Amanda'].includes(usuarioAtual))"),'renderização de contratos aceita Amanda e bloqueia outros papéis');
exigir(renderContratos.includes("usuarioAtual==='Chris'&&lista.length < CONTRATOS_INICIAIS.length"),'importação histórica não foi liberada para Amanda');
exigir(escritorio.includes("if(usuarioAtual!=='Chris'){ mostrarToast('A importação histórica é exclusiva do Chris."),'guarda do importador protege a chamada direta');

const regraContrato=trecho(rules,'match /contratos_cliente/{slug}','match /pagamentos_mensais/{docId}');
exigir(regraContrato.includes('allow create, update: if ehGerencia();')&&regraContrato.includes('allow delete: if false;'),
  'Firestore já autoriza a gerência e continua proibindo exclusão física');
exigir(!escritorio.includes('deleteDoc(doc(db,\'contratos_cliente\''),'nenhuma correção contratual apaga contrato');

const blocos=[...escritorio.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
for(const bloco of blocos){
  if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]);
  else new vm.Script(bloco[2]);
}
exigir(true,'scripts inline do Escritório compilam depois das duas correções');

console.log(`REGRESSÃO V83 CONTATOS + CONTRATOS: OK (${total} verificações)`);
