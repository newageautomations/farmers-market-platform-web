import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { MarketOperationsApi } from '@market/api';
import { BoothSchedule } from '../apps/admin/src/market/phase14/BoothSchedule';
import { managerData } from './fixtures/market-dashboard-data';
function fixture() {
  const d = managerData();
  d.directory!.forEach((v) => (v.status = 'ACTIVE'));
  d.approvals = [
    {
      id: 1,
      marketId: 1,
      revision: 1,
      occurrenceId: 101,
      directoryId: 1,
      submissionId: null,
      decision: 'CONFIRMED',
      checkIn: 'NOT_CHECKED_IN',
      attendance: 'NOT_RECORDED',
      managerNotes: '',
    },
  ];
  d.physicalBooths = [
    { id: 7, marketId: 1, revision: 1, name: 'A01', retiredAt: null },
    { id: 8, marketId: 1, revision: 1, name: 'A02', retiredAt: null },
  ];
  d.assignments = [
    {
      id: 5,
      marketId: 1,
      revision: 1,
      directoryId: 1,
      occurrenceId: 101,
      spaceId: 1,
      approvalId: 1,
      recurringRuleId: 1,
      spaceSnapshot: d.spaces![0]!.details,
      businessSnapshot: d.directory![0]!.contact,
    },
  ];
  d.rules = [
    {
      id: 1,
      marketId: 1,
      revision: 2,
      directoryId: 1,
      physicalBoothId: 7,
      fromDate: '2027-05-15',
      throughDate: '2027-06-26',
    },
  ];
  d.cells = [
    {
      physicalBoothId: 7,
      occurrenceId: 101,
      spaceId: 1,
      label: 'A01',
      assignmentId: 5,
      status: 'ASSIGNED',
      reason: null,
    },
    {
      physicalBoothId: 8,
      occurrenceId: 101,
      spaceId: 2,
      label: 'A02',
      assignmentId: null,
      status: 'AVAILABLE',
      reason: null,
    },
    {
      physicalBoothId: 7,
      occurrenceId: 102,
      spaceId: 3,
      label: 'A01',
      assignmentId: null,
      status: 'AVAILABLE',
      reason: null,
    },
    {
      physicalBoothId: 8,
      occurrenceId: 102,
      spaceId: null,
      label: 'A02',
      assignmentId: null,
      status: 'UNAVAILABLE',
      reason: 'Absent from this layout',
    },
  ];
  return d;
}
function setup(command = vi.fn().mockResolvedValue({ id: 1 })) {
  const d = fixture();
  const api = {
    read: vi.fn().mockResolvedValue(d),
    command,
    vendorAssignments: vi.fn(),
  } satisfies MarketOperationsApi;
  render(<BoothSchedule api={api} canManage canBill />);
  return { api, d };
}
async function select(name: RegExp) {
  const buttons = await screen.findAllByRole('button', { name });
  fireEvent.click(buttons[0]!);
  return screen.findByRole('dialog', { name: /Booth A0/ });
}
it('loads a 30-day range, filters dates and explains absent booths without booking controls', async () => {
  const { api } = setup();
  await screen.findByText('Booths by market date');
  expect(api.read).toHaveBeenCalledWith(
    'SCHEDULE',
    undefined,
    expect.objectContaining({ mode: 'SCHEDULE' }),
  );
  const first = api.read.mock.calls[0]![2] as { from: string; through: string };
  expect(Date.parse(first.through) - Date.parse(first.from)).toBe(
    30 * 86400000,
  );
  fireEvent.change(screen.getByLabelText('Date window'), {
    target: { value: '60' },
  });
  await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2));
  const dialog = await select(/A02,.*Absent from this layout/);
  expect(within(dialog).getByText('Absent from this layout')).toBeVisible();
  expect(within(dialog).queryByLabelText('Vendor')).toBeNull();
  expect(
    within(dialog).getByRole('link', { name: /Market Day map/ }),
  ).toHaveAttribute('href', '/market/day/102');
});
it('moves an existing vendor to an available booth through the shared date-only command after confirmation', async () => {
  const { api } = setup();
  const dialog = await select(/A02,.*Available/);
  fireEvent.change(within(dialog).getByLabelText('Vendor'), {
    target: { value: '1' },
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Review assignment change' }),
  );
  expect(api.command).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirm assignment change' }),
  );
  await waitFor(() =>
    expect(api.command).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SCHEDULE_CHANGE',
        id: 5,
        data: expect.objectContaining({
          spaceId: 2,
          occurrenceId: 101,
          directoryId: 1,
          confirm: true,
        }),
      }),
    ),
  );
});
it('requires recurring preview and submits its token with the selected rule revision', async () => {
  const command = vi
    .fn()
    .mockResolvedValueOnce({
      previewToken: 'reviewed',
      preview: [
        {
          occurrenceId: 101,
          startsAt: '2027-05-15T14:00:00Z',
          status: 'EXCEPTION',
          change: 'None',
        },
      ],
    })
    .mockResolvedValue({ id: 1 });
  setup(command);
  const dialog = await select(/A01,.*Orchard Farm/);
  fireEvent.change(within(dialog).getByLabelText('Edit scope'), {
    target: { value: 'recurring' },
  });
  expect(
    within(dialog).queryByRole('button', {
      name: 'Confirm recurring assignment',
    }),
  ).toBeNull();
  fireEvent.click(
    within(dialog).getByRole('button', {
      name: 'Preview recurring assignment',
    }),
  );
  fireEvent.click(
    await within(dialog).findByRole('button', {
      name: 'Confirm recurring assignment',
    }),
  );
  await waitFor(() =>
    expect(command).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'SAVE_SCHEDULE_RULE',
        id: 1,
        expectedRevision: 2,
        data: expect.objectContaining({
          previewToken: 'reviewed',
          confirm: true,
        }),
      }),
    ),
  );
});
it('previews cancellation, preserves the reviewed token and sends the optional reason only on confirmation', async () => {
  const command = vi
    .fn()
    .mockResolvedValueOnce({ assignments: 1, previewToken: 'cancel-reviewed' })
    .mockResolvedValue({ cancelled: true });
  setup(command);
  const dialog = await select(/A01,.*Orchard Farm/);
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Cancel participation' }),
  );
  const confirmation = await screen.findByRole('dialog', {
    name: 'Cancel participation',
  });
  expect(command).toHaveBeenCalledTimes(1);
  expect(command.mock.calls[0]![0].data.preview).toBe(true);
  fireEvent.change(
    within(confirmation).getByLabelText('Cancellation note (optional)'),
    { target: { value: 'Called manager' } },
  );
  fireEvent.click(
    within(confirmation).getByRole('button', { name: 'Confirm cancellation' }),
  );
  await waitFor(() =>
    expect(command).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'CANCEL_PARTICIPATION',
        data: expect.objectContaining({
          reason: 'Called manager',
          previewToken: 'cancel-reviewed',
          confirm: true,
          occurrenceId: 101,
        }),
      }),
    ),
  );
});

