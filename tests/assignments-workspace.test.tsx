import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { OperationsCommand } from '@market/api';
import { AssignmentsWorkspace } from '../apps/admin/src/market/phase14/AssignmentsWorkspace';
import {
  AssignmentCard,
  BoothAssignmentDialog,
} from '../apps/admin/src/market/phase14/Assignments';
import { amountToMinor, minorToAmount } from '../apps/admin/src/PriceInput';
import { boothData } from './fixtures/phase15b-data';

function renderWorkspace(canAssign = true) {
  const run = vi.fn(async (_c: OperationsCommand) => ({}));
  const onOccurrenceChange = vi.fn();
  render(
    <AssignmentsWorkspace
      data={structuredClone(boothData)}
      run={run}
      occurrenceId={1}
      onOccurrenceChange={onOccurrenceChange}
      canAssign={canAssign}
      canBill={false}
      canEditLayout={false}
    />,
  );
  return { run, onOccurrenceChange };
}

test('summarizes booths and lists the date vendors without a documentation link', () => {
  renderWorkspace();
  expect(
    screen.getByRole('heading', { level: 1, name: 'Assignments' }),
  ).toBeVisible();
  expect(screen.queryByText(/Review documentation/)).toBeNull();
  expect(screen.getByText('Booths assigned').closest('dl')).toHaveTextContent(
    '1 / 3',
  );
  const table = screen.getByRole('table', { name: 'Vendors for this date' });
  expect(within(table).getByText('Local Orchard')).toBeVisible();
  expect(within(table).getByText('Assigned')).toBeVisible();
});

test('approves a directory business and publishes the map with unchanged commands', async () => {
  const user = userEvent.setup();
  const { run } = renderWorkspace();
  await user.click(
    within(
      screen.getByRole('table', { name: 'Vendors for this date' }),
    ).getByText('River Bakery'),
  );
  await user.click(
    screen.getByRole('button', { name: 'Approve for this date' }),
  );
  expect(run).toHaveBeenCalledWith({
    action: 'APPROVE_OCCURRENCE',
    data: { occurrenceId: 1, directoryId: 2 },
  });
  await user.click(screen.getByRole('button', { name: 'Publish map' }));
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'PUBLISH_MAP',
      data: { published: true },
    }),
  );
});

test('the side panel opens the shared vendor assignment editor', async () => {
  const user = userEvent.setup();
  const { run } = renderWorkspace();
  await user.click(screen.getByRole('button', { name: 'Change booth' }));
  const dialog = screen.getByRole('dialog', { name: 'Assign booth' });
  expect(within(dialog).getByLabelText('Booth assignment')).toHaveValue('2');
  // The booth's invoice is already issued, so saving needs explicit consent.
  await user.click(
    within(dialog).getByLabelText(
      'Keep the issued invoice unchanged after this move or rental change',
    ),
  );
  await user.click(
    within(dialog).getByRole('button', {
      name: 'Save booth and rental changes',
    }),
  );
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'ASSIGN', id: 1 }),
  );
});

test('read-only managers see the list without approval or copy forms', () => {
  renderWorkspace(false);
  expect(screen.queryByText('Approve a business')).toBeNull();
  expect(screen.queryByText('Copy from an earlier date')).toBeNull();
  expect(screen.getByRole('region', { name: 'Local Orchard' })).toBeVisible();
});

