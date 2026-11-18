import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  AppError,
  type AttendanceApi,
  type AttendancePage,
  type PreparationView,
} from '@market/api';
import { routeAllowed } from '@market/admin-core';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import {
  DayPickups,
  ManagerMarketDay,
  VendorMarketDay,
} from '../apps/admin/src/market-day/MarketDayWorkspace';
import { PreparationPage } from '../apps/admin/src/preparation/PreparationPage';
import type { PreparationDates } from '../apps/admin/src/preparation/PreparationWorkspace';
import { Attendance } from '../apps/admin/src/market/phase14/Attendance';

const dates: PreparationDates = {
  data: [],
  due: false,
  loading: false,
  error: undefined,
  refresh: vi.fn(),
};
const view = (patch: Partial<PreparationView> = {}): PreparationView => ({
  occurrence: {
    id: 69,
    marketName: 'Boerne Market',
    startsAt: '2026-11-13T14:00:00Z',
    endsAt: '2026-11-13T19:00:00Z',
    timezone: 'America/Chicago',
    venue: 'Town square',
    status: 'scheduled',
  },
  privateMarket: false,
  participation: 'confirmed',
  revision: 3,
  tasks: [],
  templates: [],
  appliedTemplates: [],
  readiness: 'Not Reported',
  confirmedAt: null,
  editable: true,
  assignments: [],
  sourceVersion: 'current',
  ...patch,
});
function attendance(): AttendanceApi {
  const page: AttendancePage = {
    items: [
      {
        id: 5,
        occurrenceId: 69,
        vendorId: 1,
        directoryId: null,
        revision: 4,
        status: 'AWAITING',
        expected: true,
        snapshot: {
          marketName: 'Boerne Market',
          businessName: 'Orchard',
          startsAt: view().occurrence.startsAt,
          endsAt: view().occurrence.endsAt,
          timezone: 'America/Chicago',
          venue: 'Town square',
          booth: null,
          bookingStatus: 'confirmed',
        },
        checkedInAt: null,
        finalizedAt: null,
        occurrenceStatus: 'scheduled',
        canSelfCheckIn: true,
      },
    ],
    totalItems: 1,
    counts: { expected: 1, AWAITING: 1, CHECKED_IN: 0 },
    session: {
      revision: 1,
      finalizedAt: null,
      finalizedBy: null,
      finalCounts: null,
    },
    occurrence: view().occurrence,
    serverNow: '2026-11-13T15:00:00Z',
  };
  return {
    read: vi.fn().mockResolvedValue(page),
    vendor: vi.fn().mockResolvedValue(page),
    command: vi.fn().mockResolvedValue({}),
    selfCheckIn: vi.fn().mockResolvedValue({}),
  };
}
function vendor(data = view()) {
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  service.preparation = {
    read: vi.fn().mockResolvedValue(data),
    command: vi.fn().mockResolvedValue(data),
  };
  service.marketAttendance = attendance();
  service.packing = undefined;
  return service;
}
beforeEach(() => {
  window.history.replaceState(null, '', '/vendor/day/69');
  vi.stubGlobal('crypto', webcrypto);
});
afterEach(() => vi.unstubAllGlobals());

it('keeps phases freely selectable without attendance, readiness or lifecycle mutations', async () => {
  const service = vendor();
  service.pos = {} as NonNullable<typeof service.pos>;
  service.context = {
    ...service.context,
    permissions: [...service.context.permissions, 'OperateOwnPos'],
  };
  service.orders = vi.fn().mockResolvedValue({ items: [], totalItems: 0 });
  render(<VendorMarketDay service={service} occurrenceId={69} dates={dates} />);
  const nav = await screen.findByRole('navigation', { name: 'Boerne Market' });
  fireEvent.click(within(nav).getByRole('link', { name: 'Closing' }));
  expect(
    await screen.findByRole('region', { name: 'Closing checklist' }),
  ).toBeVisible();
  fireEvent.click(within(nav).getByRole('link', { name: 'Market' }));
  expect(await screen.findByText('No outstanding pickups')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open POS' })).toHaveAttribute(
    'href',
    '/vendor/pos?occurrence=69',
  );
  fireEvent.click(within(nav).getByRole('link', { name: 'Setup' }));
  expect(await screen.findByRole('button', { name: 'Check in' })).toBeVisible();
  expect(service.preparation!.command).not.toHaveBeenCalled();
  expect(service.marketAttendance!.command).not.toHaveBeenCalled();
  expect(service.marketAttendance!.selfCheckIn).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('#setup');
});

