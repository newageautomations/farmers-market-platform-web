import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, expect, it } from 'vitest';
import { Applications } from '../apps/admin/src/market/phase14/Applications';
import { Rentals } from '../apps/admin/src/market/phase14/Directory';
import { MarketVendors } from '../apps/admin/src/market/vendors';
import { OccurrenceMap } from '../apps/admin/src/market/OccurrenceMap';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import { managerData } from './fixtures/market-dashboard-data';
import { applicationReviewApi } from './fixtures/application-review-api';

it('keeps application edits local until save, including searched business and selected status', async () => {
  const run = vi.fn().mockResolvedValue({ id: 1 });
  render(
    <Applications
      data={managerData()}
      api={applicationReviewApi(managerData())}
      run={run}
      canManage
      view="submissions"
    />,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open Orchard Farm' }),
  );
  await screen.findByLabelText('Private Manager Notes and decision reason');
  const modal = screen.getByRole('region', { name: 'Orchard Farm' });
  fireEvent.change(within(modal).getByLabelText('Application status'), {
    target: { value: 'ACCEPTED' },
  });
  const search = within(modal).getByRole('combobox', {
    name: 'Existing Market Business',
  });
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: 'Meadow' } });
  fireEvent.click(
    within(modal).getByRole('option', {
      name: 'Meadow Flowers (External directory record)',
    }),
  );
  fireEvent.change(
    within(modal).getByLabelText('Private Manager Notes and decision reason'),
    {
      target: { value: 'Follow up next week' },
    },
  );
  expect(run).not.toHaveBeenCalled();
  fireEvent.change(within(modal).getByLabelText('Application status'), {
    target: { value: 'WAITLISTED' },
  });
  fireEvent.click(
    within(modal).getByRole('button', { name: 'Review decision' }),
  );
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(
    within(modal).getByRole('button', { name: 'Confirm decision' }),
  );
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
  await waitFor(() =>
    expect(screen.queryByRole('region', { name: 'Orchard Farm' })).toBeNull(),
  );
});

it('discards application drafts when closed and keeps failed saves open', async () => {
  const run = vi.fn().mockResolvedValue(undefined);
  render(
    <Applications
      data={managerData()}
      api={applicationReviewApi(managerData())}
      run={run}
      canManage
      view="submissions"
    />,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open Orchard Farm' }),
  );
  await screen.findByLabelText('Private Manager Notes and decision reason');
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Application status' }),
    {
      target: { value: 'DECLINED' },
    },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Back to applications' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Discard changes and close' }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Open Orchard Farm' }));
  await screen.findByLabelText('Private Manager Notes and decision reason');
  expect(
    screen.getByRole('combobox', { name: 'Application status' }),
  ).toHaveValue('UNDER_REVIEW');
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Application status' }),
    {
      target: { value: 'WAITLISTED' },
    },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Review decision' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm decision' }));
  await screen.findByRole('alert');
  expect(
    screen.getByRole('region', { name: 'Orchard Farm' }),
  ).toBeInTheDocument();
});

function vendorsService(memberships = 2) {
  const service = createFixtureMarketService(marketFixtureContext());
  service.context = {
    ...service.context,
    permissions: [
      ...service.context.permissions,
      'ReadOwnMarketApplications',
      'ManageOwnMarketApplications',
      'ManageOwnMarketMemberships',
    ],
  };
  const data = managerData();
  const command = vi.fn(async (input: { action: string; data: Record<string, unknown> }) =>
    input.action === 'SAVE_DIRECTORY'
      ? { ...data.directory![0]!, id: 9, contact: input.data.contact }
      : { id: 1, revision: 1 },
  );
  service.phase14 = {
    read: vi.fn().mockResolvedValue(data),
    command,
    vendorAssignments: vi.fn(),
  } as never;
  const rows = Array.from({ length: memberships }, (_, i) => ({
    id: String(i + 1),
    marketId: '1',
    vendorId: String(500 + i),
    vendor: { id: String(500 + i), name: `Platform Farm ${i + 1}`, slug: `p${i}`, status: 'active' },
    status: 'approved',
    version: 1,
    preorderDefault: null,
  }));
  const pages = vi
    .spyOn(service, 'relationshipPage')
    .mockImplementation(async ({ skip = 0, take = 20 } = {}) => ({
      totalItems: rows.length,
      items: rows.slice(skip!, skip! + take!),
    }) as never);
  return { service, command, pages };
}

