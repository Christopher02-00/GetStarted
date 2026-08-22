import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "firebase/firestore";

const aqui = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(aqui, "..", "..", "firestore.rules");
const projectId = "demo-get-conclusao-v101";
const rules = await readFile(rulesPath, "utf8");
const rulesHash = createHash("sha256").update(rules).digest("hex");
const [host, rawPort] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:9299").split(":");
const port = Number(rawPort);

function emailDaFuncao(nome) {
  const inicio = rules.indexOf(`function ${nome}()`);
  assert.notEqual(inicio, -1, `função ${nome} ausente nas regras`);
  const trecho = rules.slice(inicio, inicio + 700);
  const encontrado = trecho.match(/request\.auth\.token\.email\s*==\s*'([^']+)'/);
  assert.ok(encontrado, `e-mail semeado de ${nome} não encontrado`);
  return encontrado[1];
}

const emails = Object.freeze({
  cecilia: emailDaFuncao("ehCecilia"),
  chris: emailDaFuncao("ehChris"),
  outro: emailDaFuncao("ehAmanda")
});

const env = await initializeTestEnvironment({
  projectId,
  firestore: { host, port, rules }
});

const contextos = {
  cecilia: env.authenticatedContext("uid-sintetico-cecilia-v101", {
    email: emails.cecilia,
    email_verified: true
  }),
  chris: env.authenticatedContext("uid-sintetico-chris-v101", {
    email: emails.chris,
    email_verified: true
  }),
  outro: env.authenticatedContext("uid-sintetico-outro-v101", {
    email: emails.outro,
    email_verified: true
  }),
  anonimo: env.unauthenticatedContext()
};

const db = Object.fromEntries(Object.entries(contextos).map(([papel, contexto]) => [papel, contexto.firestore()]));
const calendarId = "calendario-sintetico-v101";
const calendarIdMigracao = "calendario-sintetico-v102";
const competencia = "2026-08";
const assinaturaA = "a".repeat(64);
const assinaturaB = "b".repeat(64);

