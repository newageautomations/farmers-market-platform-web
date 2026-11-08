import type { MapElement } from '@market/api';
import type { Point } from './model';

export const mapFonts = {
  sans: { label: 'System sans', family: 'Segoe UI, system-ui, sans-serif' },
  serif: { label: 'Georgia', family: 'Georgia, serif' },
  mono: { label: 'Consolas', family: 'Consolas, monospace' },
} as const;
export const backgroundPresets = [
  { name: 'Paper', color: '#faf8f2' },
  { name: 'Meadow', color: '#e6eddb' },
  { name: 'Courtyard', color: '#e9e6df' },
  { name: 'White', color: '#ffffff' },
] as const;
export const environmentPresets = [
  {
    id: 'sidewalk',
    name: 'Pedestrian sidewalk',
    fill: '#dedbd1',
    stroke: '#dedbd1',
    strokeWidth: 16,
    outlineColor: '#b8b4a8',
    outlineWidth: 2,
  },
  {
    id: 'paved-path',
    name: 'Paved walking path',
    fill: '#c7c5bd',
    stroke: '#c7c5bd',
    strokeWidth: 24,
    outlineColor: '#a5a59d',
    outlineWidth: 2,
  },
  {
    id: 'road',
    name: 'Road',
    fill: '#717b80',
    stroke: '#717b80',
    strokeWidth: 48,
    outlineColor: '#bfc4c0',
    outlineWidth: 3,
  },
  {
    id: 'gravel-path',
    name: 'Gravel path',
    fill: '#c6bda8',
    stroke: '#c6bda8',
    strokeWidth: 20,
    strokePattern: 'dotted',
  },
  {
    id: 'dirt-path',
    name: 'Dirt path',
    fill: '#b99976',
    stroke: '#b99976',
    strokeWidth: 20,
  },
  {
    id: 'curved-walkway',
    name: 'Curved walkway',
    fill: '#e5dfcf',
    stroke: '#e5dfcf',
    strokeWidth: 22,
    curved: true,
    outlineColor: '#bcb4a1',
    outlineWidth: 2,
  },
  {
    id: 'grass',
    name: 'Grass area',
    fill: '#b7cd91',
    stroke: '#91ad6c',
    strokeWidth: 2,
    closed: true,
    curved: true,
  },
  {
    id: 'pavement',
    name: 'Pavement area',
    fill: '#d2d2cb',
    stroke: '#b6b9af',
    strokeWidth: 2,
    closed: true,
  },
  {
    id: 'gravel',
    name: 'Gravel area',
    fill: '#c9c0ac',
    stroke: '#afa58f',
    strokeWidth: 2,
    closed: true,
  },
  {
    id: 'mulch',
    name: 'Soil or mulch area',
    fill: '#a38365',
    stroke: '#82644a',
    strokeWidth: 2,
    closed: true,
    curved: true,
  },
  {
    id: 'water',
    name: 'Water area',
    fill: '#a8ced2',
    stroke: '#79adb8',
    strokeWidth: 2,
    closed: true,
    curved: true,
  },
  {
    id: 'bed',
    name: 'Landscaping bed',
    fill: '#d3bd9b',
    stroke: '#aa9474',
    strokeWidth: 3,
    closed: true,
    curved: true,
  },
] satisfies Array<Partial<MapElement> & { id: string; name: string }>;
export function environmentStyle(id: string): Partial<MapElement> {
  const preset = environmentPresets.find((p) => p.id === id);
  if (!preset) return {};
  return Object.fromEntries(
    Object.entries(preset).filter(([key]) => key !== 'id' && key !== 'name'),
  );
}
/** Reduce sampled freehand paths to useful editable vertices, preserving endpoints. */
export function simplifyMapPath(
  e: Pick<MapElement, 'width' | 'height' | 'points'>,
): number[] | undefined {
  if (!e.points || e.points.length < 6) return e.points;
  const points = Array.from({ length: e.points.length / 2 }, (_, i) => ({
    x: e.points![i * 2]! * e.width,
    y: e.points![i * 2 + 1]! * e.height,
  }));
  const keep = new Set([0, points.length - 1]);
  const pending = [[0, points.length - 1]];
  while (pending.length) {
    const [first, last] = pending.pop()!;
    const a = points[first!]!,
      b = points[last!]!;
    let farthest = -1,
      distance = 3;
    for (let i = first! + 1; i < last!; i++) {
      const p = points[i]!,
        dx = b.x - a.x,
        dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
      const d = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
      if (d > distance) {
        distance = d;
        farthest = i;
      }
    }
    if (farthest !== -1) {
      keep.add(farthest);
      pending.push([first!, farthest], [farthest, last!]);
    }
  }
  return [...keep]
    .sort((a, b) => a - b)
    .flatMap((i) => [e.points![i * 2]!, e.points![i * 2 + 1]!]);
}
export function strokeDash(e: MapElement): number[] | undefined {
  const width = Math.max(1, e.strokeWidth ?? 1.5);
  return e.strokePattern === 'dashed'
    ? [width * 3, width * 2]
    : e.strokePattern === 'dotted'
      ? [0.01, width * 2]
      : undefined;
}
export function visibleMapElements(elements: MapElement[], authoring: boolean) {
  return elements.filter((e) =>
    authoring ? !e.editorHidden : !(e.type === 'IMAGE' && e.referenceOnly),
  );
}
/** Keep absolute rotated geometry stable while editing normalized path vertices. */
export function movePathPoint(
  e: MapElement,
  index: number,
  local: Point,
): MapElement {
  if (!e.points || index < 0 || index >= e.points.length / 2) return e;
  const points = [...e.points];
  points[index * 2] = Math.max(0, Math.min(1, local.x / e.width));
  points[index * 2 + 1] = Math.max(0, Math.min(1, local.y / e.height));
  return { ...e, points };
}
