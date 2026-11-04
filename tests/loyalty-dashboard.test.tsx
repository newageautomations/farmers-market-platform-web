import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LoyaltyOverview } from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { VendorLoyalty } from '../apps/admin/src/vendor/loyalty';
import {
  loyaltyRange,
  loyaltyScale,
  loyaltySeries,
} from '../apps/admin/src/vendor/LoyaltyDashboard';

function setup(manage = true) {
  const service = createFixtureVendorService({
    ...fixtureContexts.VENDOR,
    permissions: manage ? ['ReadOwnCRM', 'ManageOwnCoupon'] : ['ReadOwnCRM'],
  });
  const day = loyaltyRange(1).to;
  const report: LoyaltyOverview = {
    enabled: true,
    metrics: {
      customers: 1842,
      issued: '248600',
      lifetime: '300000',
      outstanding: '15000',
      pending: '2000',
      repeat: 300,
      rewardOrders: 356,
    },
    rewards: [],
    top: [],
    leaderboard: [],
    redemptions: [],
    skip: 0,
    take: 20,
    trend: [
      { day, earned: '50000', redeemed: '500', redemptions: 3, customers: 1 },
    ],
  };
  const overview = vi.fn(async (_filter?: Record<string, unknown>) => report);
  const program = vi.fn(async (enabled: boolean) => {
    report.enabled = enabled;
    return { enabled };
  });
  service.loyalty = { overview, program } as unknown as NonNullable<
    typeof service.loyalty
  >;
  return { service, overview, program, day };
}

describe('loyalty overview redesign', () => {
  it('shows one metric, rescales counts, and retains daily zero values without a new request', async () => {
    const { service, overview } = setup();
    render(<VendorLoyalty service={service} path="/vendor/loyalty" />);
    const chart = await screen.findByRole('img', {
      name: /Points earned by day/,
    });
    expect(chart).toHaveTextContent('50,000');
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'Program Settings' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Reward' })).toHaveAttribute(
      'href',
      '/vendor/loyalty#rewards',
    );
    expect(
      within(screen.getByRole('navigation', { name: 'Loyalty' })).getAllByRole(
        'link',
      ),
    ).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Display metric'), {
      target: { value: 'redemptions' },
    });
    const counts = screen.getByRole('img', {
      name: /Reward redemptions by day/,
    });
    expect(counts).not.toHaveTextContent('50,000');
    expect(counts).toHaveTextContent('3');
    expect(overview).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'View daily values' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Reward redemptions by date',
    });
    expect(dialog.querySelectorAll('.loyalty-daily-values > div')).toHaveLength(
      90,
    );
  });

  it('reuses the from/to calendar, sends an inclusive UTC range and preserves the selected metric', async () => {
    const { service, overview, day } = setup();
    render(<VendorLoyalty service={service} path="/vendor/loyalty" />);
    await screen.findByRole('img', { name: /Points earned by day/ });
    fireEvent.change(screen.getByLabelText('Display metric'), {
      target: { value: 'redeemed' },
    });
    fireEvent.change(screen.getByLabelText('Activity period'), {
      target: { value: 'custom' },
    });
    const dialog = await screen.findByRole('dialog', {
      name: 'Custom date range',
    });
    const initial = new Date(loyaltyRange(90).from),
      end = new Date(day);
    const months =
      (end.getUTCFullYear() - initial.getUTCFullYear()) * 12 +
      end.getUTCMonth() -
      initial.getUTCMonth();
    for (let i = 0; i < months; i++)
      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Next month' }),
      );
    const name = new Date(day + 'T12:00:00').toLocaleDateString(undefined, {
      dateStyle: 'full',
    });
    fireEvent.click(within(dialog).getByRole('button', { name }));
    fireEvent.click(within(dialog).getByRole('button', { name }));
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Apply date range' }),
    );
    await waitFor(() =>
      expect(overview).toHaveBeenLastCalledWith({
        trendFrom: day + 'T00:00:00Z',
        trendThrough: new Date(Date.parse(day) + 86400000).toISOString(),
      }),
    );
    await screen.findByRole('img', { name: /Points redeemed by day/ });
    expect(
      screen.getByRole('button', { name: 'Edit date range' }),
    ).toBeVisible();
  });

  it('retains program authority, refreshes after saving, and hides write actions without permission', async () => {
    const { service, program } = setup();
    const { unmount } = render(
      <VendorLoyalty service={service} path="/vendor/loyalty" />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Pause Program' }),
    );
    await screen.findByRole('button', { name: 'Enable Program' });
    expect(program).toHaveBeenCalledWith(false);
    unmount();
    render(
      <VendorLoyalty service={setup(false).service} path="/vendor/loyalty" />,
    );
    await screen.findByRole('img', { name: /Points earned by day/ });
    expect(
      screen.queryByRole('button', { name: 'Pause Program' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Create Reward' }),
    ).not.toBeInTheDocument();
  });

  it('opens the legacy rewards route in the loyalty workspace', async () => {
    render(
      <VendorLoyalty
        service={setup().service}
        path="/vendor/loyalty/rewards"
      />,
    );
    await screen.findByText('Create your first reward');
    expect(
      screen.queryByRole('heading', { name: 'Points Activity' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Loyalty' })).toHaveClass(
      'loyalty-menu',
    );
  });

  it('uses integer scales for empty, small, large and negative values and fills missing days', () => {
    for (const values of [[], [0], [3], [12], [50000], [-3, 8]]) {
      const scale = loyaltyScale(values);
      expect(scale.min).toBeLessThanOrEqual(Math.min(0, ...values));
      expect(scale.max).toBeGreaterThanOrEqual(Math.max(1, ...values));
      expect(scale.ticks.every(Number.isInteger)).toBe(true);
    }
    expect(
      loyaltySeries([], 'earned', { from: '2026-11-01', to: '2026-11-03' }),
    ).toEqual([
      { day: '2026-11-01', value: 0 },
      { day: '2026-11-02', value: 0 },
      { day: '2026-11-03', value: 0 },
    ]);
  });
});
