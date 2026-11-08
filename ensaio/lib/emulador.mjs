// Ensaio Get — sobe Firestore + Auth emulators com as rules do repositório e um servidor HTTP estático do checkout.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
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
  const [fs_, auth, hub, ui, web] = await portasLivres(5);
  const cfg = {
    firestore: { rules: path.join(RAIZ, 'firestore.rules') },
    emulators: { firestore: { host: '127.0.0.1', port: fs_ }, auth: { host: '127.0.0.1', port: auth }, hub: { host: '127.0.0.1', port: hub }, ui: { enabled: false }, singleProjectMode: true }
  };
  const cfgPath = path.join(RUNTIME, 'firebase.json');
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  const logFile = fs.openSync(path.join(RUNTIME, 'emulator.log'), 'w');
  const env = { ...process.env, CI: 'true', FIREBASE_CLI_DISABLE_USAGE_REPORTING: '1' };
  for (const k of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS']) delete env[k];
  const proc = spawn('firebase', ['emulators:start', '--only', 'firestore,auth', '--project', PROJETO, '--config', cfgPath], { env, stdio: ['ignore', logFile, logFile], cwd: RUNTIME });
  log(`[ensaio] subindo emuladores (firestore ${fs_}, auth ${auth})…`);
  await esperarPorta(fs_); await esperarPorta(auth);
  const srv = await servidorEstatico(web);
  log(`[ensaio] site servido em http://127.0.0.1:${web}/`);
  const portas = { firestore: fs_, auth, web };
  fs.writeFileSync(path.join(RUNTIME, 'portas.json'), JSON.stringify(portas));
  return {
    portas,
    url: (pagina = 'escritorio.html', extra = '') => `http://127.0.0.1:${web}/${pagina}?ensaio=1&fsPort=${fs_}&authPort=${auth}${extra}`,
    async parar() { srv.close(); proc.kill('SIGINT'); await new Promise(r => setTimeout(r, 1500)); try { proc.kill('SIGKILL'); } catch {} }
  };
}
