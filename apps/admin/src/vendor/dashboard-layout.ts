import { useCallback, useEffect, useState } from 'react';
import type { VendorDashboardLayout } from '@market/api';
import type { VendorService } from './service';
import type { DashboardPeriod } from './dashboard-data';
import {
  GRID_COLUMNS,
  bottom,
  clampItem,
  compact,
  freeCell,
  order,
  overlaps,
  type GridItem,
  type GridLimits,
} from './dashboard-grid';

interface DashboardWidget extends GridLimits {
  id: string;
  label: string;
  description: string;
  /** Default cell on the 8-column grid, in grid units. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Dashboard widgets with their default cells and size limits, in grid units
 * (8 columns; one row is GRID_ROW pixels). Square charts stop at half width.
 */
export const dashboardWidgets = [
  {
    id: 'urgent',
    label: 'Urgent requests',
    description: 'Appears only when something needs your attention.',
    x: 0,
    y: 0,
    w: 8,
    h: 1,
    minW: 8,
    maxW: 8,
    minH: 1,
    maxH: 1,
  },
  {
    id: 'kpis',
    label: 'Key metrics',
    description: 'Orders, revenue, profit, customers and upcoming markets.',
    x: 0,
    y: 1,
    w: 8,
    h: 1,
    minW: 8,
    maxW: 8,
    minH: 1,
    maxH: 1,
  },
  {
    id: 'next-market',
    label: 'Next upcoming market',
    description: 'Your next market date, booth and attendance.',
    x: 0,
    y: 2,
    w: 4,
    h: 2,
    minW: 3,
    maxW: 8,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'this-week',
    label: 'This week',
    description: 'Attendance, packing and payments due in the next 7 days.',
    x: 4,
    y: 2,
    w: 2,
    h: 2,
    minW: 2,
    maxW: 4,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'recent-orders',
    label: 'Recent orders',
    description: 'The latest orders with customer, total and date.',
    x: 6,
    y: 2,
    w: 2,
    h: 2,
    minW: 2,
    maxW: 4,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'sales-trend',
    label: 'Sales over time',
    description: 'Gross sales for the period.',
    x: 0,
    y: 4,
    w: 4,
    h: 2,
    minW: 3,
    maxW: 8,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'sales-channel',
    label: 'Sales by channel',
    description: 'Market preorders, in-person and online sales.',
    x: 4,
    y: 4,
    w: 2,
    h: 2,
    minW: 2,
    maxW: 4,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'sales-market',
    label: 'Sales by market',
    description: 'Gross sales attributed to each market.',
    x: 6,
    y: 4,
    w: 2,
    h: 2,
    minW: 2,
    maxW: 4,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'top-products',
    label: 'Top selling products',
    description: 'Best sellers by units sold.',
    x: 0,
    y: 6,
    w: 4,
    h: 2,
    minW: 2,
    maxW: 6,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'customers',
    label: 'Top customers',
    description: 'Customers ranked by spending in the period.',
    x: 4,
    y: 6,
    w: 4,
    h: 2,
    minW: 2,
    maxW: 6,
    minH: 2,
    maxH: 3,
  },
] as const satisfies readonly DashboardWidget[];
export type DashboardWidgetId = (typeof dashboardWidgets)[number]['id'];
const known = new Set<string>(dashboardWidgets.map((w) => w.id));
const periods: DashboardPeriod[] = ['7', '30', '90'];

/**
 * Full-width bands whose page height follows their content (the cards they
 * show) rather than grid rows; the editor still draws them one row tall.
 */
export const contentHeightWidgets: readonly string[] = ['urgent', 'kpis'];

export function widgetInfo(id: string) {
  return dashboardWidgets.find((w) => w.id === id)!;
}
export const widgetLimits = (id: string): GridLimits => widgetInfo(id);

const defaultGrid: GridItem[] = dashboardWidgets.map(({ id, x, y, w, h }) => ({
  id,
  x,
  y,
  w,
  h,
}));
export const defaultLayout: VendorDashboardLayout = {
  order: defaultGrid.map((item) => item.id),
  hidden: [],
  period: '30',
  grid: defaultGrid,
};

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
export function normalizeLayout(
  value: Partial<VendorDashboardLayout> | null | undefined,
): VendorDashboardLayout {
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
    cells.push(clampItem(cell, widgetLimits(cell.id)));
  }
  const fresh = !cells.length;
  for (const widget of dashboardWidgets) {
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
  return {
    order: order(grid).map((item) => item.id),
    hidden,
    grid,
    period: periods.includes(source.period as DashboardPeriod)
      ? (source.period as DashboardPeriod)
      : defaultLayout.period,
  };
}

/** Saved arrangement for this account; the default applies until it loads. */
export function useDashboardLayout(service: VendorService) {
  const api = service.dashboardLayout;
  const [layout, setLayout] = useState(() => normalizeLayout(defaultLayout));
  const [loaded, setLoaded] = useState(!api);
  useEffect(() => {
    if (!api) return;
    let current = true;
    api
      .read()
      .then((value) => {
        if (current) setLayout(normalizeLayout(value));
      })
      .catch(() => {
        /* An unreadable preference falls back to the default arrangement. */
      })
      .finally(() => {
        if (current) setLoaded(true);
      });
    return () => {
      current = false;
    };
  }, [api]);
  const save = useCallback(
    async (next: VendorDashboardLayout) => {
      const value = normalizeLayout(next);
      setLayout(value);
      await api?.save(value);
    },
    [api],
  );
  return { layout, loaded, save };
}
