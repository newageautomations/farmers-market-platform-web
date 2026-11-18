import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import type { BoothInvoice, MarketOperationsData } from '@market/api';
import { Billing } from '../apps/admin/src/market/phase14/Billing';
import { Phase14Routes } from '../apps/admin/src/market/phase14/OperationsRoutes';
import { MarketOccurrences } from '../apps/admin/src/market/occurrences';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import { managerOverviewData } from './fixtures/manager-overview-data';

afterEach(() => window.history.replaceState(null, '', '/'));

function invoice(
  id: number,
  status: BoothInvoice['status'] = 'DRAFT',
): BoothInvoice {
  return {
    id,
    marketId: 1,
    assignmentId: id,
    directoryId: id,
    occurrenceId: 102,
    revision: id + 2,
    status,
    currency: 'USD',
    totalMinor: 4500,
    paidMinor: 0,
    dueAt: null,
    lines: [],
    recipientSnapshot: {
      businessName: `Vendor ${id}`,
    } as BoothInvoice['recipientSnapshot'],
  };
}
const data = (invoices = [invoice(1), invoice(2), invoice(3, 'OPEN')]) =>
  ({ invoices }) as MarketOperationsData;

function manager() {
  const context = marketFixtureContext();
  const service = createFixtureMarketService({
    ...context,
    permissions: [
      ...context.permissions,
      'ReadOwnMarketBilling',
      'ManageOwnMarketBilling',
    ],
  });
  service.phase14 = managerOverviewData().operations;
  return service;
}

it('selects only drafts and issues them with their current revisions and the shared due date', async () => {
  const user = userEvent.setup();
  const run = vi.fn(async () => ({ id: 1 }));
  render(<Billing data={data()} run={run} canManage />);
  expect(
    screen.getByRole('checkbox', { name: 'Select invoice 3, Vendor 3' }),
  ).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: /Select all drafts/ }));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.change(screen.getByLabelText('Due date, optional'), {
    target: { value: '2026-12-01' },
  });
  await user.click(screen.getByRole('button', { name: 'Issue invoices (2)' }));
  await screen.findByText('2 invoices issued.');
  expect(run.mock.calls).toEqual([
    [
      {
        action: 'ISSUE_INVOICE',
        id: 2,
        expectedRevision: 4,
        data: { online: false, dueAt: '2026-12-01T00:00:00.000Z' },
      },
    ],
    [
      {
        action: 'ISSUE_INVOICE',
        id: 1,
        expectedRevision: 3,
        data: { online: false, dueAt: '2026-12-01T00:00:00.000Z' },
      },
    ],
  ]);
  expect(screen.getByRole('button', { name: 'Issue invoices' })).toBeDisabled();
});

it('reports partial failure, retains failed selections, and retries only those invoices', async () => {
  const user = userEvent.setup();
  const run = vi
    .fn()
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({ id: 1 })
    .mockResolvedValue({ id: 2 });
  render(<Billing data={data()} run={run} canManage />);
  await user.click(screen.getByRole('checkbox', { name: /Select all drafts/ }));
  await user.click(screen.getByRole('button', { name: 'Issue invoices (2)' }));
  await screen.findByText(/1 invoice issued.*Could not issue invoices 2/);
  expect(
    screen.getByRole('checkbox', { name: 'Select invoice 2, Vendor 2' }),
  ).toBeChecked();
  expect(
    screen.getByRole('checkbox', { name: 'Select invoice 1, Vendor 1' }),
  ).not.toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Issue invoices (1)' }));
  await screen.findByText('1 invoice issued.');
  expect(run).toHaveBeenCalledTimes(3);
  expect(run.mock.calls[2]![0].id).toBe(2);
});

it('locks the batch while a request is in progress and avoids duplicate submissions', async () => {
  const user = userEvent.setup();
  let finish!: (value: unknown) => void;
  const run = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<Billing data={data([invoice(1)])} run={run} canManage />);
  await user.click(screen.getByRole('checkbox', { name: /Select all drafts/ }));
  const form = screen.getByRole('form', { name: 'Issue selected invoices' });
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(run).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Search invoices')).toBeDisabled();
  expect(
    screen.getByRole('checkbox', { name: 'Select invoice 1, Vendor 1' }),
  ).toBeDisabled();
  await act(async () => finish({ id: 1 }));
  await screen.findByText('1 invoice issued.');
});

