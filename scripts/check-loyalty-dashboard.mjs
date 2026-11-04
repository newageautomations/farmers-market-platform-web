import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/loyalty-check-'),
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
let enabled=true;
service.loyalty={overview:async (filter={})=>{
const start=filter.trendFrom ? Date.parse(filter.trendFrom) : Date.now()-89*86400000;
const end=filter.trendThrough ? Date.parse(filter.trendThrough) : Date.now()+86400000;
const trend=Array.from({length:Math.round((end-start)/86400000)},(_,i)=>({day:new Date(start+i*86400000).toISOString().slice(0,10), earned:String(12000+i*390+Math.round(Math.sin(i/3)*4500)),redeemed:String(4000+i*100),redemptions:i%7,customers:i%4}));
return {enabled,rewards:[],top:[],leaderboard:[],redemptions:[],skip:0,take:20,metrics:{customers:1842,issued:'248600',lifetime:'1243800',outstanding:'15000',pending:'2000',repeat:300,rewardOrders:356},trend};},program:async(value)=>{enabled=value;return {enabled};}};
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
          '<!doctype html><html lang="en"><head><title>Loyalty preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/' +
          path.basename(temporary) +
          '/preview.jsx"></script></body></html>',
      });
    return route.continue();
  });
  const output = path.join(root, '.tmp/loyalty-dashboard-preview');
  await mkdir(output, { recursive: true });
  for (const width of [1800, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('http://127.0.0.1:4322/vendor/loyalty');
    await page.getByRole('img', { name: /Points earned by day/ }).waitFor();
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(await page.locator('.loyalty-graph > svg').count(), 1);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
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
    await page.screenshot({
      path: path.join(output, width + '.png'),
      fullPage: true,
    });
    console.log(
      'PASS loyalty layout, overflow and accessibility at ' + width + 'px',
    );
  }
  await page
    .getByLabel('Display metric', { exact: true })
    .selectOption('redemptions');
  const chart = page.getByRole('img', { name: /Reward redemptions by day/ });
  await chart.waitFor();
  assert.ok(!(await chart.textContent()).includes('50,000'));
  await page
    .getByLabel('Activity period', { exact: true })
    .selectOption('custom');
  const dialog = page.getByRole('dialog', { name: 'Custom date range' });
  await dialog.waitFor();
  await page.screenshot({
    path: path.join(output, 'date-range.png'),
    fullPage: true,
  });
  const from = dialog.getByRole('button', { name: /From:/ });
  await from.click();
  const firstDay = dialog.locator('.orders-calendar td button:not([disabled])');
  await firstDay.first().click();
  const days = dialog.locator('.orders-calendar td button:not([disabled])');
  await days.last().click();
  await dialog.getByRole('button', { name: 'Apply date range' }).click();
  await page.getByRole('img', { name: /Reward redemptions by day/ }).waitFor();
  await page.getByRole('button', { name: 'Edit date range' }).waitFor();
  await page.getByRole('button', { name: 'View daily values' }).click();
  await page
    .getByRole('dialog', { name: 'Reward redemptions by date' })
    .waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Pause Program' }).click();
  await page.getByRole('button', { name: 'Enable Program' }).waitFor();
  await page.getByRole('link', { name: 'Rewards', exact: true }).click();
  await page.getByText('Create your first reward').waitFor();
  assert.equal(await page.locator('.loyalty-dashboard').count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS metric scaling, date range, daily values, program action and unchanged rewards destination',
  );
} finally {
  await browser?.close();
  const resolved = path.resolve(temporary);
  assert.equal(path.dirname(resolved), path.join(root, 'apps/admin/src'));
  await rm(resolved, { recursive: true, force: true });
}