it('lists platform Vendors and external businesses together; platform details are read-only', async () => {
  const { service } = vendorsService();
  render(<MarketVendors service={service} />);
  const table = await screen.findByRole('table', { name: 'Market businesses' });
  await within(table).findByText('Platform Farm 1');
  expect(within(table).getByText('Orchard Farm')).toBeInTheDocument();
  fireEvent.click(within(table).getByRole('row', { name: /Platform Farm 1/ }));
  const details = screen.getByRole('region', { name: 'Business details' });
  expect(within(details).queryByRole('button', { name: /Edit business/ })).toBeNull();
  expect(within(details).getByRole('button', { name: 'Edit private notes' })).toBeInTheDocument();
  expect(within(details).getByText('Managed by the Vendor')).toBeInTheDocument();
  fireEvent.click(within(table).getByRole('row', { name: /Orchard Farm/ }));
  expect(within(details).getByRole('button', { name: /Edit business/ })).toBeInTheDocument();
});

it('saves private notes for a platform Vendor without changing its details', async () => {
  const { service, command } = vendorsService();
  render(<MarketVendors service={service} />);
  const table = await screen.findByRole('table', { name: 'Market businesses' });
  fireEvent.click(await within(table).findByRole('row', { name: /Platform Farm 1/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit private notes' }));
  fireEvent.change(screen.getByLabelText('Private manager notes'), {
    target: { value: 'Corner booth' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save notes' }));
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith({
      action: 'SAVE_VENDOR_NOTES',
      expectedRevision: undefined,
      data: { vendorId: 500, notes: 'Corner booth' },
    }),
  );
});

it('adds an external business through the staged wizard', async () => {
  const { service, command } = vendorsService();
  render(<MarketVendors service={service} adding />);
  const next = () => fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'External business' }));
  next();
  fireEvent.change(screen.getByLabelText('Business name'), {
    target: { value: 'River Honey' },
  });
  next();
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ada' } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Lane' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } });
  next();
  expect(screen.getByText('Enter a valid contact email address.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ada@example.com' },
  });
  next();
  expect(command).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Add business' }),
  );
  await screen.findByRole('heading', { name: 'Business added' });
  expect(command).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'SAVE_DIRECTORY',
      data: expect.objectContaining({
        contact: expect.objectContaining({ businessName: 'River Honey' }),
      }),
    }),
  );
});

it('adds a platform Vendor membership with private notes', async () => {
  const { service, command } = vendorsService();
  const add = vi.spyOn(service, 'membershipStatus');
  render(<MarketVendors service={service} adding />);
  const next = () => fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'Platform Vendor' }));
  next();
  next();
  expect(screen.getByText('Choose the platform Vendor to add.')).toBeInTheDocument();
  fireEvent.click(
    await screen.findByRole('option', {
      name: /Eligible Vendor 1$/,
      hidden: true,
    }),
  );
  next();
  fireEvent.change(screen.getByLabelText('Private manager notes'), {
    target: { value: 'Met at the fair' },
  });
  next();
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Add business' }),
  );
  await screen.findByRole('heading', { name: 'Business added' });
  expect(add).toHaveBeenCalledWith(service.marketId, expect.any(String), 'pending');
  expect(command).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'SAVE_VENDOR_NOTES',
      data: expect.objectContaining({ notes: 'Met at the fair' }),
    }),
  );
});

it('loads every membership page and pages the combined list ten at a time', async () => {
  const { service, pages } = vendorsService(41);
  render(<MarketVendors service={service} />);
  const table = await screen.findByRole('table', { name: 'Market businesses' });
  await within(table).findByText('Platform Farm 1');
  expect(pages).toHaveBeenCalledTimes(3);
  expect(within(table).getAllByRole('row')).toHaveLength(11);
  expect(screen.getByText(/43 businesses/)).toBeInTheDocument();
});

it('shows remaining rental stock for the chosen occurrence', () => {
  render(<Rentals data={managerData()} run={vi.fn()} canManage />);
  const card = screen.getByRole('row', { name: /Folding Table/ });
  expect(card).toHaveTextContent('Current stock: 7 / 10');
  fireEvent.change(screen.getByLabelText('Stock for Market Date'), {
    target: { value: '102' },
  });
  expect(card).toHaveTextContent('Current stock: 10 / 10');
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
  expect(screen.getByRole('link', { name: 'Manage booths' })).toHaveAttribute(
    'href',
    '/market/assignments/101',
  );
});

it('assigns a business from the occurrence booth list through the shared booth dialog', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  service.context = {
    ...service.context,
    permissions: [
      ...service.context.permissions,
      'ReadOwnMarketAssignments',
      'ManageOwnMarketAssignments',
    ],
  };
  const read = vi.fn().mockResolvedValue(managerData());
  service.phase14 = { read, command: vi.fn(), vendorAssignments: vi.fn() };
  render(<OccurrenceMap service={service} occurrenceId="101" />);
  await screen.findByText('Orchard Farm');
  fireEvent.click(
    screen.getAllByRole('button', {
      name: /Manage business assignment|Add business to booth/,
    })[0]!,
  );
  const dialog = await screen.findByRole('dialog', { name: /^Booth / });
  expect(
    within(dialog).getByLabelText('Business for selected booth'),
  ).toBeInTheDocument();
});
