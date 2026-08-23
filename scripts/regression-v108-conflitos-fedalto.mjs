#!/usr/bin/env node

/* Regressão V108 — conflito único e verdade financeira da Fedalto. */
import assert from 'node:assert/strict';
import * as Core from '../financeiro-core.mjs';

let total=0;
function ok(condicao,mensagem){total+=1;assert.ok(condicao,`V108: ${mensagem}`);console.log('PASS ',mensagem);}
function igual(atual,esperado,mensagem){total+=1;assert.deepEqual(atual,esperado,`V108: ${mensagem}`);console.log('PASS ',mensagem);}

const conflitoA={codigo:'PAGAMENTO_SEM_CONTRATO_VIGENTE',bloqueante:true,canonicalId:'cliente-a',competencia:'2026-08',id:'cliente-a_2026-08',status:'isento'};
const conflitoAOutraOrdem={status:'isento',id:'cliente-a_2026-08',competencia:'2026-08',canonicalId:'cliente-a',bloqueante:true,codigo:'PAGAMENTO_SEM_CONTRATO_VIGENTE'};
const conflitoB={...conflitoA,id:'cliente-a_2026-08-duplicado'};
const congelada=Object.freeze([Object.freeze({...conflitoA}),Object.freeze({...conflitoAOutraOrdem}),Object.freeze({...conflitoB})]);
const unicos=Core.deduplicarConflitosFinanceiros(congelada);
igual(unicos.length,2,'cópias integrais colapsam mesmo com outra ordem de propriedades');
igual(unicos[0].id,'cliente-a_2026-08','a primeira ocorrência e a ordem são preservadas');
igual(unicos[1].id,'cliente-a_2026-08-duplicado','documento fisicamente distinto não é fundido');
igual(congelada.length,3,'a fonte congelada não é alterada');
igual(Core.identidadeConflitoFinanceiro(conflitoA),Core.identidadeConflitoFinanceiro(conflitoAOutraOrdem),'a identidade é estável');

const conflitoAMetadadosDiferentes={
  ...conflitoA,
  status:'pago',
  origem:'reconciliacao',
  detalhe:'a fachada acrescentou metadados sem criar outra causa',
};
const mesmaCausaComMetadados=Core.deduplicarConflitosFinanceiros([conflitoA,conflitoAMetadadosDiferentes]);
igual(mesmaCausaComMetadados.length,1,'a mesma chave codigo+canonicalId+competencia+id colapsa apesar de metadados diferentes');
igual(mesmaCausaComMetadados[0],conflitoA,'a primeira ocorrência canônica permanece quando ambas são bloqueantes');
igual(Core.identidadeConflitoFinanceiro(conflitoA),Core.identidadeConflitoFinanceiro(conflitoAMetadadosDiferentes),'metadados de fachada não alteram a identidade canônica completa');

const incompletoA={codigo:'FONTE_INDISPONIVEL',bloqueante:true,canonicalId:'cliente-a',competencia:'2026-08',origem:'obrigacoes',causa:'timeout'};
const incompletoAOutraOrdem={causa:'timeout',origem:'obrigacoes',competencia:'2026-08',canonicalId:'cliente-a',bloqueante:true,codigo:'FONTE_INDISPONIVEL'};
const incompletoDiferente={...incompletoA,origem:'reconciliacao'};
const incompletos=Core.deduplicarConflitosFinanceiros([incompletoA,incompletoAOutraOrdem,incompletoDiferente]);
igual(incompletos.length,2,'conflito sem id usa fallback integral: cópia exata colapsa e metadado diferente permanece distinto');
igual(Core.identidadeConflitoFinanceiro(incompletoA),Core.identidadeConflitoFinanceiro(incompletoAOutraOrdem),'fallback integral também é estável à ordem das propriedades');
ok(Core.identidadeConflitoFinanceiro(incompletoA)!==Core.identidadeConflitoFinanceiro(incompletoDiferente),'conflito incompleto não é fundido por semelhança ou suposição');

const avisoNaoBloqueante={...conflitoA,bloqueante:false,origem:'aviso'};
const bloqueioPosterior={...conflitoA,bloqueante:true,origem:'obrigacoes',detalhe:'fonte bloqueante'};
const precedenciaBloqueante=Core.deduplicarConflitosFinanceiros([avisoNaoBloqueante,bloqueioPosterior]);
igual(precedenciaBloqueante.length,1,'duplicatas da mesma identidade continuam representadas uma única vez');
igual(precedenciaBloqueante[0],bloqueioPosterior,'duplicata bloqueante substitui a ocorrência não bloqueante anterior');
igual(Core.deduplicarConflitosFinanceiros([bloqueioPosterior,avisoNaoBloqueante])[0],bloqueioPosterior,'uma ocorrência não bloqueante posterior nunca rebaixa o bloqueio existente');

