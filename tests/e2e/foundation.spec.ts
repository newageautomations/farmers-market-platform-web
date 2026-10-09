import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { testUrl, evidenceRoot } from './urls';
for (const width of [390, 768, 1280]) {
  test(`Market and Admin responsive accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(testUrl(4321));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Bulverde Market Day',
    );
    await expect(page.locator('[data-composition]')).toHaveAttribute(
      'data-composition',
      'market',
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (process.env.FRONTEND_NO_EVIDENCE !== 'true')
      await page.screenshot({
        path: `${evidenceRoot}/foundation/market-${width}.png`,
        fullPage: true,
      });
    await page.goto(testUrl(4322));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Overview',
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (process.env.FRONTEND_NO_EVIDENCE !== 'true')
      await page.screenshot({
        path: `${evidenceRoot}/foundation/admin-${width}.png`,
        fullPage: true,
      });
  });
}
test('tenant host isolation, canonical metadata and unknown host fail closed', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(testUrl(4321, 'vendor.localhost'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Synthetic Vendor Fixture',
  );
  await expect(page.locator('[data-composition]')).toHaveAttribute(
    'data-composition',
    'vendor',
  );
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    // Fixture identity owns its canonical URL independently of the test listen port.
    'http://vendor.localhost:4321/',
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto(testUrl(4321, 'market.localhost'));
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    'http://market.localhost:4321/',
  );
  const response = await page.goto(testUrl(4321, 'unknown.localhost'));
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Storefront unavailable',
  );
  await expect(page.locator('body')).not.toContainText('Bulverde');
  await context.close();
});
test('dialog supports keyboard, escape and returns focus', async ({ page }) => {
  await page.goto(testUrl(4321));
  const trigger = page.getByRole('button', {
    name: 'About occurrence selection',
  });
  await expect(trigger).toBeEnabled();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('link', { name: 'Explore the Market' }),
  ).toBeFocused();
});
test('one Admin shell handles scopes and direct forbidden route', async ({
  page,
}) => {
  await page.goto(testUrl(4322));
  const nav = page.locator('.admin-sidebar');
  await expect(nav.getByRole('link', { name: 'Occurrences' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Products' })).toHaveCount(0);
  await page.getByLabel('Preview scope').selectOption('VENDOR');
  await expect(nav.getByRole('link', { name: 'Products' })).toBeVisible();
  await page.getByLabel('Preview scope').selectOption('PLATFORM');
  await expect(nav.getByRole('link', { name: 'Tenants' })).toBeVisible();
  await page.goto(testUrl(4322) + '/products');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Access restricted',
  );
});
test('fixture-disabled unavailable backend has no fake production fallback', async ({
  page,
}) => {
  const response = await page.goto(testUrl(4323));
  expect(response?.status()).toBe(503);
  await expect(page.getByRole('alert')).toContainText('Service unavailable');
  await expect(page.locator('body')).not.toContainText('Bulverde');
});
test('live Admin anonymous sign-in is accessible without real credentials', async ({
  page,
}) => {
  await page.route('**/admin-api', (route) =>
    route.fulfill({
      json: { data: { me: null } },
      headers: {
        'Access-Control-Allow-Origin': testUrl(4324),
        'Access-Control-Allow-Credentials': 'true',
      },
    }),
  );
  await page.goto(testUrl(4324));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
  await expect(page.getByLabel('Password')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
