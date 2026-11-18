import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Alert, Button, Dialog, IconButton, UtilityIcon } from './index';
import {
  GRID_COLUMNS,
  GRID_GAP,
  GRID_ROW,
  bottom,
  compact,
  freeCell,
  moveItem,
  order,
  cornerResize,
  resizeItem,
  resizeTo,
  clampItem,
  overlaps,
  type GridCorner,
  type GridItem,
  type GridLimits,
} from './dashboard-grid';

/** A dashboard section: its default cell and size limits, in grid units. */
export interface DashboardWidgetInfo extends GridLimits {
  id: string;
  label: string;
  description?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A saved arrangement: reading order, hidden sections and grid cells.
 * Dashboards may carry further preferences (the vendor reporting period),
 * which the editor passes through unchanged.
 */
export interface DashboardLayoutValue {
  order: string[];
  hidden: string[];
  grid?: GridItem[];
}

/** Visible cells settled under gravity; hidden cells keep only their size. */
export function settleGrid(
  grid: readonly GridItem[],
  hidden: readonly string[],
) {
  const visible = compact(grid.filter((item) => !hidden.includes(item.id)));
  const end = bottom(visible);
  return [
    ...visible,
    ...grid
      .filter((item) => hidden.includes(item.id))
      .map((item) => ({ ...item, x: 0, y: end })),
  ];
}

/**
 * Accept only known widgets and valid cells from a saved value. Sizes are
 * clamped to each widget's limits; overlaps settle under gravity; widgets
 * missing from the saved grid take their default cell when it is free, or
 * the first free cell below. Layouts saved before the grid existed start
 * from the default grid.
 */
export function normalizeGridLayout(
  value: Partial<DashboardLayoutValue> | null | undefined,
  widgets: readonly DashboardWidgetInfo[],
): DashboardLayoutValue {
  const known = new Set(widgets.map((w) => w.id));
  const limits = (id: string) => widgets.find((w) => w.id === id)!;
  const source = value && typeof value === 'object' ? value : {};
  const hidden = Array.isArray(source.hidden)
    ? source.hidden.filter(
        (id, i, all): id is string =>
          typeof id === 'string' && known.has(id) && all.indexOf(id) === i,
      )
    : [];
  const saved = Array.isArray(source.grid) ? source.grid : [];
  const cells: GridItem[] = [];
  for (const cell of saved) {
    if (
      !cell ||
      typeof cell !== 'object' ||
      !known.has(cell.id) ||
      cells.some((c) => c.id === cell.id) ||
      ![cell.x, cell.y, cell.w, cell.h].every(Number.isFinite)
    )
      continue;
    cells.push(clampItem(cell, limits(cell.id)));
  }
  const fresh = !cells.length;
  for (const widget of widgets) {
    if (cells.some((c) => c.id === widget.id)) continue;
    const cell = {
      id: widget.id,
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h,
    };
    const visible = cells.filter((c) => !hidden.includes(c.id));
    cells.push(
      fresh || !visible.some((c) => overlaps(c, cell))
        ? cell
        : { ...cell, ...freeCell(visible, cell.w, cell.h, GRID_COLUMNS) },
    );
  }
  const grid = settleGrid(cells, hidden);
  return { order: order(grid).map((item) => item.id), hidden, grid };
}

/**
 * Splits settled cells into full-width content-height bands and the grid
 * runs between them. Bands span every column, so no grid cell shares their
 * rows; each run keeps its rows relative to its own top.
 */
export function dashboardSections(
  cells: readonly GridItem[],
  bands: readonly string[],
) {
  const result: Array<
    | { band: GridItem; cells?: undefined; top?: undefined }
    | { band?: undefined; cells: GridItem[]; top: number }
  > = [];
  for (const cell of [...cells].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const last = result[result.length - 1];
    if (bands.includes(cell.id)) result.push({ band: cell });
    else if (last && !last.band) last.cells.push(cell);
    else result.push({ cells: [cell], top: cell.y });
  }
  return result;
}

/** The default arrangement for a widget registry. */
export function defaultGridLayout(
  widgets: readonly DashboardWidgetInfo[],
): DashboardLayoutValue {
  const grid = widgets.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }));
  return { order: grid.map((item) => item.id), hidden: [], grid };
}

interface Drag {
  id: string;
  /** Moving the whole card, or resizing from one corner. */
  mode: 'move' | GridCorner;
  pointerX: number;
  pointerY: number;
  origin: GridItem;
  start: GridItem[];
  dx: number;
  dy: number;
}

/**
 * Layout editor (moved from the vendor dashboard and given a widget
 * registry, so the vendor and customer dashboards share it): the dashboard's 8-column grid at a reduced scale. Sections
 * are dragged to a new cell, resized from any corner (pushing
 * or squeezing neighbours) and hidden or added back. Arrow keys move a
 * focused section; Shift with arrow keys resizes it. A feature composition of
 * the shared Dialog, Button and IconButton with pointer events; no grid
 * library is introduced.
 */
