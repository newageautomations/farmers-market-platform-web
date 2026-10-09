import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { testUrl, evidenceRoot } from './urls';

async function vendor(page: Page, path = '/vendor') {
  await page.goto((test.info().project.use.baseURL ?? testUrl(4322)) + path);
  await page.getByLabel('Preview scope').selectOption('VENDOR');
  await expect(
    page.getByText('Synthetic Vendor A', { exact: true }),
  ).toBeVisible();
}
async function navigate(page: Page, module: string) {
  await page.evaluate(
    (path) => {
      history.pushState(null, '', path);
      dispatchEvent(new PopStateEvent('popstate'));
    },
    `/vendor${module ? '/' + module : ''}`,
  );
}
async function ready(page: Page) {
  await expect(
    page.getByText('Loading current records', { exact: true }),
  ).toHaveCount(0);
}
const modules = [
  ['', 'Overview'],
  ['products', 'Products'],
  ['inventory', 'Inventory'],
  ['orders', 'Orders'],
  ['customers', 'Customers'],
  ['markets', 'Markets'],
  ['analytics', 'Analytics'],
] as const;

for (const width of [390, 768, 1280])
  test(`seven Vendor modules are responsive and accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await vendor(page);
    for (const [path, label] of modules) {
      await navigate(page, path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(label);
      await ready(page);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (process.env.FRONTEND_NO_EVIDENCE !== 'true')
        await page.screenshot({
          path: `${evidenceRoot}/vendor-fixture/${path || 'overview'}-${width}.png`,
          fullPage: true,
        });
    }
  });
test('catalog create, variant, exact price and authoritative metadata requery', async ({
  page,
}) => {
  await vendor(page, '/vendor/products');
  await page.getByRole('link', { name: 'Create product', exact: true }).click();
  await page.getByLabel('Product name').fill('Synthetic A Created box');
  await page.getByLabel('Slug', { exact: true }).fill('CREATED-BOX');
  await page
    .getByLabel('Description')
    .fill('Created through a simulated command');
  await page
    .getByRole('button', { name: 'Create product', exact: true })
    .click();
  await expect(page.getByLabel('Slug', { exact: true })).toHaveValue(
    'created-box',
  );
  const add = page.locator('.command-section').filter({
    has: page.getByRole('heading', { name: 'Add variant', exact: true }),
  });
  await add.getByLabel('Variant name').fill('Synthetic A New small box');
  await add.getByLabel('SKU', { exact: true }).fill('SYN-NEW');
  await add.getByLabel('Initial price (USD)').fill('8.25');
  await add.getByRole('button', { name: 'Add variant', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Owned variants' }),
  ).toContainText('$8.25');
  await page
    .getByText('Edit Synthetic A New small box', { exact: true })
    .click();
  const price = page.locator('.command-section').filter({
    has: page.getByRole('heading', { name: 'Canonical price', exact: true }),
  });
  await price.getByLabel('Price (USD)').fill('12.39');
  await price.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Owned variants' }),
  ).toContainText('$12.39');
  await page
    .getByText('Edit Synthetic A New small box', { exact: true })
    .click();
  const metadata = page.locator('.command-section').filter({
    has: page.getByRole('heading', { name: 'Variant metadata', exact: true }),
  });
  await metadata.getByLabel('Variant name').fill('Synthetic A Confirmed box');
  await metadata.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Owned variants' }),
  ).toContainText('Synthetic A Confirmed box');
  const product = page.locator('.command-section').filter({
    has: page.getByRole('heading', { name: 'Product metadata', exact: true }),
  });
  await product.getByLabel('Product name').fill('Synthetic A Updated box');
  await product.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByLabel('Product name')).toHaveValue(
    'Synthetic A Updated box',
  );
  await page
    .getByRole('link', { name: 'Products', exact: true })
    .last()
    .click();
  await page.getByLabel('Search products').fill('Updated box');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Owned products' }),
  ).toContainText('Synthetic A Updated box');
  await expect(page.locator('main')).not.toContainText('StockLevel');
});
test('restock and negative adjustment confirm then requery current physical stock', async ({
  page,
}) => {
  await vendor(page, '/vendor/inventory');
  const row = page.getByRole('row').filter({
    has: page.getByRole('rowheader', {
      name: 'Synthetic A Product 1 Synthetic A Variant 1',
      exact: true,
    }),
  });
  await expect(row).toContainText('40');
  await row.getByRole('button', { name: 'Restock', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Restock quantity').fill('5');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Restock', exact: true })
    .click();
  await expect(row.locator('td').nth(1)).toHaveText('55');
  await expect(row.locator('td').nth(3)).toHaveText('45');
  const trigger = row.getByRole('button', { name: 'Adjust', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog'))
    .toHaveCount(0)
    .catch(async () => expect(page.getByRole('dialog')).not.toBeVisible());
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole('dialog')
    .getByLabel('Signed adjustment quantity')
    .fill('-4');
  await page.getByRole('button', { name: 'Review adjustment' }).click();
  const confirmation = page.getByRole('dialog', {
    name: 'Confirm stock adjustment',
  });
  await expect(confirmation).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await confirmation.getByRole('button', { name: 'Confirm change' }).click();
  await expect(row.locator('td').nth(1)).toHaveText('51');
  await expect(row.locator('td').nth(3)).toHaveText('41');
});
test('partial Market portion keeps operational quantities separate from money', async ({
  page,
}) => {
  await vendor(page, '/vendor/orders/1401');
  const table = page.getByRole('table', { name: 'Operational order lines' });
  await expect(table.getByRole('row').nth(1).locator('td')).toHaveText([
    '5',
    '2',
    '1',
    '2',
  ]);
  await expect(page.locator('main')).toContainText('Market occurrence');
  await expect(page.locator('main')).toContainText('Settled refund $8.00');
  await page.getByText('Manage Synthetic A Variant 1', { exact: true }).click();
  await expect(page.locator('main')).toContainText('mixed fulfilled line');
  await expect(
    page.getByRole('button', { name: 'Review cancellation', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Review fulfillment cancellation' })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm change' })
    .click();
  await expect(table.getByRole('row').nth(1).locator('td')).toHaveText([
    '5',
    '0',
    '3',
    '2',
  ]);
  await expect(page.locator('main')).toContainText('Settled refund $8.00');
  await page.getByText('Manage Synthetic A Variant 1', { exact: true }).click();
  const fulfill = page.locator('.command-section').filter({
    has: page.getByRole('heading', { name: 'Fulfill quantity', exact: true }),
  });
  await fulfill.getByLabel('Quantity to fulfill').fill('1');
  await fulfill.getByRole('button', { name: 'Fulfill', exact: true }).click();
  await expect(table.getByRole('row').nth(1).locator('td')).toHaveText([
    '5',
    '1',
    '3',
    '1',
  ]);
  await navigate(page, 'orders/1402');
  await ready(page);
  await expect(page.locator('main')).toContainText('Direct Vendor');
  await page.getByText('Manage Synthetic A Variant 1', { exact: true }).click();
  await page.getByLabel('Quantity to cancel').fill('1');
  await page
    .getByRole('button', { name: 'Review cancellation', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm change' })
    .click();
  await expect(table.getByRole('row').nth(1).locator('td')).toHaveText([
    '5',
    '0',
    '1',
    '4',
  ]);
});
test('CRM search, pagination, detail and Vendor specific purchase history', async ({
  page,
}) => {
  await vendor(page, '/vendor/customers');
  await expect(
    page
      .getByRole('table', { name: 'Owned customer relationships' })
      .getByRole('row'),
  ).toHaveCount(21);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    page
      .getByRole('table', { name: 'Owned customer relationships' })
      .getByRole('row'),
  ).toHaveCount(4);
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await page
    .getByLabel('Search customer name or email')
    .fill('synthetic-1-23@');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    page
      .getByRole('table', { name: 'Owned customer relationships' })
      .getByRole('row'),
  ).toHaveCount(2);
  await page
    .getByRole('link', { name: 'Synthetic A Customer 23', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Synthetic A Customer 23', exact: true }),
  ).toBeVisible();
  const history = page.getByRole('table', {
    name: 'Vendor specific purchase history',
  });
  await expect(history).toContainText('Market');
  await expect(history).toContainText('Direct Vendor');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(history.getByRole('row')).toHaveCount(3);
  await expect(page.locator('main')).not.toContainText('Phone');
  await expect(page.locator('main')).not.toContainText('Address');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('Market participation, pending listing, offering caps and publication commands', async ({
  page,
}) => {
  await vendor(page, '/vendor/markets/1821');
  await expect(
    page.getByRole('table', { name: 'Market variant listings' }),
  ).toContainText('approved');
  await page
    .getByRole('button', { name: 'Configure participation', exact: true })
    .click();
  const participation = page.locator('.command-section').filter({
    has: page.getByRole('heading', { name: 'Participation', exact: true }),
  });
  await participation
    .getByLabel('Attendance', { exact: true })
    .selectOption('planned');
  await participation
    .getByLabel('Pickup instructions', { exact: true })
    .fill('Synthetic A revised pickup');
  await participation
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Market occurrences' }),
  ).toContainText('planned');
  await page.getByLabel('Owned variant', { exact: true }).selectOption('1102');
  const listing = page.locator('.command-section').filter({
    has: page.getByRole('heading', { name: 'Request listing', exact: true }),
  });
  await listing.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Market variant listings' }),
  ).toContainText('pending');
  await expect(page.getByRole('button', { name: /Approve/ })).toHaveCount(0);
  await page.getByLabel('Participation', { exact: true }).selectOption('1831');
  await page
    .getByLabel('Approved listing', { exact: true })
    .selectOption('1841');
  await page.getByLabel('Occurrence sales cap', { exact: true }).fill('25');
  const offering = page.locator('.command-section').filter({
    has: page.getByRole('heading', {
      name: 'Offering settings',
      exact: true,
    }),
  });
  await offering.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Occurrence offerings' }),
  ).toContainText('25');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(
    page
      .getByRole('table', { name: 'Market variant listings' })
      .getByText('published', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('row')
    .filter({ has: page.getByText('published', { exact: true }) })
    .getByRole('button', { name: 'Review unpublish', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm change' })
    .click();
  await expect(
    page
      .getByRole('table', { name: 'Market variant listings' })
      .getByText('unpublished', { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Market variant listings' }),
  ).toContainText('unpublished');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('permission presets and owner versus staff boundaries fail closed', async ({
  page,
}) => {
  await vendor(page, '/vendor/products');
  await page.getByLabel('Permission preset').selectOption('operations');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Access restricted',
  );
  await expect(
    page
      .locator('.admin-sidebar')
      .getByRole('link', { name: 'Products', exact: true }),
  ).toHaveCount(0);
  await navigate(page, 'inventory');
  await expect(
    page.getByRole('button', { name: 'Restock', exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel('Permission preset').selectOption('catalog');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Access restricted',
  );
  await navigate(page, 'products');
  await expect(
    page.getByRole('link', { name: 'Create product', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Permission preset').selectOption('staff');
  await expect(
    page.getByRole('link', { name: 'Create product', exact: true }),
  ).toHaveCount(0);
  await navigate(page, 'inventory');
  await ready(page);
  await expect(
    page.getByRole('button', { name: 'Restock', exact: true }),
  ).toHaveCount(0);
  await navigate(page, 'products/new');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Access restricted',
  );
});
test('Vendor switch removes every prior module record in one browser lifecycle', async ({
  page,
}) => {
  await vendor(page);
  for (const module of [
    'products',
    'inventory',
    'orders',
    'customers',
    'markets',
    'analytics',
  ]) {
    await navigate(page, module);
    if (module === 'analytics')
      await page.getByLabel('Analytics view').selectOption('products');
    await ready(page);
    await expect(page.locator('main')).toContainText('Synthetic A');
  }
  await page.getByLabel('Vendor preview').selectOption('2');
  for (const module of [
    'products',
    'inventory',
    'orders',
    'customers',
    'markets',
    'analytics',
  ]) {
    await navigate(page, module);
    if (module === 'analytics')
      await page.getByLabel('Analytics view').selectOption('products');
    await ready(page);
    await expect(page.locator('main')).not.toContainText('Synthetic A');
    await expect(page.locator('main')).toContainText('Synthetic B');
  }
  await navigate(page, 'customers/1201');
  await expect(page.getByRole('alert')).toContainText('Access restricted');
  await expect(page.locator('main')).not.toContainText('synthetic-1-');
});
test('optional states, projection metadata, exact currencies and generation paging', async ({
  page,
}) => {
  await vendor(page, '/vendor/analytics');
  await expect(
    page.getByRole('table', { name: 'Vendor analytics totals by currency' }),
  ).toContainText('$900,719,925,474,099.31');
  await expect(
    page.getByRole('table', { name: 'Vendor analytics totals by currency' }),
  ).toContainText('EUR');
  for (const state of [
    'STALE',
    'BUILDING',
    'RECONCILIATION_REQUIRED',
    'FAILED',
    'UNBUILT',
  ]) {
    await page.getByLabel('Projection preview').selectOption(state);
    await expect(page.locator('main')).toContainText(`Projection: ${state}`);
  }
  await page.getByLabel('Projection preview').selectOption('ACTIVE');
  for (const view of ['trend', 'products', 'markets', 'occurrences']) {
    await page.getByLabel('Analytics view').selectOption(view);
    await expect(
      page
        .getByRole('table', { name: `Vendor ${view} analytics` })
        .getByRole('row'),
    ).toHaveCount(21);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(
      page
        .getByRole('table', { name: `Vendor ${view} analytics` })
        .getByRole('row'),
    ).toHaveCount(4);
  }
  for (const state of ['denied', 'unknown', 'unconfigured']) {
    await page.getByLabel('Analytics availability').selectOption(state);
    await ready(page);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.locator('main')).toContainText(
      state === 'denied'
        ? 'Analytics is not available'
        : state === 'unknown'
          ? 'availability is unknown'
          : 'availability is unconfigured',
    );
    await navigate(page, '');
    await expect(page.locator('main')).toContainText(
      '23 Vendor customer relationships',
    );
    await expect(
      page.getByRole('link', { name: 'Find an order', exact: true }),
    ).toBeVisible();
    await navigate(page, 'analytics');
  }
});
test('safe service, forbidden, validation and conflict read failures show no stale records', async ({
  page,
}) => {
  await vendor(page, '/vendor/customers');
  for (const [fault, title] of [
    ['unavailable', 'Service unavailable'],
    ['forbidden', 'Access restricted'],
    ['validation', 'Check your request'],
    ['conflict', 'Refresh required'],
  ]) {
    await page.getByLabel('Response preview').selectOption(fault!);
    await expect(page.getByRole('alert')).toContainText(title!);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText(
      'Synthetic A Customer',
    );
  }
  await page.getByLabel('Response preview').selectOption('none');
  await expect(
    page.getByRole('table', { name: 'Owned customer relationships' }),
  ).toBeVisible();
});
