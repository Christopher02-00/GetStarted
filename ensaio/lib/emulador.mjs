// Ensaio Get — sobe Firestore + Auth emulators com as rules do repositório e um servidor HTTP estático do checkout.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PROJETO = 'get-started-4956d';
const RUNTIME = path.join(RAIZ, 'ensaio', '.runtime');

async function portasLivres(n) {
  const servers = [];
  for (let i = 0; i < n; i++) {
    const s = net.createServer();
    await new Promise((res, rej) => s.once('error', rej).listen(0, '127.0.0.1', res));
    servers.push(s);
  }
  const portas = servers.map(s => s.address().port);
  await Promise.all(servers.map(s => new Promise(r => s.close(r))));
  return portas;
}
async function esperarPorta(porta, ms = 90000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    const ok = await new Promise(r => { const c = net.connect(porta, '127.0.0.1'); c.once('connect', () => { c.destroy(); r(true); }); c.once('error', () => r(false)); });
    if (ok) return;
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('porta ' + porta + ' não abriu');
}

const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
function servidorEstatico(porta) {
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let p = decodeURIComponent(url.pathname); if (p === '/') p = '/escritorio.html';
    const abs = path.join(RAIZ, p);
    if (!abs.startsWith(RAIZ) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(abs).pipe(res);
  });
  return new Promise(r => srv.listen(porta, '127.0.0.1', () => r(srv)));
}

