import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMarketDiscoveryApi,
  type DiscoverableMarket,
  type MarketDiscoveryApi,
} from '@market/api';
import { FindMarketApplications } from '../apps/admin/src/vendor/MarketApplications';
import { discoveryAction } from '../apps/admin/src/vendor/market-applications-data';
import { VendorApplicationContinuation } from '../apps/admin/src/vendor/application-continuation';
import type { VendorService } from '../apps/admin/src/vendor/service';
import { configurationInput } from '../apps/admin/src/market/settings';

const centralSignIn = vi.hoisted(() =>
  vi.fn(async () => 'https://auth.example/sign-in'),
);
vi.mock('../apps/storefront/src/lib/account', () => ({ centralSignIn }));
const { GET } =
  await import('../apps/storefront/src/pages/vendor/application-continue');

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.clearAllMocks();
});
const origin = 'http://market.platform.localhost:4321';
const base: DiscoverableMarket = {
  id: '1',
  name: 'Open Market',
  city: 'Kerrville',
  state: 'TX',
  timezone: 'America/Chicago',
  website: origin,
  applyUrl: `${origin}/vendor/application-continue?slug=open-form&vendor=4&channel=9`,
  applyState: 'OPEN',
  existingApplicationHref: null,
  nextMarket: {
    startsAt: '2027-01-09T15:00:00.000Z',
    timezone: 'America/Chicago',
  },
  deadline: {
    closesAt: '2027-04-01T04:59:00.000Z',
    timezone: 'America/Chicago',
  },
  opensAt: null,
};
const markets: DiscoverableMarket[] = [
  base,
  {
    ...base,
    id: '2',
    name: 'Member Market',
    applyState: 'MEMBER',
    applyUrl: null,
    existingApplicationHref: '/vendor/markets',
  },
  {
    ...base,
    id: '3',
    name: 'Pending Market',
    applyState: 'MEMBERSHIP_PENDING',
    applyUrl: null,
    existingApplicationHref: '/vendor/markets',
  },
  {
    ...base,
    id: '4',
    name: 'Applied Market',
    applyState: 'APPLIED',
    applyUrl: null,
    existingApplicationHref: '/vendor/applications/77?channel=9',
  },
  {
    ...base,
    id: '5',
    name: 'Draft Market',
    applyState: 'DRAFT',
    applyUrl: null,
    existingApplicationHref: `${origin}/vendor/application-continue?draft=5&vendor=4&channel=9`,
  },
  {
    ...base,
    id: '6',
    name: 'Later Market',
    applyState: 'NOT_YET_OPEN',
    applyUrl: null,
    opensAt: '2027-08-01T13:00:00.000Z',
    deadline: null,
  },
  {
    ...base,
    id: '7',
    name: 'Siteless Market',
    city: null,
    state: null,
    website: null,
    applyUrl: null,
    nextMarket: null,
  },
];
function api(items = markets): MarketDiscoveryApi {
  return {
    cities: vi.fn(async () => [
      { value: 'Kerrville|TX', label: 'Kerrville, TX' },
    ]),
    search: vi.fn(async ({ skip, take }) => ({
      items: items.slice(skip, skip + take),
      totalItems: items.length,
    })),
  };
}

