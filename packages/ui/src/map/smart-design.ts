import type { MapElement, SpaceDetails } from '@market/api';
import {
  baseSpace,
  arrangementUnits,
  geometry,
  round,
  type Drawing,
  type Point,
} from './model';
import { mapAssets } from './assets';
import type { BoothStatus, Space } from './KonvaElement';

export interface BoothRowOptions {
  count: number;
  widthFeet: number;
  depthFeet: number;
  gapFeet: number;
  orientation: 'horizontal' | 'vertical';
  start: number;
  prefix: string;
  rotation: number;
}
const finiteRange = (n: number, min: number, max: number) =>
  Number.isFinite(n) && n >= min && n <= max;

// New spaces intentionally have no physicalBoothIds entry. SAVE_LAYOUT creates
// their physical identities through the same workflow as the individual Booth tool.
export function boothRow(
  d: Drawing,
  areaId: string,
  center: Point,
  o: BoothRowOptions,
  idFactory: () => string,
): { drawing: Drawing; ids: string[] } {
  if (
    !Number.isInteger(o.count) ||
    !finiteRange(o.count, 1, 100) ||
    !finiteRange(o.widthFeet, 1, 1000) ||
    !finiteRange(o.depthFeet, 1, 1000) ||
    !finiteRange(o.gapFeet, 0, 1000) ||
    !Number.isSafeInteger(o.start) ||
    o.start < 0 ||
    !finiteRange(o.rotation, -360, 360) ||
    !['horizontal', 'vertical'].includes(o.orientation) ||
    !d.definition.areas.some((a) => a.id === areaId)
  )
    throw new Error(
      'Enter valid row measurements, a whole booth count (1 to 100), and a nonnegative starting number.',
    );
  if (d.definition.elements.length + o.count > 1000)
    throw new Error('This row would exceed the 1,000 object layout limit.');
  const labels = Array.from(
    { length: o.count },
    (_, i) => `${o.prefix}${o.start + i}`,
  );
  const existing = new Set(
    Object.values(d.spaces).map((s) => s.label.toLowerCase()),
  );
  if (
    labels.some((s) => !s.trim() || s.length > 80) ||
    !Number.isSafeInteger(o.start + o.count - 1)
  )
    throw new Error(
      'Booth labels must contain 1 to 80 characters and safe sequential numbers.',
    );
  const collision = labels.find((s) => existing.has(s.toLowerCase()));
  if (collision)
    throw new Error(
      `Booth label ${collision} already exists. Choose another prefix or starting number.`,
    );
  const scale = d.definition.pixelsPerFoot,
    width = o.widthFeet * scale,
    height = o.depthFeet * scale,
    step =
      (o.orientation === 'horizontal' ? width : height) + o.gapFeet * scale,
    angle = (o.rotation * Math.PI) / 180,
    spaces = { ...d.spaces },
    ids: string[] = [],
    zIndex = Math.max(-1, ...d.definition.elements.map((e) => e.zIndex)) + 1;
  const added = labels.map((label, i): MapElement => {
    const id = idFactory(),
      offset = (i - (o.count - 1) / 2) * step,
      dx = o.orientation === 'horizontal' ? offset : 0,
      dy = o.orientation === 'vertical' ? offset : 0;
    ids.push(id);
    spaces[id] = {
      ...baseSpace(label),
      widthFeet: o.widthFeet,
      depthFeet: o.depthFeet,
    };
    return {
      id,
      areaId,
      type: 'SPACE',
      text: label,
      fill: '#e0ebd9',
      x: round(
        center.x + dx * Math.cos(angle) - dy * Math.sin(angle) - width / 2,
      ),
      y: round(
        center.y + dx * Math.sin(angle) + dy * Math.cos(angle) - height / 2,
      ),
      width,
      height,
      rotation: (o.rotation + 360) % 360,
      zIndex: zIndex + i,
    };
  });
  assertGeometry(added);
  return {
    drawing: {
      ...d,
      spaces,
      definition: {
        ...d.definition,
        elements: [...d.definition.elements, ...added],
      },
    },
    ids,
  };
}

function assertGeometry(elements: MapElement[]) {
  if (
    elements.some(
      (e) =>
        !finiteRange(e.x, -100000, 100000) ||
        !finiteRange(e.y, -100000, 100000) ||
        !finiteRange(e.width, 1, 100000) ||
        !finiteRange(e.height, 1, 100000),
    )
  )
    throw new Error(
      'The arrangement would exceed the supported map coordinates. Use smaller measurements or move closer to the map origin.',
    );
}

