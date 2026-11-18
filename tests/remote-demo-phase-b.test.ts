// Phase B remote-demo compatibility: one public HTTPS origin mapped onto the
// application's existing local origins. See docs/CLOUDFLARE_TUNNEL_PHASE_B.md.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  createServer,
  request,
  type IncomingHttpHeaders,
  type Server,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  remoteDemoPublicUrl,
  remoteDemoSiteId,
  remoteDemoSiteOf,
  rewriteRemoteDemoText,
} from '../packages/config/src/remote-demo';
import {
  ACCESS_COOKIE,
  SITE_COOKIE,
  internalOrigins,
  partitionRequestCookies,
  rewriteCsp,
  rewriteSetCookie,
  selectRoute,
  startRemoteDemoProxy,
  type RemoteDemoConfig,
  type UpstreamName,
} from '../scripts/remote-demo-proxy-core';
import {
  adminIdentityOrigin,
  browserOrigin,
  browserUrl,
} from '../apps/admin/src/remote-demo';

const P = 'https://quiet-river-demo.trycloudflare.com';
const HOST = new URL(P).host;
const CODE = 'test-only-remote-demo-access-code-7f3a';
const origins = {
  admin: 'http://localhost:4322',
  vendure: 'http://localhost:3000',
  storefrontPort: 4321,
};
const fsRoots = { storefront: ['E:/repo/node_modules'], admin: [] };

describe('public URL mapping', () => {
  it('accepts only plain local site ids', () => {
    for (const id of ['manna-roots', 'auth.platform', 'localhost', '9-1-farm'])
      expect(remoteDemoSiteId(id)).toBe(id);
    for (const id of [
      '',
      'Manna',
      '-x',
      'x-',
      'a..b',
      'x.localhost',
      'a_b',
      'a/b',
      'a.b.c.d.e.f',
      'x'.repeat(64),
    ])
      expect(remoteDemoSiteId(id)).toBeUndefined();
    expect(remoteDemoSiteOf('http://manna-roots.localhost:4321', 4321)).toBe(
      'manna-roots',
    );
    expect(remoteDemoSiteOf('http://localhost:4321', 4321)).toBe('localhost');
    expect(
      remoteDemoSiteOf('http://manna.localhost:9999', 4321),
    ).toBeUndefined();
    expect(
      remoteDemoSiteOf('https://manna.localhost:4321', 4321),
    ).toBeUndefined();
    expect(remoteDemoSiteOf('http://evil.example:4321', 4321)).toBeUndefined();
  });

  it('maps admin, assets and sites to the public origin', () => {
    const url = (value: string, site?: string) =>
      remoteDemoPublicUrl(value, P, origins, site);
    expect(url('http://localhost:4322/vendor/orders?channel=2')).toBe(
      `${P}/vendor/orders?channel=2`,
    );
    expect(url('http://localhost:3000/assets/source/a.jpg')).toBe(
      `${P}/assets/source/a.jpg`,
    );
    // Other Vendure routes are never browser-facing.
    expect(url('http://localhost:3000/shop-api')).toBeUndefined();
    expect(url('http://auth.platform.localhost:4321/account/login?x=1')).toBe(
      `${P}/store/auth.platform/account/login?x=1`,
    );
    expect(
      url('http://manna-roots.localhost:4321/products', 'manna-roots'),
    ).toBe(`${P}/products`);
    expect(url('https://example.com/a')).toBeUndefined();
    expect(url('http://user:pw@localhost:4322/')).toBeUndefined();
  });

  it('rewrites links but keeps bare site origins as identities', () => {
    const html = [
      '<a href="http://manna-roots.localhost:4321/">Manna</a>',
      '<a href="http://localhost:4322/vendor?channel=3&amp;account=1">Vendor</a>',
      '<link rel="canonical" href="http://boerne.localhost:4321/products/x">',
      '<img src="http://localhost:3000/assets/preview/a.jpg" srcset="http://localhost:3000/assets/preview/b.jpg 2x">',
      '<input type="hidden" name="origin" value="http://manna-roots.localhost:4321">',
      '<script type="application/json">{"parent":"http://localhost:4322"}</script>',
      '<a href="http://localhost:3000/payments/x">no</a>',
      '<a href="http://evil-localhost:4321/">no</a>',
      '<a href="http://localhost:43210/">no</a>',
      '<a href="http://localhost:4322@evil.example/">no</a>',
      '<a href="https://manna.localhost:4321/">no</a>',
      // Market pages link vendors by bare canonical origin.
      '<a class="market-vendor-storefront" href="http://tamales.localhost:4321">',
      '{"href":"http://boerne.localhost:4321","origin":"http://boerne.localhost:4321"}',
    ].join('\n');
    const out = rewriteRemoteDemoText(html, P, origins, 'boerne');
    expect(out).toContain(`href="${P}/store/manna-roots/"`);
    expect(out).toContain(`href="${P}/store/tamales"`);
    expect(out).toContain(
      `{"href":"${P}","origin":"http://boerne.localhost:4321"}`,
    );
    expect(out).toContain(`href="${P}/vendor?channel=3&amp;account=1"`);
    expect(out).toContain(`href="${P}/products/x"`);
    expect(out).toContain(`src="${P}/assets/preview/a.jpg"`);
    expect(out).toContain(`srcset="${P}/assets/preview/b.jpg 2x"`);
    expect(out).toContain('value="http://manna-roots.localhost:4321"');
    expect(out).toContain(`{"parent":"${P}"}`);
    expect(out).toContain('href="http://localhost:3000/payments/x"');
    expect(out).toContain('href="http://evil-localhost:4321/"');
    expect(out).toContain('href="http://localhost:43210/"');
    expect(out).toContain('href="http://localhost:4322@evil.example/"');
    expect(out).toContain('href="https://manna.localhost:4321/"');
    expect(out).not.toContain('localhost:4322"');
  });

  it('rewrites CSP sources to the public origin', () => {
    const translation = {
      publicOrigin: P,
      internal: origins,
      partition: 'manna-roots',
      site: 'manna-roots',
    };
    expect(
      rewriteCsp(
        'frame-ancestors http://localhost:4322; form-action http://manna-roots.localhost:4321/storefront-editor-preview/render; connect-src ws://manna-roots.localhost:4321; img-src https://cdn.example http://localhost:9999',
        translation,
      ),
    ).toBe(
      `frame-ancestors ${P}; form-action ${P}/storefront-editor-preview/render; connect-src wss://${HOST}; img-src https://cdn.example http://localhost:9999`,
    );
  });
});

