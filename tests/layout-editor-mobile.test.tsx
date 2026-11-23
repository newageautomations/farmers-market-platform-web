import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { MapElement } from '@market/api';
import { LayoutEditor } from '../apps/admin/src/market/phase14/Layouts';
import type { MapCanvas } from '../packages/ui/src/map/MapCanvas';
import { managerData } from './fixtures/market-dashboard-data';

const canvas = vi.hoisted(() => ({
  props: {} as ComponentProps<typeof MapCanvas>,
}));
vi.mock('../packages/ui/src/map/MapCanvas', () => ({
  MapCanvas: (props: ComponentProps<typeof MapCanvas>) => {
    canvas.props = props;
    return null;
  },
}));

// Phone viewport: the editor's mobile query (and reduced motion, so sheets
// unmount without waiting for their slide-out animation).
beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});
afterEach(() => vi.unstubAllGlobals());

const rect = (id: string): MapElement => ({
  id,
  areaId: 'main',
  type: 'RECTANGLE',
  x: 200,
  y: 300,
  width: 100,
  height: 80,
  rotation: 0,
  zIndex: 2,
  text: id,
  fill: '#315947',
});

function editor() {
  const data = managerData();
  data.assignments = [];
  const version = {
    ...data.layoutVersions![0]!,
    status: 'DRAFT' as const,
    definition: {
      ...data.layoutVersions![0]!.definition,
      areas: [{ id: 'main', name: 'Main' }],
      elements: [rect('one'), rect('two')],
    },
  };
  render(
    <LayoutEditor
      version={version}
      data={data}
      run={vi.fn()}
      canManage
      occurrenceId={101}
    />,
  );
}

test('phone editor opens on the map with an icon tool bar and no open panels', () => {
  editor();
  const section = screen.getByTestId('layout-editor');
  expect(section).toHaveClass('is-mobile');
  const bar = screen.getByRole('navigation', { name: 'Design tools' });
  for (const name of [
    'Add',
    'Layers',
    'Smart',
    'Assets',
    'Settings',
    'Details',
  ])
    expect(within(bar).getByRole('button', { name })).toBeInTheDocument();
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  // Desktop-only chrome is not rendered on a phone.
  expect(
    screen
      .queryByRole('navigation', { name: 'Design tools', hidden: true })
      ?.classList.contains('designer-rail'),
  ).toBe(false);
  expect(section.querySelector('.designer-footer')).toBeNull();
});

test('tool bar buttons slide up one sheet at a time and adding closes it', () => {
  editor();
  const bar = screen.getByRole('navigation', { name: 'Design tools' });
  fireEvent.click(within(bar).getByRole('button', { name: 'Add' }));
  expect(
    screen.getByRole('complementary', { name: 'Add elements' }),
  ).toBeInTheDocument();
  fireEvent.click(within(bar).getByRole('button', { name: 'Layers' }));
  expect(
    screen.queryByRole('complementary', { name: 'Add elements' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('complementary', { name: 'Layers' })).toBeVisible();
  fireEvent.click(within(bar).getByRole('button', { name: 'Add' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add rectangle' }));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  // The new element is selected, so the contextual bar replaces the tools.
  expect(
    screen.getByRole('navigation', { name: 'Selection commands' }),
  ).toBeInTheDocument();
});

test('a selection shows contextual commands whose menus open as sheets', () => {
  editor();
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Design tools' })).getByRole(
      'button',
      { name: 'Layers' },
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'one' }));
  const bar = screen.getByRole('navigation', { name: 'Selection commands' });
  fireEvent.click(within(bar).getByRole('button', { name: 'Arrange' }));
  const arrange = screen.getByRole('complementary', { name: 'Arrange' });
  fireEvent.click(
    within(arrange).getByRole('button', { name: 'Send to back' }),
  );
  expect(
    screen.queryByRole('complementary', { name: 'Arrange' }),
  ).not.toBeInTheDocument();
  fireEvent.click(within(bar).getByRole('button', { name: 'Edit' }));
  expect(screen.getByTestId('layout-inspector')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: /^Done, clear 1 selected$/ }),
  );
  expect(
    screen.getByRole('navigation', { name: 'Design tools' }),
  ).toBeInTheDocument();
});

test('the header keeps save and moves secondary commands into a sheet', () => {
  editor();
  expect(screen.getByRole('button', { name: 'Save layout' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Layout options' }));
  const menu = screen.getByRole('complementary', { name: 'Layout options' });
  expect(within(menu).getByRole('button', { name: 'Zoom in' })).toBeVisible();
  fireEvent.click(
    within(menu).getByRole('button', { name: 'Preview public map' }),
  );
  expect(screen.getByTestId('layout-editor')).toHaveClass('is-preview');
  expect(
    screen.queryByRole('navigation', { name: 'Design tools' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to editing' }));
  expect(canvas.props.editable).toBe(true);
});

test('Escape closes the open sheet without clearing the selection', () => {
  editor();
  fireEvent.click(screen.getByRole('button', { name: 'Layers' }));
  fireEvent.click(screen.getByRole('button', { name: 'two' }));
  const sheet = screen.getByRole('complementary', { name: 'Layers' });
  fireEvent.keyDown(within(sheet).getByRole('button', { name: 'two' }), {
    key: 'Escape',
  });
  expect(
    screen.queryByRole('complementary', { name: 'Layers' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('navigation', { name: 'Selection commands' }),
  ).toBeInTheDocument();
});

function render2(props: Partial<ComponentProps<typeof LayoutEditor>>) {
  const data = managerData();
  data.assignments = [];
  const version = { ...data.layoutVersions![0]!, status: 'DRAFT' as const };
  render(
    <LayoutEditor
      version={version}
      data={data}
      run={vi.fn()}
      canManage
      {...props}
    />,
  );
}

test('read-only phone editor offers viewing tools only', () => {
  render2({ canManage: false });
  expect(
    screen.queryByRole('button', { name: 'Save layout' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Undo' }),
  ).not.toBeInTheDocument();
  const bar = screen.getByRole('navigation', { name: 'Design tools' });
  expect(
    within(bar)
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual(['Layers', 'Settings', 'Details']);
});

test('occurrence phone editor saves through its host without publish or copy', () => {
  render2({
    occurrenceId: 101,
    onSave: vi.fn(async () => undefined),
    notice: 'Changes apply to this occurrence.',
  });
  expect(screen.queryByLabelText('Layout name')).not.toBeInTheDocument();
  expect(
    screen.getByText('Changes apply to this occurrence.'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Layout options' }));
  const menu = screen.getByRole('complementary', { name: 'Layout options' });
  expect(
    within(menu).queryByRole('button', { name: 'Copy layout' }),
  ).not.toBeInTheDocument();
  expect(
    within(menu).queryByRole('button', { name: 'Save and publish layout' }),
  ).not.toBeInTheDocument();
});
