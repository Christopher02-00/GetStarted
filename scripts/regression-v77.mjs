#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const avulso=ler('avulso.html');
const regras=ler('firestore.rules');
const index=ler('index.html');
const links=ler('links.html');
const portal=ler('portal-cliente.html');
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('FALHOU: '+mensagem); console.log('PASS ',mensagem); }
function trecho(fonte,inicio,fim){ const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return fonte.slice(a,b); }

exigir(/<meta name="gs-build" content="2026-08-(?:17-central-vendas-v77|18-(?:contatos-arquivo-unico-v78|calendario-proximo-mes-v79|planos-premium-conteudos-vivos-v80|ciclo-clientes-propostas-v81))">/.test(escritorio),'build V77 ou sucessor identificado');
exigir(escritorio.includes('id="navCentralVendas"')&&escritorio.includes('id="view-centralVendas"'),'Central de Vendas possui navegação e view');
exigir(escritorio.includes("definirItemExclusivoNoDOM('view-centralVendas',usuarioAtual==='Chris')")&&escritorio.includes("'centralVendas','cobranca'"),'view comercial sai do DOM e a porta continua exclusiva do Chris');
exigir(escritorio.includes("if(nome === 'centralVendas') renderCentralVendas()")&&escritorio.includes("centralVendas:'navCentralVendas'"),'navegação renderiza a Central pelo destino oficial');

