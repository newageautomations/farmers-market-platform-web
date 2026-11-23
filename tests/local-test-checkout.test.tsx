import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CheckoutView } from '@market/api';
import { Checkout } from '../apps/storefront/src/components/Checkout';
import { shopCall } from '../apps/storefront/src/components/shop-client';

vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: vi.fn(),
}));
const status = (changes: Partial<CheckoutView> = {}): CheckoutView => ({
  orderId: '7',
  code: 'LOCAL7',
  kind: 'DIRECT_VENDOR',
  occurrenceId: null,
  currency: 'USD',
  total: 1234,
  subtotal: 1234,
  shipping: 0,
  frozen: true,
  committed: false,
  paymentStatus: 'SUCCEEDED',
  termsDisclosure: {
    token: 'a'.repeat(64),
    sellers: [{
      vendorId: '1', vendorName: 'Demo vendor', version: 'b'.repeat(64),
      pickupRefundNotice: null, policies: [],
    }],
  },
  paymentGroup: null,
  preorderFee: null,
  preorderFeeTestAvailable: false,
  pickupPromise: {
    mode: 'PICKUP',
    venue: 'Demo venue',
    instructions: '',
    startsAt: null,
    endsAt: null,
  },
  contact: null,
  profile: null,
  groups: [],
  taxes: [],
  discounts: [],
  availability: { state: 'AVAILABLE', mode: 'LOCAL' },
  attempt: { attemptId: '9', state: 'HELD', expiresAt: null },
  ...changes,
});
const choose = () =>
  fireEvent.change(screen.getByLabelText('Payment method'), {
    target: { value: 'dev-test-payment' },
  });
const accept = () => fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms/ }));

describe('local test checkout', () => {
  it('offers no method or place-order action when server availability is disabled', () => {
    render(
      <Checkout
        storefrontId="4"
        initial={status({
          availability: { state: 'UNCONFIGURED', mode: 'PROVIDER' },
        })}
      />,
    );
    expect(screen.queryByLabelText('Payment method')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Complete purchase' }),
    ).toBeNull();
    expect(
      screen.getByText(/Online payment is not currently configured/),
    ).toBeInTheDocument();
  });
  it('requires a payment method and unchecked-by-default terms acceptance', () => {
    render(<Checkout storefrontId="4" initial={status()} />);
    expect(
      screen.getByRole('option', { name: 'Test Payment \u2014 No Charge' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This is a test purchase. No real payment will be made.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Complete purchase' }),
    ).toBeDisabled();
    choose();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Complete purchase' })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Terms & Conditions for Demo vendor/ }))
      .toHaveAttribute('target', '_blank');
    accept();
    expect(
      screen.getByRole('button', { name: 'Complete purchase' }),
    ).toBeEnabled();
  });
  it('blocks duplicate submission and retains uncertainty after a lost finalize response', async () => {
    let rejectPayment!: (error: Error) => void;
    const call = vi.mocked(shopCall).mockReset();
    call.mockResolvedValueOnce(status()).mockResolvedValueOnce(status().attempt).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectPayment = reject;
        }),
    );
    render(<Checkout storefrontId="4" initial={status()} />);
    choose();
    accept();
    const button = screen.getByRole('button', { name: 'Complete purchase' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(call).toHaveBeenCalledTimes(3));
    expect(call.mock.calls.map((args) => args[1])).toEqual([
      'checkout-status',
      'checkout-begin',
      'checkout-finalize',
    ]);
    expect(call.mock.calls[0]![2]).toEqual({ orderId: '7' });
    rejectPayment(new Error('response lost'));
    await screen.findByText(/Payment status is uncertain/);
    expect(
      screen.queryByRole('button', { name: 'Complete purchase' }),
    ).toBeNull();
    expect(screen.queryByText('Your order is confirmed.')).toBeNull();
    call.mockResolvedValueOnce(status());
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh checkout status' }),
    );
    await screen.findByRole('button', { name: 'Complete purchase' });
    expect(call).toHaveBeenCalledTimes(4); // Status read never automatically submits another payment.
  });
  it('rechecks server eligibility before submitting payment', async () => {
    const call = vi
      .mocked(shopCall)
      .mockReset()
      .mockResolvedValue(
        status({ availability: { state: 'UNCONFIGURED', mode: 'PROVIDER' } }),
      );
    render(<Checkout storefrontId="4" initial={status()} />);
    choose();
    accept();
    fireEvent.click(screen.getByRole('button', { name: 'Complete purchase' }));
    await screen.findByText(/Online payment is not currently configured/);
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0]![1]).toBe('checkout-status');
  });
  it('asks the buyer to accept the changed disclosures before starting payment', async () => {
    const previous = status().termsDisclosure!;
    const current = status({
      termsDisclosure: {
        token: 'c'.repeat(64),
        sellers: [{ ...previous.sellers[0]!, version: 'd'.repeat(64) }],
      },
    });
    const call = vi.mocked(shopCall).mockReset().mockResolvedValue(current);
    render(<Checkout storefrontId="4" initial={status()} />);
    choose();
    accept();
    fireEvent.click(screen.getByRole('button', { name: 'Complete purchase' }));
    expect(await screen.findByText(/Review the updated terms/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('link', { name: /Terms & Conditions for Demo vendor/ }))
      .toHaveAttribute('href', `/terms-and-conditions?version=${'d'.repeat(64)}`);
    expect(call.mock.calls.map((args) => args[1])).toEqual(['checkout-status']);
  });
  it('keeps uncertain provider results unavailable even after a status refresh', async () => {
    const call = vi
      .mocked(shopCall)
      .mockReset()
      .mockResolvedValue(status({ paymentStatus: 'RECONCILIATION_REQUIRED' }));
    render(
      <Checkout
        storefrontId="4"
        initial={status({ paymentStatus: 'PENDING' })}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh checkout status' }),
    );
    await waitFor(() => expect(call).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText('Payment method')).toBeNull();
    expect(screen.getByText(/Payment status is uncertain/)).toBeInTheDocument();
  });
});
