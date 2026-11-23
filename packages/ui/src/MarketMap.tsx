import { buttonClassName } from './presentation';
import { Select } from './index';
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
import { mapElementLabel } from './map/smart-design';
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
  boothCards = false,
  spaces = [],
  editable = false,
  selectedId,
  onSelect,
  onEdit,
  grid = false,
  snap = false,
  overlays = {},
  highlightedIds = [],
  activeArea,
  onAreaChange,
  statuses = {},
  renderSpaceDetails,
  showBoothList = true,
  boothListLimit,
  renderHoverCard,
  locateId,
  onLocated,
}: {
  boothCards?: boolean;
  definition: MapDefinition;
  spaces?: PublicOccurrenceMap['spaces'];
  editable?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onEdit?: (e: MapElement) => void;
  grid?: boolean;
  snap?: boolean;
  overlays?: Record<string, string>;
  highlightedIds?: readonly string[];
  activeArea?: string;
  onAreaChange?: (id: string) => void;
  statuses?: Record<string, BoothStatus>;
  renderSpaceDetails?: (id: string) => ReactNode;
  showBoothList?: boolean;
  boothListLimit?: number;
  /**
   * Replaces the default booth details with the caller's card. The card fades
   * in, can be pointed at and clicked, and stays open while the pointer is
   * on it. Callers without it keep the default read-only tooltip.
   */
  renderHoverCard?: (space: PublicOccurrenceMap['spaces'][number]) => ReactNode;
  /** Selects this booth and moves the map to it whenever it changes. */
  locateId?: string;
  /**
   * Called once a locate request is done. Callers clear `locateId` here so a
   * remount (e.g. a `key` change) does not repeat it.
   */
  onLocated?: () => void;
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
  // An interactive card closes a moment after the pointer leaves the booth,
  // so the pointer can travel onto the card and use its link.
  const closing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const overCard = useRef(false);
  const keepOpen = () => {
    overCard.current = true;
    clearTimeout(closing.current);
  };
  const closeSoon = () => {
    clearTimeout(closing.current);
    closing.current = setTimeout(() => {
      if (!overCard.current) setHover(null);
    }, 200);
  };
  const leaveCard = () => {
    overCard.current = false;
    closeSoon();
  };
  useEffect(() => () => clearTimeout(closing.current), []);
  // A caller's card follows its booth while the map pans or zooms (a card
  // opened by `locateId` has no pointer on the booth to move it).
  const onViewChange = useCallback(() => {
    if (!renderHoverCard) return;
    setHover((current) => {
      const booth = current && canvas.current?.boxOf(current.id);
      if (!current || !booth) return current;
      const was = current.booth;
      return booth.x === was.x &&
        booth.y === was.y &&
        booth.width === was.width &&
        booth.height === was.height
        ? current
        : { id: current.id, booth };
    });
  }, [renderHoverCard]);
  const onHover = useCallback(
    (
      id: string | null,
      booth?: { x: number; y: number; width: number; height: number },
    ) => {
      if (renderHoverCard && !(id && booth)) {
        closeSoon();
        return;
      }
      clearTimeout(closing.current);
      overCard.current = false;
      setHover(id && booth ? { id, booth } : null);
    },
    [renderHoverCard],
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
  // A new locate request selects the booth and shows its area in this render;
  // the effect then moves the canvas to it. A request present at mount counts.
  const [located, setLocated] = useState<string>();
  if (locateId !== located) {
    setLocated(locateId);
    const target = definition.elements.find((e) => e.id === locateId);
    if (target) {
      setHighlight(target.id);
      setArea(target.areaId);
    }
  }
  useEffect(() => {
    if (!locateId) return;
    canvas.current?.locate(locateId);
    // With a caller's card, a located booth also opens its card, as if it
    // were pointed at. The box is read once the canvas has moved to it.
    if (!renderHoverCard || !spaces.some((s) => s.elementId === locateId)) {
      onLocated?.();
      return;
    }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const booth = canvas.current?.boxOf(locateId);
        if (booth) {
          clearTimeout(closing.current);
          overCard.current = false;
          setHover({ id: locateId, booth });
        }
        onLocated?.();
      });
    });
    return () => cancelAnimationFrame(frame);
    // Only a new locate request reopens the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateId]);
  return (
    <div className="ops-map">
      <div className="map-read-surface" ref={viewport}>
        <MapCanvas
          navigationEnd={
            <div style={{ marginLeft: 'auto' }}>
              <label>
                <Select
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
                </Select>
              </label>
            </div>
          }
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
          onViewChange={onViewChange}
          statuses={statuses}
          overlays={overlays}
          highlightedIds={highlightedIds}
        />
        {hoveredSpace && renderHoverCard && (
          <div
            key={hoveredSpace.elementId}
            className="booth-hover-card booth-hover-card-custom"
            ref={tip}
            style={{ left: position.x, top: position.y }}
            onPointerEnter={keepOpen}
            onPointerLeave={leaveCard}
            onFocus={keepOpen}
            onBlur={leaveCard}
          >
            {renderHoverCard(hoveredSpace)}
          </div>
        )}
        {hoveredSpace && !renderHoverCard && (
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
                {mapElementLabel(e)} ({Math.round(e.x)}, {Math.round(e.y)})
              </button>
            </li>
          ))}
        </ul>
      ) : showBoothList ? (
        <>
          <label className="ops-field">
            {boothCards ? 'Search booth' : 'Search Vendor or booth'}{' '}
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <ul
            className={
              boothCards
                ? 'attendance-record-grid'
                : `ops-map-list${boothListLimit ? ' ops-scroll-list' : ''}`
            }
            style={
              boothListLimit && !boothCards
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
                  {boothCards ? (
                    <button
                      type="button"
                      className={buttonClassName({ variant: 'disclosure' })}
                      onClick={() => choose(s.elementId)}
                    >
                      <span>
                        {s.label}
                        {s.vendor?.businessName
                          ? ` - ${s.vendor.businessName}`
                          : ''}
                      </span>
                      <span className={`booth-state ${status}`}>{status}</span>
                    </button>
                  ) : (
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
                        <p>
                          {s.vendor?.businessName ?? 'No business assigned'}
                        </p>
                        {s.vendor?.description && <p>{s.vendor.description}</p>}
                        {overlays[s.elementId] && (
                          <p>{overlays[s.elementId]}</p>
                        )}
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
                  )}
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
