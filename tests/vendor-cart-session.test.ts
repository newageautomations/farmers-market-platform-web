import { afterEach, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { createStorefrontApi } from '@market/api';
import { requestShop } from '../apps/storefront/src/lib/shop';
import { vendorPreorder } from '../apps/storefront/src/lib/vendor-preorder';
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
const response = (data: unknown) =>
  new Response(JSON.stringify({ data }), {
    headers: { 'content-type': 'application/json' },
  });
afterEach(() => vi.unstubAllGlobals());
it('keeps actual request cookies, channel tokens, orders and market facts isolated across two customer sessions', async () => {
  const requests: { cookie: string | null; channel: string | null }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init: RequestInit) => {
      const headers = new Headers(init.headers);
      const cookie = headers.get('cookie'),
        channel = headers.get('vendure-token');
      requests.push({ cookie, channel });
      const a = cookie === 'session=customer-a';
      const id = a ? '1' : '2',
        occurrenceId = a ? '7' : '8';
      const { query, variables } = JSON.parse(String(init.body));
      if (query.includes('VendorPreorderOccurrences'))
        return response({
          vendorPreorderOccurrences: [occurrence, { ...occurrence, id: '8' }],
        });
      if (query.includes('VendorPreorderAvailability')) {
        expect(variables.occurrenceId).toBe(occurrenceId);
        return response({ vendorPreorderAvailability: [] });
      }
      if (query.includes('ShopCustomerSession'))
        return response({ me: { id } });
      if (query.includes('MarketActiveCartSnapshot'))
        return response({
          marketActiveCart: {
            id,
            occurrence: { ...occurrence, id: occurrenceId },
          },
        });
      return response({
        activeOrder: {
          id,
          lines: [{ id: '10', productVariant: { id: '109' } }],
        },
      });
    }),
  );
  const ctx = (name: string, channel: string) =>
    ({
      request: new Request('http://vendor.localhost/cart', {
        headers: { cookie: `session=customer-${name}` },
      }),
      url: new URL('http://vendor.localhost/cart?occurrence=8'),
      locals: {
        shopApiUrl: 'http://localhost/shop-api',
        storefront: {
          kind: 'VENDOR',
          source: 'backend',
          subjectId: '5',
          storefrontId: '5',
          channelToken: channel,
        },
      },
      cookies: { get: () => undefined, set: vi.fn() },
    }) as unknown as APIContext;
  const first = await vendorPreorder(ctx('a', 'channel-a'), ['109']);
  const second = await vendorPreorder(ctx('b', 'channel-b'), ['109']);
  expect(first.selected?.id).toBe('7');
  expect(second.selected?.id).toBe('8');
  expect(requests.length).toBeGreaterThan(2);
  expect(
    requests.every((r) =>
      r.cookie === 'session=customer-a'
        ? r.channel === 'channel-a'
        : r.channel === 'channel-b',
    ),
  ).toBe(true);
});
it('never forwards a customer session cookie into an editor public read', async () => {
  const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => {
    expect(new Headers(init.headers).get('cookie')).toBeNull();
    return response({ vendorPreorderOccurrences: [] });
  });
  vi.stubGlobal('fetch', fetcher);
  const ctx = {
    request: new Request('http://vendor.localhost', {
      headers: { cookie: 'session=secret' },
    }),
    locals: {
      editorPreview: {},
      shopApiUrl: 'http://localhost/shop-api',
      storefront: {
        source: 'backend',
        kind: 'VENDOR',
        subjectId: '5',
        channelToken: 'vendor',
      },
    },
  } as unknown as APIContext;
  await requestShop(ctx).occurrences();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('preserves protected switching in the real storefront API adapter before any context mutation', async () => {
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const { query } = JSON.parse(String(init?.body));
    if (query.includes('VendorPreorderOccurrences'))
      return response({
        vendorPreorderOccurrences: [occurrence, { ...occurrence, id: '8' }],
      });
    if (query.includes('CartSnapshot') && !query.includes('MarketActive'))
      return response({ activeOrder: { id: '1', lines: [{ id: '10' }] } });
    if (query.includes('MarketActiveCartSnapshot'))
      return response({ marketActiveCart: { id: '1', occurrence } });
    throw new Error('Unexpected context mutation');
  });
  const api = createStorefrontApi({
    endpoint: 'http://localhost/shop-api',
    vendorId: '5',
    channelToken: 'vendor',
    fetch: fetcher,
  });
  await expect(api.select('8')).rejects.toMatchObject({
    code: 'NONEMPTY_CONTEXT_SWITCH_DENIED',
  });
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it.each([
  'INSUFFICIENT_STOCK_ERROR',
  'ORDER_INTERCEPTOR_ERROR',
  'ORDER_MODIFICATION_ERROR',
])(
  'propagates native %s instead of returning an accepted quantity',
  async (errorCode) => {
    const fetcher = vi.fn(async () =>
      response({
        adjustOrderLine: { __typename: 'OrderModificationError', errorCode },
      }),
    );
    const api = createStorefrontApi({
      endpoint: 'http://localhost/shop-api',
      vendorId: '5',
      channelToken: 'vendor',
      fetch: fetcher,
    });
    await expect(api.adjust('10', 3)).rejects.toMatchObject({
      kind: 'validation',
      code: errorCode,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
