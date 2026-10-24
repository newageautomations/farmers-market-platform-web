import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import type { Ready } from './loyalty';

/** Direct Chromium DOM checks. No screenshot, trace or video APIs are used. */
export async function marketLoyaltyBrowserChecks(ready: Ready) {
  const browser = await chromium.launch({ headless: true }),
    central = 'http://auth.platform.localhost:4357',
    admin = 'http://localhost:4575',
    market = 'http://market-a.localhost:4357';
  let passed = 0;
  const check = async (name: string, work: () => Promise<void>) => {
    await work();
    console.log(`PASS market loyalty browser ${++passed}: ${name}`);
  };
  async function login(page: Page, email: string) {
    await page.goto(central + '/account/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(ready.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/account');
  }
  async function control(action: string, input: unknown) {
    const r = await fetch(ready.controlUrl + '/' + action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-loyalty-demo-key': ready.controlKey,
      },
      body: JSON.stringify(input),
    });
    const result = await r.json();
    assert.equal(r.ok, true, JSON.stringify(result));
    return result;
  }
  async function challenges(page: Page) {
    await page.goto(central + '/account/loyalty');
    await page
      .locator('astro-island')
      .filter({ has: page.getByRole('tab', { name: 'Market Challenges' }) })
      .evaluate(async (e) => {
        while (e.hasAttribute('ssr'))
          await new Promise((r) => setTimeout(r, 20));
      });
    await page.getByRole('tab', { name: 'Market Challenges' }).click();
    await page
      .getByRole('heading', { name: 'Market Explorer', exact: true })
      .waitFor();
  }
  async function hydrated(page: Page, component: string) {
    await page
      .locator(`astro-island[component-export="${component}"]`)
      .evaluate(async (e) => {
        while (e.hasAttribute('ssr'))
          await new Promise((r) => setTimeout(r, 20));
      });
  }
  try {
    const managerContext = await browser.newContext(),
      customerContext = await browser.newContext(),
      manager = await managerContext.newPage(),
      customer = await customerContext.newPage(),
      errors: string[] = [];
    for (const page of [manager, customer]) {
      page.setDefaultTimeout(30000);
      page.on('pageerror', (e) => errors.push(e.message));
    }
    await check(
      'manager authentication, navigation and real metrics',
      async () => {
        await login(manager, ready.manager!);
        await manager.goto(
          `${admin}/market?channel=${ready.marketChannel}&account=1`,
        );
        await manager
          .getByRole('link', { name: 'Loyalty', exact: true })
          .waitFor();
        await manager.goto(admin + '/market/loyalty');
        await manager.getByText('Program enabled', { exact: true }).waitFor();
        assert.match(
          await manager.locator('.ui-kpi-grid').innerText(),
          /Awaiting fulfillment/,
        );
      },
    );
    for (const [kind, title] of [
      ['Vendor Discovery', 'Browser explorer'],
      ['Market Visits', 'Browser regular'],
      ['Market Spending', 'Browser spending'],
    ] as const)
      await check(
        `${kind} wizard persists configurable custom reward`,
        async () => {
          await manager.goto(admin + '/market/loyalty/challenges/new');
          await manager.getByRole('radio', { name: kind, exact: true }).check();
          await manager
            .getByRole('button', { name: 'Continue', exact: true })
            .click();
          await manager
            .getByLabel('Challenge title', { exact: true })
            .fill(title);
          if (kind === 'Market Spending') {
            await manager.getByLabel('Target spending (USD)').fill('500');
            await manager
              .getByLabel('Number of consecutive market occurrences')
              .fill('3');
            await manager
              .getByLabel('Starting market occurrence')
              .selectOption(ready.occurrences![0]!.id);
          } else {
            await manager
              .getByLabel(
                kind === 'Vendor Discovery'
                  ? 'Number of different vendors required'
                  : 'Number of different occurrences required',
              )
              .fill('2');
            await manager
              .getByLabel(
                kind === 'Vendor Discovery'
                  ? 'Minimum product spending per vendor (USD)'
                  : 'Minimum product spending in one order (USD)',
              )
              .fill('500');
          }
          await manager
            .getByRole('button', { name: 'Continue', exact: true })
            .click();
          await manager
            .getByRole('link', { name: 'See common rewards', exact: true })
            .click();
          await manager
            .getByRole('dialog', { name: 'Common rewards' })
            .getByText('Market-branded hat', { exact: true })
            .waitFor();
          await manager
            .getByRole('dialog', { name: 'Common rewards' })
            .getByRole('button', { name: 'Close', exact: true })
            .click();
          await manager
            .getByLabel('Reward Description', { exact: true })
            .fill('A custom local reward\nCollect at our market booth.');
          await manager
            .getByRole('button', { name: 'Continue', exact: true })
            .click();
          assert.match(
            await manager.locator('main').innerText(),
            /Publication locks/,
          );
          await manager
            .getByRole('button', { name: 'Publish challenge', exact: true })
            .click();
          await manager.waitForURL('**/market/loyalty/challenges');
          await manager
            .getByRole('button', { name: 'Open ' + title, exact: true })
            .waitFor();
        },
      );
    await login(customer, ready.customers[0]!);
    for (const width of [1280, 390])
      await check(
        `customer tabs, progress, accessibility and layout at ${width}px`,
        async () => {
          await customer.setViewportSize({ width, height: 900 });
          await challenges(customer);
          const explorer = customer.getByRole('article').filter({
            has: customer.getByRole('heading', {
              name: 'Market Explorer',
              exact: true,
            }),
          });
          assert.match(await explorer.innerText(), /2 \/ 3 vendors/);
          assert.equal(
            await explorer
              .getByRole('button', { name: 'Claim Reward', exact: true })
              .count(),
            0,
          );
          assert.ok(
            await customer.evaluate(
              () =>
                document.documentElement.scrollWidth <= window.innerWidth + 1,
            ),
          );
          const axe = await new AxeBuilder({ page: customer })
            .include('.loyalty-wallet-grid')
            .analyze();
          assert.deepEqual(
            axe.violations.map((v) => v.id),
            [],
          );
        },
      );
    await check(
      'reduced motion uses the existing ring safeguards',
      async () => {
        await customer.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(
          await customer
            .locator('.loyalty-ring-current')
            .first()
            .evaluate((e) => getComputedStyle(e).animationName),
          'none',
        );
      },
    );
    let orderId: number;
    await check(
      'browser purchase creates pending market progress through real checkout',
      async () => {
        await customer.goto(market + '/account/login');
        await customer.waitForURL(market + '/account');
        await customer.goto(
          `${market}/occurrences/${ready.occurrenceId}/products/${ready.variants[2]}`,
        );
        await hydrated(customer, 'MarketPurchase');
        await customer
          .getByRole('button', { name: 'Add to cart', exact: true })
          .click();
        await customer
          .getByRole('status')
          .filter({ hasText: 'Added to your cart.' })
          .waitFor();
        await customer.goto(market + '/cart');
        await hydrated(customer, 'MarketCart');
        await customer
          .getByRole('link', { name: 'Continue to checkout', exact: true })
          .click();
        await hydrated(customer, 'Checkout');
        await customer
          .getByRole('button', { name: 'Continue to pickup', exact: true })
          .click();
        await customer
          .getByRole('button', { name: 'Review order', exact: true })
          .click();
        await customer
          .getByRole('button', { name: 'Continue to payment', exact: true })
          .click();
        await customer
          .getByLabel('Payment method', { exact: true })
          .selectOption('dev-test-payment');
        await customer
          .getByRole('button', { name: 'Place order', exact: true })
          .click();
        await customer.waitForURL('**/checkout/success?*');
        orderId = Number(new URL(customer.url()).searchParams.get('order'));
        assert.ok(orderId > 0);
        await challenges(customer);
        const card = customer.getByRole('article').filter({
          has: customer.getByRole('heading', {
            name: 'Market Explorer',
            exact: true,
          }),
        });
        assert.match(await card.innerText(), /pending fulfillment/);
        assert.equal(
          await card.getByRole('button', { name: 'Claim Reward' }).count(),
          0,
        );
      },
    );
    await check(
      'fulfillment completes the real objective and customer claim persists',
      async () => {
        await control('fulfill', { orderId: orderId!, vendor: 2, quantity: 1 });
        await challenges(customer);
        const card = customer.getByRole('article').filter({
          has: customer.getByRole('heading', {
            name: 'Market Explorer',
            exact: true,
          }),
        });
        assert.match(await card.innerText(), /3 \/ 3 vendors/);
        await card
          .getByRole('button', { name: 'Claim Reward', exact: true })
          .click();
        await customer
          .getByRole('dialog')
          .getByRole('button', { name: 'Confirm claim' })
          .click();
        await customer
          .getByText(/Reward claimed. Your market manager/)
          .waitFor();
        await customer
          .getByRole('button', { name: 'Close', exact: true })
          .click();
        await challenges(customer);
        assert.match(await card.innerText(), /Claimed/);
      },
    );
    await check(
      'manager opens minimal claim row and records manual fulfillment',
      async () => {
        await manager.goto(admin + '/market/loyalty/rewards');
        await manager
          .getByRole('button', {
            name: 'Open Customer 1 · Market Explorer',
            exact: true,
          })
          .click();
        await manager
          .getByLabel('Fulfillment note (optional)')
          .fill('Collected tote at the information booth.');
        await manager
          .getByRole('button', { name: 'Mark fulfilled', exact: true })
          .click();
        await manager.getByRole('dialog').waitFor({ state: 'hidden' });
        await challenges(customer);
        assert.match(
          await customer
            .getByRole('article')
            .filter({
              has: customer.getByRole('heading', {
                name: 'Market Explorer',
                exact: true,
              }),
            })
            .innerText(),
          /Fulfilled/,
        );
      },
    );
    await check(
      'consecutive occurrence purchases complete visits and spending independently',
      async () => {
        await control('purchase', {
          customer: 0,
          occurrence: 1,
          vendors: [0],
          quantities: [3],
        });
        await control('purchase', {
          customer: 0,
          occurrence: 2,
          vendors: [0],
          quantities: [4],
        });
        await control('purchase', {
          customer: 0,
          occurrence: 3,
          vendors: [0],
          quantities: [2],
        });
        await challenges(customer);
        const visits = customer.getByRole('article').filter({
            has: customer.getByRole('heading', {
              name: 'Market Regular',
              exact: true,
            }),
          }),
          spend = customer.getByRole('article').filter({
            has: customer.getByRole('heading', {
              name: 'Support Local',
              exact: true,
            }),
          });
        assert.match(await visits.innerText(), /4 \/ 4 visits/);
        assert.match(await spend.innerText(), /\$116.00 \/ \$100.00 spent/);
      },
    );
    await check(
      'refund preserves fulfilled history, reverses discovery and flags review',
      async () => {
        await control('refund', { orderId: orderId!, vendor: 2, quantity: 1 });
        await challenges(customer);
        const card = customer.getByRole('article').filter({
          has: customer.getByRole('heading', {
            name: 'Market Explorer',
            exact: true,
          }),
        });
        assert.match(await card.innerText(), /Needs review/);
        assert.match(await card.innerText(), /2 \/ 3 vendors/);
        await card
          .getByRole('heading', { name: 'Market Explorer', exact: true })
          .click();
        assert.match(
          await customer.getByRole('dialog').innerText(),
          /Reward fulfilled/,
        );
      },
    );
    assert.deepEqual(errors, []);
    console.log(
      `Market loyalty browser: ${passed} groups passed. No screenshots, videos or traces.`,
    );
    await managerContext.close();
    await customerContext.close();
  } finally {
    await browser.close();
  }
}
