import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const depsRoot = process.env.GET_V103_DEPS_ROOT || aqui;
const requireDeps = createRequire(join(depsRoot, "package.json"));
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = requireDeps("@firebase/rules-unit-testing");
const {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} = requireDeps("firebase/firestore");

const rulesPath = join(aqui, "..", "..", "firestore.rules");
const projectId = "demo-get-financeiro-v103";
const rules = await readFile(rulesPath, "utf8");
const rulesHash = createHash("sha256").update(rules).digest("hex");
const [host, rawPort] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:9399").split(":");
const port = Number(rawPort);

function emailDaFuncao(nome) {
  const inicio = rules.indexOf(`function ${nome}()`);
  assert.notEqual(inicio, -1, `função ${nome} ausente nas regras`);
  const trecho = rules.slice(inicio, inicio + 700);
  const encontrado = trecho.match(/request\.auth\.token\.email\s*==\s*'([^']+)'/);
  assert.ok(encontrado, `e-mail semeado de ${nome} não encontrado`);
  return encontrado[1];
}

function emailDoFilmmaker(nome) {
  const inicio = rules.indexOf("function ehDonoExtra(");
  assert.notEqual(inicio, -1, "função ehDonoExtra ausente nas regras");
  const trecho = rules.slice(inicio, inicio + 1800);
  const nomeSeguro = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const encontrado = trecho.match(new RegExp(`request\\.auth\\.token\\.email == '([^']+)' && dados\\.filmmaker == '${nomeSeguro}'`));
  assert.ok(encontrado, `e-mail semeado do filmmaker ${nome} não encontrado`);
  return encontrado[1];
}

const emails = Object.freeze({
  chris: emailDaFuncao("ehChris"),
  amanda: emailDaFuncao("ehAmanda"),
  outro: emailDaFuncao("ehGabi"),
  cecilia: emailDaFuncao("ehCecilia"),
  luis: emailDoFilmmaker("Luís"),
  nathan: emailDoFilmmaker("Nathan")
});
const uids = Object.freeze({
  chris: "uid-sintetico-chris-v103",
  amanda: "uid-sintetico-amanda-v103",
  outro: "uid-sintetico-outro-v103",
  cecilia: "uid-sintetico-cecilia-v103",
  luis: "uid-sintetico-luis-v103",
  nathan: "uid-sintetico-nathan-v103",
  cliente: "uid-sintetico-cliente-v103"
});

const env = await initializeTestEnvironment({
  projectId,
  firestore: { host, port, rules }
});
const contextos = {
  chris: env.authenticatedContext(uids.chris, { email: emails.chris, email_verified: true }),
  amanda: env.authenticatedContext(uids.amanda, { email: emails.amanda, email_verified: true }),
  outro: env.authenticatedContext(uids.outro, { email: emails.outro, email_verified: true }),
  cecilia: env.authenticatedContext(uids.cecilia, { email: emails.cecilia, email_verified: true }),
  luis: env.authenticatedContext(uids.luis, { email: emails.luis, email_verified: true }),
  nathan: env.authenticatedContext(uids.nathan, { email: emails.nathan, email_verified: true }),
  cliente: env.authenticatedContext(uids.cliente, { email: "fixture-cliente@invalid.example", email_verified: true }),
  anonimo: env.unauthenticatedContext()
};
const db = Object.fromEntries(Object.entries(contextos).map(([papel, contexto]) => [papel, contexto.firestore()]));

let sequencia = 0;
function operationId(rotulo = "operacao") {
  sequencia += 1;
  const limpo = rotulo.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 50).padEnd(12, "0");
  return `fin_${limpo}_${String(sequencia).padStart(6, "0")}`;
}
function hash(caractere) {
  return caractere.repeat(64);
}
function caminhoLancamento(docId) {
  return `financeiro_lancamentos/${docId}`;
}
function caminhoLedger(op) {
  return `clientes_ciclo_financeiro/${op}`;
}
function caminhoContatoFinanceiro(slug) {
  return `contatos_clientes_financeiro/${slug}`;
}
function dadosContatoFinanceiro({
  slug = "zeiss",
  whatsapp = "5541990000101",
  nome = "Zeiss sintética",
  origem = "edicao_regua",
  atualizadoPor = "Chris",
  atualizadoEm = serverTimestamp(),
  extra = {}
} = {}) {
  return {
    slug,
    whatsapp,
    nome,
    origem,
    atualizadoPor,
    atualizadoEm,
    ...extra
  };
}
function dadosLancamento({
  op = operationId("lancamento"),
  competencia = "2026-09",
  tipo = "custo_fixo",
  descricao = "Custo sintético recorrente",
  valor = 1000,
  status = "previsto",
  dataCaixa = status === "pago" ? serverTimestamp() : null,
  beneficiarioRef = "beneficiario-sintetico",
  observacao = "",
  autorUid = uids.chris,
  criadoEm = serverTimestamp(),
  atualizadoEm = serverTimestamp(),
  revision = 1,
  extra = {}
} = {}) {
  return {
    schemaVersion: 1,
    competencia,
    tipo,
    descricao,
    valor,
    status,
    dataCaixa,
    beneficiarioRef,
    observacao,
    autorUid,
    criadoEm,
    atualizadoEm,
    revision,
    operationId: op,
    ...extra
  };
}
function dadosLedger({
  op,
  clienteId = "cliente-sintetico",
  tipo = "entrada",
  competenciaInicio = "2026-09",
  ultimaCompetencia = null,
  dataEfetiva = serverTimestamp(),
  valor = 1000,
  sourceType = "ajuste_manual",
  sourceId = "contrato-sintetico",
  reversalOf = null,
  preHash = hash("a"),
  postHash = hash("b"),
  criadoPor = uids.chris,
  criadoEm = serverTimestamp(),
  extra = {}
}) {
  return {
    schemaVersion: 1,
    operationId: op,
    clienteId,
    tipo,
    competenciaInicio,
    ultimaCompetencia,
    dataEfetiva,
    valor,
    sourceType,
    sourceId,
    reversalOf,
    preHash,
    postHash,
    criadoPor,
    criadoEm,
    ...extra
  };
}

function dadosMensalidade({
  cliente = "cliente-sintetico",
  competencia = "2026-09",
  status = "aberto",
  valor = 1000,
  extra = {}
} = {}) {
  return {
    cliente,
    clienteSlug: cliente,
    canonicalId: cliente,
    competencia,
    status,
    valor,
    valorDevido: valor,
    valorCobrado: valor,
    pagoEm: null,
    comprovante: "",
    comprovanteEnviadoEm: "",
    ...extra
  };
}

function dadosContrato({
  slug = "cliente-sintetico",
  valor = 1000,
  diaVencimento = 10,
  revision = 1,
  operationId = "fin_contrato_seed_000001",
  extra = {}
} = {}) {
  return {
    cliente: "Cliente Sintético",
    slug,
    status: "ativo",
    plano: "Intermediário",
    observacao: "Contrato sintético",
    valorCheio: valor,
    valorVigente: valor,
    diaVencimento,
    financeiroRevision: revision,
    financeiroOperationId: operationId,
    ...extra
  };
}

async function semearAdmin(caminho, dados) {
  await env.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), caminho), dados);
  });
}

async function semearMensalidade(docId, dados = dadosMensalidade()) {
  await semearAdmin(`pagamentos_mensais/${docId}`, dados);
}

