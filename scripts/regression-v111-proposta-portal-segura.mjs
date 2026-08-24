import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const escritorio = readFileSync(join(raiz, 'escritorio.html'), 'utf8');
const portal = readFileSync(join(raiz, 'portal-cliente.html'), 'utf8');
const regras = readFileSync(join(raiz, 'firestore.rules'), 'utf8');

let aprovados = 0;
let reprovados = 0;
const falhas = [];

function caso(nome, condicao) {
  if (condicao) {
    aprovados += 1;
    console.log(`ok ${aprovados + reprovados} - ${nome}`);
    return;
  }
  reprovados += 1;
  falhas.push(nome);
  console.error(`not ok ${aprovados + reprovados} - ${nome}`);
}

const blocoPropostaPortal = portal.slice(
  portal.indexOf('/* ===== SUA PROPOSTA'),
  portal.indexOf('async function calcularEtapasProducao')
);
const blocoNegociosRegras = regras.slice(
  regras.indexOf('match /negocios/{docId}'),
  regras.indexOf('match /reunioes_vendas/{docId}')
);

caso('Portal não consulta negocios para exibir ou liberar proposta',
  !blocoPropostaPortal.includes("meusDocs('negocios'") &&
  !blocoPropostaPortal.includes("getDoc(doc(db,'negocios'"));
caso('Portal consulta somente o índice estreito antes do PIN',
  blocoPropostaPortal.includes("propostas_portal_indices") &&
  blocoPropostaPortal.includes('buscarIndicesPropostaDoCliente'));
caso('Portal faz point-get da projeção pública somente após liberação',
  blocoPropostaPortal.includes("propostas_portal_publicas") &&
  blocoPropostaPortal.includes('buscarPropostasLiberadas'));
caso('Portal cria liberação na subcoleção da própria sessão',
  blocoPropostaPortal.includes('liberacoes_proposta'));
caso('Portal não deriva PIN de WhatsApp recebido no payload',
  !blocoPropostaPortal.includes('so4Digitos(n.whatsapp)'));
caso('Portal atualiza negócio sem lê-lo, usando arrayUnion auditável',
  portal.includes('arrayUnion') &&
  !portal.includes("const snap = await getDoc(ref);\n    const n = snap.exists() ? snap.data() : {};"));
