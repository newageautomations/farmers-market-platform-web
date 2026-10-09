import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
type Ready = {
  endpoint: string;
  shopEndpoint: string;
  controlUrl: string;
  controlKey: string;
  channels: { id: string; token: string }[];
  marketChannels: { id: string; token: string }[];
  ids: {
    vendorIds: string[];
    marketIds: string[];
    variantIds: string[];
    sourceIds: string[];
    planId: string;
    versionId: string;
    offerId: string;
    principalId: string;
    marketPrincipalId: string;
  };
};
const ready = JSON.parse(
  readFileSync(process.env.FRONTEND_PLATFORM_READY!, 'utf8'),
) as Ready;
const admin = 'http://127.0.0.1:4345',
  password = 'local-identity-regression-only-password';
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    console.log(
      'Safe rendered failure state:',
      await page
        .locator('main')
        .innerText()
        .catch(() => 'Page unavailable'),
    );
  }
});
async function control(action: string) {
  const r = await fetch(ready.controlUrl + '/' + action, {
    method: 'POST',
    headers: { 'x-fixture-key': ready.controlKey },
  });
  expect(r.status, 'Local fixture assertion').toBe(200);
}
async function login(
  page: Page,
  user = 'identity-regression-superadmin',
  path = '/platform',
) {
  await page.goto(admin + path);
  await page.getByLabel('Email or username').fill(user);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-topbar')).toBeVisible();
  await expect(
    page.getByText('Development fixture', { exact: false }),
  ).toHaveCount(0);
}
async function navigate(page: Page, path: string) {
  await page.goto(admin + path);
  await expect(page.locator('.admin-topbar')).toBeVisible();
}
function command(page: Page, title: string) {
  return page
    .locator('.command-section')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}
async function a11y(page: Page) {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => ({ id: v.id, impact: v.impact }))).toEqual(
      [],
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      'No page overflow',
    ).toBe(true);
  }
}
async function gql(
  page: Page,
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
) {
  return page.evaluate(
    async ({ endpoint, query, variables, token }) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          ...(token ? { 'vendure-token': token } : {}),
        },
        body: JSON.stringify({ query, variables }),
      });
      return response.json();
    },
    { endpoint: ready.endpoint, query, variables, token },
  );
}
function denied(result: {
  errors?: { message: string; extensions?: { code?: string } }[];
}) {
  expect(result.errors?.length).toBeGreaterThan(0);
  expect(
    result.errors?.some(
      (e) => e.extensions?.code === 'GRAPHQL_VALIDATION_FAILED',
    ),
  ).toBe(false);
}

test('Platform directory paging, search, detail, native authority, safe readiness and responsive accessibility', async ({
  page,
}) => {
  await login(page);
  await expect(page.getByText('Vendors', { exact: true }).last()).toBeVisible();
  await a11y(page);
  await navigate(page, '/platform/tenants');
  await expect(
    page.getByRole('table', { name: 'Platform tenant directory' }),
  ).toBeVisible();
  await expect(page.getByText('26 results', { exact: false })).toBeVisible();
  denied(
    await gql(
      page,
      'query { platformTenants(options:{take:51}) {totalItems} }',
    ),
  );
  denied(
    await gql(
      page,
      'query($search:String!) { platformTenants(options:{search:$search}) {totalItems} }',
      { search: 'x'.repeat(81) },
    ),
  );
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Vendor A', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Tenant kind', { exact: true }).selectOption('MARKET');
  await page
    .getByLabel('Tenant status', { exact: true })
    .selectOption('active');
  await page.getByRole('button', { name: 'Search tenants' }).click();
  await expect(page.getByText('2 results', { exact: false })).toBeVisible();
  await page.getByLabel('Tenant kind', { exact: true }).selectOption('VENDOR');
  await page.getByLabel('Business name or slug').fill('Vendor A');
  await page.getByRole('button', { name: 'Search tenants' }).click();
  await expect(page.getByText('1 results', { exact: false })).toBeVisible();
  await a11y(page);
  await page.getByRole('link', { name: 'Vendor A', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vendor A', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('INTERNAL_NO_CHARGE', { exact: false }),
  ).toBeVisible();
  await a11y(page);
  await navigate(page, `/platform/tenants/market/${ready.ids.marketIds[0]}`);
  await expect(
    page.getByRole('heading', { name: 'market-a', exact: true }),
  ).toBeVisible();
  await a11y(page);
  await navigate(page, '/platform/integrations');
  await expect(
    page.getByRole('heading', {
      name: 'Marketplace Stripe Connect',
      exact: true,
    }),
  ).toBeVisible();
  await a11y(page);
  await control('platform-revoke');
  try {
    denied(await gql(page, 'query { platformTenants { totalItems } }'));
    denied(
      await gql(
        page,
        'query { platformBillingCatalog(section:PLANS) {totalItems} }',
      ),
    );
    denied(
      await gql(
        page,
        'mutation { createSaasPlan(code:"revoked-browser-plan",displayName:"Denied local plan"){id} }',
      ),
    );
    await page.getByRole('button', { name: 'Refresh workspace' }).click();
    await expect(
      page.getByRole('heading', { name: 'Workspace unavailable' }),
    ).toBeVisible();
  } finally {
    await control('platform-restore');
  }
});

