import type {
  MapBounds,
  MapDefinition,
  MapElement,
  SpaceDetails,
} from '@market/api';

export interface Point {
  x: number;
  y: number;
}
export interface Viewport extends Point {
  scale: number;
}
export interface Drawing {
  physicalBoothIds?: Record<string, number | null>;
  confirmPhysicalBoothChanges?: boolean;
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
export type { MapBounds };
/** Largest coordinate magnitude the backend accepts for map geometry. */
export const MAP_COORDINATE_LIMIT = 100000;
export function contentBounds(elements: MapElement[]): MapBounds | null {
  if (!elements.length) return null;
  const b = elements.map(bounds),
    x = Math.min(...b.map((e) => e.x)),
    y = Math.min(...b.map((e) => e.y));
  return {
    x,
    y,
    width: Math.max(...b.map((e) => e.x + e.width)) - x,
    height: Math.max(...b.map((e) => e.y + e.height)) - y,
  };
}
const pad = (b: MapBounds, by: number): MapBounds => ({
  x: b.x - by,
  y: b.y - by,
  width: b.width + by * 2,
  height: b.height + by * 2,
});
/** Default bounds: the content plus a margin of a quarter of its larger side
 *  (at least 20 ft), or a 200 ft square around the origin for an empty area. */
export function autoMapBounds(
  elements: MapElement[],
  pixelsPerFoot: number,
): MapBounds {
  const content = contentBounds(elements);
  if (!content) {
    const half = 100 * pixelsPerFoot;
    return { x: -half, y: -half, width: half * 2, height: half * 2 };
  }
  return pad(
    content,
    Math.max(
      20 * pixelsPerFoot,
      Math.max(content.width, content.height) * 0.25,
    ),
  );
}
/**
 * The rectangle the viewport is held to. Viewers get the area's custom bounds
 * or the automatic default. Editors also keep every object reachable, so a
 * custom rectangle grows to include content placed outside it.
 */
export function viewBounds(
  custom: MapBounds | undefined,
  elements: MapElement[],
  pixelsPerFoot: number,
  editing = false,
): MapBounds {
  if (!custom) return autoMapBounds(elements, pixelsPerFoot);
  const content = editing ? contentBounds(elements) : null;
  if (!content) return custom;
  const x = Math.min(custom.x, content.x - 10 * pixelsPerFoot),
    y = Math.min(custom.y, content.y - 10 * pixelsPerFoot),
    right = Math.max(
      custom.x + custom.width,
      content.x + content.width + 10 * pixelsPerFoot,
    ),
    bottom = Math.max(
      custom.y + custom.height,
      content.y + content.height + 10 * pixelsPerFoot,
    );
  return { x, y, width: right - x, height: bottom - y };
}
/**
 * Holds a viewport to `limit`. With `fill` (viewers) the rectangle always
 * covers the screen, so nothing outside it is ever shown. Without it
 * (editors) the whole rectangle can be zoomed out to fit with a little room,
 * and is never panned out of view. On each axis where the rectangle is larger
 * than the screen, the screen stays inside it; where smaller, it stays fully
 * on screen.
 */
export function constrainView(
  v: Viewport,
  size: { width: number; height: number },
  limit: MapBounds | null,
  fill = false,
): Viewport {
  if (!limit || size.width <= 1 || size.height <= 1) return v;
  const ratios = [
      size.width / Math.max(limit.width, 1),
      size.height / Math.max(limit.height, 1),
    ],
    min = clamp(
      fill ? Math.max(...ratios) : Math.min(...ratios) * 0.8,
      0.05,
      8,
    );
  let next = v;
  if (next.scale < min)
    next = zoomAt(next, { x: size.width / 2, y: size.height / 2 }, min);
  const s = next.scale,
    axis = (value: number, start: number, length: number, screen: number) => {
      const a = -start * s,
        b = screen - (start + length) * s;
      // `+ 0` turns -0 into 0 so unchanged views compare equal.
      return clamp(value, Math.min(a, b), Math.max(a, b)) + 0;
    };
  const x = axis(next.x, limit.x, limit.width, size.width),
    y = axis(next.y, limit.y, limit.height, size.height);
  return x === v.x && y === v.y && s === v.scale ? v : { x, y, scale: s };
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
    ...d,
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
    ...d,
    definition: {
      ...d.definition,
      elements: d.definition.elements.filter((e) => !allowed.includes(e.id)),
    },
    spaces: Object.fromEntries(
      Object.entries(d.spaces).filter(([id]) => !allowed.includes(id)),
    ),
    ...(d.physicalBoothIds
      ? {
          physicalBoothIds: Object.fromEntries(
            Object.entries(d.physicalBoothIds).filter(
              ([id]) => !allowed.includes(id),
            ),
          ),
        }
      : {}),
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
/** Complete decoration groups move as single units, retaining internal spacing. */
export function arrangementUnits(d: Drawing, ids: string[]) {
  const selected = new Set(ids),
    items = d.definition.elements.filter((e) => selected.has(e.id));
  if (
    !items.length ||
    items.some((e) => e.locked || e.editorHidden) ||
    new Set(items.map((e) => e.areaId)).size > 1
  )
    return [];
  const groups = new Map<string, MapElement[]>(),
    partialGroups = new Set(
      d.definition.elements
        .filter((e) => e.groupId && !selected.has(e.id))
        .map((e) => e.groupId),
    );
  for (const e of items) {
    if (e.groupId && partialGroups.has(e.groupId)) return [];
    const key = e.groupId ? `group:${e.groupId}` : `element:${e.id}`;
    const members = groups.get(key) ?? [];
    members.push(e);
    groups.set(key, members);
  }
  return [...groups.values()].map((elements) => {
    const boxes = elements.map(bounds),
      x = Math.min(...boxes.map((b) => b.x)),
      y = Math.min(...boxes.map((b) => b.y));
    return {
      elements,
      box: {
        x,
        y,
        width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
        height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
      },
    };
  });
}
export function align(d: Drawing, ids: string[], command: string): Drawing {
  if (
    ![
      'left',
      'center',
      'right',
      'top',
      'middle',
      'bottom',
      'horizontal',
      'vertical',
    ].includes(command)
  )
    return d;
  const units = arrangementUnits(d, ids);
  if (units.length < 2) return d;
  const horizontal = ['left', 'center', 'right', 'horizontal'].includes(
      command,
    ),
    axis = horizontal ? 'x' : 'y',
    length = horizontal ? 'width' : 'height',
    boxes = units.map((unit) => unit.box),
    start = Math.min(...boxes.map((b) => b[axis])),
    end = Math.max(...boxes.map((b) => b[axis] + b[length]));
  if (command === 'horizontal' || command === 'vertical') {
    if (units.length < 3) return d;
    const sorted = units.sort((a, b) => a.box[axis] - b.box[axis]),
      gap =
        (end - start - boxes.reduce((sum, b) => sum + b[length], 0)) /
        (units.length - 1);
    let cursor = start;
    const changed = sorted.flatMap((unit) => {
      const b = unit.box,
        next = unit.elements.map((e) => ({
          ...e,
          [axis]: round(e[axis] + cursor - b[axis]),
        }));
      cursor += b[length] + gap;
      return next;
    });
    const updates = new Map(changed.map((e) => [e.id, e]));
    return {
      ...d,
      definition: {
        ...d.definition,
        elements: d.definition.elements.map((e) => updates.get(e.id) ?? e),
      },
    };
  }
  const changed = units.flatMap((unit) => {
    const b = unit.box,
      pos = ['left', 'top'].includes(command)
        ? start
        : ['right', 'bottom'].includes(command)
          ? end - b[length]
          : (start + end - b[length]) / 2;
    return unit.elements.map((e) => ({
      ...e,
      [axis]: round(e[axis] + pos - b[axis]),
    }));
  });
  const updates = new Map(changed.map((e) => [e.id, e]));
  return {
    ...d,
    definition: {
      ...d.definition,
      elements: d.definition.elements.map((e) => updates.get(e.id) ?? e),
    },
  };
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
      ...target,
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
  return { ...d, definition: { ...d.definition, elements }, spaces };
}
/**
 * Thins a freehand path to at most `limit` points without dropping its ends,
 * so a long stroke keeps following the cursor instead of stopping at the
 * saved-path point cap. Douglas-Peucker with a growing tolerance keeps the
 * corners; a stride fallback guarantees the bound.
 */
export function compactPath(points: Point[], limit: number): Point[] {
  if (points.length <= limit) return points;
  for (let tolerance = 1; tolerance <= 4096; tolerance *= 2) {
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const pending: Array<[number, number]> = [[0, points.length - 1]];
    while (pending.length) {
      const [first, last] = pending.pop()!;
      const a = points[first]!,
        b = points[last]!,
        dx = b.x - a.x,
        dy = b.y - a.y,
        length = dx * dx + dy * dy || 1;
      let farthest = -1,
        distance = tolerance;
      for (let i = first + 1; i < last; i++) {
        const p = points[i]!,
          t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / length, 0, 1),
          d = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
        if (d > distance) {
          distance = d;
          farthest = i;
        }
      }
      if (farthest !== -1) {
        keep[farthest] = 1;
        pending.push([first, farthest], [farthest, last]);
      }
    }
    const kept = points.filter((_, i) => keep[i]);
    if (kept.length <= limit) return kept;
  }
  const stride = Math.ceil((points.length - 1) / (limit - 1));
  return points.filter((_, i) => i % stride === 0 || i === points.length - 1);
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
