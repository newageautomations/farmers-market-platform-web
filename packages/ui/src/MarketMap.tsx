import { selectClassName, buttonClassName } from './presentation';
import { Input } from './form-controls';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  MapDefinition,
  MapElement,
  PublicOccurrenceMap,
} from '@market/api';
import { MapCanvas, type MapCanvasHandle } from './map/MapCanvas';
import type { BoothStatus } from './map/KonvaElement';
export type { BoothStatus } from './map/KonvaElement';
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
  showBoothList = true,
  boothListLimit,
}: {
  definition: MapDefinition;
  spaces?: PublicOccurrenceMap['spaces'];
  editable?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onEdit?: (e: MapElement) => void;
  grid?: boolean;
  snap?: boolean;
  overlays?: Record<string, string>;
  activeArea?: string;
  onAreaChange?: (id: string) => void;
  statuses?: Record<string, BoothStatus>;
  renderSpaceDetails?: (id: string) => ReactNode;
  showBoothList?: boolean;
  boothListLimit?: number;
}) {
  const [area, setArea] = useState(
      definition.elements.find((e) => e.id === selectedId)?.areaId ??
        definition.areas[0]?.id ??
        '',
    ),
    [search, setSearch] = useState(''),
    [highlight, setHighlight] = useState(''),
    [hover, setHover] = useState<{
      id: string;
      booth: { x: number; y: number; width: number; height: number };
    } | null>(null),
    [position, setPosition] = useState({ x: 8, y: 8 });
  const canvas = useRef<MapCanvasHandle>(null),
    tip = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    pendingLocate = useRef('');
  const shownArea = activeArea ?? area,
    elements = definition.elements.filter((e) => e.areaId === shownArea),
    selected = selectedId ?? highlight,
    hoveredSpace = spaces.find((s) => s.elementId === hover?.id);
  const visibleSpaces = spaces.filter(
    (s) =>
      (search || elements.some((e) => e.id === s.elementId)) &&
      (!search ||
        `${s.label} ${s.vendor?.businessName ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  useLayoutEffect(() => {
    if (!hover || !tip.current || !viewport.current) return;
    const el = viewport.current.querySelector('.konva-viewport');
    if (el) {
      const canvasBox = el.getBoundingClientRect(),
        parentBox = viewport.current.getBoundingClientRect();
      const positioned = boothTooltipPosition(
        hover.booth,
        canvasBox,
        tip.current.getBoundingClientRect(),
      );
      setPosition({
        x: positioned.x + canvasBox.left - parentBox.left,
        y: positioned.y + canvasBox.top - parentBox.top,
      });
    }
  }, [hover]);
  useEffect(() => {
    if (pendingLocate.current) {
      canvas.current?.locate(pendingLocate.current);
      pendingLocate.current = '';
    }
  }, [shownArea]);
  const onHover = useCallback(
    (
      id: string | null,
      booth?: { x: number; y: number; width: number; height: number },
    ) => setHover(id && booth ? { id, booth } : null),
    [],
  );
  function choose(id: string, notify = true) {
    setHighlight(id);
    if (notify) onSelect?.(id);
    const e = definition.elements.find((e) => e.id === id);
    if (e) {
      if (e.areaId !== shownArea) pendingLocate.current = id;
      else canvas.current?.locate(id);
      setArea(e.areaId);
      onAreaChange?.(e.areaId);
    }
  }
  return (
    <div className="ops-map">
      <div className="ops-toolbar">
        <label>
          Area{' '}
          <select
            className={selectClassName()}
            aria-label="Area"
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
      </div>
      <div className="map-read-surface" ref={viewport}>
        <MapCanvas
          ref={canvas}
          definition={definition}
          spaces={spaces}
          areaId={shownArea}
          selectedIds={selected ? [selected] : []}
          editable={editable}
          grid={grid}
          snap={snap}
          spacing={definition.pixelsPerFoot}
          onSelection={(ids) => {
            setHighlight(ids[0] ?? '');
            if (ids[0]) onSelect?.(ids[0]);
          }}
          onChange={(es) => es.forEach((e) => onEdit?.(e))}
          onHover={onHover}
          statuses={statuses}
          overlays={overlays}
        />
        {hoveredSpace && (
          <div
            className="booth-hover-card"
            ref={tip}
            role="tooltip"
            style={{ left: position.x, top: position.y }}
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
                className={buttonClassName({
                  variant: selected === e.id ? 'primary' : 'secondary',
                  size: 'compact',
                })}
                type="button"
                aria-pressed={selected === e.id}
                onClick={() => choose(e.id)}
              >
                {e.text || e.type} ({Math.round(e.x)}, {Math.round(e.y)})
              </button>
            </li>
          ))}
        </ul>
      ) : showBoothList ? (
        <>
          <label className="ops-field">
            Search Vendor or booth{' '}
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <ul
            className={`ops-map-list${boothListLimit ? ' ops-scroll-list' : ''}`}
            style={
              boothListLimit
                ? {
                    maxHeight: `calc(${boothListLimit} * var(--ops-list-row-height, 3.5rem) + ${boothListLimit - 1} * 0.7rem)`,
                  }
                : undefined
            }
            // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- Keyboard users need to scroll the bounded booth list.
            tabIndex={boothListLimit ? 0 : undefined}
            aria-label="Market Vendors and booths"
          >
            {visibleSpaces.map((s) => {
              const status =
                statuses[s.elementId] ?? (s.vendor ? 'assigned' : 'available');
              return (
                <li key={s.elementId}>
                  <details
                    className="booth-list-item ui-disclosure"
                    data-element={s.elementId}
                    onToggle={(e) => {
                      if (e.currentTarget.open) choose(s.elementId, false);
                    }}
                    onPointerEnter={() => {
                      const e = definition.elements.find(
                        (e) => e.id === s.elementId,
                      );
                      if (e)
                        onHover(s.elementId, {
                          x: 10,
                          y: 10,
                          width: e.width,
                          height: e.height,
                        });
                    }}
                    onPointerLeave={() => onHover(null)}
                  >
                    <summary>
                      <span>
                        {s.label}
                        {s.vendor?.businessName
                          ? ` - ${s.vendor.businessName}`
                          : ''}
                      </span>
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
                    <div className="booth-list-details ui-disclosure-content">
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
                          className={buttonClassName({
                            variant: 'secondary',
                            size: 'compact',
                          })}
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
      ) : null}
    </div>
  );
}
