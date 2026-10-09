import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { buildSchema, parse, print, validate } from 'graphql';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  AppError,
  createMarketApi,
  type AdminUser,
  type MarketApi,
  type MarketOperationsPage,
} from '@market/api';
import { authenticatedSession } from '@market/auth';
import {
  resolveAdminContext,
  routeAllowed,
  visibleNavigation,
} from '@market/admin-core';
import * as documents from '../packages/api/src/generated/admin';
import {
  createFixtureMarketService,
  createMarketFixtureData,
  marketFixtureContext,
  marketGrantPresets,
} from '../apps/admin/src/market/fixture';
import { createLiveMarketService } from '../apps/admin/src/market/service';
import { MarketOverview } from '../apps/admin/src/market/overview';
import { MarketSettings } from '../apps/admin/src/market/settings';
import { MarketOccurrences } from '../apps/admin/src/market/occurrences';
import { MarketVendors } from '../apps/admin/src/market/vendors';
import {
  MarketOperations,
  OperationalPurchases,
} from '../apps/admin/src/market/operations';
import { MarketAnalytics } from '../apps/admin/src/market/analytics';
import {
  useRead,
  dateBounds,
  sessionInput,
} from '../apps/admin/src/market/common';
import { AdminShell } from '../apps/admin/src/AdminShell';
import { AdminApp } from '../apps/admin/src/AdminApp';

