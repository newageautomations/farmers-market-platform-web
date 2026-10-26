import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  shopCategories,
  shopProducts,
  productPreorder,
} from '@market/storefront-core';
import { createStorefrontApi, type PublicCatalog } from '@market/api';
import { ProductPurchase } from '../apps/storefront/src/components/ProductPurchase';
import { FeaturedAdd } from '../apps/storefront/src/components/FeaturedAdd';
import { ShopMarketSelection } from '../apps/storefront/src/components/ShopMarketSelection';
const items: PublicCatalog['items'] = [
  {
    id: '2',
    name: 'Honey',
    slug: 'honey',
    description: '',
    featuredAsset: null,
    facetValues: [
      { id: '10', name: 'Pantry', facet: { id: '1', name: 'Category' } },
    ],
    variants: [
      { id: '22', name: 'Jar', priceWithTax: 500, currencyCode: 'USD' },
    ],
  },
  {
    id: '1',
    name: 'Apples',
    slug: 'apples',
    description: '',
    featuredAsset: null,
    facetValues: [
      { id: '11', name: 'Produce', facet: { id: '1', name: 'Category' } },
      { id: '50', name: 'Organic', facet: { id: '5', name: 'Certification' } },
    ],
    variants: [
      { id: '21', name: 'Bag', priceWithTax: 600, currencyCode: 'USD' },
      { id: '23', name: 'Box', priceWithTax: 1200, currencyCode: 'USD' },
    ],
  },
];
it('uses only actual public category facets and filters/sorts before pagination without availability filtering', () => {
  expect(shopCategories(items)).toEqual([
    { id: '10', name: 'Pantry' },
    { id: '11', name: 'Produce' },
  ]);
  expect(shopProducts(items, '', 'default').map((p) => p.id)).toEqual([
    '1',
    '2',
  ]);
  expect(shopProducts(items, '11', 'name').map((p) => p.name)).toEqual([
    'Apples',
  ]);
  expect(shopProducts(items, 'missing', 'name')).toEqual([]);
});
it('keeps mixed-availability products purchasable through explicit option selection', () => {
  const partial = [
    {
      variantId: '23',
      available: true,
      quantity: 20,
      reason: 'Available at this market',
    },
    {
      variantId: '21',
      available: false,
      quantity: 0,
      reason: 'Sold out for this market',
    },
  ];
  expect(productPreorder(items[1]!.variants, partial)).toMatchObject({
    available: true,
    variantId: undefined,
  });
  expect(productPreorder(items[0]!.variants, [])).toMatchObject({
    available: false,
    reason: 'Availability could not be confirmed',
  });
});
it('requires confirmed availability, selects the exact occurrence, then adds through the native cart', async () => {
  const calls: string[] = [];
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const { query, variables } = JSON.parse(init!.body as string);
    calls.push(query);
    const data = query.includes('VendorPreorderAvailability')
      ? {
          vendorPreorderAvailability: [
            {
              variantId: '22',
              available: true,
              quantity: 20,
              reason: 'Available',
            },
          ],
        }
      : query.includes('VendorPreorderOccurrences')
        ? { vendorPreorderOccurrences: [{ id: '7', marketId: '3' }] }
        : query.includes('MarketSelectContext')
          ? {
              selectCommerceContext: {
                kind: 'MARKET_OCCURRENCE',
                marketId: '3',
                occurrenceId: '7',
              },
            }
          : query.includes('VendorPreorderAdd')
            ? { addVendorPreorderItem: { __typename: 'Order' } }
            : { activeOrder: null };
    if (query.includes('VendorPreorderAdd'))
      expect(variables).toEqual({
        occurrenceId: '7',
        variantId: '22',
        quantity: 1,
      });
    return new Response(JSON.stringify({ data }));
  });
  const api = createStorefrontApi({
    endpoint: 'http://localhost/shop-api',
    channelToken: 'vendor',
    vendorId: '1',
    fetch: fetcher,
  });
  await expect(api.add('22', 1)).rejects.toMatchObject({
    code: 'PREORDER_OCCURRENCE_REQUIRED',
  });
  expect(fetcher).not.toHaveBeenCalled();
  await api.add('22', 1, '7');
  expect(
    calls.findIndex((q) => q.includes('VendorPreorderAvailability')),
  ).toBeLessThan(calls.findIndex((q) => q.includes('VendorPreorderAdd')));
});
it('disables direct detail purchasing when an occurrence or authoritative availability is missing', () => {
  render(
    <ProductPurchase
      storefrontId="1"
      variants={[
        {
          ...items[0]!.variants[0]!,
          sku: 'honey',
          options: [],
          featuredAsset: null,
          assets: [],
        },
      ]}
      signedIn
      fixture={false}
      occurrenceId="7"
      availability={[]}
    />,
  );
  expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  expect(
    screen.getByText('Availability could not be confirmed.'),
  ).toBeInTheDocument();
});
it('includes occurrence in add requests and reports a late inventory rejection without duplicate submission', async () => {
  const fetcher = vi.fn(
    async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          error: { kind: 'validation', code: 'PREORDER_UNAVAILABLE' },
        }),
        { status: 400 },
      ),
  );
  vi.stubGlobal('fetch', fetcher);
  render(<FeaturedAdd storefrontId="1" variantId="22" occurrenceId="7" />);
  fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
  await waitFor(() =>
    expect(screen.getByText(/no longer available/)).toBeInTheDocument(),
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({
    occurrenceId: '7',
    variantId: '22',
    quantity: 1,
  });
  vi.unstubAllGlobals();
});
it('blocks preview mutations and keeps the existing dropdown presentation', async () => {
  document.documentElement.dataset.editorPreview = 'true';
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  render(<FeaturedAdd storefrontId="1" variantId="22" occurrenceId="7" />);
  fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
  await waitFor(() =>
    expect(
      screen.getByText(/unavailable in the current storefront/),
    ).toBeInTheDocument(),
  );
  expect(fetcher).not.toHaveBeenCalled();
  delete document.documentElement.dataset.editorPreview;
  vi.unstubAllGlobals();
});
it('explains a cart compatibility failure without navigating or changing the selected market', async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          error: { kind: 'conflict', code: 'NONEMPTY_CONTEXT_SWITCH_DENIED' },
        }),
        { status: 400 },
      ),
  );
  vi.stubGlobal('fetch', fetcher);
  const o = {
    id: '7',
    marketId: '3',
    marketName: 'Saturday Market',
    scheduleDate: '2026-10-31',
    startsAt: '2026-10-31T14:00:00Z',
    endsAt: '2026-10-31T19:00:00Z',
    timezone: 'America/Chicago',
    venue: 'Park',
  };
  render(
    <ShopMarketSelection
      storefrontId="1"
      selectedId="7"
      occurrences={[o, { ...o, id: '8', marketName: 'Other Market' }]}
    />,
  );
  fireEvent.click(screen.getByText('Change Market'));
  fireEvent.click(screen.getByRole('button', { name: /^Other Market/ }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Remove the current items',
    ),
  );
  vi.unstubAllGlobals();
});
