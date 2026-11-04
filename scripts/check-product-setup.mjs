import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Local UI qualification only. The browser cannot reach an API or an external host.
const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/product-setup-check-'),
);
const output = path.join(root, 'test-results/product-setup');
await mkdir(output, { recursive: true });
await writeFile(
  path.join(temporary, 'preview.jsx'),
  `
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import { AdminShell } from '../AdminShell';
import { fixtureContexts } from '../FixtureAdmin';
import { createFixtureVendorService } from '../vendor/fixture';
const service = createFixtureVendorService(fixtureContexts.VENDOR);
const category = {id:'fruit',code:'fruit',name:'Fruit',active:true,parentId:null,assignable:true,children:[]};
service.taxonomy = { hierarchy:async()=>[{id:'produce',code:'produce',name:'Produce',active:true,parentId:null,assignable:false,children:[category]}], tags:async()=>[], classification:async()=>({primaryCategory:category,categoryPath:[category],tags:[]}) };
service.categories = {images:async()=>[]};
window.setupService = service;
createRoot(document.getElementById('root')).render(<AdminShell context={fixtureContexts.VENDOR} vendorService={service} onLogout={()=>{}} />);
`,
);
let browser;
let page;
try {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(message.text());
  });
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
  const button = (name) => page.getByRole('button', { name, exact: true });
  const fillVariant = async (name, price) => {
    await page.getByLabel('Variant name', { exact: true }).fill(name);
    await page.getByLabel('SKU', { exact: true }).fill('JUICE-' + name);
    await page.getByLabel('Price', { exact: true }).fill(price);
  };
  for (const width of [1600, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://127.0.0.1:4322/vendor/products/new');
    await button('Next').waitFor();
    assert.equal(await button('Next').isEnabled(), false);
    await button('About Create product').focus();
    await page.getByRole('tooltip').waitFor();
    assert.match(
      await page.getByRole('tooltip').textContent(),
      /next step will allow you to add variants and prices/,
    );
    await page.getByLabel('Product name', { exact: true }).fill('Apple juice');
    assert.equal(
      await page.getByLabel('Slug', { exact: true }).inputValue(),
      'apple-juice',
    );
    assert.equal(await button('Next').isEnabled(), false);
    await button('Choose category').click();
    const pickerColor = await page
      .locator('.product-category-dialog')
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--brand-primary').trim(),
      );
    const dashboardColor = await button('Choose category').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--brand-primary').trim(),
    );
    assert.equal(
      pickerColor,
      dashboardColor,
      'Category portal must retain dashboard colors',
    );
    await page.locator('.product-category-card > summary').click();
    assert.equal(
      await page.locator('.product-category-card > summary svg').count(),
      1,
    );

    await page.getByRole('radio', { name: 'Fruit', exact: true }).click();
    await page.waitForFunction(
      () => !document.querySelector('.product-next-button').disabled,
    );
    assert.equal(
      await button('Next').evaluate(
        (element) => getComputedStyle(element).animationName,
      ),
      'product-next-pulse',
    );
    await button('Next').click();
    await page.waitForURL('**/setup/variants/new');
    const productId = new URL(page.url()).pathname.split('/')[3];
    assert.equal(
      await page.evaluate(
        async (id) => (await window.setupService.product(id)).enabled,
        productId,
      ),
      false,
    );
    await button('About Add variant').focus();
    await page.getByRole('tooltip').waitFor();
    assert.match(
      await page.getByRole('tooltip').textContent(),
      /Each variant has its own SKU/,
    );
    await fillVariant('Small', '5.25');
    // Rejecting either the page arrow or actual browser Back preserves the form.
    let confirmations = 0;
    const dismiss = async (dialog) => {
      confirmations++;
      await dialog.dismiss();
    };
    page.on('dialog', dismiss);
    await page
      .getByRole('link', { name: 'Back to product', exact: true })
      .click();
    assert.equal(
      await page.getByLabel('Variant name', { exact: true }).inputValue(),
      'Small',
    );
    await page.goBack();
    await page.waitForURL('**/setup/variants/new');
    assert.equal(
      await page.getByLabel('Variant name', { exact: true }).inputValue(),
      'Small',
    );
    assert.equal(confirmations, 2);
    // The browser's built-in reload notification is also cancellable.
    const reloaded = page.waitForEvent('dialog');
    await page.evaluate(() => {
      setTimeout(() => location.reload(), 0);
    });
    const reloadDialog = await reloaded;
    assert.equal(reloadDialog.type(), 'beforeunload');
    await page.getByLabel('Variant name', { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel('Variant name', { exact: true }).inputValue(),
      'Small',
    );
    page.off('dialog', dismiss);
    await button('Additional variant').click();
    await page.waitForFunction(
      () => document.querySelector('[name="variant-name"]')?.value === '',
    );
    const first = await page.evaluate(
      async (id) => (await window.setupService.product(id)).variants[0],
      productId,
    );
    assert.equal(first.name, 'Small');
    assert.equal(
      await page.getByLabel('Description', { exact: true }).inputValue(),
      '',
    );
    await fillVariant('Large', '9.00');
    await button('Publish product').click();
    await page.waitForURL('**/setup/preview?variant=*');
    await page
      .getByRole('region', { name: 'Harvest product preview' })
      .waitFor();
    assert.equal(
      await page
        .getByLabel('Product option', { exact: true })
        .locator('option:checked')
        .textContent(),
      'Large',
    );
    assert.equal(
      await page.evaluate(
        async (id) => (await window.setupService.product(id)).enabled,
        productId,
      ),
      false,
    );
    await page
      .getByLabel('Product option', { exact: true })
      .selectOption(first.id);
    await button('Edit Small').waitFor();
    await button('Edit Small').click();
    await page.waitForURL('**/setup/variants/' + first.id);
    await page.getByLabel('Price', { exact: true }).fill('6.00');
    await button('Save and preview').click();
    await page.waitForURL('**/setup/preview?variant=' + first.id);
    await page.getByText('$6.00', { exact: true }).waitFor();
    assert.equal(await button('Add to cart').isEnabled(), false);
    assert.equal(
      await page
        .locator(
          '.product-harvest-preview header, .product-harvest-preview footer',
        )
        .count(),
      0,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: path.join(output, 'preview-' + width + '.png'),
      fullPage: true,
    });
    await button('Edit Product').click();
    await page.waitForURL('**/setup?variant=' + first.id);
    await page.getByText('Product details', { exact: true }).click();
    await page
      .getByLabel('Product name', { exact: true })
      .fill('Fresh apple juice');
    await button('Save and preview').click();
    await page.waitForURL('**/setup/preview?variant=' + first.id);
    await page
      .getByRole('heading', { name: 'Fresh apple juice', exact: true })
      .waitFor();
    await button('Publish').click();
    await page.waitForURL('**/products/' + productId);
    await page.locator('.product-variant-actions').first().waitFor();
    const actions = page.locator('.product-variant-actions').first();
    const panelWidth = await page
      .locator('.product-editor-variants')
      .evaluate((element) => element.getBoundingClientRect().width);
    assert.equal(
      await actions
        .locator('.product-variant-action-compact')
        .first()
        .isVisible(),
      panelWidth <= 720,
    );
    assert.equal(
      await actions.locator('.product-variant-action-full').first().isVisible(),
      panelWidth > 720,
    );
    const actionButtons = await actions.locator('button').all();
    if (actionButtons.length === 2 && panelWidth > 360) {
      const [edit, stock] = await Promise.all(
        actionButtons.map((button) => button.boundingBox()),
      );
      assert.ok(
        Math.abs(edit.y - stock.y) < 2,
        'Variant actions should remain on one line',
      );
    }
    assert.equal(
      await page.evaluate(
        async (id) => (await window.setupService.product(id)).enabled,
        productId,
      ),
      true,
    );
    console.log(
      'PASS product setup, native leave guards, variant preview, editing, final publication and layout at ' +
        width +
        'px',
    );
  }
  assert.deepEqual(errors, []);
} catch (error) {
  if (page) {
    console.error('Failed at ' + page.url());
    console.error((await page.locator('body').innerText()).slice(0, 2200));
    await page.screenshot({
      path: path.join(output, 'failure.png'),
      fullPage: true,
    });
  }
  throw error;
} finally {
  await browser?.close();
  assert.equal(path.dirname(temporary), path.join(root, 'apps/admin/src'));
  await rm(temporary, { recursive: true, force: true });
}