const endpoint = 'http://localhost/admin-api';
const user: AdminUser = {
  id: '90',
  identifier: 'synthetic-operator',
  channels: ['1', '2'].map((id) => ({
    id,
    code: 'irrelevant-infrastructure',
    token: `market-${id}`,
    permissions: [...marketGrantPresets.full],
  })),
};
function identity(id = '1', changes: Record<string, unknown> = {}) {
  return {
    id,
    name: `Synthetic Market ${id === '1' ? 'A' : 'B'}`,
    slug: 'irrelevant',
    status: 'active',
    version: 1,
    channelId: id,
    permissions: [...marketGrantPresets.full],
    membership: {
      id: `${id}99`,
      marketId: id,
      principalId: user.id,
      status: 'active',
      role: 'marketAdmin',
    },
    ...changes,
  };
}
function response(data: unknown) {
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
function denied() {
  return new Response(
    JSON.stringify({
      errors: [
        {
          message: 'private database/provider details',
          extensions: { code: 'FORBIDDEN' },
        },
      ],
    }),
  );
}
function form(name: string) {
  return within(screen.getByRole('heading', { name }).closest('section')!);
}
async function loadedSettings(
  service = createFixtureMarketService(marketFixtureContext()),
) {
  render(<MarketSettings service={service} />);
  await screen.findByLabelText('Market name');
  return service;
}
function clock() {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-05T12:00:00Z'));
}

describe('Market authority and named contracts', () => {
  it('validates every Market document against the current extracted Admin schema', () => {
    const schema = buildSchema(
      readFileSync('packages/api/schema/admin.graphql', 'utf8'),
    );
    const operations = Object.entries(documents).filter(
      ([name]) => name.startsWith('Market') && name.endsWith('Document'),
    );
    expect(operations.length).toBeGreaterThan(15);
    for (const [, document] of operations)
      expect(
        validate(schema, parse(print(document as Parameters<typeof print>[0]))),
      ).toEqual([]);
    const api = createMarketApi({ endpoint, channelToken: 'test' });
    expect(api).not.toHaveProperty('execute');
    expect(api).not.toHaveProperty('fulfill');
    expect(api).not.toHaveProperty('catalogRead');
    expect(() => createMarketApi({ endpoint, channelToken: '' })).toThrow(
      AppError,
    );
  });
  it.each(['1', '2'])(
    'selects Market context %s through fresh identity with exact Channel',
    async (id) => {
      const fetcher = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(response({ ownMarketIdentity: identity(id) }));
      const context = await resolveAdminContext(
        authenticatedSession(user, id),
        endpoint,
      );
      expect(context.subject).toEqual({ marketId: id });
      expect(context.scope).toBe('MARKET');
      expect(
        (fetcher.mock.calls[0]![1]!.headers as Record<string, string>)[
          'vendure-token'
        ],
      ).toBe(`market-${id}`);
      expect(fetcher.mock.calls[0]![1]!.credentials).toBe('include');
    },
  );
  it.each([
    ['wrong selected context', { channelId: '2' }],
    [
      'revoked membership',
      { membership: { ...identity().membership, status: 'revoked' } },
    ],
    [
      'wrong principal',
      { membership: { ...identity().membership, principalId: '91' } },
    ],
    [
      'wrong Market membership',
      { membership: { ...identity().membership, marketId: '2' } },
    ],
    [
      'missing fresh ReadOwnMarket',
      { permissions: ['ManageOwnMarketSchedule'] },
    ],
    [
      'wrong membership role',
      { membership: { ...identity().membership, role: 'owner' } },
    ],
  ])('rejects bootstrap with %s', async (_label, changes) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({ ownMarketIdentity: identity('1', changes) }),
    );
    await expect(
      resolveAdminContext(authenticatedSession(user, '1'), endpoint),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });
  it('does not infer scope from names or IDs when native ReadOwnMarket is absent', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    await expect(
      resolveAdminContext(
        authenticatedSession({
          ...user,
          channels: [{ ...user.channels[0]!, permissions: ['Authenticated'] }],
        }),
        endpoint,
      ),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('preserves suspended Market management and intersects current grants', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({
        ownMarketIdentity: identity('1', {
          status: 'suspended',
          permissions: [
            'ReadOwnMarket',
            'ManageOwnMarketSchedule',
            'ManageOwnCatalog',
          ],
        }),
      }),
    );
    const context = await resolveAdminContext(
      authenticatedSession(user, '1'),
      endpoint,
    );
    expect(context.marketStatus).toBe('suspended');
    expect(context.permissions).toEqual([
      'ReadOwnMarket',
      'ManageOwnMarketSchedule',
    ]);
    const service = createLiveMarketService(
      context,
      endpoint,
      'market-1',
      () => {},
    );
    expect(await service.availability()).toBe('DENIED');
  });
  it.each(
    Object.keys(marketGrantPresets) as (keyof typeof marketGrantPresets)[],
  )(
    'supports %s grant preset without inventing backend roles',
    async (preset) => {
      const context = marketFixtureContext('1', preset),
        service = createFixtureMarketService(context);
      expect(await service.configuration('1')).toMatchObject({ id: '1' });
      expect(
        visibleNavigation(context).some((item) => item.label === 'Billing'),
      ).toBe(context.permissions.includes('ReadOwnBilling'));
      expect(routeAllowed(context, '/market/analytics')).toBe(
        context.permissions.includes('ReadOwnMarketAnalytics'),
      );
      if (preset === 'operations' || preset === 'analytics')
        await expect(service.cancelOccurrence('101', 1)).rejects.toMatchObject({
          kind: 'forbidden',
        });
    },
  );
  it.each([
    '/market/vendors/11/deeper',
    '/market/occurrences/101/delete',
    '/market/nope',
    '/market/products',
    '/market/billing/foreign',
    '/market/operations/evil',
  ])('fails closed at %s', (path) => {
    expect(routeAllowed(marketFixtureContext(), path)).toBe(false);
  });
  it('renders anonymous and loading bootstrap without tenant content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ me: null }));
    render(<AdminApp endpoint={endpoint} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session',
    );
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(screen.queryByText('Synthetic Market A')).toBeNull();
  });
  it('shows safe backend unavailable bootstrap', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 503 }),
    );
    render(<AdminApp endpoint={endpoint} />);
    await screen.findByText(
      'The service is unavailable. Please try again later.',
    );
    expect(screen.queryByText('Synthetic Market A')).toBeNull();
  });
  it('wrong context recovery permits selecting another workspace without infrastructure labels', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      if (body.query.includes('query AdminSession'))
        return response({ me: user });
      return denied();
    });
    render(<AdminApp endpoint={endpoint} />);
    await screen.findByRole('heading', { name: 'Workspace unavailable' });
    expect(screen.getByLabelText('Workspace')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('irrelevant-infrastructure');
  });
});

