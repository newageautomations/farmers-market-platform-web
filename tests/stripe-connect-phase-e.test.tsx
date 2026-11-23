import { describe, expect, it, vi } from 'vitest';
import {
  render,
  renderHook,
  screen,
  waitFor,
  act,
  within,
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
  StripePaymentElement,
  StripePaymentClient,
} from '../apps/storefront/src/lib/stripe-checkout';
const api = vi.hoisted(() => vi.fn());
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: api,
}));
const view = {
  orderId: '9',
  currency: 'USD',
  total: 16245,
  termsDisclosure: {
    token: 'a'.repeat(64),
    sellers: [
      { vendorId: '1', vendorName: 'Orchard', version: 'b'.repeat(64), pickupRefundNotice: null, policies: [] },
      { vendorId: '2', vendorName: 'Garden', version: 'c'.repeat(64), pickupRefundNotice: null, policies: [] },
    ],
  },
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
  paymentSecret: null,
  paymentAccount: null,
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
  const card: StripePaymentElement = {
    mount: vi.fn(),
    destroy: vi.fn(),
    on: (_e, fn) => {
      change = fn;
    },
  };
  const client: StripePaymentClient = {
    elements: vi.fn(() => ({ create: vi.fn(() => card) })),
    confirmSetup: vi.fn(async () => ({ setupIntent: { status: 'succeeded' } })),
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
    expect(
      await screen.findByText(/verifying your order confirmation/i),
    ).toBeVisible();
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
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Complete purchase' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(
      screen.getByRole('button', { name: 'Complete purchase' }),
    ).toBeEnabled();
    expect(stripe.client.confirmSetup).not.toHaveBeenCalled();
    expect(
      api.mock.calls.some((args) => args[1] === 'stripe-checkout-start'),
    ).toBe(false);
    expect(screen.queryByText('Continue to secure card entry')).toBeNull();
  });
  it('prefills the Payment Element and prevents duplicate confirmation', async () => {
    const stripe = sdk();
    const contact = {
      firstName: 'Ada',
      lastName: 'Smith',
      emailAddress: 'ada@example.test',
      phoneNumber: '+12105550123',
    };
    const billingDetails = {
      name: 'Ada Smith',
      email: contact.emailAddress,
      phone: contact.phoneNumber,
    };
    api.mockImplementation(async (_store, action) =>
      action === 'stripe-checkout-advance'
        ? status('VERIFYING')
        : status('SETUP_REQUIRED'),
    );
    render(
      <StripeCheckout
        storefrontId="store"
        view={{ ...view, contact }}
        loadSdk={stripe.loader}
      />,
    );
    await waitFor(() => expect(stripe.card.mount).toHaveBeenCalledOnce());
    expect(stripe.client.elements).toHaveBeenCalledWith({
      clientSecret: status('SETUP_REQUIRED').setupSecret,
    });
    const elements = vi.mocked(stripe.client.elements).mock.results[0]!.value;
    expect(elements.create).toHaveBeenCalledWith('payment', {
      defaultValues: { billingDetails },
      fields: {
        billingDetails: { name: 'never', email: 'never', phone: 'never' },
      },
      wallets: { applePay: 'never', googlePay: 'never', link: 'never' },
    });
    const user = userEvent.setup();
    expect(
      screen.getByRole('button', { name: 'Complete purchase' }),
    ).toBeDisabled();
    stripe.change();
    await user.click(screen.getByRole('checkbox'));
    let resolve!: () => void;
    vi.mocked(stripe.client.confirmSetup).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = () => r({ setupIntent: { status: 'succeeded' } });
        }),
    );
    await user.dblClick(
      screen.getByRole('button', { name: 'Complete purchase' }),
    );
    expect(stripe.client.confirmSetup).toHaveBeenCalledOnce();
    expect(stripe.client.confirmSetup).toHaveBeenCalledWith({
      elements,
      redirect: 'if_required',
      confirmParams: {
        payment_method_data: { billing_details: billingDetails },
      },
    });
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
  it('refreshes stale terms before contacting Stripe to confirm the card', async () => {
    const stripe = sdk();
    const current = {
      ...view,
      termsDisclosure: {
        token: 'd'.repeat(64),
        sellers: view.termsDisclosure!.sellers.map((seller, index) =>
          index ? seller : { ...seller, version: 'e'.repeat(64) },
        ),
      },
    };
    api.mockImplementation(async (_store, action) => {
      if (action === 'stripe-checkout-prepare') return status('SETUP_REQUIRED');
      throw new AppError('conflict', 'VENDOR_TERMS_CHANGED');
    });
    const refresh = vi.fn(async () => {
      checkout.rerender(surface(current));
      return current;
    });
    const surface = (value: CheckoutView) => (
      <StripeCheckout storefrontId="store" market view={value} loadSdk={stripe.loader} onTermsChanged={refresh} />
    );
    const checkout = render(surface(view));
    await waitFor(() => expect(stripe.card.mount).toHaveBeenCalledOnce());
    stripe.change();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Complete purchase' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Review the updated terms/);
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'Orchard' }))
      .toHaveAttribute('href', `/checkout/seller-terms/${'e'.repeat(64)}`);
    expect(screen.getByRole('button', { name: 'Complete purchase' })).toBeDisabled();
    expect(stripe.client.confirmSetup).not.toHaveBeenCalled();
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
  it('confirms one vendor PaymentIntent in its connected account after server approval', async () => {
    const stripe = sdk();
    const entry = {
      ...status('SETUP_REQUIRED'),
      setupSecret: null,
      paymentSecret: 'pi_vendor_secret_fixture',
      paymentAccount: 'acct_garden',
      charges: [status('SETUP_REQUIRED').charges[1]!],
    };
    let finishConfirmation!: () => void;
    const confirmPayment = vi.fn<
      NonNullable<StripePaymentClient['confirmPayment']>
    >(
      () =>
        new Promise((resolve) => {
          finishConfirmation = () => resolve({});
        }),
    );
    stripe.client.confirmPayment = confirmPayment;
    api.mockImplementation(async (_store, action) =>
      action === 'stripe-checkout-advance'
        ? { ...entry, state: 'VERIFYING', paymentSecret: null }
        : entry,
    );
    render(
      <StripeCheckout
        storefrontId="store"
        view={view}
        loadSdk={stripe.loader}
      />,
    );
    await waitFor(() => expect(stripe.card.mount).toHaveBeenCalledOnce());
    expect(stripe.factory).toHaveBeenCalledWith('pk_test_fixture', {
      stripeAccount: 'acct_garden',
    });
    expect(stripe.client.elements).toHaveBeenCalledWith({
      clientSecret: entry.paymentSecret,
    });
    const elements = vi.mocked(stripe.client.elements).mock.results[0]!.value;
    expect(vi.mocked(elements.create).mock.calls[0]![1]).not.toHaveProperty(
      'wallets',
    );
    stripe.change();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.dblClick(
      screen.getByRole('button', { name: 'Complete purchase' }),
    );
    expect(confirmPayment).toHaveBeenCalledExactlyOnceWith({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: new URL('/checkout?payment-order=9', window.location.origin)
          .href,
        payment_method_data: { billing_details: {} },
      },
    });
    expect(api).toHaveBeenNthCalledWith(2, 'store', 'stripe-checkout-start', {
      consent: 'checkout-vendors-once-v1',
      termsToken: view.termsDisclosure!.token,
    });
    expect(api.mock.invocationCallOrder[1]).toBeLessThan(
      confirmPayment.mock.invocationCallOrder[0]!,
    );
    expect(stripe.client.confirmSetup).not.toHaveBeenCalled();
    await act(async () => finishConfirmation());
    expect(api).toHaveBeenNthCalledWith(3, 'store', 'stripe-checkout-advance', {
      groupId: '3',
    });
    expect(screen.getByText(/verifying the payment outcome/i)).toBeVisible();
  });
  it('resumes the owned vendor payment after a Stripe redirect', async () => {
    window.history.replaceState(null, '', '/checkout?payment-order=9');
    try {
      api.mockResolvedValue({
        ...status('VERIFYING'),
        paymentAccount: 'acct_garden',
      });
      const stripe = sdk();
      render(
        <StripeCheckout
          storefrontId="store"
          view={view}
          loadSdk={stripe.loader}
        />,
      );
      expect(
        await screen.findByText(/verifying the payment outcome/i),
      ).toBeVisible();
      expect(api).toHaveBeenCalledExactlyOnceWith(
        'store',
        'stripe-checkout-status',
        {
          orderId: '9',
        },
      );
      expect(stripe.loader).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });
  it('does not announce success from a client callback or permit a new charge during uncertainty', async () => {
    api.mockResolvedValue(status('COMPENSATION_PENDING'));
    render(<StripeCheckout storefrontId="store" view={view} />);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /Funds have not yet been confirmed returned/,
      ),
    );
    expect(
      screen.queryByRole('button', { name: 'Complete purchase' }),
    ).toBeNull();
    expect(screen.queryByText('Purchase confirmed.')).toBeNull();
  });
  it('requires reconciliation after an interrupted purchase before another submission', async () => {
    const stripe = sdk();
    const assign = vi.fn();
    const advance = vi.fn();
    let interrupt!: (cause: AppError) => void;
    let committed = false;
    api.mockImplementation(async (_store, action) => {
      if (
        action === 'stripe-checkout-prepare' || action === 'stripe-checkout-start'
      )
        return status('SETUP_REQUIRED');
      if (action === 'stripe-checkout-advance') {
        advance();
        return new Promise((_resolve, reject) => {
          interrupt = reject;
        });
      }
      if (action === 'checkout-status') return { orderId: '9', committed };
      throw new Error(`Unexpected action ${action}`);
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
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Complete purchase' }),
    );
    try {
      await screen.findByRole('dialog', { name: 'Processing your order' });
      await act(async () => interrupt(new AppError('unavailable')));
      const dialog = await screen.findByRole('dialog', {
        name: 'Verifying your order',
      });
      expect(dialog).toHaveTextContent(/do not pay again/i);
      expect(within(dialog).queryByRole('alert')).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Complete purchase' }),
      ).toBeDisabled();
      expect(screen.queryByText('Purchase confirmed.')).toBeNull();
      vi.stubGlobal('location', { ...window.location, assign });
      committed = true;
      await waitFor(
        () => expect(assign).toHaveBeenCalledExactlyOnceWith('/checkout/success?order=9'),
        { timeout: 5000 },
      );
      expect(advance).toHaveBeenCalledOnce();
      expect(stripe.client.confirmSetup).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  }, 10000);
});
