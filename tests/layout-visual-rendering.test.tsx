import { render, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import type { MapElement } from '@market/api';
import { KonvaElement } from '../packages/ui/src/map/KonvaElement';
import {
  MAP_LEGEND_TEMPLATE,
  boothStatusColors,
} from '../packages/ui/src/map/smart-design';
const rendered = vi.hoisted(
  () => [] as Array<{ shape: string; props: Record<string, unknown> }>,
);
vi.mock('react-konva', async () => {
  const { createElement } = await import('react');
  return Object.fromEntries(
    ['Group', 'Rect', 'Ellipse', 'Circle', 'Line', 'Text', 'Image'].map(
      (shape) => [
        shape,
        (props: Record<string, unknown>) => {
          rendered.push({ shape, props });
          return shape === 'Group'
            ? createElement(
                'div',
                null,
                props.children as import('react').ReactNode,
              )
            : null;
        },
      ],
    ),
  );
});
beforeEach(() => {
  rendered.length = 0;
});
const base: MapElement = {
  id: 'path',
  areaId: 'main',
  type: 'LINE',
  x: 10,
  y: 20,
  width: 200,
  height: 100,
  rotation: 30,
  zIndex: 0,
  text: 'North gate',
  fill: '#aabbcc',
};
const handlers = {
  selected: false,
  editable: true,
  panning: false,
  nodeRef: vi.fn(),
  onEnter: vi.fn(),
  onLeave: vi.fn(),
  onDragStart: vi.fn(),
  onDragMove: vi.fn(),
  onDragEnd: vi.fn(),
};
test('dynamic legend rendering uses actual entries and updates without changing its saved text', () => {
  const legend = {
    ...base,
    type: 'TEXT' as const,
    text: MAP_LEGEND_TEMPLATE + 'Market guide',
    labelBackground: '#fafaf8',
  };
  const view = render(
    <KonvaElement
      {...handlers}
      element={legend}
      legendEntries={[{ label: 'Assigned', color: boothStatusColors.assigned }]}
    />,
  );
  expect(
    rendered.filter((r) => r.shape === 'Text').map((r) => r.props.text),
  ).toEqual(['Market guide', 'Assigned']);
  expect(
    rendered.some(
      (r) => r.shape === 'Rect' && r.props.fill === boothStatusColors.assigned,
    ),
  ).toBe(true);
  rendered.length = 0;
  view.rerender(
    <KonvaElement
      {...handlers}
      element={legend}
      legendEntries={[{ label: 'Parking', color: '#223344' }]}
    />,
  );
  expect(
    rendered.filter((r) => r.shape === 'Text').map((r) => r.props.text),
  ).toEqual(['Market guide', 'Parking']);
  expect(legend.text).toBe(MAP_LEGEND_TEMPLATE + 'Market guide');
});
test('the shared renderer draws curved closed vectors, outlines and patterned strokes', () => {
  render(
    <KonvaElement
      {...handlers}
      element={{
        ...base,
        points: [0, 0, 0.5, 1, 1, 0],
        closed: true,
        curved: true,
        strokeWidth: 12,
        stroke: '#abcdef',
        strokePattern: 'dashed',
        outlineColor: '#123456',
        outlineWidth: 2,
        opacity: 0.6,
      }}
    />,
  );
  const lines = rendered.filter((r) => r.shape === 'Line');
  expect(lines[0]!.props).toMatchObject({
    points: [0, 0, 100, 100, 200, 0],
    closed: true,
    tension: 0.35,
    strokeWidth: 16,
    stroke: '#123456',
  });
  expect(lines[1]!.props).toMatchObject({
    fill: '#aabbcc',
    dash: [36, 24],
    strokeWidth: 12,
    lineCap: 'round',
    lineJoin: 'round',
  });
  expect(rendered.find((r) => r.shape === 'Group')!.props).toMatchObject({
    x: 110,
    y: 70,
    rotation: 30,
    opacity: 0.6,
  });
});
test('labels use curated fonts, aligned text and padded rounded backgrounds', () => {
  render(
    <KonvaElement
      {...handlers}
      element={{
        ...base,
        type: 'TEXT',
        fontFamily: 'serif',
        labelBackground: '#faf8f2',
        labelPadding: 8,
        cornerRadius: 6,
        fontWeight: 'bold',
        textAlign: 'center',
      }}
    />,
  );
  expect(rendered.find((r) => r.shape === 'Rect')!.props).toMatchObject({
    fill: '#faf8f2',
    cornerRadius: 6,
  });
  expect(rendered.find((r) => r.shape === 'Text')!.props).toMatchObject({
    fontFamily: 'Georgia, serif',
    padding: 8,
    fontStyle: 'bold',
    align: 'center',
    fill: '#aabbcc',
  });
});
test('point editing commits normalized vertices within the existing rotated object bounds', () => {
  const change = vi.fn();
  render(
    <KonvaElement
      {...handlers}
      editable={false}
      selected
      onPointChange={change}
      element={{ ...base, points: [0, 0, 1, 1] }}
    />,
  );
  const handle = rendered.filter((r) => r.shape === 'Circle')[1]!;
  const position = vi.fn().mockReturnValue({ x: 300, y: 40 });
  const event = { cancelBubble: false, target: { position } };
  (handle.props.onDragEnd as (event: unknown) => void)(event);
  expect(event.cancelBubble).toBe(true);
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({
      rotation: 30,
      width: 200,
      height: 100,
      points: [0, 0, 1, 0.4],
    }),
  );
  expect(position).toHaveBeenLastCalledWith({ x: 200, y: 40 });
  expect(rendered.find((r) => r.shape === 'Group')!.props.listening).toBe(true);
});
test('duplicate illustrations share decoded trusted SVG images and keep a selectable hit surface', async () => {
  const load = vi.spyOn(window, 'Image').mockImplementation(function () {
    const img = document.createElement('img');
    Object.defineProperty(img, 'src', {
      set: () => queueMicrotask(() => img.dispatchEvent(new Event('load'))),
    });
    return img;
  });
  const asset = {
    ...base,
    type: 'IMAGE' as const,
    assetId: 'tree-maple',
    fill: '#123456',
  };
  render(
    <>
      <KonvaElement {...handlers} element={asset} />
      <KonvaElement {...handlers} element={{ ...asset, id: 'copy' }} />
    </>,
  );
  await waitFor(() =>
    expect(rendered.filter((r) => r.shape === 'Image')).toHaveLength(2),
  );
  expect(load).toHaveBeenCalledTimes(1);
  expect(
    rendered.some(
      (r) =>
        r.shape === 'Rect' &&
        r.props.fill === 'rgba(0,0,0,0)' &&
        r.props.width === 200,
    ),
  ).toBe(true);
});
