import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, test, vi } from 'vitest';
import {
  OccurrenceLayoutActions,
  OccurrenceLayoutScreen,
} from '../apps/admin/src/market/phase14/OccurrenceLayoutActions';
import { managerData } from './fixtures/market-dashboard-data';
import { OccurrenceMap } from '../apps/admin/src/market/OccurrenceMap';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';

function layouts() {
  const data = managerData();
  data.layouts!.push({ ...data.layouts![0]!, id: 2, name: 'South Lot' });
  data.layoutVersions!.push({
    ...data.layoutVersions![0]!,
    id: 2,
    layoutId: 2,
  });
  data.spaces!.push({ ...data.spaces![0]!, id: 2, layoutVersionId: 2 });
  return data;
}
async function selectLayout() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Change layout' }));
  const dialog = screen.getByRole('dialog', { name: 'Change layout' });
  const option = within(dialog)
    .getByText('South Lot')
    .closest<HTMLElement>('.market-disclosure')!;
  expect(
    within(option).getByRole('button', { name: /South Lot/ }),
  ).toHaveAttribute('aria-expanded', 'false');
  expect(within(dialog).queryByLabelText('Search Vendor or booth')).toBeNull();
  await user.click(within(option).getByText('South Lot'));
  await within(option).findByRole('button', { name: 'Fit map' });
  await user.click(
    within(option).getByRole('button', { name: 'Select layout' }),
  );
  return dialog;
}

