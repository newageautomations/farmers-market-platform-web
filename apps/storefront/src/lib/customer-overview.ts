import type { CustomerDashboardLayout } from '@market/api';
import {
  defaultGridLayout,
  normalizeGridLayout,
  type DashboardWidgetInfo,
} from '@market/ui/dashboard-layout';

/**
 * Customer Overview sections with their default cells and size limits on the
 * shared 8-column dashboard grid (one row is GRID_ROW pixels). The layout is
 * a per-account presentation preference; every section's data is read by
 * the page under the customer's own session.
 */
export const overviewWidgets = [
  {
    id: 'glance',
    label: 'At a glance',
    description: 'Orders, pickups, followed markets and favorite vendors.',
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
    id: 'next-market',
    label: 'Next market',
    description: 'Your next market date and what else is coming up.',
    x: 0,
    y: 1,
    w: 4,
    h: 2,
    minW: 3,
    maxW: 8,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'pickups',
    label: 'Ready for pickup',
    description: 'Orders you still need to collect.',
    x: 4,
    y: 1,
    w: 4,
    h: 2,
    minW: 2,
    maxW: 6,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'recent-orders',
    label: 'Recent orders',
    description: 'Your latest orders with store, total and status.',
    x: 0,
    y: 3,
    w: 5,
    h: 2,
    minW: 3,
    maxW: 8,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'rewards',
    label: 'Loyalty rewards',
    description: 'Points with each vendor and your next reward.',
    x: 5,
    y: 3,
    w: 3,
    h: 2,
    minW: 2,
    maxW: 4,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'markets',
    label: 'Followed markets',
    description: 'The markets you follow and their next dates.',
    x: 0,
    y: 5,
    w: 4,
    h: 2,
    minW: 2,
    maxW: 6,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'vendors',
    label: 'Favorite vendors',
    description: 'Your favorite vendors and where they sell next.',
    x: 4,
    y: 5,
    w: 4,
    h: 2,
    minW: 2,
    maxW: 6,
    minH: 2,
    maxH: 3,
  },
] as const satisfies readonly DashboardWidgetInfo[];
export type OverviewWidgetId = (typeof overviewWidgets)[number]['id'];
/** Full-width bands whose height follows their content. */
export const overviewBands: readonly string[] = ['glance'];

export const defaultOverviewLayout: CustomerDashboardLayout =
  defaultGridLayout(overviewWidgets);
export function normalizeOverviewLayout(
  value: Partial<CustomerDashboardLayout> | null | undefined,
): CustomerDashboardLayout {
  return normalizeGridLayout(value, overviewWidgets);
}
