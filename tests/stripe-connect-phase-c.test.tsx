import { describe, it, expect, vi } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Payments } from '../apps/admin/src/management/payments';
import {
  createManagementService,
  type ManagementService,
} from '../apps/admin/src/management/service';
import { routeAllowed, type AdminContext } from '@market/admin-core';
import { AppError, createManagementApi } from '@market/api';

const owner: AdminContext = {
  scope: 'MARKET',
  name: 'Dedicated market',
  source: 'backend',
  membershipRole: 'owner',
  subject: { marketId: '91' },
  permissions: [
    'ReadOwnMarket',
    'ReadOwnPaymentAccount',
    'ManageOwnPaymentAccount',
  ],
};
const data = {
  ownPaymentConfiguration: {
    state: 'CONFIGURED',
    providerIOAllowed: true,
    qualification: 'NOT_EXECUTED',
    fundsFlowPolicy: 'NOT_CONFIGURED',
  },
  ownPaymentAccount: null,
};
function fixture(context = owner) {
  return {
    context,
    payments: vi.fn().mockResolvedValue(data),
    startStripeOnboarding: vi.fn(),
    connectStripe: vi.fn(),
    completeStripeConnect: vi.fn().mockResolvedValue({}),
    completeStripeOnboarding: vi
      .fn()
      .mockResolvedValue({ completeOwnStripeOnboarding: null }),
  } as unknown as ManagementService;
}
describe('Stripe Phase C settings', () => {
  it.each(['MARKET', 'VENDOR'] as const)(
    'automatically completes the %s OAuth return once, including StrictMode and refresh',
    async (scope) => {
      window.history.replaceState(
        null,
        '',
        `/${scope.toLowerCase()}/settings/payments?stripe_oauth_state=state&stripe_oauth_code=code&keep=1#account`,
      );
      const service = fixture({
        ...owner,
        scope,
        subject: scope === 'MARKET' ? { marketId: '91' } : { vendorId: '92' },
      });
      const rendered = render(
        <StrictMode>
          <Payments service={service} />
        </StrictMode>,
      );
      await waitFor(() =>
        expect(service.completeStripeConnect).toHaveBeenCalledWith(
          'state',
          'code',
        ),
      );
      await waitFor(() => expect(window.location.search).toBe('?keep=1'));
      expect(window.location.hash).toBe('#account');
      rendered.rerender(
        <StrictMode>
          <Payments service={service} />
        </StrictMode>,
      );
      expect(service.completeStripeConnect).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole('button', { name: 'Check Stripe authorization' }),
      ).not.toBeInTheDocument();
      window.history.replaceState(null, '', '/');
    },
  );
  it('does not submit OAuth for a read-only member', async () => {
    window.history.replaceState(
      null,
      '',
      '/market/settings/payments?stripe_oauth_state=state&stripe_oauth_code=code',
    );
    const service = fixture({
      ...owner,
      membershipRole: 'staff',
      permissions: ['ReadOwnPaymentAccount'],
    });
    render(<Payments service={service} />);
    expect(await screen.findByText('Not connected')).toBeVisible();
    expect(service.completeStripeConnect).not.toHaveBeenCalled();
    window.history.replaceState(null, '', '/');
  });
  it('waits for authoritative configuration before automatically completing OAuth', async () => {
    window.history.replaceState(
      null,
      '',
      '/market/settings/payments?stripe_oauth_state=state&stripe_oauth_code=code',
    );
    let loaded!: (value: typeof data) => void;
    const service = fixture();
    service.payments = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<typeof data>((resolve) => {
            loaded = resolve;
          }),
      )
      .mockResolvedValue(data);
    render(<Payments service={service} />);
    expect(service.completeStripeConnect).not.toHaveBeenCalled();
    loaded(data);
    await waitFor(() =>
      expect(service.completeStripeConnect).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(window.location.search).toBe(''));
    window.history.replaceState(null, '', '/');
  });
  it('ignores an OAuth completion after switching workspaces', async () => {
    window.history.replaceState(
      null,
      '',
      '/market/settings/payments?stripe_oauth_state=state&stripe_oauth_code=code',
    );
    let complete!: () => void;
    const first = fixture();
    first.completeStripeConnect = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    const rendered = render(<Payments service={first} />);
    await waitFor(() =>
      expect(first.completeStripeConnect).toHaveBeenCalledTimes(1),
    );
    window.history.replaceState(
      null,
      '',
      '/market/settings/payments?keep=other',
    );
    const second = fixture();
    rendered.rerender(<Payments service={second} />);
    expect(await screen.findByText('Not connected')).toBeVisible();
    complete();
    await waitFor(() => expect(second.payments).toHaveBeenCalledTimes(1));
    expect(window.location.search).toBe('?keep=other');
    window.history.replaceState(null, '', '/');
  });
  it.each(['HOSTED', 'OAUTH'])(
    'clears a disconnected %s account and permits a new connection after refresh',
    async (connectionMethod) => {
      window.history.replaceState(
        null,
        '',
        '/market/settings/payments?stripe_onboarding=old-return&keep=1',
      );
      const oldAccount = {
        accountReference: '…old123',
        connectionStatus: 'CONNECTED',
        connectionMethod,
        currentlyDueCount: 2,
        pastDueCount: 1,
        readiness: [],
        lastSyncAt: null,
      };
      const payments = vi
        .fn()
        .mockResolvedValue({ ...data, ownPaymentAccount: oldAccount });
      const disconnectStripe = vi.fn().mockImplementation(async () => {
        payments.mockResolvedValue({
          ...data,
          ownPaymentAccount: {
            ...oldAccount,
            connectionStatus: 'DEAUTHORIZED',
          },
        });
      });
      const service = {
        ...fixture(),
        payments,
        disconnectStripe,
      } as unknown as ManagementService;
      const rendered = render(<Payments service={service} />);
      expect(await screen.findByText('…old123')).toBeVisible();
      await userEvent.click(
        screen.getByRole('button', { name: 'Disconnect', exact: true }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Disconnect Stripe', exact: true }),
      );
      expect(await screen.findByText('Not connected')).toBeVisible();
      expect(disconnectStripe).toHaveBeenCalledWith('TEST');
      expect(screen.queryByText('…old123')).not.toBeInTheDocument();
      expect(screen.queryByText('Verification')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Refresh' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Check returned setup' }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Set up Stripe' }),
      ).toBeEnabled();
      expect(
        screen.getByRole('button', { name: 'Connect existing Stripe account' }),
      ).toBeEnabled();
      expect(window.location.search).toBe('?keep=1');
      rendered.unmount();
      render(<Payments service={service} />);
      expect(await screen.findByText('Not connected')).toBeVisible();
      expect(screen.queryByText('…old123')).not.toBeInTheDocument();
      window.history.replaceState(null, '', '/');
    },
  );
  it.each(['BAD_USER_INPUT', 'USER_INPUT_ERROR'])(
    'maps %s Stripe sentinels to safe recovery messages',
    async (code) => {
      const api = createManagementApi({
        endpoint: 'http://localhost/admin-api',
        fetch: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              errors: [
                {
                  message: 'OAUTH_RECONCILIATION_REQUIRED',
                  extensions: { code },
                },
              ],
            }),
          ),
        ),
      });
      await expect(
        api.completeStripeConnect('state', 'code'),
      ).rejects.toMatchObject({
        code: 'OAUTH_RECONCILIATION_REQUIRED',
        message: expect.stringContaining('Start a fresh connection'),
      });
    },
  );
  it('retires an uncertain OAuth return and offers a fresh connection without replaying it', async () => {
    window.history.replaceState(
      null,
      '',
      '/market/settings/payments?stripe_oauth_state=state&stripe_oauth_code=code&keep=1',
    );
    const service = fixture();
    service.completeStripeConnect = vi
      .fn()
      .mockRejectedValue(
        new AppError('conflict', 'OAUTH_RECONCILIATION_REQUIRED'),
      );
    render(<Payments service={service} />);
    expect(await screen.findByText(/Start a fresh connection/)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Check Stripe authorization' }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('button', {
        name: 'Connect existing Stripe account',
      }),
    ).toBeEnabled();
    expect(window.location.search).toBe('?keep=1');
    expect(service.completeStripeConnect).toHaveBeenCalledTimes(1);
    window.history.replaceState(null, '', '/');
  });
  it('exposes one shared test setup surface for a market owner', async () => {
    expect(routeAllowed(owner, '/market/settings/payments')).toBe(true);
    render(<Payments service={fixture()} embedded />);
    expect(
      await screen.findByRole('button', { name: 'Set up Stripe' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Connect existing Stripe account' }),
    ).toBeEnabled();
    expect(
      screen.getByText(
        /Stripe test mode\. Live payment collection is disabled/,
      ),
    ).toBeVisible();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });
  it('keeps payment management controls away from read-only members', async () => {
    render(
      <Payments
        service={fixture({
          ...owner,
          membershipRole: 'staff',
          permissions: ['ReadOwnPaymentAccount'],
        })}
      />,
    );
    expect(await screen.findByText('Not connected')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Set up Stripe' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Connect existing Stripe account' }),
    ).not.toBeInTheDocument();
  });
  it('checks a hosted return explicitly and refreshes authoritative account status', async () => {
    window.history.replaceState(
      null,
      '',
      '/market/settings/payments?stripe_onboarding=nonce',
    );
    const service = fixture();
    render(<Payments service={service} />);
    const button = await screen.findByRole('button', {
      name: 'Check returned setup',
    });
    await waitFor(() => expect(button).toBeEnabled());
    expect(service.completeStripeOnboarding).not.toHaveBeenCalled();
    await userEvent.click(button);
    await waitFor(() =>
      expect(service.completeStripeOnboarding).toHaveBeenCalledWith(
        'nonce',
        false,
      ),
    );
    await waitFor(() => expect(service.payments).toHaveBeenCalledTimes(2));
    expect(window.location.search).toBe('');
  });
  it('opens the Stripe Dashboard in a new tab and closes it when no link is returned', async () => {
    window.history.replaceState(null, '', '/market/settings/payments');
    const connected = {
      ...data,
      ownPaymentAccount: {
        connectionStatus: 'CONNECTED',
        connectionMethod: 'OAUTH',
        accountReference: '…1234',
        detailsSubmitted: true,
        chargesEnabled: true,
        currentlyDueCount: 0,
        pastDueCount: 0,
        lastSyncAt: '2026-11-10T00:00:00Z',
        readiness: [],
      },
    };
    const dashboard = vi
      .fn()
      .mockResolvedValueOnce({
        ownStripeDashboard: 'https://connect.stripe.com/express/login',
      })
      .mockRejectedValueOnce(new AppError('network', 'UNAVAILABLE'));
    const service = {
      ...fixture(),
      payments: vi.fn().mockResolvedValue(connected),
      stripeDashboard: dashboard,
    } as unknown as ManagementService;
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValue(tab as unknown as Window);
    render(<Payments service={service} />);
    const button = await screen.findByRole('button', {
      name: /Open Stripe Dashboard/,
    });
    expect(button).toHaveTextContent('(opens in a new tab)');
    await userEvent.click(button);
    expect(open).toHaveBeenCalledWith('', '_blank');
    await waitFor(() =>
      expect(tab.location.href).toBe('https://connect.stripe.com/express/login'),
    );
    expect(tab.opener).toBeNull();
    expect(tab.close).not.toHaveBeenCalled();
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    await waitFor(() => expect(tab.close).toHaveBeenCalledTimes(1));
    open.mockRestore();
  });
  it('allows market owners through the existing service permission adapter and rejects staff', async () => {
    const response = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            beginOwnStripeOnboarding: {
              authorizationUrl: 'https://accounts.stripe.com/setup',
              expiresAt: new Date().toISOString(),
            },
          },
        }),
      ),
    );
    const service = createManagementService(
      owner,
      'http://localhost/admin-api',
      'dedicated-market',
      vi.fn(),
    );
    await service.startStripeOnboarding();
    expect(response).toHaveBeenCalledTimes(1);
    const staff = createManagementService(
      {
        ...owner,
        membershipRole: 'staff',
        permissions: ['ReadOwnPaymentAccount'],
      },
      'http://localhost/admin-api',
      'dedicated-market',
      vi.fn(),
    );
    await expect(staff.startStripeOnboarding()).rejects.toThrow();
    expect(response).toHaveBeenCalledTimes(1);
  });
});
