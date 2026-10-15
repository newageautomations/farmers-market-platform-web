import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@market/api';
import { AccountBridgeError } from '../apps/storefront/src/lib/account';
import {
  customerAuthenticationError,
  customerNavigation,
  customerReturn,
  customerSkip,
  eventDate,
  eventTime,
} from '../apps/storefront/src/lib/customer-dashboard';
import { POST } from '../apps/storefront/src/pages/api/customer-follow';
import type { APIContext } from 'astro';

describe('customer dashboard boundaries', () => {
  it('has only customer sections', () => {
    expect(customerNavigation.map((n) => n.href)).toEqual([
      '/account',
      '/account/orders',
      '/account/markets',
      '/account/vendors',
      '/account/settings',
    ]);
  });
  it('keeps pagination bounded and rejects noninteger or negative offsets', () => {
    for (const input of ['-1', '1.5', 'Infinity', '100001', 'oops'])
      expect(customerSkip(input)).toBe(0);
    expect(customerSkip('12')).toBe(12);
  });
  it('allows only local customer follow return paths', () => {
    expect(customerReturn('/account/vendors?search=Vendor+C&skip=12')).toBe(
      '/account/vendors?search=Vendor+C&skip=12',
    );
    for (const input of [
      'https://evil.example',
      '//evil.example',
      '/account/../auth/callback',
      '/account/vendors#x',
      '/account/settings',
      '/account?url=https://evil.example',
    ])
      expect(customerReturn(input)).toBe('/account');
  });
  it('formats an event in its recorded timezone even across the UTC date boundary', () => {
    expect(eventDate('2026-10-18T00:30:00Z', 'America/Chicago')).toBe(
      'Saturday, October 17, 2026',
    );
    expect(
      eventTime(
        '2026-10-18T00:30:00Z',
        '2026-10-18T02:30:00Z',
        'America/Chicago',
      ),
    ).toBe('7:30 PM CDT to 9:30 PM CDT');
  });
  it('distinguishes expired authentication from a backend outage', () => {
    expect(
      customerAuthenticationError(
        new AccountBridgeError('ACCOUNT_LINK_INVALID_OR_UNAVAILABLE', 400),
      ),
    ).toBe(true);
    expect(customerAuthenticationError(new AppError('authentication'))).toBe(
      true,
    );
    expect(
      customerAuthenticationError(
        new AccountBridgeError('ACCOUNT_UNAVAILABLE', 403),
      ),
    ).toBe(true);
    expect(
      customerAuthenticationError(
        new AccountBridgeError('ACCOUNT_UNAVAILABLE', 503),
      ),
    ).toBe(false);
  });
  it('rejects cross-origin follow writes before reading cookies or calling the backend', async () => {
    const get = vi.fn();
    const response = await POST({
      url: new URL('http://market.localhost:4347/api/customer-follow'),
      request: new Request('http://market.localhost:4347/api/customer-follow', {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
        body: 'kind=MARKET&id=1&following=true',
      }),
      cookies: { get },
    } as unknown as APIContext);
    expect(response.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