export function equalSpacing(
  d: Drawing,
  ids: string[],
  axis: 'x' | 'y',
  gapFeet: number,
): Drawing {
  const units = arrangementUnits(d, ids);
  if (units.length < 2) return d;
  if (!finiteRange(gapFeet, 0, 1000))
    throw new Error('Enter a gap from 0 to 1,000 feet.');
  const length = axis === 'x' ? 'width' : 'height';
  units.sort((a, b) => a.box[axis] - b.box[axis]);
  let cursor = units[0]!.box[axis];
  const changed = units.flatMap((unit) => {
    const box = unit.box,
      next = unit.elements.map((e) => ({
        ...e,
        [axis]: round(e[axis] + cursor - box[axis]),
      }));
    cursor += box[length] + gapFeet * d.definition.pixelsPerFoot;
    return next;
  });
  assertGeometry(changed);
  // Positions only: do not recalculate operational dimensions through geometry().
  const updates = new Map(changed.map((e) => [e.id, e]));
  return {
    ...d,
    definition: {
      ...d.definition,
      elements: d.definition.elements.map((e) => updates.get(e.id) ?? e),
    },
  };
}

export function canMatchSize(elements: MapElement[]) {
  return (
    elements.length >= 2 &&
    elements.every(
      (e) =>
        !e.locked &&
        !e.editorHidden &&
        ['RECTANGLE', 'CIRCLE', 'TRIANGLE', 'IMAGE', 'TEXT'].includes(e.type) &&
        !e.groupId,
    )
  );
}
export function matchSize(
  d: Drawing,
  ids: string[],
  dimension: 'width' | 'height',
): Drawing {
  const items = ids.flatMap(
    (id) => d.definition.elements.find((e) => e.id === id) ?? [],
  );
  if (!canMatchSize(items)) return d;
  return geometry(
    d,
    items.map((e) => ({ ...e, [dimension]: items[0]![dimension] })),
  );
}

export const mapStylePresets = {
  minimal: {
    name: 'Minimal',
    background: '#fafaf8',
    booth: '#e5e7e4',
    ink: '#303b35',
    path: '#d8dcd8',
    landscape: '#e4e9df',
    accent: '#788a7a',
    font: 'sans',
    stroke: 1,
  },
  natural: {
    name: 'Natural',
    background: '#f7f4e9',
    booth: '#e0ebd9',
    ink: '#304e37',
    path: '#d7c7aa',
    landscape: '#d2dfbc',
    accent: '#73965c',
    font: 'serif',
    stroke: 1.5,
  },
  modern: {
    name: 'Modern',
    background: '#f1f4f5',
    booth: '#d9e5e9',
    ink: '#243b47',
    path: '#bac7cc',
    landscape: '#cbded5',
    accent: '#4c7f8c',
    font: 'sans',
    stroke: 2,
  },
} as const;
export type MapStylePreset = keyof typeof mapStylePresets;
export function applyMapStyle(d: Drawing, preset: MapStylePreset): Drawing {
  const p = mapStylePresets[preset];
  return {
    ...d,
    definition: {
      ...d.definition,
      background: { ...d.definition.background, color: p.background },
      elements: d.definition.elements.map((e) => {
        if (e.locked || e.referenceOnly || (e.type === 'IMAGE' && !e.assetId))
          return e;
        const fill =
          e.type === 'SPACE'
            ? p.booth
            : e.type === 'TEXT'
              ? p.ink
              : e.type === 'LINE'
                ? e.closed
                  ? p.landscape
                  : p.path
                : e.assetId
                  ? p.accent
                  : p.landscape;
        return {
          ...e,
          fill,
          stroke: e.type === 'LINE' && !e.closed ? p.path : p.ink,
          strokeWidth: e.type === 'LINE' ? e.strokeWidth : p.stroke,
          ...(e.type !== 'SPACE' ? { shadow: 'none' as const } : {}),
          ...(e.type === 'TEXT'
            ? {
                fontFamily: p.font,
                ...(e.labelBackground ? { labelBackground: p.background } : {}),
              }
            : {}),
        };
      }),
    },
  };
}

