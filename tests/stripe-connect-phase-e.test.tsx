import { describe, expect, it, vi } from 'vitest';
import {
  render,
  renderHook,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AppError,
  createCheckoutApi,
  type CheckoutView,
  type StripeCheckoutStatus,
} from '@market/api';
import { StripeCheckout } from '../apps/storefront/src/components/StripeCheckout';
import { useCheckout } from '../apps/storefront/src/lib/use-checkout';
import type {
  StripeCard,
  StripeClient,
} from '../apps/storefront/src/lib/stripe-checkout';
const api = vi.hoisted(() => vi.fn());
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: api,
}));
const view = {
  orderId: '9',
  currency: 'USD',
  total: 16245,
  groups: [
    { vendorId: '1', vendorName: 'Orchard', lines: [], pickup: [] },
    { vendorId: '2', vendorName: 'Garden', lines: [], pickup: [] },
  ],
  preorderFee: {
    vendors: [
      { vendorId: '1', total: 10845 },
      { vendorId: '2', total: 5400 },
    ],
  },
} as unknown as CheckoutView;
const status = (state: string): StripeCheckoutStatus => ({
  groupId: '3',
  orderId: '9',
  state,
  publishableKey: 'pk_test_fixture',
  consentPolicy: 'checkout-vendors-once-v1',
  setupSecret: state === 'SETUP_REQUIRED' ? 'seti_fixture_secret_test' : null,
  actionSecret:
    state === 'AUTHENTICATION_REQUIRED' ? 'pi_fixture_secret_test' : null,
  actionAccount: state === 'AUTHENTICATION_REQUIRED' ? 'acct_garden' : null,
  charges: [
    { vendorId: '1', amount: 10845, currency: 'USD' },
    { vendorId: '2', amount: 5400, currency: 'USD' },
  ],
});
function sdk() {
  let change: (v: { complete: boolean; error?: unknown }) => void = () => {};
  const card: StripeCard = {
    mount: vi.fn(),
    destroy: vi.fn(),
    on: (_e, fn) => {
      change = fn;
    },
  };
  const client: StripeClient = {
    elements: () => ({ create: vi.fn(() => card) }),
    confirmCardSetup: vi.fn(async () => ({})),
    handleNextAction: vi.fn(async () => ({})),
  };
  const factory = vi.fn(() => client),
    loader = vi.fn(async () => factory);
  return {
    card,
    client,
    factory,
    loader,
    change: (complete = true) => act(() => change({ complete })),
  };
}
describe('Phase E secure checkout', () => {
  it.each(['BAD_USER_INPUT', 'USER_INPUT_ERROR'])(
    'preserves the safe account-readiness sentinel under %s',
    async (code) => {
      const checkout = createCheckoutApi({
        endpoint: 'http://localhost/shop-api',
        channelToken: 'fixture',
        fetch: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              errors: [{ message: 'ACCOUNT_NOT_READY', extensions: { code } }],
            }),
          ),
        ),
      });
      await expect(
        checkout.stripeStart('checkout-vendors-once-v1'),
      ).rejects.toMatchObject({
        code: 'ACCOUNT_NOT_READY',
        kind: 'validation',
        message: expect.stringContaining('complete Stripe setup'),
      });
    },
  );
  it('shows an automatic setup blocker and an explicit retry', async () => {
    api.mockRejectedValue(new AppError('validation', 'ACCOUNT_NOT_READY'));
    render(<StripeCheckout storefrontId="store" view={view} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The vendor must complete Stripe setup',
    );
    expect(
      screen.queryByText(/We could not verify the latest payment status/),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Retry secure payment' }),
    ).toBeEnabled();
    expect(api).toHaveBeenCalledWith('store', 'stripe-checkout-prepare', {});
  });
  it('freezes the server fee quote after pickup and reviews the resulting total', async () => {
    const initial = {
      ...view,
      preorderFee: null,
      availability: { state: 'AVAILABLE', mode: 'STRIPE_TEST' },
    } as CheckoutView;
    const actions: string[] = [];
    api.mockImplementation(async (_store, action) => {
      actions.push(action);
      return action === 'checkout-status'
        ? { ...initial, preorderFee: view.preorderFee, total: 16245 }
        : null;
    });
    const { result } = renderHook(() =>
      useCheckout({ storefrontId: 'store', initial }),
    );
    const form = document.createElement('form');
    for (const vendor of ['1', '2']) {
      const input = document.createElement('input');
      input.name = `pickup-${vendor}`;
      input.value = `method-${vendor}`;
      form.append(input);
    }
    act(() => {
      void result.current.submitPickup({
        preventDefault() {},
        currentTarget: form,
      } as Parameters<typeof result.current.submitPickup>[0]);
    });
    await waitFor(() => expect(result.current.stage).toBe('Review'));
    expect(actions).toEqual(['checkout-select-pickup', 'checkout-status']);
    expect(api).toHaveBeenCalledWith('store', 'checkout-select-pickup', {
      methodIds: ['method-1', 'method-2'],
    });
    expect(result.current.view.preorderFee).toEqual(view.preorderFee);
  });
  it.each(['failed', 'missing'])(
    'does not advance when the fee quote is %s',
    async (outcome) => {
      const initial = {
        ...view,
        preorderFee: null,
        availability: { state: 'AVAILABLE', mode: 'STRIPE_TEST' },
      } as CheckoutView;
      api.mockImplementation(async (_store, action) => {
        if (action === 'checkout-status' && outcome === 'failed')
          throw new Error('Quote failed');
        return action === 'checkout-status' ? initial : null;
      });
      const { result } = renderHook(() =>
        useCheckout({ storefrontId: 'store', initial }),
      );
      act(() => result.current.go('Pickup'));
      const form = document.createElement('form');
      act(() => {
        void result.current.submitPickup({
          preventDefault() {},
          currentTarget: form,
        } as Parameters<typeof result.current.submitPickup>[0]);
      });
      await waitFor(() => expect(result.current.error).not.toBe(''));
      expect(result.current.stage).toBe('Pickup');
      expect(result.current.pending).toBe(false);
      expect(
        api.mock.calls.some((args) => args[1] === 'stripe-checkout-start'),
      ).toBe(false);
    },
  );
  it('requires committed native checkout evidence before showing purchase confirmation', async () => {
    api.mockImplementation(async (_store, action) =>
      action === 'stripe-checkout-prepare'
        ? status('COMPLETED')
        : { orderId: '9', committed: false },
    );
    render(<StripeCheckout storefrontId="store" view={view} />);
    await screen.findByText(
      'Your payment is being verified. Refresh the status before continuing.',
    );
    expect(screen.queryByText('Purchase confirmed.')).toBeNull();
  });
  it('prepares card entry and authorizes vendors through the purchase button', async () => {
    const stripe = sdk();
    api.mockResolvedValue(status('SETUP_REQUIRED'));
    render(
      <StripeCheckout
        storefrontId="store"
        view={view}
        loadSdk={stripe.loader}
      />,
    );
    await waitFor(() => expect(stripe.card.mount).toHaveBeenCalledOnce());
    expect(screen.getByText(/independent vendors/)).toBeInTheDocument();
    expect(screen.getByText('Orchard: $108.45')).toBeInTheDocument();
    expect(screen.getByText('Garden: $54.00')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Complete purchase' }),
    ).toBeDisabled();
    stripe.change();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Complete purchase' }),
    ).toBeEnabled();
    expect(stripe.client.confirmCardSetup).not.toHaveBeenCalled();
    expect(
      api.mock.calls.some((args) => args[1] === 'stripe-checkout-start'),
    ).toBe(false);
    expect(screen.queryByText('Continue to secure card entry')).toBeNull();
  });
  it('mounts Stripe card entry, disables incomplete cards and prevents duplicate confirmation', async () => {
    const stripe = sdk();
    api.mockImplementation(async (_store, action) =>
      action === 'stripe-checkout-prepare'
        ? status('SETUP_REQUIRED')
        : status('VERIFYING'),
    );
    render(
      <StripeCheckout
        storefrontId="store"
        view={view}
        loadSdk={stripe.loader}
      />,
    );
    await waitFor(() => expect(stripe.card.mount).toHaveBeenCalledOnce());
    const user = userEvent.setup();
    expect(
      screen.getByRole('button', { name: 'Complete purchase' }),
    ).toBeDisabled();
    stripe.change();
    let resolve!: () => void;
    vi.mocked(stripe.client.confirmCardSetup).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = () => r({});
        }),
    );
    await user.dblClick(
      screen.getByRole('button', { name: 'Complete purchase' }),
    );
    expect(stripe.client.confirmCardSetup).toHaveBeenCalledOnce();
    await act(async () => resolve());
    await screen.findByText(/verifying the payment outcome/);
    expect(
      screen.getByRole('dialog', { name: 'Processing your order' }),
    ).toBeVisible();
    expect(
      screen
        .getByRole('dialog', { name: 'Processing your order' })
        .querySelector('.spinner'),
    ).toBeVisible();
  });
  it('uses the original vendor account for additional authentication and verifies on backend', async () => {
    const stripe = sdk();
    api.mockImplementation(async (_store, action) =>
      action === 'stripe-checkout-prepare'
        ? status('AUTHENTICATION_REQUIRED')
        : status('AUTHENTICATION_REQUIRED'),
    );
    render(
      <StripeCheckout
        storefrontId="store"
        view={view}
        loadSdk={stripe.loader}
      />,
    );
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {
        name: 'Authenticate vendor payment',
      }),
    );
    expect(stripe.factory).toHaveBeenCalledWith('pk_test_fixture', {
      stripeAccount: 'acct_garden',
    });
    expect(stripe.client.handleNextAction).toHaveBeenCalledWith({
      clientSecret: 'pi_fixture_secret_test',
    });
    expect(api).toHaveBeenCalledWith('store', 'stripe-checkout-advance', {
      groupId: '3',
    });
  });
  it('does not announce success from a client callback or permit a new charge during uncertainty', async () => {
    api.mockResolvedValue(status('COMPENSATION_PENDING'));
    render(<StripeCheckout storefrontId="store" view={view} />);
    await screen.findByText(/Funds have not yet been confirmed returned/);
    expect(
      screen.queryByRole('button', { name: 'Complete purchase' }),
    ).toBeNull();
    expect(screen.queryByText('Purchase confirmed.')).toBeNull();
  });
  it('requires reconciliation after an interrupted purchase before another submission', async () => {
    const stripe = sdk();
    api.mockImplementation(async (_store, action) => {
      if (action === 'stripe-checkout-prepare') return status('SETUP_REQUIRED');
      throw new Error('connection lost');
    });
    render(
      <StripeCheckout
        storefrontId="store"
        view={view}
        loadSdk={stripe.loader}
      />,
    );
    await waitFor(() => expect(stripe.card.mount).toHaveBeenCalledOnce());
    stripe.change();
    await userEvent.click(
      screen.getByRole('button', { name: 'Complete purchase' }),
    );
    await screen.findByRole('alert');
    expect(
      screen.getByRole('button', { name: 'Complete purchase' }),
    ).toBeDisabled();
  });
});
