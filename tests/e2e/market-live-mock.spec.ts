/** Fixture mode OFF; schema-executed frontend HTTP mocks, not a full-stack backend run. */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { buildSchema, graphql, GraphQLError } from 'graphql';
import {
  createFixtureMarketService,
  marketFixtureContext,
  marketGrantPresets,
} from '../../apps/admin/src/market/fixture';
import type { MarketApi } from '@market/api';
import { testUrl } from './urls';
const schema = buildSchema(
  readFileSync('packages/api/schema/admin.graphql', 'utf8'),
);
const url = testUrl(4324);
async function installMarketMock(page: Page) {
  const services = {
    '1': createFixtureMarketService(marketFixtureContext('1')),
    '2': createFixtureMarketService(marketFixtureContext('2')),
  };
  const control = {
    signedIn: false,
    revoked: false,
    stale: false,
    delaySettings: false,
    release: () => {},
    calls: [] as {
      operation: string;
      market: string;
      variables: Record<string, unknown>;
    }[],
  };
  await page.route('**/admin-api', async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as {
      query: string;
      variables: Record<string, unknown>;
    };
    const id =
      request.headers()['vendure-token'] === 'market-context-2' ? '2' : '1';
    const service = services[id];
    const operation = body.query.match(/(?:query|mutation) (\w+)/)?.[1] ?? '';
    control.calls.push({ operation, market: id, variables: body.variables });
    const user = () => ({
      __typename: 'CurrentUser',
      id: '90',
      identifier: 'synthetic-operator',
      channels: ['1', '2'].map((key) => ({
        id: key,
        code: `private-infrastructure-${key}`,
        token: `market-context-${key}`,
        permissions: control.revoked
          ? ['Authenticated']
          : [...marketGrantPresets.full],
      })),
    });
    if (
      control.delaySettings &&
      id === '1' &&
      operation === 'MarketConfiguration'
    )
      await new Promise<void>((resolve) => {
        control.release = resolve;
      });
    function protectedRead() {
      if (control.revoked)
        throw new GraphQLError('Private diagnostic must not render', {
          extensions: { code: 'FORBIDDEN' },
        });
    }
    const root = {
      me: () => (control.signedIn ? user() : null),
      login: () => {
        control.signedIn = true;
        return user();
      },
      logout: () => {
        control.signedIn = false;
        return { success: true };
      },
      ownMarketIdentity: async () => {
        protectedRead();
        const result = await service.identity();
        return {
          ...result,
          membership: { ...result.membership, principalId: '90' },
        };
      },
      ownMarketEligibleVendors: ({
        options,
      }: {
        options: Parameters<MarketApi['eligibleVendors']>[0];
      }) => {
        protectedRead();
        return service.eligibleVendors(options ?? {});
      },
      ownMarketVendorMemberships: ({
        options,
      }: {
        options: Parameters<MarketApi['relationshipPage']>[0];
      }) => {
        protectedRead();
        return service.relationshipPage(options ?? {});
      },
      ownMarketOccurrences: ({
        options,
      }: {
        options: Parameters<MarketApi['occurrencePage']>[0];
      }) => {
        protectedRead();
        return service.occurrencePage(options ?? {});
      },
      ownMarketOccurrence: ({ id }: { id: string }) => {
        protectedRead();
        return service.occurrence(id);
      },
      ownMarketMembership: async ({ id }: { id: string }) => {
        protectedRead();
        return (await service.relationshipDetail(id)).membership;
      },
      ownMarketMembershipOccurrencePage: async ({
        membershipId,
        options,
      }: {
        membershipId: string;
        options: { skip?: number };
      }) => {
        protectedRead();
        return (
          await service.relationshipDetail(membershipId, {
            occurrences: options?.skip ?? 0,
          })
        ).occurrences;
      },
      ownMarketMembershipParticipations: async ({
        membershipId,
        options,
      }: {
        membershipId: string;
        options: { skip?: number };
      }) => {
        protectedRead();
        return (
          await service.relationshipDetail(membershipId, {
            participations: options?.skip ?? 0,
          })
        ).participations;
      },
      ownMarketMembershipListings: async ({
        membershipId,
        options,
      }: {
        membershipId: string;
        options: { skip?: number };
      }) => {
        protectedRead();
        return (
          await service.relationshipDetail(membershipId, {
            listings: options?.skip ?? 0,
          })
        ).listings;
      },
      ownMarketMembershipOfferings: async ({
        membershipId,
        options,
      }: {
        membershipId: string;
        options: { skip?: number };
      }) => {
        protectedRead();
        return (
          await service.relationshipDetail(membershipId, {
            offerings: options?.skip ?? 0,
          })
        ).offerings;
      },
      ownMarketOverviewSummary: ({
        options,
      }: {
        options: Parameters<MarketApi['overview']>[0];
      }) => {
        protectedRead();
        return service.overview(options ?? {});
      },
      ownMarketOccurrenceGenerationStatus: ({ jobId }: { jobId: string }) => {
        protectedRead();
        return service.generationStatus(jobId);
      },
      ownMarketListingPublication: ({ listingId }: { listingId: string }) => {
        protectedRead();
        return service.listingPublication(listingId);
      },

      ownMarket: async ({ id: marketId }: { id: string }) => {
        protectedRead();
        return service.configuration(marketId);
      },
      marketOccurrences: async ({
        marketId,
        from,
        through,
      }: {
        marketId: string;
        from: string;
        through: string;
      }) => {
        protectedRead();
        return service.occurrences(marketId, from, through);
      },
      marketVendorMemberships: async ({ marketId }: { marketId: string }) => {
        protectedRead();
        return service.relationships(marketId);
      },
      marketMembershipState: async ({
        membershipId,
      }: {
        membershipId: string;
      }) => {
        protectedRead();
        return service.relationshipState(membershipId);
      },
      configureOwnMarket: ({
        input,
      }: {
        input: Parameters<MarketApi['configure']>[0];
      }) => service.configure(input),
      reviseMarketRecurrence: ({
        marketId,
        expectedVersion,
        recurrence,
      }: {
        marketId: string;
        expectedVersion: number;
        recurrence: Parameters<MarketApi['recurrence']>[2];
      }) => {
        if (control.stale)
          throw new GraphQLError('STALE_DOMAIN_VERSION', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        return service.recurrence(marketId, expectedVersion, recurrence);
      },
      generateMarketOccurrences: ({
        marketId,
        from,
        through,
      }: {
        marketId: string;
        from: string;
        through: string;
      }) => service.generate(marketId, from, through),
      enqueueMarketOccurrenceGeneration: ({
        marketId,
        from,
        through,
      }: {
        marketId: string;
        from: string;
        through: string;
      }) => service.enqueue(marketId, from, through),
      createManualMarketOccurrence: ({
        marketId,
        scheduleDate,
        generationKey,
        input,
      }: {
        marketId: string;
        scheduleDate: string;
        generationKey: string;
        input: Parameters<MarketApi['manual']>[3];
      }) => service.manual(marketId, scheduleDate, generationKey, input),
      reviseMarketOccurrence: ({
        id,
        expectedVersion,
        input,
      }: {
        id: string;
        expectedVersion: number;
        input: Parameters<MarketApi['reviseOccurrence']>[2];
      }) => service.reviseOccurrence(id, expectedVersion, input),
      cancelMarketOccurrence: ({
        id,
        expectedVersion,
      }: {
        id: string;
        expectedVersion: number;
      }) => service.cancelOccurrence(id, expectedVersion),
      setMarketVendorMembership: ({
        marketId,
        vendorId,
        status,
        expectedVersion,
      }: {
        marketId: string;
        vendorId: string;
        status: Parameters<MarketApi['membershipStatus']>[2];
        expectedVersion: number;
      }) =>
        service.membershipStatus(marketId, vendorId, status, expectedVersion),
      approveMarketListing: ({
        id,
        expectedVersion,
        status,
      }: {
        id: string;
        expectedVersion: number;
        status: Parameters<MarketApi['approveListing']>[2];
      }) => service.approveListing(id, expectedVersion, status),
      configureMarketParticipation: ({
        input,
      }: {
        input: Parameters<MarketApi['participation']>[0];
      }) => service.participation(input),
      configureMarketOffering: ({
        input,
      }: {
        input: Parameters<MarketApi['offering']>[0];
      }) => service.offering(input),
      rematerializeMarketOfferingWindow: ({
        id,
        expectedVersion,
      }: {
        id: string;
        expectedVersion: number;
      }) => service.rematerialize(id, expectedVersion),
      ownOccurrenceCustomerOperations: async ({
        occurrenceId,
        options,
      }: {
        occurrenceId: string;
        options: { skip: number };
      }) => {
        protectedRead();
        return service.operations(occurrenceId, options?.skip ?? 0);
      },
      ownFeatureAvailability: () => service.featureAvailability(),
      ownMarketAnalytics: ({
        marketId,
        range,
      }: {
        marketId: string;
        range: Parameters<MarketApi['analytics']>[1];
      }) => service.analytics(marketId, range),
      ownMarketOccurrenceAnalytics: ({
        marketId,
        range,
        occurrenceId,
      }: {
        marketId: string;
        range: Parameters<MarketApi['analytics']>[1];
        occurrenceId: string | null;
      }) => service.occurrenceAnalytics(marketId, range, occurrenceId),
    };
    const result = await graphql({
      schema,
      source: body.query,
      variableValues: body.variables,
      rootValue: root,
    });
    await route.fulfill({
      json: result,
      headers: {
        'Access-Control-Allow-Origin': url,
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  });
  return control;
}
test('production Market login and all modules use generated own contracts, with real-shaped stale conflict', async ({
  page,
}) => {
  const mock = await installMarketMock(page);
  await page.goto(url + '/market');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Email or username').fill('synthetic-operator');
  await page
    .getByLabel('Password', { exact: true })
    .fill('synthetic-test-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('main')).toContainText(
    '2 upcoming scheduled occurrences',
  );
  await expect(page.locator('body')).not.toContainText(
    'private-infrastructure',
  );
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Settings', exact: true })
    .click();
  await page
    .getByRole('link', { name: 'Manage repeating schedule and generate dates' })
    .click();
  await page.getByLabel('Market starts at', { exact: true }).fill('11:30');
  await page.getByRole('button', { name: 'Save schedule' }).click();
  await expect(
    page.getByLabel('Market starts at', { exact: true }),
  ).toHaveValue('11:30');
  mock.stale = true;
  await page.getByRole('button', { name: 'Save schedule' }).click();
  await expect(
    page.getByRole('heading', { name: 'Refresh required' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save schedule' }),
  ).toBeDisabled();
  mock.stale = false;
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Occurrences', exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Market occurrences' }),
  ).toBeVisible();
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
    page.getByRole('table', { name: 'Market occurrences' }).locator('tbody tr'),
  ).toHaveCount(3);
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Vendors', exact: true })
    .click();
  await page
    .getByRole('link', { name: 'Synthetic Market A Vendor 1', exact: true })
    .click();
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
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Operations', exact: true })
    .click();
  await page
    .getByRole('link', { name: /View operations for/ })
    .first()
    .click();
  await expect(page.locator('main')).toContainText('Showing 1 to 20');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('main')).toContainText('Showing 21 to 23');
  await page
    .locator('.admin-sidebar')
    .getByRole('link', { name: 'Analytics', exact: true })
    .click();
  await expect(page.locator('main')).toContainText('Purchase count');
  await page.getByLabel('Bucket view').selectOption('occurrence');
  await page.getByRole('button', { name: 'Apply view' }).click();
  await expect(page.locator('main')).toContainText('occurrence reference 101');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    mock.calls.some((call) => call.operation === 'MarketOccurrenceAnalytics'),
  ).toBe(true);
  const operations = mock.calls.map((call) => call.operation);
  expect(operations).toContain('MarketIdentity');
  expect(operations).toContain('MarketConfiguration');
  expect(
    operations.every(
      (operation) =>
        !operation.startsWith('Vendor') && !operation.startsWith('Shop'),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
test('production same-browser context switch ignores late Market A response and revocation clears Market B', async ({
  page,
}) => {
  const mock = await installMarketMock(page);
  mock.signedIn = true;
  await page.goto(url + '/market/settings');
  await expect(page.getByLabel('Market name', { exact: true })).toHaveValue(
    'Synthetic Market A',
  );
  mock.delaySettings = true;
  await page
    .getByRole('button', { name: 'Refresh settings', exact: true })
    .click();
  await expect(
    page.getByText('Loading current records', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Workspace', { exact: true }).selectOption('2');
  await expect(page.getByLabel('Market name', { exact: true })).toHaveValue(
    'Synthetic Market B',
  );
  mock.release();
  await expect(page.getByLabel('Market name', { exact: true })).toHaveValue(
    'Synthetic Market B',
  );
  await expect(page.locator('body')).not.toContainText('Synthetic Market A');
  mock.revoked = true;
  await page
    .getByRole('button', { name: 'Refresh settings', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Workspace unavailable' }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Synthetic Market B');
  await expect(page.locator('body')).not.toContainText('Private diagnostic');
});
