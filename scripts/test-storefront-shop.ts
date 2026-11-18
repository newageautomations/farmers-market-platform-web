/** Real Harvest vendor/market SSR against a bounded local fake Shop API. Optional --browser checks hydration. */
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { emptyProductInformation } from '@market/api';
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
let marketSite = false;
let cartQuantity = 0;
let selectedCartOccurrence = '7';
const backend = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/storefront-context/resolve') {
    res.end(
      JSON.stringify({
        storefrontId: '1',
        storefrontKey: 'vendor',
        kind: marketSite ? 'MARKET' : 'VENDOR',
        displayName: marketSite ? 'Test Saturday Market' : 'Test Farm',
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
  if (marketSite && query.includes('selectCommerceContext')) {
    selectedCartOccurrence = variables.occurrenceId;
    data = {
      selectCommerceContext: {
        kind: 'MARKET_OCCURRENCE',
        marketId: '1',
        occurrenceId: variables.occurrenceId,
      },
    };
  } else if (marketSite && query.includes('addItemToOrder')) {
    cartQuantity += variables.quantity;
    data = { addItemToOrder: { __typename: 'Order' } };
  } else if (marketSite && query.includes('marketStorefrontOccurrences')) {
    if ((variables.options?.take ?? 20) > 50) {
      res.end(
        JSON.stringify({
          errors: [{ message: 'PUBLIC_OCCURRENCE_BOUNDS_REQUIRED' }],
        }),
      );
      return;
    }
    data = {
      marketStorefrontOccurrences: {
        totalItems: mode === 'none' ? 0 : 2,
        items:
          mode === 'none'
            ? []
            : [occurrence, { ...occurrence, id: '8', venue: 'Sunday garden' }],
      },
    };
  } else if (marketSite && query.includes('marketStorefrontOccurrence')) {
    data = {
      marketStorefrontOccurrence: ['7', '8'].includes(variables.id)
        ? { ...occurrence, id: variables.id }
        : null,
    };
  } else if (marketSite && query.includes('marketOccurrenceVendors')) {
    data = {
      marketOccurrenceVendors: [
        {
          vendorId: '10',
          name: 'Test Farm',
          image: '/assets/vendor-mark.svg',
          storefrontUrl: null,
          offeringCount: 3,
        },
      ],
    };
  } else if (marketSite && query.includes('MarketStorefrontProduct')) {
    const native = products.find((product) => product.id === variables.id);
    data = {
      product: native
        ? {
            ...native,
            productInformation: JSON.stringify({
              ...emptyProductInformation(),
              ingredients: { enabled: true, content: 'Local ingredients' },
            }),
            assets: [],
            optionGroups: [],
            variants: native.variants.map((variant) => ({
              ...variant,
              sku: '',
              assets: [],
              featuredAsset: null,
              options: [],
            })),
          }
        : null,
    };
  } else if (marketSite && query.includes('marketOccurrenceCatalog')) {
    const options = variables.options ?? {};
    const entries =
      mode === 'empty' || !['7', '8'].includes(variables.occurrenceId)
        ? []
        : products
            .map((product, i) => ({
              productId: product.id,
              variantId: product.variants[0]!.id,
              vendorId: String(i === 2 ? 20 : 10),
              vendorName: i === 2 ? 'Orchard Farm' : 'Test Farm',
              name: product.variants[0]!.name,
              productName: product.name,
              description: product.description,
              price: product.variants[0]!.priceWithTax,
              currencyCode: 'USD',
              featuredAsset: product.featuredAsset
                ? { ...product.featuredAsset, width: 640, height: 480 }
                : null,
              primaryCategoryId: String(i + 1),
              categoryIds: [String(i + 1)],
              tagIds: [],
              facetValueIds: [],
              productVariants: product.variants.map((variant) => ({
                variantId: variant.id,
                name: variant.name,
                price: variant.priceWithTax,
                currencyCode: variant.currencyCode,
              })),
            }))
            .filter(
              (item) =>
                (!options.categoryIds?.length ||
                  options.categoryIds.includes(item.primaryCategoryId)) &&
                (!options.vendorIds?.length ||
                  options.vendorIds.includes(item.vendorId)) &&
                (!options.variantIds?.length ||
                  item.productVariants.some((variant) =>
                    options.variantIds.includes(variant.variantId),
                  )),
            );
    if (options.variantIds?.length)
      for (const item of entries) {
        const variant = item.productVariants.find((entry) =>
          options.variantIds.includes(entry.variantId),
        )!;
        item.variantId = variant.variantId;
      }
    entries.sort((a, b) =>
      options.sort === 'PRICE_DESC'
        ? b.price - a.price
        : options.sort === 'PRICE_ASC'
          ? a.price - b.price
          : options.sort === 'NAME_DESC'
            ? b.productName.localeCompare(a.productName)
            : a.productName.localeCompare(b.productName),
    );
    data = {
      marketOccurrenceCatalog: {
        occurrenceId: variables.occurrenceId,
        eligibility: 'DOMAIN_TIME_ONLY',
        totalItems: entries.length,
        items: entries.slice(
          options.skip ?? 0,
          (options.skip ?? 0) + (options.take ?? 12),
        ),
        taxonomy: {
          categories: ['Produce', 'Bakery', 'Pantry'].map((name, i) => ({
            id: String(i + 1),
            code: name.toLowerCase(),
            name,
            parentId: null,
            position: i,
            pathIds: [String(i + 1)],
            pathCodes: [name.toLowerCase()],
            pathNames: [name],
            count: 1,
          })),
          tags: [],
        },
        facets: [],
        vendors: [],
      },
    };
  } else if (query.includes('vendorPreorderOccurrences'))
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
    data = {
      marketActiveCart:
        marketSite && cartQuantity
          ? {
              id: '77',
              kind: 'MARKET_OCCURRENCE',
              occurrence: { ...occurrence, id: selectedCartOccurrence },
              state: 'AddingItems',
              currencyCode: 'USD',
              totalQuantity: cartQuantity,
              subTotalWithTax: 1000,
              totalWithTax: 1000,
              shippingWithTax: 0,
              couponCodes: [],
              discounts: [],
              taxSummary: [],
              groups: [],
            }
          : null,
    };
  else if (query.includes('VendorStorefrontTaxonomy')) {
    const categories = ['Produce', 'Bakery', 'Pantry'].map((name, i) => ({
      id: String(i + 1),
      code: name.toLowerCase(),
      name,
      parentId: null,
      position: i,
      pathIds: [String(i + 1)],
      pathCodes: [name.toLowerCase()],
      pathNames: [name],
      count: 1,
    }));
    data = {
      vendorStorefrontTaxonomy: {
        taxonomy: { categories, tags: [] },
        totalProducts: products.length,
        products: products
          .filter(
            (_, i) =>
              !variables.categoryIds?.length ||
              variables.categoryIds.includes(String(i + 1)),
          )
          .map((p, i) => ({
            productId: p.id,
            primaryCategoryId: String(i + 1),
            categoryIds: [i + 1],
            tagIds: [],
            variantIds: p.variants.map((v) => Number(v.id)),
          })),
      },
    };
  } else if (query.includes('VendorProducts'))
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
  return new Promise<{ status: number; html: string; location?: string }>(
    (done, fail) => {
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
          res.on('end', () =>
            done({
              status: res.statusCode!,
              html,
              location: res.headers.location,
            }),
          );
        },
      );
      req.on('error', fail);
      req.end();
    },
  );
}
try {
  const deadline = Date.now() + 90000;
  while (!output.includes('ready in')) {
    if (astro.exitCode !== null || Date.now() > deadline) throw Error(output);
    await new Promise((r) => setTimeout(r, 200));
  }
  let page = await read();
  assert.equal(page.status, 200, output + page.html.slice(-7000));
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
    assert.ok(page.html.includes(text), text + output + page.html.slice(-9000));
  assert.equal((page.html.match(/class="product-card-link"/g) ?? []).length, 3);
  assert.ok(
    page.html.includes('/products/' + products[0]!.slug + '?occurrence=7'),
  );
  assert.ok(!page.html.includes('catalog-search'));
  assert.ok(!page.html.includes('breadcrumb'));
  page = await read('/products?category=2&sort=name&occurrence=8');
  assert.equal(page.status, 200, output + page.html.slice(-7000));
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
  marketSite = true;
  mode = 'normal';
  page = await read('/shop');
  assert.equal(page.status, 200, output + page.html.slice(-7000));
  assert.ok(page.html.includes('Choose a market date to explore the options'));
  assert.ok(!page.html.includes('class="product-card-link"'));
  assert.ok(page.html.includes('Choose market'));
  assert.ok(page.html.includes('Change Market'));
  page = await read('/shop?occurrence=7');
  assert.equal(page.status, 200, output + page.html.slice(-7000));
  const marketMarkup = page.html.slice(page.html.indexOf('<body>'));
  for (const text of [
    'Product Categories',
    'All Products',
    'Change Market',
    'Preordering for Test Saturday Market',
    'harvest-products',
    'product-seller',
    'Test Farm',
    'Orchard Farm',
    '/shop/products/',
  ])
    assert.ok(marketMarkup.includes(text), text);
  assert.ok(!marketMarkup.includes('Catalog eligibility'));
  assert.ok(!marketMarkup.includes('href="/occurrences/'));
  assert.equal(
    (marketMarkup.match(/class="product-card-link"/g) ?? []).length,
    3,
  );
  page = await read('/shop?category=2&vendor=10&sort=PRICE_DESC&occurrence=8');
  assert.equal(page.status, 200, output + page.html.slice(-7000));
  assert.equal((page.html.match(/class="product-card-link"/g) ?? []).length, 1);
  assert.ok(page.html.includes('Sunday garden'));
  assert.ok(page.html.includes('name="vendor" value="10"'));
  assert.ok(page.html.includes('name="occurrence" value="8"'));
  page = await read(
    `/shop/products/${products[1]!.variants[0]!.id}?occurrence=7`,
  );
  assert.equal(page.status, 200, output + page.html.slice(-7000));
  for (const text of [
    'product-gallery',
    'product-summary',
    'market-product-vendor',
    '/assets/vendor-mark.svg',
    'Test Farm',
    'Product option',
    'Quantity',
    'product-information',
    'Local ingredients',
  ])
    assert.ok(page.html.includes(text), text + output + page.html.slice(-9000));
  page = await read('/shop?occurrence=9999');
  assert.equal(page.status, 404);
  page = await read('/shop?category=invalid');
  assert.equal(page.status, 400);
  page = await read('/shop/products/9999?occurrence=7');
  assert.equal(page.status, 404);
  page = await read('/occurrences/8?category=2');
  assert.equal(page.status, 302);
  assert.equal(page.location, '/shop?category=2&occurrence=8');
  page = await read(`/occurrences/8/products/${products[1]!.variants[0]!.id}`);
  assert.equal(page.status, 302);
  assert.ok(page.location?.endsWith('?occurrence=8'));
  mode = 'none';
  page = await read('/shop');
  assert.equal(page.status, 200);
  assert.ok(page.html.includes('No upcoming pickup markets'));
  mode = 'empty';
  page = await read('/shop?occurrence=7');
  assert.equal(page.status, 200);
  assert.ok(page.html.includes('No products yet'));
  console.log(
    'PASS Market Harvest SSR: shared shop/cards/detail, vendor portraits, date/category/vendor/sort controls, invalid contexts, empty dates/catalog, legacy redirects',
  );
  if (process.argv.includes('--browser')) {
    mode = 'normal';
    const { chromium, expect } = await import('@playwright/test');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-proxy-server'],
    });
    try {
      const tab = await browser.newPage({
        viewport: { width: 1440, height: 1050 },
      });
      const errors: string[] = [];
      tab.on('pageerror', (error) => errors.push(error.message));
      const origin = `http://vendor.localhost:${port}`;
      await tab.route('**/*', (route) =>
        new URL(route.request().url()).origin === origin
          ? route.continue()
          : route.abort(),
      );
      const directory = resolve('docs/evidence/harvest-market-shop');
      await mkdir(directory, { recursive: true });
      await tab.goto(origin + '/shop');
      await tab
        .locator(
          'astro-island[component-export="VendorPreorderBanner"]:not([ssr])',
        )
        .waitFor();
      await tab
        .locator(
          'astro-island[component-export="ShopMarketSelection"]:not([ssr])',
        )
        .waitFor();
      await expect(
        tab.getByRole('heading', {
          name: 'Choose a market date to explore the options',
        }),
      ).toBeVisible();
      await expect(tab.locator('.product-card-link')).toHaveCount(0);
      await tab
        .getByRole('button', { name: 'Choose market', exact: true })
        .click();
      await tab.locator('.market-calendar-event').first().click();
      await expect(tab).toHaveURL(/occurrence=7/);
      await tab
        .locator(
          'astro-island[component-export="VendorPreorderBanner"]:not([ssr])',
        )
        .waitFor();
      await expect(tab.locator('.product-card-link')).toHaveCount(3);
      await tab.screenshot({
        path: join(directory, 'shop-desktop.png'),
        fullPage: true,
      });
      assert.ok(await tab.locator('.shop-categories').isVisible());
      await tab
        .getByRole('button', { name: 'Change Market', exact: true })
        .click();
      await expect(tab.getByRole('dialog')).toBeVisible();
      await tab.screenshot({ path: join(directory, 'change-market.png') });
      await tab.locator('.market-calendar-event').last().click();
      await expect(tab).toHaveURL(/occurrence=8/);
      await expect(tab.locator('.shop-market-banner')).toContainText(
        'Sunday garden',
      );
      // Category links retain the chosen pickup date.
      await tab.locator('.shop-categories a').nth(2).click();
      await expect(tab).toHaveURL(/occurrence=8/);
      await expect(tab.locator('.product-card-link')).toHaveCount(1);
      await tab.locator('.product-card-link').click();
      await tab
        .locator('astro-island[component-export="ProductPurchase"]:not([ssr])')
        .waitFor();
      await expect(tab.locator('.market-product-vendor')).toContainText(
        'Test Farm',
      );
      await expect(tab.locator('#product-variant option')).toHaveCount(
        products[1]!.variants.length + 1,
      );
      await expect(tab.locator('.market-vendor-image')).toBeVisible();
      await tab.screenshot({
        path: join(directory, 'product-desktop.png'),
        fullPage: true,
      });
      await tab.locator('#product-quantity').fill('2');
      await tab
        .getByRole('button', { name: 'Add to cart', exact: true })
        .first()
        .click();
      await expect(
        tab.getByText('Added to your cart.', { exact: false }).first(),
      ).toBeVisible();
      await expect(
        tab
          .locator('.harvest-header-actions')
          .getByRole('link', { name: 'Cart, 2 items' }),
      ).toBeVisible();
      // A populated order cannot be moved to another date by the reused calendar.
      await tab
        .getByRole('button', { name: 'Change Market', exact: true })
        .click();
      await tab.locator('.market-calendar-event').first().click();
      await expect(tab.getByRole('dialog').getByRole('alert')).toBeVisible();
      assert.ok(tab.url().includes('occurrence=8'));
      await tab.keyboard.press('Escape');
      await expect(tab.getByRole('dialog')).not.toBeVisible();
      await tab.setViewportSize({ width: 390, height: 844 });
      await tab.screenshot({
        path: join(directory, 'product-mobile.png'),
        fullPage: true,
      });
      assert.ok(
        await tab.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await tab.goto(origin + '/shop?occurrence=8');
      await expect(tab.locator('.product-card-link')).toHaveCount(3);
      await tab.screenshot({
        path: join(directory, 'shop-mobile.png'),
        fullPage: true,
      });
      assert.ok(
        await tab.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(errors, []);
      console.log(
        'PASS browser: desktop/mobile layouts, date/category navigation, vendor portrait, options, add-to-cart counter, populated-cart date lock, no client errors',
      );
    } finally {
      await browser.close();
    }
  }
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
