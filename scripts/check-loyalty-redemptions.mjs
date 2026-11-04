import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/redemptions-check-'),
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
const context={...fixtureContexts.VENDOR,permissions:[...fixtureContexts.VENDOR.permissions,'ReadOwnOrders','ReadOwnCRM','ReadOwnVendorFinance']};
const service=createFixtureVendorService(context);
const terms={name:'$5 Off Honey',kind:'FIXED',points:500,value:500,maximum:0,minimum:0,variantIds:[],quantity:1,startsAt:null,endsAt:null,limit:null};
const rows=Array.from({length:26},(_,i)=>({id:i+1,wallet_id:800,order_id:10493-i,vendor_order_id:200+i,customer:'Customer 800',terms:{...terms,name:i===1?'Free Berry Pint':terms.name},status:i===25?'REVERSED':'COMPLETED',discount:500,created_at:new Date(Date.UTC(2026,9,31,20,i)).toISOString()}));
service.loyalty={overview:async(filter={})=>({enabled:true,rewards:[],redemptions:rows.slice(filter.skip??0,(filter.skip??0)+(filter.take??25)),leaderboard:filter.skip?[]:[{id:800,customerId:'55',customer:'Customer 800',earned:'12500',available:'0',orders:25,last_purchase:null}],top:[],trend:[],skip:filter.skip??0,take:filter.take??25,metrics:{customers:1,issued:'12500',lifetime:'12500',outstanding:'0',pending:'0',repeat:1,rewardOrders:25}})};
service.customers=async()=>({items:[{id:'relationship-1',customerId:'55',firstName:'Emily',lastName:'Carter',emailAddress:'emily@example.com',status:'ACTIVE',purpose:'PURCHASE',firstActivityAt:'2026-01-01',lastActivityAt:'2026-10-31',purchaseCount:25,attribution:[]}],totalItems:1});
service.order=async(id)=>({portion:{operationalOrderId:id,vendorId:service.vendorId,kind:id==='224'?'IN_PERSON':'MARKET_OCCURRENCE',marketName:id==='224'?null:'Boerne Farmers Market'},context:{original:2750,currency:'USD'}});
service.pos={orderPayment:async()=>({context:{kind:'INDEPENDENT',label:'Independent sale'},amount:2750,currency:'USD',orderCode:'ORD-10469'})};
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
        body:
          '<!doctype html><html lang="en"><head><title>Redeemed rewards preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/' +
          path.basename(temporary) +
          '/preview.jsx"></script></body></html>',
      });
    return route.continue();
  });
  const output = path.join(root, '.tmp/loyalty-redemptions-preview');
  await mkdir(output, { recursive: true });
  for (const width of [1800, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('http://127.0.0.1:4322/vendor/loyalty/redemptions');
    const table = page.getByRole('table', { name: 'Redemption history' });
    await table.waitFor().catch(async (error) => {
      console.log(errors, await page.locator('body').innerText());
      throw error;
    });
    const details = page.getByRole('region', { name: 'Redemption details' });
    await details.getByText('Independent sale', { exact: true }).waitFor();
    await page
      .locator('.loyalty-redemptions')
      .evaluate((element) =>
        Promise.all(
          element.getAnimations().map((animation) => animation.finished),
        ),
      );
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(await page.locator('.rewards-stat').count(), 4);
    assert.equal(
      await page
        .getByRole('button', { name: 'Close redemption details' })
        .count(),
      0,
    );
    assert.equal(await table.locator('tbody button').count(), 0);
    assert.equal(await table.locator('thead th').count(), 5);
    const customerAction = await details
      .getByRole('link', { name: 'View customer' })
      .boundingBox();
    const orderAction = await details
      .getByRole('link', { name: 'View order' })
      .boundingBox();
    assert.ok(orderAction.y >= customerAction.y + customerAction.height);
    assert.ok(
      await details.locator('.leaderboard-facts > div').evaluateAll((facts) =>
        facts.every((fact) => {
          const label = fact.querySelector('dt').getBoundingClientRect(),
            value = fact.querySelector('dd').getBoundingClientRect();
          return (
            Math.abs(label.y + label.height / 2 - value.y - value.height / 2) <
            2
          );
        }),
      ),
    );

    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'No page overflow at ' + width,
    );
    const violations = (
      await new AxeBuilder({ page }).include('main').analyze()
    ).violations;
    assert.deepEqual(
      violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await page.screenshot({
      path: path.join(output, width + '.png'),
      fullPage: true,
    });
    await page.getByRole('row', { name: /View redemption 24:/ }).click();
    await details.getByText('Boerne Farmers Market', { exact: true }).waitFor();
    await page.getByLabel('Search customer or reward').fill('berry');
    assert.equal(await table.getByRole('row').count(), 2);
    await page.getByLabel('Search customer or reward').fill('missing');
    await page.getByText('No redemptions match', { exact: true }).waitFor();
    console.log(
      'PASS ' + width + 'px layout, a11y, attribution, selection and filters',
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  const resolved = path.resolve(temporary);
  assert.equal(path.dirname(resolved), path.join(root, 'apps/admin/src'));
  await rm(resolved, { recursive: true, force: true });
}
