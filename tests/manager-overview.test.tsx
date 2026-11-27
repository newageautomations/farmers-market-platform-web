import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { BoothInvoice } from '@market/api';
import { MarketOverview } from '../apps/admin/src/market/overview';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import {
  invoicesAwaitingPayment,
  managerUrgencies,
  owedTotal,
} from '../apps/admin/src/market/dashboard-data';
import {
  defaultManagerLayout,
  normalizeManagerLayout,
} from '../apps/admin/src/market/dashboard-layout';
import { managerOverviewData } from './fixtures/manager-overview-data';

function managerService(
  permissions = [
    'ReadOwnMarketApplications',
    'ReadOwnMarketAssignments',
    'ReadOwnMarketBilling',
    'ReadOwnDocuments',
  ],
) {
  const context = marketFixtureContext();
  context.permissions = [...context.permissions, ...(permissions as never[])];
  const service = createFixtureMarketService(context);
  const data = managerOverviewData();
  service.phase14 = data.operations;
  service.notifications = {
    summary: vi.fn().mockResolvedValue(data.compliance),
  } as never;
  service.checklist = async (id) => data.checklist(id);
  const saved: unknown[] = [];
  service.dashboardLayout = {
    read: vi.fn().mockResolvedValue(null),
    save: vi.fn(async (value) => void saved.push(value)),
  };
  return { service, saved };
}

it('puts past-due invoices, expired documents and unassigned vendors first', async () => {
  const { service } = managerService();
  render(<MarketOverview service={service} />);
  const urgent = await screen.findByRole('region', { name: /Needs attention/ });
  await waitFor(() =>
    expect(within(urgent).getAllByRole('link').length).toBeGreaterThanOrEqual(
      4,
    ),
  );
  const titles = within(urgent)
    .getAllByRole('link')
    .map((link) => link.querySelector('strong')?.textContent);
  expect(titles.slice(0, 2)).toEqual(
    expect.arrayContaining(['1 invoice past due', '1 expired document']),
  );
  expect(titles).toContain('1 vendor without a booth');
  expect(
    within(urgent).getByRole('link', { name: /1 vendor without a booth/ }),
  ).toHaveAttribute('href', '/market/assignments/101');
  expect(
    within(urgent).getByRole('link', { name: /1 invoice past due/ }),
  ).toHaveAttribute(
    'href',
    '/market/finances/invoices?status=PAST_DUE&occurrence=all',
  );
});

it('targets the report, status and review queues represented by each manager alert', () => {
  const { compliance } = managerOverviewData();
  const items = managerUrgencies({
    compliance,
    applications: 4,
    vendorRequests: 2,
    now: Date.now(),
  });
  expect(Object.fromEntries(items.map((item) => [item.id, item.href]))).toEqual(
    {
      'documents:expired':
        '/market/documents?view=reports&report=expiration&status=Expired',
      'documents:expiring': '/market/documents?view=reports&report=expiration',
      'documents:pending':
        '/market/documents?view=reports&status=Pending+review',
      'applications:review': '/market/application-submissions?quickView=REVIEW',
      'vendors:pending': '/market/vendors?account=pending',
    },
  );
});

it('shows booth availability, invoices owed and new applications for the next market', async () => {
  const { service } = managerService();
  render(<MarketOverview service={service} />);
  const metrics = await screen.findByRole('region', { name: 'Key metrics' });
  await waitFor(() =>
    expect(within(metrics).getByText('5 of 8 assigned')).toBeInTheDocument(),
  );
  // Open invoices only: $45.00 past due plus $45.00 still owed on $60.00.
  expect(within(metrics).getByText('$90.00')).toBeInTheDocument();
  expect(
    within(metrics).getByText('2 invoices · 1 past due'),
  ).toBeInTheDocument();

  const booths = screen.getByRole('region', { name: 'Booth availability' });
  await within(booths).findByText('Assigned, unpaid');
  expect(booths).toHaveTextContent(/Open\s*3 booths/);
  expect(booths).toHaveTextContent(/Paid\s*2 booths/);

  const invoices = screen.getByRole('table', {
    name: 'Invoices awaiting payment',
  });
  const rows = within(invoices).getAllByRole('row').slice(1);
  expect(rows.map((r) => r.querySelector('th')?.textContent)).toEqual([
    'Hill Country Honey',
    'Rio Bakery',
  ]);
  expect(rows[0]).toHaveTextContent('Past due');

  const applications = await screen.findByRole('table', {
    name: 'Applications waiting for review',
  });
  expect(
    within(applications).getByRole('link', { name: 'Pecan Grove Orchard' }),
  ).toHaveAttribute('href', '/market/application-submissions/31');

  const checklist = screen.getByRole('region', {
    name: 'Market day checklist',
  });
  await within(checklist).findByText('Vendors without a booth');
  expect(checklist).toHaveTextContent('2 of 5 done');
  expect(checklist).toHaveTextContent('Listing approvals');
});

it('leaves out sections behind missing grants and never reads them', async () => {
  const { service } = managerService([]);
  const read = vi.spyOn(service.phase14!, 'read');
  render(<MarketOverview service={service} />);
  await screen.findByRole('heading', { name: 'Vendor requests' });
  expect(
    screen.queryByRole('region', { name: 'Booth availability' }),
  ).toBeNull();
  expect(screen.queryByText('Invoices awaiting payment')).toBeNull();
  expect(screen.queryByText('New applications')).toBeNull();
  expect(service.notifications!.summary).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
});

it('customizes the arrangement with the shared layout editor', async () => {
  const { service, saved } = managerService();
  render(<MarketOverview service={service} />);
  const customize = await screen.findByRole('button', { name: /Customize/ });
  await waitFor(() => expect(customize).toBeEnabled());
  fireEvent.click(customize);
  const dialog = await screen.findByRole('dialog', {
    name: 'Customize overview',
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: /Hide Vendor requests/ }),
  );
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save layout' }));
  await waitFor(() => expect(saved).toHaveLength(1));
  expect((saved[0] as { hidden: string[] }).hidden).toContain('vendors');
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Vendor requests' }),
    ).toBeNull(),
  );
});

it('normalizes saved layouts and orders unpaid invoices by urgency', () => {
  const layout = normalizeManagerLayout({
    order: [],
    hidden: ['unknown', 'vendors'],
    grid: [{ id: 'invoices', x: 0, y: 2, w: 99, h: 9 }],
  });
  expect(layout.hidden).toEqual(['vendors']);
  expect(layout.grid!.find((c) => c.id === 'invoices')).toMatchObject({
    w: 8,
    h: 3,
  });
  expect(layout.grid!.map((c) => c.id).sort()).toEqual(
    defaultManagerLayout.grid!.map((c) => c.id).sort(),
  );
  const invoice = (id: number, status: BoothInvoice['status'], extra = {}) =>
    ({
      id,
      status,
      totalMinor: 1000,
      paidMinor: 0,
      currency: 'USD',
      dueAt: null,
      ...extra,
    }) as BoothInvoice;
  const due = invoicesAwaitingPayment([
    invoice(1, 'OPEN', { dueAt: '2027-01-05T00:00:00Z' }),
    invoice(2, 'DRAFT'),
    invoice(3, 'OPEN', {
      billingStatus: 'PAST_DUE',
      dueAt: '2026-01-01T00:00:00Z',
    }),
    invoice(4, 'OPEN', { paidMinor: 1000 }),
    invoice(5, 'VOID'),
  ]);
  expect(due.map((d) => d.invoice.id)).toEqual([3, 1]);
  expect(owedTotal(due)).toBe('$20.00');
});