describe('site selection route', () => {
  const route = (method: string, target: string) =>
    selectRoute(method, target, fsRoots);
  it.each([
    ['/store/manna-roots', 'manna-roots', '/'],
    ['/store/manna-roots/', 'manna-roots', '/'],
    ['/store/manna-roots?x=1', 'manna-roots', '/?x=1'],
    [
      '/store/auth.platform/account/login?origin=http%3A%2F%2Fa&c=1',
      'auth.platform',
      '/account/login?origin=http%3A%2F%2Fa&c=1',
    ],
    [
      '/store/boerne-farmers-market/occurrences/4/map',
      'boerne-farmers-market',
      '/occurrences/4/map',
    ],
    [
      '/store/localhost/auth/callback?code=c',
      'localhost',
      '/auth/callback?code=c',
    ],
  ])('%s selects %s and continues at %s', (target, site, next) => {
    expect(route('GET', target)).toEqual({ kind: 'site', site, next });
  });

  it('rejects malformed sites and unsafe methods', () => {
    for (const target of [
      '/store',
      '/store/',
      '/store/Manna',
      '/store/a_b/x',
      '/store/x.localhost/',
      '/store/%6danna/',
    ])
      expect(route('GET', target)).toMatchObject({ kind: 'deny', status: 404 });
    expect(route('POST', '/store/manna/x')).toEqual({
      kind: 'deny',
      status: 405,
    });
    // `/stores` and other prefixes are not the site route.
    expect(route('GET', '/stores')).toMatchObject({ upstream: 'storefront' });
  });

  it('keeps overlapping admin/Astro routes and internal endpoints as in Phase A', () => {
    expect(route('GET', '/vendor/storefront/editor')).toMatchObject({
      upstream: 'admin',
      path: '/__admin/vendor/storefront/editor',
    });
    expect(route('GET', '/vendor/application-return?draft=2')).toMatchObject({
      upstream: 'storefront',
    });
    expect(route('GET', '/storefront-editor-preview/')).toMatchObject({
      upstream: 'storefront',
    });
    expect(route('POST', '/storefront-editor-preview/render')).toMatchObject({
      upstream: 'storefront',
    });
    for (const target of ['/shop-api', '/graphiql', '/mailbox', '/health'])
      expect(route('POST', target)).toMatchObject({ kind: 'deny' });
    // Provider callbacks and webhooks are Vendure routes and never reach Vendure.
    expect(route('POST', '/payments/stripe/webhook')).toMatchObject({
      upstream: 'storefront',
    });
  });
});

