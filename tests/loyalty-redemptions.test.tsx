import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoyaltyOverview, LoyaltyRedemption, PosSale } from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { VendorLoyalty } from '../apps/admin/src/vendor/loyalty';
import {
  filterRedemptions,
  readRedemptions,
  readRedemptionOrder,
  readRedemptionSpending,
  type RedemptionFilters,
} from '../apps/admin/src/vendor/loyalty-redemptions-data';

function setup(count = 23) {
  const service = createFixtureVendorService({
    ...fixtureContexts.VENDOR,
    permissions: ['ReadOwnOrders', 'ReadOwnCRM', 'ReadOwnVendorFinance'],
  });
  const rows: LoyaltyRedemption[] = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    wallet_id: 800,
    order_id: 100 + i,
    vendor_order_id: 200 + i,
    customer: 'Customer 800',
    status: i === 0 ? 'REVERSED' : 'COMPLETED',
    discount: 500,
    created_at: new Date(Date.UTC(2026, 9, 1, 12, i)).toISOString(),
    terms: {
      name: i === 1 ? 'Free berries' : '$5 Off Honey',
      kind: 'FIXED',
      points: 500,
      value: 500,
      maximum: 0,
      minimum: 0,
      variantIds: [],
      quantity: 1,
      startsAt: null,
      endsAt: null,
      limit: null,
    },
  }));
  const overview = vi.fn(
    async (filter: Record<string, unknown> = {}): Promise<LoyaltyOverview> => {
      const skip = Number(filter.skip ?? 0),
        take = Math.min(10, Number(filter.take ?? 10));
      return {
        enabled: true,
        rewards: [],
        redemptions: rows.slice(skip, skip + take),
        leaderboard:
          skip === 0
            ? [
                {
                  id: 800,
                  customerId: '55',
                  customer: 'Customer 800',
                  earned: '5000',
                  available: '0',
                  orders: count,
                  last_purchase: null,
                },
              ]
            : [],
        top: [],
        trend: [],
        skip,
        take,
        metrics: {
          customers: 1,
          outstanding: '0',
          pending: '0',
          issued: '0',
          lifetime: '0',
          repeat: 0,
          rewardOrders: count,
        },
      };
    },
  );
  service.loyalty = { overview } as unknown as NonNullable<
    typeof service.loyalty
  >;
  service.customers = vi.fn(async () => ({
    items: [
      {
        id: 'relationship-1',
        customerId: '55',
        firstName: 'Emily',
        lastName: 'Carter',
        emailAddress: 'emily@example.com',
        status: 'ACTIVE',
        purpose: 'PURCHASE',
        firstActivityAt: '2026-01-01',
        lastActivityAt: '2026-10-01',
        purchaseCount: count,
        attribution: [],
      },
    ],
    totalItems: 1,
  }));
  const base = awaitableOrder(service);
  service.order = vi.fn(async (id) => ({
    ...base,
    portion: {
      ...base.portion,
      operationalOrderId: id,
      kind: 'MARKET_OCCURRENCE',
      marketName: 'Boerne Farmers Market',
    },
  }));
  return { service, overview, rows, base };
}
function awaitableOrder(
  service: ReturnType<typeof createFixtureVendorService>,
) {
  // The fixture's operational portion shape stays authoritative for the details reader.
  return {
    portion: {
      operationalOrderId: '200',
      vendorId: service.vendorId,
      kind: 'MARKET_OCCURRENCE',
      marketId: '1',
      marketName: 'Boerne Farmers Market',
      occurrenceId: '1',
      occurrenceStartsAt: null,
      placedAt: null,
      lineCount: 0,
      quantity: 0,
      fulfilledQuantity: 0,
      cancelledQuantity: 0,
      remainingQuantity: 0,
      nativeState: 'PaymentSettled',
      pickupStatus: 'UNFULFILLED',
      lines: [],
      fulfillments: [],
      pickupPromise: {
        mode: 'MARKET',
        venue: null,
        instructions: null,
        startsAt: null,
        endsAt: null,
      },
    },
    context: null,
  };
}
beforeEach(() => window.history.replaceState(null, '', '/vendor/loyalty'));

