import { AdminShell } from '../apps/admin/src/AdminShell';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import {
  preparationIsDue,
  PreparationWorkspace,
} from '../apps/admin/src/preparation/PreparationWorkspace';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { PreparationApi, PreparationView } from '@market/api';
import { AppError, createPreparationApi } from '@market/api';
import {
  PreparationPage,
  paymentStatus,
} from '../apps/admin/src/preparation/PreparationPage';

function fixture(patch: Partial<PreparationView> = {}): PreparationView {
  return {
    occurrence: {
      id: 10,
      marketName: 'Saturday market',
      startsAt: '2027-03-06T15:00:00Z',
      endsAt: '2027-03-06T19:00:00Z',
      timezone: 'America/Chicago',
      venue: 'Town square',
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
    assignments: [],
    sourceVersion: 'source-1',
    ...patch,
  };
}
function api(view = fixture()): PreparationApi {
  return {
    read: vi.fn().mockResolvedValue(view),
    command: vi.fn().mockResolvedValue({ ...view, revision: 1 }),
  };
}
const props = {
  scope: 'VENDOR' as const,
  occurrenceId: 10,
  back: '/vendor/markets/1/dates/10',
  canManage: true,
};

it('does not infer readiness or zero packing progress from missing sources', async () => {
  render(<PreparationPage {...props} api={api()} />);
  expect(await screen.findByText('Not shared yet')).toBeInTheDocument();
  expect(
    screen.getByText('Let the market know when you are ready.'),
  ).toBeInTheDocument();
  const facts = screen.getByRole('region', { name: 'Your market details' });
  expect(within(facts).getByText('Unavailable')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Open packing list' }),
  ).toHaveAttribute('href', '/vendor/orders/packing?occurrence=10');
  expect(paymentStatus(undefined)).toBe('Unavailable');
  expect(paymentStatus([])).toBe('Unknown (no invoice)');
  expect(
    paymentStatus([{ status: 'OPEN', totalMinor: 1000, paidMinor: 0 }]),
  ).toBe('Incomplete');
  expect(
    paymentStatus([{ status: 'DRAFT', totalMinor: 0, paidMinor: 0 }]),
  ).toContain('draft');
});

it('saves task completion without navigation or a full reload', async () => {
  const view = fixture({
    tasks: [
      {
        id: 'task-1',
        title: 'Charge reader',
        completedAt: null,
        createdAt: '2026-11-13T00:00:00Z',
        updatedAt: '2026-11-13T00:00:00Z',
      },
    ],
  });
  const service = api(view);
  vi.mocked(service.command).mockResolvedValue({
    ...view,
    revision: 1,
    tasks: [{ ...view.tasks[0]!, completedAt: '2026-11-13T01:00:00Z' }],
  });
  render(<PreparationPage {...props} api={service} />);
  fireEvent.click(
    await screen.findByRole('checkbox', { name: 'Charge reader' }),
  );
  await waitFor(() =>
    expect(service.command).toHaveBeenCalledWith('VENDOR', 10, 0, {
      action: 'COMPLETE',
      taskId: 'task-1',
      complete: true,
      sourceVersion: 'source-1',
    }),
  );
  expect(await screen.findByText('1 / 1 tasks complete')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Charge reader' })).toBeChecked();
});

it('shows unfinished tasks and source states before readiness confirmation', async () => {
  const service = api(
    fixture({
      tasks: [
        {
          id: 'a',
          title: 'Optional signage',
          completedAt: null,
          createdAt: '2026-11-13T00:00:00Z',
          updatedAt: '2026-11-13T00:00:00Z',
        },
      ],
    }),
  );
  render(<PreparationPage {...props} api={service} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mark ready' }));
  const dialog = await screen.findByRole('dialog', {
    name: 'Confirm your readiness',
  });
  expect(
    within(dialog).getByText('1 task left to complete.'),
  ).toBeInTheDocument();
  expect(service.command).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'I am ready' }));
  await waitFor(() =>
    expect(service.command).toHaveBeenCalledWith('VENDOR', 10, 0, {
      action: 'DECLARE',
      ready: true,
      sourceVersion: 'source-1',
    }),
  );
});

