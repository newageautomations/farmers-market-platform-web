import type { MapDefinition, MapElement, SpaceDetails } from '@market/api';

export interface Point {
  x: number;
  y: number;
}
export interface Viewport extends Point {
  scale: number;
}
export interface Drawing {
  definition: MapDefinition;
  spaces: Record<string, SpaceDetails>;
}
export interface History {
  present: Drawing;
  past: Drawing[];
  future: Drawing[];
}
export const HISTORY_LIMIT = 100;
export const PATH_POINT_LIMIT = 512;
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export const round = (n: number) => Math.round(n * 1000) / 1000;
export function defaults(e: MapElement): MapElement {
  return {
    stroke:
      e.type === 'SPACE' ? '#27523b' : e.type === 'LINE' ? e.fill : '#718171',
    strokeWidth: e.type === 'LINE' ? 3 : 1.5,
    opacity: 1,
    fontSize: 18,
    fontWeight: 'normal',
    textAlign: 'left',
    locked: false,
    editorHidden: false,
    ...e,
  };
}
export function drawingHistory(
  state: History,
  action:
    | { type: 'EDIT'; value: Drawing; merge?: boolean }
    | { type: 'UNDO' | 'REDO' },
): History {
  if (action.type === 'EDIT') {
    if (JSON.stringify(action.value) === JSON.stringify(state.present))
      return state;
    return {
      present: action.value,
      past: action.merge
        ? state.past
        : [...state.past, state.present].slice(-HISTORY_LIMIT),
      future: [],
    };
  }
  if (action.type === 'UNDO' && state.past.length)
    return {
      present: state.past.at(-1)!,
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future],
    };
  if (action.type === 'REDO' && state.future.length)
    return {
      present: state.future[0]!,
      past: [...state.past, state.present].slice(-HISTORY_LIMIT),
      future: state.future.slice(1),
    };
  return state;
}
export function worldPoint(p: Point, v: Viewport): Point {
  return { x: (p.x - v.x) / v.scale, y: (p.y - v.y) / v.scale };
}
export function zoomAt(v: Viewport, p: Point, scale: number): Viewport {
  const w = worldPoint(p, v),
    s = clamp(scale, 0.05, 8);
  return { x: p.x - w.x * s, y: p.y - w.y * s, scale: s };
}
export function pan(v: Viewport, delta: Point): Viewport {
  return { ...v, x: v.x + delta.x, y: v.y + delta.y };
}
export function bounds(e: MapElement) {
  const r = (e.rotation * Math.PI) / 180,
    w = Math.abs(e.width * Math.cos(r)) + Math.abs(e.height * Math.sin(r)),
    h = Math.abs(e.width * Math.sin(r)) + Math.abs(e.height * Math.cos(r));
  return {
    x: e.x + e.width / 2 - w / 2,
    y: e.y + e.height / 2 - h / 2,
    width: w,
    height: h,
  };
}
export function fit(
  elements: MapElement[],
  size: { width: number; height: number },
): Viewport {
  const b = elements.map(bounds),
    x = Math.min(...b.map((e) => e.x)),
    y = Math.min(...b.map((e) => e.y)),
    right = Math.max(...b.map((e) => e.x + e.width)),
    bottom = Math.max(...b.map((e) => e.y + e.height));
  if (!b.length) return { x: 40, y: 40, scale: 1 };
  const scale = clamp(
    Math.min(
      (size.width - 100) / Math.max(right - x, 100),
      (size.height - 100) / Math.max(bottom - y, 100),
    ),
    0.05,
    2,
  );
  return {
    scale,
    x: (size.width - (right - x) * scale) / 2 - x * scale,
    y: (size.height - (bottom - y) * scale) / 2 - y * scale,
  };
}
export function normalizeTransform(
  e: MapElement,
  t: { x: number; y: number; scaleX: number; scaleY: number; rotation: number },
  pixelsPerFoot: number,
): MapElement {
  const min = e.type === 'SPACE' ? pixelsPerFoot : 1,
    max = e.type === 'SPACE' ? pixelsPerFoot * 1000 : 100000;
  const width = round(clamp(e.width * Math.abs(t.scaleX), min, max)),
    height = round(clamp(e.height * Math.abs(t.scaleY), min, max));
  return {
    ...e,
    x: round(t.x - width / 2),
    y: round(t.y - height / 2),
    width,
    height,
    rotation: round(((t.rotation % 360) + 360) % 360),
  };
}
export function geometry(d: Drawing, changed: MapElement[]): Drawing {
  const updates = new Map(
      changed
        .filter(
          (e) => !d.definition.elements.find((o) => o.id === e.id)?.locked,
        )
        .map((e) => [e.id, e]),
    ),
    spaces = { ...d.spaces };
  for (const e of updates.values())
    if (e.type === 'SPACE' && spaces[e.id])
      spaces[e.id] = {
        ...spaces[e.id]!,
        widthFeet: e.width / d.definition.pixelsPerFoot,
        depthFeet: e.height / d.definition.pixelsPerFoot,
      };
  return {
    definition: {
      ...d.definition,
      elements: d.definition.elements.map((e) => updates.get(e.id) ?? e),
    },
    spaces,
  };
}
export function selectIds(
  elements: MapElement[],
  ids: string[],
  id: string,
  shift = false,
): string[] {
  const e = elements.find((e) => e.id === id),
    members = e?.groupId
      ? elements.filter((o) => o.groupId === e.groupId).map((o) => o.id)
      : [id];
  return shift
    ? members.every((m) => ids.includes(m))
      ? ids.filter((m) => !members.includes(m))
      : [...new Set([...ids, ...members])]
    : members;
}
export function marquee(elements: MapElement[], a: Point, b: Point): string[] {
  const x = Math.min(a.x, b.x),
    y = Math.min(a.y, b.y),
    r = Math.max(a.x, b.x),
    bottom = Math.max(a.y, b.y);
  return [
    ...new Set(
      elements
        .filter(
          (e) =>
            !e.editorHidden &&
            (() => {
              const box = bounds(e);
              return (
                box.x >= x &&
                box.y >= y &&
                box.x + box.width <= r &&
                box.y + box.height <= bottom
              );
            })(),
        )
        .flatMap((e) =>
          e.groupId
            ? elements.filter((o) => o.groupId === e.groupId).map((o) => o.id)
            : [e.id],
        ),
    ),
  ];
}
export function snapGrid(n: number, spacing: number) {
  return round(Math.round(n / Math.max(1, spacing)) * Math.max(1, spacing));
}
export interface Guide {
  axis: 'x' | 'y';
  value: number;
}
export function objectSnap(
  moving: MapElement,
  others: MapElement[],
  threshold = 5,
): { x: number; y: number; guides: Guide[] } {
  const b = bounds(moving),
    result = { x: moving.x, y: moving.y, guides: [] as Guide[] };
  for (const axis of ['x', 'y'] as const) {
    const length = axis === 'x' ? 'width' : 'height',
      edges = [b[axis], b[axis] + b[length] / 2, b[axis] + b[length]];
    let best = threshold + 1,
      adjustment = 0,
      target = 0;
    for (const e of others.filter((e) => !e.editorHidden)) {
      const o = bounds(e);
      for (const value of [
        o[axis],
        o[axis] + o[length] / 2,
        o[axis] + o[length],
      ])
        for (const edge of edges) {
          const diff = value - edge;
          if (Math.abs(diff) < best) {
            best = Math.abs(diff);
            adjustment = diff;
            target = value;
          }
        }
    }
    if (best <= threshold) {
      result[axis] = round(result[axis] + adjustment);
      result.guides.push({ axis, value: target });
    }
  }
  return result;
}
export function nudge(d: Drawing, ids: string[], delta: Point) {
  return geometry(
    d,
    d.definition.elements
      .filter((e) => ids.includes(e.id) && !e.locked && !e.editorHidden)
      .map((e) => ({ ...e, x: e.x + delta.x, y: e.y + delta.y })),
  );
}
export function patchFlags(
  d: Drawing,
  ids: string[],
  patch: Pick<MapElement, 'locked' | 'editorHidden'>,
): Drawing {
  return {
    ...d,
    definition: {
      ...d.definition,
      elements: d.definition.elements.map((e) =>
        ids.includes(e.id) ? { ...e, ...patch } : e,
      ),
    },
  };
}
export function remove(d: Drawing, ids: string[]): Drawing {
  const allowed = d.definition.elements
    .filter((e) => ids.includes(e.id) && !e.locked)
    .map((e) => e.id);
  return {
    definition: {
      ...d.definition,
      elements: d.definition.elements.filter((e) => !allowed.includes(e.id)),
    },
    spaces: Object.fromEntries(
      Object.entries(d.spaces).filter(([id]) => !allowed.includes(id)),
    ),
  };
}
export function group(d: Drawing, ids: string[], groupId?: string): Drawing {
  const selected = d.definition.elements.filter((e) => ids.includes(e.id));
  if (
    selected.some((e) => e.type === 'SPACE' || e.locked) ||
    (groupId && selected.length < 2)
  )
    return d;
  return {
    ...d,
    definition: {
      ...d.definition,
      elements: d.definition.elements.map((e) =>
        ids.includes(e.id) ? { ...e, groupId } : e,
      ),
    },
  };
}
export function reorder(
  d: Drawing,
  ids: string[],
  action: 'front' | 'forward' | 'backward' | 'back',
): Drawing {
  let items = [...d.definition.elements].sort((a, b) => a.zIndex - b.zIndex);
  const movable = (e: MapElement) => ids.includes(e.id) && !e.locked;
  if (action === 'front')
    items = [...items.filter((e) => !movable(e)), ...items.filter(movable)];
  if (action === 'back')
    items = [...items.filter(movable), ...items.filter((e) => !movable(e))];
  if (action === 'forward')
    for (let i = items.length - 2; i >= 0; i--) {
      if (movable(items[i]!) && !movable(items[i + 1]!))
        [items[i], items[i + 1]] = [items[i + 1]!, items[i]!];
    }
  if (action === 'backward')
    for (let i = 1; i < items.length; i++) {
      if (movable(items[i]!) && !movable(items[i - 1]!))
        [items[i], items[i - 1]] = [items[i - 1]!, items[i]!];
    }
  return {
    ...d,
    definition: {
      ...d.definition,
      elements: items.map((e, zIndex) => ({ ...e, zIndex })),
    },
  };
}
export function align(d: Drawing, ids: string[], command: string): Drawing {
  const items = d.definition.elements.filter((e) => ids.includes(e.id));
  if (items.length < 2 || items.some((e) => e.locked || e.editorHidden))
    return d;
  const horizontal = ['left', 'center', 'right', 'horizontal'].includes(
      command,
    ),
    axis = horizontal ? 'x' : 'y',
    length = horizontal ? 'width' : 'height',
    boxes = items.map(bounds),
    start = Math.min(...boxes.map((b) => b[axis])),
    end = Math.max(...boxes.map((b) => b[axis] + b[length]));
  if (command === 'horizontal' || command === 'vertical') {
    if (items.length < 3) return d;
    const sorted = items.sort((a, b) => bounds(a)[axis] - bounds(b)[axis]),
      gap =
        (end - start - boxes.reduce((sum, b) => sum + b[length], 0)) /
        (items.length - 1);
    let cursor = start;
    return geometry(
      d,
      sorted.map((e) => {
        const b = bounds(e),
          next = { ...e, [axis]: e[axis] + cursor - b[axis] };
        cursor += b[length] + gap;
        return next;
      }),
    );
  }
  return geometry(
    d,
    items.map((e) => {
      const b = bounds(e),
        pos = ['left', 'top'].includes(command)
          ? start
          : ['right', 'bottom'].includes(command)
            ? end - b[length]
            : (start + end - b[length]) / 2;
      return { ...e, [axis]: round(e[axis] + pos - b[axis]) };
    }),
  );
}
export const baseSpace = (label: string): SpaceDetails => ({
  label,
  widthFeet: 10,
  depthFeet: 10,
  spaceType: 'BOOTH',
  description: '',
  amenities: [],
  feeMinor: 0,
  currency: 'USD',
  preferredDirectoryId: null,
  managerNotes: '',
});
export function uniqueLabel(labels: Set<string>, seed = 'A01') {
  const match = seed.match(/^(.*?)(\d+)$/);
  let n = match ? Number(match[2]) : 1;
  const prefix = match?.[1] ?? seed + ' ',
    padding = match?.[2]?.length ?? 2;
  let label = seed;
  while (labels.has(label)) label = prefix + String(++n).padStart(padding, '0');
  labels.add(label);
  return label;
}
export function copies(
  source: Drawing,
  target: Drawing,
  ids: string[],
  areaId: string,
  idFactory: () => string,
  offset = 20,
): { drawing: Drawing; ids: string[] } {
  const labels = new Set(Object.values(target.spaces).map((s) => s.label)),
    groups = new Map<string, string>(),
    spaces = { ...target.spaces },
    selected: string[] = [];
  const elements = source.definition.elements
    .filter((e) => ids.includes(e.id))
    .map((e) => {
      const id = idFactory();
      selected.push(id);
      if (e.groupId && !groups.has(e.groupId))
        groups.set(e.groupId, idFactory());
      let text = e.text;
      if (e.type === 'SPACE') {
        const s = source.spaces[e.id] ?? baseSpace(e.text);
        text = uniqueLabel(labels, s.label);
        spaces[id] = {
          label: text,
          widthFeet: s.widthFeet,
          depthFeet: s.depthFeet,
          spaceType: s.spaceType,
          description: s.description,
          amenities: [...s.amenities],
          feeMinor: s.feeMinor,
          currency: s.currency,
          preferredDirectoryId: null,
          managerNotes: '',
        };
      }
      return {
        ...e,
        id,
        areaId,
        x: e.x + offset,
        y: e.y + offset,
        text,
        locked: false,
        editorHidden: false,
        groupId: e.groupId ? groups.get(e.groupId) : undefined,
        zIndex: target.definition.elements.length + selected.length - 1,
        points: e.points ? [...e.points] : undefined,
      };
    });
  return {
    drawing: {
      definition: {
        ...target.definition,
        elements: [...target.definition.elements, ...elements],
      },
      spaces,
    },
    ids: selected,
  };
}
export const syncCategories = [
  'physical dimensions',
  'amenities',
  'default fee',
  'space type',
  'design/style',
] as const;
export type SyncCategory = (typeof syncCategories)[number];
export function syncBooths(
  d: Drawing,
  sourceId: string,
  ids: string[],
  categories: SyncCategory[],
): Drawing {
  const source = d.spaces[sourceId],
    element = d.definition.elements.find((e) => e.id === sourceId);
  if (!source || !element) return d;
  const spaces = { ...d.spaces };
  const elements = d.definition.elements.map((e) => {
    if (e.id === sourceId || !ids.includes(e.id) || e.locked || !spaces[e.id])
      return e;
    const s = { ...spaces[e.id]! };
    let next = { ...e };
    if (categories.includes('physical dimensions')) {
      s.widthFeet = source.widthFeet;
      s.depthFeet = source.depthFeet;
      next = {
        ...next,
        width: s.widthFeet * d.definition.pixelsPerFoot,
        height: s.depthFeet * d.definition.pixelsPerFoot,
      };
    }
    if (categories.includes('amenities')) s.amenities = [...source.amenities];
    if (categories.includes('default fee')) {
      s.feeMinor = source.feeMinor;
      s.currency = source.currency;
    }
    if (categories.includes('space type')) s.spaceType = source.spaceType;
    if (categories.includes('design/style'))
      next = {
        ...next,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
      };
    spaces[e.id] = s;
    return next;
  });
  return { definition: { ...d.definition, elements }, spaces };
}
export function pathElement(
  points: Point[],
): Pick<MapElement, 'x' | 'y' | 'width' | 'height' | 'points'> {
  const bounded = points
      .slice(0, PATH_POINT_LIMIT)
      .filter(
        (p) =>
          Number.isFinite(p.x) &&
          Number.isFinite(p.y) &&
          Math.abs(p.x) <= 100000 &&
          Math.abs(p.y) <= 100000,
      ),
    x = Math.min(...bounded.map((p) => p.x)),
    y = Math.min(...bounded.map((p) => p.y)),
    width = Math.max(1, Math.max(...bounded.map((p) => p.x)) - x),
    height = Math.max(1, Math.max(...bounded.map((p) => p.y)) - y);
  return {
    x,
    y,
    width,
    height,
    points: bounded.flatMap((p) => [
      round((p.x - x) / width),
      round((p.y - y) / height),
    ]),
  };
}