it('self-checks in through the existing revision contract without declaring readiness', async () => {
  const service = vendor();
  render(<VendorMarketDay service={service} occurrenceId={69} dates={dates} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Check in' }));
  await waitFor(() =>
    expect(service.marketAttendance!.selfCheckIn).toHaveBeenCalledWith(69, 4),
  );
  expect(service.preparation!.command).not.toHaveBeenCalled();
});

it('uses the private owning-vendor projection without manager attendance or booth requirements', async () => {
  const service = vendor(view({ privateMarket: true }));
  render(<VendorMarketDay service={service} occurrenceId={69} dates={dates} />);
  expect(await screen.findByText(/Private vendor-managed date/)).toBeVisible();
  expect(service.preparation!.read).toHaveBeenCalledWith('VENDOR', 69);
  expect(service.marketAttendance!.vendor).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Check in' })).toBeNull();
});

it('fails closed on denied or mismatched occurrence reads', async () => {
  const service = vendor(
    view({ occurrence: { ...view().occurrence, id: 74 } }),
  );
  const result = render(
    <VendorMarketDay service={service} occurrenceId={69} dates={dates} />,
  );
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('navigation', { name: 'Boerne Market' }),
  ).toBeNull();
  result.unmount();
  service.preparation!.read = vi
    .fn()
    .mockRejectedValue(new AppError('forbidden'));
  render(<VendorMarketDay service={service} occurrenceId={69} dates={dates} />);
  await screen.findByRole('alert');
  expect(service.marketAttendance!.vendor).not.toHaveBeenCalled();
});

