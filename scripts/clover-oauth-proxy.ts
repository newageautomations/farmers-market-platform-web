import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { get } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Local callback ingress only. A hostname in the site address would reject the tunnel's Host. */
export function cloverOAuthCaddyfile({
  backendOrigin,
  adminOrigin,
  port = 8787,
  disableAdmin = false,
}: {
  backendOrigin: string;
  adminOrigin: string;
  port?: number;
  disableAdmin?: boolean;
}) {
  const backend = new URL(backendOrigin),
    admin = new URL(adminOrigin);
  for (const url of [backend, admin]) {
    assert.equal(url.protocol, 'http:');
    assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
    assert.ok(!url.username && !url.password && !url.search && !url.hash);
    assert.equal(url.pathname, '/');
    assert.ok(url.port, 'Use an explicit local port');
  }
  assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
  return `${disableAdmin ? '{\n  admin off\n}\n\n' : ''}http://:${port} {
  bind 127.0.0.1
  @oauth {
    path /in-person/clover/oauth/callback
    method GET
  }
  handle @oauth {
    reverse_proxy ${backend.host}
  }
  handle /launch {
    redir ${admin.origin}/vendor/settings/payments 302
  }
  handle / {
    redir ${admin.origin}/vendor/settings/payments 302
  }
  handle {
    respond 404
  }
}
`;
}

/** Real local Caddy plus the existing disposable backend. No tunnel or provider requests. */
export async function startCloverOAuthTestProxy(
  backendOrigin: string,
  adminOrigin: string,
) {
  const binary = process.env.CLOVER_OAUTH_CADDY_BINARY;
  assert.ok(
    binary,
    'Set CLOVER_OAUTH_CADDY_BINARY to the installed local caddy.exe',
  );
  const port = await new Promise<number>((accept, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      server.close((error) => (error ? reject(error) : accept(address.port)));
    });
  });
  const directory = mkdtempSync(resolve('.pos-stage-d-demo/oauth-proxy-test-'));
  const config = resolve(directory, 'Caddyfile');
  writeFileSync(
    config,
    cloverOAuthCaddyfile({
      backendOrigin,
      adminOrigin,
      port,
      disableAdmin: true,
    }),
  );
  const processChild = spawn(
    binary,
    ['run', '--config', config, '--adapter', 'caddyfile'],
    {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
  let output = '',
    startupError: Error | undefined;
  processChild.stderr.on('data', (chunk) => {
    output += chunk;
  });
  processChild.on('error', (error) => {
    startupError = error;
  });
  const origin = `http://127.0.0.1:${port}`;
  async function close() {
    if (processChild.exitCode === null && !startupError) {
      const exited = new Promise<void>((done) =>
        processChild.once('exit', () => done()),
      );
      processChild.kill();
      await exited;
    }
    rmSync(directory, { recursive: true, force: true });
  }
  function probe(path: string, method = 'GET') {
    return new Promise<{ status: number; length: number }>((accept, reject) => {
      const request = get(
        `${origin}${path}`,
        { method, headers: { Host: 'clover-oauth-regression.invalid' } },
        (response) => {
          let length = 0;
          response.on('data', (chunk) => {
            length += chunk.length;
          });
          response.on('end', () =>
            accept({ status: response.statusCode!, length }),
          );
        },
      );
      request.on('error', reject);
      request.setTimeout(5000, () =>
        request.destroy(new Error('Local Caddy probe timed out')),
      );
    });
  }
  try {
    for (let attempt = 0; ; attempt++) {
      if (startupError || processChild.exitCode !== null)
        throw startupError ?? new Error(output);
      try {
        await probe('/not-forwarded');
        break;
      } catch (error) {
        if (attempt >= 50) throw error;
        await new Promise((done) => setTimeout(done, 100));
      }
    }
    // The old host-qualified site returns an empty 200 here before reaching NestJS.
    const missing = await probe('/in-person/clover/oauth/callback');
    assert.equal(
      missing.status,
      400,
      'Tunnel Host must reach the registered callback, never Caddy empty 200',
    );
    assert.ok(missing.length > 0);
    assert.equal((await probe('/admin-api')).status, 404);
    assert.equal(
      (await probe('/in-person/clover/oauth/callback', 'POST')).status,
      404,
    );
    return { origin, close };
  } catch (error) {
    await close();
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const runtime = resolve('.pos-stage-d-demo');
  const ready = JSON.parse(
    readFileSync(resolve(runtime, 'ready.json'), 'utf8'),
  );
  assert.match(ready.database, /^vendure_test_pos_demo_\d+_[a-f0-9]+$/);
  const endpoint = new URL(ready.endpoint);
  assert.equal(endpoint.pathname, '/admin-api');
  const path = resolve(runtime, 'clover-oauth.Caddyfile');
  writeFileSync(
    path,
    cloverOAuthCaddyfile({
      backendOrigin: endpoint.origin,
      adminOrigin: ready.admin,
    }),
  );
  console.log(`Wrote local callback proxy configuration: ${path}`);
  console.log(
    `Reload the existing local Caddy process: caddy reload --config "${path}" --adapter caddyfile`,
  );
}
