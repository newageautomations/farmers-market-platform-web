import assert from 'node:assert/strict';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createServer, request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { chromium, firefox, webkit, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { syntheticProductionEnvironment } from './production-hardening-environment';

assert.equal(
  process.env.FRONTEND_NO_EVIDENCE,
  'true',
  'No evidence is required',
);
if (process.argv.includes('--deliberate-500-only')) {
  const { qualifyDeliberate500 } = await import('./test-production-500');
  await qualifyDeliberate500();
  process.exit(process.exitCode ?? 0);
}
const front = process.cwd(),
  back = resolve('../farmers-market-platform');
const requireBack = createRequire(join(back, 'package.json'));
// Parent-side Playwright API requests share the same loopback-only DNS/network boundary.
createRequire(import.meta.url)('./production-hardening-network.cjs');
const tmp = mkdtempSync(join(front, '.phase13h-tmp-'));
const env = syntheticProductionEnvironment();
const databaseEnv = requireBack('dotenv').parse(
  readFileSync(join(back, '.env')),
) as Record<string, string>;
for (const key of ['DB_USERNAME', 'DB_PASSWORD', 'DB_PORT'])
  if (databaseEnv[key]) env[key] = databaseEnv[key];
const children: ChildProcess[] = [];
const captured: string[] = [];
const outcomes: Array<{ gate: string; status: string; detail: string }> = [];
let seed: ChildProcess | undefined;
let proxy: ReturnType<typeof createServer> | undefined;
let success = false;
const exit = (child: ChildProcess) =>
  new Promise<number>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null)
      resolve(child.exitCode ?? 1);
    else child.once('exit', (code) => resolve(code ?? 1));
  });
