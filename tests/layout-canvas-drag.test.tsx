import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type Konva from 'konva';
import { MapCanvas } from '../packages/ui/src/map/MapCanvas';
import type { KonvaElement } from '../packages/ui/src/map/KonvaElement';
import type { MapElement } from '@market/api';

// Konva types restrict event targets to Shape/Stage, but Group is a real drag target.
const canvas = vi.hoisted(() => ({
  stage: {} as Record<string, (event: unknown) => void>,
  pointer: { x: 0, y: 0 },
  objects: new Map<string, ComponentProps<typeof KonvaElement>>(),
  nodes: new Map<string, Konva.Group>(),
}));
vi.mock('react-konva', async () => {
  const React = await import('react');
  const children = (props: { children?: import('react').ReactNode }) =>
    React.createElement('div', null, props.children);
  return {
    Stage: (
      props: Record<string, unknown> & { ref: import('react').Ref<unknown> },
    ) => {
      canvas.stage = props as typeof canvas.stage;
      React.useImperativeHandle(props.ref, () => ({
        getPointerPosition: () => canvas.pointer,
        batchDraw() {},
      }));
      return children({
        children: props.children as import('react').ReactNode,
      });
    },
    Layer: children,
    Rect: () => null,
    Line: () => null,
    Transformer: (props: { ref: import('react').Ref<unknown> }) => {
      React.useImperativeHandle(props.ref, () => ({
        nodes() {},
        forceUpdate() {},
        getLayer: () => null,
      }));
      return null;
    },
  };
});
vi.mock('../packages/ui/src/map/KonvaElement', async () => {
  const React = await import('react');
  const { default: Konva } = await import('konva');
  return {
    KonvaElement: (props: ComponentProps<typeof KonvaElement>) => {
      canvas.objects.set(props.element.id, props);
      const { element, nodeRef } = props;
      React.useLayoutEffect(() => {
        const e = element;
        const node = new Konva.Group({
          id: e.id,
          name: 'map-element',
          x: e.x + e.width / 2,
          y: e.y + e.height / 2,
        });
        canvas.nodes.set(e.id, node);
        nodeRef(e.id, node);
        return () => {
          nodeRef(e.id, null);
          node.destroy();
        };
      }, [element, nodeRef]);
      return null;
    },
  };
});
beforeEach(() => {
  canvas.objects.clear();
  canvas.nodes.clear();
});
const object = (id: string, patch: Partial<MapElement> = {}): MapElement => ({
  id,
  areaId: 'main',
  type: 'IMAGE',
  assetId: 'oak-tree',
  x: 1000,
  y: 700,
  width: 120,
  height: 80,
  rotation: 30,
  zIndex: 1,
  text: id,
  fill: '#315947',
  ...patch,
});

test.each([0.5, 1, 2])(
  'group dragging retains the grab offset at zoom %s, despite follower drag events',
  (scale) => {
    const elements = [
      object('tree', { groupId: 'entrance' }),
      object('sign', {
        x: 1437,
        y: 923,
        width: 250,
        height: 180,
        groupId: 'entrance',
      }),
      object('locked', { locked: true }),
    ];
    const change = vi.fn();
    render(
      <MapCanvas
        definition={{
          pixelsPerFoot: 10,
          areas: [{ id: 'main', name: 'Main' }],
          elements,
        }}
        areaId="main"
        editable
        selectedIds={elements.map((e) => e.id)}
        onChange={change}
        snap={false}
        snapObjects={false}
      />,
    );
    act(() =>
      canvas.stage.onWheel!({
        evt: {
          preventDefault() {},
          deltaY: -Math.log(scale) / 0.002,
          ctrlKey: false,
        },
      }),
    );
    const view = JSON.parse(
      screen.getByTestId('market-map-canvas').getAttribute('data-view')!,
    );
    const pointer = (x: number, y: number) => {
      canvas.pointer = {
        x: x * view.scale + view.x,
        y: y * view.scale + view.y,
      };
    };
    const first = canvas.objects.get('tree')!,
      follower = canvas.objects.get('sign')!;
    const event = (id: string) =>
      ({
        target: canvas.nodes.get(id)!,
        evt: new MouseEvent('mousedown', { button: 0 }),
        type: 'dragstart',
        pointerId: 1,
        currentTarget: canvas.nodes.get(id)!,
        cancelBubble: false,
      }) as unknown as Parameters<typeof first.onDragStart>[0];
    pointer(1035, 720);
    act(() => {
      canvas.stage.onMouseDown!(event('tree'));
      first.onDragStart(event('tree'));
    });
    // Konva Transformer initiates a drag on each follower after the leader.
    act(() => follower.onDragStart(event('sign')));
    pointer(1075, 745);
    act(() => first.onDragMove(event('tree')));
    act(() => follower.onDragMove(event('sign')));
    expect(canvas.nodes.get('tree')!.position()).toEqual({ x: 1100, y: 765 });
    expect(canvas.nodes.get('sign')!.position()).toEqual({ x: 1602, y: 1038 });
    expect(canvas.nodes.get('locked')!.position()).toEqual({ x: 1060, y: 740 });
    act(() => {
      first.onDragEnd(event('tree'));
      follower.onDragEnd(event('sign'));
    });
    expect(change).toHaveBeenCalledTimes(1);
    expect(change.mock.calls[0]![0]).toEqual([
      { ...elements[0], x: 1040, y: 725 },
      { ...elements[1], x: 1477, y: 948 },
    ]);
  },
);

test('an individual object stays under the same grab point', () => {
  const element = object('legend', {
    type: 'TEXT',
    x: -250,
    y: -400,
    width: 320,
    height: 200,
  });
  const change = vi.fn();
  render(
    <MapCanvas
      definition={{
        pixelsPerFoot: 10,
        areas: [{ id: 'main', name: 'Main' }],
        elements: [element],
      }}
      areaId="main"
      editable
      onChange={change}
      snap={false}
      snapObjects={false}
    />,
  );
  const props = canvas.objects.get('legend')!;
  const event = {
    target: canvas.nodes.get('legend')!,
    evt: new MouseEvent('mousedown', { button: 0 }),
    type: 'dragstart',
    pointerId: 1,
    currentTarget: canvas.nodes.get('legend')!,
    cancelBubble: false,
  } as unknown as Parameters<typeof props.onDragStart>[0];
  canvas.pointer = { x: -160, y: -320 }; // world (-200, -360), offset (50, 40).
  act(() => {
    canvas.stage.onMouseDown!(event);
    props.onDragStart(event);
  });
  canvas.pointer = { x: -130, y: -310 };
  act(() => {
    props.onDragMove(event);
    props.onDragEnd(event);
  });
  expect(change).toHaveBeenCalledWith([{ ...element, x: -220, y: -390 }]);
});

test('the preview renderer omits references, retains editor-hidden published objects, and clears selection', () => {
  const elements = [
    object('reference', { referenceOnly: true }),
    object('published', { editorHidden: true }),
    object('landscape', { type: 'LINE', closed: true }),
    object('booth', { type: 'SPACE' }),
  ];
  render(
    <MapCanvas
      definition={{
        pixelsPerFoot: 10,
        areas: [{ id: 'main', name: 'Main' }],
        elements,
      }}
      areaId="main"
      editable={false}
      grid
      selectedIds={[]}
    />,
  );
  expect([...canvas.objects.keys()]).toEqual([
    'published',
    'landscape',
    'booth',
  ]);
  expect(
    [...canvas.objects.values()].every(
      (props) => !props.editable && !props.selected,
    ),
  ).toBe(true);
});
