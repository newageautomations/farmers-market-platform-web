import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import {
  createMarketStorefrontApi,
  type MarketCart,
  cartMessage,
} from '@market/api';
import { marketCatalogInputs } from '@market/storefront-core';
import { MarketPurchase } from '../apps/storefront/src/components/MarketPurchase';
import { MarketCart as MarketCartView } from '../apps/storefront/src/components/MarketCart';

const occurrence = {
  id: '1',
  scheduleDate: '2026-10-09',
  startsAt: '2026-10-09T15:00:00Z',
  endsAt: '2026-10-09T20:00:00Z',
  timezone: 'America/Chicago',
  venue: 'Synthetic venue',
};
const cart: MarketCart = {
  id: '5',
  kind: 'MARKET_OCCURRENCE',
  occurrence,
  state: 'AddingItems',
  currencyCode: 'USD',
  totalQuantity: 2,
  subTotalWithTax: 2000,
  totalWithTax: 1800,
  shippingWithTax: 0,
  couponCodes: ['A'],
  discounts: [{ description: 'A', amountWithTax: -200 }],
  taxSummary: [],
  groups: [
    {
      vendorId: '10',
      vendorName: 'Vendor A',
      lines: [
        {
          id: '6',
          variantId: '7',
          name: 'Harvest Standard',
          productName: 'Harvest',
          quantity: 1,
          unitPriceWithTax: 1000,
          discountedLinePriceWithTax: 900,
          featuredAsset: null,
        },
      ],
    },
    {
      vendorId: '20',
      vendorName: 'Vendor B',
      lines: [
        {
          id: '8',
          variantId: '9',
          name: 'Orchard Standard',
          productName: 'Orchard',
          quantity: 1,
          unitPriceWithTax: 1000,
          discountedLinePriceWithTax: 900,
          featuredAsset: null,
        },
      ],
    },
  ],
};
const wire = (data: unknown) =>
  new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  });
describe('Market public contract boundaries', () => {
  it('bounds pages and filters and passes sorting to the backend', () => {
    expect(
      marketCatalogInputs(
        new URLSearchParams(
          'page=2&sort=PRICE_DESC&vendor=10&vendor=10&vendor=x&facet=2',
        ),
      ),
    ).toEqual({
      page: 2,
      options: {
        skip: 12,
        take: 12,
        sort: 'PRICE_DESC',
        vendorIds: ['10'],
        facetValueIds: ['2'],
      },
    });
    expect(
      marketCatalogInputs(new URLSearchParams('page=Infinity&sort=unsafe'))
        .page,
    ).toBe(1);
  });
  it('exact item lookup uses the occurrence predicate with bounded native paging', async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        wire({ marketOccurrenceCatalog: { items: [{ variantId: '7' }] } }),
    );
    const api = createMarketStorefrontApi({
      endpoint: 'http://127.0.0.1/shop-api',
      channelToken: 'approved-a',
      marketId: '1',
      fetch: fetcher,
    });
    await api.item('2', '7');
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(request.variables).toEqual({
      occurrenceId: '2',
      options: { variantIds: ['7'], skip: 0, take: 1 },
    });
    expect(request.query).toContain('marketOccurrenceCatalog');
    expect(request.query).not.toMatch(/\bproducts\(/);
  });
  it('nonempty occurrence mismatch prevents selection and mutation', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(wire({ me: { id: '1' } }))
      .mockResolvedValueOnce(wire({ marketActiveCart: cart }));
    const api = createMarketStorefrontApi({
      endpoint: 'http://127.0.0.1/shop-api',
      channelToken: 'approved-a',
      marketId: '1',
      fetch: fetcher,
    });
    await expect(api.add('2', '7', 1)).rejects.toMatchObject({
      kind: 'conflict',
      code: 'NONEMPTY_CONTEXT_SWITCH_DENIED',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('empty cart selection validates returned Market authority', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(wire({ me: { id: '1' } }))
      .mockResolvedValueOnce(wire({ marketActiveCart: null }))
      .mockResolvedValueOnce(
        wire({
          selectCommerceContext: {
            kind: 'MARKET_OCCURRENCE',
            marketId: 'FOREIGN',
            occurrenceId: '2',
          },
        }),
      );
    const api = createMarketStorefrontApi({
      endpoint: 'http://127.0.0.1/shop-api',
      channelToken: 'approved-a',
      marketId: '1',
      fetch: fetcher,
    });
    await expect(api.select('2')).rejects.toMatchObject({ kind: 'forbidden' });
  });
  it('public storefront source contains no placement/payment/pickup workflow', () => {
    const files = [
      'packages/api/src/market-storefront.ts',
      'apps/storefront/src/components/MarketCart.tsx',
      'apps/storefront/src/components/MarketPurchase.tsx',
      'apps/storefront/src/pages/api/shop.ts',
    ];
    for (const file of files)
      expect(readFileSync(file, 'utf8')).not.toMatch(
        /beginLocalCheckout|finalizeLocalCheckout|beginProviderCheckout|selectOwnedPickup|customerOrderTopology|createAdminApi|ownMarket|ownVendor/,
      );
  });
});
describe('Market cart controls', () => {
  it('renders authoritative Vendor groups and total independently of current catalog', () => {
    render(
      <MarketCartView
        storefrontId="1"
        marketName="Market A"
        initialCart={cart}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Vendor A' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Vendor B' })).toBeVisible();
    expect(screen.getByText('$18.00')).toBeVisible();
    expect(screen.getByText('A', { selector: 'li' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /checkout/i })).toBeNull();
  });
  it('explains occurrence mismatch and leaves the cart intact', () => {
    render(
      <MarketPurchase
        storefrontId="1"
        occurrenceId="2"
        signedIn
        initialCart={cart}
        variantId="7"
      />,
    );
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
    expect(
      screen.getByText(/Remove the current items before switching/),
    ).toBeVisible();
    expect(cartMessage({ code: 'NONEMPTY_CONTEXT_SWITCH_DENIED' })).toContain(
      'Remove the current items',
    );
  });
  it('locks repeated add submissions and waits for the authoritative result', async () => {
    let complete!: (response: Response) => void;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const { container } = render(
      <MarketPurchase
        storefrontId="1"
        occurrenceId="1"
        signedIn
        initialCart={null}
        variantId="7"
      />,
    );
    fireEvent.submit(container.querySelector('form')!);
    fireEvent.submit(container.querySelector('form')!);
    expect(fetcher).toHaveBeenCalledTimes(1);
    complete(new Response(JSON.stringify({ result: { cart } })));
    await waitFor(() =>
      expect(screen.getByText('Added to your cart.')).toBeVisible(),
    );
  });
});
