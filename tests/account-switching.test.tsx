import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountModeSelect } from '@market/ui';
import { customerApi } from '../apps/storefront/src/lib/customer-dashboard';
import { POST } from '../apps/storefront/src/pages/api/account';
import type { APIContext } from 'astro';

afterEach(() => vi.unstubAllEnvs());
const affiliations = [
  { mode: 'VENDOR', id: 7, name: 'Existing vendor', channelId: '9' },
];
function environment() {
  vi.stubEnv('SHOP_API_URL', 'http://127.0.0.1:3000/shop-api');
  vi.stubEnv('PLATFORM_ACCOUNT_ORIGIN', 'http://auth.platform.localhost:4321');
  vi.stubEnv(
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
    'synthetic-server-only-account-bridge-key',
  );
}
function context(path = '/account'): APIContext {
  const url = new URL(path, 'http://auth.platform.localhost:4321');
  return {
    url,
    cookies: {
      get: vi.fn(() => ({ value: 'central-capability' })),
      set: vi.fn(),
      delete: vi.fn(),
    },
    locals: {},
    response: { headers: new Headers() },
  } as unknown as APIContext;
}

describe('shared account selector', () => {
  it('renders enabled native choices and delegates only a supplied selection', async () => {
    const onSelect = vi.fn();
    render(
      <AccountModeSelect
        value="CUSTOMER"
        choices={[
          { value: 'CUSTOMER', label: 'Customer' },
          { value: 'VENDOR', label: 'Vendor' },
          { value: 'MARKET_MANAGER', label: 'Market Manager' },
        ]}
        onSelect={onSelect}
      />,
    );
    const selector = screen.getByRole('combobox', { name: 'Account mode' });
    expect(selector).toBeEnabled();
    await userEvent.selectOptions(selector, 'VENDOR');
    expect(onSelect).toHaveBeenLastCalledWith('VENDOR');
    await userEvent.selectOptions(selector, 'MARKET_MANAGER');
    expect(onSelect).toHaveBeenLastCalledWith('MARKET_MANAGER');
    expect(
      screen.queryByRole('option', { name: 'Platform' }),
    ).not.toBeInTheDocument();
  });
  it('keeps Customer usable without inventing business or platform authority', () => {
    render(
      <AccountModeSelect
        value="CUSTOMER"
        choices={[{ value: 'CUSTOMER', label: 'Customer' }]}
      />,
    );
    expect(screen.getByRole('combobox')).toBeEnabled();
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });
  it('reads central affiliations server-side without an Admin API or merchant context', async () => {
    environment();
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ contexts: { affiliations } })),
      );
    expect(await customerApi(context()).contexts()).toEqual({ affiliations });
    const [url, request] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe('http://127.0.0.1:3000/customer-account-bridge');
    expect(JSON.parse(String(request?.body))).toEqual({
      action: 'centralProfile',
      central: 'central-capability',
    });
    expect(request?.cache).toBe('no-store');
  });
  it('fails closed when account context access is revoked', async () => {
    environment();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE' }),
        { status: 403 },
      ),
    );
    await expect(customerApi(context()).contexts()).rejects.toThrow();
  });
});

describe('customer authentication transport', () => {
  it('uses the existing central password bridge and only HttpOnly central cookies', async () => {
    environment();
    const ctx = context('/api/account');
    ctx.request = new Request(ctx.url, {
      method: 'POST',
      headers: { origin: ctx.url.origin },
      body: 'action=unifiedLogin&email=customer%40test.invalid&password=Synthetic-only-1!',
    });
    Object.assign(ctx, { clientAddress: '127.0.0.1' });
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          central: 'issued-central',
          phoneVerificationRequired: false,
        }),
      ),
    );
    const response = await POST(ctx);
    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/account');
    expect(ctx.cookies.set).toHaveBeenCalledWith(
      'platform-unified-account',
      'issued-central',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual(
      expect.objectContaining({
        action: 'unifiedLogin',
        email: 'customer@test.invalid',
      }),
    );
    expect(response.headers.get('Location')).not.toContain('issued-central');
  });
  it('rejects foreign-origin authentication posts before invoking the bridge', async () => {
    environment();
    const ctx = context('/api/account');
    ctx.request = new Request(ctx.url, {
      method: 'POST',
      headers: { origin: 'https://foreign.invalid' },
      body: 'action=unifiedLogin',
    });
    const fetcher = vi.spyOn(globalThis, 'fetch');
    expect((await POST(ctx)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
