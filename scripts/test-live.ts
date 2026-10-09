import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const frontend = process.cwd(),
  backend = resolve(
    process.env.BACKEND_REFERENCE_PATH ?? '../farmers-market-platform',
  );
const profile = process.argv.includes('--market')
    ? 'market'
    : process.argv.includes('--unbound')
      ? 'unbound'
      : 'bound',
  prefix =
    profile === 'market'
      ? 'live-market'
      : profile === 'bound'
        ? 'live'
        : 'live-unbound';
const requireBackend = createRequire(join(backend, 'package.json'));
const noEvidence = process.env.FRONTEND_NO_EVIDENCE === 'true';
const evidence = join(
  frontend,
  process.env.FRONTEND_EVIDENCE_DIR ?? 'docs/evidence/phase13c5',
);
if (!noEvidence) mkdirSync(evidence, { recursive: true });
const backendRuntime = noEvidence
  ? `test/frontend-integration/.runtime/admin-regression-${profile}-${process.pid}-${Date.now()}`
  : profile === 'market'
    ? 'test/frontend-integration/.runtime/phase13c5'
    : `test/frontend-integration/.runtime/phase13c5/vendor-${profile}`;
const readyPath = join(backend, `${backendRuntime}/ready.json`);
function exitOf(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
}
const server = spawn(
  process.execPath,
  [
    requireBackend.resolve('ts-node/dist/bin.js'),
    '--project',
    'test/frontend-integration/tsconfig.json',
    profile === 'market'
      ? 'test/frontend-integration/market-run.ts'
      : 'test/frontend-integration/run.ts',
    '--serve',
    ...(profile === 'unbound' ? ['--unbound'] : []),
  ],
  {
    cwd: backend,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      FRONTEND_INTEGRATION_RUNTIME: backendRuntime,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  },
);
const backendExit = exitOf(server),
  log = noEvidence
    ? process.stdout
    : createWriteStream(join(evidence, `${prefix}-backend.log`));
server.stdout!.on('data', (chunk) => log.write(chunk));
server.stderr!.on('data', (chunk) => log.write(chunk));
let vite: ChildProcess | undefined,
  pass = false;
try {
  await new Promise<void>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(
      () => reject(new Error('Local backend fixture startup timed out')),
      240000,
    );
    server.stdout!.on('data', (chunk) => {
      output += String(chunk);
      if (output.includes('FRONTEND_HARNESS_READY')) {
        clearTimeout(timer);
        resolve();
      }
    });
    backendExit.then((code) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Local backend fixture exited (${code}); see live-backend.log`,
        ),
      );
    });
  });
  const ready = JSON.parse(readFileSync(readyPath, 'utf8')) as {
    endpoint: string;
    database: string;
  };
  assert.equal(new URL(ready.endpoint).hostname, '127.0.0.1');
  assert.match(ready.database, /^vendure_test_frontend_/);
  vite = spawn(
    process.execPath,
    [
      join(frontend, 'node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '4335',
      '--strictPort',
    ],
    {
      cwd: join(frontend, 'apps/admin'),
      windowsHide: true,
      env: {
        ...process.env,
        FRONTEND_FIXTURE_MODE: 'false',
        PUBLIC_ADMIN_API_URL: ready.endpoint,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const viteLog = noEvidence
    ? process.stdout
    : createWriteStream(join(evidence, `${prefix}-frontend.log`));
  vite.stdout!.pipe(viteLog, { end: !noEvidence });
  vite.stderr!.on('data', (chunk) => viteLog.write(chunk));
  let started = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch('http://127.0.0.1:4335')).ok) {
        started = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(started, 'Local frontend must start with fixture mode disabled');
  const browser = spawn(
    process.execPath,
    [
      join(frontend, 'node_modules/@playwright/test/cli.js'),
      'test',
      '--config',
      profile === 'market'
        ? 'playwright.live-market.config.ts'
        : 'playwright.live.config.ts',
    ],
    {
      cwd: frontend,
      windowsHide: true,
      env: {
        ...process.env,
        FRONTEND_LIVE_READY_PATH: readyPath,
        FRONTEND_LIVE_PROFILE: profile,
      },
      stdio: 'inherit',
    },
  );
  const code = await exitOf(browser);
  pass = code === 0;
  if (!pass) throw new Error('Live browser integration failed');
} finally {
  if (vite) vite.kill();
  if (server.exitCode === null)
    server.stdin!.end(pass ? 'finish\n' : 'failed\n');
  const code = await backendExit;
  if (!noEvidence) log.end();
  const backendResults = noEvidence
    ? undefined
    : (JSON.parse(
        readFileSync(join(backend, `${backendRuntime}/results.json`), 'utf8'),
      ) as unknown);
  if (!noEvidence)
    writeFileSync(
      join(evidence, `${prefix}-integration.json`),
      JSON.stringify(
        {
          classification:
            pass && code === 0 ? 'REAL FULL-STACK PASS' : 'PARTIAL',
          profile,
          fixtureMode: false,
          transport: 'Real HTTP with native login cookies',
          providerMode: 'Local test adapters only',
          backendResults,
          backendExit: code,
          browserPass: pass,
        },
        null,
        2,
      ) + '\n',
    );
  if (noEvidence) {
    const ownedRuntime = resolve(backend, backendRuntime);
    assert.ok(
      ownedRuntime.startsWith(
        join(backend, 'test/frontend-integration/.runtime') + '\\',
      ),
    );
    rmSync(ownedRuntime, { recursive: true });
    if (pass && code === 0)
      console.log(
        `REAL FULL-STACK PASS: ${profile} Admin regression. Owned disposable database/output cleaned.`,
      );
  }
  if (code !== 0) process.exitCode = 1;
}
