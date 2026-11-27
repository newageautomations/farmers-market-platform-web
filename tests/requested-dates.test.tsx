import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { MarketOperationsData, OccurrenceApproval } from '@market/api';
import { RequestedDates } from '../apps/admin/src/market/phase14/RequestedDates';
import { managerData } from './fixtures/market-dashboard-data';

afterEach(cleanup);

const day = 86400000;
function setup(canDecide = true) {
  const data: MarketOperationsData = managerData();
  // Four upcoming dates (one already confirmed) and one past date.
  data.occurrences = [201, 202, 203, 204, 205].map((id, i) => ({
    id,
    startsAt: new Date(Date.now() + (i - 0.5) * day).toISOString(),
    endsAt: new Date(Date.now() + (i - 0.5) * day + 3600000).toISOString(),
    venue: 'Plaza',
    status: 'scheduled',
  }));
  const approval = (
    occurrenceId: number,
    decision: OccurrenceApproval['decision'],
  ): OccurrenceApproval => ({
    id: occurrenceId,
    marketId: 1,
    revision: 3,
    occurrenceId,
    directoryId: 1,
    submissionId: 1,
    participationId: null,
    decision,
    checkIn: 'NOT_CHECKED_IN',
    attendance: 'NOT_RECORDED',
    managerNotes: '',
  });
  data.approvals = [approval(202, 'CONFIRMED'), approval(203, 'DECLINED')];
  const submission = {
    ...data.submissions![0]!,
    status: 'ACCEPTED',
    directoryId: 1,
    requestedOccurrenceIds: [201, 202, 203, 204, 205],
  };
  const runBatch = vi.fn(async (commands: unknown[]) =>
    commands.map(() => true),
  );
  render(
    <RequestedDates
      submission={submission}
      data={data}
      canDecide={canDecide}
      canBilling={false}
      busy={false}
      runBatch={runBatch}
    />,
  );
  return { runBatch };
}
const statuses = () =>
  within(screen.getByRole('table', { name: 'Requested market dates' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell').at(-3)!.textContent);

it('lists upcoming pending dates first and filters by status', () => {
  setup();
  expect(statuses()).toEqual([
    'Pending',
    'Pending',
    'Pending',
    'Confirmed',
    'Declined',
  ]);
  fireEvent.change(screen.getByLabelText('Status'), {
    target: { value: 'CONFIRMED' },
  });
  expect(statuses()).toEqual(['Confirmed']);
  // Only statuses present are offered, with their counts.
  expect(
    Array.from(
      (screen.getByLabelText('Status') as HTMLSelectElement).options,
    ).map((o) => o.textContent),
  ).toEqual([
    'All statuses (5)',
    'Pending (3)',
    'Confirmed (1)',
    'Declined (1)',
  ]);
  fireEvent.click(
    screen.getByRole('button', { name: 'Market date, earliest first' }),
  );
  expect(
    screen.getByRole('columnheader', { name: /Market date/ }),
  ).toHaveAttribute('aria-sort', 'descending');
});

it('applies one decision to the selected upcoming dates that can change', async () => {
  const { runBatch } = setup();
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Select all upcoming dates shown' }),
  );
  expect(screen.getByText('4 selected')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Decision note, optional'), {
    target: { value: 'Season approved' },
  });
  // The confirmed date is skipped; the declined one can be confirmed.
  fireEvent.click(screen.getByRole('button', { name: 'Apply to 3 dates' }));
  await screen.findByText(/Confirmed: 3 dates/);
  const commands = runBatch.mock.calls[0]![0] as Array<{
    action: string;
    expectedRevision?: number;
    data: Record<string, unknown>;
  }>;
  expect(commands.map((c) => c.data.occurrenceId).sort()).toEqual([
    203, 204, 205,
  ]);
  expect(commands.every((c) => c.action === 'REVIEW_OCCURRENCE')).toBe(true);
  expect(commands.find((c) => c.data.occurrenceId === 203)).toMatchObject({
    expectedRevision: 3,
    data: { decision: 'CONFIRMED', reason: 'Season approved' },
  });
});

it('shows dates without selection before the application is accepted', () => {
  setup(false);
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByRole('button', { name: /Apply/ })).toBeNull();
  expect(screen.getByText('Rentals for each date:')).toBeTruthy();
});
