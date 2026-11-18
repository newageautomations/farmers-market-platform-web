import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { DayView, PreparationView, DayRecap } from '@market/api';
import { DayActions } from '../apps/admin/src/market-day/DayActions';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';

const data: PreparationView = {
  occurrence: {
    id: 69,
    marketName: 'Market',
    startsAt: '2026-01-01T15:00:00Z',
    endsAt: '2026-01-01T19:00:00Z',
    timezone: 'America/Chicago',
    venue: 'Square',
    status: 'scheduled',
  },
  privateMarket: false,
  participation: 'confirmed',
  revision: 0,
  tasks: [],
  templates: [],
  appliedTemplates: [],
  readiness: 'Not Reported',
  confirmedAt: null,
  editable: true,
};
const view = (finished = false): DayView => ({
  serverNow: '2026-11-13T00:00:00Z',
  canFinish: true,
  canWrite: true,
  completion: {
    finished,
    revision: finished ? 1 : 0,
    history: finished
      ? [
          {
            action: 'FINISH',
            actorId: 1,
            at: '2026-11-13T00:00:00Z',
            revision: 1,
          },
        ]
      : [],
  },
  assistance: [],
});
const recap: DayRecap = {
  generatedAt: '2026-11-13T00:00:00Z',
  previousOccurrenceId: null,
  coverage: 'Canonical attributed purchases',
  metrics: [
    {
      key: 'sales',
      label: 'Net merchandise sales',
      value: 1200,
      currency: 'USD',
      previous: null,
    },
  ],
};
function vendor(finished = false) {
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  service.context = {
    ...service.context,
    permissions: service.context.permissions.filter(
      (p) => p !== 'ReadOwnOrders',
    ),
  };
  service.preparation = {
    read: vi.fn().mockResolvedValue(data),
    command: vi.fn(),
  };
  service.marketDay = {
    read: vi.fn().mockResolvedValue(view(finished)),
    command: vi.fn().mockResolvedValue(view(true)),
    recap: vi.fn().mockResolvedValue(recap),
  };
  return service;
}
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());

