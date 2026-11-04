import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// In-memory UI fixtures only. All backend and external traffic is blocked.
const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/orders-check-'),
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
const context={...fixtureContexts.VENDOR,permissions:[...fixtureContexts.VENDOR.permissions,'OperateOwnPos','ReadOwnVendorFinance']};
const service=createFixtureVendorService(context);
const original=service.orders;
service.orders=async(skip,kind)=>{const result=await original(skip,kind);return {...result,items:result.items.map((order)=>({...order,portion:{...order.portion,kind:order.portion.operationalOrderId==='1402'?'IN_PERSON':order.portion.kind}}))};};
service.pos={orderPayment:async(id)=>({orderId:id,orderCode:'MB-20481A9',cashierId:'REF-CLRK-883104',customer:'Sarah Mitchell',vendor:'Riverside Bakery',state:'COMPLETED',financialStatus:'PAID',amount:3464,currency:'USD',completedAt:new Date().toISOString(),context:{kind:'INDEPENDENT',marketId:null,occurrenceId:null,label:'Independent Sale'}})};
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
  page.on('console', (message) => {
    if (message.type() === 'error') console.log(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400)
      console.log(response.status(), response.url());
  });
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
        body: `<!doctype html><html lang="en"><head><title>Orders preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/${path.basename(temporary)}/preview.jsx"></script></body></html>`,
      });
    return route.continue();
  });
  const output = path.join(root, '.tmp/orders-preview');
  await mkdir(output, { recursive: true });
  for (const width of [1800, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('http://127.0.0.1:4322/vendor/orders');
    await page
      .getByRole('table', { name: 'Vendor orders', exact: true })
      .waitFor({ timeout: 15000 })
      .catch(async (error) => {
        console.log(errors, await page.locator('body').innerText());
        throw error;
      });
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(
      await page
        .getByRole('columnheader', { name: 'Context', exact: true })
        .count(),
      0,
    );
    assert.equal(await page.locator('.orders-table-panel.card').count(), 0);
    const available = await page
      .locator('.orders-page')
      .evaluate((element) => element.getBoundingClientRect().width);
    assert.equal(
      await page
        .getByRole('columnheader', { name: 'Created', exact: true })
        .isVisible(),
      available > 1150,
    );
    assert.equal(
      await page
        .getByRole('columnheader', { name: 'Pickup Status', exact: true })
        .isVisible(),
      available > 950,
    );
    assert.equal(
      await page
        .locator('.orders-customer svg, .orders-customer .farmstand-icon')
        .count(),
      0,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    assert.equal(
      await page
        .locator('.orders-table-panel tbody td')
        .evaluateAll((cells) =>
          cells.every((cell) =>
            [...cell.children].every(
              (child) =>
                child.getBoundingClientRect().right <=
                cell.getBoundingClientRect().right + 1,
            ),
          ),
        ),
      true,
      'Table contents must stay within their own columns',
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
    console.log(`PASS orders layout, accessibility and overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 1280, height: 1050 });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.locator('.orders-table-panel tbody tr').count(), 3);
  // Short final pages can hit the document's maximum scroll before reaching y=0.
  assert.ok(
    await page
      .locator('.orders-table-panel .table-scroll')
      .evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top >= -1 && bounds.bottom <= window.innerHeight;
      }),
  );
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  assert.equal(await page.locator('.orders-table-panel tbody tr').count(), 20);
  await page.waitForFunction(
    () =>
      Math.abs(
        document
          .querySelector('.orders-table-panel .table-scroll')
          .getBoundingClientRect().top,
      ) <= 1,
  );
  assert.ok(
    Math.abs(
      await page
        .locator('.orders-table-panel .table-scroll')
        .evaluate((element) => element.getBoundingClientRect().top),
    ) <= 1,
  );
  await page.getByLabel('Search', { exact: true }).fill('REF-CLRK-883104');
  assert.equal(await page.locator('.orders-table-panel tbody tr').count(), 1);
  assert.equal(
    await page.getByRole('link', { name: 'Open order MB-20481A9' }).count(),
    1,
  );
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Orders' }).click();
  const download = await downloadEvent;
  assert.match(download.suggestedFilename(), /^orders-\d{4}-\d{2}-\d{2}\.csv$/);
  await page.getByLabel('Search', { exact: true }).fill('');
  for (const days of ['7', '14', '30', '60']) {
    await page.getByLabel('Date Range', { exact: true }).selectOption(days);
    assert.equal(
      await page.getByLabel('Date Range', { exact: true }).inputValue(),
      days,
    );
  }
  await page.getByLabel('Date Range', { exact: true }).selectOption('custom');
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  const dates = dialog.locator('.orders-calendar tbody button');
  await dates.nth(4).click();
  assert.equal(await dates.first().isDisabled(), true);
  await dates.nth(8).click();
  const violations = (
    await new AxeBuilder({ page }).include('dialog').analyze()
  ).violations;
  assert.deepEqual(
    violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((node) => node.target),
    })),
    [],
  );
  await page.screenshot({
    path: path.join(output, 'calendar-1280.png'),
    fullPage: true,
  });
  await dialog.getByRole('button', { name: 'Apply date range' }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.equal(
    await page.getByLabel('Date Range', { exact: true }).inputValue(),
    'custom',
  );
  await page.getByRole('button', { name: 'Edit custom date range' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.getByLabel('Date Range', { exact: true }).selectOption('all');
  await page
    .getByRole('button', { name: 'Edit custom date range' })
    .waitFor({ state: 'detached' });
  assert.equal(
    await page.getByRole('link', { name: 'Create Sale' }).getAttribute('href'),
    '/vendor/pos',
  );
  await page
    .locator('.orders-table-panel tbody tr')
    .first()
    .locator('td')
    .first()
    .click();
  await page
    .getByRole('table', { name: 'Operational order lines', exact: true })
    .waitFor();
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS cashier search, CSV download, presets, calendar range, Escape dismissal and order navigation',
  );
} finally {
  await browser?.close();
  assert.equal(path.dirname(temporary), path.join(root, 'apps/admin/src'));
  await rm(temporary, { recursive: true, force: true });
}
