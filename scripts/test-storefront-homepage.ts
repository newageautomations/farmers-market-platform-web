/** Real Astro SSR qualification, with opt-in isolated Chromium checks. No database. */
import assert from 'node:assert/strict';
import { createServer, request, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { resolve, dirname, join } from 'node:path';
import {
  defaultStorefrontAppearance,
  farmhouseDefaults,
  defaultAboutCta,
  defaultFindUs,
  defaultContact,
  defaultFaq,
  defaultPolicies,
  vendorAppearanceDefaults,
  type AboutSection,
} from '@market/theme/storefront';
import {
  fixtureCatalog,
  fixtureProduct,
} from '@market/storefront-core/fixtures';
import type { CheckoutView, PublicCart } from '@market/api';

let commerce = false;
const testCart: PublicCart = {
  id: '71',
  code: 'THEME-TEST',
  state: 'AddingItems',
  currencyCode: 'USD',
  subTotalWithTax: 1000,
  totalWithTax: 1000,
  shippingWithTax: 0,
  discounts: [],
  surcharges: [],
  taxSummary: [],
  lines: [
    {
      id: '81',
      quantity: 1,
      unitPriceWithTax: 1000,
      discountedLinePriceWithTax: 1000,
      featuredAsset: { preview: '/assets/vendor-mark.svg' },
      productVariant: {
        id: '1',
        name: 'Standard',
        product: { name: 'Synthetic Harvest Box', slug: 'synthetic-produce-1' },
      },
    },
  ],
};
const testCheckout: CheckoutView = {
  orderId: '71',
  code: 'THEME-TEST',
  kind: 'DIRECT_VENDOR',
  occurrenceId: '21',
  currency: 'USD',
  total: 1000,
  subtotal: 1000,
  shipping: 0,
  frozen: false,
  committed: false,
  paymentStatus: 'NONE',
  pickupPromise: {
    mode: 'VENDOR_BOOTH_PICKUP',
    venue: '106 City Park Road',
    instructions: 'Collect at our booth.',
    startsAt: '2026-10-31T14:00:00Z',
    endsAt: '2026-10-31T19:00:00Z',
  },
  contact: null,
  profile: null,
  groups: [
    {
      vendorId: '1',
      vendorName: 'The Garden Farm',
      lines: [
        { id: '81', name: 'Synthetic Harvest Box', quantity: 1, total: 1000 },
      ],
      pickup: [],
    },
  ],
  taxes: [],
  discounts: [],
  availability: { state: 'UNCONFIGURED', mode: 'PROVIDER' },
  attempt: null,
};

const vendorConfig = structuredClone(defaultStorefrontAppearance);
vendorConfig.palette = 'terracotta';
vendorConfig.homepage.title = 'From our farm to your table';
vendorConfig.homepage.story = 'A small local test collection.';
vendorConfig.about = {
  enabled: true,
  title: 'The farm story',
  content: '<script>alert("unsafe")</script>\nA published story.',
};
const marketConfig = structuredClone(defaultStorefrontAppearance);
marketConfig.palette = 'blue';
marketConfig.homepage.title = 'Your Saturday, locally grown.';
const occurrence = {
  id: '21',
  scheduleDate: '2026-10-31',
  startsAt: '2026-10-31T14:00:00Z',
  endsAt: '2026-10-31T19:00:00Z',
  timezone: 'America/Chicago',
  venue: 'Test market garden',
};
vendorConfig.findUs = { ...structuredClone(defaultFindUs), enabled: true };
let appearancesEmpty = false;
let missingMarketLocation = false;
let aboutEnabled = true;
let empty = false;
const backend = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/storefront-context/resolve') {
    const fallbackHost = !/^(vendor|market)\.localhost:/.test(
      req.headers.host ?? '',
    );
    const market = req.headers.host?.startsWith('market');
    const host = market ? 'market.localhost' : 'vendor.localhost';
    res.end(
      JSON.stringify({
        storefrontId: fallbackHost ? '999' : market ? '2' : '1',
        storefrontKey: host,
        kind: market ? 'MARKET' : 'VENDOR',
        displayName: market ? 'The Saturday Market' : 'The Garden Farm',
        canonicalHostname: host,
        canonicalOrigin: `http://${host}:${port}`,
        subject: { id: market ? '2' : '1', name: host },
        shopContext: { channelToken: host },
        appearance: market
          ? marketConfig
          : {
              ...vendorConfig,
              about: aboutEnabled
                ? vendorConfig.about
                : defaultStorefrontAppearance.about,
            },
      }),
    );
    return;
  }
  let body = '';
  for await (const chunk of req) body += String(chunk);
  const parsed = JSON.parse(body) as {
    query: string;
    variables?: Record<string, unknown>;
  };
  const query = String(parsed.query);
  if (query.includes('currentCheckoutStatus')) {
    res.end(
      JSON.stringify({
        data: {
          currentCheckoutStatus: commerce
            ? {
                ...testCheckout,
                committed: !!parsed.variables?.orderId,
                paymentStatus: parsed.variables?.orderId ? 'SUCCEEDED' : 'NONE',
              }
            : null,
        },
      }),
    );
    return;
  }
  if (query.includes('customerAccountProfile')) {
    res.end(JSON.stringify({ data: { customerAccountProfile: null } }));
    return;
  }
  if (query.includes('marketActiveCart')) {
    res.end(
      JSON.stringify({
        data: { marketActiveCart: commerce ? { id: '71', occurrence } : null },
      }),
    );
    return;
  }
  if (query.includes('activeOrder')) {
    res.end(
      JSON.stringify({ data: { activeOrder: commerce ? testCart : null } }),
    );
    return;
  }
  if (/\bme\s*\{/.test(query)) {
    res.end(JSON.stringify({ data: { me: null } }));
    return;
  }
  if (query.includes('vendorPreorderAvailability')) {
    res.end(
      JSON.stringify({
        data: {
          vendorPreorderAvailability: (
            (parsed.variables?.variantIds as string[]) ?? []
          ).map((id) => ({
            variantId: id,
            available: true,
            quantity: 10,
            reason: 'Available',
          })),
        },
      }),
    );
    return;
  }
  if (query.includes('vendorPreorderOccurrences')) {
    res.end(
      JSON.stringify({
        data: {
          vendorPreorderOccurrences: commerce
            ? [
                {
                  ...occurrence,
                  marketId: '11',
                  marketName: 'Oak Bend Saturday Market',
                  pickupInstructions: 'Collect at our booth.',
                },
              ]
            : [],
        },
      }),
    );
    return;
  }
  if (query.includes('vendorStorefrontCategories')) {
    res.end(JSON.stringify({ data: { vendorStorefrontCategories: [] } }));
    return;
  }
  if (query.includes('authorizeStorefrontPreview')) {
    res.end(
      JSON.stringify(
        parsed.variables?.token === 'x'.repeat(43) &&
          parsed.variables?.host === `vendor.localhost:${port}`
          ? { data: { authorizeStorefrontPreview: { id: '1' } } }
          : { errors: [{ message: 'Denied' }] },
      ),
    );
    return;
  }
  if (query.includes('vendorMarketAppearances')) {
    res.end(
      JSON.stringify({
        data: {
          vendorMarketAppearances: appearancesEmpty
            ? []
            : [0, 1, 2].map((i) => ({
                ...occurrence,
                id: String(21 + i),
                marketId: '11',
                marketName: 'Oak Bend Saturday Market',
                marketWebsite: i < 2 ? 'https://oak-bend.example.test' : null,
                startsAt:
                  i === 0
                    ? occurrence.startsAt
                    : `2026-11-${i === 1 ? '07' : '14'}T15:00:00Z`,
                endsAt:
                  i === 0
                    ? occurrence.endsAt
                    : `2026-11-${i === 1 ? '07' : '14'}T19:00:00Z`,
                venue: missingMarketLocation
                  ? ''
                  : 'Boerne City Park, 106 City Park Road, Boerne, TX 78006',
                image: 'https://assets.example.test/market.jpg',
                pickupInstructions: 'Collect at our booth.',
                preorderAvailable: i < 2,
              })),
        },
      }),
    );
    return;
  }
  if (query.includes('product(slug:')) {
    res.end(
      JSON.stringify({
        data: { product: fixtureProduct(String(parsed.variables?.slug)) },
      }),
    );
    return;
  }
  if (query.includes('marketStorefrontOccurrences')) {
    res.end(
      JSON.stringify({
        data: {
          marketStorefrontOccurrences: {
            items: empty ? [] : [occurrence],
            totalItems: empty ? 0 : 1,
          },
        },
      }),
    );
    return;
  }
  if (query.includes('marketOccurrenceCatalog')) {
    res.end(
      JSON.stringify({
        data: {
          marketOccurrenceCatalog: {
            occurrenceId: '21',
            totalItems: 0,
            eligibility: 'OPEN',
            items: [],
            facets: [],
            vendors: [
              { vendorId: '3', vendorName: 'The Garden Farm', count: 2 },
            ],
          },
        },
      }),
    );
    return;
  }
  res.end(
    JSON.stringify({
      data: {
        products: empty
          ? { totalItems: 0, items: [] }
          : fixtureCatalog({
              skip: Number(
                (parsed.variables?.options as { skip?: number })?.skip ?? 0,
              ),
              take: Number(
                (parsed.variables?.options as { take?: number })?.take ?? 3,
              ),
              search: (
                (
                  parsed.variables?.options as {
                    filter?: { name?: { contains?: string } };
                  }
                )?.filter?.name?.contains ?? ''
              ).replace(/\\([\\%_])/g, '$1'),
              sort: 'asc',
            }),
      },
    }),
  );
});
await new Promise<void>((done) => backend.listen(0, '127.0.0.1', done));
const reserved = createServer();
await new Promise<void>((done) => reserved.listen(0, '127.0.0.1', done));
const port = (reserved.address() as AddressInfo).port;
await new Promise<void>((done) => reserved.close(() => done()));
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
      PUBLIC_ADMIN_API_URL: `http://127.0.0.1:${(backend.address() as AddressInfo).port}/admin-api`,
      ASTRO_TELEMETRY_DISABLED: '1',
    },
  },
);
let output = '';
astro.stdout.on('data', (data) => {
  output = (output + String(data)).slice(-12000);
});
astro.stderr.on('data', (data) => {
  output = (output + String(data)).slice(-12000);
});
function read(host: string, path = '/', payload?: object, origin?: string) {
  return new Promise<{
    status: number;
    html: string;
    headers: IncomingHttpHeaders;
  }>((done, fail) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: payload ? 'POST' : 'GET',
        headers: {
          Host: `${host}.localhost:${port}`,
          ...(payload
            ? {
                Origin: origin ?? `http://${host}.localhost:${port}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Dest': 'iframe',
              }
            : {}),
        },
      },
      (res) => {
        res.setEncoding('utf8');
        let html = '';
        res.on('data', (chunk) => {
          html += String(chunk);
        });
        res.on('end', () =>
          done({ status: res.statusCode!, html, headers: res.headers }),
        );
      },
    );
    req.on('error', fail);
    req.end(
      payload
        ? new URLSearchParams({ payload: JSON.stringify(payload) }).toString()
        : undefined,
    );
  });
}
try {
  const deadline = Date.now() + 90000;
  while (!output.includes('ready in')) {
    if (astro.exitCode !== null || Date.now() > deadline)
      throw new Error(`Astro did not start: ${output}`);
    await new Promise((done) => setTimeout(done, 200));
  }
  const vendor = await read('vendor');
  assert.equal(vendor.status, 200, output);
  assert.match(vendor.html, /data-composition="vendor"/);
  assert.match(vendor.html, /From our farm to your table/);
  assert.match(vendor.html, /--brand-primary:#8B4938/);
  assert.match(vendor.html, /class="harvest-header/);
  assert.match(vendor.html, /class="harvest-footer/);
  assert.match(vendor.html, /href="\/products/);
  assert.match(vendor.html, /href="\/about"/);
  assert.equal(vendor.headers['x-frame-options'], 'DENY');
  assert.ok(!vendor.html.includes('storefront-editor-state'));

  const unsaved = structuredClone(vendorConfig);
  unsaved.palette = 'blue';
  unsaved.homepage.title = 'Private unsaved heading';
  unsaved.vendor = {
    ...vendorAppearanceDefaults,
    heroShape: 'star',
    typography: 'friendly',
    aboutEnabled: true,
    aboutBlurb: 'Private short story',
    text: { heroPrimaryLabel: 'Browse the harvest' },
  };
  unsaved.textSizes = {
    hero: { heading: 125, paragraph: 110 },
    'find-intro': { heading: 140, paragraph: 115 },
    'story-cta': { heading: 120, paragraph: 100 },
  };
  const previewPayload = {
    token: 'x'.repeat(43),
    config: unsaved,
    path: '/',
    scroll: 0,
  };
  const preview = await read(
    'vendor',
    '/storefront-editor-preview/render',
    previewPayload,
  );
  assert.equal(preview.status, 200, preview.html + output);
  assert.match(preview.html, /Private unsaved heading/);
  assert.match(preview.html, /storefront-text-sizes/);
  assert.ok(preview.html.includes('*1.25'));
  assert.ok(!(await read('vendor')).html.includes('*1.25'));
  assert.match(preview.html, /Browse the harvest/);
  assert.match(preview.html, /data-hero-shape="star"/);
  assert.match(preview.html, /data-editor-preview="true"/);
  assert.match(preview.html, /data-editor-section="hero"/);
  assert.match(preview.html, /noindex,nofollow/);
  assert.ok(!preview.html.includes(previewPayload.token));
  assert.match(String(preview.headers['cache-control']), /no-store/);
  assert.ok(
    String(preview.headers['content-security-policy']).includes(
      'frame-ancestors',
    ),
  );
  assert.ok(!(await read('vendor')).html.includes('Private unsaved heading'));
  for (const patch of [
    { token: 'z'.repeat(43) },
    { path: '/checkout' },
    { config: { ...unsaved, palette: 'invalid' } },
  ]) {
    assert.ok(
      (
        await read('vendor', '/storefront-editor-preview/render', {
          ...previewPayload,
          ...patch,
        })
      ).status >= 400,
    );
  }
  assert.ok(
    (await read('market', '/storefront-editor-preview/render', previewPayload))
      .status >= 400,
  );
  assert.ok(
    (
      await read(
        'vendor',
        '/storefront-editor-preview/render',
        previewPayload,
        'https://untrusted.example',
      )
    ).status >= 400,
  );
  for (const path of [
    '/products',
    '/products/synthetic-produce-1',
    '/about',
    '/find-us',
  ]) {
    const result = await read('vendor', '/storefront-editor-preview/render', {
      ...previewPayload,
      path,
    });
    assert.equal(result.status, 200, result.html + output);
    assert.match(result.html, /data-editor-preview="true"/);
    assert.match(result.html, /--brand-primary:#365C6E/);
  }
  const market = await read('market');
  assert.equal(market.status, 200, output);
  assert.match(market.html, /data-composition="market"/);
  assert.match(market.html, /Your Saturday, locally grown/);
  assert.match(market.html, /--brand-primary:#365C6E/);
  assert.ok(!market.html.includes('href="/about"'));

  const find = await read('vendor', '/find-us');
  assert.equal(find.status, 200, find.html + output);
  assert.match(find.html, /Find us at the market/);
  assert.match(find.html, /Upcoming Markets/);
  assert.match(find.html, /November 2026/);
  assert.equal(
    (find.html.match(/<h2>Oak Bend Saturday Market<\/h2>/g) ?? []).length,
    1,
  );
  assert.match(find.html, /Get Directions/);
  assert.match(find.html, /google.com\/maps\/search/);
  assert.ok(!find.html.includes('Preorders available'));
  assert.ok(!find.html.includes('Preordering unavailable'));
  assert.ok(!find.html.includes('(America/Chicago)'));
  assert.match(find.html, /find-featured-details/);
  assert.match(find.html, /find-month-entries/);
  assert.match(find.html, /data-disclosure-icon="plus"/);
  assert.match(find.html, /Visit Market Website/);
  assert.match(find.html, /href="https:\/\/oak-bend.example.test"/);
  assert.match(find.html, /story-cta/);
  assert.ok(!find.html.includes('class="story-page"'));
  missingMarketLocation = true;
  const missingLocation = await read('vendor', '/find-us');
  assert.equal(missingLocation.status, 200);
  assert.ok(!missingLocation.html.includes('Get Directions'));
  missingMarketLocation = false;
  appearancesEmpty = true;
  assert.match(
    (await read('vendor', '/find-us')).html,
    /No upcoming markets announced yet/,
  );
  appearancesEmpty = false;
  vendorConfig.findUs.enabled = false;
  assert.equal((await read('vendor', '/find-us')).status, 404);
  const findPreview = await read(
    'vendor',
    '/storefront-editor-preview/render',
    {
      ...previewPayload,
      path: '/find-us',
      config: {
        ...unsaved,
        findUs: {
          ...defaultFindUs,
          enabled: false,
          introduction: {
            ...defaultFindUs.introduction,
            heading: 'Private market invitation',
          },
        },
      },
    },
  );
  assert.equal(findPreview.status, 200, findPreview.html + output);
  assert.match(findPreview.html, /Private market invitation/);
  assert.match(findPreview.html, /data-editor-preview="true"/);
  assert.ok(
    !(await read('vendor', '/find-us')).html.includes(
      'Private market invitation',
    ),
  );
  vendorConfig.findUs.enabled = true;
  const about = await read('vendor', '/about');
  assert.equal(about.status, 200);
  assert.match(about.html, /&lt;script&gt;/);
  assert.ok(!about.html.includes('<script>alert'));
  vendorConfig.about.content = '\u5c71'.repeat(20000);
  vendorConfig.homepage.story = '\u7530'.repeat(3000);
  assert.ok(
    (await read('vendor', '/about')).html.includes(vendorConfig.about.content),
  );
  const unicodePreview = await read(
    'vendor',
    '/storefront-editor-preview/render',
    {
      ...previewPayload,
      path: '/about',
      config: {
        ...unsaved,
        about: { ...unsaved.about, content: vendorConfig.about.content },
      },
    },
  );
  assert.equal(unicodePreview.status, 200, unicodePreview.html + output);
  assert.ok(unicodePreview.html.includes(vendorConfig.about.content));

  const storySection = (
    id: string,
    layout: AboutSection['layout'],
  ): AboutSection => ({
    id,
    layout,
    heading: `Heading ${id}`,
    body: `Paragraph ${id}\n\nSecond line <script>unsafe</script>`,
    imageAssetId: layout === 'text' ? null : '10',
    image: layout === 'text' ? '' : 'https://assets.example.test/farm.jpg',
    alt: 'Farm photograph',
    shape: 'star',
    imagePosition: 'left',
    visible: true,
  });
  vendorConfig.about.sectionsVersion = 1;
  vendorConfig.about.sections = [
    storySection('copy', 'text'),
    storySection('photo', 'image'),
    storySection('mixed', 'text-image'),
    { ...storySection('hidden', 'text'), visible: false },
    { ...storySection('empty', 'image'), imageAssetId: null, image: '' },
  ];
  vendorConfig.about.cta = {
    ...defaultAboutCta,
    heading: 'Visit our shop',
    label: 'Browse products',
  };
  const story = await read('vendor', '/about');
  assert.equal(story.status, 200, output);
  for (const id of ['copy', 'photo', 'mixed'])
    assert.ok(story.html.includes(`data-editor-section="story:${id}"`));
  for (const id of ['hidden', 'empty'])
    assert.ok(!story.html.includes(`data-editor-section="story:${id}"`));
  const positions = [
    'story:copy',
    'story:photo',
    'story:mixed',
    'story-cta',
  ].map((id) => story.html.indexOf(`data-editor-section="${id}"`));
  assert.deepEqual(
    [...positions].sort((a, b) => a - b),
    positions,
  );
  assert.match(
    story.html,
    /class="story-section story-split"[^>]*data-editor-section="story:mixed"[^>]*data-image-position="left"/,
  );
  assert.match(story.html, /data-hero-shape="star"/);
  assert.match(story.html, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.ok(!story.html.includes('<script>unsafe'));
  assert.match(story.html, /data-story-cta="label">Browse products/);
  assert.match(story.html, /class="harvest-header/);
  assert.match(story.html, /class="harvest-footer/);
  for (const textAlign of ['left', 'center', 'right'] as const)
    for (const imageSize of ['small', 'medium', 'large'] as const) {
      vendorConfig.about.sections[2]!.textAlign = textAlign;
      vendorConfig.about.sections[2]!.imageSize = imageSize;
      const variant = await read('vendor', '/about');
      assert.equal(variant.status, 200);
      assert.ok(variant.html.includes(`data-text-align="${textAlign}"`));
      assert.ok(variant.html.includes(`data-image-size="${imageSize}"`));
    }
  for (const shape of ['natural', 'natural-rounded'] as const) {
    vendorConfig.about.sections[2]!.shape = shape;
    const proportional = await read('vendor', '/about');
    assert.equal(proportional.status, 200);
    assert.ok(proportional.html.includes(`data-story-shape="${shape}"`));
    const image = proportional.html.match(
      new RegExp(`<img\\b[^>]*data-hero-shape="${shape}"[^>]*>`),
    )?.[0];
    assert.ok(image);
    assert.ok(!/\b(?:width|height)=/.test(image));
  }
  vendorConfig.about.sections[2]!.imagePosition = 'right';
  assert.match(
    (await read('vendor', '/about')).html,
    /data-editor-section="story:mixed"[^>]*data-image-position="right"/,
  );
  const unsavedStory = structuredClone(vendorConfig);
  unsavedStory.about.sections![0]!.body = 'Private section edit';
  const sectionPreview = await read(
    'vendor',
    '/storefront-editor-preview/render',
    { ...previewPayload, path: '/about', config: unsavedStory },
  );
  assert.equal(sectionPreview.status, 200, sectionPreview.html + output);
  assert.ok(sectionPreview.html.includes('Private section edit'));
  assert.ok(sectionPreview.html.includes('data-editor-section="story:hidden"'));
  assert.ok(sectionPreview.html.includes('data-editor-section="story:empty"'));
  assert.ok(
    !(await read('vendor', '/about')).html.includes('Private section edit'),
  );
  vendorConfig.about.sections = [];
  const onlyCta = await read('vendor', '/about');
  assert.ok(onlyCta.html.includes('data-editor-section="story-cta"'));
  assert.ok(!onlyCta.html.includes('data-editor-section="story:legacy-story"'));
  delete vendorConfig.about.sectionsVersion;
  assert.ok(
    (await read('vendor', '/about')).html.includes(vendorConfig.about.content),
  );
  aboutEnabled = false;
  assert.equal((await read('vendor', '/about')).status, 404);
  assert.ok(!(await read('vendor')).html.includes('href="/about"'));
  empty = true;
  assert.match((await read('vendor')).html, /Good things are on their way/);
  assert.match((await read('market')).html, /Your next visit is in the making/);

  // Both themes use exactly the same mock backend and actual Astro route controllers.
  empty = false;
  aboutEnabled = true;
  commerce = true;
  vendorConfig.homepage.title = 'Theme compatibility';
  vendorConfig.homepage.image = 'https://assets.example.test/hero.jpg';
  vendorConfig.contact = { ...structuredClone(defaultContact), enabled: true };
  vendorConfig.faq = {
    ...structuredClone(defaultFaq),
    enabled: true,
    questions: [
      {
        id: 'pickup',
        question: 'Where do I collect?',
        answer: 'At the market. [Contact](/contact)',
        visible: true,
      },
    ],
  };
  vendorConfig.policies = {
    ...structuredClone(defaultPolicies),
    enabled: true,
    policies: [
      {
        id: 'collection',
        title: 'Collection policy',
        content: 'Please collect at the agreed market.',
        visible: true,
      },
    ],
  };
  const routes = [
    '/',
    '/products',
    '/products/synthetic-produce-1?variant=1',
    '/cart',
    '/checkout',
    '/checkout/success?order=71',
    '/about',
    '/find-us',
    '/contact',
    '/faq',
    '/policies',
  ];
  for (const theme of ['harvest', 'modern-farmhouse'] as const) {
    vendorConfig.theme = theme;
    for (const path of routes) {
      const result = await read('vendor', path);
      assert.equal(
        result.status,
        200,
        `${theme} ${path}: ${result.html}${output}`,
      );
      assert.ok(
        result.html.includes(`data-storefront-theme="${theme}"`),
        `${theme} ${path}`,
      );
      assert.ok(
        result.html.includes(
          theme === 'harvest' ? 'class="harvest-header' : 'class="mf-header',
        ),
        path,
      );
      if (path === '/')
        assert.ok(
          result.html.includes(
            theme === 'harvest' ? 'harvest-hero' : 'mf-hero',
          ),
        );
      if (path === '/products')
        assert.ok(
          result.html.includes(
            theme === 'harvest' ? 'harvest-products' : 'mf-shop-intro',
          ),
        );
      if (path.startsWith('/products/')) {
        assert.ok(
          result.html.includes(
            theme === 'harvest'
              ? 'class="product-detail"'
              : 'class="mf-product-layout"',
          ),
        );
        assert.match(result.html, /id="product-variant"/);
        assert.match(result.html, /id="product-quantity"/);
        assert.match(result.html, /Add to cart/);
      }
      if (path === '/cart') assert.match(result.html, /vendor-cart-layout/);
      if (path === '/checkout') {
        assert.match(result.html, /checkout-contact-grid/);
        assert.match(result.html, /checkout-payment-placeholder/);
      }
      if (path.startsWith('/checkout/success'))
        assert.match(result.html, /Thank you for your order/);
      if (path === '/contact') assert.match(result.html, /contact-layout/);
      if (path === '/faq') assert.match(result.html, /Where do I collect\?/);
      if (path === '/policies') assert.match(result.html, /Collection policy/);
    }
    if (process.env.FRONTEND_QUALIFY_FARMHOUSE_BROWSER === 'true') {
      const { qualifyMarketPickerInstances } =
        await import('./qualify-farmhouse-shop-browser');
      await qualifyMarketPickerInstances(
        `http://vendor.localhost:${port}`,
        theme,
      );
    }
    const unsavedTheme = {
      ...vendorConfig,
      theme: theme === 'harvest' ? 'modern-farmhouse' : 'harvest',
    };
    const actualPreview = await read(
      'vendor',
      '/storefront-editor-preview/render',
      { ...previewPayload, config: unsavedTheme },
    );
    assert.equal(actualPreview.status, 200, actualPreview.html + output);
    assert.ok(
      actualPreview.html.includes(
        `data-storefront-theme="${unsavedTheme.theme}"`,
      ),
    );
    assert.ok(
      (await read('vendor')).html.includes(`data-storefront-theme="${theme}"`),
    );
    for (const blocked of ['/cart', '/checkout', '/checkout/success'])
      assert.ok(
        (
          await read('vendor', '/storefront-editor-preview/render', {
            ...previewPayload,
            config: unsavedTheme,
            path: blocked,
          })
        ).status >= 400,
      );
  }

  // New version-two template uses actual Astro SSR on the same public routes.
  vendorConfig.theme = 'modern-farmhouse';
  vendorConfig.template = {
    id: 'modern-farmhouse',
    version: 2,
    settings: farmhouseDefaults(),
  };
  vendorConfig.template.settings.header.logo = {
    assetId: '1',
    url: 'https://example.test/vendor-logo.jpg',
    alt: 'Farm logo',
    desktop: 'center',
    mobile: 'center',
  };
  vendorConfig.template.settings.scrollFade = true;
  vendorConfig.template.settings.palette = 'blue';
  vendorConfig.template.settings.typography = 'friendly';
  vendorConfig.buttonShape = 'soft';
  const expectedComponents = [
    'home',
    'shop',
    'product-detail',
    'cart',
    'checkout',
    'success',
    'about',
    'find-us',
    'contact',
    'faq',
    'policies',
  ];
  for (const [index, path] of routes.entries()) {
    const response = await read('vendor', path);
    assert.equal(response.status, 200, path + response.html + output);
    assert.match(response.html, /data-template-version="2"/);
    assert.match(response.html, /data-farmhouse-component="masthead"/);
    assert.ok(
      response.html.includes(
        'data-farmhouse-component="' + expectedComponents[index] + '"',
      ),
      path,
    );
    assert.ok(
      !/class="(?:mf-header|mf-hero|harvest-header)/.test(response.html),
      path,
    );
    if (path === '/') {
      assert.match(response.html, /farmhouse:cinematic/);
      assert.match(response.html, /data-farmhouse-carousel/);
      assert.match(response.html, /data-carousel-track/);
      assert.ok(!response.html.includes('vendor-logo.jpg'));
      assert.match(
        response.html,
        /class="farmhouse-header-search ui-search-select"/,
      );
      assert.match(response.html, /name="search"/);
      assert.match(response.html, /data-scroll-fade="true"/);
      const masthead = response.html.slice(
        response.html.indexOf('<header'),
        response.html.indexOf('</header>'),
      );
      assert.ok(!masthead.includes('href="/faq"'));
      assert.ok(!masthead.includes('href="/policies"'));
      const footer = response.html.slice(
        response.html.indexOf('<footer'),
        response.html.indexOf('</footer>'),
      );
      for (const label of [
        'Site',
        'Products',
        'Legal',
        'Shop',
        'Our Story',
        'Find Us',
        'FAQ',
        'Terms &amp; Conditions',
      ])
        assert.ok(footer.includes(label), label);
      assert.ok(footer.includes('href="/products?category=1"'));
      assert.ok(!footer.includes('farmhouse-footer-invitation'));
      assert.ok(
        !footer.includes(vendorConfig.template!.settings.footer.tagline),
      );
      assert.match(response.html, /--farmhouse-ink:#365C6E/);
      assert.match(response.html, /Trebuchet MS/);
      assert.ok(!response.html.includes('<span>Menu</span>'));
    }
    if (path === '/products' || path.startsWith('/products/'))
      assert.match(response.html, /farmhouse-product-/);
    if (path === '/products') {
      assert.match(
        response.html,
        /data-editor-section="farmhouse:shop-settings"/,
      );
      assert.match(response.html, /farmhouse-cinematic farmhouse-page-hero/);
      assert.match(
        response.html,
        /farmhouse-product-card farmhouse-product-card-overlay/,
      );
      assert.match(response.html, /farmhouse-card-purchase/);
      assert.match(response.html, /Add to cart/);
      assert.match(response.html, /Preordering for/);
      assert.match(response.html, /data-catalog-sort/);
      assert.match(response.html, /#farmhouse-catalog/);
      assert.match(response.html, />\s*Default\s*</);
      assert.ok(!/>\s*Apply\s*</.test(response.html));
    }
  }
  commerce = false;
  const unavailableShop = await read('vendor', '/products');
  assert.equal(unavailableShop.status, 200);
  assert.match(unavailableShop.html, /No upcoming pickup markets/);
  assert.match(
    unavailableShop.html,
    /<button[^>]*disabled[^>]*>\s*Unavailable\s*<\/button>/,
  );
  commerce = true;
  if (process.env.FRONTEND_QUALIFY_FARMHOUSE_BROWSER === 'true') {
    const { qualifyFarmhouseShopBrowser, qualifyMarketPickerInstances } =
      await import('./qualify-farmhouse-shop-browser');
    await qualifyMarketPickerInstances(
      `http://vendor.localhost:${port}`,
      'modern-farmhouse-v2',
    );
    await qualifyFarmhouseShopBrowser(`http://vendor.localhost:${port}`);
  }
  const suggestions = await read('vendor', '/api/product-search?q=hArVeSt');
  assert.equal(suggestions.status, 200);
  assert.deepEqual(JSON.parse(suggestions.html).items, [
    { name: 'Synthetic Harvest Box', href: '/products/synthetic-produce-1' },
  ]);
  assert.equal(suggestions.headers['cache-control'], 'private, no-store');
  assert.deepEqual(
    JSON.parse(
      (await read('vendor', '/api/product-search?q=no-such-product')).html,
    ).items,
    [],
  );
  assert.deepEqual(
    JSON.parse((await read('vendor', '/api/product-search?q=%25')).html).items,
    [],
  );
  assert.deepEqual(
    JSON.parse((await read('vendor', '/api/product-search?q=')).html).items,
    [],
  );
  assert.equal((await read('market', '/api/product-search?q=box')).status, 404);
  assert.equal(
    JSON.parse((await read('vendor', '/api/product-search?q=produce')).html)
      .items.length,
    8,
  );
  const searched = await read('vendor', '/products?search=Harvest%20Box');
  assert.equal(searched.status, 200);
  assert.match(
    searched.html,
    /href="\/products\/synthetic-produce-1(?:\?|["])/,
  );
  assert.doesNotMatch(
    searched.html,
    /href="\/products\/synthetic-produce-2(?:\?|["])/,
  );
  const noMatches = await read('vendor', '/products?search=no-such-product');
  assert.equal(noMatches.status, 200);
  assert.doesNotMatch(
    noMatches.html,
    /href="\/products\/synthetic-produce-1(?:\?|["])/,
  );
  const premiumUnsaved = structuredClone(vendorConfig);
  premiumUnsaved.template!.settings.sections[0]!.heading =
    'Unpublished premium headline';
  const premiumPreview = await read(
    'vendor',
    '/storefront-editor-preview/render',
    { ...previewPayload, config: premiumUnsaved },
  );
  assert.equal(premiumPreview.status, 200, premiumPreview.html + output);
  assert.match(premiumPreview.html, /Unpublished premium headline/);
  assert.ok(!premiumPreview.html.includes('data-scroll-fade="true"'));
  assert.ok(
    !(await read('vendor')).html.includes('Unpublished premium headline'),
  );
  for (const path of ['/cart', '/checkout', '/checkout/success'])
    assert.ok(
      (
        await read('vendor', '/storefront-editor-preview/render', {
          ...previewPayload,
          config: premiumUnsaved,
          path,
        })
      ).status >= 400,
    );
  const sparse = {
    ...structuredClone(defaultStorefrontAppearance),
    theme: 'modern-farmhouse' as const,
    template: {
      id: 'modern-farmhouse' as const,
      version: 2 as const,
      settings: farmhouseDefaults(),
    },
  };
  for (const path of ['/find-us', '/contact', '/faq', '/policies']) {
    const result = await read('vendor', '/storefront-editor-preview/render', {
      ...previewPayload,
      config: sparse,
      path,
    });
    assert.equal(result.status, 200, path + result.html + output);
    assert.match(result.html, /data-template-version="2"/);
  }
  delete vendorConfig.template;

  vendorConfig.theme = 'modern-farmhouse';
  vendorConfig.contact.enabled = false;
  vendorConfig.faq.enabled = false;
  vendorConfig.policies.enabled = false;
  vendorConfig.findUs.enabled = false;
  aboutEnabled = false;
  const minimalPremium = (await read('vendor')).html;
  for (const hidden of ['/contact', '/faq', '/policies', '/find-us', '/about'])
    assert.ok(!minimalPremium.includes(`href="${hidden}"`), hidden);
  assert.ok(
    !(await read('vendor', '/checkout/success')).html.includes(
      'Thank you for your order',
    ),
  );
  assert.match((await read('market')).html, /class="harvest-header/);
  console.log(
    'HTTP SSR passed: Harvest, retired v1 and premium v2 on all 11 vendor routes, populated cart/checkout/verified success, disabled links, unsaved theme rendering, public isolation, commerce preview denial, unchanged market shell, About shapes/positions, escaping, Unicode and preview security. No captures or database changes.',
  );
} catch (error) {
  console.error(output);
  throw error;
} finally {
  astro.kill();
  if (astro.exitCode === null) await once(astro, 'exit');
  backend.closeAllConnections();
  await new Promise<void>((done) => backend.close(() => done()));
}
