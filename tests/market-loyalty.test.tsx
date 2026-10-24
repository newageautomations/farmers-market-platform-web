import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MarketChallenge, MarketLoyaltyOverview } from '@market/api';
import {
  routeAllowed,
  visibleNavigation,
  type AdminContext,
} from '@market/admin-core';
import {
  LoyaltyProgressRing,
  MarketChallengeCard,
  MarketChallengeTermsView,
} from '../packages/ui/src/loyalty';
import {
  MarketChallengeWizard,
  MarketOccurrenceActivityCard,
} from '../apps/admin/src/market/loyalty';
import CustomerLoyaltyDashboard, {
  CustomerMarketChallenges,
} from '../apps/storefront/src/components/CustomerMarketChallenges';

const terms: MarketChallenge['terms'] = {
  title: 'Market Explorer',
  description: 'Meet local vendors',
  kind: 'DISCOVERY',
  target: 3,
  minimum: 1000,
  occurrenceCount: null,
  startOccurrenceId: null,
  reward: 'A tote bag\nCollect at the booth',
  instructions: 'Ask your manager.',
};
const challenge: MarketChallenge = {
  id: 1,
  market_id: 1,
  market_name: 'Cedar Meadow',
  status: 'ACTIVE',
  availability: 'ACTIVE',
  terms,
  published_at: '2026-10-18T00:00:00Z',
  closed_at: null,
  window: [],
  stats: { participants: 1, completions: 0 },
  progress: {
    confirmed: 2,
    pending: 1,
    target: 3,
    complete: false,
    units: [1, 2],
  },
};
const overview: MarketLoyaltyOverview = {
  enabled: false,
  challenges: [],
  claims: [],
  metrics: {
    active: 0,
    participants: 0,
    completed: 0,
    claimed: 0,
    awaiting: 0,
  },
  trend: [],
  occurrences: [
    {
      id: 10,
      label: '2027-01-10',
      startsAt: '2027-01-10T10:00:00Z',
      endsAt: '2027-01-10T15:00:00Z',
      status: 'scheduled',
    },
  ],
};
describe('market challenge presentation and interactions', () => {
  it('registers market loyalty in the ordered navigation and authorizes its nested routes', () => {
    const context = {
      scope: 'MARKET',
      permissions: ['ReadOwnMarket'],
      name: 'Cedar Meadow',
      source: 'backend',
    } as AdminContext;
    expect(visibleNavigation(context)).toContainEqual(
      expect.objectContaining({ path: '/market/loyalty', label: 'Loyalty' }),
    );
    for (const path of [
      '/market/loyalty',
      '/market/loyalty/challenges/new',
      '/market/loyalty/challenges/1',
      '/market/loyalty/challenges/1/edit',
      '/market/loyalty/challenges/1/replace',
      '/market/loyalty/rewards',
    ])
      expect(routeAllowed(context, path)).toBe(true);
  });
  it('uses fixed objective rings with accurate numeric accessibility and no points label', () => {
    render(<MarketChallengeCard challenge={challenge} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Market Explorer: 2 / 3 vendors',
    );
    expect(screen.getByText(/1 vendors pending fulfillment/)).toBeVisible();
    expect(screen.queryByText(/available points/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('img').querySelector('.loyalty-ring-current'),
    ).toHaveStyle({ strokeDashoffset: `${100 / 3}` });
  });
  it('caps a completed spending ring and preserves the actual achieved amount', () => {
    render(
      <MarketChallengeCard
        challenge={{
          ...challenge,
          terms: { ...terms, kind: 'SPENDING', target: 15000 },
          progress: {
            confirmed: 15500,
            pending: 0,
            target: 15000,
            complete: true,
            units: [],
          },
        }}
      />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /\$155.00 \/ \$150.00 spent/,
    );
    expect(
      screen.getByRole('img').querySelector('.loyalty-ring-current'),
    ).toHaveStyle({ strokeDashoffset: '0' });
  });
  it('preserves the existing vendor milestone interface', () => {
    render(<LoyaltyProgressRing available={3500} milestones={[2000, 5000]} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /3,500 of 5,000 points/,
    );
  });
  it('keeps pending progress from exposing a claim control', () => {
    render(<CustomerMarketChallenges initialChallenges={[challenge]} />);
    expect(
      screen.queryByRole('button', { name: 'Claim Reward' }),
    ).not.toBeInTheDocument();
  });
  it('confirms a real persisted claim and guards repeated submissions', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 6,
          completion_id: 4,
          terms,
          status: 'CLAIMED',
          review: 'NONE',
          claimed_at: '2026-10-18T00:00:00Z',
          fulfilled_at: null,
          note: null,
        }),
        { status: 200 },
      ),
    );
    render(
      <CustomerMarketChallenges
        initialChallenges={[
          {
            ...challenge,
            progress: { ...challenge.progress!, confirmed: 3, complete: true },
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Claim Reward' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('A tote bag Collect at the booth'),
    ).toBeVisible();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' }),
    );
    await screen.findByText(/Reward claimed. Your market manager/);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      action: 'claim',
      id: 1,
    });
    fetcher.mockRestore();
  });
  it('retains vendor rewards in a keyboard accessible tab alongside challenges', () => {
    render(<CustomerLoyaltyDashboard wallets={[]} challenges={[challenge]} />);
    const vendor = screen.getByRole('tab', { name: 'Vendor Rewards' });
    expect(vendor).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(vendor, { key: 'ArrowRight' });
    expect(
      screen.getByRole('tab', { name: 'Market Challenges' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Market Explorer')).toBeVisible();
  });
  it('renders arbitrary reward text safely as multiline text', () => {
    const { container } = render(
      <MarketChallengeTermsView
        terms={{ ...terms, reward: '<script>bad()</script>\nBring a bag' }}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(
      container.querySelector('.market-challenge-multiline'),
    ).toHaveTextContent('<script>bad()</script> Bring a bag');
  });
  it('shows fulfilled reward history and review state after reversal', () => {
    render(
      <CustomerMarketChallenges
        initialChallenges={[
          {
            ...challenge,
            claim: {
              id: 3,
              completion_id: 4,
              terms,
              status: 'FULFILLED',
              review: 'REQUIRED',
              claimed_at: '2026-10-18T00:00:00Z',
              fulfilled_at: '2026-10-18T01:00:00Z',
              note: 'Tote collected',
            },
          },
        ]}
      />,
    );
    expect(screen.getByText('Needs review')).toBeVisible();
    fireEvent.click(screen.getByText('Market Explorer'));
    expect(screen.getByText(/Reward fulfilled/)).toBeVisible();
    expect(screen.getByText(/Tote collected/)).toBeVisible();
  });
  it('provides type-specific fields and requires an occurrence window for spending', () => {
    render(<MarketChallengeWizard data={overview} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Market Spending' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Target spending (USD)')).toBeRequired();
    expect(screen.getByLabelText('Starting market occurrence')).toBeRequired();
    expect(
      screen.queryByLabelText(/Minimum product spending/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Number of consecutive market occurrences'),
    ).toHaveValue(3);
  });
  it('supports custom multiline rewards, suggested ideas, review and draft persistence', async () => {
    const save = vi.fn().mockResolvedValue({});
    render(<MarketChallengeWizard data={overview} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Challenge title'), {
      target: { value: 'My custom explorer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Reward Description')).toHaveAttribute(
      'maxLength',
      '4000',
    );
    fireEvent.click(screen.getByRole('link', { name: 'See common rewards' }));
    const suggestions = screen.getByRole('dialog', { name: 'Common rewards' });
    expect(within(suggestions).getByText('Market-branded hat')).toBeVisible();
    expect(
      within(suggestions).queryByRole('button', { name: 'Market-branded hat' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Reward Description')).toHaveValue('');
    fireEvent.click(within(suggestions).getByRole('button', { name: 'Close' }));
    fireEvent.change(screen.getByLabelText('Reward Description'), {
      target: { value: 'Custom prize\nPickup next month' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My custom explorer',
          reward: 'Custom prize\nPickup next month',
        }),
        false,
      ),
    );
  });
  it('allows clearing and retyping currency and saves exact minor units', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { container } = render(
      <MarketChallengeWizard data={overview} onSave={save} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Challenge title'), {
      target: { value: 'Exact money' },
    });
    const minimum = screen.getByLabelText(
      'Minimum product spending per vendor (USD)',
    );
    fireEvent.change(minimum, { target: { value: '' } });
    expect(minimum).toHaveValue(null);
    fireEvent.change(minimum, { target: { value: '10.001' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByText(/at most two decimal places/)).toBeVisible();
    fireEvent.change(minimum, { target: { value: '10.25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Reward Description'), {
      target: { value: 'A custom promise' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish challenge' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ minimum: 1025 }),
        true,
      ),
    );
  });
  it('opens the clickable customer card once without a visible view action', () => {
    const open = vi.fn();
    render(<MarketChallengeCard challenge={challenge} onOpen={open} />);
    expect(
      screen.queryByRole('button', { name: /View Market Explorer/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Market Explorer'));
    expect(open).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'Open Market Explorer' }),
    ).toHaveFocus();
  });
  it('keeps occurrence metrics separate and opens their values in a shared dialog', () => {
    const data = [
      { id: 3, label: '2026-10-25', customers: 4, orders: 5, spending: '3200' },
      { id: 4, label: '2026-10-28', customers: 2, orders: 3, spending: '1200' },
    ];
    render(
      <>
        <MarketOccurrenceActivityCard
          data={data}
          metric="customers"
          title="Customers"
        />
        <MarketOccurrenceActivityCard
          data={data}
          metric="orders"
          title="Orders"
        />
        <MarketOccurrenceActivityCard
          data={data}
          metric="spending"
          title="Eligible spending"
        />
      </>,
    );
    const spending = screen.getByRole('article', {
      name: 'Eligible spending by market occurrence',
    });
    expect(spending).toHaveTextContent('$44.00 in eligible spending');
    expect(
      screen.getByRole('article', { name: 'Customers by market occurrence' }),
    ).toHaveTextContent('6 customer participations');
    expect(
      screen.getByRole('article', { name: 'Orders by market occurrence' }),
    ).toHaveTextContent('8 orders');
    fireEvent.click(
      within(spending).getByRole('button', { name: 'View occurrence values' }),
    );
    const details = screen.getByRole('dialog', {
      name: 'Eligible spending by market occurrence',
    });
    expect(
      within(details).getByText('2026-10-25 · Occurrence 3'),
    ).toBeVisible();
    expect(within(details).getByText('$32.00')).toBeVisible();
  });
});