it('requires confirmation before erasing map data and lets the manager cancel', async () => {
  const run = vi.fn().mockResolvedValue({ id: 1 });
  render(
    <OccurrenceLayoutActions
      data={layouts()}
      occurrenceId={101}
      run={run}
      canChange
      canEdit
    />,
  );
  await selectLayout();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'erase all booth assignments',
  );
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Keep current layout' }));
  expect(run).not.toHaveBeenCalled();
  const option = screen
    .getByText('South Lot')
    .closest<HTMLElement>('.market-disclosure')!;
  await userEvent.setup().click(within(option).getByText('South Lot'));
  fireEvent.click(await screen.findByRole('button', { name: 'Select layout' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Erase map data and change layout' }),
  );
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith({
      action: 'SET_PLAN',
      id: 1,
      expectedRevision: 1,
      data: { occurrenceId: 101, layoutVersionId: 2, clearLayoutData: true },
    }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('selects a layout directly when this occurrence has no map data', async () => {
  const data = layouts();
  data.plans = [];
  const run = vi.fn().mockResolvedValue({ id: 2 });
  render(
    <OccurrenceLayoutActions
      data={data}
      occurrenceId={102}
      run={run}
      canChange
      canEdit
    />,
  );
  expect(screen.queryByRole('button', { name: 'Edit layout' })).toBeNull();
  await selectLayout();
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { occurrenceId: 102, layoutVersionId: 2, clearLayoutData: false },
      }),
    ),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('keeps the confirmation open on a failed switch', async () => {
  const run = vi.fn().mockResolvedValue(undefined);
  render(
    <OccurrenceLayoutActions
      data={layouts()}
      occurrenceId={101}
      run={run}
      canChange
      canEdit
    />,
  );
  await selectLayout();
  fireEvent.click(
    screen.getByRole('button', { name: 'Erase map data and change layout' }),
  );
  await screen.findByText(/The layout could not be changed/);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('edits the published occurrence layout locally and saves with its plan revision', async () => {
  const data = layouts();
  const before = structuredClone(data);
  const run = vi.fn().mockResolvedValue({ id: 3 });
  render(
    <OccurrenceLayoutScreen
      data={data}
      occurrenceId={101}
      run={run}

      canEdit
    />,
  );
  const dialog = screen.getByTestId('layout-editor');
  expect(within(dialog).queryByLabelText('Layout name')).toBeNull();
  fireEvent.change(within(dialog).getByLabelText('Area name'), {
    target: { value: 'Updated area' },
  });
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save layout' }));
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SAVE_LAYOUT',
        id: 1,
        expectedRevision: 1,
        data: expect.objectContaining({
          occurrenceId: 101,
          expectedPlanRevision: 1,
          definition: expect.objectContaining({
            areas: [{ id: 'main', name: 'Updated area' }],
          }),
        }),
      }),
    ),
  );
  expect(data).toEqual(before);
  expect(run).toHaveBeenCalledTimes(1);
});

it('protects assigned booths from deletion and retains failed edit drafts', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(undefined);
  render(
    <OccurrenceLayoutScreen
      data={layouts()}
      occurrenceId={101}
      run={run}

      canEdit
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Layers' }));
  await user.click(screen.getByRole('button', { name: 'A1' }));
  expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  await user.keyboard('{Delete}');
  expect(screen.getByRole('button', { name: 'A1' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Inspector' }));
  fireEvent.change(screen.getByLabelText('x', { exact: true }), {
    target: { value: '200' },
  });
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  await user.click(screen.getByRole('link', { name: 'Back to occurrence' }));
  expect(screen.getByTestId('layout-editor')).toBeInTheDocument();
  expect(screen.getByLabelText('x', { exact: true })).toHaveValue(200);
  await user.click(screen.getByRole('button', { name: 'Save layout' }));
  await screen.findByText(
    'The layout could not be saved. Your changes are still here.',
  );
  expect(screen.getByLabelText('x', { exact: true })).toHaveValue(200);
  expect(screen.getByTestId('layout-editor')).toBeInTheDocument();
});

it('places edit to the right of change and shows booth vendor names with read-only permissions', async () => {
  const service = createFixtureMarketService(marketFixtureContext());
  service.context.permissions = [
    ...service.context.permissions,
    'ReadOwnMarketAssignments',
  ];
  const command = vi.fn();
  service.phase14 = {
    read: vi.fn().mockResolvedValue(layouts()),
    command,
    vendorAssignments: vi.fn(),
  };
  render(<OccurrenceMap service={service} occurrenceId="101" />);
  await screen.findByText('A1 - Orchard Farm', { selector: 'summary span' });
  expect(screen.queryByRole('button', { name: 'Change layout' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Edit layout' })).toBeNull();
  expect(command).not.toHaveBeenCalled();
});

test('physical identity selection requires confirmation and excludes identities already represented', async () => {
  const { LayoutInspector } =
    await import('../apps/admin/src/market/phase14/LayoutInspector');
  const { baseSpace } = await import('../packages/ui/src/map/model');
  const data = managerData(),
    version = data.layoutVersions![0]!;
  const element = {
    ...version.definition.elements[0]!,
    id: 'replacement',
    type: 'SPACE' as const,
  };
  const drawing = {
    definition: {
      ...version.definition,
      elements: [element, { ...element, id: 'occupied' }],
    },
    spaces: { replacement: baseSpace('A01'), occupied: baseSpace('A02') },
    physicalBoothIds: { occupied: 20 },
  };
  data.physicalBooths = [
    {
      id: 10,
      marketId: data.marketId,
      revision: 1,
      name: 'A01',
      retiredAt: null,
    },
    {
      id: 20,
      marketId: data.marketId,
      revision: 1,
      name: 'A02',
      retiredAt: null,
    },
    {
      id: 30,
      marketId: data.marketId,
      revision: 1,
      name: 'Retired',
      retiredAt: '2026-01-01',
    },
  ];
  data.assignments = [];
  const update = vi.fn();
  render(
    <LayoutInspector
      drawing={drawing}
      selected={['replacement']}
      editable
      version={version}
      data={data}
      area={element.areaId}
      name="Test"
      setName={vi.fn()}
      update={update}
      geometry={vi.fn()}
      booth={vi.fn()}
      grid
      setGrid={vi.fn()}
      snap
      setSnap={vi.fn()}
      spacing={10}
      setSpacing={vi.fn()}
      sync={vi.fn()}
    />,
  );
  const select = screen.getByLabelText('Physical booth identity');
  expect(
    within(select).getByRole('option', { name: 'New physical booth' }),
  ).toBeInTheDocument();
  expect(within(select).queryByRole('option', { name: /A02/ })).toBeNull();
  expect(within(select).queryByRole('option', { name: /Retired/ })).toBeNull();
  const user = userEvent.setup();
  await user.selectOptions(select, '10');
  expect(update).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(update).not.toHaveBeenCalled();
  await user.selectOptions(select, '10');
  await user.click(screen.getByRole('button', { name: 'Confirm identity' }));
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      physicalBoothIds: { occupied: 20, replacement: 10 },
      confirmPhysicalBoothChanges: true,
    }),
  );
});

test('physical identity changes are disabled for an assigned representation', async () => {
  const { LayoutInspector } =
    await import('../apps/admin/src/market/phase14/LayoutInspector');
  const data = managerData(),
    version = data.layoutVersions![0]!,
    space = data.spaces![0]!;
  const drawing = {
    definition: version.definition,
    spaces: { [space.elementId]: space.details },
    physicalBoothIds: { [space.elementId]: 10 },
  };
  data.physicalBooths = [
    {
      id: 10,
      marketId: data.marketId,
      revision: 1,
      name: space.details.label,
      retiredAt: null,
    },
  ];
  render(
    <LayoutInspector
      drawing={drawing}
      selected={[space.elementId]}
      editable
      version={version}
      data={data}
      area={version.definition.areas[0]!.id}
      name="Test"
      setName={vi.fn()}
      update={vi.fn()}
      geometry={vi.fn()}
      booth={vi.fn()}
      grid
      setGrid={vi.fn()}
      snap
      setSnap={vi.fn()}
      spacing={10}
      setSpacing={vi.fn()}
      sync={vi.fn()}
      retire={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('Physical booth identity')).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Retire physical booth' }),
  ).toBeDisabled();
});
