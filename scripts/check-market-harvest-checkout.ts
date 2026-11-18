import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

// Local fixture only. All Shop and Stripe responses are simulated; no DB/provider writes.
const server = await createServer({
  configFile: false,
  server: { host: '127.0.0.1', port: 0 },
  appType: 'custom',
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      'react',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      'graphql',
      'konva',
      'libphonenumber-js/max',
      'react-konva',
      'zod',
    ],
  },
});
server.middlewares.use((request, response, next) => {
  if (request.url?.split('?')[0] !== '/') return next();
  response.setHeader('Content-Type', 'text/html');
  response.end(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/market-harvest-checkout-preview.tsx"></script></body></html>',
  );
});
await server.listen();
const address = server.httpServer!.address();
if (!address || typeof address === 'string')
  throw new Error('Local fixture unavailable');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({
  headless: true,
  channel: existsSync(chromium.executablePath()) ? undefined : 'msedge',
});
try {
  await mkdir('docs/evidence/market-harvest-checkout', { recursive: true });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/fixture-product.svg')
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ddc29a"/><ellipse cx="32" cy="34" rx="26" ry="19" fill="#a87339"/></svg>',
      });
    if (url.pathname !== '/api/shop') return route.continue();
    const { action } = route.request().postDataJSON();
    const status = {
      groupId: '1',
      orderId: '9',
      state:
        action === 'stripe-checkout-start' ||
        action === 'stripe-checkout-advance'
          ? 'VERIFYING'
          : 'SETUP_REQUIRED',
      setupSecret: 'fixture',
      publishableKey: 'fixture',
      charges: [{ vendorId: '1', amount: 2400, currency: 'USD' }],
    };
    const result =
      action === 'checkout-pickup'
        ? [
            {
              vendorId: '1',
              methodId: '2',
              name: 'Market pickup',
              price: 0,
              currencyCode: 'USD',
            },
          ]
        : action.startsWith('stripe-')
          ? status
          : action === 'checkout-status'
            ? {
                orderId: '9',
                currency: 'USD',
                total: 2400,
                subtotal: 2400,
                shipping: 0,
                discounts: [],
                taxes: [],
                groups: [
                  {
                    vendorId: '1',
                    vendorName: 'Manna Roots',
                    lines: [
                      {
                        id: '10',
                        name: 'Fresh sourdough',
                        quantity: 2,
                        total: 2400,
                      },
                    ],
                    pickup: [{ name: 'Market pickup', fee: 0 }],
                  },
                ],
                contact: {
                  firstName: 'Ada',
                  lastName: 'Smith',
                  emailAddress: 'ada@example.test',
                  phoneNumber: '+12105550123',
                },
                pickupPromise: {
                  venue: '100 Main Street, Boerne, TX',
                  startsAt: '2026-11-14T15:00:00Z',
                },
                availability: { state: 'AVAILABLE', mode: 'LOCAL' },
                paymentStatus: 'NOT_STARTED',
              }
            : {};
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ result }),
    });
  });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/?mode=cart`);
    await page
      .getByRole('heading', { name: 'Your Cart', exact: true })
      .waitFor();
    assert.equal(await page.locator('[data-vendor-group]').count(), 2);
    assert.equal(await page.locator('.vendor-cart-layout').count(), 1);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'Cart must fit the viewport',
    );
    const cartOffsets = await page
      .locator('.vendor-cart-summary dl > div')
      .evaluateAll((rows) =>
        rows.map((row) => {
          const label = row.querySelector('dt')!.getBoundingClientRect();
          const value = row.querySelector('dd')!.getBoundingClientRect();
          return Math.abs(
            label.y + label.height / 2 - value.y - value.height / 2,
          );
        }),
      );
    assert(
      cartOffsets.every((offset) => offset === 0),
      'Cart facts must be centered',
    );
    await page.screenshot({
      path: `docs/evidence/market-harvest-checkout/cart-${width}.png`,
      fullPage: true,
    });
    await page.goto(origin);
    await page.getByRole('heading', { name: 'Contact information' }).waitFor();
    assert.equal(await page.locator('.vendor-checkout-layout').count(), 1);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'Checkout must fit the viewport',
    );
    await page.screenshot({
      path: `docs/evidence/market-harvest-checkout/contact-${width}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Continue to pickup' }).click();
    await page.getByRole('radio').first().waitFor();
    assert.equal(
      await page
        .getByRole('button', { name: 'Confirmation', exact: true })
        .count(),
      0,
    );
    assert(
      await page
        .getByText('100 Main Street, Boerne, TX', { exact: true })
        .first()
        .isVisible(),
    );
    const centers = await page.locator('.pickup-choice').evaluate((element) => {
      const input = element.querySelector('input')!.getBoundingClientRect();
      const title = element.querySelector('span')!.getBoundingClientRect();
      return Math.abs(input.y + input.height / 2 - title.y - title.height / 2);
    });
    assert.equal(centers, 0, 'Pickup radio and title must be centered');
    await page.screenshot({
      path: `docs/evidence/market-harvest-checkout/pickup-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: 'Review order', exact: true })
      .click();
    const offsets = await page
      .locator('.checkout-totals > div')
      .evaluateAll((rows) =>
        rows.map((row) => {
          const label = row.querySelector('dt')!.getBoundingClientRect();
          const value = row.querySelector('dd')!.getBoundingClientRect();
          return Math.abs(
            label.y + label.height / 2 - value.y - value.height / 2,
          );
        }),
      );
    assert(
      offsets.every((offset) => offset === 0),
      'Checkout label/value centers must align',
    );
    assert.equal(
      await page.getByText('Pickup fees', { exact: true }).count(),
      0,
    );
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(
      await page.getByLabel('First name', { exact: true }).inputValue(),
      'Ada',
    );
    await page.goto(`${origin}/?mode=confirmation`);
    await page.getByRole('link', { name: 'Create a free account' }).waitFor();
    const contactDetails = page.getByRole('region', {
      name: 'Contact details',
    });
    assert((await contactDetails.innerText()).includes('ada@example.test'));
    const summary = page.getByRole('region', { name: 'Purchased items' });
    assert(!(await summary.innerText()).includes('ada@example.test'));
    assert(!(await summary.innerText()).includes('+12105550123'));
    const contactRows = await contactDetails
      .locator('dl > div')
      .evaluateAll((rows) =>
        rows.map((row) => {
          const label = row.querySelector('dt')!.getBoundingClientRect();
          const value = row.querySelector('dd')!.getBoundingClientRect();
          return Math.abs(
            label.y + label.height / 2 - value.y - value.height / 2,
          );
        }),
      );
    assert(
      contactRows.every((offset) => offset === 0),
      'Contact label/value centers must align',
    );
    if (width > 760) {
      const heading = await page
        .getByRole('heading', { name: 'Thank you for your order' })
        .boundingBox();
      const panel = await summary.boundingBox();
      assert.equal(
        panel!.y,
        heading!.y,
        'Products must align with the thank-you heading',
      );
    }
    assert.equal(
      await page.locator('.checkout-summary-product img').count(),
      1,
    );
    assert.equal(await page.getByRole('button', { name: /email/i }).count(), 0);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'Confirmation must fit the viewport',
    );
    await page.screenshot({
      path: `docs/evidence/market-harvest-checkout/confirmation-${width}.png`,
      fullPage: true,
    });
    await page.goto(`${origin}/?mode=payment`);
    await page.locator('.checkout-card-host').waitFor();
    assert.equal(await page.getByRole('checkbox').count(), 0);
    const padding = await page
      .locator('.checkout-card-host')
      .evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft));
    assert(padding >= 16, 'Secure card entry needs comfortable padding');
    await page.getByRole('button', { name: 'Complete purchase' }).click();
    await page.getByRole('dialog', { name: 'Processing your order' }).waitFor();
    await page.waitForFunction(() => {
      const dialog = document.querySelector('dialog[open]');
      return dialog && getComputedStyle(dialog).opacity === '1';
    });
    await page.screenshot({
      path: `docs/evidence/market-harvest-checkout/processing-${width}.png`,
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    'Market Harvest browser checks passed at 1280px and 390px. Screenshots in docs/evidence/market-harvest-checkout.',
  );
} finally {
  await browser.close();
  await server.close();
}
