import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createServer,
  request,
  type Server,
  type IncomingHttpHeaders,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { isPrivateIPv4 } from '../scripts/demo-lan-network';
import { LAN_BROWSER_SCRIPT } from '../scripts/demo-lan-browser';
import { createDemoLanEntry } from '../scripts/demo-lan-entry';
import {
  createRemoteDemoProxy,
  type RemoteDemoConfig,
} from '../scripts/remote-demo-proxy-core';

describe('LAN demo', () => {
  it('redirects familiar LAN ports to the correct storefront and dashboard routes', async () => {
    for (const kind of ['storefront', 'admin'] as const) {
      const entry = createDemoLanEntry('http://192.168.1.196:8791', kind);
      await new Promise<void>((resolve) =>
        entry.listen(0, '127.0.0.1', resolve),
      );
      const base = `http://127.0.0.1:${(entry.address() as AddressInfo).port}`;
      try {
        const root = await fetch(base, { redirect: 'manual' });
        expect(root.status).toBe(302);
        expect(root.headers.get('location')).toBe(
          `http://192.168.1.196:8791${kind === 'admin' ? '/vendor' : '/store/localhost/'}`,
        );
        const account = await fetch(`${base}/account/login?context=vendor`, {
          redirect: 'manual',
        });
        expect(account.headers.get('location')).toBe(
          `http://192.168.1.196:8791${kind === 'storefront' ? '/store/auth.platform' : ''}/account/login?context=vendor`,
        );
        expect(
          (await fetch(base, { method: 'POST', redirect: 'manual' })).status,
        ).toBe(405);
      } finally {
        entry.closeAllConnections();
        await new Promise((resolve) => entry.close(resolve));
      }
    }
  });
  it('accepts private IPv4 addresses only', () => {
    for (const ip of [
      '192.168.1.196',
      '10.0.0.2',
      '172.16.0.1',
      '172.31.255.254',
    ])
      expect(isPrivateIPv4(ip)).toBe(true);
    for (const ip of [
      '127.0.0.1',
      '0.0.0.0',
      '8.8.8.8',
      '172.32.0.1',
      '192.168.1.999',
      '192.168.1.2.evil',
    ])
      expect(isPrivateIPv4(ip)).toBe(false);
  });

  it('generates UUID v4 values using browser cryptographic randomness on HTTP', () => {
    const crypto = {
      getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
      randomUUID: undefined as undefined | (() => string),
    };
    runInNewContext(LAN_BROWSER_SCRIPT, { crypto, Uint8Array });
    const ids = Array.from({ length: 100 }, () => crypto.randomUUID!());
    expect(new Set(ids).size).toBe(100);
    for (const id of ids)
      expect(id).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
      );
  });

  const origin = 'http://192.168.1.196:8791';
  let upstream: Server;
  let proxy: Server;
  let port: number;
  let config: RemoteDemoConfig;
  beforeAll(async () => {
    upstream = createServer((req, res) => {
      res.writeHead(200, {
        'content-type': 'text/html',
        'set-cookie':
          'platform-unified-account=test; Path=/; HttpOnly; SameSite=Lax',
        'content-security-policy':
          'connect-src http://localhost:4322 ws://localhost:4321',
      });
      res.end(
        `<html><head></head><body>${req.headers.host}|${req.headers.origin}|${req.headers.cookie}<a href="http://localhost:4322/vendor">Dashboard</a></body></html>`,
      );
    });
    await new Promise<void>((resolve) =>
      upstream.listen(0, '127.0.0.1', resolve),
    );
    const url = new URL(
      `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`,
    );
    config = {
      port: 8791,
      lanAddress: '192.168.1.196',
      publicOrigin: () => origin,
      accessCode: '',
      upstreams: { storefront: url, admin: url, vendure: url },
      fsRoots: { storefront: [], admin: [] },
      maxBodyBytes: 1024,
      sessionSeconds: 60,
      log: () => {},
      internal: {
        admin: 'http://localhost:4322',
        vendure: 'http://localhost:3000',
        storefrontPort: 4321,
        defaultSite: 'auth.platform',
      },
    };
    // Test routing over loopback without requiring any particular adapter on CI.
    proxy = createRemoteDemoProxy(config);
    await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
    port = (proxy.address() as AddressInfo).port;
  });
  afterAll(async () => {
    for (const server of [proxy, upstream]) {
      server?.closeAllConnections();
      if (server) await new Promise((resolve) => server.close(resolve));
    }
  });
  function send(
    path: string,
    method = 'GET',
    headers: Record<string, string> = {},
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
          path,
          headers: { host: new URL(origin).host, ...headers },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () =>
            resolve({ status: res.statusCode!, headers: res.headers, body }),
          );
        },
      );
      req.on('error', reject);
      req.end();
    });
  }
  it('serves account and admin pages without the tunnel gate, with HTTP cookies and the UUID shim', async () => {
    const response = await send('/account/login');
    expect(response.status).toBe(200);
    expect(response.body).toContain('auth.platform.localhost:4321');
    expect(response.body).toContain(
      '<script src="/__demo-lan/browser.js"></script>',
    );
    expect(response.body).toContain(`${origin}/vendor`);
    expect(response.headers['set-cookie']?.[0]).toContain(
      'rd~auth.platform~platform-unified-account',
    );
    expect(response.headers['set-cookie']?.[0]).not.toMatch(/; Secure/i);
    expect(response.headers['content-security-policy']).toContain(
      `ws://${new URL(origin).host}`,
    );
    expect((await send('/vendor')).body).toContain('/__demo-lan/browser.js');
    expect((await send('/__demo-lan/browser.js')).body).toBe(
      LAN_BROWSER_SCRIPT,
    );
  });
  it('selects sites and keeps cookies partitioned', async () => {
    const root = await send('/');
    expect(root.status).toBe(302);
    expect(root.headers.location).toBe('/store/localhost/');
    const selected = await send('/store/manna-roots/products');
    expect(selected.status).toBe(303);
    expect(selected.headers.location).toBe('/products');
    expect(selected.headers['set-cookie']?.[0]).toBe(
      'demo-lan-site=manna-roots; Path=/; HttpOnly; SameSite=Lax',
    );
    const response = await send('/products', 'GET', {
      cookie:
        'demo-lan-site=manna-roots; rd~manna-roots~session=a; rd~auth.platform~session=b',
    });
    expect(response.body).toContain(
      'manna-roots.localhost:4321|undefined|session=a',
    );
  });
  it('rejects unexpected hosts, foreign writes, and internal endpoints', async () => {
    expect((await send('/', 'GET', { host: 'evil.example' })).status).toBe(421);
    expect(
      (await send('/admin-api', 'POST', { origin: 'http://evil.example' }))
        .status,
    ).toBe(403);
    expect((await send('/shop-api')).status).toBe(404);
    expect((await send('/__remote-demo/login')).status).toBe(404);
    const response = await send('/admin-api', 'POST', {
      origin,
      referer: `${origin}/vendor`,
    });
    expect(response.status).toBe(200);
    expect(response.body).toContain('|http://localhost:4322|');
  });
  it('refuses a public address or mismatched LAN origin', () => {
    expect(() =>
      createRemoteDemoProxy({ ...config, lanAddress: '8.8.8.8' }),
    ).toThrow();
    expect(() =>
      createRemoteDemoProxy({
        ...config,
        publicOrigin: () => 'https://evil.example',
      }),
    ).toThrow();
  });
});
