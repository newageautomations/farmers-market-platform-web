/** HTTP-only real Astro SSR qualification. No browser, captures or database. */
import assert from 'node:assert/strict';
import { createServer, request, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { resolve, dirname, join } from 'node:path';
import {
  defaultStorefrontAppearance,
  defaultAboutCta,
  defaultFindUs,
  vendorAppearanceDefaults,
  type AboutSection,
} from '@market/theme/storefront';
import {
  fixtureCatalog,
  fixtureProduct,
} from '@market/storefront-core/fixtures';

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
  if (query.includes('vendorPreorderOccurrences')) {
    res.end(JSON.stringify({ data: { vendorPreorderOccurrences: [] } }));
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
          : fixtureCatalog({ skip: 0, take: 3, search: '', sort: 'asc' }),
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
  console.log(
    'HTTP SSR passed: vendor/market homepages, real About sections, shared shell, layouts/order/visibility, shapes/positions, safe escaping, CTA, legacy/Unicode preservation, unsaved preview, isolation and preview security. No browser or captures.',
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
