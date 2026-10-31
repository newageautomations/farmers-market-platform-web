import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { safeAdminDestination } from '@market/config';
import {
  safeAccountReturn,
  authorizeUnifiedAccount,
  defaultAccountDestination,
} from '../apps/storefront/src/lib/account';
import { POST } from '../apps/storefront/src/pages/api/account';
import { customerApi } from '../apps/storefront/src/lib/customer-dashboard';
import type { APIContext } from 'astro';
import type { SessionState } from '@market/auth';

const mocks = vi.hoisted(() => ({
  restore: vi.fn(),
  contexts: vi.fn(),
  handoff: vi.fn(),
  entry: vi.fn(),
  complete: vi.fn(),
}));
vi.mock('@market/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@market/auth')>()),
  createAdminSession: () => ({ restore: mocks.restore }),
}));
vi.mock('@market/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@market/api')>()),
  createPlatformAccountApi: () => ({
    contexts: mocks.contexts,
    handoff: mocks.handoff,
  }),
}));
vi.mock('../apps/admin/src/account-login', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../apps/admin/src/account-login')>()),
  platformAccountLogin: mocks.entry,
  completePlatformAccountLogin: mocks.complete,
}));
import { AdminApp } from '../apps/admin/src/AdminApp';
import { selectAuthorizedAccountContext } from '../apps/admin/src/account-login';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  window.history.replaceState(null, '', '/');
});
function env() {
  vi.stubEnv('SHOP_API_URL', 'http://localhost:3000/shop-api');
  vi.stubEnv('PLATFORM_ACCOUNT_ORIGIN', 'http://auth.platform.localhost:4321');
  vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4322');
  vi.stubEnv(
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
    'local-synthetic-bridge-key-32-characters',
  );
}
const profile = (
  affiliations: unknown[] = [],
  platformAdministrator = false,
) => ({
  profile: { phoneVerified: true },
  contexts: { affiliations, platformAdministrator },
});
const session = {
  status: 'authenticated',
  user: {
    id: '1',
    identifier: 'person@test.invalid',
    channels: [
      {
        id: '9',
        code: 'vendor',
        token: 'vendor',
        permissions: ['ReadOwnVendorIdentity'],
      },
    ],
  },
  channel: {
    id: '9',
    code: 'vendor',
    token: 'vendor',
    permissions: ['ReadOwnVendorIdentity'],
  },
} as SessionState;