test('explains why a platform vendor without confirmed attendance cannot be approved', async () => {
  const user = userEvent.setup();
  const data = structuredClone(boothData);
  data.platformEligibility = [
    {
      directoryId: 2,
      vendorId: 7,
      membershipId: 39,
      state: 'PARTICIPATION_REQUIRED',
    },
  ];
  const run = vi.fn(async (_c: OperationsCommand) => ({}));
  render(
    <AssignmentsWorkspace
      data={data}
      run={run}
      occurrenceId={1}
      onOccurrenceChange={() => {}}
      canAssign
      canBill={false}
      canEditLayout={false}
    />,
  );
  await user.click(
    within(
      screen.getByRole('table', { name: 'Vendors for this date' }),
    ).getByText('River Bakery'),
  );
  const vendors = screen.getByRole('table', { name: 'Vendors for this date' });
  expect(within(vendors).getByText('Attendance unconfirmed')).toHaveClass(
    'ui-status-danger',
  );
  expect(
    within(screen.getByRole('region', { name: 'River Bakery' })).getByText(
      'Attendance unconfirmed',
    ),
  ).toBeVisible();
  await user.selectOptions(screen.getByLabelText('Vendor status'), 'approval');
  expect(
    screen.queryByRole('table', { name: 'Vendors for this date' }),
  ).toBeNull();
  await user.selectOptions(
    screen.getByLabelText('Vendor status'),
    'attendance-unconfirmed',
  );
  const filteredVendors = screen.getByRole('table', {
    name: 'Vendors for this date',
  });
  expect(within(filteredVendors).getByText('River Bakery')).toBeVisible();
  expect(within(filteredVendors).queryByText('Local Orchard')).toBeNull();
  expect(
    screen.getByText(/has not confirmed attendance for this date yet/),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Approve for this date' }),
  ).toBeDisabled();
  expect(run).not.toHaveBeenCalled();
});

