import assert from 'node:assert/strict';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createServer, request as httpsRequest } from 'node:https';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { chromium } from 'playwright';
import { syntheticProductionEnvironment } from './production-hardening-environment';

const faultPath = '/phase13h-qualification/deliberate-500';
type Reply = { status: number; headers: IncomingHttpHeaders; text: string };
export async function qualifyDeliberate500() {
  assert.equal(process.env.FRONTEND_NO_EVIDENCE, 'true');
  const front = process.cwd(),
    back = resolve('../farmers-market-platform');
  const requireBack = createRequire(join(back, 'package.json'));
  createRequire(import.meta.url)('./production-hardening-network.cjs');
  const tmp = mkdtempSync(join(front, '.phase13h-tmp-'));
  const env = syntheticProductionEnvironment();
  const dbEnv = requireBack('dotenv').parse(
    readFileSync(join(back, '.env')),
  ) as Record<string, string>;
  for (const key of ['DB_USERNAME', 'DB_PASSWORD', 'DB_PORT'])
    if (dbEnv[key]) env[key] = dbEnv[key];
  const nonce = randomBytes(16).toString('hex');
  const markers = {
    secret: `PH13H_500_SECRET_${nonce}`,
    sql: `SELECT credential FROM PH13H_FAKE_SQL_${nonce}`,
    path: `E:\\internal\\PH13H_FAKE_PATH_${nonce}\\vendure\\server.ts`,
    credential: `PH13H_FAKE_CREDENTIAL_${nonce}`,
    magic: `PH13H_FAKE_MAGIC_${nonce}`,
    handoff: `PH13H_FAKE_HANDOFF_${nonce}`,
    body: `PH13H_FULL_BODY_${nonce}`,
    databaseUrl: `postgres://fake:PH13H_FAKE_CREDENTIAL_${nonce}@localhost/PH13H_FAKE_DB_${nonce}`,
  };
  const logs: string[] = [],
    children: ChildProcess[] = [];
  let backend: ChildProcess | undefined;
  let proxy: ReturnType<typeof createServer> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let stage = 'backend startup';
  function launch(
    args: string[],
    cwd: string,
    environment: Record<string, string>,
  ) {
    const child = spawn(process.execPath, args, {
      cwd,
      windowsHide: true,
      env: { ...process.env, ...environment },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    children.push(child);
    for (const stream of [child.stdout, child.stderr])
      stream!.on('data', (data) => logs.push(String(data)));
    return child;
  }
  function exited(child: ChildProcess) {
    return new Promise<number>((resolveExit) => {
      if (child.exitCode !== null || child.signalCode !== null)
        resolveExit(child.exitCode ?? 1);
      else child.once('exit', (code) => resolveExit(code ?? 1));
    });
  }
  async function stop(child: ChildProcess) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    // Process disposal only. This makes no graceful-signal/drain qualification claim.
    child.kill();
    await exited(child);
  }
  function message(child: ChildProcess, type: string, timeout = 60000) {
    return new Promise<Record<string, string>>((resolveMessage, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        child.off('message', listener);
        child.off('exit', ended);
      };
      const listener = (value: Record<string, string>) => {
        if (value.type === type) {
          cleanup();
          resolveMessage(value);
        }
      };
      const ended = () => {
        cleanup();
        reject(new Error('Controlled process exited early'));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Controlled process deadline'));
      }, timeout);
      child.on('message', listener);
      child.once('exit', ended);
    });
  }
  async function control(type: string, reply: string, payload = {}) {
    const pending = message(backend!, reply);
    backend!.send({ type, ...payload });
    return pending;
  }
  function wire(
    path: string,
    body?: string,
    origin = env.API_ORIGIN,
  ): Promise<Reply> {
    const target = new URL(origin);
    return new Promise((resolveReply, reject) => {
      const req = httpsRequest(
        {
          host: '127.0.0.1',
          port: target.port,
          servername: target.hostname,
          rejectUnauthorized: false,
          path,
          method: body ? 'POST' : 'GET',
          timeout: 10000,
          headers: {
            host: target.host,
            ...(body ? { 'content-type': 'application/json' } : {}),
          },
        },
        (res) => {
          let text = '';
          res.on('data', (chunk) => (text += String(chunk)));
          res.on('end', () =>
            resolveReply({
              status: res.statusCode!,
              headers: res.headers,
              text,
            }),
          );
        },
      );
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('HTTP deadline')));
      req.end(body);
    });
  }
  async function ready() {
    for (let i = 0; i < 160; i++) {
      try {
        if ((await wire('/health/ready')).status === 200) return;
      } catch {
        /* still starting */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error('Production readiness deadline');
  }
  function noLeak(text: string, database: string, processLog = false) {
    for (const value of [
      ...Object.values(markers),
      ...(processLog ? [] : [database]),
      env.COOKIE_SECRET,
      env.PLATFORM_ACCOUNT_BRIDGE_KEY,
    ])
      assert.ok(
        !text.includes(value),
        'Sensitive synthetic content must be absent',
      );
    assert.doesNotMatch(
      text,
      /PH13H_(?:500_SECRET|FAKE_|FULL_BODY)|stacktrace|"stack"|node_modules|\b[A-Z]:[\\/]|postgres(?:ql)?:\/\/|\bat\s+\S+\s*\([^\n]+:\d+:\d+\)/i,
    );
  }
  async function safe500(reply: Reply, database: string) {
    const qualification = stage;
    stage = qualification + '/HTTP status and headers';
    assert.equal(
      reply.status,
      500,
      'Deliberate application error must be an HTTP 500',
    );
    const id = reply.headers['x-request-id'];
    assert.equal(typeof id, 'string');
    assert.match(
      String(id),
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    );
    assert.equal(reply.headers['x-content-type-options'], 'nosniff');
    assert.equal(reply.headers['cache-control'], 'private, no-store');
    assert.equal(reply.headers['referrer-policy'], 'no-referrer');
    assert.equal(reply.headers['x-frame-options'], 'DENY');
    assert.equal(
      reply.headers['content-security-policy'],
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    );
    assert.equal(
      reply.headers['strict-transport-security'],
      'max-age=31536000',
    );
    stage = qualification + '/response leakage';
    noLeak(reply.text + JSON.stringify(reply.headers), database);
    const body = JSON.parse(reply.text) as Record<string, unknown>;
    // Unmodified Vendure HTTP exception normalization: unknown Error has an empty safe message.
    stage = qualification + '/production envelope';
    assert.deepEqual(Object.keys(body).sort(), [
      'message',
      'path',
      'statusCode',
      'timestamp',
    ]);
    assert.equal(body.statusCode, 500);
    assert.equal(body.message, '');
    assert.equal(body.path, faultPath);
    assert.ok(Number.isFinite(Date.parse(String(body.timestamp))));
    for (let i = 0; i < 40; i++) {
      if (logs.join('').includes(String(id))) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    stage = qualification + '/correlated logs';
    const events = logs
      .join('')
      .split(/\r?\n/)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as Record<string, unknown>];
        } catch {
          return [];
        }
      });
    assert.ok(
      events.some(
        (e) =>
          e.event === 'application_error' &&
          e.requestId === id &&
          e.level === 'error',
      ),
      'ProductionLogger exception is correlated',
    );
    assert.ok(
      events.some(
        (e) =>
          e.event === 'http_request' && e.requestId === id && e.status === 500,
      ),
      'Completed HTTP 500 is correlated',
    );
    noLeak(logs.join(''), database, true);
    return String(id);
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
    Object.assign(env, {
      NODE_OPTIONS: [
        resolve('scripts/production-hardening-network.cjs'),
        resolve('scripts/playwright-no-evidence.cjs'),
        join(back, 'test/frontend-integration/regression-no-evidence.cjs'),
      ]
        .map((path) => `--require="${path.replaceAll('\\', '/')}"`)
        .join(' '),
      NODE_EXTRA_CA_CERTS: join(tmp, 'cert.pem'),
      SERVER_KEY_PATH: join(tmp, 'key.pem'),
      SERVER_CERT_PATH: join(tmp, 'cert.pem'),
      ASSET_UPLOAD_DIR: join(tmp, 'assets'),
      PORT: '4342',
    });
    const backendEnv: Record<string, string> = {
      ...env,
      TRUSTED_PROXY_CIDRS: '127.0.0.2/32',
      SERVER_KEY_PATH: '',
      SERVER_CERT_PATH: '',
    };
    backend = launch(
      [
        requireBack.resolve('ts-node/dist/bin.js'),
        '--project',
        'test/frontend-integration/tsconfig.json',
        'test/production-hardening/serve-deliberate-500.ts',
      ],
      back,
      backendEnv,
    );
    const started = await message(backend, 'ready', 180000);
    const database = started.database!;
    assert.match(database, /^vendure_test_[a-z0-9_]+$/);
    assert.notEqual(database, 'vendure');
    backendEnv.DB_NAME = database;
    proxy = createServer(
      {
        key: readFileSync(join(tmp, 'key.pem')),
        cert: readFileSync(join(tmp, 'cert.pem')),
      },
      (req, res) => {
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
          res.writeHead(503);
          res.end();
        });
        req.pipe(upstream);
      },
    );
    await new Promise<void>((r) => proxy!.listen(4343, '127.0.0.1', r));
    await ready();
    const before = (await control('state', 'state')).hash;
    stage = 'DF HTTP/error/log assertions';
    await control('arm', 'armed', { target: 'direct', markers });
    const requestBody = JSON.stringify(markers);
    const direct = await wire(faultPath, requestBody);
    const directId = await safe500(direct, database);
    assert.ok(
      !logs.join('').includes(requestBody),
      'Full request body is absent from logs',
    );
    assert.equal((await wire('/health/ready')).status, 200);
    assert.equal(
      (await wire(faultPath, '{}')).status,
      404,
      'The fault is consumed once',
    );
    console.log(
      `PASS DF: actual HTTP 500; X-Request-Id=${directId}; correlated sanitized error/request events; policy headers; no leakage`,
    );

    // Build and serve the same existing Admin production runtime, with its normal API URL and ErrorBoundary.
    stage = 'production Admin build';
    const build = launch(
      [join(front, 'node_modules/vite/bin/vite.js'), 'build'],
      join(front, 'apps/admin'),
      env,
    );
    assert.equal(await exited(build), 0, 'Production Admin build');
    launch(['--import', 'tsx', 'scripts/serve-admin.ts'], front, {
      ...env,
      ADMIN_PORT: '4341',
    });
    for (let i = 0; i < 80; i++) {
      try {
        if ((await wire('/', undefined, env.ADMIN_ORIGIN)).status === 200)
          break;
      } catch {
        /* Admin starting */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.equal((await wire('/', undefined, env.ADMIN_ORIGIN)).status, 200);
    assert.ok(
      existsSync(chromium.executablePath()),
      'Existing Chromium required',
    );
    browser = await chromium.launch({
      headless: true,
      args: ['--host-resolver-rules=MAP *.localhost 127.0.0.1'],
    });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const consoleEntries: string[] = [],
      crashes: string[] = [],
      pageErrors: string[] = [];
    page.on('console', (entry) => consoleEntries.push(entry.text()));
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('crash', () => crashes.push('crash'));
    stage = 'Admin login';
    await page.goto(env.ADMIN_ORIGIN);
    await page.getByLabel('Email or username').fill(env.SUPERADMIN_USERNAME);
    await page
      .getByLabel('Password', { exact: true })
      .fill(env.SUPERADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    stage = 'EX real HTTP 500 and resilient surface';
    await control('arm', 'armed', { target: 'admin', markers });
    const failure = page.waitForResponse(
      (response) =>
        response.url() === env.PUBLIC_ADMIN_API_URL &&
        response.status() === 500,
    );
    await page.getByRole('link', { name: 'Tenants', exact: true }).click();
    const response = await failure;
    const frontendId = await safe500(
      {
        status: response.status(),
        headers: await response.allHeaders(),
        text: await response.text(),
      },
      database,
    );
    stage = 'EX safe visible UI and shell';
    await page
      .getByRole('alert')
      .filter({
        hasText: 'The service is unavailable. Please try again later.',
      })
      .waitFor();
    assert.ok(
      await page.getByRole('navigation').count(),
      'Navigation shell stays rendered',
    );
    assert.ok(
      await page
        .getByRole('link', { name: 'Tenants', exact: true })
        .isVisible(),
    );
    assert.ok(
      await page
        .getByRole('button', { name: 'Sign out', exact: true })
        .isVisible(),
    );
    assert.ok(
      (await page.locator('#root').innerText()).length > 100,
      'No white screen',
    );
    stage = 'EX DOM and console leakage';
    noLeak(await page.content(), database);
    noLeak(consoleEntries.join('\n') + pageErrors.join('\n'), database);
    assert.deepEqual(crashes, []);
    assert.deepEqual(pageErrors, []);
    // Async HTTP failures use existing ReadState/ErrorState under the mounted ErrorBoundary.
    // The current UX does not display backend correlation IDs; both IDs are qualified on the wire/logs.
    stage = 'EX retry recovery';
    const recovered = page.waitForResponse(
      (r) =>
        r.url() === env.PUBLIC_ADMIN_API_URL &&
        r.status() === 200 &&
        r.request().postData()?.includes('platformTenants') === true,
    );
    await page
      .getByRole('button', { name: 'Refresh records', exact: true })
      .click();
    const recovery = await recovered;
    assert.equal((await recovery.json()).data.platformTenants.totalItems, 0);
    await page
      .getByText('No tenants match these filters.', { exact: true })
      .waitFor();
    assert.equal(await page.getByRole('alert').count(), 0);
    noLeak((await page.content()) + consoleEntries.join('\n'), database);
    assert.deepEqual(crashes, []);
    assert.deepEqual(pageErrors, []);
    assert.equal(
      (await control('state', 'state')).hash,
      before,
      'Fault did not mutate shared settings',
    );
    console.log(
      `PASS EX: real Admin HTTP 500; X-Request-Id=${frontendId}; existing resilient surface under ErrorBoundary; shell/retry preserved; normal tenant read recovered (200)`,
    );
    await context.close();
    await browser.close();
    browser = undefined;

    stage = 'normal production fault exclusion';
    await control('close', 'closed');
    const ordinary = launch(['dist/index.js'], back, backendEnv);
    await ready();
    assert.equal(
      (await wire(faultPath, '{}')).status,
      404,
      'Normal built production entrypoint cannot register fault',
    );
    await stop(ordinary);
    const finished = exited(backend);
    backend.send({ type: 'finish' });
    assert.equal(await finished, 0);
    backend = undefined;
    console.log(
      'PASS normal production fault-path exclusion (404), test database cleanup and post-fault recovery',
    );
  } catch (error) {
    // Assertion values can contain synthetic secrets. Never print raw errors or captured process output.
    console.error(
      'FAIL deliberate 500 qualification at ' +
        stage +
        ': ' +
        (error instanceof Error ? error.name : 'Unknown'),
    );
    if (error instanceof Error)
      for (const category of error.message.match(
        /\b(?:ERR_[A-Z_]+|Timeout)\b/g,
      ) ?? [])
        console.error('Transport category: ' + category);
    for (const sentinel of [
      'DELIBERATE_500_COMPOSITION_FAILED',
      'startup_failed',
      'error TS',
    ])
      if (logs.join('').includes(sentinel))
        console.error('Diagnostic: ' + sentinel);
    for (const diagnostic of logs
      .join('')
      .match(
        /DELIBERATE_500_COMPOSITION_FAILED:[a-z-]+:[A-Za-z]+:[A-Za-z0-9_]+:[A-Z_]+/g,
      ) ?? [])
      console.error(diagnostic);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    for (const child of children.filter((c) => c !== backend))
      await stop(child);
    if (proxy)
      await new Promise<void>((r) => {
        proxy!.close(() => r());
        proxy!.closeAllConnections();
      });
    if (backend && backend.exitCode === null && backend.signalCode === null) {
      const finished = exited(backend);
      backend.send({ type: 'finish' });
      await finished;
    }
    assert.ok(relative(front, tmp).startsWith('.phase13h-tmp-'));
    rmSync(tmp, { recursive: true });
    logs.length = 0;
  }
}
