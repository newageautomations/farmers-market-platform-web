import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Fixture-only qualification; no backend or external request can reach a service.
const temporary = await mkdtemp(
  path.join(process.cwd(), 'apps/admin/src/order-check-'),
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
const context = {...fixtureContexts.VENDOR,permissions:[...fixtureContexts.VENDOR.permissions,'ReadOwnVendorFinance','RequestOwnVendorRefund']};
const service = createFixtureVendorService(context);
if(new URLSearchParams(location.search).has('sale')) {
  const read=service.order;
  service.order=async id=>{const view=await read(id);return {...view,context:null,portion:{...view.portion,kind:'IN_PERSON'}}};
  const sale={id:'sale',draftId:'draft',orderId:'1401',orderCode:'MB-20481A9',orderState:'Delivered',state:'COMPLETED',method:'CASH',evidenceType:'CASHIER_ATTESTED_CASH',vendor:'Test Bakery',amount:866,currency:'USD',tendered:1000,changeDue:134,confirmedAt:'2026-11-02T17:00:00Z',completedAt:'2026-11-02T17:00:01Z',context:{kind:'INDEPENDENT',label:'Independent Sale',marketId:null,occurrenceId:null},customer:'Walk-in customer',invitationState:'PENDING',items:[{id:'line',variantId:'1101',name:'Sourdough loaf',quantity:1,unitPrice:800,lineTotal:866,lineTax:66,lineDiscount:0,tax:[],discounts:[]}],subtotal:800,discount:0,tax:66,cashierId:'CASHIER-REF',financialStatus:'PARTIALLY_REFUNDED',timezone:'America/Chicago',canRecordRefund:true,units:[{id:'unit',lineId:'line',amount:866,reserved:false}],refunds:[{id:'refund',amount:100,state:'SETTLED',reason:'Partial return',createdAt:'2026-11-02T18:00:00Z'}]};
  service.pos={orderPayment:async()=>sale};
}
createRoot(document.getElementById('root')).render(<AdminShell context={context} vendorService={service} onLogout={()=>{}} />);
`,
);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
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
      url.pathname.startsWith('/vendor/') &&
      route.request().resourceType() === 'document'
    )
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/${path.basename(temporary)}/preview.jsx"></script></body></html>`,
      });
    return route.continue();
  });
  for (const width of [1600, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('http://127.0.0.1:4322/vendor/orders/1401');
    await page
      .getByRole('table', { name: 'Operational order lines', exact: true })
      .waitFor();
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(
      await page.getByRole('progressbar').getAttribute('value'),
      '40',
    );
    assert.equal(
      await page
        .getByRole('button', { name: /Print receipt|Update order/i })
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
        .locator('.order-panel > h2')
        .evaluateAll((elements) =>
          elements.every(
            (element) => getComputedStyle(element).textTransform === 'none',
          ),
        ),
      true,
    );
    const violations = (
      await new AxeBuilder({ page }).include('main').analyze()
    ).violations;
    assert.deepEqual(
      violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((n) => n.target),
      })),
      [],
    );
    const layout = await page
      .locator('.order-columns')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    console.log(
      `PASS order layout, status, native tables, accessibility and overflow at ${width}px: ${layout}`,
    );
    if (width === 1600) {
      await page
        .getByText('Manage Synthetic A Variant 1', { exact: true })
        .click();
      await page.getByRole('button', { name: 'Cancel fulfillment' }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirm change' })
        .click();
      await page.waitForFunction(
        () => document.querySelector('progress')?.value === 0,
      );
      await page
        .getByText('Manage Synthetic A Variant 1', { exact: true })
        .click();
      await page.getByLabel('Quantity to fulfill').fill('1');
      await page.getByRole('button', { name: 'Fulfill', exact: true }).click();
      await page.waitForFunction(
        () => document.querySelector('progress')?.value === 20,
      );
      console.log(
        'PASS fulfillment confirmation, mixed-line restriction and quantity refresh',
      );
    }
  }
  for (const width of [1600, 768, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('http://127.0.0.1:4322/vendor/orders/1401?sale');
    await page.getByRole('heading', { name: 'Order #MB-20481A9' }).waitFor();
    assert.equal(
      await page
        .getByRole('heading', { name: 'Order items', exact: true })
        .count(),
      1,
    );
    assert.equal(
      await page.getByText('Total paid', { exact: true }).count(),
      2,
    );
    assert.equal(
      await page.getByRole('button', { name: 'Record Refund' }).count(),
      1,
    );
    assert.equal(
      await page
        .getByText('Manage Synthetic A Variant 1', { exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    assert.deepEqual(
      (await new AxeBuilder({ page }).include('main').analyze()).violations.map(
        (v) => v.id,
      ),
      [],
    );
    await page.getByRole('button', { name: 'Refund Details' }).click();
    await page.getByRole('dialog', { name: 'Refund Details' }).waitFor();
    console.log(
      `PASS in-person receipt, payment actions, refund details, accessibility and overflow at ${width}px`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  assert.equal(
    path.dirname(temporary),
    path.join(process.cwd(), 'apps/admin/src'),
  );
  await rm(temporary, { recursive: true, force: true });
}