export function DashboardLayoutEditor<L extends DashboardLayoutValue>({
  layout,
  widgets,
  defaultLayout,
  normalize,
  conditional = [],
  title = 'Customize dashboard',
  description = 'Drag sections to move them and drag a corner to resize. Neighbouring sections move or narrow to make room. Changes apply to your account.',
  pageWidth = 1100,
  available,
  onClose,
  onSave,
}: {
  layout: L;
  /** The dashboard's widget registry (labels, default cells, size limits). */
  widgets: readonly DashboardWidgetInfo[];
  /** Arrangement restored by Reset to default. */
  defaultLayout: L;
  /** The dashboard's own normalizer for saved values. */
  normalize: (layout: L) => L;
  /** Sections shown only when they have something to show (dashed outline). */
  conditional?: readonly string[];
  title?: string;
  description?: string;
  /** Rendered width of the page grid, so cards keep the page's proportions. */
  pageWidth?: number;
  available: (widget: string) => boolean;
  onClose: () => void;
  onSave: (layout: L) => Promise<void>;
}) {
  const widgetInfo = (id: string) => widgets.find((w) => w.id === id)!;
  const widgetLimits = (id: string): GridLimits => widgetInfo(id);
  const describe = (cell: GridItem) =>
    `${widgetInfo(cell.id).label}: ${cell.w} columns wide and ${cell.h} rows tall, at column ${cell.x + 1}, row ${cell.y + 1}.`;
  const formId = useId();
  const saved = useMemo(() => normalize(layout), [layout, normalize]);
  const visibleFrom = (value: L) =>
    compact(
      (value.grid ?? []).filter(
        (cell) => available(cell.id) && !value.hidden.includes(cell.id),
      ),
    );
  const [items, setItems] = useState(() => visibleFrom(saved));
  const [hidden, setHidden] = useState(() =>
    saved.hidden.filter((id) => available(id)),
  );
  const [drag, setDrag] = useState<Drag>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const frame = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(900);
  // Rows shown while editing: the layout plus room to drop below it, fixed
  // for the session so the scale does not jump while dragging.
  const [rows] = useState(() => bottom(visibleFrom(saved)) + 1);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => setFrameWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Fit the page's width, or less when the page is taller than the room
  // left in the viewport, but never below a size that stays usable.
  const pageHeight = rows * (GRID_ROW + GRID_GAP);
  const room = Math.max(
    300,
    (typeof window === 'undefined' ? 900 : window.innerHeight) - 290,
  );
  const scale = Math.max(
    Math.min(frameWidth / pageWidth, 0.4),
    Math.min(frameWidth / pageWidth, room / pageHeight),
  );
  const width = pageWidth * scale,
    gap = GRID_GAP * scale,
    rowHeight = GRID_ROW * scale,
    column = (width - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const box = (cell: GridItem) => ({
    left: cell.x * (column + gap),
    top: cell.y * (rowHeight + gap),
    width: cell.w * column + (cell.w - 1) * gap,
    height: cell.h * rowHeight + (cell.h - 1) * gap,
  });
  const height = Math.max(rows, bottom(items) + 1) * (rowHeight + gap) - gap;

  function begin(
    event: ReactPointerEvent<HTMLElement>,
    id: string,
    mode: Drag['mode'],
  ) {
    if (busy || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const origin = items.find((item) => item.id === id)!;
    const state: Drag = {
      id,
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      origin,
      start: items,
      dx: 0,
      dy: 0,
    };
    setDrag(state);
    const move = (e: PointerEvent) => {
      const dx = e.clientX - state.pointerX,
        dy = e.clientY - state.pointerY;
      const stepX = column + gap,
        stepY = rowHeight + gap;
      setDrag({ ...state, dx, dy });
      setItems(
        mode === 'move'
          ? moveItem(
              state.start,
              id,
              Math.round(origin.x + dx / stepX),
              Math.round(origin.y + dy / stepY),
            )
          : resizeTo(
              state.start,
              cornerResize(
                origin,
                mode,
                Math.round(dx / stepX),
                Math.round(dy / stepY),
                widgetLimits(id),
              ),
              widgetLimits,
            ),
      );
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      setDrag(undefined);
      setItems((current) => {
        const cell = current.find((item) => item.id === id);
        if (cell) setAnnouncement(describe(cell));
        return compact(current);
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  function keyboard(event: KeyboardEvent<HTMLElement>, cell: GridItem) {
    const delta = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!delta || busy) return;
    event.preventDefault();
    const [dx, dy] = delta as [number, number];
    const next = compact(
      event.shiftKey
        ? resizeItem(items, cell.id, cell.w + dx, cell.h + dy, widgetLimits)
        : moveItem(items, cell.id, cell.x + dx, cell.y + dy),
    );
    setItems(next);
    const moved = next.find((item) => item.id === cell.id);
    if (moved) setAnnouncement(describe(moved));
  }

  function hide(id: string) {
    setItems((current) => compact(current.filter((item) => item.id !== id)));
    setHidden((current) => [...current, id]);
    setAnnouncement(`${widgetInfo(id).label} hidden.`);
  }
  function show(id: string) {
    const size = saved.grid?.find((cell) => cell.id === id) ?? widgetInfo(id);
    setItems((current) =>
      compact([
        ...current,
        { id, w: size.w, h: size.h, ...freeCell(current, size.w, size.h) },
      ]),
    );
    setHidden((current) => current.filter((item) => item !== id));
    setAnnouncement(`${widgetInfo(id).label} added.`);
  }
  function reset() {
    const value = normalize(defaultLayout);
    setItems(visibleFrom(value));
    setHidden([]);
    setAnnouncement('Default layout restored.');
  }

  const dragged = drag && items.find((item) => item.id === drag.id);
  return (
    <Dialog
      open
      size="wide"
      className="vendor-dashboard-editor-dialog"
      title={title}
      description={description}
      busy={busy}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" disabled={busy} onClick={reset}>
            Reset to default
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Save layout
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          // Unavailable sections keep their saved cells and visibility.
          const keep = (saved.grid ?? []).filter(
            (cell) => !items.some((item) => item.id === cell.id),
          );
          try {
            await onSave({
              ...saved,
              order: order(items).map((item) => item.id),
              hidden: [
                ...hidden,
                ...saved.hidden.filter((id) => !available(id)),
              ],
              grid: [...items, ...keep],
            });
            onClose();
          } catch {
            setError('Your layout could not be saved. Try again.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <Alert severity="error">{error}</Alert>}
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <div className="vendor-dashboard-editor-frame" ref={frame}>
          <div
            className="vendor-dashboard-editor"
            data-dragging={drag ? drag.mode : undefined}
            style={
              {
                width,
                height,
                '--editor-column': `${column}px`,
                '--editor-gap': `${gap}px`,
                '--editor-row': `${rowHeight}px`,
              } as CSSProperties
            }
          >
            {dragged && (
              <div
                className="vendor-dashboard-editor-placeholder"
                aria-hidden="true"
                style={box(dragged)}
              />
            )}
            {items.map((cell) => {
              const info = widgetInfo(cell.id);
              const active = drag?.id === cell.id;
              const position = box(cell);
              const style: CSSProperties = active
                ? drag.mode === 'move'
                  ? {
                      ...box(drag.origin),
                      left: box(drag.origin).left + drag.dx,
                      top: box(drag.origin).top + drag.dy,
                    }
                  : followCorner(
                      box(drag.origin),
                      { mode: drag.mode, dx: drag.dx, dy: drag.dy },
                      column,
                      rowHeight,
                    )
                : position;
              const fixed = info.minW === info.maxW && info.minH === info.maxH;
              return (
                <div
                  key={cell.id}
                  className="vendor-dashboard-editor-card"
                  data-active={active || undefined}
                  data-conditional={conditional.includes(cell.id) || undefined}
                  style={style}
                  tabIndex={0}
                  role="group"
                  aria-roledescription="movable section"
                  aria-label={`${info.label}. ${describe(cell)} Arrow keys move it${fixed ? '' : '; Shift and arrow keys resize it'}.`}
                  onPointerDown={(event) => begin(event, cell.id, 'move')}
                  onKeyDown={(event) => keyboard(event, cell)}
                >
                  <strong>{info.label}</strong>
                  <small>
                    {cell.w} × {cell.h}
                    {cell.id === 'urgent' && ' · shown only when needed'}
                  </small>
                  <span
                    className="vendor-dashboard-editor-hide"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <IconButton
                      icon="close"
                      label={`Hide ${info.label}`}
                      size="compact"
                      disabled={busy}
                      onClick={() => hide(cell.id)}
                    />
                  </span>
                  {!fixed &&
                    corners.map((corner) => (
                      <span
                        key={corner}
                        className="vendor-dashboard-editor-resize"
                        data-corner={corner}
                        aria-hidden="true"
                        onPointerDown={(event) => begin(event, cell.id, corner)}
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </div>
        {hidden.length > 0 && (
          <div className="vendor-dashboard-preview-hidden">
            <h3>Hidden sections</h3>
            <ul>
              {hidden.map((id) => (
                <li key={id}>
                  <Button
                    variant="secondary"
                    size="compact"
                    disabled={busy}
                    onClick={() => show(id)}
                  >
                    <UtilityIcon name="plus" />
                    {widgetInfo(id).label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </Dialog>
  );
}

const corners: GridCorner[] = ['nw', 'ne', 'sw', 'se'];

/** The card's outline while a corner is dragged; the opposite corner stays. */
function followCorner(
  origin: { left: number; top: number; width: number; height: number },
  drag: { mode: Drag['mode']; dx: number; dy: number },
  minWidth: number,
  minHeight: number,
): CSSProperties {
  const west = drag.mode.endsWith('w'),
    north = drag.mode.startsWith('n');
  const width = Math.max(minWidth, origin.width + (west ? -drag.dx : drag.dx));
  const height = Math.max(
    minHeight,
    origin.height + (north ? -drag.dy : drag.dy),
  );
  return {
    width,
    height,
    left: west ? origin.left + origin.width - width : origin.left,
    top: north ? origin.top + origin.height - height : origin.top,
  };
}
