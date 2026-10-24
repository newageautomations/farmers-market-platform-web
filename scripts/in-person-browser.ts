import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import type { PosReady } from './in-person';

export async function posBrowserChecks(ready: PosReady) {
  const browser = await chromium.launch({ headless: true });
  let passed = 0;
  const check = async (name: string, work: () => Promise<void>) => {
    await work();
    console.log(`PASS POS browser ${++passed}: ${name}`);
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    hasTouch: true,
  });
  const page = await context.newPage();
  // Screenshots, recordings and traces are deliberately never requested.
  const failures: string[] = [];
  let draftStarts = 0;
  page.on('request', (request) => {
    if (request.postData()?.includes('startOwnPosDraft')) draftStarts++;
  });
  page.on('pageerror', (error) => failures.push(error.message));
  async function login(page: Page, email: string) {
    await page.goto(
      `${ready.accountOrigin ?? 'http://auth.platform.localhost:4368'}/account/login`,
    );
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(ready.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), {
      timeout: 30000,
    });
    await page.goto(
      `${ready.admin}/vendor?channel=${ready.vendorChannels[0]}&account=1`,
    );
    await page
      .getByRole('link', { name: 'In-Person Checkout', exact: true })
      .first()
      .click({ timeout: 45000 });
    await page
      .getByRole('heading', { name: 'In-Person Checkout', exact: true })
      .waitFor({ timeout: 45000 });
  }
  try {
    await check(
      'vendor login, register navigation and real catalog',
      async () => {
        await login(page, ready.vendors[0]!);
        for (const width of [1280, 768, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          const geometry = await page
            .locator('.pos-setup')
            .evaluate((setup) => {
              const select = setup.querySelector('select')!,
                action = setup.querySelector('.ui-field-action button')!,
                selected = select.querySelector('selectedcontent')!,
                box = select.getBoundingClientRect(),
                button = action.getBoundingClientRect(),
                text = selected.getBoundingClientRect();
              return {
                selectY: box.y,
                selectHeight: box.height,
                buttonY: button.y,
                buttonHeight: button.height,
                centered: Math.abs(
                  text.y + text.height / 2 - box.y - box.height / 2,
                ),
                overflow: document.documentElement.scrollWidth > innerWidth + 1,
              };
            });
          assert.ok(
            geometry.centered <= 1,
            JSON.stringify({ width, ...geometry }),
          );
          assert.ok(
            Math.abs(geometry.selectY - geometry.buttonY) <= 1,
            JSON.stringify({ width, ...geometry }),
          );
          assert.ok(
            Math.abs(geometry.selectHeight - geometry.buttonHeight) <= 1,
          );
          assert.equal(geometry.overflow, false);
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page
          .getByRole('button', { name: 'Start checkout', exact: true })
          .click();
        assert.equal(
          draftStarts,
          0,
          'Starting an empty checkout must not create a native draft',
        );
        await page
          .getByRole('button', { name: 'Add Raw Honey, choose variant' })
          .click();
        await page
          .getByRole('dialog', { name: 'Choose Raw Honey' })
          .getByRole('button', { name: 'Close', exact: true })
          .click();
        assert.equal(
          draftStarts,
          0,
          'Cancelling variant selection must not create a native draft',
        );
        await page
          .getByRole('button', { name: 'Saved drafts', exact: true })
          .click();
        assert.equal(
          await page.getByRole('button', { name: /Resume 0 items/ }).count(),
          0,
        );
        await page
          .getByRole('button', { name: 'Add Raw Honey, choose variant' })
          .waitFor();
        assert.ok(
          (await page
            .getByRole('button', { name: 'In-Person Checkout', exact: true })
            .count()) ||
            (await page
              .getByRole('link', { name: 'In-Person Checkout', exact: true })
              .count()),
        );
      },
    );
    await check('single tap addition and rapid repeated taps', async () => {
      const candle = page.getByRole('button', {
        name: 'Add Beeswax Candle',
        exact: true,
      });
      await candle.click();
      await page.getByLabel('Quantity for Beeswax Candle').waitFor();
      assert.equal(
        draftStarts,
        1,
        'First product starts exactly one populated checkout',
      );
      const couponGeometry = await page
        .locator('.pos-coupon')
        .evaluate((form) => {
          const input = form.querySelector('input')!.getBoundingClientRect(),
            button = form.querySelector('button')!.getBoundingClientRect();
          return Math.abs(
            input.y + input.height / 2 - button.y - button.height / 2,
          );
        });
      assert.ok(couponGeometry <= 1, 'Coupon Apply aligns with its input');
      for (let i = 0; i < 8; i++) await candle.click({ delay: 10 });
      await page.waitForFunction(() => {
        const input = document.querySelector<HTMLInputElement>(
          'input[aria-label="Quantity for Beeswax Candle"]',
        );
        return input?.value === '9' && !input.disabled;
      });
      assert.equal(
        await page.getByLabel('Quantity for Beeswax Candle').inputValue(),
        '9',
      );
      assert.equal(draftStarts, 1, 'Further products use the same checkout');
    });
    await check(
      'category overflow arrows, fixed Favorites and native mobile swipe',
      async () => {
        const list = page.locator('.pos-categories'),
          favorite = page.getByRole('button', {
            name: 'Favorites',
            exact: true,
          });
        await page.setViewportSize({ width: 768, height: 1000 });
        const favoriteX = (await favorite.boundingBox())!.x;
        await page
          .getByRole('button', { name: 'Scroll categories right' })
          .click();
        await page.waitForFunction(
          () => document.querySelector('.pos-categories')!.scrollLeft > 0,
        );
        assert.equal((await favorite.boundingBox())!.x, favoriteX);
        await page
          .getByRole('button', { name: 'Scroll categories left' })
          .click();
        await page.waitForFunction(
          () => document.querySelector('.pos-categories')!.scrollLeft === 0,
        );
        const icon = await favorite.locator('svg').boundingBox(),
          circle = await favorite.boundingBox();
        assert.ok(
          icon &&
            circle &&
            Math.abs(icon.width - 19) <= 0.1 &&
            circle.width >= 44,
        );
        const productHeart = await page
          .locator('.pos-favorite svg')
          .first()
          .boundingBox();
        assert.ok(productHeart && Math.abs(productHeart.width - 28.5) <= 0.1);
        for (const width of [768, 390, 1800]) {
          await page.setViewportSize({ width, height: 1000 });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          );
        }
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(
          await page
            .getByRole('button', { name: 'Scroll categories right' })
            .isVisible(),
          false,
        );
        await list.scrollIntoViewIfNeeded();
        const box = (await list.boundingBox())!,
          cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setTouchEmulationEnabled', {
          enabled: true,
          maxTouchPoints: 1,
        });
        const touch = {
          x: Math.round(box.x + box.width * 0.85),
          y: Math.round(box.y + box.height / 2),
        };
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [touch],
        });
        for (let step = 1; step <= 8; step++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ ...touch, x: touch.x - step * 18 }],
          });
          await page.waitForTimeout(20);
        }
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        });
        await page.waitForFunction(
          () => document.querySelector('.pos-categories')!.scrollLeft > 0,
        );
        await cdp.send('Emulation.setTouchEmulationEnabled', {
          enabled: false,
        });
        await cdp.detach();
        await list.evaluate((element) => (element.scrollLeft = 0));
        await page.setViewportSize({ width: 2400, height: 1000 });
        await page.waitForFunction(() => {
          const list = document.querySelector<HTMLElement>('.pos-categories')!;
          return (
            list.clientWidth >= list.scrollWidth &&
            !document.querySelector('.pos-category-arrows')
          );
        });
        await page.setViewportSize({ width: 1440, height: 1000 });
      },
    );
    await check('variant dialog and keyboard SKU search', async () => {
      await page
        .getByRole('button', { name: 'Add Raw Honey, choose variant' })
        .click();
      await page
        .getByRole('dialog', { name: 'Choose Raw Honey' })
        .getByRole('button', { name: /Raw Honey Large Jar/ })
        .click();
      await page.getByLabel('Quantity for Raw Honey Large Jar').waitFor();
      const search = page.getByLabel('Search products');
      await search.fill('POS-CANDLE');
      await page.waitForTimeout(350);
      await search.press('Enter');
      await page.waitForFunction(
        () =>
          document.querySelector<HTMLInputElement>(
            'input[aria-label="Quantity for Beeswax Candle"]',
          )?.value === '10',
      );
      assert.equal(
        await search.evaluate((el) => document.activeElement === el),
        true,
      );
      await search.fill('');
      await page
        .getByRole('button', { name: 'Add Raw Honey, choose variant' })
        .waitFor();
    });
    await check('category filtering and favorites', async () => {
      await page
        .getByRole('button', { name: 'Home & gifts', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Add Beeswax Candle', exact: true })
        .waitFor();
      await page.waitForFunction(
        () =>
          !Array.from(document.querySelectorAll('button')).some(
            (b) =>
              b.getAttribute('aria-label') === 'Add Raw Honey, choose variant',
          ),
      );
      await page
        .getByRole('button', { name: 'Favorite Beeswax Candle', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Unfavorite Beeswax Candle', exact: true })
        .waitFor();
      for (const selector of ['.pos-favorite', '.pos-heart-button']) {
        const button =
          selector === '.pos-favorite'
            ? page.getByRole('button', {
                name: 'Unfavorite Beeswax Candle',
                exact: true,
              })
            : page.getByRole('button', { name: 'Favorites', exact: true });
        if (selector === '.pos-heart-button') await button.click();
        assert.equal(
          await button.evaluate(
            (element) => getComputedStyle(element).textDecorationLine,
          ),
          'none',
        );
        assert.equal(
          await button.locator('svg').getAttribute('fill'),
          'currentColor',
        );
      }
      await page
        .getByRole('button', { name: 'Add Beeswax Candle', exact: true })
        .waitFor();
      await page
        .getByRole('button', { name: 'Favorites', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'All Products', exact: true })
        .click();
    });
    await check(
      'optional customer email, phone and invitation without OTP',
      async () => {
        for (const identity of [
          ready.customers[0]!.email,
          ready.customers[1]!.phone!,
        ]) {
          await page
            .getByRole('button', {
              name: 'Add Customer (Optional)',
              exact: true,
            })
            .click();
          await page.getByLabel('Customer email or phone').fill(identity);
          await page
            .getByRole('button', {
              name: 'Associate existing customer',
              exact: true,
            })
            .click();
          await page
            .getByText('Existing customer associated', { exact: true })
            .waitFor();
          await page
            .getByRole('button', { name: 'Remove customer', exact: true })
            .click();
          await page.getByText('Anonymous customer', { exact: true }).waitFor();
        }
        await page
          .getByRole('button', { name: 'Add Customer (Optional)', exact: true })
          .click();
        await page
          .getByLabel('Customer email or phone')
          .fill('new@pos.test.invalid');
        await page
          .getByRole('button', { name: 'Save signup invitation', exact: true })
          .click();
        await page
          .getByText('Signup invitation saved for after payment', {
            exact: true,
          })
          .waitFor();
      },
    );
    await check(
      'market context, authoritative review and guarded payment entry',
      async () => {
        await page
          .getByLabel('Selling context')
          .selectOption(ready.occurrenceId);
        await page
          .getByText(/Cedar Meadow Farmers Market ·/)
          .last()
          .waitFor();
        await page.getByLabel('Selling context').selectOption('');
        await page.getByRole('button', { name: /Review checkout ·/ }).click();
        await page
          .getByRole('button', { name: 'Continue to Payment', exact: true })
          .waitFor();
        assert.equal(
          await page
            .getByRole('button', { name: 'Continue to Payment', exact: true })
            .isDisabled(),
          false,
        );
        await page
          .getByRole('button', { name: 'Return to cart', exact: true })
          .click();
        await page.getByRole('button', { name: /Review checkout ·/ }).waitFor();
      },
    );
    await check(
      'mobile cart, touch targets, focus and no horizontal overflow',
      async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole('button', { name: 'View Cart / Checkout', exact: true })
          .click();
        const dialog = page.getByRole('dialog', {
          name: 'Current cart',
          exact: true,
        });
        await dialog.waitFor();
        assert.ok(
          await dialog.locator('.pos-coupon').evaluate((form) => {
            const input = form.querySelector('input')!.getBoundingClientRect(),
              action = form.querySelector('button')!.getBoundingClientRect();
            return (
              Math.abs(
                input.y + input.height / 2 - action.y - action.height / 2,
              ) <= 1
            );
          }),
          'Mobile coupon Apply aligns with its input',
        );
        const plus = dialog.getByRole('button', {
            name: 'Increase Beeswax Candle',
            exact: true,
          }),
          box = await plus.boundingBox();
        assert.ok(
          box && box.height >= 44 && box.width >= 44,
          JSON.stringify({
            box,
            style: await plus.evaluate((el) => ({
              height: getComputedStyle(el).height,
              minHeight: getComputedStyle(el).minHeight,
              width: getComputedStyle(el).width,
            })),
          }),
        );
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(await dialog.isVisible(), false);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.setViewportSize({ width: 900, height: 1000 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      },
    );
    await check(
      'responsive desktop, accessible register and no runtime errors',
      async () => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const result = await new AxeBuilder({ page })
          .include('.pos-register')
          .analyze();
        assert.deepEqual(
          result.violations
            .filter((v) => ['critical', 'serious'].includes(v.impact ?? ''))
            .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        assert.deepEqual(failures, []);
      },
    );
    await check('saved interrupted draft resumes and cancels', async () => {
      await page
        .getByRole('button', { name: 'Saved drafts', exact: true })
        .click();
      await page
        .getByRole('button', { name: /Resume .*Independent Sale/ })
        .first()
        .click();
      await page
        .getByRole('button', { name: 'Cancel draft', exact: true })
        .click();
      await page
        .getByRole('dialog', { name: 'Cancel this draft?' })
        .getByRole('button', { name: 'Cancel draft', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Start checkout', exact: true })
        .waitFor();
    });
    async function openPayment() {
      await page.getByRole('button', { name: /Review checkout ·/ }).click();
      await page
        .getByRole('button', { name: 'Continue to Payment', exact: true })
        .click();
      await page
        .getByRole('dialog', { name: 'Complete payment', exact: true })
        .waitFor();
    }
    await check(
      'cash payment, integer tender/change and persistent completed receipt',
      async () => {
        await page.setViewportSize({ width: 1280, height: 1000 });
        await page
          .getByRole('button', { name: 'Start checkout', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Add Beeswax Candle', exact: true })
          .click();
        await page.getByLabel('Quantity for Beeswax Candle').waitFor();
        await page.waitForFunction(
          () =>
            document.querySelector<HTMLInputElement>(
              '[aria-label="Quantity for Beeswax Candle"]',
            )?.value === '1',
        );
        await openPayment();
        const dialog = page.getByRole('dialog', {
          name: 'Complete payment',
          exact: true,
        });
        await dialog.getByLabel('Cash received (USD)').focus();
        await page.keyboard.press('Tab');
        assert.equal(
          await page.evaluate(() => document.activeElement?.textContent),
          'Exact Amount',
        );
        await page.keyboard.press('Enter');
        assert.ok(await dialog.getByLabel('Cash received (USD)').inputValue());
        for (const width of [1280, 768, 390]) {
          await page.setViewportSize({ width, height: 900 });
          const g = await dialog.evaluate((el) => ({
            gaps: [...el.querySelectorAll('.pos-payment-sections')].map((s) =>
              parseFloat(getComputedStyle(s).rowGap),
            ),
            input: el.querySelector('input')!.getBoundingClientRect().height,
            overflow: el.scrollWidth > el.clientWidth + 1,
          }));
          assert.ok(
            g.gaps.every((gap) => gap >= 24) && g.input >= 44 && !g.overflow,
            JSON.stringify({ width, g }),
          );
        }
        await page.setViewportSize({ width: 1280, height: 1000 });
        await dialog.getByLabel('Cash received (USD)').fill('1000.00');
        const due = (
          await dialog.locator('.pos-payment-amount').first().innerText()
        ).match(/\$([\d,]+\.\d{2})/)!;
        const minor = Number(due[1]!.replaceAll(',', '').replace('.', ''));
        assert.equal(
          await dialog.locator('#pos-cash-feedback').innerText(),
          `Change due: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((100000 - minor) / 100)}`,
        );
        await dialog
          .getByRole('button', { name: 'Confirm Cash Received', exact: true })
          .click();
        await page
          .getByRole('dialog', { name: 'Sale completed', exact: true })
          .waitFor();
        assert.ok(
          await page.getByText('Total paid', { exact: true }).isVisible(),
        );
      },
    );
    await check(
      'completed receipt and payment dialog geometry at desktop, tablet and mobile',
      async () => {
        for (const width of [1280, 768, 390]) {
          await page.setViewportSize({ width, height: 900 });
          const dialog = page.getByRole('dialog', {
            name: 'Sale completed',
            exact: true,
          });
          const geometry = await dialog.evaluate((el) => {
            const style = getComputedStyle(el),
              sections = el.querySelector<HTMLElement>('.pos-payment-sections'),
              actions = el.querySelector<HTMLElement>('.ui-modal-actions'),
              box = el.getBoundingClientRect();
            const controls = [
              ...el.querySelectorAll<HTMLElement>('button,a.ui-button'),
            ].filter((b) => b.getBoundingClientRect().width > 0);
            return {
              padding: parseFloat(style.paddingBottom),
              gap: sections ? parseFloat(getComputedStyle(sections).rowGap) : 0,
              footer: actions
                ? parseFloat(getComputedStyle(actions).marginTop)
                : 0,
              actionGap: actions
                ? parseFloat(getComputedStyle(actions).gap)
                : 0,
              heights: controls.map((b) => b.getBoundingClientRect().height),
              width: box.width,
              overflow: el.scrollWidth > el.clientWidth + 1,
              pageOverflow:
                document.documentElement.scrollWidth > innerWidth + 1,
            };
          });
          assert.ok(
            geometry.padding >= (width >= 1000 ? 24 : width >= 600 ? 20 : 16) &&
              geometry.gap >= 24 &&
              geometry.footer >= 24 &&
              geometry.actionGap >= 12,
            JSON.stringify({ width, geometry }),
          );
          assert.ok(
            geometry.heights.every((h) => h >= 44),
            JSON.stringify({ width, geometry }),
          );
          assert.ok(
            !geometry.overflow &&
              !geometry.pageOverflow &&
              geometry.width <= width,
            JSON.stringify({ width, geometry }),
          );
          const accessibility = await new AxeBuilder({ page })
            .include('dialog[open]')
            .analyze();
          assert.deepEqual(
            accessibility.violations
              .filter((v) => ['critical', 'serious'].includes(v.impact ?? ''))
              .map((v) => v.id),
            [],
          );
        }
        await page.setViewportSize({ width: 1280, height: 1000 });
      },
    );
    await check(
      'cash sale appears in existing Orders and original-unit refund dialog',
      async () => {
        await page
          .getByRole('link', { name: 'View Order', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Record refund', exact: true })
          .waitFor();
        await page
          .getByRole('button', { name: 'Record refund', exact: true })
          .click();
        const dialog = page.getByRole('dialog', {
          name: 'Record refund',
          exact: true,
        });
        await dialog.waitFor();
        await dialog.getByRole('checkbox').first().check();
        await dialog
          .getByLabel('Refund reason')
          .fill('Disposable browser test cash returned');
        assert.ok(
          await dialog
            .getByRole('button', { name: 'Confirm Cash Returned', exact: true })
            .isDisabled(),
        );
        await dialog
          .getByLabel('I have returned this cash to the customer.')
          .check();
        for (const width of [1280, 768, 390]) {
          await page.setViewportSize({ width, height: 900 });
          const g = await dialog.evaluate((el) => ({
            gap: parseFloat(
              getComputedStyle(el.querySelector('.pos-payment-sections')!)
                .rowGap,
            ),
            footer: parseFloat(
              getComputedStyle(el.querySelector('.ui-modal-actions')!)
                .marginTop,
            ),
            overflow: el.scrollWidth > el.clientWidth + 1,
          }));
          assert.ok(
            g.gap >= 24 && g.footer >= 24 && !g.overflow,
            JSON.stringify({ width, g }),
          );
        }
        await dialog
          .getByRole('button', { name: 'Confirm Cash Returned', exact: true })
          .click();
        await dialog.waitFor({ state: 'hidden' });
        await page
          .getByLabel('Refund history')
          .getByText(/SETTLED/)
          .waitFor();
        await page.setViewportSize({ width: 1280, height: 1000 });
        await page
          .getByRole('link', { name: 'In-Person Checkout', exact: true })
          .first()
          .click();
      },
    );
    await check(
      'simulated timeout survives reload and reconciles original attempt',
      async () => {
        await page
          .getByRole('button', { name: 'Start checkout', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Add Beeswax Candle', exact: true })
          .click();
        await page.getByLabel('Quantity for Beeswax Candle').waitFor();
        await openPayment();
        await page.getByLabel('Payment method').selectOption('SIMULATED');
        await page
          .getByLabel('Simulated terminal outcome')
          .selectOption('TIMEOUT');
        await page
          .getByRole('button', { name: 'Start simulated payment', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Check Payment Status', exact: true })
          .waitFor();
        assert.equal(
          await page
            .getByRole('button', { name: 'New Sale', exact: true })
            .count(),
          0,
        );
        await page.reload();
        await page
          .getByRole('button', { name: /Check payment for order / })
          .click();
        await page
          .getByRole('button', { name: 'Check Payment Status', exact: true })
          .click();
        await page
          .getByRole('dialog', { name: 'Sale completed', exact: true })
          .waitFor();
        assert.ok(
          await page
            .getByText('Simulated Terminal - Test Only', { exact: true })
            .isVisible(),
        );
        assert.deepEqual(failures, []);
      },
    );
    await check(
      'lost cash completion response restores the actual latest receipt after reload',
      async () => {
        await page
          .getByRole('button', { name: 'New Sale', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Add Beeswax Candle', exact: true })
          .click();
        await page.getByLabel('Quantity for Beeswax Candle').waitFor();
        await openPayment();
        await page
          .getByRole('button', { name: 'Exact Amount', exact: true })
          .click();
        let orderCode = '',
          charges = 0;
        const handler: Parameters<typeof page.route>[1] = async (route) => {
          const body = route.request().postDataJSON() as { query?: string };
          if (body.query?.includes('payOwnPosSale')) {
            charges++;
            const response = await route.fetch(),
              payload = (await response.json()) as {
                data: { payOwnPosSale: { orderCode: string; state: string } };
              };
            assert.equal(payload.data.payOwnPosSale.state, 'COMPLETED');
            orderCode = payload.data.payOwnPosSale.orderCode;
            await route.abort('failed');
          } else await route.continue();
        };
        await page.route('**/admin-api', handler);
        await page
          .getByRole('button', { name: 'Confirm Cash Received', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Check Payment Status', exact: true })
          .waitFor();
        await page.unroute('**/admin-api', handler);
        await page.reload();
        await page
          .getByRole('button', { name: 'View Completed Sale', exact: true })
          .click();
        const receipt = page.getByRole('dialog', {
          name: 'Sale completed',
          exact: true,
        });
        await receipt.waitFor();
        assert.ok((await receipt.innerText()).includes(orderCode));
        assert.equal(charges, 1);
      },
    );
    console.log(`POS browser: ${passed} checks passed`);
  } catch (error) {
    const location = new URL(page.url());
    console.error(
      'POS browser failure at ' +
        location.origin +
        location.pathname +
        '\n' +
        (await page.locator('body').innerText()).slice(0, 3500),
    );
    throw error;
  } finally {
    await browser.close();
  }
}
