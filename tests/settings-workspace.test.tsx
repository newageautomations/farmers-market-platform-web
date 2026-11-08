import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  canonicalSettingsPath,
  routeAllowed,
  settingsHref,
  settingsView,
  settingsViews,
  visibleNavigation,
  type AdminContext,
} from '@market/admin-core';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { AdminShell } from '../apps/admin/src/AdminShell';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { createFixtureMarketService } from '../apps/admin/src/market/fixture';

const vendor = (
  permissions: string[],
  membershipRole: 'owner' | 'staff' = 'owner',
) =>
  ({
    ...fixtureContexts.VENDOR,
    membershipRole,
    permissions: ['ReadOwnVendorIdentity', ...permissions],
  }) as unknown as AdminContext;

describe('Settings route model', () => {
  it('maps former Integrations routes to their Settings tabs', () => {
    expect(canonicalSettingsPath('/vendor/integrations')).toBe(
      '/vendor/settings',
    );
    expect(canonicalSettingsPath('/vendor/integrations/payments')).toBe(
      '/vendor/settings/payments',
    );
    expect(canonicalSettingsPath('/vendor/integrations/pos')).toBe(
      '/vendor/settings/pos',
    );
    expect(canonicalSettingsPath('/platform/integrations')).toBe(
      '/platform/settings/integrations',
    );
    expect(canonicalSettingsPath('/vendor/settings/taxes')).toBe(
      '/vendor/settings/taxes',
    );
  });

  it('names each tab by one route, with the first tab at the bare base', () => {
    for (const scope of ['VENDOR', 'MARKET', 'PLATFORM'] as const)
      for (const view of settingsViews[scope])
        expect(settingsView(scope, settingsHref(scope, view))).toBe(view);
    expect(settingsHref('VENDOR', 'preferences')).toBe('/vendor/settings');
    expect(settingsHref('MARKET', 'market')).toBe('/market/settings');
    expect(settingsHref('MARKET', 'preferences')).toBe(
      '/market/settings/preferences',
    );
    // The default tab has no second address, and OAuth returns are not tabs.
    expect(settingsView('VENDOR', '/vendor/settings/preferences')).toBe(
      undefined,
    );
    expect(settingsView('VENDOR', '/vendor/settings/clover-return')).toBe(
      undefined,
    );
    expect(settingsView('MARKET', '/market/settings/taxes')).toBe(undefined);
  });

  it('removes the Integrations sidebar entries', () => {
    const items = visibleNavigation(
      vendor(['ReadOwnPaymentAccount', 'ReadOwnPosIntegrations']),
    ).map((item) => item.path);
    expect(items).toContain('/vendor/settings');
    expect(items.some((path) => path.startsWith('/vendor/integrations'))).toBe(
      false,
    );
    expect(
      visibleNavigation(fixtureContexts.PLATFORM).map((item) => item.path),
    ).not.toContain('/platform/integrations');
  });

  it('gates each vendor tab by its own grant', () => {
    const owner = vendor([
      'ManageOwnCatalog',
      'ReadOwnPaymentAccount',
      'ReadOwnPosIntegrations',
      'ManageOwnPosIntegrations',
    ]);
    for (const view of settingsViews.VENDOR)
      expect(routeAllowed(owner, settingsHref('VENDOR', view))).toBe(true);
    const basic = vendor([]);
    expect(routeAllowed(basic, '/vendor/settings')).toBe(true);
    expect(routeAllowed(basic, '/vendor/settings/notifications')).toBe(true);
    expect(routeAllowed(basic, '/vendor/settings/taxes')).toBe(false);
    expect(routeAllowed(basic, '/vendor/settings/payments')).toBe(false);
    expect(routeAllowed(basic, '/vendor/settings/pos')).toBe(false);
    // Stripe reads open Payments for staff; Square/Clover need an owner.
    expect(
      routeAllowed(
        vendor(['ReadOwnPaymentAccount'], 'staff'),
        '/vendor/settings/payments',
      ),
    ).toBe(true);
    expect(
      routeAllowed(
        vendor(['ManageOwnPosIntegrations'], 'staff'),
        '/vendor/settings/payments',
      ),
    ).toBe(false);
    expect(
      routeAllowed(
        vendor(['ManageOwnPosIntegrations']),
        '/vendor/settings/clover-return',
      ),
    ).toBe(true);
    expect(
      routeAllowed(
        { ...owner, permissions: [] } as AdminContext,
        '/vendor/settings',
      ),
    ).toBe(false);
  });

  it('gates market and platform tabs', () => {
    const market = fixtureContexts.MARKET;
    expect(routeAllowed(market, '/market/settings')).toBe(true);
    expect(routeAllowed(market, '/market/settings/preferences')).toBe(true);
    expect(routeAllowed(market, '/market/settings/notifications')).toBe(true);
    expect(routeAllowed(market, '/market/settings/payments')).toBe(false);
    expect(
      routeAllowed(fixtureContexts.PLATFORM, '/platform/settings/integrations'),
    ).toBe(true);
    expect(
      routeAllowed(
        { ...fixtureContexts.PLATFORM, permissions: [] },
        '/platform/settings/integrations',
      ),
    ).toBe(false);
  });
});

describe('Settings workspace', () => {
  it('redirects a former Integrations route and shows the vendor tabs', async () => {
    const context = vendor(['ManageOwnCatalog', 'ManageOwnPosIntegrations']);
    window.history.replaceState(null, '', '/vendor/integrations?keep=1');
    render(
      <AdminShell
        context={context}
        vendorService={createFixtureVendorService(context)}
        onLogout={() => {}}
      />,
    );
    expect(window.location.pathname + window.location.search).toBe(
      '/vendor/settings?keep=1',
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Settings' });
    const links = within(menu).getAllByRole('link');
    // The fixture supplies no notification, POS or management services, so
    // those tabs stay hidden even though Payments is route-authorized.
    expect(links.map((link) => link.textContent)).toEqual([
      'Preferences',
      'Taxes',
    ]);
    expect(
      within(menu).getByRole('link', { name: 'Preferences' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Dashboard colors' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Account time zone' }),
    ).toBeInTheDocument();
    // One page heading: the shell's generic header is not rendered.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    await userEvent.click(within(menu).getByRole('link', { name: 'Taxes' }));
    expect(window.location.pathname).toBe('/vendor/settings/taxes');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Sales tax rates' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });

  it('opens the Market configuration tab by default for market managers', async () => {
    const context = fixtureContexts.MARKET;
    window.history.replaceState(null, '', '/market/settings');
    render(
      <AdminShell
        context={context}
        marketService={createFixtureMarketService(context)}
        onLogout={() => {}}
      />,
    );
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Market configuration',
      }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('Market name')).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Settings' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Market', 'Preferences']);
    await userEvent.click(
      within(menu).getByRole('link', { name: 'Preferences' }),
    );
    expect(window.location.pathname).toBe('/market/settings/preferences');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 2, name: 'Dashboard colors' }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText('Market name')).toBeNull();
    window.history.replaceState(null, '', '/');
  });

  it('redirects platform Integrations into Settings', async () => {
    window.history.replaceState(null, '', '/platform/integrations');
    render(
      <AdminShell context={fixtureContexts.PLATFORM} onLogout={() => {}} />,
    );
    expect(window.location.pathname).toBe('/platform/settings/integrations');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });
});
