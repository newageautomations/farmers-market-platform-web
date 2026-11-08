import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import type { PosReady } from './in-person';
import { startCloverOAuthTestProxy } from './clover-oauth-proxy';

/** DOM, accessibility and computed geometry only. No screenshots, videos, images or traces. */
export async function cloverBrowserChecks(ready: PosReady) {
  const proxy = process.env.CLOVER_OAUTH_CADDY_BINARY
    ? await startCloverOAuthTestProxy(
        new URL(ready.endpoint).origin,
        ready.admin,
      )
    : undefined;
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
    console.log(`PASS Clover browser ${++passed}: ${name}`);
  };
  async function geometry(selector: string) {
    for (const width of [1280, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const g = await page.locator(selector).evaluate((el) => ({
        overflow:
          el.scrollWidth > el.clientWidth + 1 ||
          document.documentElement.scrollWidth > innerWidth + 1,
        padding: parseFloat(getComputedStyle(el).paddingInlineStart),
        gaps: [...el.querySelectorAll('.pos-payment-sections')].map((e) =>
          parseFloat(getComputedStyle(e).rowGap),
        ),
        actions: [...el.querySelectorAll('.ui-actions')].map((e) =>
          parseFloat(getComputedStyle(e).gap),
        ),
        footer: [...el.querySelectorAll('.ui-modal-actions')].map((e) =>
          parseFloat(getComputedStyle(e).marginTop),
        ),
        cards: [...el.querySelectorAll('.ui-card')].map((e) =>
          parseFloat(getComputedStyle(e).paddingInlineStart),
        ),
        controls: [
          ...el.querySelectorAll<HTMLElement>(
            'button:not(.dialog-close),input,select',
          ),
        ]
          .filter(
            (e) =>
              e.getBoundingClientRect().width > 0 &&
              !e.closest('select button'),
          )
          .map(
            (e) =>
              (e.matches('input[type="checkbox"],input[type="radio"]')
                ? (e.closest('label') ?? e)
                : e
              ).getBoundingClientRect().height,
          ),
      }));
      assert.equal(g.overflow, false, JSON.stringify({ width, g }));
      assert.ok(g.gaps.every((n) => n >= 24));
      assert.ok(g.actions.every((n) => n >= 12));
      assert.ok(g.footer.every((n) => n >= 24));
      assert.ok(g.cards.every((n) => n >= 16));
      assert.ok(
        g.controls.every((n) => n >= 44),
        JSON.stringify({ width, g }),
      );
      if (selector === 'dialog[open]') assert.ok(g.padding >= 16);
      const a11y = await new AxeBuilder({ page }).include(selector).analyze();
      assert.deepEqual(
        a11y.violations
          .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
          .map((v) => v.id),
        [],
      );
      console.log(
        `Clover DOM geometry ${width}px ${selector}: padding=${g.padding}; section gaps=${g.gaps}; action gaps=${g.actions}; footer=${g.footer}; no overflow`,
      );
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
  }
  try {
    await check(
      'registered callback navigates to the dashboard and its original session connects controlled Clover alongside Square',
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
        const settingsRequest = page.waitForRequest(
          (request) =>
            request.postData()?.includes('ownCloverIntegration') ?? false,
        );
        await page.getByRole('link', { name: 'Payments', exact: true }).click();
        const channel = (await settingsRequest).headers()['vendure-token'];
        assert.ok(channel);
        await page
          .getByRole('button', { name: 'Connect Clover controlled test' })
          .waitFor();
        const endpoint = ready.endpoint.replace('127.0.0.1', 'localhost');
        const state = await page.evaluate(
          async ({ endpoint, channel }) => {
            const response = await fetch(endpoint, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'vendure-token': channel,
              },
              body: JSON.stringify({
                query: 'mutation{beginOwnCloverConnection}',
              }),
            });
            const result = await response.json();
            if (!result.data?.beginOwnCloverConnection?.url)
              throw new Error('Authenticated Clover begin failed');
            return new URL(
              result.data.beginOwnCloverConnection.url,
            ).searchParams.get('state');
          },
          { endpoint, channel },
        );
        assert.ok(state);
        const callback = new URL(
          '/in-person/clover/oauth/callback',
          proxy?.origin ?? endpoint,
        );
        callback.search = new URLSearchParams({
          state,
          code: crypto.randomUUID(),
          merchant_id: 'controlled-honey-merchant',
          client_id: 'controlled-clover-app',
          employee_id: 'controlled-employee',
        }).toString();
        const redirect = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname ===
            '/in-person/clover/oauth/callback',
        );
        await page.goto(callback.href);
        const response = await redirect;
        assert.equal(
          response.status(),
          303,
          'Callback must navigate using an HTTP redirect',
        );
        const location = new URL(response.headers().location!);
        assert.equal(
          location.origin + location.pathname,
          `${ready.admin}/vendor/settings/clover-return`,
        );
        assert.deepEqual([...location.searchParams], [['state', state]]);
        await page
          .getByText('Clover merchant authorization verified.', {
            exact: false,
          })
          .waitFor();
        assert.equal(
          new URL(page.url()).pathname,
          '/vendor/settings/clover-return',
        );
        assert.equal(
          new URL(page.url()).search,
          '',
          'Return handler removes opaque state from browser history',
        );
        await page
          .getByRole('link', { name: 'Return to Payments settings' })
          .click();
        await page
          .getByText('Controlled Honey merchant · controlled-honey-merchant')
          .waitFor();
        assert.equal(
          await page
            .locator('.clover-integration h2,.clover-integration h3')
            .count(),
          0,
        );
      },
    );
    await check(
      'settings spacing and accessibility at desktop, tablet and mobile',
      () => geometry('.clover-integration'),
    );
    await check(
      'device registration dialog, keyboard focus and responsive padding',
      async () => {
        await page.getByRole('button', { name: 'Add Clover device' }).click();
        await page.getByRole('dialog', { name: 'Add Clover device' }).waitFor();
        await page
          .getByLabel('Friendly device label')
          .fill('Controlled Clover counter');
        await geometry('dialog[open]');
        await page
          .getByRole('button', { name: 'Register Clover device' })
          .click();
        await page
          .getByText('Availability unverified', { exact: true })
          .waitFor();
        await page
          .getByRole('button', { name: 'Use as default', exact: true })
          .click();
        await page.getByText('Default device', { exact: true }).waitFor();
      },
    );
    await check(
      'register opens Clover payment through the existing review flow',
      async () => {
        await page.goto(`${ready.admin}/vendor/pos`);
        await page
          .getByRole('heading', { name: 'In-Person Checkout', exact: true })
          .waitFor();
        await page
          .getByRole('button', { name: 'Add Beeswax Candle', exact: true })
          .click();
        await page.getByLabel('Quantity for Beeswax Candle').waitFor();
        await page.getByRole('button', { name: /Review checkout ·/ }).click();
        await page
          .getByRole('button', { name: 'Continue to Payment', exact: true })
          .click();
        await page
          .getByRole('dialog', { name: 'Complete payment', exact: true })
          .waitFor();
        await page.getByLabel('Payment method').selectOption('CLOVER');
        await geometry('dialog[open]');
        await page
          .getByRole('button', { name: 'Send to Clover', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Approve controlled Clover payment' })
          .waitFor();
      },
    );
    await check(
      'pending browser reload recovers the original attempt, then approved evidence completes it',
      async () => {
        await page.reload();
        await page
          .getByRole('button', { name: /Check payment for order/ })
          .first()
          .click();
        await page
          .getByRole('button', { name: 'Approve controlled Clover payment' })
          .click();
        await page
          .getByText('Clover controlled test only', { exact: true })
          .waitFor();
        await geometry('dialog[open]');
      },
    );
    await check(
      'Clover refund dialog uses original native units and the existing Orders surface',
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
          .fill('Clover browser controlled return');
        await geometry('dialog[open]');
        await dialog
          .getByRole('button', { name: 'Request Clover refund', exact: true })
          .click();
        await dialog.waitFor({ state: 'hidden' });
        await page
          .getByText(/SETTLED.*Clover browser controlled return/)
          .waitFor();
      },
    );
    assert.deepEqual(errors, []);
    console.log(
      `Clover browser: ${passed} groups; zero screenshots, recordings or traces.`,
    );
  } finally {
    await context.close();
    await browser.close();
    await proxy?.close();
  }
}
