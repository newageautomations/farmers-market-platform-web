import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import type { PosReady } from './in-person';

/** DOM/a11y/computed geometry only. No screenshots, images, videos or tracing. */
export async function squareBrowserChecks(ready: PosReady) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let passed = 0;
  const check = async (name: string, work: () => Promise<void>) => {
    await work();
    console.log(`PASS Square browser ${++passed}: ${name}`);
  };
  async function geometry(page: Page, selector: string, touch = false) {
    for (const width of [1280, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const g = await page.locator(selector).evaluate((el) => {
        const style = getComputedStyle(el),
          actions = [...el.querySelectorAll<HTMLElement>('.ui-actions')];
        return {
          width: el.getBoundingClientRect().width,
          padding: parseFloat(style.paddingBottom),
          overflow: el.scrollWidth > el.clientWidth + 1,
          pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          gaps: [...el.querySelectorAll('.pos-payment-sections')].map((e) =>
            parseFloat(getComputedStyle(e).rowGap),
          ),
          actionGaps: actions.map((e) => parseFloat(getComputedStyle(e).gap)),
          controls: [
            ...el.querySelectorAll<HTMLElement>(
              'button:not(.dialog-close),select,input',
            ),
          ]
            .filter(
              (e) =>
                e.getBoundingClientRect().width > 0 &&
                !(e.tagName === 'BUTTON' && e.closest('select')),
            )
            .map(
              (e) =>
                (e.matches('input[type="checkbox"],input[type="radio"]')
                  ? (e.closest('label') ?? e)
                  : e
                ).getBoundingClientRect().height,
            ),
          cardPadding: [...el.querySelectorAll('.ui-card')].map((e) =>
            parseFloat(getComputedStyle(e).paddingInlineStart),
          ),
          footerSeparation: [...el.querySelectorAll('.ui-modal-actions')].map(
            (e) => parseFloat(getComputedStyle(e).marginTop),
          ),
          dialog: el.matches('dialog'),
        };
      });
      assert.ok(
        g.width <= width && !g.overflow && !g.pageOverflow,
        JSON.stringify({ width, g }),
      );
      assert.ok(
        g.gaps.every((n) => n >= 24) && g.actionGaps.every((n) => n >= 12),
        JSON.stringify({ width, g }),
      );
      assert.ok(
        g.cardPadding.every((n) => n >= 16),
        JSON.stringify({ width, g }),
      );
      if (g.dialog)
        assert.ok(
          g.padding >= (width >= 1000 ? 24 : width >= 600 ? 20 : 16),
          JSON.stringify({ width, g }),
        );
      assert.ok(
        g.footerSeparation.every((n) => n >= 24),
        JSON.stringify({ width, g }),
      );
      console.log(
        `DOM geometry ${selector} at ${width}px: padding ${g.padding}, cards ${g.cardPadding.join('/')}, section gaps ${g.gaps.join('/')}, action gaps ${g.actionGaps.join('/')}, footer ${g.footerSeparation.join('/')}; no overflow`,
      );
      if (touch)
        assert.ok(
          g.controls.every((n) => n >= 44),
          JSON.stringify({ width, g }),
        );
      const a11y = await new AxeBuilder({ page }).include(selector).analyze();
      assert.deepEqual(
        a11y.violations
          .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
          .map((v) => v.id),
        [],
      );
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
  }
  try {
    await check(
      'vendor owner opens Payment Integrations with a clearly labelled SDK fixture',
      async () => {
        await page.goto(`${ready.accountOrigin}/account/login`);
        await page.getByLabel('Email', { exact: true }).fill(ready.vendors[0]!);
        await page.getByLabel('Password', { exact: true }).fill(ready.password);
        await page
          .getByRole('button', { name: 'Sign in', exact: true })
          .click();
        await page.waitForURL((u) => !u.pathname.endsWith('/login'));
        await page.goto(
          `${ready.admin}/vendor?channel=${ready.vendorChannels[0]}&account=1`,
        );
        await page
          .getByRole('link', { name: 'Settings', exact: true })
          .first()
          .click({ timeout: 45000 });
        await page
          .getByRole('link', { name: 'Payment Integrations', exact: true })
          .click();
        await page
          .getByRole('heading', { name: 'Payment Integrations', exact: true })
          .waitFor();
        await page.getByText(/Controlled SDK fixture only/).waitFor();
        assert.equal(
          await page.getByLabel('Default payment location').inputValue(),
          'fixture-location-honey',
        );
        assert.equal(
          await page
            .locator('.square-integration h2,.square-integration h3')
            .count(),
          0,
        );
      },
    );
    await check(
      'settings preserve shared padding, action gaps, touch controls and responsive geometry',
      () => geometry(page, '.square-integration', true),
    );
    await check(
      'add-terminal dialog uses shared keyboard/focus and adds a Sandbox failure device',
      async () => {
        await page
          .getByRole('button', { name: 'Add Sandbox virtual terminal' })
          .click();
        const dialog = page.getByRole('dialog', {
          name: 'Add Sandbox virtual terminal',
        });
        await dialog
          .getByLabel('Terminal label')
          .fill('Buyer cancellation fixture');
        await dialog
          .getByLabel('Square Sandbox device')
          .selectOption('841100b9-ee60-4537-9bcf-e30b2ba5e215');
        await geometry(page, 'dialog[open]', true);
        assert.ok(
          await dialog.evaluate((el) => el.contains(document.activeElement)),
        );
        await dialog
          .getByRole('button', { name: 'Add terminal', exact: true })
          .click();
        await dialog.waitFor({ state: 'hidden' });
        await page
          .getByText('Buyer cancellation fixture', { exact: true })
          .waitFor();
      },
    );
    await check(
      'Square terminal checkout completes the original native order and displays durable payment IDs',
      async () => {
        await page
          .getByRole('link', { name: 'Open In-Person Checkout' })
          .click();
        await page
          .getByRole('button', { name: 'Add Beeswax Candle', exact: true })
          .click();
        await page.getByLabel('Quantity for Beeswax Candle').waitFor();
        await page.getByRole('button', { name: /Review checkout ·/ }).click();
        await page
          .getByRole('button', { name: 'Continue to Payment', exact: true })
          .click();
        const dialog = page.getByRole('dialog', {
          name: 'Complete payment',
          exact: true,
        });
        await dialog
          .getByLabel('Payment method')
          .selectOption('SQUARE_TERMINAL');
        await geometry(page, 'dialog[open]', true);
        await dialog
          .getByRole('button', { name: 'Send to Square Terminal' })
          .click();
        await page
          .getByRole('dialog', { name: 'Sale completed', exact: true })
          .waitFor();
        await page
          .getByText('Square SDK fixture only', { exact: true })
          .waitFor();
        await page.getByText(/Payment fixture-payment/).waitFor();
        await geometry(page, 'dialog[open]', true);
      },
    );
    await check(
      'Square refund uses original native units and pending-aware controls in existing Orders',
      async () => {
        await page
          .getByRole('link', { name: 'View Order', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Record refund', exact: true })
          .click();
        const dialog = page.getByRole('dialog', {
          name: 'Record refund',
          exact: true,
        });
        await dialog.getByRole('checkbox').first().check();
        await dialog
          .getByLabel('Refund reason')
          .fill('Square browser fixture return');
        assert.equal(
          await dialog.getByLabel('Simulated refund outcome').count(),
          0,
        );
        await geometry(page, 'dialog[open]', true);
        await dialog
          .getByRole('button', { name: 'Request Square refund', exact: true })
          .click();
        await dialog.waitFor({ state: 'hidden' });
        await page
          .getByText(/SETTLED.*Square browser fixture return/)
          .waitFor();
      },
    );
    assert.deepEqual(errors, []);
    console.log(
      `Square Layer B browser: ${passed} groups passed; no evidence images or recordings.`,
    );
  } finally {
    await browser.close();
  }
}