test('Platform permanent catalog, immutability, new version and offer, internal assignment and grandfathering', async ({
  page,
}) => {
  await login(page);
  await navigate(page, '/platform/billing/plans');
  await expect(
    page.getByRole('heading', { name: 'Local Phase 13G catalog', exact: true }),
  ).toBeVisible();
  await a11y(page);
  const plan = command(page, 'Create stable plan');
  await plan.getByLabel('Stable plan code').fill('browser-local-plan');
  await plan.getByLabel('Plan display name').fill('Browser local plan');
  await plan.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Browser local plan', exact: true }),
  ).toBeVisible();
  const result = await gql(
      page,
      'query { platformBillingCatalog(section:PLANS,options:{search:"Browser local plan"}) { items { id } } }',
    ),
    planId = result.data.platformBillingCatalog.items[0].id;
  await navigate(page, '/platform/billing/versions');
  const version = command(page, 'Create draft version');
  await version.getByLabel('Stable plan').selectOption(planId);
  await version.getByLabel('New version number').fill('1');
  await version.getByLabel('Version policy reference').fill('browser:v1');
  await version.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await gql(
            page,
            'query($id:ID!){platformBillingCatalog(section:VERSIONS,options:{planId:$id}){totalItems}}',
            { id: planId },
          )
        ).data.platformBillingCatalog.totalItems,
    )
    .toBe(1);
  const versions = await gql(
      page,
      'query($id:ID!) { platformBillingCatalog(section:VERSIONS,options:{planId:$id}) {items{id status}}}',
      { id: planId },
    ),
    versionId = versions.data.platformBillingCatalog.items[0].id;
  await navigate(page, '/platform/billing/rules');
  const rule = command(page, 'Set draft entitlement rule');
  await rule.getByLabel('Draft plan version').selectOption(versionId);
  await rule
    .getByLabel('Feature definition')
    .selectOption({ label: 'test.catalog.feature · BOOLEAN' });
  await rule.getByLabel('Rule policy version').fill('browser:v1');
  await rule.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByText('BOOLEAN · Enabled', { exact: false }),
  ).toBeVisible();
  await navigate(page, '/platform/billing/versions');
  const publish = page
    .locator('.management-grid .card')
    .filter({ hasText: `Stable plan ${planId}` })
    .filter({ hasText: 'DRAFT' });
  await publish
    .getByRole('button', { name: 'Publish version', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(publish).toHaveCount(0);
  const feature = await gql(
      page,
      'query{platformBillingCatalog(section:FEATURES){items{id featureCode}}}',
    ),
    featureId = feature.data.platformBillingCatalog.items.find(
      (f: { featureCode: string }) => f.featureCode === 'test.catalog.feature',
    ).id;
  denied(
    await gql(
      page,
      'mutation($i:SaasRuleInput!){setDraftSaasRule(input:$i){id}}',
      {
        i: {
          planVersionId: versionId,
          featureId,
          valueKind: 'BOOLEAN',
          enabled: false,
          unlimited: false,
          policyVersion: 'browser:v1',
        },
      },
    ),
  );
  await navigate(page, '/platform/billing/rules');
  await expect(
    command(page, 'Set draft entitlement rule')
      .getByLabel('Draft plan version')
      .locator(`option[value="${versionId}"]`),
  ).toHaveCount(0);
  await navigate(page, '/platform/billing/offers');
  const offer = command(page, 'Create billing offer');
  await offer.getByLabel('New offer code').fill('browser-offer-a');
  await offer.getByLabel('Published plan version').selectOption(versionId);
  await offer.getByLabel('Currency code').fill('USD');
  await offer.getByLabel('Exact amount in currency minor units').fill('125');
  await offer.getByLabel('Cadence count').fill('1');
  await offer.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'browser-offer-a', exact: true }),
  ).toBeVisible();
  await navigate(page, '/platform/billing/offers');
  const offerB = command(page, 'Create billing offer');
  await offerB.getByLabel('New offer code').fill('browser-offer-b');
  await offerB.getByLabel('Published plan version').selectOption(versionId);
  await offerB.getByLabel('Currency code').fill('USD');
  await offerB.getByLabel('Exact amount in currency minor units').fill('250');
  await offerB.getByLabel('Cadence', { exact: true }).selectOption('year');
  await offerB.getByLabel('Cadence count').fill('1');
  await offerB.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'browser-offer-b', exact: true }),
  ).toBeVisible();
  const offers = await gql(
    page,
    'query($v:ID!){platformBillingCatalog(section:OFFERS,options:{planVersionId:$v}){items{id code amount planVersionId}}}',
    { v: versionId },
  );
  expect(
    offers.data.platformBillingCatalog.items.map(
      (x: { amount: number }) => x.amount,
    ),
  ).toEqual([125, 250]);
  const before = await gql(
    page,
    'query($id:ID!){platformTenant(kind:VENDOR,id:$id){subscription{planVersionId}}}',
    { id: ready.ids.vendorIds[0] },
  );
  expect(before.data.platformTenant.subscription.planVersionId).toBe(
    ready.ids.versionId,
  );
  const provision = await gql(
    page,
    'mutation{platformProvisionVendor(input:{provisioningKey:"browser-internal-only",name:"Browser internal tenant",slug:"browser-internal-tenant"}){id}}',
  );
  const newId = provision.data.platformProvisionVendor.id;
  await navigate(page, `/platform/tenants/vendor/${newId}`);
  const assign = command(page, 'Assign internal subscription');
  await assign
    .getByLabel('Approved offer')
    .selectOption(offers.data.platformBillingCatalog.items[0].id);
  await assign
    .getByRole('button', { name: 'Assign no-charge subscription' })
    .click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(
    page.getByText('ACTIVE · INTERNAL_NO_CHARGE', { exact: false }),
  ).toBeVisible();
  await navigate(page, '/platform/billing/versions');
  const draft2 = command(page, 'Create draft version');
  await draft2.getByLabel('Stable plan').selectOption(planId);
  await draft2.getByLabel('New version number').fill('2');
  await draft2.getByLabel('Version policy reference').fill('browser:v2');
  await draft2.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await gql(
            page,
            'query($id:ID!){platformBillingCatalog(section:VERSIONS,options:{planId:$id}){totalItems}}',
            { id: planId },
          )
        ).data.platformBillingCatalog.totalItems,
    )
    .toBe(2);
  const version2 = (
    await gql(
      page,
      'query($id:ID!){platformBillingCatalog(section:VERSIONS,options:{planId:$id}){items{id versionNumber}}}',
      { id: planId },
    )
  ).data.platformBillingCatalog.items.find(
    (v: { versionNumber: number }) => v.versionNumber === 2,
  ).id;
  for (const [code, kind] of [
    ['test.catalog.feature', 'BOOLEAN'],
    ['test.pos.connection.limit', 'RESOURCE_LIMIT'],
    ['test.marketing.send.allowance', 'METERED_ALLOWANCE'],
  ]) {
    await navigate(page, '/platform/billing/rules');
    const form = command(page, 'Set draft entitlement rule');
    await form.getByLabel('Draft plan version').selectOption(version2);
    await form
      .getByLabel('Feature definition')
      .selectOption({ label: `${code} · ${kind}` });
    if (kind === 'BOOLEAN')
      await form.getByLabel('Boolean value').selectOption('false');
    else if (kind === 'RESOURCE_LIMIT')
      await form
        .getByRole('checkbox', { name: 'Unlimited', exact: true })
        .check();
    else await form.getByLabel('Metered allowance').fill('7');
    await form.getByLabel('Rule policy version').fill('browser:v2');
    const mutation = page.waitForResponse(
      (r) => !!r.request().postData()?.includes('mutation ManagementSetRule'),
    );
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    expect(
      (await (await mutation).json()).data.setDraftSaasRule.id,
    ).toBeTruthy();
  }
  await navigate(page, '/platform/billing/versions');
  const second = page
    .locator('.management-grid .card')
    .filter({ hasText: `Stable plan ${planId}` })
    .filter({
      has: page.getByRole('heading', { name: 'Version 2', exact: true }),
    });
  await second
    .getByRole('button', { name: 'Publish version', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(second).toContainText('PUBLISHED');
  await second
    .getByRole('heading', { name: 'Set default published version' })
    .locator('..')
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect
    .poll(
      async () =>
        (
          await gql(
            page,
            'query{platformBillingCatalog(section:PLANS,options:{search:"Browser local plan"}){items{defaultPublishedVersionId}}}',
          )
        ).data.platformBillingCatalog.items[0].defaultPublishedVersionId,
    )
    .toBe(version2);
  await navigate(page, '/platform/billing/offers');
  const third = command(page, 'Create billing offer');
  await third.getByLabel('New offer code').fill('browser-offer-version-two');
  await third.getByLabel('Published plan version').selectOption(version2);
  await third.getByLabel('Currency code').fill('USD');
  await third.getByLabel('Exact amount in currency minor units').fill('500');
  await third.getByLabel('Cadence count').fill('1');
  await third.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'browser-offer-version-two',
      exact: true,
    }),
  ).toBeVisible();
  const offer2 = (
    await gql(
      page,
      'query($v:ID!){platformBillingCatalog(section:OFFERS,options:{planVersionId:$v}){items{id}}}',
      { v: version2 },
    )
  ).data.platformBillingCatalog.items[0].id;
  expect(
    (
      await gql(
        page,
        'query($id:ID!){platformTenant(kind:VENDOR,id:$id){subscription{planVersionId}}}',
        { id: newId },
      )
    ).data.platformTenant.subscription.planVersionId,
  ).toBe(versionId);
  await navigate(page, `/platform/tenants/vendor/${ready.ids.vendorIds[1]}`);
  const migrate = command(page, 'Migrate internal subscription');
  await migrate.getByLabel('Approved offer').selectOption(offer2);
  await migrate
    .getByRole('button', { name: 'Migrate selected tenant' })
    .click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(
    page.getByText(`Exact plan version ${version2}`, { exact: false }).first(),
  ).toBeVisible();
  const unchanged = await gql(
    page,
    'query($id:ID!){platformTenant(kind:VENDOR,id:$id){subscription{planVersionId}}}',
    { id: ready.ids.vendorIds[0] },
  );
  expect(unchanged.data.platformTenant.subscription.planVersionId).toBe(
    ready.ids.versionId,
  );
});

