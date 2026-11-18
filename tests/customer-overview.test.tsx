// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { APIContext } from 'astro';
import type { CustomerEvent, CustomerPurchase } from '@market/api';
import CustomerOverview from '../apps/storefront/src/components/CustomerOverview';
import {
  defaultOverviewLayout,
  normalizeOverviewLayout,
  overviewWidgets,
} from '../apps/storefront/src/lib/customer-overview';
import {
  awaitingPickup,
  purchasePickup,
  relativeDays,
} from '../apps/storefront/src/lib/customer-presentation';
import { POST } from '../apps/storefront/src/pages/api/customer-dashboard-layout';

afterEach(cleanup);

const event = (id: string, startsAt: string, vendors = 0): CustomerEvent => ({
  id,
  startsAt,
  endsAt: new Date(Date.parse(startsAt) + 5 * 3600_000).toISOString(),
  timezone: 'America/Chicago',
  venue: 'Main Plaza',
  status: 'SCHEDULED',
  marketId: '7',
  marketName: `Market ${id}`,
  marketUrl: null,
  url: null,
  followedMarket: true,
  vendors: Array.from({ length: vendors }, (_, i) => ({
    id: String(i + 1),
    name: `Vendor ${i + 1}`,
    url: null,
  })),
});
const purchase = (orderId: string, pickup: string[]): CustomerPurchase => ({
  id: orderId,
  orderId,
  kind: 'DIRECT_VENDOR',
  purchasedAt: '2026-10-14T15:00:00Z',
  occurrenceId: null,
  nativeState: 'PaymentSettled',
  storefront: { id: '1', displayName: 'Manna Roots' },
  financial: {
    currency: 'USD',
    originalPaid: 4300,
    refunded: 0,
    remaining: 4300,
    financialStatus: 'PAID',
  },
  portions: pickup.map((pickupStatus, i) => ({
    vendorId: String(i + 1),
    vendorName: `Vendor ${i + 1}`,
    pickupStatus,
    nativeState: 'PaymentSettled',
    marketName: null,
    occurrenceStartsAt: null,
    pickupPromise: {
      venue: null,
      instructions: null,
      startsAt: null,
      endsAt: null,
    },
    lines: [
      {
        customerLineId: `${orderId}-${i}`,
        variantName: 'Carrot juice',
        quantity: 2,
        fulfilledQuantity: 0,
        cancelledQuantity: 0,
        remainingQuantity: 2,
      },
    ],
  })),
});

describe('customer Overview layout', () => {
  it('starts from the default arrangement and keeps every section', () => {
    const layout = normalizeOverviewLayout(null);
    expect(layout).toEqual(normalizeOverviewLayout(defaultOverviewLayout));
    expect(layout.grid!.map((cell) => cell.id).sort()).toEqual(
      overviewWidgets.map((w) => w.id).sort(),
    );
    expect(layout.hidden).toEqual([]);
  });
  it('drops unknown sections, clamps sizes and keeps hidden sections', () => {
    const layout = normalizeOverviewLayout({
      order: [],
      hidden: ['rewards', 'unknown', 'rewards'],
      grid: [
        { id: 'unknown', x: 0, y: 0, w: 2, h: 2 },
        { id: 'glance', x: 3, y: 4, w: 2, h: 3 },
        { id: 'rewards', x: 0, y: 1, w: 8, h: 9 },
      ],
    });
    expect(layout.hidden).toEqual(['rewards']);
    expect(layout.grid!.some((cell) => cell.id === 'unknown')).toBe(false);
    // The band is always full width and one row.
    expect(layout.grid!.find((cell) => cell.id === 'glance')).toMatchObject({
      x: 0,
      w: 8,
      h: 1,
    });
    expect(layout.grid!.find((cell) => cell.id === 'rewards')).toMatchObject({
      w: 4,
      h: 3,
    });
  });
});

