import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';

const root = process.cwd(),
  backend = resolve(root, '../farmers-market-platform');
const runtime = resolve(root, '.runtime/customer-dashboard');
const action = process.argv[2] ?? 'test';
const port = process.env.CUSTOMER_DASHBOARD_PORT ?? '4347';
const requireBackend = createRequire(join(backend, 'package.json'));
interface Ready {
  endpoint: string;
  database: string;
  bridgeKey: string;
  controlUrl: string;
  controlKey: string;
  email: string;
  password: string;
  port: number;
  accountUrl: string;
  marketUrl: string;
  vendorUrl: string;
}
function ready() {
  const data = JSON.parse(
    readFileSync(join(runtime, 'ready.json'), 'utf8'),
  ) as Ready;
  assert.match(data.database, /^vendure_test_customer_dash_[a-z0-9_]+$/);
  assert.equal(new URL(data.endpoint).hostname, '127.0.0.1');
  assert.equal(new URL(data.controlUrl).hostname, '127.0.0.1');
  return data;
}
function start(args: string[], cwd: string, env: Record<string, string> = {}) {
  return spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}
function exit(child: ChildProcess) {
  return new Promise<number>((r, j) => {
    child.once('exit', (c) => r(c ?? 1));
    child.once('error', j);
  });
}
async function command(
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
) {
  const child = start(args, cwd, env),
    done = exit(child);
  child.stdout!.pipe(process.stdout);
  child.stderr!.pipe(process.stderr);
  assert.equal(await done, 0, args.join(' '));
}
if (['reset', 'verify', 'cleanup'].includes(action)) {
  const data = ready();
  const response = await fetch(
    data.controlUrl +
      { reset: '/reset', verify: '/assert', cleanup: '/finish' }[action],
    { method: 'POST', headers: { 'x-fixture-key': data.controlKey } },
  );
  assert.ok(response.ok, 'The running local fixture must accept this action');
  if (action === 'reset') {
    const updated = (await response.json()) as Ready;
    console.log(
      `New clean test customer: ${updated.email}\nDevelopment password: ${updated.password}\nSign out, then sign in at ${updated.accountUrl}. Previous test purchases are preserved.`,
    );
  } else
    console.log(
      action === 'verify'
        ? 'Three purchases, one followed market and three favorite vendors verified in the database.'
        : 'Stopping the scenario and cleaning up only its owned disposable database.',
    );
} else {
  assert.ok(
    ['test', 'start', 'backend'].includes(action),
    'Unknown customer dashboard command',
  );
  assert.notEqual(process.env.APP_ENV, 'production');
  assert.notEqual(process.env.NODE_ENV, 'production');
  assert.ok(
    Number.isSafeInteger(Number(port)) &&
      Number(port) > 0 &&
      Number(port) <= 65535,
    'Choose a valid local port',
  );
  if (action !== 'backend')
    await new Promise<void>((resolvePort, rejectPort) => {
      const probe = createServer();
      probe.once('error', () =>
        rejectPort(
          new Error(
            `Port ${port} is already in use. Reuse the running scenario, or choose CUSTOMER_DASHBOARD_PORT.`,
          ),
        ),
      );
      probe.listen(Number(port), '127.0.0.1', () =>
        probe.close(() => resolvePort()),
      );
    });
  mkdirSync(runtime, { recursive: true });
  const server = start(
    [
      requireBackend.resolve('ts-node/dist/bin.js'),
      '--project',
      'test/frontend-integration/tsconfig.json',
      'test/frontend-integration/customer-dashboard-run.ts',
      ...(action === 'backend' ? ['--check'] : []),
    ],
    backend,
    {
      NODE_ENV: 'test',
      CUSTOMER_DASHBOARD_RUNTIME: runtime,
      CUSTOMER_DASHBOARD_PORT: port,
    },
  );
  const done = exit(server);
  let astro: ChildProcess | undefined,
    passed = false;
  try {
    if (action === 'backend') {
      server.stdout!.pipe(process.stdout);
      server.stderr!.pipe(process.stderr);
      assert.equal(await done, 0);
      passed = true;
    } else {
      await new Promise<void>((r, j) => {
        let output = '';
        const timer = setTimeout(
          () => j(new Error('Customer scenario startup timed out')),
          240000,
        );
        server.stdout!.on('data', (b) => {
          process.stdout.write(b);
          output += String(b);
          if (output.includes('CUSTOMER_DASHBOARD_READY')) {
            clearTimeout(timer);
            r();
          }
        });
        server.stderr!.pipe(process.stderr);
        done.then((c) => {
          clearTimeout(timer);
          j(new Error(`Backend exited ${c} before scenario readiness`));
        });
      });
      const data = ready();
      const env = {
        APP_ENV: 'dev',
        NODE_ENV: 'test',
        FRONTEND_FIXTURE_MODE: 'false',
        SHOP_API_URL: data.endpoint + '/shop-api',
        PUBLIC_ADMIN_API_URL: data.endpoint + '/admin-api',
        PLATFORM_ACCOUNT_ORIGIN: `http://auth.platform.localhost:${port}`,
        PLATFORM_ACCOUNT_BRIDGE_KEY: data.bridgeKey,
        ASTRO_TELEMETRY_DISABLED: '1',
      };
      await command(
        [join(root, 'node_modules/astro/bin/astro.mjs'), 'build'],
        join(root, 'apps/storefront'),
        env,
      );
      astro = start(['apps/storefront/dist/server/entry.mjs'], root, {
        ...env,
        HOST: '127.0.0.1',
        PORT: port,
      });
      const astroDone = exit(astro);
      astro.stdout!.pipe(process.stdout);
      astro.stderr!.pipe(process.stderr);
      let running = false;
      for (let i = 0; i < 100; i++) {
        try {
          if (
            (
              await fetch(`http://127.0.0.1:${port}/account/login`, {
                headers: { Host: `auth.platform.localhost:${port}` },
              })
            ).ok
          ) {
            running = true;
            break;
          }
        } catch {
          /* wait for owned server */
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.ok(running, 'Real Astro SSR must start');
      if (action === 'test') {
        await command(
          [
            join(root, 'node_modules/@playwright/test/cli.js'),
            'test',
            '--config',
            'playwright.customer-dashboard.config.ts',
          ],
          root,
          {
            CUSTOMER_DASHBOARD_READY: join(runtime, 'ready.json'),
            CUSTOMER_DASHBOARD_PORT: port,
          },
        );
        server.stdin!.write('finish\n');
        assert.equal(await done, 0);
        passed = true;
      } else {
        console.log(
          `\nCustomer dashboard scenario ready\nLogin: ${data.accountUrl}\nCustomer: ${data.email}\nDevelopment password: ${data.password}\nMarket Alpha: ${data.marketUrl}\nVendor C: ${data.vendorUrl}\n\nUse npm run demo:customer:reset for a new clean customer, demo:customer:verify after three purchases, and demo:customer:cleanup to finish. Keep this terminal open.`,
        );
        const code = await Promise.race([done, astroDone.then(() => 1)]);
        assert.equal(code, 0);
        passed = true;
      }
    }
  } finally {
    astro?.kill();
    if (server.exitCode === null) {
      server.stdin!.write(passed ? 'finish\n' : 'failed\n');
      await done;
    }
  }
}
