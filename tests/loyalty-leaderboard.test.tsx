import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppError,
  type Customer,
  type LoyaltyOverview,
  type LoyaltyRank,
} from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { VendorLoyalty } from '../apps/admin/src/vendor/loyalty';
import {
  leaderboardCsv,
  readLoyaltyLeaderboard,
} from '../apps/admin/src/vendor/loyalty-leaderboard-data';

function setup(count = 25) {
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  const customers: Customer[] = Array.from({ length: count }, (_, i) => ({
    id: `relationship-${i}`,
    customerId: String(100 + i),
    firstName: ['Sarah', 'Emily', 'Olivia'][i] ?? `Member ${i}`,
    lastName: 'Test',
    emailAddress: `member${i}@example.com`,
    status: 'ACTIVE',
    purpose: 'PURCHASE',
    firstActivityAt: '2026-01-01',
    lastActivityAt: '2026-11-01',
    purchaseCount: 30 - i,
    attribution: [
      { currency: 'USD', original: 150000, refunded: 1000, remaining: 149000 },
      { currency: 'CAD', original: 2000, refunded: 0, remaining: 2000 },
    ],
  }));
  const ranks: LoyaltyRank[] = customers.map((c, i) => ({
    id: 800 + i,
    customerId: c.customerId,
    customer: `Customer ${800 + i}`,
    rank: i + 1,
    earned: String(12480 - i * 50),
    available: '2000',
    orders: 30 - i,
    last_purchase: null,
  }));
  service.customers = vi.fn(async (options) => ({
    items: customers.slice(
      options?.skip ?? 0,
      (options?.skip ?? 0) + (options?.take ?? 100),
    ),
    totalItems: customers.length,
  }));
  const overview = vi.fn(
    async (filter: Record<string, unknown> = {}): Promise<LoyaltyOverview> => ({
      enabled: true,
      metrics: {
        customers: count,
        outstanding: '0',
        pending: '0',
        issued: '0',
        lifetime: '0',
        repeat: 0,
        rewardOrders: 0,
      },
      trend: [],
      rewards: [],
      redemptions: [],
      top: ranks.slice(0, 3),
      leaderboard: ranks.slice(
        Number(filter.skip ?? 0),
        Number(filter.skip ?? 0) + Number(filter.take ?? 25),
      ),
      skip: Number(filter.skip ?? 0),
      take: Number(filter.take ?? 25),
    }),
  );
  service.loyalty = {
    overview,
    program: vi.fn(),
    save: vi.fn(),
  } as unknown as NonNullable<typeof service.loyalty>;
  return { service, ranks, overview };
}

beforeEach(() => window.history.replaceState(null, '', '/vendor/loyalty'));