it('keeps old tasks in Setup and saves Closing tasks in the same Phase B record', async () => {
  const tasks = ['Charge reader', '[Closing] Pack canopy'].map((title, i) => ({
    id: String(i),
    title,
    completedAt: null,
    createdAt: '2026-11-12T00:00:00Z',
    updatedAt: '2026-11-12T00:00:00Z',
  }));
  const service = vendor(view({ tasks }));
  const result = render(
    <PreparationPage
      api={service.preparation}
      scope="VENDOR"
      occurrenceId={69}
      taskPhase="Setup"
      canManage
    />,
  );
  expect(
    await screen.findByRole('checkbox', { name: 'Charge reader' }),
  ).toBeVisible();
  expect(screen.queryByRole('checkbox', { name: 'Pack canopy' })).toBeNull();
  result.unmount();
  render(
    <PreparationPage
      api={service.preparation}
      scope="VENDOR"
      occurrenceId={69}
      taskPhase="Closing"
      canManage
    />,
  );
  // The Phase B `[Closing] ` marker stays in the saved title, not the label.
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Pack canopy' }));
  await waitFor(() =>
    expect(service.preparation!.command).toHaveBeenCalledWith('VENDOR', 69, 3, {
      action: 'COMPLETE',
      taskId: '1',
      complete: true,
      sourceVersion: 'current',
    }),
  );
  fireEvent.change(screen.getByLabelText('New task'), {
    target: { value: 'Clean booth' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
  await waitFor(() =>
    expect(service.preparation!.command).toHaveBeenCalledWith(
      'VENDOR',
      69,
      3,
      expect.objectContaining({
        action: 'ADD',
        title: '[Closing] Clean booth',
      }),
    ),
  );
});

it('keeps manager phases independent and gates payment navigation', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  service.context = {
    ...marketFixtureContext(),
    permissions: ['ReadOwnMarket', 'ReadOwnMarketAssignments'],
  };
  service.preparation = {
    read: vi.fn().mockResolvedValue(view({ vendors: [] })),
    command: vi.fn(),
  };
  service.phase14 = undefined;
  window.history.replaceState(null, '', '/market/day/69#closing');
  render(
    <ManagerMarketDay service={service} occurrenceId={69} dates={dates} />,
  );
  expect(
    await screen.findByRole('region', { name: 'Closing checklist' }),
  ).toBeVisible();
  expect(service.preparation.read).toHaveBeenCalledWith('MANAGER', 69);
  expect(
    screen.queryByRole('link', { name: 'Invoices and payments' }),
  ).toBeNull();
  expect(
    screen.queryByText('Invoices needing attention'),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('Confirmed vendors')).not.toBeInTheDocument();
  const nav = screen.getByRole('navigation', { name: 'Boerne Market' });
  fireEvent.click(within(nav).getByRole('link', { name: 'Setup' }));
  expect(await screen.findByText('Invoices needing attention')).toBeVisible();
  expect(screen.getByText('Confirmed vendors')).toBeVisible();
  expect(screen.getByText('Booth information unavailable')).toBeVisible();
  fireEvent.click(within(nav).getByRole('link', { name: 'Market' }));
  expect(
    screen.queryByText('Invoices needing attention'),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('Confirmed vendors')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Refresh information' }),
  ).toBeNull();
  expect(screen.queryByRole('link', { name: 'Market overview' })).toBeNull();
  expect(service.preparation.command).not.toHaveBeenCalled();
});

it('retains manager quick check-in revisions and disables writes without the grant', async () => {
  const api = attendance();
  const result = render(
    <Attendance api={api} occurrenceId={69} compact canManage />,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Check in' }));
  await waitFor(() =>
    expect(api.command).toHaveBeenCalledWith({
      action: 'UPDATE',
      occurrenceId: 69,
      id: 5,
      expectedRevision: 4,
      status: 'CHECKED_IN',
    }),
  );
  result.unmount();
  render(<Attendance api={api} occurrenceId={69} compact canManage={false} />);
  await screen.findByText(/1 expected vendors/);
  expect(screen.queryByRole('button', { name: 'Check in' })).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Finalize attendance' }),
  ).toBeDisabled();
});

it('isolates pickup rows and uses canonical handoff validation and fulfillment', async () => {
  const service = vendor();
  service.context = {
    ...service.context,
    permissions: ['ReadOwnOrders', 'FulfillOwnOrders'],
  };
  const source = await service.order('1401');
  const order = {
    ...source,
    portion: {
      ...source.portion,
      kind: 'MARKET_OCCURRENCE',
      occurrenceId: '69',
      vendorId: service.vendorId,
      nativeState: 'PaymentSettled',
      pickupStatus: 'PENDING',
      remainingQuantity: 1,
      lines: source.portion.lines
        .slice(0, 1)
        .map((l) => ({ ...l, remainingQuantity: 1 })),
    },
  };
  const other = {
    ...order,
    portion: {
      ...order.portion,
      operationalOrderId: 'other-date',
      occurrenceId: '74',
    },
  };
  service.orders = vi
    .fn()
    .mockResolvedValue({ items: [order, other], totalItems: 2 });
  service.order = vi.fn().mockResolvedValue(order);
  service.fulfill = vi.fn().mockResolvedValue({});
  render(<DayPickups service={service} occurrenceId={69} />);
  const table = await screen.findByRole('table', {
    name: 'Occurrence pickup orders',
  });
  expect(within(table).queryByText('other-date')).toBeNull();
  fireEvent.click(within(table).getByRole('button', { name: 'Review pickup' }));
  const dialog = await screen.findByRole('dialog', { name: 'Review pickup' });
  const gather = within(dialog).getByRole('checkbox', { name: /^Gather / });
  expect(gather).not.toBeChecked();
  fireEvent.click(gather);
  expect(gather).toBeChecked();
  expect(service.fulfill).not.toHaveBeenCalled();
  fireEvent.click(gather);
  expect(gather).not.toBeChecked();
  const fullOrder = within(dialog).getByRole('link', {
    name: 'View Full Order',
  });
  expect(fullOrder.parentElement).toBe(
    within(dialog).getByRole('link', { name: 'View packing list' })
      .parentElement,
  );
  const submit = within(dialog).getByRole('button', {
    name: 'Mark as Picked Up',
  });
  expect(submit).toBeDisabled();
  fireEvent.click(
    within(dialog).getByRole('checkbox', { name: /confirmed the customer/ }),
  );
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
  await waitFor(() =>
    expect(service.fulfill).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order.portion.operationalOrderId,
        quantity: 1,
      }),
    ),
  );
});

it('inherits existing workspace visibility for occurrence deep links and history', () => {
  expect(routeAllowed(fixtureContexts.VENDOR, '/vendor/day/69')).toBe(true);
  expect(routeAllowed(fixtureContexts.VENDOR, '/vendor/day/history')).toBe(
    true,
  );
  expect(
    routeAllowed(
      { ...fixtureContexts.VENDOR, permissions: [] },
      '/vendor/day/69',
    ),
  ).toBe(false);
});