it('reports save failures and refreshes authoritative state', async () => {
  const service = api();
  vi.mocked(service.command).mockRejectedValue(new AppError('conflict'));
  render(<PreparationPage {...props} api={service} />);
  await screen.findByText('Not shared yet');
  fireEvent.change(screen.getByLabelText('New task'), {
    target: { value: 'Canopy' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
  expect(
    await screen.findByText(/Preparation changed in another session/),
  ).toBeInTheDocument();
  await waitFor(() => expect(service.read).toHaveBeenCalledTimes(2));
});

it('keeps private market operations not applicable and prevents template reapplication', async () => {
  const service = api(
    fixture({
      privateMarket: true,
      assignments: null,
      templates: [{ id: 7, name: 'Saturday', revision: 2, titles: ['Signs'] }],
      appliedTemplates: ['7'],
    }),
  );
  render(<PreparationPage {...props} api={service} />);
  expect(
    await screen.findByRole('button', { name: 'Applied to this date' }),
  ).toBeDisabled();
  expect(
    within(
      screen.getByRole('region', { name: 'Your market details' }),
    ).getAllByText('Not needed'),
  ).toHaveLength(3);
  expect(
    screen.queryByRole('link', { name: 'View booth and invoices' }),
  ).not.toBeInTheDocument();
});

it('renders a searchable manager projection without vendor checklist controls', async () => {
  const service = api(
    fixture({
      vendors: [
        {
          vendorId: 1,
          name: 'Manna example',
          participation: 'confirmed',
          readiness: 'Needs Reconfirmation',
          confirmedAt: null,
          booths: [],
          invoices: null,
          rentals: [],
        },
      ],
    }),
  );
  render(<PreparationPage {...props} scope="MANAGER" api={service} />);
  expect(
    await screen.findByRole('table', { name: 'Vendor preparation readiness' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Manna example')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Mark ready' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('Your preparation checklist'),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Payment summary unavailable/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search vendors' }), {
    target: { value: 'no match' },
  });
  expect(screen.queryByText('Manna example')).not.toBeInTheDocument();
});

it('locks cancelled checklists and retains their saved tasks', async () => {
  render(
    <PreparationPage
      {...props}
      api={api(
        fixture({
          editable: false,
          occurrence: { ...fixture().occurrence, status: 'cancelled' },
          tasks: [
            {
              id: 'a',
              title: 'Saved task',
              completedAt: null,
              createdAt: '2026-11-13T00:00:00Z',
              updatedAt: '2026-11-13T00:00:00Z',
            },
          ],
        }),
      )}
    />,
  );
  expect(
    await screen.findByRole('checkbox', { name: 'Saved task' }),
  ).toBeDisabled();
  expect(
    screen.queryByRole('button', { name: 'Mark ready' }),
  ).not.toBeInTheDocument();
});

it('includes external businesses without treating them as unreported vendor readiness', async () => {
  render(
    <PreparationPage
      {...props}
      scope="MANAGER"
      api={api(
        fixture({
          operationsSummary: {
            assignedBooths: 1,
            unassignedBooths: null,
            outstandingInvoices: null,
          },
          vendors: [
            {
              vendorId: null,
              directoryId: 20,
              name: 'External bakery',
              participation: 'confirmed',
              readiness: 'Not Applicable',
              confirmedAt: null,
              booths: ['B1'],
              invoices: [],
              rentals: [],
            },
          ],
        }),
      )}
    />,
  );
  expect(await screen.findByText('External bakery')).toBeInTheDocument();
  expect(screen.getByText('Not needed')).toBeInTheDocument();
  expect(screen.getByText(/Choose a layout/)).toBeInTheDocument();
  expect(screen.getByText(/0 not shared yet/)).toBeInTheDocument();
});

it('rejects malformed preparation responses through the named API adapter', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ data: { ownMarketPreparation: { tasks: [] } } }),
        { status: 200 },
      ),
    );
  await expect(
    createPreparationApi({
      endpoint: 'http://localhost:3000/admin-api',
      fetch: fetcher,
    }).read('VENDOR', 10),
  ).rejects.toBeInstanceOf(AppError);
});