describe('central authentication destinations', () => {
  it('accepts deep operational routes and rejects open redirects, duplicate channels and encoded separators', () => {
    expect(
      safeAdminDestination('/market/events/3?channel=9&tab=vendors&account=1'),
    ).toBe('/market/events/3?channel=9&tab=vendors');
    expect(safeAdminDestination('/platform/accounts')).toBe(
      '/platform/accounts',
    );
    for (const path of [
      'https://evil.invalid',
      '//evil.invalid',
      '/vendor/../platform',
      '/vendor/%2fplatform',
      '/market?channel=1&channel=2',
      '/vendor\\evil',
      '/vendor#code',
    ])
      expect(safeAdminDestination(path)).toBeNull();
    expect(safeAccountReturn('/account/orders/12')).toBe('/account/orders/12');
    expect(safeAccountReturn('//evil.invalid')).toBe('/account');
  });
  it('selects the Customer dashboard only for a Customer-only account', async () => {
    env();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(profile())),
    );
    expect(await defaultAccountDestination('central')).toBe('/account');
  });
  it('offers a chooser for operational or Platform affiliations', async () => {
    env();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify(profile([{ mode: 'VENDOR', channelId: '9' }])),
        ),
    );
    expect(await defaultAccountDestination('central')).toBe(
      '/account/workspaces',
    );
  });
  it('preserves central authentication when a requested workspace is unavailable', async () => {
    env();
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE' }),
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(profile())));
    expect(
      await authorizeUnifiedAccount(
        'central',
        'http://localhost:4322',
        'c'.repeat(43),
        '/vendor?channel=99',
      ),
    ).toEqual({
      central: 'central',
      callback: '/account/workspaces?unavailable=1',
    });
    expect(
      JSON.parse(String(fetcher.mock.calls[0]![1]?.body)).destination,
    ).toBe('/vendor?channel=99');
  });
  it('does not substitute the first business for an explicit unavailable channel', async () => {
    window.history.replaceState(null, '', '/vendor?channel=99');
    mocks.contexts.mockResolvedValue({
      affiliations: [{ mode: 'VENDOR', channelId: '9' }],
    });
    await expect(
      selectAuthorizedAccountContext(
        'http://localhost:3000/admin-api',
        session,
      ),
    ).rejects.toThrow();
    expect(mocks.restore).not.toHaveBeenCalled();
  });
  it('requires explicit server authority before selecting Platform', async () => {
    window.history.replaceState(null, '', '/platform');
    mocks.contexts.mockResolvedValue({
      platformAdministrator: false,
      affiliations: [],
    });
    await expect(
      selectAuthorizedAccountContext(
        'http://localhost:3000/admin-api',
        session,
      ),
    ).rejects.toThrow();
  });
});
describe('authentication continuation recovery', () => {
  it('preserves a Customer order deep link through the central entry adapter', () => {
    env();
    const url = new URL(
      'http://auth.platform.localhost:4321/account/orders/12',
    );
    const account = customerApi({
      url,
      request: new Request(url),
      cookies: { get: () => undefined },
      locals: {},
    } as unknown as APIContext);
    expect(account.login).toBe(
      '/account/login?returnTo=%2Faccount%2Forders%2F12',
    );
  });
  it('requires a fresh central roundtrip after a failed Admin callback instead of restoring an existing cookie', async () => {
    const real = await vi.importActual<
      typeof import('../apps/admin/src/account-login')
    >('../apps/admin/src/account-login');
    window.history.replaceState(
      null,
      '',
      '/auth/account?code=' +
        'a'.repeat(43) +
        '&returnTo=' +
        encodeURIComponent('/vendor?channel=9&principal=1'),
    );
    document.cookie =
      'platform-admin-correlation=' + 'b'.repeat(43) + '; Path=/auth/account';
    mocks.handoff.mockRejectedValueOnce(new Error('Expired'));
    await expect(
      real.completePlatformAccountLogin('http://localhost:3000/admin-api'),
    ).rejects.toThrow('Expired');
    expect(new URL(window.location.href).searchParams.get('account')).toBe('1');
    expect(new URL(window.location.href).searchParams.get('principal')).toBe(
      '1',
    );
    expect(window.location.search).not.toContain('code=');
  });
  it('rejects a mismatched restored Admin identity before selecting a tenant', async () => {
    window.history.replaceState(null, '', '/vendor?channel=9&principal=2');
    await expect(
      selectAuthorizedAccountContext(
        'http://localhost:3000/admin-api',
        session,
      ),
    ).rejects.toThrow();
  });
});
describe('React central entry ordering', () => {
  it('processes explicit switching before restoring an unrelated or broken Admin session', async () => {
    window.history.replaceState(null, '', '/vendor?channel=9&account=1');
    render(
      <AdminApp
        endpoint="http://localhost:3000/admin-api"
        accountOrigin="http://auth.platform.localhost:4321"
      />,
    );
    await waitFor(() =>
      expect(mocks.entry).toHaveBeenCalledWith(
        'http://auth.platform.localhost:4321',
      ),
    );
    expect(mocks.restore).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
  it('redirects an anonymous protected route without displaying another credential form', async () => {
    window.history.replaceState(null, '', '/market?channel=8');
    mocks.complete.mockResolvedValue(undefined);
    mocks.restore.mockResolvedValue({ status: 'anonymous' });
    render(
      <AdminApp
        endpoint="http://localhost:3000/admin-api"
        accountOrigin="http://auth.platform.localhost:4321"
      />,
    );
    await waitFor(() => expect(mocks.entry).toHaveBeenCalled());
    expect(
      screen.queryByLabelText(/password|username/i),
    ).not.toBeInTheDocument();
  });
});
describe('retired account bridge actions', () => {
  it.each([
    'request',
    'authorize',
    'requestAdministratorPhone',
    'verifyAdministratorPhone',
  ])('rejects obsolete public action %s', async (action) => {
    env();
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const url = new URL('http://auth.platform.localhost:4321/api/account');
    const response = await POST({
      url,
      request: new Request(url, {
        method: 'POST',
        headers: { origin: url.origin },
        body: new URLSearchParams({ action }),
      }),
      clientAddress: '127.0.0.1',
      cookies: { get: () => undefined },
      locals: {},
    } as unknown as APIContext);
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