describe('loyalty leaderboard', () => {
  it('switches beneath the same header and menu without navigating away, and supports history', async () => {
    const { service } = setup();
    render(<VendorLoyalty service={service} path="/vendor/loyalty" />);
    await screen.findByRole('img', { name: /Points earned by day/ });
    const header = screen.getByRole('heading', { name: 'Loyalty Program' });
    const menu = screen.getByRole('navigation', { name: 'Loyalty' });
    fireEvent.change(screen.getByLabelText('Activity period'), {
      target: { value: '7' },
    });
    fireEvent.click(within(menu).getByRole('link', { name: 'Leaderboard' }));
    await screen.findByRole('table', { name: 'Customer points ranking' });
    expect(window.location.pathname).toBe('/vendor/loyalty');
    expect(window.location.hash).toBe('#leaderboard');
    expect(screen.getByRole('heading', { name: 'Loyalty Program' })).toBe(
      header,
    );
    expect(screen.getByRole('navigation', { name: 'Loyalty' })).toBe(menu);
    expect(
      within(menu).getByRole('link', { name: 'Leaderboard' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.queryByRole('img', { name: /Points earned by day/ }),
    ).toBeNull();
    fireEvent.click(within(menu).getByRole('link', { name: 'Overview' }));
    await screen.findByRole('img', { name: /Points earned by day/ });
    expect(screen.getByLabelText('Activity period')).toHaveValue('7');
    window.history.replaceState(null, '', '/vendor/loyalty#leaderboard');
    fireEvent.popState(window);
    await screen.findByRole('table', { name: 'Customer points ranking' });
  });

  it('reuses the table and links the selected wallet to its actual customer relationship', async () => {
    const { service } = setup();
    window.history.replaceState(null, '', '/vendor/loyalty#leaderboard');
    render(<VendorLoyalty service={service} path="/vendor/loyalty" />);
    const table = await screen.findByRole('table', {
      name: 'Customer points ranking',
    });
    const podium = screen.getByRole('list', { name: 'Top three customers' });
    expect(within(podium).queryByRole('button')).toBeNull();
    expect(
      within(podium).getByRole('link', { name: "View Sarah Test's profile" }),
    ).toHaveAttribute('href', '/vendor/customers/relationship-0');
    expect(table).toHaveClass('farmstand-data-table');
    expect(within(table).getAllByRole('row')).toHaveLength(21);
    expect(
      screen.getByRole('link', { name: 'View Customer Page' }),
    ).toHaveAttribute('href', '/vendor/customers/relationship-0');
    fireEvent.click(
      within(table).getByRole('row', { name: 'View Emily Test' }),
    );
    const preview = screen.getByRole('region', { name: 'Emily Test details' });
    expect(preview).toHaveTextContent('#2');
    expect(preview).toHaveTextContent('12,430 pts');
    expect(preview).toHaveTextContent('1,500.00');
    expect(preview).toHaveTextContent('20.00');
    expect(
      screen.getByRole('link', { name: 'View Customer Page' }),
    ).toHaveAttribute('href', '/vendor/customers/relationship-1');
    expect(
      screen.queryByText(
        /Gold Member|Loyalty tier|Total Members Ranked|Average Points per Member|Highest Lifetime Points/i,
      ),
    ).toBeNull();
    expect(screen.queryByLabelText(/tier|status/i)).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Close customer details' }),
    ).toBeNull();
    fireEvent.click(
      within(table).getByRole('row', { name: 'View Sarah Test' }),
    );
    expect(
      screen.getByRole('link', { name: 'View Customer Page' }),
    ).toBeVisible();
  });

  it('searches all pages by email, sorts without renumbering ranks, and resets pagination', async () => {
    const { service } = setup();
    render(
      <VendorLoyalty service={service} path="/vendor/loyalty/leaderboard" />,
    );
    const table = await screen.findByRole('table', {
      name: 'Customer points ranking',
    });
    expect(window.location.href).toContain('/vendor/loyalty#leaderboard');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    fireEvent.change(screen.getByLabelText('Search customer name or email'), {
      target: { value: 'member24@' },
    });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(table).toHaveTextContent('#25');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Search customer name or email'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'lowest' },
    });
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('#25');
  });

  it('loads every ranked backend page and never matches wallet IDs or names to CRM IDs', async () => {
    const { service, ranks, overview } = setup(103);
    const rows = await readLoyaltyLeaderboard(service);
    expect(rows).toHaveLength(103);
    expect(overview).toHaveBeenCalledWith({ skip: 100, take: 100 });
    ranks[0]!.customerId = undefined;
    const unlinked = await readLoyaltyLeaderboard(service);
    expect(unlinked[0]!.relationship).toBeUndefined();
    expect(unlinked[0]!.customer).toBe('Customer 800');
    const csv = leaderboardCsv([{ ...rows[0]!, customer: '=unsafe' }]);
    expect(csv).toContain('"\'=unsafe"');
    expect(csv).toContain('member0@example.com');
    expect(csv).not.toMatch(/tier|gold member/i);
  });

  it('handles empty results and recovers failed reads through the shared retry action', async () => {
    const { service, overview } = setup(0);
    overview.mockRejectedValueOnce(new AppError('unavailable'));
    render(
      <VendorLoyalty service={service} path="/vendor/loyalty/leaderboard" />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Refresh records' }),
    );
    await screen.findByText('No qualifying customers yet');
    expect(
      screen.queryByRole('list', { name: 'Top three customers' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Export Leaderboard' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(overview).toHaveBeenCalledTimes(2));
  });
});
