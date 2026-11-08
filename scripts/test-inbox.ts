import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createServer } from 'node:net';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
assert.equal(process.env.FRONTEND_NO_EVIDENCE, 'true');
const backend = resolve('../farmers-market-platform'),
  central = 'http://auth.platform.localhost:4337',
  admin = 'http://localhost:4555';
const children: ChildProcess[] = [];
function child(
  cwd: string,
  args: string[],
  env: Record<string, string> = {},
  ipc = false,
) {
  const p = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ipc ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
  });
  children.push(p);
  p.stdout?.pipe(process.stdout);
  p.stderr?.pipe(process.stderr);
  return p;
}
async function healthy(url: string) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Local service did not start: ' + url);
}
async function ready(p: ChildProcess) {
  return new Promise<{
    endpoint: string;
    shopEndpoint: string;
    database: string;
    email: string;
    password: string;
  }>((accept, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Inbox fixture startup timed out')),
      240000,
    );
    p.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error('Inbox fixture exited ' + code));
    });
    p.on('message', (m: unknown) => {
      if (m && typeof m === 'object' && 'kind' in m && m.kind === 'ready') {
        clearTimeout(timeout);
        accept(m as never);
      }
    });
  });
}
let passed = 0;
async function check(name: string, work: () => Promise<void>) {
  await work();
  passed++;
  console.log('PASS inbox browser: ' + name);
}
async function visible(page: Page, label: string) {
  const locator = page.getByLabel(label, { exact: true });
  if (!(await locator.isVisible()))
    await page.locator('.ui-dashboard-menu > summary').click();
  return locator;
}
// Refuse to interact with any existing local service at the test origins.
for (const port of [4337, 4555])
  for (const host of ['127.0.0.1', '::1'])
    await new Promise<void>((resolve, reject) => {
      const probe = createServer();
      probe.once('error', () =>
        reject(
          new Error(`Inbox test port ${port} is already in use on ${host}.`),
        ),
      );
      probe.listen({ port, host }, () =>
        probe.close((error) => (error ? reject(error) : resolve())),
      );
    });
