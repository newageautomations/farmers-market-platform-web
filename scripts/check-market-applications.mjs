import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/applications-check-'),
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
const names=['Downtown Farmers Market','Boerne Winter Market','Saturday Harvest Market','Hill Country Pop-Up','Sunday Artisan Market','Blanco Evening Market'];
const cities=['Austin','Boerne','New Braunfels','Dripping Springs','Fredericksburg','Blanco'];
const statuses=['ACCEPTED','NEEDS_INFO','ACCEPTED','DRAFT','WAITLISTED','SUBMITTED'];
const rows=names.map((marketName,i)=>({id:i+1,marketId:i+1,marketName,city:cities[i],state:'TX',name:'2026 vendor application',slug:'vendors',origin:'https://market.example',current:true,status:statuses[i],createdAt:new Date(Date.now()-i*86400000).toISOString(),updatedAt:new Date().toISOString(),vendorId:Number(service.vendorId),vendorChannelId:'preview-vendor'}));
service.applications={read:async(input)=>{
  if(input.id){const row=rows.find(r=>r.id===input.id);return {...row,definition:{sections:[],questions:[],occurrenceIds:[],rentalIds:[]},answers:{},rentalRequests:[],canWithdraw:true,dates:[],history:[],onboarding:row.status==='ACCEPTED'?{steps:[{key:'documents',label:'Documents',state:'Action needed',detail:'Review your market requirements and provide the requested documents.',href:'/vendor/documents?channel=preview-vendor'}]}:null,informationRequests:row.status==='NEEDS_INFO'?[{id:12,status:'AWAITING_RESPONSE'}]:[]};}
  return {vendorId:Number(service.vendorId),vendorChannelId:'preview-vendor',drafts:rows.filter(r=>r.status==='DRAFT'),items:rows.filter(r=>r.status!=='DRAFT'),totalItems:5,skip:0};
},command:async()=>{throw new Error('Preview is read only');}};
const markets=Array.from({length:24},(_,i)=>({id:String(i),name:['Eastside Farmers Market','Lakeview Night Market','Cedar Ridge Harvest Market'][i%3]+(i>2?' '+(i+1):''),city:cities[i%6],state:'TX',website:'https://market.example',applyUrl:'https://market.example/apply/vendors',nextMarket:{startsAt:new Date(Date.now()+(i+2)*86400000).toISOString(),timezone:'America/Chicago'},deadline:{closesAt:new Date(Date.now()+(i+1)*86400000).toISOString(),timezone:'America/Chicago'}}));
service.marketDiscovery={cities:async()=>cities.map(city=>({value:city+', TX',label:city+', TX'})),search:async({search,city,skip,take})=>{const filtered=markets.filter(m=>(!city||m.city+', TX'===city)&&m.name.toLowerCase().includes(search.toLowerCase()));return {items:filtered.slice(skip,skip+take),totalItems:filtered.length};}};
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
    console.error(error.message);
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
          '<!doctype html><html lang="en"><head><title>Applications preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/' +
          path.basename(temporary) +
          '/preview.jsx"></script></body></html>',
      });
    return route.continue();
  });
  const output = path.join(root, '.tmp/market-applications-preview');
  await mkdir(output, { recursive: true });
  for (const width of [1800, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('about:blank');
    await page.goto('http://127.0.0.1:4322/vendor/markets#applications');
    const discovery = page.getByRole('table', {
      name: 'Markets accepting applications',
    });
    await discovery.waitFor();
    await page.getByRole('link', { name: 'Open documents' }).first().waitFor();
    await page.locator('.markets-workspace').evaluate(async (el) => {
      await Promise.all(
        el
          .getAnimations({ subtree: true })
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished),
      );
    });
    assert.equal(await discovery.getByRole('row').count(), 4);
    if (
      !(await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ))
    ) {
      await page.screenshot({
        path: path.join(output, width + '-overflow.png'),
        fullPage: true,
      });
      throw new Error('Page overflow at ' + width);
    }
    assert.equal(
      await page
        .getByRole('region', { name: 'Application details' })
        .getByRole('link', { name: 'Open application' })
        .count(),
      1,
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
    await page.getByRole('button', { name: 'View more markets' }).click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.market-discovery tbody tr').length === 10,
    );
    await page
      .getByRole('region', { name: 'Find markets to apply' })
      .getByRole('button', { name: 'Next' })
      .click();
    await page.getByText('Cedar Ridge Harvest Market 12').waitFor();
    assert.equal(new URL(page.url()).hash, '#applications');
    console.log(
      'PASS Applications layout, accessibility and inline pagination at ' +
        width +
        'px',
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  assert.equal(path.dirname(temporary), path.join(root, 'apps/admin/src'));
  await rm(temporary, { recursive: true, force: true });
}
