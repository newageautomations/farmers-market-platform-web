import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
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
