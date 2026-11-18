import {
  createContext,
  forwardRef,
  useId,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Badge, IconButton } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  type FarmstandIconName,
} from '@market/ui/farmstand';
import {
  dashboardSections,
  type DashboardWidgetInfo,
} from '@market/ui/dashboard-layout';
import type { GridItem } from '@market/ui/dashboard-grid';
import { go } from './vendor/common';

/**
 * Admin dashboard pieces shared by the vendor Dashboard and the Market
 * Overview (extracted unchanged from `VendorDashboard`): the grid renderer,
 * panel header, in-app link, urgent request band and date tile. Both
 * dashboards compose the shared `@market/ui/dashboard-layout` grid and editor.
 */

/** The cell a widget occupies, in grid units, for size-aware content. */
export const WidgetSize = createContext<GridItem>({
  id: '',
  x: 0,
  y: 0,
  w: 4,
  h: 2,
});

/** Workspace links stay in the app; modified clicks keep native behavior. */
export function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const url = new URL(event.currentTarget.href);
  if (
    url.origin !== window.location.origin ||
    !/^\/(vendor|market)\//.test(url.pathname)
  )
    return;
  event.preventDefault();
  go(url.pathname + url.search + url.hash);
}

/** In-app link with the shared Farmstand action presentation. */
export function DashboardLink({
  href,
  children,
  variant = 'secondary',
  appearance,
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary';
  appearance?: 'button' | 'text';
}) {
  return (
    <FarmstandLink
      href={href}
      variant={variant}
      appearance={appearance}
      onClick={navigate}
    >
      {children}
    </FarmstandLink>
  );
}

export function PanelHeader({
  id,
  title,
  link,
  children,
}: {
  id: string;
  title: string;
  link?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="finance-card-header vendor-dashboard-panel-header">
      <h2 id={id}>{title}</h2>
      {children}
      {link && (
        <DashboardLink href={link.href} appearance="text">
          {link.label}
          <FarmstandIcon name="arrow-right" />
        </DashboardLink>
      )}
    </div>
  );
}

export interface DashboardUrgentItem {
  id: string;
  tone: 'danger' | 'warning' | 'info';
  icon: FarmstandIconName;
  title: string;
  detail: string;
  href: string;
}

export function UrgentRequests({
  items,
  title = 'Urgent requests',
  dismissalScope,
}: {
  items: readonly DashboardUrgentItem[];
  title?: string;
  dismissalScope?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const storageKey = `overview-dismissed:${dismissalScope}`;
  const [dismissed, setDismissed] = useState<Record<string, string>>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
      return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
    } catch {
      return {};
    }
  });
  const fingerprint = (item: DashboardUrgentItem) =>
    JSON.stringify([
      item.title,
      item.detail,
      item.href,
      new Date().toLocaleDateString('en-CA'),
    ]);
  const active = items.filter(
    (item) => dismissed[item.id] !== fingerprint(item),
  );
  const hidden = items.length - active.length;
  function persist(next: Record<string, string>) {
    setDismissed(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Dismissal still works for this visit. */
    }
  }
  const id = useId();
  if (items.length === 0) return null;
  const visible = expanded ? active : active.slice(0, 4);
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-urgent"
      aria-labelledby={id}
    >
      <div className="finance-card-header vendor-dashboard-panel-header">
        <h2 id={id}>
          <FarmstandIcon name="triangle-alert" />
          {title}
          <Badge tone="danger">{active.length}</Badge>
        </h2>
        {hidden > 0 && (
          <FarmstandButton
            variant="tertiary"
            size="compact"
            onClick={() => persist({})}
          >
            Restore dismissed alerts ({hidden})
          </FarmstandButton>
        )}
        {active.length > 4 && (
          <FarmstandButton
            variant="tertiary"
            size="compact"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Show fewer' : `View all ${active.length}`}
          </FarmstandButton>
        )}
      </div>
      <ul className="vendor-dashboard-urgent-list">
        {visible.map((item) => (
          <li
            key={item.id}
            className={
              dismissalScope && item.title.endsWith('expiring soon')
                ? 'vendor-dashboard-urgent-dismissible'
                : undefined
            }
          >
            <a
              href={item.href}
              onClick={navigate}
              className="vendor-dashboard-urgent-card"
              data-tone={item.tone}
            >
              <span className="vendor-dashboard-urgent-icon">
                <FarmstandIcon name={item.icon} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <FarmstandIcon name="chevron-right" />
            </a>
            {dismissalScope && item.title.endsWith('expiring soon') && (
              <span className="vendor-dashboard-urgent-dismiss">
                <IconButton
                  icon="close"
                  variant="secondary"
                  label={`Dismiss ${item.title}`}
                  onClick={() =>
                    persist({ ...dismissed, [item.id]: fingerprint(item) })
                  }
                />
              </span>
            )}
          </li>
        ))}
      </ul>
    </FarmstandPanel>
  );
}

/** Month, day and weekday of a market date, in its own time zone. */
export function DateTile({
  startsAt,
  timezone,
}: {
  startsAt: string;
  timezone?: string;
}) {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Date(startsAt).toLocaleDateString(undefined, {
      ...options,
      timeZone: timezone,
    });
  return (
    <div
      className="markets-next-art vendor-dashboard-date-tile"
      aria-hidden="true"
    >
      <span>{part({ month: 'short' })}</span>
      <strong>{part({ day: 'numeric' })}</strong>
      <span>{part({ weekday: 'long' })}</span>
    </div>
  );
}

/**
 * The settled dashboard cells: full-width bands, and grid runs whose cells
 * take their column, row and size from CSS variables. Each widget reads its
 * own cell through `WidgetSize`.
 */
export const DashboardCells = forwardRef<
  HTMLDivElement,
  {
    cells: readonly GridItem[];
    bands: readonly string[];
    widgets: Record<string, ReactNode>;
  }
>(function DashboardCells({ cells, bands, widgets }, ref) {
  return (
    <div className="vendor-dashboard-stack" ref={ref}>
      {dashboardSections(cells, bands).map((section) =>
        section.band ? (
          <div
            key={section.band.id}
            className="vendor-dashboard-band"
            data-widget={section.band.id}
          >
            <WidgetSize.Provider value={section.band}>
              {widgets[section.band.id]}
            </WidgetSize.Provider>
          </div>
        ) : (
          <div key={section.cells[0]!.id} className="vendor-dashboard-grid">
            {section.cells.map((cell) => (
              <div
                key={cell.id}
                className="vendor-dashboard-widget"
                data-widget={cell.id}
                data-w={cell.w}
                data-h={cell.h}
                style={
                  {
                    '--x': cell.x + 1,
                    '--y': cell.y - section.top + 1,
                    '--w': cell.w,
                    '--h': cell.h,
                    // Two-column (tablet) layout: wide sections take both columns.
                    '--wn': cell.w >= 4 ? 2 : 1,
                  } as CSSProperties
                }
              >
                <WidgetSize.Provider value={cell}>
                  {widgets[cell.id]}
                </WidgetSize.Provider>
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
});

export type { DashboardWidgetInfo };
