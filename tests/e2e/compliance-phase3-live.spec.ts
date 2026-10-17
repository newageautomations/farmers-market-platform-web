import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile } from 'node:fs/promises';
test.skip(
  process.env.PHASE3_DISPOSABLE_DEMO !== 'true',
  'Start the isolated Documents demo and set PHASE3_DISPOSABLE_DEMO=true.',
);
const password = 'local-identity-regression-only-password';
async function login(page: Page, email: string, path: string) {
  await page.goto(path);
  await page
    .getByLabel('Sign in with', { exact: true })
    .selectOption('username');
  await page.getByLabel('Administrator username', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-topbar')).toBeVisible();
  await page.goto(path);
  await expect(
    page.getByRole('tab', { name: 'Library', exact: true }),
  ).toBeVisible();
}
async function check(page: Page, name: string, scope = '.documents-workspace') {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include(scope).analyze()).violations,
  ).toEqual([]);
  await mkdir('.runtime/compliance-phase3-ui', { recursive: true });
  await page.screenshot({
    path: `.runtime/compliance-phase3-ui/${name}.png`,
    fullPage: true,
  });
}
for (const width of [390, 1280]) {
  test(`manager reports, CSV and verified guidance at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(
      page,
      'market-a@test.invalid',
      '/market/documents?view=reports',
    );
    await expect(
      page.getByRole('table', { name: 'Compliance report', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Report', { exact: true }).selectOption('upcoming');
    await page
      .getByLabel('Market event', { exact: true })
      .selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Apply report filters' }).click();
    await expect(
      page.getByText(/participation unconfirmed/).first(),
    ).toBeVisible();
    await check(page, `readiness-${width}`);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export matching CSV' }).click();
    const file = await download;
    const csv = await readFile((await file.path())!, 'utf8');
    expect(csv).toContain('generated_at');
    expect(csv).toContain('Market');
    expect(csv).not.toMatch(/storage_key|encryption|bytesBase64/);
    await page.getByLabel('Report', { exact: true }).selectOption('agreements');
    await page.getByRole('button', { name: 'Apply report filters' }).click();
    await expect(
      page.getByRole('columnheader', { name: 'Current published version' }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', {
        name: 'Version requiring acknowledgment',
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/across all matching acknowledgment requests/),
    ).toBeVisible();
    await check(page, `acknowledgment-report-${width}`);
    await page
      .getByRole('tab', { name: 'Templates and guidance', exact: true })
      .click();
    await page.getByLabel('Guidance jurisdiction').selectOption('Texas');
    await expect(
      page.getByRole('link', {
        name: 'Texas Department of State Health Services, Farmers Market',
      }),
    ).toBeVisible();
    await check(page, `guidance-${width}`);
    await page.getByLabel('Guidance jurisdiction').selectOption('unavailable');
    await expect(
      page.getByText('No verified guidance selected', { exact: true }),
    ).toBeVisible();
    expect(await page.locator('select:not(.ui-select)').count()).toBe(0);
  });
  test(`manager publication and explicit Vendor acknowledgment at ${width}px`, async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(
      page,
      'market-a@test.invalid',
      '/market/documents?view=agreements',
    );
    // Only run mutations against the synthetic Phase 3 demo.
    await expect(
      page.getByText('Phase 3 Market Rules', { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Create agreement', exact: true })
      .click();
    let dialog = page.getByRole('dialog');
    await dialog
      .getByLabel('Starting template')
      .selectOption('Arrival and Setup Requirements');
    const title = `Browser policy ${width} ${Date.now()}`;
    await dialog.getByLabel('Agreement title').fill(title);
    await dialog
      .getByLabel('Agreement contents')
      .fill(
        'Read these setup instructions. <script>window.phase3Unsafe=true</script>',
      );
    await dialog
      .getByRole('checkbox', { name: 'Required acknowledgment', exact: true })
      .check();
    await dialog
      .getByRole('button', { name: 'Save draft', exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page
      .getByText(title, { exact: true })
      .locator('..')
      .getByRole('button', { name: 'Open agreement' })
      .click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Preview publication' }).click();
    await expect(
      dialog.getByText(/There are 0 existing assignments/),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Publish version 1' }).click();
    await expect(
      dialog.getByLabel('Vendors to request acknowledgment'),
    ).toBeVisible();
    await dialog
      .getByLabel('Vendors to request acknowledgment')
      .selectOption({ label: 'Vendor A' });
    await dialog
      .getByRole('button', { name: 'Request acknowledgment', exact: true })
      .click();
    await expect(
      dialog
        .getByRole('table', { name: 'Agreement assignments' })
        .getByText('Vendor A', { exact: true }),
    ).toBeVisible();
    await check(page, `manager-agreement-${width}`, 'dialog');
    const context = await browser.newContext({
        viewport: { width, height: 900 },
      }),
      vendor = await context.newPage();
    await login(
      vendor,
      'identity-owner-0@test.invalid',
      '/vendor/documents?view=agreements',
    );
    await vendor
      .getByText(title, { exact: true })
      .locator('..')
      .getByRole('button', { name: 'Open agreement' })
      .click();
    const agreement = vendor.getByRole('dialog');
    await expect(agreement.getByLabel('Agreement version 1')).toContainText(
      '<script>',
    );
    expect(
      await vendor.evaluate(() => Reflect.get(window, 'phase3Unsafe')),
    ).toBeUndefined();
    const confirm = agreement.getByRole('checkbox', {
      name: /I have read and acknowledge/,
    });
    await expect(confirm).not.toBeChecked();
    await expect(
      agreement.getByRole('button', { name: 'Acknowledge agreement' }),
    ).toBeDisabled();
    await check(vendor, `vendor-agreement-${width}`, 'dialog');
    await confirm.focus();
    await vendor.keyboard.press('Space');
    await agreement
      .getByRole('button', { name: 'Acknowledge agreement' })
      .click();
    await expect(
      agreement
        .getByRole('table', { name: 'Acknowledgment history' })
        .getByText('Vendor A', { exact: true }),
    ).toBeVisible();
    await context.close();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page
      .getByText(title, { exact: true })
      .locator('..')
      .getByRole('button', { name: 'Open agreement' })
      .click();
    await expect(
      page
        .getByRole('dialog')
        .getByRole('table', { name: 'Acknowledgment history' })
        .getByText('Vendor A', { exact: true }),
    ).toBeVisible();
  });
}