describe('Market overview, configuration and recurrence', () => {
  it('shows authoritative core Overview counts without financial metrics', async () => {
    const service = createFixtureMarketService(marketFixtureContext());
    render(<MarketOverview service={service} />);
    await screen.findByText(
      '2 upcoming scheduled occurrences in this date range.',
    );
    await screen.findByText(
      '3 approved Vendor relationships out of 5 total relationships.',
    );
    await screen.findByText(/confirmed participations 2/);
    await screen.findByText(
      /23 operational purchases for the next scheduled occurrence/,
    );
    expect(document.body.textContent).toContain(
      'Operational totals are current database counts',
    );
    expect(document.body.textContent).not.toMatch(
      /GMV|revenue|\$|payout|refund totals|profit/i,
    );
  });
  it.each(['DENIED', 'UNKNOWN', 'UNCONFIGURED'] as const)(
    'keeps core overview available with analytics %s',
    async (value) => {
      const service = createFixtureMarketService(marketFixtureContext(), value),
        analytics = vi.spyOn(service, 'analytics');
      render(<MarketOverview service={service} />);
      await screen.findByText(
        '3 approved Vendor relationships out of 5 total relationships.',
      );
      await screen.findByText(new RegExp(`Market analytics: ${value}`));
      expect(analytics).not.toHaveBeenCalled();
    },
  );
  it('saves Market configuration and rereads backend-normalized values', async () => {
    const service = createFixtureMarketService(marketFixtureContext()),
      reread = vi.spyOn(service, 'configuration');
    await loadedSettings(service);
    fireEvent.change(screen.getByLabelText('Market name'), {
      target: { value: 'Changed synthetic Market' },
    });
    fireEvent.click(
      form('Market configuration').getByRole('button', { name: 'Save' }),
    );
    await waitFor(() => expect(reread).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByLabelText('Market name')).toHaveValue(
        'Changed synthetic Market',
      ),
    );
    expect(await service.configuration('1')).toMatchObject({
      version: 2,
      timezone: 'America/Chicago',
    });
  });
  it('revises recurrence using Market version and authoritative reread', async () => {
    const service = createFixtureMarketService(marketFixtureContext()),
      mutate = vi.spyOn(service, 'recurrence'),
      reread = vi.spyOn(service, 'configuration');
    render(<MarketOccurrences service={service} view="generate" />);
    await screen.findByLabelText('Market starts at');
    fireEvent.change(screen.getByLabelText('Market starts at'), {
      target: { value: '11:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }));
    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        '1',
        1,
        expect.objectContaining({ startTime: '11:30', weekdays: [6] }),
      ),
    );
    await waitFor(() => expect(reread).toHaveBeenCalledTimes(2));
    expect(await service.configuration('1')).toMatchObject({
      version: 2,
      recurrenceVersion: 2,
    });
  });
  it('does not silently overwrite stale recurrence, then refreshes before deliberate retry', async () => {
    const service = createFixtureMarketService(marketFixtureContext());
    render(<MarketOccurrences service={service} view="generate" />);
    await screen.findByLabelText('Market starts at');
    await service.recurrence('1', 1, null);
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }));
    await screen.findByRole('heading', { name: 'Refresh required' });
    expect(await service.configuration('1')).toMatchObject({
      recurrence: null,
      version: 2,
    });
    expect(
      screen.getByRole('button', { name: 'Save schedule' }),
    ).toBeDisabled();
    fireEvent.click(
      form('Repeating market schedule').getByRole('button', {
        name: 'Check current records',
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save schedule' }),
      ).toBeEnabled(),
    );
  });
  it('read-only settings expose configuration without edit controls', async () => {
    render(
      <MarketSettings
        service={createFixtureMarketService(
          marketFixtureContext('1', 'operations'),
        )}
      />,
    );
    await screen.findByText(
      'Configuration is read only with your current permissions.',
    );
    expect(screen.queryByLabelText('Market name')).toBeNull();
  });
  it('validates offset instants and bounded UTC ranges without browser-time recurrence conversion', () => {
    expect(dateBounds('2026-01-01', '2026-01-31')).toEqual({
      from: '2026-01-01T00:00:00.000Z',
      through: '2026-01-31T00:00:00.000Z',
    });
    expect(() => dateBounds('2026-02-30', '2026-03-31')).toThrow(AppError);
    expect(() => dateBounds('2026-01-01', '2028-01-01')).toThrow(AppError);
    const data = new FormData();
    data.set('startsAt', '2026-11-01T01:30:00');
    data.set('endsAt', '2026-11-01T03:00:00');
    expect(() => sessionInput(data)).toThrow(AppError);
  });
});

