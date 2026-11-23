import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type {
  CheckoutView,
  OrderRefundPreview,
  OrderRefundsApi,
  OrderRefundView,
} from '@market/api';
import { OrderRefunds } from '../apps/admin/src/vendor/OrderRefunds';
import { StripeCheckout } from '../apps/storefront/src/components/StripeCheckout';
import { CheckoutSummary } from '../apps/storefront/src/components/Checkout';
import { Summary } from '../apps/storefront/src/components/modern-farmhouse/Checkout';
import { useCheckout } from '../apps/storefront/src/lib/use-checkout';
import { renderHook } from '@testing-library/react';

const shop = vi.hoisted(() => vi.fn());
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: shop,
}));
function refundApi() {
  const view: OrderRefundView = {
    allocationId: '7',
    currency: 'USD',
    blocked: false,
    history: [],
    lines: [{ lineId: 'line-1', unitIds: ['unit-1', 'unit-2'] }],
  };
  const preview: OrderRefundPreview = {
    allocationId: '7',
    unitIds: ['unit-1'],
    currency: 'USD',
    merchandise: 2000,
    tax: 160,
    shipping: 0,
    platform: 100,
    recovery: 69,
    feeTax: 0,
    preorderFee: 169,
    total: 2329,
  };
  return {
    view,
    preview,
    api: {
      read: vi.fn(async () => view),
      preview: vi.fn(async () => preview),
      request: vi.fn(async () => ({
        id: '10',
        state: 'SETTLED',
        amount: 2329,
        currency: 'USD',
      })),
    } satisfies OrderRefundsApi,
  };
}
const names = { 'line-1': 'Original apples' };
describe('Phase F vendor original-unit refunds', () => {
  it('only previews selected original units and requires an explicit confirmation', async () => {
    const f = refundApi(),
      updated = vi.fn();
    render(
      <OrderRefunds
        api={f.api}
        orderId="9"
        names={names}
        onUpdated={updated}
      />,
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Refund items' }),
    );
    expect(f.api.request).not.toHaveBeenCalled();
    await userEvent.selectOptions(
      screen.getByLabelText('Original apples'),
      '1',
    );
    expect(
      await screen.findByText('Customer refund: $23.29'),
    ).toBeInTheDocument();
    expect(screen.getByText('Online payment fee: $1.69')).toBeInTheDocument();
    expect(screen.queryByText(/Preorder fee:/)).toBeNull();
    expect(f.api.preview).toHaveBeenCalledWith('7', ['unit-1']);
    expect(f.api.request).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm refund' }),
    );
    await waitFor(() => expect(updated).toHaveBeenCalledOnce());
    expect(f.api.request).toHaveBeenCalledWith(
      expect.objectContaining({
        allocationId: '7',
        unitIds: ['unit-1'],
        cancelUnfulfilled: false,
      }),
    );
  });
  it('ignores an older preview response after quantities change', async () => {
    const f = refundApi();
    let older!: (value: OrderRefundPreview) => void;
    f.api.preview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          older = resolve;
        }),
    );
    f.api.preview.mockResolvedValueOnce({
      ...f.preview,
      unitIds: ['unit-1', 'unit-2'],
      total: 4658,
    });
    render(
      <OrderRefunds
        api={f.api}
        orderId="9"
        names={names}
        onUpdated={() => {}}
      />,
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Refund items' }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Original apples'),
      '1',
    );
    await waitFor(() => expect(f.api.preview).toHaveBeenCalledOnce());
    await userEvent.selectOptions(
      screen.getByLabelText('Original apples'),
      '2',
    );
    expect(
      await screen.findByText('Customer refund: $46.58'),
    ).toBeInTheDocument();
    await act(async () => older(f.preview));
    expect(screen.queryByText('Customer refund: $23.29')).toBeNull();
    expect(f.api.request).not.toHaveBeenCalled();
  });
  it('retains the same durable request after a lost submission response', async () => {
    const f = refundApi();
    f.api.request.mockRejectedValueOnce(new Error('lost response'));
    render(
      <OrderRefunds
        api={f.api}
        orderId="9"
        names={names}
        onUpdated={() => {}}
      />,
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Refund items' }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Original apples'),
      '1',
    );
    await screen.findByText('Customer refund: $23.29');
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm refund' }),
    );
    await screen.findByText(
      /Check the original refund before starting another request/,
    );
    expect(screen.getByLabelText('Original apples')).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Check original refund' }),
    );
    await waitFor(() => expect(f.api.request).toHaveBeenCalledTimes(2));
    expect(f.api.request.mock.calls[0]).toEqual(f.api.request.mock.calls[1]);
  });
  it('keeps customer and application fee outcomes distinct and blocks a conflicting new request', async () => {
    const f = refundApi();
    f.view.blocked = true;
    f.view.history = [
      {
        id: '1',
        state: 'SETTLED',
        currency: 'USD',
        amount: 2329,
        platform: 100,
        recovery: 69,
        feeTax: 0,
        financialState: 'AWAITING_RECOVERY',
        customerState: 'CONFIRMED',
        applicationFeeState: 'PENDING',
        reconciliationCode: 'APPLICATION_FEE_REFUND_PENDING',
        createdAt: '2026-11-10T10:00:00Z',
      },
    ];
    render(
      <OrderRefunds
        api={f.api}
        orderId="9"
        names={names}
        onUpdated={() => {}}
      />,
    );
    expect(
      await screen.findByRole('button', { name: 'Refund items' }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        'Customer refund: confirmed. Platform fee return: pending.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Online payment fee: $1.69')).toBeInTheDocument();
    expect(f.api.request).not.toHaveBeenCalled();
  });
});

