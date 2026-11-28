import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { APIContext } from 'astro';
import type { MarketItem, MarketCatalog } from '@market/api';
import {
  marketProduct,
  marketCatalogAvailability,
  marketStockAvailability,
  marketShopCatalog,
  marketShopQuery,
} from '../apps/storefront/src/lib/market-catalog';
import { marketPreorder } from '../apps/storefront/src/lib/market-preorder';
import { ProductPurchase } from '../apps/storefront/src/components/ProductPurchase';
import { FeaturedAdd } from '../apps/storefront/src/components/FeaturedAdd';
import { storefrontPreviewPath } from '@market/theme/storefront';

const mocks = vi.hoisted(() => ({
  api: { occurrences: vi.fn(), bootstrap: vi.fn() },
  call: vi.fn(),
}));
vi.mock('../apps/storefront/src/lib/shop', () => ({
  requestMarketShop: () => mocks.api,
}));
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: mocks.call,
}));
const date = {
  id: '7',
  scheduleDate: '2026-11-14',
  startsAt: '2026-11-14T15:00:00Z',
  endsAt: '2026-11-14T20:00:00Z',
  timezone: 'America/Chicago',
  venue: 'Town square',
};
const item: MarketItem = {
  productId: '2',
  variantId: '21',
  vendorId: '10',
  vendorName: 'Manna Roots',
  productName: 'Sourdough',
  name: 'Loaf',
  description: 'Fresh bread',
  price: 800,
  currencyCode: 'USD',
  featuredAsset: null,
  facetValueIds: [],
  primaryCategoryId: '3',
  categoryIds: ['3'],
  tagIds: [],
  productVariants: [
    { variantId: '21', name: 'Loaf', price: 800, currencyCode: 'USD' },
    { variantId: '22', name: 'Large loaf', price: 1200, currencyCode: 'USD' },
  ],
};
function context(search = '', preview = false, cookie?: string) {
  return {
    locals: {
      storefront: {
        kind: 'MARKET',
        source: 'backend',
        storefrontId: '1',
        subjectId: '3',
        name: 'Boerne Market',
      },
      editorPreview: preview ? {} : undefined,
    },
    url: new URL('http://market.localhost/shop' + search),
    cookies: {
      get: () => (cookie ? { value: cookie } : undefined),
      set: vi.fn(),
    },
  } as unknown as APIContext;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.occurrences.mockResolvedValue({
    marketStorefrontOccurrences: {
      totalItems: 2,
      items: [date, { ...date, id: '8' }],
    },
  });
  mocks.api.bootstrap.mockResolvedValue({ signedIn: false, cart: null });
});
describe('Harvest market shop', () => {
  it.each([
    ['occurrence=80&vendor=7&category=2', 'vendor', ['7']],
    ['filter=category&vendor=7&category=2', 'category', ['2']],
    ['filter=vendor&vendor=7&vendor=8&category=2', 'vendor', ['7', '8']],
    ['occurrence=80', 'category', []],
  ] as const)('uses one filter type for %s', (search, mode, ids) => {
    const query = marketShopQuery(new URLSearchParams(search));
    expect(query.get('filter')).toBe(mode);
    expect(query.getAll(mode)).toEqual(ids);
    expect(query.has(mode === 'vendor' ? 'category' : 'vendor')).toBe(false);
  });
  it.each(['NAME_ASC', 'NAME_DESC'] as const)(
    'sorts customer product names across API pages for %s',
    async (sort) => {
      const read = vi
        .fn()
        .mockResolvedValueOnce({
          totalItems: 3,
          items: [
            {
              ...item,
              productId: '3',
              name: '12 oz',
              productName: 'Watermelon Splash',
            },
            {
              ...item,
              productId: '4',
              name: '16 oz',
              productName: 'Lemony Zest',
            },
          ],
        } as MarketCatalog)
        .mockResolvedValueOnce({
          totalItems: 3,
          items: [
            {
              ...item,
              productId: '5',
              name: 'Regular',
              productName: 'Almond Biscotti',
            },
          ],
        } as MarketCatalog);
      const result = await marketShopCatalog(read, {
        sort,
        skip: 0,
        take: 2,
        categoryIds: ['3'],
      });
      expect(result.items.map((product) => product.productName)).toEqual(
        sort === 'NAME_ASC'
          ? ['Almond Biscotti', 'Lemony Zest']
          : ['Watermelon Splash', 'Lemony Zest'],
      );
      expect(result.totalItems).toBe(3);
      expect(read).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 2, categoryIds: ['3'] }),
      );
    },
  );
  it('leaves a fresh visit unselected instead of choosing the first date', async () => {
    expect((await marketPreorder(context())).selected).toBeUndefined();
  });
  it('adapts eligible product options without inventing stock quantities', () => {
    expect(
      marketProduct(item).variants.map((variant) => [
        variant.id,
        variant.price,
      ]),
    ).toEqual([
      ['21', 800],
      ['22', 1200],
    ]);
    expect(marketCatalogAvailability([item], ['21', '22', '999'])).toEqual([
      {
        variantId: '21',
        available: true,
        reason: 'Available at this market',
        quantity: null,
      },
      {
        variantId: '22',
        available: true,
        reason: 'Available at this market',
        quantity: null,
      },
      {
        variantId: '999',
        available: false,
        reason: 'Unavailable at this market',
        quantity: null,
      },
    ]);
  });
  it('reads stock only for eligible variants and falls back to eligibility', async () => {
    const read = vi.fn(async (_occurrence: string, ids: string[]) =>
      ids.map((variantId) => ({
        variantId,
        available: variantId === '21',
        reason:
          variantId === '21' ? 'Available at this market' : 'Out of stock',
        quantity: variantId === '21' ? 4 : 0,
      })),
    );
    const facts = await marketStockAvailability(
      read,
      '7',
      [item],
      ['21', '22', '999'],
    );
    expect(read).toHaveBeenCalledWith('7', ['21', '22']);
    expect(facts.map((f) => [f.variantId, f.available, f.quantity])).toEqual([
      ['21', true, 4],
      ['22', false, 0],
      ['999', false, null],
    ]);
    const failing = vi.fn().mockRejectedValue(new Error('offline'));
    expect(await marketStockAvailability(failing, '7', [item])).toEqual(
      marketCatalogAvailability([item]),
    );
  });
  it('uses explicit dates, then the populated cart, then the saved preference', async () => {
    expect((await marketPreorder(context('', false, '8'))).selected?.id).toBe(
      '8',
    );
    mocks.api.bootstrap.mockResolvedValue({
      signedIn: false,
      cart: { totalQuantity: 1, occurrence: date },
    });
    expect((await marketPreorder(context('', false, '8'))).selected?.id).toBe(
      '7',
    );
    expect((await marketPreorder(context('?occurrence=8'))).selected?.id).toBe(
      '8',
    );
  });
  it('does not silently replace an explicitly invalid date or a cart whose date has disappeared', async () => {
    await expect(
      marketPreorder(context('?occurrence=999')),
    ).rejects.toMatchObject({ kind: 'not-found' });
    mocks.api.bootstrap.mockResolvedValue({
      signedIn: false,
      cart: { totalQuantity: 1, occurrence: { ...date, id: '9' } },
    });
    const state = await marketPreorder(context());
    expect(state.selected).toBeUndefined();
    expect(state.orderOccurrence?.id).toBe('9');
  });
  it('keeps editor preview read-only and loads all pages of dates', async () => {
    mocks.api.occurrences
      .mockResolvedValueOnce({
        marketStorefrontOccurrences: { totalItems: 2, items: [date] },
      })
      .mockResolvedValueOnce({
        marketStorefrontOccurrences: {
          totalItems: 2,
          items: [{ ...date, id: '8' }],
        },
      });
    const state = await marketPreorder(context('', true));
    expect(state.occurrences).toHaveLength(2);
    expect(state.selected).toBeUndefined();
    expect(state.occurrences[0]?.marketName).toBe('Boerne Market');
    expect(mocks.api.occurrences).toHaveBeenNthCalledWith(1, {
      options: { skip: 0, take: 50 },
    });
    expect(mocks.api.occurrences).toHaveBeenNthCalledWith(2, {
      options: { skip: 50, take: 50 },
    });
    expect(mocks.api.bootstrap).not.toHaveBeenCalled();
  });
  it('allows only the new read-only shop paths in the editor', () => {
    expect(storefrontPreviewPath('/shop')).toBe(true);
    expect(storefrontPreviewPath('/shop/products/21')).toBe(true);
    expect(storefrontPreviewPath('/shop/products/21/checkout')).toBe(false);
    expect(storefrontPreviewPath('/shop/products/%2f')).toBe(false);
  });
  it('uses the shared purchase form with market availability and market cart events', async () => {
    const update = vi.fn();
    window.addEventListener('market-cart-updated', update);
    mocks.call.mockImplementation(async (_storefront, action) =>
      action === 'product-availability'
        ? marketCatalogAvailability([item])
        : { cart: { totalQuantity: 2 } },
    );
    try {
      render(
        <ProductPurchase
          storefrontId="1"
          variants={marketProduct(item).variants}
          signedIn={false}
          fixture={false}
          market
          occurrenceId="7"
          initialVariantId="21"
          availability={marketCatalogAvailability([item])}
        />,
      );
      fireEvent.change(screen.getByLabelText('Product option'), {
        target: { value: '22' },
      });
      fireEvent.change(screen.getByLabelText('Quantity'), {
        target: { value: '2' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
      await waitFor(() =>
        expect(mocks.call).toHaveBeenCalledWith('1', 'add', {
          variantId: '22',
          quantity: 2,
          occurrenceId: '7',
        }),
      );
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(screen.getByRole('button', { name: 'Add to cart' })).toHaveClass(
        'is-added',
      );
      expect((update.mock.calls[0]![0] as CustomEvent).detail).toEqual({
        storefrontId: '1',
        quantity: 2,
      });
    } finally {
      window.removeEventListener('market-cart-updated', update);
    }
  });
  it('updates the market cart badge after a quick add from a shared card', async () => {
    const update = vi.fn();
    window.addEventListener('market-cart-updated', update);
    mocks.call.mockResolvedValue({ cart: { totalQuantity: 3 } });
    try {
      render(
        <FeaturedAdd storefrontId="1" variantId="21" occurrenceId="7" market />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect((update.mock.calls[0]![0] as CustomEvent).detail).toEqual({
        storefrontId: '1',
        quantity: 3,
      });
    } finally {
      window.removeEventListener('market-cart-updated', update);
    }
  });
});