describe('Market occurrences', () => {
  it('shows generated/manual backend states and authoritative paged totals', async () => {
    render(
      <MarketOccurrences
        service={createFixtureMarketService(marketFixtureContext())}
      />,
    );
    await screen.findByRole('table', { name: 'Market occurrences' });
    expect(screen.getAllByText('generated')).toHaveLength(1);
    expect(screen.getAllByText('manual')).toHaveLength(1);
    expect(document.body).toHaveTextContent('2 occurrences in this date range');
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();
  });
  it.each(['synchronous', 'queued'])(
    'uses only the selected %s generation command and rereads',
    async (mode) => {
      const service = createFixtureMarketService(marketFixtureContext()),
        generate = vi.spyOn(service, 'generate'),
        enqueue = vi.spyOn(service, 'enqueue'),
        reread = vi.spyOn(service, 'configuration');
      render(<MarketOccurrences service={service} view="generate" />);
      await screen.findByLabelText('Generation execution');
      fireEvent.change(screen.getByLabelText('Generation execution'), {
        target: { value: mode },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Generate occurrences' }),
      );
      await waitFor(() => expect(reread).toHaveBeenCalledTimes(2));
      expect(generate).toHaveBeenCalledTimes(mode === 'synchronous' ? 1 : 0);
      expect(enqueue).toHaveBeenCalledTimes(mode === 'queued' ? 1 : 0);
      if (mode === 'queued')
        expect(document.body).toHaveTextContent('Status: PENDING');
    },
  );
  it('creates a manual occurrence with an explicit stable manual intent key', async () => {
    clock();
    const service = createFixtureMarketService(marketFixtureContext()),
      manual = vi.spyOn(service, 'manual');
    render(<MarketOccurrences service={service} view="manual" />);
    await screen.findByLabelText('Start date');
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-10-25' },
    });
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '10:00' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2026-10-25' },
    });
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '14:00' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Create manual occurrence' }),
    );
    await waitFor(() =>
      expect(manual).toHaveBeenCalledWith(
        '1',
        '2026-10-25',
        expect.stringMatching(/^manual:[\w-]+$/),
        expect.objectContaining({ startsAt: '2026-10-25T15:00:00.000Z' }),
      ),
    );
    expect(
      (
        await service.occurrences(
          '1',
          '2026-10-05T00:00:00Z',
          '2026-11-05T00:00:00Z',
        )
      ).some((row) => row.id === '104'),
    ).toBe(true);
  });
  it('revises supported manual occurrence with its backend version and rereads', async () => {
    const service = createFixtureMarketService(marketFixtureContext()),
      mutate = vi.spyOn(service, 'reviseOccurrence'),
      reread = vi.spyOn(service, 'occurrence');
    render(<MarketOccurrences service={service} id="102" />);
    await screen.findByLabelText('Venue snapshot');
    fireEvent.change(screen.getByLabelText('Venue snapshot'), {
      target: { value: 'Changed synthetic venue' },
    });
    fireEvent.click(
      form('Revise occurrence').getByRole('button', { name: 'Save' }),
    );
    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        '102',
        1,
        expect.objectContaining({ venue: 'Changed synthetic venue' }),
      ),
    );
    await waitFor(() => expect(reread).toHaveBeenCalledTimes(2));
  });
  it('confirms occurrence cancellation and never claims financial/inventory/contact effects', async () => {
    const service = createFixtureMarketService(marketFixtureContext()),
      cancel = vi.spyOn(service, 'cancelOccurrence');
    render(<MarketOccurrences service={service} id="102" />);
    await screen.findByRole('button', { name: 'Cancel occurrence' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel occurrence' }));
    expect(cancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'does not automatically refund purchases, restock inventory or notify customers',
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirm change',
      }),
    );
    await waitFor(() =>
      expect(screen.getByText('cancelled')).toBeInTheDocument(),
    );
    expect(cancel).toHaveBeenCalledWith('102', 1);
    expect(document.body.textContent).not.toMatch(
      /refund issued|inventory restored|customers notified/i,
    );
  });
  it('unknown direct resource fails safely', async () => {
    render(
      <MarketOccurrences
        service={createFixtureMarketService(marketFixtureContext())}
        id="999"
      />,
    );
    await screen.findByText('You do not have access to this area.');
    expect(
      screen.queryByRole('button', { name: 'Cancel occurrence' }),
    ).toBeNull();
  });
});

