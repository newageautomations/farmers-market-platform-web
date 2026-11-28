import { StrictMode } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  routeAllowed,
  visibleNavigation,
  type AdminContext,
} from '@market/admin-core';
import {
  type StripeConnectionPage,
  type StripePaymentStatus,
} from '@market/api';
import { StripeConnections } from '../apps/admin/src/management/StripeConnections';
import { stripeDestination } from '../apps/admin/src/management/stripe-presentation';

const path = '/platform/stripe-connections';
const account: StripePaymentStatus = {
  id: '10',
  mode: 'TEST',
  provider: 'STRIPE',
  accountReference: '…1234',
  connectionMethod: 'OAUTH',
  connectionStatus: 'CONNECTED',
  detailsSubmitted: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  cardPayments: 'pending',
  transfers: 'inactive',
  legacyPayments: 'unrequested',
  currentlyDueCount: 2,
  pastDueCount: 1,
  pendingVerificationCount: 1,
  currentDeadline: null,
  disabledReason: 'requirements.past_due',
  lastSyncAt: '2026-11-26T13:30:00.000Z',
  readiness: [
    {
      state: 'RESTRICTED',
      purpose: 'ACCEPT_DIRECT_CHARGE',
      ready: false,
      reasons: ['ACCOUNT_RESTRICTED'],
    },
    {
      state: 'RESTRICTED',
      purpose: 'RECEIVE_PAYOUT',
      ready: false,
      reasons: ['PAYOUT_NOT_READY'],
    },
    {
      state: 'RESTRICTED',
      purpose: 'RECEIVE_TRANSFER',
      ready: false,
      reasons: ['TRANSFER_CAPABILITY_NOT_READY'],
    },
  ],
};
const page: StripeConnectionPage = {
  mode: 'TEST',
  delegatedOAuthAllowed: true,
  collectionSuspended: true,
  totalItems: 25,
  overview: {
    total: 25,
    connected: 1,
    ready: 0,
    attention: 1,
    unconnected: 24,
  },
  items: [
    {
      id: '1',
      name: 'Maple Stand',
      kind: 'VENDOR',
      status: 'active',
      imageUrl: null,
      account,
      ready: false,
      canConnect: false,
      canRefresh: true,
    },
    {
      id: '2',
      name: 'Maple Market',
      kind: 'MARKET',
      status: 'active',
      imageUrl: null,
      account: null,
      ready: false,
      canConnect: true,
      canRefresh: false,
    },
  ],
};

function service(data = page) {
  return {
    stripeConnections: vi.fn().mockResolvedValue(data),
    beginPlatformStripeConnect: vi
      .fn()
      .mockResolvedValue({ authorizationUrl: 'https://wrong.example.test' }),
    completePlatformStripeConnect: vi.fn().mockResolvedValue({
      cancelled: false,
      targetId: '1',
      targetKind: 'VENDOR',
      businessName: 'Maple Stand',
      account,
    }),
    refreshPlatformStripeConnection: vi.fn().mockResolvedValue(account),
  };
}
afterEach(() => window.history.replaceState(null, '', '/'));

