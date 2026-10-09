import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';

assert.equal(
  process.env.FRONTEND_NO_EVIDENCE,
  'true',
  'Set FRONTEND_NO_EVIDENCE=true before running this command',
);
process.env.NODE_OPTIONS =
  `${process.env.NODE_OPTIONS ?? ''} --require="${resolve('scripts/playwright-no-evidence.cjs').replaceAll('\\', '/')}"`.trim();
const frontend = process.cwd(),
  backend = resolve(
    process.env.BACKEND_REFERENCE_PATH ?? '../farmers-market-platform',
  ),
  requireBackend = createRequire(join(backend, 'package.json'));
const runtime = join(
  backend,
  'test/frontend-integration/.runtime',
  `platform-${process.pid}-${Date.now()}`,
);
mkdirSync(runtime, { recursive: true });
function child(args: string[], cwd: string, env: Record<string, string> = {}) {
  return spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}
function exitOf(child: ChildProcess) {
  return new Promise<number>((r, j) => {
    child.once('error', j);
    child.once('exit', (code) => r(code ?? 1));
  });
}
function pipe(child: ChildProcess) {
  child.stdout!.pipe(process.stdout, { end: false });
  child.stderr!.pipe(process.stderr, { end: false });
}
const server = child(
  [
    requireBackend.resolve('ts-node/dist/bin.js'),
    '--project',
    'test/frontend-integration/tsconfig.json',
    'test/frontend-integration/platform-run.ts',
  ],
  backend,
  {
    NODE_ENV: 'test',
    FRONTEND_INTEGRATION_RUNTIME: runtime,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS} --require="${join(backend, 'test/frontend-integration/regression-no-evidence.cjs').replaceAll('\\', '/')}"`,
  },
);
const serverExit = exitOf(server);
let vite: ChildProcess | undefined,
  astro: ChildProcess | undefined,
  viteExit: Promise<number> | undefined,
  astroExit: Promise<number> | undefined,
  pass = false;
try {
  await new Promise<void>((r, j) => {
    let output = '';
    const timer = setTimeout(
      () => j(new Error('Platform harness startup timed out')),
      240000,
    );
    server.stdout!.on('data', (data) => {
      process.stdout.write(data);
      output += String(data);
      if (output.includes('PLATFORM_ADMIN_HARNESS_READY')) {
        clearTimeout(timer);
        r();
      }
    });
    server.stderr!.pipe(process.stderr, { end: false });
    serverExit.then((code) => {
      clearTimeout(timer);
      j(new Error(`Backend exited ${code} before readiness`));
    });
  });
  const readyPath = join(runtime, 'ready.json'),
    ready = JSON.parse(readFileSync(readyPath, 'utf8')) as {
      endpoint: string;
      shopEndpoint: string;
      database: string;
      bridgeKey: string;
    };
  assert.equal(new URL(ready.endpoint).hostname, '127.0.0.1');
  assert.match(ready.database, /^vendure_test_platform_admin_/);
  const build = child(
    [join(frontend, 'node_modules/astro/bin/astro.mjs'), 'build'],
    join(frontend, 'apps/storefront'),
    { FRONTEND_FIXTURE_MODE: 'false' },
  );
  pipe(build);
  assert.equal(await exitOf(build), 0, 'Real Storefront build');
  vite = child(
    [
      join(frontend, 'node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '4345',
      '--strictPort',
    ],
    join(frontend, 'apps/admin'),
    { FRONTEND_FIXTURE_MODE: 'false', PUBLIC_ADMIN_API_URL: ready.endpoint },
  );
  viteExit = exitOf(vite);
  pipe(vite);
  astro = child(['apps/storefront/dist/server/entry.mjs'], frontend, {
    FRONTEND_FIXTURE_MODE: 'false',
    SHOP_API_URL: ready.shopEndpoint,
    PLATFORM_ACCOUNT_ORIGIN: 'http://auth.platform.localhost:4347',
    PLATFORM_ACCOUNT_BRIDGE_KEY: ready.bridgeKey,
    HOST: '127.0.0.1',
    PORT: '4347',
  });
  astroExit = exitOf(astro);
  pipe(astro);
  for (const [port, host] of [
    [4345, '127.0.0.1:4345'],
    [4347, 'vendor-a.localhost:4347'],
  ] as const) {
    let started = false;
    for (let i = 0; i < 100; i++) {
      try {
        const status = await new Promise<number>((r, j) => {
          const req = httpRequest(
            `http://127.0.0.1:${port}/`,
            { headers: { Host: host } },
            (res) => {
              res.resume();
              r(res.statusCode!);
            },
          );
          req.on('error', j);
          req.end();
        });
        if (status === 200) {
          started = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(started, 'Local application must start with fixture mode false');
  }
  const browser = child(
    [
      join(frontend, 'node_modules/@playwright/test/cli.js'),
      'test',
      '--config',
      'playwright.platform-admin.config.ts',
      ...process.argv.slice(2),
    ],
    frontend,
    { FRONTEND_PLATFORM_READY: readyPath },
  );
  pipe(browser);
  pass = (await exitOf(browser)) === 0;
} finally {
  if (vite) {
    vite.kill();
    await viteExit;
  }
  if (astro) {
    astro.kill();
    await astroExit;
  }
  if (server.exitCode === null)
    server.stdin!.end(pass ? 'finish\n' : 'failed\n');
  const code = await serverExit;
  const inside = relative(
    join(backend, 'test/frontend-integration/.runtime'),
    runtime,
  );
  assert.ok(inside.startsWith('platform-') && !inside.includes('..'));
  rmSync(runtime, { recursive: true });
  if (pass && code === 0)
    console.log(
      'REAL FULL-STACK PASS: real Chromium, Vite, Astro, Vendure, native permissions and disposable PostgreSQL. Controlled local providers only. External qualification NOT_EXECUTED.',
    );
  else process.exitCode = 1;
}
