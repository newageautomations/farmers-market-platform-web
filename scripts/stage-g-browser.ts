import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import type { PosReady } from './in-person';

/** DOM and computed geometry only. No media, visual snapshots, recordings or traces. */
export async function stageGBrowserChecks(ready: PosReady) {
  const browser = await chromium.launch({ headless: true }),
    context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`${ready.accountOrigin}/account/login`);
    await page.getByLabel('Email', { exact: true }).fill(ready.vendors[0]!);
    await page.getByLabel('Password', { exact: true }).fill(ready.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'));
    await page.goto(
      `${ready.admin}/vendor?channel=${ready.vendorChannels[0]}&account=1`,
    );
    await page
      .getByRole('link', { name: 'In-Person Checkout', exact: true })
      .first()
      .click({ timeout: 45000 });
    await page
      .getByRole('button', {
        name: 'Add Raw Honey, choose variant',
        exact: true,
      })
      .click();
    await page
      .getByRole('dialog', { name: 'Choose Raw Honey' })
      .getByRole('button', { name: /^Raw Honey ·/ })
      .click();
    await page.getByLabel('Quantity for Raw Honey').fill('5');
    await page.getByLabel('Quantity for Raw Honey').blur();
    await page
      .getByRole('button', { name: 'Add Customer (Optional)', exact: true })
      .click();
    await page.getByLabel('Customer email or phone').fill('(210) 555-0142');
    await page
      .getByRole('button', { name: 'Find customer and rewards', exact: true })
      .click();
    await page.getByText('Casey Demo', { exact: true }).waitFor();
    await page
      .getByRole('button', {
        name: 'Apply $2.00 reward, customer agreed',
        exact: true,
      })
      .waitFor();
    for (const width of [1280, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width === 390)
        await page
          .getByRole('button', { name: 'View Cart / Checkout', exact: true })
          .click();
      const g = await page.locator('.pos-loyalty').evaluate((el) => ({
        overflow:
          document.documentElement.scrollWidth > innerWidth + 1 ||
          el.scrollWidth > el.clientWidth + 1,
        controls: [...el.querySelectorAll('button')]
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => e.getBoundingClientRect().height),
        padding: [...el.querySelectorAll('.ui-card')].map((e) =>
          parseFloat(getComputedStyle(e).paddingInlineStart),
        ),
      }));
      assert.equal(g.overflow, false);
      assert.ok(g.controls.every((h) => h >= 44));
      assert.ok(g.padding.every((p) => p >= 12));
      assert.equal(
        (
          await new AxeBuilder({ page })
            .include('.pos-register')
            .disableRules(['color-contrast'])
            .analyze()
        ).violations.length,
        0,
      );
      console.log(
        `PASS Stage G phone/reward DOM, touch geometry and accessibility at ${width}px`,
      );
      if (width === 390)
        await page
          .getByRole('dialog', { name: 'Current cart', exact: true })
          .getByRole('button', { name: 'Close', exact: true })
          .click();
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page
      .getByRole('button', {
        name: 'Apply $2.00 reward, customer agreed',
        exact: true,
      })
      .click();
    await page
      .getByText('Thank-you: $2 off applied', { exact: true })
      .waitFor();
    assert.equal(
      await page
        .locator('.pos-totals')
        .getByText('$2.00', { exact: true })
        .count(),
      0,
    ); // discount uses its signed monetary presentation
    assert.ok((await page.locator('.pos-totals').innerText()).includes('2.00'));
    assert.deepEqual(errors, []);
    console.log(
      'PASS Stage G cashier reward application recalculates the authoritative cart',
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
