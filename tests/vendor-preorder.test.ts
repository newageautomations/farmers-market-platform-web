import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import type { PublicCart } from '@market/api';
import { vendorPreorder } from '../apps/storefront/src/lib/vendor-preorder';
import { POST } from '../apps/storefront/src/pages/api/shop';
import { requestShop } from '../apps/storefront/src/lib/shop';
vi.mock('../apps/storefront/src/lib/shop', () => ({
  requestShop: vi.fn(),
  requestMarketShop: vi.fn(),
  requestCheckout: vi.fn(),
  requestPreferences: vi.fn(),
}));
const occurrence = {
  id: '7',
  marketId: '3',
  marketName: 'Garden',
  scheduleDate: '2026-10-30',
  startsAt: '2026-10-30T14:00:00Z',
  endsAt: '2026-10-30T19:00:00Z',
  timezone: 'America/Chicago',
  venue: 'Garden',
};
const line = { id: '10', productVariant: { id: '109' } };
const populated = { id: '1', lines: [line] } as unknown as PublicCart;
const api = {
  occurrences: vi.fn(),
  bootstrap: vi.fn(),
  marketCart: vi.fn(),
  availability: vi.fn(),
};
function context(query = '', cookie = '8', preview = false) {
  return {
    url: new URL(`http://vendor.localhost:4321/cart${query}`),
    request: new Request('http://vendor.localhost:4321/api/shop', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://vendor.localhost:4321',
      },
      body: JSON.stringify({
        storefrontId: '5',
        action: 'cart',
        includePreorder: true,
      }),
    }),
    cookies: { get: vi.fn(() => ({ value: cookie })), set: vi.fn() },
    locals: {
      storefront: {
        kind: 'VENDOR',
        source: 'backend',
        storefrontId: '5',
        canonicalOrigin: 'http://vendor.localhost:4321',
      },
      ...(preview ? { editorPreview: {} } : {}),
    },
  } as unknown as APIContext;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requestShop).mockReturnValue(
    api as unknown as ReturnType<typeof requestShop>,
  );
  api.occurrences.mockResolvedValue([occurrence, { ...occurrence, id: '8' }]);
  api.bootstrap.mockResolvedValue({ cart: populated, signedIn: false });
  api.marketCart.mockResolvedValue({ id: '1', occurrence });
  api.availability.mockResolvedValue([
    { variantId: '109', available: true, quantity: 20, reason: 'Available' },
  ]);
});
describe('authoritative vendor market resolution', () => {
  it('uses the populated order context over a conflicting URL and cookie and persists that actual selection', async () => {
    const ctx = context('?occurrence=8');
    const result = await vendorPreorder(ctx, ['109']);
    expect(result.selected?.id).toBe('7');
    expect(result.orderOccurrence?.id).toBe('7');
    expect(api.availability).toHaveBeenCalledWith('7', ['109']);
    expect(ctx.cookies.set).toHaveBeenCalledWith(
      'vendor-occurrence-5',
      '7',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
  });
  it.each([null, { id: 'foreign', occurrence }])(
    'never substitutes another eligible market when the populated order context is missing or mismatched',
    async (marketCart) => {
      api.marketCart.mockResolvedValue(marketCart);
      const ctx = context('?occurrence=8');
      expect((await vendorPreorder(ctx, ['109'])).selected).toBeUndefined();
      expect(api.availability).not.toHaveBeenCalled();
      expect(ctx.cookies.set).not.toHaveBeenCalled();
    },
  );
  it('retains the actual order date for explanation when its occurrence is no longer eligible', async () => {
    api.occurrences.mockResolvedValue([{ ...occurrence, id: '8' }]);
    const result = await vendorPreorder(context('?occurrence=8'), ['109']);
    expect(result.selected).toBeUndefined();
    expect(result.orderOccurrence?.id).toBe('7');
    expect(result.availability).toEqual([]);
  });
  it('fails closed on session or availability failures without inventing a new context', async () => {
    api.marketCart.mockRejectedValueOnce(new Error('Session unavailable'));
    expect(await vendorPreorder(context(), ['109'])).toMatchObject({
      unavailable: true,
      selected: undefined,
      availability: [],
    });
    api.availability.mockRejectedValueOnce(new Error('Unavailable'));
    expect(await vendorPreorder(context(), ['109'])).toMatchObject({
      unavailable: true,
      selected: occurrence,
      availability: [],
    });
  });
  it.each([
    ['?occurrence=7', '8', '7'],
    ['', '8', '8'],
    ['?occurrence=invalid', '8', '7'],
  ])(
    'restores empty-cart selection using URL/cookie or an eligible default',
    async (query, cookie, selected) => {
      api.bootstrap.mockResolvedValue({ cart: null, signedIn: false });
      expect(
        (await vendorPreorder(context(query, cookie), ['109'])).selected?.id,
      ).toBe(selected);
      expect(api.marketCart).not.toHaveBeenCalled();
    },
  );
  it('performs no cart or session reads and writes no preference in editor preview', async () => {
    const ctx = context('?occurrence=8', '7', true);
    expect((await vendorPreorder(ctx, ['109'])).selected?.id).toBe('8');
    expect(api.bootstrap).not.toHaveBeenCalled();
    expect(api.marketCart).not.toHaveBeenCalled();
    expect(ctx.cookies.set).not.toHaveBeenCalled();
  });
  it('deduplicates and batches availability reads using the existing 20-variant bound', async () => {
    const ids = Array.from({ length: 21 }, (_, i) => String(i + 1));
    await vendorPreorder(context(), [...ids, ids[0]!]);
    expect(api.availability).toHaveBeenCalledTimes(2);
    expect(api.availability.mock.calls.map((args) => args[1])).toEqual([
      ids.slice(0, 20),
      ids.slice(20),
    ]);
  });
});
describe('cart refresh route', () => {
  it('returns the session cart with matching preorder facts through the existing private route', async () => {
    const response = await POST(context('?occurrence=8'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const payload = await response.json();
    expect(payload.result.cart.id).toBe('1');
    expect(payload.result.preorder.selected.id).toBe('7');
    expect(api.bootstrap).toHaveBeenCalledTimes(1);
  });
  it('does not reuse another customer request’s selected order context', async () => {
    const a = await (await POST(context())).json();
    api.marketCart.mockResolvedValue({
      id: '2',
      occurrence: { ...occurrence, id: '8' },
    });
    api.bootstrap.mockResolvedValue({
      cart: { ...populated, id: '2' },
      signedIn: false,
    });
    const b = await (await POST(context())).json();
    expect(a.result.preorder.selected.id).toBe('7');
    expect(b.result.preorder.selected.id).toBe('8');
  });
  it.each(['origin', 'storefront'])(
    'rejects a foreign %s before reading customer cart data',
    async (kind) => {
      const ctx = context();
      ctx.request = new Request(ctx.request.url, {
        method: 'POST',
        headers: {
          origin:
            kind === 'origin'
              ? 'http://foreign.localhost:4321'
              : ctx.url.origin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cart',
          includePreorder: true,
          storefrontId: kind === 'storefront' ? '99' : '5',
        }),
      });
      const response = await POST(ctx);
      expect(response.status).not.toBe(200);
      expect(api.bootstrap).not.toHaveBeenCalled();
    },
  );
});
