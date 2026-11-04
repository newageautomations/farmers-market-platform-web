import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Only in-memory fixture data. Block every backend and non-local request.
const root = process.cwd();
const temporary = await mkdtemp(
  path.join(root, 'apps/admin/src/pickup-check-'),
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
  page.on('console', (message) => {
    if (message.type() === 'error') console.log(message.text());
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
        body: `<!doctype html><html lang="en"><head><title>Pickup preview</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/${path.basename(temporary)}/preview.jsx"></script></body></html>`,
      });
    return route.continue();
  });
  await mkdir(path.join(root, '.tmp/pickup-preview'), { recursive: true });
  for (const width of [1800, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('http://127.0.0.1:4322/vendor/orders/pickup');
    await page
      .getByRole('table', { name: 'Pickup queue', exact: true })
      .waitFor({ timeout: 15000 })
      .catch(async (error) => {
        console.log(errors, await page.locator('body').innerText());
        throw error;
      });
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(
      await page.locator('.pickup-queue input[type="checkbox"]').count(),
      0,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
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
      path: path.join(root, `.tmp/pickup-preview/${width}.png`),
      fullPage: true,
    });
    console.log(`PASS pickup queue, accessibility and overflow at ${width}px`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  assert.equal(path.dirname(temporary), path.join(root, 'apps/admin/src'));
  await rm(temporary, { recursive: true, force: true });
}
