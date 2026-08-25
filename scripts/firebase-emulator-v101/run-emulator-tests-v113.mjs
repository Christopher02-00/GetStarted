import { copyFileSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const aqui=dirname(fileURLToPath(import.meta.url));
const projeto="demo-get-conclusao-v101";
const javaHome=process.env.GET_V101_JAVA_HOME||"/private/tmp/get-v113-jdk21/Contents/Home";
const java=join(javaHome,"bin","java");
const firebase=join(aqui,"node_modules",".bin","firebase");
const regrasCanonicas=join(aqui,"..","..","firestore.rules");
const regrasGeradas=join(aqui,"rules-v101.generated.rules");
const logFirestore=join(aqui,"firestore-debug.log");
if(!existsSync(java)){console.error(`JDK V113 indisponível em ${java}.`);process.exit(2);}
if(!existsSync(firebase)){console.error("Dependências do Emulator ausentes.");process.exit(2);}
const env={...process.env,CI:"true",FIREBASE_CLI_DISABLE_UPDATE_CHECK:"true",GCLOUD_PROJECT:projeto,
  JAVA_HOME:javaHome,PATH:`${join(javaHome,"bin")}:${dirname(process.execPath)}:${process.env.PATH||""}`};
const comando=`"${process.execPath}" "${join(aqui,"rules-v113-ajuste-calendarios.test.mjs")}"`;
let resultado;
try{
  copyFileSync(regrasCanonicas,regrasGeradas);
  resultado=spawnSync(firebase,["emulators:exec","--only","firestore","--project",projeto,
    "--config",join(aqui,"firebase.json"),"--non-interactive",comando],{cwd:aqui,env,stdio:"inherit"});
}finally{if(existsSync(regrasGeradas)) unlinkSync(regrasGeradas);}
if(!resultado||resultado.error){console.error(resultado?.error?.message||"Emulator não respondeu.");process.exit(2);}
let estouros=0;
if(existsSync(logFirestore)) estouros=(readFileSync(logFirestore,"utf8").match(/maximum of 1000 expressions/g)||[]).length;
console.log(`V113_EMULATOR_BUDGET expression_limit_hits=${estouros}`);
if(estouros>0) process.exit(1);
process.exit(resultado.status??2);
