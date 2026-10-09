import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fixtureSession } from './storefront-session';

const ready = JSON.parse(
  readFileSync(process.env.FRONTEND_STOREFRONT_READY!, 'utf8'),
) as {
  endpoint: string;
  controlUrl: string;
  controlKey: string;
  variantA: string;
  variantALarge: string;
  variantB: string;
  customer: string;
  password: string;
};
const url = (host: string, path = '/') =>
  `http://${host}.localhost:4336${path}`;
async function signIn(page: Page, host = 'vendor-a') {
  await page.goto(url(host, '/cart'));
  await fixtureSession(page, ready.customer, ready.password);
}
async function control(action: string) {
  const response = await fetch(`${ready.controlUrl}/${action}`, {
    method: 'POST',
    headers: { 'x-fixture-key': ready.controlKey },
  });
  expect(response.status).toBe(200);
}
async function cartCall(
  page: Page,
  action: string,
  inputs: Record<string, unknown> = {},
) {
  return page.evaluate(
    async ({ action, inputs }) => {
      // Only the public storefront identity is used. A client-supplied Channel is never accepted.
      const html =
        document
          .querySelector('astro-island[component-export="VendorCart"]')
          ?.getAttribute('props') ?? '';
      const storefrontId = JSON.parse(html).storefrontId[1];
      const response = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefrontId, action, ...inputs }),
      });
      return { status: response.status, body: await response.json() };
    },
    { action, inputs },
  );
}

test('real hostname SSR resolves Vendor A then B, native catalog paging/search and foreign Product isolation', async ({
  page,
  browser,
}) => {
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const ssr = await noScript.newPage();
  for (const host of ['vendor-a', 'vendor-b']) {
    const res = await ssr.goto(url(host));
    expect(res?.status()).toBe(200);
    await expect(ssr.getByRole('heading', { level: 1 })).toHaveText(
      `Synthetic Vendor ${host.endsWith('a') ? 'A' : 'B'}`,
    );
    await expect(ssr.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      url(host),
    );
    await expect(ssr.locator('body')).not.toContainText(
      host.endsWith('a') ? 'Orchard Box' : 'Harvest Box',
    );
    await expect(ssr.locator('html')).toHaveAttribute(
      'style',
      /--brand-primary:#244967/,
    );
    await expect(ssr.locator('body')).not.toContainText('Development fixture');
    expect(res?.headers()['cache-control']).toContain('no-store');
  }
  await noScript.close();
  await page.goto(url('vendor-a', '/products'));
  expect(await page.locator('.product-card').count()).toBe(12);
  await page.getByRole('link', { name: 'Next page' }).click();
  expect(await page.locator('.product-card').count()).toBeGreaterThan(0);
  await page.getByLabel('Search products').fill('Harvest');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card')).toContainText('$10.00 to $15.00');
  await page.getByLabel('Sort products').selectOption('desc');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/sort=desc/);
  await page.getByRole('link', { name: 'Harvest Box', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Harvest Box',
  );
  await expect(page.locator('.product-description')).toContainText(
    'Synthetic Harvest Box',
  );
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    url('vendor-a', '/products/harvest-box'),
  );
  await expect(page.getByLabel('Product option')).toHaveCount(1);
  const asset = page.locator('.product-gallery img').first();
  await expect(asset).toBeVisible();
  expect(
    await asset.evaluate(
      (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
    ),
  ).toBe(true);
  for (const slug of ['orchard-box', 'missing-product']) {
    const response = await page.goto(url('vendor-a', `/products/${slug}`));
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Product not found',
    );
    await expect(page.locator('meta[name=robots]')).toHaveAttribute(
      'content',
      'noindex,nofollow',
    );
    await expect(page.locator('body')).not.toContainText('Orchard Box');
  }
});