function caminhoConferencia(itemId) {
  return `calendarios_conferencias/${calendarId}/competencias/${competencia}/itens/${itemId}`;
}
function caminhoEventoConferencia(itemId, operationId) {
  return `${caminhoConferencia(itemId)}/eventos/${operationId}`;
}
function caminhoEncerramento(itemId) {
  return `calendarios_encerramentos/${calendarId}/competencias/${competencia}/itens/${itemId}`;
}
function caminhoEventoEncerramento(itemId, operationId) {
  return `${caminhoEncerramento(itemId)}/eventos/${operationId}`;
}
function ator(papel) {
  if (papel === "cecilia") {
    return {
      autorUid: "uid-sintetico-cecilia-v101",
      atorRealPapel: "Cecília",
      papelOperado: "Cecília"
    };
  }
  if (papel === "chris_delegado") {
    return {
      autorUid: "uid-sintetico-chris-v101",
      atorRealPapel: "Chris",
      papelOperado: "Cecília"
    };
  }
  return {
    autorUid: "uid-sintetico-chris-v101",
    atorRealPapel: "Chris",
    papelOperado: "Chris"
  };
}
function operacao(prefixo, numero) {
  return `${prefixo}-${String(numero).padStart(6, "0")}-v101`;
}
function dadosConferencia({
  itemId,
  papel = "cecilia",
  conferido = true,
  observacao = "",
  fonteAssinatura = assinaturaA,
  revision = 1,
  operationId,
  conferidoEm = serverTimestamp(),
  atualizadoEm = serverTimestamp(),
  extra = {}
}) {
  return {
    schemaVersion: 1,
    calendarId,
    competencia,
    itemId,
    conferido,
    observacao,
    fonteAssinatura,
    revision,
    operationId,
    ...ator(papel),
    conferidoEm,
    atualizadoEm,
    ...extra
  };
}
function eventoConferencia({ principal, tipo, ocorridoEm = serverTimestamp(), extra = {} }) {
  const {
    schemaVersion,
    calendarId: idCalendario,
    competencia: mes,
    itemId,
    conferido,
    observacao,
    fonteAssinatura,
    revision,
    operationId,
    autorUid,
    atorRealPapel,
    papelOperado
  } = principal;
  return {
    schemaVersion,
    calendarId: idCalendario,
    competencia: mes,
    itemId,
    conferido,
    observacao,
    fonteAssinatura,
    revision,
    operationId,
    autorUid,
    atorRealPapel,
    papelOperado,
    tipo,
    ocorridoEm,
    ...extra
  };
}
function dadosEncerramento({
  itemId,
  encerrado = true,
  motivo = "Motivo sintético auditável.",
  fonteAssinatura = assinaturaA,
  revision = 1,
  operationId,
  encerradoEm = serverTimestamp(),
  atualizadoEm = serverTimestamp(),
  papel = "chris",
  extra = {}
}) {
  return {
    schemaVersion: 1,
    calendarId,
    competencia,
    itemId,
    encerrado,
    motivo,
    fonteAssinatura,
    revision,
    operationId,
    ...ator(papel),
    encerradoEm,
    atualizadoEm,
    ...extra
  };
}
function eventoEncerramento({ principal, tipo, ocorridoEm = serverTimestamp(), extra = {} }) {
  const {
    schemaVersion,
    calendarId: idCalendario,
    competencia: mes,
    itemId,
    encerrado,
    motivo,
    fonteAssinatura,
    revision,
    operationId,
    autorUid,
    atorRealPapel,
    papelOperado
  } = principal;
  return {
    schemaVersion,
    calendarId: idCalendario,
    competencia: mes,
    itemId,
    encerrado,
    motivo,
    fonteAssinatura,
    revision,
    operationId,
    autorUid,
    atorRealPapel,
    papelOperado,
    tipo,
    ocorridoEm,
    ...extra
  };
}
function batchConferencia(database, principal, tipo) {
  const batch = writeBatch(database);
  batch.set(doc(database, caminhoConferencia(principal.itemId)), principal);
  batch.set(
    doc(database, caminhoEventoConferencia(principal.itemId, principal.operationId)),
    eventoConferencia({ principal, tipo })
  );
  return batch;
}
function batchEncerramento(database, principal, tipo) {
  const batch = writeBatch(database);
  batch.set(doc(database, caminhoEncerramento(principal.itemId)), principal);
  batch.set(
    doc(database, caminhoEventoEncerramento(principal.itemId, principal.operationId)),
    eventoEncerramento({ principal, tipo })
  );
  return batch;
}
function operacaoMigracao(sufixo) {
  return `mig_${String(sufixo).replace(/[^A-Za-z0-9_-]/g, "_").padEnd(20, "0")}`;
}
function caminhoReciboMigracao(calendarIdAlvo, operationId) {
  return `calendarios_itemid_migracoes/${calendarIdAlvo}/operacoes/${operationId}`;
}
function dadosReciboMigracao(calendarIdAlvo, operationId, extra = {}) {
  return {
    schemaVersion: 1,
    calendarId: calendarIdAlvo,
    operationId,
    status: "aplicada",
    quantidade: 2,
    totalItens: 3,
    hashAntes: "c".repeat(64),
    hashDepois: "d".repeat(64),
    backupId: `${calendarIdAlvo}__v102_itemids__${operationId}`,
    autorUid: "uid-sintetico-chris-v101",
    atorRealPapel: "Chris",
    papelOperado: "Chris",
    criadoEm: serverTimestamp(),
    ...extra
  };
}
function batchMigracao(database, calendarIdAlvo, operationId, extraRecibo = {}, opcoes = {}) {
  const recibo = dadosReciboMigracao(calendarIdAlvo, operationId, extraRecibo);
  const batch = writeBatch(database);
  if (!opcoes.semCalendario) batch.set(doc(database, "calendarios", calendarIdAlvo), {
    items: [{ itemId: "legacy_" + "a".repeat(64), name: "Fixture sintética V102" }],
    updatedAt: "2026-08-21T20:00:00.000Z",
    itemIdMigracaoVersao: 1,
    itemIdMigradoEm: serverTimestamp(),
    itemIdMigradoPor: "Chris",
    itemIdMigracaoUltimaOperacao: operationId
  }, { merge: true });
  if (!opcoes.semBackup) batch.set(doc(database, "calendarios_versoes", recibo.backupId), {
    items: [{ name: "Fixture sintética V102" }],
    __cliente: calendarIdAlvo,
    __tipo: "antes_itemids_v102",
    __operationId: operationId,
    __salvoEm: serverTimestamp(),
    __itens: 1
  });
  if (!opcoes.semRecibo) batch.set(doc(database, caminhoReciboMigracao(calendarIdAlvo, operationId)), recibo);
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
    await setDoc(doc(admin, "calendarios", calendarId), {
      cliente: "Cliente sintético V101",
      items: [
        { itemId: "item-sintetico-v101", mes: competencia, nome: "Conteúdo sintético" }
      ]
    });
    for (const sufixo of ["ok","cecilia","outro","semrecibo","sembackup","campo","timestamp","delete"]) {
      await setDoc(doc(admin, "calendarios", `${calendarIdMigracao}-${sufixo}`), {
        cliente: "Cliente sintético V102",
        items: [{ nome: "Conteúdo legado sintético" }]
      });
    }
    await setDoc(doc(admin, caminhoConferencia("item-leitura-v101")), {
      fixture: true,
      calendarId,
      competencia,
      itemId: "item-leitura-v101"
    });
    await setDoc(doc(admin, caminhoEncerramento("item-leitura-v101")), {
      fixture: true,
      calendarId,
      competencia,
      itemId: "item-leitura-v101"
    });
    await setDoc(doc(admin, "fora", "fixture", "itens", "intruso-v101"), {
      fixture: true
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

  await caso("Cecília lê conferência por caminho exato", async () => {
    const snap = await assertSucceeds(getDoc(doc(db.cecilia, caminhoConferencia("item-leitura-v101"))));
    assert.equal(snap.exists(), true);
  });
  await caso("Chris lê conferência e encerramento por caminho exato", async () => {
    const [conferencia, encerramento] = await Promise.all([
      assertSucceeds(getDoc(doc(db.chris, caminhoConferencia("item-leitura-v101")))),
      assertSucceeds(getDoc(doc(db.chris, caminhoEncerramento("item-leitura-v101"))))
    ]);
    assert.equal(conferencia.exists() && encerramento.exists(), true);
  });
  await caso("anônimo não lê projeção", async () => {
    await assertFails(getDoc(doc(db.anonimo, caminhoConferencia("item-leitura-v101"))));
  });
  await caso("papel indevido não lê projeção", async () => {
    await assertFails(getDoc(doc(db.outro, caminhoConferencia("item-leitura-v101"))));
  });
  await caso("Cecília lista somente a subcoleção exata", async () => {
    const snap = await assertSucceeds(getDocs(collection(db.cecilia, `calendarios_conferencias/${calendarId}/competencias/${competencia}/itens`)));
    assert.ok(snap.size >= 1);
  });
  await caso("Chris lista somente a subcoleção exata", async () => {
    const snap = await assertSucceeds(getDocs(collection(db.chris, `calendarios_encerramentos/${calendarId}/competencias/${competencia}/itens`)));
    assert.ok(snap.size >= 1);
  });
  await caso("papel indevido não lista a subcoleção exata", async () => {
    await assertFails(getDocs(collection(db.outro, `calendarios_conferencias/${calendarId}/competencias/${competencia}/itens`)));
  });
  await caso("collectionGroup itens é negada para Cecília", async () => {
    await assertFails(getDocs(collectionGroup(db.cecilia, "itens")));
  });
  await caso("collectionGroup itens é negada para Chris", async () => {
    await assertFails(getDocs(collectionGroup(db.chris, "itens")));
  });

  await caso("Cecília cria conferência e evento atomicamente", async () => {
    const principal = dadosConferencia({
      itemId: "conf-cecilia-v101",
      operationId: operacao("conf-cecilia", 1)
    });
    await assertSucceeds(batchConferencia(db.cecilia, principal, "conferir").commit());
    assert.equal((await lerAdmin(caminhoEventoConferencia(principal.itemId, principal.operationId))).exists(), true);
  });
  await caso("Chris delegado como Cecília cria conferência", async () => {
    const principal = dadosConferencia({
      itemId: "conf-chris-delegado-v101",
      papel: "chris_delegado",
      operationId: operacao("conf-chrisdelegado", 1)
    });
    await assertSucceeds(batchConferencia(db.chris, principal, "conferir").commit());
  });
  await caso("Chris normal não falsifica conferência sem papel delegado", async () => {
    const principal = dadosConferencia({
      itemId: "conf-chris-normal-v101",
      papel: "chris",
      operationId: operacao("conf-chrisnormal", 1)
    });
    await assertFails(batchConferencia(db.chris, principal, "conferir").commit());
  });
  await caso("papel indevido não cria conferência", async () => {
    const principal = dadosConferencia({
      itemId: "conf-outro-v101",
      operationId: operacao("conf-outro", 1)
    });
    await assertFails(batchConferencia(db.outro, principal, "conferir").commit());
  });
  await caso("anônimo não cria conferência", async () => {
    const principal = dadosConferencia({
      itemId: "conf-anonimo-v101",
      operationId: operacao("conf-anonimo", 1)
    });
    await assertFails(batchConferencia(db.anonimo, principal, "conferir").commit());
  });
  await caso("principal sem evento atômico é negado", async () => {
    const principal = dadosConferencia({
      itemId: "conf-sem-evento-v101",
      operationId: operacao("conf-semevento", 1)
    });
    await assertFails(setDoc(doc(db.cecilia, caminhoConferencia(principal.itemId)), principal));
  });
  await caso("evento sem principal atômico é negado", async () => {
    const principal = dadosConferencia({
      itemId: "conf-evento-solto-v101",
      operationId: operacao("conf-eventosolto", 1)
    });
    await assertFails(setDoc(
      doc(db.cecilia, caminhoEventoConferencia(principal.itemId, principal.operationId)),
      eventoConferencia({ principal, tipo: "conferir" })
    ));
  });
  await caso("calendário inexistente impede conferência", async () => {
    const itemId = "conf-cal-ausente-v101";
    const operationId = operacao("conf-calausente", 1);
    const principal = {
      ...dadosConferencia({ itemId, operationId }),
      calendarId: "calendario-ausente-v101"
    };
    const batch = writeBatch(db.cecilia);
    const raiz = `calendarios_conferencias/calendario-ausente-v101/competencias/${competencia}/itens/${itemId}`;
    batch.set(doc(db.cecilia, raiz), principal);
    batch.set(doc(db.cecilia, `${raiz}/eventos/${operationId}`), eventoConferencia({ principal, tipo: "conferir" }));
    await assertFails(batch.commit());
  });
  await caso("identidade de item divergente do caminho é negada", async () => {
    const principal = dadosConferencia({
      itemId: "item-divergente-dados-v101",
      operationId: operacao("conf-iddiff", 1)
    });
    const batch = writeBatch(db.cecilia);
    const caminho = caminhoConferencia("item-divergente-path-v101");
    batch.set(doc(db.cecilia, caminho), principal);
    batch.set(doc(db.cecilia, `${caminho}/eventos/${principal.operationId}`), eventoConferencia({ principal, tipo: "conferir" }));
    await assertFails(batch.commit());
  });
  await caso("evento divergente do principal invalida toda a operação", async () => {
    const principal = dadosConferencia({
      itemId: "conf-evento-divergente-v101",
      operationId: operacao("conf-eventodiff", 1)
    });
    const batch = writeBatch(db.cecilia);
    batch.set(doc(db.cecilia, caminhoConferencia(principal.itemId)), principal);
    batch.set(
      doc(db.cecilia, caminhoEventoConferencia(principal.itemId, principal.operationId)),
      eventoConferencia({ principal, tipo: "conferir", extra: { observacao: "divergente" } })
    );
    await assertFails(batch.commit());
  });
  await caso("competência inválida é negada", async () => {
    const itemId = "conf-mes-invalido-v101";
    const operationId = operacao("conf-mesinvalido", 1);
    const principal = {
      ...dadosConferencia({ itemId, operationId }),
      competencia: "2026-13"
    };
    const batch = writeBatch(db.cecilia);
    const raiz = `calendarios_conferencias/${calendarId}/competencias/2026-13/itens/${itemId}`;
    batch.set(doc(db.cecilia, raiz), principal);
    batch.set(doc(db.cecilia, `${raiz}/eventos/${operationId}`), eventoConferencia({ principal, tipo: "conferir" }));
    await assertFails(batch.commit());
  });
  await caso("assinatura fora de SHA-256 é negada", async () => {
    const principal = dadosConferencia({
      itemId: "conf-assinatura-invalida-v101",
      fonteAssinatura: "nao-e-sha256",
      operationId: operacao("conf-badsig", 1)
    });
    await assertFails(batchConferencia(db.cecilia, principal, "conferir").commit());
  });
  await caso("operationId curto ou fora do contrato é negado", async () => {
    const principal = dadosConferencia({
      itemId: "conf-operation-invalida-v101",
      operationId: "curto!"
    });
    await assertFails(batchConferencia(db.cecilia, principal, "conferir").commit());
  });
  await caso("observação acima de 500 caracteres é negada", async () => {
    const principal = dadosConferencia({
      itemId: "conf-obs-longa-v101",
      observacao: "x".repeat(501),
      operationId: operacao("conf-obslonga", 1)
    });
    await assertFails(batchConferencia(db.cecilia, principal, "conferir").commit());
  });
  await caso("campo extra na conferência é negado", async () => {
    const principal = dadosConferencia({
      itemId: "conf-campo-extra-v101",
      operationId: operacao("conf-campoextra", 1),
      extra: { tituloCopiado: "não permitido" }
    });
    await assertFails(batchConferencia(db.cecilia, principal, "conferir").commit());
  });
  await caso("timestamp escolhido pelo cliente é negado", async () => {
    const instanteCliente = new Date("2026-08-21T12:00:00.000Z");
    const principal = dadosConferencia({
      itemId: "conf-time-cliente-v101",
      operationId: operacao("conf-clienttime", 1),
      conferidoEm: instanteCliente,
      atualizadoEm: instanteCliente
    });
    await assertFails(batchConferencia(db.cecilia, principal, "conferir").commit());
  });
  await caso("documento principal de conferência não pode ser apagado", async () => {
    await assertFails(deleteDoc(doc(db.cecilia, caminhoConferencia("conf-cecilia-v101"))));
  });
  await caso("evento de conferência é imutável e não apagável", async () => {
    const path = caminhoEventoConferencia("conf-cecilia-v101", operacao("conf-cecilia", 1));
    await assertFails(updateDoc(doc(db.cecilia, path), { observacao: "alteração proibida" }));
    await assertFails(deleteDoc(doc(db.cecilia, path)));
  });

  let transicaoPrincipal;
  await caso("desmarcar conferência exige e grava nova revisão atômica", async () => {
    const itemId = "conf-transicoes-v101";
    const inicial = dadosConferencia({ itemId, operationId: operacao("conf-transicao", 1) });
    await assertSucceeds(batchConferencia(db.cecilia, inicial, "conferir").commit());
    const criado = await getDoc(doc(db.cecilia, caminhoConferencia(itemId)));
    const principal = dadosConferencia({
      itemId,
      conferido: false,
      revision: 2,
      operationId: operacao("conf-transicao", 2),
      conferidoEm: null
    });
    await assertSucceeds(batchConferencia(db.cecilia, principal, "desmarcar").commit());
    transicaoPrincipal = principal;
    assert.equal(criado.data().revision, 1);
    assert.equal((await lerAdmin(caminhoConferencia(itemId))).data().revision, 2);
  });
  await caso("salto de revisão é negado", async () => {
    const principal = dadosConferencia({
      itemId: "conf-transicoes-v101",
      conferido: true,
      revision: 4,
      operationId: operacao("conf-transicao", 4)
    });
    await assertFails(batchConferencia(db.cecilia, principal, "reconferir").commit());
  });
  await caso("operationId anterior não pode ser reutilizado", async () => {
    const principal = dadosConferencia({
      itemId: "conf-transicoes-v101",
      conferido: true,
      revision: 3,
      operationId: transicaoPrincipal.operationId
    });
    await assertFails(batchConferencia(db.cecilia, principal, "reconferir").commit());
  });
  await caso("reconferir apó desmarcar é permitido", async () => {
    const principal = dadosConferencia({
      itemId: "conf-transicoes-v101",
      conferido: true,
      revision: 3,
      operationId: operacao("conf-transicao", 3)
    });
    await assertSucceeds(batchConferencia(db.cecilia, principal, "reconferir").commit());
  });
  await caso("anotação preserva estado e assinatura", async () => {
    const antes = (await lerAdmin(caminhoConferencia("conf-transicoes-v101"))).data();
    const principal = dadosConferencia({
      itemId: "conf-transicoes-v101",
      conferido: antes.conferido,
      observacao: "Observação sintética revisada.",
      fonteAssinatura: antes.fonteAssinatura,
      revision: 4,
      operationId: operacao("conf-transicao", 4),
      conferidoEm: antes.conferidoEm
    });
    await assertSucceeds(batchConferencia(db.cecilia, principal, "anotar").commit());
  });
  await caso("retry do mesmo create não duplica evento", async () => {
    const principal = dadosConferencia({
      itemId: "conf-retry-v101",
      operationId: operacao("conf-retry", 1)
    });
    const criar = () => batchConferencia(db.cecilia, principal, "conferir").commit();
    await assertSucceeds(criar());
    await assertFails(criar());
    const eventos = await listarAdmin(`${caminhoConferencia(principal.itemId)}/eventos`);
    assert.equal(eventos.size, 1);
  });
  await caso("duas atualizações concorrentes aceitam exatamente uma", async () => {
    const itemId = "conf-concorrencia-v101";
    const inicial = dadosConferencia({ itemId, operationId: operacao("conf-race", 1) });
    await assertSucceeds(batchConferencia(db.cecilia, inicial, "conferir").commit());
    const a = dadosConferencia({
      itemId,
      conferido: false,
      revision: 2,
      operationId: operacao("conf-race-a", 2),
      conferidoEm: null
    });
    const b = dadosConferencia({
      itemId,
      conferido: false,
      revision: 2,
      operationId: operacao("conf-race-b", 2),
      conferidoEm: null
    });
    const resultados = await Promise.allSettled([
      batchConferencia(db.cecilia, a, "desmarcar").commit(),
      batchConferencia(db.cecilia, b, "desmarcar").commit()
    ]);
    assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await lerAdmin(caminhoConferencia(itemId))).data().revision, 2);
  });

  await caso("Chris cria encerramento excepcional e evento atomicamente", async () => {
    const principal = dadosEncerramento({
      itemId: "enc-chris-v101",
      operationId: operacao("enc-chris", 1)
    });
    await assertSucceeds(batchEncerramento(db.chris, principal, "fechar").commit());
    assert.equal((await lerAdmin(caminhoEventoEncerramento(principal.itemId, principal.operationId))).exists(), true);
  });
  await caso("Cecília não cria encerramento excepcional", async () => {
    const principal = dadosEncerramento({
      itemId: "enc-cecilia-v101",
      papel: "cecilia",
      operationId: operacao("enc-cecilia", 1)
    });
    await assertFails(batchEncerramento(db.cecilia, principal, "fechar").commit());
  });
  await caso("Chris não encerra declarando papel operado incorreto", async () => {
    const principal = dadosEncerramento({
      itemId: "enc-papel-errado-v101",
      papel: "chris_delegado",
      operationId: operacao("enc-badrole", 1)
    });
    await assertFails(batchEncerramento(db.chris, principal, "fechar").commit());
  });
  await caso("motivo curto de encerramento é negado", async () => {
    const principal = dadosEncerramento({
      itemId: "enc-motivo-curto-v101",
      motivo: "curto",
      operationId: operacao("enc-short", 1)
    });
    await assertFails(batchEncerramento(db.chris, principal, "fechar").commit());
  });
  await caso("encerramento sem evento atômico é negado", async () => {
    const principal = dadosEncerramento({
      itemId: "enc-sem-evento-v101",
      operationId: operacao("enc-semevento", 1)
    });
    await assertFails(setDoc(doc(db.chris, caminhoEncerramento(principal.itemId)), principal));
  });
  await caso("assinatura/campo extra de encerramento são negados", async () => {
    const assinaturaInvalida = dadosEncerramento({
      itemId: "enc-badsig-v101",
      fonteAssinatura: "inválida",
      operationId: operacao("enc-badsig", 1)
    });
    const campoExtra = dadosEncerramento({
      itemId: "enc-extra-v101",
      operationId: operacao("enc-extra", 1),
      extra: { tituloCopiado: "proibido" }
    });
    await assertFails(batchEncerramento(db.chris, assinaturaInvalida, "fechar").commit());
    await assertFails(batchEncerramento(db.chris, campoExtra, "fechar").commit());
  });

  await caso("Chris reabre encerramento sem apagar histórico", async () => {
    const itemId = "enc-transicoes-v101";
    const inicial = dadosEncerramento({ itemId, operationId: operacao("enc-transicao", 1) });
    await assertSucceeds(batchEncerramento(db.chris, inicial, "fechar").commit());
    const reaberto = dadosEncerramento({
      itemId,
      encerrado: false,
      motivo: "Reaberto para nova verificação.",
      revision: 2,
      operationId: operacao("enc-transicao", 2),
      encerradoEm: null
    });
    await assertSucceeds(batchEncerramento(db.chris, reaberto, "reabrir").commit());
    const eventos = await listarAdmin(`${caminhoEncerramento(itemId)}/eventos`);
    assert.equal(eventos.size, 2);
  });
  await caso("Chris pode fechar novamente apó reabertura", async () => {
    const principal = dadosEncerramento({
      itemId: "enc-transicoes-v101",
      encerrado: true,
      motivo: "Encerrado novamente apó revisão.",
      fonteAssinatura: assinaturaB,
      revision: 3,
      operationId: operacao("enc-transicao", 3)
    });
    await assertSucceeds(batchEncerramento(db.chris, principal, "fechar").commit());
  });
  await caso("Chris anota encerramento preservando estado", async () => {
    const antes = (await lerAdmin(caminhoEncerramento("enc-transicoes-v101"))).data();
    const principal = dadosEncerramento({
      itemId: "enc-transicoes-v101",
      encerrado: antes.encerrado,
      motivo: "Motivo sintético detalhado e revisado.",
      fonteAssinatura: antes.fonteAssinatura,
      revision: 4,
      operationId: operacao("enc-transicao", 4),
      encerradoEm: antes.encerradoEm
    });
    await assertSucceeds(batchEncerramento(db.chris, principal, "anotar").commit());
  });
  await caso("salto de revisão de encerramento é negado", async () => {
    const principal = dadosEncerramento({
      itemId: "enc-transicoes-v101",
      encerrado: false,
      motivo: "Tentativa sintética com revisão inválida.",
      revision: 6,
      operationId: operacao("enc-transicao", 6),
      encerradoEm: null
    });
    await assertFails(batchEncerramento(db.chris, principal, "reabrir").commit());
  });
  await caso("documento e evento de encerramento não podem ser alterados/apagados", async () => {
    const eventPath = caminhoEventoEncerramento("enc-chris-v101", operacao("enc-chris", 1));
    await assertFails(deleteDoc(doc(db.chris, caminhoEncerramento("enc-chris-v101"))));
    await assertFails(updateDoc(doc(db.chris, eventPath), { motivo: "Alteração proibida." }));
    await assertFails(deleteDoc(doc(db.chris, eventPath)));
  });
  await caso("Cecília lê encerramento, mas não o modifica", async () => {
    const snap = await assertSucceeds(getDoc(doc(db.cecilia, caminhoEncerramento("enc-chris-v101"))));
    assert.equal(snap.exists(), true);
    await assertFails(updateDoc(doc(db.cecilia, caminhoEncerramento("enc-chris-v101")), { motivo: "Não permitido." }));
  });

  await caso("V102 Chris migra calendário com backup e recibo no mesmo commit", async () => {
    const alvo = `${calendarIdMigracao}-ok`;
    const op = operacaoMigracao("sucesso");
    await assertSucceeds(batchMigracao(db.chris, alvo, op).commit());
    const recibo = await assertSucceeds(getDoc(doc(db.chris, caminhoReciboMigracao(alvo, op))));
    assert.equal(recibo.data().quantidade, 2);
  });
  await caso("V102 Cecília não lê nem executa migração", async () => {
    const alvo = `${calendarIdMigracao}-cecilia`;
    const op = operacaoMigracao("cecilia");
    await assertFails(batchMigracao(db.cecilia, alvo, op).commit());
    await assertFails(getDoc(doc(db.cecilia, caminhoReciboMigracao(`${calendarIdMigracao}-ok`, operacaoMigracao("sucesso")))));
  });
  await caso("V102 papel indevido e anônimo não leem recibo", async () => {
    const caminho = caminhoReciboMigracao(`${calendarIdMigracao}-ok`, operacaoMigracao("sucesso"));
    await assertFails(getDoc(doc(db.outro, caminho)));
    await assertFails(getDoc(doc(db.anonimo, caminho)));
  });
  await caso("V102 Amanda não executa migração", async () => {
    const alvo = `${calendarIdMigracao}-outro`;
    await assertFails(batchMigracao(db.outro, alvo, operacaoMigracao("outro")).commit());
  });
  await caso("V102 calendário sem recibo atômico é negado", async () => {
    const alvo = `${calendarIdMigracao}-semrecibo`;
    await assertFails(batchMigracao(db.chris, alvo, operacaoMigracao("semrecibo"), {}, { semRecibo: true }).commit());
  });
  await caso("V102 recibo sem backup atômico é negado", async () => {
    const alvo = `${calendarIdMigracao}-sembackup`;
    await assertFails(batchMigracao(db.chris, alvo, operacaoMigracao("sembackup"), {}, { semBackup: true }).commit());
  });
  await caso("V102 campo extra e hash inválido são negados", async () => {
    const alvo = `${calendarIdMigracao}-campo`;
    await assertFails(batchMigracao(db.chris, alvo, operacaoMigracao("campo"), { tituloCopiado: "proibido" }).commit());
    await assertFails(batchMigracao(db.chris, alvo, operacaoMigracao("hash"), { hashDepois: "invalido" }).commit());
  });
  await caso("V102 autoria e timestamp divergentes são negados", async () => {
    const alvo = `${calendarIdMigracao}-timestamp`;
    await assertFails(batchMigracao(db.chris, alvo, operacaoMigracao("autor"), { atorRealPapel: "Cecília" }).commit());
    await assertFails(batchMigracao(db.chris, alvo, operacaoMigracao("tempo"), { criadoEm: "2026-08-21" }).commit());
  });
  await caso("V102 recibo é append-only", async () => {
    const caminho = caminhoReciboMigracao(`${calendarIdMigracao}-ok`, operacaoMigracao("sucesso"));
    await assertFails(updateDoc(doc(db.chris, caminho), { quantidade: 3 }));
    await assertFails(deleteDoc(doc(db.chris, caminho)));
  });
} finally {
  await env.cleanup();
}

console.log(`V101_V102_RULES_SUMMARY passed=${aprovados} failed=${reprovados} rules_sha256=${rulesHash}`);
if (falhas.length > 0) {
  process.exitCode = 1;
}
