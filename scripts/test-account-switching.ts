import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

assert.equal(process.env.FRONTEND_NO_EVIDENCE, 'true');
const backend = resolve('../farmers-market-platform');
const port = process.env.PHONE_TEST_STOREFRONT_PORT ?? '4337';
const adminPort = process.env.PHONE_TEST_ADMIN_PORT ?? '4555';
const central = `http://auth.platform.localhost:${port}`;
const merchant = `http://127.0.0.1:${port}`;
const admin = `http://localhost:${adminPort}`;
const children: ChildProcess[] = [];
function child(
  cwd: string,
  args: string[],
  env: Record<string, string>,
  ipc = false,
) {
  const processChild = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ipc ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
  });
  children.push(processChild);
  processChild.stdout?.pipe(process.stdout);
  processChild.stderr?.pipe(process.stderr);
  return processChild;
}
function message<T>(processChild: ChildProcess, kind: string): Promise<T> {
  return new Promise((accept, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      processChild.off('message', listener);
      processChild.off('exit', exited);
    };
    const listener = (value: unknown) => {
      if (
        value &&
        typeof value === 'object' &&
        'kind' in value &&
        value.kind === kind
      ) {
        cleanup();
        accept(value as T);
      }
    };
    const exited = () => {
      cleanup();
      reject(new Error('Owned account harness stopped'));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Account harness timed out'));
    }, 180000);
    processChild.on('message', listener);
    processChild.once('exit', exited);
  });
}
async function healthy(url: string) {
  for (let attempt = 0; attempt < 180; attempt++) {
    if (children.some((item) => item.exitCode !== null))
      throw new Error('Owned server failed to start');
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* Starting local server. */
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error('Owned server readiness timed out');
}
let passed = 0;
async function check(name: string, run: () => Promise<void>) {
  await run();
  passed++;
  console.log('PASS account switching: ' + name);
}
async function signIn(page: Page, email: string, password: string) {
  await page.goto(central + '/account/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
}
async function selector(page: Page, mobile = false) {
  if (
    mobile &&
    !(await page
      .locator('.ui-dashboard-menu')
      .evaluate((menu) => (menu as HTMLDetailsElement).open))
  )
    await page.locator('.ui-dashboard-menu > summary').click();
  await page.waitForFunction(
    () =>
      !document.querySelector(
        'astro-island[component-export="AccountModeSelect"][ssr]',
      ),
  );
  return page.getByLabel('Account mode', { exact: true });
}
async function main() {
  const server = child(
    backend,
    [
      '--require',
      './test/no-evidence.cjs',
      '--eval',
      // The older account fixture predates the existing dashboard migration.
      // Apply that migration only to its owned disposable database, without
      // changing the backend harness or any persistent development database.
      `require('ts-node').register({project:'test/market-operations/tsconfig.json'});
       const harness = require('./test/market-operations/harness');
       const original = harness.startOperationsHarness;
       harness.startOperationsHarness = async (...args) => {
         const owned = await original(...args);
         try {
           require('./test/test-database').assertTestTarget(process.env.DB_HOST, owned.target.database);
           const db = owned.app.get(require('@vendure/core').TransactionalConnection).rawConnection;
           const {CustomerDashboardFollows1791770000000} = require('./src/migrations/1791770000000-CustomerDashboardFollows');
           db.migrations.push(new CustomerDashboardFollows1791770000000());
           await db.runMigrations({transaction:'each'});
           return owned;
         } catch (error) { await owned.close(false); throw error; }
       };
       require('./test/market-operations/account-experience-server');`,
    ],
    { DB_HOST: '127.0.0.1' },
    true,
  );
  let success = false;
  try {
    const ready = await message<{
      shopEndpoint: string;
      endpoint: string;
      database: string;
      vendorName: string;
      marketName: string;
    }>(server, 'ready');
    assert.match(ready.database, /^vendure_test_/);
    const env = {
      APP_ENV: 'test',
      NODE_ENV: 'test',
      FRONTEND_FIXTURE_MODE: 'false',
      SHOP_API_URL: ready.shopEndpoint,
      PUBLIC_ADMIN_API_URL: ready.endpoint.replace('127.0.0.1', 'localhost'),
      PLATFORM_ACCOUNT_ORIGIN: central,
      ADMIN_ORIGIN: admin,
      PLATFORM_ACCOUNT_BRIDGE_KEY: 'unified-disposable-test-bridge-secret-only',
    };
    child(
      resolve('apps/storefront'),
      [
        '--input-type=module',
        '--eval',
        `import {dev} from 'astro'; await dev({server:{host:'127.0.0.1',port:${port}}});`,
      ],
      env,
    );
    child(
      resolve('apps/admin'),
      [
        resolve('node_modules/vite/bin/vite.js'),
        '--host',
        'localhost',
        '--port',
        adminPort,
        '--strictPort',
      ],
      env,
    );
    await Promise.all([healthy(merchant), healthy(admin)]);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.name));
      await check(
        'anonymous browsing stays anonymous and password login is primary',
        async () => {
          await page.goto(merchant);
          assert.equal(new URL(page.url()).origin, merchant);
          await page.goto(merchant + '/account');
          await page.getByLabel('Password', { exact: true }).waitFor();
          assert.equal(new URL(page.url()).origin, central);
          await page
            .getByRole('link', { name: 'Sign in with Email Link', exact: true })
            .click();
          await page
            .getByRole('button', { name: 'Request account link' })
            .waitFor();
        },
      );
      await check(
        'central login also offers the existing approved-storefront email flow',
        async () => {
          await page.goto(central + '/account/login');
          await page
            .getByRole('link', { name: 'Sign in with Email Link', exact: true })
            .click();
          await page.getByLabel('Storefront address').waitFor();
        },
      );
      await signIn(
        page,
        'identity-owner-0@test.invalid',
        'local-identity-regression-only-password',
      );
      await check(
        'desktop and mobile selector opens, closes, and survives refresh',
        async () => {
          for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 1000 });
            await page.reload();
            const select = await selector(page, width < 768);
            assert.equal(await select.isEnabled(), true);
            assert.equal(await select.locator('option').count(), 5);
            await select.click();
            await select.press('Escape');
            assert.equal(await select.inputValue(), 'CUSTOMER');
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              true,
            );
            assert.deepEqual(
              (await new AxeBuilder({ page }).analyze()).violations.map(
                (item) => item.id,
              ),
              [],
            );
          }
          await page.setViewportSize({ width: 1440, height: 1000 });
          await page.reload();
        },
      );
      await check(
        'Customer to Vendor and Vendor to Customer reuse the central session',
        async () => {
          const select = await selector(page);
          const value = await select
            .locator('option')
            .filter({ hasText: 'Vendor: ' })
            .first()
            .getAttribute('value');
          await select.selectOption(value!);
          await page.getByLabel('Account mode', { exact: true }).waitFor();
          await page.waitForFunction(
            () =>
              (document.querySelector('#account-mode') as HTMLSelectElement)
                ?.value === 'VENDOR',
          );
          assert.equal(new URL(page.url()).origin, admin);
          await page.reload();
          await page
            .getByLabel('Account mode', { exact: true })
            .selectOption('CUSTOMER');
          await page
            .getByRole('heading', { name: 'Overview', exact: true })
            .waitFor();
        },
      );
      await check(
        'mobile Customer to Manager, Manager to Vendor, and back to Customer',
        async () => {
          await page.setViewportSize({ width: 390, height: 1000 });
          await page.reload();
          const select = await selector(page, true);
          const value = await select
            .locator('option')
            .filter({ hasText: 'Market Manager: ' })
            .first()
            .getAttribute('value');
          await select.selectOption(value!);
          await page.locator('.ui-dashboard-menu > summary').waitFor();
          await page.locator('.ui-dashboard-menu > summary').click();
          await page.waitForFunction(
            () =>
              (document.querySelector('#account-mode') as HTMLSelectElement)
                ?.value === 'MARKET_MANAGER',
          );
          await page
            .getByLabel('Account mode', { exact: true })
            .selectOption('VENDOR');
          await page.waitForFunction(
            () =>
              (document.querySelector('#account-mode') as HTMLSelectElement)
                ?.value === 'VENDOR',
          );
          await (await selector(page, true)).selectOption('CUSTOMER');
          await page
            .getByRole('heading', { name: 'Overview', exact: true })
            .waitFor();
        },
      );
      await check(
        'password central session establishes a distinct storefront customer session',
        async () => {
          await page.goto(merchant + '/account/login');
          await page
            .getByRole('heading', { name: 'Overview', exact: true })
            .waitFor();
          assert.equal(new URL(page.url()).origin, merchant);
          await page.reload();
          await page
            .getByRole('heading', { name: 'Overview', exact: true })
            .waitFor();
          const select = await selector(page, true);
          assert.equal(await select.locator('option').count(), 5);
        },
      );
      assert.deepEqual(errors, []);
      await context.close();
      success = true;
      console.log(`Account switching browser groups passed: ${passed}`);
    } finally {
      await browser.close();
    }
  } finally {
    if (server.connected && server.exitCode === null) {
      const exited = new Promise((done) => server.once('exit', done));
      server.send({ close: true, success });
      await exited;
    }
    for (const owned of children) if (owned.exitCode === null) owned.kill();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
