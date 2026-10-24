import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LoyaltyProgressRing,
  LoyaltyRedeemButton,
  loyaltyProgress,
} from '../packages/ui/src/loyalty';
import CustomerLoyalty from '../apps/storefront/src/components/CustomerLoyalty';
import CheckoutLoyalty from '../apps/storefront/src/components/CheckoutLoyalty';
import type { LoyaltyWallet } from '@market/api';

describe('loyalty milestone accounting presentation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });
  it('retains the passed milestone while progressing to the next higher reward', () => {
    expect(loyaltyProgress(3500, [10000, 2000, 5000, 5000])).toMatchObject({
      target: 5000,
      previous: 2000,
      completed: 0.4,
      current: 0.3,
      complete: false,
    });
    render(
      <LoyaltyProgressRing available={3500} milestones={[2000, 5000, 10000]} />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /3,500 of 5,000.*2,000 point milestone completed/,
    );
    expect(screen.getByText('1,500 points to the next reward')).toBeVisible();
    expect(screen.getByRole('img').parentElement).toHaveAttribute(
      'data-milestone-reached',
      'true',
    );
    expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(2);
  });
  it('covers exact thresholds, top milestone, debt, zero and missing rewards', () => {
    expect(loyaltyProgress(2000, [2000, 5000])).toMatchObject({
      target: 5000,
      completed: 0.4,
      current: 0,
    });
    expect(loyaltyProgress(15000, [2000, 5000])).toMatchObject({
      complete: true,
      completed: 1,
      current: 0,
    });
    expect(loyaltyProgress(-50, [2000])).toMatchObject({
      points: 0,
      current: 0,
    });
    expect(loyaltyProgress(0, [])).toMatchObject({
      target: 0,
      complete: false,
    });
  });
  it('uses the shared disabled and loading button semantics and pulses only when eligible', () => {
    const click = vi.fn();
    const { rerender } = render(
      <LoyaltyRedeemButton eligible={false} onClick={click}>
        Redeem
      </LoyaltyRedeemButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));
    expect(click).not.toHaveBeenCalled();
    rerender(
      <LoyaltyRedeemButton eligible loading onClick={click}>
        Redeem
      </LoyaltyRedeemButton>,
    );
    expect(screen.getByRole('button')).not.toHaveClass('loyalty-redeem-ready');
    rerender(
      <LoyaltyRedeemButton eligible onClick={click}>
        Redeem
      </LoyaltyRedeemButton>,
    );
    expect(screen.getByRole('button')).toHaveClass('loyalty-redeem-ready');
    fireEvent.click(screen.getByRole('button'));
    expect(click).toHaveBeenCalledOnce();
  });
  it('shows independent vendor wallets, excludes pending points and reviews without spending', async () => {
    const w: LoyaltyWallet = {
      id: 1,
      vendor_id: 1,
      name: 'Honey Farm',
      enabled: true,
      storefrontUrl: 'http://vendor-a.localhost:4347',
      balance: { available: 1500, pending: 8000, reserved: 0 },
      rewards: [
        {
          id: 1,
          versionId: 1,
          status: 'ACTIVE',
          terms: {
            name: 'Honey discount',
            kind: 'FIXED',
            points: 2000,
            value: 200,
            maximum: 0,
            minimum: 0,
            variantIds: [],
            quantity: 1,
            startsAt: null,
            endsAt: null,
            limit: null,
          },
          available: false,
        },
      ],
      history: [],
      redemptions: [],
      activity: [
        {
          id: 'purchase:1',
          kind: 'PURCHASE',
          points: 8000,
          pending: 8000,
          orderId: 9,
          orderCode: 'ORDER-9',
          createdAt: '2026-10-17T10:00:00Z',
          status: 'Pending fulfillment',
          items: [{ name: 'Honey jar', quantity: 8, eligible: 8000 }],
        },
        {
          id: 'refund:1',
          kind: 'REFUND',
          points: -200,
          pending: 0,
          orderId: 9,
          orderCode: 'ORDER-9',
          createdAt: '2026-10-17T11:00:00Z',
          status: 'Completed',
        },
      ],
    };
    const second = {
      ...w,
      id: 2,
      vendor_id: 2,
      name: 'Bakery',
      balance: { available: 5500, pending: 0, reserved: 0 },
      rewards: [{ ...w.rewards[0]!, versionId: 2, available: true }],
    };
    render(<CustomerLoyalty wallets={[w, second]} />);
    expect(
      screen.getByRole('article', { name: 'Honey Farm loyalty' }),
    ).not.toHaveTextContent(/pending|reserved|rewards available/);
    expect(screen.queryByText('Participating vendor')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Redeem Honey Farm rewards' }),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getByRole('heading', { name: 'Honey Farm' })
        .querySelector('button'),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Redeem Bakery rewards' }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Redeem',
      }),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'No points are deducted here',
    );
    expect(
      screen.getByRole('link', { name: 'Continue to vendor cart' }),
    ).toHaveAttribute('href', expect.stringContaining('/cart?loyalty=2'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByText('Points and reward history', {
        exact: true,
        selector: 'summary',
      }),
    );
    const history = screen.getByRole('list', {
      name: 'Points and reward history',
    });
    expect(history).toHaveTextContent('Purchase');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(history).toHaveTextContent('+8,000 points');
    expect(history).not.toHaveTextContent('AWARD_FINALIZED');
    expect(
      within(history)
        .getByRole('button', { name: 'Purchase · Honey Farm · +8,000 points' })
        .querySelector('.ui-status-success'),
    ).toHaveTextContent('+8,000 points');
    expect(
      within(history)
        .getByRole('button', { name: 'Refund · Honey Farm · -200 points' })
        .querySelector('.ui-status-danger'),
    ).toHaveTextContent('-200 points');
    fireEvent.click(
      within(history).getByRole('button', {
        name: 'Purchase · Honey Farm · +8,000 points',
      }),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('8 × Honey jar');
    expect(
      screen.getByRole('link', { name: 'View order ORDER-9' }),
    ).toHaveAttribute('href', '/account/orders/9');
  });
  it('preselects a previously chosen reward in the cart and applies only after confirmation', async () => {
    window.history.replaceState(null, '', '/cart?loyalty=12');
    const terms = {
      name: 'Honey $2',
      kind: 'FIXED',
      points: 2000,
      value: 200,
      maximum: 0,
      minimum: 0,
      variantIds: [],
      quantity: 1,
      startsAt: null,
      endsAt: null,
      limit: null,
    } as const;
    const wallet = {
      id: 1,
      vendor_id: 1,
      name: 'Honey',
      enabled: true,
      inCart: true,
      balance: { available: 3500, pending: 0, reserved: 0 },
      rewards: [
        {
          id: 1,
          versionId: 11,
          status: 'ACTIVE',
          terms: { ...terms, variantIds: [] },
          available: true,
        },
        {
          id: 2,
          versionId: 12,
          status: 'ACTIVE',
          terms: { ...terms, name: 'Chosen honey', variantIds: [] },
          available: true,
        },
      ],
      history: [],
      redemptions: [],
      storefrontUrl: null,
    };
    const data = {
      orderId: '99',
      wallets: [wallet],
      redemptions: [],
      preferredVersionId: 12,
    };
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(data)))
      .mockResolvedValueOnce(new Response('{}'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...data,
            redemptions: [
              {
                id: 3,
                wallet_id: 1,
                version_id: 12,
                terms: wallet.rewards[1]!.terms,
                status: 'SELECTED',
              },
            ],
          }),
        ),
      );
    const applied = vi.fn().mockResolvedValue(undefined);
    render(<CheckoutLoyalty disabled={false} onApplied={applied} />);
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('radio', { name: /Chosen honey/ }),
    ).toBeChecked();
    expect(
      within(dialog).getByRole('radio', { name: /Honey \$2/ }),
    ).not.toBeChecked();
    expect(fetcher).toHaveBeenCalledOnce();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Apply to this order' }),
    );
    await waitFor(() => expect(applied).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      action: 'apply',
      versionId: 12,
      orderId: '99',
    });
    expect(screen.getByText(/Chosen honey applied/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Use Rewards' })).toBeEnabled();
    fetcher
      .mockResolvedValueOnce(new Response('{}'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...data, preferredVersionId: undefined }),
        ),
      );
    fireEvent.click(screen.getByRole('button', { name: 'Use Rewards' }));
    expect(
      within(screen.getByRole('dialog')).getByRole('radio', {
        name: /Chosen honey/,
      }),
    ).toBeChecked();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('radio', {
        name: 'Save my points, use no reward',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove reward' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(JSON.parse(String(fetcher.mock.calls[3]?.[1]?.body))).toEqual({
      action: 'remove',
      redemptionId: 3,
      orderId: '99',
    });
    expect(screen.queryByText(/Chosen honey applied/)).not.toBeInTheDocument();
    expect(applied).toHaveBeenCalledTimes(2);
  });
  it('disables Use Rewards when the cart has no eligible reward', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          orderId: '99',
          wallets: [
            {
              id: 1,
              vendor_id: 1,
              name: 'Honey',
              inCart: true,
              balance: { available: 10 },
              rewards: [{ available: false }],
            },
          ],
          redemptions: [],
        }),
      ),
    );
    render(<CheckoutLoyalty disabled={false} onApplied={vi.fn()} />);
    expect(
      await screen.findByRole('button', { name: 'Use Rewards' }),
    ).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
