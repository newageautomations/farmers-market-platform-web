import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const ready = JSON.parse(
  readFileSync(process.env.FRONTEND_LIVE_READY_PATH!, 'utf8'),
) as {
  endpoint: string;
  controlUrl: string;
  controlKey: string;
  marketChannels: { id: string; token: string }[];
  ids: {
    membership: string;
    listing: string;
    historicalOccurrence: string;
    cancelledOccurrence: string;
    foreignOccurrence: string;
    foreignRelationship: string;
    foreignListing: string;
    foreignJob: string;
    generationDate: string;
  };
};
const evidence = process.env.FRONTEND_EVIDENCE_DIR ?? 'docs/evidence/phase13c5';
async function action(name: string) {
  const r = await fetch(ready.controlUrl + '/' + name, {
    method: 'POST',
    headers: { 'x-fixture-key': ready.controlKey },
  });
  expect(r.status).toBe(200);
}
async function login(page: Page) {
  await page.goto('/market');
  await page.getByLabel('Email or username').fill('market-a@test.invalid');
  await page
    .getByLabel('Password', { exact: true })
    .fill('local-identity-regression-only-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-topbar')).toContainText('market-a');
  if (
    (await page.getByLabel('Workspace', { exact: true }).inputValue()) !==
    ready.marketChannels[0]!.id
  )
    await page
      .getByLabel('Workspace', { exact: true })
      .selectOption(ready.marketChannels[0]!.id);
  expect(
    (await page.context().cookies(ready.endpoint)).some((c) => c.httpOnly),
  ).toBe(true);
  await expect(
    page.getByText('Development fixture', { exact: false }),
  ).toHaveCount(0);
}
async function navigate(page: Page, label: string) {
  const link = page
    .locator('.admin-sidebar')
    .getByRole('link', { name: label, exact: true });
  if (!(await link.isVisible()))
    await page.getByText('Workspace navigation', { exact: true }).click();
  if (await link.isVisible()) await link.click();
  else
    await page
      .locator('.admin-mobile-nav')
      .getByRole('link', { name: label, exact: true })
      .click();
}
async function detail(page: Page) {
  await page.goto('/market/vendors/listings/' + ready.ids.membership);
  await expect(
    page.getByRole('table', { name: 'Listing approvals (backend order)' }),
  ).toContainText('Example Product');
}
async function refreshDetail(page: Page) {
  await page
    .getByRole('button', { name: 'Refresh Vendor relationships' })
    .click();
}
async function enqueue(page: Page, from = ready.ids.generationDate) {
  await page
    .locator('main')
    .getByRole('link', { name: 'Generate occurrences', exact: true })
    .click();
  await page.getByLabel('Create dates starting on', { exact: true }).fill(from);
  await page
    .getByLabel('Create dates through', {
      exact: true,
    })
    .fill(from);
  await page
    .getByLabel('Generation execution', { exact: true })
    .selectOption('queued');
  await page
    .getByRole('button', { name: 'Generate occurrences', exact: true })
    .click();
}
test('real B1 safe Vendor names, server relationship/directory paging, searchable selection and authoritative creation', async ({
  page,
}) => {
  const pages: number[] = [];
  page.on('request', (r) => {
    if (r.url() === ready.endpoint) {
      const body = r.postDataJSON() as {
        query: string;
        variables: { options?: { skip?: number } };
      };
      if (body.query?.includes('MarketVendorPage'))
        pages.push(body.variables.options?.skip ?? 0);
    }
  });
  await login(page);
  await navigate(page, 'Vendors');
  const table = page.getByRole('table', {
    name: 'Vendor business relationships',
  });
  await expect(table.locator('tbody tr')).toHaveCount(20);
  await page
    .getByRole('region', { name: 'Vendor relationship pages' })
    .getByRole('button', { name: 'Next', exact: true })
    .click();
  await expect(table).toContainText('Vendor A');
  expect(pages).toContain(20);
  await page.getByRole('button', { name: 'Add Vendor', exact: true }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Add Vendor', exact: true });
  await expect(dialog.getByLabel('Vendor business')).toBeVisible();
  await dialog
    .getByRole('region', { name: 'Eligible Vendor pages' })
    .getByRole('button', { name: 'Next', exact: true })
    .click();
  await expect(dialog).toContainText('Showing 21');
  await dialog
    .getByLabel('Search eligible Vendors')
    .fill('Eligible Orchard 02');
  await dialog.getByRole('button', { name: 'Search directory' }).click();
  await expect(
    dialog.getByRole('option', {
      name: 'Eligible Orchard 02 (eligible-2)',
      exact: true,
    }),
  ).toHaveCount(1);
  await dialog
    .getByLabel('Vendor business')
    .selectOption({ label: 'Eligible Orchard 02 (eligible-2)' });
  await dialog
    .getByLabel('Initial business membership status')
    .selectOption('pending');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole('button', { name: 'Create relationship' }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByLabel('Search Vendor relationships')
    .fill('Eligible Orchard 02');
  await page.getByRole('button', { name: 'Search relationships' }).click();
  await expect(table).toContainText('Eligible Orchard 02');
  await expect(table).toContainText('pending');
  await expect(page.getByRole('textbox', { name: /Vendor ID/i })).toHaveCount(
    0,
  );
});
test('real B2 canonical Product/Variant/SKU and B3 publication transition, drift, read-only reconciliation and repair', async ({
  page,
}) => {
  await login(page);
  await detail(page);
  const table = page.getByRole('table', {
      name: 'Listing approvals (backend order)',
    }),
    first = table.locator('tbody tr').first();
  await expect(first).toContainText('Example Variant');
  await expect(first).toContainText('ABC-123');
  await expect(first).toContainText('UNPUBLISHED');
  try {
    await action('market-publish');
    await refreshDetail(page);
    await expect(first).toContainText('PUBLISHED');
    await action('market-publication-drift');
    await refreshDetail(page);
    await expect(first).toContainText('RECONCILIATION_REQUIRED');
    await refreshDetail(page);
    await expect(first).toContainText('RECONCILIATION_REQUIRED');
    await action('market-repair');
    await refreshDetail(page);
    await expect(first).toContainText('PUBLISHED');
    await action('market-unpublish');
    await refreshDetail(page);
    await expect(first).toContainText('UNPUBLISHED');
  } finally {
    await action('market-repair');
    await action('market-unpublish');
  }
  await expect(table.locator('thead')).toContainText('Approval');
  await expect(table.locator('thead')).toContainText('Publication');
  await page
    .locator('main')
    .getByRole('link', { name: 'Product offerings', exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Market offerings (backend order)' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit Product/i })).toHaveCount(
    0,
  );
});
test('real B4 occurrence and membership-detail server pages with authoritative totals', async ({
  page,
}) => {
  const calls: { operation: string; skip: number }[] = [];
  page.on('request', (r) => {
    if (r.url() === ready.endpoint) {
      const b = r.postDataJSON() as {
        query: string;
        variables: {
          options?: { skip?: number };
          listings?: { skip?: number };
        };
      };
      calls.push({
        operation: b.query,
        skip: b.variables.options?.skip ?? b.variables.listings?.skip ?? 0,
      });
    }
  });
  await login(page);
  await navigate(page, 'Occurrences');
  const table = page.getByRole('table', {
    name: 'Market occurrences',
    exact: true,
  });
  await expect(table.locator('tbody tr')).toHaveCount(20);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('main')).toContainText('Showing 21');
  expect(
    calls.some(
      (c) => c.operation.includes('MarketOccurrencePage') && c.skip === 20,
    ),
  ).toBe(true);
  await detail(page);
  await page
    .getByRole('region', { name: 'Listing pages' })
    .getByRole('button', { name: 'Next', exact: true })
    .click();
  await expect(
    page
      .getByRole('table', { name: 'Listing approvals (backend order)' })
      .locator('tbody tr'),
  ).toHaveCount(2);
  expect(
    calls.some(
      (c) => c.operation.includes('MarketRelationshipDetail') && c.skip === 20,
    ),
  ).toBe(true);
  await page
    .locator('main')
    .getByRole('link', { name: 'Occurrence participation', exact: true })
    .click();
  await page
    .getByRole('region', { name: 'Participation pages' })
    .getByRole('button', { name: 'Next', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Participation pages' }),
  ).toContainText('Showing 21');
});
test('real B5 direct historical/cancelled occurrence outside date list and foreign/unknown safe denial', async ({
  page,
}) => {
  const operations: string[] = [];
  page.on('request', (r) => {
    if (r.url() === ready.endpoint)
      operations.push((r.postDataJSON() as { query: string }).query);
  });
  await login(page);
  await page.goto('/market/occurrences/' + ready.ids.historicalOccurrence);
  await expect(page.locator('main')).toContainText('2024-12-31');
  expect(operations.some((q) => q.includes('MarketOccurrenceDetail'))).toBe(
    true,
  );
  await page.goto('/market/occurrences/' + ready.ids.cancelledOccurrence);
  await expect(page.locator('main')).toContainText('cancelled');
  for (const id of [ready.ids.foreignOccurrence, '2147483647']) {
    const refused = page.waitForResponse(
      (r) =>
        r.url() === ready.endpoint &&
        r.request().postData()?.includes('MarketOccurrenceDetail') === true &&
        (r.request().postDataJSON() as { variables: { id: string } }).variables
          .id === id,
    );
    await page.goto('/market/occurrences/' + id);
    expect(
      ((await (await refused).json()) as { errors?: unknown[] }).errors?.length,
    ).toBeGreaterThan(0);
    await expect(
      page.getByRole('heading', { name: 'Overview', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.admin-topbar')).toContainText('market-a');
    await expect(page.locator('main')).not.toContainText('Schedule date');
  }
});
test('real B6 accepted job is observed through durable terminal status and occurrences are reread', async ({
  page,
}) => {
  const names: string[] = [];
  page.on('request', (r) => {
    if (r.url() === ready.endpoint)
      names.push(
        (r.postDataJSON() as { query: string }).query.match(
          /(?:query|mutation) (\w+)/,
        )?.[1] ?? '',
      );
  });
  await login(page);
  await navigate(page, 'Occurrences');
  await expect(
    page.getByRole('table', { name: 'Market occurrences', exact: true }),
  ).toBeVisible();
  await enqueue(page);
  await expect(page.locator('main')).toContainText('accepted.');
  await expect(page.locator('main')).toContainText('Status: COMPLETED', {
    timeout: 30000,
  });
  expect(names).toContain('MarketGenerationStatus');
  const settledReads = names.filter(
    (n) => n === 'MarketGenerationStatus',
  ).length;
  await page.waitForTimeout(2300);
  expect(names.filter((n) => n === 'MarketGenerationStatus')).toHaveLength(
    settledReads,
  );
  expect(
    names.filter((n) => n === 'MarketConfiguration').length,
  ).toBeGreaterThanOrEqual(2);
  await page
    .getByRole('link', { name: 'Back to occurrences', exact: true })
    .click();
  await page
    .getByLabel('From date (UTC, inclusive)', { exact: true })
    .fill(ready.ids.generationDate);
  await page
    .getByLabel('Through date (UTC, exclusive)', { exact: true })
    .fill(
      new Date(Date.parse(ready.ids.generationDate + 'T00:00:00Z') + 86400000)
        .toISOString()
        .slice(0, 10),
    );
  await page.getByRole('button', { name: 'Apply dates', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Market occurrences', exact: true }),
  ).toContainText(ready.ids.generationDate);
});
test('real native-cookie cross-Market occurrence, relationship, listing and generation-job attacks denied', async ({
  page,
}) => {
  await login(page);
  for (const [query, id] of [
    [
      'query($id:ID!){ownMarketOccurrence(id:$id){id venue}}',
      ready.ids.foreignOccurrence,
    ],
    [
      'query($id:ID!){ownMarketMembership(id:$id){id vendor{name}}}',
      ready.ids.foreignRelationship,
    ],
    [
      'query($id:ID!){ownMarketListingPublication(listingId:$id){state}}',
      ready.ids.foreignListing,
    ],
    [
      'query($id:ID!){ownMarketOccurrenceGenerationStatus(jobId:$id){status}}',
      ready.ids.foreignJob,
    ],
    ['query($id:ID!){ownMarketOccurrence(id:$id){id}}', '2147483647'],
  ]) {
    const r = await page.context().request.post(ready.endpoint, {
      headers: { 'vendure-token': ready.marketChannels[0]!.token },
      data: { query, variables: { id } },
    });
    const result = (await r.json()) as {
      data: unknown;
      errors?: { extensions?: { code?: string } }[];
    };
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(
      result.errors?.every(
        (e) => e.extensions?.code !== 'GRAPHQL_VALIDATION_FAILED',
      ),
    ).toBe(true);
    expect(result.data).toBeNull();
  }
});
for (const change of ['market-membership', 'market-role'])
  test(
    'real same-session ' + change + ' revocation clears new Market data',
    async ({ page }) => {
      await login(page);
      await navigate(page, 'Vendors');
      await expect(
        page.getByRole('table', { name: 'Vendor business relationships' }),
      ).toBeVisible();
      try {
        await action(change + '-revoke');
        await page
          .getByRole('button', { name: 'Refresh Vendor relationships' })
          .click();
        await expect(
          page.getByRole('heading', { name: 'Workspace unavailable' }),
        ).toBeVisible();
        await expect(page.locator('.market-workspace')).toHaveCount(0);
      } finally {
        await action(change + '-restore');
      }
    },
  );
test('real Market switch clears directory/results and generation job observation', async ({
  page,
}) => {
  await login(page);
  await navigate(page, 'Occurrences');
  await expect(
    page.getByRole('table', { name: 'Market occurrences', exact: true }),
  ).toBeVisible();
  await enqueue(page);
  await expect(page.locator('main')).toContainText('accepted.');
  await page
    .getByLabel('Workspace', { exact: true })
    .selectOption(ready.marketChannels[1]!.id);
  await expect(page.locator('.admin-topbar')).toContainText('market-b');
  await expect(page.locator('main')).not.toContainText('Generation request');
  await navigate(page, 'Vendors');
  await expect(
    page.getByRole('table', { name: 'Vendor business relationships' }),
  ).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Market Page Vendor');
});
for (const width of [390, 768, 1280])
  test(
    'real affected Market pages, directory dialog and status pass axe and responsive ' +
      width,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await login(page);
      for (const [label, path] of [
        ['vendors', '/market/vendors'],
        ['listings', '/market/vendors/listings/' + ready.ids.membership],
        ['occurrences', '/market/occurrences'],
        ['detail', '/market/occurrences/' + ready.ids.historicalOccurrence],
      ]) {
        await page.goto(path!);
        if (label === 'vendors')
          await expect(
            page.getByRole('table', { name: 'Vendor business relationships' }),
          ).toBeVisible();
        else if (label === 'listings')
          await expect(
            page.getByRole('table', {
              name: 'Listing approvals (backend order)',
            }),
          ).toContainText('ABC-123');
        else if (label === 'occurrences')
          await expect(
            page.getByRole('table', {
              name: 'Market occurrences',
              exact: true,
            }),
          ).toBeVisible();
        else
          await expect(page.locator('main .facts')).toContainText('2024-12-31');
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (process.env.FRONTEND_NO_EVIDENCE !== 'true')
          await page.screenshot({
            path: `${evidence}/live-market-${label}-${width}.png`,
            fullPage: true,
          });
      }
      await page.goto('/market/vendors');
      const add = page.getByRole('button', { name: 'Add Vendor', exact: true });
      await add.focus();
      await page.keyboard.press('Enter');
      await expect(
        page
          .getByRole('dialog', { name: 'Add Vendor' })
          .getByLabel('Vendor business'),
      ).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('dialog', { name: 'Add Vendor' }),
      ).not.toBeVisible();
      await expect(add).toBeFocused();
      await navigate(page, 'Occurrences');
      await expect(
        page.getByRole('table', { name: 'Market occurrences', exact: true }),
      ).toBeVisible();
      await enqueue(page);
      await expect(page.locator('main')).toContainText('Status: COMPLETED');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    },
  );
