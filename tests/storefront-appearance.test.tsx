import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  defaultStorefrontAppearance,
  storefrontAppearanceSchema,
  storefrontPalettes,
  storefrontThemeVariables,
} from '@market/theme/storefront';
import { contrastRatio } from '@market/theme';
import {
  createStorefrontAppearanceApi,
  safeStorefrontUrl,
  type StorefrontAppearanceRecord,
} from '@market/api';
import {
  routeAllowed,
  visibleNavigation,
  type AdminContext,
} from '@market/admin-core';
import {
  StorefrontAppearanceSettings,
  ViewStorefront,
} from '../apps/admin/src/StorefrontAppearance';

const record = (): StorefrontAppearanceRecord => ({
  id: '11',
  name: 'Sample vendor',
  version: 0,
  draft: structuredClone(defaultStorefrontAppearance),
  published: null,
  publishedAt: null,
});
describe('storefront appearance contract', () => {
  it('defaults About off and rejects unknown values, extra fields and unsafe images', () => {
    expect(defaultStorefrontAppearance.about.enabled).toBe(false);
    for (const value of [
      { ...defaultStorefrontAppearance, palette: 'green;display:none' },
      { ...defaultStorefrontAppearance, buttonShape: 'invalid' },
      { ...defaultStorefrontAppearance, buttonHover: 'bounce' },
      { ...defaultStorefrontAppearance, theme: 'other' },
      { ...defaultStorefrontAppearance, accountId: 1 },
      {
        ...defaultStorefrontAppearance,
        homepage: {
          ...defaultStorefrontAppearance.homepage,
          image: 'javascript:alert(1)',
        },
      },
      {
        ...defaultStorefrontAppearance,
        about: { enabled: true, title: '', content: '' },
      },
    ])
      expect(storefrontAppearanceSchema.safeParse(value).success).toBe(false);
    expect(
      storefrontAppearanceSchema.parse({
        ...defaultStorefrontAppearance,
        about: { enabled: false, title: 'Saved', content: 'Keep this' },
      }).about.content,
    ).toBe('Keep this');
  });
  it('keeps every coordinated palette readable and derives shapes through shared tokens', () => {
    for (const [key, palette] of Object.entries(storefrontPalettes)) {
      for (const background of [palette.background, palette.surface]) {
        expect(
          contrastRatio(palette.foreground, background),
        ).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.muted, background)).toBeGreaterThanOrEqual(
          4.5,
        );
        expect(
          contrastRatio(palette.primary, background),
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastRatio('#ffffff', palette.primary)).toBeGreaterThanOrEqual(
        4.5,
      );
      const variables = storefrontThemeVariables({
        ...defaultStorefrontAppearance,
        palette: key as keyof typeof storefrontPalettes,
        buttonShape: 'soft',
      });
      expect(variables['--brand-primary']).toBe(palette.primary);
      expect(variables['--ui-button-radius']).toBe('10px');
    }
  });
  it('restricts appearance routes to the matching business permissions', () => {
    const vendor: AdminContext = {
      scope: 'VENDOR',
      name: 'A',
      source: 'backend',
      membershipRole: 'owner',
      subject: { vendorId: '1' },
      permissions: ['ReadOwnVendorIdentity', 'ManageOwnStorefront'],
    };
    const market: AdminContext = {
      scope: 'MARKET',
      name: 'B',
      source: 'backend',
      marketStatus: 'active',
      subject: { marketId: '2' },
      permissions: ['ReadOwnMarket', 'ManageMarketStorefront'],
    };
    expect(routeAllowed(vendor, '/vendor/storefront')).toBe(true);
    expect(routeAllowed(market, '/market/storefront')).toBe(true);
    expect(
      visibleNavigation(market).some(
        (item) => item.path === '/market/storefront',
      ),
    ).toBe(true);
    expect(routeAllowed(vendor, '/market/storefront')).toBe(false);
    expect(
      routeAllowed(
        { ...vendor, permissions: ['ReadOwnVendorIdentity'] },
        '/vendor/storefront',
      ),
    ).toBe(false);
  });
  it('accepts canonical verified and local origins while refusing unsafe links', () => {
    expect(safeStorefrontUrl('https://farm.example')).toBe(
      'https://farm.example',
    );
    expect(safeStorefrontUrl('http://farm.localhost:4321')).toBe(
      'http://farm.localhost:4321',
    );
    for (const url of [
      'javascript:alert(1)',
      '//farm.example',
      'http://farm.example',
      'https://user:pass@farm.example',
      'https://farm.example/other',
      'https://farm.example?token=x',
    ])
      expect(safeStorefrontUrl(url)).toBeUndefined();
  });
});
describe('draft and publish controls', () => {
  it('previews local changes, saves a draft and requires an explicit publish of its new version', async () => {
    const current = record();
    const api = {
      links: vi.fn(),
      read: vi.fn(async () => [current]),
      save: vi.fn(async (_id, _version, config) => ({
        ...current,
        version: 1,
        draft: config,
      })),
      publish: vi.fn(async () => ({
        ...current,
        version: 2,
        publishedAt: '2026-10-22T12:00:00Z',
        published: { ...current.draft, palette: 'terracotta' as const },
        draft: { ...current.draft, palette: 'terracotta' as const },
      })),
    };
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Theme settings' }),
    );
    const palette = screen.getByLabelText('Color palette');
    fireEvent.change(palette, { target: { value: 'terracotta' } });
    expect(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    ).toBeDisabled();
    expect(api.publish).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText('Storefront appearance preview'),
    ).not.toHaveTextContent('Shop the collection');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        '11',
        0,
        expect.objectContaining({ palette: 'terracotta' }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Publish saved changes' }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    );
    await waitFor(() => expect(api.publish).toHaveBeenCalledWith('11', 1));
    await screen.findByText('Published');
  });
  it('preserves About text when disabling the page', async () => {
    const current = record();
    current.draft.about = {
      enabled: true,
      title: 'Our farm',
      content: 'Keep our story',
    };
    const api = {
      links: vi.fn(),
      read: vi.fn(async () => [current]),
      save: vi.fn(async (_id, _version, config) => ({
        ...current,
        version: 1,
        draft: config,
      })),
      publish: vi.fn(),
    };
    render(<StorefrontAppearanceSettings market api={api} />);
    fireEvent.click(await screen.findByLabelText('Enable the About page'));
    expect(screen.getByLabelText('Page content')).toHaveValue('Keep our story');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        '11',
        0,
        expect.objectContaining({
          about: {
            enabled: false,
            title: 'Our farm',
            content: 'Keep our story',
          },
        }),
      ),
    );
  });
  it('loads URLs with the selected channel and clears links on a context remount', async () => {
    const fetcher = vi.fn(async (_url, init) => {
      const token = (init!.headers as Record<string, string>)['vendure-token'];
      return new Response(
        JSON.stringify({
          data: {
            ownStorefrontLinks: [
              { id: token, name: token, url: `http://${token}.localhost:4321` },
            ],
          },
        }),
      );
    });
    vi.stubGlobal('fetch', fetcher);
    const view = render(
      <ViewStorefront
        key="a"
        connection={{
          endpoint: 'http://localhost:3000/admin-api',
          channelToken: 'a',
        }}
      />,
    );
    expect(
      await screen.findByRole('link', { name: /View Storefront/ }),
    ).toHaveAttribute('href', 'http://a.localhost:4321');
    view.rerender(
      <ViewStorefront
        key="b"
        connection={{
          endpoint: 'http://localhost:3000/admin-api',
          channelToken: 'b',
        }}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    const link = await screen.findByRole('link', { name: /View Storefront/ });
    expect(link).toHaveAttribute('href', 'http://b.localhost:4321');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    vi.unstubAllGlobals();
  });
  it('sends only explicit versioned mutations to the admin endpoint', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({ data: { saveOwnStorefrontAppearance: record() } }),
        ),
    );
    const api = createStorefrontAppearanceApi({
      endpoint: 'http://localhost:3000/admin-api',
      channelToken: 'a',
      fetch: fetcher,
    });
    await api.save('11', 4, defaultStorefrontAppearance);
    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body)).variables).toEqual({
      id: '11',
      version: 4,
      config: defaultStorefrontAppearance,
    });
  });
});
