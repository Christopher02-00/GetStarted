import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const depsRoot = process.env.GET_V111_DEPS_ROOT || aqui;
const requireDeps = createRequire(join(depsRoot, "package.json"));
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = requireDeps("@firebase/rules-unit-testing");
const {
  Timestamp,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} = requireDeps("firebase/firestore");

const rulesPath = join(aqui, "..", "..", "firestore.rules");
const projectId = "demo-get-portal-propostas-v111";
const rules = await readFile(rulesPath, "utf8");
const rulesHash = createHash("sha256").update(rules).digest("hex");
const [host, rawPort] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:9499").split(":");
const port = Number(rawPort);
const logFirestore = join(aqui, "firestore-debug.log");

function emailDaFuncao(nome) {
  const inicio = rules.indexOf(`function ${nome}()`);
  assert.notEqual(inicio, -1, `função ${nome} ausente nas regras`);
  const trecho = rules.slice(inicio, inicio + 800);
  const encontrado = trecho.match(/request\.auth\.token\.email\s*==\s*'([^']+)'/);
  assert.ok(encontrado, `e-mail semeado de ${nome} não encontrado`);
  return encontrado[1];
}

const identidades = Object.freeze({
  chris: {
    uid: "uid-sintetico-chris-v111",
    email: emailDaFuncao("ehChris")
  },
  amanda: {
    uid: "uid-sintetico-amanda-v111",
    email: emailDaFuncao("ehAmanda")
  },
  alpha: {
    uid: "uid-sintetico-portal-alpha-v111",
    email: "cliente-alpha-v111@invalid.example",
    slug: "cliente-alpha-v111",
    token: "token-sintetico-alpha-v111",
    sessaoAbertaEm: "2026-08-24T10:00:00.000Z"
  },
  beta: {
    uid: "uid-sintetico-portal-beta-v111",
    email: "cliente-beta-v111@invalid.example",
    slug: "cliente-beta-v111",
    token: "token-sintetico-beta-v111",
    sessaoAbertaEm: "2026-08-24T10:05:00.000Z"
  }
});

const propostas = Object.freeze({
  alpha: "proposta-alpha-v111",
  beta: "proposta-beta-v111",
  expirada: "proposta-alpha-expirada-v111",
  nonceAntigo: "proposta-alpha-nonce-antigo-v111",
  oculta: "proposta-alpha-oculta-v111",
  chris: "proposta-criada-chris-v111"
});

const env = await initializeTestEnvironment({
  projectId,
  firestore: { host, port, rules }
});
const contextos = {
  chris: env.authenticatedContext(identidades.chris.uid, {
    email: identidades.chris.email,
    email_verified: true
  }),
  amanda: env.authenticatedContext(identidades.amanda.uid, {
    email: identidades.amanda.email,
    email_verified: true
  }),
  alpha: env.authenticatedContext(identidades.alpha.uid, {
    email: identidades.alpha.email,
    email_verified: true
  }),
  beta: env.authenticatedContext(identidades.beta.uid, {
    email: identidades.beta.email,
    email_verified: true
  }),
  anonimo: env.unauthenticatedContext()
};
const db = Object.fromEntries(Object.entries(contextos).map(([papel, contexto]) => [papel, contexto.firestore()]));

function caminhoIndice(propostaId) {
  return `propostas_portal_indices/${propostaId}`;
}
function caminhoVerificador(propostaId) {
  return `propostas_portal_verificadores/${propostaId}`;
}
function caminhoPublica(propostaId) {
  return `propostas_portal_publicas/${propostaId}`;
}
function caminhoNegocio(propostaId) {
  return `negocios/${propostaId}`;
}
function caminhoGate(uid, propostaId) {
  return `sessoes_cliente/${uid}/liberacoes_proposta/${propostaId}`;
}

function dadosIndice({
  propostaId = propostas.alpha,
  clienteSlug = identidades.alpha.slug,
  temPin = true,
  visivel = true,
  atualizadoEm = serverTimestamp(),
  extra = {}
} = {}) {
  return {
    propostaId,
    clienteSlug,
    temPin,
    visivel,
    atualizadoEm,
    schemaVersion: 1,
    ...extra
  };
}

