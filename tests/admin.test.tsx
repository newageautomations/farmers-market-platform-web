import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppError, type Entitlement } from '@market/api';
import { authenticatedSession } from '@market/auth';
import {
  resolveAdminContext,
  visibleNavigation,
  routeAllowed,
  optionalFeature,
} from '@market/admin-core';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { AdminShell } from '../apps/admin/src/AdminShell';
import { AdminApp } from '../apps/admin/src/AdminApp';
import { FeaturePanel } from '../apps/admin/src/FeaturePanel';
import { ErrorState, Tabs } from '@market/ui';
describe('shared Admin scope', () => {
  it('renders different navigation for each scope without duplicating the app', () => {
    expect(
      visibleNavigation(fixtureContexts.MARKET).map((x) => x.label),
    ).toContain('Occurrences');
    expect(
      visibleNavigation(fixtureContexts.MARKET).map((x) => x.label),
    ).not.toContain('Products');
    expect(
      visibleNavigation(fixtureContexts.VENDOR).map((x) => x.label),
    ).toContain('Inventory');
    expect(
      visibleNavigation(fixtureContexts.PLATFORM).map((x) => x.label),
    ).toContain('Tenants');
    const restricted = {
      ...fixtureContexts.VENDOR,
      permissions: ['Authenticated'] as const,
    };
    expect(routeAllowed(restricted, '/products')).toBe(false);
    window.history.replaceState(null, '', '/products');
    render(<AdminShell context={restricted} onLogout={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Access restricted',
    );
    expect(
      screen.queryByRole('link', { name: 'Products' }),
    ).not.toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });
  it('never renders tenant content before auth resolves and handles expired sessions', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ data: { me: null } })));
    render(<AdminApp endpoint="http://localhost/admin-api" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session',
    );
    expect(
      screen.queryByText('Your workspace is ready'),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Sign in' }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    );
    fetcher.mockRestore();
  });
  it('does not treat a role name or channel code as tenant identity', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ message: 'Denied', extensions: { code: 'FORBIDDEN' } }],
        }),
      ),
    );
    const session = authenticatedSession({
      id: '1',
      identifier: 'fixture',
      channels: [
        {
          id: '7',
          code: 'market-slug',
          token: 'test',
          permissions: ['ReadOwnMarket'],
        },
      ],
    });
    await expect(
      resolveAdminContext(session, 'http://localhost/admin-api'),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    expect(String(fetcher.mock.calls[0]?.[1]?.body)).toContain(
      'ownMarketIdentity',
    );
    fetcher.mockRestore();
    expect(authenticatedSession(null)).toEqual({ status: 'anonymous' });
    expect(
      authenticatedSession({ id: '1', identifier: 'fixture', channels: [] })
        .status,
    ).toBe('error');
  });
  it('bootstraps Market scope only from current identity, membership and channel grants', async () => {
    const session = authenticatedSession({
      id: '1',
      identifier: 'fixture',
      channels: [
        {
          id: '7',
          code: 'irrelevant',
          token: 'test',
          permissions: ['ReadOwnMarket'],
        },
      ],
    });
    const identity = {
      id: '22',
      name: 'Current Domain Market',
      slug: 'current-market',
      status: 'suspended',
      version: 2,
      channelId: '7',
      permissions: ['ReadOwnMarket'],
      membership: {
        id: '30',
        marketId: '22',
        principalId: '1',
        role: 'marketAdmin',
        status: 'active',
      },
    };
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { ownMarketIdentity: identity } })),
      );
    expect(
      await resolveAdminContext(session, 'http://localhost/admin-api'),
    ).toMatchObject({
      scope: 'MARKET',
      name: 'Current Domain Market',
      subject: { marketId: '22' },
      source: 'backend',
    });
    fetcher.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { ownMarketIdentity: { ...identity, channelId: '99' } },
        }),
      ),
    );
    await expect(
      resolveAdminContext(session, 'http://localhost/admin-api'),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    fetcher.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            ownMarketIdentity: {
              ...identity,
              membership: { ...identity.membership, status: 'revoked' },
            },
          },
        }),
      ),
    );
    await expect(
      resolveAdminContext(session, 'http://localhost/admin-api'),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    fetcher.mockRestore();
  });
});
describe('optional entitlement presentation', () => {
  const entitlement: Entitlement = {
    featureCode: 'test.analytics',
    allowed: false,
    reason: 'TEST_DENIAL',
    valueKind: null,
    enabled: null,
    unlimited: null,
    remaining: null,
    overLimit: null,
  };
  it('keeps unconfigured and denied optional features distinct', () => {
    expect(optionalFeature(undefined, 'test.analytics')).toBe('unknown');
    render(
      <FeaturePanel
        slot="analytics"
        featureCode="test.analytics"
        entitlements={[entitlement]}
      >
        Feature content
      </FeaturePanel>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Feature unavailable');
    expect(screen.queryByText('Feature content')).not.toBeInTheDocument();
  });
  it('renders an explicitly allowed backend feature', () => {
    render(
      <FeaturePanel
        slot="analytics"
        featureCode="test.analytics"
        entitlements={[{ ...entitlement, allowed: true }]}
      >
        Feature content
      </FeaturePanel>,
    );
    expect(screen.getByText('Feature content')).toBeInTheDocument();
  });
});
describe('safe reusable presentation', () => {
  it.each([
    'network',
    'graphql',
    'authentication',
    'forbidden',
    'validation',
    'conflict',
    'unavailable',
    'not-found',
    'entitlement',
    'unknown',
  ] as const)('renders the %s error safely', (kind) => {
    render(<ErrorState error={new AppError(kind)} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      new AppError(kind).message,
    );
  });
  it('does not render raw exceptions', () => {
    render(<ErrorState error={new Error('SQL password secret')} />);
    expect(screen.queryByText(/SQL/)).not.toBeInTheDocument();
  });
  it('supports arrow-key tab navigation', async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        items={[
          { label: 'First', content: 'One' },
          { label: 'Second', content: 'Two' },
        ]}
      />,
    );
    screen.getByRole('tab', { name: 'First' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Two');
  });
});