const server = child(
  backend,
  [
    '--require',
    './test/no-evidence.cjs',
    resolve(backend, 'node_modules/ts-node/dist/bin.js'),
    '--project',
    'test/platform-inbox/tsconfig.json',
    'test/platform-inbox/run.ts',
    '--serve',
  ],
  { DB_HOST: '127.0.0.1' },
  true,
);
let success = false;
try {
  const fixture = await ready(server);
  assert.match(fixture.database, /^vendure_test_inbox_/);
  const env = {
    APP_ENV: 'test',
    NODE_ENV: 'test',
    FRONTEND_FIXTURE_MODE: 'false',
    SHOP_API_URL: fixture.shopEndpoint,
    PUBLIC_ADMIN_API_URL: fixture.endpoint.replace('127.0.0.1', 'localhost'),
    PLATFORM_ACCOUNT_ORIGIN: central,
    ADMIN_ORIGIN: admin,
    PLATFORM_ACCOUNT_BRIDGE_KEY: 'inbox-disposable-test-bridge-secret-only',
  };
  child(
    resolve('apps/storefront'),
    [
      '--input-type=module',
      '--eval',
      "import {dev} from 'astro'; await dev({server:{host:'127.0.0.1',port:4337}});",
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
    healthy('http://127.0.0.1:4337/robots.txt'),
    healthy(admin),
  ]);
  if (process.argv.includes('--serve')) {
    console.log(
      `Disposable inbox demo is ready.\nCustomer: ${central}/account/notifications\nVendor: ${admin}/vendor/notifications\nMarket: ${admin}/market/notifications\nTest email: ${fixture.email}\nTest password: ${fixture.password}\nUse the Customer account selector to switch modes. Press Enter here to close the owned services and clean up the disposable database.`,
    );
    const input = createInterface({ input: process.stdin });
    await new Promise<void>((resolve) => input.once('line', () => resolve()));
    input.close();
    success = true;
  } else {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext(),
        page = await context.newPage(),
        errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(central + '/account/login');
      await page.getByLabel('Email', { exact: true }).fill(fixture.email);
      await page.getByLabel('Password', { exact: true }).fill(fixture.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page
        .getByRole('heading', { name: 'Overview', exact: true })
        .waitFor();
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await check(
          `Customer bell, unified roles, keyboard and responsive layout at ${width}px`,
          async () => {
            await page.goto(central + '/account/notifications');
            await page
              .getByRole('list', { name: 'Notification inbox' })
              .waitFor();
            await page.waitForFunction(
              () =>
                !document.querySelector(
                  'astro-island[component-export="default"][ssr]',
                ),
            );
            const nav = page.locator(
              width === 1280 ? '.admin-sidebar' : '.ui-dashboard-mobile-links',
            );
            if (width === 390)
              await page.locator('.ui-dashboard-menu > summary').click();
            assert.equal(
              await nav
                .getByRole('link', { name: 'Notifications', exact: true })
                .count(),
              1,
            );
            assert.equal(
              await nav
                .getByRole('link', { name: 'Notifications', exact: true })
                .getAttribute('aria-current'),
              'page',
            );
            assert.equal(
              await nav
                .locator('a[href="/account/notifications"] svg path')
                .getAttribute('d'),
              'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
            );
            if (width === 390)
              await page.locator('.ui-dashboard-menu > summary').click();
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              true,
            );
            const bell = page.locator('.notification-bell > details > summary');
            assert.ok(await bell.isVisible());
            await bell.focus();
            await page.keyboard.press('Enter');
            await page
              .getByRole('link', { name: 'Open notification inbox' })
              .waitFor();
            assert.ok(
              (await page.locator('.notification-preview-item').count()) > 0,
            );
            await bell.click();
            const roles = await page
              .locator('.notification-list .notification-context')
              .allTextContents();
            assert.ok(roles.some((s) => s.includes('Customer')));
            assert.ok(roles.some((s) => s.includes('Vendor')));
            assert.ok(roles.some((s) => s.includes('Market Manager')));
            const violations = (
              await new AxeBuilder({ page })
                .include('.notification-center')
                .analyze()
            ).violations;
            assert.deepEqual(
              violations.map((v) => v.id),
              [],
            );
            for (const colorScheme of ['dark', 'light'] as const) {
              await page.emulateMedia({ colorScheme });
              const badges = await page
                .locator('.notification-list .notification-role')
                .evaluateAll((nodes) =>
                  nodes.map((node) => ({
                    text: node.textContent,
                    color: getComputedStyle(node).color,
                    background: getComputedStyle(node).backgroundColor,
                    icon: !!node.querySelector('svg[aria-hidden="true"]'),
                  })),
                );
              assert.ok(
                badges.every(
                  (b) => b.text && b.icon && b.color !== b.background,
                ),
              );
              const roles = new Set(badges.map((b) => b.background));
              assert.ok(roles.size >= 3);
              assert.deepEqual(
                (
                  await new AxeBuilder({ page })
                    .include('.notification-center')
                    .analyze()
                ).violations.map((v) => v.id),
                [],
              );
            }
            if (width === 390) {
              await page
                .locator('.notification-mobile-actions summary')
                .first()
                .click();
              assert.ok(
                await page
                  .locator('.notification-mobile-actions .notification-actions')
                  .first()
                  .isVisible(),
              );
            }
          },
        );
        await check(
          `detail, filters, bulk selection and exact unsubscribe at ${width}px`,
          async () => {
            await page
              .getByLabel('Receiving role', { exact: true })
              .selectOption('vendor');
            await page.waitForFunction(() =>
              Array.from(
                document.querySelectorAll(
                  '.notification-list .notification-context',
                ),
              ).every((e) => e.textContent?.includes('Vendor')),
            );
            const rows = page.locator('.notification-row');
            const optional = rows.filter({ hasText: 'New order' }).first();
            await optional.locator('.notification-open').click();
            const dialog = page.getByRole('dialog');
            await dialog.waitFor();
            assert.match(await dialog.innerText(), /order/i);
            const destination = dialog.getByRole('link', {
              name: 'View Orders',
              exact: true,
            });
            assert.ok(await destination.isVisible());
            assert.match(
              (await destination.getAttribute('href'))!,
              /^\/api\/notifications\?id=/,
            );
            assert.ok(
              !(await dialog.innerText()).includes('Open related record'),
            );
            await destination.click();
            await page.waitForURL(admin + '/**');
            await page.goto(central + '/account/notifications');
            await page
              .getByRole('list', { name: 'Notification inbox' })
              .waitFor();
            await page
              .getByLabel('Receiving role', { exact: true })
              .selectOption('vendor');
            await page.waitForFunction(
              () =>
                Array.from(
                  document.querySelectorAll(
                    '.notification-list .notification-context',
                  ),
                ).length > 0 &&
                Array.from(
                  document.querySelectorAll(
                    '.notification-list .notification-context',
                  ),
                ).every((e) => e.textContent?.includes('Vendor')),
            );
            await page
              .locator('.notification-row')
              .filter({ hasText: 'New order' })
              .first()
              .locator('.notification-open')
              .click();
            await dialog.waitFor();
            await dialog
              .getByRole('button', { name: 'Unsubscribe from this source' })
              .click();
            const confirm = page.getByRole('dialog', {
              name: 'Unsubscribe from this source',
            });
            await confirm.waitFor();
            assert.match(await confirm.innerText(), /Vendor/);
            await confirm
              .getByRole('button', { name: 'Unsubscribe', exact: true })
              .click();
            await confirm.waitFor({ state: 'hidden' });
            // Close the underlying detail, then manage the same durable scope.
            const openDialog = page.getByRole('dialog');
            if (await openDialog.isVisible())
              await openDialog
                .getByRole('button', { name: 'Close', exact: true })
                .click();
            await page.goto(central + '/account/notifications/unsubscribed');
            assert.equal(
              await page
                .locator('.admin-sidebar a[href="/account/notifications"]')
                .getAttribute('aria-current'),
              'page',
            );
            await page
              .getByRole('button', { name: 'Resubscribe' })
              .first()
              .click();
            await page.goto(central + '/account/notifications/settings');
            assert.equal(
              await page
                .locator('.admin-sidebar a[href="/account/notifications"]')
                .getAttribute('aria-current'),
              'page',
            );
            await page.getByLabel('Optional notification type').waitFor();
            await page.goto(central + '/account/notifications');
            await page
              .getByRole('list', { name: 'Notification inbox' })
              .waitFor();
            await page
              .getByRole('checkbox', {
                name: 'Select all notifications on this page',
              })
              .check();
            await page
              .locator('.notification-bulk')
              .getByRole('button', { name: 'Mark read', exact: true })
              .click();
            await page.waitForFunction(
              () =>
                document.querySelectorAll(
                  '.notification-list .notification-unread',
                ).length === 0,
            );
          },
        );
      }
      await check(
        'account switching preserves the unified inbox and unread count',
        async () => {
          const before = await page
            .locator('.notification-bell-label > span[aria-label]')
            .textContent();
          const customerSelector = await visible(page, 'Account mode');
          const vendorChoice = await customerSelector
            .locator('option')
            .filter({ hasText: 'Vendor: ' })
            .first()
            .getAttribute('value');
          assert.ok(vendorChoice);
          await customerSelector.selectOption(vendorChoice);
          await page.waitForURL(admin + '/**');
          await page.locator('.admin-topbar').waitFor();
          await page.goto(admin + '/vendor/notifications');
          try {
            await page
              .getByRole('list', { name: 'Notification inbox' })
              .waitFor();
          } catch (error) {
            console.error(
              'Admin inbox state: ' + (await page.locator('body').innerText()),
            );
            throw error;
          }
          await page.waitForFunction(
            (expected) =>
              document.querySelector(
                '.notification-bell-label > span[aria-label]',
              )?.textContent === expected,
            before,
          );
          assert.equal(
            await page
              .locator('.notification-bell-label > span[aria-label]')
              .textContent(),
            before,
          );
          await page.setViewportSize({ width: 1280, height: 900 });
          const sidebar = page.locator('.admin-sidebar');
          assert.equal(
            await sidebar
              .getByRole('link', { name: 'Notifications', exact: true })
              .count(),
            1,
          );
          await page
            .getByRole('button', { name: 'Collapse sidebar', exact: true })
            .click();
          assert.ok(
            await sidebar
              .getByRole('link', { name: 'Notifications', exact: true })
              .isVisible(),
          );
          assert.equal(
            await sidebar
              .getByRole('link', { name: 'Notifications', exact: true })
              .getAttribute('aria-current'),
            'page',
          );
          await page
            .getByRole('button', { name: 'Expand sidebar', exact: true })
            .click();
          const selector = await visible(page, 'Account mode');
          await selector.selectOption('MARKET_MANAGER');
          await page.locator('.admin-topbar').waitFor();
          await page.goto(admin + '/market/notifications');
          await page
            .getByRole('list', { name: 'Notification inbox' })
            .waitFor();
          await page.waitForFunction(
            (expected) =>
              document.querySelector(
                '.notification-bell-label > span[aria-label]',
              )?.textContent === expected,
            before,
          );
          assert.equal(
            await page
              .locator('.notification-bell-label > span[aria-label]')
              .textContent(),
            before,
          );
          assert.equal(
            await page
              .locator('.admin-sidebar')
              .getByRole('link', { name: 'Notifications', exact: true })
              .count(),
            1,
          );
          for (const target of [
            '/market/notifications/settings',
            '/market/notifications/unsubscribed',
          ]) {
            await page.goto(admin + target);
            assert.equal(
              await page
                .locator('.admin-sidebar a[href="/market/notifications"]')
                .getAttribute('aria-current'),
              'page',
            );
          }
        },
      );
      for (const width of [1280, 390])
        await check(
          `Live checklist composition, resolution links and source refresh at ${width}px`,
          async () => {
            await page.setViewportSize({ width, height: 900 });
            const modulePath =
              '/@fs/' +
              resolve('tests/browser/checklist-fixture.tsx').replaceAll(
                '\\',
                '/',
              );
            const data = {
              occurrenceId: '7',
              market: 'Disposable checklist rendering fixture',
              status: 'today',
              localDate: '2026-10-17',
              today: '2026-10-17',
              timezone: 'America/Chicago',
              generatedAt: '2026-10-17T12:00:00Z',
              items: [
                {
                  title: 'Required Vendor documents',
                  status: 'Needs attention',
                  count: 2,
                  explanation:
                    'Two Vendors have current outstanding document requirements.',
                  href: '/market/documents?view=reports&occurrence=7',
                  action: 'Review Documents',
                },
                {
                  title: 'Required policy acknowledgments',
                  status: 'Needs attention',
                  count: 1,
                  explanation:
                    'One Vendor has an outstanding required acknowledgment.',
                  href: '/market/documents?view=reports&occurrence=7',
                  action: 'Review Policies',
                },
              ],
            };
            await page.evaluate(
              async ({ modulePath, data }) =>
                (await import(modulePath)).mountChecklist(data),
              { modulePath, data },
            );
            const widget = page.locator('#browser-checklist');
            await widget
              .getByText('Needs attention (2)', { exact: true })
              .waitFor();
            assert.equal(await widget.getByRole('checkbox').count(), 0);
            assert.equal(
              await widget
                .getByRole('link', { name: 'Review Documents' })
                .getAttribute('href'),
              '/market/documents?view=reports&occurrence=7',
            );
            assert.ok(
              await widget.evaluate(
                (node) => node.scrollWidth <= node.clientWidth,
              ),
            );
            assert.deepEqual(
              (
                await new AxeBuilder({ page })
                  .include('#browser-checklist')
                  .analyze()
              ).violations.map((v) => v.id),
              [],
            );
            const resolved = {
              ...data,
              items: data.items.map((item) => ({
                ...item,
                count: 0,
                status: 'No outstanding requirements',
              })),
            };
            // The shell refresh remounts the page; remount with resolved facts.
            await page.evaluate(
              async ({ modulePath, data }) =>
                (await import(modulePath)).mountChecklist(data),
              { modulePath, data: resolved },
            );
            await widget
              .getByText('No outstanding requirements', { exact: true })
              .first()
              .waitFor();
          },
        );
      assert.deepEqual(errors, []);
      success = true;
    } finally {
      await browser.close();
    }
  }
} finally {
  if (server.connected) server.send?.({ close: true, success });
  let backendExit = server.exitCode;
  if (backendExit === null)
    backendExit = await new Promise<number | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 60000);
      server.once('exit', (code) => {
        clearTimeout(timeout);
        resolve(code);
      });
    });
  for (const p of children) if (p.exitCode === null) p.kill();
  if (success)
    assert.equal(
      backendExit,
      0,
      'Owned backend must finish its guarded database cleanup',
    );
}
console.log(
  `Inbox browser: ${passed} groups passed, without screenshots, video, traces or evidence files.`,
);