function dadosVerificador({
  propostaId = propostas.alpha,
  clienteSlug = identidades.alpha.slug,
  pin4 = "4321",
  visivel = true,
  atualizadoEm = serverTimestamp(),
  extra = {}
} = {}) {
  return {
    propostaId,
    clienteSlug,
    pin4,
    visivel,
    atualizadoEm,
    schemaVersion: 1,
    ...extra
  };
}

function dadosPublicos({
  propostaId = propostas.alpha,
  clienteSlug = identidades.alpha.slug,
  estagio = "proposta",
  propostaPlano = "Plano sintético",
  propostaValor = "R$ 1.234,00",
  propostaValidade = "2026-09-30",
  propostaLink = "https://invalid.example/proposta-v111",
  propostaCondicoes = "Condição sintética de teste.",
  respostaCliente = "",
  respostaTexto = "",
  pagamentoComprovante = "",
  pagamentoEnviadoEm = "",
  propostaRecorrencia = "mensal",
  tipoInteresse = "mensalista",
  visivel = true,
  portalRevision = 1,
  portalOperationId = "portal_seed_v111_000001",
  atualizadoEm = serverTimestamp(),
  extra = {}
} = {}) {
  return {
    propostaId,
    clienteSlug,
    estagio,
    propostaPlano,
    propostaValor,
    propostaValidade,
    propostaLink,
    propostaCondicoes,
    respostaCliente,
    respostaTexto,
    pagamentoComprovante,
    pagamentoEnviadoEm,
    propostaRecorrencia,
    tipoInteresse,
    visivel,
    portalRevision,
    portalOperationId,
    atualizadoEm,
    schemaVersion: 1,
    ...extra
  };
}

function dadosNegocio({
  propostaId = propostas.alpha,
  clienteSlug = identidades.alpha.slug,
  estagio = "proposta",
  portalRevision = 1,
  portalOperationId = "portal_seed_v111_000001",
  extra = {}
} = {}) {
  return {
    id: propostaId,
    clienteSlug,
    cliente: "Cliente sintético",
    estagio,
    propostaPlano: "Plano sintético",
    propostaValor: 1234,
    propostaValidade: "2026-09-30",
    propostaLink: "https://invalid.example/proposta-v111",
    propostaCondicoes: "Condição sintética de teste.",
    respostaCliente: "",
    respostaTexto: "",
    pagamentoComprovante: "",
    pagamentoEnviadoEm: "",
    propostaRecorrencia: "mensal",
    tipoInteresse: "mensalista",
    whatsapp: "5500000004321",
    origem: "fixture_v111",
    responsavel: "Responsável interno sintético",
    historico: [],
    portalRevision,
    portalOperationId,
    atualizadoEm: serverTimestamp(),
    ...extra
  };
}

function dadosGate({
  propostaId = propostas.alpha,
  clienteSlug = identidades.alpha.slug,
  pin4 = "4321",
  sessaoAbertaEm = identidades.alpha.sessaoAbertaEm,
  liberadoEm = serverTimestamp(),
  extra = {}
} = {}) {
  return {
    propostaId,
    clienteSlug,
    pin4,
    sessaoAbertaEm,
    liberadoEm,
    schemaVersion: 1,
    ...extra
  };
}

async function semearAdmin(caminho, dados) {
  await env.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), caminho), dados);
  });
}

async function semearConjunto({
  propostaId,
  clienteSlug,
  pin4,
  visivel = true,
  portalOperationId = `portal_seed_${propostaId}`
}) {
  await env.withSecurityRulesDisabled(async (contexto) => {
    const admin = contexto.firestore();
    await setDoc(doc(admin, caminhoNegocio(propostaId)), dadosNegocio({
      propostaId,
      clienteSlug,
      portalOperationId
    }));
    await setDoc(doc(admin, caminhoIndice(propostaId)), dadosIndice({ propostaId, clienteSlug, visivel }));
    await setDoc(doc(admin, caminhoVerificador(propostaId)), dadosVerificador({ propostaId, clienteSlug, pin4, visivel }));
    await setDoc(doc(admin, caminhoPublica(propostaId)), dadosPublicos({
      propostaId,
      clienteSlug,
      visivel,
      portalOperationId
    }));
  });
}