caso('Resposta do cliente atualiza canônico e projeção na mesma transação',
  portal.includes('atualizarRespostaPropostaProtegida') &&
  /atualizarRespostaPropostaProtegida[\s\S]{0,2600}runTransaction[\s\S]{0,2600}tx\.update\(canonicoRef[\s\S]{0,1200}tx\.update\(publicoRef/.test(portal));
caso('Comprovante atualiza canônico e projeção na mesma transação',
  /salvarComprovanteProtegido[\s\S]{0,2400}runTransaction[\s\S]{0,2400}tx\.update\(canonicoRef[\s\S]{0,1200}tx\.update\(publicoRef/.test(portal));
caso('Sair do Portal limpa as liberações conhecidas antes da sessão',
  portal.includes('__propostasLiberadasIds') &&
  portal.includes('limparLiberacoesPropostaPortal'));
caso('Falha ao responder não vira confirmação falsa',
  portal.includes('Resposta protegida da proposta não confirmada:') &&
  portal.includes('Nada foi tratado como salvo; confira a conexão e tente novamente.'));
caso('Falha no comprovante não vira envio falso',
  portal.includes('Comprovante protegido não confirmado:') &&
  portal.includes('Nada foi tratado como enviado; confira a conexão e tente novamente.'));

caso('Escritório possui projetor com allowlist explícita',
  escritorio.includes('dadosPublicosPropostaPortal') &&
  escritorio.includes('PROPOSTA_PORTAL_CAMPOS_PUBLICOS'));
caso('Projeção pública não copia WhatsApp',
  escritorio.includes('PROPOSTA_PORTAL_CAMPOS_PUBLICOS') &&
  !/PROPOSTA_PORTAL_CAMPOS_PUBLICOS\s*=\s*\[[^\]]*whatsapp/s.test(escritorio));
caso('Salvar proposta grava canônico, índice, verificador e projeção na mesma transação',
  escritorio.includes('gravarProjecaoPropostaPortalTx') &&
  escritorio.includes('propostas_portal_indices') &&
  escritorio.includes('propostas_portal_verificadores') &&
  escritorio.includes('propostas_portal_publicas'));
caso('Proposta preparada nunca fica visível no Portal',
  escritorio.includes('ESTAGIOS_PROPOSTA_PORTAL_PUBLICADA') &&
  !/ESTAGIOS_PROPOSTA_PORTAL_PUBLICADA\s*=\s*\[[^\]]*['"]preparada['"]/.test(escritorio));
caso('Movimentação de estágio sincroniza a projeção',
  escritorio.includes('atualizarNegocioEProjecaoPortal'));
caso('Existe ação explícita e idempotente para legado sem projeção',
  escritorio.includes('publicarPropostaLegadaNoPortal'));
caso('Renderização da Central não materializa projeção silenciosamente',
  !/window\.renderCentralVendas\s*=\s*async function\(\)[\s\S]{0,9000}gravarProjecaoPropostaPortalTx/.test(escritorio));

caso('negocios deixou de conceder leitura ao cliente',
  /allow read:\s*if ehChris\(\);/.test(blocoNegociosRegras) &&
  !/allow read:[^;]*temSessaoCliente/.test(blocoNegociosRegras));
caso('regras definem índice estreito de propostas',
  regras.includes('match /propostas_portal_indices/{propostaId}'));
caso('regras definem verificador exclusivo do Chris',
  regras.includes('match /propostas_portal_verificadores/{propostaId}') &&
  regras.includes('verificadorPropostaPortalValido'));
caso('regras definem projeção pública estreita',
  regras.includes('match /propostas_portal_publicas/{propostaId}') &&
  regras.includes('projecaoPublicaPropostaValida'));
caso('regras definem gate aninhado na sessão',
  regras.includes('match /liberacoes_proposta/{propostaId}') &&
  regras.includes('liberacaoPropostaPortalValida'));
caso('gate confere PIN contra documento que o Portal não lê',
  regras.includes('propostas_portal_verificadores') &&
  regras.includes('.pin4 == dados.pin4'));
caso('gate vincula a liberação à abertura atual da sessão',
  regras.includes('sessaoAbertaEm') &&
  regras.includes('liberacaoPropostaPortalAtiva'));
caso('gate expira por tempo nas regras',
  regras.includes("duration.value(12, 'h')") || regras.includes('duration.value(12,"h")'));
caso('cliente só faz point-get da projeção liberada',
  regras.includes('allow get: if ehChris() || podeLerPropostaPortal') &&
  regras.includes('allow list: if ehChris()'));
caso('projeção pública rejeita campos extras',
  regras.includes("dados.keys().hasOnly([") &&
  regras.includes("'portalRevision','portalOperationId'"));
caso('resposta exige espelhamento atômico entre projeção e canônico',
  regras.includes('getAfter') &&
  regras.includes('respostaPropostaPortalEspelhada'));
caso('comprovante exige espelhamento atômico entre projeção e canônico',
  regras.includes('comprovantePropostaPortalEspelhado'));
caso('cliente não cria nem apaga proposta pública',
  /match \/propostas_portal_publicas\/\{propostaId\}[\s\S]{0,500}allow create, update:\s*if escritaProjecaoPublicaPropostaValida\(propostaId\);[\s\S]{0,150}allow delete:\s*if ehChris\(\)/.test(regras) &&
  /function escritaProjecaoPublicaPropostaValida\(propostaId\)[\s\S]{0,500}return ehChris\(\)[\s\S]*?\? projecaoPublicaPropostaValida[\s\S]*?: \([\s\S]*?exists\([\s\S]*?propostas_portal_publicas[\s\S]*?atualizacaoPublicaClienteValida/.test(regras));

console.log(`V111_PROPOSTA_PORTAL_SEGURA total=${aprovados + reprovados} pass=${aprovados} fail=${reprovados}`);
if (falhas.length) {
  console.error(`Falhas: ${falhas.join(' | ')}`);
  process.exit(1);
}
