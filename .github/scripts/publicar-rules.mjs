// Publica firestore.rules no Firebase pela API de Rules (sem firebase-tools):
// cria um ruleset com a fonte e aponta a release `cloud.firestore` para ele. Só exige o papel Firebase Rules Admin.
// Uso (GitHub Actions): GOOGLE_APPLICATION_CREDENTIALS=sa.json node .github/scripts/publicar-rules.mjs get-started-4956d firestore.rules
import fs from 'node:fs';
import crypto from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';
const [projeto, arquivo] = process.argv.slice(2);
if (!projeto || !arquivo) { console.error('uso: publicar-rules.mjs <projeto> <firestore.rules>'); process.exit(2); }
const fonte = fs.readFileSync(arquivo, 'utf8');
const sha = crypto.createHash('sha256').update(fonte).digest('hex');
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/firebase'] });
const client = await auth.getClient();
const token = (await client.getAccessToken()).token;
const base = `https://firebaserules.googleapis.com/v1/projects/${projeto}`;
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function chamada(metodo, caminho, corpo) {
  // o serviço de Rules responde 503 UNAVAILABLE de forma transitória ao compilar rulesets grandes → até 6 tentativas com espera crescente
  let ultimo;
  for (let tentativa = 1; tentativa <= 6; tentativa++) {
    const r = await fetch(base + caminho, { method: metodo, headers: H, body: corpo ? JSON.stringify(corpo) : undefined });
    const txt = await r.text();
    if (r.ok) return txt ? JSON.parse(txt) : {};
    ultimo = `${metodo} ${caminho} → ${r.status} ${txt.replace(/\s+/g, ' ').slice(0, 400)}`;
    if (![500, 502, 503, 504, 429].includes(r.status)) break;
    console.log(`tentativa ${tentativa} falhou (${r.status}); aguardando ${tentativa * 20}s…`); await new Promise(res => setTimeout(res, tentativa * 20000));
  }
  throw new Error(ultimo);
}
// 1. valida a fonte (o servidor compila e devolve issues)
const teste = await chamada('POST', ':test', { source: { files: [{ name: 'firestore.rules', content: fonte }] } });
const erros = (teste.issues || []).filter(i => i.severity === 'ERROR');
if (erros.length) { console.error('Rules com erro de compilação:', JSON.stringify(erros, null, 1)); process.exit(1); }
// 2. ruleset novo
const ruleset = await chamada('POST', '/rulesets', { source: { files: [{ name: 'firestore.rules', content: fonte }] } });
console.log('ruleset criado:', ruleset.name);
// 3. release cloud.firestore aponta para o ruleset
const release = await chamada('PATCH', '/releases/cloud.firestore', { release: { name: `projects/${projeto}/releases/cloud.firestore`, rulesetName: ruleset.name }, updateMask: 'rulesetName' });
console.log('release atualizada:', release.name, '→', release.rulesetName, 'em', release.updateTime);
// 4. confere
const atual = await chamada('GET', '/releases/cloud.firestore');
if (atual.rulesetName !== ruleset.name) { console.error('A release não aponta para o ruleset novo:', atual.rulesetName); process.exit(1); }
console.log(`OK · firestore.rules ${fonte.length} bytes · sha256 ${sha} · ativo em produção`);