const checkout = {
  orderId: '9',
  currency: 'USD',
  total: 10845,
  subtotal: 10000,
  shipping: 0,
  taxes: [],
  discounts: [],
  pickupPromise: {},
  groups: [{ vendorId: '1', vendorName: 'Orchard', lines: [], pickup: [] }],
  availability: { mode: 'STRIPE_TEST', state: 'AVAILABLE' },
  preorderFee: {
    quoteId: '1',
    total: 10845,
    preorderFee: 845,
    vendors: [{ vendorId: '1', total: 10845 }],
  },
} as unknown as CheckoutView;
describe('Phase F automatic checkout lifecycle', () => {
  it.each([CheckoutSummary, Summary])(
    'does not present a final total while the authoritative quote is unresolved',
    (Component) => {
      render(<Component view={checkout} unresolved />);
      expect(screen.getByRole('status')).toHaveTextContent(
        'Updating order total',
      );
      expect(screen.queryByText('$108.45')).toBeNull();
    },
  );
  it('prepares once under repeated effects and never authorizes or captures from mounting', async () => {
    let resolve!: (value: unknown) => void;
    shop.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const card = { mount: vi.fn(), destroy: vi.fn(), on: vi.fn() };
    const client = {
      elements: () => ({ create: () => card }),
      confirmSetup: vi.fn(),
      handleNextAction: vi.fn(),
    };
    const loader = vi.fn(async () => () => client);
    const rendered = render(
      <StrictMode>
        <StripeCheckout storefrontId="f" view={checkout} loadSdk={loader} />
      </StrictMode>,
    );
    await waitFor(() => expect(shop).toHaveBeenCalledTimes(1));
    await act(async () =>
      resolve({
        groupId: '3',
        orderId: '9',
        state: 'SETUP_REQUIRED',
        publishableKey: 'pk_test_fixture',
        consentPolicy: 'checkout-vendors-once-v1',
        setupSecret: 'seti_fixture',
        charges: [],
      }),
    );
    await waitFor(() => expect(card.mount).toHaveBeenCalledOnce());
    rendered.rerender(
      <StrictMode>
        <StripeCheckout
          storefrontId="f"
          view={{ ...checkout }}
          loadSdk={loader}
          disabled
        />
      </StrictMode>,
    );
    expect(shop).toHaveBeenCalledTimes(1);
    expect(client.confirmSetup).not.toHaveBeenCalled();
    expect(card.destroy).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', {
        name: /Prepare test fee quote|Clear test fee quote|Load Stripe payment fee|Continue to secure card entry/,
      }),
    ).toBeNull();
  });
  it('refreshes automatically after a cart change without discarding entered contact', async () => {
    shop.mockResolvedValue({
      ...checkout,
      contact: { firstName: 'Customer', lastName: 'Name' },
      total: 21690,
    });
    const { result } = renderHook(() =>
      useCheckout({ storefrontId: 'f', initial: checkout }),
    );
    act(() => result.current.go('Review'));
    act(() => {
      window.dispatchEvent(new Event('vendor-cart-updated'));
      window.dispatchEvent(new Event('vendor-cart-updated'));
    });
    await waitFor(() => expect(result.current.view.total).toBe(21690));
    expect(shop).toHaveBeenCalledTimes(1);
    expect(result.current.view.contact?.firstName).toBe('Customer');
    expect(shop).toHaveBeenCalledWith('f', 'checkout-status', { orderId: '9' });
  });
});
