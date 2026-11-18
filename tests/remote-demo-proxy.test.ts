import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createServer,
  request,
  type IncomingHttpHeaders,
  type Server,
} from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import {
  ACCESS_COOKIE,
  extractQuickTunnelOrigin,
  loadRemoteDemoConfig,
  parsePublicOrigin,
  parseUpstream,
  selectRoute,
  startRemoteDemoProxy,
  tunnelOriginReader,
  type RemoteDemoConfig,
  type UpstreamName,
} from '../scripts/remote-demo-proxy-core';

const ROOT = 'E:/repo';
const fsRoots = {
  storefront: [
    `${ROOT}/node_modules`,
    `${ROOT}/packages`,
    `${ROOT}/apps/storefront`,
  ],
  admin: [`${ROOT}/node_modules`, `${ROOT}/packages`, `${ROOT}/apps/admin`],
};
const ORIGIN = 'https://quiet-river-demo.trycloudflare.com';
const HOST = new URL(ORIGIN).host;
const CODE = 'test-only-remote-demo-access-code-7f3a';

const route = (method: string, target: string) =>
  selectRoute(method, target, fsRoots);
const to = (upstream: UpstreamName, target: string) => ({
  kind: 'upstream',
  upstream,
  path: target,
});

describe('remote demo route selection', () => {
  it.each([
    ['GET', '/vendor', to('admin', '/__admin/vendor')],
    [
      'GET',
      '/vendor/products/12?tab=stock',
      to('admin', '/__admin/vendor/products/12?tab=stock'),
    ],
    [
      'GET',
      '/market/applications/new',
      to('admin', '/__admin/market/applications/new'),
    ],
    ['GET', '/platform/tenants/4', to('admin', '/__admin/platform/tenants/4')],
    [
      'GET',
      '/auth/account?handoff=x',
      to('admin', '/__admin/auth/account?handoff=x'),
    ],
    [
      'GET',
      '/rental-stock/folding-chair.png',
      to('admin', '/__admin/rental-stock/folding-chair.png'),
    ],
    ['GET', '/__admin/src/main.tsx', to('admin', '/__admin/src/main.tsx')],
    [
      'GET',
      '/__admin/@fs/E:/repo/packages/ui/src/index.ts',
      to('admin', '/__admin/@fs/E:/repo/packages/ui/src/index.ts'),
    ],
    [
      'GET',
      '/vendor/application-help',
      to('storefront', '/vendor/application-help'),
    ],
    [
      'POST',
      '/vendor/application-continue',
      to('storefront', '/vendor/application-continue'),
    ],
    ['GET', '/vendors', to('storefront', '/vendors')],
    ['GET', '/market-dates', to('storefront', '/market-dates')],
    [
      'GET',
      '/auth/callback?code=abc',
      to('storefront', '/auth/callback?code=abc'),
    ],
    ['GET', '/auth/logout', to('storefront', '/auth/logout')],
    ['GET', '/account/workspaces', to('storefront', '/account/workspaces')],
    [
      'GET',
      '/account/applications/drafts/9',
      to('storefront', '/account/applications/drafts/9'),
    ],
    ['POST', '/api/shop', to('storefront', '/api/shop')],
    [
      'DELETE',
      '/api/customer-follow',
      to('storefront', '/api/customer-follow'),
    ],
    ['GET', '/', to('storefront', '/')],
    [
      'GET',
      '/assets/market-mark.svg',
      to('storefront', '/assets/market-mark.svg'),
    ],
    [
      'GET',
      '/node_modules/.vite/deps/react.js?v=1',
      to('storefront', '/node_modules/.vite/deps/react.js?v=1'),
    ],
    [
      'GET',
      '/@fs/E:/repo/node_modules/astro/x.js',
      to('storefront', '/@fs/E:/repo/node_modules/astro/x.js'),
    ],
    [
      'POST',
      '/admin-api?languageCode=en',
      to('vendure', '/admin-api?languageCode=en'),
    ],
    [
      'GET',
      '/assets/preview/ab/apple__preview.jpg?preset=thumb',
      to('vendure', '/assets/preview/ab/apple__preview.jpg?preset=thumb'),
    ],
    [
      'GET',
      '/assets/source/ab/apple.jpg',
      to('vendure', '/assets/source/ab/apple.jpg'),
    ],
  ])('%s %s', (method, target, expected) => {
    expect(route(method, target)).toEqual(expected);
  });

  it.each([
    ['GET', '/admin-api', 405],
    ['OPTIONS', '/admin-api', 405],
    ['POST', '/shop-api', 404],
    ['GET', '/graphiql/admin', 404],
    ['GET', '/mailbox', 404],
    ['GET', '/health', 404],
    ['GET', '/assets/cache/x.jpg', 404],
    ['POST', '/assets/source/x.jpg', 405],
    ['POST', '/vendor/products', 405],
    ['POST', '/__admin/src/main.tsx', 405],
    ['TRACE', '/', 405],
    ['CONNECT', '/', 405],
    ['GET', '/.env', 404],
    ['GET', '/.git/config', 404],
    ['GET', '/src/../.env', 404],
    ['GET', '/%2e%2e/secret', 404],
    ['GET', '/a%2fb', 400],
    ['GET', '/a%5cb', 400],
    ['GET', '/a%252e%252e/x', 400],
    ['GET', '//evil.example/x', 400],
    ['GET', 'http://evil.example/x', 400],
    ['GET', '/@fs/E:/repo/scripts/demo.ts', 404],
    ['GET', '/@fs/E:/other/secret.txt', 404],
    ['GET', '/__admin/@fs/E:/repo/apps/storefront/src/x.ts', 404],
    ['GET', '/__remote-demo/anything', 404],
    ['GET', '/__remote-demo/logout', 405],
  ])('denies %s %s with %i', (method, target, status) => {
    expect(route(method, target)).toEqual({ kind: 'deny', status });
  });
});