it('requires a source choice before moving a vendor who already occupies multiple booths', async () => {
  const data = fixture();
  data.assignments!.push({
    ...data.assignments![0]!,
    id: 6,
    spaceId: 4,
    spaceSnapshot: { ...data.assignments![0]!.spaceSnapshot, label: 'A04' },
  });
  const api = {
    read: vi.fn().mockResolvedValue(data),
    command: vi.fn().mockResolvedValue({ id: 6 }),
    vendorAssignments: vi.fn(),
  } satisfies MarketOperationsApi;
  render(<BoothSchedule api={api} canManage canBill />);
  const dialog = await select(/A02,.*Available/);
  fireEvent.change(within(dialog).getByLabelText('Vendor'), {
    target: { value: '1' },
  });
  expect(
    within(dialog).getByRole('button', { name: 'Review assignment change' }),
  ).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText('Booth assignment to move'), {
    target: { value: '6' },
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Review assignment change' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirm assignment change' }),
  );
  await waitFor(() =>
    expect(api.command).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SCHEDULE_CHANGE', id: 6 }),
    ),
  );
});

it('clears stale editable cells when loading a changed date range fails', async () => {
  const { api } = setup();
  await screen.findByText('Booths by market date');
  api.read.mockRejectedValueOnce(new Error('Unavailable'));
  fireEvent.change(screen.getByLabelText('Date window'), {
    target: { value: '60' },
  });
  await screen.findByRole('alert');
  expect(screen.queryByText('Booths by market date')).toBeNull();
  expect(screen.queryByRole('button', { name: /A02,.*Available/ })).toBeNull();
});

