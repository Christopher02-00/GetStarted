#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(process.argv[2]||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const ler=n=>fs.readFileSync(path.join(raiz,n),'utf8');
const calendario=ler('calendario.html');
const calendarios=ler('calendarios.html');
const escritorio=ler('escritorio.html');
const portal=ler('portal-cliente.html');
const regras=ler('firestore.rules');
let total=0;const falhas=[];
function ok(condicao,nome){total++;if(condicao)console.log(`ok ${total} - ${nome}`);else{falhas.push(nome);console.error(`not ok ${total} - ${nome}`);}}
function entre(txt,a,b){const i=txt.indexOf(a),f=txt.indexOf(b,i+a.length);if(i<0||f<0)throw new Error(`trecho ausente: ${a}`);return txt.slice(i,f);}

ok(calendario===calendarios,'aliases singular/plural permanecem byte a byte idênticos');
for(const [nome,txt] of [['escritório',escritorio],['calendário',calendario],['portal',portal]])
  ok(txt.includes('2026-08-25-continuidade-calendario-gravacao-v115'),`${nome} declara build V115`);
ok(escritorio.includes('criarRetratoLiberadoV115')&&escritorio.includes('retratoLiberadoV115:retratoLiberadoV115'),
  'publicação da Amanda guarda retrato imutável da versão entregue');
ok(calendario.includes('projetarCalendarioClienteV115')&&calendario.includes('Ajuste em andamento.'),
  'calendário direto projeta a última versão durante qualquer ajuste');
ok(portal.includes('mesVisivelPortalV115')&&portal.includes('Seu calendário não sumiu'),
  'Portal mantém qualquer cliente visível durante ajuste');
ok(!entre(calendario,'async function registrarPedidoAjusteClienteNoBancoV113','let pedidoAjusteClienteEmCursoV113').includes('retratoLiberadoV115='),
  'cliente não ganhou campo de escrita novo fora do contrato V113');
ok(!regras.includes("'retratoLiberadoV115'")&&regras.includes('pedidoAjusteCalendarioClienteValidoV113'),
  'regras de escrita do cliente permanecem estreitas');
ok(calendario.includes('Compatibilidade Bluefit/V114')&&calendario.includes('itensRetrato'),
  'ajuste legado aberto antes da V115 ganha retrato na primeira gravação segura da equipe');
ok(calendario.includes("clienteEmConsultaDeAjusteV115()")&&calendario.includes('Aprovações ficam pausadas'),
  'cliente consulta sem aprovar uma versão que está sendo corrigida');
ok(portal.includes('!ajusteEmAndamentoV115 && !it.apr'),
  'Portal remove o botão de aprovação durante ajuste');

const runtimeDiagnostico=entre(escritorio,'function diagnosticarCompetenciaPendenteV115','function assinaturaReplanejamentoSessao');
const ctx={console,URL,String,Number,Object,Array,window:{},mesesDeCalendario:cal=>Object.keys(cal.meses),
  itensDoMesComIndiceGlobal:(cal,mes)=>cal.meses[mes]||[],itemNaoPrecisaGravar:i=>!!i.resolvido,
  estadoMesCal:()=> 'liberado'};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(runtimeDiagnostico,ctx);
const diag=ctx.diagnosticarCompetenciaPendenteV115({meses:{'2026-08':[{resolvido:true}],'2026-09':[{},{}]}},'2026-08','2026-08');
ok(diag.divergente&&diag.sugerida==='2026-09'&&diag.sugeridaPendentes===2,
  'agosto resolvido sugere setembro pendente sem confundir data da gravação');
ok(ctx.urlHttpsOperacionalV115('drive.google.com/test').startsWith('https://drive.google.com/')&&ctx.urlHttpsOperacionalV115('javascript:alert(1)')==='',
  'referências sem esquema são normalizadas e esquemas perigosos recusados');
