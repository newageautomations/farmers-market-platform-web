import { expect, test } from 'vitest';
import {
  autoMapBounds,
  compactPath,
  constrainView,
  viewBounds,
  pathElement,
  PATH_POINT_LIMIT,
  type Drawing,
  type Point,
} from '../packages/ui/src/map/model';
import { boothRow } from '../packages/ui/src/map/smart-design';

const spiral = (count: number): Point[] =>
  Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 6,
      r = 20 + (i / count) * 400;
    return { x: r * Math.cos(t), y: r * Math.sin(t) };
  });

test('compactPath keeps both ends and fits the saved-path cap', () => {
  const points = spiral(5000);
  const compact = compactPath(points, PATH_POINT_LIMIT / 2);
  expect(compact.length).toBeLessThanOrEqual(PATH_POINT_LIMIT / 2);
  expect(compact[0]).toBe(points[0]);
  expect(compact.at(-1)).toBe(points.at(-1));
  // Still traces the spiral rather than collapsing to a straight line.
  expect(compact.length).toBeGreaterThan(50);
});

test('compactPath stays within the limit for noise its tolerance cannot thin', () => {
  const zigzag = Array.from({ length: 4000 }, (_, i) => ({
    x: i,
    y: i % 2 ? 1e5 : -1e5,
  }));
  const compact = compactPath(zigzag, 100);
  expect(compact.length).toBeLessThanOrEqual(100);
  expect(compact.at(-1)).toBe(zigzag.at(-1));
});

test('compactPath leaves short paths untouched', () => {
  const points = spiral(10);
  expect(compactPath(points, 20)).toBe(points);
});

test('a compacted long stroke ends at the last cursor point', () => {
  const points = spiral(3000);
  const path = pathElement(compactPath(points, PATH_POINT_LIMIT / 2));
  const last = points.at(-1)!;
  const n = path.points!.length;
  expect(path.x + path.points![n - 2]! * path.width).toBeCloseTo(last.x, -1);
  expect(path.y + path.points![n - 1]! * path.height).toBeCloseTo(last.y, -1);
});

const empty: Drawing = {
  definition: {
    pixelsPerFoot: 10,
    areas: [{ id: 'main', name: 'Main' }],
    elements: [],
  },
  spaces: {},
};
const row = {
  count: 3,
  widthFeet: 10,
  depthFeet: 10,
  gapFeet: 2,
  orientation: 'horizontal' as const,
  prefix: 'R',
  start: 1,
  rotation: 0,
};

test('booth row applies its price and amenities to every booth', () => {
  const { drawing, ids } = boothRow(
    empty,
    'main',
    { x: 0, y: 0 },
    { ...row, feeMinor: 4500, amenities: ['ELECTRICITY', 'SHADE'] },
    (() => {
      let id = 0;
      return () => `b${++id}`;
    })(),
  );
  expect(ids).toHaveLength(3);
  for (const id of ids) {
    expect(drawing.spaces[id]!.feeMinor).toBe(4500);
    expect(drawing.spaces[id]!.amenities).toEqual(['ELECTRICITY', 'SHADE']);
  }
  // Each booth owns its own amenities list.
  expect(drawing.spaces.b1!.amenities).not.toBe(drawing.spaces.b2!.amenities);
});

test('booth row rejects an out-of-range price', () => {
  expect(() =>
    boothRow(empty, 'main', { x: 0, y: 0 }, { ...row, feeMinor: -1 }, () =>
      crypto.randomUUID(),
    ),
  ).toThrow();
});

const size = { width: 800, height: 600 };
const limit = { x: 0, y: 0, width: 2000, height: 1000 };

test('constrainView keeps a large map covering the screen', () => {
  // Panned far past the right edge: the map's right edge meets the screen's.
  const v = constrainView({ x: -50000, y: 0, scale: 1 }, size, limit);
  expect(v.x).toBe(size.width - limit.width);
  // Panned past the top-left corner.
  const w = constrainView({ x: 5000, y: 5000, scale: 1 }, size, limit);
  expect([w.x, w.y]).toEqual([0, 0]);
});

test('constrainView stops zooming out well past the whole map', () => {
  const v = constrainView({ x: 0, y: 0, scale: 0.05 }, size, limit);
  expect(v.scale).toBeCloseTo(0.8 * Math.min(800 / 2000, 600 / 1000));
  // The zoomed-out map stays fully on screen.
  expect(v.x).toBeGreaterThanOrEqual(0);
  expect(v.x + limit.width * v.scale).toBeLessThanOrEqual(size.width);
});

test('viewers cannot zoom out past the bounds filling the screen', () => {
  const v = constrainView({ x: 0, y: 0, scale: 0.05 }, size, limit, true);
  expect(v.scale).toBeCloseTo(Math.max(800 / 2000, 600 / 1000));
  // Nothing outside the bounds is on screen.
  expect(v.x).toBeLessThanOrEqual(0);
  expect(v.y).toBeLessThanOrEqual(0);
  expect(v.x + limit.width * v.scale).toBeGreaterThanOrEqual(size.width);
  expect(v.y + limit.height * v.scale).toBeGreaterThanOrEqual(
    size.height - 1e-9,
  );
  // Dragged far away, it snaps back to the bounds' corner.
  const far = constrainView({ x: 9000, y: 9000, scale: 1 }, size, limit, true);
  expect([far.x, far.y]).toEqual([0, 0]);
});

test('constrainView returns the same object when already inside', () => {
  const v = { x: -100, y: -100, scale: 1 };
  expect(constrainView(v, size, limit)).toBe(v);
});

test('automatic bounds pad content and cover an empty area', () => {
  const element = {
    id: 'a',
    areaId: 'main',
    type: 'SPACE' as const,
    x: 0,
    y: 0,
    width: 400,
    height: 100,
    rotation: 0,
    zIndex: 0,
    text: '',
    fill: '#fff',
  };
  expect(autoMapBounds([element], 10)).toEqual({
    x: -200,
    y: -200,
    width: 800,
    height: 500,
  });
  expect(autoMapBounds([], 10)).toEqual({
    x: -1000,
    y: -1000,
    width: 2000,
    height: 2000,
  });
  // Editors keep content outside custom bounds reachable; viewers do not.
  const custom = { x: 1000, y: 1000, width: 100, height: 100 };
  expect(viewBounds(custom, [element], 10)).toBe(custom);
  expect(viewBounds(custom, [element], 10, true)).toEqual({
    x: -100,
    y: -100,
    width: 1200,
    height: 1200,
  });
});
