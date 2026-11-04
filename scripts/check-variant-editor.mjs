import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// In-memory UI qualification. All API and external requests are blocked.
const temporary = await mkdtemp(
  path.join(process.cwd(), 'apps/admin/src/variant-check-'),
);
await writeFile(
  path.join(temporary, 'preview.jsx'),
  `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { emptyProductInformation } from '@market/api';
import '@market/ui/styles.css';
import { AdminShell } from '../AdminShell';
import { fixtureContexts } from '../FixtureAdmin';
import { createFixtureVendorService } from '../vendor/fixture';
const context = {...fixtureContexts.VENDOR,permissions:[...fixtureContexts.VENDOR.permissions,'ReadOwnVendorFinance']};
const service = createFixtureVendorService(context);
const info = emptyProductInformation(); info.ingredients.content = 'Apples';
await service.updateProduct('1001',{name:'Apple juice',slug:'apple-juice',description:'Fresh pressed juice',enabled:false,collectTaxes:true,taxOverride:8.25,productInformation:JSON.stringify(info)});
const product = service.product;
service.product = async id => { const p=await product(id);return {...p,variants:p.variants.map(v=>({...v,slug:v.slug??'original-'+v.id}))}; };
service.finance = {costs:async()=>[],setCost:async()=>{},createVariant:async(input,cost)=>service.createVariant(input)};
service.categories = {images:async()=>[]};
createRoot(document.getElementById('root')).render(<AdminShell context={context} vendorService={service} onLogout={()=>{}} />);
`,
);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
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
      url.pathname.startsWith('/vendor/products') &&
      route.request().resourceType() === 'document'
    )
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/${path.basename(temporary)}/preview.jsx"></script></body></html>`,
      });
    return route.continue();
  });
  for (const width of [1600, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://127.0.0.1:4322/vendor/products/1001');
    const productDetails = page.locator('details.product-details');
    await productDetails.waitFor();
    assert.equal(await productDetails.getAttribute('open'), null);
    assert.equal(
      await page.locator('details.product-information').getAttribute('open'),
      null,
    );
    assert.equal(
      await page.locator('details.product-details summary svg').count(),
      1,
    );
    await page
      .getByRole('button', { name: 'Add variant', exact: true })
      .click();
    await page.waitForURL('**/variants/new');
    await page.getByLabel('Variant name').waitFor({ state: 'attached' });
    assert.equal(
      await page.locator('details.product-details').getAttribute('open'),
      '',
    );
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(
      await page.getByText('Product organization', { exact: true }).count(),
      0,
    );
    assert.equal(
      await page.getByLabel('Description', { exact: true }).inputValue(),
      'Fresh pressed juice',
    );
    await page.getByLabel('Variant name').fill('12oz');
    assert.equal(
      await page.getByLabel('Variant slug', { exact: true }).inputValue(),
      '12oz',
    );
    assert.equal(
      await page.getByText('Slug /apple-juice/12oz', { exact: true }).count(),
      1,
    );
    await page.getByLabel('SKU', { exact: true }).fill('JUICE-12');
    await page.getByLabel('Price', { exact: true }).fill('5.25');
    await page.getByText('Product details', { exact: true }).click();
    await page
      .getByRole('button', { name: 'Add variant', exact: true })
      .click();
    await page.waitForURL(/\/variants\/(?!new$)[^/]+$/);
    assert.equal(
      await page.locator('details.product-details').getAttribute('open'),
      '',
    );
    assert.equal(
      await page.getByLabel('Variant slug', { exact: true }).inputValue(),
      '12oz',
    );
    assert.equal(
      await page.getByLabel('SKU', { exact: true }).inputValue(),
      'JUICE-12',
    );
    assert.equal(
      await page.getByLabel('Price', { exact: true }).inputValue(),
      '5.25',
    );
    await page.getByLabel('Variant name').fill('');
    await page.getByText('Product details', { exact: true }).click();
    await page
      .getByRole('button', { name: 'Save variant', exact: true })
      .click();
    assert.equal(
      await page.locator('details.product-details').getAttribute('open'),
      '',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    console.log(
      `PASS variant navigation, inherited content, collapsed-form submission, native validation and overflow at ${width}px`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  // The resolved target is the exact temporary directory created inside this project's src folder.
  assert.equal(
    path.dirname(temporary),
    path.join(process.cwd(), 'apps/admin/src'),
  );
  await rm(temporary, { recursive: true, force: true });
}
