/** Local browser qualification. Explicit synthetic data; no production backend or external services. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';
const root = process.cwd(),
  evidence = resolve(root, 'docs/evidence/phase15b');
mkdirSync(evidence, { recursive: true });
process.env.FRONTEND_FIXTURE_MODE = 'true';
process.chdir(resolve(root, 'apps/admin'));
const server = await createServer({
  server: { host: '127.0.0.1', port: 4336, strictPort: true },
  plugins: [
    {
      name: 'phase15b-qualification',
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (
            !req.url?.startsWith('/market') ||
            !req.headers.accept?.includes('text/html')
          )
            return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Phase 15B qualification</title></head><body><div id="root"></div><script type="module" src="/@fs/' +
              resolve(root, 'tests/fixtures/phase15b-preview.tsx').replaceAll(
                '\\',
                '/',
              ) +
              '"></script></body></html>',
          );
        });
      },
    },
  ],
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4336/market/assignments/1');
  await page.getByLabel('Search Vendor or booth').waitFor();
  const booth = page.locator('[data-element="booth-1"]');
  await booth.hover();
  const tooltip = page.getByRole('tooltip');
  await tooltip.waitFor();
  assert.match(await tooltip.innerText(), /12 × 10 ft/);
  assert.match(await tooltip.innerText(), /electricity/);
  assert.ok(!(await tooltip.innerText()).includes('water'));
  const viewport = await page.locator('.ops-map-viewport').boundingBox(),
    card = await tooltip.boundingBox();
  assert.ok(
    viewport &&
      card &&
      card.x >= viewport.x &&
      card.y >= viewport.y &&
      card.x + card.width <= viewport.x + viewport.width + 1 &&
      card.y + card.height <= viewport.y + viewport.height + 1,
  );
  await page.screenshot({ path: resolve(evidence, 'booth-hover-1440.png') });
  await booth.click();
  const dialog = page.getByRole('dialog', { name: 'Booth A1' });
  await dialog.waitFor();
  await dialog.getByLabel('Business for selected booth').selectOption('2');
  await dialog
    .getByRole('button', { name: 'Approve business for this date' })
    .click();
  await dialog
    .getByRole('button', { name: 'Confirm booth and accepted rentals' })
    .waitFor();
  assert.deepEqual(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
    [],
  );
  await page.screenshot({
    path: resolve(evidence, 'booth-assignment-modal-1440.png'),
  });
  await dialog
    .getByRole('button', { name: 'Confirm booth and accepted rentals' })
    .click();
  await dialog
    .getByText('Assigned to River Bakery.', { exact: false })
    .waitFor();
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  const row = page.locator('.booth-list-item').filter({
    has: page.locator('summary span').filter({ hasText: /^A1$/ }),
  });
  assert.equal(await row.getAttribute('open'), null);
  assert.equal(await row.locator('summary').innerText(), 'A1\nAssigned');
  await row.locator('summary').click();
  await row.getByText('River Bakery', { exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await row.locator('summary').click();
  const paid = page.locator('.booth-list-item').filter({
    has: page.locator('summary span').filter({ hasText: /^A2$/ }),
  });
  assert.match(await paid.locator('summary').innerText(), /Paid/);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(
      (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
      [],
    );
    await page.screenshot({
      path: resolve(evidence, `booths-${width}.png`),
      fullPage: true,
    });
  }
  await paid.locator('summary').click();
  await paid
    .getByRole('button', { name: 'Manage business assignment' })
    .click();
  const paidDialog = page.getByRole('dialog', { name: 'Booth A2' });
  await paidDialog.waitFor();
  assert.equal(
    await paidDialog.getByLabel('Business for selected booth').isDisabled(),
    true,
  );
  assert.equal(
    await paidDialog
      .getByRole('button', { name: 'Save booth and rental changes' })
      .isDisabled(),
    true,
  );
  await page.screenshot({
    path: resolve(evidence, 'booth-paid-modal-390.png'),
  });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4336/market');
  const refresh = page.getByRole('button', {
    name: 'Refresh overview',
    exact: true,
  });
  await refresh.waitFor();
  await page.mouse.move(0, 0);
  const before = await refresh.evaluate(
    (b) => getComputedStyle(b).backgroundColor,
  );
  await refresh.hover();
  await page.waitForTimeout(220);
  assert.notEqual(
    await refresh.evaluate((b) => getComputedStyle(b).backgroundColor),
    before,
  );
  await page.screenshot({
    path: resolve(evidence, 'overview-cards-1440.png'),
    fullPage: true,
  });
  assert.equal(
    await page.locator('.admin-sidebar .nav-parent > button').count(),
    0,
  );
  assert.ok(
    (await page.locator('.admin-sidebar .navigation-icon').count()) > 10,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS Phase 15B browser qualification: hover details, modal approval/assignment, collapsed status rows, paid safeguards, responsive layout, accessibility, navigation, and button hover.',
  );
} finally {
  await browser?.close();
  await server.close();
}
