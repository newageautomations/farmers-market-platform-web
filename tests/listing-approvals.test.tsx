import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ListingApprovals } from '../apps/admin/src/market/ListingApprovals';
import { MarketOperations } from '../apps/admin/src/market/operations';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import { managerUrgencies } from '../apps/admin/src/market/dashboard-data';
import {
  dateReadiness,
  listingItems,
  PENDING_LISTINGS_PATH,
} from '../apps/admin/src/market/operations-data';
import { routeAllowed } from '@market/admin-core';

afterEach(() => window.history.replaceState(null, '', '/'));

function rows() {
  const table = screen.getByRole('table', { name: 'Vendor listings' });
  return within(table).getAllByRole('row').slice(1);
}

it('adds a Needs attention alert linking to the pending listings', () => {
  const [item] = managerUrgencies({ listings: 3, now: Date.now() });
  expect(item).toMatchObject({
    id: 'listings:pending',
    title: '3 items need approval to list on your storefront',
    href: PENDING_LISTINGS_PATH,
  });
  expect(managerUrgencies({ listings: 0, now: Date.now() })).toEqual([]);
});

it('shows pending listings in date readiness with a quick link', () => {
  expect(listingItems('upcoming', undefined)).toEqual([]);
  expect(listingItems('ended', 2)).toEqual([]);
  const readiness = dateReadiness(
    '1',
    'upcoming',
    undefined,
    undefined,
    false,
    2,
  );
  expect(readiness.attention).toEqual([
    expect.objectContaining({
      title: 'Listing approvals',
      count: 2,
      href: PENDING_LISTINGS_PATH,
      action: 'Review listings',
    }),
  ]);
  expect(
    dateReadiness('1', 'today', undefined, undefined, false, 0).clear[0],
  ).toMatchObject({ title: 'Listing approvals', status: 'All reviewed' });
});

it('is a Market route of its own', () => {
  const context = marketFixtureContext();
  expect(routeAllowed(context, '/market/listing-approvals')).toBe(true);
});

it('lists every vendor listing, filters by approval and sorts by vendor', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  render(<ListingApprovals service={service} />);
  await screen.findByRole('table', { name: 'Vendor listings' });
  // Sorted by approval: the one pending listing comes first.
  expect(rows()).toHaveLength(5);
  expect(rows()[0]).toHaveTextContent(/pending/i);
  // Its vendor's membership is still pending, so it cannot be approved yet.
  expect(rows()[0]).toHaveTextContent('Membership pending');
  expect(
    within(rows()[0]!).queryByRole('button', { name: /^Approve/ }),
  ).toBeNull();

  fireEvent.change(screen.getByLabelText('Approval'), {
    target: { value: 'approved' },
  });
  expect(rows()).toHaveLength(4);
  fireEvent.change(screen.getByLabelText('Sort listings'), {
    target: { value: 'vendor' },
  });
  const vendors = rows().map((r) => r.querySelectorAll('td')[0]?.textContent);
  expect(vendors).toEqual([...vendors].sort((a, b) => a!.localeCompare(b!)));
});

it('opens on pending listings from a link and approves one in a click', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  // Approve the vendor first, as the backend requires.
  await service.membershipStatus('1', '1001', 'approved', 1);
  window.history.replaceState(null, '', PENDING_LISTINGS_PATH);
  render(<ListingApprovals service={service} />);
  await screen.findByRole('table', { name: 'Vendor listings' });
  expect(screen.getByLabelText('Approval')).toHaveValue('pending');
  expect(rows()).toHaveLength(1);

  fireEvent.click(within(rows()[0]!).getByRole('button', { name: /^Approve/ }));
  await screen.findByText('Nothing waiting for approval');
  expect((await service.overview()).pendingListings).toBe(0);
});

it('previews a listing in the existing review dialog', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  render(<ListingApprovals service={service} />);
  await screen.findByRole('table', { name: 'Vendor listings' });
  fireEvent.click(within(rows()[0]!).getByRole('button', { name: /^Review/ }));
  const dialog = await screen.findByRole('dialog', { name: /^Review / });
  await waitFor(() =>
    expect(dialog).toHaveTextContent('Picked this week from our orchard'),
  );
  expect(
    within(dialog).getByText(
      'Approve this Vendor’s membership before approving its products.',
    ),
  ).toBeInTheDocument();
});

it('links the operations date page readiness and quick actions to the queue', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  render(<MarketOperations service={service} id="101" />);
  const checklist = await screen.findByRole('region', {
    name: 'Market Day Checklist',
  });
  await within(checklist).findByText('Listing approvals');
  expect(
    within(checklist).getByRole('link', { name: /Review listings/ }),
  ).toHaveAttribute('href', PENDING_LISTINGS_PATH);
  expect(
    screen.getByRole('link', { name: /Listing approvals \(1\)/ }),
  ).toHaveAttribute('href', '/market/listing-approvals');
});