async function semearContrato(slug, dados = dadosContrato({ slug })) {
  await semearAdmin(`contratos_cliente/${slug}`, dados);
}
function ledgerDoLancamento(docId, lancamento, tipo = "lancamento", reversalOf = null, extra = {}) {
  return dadosLedger({
    op: lancamento.operationId,
    clienteId: lancamento.beneficiarioRef,
    tipo,
    competenciaInicio: lancamento.competencia,
    dataEfetiva: serverTimestamp(),
    valor: lancamento.valor,
    sourceType: "financeiro_lancamento",
    sourceId: docId,
    reversalOf,
    criadoPor: lancamento.autorUid,
    criadoEm: serverTimestamp(),
    extra
  });
}
function batchLancamento(database, docId, lancamento, tipoLedger = "lancamento", reversalOf = null, opcoes = {}) {
  const batch = writeBatch(database);
  const ledger = ledgerDoLancamento(docId, lancamento, tipoLedger, reversalOf, opcoes.extraLedger || {});
  if (!opcoes.semLancamento) batch.set(doc(database, caminhoLancamento(docId)), lancamento);
  if (!opcoes.semLedger) batch.set(doc(database, caminhoLedger(lancamento.operationId)), ledger);
  return batch;
}
function batchReajusteContrato(database, {
  slug,
  pagamentoId,
  op,
  valor = 1200,
  competenciaProgramada = "2026-10",
  opContrato = op,
  opPagamento = op,
  revisaoContrato = 2,
  valorPagamento = valor,
  valorLedger = valor,
  incluirContrato = true,
  incluirLedger = true,
  incluirPagamento = true,
  camposValorPagamento = { valor: valorPagamento, valorCobrado: valorPagamento },
  extraContrato = {},
  extraPagamento = {},
  extraLedger = {}
}) {
  const batch = writeBatch(database);
  if (incluirContrato) {
    batch.update(doc(database, `contratos_cliente/${slug}`), {
      valorProgramado: valor,
      valorProgramadoEm: competenciaProgramada,
      valorProgramadoMotivo: "Reajuste sintético auditável",
      valorProgramadoPor: uids.chris,
      valorProgramadoAtualizadoEm: serverTimestamp(),
      financeiroRevision: revisaoContrato,
      financeiroOperationId: opContrato,
      ...extraContrato
    });
  }
  if (incluirLedger) {
    batch.set(doc(database, caminhoLedger(op)), dadosLedger({
      op,
      clienteId: slug,
      tipo: "alteracao_valor",
      competenciaInicio: competenciaProgramada,
      valor: valorLedger,
      sourceType: "contrato",
      sourceId: slug,
      preHash: hash("c"),
      postHash: hash("d"),
      extra: extraLedger
    }));
  }
  if (incluirPagamento) {
    batch.update(doc(database, `pagamentos_mensais/${pagamentoId}`), {
      valorDevido: valorPagamento,
      ...camposValorPagamento,
      valorContratoProgramado: true,
      valorContratoProgramadoEm: competenciaProgramada,
      financeiroOperationId: opPagamento,
      atualizadoPor: uids.chris,
      atualizadoEm: serverTimestamp(),
      ...extraPagamento
    });
  }
  return batch;
}
function batchReconciliacaoMensalidadeStale(database, {
  slug,
  pagamentoId,
  op,
  valor = 1200,
  competenciaProgramada = "2026-10",
  revisaoContrato = 2,
  opContrato = op,
  opPagamento = op,
  incluirLedger = true
}) {
  const batch = writeBatch(database);
  batch.update(doc(database, `contratos_cliente/${slug}`), {
    financeiroRevision: revisaoContrato,
    financeiroOperationId: opContrato
  });
  if (incluirLedger) {
    batch.set(doc(database, caminhoLedger(op)), dadosLedger({
      op,
      clienteId: slug,
      tipo: "ajuste",
      competenciaInicio: competenciaProgramada,
      valor: null,
      sourceType: "contrato",
      sourceId: slug,
      preHash: hash("c"),
      postHash: hash("d")
    }));
  }
  batch.update(doc(database, `pagamentos_mensais/${pagamentoId}`), {
    valorDevido: valor,
    valor,
    valorCobrado: valor,
    valorContratoProgramado: true,
    valorContratoProgramadoEm: competenciaProgramada,
    financeiroOperationId: opPagamento,
    atualizadoPor: uids.chris,
    atualizadoEm: serverTimestamp()
  });
  return batch;
}
async function lerAdmin(caminho) {
  let resultado;
  await env.withSecurityRulesDisabled(async (contexto) => {
    resultado = await getDoc(doc(contexto.firestore(), caminho));
  });
  return resultado;
}
async function listarAdmin(caminho) {
  let resultado;
  await env.withSecurityRulesDisabled(async (contexto) => {
    resultado = await getDocs(collection(contexto.firestore(), caminho));
  });
  return resultado;
}
async function semearBase() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (contexto) => {
    const admin = contexto.firestore();
    const op = "fin_fixture_leitura_000001";
    await setDoc(doc(admin, caminhoLedger(op)), {
      schemaVersion: 1,
      operationId: op,
      clienteId: "cliente-sintetico",
      tipo: "entrada",
      competenciaInicio: "2026-09",
      ultimaCompetencia: null,
      dataEfetiva: new Date("2026-09-01T12:00:00.000Z"),
      valor: 1000,
      sourceType: "contrato",
      sourceId: "contrato-sintetico",
      reversalOf: null,
      preHash: hash("a"),
      postHash: hash("b"),
      criadoPor: uids.chris,
      criadoEm: new Date("2026-09-01T12:00:00.000Z")
    });
    await setDoc(doc(admin, caminhoLancamento("fixture-leitura")), {
      schemaVersion: 1,
      competencia: "2026-09",
      tipo: "custo_fixo",
      descricao: "Fixture financeira sintética",
      valor: 1000,
      status: "previsto",
      dataCaixa: null,
      beneficiarioRef: "beneficiario-sintetico",
      observacao: "",
      autorUid: uids.chris,
      criadoEm: new Date("2026-09-01T12:00:00.000Z"),
      atualizadoEm: new Date("2026-09-01T12:00:00.000Z"),
      revision: 1,
      operationId: op
    });
    await setDoc(doc(admin, "clientes_acesso/cliente-sintetico"), {
      cliente: "cliente-sintetico",
      token: "token-portal-sintetico-v103",
      ativo: true
    });
    await setDoc(doc(admin, `sessoes_cliente/${uids.cliente}`), {
      cliente: "cliente-sintetico",
      token: "token-portal-sintetico-v103"
    });
  });
}

let aprovados = 0;
let reprovados = 0;
const falhas = [];
async function caso(nome, executar) {
  try {
    await executar();
    aprovados += 1;
    console.log(`ok ${aprovados + reprovados} - ${nome}`);
  } catch (erro) {
    reprovados += 1;
    falhas.push({ nome, erro });
    console.error(`not ok ${aprovados + reprovados} - ${nome}`);
    console.error(String(erro?.message || erro));
  }
}

