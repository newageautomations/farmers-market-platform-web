import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { AdminApp } from '../apps/admin/src/AdminApp';
import * as accountLogin from '../apps/admin/src/account-login';
import { authorizeUnifiedAccount } from '../apps/storefront/src/lib/account';
import { POST as shopPost } from '../apps/storefront/src/pages/api/shop';
import { MarketVendors } from '../apps/admin/src/market/vendors';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import { PhoneInput } from '@market/ui';
import { vendorOrderStatus } from '../apps/admin/src/vendor/order-presentation';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const wire = (data: unknown, cookie?: string) =>
  new Response(JSON.stringify({ data }), {
    headers: cookie ? { 'Set-Cookie': cookie } : {},
  });
const accountEnvironment = () => {
  vi.stubEnv('SHOP_API_URL', 'http://localhost:3000/shop-api');
  vi.stubEnv('PLATFORM_ACCOUNT_ORIGIN', 'http://auth.platform.localhost:4321');
  vi.stubEnv(
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
    'synthetic-test-key-only'.repeat(3),
  );
  vi.stubEnv('ADMIN_ORIGIN', 'http://localhost:4322');
};
const correlation = 'a'.repeat(43);
describe('central platform sign-in routing', () => {
  it('automatically uses the existing handoff for an explicit customer workspace selection', async () => {
    window.history.replaceState(null, '', '/vendor?channel=9&account=1');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(wire({ me: null }));
    const redirect = vi
      .spyOn(accountLogin, 'platformAccountLogin')
      .mockImplementation(() => {});
    render(
      <AdminApp
        endpoint="http://localhost/admin-api"
        accountOrigin="http://auth.platform.localhost:4321"
      />,
    );
    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith(
        'http://auth.platform.localhost:4321',
      ),
    );
    expect(window.location.pathname + window.location.search).toBe(
      '/vendor?channel=9',
    );
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });
  it('uses the central login from the primary platform action and existing inline routes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(wire({ me: null }));
    const redirect = vi
      .spyOn(accountLogin, 'platformAccountLogin')
      .mockImplementation(() => {});
    render(
      <AdminApp
        endpoint="http://localhost/admin-api"
        accountOrigin="http://auth.platform.localhost:4321"
      />,
    );
    await screen.findByRole('button', { name: 'Sign in' });
    expect(screen.queryByText('Use my platform account')).toBeNull();
    expect(
      screen.queryByRole('link', { name: /Administrator sign.in/i }),
    ).toBeNull();
    expect(screen.getByRole('link', { name: 'Sign up here' })).toHaveAttribute(
      'href',
      'http://auth.platform.localhost:4321/account/signup',
    );
    expect(
      screen.getByRole('link', { name: 'Forgot your password?' }),
    ).toHaveAttribute(
      'href',
      'http://auth.platform.localhost:4321/account/recover',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(redirect).toHaveBeenCalledWith(
      'http://auth.platform.localhost:4321',
    );
  });
  it('keeps native administrator credentials on the same root page without identity probing', async () => {
    window.history.replaceState(null, '', '/?native=1');
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(wire({ me: null }));
    const redirect = vi
      .spyOn(accountLogin, 'platformAccountLogin')
      .mockImplementation(() => {});
    render(
      <AdminApp
        endpoint="http://localhost/admin-api"
        accountOrigin="http://auth.platform.localhost:4321"
      />,
    );
    const method = await screen.findByLabelText('Sign in with');
    expect(window.location.search).toBe('');
    expect(screen.queryByLabelText('Password')).toBeNull();
    fireEvent.change(method, { target: { value: 'username' } });
    fireEvent.change(screen.getByLabelText('Administrator username'), {
      target: { value: 'existing-admin' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'test-password' },
    });
    fetcher.mockResolvedValue(
      wire({ login: { __typename: 'InvalidCredentialsError' } }),
    );
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);
    await screen.findByRole('alert');
    expect(redirect).not.toHaveBeenCalled();
    expect(fetcher.mock.calls).toHaveLength(2);
    expect(
      JSON.parse(String(fetcher.mock.calls[1]![1]?.body)).variables.username,
    ).toBe('existing-admin');
  });
  it('keeps a validated customer in their personal account when Admin handoff is denied', async () => {
    accountEnvironment();
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE' }),
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            profile: { phoneVerified: true },
            contexts: { affiliations: [] },
          }),
        ),
      );
    expect(
      await authorizeUnifiedAccount(
        'valid-central-capability',
        'http://localhost:4322',
        correlation,
      ),
    ).toEqual({ central: 'valid-central-capability', callback: '/account' });
    expect(
      fetcher.mock.calls.map(
        ([, init]) => JSON.parse(String(init?.body)).action,
      ),
    ).toEqual(['unifiedAuthorize', 'centralProfile']);
  });
  it('retains the existing workspace handoff for authorized multi-role accounts', async () => {
    accountEnvironment();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          central: 'rotated',
          callback: 'http://localhost:4322/auth/account?code=existing',
        }),
      ),
    );
    expect(
      await authorizeUnifiedAccount(
        'original',
        'http://localhost:4322',
        correlation,
      ),
    ).toEqual({
      central: 'rotated',
      callback: 'http://localhost:4322/auth/account?code=existing',
    });
  });
  it.each([false, 'expired'])(
    'does not bypass phone proof or an invalid central session: %s',
    async (phone) => {
      accountEnvironment();
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ code: 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE' }),
            { status: 400 },
          ),
        )
        .mockResolvedValueOnce(
          phone === 'expired'
            ? new Response(
                JSON.stringify({ code: 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE' }),
                { status: 400 },
              )
            : new Response(
                JSON.stringify({ profile: { phoneVerified: phone } }),
              ),
        );
      await expect(
        authorizeUnifiedAccount(
          'invalid-or-restricted',
          'http://localhost:4322',
          correlation,
        ),
      ).rejects.toThrow();
    },
  );
  it('does not redirect a denied merchant handoff or an unavailable backend into a success path', async () => {
    accountEnvironment();
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ code: 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE' }),
          { status: 400 },
        ),
      );
    await expect(
      authorizeUnifiedAccount(
        'central',
        'http://merchant.localhost:4321',
        correlation,
      ),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValue(
      new Response(JSON.stringify({ code: 'ACCOUNT_UNAVAILABLE' }), {
        status: 503,
      }),
    );
    await expect(
      authorizeUnifiedAccount('central', 'http://localhost:4322', correlation),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('vendor order status presentation uses distinct domain meanings', () => {
  it('preserves paid, partial, refund and fulfillment distinctions', () => {
    expect(vendorOrderStatus('order', 'PaymentSettled')).toEqual({
      tone: 'success',
      label: 'Payment Settled',
    });
    expect(vendorOrderStatus('pickup', 'PARTIAL')).toEqual({
      tone: 'warning',
      label: 'Partial',
    });
    expect(vendorOrderStatus('pickup', 'COLLECTED').tone).toBe('success');
    expect(vendorOrderStatus('payment', 'REFUND_REQUIRED').tone).toBe('danger');
    expect(vendorOrderStatus('payment', 'PARTIALLY_REFUNDED').tone).toBe(
      'warning',
    );
    expect(vendorOrderStatus('fulfillment', 'Shipped').tone).toBe('info');
  });
  it('never borrows another domain or treats unknown states as success', () => {
    for (const status of [
      'Delivered',
      'APPROVED',
      'FutureState',
      'toString',
      '__proto__',
    ]) {
      expect(vendorOrderStatus('payment', status).tone).toBe('neutral');
    }
  });
});

describe('guest carts through the existing Shop BFF', () => {
  it('forwards anonymous session cookies, retains independent scopes and supports edit/read/remove without login', async () => {
    const carts = new Map<
      string,
      { id: string; totalQuantity: number; occurrence?: { id: string } }
    >();
    const seen: Array<{ channel: string; query: string; cookie: string }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const h = new Headers(init?.headers),
        channel = h.get('vendure-token')!;
      const { query, variables } = JSON.parse(String(init?.body));
      seen.push({ channel, query, cookie: h.get('cookie') ?? '' });
      const sessionCookie = `shop-session=${channel}-guest; Path=/; HttpOnly; SameSite=Lax`;
      if (query.includes('selectCommerceContext')) {
        carts.set(channel, {
          id: channel,
          totalQuantity: carts.get(channel)?.totalQuantity ?? 0,
          ...(variables.occurrenceId
            ? { occurrence: { id: variables.occurrenceId } }
            : {}),
        });
        return wire(
          {
            selectCommerceContext:
              channel === 'vendor-channel'
                ? {
                    kind: 'DIRECT_VENDOR',
                    vendorId: '10',
                    marketId: null,
                    occurrenceId: null,
                  }
                : {
                    kind: 'MARKET_OCCURRENCE',
                    marketId: '20',
                    occurrenceId: variables.occurrenceId,
                  },
          },
          sessionCookie,
        );
      }
      if (
        query.includes('addItemToOrder') ||
        query.includes('adjustOrderLine')
      ) {
        expect(h.get('cookie')).toContain(`${channel}-guest`);
        carts.get(channel)!.totalQuantity = variables.quantity;
        return wire({
          [query.includes('addItemToOrder')
            ? 'addItemToOrder'
            : 'adjustOrderLine']: { __typename: 'Order' },
        });
      }
      if (query.includes('removeOrderLine')) {
        expect(h.get('cookie')).toContain(`${channel}-guest`);
        carts.get(channel)!.totalQuantity = 0;
        return wire({ removeOrderLine: { __typename: 'Order' } });
      }
      if (query.includes('marketActiveCart'))
        return wire({ marketActiveCart: carts.get(channel) ?? null });
      if (query.includes('activeOrder'))
        return wire({ activeOrder: carts.get(channel) ?? null });
      if (query.includes('me'))
        return new Response(
          JSON.stringify({ errors: [{ extensions: { code: 'FORBIDDEN' } }] }),
        );
      throw new Error('Unexpected Shop request');
    });
    async function call(
      kind: 'VENDOR' | 'MARKET',
      action: string,
      data: Record<string, unknown> = {},
      cookie = '',
    ) {
      const origin =
        kind === 'VENDOR'
          ? 'http://vendor.localhost:4321'
          : 'http://market.localhost:4321';
      const storefrontId = kind === 'VENDOR' ? '1' : '2';
      const context = {
        url: new URL('/api/shop', origin),
        request: new Request(new URL('/api/shop', origin), {
          method: 'POST',
          headers: { origin, 'Content-Type': 'application/json', cookie },
          body: JSON.stringify({ storefrontId, action, ...data }),
        }),
        locals: {
          shopApiUrl: 'http://localhost:3000/shop-api',
          storefront: {
            source: 'backend',
            kind,
            storefrontId,
            canonicalOrigin: origin,
            subjectId: kind === 'VENDOR' ? '10' : '20',
            channelToken:
              kind === 'VENDOR' ? 'vendor-channel' : 'market-channel',
          },
        },
      } as Parameters<typeof shopPost>[0];
      const response = await shopPost(context);
      expect(response.status).toBe(200);
      return { response, ...(await response.json()) };
    }
    const direct = await call('VENDOR', 'add', {
      variantId: '11',
      quantity: 2,
    });
    const vendorCookie = direct.response.headers
      .get('set-cookie')!
      .split(';')[0];
    const market = await call('MARKET', 'add', {
      occurrenceId: '21',
      variantId: '22',
      quantity: 3,
    });
    const marketCookie = market.response.headers
      .get('set-cookie')!
      .split(';')[0];
    expect(direct.result.cart.totalQuantity).toBe(2);
    expect(market.result.cart.occurrence.id).toBe('21');
    expect(vendorCookie).not.toBe(marketCookie);
    expect(
      (await call('VENDOR', 'cart', {}, vendorCookie)).result,
    ).toMatchObject({ signedIn: false, cart: { totalQuantity: 2 } });
    expect(
      (await call('MARKET', 'cart', {}, marketCookie)).result,
    ).toMatchObject({ signedIn: false, cart: { totalQuantity: 3 } });
    expect(
      (
        await call(
          'VENDOR',
          'adjust',
          { lineId: '1', quantity: 4 },
          vendorCookie,
        )
      ).result.cart.totalQuantity,
    ).toBe(4);
    expect(
      (
        await call(
          'MARKET',
          'adjust',
          { lineId: '2', quantity: 5 },
          marketCookie,
        )
      ).result.cart.totalQuantity,
    ).toBe(5);
    await call('VENDOR', 'remove', { lineId: '1' }, vendorCookie);
    expect(
      (await call('MARKET', 'cart', {}, marketCookie)).result.cart
        .totalQuantity,
    ).toBe(5);
    await call('MARKET', 'remove', { lineId: '2' }, marketCookie);
    expect(seen.some((r) => /authenticate|\blogin\b/.test(r.query))).toBe(
      false,
    );
    expect(
      seen
        .filter((r) => r.cookie)
        .every((r) => r.cookie.includes(`${r.channel}-guest`)),
    ).toBe(true);
  });
});