async function semearBase() {
  await env.withSecurityRulesDisabled(async (contexto) => {
    const admin = contexto.firestore();
    for (const identidade of [identidades.alpha, identidades.beta]) {
      await setDoc(doc(admin, `clientes_acesso/${identidade.slug}`), {
        token: identidade.token,
        nome: `Fixture ${identidade.slug}`,
        ativo: true
      });
      await setDoc(doc(admin, `sessoes_cliente/${identidade.uid}`), {
        cliente: identidade.slug,
        token: identidade.token,
        abertaEm: identidade.sessaoAbertaEm
      });
    }
  });
  await semearConjunto({
    propostaId: propostas.alpha,
    clienteSlug: identidades.alpha.slug,
    pin4: "4321"
  });
  await semearConjunto({
    propostaId: propostas.beta,
    clienteSlug: identidades.beta.slug,
    pin4: "8765"
  });
  await semearConjunto({
    propostaId: propostas.expirada,
    clienteSlug: identidades.alpha.slug,
    pin4: "4321"
  });
  await semearConjunto({
    propostaId: propostas.nonceAntigo,
    clienteSlug: identidades.alpha.slug,
    pin4: "4321"
  });
  await semearConjunto({
    propostaId: propostas.oculta,
    clienteSlug: identidades.alpha.slug,
    pin4: "4321",
    visivel: false
  });
  await semearAdmin(caminhoGate(identidades.alpha.uid, propostas.expirada), dadosGate({
    propostaId: propostas.expirada,
    liberadoEm: Timestamp.fromDate(new Date(Date.now() - 13 * 60 * 60 * 1000))
  }));
  await semearAdmin(caminhoGate(identidades.alpha.uid, propostas.nonceAntigo), dadosGate({
    propostaId: propostas.nonceAntigo,
    sessaoAbertaEm: "2026-08-23T08:00:00.000Z",
    liberadoEm: Timestamp.fromDate(new Date())
  }));
}

let aprovados = 0;
const falhas = [];
const hitsExpressoesPorCaso = [];
function totalHitsExpressoes() {
  if (!existsSync(logFirestore)) return 0;
  return (readFileSync(logFirestore, "utf8").match(/maximum of 1000 expressions/g) || []).length;
}
async function caso(nome, executar) {
  const hitsAntes = totalHitsExpressoes();
  try {
    await executar();
    aprovados += 1;
    console.log(`ok ${aprovados + falhas.length} - ${nome}`);
  } catch (erro) {
    falhas.push({ nome, erro });
    console.error(`not ok ${aprovados + falhas.length} - ${nome}`);
    console.error(`  ${erro?.message || erro}`);
  } finally {
    // O emulador responde depois de registrar a avaliação, mas a gravação do
    // log pode chegar alguns milissegundos depois do RPC. A espera curta serve
    // somente à atribuição diagnóstica; não muda a expectativa do teste.
    await new Promise((resolver) => setTimeout(resolver, 20));
    const delta = totalHitsExpressoes() - hitsAntes;
    if (delta > 0) {
      hitsExpressoesPorCaso.push({ nome, delta });
      console.warn(`  # expression_limit_hits=${delta} caso=${nome}`);
    }
  }
}

