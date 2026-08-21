import { copyFileSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const aqui = dirname(fileURLToPath(import.meta.url));
const projeto = "demo-get-conclusao-v101";
const javaHome = process.env.GET_V101_JAVA_HOME || "/private/tmp/get-v101-jdk21/Contents/Home";
const java = join(javaHome, "bin", "java");
const firebase = join(aqui, "node_modules", ".bin", "firebase");
const regrasCanonicas = join(aqui, "..", "..", "firestore.rules");
const regrasGeradas = join(aqui, "rules-v101.generated.rules");
const logFirestore = join(aqui, "firestore-debug.log");

if (!existsSync(java)) {
  console.error(`JDK V101 indisponível em ${java}. Defina GET_V101_JAVA_HOME para um JDK 21 local.`);
  process.exit(2);
}
if (!existsSync(firebase)) {
  console.error("Dependências ausentes. Execute pnpm install --frozen-lockfile nesta pasta.");
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
  PATH: `${join(javaHome, "bin")}:${dirname(process.execPath)}:${process.env.PATH || ""}`
};

const comandoTeste = `"${process.execPath}" "${join(aqui, "rules-v101.test.mjs")}"`;
let resultado;
try {
  // O Firebase CLI 15 recusa regras fora da pasta do firebase.json. A cópia
  // efêmera nasce byte a byte da fonte canônica e é apagada ao encerrar.
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
console.log(`V101_EMULATOR_BUDGET expression_limit_hits=${estourosDeOrcamento}`);
if (estourosDeOrcamento > 0) process.exit(1);
process.exit(resultado.status ?? 2);