const recibo=trecho(avulso,'async function salvarComRecibo','  function abrirResumoNoWhatsApp');
exigir(recibo.includes('sessionStorage.getItem(chaveSessao)')&&recibo.includes('doc(collection(db,colecaoNome))'),'formulário reserva e reaproveita o mesmo ID');
exigir(recibo.includes('await setDoc(ref')&&recibo.includes('recibo=await getDoc(ref)'),'sucesso público depende de escrita e releitura da mesma referência');
exigir(recibo.includes('salvo.protocolo!==id')&&recibo.includes('salvo.criadoPorUid!==uid'),'recibo valida protocolo e autoria anônima');
exigir(recibo.includes("String(salvo.nome||'').trim()!==String(dados.nome||'').trim()")&&recibo.includes('telefoneSalvo!==telefoneEsperado'),'recibo rejeita nome ou telefone divergente na mesma sessão');
exigir(!/addDoc\(collection\(db,\s*['"](?:leads_|cadastros_clientes)/.test(avulso),'formulários públicos não usam criação otimista por ID aleatório');
exigir((avulso.match(/window\.open\('about:blank','_blank'\)/g)||[]).length===4,'quatro formulários preservam o gesto antes das leituras');
for(const id of ['canalOrigem','pCanalOrigem','mCanalOrigem']) exigir(avulso.includes('id="'+id+'"'),'origem comercial coletada em '+id);
exigir(avulso.includes('style="display:none;"><span class="ico">✅</span>Já fechei'),'cadastro final não aparece como escolha no pré-cadastro');
exigir(avulso.includes("if(paramsModo.get('modo') === 'cadastro')")&&avulso.includes("setModo('cadastro')"),'link final compatível continua abrindo diretamente o onboarding');

const sync=trecho(escritorio,'async function sincronizarLeadsParaFunil','  window.moverNegocio');
exigir(sync.includes("getDocs(collection(db,'leads_mensalista'))"),'funil importa leads mensalistas');
exigir(sync.includes("const chave=origem+':'+id")&&sync.includes("const negocioId='lead_'+origem+'_'+id"),'origem e lead formam identidade determinística sem colisão transversal');
exigir(sync.includes('await setDoc(ref,registro)')&&!sync.includes('addDoc('),'sincronização é idempotente e não cria cópia em retentativa');
exigir(sync.includes("return {negocios,criados}"),'sincronização devolve o retrato usado sem segunda listagem obrigatória');

const mover=trecho(escritorio,'window.moverNegocio = async function','  /* Conferencia manual do comprovante');
exigir(mover.includes("n.tipoInteresse==='mensal' || n.origemLead==='mensal'"),'conversão diferencia mensalista de avulso');
exigir(mover.indexOf('Mensalista ou renovação sem cliente ativo')<mover.indexOf('const ehAvulsoEmProducao')&&
  mover.includes("n.tipoInteresse!=='renovacao'&&n.tipoInteresse!=='mensal'")&&
  mover.includes('moverNegocioAvulsoParaProducaoAtomico(ref,id,n,identidadeNegocio)'),
  'mensalista sem ficha ativa é bloqueado antes da rota avulsa atômica');
exigir(mover.includes('Nenhum cliente ou lançamento avulso foi criado'),'mensalista ativo apenas vincula a identidade existente');
exigir(mover.includes("arquivado:['entregue','perdido'].includes(novoEstagio)")&&mover.includes('arquivadoEm'),'etapas terminais arquivam sem apagar histórico');

const central=trecho(escritorio,'/* ===== CENTRAL DE VENDAS — PROPOSTAS V81','  /* ===== FUNIL DE NEGOCIOS');
for(const campo of ['resumoConversa','proximoPasso','followupEm','responsavelVendas','canalOrigem']) exigir(central.includes(campo),'proposta preserva '+campo);
exigir(central.includes("const diag=await diagnosticarIdentidadeCliente(nome)")&&central.includes("clienteSlug:clienteSlugs[0]||(diag.ativo?diag.slug:'')")&&
  !central.includes("setDoc(doc(db,'clientes_extras'"),'proposta cruza identidade existente sem cadastrar cliente');
exigir(central.includes("doc(collection(db,'reunioes_vendas'))")&&central.includes('resumoReuniaoVenda(d)'),'reunião gera protocolo e resumo estruturado');
exigir(central.includes("window.open('about:blank','_blank')")&&central.indexOf("window.open('about:blank','_blank')")<central.indexOf("await getDoc(doc(db,'negocios',id))"),'boas-vindas preserva gesto antes da leitura');
exigir(central.includes('O envio só acontece quando você clicar em Enviar no WhatsApp'),'interface não afirma que a mensagem foi enviada');
exigir(escritorio.includes("filtro==='arquivados'&&(!arquivado||mesRegistroVenda")&&escritorio.includes("'Arquivo de '+esc(nomeMes(mes))"),'arquivo comercial respeita o mês selecionado');
exigir(escritorio.includes('window.editarPropostaNegocio = async function')&&
  escritorio.includes("n.estagio==='preparada'?'prepararEnvioPropostaVenda':'editarPropostaNegocio'"),'cartão comercial permite retomar a proposta diretamente');
exigir(escritorio.includes('As leituras não foram confirmadas')&&escritorio.includes("badge.textContent='!'"),'falha comercial não vira contador zero');

for(const colecao of ['leads_avulsos','leads_mensalista','leads_pessoa_fisica']){
  const regra=trecho(regras,'match /'+colecao+'/{docId}', 'allow delete: if false;');
  exigir(regra.includes('request.resource.data.criadoPorUid == request.auth.uid')&&regra.includes('request.resource.data.protocolo == docId'),colecao+' exige autoria e protocolo');
  exigir(regra.includes('allow get: if ehGerencia() || (logado() && resource.data.criadoPorUid == request.auth.uid)')&&regra.includes('allow list, update: if ehGerencia()'),colecao+' permite recibo próprio sem liberar listagem pública');
}
const regraReuniao=trecho(regras,'match /reunioes_vendas/{docId}', 'allow delete: if false;');
exigir(regraReuniao.includes('allow read, create, update: if ehGerencia()'),'reuniões comerciais são privadas da gerência');

for(const [arquivo,fonte] of [['avulso.html',avulso],['index.html',index],['links.html',links],['portal-cliente.html',portal]]) exigir(!fonte.includes('5541996443046')&&!fonte.includes('99644-3046'),arquivo+' não contém o contato pessoal antigo');
exigir(index.includes('avulso.html')&&links.includes('Peça sua proposta — pré-cadastro comercial'),'site e perfil apontam para o pré-cadastro oficial');
exigir([avulso,index,links,portal].every(f=>f.includes('5541999088357')),'páginas de contato usam o WhatsApp institucional');

for(const arquivo of ['escritorio.html','avulso.html']){
  const fonte=ler(arquivo);
  const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
  for(const bloco of blocos){ if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]); else new vm.Script(bloco[2]); }
}
exigir(true,'scripts inline alterados compilam');

console.log(`RESULTADO: APROVADO (${total} asserções V77)`);
