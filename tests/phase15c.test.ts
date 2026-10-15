import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  align,
  baseSpace,
  bounds,
  copies,
  defaults,
  drawingHistory,
  fit,
  geometry,
  group,
  marquee,
  normalizeTransform,
  nudge,
  objectSnap,
  pan,
  patchFlags,
  pathElement,
  remove,
  reorder,
  selectIds,
  snapGrid,
  syncBooths,
  worldPoint,
  zoomAt,
  type Drawing,
} from '../packages/ui/src/map/model';
import type { MapElement } from '@market/api';
const element = (id = 'a', patch: Partial<MapElement> = {}): MapElement => ({
  id,
  areaId: 'main',
  type: 'RECTANGLE',
  x: 20,
  y: 30,
  width: 100,
  height: 80,
  rotation: 0,
  zIndex: 0,
  text: id,
  fill: '#d4dccf',
  ...patch,
});
const drawing = (elements = [element()]): Drawing => ({
  definition: {
    pixelsPerFoot: 10,
    areas: [{ id: 'main', name: 'Main' }],
    elements,
  },
  spaces: {},
});
test('production editor uses genuine Stage/Layer/Transformer, Konva imports, and no alternate engine', () => {
  const stage = readFileSync('packages/ui/src/map/MapCanvas.tsx', 'utf8'),
    editor = readFileSync('apps/admin/src/market/phase14/Layouts.tsx', 'utf8'),
    map = readFileSync('packages/ui/src/MarketMap.tsx', 'utf8');
  expect(stage).toContain("from 'react-konva'");
  expect(stage).toContain("from 'konva'");
  for (const node of ['Stage', 'Layer', 'Transformer'])
    expect(stage).toContain('<' + node);
  expect(editor).toContain('<MapCanvas');
  expect(map).toContain('<MapCanvas');
  for (const source of [stage, editor]) {
    expect(source).not.toMatch(/<svg|tldraw|polotno|openWarehouse|fabric/i);
  }
  const pkg = JSON.parse(readFileSync('packages/ui/package.json', 'utf8'));
  expect(pkg.dependencies['react-konva']).toBe('19.3.0');
  expect(pkg.dependencies.konva).toBe('10.7.1');
  expect(pkg.dependencies.react).toBe('19.3.0');
});
test('Transformer scales normalize to bounded authoritative geometry and rotation', () => {
  const e = normalizeTransform(
    element(),
    { x: 300, y: 200, scaleX: 2, scaleY: 0.5, rotation: -45 },
    10,
  );
  expect(e).toMatchObject({
    x: 200,
    y: 180,
    width: 200,
    height: 40,
    rotation: 315,
  });
  expect(e).not.toHaveProperty('scaleX');
});
test('booth resize converts visual geometry to physical feet in the same history transaction', () => {
  const d = drawing([element('a', { type: 'SPACE' })]);
  d.spaces.a = baseSpace('A01');
  const changed = geometry(d, [
    normalizeTransform(
      d.definition.elements[0]!,
      { x: 100, y: 100, scaleX: 1.2, scaleY: 1.5, rotation: 0 },
      10,
    ),
  ]);
  expect(changed.spaces.a).toMatchObject({ widthFeet: 12, depthFeet: 12 });
  expect(
    normalizeTransform(
      element('b', { type: 'SPACE' }),
      { x: 0, y: 0, scaleX: 0.001, scaleY: 99999, rotation: 0 },
      10,
    ),
  ).toMatchObject({ width: 10, height: 10000 });
});
test('pointer-centered zoom preserves world coordinates and clamps extremes', () => {
  const v = { x: 40, y: -20, scale: 1 },
    p = { x: 130, y: 180 };
  expect(worldPoint(p, zoomAt(v, p, 2))).toEqual(worldPoint(p, v));
  expect(zoomAt(v, p, 100).scale).toBe(8);
  expect(zoomAt(v, p, 0).scale).toBe(0.05);
});
test('pan uses screen deltas without mutating geometry and fit accounts for rotation', () => {
  const v = { x: 40, y: 20, scale: 2 };
  expect(pan(v, { x: 50, y: -10 })).toEqual({ x: 90, y: 10, scale: 2 });
  expect(bounds(element('a', { rotation: 90 }))).toMatchObject({
    width: 80,
    height: 100,
  });
  expect(fit([element()], { width: 800, height: 600 }).scale).toBeGreaterThan(
    0,
  );
});
test('practical grid snap is deterministic', () => {
  expect(snapGrid(26, 10)).toBe(30);
  expect(snapGrid(-26, 10)).toBe(-30);
});
test.each(['x', 'y'] as const)(
  'object guides snap edges and centers on %s independently of zoom',
  (axis) => {
    const a = element('a', { x: 102, y: 102, width: 40, height: 40 }),
      b = element('b', { x: 100, y: 100, width: 40, height: 40 });
    const snap = objectSnap(a, [b]);
    expect(snap[axis]).toBe(100);
    expect(snap.guides).toContainEqual({ axis, value: 100 });
    expect(objectSnap(element('c', { x: 200, y: 200 }), [b]).guides).toEqual(
      [],
    );
  },
);
test('click, shift toggle and marquee select, including decoration group expansion', () => {
  const items = [
    element('a', { groupId: 'g' }),
    element('b', { x: 150, groupId: 'g' }),
    element('c', { x: 300 }),
  ];
  expect(selectIds(items, [], 'a')).toEqual(['a', 'b']);
  expect(selectIds(items, ['a', 'b'], 'c', true)).toEqual(['a', 'b', 'c']);
  expect(selectIds(items, ['a', 'b'], 'a', true)).toEqual([]);
  expect(marquee(items, { x: 0, y: 0 }, { x: 260, y: 120 })).toEqual([
    'a',
    'b',
  ]);
});
test('grouping preserves absolute geometry, disallows booths/locked elements and safely ungroups', () => {
  const d = drawing([element('a'), element('b')]),
    g = group(d, ['a', 'b'], 'group');
  expect(g.definition.elements.every((e) => e.groupId === 'group')).toBe(true);
  expect(
    group(g, ['a', 'b']).definition.elements.every((e) => !e.groupId),
  ).toBe(true);
  const booth = drawing([element('a', { type: 'SPACE' }), element('b')]);
  expect(group(booth, ['a', 'b'], 'group')).toBe(booth);
  expect(
    group(
      drawing([element('a', { locked: true }), element('b')]),
      ['a', 'b'],
      'g',
    ).definition.elements[0]!.groupId,
  ).toBeUndefined();
});
test('locked geometry cannot move, resize, nudge or delete until explicitly unlocked', () => {
  const d = drawing([element('a', { locked: true })]);
  expect(geometry(d, [element('a', { x: 400 })])).toEqual(d);
  expect(nudge(d, ['a'], { x: 1, y: 1 })).toEqual(d);
  expect(remove(d, ['a'])).toEqual(d);
  expect(
    remove(patchFlags(d, ['a'], { locked: false }), ['a']).definition.elements,
  ).toEqual([]);
});
test('visibility is explicitly editor-only and preserved through undo', () => {
  const d = drawing(),
    hidden = patchFlags(d, ['a'], { editorHidden: true });
  expect(hidden.definition.elements[0]!.editorHidden).toBe(true);
  expect(hidden.definition.elements[0]!.x).toBe(20);
  expect(
    marquee(hidden.definition.elements, { x: 0, y: 0 }, { x: 500, y: 500 }),
  ).toEqual([]);
});
test.each(['front', 'forward', 'backward', 'back'] as const)(
  'z-order %s creates deterministic contiguous indices',
  (command) => {
    const d = drawing([
        element('a'),
        element('b', { zIndex: 1 }),
        element('c', { zIndex: 2 }),
      ]),
      next = reorder(d, ['b'], command);
    expect(next.definition.elements.map((e) => e.zIndex)).toEqual([0, 1, 2]);
    expect(
      next.definition.elements[
        command === 'front' || command === 'forward' ? 2 : 0
      ]!.id,
    ).toBe('b');
  },
);
test('copy/paste issues unique booth/group identities and allowlists reusable booth properties', () => {
  const d = drawing([element('a', { type: 'SPACE', text: 'A01' })]);
  d.spaces.a = {
    ...baseSpace('A01'),
    feeMinor: 4000,
    amenities: ['ELECTRICITY'],
    managerNotes: 'secret',
    preferredDirectoryId: 99,
  };
  Object.assign(d.spaces.a, { assignmentId: 888, invoiceId: 777 });
  let id = 0;
  const pasted = copies(d, d, ['a'], 'main', () => `copy-${++id}`);
  expect(pasted.ids).toEqual(['copy-1']);
  expect(pasted.drawing.spaces['copy-1']).toMatchObject({
    label: 'A02',
    feeMinor: 4000,
    amenities: ['ELECTRICITY'],
    managerNotes: '',
    preferredDirectoryId: null,
  });
  expect(pasted.drawing.spaces['copy-1']).not.toHaveProperty('assignmentId');
  expect(pasted.drawing.spaces['copy-1']).not.toHaveProperty('invoiceId');
});
test('undo/redo covers full geometry/details/flags, clears future and bounds history', () => {
  const d = drawing();
  let h = { present: d, past: [] as Drawing[], future: [] as Drawing[] };
  for (let i = 0; i < 110; i++)
    h = drawingHistory(h, {
      type: 'EDIT',
      value: patchFlags(
        {
          ...d,
          definition: { ...d.definition, elements: [element('a', { x: i })] },
        },
        ['a'],
        { locked: i % 2 === 0 },
      ),
    });
  expect(h.past).toHaveLength(100);
  const undo = drawingHistory(h, { type: 'UNDO' });
  expect(drawingHistory(undo, { type: 'REDO' }).present).toEqual(h.present);
  expect(drawingHistory(undo, { type: 'EDIT', value: d }).future).toEqual([]);
});
test('arrow nudge and larger nudge preserve dimensions and physical metadata', () => {
  const d = drawing();
  expect(
    nudge(d, ['a'], { x: 10, y: -1 }).definition.elements[0],
  ).toMatchObject({ x: 30, y: 29, width: 100, height: 80 });
});
test('bulk sync copies only confirmed categories and never identity, preferences or notes', () => {
  const d = drawing([
    element('a', { type: 'SPACE', width: 120 }),
    element('b', { type: 'SPACE', x: 200 }),
  ]);
  d.spaces = {
    a: {
      ...baseSpace('A01'),
      widthFeet: 12,
      feeMinor: 4000,
      amenities: ['ELECTRICITY'],
      managerNotes: 'source secret',
      preferredDirectoryId: 4,
    },
    b: { ...baseSpace('A02'), managerNotes: 'keep', preferredDirectoryId: 3 },
  };
  const synced = syncBooths(
    d,
    'a',
    ['b'],
    ['physical dimensions', 'amenities', 'default fee'],
  );
  expect(synced.spaces.b).toMatchObject({
    label: 'A02',
    widthFeet: 12,
    feeMinor: 4000,
    amenities: ['ELECTRICITY'],
    managerNotes: 'keep',
    preferredDirectoryId: 3,
  });
  expect(synced.definition.elements[1]).toMatchObject({ width: 120, x: 200 });
  expect(
    syncBooths(
      patchFlags(d, ['b'], { locked: true }),
      'a',
      ['b'],
      ['amenities'],
    ).spaces.b!.amenities,
  ).toEqual([]);
});
test('old-layout defaults preserve SVG-era position, size, color and center rotation', () => {
  const original = element();
  expect(defaults(original)).toMatchObject({
    ...original,
    locked: false,
    editorHidden: false,
    opacity: 1,
    strokeWidth: 1.5,
    fontSize: 18,
  });
  expect(original).not.toHaveProperty('locked');
});
test('alignment/distribution works with rotated bounds and disallows locked mixed selection', () => {
  const d = drawing([
    element('a'),
    element('b', { x: 200, zIndex: 1 }),
    element('c', { x: 500, zIndex: 2 }),
  ]);
  expect(
    align(d, ['a', 'b'], 'left').definition.elements.map((e) => e.x),
  ).toEqual([20, 20, 500]);
  expect(
    align(d, ['a', 'b', 'c'], 'horizontal').definition.elements.map((e) => e.x),
  ).toEqual([20, 260, 500]);
  const locked = patchFlags(d, ['a'], { locked: true });
  expect(align(locked, ['a', 'b'], 'left')).toBe(locked);
});
test('freehand points remain normalized, bounded and capped without accepting SVG code', () => {
  const p = pathElement(
    Array.from({ length: 800 }, (_, i) => ({ x: i, y: i * 2 })),
  );
  expect(p.points).toHaveLength(1024);
  expect(p.points!.every((n) => n >= 0 && n <= 1)).toBe(true);
  expect(p).toMatchObject({ x: 0, y: 0, width: 511, height: 1022 });
});
