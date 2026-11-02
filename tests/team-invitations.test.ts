import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { POST } from '../apps/storefront/src/pages/api/account';
import { safeAccountReturn } from '../apps/storefront/src/lib/account';

const origin = 'http://auth.platform.localhost:4321';
const csrf = 'c'.repeat(43),
  raw = 't'.repeat(43);
function context(
  action: string,
  values: Record<string, string> = {},
  cookies: Record<string, string> = {},
  requestOrigin = origin,
) {
  const jar = new Map(
    Object.entries({
      'platform-unified-account': 'session',
      'employee-invitation': raw,
      'employee-invitation-csrf': csrf,
      ...cookies,
    }),
  );
  const form = new URLSearchParams({
    action,
    csrf,
    principal: '15',
    ...values,
  });
  return {
    request: new Request(origin + '/api/account', {
      method: 'POST',
      headers: {
        origin: requestOrigin,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: form,
    }),
    url: new URL(origin + '/api/account'),
    clientAddress: '127.0.0.1',
    locals: {},
    cookies: {
      get: (key: string) =>
        jar.has(key) ? { value: jar.get(key) } : undefined,
      has: (key: string) => jar.has(key),
      set: (key: string, value: string) => jar.set(key, value),
      delete: (key: string) => jar.delete(key),
    },
  } as unknown as APIContext;
}
beforeEach(() => {
  vi.stubEnv('SHOP_API_URL', 'http://localhost:3000/shop-api');
  vi.stubEnv('PLATFORM_ACCOUNT_ORIGIN', origin);
  vi.stubEnv(
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
    'local-invitation-test-bridge-key-32-plus',
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe('central employee invitation acceptance', () => {
  it('uses the protected cookie, binds the displayed principal, and clears the continuation after success', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ membershipId: '12', channelId: '9' })),
      );
    const c = context('acceptEmployeeInvitation', {
      token: 'attacker-controlled-form-token',
    });
    const response = await POST(c);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      '/account/invitation?accepted=1',
    );
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject(
      {
        action: 'acceptEmployeeInvitation',
        token: raw,
        principal: '15',
        central: 'session',
      },
    );
    expect(c.cookies.get('employee-invitation')).toBeUndefined();
    expect(c.cookies.get('employee-invitation-csrf')).toBeUndefined();
  });
  it.each(['', 'incorrect'])(
    'rejects missing or mismatched CSRF proof',
    async (value) => {
      const fetcher = vi.spyOn(globalThis, 'fetch');
      const response = await POST(
        context('acceptEmployeeInvitation', { csrf: value }),
      );
      expect(fetcher).not.toHaveBeenCalled();
      expect(response.headers.get('location')).toBe(
        '/account/invitation?error=1',
      );
    },
  );
  it('rejects cross-origin acceptance before calling the bridge', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const response = await POST(
      context('acceptEmployeeInvitation', {}, {}, 'https://unrelated.invalid'),
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });
  it('retains the invitation on backend denial and never exposes it in the error redirect', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE' }),
        { status: 400 },
      ),
    );
    const c = context('acceptEmployeeInvitation'),
      response = await POST(c);
    expect(c.cookies.get('employee-invitation')?.value).toBe(raw);
    expect(response.headers.get('location')).toBe(
      '/account/invitation?error=1',
    );
    expect(await response.text()).not.toContain(raw);
  });
  it('switches identity through existing global sign-out while retaining the invitation', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}'));
    const c = context('invitationSignOut'),
      response = await POST(c);
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject(
      { action: 'unifiedLogout', everywhere: true },
    );
    expect(c.cookies.get('platform-unified-account')).toBeUndefined();
    expect(c.cookies.get('employee-invitation')?.value).toBe(raw);
    expect(response.headers.get('location')).toContain(
      'returnTo=%2Faccount%2Finvitation',
    );
  });
  it('allows only the fixed clean invitation return path', () => {
    expect(safeAccountReturn('/account/invitation')).toBe(
      '/account/invitation',
    );
    expect(safeAccountReturn('/account/invitation?token=secret')).toBe(
      '/account',
    );
    expect(safeAccountReturn('//evil.invalid/account/invitation')).toBe(
      '/account',
    );
  });
  it('returns password login to the pending invitation ahead of business onboarding', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          central: 'new-session',
          phoneVerificationRequired: false,
        }),
      ),
    );
    const c = context(
      'unifiedLogin',
      {
        email: 'person@test.invalid',
        password: 'Example-password-1!',
        principal: '',
      },
      { 'account-signup-role': 'vendor' },
    );
    const response = await POST(c);
    expect(response.headers.get('location')).toBe('/account/invitation');
    expect(c.cookies.get('account-signup-role')).toBeUndefined();
    expect(c.cookies.get('employee-invitation')?.value).toBe(raw);
  });
  it('retains the invitation through ordinary registration and phone verification', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ challenge: 'phone-challenge-id' })),
      )
      .mockResolvedValueOnce(new Response('{}'));
    const c = context('register', {
      firstName: 'Isabel',
      lastName: 'Chen',
      email: 'isabel@test.invalid',
      phone: '+12105550879',
      password: 'Local-Team-Phase-B-2026!',
      confirmPassword: 'Local-Team-Phase-B-2026!',
    });
    expect((await POST(c)).headers.get('location')).toBe('/account/verify');
    expect(c.cookies.get('employee-invitation')?.value).toBe(raw);
    const verified = context(
      'verifyPhoneRegistration',
      { code: '123456' },
      { 'phone-challenge': 'phone-challenge-id' },
    );
    expect((await POST(verified)).headers.get('location')).toBe(
      '/account/login?verified=1&returnTo=%2Faccount%2Finvitation',
    );
    expect(verified.cookies.get('employee-invitation')?.value).toBe(raw);
    expect(
      fetcher.mock.calls.map(
        (call) => JSON.parse(call[1]!.body as string).action,
      ),
    ).toEqual(['register', 'verifyPhoneRegistration']);
  });
});
