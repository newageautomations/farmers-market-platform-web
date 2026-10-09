import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createFixtureVendorService } from '../../apps/admin/src/vendor/fixture';
import type { AdminContext } from '@market/admin-core';
import type { VendorService } from '../../apps/admin/src/vendor/service';
import { testUrl, evidenceRoot } from './urls';
const context: AdminContext = {
  scope: 'VENDOR',
  name: 'Contract Vendor',
  source: 'fixture',
  membershipRole: 'owner',
  subject: { vendorId: '1' },
  permissions: [
    'ReadOwnVendorIdentity',
    'ManageOwnCatalog',
    'ManageOwnInventory',
    'ReadOwnCRM',
    'ManageOwnMarketParticipation',
    'ManageCatalogPublication',
    'ReadOwnVendorAnalytics',
    'ReadOwnBilling',
  ],
};

test('production Vendor adapter uses only named owned contracts, then reboots on authority revocation', async ({
  page,
}) => {
  const origin = testUrl(4324),
    calls: {
      operation: string;
      variables: Record<string, unknown>;
      token: string | undefined;
    }[] = [];
  const services: Record<string, VendorService> = {
    a: createFixtureVendorService(context),
    b: createFixtureVendorService({
      ...context,
      subject: { vendorId: '2' },
    }),
  };
  let revoked = false;
  await page.route('**/admin-api', async (route) => {
    const req = route.request(),
      body = req.postDataJSON() as {
        query: string;
        variables: Record<string, unknown>;
      },
      operation = body.query.match(/(?:query|mutation) (\w+)/)?.[1] ?? '',
      token = req.headers()['vendure-token'];
    calls.push({ operation, variables: body.variables, token });
    const service = services[token === 'contract-b' ? 'b' : 'a']!,
      isB = token === 'contract-b';
    let data: unknown;
    if (operation === 'AdminSession')
      data = {
        me: {
          id: '9',
          identifier: 'contract-test',
          channels: ['a', 'b'].map((key, i) => ({
            id: String(7 + i),
            code: `Workspace ${key.toUpperCase()}`,
            token: `contract-${key}`,
            permissions: revoked ? ['Authenticated'] : context.permissions,
          })),
        },
      };
    else if (operation === 'VendorIdentity')
      data = {
        ownVendorIdentity: {
          id: isB ? '2' : '1',
          name: isB ? 'Contract Vendor B' : 'Contract Vendor A',
          slug: 'irrelevant-slug',
          status: 'active',
          channelId: isB ? '8' : '7',
          permissions: context.permissions,
          memberships: [
            { id: '91', principalId: '9', role: 'owner', status: 'active' },
          ],
        },
      };
    else if (operation === 'FeatureAvailability')
      data = {
        ownFeatureAvailability: {
          boundary: 'analytics.vendor.read',
          state: 'DENIED',
          reason: 'TEST_DENIAL',
          featureCode: 'test.analytics.read',
        },
      };
    else if (operation === 'VendorCatalog')
      data = {
        ownVendorCatalog: await service.catalogRead(
          body.variables.options as Parameters<VendorService['catalogRead']>[0],
        ),
      };
    else if (operation === 'VendorProduct')
      data = {
        ownVendorProduct: await service.productRead(
          String(body.variables.productId),
        ),
      };
    else if (operation === 'VendorOrders')
      data = {
        ownCommercePortions: await service.orderList(
          body.variables.options as Parameters<VendorService['orderList']>[0],
        ),
      };
    else if (operation === 'VendorInventory')
      data = {
        ownOperationalInventory: await service.inventory(
          isB ? '2' : '1',
          body.variables.after as string | null,
        ),
      };
    else if (operation === 'VendorCustomers')
      data = {
        ownCustomers: await service.customers(
          body.variables.options as Parameters<VendorService['customers']>[0],
        ),
      };
    else if (operation === 'VendorMemberships')
      data = { ownMarketBusinessMemberships: await service.memberships() };
    else if (operation === 'VendorPortion')
      data = {
        ownCommercePortion: await service.portion(
          String(body.variables.orderId),
        ),
      };
    else if (operation === 'VendorRestock')
      data = {
        restockOwnPhysicalInventory: await service.restock(
          body.variables.input as Parameters<VendorService['restock']>[0],
        ),
      };
    else if (operation === 'VendorCreateProduct')
      data = {
        createOwnCatalogProduct: await service.createProduct(
          body.variables.input as Parameters<VendorService['createProduct']>[0],
        ),
      };
    else {
      await route.fulfill({
        json: {
          errors: [
            {
              message: 'private SQL internal token',
              extensions: { code: 'FORBIDDEN' },
            },
          ],
        },
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
      });
      return;
    }
    await route.fulfill({
      json: { data },
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  });
  await page.goto(origin + '/vendor');
  await expect(
    page.getByText('Contract Vendor A', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText(
    '23 Vendor customer relationships',
  );
  await expect(page.locator('main')).toContainText(
    'Analytics is not available',
  );
  expect(calls.some((c) => c.operation === 'FeatureAvailability')).toBe(true);
  await expect(
    page.getByRole('link', { name: 'Find an order', exact: true }),
  ).toBeVisible();
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Products', exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Owned products' }),
  ).toContainText('Synthetic A Product');
  await page.getByRole('link', { name: 'Create product', exact: true }).click();
  await page.getByLabel('Product name').fill('Contract created product');
  await page.getByLabel('Slug', { exact: true }).fill('contract-created');
  await page
    .getByRole('button', { name: 'Create product', exact: true })
    .click();
  await expect(page.locator('main')).toContainText(
    'Editing Contract created product',
  );
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Inventory', exact: true })
    .click();
  await page
    .getByRole('table', { name: 'Current physical inventory' })
    .getByRole('button', { name: 'Restock', exact: true })
    .first()
    .click();
  await page.getByRole('dialog').getByLabel('Restock quantity').fill('3');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Restock', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(calls.some((c) => c.operation === 'VendorRestock')).toBe(true);
  expect(calls.some((c) => c.operation === 'VendorInventory')).toBe(true);
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Customers', exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Owned customer relationships' }),
  ).toContainText('Synthetic A Customer');
  await page.getByLabel('Workspace', { exact: true }).selectOption('8');
  await expect(
    page.getByText('Contract Vendor B', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Owned customer relationships' }),
  ).toContainText('Synthetic B Customer');
  await expect(page.locator('main')).not.toContainText('Synthetic A');
  expect(
    calls.filter((c) => c.operation === 'VendorCustomers').at(-1)?.token,
  ).toBe('contract-b');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  revoked = true;
  await page
    .getByRole('button', { name: 'Refresh workspace', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Workspace unavailable', exact: true }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Contract Vendor B');
  expect(calls.map((c) => c.operation)).toContain('VendorInventory');
  expect(
    calls.every(
      (c) =>
        ![
          'Products',
          'Orders',
          'Customers',
          'UpdateStockLevel',
          'CreateFulfillment',
        ].includes(c.operation),
    ),
  ).toBe(true);
  if (process.env.FRONTEND_NO_EVIDENCE !== 'true')
    await page.screenshot({
      path: `${evidenceRoot}/vendor-fixture/production-revocation.png`,
      fullPage: true,
    });
});