test('the vendor dialog shows requested rentals first and the rest under Additional rentals', async () => {
  const user = userEvent.setup();
  const data = structuredClone(boothData);
  const record = { revision: 1, createdAt: '', updatedAt: '' };
  const rental = (id: number, name: string) => ({
    ...record,
    id,
    marketId: data.marketId,
    details: {
      name,
      description: '',
      enabled: true,
      priceMinor: 1500,
      currency: 'USD',
      defaultQuantity: 1,
      maxQuantity: 4,
      capacity: null,
      requiredAmenity: null,
      sortOrder: id,
    },
  });
  data.rentals = [rental(1, 'Table'), rental(2, 'Tent'), rental(3, 'Chair')];
  data.approvals![0]!.submissionId = 9;
  data.submissions = [
    {
      id: 9,
      rentalRequests: [
        {
          optionId: 1,
          quantity: 2,
          unitMinor: 1500,
          currency: 'USD',
          name: 'Table',
          requiredAmenity: null,
        },
      ],
    } as never,
  ];
  data.allocations = [];
  render(
    <AssignmentsWorkspace
      data={data}
      run={vi.fn(async (_c: OperationsCommand) => ({}))}
      occurrenceId={1}
      onOccurrenceChange={() => {}}
      canAssign
      canBill={false}
      canEditLayout={false}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Change booth' }));
  const dialog = screen.getByRole('dialog', { name: 'Assign booth' });
  const requested = within(dialog).getByRole('region', {
    name: 'Requested rentals',
  });
  expect(within(requested).getByLabelText('Table quantity')).toBeVisible();
  expect(within(requested).getByText('Requested 2')).toBeVisible();
  expect(within(requested).queryByLabelText('Tent quantity')).toBeNull();
  const more = within(dialog)
    .getByText('Additional rentals (2)')
    .closest('details')!;
  expect(more).not.toHaveAttribute('open');
  expect(within(more).getByLabelText('Tent quantity')).not.toBeVisible();
  await user.click(within(more).getByText('Additional rentals (2)'));
  expect(within(more).getByLabelText('Chair quantity')).toBeVisible();
});

test('price amounts convert between dollars and minor units', () => {
  expect(minorToAmount(2500)).toBe('25.00');
  expect(amountToMinor('12.5')).toBe(1250);
  expect(amountToMinor('7')).toBe(700);
  expect(amountToMinor('')).toBe(0);
});

test('Edit booth switches the dialog to booth details and saves this date in dollars', async () => {
  const user = userEvent.setup();
  const data = structuredClone(boothData);
  const run = vi.fn(async (_c: OperationsCommand) => ({ id: 1 }));
  render(
    <BoothAssignmentDialog
      data={data}
      occurrenceId={1}
      elementId={data.spaces![0]!.elementId}
      run={run}
      canAssign
      canDay={false}
      canBill={false}
      onClose={() => {}}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Edit booth' }));
  const dialog = screen.getByRole('dialog', { name: /Edit booth/ });
  const fee = within(dialog).getByLabelText('Booth fee');
  expect(fee).toHaveValue('25.00');
  expect(within(dialog).queryByLabelText(/minor units/)).toBeNull();
  await user.clear(fee);
  await user.type(fee, '40');
  await user.tab();
  expect(fee).toHaveValue('40.00');
  await user.click(
    within(dialog).getByRole('combobox', { name: 'Physical amenities' }),
  );
  await user.click(within(dialog).getByRole('option', { name: 'water' }));
  await user.click(within(dialog).getByRole('button', { name: 'Save booth' }));
  const command = run.mock.calls[0]![0];
  expect(command).toMatchObject({
    action: 'SAVE_LAYOUT',
    data: { occurrenceId: 1 },
  });
  const saved = (
    command.data.spaces as Record<
      string,
      { feeMinor: number; amenities: string[] }
    >
  )[data.spaces![0]!.elementId]!;
  expect(saved.feeMinor).toBe(4000);
  expect(saved.amenities).toContain('WATER');
  expect(await screen.findByRole('dialog', { name: /^Booth / })).toBeVisible();
});

test('read-only managers do not get Edit booth', () => {
  const data = structuredClone(boothData);
  render(
    <BoothAssignmentDialog
      data={data}
      occurrenceId={1}
      elementId={data.spaces![0]!.elementId}
      run={vi.fn()}
      canAssign={false}
      canDay={false}
      canBill={false}
      onClose={() => {}}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Edit booth' })).toBeNull();
});

test('booths are a table with a side panel instead of a modal', async () => {
  const user = userEvent.setup();
  renderWorkspace();
  await user.click(screen.getByRole('tab', { name: 'Booths' }));
  const booths = screen.getByRole('table', { name: 'Booths' });
  expect(within(booths).getAllByRole('row')).toHaveLength(4);
  expect(screen.queryByLabelText('Search booth')).toBeNull();
  expect(screen.getByRole('region', { name: 'Booth A1' })).toBeVisible();
  await user.click(within(booths).getByText('A3'));
  const panel = screen.getByRole('region', { name: 'Booth A3' });
  expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(within(panel).getByRole('button', { name: 'Edit booth' }));
  const edit = screen.getByRole('region', { name: 'Edit booth A3' });
  expect(within(edit).getByLabelText('Booth fee')).toHaveValue('25.00');
  await user.click(within(edit).getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('region', { name: 'Booth A3' })).toBeVisible();
});

test.each(['vendor', 'booth'] as const)(
  '%s editor prompts on save when changing an assigned vendor to another booth',
  async (editor) => {
    const user = userEvent.setup();
    const data = structuredClone(boothData);
    data.invoices = [];
    const run = vi.fn(async (_c: OperationsCommand) => ({}));
    if (editor === 'vendor') {
      render(
        <AssignmentCard
          data={data}
          approval={data.approvals![0]!}
          assignments={data.assignments!}
          run={run}
          canAssign
          canDay={false}
          canBill={false}
        />,
      );
      await user.selectOptions(screen.getByLabelText('Booth assignment'), '3');
    } else {
      render(
        <BoothAssignmentDialog
          data={data}
          occurrenceId={1}
          elementId="booth-3"
          run={run}
          canAssign
          canDay={false}
          canBill={false}
          presentation="panel"
          onClose={() => {}}
        />,
      );
      await user.selectOptions(
        screen.getByLabelText('Business for selected booth'),
        '1',
      );
    }
    expect(screen.queryByLabelText(/Deliberately/)).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Assign an additional space' }),
    ).toBeNull();
    expect(
      screen.queryByRole('dialog', { name: 'Vendor already has a booth' }),
    ).toBeNull();
    await user.click(
      screen.getByRole('button', { name: 'Save booth and rental changes' }),
    );
    const confirmation = screen.getByRole('dialog', {
      name: 'Vendor already has a booth',
    });
    expect(confirmation).toHaveClass('farmstand-controls');
    expect(run).not.toHaveBeenCalled();
    await user.click(
      within(confirmation).getByRole('button', { name: 'Move to this booth' }),
    );
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ASSIGN',
        id: 1,
        expectedRevision: 1,
        data: expect.objectContaining({
          spaceId: 3,
          allowMultipleSpaces: false,
        }),
      }),
    );
  },
);