export async function subir({ log = console.log } = {}) {
  fs.mkdirSync(RUNTIME, { recursive: true });
  // emuladores órfãos de uma execução anterior (script interrompido) disputam portas e quebram o registro das Functions
  try { execSync("pkill -f 'emulators:start' ; pkill -f cloud-firestore-emulator ; pkill -f 'firebase-tools/lib/emulator' ; true", { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1500)); } catch {}
  const [fs_, auth, hub, ui, web, fn, evt] = await portasLivres(7);
  const cfg = {
    firestore: { rules: path.join(RAIZ, 'firestore.rules') },
    functions: { source: path.relative(RUNTIME, path.join(RAIZ, 'functions-get')), codebase: 'get', runtime: 'nodejs22' },
    emulators: { firestore: { host: '127.0.0.1', port: fs_ }, auth: { host: '127.0.0.1', port: auth }, functions: { host: '127.0.0.1', port: fn }, eventarc: { host: '127.0.0.1', port: evt }, hub: { host: '127.0.0.1', port: hub }, ui: { enabled: false }, singleProjectMode: true }
  };
  const cfgPath = path.join(RUNTIME, 'firebase.json');
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  const logFile = fs.openSync(path.join(RUNTIME, 'emulator.log'), 'w');
  const env = { ...process.env, CI: 'true', FIREBASE_CLI_DISABLE_USAGE_REPORTING: '1' };
  for (const k of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS']) delete env[k];
  // os emuladores só falam com localhost: nenhum proxy (o proxy do ambiente responde 'request blocked' a chamadas internas)
  for (const k of Object.keys(env)) if (/proxy/i.test(k)) delete env[k];
  const env2 = { ...env, GET_I166_MIDIA_ENABLED: 'false', GET_I165_DEPLOY_EMAIL_ENABLED: 'false', NO_PROXY: '127.0.0.1,localhost,' + (env.NO_PROXY || ''), no_proxy: '127.0.0.1,localhost,' + (env.no_proxy || '') };
  const proc = spawn('firebase', ['emulators:start', '--only', 'firestore,auth,functions', '--project', PROJETO, '--config', cfgPath], { env: env2, stdio: ['ignore', logFile, logFile], cwd: RUNTIME });
  const matar = () => { try { proc.kill('SIGKILL'); } catch {} };
  process.on('exit', matar); process.on('SIGINT', () => { matar(); process.exit(130); }); process.on('uncaughtException', e => { console.error(e); matar(); process.exit(1); });
  log(`[ensaio] subindo emuladores (firestore ${fs_}, auth ${auth}, functions ${fn})…`);
  await esperarPorta(fs_); await esperarPorta(auth); await esperarPorta(fn, 180000);
  // porta aberta não é emulador pronto: esperar o HTTP responder de verdade
  for (const [nome, porta] of [['firestore', fs_], ['auth', auth]]) {
    const fim = Date.now() + 60000; let ok = false;
    while (Date.now() < fim && !ok) { try { const r = await fetch(`http://127.0.0.1:${porta}/`); ok = r.status < 600; } catch { await new Promise(r => setTimeout(r, 500)); } }
    if (!ok) throw new Error(nome + ' não respondeu HTTP');
  }
  // as Functions carregam depois da porta abrir: esperar a definição das funções no log
  { const fim = Date.now() + 120000; const logPath = path.join(RUNTIME, 'emulator.log');
    while (Date.now() < fim && !/Loaded functions definitions/.test(fs.readFileSync(logPath, 'utf8'))) await new Promise(r => setTimeout(r, 1000));
    if (!/Loaded functions definitions/.test(fs.readFileSync(logPath, 'utf8'))) throw new Error('Functions não carregaram (ver ensaio/.runtime/emulator.log)');
    // e a callable só existe quando todos os gatilhos terminaram de registrar
    let pronta = false; const fim2 = Date.now() + 150000;
    while (Date.now() < fim2 && !pronta) { try { const r = await fetch(`http://127.0.0.1:${fn}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"data":{}}' }); pronta = r.status !== 404; await r.text(); } catch {} if (!pronta) await new Promise(r => setTimeout(r, 1000)); }
    if (!pronta) throw new Error('callable não registrou no emulador de Functions'); }
  const srv = await servidorEstatico(web);
  log(`[ensaio] site servido em http://127.0.0.1:${web}/`);
  const portas = { firestore: fs_, auth, web, functions: fn };
  fs.writeFileSync(path.join(RUNTIME, 'portas.json'), JSON.stringify(portas));
  // Espera as Functions terminarem o que as escritas do seed dispararam (gatilhos em videos_producao/postagens).
  // Uma Function em voo segura locks no emulador e faz a transação do app falhar com "Transaction lock timeout".
  const aguardarFunctionsOciosas = async (ms = 30000) => {
    const logPath = path.join(RUNTIME, 'emulator.log'); const fim = Date.now() + ms; let estavel = 0, ultimo = -1;
    while (Date.now() < fim) {
      const t = fs.readFileSync(logPath, 'utf8');
      const ini = (t.match(/Beginning execution of/g) || []).length, fimExec = (t.match(/Finished "/g) || []).length + (t.match(/was killed because/g) || []).length;
      if (ini <= fimExec && ini === ultimo) {
        if (++estavel >= 3) {
          const mortas = (t.match(/was killed because/g) || []).length;
          if (mortas) { console.warn(`[ensaio] ${mortas} execução(ões) de Function morreram no seed — o worker morto não desfaz a transação e o emulador segura os locks por ~20 s; esperando`); await new Promise(r => setTimeout(r, 20000)); }
          return;
        }
      } else estavel = 0;
      ultimo = ini; await new Promise(r => setTimeout(r, 700));
    }
    console.warn('[ensaio] Functions ainda ocupadas após ' + ms + ' ms — seguindo mesmo assim');
  };
  return { aguardarFunctionsOciosas,
    portas,
    url: (pagina = 'escritorio.html', extra = '') => `http://127.0.0.1:${web}/${pagina}?ensaio=1&fsPort=${fs_}&authPort=${auth}${extra}`,
    async parar() {
      srv.close(); proc.kill('SIGINT'); await new Promise(r => setTimeout(r, 2500)); try { proc.kill('SIGKILL'); } catch {}
      // o SIGINT ao firebase-tools nem sempre derruba o jar do Firestore e os workers das Functions: órfãos somam gigabytes
      try { execSync("pkill -f cloud-firestore-emulator ; pkill -f 'firebase-tools/lib/emulator' ; pkill -f functionsEmulatorRuntime ; true", { stdio: 'ignore' }); } catch {}
    }
  };
}