it('searches the authoritative vendor directory beyond its initial page and submits the actual selected ID', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  service.eligibleVendors = vi.fn(async ({ search }) =>
    search === 'Far away'
      ? {
          items: [
            {
              id: '201',
              name: 'Far away farm',
              slug: 'far-away',
              status: 'active',
            },
          ],
          totalItems: 1,
        }
      : {
          items: [
            {
              id: '1',
              name: 'Initial farm',
              slug: 'initial',
              status: 'active',
            },
          ],
          totalItems: 200,
        },
  ) as typeof service.eligibleVendors;
  service.membershipStatus = vi.fn().mockResolvedValue({ id: 'created' });
  render(<MarketVendors service={service} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add Vendor' }));
  const dialog = screen.getByRole('dialog');
  const picker = within(dialog).getByRole('combobox', {
    name: 'Vendor business',
  });
  fireEvent.change(picker, { target: { value: 'Far away' } });
  fireEvent.click(
    await within(dialog).findByRole('option', { name: 'Far away farm' }),
  );
  expect(service.eligibleVendors).toHaveBeenCalledWith({
    take: 20,
    skip: 0,
    search: 'Far away',
  });
  expect(
    within(dialog).queryByRole('button', { name: 'Search directory' }),
  ).toBeNull();
  expect(
    within(dialog).queryByRole('navigation', { name: 'Eligible Vendor pages' }),
  ).toBeNull();
  expect(
    within(dialog).getByRole('button', { name: 'Close' }).parentElement,
  ).toBe(
    within(dialog).getByRole('button', { name: 'Create relationship' })
      .parentElement,
  );
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Create relationship' }),
  );
  await waitFor(() =>
    expect(service.membershipStatus).toHaveBeenCalledWith(
      service.marketId,
      '201',
      'pending',
    ),
  );
});

it('shows only the phone prefix when closed while keyboard selection retains country identity', () => {
  render(<PhoneInput label="Phone" name="phone" />);
  const picker = screen.getByRole('combobox', {
    name: 'Country calling code for Phone',
  });
  expect(picker).toHaveValue('+1');
  fireEvent.focus(picker);
  fireEvent.change(picker, { target: { value: 'Canada' } });
  expect(screen.getByRole('option', { name: 'Canada +1' })).toBeInTheDocument();
  fireEvent.keyDown(picker, { key: 'Enter' });
  expect(picker).toHaveValue('+1');
  expect(
    document.getElementById(picker.getAttribute('aria-describedby')!)
      ?.textContent,
  ).toBe('Canada +1');
  fireEvent.change(screen.getByLabelText('Phone'), {
    target: { value: '4165550160' },
  });
  expect(document.querySelector('input[name="phone"]')).toHaveValue(
    '+14165550160',
  );
});
