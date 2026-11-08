import { buttonClassName } from '../presentation';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import Konva from 'konva';
import { Stage, Layer, Line, Rect, Transformer } from 'react-konva';
import type { MapDefinition, MapElement } from '@market/api';
import { KonvaElement, type Space, type BoothStatus } from './KonvaElement';
import { MapGrid } from './MapGrid';
import { visibleMapElements } from './visuals';
import { mapLegendEntries, isMapLegend } from './smart-design';
import {
  bounds,
  fit,
  marquee,
  normalizeTransform,
  objectSnap,
  pan,
  pathElement,
  selectIds,
  snapGrid,
  worldPoint,
  zoomAt,
  PATH_POINT_LIMIT,
  type Guide,
  type Point,
  type Viewport,
} from './model';
export type MapTool = 'select' | 'pan' | 'draw' | 'points';
export interface MapCanvasHandle {
  center: () => Point;
  locate: (id: string) => void;
  fit: () => void;
  /** Multiplies the zoom around the viewport center. */
  zoomBy: (factor: number) => void;
  /** Returns to 100% around the viewport center. */
  resetZoom: () => void;
}
type Event = Konva.KonvaEventObject<MouseEvent | TouchEvent>;
interface Gesture {
  kind: 'pan' | 'marquee' | 'draw' | 'click';
  start: Point;
  view: Viewport;
  world: Point;
  id?: string;
  points: Point[];
  moved: boolean;
}
export function MapCanvas({
  definition,
  navigationEnd,
  spaces = [],
  selectedIds = [],
  onSelection,
  onChange,
  onPath,
  onHover,
  statuses = {},
  overlays = {},
  areaId,
  editable = false,
  tool = 'select',
  grid = false,
  snap = false,
  snapObjects = true,
  spacing = 10,
  showNavigation = true,
  onViewChange,
  initialView,
  ref,
}: {
  navigationEnd?: import('react').ReactNode;
  /** Default true. Hosts that render their own zoom controls through the
   *  handle can omit the built-in navigation row and hint. */
  showNavigation?: boolean;
  /** Reports the screen viewport so hosts can place overlays and zoom readouts. */
  onViewChange?: (
    view: Viewport,
    size: { width: number; height: number },
  ) => void;
  /** Restores a previous viewport (for example after a save remount)
   *  instead of fitting the area on mount. */
  initialView?: Viewport;
  definition: MapDefinition;
  spaces?: Space[];
  selectedIds?: string[];
  onSelection?: (ids: string[]) => void;
  onChange?: (elements: MapElement[]) => void;
  onPath?: (path: ReturnType<typeof pathElement>) => void;
  onHover?: (id: string | null, box?: ReturnType<typeof bounds>) => void;
  statuses?: Record<string, BoothStatus>;
  overlays?: Record<string, string>;
  areaId: string;
  editable?: boolean;
  tool?: MapTool;
  grid?: boolean;
  snap?: boolean;
  snapObjects?: boolean;
  spacing?: number;
  ref?: Ref<MapCanvasHandle>;
}) {
  const container = useRef<HTMLDivElement>(null),
    stage = useRef<Konva.Stage>(null),
    transformer = useRef<Konva.Transformer>(null),
    nodes = useRef(new Map<string, Konva.Group>()),
    gesture = useRef<Gesture | null>(null),
    grab = useRef<Point | null>(null),
    drag = useRef<{ id: string; start: Point; elements: MapElement[] } | null>(
      null,
    ),
    chosen = useRef(selectedIds),
    pinch = useRef<{ distance: number; center: Point; view: Viewport } | null>(
      null,
    );
  const [size, setSize] = useState({ width: 0, height: 0 }),
    [view, setView] = useState<Viewport>(
      initialView ?? { x: 40, y: 40, scale: 1 },
    ),
    [modifier, setModifier] = useState(false),
    [shift, setShift] = useState(false),
    [guides, setGuides] = useState<Guide[]>([]),
    [box, setBox] = useState<{ a: Point; b: Point } | null>(null),
    [path, setPath] = useState<Point[]>([]);
  const panning = modifier || tool === 'pan',
    { elements, spaceMap, legendEntries } = useMemo(() => {
      const elements = visibleMapElements(definition.elements, editable)
        .filter((e) => e.areaId === areaId)
        .sort((a, b) => a.zIndex - b.zIndex);
      return {
        elements,
        spaceMap: new Map(spaces.map((s) => [s.elementId, s])),
        legendEntries: elements.some(isMapLegend)
          ? mapLegendEntries(elements, spaces, statuses)
          : [],
      };
    }, [definition.elements, areaId, editable, spaces, statuses]);
  useEffect(() => {
    chosen.current = selectedIds;
  }, [selectedIds]);
  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const resize = () =>
      setSize({
        width: Math.max(1, el.clientWidth),
        height: Math.max(1, el.clientHeight),
      });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // Fit once on area entry, never on each geometry edit.
  const fitted = useRef(initialView ? areaId : '');
  const previousSize = useRef({ width: 0, height: 0 });
  const heldPan = useRef({ space: false, alt: false });
  useLayoutEffect(() => {
    const previous = previousSize.current;
    if (
      previous.width &&
      previous.height &&
      (previous.width !== size.width || previous.height !== size.height)
    )
      setView((v) =>
        pan(v, {
          x: (size.width - previous.width) / 2,
          y: (size.height - previous.height) / 2,
        }),
      );
    previousSize.current = size;
  }, [size]);
  useEffect(() => {
    if (fitted.current !== areaId && size.width > 1) {
      fitted.current = areaId;
      setView(fit(elements, size));
    }
  }, [areaId, elements, size]);
  useEffect(() => {
    const tr = transformer.current;
    if (tr) {
      tr.nodes(
        selectedIds.flatMap((id) => {
          const e = elements.find((e) => e.id === id),
            node = nodes.current.get(id);
          return node && !e?.locked ? [node] : [];
        }),
      );
      tr.getLayer()?.batchDraw();
    }
  }, [selectedIds, elements]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.type === 'keydown' &&
        (e.target as HTMLElement)?.closest(
          'input,textarea,select,[contenteditable="true"]',
        )
      )
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        heldPan.current.space = e.type === 'keydown';
      }
      heldPan.current.alt = e.altKey;
      setModifier(heldPan.current.space || heldPan.current.alt);
      setShift(e.shiftKey);
      if (e.key === 'Escape') {
        gesture.current = null;
        setBox(null);
        setPath([]);
      }
    };
    const clear = () => {
      heldPan.current = { space: false, alt: false };
      setModifier(false);
      setShift(false);
    };
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
      window.removeEventListener('blur', clear);
    };
  }, []);
  const locate = useCallback(
    (id: string) => {
      const e = definition.elements.find((e) => e.id === id);
      if (e)
        setView((v) => ({
          ...v,
          x: size.width / 2 - (e.x + e.width / 2) * v.scale,
          y: size.height / 2 - (e.y + e.height / 2) * v.scale,
        }));
    },
    [definition.elements, size],
  );
  useImperativeHandle(
    ref,
    () => ({
      center: () => worldPoint({ x: size.width / 2, y: size.height / 2 }, view),
      locate,
      fit: () => setView(fit(elements, size)),
      zoomBy: (factor: number) =>
        setView((v) =>
          zoomAt(
            v,
            { x: size.width / 2, y: size.height / 2 },
            v.scale * factor,
          ),
        ),
      resetZoom: () =>
        setView((v) => zoomAt(v, { x: size.width / 2, y: size.height / 2 }, 1)),
    }),
    [view, size, locate, elements],
  );
  useEffect(() => {
    onViewChange?.(view, size);
  }, [view, size, onViewChange]);
  const nodeRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);
  const leave = useCallback(() => onHover?.(null), [onHover]);
  const enter = useCallback(
    (id: string) => {
      if (editable || gesture.current || drag.current) return;
      const e = definition.elements.find((e) => e.id === id);
      if (e) {
        const b = bounds(e);
        onHover?.(id, {
          x: b.x * view.scale + view.x,
          y: b.y * view.scale + view.y,
          width: b.width * view.scale,
          height: b.height * view.scale,
        });
      }
    },
    [editable, onHover, definition.elements, view],
  );
  function point() {
    return stage.current?.getPointerPosition() ?? { x: 0, y: 0 };
  }
  function down(event: Event) {
    if ('touches' in event.evt && event.evt.touches.length > 1) {
      gesture.current = null;
      leave();
      return;
    }
    if ('button' in event.evt && event.evt.button !== 0) return;
    if (
      event.target.getParent()?.className === 'Transformer' ||
      event.target.className === 'Transformer'
    )
      return;
    const node = event.target.findAncestor('.map-element', true),
      id = node?.id(),
      p = point(),
      world = worldPoint(p, view);
    grab.current = world;
    leave();
    if (panning || !editable) {
      gesture.current = {
        kind: 'click',
        start: p,
        view,
        world,
        id,
        points: [],
        moved: false,
      };
      return;
    }
    if (tool === 'draw') {
      gesture.current = {
        kind: 'draw',
        start: p,
        view,
        world,
        points: [world],
        moved: false,
      };
      setPath([world]);
      return;
    }
    if (id) {
      const next =
        selectedIds.includes(id) && !event.evt.shiftKey
          ? selectedIds
          : selectIds(elements, selectedIds, id, event.evt.shiftKey);
      chosen.current = next;
      onSelection?.(next);
    } else {
      if (!event.evt.shiftKey) {
        chosen.current = [];
        onSelection?.([]);
      }
      gesture.current = {
        kind: 'marquee',
        start: p,
        view,
        world,
        points: [],
        moved: false,
      };
    }
  }
  function move() {
    const g = gesture.current;
    if (!g) return;
    const p = point(),
      w = worldPoint(p, view);
    if (Math.hypot(p.x - g.start.x, p.y - g.start.y) > 5) g.moved = true;
    if (g.kind === 'click' && g.moved) g.kind = 'pan';
    if (g.kind === 'pan')
      setView(pan(g.view, { x: p.x - g.start.x, y: p.y - g.start.y }));
    if (g.kind === 'marquee') setBox({ a: g.world, b: w });
    if (
      g.kind === 'draw' &&
      g.points.length < PATH_POINT_LIMIT &&
      Math.hypot(w.x - g.points.at(-1)!.x, w.y - g.points.at(-1)!.y) > 2
    ) {
      g.points.push(w);
      setPath([...g.points]);
    }
  }
  function up(event: Event) {
    const g = gesture.current;
    gesture.current = null;
    if (
      g?.kind === 'click' &&
      !g.moved &&
      !panning &&
      g.id &&
      elements.find((e) => e.id === g.id)?.type === 'SPACE'
    )
      onSelection?.([g.id]);
    if (g?.kind === 'marquee') {
      const found = marquee(elements, g.world, worldPoint(point(), view));
      onSelection?.(
        event.evt.shiftKey
          ? [...new Set([...chosen.current, ...found])]
          : found,
      );
    }
    if (g?.kind === 'draw' && g.points.length >= 2)
      onPath?.(pathElement(g.points));
    setBox(null);
    setPath([]);
  }
  const dragStart = useCallback(
    (event: Event) => {
      gesture.current = null;
      // Transformer starts a drag on every selected node. Keep one gesture
      // origin rather than replacing it with each follower's object center.
      if (drag.current) return;
      const id = event.target.id(),
        e = elements.find((e) => e.id === id);
      if (!e) return;
      const ids = chosen.current.includes(id)
        ? chosen.current
        : selectIds(elements, [], id);
      drag.current = {
        id,
        start: grab.current ?? worldPoint(point(), view),
        elements: elements.filter(
          (e) => ids.includes(e.id) && !e.locked && !e.editorHidden,
        ),
      };
      leave();
    },
    [elements, leave, view],
  );
  const dragMove = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    const original = d.elements.find((e) => e.id === d.id);
    if (!original) return;
    const pointer = worldPoint(point(), view);
    let dx = pointer.x - d.start.x,
      dy = pointer.y - d.start.y;
    let e = { ...original, x: original.x + dx, y: original.y + dy };
    if (snap) {
      e = { ...e, x: snapGrid(e.x, spacing), y: snapGrid(e.y, spacing) };
    }
    const adjusted = snapObjects
      ? objectSnap(
          e,
          elements.filter((e) => !d.elements.some((o) => o.id === e.id)),
          5 / view.scale,
        )
      : { x: e.x, y: e.y, guides: [] };
    dx = adjusted.x - original.x;
    dy = adjusted.y - original.y;
    setGuides((previous) =>
      JSON.stringify(previous) === JSON.stringify(adjusted.guides)
        ? previous
        : adjusted.guides,
    );
    for (const member of d.elements)
      nodes.current.get(member.id)?.position({
        x: member.x + member.width / 2 + dx,
        y: member.y + member.height / 2 + dy,
      });
    transformer.current?.forceUpdate();
    stage.current?.batchDraw();
  }, [elements, snap, spacing, snapObjects, view]);
  const dragEnd = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    grab.current = null;
    setGuides([]);
    if (d)
      onChange?.(
        d.elements.map((e) => {
          const n = nodes.current.get(e.id)!;
          return { ...e, x: n.x() - e.width / 2, y: n.y() - e.height / 2 };
        }),
      );
  }, [onChange]);
  function transformed() {
    const next =
      transformer.current?.nodes().flatMap((n) => {
        const e = elements.find((e) => e.id === n.id());
        if (!e) return [];
        const value = normalizeTransform(
          e,
          {
            x: n.x(),
            y: n.y(),
            scaleX: n.scaleX(),
            scaleY: n.scaleY(),
            rotation: n.rotation(),
          },
          definition.pixelsPerFoot,
        );
        n.scale({ x: 1, y: 1 });
        return [value];
      }) ?? [];
    onChange?.(next);
  }
  function touchMove(event: Konva.KonvaEventObject<TouchEvent>) {
    if (event.evt.touches.length !== 2) {
      move();
      return;
    }
    event.evt.preventDefault();
    const activeDrag = drag.current;
    drag.current = null;
    stage.current?.stopDrag();
    for (const n of nodes.current.values()) n.stopDrag();
    for (const e of activeDrag?.elements ?? [])
      nodes.current
        .get(e.id)
        ?.position({ x: e.x + e.width / 2, y: e.y + e.height / 2 });
    gesture.current = null;
    const rect = container.current!.getBoundingClientRect(),
      a = event.evt.touches[0]!,
      b = event.evt.touches[1]!,
      center = {
        x: (a.clientX + b.clientX) / 2 - rect.left,
        y: (a.clientY + b.clientY) / 2 - rect.top,
      },
      distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (!pinch.current) pinch.current = { distance, center, view };
    const initial = pinch.current;
    setView(
      pan(
        zoomAt(
          initial.view,
          initial.center,
          (initial.view.scale * distance) / initial.distance,
        ),
        { x: center.x - initial.center.x, y: center.y - initial.center.y },
      ),
    );
    leave();
  }
  const mixed =
    selectedIds.length > 1 &&
    elements.some((e) => selectedIds.includes(e.id) && e.type === 'SPACE');
  return (
    <div className="map-canvas-shell">
      {showNavigation && (
      <div className="map-navigation" aria-label="Map navigation">
        <button
          className={buttonClassName({
            variant: 'secondary',
            size: 'compact',
            iconOnly: true,
          })}
          type="button"
          aria-label="Zoom out"
          onClick={() =>
            setView((v) =>
              zoomAt(
                v,
                { x: size.width / 2, y: size.height / 2 },
                v.scale / 1.25,
              ),
            )
          }
        >
          −
        </button>
        <output aria-label="Zoom percentage">
          {Math.round(view.scale * 100)}%
        </output>
        <button
          className={buttonClassName({
            variant: 'secondary',
            size: 'compact',
            iconOnly: true,
          })}
          type="button"
          aria-label="Zoom in"
          onClick={() =>
            setView((v) =>
              zoomAt(
                v,
                { x: size.width / 2, y: size.height / 2 },
                v.scale * 1.25,
              ),
            )
          }
        >
          +
        </button>
        <button
          className={buttonClassName({ variant: 'secondary', size: 'compact' })}
          type="button"
          onClick={() => setView(fit(elements, size))}
        >
          Fit map
        </button>
        <button
          className={buttonClassName({ variant: 'secondary', size: 'compact' })}
          type="button"
          onClick={() =>
            setView((v) =>
              zoomAt(v, { x: size.width / 2, y: size.height / 2 }, 1),
            )
          }
        >
          Reset zoom
        </button>
        {navigationEnd}
      </div>
      )}
      <div
        ref={container}
        className={`ops-map-viewport ops-canvas konva-viewport ${panning ? 'is-panning' : ''}`}
        data-testid="market-map-canvas"
        data-view={JSON.stringify(view)}
        role="img"
        aria-label={
          editable
            ? 'Editable Market layout. Use Layers and the inspector for keyboard editing.'
            : 'Market venue map. Vendor and space information is also available in the list.'
        }
      >
        <Stage
          ref={stage}
          width={size.width}
          height={size.height}
          x={view.x}
          y={view.y}
          scaleX={view.scale}
          scaleY={view.scale}
          onMouseDown={down}
          onMouseMove={move}
          onMouseUp={up}
          onMouseLeave={() => {
            leave();
            gesture.current = null;
            setBox(null);
            setPath([]);
          }}
          onTouchStart={down}
          onTouchMove={touchMove}
          onTouchEnd={(e) => {
            if (pinch.current) {
              pinch.current = null;
              gesture.current = null;
            } else up(e);
          }}
          onWheel={(event) => {
            event.evt.preventDefault();
            leave();
            const direction = event.evt.ctrlKey
              ? -event.evt.deltaY
              : event.evt.deltaY;
            setView((v) =>
              zoomAt(v, point(), v.scale * Math.exp(-direction * 0.002)),
            );
          }}
        >
          <Layer>
            {definition.background && (
              <Rect
                x={-view.x / view.scale}
                y={-view.y / view.scale}
                width={size.width / view.scale}
                height={size.height / view.scale}
                fill={definition.background.color}
                listening={false}
              />
            )}
            {grid && editable && (
              <MapGrid
                view={view}
                width={size.width}
                height={size.height}
                spacing={spacing}
                color={definition.background?.gridColor}
                opacity={definition.background?.gridOpacity}
              />
            )}
            {elements.map((e) => (
              <KonvaElement
                key={e.id}
                element={e}
                legendEntries={legendEntries}
                space={spaceMap.get(e.id)}
                selected={selectedIds.includes(e.id)}
                editable={editable && tool === 'select'}
                panning={panning}
                status={statuses[e.id]}
                overlay={overlays[e.id]}
                nodeRef={nodeRef}
                onEnter={enter}
                onLeave={leave}
                onDragStart={dragStart}
                onDragMove={dragMove}
                onDragEnd={dragEnd}
                onPointChange={
                  editable &&
                  tool === 'points' &&
                  !panning &&
                  selectedIds.includes(e.id) &&
                  e.type === 'LINE' &&
                  !e.locked
                    ? (element) => onChange?.([element])
                    : undefined
                }
              />
            ))}
            {editable && (
              <Transformer
                ref={transformer}
                visible={!panning && tool === 'select'}
                listening={!panning && tool === 'select'}
                flipEnabled={false}
                keepRatio={false}
                rotateEnabled={!mixed}
                enabledAnchors={mixed ? [] : undefined}
                rotationSnaps={
                  shift ? [0, 45, 90, 135, 180, 225, 270, 315] : []
                }
                rotationSnapTolerance={shift ? 45 : 5}
                borderStroke="#2456b8"
                anchorStroke="#2456b8"
                anchorFill="#fff"
                anchorSize={8}
                anchorCornerRadius={2}
                rotateAnchorOffset={28}
                onTransformEnd={transformed}
                boundBoxFunc={(old, next) =>
                  Math.abs(next.width) < 8 || Math.abs(next.height) < 8
                    ? old
                    : next
                }
              />
            )}
            {guides.map((g) => (
              <Line
                key={g.axis}
                points={
                  g.axis === 'x'
                    ? [
                        g.value,
                        -view.y / view.scale,
                        g.value,
                        (size.height - view.y) / view.scale,
                      ]
                    : [
                        -view.x / view.scale,
                        g.value,
                        (size.width - view.x) / view.scale,
                        g.value,
                      ]
                }
                stroke="#d04d7b"
                strokeWidth={1 / view.scale}
                dash={[5 / view.scale, 4 / view.scale]}
                listening={false}
              />
            ))}
            {box && (
              <Rect
                x={Math.min(box.a.x, box.b.x)}
                y={Math.min(box.a.y, box.b.y)}
                width={Math.abs(box.b.x - box.a.x)}
                height={Math.abs(box.b.y - box.a.y)}
                fill="#2456b822"
                stroke="#2456b8"
                strokeWidth={1 / view.scale}
                listening={false}
              />
            )}
            {path.length > 1 && (
              <Line
                points={path.flatMap((p) => [p.x, p.y])}
                stroke="#315947"
                strokeWidth={3}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      </div>
      {showNavigation && (
        <p className="map-hint">
          {editable
            ? 'Shift-click or drag empty space to select. Space or Alt + drag to pan.'
            : 'Drag to pan.'}{' '}
          Scroll to zoom.
        </p>
      )}
    </div>
  );
}
