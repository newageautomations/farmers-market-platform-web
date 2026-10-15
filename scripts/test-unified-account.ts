import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
assert.equal(process.env.FRONTEND_NO_EVIDENCE, 'true');
const backend = resolve('../farmers-market-platform'),
  children: ChildProcess[] = [],
  origin = 'http://127.0.0.1:4337',
  adminOrigin = 'http://localhost:4555';
function child(
  cwd: string,
  args: string[],
  env: Record<string, string>,
  ipc = false,
) {
  const p = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ipc ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
  });
  children.push(p);
  p.stdout?.on('data', (d) => process.stdout.write(d));
  p.stderr?.on('data', (d) => process.stderr.write(d));
  return p;
}
async function healthy(url: string) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* Local startup. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Local server readiness failed');
}
function message<T>(p: ChildProcess, kind: string): Promise<T> {
  return new Promise((accept, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Local test message timeout')),
      120000,
    );
    const listener = (m: unknown) => {
      if (m && typeof m === 'object' && 'kind' in m && m.kind === kind) {
        clearTimeout(timeout);
        p.off('message', listener);
        accept(m as T);
      }
    };
    p.on('message', listener);
    p.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error('Harness exited ' + code));
    });
  });
}
let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log('PASS unified browser ' + name);
}
async function accessible(page: Page) {
  const a = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  assert.deepEqual(
    a.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
}
async function main() {
  const server = child(
    backend,
    [
      'node_modules/ts-node/dist/bin.js',
      '--project',
      'test/market-operations/tsconfig.json',
      'test/market-operations/account-experience-server.ts',
    ],
    { DB_HOST: '127.0.0.1' },
    true,
  );
  let success = false;
  try {
    const ready = await message<{
      endpoint: string;
      shopEndpoint: string;
      slug: string;
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
      PLATFORM_ACCOUNT_ORIGIN: 'http://auth.platform.localhost:4337',
      PLATFORM_ACCOUNT_BRIDGE_KEY: 'unified-disposable-test-bridge-secret-only',
      ADMIN_ORIGIN: adminOrigin,
      CUSTOMER_STOREFRONT_ORIGIN: origin,
    };
    child(
      resolve('apps/storefront'),
      [
        '--input-type=module',
        '--eval',
        "import { dev } from 'astro'; await dev({server:{host:'127.0.0.1',port:4337}});",
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
        '4555',
        '--strictPort',
      ],
      env,
    );
    await Promise.all([
      healthy(origin + '/apply/' + ready.slug),
      healthy(adminOrigin),
    ]);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext(),
        page = await context.newPage();
      const fill = async () => {
        await page
          .getByLabel('Business name (required)', { exact: true })
          .fill('Browser Orchard');
        await page
          .getByLabel('Contact first name (required)', { exact: true })
          .fill('Draft');
        await page
          .getByLabel('Contact last name (required)', { exact: true })
          .fill('Farmer');
        await page
          .getByLabel('Email (required)', { exact: true })
          .fill('anonymous@test.invalid');
        await page
          .getByRole('group', { name: 'Requested Market dates' })
          .getByRole('checkbox')
          .first()
          .check();
      };
      await check(
        'advertised Market homepage links to the published application',
        async () => {
          await page.goto(origin);
          await page.getByRole('link', { name: /Apply/ }).first().click();
          await page.getByLabel('No', { exact: true }).waitFor();
          assert.match(page.url(), /\/apply/);
        },
      );
      await check(
        'mandatory question precedes fields and anonymous submission shows a dismissible invitation',
        async () => {
          await page.waitForFunction(
            () =>
              document
                .querySelector('form.ops-application')
                ?.getAttribute('data-ready') === 'true',
          );
          assert.match(
            (await page
              .locator('form.ops-application fieldset')
              .first()
              .textContent()) ?? '',
            /Do you have an account/,
          );
          await page.getByLabel('No', { exact: true }).check();
          await fill();
          await accessible(page);
          await page
            .getByRole('button', { name: 'Submit application', exact: true })
            .click();
          await page
            .getByRole('heading', {
              name: 'Application submitted successfully.',
              exact: true,
            })
            .waitFor();
          await page
            .getByRole('link', { name: 'Claim My Free Account' })
            .waitFor();
          await page.getByRole('button', { name: 'Maybe Later' }).click();
          assert.equal(
            await page
              .getByRole('link', { name: 'Claim My Free Account' })
              .count(),
            0,
          );
          await page
            .getByRole('heading', {
              name: 'Application submitted successfully.',
            })
            .waitFor();
        },
      );
      await check(
        'signup uses central registration and preserves the existing claim route',
        async () => {
          await page.goto(origin + '/account/signup');
          await page
            .getByRole('heading', { name: 'Create your free account' })
            .waitFor();
          await page.getByLabel('First name').waitFor();
          assert.match(page.url(), /auth\.platform\.localhost/);
          await accessible(page);
          const claim = await page.goto(
            'http://auth.platform.localhost:4337/auth/claim',
          );
          assert.notEqual(claim?.status(), 404);
        },
      );
      await check(
        'real central login returns to the same application with encrypted progress and scoped autofill',
        async () => {
          await page.goto(origin + '/apply/' + ready.slug);
          await page.waitForFunction(
            () =>
              document
                .querySelector('form.ops-application')
                ?.getAttribute('data-ready') === 'true',
          );
          await page.getByLabel('Yes', { exact: true }).check();
          await page
            .getByLabel('Business name (required)', { exact: true })
            .fill('Retained Browser Orchard');
          await page
            .getByLabel('Contact first name (required)', { exact: true })
            .fill('Retained Contact');
          await page
            .getByRole('button', { name: 'Sign in to my platform account' })
            .click();
          await page.waitForURL(
            'http://auth.platform.localhost:4337/account/login**',
          );
          await page
            .getByLabel('Email', { exact: true })
            .fill('identity-owner-0@test.invalid');
          await page
            .getByLabel('Password', { exact: true })
            .fill('local-identity-regression-only-password');
          await page
            .getByRole('button', { name: 'Sign in', exact: true })
            .click();
          await page.waitForURL(origin + '/apply/' + ready.slug);
          await page
            .getByRole('combobox', { name: 'Business for this application' })
            .waitFor();
          assert.equal(
            await page
              .getByLabel('Business name (required)', { exact: true })
              .inputValue(),
            'Retained Browser Orchard',
          );
          assert.equal(
            await page
              .getByLabel('Contact first name (required)', { exact: true })
              .inputValue(),
            'Retained Contact',
          );
          await page
            .getByRole('combobox', { name: 'Business for this application' })
            .selectOption({ label: ready.vendorName });
          await page
            .getByRole('button', { name: 'Fill empty fields from my account' })
            .click();
          assert.equal(
            await page
              .getByLabel('Email (required)', { exact: true })
              .inputValue(),
            'identity-owner-0@test.invalid',
          );
          await page
            .getByRole('group', { name: 'Requested Market dates' })
            .getByRole('checkbox')
            .first()
            .check();
          await accessible(page);
          await page
            .getByRole('button', { name: 'Submit application', exact: true })
            .click();
          await page
            .getByRole('heading', {
              name: 'Application submitted successfully.',
            })
            .waitFor();
          assert.equal(
            await page
              .getByRole('link', { name: 'Claim My Free Account' })
              .count(),
            0,
          );
        },
      );
      await check(
        'the same browser account enters Admin and switches Vendor, Market and Customer contexts',
        async () => {
          page.on('pageerror', (e) =>
            console.error('Browser error:', e.message),
          );
          await page.goto(adminOrigin);
          await page
            .getByRole('button', { name: 'Use my platform account' })
            .click();
          try {
            await page.getByLabel('Account mode').waitFor();
          } catch (e) {
            console.error(
              'Account return state:',
              page.url(),
              await page.locator('body').innerText(),
            );
            throw e;
          }
          await page.getByLabel('Account mode').selectOption('VENDOR');
          await page
            .locator('.brand')
            .filter({ hasText: ready.vendorName })
            .waitFor();
          await page.getByLabel('Account mode').selectOption('MARKET_MANAGER');
          await page
            .locator('.brand')
            .filter({ hasText: ready.marketName })
            .waitFor();
          await page.getByLabel('Account mode').selectOption('CUSTOMER');
          await page.waitForURL('http://auth.platform.localhost:4337/account');
          await page
            .getByText('identity-owner-0@test.invalid', { exact: true })
            .first()
            .waitFor();
        },
      );
      await check(
        'browser submissions have durable authoritative anonymous and Vendor provenance',
        async () => {
          const result = message<{
            rows: Array<{
              mode: string;
              vendorId: number | null;
              answers: Record<string, unknown>;
            }>;
          }>(server, 'submissions');
          server.send({ inspect: true });
          const rows = (await result).rows;
          assert.equal(rows.length, 2);
          const [anonymous, vendor] = rows;
          assert.ok(anonymous && vendor);
          assert.equal(anonymous.mode, 'ANONYMOUS');
          assert.equal(anonymous.vendorId, null);
          assert.equal(vendor.mode, 'AUTHORIZED_VENDOR');
          assert.ok(vendor.vendorId);
          assert.equal(vendor.answers.businessName, 'Retained Browser Orchard');
        },
      );
      success = true;
      console.log(
        JSON.stringify({
          suite: 'unified-account-browser',
          passed,
          failed: 0,
          database: ready.database,
        }),
      );
    } finally {
      await browser.close();
    }
  } finally {
    if (server.connected && server.exitCode === null) {
      const exit = new Promise((r) => server.once('exit', r));
      server.send({ close: true, success });
      await exit;
    }
    for (const p of children) if (p.exitCode === null) p.kill();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
