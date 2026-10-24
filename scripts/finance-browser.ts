import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const dir = resolve('docs/financial-reporting'),
  saved = JSON.parse(
    readFileSync(resolve(dir, 'local-fixture.json'), 'utf8'),
  ) as {
    database: string;
    kind: string;
    vendorChannel: string;
    managerChannel: string;
  };
assert.match(saved.database, /^vendure_test_pos_demo_\d+_[a-f0-9]+$/);
assert.equal(saved.kind, 'isolated-native-financial-fixture');
mkdirSync(dir, { recursive: true });
const results: Array<{ name: string; status: string; detail?: string }> = [],
  errors: string[] = [],
  base = 'http://localhost:4596',
  range = 'from=2026-09-01&through=2026-09-30&market=ALL&currency=USD',
  password = 'local-identity-regression-only-password';
const browser = await chromium.launch({ headless: true });
let success = false;
function diagnostic(error: unknown) {
  return String(error).replace(
    /([?&](?:code|correlation)=)[A-Za-z0-9_-]+/g,
    '$1[redacted]',
  );
}
async function check(name: string, work: () => Promise<void>) {
  console.log('Checking ' + name);
  await work();
  results.push({ name, status: 'PASS' });
  console.log('PASS ' + name);
}
async function login(page: Page, email: string, path: string) {
  await page.goto('http://auth.platform.localhost:4378/account/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), {
    timeout: 30000,
  });
  await page.goto(`${base}/${path.split('/')[0]}?account=1`);
  await page
    .getByRole('link', { name: 'Finances', exact: true })
    .waitFor({ timeout: 45000 });
  await page.goto(`${base}/${path}?${range}`);
  await expect(
    page.getByRole('heading', { name: 'Finances', exact: true }),
  ).toBeVisible({ timeout: 45000 });
  await expect(page.locator('.finance-summary')).toBeVisible({
    timeout: 30000,
  });
}
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  context.setDefaultTimeout(20000);
  context.setDefaultNavigationTimeout(30000);
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['http:', 'https:'].includes(url.protocol) &&
      !['localhost', '127.0.0.1', '::1'].includes(url.hostname) &&
      !url.hostname.endsWith('.localhost')
      ? route.abort()
      : route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await check(
    'Native account login and vendor summary match the monthly fixture',
    async () => {
      await login(page, 'manna-roots@example.test', 'vendor/finances');
      await expect(page.locator('.finance-summary')).toContainText('$2,209.50');
      await expect(page.locator('.finance-summary')).toContainText('$417.25');
      await expect(page.locator('.finance-summary')).toContainText('$1,770.60');
    },
  );
  await check(
    'Full-width responsive chart and readable labels at 1280, 768 and 390 pixels',
    async () => {
      for (const width of [1280, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.locator('.finance-main-graph')).toBeVisible();
        await page.waitForFunction(() => {
          const svg = document.querySelector<SVGSVGElement>(
            '.finance-main-graph',
          );
          return (
            svg &&
            Math.abs(
              svg.viewBox.baseVal.width - svg.getBoundingClientRect().width,
            ) < 24
          );
        });
        const g = await page.locator('.finance-main-graph').evaluate((svg) => {
          const rect = svg.getBoundingClientRect(),
            card = svg.closest('.card')!,
            style = getComputedStyle(card);
          return {
            width: rect.width,
            content:
              card.getBoundingClientRect().width -
              parseFloat(style.paddingLeft) -
              parseFloat(style.paddingRight) -
              parseFloat(style.borderLeftWidth) -
              parseFloat(style.borderRightWidth),
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            label:
              (parseFloat(
                getComputedStyle(svg.querySelector('text')!).fontSize,
              ) *
                rect.width) /
              (svg as SVGSVGElement).viewBox.baseVal.width,
          };
        });
        assert.ok(
          Math.abs(g.width - g.content) < 3,
          JSON.stringify({ viewportWidth: width, ...g }),
        );
        assert.equal(
          g.overflow,
          false,
          JSON.stringify({ viewportWidth: width, ...g }),
        );
        assert.ok(g.label >= 10.5);
      }
      await page.setViewportSize({ width: 1280, height: 1000 });
    },
  );
  await check(
    'Negative values, zero baseline, daily details and modal focus restoration',
    async () => {
      await page.getByRole('combobox', { name: 'Metric', exact: true }).click();
      await page
        .getByRole('option', { name: 'Gross sales', exact: true })
        .click();
      await page.getByRole('option', { name: 'Expenses', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(
        page.locator('.finance-negative-point[data-value="-27500"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('.finance-main-graph .finance-zero'),
      ).toHaveCount(1);
      await page
        .getByRole('button', { name: 'Daily values', exact: true })
        .click();
      await expect(
        page
          .getByRole('dialog', { name: 'Daily financial values' })
          .getByRole('row')
          .filter({ hasText: '2026-09-08' }),
      ).toContainText('-$275.00');
      await page.keyboard.press('Escape');
      const trigger = page
        .getByRole('region', { name: 'Profit by product', exact: true })
        .getByRole('button', { name: 'Green Garden Juice', exact: true });
      await trigger.click();
      await expect(
        page.getByRole('dialog', { name: 'Green Garden Juice' }),
      ).toContainText('$651.55');
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    },
  );
  await check(
    'Market, independent, custom date and spending filters update together',
    async () => {
      await page.getByLabel('Sales scope').selectOption('INDEPENDENT');
      await expect(page.locator('.finance-summary')).toContainText('$178.50');
      await expect(page.locator('.finance-summary')).toContainText('$101.60');
      await page
        .getByLabel('Sales scope')
        .selectOption({ label: 'Boerne Farmers Market' });
      await expect(page.locator('.finance-summary')).toContainText('$209.95');
      await page.getByLabel('Sales scope').selectOption('ALL');
      await expect(page.locator('.finance-summary')).toContainText('$417.25');
      await page.getByLabel('Period', { exact: true }).selectOption('custom');
      await page.getByLabel('From', { exact: true }).fill('2026-09-08');
      await page.getByLabel('Through', { exact: true }).fill('2026-09-08');
      await expect(page.locator('.finance-summary')).toContainText('-$275.00');
      await page.getByLabel('Through', { exact: true }).fill('2026-09-30');
      await page.getByLabel('From', { exact: true }).fill('2026-09-01');
      await expect(page.locator('.finance-summary')).toContainText('$417.25');
      await page.getByLabel('Show expenses by').selectOption('spending');
      const card = page.getByRole('region', { name: 'Expenses by category' });
      await expect(card).toContainText('$180.00');
      await expect(card).toContainText('$90.00');
      await page.getByRole('button', { name: 'Category details' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Expense categories' }),
      ).toContainText('$12.50');
      await page.keyboard.press('Escape');
    },
  );
  await check('Finance dashboard accessibility', async () => {
    const result = await new AxeBuilder({ page })
      .include('.finance-workspace')
      .analyze();
    assert.deepEqual(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
  });
  await check(
    'Hover cards, donut shares, left-aligned controls and updates without navigation',
    async () => {
      const graph = page.locator('.finance-main-graph');
      await graph.evaluate((el) => el.setAttribute('data-retained', 'true'));
      const metric = page.getByRole('combobox', {
          name: 'Metric',
          exact: true,
        }),
        period = page.getByLabel('Period', { exact: true });
      const a = await metric.boundingBox(),
        b = await period.boundingBox();
      assert.ok(a && b && Math.abs(a.x - b.x) < 2 && a.y > b.y);
      await metric.click();
      await page
        .getByRole('option', { name: 'Gross sales', exact: true })
        .click();
      await page.getByRole('option', { name: 'Expenses', exact: true }).click();
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', {
          name: '2026-09-20, Gross sales: $252.00',
          exact: true,
        })
        .hover();
      await expect(page.getByRole('tooltip')).toContainText('2026-09-20');
      await expect(page.getByRole('tooltip')).toContainText('$252.00');
      const product = page
        .getByRole('region', { name: 'Profit by product', exact: true })
        .locator('.finance-donut-slice')
        .first();
      await product.scrollIntoViewIfNeeded();
      const location = await product.evaluate((el) => {
        const path = el as SVGPathElement;
        const point = path
          .getPointAtLength(path.getTotalLength() / 2)
          .matrixTransform(path.getScreenCTM()!);
        return { x: point.x, y: point.y };
      });
      await page.mouse.move(location.x, location.y);
      await expect(page.getByRole('tooltip')).toContainText(
        'Green Garden Juice',
      );
      await expect(page.getByRole('tooltip')).toContainText('% of total');
      await page.getByLabel('Group by', { exact: true }).selectOption('weekly');
      await expect(graph).toHaveAttribute('data-retained', 'true');
      await page.getByLabel('Sales scope').selectOption('INDEPENDENT');
      await expect(page.locator('.finance-summary')).toContainText('$101.60');
      await expect(graph).toHaveAttribute('data-retained', 'true');
      await page.getByLabel('Sales scope').selectOption('ALL');
      await expect(page.locator('.finance-summary')).toContainText('$417.25');
      await page.getByLabel('Group by', { exact: true }).selectOption('daily');
    },
  );
  const name = `Finance browser delivery ${Date.now()}`;
  await check(
    'Mobile expense create and edit change authoritative totals',
    async () => {
      await page.setViewportSize({ width: 390, height: 1000 });
      await page
        .getByRole('button', { name: 'Add Expense', exact: true })
        .click();
      const form = page.getByRole('dialog', {
        name: 'Add Expense',
        exact: true,
      });
      await form.getByLabel('Expense description').fill(name);
      await form.getByLabel('Amount (USD)').fill('10.00');
      await form.getByLabel('Date', { exact: true }).fill('2026-09-08');
      await form
        .getByLabel('Category', { exact: true })
        .selectOption('Transportation');
      await form
        .getByRole('button', { name: 'Save expense', exact: true })
        .click();
      await expect(
        page.getByRole('dialog', { name, exact: true }),
      ).toBeVisible();
      await expect(page.locator('.finance-summary')).toContainText('$407.25');
      await page
        .getByRole('button', { name: 'Edit expense', exact: true })
        .click();
      await page.getByLabel('Amount (USD)').fill('12.00');
      await page
        .getByRole('button', { name: 'Save expense', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'Edit expense', exact: true }),
      ).toBeVisible();
      await expect(page.locator('.finance-summary')).toContainText('$405.25');
      const result = await new AxeBuilder({ page })
        .include('dialog[open]')
        .analyze();
      assert.deepEqual(
        result.violations.map((v) => v.id),
        [],
      );
    },
  );
  if (process.env.FINANCE_LIVE_RECEIPTS === 'true')
    await check(
      'Live local scanner upload and private receipt preview',
      async () => {
        await page
          .getByLabel('Receipt (image or PDF, up to 10 MB)')
          .setInputFiles({
            name: 'finance-browser-receipt.png',
            mimeType: 'image/png',
            buffer: Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1kAAAAASUVORK5CYII=',
              'base64',
            ),
          });
        await page
          .getByRole('button', { name: 'View receipt', exact: true })
          .click({ timeout: 45000 });
        await expect(
          page
            .getByRole('dialog', { name: 'finance-browser-receipt.png' })
            .getByRole('img', { name: 'Uploaded expense receipt' }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
      },
    );
  else
    results.push({
      name: 'Live local scanner upload and private receipt preview',
      status: 'NOT_RUN',
      detail:
        'Controlled scanner tests passed; run with FINANCE_LIVE_RECEIPTS=true and a healthy local scanner.',
    });
  await check(
    'Void, auditable compact logs and restored monthly totals',
    async () => {
      await page
        .getByRole('button', { name: 'Void expense', exact: true })
        .click();
      await page
        .getByRole('dialog', { name: 'Void this expense?' })
        .getByRole('button', { name: 'Void expense', exact: true })
        .click();
      await expect(
        page
          .getByRole('dialog', { name, exact: true })
          .getByRole('button', { name: 'Edit expense', exact: true }),
      ).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(page.locator('.finance-summary')).toContainText('$417.25');
      await page
        .getByRole('link', { name: 'Manage Expenses', exact: true })
        .click();
      await page.getByLabel('Search expenses').fill(name);
      await expect(page.locator('thead th')).toHaveCount(2);
      await page
        .getByRole('button', { name: `Open ${name}`, exact: true })
        .click();
      await expect(
        page.getByRole('dialog', { name, exact: true }),
      ).toContainText('Expense history');
      await page.keyboard.press('Escape');
      await page
        .getByRole('link', { name: 'View Transactions', exact: true })
        .click();
      await page.getByLabel('Search transactions').fill('Green Garden');
      await expect(page.locator('thead th')).toHaveCount(2);
      await page.locator('.ui-record-trigger').first().click();
      await expect(page.getByRole('dialog')).toContainText('Production cost');
      await page.keyboard.press('Escape');
    },
  );
  await check('CSV export matches the selected month', async () => {
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page.locator('.finance-summary')).toContainText('$417.25');
    const event = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Export Report', exact: true })
      .click();
    await (await event).saveAs(resolve(dir, 'browser-export.csv'));
    const csv = readFileSync(resolve(dir, 'browser-export.csv'), 'utf8');
    assert.ok(csv.includes('"220950"'));
    assert.ok(csv.includes('"41725"'));
  });
  const managerContext = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: 'reduce',
    }),
    manager = await managerContext.newPage();
  managerContext.setDefaultTimeout(20000);
  managerContext.setDefaultNavigationTimeout(30000);
  manager.on('pageerror', (e) => errors.push(e.message));
  await check(
    'Manager login, collections, event profitability and separate scope',
    async () => {
      await login(manager, 'market.manager@example.test', 'market/finances');
      await expect(manager.locator('.finance-summary')).toContainText(
        '$140.00',
      );
      await expect(manager.locator('.finance-summary')).toContainText('$52.00');
      await expect(
        manager.getByRole('region', { name: 'Market revenue' }),
      ).toContainText('$15.00');
      await expect(
        manager.getByRole('region', { name: 'Profit by product' }),
      ).toHaveCount(0);
      await expect(
        manager.getByRole('region', { name: 'Profit by event' }),
      ).toContainText('$23.00');
    },
  );
  await check('No runtime page errors', async () => {
    assert.deepEqual(errors, []);
  });
  await check(
    'Account settings persist the reporting time zone and restore the reference zone',
    async () => {
      for (const zone of ['Asia/Tokyo', 'America/Chicago']) {
        await page.goto(`${base}/vendor/settings`);
        const input = page.getByRole('combobox', {
          name: 'Time zone',
          exact: true,
        });
        await input.fill(zone.replaceAll('_', ' '));
        await page
          .getByRole('option', { name: zone.replaceAll('_', ' '), exact: true })
          .click();
        const response = page.waitForResponse(
          (r) =>
            r.request().postData()?.includes('SaveOwnAccountTimezone') ?? false,
        );
        await page
          .getByRole('button', { name: 'Save time zone', exact: true })
          .click();
        assert.equal(
          (await (await response).json()).data.setSettingsStoreValue.result,
          true,
        );
        await page.goto(`${base}/vendor/finances?${range}`);
        await expect(page.locator('.finance-legend')).toContainText(
          `Time zone: ${zone}`,
        );
      }
      await expect(page.locator('.finance-summary')).toContainText('$417.25');
    },
  );
  success = true;
} catch (error) {
  const failures = [];
  for (const context of browser.contexts())
    for (const page of context.pages()) {
      failures.push({
        path: new URL(page.url()).pathname,
        text: (await page.locator('body').innerText()).slice(0, 6000),
      });
    }
  writeFileSync(
    resolve(dir, 'browser-failure.json'),
    JSON.stringify(failures, null, 2) + '\n',
  );
  results.push({
    name: 'Browser qualification',
    status: 'FAIL',
    detail: diagnostic(error),
  });
  throw error;
} finally {
  await browser.close();
  writeFileSync(
    resolve(dir, 'browser-results.json'),
    JSON.stringify(
      { database: saved.database, success, results, errors },
      null,
      2,
    ) + '\n',
  );
}
