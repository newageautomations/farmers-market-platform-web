/** HTTP-only actual Astro qualification. No browser, screenshots or persistent data. */
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import {
  defaultContact,
  defaultFaq,
  defaultFindUs,
  defaultStorefrontAppearance,
} from '@market/theme/storefront';
const appearance: typeof defaultStorefrontAppearance & {
  faq?: import('@market/theme/storefront').FaqConfig;
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
        storefrontKey: 'faq',
        kind: 'VENDOR',
        displayName: 'Test Farm',
        canonicalHostname: 'faq.localhost',
        canonicalOrigin: `http://faq.localhost:${port}`,
        subject: { id: '1', name: 'Test Farm' },
        shopContext: { channelToken: 'faq' },
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
        headers: { Host: `faq.localhost:${port}`, ...headers },
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
  assert.equal((await http('/faq')).status, 404);
  const preview = async (config: typeof appearance) =>
    http(
      '/storefront-editor-preview/render',
      new URLSearchParams({
        payload: JSON.stringify({
          path: '/faq',
          token: 'x'.repeat(43),
          scroll: 0,
          config,
        }),
      }).toString(),
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: `http://faq.localhost:${port}`,
      },
    );
  let page = await preview(appearance);
  assert.equal(page.status, 200, page.html);
  assert.ok(page.html.includes('Where can I find your upcoming markets?'));
  assert.equal((await http('/faq')).status, 404);
  appearance.faq = { ...structuredClone(defaultFaq), enabled: true };
  page = await http('/faq');
  assert.equal(page.status, 200, page.html);
  for (const value of [
    'harvest-header',
    'harvest-footer',
    'faq-page',
    '<details',
    '<summary',
    'href="/find-us"',
    'data-editor-section="faq-cta"',
    'href="/contact"',
  ])
    assert.ok(page.html.includes(value), value);
  const document = new JSDOM(page.html).window.document;
  assert.equal(document.querySelectorAll('.faq-row').length, 4);
  assert.equal(document.querySelectorAll('.faq-row[open]').length, 0);
  assert.equal(
    document.querySelector('.faq-row summary')?.textContent,
    defaultFaq.questions[0]!.question,
  );
  assert.ok(!document.querySelector('.faq-page .breadcrumb'));
  const q = appearance.faq.questions;
  q.reverse();
  q[0]!.answer = '<img src=x onerror=alert(1)>\n\nParagraph two';
  q[1]!.visible = false;
  q[2]!.answer = '';
  page = await http('/faq');
  const doc = new JSDOM(page.html).window.document;
  assert.equal(doc.querySelectorAll('.faq-row').length, 2);
  assert.equal(
    doc.querySelector('.faq-row summary')?.textContent,
    q[0]!.question,
  );
  assert.equal(doc.querySelector('.faq-answer img'), null);
  assert.ok(
    doc
      .querySelector('.faq-answer')
      ?.textContent?.includes('<img src=x onerror=alert(1)>'),
  );
  appearance.findUs.enabled = false;
  appearance.contact.enabled = false;
  page = await http('/faq');
  const disabled = new JSDOM(page.html).window.document;
  assert.equal(disabled.querySelector('.faq-answer a[href="/find-us"]'), null);
  assert.ok(disabled.querySelector('.faq-answer')?.textContent);
  assert.equal(disabled.querySelector('[data-editor-section="faq-cta"]'), null);
  const draft = structuredClone(appearance);
  draft.faq!.heading = 'Private FAQ heading';
  draft.faq!.questions[0]!.answer = 'Unsaved private answer';
  page = await preview(draft);
  assert.equal(page.status, 200, page.html);
  assert.ok(page.html.includes('Private FAQ heading'));
  assert.ok(page.html.includes('Unsaved private answer'));
  assert.ok(!(await http('/faq')).html.includes('Private FAQ heading'));
  assert.equal(page.headers['cache-control'], 'private, no-store');
  appearance.faq.questions = [];
  page = await http('/faq');
  assert.equal(
    new JSDOM(page.html).window.document.querySelectorAll('.faq-row').length,
    0,
  );
  assert.ok(!page.html.includes('Where can I find your upcoming markets?'));
  appearance.faq.enabled = false;
  assert.equal((await http('/faq')).status, 404);
  assert.equal((await preview(appearance)).status, 200);
  console.log(
    'PASS FAQ actual Astro HTTP: disabled/starter privacy, real preview, shared shell, native disclosure structure, ordered/hidden/incomplete rows, escaping, safe links, disabled destinations, independent Contact invitation, intentional empty and unsaved/public isolation.',
  );
} finally {
  astro.kill();
  await new Promise<void>((r) => {
    if (astro.exitCode !== null) r();
    else astro.once('exit', () => r());
  });
  await new Promise<void>((r) => fake.close(() => r()));
}
