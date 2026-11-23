import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createCheckoutApi, type MarketCart } from '@market/api';
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
describe('market cart checkout handoff', () => {
  it('navigates directly to checkout without reading or setting pickup', () => {
    call.mockClear();
    render(
      <CartView storefrontId="market" marketName="Market" initialCart={cart} />,
    );
    const link = screen.getByRole('link', { name: 'Continue to checkout' });
    expect(link).toHaveAttribute('href', '/checkout');
    const navigation = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    let wasPrevented = true;
    document.addEventListener(
      'click',
      (event) => {
        wasPrevented = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );
    fireEvent(link, navigation);
    expect(wasPrevented).toBe(false);
    expect(screen.queryByLabelText(/pickup for/i)).toBeNull();
    expect(call).not.toHaveBeenCalled();
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
