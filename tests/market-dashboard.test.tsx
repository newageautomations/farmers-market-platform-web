import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, expect, it } from 'vitest';
import { Applications } from '../apps/admin/src/market/phase14/Applications';
import { Directory, Rentals } from '../apps/admin/src/market/phase14/Directory';
import { MarketVendors } from '../apps/admin/src/market/vendors';
import { OccurrenceMap } from '../apps/admin/src/market/OccurrenceMap';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import { managerData } from './fixtures/market-dashboard-data';

it('keeps application edits local until save, including searched business and selected status', async () => {
  const run = vi.fn().mockResolvedValue({ id: 1 });
  render(
    <Applications
      data={managerData()}
      run={run}
      canManage
      view="submissions"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open Orchard Farm' }));
  const modal = screen.getByRole('dialog');
  fireEvent.click(within(modal).getByRole('button', { name: 'Waitlisted' }));
  expect(
    within(modal).getByRole('button', { name: 'Waitlisted' }),
  ).toHaveAttribute('aria-pressed', 'true');
  const search = within(modal).getByRole('combobox', {
    name: 'Directory business',
  });
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: 'Meadow' } });
  fireEvent.click(
    within(modal).getByRole('option', { name: 'Meadow Flowers' }),
  );
  fireEvent.change(
    within(modal).getByLabelText('Private manager notes and decision reason'),
    {
      target: { value: 'Follow up next week' },
    },
  );
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(within(modal).getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'REVIEW_APPLICATION',
      expectedRevision: 1,
      data: expect.objectContaining({
        status: 'WAITLISTED',
        directoryId: 2,
        managerNotes: 'Follow up next week',
      }),
    }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('discards application drafts when closed and keeps failed saves open', async () => {
  const run = vi.fn().mockResolvedValue(undefined);
  render(
    <Applications
      data={managerData()}
      run={run}
      canManage
      view="submissions"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open Orchard Farm' }));
  fireEvent.click(screen.getByRole('button', { name: 'Declined' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Open Orchard Farm' }));
  expect(screen.getByRole('button', { name: 'Under Review' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('edits a directory business in a modal and discards unsaved changes', async () => {
  const run = vi.fn();
  render(<Directory data={managerData()} run={run} canManage />);
  fireEvent.click(screen.getByRole('button', { name: 'Orchard Farm' }));
  expect(
    screen.getByRole('dialog', { name: 'Edit Business' }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('business name'), {
    target: { value: 'Unsaved' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Orchard Farm' }));
  expect(screen.getByLabelText('business name')).toHaveValue('Orchard Farm');
});

it('shows remaining rental stock for the chosen occurrence', () => {
  render(<Rentals data={managerData()} run={vi.fn()} canManage />);
  const card = screen
    .getByRole('button', { name: 'Folding Table' })
    .closest('li')!;
  expect(card).toHaveTextContent('Current stock: 7 / 10');
  fireEvent.change(screen.getByLabelText('Stock for Market Date'), {
    target: { value: '102' },
  });
  expect(card).toHaveTextContent('Current stock: 10 / 10');
});

it('caps vendors at twenty and requests the next page', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  const original = await service.relationshipPage();
  const rows = Array.from({ length: 41 }, (_, i) => ({
    ...original.items[0]!,
    id: String(i),
    vendor: { ...original.items[0]!.vendor, name: `Farm ${i + 1}` },
  }));
  const read = vi
    .spyOn(service, 'relationshipPage')
    .mockImplementation(async ({ skip = 0, take = 20 } = {}) => ({
      totalItems: 41,
      items: rows.slice(skip!, skip! + take!),
    }));
  render(<MarketVendors service={service} />);
  const table = await screen.findByRole('table');
  expect(within(table).getAllByRole('row')).toHaveLength(21);
  expect(
    within(table).queryByRole('columnheader', { name: 'Version' }),
  ).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByRole('button', { name: 'Open Farm 21' });
  expect(read).toHaveBeenLastCalledWith({ take: 20, skip: 20, search: '' });
});

it('loads the selected occurrence layout with its assigned vendor', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  service.context = {
    ...service.context,
    permissions: [...service.context.permissions, 'ReadOwnMarketAssignments'],
  };
  const read = vi.fn().mockResolvedValue(managerData());
  service.phase14 = { read, command: vi.fn(), vendorAssignments: vi.fn() };
  render(<OccurrenceMap service={service} occurrenceId="101" />);
  await screen.findByText('Orchard Farm');
  expect(read).toHaveBeenCalledWith('ASSIGNMENTS', 101);
  expect(screen.getByRole('link', { name: 'Manage Booths' })).toHaveAttribute(
    'href',
    '/market/assignments/101',
  );
});
