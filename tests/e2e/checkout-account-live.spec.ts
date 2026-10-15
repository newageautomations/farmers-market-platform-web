import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const readyPath = process.env.FRONTEND_CHECKOUT_ACCOUNT_READY;
test.skip(
  !readyPath,
  'Explicit real disposable checkout/account harness required',
);
test.beforeEach(({ page }) => {
  page.setDefaultTimeout(20000);
});
const ready = readyPath
  ? (JSON.parse(readFileSync(readyPath, 'utf8')) as {
      controlUrl: string;
      controlKey: string;
      occurrenceA: string;
      occurrenceB: string;
      variantA: string;
      variantB: string;
      browserEmail: string;
    })
  : undefined;
const port = process.env.PHONE_TEST_STOREFRONT_PORT ?? '4337';
const vendor = `http://vendor-a.localhost:${port}`,
  market = `http://market-a.localhost:${port}`,
  marketB = `http://market-b.localhost:${port}`;
async function control(path: string, body: Record<string, unknown> = {}) {
  const response = await fetch(ready!.controlUrl + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fixture-key': ready!.controlKey,
    },
    body: JSON.stringify(body),
  });
  expect(response.ok, 'Disposable backend assertion').toBe(true);
  return response.json();
}
async function accessibility(page: Page) {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.map((v) => ({ id: v.id, impact: v.impact })),
      'Axe has no violations',
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      'No page overflow',
    ).toBe(true);
  }
}
async function checkout(page: Page, authenticated = false) {
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await expect(
    page.getByRole('heading', { name: 'Contact', exact: true }),
  ).toBeVisible();
  await accessibility(page);
  if (authenticated) {
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
      ready!.browserEmail,
    );
    await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute(
      'readonly',
      '',
    );
    await expect(page.getByLabel('First name', { exact: true })).toHaveValue(
      'Browser',
    );
    await page
      .getByRole('button', { name: 'Continue to pickup', exact: true })
      .click();
  } else {
    await page.getByLabel('First name', { exact: true }).fill('Browser');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Buyer');
    await page.keyboard.press('Tab');
    await page.keyboard.type(ready!.browserEmail);
    await page.keyboard.press('Tab');
    await expect(page.locator('.phone-field[data-ready="true"]')).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.type('2105550154');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
  }
  await expect(
    page.getByRole('heading', { name: 'Pickup', exact: true }),
  ).toBeVisible();
  await accessibility(page);
  await page
    .getByRole('button', { name: 'Review order', exact: true })
    .press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Review', exact: true }),
  ).toBeVisible();
  await accessibility(page);
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Payment', exact: true }),
  ).toBeVisible();
  await accessibility(page);
  await page
    .getByLabel('Payment method', { exact: true })
    .selectOption('dev-test-payment');
  await page
    .getByRole('button', { name: /^(Place order|Complete purchase)$/ })
    .click();
  await expect(
    page.getByText('Your order is confirmed.', { exact: true }),
  ).toBeVisible();
  await accessibility(page);
  const order = new URL(page.url()).searchParams.get('order');
  expect(!!order).toBe(true);
  await page.reload();
  await expect(
    page.getByText('Your order is confirmed.', { exact: true }),
  ).toBeVisible();
  return order!;
}
test('purchase first, claim same identity later, real direct and multi-Vendor checkout, account history and first-party cross-domain SSO', async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await page.goto(vendor + '/products/inventory-0');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'View cart', exact: true }).click();
  const direct = await checkout(page);
  await control('/assert', { purchases: 1, verified: false });
  await page.goto(
    market + `/occurrences/${ready!.occurrenceA}/products/${ready!.variantA}`,
  );
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await expect(
    page.getByText('Added to your cart.', { exact: false }),
  ).toBeVisible();
  await page.goto(
    market + `/occurrences/${ready!.occurrenceA}/products/${ready!.variantB}`,
  );
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'View cart', exact: true }).click();
  const aggregate = await checkout(page);
  await control('/assert', { purchases: 2, verified: false });
  await page.getByRole('button', { name: 'Email me an account link' }).click();
  await expect(
    page.getByText('Check your email to access your orders.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Email me an account link' }).click();
  expect(
    (await control('/mail-count', { email: ready!.browserEmail })).count,
  ).toBe(1);
  const mail = await control('/mail', { email: ready!.browserEmail });
  // Navigation values stay in process memory and are redacted by the terminal reporter.
  await page.evaluate((url) => window.location.assign(url), mail.url);
  await page.getByRole('button', { name: 'Access my orders' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Verify your personal phone',
      exact: true,
    }),
  ).toBeVisible();
  await control('/assert', { purchases: 2, verified: false });
  await expect(page.locator('.phone-field[data-ready="true"]')).toBeVisible();
  await page
    .getByLabel('Personal phone number (required)', { exact: true })
    .fill('2105550153');
  await page
    .getByRole('button', { name: 'Send SMS verification code', exact: true })
    .click();
  await expect(
    page.getByLabel('SMS verification code', { exact: true }),
  ).toBeVisible();
  const sms = await control('/sms', { phone: '+12105550153' });
  await page
    .getByLabel('SMS verification code', { exact: true })
    .fill(sms.code);
  await page
    .getByLabel('New password', { exact: true })
    .fill('Local-identity-regression-1!password');
  await page
    .getByRole('button', { name: 'Verify personal phone', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  await accessibility(page);
  await control('/assert', { purchases: 2, verified: true });
  await page.getByRole('link', { name: 'View order history' }).click();
  await accessibility(page);
  expect(await page.locator('.customer-order-list > li').count()).toBe(2);
  await page.goto(market + `/account/orders/${direct}`);
  await expect(
    page.getByText('Direct Vendor purchase', { exact: true }),
  ).toBeVisible();
  await accessibility(page);
  await page.goto(market + `/account/orders/${aggregate}`);
  await expect(
    page.getByText('Market purchase', { exact: true }),
  ).toBeVisible();
  await accessibility(page);
  expect(await page.locator('section[aria-label^="Vendor"]').count()).toBe(2);
  await page.goto(vendor + '/account');
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  expect(
    (await control('/mail-count', { email: ready!.browserEmail })).count,
  ).toBe(0);
  await page.goto(marketB + '/account');
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  expect(
    (await control('/mail-count', { email: ready!.browserEmail })).count,
  ).toBe(0);
  const cookies = await context.cookies();
  expect(
    cookies.some(
      (c) =>
        c.name === 'platform-account' &&
        c.domain === 'auth.platform.localhost' &&
        c.httpOnly &&
        c.sameSite === 'Lax',
    ),
  ).toBe(true);
  expect(
    cookies.some((c) => c.domain === 'vendor-a.localhost' && c.httpOnly),
  ).toBe(true);
  expect(
    cookies.some((c) => c.domain === 'market-a.localhost' && c.httpOnly),
  ).toBe(true);
  expect(cookies.every((c) => !c.domain.startsWith('.'))).toBe(true);
  expect(new URL(page.url()).searchParams.has('code')).toBe(false);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page
    .getByRole('button', { name: 'Sign out everywhere', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'You are signed out' }),
  ).toBeVisible();
  await page.goto(vendor + '/account');
  await page
    .getByRole('link', { name: 'Sign in with Email Link', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Access your orders', exact: true }),
  ).toBeVisible();
  await accessibility(page);
  await page.getByLabel('Email', { exact: true }).fill(ready!.browserEmail);
  await page.getByRole('button', { name: 'Request account link' }).click();
  const login = await control('/mail', { email: ready!.browserEmail });
  await page.evaluate((url) => window.location.assign(url), login.url);
  await page.getByRole('button', { name: 'Access my orders' }).click();
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  await control('/assert', { purchases: 2, verified: true });
  await page.goto(vendor + '/products/inventory-0');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'View cart', exact: true }).click();
  await checkout(page, true);
  await control('/assert', { purchases: 3, verified: true });
  await page.goto(vendor + '/account/orders');
  expect(await page.locator('.customer-order-list > li').count()).toBe(3);
  // The password established by the original verified claim must restore the
  // same identity and purchase history through all three storefronts.
  await page.goto(`http://auth.platform.localhost:${port}/auth/logout`);
  await page
    .getByRole('button', { name: 'Sign out everywhere', exact: true })
    .click();
  await page.goto(market + '/account/login');
  await page.getByLabel('Email', { exact: true }).fill(ready!.browserEmail);
  await page
    .getByLabel('Password', { exact: true })
    .fill('Local-identity-regression-1!password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  for (const storefront of [vendor, marketB]) {
    await page.goto(storefront + '/account');
    await expect(
      page.getByRole('heading', { name: 'Overview', exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).origin).toBe(storefront);
    await page.goto(storefront + '/account/orders');
    expect(await page.locator('.customer-order-list > li').count()).toBe(3);
  }
  await control('/assert', { purchases: 3, verified: true });
});
