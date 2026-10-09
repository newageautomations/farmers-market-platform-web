import { describe, it, expect, vi } from 'vitest';
import {
  formatMoney,
  formatDate,
  pageWindow,
  validateEnvironment,
} from '@market/config';
import {
  themeSchema,
  themeVariables,
  adminTheme,
  platformTheme,
} from '@market/theme';
import { resolveFixture } from '@market/storefront-core/fixtures';
import { composition, resolveStorefront, seo } from '@market/storefront-core';
import { AppError, createAdminApi, createShopApi } from '@market/api';
import { transport } from '../packages/api/src/transport';
import { ShopCustomerSessionDocument } from '../packages/api/src/generated/shop';
import { AdminSessionDocument } from '../packages/api/src/generated/admin';

describe('exact display utilities', () => {
  it('formats exact integer minor units, including values beyond Number precision', () => {
    expect(formatMoney('1000', 'USD')).toBe('$10.00');
    expect(formatMoney('900719925474099312345', 'USD')).toBe(
      '$9,007,199,254,740,993,123.45',
    );
    expect(formatMoney(-1n, 'USD')).toBe('-$0.01');
    expect(formatMoney('123', 'JPY')).toBe('¥123');
    expect(formatMoney('1234', 'KWD')).toContain('1.234');
    expect(() => formatMoney(1.2, 'USD')).toThrow();
    expect(() => formatMoney(Number.MAX_SAFE_INTEGER + 1, 'USD')).toThrow();
    expect(() => formatMoney('1.3', 'USD')).toThrow();
  });
  it('formats an explicit timezone and validates pagination', () => {
    expect(formatDate('2026-01-01T00:00:00Z', 'America/Chicago')).toContain(
      'Dec 31, 2025',
    );
    expect(pageWindow()).toEqual({ skip: 0, take: 20 });
    expect(() => pageWindow(0, 101)).toThrow();
  });
});
describe('request and theme isolation', () => {
  it('bounds Admin branding to a logo and accent without altering product typography or surfaces', () => {
    const branded = adminTheme({ logo: '/assets/test.svg', accent: '#244967' });
    expect(branded.primary).toBe('#244967');
    expect(branded.background).toBe(platformTheme.background);
    expect(branded.headingFont).toBe(platformTheme.headingFont);
    expect(() =>
      adminTheme({ logo: 'javascript:alert(1)', accent: '#FFFFFF' }),
    ).toThrow();
  });
  it('selects deterministic kind/template compositions and distinct SEO', () => {
    const market = resolveFixture('market.localhost')!,
      vendor = resolveFixture('vendor.localhost')!;
    expect(market.name).toBe('Bulverde Market Day');
    expect(market.kind).toBe('MARKET');
    expect(composition(market)).toBe('market');
    expect(composition(vendor)).toBe('vendor');
    expect(seo(market).canonical).toBe('http://market.localhost:4321/');
    expect(seo(vendor).canonical).toBe('http://vendor.localhost:4321/');
    expect(seo(vendor).title).not.toContain('Bulverde');
    expect(market.template).not.toBe(vendor.template);
    expect(themeVariables(market.theme)).not.toEqual(
      themeVariables(vendor.theme),
    );
    market.theme.primary = '#000000';
    expect(resolveFixture('market.localhost')!.theme.primary).not.toBe(
      '#000000',
    );
    expect(vendor.theme.logo).not.toBe(market.theme.logo);
    expect(composition({ ...market, template: 'minimal' })).toBe('market');
    expect(() => composition({ ...market, template: 'modern' })).toThrow();
  });
  it('rejects injected CSS, arbitrary font values, extra fields and asset URLs', () => {
    const theme = resolveFixture('market.localhost')!.theme;
    for (const invalid of [
      { ...theme, primary: 'red; background:url(https://evil)' },
      { ...theme, headingFont: 'url(evil)' },
      { ...theme, css: 'body{}' },
      { ...theme, logo: '//evil/logo.svg' },
    ])
      expect(themeSchema.safeParse(invalid).success).toBe(false);
  });
  it('unknown context never falls back and production cannot use fixtures', async () => {
    const backend = { resolve: vi.fn(async () => null) };
    await expect(
      resolveStorefront(
        {
          url: new URL('http://unknown.localhost'),
          fixtureMode: true,
          production: false,
        },
        backend,
        resolveFixture,
      ),
    ).rejects.toMatchObject({ kind: 'not-found' });
    await expect(
      resolveStorefront(
        {
          url: new URL('http://localhost'),
          fixtureMode: true,
          production: true,
        },
        backend,
        resolveFixture,
      ),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(
      resolveStorefront(
        {
          url: new URL('http://localhost'),
          fixtureMode: false,
          production: false,
        },
        backend,
        resolveFixture,
      ),
    ).rejects.toMatchObject({ kind: 'not-found' });
    expect(backend.resolve).toHaveBeenCalledTimes(1);
  });
  it('backend unavailable stays unavailable when fixture mode is disabled', async () => {
    await expect(
      resolveStorefront(
        {
          url: new URL('http://localhost'),
          fixtureMode: false,
          production: false,
        },
        {
          async resolve() {
            throw new AppError('unavailable');
          },
        },
        resolveFixture,
      ),
    ).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(
      resolveStorefront(
        {
          url: new URL('http://localhost'),
          fixtureMode: false,
          production: false,
        },
        {
          async resolve() {
            return {
              ...resolveFixture('localhost')!,
              source: 'backend',
              channelToken: '',
            };
          },
        },
      ),
    ).rejects.toMatchObject({ kind: 'not-found' });
    expect(() => seo(resolveFixture('localhost')!, '//evil.test')).toThrow();
  });
});
describe('environment safety', () => {
  const env = {
    SHOP_API_URL: 'http://localhost:3000/shop-api',
    PUBLIC_ADMIN_API_URL: 'http://localhost:3000/admin-api',
  };
  it('requires valid explicit endpoints', () => {
    expect(() => validateEnvironment({}, 'development')).toThrow();
    expect(() =>
      validateEnvironment(
        { ...env, SHOP_API_URL: 'postgres://x' },
        'production',
      ),
    ).toThrow();
    expect(() =>
      validateEnvironment(
        { ...env, SHOP_API_URL: 'http://user:password@localhost' },
        'development',
      ),
    ).toThrow();
  });
  it('blocks fixtures in production even when NODE_ENV conflicts', () => {
    expect(() =>
      validateEnvironment(
        { ...env, FRONTEND_FIXTURE_MODE: 'true' },
        'production',
      ),
    ).toThrow();
    expect(() =>
      validateEnvironment(
        { ...env, FRONTEND_FIXTURE_MODE: 'true', NODE_ENV: 'production' },
        'development',
      ),
    ).toThrow();
    expect(
      validateEnvironment({ ...env, FRONTEND_FIXTURE_MODE: 'true' }, 'test')
        .fixtureMode,
    ).toBe(true);
  });
});
describe('typed API transport', () => {
  it('keeps generated Shop/Admin operations separated at compile time and runtime', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(JSON.stringify({ data: { me: null } })),
      );
    const admin = transport('admin', {
      endpoint: 'http://localhost/admin-api',
      fetch: fetcher,
    });
    const shop = transport('shop', {
      endpoint: 'http://localhost/shop-api',
      channelToken: 'approved-token',
      fetch: fetcher,
    });
    await admin({ api: 'admin', document: AdminSessionDocument }, {});
    await shop({ api: 'shop', document: ShopCustomerSessionDocument }, {});
    await expect(
      // @ts-expect-error Shop operation cannot execute through Admin transport.
      admin({ api: 'shop', document: ShopCustomerSessionDocument }, {}),
    ).rejects.toMatchObject({ kind: 'validation' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      credentials: 'include',
      headers: { 'vendure-token': 'approved-token' },
    });
  });
  it('requires Shop context before fetch, never guesses Channel from a host', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      createShopApi({
        endpoint: 'http://localhost/shop-api',
        channelToken: '',
        fetch: fetcher,
      }).session(),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    ['UNAUTHORIZED', 'authentication'],
    ['FORBIDDEN', 'forbidden'],
    ['BAD_USER_INPUT', 'validation'],
    ['CONFLICT', 'conflict'],
    ['ENTITLEMENT_DENIED', 'entitlement'],
    ['SHOP_CONTEXT_REQUIRED', 'forbidden'],
    ['SQL_PROVIDER_SECRET', 'graphql'],
  ])('normalizes backend code %s safely', async (code, kind) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [
            { message: 'SQL stack trace with secret', extensions: { code } },
          ],
        }),
      ),
    );
    const api = createAdminApi({
      endpoint: 'http://localhost/admin-api',
      fetch: fetcher,
    });
    await expect(api.session()).rejects.toMatchObject({ kind });
    await expect(api.session()).rejects.not.toThrow('SQL stack');
  });
  it('normalizes network and invalid transport responses without leaking detail', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('secret request payload'));
    await expect(
      createAdminApi({
        endpoint: 'http://localhost/admin-api',
        fetch: fetcher,
      }).session(),
    ).rejects.toMatchObject({ kind: 'network' });
    fetcher.mockResolvedValue(new Response('backend stack', { status: 503 }));
    await expect(
      createAdminApi({
        endpoint: 'http://localhost/admin-api',
        fetch: fetcher,
      }).session(),
    ).rejects.toMatchObject({ kind: 'unavailable' });
  });
});
