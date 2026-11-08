import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { expect, test, vi } from 'vitest';
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
const decoration = (
  id: string,
  patch: Partial<MapElement> = {},
): MapElement => ({
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
  ...patch,
});
function editor(
  elements?: MapElement[],
  media?: ComponentProps<typeof LayoutEditor>['media'],
) {
  const data = managerData();
  const version = { ...data.layoutVersions![0]!, status: 'DRAFT' as const };
  if (elements) data.assignments = [];
  if (elements)
    version.definition = {
      ...version.definition,
      areas: [{ id: 'main', name: 'Main' }],
      elements,
    };
  const run = vi.fn();
  render(
    <LayoutEditor
      version={version}
      data={data}
      run={run}
      canManage
      occurrenceId={101}
      media={media}
    />,
  );
  return { run, version };
}

test('tool groups preserve insertion and open the requested smart tool directly', () => {
  editor([]);
  expect(screen.getByRole('group', { name: 'Navigation' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add triangle' }));
  expect(canvas.props.definition.elements[0]?.type).toBe('TRIANGLE');
  fireEvent.click(screen.getByRole('button', { name: 'Smart booth row' }));
  expect(screen.getByLabelText('Smart design tool')).toHaveValue('row');
  fireEvent.change(screen.getByLabelText('Smart design tool'), {
    target: { value: 'style' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  fireEvent.click(screen.getByRole('button', { name: 'Smart booth row' }));
  expect(screen.getByLabelText('Smart design tool')).toHaveValue('row');
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  fireEvent.click(screen.getByRole('button', { name: 'Premade arrangements' }));
  expect(screen.getByLabelText('Smart design tool')).toHaveValue('arrangement');
  fireEvent.click(screen.getByRole('button', { name: 'Insert arrangement' }));
  expect(canvas.props.definition.elements.some((e) => !!e.groupId)).toBe(true);
});

test('asset search and category filters survive repeated insertion and give an empty state', () => {
  editor([]);
  fireEvent.click(screen.getByRole('button', { name: 'Assets' }));
  fireEvent.change(screen.getByLabelText('Search assets'), {
    target: { value: 'oak' },
  });
  const browser = screen
    .getByLabelText('Search assets')
    .closest('.designer-asset-browser') as HTMLElement;
  const assets = () =>
    within(browser)
      .getAllByRole('button')
      .filter((button) => !!button.querySelector('img'));
  expect(assets()).toHaveLength(1);
  fireEvent.click(assets()[0]!);
  fireEvent.click(assets()[0]!);
  expect(canvas.props.definition.elements).toHaveLength(2);
  expect(screen.getByLabelText('Search assets')).toHaveValue('oak');
  fireEvent.change(screen.getByLabelText('Asset category'), {
    target: { value: 'Transportation and accessibility' },
  });
  expect(within(browser).getByText(/No assets match/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search assets'), {
    target: { value: '' },
  });
  expect(assets().length).toBeGreaterThan(0);
});

test('selection controls, shared appearance and layers retain history, flags, names and order', () => {
  editor([decoration('Entrance'), decoration('Garden', { zIndex: 3 })]);
  act(() => canvas.props.onSelection?.(['Entrance', 'Garden']));
  fireEvent.click(screen.getByRole('button', { name: 'Style' }));
  fireEvent.change(screen.getByLabelText('Selection opacity'), {
    target: { value: '0.4' },
  });
  expect(canvas.props.definition.elements.every((e) => e.opacity === 0.4)).toBe(
    true,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(
    canvas.props.definition.elements.every((e) => e.opacity === undefined),
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Layers' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rename Entrance' }));
  fireEvent.change(screen.getByLabelText('Object name'), {
    target: { value: 'Welcome area' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
  expect(canvas.props.definition.elements[0]?.text).toBe('Welcome area');
  fireEvent.click(screen.getByLabelText('Lock Welcome area'));
  expect(canvas.props.definition.elements[0]?.locked).toBe(true);
  fireEvent.click(screen.getByLabelText('Lock Welcome area'));
  fireEvent.click(screen.getByLabelText('Hide Welcome area'));
  expect(canvas.props.definition.elements[0]?.editorHidden).toBe(true);
  fireEvent.click(screen.getByLabelText('Hide Welcome area'));
  fireEvent.click(
    screen.getByRole('button', { name: 'Bring Welcome area forward' }),
  );
  expect(
    canvas.props.definition.elements.find((e) => e.id === 'Entrance')!.zIndex,
  ).toBeGreaterThan(
    canvas.props.definition.elements.find((e) => e.id === 'Garden')!.zIndex,
  );
  act(() => canvas.props.onSelection?.([]));
  expect(screen.queryByRole('button', { name: 'Duplicate' })).toBeNull();
});

test('preview preserves unsaved edits, disables editing shortcuts, and omits vendor/status data', () => {
  const { run } = editor();
  fireEvent.click(screen.getByRole('button', { name: 'Add rectangle' }));
  const before = structuredClone(canvas.props.definition);
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  expect(
    screen.getByText(/Public map preview of current unsaved draft content/),
  ).toBeInTheDocument();
  expect(canvas.props.editable).toBe(false);
  expect(canvas.props.selectedIds).toEqual([]);
  expect(canvas.props.statuses).toEqual({});
  expect(canvas.props.grid).toBe(false);
  expect(canvas.props.spaces!.every((space) => !('spaceType' in space))).toBe(
    true,
  );
  expect(canvas.props.spaces!.every((space) => space.vendor === null)).toBe(
    true,
  );
  expect(screen.queryByRole('navigation', { name: 'Design tools' })).toBeNull();
  expect(screen.queryByLabelText('Layout properties')).toBeNull();
  fireEvent.keyDown(document.body, { key: 'Delete' });
  fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
  expect(canvas.props.definition).toEqual(before);
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Back to editing' }));
  expect(canvas.props.definition).toEqual(before);
  expect(canvas.props.editable).toBe(true);
  expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
});

test('properties panel can collapse and inserting an element reopens it', () => {
  editor([]);
  fireEvent.click(screen.getByRole('button', { name: 'Hide panel' }));
  expect(screen.queryByLabelText('Layout properties')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Add rectangle' }));
  expect(screen.getByLabelText('Layout properties')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hide panel' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});

test('images can be uploaded, chosen from the library and replaced', async () => {
  const media = {
    images: vi.fn().mockResolvedValue([
      { id: '7', name: 'Sponsor banner', preview: 'https://cdn.test/banner.png' },
    ]),
    upload: vi.fn().mockResolvedValue({
      id: '8',
      name: 'site-plan.png',
      preview: 'https://cdn.test/site-plan.png',
    }),
  };
  editor([], media);
  fireEvent.click(
    screen.getByRole('button', { name: 'Upload or choose image' }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Choose Sponsor banner' }),
  );
  await waitFor(() =>
    expect(canvas.props.definition.elements.at(-1)).toMatchObject({
      type: 'IMAGE',
      imageUrl: 'https://cdn.test/banner.png',
      text: 'Sponsor banner',
    }),
  );
  expect(canvas.props.definition.elements.at(-1)!.assetId).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Replace image' }));
  const file = new File(['png'], 'site-plan.png', { type: 'image/png' });
  fireEvent.change(
    within(screen.getByRole('dialog', { name: 'Choose an image' }))
      .getByLabelText('Upload image (PNG or JPEG)'),
    { target: { files: [file] } },
  );
  await waitFor(() => expect(media.upload).toHaveBeenCalledWith(file));
  await waitFor(() =>
    expect(canvas.props.definition.elements.at(-1)!.imageUrl).toBe(
      'https://cdn.test/site-plan.png',
    ),
  );
  expect(canvas.props.definition.elements).toHaveLength(1);
});

test('without the image library, Image still inserts a URL frame and explains access', () => {
  editor([]);
  fireEvent.click(screen.getByRole('button', { name: 'Add image' }));
  expect(canvas.props.definition.elements.at(-1)?.type).toBe('IMAGE');
  expect(screen.getByLabelText('Image or logo URL')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Assets' }));
  expect(
    screen.getByText(/Uploads and the image library require website management access/),
  ).toBeInTheDocument();
});
