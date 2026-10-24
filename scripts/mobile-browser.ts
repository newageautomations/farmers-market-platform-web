import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import type { PosReady } from './in-person';
export async function mobileBrowserChecks(ready: PosReady) {
  const browser = await chromium.launch({ headless: true }),
    context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  async function control(handoffId: string, action: string) {
    const dir = resolve('.pos-stage-e-demo'),
      requestId = randomUUID();
    writeFileSync(
      resolve(dir, 'request.json'),
      JSON.stringify({
        requestId,
        database: ready.database,
        handoffId,
        action,
      }),
      { flag: 'wx' },
    );
    for (let i = 0; i < 120; i++) {
      const file = resolve(dir, 'response.json');
      if (existsSync(file)) {
        const r = JSON.parse(readFileSync(file, 'utf8'));
        if (r.requestId === requestId) {
          assert.ok(!r.error, r.error);
          return r;
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error('Controlled native adapter timed out');
  }
  try {
    await page.goto(`${ready.accountOrigin}/account/login`);
    await page.getByLabel('Email', { exact: true }).fill(ready.vendors[0]!);
    await page.getByLabel('Password', { exact: true }).fill(ready.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.endsWith('/login'));
    await page.goto(
      `${ready.admin}/vendor?channel=${ready.vendorChannels[0]}&account=1`,
    );
    await page
      .getByRole('link', { name: 'In-Person Checkout', exact: true })
      .first()
      .click({ timeout: 45000 });
    for (const method of ['SQUARE_MOBILE', 'CLOVER_GO']) {
      await page
        .getByRole('button', { name: 'Add Beeswax Candle', exact: true })
        .click();
      await page.getByLabel('Quantity for Beeswax Candle').waitFor();
      await page.getByRole('button', { name: /Review checkout ·/ }).click();
      await page
        .getByRole('button', { name: 'Continue to Payment', exact: true })
        .click();
      await page.getByLabel('Payment method').selectOption(method);
      await page
        .getByText('Controlled adapter fixture only.', { exact: false })
        .waitFor();
      await page
        .getByRole('button', {
          name: 'Prepare companion checkout',
          exact: true,
        })
        .click();
      const link = page.getByRole('link', {
        name: 'Open payment companion',
        exact: true,
      });
      await link.waitFor();
      const url = await link.getAttribute('href');
      assert.ok(url);
      const handoffId = url!.split('/').pop()!;
      assert.ok(await page.getByText(/If the app is unavailable/).isVisible());
      for (const width of [1280, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        const g = await page.locator('dialog[open]').evaluate((el) => ({
          overflow:
            el.scrollWidth > el.clientWidth + 1 ||
            document.documentElement.scrollWidth > innerWidth + 1,
          padding: parseFloat(getComputedStyle(el).paddingInlineStart),
          gaps: [...el.querySelectorAll('.pos-payment-sections')].map((e) =>
            parseFloat(getComputedStyle(e).rowGap),
          ),
          controls: [
            ...el.querySelectorAll<HTMLElement>('button,input,select,a.button'),
          ]
            .filter(
              (e) =>
                e.getBoundingClientRect().width > 0 &&
                !e.classList.contains('dialog-close') &&
                !e.closest('select button'),
            )
            .map((e) => e.getBoundingClientRect().height),
        }));
        assert.equal(g.overflow, false, `${method} ${width}px overflow`);
        assert.ok(g.padding >= 16);
        assert.ok(g.gaps.every((n) => n >= 24));
        assert.ok(g.controls.every((n) => n >= 44));
        const a11y = await new AxeBuilder({ page })
          .include('dialog[open]')
          .analyze();
        assert.deepEqual(
          a11y.violations
            .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
            .map((v) => v.id),
          [],
        );
        console.log(`PASS Stage E ${method} DOM/a11y geometry ${width}px`);
      }
      const interrupted = await control(handoffId, 'INTERRUPT');
      assert.equal(interrupted.state, 'UNCERTAIN');
      await page.reload();
      await page
        .getByRole('button', { name: /Check payment for order/ })
        .first()
        .click({ timeout: 30000 });
      const completed = await control(handoffId, 'SUCCESS');
      assert.equal(completed.state, 'COMPLETED', JSON.stringify(completed));
      await page
        .getByRole('button', { name: 'Check Payment Status', exact: true })
        .click();
      await page.getByText('Sale completed', { exact: true }).first().waitFor();
      assert.ok(
        await page.getByText(/Controlled adapter test only/).isVisible(),
      );
      await page.getByRole('button', { name: 'New Sale', exact: true }).click();
      await page.setViewportSize({ width: 1280, height: 1000 });
      console.log(
        `PASS Stage E ${method} controlled interruption, reload, original-operation completion and receipt`,
      );
    }
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
    await browser.close();
  }
}
