import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type {
  MapDefinition,
  MapElement,
  PublicOccurrenceMap,
} from '@market/api';

interface View {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Gesture {
  kind: 'move' | 'resize' | 'pan' | 'select';
  start: { x: number; y: number };
  screen: { x: number; y: number };
  element?: MapElement;
  view: View;
  scale: number;
}
export type BoothStatus = 'available' | 'assigned' | 'paid';
export function boothTooltipPosition(
  booth: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
  card: { width: number; height: number },
) {
  const clamp = (value: number, length: number, size: number) =>
    Math.max(8, Math.min(value, length - size - 8));
  return {
    x: clamp(booth.x - card.width - 12, viewport.width, card.width),
    y: clamp(
      booth.y - card.height - 12 >= 8
        ? booth.y - card.height - 12
        : booth.y + booth.height + 12,
      viewport.height,
      card.height,
    ),
  };
}
const amenitiesLabel = (amenities: string[]) =>
  amenities.map((a) => a.toLowerCase().replaceAll('_', ' ')).join(', ');
export function MarketMap({
  definition,
  spaces = [],
  editable = false,
  selectedId,
  onSelect,
  onEdit,
  grid = false,
  snap = false,
  overlays = {},
  activeArea,
  onAreaChange,
  statuses = {},
  renderSpaceDetails,
}: {
  definition: MapDefinition;
  spaces?: PublicOccurrenceMap['spaces'];
  editable?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onEdit?: (element: MapElement) => void;
  grid?: boolean;
  snap?: boolean;
  overlays?: Record<string, string>;
  activeArea?: string;
  onAreaChange?: (id: string) => void;
  statuses?: Record<string, BoothStatus>;
  renderSpaceDetails?: (id: string) => ReactNode;
}) {
  const [area, setArea] = useState(
      definition.elements.find((e) => e.id === selectedId)?.areaId ??
        definition.areas[0]?.id ??
        '',
    ),
    [view, setView] = useState<View>({
      x: -20,
      y: -20,
      width: 1000,
      height: 650,
    }),
    [search, setSearch] = useState(''),
    [highlight, setHighlight] = useState(''),
    [preview, setPreview] = useState<MapElement | null>(null),
    [hover, setHover] = useState<{
      id: string;
      booth: { x: number; y: number; width: number; height: number };
    } | null>(null),
    [tipPosition, setTipPosition] = useState({ x: 8, y: 8 });
  const gesture = useRef<Gesture | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null),
    tipRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!hover || !viewportRef.current || !tipRef.current) return;
    setTipPosition(
      boothTooltipPosition(
        hover.booth,
        viewportRef.current.getBoundingClientRect(),
        tipRef.current.getBoundingClientRect(),
      ),
    );
  }, [hover]);
  const hoveredSpace = spaces.find((s) => s.elementId === hover?.id);
  const selected = selectedId ?? highlight;
  const shownArea = activeArea ?? area;
  const elements = definition.elements
      .filter((e) => e.areaId === shownArea)
      .sort((a, b) => a.zIndex - b.zIndex),
    visibleSpaces = spaces.filter(
      (s) =>
        (search || elements.some((e) => e.id === s.elementId)) &&
        (!search ||
          `${s.label} ${s.vendor?.businessName ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase())),
    );
  function choose(id: string, notify = true) {
    setHighlight(id);
    if (notify) onSelect?.(id);
    const e = definition.elements.find((e) => e.id === id);
    if (e) {
      setArea(e.areaId);
      onAreaChange?.(e.areaId);
      setView((v) => ({
        ...v,
        x: e.x + e.width / 2 - v.width / 2,
        y: e.y + e.height / 2 - v.height / 2,
      }));
    }
  }
  function point(event: PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget,
      p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const matrix = svg.getScreenCTM();
    return matrix ? p.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
  }
  function start(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const target = event.target as SVGElement,
      id = target.closest('[data-element]')?.getAttribute('data-element'),
      element = elements.find((e) => e.id === id);
    if (element) {
      setHighlight(element.id);
      if (editable) onSelect?.(element.id);
    }
    setHover(null);
    gesture.current = {
      kind: element
        ? !editable
          ? 'select'
          : target.getAttribute('data-resize')
            ? 'resize'
            : 'move'
        : 'pan',
      start: point(event),
      screen: { x: event.clientX, y: event.clientY },
      element,
      view,
      scale: event.currentTarget.getScreenCTM()?.a ?? 1,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g) return;
    const dx = (event.clientX - g.screen.x) / g.scale,
      dy = (event.clientY - g.screen.y) / g.scale;
    if (g.kind === 'select') {
      if (
        Math.hypot(event.clientX - g.screen.x, event.clientY - g.screen.y) <= 5
      )
        return;
      g.kind = 'pan';
    }
    if (g.kind === 'pan')
      setView({ ...g.view, x: g.view.x - dx, y: g.view.y - dy });
    else if (g.element) {
      const round = (v: number) =>
        snap
          ? Math.round(v / definition.pixelsPerFoot) * definition.pixelsPerFoot
          : v;
      setPreview(
        g.kind === 'resize'
          ? {
              ...g.element,
              width: Math.max(
                definition.pixelsPerFoot,
                round(g.element.width + dx),
              ),
              height: Math.max(
                definition.pixelsPerFoot,
                round(g.element.height + dy),
              ),
            }
          : {
              ...g.element,
              x: round(g.element.x + dx),
              y: round(g.element.y + dy),
            },
      );
    }
  }
  function finish() {
    if (
      gesture.current?.kind === 'select' &&
      gesture.current.element?.type === 'SPACE'
    )
      onSelect?.(gesture.current.element.id);
    if (preview) onEdit?.(preview);
    gesture.current = null;
    setPreview(null);
  }
  return (
    <div className="ops-map">
      <div className="ops-toolbar">
        <label>
          Area{' '}
          <select
            value={shownArea}
            onChange={(e) => {
              setArea(e.target.value);
              onAreaChange?.(e.target.value);
            }}
          >
            {definition.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() =>
            setView((v) => ({
              ...v,
              width: v.width / 1.25,
              height: v.height / 1.25,
            }))
          }
          aria-label="Zoom in"
        >
          Zoom in
        </button>
        <button
          type="button"
          onClick={() =>
            setView((v) => ({
              ...v,
              width: v.width * 1.25,
              height: v.height * 1.25,
            }))
          }
          aria-label="Zoom out"
        >
          Zoom out
        </button>
        <button
          type="button"
          onClick={() => {
            const x = Math.min(0, ...elements.map((e) => e.x)),
              y = Math.min(0, ...elements.map((e) => e.y)),
              w = Math.max(800, ...elements.map((e) => e.x + e.width)) - x;
            setView({
              x: x - 20,
              y: y - 20,
              width: w + 40,
              height: Math.max(520, w * 0.65),
            });
          }}
        >
          Fit map
        </button>
      </div>
      <div className="ops-map-viewport" ref={viewportRef}>
        <svg
          className="ops-canvas"
          viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={() => {
            gesture.current = null;
            setPreview(null);
          }}
          role="img"
          aria-label={
            editable
              ? 'Editable Market layout. Use the element list and inspector for keyboard editing.'
              : 'Market venue map. Vendor and space information is also available in the list.'
          }
        >
          <title>Market venue</title>
          <defs>
            <pattern
              id="market-grid"
              width={definition.pixelsPerFoot}
              height={definition.pixelsPerFoot}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${definition.pixelsPerFoot} 0 L 0 0 0 ${definition.pixelsPerFoot}`}
                fill="none"
                stroke="#cbd5cf"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect
            x={view.x}
            y={view.y}
            width={view.width}
            height={view.height}
            fill={grid ? 'url(#market-grid)' : '#f6f8f4'}
          />
          {elements.map((original) => {
            const e = preview?.id === original.id ? preview : original,
              space = spaces.find((s) => s.elementId === e.id);
            return (
              <g
                key={e.id}
                data-element={e.id}
                onPointerEnter={(event) => {
                  if (
                    editable ||
                    e.type !== 'SPACE' ||
                    gesture.current ||
                    !viewportRef.current
                  )
                    return;
                  const booth = event.currentTarget.getBoundingClientRect(),
                    viewport = viewportRef.current.getBoundingClientRect();
                  setHover({
                    id: e.id,
                    booth: {
                      x: booth.left - viewport.left,
                      y: booth.top - viewport.top,
                      width: booth.width,
                      height: booth.height,
                    },
                  });
                }}
                onPointerLeave={() => setHover(null)}
                transform={`translate(${e.x} ${e.y}) rotate(${e.rotation} ${e.width / 2} ${e.height / 2})`}
              >
                {e.type === 'CIRCLE' ? (
                  <ellipse
                    cx={e.width / 2}
                    cy={e.height / 2}
                    rx={e.width / 2}
                    ry={e.height / 2}
                    fill={e.fill}
                  />
                ) : e.type === 'TRIANGLE' ? (
                  <polygon
                    points={`${e.width / 2},0 0,${e.height} ${e.width},${e.height}`}
                    fill={e.fill}
                  />
                ) : e.type === 'LINE' ? (
                  <line
                    x1={0}
                    y1={0}
                    x2={e.width}
                    y2={e.height}
                    stroke={e.fill}
                    strokeWidth={3}
                  />
                ) : e.type === 'TEXT' ? (
                  <text x={0} y={20} fill={e.fill} fontSize={18}>
                    {e.text}
                  </text>
                ) : e.type === 'IMAGE' ? (
                  <image
                    href={e.imageUrl}
                    width={e.width}
                    height={e.height}
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : (
                  <rect
                    width={e.width}
                    height={e.height}
                    fill={
                      e.type === 'SPACE' && statuses[e.id]
                        ? {
                            available: '#f0f5ef',
                            assigned: '#e8edff',
                            paid: '#d8efdf',
                          }[statuses[e.id]!]
                        : e.fill
                    }
                    stroke={e.type === 'SPACE' ? '#27523b' : '#718171'}
                    strokeWidth={1.5}
                  />
                )}
                {e.type === 'SPACE' && (
                  <>
                    <text x={5} y={20} fill="#173925" fontSize={12}>
                      {space?.label ?? e.text}
                    </text>
                    {space?.vendor && (
                      <text x={5} y={37} fill="#173925" fontSize={11}>
                        {space.vendor.businessName.slice(
                          0,
                          Math.max(2, Math.floor((e.width - 10) / 6)),
                        )}
                      </text>
                    )}
                  </>
                )}
                {selected === e.id && (
                  <>
                    <rect
                      width={e.width}
                      height={e.height}
                      fill="none"
                      stroke="#1649b2"
                      strokeWidth={4}
                    />
                    {editable && (
                      <rect
                        data-resize="true"
                        x={e.width - 8}
                        y={e.height - 8}
                        width={16}
                        height={16}
                        fill="#1649b2"
                      />
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
        {hoveredSpace && (
          <div
            className="booth-hover-card"
            ref={tipRef}
            role="tooltip"
            style={{ left: tipPosition.x, top: tipPosition.y }}
          >
            <strong>{hoveredSpace.label}</strong>
            <p>
              {hoveredSpace.widthFeet} × {hoveredSpace.depthFeet} ft
            </p>
            {hoveredSpace.amenities.length > 0 && (
              <p>Amenities: {amenitiesLabel(hoveredSpace.amenities)}</p>
            )}
            <p>
              {hoveredSpace.vendor
                ? `Assigned to ${hoveredSpace.vendor.businessName}`
                : 'Available for a business'}
            </p>
            {statuses[hoveredSpace.elementId] === 'paid' && (
              <span className="booth-state paid">Paid</span>
            )}
            {overlays[hoveredSpace.elementId] && (
              <p>{overlays[hoveredSpace.elementId]}</p>
            )}
          </div>
        )}
      </div>
      {editable ? (
        <ul className="ops-map-list" aria-label="Layout elements">
          {elements.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                aria-pressed={selected === e.id}
                onClick={() => choose(e.id)}
              >
                {e.text || e.type} ({Math.round(e.x)}, {Math.round(e.y)})
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <label className="ops-field">
            Search Vendor or booth{' '}
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <ul className="ops-map-list" aria-label="Market Vendors and booths">
            {visibleSpaces.map((s) => {
              const status =
                statuses[s.elementId] ?? (s.vendor ? 'assigned' : 'available');
              return (
                <li key={s.elementId}>
                  <details
                    className="booth-list-item"
                    onToggle={(event) => {
                      if (event.currentTarget.open) choose(s.elementId, false);
                    }}
                  >
                    <summary>
                      <span>{s.label}</span>
                      <span className={`booth-state ${status}`}>
                        {status === 'available'
                          ? 'Available'
                          : status === 'paid'
                            ? 'Paid'
                            : 'Assigned'}
                      </span>
                      <svg
                        className="booth-chevron"
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="m4 6 4 4 4-4" />
                      </svg>
                    </summary>
                    <div className="booth-list-details">
                      <p>
                        {s.widthFeet} × {s.depthFeet} ft.{' '}
                        {s.amenities.length > 0 &&
                          `Amenities: ${amenitiesLabel(s.amenities)}`}
                      </p>
                      <p>{s.vendor?.businessName ?? 'No business assigned'}</p>
                      {s.vendor?.description && <p>{s.vendor.description}</p>}
                      {overlays[s.elementId] && <p>{overlays[s.elementId]}</p>}
                      {renderSpaceDetails?.(s.elementId)}
                      {onSelect && (
                        <button
                          type="button"
                          onClick={() => choose(s.elementId)}
                        >
                          {s.vendor
                            ? 'Manage business assignment'
                            : 'Add business to booth'}
                        </button>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
          {!visibleSpaces.length && <p>No matching Vendors or booths.</p>}
        </>
      )}
    </div>
  );
}
