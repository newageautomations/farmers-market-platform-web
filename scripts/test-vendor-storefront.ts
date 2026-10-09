import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';

const frontend = process.cwd(),
  backend = resolve(
    process.env.BACKEND_REFERENCE_PATH ?? '../farmers-market-platform',
  );
const requireBackend = createRequire(join(backend, 'package.json'));
const runtime = join(
  backend,
  'test/frontend-integration/.runtime',
  `storefront-${process.pid}-${Date.now()}`,
);
mkdirSync(runtime, { recursive: true });
function exitOf(child: ChildProcess) {
  return new Promise<number>((r, j) => {
    child.once('error', j);
    child.once('exit', (c) => r(c ?? 1));
  });
}
function child(args: string[], cwd: string, env: Record<string, string> = {}) {
  return spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}
const server = child(
  [
    requireBackend.resolve('ts-node/dist/bin.js'),
    '--project',
    'test/frontend-integration/tsconfig.json',
    'test/frontend-integration/storefront-run.ts',
  ],
  backend,
  { NODE_ENV: 'test', FRONTEND_INTEGRATION_RUNTIME: runtime },
);
const backendExit = exitOf(server);
let astro: ChildProcess | undefined,
  astroExit: Promise<number> | undefined,
  pass = false;
try {
  await new Promise<void>((r, j) => {
    let output = '';
    const timeout = setTimeout(
      () => j(new Error('Storefront harness startup timed out')),
      240000,
    );
    server.stdout!.on('data', (data) => {
      process.stdout.write(data);
      output += String(data);
      if (output.includes('STOREFRONT_HARNESS_READY')) {
        clearTimeout(timeout);
        r();
      }
    });
    server.stderr!.on('data', (data) => process.stderr.write(data));
    backendExit.then((code) => {
      clearTimeout(timeout);
      j(new Error(`Backend exited ${code} before readiness`));
    });
  });
  const readyPath = join(runtime, 'ready.json'),
    ready = JSON.parse(readFileSync(readyPath, 'utf8')) as {
      endpoint: string;
      database: string;
    };
  assert.equal(new URL(ready.endpoint).hostname, '127.0.0.1');
  assert.match(ready.database, /^vendure_test_storefront_/);
  const build = child(
    [join(frontend, 'node_modules/astro/bin/astro.mjs'), 'build'],
    join(frontend, 'apps/storefront'),
    { FRONTEND_FIXTURE_MODE: 'false' },
  );
  build.stdout!.pipe(process.stdout);
  build.stderr!.pipe(process.stderr);
  assert.equal(await exitOf(build), 0, 'Production Storefront build');
  astro = child(['apps/storefront/dist/server/entry.mjs'], frontend, {
    FRONTEND_FIXTURE_MODE: 'false',
    SHOP_API_URL: ready.endpoint + '/shop-api',
    HOST: '127.0.0.1',
    PORT: '4336',
  });
  astroExit = exitOf(astro);
  astro.stdout!.pipe(process.stdout);
  astro.stderr!.pipe(process.stderr);
  let started = false;
  for (let i = 0; i < 100; i++) {
    try {
      const status = await new Promise<number>((r, j) => {
        const req = httpRequest(
          'http://127.0.0.1:4336/',
          { headers: { Host: 'vendor-a.localhost:4336' } },
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
  assert.ok(started, 'Real production Astro SSR must start');
  const browser = child(
    [
      join(frontend, 'node_modules/@playwright/test/cli.js'),
      'test',
      '--config',
      'playwright.storefront-live.config.ts',
    ],
    frontend,
    { FRONTEND_STOREFRONT_READY: readyPath },
  );
  browser.stdout!.pipe(process.stdout);
  browser.stderr!.pipe(process.stderr);
  pass = (await exitOf(browser)) === 0;
} finally {
  if (astro) {
    astro.kill();
    await astroExit;
  }
  if (server.exitCode === null)
    server.stdin!.end(pass ? 'finish\n' : 'failed\n');
  const code = await backendExit;
  if (pass && code === 0) {
    assert.ok(
      relative(
        join(backend, 'test/frontend-integration/.runtime'),
        runtime,
      ).startsWith('storefront-'),
    );
    rmSync(runtime, { recursive: true });
    console.log(
      'REAL FULL-STACK PASS. Fixture mode OFF. Owned disposable database dropped. No checkout/provider use.',
    );
  } else process.exitCode = 1;
}
