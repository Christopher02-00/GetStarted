import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../escritorio.html',import.meta.url),'utf8');
let total=0;
function exigir(condicao,mensagem){
  total++;
  if(!condicao) throw new Error('FALHOU: '+mensagem);
  console.log('PASS ',mensagem);
}
function trecho(inicio,fim){
  const a=html.indexOf(inicio), b=html.indexOf(fim,a);
  if(a<0||b<0) throw new Error('Trecho não encontrado: '+inicio+' → '+fim);
  return html.slice(a,b);
}

exigir(/2026-08-(?:17-(?:regua-whatsapp-contatos-v72|cadastro-whatsapp-v73|identidade-filas-links-v74|valor-ativacao-reativacao-v75|auth-carteira-limpeza-v76|central-vendas-v77)|18-(?:contatos-arquivo-unico-v78|calendario-proximo-mes-v79))/.test(html),'build mantém a V72 ou uma sucessora validada');

const contatoFonte=trecho('function numeroWhatsAppBrasil','  function textoMensagemCliente')+
  '\nthis.numeroWhatsAppBrasil=numeroWhatsAppBrasil;this.contatoWhatsAppCliente=contatoWhatsAppCliente;this.urlWhatsAppWeb=urlWhatsAppWeb;';
const contatoCtx={window:{}};
vm.createContext(contatoCtx);
new vm.Script(contatoFonte).runInContext(contatoCtx);

exigir(contatoCtx.numeroWhatsAppBrasil('(41) 99908-8357')==='5541999088357','número nacional recebe DDI sem perder DDD');
exigir(contatoCtx.numeroWhatsAppBrasil('5541999088357')==='5541999088357','número internacional não duplica DDI');
exigir(contatoCtx.numeroWhatsAppBrasil('99908-8357')==='','número sem DDD falha fechado');
exigir(contatoCtx.numeroWhatsAppBrasil('551199999999999')==='','número longo inválido falha fechado');

let contato=contatoCtx.contatoWhatsAppCliente({telefone:'(41) 11111-1111',whatsappCobranca:'(41) 99908-8357'});
exigir(contato.numero==='5541999088357'&&contato.origem==='número de cobrança','contato de cobrança confirmado tem prioridade');
contato=contatoCtx.contatoWhatsAppCliente({telefone:'(41) 98888-7777',whatsappCobranca:''});
exigir(contato.numero==='5541988887777'&&contato.origem==='ficha do cliente','telefone da ficha é compatibilidade válida');
exigir(contatoCtx.contatoWhatsAppCliente({telefone:'sem número'}).numero==='','contato ausente não inventa destinatário');

const urlA=contatoCtx.urlWhatsAppWeb('41999088357','Linha 1\n\nLinha 2');
const urlB=contatoCtx.urlWhatsAppWeb('11987654321','Mensagem B');
exigir(urlA.startsWith('https://web.whatsapp.com/send?phone=5541999088357&text='),'link abre diretamente no WhatsApp Web conectado');
exigir(new URL(urlA).searchParams.get('text')==='Linha 1\n\nLinha 2','link preserva linhas e parágrafos da mensagem');
exigir(new URL(urlA).searchParams.get('phone')!==new URL(urlB).searchParams.get('phone'),'cada cliente mantém seu próprio destinatário');
exigir(contatoCtx.urlWhatsAppWeb('99908-8357','texto')==='','link não é criado para contato sem DDD');
exigir(contatoCtx.urlWhatsAppWeb('41999088357','   ')==='','link não é criado sem mensagem');

const consolidarFonte=trecho('function consolidarClientesAtivosPorIdentidade','  window.nomeClienteCanonico=nomeClienteCanonico;')+
  '\nthis.consolidarClientesAtivosPorIdentidade=consolidarClientesAtivosPorIdentidade;';
const consolidarCtx={Map,slugClienteCanonico:s=>s==='alias'?'cliente':s,nomeClienteCanonico:(s,n)=>n||s};
vm.createContext(consolidarCtx);
new vm.Script(consolidarFonte).runInContext(consolidarCtx);
const consolidados=consolidarCtx.consolidarClientesAtivosPorIdentidade([
  {slug:'cliente',nome:'Cliente',origem:'oficial',telefone:'',whatsappCobranca:''},
  {slug:'alias',nome:'Cliente legado',origem:'legado',telefone:'(41) 98888-7777',whatsappCobranca:'(41) 99908-8357'}
]);
exigir(consolidados.length===1,'alias e canônico geram um único cliente');
exigir(consolidados[0].telefone==='(41) 98888-7777','telefone válido não é apagado pelo cadastro principal vazio');
exigir(consolidados[0].whatsappCobranca==='(41) 99908-8357','número de cobrança válido sobrevive à consolidação');

