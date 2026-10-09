import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fixtureSession } from './storefront-session';
const ready = JSON.parse(
  readFileSync(process.env.FRONTEND_MARKET_STOREFRONT_READY!, 'utf8'),
) as {
  controlUrl: string;
  controlKey: string;
  occurrenceA1: string;
  occurrenceA2: string;
  occurrenceB: string;
  variantA: string;
  variantA2: string;
  variantB: string;
  foreignVariant: string;
  vendorA: string;
  vendorB: string;
  facet: string;
  customer: string;
  password: string;
};
const origin = 'http://market-a.localhost:4336';
const occurrence = `/occurrences/${ready.occurrenceA1}`;
const detail = `${occurrence}/products/${ready.variantA}`;
async function control(action: string) {
  const response = await fetch(`${ready.controlUrl}/${action}`, {
    method: 'POST',
    headers: { 'x-fixture-key': ready.controlKey },
  });
  expect(response.status).toBe(200);
}
test('real anonymous Market home, occurrence paging/filter/sort/detail and tenant attacks', async ({
  page,
}) => {
  await page.goto(origin);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Synthetic Market A',
  );
  await expect(page.locator('[data-composition]')).toHaveAttribute(
    'data-composition',
    'market',
  );
  await expect(
    page.getByRole('link', { name: 'Browse the next occurrence' }),
  ).toHaveAttribute('href', occurrence);
  await expect(page.locator('body')).not.toContainText('Development fixture');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    `${origin}/`,
  );
  await page.getByRole('link', { name: 'Browse the next occurrence' }).click();
  await expect(page.locator('.product-card')).toHaveCount(12);
  await expect(page.getByLabel('Vendor A (13)', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Vendor B (1)', { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Vendor C');
  await expect(page.locator('body')).toContainText('DOMAIN_TIME_ONLY');
  await page.getByRole('link', { name: 'Next page' }).click();
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByLabel('Sort offerings').selectOption('PRICE_DESC');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.locator('.product-card').first()).toContainText(
    'Market Orchard Box',
  );
  await page.getByLabel('Vendor B (1)', { exact: true }).check();
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card')).toContainText('Vendor B');
  await page.goto(`${origin}${occurrence}?facet=${ready.facet}`);
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('link', { name: /Market Harvest Box/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Market Harvest Box',
  );
  await expect(page.locator('body')).toContainText('From Vendor A');
  await expect(page.locator('img.product-media')).toHaveAttribute(
    'src',
    /asset.svg/,
  );
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    `${origin}${detail}`,
  );
  await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
  for (const path of [
    `/occurrences/${ready.occurrenceB}`,
    `${occurrence}/products/${ready.foreignVariant}`,
    `/occurrences/${ready.occurrenceA2}/products/${ready.variantA}`,
  ]) {
    const response = await page.goto(origin + path);
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute(
      'content',
      'noindex,nofollow',
    );
    await expect(page.locator('.product-card')).toHaveCount(0);
  }
  await control('close-a');
  try {
    expect((await page.goto(origin + detail))?.status()).toBe(404);
  } finally {
    await control('restore-a');
  }
  await control('cancel-a1');
  try {
    expect((await page.goto(origin + occurrence))?.status()).toBe(404);
  } finally {
    await control('restore-a1');
  }
  await page.goto('http://market-b.localhost:4336');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Synthetic Market B',
  );
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    'http://market-b.localhost:4336/',
  );
  expect(
    (await page.goto('http://vendor-a.localhost:4336' + occurrence))?.status(),
  ).toBe(404);
});
test('real verified cookie login, three lines/two Vendors, coupons, cart edits and occurrence binding', async ({
  page,
}) => {
  await page.goto(origin + '/cart');
  await fixtureSession(page, ready.customer, ready.password);
  await expect(
    page.getByRole('heading', { name: 'Your cart is empty' }),
  ).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0);
  for (const variant of [ready.variantA, ready.variantA2, ready.variantB]) {
    await page.goto(`${origin}${occurrence}/products/${variant}`);
    await page.getByLabel('Quantity', { exact: true }).fill('2');
    await page
      .getByRole('button', { name: 'Add to cart', exact: true })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Added to your cart.' }),
    ).toBeVisible();
  }
  await page.goto(origin + '/cart');
  await expect(page.locator('[data-vendor-group]')).toHaveCount(2);
  await expect(page.locator('.cart-line')).toHaveCount(3);
  await expect(page.locator('[data-cart-total]')).toHaveText('$74.00');
  await expect(page.locator('[data-cart-occurrence]')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Cart, 6 items', exact: true }),
  ).toBeVisible();
  for (const code of ['VENDORA', 'VENDORB']) {
    await page.getByLabel('Vendor coupon code', { exact: true }).fill(code);
    await page
      .getByRole('button', { name: 'Apply coupon', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: `Remove coupon ${code}` }),
    ).toBeVisible();
  }
  await expect(page.locator('[data-cart-total]')).toHaveText('$66.60');
  await page.getByLabel('Vendor coupon code', { exact: true }).fill('VENDORA2');
  await page.getByRole('button', { name: 'Apply coupon', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Remove coupon VENDORA2', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Remove coupon VENDORA', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Remove coupon VENDORA', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Remove coupon VENDORB', exact: true }),
  ).toBeVisible();
  await page.goto(`${origin}/occurrences/${ready.occurrenceA2}`);
  await expect(
    page.getByRole('button', { name: 'Use this occurrence for my cart' }),
  ).toBeDisabled();
  await expect(page.locator('body')).toContainText(
    'Remove the current items before switching occurrences.',
  );
  await control('close-a');
  try {
    await page.goto(origin + '/cart');
    await expect(page.locator('.cart-line')).toHaveCount(3);
    const line = page
      .locator('.cart-line')
      .filter({ hasText: 'Harvest Standard' });
    await line.getByRole('spinbutton').fill('3');
    await line.getByRole('button', { name: 'Update quantity' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await line.getByRole('spinbutton').fill('1');
    await line.getByRole('button', { name: 'Update quantity' }).click();
    await expect(line).toContainText('Quantity: 1');
    await line.getByRole('button', { name: 'Remove Harvest Standard' }).click();
    await expect(page.locator('.cart-line')).toHaveCount(2);
  } finally {
    await control('restore-a');
  }
  await page.goto('http://market-b.localhost:4336/cart');
  await expect(page.locator('[data-vendor-group]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Market Harvest Box');
  await control('assert-no-placement');
});
for (const width of [390, 768, 1280])
  test(`real Market accessibility and responsive controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/cart');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await fixtureSession(page, ready.customer, ready.password);
    await expect(page.locator('[data-vendor-group]')).toHaveCount(2);
    for (const path of ['/', occurrence, detail, '/cart']) {
      await page.goto(origin + path);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const controls = page.locator(
        'main button:visible:enabled, main input:visible:enabled, main select:visible:enabled',
      );
      for (const control of await controls.all()) {
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
      await page.getByRole('link', { name: 'Skip to content' }).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main')).toBeFocused();
    }
    await expect(page.locator('meta[name=robots]')).toHaveAttribute(
      'content',
      'noindex,nofollow',
    );
  });
