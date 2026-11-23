import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Phase14Routes } from '../apps/admin/src/market/phase14/OperationsRoutes';
import { MarketVendors } from '../apps/admin/src/market/vendors';
import { Markets } from '../apps/admin/src/vendor/markets';
import { VendorBooths } from '../apps/admin/src/vendor/booths';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import {
  linkUrgencies,
  applicationUrgencies,
} from '../apps/admin/src/vendor/dashboard-data';
import { managerOverviewData } from './fixtures/manager-overview-data';
import { UrgentRequests } from '../apps/admin/src/DashboardWidgets';
import { fireEvent } from '@testing-library/react';

afterEach(() => window.history.replaceState(null, '', '/'));

it('dismisses expiration reminders, persists them and allows restoration without hiding urgent failures', () => {
  localStorage.clear();
  const items = [
    {
      id: 'documents:expiring',
      title: '3 documents expiring soon',
      detail: 'Review documents',
      href: '/market/documents',
      tone: 'warning' as const,
      icon: 'file-text' as const,
    },
    {
      id: 'documents:expired',
      title: '1 expired document',
      detail: 'Replace it',
      href: '/market/documents',
      tone: 'danger' as const,
      icon: 'file-text' as const,
    },
  ];
  const view = render(<UrgentRequests items={items} dismissalScope="test:1" />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss 3 documents expiring soon' }),
  );
  expect(
    screen.queryByRole('link', { name: /3 documents expiring soon/ }),
  ).toBeNull();
  expect(
    screen.getByRole('link', { name: /1 expired document/ }),
  ).toBeVisible();
  view.unmount();
  render(<UrgentRequests items={items} dismissalScope="test:1" />);
  expect(
    screen.queryByRole('link', { name: /3 documents expiring soon/ }),
  ).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Restore dismissed/ }));
  expect(
    screen.getByRole('link', { name: /3 documents expiring soon/ }),
  ).toBeVisible();
  localStorage.clear();
});

it('shows past-due invoices across dates instead of silently narrowing to the next market', async () => {
  window.history.replaceState(
    null,
    '',
    '/market/finances/invoices?status=PAST_DUE&occurrence=all',
  );
  const { operations } = managerOverviewData();
  const original = operations.read;
  const read = vi
    .spyOn(operations, 'read')
    .mockImplementation(async (...args) => {
      const data = await original(...args);
      return {
        ...data,
        invoices: data.invoices?.map((invoice) =>
          invoice.billingStatus === 'PAST_DUE'
            ? { ...invoice, occurrenceId: 102 }
            : invoice,
        ),
      };
    });
  render(
    <Phase14Routes
      api={operations}
      path="/market/booth-billing"
      permissions={['ReadOwnMarketBilling']}
    />,
  );
  const table = await screen.findByRole('table', { name: 'Booth invoices' });
  expect(screen.getByLabelText('Invoice status')).toHaveValue('PAST_DUE');
  expect(screen.getByLabelText('Market date')).toHaveValue('0');
  expect(within(table).getByText('Hill Country Honey')).toBeInTheDocument();
  expect(within(table).queryByText('Rio Bakery')).toBeNull();
  expect(
    read.mock.calls.every(([, occurrence]) => occurrence === undefined),
  ).toBe(true);
});

it('selects To review and asks the server for that application queue', async () => {
  window.history.replaceState(
    null,
    '',
    '/market/application-submissions?quickView=REVIEW',
  );
  const { operations } = managerOverviewData();
  const read = vi.spyOn(operations, 'read');
  render(
    <Phase14Routes
      api={operations}
      path="/market/application-submissions"
      permissions={['ReadOwnMarketApplications']}
    />,
  );
  await waitFor(() =>
    expect(read).toHaveBeenCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ mode: 'PAGE', quickView: 'REVIEW' }),
    ),
  );
  expect(screen.getByLabelText('Show applications')).toHaveValue('REVIEW');
});

it('selects vendors needing a decision', async () => {
  window.history.replaceState(null, '', '/market/vendors?account=pending');
  const service = createFixtureMarketService(marketFixtureContext());
  render(<MarketVendors service={service} />);
  await screen.findByRole('table', { name: 'Market businesses' });
  expect(screen.getByRole('combobox', { name: /Account/ })).toHaveValue(
    'pending',
  );
});

it('opens Applications and focuses the requested business link without responding to it', async () => {
  const href = linkUrgencies([{ id: 43, marketName: 'Boerne' }])[0]!.href;
  window.history.replaceState(null, '', href);
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  service.linkRequests = vi.fn().mockResolvedValue([
    {
      id: 42,
      revision: 1,
      marketName: 'Other market',
      businessName: 'Other business',
      reason: 'Please verify',
    },
    {
      id: 43,
      revision: 1,
      marketName: 'Boerne',
      businessName: 'Manna Roots',
      reason: 'Please verify',
    },
  ]);
  service.respondToLink = vi.fn();
  render(<Markets service={service} />);
  const request = await screen.findByLabelText(
    'Business link request from Boerne',
  );
  await waitFor(() => expect(request).toHaveFocus());
  expect(
    within(request).getByRole('button', { name: 'Confirm this business link' }),
  ).toBeEnabled();
  expect(service.respondToLink).not.toHaveBeenCalled();
});

it('keeps vendor information requests linked to the exact application', () => {
  expect(
    applicationUrgencies([
      { id: 35, marketName: 'Boerne', status: 'NEEDS_INFO' },
      { id: 36, marketName: 'Boerne', status: 'SUBMITTED' },
    ] as never).map((item) => item.href),
  ).toEqual(['/vendor/applications/35']);
});

it('opens the linked booth date first when it is outside the upcoming date list', async () => {
  window.history.replaceState(null, '', '/vendor/booths?occurrence=102');
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  service.boothAssignments = vi.fn().mockResolvedValue(
    [101, 102].map((occurrenceId) => ({
      occurrenceId,
      startsAt: '2027-01-01T15:00:00Z',
      space: {
        label: `A${occurrenceId}`,
        widthFeet: 10,
        depthFeet: 10,
        amenities: [],
      },
      elementId: `booth-${occurrenceId}`,
      map: null,
      publicInstructions: '',
      rentals: [],
      invoices: [],
    })),
  );
  render(<VendorBooths service={service} />);
  const details = await screen.findByRole('region', { name: 'Booth details' });
  expect(
    within(details).getByRole('heading', { name: 'Booth A102' }),
  ).toBeInTheDocument();
  // Without a published map there is nothing to scroll to.
  expect(
    within(details).queryByRole('button', { name: 'View market map' }),
  ).not.toBeInTheDocument();
  // A linked booth is never hidden by the default Awaiting payment filter.
  expect(screen.getByLabelText('Payment status')).toHaveValue('all');
  expect(screen.getByRole('row', { name: /A102/ })).toHaveClass(
    'market-application-selected',
  );
  expect(screen.getByRole('row', { name: /A101/ })).not.toHaveClass(
    'market-application-selected',
  );
});