describe('cookie partitions', () => {
  it('gives each site only its own cookies and keeps proxy cookies private', () => {
    const jar = [
      `${ACCESS_COOKIE}=gate`,
      `${SITE_COOKIE}=manna-roots`,
      'session=admin',
      'rd~manna-roots~account-correlation=m',
      '__Host-rd~manna-roots~token=h',
      'rd~auth.platform~platform-unified-account=c',
      'rd~manna-roots-2~x=other',
    ].join('; ');
    expect(partitionRequestCookies(jar, 'local')).toBe('session=admin');
    expect(partitionRequestCookies(jar, 'manna-roots')).toBe(
      'account-correlation=m; __Host-token=h',
    );
    expect(partitionRequestCookies(jar, 'auth.platform')).toBe(
      'platform-unified-account=c',
    );
    expect(partitionRequestCookies(jar, 'unknown')).toBe('');
  });

  it('renames site cookies, forces Secure and drops Domain', () => {
    expect(
      rewriteSetCookie(
        'account-correlation=abc; Path=/auth/callback; HttpOnly; SameSite=Lax; Max-Age=120',
        'manna-roots',
      ),
    ).toBe(
      'rd~manna-roots~account-correlation=abc; Path=/auth/callback; HttpOnly; SameSite=Lax; Max-Age=120; Secure',
    );
    expect(
      rewriteSetCookie('session=v; Domain=localhost; Path=/; secure', 'local'),
    ).toBe('session=v; Path=/; Secure');
    expect(rewriteSetCookie('__Host-t=1; Path=/', 'a.b')).toBe(
      '__Host-rd~a.b~t=1; Path=/; Secure',
    );
  });
});

describe('configuration', () => {
  const upstreams = {
    storefront: new URL('http://127.0.0.1:4321'),
    admin: new URL('http://127.0.0.1:4342'),
    vendure: new URL('http://127.0.0.1:3000'),
  };
  it('uses the existing local account and admin origins as identities', () => {
    expect(internalOrigins({}, upstreams)).toEqual({
      admin: 'http://localhost:4322',
      vendure: 'http://localhost:3000',
      storefrontPort: 4321,
      defaultSite: 'auth.platform',
    });
    for (const env of [
      { ADMIN_ORIGIN: 'https://admin.example' },
      { ADMIN_ORIGIN: 'http://localhost:4322/' },
      { PLATFORM_ACCOUNT_ORIGIN: 'https://auth.example' },
      { PLATFORM_ACCOUNT_ORIGIN: 'http://auth.platform.localhost:9999' },
      { PLATFORM_ACCOUNT_ORIGIN: 'http://localhost:4321' },
    ])
      expect(() => internalOrigins(env, upstreams)).toThrow();
  });

  it('leaves the normal admin build on its absolute local API', async () => {
    const saved = { ...process.env };
    Object.assign(process.env, {
      SHOP_API_URL: 'http://localhost:3000/shop-api',
      PUBLIC_ADMIN_API_URL: 'http://localhost:3000/admin-api',
      FRONTEND_FIXTURE_MODE: 'false',
      PLATFORM_ACCOUNT_ORIGIN: 'http://auth.platform.localhost:4321',
      ADMIN_ORIGIN: 'http://localhost:4322',
    });
    try {
      const { default: factory } = await import('../apps/admin/vite.config');
      const define = (command: 'serve' | 'build', mode: string) =>
        (factory as (env: object) => { define: Record<string, string> })({
          command,
          mode,
        }).define;
      delete process.env.REMOTE_DEMO_ADMIN;
      expect(define('serve', 'development').__ADMIN_API_URL__).toBe(
        '"http://localhost:3000/admin-api"',
      );
      expect(define('serve', 'development').__REMOTE_DEMO__).toBe('null');
      process.env.REMOTE_DEMO_ADMIN = 'true';
      expect(define('serve', 'development').__ADMIN_API_URL__).toBe(
        '"/admin-api"',
      );
      expect(
        JSON.parse(define('serve', 'development').__REMOTE_DEMO__!),
      ).toEqual(origins);
      // Never for builds, whatever the process environment says.
      expect(define('build', 'production').__REMOTE_DEMO__).toBe('null');
    } finally {
      for (const key of Object.keys(process.env))
        if (!(key in saved)) delete process.env[key];
      Object.assign(process.env, saved);
    }
  });
});