it('submits assistance with one retry key and prevents duplicate clicks', async () => {
  const service = vendor();
  service.marketDay!.command = vi
    .fn()
    .mockRejectedValueOnce(new Error('uncertain'))
    .mockResolvedValue(view());
  render(<DayActions vendor={service} data={data} phase="Market" />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Request assistance' }),
  );
  fireEvent.change(screen.getByLabelText('Brief description'), {
    target: { value: 'Canopy help' },
  });
  const send = screen.getByRole('button', { name: 'Send request' });
  fireEvent.click(send);
  fireEvent.click(send);
  await screen.findByText(
    'Request not confirmed. Retry keeps the same submission key.',
  );
  expect(service.marketDay!.command).toHaveBeenCalledTimes(1);
  fireEvent.click(send);
  await waitFor(() =>
    expect(service.marketDay!.command).toHaveBeenCalledTimes(2),
  );
  const calls = vi.mocked(service.marketDay!.command).mock.calls;
  expect(calls[0]).toEqual(calls[1]);
  expect(calls[0]![2]).toMatchObject({
    action: 'REQUEST',
    category: 'Booth',
    description: 'Canopy help',
  });
});
it('confirms warnings, keeps Finish on recap failure and retries only the recap', async () => {
  const service = vendor();
  service.marketDay!.recap = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(recap);
  render(<DayActions vendor={service} data={data} phase="Closing" />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Finish my market day' }),
  );
  await screen.findByText(/Uncollected preorder information unavailable/);
  expect(service.marketDay!.command).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm finish' }));
  await screen.findByText(
    'Your finished state is saved. Retry the recap without finishing again.',
  );
  expect(
    screen.getByRole('button', { name: 'Reopen market day' }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh records' }));
  expect(await screen.findByText('$12.00')).toBeVisible();
  expect(service.marketDay!.command).toHaveBeenCalledTimes(1);
});
it('revisits without replaying animation and preserves freely selectable phases', async () => {
  const service = vendor(true);
  const element = <DayActions vendor={service} data={data} phase="Closing" />;
  const result = render(element);
  fireEvent.click(await screen.findByRole('button', { name: 'View recap' }));
  await screen.findByText('$12.00');
  expect(result.container.querySelector('.market-day-recap-enter')).toBeNull();
  result.rerender(<DayActions vendor={service} data={data} phase="Setup" />);
  expect(screen.queryByRole('button', { name: 'View recap' })).toBeNull();
  result.rerender(element);
  expect(
    await screen.findByRole('button', { name: 'View recap' }),
  ).toBeVisible();
  expect(service.marketDay!.command).not.toHaveBeenCalled();
});
it('reopens using the displayed revision and keeps assistance on Market', async () => {
  const service = vendor(true);
  service.marketDay!.command = vi.fn().mockResolvedValue({
    ...view(),
    completion: { revision: 2, finished: false, history: [] },
  });
  render(<DayActions vendor={service} data={data} phase="Closing" />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Reopen market day' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm reopen' }));
  expect(
    await screen.findByRole('button', { name: 'Finish my market day' }),
  ).toBeVisible();
  expect(service.marketDay!.command).toHaveBeenCalledWith(
    'VENDOR',
    69,
    expect.objectContaining({ action: 'REOPEN', expectedRevision: 1 }),
  );
  expect(
    screen.queryByRole('region', { name: 'Your assistance requests' }),
  ).not.toBeInTheDocument();
});
it('omits private assistance and suppresses ineligible Finish', async () => {
  const service = vendor();
  service.marketDay!.read = vi
    .fn()
    .mockResolvedValue({ ...view(), canFinish: false });
  render(
    <DayActions
      vendor={service}
      data={{ ...data, privateMarket: true }}
      phase="Closing"
    />,
  );
  await screen.findByText(/Finish is available to authorized staff/);
  expect(
    screen.queryByRole('button', { name: 'Request assistance' }),
  ).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Finish my market day' }),
  ).toBeNull();
});
it('refreshes on focus and shows failed reads honestly', async () => {
  const service = vendor();
  render(<DayActions vendor={service} data={data} phase="Market" />);
  await screen.findByRole('button', { name: 'Request assistance' });
  service.marketDay!.read = vi.fn().mockRejectedValue(new Error('offline'));
  fireEvent.focus(window);
  await screen.findByText(/status may have changed/);
});
it('searches manager requests and resolves the selected detail using its revision', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  const request = {
    id: 8,
    vendor: 'Orchard',
    booth: 'B2',
    category: 'Booth',
    description: 'Tent assistance',
    status: 'OPEN' as const,
    revision: 3,
    createdAt: '2026-11-12T23:00:00Z',
    resolvedAt: null,
    resolvedBy: null,
  };
  service.marketDay = {
    read: vi.fn().mockResolvedValue({ ...view(), assistance: [request] }),
    recap: vi.fn().mockResolvedValue(recap),
    command: vi.fn().mockResolvedValue({
      ...view(),
      assistance: [
        {
          ...request,
          status: 'RESOLVED',
          revision: 4,
          resolvedAt: '2026-11-13T00:00:00Z',
          resolvedBy: 5,
        },
      ],
    }),
  };
  render(<DayActions market={service} data={data} phase="Market" />);
  // Each request is a row button opening its detail dialog.
  fireEvent.click(
    await screen.findByRole('button', { name: /Orchard · Booth B2/ }),
  );
  expect(screen.getByText('Tent assistance')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Resolve request' }));
  await screen.findByText(/Resolved .* by staff 5/);
  expect(service.marketDay.command).toHaveBeenCalledWith(
    'MANAGER',
    69,
    expect.objectContaining({
      action: 'RESOLVE',
      requestId: 8,
      expectedRevision: 3,
    }),
  );
  fireEvent.change(
    screen.getByRole('searchbox', { name: 'Search assistance requests' }),
    { target: { value: 'absent' } },
  );
  expect(
    screen.queryByRole('button', { name: /Orchard · Booth B2/ }),
  ).toBeNull();
});
it('does not silently replace the confirmed revision when focus reads a newer completion', async () => {
  const service = vendor();
  render(<DayActions vendor={service} data={data} phase="Closing" />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Finish my market day' }),
  );
  await screen.findByText(/Uncollected preorder information unavailable/);
  service.marketDay!.read = vi.fn().mockResolvedValue({
    ...view(),
    completion: { revision: 2, finished: false, history: [] },
  });
  fireEvent.focus(window);
  await waitFor(() => expect(service.marketDay!.read).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Confirm finish' }));
  await waitFor(() =>
    expect(service.marketDay!.command).toHaveBeenCalledWith(
      'VENDOR',
      69,
      expect.objectContaining({ expectedRevision: 0 }),
    ),
  );
});

it('omits zero vendor warnings and outstanding-work copy when nothing remains', async () => {
  const service = vendor();
  service.context = {
    ...service.context,
    permissions: [...service.context.permissions, 'ReadOwnOrders'],
  };
  service.orders = vi.fn().mockResolvedValue({ items: [], totalItems: 0 });
  service.packing = undefined;
  render(<DayActions vendor={service} data={data} phase="Closing" />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Finish my market day' }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Confirm finish' }),
    ).toBeEnabled(),
  );
  const dialog = screen.getByRole('dialog', { name: 'Finish my market day?' });
  expect(dialog.querySelector('.day-confirm-warnings')).toBeNull();
  expect(dialog).not.toHaveTextContent('Outstanding work');
  expect(dialog).not.toHaveTextContent('0 open closing tasks');
  expect(dialog).not.toHaveTextContent('0 uncollected preorder purchases');
});

it('keeps positive warnings while omitting zero manager counts', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  service.preparation = {
    read: vi
      .fn()
      .mockResolvedValue({
        ...data,
        operationsSummary: {
          assignedBooths: 0,
          unassignedBooths: 0,
          outstandingInvoices: 2,
        },
      }),
    command: vi.fn(),
  };
  service.marketDay = {
    read: vi.fn().mockResolvedValue(view()),
    command: vi.fn(),
    recap: vi
      .fn()
      .mockResolvedValue({
        ...recap,
        metrics: [
          { key: 'attendance', label: 'Attendance', value: 0, previous: null },
        ],
      }),
  };
  render(<DayActions market={service} data={data} phase="Closing" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Finish market' }));
  expect(await screen.findByText('2 invoices need follow-up.')).toBeVisible();
  const dialog = screen.getByRole('dialog', { name: 'Finish market?' });
  expect(dialog).toHaveTextContent('Outstanding work is a warning.');
  expect(dialog).not.toHaveTextContent('0 open closing tasks');
  expect(dialog).not.toHaveTextContent('0 unresolved assistance');
  expect(dialog).not.toHaveTextContent('0 recorded attendance');
});