describe('market discovery API adapter', () => {
  it('sends bounded SEARCH and CITIES requests over the admin transport with the vendor channel', async () => {
    const bodies: Array<{ variables: { input: Record<string, unknown> } }> = [],
      headers: Array<Record<string, string>> = [];
    const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init!.body));
      bodies.push(body);
      headers.push(init!.headers as Record<string, string>);
      const data =
        body.variables.input.mode === 'CITIES'
          ? { items: [{ value: 'Boerne|TX', label: 'Boerne, TX' }] }
          : { items: [base], totalItems: 1 };
      return new Response(
        JSON.stringify({ data: { vendorMarketDiscovery: data } }),
        { headers: { 'content-type': 'application/json' } },
      );
    });
    const client = createMarketDiscoveryApi({
      endpoint: 'http://localhost:3000/admin-api',
      channelToken: 'vendor-token',
      fetch,
    });
    expect(await client.cities()).toEqual([
      { value: 'Boerne|TX', label: 'Boerne, TX' },
    ]);
    expect(
      await client.search({
        search: '  boerne ',
        city: 'Boerne|TX',
        skip: 10,
        take: 10,
      }),
    ).toEqual({ items: [base], totalItems: 1 });
    expect(bodies.map((b) => b.variables.input)).toEqual([
      { mode: 'CITIES' },
      {
        mode: 'SEARCH',
        search: 'boerne',
        city: 'Boerne|TX',
        skip: 10,
        take: 10,
      },
    ]);
    expect(bodies[0]).toHaveProperty(
      'query',
      expect.stringContaining('vendorMarketDiscovery'),
    );
    expect(headers.every((h) => h['vendure-token'] === 'vendor-token')).toBe(
      true,
    );
  });
});