describe('remote admin navigation helpers', () => {
  const global = globalThis as { __REMOTE_DEMO__?: unknown };
  afterEach(() => {
    delete global.__REMOTE_DEMO__;
  });
  it('are the identity when remote-demo mode is off', () => {
    const href = 'http://auth.platform.localhost:4321/account/login?x=1';
    expect(browserUrl(href)).toBe(href);
    expect(browserOrigin('http://manna.localhost:4321')).toBe(
      'http://manna.localhost:4321',
    );
    expect(adminIdentityOrigin()).toBe(window.location.origin);
  });
  it('map local origins onto the page origin in remote-demo mode', () => {
    global.__REMOTE_DEMO__ = origins;
    const page = window.location.origin;
    expect(
      browserUrl('http://auth.platform.localhost:4321/account/login?x=1'),
    ).toBe(`${page}/store/auth.platform/account/login?x=1`);
    expect(browserUrl('/vendor')).toBe('/vendor');
    expect(browserOrigin('http://manna.localhost:4321')).toBe(page);
    expect(browserOrigin('https://shop.example')).toBe('https://shop.example');
    // The backend still receives its configured admin origin.
    expect(adminIdentityOrigin()).toBe('http://localhost:4322');
  });
});

type Seen = {
  upstream: UpstreamName;
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: string;
};

