// Local, isolated UI qualification. All API/external requests are blocked.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/rentals-check-'),
);
const output = path.join(root, '.tmp/rentals-preview');
await mkdir(output, { recursive: true });
await writeFile(
  path.join(temporary, 'preview.jsx'),
  `
import React from 'react';
import {createRoot} from 'react-dom/client';
import '@market/ui/styles.css';
import {AdminShell} from '../AdminShell';
import {createFixtureMarketService,marketFixtureContext} from '../market/fixture';
import {managerData} from '../../../../tests/fixtures/market-dashboard-data';
const context=marketFixtureContext();
context.permissions=[...context.permissions,'ReadOwnMarketApplications','ManageOwnMarketApplications','ReadOwnMarketAssignments','ManageMarketStorefront'];
const service=createFixtureMarketService(context);
const data=managerData();
const image={id:'81',name:'Table photograph',preview:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#e2e9da"/><rect x="20" y="56" width="120" height="14" rx="5" fill="#8d6247"/><path d="M36 70v58m88-58v58" stroke="#5b4c40" stroke-width="8"/></svg>')};
data.rentals[0].details={...data.rentals[0].details,description:'Six-foot folding table with a clean, sturdy surface.',imageAssetId:image.id,image:image.preview};
data.rentals[1].details.description='A 10 by 10 foot canopy for your market booth.';
data.rentals[3].details.enabled=false;
window.rentalCommands=[];
service.phase14={read:async()=>structuredClone(data),command:async(command)=>{
  window.rentalCommands.push(command);
  await new Promise(done=>setTimeout(done,250));
  const original=data.rentals.find(row=>row.id===command.id);
  const row={...(original??data.rentals[0]),id:original?.id??99,revision:(original?.revision??0)+1,details:command.data.details};
  if(original) data.rentals=data.rentals.map(item=>item.id===row.id?row:item); else data.rentals.push(row);
  return structuredClone(row);
}};
window.stockUploads=[];
service.rentalMedia={images:async()=>[image],upload:async(file)=>{window.stockUploads.push({type:file.type,size:file.size});return image;}};
createRoot(document.getElementById('root')).render(<AdminShell context={context} marketService={service} onLogout={()=>{}}/>);
`,
);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ timezoneId: 'America/Chicago' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  page.on('response', (response) => {
    if (response.status() >= 400)
      console.error(response.status(), response.url());
  });
  page.on('requestfailed', (request) =>
    console.error(request.failure()?.errorText, request.url()),
  );
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      /(?:admin|shop)-api/.test(url.pathname)
    )
      return route.abort();
    if (
      route.request().resourceType() === 'document' &&
      url.pathname.startsWith('/market/')
    )
      return route.fulfill({
        contentType: 'text/html',
        body:
          '<!doctype html><html lang="en"><head><title>Rental equipment preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/' +
          path.basename(temporary) +
          '/preview.jsx"></script></body></html>',
      });
    return route.continue();
  });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('http://127.0.0.1:4322/market/rentals');
    await page.getByRole('table', { name: 'Rental equipment' }).waitFor();
    assert.equal(await page.locator('h1').count(), 1);
    await page.locator('.markets-summary').evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished),
      );
    });
    assert.equal(
      await page.getByRole('link', { name: 'Add rental equipment' }).count(),
      0,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'Page must not overflow horizontally',
    );
    await page.screenshot({
      path: path.join(output, `list-${width}.png`),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Add rental equipment' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add rental equipment' });
    await dialog.getByLabel('Rental name', { exact: true }).fill('Extra table');
    await dialog
      .getByRole('button', { name: 'Upload or choose image' })
      .click();
    await page.getByRole('tab', { name: 'Stock Images' }).click();
    assert.equal(
      await page
        .getByRole('tabpanel', { name: 'Stock Images' })
        .locator('.image-library-option')
        .count(),
      10,
    );
    await page.screenshot({
      path: path.join(output, `stock-${width}.png`),
      fullPage: true,
    });
    const zoom = page.getByRole('button', {
      name: 'Enlarge Six-foot folding table',
      exact: true,
    });
    await zoom.click();
    const preview = page.getByRole('dialog', {
      name: 'Image preview: Six-foot folding table',
      exact: true,
    });
    await preview.getByRole('img').evaluate((image) => image.decode());
    await preview.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished),
      );
    });
    assert.equal(await page.locator('dialog[open]').count(), 3);
    assert.equal(await page.evaluate(() => window.stockUploads.length), 0);
    const box = await preview.getByRole('img').boundingBox();
    assert.ok(box.width > 250 && box.height > 250);
    await page.screenshot({
      path: path.join(output, `enlarged-${width}.png`),
      fullPage: true,
    });
    assert.deepEqual(
      (
        await new AxeBuilder({ page })
          .include('dialog[open] .image-library-preview')
          .analyze()
      ).violations.map((v) => v.id),
      [],
    );
    await preview.getByRole('button', { name: 'Close', exact: true }).click();
    await preview.waitFor({ state: 'hidden' });
    await zoom.waitFor();
    await page
      .getByRole('button', {
        name: 'Choose Canopy weight set',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Replace image', exact: true })
      .waitFor();
    assert.deepEqual(
      await page.evaluate(() => window.stockUploads.map((file) => file.type)),
      [],
    );
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await dialog.getByLabel('Price (USD)', { exact: true }).fill('12.50');
    await page.screenshot({
      path: path.join(output, `price-${width}.png`),
      fullPage: true,
    });
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await dialog
      .getByRole('heading', { name: 'Review your rental equipment' })
      .waitFor();
    await page.waitForTimeout(500);
    const offsets = await dialog
      .locator('.reward-review-facts > div')
      .evaluateAll((rows) =>
        rows.map((row) => {
          const label = row.querySelector('dt').getBoundingClientRect();
          const value = row.querySelector('dd').getBoundingClientRect();
          return Math.abs(
            (label.top + label.bottom - value.top - value.bottom) / 2,
          );
        }),
      );
    assert.ok(
      offsets.every((value) => value < 0.1),
      'Review labels and values must be centered',
    );
    assert.equal(await page.evaluate(() => window.rentalCommands.length), 0);
    await page.screenshot({
      path: path.join(output, `review-${width}.png`),
      fullPage: true,
    });
    const violations = (
      await new AxeBuilder({ page }).include('dialog[open]').analyze()
    ).violations;
    assert.deepEqual(
      violations.map((v) => v.id),
      [],
    );
    await dialog
      .getByRole('button', { name: 'Save rental', exact: true })
      .click();
    await dialog
      .getByRole('heading', { name: 'Rental equipment added' })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => window.rentalCommands[0].data.details.imageAssetId,
      ),
      null,
    );
    assert.equal(
      await page.evaluate(
        () => window.rentalCommands[0].data.details.imageStockId,
      ),
      'equipment-canopy-weights-illustration',
    );
    await dialog.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Edit Extra table' }).click();
    assert.equal(
      await page.getByLabel('Rental name', { exact: true }).inputValue(),
      'Extra table',
    );
    assert.ok(
      await page.getByRole('button', { name: 'Replace image' }).isVisible(),
    );
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    console.log(
      `PASS rental table, image selection, staged save, edit, alignment and accessibility at ${width}px`,
    );
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4322/market/rentals/new');
  await page.getByRole('dialog', { name: 'Add rental equipment' }).waitFor();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await page.waitForURL('**/market/rentals');
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  assert.equal(path.dirname(temporary), path.join(root, 'apps/admin/src'));
  assert.ok(path.basename(temporary).startsWith('rentals-check-'));
  await rm(temporary, { recursive: true, force: true });
}