try {
  await semearBase();

  await caso("Chris lê o negócio canônico", async () => {
    await assertSucceeds(getDoc(doc(db.chris, caminhoNegocio(propostas.alpha))));
  });
  await caso("cliente não lê o negócio canônico antes do gate", async () => {
    await assertFails(getDoc(doc(db.alpha, caminhoNegocio(propostas.alpha))));
  });
  await caso("Amanda não lê o negócio canônico", async () => {
    await assertFails(getDoc(doc(db.amanda, caminhoNegocio(propostas.alpha))));
  });
  await caso("cliente não lista negocios por query própria", async () => {
    await assertFails(getDocs(query(
      collection(db.alpha, "negocios"),
      where("clienteSlug", "==", identidades.alpha.slug)
    )));
  });

  await caso("cliente consulta somente os índices visíveis da própria sessão", async () => {
    const snap = await assertSucceeds(getDocs(query(
      collection(db.alpha, "propostas_portal_indices"),
      where("clienteSlug", "==", identidades.alpha.slug),
      where("visivel", "==", true)
    )));
    assert.equal(snap.docs.length, 3);
    for (const item of snap.docs) {
      assert.deepEqual(Object.keys(item.data()).sort(), [
        "atualizadoEm", "clienteSlug", "propostaId", "schemaVersion", "temPin", "visivel"
      ]);
      assert.equal("pin4" in item.data(), false);
      assert.equal("propostaValor" in item.data(), false);
    }
  });
  await caso("consulta de índice sem filtro de visibilidade falha fechada", async () => {
    await assertFails(getDocs(query(
      collection(db.alpha, "propostas_portal_indices"),
      where("clienteSlug", "==", identidades.alpha.slug)
    )));
  });
  await caso("cliente não obtém índice de outro cliente", async () => {
    await assertFails(getDoc(doc(db.alpha, caminhoIndice(propostas.beta))));
  });
  await caso("cliente não cria índice", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoIndice("indice-invasor-v111")),
      dadosIndice({ propostaId: "indice-invasor-v111" })
    ));
  });
  await caso("cliente não altera índice", async () => {
    await assertFails(updateDoc(doc(db.alpha, caminhoIndice(propostas.alpha)), { temPin: false }));
  });
  await caso("cliente não apaga índice", async () => {
    await assertFails(deleteDoc(doc(db.alpha, caminhoIndice(propostas.alpha))));
  });
  await caso("Amanda não lê índice de proposta", async () => {
    await assertFails(getDoc(doc(db.amanda, caminhoIndice(propostas.alpha))));
  });
  await caso("Chris lista índices para administrar a projeção", async () => {
    const snap = await assertSucceeds(getDocs(collection(db.chris, "propostas_portal_indices")));
    assert.equal(snap.docs.length, 5);
  });

  await caso("Chris lê o verificador privado", async () => {
    const snap = await assertSucceeds(getDoc(doc(db.chris, caminhoVerificador(propostas.alpha))));
    assert.equal(snap.data().pin4, "4321");
  });
  await caso("cliente não lê o verificador privado", async () => {
    await assertFails(getDoc(doc(db.alpha, caminhoVerificador(propostas.alpha))));
  });
  await caso("cliente não lista verificadores", async () => {
    await assertFails(getDocs(collection(db.alpha, "propostas_portal_verificadores")));
  });
  await caso("Chris lista verificadores privados", async () => {
    const snap = await assertSucceeds(getDocs(collection(db.chris, "propostas_portal_verificadores")));
    assert.equal(snap.docs.length, 5);
  });
  await caso("cliente não cria nem altera verificador", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoVerificador("verificador-invasor-v111")),
      dadosVerificador({ propostaId: "verificador-invasor-v111" })
    ));
    await assertFails(updateDoc(doc(db.alpha, caminhoVerificador(propostas.alpha)), { pin4: "0000" }));
  });

  await caso("projeção pública não pode ser lida antes do gate", async () => {
    await assertFails(getDoc(doc(db.alpha, caminhoPublica(propostas.alpha))));
  });
  await caso("PIN incorreto não cria liberação", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.alpha)),
      dadosGate({ pin4: "0000" })
    ));
  });
  await caso("gate rejeita slug de outro cliente", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.alpha)),
      dadosGate({ clienteSlug: identidades.beta.slug })
    ));
  });
  await caso("gate rejeita nonce de outra abertura da sessão", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.alpha)),
      dadosGate({ sessaoAbertaEm: "2026-08-20T00:00:00.000Z" })
    ));
  });
  await caso("gate rejeita propostaId divergente do caminho", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.alpha)),
      dadosGate({ propostaId: propostas.beta })
    ));
  });
  await caso("gate rejeita campo extra", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.alpha)),
      dadosGate({ extra: { permissaoAdministrativa: true } })
    ));
  });
  await caso("cliente não escreve liberação sob UID de outra sessão", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoGate(identidades.beta.uid, propostas.alpha)),
      dadosGate()
    ));
  });
  await caso("PIN de outro cliente não libera proposta cruzada", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.beta)),
      dadosGate({ propostaId: propostas.beta, pin4: "8765" })
    ));
  });
  await caso("proposta marcada como invisível não aceita gate", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.oculta)),
      dadosGate({ propostaId: propostas.oculta })
    ));
  });
  await caso("PIN correto cria liberação vinculada à sessão atual", async () => {
    await assertSucceeds(setDoc(
      doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.alpha)),
      dadosGate()
    ));
  });
  await caso("retry do mesmo PIN válido converge no mesmo gate", async () => {
    await assertSucceeds(setDoc(
      doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.alpha)),
      dadosGate()
    ));
  });
  await caso("point-get da projeção pública passa após gate válido", async () => {
    const snap = await assertSucceeds(getDoc(doc(db.alpha, caminhoPublica(propostas.alpha))));
    assert.equal(snap.data().clienteSlug, identidades.alpha.slug);
    assert.deepEqual(Object.keys(snap.data()).sort(), [
      "atualizadoEm", "clienteSlug", "estagio", "pagamentoComprovante", "pagamentoEnviadoEm",
      "portalOperationId", "portalRevision", "propostaCondicoes", "propostaId", "propostaLink",
      "propostaPlano", "propostaRecorrencia", "propostaValidade", "propostaValor", "respostaCliente",
      "respostaTexto", "schemaVersion", "tipoInteresse", "visivel"
    ]);
    assert.equal("whatsapp" in snap.data(), false);
    assert.equal("responsavel" in snap.data(), false);
    assert.equal("historico" in snap.data(), false);
  });
  await caso("gate não concede leitura do negocio canônico", async () => {
    await assertFails(getDoc(doc(db.alpha, caminhoNegocio(propostas.alpha))));
  });
  await caso("cliente com gate não pode listar projeções públicas", async () => {
    await assertFails(getDocs(collection(db.alpha, "propostas_portal_publicas")));
  });
  await caso("Chris lista projeções públicas para administrar a projeção", async () => {
    const snap = await assertSucceeds(getDocs(collection(db.chris, "propostas_portal_publicas")));
    assert.equal(snap.docs.length, 5);
  });
  await caso("outro cliente não usa a liberação alheia", async () => {
    await assertFails(getDoc(doc(db.beta, caminhoPublica(propostas.alpha))));
  });
  await caso("Amanda não lê a projeção pública por ser gerência operacional", async () => {
    await assertFails(getDoc(doc(db.amanda, caminhoPublica(propostas.alpha))));
  });
  await caso("sessão anônima não lê projeção pública", async () => {
    await assertFails(getDoc(doc(db.anonimo, caminhoPublica(propostas.alpha))));
  });
  await caso("liberação expirada em mais de doze horas é negada", async () => {
    await assertFails(getDoc(doc(db.alpha, caminhoPublica(propostas.expirada))));
  });
  await caso("liberação de abertura anterior da sessão é negada", async () => {
    await assertFails(getDoc(doc(db.alpha, caminhoPublica(propostas.nonceAntigo))));
  });

  await caso("cliente não cria projeção pública", async () => {
    await assertFails(setDoc(
      doc(db.alpha, caminhoPublica("publica-invasora-v111")),
      dadosPublicos({ propostaId: "publica-invasora-v111" })
    ));
  });
  await caso("cliente não apaga projeção pública", async () => {
    await assertFails(deleteDoc(doc(db.alpha, caminhoPublica(propostas.alpha))));
  });
  await caso("schema público rejeita campo extra até para Chris", async () => {
    await assertFails(setDoc(
      doc(db.chris, caminhoPublica("publica-extra-v111")),
      dadosPublicos({
        propostaId: "publica-extra-v111",
        extra: { whatsapp: "5500000000000" }
      })
    ));
  });
  await caso("schema público rejeita campo obrigatório ausente até para Chris", async () => {
    const incompleto = dadosPublicos({ propostaId: "publica-incompleta-v111" });
    delete incompleto.propostaPlano;
    await assertFails(setDoc(
      doc(db.chris, caminhoPublica("publica-incompleta-v111")),
      incompleto
    ));
  });

  const respostaEm = "2026-08-24T10:30:00.000Z";
  const respostaEvento = {
    estagio: "aceita",
    em: respostaEm,
    por: `${identidades.alpha.slug} (cliente)`
  };
  const respostaCanonica = {
    estagio: "aceita",
    respostaCliente: "aceita",
    respostaTexto: "Aceite sintético V111.",
    historico: arrayUnion(respostaEvento),
    portalRevision: 2,
    portalOperationId: "portal_resposta_v111_000002",
    atualizadoEm: serverTimestamp()
  };
  const respostaPublica = {
    estagio: "aceita",
    respostaCliente: "aceita",
    respostaTexto: "Aceite sintético V111.",
    portalRevision: 2,
    portalOperationId: "portal_resposta_v111_000002",
    atualizadoEm: serverTimestamp()
  };

  await caso("resposta somente no canônico é negada", async () => {
    await assertFails(updateDoc(doc(db.alpha, caminhoNegocio(propostas.alpha)), respostaCanonica));
  });
  await caso("resposta somente na projeção é negada", async () => {
    await assertFails(updateDoc(doc(db.alpha, caminhoPublica(propostas.alpha)), respostaPublica));
  });
  await caso("espelhamento divergente é negado", async () => {
    const batch = writeBatch(db.alpha);
    batch.update(doc(db.alpha, caminhoNegocio(propostas.alpha)), respostaCanonica);
    batch.update(doc(db.alpha, caminhoPublica(propostas.alpha)), {
      ...respostaPublica,
      respostaTexto: "Texto divergente e proibido."
    });
    await assertFails(batch.commit());
  });
  await caso("campo canônico fora da allowlist é negado mesmo com espelho", async () => {
    const batch = writeBatch(db.alpha);
    batch.update(doc(db.alpha, caminhoNegocio(propostas.alpha)), {
      ...respostaCanonica,
      origem: "origem-adulterada"
    });
    batch.update(doc(db.alpha, caminhoPublica(propostas.alpha)), respostaPublica);
    await assertFails(batch.commit());
  });
  await caso("resposta canônica e pública passa somente no mesmo commit", async () => {
    const batch = writeBatch(db.alpha);
    batch.update(doc(db.alpha, caminhoNegocio(propostas.alpha)), respostaCanonica);
    batch.update(doc(db.alpha, caminhoPublica(propostas.alpha)), respostaPublica);
    await assertSucceeds(batch.commit());
    const [canonico, publico] = await Promise.all([
      getDoc(doc(db.chris, caminhoNegocio(propostas.alpha))),
      getDoc(doc(db.alpha, caminhoPublica(propostas.alpha)))
    ]);
    assert.equal(canonico.data().portalRevision, 2);
    assert.equal(publico.data().portalRevision, 2);
    assert.equal(canonico.data().respostaTexto, publico.data().respostaTexto);
  });
  await caso("retry com revisão antiga é negado sem segunda gravação", async () => {
    const batch = writeBatch(db.alpha);
    batch.update(doc(db.alpha, caminhoNegocio(propostas.alpha)), respostaCanonica);
    batch.update(doc(db.alpha, caminhoPublica(propostas.alpha)), respostaPublica);
    await assertFails(batch.commit());
  });

  const comprovanteCanonico = {
    pagamentoComprovante: "https://invalid.example/comprovante-v111.pdf",
    pagamentoEnviadoEm: "2026-08-24T10:35:00.000Z",
    portalRevision: 3,
    portalOperationId: "portal_comprovante_v111_000003",
    atualizadoEm: serverTimestamp()
  };
  const comprovantePublico = { ...comprovanteCanonico };

  await caso("comprovante HTTP é negado nos dois documentos", async () => {
    const batch = writeBatch(db.alpha);
    batch.update(doc(db.alpha, caminhoNegocio(propostas.alpha)), {
      ...comprovanteCanonico,
      pagamentoComprovante: "http://invalid.example/inseguro.pdf"
    });
    batch.update(doc(db.alpha, caminhoPublica(propostas.alpha)), {
      ...comprovantePublico,
      pagamentoComprovante: "http://invalid.example/inseguro.pdf"
    });
    await assertFails(batch.commit());
  });
  await caso("comprovante somente no canônico é negado", async () => {
    await assertFails(updateDoc(doc(db.alpha, caminhoNegocio(propostas.alpha)), comprovanteCanonico));
  });
  await caso("comprovante canônico e público passa atomicamente", async () => {
    const batch = writeBatch(db.alpha);
    batch.update(doc(db.alpha, caminhoNegocio(propostas.alpha)), comprovanteCanonico);
    batch.update(doc(db.alpha, caminhoPublica(propostas.alpha)), comprovantePublico);
    await assertSucceeds(batch.commit());
    const [canonico, publico] = await Promise.all([
      getDoc(doc(db.chris, caminhoNegocio(propostas.alpha))),
      getDoc(doc(db.alpha, caminhoPublica(propostas.alpha)))
    ]);
    assert.equal(canonico.data().portalRevision, 3);
    assert.equal(publico.data().portalRevision, 3);
    assert.equal(canonico.data().pagamentoComprovante, publico.data().pagamentoComprovante);
  });

  await caso("Amanda não escreve resposta no canônico", async () => {
    await assertFails(updateDoc(doc(db.amanda, caminhoNegocio(propostas.alpha)), { notaInterna: "não" }));
  });
  await caso("Chris pode atualizar o negócio canônico", async () => {
    await assertSucceeds(updateDoc(doc(db.chris, caminhoNegocio(propostas.alpha)), {
      notaInterna: "Atualização sintética exclusiva do Chris."
    }));
  });
  await caso("Chris cria os documentos estreitos válidos", async () => {
    const batch = writeBatch(db.chris);
    batch.set(doc(db.chris, caminhoNegocio(propostas.chris)), dadosNegocio({
      propostaId: propostas.chris,
      clienteSlug: identidades.alpha.slug,
      portalOperationId: "portal_chris_v111_000001"
    }));
    batch.set(doc(db.chris, caminhoIndice(propostas.chris)), dadosIndice({
      propostaId: propostas.chris
    }));
    batch.set(doc(db.chris, caminhoVerificador(propostas.chris)), dadosVerificador({
      propostaId: propostas.chris
    }));
    batch.set(doc(db.chris, caminhoPublica(propostas.chris)), dadosPublicos({
      propostaId: propostas.chris,
      portalOperationId: "portal_chris_v111_000001"
    }));
    await assertSucceeds(batch.commit());
  });
  await caso("Chris lê e atualiza canônico e projeção no mesmo commit", async () => {
    await assertSucceeds(getDoc(doc(db.chris, caminhoPublica(propostas.chris))));
    const patchAtualizado = {
      propostaCondicoes: "Condição atualizada pelo Chris.",
      portalRevision: 2,
      portalOperationId: "portal_chris_v111_000002",
      atualizadoEm: serverTimestamp()
    };
    const batch = writeBatch(db.chris);
    batch.update(doc(db.chris, caminhoNegocio(propostas.chris)), patchAtualizado);
    batch.update(doc(db.chris, caminhoPublica(propostas.chris)), patchAtualizado);
    await assertSucceeds(batch.commit());
  });
  await caso("Chris pode apagar projeção derivada, mas cliente não", async () => {
    await assertSucceeds(deleteDoc(doc(db.chris, caminhoPublica(propostas.chris))));
  });

  await caso("logout remove gate próprio e revoga o point-get", async () => {
    await assertSucceeds(deleteDoc(doc(db.alpha, caminhoGate(identidades.alpha.uid, propostas.alpha))));
    await assertFails(getDoc(doc(db.alpha, caminhoPublica(propostas.alpha))));
  });
} finally {
  await env.cleanup();
}

console.log(
  `V111_PORTAL_PROPOSTAS_EMULATOR total=${aprovados + falhas.length} pass=${aprovados} fail=${falhas.length} rules_sha256=${rulesHash}`
);
console.log(
  `V111_PORTAL_PROPOSTAS_EXPRESSION_CASES total=${hitsExpressoesPorCaso.reduce((soma, item) => soma + item.delta, 0)} casos=${hitsExpressoesPorCaso.length}`
);
for (const item of hitsExpressoesPorCaso) {
  console.log(`V111_PORTAL_PROPOSTAS_EXPRESSION_CASE hits=${item.delta} nome=${JSON.stringify(item.nome)}`);
}
if (falhas.length) {
  console.error(`Falhas: ${falhas.map(({ nome }) => nome).join(" | ")}`);
  process.exit(1);
}