describe('Vendor relationships, listings, participation and offerings', () => {
  it('shows exact pending/approved/suspended business states and safe Vendor names', async () => {
    render(
      <MarketVendors
        service={createFixtureMarketService(marketFixtureContext())}
      />,
    );
    await screen.findByRole('table');
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('suspended')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Synthetic Market A Vendor 1' }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /Seller|credentials|Stripe|private money/,
    );
  });
  it('approves business membership then separately approves/withdraws a listing with authoritative state', async () => {
    const service = createFixtureMarketService(marketFixtureContext()),
      update = vi.spyOn(service, 'membershipStatus');
    const view = render(<MarketVendors service={service} id="11" />);
    await screen.findByLabelText('Business membership status');
    fireEvent.change(screen.getByLabelText('Business membership status'), {
      target: { value: 'approved' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update membership' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('1', '1001', 'approved', 1),
    );
    await waitFor(() =>
      expect(document.body).toHaveTextContent('Business membership approved'),
    );
    view.rerender(<MarketVendors service={service} id="11" tab="listings" />);
    await screen.findByLabelText('Listing approval status');
    fireEvent.click(
      screen.getByRole('button', { name: 'Update listing approval' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('table', {
          name: 'Listing approvals (backend order)',
        }),
      ).toHaveTextContent('approved'),
    );
    expect(document.body).toHaveTextContent(
      'Approval, publication and offering availability remain separate',
    );
    expect(screen.queryByRole('button', { name: /Publish/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Listing approval status'), {
      target: { value: 'withdrawn' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Update listing approval' }),
    );
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirm change',
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('table', {
          name: 'Listing approvals (backend order)',
        }),
      ).toHaveTextContent('withdrawn'),
    );
  });
  it('membership suspension requires deliberate confirmation', async () => {
    const service = createFixtureMarketService(marketFixtureContext()),
      update = vi.spyOn(service, 'membershipStatus');
    render(<MarketVendors service={service} id="12" />);
    await screen.findByLabelText('Business membership status');
    fireEvent.change(screen.getByLabelText('Business membership status'), {
      target: { value: 'suspended' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update membership' }));
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('does not delete');
  });
  it.each([
    ['11', 'planned'],
    ['12', 'confirmed'],
    ['13', 'cancelled'],
  ])(
    'preserves participation state for relationship %s',
    async (id, status) => {
      render(
        <MarketVendors
          service={createFixtureMarketService(marketFixtureContext())}
          id={id}
          tab="participation"
        />,
      );
      const table = await screen.findByRole('table', {
        name: 'Occurrence participation (backend order)',
      });
      expect(table).toHaveTextContent(status);
      expect(document.body.textContent).not.toMatch(
        /checked.in|no.show|attended/i,
      );
    },
  );
  it('uses organizer participation authority and cancels with confirmation', async () => {
    const service = createFixtureMarketService(marketFixtureContext()),
      command = vi.spyOn(service, 'participation');
    render(<MarketVendors service={service} id="12" tab="participation" />);
    await screen.findByLabelText('Participation status');
    fireEvent.change(screen.getByLabelText('Participation status'), {
      target: { value: 'cancelled' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Update participation' }),
    );
    expect(command).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirm change',
      }),
    );
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        expect.objectContaining({ expectedVersion: 1, status: 'cancelled' }),
      ),
    );
    expect(service.context.permissions).not.toContain(
      'ManageOwnMarketParticipation',
    );
  });
  it('shows offering flags/window and cap separately from stock, configures and explicitly rematerializes', async () => {
    const service = createFixtureMarketService(marketFixtureContext()),
      rematerialize = vi.spyOn(service, 'rematerialize');
    render(<MarketVendors service={service} id="12" tab="offerings" />);
    const table = await screen.findByRole('table', {
      name: 'Market offerings (backend order)',
    });
    expect(table).toHaveTextContent('20');
    expect(document.body).toHaveTextContent(
      'sales cap is separate from Vendor physical inventory',
    );
    expect(document.body).toHaveTextContent(
      'not stock availability or checkout authorization',
    );
    expect(document.body).not.toHaveTextContent('20 items in inventory');
    fireEvent.change(
      form('Configure offering 12001').getByLabelText(
        'Occurrence sales cap (optional)',
      ),
      { target: { value: '25' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save offering' }));
    await waitFor(() =>
      expect(
        screen.getByRole('table', { name: 'Market offerings (backend order)' }),
      ).toHaveTextContent('25'),
    );
    expect(rematerialize).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Apply current window configuration',
      }),
    );
    await waitFor(() => expect(rematerialize).toHaveBeenCalledWith('12001', 2));
  });
  it('partial read-only operators get no business/listing/participation/offering commands', async () => {
    render(
      <MarketVendors
        service={createFixtureMarketService(
          marketFixtureContext('1', 'operations'),
        )}
        id="12"
        tab="offerings"
      />,
    );
    await screen.findByRole('table', {
      name: 'Market offerings (backend order)',
    });
    for (const label of [
      'Update membership',
      'Update listing approval',
      'Update participation',
      'Save offering',
    ])
      expect(screen.queryByRole('button', { name: label })).toBeNull();
  });
  it('rejects cross-Market membership IDs without a native/global workaround', async () => {
    const failure = vi.fn(),
      service = createFixtureMarketService(
        marketFixtureContext('2'),
        'ALLOWED',
        'none',
        'ACTIVE',
        failure,
      );
    await expect(service.relationshipState('11')).rejects.toMatchObject({
      kind: 'forbidden',
    });
    expect(failure).toHaveBeenCalledTimes(1);
  });
});

describe('Operations privacy and complete server paging', () => {
  it('pages 23 operational purchases using bounded skip/take without deriving a total', async () => {
    const service = createFixtureMarketService(marketFixtureContext()),
      read = vi.spyOn(service, 'operations');
    render(<MarketOperations service={service} id="101" />);
    await screen.findByText(
      '23 operational purchases in this occurrence. Showing 1 to 20.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText(
      '23 operational purchases in this occurrence. Showing 21 to 23.',
    );
    expect(read).toHaveBeenLastCalledWith('101', 20);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  it('renders allowed operational fields only even when an HTTP mock injects private extras', () => {
    const data = createMarketFixtureData('1').operations;
    const purchase = data.items[0]!;
    const page: MarketOperationsPage = {
      totalItems: 1,
      items: [
        {
          ...purchase,
          ...{
            emailAddress: 'PRIVATE_EMAIL@example.invalid',
            phone: 'PRIVATE_PHONE',
            address: 'PRIVATE_ADDRESS',
            customerName: 'PRIVATE_NAME',
            payment: 'PRIVATE_PAYMENT',
            vendorAttributed: 'PRIVATE_MONEY',
          },
          portions: purchase.portions.map((portion) => ({
            ...portion,
            ...{
              refundTotal: 'PRIVATE_REFUND',
              privateCustomer: 'PRIVATE_CUSTOMER',
            },
          })),
        },
      ],
    };
    render(<OperationalPurchases page={page} />);
    expect(document.body.textContent).not.toMatch(/PRIVATE_|example.invalid/);
    expect(document.body).toHaveTextContent('Original units');
    expect(document.body).toHaveTextContent('Cancelled units');
    expect(document.body).toHaveTextContent('PARTIALLY_COMPLETED');
    expect(document.body).toHaveTextContent('AWAITING');
    expect(
      screen.getByRole('table', { name: /Operational order 1810 quantities/ }),
    ).toHaveTextContent('5212');
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.body.textContent).not.toMatch(
      /refunded|paid out|financially settled/i,
    );
  });
});

describe('Optional operational analytics', () => {
  it.each(['ALLOWED', 'DENIED', 'UNKNOWN', 'UNCONFIGURED'] as const)(
    'honors analytics.market.read %s independently of core',
    async (state) => {
      const service = createFixtureMarketService(marketFixtureContext(), state),
        read = vi.spyOn(service, 'analytics');
      render(<MarketAnalytics service={service} />);
      await screen.findByText(new RegExp(`Market analytics: ${state}`));
      if (state === 'ALLOWED') {
        await screen.findByText('Purchase count');
        expect(read).toHaveBeenCalled();
      } else expect(read).not.toHaveBeenCalled();
      expect(await service.configuration('1')).toMatchObject({ id: '1' });
      expect(document.body.textContent).not.toMatch(
        /GMV|revenue|attributed money|refund dollars|payout|profit|Customer count/i,
      );
    },
  );
  it.each([
    'ACTIVE',
    'STALE',
    'BUILDING',
    'RECONCILIATION_REQUIRED',
    'FAILED',
    'UNBUILT',
  ])('exposes %s freshness and source-asOf', async (projection) => {
    render(
      <MarketAnalytics
        service={createFixtureMarketService(
          marketFixtureContext(),
          'ALLOWED',
          'none',
          projection,
        )}
      />,
    );
    await screen.findByText(new RegExp(`Projection: ${projection}`));
    expect(document.body).toHaveTextContent('Source as of:');
    if (projection !== 'ACTIVE')
      expect(document.body).toHaveTextContent('This projection is not current');
  });
  it('uses generation-bound cursor and resets paging on range changes', async () => {
    const service = createFixtureMarketService(marketFixtureContext());
    const original = service.analytics;
    const read = vi
      .spyOn(service, 'analytics')
      .mockImplementation(async (id, range) => ({
        ...(await original(id, range)),
        nextCursor: range.after ? null : '1501:20',
      }));
    render(<MarketAnalytics service={service} />);
    await screen.findByText('Purchase count');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(read).toHaveBeenLastCalledWith(
        '1',
        expect.objectContaining({ after: '1501:20' }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply dates' }));
    await waitFor(() =>
      expect(read).toHaveBeenLastCalledWith(
        '1',
        expect.objectContaining({ after: null }),
      ),
    );
  });
  it('missing billing grant stays UNKNOWN and optional refusal rechecks core without revoking valid management', async () => {
    const context = marketFixtureContext(),
      authorityFailure = vi.fn();
    const service = createLiveMarketService(
      { ...context, permissions: ['ReadOwnMarket', 'ReadOwnMarketAnalytics'] },
      endpoint,
      'test',
      authorityFailure,
    );
    expect(await service.availability()).toBe('UNKNOWN');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) =>
      String(init?.body).includes('query MarketIdentity')
        ? response({ ownMarketIdentity: identity() })
        : denied(),
    );
    await expect(
      service.analytics('1', {
        start: '2026-10-01T00:00:00Z',
        end: '2026-11-01T00:00:00Z',
        take: 20,
        after: null,
      }),
    ).rejects.toMatchObject({ kind: 'entitlement' });
    expect(authorityFailure).not.toHaveBeenCalled();
  });
});

describe('Market tenant switching and authority loss', () => {
  it('ignores a late request from Market A after Market B starts loading', async () => {
    let resolveA!: (value: string) => void;
    const a = () =>
        new Promise<string>((resolve) => {
          resolveA = resolve;
        }),
      b = async () => 'Market B settings';
    function View({ id, read }: { id: string; read: () => Promise<string> }) {
      const result = useRead(id, read);
      return <p>{result.data ?? 'Loading'}</p>;
    }
    const view = render(<View id="1" read={a} />);
    view.rerender(<View id="2" read={b} />);
    await screen.findByText('Market B settings');
    await act(async () => resolveA('Market A settings'));
    expect(screen.queryByText('Market A settings')).toBeNull();
  });
  it.each([
    '/market',
    '/market/occurrences',
    '/market/vendors',
    '/market/operations',
    '/market/analytics',
    '/market/settings',
  ])('clears old tenant state at %s', async (path) => {
    window.history.replaceState(null, '', path);
    const contextA = marketFixtureContext('1'),
      contextB = marketFixtureContext('2');
    const a = createFixtureMarketService(contextA),
      b = createFixtureMarketService(contextB);
    const view = render(
      <AdminShell context={contextA} marketService={a} onLogout={() => {}} />,
    );
    await waitFor(() =>
      expect(screen.queryByText('Loading current records')).toBeNull(),
    );
    view.rerender(
      <AdminShell context={contextB} marketService={b} onLogout={() => {}} />,
    );
    expect(document.body).not.toHaveTextContent('Synthetic Market A');
    await waitFor(() =>
      expect(screen.queryByText('Loading current records')).toBeNull(),
    );
    expect(document.body).not.toHaveTextContent('Synthetic Market A');
  });
  it('next protected forbidden request clears loaded content and requires fresh bootstrap', async () => {
    let revoked = false;
    const fixture = createFixtureMarketService(marketFixtureContext());
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const query = (JSON.parse(String(init?.body)) as { query: string }).query;
      if (query.includes('query AdminSession'))
        return response({
          me: revoked
            ? {
                ...user,
                channels: user.channels.map((c) => ({
                  ...c,
                  permissions: ['Authenticated'],
                })),
              }
            : user,
        });
      if (revoked) return denied();
      if (query.includes('query MarketIdentity'))
        return response({ ownMarketIdentity: identity() });
      if (query.includes('query MarketConfiguration'))
        return response({ ownMarket: await fixture.configuration('1') });
      throw new Error('Unexpected mock operation');
    });
    window.history.replaceState(null, '', '/market/settings');
    render(<AdminApp endpoint={endpoint} />);
    await screen.findByLabelText('Market name');
    revoked = true;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh settings' }));
    await screen.findByRole('heading', { name: 'Workspace unavailable' });
    expect(screen.queryByLabelText('Market name')).toBeNull();
    expect(document.body).not.toHaveTextContent('Synthetic Market A');
    expect(document.body).not.toHaveTextContent(
      'private database/provider details',
    );
  });
  it('late pending core data cannot survive revocation within the same service', async () => {
    let resolveConfiguration!: (value: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (String(init?.body).includes('query MarketConfiguration'))
        return new Promise((resolve) => {
          resolveConfiguration = resolve;
        });
      return denied();
    });
    const failure = vi.fn(),
      service = createLiveMarketService(
        marketFixtureContext(),
        endpoint,
        'test',
        failure,
      );
    const pending = service.configuration('1');
    await expect(service.relationships('1')).rejects.toMatchObject({
      kind: 'forbidden',
    });
    resolveConfiguration(
      response({ ownMarket: createMarketFixtureData('1').configuration }),
    );
    await expect(pending).rejects.toMatchObject({ kind: 'forbidden' });
    expect(failure).toHaveBeenCalledTimes(1);
  });
});

// Compile-time separation: Market callers cannot acquire Vendor-owned mutation/catalog methods.
function typeContract(api: MarketApi) {
  // @ts-expect-error No Vendor fulfillment method exists on a Market factory.
  void api.fulfill;
  // @ts-expect-error No broad execution escape hatch exists.
  void api.execute;
}
void typeContract;
