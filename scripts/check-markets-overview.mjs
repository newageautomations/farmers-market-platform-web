import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/markets-check-'),
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
const originalMemberships = service.memberships;
const originalMembership = service.membership;
const memberships = await originalMemberships();
const names = ['Downtown Farmers Market', 'Boerne Winter Market', 'Saturday Harvest Market', 'Hill Country Pop-Up'];
const states = await Promise.all(memberships.map(m => originalMembership(m.id)));
states.forEach((s, i) => {
  s.membership = {...s.membership, status: i === 3 ? 'pending' : 'approved', market: {...s.membership.market, name: names[i]}};
  s.occurrences = s.occurrences.map(o => ({...o, startsAt:new Date(Date.now()+(i+1)*7*86400000).toISOString(),endsAt:new Date(Date.now()+(i+1)*7*86400000+4*3600000).toISOString(),venue:['Austin, TX','Boerne, TX','New Braunfels, TX','Dripping Springs, TX'][i]}));
  s.participations = s.participations.map(p => ({...p,status:i===1?'cancelled':'confirmed'}));
});
service.memberships=async()=>states.map(s=>s.membership);
service.membership=async(id)=>states.find(s=>s.membership.id===id);
service.occurrences=async(id)=>states.find(s=>s.membership.id===id).occurrences;
createRoot(document.getElementById('root')).render(<AdminShell context={context} vendorService={service} onLogout={()=>{}} />);
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
    console.log(error.message);
  });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(m.text());
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
        body:
          '<!doctype html><html lang="en"><head><title>Markets preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/' +
          path.basename(temporary) +
          '/preview.jsx"></script></body></html>',
      });
    return route.continue();
  });
  const output = path.join(root, '.tmp/markets-overview-preview');
  await mkdir(output, { recursive: true });
  for (const width of [1800, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('http://127.0.0.1:4322/vendor/markets');
    await page
      .getByRole('table', { name: 'Your markets' })
      .waitFor({ timeout: 10000 });
    await page.locator('.markets-workspace').evaluate(async (el) => {
      await Promise.all(
        el
          .getAnimations({ subtree: true })
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished),
      );
    });
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(
      await page.getByRole('link', { name: 'Configure' }).count(),
      5,
    );
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
      'PASS markets layout, overflow and accessibility at ' + width + 'px',
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
}