try {
  await semearBase();

  await caso("Chris cria contato financeiro canônico da Zeiss", async () => {
    await assertSucceeds(setDoc(
      doc(db.chris, caminhoContatoFinanceiro("zeiss")),
      dadosContatoFinanceiro()
    ));
    const salvo = await lerAdmin(caminhoContatoFinanceiro("zeiss"));
    assert.equal(salvo.exists(), true);
    assert.equal(salvo.data().slug, "zeiss");
    assert.equal(salvo.data().whatsapp, "5541990000101");
  });
  await caso("Chris lê o contato canônico e lista a coleção privada", async () => {
    const contato = await assertSucceeds(getDoc(doc(db.chris, caminhoContatoFinanceiro("zeiss"))));
    const contatos = await assertSucceeds(getDocs(collection(db.chris, "contatos_clientes_financeiro")));
    assert.equal(contato.exists(), true);
    assert.equal(contatos.docs.filter((snap) => snap.id === "zeiss").length, 1);
  });
  await caso("retry de create/update do Chris é idempotente e mantém um único /zeiss", async () => {
    const referencia = doc(db.chris, caminhoContatoFinanceiro("zeiss"));
    await assertSucceeds(setDoc(referencia, dadosContatoFinanceiro(), { merge: true }));
    await assertSucceeds(updateDoc(referencia, {
      whatsapp: "5541990000102",
      atualizadoEm: serverTimestamp()
    }));
    await assertSucceeds(updateDoc(referencia, {
      whatsapp: "5541990000102",
      atualizadoEm: serverTimestamp()
    }));
    const contatos = await listarAdmin("contatos_clientes_financeiro");
    const canonicos = contatos.docs.filter((snap) => snap.id === "zeiss");
    assert.equal(canonicos.length, 1);
    assert.equal(canonicos[0].data().whatsapp, "5541990000102");
  });
  await caso("slug divergente do docId é negado", async () => {
    await assertFails(setDoc(
      doc(db.chris, caminhoContatoFinanceiro("zeiss-alias")),
      dadosContatoFinanceiro({ slug: "zeiss" })
    ));
  });
  await caso("telefone financeiro inválido é negado", async () => {
    await assertFails(setDoc(
      doc(db.chris, caminhoContatoFinanceiro("contato-invalido")),
      dadosContatoFinanceiro({ slug: "contato-invalido", whatsapp: "telefone-invalido-sintetico" })
    ));
  });
  await caso("campo extra no contato financeiro é negado", async () => {
    await assertFails(setDoc(
      doc(db.chris, caminhoContatoFinanceiro("contato-extra")),
      dadosContatoFinanceiro({ slug: "contato-extra", extra: { dadoNaoPermitido: true } })
    ));
  });
  await caso("anônimo não lê, cria nem atualiza contato financeiro", async () => {
    await assertFails(getDoc(doc(db.anonimo, caminhoContatoFinanceiro("zeiss"))));
    await assertFails(setDoc(
      doc(db.anonimo, caminhoContatoFinanceiro("contato-anonimo")),
      dadosContatoFinanceiro({ slug: "contato-anonimo" })
    ));
    await assertFails(updateDoc(doc(db.anonimo, caminhoContatoFinanceiro("zeiss")), {
      whatsapp: "5541990000103",
      atualizadoEm: serverTimestamp()
    }));
  });
  for (const papel of ["cecilia", "luis", "nathan"]) {
    await caso(`${papel} não lê, cria nem atualiza contato financeiro`, async () => {
      const slug = `contato-${papel}`;
      await assertFails(getDoc(doc(db[papel], caminhoContatoFinanceiro("zeiss"))));
      await assertFails(setDoc(
        doc(db[papel], caminhoContatoFinanceiro(slug)),
        dadosContatoFinanceiro({ slug })
      ));
      await assertFails(updateDoc(doc(db[papel], caminhoContatoFinanceiro("zeiss")), {
        whatsapp: "5541990000103",
        atualizadoEm: serverTimestamp()
      }));
    });
  }
  await caso("Amanda jamais lê contato pontual nem lista a coleção privada", async () => {
    await assertFails(getDoc(doc(db.amanda, caminhoContatoFinanceiro("zeiss"))));
    await assertFails(getDocs(collection(db.amanda, "contatos_clientes_financeiro")));
  });
  await caso("Amanda cria somente nas três origens estreitas autorizadas", async () => {
    for (const origem of ["ativacao_mensalista", "ativacao_avulso", "reativacao"]) {
      const slug = `contato-amanda-${origem}`;
      await assertSucceeds(setDoc(
        doc(db.amanda, caminhoContatoFinanceiro(slug)),
        dadosContatoFinanceiro({
          slug,
          whatsapp: "5541990000201",
          origem,
          atualizadoPor: "Amanda"
        })
      ));
    }
  });
  await caso("Amanda não cria contato com origem ampla, autoria alheia ou campo extra", async () => {
    await assertFails(setDoc(
      doc(db.amanda, caminhoContatoFinanceiro("contato-amanda-origem-ampla")),
      dadosContatoFinanceiro({
        slug: "contato-amanda-origem-ampla",
        origem: "edicao_regua",
        atualizadoPor: "Amanda"
      })
    ));
    await assertFails(setDoc(
      doc(db.amanda, caminhoContatoFinanceiro("contato-amanda-autoria")),
      dadosContatoFinanceiro({
        slug: "contato-amanda-autoria",
        origem: "reativacao",
        atualizadoPor: "Chris"
      })
    ));
    await assertFails(setDoc(
      doc(db.amanda, caminhoContatoFinanceiro("contato-amanda-extra")),
      dadosContatoFinanceiro({
        slug: "contato-amanda-extra",
        origem: "reativacao",
        atualizadoPor: "Amanda",
        extra: { criadoPor: "Amanda" }
      })
    ));
  });
  await caso("update e retry da Amanda exigem origem estreita e são idempotentes", async () => {
    const referencia = doc(db.amanda, caminhoContatoFinanceiro("contato-amanda-ativacao_mensalista"));
    const alteracao = {
      whatsapp: "5541990000202",
      origem: "reativacao",
      atualizadoPor: "Amanda",
      atualizadoEm: serverTimestamp()
    };
    await assertSucceeds(updateDoc(referencia, alteracao));
    await assertSucceeds(updateDoc(referencia, alteracao));
    const salvo = await lerAdmin(caminhoContatoFinanceiro("contato-amanda-ativacao_mensalista"));
    assert.equal(salvo.data().whatsapp, "5541990000202");
  });
  await caso("Amanda não amplia origem durante update", async () => {
    await assertFails(updateDoc(
      doc(db.amanda, caminhoContatoFinanceiro("contato-amanda-ativacao_avulso")),
      {
        origem: "edicao_financeiro",
        atualizadoPor: "Amanda",
        atualizadoEm: serverTimestamp()
      }
    ));
  });
  await caso("delete físico de contato financeiro é negado a Chris e Amanda", async () => {
    await assertFails(deleteDoc(doc(db.chris, caminhoContatoFinanceiro("zeiss"))));
    await assertFails(deleteDoc(doc(db.amanda, caminhoContatoFinanceiro("contato-amanda-reativacao"))));
  });

  await caso("Chris lê lançamento e ledger", async () => {
    const [lancamento, evento] = await Promise.all([
      assertSucceeds(getDoc(doc(db.chris, caminhoLancamento("fixture-leitura")))),
      assertSucceeds(getDoc(doc(db.chris, caminhoLedger("fin_fixture_leitura_000001"))))
    ]);
    assert.equal(lancamento.exists() && evento.exists(), true);
  });
  await caso("Amanda não lê ledger nem lançamento privado", async () => {
    await assertFails(getDoc(doc(db.amanda, caminhoLedger("fin_fixture_leitura_000001"))));
    await assertFails(getDoc(doc(db.amanda, caminhoLancamento("fixture-leitura"))));
  });
  await caso("papel indevido não lê ledger nem lançamento", async () => {
    await assertFails(getDoc(doc(db.outro, caminhoLedger("fin_fixture_leitura_000001"))));
    await assertFails(getDoc(doc(db.outro, caminhoLancamento("fixture-leitura"))));
  });
  await caso("cliente não lê ledger nem lançamento", async () => {
    await assertFails(getDoc(doc(db.cliente, caminhoLedger("fin_fixture_leitura_000001"))));
    await assertFails(getDoc(doc(db.cliente, caminhoLancamento("fixture-leitura"))));
  });
  await caso("anônimo não lê ledger nem lançamento", async () => {
    await assertFails(getDoc(doc(db.anonimo, caminhoLedger("fin_fixture_leitura_000001"))));
    await assertFails(getDoc(doc(db.anonimo, caminhoLancamento("fixture-leitura"))));
  });
  await caso("Chris lista lançamentos e ledger", async () => {
    assert.ok((await assertSucceeds(getDocs(collection(db.chris, "financeiro_lancamentos")))).size >= 1);
    assert.ok((await assertSucceeds(getDocs(collection(db.chris, "clientes_ciclo_financeiro")))).size >= 1);
  });
  await caso("Amanda não lista ledger nem lançamentos privados", async () => {
    await assertFails(getDocs(collection(db.amanda, "clientes_ciclo_financeiro")));
    await assertFails(getDocs(collection(db.amanda, "financeiro_lancamentos")));
  });

  await caso("Chris cria evento de entrada append-only", async () => {
    const op = operationId("entrada");
    await assertSucceeds(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({ op })));
  });
  await caso("Amanda não cria evento financeiro append-only", async () => {
    const op = operationId("saida");
    await assertFails(setDoc(doc(db.amanda, caminhoLedger(op)), dadosLedger({
      op,
      tipo: "saida",
      ultimaCompetencia: "2026-08",
      valor: null,
      sourceType: "cliente_encerrado",
      sourceId: "saida-sintetica",
      criadoPor: uids.amanda
    })));
  });
  await caso("retry determinístico não duplica evento", async () => {
    const op = operationId("retry");
    const evento = dadosLedger({ op });
    await assertSucceeds(setDoc(doc(db.chris, caminhoLedger(op)), evento));
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), evento));
    const todos = await listarAdmin("clientes_ciclo_financeiro");
    assert.equal(todos.docs.filter((snap) => snap.id === op).length, 1);
  });
  await caso("evento append-only não aceita update", async () => {
    const op = operationId("imutavel");
    await assertSucceeds(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({ op })));
    await assertFails(updateDoc(doc(db.chris, caminhoLedger(op)), { valor: 2000 }));
  });
  await caso("evento append-only não aceita delete", async () => {
    const op = operationId("delete");
    await assertSucceeds(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({ op })));
    await assertFails(deleteDoc(doc(db.chris, caminhoLedger(op))));
  });
  await caso("papel indevido não cria evento", async () => {
    const op = operationId("outro");
    await assertFails(setDoc(doc(db.outro, caminhoLedger(op)), dadosLedger({ op, criadoPor: uids.outro })));
  });
  await caso("cliente não cria evento", async () => {
    const op = operationId("cliente");
    await assertFails(setDoc(doc(db.cliente, caminhoLedger(op)), dadosLedger({ op, criadoPor: uids.cliente })));
  });
  await caso("operationId divergente do ID é negado", async () => {
    const op = operationId("id-diverge");
    await assertFails(setDoc(doc(db.chris, caminhoLedger(operationId("outro-id"))), dadosLedger({ op })));
  });
  await caso("competência inválida no ledger é negada", async () => {
    const op = operationId("competencia");
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({ op, competenciaInicio: "2026-13" })));
  });
  await caso("valor negativo no ledger é negado", async () => {
    const op = operationId("valor");
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({ op, valor: -1 })));
  });
  await caso("campo extra no ledger é negado", async () => {
    const op = operationId("extra");
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({ op, extra: { dadoNaoPermitido: true } })));
  });
  await caso("reversão exige referência válida", async () => {
    const op = operationId("reversao-sem-ref");
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({ op, tipo: "reversao" })));
  });
  await caso("evento comum não aceita reversalOf", async () => {
    const op = operationId("ref-indevida");
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({ op, reversalOf: operationId("anterior") })));
  });
  await caso("reversão genérica referencia evento existente e preservado", async () => {
    const anterior = operationId("evento-anterior");
    await assertSucceeds(setDoc(doc(db.chris, caminhoLedger(anterior)), dadosLedger({ op: anterior })));
    const op = operationId("reversao-generica");
    await assertSucceeds(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({
      op,
      tipo: "reversao",
      reversalOf: anterior,
      preHash: hash("b"),
      postHash: hash("c")
    })));
  });
  await caso("reversão genérica não aponta para evento inexistente", async () => {
    const op = operationId("reversao-ausente");
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({
      op,
      tipo: "reversao",
      reversalOf: "fin_evento_ausente_000001"
    })));
  });
  await caso("hashes iguais no ledger são negados", async () => {
    const op = operationId("hash");
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({ op, postHash: hash("a") })));
  });

  await caso("gerência conclui mensalidade aberta como paga", async () => {
    const id = "mensalidade-aberta-para-paga";
    await semearMensalidade(id);
    await assertSucceeds(updateDoc(doc(db.amanda, `pagamentos_mensais/${id}`), {
      status: "pago",
      pagoEm: serverTimestamp()
    }));
  });
  await caso("gerência conclui mensalidade aberta como isenta", async () => {
    const id = "mensalidade-aberta-para-isenta";
    await semearMensalidade(id);
    await assertSucceeds(updateDoc(doc(db.amanda, `pagamentos_mensais/${id}`), {
      status: "isento"
    }));
  });
  await caso("gerência cancela mensalidade aberta somente por saída auditável", async () => {
    const id = "mensalidade-aberta-para-cancelada";
    await semearMensalidade(id);
    await assertSucceeds(updateDoc(doc(db.amanda, `pagamentos_mensais/${id}`), {
      status: "cancelado",
      canceladoPorSaida: true,
      canceladoPorSaidaId: "saida-sintetica-v103",
      statusAntesSaida: "aberto",
      motivoCancelamento: "Saída sintética confirmada",
      canceladoEm: serverTimestamp(),
      canceladoPor: uids.amanda,
      atualizadoEm: serverTimestamp(),
      atualizadoPor: uids.amanda
    }));
  });
  await caso("mensalidade aberta não é cancelada sem trilha de saída", async () => {
    const id = "mensalidade-aberta-cancelamento-solto";
    await semearMensalidade(id);
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), {
      status: "cancelado"
    }));
  });
  await caso("mensalidade paga não reabre nem troca de estado terminal", async () => {
    const id = "mensalidade-paga-terminal";
    await semearMensalidade(id, dadosMensalidade({ status: "pago", extra: { pagoEm: new Date("2026-09-10T12:00:00.000Z") } }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), { status: "aberto" }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), { status: "isento" }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), { status: "cancelado" }));
  });
  await caso("mensalidade isenta não reabre nem troca para paga", async () => {
    const id = "mensalidade-isenta-terminal";
    await semearMensalidade(id, dadosMensalidade({ status: "isento" }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), { status: "aberto" }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), { status: "pago" }));
  });
  await caso("mensalidade cancelada não reabre nem troca para isenta", async () => {
    const id = "mensalidade-cancelada-terminal";
    await semearMensalidade(id, dadosMensalidade({ status: "cancelado" }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), { status: "aberto" }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), { status: "isento" }));
  });
  await caso("mensalidade terminal não muda valor nem identidade", async () => {
    const id = "mensalidade-terminal-imutavel";
    await semearMensalidade(id, dadosMensalidade({ status: "pago", extra: { pagoEm: new Date("2026-09-10T12:00:00.000Z") } }));
    const ref = doc(db.chris, `pagamentos_mensais/${id}`);
    await assertFails(updateDoc(ref, { valor: 1100 }));
    await assertFails(updateDoc(ref, { valorDevido: 1100 }));
    await assertFails(updateDoc(ref, { valorCobrado: 1100 }));
    await assertFails(updateDoc(ref, { cliente: "outro-cliente" }));
    await assertFails(updateDoc(ref, { competencia: "2026-10" }));
  });
  await caso("todas as flags legadas terminais bloqueiam reabertura, troca, valor e identidade", async () => {
    const flags = [
      "cancelado", "cancelada", "encerrado", "encerrada",
      "excluido", "excluida", "arquivado", "arquivada"
    ];
    for (const flag of flags) {
      const id = `mensalidade-flag-${flag}`;
      await semearMensalidade(id, dadosMensalidade({ extra: { [flag]: true } }));
      const ref = doc(db.chris, `pagamentos_mensais/${id}`);
      await assertFails(updateDoc(ref, { [flag]: false }));
      await assertFails(updateDoc(ref, { status: "pago" }));
      await assertFails(updateDoc(ref, { valor: 1100 }));
      await assertFails(updateDoc(ref, { cliente: "outro-cliente" }));
    }
  });
  await caso("aliases textuais excluído, arquivado e finalizado permanecem terminais e imutáveis", async () => {
    const aliases = [
      "excluido", "excluida", "arquivado", "arquivada", "finalizado", "finalizada"
    ];
    for (const status of aliases) {
      const id = `mensalidade-status-terminal-${status}`;
      await semearMensalidade(id, dadosMensalidade({ status }));
      const ref = doc(db.chris, `pagamentos_mensais/${id}`);
      await assertFails(updateDoc(ref, { status: "aberto" }));
      await assertFails(updateDoc(ref, { status: "pago" }));
      await assertFails(updateDoc(ref, { valorDevido: 1100 }));
      await assertFails(updateDoc(ref, { cliente: "outro-cliente" }));
    }
  });
  await caso("isento pode ser cancelado por saída com payload auditável", async () => {
    const id = "mensalidade-isenta-saida-valida";
    await semearMensalidade(id, dadosMensalidade({ status: "isento" }));
    await assertSucceeds(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), {
      status: "cancelado",
      canceladoPorSaida: true,
      canceladoPorSaidaId: "saida-sintetica-v103",
      statusAntesSaida: "isento",
      motivoCancelamento: "Saída sintética confirmada",
      canceladoEm: serverTimestamp(),
      canceladoPor: uids.chris,
      atualizadoEm: serverTimestamp(),
      atualizadoPor: uids.chris
    }));
  });
  await caso("cancelamento de isento por saída exige identificação da saída", async () => {
    const id = "mensalidade-isenta-saida-sem-id";
    await semearMensalidade(id, dadosMensalidade({ status: "isento" }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), {
      status: "cancelado",
      canceladoPorSaida: true,
      motivoCancelamento: "Sem identidade da saída",
      canceladoEm: serverTimestamp()
    }));
  });
  await caso("cancelamento de isento por saída não aceita valor ou campo estranho", async () => {
    const idValor = "mensalidade-isenta-saida-muda-valor";
    const idExtra = "mensalidade-isenta-saida-campo-extra";
    await semearMensalidade(idValor, dadosMensalidade({ status: "isento" }));
    await semearMensalidade(idExtra, dadosMensalidade({ status: "isento" }));
    const base = {
      status: "cancelado",
      canceladoPorSaida: true,
      canceladoPorSaidaId: "saida-sintetica-v103",
      motivoCancelamento: "Saída sintética confirmada",
      canceladoEm: serverTimestamp()
    };
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${idValor}`), { ...base, valor: 1 }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${idExtra}`), { ...base, campoInesperado: true }));
  });
  await caso("cliente próprio envia comprovante HTTPS somente na mensalidade aberta", async () => {
    const aberto = "mensalidade-cliente-aberta";
    const terminal = "mensalidade-cliente-paga";
    await semearMensalidade(aberto);
    await semearMensalidade(terminal, dadosMensalidade({ status: "pago", extra: { pagoEm: new Date("2026-09-10T12:00:00.000Z") } }));
    await assertSucceeds(updateDoc(doc(db.cliente, `pagamentos_mensais/${aberto}`), {
      comprovante: "https://fixture.invalid/comprovante-v103.pdf",
      comprovanteEnviadoEm: "2026-09-10T12:00:00.000Z"
    }));
    await assertFails(updateDoc(doc(db.cliente, `pagamentos_mensais/${terminal}`), {
      comprovante: "https://fixture.invalid/comprovante-terminal-v103.pdf",
      comprovanteEnviadoEm: "2026-09-10T12:00:00.000Z"
    }));
  });
  await caso("cliente não envia comprovante para mensalidade de outro cliente", async () => {
    const id = "mensalidade-outro-cliente";
    await semearMensalidade(id, dadosMensalidade({ cliente: "outro-cliente" }));
    await assertFails(updateDoc(doc(db.cliente, `pagamentos_mensais/${id}`), {
      comprovante: "https://fixture.invalid/comprovante-v103.pdf",
      comprovanteEnviadoEm: "2026-09-10T12:00:00.000Z"
    }));
  });

  await caso("Chris altera valor vigente do contrato com revisão, operação e ledger de ajuste no mesmo batch", async () => {
    const slug = "contrato-valor-v103";
    const op = operationId("contrato-valor");
    await semearContrato(slug);
    const batch = writeBatch(db.chris);
    batch.update(doc(db.chris, `contratos_cliente/${slug}`), {
      valorCheio: 1200,
      valorVigente: 1200,
      financeiroRevision: 2,
      financeiroOperationId: op
    });
    batch.set(doc(db.chris, caminhoLedger(op)), dadosLedger({
      op,
      clienteId: slug,
      tipo: "ajuste",
      competenciaInicio: "2026-10",
      valor: null,
      sourceType: "contrato",
      sourceId: slug,
      preHash: hash("c"),
      postHash: hash("d")
    }));
    await assertSucceeds(batch.commit());
  });
  await caso("campo financeiro do contrato sem ledger no mesmo commit é negado", async () => {
    const slug = "contrato-financeiro-sem-ledger-v103";
    const op = operationId("contrato-sem-ledger");
    await semearContrato(slug);
    await assertFails(updateDoc(doc(db.chris, `contratos_cliente/${slug}`), {
      valorCheio: 1200,
      valorVigente: 1200,
      financeiroRevision: 2,
      financeiroOperationId: op
    }));
  });
  await caso("campo financeiro do contrato não reutiliza ledger preexistente", async () => {
    const slug = "contrato-ledger-preexistente-v103";
    const op = operationId("ledger-preexistente");
    await semearContrato(slug);
    await semearAdmin(caminhoLedger(op), dadosLedger({
      op,
      clienteId: slug,
      tipo: "alteracao_valor",
      competenciaInicio: "2026-10",
      valor: 1200,
      sourceType: "contrato",
      sourceId: slug,
      preHash: hash("c"),
      postHash: hash("d")
    }));
    await assertFails(updateDoc(doc(db.chris, `contratos_cliente/${slug}`), {
      valorCheio: 1200,
      valorVigente: 1200,
      financeiroRevision: 2,
      financeiroOperationId: op
    }));
  });
  await caso("ledger de contrato órfão é negado", async () => {
    const slug = "contrato-ledger-orfao-v103";
    const op = operationId("contrato-orfao");
    await semearContrato(slug);
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({
      op,
      clienteId: slug,
      tipo: "alteracao_valor",
      competenciaInicio: "2026-10",
      valor: 1200,
      sourceType: "contrato",
      sourceId: slug,
      preHash: hash("c"),
      postHash: hash("d")
    })));
  });
  await caso("ledger de contrato não usa operationId pré-gravado como falso commit", async () => {
    const slug = "contrato-ledger-op-pregravado-v103";
    const op = operationId("contrato-pregravado");
    await semearContrato(slug, dadosContrato({ slug, operationId: op }));
    await assertFails(setDoc(doc(db.chris, caminhoLedger(op)), dadosLedger({
      op,
      clienteId: slug,
      tipo: "alteracao_valor",
      competenciaInicio: "2026-10",
      valor: 1200,
      sourceType: "contrato",
      sourceId: slug,
      preHash: hash("c"),
      postHash: hash("d")
    })));
  });
  await caso("ledger de contrato exige o mesmo operationId no principal", async () => {
    const slug = "contrato-ledger-divergente-v103";
    const op = operationId("contrato-evento");
    const opDivergente = operationId("contrato-principal");
    await semearContrato(slug);
    const batch = writeBatch(db.chris);
    batch.update(doc(db.chris, `contratos_cliente/${slug}`), {
      valorCheio: 1200,
      valorVigente: 1200,
      financeiroRevision: 2,
      financeiroOperationId: opDivergente
    });
    batch.set(doc(db.chris, caminhoLedger(op)), dadosLedger({
      op,
      clienteId: slug,
      tipo: "alteracao_valor",
      competenciaInicio: "2026-10",
      valor: 1200,
      sourceType: "contrato",
      sourceId: slug,
      preHash: hash("c"),
      postHash: hash("d")
    }));
    await assertFails(batch.commit());
  });
  await caso("alteração financeira de contrato exige revisão sequencial", async () => {
    const slug = "contrato-revision-stale-v103";
    await semearContrato(slug, dadosContrato({ slug, revision: 3 }));
    await assertFails(updateDoc(doc(db.chris, `contratos_cliente/${slug}`), {
      diaVencimento: 15,
      financeiroRevision: 3,
      financeiroOperationId: operationId("contrato-stale")
    }));
  });
  await caso("alteração financeira de contrato exige operationId válido", async () => {
    const slug = "contrato-sem-operation-v103";
    await semearContrato(slug, dadosContrato({ slug, operationId: "" }));
    await assertFails(updateDoc(doc(db.chris, `contratos_cliente/${slug}`), {
      diaVencimento: 15,
      financeiroRevision: 2
    }));
  });
  await caso("alteração financeira de contrato não reutiliza operationId anterior", async () => {
    const slug = "contrato-operation-repetida-v103";
    const opAnterior = operationId("contrato-anterior");
    await semearContrato(slug, dadosContrato({ slug, operationId: opAnterior }));
    await assertFails(updateDoc(doc(db.chris, `contratos_cliente/${slug}`), {
      diaVencimento: 15,
      financeiroRevision: 2,
      financeiroOperationId: opAnterior
    }));
  });
  await caso("Amanda não altera valor, vencimento nem programação financeira", async () => {
    const valor = "contrato-amanda-valor-v103";
    const dia = "contrato-amanda-dia-v103";
    const programa = "contrato-amanda-programa-v103";
    await semearContrato(valor);
    await semearContrato(dia);
    await semearContrato(programa);
    await assertFails(updateDoc(doc(db.amanda, `contratos_cliente/${valor}`), {
      valorVigente: 1200,
      financeiroRevision: 2,
      financeiroOperationId: operationId("amanda-valor")
    }));
    await assertFails(updateDoc(doc(db.amanda, `contratos_cliente/${dia}`), {
      diaVencimento: 15,
      financeiroRevision: 2,
      financeiroOperationId: operationId("amanda-dia")
    }));
    await assertFails(updateDoc(doc(db.amanda, `contratos_cliente/${programa}`), {
      valorProgramado: 1200,
      valorProgramadoEm: "2026-10",
      financeiroRevision: 2,
      financeiroOperationId: operationId("amanda-programa")
    }));
  });
  await caso("Chris não altera vencimento ou programação sem ledger novo", async () => {
    const dia = "contrato-chris-dia-v103";
    const programa = "contrato-chris-programa-v103";
    await semearContrato(dia);
    await semearContrato(programa);
    await assertFails(updateDoc(doc(db.chris, `contratos_cliente/${dia}`), {
      diaVencimento: 15,
      financeiroRevision: 2,
      financeiroOperationId: operationId("chris-dia")
    }));
    await assertFails(updateDoc(doc(db.chris, `contratos_cliente/${programa}`), {
      valorProgramado: 1200,
      valorProgramadoEm: "2026-10",
      valorProgramadoMotivo: "Reajuste sintético",
      financeiroRevision: 2,
      financeiroOperationId: operationId("chris-programa")
    }));
  });
  await caso("reajuste atômico atualiza mensalidade futura aberta e preserva identidade", async () => {
    const slug = "reajuste-aberto-v103";
    const pagamentoId = "reajuste-aberto-2026-10";
    const op = operationId("reajuste-aberto");
    await semearContrato(slug);
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto",
      extra: { observacaoCobranca: "Campo opcional preservado" }
    }));
    await assertSucceeds(batchReajusteContrato(db.chris, {
      slug,
      pagamentoId,
      op,
      valor: 1200,
      competenciaProgramada: "2026-10"
    }).commit());
    const depois = (await lerAdmin(`pagamentos_mensais/${pagamentoId}`)).data();
    assert.equal(depois.status, "aberto");
    assert.equal(depois.cliente, slug);
    assert.equal(depois.clienteSlug, slug);
    assert.equal(depois.canonicalId, slug);
    assert.equal(depois.competencia, "2026-10");
    assert.equal(depois.valorDevido, 1200);
    assert.equal(depois.valor, 1200);
    assert.equal(depois.valorCobrado, 1200);
    assert.equal(depois.financeiroOperationId, op);
    assert.equal(depois.observacaoCobranca, "Campo opcional preservado");
  });
  await caso("reajuste atômico atualiza mensalidade futura isenta sem criar opcionais ausentes", async () => {
    const slug = "reajuste-isento-v103";
    const pagamentoId = "reajuste-isento-2026-11";
    const op = operationId("reajuste-isento");
    const mensalidade = dadosMensalidade({
      cliente: slug,
      competencia: "2026-11",
      status: "isento",
      extra: { motivoIsencao: "Fixture preservada" }
    });
    delete mensalidade.valor;
    delete mensalidade.valorCobrado;
    await semearContrato(slug);
    await semearMensalidade(pagamentoId, mensalidade);
    await assertSucceeds(batchReajusteContrato(db.chris, {
      slug,
      pagamentoId,
      op,
      valor: 1300,
      competenciaProgramada: "2026-10",
      camposValorPagamento: {}
    }).commit());
    const depois = (await lerAdmin(`pagamentos_mensais/${pagamentoId}`)).data();
    assert.equal(depois.status, "isento");
    assert.equal(depois.cliente, slug);
    assert.equal(depois.competencia, "2026-11");
    assert.equal(depois.valorDevido, 1300);
    assert.equal("valor" in depois, false);
    assert.equal("valorCobrado" in depois, false);
    assert.equal(depois.motivoIsencao, "Fixture preservada");
    assert.equal(depois.financeiroOperationId, op);
  });
  await caso("reconciliação auditada converge mensalidade futura stale ao valor já programado", async () => {
    const slug = "reconciliacao-stale-v103";
    const pagamentoId = "reconciliacao-stale-2026-10";
    const opAnterior = operationId("reconciliacao-anterior");
    const op = operationId("reconciliacao-stale");
    await semearContrato(slug, dadosContrato({
      slug,
      valor: 1200,
      operationId: opAnterior,
      extra: {
        valorProgramado: 1200,
        valorProgramadoEm: "2026-10"
      }
    }));
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto",
      valor: 1300,
      extra: { observacaoCobranca: "Preservar na reconciliação" }
    }));
    await assertSucceeds(batchReconciliacaoMensalidadeStale(db.chris, {
      slug,
      pagamentoId,
      op
    }).commit());

    const contratoDepois = (await lerAdmin(`contratos_cliente/${slug}`)).data();
    const mensalidadeDepois = (await lerAdmin(`pagamentos_mensais/${pagamentoId}`)).data();
    const ledgerDepois = (await lerAdmin(caminhoLedger(op))).data();
    assert.equal(contratoDepois.valorProgramado, 1200);
    assert.equal(contratoDepois.valorProgramadoEm, "2026-10");
    assert.equal(contratoDepois.financeiroRevision, 2);
    assert.equal(contratoDepois.financeiroOperationId, op);
    assert.equal(mensalidadeDepois.status, "aberto");
    assert.equal(mensalidadeDepois.cliente, slug);
    assert.equal(mensalidadeDepois.competencia, "2026-10");
    assert.equal(mensalidadeDepois.valorDevido, 1200);
    assert.equal(mensalidadeDepois.valor, 1200);
    assert.equal(mensalidadeDepois.valorCobrado, 1200);
    assert.equal(mensalidadeDepois.observacaoCobranca, "Preservar na reconciliação");
    assert.equal(mensalidadeDepois.financeiroOperationId, op);
    assert.equal(ledgerDepois.tipo, "ajuste");
    assert.equal(ledgerDepois.valor, null);
  });
  await caso("reconciliação de mensalidade stale sem ledger atômico é negada", async () => {
    const slug = "reconciliacao-stale-sem-ledger-v103";
    const pagamentoId = "reconciliacao-stale-sem-ledger-2026-10";
    const op = operationId("reconciliacao-sem-ledger");
    await semearContrato(slug, dadosContrato({
      slug,
      valor: 1200,
      extra: {
        valorProgramado: 1200,
        valorProgramadoEm: "2026-10"
      }
    }));
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto",
      valor: 1300
    }));
    await assertFails(batchReconciliacaoMensalidadeStale(db.chris, {
      slug,
      pagamentoId,
      op,
      incluirLedger: false
    }).commit());
    assert.equal((await lerAdmin(`contratos_cliente/${slug}`)).data().financeiroRevision, 1);
    assert.equal((await lerAdmin(`pagamentos_mensais/${pagamentoId}`)).data().valorDevido, 1300);
    assert.equal((await lerAdmin(caminhoLedger(op))).exists(), false);
  });
  await caso("reconciliação de mensalidade stale não reutiliza operationId anterior", async () => {
    const slug = "reconciliacao-stale-op-antigo-v103";
    const pagamentoId = "reconciliacao-stale-op-antigo-2026-10";
    const opAnterior = operationId("reconciliacao-op-antigo");
    await semearContrato(slug, dadosContrato({
      slug,
      valor: 1200,
      operationId: opAnterior,
      extra: {
        valorProgramado: 1200,
        valorProgramadoEm: "2026-10"
      }
    }));
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto",
      valor: 1300
    }));
    await assertFails(batchReconciliacaoMensalidadeStale(db.chris, {
      slug,
      pagamentoId,
      op: opAnterior
    }).commit());
    assert.equal((await lerAdmin(`contratos_cliente/${slug}`)).data().financeiroRevision, 1);
    assert.equal((await lerAdmin(`pagamentos_mensais/${pagamentoId}`)).data().valorDevido, 1300);
    assert.equal((await lerAdmin(caminhoLedger(opAnterior))).exists(), false);
  });
  await caso("reajuste programado não altera mensalidade paga ou cancelada", async () => {
    for (const status of ["pago", "cancelado"]) {
      const slug = `reajuste-terminal-${status}-v103`;
      const pagamentoId = `reajuste-terminal-${status}-2026-10`;
      const op = operationId(`reajuste-${status}`);
      const extra = status === "pago" ? { pagoEm: new Date("2026-10-10T12:00:00.000Z") } : {};
      await semearContrato(slug);
      await semearMensalidade(pagamentoId, dadosMensalidade({
        cliente: slug,
        competencia: "2026-10",
        status,
        extra
      }));
      await assertFails(batchReajusteContrato(db.chris, {
        slug,
        pagamentoId,
        op,
        valor: 1200,
        competenciaProgramada: "2026-10"
      }).commit());
      assert.equal((await lerAdmin(`contratos_cliente/${slug}`)).data().financeiroRevision, 1);
      assert.equal((await lerAdmin(caminhoLedger(op))).exists(), false);
    }
  });
  await caso("reajuste programado não retroage para competência anterior", async () => {
    const slug = "reajuste-retroativo-v103";
    const pagamentoId = "reajuste-retroativo-2026-09";
    const op = operationId("reajuste-retroativo");
    await semearContrato(slug);
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-09",
      status: "aberto"
    }));
    await assertFails(batchReajusteContrato(db.chris, {
      slug,
      pagamentoId,
      op,
      valor: 1200,
      competenciaProgramada: "2026-10"
    }).commit());
  });
  await caso("reajuste programado exige o mesmo operationId no contrato, ledger e mensalidade", async () => {
    const slug = "reajuste-op-divergente-v103";
    const pagamentoId = "reajuste-op-divergente-2026-10";
    const op = operationId("reajuste-principal");
    const opPagamento = operationId("reajuste-mensalidade");
    await semearContrato(slug);
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto"
    }));
    await assertFails(batchReajusteContrato(db.chris, {
      slug,
      pagamentoId,
      op,
      opPagamento,
      valor: 1200,
      competenciaProgramada: "2026-10"
    }).commit());
  });
  await caso("reajuste programado nega campos de valor divergentes na mensalidade", async () => {
    const slug = "reajuste-valores-internos-v103";
    const pagamentoId = "reajuste-valores-internos-2026-10";
    const op = operationId("reajuste-valores-internos");
    await semearContrato(slug);
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto"
    }));
    await assertFails(batchReajusteContrato(db.chris, {
      slug,
      pagamentoId,
      op,
      valor: 1200,
      competenciaProgramada: "2026-10",
      camposValorPagamento: { valor: 1300, valorCobrado: 1200 }
    }).commit());
  });
  await caso("reajuste programado nega valor da mensalidade divergente do contrato", async () => {
    const slug = "reajuste-valor-contrato-v103";
    const pagamentoId = "reajuste-valor-contrato-2026-10";
    const op = operationId("reajuste-valor-contrato");
    await semearContrato(slug);
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto"
    }));
    await assertFails(batchReajusteContrato(db.chris, {
      slug,
      pagamentoId,
      op,
      valor: 1200,
      valorPagamento: 1300,
      camposValorPagamento: { valor: 1300, valorCobrado: 1300 },
      competenciaProgramada: "2026-10"
    }).commit());
  });
  await caso("reajuste programado nega ledger com valor divergente do contrato", async () => {
    const slug = "reajuste-valor-ledger-v103";
    const pagamentoId = "reajuste-valor-ledger-2026-10";
    const op = operationId("reajuste-valor-ledger");
    await semearContrato(slug);
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto"
    }));
    await assertFails(batchReajusteContrato(db.chris, {
      slug,
      pagamentoId,
      op,
      valor: 1200,
      valorLedger: 1300,
      competenciaProgramada: "2026-10"
    }).commit());
  });
  await caso("reajuste programado exige revisão sequencial do contrato", async () => {
    const slug = "reajuste-revision-invalida-v103";
    const pagamentoId = "reajuste-revision-invalida-2026-10";
    const op = operationId("reajuste-revision");
    await semearContrato(slug);
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto"
    }));
    await assertFails(batchReajusteContrato(db.chris, {
      slug,
      pagamentoId,
      op,
      valor: 1200,
      competenciaProgramada: "2026-10",
      revisaoContrato: 1
    }).commit());
  });
  await caso("reajuste programado exige evento novo no mesmo commit", async () => {
    const slug = "reajuste-sem-evento-v103";
    const pagamentoId = "reajuste-sem-evento-2026-10";
    const op = operationId("reajuste-sem-evento");
    await semearContrato(slug);
    await semearMensalidade(pagamentoId, dadosMensalidade({
      cliente: slug,
      competencia: "2026-10",
      status: "aberto"
    }));
    await assertFails(batchReajusteContrato(db.chris, {
      slug,
      pagamentoId,
      op,
      valor: 1200,
      competenciaProgramada: "2026-10",
      incluirLedger: false
    }).commit());
  });
  await caso("campo não financeiro do contrato continua compatível com Amanda", async () => {
    const slug = "contrato-amanda-operacional-v103";
    await semearContrato(slug);
    await assertSucceeds(updateDoc(doc(db.amanda, `contratos_cliente/${slug}`), {
      observacao: "Observação operacional revisada pela gerência"
    }));
  });

  const docPrincipal = "lancamento-principal-v103";
  let opCriacaoPrincipal;
  await caso("Chris cria lançamento e ledger no mesmo batch", async () => {
    const lancamento = dadosLancamento({ tipo: "salario", descricao: "Remuneração sintética" });
    opCriacaoPrincipal = lancamento.operationId;
    await assertSucceeds(batchLancamento(db.chris, docPrincipal, lancamento).commit());
    assert.equal((await lerAdmin(caminhoLancamento(docPrincipal))).data().revision, 1);
    assert.equal((await lerAdmin(caminhoLedger(lancamento.operationId))).exists(), true);
  });
  await caso("lançamento sem ledger atômico é negado", async () => {
    const lancamento = dadosLancamento();
    await assertFails(setDoc(doc(db.chris, caminhoLancamento("sem-ledger")), lancamento));
  });
  await caso("ledger financeiro sem principal atômico é negado", async () => {
    const lancamento = dadosLancamento();
    const evento = ledgerDoLancamento("sem-principal", lancamento);
    await assertFails(setDoc(doc(db.chris, caminhoLedger(lancamento.operationId)), evento));
  });
  await caso("Amanda não cria lançamento mesmo com ledger", async () => {
    const lancamento = dadosLancamento({ autorUid: uids.amanda });
    await assertFails(batchLancamento(db.amanda, "lancamento-amanda", lancamento).commit());
  });
  await caso("papel indevido não cria lançamento", async () => {
    const lancamento = dadosLancamento({ autorUid: uids.outro });
    await assertFails(batchLancamento(db.outro, "lancamento-outro", lancamento).commit());
  });
  await caso("evento com valor divergente torna batch atômico inválido", async () => {
    const lancamento = dadosLancamento();
    await assertFails(batchLancamento(db.chris, "valor-divergente", lancamento, "lancamento", null, {
      extraLedger: { valor: lancamento.valor + 1 }
    }).commit());
    assert.equal((await lerAdmin(caminhoLancamento("valor-divergente"))).exists(), false);
  });
  await caso("evento com sourceId divergente torna batch inválido", async () => {
    const lancamento = dadosLancamento();
    await assertFails(batchLancamento(db.chris, "source-divergente", lancamento, "lancamento", null, {
      extraLedger: { sourceId: "outro-documento" }
    }).commit());
  });
  await caso("tipo de lançamento inválido é negado", async () => {
    const lancamento = dadosLancamento({ tipo: "categoria_livre" });
    await assertFails(batchLancamento(db.chris, "tipo-invalido", lancamento).commit());
  });
  await caso("competência de lançamento inválida é negada", async () => {
    const lancamento = dadosLancamento({ competencia: "09/2026" });
    await assertFails(batchLancamento(db.chris, "competencia-invalida", lancamento).commit());
  });
  await caso("valor zero em lançamento é negado", async () => {
    const lancamento = dadosLancamento({ valor: 0 });
    await assertFails(batchLancamento(db.chris, "valor-zero", lancamento).commit());
  });
  await caso("beneficiário não canônico é negado", async () => {
    const lancamento = dadosLancamento({ beneficiarioRef: "nome com espaço" });
    await assertFails(batchLancamento(db.chris, "beneficiario-invalido", lancamento).commit());
  });
  await caso("campo extra em lançamento é negado", async () => {
    const lancamento = dadosLancamento({ extra: { segredo: true } });
    await assertFails(batchLancamento(db.chris, "campo-extra", lancamento).commit());
  });
  await caso("pago exige dataCaixa timestamp", async () => {
    const lancamento = dadosLancamento({ status: "pago", dataCaixa: "2026-09-10" });
    await assertFails(batchLancamento(db.chris, "pago-sem-data", lancamento).commit());
  });
  await caso("previsto não aceita dataCaixa antecipada", async () => {
    const lancamento = dadosLancamento({ status: "previsto", dataCaixa: serverTimestamp() });
    await assertFails(batchLancamento(db.chris, "previsto-com-data", lancamento).commit());
  });
  await caso("delete físico de lançamento é negado", async () => {
    await assertFails(deleteDoc(doc(db.chris, caminhoLancamento(docPrincipal))));
  });

  let opBaixaPrincipal;
  await caso("baixa previsto para pago exige ledger e incrementa revision", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const op = operationId("baixa");
    const depois = {
      ...antes,
      status: "pago",
      dataCaixa: serverTimestamp(),
      observacao: "Baixa sintética confirmada",
      autorUid: uids.chris,
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 1,
      operationId: op
    };
    await assertSucceeds(batchLancamento(db.chris, docPrincipal, depois, "baixa").commit());
    opBaixaPrincipal = op;
    assert.equal((await lerAdmin(caminhoLancamento(docPrincipal))).data().status, "pago");
  });
  await caso("retry da mesma baixa não duplica nem altera revision", async () => {
    const atual = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const repetido = { ...atual, atualizadoEm: serverTimestamp() };
    await assertFails(batchLancamento(db.chris, docPrincipal, repetido, "baixa").commit());
    assert.equal((await lerAdmin(caminhoLancamento(docPrincipal))).data().revision, 2);
    assert.equal((await listarAdmin("clientes_ciclo_financeiro")).docs.filter((snap) => snap.id === opBaixaPrincipal).length, 1);
  });
  await caso("update de lançamento sem ledger é negado", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    await assertFails(updateDoc(doc(db.chris, caminhoLancamento(docPrincipal)), {
      observacao: "Ajuste sem evento",
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 1,
      operationId: operationId("sem-ledger-update")
    }));
  });
  await caso("alterar valor histórico é negado", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const depois = {
      ...antes,
      valor: antes.valor + 1,
      observacao: "Tentativa sintética",
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 1,
      operationId: operationId("valor-imutavel")
    };
    await assertFails(batchLancamento(db.chris, docPrincipal, depois, "ajuste").commit());
  });
  await caso("alterar competência histórica é negado", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const depois = {
      ...antes,
      competencia: "2026-10",
      observacao: "Tentativa sintética",
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 1,
      operationId: operationId("competencia-imutavel")
    };
    await assertFails(batchLancamento(db.chris, docPrincipal, depois, "ajuste").commit());
  });
  await caso("alterar tipo histórico é negado", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const depois = {
      ...antes,
      tipo: "imposto",
      observacao: "Tentativa sintética",
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 1,
      operationId: operationId("tipo-imutavel")
    };
    await assertFails(batchLancamento(db.chris, docPrincipal, depois, "ajuste").commit());
  });
  await caso("alterar beneficiário histórico é negado", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const depois = {
      ...antes,
      beneficiarioRef: "outro-beneficiario",
      observacao: "Tentativa sintética",
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 1,
      operationId: operationId("beneficiario-imutavel")
    };
    await assertFails(batchLancamento(db.chris, docPrincipal, depois, "ajuste").commit());
  });
  await caso("revision pulada é negada", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const depois = {
      ...antes,
      observacao: "Revision inválida",
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 2,
      operationId: operationId("revision")
    };
    await assertFails(batchLancamento(db.chris, docPrincipal, depois, "ajuste").commit());
  });
  await caso("ajuste de observação auditado é permitido", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const depois = {
      ...antes,
      observacao: "Observação sintética revisada",
      autorUid: uids.chris,
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 1,
      operationId: operationId("ajuste")
    };
    await assertSucceeds(batchLancamento(db.chris, docPrincipal, depois, "ajuste").commit());
  });
  await caso("reversão pago para cancelado preserva dataCaixa e histórico", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const depois = {
      ...antes,
      status: "cancelado",
      dataCaixa: antes.dataCaixa,
      observacao: "Reversão sintética justificada",
      autorUid: uids.chris,
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 1,
      operationId: operationId("reversao")
    };
    await assertSucceeds(batchLancamento(db.chris, docPrincipal, depois, "reversao", antes.operationId).commit());
    const atual = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    assert.equal(atual.status, "cancelado");
    assert.deepEqual(atual.dataCaixa, antes.dataCaixa);
  });
  await caso("reversão com referência errada é negada", async () => {
    const docId = "reversao-ref-errada";
    const criado = dadosLancamento({ status: "pago", dataCaixa: serverTimestamp() });
    await assertSucceeds(batchLancamento(db.chris, docId, criado).commit());
    const antes = (await lerAdmin(caminhoLancamento(docId))).data();
    const depois = {
      ...antes,
      status: "cancelado",
      observacao: "Reversão sintética justificada",
      atualizadoEm: serverTimestamp(),
      revision: 2,
      operationId: operationId("reversao-ref")
    };
    await assertFails(batchLancamento(db.chris, docId, depois, "reversao", opCriacaoPrincipal).commit());
  });
  await caso("cancelado é terminal e não reabre", async () => {
    const antes = (await lerAdmin(caminhoLancamento(docPrincipal))).data();
    const depois = {
      ...antes,
      status: "previsto",
      dataCaixa: null,
      observacao: "Tentativa de reabertura",
      atualizadoEm: serverTimestamp(),
      revision: antes.revision + 1,
      operationId: operationId("reabrir")
    };
    await assertFails(batchLancamento(db.chris, docPrincipal, depois, "ajuste").commit());
  });
  await caso("cancelamento previsto é soft-close auditável", async () => {
    const docId = "cancelamento-previsto";
    const criado = dadosLancamento({ tipo: "imposto", descricao: "Imposto sintético" });
    await assertSucceeds(batchLancamento(db.chris, docId, criado).commit());
    const antes = (await lerAdmin(caminhoLancamento(docId))).data();
    const depois = {
      ...antes,
      status: "cancelado",
      dataCaixa: null,
      observacao: "Cancelamento sintético justificado",
      atualizadoEm: serverTimestamp(),
      revision: 2,
      operationId: operationId("cancelamento")
    };
    await assertSucceeds(batchLancamento(db.chris, docId, depois, "cancelamento").commit());
    assert.equal((await lerAdmin(caminhoLancamento(docId))).data().status, "cancelado");
  });
  await caso("configuração da Régua é privada e administrada somente pelo Chris", async () => {
    const caminho = "config_financeiro/regua_cobranca";
    await assertSucceeds(setDoc(doc(db.chris, caminho), {
      schemaVersion: 1,
      inicioOperacao: "2026-07",
      competenciasQuitadasAte: "2026-08",
      criterioHistorico: "fixture_sintetica",
      atualizadoPorUid: uids.chris,
      atualizadoEm: serverTimestamp()
    }));
    await assertSucceeds(getDoc(doc(db.chris, caminho)));
    await assertFails(getDoc(doc(db.amanda, caminho)));
    await assertFails(getDoc(doc(db.outro, caminho)));
    await assertFails(getDoc(doc(db.cliente, caminho)));
    await assertFails(deleteDoc(doc(db.chris, caminho)));
  });
  await caso("Fedalto cancelada por saída volta somente para cortesia com ledger atômico", async () => {
    const id = "fedalto-eletro-comercial_2026-09";
    const cliente = "fedalto-eletro-comercial";
    const op = operationId("fedalto-cortesia");
    await semearMensalidade(id, dadosMensalidade({
      cliente,
      status: "cancelado",
      valor: 1700,
      extra: {
        canceladoPorSaida: true,
        canceladoPorSaidaId: "saida-fedalto-sintetica",
        statusAntesSaida: "aberto",
        motivoCancelamento: "Saída sintética anterior",
        canceladoEm: new Date("2026-09-01T12:00:00.000Z"),
        canceladoPor: uids.chris
      }
    }));
    const batch = writeBatch(db.chris);
    batch.update(doc(db.chris, `pagamentos_mensais/${id}`), {
      status: "isento",
      canceladoPorSaida: deleteField(),
      canceladoPorSaidaId: deleteField(),
      statusAntesSaida: deleteField(),
      motivoCancelamento: deleteField(),
      canceladoEm: deleteField(),
      canceladoPor: deleteField(),
      cortesiaDoMes: true,
      motivoIsencao: "Cortesia promocional sintética de setembro",
      financeiroOperationId: op,
      atualizadoEm: serverTimestamp(),
      atualizadoPor: uids.chris
    });
    batch.set(doc(db.chris, caminhoLedger(op)), dadosLedger({
      op,
      clienteId: cliente,
      tipo: "reativacao",
      competenciaInicio: "2026-09",
      valor: null,
      sourceType: "migracao",
      sourceId: cliente
    }));
    await assertSucceeds(batch.commit());
    const depois = (await lerAdmin(`pagamentos_mensais/${id}`)).data();
    assert.equal(depois.status, "isento");
    assert.equal(depois.cortesiaDoMes, true);
    assert.equal(depois.canceladoPorSaida, undefined);
  });
  await caso("reativação de mensalidade cancelada sem ledger é negada", async () => {
    const id = "fedalto-sem-ledger_2026-09";
    const cliente = "fedalto-sem-ledger";
    const op = operationId("fedalto-sem-ledger");
    await semearMensalidade(id, dadosMensalidade({
      cliente,
      status: "cancelado",
      valor: 1700,
      extra: {
        canceladoPorSaida: true,
        canceladoPorSaidaId: "saida-fedalto-sintetica",
        statusAntesSaida: "aberto",
        motivoCancelamento: "Saída sintética anterior",
        canceladoEm: new Date("2026-09-01T12:00:00.000Z"),
        canceladoPor: uids.chris
      }
    }));
    await assertFails(updateDoc(doc(db.chris, `pagamentos_mensais/${id}`), {
      status: "isento",
      canceladoPorSaida: deleteField(),
      canceladoPorSaidaId: deleteField(),
      statusAntesSaida: deleteField(),
      motivoCancelamento: deleteField(),
      canceladoEm: deleteField(),
      canceladoPor: deleteField(),
      cortesiaDoMes: true,
      motivoIsencao: "Cortesia promocional sintética de setembro",
      financeiroOperationId: op,
      atualizadoEm: serverTimestamp(),
      atualizadoPor: uids.chris
    }));
  });
} finally {
  await env.cleanup();
}

console.log(`V103_FINANCEIRO_RULES passed=${aprovados} failed=${reprovados} rules_sha256=${rulesHash}`);
if (falhas.length > 0) {
  for (const falha of falhas) console.error(`FALHA ${falha.nome}: ${falha.erro?.message || falha.erro}`);
  process.exitCode = 1;
}