const mensagemFonte="const PIX_AGENCIA={chave:'56.062.119.0001-43',tipo:'CNPJ',banco:'Banco C6',titular:'Christopher Brito'};"+
  trecho('function dataVencimentoCobranca','  async function numeroCobrancaConfirmado')+
  '\nthis.mensagemCobranca=mensagemCobranca;this.dataVencimentoCobranca=dataVencimentoCobranca;';
const mensagemCtx={window:{},brl:v=>'R$ '+Number(v).toFixed(2).replace('.',','),nomeMes:comp=>comp==='2026-08'?'agosto de 2026':comp};
vm.createContext(mensagemCtx);
new vm.Script(mensagemFonte).runInContext(mensagemCtx);
for(const fase of ['antes','hoje','d3','d7','d15']){
  const mensagem=mensagemCtx.mensagemCobranca(fase,'Ana',1700,'2026-08',fase==='antes'?1:8,15);
  exigir(!/\p{Extended_Pictographic}/u.test(mensagem),'mensagem '+fase+' não contém emoji decorativo');
  exigir(mensagem.includes('\n\nDados para pagamento\n')&&mensagem.includes('\nBanco: Banco C6\n'),'mensagem '+fase+' separa blocos e linhas bancárias');
  exigir(mensagem.includes('Referência: agosto de 2026\nValor: R$ 1700,00\nVencimento: 15/08/2026'),'mensagem '+fase+' organiza referência, valor e vencimento');
  exigir(mensagem.endsWith('envie o comprovante por aqui.'),'mensagem '+fase+' termina com orientação de comprovante');
}

const abrir=trecho('window.abrirCobranca = async function','  window.confirmarEnvioCobranca=async function');
const confirmar=trecho('window.confirmarEnvioCobranca=async function','  window.renderCobranca = async function');
const render=trecho('window.renderCobranca = async function','  function atualizarBadgeCobranca');
const cobrarMensalidade=trecho('window.cobrarMensalidade = async function','  window.renderContratos = async function');
exigir(abrir.indexOf("window.open('about:blank','_blank')")<abrir.indexOf('await getDoc('),'aba nasce no gesto do clique antes da primeira leitura assíncrona');
exigir(!abrir.includes('updateDoc(')&&!abrir.includes("registrarLogAutomacao('cobranca_feita'"),'abrir conversa não registra cobrança como enviada');
exigir(abrir.includes('aba.location.replace(url)')&&abrir.includes('urlWhatsAppWeb(contato.numero,msg)'),'conversa validada navega ao cliente específico');
exigir(abrir.includes('Nada foi registrado')||abrir.includes('ainda não registrou a cobrança'),'retorno visual não afirma envio ao abrir');
exigir(confirmar.includes('!window.__cobrancasPreparadas[id]'),'confirmação exige conversa preparada na sessão');
exigir(confirmar.includes('runTransaction(')&&confirmar.includes('mensalidadeResolvida(atual)'),'confirmação relê e revalida a mensalidade em transação');
exigir(confirmar.includes("registrarLogAutomacao('cobranca_feita'"),'histórico nasce somente na confirmação explícita');
exigir(render.includes('Régua indisponível')&&render.includes("badge.textContent='!'"),'falha de leitura fica indisponível e nunca vira fila vazia');
exigir(render.includes('confirmarCobranca_')&&render.includes('Confirmar que enviei'),'cartão separa abrir conversa de confirmar envio');
exigir(cobrarMensalidade.includes('return abrirCobranca(id)'),'Mensalidades reutiliza a mesma cadeia da Régua');
exigir(!abrir.includes('https://wa.me/')&&!render.includes('https://wa.me/'),'fluxo da Régua não usa redirecionamento genérico wa.me');

const central=trecho('/* ===== MENSAGENS PARA CLIENTES — V71','  async function carregarMensalistaRecebidoNosCampos');
exigir(central.includes("whatsappCobranca:v.whatsappCobranca||''")&&central.includes('contatoWhatsAppCliente(v).numero'),'Central usa número específico e ficha pela mesma validação');
exigir(central.includes('urlWhatsAppWeb(numero,mensagem)'),'Central abre WhatsApp Web pela função compartilhada');
exigir(central.includes('Atualize o WhatsApp na Central de Clientes')&&!central.includes("'https://wa.me/'+numero"),'Central bloqueia contato ausente sem abrir conversa genérica');

console.log(`RESULTADO: APROVADO (${total} asserções V72)`);