const ctxRef={URL,String};vm.createContext(ctxRef);
vm.runInContext(entre(calendario,'function normalizeUrl','function updateRefLink'),ctxRef);
ok(ctxRef.normalizeUrl('drive.google.com/mochi').startsWith('https://drive.google.com/')&&ctxRef.normalizeUrl('javascript://alert')==='',
  'calendário direto abre referência sem esquema e recusa protocolo perigoso');
vm.runInContext(entre(portal,'function urlHttpsSeguraPortal','async function carregarFichaPortalSegura'),ctxRef);
ok(ctxRef.urlHttpsSeguraPortal('youtube.com/watch?v=1').startsWith('https://youtube.com/')&&ctxRef.urlHttpsSeguraPortal('http://inseguro.test')==='',
  'Portal normaliza referência do cliente e mantém somente HTTPS');
ok(calendario.includes('referência inválida')&&portal.includes('Referência inválida — peça um novo link'),
  'cliente recebe diagnóstico visível quando o destino não pode ser aberto');
ok(escritorio.includes('Nada foi salvo; confirme de novo se estiver correto.')&&
   escritorio.includes('diagnosticoCompetenciaV115.divergente'),
  'novo agendamento divergente para antes de qualquer addDoc');
ok(escritorio.includes('Corrigir mês/bloco da pauta')&&escritorio.includes("const resumoMeses=diagnostico.competencias"),
  'coordenação consegue corrigir competência e bloco de sessão existente');
ok(escritorio.includes('abrirRegistroAgendamentoCampoV115')&&escritorio.includes('Abrir minha sessão e lançar os vídeos'),
  'Luís/Nathan recebem atalho da pauta para a sessão exata');
ok(escritorio.includes('Revisar e enviar')&&escritorio.includes("usuarioAtual==='Amanda'?await htmlCalendariosParaRevisar"),
  'Amanda recebe uma fila visível dentro de Calendários sem fluxo paralelo');
ok(calendario.includes('Enviar para Amanda revisar e publicar →'),
  'Gabi recebe uma única próxima ação depois de corrigir o calendário');
ok(escritorio.includes('Corrigir mês/bloco da pauta')&&escritorio.includes('Abrir minha sessão e lançar os vídeos'),
  'videomaker encontra pauta, referências e lançamento no mesmo caminho operacional');
ok(escritorio.includes('A pauta desta sessão está no mês errado')&&
   escritorio.includes("!desvioCompetencia && !inconsistenciasCampo.length"),
  'modo Campo não declara tudo gravado quando a competência está errada');
ok(escritorio.includes('Referência inválida — peça um novo link')&&escritorio.includes('urlHttpsOperacionalV115(i.ref)'),
  'referências no modo operacional deixam de abrir href bruto');
ok(calendario.includes('sincronizarLegendaEditorialComCeciliaV114')&&
   escritorio.includes('obterLegendaEditorialExataV114')&&
   calendario.includes("calendarItemId:String(item?.itemId||'')||null"),
  'ponte V114 da legenda e identidade estável continuam preservadas');
ok(escritorio.includes("sessaoItensPlanejados")&&escritorio.includes("calendarItemId"),
  'sessão continua carregando identidade do calendário até o vídeo');

const pastaV114=path.resolve(raiz,'..','ATUALIZACAO_ATUAL_V114');
if(fs.existsSync(path.join(pastaV114,'firestore.rules'))){
  ok(regras===fs.readFileSync(path.join(pastaV114,'firestore.rules'),'utf8'),'firestore.rules permanece byte a byte V114');
  for(const arq of ['financeiro-core.mjs','financeiro-ui-v103.mjs','financeiro-ui-v104.mjs'])
    ok(ler(arq)===fs.readFileSync(path.join(pastaV114,arq),'utf8'),`${arq} financeiro permanece byte a byte V114`);
}

console.log(`\nV115 continuidade calendário/gravação: ${total-falhas.length}/${total} aprovadas.`);
if(falhas.length){for(const f of falhas)console.error(' - '+f);process.exitCode=1;}