describe('remote demo configuration', () => {
  it('accepts only loopback HTTP upstreams', () => {
    expect(parseUpstream('http://127.0.0.1:4321', 'x').host).toBe(
      '127.0.0.1:4321',
    );
    for (const value of [
      'http://0.0.0.0:4321',
      'http://192.168.1.5:4321',
      'https://127.0.0.1:4321',
      'http://127.0.0.1',
      'http://user:pw@127.0.0.1:3000',
      'http://127.0.0.1:3000/admin-api',
    ])
      expect(() => parseUpstream(value, 'x')).toThrow();
  });

  it('requires an exact HTTPS public origin', () => {
    expect(parsePublicOrigin(ORIGIN)).toBe(ORIGIN);
    for (const value of [
      'http://quiet-river-demo.trycloudflare.com',
      `${ORIGIN}:8443`,
      `${ORIGIN}/path`,
      `${ORIGIN}?q=1`,
    ])
      expect(() => parsePublicOrigin(value)).toThrow();
  });

  it('requires a non-trivial access code and never embeds one', () => {
    expect(() => loadRemoteDemoConfig({}, ROOT, () => {})).toThrow(
      /REMOTE_DEMO_ACCESS_CODE/,
    );
    expect(() =>
      loadRemoteDemoConfig(
        { REMOTE_DEMO_ACCESS_CODE: 'a'.repeat(40) },
        ROOT,
        () => {},
      ),
    ).toThrow();
    expect(() =>
      loadRemoteDemoConfig(
        { REMOTE_DEMO_ACCESS_CODE: 'short' },
        ROOT,
        () => {},
      ),
    ).toThrow();
    const config = loadRemoteDemoConfig(
      { REMOTE_DEMO_ACCESS_CODE: CODE },
      ROOT,
      () => {},
    );
    expect(config.port).toBe(8790);
    expect(config.upstreams.admin.host).toBe('127.0.0.1:4342');
    // Phase B regression: the tunnel origin reader stays wired to the config.
    expect(config.publicOrigin()).toBeUndefined();
    expect(
      loadRemoteDemoConfig(
        {
          REMOTE_DEMO_ACCESS_CODE: CODE,
          REMOTE_DEMO_PUBLIC_ORIGIN: ORIGIN,
        },
        ROOT,
        () => {},
      ).publicOrigin(),
    ).toBe(ORIGIN);
  });

  it('extracts and validates the Quick Tunnel origin', () => {
    expect(
      extractQuickTunnelOrigin(
        '2026-11-12T10:00:00Z INF |  https://quiet-river-demo.trycloudflare.com  |',
      ),
    ).toBe(ORIGIN);
    expect(
      extractQuickTunnelOrigin('https://api.trycloudflare.com.evil.example'),
    ).toBe('https://api.trycloudflare.com');
    expect(extractQuickTunnelOrigin('no url yet')).toBeUndefined();
    const directory = mkdtempSync(path.join(tmpdir(), 'remote-demo-'));
    try {
      const file = path.join(directory, 'tunnel-origin.json');
      const read = tunnelOriginReader(file);
      expect(read()).toBeUndefined();
      writeFileSync(file, JSON.stringify({ origin: ORIGIN }));
      expect(read()).toBe(ORIGIN);
      writeFileSync(
        file,
        JSON.stringify({ origin: 'https://evil.example.com/' }),
      );
      expect(read()).toBeUndefined();
      rmSync(file);
      expect(read()).toBeUndefined();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

type Seen = {
  upstream: UpstreamName;
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: string;
};

describe('remote demo proxy server', () => {
  const seen: Seen[] = [];
  const logs: string[] = [];
  const upstreams: Server[] = [];
  let proxy: Server;
  let port = 0;

  beforeAll(async () => {
    const origins = {} as Record<UpstreamName, URL>;
    for (const name of ['storefront', 'admin', 'vendure'] as const) {
      const server = createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          seen.push({
            upstream: name,
            method: req.method!,
            url: req.url!,
            headers: req.headers,
            body,
          });
          res.writeHead(200, {
            'content-type': 'application/json',
            'access-control-allow-origin': 'https://evil.example',
            'access-control-allow-credentials': 'true',
            'x-powered-by': 'Express',
          });
          res.end(JSON.stringify({ upstream: name }));
        });
      });
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
      );
      upstreams.push(server);
      origins[name] = new URL(
        `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      );
    }
    const config: RemoteDemoConfig = {
      port: 0,
      accessCode: CODE,
      upstreams: origins,
      publicOrigin: () => ORIGIN,
      fsRoots,
      maxBodyBytes: 1024,
      sessionSeconds: 60,
      log: (line) => logs.push(line),
      internal: {
        admin: 'http://localhost:4322',
        vendure: `http://localhost:${origins.vendure.port}`,
        storefrontPort: Number(origins.storefront.port),
        defaultSite: 'auth.platform',
      },
    };
    proxy = await startRemoteDemoProxy(config);
    port = (proxy.address() as AddressInfo).port;
  });

  afterAll(async () => {
    proxy.closeAllConnections();
    await new Promise((resolve) => proxy.close(resolve));
    for (const server of upstreams) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  function send(
    method: string,
    target: string,
    headers: Record<string, string> = {},
    body?: string,
  ) {
    return new Promise<{
      status: number;
      headers: IncomingHttpHeaders;
      body: string;
    }>((resolve, reject) => {
      const req = request(
        {
          host: '127.0.0.1',
          port,
          method,
          path: target,
          headers: { host: HOST, ...headers },
        },
        (res) => {
          let text = '';
          res.on('data', (chunk) => (text += chunk));
          res.on('end', () =>
            resolve({
              status: res.statusCode!,
              headers: res.headers,
              body: text,
            }),
          );
        },
      );
      req.on('error', reject);
      if (body !== undefined) req.write(body);
      req.end();
    });
  }

  async function signIn() {
    const response = await send(
      'POST',
      '/__remote-demo/login',
      { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
      new URLSearchParams({ code: CODE, next: '/vendor' }).toString(),
    );
    expect(response.status).toBe(303);
    expect(response.headers.location).toBe('/vendor');
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(new RegExp(`^${ACCESS_COOKIE}=`));
    return cookie.split(';')[0]!;
  }

  it('binds only to IPv4 loopback', () => {
    expect((proxy.address() as AddressInfo).address).toBe('127.0.0.1');
  });

  it('rejects unexpected or missing hosts before routing', async () => {
    const before = seen.length;
    for (const host of [
      '127.0.0.1',
      'evil.example',
      'other-name.trycloudflare.com',
      `${HOST}.evil.example`,
    ])
      expect((await send('GET', '/', { host })).status).toBe(421);
    expect(seen.length).toBe(before);
  });

  it('protects every proxied route, including assets and the API', async () => {
    const before = seen.length;
    const page = await send('GET', '/vendor/products', { accept: 'text/html' });
    expect(page.status).toBe(303);
    expect(page.headers.location).toBe(
      '/__remote-demo/login?next=%2Fvendor%2Fproducts',
    );
    for (const [method, target] of [
      ['GET', '/assets/preview/a.jpg'],
      ['GET', '/_astro/app.js'],
      ['GET', '/__admin/src/main.tsx'],
      ['POST', '/admin-api'],
      ['POST', '/api/account'],
    ] as const)
      expect((await send(method, target, { origin: ORIGIN })).status).toBe(401);
    expect(
      (await send('GET', '/', { cookie: `${ACCESS_COOKIE}=9999999999.forged` }))
        .status,
    ).toBe(401);
    expect(seen.length).toBe(before);
  });

  // Regression: a no-referrer gate page makes browsers POST the form with
  // `Origin: null`, so the correct code returned 403 Forbidden through the tunnel.
  it('serves the login page with a policy that keeps the form POST Origin', async () => {
    for (const method of ['GET', 'HEAD']) {
      const page = await send(method, '/__remote-demo/login?next=%2Fvendor');
      expect(page.status).toBe(200);
      expect(page.headers['referrer-policy']).toBe('same-origin');
    }
    const page = await send('GET', '/__remote-demo/login?next=%2Fvendor');
    expect(page.body).toContain('method="post" action="/__remote-demo/login"');
    expect(page.body).toContain('name="next" value="/vendor"');
    // A null or missing Origin is still not accepted as same-origin.
    for (const origin of ['null', undefined]) {
      const response = await send(
        'POST',
        '/__remote-demo/login',
        {
          ...(origin ? { origin } : {}),
          'content-type': 'application/x-www-form-urlencoded',
        },
        new URLSearchParams({ code: CODE, next: '/vendor' }).toString(),
      );
      expect(response.status).toBe(403);
      expect(response.headers['set-cookie']).toBeUndefined();
    }
  });

  it('rejects wrong access codes without logging them', async () => {
    const response = await send(
      'POST',
      '/__remote-demo/login',
      { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
      'code=not-the-code-guess-123&next=%2F',
    );
    expect(response.status).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(
      (
        await send(
          'POST',
          '/__remote-demo/login',
          {
            origin: 'https://evil.example',
            'content-type': 'application/x-www-form-urlencoded',
          },
          `code=${CODE}`,
        )
      ).status,
    ).toBe(403);
    await signIn();
    expect(logs.join('\n')).not.toContain(CODE);
    expect(logs.join('\n')).not.toContain('not-the-code-guess-123');
  });

  it('forwards authorized requests with sanitized headers', async () => {
    const cookie = await signIn();
    const response = await send(
      'POST',
      '/admin-api?languageCode=en',
      {
        cookie: `${cookie}; session=abc`,
        origin: ORIGIN,
        'content-type': 'application/json',
        forwarded: 'for=1.2.3.4;proto=https;host=evil.example',
        'x-forwarded-for': '1.2.3.4',
        'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'http',
        'x-real-ip': '1.2.3.4',
        'cf-connecting-ip': '1.2.3.4',
        'x-account-bridge': 'guess',
        'x-storefront-bridge': 'guess',
        'x-contact-client': '1.2.3.4',
        'vendure-token': 'channel',
      },
      '{"query":"{ me { id } }"}',
    );
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ upstream: 'vendure' });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
    const last = seen.at(-1)!;
    expect(last.upstream).toBe('vendure');
    expect(last.url).toBe('/admin-api?languageCode=en');
    expect(last.body).toBe('{"query":"{ me { id } }"}');
    // Phase B: Vendure sees its local `localhost` authority (asset URL identity)
    // and the validated public origin as the local admin origin it checks.
    expect(last.headers.host).toMatch(/^localhost:\d+$/);
    expect(last.headers.cookie).toBe('session=abc');
    expect(last.headers['vendure-token']).toBe('channel');
    expect(last.headers.origin).toBe('http://localhost:4322');
    for (const name of [
      'forwarded',
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
      'x-real-ip',
      'cf-connecting-ip',
      'x-account-bridge',
      'x-storefront-bridge',
      'x-contact-client',
    ])
      expect(last.headers[name]).toBeUndefined();

    await send('GET', '/vendor/orders', { cookie });
    expect(seen.at(-1)).toMatchObject({
      upstream: 'admin',
      url: '/__admin/vendor/orders',
    });
    await send('GET', '/account/workspaces', { cookie });
    expect(seen.at(-1)).toMatchObject({
      upstream: 'storefront',
      url: '/account/workspaces',
    });
  });

  it('keeps internal endpoints unreachable even when signed in', async () => {
    const cookie = await signIn();
    const before = seen.length;
    for (const [method, target, status] of [
      ['POST', '/shop-api', 404],
      ['GET', '/graphiql/admin', 404],
      ['GET', '/mailbox', 404],
      ['GET', '/health', 404],
      ['GET', '/admin-api', 405],
      ['GET', '/.env', 404],
      ['GET', '/@fs/E:/repo/scripts/x.ts', 404],
    ] as const)
      expect(
        (await send(method, target, { cookie, origin: ORIGIN })).status,
      ).toBe(status);
    expect(seen.length).toBe(before);
  });

  it('rejects cross-origin unsafe requests and oversized bodies', async () => {
    const cookie = await signIn();
    const before = seen.length;
    expect((await send('POST', '/api/account', { cookie }, '{}')).status).toBe(
      403,
    );
    expect(
      (
        await send(
          'POST',
          '/api/account',
          { cookie, origin: 'https://evil.example' },
          '{}',
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await send(
          'POST',
          '/api/account',
          { cookie, origin: ORIGIN },
          'x'.repeat(2048),
        )
      ).status,
    ).toBe(413);
    expect(seen.length).toBe(before);
  });

  it('only upgrades authorized Vite HMR sockets', async () => {
    const upgrade = (headers: Record<string, string>) =>
      new Promise<number>((resolve, reject) => {
        const req = request({
          host: '127.0.0.1',
          port,
          path: '/?token=t',
          headers: {
            host: HOST,
            connection: 'Upgrade',
            upgrade: 'websocket',
            'sec-websocket-version': '13',
            'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
            ...headers,
          },
        });
        req.on('upgrade', (res, socket) => {
          socket.destroy();
          resolve(res.statusCode!);
        });
        req.on('response', (res) => {
          res.resume();
          resolve(res.statusCode!);
        });
        req.on('error', reject);
        req.end();
      });
    expect(
      await upgrade({ origin: ORIGIN, 'sec-websocket-protocol': 'vite-hmr' }),
    ).toBe(401);
    const cookie = await signIn();
    expect(
      await upgrade({
        cookie,
        origin: 'https://evil.example',
        'sec-websocket-protocol': 'vite-hmr',
      }),
    ).toBe(403);
    expect(
      await upgrade({
        cookie,
        origin: ORIGIN,
        'sec-websocket-protocol': 'chat',
      }),
    ).toBe(400);
  });
});
