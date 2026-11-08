import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { MapDefinition, MapElement, OperationsCommand } from '@market/api';
import {
  boothRow,
  applyMapStyle,
  mapStylePresets,
  equalSpacing,
  matchSize,
  colorBooths,
  boothTypeColor,
  insertArrangement,
  mapArrangements,
  createMapLegend,
  isMapLegend,
  mapLegendEntries,
  MAP_LEGEND_TEMPLATE,
  type BoothRowOptions,
} from '../packages/ui/src/map/smart-design';
import {
  align,
  baseSpace,
  bounds,
  drawingHistory,
  group,
  type Drawing,
} from '../packages/ui/src/map/model';
import { mapAssets } from '../packages/ui/src/map/assets';
import { visibleMapElements } from '../packages/ui/src/map/visuals';
import { LayoutEditor } from '../apps/admin/src/market/phase14/Layouts';
import { managerData } from './fixtures/market-dashboard-data';

const canvas = vi.hoisted(() => ({
  props: {} as {
    definition: MapDefinition;
    onSelection: (ids: string[]) => void;
    statuses: Record<string, string>;
    snapObjects: boolean;
  },
}));
vi.mock('../packages/ui/src/map/MapCanvas', () => ({
  MapCanvas: (props: typeof canvas.props) => {
    canvas.props = props;
    return null;
  },
}));
const element = (id: string, patch: Partial<MapElement> = {}): MapElement => ({
  id,
  areaId: 'main',
  type: 'RECTANGLE',
  x: 10,
  y: 20,
  width: 100,
  height: 80,
  rotation: 0,
  zIndex: 0,
  text: id,
  fill: '#abcdef',
  ...patch,
});
const drawing = (elements: MapElement[] = []): Drawing => ({
  definition: {
    pixelsPerFoot: 10,
    areas: [{ id: 'main', name: 'Main' }],
    elements,
  },
  spaces: {},
});
const options: BoothRowOptions = {
  count: 3,
  widthFeet: 12,
  depthFeet: 8,
  gapFeet: 2,
  orientation: 'horizontal',
  start: 7,
  prefix: 'B',
  rotation: 0,
};
const factory = () => {
  let i = 0;
  return () => `new-${++i}`;
};

