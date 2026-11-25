import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, request } from 'node:http';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { join } from 'node:path';
import { defaultStorefrontAppearance } from '@market/theme/storefront';
import {
  frontendListener,
  hostedFrontend,
  storefrontPrivateApi,
} from '@market/config/hosted';

const admin = 'admin.example.com';
const auth = 'auth.example.com';
const api = 'api.example.com';
const vendor = 'vendor-pilot.example.com';
const market = 'market-pilot.example.com';
const inactive = 'inactive-pilot.example.com';
const unpublished = 'draft-pilot.example.com';
const dynamic = process.argv.includes('--dynamic');
const application = dynamic || process.argv.includes('--application');
const cedar = 'cedar-bend.example.com';
const legacyVendor = 'staging-vendor.example.com';
const legacyMarket = 'staging-market.example.com';
const privateHost = 'api.railway.internal';
const browserIp = '203.0.113.15';
const imageOrigin = 'https://' + api;
const customerSession = 'synthetic-customer-session';
const credentials = Array.from({ length: 5 }, () =>
  randomBytes(32).toString('hex'),
);
const [adminKey, storeKey, apiKey, ssrKey, accountKey] = credentials;
const children: ChildProcess[] = [];
const tenants = new Map([
  [vendor, '11'],
  [market, '12'],
  [unpublished, '13'],
  [legacyVendor, '15'],
  [legacyMarket, '16'],
]);
const drafts = new Set([unpublished]);
const snapshots = new Map<string, string>();
const resolved: string[] = [];
let previews = 0;
let shopCalls = 0;
let bridgeCalls = 0;
let publicApiCalls = 0;
const mock = createServer(async (req, res) => {
  const json = (status: number, dto: unknown) =>
    res
      .writeHead(status, {
        'Content-Type': 'application/json',
      })
      .end(JSON.stringify(dto));
  if (req.headers.host === api) {
    publicApiCalls++;
    const clean =
      req.headers['x-market-ingress'] === apiKey &&
      req.headers['x-market-client-ip'] === browserIp &&
      !Object.keys(req.headers).some((name) =>
        /^(?:forwarded|x-forwarded-|cf-|x-market-(?:ssr|storefront-host)|x-(?:account|storefront)-bridge)/.test(
          name,
        ),
      );
    if (req.url?.startsWith('/payments/stripe/')) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      return json(clean ? 200 : 403, {
        target: req.url,
        method: req.method,
        signature: req.headers['stripe-signature'],
        body: Buffer.concat(chunks).toString('utf8'),
      });
    }
    return json(clean ? 200 : 403, { clean });
  }
  if (
    req.headers.host !== privateHost + ':' + apiPort ||
    req.headers['x-market-ssr'] !== ssrKey ||
    req.headers['x-market-client-ip'] !== browserIp
  )
    return json(403, {});
  if (req.url === '/storefront-context/internal-resolve') {
    const host = String(req.headers['x-market-storefront-host']);
    const id = tenants.get(host);
    resolved.push(host);
    if (!id) return json(404, {});
    return json(200, {
      storefrontId: id,
      storefrontKey: 'pilot-' + id,
      kind: host === market ? 'MARKET' : 'VENDOR',
      displayName: snapshots.get(host) ?? 'Pilot ' + id,
      canonicalHostname: host,
      canonicalOrigin: 'https://' + host,
      subject: { id },
      shopContext: { channelToken: 'channel-' + id },
      published: !drafts.has(host),
    });
  }
  if (req.url === '/admin-api') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const { variables } = JSON.parse(Buffer.concat(chunks).toString());
    previews++;
    return json(200, {
      data: {
        authorizeStorefrontPreview: {
          id: tenants.get(
            { V: vendor, M: market, U: unpublished }[
              variables.token[0] as 'V' | 'M' | 'U'
            ] ?? '',
          ),
        },
      },
    });
  }
  if (req.url === '/customer-account-bridge') {
    if (
      req.headers['x-account-bridge'] !== accountKey ||
      req.headers['x-account-origin'] !== 'https://' + auth
    )
      return json(403, {});
    bridgeCalls++;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const { action, central, kind } = JSON.parse(
      Buffer.concat(chunks).toString(),
    );
    if (central === customerSession) {
      if (action === 'centralProfile')
        return json(200, {
          profile: { phoneVerified: true },
          contexts: { affiliations: [] },
        });
      if (action === 'customerDashboard')
        return json(200, {
          markets: [],
          vendors: [],
          events: [],
          marketCount: 0,
          vendorCount: 0,
        });
      if (action === 'customerSubjects')
        return json(200, {
          hasMore: false,
          items: [
            {
              id: '1',
              name: `With image ${kind}`,
              image: profileImage(kind),
              following: false,
            },
            {
              id: '2',
              name: `Without image ${kind}`,
              image: null,
              following: false,
            },
          ],
        });
    }
    return json(400, { code: 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE' });
  }
  if (
    req.url === '/shop-api' &&
    req.headers['x-storefront-bridge'] === accountKey
  ) {
    shopCalls++;
    return json(200, {
      data: {
        currentCheckoutStatus: null,
        me: null,
        activeOrder: null,
        products: { items: [], totalItems: 0 },
        marketStorefrontOccurrences: { items: [], totalItems: 0 },
        publicMarketDayState: {
          serverNow: new Date().toISOString(),
          occurrences: [],
        },
      },
    });
  }
  return json(404, {});
});