it('limits select-all to the current page and clears selection when the filter changes', async () => {
  const user = userEvent.setup();
  const run = vi.fn(async () => ({ id: 1 }));
  render(
    <Billing
      data={data(Array.from({ length: 21 }, (_, index) => invoice(index + 1)))}
      run={run}
      canManage
    />,
  );
  await user.click(screen.getByRole('checkbox', { name: /Select all drafts/ }));
  expect(
    screen.getByRole('button', { name: 'Issue invoices (20)' }),
  ).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(
    screen.getByRole('checkbox', { name: 'Select invoice 1, Vendor 1' }),
  ).not.toBeChecked();
  await user.click(
    screen.getByRole('checkbox', { name: 'Select invoice 1, Vendor 1' }),
  );
  expect(
    screen.getByRole('button', { name: 'Issue invoices (21)' }),
  ).toBeEnabled();
  await user.type(screen.getByLabelText('Search invoices'), 'Vendor 1');
  expect(screen.getByRole('button', { name: 'Issue invoices' })).toBeDisabled();
  expect(run).not.toHaveBeenCalled();
});

it('does not expose issuing controls to billing readers', () => {
  render(<Billing data={data()} run={vi.fn()} canManage={false} />);
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByRole('button', { name: /Issue invoices/ })).toBeNull();
});

it('opens billing for the exact requested date and draft status, including reloadable filter changes', async () => {
  window.history.replaceState(
    null,
    '',
    '/market/finances/invoices?occurrence=102&status=DRAFT',
  );
  const { operations } = managerOverviewData();
  const original = operations.read;
  const read = vi
    .spyOn(operations, 'read')
    .mockImplementation(async (...args) => {
      const result = await original(...args);
      return { ...result, invoices: [invoice(1), invoice(2, 'OPEN')] };
    });
  render(
    <Phase14Routes
      api={operations}
      path="/market/booth-billing"
      permissions={['ReadOwnMarketBilling', 'ManageOwnMarketBilling']}
    />,
  );
  const table = await screen.findByRole('table', { name: 'Booth invoices' });
  expect(screen.getByLabelText('Market date')).toHaveValue('102');
  expect(screen.getByLabelText('Invoice status')).toHaveValue('DRAFT');
  expect(within(table).getByText('Vendor 1')).toBeInTheDocument();
  expect(within(table).queryByText('Vendor 2')).toBeNull();
  expect(read.mock.calls.every(([, id]) => id === 102)).toBe(true);
  fireEvent.change(screen.getByLabelText('Invoice status'), {
    target: { value: 'OPEN' },
  });
  fireEvent.change(screen.getByLabelText('Market date'), {
    target: { value: '101' },
  });
  await waitFor(() =>
    expect(read).toHaveBeenCalledWith('BILLING', 101, undefined),
  );
  expect(new URLSearchParams(window.location.search).get('occurrence')).toBe(
    '101',
  );
  expect(new URLSearchParams(window.location.search).get('status')).toBe(
    'OPEN',
  );
  expect(screen.getByLabelText('Invoice status')).toHaveValue('OPEN');
});

it('links the occurrence side panel to payments for that date', async () => {
  const service = manager();
  render(<MarketOccurrences service={service} />);
  const link = await screen.findByRole('link', { name: 'View payments' });
  expect(link).toHaveAttribute(
    'href',
    expect.stringMatching(/^\/market\/finances\/invoices\?occurrence=10[12]$/),
  );
});

it('links the occurrence detail quick action to its draft invoices', async () => {
  const service = manager();
  render(<MarketOccurrences service={service} id="102" />);
  const link = await screen.findByRole('link', { name: 'Issue invoices' });
  expect(link).toHaveAttribute(
    'href',
    '/market/finances/invoices?occurrence=102&status=DRAFT',
  );
});