test.each(['horizontal', 'vertical'] as const)(
  'real %s booth rows preserve existing identities and metadata',
  (orientation) => {
    const before = drawing([element('existing', { type: 'SPACE' })]);
    before.physicalBoothIds = { existing: 41 };
    before.spaces.existing = {
      ...baseSpace('A01'),
      managerNotes: 'private',
      preferredDirectoryId: 12,
    };
    const result = boothRow(
      before,
      'main',
      { x: 500, y: 500 },
      { ...options, orientation },
      factory(),
    );
    expect(result.ids).toHaveLength(3);
    expect(result.drawing.physicalBoothIds).toEqual({ existing: 41 });
    expect(result.drawing.spaces.existing).toEqual(before.spaces.existing);
    const added = result.drawing.definition.elements.slice(1);
    expect(added.map((e) => e.text)).toEqual(['B7', 'B8', 'B9']);
    expect(
      added.every(
        (e) =>
          e.type === 'SPACE' &&
          e.width === 120 &&
          e.height === 80 &&
          !e.groupId,
      ),
    ).toBe(true);
    expect(
      added[1]![orientation === 'horizontal' ? 'x' : 'y'] -
        added[0]![orientation === 'horizontal' ? 'x' : 'y'],
    ).toBe(orientation === 'horizontal' ? 140 : 100);
    expect(result.drawing.spaces[result.ids[0]!]).toEqual({
      ...baseSpace('B7'),
      widthFeet: 12,
      depthFeet: 8,
    });
    expect(before.definition.elements).toHaveLength(1);
  },
);
test('row rotation rotates booth centers and orientation without changing physical feet', () => {
  const result = boothRow(
    drawing(),
    'main',
    { x: 0, y: 0 },
    { ...options, rotation: 90 },
    factory(),
  );
  const [a, b] = result.drawing.definition.elements;
  expect(a!.x).toBe(b!.x);
  expect(b!.y - a!.y).toBe(140);
  expect(a!.rotation).toBe(90);
  expect(result.drawing.spaces[a!.id]!.widthFeet).toBe(12);
});
test('row collision and invalid measurements fail atomically before issuing IDs', () => {
  const d = drawing();
  d.spaces.old = baseSpace('b8');
  const id = vi.fn(() => 'id');
  expect(() => boothRow(d, 'main', { x: 0, y: 0 }, options, id)).toThrow(
    /b8|B8/,
  );
  expect(id).not.toHaveBeenCalled();
  expect(d.definition.elements).toHaveLength(0);
  for (const patch of [
    { count: 1.5 },
    { widthFeet: NaN },
    { depthFeet: 0 },
    { gapFeet: -1 },
    { rotation: Infinity },
    { start: -1 },
    { prefix: 'x'.repeat(80) },
  ])
    expect(() =>
      boothRow(drawing(), 'main', { x: 0, y: 0 }, { ...options, ...patch }, id),
    ).toThrow();
  expect(() =>
    boothRow(drawing(), 'main', { x: 1000000, y: 0 }, options, id),
  ).toThrow(/coordinates/);
  expect(() =>
    boothRow(
      drawing(Array.from({ length: 999 }, (_, i) => element(String(i)))),
      'main',
      { x: 0, y: 0 },
      options,
      id,
    ),
  ).toThrow(/limit/);
});
test('row and preset edits each undo and redo as one complete transaction', () => {
  const before = drawing(),
    row = boothRow(before, 'main', { x: 0, y: 0 }, options, factory()).drawing;
  const h = drawingHistory(
    { present: before, past: [], future: [] },
    { type: 'EDIT', value: row },
  );
  expect(drawingHistory(h, { type: 'UNDO' }).present).toEqual(before);
  expect(
    drawingHistory(drawingHistory(h, { type: 'UNDO' }), { type: 'REDO' })
      .present,
  ).toEqual(row);
  const styled = applyMapStyle(row, 'modern'),
    next = drawingHistory(h, { type: 'EDIT', value: styled });
  expect(drawingHistory(next, { type: 'UNDO' }).present).toEqual(row);
  expect(
    drawingHistory(drawingHistory(next, { type: 'UNDO' }), { type: 'REDO' })
      .present,
  ).toEqual(styled);
});
test.each(Object.keys(mapStylePresets) as Array<keyof typeof mapStylePresets>)(
  '%s preset changes only appearance and survives JSON reload',
  (preset) => {
    const d = drawing([
      element('booth', { type: 'SPACE' }),
      element('path', {
        type: 'LINE',
        points: [0, 0, 1, 1],
        curved: true,
        strokeWidth: 35,
      }),
      element('locked', { locked: true }),
      element('image', {
        type: 'IMAGE',
        imageUrl: 'https://example.test/plan.png',
        referenceOnly: true,
      }),
      element('title', { type: 'TEXT' }),
    ]);
    d.physicalBoothIds = { booth: 13 };
    d.spaces.booth = baseSpace('A01');
    const next = applyMapStyle(d, preset);
    expect(next.spaces).toBe(d.spaces);
    expect(next.physicalBoothIds).toBe(d.physicalBoothIds);
    next.definition.elements.forEach((e, i) => {
      const old = d.definition.elements[i]!;
      for (const key of [
        'id',
        'areaId',
        'x',
        'y',
        'width',
        'height',
        'rotation',
        'points',
        'curved',
        'zIndex',
        'text',
      ] as const)
        expect(e[key]).toEqual(old[key]);
    });
    expect(next.definition.elements[2]).toEqual(d.definition.elements[2]);
    expect(next.definition.elements[3]).toEqual(d.definition.elements[3]);
    expect(next.definition.elements[1]!.strokeWidth).toBe(35);
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
  },
);
test.each([
  'left',
  'center',
  'right',
  'top',
  'middle',
  'bottom',
  'horizontal',
  'vertical',
])(
  'alignment %s preserves authoritative physical details exactly',
  (command) => {
    const d = drawing([
      element('a', { type: 'SPACE', rotation: 30 }),
      element('b', { x: 250, y: 260 }),
      element('c', { x: 600, y: 500 }),
    ]);
    d.spaces.a = { ...baseSpace('A01'), widthFeet: 9.999999 };
    d.physicalBoothIds = { a: 41 };
    const next = align(d, ['a', 'b', 'c'], command);
    expect(next.spaces).toBe(d.spaces);
    expect(next.physicalBoothIds).toBe(d.physicalBoothIds);
    expect(next.definition.elements[0]!.width).toBe(100);
    expect(
      align(
        {
          ...d,
          definition: {
            ...d.definition,
            elements: d.definition.elements.map((e) => ({
              ...e,
              locked: true,
            })),
          },
        },
        ['a', 'b'],
        command,
      ).definition.elements[0]!.x,
    ).toBe(10);
  },
);
test.each(['x', 'y'] as const)(
  'equal %s gaps use rotated visible bounds without changing booth metadata',
  (axis) => {
    const d = drawing([
      element('a', { type: 'SPACE', rotation: 90 }),
      element('b', { x: 250, y: 400 }),
      element('c', { x: 500, y: 700 }),
    ]);
    d.spaces.a = baseSpace('A01');
    d.physicalBoothIds = { a: 3 };
    const next = equalSpacing(d, ['a', 'b', 'c'], axis, 3),
      boxes = next.definition.elements.map(bounds),
      size = axis === 'x' ? 'width' : 'height';
    expect(boxes[1]![axis] - boxes[0]![axis] - boxes[0]![size]).toBeCloseTo(30);
    expect(boxes[2]![axis] - boxes[1]![axis] - boxes[1]![size]).toBeCloseTo(30);
    expect(next.spaces).toBe(d.spaces);
    expect(next.physicalBoothIds).toBe(d.physicalBoothIds);
    const h = drawingHistory(
      { present: d, past: [], future: [] },
      { type: 'EDIT', value: next },
    );
    expect(drawingHistory(h, { type: 'UNDO' }).present).toEqual(d);
  },
);
test('match size uses selection order and refuses operational, locked, path or grouped objects', () => {
  const d = drawing([element('a'), element('b', { width: 260, height: 140 })]);
  expect(matchSize(d, ['b', 'a'], 'width').definition.elements[0]!.width).toBe(
    260,
  );
  expect(
    matchSize(d, ['a', 'b'], 'height').definition.elements[1]!.height,
  ).toBe(80);
  for (const patch of [
    { type: 'SPACE' as const },
    { type: 'LINE' as const },
    { locked: true },
    { editorHidden: true },
    { groupId: 'g' },
  ]) {
    const blocked = drawing([element('a'), element('b', patch)]);
    expect(matchSize(blocked, ['a', 'b'], 'width')).toBe(blocked);
  }
});
test('alignment and spacing treat groups as units and reject partial or locked groups', () => {
  const d = drawing([
    element('a', { groupId: 'g' }),
    element('b', { x: 150, y: 60, groupId: 'g' }),
    element('c', { x: 600, y: 400 }),
  ]);
  for (const next of [
    align(d, ['a', 'b', 'c'], 'top'),
    equalSpacing(d, ['a', 'b', 'c'], 'x', 4),
  ]) {
    const [a, b] = next.definition.elements;
    expect(b!.x - a!.x).toBe(140);
    expect(b!.y - a!.y).toBe(40);
  }
  expect(align(d, ['a', 'b'], 'left')).toBe(d);
  expect(align(d, ['a', 'c'], 'left')).toBe(d);
  expect(equalSpacing(d, ['a', 'c'], 'x', 2)).toBe(d);
  const locked = {
    ...d,
    definition: {
      ...d.definition,
      elements: d.definition.elements.map((e) =>
        e.id === 'b' ? { ...e, locked: true } : e,
      ),
    },
  };
  expect(equalSpacing(locked, ['a', 'b', 'c'], 'x', 2)).toBe(locked);
});
test.each(Object.keys(mapArrangements) as Array<keyof typeof mapArrangements>)(
  '%s arrangement uses only existing editable decorations and artwork',
  (key) => {
    const d = drawing(),
      result = insertArrangement(d, 'main', { x: 200, y: 200 }, key, factory());
    expect(result.ids.length).toBeGreaterThan(2);
    expect(result.drawing.spaces).toBe(d.spaces);
    expect(
      result.drawing.definition.elements.every(
        (e) => e.type !== 'SPACE' && !!e.groupId,
      ),
    ).toBe(true);
    for (const e of result.drawing.definition.elements)
      if (e.assetId)
        expect(mapAssets.some((a) => a.id === e.assetId)).toBe(true);
    expect(
      group(result.drawing, result.ids).definition.elements.every(
        (e) => !e.groupId,
      ),
    ).toBe(true);
  },
);
test('booth coloring respects locks, derives actual types, and never modifies operational data', () => {
  const d = drawing([
    element('a', { type: 'SPACE' }),
    element('b', { type: 'SPACE', locked: true }),
    element('decor'),
  ]);
  d.spaces.a = { ...baseSpace('A01'), spaceType: 'FOOD_TRUCK' };
  expect(colorBooths(d, 'type', '#123456').definition.elements[0]!.fill).toBe(
    boothTypeColor('FOOD_TRUCK'),
  );
  const next = colorBooths(d, 'uniform', '#123456');
  expect(next.spaces).toBe(d.spaces);
  expect(next.definition.elements.map((e) => e.fill)).toEqual([
    '#123456',
    '#abcdef',
    '#abcdef',
  ]);
});
test('legends derive only represented categories, amenities and supplied statuses, never persisted status snapshots', () => {
  const elements = [
    element('a', { type: 'SPACE' }),
    element('b', { type: 'SPACE' }),
    element('parking', { type: 'IMAGE', assetId: 'parking' }),
    element('reference', {
      type: 'IMAGE',
      assetId: 'restroom',
      referenceOnly: true,
    }),
  ];
  const spaces = ['a', 'b'].map((elementId) => ({
    elementId,
    ...baseSpace(elementId),
    vendor: null,
  }));
  const entries = mapLegendEntries(elements, spaces);
  expect(entries.map((e) => e.label)).toEqual(['BOOTH', 'Parking']);
  expect(
    mapLegendEntries(elements, spaces, { a: 'assigned', b: 'paid' }).map(
      (e) => e.label,
    ),
  ).toEqual(['Assigned', 'Assigned, paid', 'Parking']);
  expect(
    mapLegendEntries(elements, spaces, { a: 'available' }).some(
      (e) => e.label === 'Unassigned (check scheduling)',
    ),
  ).toBe(true);
  const d = drawing(elements),
    result = createMapLegend(d, 'main', { x: 0, y: 0 }, 'Welcome', factory()),
    legend = result.drawing.definition.elements.at(-1)!;
  expect(isMapLegend(legend)).toBe(true);
  expect(legend.text).toBe(MAP_LEGEND_TEMPLATE + 'Welcome');
  expect(legend.text).not.toMatch(/assigned|Parking|BOOTH/);
  const reloaded = JSON.parse(JSON.stringify(result.drawing)) as Drawing;
  expect(isMapLegend(reloaded.definition.elements.at(-1)!)).toBe(true);
  expect(
    visibleMapElements(reloaded.definition.elements, false),
  ).toContainEqual(legend);
  expect(mapLegendEntries([], spaces, { a: 'assigned' })).toEqual([]);
  expect(
    mapLegendEntries(
      [elements[0]!],
      [{ ...spaces[0]!, spaceType: undefined }],
    )[0]!.label,
  ).toBe('Booths (10 × 10 ft)');
});