test('keeping an existing booth creates a second assignment only after confirmation', async () => {
  const user = userEvent.setup();
  const data = structuredClone(boothData);
  data.invoices = [];
  const run = vi.fn(async (_c: OperationsCommand) => ({}));
  render(
    <AssignmentCard
      data={data}
      approval={data.approvals![0]!}
      assignments={data.assignments!}
      run={run}
      canAssign
      canDay={false}
      canBill={false}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Booth assignment'), '3');
  await user.click(
    screen.getByRole('button', { name: 'Save booth and rental changes' }),
  );
  await user.click(
    screen.getByRole('button', {
      name: 'Keep existing booth and add this booth',
    }),
  );
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'ASSIGN',
      id: undefined,
      expectedRevision: undefined,
      data: expect.objectContaining({ spaceId: 3, allowMultipleSpaces: true }),
    }),
  );
});

test('an unassigned vendor saves without an assignment confirmation', async () => {
  const user = userEvent.setup();
  const data = structuredClone(boothData);
  data.assignments = [];
  data.invoices = [];
  const run = vi.fn(async (_c: OperationsCommand) => ({}));
  render(
    <AssignmentCard
      data={data}
      approval={data.approvals![0]!}
      assignments={[]}
      run={run}
      canAssign
      canDay={false}
      canBill={false}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Booth assignment'), '3');
  await user.click(
    screen.getByRole('button', { name: 'Confirm booth and accepted rentals' }),
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'ASSIGN',
      data: expect.objectContaining({ spaceId: 3, allowMultipleSpaces: false }),
    }),
  );
});

test('vendor and booth switches change table columns and status options', async () => {
  const user = userEvent.setup();
  renderWorkspace();
  const vendors = screen.getByRole('table', { name: 'Vendors for this date' });
  expect(
    within(vendors)
      .getAllByRole('columnheader')
      .map((h) => h.textContent),
  ).toEqual(['Vendor', 'Booth', 'Invoice', 'Status']);
  await user.selectOptions(screen.getByLabelText('Vendor status'), 'approval');
  expect(within(vendors).queryByText('Local Orchard')).toBeNull();
  expect(within(vendors).getByText('River Bakery')).toBeVisible();
  expect(within(vendors).getByText('Needs approval')).toHaveClass(
    'assignment-needs-approval',
  );
  await user.click(screen.getByRole('tab', { name: 'Booths' }));
  expect(screen.getByRole('table', { name: 'Booths' })).toBeVisible();
  expect(screen.getByLabelText('Booth status')).toBeVisible();
  expect(screen.getByLabelText('Vendor status')).not.toBeVisible();
});

