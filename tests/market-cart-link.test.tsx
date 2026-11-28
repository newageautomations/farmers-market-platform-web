import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketCartLink } from '../apps/storefront/src/components/MarketCartLink';

const call = vi.hoisted(() => vi.fn());
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: call,
}));

afterEach(() => call.mockReset());

describe('header cart count', () => {
  it('counts a vendor cart by its lines and refreshes after an add', async () => {
    call.mockResolvedValueOnce({ signedIn: false, cart: null });
    render(<MarketCartLink storefrontId="4" icon />);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Cart, 0 items' })).toBeTruthy(),
    );
    // A vendor cart has no total, only lines.
    call.mockResolvedValueOnce({
      signedIn: false,
      cart: { lines: [{ quantity: 2 }, { quantity: 3 }] },
    });
    act(() => {
      window.dispatchEvent(
        new CustomEvent('vendor-cart-updated', {
          detail: { storefrontId: '4' },
        }),
      );
    });
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Cart, 5 items' })).toBeTruthy(),
    );
  });

  it('uses a market cart total', async () => {
    call.mockResolvedValueOnce({ signedIn: false, cart: { totalQuantity: 4 } });
    render(<MarketCartLink storefrontId="1" icon />);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Cart, 4 items' })).toBeTruthy(),
    );
  });
});