describe('customer presentation helpers', () => {
  it('counts relative days in the given time zone', () => {
    const now = Date.parse('2026-11-08T23:30:00-06:00');
    // 05:30 UTC next day is still November 8 in Chicago.
    expect(relativeDays('2026-11-09T05:30:00Z', now, 'America/Chicago')).toBe(
      'Today',
    );
    expect(relativeDays('2026-11-09T15:00:00Z', now, 'America/Chicago')).toBe(
      'Tomorrow',
    );
    expect(relativeDays('2026-11-14T15:00:00Z', now, 'America/Chicago')).toBe(
      'In 6 days',
    );
  });
  it('summarizes pickup across vendor portions', () => {
    expect(
      purchasePickup(purchase('1', ['COLLECTED', 'COLLECTED'])).label,
    ).toBe('Picked up');
    expect(purchasePickup(purchase('2', ['PENDING', 'PENDING'])).label).toBe(
      'Pickup pending',
    );
    expect(purchasePickup(purchase('3', ['COLLECTED', 'PENDING'])).label).toBe(
      'Partially picked up',
    );
    expect(awaitingPickup(purchase('4', ['COLLECTED', 'PARTIAL']))).toBe(true);
    expect(awaitingPickup(purchase('5', ['CANCELLED']))).toBe(false);
  });
});

describe('CustomerOverview', () => {
  const data = {
    firstName: 'Demo',
    counts: { orders: 2, markets: 1, vendors: 1 },
    events: [
      event('62', '2026-11-14T15:00:00Z', 1),
      event('63', '2026-11-21T15:00:00Z'),
    ],
    purchases: [purchase('47', ['PENDING']), purchase('31', ['COLLECTED'])],
    markets: [
      {
        id: '7',
        name: 'Boerne Farmers Market',
        status: null,
        url: null,
        following: true,
      },
    ],
    vendors: [],
    wallets: null,
    layout: null,
    now: Date.parse('2026-11-08T18:00:00Z'),
    timeZone: 'America/Chicago',
  };
  it('shows upcoming markets, pickups and orders without charts', () => {
    const { container } = render(<CustomerOverview {...data} />);
    expect(
      screen.getByRole('heading', { name: 'Overview', level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText('Market 62')).toBeTruthy();
    expect(screen.getAllByText('In 6 days')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Order 47' })).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: /Ready for pickup/ }),
    ).toBeTruthy();
    expect(screen.getByText(/Loyalty is temporarily unavailable/)).toBeTruthy();
    expect(screen.getByText('No favorite vendors')).toBeTruthy();
    expect(
      container.querySelector('svg.finance-chart, .finance-donut'),
    ).toBeNull();
    expect(
      [...container.querySelectorAll('[data-widget]')].map(
        (node) => (node as HTMLElement).dataset.widget,
      ),
    ).toEqual(defaultOverviewLayout.order);
  });
  it('leaves hidden sections out and opens the shared layout editor', () => {
    render(
      <CustomerOverview
        {...data}
        layout={{ ...defaultOverviewLayout, hidden: ['rewards', 'pickups'] }}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: /Ready for pickup/ }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    expect(
      screen.getByRole('heading', { name: 'Customize Overview' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Loyalty rewards/ }),
    ).toBeTruthy();
  });
});

describe('customer Overview layout endpoint', () => {
  const context = (body: string, origin = 'http://auth.platform.localhost') =>
    ({
      request: new Request(
        'http://auth.platform.localhost/api/customer-dashboard-layout',
        {
          method: 'POST',
          headers: { origin, 'content-type': 'application/json' },
          body,
        },
      ),
      url: new URL(
        'http://auth.platform.localhost/api/customer-dashboard-layout',
      ),
      cookies: { get: vi.fn() },
      locals: {},
    }) as unknown as APIContext;
  it('rejects cross-origin and malformed saves before any account call', async () => {
    expect(
      (await POST(context('{"layout":{}}', 'https://evil.example'))).status,
    ).toBe(403);
    expect((await POST(context('not json'))).status).toBe(400);
    expect((await POST(context('{"layout":null}'))).status).toBe(400);
  });
});
