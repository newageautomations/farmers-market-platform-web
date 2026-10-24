/** HTTP-only actual Astro qualification. No browser, screenshots or persistent data. */
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import {
  defaultContact,
  defaultPolicies,
  defaultFindUs,
  defaultStorefrontAppearance,
} from '@market/theme/storefront';
const appearance: typeof defaultStorefrontAppearance & {
  policies?: import('@market/theme/storefront').PoliciesConfig;
  contact: import('@market/theme/storefront').ContactConfig;
  findUs: typeof defaultFindUs;
} = {
  ...structuredClone(defaultStorefrontAppearance),
  contact: {
    ...structuredClone(defaultContact),
    enabled: true,
    entries: [
      {
        id: 'email',
        type: 'email' as const,
        value: 'public@example.test',
        visible: true,
      },
    ],
  },
  findUs: { ...structuredClone(defaultFindUs), enabled: true },
};
let publishedAt: string | null = null;
const fake = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/storefront-context/resolve') {
    res.end(
      JSON.stringify({
        storefrontId: '1',
        storefrontKey: 'policies',
        kind: 'VENDOR',
        displayName: 'Test Farm',
        canonicalHostname: 'policies.localhost',
        canonicalOrigin: `http://policies.localhost:${port}`,
        subject: { id: '1', name: 'Test Farm' },
        shopContext: { channelToken: 'policies' },
        appearance,
        appearancePublishedAt: publishedAt,
      }),
    );
    return;
  }
  let text = '';
  for await (const chunk of req) text += String(chunk);
  const { query, variables } = JSON.parse(text);
  if (query.includes('authorizeStorefrontPreview')) {
    res.end(
      JSON.stringify({ data: { authorizeStorefrontPreview: { id: '1' } } }),
    );
    return;
  }
  res.end(
    JSON.stringify({ data: { activeOrder: null, me: null, ...variables } }),
  );
});
await new Promise<void>((r) => fake.listen(0, '127.0.0.1', r));
const reserved = createServer();
await new Promise<void>((r) => reserved.listen(0, '127.0.0.1', r));
const port = (reserved.address() as AddressInfo).port;
await new Promise<void>((r) => reserved.close(() => r()));
const require = createRequire(import.meta.url),
  endpoint = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/shop-api`;
const astro = spawn(
  process.execPath,
  [
    join(dirname(require.resolve('astro/package.json')), 'bin/astro.mjs'),
    'dev',
    '--ignore-lock',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  {
    cwd: resolve('apps/storefront'),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      APP_ENV: 'test',
      NODE_ENV: 'development',
      FRONTEND_FIXTURE_MODE: 'false',
      SHOP_API_URL: endpoint,
      PUBLIC_ADMIN_API_URL: endpoint,
      ADMIN_ORIGIN: 'http://localhost:4322',
      ASTRO_TELEMETRY_DISABLED: '1',
    },
  },
);
let output = '';
for (const stream of [astro.stdout, astro.stderr])
  stream.on('data', (data) => (output = (output + String(data)).slice(-10000)));
function http(
  path: string,
  body?: string,
  headers: Record<string, string> = {},
) {
  return new Promise<{
    status: number;
    html: string;
    headers: Record<string, unknown>;
  }>((done, fail) => {
    const req = request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: body === undefined ? 'GET' : 'POST',
        headers: { Host: `policies.localhost:${port}`, ...headers },
      },
      (res) => {
        let html = '';
        res.on('data', (d) => (html += String(d)));
        res.on('end', () =>
          done({ status: res.statusCode!, html, headers: res.headers }),
        );
      },
    );
    req.on('error', fail);
    req.end(body);
  });
}
const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string) => { window: { document: Document } };
};
try {
  const deadline = Date.now() + 90000;
  while (!output.includes('ready in')) {
    if (astro.exitCode !== null || Date.now() > deadline) throw Error(output);
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.equal((await http('/policies')).status, 404);
  const preview = async (config: typeof appearance) =>
    http(
      '/storefront-editor-preview/render',
      new URLSearchParams({
        payload: JSON.stringify({
          path: '/policies',
          token: 'x'.repeat(43),
          scroll: 0,
          config,
        }),
      }).toString(),
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: `http://policies.localhost:${port}`,
      },
    );
  let page = await preview(appearance);
  assert.equal(page.status, 200, page.html);
  assert.ok(page.html.includes('Add a complete, visible policy'));
  assert.equal((await http('/policies')).status, 404);
  appearance.policies = { ...structuredClone(defaultPolicies), enabled: true };
  page = await http('/policies');
  let doc = new JSDOM(page.html).window.document;
  assert.equal(doc.querySelectorAll('.policy-section').length, 0);
  assert.equal(doc.querySelector('time'), null);
  assert.equal(doc.querySelector('.policies-page details'), null);
  for (const value of [
    'harvest-header',
    'harvest-footer',
    'story-page policies-page',
    'data-editor-section="policies-cta"',
    'href="/contact"',
    'href="/policies"',
  ])
    assert.ok(page.html.includes(value), value);
  const rows = appearance.policies.policies;
  rows.reverse();
  rows[0]!.content =
    '<img src=x onerror=alert(1)>\n\nSecond paragraph\nLine three';
  rows[1]!.content = 'Hidden text';
  rows[1]!.visible = false;
  rows[2]!.content = '   ';
  rows[3]!.content =
    'Read [Find Us](/find-us), [Contact](/contact), [Policies](/policies) and [Bad](javascript:alert(1)).';
  // Unsafe input is rejected by the real preview schema; public boundary also validates.
  assert.equal((await preview(appearance)).status, 403);
  rows[3]!.content =
    'Read [Find Us](/find-us), [Contact](/contact) and [Policies](/policies).';
  publishedAt = '2026-10-20T12:00:00.000Z';
  page = await http('/policies');
  assert.equal(page.status, 200, page.html);
  doc = new JSDOM(page.html).window.document;
  assert.deepEqual(
    [...doc.querySelectorAll('.policy-section h2')].map(
      (node) => node.textContent,
    ),
    [rows[0]!.title, rows[3]!.title],
  );
  assert.equal(doc.querySelector('.policy-content img'), null);
  assert.ok(
    doc
      .querySelector('.policy-content')
      ?.textContent?.includes(rows[0]!.content),
  );
  assert.equal(doc.querySelector('.policies-page details'), null);
  assert.ok(doc.querySelector('.policy-content a[href="/find-us"]'));
  assert.equal(
    doc.querySelector('time')?.getAttribute('datetime'),
    publishedAt,
  );
  assert.equal(doc.querySelector('time')?.textContent, 'October 20, 2026');
  appearance.findUs.enabled = false;
  appearance.contact.enabled = false;
  page = await http('/policies');
  doc = new JSDOM(page.html).window.document;
  assert.equal(doc.querySelector('.policy-content a[href="/find-us"]'), null);
  assert.equal(doc.querySelector('[data-editor-section="policies-cta"]'), null);
  const draft = structuredClone(appearance);
  draft.policies!.heading = 'Unsaved private heading';
  draft.policies!.policies[0]!.content = 'Unsaved private policy';
  page = await preview(draft);
  assert.equal(page.status, 200, page.html);
  assert.ok(page.html.includes('Unsaved private heading'));
  assert.ok(page.html.includes('Unsaved private policy'));
  assert.equal(
    new JSDOM(page.html).window.document
      .querySelector('time')
      ?.getAttribute('datetime'),
    publishedAt,
  );
  assert.ok(!(await http('/policies')).html.includes('Unsaved private policy'));
  assert.equal(page.headers['cache-control'], 'private, no-store');
  appearance.policies.policies = [];
  page = await http('/policies');
  assert.equal(
    new JSDOM(page.html).window.document.querySelectorAll('.policy-section')
      .length,
    0,
  );
  assert.ok(!page.html.includes('Preordering &amp; Pickup'));
  appearance.policies.enabled = false;
  page = await http('/policies');
  assert.equal(page.status, 404);
  assert.equal(
    new JSDOM(page.html).window.document.querySelector('a[href="/policies"]'),
    null,
  );
  assert.equal((await preview(appearance)).status, 200);
  console.log(
    'PASS Policies actual Astro HTTP: starter privacy, shared shell, document layout, full ordered content, hidden/incomplete filtering, escaped HTML, safe links, disabled links/CTA, authoritative date, deliberate emptiness and private unsaved preview.',
  );
} finally {
  astro.kill();
  await new Promise<void>((r) => {
    if (astro.exitCode !== null) r();
    else astro.once('exit', () => r());
  });
  await new Promise<void>((r) => fake.close(() => r()));
}
