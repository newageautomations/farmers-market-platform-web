import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import {
  Layouts,
  LayoutScreen,
} from '../apps/admin/src/market/phase14/Layouts';
import { Phase14Routes } from '../apps/admin/src/market/phase14/OperationsRoutes';
import { managerData } from './fixtures/market-dashboard-data';

it('shows one preview card per layout and retains previews during collapse', () => {
  const data = managerData();
  data.layoutVersions!.push({
    ...data.layoutVersions![0]!,
    id: 8,
    versionNumber: 2,
    status: 'RETIRED',
  });
  render(<Layouts data={data} run={vi.fn()} canManage />);
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.queryByTestId('layout-editor')).toBeNull();
  const toggle = screen.getByRole('button', { name: /Saved layouts/ });
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const content = document.querySelector('.market-disclosure-content')!;
  expect(content).toHaveAttribute('inert');
  expect(content.querySelector('.layout-card-preview')).toBeTruthy();
});

it('copies to a separate editor screen and archives only after confirmation', async () => {
  const data = managerData();
  const run = vi.fn().mockResolvedValue({ id: 3, layoutId: 7 });
  render(<Layouts data={data} run={run} canManage />);
  fireEvent.click(screen.getByRole('button', { name: /^Copy / }));
  await waitFor(() =>
    expect(window.location.pathname).toBe('/market/layouts/7/edit'),
  );
  expect(run).toHaveBeenCalledWith({
    action: 'CLONE_LAYOUT',
    id: 1,
    expectedRevision: 1,
    data: {},
  });
  fireEvent.click(screen.getByRole('button', { name: /^Archive / }));
  expect(run).toHaveBeenCalledTimes(1);
  const dialog = screen.getByRole('dialog', { name: /Archive .*\?/ });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  fireEvent.click(screen.getByRole('button', { name: /^Archive / }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Archive layout',
    }),
  );
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith({
      action: 'ARCHIVE_LAYOUT',
      id: 1,
      expectedRevision: 1,
      data: {},
    }),
  );
});

it('edits a published layout in its own screen without offering another draft', async () => {
  const run = vi.fn().mockResolvedValue({ id: 2 });
  render(
    <LayoutScreen data={managerData()} layoutId={1} run={run} canManage />,
  );
  expect(screen.queryByText('Saved layouts')).toBeNull();
  expect(screen.queryByText('Create new draft')).toBeNull();
  expect(screen.queryByText('Save and publish layout')).toBeNull();
  fireEvent.change(screen.getByLabelText('Area name'), {
    target: { value: 'North' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SAVE_LAYOUT',
        id: 1,
        expectedRevision: 1,
      }),
    ),
  );
});

it('loads a layout editor by layout id without treating it as an occurrence id', async () => {
  const api = {
    read: vi.fn().mockResolvedValue(managerData()),
    command: vi.fn(),
    vendorAssignments: vi.fn(),
  };
  render(
    <Phase14Routes
      api={api}
      path="/market/layouts/1/edit"
      permissions={['ReadOwnMarketLayouts', 'ManageOwnMarketLayouts']}
    />,
  );
  await screen.findByTestId('layout-editor');
  expect(api.read).toHaveBeenCalledWith('LAYOUTS', undefined);
  expect(
    within(screen.getByTestId('layout-editor')).getByRole('button', {
      name: 'Save layout',
    }),
  ).toBeInTheDocument();
});

it('shows archived layouts separately with only an unarchive action and the sidebar chevrons', async () => {
  const data = managerData();
  data.archivedLayouts = [
    {
      ...data.layouts![0]!,
      id: 7,
      name: 'Old square',
      revision: 3,
      deletedAt: '2026-10-09T12:00:00Z',
    },
  ];
  const run = vi.fn().mockResolvedValue({ id: 7 });
  const user = (await import('@testing-library/user-event')).default.setup();
  render(<Layouts data={data} run={run} canManage />);
  const saved = screen.getByRole('button', { name: 'Saved layouts' });
  const archived = screen.getByRole('button', { name: 'Archived layouts' });
  expect(saved.querySelector('svg.decorative-chevron path')).toHaveAttribute(
    'd',
    'm4 6 4 4 4-4',
  );
  expect(archived.querySelector('svg.decorative-chevron')).toBeTruthy();
  await user.click(archived);
  const card = screen.getByRole('article', { name: 'Old square' });
  expect(within(card).getAllByRole('button')).toHaveLength(1);
  await user.click(
    within(card).getByRole('button', { name: 'Unarchive layout' }),
  );
  expect(run).toHaveBeenCalledWith({
    action: 'UNARCHIVE_LAYOUT',
    id: 7,
    expectedRevision: 3,
    data: {},
  });
});

it('never offers restore controls without layout management permission', () => {
  const data = managerData();
  data.archivedLayouts = [
    {
      ...data.layouts![0]!,
      name: 'Old square',
      deletedAt: '2026-10-09T12:00:00Z',
    },
  ];
  render(<Layouts data={data} run={vi.fn()} canManage={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Archived layouts' }));
  expect(screen.getByRole('article', { name: 'Old square' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Unarchive layout' })).toBeNull();
});

it('keeps an archived layout out of the editor until it is restored', () => {
  const data = managerData();
  data.archivedLayouts = [
    { ...data.layouts![0]!, deletedAt: '2026-10-09T12:00:00Z' },
  ];
  data.layouts = [];
  render(<LayoutScreen data={data} layoutId={1} run={vi.fn()} canManage />);
  expect(screen.queryByTestId('layout-editor')).toBeNull();
  expect(
    screen.getByText('This layout is unavailable or archived.'),
  ).toBeVisible();
});
