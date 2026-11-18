import { describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { AppError, createCheckoutApi, type MarketCart } from '@market/api';
import { prepareMarketCheckout } from '../apps/storefront/src/lib/prepare-market-checkout';
import { MarketCart as CartView } from '../apps/storefront/src/components/MarketCart';

const call = vi.hoisted(() => vi.fn());
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: call,
}));
vi.mock('../apps/storefront/src/components/CheckoutLoyalty', () => ({
  default: () => null,
}));
const cart = {
  id: '9',
  state: 'AddingItems',
  totalQuantity: 2,
  currencyCode: 'USD',
  totalWithTax: 2000,
  subTotalWithTax: 2000,
  discounts: [],
  taxSummary: [],
  couponCodes: [],
  occurrence: {
    id: '3',
    scheduleDate: '2026-11-14',
    startsAt: '2026-11-14T15:00:00Z',
    endsAt: '2026-11-14T19:00:00Z',
    timezone: 'America/Chicago',
    venue: 'Market',
  },
  groups: [
    { vendorId: '1', vendorName: 'Orchard', lines: [] },
    { vendorId: '2', vendorName: 'Garden', lines: [] },
  ],
} as unknown as MarketCart;
const view = { orderId: '9', preorderFee: { quoteId: '4' } };
const options = [
  {
    vendorId: '1',
    methodId: '11',
    name: 'Orchard pickup',
    price: 0,
    currencyCode: 'USD',
  },
  {
    vendorId: '2',
    methodId: '22',
    name: 'Garden pickup',
    price: 0,
    currencyCode: 'USD',
  },
];
function mock(handler?: (action: string) => unknown) {
  call.mockReset().mockImplementation(async (_store, action) => {
    const result = handler?.(action);
    if (result !== undefined) return result;
    if (action === 'cart') return { cart };
    if (action === 'stripe-checkout-enabled') return true;
    if (action === 'checkout-status') return view;
    if (action === 'checkout-pickup') return options;
    return null;
  });
}
const actions = () => call.mock.calls.map((args) => args[1]);
describe('market cart checkout preparation', () => {
  it('rebuilds an explicitly stale quote before reading checkout status', async () => {
    let quotes = 0;
    mock((action) => {
      if (action === 'checkout-test-preorder-fee' && ++quotes === 1)
        throw new AppError('conflict', 'PREORDER_FEE_REQUOTE_REQUIRED');
    });
    expect(await prepareMarketCheckout('market', '9')).toEqual({ view });
    expect(actions()).toEqual([
      'cart',
      'stripe-checkout-enabled',
      'checkout-test-preorder-fee',
      'checkout-clear-test-preorder-fee',
      'checkout-test-preorder-fee',
      'checkout-status',
    ]);
  });
  it('preserves valid quotes and existing pickup without clearing or reselecting them', async () => {
    mock();
    await prepareMarketCheckout('market', '9');
    expect(actions()).toEqual([
      'cart',
      'stripe-checkout-enabled',
      'checkout-test-preorder-fee',
      'checkout-status',
    ]);
  });
  it('selects unique backend pickup options for every vendor before quoting', async () => {
    let quotes = 0;
    mock((action) => {
      if (action === 'checkout-test-preorder-fee' && ++quotes === 1)
        throw new AppError('validation', 'VENDOR_PICKUP_COVERAGE_REQUIRED');
    });
    await prepareMarketCheckout('market', '9');
    expect(call).toHaveBeenCalledWith('market', 'checkout-select-pickup', {
      methodIds: ['11', '22'],
    });
    expect(actions().slice(-3)).toEqual([
      'checkout-select-pickup',
      'checkout-test-preorder-fee',
      'checkout-status',
    ]);
  });
  it('identifies missing pickup for a vendor in a three-vendor cart without selecting partial coverage', async () => {
    mock((action) => {
      if (action === 'cart')
        return {
          cart: {
            ...cart,
            groups: [
              ...cart.groups,
              { vendorId: '3', vendorName: 'Twice Baked Cafe', lines: [] },
            ],
          },
        };
      if (action === 'checkout-test-preorder-fee')
        throw new AppError('validation', 'VENDOR_PICKUP_COVERAGE_REQUIRED');
    });
    await expect(prepareMarketCheckout('market', '9')).rejects.toMatchObject({
      code: 'MARKET_VENDOR_PICKUP_UNAVAILABLE',
      message: expect.stringContaining('Twice Baked Cafe'),
    });
    expect(actions()).not.toContain('checkout-select-pickup');
    expect(actions()).not.toContain('checkout-status');
  });
  it('requests an explicit choice when a vendor has multiple pickup options', async () => {
    const choices = [
      ...options,
      { ...options[0]!, methodId: '12', name: 'Other pickup' },
    ];
    mock((action) => {
      if (action === 'checkout-test-preorder-fee')
        throw new AppError('validation', 'VENDOR_PICKUP_COVERAGE_REQUIRED');
      if (action === 'checkout-pickup') return choices;
    });
    expect(await prepareMarketCheckout('market', '9')).toEqual({
      pickupOptions: [choices[0], choices[2], choices[1]],
    });
    expect(actions()).not.toContain('checkout-select-pickup');
    expect(actions()).not.toContain('checkout-status');
    mock();
    await prepareMarketCheckout('market', '9', ['12', '22']);
    expect(actions().slice(-3)).toEqual([
      'checkout-select-pickup',
      'checkout-test-preorder-fee',
      'checkout-status',
    ]);
  });
  it('does not prepare another session cart or proceed without a confirmed fee quote', async () => {
    mock((action) =>
      action === 'cart' ? { cart: { ...cart, id: 'other' } } : undefined,
    );
    await expect(prepareMarketCheckout('market', '9')).rejects.toMatchObject({
      kind: 'conflict',
    });
    expect(actions()).toEqual(['cart']);
    mock((action) =>
      action === 'checkout-status'
        ? { orderId: '9', preorderFee: null }
        : undefined,
    );
    await expect(prepareMarketCheckout('market', '9')).rejects.toMatchObject({
      kind: 'conflict',
    });
  });
  it('does not mutate fees for a cart already in payment or a non-Stripe checkout', async () => {
    mock((action) =>
      action === 'cart'
        ? { cart: { ...cart, state: 'ArrangingPayment' } }
        : undefined,
    );
    await prepareMarketCheckout('market', '9');
    expect(actions()).not.toContain('checkout-test-preorder-fee');
    mock((action) =>
      action === 'stripe-checkout-enabled' ? false : undefined,
    );
    await prepareMarketCheckout('market', '9');
    expect(actions()).toEqual([
      'cart',
      'stripe-checkout-enabled',
      'checkout-status',
    ]);
  });
  it('keeps the cart visible and blocks duplicate navigation during preparation failure', async () => {
    let reject!: (error: Error) => void;
    mock((action) =>
      action === 'checkout-test-preorder-fee'
        ? new Promise((_resolve, fail) => {
            reject = fail;
          })
        : undefined,
    );
    render(
      <CartView storefrontId="market" marketName="Market" initialCart={cart} />,
    );
    const link = screen.getByRole('link', { name: 'Continue to checkout' });
    fireEvent.click(link);
    fireEvent.click(link);
    await screen.findByText('Preparing checkout…');
    await waitFor(() => expect(reject).toBeDefined());
    expect(
      actions().filter((action) => action === 'checkout-test-preorder-fee'),
    ).toHaveLength(1);
    await act(async () => reject(new Error('connection lost')));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Checkout could not be prepared',
    );
    expect(actions()).not.toContain('checkout-status');
    expect(link).toHaveAttribute('aria-disabled', 'false');
  });
  it('keeps checkout disabled until ambiguous pickup choices are complete', async () => {
    mock((action) => {
      if (action === 'checkout-test-preorder-fee')
        throw new AppError('validation', 'VENDOR_PICKUP_COVERAGE_REQUIRED');
      if (action === 'checkout-pickup')
        return [
          ...options,
          { ...options[0]!, methodId: '12', name: 'Other pickup' },
        ];
    });
    render(
      <CartView storefrontId="market" marketName="Market" initialCart={cart} />,
    );
    const link = screen.getByRole('link', { name: 'Continue to checkout' });
    fireEvent.click(link);
    const orchard = await screen.findByLabelText('Pickup for Orchard');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('Pickup for Garden')).toHaveValue('22');
    fireEvent.change(orchard, { target: { value: '12' } });
    expect(link).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(link);
    await waitFor(() =>
      expect(call).toHaveBeenCalledWith('market', 'checkout-select-pickup', {
        methodIds: ['12', '22'],
      }),
    );
  });
  it.each(['USER_INPUT_ERROR', 'BAD_USER_INPUT'])(
    'preserves the stale-quote sentinel under %s',
    async (code) => {
      const api = createCheckoutApi({
        endpoint: 'http://localhost/shop-api',
        channelToken: 'test',
        fetch: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              errors: [
                {
                  message: 'PREORDER_FEE_REQUOTE_REQUIRED',
                  extensions: { code },
                },
              ],
            }),
          ),
        ),
      });
      await expect(api.freezeTestPreorderFee()).rejects.toMatchObject({
        code: 'PREORDER_FEE_REQUOTE_REQUIRED',
        kind: 'conflict',
      });
    },
  );
});
