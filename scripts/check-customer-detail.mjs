import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// In-memory UI fixtures only. Backend and external traffic are blocked.
const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/customer-detail-check-'),
);
await writeFile(
  path.join(temporary, 'preview.jsx'),
  `
import React from 'react';
import {createRoot} from 'react-dom/client';
import '@market/ui/styles.css';
import {AdminShell} from '../AdminShell';
import {fixtureContexts} from '../FixtureAdmin';
import {createFixtureVendorService} from '../vendor/fixture';
const context=fixtureContexts.VENDOR;
const service=createFixtureVendorService(context);
createRoot(document.getElementById('root')).render(<AdminShell context={context} vendorService={service} onLogout={()=>{}} />);
`,
);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ timezoneId: 'America/Chicago' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      /(?:admin|shop)-api/.test(url.pathname)
    )
      return route.abort();
    if (
      route.request().resourceType() === 'document' &&
      url.pathname.startsWith('/vendor/')
    )
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html lang="en"><head><title>Customer preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/${path.basename(temporary)}/preview.jsx"></script></body></html>`,
      });
    return route.continue();
  });
  const output = path.join(root, '.tmp/customer-detail-preview');
  await mkdir(output, { recursive: true });
  for (const width of [1800, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('http://127.0.0.1:4322/vendor/customers/1201');
    await page
      .getByRole('table', { name: 'Vendor orders', exact: true })
      .waitFor()
      .catch(async (error) => {
        console.log(errors, await page.locator('body').innerText());
        throw error;
      });
    assert.equal(
      await page.locator('main h1').innerText(),
      'Synthetic A Customer 1',
    );
    assert.equal(
      await page.locator('.orders-table-panel tbody tr').count(),
      20,
    );
    assert.equal(await page.locator('.orders-summary').count(), 0);
    assert.equal(
      await page.getByText('Preferred channel', { exact: true }).count(),
      0,
    );
    assert.equal(
      await page
        .getByRole('link', { name: /Edit Customer|View Purchase History/ })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByText('Favorite item', { exact: true })
        .locator('..')
        .locator('dd')
        .innerText(),
      'Synthetic A Variant 1',
    );
    assert.equal(
      await page
        .getByRole('link', { name: 'Open order 1401', exact: true })
        .getAttribute('href'),
      '/vendor/orders/1401',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.equal(
      await page
        .locator('.orders-table-panel thead th')
        .first()
        .evaluate((element) => getComputedStyle(element).whiteSpace),
      'nowrap',
    );
    const violations = (
      await new AxeBuilder({ page }).include('main').analyze()
    ).violations;
    assert.deepEqual(
      violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((node) => node.target),
      })),
      [],
    );
    await page.screenshot({
      path: path.join(output, `${width}.png`),
      fullPage: true,
    });
    console.log(
      `PASS customer layout, accessibility, overflow and order links at ${width}px`,
    );
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.locator('.orders-table-panel tbody tr').count(), 2);
  await page.getByLabel('Search', { exact: true }).fill('1401');
  assert.equal(await page.locator('.orders-table-panel tbody tr').count(), 1);
  await page
    .getByRole('link', { name: 'Open order 1401', exact: true })
    .click();
  await page
    .getByRole('table', { name: 'Operational order lines', exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).pathname, '/vendor/orders/1401');
  assert.deepEqual(errors, []);
  console.log(
    'PASS customer pagination, search and existing order detail navigation',
  );
} finally {
  await browser?.close();
  const resolved = path.resolve(temporary);
  assert.equal(path.dirname(resolved), path.join(root, 'apps/admin/src'));
  await rm(resolved, { recursive: true, force: true });
}
