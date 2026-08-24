import { copyFileSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const aqui = dirname(fileURLToPath(import.meta.url));
const projeto = "demo-get-portal-propostas-v111";
const candidatosJava = [
  process.env.GET_V111_JAVA_HOME,
  process.env.GET_V103_JAVA_HOME,
  process.env.GET_V101_JAVA_HOME,
  "/private/tmp/get-v108-jdk-download/jdk-21.0.12.1+1/Contents/Home",
  "/private/tmp/get-v101-jdk21/Contents/Home"
].filter(Boolean);
const javaHome = candidatosJava.find((pasta) => existsSync(join(pasta, "bin", "java"))) || "";
const java = join(javaHome, "bin", "java");
const firebaseLocal = join(aqui, "node_modules", ".bin", "firebase");
const depsV101 = join(aqui, "..", "firebase-emulator-v101");
const firebaseV101 = join(depsV101, "node_modules", ".bin", "firebase");
const firebase = existsSync(firebaseLocal) ? firebaseLocal : firebaseV101;
const depsRoot = existsSync(join(aqui, "node_modules")) ? aqui : depsV101;
const regrasCanonicas = join(aqui, "..", "..", "firestore.rules");
const regrasGeradas = join(aqui, "rules-v111.generated.rules");
const logFirestore = join(aqui, "firestore-debug.log");

if (!javaHome || !existsSync(java)) {
  console.error("JDK V111 indisponível. Defina GET_V111_JAVA_HOME para um JDK 21 local.");
  process.exit(2);
}
if (!existsSync(firebase)) {
  console.error("Firebase CLI ausente. Instale as dependências localmente ou preserve o harness V101.");
  process.exit(2);
}
if (!existsSync(join(depsRoot, "node_modules", "@firebase", "rules-unit-testing", "package.json"))) {
  console.error("@firebase/rules-unit-testing ausente no harness local e no V101.");
  process.exit(2);
}
if (!existsSync(regrasCanonicas)) {
  console.error(`Regras canônicas ausentes em ${regrasCanonicas}.`);
  process.exit(2);
}

const env = {
  ...process.env,
  CI: "true",
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
  GCLOUD_PROJECT: projeto,
  JAVA_HOME: javaHome,
  GET_V111_DEPS_ROOT: depsRoot,
  PATH: `${join(javaHome, "bin")}:${dirname(process.execPath)}:${process.env.PATH || ""}`
};

const comandoTeste = `"${process.execPath}" "${join(aqui, "rules-v111-portal-propostas.test.mjs")}"`;
let resultado;
try {
  if (existsSync(logFirestore)) unlinkSync(logFirestore);
  copyFileSync(regrasCanonicas, regrasGeradas);
  resultado = spawnSync(
    firebase,
    [
      "emulators:exec",
      "--only", "firestore",
      "--project", projeto,
      "--config", join(aqui, "firebase.json"),
      "--non-interactive",
      comandoTeste
    ],
    { cwd: aqui, env, stdio: "inherit" }
  );
} finally {
  if (existsSync(regrasGeradas)) unlinkSync(regrasGeradas);
}

if (!resultado) {
  console.error("O Firebase Emulator não devolveu resultado de execução.");
  process.exit(2);
}
if (resultado.error) {
  console.error(resultado.error.message);
  process.exit(2);
}

let estourosDeOrcamento = 0;
if (existsSync(logFirestore)) {
  const log = readFileSync(logFirestore, "utf8");
  estourosDeOrcamento = (log.match(/maximum of 1000 expressions/g) || []).length;
}
console.log(`V111_PORTAL_PROPOSTAS_EMULATOR_BUDGET expression_limit_hits=${estourosDeOrcamento}`);
if (estourosDeOrcamento > 0) process.exit(1);
process.exit(resultado.status ?? 2);