describe('remote demo proxy translation', () => {
  const seen: Seen[] = [];
  const upstreams: Server[] = [];
  let proxy: Server;
  let port = 0;
  let storefrontPort = 0;
  let vendurePort = 0;
  let gate = '';

  beforeAll(async () => {
    const urls = {} as Record<UpstreamName, URL>;
    for (const name of ['storefront', 'admin', 'vendure'] as const) {
      const server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString('latin1');
          seen.push({
            upstream: name,
            method: req.method!,
            url: req.url!,
            headers: req.headers,
            body,
          });
          const site = `http://${req.headers.host}`;
          if (name === 'storefront' && req.url === '/page') {
            res.writeHead(200, {
              'content-type': 'text/html; charset=utf-8',
              'content-security-policy': `frame-ancestors http://localhost:4322; form-action ${site}/storefront-editor-preview/render`,
              'set-cookie': [
                'account-correlation=c1; Path=/auth/callback; HttpOnly; SameSite=Lax',
              ],
            });
            return res.end(
              `<a href="${site}/products">self</a><a href="http://localhost:4322/vendor">admin</a><img src="http://localhost:${vendurePort}/assets/preview/x.jpg"><input name="origin" value="${site}">`,
            );
          }
          if (name === 'storefront' && req.url === '/to-central') {
            res.writeHead(302, {
              location: `http://auth.platform.localhost:${storefrontPort}/account/login?origin=${encodeURIComponent(site)}`,
            });
            return res.end();
          }
          if (name === 'storefront' && req.url === '/to-admin') {
            res.writeHead(303, {
              location: 'http://localhost:4322/auth/account?code=c',
            });
            return res.end();
          }
          if (name === 'vendure') {
            res.writeHead(200, {
              'content-type': 'application/json',
              'set-cookie': 'session=s; Path=/; HttpOnly; SameSite=Lax',
            });
            return res.end(
              JSON.stringify({
                preview: `http://localhost:${vendurePort}/assets/preview/a.jpg`,
                canonicalOrigin: `http://manna-roots.localhost:${storefrontPort}`,
                admin: 'http://localhost:4322',
              }),
            );
          }
          res.writeHead(200, { 'content-type': 'text/plain' });
          res.end(name);
        });
      });
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
      );
      upstreams.push(server);
      urls[name] = new URL(
        `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      );
    }
    storefrontPort = Number(urls.storefront.port);
    vendurePort = Number(urls.vendure.port);
    const config: RemoteDemoConfig = {
      port: 0,
      accessCode: CODE,
      upstreams: urls,
      publicOrigin: () => P,
      fsRoots,
      maxBodyBytes: 64 * 1024,
      sessionSeconds: 60,
      log: () => {},
      internal: internalOrigins(
        {
          PLATFORM_ACCOUNT_ORIGIN: `http://auth.platform.localhost:${storefrontPort}`,
        },
        urls,
      ),
    };
    proxy = await startRemoteDemoProxy(config);
    port = (proxy.address() as AddressInfo).port;
    const login = await send(
      'POST',
      '/__remote-demo/login',
      { origin: P, 'content-type': 'application/x-www-form-urlencoded' },
      new URLSearchParams({ code: CODE, next: '/' }).toString(),
    );
    gate = String(login.headers['set-cookie']).split(';')[0]!;
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
    body?: string | Buffer,
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
  const site = (id: string) => `${gate}; ${SITE_COOKIE}=${id}`;

  it('requires the access gate for site selection', async () => {
    const before = seen.length;
    const response = await send('GET', '/store/manna-roots/products', {
      accept: 'text/html',
    });
    expect(response.status).toBe(303);
    expect(response.headers.location).toMatch(/^\/__remote-demo\/login/);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(seen.length).toBe(before);
  });

  it('selects a site with a proxy-owned cookie and continues at the path', async () => {
    const response = await send('GET', '/store/manna-roots/products?page=2', {
      cookie: gate,
    });
    expect(response.status).toBe(303);
    expect(response.headers.location).toBe('/products?page=2');
    expect(String(response.headers['set-cookie'])).toBe(
      `${SITE_COOKIE}=manna-roots; Path=/; HttpOnly; Secure; SameSite=Lax`,
    );
    expect(response.headers['x-frame-options']).toBeUndefined();
  });

  it('resolves tenants from the selected site, defaulting to the central account', async () => {
    await send('GET', '/products/x', { cookie: site('manna-roots') });
    expect(seen.at(-1)).toMatchObject({
      upstream: 'storefront',
      url: '/products/x',
    });
    expect(seen.at(-1)!.headers.host).toBe(
      `manna-roots.localhost:${storefrontPort}`,
    );
    await send('GET', '/', { cookie: site('boerne-farmers-market') });
    expect(seen.at(-1)!.headers.host).toBe(
      `boerne-farmers-market.localhost:${storefrontPort}`,
    );
    await send('GET', '/', { cookie: site('localhost') });
    expect(seen.at(-1)!.headers.host).toBe(`localhost:${storefrontPort}`);
    for (const cookie of [gate, site('Evil.example'), site('x.localhost')]) {
      await send('GET', '/account/login', { cookie });
      expect(seen.at(-1)!.headers.host).toBe(
        `auth.platform.localhost:${storefrontPort}`,
      );
    }
  });

  it('presents the validated public Origin as the initiating local origin', async () => {
    const post = (referer: string | undefined, target = '/api/shop') =>
      send(
        'POST',
        target,
        {
          cookie: site('manna-roots'),
          origin: P,
          'content-type': 'application/json',
          ...(referer ? { referer } : {}),
        },
        '{}',
      );
    await post(`${P}/products/x?y=1`);
    expect(seen.at(-1)!.headers.origin).toBe(
      `http://manna-roots.localhost:${storefrontPort}`,
    );
    expect(seen.at(-1)!.headers.referer).toBe(
      `http://manna-roots.localhost:${storefrontPort}/products/x?y=1`,
    );
    await post(undefined);
    expect(seen.at(-1)!.headers.origin).toBe(
      `http://manna-roots.localhost:${storefrontPort}`,
    );
    // An admin page (the editor) talking to the site keeps its admin origin.
    await post(`${P}/vendor/storefront`);
    expect(seen.at(-1)!.headers.origin).toBe('http://localhost:4322');
    await post(`${P}/vendor/storefront`, '/admin-api');
    expect(seen.at(-1)).toMatchObject({ upstream: 'vendure' });
    expect(seen.at(-1)!.headers.origin).toBe('http://localhost:4322');
    expect(seen.at(-1)!.headers.host).toBe(`localhost:${vendurePort}`);
    // Foreign or opaque origins are still refused before any upstream.
    const before = seen.length;
    for (const origin of ['null', 'https://evil.example', `${P}.evil.example`])
      expect(
        (
          await send(
            'POST',
            '/api/shop',
            { cookie: site('manna-roots'), origin },
            '{}',
          )
        ).status,
      ).toBe(403);
    expect(seen.length).toBe(before);
  });

  it('keeps cookies in per-site partitions', async () => {
    const jar = `${site('manna-roots')}; session=admin; rd~manna-roots~customer=m; rd~auth.platform~platform-unified-account=c`;
    await send('GET', '/account', { cookie: jar });
    expect(seen.at(-1)!.headers.cookie).toBe('customer=m');
    await send('POST', '/admin-api', { cookie: jar, origin: P }, '{}');
    expect(seen.at(-1)!.headers.cookie).toBe('session=admin');
    await send('GET', '/vendor', { cookie: jar });
    expect(seen.at(-1)).toMatchObject({ upstream: 'admin' });
    expect(seen.at(-1)!.headers.cookie).toBe('session=admin');
  });

  it('translates site responses: links, redirects, cookies and CSP', async () => {
    const page = await send('GET', '/page', { cookie: site('manna-roots') });
    expect(page.body).toBe(
      `<a href="${P}/products">self</a><a href="${P}/vendor">admin</a><img src="${P}/assets/preview/x.jpg"><input name="origin" value="http://manna-roots.localhost:${storefrontPort}">`,
    );
    expect(Number(page.headers['content-length'])).toBe(
      Buffer.byteLength(page.body),
    );
    expect(page.headers['set-cookie']).toEqual([
      'rd~manna-roots~account-correlation=c1; Path=/auth/callback; HttpOnly; SameSite=Lax; Secure',
    ]);
    expect(page.headers['content-security-policy']).toBe(
      `frame-ancestors ${P}; form-action ${P}/storefront-editor-preview/render`,
    );
    const central = await send('GET', '/to-central', {
      cookie: site('manna-roots'),
    });
    // Handoff identity (`origin=`) stays the local canonical origin the backend validates.
    expect(central.headers.location).toBe(
      `${P}/store/auth.platform/account/login?origin=${encodeURIComponent(`http://manna-roots.localhost:${storefrontPort}`)}`,
    );
    const admin = await send('GET', '/to-admin', { cookie: gate });
    expect(admin.headers.location).toBe(`${P}/auth/account?code=c`);
    expect(JSON.stringify(admin.headers)).not.toMatch(/localhost/);
  });

  it('round-trips Vendure asset URLs without leaking the tunnel into saved data', async () => {
    const response = await send(
      'POST',
      '/admin-api',
      {
        cookie: gate,
        origin: P,
        referer: `${P}/vendor/storefront`,
        'content-type': 'application/json',
      },
      JSON.stringify({ variables: { image: `${P}/assets/source/b.jpg` } }),
    );
    expect(JSON.parse(seen.at(-1)!.body)).toEqual({
      variables: {
        image: `http://localhost:${vendurePort}/assets/source/b.jpg`,
      },
    });
    expect(JSON.parse(response.body)).toEqual({
      preview: `${P}/assets/preview/a.jpg`,
      // GraphQL data other than asset URLs is never rewritten.
      canonicalOrigin: `http://manna-roots.localhost:${storefrontPort}`,
      admin: 'http://localhost:4322',
    });
    expect(String(response.headers['set-cookie'])).toBe(
      'session=s; Path=/; HttpOnly; SameSite=Lax; Secure',
    );
  });

  it('restores nested preview form images before Astro authorizes the draft', async () => {
    const config = {
      homepage: { image: `${P}/assets/preview/hero.jpg` },
      about: {
        sections: [
          { imageAssetId: '12', image: `${P}/assets/source/story.jpg` },
        ],
      },
      template: {
        settings: {
          header: {
            logo: { assetId: '13', url: `${P}/assets/preview/logo.png` },
          },
          sections: [
            { photo: { assetId: '14', url: `${P}/assets/preview/theme.jpg` } },
          ],
        },
      },
      invalid: [
        'https://foreign.example/assets/preview/a.jpg',
        `${P}.evil.example/assets/preview/a.jpg`,
        `${P}/other/a.jpg`,
        '/assets/preview/a.jpg',
        `${P}/assets/preview/not-the-selected-asset.jpg`,
      ],
      local: `http://localhost:${vendurePort}/assets/preview/local.jpg`,
      title: 'Roots & greens + café',
    };
    const payload = {
      token: 'a'.repeat(43),
      path: '/about',
      scroll: 120,
      config,
    };
    const body = new URLSearchParams({
      payload: JSON.stringify(payload),
      extra: 'keep + &',
    }).toString();
    const response = await send(
      'POST',
      '/storefront-editor-preview/render?view=1',
      {
        cookie: site('manna-roots'),
        origin: P,
        referer: `${P}/storefront-editor-preview/`,
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'content-length': String(Buffer.byteLength(body)),
      },
      body,
    );
    expect(response.status).toBe(200);
    const last = seen.at(-1)!;
    expect(last.upstream).toBe('storefront');
    const form = new URLSearchParams(last.body);
    const restored = JSON.parse(form.get('payload')!);
    const local = `http://localhost:${vendurePort}`;
    expect(restored).toEqual({
      ...payload,
      config: {
        ...config,
        homepage: { image: `${local}/assets/preview/hero.jpg` },
        about: {
          sections: [
            { imageAssetId: '12', image: `${local}/assets/source/story.jpg` },
          ],
        },
        template: {
          settings: {
            header: {
              logo: { assetId: '13', url: `${local}/assets/preview/logo.png` },
            },
            sections: [
              {
                photo: {
                  assetId: '14',
                  url: `${local}/assets/preview/theme.jpg`,
                },
              },
            ],
          },
        },
        invalid: [
          ...config.invalid.slice(0, -1),
          `${local}/assets/preview/not-the-selected-asset.jpg`,
        ],
      },
    });
    // Invalid references still reach the existing validator unchanged. Asset
    // IDs, token, navigation, Unicode and unrelated fields retain their values.
    expect(restored.config.invalid.slice(0, -1)).toEqual(
      config.invalid.slice(0, -1),
    );
    expect(restored.config.invalid).not.toContain(
      restored.config.about.sections[0].image,
    );
    expect(form.get('extra')).toBe('keep + &');
    expect(Number(last.headers['content-length'])).toBe(
      Buffer.byteLength(last.body),
    );
  });

  it('leaves preview-shaped payloads on other storefront routes untouched', async () => {
    const body = new URLSearchParams({
      payload: JSON.stringify({ image: `${P}/assets/preview/a.jpg` }),
    }).toString();
    await send(
      'POST',
      '/api/shop',
      {
        cookie: site('manna-roots'),
        origin: P,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    );
    expect(seen.at(-1)!.body).toBe(body);
  });

  it('streams multipart uploads to Vendure unchanged', async () => {
    const boundary = 'remote-demo-boundary';
    const file = Buffer.from([0, 1, 2, 250, 251, 252, 13, 10]);
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="operations"\r\n\r\n{"query":"m","variables":{"file":null}}\r\n--${boundary}\r\nContent-Disposition: form-data; name="0"; filename="a.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
      file,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const response = await send(
      'POST',
      '/admin-api',
      {
        cookie: `${gate}; session=admin`,
        origin: P,
        referer: `${P}/vendor/documents`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'apollo-require-preflight': 'true',
        'vendure-token': 'channel',
        'content-length': String(body.length),
      },
      body,
    );
    expect(response.status).toBe(200);
    const last = seen.at(-1)!;
    expect(Buffer.from(last.body, 'latin1').equals(body)).toBe(true);
    expect(last.headers['apollo-require-preflight']).toBe('true');
    expect(last.headers['vendure-token']).toBe('channel');
    expect(last.headers.cookie).toBe('session=admin');
    expect(last.headers.origin).toBe('http://localhost:4322');
  });

  it('still blocks internal endpoints with a site selected', async () => {
    const before = seen.length;
    for (const target of [
      '/shop-api',
      '/graphiql/admin',
      '/mailbox',
      '/health',
    ])
      expect(
        (await send('POST', target, { cookie: site('manna-roots'), origin: P }))
          .status,
      ).toBe(404);
    expect(seen.length).toBe(before);
  });
});
