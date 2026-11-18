import { useCallback, useEffect, useState } from 'react';
import type { MarketDashboardLayout } from '@market/api';
import {
  defaultGridLayout,
  normalizeGridLayout,
  type DashboardWidgetInfo,
} from '@market/ui/dashboard-layout';
import type { MarketService } from './service';

interface DashboardWidget extends DashboardWidgetInfo {
  description: string;
}

/**
 * Market Overview sections with their default cells and size limits, in
 * grid units (the shared 8-column dashboard grid; one row is GRID_ROW
 * pixels). Shares the vendor and customer dashboard grid and editor.
 */
export const managerDashboardWidgets = [
  {
    id: 'urgent',
    label: 'Needs attention',
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
    description:
      'Next market, open booths, invoices due, applications and vendors.',
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
    label: 'Next market',
    description: 'The next market date, its booths and the dates after it.',
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
    id: 'booths',
    label: 'Booth availability',
    description: 'Open, assigned and paid booths for the next market.',
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
    id: 'checklist',
    label: 'Market day checklist',
    description: 'What is still open before the next market.',
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
    id: 'applications',
    label: 'New applications',
    description: 'Submitted applications waiting for your review.',
    x: 0,
    y: 4,
    w: 4,
    h: 2,
    minW: 2,
    maxW: 8,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'invoices',
    label: 'Invoices awaiting payment',
    description: 'Open and past-due booth invoices.',
    x: 4,
    y: 4,
    w: 4,
    h: 2,
    minW: 2,
    maxW: 8,
    minH: 2,
    maxH: 3,
  },
  {
    id: 'compliance',
    label: 'Vendor documents',
    description: 'Document readiness, reviews and expirations.',
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
    id: 'vendors',
    label: 'Vendor requests',
    description: 'Vendors asking to join your market.',
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
export type ManagerWidgetId = (typeof managerDashboardWidgets)[number]['id'];

/** Full-width bands whose page height follows their content. */
export const managerBandWidgets: readonly string[] = ['urgent', 'kpis'];

export const defaultManagerLayout: MarketDashboardLayout = defaultGridLayout(
  managerDashboardWidgets,
);

/** Accept only known sections and valid cells from a saved value. */
export function normalizeManagerLayout(
  value: Partial<MarketDashboardLayout> | null | undefined,
): MarketDashboardLayout {
  return normalizeGridLayout(value, managerDashboardWidgets);
}

/** Saved arrangement for this account; the default applies until it loads. */
export function useManagerDashboardLayout(service: MarketService) {
  const api = service.dashboardLayout;
  const [layout, setLayout] = useState(() =>
    normalizeManagerLayout(defaultManagerLayout),
  );
  const [loaded, setLoaded] = useState(!api);
  useEffect(() => {
    if (!api) return;
    let current = true;
    api
      .read()
      .then((value) => {
        if (current) setLayout(normalizeManagerLayout(value));
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
    async (next: MarketDashboardLayout) => {
      const value = normalizeManagerLayout(next);
      setLayout(value);
      await api?.save(value);
    },
    [api],
  );
  return { layout, loaded, save };
}