it('lists manager attendance with payment status and the selected vendor panel', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  service.context = {
    ...marketFixtureContext(),
    permissions: [
      'ReadOwnMarket',
      'ReadOwnMarketAssignments',
      'OperateOwnMarketDay',
    ],
  };
  service.preparation = {
    read: vi.fn().mockResolvedValue(
      view({
        vendors: [
          {
            vendorId: 1,
            name: 'Orchard',
            participation: 'confirmed',
            readiness: 'Ready',
            confirmedAt: null,
            booths: [],
            invoices: [
              {
                status: 'OPEN',
                totalMinor: 1000,
                paidMinor: 0,
                currency: 'USD',
              },
            ],
            rentals: [{ name: 'Folding Table', quantity: 2 }],
          },
        ],
      }),
    ),
    command: vi.fn(),
  };
  const api = attendance();
  service.phase14 = {
    read: vi.fn().mockRejectedValue(new AppError('forbidden')),
    command: vi.fn(),
    attendance: api,
  } as unknown as typeof service.phase14;
  window.history.replaceState(null, '', '/market/day/69');
  render(
    <ManagerMarketDay service={service} occurrenceId={69} dates={dates} />,
  );
  const table = await screen.findByRole('table', { name: 'Vendor attendance' });
  expect(
    within(table).getByRole('columnheader', { name: 'Payment' }),
  ).toBeVisible();
  expect(within(table).getByText('Payment due')).toBeVisible();
  const panel = screen.getByRole('region', { name: 'Vendor details' });
  // Equipment is summarized in the panel and listed in a dialog.
  expect(within(panel).getByText('1 item · 2 units')).toBeVisible();
  fireEvent.click(
    within(panel).getByRole('button', { name: 'View equipment' }),
  );
  const equipment = await screen.findByRole('dialog', {
    name: 'Orchard equipment',
  });
  expect(within(equipment).getByText('Folding Table')).toBeVisible();
  fireEvent.click(within(equipment).getByRole('button', { name: 'Close' }));
  expect(
    screen.getByRole('button', { name: 'Finalize attendance' }),
  ).toBeEnabled();
  fireEvent.click(
    within(table).getByRole('button', { name: 'Check in Orchard' }),
  );
  await waitFor(() =>
    expect(api.command).toHaveBeenCalledWith({
      action: 'UPDATE',
      occurrenceId: 69,
      id: 5,
      expectedRevision: 4,
      status: 'CHECKED_IN',
    }),
  );
});

it('opens Market for the vendor only after their own check-in and setup are complete', async () => {
  const service = vendor(
    view({
      tasks: [
        {
          id: 'setup',
          title: 'Ready booth',
          completedAt: '2026-11-13T14:00:00Z',
          createdAt: '',
          updatedAt: '',
        },
      ],
    }),
  );
  const page = await service.marketAttendance!.vendor({ occurrenceId: 69 });
  service.marketAttendance!.vendor = vi.fn().mockResolvedValue({
    ...page,
    items: page.items.map((row) => ({ ...row, status: 'CHECKED_IN' })),
  });
  render(<VendorMarketDay service={service} occurrenceId={69} dates={dates} />);
  expect(await screen.findByText('No outstanding pickups')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Check in' }),
  ).not.toBeInTheDocument();
});

it('keeps a vendor in Setup when their own attendance is incomplete', async () => {
  const service = vendor(
    view({
      tasks: [
        {
          id: 'setup',
          title: 'Ready booth',
          completedAt: '2026-11-13T14:00:00Z',
          createdAt: '',
          updatedAt: '',
        },
      ],
    }),
  );
  render(<VendorMarketDay service={service} occurrenceId={69} dates={dates} />);
  expect(await screen.findByRole('button', { name: 'Check in' })).toBeVisible();
  expect(screen.queryByText('No outstanding pickups')).not.toBeInTheDocument();
});

