import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
assert.equal(process.env.FRONTEND_NO_EVIDENCE, 'true');
const backend = resolve('../farmers-market-platform'),
  children: ChildProcess[] = [],
  origin = 'http://127.0.0.1:4342',
  publicOrigin = 'http://127.0.0.1:4341';
interface Ready {
  kind: 'ready';
  endpoint: string;
  shopEndpoint: string;
  channel: string;
  occurrenceId: number;
  applicationSlug: string;
  database: string;
  password: string;
}
function child(
  cwd: string,
  args: string[],
  env: Record<string, string | undefined>,
  ipc = false,
) {
  const p = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ipc ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
  });
  children.push(p);
  p.stdout?.on('data', (data) => process.stdout.write(data));
  p.stderr?.on('data', (data) => process.stderr.write(data));
  return p;
}
async function healthy(url: string) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* Startup is bounded. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Local server did not become ready');
}
let total = 0;
async function check(name: string, work: () => Promise<void>) {
  await work();
  total++;
  console.log('PASS Phase14 browser ' + name);
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  assert.equal(
    result.violations.length,
    0,
    JSON.stringify(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ),
  );
}
async function main() {
  const server = child(
    backend,
    [
      'node_modules/ts-node/dist/bin.js',
      '--project',
      'test/market-operations/tsconfig.json',
      'test/market-operations/run.ts',
      '--serve',
    ],
    { DB_HOST: '127.0.0.1' },
    true,
  );
  const ready = await new Promise<Ready>((accept, reject) => {
    server.on('message', (m) => {
      if (m && typeof m === 'object' && 'kind' in m && m.kind === 'ready')
        accept(m as Ready);
    });
    server.once('exit', (code) => reject(new Error('Harness exited ' + code)));
  });
  assert.match(ready.database, /^vendure_test_operations_/);
  try {
    const env = {
      APP_ENV: 'test',
      NODE_ENV: 'test',
      FRONTEND_FIXTURE_MODE: 'false',
      SHOP_API_URL: ready.shopEndpoint,
      PUBLIC_ADMIN_API_URL: ready.endpoint,
    };
    child(
      resolve('apps/admin'),
      [
        resolve('node_modules/vite/bin/vite.js'),
        '--host',
        '127.0.0.1',
        '--port',
        '4342',
        '--strictPort',
      ],
      env,
    );
    child(
      resolve('apps/storefront'),
      [
        resolve('node_modules/astro/bin/astro.mjs'),
        'dev',
        '--ignore-lock',
        '--host',
        '127.0.0.1',
        '--port',
        '4341',
      ],
      env,
    );
    await Promise.all([
      healthy(origin),
      healthy(publicOrigin + '/apply/' + ready.applicationSlug),
    ]);
    const browser = await chromium.launch({ headless: true });
    const adminContext = await browser.newContext();
    const publicContext = await browser.newContext();
    adminContext.setDefaultTimeout(30000);
    publicContext.setDefaultTimeout(30000);
    try {
      const page = await adminContext.newPage();
      await page.goto(origin + '/market/applications');
      await page.getByLabel('Email or username').fill('market-a@test.invalid');
      await page.getByLabel('Password').fill(ready.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page
        .getByRole('heading', { name: 'Applications', exact: true })
        .waitFor();
      await check(
        'live Market Admin navigation and application builder',
        async () => {
          await page.goto(origin + '/market/applications');
          await page
            .getByRole('heading', { name: 'Applications', exact: true })
            .waitFor();
          await page
            .getByRole('button', { name: 'Version 2 · draft', exact: true })
            .click();
          await page
            .getByRole('button', {
              name: 'Add question to Business',
              exact: true,
            })
            .click();
          await page
            .getByLabel('Question', { exact: true })
            .fill('Growing methods');
          await page
            .getByLabel('Question type', { exact: true })
            .selectOption('SINGLE_SELECT');
          await page.getByLabel('Option 1', { exact: true }).fill('Organic');
          await page
            .getByRole('button', { name: 'Add option', exact: true })
            .click();
          await page
            .getByLabel('Option 2', { exact: true })
            .fill('Conventional');
          await page
            .getByRole('button', { name: 'Preview application', exact: true })
            .click();
          await page
            .getByRole('group', { name: 'Growing methods', exact: true })
            .waitFor();
          await accessible(page);
          await page
            .getByRole('button', { name: 'Return to builder', exact: true })
            .click();
          await page
            .getByRole('button', { name: 'Save draft', exact: true })
            .click();
          await page.getByLabel('Application name', { exact: true }).waitFor();
        },
      );
      await check(
        'browser creates, customizes, previews and publishes a reusable application',
        async () => {
          await page
            .getByRole('button', { name: 'Create application', exact: true })
            .click();
          await page
            .getByLabel('Application name', { exact: true })
            .fill('Browser seasonal application');
          await page
            .getByLabel('Question', { exact: true })
            .fill('Trading business name');
          await page
            .getByLabel('Help text', { exact: true })
            .fill('The name visitors recognize');
          await page
            .getByRole('button', {
              name: 'Add question to Business',
              exact: true,
            })
            .click();
          await page
            .getByLabel('Question', { exact: true })
            .fill('Growing methods');
          await page
            .getByLabel('Question type', { exact: true })
            .selectOption('SINGLE_SELECT');
          await page.getByLabel('Option 1', { exact: true }).fill('Organic');
          await page
            .getByRole('button', { name: 'Add option', exact: true })
            .click();
          await page
            .getByLabel('Option 2', { exact: true })
            .fill('Conventional');
          const dates = page
            .getByRole('group', { name: 'Dates applicants may request' })
            .getByRole('checkbox');
          for (let i = 0; i < (await dates.count()); i++)
            await dates.nth(i).check();
          await page
            .getByRole('group', { name: 'Available rentals and add-ons' })
            .getByRole('checkbox')
            .first()
            .check();
          await page
            .getByRole('button', { name: 'Preview application', exact: true })
            .click();
          await page
            .getByLabel('Trading business name (required)', { exact: true })
            .waitFor();
          await accessible(page);
          await page
            .getByRole('button', { name: 'Return to builder', exact: true })
            .click();
          await page
            .getByRole('button', { name: 'Save and publish', exact: true })
            .click();
          await page
            .getByRole('button', { name: 'Back to applications', exact: true })
            .click();
          const record = page.locator('.ops-record-list > li').filter({
            has: page.getByRole('heading', {
              name: 'Browser seasonal application',
              exact: true,
            }),
          });
          await record
            .getByRole('button', { name: 'Version 1 · published', exact: true })
            .waitFor();
          ready.applicationSlug = (await record
            .locator('code')
            .textContent())!.replace('/apply/', '');
        },
      );
      await check(
        'anonymous browser submits external application without payment',
        async () => {
          const publicPage = await publicContext.newPage();
          await publicPage.goto(
            publicOrigin + '/apply/' + ready.applicationSlug,
          );
          await publicPage.waitForFunction(
            () =>
              document
                .querySelector('.ops-application')
                ?.getAttribute('data-ready') === 'true',
          );
          await publicPage
            .getByLabel('Trading business name (required)')
            .fill('Browser Flowers');
          await publicPage
            .getByLabel('Contact first name (required)')
            .fill('Casey');
          await publicPage
            .getByLabel('Contact last name (required)')
            .fill('Farmer');
          await publicPage
            .getByLabel('Email (required)', { exact: true })
            .fill('flowers@test.invalid');
          const dates = publicPage
            .getByRole('group', { name: 'Requested Market dates' })
            .getByRole('checkbox');
          for (let i = 0; i < (await dates.count()); i++)
            await dates.nth(i).check();
          await accessible(publicPage);
          await publicPage
            .getByRole('button', { name: 'Submit application', exact: true })
            .click();
          await publicPage
            .getByRole('heading', {
              name: 'Application submitted',
              exact: true,
            })
            .waitFor();
          await publicPage.close();
        },
      );
      await check(
        'manager browser accepts external application and assigns approved date',
        async () => {
          await page.goto(origin + '/market/application-submissions');
          await page
            .getByRole('button', { name: 'Browser Flowers', exact: true })
            .click();
          await page
            .getByRole('group', { name: 'Review requested dates and rentals' })
            .getByRole('checkbox')
            .last()
            .uncheck();
          await page
            .getByLabel('Compatible booth', { exact: true })
            .selectOption({ label: 'B12' });
          await page
            .getByRole('button', { name: 'Accept and assign', exact: true })
            .click();
          await page.getByText('accepted', { exact: false }).first().waitFor();
        },
      );
      await check(
        'real layout editor adds area, shapes and booth, undo redo, save and reload',
        async () => {
          await page.goto(origin + '/market/layouts');
          await page
            .getByRole('button', { name: 'Create layout', exact: true })
            .click();
          await page
            .getByRole('button', { name: 'Add booth', exact: true })
            .waitFor();
          await page
            .getByLabel('New area name', { exact: true })
            .fill('South lot');
          await page
            .getByRole('button', { name: 'Add area', exact: true })
            .click();
          for (const kind of [
            'rectangle',
            'circle',
            'triangle',
            'line',
            'text',
            'image',
          ])
            await page
              .getByRole('button', { name: 'Add ' + kind, exact: true })
              .click();
          await page
            .getByRole('button', { name: 'Add booth', exact: true })
            .click();
          await page.getByLabel('Width in feet', { exact: true }).fill('12');
          await page
            .getByLabel('Default fee in minor units', { exact: true })
            .fill('4000');
          await page.getByLabel('electricity', { exact: true }).check();
          await page.getByRole('button', { name: 'Undo', exact: true }).click();
          await page.getByRole('button', { name: 'Redo', exact: true }).click();
          await page
            .getByLabel('Preferred business suggestion', { exact: true })
            .selectOption({ label: 'Local Orchard' });
          await page.locator('.ops-canvas').scrollIntoViewIfNeeded();
          const booth = await page
            .locator('[data-element]')
            .last()
            .boundingBox();
          assert.ok(booth);
          await page.mouse.move(
            booth.x + booth.width / 2,
            booth.y + booth.height / 2,
          );
          await page.mouse.down();
          await page.mouse.move(
            booth.x + booth.width / 2 + 60,
            booth.y + booth.height / 2 + 35,
            { steps: 6 },
          );
          await page.mouse.up();
          assert.notEqual(
            await page.getByLabel('x', { exact: true }).inputValue(),
            '50',
          );
          const handle = await page.locator('[data-resize]').boundingBox();
          assert.ok(handle);
          await page.mouse.move(
            handle.x + handle.width / 2,
            handle.y + handle.height / 2,
          );
          await page.mouse.down();
          await page.mouse.move(
            handle.x + handle.width / 2 + 25,
            handle.y + handle.height / 2 + 20,
            { steps: 6 },
          );
          await page.mouse.up();
          assert.ok(
            Number(
              await page
                .getByLabel('Width in feet', { exact: true })
                .inputValue(),
            ) > 12,
          );
          await page.getByLabel('rotation', { exact: true }).fill('15');
          await page.getByRole('button', { name: 'Copy', exact: true }).click();
          await page
            .getByRole('button', { name: 'Paste', exact: true })
            .click();
          await page
            .getByRole('button', { name: 'Duplicate', exact: true })
            .click();
          await page
            .getByRole('button', {
              name: 'Save and publish layout',
              exact: true,
            })
            .click();
          await page
            .getByRole('heading', { name: 'Untitled layout', exact: true })
            .waitFor();
          await page
            .locator('.ops-record-list > li')
            .filter({
              has: page.getByRole('heading', {
                name: 'Untitled layout',
                exact: true,
              }),
            })
            .getByRole('button', { name: 'Version 1 · published', exact: true })
            .waitFor();
          await page.reload();
          await page
            .getByRole('heading', { name: 'Untitled layout', exact: true })
            .waitFor();
        },
      );
      await check(
        'public map search highlights booth and exposes no operational controls',
        async () => {
          const p = await publicContext.newPage();
          await p.goto(publicOrigin + `/occurrences/${ready.occurrenceId}/map`);
          await p.locator('astro-island:not([ssr]) .ops-map').waitFor();
          await p.getByLabel('Search Vendor or booth').fill('orchard');
          await p.locator('.booth-list-item > summary').first().click();
          await p
            .locator('.booth-list-details')
            .getByText('Local Orchard', { exact: true })
            .waitFor();
          assert.equal(
            await p
              .getByRole('button', {
                name: /manual payment|check in|manager note/i,
              })
              .count(),
            0,
          );
          await accessible(p);
          await p.close();
        },
      );
      for (const width of [390, 768, 1280])
        await check(
          `Market Day responsive and accessibility at ${width}`,
          async () => {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(origin + `/market/day/${ready.occurrenceId}`);
            await page
              .getByRole('heading', { name: 'Market Day', exact: true })
              .waitFor();
            await page.getByLabel('Search expected Vendors').waitFor();
            const overflows = await page.evaluate(
              () =>
                document.documentElement.scrollWidth > window.innerWidth + 1,
            );
            assert.equal(overflows, false);
            await accessible(page);
          },
        );
      await check(
        'Market Day browser attendance and manager-note persistence',
        async () => {
          const cards = page.locator('.ops-day-card');
          const card = cards
            .filter({
              has: page.getByRole('heading', {
                name: 'Guest One',
                exact: true,
              }),
            })
            .or(
              cards.filter({
                has: page.getByRole('heading', {
                  name: 'Guest Two',
                  exact: true,
                }),
              }),
            )
            .first();
          await card
            .getByRole('button', { name: 'Check in', exact: true })
            .click();
          await card
            .getByRole('button', { name: 'Undo check-in', exact: true })
            .waitFor();
          await card.getByLabel('Final attendance').selectOption('NO_SHOW');
          await page.waitForFunction(
            () =>
              document
                .querySelector('.ops-workspace')
                ?.getAttribute('aria-busy') === 'false',
          );
          await card
            .getByLabel('Private occurrence notes')
            .fill('Forgot weights');
          await card
            .getByRole('button', { name: 'Save manager note', exact: true })
            .click();
          await page.waitForFunction(
            () =>
              document
                .querySelector('.ops-workspace')
                ?.getAttribute('aria-busy') === 'false',
          );
          await page.reload();
          await page.getByLabel('Search expected Vendors').waitFor();
          assert.ok(
            (
              await page
                .getByLabel('Private occurrence notes')
                .evaluateAll((nodes) =>
                  nodes.map((n) => (n as HTMLInputElement).value),
                )
            ).includes('Forgot weights'),
          );
        },
      );
      await check(
        'Market Day moves through the selected map booth while preserving a paid invoice',
        async () => {
          const boothRow = page
            .locator('summary span')
            .filter({ hasText: /^A12$/ })
            .locator('..')
            .locator('..');
          await boothRow.locator('summary').click();
          await boothRow
            .getByRole('button', { name: 'Add business to booth', exact: true })
            .click();
          const selected = page.getByRole('dialog', { name: 'Booth A12' });
          await selected
            .getByLabel('Business for selected booth')
            .selectOption({ label: 'Local Orchard' });
          await selected
            .getByLabel(
              'Keep the issued invoice unchanged after this move or rental change',
            )
            .check();
          await selected
            .getByRole('button', {
              name: 'Save booth and rental changes',
              exact: true,
            })
            .click();
          await page.waitForFunction(
            () =>
              document
                .querySelector('.ops-workspace')
                ?.getAttribute('aria-busy') === 'false',
          );
          await selected
            .getByText('Assigned to Local Orchard.', { exact: false })
            .waitFor();
          await selected.locator('summary').click();
          await selected.getByText('Total $65.00', { exact: false }).waitFor();
          await selected.getByText('paid', { exact: true }).waitFor();
          // Clear the selected panel before subsequent list actions.
          await page.goto(origin + `/market/day/${ready.occurrenceId}`);
        },
      );
      await check(
        'Market Day issues and settles a manual invoice in the browser',
        async () => {
          await page.getByLabel('Search expected Vendors').waitFor();
          const draftCard = page.locator('.ops-day-card').filter({
            has: page.locator('summary').filter({ hasText: 'draft' }),
          });
          const business = (await draftCard
            .getByRole('heading')
            .first()
            .textContent())!;
          const card = page.locator('.ops-day-card').filter({
            has: page.getByRole('heading', { name: business, exact: true }),
          });
          await card.locator('summary').click();
          await card
            .getByRole('button', { name: 'Issue manual invoice', exact: true })
            .click();
          await card
            .getByLabel('Payment method', { exact: true })
            .selectOption('CASH');
          await card
            .getByLabel('Amount in minor units', { exact: true })
            .fill('4000');
          await card
            .getByLabel('Payment note', { exact: true })
            .fill('Recorded at the market');
          await card
            .getByRole('button', { name: 'Record manual payment', exact: true })
            .click();
          await page.waitForFunction(
            () =>
              document
                .querySelector('.ops-workspace')
                ?.getAttribute('aria-busy') === 'false',
          );
          await page.getByText('2 paid', { exact: false }).waitFor();
        },
      );
      await check(
        'linked Vendor browser sees its own safe booth projection',
        async () => {
          const context = await browser.newContext();
          const p = await context.newPage();
          await p.goto(origin + '/vendor/booths');
          await p
            .getByLabel('Email or username')
            .fill('identity-owner-0@test.invalid');
          await p.getByLabel('Password').fill(ready.password);
          await p.getByRole('button', { name: 'Sign in', exact: true }).click();
          await p
            .getByRole('heading', {
              name: 'Your booth assignments',
              exact: true,
            })
            .waitFor();
          assert.equal(
            await p
              .getByRole('button', {
                name: 'Record manual payment',
                exact: true,
              })
              .count(),
            0,
          );
          await accessible(p);
          await context.close();
        },
      );
      await check(
        'booth billing provider stays unconfigured and manual invoices remain visible',
        async () => {
          await page.goto(origin + '/market/booth-billing');
          await page
            .getByText('Online invoicing not configured', { exact: true })
            .waitFor();
          assert.equal(
            await page
              .getByRole('button', { name: 'Send online invoice', exact: true })
              .isDisabled(),
            true,
          );
          await accessible(page);
        },
      );
      console.log(`Phase14 browser totals: ${total} passed, 0 failed`);
    } finally {
      await browser.close();
      server.send({ close: true });
      await new Promise<void>((r) => server.once('exit', () => r()));
    }
  } catch (error) {
    if (server.exitCode === null && server.connected) {
      server.send({ close: true });
      await new Promise<void>((r) => server.once('exit', () => r()));
    }
    throw error;
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const p of children) if (p.exitCode === null) p.kill();
  });
