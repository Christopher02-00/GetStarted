import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

async function run(args, timeout) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
  const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
  try {
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    assert.equal(code.code, 0, `Teste falhou ou excedeu o limite: ${JSON.stringify(code)}`);
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
}
await run(['--test', '--test-concurrency=1', 'test/rpr.test.mjs'], 60000);
await run(['run-mutants.mjs'], 160000);
console.log('RPR: quatro seams passaram e cinco defeitos deliberados foram detectados. Alcance focal; não é B01–B10 integral.');
