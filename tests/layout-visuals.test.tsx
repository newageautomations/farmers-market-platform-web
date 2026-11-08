import { readFileSync } from 'node:fs';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type {
  MapDefinition,
  MapElement,
  LayoutVersion,
  OperationsCommand,
} from '@market/api';
import {
  mapAssets,
  assetCategories,
  assetSvg,
  assetUrl,
} from '../packages/ui/src/map/assets';
import {
  environmentStyle,
  movePathPoint,
  simplifyMapPath,
  strokeDash,
  visibleMapElements,
} from '../packages/ui/src/map/visuals';
import {
  copies,
  drawingHistory,
  geometry,
  type Drawing,
} from '../packages/ui/src/map/model';
import { LayoutEditor } from '../apps/admin/src/market/phase14/Layouts';
import { managerData } from './fixtures/market-dashboard-data';

const canvas = vi.hoisted(() => ({
  props: {} as {
    onPath?: (p: object) => void;
    onSelection?: (ids: string[]) => void;
    definition?: MapDefinition;
  },
}));
vi.mock('../packages/ui/src/map/MapCanvas', () => ({
  MapCanvas: (props: typeof canvas.props) => {
    canvas.props = props;
    return null;
  },
}));
const element = (patch: Partial<MapElement> = {}): MapElement => ({
  id: 'decor',
  areaId: 'main',
  type: 'LINE',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  zIndex: 0,
  text: '',
  fill: '#aabbcc',
  ...patch,
});
test('curated assets are safe, consistent SVG illustrations with stable server-allowlisted IDs', () => {
  expect(mapAssets).toHaveLength(30);
  expect(new Set(mapAssets.map((a) => a.id)).size).toBe(30);
  const backend = readFileSync(
    '../farmers-market-platform/src/plugins/market-operations/model.ts',
    'utf8',
  )
    .split('export const layoutAssetIds:')[1]!
    .split('];')[0]!;
  for (const category of assetCategories)
    expect(mapAssets.some((a) => a.category === category)).toBe(true);
  for (const a of mapAssets) {
    expect(backend).toContain(`'${a.id}'`);
    const svg = assetSvg(a.id, '#123456')!;
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.documentElement.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(parsed.documentElement.getAttribute('color')).toBe('#123456');
    expect(
      parsed.querySelector('script, foreignObject, image, use, a'),
    ).toBeNull();
    expect(svg).not.toMatch(/on\w+=|href=|url\(/i);
    expect(assetUrl(a.id)).toMatch(/^data:image\/svg\+xml/);
  }
  expect(assetSvg('tree-oak', '" onload="alert(1)')).not.toContain('onload');
  expect(assetUrl('<script>')).toBeUndefined();
});
test('paths retain normalized vector vertices, style and endpoints when simplified or edited', () => {
  const e = element({
    points: [0, 0, 0.25, 0.25, 0.5, 0.5, 1, 1],
    ...environmentStyle('curved-walkway'),
  });
  expect(simplifyMapPath(e)).toEqual([0, 0, 1, 1]);
  const changed = movePathPoint(e, 1, { x: 30, y: 120 });
  expect(changed.points).toEqual([0, 0, 0.3, 1, 0.5, 0.5, 1, 1]);
  expect(changed).toMatchObject({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    curved: true,
  });
  expect(environmentStyle('grass')).toMatchObject({
    closed: true,
    curved: true,
  });
  expect(environmentStyle('road')).not.toHaveProperty('id');
  expect(
    strokeDash(element({ strokePattern: 'dashed', strokeWidth: 4 })),
  ).toEqual([12, 8]);
  expect(
    strokeDash(element({ strokePattern: 'dotted', strokeWidth: 4 })),
  ).toEqual([0.01, 8]);
});
test('editor visibility and reference-only publication are independent', () => {
  const reference = element({ id: 'ref', type: 'IMAGE', referenceOnly: true });
  const hidden = element({ id: 'hidden', editorHidden: true });
  const booth = element({ id: 'booth', type: 'SPACE' });
  expect(visibleMapElements([reference, hidden, booth], true)).toEqual([
    reference,
    booth,
  ]);
  expect(visibleMapElements([reference, hidden, booth], false)).toEqual([
    hidden,
    booth,
  ]);
});
test('decorative serialization, transforms, copies and history preserve physical booth identities', () => {
  const booth = element({
    id: 'booth',
    type: 'SPACE',
    width: 100,
    height: 100,
  });
  const decoration = element({
    type: 'IMAGE',
    assetId: 'tree-oak',
    opacity: 0.6,
    shadow: 'soft',
  });
  const spaces = {
    booth: {
      label: 'A01',
      widthFeet: 10,
      depthFeet: 10,
      spaceType: 'BOOTH',
      description: '',
      amenities: [],
      feeMinor: 0,
      currency: 'USD',
      preferredDirectoryId: null,
      managerNotes: '',
    },
  };
  const d: Drawing = {
    definition: {
      pixelsPerFoot: 10,
      areas: [{ id: 'main', name: 'Main' }],
      elements: [booth, decoration],
      background: { color: '#faf8f2', gridOpacity: 0.4 },
    },
    spaces,
    physicalBoothIds: { booth: 123 },
  };
  const next = geometry(d, [{ ...decoration, width: 250, rotation: 40 }]);
  const copied = copies(next, next, ['decor'], 'main', () => 'copy').drawing;
  expect(copied.spaces).toEqual(spaces);
  expect(copied.physicalBoothIds).toEqual({ booth: 123 });
  expect(copied.definition.elements.at(-1)).toMatchObject({
    assetId: 'tree-oak',
    width: 250,
    opacity: 0.6,
    shadow: 'soft',
  });
  const serialized = JSON.parse(JSON.stringify(copied));
  expect(serialized).toEqual(copied);
  expect(JSON.stringify(copied)).not.toContain('<svg');
  const history = drawingHistory(
    { present: d, past: [], future: [] },
    { type: 'EDIT', value: copied },
  );
  expect(drawingHistory(history, { type: 'UNDO' }).present).toEqual(d);
  expect(
    drawingHistory(drawingHistory(history, { type: 'UNDO' }), { type: 'REDO' })
      .present,
  ).toEqual(copied);
});
function editor(version?: LayoutVersion) {
  const data = managerData();
  const current = version ?? {
    ...data.layoutVersions![0]!,
    status: 'DRAFT' as const,
  };
  const run = vi.fn(async (command: OperationsCommand) => ({
    ...current,
    definition: command.data.definition,
    revision: current.revision + 1,
  }));
  const view = render(
    <LayoutEditor version={current} data={data} run={run} canManage />,
  );
  return { data, current, run, ...view };
}
test('asset insertion, recoloring, opacity and background settings save and reload through existing layout commands', async () => {
  const { run, current, unmount } = editor();
  fireEvent.click(screen.getByRole('button', { name: 'Assets' }));
  fireEvent.click(screen.getByRole('button', { name: 'Oak tree' }));
  fireEvent.click(screen.getByRole('button', { name: 'Style' }));
  fireEvent.change(screen.getByLabelText('Fill color'), {
    target: { value: '#789abc' },
  });
  fireEvent.change(screen.getByLabelText('Opacity'), {
    target: { value: '0.6' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.change(screen.getByLabelText('Background color'), {
    target: { value: '#faf8f2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  await waitFor(() => expect(run).toHaveBeenCalled());
  const command = run.mock.calls[0]![0];
  expect(command.action).toBe('SAVE_LAYOUT');
  const definition = command.data.definition as MapDefinition;
  const inserted = definition.elements.at(-1)!;
  expect(inserted).toMatchObject({
    type: 'IMAGE',
    assetId: 'tree-oak',
    fill: '#789abc',
    opacity: 0.6,
  });
  expect(command.data.spaces).not.toHaveProperty(inserted.id);
  expect(command.data.physicalBoothIds).not.toHaveProperty(inserted.id);
  unmount();
  editor({ ...current, definition: JSON.parse(JSON.stringify(definition)) });
  expect(canvas.props.definition).toEqual(definition);
});
test('environment drawing uses existing path geometry and does not add booths', () => {
  editor();
  const before = canvas.props.definition!.elements.filter(
    (e) => e.type === 'SPACE',
  );
  fireEvent.change(screen.getByLabelText('Environment drawing'), {
    target: { value: 'grass' },
  });
  act(() =>
    canvas.props.onPath!({
      x: 20,
      y: 30,
      width: 250,
      height: 150,
      points: [0, 0, 1, 0, 1, 1, 0, 1],
    }),
  );
  expect(canvas.props.definition!.elements.at(-1)).toMatchObject({
    type: 'LINE',
    closed: true,
    curved: true,
    fill: '#b7cd91',
    points: [0, 0, 1, 0, 1, 1, 0, 1],
  });
  expect(
    canvas.props.definition!.elements.filter((e) => e.type === 'SPACE'),
  ).toEqual(before);
  expect(canvas.props.definition!.elements.at(-1)!.zIndex).toBeLessThan(
    Math.min(...before.map((e) => e.zIndex)),
  );
});
