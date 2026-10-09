import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
type Ready = {
  endpoint: string;
  controlUrl: string;
  controlKey: string;
  channels: Array<{ id: string; token: string }>;
  ids: {
    productA: string;
    productB: string;
    variantA: string;
    variantB: string;
    membership: string;
    foreignMembership: string;
    listing: string;
    directOrder: string;
    portionA: string;
    portionB: string;
  };
};
const ready = JSON.parse(
  readFileSync(process.env.FRONTEND_LIVE_READY_PATH!, 'utf8'),
) as Ready;
const password = 'local-identity-regression-only-password';
async function action(name: string) {
  const result = await fetch(`${ready.controlUrl}/${name}`, {
    method: 'POST',
    headers: { 'x-fixture-key': ready.controlKey },
  });
  assert.equal(result.status, 200);
}
async function login(page: Page, identifier = 'identity-owner-0@test.invalid') {
  await page.goto('/vendor');
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Email or username').fill(identifier);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-topbar')).toContainText(
    identifier.startsWith('market-')
      ? 'market-a'
      : identifier.includes('owner-1')
        ? 'Vendor B'
        : 'Vendor A',
  );
  await expect(
    page.getByText('Development fixture', { exact: false }),
  ).toHaveCount(0);
  const cookies = await page.context().cookies(ready.endpoint);
  expect(cookies.some((c) => c.httpOnly)).toBe(true);
}
async function navigate(page: Page, label: string) {
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: label, exact: true })
    .click();
}
function command(page: Page, title: string) {
  return page
    .locator('.command-section')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

test('real Vendor catalog, inventory, orders, CRM, Market publication and analytics workflows', async ({
  page,
}) => {
  await login(page);
  await navigate(page, 'Products');
  await expect(
    page.getByRole('table', { name: 'Owned products' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Owned products' }),
  ).toContainText('Vendor A Harvest Box');
  await page.getByLabel('Search products').fill('Vendor A Harvest');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page
    .getByRole('link', { name: 'Edit Vendor A Harvest Box', exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Owned variants' }),
  ).toContainText('LOCAL-HARVEST-A');
  const metadata = command(page, 'Product metadata');
  await metadata
    .getByLabel('Description')
    .fill('Changed by actual browser integration');
  const updatedProductRead = page.waitForResponse(
    (r) => r.request().postData()?.includes('query VendorProduct') === true,
  );
  await metadata.getByRole('button', { name: 'Save', exact: true }).click();
  await updatedProductRead;
  await expect(metadata.getByLabel('Description')).toHaveValue(
    'Changed by actual browser integration',
  );
  await page.getByText('Edit Harvest Box Standard', { exact: true }).click();
  const variant = command(page, 'Variant metadata');
  await variant.getByLabel('SKU', { exact: true }).fill('LOCAL-HARVEST-A-EDIT');
  await variant.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Owned variants' }),
  ).toContainText('LOCAL-HARVEST-A-EDIT');
  await page.getByText('Edit Harvest Box Standard', { exact: true }).click();
  const price = command(page, 'Canonical price');
  await price.getByLabel('Price (USD)', { exact: true }).fill('11.25');
  await price.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Owned variants' }),
  ).toContainText('$11.25');
  const add = command(page, 'Add variant');
  await add.getByLabel('Variant name').fill('Harvest Box Large');
  await add.getByLabel('SKU', { exact: true }).fill('LOCAL-HARVEST-LARGE');
  await add.getByLabel('Initial price (USD)').fill('15.75');
  await add.getByLabel('Box size').selectOption({ label: 'Large' });
  await add.getByRole('button', { name: 'Add variant', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Owned variants' }),
  ).toContainText('Harvest Box Large');
  await navigate(page, 'Products');
  await page.getByRole('link', { name: 'Create product', exact: true }).click();
  await page.getByLabel('Product name').fill('Browser Created Product');
  await page
    .getByLabel('Slug', { exact: true })
    .fill('browser-created-product');
  await page.getByLabel('Description').fill('Real HTTP create');
  await page
    .getByRole('button', { name: 'Create product', exact: true })
    .click();
  await expect(
    page.getByText('Editing Browser Created Product', { exact: true }),
  ).toBeVisible();
  const createdVariant = command(page, 'Add variant');
  await createdVariant.getByLabel('Variant name').fill('Browser New Variant');
  await createdVariant.getByLabel('SKU', { exact: true }).fill('LOCAL-NEW');
  await createdVariant.getByLabel('Initial price (USD)').fill('5.00');
  await createdVariant
    .getByRole('button', { name: 'Add variant', exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Owned variants' }),
  ).toContainText('Browser New Variant');
  await navigate(page, 'Inventory');
  const stock = page.getByRole('table', { name: 'Current physical inventory' });
  await expect(stock).toContainText('LOCAL-HARVEST-A-EDIT');
  const row = stock
    .getByRole('row')
    .filter({ hasText: 'Harvest Box Standard' });
  const prior = Number(await row.getByRole('cell').nth(1).innerText());
  await row.getByRole('button', { name: 'Restock', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Restock quantity').fill('5');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Restock', exact: true })
    .click();
  await expect(row.getByRole('cell').nth(1)).toHaveText(String(prior + 5));
  await navigate(page, 'Orders');
  const orders = page.getByRole('table', { name: 'Vendor operational orders' });
  await expect(orders).toContainText('market-a');
  await expect(orders).toContainText('Direct Vendor');
  await page.getByLabel('Order context').selectOption('MARKET_OCCURRENCE');
  await expect(orders.getByRole('row')).toHaveCount(2);
  await expect(orders).toContainText(`Order ${ready.ids.portionA}`);
  await orders
    .getByRole('link', { name: `Order ${ready.ids.portionA}`, exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Operational order lines' }),
  ).toContainText('LOCAL-HARVEST-A-EDIT');
  await expect(
    page.getByText('Market occurrence · market-a', { exact: true }),
  ).toBeVisible();
  await navigate(page, 'Customers');
  const customers = page.getByRole('table', {
    name: 'Owned customer relationships',
  });
  await expect(customers.getByRole('row')).toHaveCount(2);
  await customers.getByRole('link').first().click();
  await expect(
    page.getByRole('table', { name: 'Vendor specific purchase history' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('table', { name: 'Vendor specific purchase history' })
      .getByRole('row'),
  ).toHaveCount(21);
  await navigate(page, 'Markets');
  await expect(
    page.getByRole('table', { name: 'Owned Market relationships' }),
  ).toContainText('market-a');
  await page
    .getByRole('link', { name: 'Manage relationship', exact: true })
    .first()
    .click();
  const listings = page.getByRole('table', { name: 'Market variant listings' });
  await expect(listings).toContainText('published');
  await page.getByLabel('Search owned products for a listing').fill('Harvest');
  await page
    .getByRole('button', { name: 'Search variants', exact: true })
    .click();
  await page.getByLabel('Owned variant', { exact: true }).selectOption({
    label: 'Vendor A Harvest Box · Harvest Box Large · LOCAL-HARVEST-LARGE',
  });
  await command(page, 'Request listing')
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(listings).toContainText('pending');
  await listings
    .getByRole('button', { name: 'Review unpublish', exact: true })
    .first()
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm change' })
    .click();
  await expect(listings).toContainText('unpublished');
  await listings
    .getByRole('button', { name: 'Publish', exact: true })
    .first()
    .click();
  await expect(
    listings.getByRole('row').nth(1).getByRole('cell').nth(1),
  ).toHaveText('published');
  await navigate(page, 'Analytics');
  await expect(
    page.getByRole('table', { name: 'Vendor analytics totals by currency' }),
  ).toBeVisible();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel('End date, exclusive (UTC)').fill(tomorrow);
  await page.getByRole('button', { name: 'Apply range', exact: true }).click();
  await page.getByLabel('Analytics view').selectOption('trend');
  await expect(
    page.getByRole('table', { name: 'Vendor trend analytics' }),
  ).toBeVisible();
  for (const view of ['products', 'markets', 'occurrences']) {
    await page.getByLabel('Analytics view').selectOption(view);
    const projection = page.getByRole('table', {
      name: `Vendor ${view} analytics`,
    });
    await expect(projection.getByRole('row').nth(1)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
});

test('real cross-tenant Product, Variant, Order and Market relation attacks fail safely', async ({
  page,
}) => {
  await login(page);
  const attacks = [
    {
      query: 'query($id:ID!){ownVendorProduct(productId:$id){id name}}',
      id: ready.ids.productB,
    },
    {
      query: 'mutation($id:ID!){updateOwnVariantPrice(id:$id,price:1){id}}',
      id: ready.ids.variantB,
    },
    {
      query:
        'query($id:ID!){ownCommercePortion(orderId:$id){operationalOrderId}}',
      id: ready.ids.portionB,
    },
    {
      query:
        'query($id:ID!){marketMembershipState(membershipId:$id){membership{id market{name}}}}',
      id: ready.ids.foreignMembership,
    },
  ];
  for (const attack of attacks) {
    const response = await page.request.post(ready.endpoint, {
      headers: { 'vendure-token': ready.channels[0]!.token },
      data: { query: attack.query, variables: { id: attack.id } },
    });
    const body = await response.json();
    expect(body.errors?.length).toBeGreaterThan(0);
    expect(body.errors[0].extensions.code).not.toBe(
      'GRAPHQL_VALIDATION_FAILED',
    );
    expect(body.data).toBeFalsy();
  }
  const denied = page.waitForResponse(
    (response) =>
      response.url() === ready.endpoint &&
      response.request().postDataJSON().query.includes('ownVendorProduct'),
  );
  await page.evaluate((path) => {
    history.pushState(null, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, `/vendor/products/${ready.ids.productB}`);
  expect((await (await denied).json()).errors[0].extensions.code).toBe(
    'FORBIDDEN',
  );
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Vendor B Orchard Box', { exact: true }),
  ).toHaveCount(0);
});

test('real analytics-denied Vendor retains operational inventory and restock', async ({
  page,
}) => {
  await login(page, 'identity-owner-1@test.invalid');
  await navigate(page, 'Inventory');
  const stock = page.getByRole('table', { name: 'Current physical inventory' });
  await expect(stock).toContainText('Vendor B Orchard Box');
  const row = stock
    .getByRole('row')
    .filter({ hasText: 'Vendor B Orchard Box' });
  const prior = Number(await row.getByRole('cell').nth(1).innerText());
  await row.getByRole('button', { name: 'Restock', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Restock quantity').fill('3');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Restock', exact: true })
    .click();
  await expect(row.getByRole('cell').nth(1)).toHaveText(String(prior + 3));
  await navigate(page, 'Analytics');
  await expect(
    page.getByText(
      /Analytics is not available with your current permission or optional entitlement/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Vendor analytics totals by currency' }),
  ).toHaveCount(0);
});

for (const change of ['vendor-membership', 'vendor-role'])
  test(`same-cookie ${change} revocation clears the live workspace`, async ({
    page,
  }) => {
    await login(page);
    await navigate(page, 'Products');
    await expect(
      page.getByRole('table', { name: 'Owned products' }),
    ).toBeVisible();
    try {
      await action(`${change}-revoke`);
      await page.getByLabel('Search products').fill('Harvest');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Workspace unavailable',
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('table', { name: 'Owned products' }),
      ).toHaveCount(0);
    } finally {
      await action(`${change}-restore`);
    }
  });
for (const change of ['market-membership', 'market-role'])
  test(`real Market bootstrap and same-cookie ${change} revocation`, async ({
    page,
  }) => {
    await login(page, 'market-a@test.invalid');
    await expect(page.locator('.admin-topbar')).toContainText('market-a');
    await expect(
      page
        .locator('.admin-sidebar')
        .getByRole('link', { name: 'Occurrences', exact: true }),
    ).toBeVisible();
    try {
      await action(`${change}-revoke`);
      await page
        .getByRole('button', { name: 'Refresh workspace', exact: true })
        .click();
      await expect(
        page.getByRole('heading', {
          name: 'Workspace unavailable',
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator('.admin-sidebar')).toHaveCount(0);
    } finally {
      await action(`${change}-restore`);
    }
  });

test('real unknown capability presentation after current billing permission removal', async ({
  page,
}) => {
  await login(page);
  try {
    await action('billing-role-revoke');
    await page
      .getByRole('button', { name: 'Refresh workspace', exact: true })
      .click();
    await expect(page.locator('.admin-topbar')).toContainText('Vendor A');
    await navigate(page, 'Analytics');
    await expect(
      page.getByText(/Analytics availability is unknown/),
    ).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Vendor analytics totals by currency' }),
    ).toHaveCount(0);
    await navigate(page, 'Inventory');
    await expect(
      page.getByRole('table', { name: 'Current physical inventory' }),
    ).toBeVisible();
  } finally {
    await action('billing-role-restore');
  }
});
test('real unconfigured capability presentation with registered feature and unbound analytics boundary', async ({
  page,
}) => {
  await login(page);
  await navigate(page, 'Analytics');
  await expect(
    page.getByText(/Analytics availability is unconfigured/),
  ).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Vendor analytics totals by currency' }),
  ).toHaveCount(0);
  await navigate(page, 'Inventory');
  await expect(
    page.getByRole('table', { name: 'Current physical inventory' }),
  ).toBeVisible();
});