const typePalette = [
  '#d9e9d0',
  '#d3e4f2',
  '#f0dfc6',
  '#e6d9ef',
  '#cfe9e6',
  '#efdbdf',
];
export function boothTypeColor(type: string) {
  let hash = 0;
  for (const c of type) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return typePalette[hash % typePalette.length]!;
}
export function colorBooths(
  d: Drawing,
  mode: 'uniform' | 'type',
  color: string,
): Drawing {
  if (!/^#[\da-f]{6}$/i.test(color)) return d;
  return {
    ...d,
    definition: {
      ...d.definition,
      elements: d.definition.elements.map((e) =>
        e.type === 'SPACE' && !e.locked
          ? {
              ...e,
              fill:
                mode === 'type'
                  ? boothTypeColor(d.spaces[e.id]?.spaceType ?? '')
                  : color,
            }
          : e,
      ),
    },
  };
}

type Part = Partial<MapElement> &
  Pick<MapElement, 'type' | 'x' | 'y' | 'width' | 'height'>;
const illustration = (
  assetId: string,
  x: number,
  y: number,
  width = 90,
  height = 90,
): Part => ({
  type: 'IMAGE',
  assetId,
  x,
  y,
  width,
  height,
  fill: mapAssets.find((a) => a.id === assetId)?.color,
});
const rectangle = (
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
): Part => ({ type: 'RECTANGLE', x, y, width, height, fill, strokeWidth: 0 });
const label = (text: string, x: number, y: number, width = 240): Part => ({
  type: 'TEXT',
  text,
  x,
  y,
  width,
  height: 40,
  fontSize: 22,
  textAlign: 'center',
});
export const mapArrangements = {
  picnic: {
    name: 'Picnic seating area',
    parts: [
      rectangle(0, 0, 360, 260, '#e0ebd9'),
      illustration('picnic-table', 40, 50),
      illustration('picnic-table', 220, 50),
      illustration('bench', 135, 180, 90, 50),
    ],
  },
  walkway: {
    name: 'Tree-lined walkway',
    parts: [
      rectangle(100, 0, 100, 460, '#d7c7aa'),
      ...[20, 180, 340].flatMap((y) => [
        illustration('tree-oak', 0, y),
        illustration('tree-oak', 210, y),
      ]),
    ],
  },
  entrance: {
    name: 'Landscaped entrance',
    parts: [
      rectangle(0, 90, 360, 110, '#d7c7aa'),
      illustration('flower-bed', 0, 0),
      illustration('flower-bed', 270, 0),
      illustration('entrance', 130, 30),
      label('Welcome', 60, 210),
    ],
  },
  parking: {
    name: 'Parking area with markings',
    parts: [
      rectangle(0, 0, 450, 280, '#bcc5c5'),
      ...[20, 120, 220, 320].map((x) => ({
        type: 'LINE' as const,
        x,
        y: 110,
        width: 1,
        height: 150,
        points: [0, 0, 0, 1],
        stroke: '#ffffff',
        strokeWidth: 4,
      })),
      illustration('parking', 175, 10, 65, 80),
    ],
  },
  welcome: {
    name: 'Information and welcome area',
    parts: [
      rectangle(0, 0, 340, 230, '#e5e8dc'),
      illustration('tent', 110, 35, 120, 120),
      illustration('planter', 10, 80, 70, 70),
      illustration('bench', 255, 80, 70, 50),
      label('Information', 50, 180),
    ],
  },
  food: {
    name: 'Food truck seating area',
    parts: [
      rectangle(0, 0, 420, 300, '#e7dfce'),
      illustration('food-truck', 20, 40, 180, 100),
      illustration('picnic-table', 260, 35),
      illustration('picnic-table', 260, 180),
      illustration('trash-bin', 40, 210, 60, 60),
    ],
  },
} satisfies Record<string, { name: string; parts: Part[] }>;
export type MapArrangement = keyof typeof mapArrangements;
export function insertArrangement(
  d: Drawing,
  areaId: string,
  center: Point,
  key: MapArrangement,
  idFactory: () => string,
) {
  const parts = mapArrangements[key].parts;
  if (d.definition.elements.length + parts.length > 1000)
    throw new Error(
      'This arrangement would exceed the 1,000 object layout limit.',
    );
  const width = Math.max(...parts.map((p) => p.x + p.width)),
    height = Math.max(...parts.map((p) => p.y + p.height)),
    groupId = idFactory(),
    z = Math.max(-1, ...d.definition.elements.map((e) => e.zIndex)) + 1;
  const elements: MapElement[] = parts.map((p, i) => ({
    text: '',
    fill: '#304e37',
    rotation: 0,
    ...p,
    id: idFactory(),
    areaId,
    groupId,
    zIndex: z + i,
    x: center.x - width / 2 + p.x,
    y: center.y - height / 2 + p.y,
  }));
  assertGeometry(elements);
  return {
    drawing: {
      ...d,
      definition: {
        ...d.definition,
        elements: [...d.definition.elements, ...elements],
      },
    },
    ids: elements.map((e) => e.id),
  };
}

// A text template, persisted as ordinary TEXT in the existing validated contract.
// No operational values or private metadata are ever embedded in the saved legend.
export const MAP_LEGEND_TEMPLATE = '{{map-legend}}\n';
export const isMapLegend = (e: MapElement) =>
  e.type === 'TEXT' && e.text.startsWith(MAP_LEGEND_TEMPLATE);
export const mapElementLabel = (e: MapElement) =>
  isMapLegend(e)
    ? e.text.slice(MAP_LEGEND_TEMPLATE.length) || 'Map legend'
    : e.text || e.type.toLowerCase();
export const boothStatusColors: Record<BoothStatus, string> = {
  available: '#f0f5ef',
  assigned: '#e8edff',
  paid: '#d8efdf',
};
export interface MapLegendEntry {
  label: string;
  color: string;
}
export type LegendSpace = Space & Partial<Pick<SpaceDetails, 'spaceType'>>;
export function mapLegendEntries(
  elements: MapElement[],
  spaces: LegendSpace[],
  statuses: Record<string, BoothStatus> = {},
): MapLegendEntry[] {
  const entries = new Map<string, MapLegendEntry>(),
    byId = new Map(spaces.map((s) => [s.elementId, s]));
  const add = (label: string, color: string) =>
    entries.set(`${label}:${color}`, { label, color });
  for (const e of elements) {
    if (e.referenceOnly || e.opacity === 0) continue;
    if (e.type === 'SPACE') {
      const s = byId.get(e.id),
        status = statuses[e.id];
      if (status)
        add(
          status === 'available'
            ? 'Unassigned (check scheduling)'
            : status === 'paid'
              ? 'Assigned, paid'
              : 'Assigned',
          boothStatusColors[status],
        );
      else if (s)
        add(
          s.spaceType
            ? s.spaceType.replaceAll('_', ' ')
            : `Booths (${s.widthFeet} × ${s.depthFeet} ft)`,
          e.fill,
        );
      else add('Booths', e.fill);
    }
    const asset = mapAssets.find((a) => a.id === e.assetId);
    if (
      asset &&
      [
        'parking',
        'accessible-parking',
        'restroom',
        'entrance',
        'exit',
        'handwash',
        'water-fountain',
        'bicycle-rack',
      ].includes(asset.id)
    )
      add(asset.name, e.fill);
  }
  return [...entries.values()].sort(
    (a, b) => a.label.localeCompare(b.label) || a.color.localeCompare(b.color),
  );
}
export function createMapLegend(
  d: Drawing,
  areaId: string,
  center: Point,
  title: string,
  idFactory: () => string,
) {
  if (d.definition.elements.length >= 1000)
    throw new Error('The layout has reached its 1,000 object limit.');
  const id = idFactory(),
    e: MapElement = {
      id,
      areaId,
      type: 'TEXT',
      x: center.x - 180,
      y: center.y - 160,
      width: 360,
      height: 320,
      rotation: 0,
      zIndex: Math.max(-1, ...d.definition.elements.map((e) => e.zIndex)) + 1,
      text: MAP_LEGEND_TEMPLATE + (title.trim() || 'Map legend').slice(0, 80),
      fill: '#304e37',
      labelBackground: '#fafaf8',
      labelPadding: 16,
      cornerRadius: 8,
      stroke: '#c8d2ca',
      strokeWidth: 1,
      fontSize: 18,
    };
  assertGeometry([e]);
  return {
    drawing: {
      ...d,
      definition: { ...d.definition, elements: [...d.definition.elements, e] },
    },
    ids: [id],
  };
}