it('keeps templates inside the checklist and removes the old back link', async () => {
  render(<PreparationPage {...props} api={api()} />);
  const checklist = await screen.findByRole('region', {
    name: 'Your preparation checklist',
  });
  expect(
    within(checklist).getByRole('button', { name: 'Create template' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'Back to market date' }),
  ).not.toBeInTheDocument();
});

it('shows preparation on the previous local calendar day and through market day', () => {
  const date = {
    id: 1,
    name: 'Market',
    startsAt: '2026-11-13T15:00:00Z',
    endsAt: '2026-11-13T19:00:00Z',
    timezone: 'America/Chicago',
    href: '/market/preparation/1',
  };
  expect(preparationIsDue(date, Date.parse('2026-11-12T05:59:00Z'))).toBe(
    false,
  );
  expect(preparationIsDue(date, Date.parse('2026-11-12T06:00:00Z'))).toBe(true);
  expect(preparationIsDue(date, Date.parse('2026-11-13T17:00:00Z'))).toBe(true);
  expect(preparationIsDue(date, Date.parse(date.endsAt))).toBe(false);
  const dst = {
    ...date,
    startsAt: '2027-03-14T14:00:00Z',
    endsAt: '2027-03-14T18:00:00Z',
  };
  expect(preparationIsDue(dst, Date.parse('2027-03-13T06:00:00Z'))).toBe(true);
});
it('opens the preparation workspace with a date choice rather than an assumed date', () => {
  render(
    <PreparationWorkspace
      dates={{
        data: [
          {
            id: 10,
            name: 'Saturday market',
            startsAt: '2027-03-06T15:00:00Z',
            endsAt: '2027-03-06T19:00:00Z',
            timezone: 'America/Chicago',
            href: '/market/preparation/10',
          },
        ],
        loading: false,
        refresh: vi.fn(),
        error: undefined,
        due: true,
      }}
    />,
  );
  expect(screen.getByLabelText('Market date')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Market date'), {
    target: { value: '10' },
  });
  expect(window.location.pathname).toBe('/market/preparation/10');
  window.history.replaceState(null, '', '/');
});

it('places preparation above the market dashboard and opens the selected date', async () => {
  const context = marketFixtureContext();
  context.permissions = [...context.permissions, 'ReadOwnMarketAssignments'];
  const service = createFixtureMarketService(context);
  const sample = await service.occurrencePage();
  const startsAt = new Date(Date.now() + 86400000).toISOString();
  const endsAt = new Date(Date.now() + 90000000).toISOString();
  service.occurrencePage = vi
    .fn()
    .mockResolvedValue({
      ...sample,
      items: [
        {
          ...sample.items[0],
          id: '10',
          startsAt,
          endsAt,
          timezone: 'America/Chicago',
          status: 'scheduled',
        },
      ],
      totalItems: 1,
    });
  service.preparation = api();
  window.history.replaceState(null, '', '/market/preparation');
  render(
    <AdminShell
      context={context}
      marketService={service}
      onLogout={() => {}}
    />,
  );
  const picker = await screen.findByLabelText('Market date');
  await waitFor(() =>
    expect(within(picker).getAllByRole('option')).toHaveLength(2),
  );
  const navigation = screen.getAllByRole('navigation', {
    name: 'Workspace navigation',
  })[0]!;
  const links = within(navigation).getAllByRole('link');
  expect(links[0]).toHaveAccessibleName('Market Preparation');
  expect(links[1]).toHaveAccessibleName('Overview');
  fireEvent.change(picker, { target: { value: '10' } });
  expect(
    await screen.findByRole('region', { name: 'Saturday market' }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe('/market/preparation/10');
  window.history.replaceState(null, '', '/');
});