describe('Platform Stripe Connections', () => {
  it('exposes the route only to the Platform SuperAdmin', () => {
    const platform: AdminContext = {
      scope: 'PLATFORM',
      name: 'Platform administrator',
      permissions: ['SuperAdmin'],
      source: 'backend',
    };
    expect(visibleNavigation(platform).some((item) => item.path === path)).toBe(
      true,
    );
    expect(routeAllowed(platform, path)).toBe(true);
    for (const context of [
      { ...platform, permissions: [] },
      { ...platform, scope: 'VENDOR', membershipRole: 'owner' },
      { ...platform, scope: 'MARKET', membershipRole: 'administrator' },
      { ...platform, scope: 'VENDOR', membershipRole: 'staff' },
    ] satisfies AdminContext[]) {
      expect(
        visibleNavigation(context).some((item) => item.path === path),
      ).toBe(false);
      expect(routeAllowed(context, path)).toBe(false);
    }
  });

  it('renders persisted statuses, opens full details and refreshes the selected row', async () => {
    const api = service();
    render(<StripeConnections service={api} />);
    expect(await screen.findByText('Stripe Sandbox (test mode)')).toBeVisible();
    expect(screen.getByText(/Payment collection is suspended/)).toBeVisible();
    const row = screen.getByRole('row', { name: /Maple Stand/ });
    expect(within(row).getByText('Connected')).toBeVisible();
    expect(within(row).getByText('Restricted')).toBeVisible();
    const menu = within(row)
      .getByText('Actions', { exact: false })
      .closest('summary')!;
    menu.parentElement!.setAttribute('open', '');
    fireEvent.click(
      within(row).getByRole('button', { name: 'View connection details' }),
    );
    const detail = screen.getByRole('dialog', { name: 'Maple Stand' });
    for (const value of [
      '…1234',
      'Pending verification',
      '2 currently due, 1 past due',
      'Card payments capability',
      'Payout readiness',
    ]) {
      expect(within(detail).getByText(value)).toBeVisible();
    }
    expect(within(detail).getAllByText('Not enabled by Stripe')).toHaveLength(
      2,
    );
    expect(within(detail).getByText(/Stripe restriction/)).toBeVisible();
    expect(within(detail).getByText(/Last checked/)).toBeVisible();
    fireEvent.click(
      within(detail).getByRole('button', { name: 'Refresh status' }),
    );
    await waitFor(() =>
      expect(api.refreshPlatformStripeConnection).toHaveBeenCalledWith({
        id: '1',
        kind: 'VENDOR',
      }),
    );
    expect(
      await within(detail).findByText('Stripe status refreshed.'),
    ).toBeVisible();
  });

  it('applies server filters and offsets and confirms the exact unconnected Sandbox target', async () => {
    const api = service();
    render(<StripeConnections service={api} />);
    await screen.findByText('Maple Market');
    fireEvent.change(screen.getByLabelText('Business name'), {
      target: { value: 'Maple' },
    });
    fireEvent.change(screen.getByLabelText('Business type'), {
      target: { value: 'MARKET' },
    });
    fireEvent.change(screen.getByLabelText('Connection'), {
      target: { value: 'NOT_CONNECTED' },
    });
    fireEvent.change(screen.getByLabelText('Payment readiness'), {
      target: { value: 'NOT_READY' },
    });
    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'NAME_DESC' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() =>
      expect(api.stripeConnections).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'Maple',
          kind: 'MARKET',
          connection: 'NOT_CONNECTED',
          readiness: 'NOT_READY',
          sort: 'NAME_DESC',
          skip: 0,
        }),
      ),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(api.stripeConnections).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 20, skip: 20 }),
      ),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Connect Stripe for Maple Market',
      }),
    );
    const confirm = screen.getByRole('dialog', {
      name: 'Connect Stripe Sandbox',
    });
    expect(within(confirm).getByText('Maple Market')).toBeVisible();
    expect(api.beginPlatformStripeConnect).not.toHaveBeenCalled();
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Continue to Stripe' }),
    );
    await waitFor(() =>
      expect(api.beginPlatformStripeConnect).toHaveBeenCalledWith({
        id: '2',
        kind: 'MARKET',
      }),
    );
    expect(() =>
      stripeDestination('https://connect.stripe.com@outside.test/'),
    ).toThrow();
    expect(
      stripeDestination('https://connect.stripe.com/oauth/authorize'),
    ).toBe('https://connect.stripe.com/oauth/authorize');
  });

  it.each([false, true])(
    'finishes an OAuth return once and clears its parameters (cancelled = %s)',
    async (cancelled) => {
      const api = service();
      if (cancelled)
        api.completePlatformStripeConnect.mockResolvedValue({
          cancelled: true,
        });
      const params = cancelled
        ? 'stripe_oauth_error=1'
        : 'stripe_oauth_code=provider-code';
      window.history.replaceState(
        null,
        '',
        path + '?keep=1#stripe_oauth_state=return-state&' + params,
      );
      render(
        <StrictMode>
          <StripeConnections service={api} />
        </StrictMode>,
      );
      await screen.findByText(
        cancelled
          ? 'Stripe authorization was cancelled.'
          : 'Maple Stand connected to Stripe Sandbox.',
      );
      expect(api.completePlatformStripeConnect).toHaveBeenCalledExactlyOnceWith(
        'return-state',
        cancelled ? null : 'provider-code',
        cancelled,
      );
      expect(window.location.search).toBe('?keep=1');
      expect(window.location.hash).toBe('');
      if (!cancelled)
        expect(
          screen.getByRole('dialog', { name: 'Maple Stand' }),
        ).toBeVisible();
    },
  );

  it('shows Live clearly and offers no delegated connection', async () => {
    const api = service({
      ...page,
      mode: 'LIVE',
      delegatedOAuthAllowed: false,
      items: page.items.map((row) => ({
        ...row,
        canConnect: false,
        canRefresh: false,
      })),
    });
    render(<StripeConnections service={api} />);
    expect(await screen.findByText('Stripe Live')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Connect Stripe/ }),
    ).not.toBeInTheDocument();
  });
});