function profileImage(kind: string) {
  return `${imageOrigin}/assets/preview/a6/${kind.toLowerCase()}-profile__preview.png`;
}

function assertImagePolicy(policies: string[] | undefined) {
  assert.equal(policies?.length, 1, 'a single enforcing CSP response header');
  const directives = policies![0]!.split(';').map((entry) => entry.trim());
  assert.deepEqual(
    directives.filter((entry) => entry.startsWith('img-src ')),
    [`img-src 'self' data: ${imageOrigin}`],
  );
  assert.doesNotMatch(
    directives.find((entry) => entry.startsWith('script-src '))!,
    /unsafe-inline|unsafe-eval|cloudflareinsights/,
  );
}

function localPort(server: ReturnType<typeof createServer>) {
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return address.port;
}

async function freePort() {
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = localPort(server);
  server.close();
  return port;
}

function launch(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(command, args, {
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(child);
  return child;
}

function wire(
  port: number,
  host: string,
  path: string,
  options: {
    headers?: OutgoingHttpHeaders | readonly string[];
    method?: string;
    body?: string;
  } = {},
) {
  return new Promise<{
    status: number;
    headers: IncomingHttpHeaders;
    cspHeaders: string[] | undefined;
    body: string;
  }>((resolve, reject) => {
    const headers = Array.isArray(options.headers)
      ? options.headers
      : { ...options.headers, Host: host };
    const call = request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        headers,
        timeout: 5000,
        method: options.method ?? 'GET',
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode!,
            headers: response.headers,
            cspHeaders: response.headersDistinct['content-security-policy'],
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    call.on('timeout', () => call.destroy(new Error('HTTP probe timed out')));
    call.on('error', reject);
    call.end(options.body);
  });
}

let apiPort: number;
const caddyStorage = mkdtempSync(join(process.cwd(), '.b2-caddy-'));
try {
  const [adminPort, storePort, gatewayPort] = await Promise.all([
    freePort(),
    freePort(),
    freePort(),
  ]);
  mock.listen(0, '127.0.0.1');
  await once(mock, 'listening');
  apiPort = localPort(mock);
  // Only the synthetic processes resolve this one Railway name to loopback.
  const dnsHook = `
    import dns from 'node:dns';
    import { syncBuiltinESMExports } from 'node:module';
    const lookup = dns.lookup;
    dns.lookup = (host, ...args) => lookup(host === '${privateHost}' ? '127.0.0.1' : host, ...args);
    syncBuiltinESMExports();
  `;
  const env = {
    ...process.env,
    APP_ENV: 'production',
    NODE_ENV: 'production',
    DEPLOYMENT_ENV: 'staging',
    HOSTED_TRANSPORT: 'railway-private',
    HOST: '::',
    TRUSTED_PROXY_CIDRS: 'disabled',
    ADMIN_ORIGIN: 'https://' + admin,
    PLATFORM_ACCOUNT_ORIGIN: 'https://' + auth,
    SHOP_API_URL: 'https://' + api + '/shop-api',
    PUBLIC_ADMIN_API_URL: 'https://' + api + '/admin-api',
    ASSET_URL_PREFIX: 'https://' + api + '/assets/',
    FRONTEND_FIXTURE_MODE: 'false',
    STOREFRONT_PARENT_DOMAIN: 'example.com',
    STOREFRONT_ROUTING_MODE: dynamic ? 'dynamic' : 'explicit',
    STOREFRONT_PILOT_HOSTS: (dynamic
      ? [legacyVendor, legacyMarket]
      : [vendor, market, inactive, unpublished]
    ).join(' '),
    STAGING_TESTER_ACCESS: application ? 'provisioned' : 'closed',
    STAGING_ANONYMOUS_STOREFRONTS: application ? 'published' : 'disabled',
    SERVER_CERT_PATH: undefined,
    SERVER_KEY_PATH: undefined,
    ADMIN_PORT: undefined,
  };
  const adminListener = {
    ...env,
    PORT: String(adminPort),
    MARKET_INGRESS_KEY: adminKey,
  };
  assert.equal(
    frontendListener(adminListener, 'staging', 'admin').address,
    '::',
  );
  for (const change of [
    { MARKET_INGRESS_KEY: undefined },
    { HOSTED_TRANSPORT: undefined },
    { PORT: undefined },
    { PORT: '65536' },
    { HOST: '*' },
    { SERVER_KEY_PATH: 'conflicting.pem' },
    { ADMIN_PORT: '4341' },
    { TRUSTED_PROXY_CIDRS: '127.0.0.1/32' },
  ])
    assert.throws(() =>
      frontendListener({ ...adminListener, ...change }, 'staging', 'admin'),
    );
  assert.throws(() =>
    storefrontPrivateApi({
      ...env,
      INTERNAL_API_ORIGIN: 'http://outside.example.com:3000',
      MARKET_SSR_API_KEY: ssrKey,
    }),
  );
  assert.throws(() =>
    hostedFrontend({ ...env, STOREFRONT_PILOT_HOSTS: 'www.example.com' }, [
      env.ADMIN_ORIGIN,
      env.PLATFORM_ACCOUNT_ORIGIN,
      'https://' + api,
    ]),
  );
  assert.throws(() =>
    hostedFrontend({ ...env, STOREFRONT_PILOT_HOSTS: 'external.test' }, [
      env.ADMIN_ORIGIN,
      env.PLATFORM_ACCOUNT_ORIGIN,
      'https://' + api,
    ]),
  );
  assert.throws(
    () =>
      hostedFrontend(
        {
          ...env,
          STOREFRONT_ROUTING_MODE: 'dynamic',
          STAGING_TESTER_ACCESS: 'closed',
          STAGING_ANONYMOUS_STOREFRONTS: 'disabled',
        },
        [env.ADMIN_ORIGIN, env.PLATFORM_ACCOUNT_ORIGIN, 'https://' + api],
      ),
    /provisioned staging admission/,
  );
  launch(process.execPath, ['--import', 'tsx', 'scripts/serve-admin.ts'], {
    ...env,
    ASSET_URL_PREFIX: undefined,
    PORT: String(adminPort),
    MARKET_INGRESS_KEY: adminKey,
  });
  launch(
    process.execPath,
    [
      '--import',
      'tsx',
      '--import',
      'data:text/javascript,' + encodeURIComponent(dnsHook),
      'scripts/start-storefront.ts',
    ],
    {
      ...env,
      PORT: String(storePort),
      MARKET_INGRESS_KEY: storeKey,
      MARKET_SSR_API_KEY: ssrKey,
      PLATFORM_ACCOUNT_BRIDGE_KEY: accountKey,
      INTERNAL_API_ORIGIN: 'http://' + privateHost + ':' + apiPort,
    },
  );
  const gatewayEnv = {
    ...env,
    XDG_DATA_HOME: caddyStorage,
    XDG_CONFIG_HOME: caddyStorage,
    APPDATA: caddyStorage,
    GATEWAY_PORT: String(gatewayPort),
    MARKET_ADMIN_HOST: admin,
    MARKET_ACCOUNT_HOST: auth,
    MARKET_API_HOST: api,
    MARKET_ADMIN_UPSTREAM: 'http://127.0.0.1:' + adminPort,
    MARKET_ADMIN_INGRESS_KEY: adminKey,
    MARKET_STOREFRONT_UPSTREAM: 'http://127.0.0.1:' + storePort,
    MARKET_STOREFRONT_INGRESS_KEY: storeKey,
    MARKET_API_UPSTREAM: 'http://127.0.0.1:' + apiPort,
    MARKET_API_INGRESS_KEY: apiKey,
    STAGING_INGRESS_MODE: application ? 'application' : undefined,
  };
  const validateGateway = (overrides: NodeJS.ProcessEnv = {}) =>
    spawnSync(
      process.execPath,
      ['scripts/hosted-gateway.mjs', 'storefront-expression'],
      {
        encoding: 'utf8',
        env: {
          ...gatewayEnv,
          TUNNEL_TOKEN: 'synthetic-connector-token',
          MARKET_ADMIN_UPSTREAM: 'http://admin.railway.internal:4322',
          MARKET_STOREFRONT_UPSTREAM: 'http://storefront.railway.internal:4321',
          MARKET_API_UPSTREAM: 'http://api.railway.internal:3000',
          ...overrides,
        },
      },
    );
  const validation = validateGateway();
  assert.equal(validation.status, 0, validation.stderr);
  assert.equal(validateGateway({ STOREFRONT_ROUTING_MODE: 'all' }).status, 1);
  assert.equal(
    validateGateway({ STOREFRONT_PILOT_HOSTS: 'staging-db.example.com' })
      .status,
    1,
  );
  assert.equal(
    validateGateway({ STOREFRONT_PILOT_HOSTS: undefined }).status,
    dynamic ? 0 : 1,
  );
  if (dynamic) {
    assert.equal(
      validateGateway({ STOREFRONT_PARENT_DOMAIN: undefined }).status,
      1,
    );
    assert.equal(validateGateway({ STAGING_INGRESS_MODE: 'access' }).status, 1);
  }
  assert.equal(validateGateway({ STAGING_INGRESS_MODE: 'open' }).status, 1);
  assert.equal(validateGateway({ STAGING_INGRESS_MODE: '' }).status, 1);
  assert.equal(
    validateGateway({
      DEPLOYMENT_ENV: 'production',
      STAGING_INGRESS_MODE: 'application',
    }).status,
    1,
  );
  launch(
    'caddy',
    ['run', '--config', 'scripts/Caddyfile.hosted', '--adapter', 'caddyfile'],
    { ...gatewayEnv, STOREFRONT_HOST_EXPRESSION: validation.stdout.trim() },
  );
  const healthHost = 'healthcheck.railway.app';
  for (const [name, port] of [
    ['Admin', adminPort],
    ['Astro', storePort],
    ['gateway', gatewayPort],
  ] as const) {
    let ready = false;
    for (let attempt = 0; attempt < 60 && !ready; attempt++) {
      ready = await wire(port, healthHost, '/health/ready').then(
        (r) => r.status === 200,
        () => false,
      );
      if (!ready) await delay(100);
    }
    assert.ok(ready, `${name} listener readiness`);
    assert.equal(
      (await wire(port, healthHost, '/health/live', { method: 'HEAD' })).body,
      '',
    );
    assert.notEqual(
      (await wire(port, healthHost, '/health/ready?extra')).status,
      200,
    );
    assert.notEqual(
      (await wire(port, healthHost, '/account/login')).status,
      200,
    );
  }
  const edge = {
    'X-Forwarded-Proto': 'https',
    'CF-Connecting-IP': browserIp,
    ...(!application && {
      'Cf-Access-Jwt-Assertion': 'synthetic-connector-verified',
    }),
  };
  assert.equal(
    (await wire(gatewayPort, admin, '/vendor/storefront')).status,
    403,
  );
  assert.equal(
    (
      await wire(gatewayPort, auth, '/account/login', {
        headers: {
          'X-Forwarded-Proto': 'https',
          'CF-Connecting-IP': browserIp,
        },
      })
    ).status,
    application ? 200 : 403,
  );
  assert.equal(
    (
      await wire(gatewayPort, auth, '/account/login', {
        headers: {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-For': browserIp,
          'X-Market-Client-IP': browserIp,
        },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await wire(gatewayPort, admin, '/', {
        headers: { ...edge, 'X-Forwarded-Proto': 'http' },
      })
    ).status,
    403,
  );
  for (const [port, host] of [
    [adminPort, admin],
    [storePort, auth],
  ] as const) {
    assert.equal((await wire(port, host, '/')).status, 403);
    assert.equal((await wire(port, host, '/', { headers: edge })).status, 400);
    assert.equal(
      (await wire(port, host, '/', { headers: ['Host', host, 'Host', vendor] }))
        .status,
      400,
    );
  }
  const hit = (host: string, path: string, headers: OutgoingHttpHeaders = {}) =>
    wire(gatewayPort, host, path, { headers: { ...edge, ...headers } });
  for (const path of ['/vendor/storefront', '/market/storefront/?channel=2']) {
    const result = await hit(admin, path);
    assert.equal(result.status, 200);
    assertImagePolicy(result.cspHeaders);
    assert.match(
      String(result.headers['content-security-policy']),
      dynamic
        ? /frame-src https:\/\/\*\.example\.com;/
        : /frame-src https:\/\/vendor-pilot\.example\.com https:\/\/market-pilot\.example\.com/,
    );
  }
  for (const path of [
    '/vendor/settings/profile',
    '/market/settings/profile',
    '/vendor/products',
  ]) {
    const result = await hit(admin, path);
    assert.equal(result.status, 200);
    assertImagePolicy(result.cspHeaders);
    assert.match(
      String(result.headers['content-security-policy']),
      /frame-src 'none'/,
    );
    assert.doesNotMatch(result.body, /http-equiv="content-security-policy"/i);
  }
  assert.match(
    String((await hit(admin, '/market')).headers['content-security-policy']),
    /frame-src 'none'/,
  );
  for (const path of [
    '/vendor/booths',
    '/vendor/markets',
    '/vendor/applications',
  ]) {
    const result = await hit(admin, path);
    assert.equal(result.status, 200);
    const policy = String(result.headers['content-security-policy']);
    assert.match(policy, /script-src 'self' https:\/\/js\.stripe\.com/);
    assert.match(policy, /connect-src [^;]*https:\/\/api\.stripe\.com/);
    assert.match(
      policy,
      /frame-src https:\/\/js\.stripe\.com https:\/\/hooks\.stripe\.com/,
    );
    assertImagePolicy(result.cspHeaders);
  }
  const login = await hit(auth, '/account/login', {
    'X-Market-Ingress': 'forged',
    'X-Forwarded-Host': vendor,
  });
  assert.equal(login.status, 200);
  assert.match(login.body, /<form/);
  assertImagePolicy(login.cspHeaders);
  assert.doesNotMatch(login.body, /http-equiv="content-security-policy"/i);
  for (const [section, kind, icon] of [
    ['markets', 'MARKET', 'store'],
    ['vendors', 'VENDOR', 'user-round'],
  ] as const) {
    const page = await hit(auth, '/account/' + section, {
      Cookie: 'platform-unified-account=' + customerSession,
    });
    assert.equal(page.status, 200);
    assertImagePolicy(page.cspHeaders);
    assert.match(page.headers['cache-control']!, /no-store/);
    assert.doesNotMatch(page.body, /http-equiv="content-security-policy"/i);
    for (const tile of ['markets-identity-icon', 'markets-next-art']) {
      const tiles = [
        ...page.body.matchAll(
          new RegExp(
            `<span class="${tile}(?: markets-identity-photo)?"[^>]*>\\s*` +
              `<span[^>]*class="farmstand-icon farmstand-icon-${icon}"[^>]*></span>(.*?)</span>`,
            'gs',
          ),
        ),
      ];
      assert.ok(
        tiles.some((match) =>
          match[1]?.includes(`src="${profileImage(kind)}"`),
        ),
      );
      assert.ok(tiles.some((match) => !match[1]?.includes('<img')));
    }
  }
  assert.equal(login.headers['x-robots-tag'], 'noindex, nofollow');
  assert.ok(login.headers['strict-transport-security']);
  assert.equal((await hit(auth, '/shop')).status, 404);
  assert.equal((await hit('www.example.com', '/')).status, 421);
  assert.equal(
    (await hit('unknown.example.com', '/')).status,
    dynamic ? 404 : 421,
  );
  assert.equal((await hit(inactive, '/shop')).status, 404);
  if (application) {
    assert.equal((await hit(inactive, '/')).status, 404);
    assert.equal((await hit(unpublished, '/shop')).status, 404);
    assert.equal((await hit(auth, '/account/signup')).status, 403);
    assert.equal((await hit(auth, '/account/onboarding/vendor')).status, 403);
    const before = bridgeCalls;
    for (const action of [
      'register',
      'resendPhoneRegistration',
      'verifyPhoneRegistration',
      'requestRecovery',
      'requestRecoveryPhone',
      'saveOnboarding',
    ]) {
      assert.equal(
        (
          await wire(gatewayPort, auth, '/api/account', {
            method: 'POST',
            headers: {
              ...edge,
              Origin: 'https://' + auth,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ action }).toString(),
          })
        ).status,
        403,
      );
    }
    assert.equal(bridgeCalls, before);
    assert.equal(
      (
        await wire(gatewayPort, market, '/api/market-application', {
          method: 'POST',
          headers: {
            ...edge,
            Origin: 'https://' + market,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountAnswer: 'NO',
            slug: 'test',
            versionId: 1,
            idempotencyKey: 'test',
            answers: {},
            occurrenceIds: [],
            rentals: [],
          }),
        })
      ).status,
      403,
    );
  }
  for (const host of [vendor, market, ...(application ? [unpublished] : [])]) {
    const published = await hit(host, '/');
    assert.equal(published.status, host === unpublished ? 404 : 200);
    assertImagePolicy(published.cspHeaders);
    assert.doesNotMatch(
      published.body,
      /http-equiv="content-security-policy"/i,
    );
    assert.equal(
      published.body.includes('https://' + host + '/'),
      host !== unpublished,
    );
    assert.equal(published.headers['x-robots-tag'], 'noindex, nofollow');
    assert.match(published.headers['cache-control']!, /no-store/);
    const frame = await hit(host, '/storefront-editor-preview/');
    assert.equal(frame.status, 200);
    assertImagePolicy(frame.cspHeaders);
    assert.equal(frame.headers['x-frame-options'], undefined);
    assert.match(
      String(frame.headers['content-security-policy']),
      /frame-ancestors https:\/\/admin\.example\.com/,
    );
    const unrelated = await hit(host, '/storefront-editor-preview-extra');
    assert.equal(unrelated.status, 404);
    assert.equal(unrelated.headers['x-frame-options'], 'DENY');
    const render = (token: string, origin: string) =>
      wire(gatewayPort, host, '/storefront-editor-preview/render', {
        method: 'POST',
        headers: {
          ...edge,
          Origin: origin,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          payload: JSON.stringify({
            token,
            path: '/',
            scroll: 0,
            config: defaultStorefrontAppearance,
          }),
        }).toString(),
      });
    const correct = host === vendor ? 'V' : host === market ? 'M' : 'U';
    const draft = await render(correct.repeat(43), 'https://' + host);
    assert.equal(draft.status, 200);
    assertImagePolicy(draft.cspHeaders);
    assert.match(draft.headers['cache-control']!, /no-store/);
    assert.equal(draft.headers['x-frame-options'], undefined);
    assert.equal(
      (
        await render(
          (correct === 'V' ? 'M' : 'V').repeat(43),
          'https://' + host,
        )
      ).status,
      403,
    );
    assert.equal(
      (await render(correct.repeat(43), 'https://' + auth)).status,
      403,
    );
  }
  assert.equal(previews, application ? 6 : 4);
  if (dynamic) {
    const before = resolved.length;
    for (const host of [
      'a.b.example.com',
      'example.com',
      'other.test',
      'bad_.example.com',
      'xn--market.example.com',
      'staging-db.example.com',
      'production-app.example.com',
      'media.example.com',
      'account.example.com',
      `${vendor}:8443`,
      `${admin}:443`,
      `${api}:65536`,
      `${vendor}.`,
      `${'x'.repeat(64)}.example.com`,
    ])
      assert.equal((await hit(host, '/')).status, 421, host);
    assert.equal(resolved.length, before);
    for (const host of [legacyVendor, legacyMarket])
      assert.equal((await hit(host, '/')).status, 200);
    for (const path of [
      '/',
      '/robots.txt',
      '/assets/vendor-mark.svg',
      '/storefront-editor-preview/',
    ])
      assert.equal((await hit(cedar, path)).status, 404, path);

    // The running topology picks up registry and publication changes without restarting any service.
    tenants.set(cedar, '14');
    drafts.add(cedar);
    assert.equal((await hit(cedar, '/account/login')).status, 404);
    assert.equal((await hit(cedar, '/')).status, 404);
    assert.equal((await hit(cedar, '/storefront-editor-preview/')).status, 200);
    snapshots.set(cedar, 'Cedar Bend Published');
    drafts.delete(cedar);
    const [farm, otherVendor, marketSite] = await Promise.all([
      hit(cedar, '/', {
        'X-Forwarded-Host': market,
        'X-Market-Storefront-Host': vendor,
      }),
      hit(vendor, '/'),
      hit(market, '/'),
    ]);
    for (const [result, name, host] of [
      [farm, 'Cedar Bend Published', cedar],
      [otherVendor, 'Pilot 11', vendor],
      [marketSite, 'Pilot 12', market],
    ] as const) {
      assert.equal(result.status, 200);
      assert.ok(result.body.includes(name));
      assert.ok(result.body.includes('https://' + host + '/'));
      assert.match(result.headers['cache-control']!, /private, no-store/);
      assert.doesNotMatch(
        String(result.headers['content-security-policy']),
        /stripe\.com/,
      );
    }
    assert.equal(
      (await hit(cedar, '/checkout?payment-order=42&payment_intent=fixture'))
        .headers.location,
      '/checkout?payment-order=42',
    );
    const checkout = await hit(cedar, '/checkout?payment-order=42');
    assert.equal(checkout.status, 200);
    assertImagePolicy(checkout.cspHeaders);
    assert.match(
      String(checkout.headers['content-security-policy']),
      /script-src [^;]*https:\/\/js\.stripe\.com/,
    );
    assert.match(
      String(checkout.headers['content-security-policy']),
      /frame-src https:\/\/js\.stripe\.com https:\/\/hooks\.stripe\.com/,
    );
    assert.doesNotMatch(checkout.body, /http-equiv="content-security-policy"/i);
    const account = await hit(cedar, '/account/login');
    assert.equal(account.status, 302);
    assert.match(account.headers['cache-control']!, /private, no-store/);
    const signIn = new URL(account.headers.location!);
    assert.equal(signIn.origin, 'https://' + auth);
    assert.equal(signIn.pathname, '/account/login');
    assert.equal(signIn.searchParams.get('origin'), 'https://' + cedar);
    assert.ok(
      account.headers['set-cookie']?.some((cookie) =>
        cookie.startsWith('account-correlation='),
      ),
    );
    assert.ok(
      account.headers['set-cookie']?.every(
        (cookie) => !/;\s*domain=/i.test(cookie),
      ),
    );
    for (const path of [
      '/shop-api',
      '/admin-api',
      '/customer-account-bridge',
      '/storefront-context/internal-resolve',
      '/health/ready',
      '/@vite/client',
    ])
      assert.equal((await hit(cedar, path)).status, 404, path);
    snapshots.set(cedar, 'Cedar Bend Republished');
    assert.ok((await hit(cedar, '/')).body.includes('Cedar Bend Republished'));
    assert.ok((await hit(vendor, '/')).body.includes('Pilot 11'));
    drafts.add(cedar);
    assert.equal((await hit(cedar, '/')).status, 404);
    assert.equal((await hit(cedar, '/checkout?payment-order=42')).status, 404);
    tenants.delete(cedar);
    assert.equal((await hit(cedar, '/assets/vendor-mark.svg')).status, 404);
  } else {
    assert.equal((await hit(cedar, '/')).status, 421);
  }
  assert.ok(
    resolved.includes(vendor) &&
      resolved.includes(market) &&
      resolved.includes(inactive),
  );
  assert.ok(shopCalls > 0);
  assert.equal(
    (
      await wire(gatewayPort, auth, '/api/account', {
        method: 'POST',
        headers: {
          ...edge,
          Origin: 'https://' + auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'unifiedLogin',
          email: 'synthetic@example.com',
          password: 'synthetic-input',
        }).toString(),
      })
    ).status,
    303,
  );
  assert.ok(bridgeCalls > 0);
  const adminApi = await hit(api, '/admin-api?query=%7Bme%7Bid%7D%7D', {
    'X-Market-Client-IP': '198.51.100.7',
    Forwarded: 'for=198.51.100.8;proto=http',
    'X-Real-IP': '198.51.100.9',
    'X-Market-SSR': 'forged',
    'X-Forwarded-For': '198.51.100.2',
    'X-Storefront-Bridge': 'forged',
  });
  assert.equal(adminApi.status, 200);
  assert.equal((await hit(api, '/assets/synthetic.svg')).status, 200);
  for (const path of [
    '/shop-api',
    '/customer-account-bridge',
    '/storefront-context/internal-resolve',
    '/health/live',
  ])
    assert.equal((await hit(api, path)).status, 404);
  for (const [path, method] of [
    ['/admin-api', 'PUT'],
    ['/assets/synthetic.svg', 'POST'],
  ])
    assert.equal(
      (await wire(gatewayPort, api, path!, { method, headers: edge })).status,
      404,
    );
  const callback = '/payments/stripe/oauth/callback?state=fixture&code=fixture';
  assert.deepEqual(JSON.parse((await hit(api, callback)).body), {
    target: callback,
    method: 'GET',
    body: '',
  });
  const body = '{ "object": "event", "fixture": "é" }\n';
  for (const scope of ['platform', 'connected']) {
    const path = `/payments/stripe/${scope}`;
    const headers = {
      ...edge,
      'Content-Type': 'application/json',
      'Stripe-Signature': 'test-signature-fixture',
    };
    assert.deepEqual(
      JSON.parse(
        (await wire(gatewayPort, api, path, { headers, method: 'POST', body }))
          .body,
      ),
      {
        target: path,
        method: 'POST',
        signature: 'test-signature-fixture',
        body,
      },
    );
    assert.equal((await hit(api, path)).status, 404);
    assert.equal(
      (
        await wire(gatewayPort, api, `${path}?fixture=1`, {
          headers,
          method: 'POST',
          body,
        })
      ).status,
      404,
    );
    assert.equal(
      (await wire(gatewayPort, vendor, path, { headers, method: 'POST', body }))
        .status,
      404,
    );
  }
  for (const path of [
    '/payments/stripe/oauth/callback/',
    '/payments/stripe/oauth/%63allback',
    '/payments/stripe/oauth//callback',
    '/payments/stripe/other',
  ])
    assert.equal((await hit(api, path)).status, 404);
  assert.equal((await hit(vendor, callback)).status, 404);
  assert.equal((await hit(api + ':443', callback)).status, 404);
  assert.equal(
    (await wire(gatewayPort, api, callback, { headers: edge, method: 'POST' }))
      .status,
    404,
  );
  assert.equal(publicApiCalls, 5);
  for (const result of [login, adminApi]) {
    assert.ok(!result.body.includes(privateHost));
    assert.ok(
      credentials.every((secret) => !JSON.stringify(result).includes(secret)),
    );
  }
  console.log(
    `Hosted gateway, Admin, Astro and synthetic private API checks passed in ${dynamic ? 'dynamic application' : application ? 'explicit application' : 'explicit Access'} mode.`,
  );
} finally {
  await Promise.all(
    children.map(async (child) => {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null)
        return;
      const stopped = once(child, 'exit');
      child.kill();
      await stopped;
    }),
  );
  mock.closeAllConnections();
  mock.close();
  rmSync(caddyStorage, { recursive: true, force: true });
}
