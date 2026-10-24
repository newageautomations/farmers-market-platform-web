import { marketLoyaltyBrowserChecks } from './market-loyalty-browser';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { createInterface } from 'node:readline';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const requestedMode = process.argv[2] ?? 'serve';
const marketMode = requestedMode.startsWith('market-');
const backend = resolve('../farmers-market-platform'),
  runtime = resolve(marketMode ? '.market-loyalty-demo' : '.loyalty-demo'),
  manifest = resolve(runtime, 'ready.json');
const storefrontPort = marketMode ? 4357 : 4347,
  adminPort = marketMode ? 4575 : 4565;
const central = `http://auth.platform.localhost:${storefrontPort}`,
  admin = `http://localhost:${adminPort}`;
export interface Ready {
  marketLoyalty?: boolean;
  manager?: string;
  marketChannel?: string;
  occurrences?: Array<{ id: string; date: string }>;
  challengeIds?: { explorer: number; visits: number; spending: number };
  kind: string;
  database: string;
  endpoint: string;
  shopEndpoint: string;
  controlUrl: string;
  controlKey: string;
  password: string;
  customers: string[];
  vendors: string[];
  vendorChannels: string[];
  occurrenceId: string;
  variants: string[];
  bridgeKey: string;
}
const mode = marketMode ? requestedMode.slice(7) : requestedMode;
if (
  ['orders', 'fulfill', 'refund', 'release', 'cancel', 'purchase'].includes(
    mode,
  )
) {
  const ready = JSON.parse(readFileSync(manifest, 'utf8')) as Ready;
  assert.match(ready.database, /^vendure_test_loyalty_demo_\d+_[a-f0-9]+$/);
  assert.match(ready.controlUrl, /^http:\/\/127\.0\.0\.1:\d+$/);
  const args = Object.fromEntries(
    process.argv.slice(3).map((s) => {
      const [key, value] = s.split('=');
      return [key!, value!];
    }),
  );
  const response = await fetch(ready.controlUrl + '/' + mode, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-loyalty-demo-key': ready.controlKey,
    },
    body: JSON.stringify({
      customer: args.customer ? Number(args.customer) : undefined,
      occurrence: args.occurrence ? Number(args.occurrence) : undefined,
      vendors: args.vendors ? args.vendors.split(',').map(Number) : undefined,
      quantities: args.quantities
        ? args.quantities.split(',').map(Number)
        : undefined,
      fulfill: args.fulfill === 'false' ? false : undefined,
      orderId: args.order ? Number(args.order) : undefined,
      vendor: Number(args.vendor ?? 0),
      quantity: args.quantity ? Number(args.quantity) : undefined,
      attemptId: args.attempt ? Number(args.attempt) : undefined,
      cancelUnfulfilled: args.cancel === 'true',
    }),
  });
  console.log(await response.text());
  if (!response.ok) process.exitCode = 1;
} else {
  const children: ChildProcess[] = [];
  function child(
    cwd: string,
    args: string[],
    env: Record<string, string> = {},
    ipc = false,
  ) {
    const p = spawn(process.execPath, args, {
      cwd,
      windowsHide: true,
      env: {
        ...process.env,
        FRONTEND_NO_EVIDENCE: 'true',
        DB_HOST: '127.0.0.1',
        MARKET_LOYALTY_DEMO: marketMode ? 'true' : 'false',
        ...env,
      },
      stdio: ipc ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
    });
    children.push(p);
    p.stdout?.pipe(process.stdout);
    p.stderr?.pipe(process.stderr);
    return p;
  }
  if (mode === 'backend') {
    const p = child(backend, [
      '--require',
      './test/no-evidence.cjs',
      resolve(backend, 'node_modules/ts-node/dist/bin.js'),
      '--project',
      marketMode
        ? 'test/market-loyalty/tsconfig.json'
        : 'test/loyalty/tsconfig.json',
      marketMode ? 'test/market-loyalty/run.ts' : 'test/loyalty/run.ts',
    ]);
    process.exitCode = await new Promise<number>((r) =>
      p.once('exit', (code) => r(code ?? 1)),
    );
  } else {
    if (!['serve', 'test'].includes(mode))
      throw new Error(
        'Use serve, test, backend, orders, fulfill, refund or release',
      );
    for (const port of [storefrontPort, adminPort])
      for (const host of ['127.0.0.1', '::1'])
        await new Promise<void>((accept, reject) => {
          const s = createServer();
          s.once('error', () =>
            reject(
              new Error(
                `Loyalty demo port ${port} is occupied. Stop the existing disposable demo before recreating it.`,
              ),
            ),
          );
          s.listen(port, host, () =>
            s.close((e) => (e ? reject(e) : accept())),
          );
        });
    const server = child(
      backend,
      [
        '--require',
        './test/no-evidence.cjs',
        resolve(backend, 'node_modules/ts-node/dist/bin.js'),
        '--project',
        'test/loyalty/tsconfig.json',
        'test/loyalty/demo.ts',
      ],
      {},
      true,
    );
    let ready: Ready | undefined;
    try {
      ready = await new Promise<Ready>((accept, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Loyalty seed timed out')),
          240000,
        );
        server.once('exit', (code) => {
          clearTimeout(timeout);
          reject(new Error('Loyalty seed exited ' + code));
        });
        server.on('message', (value) => {
          if (
            value &&
            typeof value === 'object' &&
            'kind' in value &&
            value.kind === 'ready'
          ) {
            clearTimeout(timeout);
            accept(value as Ready);
          }
        });
      });
      assert.match(ready.database, /^vendure_test_loyalty_demo_/);
      mkdirSync(runtime, { recursive: true });
      writeFileSync(manifest, JSON.stringify(ready, null, 2));
      const env = {
        APP_ENV: 'test',
        NODE_ENV: 'test',
        FRONTEND_FIXTURE_MODE: 'false',
        SHOP_API_URL: ready.shopEndpoint,
        PUBLIC_ADMIN_API_URL: ready.endpoint.replace('127.0.0.1', 'localhost'),
        PLATFORM_ACCOUNT_ORIGIN: central,
        ADMIN_ORIGIN: admin,
        PLATFORM_ACCOUNT_BRIDGE_KEY: ready.bridgeKey,
      };
      child(
        resolve('apps/storefront'),
        [
          '--input-type=module',
          '--eval',
          `import {dev} from 'astro'; await dev({server:{host:'127.0.0.1',port:${storefrontPort}}});`,
        ],
        env,
      );
      child(
        resolve('apps/admin'),
        [
          resolve('node_modules/vite/bin/vite.js'),
          '--host',
          'localhost',
          '--port',
          String(adminPort),
          '--strictPort',
        ],
        env,
      );
      async function healthy(url: string) {
        for (let i = 0; i < 120; i++) {
          try {
            if ((await fetch(url)).ok) return;
          } catch {
            /* Local service starting. */
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        throw new Error('Local service failed to start: ' + url);
      }
      await Promise.all([
        healthy(`http://127.0.0.1:${storefrontPort}/robots.txt`),
        healthy(admin),
      ]);
      console.log(
        `Loyalty disposable demo ready\nCustomer: ${central}/account/loyalty\nVendor: ${admin}/vendor/loyalty\nMarket: http://market-a.localhost:${storefrontPort}/occurrences/${ready.occurrenceId}\nCustomers: ${ready.customers.join(', ')}\nVendors: ${ready.vendors.join(', ')}\nPassword: ${ready.password}\nDatabase: ${ready.database}\nPress Enter or Ctrl+C to stop this owned demo. Restart this command to recreate fresh data.`,
      );
      if (marketMode)
        console.log(
          `Market manager: ${admin}/market/loyalty?channel=${ready.marketChannel}&account=1\nManager: ${ready.manager}\nOccurrence URLs: ${ready.occurrences?.map((o) => `http://market-a.localhost:${storefrontPort}/occurrences/${o.id} (${o.date})`).join(', ')}\nDemo details: ${manifest}`,
        );
      if (mode === 'serve') {
        const input = createInterface({ input: process.stdin });
        await new Promise<void>((r) => {
          input.once('line', () => r());
          input.once('close', () => r());
          process.once('SIGINT', () => r());
          process.once('SIGTERM', () => r());
        });
        input.close();
      } else if (marketMode) await marketLoyaltyBrowserChecks(ready);
      else await browserChecks(ready);
    } finally {
      for (const p of children.filter((p) => p !== server)) p.kill();
      if (server.exitCode === null) {
        server.stdin?.write('finish\n');
        await new Promise<void>((r) => {
          server.once('exit', () => r());
          setTimeout(() => {
            server.kill();
            r();
          }, 20000).unref();
        });
      }
      if (existsSync(manifest)) unlinkSync(manifest);
    }
  }
}

async function browserChecks(ready: Ready) {
  const browser = await chromium.launch({ headless: true });
  let passed = 0;
  const check = async (name: string, work: () => Promise<void>) => {
    await work();
    passed++;
    console.log(`PASS loyalty browser ${passed}: ${name}`);
  };
  async function login(page: Page, email: string, origin = central) {
    await page.goto(origin + '/account/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(ready.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/account');
  }
  try {
    const context = await browser.newContext(),
      page = await context.newPage(),
      errors: string[] = [];
    page.setDefaultTimeout(30000);
    page.on('pageerror', (e) => errors.push(e.message));
    await login(page, ready.customers[0]!);
    for (const width of [1280, 390])
      await check(
        `Customer cards, cumulative ring, accessibility and no overflow at ${width}px`,
        async () => {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(central + '/account/loyalty');
          await page
            .getByRole('heading', { name: 'Loyalty', exact: true })
            .waitFor();
          await page
            .locator('astro-island[component-url*="CustomerLoyalty"]')
            .evaluate(async (e) => {
              while (e.hasAttribute('ssr'))
                await new Promise((r) => setTimeout(r, 20));
            });
          assert.equal(
            await page
              .getByRole('article', {
                name: 'Hill Country Honey loyalty',
                exact: true,
              })
              .count(),
            1,
          );
          assert.match(
            (await page
              .getByRole('img', {
                name: /Hill Country Honey loyalty:.*3,500 of 5,000/,
              })
              .getAttribute('aria-labelledby')) ?? '',
            /.+/,
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          );
          const ring = page
            .getByRole('article', {
              name: 'Hill Country Honey loyalty',
              exact: true,
            })
            .locator('.loyalty-ring');
          assert.equal(
            await ring.getAttribute('data-milestone-reached'),
            'true',
          );
          const geometry = await ring.evaluate((e) => {
            const svg = e.querySelector('svg')!.getBoundingClientRect(),
              box = e.getBoundingClientRect();
            return Math.abs(
              svg.left + svg.width / 2 - box.left - box.width / 2,
            );
          });
          assert.ok(geometry < 2, 'Ring must be centered in the card');
          assert.equal(
            await ring
              .locator('.loyalty-ring-current')
              .evaluate((e) => getComputedStyle(e).animationName),
            'loyalty-ring-fill',
          );
          assert.equal(
            await page
              .getByText('Participating vendor', { exact: true })
              .count(),
            0,
          );
          const walletCard = page.getByRole('article', {
            name: 'Hill Country Honey loyalty',
            exact: true,
          });
          assert.doesNotMatch(
            await walletCard.innerText(),
            /pending|reserved|rewards available/,
          );
          assert.equal(
            await walletCard.locator('.loyalty-vendor-heading button').count(),
            0,
          );
          assert.match(
            await walletCard
              .getByRole('button', {
                name: 'Redeem Hill Country Honey rewards',
              })
              .evaluate((e) => getComputedStyle(e).animationName),
            /loyalty-redeem-bounce/,
          );
          const axe = await new AxeBuilder({ page })
            .include('.loyalty-wallet-grid')
            .analyze();
          assert.deepEqual(
            axe.violations.map((v) => v.id),
            [],
          );
        },
      );
    await check(
      'Reduced motion and reward review do not spend points',
      async () => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const card = page.getByRole('article', {
          name: 'Hill Country Honey loyalty',
          exact: true,
        });
        await card
          .getByRole('button', { name: 'Redeem Hill Country Honey rewards' })
          .click();
        await page.getByRole('dialog').waitFor();
        assert.equal(
          await page
            .getByRole('dialog')
            .locator('.loyalty-redeem-ready')
            .first()
            .evaluate((e) => getComputedStyle(e).animationName),
          'none',
        );
        await page
          .getByRole('dialog')
          .getByRole('button', { name: 'Redeem', exact: true })
          .first()
          .click();
        assert.match(
          await page.getByRole('dialog').innerText(),
          /No points are deducted here/,
        );
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        assert.equal(
          await card
            .locator('.loyalty-ring-current')
            .first()
            .evaluate((e) => getComputedStyle(e).animationName),
          'none',
        );
      },
    );
    await check(
      'Customer redeems in real multi-vendor checkout, fulfills and partially refunds',
      async () => {
        const market = 'http://market-a.localhost:4347';
        await page.goto(market + '/account/login');
        await page.waitForURL(market + '/account');
        for (const [i, quantity] of [
          [0, 3],
          [1, 2],
        ]) {
          await page.goto(
            `${market}/occurrences/${ready.occurrenceId}/products/${ready.variants[i!]}`,
          );
          await page
            .locator('astro-island[component-export="MarketPurchase"]')
            .evaluate(async (e) => {
              while (e.hasAttribute('ssr'))
                await new Promise((r) => setTimeout(r, 20));
            });
          await page
            .getByLabel('Quantity', { exact: true })
            .fill(String(quantity));
          await page
            .getByRole('button', { name: 'Add to cart', exact: true })
            .click();
          await page
            .getByRole('status')
            .filter({ hasText: 'Added to your cart.' })
            .waitFor();
        }
        await page.goto(market + '/cart');
        await page
          .locator('astro-island[component-export="MarketCart"]')
          .evaluate(async (e) => {
            while (e.hasAttribute('ssr'))
              await new Promise((r) => setTimeout(r, 20));
          });
        await page
          .getByRole('group', { name: 'Hill Country Honey checkout rewards' })
          .getByRole('button', { name: 'Use Rewards', exact: true })
          .first()
          .click();
        await page
          .getByRole('button', { name: 'Apply to this order', exact: true })
          .click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.match(
          await page.locator('.cart-totals').innerText(),
          /\$52\.00/,
        );
        assert.match(
          await page
            .getByRole('group', { name: 'Hill Country Honey checkout rewards' })
            .innerText(),
          /\$2 off honey applied/,
        );
        assert.equal(
          await page
            .getByRole('group', { name: 'Green Acres Farm checkout rewards' })
            .getByRole('button', { name: 'Use Rewards' })
            .isDisabled(),
          true,
        );
        await page
          .getByRole('link', { name: 'Continue to checkout', exact: true })
          .click();
        await page
          .locator('astro-island[component-export="Checkout"]')
          .evaluate(async (e) => {
            while (e.hasAttribute('ssr'))
              await new Promise((r) => setTimeout(r, 20));
          });
        await page
          .getByRole('button', { name: 'Continue to pickup', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Review order', exact: true })
          .click();
        assert.match(
          await page.locator('.checkout-summary').innerText(),
          /\$28\.00/,
        );
        assert.match(
          await page.locator('.checkout-summary').innerText(),
          /\$24\.00/,
        );
        await page
          .getByRole('button', { name: 'Continue to payment', exact: true })
          .click();
        await page
          .getByLabel('Payment method', { exact: true })
          .selectOption('dev-test-payment');
        await page
          .getByRole('button', { name: 'Place order', exact: true })
          .click();
        await page.waitForURL('**/checkout/success?order=*');
        const orderId = Number(new URL(page.url()).searchParams.get('order'));
        await page.goto(market + '/account/loyalty');
        let honey = page.getByRole('article', {
          name: 'Hill Country Honey loyalty',
          exact: true,
        });
        assert.doesNotMatch(await honey.innerText(), /pending|reserved/);
        await page
          .locator('summary')
          .filter({ hasText: 'Points and reward history' })
          .click();
        await page
          .getByRole('button', {
            name: 'Purchase · Hill Country Honey · +2,800 points',
            exact: true,
          })
          .click();
        assert.match(
          await page.getByRole('dialog').innerText(),
          /2,800 points are pending fulfillment/,
        );
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        const control = async (
          action: string,
          input: Record<string, unknown>,
        ) => {
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
        };
        await control('fulfill', { orderId, vendor: 0 });
        await page.reload();
        honey = page.getByRole('article', {
          name: 'Hill Country Honey loyalty',
          exact: true,
        });
        assert.match(await honey.innerText(), /4,300/);
        assert.doesNotMatch(await honey.innerText(), /pending|reserved/);
        await control('refund', { orderId, vendor: 0, quantity: 1 });
        await page.reload();
        assert.match(await honey.innerText(), /3,367/);
        await page
          .locator('summary')
          .filter({ hasText: 'Points and reward history' })
          .click();
        const history = page.getByRole('list', {
          name: 'Points and reward history',
          exact: true,
        });
        assert.match(await history.innerText(), /Refund/s);
        assert.match(await history.innerText(), /-933 points/);
        assert.doesNotMatch(
          await history.innerText(),
          /refund reversal|award finalized|redemption reserved/i,
        );
      },
    );
    await check(
      'Vendor creates all three reward types through the real wizard',
      async () => {
        const vendor = await browser.newContext(),
          p = await vendor.newPage();
        p.setDefaultTimeout(30000);
        p.on('pageerror', (e) => {
          console.log('Vendor browser error: ' + e.message);
          errors.push(e.message);
        });
        await login(p, ready.vendors[0]!);
        await p.goto(
          `${admin}/vendor?channel=${ready.vendorChannels[0]}&account=1`,
        );
        await p
          .getByRole('heading', { name: 'Overview', exact: true })
          .waitFor();
        await p.goto(admin + '/vendor/loyalty');
        await p
          .getByRole('heading', { name: 'Loyalty', exact: true })
          .waitFor();
        const charts = p.locator('.loyalty-trend');
        await charts.first().waitFor();
        assert.ok((await charts.count()) > 0);
        assert.ok(
          Number(
            await charts.first().locator('rect').first().getAttribute('width'),
          ) < 20,
        );
        assert.ok((await charts.first().locator('text').count()) >= 5);
        assert.equal(
          await p
            .locator('.loyalty-top-customers [data-loyalty-rank="1"]')
            .count(),
          1,
        );
        assert.doesNotMatch(
          await p.locator('.loyalty-top-customers').innerText(),
          /#1|#2|#3/,
        );
        await p
          .getByRole('img', { name: 'First place trophy', exact: true })
          .waitFor();
        await p
          .getByRole('img', { name: 'Second place medal', exact: true })
          .waitFor();
        const leader = p.getByRole('article', {
          name: 'Gold customer',
          exact: true,
        });
        const background = await leader.evaluate(
          (e) => getComputedStyle(e).backgroundColor,
        );
        assert.notEqual(background, 'rgb(255, 255, 255)');
        await leader.getByRole('button').click();
        await p.getByRole('dialog').waitFor();
        assert.match(
          await p.getByRole('dialog').innerText(),
          /Completed orders/,
        );
        await p.getByRole('button', { name: 'Close', exact: true }).click();
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
        await p
          .getByRole('button', { name: 'View daily values', exact: true })
          .first()
          .click();
        const graph = p.getByRole('dialog', { name: 'Points earned by date' });
        await graph.getByRole('img').waitFor();
        await graph
          .getByLabel('From date (UTC)', { exact: true })
          .fill('2000-01-01');
        await graph
          .getByLabel('Through date (UTC)', { exact: true })
          .fill('2000-01-03');
        await graph
          .getByRole('button', { name: 'Update graph', exact: true })
          .click();
        await graph
          .getByText('No activity in this period.', { exact: true })
          .waitFor();
        assert.equal(
          await graph.locator('.loyalty-daily-values > div').count(),
          3,
        );
        await p.getByRole('button', { name: 'Close', exact: true }).click();
        await graph.waitFor({ state: 'hidden' });
        for (const [label, name] of [
          ['Fixed amount discount', 'Browser fixed reward'],
          ['Percentage discount', 'Browser percentage reward'],
          ['Free product', 'Browser free honey'],
        ]) {
          await p.goto(admin + '/vendor/loyalty/rewards/new');
          await p.getByText(label!, { exact: true }).click();
          await p
            .getByRole('button', { name: 'Continue', exact: true })
            .click();
          await p.getByLabel('Reward name', { exact: true }).fill(name!);
          if (label === 'Fixed amount discount') {
            await p
              .getByLabel('Discount amount (USD)', { exact: true })
              .fill('2.75');
            const minimum = p.getByLabel(
              'Minimum eligible product subtotal (USD)',
              { exact: true },
            );
            await minimum.fill('3');
            assert.equal(
              await minimum.evaluate(
                (e: HTMLInputElement) => e.validity.rangeOverflow,
              ),
              true,
            );
            await minimum.fill('2.75');
          }
          if (label === 'Percentage discount') {
            await p.getByLabel('Percentage', { exact: true }).fill('20');
            await p
              .getByLabel('Maximum discount (USD)', { exact: true })
              .fill('5.25');
          }
          if (label === 'Free product') {
            await p
              .getByRole('combobox', { name: 'Product and variant' })
              .click();
            await p
              .getByRole('option', { name: /Raw Honey/ })
              .first()
              .click();
          }
          await p
            .getByRole('button', { name: 'Continue', exact: true })
            .click();
          await p.getByLabel('Required points', { exact: true }).fill('2200');
          await p
            .getByRole('button', { name: 'Continue', exact: true })
            .click();
          await p
            .getByRole('button', { name: 'Publish reward', exact: true })
            .click();
          await p.waitForURL('**/vendor/loyalty/rewards');
          await p.getByText(name!, { exact: true }).waitFor();
          console.log('Created through wizard: ' + name);
        }
        await vendor.close();
      },
    );
    await check(
      'Dashboard reward choice is preselected in the vendor cart and persists after reload',
      async () => {
        await page.goto(central + '/account/loyalty');
        await page
          .locator('astro-island[component-url*="CustomerLoyalty"]')
          .evaluate(async (e) => {
            while (e.hasAttribute('ssr'))
              await new Promise((r) => setTimeout(r, 20));
          });
        await page
          .getByRole('button', { name: 'Redeem Hill Country Honey rewards' })
          .click();
        await page
          .getByRole('dialog')
          .getByRole('button', { name: 'Redeem', exact: true })
          .first()
          .click();
        const choice = new URL(
          (await page
            .getByRole('link', { name: 'Continue to vendor cart' })
            .getAttribute('href'))!,
        );
        const vendorOrigin = choice.origin;
        await page.goto(vendorOrigin + '/account/login');
        await page.waitForURL(vendorOrigin + '/account');
        await page.goto(choice.href);
        await page
          .locator('astro-island[component-export="VendorCart"]')
          .evaluate(async (e) => {
            while (e.hasAttribute('ssr'))
              await new Promise((r) => setTimeout(r, 20));
          });
        await page.goto(vendorOrigin + '/products');
        await page
          .getByRole('link', { name: 'Raw Honey', exact: true })
          .click();
        await page
          .locator('astro-island[component-export="ProductPurchase"]')
          .evaluate(async (e) => {
            while (e.hasAttribute('ssr'))
              await new Promise((r) => setTimeout(r, 20));
          });
        await page.getByLabel('Quantity', { exact: true }).fill('2');
        await page
          .getByRole('button', { name: 'Add to cart', exact: true })
          .click();
        await page
          .getByRole('status')
          .filter({ hasText: 'Added to your cart.' })
          .waitFor();
        await page.goto(vendorOrigin + '/cart');
        const modal = page.getByRole('dialog');
        await modal.waitFor();
        assert.equal(
          await modal
            .locator(`input[value="${choice.searchParams.get('loyalty')}"]`)
            .isChecked(),
          true,
        );
        await page
          .getByRole('button', { name: 'Apply to this order', exact: true })
          .click();
        await modal.waitFor({ state: 'hidden' });
        await page.reload();
        await page.getByText(/\$2 off honey applied/).waitFor();
        assert.match(
          await page.locator('.cart-totals').innerText(),
          /\$18\.00/,
        );
        const rewards = page.getByRole('group', {
          name: 'Hill Country Honey checkout rewards',
        });
        await rewards
          .getByRole('button', { name: 'Use Rewards', exact: true })
          .click();
        await page
          .getByRole('dialog')
          .getByRole('radio', { name: /Browser fixed reward/ })
          .check();
        await page
          .getByRole('button', { name: 'Apply to this order', exact: true })
          .click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.match(
          await page.locator('.cart-totals').innerText(),
          /\$17\.25/,
        );
        await rewards
          .getByRole('button', { name: 'Use Rewards', exact: true })
          .click();
        await page
          .getByRole('dialog')
          .getByRole('radio', {
            name: 'Save my points, use no reward',
            exact: true,
          })
          .check();
        await page
          .getByRole('button', { name: 'Remove reward', exact: true })
          .click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.match(
          await page.locator('.cart-totals').innerText(),
          /\$20\.00/,
        );
        await rewards
          .getByRole('button', { name: 'Use Rewards', exact: true })
          .click();
        await page
          .getByRole('dialog')
          .getByRole('radio', { name: /\$2 off honey/ })
          .check();
        await page
          .getByRole('button', { name: 'Apply to this order', exact: true })
          .click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.match(
          await page.locator('.cart-totals').innerText(),
          /\$18\.00/,
        );
      },
    );
    await check(
      'Disposable cancellation releases an actual reserved reward',
      async () => {
        const response = await fetch(ready.controlUrl + '/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-loyalty-demo-key': ready.controlKey,
          },
          body: JSON.stringify({ vendor: 0 }),
        });
        const result = await response.json();
        assert.equal(response.ok, true, JSON.stringify(result));
        assert.equal(result.state, 'RELEASED');
        assert.ok(result.held.reserved > 0);
        assert.deepEqual(result.after, result.before);
      },
    );
    assert.deepEqual(errors, []);
    console.log(
      `Loyalty browser: ${passed} groups passed. No screenshots or traces captured.`,
    );
    await context.close();
  } finally {
    await browser.close();
  }
}
