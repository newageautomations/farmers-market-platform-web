import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
} from 'node:fs';
import { createInterface } from 'node:readline';
import { createServer } from 'node:net';
import { posBrowserChecks } from './in-person-browser';
import { squareBrowserChecks } from './square-browser';
import { cloverBrowserChecks } from './clover-browser';
export interface PosReady {
  kind: string;
  database: string;
  endpoint: string;
  shopEndpoint: string;
  password: string;
  vendors: string[];
  vendorChannels: string[];
  customers: Array<{ id: string; email: string; phone: string | null }>;
  occurrenceId: string;
  variants: string[];
  largeVariant: string;
  bridgeKey: string;
  admin: string;
  accountOrigin?: string;
  seededSales?: {
    vendor: string;
    orderId: string;
    orderCode: string;
    method: string;
  }[];
}
const backend = resolve('../farmers-market-platform'),
  requestedMode = process.argv[2] ?? 'serve',
  mode = ['square-stop', 'clover-stop', 'mobile-stop', 'loyalty-stop'].includes(
    requestedMode,
  )
    ? 'stop'
    : [
          'square-fixtures',
          'square-browser',
          'mobile-fixtures',
          'mobile-sandbox',
          'mobile-browser',
          'clover-fixtures',
          'clover-browser',
          'clover-sandbox-demo',
          'loyalty-fixtures',
          'loyalty-browser',
        ].includes(requestedMode)
      ? 'serve'
      : requestedMode,
  children: ChildProcess[] = [],
  loyaltyRequested = requestedMode.startsWith('loyalty'),
  squareRequested =
    requestedMode.startsWith('square') ||
    process.env.SQUARE_SANDBOX_OPT_IN === 'true',
  cloverRequested = requestedMode.startsWith('clover'),
  mobileRequested = requestedMode.startsWith('mobile'),
  storefrontPort = Number(
    process.env.POS_DEMO_STOREFRONT_PORT ??
      (loyaltyRequested
        ? 4376
        : mobileRequested
          ? 4374
          : cloverRequested
            ? 4372
            : squareRequested
              ? 4370
              : 4368),
  ),
  adminPort = Number(
    process.env.POS_DEMO_ADMIN_PORT ??
      (loyaltyRequested
        ? 4594
        : mobileRequested
          ? 4592
          : cloverRequested
            ? 4590
            : squareRequested
              ? 4588
              : 4586),
  ),
  runtime = resolve(
    loyaltyRequested
      ? '.pos-stage-g-demo'
      : requestedMode === 'test'
        ? '.pos-browser-test'
        : mobileRequested
          ? '.pos-stage-e-demo'
          : cloverRequested
            ? '.pos-stage-d-demo'
            : squareRequested
              ? '.pos-stage-c-demo'
              : '.pos-stage-b-demo',
  ),
  manifest = resolve(runtime, 'ready.json');
