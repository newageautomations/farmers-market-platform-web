import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { testUrl, evidenceRoot } from './urls';
const fixtureUrl = testUrl(4322);
const modules = [
  'Overview',
  'Occurrences',
  'Vendors',
  'Operations',
  'Analytics',
  'Settings',
];
for (const width of [390, 768, 1280]) {
  test(`six Market modules pass axe and responsive checks at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const module of modules) {
      const path =
        module === 'Overview' ? '/market' : `/market/${module.toLowerCase()}`;
      await page.goto(fixtureUrl + path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(module);
      await expect(
        page.getByText('Loading current records', { exact: true }),
      ).toHaveCount(0);
      await expect(page.locator('main')).toContainText(
        module === 'Settings'
          ? 'America/Chicago'
          : module === 'Analytics'
            ? 'Purchase count'
            : module === 'Overview'
              ? '2 upcoming scheduled occurrences'
              : module === 'Vendors'
                ? 'Synthetic Market A Vendor 1'
                : module === 'Occurrences'
                  ? 'generated'
                  : 'View operations for',
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (process.env.FRONTEND_NO_EVIDENCE !== 'true')
        await page.screenshot({
          path: `${evidenceRoot}/market-${module.toLowerCase()}-${width}.png`,
          fullPage: true,
        });
    }
  });
}
test('Market settings and recurrence commands reread and stale refusal stays safe', async ({
  page,
}) => {
  await page.goto(fixtureUrl + '/market/settings');
  await page
    .getByLabel('Market name', { exact: true })
    .fill('Changed synthetic Market');
  await page
    .locator('section')
    .filter({
      has: page.getByRole('heading', {
        name: 'Market configuration',
        exact: true,
      }),
    })
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(page.getByLabel('Market name', { exact: true })).toHaveValue(
    'Changed synthetic Market',
  );
  await expect(page.locator('main')).toContainText('version 2');
  await page
    .getByRole('link', { name: 'Manage repeating schedule and generate dates' })
    .click();
  await page.getByLabel('Market starts at', { exact: true }).fill('11:30');
  await page
    .getByRole('button', { name: 'Save schedule', exact: true })
    .click();
  await expect(
    page.getByLabel('Market starts at', { exact: true }),
  ).toHaveValue('11:30');
  await page.getByLabel('Market response preview').selectOption('conflict');
  await page
    .getByRole('button', { name: 'Save schedule', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Refresh required' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save schedule', exact: true }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('generated/manual occurrences, deliberate cancellation and native dialog focus', async ({
  page,
}) => {
  await page.goto(fixtureUrl + '/market/occurrences');
  await page
    .locator('main')
    .getByRole('link', { name: 'Generate occurrences', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Generate occurrences', exact: true })
    .click();
  await page
    .getByRole('link', { name: 'Back to occurrences', exact: true })
    .click();
  await expect(
    page
      .getByRole('table', { name: 'Market occurrences', exact: true })
      .locator('tbody tr'),
  ).toHaveCount(3);
  await page
    .locator('main')
    .getByRole('link', { name: 'Generate occurrences', exact: true })
    .click();
  await page
    .getByLabel('Generation execution', { exact: true })
    .selectOption('queued');
  await page
    .getByRole('button', { name: 'Generate occurrences', exact: true })
    .click();
  await expect(page.locator('main')).toContainText('accepted.');
  await expect(page.locator('main')).toContainText('Status: COMPLETED');
  await page
    .getByRole('link', { name: 'Back to occurrences', exact: true })
    .click();
  await page
    .locator('main')
    .getByRole('link', { name: 'Create manual occurrence', exact: true })
    .click();
  const day = new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Start date', { exact: true }).fill(day);
  await page.getByLabel('Start time', { exact: true }).fill('10:00');
  await page.getByLabel('End date', { exact: true }).fill(day);
  await page.getByLabel('End time', { exact: true }).fill('14:00');
  await page
    .getByRole('button', { name: 'Create manual occurrence', exact: true })
    .click();
  await page
    .getByRole('link', { name: 'Back to occurrences', exact: true })
    .click();
  await expect(
    page
      .getByRole('table', { name: 'Market occurrences', exact: true })
      .locator('tbody tr'),
  ).toHaveCount(4);
  await page.goto(fixtureUrl + '/market/occurrences/102');
  await page
    .getByLabel('Venue snapshot', { exact: true })
    .fill('Revised fixture venue');
  await page
    .locator('section')
    .filter({
      has: page.getByRole('heading', {
        name: 'Revise occurrence',
        exact: true,
      }),
    })
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(page.locator('main')).toContainText('Version 2');
  const cancel = page.getByRole('button', {
    name: 'Cancel occurrence',
    exact: true,
  });
  await cancel.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(
    'does not automatically refund purchases, restock inventory or notify customers',
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(cancel).toBeFocused();
  await cancel.click();
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.locator('main')).toContainText('cancelled');
  await expect(page.locator('main')).not.toContainText(
    /refund issued|inventory restored|customers notified/i,
  );
});
test('membership/listing/participation/offering stay distinct with confirmations', async ({
  page,
}) => {
  await page.goto(fixtureUrl + '/market/vendors/11');
  await page.getByLabel('Business membership status').selectOption('approved');
  await page.getByRole('button', { name: 'Update membership' }).click();
  await expect(page.locator('main')).toContainText(
    'Business membership approved',
  );
  await page
    .locator('main')
    .getByRole('link', { name: 'Listing approvals', exact: true })
    .click();
  await page.getByRole('button', { name: 'Update listing approval' }).click();
  await expect(
    page.getByRole('table', { name: 'Listing approvals (backend order)' }),
  ).toContainText('approved');
  await expect(page.locator('main')).toContainText(
    'Approval, publication and offering availability remain separate',
  );
  await page.getByLabel('Listing approval status').selectOption('withdrawn');
  await page.getByRole('button', { name: 'Update listing approval' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm change' })
    .click();
  await expect(
    page.getByRole('table', { name: 'Listing approvals (backend order)' }),
  ).toContainText('withdrawn');
  await page.goto(fixtureUrl + '/market/vendors/offerings/12');
  await expect(
    page.getByRole('table', { name: 'Market offerings (backend order)' }),
  ).toContainText('20');
  const offering = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: 'Configure offering 12001',
      exact: true,
    }),
  });
  await offering.getByLabel('Occurrence sales cap (optional)').fill('25');
  await offering.getByRole('button', { name: 'Save offering' }).click();
  await expect(
    page.getByRole('table', { name: 'Market offerings (backend order)' }),
  ).toContainText('25');
  await page
    .getByRole('button', { name: 'Apply current window configuration' })
    .click();
  await expect(
    page
      .getByRole('table', { name: 'Market offerings (backend order)' })
      .locator('tbody tr')
      .first()
      .locator('td')
      .last(),
  ).toHaveText('3');
  await page
    .locator('main')
    .getByRole('link', { name: 'Occurrence participation', exact: true })
    .click();
  await page
    .getByLabel('Participation status', { exact: true })
    .selectOption('cancelled');
  await page.getByRole('button', { name: 'Update participation' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm change' })
    .click();
  await expect(
    page.getByRole('table', {
      name: 'Occurrence participation (backend order)',
    }),
  ).toContainText('cancelled');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('operations page shows complete server paging and safe operational semantics', async ({
  page,
}) => {
  await page.goto(fixtureUrl + '/market/operations/101');
  await expect(page.locator('main')).toContainText('Showing 1 to 20');
  await expect(page.locator('main')).toContainText('PARTIALLY_COMPLETED');
  await expect(page.locator('main')).toContainText('AWAITING');
  await expect(page.locator('main')).not.toContainText(
    /customer email|customer phone|payment details|vendor attributed|refunded|paid out/i,
  );
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('main')).toContainText('Showing 21 to 23');
  await expect(
    page.getByRole('button', { name: 'Next', exact: true }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('mobile navigation, hidden permission module and forbidden direct routes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(fixtureUrl + '/market');
  await page.getByLabel('Market permission preset').selectOption('operations');
  await page.locator('.admin-mobile-nav summary').click();
  await expect(
    page
      .locator('.admin-mobile-nav')
      .getByRole('link', { name: 'Analytics', exact: true }),
  ).toHaveCount(0);
  await page
    .locator('.admin-mobile-nav')
    .getByRole('link', { name: 'Settings', exact: true })
    .click();
  await expect(page.locator('main')).toContainText(
    'Configuration is read only',
  );
  await page.evaluate(() => {
    history.pushState(null, '', '/market/analytics');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Access restricted',
  );
  await page.evaluate(() => {
    history.pushState(null, '', '/market/vendors/11/deeper');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Access restricted',
  );
});
test('one browser lifecycle visits every module and switching to Market B clears Market A', async ({
  page,
}) => {
  await page.goto(fixtureUrl + '/market');
  for (const module of modules) {
    await page
      .locator('.admin-sidebar')
      .getByRole('link', { name: module, exact: true })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(module);
    await expect(
      page.getByText('Loading current records', { exact: true }),
    ).toHaveCount(0);
  }
  await page.getByLabel('Market preview').selectOption('2');
  await expect(page.getByLabel('Market name', { exact: true })).toHaveValue(
    'Synthetic Market B',
  );
  for (const module of modules) {
    await page
      .locator('.admin-sidebar')
      .getByRole('link', { name: module, exact: true })
      .click();
    await expect(
      page.getByText('Loading current records', { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('Synthetic Market A');
    await expect(page.locator('main')).not.toContainText(
      'Synthetic Market A Vendor 1',
    );
  }
});
test('analytics availability and freshness do not obstruct core administration', async ({
  page,
}) => {
  await page.goto(fixtureUrl + '/market/analytics');
  for (const state of ['DENIED', 'UNKNOWN', 'UNCONFIGURED', 'ALLOWED']) {
    await page.getByLabel('Market analytics availability').selectOption(state);
    await expect(page.locator('main')).toContainText(
      `Market analytics: ${state}`,
    );
  }
  await page.getByLabel('Market projection preview').selectOption('BUILDING');
  await expect(page.locator('main')).toContainText('Projection: BUILDING');
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Occurrences', exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Market occurrences' }),
  ).toBeVisible();
});
