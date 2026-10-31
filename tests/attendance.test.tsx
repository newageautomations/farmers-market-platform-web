import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
  act,
} from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { AttendanceApi, AttendancePage, AttendanceRow } from '@market/api';
import {
  Attendance,
  AttendanceHistory,
  attendanceCsv,
} from '../apps/admin/src/market/phase14/Attendance';
import { VendorRoutes } from '../apps/admin/src/vendor/VendorRoutes';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';

const row: AttendanceRow = {
  id: 1,
  occurrenceId: 11,
  vendorId: 2,
  directoryId: 3,
  revision: 1,
  status: 'AWAITING',
  expected: true,
  snapshot: {
    marketName: 'Creekside Market',
    businessName: 'Orchard Farm',
    startsAt: '2026-10-29T14:00:00Z',
    endsAt: '2026-10-29T19:00:00Z',
    timezone: 'America/Chicago',
    venue: 'Market lawn',
    booth: 'A1',
    bookingStatus: 'Scheduled',
  },
  checkedInAt: null,
  finalizedAt: null,
  occurrenceStatus: 'scheduled',
  note: 'Private manager detail',
  audit: [],
};
function fixture(overrides: Partial<AttendancePage> = {}): AttendanceApi {
  const page: AttendancePage = {
    items: [row],
    totalItems: 1,
    counts: { expected: 1, AWAITING: 1, CHECKED_IN: 0, EXCUSED: 0, NO_SHOW: 0 },
    session: {
      revision: 1,
      finalizedAt: null,
      finalizedBy: null,
      finalCounts: null,
    },
    occurrence: {
      status: 'scheduled',
      startsAt: row.snapshot.startsAt,
      endsAt: row.snapshot.endsAt,
      timezone: row.snapshot.timezone,
    },
    serverNow: '2026-10-30T01:00:00Z',
    ...overrides,
  };
  return {
    read: vi.fn().mockResolvedValue(page),
    vendor: vi.fn().mockResolvedValue(page),
    selfCheckIn: vi.fn().mockResolvedValue({}),
    command: vi.fn().mockResolvedValue({}),
  };
}
it('checks in directly and keeps unresolved finalization explicit', async () => {
  const api = fixture();
  render(<Attendance api={api} occurrenceId={11} />);
  const checkIn = await screen.findByRole('button', { name: 'Check in' });
  await act(async () => {
    fireEvent.click(checkIn);
  });
  expect(api.command).toHaveBeenCalledWith({
    action: 'UPDATE',
    occurrenceId: 11,
    id: 1,
    expectedRevision: 1,
    status: 'CHECKED_IN',
  });
  fireEvent.click(
    await screen.findByRole('button', { name: 'Finalize attendance' }),
  );
  expect(
    await screen.findByText(/Resolve 1 awaiting arrival records explicitly/),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole('button', {
        name: 'Confirm finalization',
        hidden: true,
      }),
    ).toBeDisabled(),
  );
});
it('requires a confirmation for no-show and a reason for finalized corrections', async () => {
  const api = fixture();
  render(<Attendance api={api} occurrenceId={11} />);
  const business = await screen.findByRole('button', { name: 'Orchard Farm' });
  fireEvent.pointerUp(business.closest('tr')!, { button: 0 });
  fireEvent.change(screen.getByLabelText('Attendance status'), {
    target: { value: 'NO_SHOW' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save attendance' }));
  expect(api.command).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(
      await screen.findByRole('button', { name: 'Confirm change' }),
    );
  });
  expect(api.command).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'NO_SHOW', action: 'UPDATE' }),
  );
});
it('locks finalized ordinary edits and enables a required correction reason', async () => {
  const api = fixture({
    items: [
      { ...row, status: 'CHECKED_IN', finalizedAt: '2026-10-29T20:00:00Z' },
    ],
    session: {
      revision: 4,
      finalizedAt: '2026-10-29T20:00:00Z',
      finalizedBy: 2,
      finalCounts: {},
    },
  });
  render(<Attendance api={api} occurrenceId={11} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Orchard Farm' }));
  expect(screen.getByLabelText('Attendance status')).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Correct finalized record' }),
  );
  expect(screen.getByLabelText('Correction reason')).toBeRequired();
  expect(
    screen.getByRole('button', { name: 'Save attendance' }),
  ).toBeDisabled();
  expect(
    within(screen.getByLabelText('Attendance status')).queryByRole('option', {
      name: 'Awaiting arrival',
    }),
  ).toBeNull();
});
it('shows vendor schedule facts and statuses without manager controls or private details', async () => {
  const api = fixture();
  render(<AttendanceHistory api={api} vendor />);
  expect(await screen.findByText('Creekside Market')).toBeVisible();
  expect(screen.getByText('Market lawn · Booth A1')).toBeVisible();
  expect(
    screen.getAllByText('Awaiting arrival').some((el) => el.tagName === 'SPAN'),
  ).toBe(true);
  expect(screen.queryByText('Private manager detail')).toBeNull();
  expect(
    screen.queryByRole('button', {
      name: /Save attendance|Export CSV|Check in/,
    }),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText('From date'), {
    target: { value: '2026-10-01' },
  });
  expect(await screen.findByText('Creekside Market')).toBeVisible();
  expect(api.vendor).toHaveBeenLastCalledWith(
    expect.objectContaining({ from: '2026-10-01' }),
  );
});
it('routes Vendor Market Day through the existing vendor shell contract', async () => {
  const service = createFixtureVendorService({
    scope: 'VENDOR',
    name: 'Orchard',
    permissions: ['ReadOwnVendorIdentity'],
    subject: { vendorId: '1' },
    source: 'fixture',
  });
  service.marketAttendance = fixture();
  render(<VendorRoutes service={service} path="/vendor/day" />);
  expect(await screen.findByText('Creekside Market')).toBeVisible();
  expect(
    screen.getByText(/Market staff record physical attendance/),
  ).toBeVisible();
});
it('quotes CSV fields and neutralizes spreadsheet formulas', () => {
  const csv = attendanceCsv([
    {
      ...row,
      snapshot: { ...row.snapshot, businessName: '=SUM(1,2)' },
      note: 'Private "note"\nnext line',
    },
  ]);
  expect(csv).toContain('"\'=SUM(1,2)"');
  expect(csv).toContain('"Private ""note""\nnext line"');
});