function child(
  cwd: string,
  args: string[],
  env: Record<string, string> = {},
  ipc = false,
) {
  const childEnv = { ...process.env, ...env };
  if (cwd !== backend)
    for (const key of Object.keys(childEnv))
      if (key.startsWith('SQUARE_') || key.startsWith('CLOVER_'))
        delete childEnv[key];
  const processChild = spawn(process.execPath, args, {
    cwd,
    windowsHide: true,
    env: {
      ...childEnv,
      FRONTEND_NO_EVIDENCE: 'true',
      DB_HOST: '127.0.0.1',
    },
    stdio: ipc ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
  });
  children.push(processChild);
  processChild.stdout?.pipe(process.stdout);
  processChild.stderr?.pipe(process.stderr);
  return processChild;
}
if (mode === 'clover-audit' || mode === 'loyalty-audit') {
  const ready = JSON.parse(readFileSync(manifest, 'utf8')) as PosReady;
  assert.match(ready.database, /^vendure_test_pos_demo_\d+_[a-f0-9]+$/);
  const audit = child(
    backend,
    [
      '--require',
      './test/no-evidence.cjs',
      resolve(backend, 'node_modules/ts-node/dist/bin.js'),
      '--project',
      'test/in-person/tsconfig.json',
      mode === 'loyalty-audit'
        ? 'test/in-person/stage-g-audit.ts'
        : 'test/in-person/clover-audit.ts',
    ],
    mode === 'loyalty-audit'
      ? { POS_STAGE_G_AUDIT_DATABASE: ready.database }
      : { POS_CLOVER_AUDIT_DATABASE: ready.database },
  );
  process.exitCode = await new Promise<number>((r) =>
    audit.once('exit', (code) => r(code ?? 1)),
  );
} else if (mode === 'stop') {
  assert.ok(existsSync(manifest), 'No disposable POS demo manifest exists');
  const ready = JSON.parse(readFileSync(manifest, 'utf8')) as PosReady;
  assert.match(ready.database, /^vendure_test_pos_demo_\d+_[a-f0-9]+$/);
  assert.match(ready.admin, /^http:\/\/localhost:[1-9]\d{3,4}$/);
  writeFileSync(resolve(runtime, `${ready.database}.stop`), ready.database);
  console.log(
    'Requested graceful stop of the owning disposable POS demo. No other environment is targeted.',
  );
} else if (
  mode === 'backend' ||
  mode === 'payments' ||
  mode === 'square' ||
  mode === 'square-sandbox' ||
  mode === 'clover' ||
  mode === 'clover-sandbox'
) {
  const processChild = child(backend, [
    '--require',
    './test/no-evidence.cjs',
    resolve(backend, 'node_modules/ts-node/dist/bin.js'),
    '--project',
    'test/in-person/tsconfig.json',
    mode === 'clover'
      ? 'test/in-person/clover.ts'
      : mode === 'clover-sandbox'
        ? 'test/in-person/clover-sandbox.ts'
        : mode === 'square-sandbox'
          ? 'test/in-person/square-sandbox.ts'
          : mode === 'square'
            ? 'test/in-person/square.ts'
            : mode === 'payments'
              ? 'test/in-person/payments.ts'
              : 'test/in-person/run.ts',
  ]);
  process.exitCode = await new Promise<number>((r) =>
    processChild.once('exit', (code) => r(code ?? 1)),
  );
} else {
  assert.ok(
    ['serve', 'test'].includes(mode),
    'Use serve, stop, test, backend or payments',
  );
  for (const port of [storefrontPort, adminPort])
    assert.ok(
      Number.isInteger(port) && port >= 1024 && port <= 65535,
      'Invalid disposable POS port',
    );
  for (const port of [storefrontPort, adminPort])
    for (const host of ['127.0.0.1', '::1'])
      await new Promise<void>((accept, reject) => {
        const server = createServer();
        server.once('error', reject);
        server.listen(port, host, () =>
          server.close((error) => (error ? reject(error) : accept())),
        );
      });
  const server = child(
    backend,
    [
      '--require',
      './test/no-evidence.cjs',
      resolve(backend, 'node_modules/ts-node/dist/bin.js'),
      '--project',
      'test/in-person/tsconfig.json',
      'test/in-person/demo.ts',
    ],
    {
      POS_DEMO_ADMIN_PORT: String(adminPort),
      POS_DEMO_STOREFRONT_PORT: String(storefrontPort),
      ...(loyaltyRequested
        ? {
            POS_STAGE_G_DEMO: 'true',
            CLOVER_FIXTURE_MODE: 'true',
            SQUARE_FIXTURE_MODE: 'true',
            POS_NATIVE_MOBILE_MODE: 'controlled',
            POS_NATIVE_CONTROL_DIR: runtime,
          }
        : {}),
      ...(mobileRequested
        ? {
            POS_NATIVE_MOBILE_MODE:
              requestedMode === 'mobile-sandbox' ? 'sandbox' : 'controlled',
            POS_NATIVE_CONTROL_DIR: runtime,
          }
        : {}),
      ...([
        'square-fixtures',
        'square-browser',
        'mobile-fixtures',
        'mobile-browser',
      ].includes(requestedMode)
        ? { SQUARE_FIXTURE_MODE: 'true' }
        : {}),
      ...(['clover-fixtures', 'clover-browser'].includes(requestedMode)
        ? { CLOVER_FIXTURE_MODE: 'true', SQUARE_FIXTURE_MODE: 'true' }
        : {}),
      ...(requestedMode === 'clover-sandbox-demo'
        ? { CLOVER_SANDBOX_OPT_IN: 'true' }
        : {}),
    },
    true,
  );
  let ownedDatabase: string | null = null;
  try {
    const ready = await new Promise<PosReady>((accept, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Disposable POS seed timed out')),
        300000,
      );
      server.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error('POS seed exited ' + code));
      });
      server.on('message', (value) => {
        if (
          value &&
          typeof value === 'object' &&
          'kind' in value &&
          value.kind === 'ready'
        ) {
          clearTimeout(timeout);
          accept(value as PosReady);
        }
      });
    });
    assert.match(ready.database, /^vendure_test_pos_demo_\d+_[a-f0-9]+$/);
    ownedDatabase = ready.database;
    mkdirSync(runtime, { recursive: true });
    writeFileSync(manifest, JSON.stringify(ready, null, 2));
    const env = {
      APP_ENV: 'test',
      NODE_ENV: 'test',
      FRONTEND_FIXTURE_MODE: 'false',
      SHOP_API_URL: ready.shopEndpoint,
      PUBLIC_ADMIN_API_URL: ready.endpoint.replace('127.0.0.1', 'localhost'),
      PLATFORM_ACCOUNT_ORIGIN: `http://auth.platform.localhost:${storefrontPort}`,
      ADMIN_ORIGIN: ready.admin,
      PLATFORM_ACCOUNT_BRIDGE_KEY: ready.bridgeKey,
    };
    child(
      resolve('apps/storefront'),
      [
        '--input-type=module',
        '--eval',
        `import {dev} from 'astro';await dev({server:{host:'127.0.0.1',port:${storefrontPort}}});`,
      ],
      env,
    );
    child(
      resolve('apps/admin'),
      [
        resolve('node_modules/vite/bin/vite.js'),
        '--host',
        'localhost',
        '--port',
        String(adminPort),
        '--strictPort',
      ],
      env,
    );
    async function healthy(url: string) {
      for (let i = 0; i < 120; i++) {
        try {
          if ((await fetch(url)).ok) return;
        } catch {
          /* startup */
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      throw new Error('Service failed to start: ' + url);
    }
    await Promise.all([
      healthy(ready.admin),
      healthy(`http://127.0.0.1:${storefrontPort}/robots.txt`),
    ]);
    console.log(
      `POS disposable demo ready\nRegister: ${ready.admin}/vendor/pos?channel=${ready.vendorChannels[0]}\nCentral login: ${ready.accountOrigin}/account/login\nVendors: ${ready.vendors.join(', ')}\nPassword: ${ready.password}\nCustomers: ${ready.customers.map((c) => c.email + (c.phone ? ' / ' + c.phone : '')).join(', ')}\nDatabase: ${ready.database}\nManifest: ${manifest}\nPress Enter or Ctrl+C to stop and remove only this process's disposable database. Restart for fresh data.`,
    );
    if (requestedMode === 'loyalty-browser') {
      const { stageGBrowserChecks } = await import('./stage-g-browser');
      await stageGBrowserChecks(ready);
      const audit = child(
        backend,
        [
          '--require',
          './test/no-evidence.cjs',
          resolve(backend, 'node_modules/ts-node/dist/bin.js'),
          '--project',
          'test/in-person/tsconfig.json',
          'test/in-person/stage-g-audit.ts',
        ],
        { POS_STAGE_G_AUDIT_DATABASE: ready.database },
      );
      assert.equal(
        await new Promise<number>((r) =>
          audit.once('exit', (code) => r(code ?? 1)),
        ),
        0,
        'Stage G read-only native ledger audit',
      );
    } else if (requestedMode === 'mobile-browser') {
      const { mobileBrowserChecks } = await import('./mobile-browser');
      await mobileBrowserChecks(ready);
    } else if (requestedMode === 'clover-browser') {
      await cloverBrowserChecks(ready);
      await squareBrowserChecks(ready);
      const audit = child(
        backend,
        [
          '--require',
          './test/no-evidence.cjs',
          resolve(backend, 'node_modules/ts-node/dist/bin.js'),
          '--project',
          'test/in-person/tsconfig.json',
          'test/in-person/clover-audit.ts',
        ],
        { POS_CLOVER_AUDIT_DATABASE: ready.database },
      );
      assert.equal(
        await new Promise<number>((r) =>
          audit.once('exit', (code) => r(code ?? 1)),
        ),
        0,
        'Clover native read-only audit',
      );
    } else if (requestedMode === 'square-browser')
      await squareBrowserChecks(ready);
    else if (mode === 'test') await posBrowserChecks(ready);
    else {
      const input = createInterface({ input: process.stdin });
      const stopFile = resolve(runtime, `${ready.database}.stop`);
      let stopTimer: ReturnType<typeof setInterval>;
      await new Promise<void>((r) => {
        stopTimer = setInterval(() => {
          if (
            existsSync(stopFile) &&
            readFileSync(stopFile, 'utf8') === ready.database
          )
            r();
        }, 500);
        input.once('line', () => r());
        input.once('close', () => r());
        process.once('SIGINT', () => r());
        process.once('SIGTERM', () => r());
      });
      clearInterval(stopTimer!);
      if (existsSync(stopFile)) unlinkSync(stopFile);
      input.close();
    }
  } finally {
    for (const processChild of children.filter((c) => c !== server))
      processChild.kill();
    if (server.exitCode === null) {
      server.stdin?.write('finish\n');
      await new Promise<void>((r) => {
        server.once('exit', () => r());
        setTimeout(() => {
          server.kill();
          r();
        }, 20000).unref();
      });
    }
    if (existsSync(manifest)) {
      const current = JSON.parse(readFileSync(manifest, 'utf8')) as PosReady;
      // Preserve another supervisor's newer manifest if its owner has already replaced this one.
      if (current.database === ownedDatabase) unlinkSync(manifest);
    }
  }
}
