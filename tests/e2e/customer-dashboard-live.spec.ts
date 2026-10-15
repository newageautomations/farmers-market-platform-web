import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const manifest = process.env.CUSTOMER_DASHBOARD_READY;
test.skip(
  !manifest,
  'Run through npm run test:customer:live with the guarded local database',
);
const ready = manifest
  ? (JSON.parse(readFileSync(manifest, 'utf8')) as {
      email: string;
      password: string;
      port: number;
      occurrenceA: string;
      occurrenceB: string;
      variantA: string;
      variantB: string;
      marketUrl: string;
      vendorUrl: string;
      accountUrl: string;
      controlUrl: string;
      controlKey: string;
    })
  : undefined;
async function checkout(page: Page) {
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
    ready!.email,
  );
  await page
    .getByRole('button', { name: 'Continue to pickup', exact: true })
    .click();
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await page
    .getByRole('button', { name: 'Confirm local test payment' })
    .click();
  await expect(
    page.getByText('Your order is confirmed.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Your order is confirmed.', { exact: true }),
  ).toBeVisible();
  return new URL(page.url()).searchParams.get('order')!;
}
async function verifyLayout(page: Page) {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 390) {
      await page
        .getByText('Customer navigation', { exact: true })
        .first()
        .click();
      await expect(
        page
          .locator('.admin-mobile-nav')
          .getByRole('link', { name: 'Favorite Vendors' }),
      ).toBeVisible();
    }
  }
}
test('authenticated customer completes three real purchases and sees follows, grouped appearances and owned history', async ({
  page,
  context,
}) => {
  await page.goto(ready!.accountUrl);
  await page.getByLabel('Email', { exact: true }).fill(ready!.email);
  await page.getByLabel('Password', { exact: true }).fill(ready!.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  const central = `http://auth.platform.localhost:${ready!.port}`;
  await verifyLayout(page);
  expect(await page.locator('.admin-sidebar nav a').allTextContents()).toEqual([
    'Overview',
    'Order History',
    'Followed Markets',
    'Favorite Vendors',
    'Account Settings',
  ]);
  await page.goto(ready!.marketUrl + '/account/login');
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  const orders: string[] = [];
  for (const variant of [ready!.variantA, ready!.variantB]) {
    await page.goto(ready!.marketUrl + '/');
    await page
      .locator(`a[href="/occurrences/${ready!.occurrenceA}"]`)
      .first()
      .click();
    await page.goto(
      ready!.marketUrl +
        `/occurrences/${ready!.occurrenceA}/products/${variant}`,
    );
    await page
      .getByRole('button', { name: 'Add to cart', exact: true })
      .click();
    await expect(
      page.getByText('Added to your cart.', { exact: false }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'View cart', exact: true }).click();
    orders.push(await checkout(page));
  }
  await page.goto(ready!.vendorUrl + '/account/login');
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  await page.goto(ready!.vendorUrl + '/products/vendor-c-test-honey');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'View cart', exact: true }).click();
  orders.push(await checkout(page));
  await page.goto(central + '/account');
  await expect(page.locator('.customer-order-list > li')).toHaveCount(3);
  await expect(page.locator('[data-event-id]')).toHaveCount(3);
  await verifyLayout(page);
  await page.goto(central + '/account/orders');
  await expect(page.locator('.customer-order-list > li')).toHaveCount(3);
  await page
    .getByRole('link', { name: `Order ${orders[0]}`, exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Vendor A', exact: true }),
  ).toBeVisible();
  await verifyLayout(page);
  await page.goto(central + '/account/markets');
  await expect(
    page.locator('.customer-section').first().locator('[data-event-id]'),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole('button', { name: 'Unfollow Market Alpha', exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Follow Market Beta', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Follow Market Beta', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('updated');
  await page
    .getByRole('button', { name: 'Unfollow Market Beta', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Follow Market Beta', exact: true }),
  ).toBeVisible();
  await page.goto(central + '/account/vendors');
  await expect(page.locator('[data-event-id]')).toHaveCount(3);
  await expect(
    page.locator(`[data-event-id="${ready!.occurrenceA}"]`),
  ).toContainText('Vendor A, Vendor B');
  await expect(
    page.locator(`[data-event-id="${ready!.occurrenceB}"]`),
  ).toContainText('Vendor C');
  await verifyLayout(page);
  await page
    .getByRole('button', { name: 'Unfollow Vendor C', exact: true })
    .first()
    .click();
  await expect(page.locator('[data-event-id]')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Follow Vendor C', exact: true })
    .click();
  await expect(page.locator('[data-event-id]')).toHaveCount(3);
  await page.goto(central + '/account/settings');
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue(
    'Customer',
  );
  await page
    .getByRole('button', { name: 'Save personal profile', exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/settings\?saved=1$/);
  await expect(page.getByRole('status')).toContainText(
    'Your changes were saved',
  );
  const response = await fetch(ready!.controlUrl + '/assert', {
    method: 'POST',
    headers: { 'x-fixture-key': ready!.controlKey },
  });
  expect(response.ok).toBe(true);
  const stranger = await context.browser()!.newContext();
  const strangerPage = await stranger.newPage();
  await strangerPage.goto(central + `/account/orders/${orders[0]}`);
  await expect(
    strangerPage.getByLabel('Password', { exact: true }),
  ).toBeVisible();
  await stranger.close();
  await page.goto(central + '/account');
  mkdirSync('docs/evidence/customer-dashboard', { recursive: true });
  await page.screenshot({
    path: 'docs/evidence/customer-dashboard/overview-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: 'docs/evidence/customer-dashboard/overview-mobile.png',
    fullPage: true,
  });
  execFileSync(process.execPath, [
    'node_modules/tsx/dist/cli.mjs',
    'scripts/customer-dashboard.ts',
    'verify',
  ]);
  execFileSync(process.execPath, [
    'node_modules/tsx/dist/cli.mjs',
    'scripts/customer-dashboard.ts',
    'reset',
  ]);
  const reset = JSON.parse(readFileSync(manifest!, 'utf8')) as {
    email: string;
    password: string;
    accountUrl: string;
  };
  expect(reset.email).not.toBe(ready!.email);
  const cleanContext = await context.browser()!.newContext();
  const cleanPage = await cleanContext.newPage();
  await cleanPage.goto(reset.accountUrl);
  await cleanPage.getByLabel('Email', { exact: true }).fill(reset.email);
  await cleanPage.getByLabel('Password', { exact: true }).fill(reset.password);
  await cleanPage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    cleanPage.getByRole('heading', { name: 'No orders yet', exact: true }),
  ).toBeVisible();
  await cleanContext.close();
  await page.goto(central + '/account/orders');
  await expect(page.locator('.customer-order-list > li')).toHaveCount(3);
});
