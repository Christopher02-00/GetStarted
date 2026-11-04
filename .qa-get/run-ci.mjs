import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use Node 24.');
const source = path.resolve(process.env.GET_RPR_SOURCE || path.join(dir, '..'));
assert(fs.existsSync(path.join(source, 'escritorio.html')), 'Fonte completa do checkout não encontrada.');
const runtime = path.join(dir, '.runtime');
fs.mkdirSync(runtime, { recursive: true });
fs.copyFileSync(path.join(dir, 'firestore.rules'), path.join(runtime, 'firestore.rules'));
const env = { ...process.env, CI: 'true', FIREBASE_CLI_DISABLE_USAGE_REPORTING: '1', METADATA_SERVER_DETECTION: 'none' };
for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']) delete env[key];

async function freePorts(count) {
  const servers = [];
  try {
    for (let i = 0; i < count; i++) {
      const server = net.createServer();
      await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
      servers.push(server);
    }
    return servers.map(server => server.address().port);
  } finally {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
  }
}
const [firestore, hub, logging, websocket] = await freePorts(4);
const config = { firestore: { rules: 'firestore.rules' }, emulators: {
  firestore: { host: '127.0.0.1', port: firestore, websocketPort: websocket },
  hub: { host: '127.0.0.1', port: hub }, logging: { host: '127.0.0.1', port: logging },
  ui: { enabled: false }, singleProjectMode: false
} };
const configPath = path.join(runtime, 'firebase.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
const logPath = path.join(runtime, 'emulator.log');
const log = fs.openSync(logPath, 'w');
const cli = path.join(dir, 'node_modules/firebase-tools/lib/bin/firebase.js');
const emulator = spawn(process.execPath, [cli, 'emulators:start', '--only', 'firestore', '--project', 'demo-get-rpr-ci', '--config', configPath], {
  cwd: dir, env, detached: true, stdio: ['ignore', 'pipe', 'pipe']
});
let output = '', child;
for (const stream of [emulator.stdout, emulator.stderr]) stream.on('data', data => { fs.writeSync(log, data); output = (output + data).slice(-30000); });
function killOwnedGroup(owned, signal) {
  if (!owned?.pid) return;
  try { process.kill(-owned.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
}
const exited = new Promise(resolve => { emulator.once('error', error => resolve({ error: error.message })); emulator.once('exit', (code, signal) => resolve({ code, signal })); });
let exitState;
exited.then(value => { exitState = value; });
let stopping;
async function stop() {
  if (stopping) return stopping;
  stopping = (async () => {
    if (!exitState) {
      try { process.kill(-emulator.pid, 'SIGINT'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 10000))]);
      if (!exitState) {
        try { process.kill(-emulator.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
        await exited;
      }
    }
    killOwnedGroup(emulator, 'SIGKILL');
    fs.closeSync(log);
    fs.writeFileSync(path.join(runtime, 'cleanup.json'), JSON.stringify({ ownedEmulatorOnly: true, stopped: !!exitState, exitState, cloud: false }, null, 2));
  })();
  return stopping;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { killOwnedGroup(child, 'SIGKILL'); stop().finally(() => process.exit(130)); });
try {
  const deadline = Date.now() + 90000;
  while (!/All emulators ready/i.test(output)) {
    assert(!exitState, 'Emulador encerrou antes de iniciar: ' + JSON.stringify(exitState));
    assert(Date.now() < deadline, 'Emulador não iniciou no limite de90s.');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const prefix = 'demo-get-rpr-' + Date.now().toString(36);
  child = spawn(process.execPath, ['run-suite.mjs'], { cwd: dir, detached: true, stdio: 'inherit', env: { ...env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:' + firestore, GET_RPR_SOURCE: source, GET_RPR_PROJECT_PREFIX: prefix } });
  const timer = setTimeout(() => killOwnedGroup(child, 'SIGKILL'), 240000);
  try {
    const result = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code, signal) => resolve({ code, signal })); });
    assert.equal(result.code, 0, 'RPR falhou: ' + JSON.stringify(result));
  } finally { clearTimeout(timer); }
} catch (error) {
  console.error(error.message);
  console.error(output.slice(-8000));
  process.exitCode = 1;
} finally {
  killOwnedGroup(child, 'SIGKILL');
  await stop();
}
