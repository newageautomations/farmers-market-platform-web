import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/leaderboard-check-'),
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
const context={...fixtureContexts.VENDOR,permissions:[...fixtureContexts.VENDOR.permissions,'ManageOwnCoupon','ReadOwnCRM']};
const service=createFixtureVendorService(context);
const names=['Sarah Mitchell','Emily Rogers','Olivia Bennett','James Carter','Michael Chen','Lisa Thompson','Amanda Lee','Robert Fields','David Morales'];
const customers=Array.from({length:26},(_,i)=>({id:String(1201+i),customerId:String(1301+i),firstName:(names[i]??'Customer '+(i+1)).split(' ')[0],lastName:(names[i]??'Customer '+(i+1)).split(' ').slice(1).join(' '),emailAddress:(names[i]??'customer '+(i+1)).toLowerCase().replaceAll(' ','.')+'@example.com',status:'ACTIVE',purpose:'PURCHASE',firstActivityAt:'2026-01-01',lastActivityAt:'2026-11-01',purchaseCount:24-i,attribution:[{currency:'USD',original:158240-i*2000,refunded:0,remaining:158240-i*2000}]}));
service.customers=async()=>({items:customers,totalItems:customers.length});
const ranks=customers.map((c,i)=>({id:800+i,customerId:c.customerId,customer:'Customer '+(800+i),rank:i+1,earned:String(12480-i*630),available:'2000',orders:Math.max(0,24-i),last_purchase:'2026-11-01'}));
service.loyalty={overview:async(filter={})=>({enabled:true,rewards:[],redemptions:[],trend:[],top:ranks.slice(0,3),leaderboard:ranks.slice(filter.skip??0,(filter.skip??0)+(filter.take??25)),skip:filter.skip??0,take:filter.take??25,metrics:{customers:26,issued:'20000',lifetime:'20000',outstanding:'1000',pending:'0',repeat:3,rewardOrders:3}})};
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
        body: `<!doctype html><html lang="en"><head><title>Leaderboard preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/${path.basename(temporary)}/preview.jsx"></script></body></html>`,
      });
    return route.continue();
  });
  const output = path.join(root, '.tmp/loyalty-leaderboard-preview');
  await mkdir(output, { recursive: true });
  for (const width of [1800, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('http://127.0.0.1:4322/vendor/loyalty');
    await page
      .getByRole('img', { name: /Points earned by day/ })
      .waitFor()
      .catch(async (error) => {
        console.log(errors, await page.locator('body').innerText());
        throw error;
      });
    await page.evaluate(() => {
      window.loyaltyHeader = document.querySelector('.loyalty-heading');
      window.loyaltyMenu = document.querySelector('.loyalty-menu');
    });
    await page
      .getByRole('navigation', { name: 'Loyalty' })
      .getByRole('link', { name: 'Leaderboard' })
      .click();
    const table = page.getByRole('table', { name: 'Customer points ranking' });
    await table.waitFor();
    await page
      .locator('.loyalty-leaderboard')
      .evaluate((element) =>
        Promise.all(
          element.getAnimations().map((animation) => animation.finished),
        ),
      );
    assert.equal(new URL(page.url()).pathname, '/vendor/loyalty');
    assert.equal(
      await page.evaluate(
        () =>
          window.loyaltyHeader === document.querySelector('.loyalty-heading') &&
          window.loyaltyMenu === document.querySelector('.loyalty-menu'),
      ),
      true,
    );
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.equal(await page.getByLabel(/tier|status/i).count(), 0);
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
      `PASS leaderboard layout, in-page transition, overflow and accessibility at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 1800, height: 1050 });
  await page.goto('http://127.0.0.1:4322/vendor/loyalty#leaderboard');
  const table = page.getByRole('table', { name: 'Customer points ranking' });
  await table.waitFor();
  await table.getByRole('row', { name: 'View Emily Rogers' }).click();
  assert.equal(
    await page
      .getByRole('link', { name: 'View Customer Page' })
      .getAttribute('href'),
    '/vendor/customers/1202',
  );
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await table.getByRole('row').count(), 7);
  await page
    .getByLabel('Search customer name or email', { exact: true })
    .fill('sarah.mitchell@');
  assert.equal(await table.getByRole('row').count(), 2);
  await page
    .getByLabel('Search customer name or email', { exact: true })
    .fill('');
  await page.getByLabel('Sort by', { exact: true }).selectOption('lowest');
  assert.ok((await table.getByRole('row').nth(1).innerText()).includes('#26'));
  await page
    .getByRole('navigation', { name: 'Loyalty' })
    .getByRole('link', { name: 'Overview' })
    .click();
  await page.getByRole('img', { name: /Points earned by day/ }).waitFor();
  await page.goBack();
  await table.waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'PASS customer links, paging, email search, stable ranks, row selection and browser Back',
  );
} finally {
  await browser?.close();
  const resolved = path.resolve(temporary);
  assert.equal(path.dirname(resolved), path.join(root, 'apps/admin/src'));
  await rm(resolved, { recursive: true, force: true });
}
