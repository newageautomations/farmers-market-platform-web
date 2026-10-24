/** HTTP-only actual Astro qualification. No browser, screenshots or persistent data. */
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import {
  defaultContact,
  defaultFindUs,
  defaultStorefrontAppearance,
} from '@market/theme/storefront';
let submissions = 0;
const appearance: typeof defaultStorefrontAppearance & {
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
const fake = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/storefront-context/resolve') {
    res.end(
      JSON.stringify({
        storefrontId: '1',
        storefrontKey: 'contact',
        kind: 'VENDOR',
        displayName: 'Test Farm',
        canonicalHostname: 'contact.localhost',
        canonicalOrigin: `http://contact.localhost:${port}`,
        subject: { id: '1', name: 'Test Farm' },
        shopContext: { channelToken: 'contact' },
        appearance,
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
  if (query.includes('submitStorefrontContact')) {
    assert.equal(req.headers.origin, `http://contact.localhost:${port}`);
    assert.equal(req.headers['vendure-token'], 'contact');
    submissions++;
    res.end(
      JSON.stringify({ data: { submitStorefrontContact: { accepted: true } } }),
    );
    return;
  }
  if (query.includes('customerAccountProfile')) {
    res.end(
      JSON.stringify({
        data: {
          customerAccountProfile: req.headers.cookie
            ? {
                firstName: 'Jane',
                lastName: 'Doe',
                emailAddress: 'jane@example.test',
                phoneNumber: null,
              }
            : null,
        },
      }),
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
        headers: { Host: `contact.localhost:${port}`, ...headers },
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
try {
  const deadline = Date.now() + 90000;
  while (!output.includes('ready in')) {
    if (astro.exitCode !== null || Date.now() > deadline) throw Error(output);
    await new Promise((r) => setTimeout(r, 200));
  }
  let page = await http('/contact');
  assert.equal(page.status, 200, page.html);
  for (const value of [
    'harvest-header',
    'harvest-footer',
    'Get in touch.',
    'Send Message',
    'contact-layout-split',
    'public@example.test',
    'contact-cta',
    'href="/find-us"',
  ])
    assert.ok(page.html.includes(value), value);
  assert.ok(!page.html.includes('class="story-page"'));
  assert.ok(!page.html.includes('breadcrumb'));
  assert.equal(page.headers['cache-control'], 'private, no-store');
  page = await http('/contact', undefined, { cookie: 'fixture-session=1' });
  assert.ok(page.html.includes('jane@example.test'));
  appearance.contact.entries.push(
    {
      id: 'address',
      type: 'address',
      value: '123 Market Street',
      visible: true,
    },
    { id: 'phone', type: 'phone', value: '+14155552671', visible: true },
    {
      id: 'facebook',
      type: 'facebook',
      value: 'https://www.facebook.com/test-farm',
      visible: true,
    },
    {
      id: 'instagram',
      type: 'instagram',
      value: 'https://www.instagram.com/test-farm',
      visible: true,
    },
  );
  page = await http('/contact');
  assert.ok(page.html.includes('123 Market Street'));
  assert.ok(page.html.includes('+1 (415) 555-2671'));
  assert.match(
    page.html,
    /href="https:\/\/www.facebook.com\/test-farm"[^>]*>[\s\S]*?Follow us on Facebook/,
  );
  assert.match(
    page.html,
    /href="https:\/\/www.instagram.com\/test-farm"[^>]*>[\s\S]*?Follow us on Instagram/,
  );
  assert.ok(!page.html.includes('>https://www.facebook.com/test-farm<'));
  assert.ok(!page.html.includes('>https://www.instagram.com/test-farm<'));

  assert.equal((page.html.match(/class="contact-detail"/g) ?? []).length, 5);
  assert.equal(
    (page.html.match(/class="contact-detail"[^>]*>\s*<svg/g) ?? []).length,
    5,
  );
  appearance.contact.entries = [];
  page = await http('/contact');
  assert.ok(!page.html.includes('class="contact-layout contact-layout-split"'));
  assert.ok(!page.html.includes('public@example.test'));
  appearance.findUs.enabled = false;
  page = await http('/contact');
  assert.ok(!page.html.includes('data-editor-section="contact-cta"'));
  assert.equal(
    (
      await http('/api/contact', '{}', {
        'Content-Type': 'application/json',
        Origin: 'http://evil.localhost',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await http('/api/contact', 'x'.repeat(32769), {
        'Content-Type': 'application/json',
        Origin: `http://contact.localhost:${port}`,
      })
    ).status,
    400,
  );
  const draft = structuredClone(appearance);
  draft.contact.heading = 'Private unsaved contact heading' + 'x'.repeat(161);
  draft.contact.entries = [
    { id: 'email', type: 'email', value: 'unfinished', visible: true },
    { id: 'phone', type: 'phone', value: 'not a phone', visible: true },
    {
      id: 'instagram',
      type: 'instagram',
      value: 'javascript:alert(1)',
      visible: true,
    },
  ];
  page = await http(
    '/storefront-editor-preview/render',
    new URLSearchParams({
      payload: JSON.stringify({
        path: '/contact',
        token: 'x'.repeat(43),
        scroll: 0,
        config: draft,
      }),
    }).toString(),
    {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: `http://contact.localhost:${port}`,
    },
  );
  assert.equal(page.status, 200, page.html);
  assert.ok(page.html.includes('Private unsaved contact heading'));
  assert.ok(page.html.includes('Preview only.'));
  assert.ok(page.html.includes('unfinished'));
  assert.ok(page.html.includes('not a phone'));
  assert.ok(!page.html.includes('href="javascript:'));
  assert.ok(!page.html.includes('href="mailto:unfinished'));
  assert.ok(!page.html.includes('href="tel:not a phone'));

  assert.ok(page.html.includes('disabled'));
  assert.equal(submissions, 0);
  assert.ok(
    !(await http('/contact')).html.includes('Private unsaved contact heading'),
  );
  const accepted = await http(
    '/api/contact',
    JSON.stringify({
      fullName: 'Guest',
      email: 'guest@example.test',
      phone: '',
      subject: 'Other',
      message: 'Hello',
      orderNumber: '',
      idempotencyKey: crypto.randomUUID(),
    }),
    {
      'Content-Type': 'application/json',
      Origin: `http://contact.localhost:${port}`,
    },
  );
  assert.equal(accepted.status, 200, accepted.html);
  assert.equal(submissions, 1);
  appearance.contact.enabled = false;
  assert.equal((await http('/contact')).status, 404);
  assert.equal(
    (
      await http('/api/contact', '{}', {
        'Content-Type': 'application/json',
        Origin: `http://contact.localhost:${port}`,
      })
    ).status,
    403,
  );
  console.log(
    'PASS Contact actual Astro HTTP: shell, standard width, explicit public details, empty column, unavailable Find Us, profile prefill, bounded BFF, origin checks, unsaved Astro preview, disabled sending, published isolation and disabled page.',
  );
} finally {
  astro.kill();
  await new Promise<void>((r) => {
    if (astro.exitCode !== null) r();
    else astro.once('exit', () => r());
  });
  await new Promise<void>((r) => fake.close(() => r()));
}