test('unknown/inactive hosts fail closed, Market remains MARKET, and empty catalog uses safe states', async ({
  page,
}) => {
  for (const host of ['unknown', 'inactive']) {
    const res = await page.goto(url(host));
    expect(res?.status()).toBe(404);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute(
      'content',
      'noindex,nofollow',
    );
    await expect(page.locator('link[rel=canonical]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Synthetic Vendor');
  }
  await page.goto(url('market'));
  await expect(page.locator('[data-composition]')).toHaveAttribute(
    'data-composition',
    'market',
  );
  await expect(page.locator('.product-card')).toHaveCount(0);
  expect((await page.goto(url('market', '/products')))?.status()).toBe(404);
  expect((await page.goto(url('market', '/cart')))?.status()).toBe(200);
  await expect(
    page.locator('astro-island[component-export="MarketCart"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('astro-island[component-export="VendorCart"]'),
  ).toHaveCount(0);
  await page.goto(url('empty', '/products'));
  await expect(
    page.getByRole('heading', { name: 'No products found' }),
  ).toBeVisible();
  await page.goto(url('vendor-a', '/products?q=nonexistent'));
  await expect(
    page.getByRole('heading', { name: 'No products found' }),
  ).toBeVisible();
});

test('real verified-session DIRECT_VENDOR cart selects options, suppresses duplicate clicks, adjusts, rejects and removes', async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByRole('heading', { name: 'Your cart is empty' }),
  ).toBeVisible();
  await page.goto(url('vendor-a', '/products/harvest-box'));
  await page.getByLabel('Product option').selectOption(ready.variantALarge);
  await expect(page.locator('[data-variant-price]')).toHaveText('$15.00');
  await page.getByLabel('Quantity', { exact: true }).fill('2');
  await page
    .getByRole('button', { name: 'Add to cart', exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(page.getByRole('status')).toContainText('Added to your cart.');
  await page.goto(url('vendor-a', '/cart'));
  await expect(page.locator('[data-cart-total]')).toHaveText('$30.00');
  await expect(page.locator('.cart-line')).toContainText('Quantity: 2');
  await page.getByRole('spinbutton').fill('3');
  await page.getByRole('button', { name: 'Update quantity' }).click();
  await expect(page.locator('[data-cart-total]')).toHaveText('$45.00');
  const truth = await cartCall(page, 'cart');
  expect(truth.body.result.cart.totalWithTax).toBe(4500);
  expect(truth.body.result.cart.lines[0].quantity).toBe(3);
  await page.getByRole('spinbutton').fill('1000');
  await page.getByRole('button', { name: 'Update quantity' }).click();
  await expect(page.getByRole('alert')).toContainText('quantity');
  const after = await cartCall(page, 'cart');
  await expect(page.locator('.cart-line')).toContainText(
    `Quantity: ${after.body.result.cart.lines[0].quantity}`,
  );
  const foreign = await cartCall(page, 'add', {
    variantId: ready.variantB,
    quantity: 1,
  });
  expect(foreign.status).not.toBe(200);
  const cart = await cartCall(page, 'cart');
  expect(
    cart.body.result.cart.lines.every(
      (line: { productVariant: { id: string } }) =>
        line.productVariant.id !== ready.variantB,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: /^Remove / }).click();
  await expect(
    page.getByRole('heading', { name: 'Your cart is empty' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /checkout|payment|place order/i }),
  ).toHaveCount(0);
});

test('same browser lifecycle and copied native session remain channel-isolated without merging or clearing A', async ({
  page,
  context,
}) => {
  await signIn(page);
  await page.goto(url('vendor-a', '/cart'));
  const add = await cartCall(page, 'add', {
    variantId: ready.variantA,
    quantity: 2,
  });
  expect(add.status).toBe(200);
  const aOrderId = add.body.result.cart.id;
  const cookies = await context.cookies(url('vendor-a'));
  await context.addCookies(
    cookies.map((cookie) => ({ ...cookie, domain: 'vendor-b.localhost' })),
  );
  await page.goto(url('vendor-b', '/cart'));
  await expect(page.locator('body')).not.toContainText('Harvest Box');
  const b = await cartCall(page, 'cart');
  expect(b.body.result.cart?.id).not.toBe(aOrderId);
  const addB = await cartCall(page, 'add', {
    variantId: ready.variantB,
    quantity: 1,
  });
  expect(addB.status).toBe(200);
  await page.reload();
  await expect(page.locator('.cart-line')).toContainText('Orchard Box');
  await expect(page.locator('body')).not.toContainText('Harvest Box');
  await page.goto(url('vendor-a', '/cart'));
  const restored = await cartCall(page, 'cart');
  expect(restored.body.result.cart?.id).toBe(aOrderId);
  await expect(page.locator('.cart-line')).toContainText('Harvest Box');
  await expect(page.locator('body')).not.toContainText('Orchard Box');
  console.log(
    'Channel active-order strategy preserves A while B receives a separate Order, including a copied native session.',
  );
});

test('fresh resolver revocation and current Product name/price/enabled state take effect without restart', async ({
  page,
}) => {
  await page.goto(url('vendor-a'));
  await control('deactivate');
  try {
    expect((await page.goto(url('vendor-a')))?.status()).toBe(404);
    await expect(page.locator('link[rel=canonical]')).toHaveCount(0);
  } finally {
    await control('restore');
  }
  await control('change-product');
  try {
    await page.goto(url('vendor-a', '/products/harvest-box'));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Harvest Box Updated',
    );
    await expect(page.locator('body')).toContainText('$12.34');
    await control('disable-product');
    expect(
      (await page.goto(url('vendor-a', '/products/harvest-box')))?.status(),
    ).toBe(404);
  } finally {
    await control('restore-product');
  }
});

test('axe, keyboard controls and 390/768/1280 responsive views without browser media', async ({
  page,
}) => {
  await signIn(page);
  await page.goto(url('vendor-a', '/cart'));
  expect(
    (await cartCall(page, 'add', { variantId: ready.variantA, quantity: 1 }))
      .status,
  ).toBe(200);
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/products', '/products/harvest-box', '/cart']) {
      await page.goto(url('vendor-a', path));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${width} ${path}`).toBe(false);
      await expect(
        page
          .getByRole('navigation', { name: 'Main navigation' })
          .getByRole('link', { name: 'Cart', exact: true }),
      ).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).analyze()).violations,
        `${width} ${path}`,
      ).toEqual([]);
    }
  }
  await page.goto(url('vendor-a', '/products/harvest-box'));
  const options = page.getByLabel('Product option');
  await options.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Quantity', { exact: true })).toBeFocused();
  await page.goto(url('unknown'));
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('public Shop documents and structured data omit protected inventory, admin and fabricated facts', async ({
  page,
}) => {
  await page.goto(url('vendor-a', '/products/harvest-box'));
  const structured = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      '{}',
  );
  expect(structured.name).toBe('Harvest Box');
  expect(structured.url).toBe(url('vendor-a', '/products/harvest-box'));
  expect(structured).not.toHaveProperty('availability');
  expect(structured).not.toHaveProperty('aggregateRating');
  const docs = readFileSync('packages/api/operations/shop.graphql', 'utf8');
  expect(docs).not.toMatch(
    /stockOnHand|stockAllocated|physicalFree|StockLocation|canonicalSource|platformOwner|ownVendorCatalog|ownOperationalInventory|ownCustomers|beginProviderCheckout|finalizeProviderCheckout/,
  );
  await expect(page.locator('body')).not.toContainText('In stock');
  await page.goto(url('vendor-a', '/products/garden-produce-1'));
  await expect(page.locator('.product-placeholder')).toBeVisible();
  await control('break-asset');
  try {
    await page.goto(url('vendor-a', '/products/harvest-box'));
    await expect(
      page
        .locator('.product-gallery')
        .getByRole('img', { name: 'Harvest Box: image unavailable' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  } finally {
    await control('restore-asset');
  }
});