describe('redeemed rewards workspace', () => {
  it('reads all pages, joins CRM by wallet and customer IDs, and rejects repeating records', async () => {
    const { service, overview } = setup();
    const rows = await readRedemptions(service);
    expect(rows).toHaveLength(23);
    expect(rows[0]).toMatchObject({
      customer: 'Emily Carter',
      relationship: { id: 'relationship-1' },
    });
    expect(overview.mock.calls.map(([filter]) => filter?.skip)).toEqual([
      0, 10, 20,
    ]);
    overview.mockImplementation(
      async () =>
        ({
          redemptions: [rows[0]],
          leaderboard: [],
          take: 1,
        }) as unknown as LoyaltyOverview,
    );
    await expect(readRedemptions(service)).rejects.toMatchObject({
      kind: 'conflict',
    });
  });
  it('reuses the workspace, computes totals across pages, filters, selects, and opens existing destinations', async () => {
    const { service } = setup();
    render(
      <VendorLoyalty service={service} path="/vendor/loyalty/redemptions" />,
    );
    const table = await screen.findByRole('table', {
      name: 'Redemption history',
    });
    expect(window.location.hash).toBe('#redemptions');
    expect(
      screen.getByRole('link', { name: 'Redeemed rewards' }),
    ).toHaveAttribute('aria-current', 'page');
    const metrics = screen.getByLabelText(
      'Completed redemptions in filtered results',
    );
    expect(metrics).toHaveTextContent('22');
    expect(metrics).toHaveTextContent('11,000 pts');
    expect(metrics).toHaveTextContent('$110.00');
    expect(within(table).getAllByRole('row')).toHaveLength(21);
    const details = screen.getByRole('region', { name: 'Redemption details' });
    expect(
      await within(details).findByText('Boerne Farmers Market'),
    ).toBeVisible();
    expect(
      within(details).getByRole('link', { name: 'View customer' }),
    ).toHaveAttribute('href', '/vendor/customers/relationship-1');
    expect(
      within(details).getByRole('link', { name: 'View order' }),
    ).toHaveAttribute('href', '/vendor/orders/222');
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: 'Redemption pages' }),
      ).getByRole('button', { name: /Next/ }),
    );
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(metrics).toHaveTextContent('$110.00');
    fireEvent.change(screen.getByLabelText('Search customer or reward'), {
      target: { value: 'berries' },
    });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(metrics).toHaveTextContent('$5.00');
    expect(
      screen.queryByRole('button', { name: 'Close redemption details' }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('row', { name: /View redemption 2:/ }), {
      key: 'Enter',
    });
    expect(
      screen.getByRole('region', { name: 'Redemption details' }),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText('Search customer or reward'), {
      target: { value: 'missing' },
    });
    expect(screen.getByText('No redemptions match')).toBeVisible();
  });
  it('keeps lifecycle records out of redeemed totals and supports local inclusive dates', () => {
    const { rows } = setup();
    const filters: RedemptionFilters = {
      search: '',
      reward: 'all',
      status: 'COMPLETED',
      period: 'custom',
      range: { from: '2026-10-01', to: '2026-10-01' },
      sort: 'oldest',
    };
    expect(filterRedemptions(rows, filters)).toHaveLength(22);
    expect(
      filterRedemptions(rows, { ...filters, status: 'REVERSED' }),
    ).toHaveLength(1);
    expect(
      filterRedemptions(rows, {
        ...filters,
        range: { from: '2026-10-02', to: '2026-10-03' },
      }),
    ).toHaveLength(0);
  });
  it('distinguishes market and independent receipts, preserves unknown context, and gates privileged reads', async () => {
    const { service, rows, base } = setup();
    service.order = vi.fn(async () => ({
      ...base,
      portion: { ...base.portion, kind: 'IN_PERSON', marketName: null },
    }));
    const payment = vi.fn(
      async () =>
        ({ context: { kind: 'INDEPENDENT', label: 'My stand' } }) as PosSale,
    );
    service.pos = { orderPayment: payment } as unknown as NonNullable<
      typeof service.pos
    >;
    expect((await readRedemptionOrder(service, rows[1]!))?.location).toBe(
      'Independent sale',
    );
    payment.mockResolvedValue({
      context: { kind: 'MARKET', label: 'Boerne Farmers Market' },
    } as PosSale);
    expect((await readRedemptionOrder(service, rows[1]!))?.location).toBe(
      'Boerne Farmers Market',
    );
    service.context.permissions = ['ReadOwnOrders'];
    payment.mockClear();
    expect((await readRedemptionOrder(service, rows[1]!))?.location).toBe(
      'Unavailable',
    );
    expect(payment).not.toHaveBeenCalled();
    service.context.permissions = [];
    vi.mocked(service.order).mockClear();
    expect(await readRedemptionOrder(service, rows[1]!)).toBeNull();
    expect(service.order).not.toHaveBeenCalled();
    await readRedemptions(service);
    expect(service.customers).not.toHaveBeenCalled();
  });
  it('deduplicates discounted purchases and excludes missing totals', async () => {
    const { service, rows, base } = setup(3);
    service.order = vi.fn(async () => ({
      ...base,
      context: {
        kind: 'DIRECT_VENDOR',
        marketId: null,
        occurrenceId: null,
        financialStatus: 'PAID',
        currency: 'USD',
        original: 2750,
        refunded: 0,
        remaining: 2750,
      },
    }));
    const totals = await readRedemptionSpending(service, [
      rows[1]!,
      rows[1]!,
      rows[2]!,
      rows[0]!,
    ]);
    expect([...totals.values()]).toEqual([2750, 2750]);
    expect(service.order).toHaveBeenCalledTimes(2);
    service.context.permissions = [];
    expect((await readRedemptionSpending(service, rows)).size).toBe(0);
  });
  it('handles read failure and retry without losing the loyalty navigation', async () => {
    const { service, overview } = setup(0);
    overview.mockRejectedValueOnce(new Error('offline'));
    render(
      <VendorLoyalty service={service} path="/vendor/loyalty/redemptions" />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Refresh records' }),
    );
    await screen.findByText('No redeemed rewards yet');
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Loyalty' })).toBeVisible(),
    );
  });
});
