import { describe, it, expect, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppError, createVendorApi, type AdminUser } from '@market/api';
import { authenticatedSession } from '@market/auth';
import {
  mayCommand,
  resolveAdminContext,
  routeAllowed,
  visibleNavigation,
} from '@market/admin-core';
import { formatMoney, parsePrice } from '@market/config';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { createLiveVendorService } from '../apps/admin/src/vendor/service';
import {
  CommandForm,
  TextField,
  useRead,
} from '../apps/admin/src/vendor/common';
import { analyticsRange } from '../apps/admin/src/vendor/analytics';
import { Overview } from '../apps/admin/src/vendor/overview';
import { AdminApp } from '../apps/admin/src/AdminApp';

const context = fixtureContexts.VENDOR;
const user: AdminUser = {
  id: '9',
  identifier: 'anonymous-fixture',
  channels: [
    {
      id: '7',
      code: 'irrelevant-code',
      token: 'local-test-token',
      permissions: context.permissions,
    },
  ],
};
const identity = {
  id: '1',
  name: 'Guarded Vendor',
  slug: 'irrelevant-slug',
  status: 'active',
  channelId: '7',
  permissions: context.permissions,
  memberships: [{ id: '8', principalId: '9', role: 'owner', status: 'active' }],
};
const response = (data: unknown) => new Response(JSON.stringify({ data }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('Vendor authority and boundary', () => {
  it('bootstraps identity and membership from a fresh guarded projection', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response({ ownVendorIdentity: identity }));
    const resolved = await resolveAdminContext(
      authenticatedSession(user),
      'http://localhost/admin-api',
    );
    expect(resolved).toMatchObject({
      scope: 'VENDOR',
      subject: { vendorId: '1' },
      name: 'Guarded Vendor',
      membershipRole: 'owner',
    });
    expect(
      JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).query,
    ).toContain('ownVendorIdentity');
    fetcher.mockRestore();
  });
  it.each([
    { ...identity, status: 'suspended' },
    { ...identity, channelId: '99' },
    { ...identity, memberships: [] },
    {
      ...identity,
      memberships: [{ ...identity.memberships[0], status: 'revoked' }],
    },
  ])('rejects inactive or mismatched scope %#', async (value) => {
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response({ ownVendorIdentity: value }));
    await expect(
      resolveAdminContext(
        authenticatedSession(user),
        'http://localhost/admin-api',
      ),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    f.mockRestore();
  });
  it('uses explicit grants and owner membership for commands, including direct routes', () => {
    const operations = {
      ...context,
      permissions: ['ReadOwnVendorIdentity', 'ManageOwnInventory'] as const,
    };
    expect(visibleNavigation(operations).map((n) => n.label)).toEqual([
      'Overview',
      'Inventory',
      'Orders',
      'Markets',
      'Integrations',
      'Settings',
    ]);
    expect(routeAllowed(operations, '/vendor/products/new')).toBe(false);
    expect(routeAllowed(operations, '/vendor/orders/1401')).toBe(true);
    expect(routeAllowed(context, '/vendor/orders/1401/foreign')).toBe(false);
    expect(routeAllowed(context, '/vendor/products-junk')).toBe(false);
    expect(
      mayCommand({ ...context, membershipRole: 'staff' }, 'ManageOwnInventory'),
    ).toBe(false);
    expect(
      routeAllowed(
        { ...context, membershipRole: 'staff' },
        '/vendor/products/new',
      ),
    ).toBe(false);
  });
  it('uses the exact optional boundary state independently of entitlement feature names', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({
        ownFeatureAvailability: {
          boundary: 'analytics.vendor.read',
          state: 'UNCONFIGURED',
          reason: 'GATE_UNBOUND',
          featureCode: null,
        },
      }),
    );
    const service = createLiveVendorService(
      context,
      'http://localhost/admin-api',
      'test',
      () => {},
    );
    expect(await service.availability()).toBe('unconfigured');
    f.mockResolvedValue(
      response({
        ownFeatureAvailability: {
          boundary: 'analytics.vendor.read',
          state: 'UNKNOWN',
          reason: 'UNKNOWN_BOUNDARY',
          featureCode: null,
        },
      }),
    );
    expect(await service.availability()).toBe('unknown');
    f.mockResolvedValue(
      response({
        ownFeatureAvailability: {
          boundary: 'analytics.vendor.read',
          state: 'DENIED',
          reason: 'FEATURE_DISABLED',
          featureCode: 'test.analytics.read',
        },
      }),
    );
    expect(await service.availability()).toBe('denied');
    f.mockResolvedValue(
      response({
        ownFeatureAvailability: {
          boundary: 'analytics.vendor.read',
          state: 'ALLOWED',
          reason: 'FEATURE_ENABLED',
          featureCode: 'test.analytics.read',
        },
      }),
    );
    expect(await service.availability()).toBe('allowed');
    f.mockRestore();
  });
  it('uses named bounded live reads without issuing broad native APIs', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      response({
        ownVendorCatalog: { items: [], totalItems: 0 },
        ownCommercePortions: { items: [], totalItems: 0 },
      }),
    );
    const service = createLiveVendorService(
      context,
      'http://localhost/admin-api',
      'test',
      () => {},
    );
    expect(await service.catalog('', 0)).toEqual({ items: [], totalItems: 0 });
    expect(await service.orders(0, 'all')).toEqual({
      items: [],
      totalItems: 0,
    });
    expect(f).toHaveBeenCalledTimes(2);
    expect(String(f.mock.calls[0]?.[1]?.body)).toContain('ownVendorCatalog');
    expect(String(f.mock.calls[1]?.[1]?.body)).toContain('ownCommercePortions');
    f.mockRestore();
  });
  it('invalidates authority on a backend refusal and sanitizes its message', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [
            {
              message: 'private SQL token',
              extensions: { code: 'FORBIDDEN' },
            },
          ],
        }),
      ),
    );
    const revoked = vi.fn();
    const service = createLiveVendorService(
      context,
      'http://localhost/admin-api',
      'test',
      revoked,
    );
    await expect(service.portion('1401')).rejects.toEqual(
      new AppError('forbidden', 'FORBIDDEN'),
    );
    expect(revoked).toHaveBeenCalledOnce();
    f.mockRestore();
  });
  it('clears the production workspace after refreshed permissions are revoked', async () => {
    let revoked = false;
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_url, init) => {
        const q = JSON.parse(String(init?.body)).query as string;
        if (q.includes('query AdminSession'))
          return response({
            me: revoked
              ? {
                  ...user,
                  channels: [
                    { ...user.channels[0], permissions: ['Authenticated'] },
                  ],
                }
              : user,
          });
        if (q.includes('query VendorIdentity'))
          return response({ ownVendorIdentity: identity });
        if (q.includes('query VendorCustomers'))
          return response({ ownCustomers: { totalItems: 1, items: [] } });
        if (q.includes('query VendorMemberships'))
          return response({ ownMarketBusinessMemberships: [] });
        if (q.includes('query TenantEntitlements'))
          return response({ ownEntitlements: [] });
        return response({});
      });
    window.history.replaceState(null, '', '/');
    render(<AdminApp endpoint="http://localhost/admin-api" />);
    await screen.findByText('Guarded Vendor');
    revoked = true;
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Refresh workspace' }));
    await screen.findByRole('heading', { name: 'Workspace unavailable' });
    expect(screen.queryByText('Guarded Vendor')).not.toBeInTheDocument();
    expect(screen.queryByText('Vendor purchases')).not.toBeInTheDocument();
    f.mockRestore();
  });
});
describe('exact money and UTC ranges', () => {
  it.each([
    ['8.25', 'USD', 825],
    ['12', 'USD', 1200],
    ['12.3', 'USD', 1230],
    ['12.30', 'USD', 1230],
    ['0.01', 'USD', 1],
    ['12', 'JPY', 12],
    ['1.234', 'KWD', 1234],
    ['21474836.47', 'USD', 2147483647],
  ])('parses %s %s exactly', (value, currency, expected) =>
    expect(parsePrice(value, currency)).toBe(expected),
  );
  it.each([
    '',
    '-1',
    '1.234',
    '12.345',
    'abc',
    '1e3',
    'NaN',
    'Infinity',
    '1,000',
    ' 1.25 ',
    '21474836.48',
  ])('rejects unsafe USD input %s', (value) =>
    expect(() => parsePrice(value, 'USD')).toThrow(),
  );
  it('preserves negative and larger than safe integer display', () => {
    expect([0, 1, 99, 100].map((value) => formatMoney(value, 'USD'))).toEqual([
      '$0.00',
      '$0.01',
      '$0.99',
      '$1.00',
    ]);
    expect(formatMoney('90071992547409931', 'USD')).toBe(
      '$900,719,925,474,099.31',
    );
    expect(formatMoney('-1', 'USD')).toBe('-$0.01');
    expect(formatMoney('1234', 'KWD')).toContain('1.234');
    expect(() => formatMoney(9007199254740992, 'USD')).toThrow();
  });
  it('uses bounded exclusive UTC day ranges and rejects invalid calendars', () => {
    expect(analyticsRange('2026-10-01', '2026-10-04')).toMatchObject({
      start: '2026-10-01T00:00:00.000Z',
      end: '2026-10-04T00:00:00.000Z',
      take: 20,
      after: null,
    });
    for (const [start, end] of [
      ['2026-02-30', '2026-03-04'],
      ['2026-10-04', '2026-10-01'],
      ['2024-01-01', '2026-01-01'],
      ['', '2026-10-04'],
    ])
      expect(() => analyticsRange(start!, end!)).toThrow();
  });
});
describe('generated Admin operations', () => {
  it('sends selected channel, cookies, exact generated inputs and no Shop operations', async () => {
    const calls: { query: string; variables: Record<string, unknown> }[] = [];
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.credentials).toBe('include');
      expect(init?.headers).toMatchObject({
        'vendure-token': 'approved-channel',
      });
      const body = JSON.parse(String(init?.body));
      calls.push(body);
      return response({
        createOwnCatalogProduct: { id: '1' },
        restockOwnPhysicalInventory: { id: '2' },
        configureMarketOffering: { id: '3' },
        ownCustomers: { items: [], totalItems: 0 },
        ownVendorAnalyticsTrend: { items: [], nextCursor: null },
      });
    });
    const api = createVendorApi({
      endpoint: 'http://localhost/admin-api',
      channelToken: 'approved-channel',
      fetch: fetcher,
    });
    await api.createProduct({
      name: 'Box',
      slug: 'box',
      enabled: true,
      description: '',
    });
    await api.restock({
      operationKey: 'stable-intent',
      variantId: '101',
      quantity: 5,
    });
    await api.offering({
      participationId: '31',
      listingId: '41',
      variantId: '101',
      expectedVersion: 3,
      enabled: true,
      preorderEnabled: true,
      salesCap: 20,
    });
    await api.customers({ skip: 20, take: 20, search: 'name' });
    await api.trend('1', analyticsRange('2026-10-01', '2026-10-04'));
    expect(
      calls.map((c) => c.query.match(/(?:query|mutation) (\w+)/)?.[1]),
    ).toEqual([
      'VendorCreateProduct',
      'VendorRestock',
      'VendorOffering',
      'VendorCustomers',
      'VendorTrend',
    ]);
    expect(calls[1]?.variables).toEqual({
      input: { operationKey: 'stable-intent', variantId: '101', quantity: 5 },
    });
    expect(calls[2]?.variables).toMatchObject({
      input: { expectedVersion: 3, salesCap: 20 },
    });
    expect(JSON.stringify(calls)).not.toMatch(
      /stockLevel|assign.*Channel|activeOrder/,
    );
  });
});
describe('simulated owned server workflows', () => {
  it('separates stock, fulfillment cancellation and settled refund', async () => {
    const service = createFixtureVendorService(context);
    const before = await service.order('1401');
    expect(before.portion.lines[0]).toMatchObject({
      quantity: 5,
      fulfilledQuantity: 2,
      cancelledQuantity: 1,
    });
    const input = {
      operationKey: 'one',
      orderId: '1401',
      orderLineId: null,
      quantity: null,
      fulfillmentId: '1701',
    };
    await service.cancelFulfillment(input);
    const after = await service.order('1401');
    expect(after.portion.lines[0]).toMatchObject({
      quantity: 5,
      fulfilledQuantity: 0,
      cancelledQuantity: 3,
    });
    expect(after.context?.refunded).toBe(before.context?.refunded);
    await service.cancelFulfillment(input);
    expect(
      (await service.order('1401')).portion.lines[0]?.cancelledQuantity,
    ).toBe(3);
    await expect(
      service.cancelQuantity({
        operationKey: 'two',
        orderId: '2401',
        orderLineId: '2600',
        quantity: 1,
        fulfillmentId: null,
      }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });
  it('uses one idempotent intent and rejects foreign variants', async () => {
    const service = createFixtureVendorService(context, 'denied');
    const input = { operationKey: 'restock', variantId: '1101', quantity: 5 };
    await service.restock(input);
    await service.restock(input);
    const row = (await service.inventory('1')).items[0];
    expect(row).toMatchObject({
      stockOnHand: 55,
      stockAllocated: 7,
      physicalFree: 45,
    });
    await expect(
      service.restock({ ...input, quantity: 6 }),
    ).rejects.toMatchObject({ kind: 'conflict' });
    await expect(
      service.adjust({
        operationKey: 'other',
        variantId: '2101',
        quantity: -1,
      }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });
  it('keeps listing approval and cap changes independent of physical stock', async () => {
    const service = createFixtureVendorService(context),
      before = await service.inventory('1');
    const listing = await service.requestListing('1821', '1102');
    expect(listing.status).toBe('pending');
    await expect(service.publish(listing.id)).rejects.toMatchObject({
      kind: 'forbidden',
    });
    const state = await service.membership('1821'),
      offering = state.offerings[0]!;
    await service.offering({
      participationId: offering.participationId,
      listingId: offering.listingId,
      variantId: offering.variantId,
      expectedVersion: offering.version,
      enabled: true,
      preorderEnabled: false,
      salesCap: null,
    });
    expect(
      (await service.membership('1821')).offerings[0]?.salesCap,
    ).toBeNull();
    expect((await service.inventory('1')).items).toEqual(before.items);
    await expect(service.marketDefault('1821', 0, null)).rejects.toMatchObject({
      kind: 'conflict',
    });
  });
  it('bounds relationship and history pages and rejects another Vendor customer', async () => {
    const service = createFixtureVendorService(context),
      first = await service.customers({ skip: 0, take: 20, search: null }),
      second = await service.customers({ skip: 20, take: 20, search: null });
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(3);
    expect(
      (await service.customers({ skip: 0, take: 20, search: '23' })).items,
    ).toHaveLength(1);
    expect(
      (await service.history('1301', { skip: 20, take: 20, search: null }))
        .items,
    ).toHaveLength(2);
    await expect(
      service.history('2301', { skip: 0, take: 20, search: null }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });
});
describe('read and command lifecycle', () => {
  it('ignores an obsolete authority failure after a Vendor switch', async () => {
    const oldRead = deferred<Response>();
    const multiUser = {
      ...user,
      channels: [
        user.channels[0]!,
        { ...user.channels[0]!, id: '8', code: 'Workspace B', token: 'b' },
      ],
    };
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_url, init) => {
        const query = JSON.parse(String(init?.body)).query as string,
          token = (init?.headers as Record<string, string>)['vendure-token'];
        if (query.includes('query AdminSession'))
          return response({ me: multiUser });
        if (query.includes('query VendorIdentity'))
          return response({
            ownVendorIdentity:
              token === 'b'
                ? {
                    ...identity,
                    id: '2',
                    name: 'Guarded Vendor B',
                    channelId: '8',
                  }
                : identity,
          });
        if (query.includes('query VendorCustomers'))
          return token === 'b'
            ? response({ ownCustomers: { totalItems: 0, items: [] } })
            : oldRead.promise;
        if (query.includes('query VendorMemberships'))
          return response({ ownMarketBusinessMemberships: [] });
        return response({ ownEntitlements: [] });
      });
    window.history.replaceState(null, '', '/');
    render(<AdminApp endpoint="http://localhost/admin-api" />);
    await screen.findByText('Guarded Vendor');
    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText('Workspace'), '8');
    await screen.findByText('Guarded Vendor B');
    await act(async () =>
      oldRead.resolve(
        new Response(
          JSON.stringify({ errors: [{ extensions: { code: 'FORBIDDEN' } }] }),
        ),
      ),
    );
    expect(screen.getByText('Guarded Vendor B')).toBeInTheDocument();
    expect(
      f.mock.calls.filter((call) =>
        JSON.parse(String(call[1]?.body)).query.includes('query AdminSession'),
      ),
    ).toHaveLength(2);
    f.mockRestore();
  });
  it('associates local validation errors and blocks refused mutations until refresh', async () => {
    const run = vi.fn().mockRejectedValue(new AppError('validation')),
      done = vi.fn();
    render(
      <CommandForm
        title="Price"
        run={run}
        onDone={done}
        validate={(data) => {
          parsePrice(String(data.get('price')), 'USD');
        }}
      >
        <TextField name="price" label="Exact price" />
      </CommandForm>,
    );
    await userEvent
      .setup()
      .type(screen.getByLabelText('Exact price'), '12.345');
    const form = screen.getByRole('button', { name: 'Save' }).closest('form')!;
    fireEvent.submit(form);
    expect(run).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Check your request');
    expect(form).toHaveAttribute('aria-describedby');
    await userEvent.setup().clear(screen.getByLabelText('Exact price'));
    await userEvent.setup().type(screen.getByLabelText('Exact price'), '12.30');
    fireEvent.submit(form);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled(),
    );
    fireEvent.submit(form);
    expect(run).toHaveBeenCalledOnce();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Check current records' }));
    expect(done).toHaveBeenCalledOnce();
  });
  it('hides a prior Vendor immediately when the API endpoint changes', async () => {
    const pending = deferred<Response>();
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url, init) => {
        if (String(url).includes('other-admin')) return pending.promise;
        const query = JSON.parse(String(init?.body)).query as string;
        if (query.includes('query AdminSession')) return response({ me: user });
        if (query.includes('query VendorIdentity'))
          return response({ ownVendorIdentity: identity });
        if (query.includes('query VendorCustomers'))
          return response({ ownCustomers: { totalItems: 0, items: [] } });
        if (query.includes('query VendorMemberships'))
          return response({ ownMarketBusinessMemberships: [] });
        return response({ ownEntitlements: [] });
      });
    window.history.replaceState(null, '', '/');
    const { rerender } = render(
      <AdminApp endpoint="http://localhost/admin-api" />,
    );
    await screen.findByText('Guarded Vendor');
    rerender(<AdminApp endpoint="http://localhost/other-admin-api" />);
    expect(screen.queryByText('Guarded Vendor')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session',
    );
    await act(async () => pending.resolve(response({ me: null })));
    await screen.findByRole('heading', { name: 'Sign in' });
    f.mockRestore();
  });
  it('discarded late reads cannot leak into a switched Vendor view', async () => {
    const a = deferred<string>(),
      b = deferred<string>();
    function View({ id, read }: { id: string; read: () => Promise<string> }) {
      const query = useRead(id, read);
      return <p>{query.data ?? 'Loading'}</p>;
    }
    const readA = () => a.promise,
      readB = () => b.promise;
    const { rerender } = render(<View id="A" read={readA} />);
    rerender(<View id="B" read={readB} />);
    await act(async () => {
      b.resolve('Vendor B record');
    });
    expect(screen.getByText('Vendor B record')).toBeInTheDocument();
    await act(async () => {
      a.resolve('Vendor A record');
    });
    expect(screen.queryByText('Vendor A record')).not.toBeInTheDocument();
  });
  it('requires deliberate confirmation and prevents duplicate pending commands', async () => {
    const result = deferred<unknown>(),
      run = vi.fn(() => result.promise),
      done = vi.fn();
    render(
      <CommandForm
        title="Stock adjustment"
        confirm="Reduce stock?"
        run={run}
        onDone={done}
      >
        <TextField name="quantity" label="Quantity" />
      </CommandForm>,
    );
    await userEvent.setup().type(screen.getByLabelText('Quantity'), '-3');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Save' }).closest('form')!,
    );
    expect(run).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm change' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Saving' })[0]!);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]?.length).toBe(2);
    await act(async () => result.resolve({ id: 'receipt' }));
    expect(done).toHaveBeenCalledOnce();
  });
  it('does not retry uncertain command outcomes or invent success', async () => {
    const run = vi.fn().mockRejectedValue(new AppError('network'));
    render(
      <CommandForm title="Restock" run={run} onDone={() => {}}>
        <TextField name="quantity" label="Quantity" />
      </CommandForm>,
    );
    fireEvent.submit(
      screen.getByRole('button', { name: 'Save' }).closest('form')!,
    );
    await screen.findByText(/command outcome is unconfirmed/);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByText(/command confirmed/)).not.toBeInTheDocument();
    expect(run).toHaveBeenCalledOnce();
  });
  it('keeps Overview core reads usable without analytics', async () => {
    const service = createFixtureVendorService(context, 'denied'),
      totals = vi.spyOn(service, 'totals');
    render(<Overview service={service} />);
    await waitFor(() =>
      expect(
        screen.getByText(/23 Vendor customer relationships/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('link', { name: 'Find an order' }),
    ).toBeInTheDocument();
    expect(totals).not.toHaveBeenCalled();
    expect(screen.queryByText('Captured')).not.toBeInTheDocument();
  });
});