it('anchors preset and custom dates to today with a 60-day maximum and date-only headers', async () => {
  const { api } = setup();
  await screen.findByText('Booths by market date');
  expect(screen.queryByLabelText('From date')).toBeNull();
  expect(screen.queryByLabelText('To date')).toBeNull();
  fireEvent.change(screen.getByLabelText('Date window'), {
    target: { value: 'custom' },
  });
  let from = screen.getByLabelText('From date') as HTMLInputElement;
  let to = screen.getByLabelText('To date') as HTMLInputElement;
  const today = from.value;
  const advance = (n: number) =>
    new Date(Date.parse(today) + n * 86400000).toISOString().slice(0, 10);
  expect(to.value).toBe(advance(30));
  expect(to.max).toBe(advance(60));
  expect(screen.queryByRole('button', { name: 'Previous dates' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Next dates' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Refresh schedule' })).toBeNull();
  expect(screen.queryByText(/Select a booth and date to manage/)).toBeNull();
  expect(
    screen.getByRole('columnheader', { name: 'Sat, May 15, 2027' }),
  ).toBeVisible();
  expect(
    screen
      .getAllByRole('columnheader')
      .every((h) => !/AM|PM|\d:\d/.test(h.textContent ?? '')),
  ).toBe(true);
  fireEvent.change(screen.getByLabelText('Date window'), {
    target: { value: '60' },
  });
  await waitFor(() =>
    expect(api.read).toHaveBeenLastCalledWith('SCHEDULE', undefined, {
      mode: 'SCHEDULE',
      from: today,
      through: advance(60),
    }),
  );
  expect(screen.queryByLabelText('From date')).toBeNull();
  expect(screen.queryByLabelText('To date')).toBeNull();
  fireEvent.change(screen.getByLabelText('Date window'), {
    target: { value: 'custom' },
  });
  from = screen.getByLabelText('From date') as HTMLInputElement;
  to = screen.getByLabelText('To date') as HTMLInputElement;
  fireEvent.change(from, { target: { value: advance(10) } });
  fireEvent.change(to, { target: { value: advance(20) } });
  await waitFor(() =>
    expect(api.read).toHaveBeenLastCalledWith('SCHEDULE', undefined, {
      mode: 'SCHEDULE',
      from: advance(10),
      through: advance(20),
    }),
  );
  expect(screen.getByLabelText('Date window')).toHaveValue('custom');
  const calls = api.read.mock.calls.length;
  fireEvent.change(to, { target: { value: advance(61) } });
  await screen.findByRole('alert');
  expect(api.read).toHaveBeenCalledTimes(calls);
  expect(screen.queryByText('Booths by market date')).toBeNull();
  fireEvent.change(screen.getByLabelText('Date window'), {
    target: { value: '30' },
  });
  await waitFor(() =>
    expect(api.read).toHaveBeenLastCalledWith('SCHEDULE', undefined, {
      mode: 'SCHEDULE',
      from: today,
      through: advance(30),
    }),
  );
});