const contratoAntes={
  id:'fedalto-eletro-comercial',slug:'fedalto-eletro-comercial',canonicalId:'fedalto-eletro-comercial',
  clienteNome:'Fedalto sintética',status:'ativo',valorCheio:1700,valorVigente:1700,diaVencimento:10,
  cortesiaMeses:['2026-09'],vigencias:[{inicio:'2026-09',fim:'',valor:1700,cicloId:'fixture-v108'}],
};
const pagamentosAntes=[
  {id:'orfao-historico_2026-04',canonicalId:'orfao-historico',cliente:'orfao-historico',competencia:'2026-04',status:'pago',pagoEm:'2026-04-10',valorDevido:500,diaVencimento:10},
  {id:'fedalto-eletro-comercial_2026-07',canonicalId:'fedalto-eletro-comercial',cliente:'fedalto-eletro-comercial',competencia:'2026-07',status:'pago',pagoEm:'2026-08-11',valorDevido:1700,diaVencimento:10},
  {id:'fedalto-eletro-comercial_2026-08',canonicalId:'fedalto-eletro-comercial',cliente:'fedalto-eletro-comercial',competencia:'2026-08',status:'isento',pagoEm:'',cortesiaDoMes:false,motivoIsencao:'cortesia manual',valorDevido:1700,diaVencimento:10},
  {id:'fedalto-eletro-comercial_2026-09',canonicalId:'fedalto-eletro-comercial',cliente:'fedalto-eletro-comercial',competencia:'2026-09',status:'isento',pagoEm:'',cortesiaDoMes:true,motivoIsencao:'Cortesia promocional da agência em setembro de 2026',valorDevido:1700,diaVencimento:10},
];
const base={contratos:[contratoAntes],pagamentos:pagamentosAntes,saidas:[],recebimentosEntrada:[],receitasAvulsas:[],competencia:'2026-09',mesCaixa:'2026-09',hoje:'2026-09-12',competenciasRegua:['2026-04','2026-07','2026-08','2026-09'],competenciaInicialOperacao:'2026-07',competenciasQuitadasAte:'2026-08'};
const antes=Core.projetarFinanceiroCompetencia(base);
const bloqueantesAntes=antes.conflitos.filter(v=>v.bloqueante!==false);
igual(bloqueantesAntes.length,2,'a fachada apresenta uma vez cada órfão de julho e agosto');
igual(bloqueantesAntes.map(v=>v.competencia).sort(),['2026-07','2026-08'],'abril anterior à Régua não contamina setembro');
igual(new Set(bloqueantesAntes.map(Core.identidadeConflitoFinanceiro)).size,bloqueantesAntes.length,'a fachada não repete a mesma causa');
ok(antes.escritaExecutada===false,'a projeção permanece zero-write');

const abril=Core.projetarFinanceiroCompetencia({...base,competencia:'2026-04',mesCaixa:'2026-04',hoje:'',competenciasRegua:[]});
ok(abril.conflitos.some(v=>v.competencia==='2026-04'),'o registro anterior continua auditável ao abrir abril');

const contratoDepois={
  ...contratoAntes,primeiraCompetencia:'2026-07',financeiroRevision:1,
  financeiroOperationId:'fin_v108_fedalto_agosto_20260815',
  vigencias:[{...contratoAntes.vigencias[0],inicio:'2026-07'}],
};
const pagamentosDepois=pagamentosAntes.map(v=>v.id==='fedalto-eletro-comercial_2026-08'?{
  ...v,status:'pago',pagoEm:'2026-08-15',cortesiaDoMes:false,
  motivoIsencao:undefined,financeiroOperationId:'fin_v108_fedalto_agosto_20260815',
}:v);
const agosto=Core.projetarFinanceiroCompetencia({...base,contratos:[contratoDepois],pagamentos:pagamentosDepois,competencia:'2026-08',mesCaixa:'2026-08',hoje:'',competenciasRegua:[]});
igual(agosto.conflitos.filter(v=>v.bloqueante!==false).length,0,'o estado final elimina o conflito real de agosto');
igual(agosto.obrigacoes.totais.quitado,1700,'agosto inclui R$ 1.700 quitados');
igual(agosto.reconciliacao.competencia.quitado,1700,'a competência de agosto reconhece o pagamento');
igual(agosto.reconciliacao.caixa.totalAgencia,3400,'o caixa de agosto preserva julho recebido em agosto e inclui o pagamento de 15/08');

const setembro=Core.projetarFinanceiroCompetencia({...base,contratos:[contratoDepois],pagamentos:pagamentosDepois,competencia:'2026-09',mesCaixa:'2026-09',hoje:'',competenciasRegua:[]});
const linhaSetembro=setembro.obrigacoes.linhas.find(v=>v.canonicalId==='fedalto-eletro-comercial');
igual(Core.statusMensalidade(linhaSetembro),'isento','setembro continua cortesia/isento');

const outubro=Core.projetarFinanceiroCompetencia({...base,contratos:[contratoDepois],pagamentos:pagamentosDepois,competencia:'2026-10',mesCaixa:'2026-10',hoje:'',competenciasRegua:[]});
const linhaOutubro=outubro.obrigacoes.linhas.find(v=>v.canonicalId==='fedalto-eletro-comercial');
igual(Core.statusMensalidade(linhaOutubro),'aberto','outubro volta ao fluxo mensal normal');
ok(linhaOutubro.materializada===false,'a projeção de outubro não cria documento silenciosamente');
ok(outubro.escritaExecutada===false,'outubro também permanece zero-write');

console.log(`OK V108 conflitos/Fedalto: ${total}/${total} verificações`);