function launch(
  args: string[],
  cwd: string,
  environment: Record<string, string>,
) {
  const child = spawn(process.execPath, ['--expose-gc', ...args], {
    cwd,
    windowsHide: true,
    env: { ...process.env, ...environment },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });
  children.push(child);
  for (const stream of [child.stdout, child.stderr])
    stream!.on('data', (data) => {
      // Captured in memory only, never dump provider bodies, capabilities, or environment values.
      captured.push(String(data));
    });
  return child;
}
async function stop(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      exit(child),
      new Promise<never>(
        (_, reject) =>
          (timer = setTimeout(
            () => reject(new Error('Shutdown exceeded local bound')),
            35000,
          )),
      ),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
type Ready = {
  database: string;
  magicUrl: string;
  backup: string;
  ids: Record<string, string | string[]>;
  channels: Array<{ id: string; token: string }>;
  marketChannels: Array<{ id: string; token: string }>;
};
function wire(
  url: string,
  headers: Record<string, string> = {},
  body?: string,
  method?: string,
  insecure = false,
) {
  const parsed = new URL(url);
  return new Promise<{
    status: number;
    headers: import('node:http').IncomingHttpHeaders;
    text: string;
  }>((resolve, reject) => {
    const req = (insecure ? httpRequest : httpsRequest)(
      {
        host: '127.0.0.1',
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        servername: parsed.hostname,
        rejectUnauthorized: false,
        method: method ?? (body ? 'POST' : 'GET'),
        headers: { host: parsed.host, ...headers },
        timeout: 10000,
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => {
          text += String(chunk);
        });
        res.on('end', () =>
          resolve({ status: res.statusCode!, headers: res.headers, text }),
        );
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Request deadline')));
    req.end(body);
  });
}
async function check(gate: string, action: () => Promise<string | void>) {
  try {
    const detail = await action();
    outcomes.push({
      gate,
      status: 'PASS',
      detail: detail ?? 'assertions passed',
    });
    console.log(`PASS ${gate}${detail ? ': ' + detail : ''}`);
  } catch (error) {
    console.error(
      'Assertion category: ' +
        (error instanceof Error ? error.name : 'Unknown'),
    );
    if (error instanceof Error)
      for (const code of [
        'ENOTFOUND',
        'ECONNREFUSED',
        'ERR_CERT',
        'Timeout',
        'CERT_HAS_EXPIRED',
      ])
        if (error.message.includes(code))
          console.error('Transport category: ' + code);
    outcomes.push({ gate, status: 'FAIL', detail: 'Local assertion failed' });
    throw new Error(`Hardening gate failed: ${gate}`);
  }
}
async function waitReady() {
  for (let i = 0; i < 160; i++) {
    try {
      if ((await wire(env.API_ORIGIN + '/health/ready')).status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Production backend readiness timeout');
}
async function databaseAction(type: string) {
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      seed!.off('message', listener);
      reject(new Error('Database control deadline'));
    }, 15000);
    const listener = (message: { type: string; count: number }) => {
      if (message.type === type) {
        clearTimeout(timer);
        seed!.off('message', listener);
        resolve(message.count);
      }
    };
    seed!.on('message', listener);
    seed!.send({ type });
  });
}
async function databaseState() {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      seed!.off('message', listener);
      reject(new Error('State check deadline'));
    }, 15000);
    const listener = (message: { type: string; hash: string }) => {
      if (message.type === 'database-state') {
        clearTimeout(timer);
        seed!.off('message', listener);
        resolve(message.hash);
      }
    };
    seed!.on('message', listener);
    seed!.send({ type: 'database-state' });
  });
}
async function memory(child: ChildProcess) {
  return new Promise<{ heapUsed: number; rss: number }>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off('message', listener);
      reject(new Error('Memory probe deadline'));
    }, 10000);
    const listener = (message: {
      type: string;
      pid: number;
      heapUsed: number;
      rss: number;
    }) => {
      if (message.type === 'phase13h-memory' && message.pid === child.pid) {
        clearTimeout(timer);
        child.off('message', listener);
        resolve(message);
      }
    };
    child.on('message', listener);
    child.send({ type: 'phase13h-memory' });
  });
}
try {
  await promisify(execFile)('C:/msys64/mingw64/bin/openssl.exe', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    join(tmp, 'key.pem'),
    '-out',
    join(tmp, 'cert.pem'),
    '-days',
    '1',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:*.localhost,DNS:*.platform.localhost,DNS:localhost,IP:127.0.0.1',
  ]);
  const preload = [
    resolve('scripts/production-hardening-network.cjs'),
    resolve('scripts/playwright-no-evidence.cjs'),
    join(back, 'test/frontend-integration/regression-no-evidence.cjs'),
  ]
    .map((path) => `--require="${path.replaceAll('\\', '/')}"`)
    .join(' ');
  Object.assign(env, {
    NODE_OPTIONS: preload,
    NODE_EXTRA_CA_CERTS: join(tmp, 'cert.pem'),
    SERVER_KEY_PATH: join(tmp, 'key.pem'),
    SERVER_CERT_PATH: join(tmp, 'cert.pem'),
    PORT: '4342',
    ASSET_UPLOAD_DIR: join(tmp, 'assets'),
    ANALYTICS_ENABLED: 'true',
    HTTP_REQUEST_TIMEOUT_MS: '30000',
    HTTP_HEADERS_TIMEOUT_MS: '15000',
  });
  await check('invalid production startup exits safely', async () => {
    const unsafeConfigurations: Record<string, string>[] = [
      { COOKIE_SECRET: '' },
      { PLATFORM_ACCOUNT_BRIDGE_KEY: 'example-secret-value' },
      { FRONTEND_FIXTURE_MODE: 'true' },
      { ENABLE_LOCAL_VERIFIED_CHECKOUT: 'true' },
      { PLATFORM_ACCOUNT_ORIGIN: 'http://auth.platform.localhost:4340' },
    ];
    for (const change of unsafeConfigurations) {
      const invalid = launch(['dist/index.js'], back, { ...env, ...change });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        assert.notEqual(
          await Promise.race([
            exit(invalid),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('Invalid startup did not exit')),
                10000,
              );
            }),
          ]),
          0,
        );
      } finally {
        clearTimeout(timer);
        await stop(invalid);
      }
    }
  });
  seed = launch(
    [
      requireBack.resolve('ts-node/dist/bin.js'),
      '--project',
      'test/frontend-integration/tsconfig.json',
      'test/production-hardening/seed.ts',
    ],
    back,
    { ...env, APP_ENV: 'test', NODE_ENV: 'test' },
  );
  const ready = await new Promise<Ready>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Seed timeout')), 240000);
    seed!.on('message', (message: { type: string; ready: Ready }) => {
      if (message.type === 'ready') {
        clearTimeout(timer);
        resolve(message.ready);
      }
    });
    seed!.once('exit', () => {
      clearTimeout(timer);
      reject(new Error('Seed failed'));
    });
    seed!.stderr!.on('data', (data) => {
      if (String(data).includes('PRODUCTION_HARDENING_SEED_FAILED')) {
        clearTimeout(timer);
        reject(new Error('Seed failed'));
      }
    });
  });
  assert.match(ready.database, /^vendure_test_/);
  assert.notEqual(ready.database, 'vendure');
  env.DB_NAME = ready.database;
  outcomes.push({
    gate: 'backup/restore',
    status: ready.backup,
    detail:
      'Disposable source restored into new disposable target; representative table equality',
  });
  console.log(`${ready.backup} backup/restore`);
  const backendEnv = {
    ...env,
    TRUSTED_PROXY_CIDRS: '127.0.0.2/32',
    SERVER_KEY_PATH: '',
    SERVER_CERT_PATH: '',
  };
  let server = launch(['dist/index.js'], back, backendEnv);
  let worker = launch(['dist/index-worker.js'], back, backendEnv);
  const certificate = {
    key: readFileSync(join(tmp, 'key.pem')),
    cert: readFileSync(join(tmp, 'cert.pem')),
  };
  proxy = createServer(certificate, (req, res) => {
    // Overwrite every forwarded value. The application trusts this exact synthetic peer only.
    const headers = {
      ...req.headers,
      'x-forwarded-proto': 'https',
      'x-forwarded-host': req.headers.host,
      'x-forwarded-for': req.socket.remoteAddress,
    };
    delete headers.forwarded;
    const upstream = httpRequest(
      {
        host: '127.0.0.1',
        port: 4342,
        localAddress: '127.0.0.2',
        path: req.url,
        method: req.method,
        headers,
      },
      (reply) => {
        res.writeHead(reply.statusCode!, reply.headers);
        reply.pipe(res);
      },
    );
    upstream.on('error', () => {
      res.writeHead(503, { 'Cache-Control': 'private, no-store' });
      res.end('Temporarily unavailable');
    });
    req.pipe(upstream);
  });
  await new Promise<void>((resolve, reject) => {
    proxy!.once('error', reject);
    proxy!.listen(4343, '127.0.0.1', resolve);
  });
  await waitReady();
  await check('built server and worker start', async () => {
    for (
      let i = 0;
      i < 160 && !captured.join('').includes('worker_started');
      i++
    )
      await new Promise((r) => setTimeout(r, 250));
    assert.ok(captured.join('').includes('worker_started'));
    assert.equal(
      (await wire(env.API_ORIGIN + '/health/live')).text,
      '{"status":"live"}',
    );
  });
  // Production builds receive the same explicit validation policy, with no local payment adapter.
  for (const [cwd, args] of [
    [
      join(front, 'apps/storefront'),
      [join(front, 'node_modules/astro/bin/astro.mjs'), 'build'],
    ],
    [
      join(front, 'apps/admin'),
      [join(front, 'node_modules/vite/bin/vite.js'), 'build'],
    ],
  ] as const) {
    const build = launch([...args], cwd, {
      ...env,
      TRUSTED_PROXY_CIDRS: 'disabled',
    });
    assert.equal(await exit(build), 0, 'Production frontend build');
  }
  const storefront = launch(
    ['--import', 'tsx', 'scripts/start-storefront.ts'],
    front,
    {
      ...env,
      PORT: '4340',
      HOST: '127.0.0.1',
      TRUSTED_PROXY_CIDRS: 'disabled',
    },
  );
  const admin = launch(['--import', 'tsx', 'scripts/serve-admin.ts'], front, {
    ...env,
    ADMIN_PORT: '4341',
    TRUSTED_PROXY_CIDRS: 'disabled',
  });
  const vendor = 'https://vendor-a.localhost:4340',
    market = 'https://market-a.localhost:4340',
    marketB = 'https://market-b.localhost:4340';
  for (let i = 0; i < 80; i++) {
    try {
      if (
        (await wire(vendor)).status === 200 &&
        (await wire(env.ADMIN_ORIGIN)).status === 200
      )
        break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  await check('HTTPS canonical and safe unknown tenant', async () => {
    const malformed = await wire(vendor + '/%ZZ');
    assert.equal(malformed.status, 400);
    assert.equal(malformed.headers['x-content-type-options'], 'nosniff');
    assert.match(malformed.headers['cache-control']!, /no-store/);
    assert.ok(malformed.headers['content-security-policy']);
    for (const host of ['[', 'vendor-a.localhost:4340@evil.invalid']) {
      const invalidHost = await wire(vendor, { host });
      assert.equal(invalidHost.status, 400);
      assert.ok(invalidHost.headers['x-request-id']);
      assert.ok(!invalidHost.text.includes('TypeError'));
    }
    for (const origin of [vendor, market]) {
      const r = await wire(origin);
      console.log(
        'HTTPS route probe: status=' +
          r.status +
          ', canonical=' +
          r.text.includes(origin + '/') +
          ', csp=' +
          !!r.headers['content-security-policy'],
      );
      assert.equal(r.status, 200);
      assert.ok(r.text.includes(origin + '/'));
      assert.ok(r.headers['content-security-policy']);
    }
    const unknown = await wire('https://unknown.localhost:4340');
    console.log('Unknown tenant probe: status=' + unknown.status);
    assert.equal(unknown.status, 404);
    assert.ok(!unknown.text.includes('rel="canonical"'));
  });
  await check('untrusted forwarding and HTTP rejection', async () => {
    const r = await wire(
      'http://api.platform.localhost:4342/admin-api',
      { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'victim.example' },
      '{}',
      undefined,
      true,
    );
    assert.equal(r.status, 400);
    assert.equal(r.headers['set-cookie'], undefined);
    const host = await wire(env.API_ORIGIN + '/admin-api', {
      host: 'victim.example',
    });
    assert.equal(host.status, 421);
  });
  await check('Admin CORS/preflight and evil origins', async () => {
    const good = await wire(
      env.API_ORIGIN + '/admin-api',
      {
        origin: env.ADMIN_ORIGIN,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
      undefined,
      'OPTIONS',
    );
    assert.equal(good.status, 204);
    assert.equal(good.headers['access-control-allow-origin'], env.ADMIN_ORIGIN);
    for (const origin of [
      'https://admin.platform.localhost.evil.com:4341',
      'https://eviladmin.platform.localhost:4341',
      'https://admin.platform.localhost@evil.com',
      'null',
      'file://',
      'http://admin.platform.localhost:4341',
    ]) {
      const denied = await wire(
        env.API_ORIGIN + '/admin-api',
        { origin, 'access-control-request-method': 'POST' },
        undefined,
        'OPTIONS',
      );
      assert.ok(denied.status >= 400);
      assert.equal(
        denied.headers['access-control-allow-credentials'],
        undefined,
      );
    }
  });
  await check('stream body bound', async () => {
    const r = await wire(
      env.API_ORIGIN + '/admin-api',
      { origin: env.ADMIN_ORIGIN, 'content-type': 'application/json' },
      JSON.stringify({ query: ' '.repeat(110000) }),
    );
    assert.equal(r.status, 413);
  });
  await check('production debug surfaces disabled', async () => {
    assert.equal((await wire(env.API_ORIGIN + '/dashboard/')).status, 404);
    assert.equal(
      (await wire(env.API_ORIGIN + '/graphiql/admin-api')).status,
      404,
    );
    const response = await wire(
      env.API_ORIGIN + '/shop-api',
      { 'content-type': 'application/json' },
      JSON.stringify({ query: 'query { __schema { queryType { name } } }' }),
    );
    assert.ok(JSON.parse(response.text).errors?.length > 0);
    assert.ok(!/stacktrace|sqlstate|filesystem/i.test(response.text));
  });
  const executable = chromium.executablePath();
  assert.ok(existsSync(executable), 'Installed Chromium required');
  const browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP *.localhost 127.0.0.1'],
  });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
    const violations: string[] = [];
    page.on('requestfailed', (request) => {
      if (new URL(request.url()).pathname === '/api/account')
        console.log('Account navigation request failed');
    });
    page.on('console', (msg) => {
      if (
        /Content Security Policy|violates.*directive|Refused to execute/i.test(
          msg.text(),
        )
      )
        violations.push(msg.text());
    });
    await check('real HTTPS magic claim and bidirectional SSO', async () => {
      await page.goto(market + '/account/sign-in');
      console.log(
        'SSO stage: market-start, central=' +
          (new URL(page.url()).origin === env.PLATFORM_ACCOUNT_ORIGIN),
      );
      await page.goto(ready.magicUrl);
      console.log('SSO stage: claim-page, csp-violations=' + violations.length);
      const submitted = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/account',
      );
      await page.getByRole('button', { name: 'Access my orders' }).click();
      const claimResponse = await submitted;
      console.log(
        'SSO claim response status=' +
          claimResponse.status() +
          ', approved-origin=' +
          (claimResponse.request().headers().origin ===
            env.PLATFORM_ACCOUNT_ORIGIN),
      );
      console.log(
        'SSO stage: claim-submit, path=' +
          new URL(page.url()).pathname +
          ', csp-violations=' +
          violations.length,
      );
      await page.waitForURL(market + '/account');
      await page.goto(vendor + '/account/sign-in');
      await page.waitForURL(vendor + '/account');
      await page.goto(marketB + '/account/sign-in');
      await page.waitForURL(marketB + '/account');
      assert.ok(!page.url().includes('code='));
    });
    await check('secure host-only cookie isolation', async () => {
      const cookies = await context.cookies();
      const auth = cookies.filter((c) =>
        /session|platform-account|account-correlation/.test(c.name),
      );
      assert.ok(auth.length >= 4);
      for (const cookie of auth) {
        assert.equal(cookie.secure, true);
        assert.equal(cookie.httpOnly, true);
        assert.equal(cookie.sameSite, 'Lax');
        assert.ok(!cookie.domain.startsWith('.'));
      }
      const vendorCookies = await context.cookies(vendor),
        otherCookies = await context.cookies('https://vendor-b.localhost:4340');
      assert.ok(vendorCookies.some((c) => c.name === 'session'));
      assert.ok(!otherCookies.some((c) => c.name === 'session'));
      assert.ok(
        !(await context.cookies(env.PLATFORM_ACCOUNT_ORIGIN)).some(
          (c) => c.name === 'session',
        ),
      );
    });
    await check('real production Vendor cart mutation', async () => {
      await page.goto(vendor + '/products/vendor-a-harvest-box');
      await page
        .getByRole('button', { name: 'Add to cart', exact: true })
        .click();
      await page.getByText('Added to your cart.', { exact: false }).waitFor();
      await page.goto(vendor + '/cart');
      await page.getByRole('link', { name: 'Continue to checkout' }).waitFor();
    });
    await check('foreign SSO target and Storefront CSRF', async () => {
      await page.goto(
        env.PLATFORM_ACCOUNT_ORIGIN +
          '/account/sign-in?origin=' +
          encodeURIComponent('https://vendor-a.localhost.evil.com:4340'),
      );
      assert.ok(
        (await page.textContent('body'))!.includes('could not be completed'),
      );
      const before = await databaseState();
      for (const action of [
        'add',
        'checkout-begin',
        'communication-change',
        'logout',
      ]) {
        const denied = await wire(
          vendor + '/api/shop',
          {
            origin: 'https://evil.invalid',
            'content-type': 'application/json',
            cookie: (await context.cookies(vendor))
              .map((c) => c.name + '=' + c.value)
              .join('; '),
          },
          JSON.stringify({ action, storefrontId: '1' }),
        );
        assert.equal(denied.status, 403);
      }
      assert.equal(
        await databaseState(),
        before,
        'Denied requests cannot change permanent state',
      );
    });
    await check(
      'Admin login protected read/mutation and evil-origin denial',
      async () => {
        await page.goto(env.ADMIN_ORIGIN);
        await page.getByLabel('Email').fill(env.SUPERADMIN_USERNAME);
        await page.getByLabel('Password').fill(env.SUPERADMIN_PASSWORD);
        await page
          .getByRole('button', { name: 'Sign in', exact: true })
          .click();
        await page.getByRole('button', { name: 'Sign out' }).waitFor();
        const result = await page.evaluate(
          async ({ url, origin }) => {
            const response = await fetch(url, {
              method: 'POST',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                query:
                  'mutation { updateGlobalSettings(input:{trackInventory:true}) { __typename ... on GlobalSettings { id trackInventory } } }',
              }),
            });
            return {
              status: response.status,
              body: await response.json(),
              origin,
            };
          },
          { url: env.PUBLIC_ADMIN_API_URL, origin: env.ADMIN_ORIGIN },
        );
        console.log(
          'Admin mutation response status=' +
            result.status +
            ', error-codes=' +
            (result.body.errors ?? [])
              .map(
                (e: { extensions?: { code?: string } }) =>
                  e.extensions?.code ?? 'UNKNOWN',
              )
              .join(','),
        );
        assert.equal(result.status, 200);
        assert.ok(!result.body.errors);
        const before = await databaseState();
        const denied = await wire(
          env.PUBLIC_ADMIN_API_URL,
          {
            origin: 'https://evil.invalid',
            'content-type': 'application/json',
            cookie: (await context.cookies(env.API_ORIGIN))
              .map((c) => c.name + '=' + c.value)
              .join('; '),
          },
          JSON.stringify({
            query:
              'mutation { updateGlobalSettings(input:{trackInventory:false}) { __typename ... on GlobalSettings { id trackInventory } } }',
          }),
        );
        assert.equal(denied.status, 403);
        assert.equal(
          await databaseState(),
          before,
          'Denied Admin mutation cannot change permanent state',
        );
        const boundary = 'phase13h-upload-boundary';
        const operations = JSON.stringify({
          query:
            'mutation($input:[CreateAssetInput!]!){createAssets(input:$input){__typename ... on Asset{id name}}}',
          variables: { input: [{ file: null }] },
        });
        const upload = await wire(
          env.PUBLIC_ADMIN_API_URL,
          {
            origin: env.ADMIN_ORIGIN,
            'content-type': 'multipart/form-data; boundary=' + boundary,
            cookie: (await context.cookies(env.API_ORIGIN))
              .map((c) => c.name + '=' + c.value)
              .join('; '),
          },
          `--${boundary}\r\nContent-Disposition: form-data; name="operations"\r\n\r\n${operations}\r\n--${boundary}\r\nContent-Disposition: form-data; name="map"\r\n\r\n{"0":["variables.input.0.file"]}\r\n--${boundary}\r\nContent-Disposition: form-data; name="0"; filename="local-hardening.svg"\r\nContent-Type: image/svg+xml\r\n\r\n<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="green"/></svg>\r\n--${boundary}--\r\n`,
        );
        assert.equal(upload.status, 200);
        const uploaded = JSON.parse(upload.text);
        assert.ok(!uploaded.errors);
        assert.equal(uploaded.data.createAssets[0].__typename, 'Asset');
      },
    );
    await check('catalog XSS remains inert', async () => {
      await page.goto(vendor + '/products/vendor-a-harvest-box');
      assert.ok(
        (await page.locator('.product-description').textContent())!.includes(
          'inert catalog text',
        ),
      );
      assert.equal(await page.evaluate(() => '__phase13hXss' in window), false);
      assert.equal(
        await page.locator('[onerror], a[href^="javascript:"]').count(),
        0,
      );
    });
    await check('CSP private cache and security headers', async () => {
      for (const url of [
        vendor,
        market,
        vendor + '/cart',
        vendor + '/checkout',
        vendor + '/account',
        env.ADMIN_ORIGIN,
        env.ADMIN_ORIGIN + '/platform',
      ]) {
        const response = await page.goto(url);
        assert.ok(response);
        const headers = response!.headers();
        assert.match(headers['cache-control']!, /no-store/);
        assert.equal(headers['x-frame-options'], 'DENY');
        assert.ok(headers['content-security-policy']);
        assert.ok(!headers['content-security-policy']!.includes('unsafe-eval'));
        assert.ok(
          !headers['content-security-policy']!.includes(
            "script-src 'unsafe-inline'",
          ),
        );
      }
      assert.deepEqual(
        violations,
        [],
        'Critical routes must not have executable CSP violations',
      );
    });
    const audit = async (p: Page, url: string) => {
      await p.goto(url);
      const a = await new AxeBuilder({ page: p }).analyze();
      assert.equal(a.violations.length, 0, 'Axe violations');
    };
    await check('customer and Platform axe', async () => {
      for (const url of [
        vendor,
        market,
        vendor + '/cart',
        vendor + '/checkout',
        vendor + '/account',
        env.ADMIN_ORIGIN + '/platform',
        env.ADMIN_ORIGIN + '/platform/integrations',
        env.ADMIN_ORIGIN + '/platform/billing',
      ])
        await audit(page, url);
    });
    await check('responsive critical routes and keyboard', async () => {
      for (const width of [390, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (const url of [
          vendor,
          market,
          vendor + '/cart',
          vendor + '/checkout',
          vendor + '/account',
          env.ADMIN_ORIGIN + '/platform',
        ]) {
          await page.goto(url);
          if (new URL(url).origin === env.ADMIN_ORIGIN)
            await page.getByRole('button', { name: 'Sign out' }).waitFor();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          );
          if (overflow > 1)
            console.log(
              'Responsive overflow: width=' +
                width +
                ', path=' +
                new URL(url).pathname +
                ', pixels=' +
                overflow,
            );
          assert.ok(overflow <= 1, 'Page overflow');
          await page.locator('a[href], button').first().waitFor();
          await page.keyboard.press('Tab');
          assert.ok(
            await page.evaluate(() => document.activeElement !== document.body),
          );
        }
      }
    });
    await check('native and central session restart', async () => {
      await stop(server);
      server = launch(['dist/index.js'], back, backendEnv);
      await waitReady();
      await page.goto(vendor + '/account');
      assert.equal(new URL(page.url()).pathname, '/account');
      await page.goto(market + '/account/sign-in');
      await page.waitForURL(market + '/account');
      await page.goto(ready.magicUrl);
      await page.getByRole('button', { name: 'Access my orders' }).click();
      assert.ok((await page.textContent('body'))!.includes('unavailable'));
    });
    await check('authenticated read concurrency', async () => {
      let next = 0;
      await Promise.all(
        Array.from({ length: 5 }, async () => {
          for (;;) {
            const n = next++;
            if (n >= 30) break;
            const url =
              n % 3 === 0
                ? env.PUBLIC_ADMIN_API_URL
                : n % 3 === 1
                  ? vendor + '/account/orders'
                  : market + '/cart';
            const result = await wire(
              url,
              {
                cookie: (await context.cookies(url))
                  .map((c) => c.name + '=' + c.value)
                  .join('; '),
                ...(url === env.PUBLIC_ADMIN_API_URL
                  ? {
                      origin: env.ADMIN_ORIGIN,
                      'content-type': 'application/json',
                    }
                  : {}),
              },
              url === env.PUBLIC_ADMIN_API_URL
                ? JSON.stringify({
                    query:
                      'query { channels(options:{take:5}) { totalItems items { id } } }',
                  })
                : undefined,
            );
            assert.equal(result.status, 200);
            if (url === env.PUBLIC_ADMIN_API_URL)
              assert.ok(!JSON.parse(result.text).errors);
            assert.ok(!/SQLSTATE|stack trace|vendure_test_/i.test(result.text));
          }
        }),
      );
      return '30 real authenticated cart/account/Admin paged reads, five clients; no unexpected errors';
    });
    await check('bounded route switching memory', async () => {
      const inspector = await context.newCDPSession(page);
      await inspector.send('Performance.enable');
      const readHeap = async () => {
        await inspector.send('HeapProfiler.collectGarbage');
        const metrics = await inspector.send('Performance.getMetrics');
        return metrics.metrics.find((m) => m.name === 'JSHeapUsedSize')!.value;
      };
      const routes = [
        vendor,
        'https://vendor-b.localhost:4340',
        market,
        env.ADMIN_ORIGIN + '/platform',
        vendor + '/account',
      ];
      for (const url of routes) await page.goto(url);
      await page.waitForLoadState('networkidle');
      const before = await readHeap(),
        ssrBefore = await memory(storefront);
      for (let i = 0; i < 20; i++) await page.goto(routes[i % routes.length]!);
      await page.waitForLoadState('networkidle');
      const after = await readHeap(),
        ssrAfter = await memory(storefront);
      console.log(
        `Memory probe: browser before=${Math.round(before / 1048576)}MiB after=${Math.round(after / 1048576)}MiB; SSR before=${Math.round(ssrBefore.heapUsed / 1048576)}MiB after=${Math.round(ssrAfter.heapUsed / 1048576)}MiB`,
      );
      assert.ok(
        after - before < 8 * 1024 * 1024,
        'Bounded browser heap growth',
      );
      assert.ok(
        ssrAfter.heapUsed - ssrBefore.heapUsed < 16 * 1024 * 1024,
        'Bounded SSR heap growth',
      );
      await inspector.detach();
      return `20 switches; browser heap delta=${Math.round((after - before) / 1024)}KiB; SSR heap delta=${Math.round((ssrAfter.heapUsed - ssrBefore.heapUsed) / 1024)}KiB; SSR RSS=${Math.round(ssrAfter.rss / 1048576)}MiB`;
    });
    await check('central revocation survives restart', async () => {
      const central = (await context.cookies(env.PLATFORM_ACCOUNT_ORIGIN)).find(
        (c) => c.name === 'platform-account',
      )!.value;
      await page.goto(env.PLATFORM_ACCOUNT_ORIGIN + '/auth/logout');
      await page
        .getByRole('button', { name: 'Sign out everywhere', exact: true })
        .click();
      await page.waitForURL(env.PLATFORM_ACCOUNT_ORIGIN + '/auth/signed-out');
      await stop(server);
      server = launch(['dist/index.js'], back, backendEnv);
      await waitReady();
      const denied = await wire(
        env.API_ORIGIN + '/customer-account-bridge',
        {
          'content-type': 'application/json',
          'x-account-bridge': env.PLATFORM_ACCOUNT_BRIDGE_KEY,
          'x-account-origin': env.PLATFORM_ACCOUNT_ORIGIN,
        },
        JSON.stringify({
          action: 'authorize',
          central,
          origin: vendor,
          correlation: randomBytes(32).toString('base64url'),
        }),
      );
      assert.equal(denied.status, 400);
    });
    for (const [name, type] of [
      ['Firefox', firefox],
      ['WebKit', webkit],
    ] as const)
      outcomes.push({
        gate: name,
        status: existsSync(type.executablePath())
          ? 'INCONCLUSIVE'
          : 'INCONCLUSIVE',
        detail: 'No installed executable; no download performed',
      });
    await context.close();
  } finally {
    await browser.close();
  }
  await check('SSR bounded concurrency', async () => {
    const latencies: number[] = [];
    let next = 0;
    await Promise.all(
      Array.from({ length: 20 }, async () => {
        for (;;) {
          const n = next++;
          if (n >= 100) break;
          const urls = [
            vendor + '/',
            vendor + '/products',
            vendor + '/products/vendor-a-harvest-box',
            market + '/',
            'https://vendor-b.localhost:4340/',
          ];
          const url = urls[n % urls.length]!;
          const origin = new URL(url).origin;
          const start = performance.now();
          const r = await wire(url);
          latencies.push(performance.now() - start);
          assert.equal(r.status, 200);
          assert.ok(r.text.includes(origin + '/'));
        }
      }),
    );
    latencies.sort((a, b) => a - b);
    return `100 requests, 20 clients, p50=${latencies[50]!.toFixed(1)}ms p95=${latencies[95]!.toFixed(1)}ms`;
  });
  await check('worker clean restart', async () => {
    await stop(worker);
    worker = launch(['dist/index-worker.js'], back, backendEnv);
    await new Promise((r) => setTimeout(r, 8000));
    assert.equal(worker.exitCode, null);
  });
  await check('database outage and recovery without fixtures', async () => {
    await databaseAction('database-unavailable');
    try {
      const live = await wire(env.API_ORIGIN + '/health/live');
      assert.equal(live.status, 200);
      const ready = await wire(env.API_ORIGIN + '/health/ready');
      assert.equal(ready.status, 503);
      assert.equal(ready.text, '{"status":"unavailable"}');
      const unavailable = await wire(vendor);
      assert.equal(unavailable.status, 503);
      assert.match(unavailable.headers['cache-control']!, /no-store/);
      assert.ok(
        !/postgres|password|vendure_test_|SELECT |stack trace/i.test(
          unavailable.text,
        ),
      );
    } finally {
      await databaseAction('database-restore');
    }
    await waitReady();
    assert.equal((await wire(vendor)).status, 200);
  });
  await check('aggregate database pools remain bounded', async () => {
    const connections = await databaseAction('database-pool');
    assert.ok(connections <= Number(env.DB_POOL_MAX) * 2);
    return `server plus worker connections=${connections}; configured ceiling=${Number(env.DB_POOL_MAX) * 2}`;
  });
  await check(
    'synthetic secrets absent from public artifacts and captured logs',
    async () => {
      const walk = (directory: string): string[] =>
        readdirSync(directory, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory()
            ? walk(join(directory, e.name))
            : [join(directory, e.name)],
        );
      const publicFiles = [
        ...walk('apps/admin/dist'),
        ...walk('apps/storefront/dist/client'),
      ];
      for (const file of publicFiles) {
        assert.ok(!file.endsWith('.map'));
        const content = readFileSync(file, 'utf8');
        for (const marker of [
          env.COOKIE_SECRET,
          env.PLATFORM_ACCOUNT_BRIDGE_KEY,
          env.SUPERADMIN_PASSWORD,
        ])
          assert.ok(!content.includes(marker));
      }
      for (const marker of [
        env.COOKIE_SECRET,
        env.PLATFORM_ACCOUNT_BRIDGE_KEY,
        new URL(ready.magicUrl).searchParams.get('token')!,
      ])
        assert.ok(!captured.join('').includes(marker));
    },
  );
  await stop(storefront);
  await stop(admin);
  await stop(worker);
  await stop(server);
  success = true;
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Local hardening failed',
  );
  // Only fixed diagnostic sentinels, never raw child output or token-bearing URLs.
  for (const sentinel of [
    'PRODUCTION_HARDENING_SEED_FAILED',
    'APP_ENV_EXPLICIT_MODE_REQUIRED',
    'HTTPS_REQUIRED',
    'HOST_NOT_APPROVED',
    'startup_failed',
    'worker_startup_failed',
    'SEED_ERROR_TYPE:AssertionError',
    'SEED_ERROR_TYPE:ForbiddenError',
    'SEED_ERROR_TYPE:UserInputError',
  ])
    if (captured.join('').includes(sentinel))
      console.error('Diagnostic: ' + sentinel);
  for (const diagnostic of (
    captured
      .join('')
      .match(
        /account_bridge_denied[^\r\n]{0,120}|storefront_(?:failure|resolution)[^\r\n]{0,150}|RESTORE_ERROR_CATEGORY:[A-Z_]+|SEED_ERROR_(?:TYPE|CODE|NATIVE):[A-Za-z0-9_]+|PHASE13H_SEED_STEP:[A-Za-z]+|error TS\d+:[^\r\n]+|(?:Error|TypeError|SyntaxError): [A-Z_]+|Cannot find module|Cannot access [^\r\n]+/g,
      ) ?? []
  ).slice(0, 15))
    console.error('Diagnostic: ' + diagnostic);
  process.exitCode = 1;
} finally {
  for (const child of children.filter((c) => c !== seed))
    await stop(child).catch(() => {
      child.kill();
    });
  if (proxy)
    await new Promise<void>((resolve) => {
      proxy!.close(() => resolve());
      proxy!.closeAllConnections();
    });
  if (seed && seed.exitCode === null && seed.signalCode === null) {
    seed.send({ type: 'finish', success });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        exit(seed),
        new Promise((resolve) => {
          timer = setTimeout(resolve, 10000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    if (seed.exitCode === null) seed.kill();
  }
  assert.ok(relative(front, tmp).startsWith('.phase13h-tmp-'));
  rmSync(tmp, { recursive: true });
  console.log(
    'Phase 13H terminal results: ' +
      outcomes.map((r) => `${r.gate}=${r.status}`).join('; '),
  );
  console.log(
    success
      ? 'REAL LOCAL PRODUCTION-LIKE PASS; deployment NOT EXECUTED; Stripe NOT CONFIGURED'
      : 'PARTIAL; see terminal gates; no qualification fabricated',
  );
}
