import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

test.skip(
  process.env.NOTIFICATIONS_DEMO !== '1',
  'Start the disposable Documents demo and set NOTIFICATIONS_DEMO=1.',
);
async function login(page: Page, email: string, path: string) {
  await page.goto(path);
  await page
    .getByLabel('Sign in with', { exact: true })
    .selectOption('username');
  await page.getByLabel('Administrator username', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('local-identity-regression-only-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-topbar')).toBeVisible();
  await page.goto(path);
}
async function inspect(page: Page, name: string, scope: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include(scope).analyze()).violations,
  ).toEqual([]);
  await mkdir('.runtime/notifications-ui', { recursive: true });
  await page.screenshot({
    path: `.runtime/notifications-ui/${name}.png`,
    fullPage: true,
  });
}
for (const width of [390, 1280]) {
  test(`Market preferences, overview and readiness links at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, 'market-a@test.invalid', '/market/settings');
    const preferences = page.getByRole('region', {
      name: 'Notification preferences',
    });
    await expect(
      preferences.getByRole('checkbox', {
        name: 'New submissions awaiting review',
      }),
    ).toBeVisible();
    await preferences
      .getByRole('checkbox', { name: 'New submissions awaiting review' })
      .check();
    await preferences
      .getByRole('checkbox', { name: 'Documents approaching expiration' })
      .check();
    await preferences
      .getByRole('button', { name: 'Save notification preferences' })
      .click();
    await expect(
      preferences.getByText('Notification preferences saved.'),
    ).toBeVisible();
    await inspect(
      page,
      `market-settings-${width}`,
      '[aria-label="Notification preferences"]',
    );
    await page.goto('/market');
    const summary = page.getByRole('region', {
      name: 'Document compliance overview',
    });
    await expect(
      summary.getByText('Vendors ready', { exact: true }),
    ).toBeVisible();
    await inspect(
      page,
      `market-overview-${width}`,
      '[aria-label="Document compliance overview"]',
    );
    await summary
      .getByRole('link', { name: 'Review Vendor compliance' })
      .click();
    await expect(
      page.getByRole('tab', { name: 'Vendor compliance', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.goto('/market/vendors');
    await expect(
      page.getByRole('table', { name: 'Vendor business relationships' }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Documentation' }),
    ).toBeVisible();
    await inspect(
      page,
      `market-vendors-${width}`,
      '[aria-label="Vendor business relationships"]',
    );
  });
  test(`Vendor preferences and independent Market request overview at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, 'identity-owner-0@test.invalid', '/vendor/settings');
    const preferences = page.getByRole('region', {
      name: 'Notification preferences',
    });
    const request = preferences.getByRole('checkbox', {
      name: 'New document requests',
    });
    await expect(request).toBeVisible();
    await request.focus();
    await page.keyboard.press('Space');
    await preferences
      .getByRole('checkbox', { name: 'Documents approaching expiration' })
      .check();
    await preferences.getByRole('checkbox', { name: '7 days before' }).check();
    await preferences
      .getByRole('button', { name: 'Save notification preferences' })
      .click();
    await expect(
      preferences.getByText('Notification preferences saved.'),
    ).toBeVisible();
    await inspect(
      page,
      `vendor-settings-${width}`,
      '[aria-label="Notification preferences"]',
    );
    await page.goto('/vendor');
    const summary = page.getByRole('region', {
      name: 'Document compliance overview',
    });
    await expect(
      summary.getByText('Outstanding required requests', { exact: true }),
    ).toBeVisible();
    await expect(
      summary.getByRole('table', { name: 'Document requests by Market' }),
    ).toBeVisible();
    await inspect(
      page,
      `vendor-overview-${width}`,
      '[aria-label="Document compliance overview"]',
    );
    await summary.getByRole('link', { name: 'View Market requests' }).click();
    await expect(
      page.getByRole('tab', { name: 'Market requests', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
  });
}
