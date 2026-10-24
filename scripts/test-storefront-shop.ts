/** Real Astro HTTP rendering against a bounded fake Shop API. No browser automation. */
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { defaultStorefrontAppearance } from '@market/theme/storefront';
import { fixtureCatalog } from '@market/storefront-core/fixtures';
const appearance = {
  ...structuredClone(defaultStorefrontAppearance),
  palette: 'terracotta',
};
const products = fixtureCatalog({
  skip: 0,
  take: 3,
  search: '',
  sort: 'asc',
}).items.map((p, i) => ({
  ...p,
  facetValues: [
    {
      id: String(i + 1),
      name: ['Produce', 'Bakery', 'Pantry'][i]!,
      facet: { id: '1', name: 'Category' },
    },
  ],
  variants: i === 1 ? p.variants : p.variants.slice(0, 1),
}));
const occurrence = {
  id: '7',
  marketId: '3',
  marketName: 'Test Saturday Market',
  scheduleDate: '2026-10-31',
  startsAt: '2026-10-31T14:00:00Z',
  endsAt: '2026-10-31T19:00:00Z',
  timezone: 'America/Chicago',
  venue: 'Test garden',
};
let mode = 'normal';
const backend = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/storefront-context/resolve') {
    res.end(
      JSON.stringify({
        storefrontId: '1',
        storefrontKey: 'vendor',
        kind: 'VENDOR',
        displayName: 'Test Farm',
        canonicalHostname: 'vendor.localhost',
        canonicalOrigin: `http://vendor.localhost:${port}`,
        subject: { id: '1', name: 'Test Farm' },
        shopContext: { channelToken: 'vendor' },
        appearance,
      }),
    );
    return;
  }
  let body = '';
  for await (const chunk of req) body += String(chunk);
  const { query, variables = {} } = JSON.parse(body);
  let data: object;
  if (query.includes('vendorPreorderOccurrences'))
    data = {
      vendorPreorderOccurrences:
        mode === 'none'
          ? []
          : [
              occurrence,
              { ...occurrence, id: '8', marketName: 'Test Sunday Market' },
            ],
    };
  else if (query.includes('vendorPreorderAvailability')) {
    if (mode === 'error') {
      res.end(JSON.stringify({ errors: [{ message: 'unavailable' }] }));
      return;
    }
    data = {
      vendorPreorderAvailability: products.flatMap((p, i) =>
        p.variants.map((v, j) => ({
          variantId: v.id,
          available:
            mode !== 'closed' &&
            i !== 2 &&
            (i !== 1 || j === 1) &&
            (variables.occurrenceId !== '8' || i === 0),
          reason:
            i === 2 ? 'Unavailable at this market' : 'Available at this market',
        })),
      ),
    };
  } else if (query.includes('marketActiveCart'))
    data = { marketActiveCart: null };
  else if (query.includes('VendorProducts'))
    data = {
      products: {
        totalItems: mode === 'empty' ? 0 : products.length,
        items:
          mode === 'empty'
            ? []
            : products.slice(
                variables.options?.skip ?? 0,
                (variables.options?.skip ?? 0) +
                  (variables.options?.take ?? 100),
              ),
      },
    };
  else data = { activeOrder: null, me: null };
  res.end(JSON.stringify({ data }));
});
await new Promise<void>((r) => backend.listen(0, '127.0.0.1', r));
const reserved = createServer();
await new Promise<void>((r) => reserved.listen(0, '127.0.0.1', r));
const port = (reserved.address() as AddressInfo).port;
await new Promise<void>((r) => reserved.close(() => r()));
const require = createRequire(import.meta.url);
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
      SHOP_API_URL: `http://127.0.0.1:${(backend.address() as AddressInfo).port}/shop-api`,
      ASTRO_TELEMETRY_DISABLED: '1',
    },
  },
);
let output = '';
astro.stdout.on('data', (d) => (output = (output + String(d)).slice(-12000)));
astro.stderr.on('data', (d) => (output = (output + String(d)).slice(-12000)));
function read(path = '/products') {
  return new Promise<{ status: number; html: string }>((done, fail) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path,
        headers: { Host: `vendor.localhost:${port}` },
      },
      (res) => {
        let html = '';
        res.on('data', (d) => (html += String(d)));
        res.on('end', () => done({ status: res.statusCode!, html }));
      },
    );
    req.on('error', fail);
    req.end();
  });
}
try {
  const deadline = Date.now() + 90000;
  while (!output.includes('ready in')) {
    if (astro.exitCode !== null || Date.now() > deadline) throw Error(output);
    await new Promise((r) => setTimeout(r, 200));
  }
  let page = await read();
  assert.equal(page.status, 200, output + page.html);
  for (const text of [
    'Product Categories',
    'All Products',
    'Preordering for Test Saturday Market',
    'harvest-header',
    'harvest-footer',
    '--brand-primary:#8B4938',
    'shop-product-unavailable',
    'Choose options',
  ])
    assert.ok(page.html.includes(text), text);
  assert.equal((page.html.match(/class="product-card-link"/g) ?? []).length, 3);
  assert.ok(
    page.html.includes('/products/' + products[0]!.slug + '?occurrence=7'),
  );
  assert.ok(!page.html.includes('catalog-search'));
  assert.ok(!page.html.includes('breadcrumb'));
  page = await read('/products?category=2&sort=name&occurrence=8');
  assert.equal(page.status, 200, output + page.html);
  assert.ok(page.html.includes('Preordering for Test Sunday Market'));
  assert.equal((page.html.match(/class="product-card-link"/g) ?? []).length, 1);
  assert.ok(page.html.includes(products[1]!.name));
  assert.ok(page.html.includes('Unavailable'));
  mode = 'none';
  page = await read();
  assert.ok(page.html.includes('No upcoming pickup markets'));
  assert.equal((page.html.match(/class="product-card-link"/g) ?? []).length, 3);
  mode = 'closed';
  page = await read();
  assert.ok(page.html.includes('cannot currently be preordered'));
  assert.equal(
    (page.html.match(/<article[^>]+shop-product-unavailable/g) ?? []).length,
    3,
  );
  mode = 'error';
  page = await read();
  assert.ok(page.html.includes('Purchasing is paused'));
  assert.equal((page.html.match(/class="product-card-link"/g) ?? []).length, 3);
  mode = 'empty';
  page = await read();
  assert.ok(page.html.includes('No products yet'));
  console.log(
    'PASS real Shop SSR: shared shell/theme, categories, sorting, occurrence links, unavailable retention, variant choice, no-market/closed/error/empty states',
  );
} finally {
  astro.kill();
  await new Promise<void>((r) => {
    if (astro.exitCode !== null) r();
    else astro.once('exit', () => r());
  });
  await new Promise<void>((r) => backend.close(() => r()));
}