describe('discovery Apply reflects applyState', () => {
  it('maps every state to a safe destination or a clear unavailable state', () => {
    const actions = markets.map(discoveryAction);
    expect(actions.map((a) => [a.kind, a.label])).toEqual([
      ['apply', 'Apply'],
      ['local', 'Membership'],
      ['local', 'Membership pending'],
      ['local', 'View application'],
      ['external', 'Continue draft'],
      ['not-yet-open', 'Not yet open'],
      ['unavailable', 'Apply'],
    ]);
    // Destinations are re-validated; unsafe backend values never become links.
    expect(
      discoveryAction({ ...base, applyUrl: 'javascript:alert(1)' }).kind,
    ).toBe('unavailable');
    expect(
      discoveryAction({
        ...base,
        applyUrl: 'https://user:pass@market.example/apply',
      }).kind,
    ).toBe('unavailable');
    expect(
      discoveryAction({
        ...base,
        applyState: 'APPLIED',
        existingApplicationHref: 'https://evil.example/vendor/applications/1',
      }).kind,
    ).toBe('unavailable');
    expect(
      discoveryAction({
        ...base,
        applyState: 'APPLIED',
        existingApplicationHref: '/admin/settings',
      }).kind,
    ).toBe('unavailable');
    expect(
      discoveryAction({
        ...base,
        applyState: 'DRAFT',
        existingApplicationHref: 'ftp://market.example/x',
      }).kind,
    ).toBe('unavailable');
    // Older servers without applyState keep the original safe Apply link.
    expect(discoveryAction({ ...base, applyState: undefined }).kind).toBe(
      'apply',
    );
  });

  it('renders state-specific actions and keeps workspace navigation in-app', async () => {
    const discovery = api();
    render(<FindMarketApplications api={discovery} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'View more markets' }),
    );
    const table = await screen.findByRole('table', {
      name: 'Markets accepting applications',
    });
    await within(table).findByText('Siteless Market');
    const row = (name: string) => within(table).getByText(name).closest('tr')!;
    expect(
      within(row('Open Market')).getByRole('link', { name: /Apply/ }),
    ).toHaveAttribute('href', base.applyUrl);
    expect(
      within(row('Member Market')).getByRole('link', {
        name: /^Membership/,
      }),
    ).toHaveAttribute('href', '/vendor/markets');
    expect(
      within(row('Pending Market')).getByRole('link', {
        name: /Membership pending/,
      }),
    ).toHaveAttribute('href', '/vendor/markets');
    expect(
      within(row('Draft Market')).getByRole('link', { name: /Continue draft/ }),
    ).toHaveAttribute('href', markets[4]!.existingApplicationHref!);
    expect(
      within(row('Later Market')).getByRole('button', { name: 'Apply' }),
    ).toBeDisabled();
    expect(row('Later Market')).toHaveTextContent(/Opens Aug 1, 2027/);
    expect(row('Later Market')).toHaveTextContent('Not specified');
    expect(
      within(row('Siteless Market')).getByRole('button', { name: /Apply/ }),
    ).toBeDisabled();
    expect(
      within(row('Siteless Market')).getByRole('button', { name: /Website/ }),
    ).toBeDisabled();
    expect(row('Siteless Market')).toHaveTextContent('Location unavailable');
    expect(row('Siteless Market')).toHaveTextContent('Not announced');
    for (const name of [
      'Member Market',
      'Pending Market',
      'Applied Market',
      'Draft Market',
      'Later Market',
    ])
      expect(
        within(row(name)).queryByRole('link', { name: /^Apply/ }),
      ).toBeNull();
    fireEvent.click(
      within(row('Applied Market')).getByRole('link', {
        name: /View application/,
      }),
    );
    await waitFor(() =>
      expect(window.location.pathname).toBe('/vendor/applications/77'),
    );
    expect(window.location.search).toBe('?channel=9');
  });

  it('shows the existing error state when discovery fails', async () => {
    const failing: MarketDiscoveryApi = {
      cities: vi.fn(async () => []),
      search: vi.fn(async () => {
        throw new Error('boom');
      }),
    };
    render(<FindMarketApplications api={failing} />);
    expect(
      await screen.findByRole('button', { name: 'Refresh records' }),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('storefront application-continue handoff', () => {
  beforeEach(() => {
    process.env.ADMIN_ORIGIN = 'http://localhost:4322';
  });
  const context = (query: string) => {
    const cookies = new Map<
      string,
      { value: string; options: Record<string, unknown> }
    >();
    return {
      cookies,
      ctx: {
        url: new URL(`${origin}/vendor/application-continue?${query}`),
        locals: { storefront: { kind: 'MARKET' } },
        cookies: {
          has: (k: string) => cookies.has(k),
          set: (k: string, value: string, options: Record<string, unknown>) =>
            cookies.set(k, { value, options }),
        },
        redirect: (location: string) =>
          new Response(null, { status: 302, headers: { location } }),
      } as never,
    };
  };
  it('carries a discovery Apply with a selected vendor into the admin one-time handoff', async () => {
    const { ctx, cookies } = context('slug=open-form-1&vendor=4&channel=9');
    const response = await GET(ctx);
    const target = new URL(response.headers.get('location')!);
    expect(target.origin + target.pathname).toBe(
      'http://localhost:4322/vendor/applications/continue',
    );
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      slug: 'open-form-1',
      vendor: '4',
      channel: '9',
      origin,
    });
    expect(target.searchParams.get('correlation')).toMatch(
      /^[A-Za-z0-9_-]{43}$/,
    );
    expect(target.searchParams.has('draft')).toBe(false);
    expect(cookies.get('account-correlation')!.value).toBe(
      target.searchParams.get('correlation'),
    );
    expect(cookies.get('account-return')!.value).toBe(
      '/vendor/application-return?slug=open-form-1&vendor=4',
    );
    expect(cookies.get('account-return')!.options).toMatchObject({
      httpOnly: true,
      path: '/auth/callback',
      maxAge: 120,
    });
    expect(centralSignIn).not.toHaveBeenCalled();
  });
  it('keeps central sign-in for applicants arriving directly from the storefront', async () => {
    const response = await GET(context('slug=open-form-1').ctx);
    expect(response.headers.get('location')).toBe(
      'https://auth.example/sign-in',
    );
    expect(centralSignIn).toHaveBeenCalledWith(
      expect.anything(),
      '/vendor/application-return?slug=open-form-1',
      'vendor-applications',
    );
  });
  it('leaves draft continuation unchanged and rejects malformed input', async () => {
    const target = new URL(
      (await GET(context('draft=12&vendor=4').ctx)).headers.get('location')!,
    );
    expect(target.searchParams.get('draft')).toBe('12');
    expect(target.searchParams.has('slug')).toBe(false);
    for (const query of [
      'slug=../admin&vendor=4',
      'slug=a%2Fb&vendor=4',
      'draft=abc&vendor=4',
      '',
    ])
      expect((await GET(context(query).ctx)).status).toBe(400);
    const odd = await GET(context('slug=open-form-1&vendor=4x').ctx);
    expect(odd.headers.get('location')).toBe('https://auth.example/sign-in');
  });
});

describe('admin application continuation', () => {
  const service = (command: ReturnType<typeof vi.fn>) =>
    ({
      vendorId: '4',
      applications: { read: vi.fn(), command },
    }) as unknown as VendorService;
  const code = 'a'.repeat(43);
  it('requests a slug handoff when no draft is present', async () => {
    window.history.replaceState(
      null,
      '',
      `/vendor/applications/continue?slug=open-form-1&vendor=4&origin=${encodeURIComponent(origin)}&correlation=${'c'.repeat(43)}`,
    );
    const command = vi.fn(async () => ({
      callback: `${origin}/auth/callback?code=${code}`,
    }));
    render(<VendorApplicationContinuation service={service(command)} />);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('CONTINUE', {
        vendorId: 4,
        slug: 'open-form-1',
        origin,
        correlation: 'c'.repeat(43),
      }),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('keeps the draft request shape and rejects unsafe callbacks with a slug-specific message', async () => {
    window.history.replaceState(
      null,
      '',
      `/vendor/applications/continue?draft=12&vendor=4&origin=${encodeURIComponent(origin)}&correlation=x`,
    );
    const draftCommand = vi.fn(async () => ({
      callback: `${origin}/auth/callback?code=${code}`,
    }));
    const { unmount } = render(
      <VendorApplicationContinuation service={service(draftCommand)} />,
    );
    await waitFor(() =>
      expect(draftCommand).toHaveBeenCalledWith('CONTINUE', {
        vendorId: 4,
        draftId: 12,
        origin,
        correlation: 'x',
      }),
    );
    unmount();
    window.history.replaceState(
      null,
      '',
      `/vendor/applications/continue?slug=open-form-1&origin=${encodeURIComponent(origin)}&correlation=x`,
    );
    const foreign = vi.fn(async () => ({
      callback: `https://evil.example/auth/callback?code=${code}`,
    }));
    render(<VendorApplicationContinuation service={service(foreign)} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This application is unavailable to the selected Vendor',
    );
  });
  it('never calls CONTINUE for a malformed slug', async () => {
    window.history.replaceState(
      null,
      '',
      `/vendor/applications/continue?slug=${encodeURIComponent('../x')}&origin=${encodeURIComponent(origin)}&correlation=x`,
    );
    const command = vi.fn();
    render(<VendorApplicationContinuation service={service(command)} />);
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(command).not.toHaveBeenCalled();
  });
});

describe('market settings location input', () => {
  const market = { id: '1', version: 3 } as never;
  const form = (values: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries({
      name: 'Market',
      timezone: 'America/Chicago',
      venue: '',
      pickupInstructions: '',
      status: 'active',
      vendorWindowMode: 'narrower',
      closeMinutesBeforeStart: '0',
      opensDaysBefore: '7',
      opensTime: '08:00',
      closesDaysBefore: '1',
      closesTime: '20:00',
      ...values,
    }))
      data.set(k, v);
    return data;
  };
  it('saves city and state together, normalized, or clears both', () => {
    expect(
      configurationInput(
        form({ city: '  New   Braunfels ', region: 'tx' }),
        market,
      ),
    ).toMatchObject({ city: 'New Braunfels', region: 'TX' });
    expect(
      configurationInput(form({ city: '', region: '' }), market),
    ).toMatchObject({ city: '', region: '' });
  });
  it.each([
    [{ city: 'Austin', region: '' }],
    [{ city: '', region: 'TX' }],
    [{ city: 'Austin', region: 'ZZ' }],
    [{ city: 'Austin1', region: 'TX' }],
  ])('rejects invalid location %j', (values) => {
    expect(() => configurationInput(form(values), market)).toThrow();
  });
});