it('opens manager Market from their checklist without waiting for vendor attendance', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  service.preparation = {
    read: vi.fn().mockResolvedValue(
      view({
        tasks: [
          {
            id: 'manager',
            title: 'Open gates',
            completedAt: '2026-11-13T14:00:00Z',
            createdAt: '',
            updatedAt: '',
          },
        ],
      }),
    ),
    command: vi.fn(),
  };
  render(
    <ManagerMarketDay service={service} occurrenceId={69} dates={dates} />,
  );
  const nav = await screen.findByRole('navigation', { name: 'Boerne Market' });
  await waitFor(() =>
    expect(within(nav).getByRole('link', { name: 'Market' })).toHaveAttribute(
      'aria-current',
      'page',
    ),
  );
  expect(
    screen.queryByRole('region', { name: 'Vendor attendance' }),
  ).not.toBeInTheDocument();
});

it('selects the active market before the next date when entering Market Day', async () => {
  const now = Date.now();
  const occurrence = (id: number, start: number, end: number) => ({
    id,
    name: 'Market',
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    timezone: 'America/Chicago',
    href: '',
  });
  render(
    <VendorMarketDay
      service={vendor()}
      dates={{
        ...dates,
        data: [
          occurrence(70, now + 86400000, now + 90000000),
          occurrence(69, now - 3600000, now + 3600000),
        ],
      }}
    />,
  );
  await waitFor(() => expect(window.location.pathname).toBe('/vendor/day/69'));
});

it('selects the next market when no market is active', async () => {
  window.history.replaceState(null, '', '/vendor/day');
  const now = Date.now();
  const occurrence = (id: number, start: number, end: number) => ({
    id,
    name: 'Market',
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    timezone: 'America/Chicago',
    href: '',
  });
  render(
    <VendorMarketDay
      service={vendor()}
      dates={{
        ...dates,
        data: [
          occurrence(71, now + 172800000, now + 176400000),
          occurrence(70, now + 86400000, now + 90000000),
        ],
      }}
    />,
  );
  await waitFor(() => expect(window.location.pathname).toBe('/vendor/day/70'));
});

it('keeps collected pickups underneath pending orders and shows total item quantities', async () => {
  const service = vendor();
  const source = await service.order('1401');
  const line = source.portion.lines[0]!;
  const pending = {
    ...source,
    portion: {
      ...source.portion,
      operationalOrderId: 'waiting',
      kind: 'MARKET_OCCURRENCE',
      occurrenceId: '69',
      vendorId: service.vendorId,
      nativeState: 'PaymentSettled',
      pickupStatus: 'PENDING',
      fulfilledQuantity: 0,
      remainingQuantity: 5,
      lines: [
        {
          ...line,
          operationalLineId: 'first',
          variantName: 'First produce',
          quantity: 2,
          fulfilledQuantity: 0,
          remainingQuantity: 2,
        },
        {
          ...line,
          operationalLineId: 'second',
          variantName: 'Second produce',
          quantity: 3,
          fulfilledQuantity: 0,
          remainingQuantity: 3,
        },
      ],
    },
  };
  const collected = {
    ...pending,
    portion: {
      ...pending.portion,
      operationalOrderId: 'collected',
      pickupStatus: 'COLLECTED',
      remainingQuantity: 0,
      fulfilledQuantity: 5,
      lines: pending.portion.lines.map((l) => ({
        ...l,
        remainingQuantity: 0,
        fulfilledQuantity: l.quantity,
      })),
    },
  };
  service.orders = vi
    .fn()
    .mockResolvedValue({ items: [collected, pending], totalItems: 2 });
  render(<DayPickups service={service} occurrenceId={69} />);
  const table = await screen.findByRole('table', {
    name: 'Occurrence pickup orders',
  });
  const rows = within(table).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(2);
  expect(within(rows[0]!).getByText('Awaiting Fulfillment')).toBeVisible();
  expect(within(rows[1]!).getByText('Picked up')).toBeVisible();
  for (const row of rows) expect(within(row).getByText('5')).toBeVisible();
  expect(within(table).queryByText('First produce')).not.toBeInTheDocument();
  fireEvent.click(
    within(rows[1]!).getByRole('button', { name: 'Review pickup' }),
  );
  const dialog = await screen.findByRole('dialog', { name: 'Review pickup' });
  expect(
    within(dialog).getByText('This order has been picked up.'),
  ).toBeVisible();
  expect(
    within(dialog).queryByRole('button', { name: 'Mark as Picked Up' }),
  ).not.toBeInTheDocument();
  for (const checkbox of within(dialog).getAllByRole('checkbox')) {
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  }
});
