import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { AppError, createStorefrontApi, cartMessage } from '@market/api';
import {
  publicStorefrontResolver,
  catalogInputs,
  priceLabel,
  safeAsset,
  plainDescription,
} from '@market/storefront-core';
import {
  fixtureProduct,
  fixtureCatalog,
} from '@market/storefront-core/fixtures';
import { ProductPurchase } from '../apps/storefront/src/components/ProductPurchase';
import { transport } from '../packages/api/src/transport';
import { AdminSessionDocument } from '../packages/api/src/generated/admin';

const dto = (name = 'A', id = '1') => ({
  storefrontId: id,
  storefrontKey: `site-${id}`,
  kind: 'VENDOR',
  displayName: name,
  canonicalHostname: `${name.toLowerCase()}.example`,
  canonicalOrigin: `https://${name.toLowerCase()}.example`,
  subject: { id },
  shopContext: { channelToken: `public-${id}` },
});
describe('authoritative Storefront adapter and paging', () => {
  it('sends only direct Host selector and returns isolated context/default theme per resolution', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(dto())))
      .mockResolvedValueOnce(new Response(JSON.stringify(dto('B', '2'))));
    const api = publicStorefrontResolver(
        'http://127.0.0.1:3000/shop-api',
        fetcher,
      ),
      a = await api.resolve('A.EXAMPLE:80'),
      b = await api.resolve('b.example');
    expect(fetcher.mock.calls[0]![1].headers).toEqual({ Host: 'A.EXAMPLE:80' });
    expect(a?.name).toBe('A');
    expect(b?.canonicalOrigin).toBe('https://b.example');
    expect(a?.storefrontId).not.toBe(b?.storefrontId);
    a!.theme.primary = '#000000';
    expect(b!.theme.primary).not.toBe('#000000');
  });
  it.each([400, 404])(
    'normalizes resolver %i as missing without fallback',
    async (status) => {
      expect(
        await publicStorefrontResolver(
          'http://127.0.0.1:3000',
          vi.fn(async () => new Response('{}', { status })),
        ).resolve('unknown'),
      ).toBeNull();
    },
  );
  it.each([500, 503])(
    'keeps transport %i distinct from unknown Storefront',
    async (status) => {
      await expect(
        publicStorefrontResolver(
          'http://127.0.0.1:3000',
          vi.fn(async () => new Response('{}', { status })),
        ).resolve('unknown'),
      ).rejects.toMatchObject({ kind: 'unavailable' });
    },
  );
  it('rejects malformed DTO or injected canonical origin', async () => {
    for (const value of [
      {},
      { ...dto(), canonicalOrigin: 'https://evil.example' },
    ])
      await expect(
        publicStorefrontResolver(
          'http://127.0.0.1',
          vi.fn(async () => new Response(JSON.stringify(value))),
        ).resolve('a.example'),
      ).rejects.toMatchObject({ kind: 'unavailable' });
  });
  it('bounds native paging and normalizes search/sort', () => {
    expect(
      catalogInputs(new URLSearchParams('page=2&q=Harvest&sort=desc')),
    ).toEqual({ page: 2, skip: 12, take: 12, search: 'Harvest', sort: 'desc' });
    for (const page of ['0', '-1', '1.5', 'Infinity', '10001'])
      expect(() => catalogInputs(new URLSearchParams({ page }))).toThrow();
    expect(
      fixtureCatalog({ skip: 100, take: 12, search: '', sort: 'asc' }).items,
    ).toEqual([]);
  });
  it('uses exact prices and safe assets/descriptions without availability claims', () => {
    expect(priceLabel(fixtureProduct('synthetic-produce-1')!.variants)).toBe(
      '$10.00 to $15.00',
    );
    expect(safeAsset('javascript:alert(1)')).toBeUndefined();
    expect(safeAsset('//evil.example')).toBeUndefined();
    expect(plainDescription('<p>Hello</p><script>x</script>')).toBe('Hello x');
  });
});
describe('Shop cart boundaries and mutations', () => {
  it('checks returned DIRECT_VENDOR subject and refuses foreign context before add', async () => {
    const f = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              selectCommerceContext: {
                kind: 'DIRECT_VENDOR',
                vendorId: '2',
                marketId: null,
                occurrenceId: null,
              },
            },
          }),
        ),
    );
    await expect(
      createStorefrontApi({
        endpoint: 'http://shop.example',
        channelToken: 'a',
        vendorId: '1',
        fetch: f,
      }).add('1', 1),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('requires Shop API tags at runtime and compile time', async () => {
    const execute = transport('shop', {
      endpoint: 'http://shop.example',
      channelToken: 'a',
    });
    await expect(
      // @ts-expect-error Admin operation cannot be sent to a Shop executor.
      execute({ api: 'admin', document: AdminSessionDocument }, {}),
    ).rejects.toBeInstanceOf(AppError);
  });
  it('has no checkout/payment or direct database feature code', () => {
    const source = readFileSync(
      'apps/storefront/src/pages/api/shop.ts',
      'utf8',
    );
    expect(source).not.toMatch(
      /beginProvider|finalizeProvider|shippingMethod|placeOrder|pg|typeorm|admin-api/,
    );
    expect(cartMessage({ code: 'INSUFFICIENT_STOCK_ERROR' })).toContain(
      'quantity',
    );
  });
  it('suppresses duplicate submissions until the server response and then announces success', async () => {
    let complete!: (value: Response) => void;
    const f = vi.fn(
      () =>
        new Promise<Response>((r) => {
          complete = r;
        }),
    );
    vi.stubGlobal('fetch', f);
    render(
      <ProductPurchase
        storefrontId="1"
        variants={fixtureProduct('synthetic-produce-1')!.variants}
        signedIn
        fixture={false}
      />,
    );
    const button = screen.getByRole('button', { name: 'Add to cart' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(f).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    complete(new Response(JSON.stringify({ result: { cart: null } })));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Added to your cart.',
      ),
    );
    vi.unstubAllGlobals();
  });
});