test('editor row insertion, undo/redo, collision feedback and SAVE_LAYOUT preserve identity mapping', async () => {
  const data = managerData(),
    version = { ...data.layoutVersions![0]!, status: 'DRAFT' as const },
    run = vi.fn().mockResolvedValue(undefined);
  render(<LayoutEditor data={data} version={version} canManage run={run} />);
  const before = canvas.props.definition.elements.length;
  fireEvent.click(screen.getByRole('button', { name: 'Smart design' }));
  fireEvent.change(screen.getByLabelText('Number prefix'), {
    target: { value: 'Review-' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create booth row' }));
  expect(canvas.props.definition.elements).toHaveLength(before + 6);
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(canvas.props.definition.elements).toHaveLength(before);
  fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
  expect(canvas.props.definition.elements).toHaveLength(before + 6);
  fireEvent.click(screen.getByRole('button', { name: 'Create booth row' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/already exists/);
  expect(canvas.props.definition.elements).toHaveLength(before + 6);
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  await waitFor(() => expect(run).toHaveBeenCalled());
  const saved = (run.mock.calls[0]![0] as OperationsCommand)
    .data as unknown as Drawing;
  expect(saved.definition.elements).toHaveLength(before + 6);
  for (const e of saved.definition.elements.slice(before)) {
    expect(saved.spaces[e.id]!.widthFeet).toBe(10);
    expect(saved.physicalBoothIds?.[e.id]).toBeUndefined();
  }
});
test('editor styles, legends, snapping and booth-size protection integrate with existing controls', () => {
  const data = managerData(),
    version = { ...data.layoutVersions![0]!, status: 'DRAFT' as const };
  render(
    <LayoutEditor data={data} version={version} canManage run={vi.fn()} />,
  );
  const before = canvas.props.definition;
  fireEvent.click(screen.getByRole('button', { name: 'Smart design' }));
  fireEvent.change(screen.getByLabelText('Smart design tool'), {
    target: { value: 'style' },
  });
  expect(
    screen.getByRole('button', { name: 'Apply map style' }),
  ).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Replace existing map styling'));
  fireEvent.click(screen.getByRole('button', { name: 'Apply map style' }));
  expect(canvas.props.definition.background?.color).toBe('#f7f4e9');
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(canvas.props.definition).toEqual(before);
  fireEvent.change(screen.getByLabelText('Smart design tool'), {
    target: { value: 'legend' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Insert legend' }));
  expect(isMapLegend(canvas.props.definition.elements.at(-1)!)).toBe(true);
  fireEvent.change(screen.getByLabelText('Legend title'), {
    target: { value: 'Market guide' },
  });
  expect(canvas.props.definition.elements.at(-1)!.text).toBe(
    MAP_LEGEND_TEMPLATE + 'Market guide',
  );
  fireEvent.change(screen.getByLabelText('Smart design tool'), {
    target: { value: 'precision' },
  });
  act(() =>
    canvas.props.onSelection(
      canvas.props.definition.elements
        .filter((e) => e.type === 'SPACE')
        .map((e) => e.id),
    ),
  );
  expect(screen.getByRole('button', { name: 'Match width' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Snap to nearby edges and centers'));
  expect(canvas.props.snapObjects).toBe(false);
});
test('occurrence status preview follows assignments without saving operational colors', async () => {
  const data = managerData(),
    version = { ...data.layoutVersions![0]!, status: 'DRAFT' as const },
    save = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <LayoutEditor
      data={data}
      version={version}
      canManage
      run={vi.fn()}
      occurrenceId={101}
      onSave={save}
    />,
  );
  const originalFill = canvas.props.definition.elements[0]!.fill;
  fireEvent.click(screen.getByRole('button', { name: 'Smart design' }));
  fireEvent.change(screen.getByLabelText('Smart design tool'), {
    target: { value: 'appearance' },
  });
  fireEvent.click(
    screen.getByLabelText('Preview live scheduling status colors'),
  );
  expect(canvas.props.statuses['booth-a']).toBe('assigned');
  view.rerender(
    <LayoutEditor
      data={{ ...data, assignments: [] }}
      version={version}
      canManage
      run={vi.fn()}
      occurrenceId={101}
      onSave={save}
    />,
  );
  expect(canvas.props.statuses['booth-a']).toBe('available');
  expect(canvas.props.definition.elements[0]!.fill).toBe(originalFill);
  fireEvent.change(screen.getByLabelText('Smart design tool'), {
    target: { value: 'legend' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Insert legend' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  const saved = save.mock.calls[0]![0] as Drawing;
  expect(saved.definition.elements[0]!.fill).toBe(originalFill);
  expect(saved).not.toHaveProperty('statuses');
  expect(saved.definition.elements.at(-1)!.text).toBe(
    MAP_LEGEND_TEMPLATE + 'Map legend',
  );
});
test('smart styling and legend content use the existing revision-aware publish workflow', async () => {
  const data = managerData(),
    version = { ...data.layoutVersions![0]!, status: 'DRAFT' as const };
  const run = vi
    .fn()
    .mockImplementation(async (command: OperationsCommand) =>
      command.action === 'SAVE_LAYOUT'
        ? { ...version, revision: 9, definition: command.data.definition }
        : undefined,
    );
  render(<LayoutEditor data={data} version={version} canManage run={run} />);
  fireEvent.click(screen.getByRole('button', { name: 'Smart design' }));
  fireEvent.change(screen.getByLabelText('Smart design tool'), {
    target: { value: 'style' },
  });
  fireEvent.click(screen.getByLabelText('Replace existing map styling'));
  fireEvent.click(screen.getByRole('button', { name: 'Apply map style' }));
  fireEvent.change(screen.getByLabelText('Smart design tool'), {
    target: { value: 'legend' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Insert legend' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Save and publish layout' }),
  );
  await waitFor(() => expect(run).toHaveBeenCalledTimes(2));
  const save = run.mock.calls[0]![0] as OperationsCommand;
  expect(save.data.definition).toMatchObject({
    background: { color: '#f7f4e9' },
  });
  expect((save.data.definition as MapDefinition).elements.at(-1)!.text).toBe(
    MAP_LEGEND_TEMPLATE + 'Map legend',
  );
  expect(run.mock.calls[1]![0]).toEqual({
    action: 'PUBLISH_LAYOUT',
    id: version.id,
    expectedRevision: 9,
    data: {},
  });
});
test('read-only editors cannot run smart changes and legacy text is not a legend', () => {
  const data = managerData();
  render(
    <LayoutEditor
      data={data}
      version={data.layoutVersions![0]!}
      canManage={false}
      run={vi.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Smart design' })).toBeNull();
  expect(
    isMapLegend(element('text', { type: 'TEXT', text: 'Traditional legend' })),
  ).toBe(false);
});