test('copy is beside publish and allows selecting a cancelled earlier date', async () => {
  const user = userEvent.setup();
  const data = structuredClone(boothData);
  data.occurrences.push({
    ...data.occurrences[0]!,
    id: 2,
    startsAt: '2027-01-30T15:00:00Z',
    endsAt: '2027-01-30T20:00:00Z',
    status: 'cancelled',
  });
  const run = vi.fn(async (_c: OperationsCommand) => ({
    proposals: [],
    conflicts: [],
    newVendors: [],
  }));
  render(
    <AssignmentsWorkspace
      data={data}
      run={run}
      occurrenceId={1}
      onOccurrenceChange={() => {}}
      canAssign
      canBill={false}
      canEditLayout={false}
    />,
  );
  const copy = screen.getByRole('button', {
    name: 'Copy from an earlier date',
  });
  expect(copy.parentElement).toBe(
    screen.getByRole('button', { name: 'Publish map' }).parentElement,
  );
  await user.click(copy);
  const dialog = screen.getByRole('dialog', {
    name: 'Copy from an earlier date',
  });
  expect(within(dialog).getByRole('option', { name: /Cancelled/ })).toHaveValue(
    '2',
  );
  await user.selectOptions(
    within(dialog).getByLabelText('Earlier market date'),
    '2',
  );
  await user.click(
    within(dialog).getByRole('button', { name: 'Prepare copy suggestions' }),
  );
  expect(run).toHaveBeenCalledWith({
    action: 'COPY_ASSIGNMENTS',
    data: { occurrenceId: 1, fromOccurrenceId: 2 },
  });
  expect(
    within(dialog).getByRole('region', { name: 'Draft copy review' }),
  ).toBeVisible();
});

test.each([
  ['planned', 'Tentative', 'tentative'],
  ['cancelled', 'Not attending', 'not-attending'],
] as const)(
  'uses the saved %s attendance response in the table, panel and filter',
  async (participationStatus, label, filter) => {
    const user = userEvent.setup();
    const data = structuredClone(boothData);
    data.platformEligibility = [
      {
        directoryId: 1,
        vendorId: 7,
        membershipId: 39,
        state:
          participationStatus === 'cancelled'
            ? 'PARTICIPATION_CANCELLED'
            : 'PARTICIPATION_REQUIRED',
        participationStatus,
      },
    ];
    render(
      <AssignmentsWorkspace
        data={data}
        run={vi.fn()}
        occurrenceId={1}
        onOccurrenceChange={() => {}}
        canAssign
        canBill={false}
        canEditLayout={false}
      />,
    );
    expect(
      within(
        screen.getByRole('table', { name: 'Vendors for this date' }),
      ).getByText(label),
    ).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Local Orchard' })).getByText(
        label,
      ),
    ).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Vendor status'), filter);
    expect(
      within(
        screen.getByRole('table', { name: 'Vendors for this date' }),
      ).queryByText('River Bakery'),
    ).toBeNull();
  },
);

test('a booth without a requested amenity can still be assigned after confirming', async () => {
  const user = userEvent.setup();
  const data = structuredClone(boothData);
  data.assignments = [];
  data.invoices = [];
  const approval = {
    ...data.approvals![0]!,
    requirements: {
      widthFeet: 1,
      depthFeet: 1,
      electricity: true,
      vehicle: false,
      foodTruck: false,
    },
  };
  const run = vi.fn(async (_c: OperationsCommand) => ({}));
  render(
    <AssignmentCard
      data={data}
      approval={approval}
      assignments={[]}
      run={run}
      canAssign
      canDay={false}
      canBill={false}
    />,
  );
  expect(screen.getAllByText('Electricity').length).toBeGreaterThan(0);
  const booth = data.spaces!.find(
    (s) => !s.details.amenities.includes('ELECTRICITY'),
  )!;
  await user.selectOptions(
    screen.getByLabelText('Booth assignment'),
    String(booth.id),
  );
  await user.click(
    screen.getByRole('button', { name: 'Confirm booth and accepted rentals' }),
  );
  expect(screen.getByText(/doesn.t have the requested amenities/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(run).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole('button', { name: 'Confirm booth and accepted rentals' }),
  );
  await user.click(screen.getByRole('button', { name: 'Assign booth' }));
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'ASSIGN',
      data: expect.objectContaining({
        spaceId: booth.id,
        allowMissingAmenities: true,
      }),
    }),
  );
});
