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
const application = process.argv.includes('--application');
const privateHost = 'api.railway.internal';
const browserIp = '203.0.113.15';
const credentials = Array.from({ length: 5 }, () =>
  randomBytes(32).toString('hex'),
);
const [adminKey, storeKey, apiKey, ssrKey, accountKey] = credentials;
const children: ChildProcess[] = [];
const tenants = new Map([
  [vendor, '11'],
  [market, '12'],
  [unpublished, '13'],
]);
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
      displayName: 'Pilot ' + id,
      canonicalHostname: host,
      canonicalOrigin: 'https://' + host,
      subject: { id },
      shopContext: { channelToken: 'channel-' + id },
      published: host !== unpublished,
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
    return json(400, { code: 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE' });
  }
  if (
    req.url === '/shop-api' &&
    req.headers['x-storefront-bridge'] === accountKey
  ) {
    shopCalls++;
    return json(200, {
      data: {
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
    STOREFRONT_PILOT_HOSTS: [vendor, market, inactive, unpublished].join(' '),
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
  launch(process.execPath, ['--import', 'tsx', 'scripts/serve-admin.ts'], {
    ...env,
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
    spawnSync(process.execPath, ['scripts/hosted-gateway.mjs'], {
      env: {
        ...gatewayEnv,
        TUNNEL_TOKEN: 'synthetic-connector-token',
        MARKET_ADMIN_UPSTREAM: 'http://admin.railway.internal:4322',
        MARKET_STOREFRONT_UPSTREAM: 'http://storefront.railway.internal:4321',
        MARKET_API_UPSTREAM: 'http://api.railway.internal:3000',
        ...overrides,
      },
    });
  assert.equal(validateGateway().status, 0);
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
    gatewayEnv,
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
    assert.match(
      String(result.headers['content-security-policy']),
      /frame-src https:\/\/vendor-pilot\.example\.com https:\/\/market-pilot\.example\.com/,
    );
  }
  assert.match(
    String((await hit(admin, '/market')).headers['content-security-policy']),
    /frame-src 'none'/,
  );
  const login = await hit(auth, '/account/login', {
    'X-Market-Ingress': 'forged',
    'X-Forwarded-Host': vendor,
  });
  assert.equal(login.status, 200);
  assert.match(login.body, /<form/);
  assert.equal(login.headers['x-robots-tag'], 'noindex, nofollow');
  assert.ok(login.headers['strict-transport-security']);
  assert.equal((await hit(auth, '/shop')).status, 404);
  assert.equal((await hit('www.example.com', '/')).status, 421);
  assert.equal((await hit('unknown.example.com', '/')).status, 421);
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
    assert.equal(
      published.body.includes('https://' + host + '/'),
      host !== unpublished,
    );
    assert.equal(published.headers['x-robots-tag'], 'noindex, nofollow');
    assert.match(published.headers['cache-control']!, /no-store/);
    const frame = await hit(host, '/storefront-editor-preview/');
    assert.equal(frame.status, 200);
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
    '/payments/stripe/oauth/callback',
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
  assert.equal(publicApiCalls, 2);
  for (const result of [login, adminApi]) {
    assert.ok(!result.body.includes(privateHost));
    assert.ok(
      credentials.every((secret) => !JSON.stringify(result).includes(secret)),
    );
  }
  console.log(
    `Hosted gateway, Admin, Astro and synthetic private API checks passed in ${application ? 'application' : 'Access'} mode.`,
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