test('Vendor Stripe state, no configuration, separate readiness, isolation and immediate permission denial', async ({
  page,
}) => {
  await login(
    page,
    'identity-owner-0@test.invalid',
    '/vendor/integrations/payments',
  );
  await expect(
    page.getByRole('heading', {
      name: 'Marketplace Stripe Connect',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText('Not configured', { exact: true })).toBeVisible();
  await expect(
    page.getByText('RECONCILIATION_REQUIRED', { exact: true }),
  ).toBeVisible();
  for (const name of [
    'Accept direct charges',
    'Receive transfers',
    'Receive payouts',
  ])
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Connect account', exact: true }),
  ).toBeDisabled();
  await a11y(page);
  denied(
    await gql(
      page,
      'query{platformTenants{totalItems}}',
      {},
      ready.channels[0]!.token,
    ),
  );
  denied(
    await gql(
      page,
      'query{platformBillingCatalog(section:OVERRIDES){totalItems}}',
      {},
      ready.channels[0]!.token,
    ),
  );
  await page
    .getByLabel('Workspace', { exact: true })
    .selectOption(ready.channels[1]!.id);
  await expect(page.locator('.admin-topbar')).toContainText('Vendor B');
  await expect(
    page.getByText('No connected payment account is recorded.'),
  ).toBeVisible();
  await expect(
    page.getByText('RECONCILIATION_REQUIRED', { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel('Workspace', { exact: true })
    .selectOption(ready.channels[0]!.id);
  await expect(page.locator('.admin-topbar')).toContainText('Vendor A');
  await control('permission-/ManageOwnPaymentAccount/revoke');
  try {
    denied(
      await gql(
        page,
        'mutation{disconnectOwnPaymentAccount(mode:TEST){id}}',
        {},
        ready.channels[0]!.token,
      ),
    );
  } finally {
    await control('permission-/ManageOwnPaymentAccount/restore');
  }
  await control('permission-/ReadOwnPaymentAccount/revoke');
  try {
    denied(
      await gql(
        page,
        'query{ownPaymentAccount(mode:TEST){id}}',
        {},
        ready.channels[0]!.token,
      ),
    );
    await page.getByRole('button', { name: 'Refresh workspace' }).click();
    await expect(
      page
        .locator('.admin-sidebar')
        .getByRole('link', { name: 'Payments', exact: true }),
    ).toHaveCount(0);
  } finally {
    await control('permission-/ReadOwnPaymentAccount/restore');
  }
});

test('Real synthetic POS authorization, discovery, explicit mappings, policy denial, sync and revocation', async ({
  page,
}) => {
  await login(
    page,
    'identity-owner-0@test.invalid',
    '/vendor/integrations/pos',
  );
  await expect(
    page.getByRole('heading', { name: 'fake-sixth', exact: true }),
  ).toBeVisible();
  const connect = command(page, 'Connect fake-sixth');
  await connect
    .getByLabel('Local adapter account reference')
    .fill('browser-pos-a');
  await connect
    .getByLabel('Local adapter authorization code')
    .fill('local-grant');
  await connect.getByRole('button', { name: 'Connect local adapter' }).click();
  await expect(
    page.getByRole('button', { name: 'Inspect connection' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Inspect connection' }).click();
  await a11y(page);
  await command(page, 'Discover locations')
    .getByRole('button', { name: 'Discover locations', exact: true })
    .click();
  await expect(
    command(page, 'Discover locations').getByText(
      'Backend command confirmed.',
      { exact: false },
    ),
  ).toBeVisible();
  await command(page, 'Discover catalog')
    .getByRole('button', { name: 'Discover catalog', exact: true })
    .click();
  await expect(
    command(page, 'Discover catalog').getByText('Backend command confirmed.', {
      exact: false,
    }),
  ).toBeVisible();
  const mapping = command(page, 'Map catalog resource');
  await expect(mapping).toBeVisible();
  await mapping
    .getByLabel('Owned platform variant')
    .selectOption(ready.ids.variantIds[0]!);
  await mapping
    .getByRole('button', { name: 'Confirm variant mapping' })
    .click();
  await expect(
    page.getByText(`Owned variant ${ready.ids.variantIds[0]}`, {
      exact: false,
    }),
  ).toBeVisible();
  await command(page, 'Map location')
    .getByRole('button', { name: 'Confirm location mapping' })
    .click();
  await expect(
    page.getByText(`Owned source ${ready.ids.sourceIds[0]}`, { exact: false }),
  ).toBeVisible();
  const connections = await gql(
      page,
      'query{ownPosConnections}',
      {},
      ready.channels[0]!.token,
    ),
    connection = connections.data.ownPosConnections[0];
  denied(
    await gql(
      page,
      'mutation($id:ID!,$v:Int!,$p:JSON!){configureOwnPosPolicies(connectionId:$id,expectedVersion:$v,policies:$p)}',
      {
        id: connection.id,
        v: connection.version,
        p: {
          ...connection.policies,
          version: connection.policies.version + 1,
          inventory: 'PROVIDER_PHYSICAL',
          freshness: {
            policyId: 'browser-invented-policy',
            policyVersion: '1',
            maxAgeSeconds: 60,
          },
        },
      },
      ready.channels[0]!.token,
    ),
  );
  denied(
    await gql(
      page,
      'mutation($i:ConfirmPosMappingInput!){confirmOwnPosMapping(input:$i)}',
      {
        i: {
          connectionId: connection.id,
          kind: 'VARIANT',
          externalId: 'foreign-resource',
          localId: ready.ids.variantIds[1],
        },
      },
      ready.channels[0]!.token,
    ),
  );
  const syncResponse = page.waitForResponse(
    (r) =>
      r.url() === ready.endpoint &&
      !!r.request().postData()?.includes('ManagementPosSync'),
  );
  await command(page, 'Request catalog sync')
    .getByRole('button', { name: 'Request sync' })
    .click();
  expect(
    (await (await syncResponse).json()).data.syncOwnPos.operationId,
  ).toBeTruthy();
  await control('drain-pos');
  await page.getByRole('button', { name: 'Refresh workspace' }).click();
  await expect(
    page.getByRole('button', { name: 'Inspect connection' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Inspect connection' }).click();
  await expect(
    page.getByText('Catalog sync:', { exact: false }),
  ).not.toContainText('Catalog sync: Not provided');
  await page
    .getByLabel('Workspace', { exact: true })
    .selectOption(ready.channels[1]!.id);
  await expect(page.locator('.admin-topbar')).toContainText('Vendor B');
  await expect(
    page.getByText('No connections are recorded for this Vendor.'),
  ).toBeVisible();
  await expect(
    page.getByText(`Owned variant ${ready.ids.variantIds[0]}`, {
      exact: false,
    }),
  ).toHaveCount(0);
  denied(
    await gql(
      page,
      'query($id:ID!){ownPosHealth(connectionId:$id) ownPosMappings(connectionId:$id)}',
      { id: connection.id },
      ready.channels[1]!.token,
    ),
  );
  denied(
    await gql(
      page,
      'mutation($id:ID!){revokeOwnPosConnection(connectionId:$id)}',
      { id: connection.id },
      ready.channels[1]!.token,
    ),
  );
  await page
    .getByLabel('Workspace', { exact: true })
    .selectOption(ready.channels[0]!.id);
  await expect(page.locator('.admin-topbar')).toContainText('Vendor A');
  await expect(
    page.getByRole('button', { name: 'Inspect connection' }),
  ).toBeVisible();
  await control('permission-/ManageOwnPosIntegrations/revoke');
  try {
    denied(
      await gql(
        page,
        'mutation($id:ID!){revokeOwnPosConnection(connectionId:$id)}',
        { id: connection.id },
        ready.channels[0]!.token,
      ),
    );
  } finally {
    await control('permission-/ManageOwnPosIntegrations/restore');
  }
  await control('permission-/ReadOwnPosIntegrations/revoke');
  try {
    denied(
      await gql(page, 'query{ownPosConnections}', {}, ready.channels[0]!.token),
    );
    await page.getByRole('button', { name: 'Refresh workspace' }).click();
    await expect(
      page
        .locator('.admin-sidebar')
        .getByRole('link', { name: 'POS', exact: true }),
    ).toHaveCount(0);
  } finally {
    await control('permission-/ReadOwnPosIntegrations/restore');
  }
});

test('Vendor and Market billing, tenant authority and membership revocation in the same cookie', async ({
  page,
}) => {
  await login(page, 'identity-owner-0@test.invalid', '/vendor/billing');
  await expect(page.getByText('Source: INTERNAL_NO_CHARGE')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Available offers', exact: true }),
  ).toBeVisible();
  await a11y(page);
  const ownBillingA = await gql(
    page,
    'query($s:BillingSubjectInput!){ownSubscription(subject:$s){id planVersionId}}',
    { s: { vendorId: ready.ids.vendorIds[0] } },
    ready.channels[0]!.token,
  );
  await page
    .getByLabel('Workspace', { exact: true })
    .selectOption(ready.channels[1]!.id);
  await expect(page.locator('.admin-topbar')).toContainText('Vendor B');
  const ownBillingB = await gql(
    page,
    'query($s:BillingSubjectInput!){ownSubscription(subject:$s){id planVersionId}}',
    { s: { vendorId: ready.ids.vendorIds[1] } },
    ready.channels[1]!.token,
  );
  expect(ownBillingA.data.ownSubscription.id).not.toBe(
    ownBillingB.data.ownSubscription.id,
  );
  await expect(
    page.getByText('Exact plan version', { exact: true }).locator('..'),
  ).toContainText(ownBillingB.data.ownSubscription.planVersionId);
  await page
    .getByLabel('Workspace', { exact: true })
    .selectOption(ready.channels[0]!.id);
  await expect(page.locator('.admin-topbar')).toContainText('Vendor A');
  await expect(
    page.getByText('Exact plan version', { exact: true }).locator('..'),
  ).toContainText(ownBillingA.data.ownSubscription.planVersionId);
  await control('membership-revoke');
  try {
    denied(
      await gql(
        page,
        'query($s:BillingSubjectInput!){ownSubscription(subject:$s){id}}',
        { s: { vendorId: ready.ids.vendorIds[0] } },
        ready.channels[0]!.token,
      ),
    );
    await page.getByRole('button', { name: 'Refresh workspace' }).click();
    await expect(
      page.getByRole('heading', { name: 'Workspace unavailable' }),
    ).toBeVisible();
  } finally {
    await control('membership-restore');
  }
  await page.context().clearCookies();
  await login(page, 'market-a@test.invalid', '/market/billing');
  await expect(page.getByText('Source: INTERNAL_NO_CHARGE')).toBeVisible();
  await a11y(page);
  denied(
    await gql(
      page,
      'query($s:BillingSubjectInput!){ownSubscription(subject:$s){id}}',
      { s: { marketId: ready.ids.marketIds[1] } },
      ready.marketChannels[0]!.token,
    ),
  );
  await expect(
    page
      .locator('.admin-sidebar')
      .getByRole('link', { name: 'Payments', exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .locator('.admin-sidebar')
      .getByRole('link', { name: 'POS', exact: true }),
  ).toHaveCount(0);
  denied(
    await gql(
      page,
      'query{platformAdminScope{permissions}}',
      {},
      ready.marketChannels[0]!.token,
    ),
  );
});

test('Shared Customer Vendor and Market preferences, renewal, append-only withdrawal, SMS unavailable and cross-subject denial', async ({
  page,
}) => {
  // Native Shop login creates the real shared Customer cookie. SSR and browser changes consume real Shop APIs.
  for (const token of [
    ready.channels[0]!.token,
    ready.marketChannels[0]!.token,
  ]) {
    const host =
      token === ready.channels[0]!.token
        ? 'http://vendor-a.localhost:4347'
        : 'http://market-a.localhost:4347';
    await page.goto(host + '/');
    const response = await page.request.post(ready.shopEndpoint, {
      headers: { 'vendure-token': token },
      data: {
        query:
          'mutation($u:String!,$p:String!){login(username:$u,password:$p){__typename}}',
        variables: { u: 'commerce-buyer@test.invalid', p: password },
      },
    });
    expect((await response.json()).data.login.__typename).toBe('CurrentUser');
    const cookies = await page.context().cookies(ready.shopEndpoint);
    for (const c of cookies.filter((c) => c.httpOnly))
      await page.context().addCookies([
        {
          name: c.name,
          value: c.value,
          domain: new URL(host).hostname,
          path: '/',
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
    await page.goto(host + '/account/communications');
    await expect(
      page.getByRole('heading', {
        name: 'Communication preferences',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page
        .getByText(
          'SMS is unavailable until an approved verified destination policy is configured.',
        )
        .first(),
    ).toBeVisible();
    await a11y(page);
    const purpose = host.includes('vendor')
        ? 'Restock updates'
        : 'Market announcements',
      card = page
        .locator('.preference-grid .card')
        .filter({
          has: page.getByRole('heading', { name: purpose, exact: true }),
        })
        .filter({
          has: page.getByText('Email · Not subscribed', { exact: true }),
        });
    await card.getByRole('checkbox').check();
    await card
      .getByRole('button', { name: 'Grant preference', exact: true })
      .click();
    await expect(card).toHaveCount(0);
    const active = page
      .locator('.preference-grid .card')
      .filter({
        has: page.getByRole('heading', { name: purpose, exact: true }),
      })
      .filter({ has: page.getByText('Email · Subscribed', { exact: true }) });
    if (host.includes('vendor')) {
      await control('renew-policy');
      await page.reload();
      const renew = page
        .locator('.preference-grid .card')
        .filter({
          has: page.getByRole('heading', { name: purpose, exact: true }),
        })
        .filter({
          has: page.getByText('Email · Consent needs renewal', { exact: true }),
        });
      await renew.getByRole('checkbox').check();
      await renew
        .getByRole('button', { name: 'Renew consent', exact: true })
        .click();
      await expect(active).toBeVisible();
    }
    const storefrontId = await page
      .locator('astro-island[component-export="default"]')
      .getAttribute('props');
    expect(storefrontId).toBeTruthy();
    const attack = await page.evaluate(async () => {
      const island = document.querySelector(
          'astro-island[component-export="default"]',
        ),
        props = JSON.parse(island!.getAttribute('props')!),
        id = props.storefrontId[1];
      const r = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          storefrontId: id,
          action: 'communication-change',
          vendorId: '999999',
          medium: 'EMAIL',
          purpose: 'RESTOCK',
          subscribed: true,
          noticeVersion: 'fixture-notice-v2',
        }),
      });
      return r.status;
    });
    expect(attack).toBe(403);
    await active.getByRole('button', { name: 'Withdraw preference' }).click();
    await expect(active).toHaveCount(0);
    await expect(
      page
        .locator('.preference-grid .card')
        .filter({
          has: page.getByRole('heading', { name: purpose, exact: true }),
        })
        .filter({
          has: page.getByText('Email · Not subscribed', { exact: true }),
        }),
    ).toBeVisible();
  }
  await control('assert-preferences');
});

test('Platform provisioning delegates domain ownership and scoped overrides retain history', async ({
  page,
}) => {
  await login(page);
  await navigate(page, '/platform/tenants');
  const vendor = command(page, 'Provision Vendor');
  await vendor.getByLabel('Business name').fill('Browser provisioned Vendor');
  await vendor.getByLabel('Business slug').fill('browser-provisioned-vendor');
  await vendor
    .getByLabel('Existing initial human principal reference')
    .fill(ready.ids.principalId);
  await vendor
    .getByRole('button', { name: 'Provision tenant', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(
    page.getByRole('link', { name: 'Browser provisioned Vendor', exact: true }),
  ).toBeVisible();
  await page.getByLabel('New tenant kind').selectOption('MARKET');
  const market = command(page, 'Provision Market');
  await market.getByLabel('Business name').fill('Browser provisioned Market');
  await market.getByLabel('Business slug').fill('browser-provisioned-market');
  await market
    .getByLabel('Existing initial human principal reference')
    .fill(ready.ids.marketPrincipalId);
  await market.getByLabel('IANA timezone').fill('America/Chicago');
  await market.getByLabel('Venue', { exact: true }).fill('Local test venue');
  await market.getByLabel('Pickup instructions').fill('Local test pickup');
  await market.getByLabel('Preorder opens days before').fill('2');
  await market.getByLabel('Preorder opening time').fill('08:00');
  await market.getByLabel('Preorder closes days before').fill('1');
  await market.getByLabel('Preorder closing time').fill('08:00');
  await market.getByLabel('Close minutes before occurrence').fill('0');
  await market
    .getByRole('button', { name: 'Provision tenant', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(
    page.getByRole('link', { name: 'Browser provisioned Market', exact: true }),
  ).toBeVisible();
  const account = (
    await gql(
      page,
      'query($id:ID!){platformTenant(kind:VENDOR,id:$id){billingAccountId}}',
      { id: ready.ids.vendorIds[0] },
    )
  ).data.platformTenant.billingAccountId;
  await navigate(page, `/platform/billing/overrides?account=${account}`);
  const override = command(page, 'Grant entitlement override');
  await override
    .getByLabel('Feature definition')
    .selectOption({ label: 'test.catalog.feature · BOOLEAN' });
  await override.getByLabel('Boolean value').selectOption('false');
  await override.getByLabel('Rule policy version').fill('browser:override-v1');
  const [starts, ends] = await page.evaluate(() => {
    const local = (time: number) => {
      const d = new Date(time);
      return new Date(time - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    };
    return [local(Date.now() - 3600000), local(Date.now() + 86400000)];
  });
  await override.getByLabel('Starts at').fill(starts!);
  await override.getByLabel('Ends at').fill(ends!);
  await override.getByLabel('Reason code').fill('BROWSER_LOCAL_RESOLUTION');
  await override.getByLabel('Override source').fill('local-acceptance');
  await override.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(command(page, 'Revoke entitlement override')).toBeVisible();
  const entitlement = async () =>
    (
      await gql(
        page,
        'query($id:ID!){platformTenant(kind:VENDOR,id:$id){entitlements{featureCode allowed overrideId}}}',
        { id: ready.ids.vendorIds[0] },
      )
    ).data.platformTenant.entitlements.find(
      (e: { featureCode: string }) => e.featureCode === 'test.catalog.feature',
    );
  await expect.poll(async () => (await entitlement()).allowed).toBe(false);
  expect((await entitlement()).overrideId).toBeTruthy();
  await a11y(page);
  await command(page, 'Revoke entitlement override')
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(command(page, 'Revoke entitlement override')).toHaveCount(0);
  await expect.poll(async () => (await entitlement()).allowed).toBe(true);
  const historical = await gql(
    page,
    'query($id:ID!){platformBillingCatalog(section:OVERRIDES,options:{billingAccountId:$id}){totalItems items{revokedAt}}}',
    { id: account },
  );
  expect(historical.data.platformBillingCatalog.totalItems).toBe(1);
  expect(
    historical.data.platformBillingCatalog.items[0].revokedAt,
  ).toBeTruthy();
});