it('sorts vendor and booth headings independently and keeps pre-end finalization available', async () => {
  const api = fixture({
    items: [
      row,
      {
        ...row,
        id: 2,
        snapshot: { ...row.snapshot, businessName: 'Apple Farm', booth: 'Z2' },
      },
    ],
    occurrence: {
      status: 'scheduled',
      startsAt: row.snapshot.startsAt,
      endsAt: '2099-10-29T19:00:00Z',
      timezone: 'America/Chicago',
    },
  });
  render(<Attendance api={api} occurrenceId={11} />);
  const table = await screen.findByRole('table', { name: 'Vendor attendance' });
  const names = () =>
    within(table)
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[0]!.textContent);
  expect(names()).toEqual(['Apple Farm', 'Orchard Farm']);
  fireEvent.click(within(table).getByRole('button', { name: 'Vendor' }));
  expect(names()).toEqual(['Orchard Farm', 'Apple Farm']);
  fireEvent.click(within(table).getByRole('button', { name: 'Booth' }));
  expect(
    within(table).getByRole('columnheader', { name: 'Booth' }),
  ).toHaveAttribute('aria-sort', 'ascending');
  expect(
    within(table).getByRole('columnheader', { name: 'Vendor' }),
  ).toHaveAttribute('aria-sort', 'none');
  expect(
    screen.getByRole('button', { name: 'Finalize attendance' }),
  ).toBeEnabled();
  expect(screen.queryByText(/Available after the market ends/)).toBeNull();
});

it('keeps table headings mounted while filters load and places empty results in a data row', async () => {
  const api = fixture();
  const page = await api.read();
  let finish!: (page: AttendancePage) => void;
  vi.mocked(api.read)
    .mockResolvedValueOnce(page)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  render(<Attendance api={api} occurrenceId={11} />);
  await screen.findByRole('button', { name: 'Orchard Farm' });
  const header = screen.getByRole('columnheader', { name: 'Vendor' });
  const group = screen.getByRole('group', { name: 'Attendance filters' });
  expect(
    group.querySelector<HTMLElement>('.application-quick-backdrop')!.style
      .visibility,
  ).toBe('visible');
  fireEvent.click(
    within(group).getByRole('button', { name: 'Excused absence' }),
  );
  expect(screen.getByRole('columnheader', { name: 'Vendor' })).toBe(header);
  expect(
    within(screen.getByRole('table', { name: 'Vendor attendance' })).getByRole(
      'status',
    ),
  ).toHaveTextContent('Loading');
  await act(async () => finish({ ...page, items: [], totalItems: 0 }));
  expect(screen.getByRole('columnheader', { name: 'Vendor' })).toBe(header);
  expect(
    within(screen.getByRole('table', { name: 'Vendor attendance' })).getByRole(
      'cell',
      { name: 'No attendance records match this view.' },
    ),
  ).toHaveAttribute('colspan', '4');
});

it('keeps the shared X close control and retains the panel until its closing animation ends', async () => {
  render(<Attendance api={fixture()} occurrenceId={11} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Orchard Farm' }));
  const panel = screen.getByRole('region', {
    name: 'Attendance for Orchard Farm',
  });
  const close = within(panel).getByRole('button', { name: 'Close details' });
  expect(close.querySelector('svg')).not.toBeNull();
  expect(close).toHaveClass('ui-button');
  fireEvent.click(close);
  expect(panel).toBeInTheDocument();
  const shell = panel.closest('.attendance-detail-shell')!;
  expect(shell).toHaveClass('is-closing');
  fireEvent.animationEnd(shell);
  await waitFor(() =>
    expect(
      screen.queryByRole('region', { name: 'Attendance for Orchard Farm' }),
    ).toBeNull(),
  );
});

it('lets an eligible vendor check in and replaces the action after refresh', async () => {
  const eligible = { ...row, canSelfCheckIn: true };
  const api = fixture({ items: [eligible] });
  vi.mocked(api.vendor).mockResolvedValueOnce({
    ...(await api.vendor()),
    items: [eligible],
  });
  render(<AttendanceHistory api={api} vendor />);
  const checkIn = await screen.findByRole('button', { name: 'Check In' });
  vi.mocked(api.vendor).mockResolvedValue({
    ...(await api.vendor()),
    items: [
      {
        ...eligible,
        status: 'CHECKED_IN',
        checkInSource: 'vendor',
        canSelfCheckIn: false,
        checkedInAt: '2026-10-30T18:10:00Z',
      },
    ],
  });
  fireEvent.click(checkIn);
  await waitFor(() => expect(api.selfCheckIn).toHaveBeenCalledWith(11, 1));
  expect(await screen.findByText('Self Check-In')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('You are checked in.');
  expect(
    screen.queryByRole('button', { name: 'Check In' }),
  ).not.toBeInTheDocument();
});
it('hides vendor check-in when the server does not allow it', async () => {
  render(
    <AttendanceHistory
      api={fixture({ items: [{ ...row, canSelfCheckIn: false }] })}
      vendor
    />,
  );
  await screen.findByText('Creekside Market');
  expect(
    screen.queryByRole('button', { name: 'Check In' }),
  ).not.toBeInTheDocument();
});
