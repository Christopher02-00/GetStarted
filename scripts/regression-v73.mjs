#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escritorio=fs.readFileSync(path.join(raiz,'escritorio.html'),'utf8');
const formulario=fs.readFileSync(path.join(raiz,'avulso.html'),'utf8');
let total=0;
function ok(cond,mensagem){ total++; if(!cond) throw new Error('V73: '+mensagem); }
function trecho(texto,inicio,fim){ const a=texto.indexOf(inicio); const b=texto.indexOf(fim,a+inicio.length); if(a<0||b<0) throw new Error('V73: trecho ausente '+inicio); return texto.slice(a,b); }
function funcao(texto,nome){
  const inicio=texto.indexOf('function '+nome+'('); if(inicio<0) throw new Error('V73: função ausente '+nome);
  const abre=texto.indexOf('{',inicio); let nivel=0;
  for(let i=abre;i<texto.length;i++){ if(texto[i]==='{') nivel++; else if(texto[i]==='}'&&--nivel===0) return texto.slice(inicio,i+1); }
  throw new Error('V73: função sem fechamento '+nome);
}
function executar(codigo,exportacao){ const ctx={}; ctx.window=ctx; vm.createContext(ctx); vm.runInContext(codigo+'\n'+exportacao,ctx); return ctx.api; }

const normalizadorPublico=executar(funcao(formulario,'normalizarWhatsAppBrasilCadastro'),'globalThis.api=normalizarWhatsAppBrasilCadastro;');
const normalizadorInterno=executar(funcao(escritorio,'numeroWhatsAppBrasil'),'globalThis.api=numeroWhatsAppBrasil;');
for(const [entrada,esperado] of [
  ['(41) 99999-9999','5541999999999'],['41 99999-9999','5541999999999'],['+55 41 99999-9999','5541999999999'],
  ['41 3333-4444','554133334444'],['9999-9999',''],['5541999',''],['','']
]){
  ok(normalizadorPublico(entrada)===esperado,'normalização pública divergente para '+entrada);
  ok(normalizadorInterno(entrada)===esperado,'normalização interna divergente para '+entrada);
}

ok((formulario.match(/whatsappNormalizado=normalizarWhatsAppBrasilCadastro\(whatsapp\)/g)||[]).length===3,'os três formulários de lead não usam a normalização');
ok((formulario.match(/nome, whatsapp, whatsappNormalizado/g)||[]).length===3,'algum lead não preserva o número canônico');
ok(formulario.includes('nome, slug, instagram, telefone, whatsappCobranca, aniversario, contatos'),'cadastro final não preserva o número canônico');
ok(formulario.indexOf('if(!whatsappCobranca)')<formulario.indexOf("await salvarComRecibo('cadastros_clientes'"),'cadastro final valida o contato antes da escrita confirmada');

const ficha=trecho(escritorio,'const ETAPAS_ONBOARDING_LOCAL','  window.registrarClienteDaReuniao');
const apiFicha=executar(`function slugClienteCanonico(s){return s;}function mesesCortesiaValidos(m){return true;}function numeroWhatsAppBrasil(v){let d=String(v||'').replace(/\\D/g,'');if(d.length===10||d.length===11)d='55'+d;return /^55\\d{10,11}$/.test(d)?d:'';}\n${ficha}`,'globalThis.api={validarEntradaClienteMensalista,modelarClienteMensalistaUnificado};');
const entrada={nome:'Cliente Teste',instagram:'',telefone:'41 99999-9999',plano:'Intermediário',planoDetalhes:'',valorMensal:1700,diaVencimento:10,primeiraCompetencia:'2026-08',tipoEntrega:'postagem_completa',incluiStories:false,contrato:'',cortesiaTipo:'permanente',cortesiaMeses:[],cortesiaPermanente:true,cortesiaInicial:true};
ok(apiFicha.validarEntradaClienteMensalista(entrada).length===0,'ficha interna recusou contato válido');
ok(apiFicha.validarEntradaClienteMensalista({...entrada,telefone:'9999-9999'}).some(x=>x.includes('WhatsApp brasileiro válido')),'ficha interna aceitou contato inválido');
ok(apiFicha.modelarClienteMensalistaUnificado(entrada,'2026-08-17T00:00:00.000Z','token','entrada').config.whatsappCobranca==='5541999999999','ativação mensal não propagou o contato');

const avulso=trecho(escritorio,'window.ativarAvulsoRecebido=async function','  const ETAPAS_ONBOARDING_LOCAL');
ok(avulso.includes('lead.whatsappCobranca||lead.whatsappNormalizado||lead.whatsapp||lead.telefone'),'ativação avulsa perdeu compatibilidade das fontes');
ok(avulso.indexOf('if(!whatsappCobranca)')<avulso.indexOf('runTransaction'),'ativação avulsa valida depois de iniciar a transação');
ok(avulso.includes("tx.set(configRef,{tipoCliente:'avulso',tipoEntrega:'entrega_direta',whatsappCobranca"),'ativação avulsa não grava a configuração operacional');

const edicao=trecho(escritorio,'window.salvarClienteAtivoCentral=async function','  window.arquivarEntradaPendente');
ok(edicao.includes('const fone=numeroWhatsAppBrasil(dados.telefone)'),'edição ativa usa outra normalização');
ok(edicao.includes('whatsappCobranca:fone'),'edição ativa não sincroniza o contato');
ok(escritorio.includes("value=\"${escAttr(v.telefone||v.whatsappCobranca||'')}\""),'editor pode apagar contato operacional de ficha legada');
ok(!escritorio.includes('const CLIENTES_WHATSAPP_FIXOS'),'foi reintroduzida lista fixa paralela');

console.log(`RESULTADO: APROVADO (${total} asserções V73)`);
