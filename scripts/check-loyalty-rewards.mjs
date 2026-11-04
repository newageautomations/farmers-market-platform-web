import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/rewards-check-'),
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
const context={...fixtureContexts.VENDOR,permissions:[...fixtureContexts.VENDOR.permissions,'ManageOwnCoupon']};
const service=createFixtureVendorService(context);
let rewards=['$5 Off Honey','Free Berry Pint','$10 Off Purchase','Manna Roots Tote Bag','Free Produce Box','Early Access Discount'].map((name,i)=>({id:i+1,versionId:i+1,status:i===3?'INACTIVE':'ACTIVE',redemptions:[42,27,63,14,9,118][i],terms:{name,description:['Get $5 off any honey product.','Redeem for one pint of seasonal berries.','Take $10 off your eligible products.','Get a discount on a branded tote bag.','A seasonal produce box, our choice!','Save on your next purchase.'][i],imageAssetId:i===0?'9':null,image:i===0?'/test-honey.svg':null,kind:[1,4].includes(i)?'FREE_PRODUCT':'FIXED',points:[500,750,1000,1250,2000,300][i],value:500,maximum:0,minimum:0,variantIds:[],quantity:1,startsAt:null,endsAt:null,limit:null}}));
service.loyalty={overview:async()=>({enabled:true,rewards,redemptions:[],trend:[],top:[],leaderboard:[],skip:0,take:25,metrics:{customers:0,issued:'0',lifetime:'0',outstanding:'0',pending:'0',repeat:0,rewardOrders:0}}),save:async(terms,status,id)=>{const reward={id:id??10,versionId:20,terms,status,redemptions:0};rewards=id?rewards.map(r=>r.id===id?reward:r):[...rewards,reward];return reward;}};
service.categories={images:async()=>[{id:'9',name:'Honey image',preview:'/test-honey.svg'}]};
createRoot(document.getElementById('root')).render(<AdminShell context={context} vendorService={service} onLogout={()=>{}}/>);
`,
);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('requestfailed', (request) =>
    console.log('REQUEST FAILED', request.url(), request.failure()?.errorText),
  );
  page.on('response', (response) => {
    if (response.status() >= 400)
      console.log('HTTP', response.status(), response.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      /(?:admin|shop)-api/.test(url.pathname)
    )
      return route.abort();
    if (url.pathname === '/test-honey.svg')
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f7e3ae"/><rect x="18" y="23" width="44" height="45" rx="7" fill="#bc7610"/><rect x="16" y="17" width="48" height="12" rx="4" fill="#ded4b6"/></svg>',
      });
    if (
      route.request().resourceType() === 'document' &&
      url.pathname.startsWith('/vendor/')
    )
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html lang="en"><head><title>Rewards preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/${path.basename(temporary)}/preview.jsx"></script></body></html>`,
      });
    return route.continue();
  });
  const output = path.join(root, '.tmp/loyalty-rewards-preview');
  await mkdir(output, { recursive: true });
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('http://127.0.0.1:4322/vendor/loyalty');
    await page
      .locator('.loyalty-menu')
      .waitFor()
      .catch(async (error) => {
        console.log(errors, await page.locator('body').innerText());
        throw error;
      });
    await page.evaluate(() => {
      window.originalHeader = document.querySelector('.loyalty-heading');
    });
    await page
      .getByRole('navigation', { name: 'Loyalty' })
      .getByRole('link', { name: 'Rewards', exact: true })
      .click();
    await page.getByRole('table', { name: 'Loyalty rewards' }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/vendor/loyalty');
    assert.equal(
      await page.evaluate(
        () =>
          window.originalHeader === document.querySelector('.loyalty-heading'),
      ),
      true,
    );
    await page
      .locator('.loyalty-rewards')
      .evaluate((el) =>
        Promise.allSettled(el.getAnimations().map((a) => a.finished)),
      );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const trigger = page
      .locator('summary')
      .filter({ hasText: 'Actions for $5 Off Honey' });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const details = trigger.locator('..');
    await details
      .getByRole('button', { name: 'Edit', exact: true })
      .waitFor({ state: 'visible' });
    await details
      .locator('.ui-disclosure-content')
      .evaluate((el) =>
        Promise.allSettled(el.getAnimations().map((a) => a.finished)),
      );
    const bounds = await details
      .locator('.ui-disclosure-content')
      .boundingBox();
    assert(
      bounds &&
        bounds.x >= 0 &&
        bounds.x + bounds.width <= width &&
        bounds.y >= 0 &&
        bounds.y + bounds.height <= 1050,
    );
    const motion = await details
      .locator('.ui-disclosure-content')
      .evaluate((el) => getComputedStyle(el).animationName);
    assert.equal(motion, 'reward-menu-enter');
    await page.keyboard.press('Escape');
    assert.equal(await details.getAttribute('open'), null);
    await trigger.focus();
    await page.keyboard.press('Enter');
    await details.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('dialog', { name: 'Edit reward' }).waitFor();
    await page
      .getByRole('dialog', { name: 'Edit reward' })
      .screenshot({ path: path.join(output, `wizard-type-${width}.png`) });
    await page
      .getByRole('radio', { name: 'Percentage discount', exact: true })
      .check({ force: true });
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    assert.equal(
      await page
        .getByRole('dialog', { name: 'Edit reward' })
        .evaluate((el) => getComputedStyle(el).overflowY),
      'hidden',
    );
    await page.waitForFunction(
      () =>
        document.querySelector('.reward-wizard')?.closest('dialog')?.style
          .overflowY !== 'hidden',
    );
    await page.getByRole('button', { name: 'Reward image (optional)' }).click();
    await page.getByRole('dialog', { name: 'Choose an image' }).waitFor();
    await page.getByRole('button', { name: 'Choose Honey image' }).click();
    await page
      .getByRole('dialog', { name: 'Choose an image' })
      .waitFor({ state: 'hidden' });
    const wizard = page.getByRole('dialog', { name: 'Edit reward' });
    await wizard
      .getByLabel('Maximum discount (USD) *', { exact: true })
      .fill('15');
    await wizard.evaluate(async (el) => {
      await Promise.allSettled(
        el
          .getAnimations({ subtree: true })
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished),
      );
    });
    const picker = wizard.getByRole('combobox', {
      name: 'Eligible products (optional)',
    });
    await picker.click();
    const productOption = wizard
      .locator('[role="option"]:not([aria-disabled="true"])')
      .first();
    await productOption.waitFor({ state: 'visible' });
    const productLabel = (await productOption.textContent()).trim();
    await productOption.click();
    await wizard.getByLabel('Reward name *', { exact: true }).click();
    const amountBounds = await wizard
      .getByLabel('Percentage discount *', { exact: true })
      .boundingBox();
    const eligibleBounds = await picker.boundingBox();
    if (width > 650)
      assert(
        Math.abs(amountBounds.y - eligibleBounds.y) < 2,
        'Percentage and product inputs align',
      );
    for (const [stage, next] of [
      ['details', true],
      ['rules', true],
      ['review', false],
    ]) {
      if (stage === 'rules') {
        await wizard
          .getByLabel('Required points *', { exact: true })
          .fill('500');
        await wizard
          .getByLabel('Start date (optional)', { exact: true })
          .fill('2026-11-10');
      }
      if (stage === 'review') {
        assert.equal(
          await wizard.locator('.reward-review-facts').evaluate((el) =>
            Array.from(el.children).every((row) => {
              const label = row.querySelector('dt').getBoundingClientRect();
              const value = row.querySelector('dd').getBoundingClientRect();
              return (
                Math.abs(
                  label.y + label.height / 2 - value.y - value.height / 2,
                ) < 1
              );
            }),
          ),
          true,
          'Metric labels and values share a vertical center',
        );
        const icon = wizard.locator('.ui-status .reward-percentage-icon');
        assert.equal(
          await icon.evaluate((el) => getComputedStyle(el).fontSize),
          '14px',
        );
        assert.equal(
          await wizard
            .locator('.reward-review-status .ui-status')
            .last()
            .evaluate((el) => getComputedStyle(el).alignItems),
          'center',
        );
        await wizard
          .getByRole('combobox', { name: 'Eligible products', exact: true })
          .click();
        assert.equal(
          await wizard
            .getByRole('listbox', { name: 'Eligible products', exact: true })
            .innerText(),
          productLabel,
        );
        assert.equal(
          await wizard
            .getByRole('combobox', { name: 'Eligible products', exact: true })
            .getAttribute('aria-readonly'),
          'true',
        );
      }
      assert.equal(
        await wizard.evaluate((el) => el.scrollWidth <= el.clientWidth),
        true,
        `${stage} overflow at ${width}px`,
      );
      const violations = (
        await new AxeBuilder({ page }).include('.reward-wizard').analyze()
      ).violations;
      if (violations.length)
        console.log(
          JSON.stringify(
            violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => ({
                target: n.target,
                summary: n.failureSummary,
              })),
            })),
            null,
            2,
          ),
        );
      assert.deepEqual(
        violations.map((v) => ({ id: v.id, impact: v.impact })),
        [],
        `${stage} accessibility at ${width}px`,
      );
      await wizard.screenshot({
        path: path.join(output, `wizard-${stage}-${width}.png`),
      });
      if (next) {
        await wizard.getByRole('button', { name: 'Next', exact: true }).click();
        assert.equal(
          await wizard.evaluate((el) => getComputedStyle(el).overflowY),
          'hidden',
          `Scroll locked entering ${stage === 'details' ? 'rules' : 'review'}`,
        );
        await wizard.evaluate(async (el) => {
          await Promise.allSettled(
            el
              .getAnimations({ subtree: true })
              .filter((a) => a.effect?.getTiming().iterations !== Infinity)
              .map((a) => a.finished),
          );
        });
      }
    }
    await wizard
      .getByRole('button', { name: 'Publish reward', exact: true })
      .click();
    await wizard
      .getByRole('heading', { name: 'Reward successfully published' })
      .waitFor();
    await wizard.evaluate(async (el) =>
      Promise.allSettled(
        el.getAnimations({ subtree: true }).map((a) => a.finished),
      ),
    );
    assert.deepEqual(
      (
        await new AxeBuilder({ page }).include('.reward-wizard').analyze()
      ).violations.map((v) => v.id),
      [],
    );
    await wizard.screenshot({
      path: path.join(output, `wizard-published-${width}.png`),
    });
    await wizard.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.reward-status-dot').count(), 0);
    await page.locator('.loyalty-heading').scrollIntoViewIfNeeded();
    const violations = (
      await new AxeBuilder({ page }).include('.loyalty-dashboard').analyze()
    ).violations;
    assert.deepEqual(
      violations.map((v) => ({ id: v.id, impact: v.impact })),
      [],
    );
    await page.locator('.rewards-table-panel .table-scroll').evaluate((el) => {
      el.scrollLeft = 0;
    });
    await page.screenshot({
      path: path.join(output, `rewards-${width}.png`),
      fullPage: true,
    });
    console.log(
      `PASS ${width}px: same workspace, bounded menu, keyboard, image library and accessibility`,
    );
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const trigger = page
    .locator('summary')
    .filter({ hasText: 'Actions for $5 Off Honey' });
  await trigger.click();
  assert.equal(
    await trigger
      .locator('..')
      .locator('.ui-disclosure-content')
      .evaluate((el) => getComputedStyle(el).animationName),
    'none',
  );
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
}
