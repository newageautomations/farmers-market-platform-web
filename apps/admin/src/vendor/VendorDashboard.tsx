import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { hasPermission } from '@market/auth';
import { mayCommand } from '@market/admin-core';
import { formatMoney } from '@market/config';
import type {
  FinanceOrderTransaction,
  FinanceReport,
  PackingView,
} from '@market/api';
import { Badge, EmptyState, Field, UtilityIcon } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSelect,
} from '@market/ui/farmstand';
import '@market/ui/farmstand.css';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { FinancialGraph, FinanceDonut } from '../finance/charts';
import { financeDates } from '../finance/finance-dates';
import '../finance/finance.css';
import '../finance/finance-workspace.css';
import './market-applications.css';
import { ReadState, useRead } from './common';
import { MarketsSummary } from './MarketsSummary';
import { navigate } from './MarketApplications';
import { AttendanceBadge } from './UpcomingMarketDates';
import { readCustomersWorkspace, customerName } from './customers-data';
import {
  dateAttendance,
  marketDate,
  marketTime,
  readBoothAssignments,
  readUpcomingMarketDates,
  type UpcomingMarketDate,
} from './markets-data';
import {
  applicationUrgencies,
  attendanceUrgencies,
  boothFeeUrgencies,
  customerActivity,
  dashboardPeriods,
  daysUntil,
  documentUrgencies,
  linkUrgencies,
  periodChange,
  readOrderCustomers,
  readPeriodCustomers,
  recentOrders,
  salesByChannel,
  salesByMarket,
  shiftDate,
  sortUrgent,
  topProducts,
  unknownCustomer,
  weekTasks,
  type DashboardPeriod,
  type PeriodCustomers,
  type PeriodChange,
  type UrgentItem,
} from './dashboard-data';
import {
  contentHeightWidgets,
  useDashboardLayout,
  type DashboardWidgetId,
} from './dashboard-layout';
import { compact, type GridItem } from './dashboard-grid';
import { DashboardLayoutEditor } from './DashboardLayoutEditor';
import type { VendorService } from './service';
import './vendor-dashboard.css';

type Read<T> = ReturnType<typeof useRead<T>>;
const DAY = 86400000;
/** The cell a widget occupies, in grid units, for size-aware content. */
const WidgetSize = createContext<GridItem>({ id: '', x: 0, y: 0, w: 4, h: 2 });
/**
 * Splits settled cells into full-width content-height bands and the grid
 * runs between them. Bands span every column, so no grid cell shares their
 * rows; each run keeps its rows relative to its own top.
 */
function sections(cells: readonly GridItem[]) {
  const result: Array<
    | { band: GridItem; cells?: undefined; top?: undefined }
    | { band?: undefined; cells: GridItem[]; top: number }
  > = [];
  for (const cell of [...cells].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const last = result[result.length - 1];
    if (contentHeightWidgets.includes(cell.id)) result.push({ band: cell });
    else if (last && !last.band) last.cells.push(cell);
    else result.push({ cells: [cell], top: cell.y });
  }
  return result;
}
/** Ranked rows that fit: two columns from four units wide, more when taller. */
function rankRows(cell: GridItem) {
  const perColumn = cell.h >= 3 ? 7 : 4;
  return cell.w >= 4 ? Math.min(12, perColumn * 2) : perColumn;
}
function relativeDay(date: string, now: number) {
  const days = daysUntil(date, now);
  return days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}

/** In-app link with the shared Farmstand action presentation. */
function DashboardLink({
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

function PanelHeader({
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

function Change({ change }: { change: PeriodChange }) {
  return (
    <small
      className={`vendor-dashboard-change vendor-dashboard-change-${change.tone}`}
    >
      {change.text}
    </small>
  );
}

/**
 * Vendor dashboard: the most important parts of the vendor workspace on one
 * page. Each widget reads independently under its own permission, so a
 * missing grant or failed read affects only that widget. The arrangement is
 * a per-account preference.
 */
export function VendorDashboard({ service }: { service: VendorService }) {
  const id = useId();
  const can = (permission: string) =>
    hasPermission(service.context.permissions, permission as never);
  const { layout, loaded, save } = useDashboardLayout(service);
  const [customizing, setCustomizing] = useState(false);
  const period = layout.period as DashboardPeriod;
  const now = useMemo(() => Date.now(), []);

  const finance = can('ReadOwnVendorFinance') ? service.finance : undefined;
  const readOptions = useCallback(() => finance!.options(), [finance]);
  const options = useRead('dashboard-finance-options', readOptions, !!finance);
  const scope = useMemo(() => {
    if (!options.data) return undefined;
    const timezone =
      options.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = financeDates(period, new Date(now), timezone);
    return {
      timezone,
      currency: options.data.currency || 'USD',
      market: 'ALL',
      current,
      previous: {
        from: shiftDate(current.from, -Number(period)),
        through: shiftDate(current.from, -1),
      },
    };
  }, [options.data, period, now]);
  const readCurrent = useCallback(
    () =>
      finance!.report({
        market: scope!.market,
        currency: scope!.currency,
        timezone: scope!.timezone,
        ...scope!.current,
      }),
    [finance, scope],
  );
  const readPrevious = useCallback(
    () =>
      finance!.report({
        market: scope!.market,
        currency: scope!.currency,
        timezone: scope!.timezone,
        ...scope!.previous,
      }),
    [finance, scope],
  );
  const report = useRead(
    'dashboard-report:' + JSON.stringify(scope?.current),
    readCurrent,
    !!scope,
    { retainPreviousData: true },
  );
  const previous = useRead(
    'dashboard-previous:' + JSON.stringify(scope?.previous),
    readPrevious,
    !!scope,
    { retainPreviousData: true },
  );

  const readCustomers = useCallback(
    () => readCustomersWorkspace(service),
    [service],
  );
  const customers = useRead(
    `dashboard-customers:${service.vendorId}`,
    readCustomers,
    can('ReadOwnCRM'),
  );
  const readDates = useCallback(
    () => readUpcomingMarketDates(service, now),
    [service, now],
  );
  const dates = useRead(
    `dashboard-dates:${service.vendorId}`,
    readDates,
    can('ReadOwnVendorIdentity'),
  );
  const readBooths = useCallback(
    () => readBoothAssignments(service),
    [service],
  );
  const booths = useRead(
    `dashboard-booths:${service.vendorId}`,
    readBooths,
    can('ReadOwnVendorIdentity'),
  );
  const documentsApi = can('ReadOwnDocuments') ? service.documents : undefined;
  const readDocuments = useCallback(() => documentsApi!.read(), [documentsApi]);
  const documents = useRead(
    `dashboard-documents:${service.vendorId}`,
    readDocuments,
    !!documentsApi,
  );
  const applicationsApi =
    service.applications &&
    mayCommand(service.context, 'ManageOwnMarketParticipation')
      ? service.applications
      : undefined;
  const readApplications = useCallback(
    () =>
      applicationsApi!.read({ vendorId: Number(service.vendorId), skip: 0 }),
    [applicationsApi, service.vendorId],
  );
  const applications = useRead(
    `dashboard-applications:${service.vendorId}`,
    readApplications,
    !!applicationsApi,
  );
  const linkApi = can('ReadOwnVendorIdentity')
    ? service.linkRequests
    : undefined;
  const readLinks = useCallback(() => linkApi!(), [linkApi]);
  const links = useRead(
    `dashboard-links:${service.vendorId}`,
    readLinks,
    !!linkApi,
  );
  const packingApi = can('ReadOwnOrders') ? service.packing : undefined;
  const weekDates = useMemo(
    () =>
      (dates.data?.dates ?? []).filter(
        (d) => Date.parse(d.occurrence.startsAt) - now < 7 * DAY,
      ),
    [dates.data, now],
  );
  const readPacking = useCallback(async () => {
    const views = new Map<string, PackingView>();
    const available = new Set(
      (await packingApi!.occurrences()).map((o) => String(o.id)),
    );
    for (const date of weekDates) {
      const occurrence = String(date.occurrence.id);
      if (available.has(occurrence) && !views.has(occurrence))
        views.set(occurrence, await packingApi!.read(Number(occurrence)));
    }
    return views;
  }, [packingApi, weekDates]);
  const packing = useRead(
    'dashboard-packing:' + weekDates.map((d) => d.key).join(','),
    readPacking,
    !!packingApi && !!dates.data && weekDates.length > 0,
  );

  const urgent = useMemo(
    () =>
      sortUrgent([
        ...(documents.data ? documentUrgencies(documents.data, now) : []),
        ...(dates.data ? attendanceUrgencies(dates.data.dates, now) : []),
        ...boothFeeUrgencies(booths.data, dates.data?.dates ?? []),
        ...(applications.data
          ? applicationUrgencies([
              ...applications.data.items,
              ...applications.data.drafts,
            ])
          : []),
        ...(links.data ? linkUrgencies(links.data) : []),
      ]),
    [
      documents.data,
      dates.data,
      booths.data,
      applications.data,
      links.data,
      now,
    ],
  );

  const recent = useMemo(
    () => (report.data ? recentOrders(report.data, 9) : []),
    [report.data],
  );
  const since = scope?.current.from ?? financeDates(period).from;
  const currency = scope?.currency ?? 'USD';
  const readSpending = useCallback(
    () => readPeriodCustomers(service, customers.data!, since, currency),
    [service, customers.data, since, currency],
  );
  const spending = useRead(
    `dashboard-spending:${service.vendorId}:${since}:${currency}`,
    readSpending,
    !!customers.data && (!finance || !!scope),
  );
  const readNames = useCallback(
    () =>
      readOrderCustomers(
        service,
        report.data!,
        recent,
        spending.data?.orderNames,
      ),
    [service, report.data, recent, spending.data],
  );
  const orderCustomers = useRead(
    'dashboard-order-customers:' + recent.map((o) => o.id).join(','),
    readNames,
    recent.length > 0 &&
      (!can('ReadOwnCRM') ||
        !!spending.data ||
        !!spending.error ||
        !!customers.error),
  );

  const marketName = useCallback(
    (marketId: string) =>
      options.data?.markets.find((m) => m.id === marketId)?.name,
    [options.data],
  );
  const money = (value: number) => formatMoney(value, scope?.currency ?? 'USD');
  const periodLabel =
    dashboardPeriods.find(([value]) => value === period)?.[1] ?? '';

  const widgets: Record<DashboardWidgetId, ReactNode> = {
    urgent: <UrgentRequests items={urgent} />,
    kpis: (
      <KeyMetrics
        period={period}
        report={finance ? report : undefined}
        previous={previous}
        customers={can('ReadOwnCRM') ? customers : undefined}
        dates={dates}
        money={money}
        since={scope?.current.from}
        previousSince={scope?.previous.from}
        now={now}
      />
    ),
    'next-market': <NextMarket dates={dates} now={now} />,
    'this-week': (
      <ThisWeek dates={dates} packing={packing} urgent={urgent} now={now} />
    ),
    'sales-trend': finance && (
      <SalesTrend report={report} period={period} id={id + '-trend'} />
    ),
    'sales-channel': finance && (
      <DonutPanel
        id={id + '-channel'}
        title="Sales by channel"
        report={report}
        currency={scope?.currency}
        items={(r) => salesByChannel(r)}
        empty="No sales in this period"
      />
    ),
    'sales-market': finance && (
      <DonutPanel
        id={id + '-market'}
        title="Sales by market"
        report={report}
        currency={scope?.currency}
        items={(r) => salesByMarket(r, marketName)}
        empty="No sales in this period"
      />
    ),
    customers: can('ReadOwnCRM') && (
      <TopCustomers
        id={id + '-customers'}
        customers={customers}
        spending={spending}
        money={money}
        period={period}
      />
    ),
    'recent-orders': finance && (
      <RecentOrders
        id={id + '-orders'}
        report={report}
        orders={recent}
        names={orderCustomers}
        money={money}
      />
    ),
    'top-products': finance && (
      <TopProducts id={id + '-products'} report={report} money={money} />
    ),
  };
  const grid = useRef<HTMLDivElement>(null);
  const present = (widget: string) =>
    !!widgets[widget as DashboardWidgetId] &&
    (widget !== 'urgent' || urgent.length > 0);
  // Sections that are hidden, unavailable or empty leave no hole: the rest
  // settle upward under the grid's gravity.
  const cells = compact(
    (layout.grid ?? []).filter(
      (cell) => !layout.hidden.includes(cell.id) && present(cell.id),
    ),
  );

  return (
    <WorkspaceFrame
      className="vendor-dashboard"
      headingClassName="finance-heading"
      actionsClassName="finance-heading-actions vendor-dashboard-actions"
      icon="layers"
      title="Dashboard"
      description="What needs your attention, how sales are trending and what's coming up."
      tabs={[]}
      value="dashboard"
      onChange={() => undefined}
      actions={
        <>
          <Field
            id={id + '-period'}
            label={<span className="sr-only">Reporting period</span>}
          >
            <FarmstandSelect
              id={id + '-period'}
              icon="calendar-days"
              value={period}
              disabled={!loaded}
              onChange={(event) =>
                void save({
                  ...layout,
                  period: event.target.value as DashboardPeriod,
                }).catch(() => undefined)
              }
            >
              {dashboardPeriods.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
          <FarmstandButton
            variant="secondary"
            disabled={!loaded}
            onClick={() => setCustomizing(true)}
          >
            <FarmstandIcon name="sliders-horizontal" />
            Customize
          </FarmstandButton>
        </>
      }
    >
      <p className="sr-only" aria-live="polite">
        Showing {periodLabel.toLowerCase()}.
      </p>
      <div className="vendor-dashboard-stack" ref={grid}>
        {sections(cells).map((section) =>
          section.band ? (
            <div
              key={section.band.id}
              className="vendor-dashboard-band"
              data-widget={section.band.id}
            >
              <WidgetSize.Provider value={section.band}>
                {widgets[section.band.id as DashboardWidgetId]}
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
                    {widgets[cell.id as DashboardWidgetId]}
                  </WidgetSize.Provider>
                </div>
              ))}
            </div>
          ),
        )}
      </div>
      {cells.length === 0 && (
        <EmptyState title="Every dashboard section is hidden">
          <p>Use Customize to choose the sections you want to see.</p>
        </EmptyState>
      )}
      {customizing && (
        <DashboardLayoutEditor
          layout={layout}
          pageWidth={grid.current?.getBoundingClientRect().width}
          available={(w) => !!widgets[w as DashboardWidgetId]}
          onClose={() => setCustomizing(false)}
          onSave={save}
        />
      )}
    </WorkspaceFrame>
  );
}

function UrgentRequests({ items }: { items: UrgentItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  if (items.length === 0) return null;
  const visible = expanded ? items : items.slice(0, 4);
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-urgent"
      aria-labelledby={id}
    >
      <div className="finance-card-header vendor-dashboard-panel-header">
        <h2 id={id}>
          <FarmstandIcon name="triangle-alert" />
          Urgent requests
          <Badge tone="danger">{items.length}</Badge>
        </h2>
        {items.length > 4 && (
          <FarmstandButton
            variant="tertiary"
            size="compact"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Show fewer' : `View all ${items.length}`}
          </FarmstandButton>
        )}
      </div>
      <ul className="vendor-dashboard-urgent-list">
        {visible.map((item) => (
          <li key={item.id}>
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
          </li>
        ))}
      </ul>
    </FarmstandPanel>
  );
}

function KeyMetrics({
  period,
  report,
  previous,
  customers,
  dates,
  money,
  since,
  previousSince,
  now,
}: {
  period: DashboardPeriod;
  report?: Read<FinanceReport>;
  previous: Read<FinanceReport>;
  customers?: Read<Awaited<ReturnType<typeof readCustomersWorkspace>>>;
  dates: Read<Awaited<ReturnType<typeof readUpcomingMarketDates>>>;
  money: (value: number) => string;
  since?: string;
  previousSince?: string;
  now: number;
}) {
  const pending = (read?: { loading: boolean; error?: unknown }) =>
    read?.loading ? 'Loading…' : read?.error ? 'Unavailable' : undefined;
  const current = report?.data?.summary,
    prior = previous.data?.summary;
  const compare = (key: 'orders' | 'gross' | 'profit') =>
    current && prior ? (
      <Change change={periodChange(current[key], prior[key], period)} />
    ) : (
      (pending(previous) ?? `Last ${period} days`)
    );
  const activity =
    customers?.data && since && previousSince
      ? customerActivity(customers.data, since, previousSince)
      : undefined;
  const upcoming = (dates.data?.dates ?? []).filter(
    (d) => dateAttendance(d.participation) !== 'not-attending',
  );
  const next = upcoming[0];
  const items: Parameters<typeof MarketsSummary>[0]['items'] = [];
  if (report)
    items.push(
      {
        label: 'Total orders',
        value: current ? current.orders.toLocaleString() : '—',
        hint: current ? compare('orders') : pending(report),
        icon: 'shopping-cart',
      },
      {
        label: 'Revenue',
        value: current ? money(current.gross) : '—',
        hint: current ? compare('gross') : pending(report),
        icon: 'credit-card',
      },
      {
        label: 'Estimated profit',
        value: current ? money(current.profit) : '—',
        hint: current ? compare('profit') : pending(report),
        icon: 'circle-check',
      },
    );
  if (customers)
    items.push({
      label: 'Customers',
      value: activity ? activity.total.toLocaleString() : '—',
      hint: activity ? (
        <Change
          change={{
            text: `${activity.newCustomers.toLocaleString()} new in the last ${period} days`,
            tone: activity.newCustomers > 0 ? 'positive' : 'neutral',
          }}
        />
      ) : (
        pending(customers)
      ),
      icon: 'user-round',
    });
  items.push({
    label: 'Upcoming markets',
    value: dates.data ? upcoming.length : '—',
    hint: next
      ? `Next ${relativeDay(next.occurrence.startsAt, now).toLowerCase()}`
      : (pending(dates) ?? 'None in the next 90 days'),
    icon: 'calendar-days',
  });
  return (
    <section aria-label="Key metrics">
      <MarketsSummary className="vendor-dashboard-kpis" items={items} />
    </section>
  );
}

function NextMarket({
  dates,
  now,
}: {
  dates: Read<Awaited<ReturnType<typeof readUpcomingMarketDates>>>;
  now: number;
}) {
  const upcoming = (dates.data?.dates ?? []).filter(
    (d) => dateAttendance(d.participation) !== 'not-attending',
  );
  const next = upcoming[0];
  const cell = useContext(WidgetSize);
  const later = upcoming.slice(1, cell.h >= 3 ? 6 : 4);
  return (
    <FarmstandPanel
      as="section"
      className="markets-next vendor-dashboard-next"
      aria-label="Next upcoming market"
    >
      <h2>
        <FarmstandIcon name="calendar-days" />
        Next upcoming market
      </h2>
      <ReadState {...dates} retry={dates.refresh} />
      {dates.data &&
        (next ? (
          <div className="vendor-dashboard-next-body">
            <DateTile date={next} />
            <div className="markets-next-content">
              <h3>{next.membership.market.name}</h3>
              <dl className="vendor-dashboard-next-facts">
                <div>
                  <dt>
                    <FarmstandIcon name="calendar-days" />
                    <span className="sr-only">Date</span>
                  </dt>
                  <dd>
                    {marketDate(next.occurrence, true)}
                    <small>{relativeDay(next.occurrence.startsAt, now)}</small>
                  </dd>
                </div>
                <div>
                  <dt>
                    <UtilityIcon name="clock" />
                    <span className="sr-only">Time</span>
                  </dt>
                  <dd>{marketTime(next.occurrence)}</dd>
                </div>
                {next.occurrence.venue && (
                  <div>
                    <dt>
                      <FarmstandIcon name="map-pin" />
                      <span className="sr-only">Location</span>
                    </dt>
                    <dd>{next.occurrence.venue}</dd>
                  </div>
                )}
                <div>
                  <dt>
                    <FarmstandIcon name="store" />
                    <span className="sr-only">Booth</span>
                  </dt>
                  <dd>
                    {next.booth
                      ? `Booth ${next.booth}`
                      : dates.data.boothsAvailable
                        ? 'No booth assigned yet'
                        : 'Booth details unavailable'}
                  </dd>
                </div>
                <div>
                  <dt>
                    <FarmstandIcon name="circle-check" />
                    <span className="sr-only">Attendance</span>
                  </dt>
                  <dd>
                    <AttendanceBadge
                      value={dateAttendance(next.participation)}
                    />
                  </dd>
                </div>
              </dl>
            </div>
            <div className="vendor-dashboard-next-actions">
              <DashboardLink
                variant="primary"
                href={`/vendor/markets/${encodeURIComponent(next.membership.id)}/dates/${encodeURIComponent(next.occurrence.id)}`}
              >
                Manage attendance
              </DashboardLink>
              <DashboardLink
                href={`/vendor/markets/${encodeURIComponent(next.membership.id)}`}
              >
                View market
                <FarmstandIcon name="chevron-right" />
              </DashboardLink>
            </div>
            {later.length > 0 && (
              <div className="vendor-dashboard-later">
                <h3>Also coming up</h3>
                <ul>
                  {later.map((date) => (
                    <li key={date.key}>
                      <a
                        href={`/vendor/markets/${encodeURIComponent(date.membership.id)}/dates/${encodeURIComponent(date.occurrence.id)}`}
                        onClick={navigate}
                      >
                        <span>
                          <strong>{date.membership.market.name}</strong>
                          <small>{marketDate(date.occurrence)}</small>
                        </span>
                        <AttendanceBadge
                          value={dateAttendance(date.participation)}
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="No upcoming market">
            <p>
              No scheduled dates for your active memberships in the next 90
              days.
            </p>
            <DashboardLink href="/vendor/markets#applications">
              Find markets
            </DashboardLink>
          </EmptyState>
        ))}
    </FarmstandPanel>
  );
}

function DateTile({ date }: { date: UpcomingMarketDate }) {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Date(date.occurrence.startsAt).toLocaleDateString(undefined, {
      ...options,
      timeZone: date.occurrence.timezone,
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

function ThisWeek({
  dates,
  packing,
  urgent,
  now,
}: {
  dates: Read<Awaited<ReturnType<typeof readUpcomingMarketDates>>>;
  packing: Read<Map<string, PackingView>>;
  urgent: UrgentItem[];
  now: number;
}) {
  const id = useId();
  const tasks = dates.data
    ? weekTasks({
        dates: dates.data.dates,
        packing: packing.data ?? new Map(),
        urgent,
        now,
      })
    : [];
  const done = tasks.filter((t) => t.done).length;
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-week"
      aria-labelledby={id}
    >
      <PanelHeader id={id} title="This week">
        {tasks.length > 0 && (
          <span className="vendor-dashboard-muted">
            {done} of {tasks.length} done
          </span>
        )}
      </PanelHeader>
      <ReadState {...dates} retry={dates.refresh} />
      {dates.data &&
        (tasks.length ? (
          <ul className="vendor-dashboard-tasks">
            {tasks.map((task) => (
              <li key={task.id} data-done={task.done || undefined}>
                <span className="vendor-dashboard-task-mark" aria-hidden="true">
                  {task.done && <UtilityIcon name="check" />}
                </span>
                <a href={task.href} onClick={navigate}>
                  <span className="sr-only">
                    {task.done ? 'Done: ' : 'To do: '}
                  </span>
                  {task.label}
                  {task.detail && <small>{task.detail}</small>}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="vendor-dashboard-muted">
            Nothing due in the next 7 days.
          </p>
        ))}
      {packing.error && (
        <p className="vendor-dashboard-muted">
          Packing progress is unavailable right now.
        </p>
      )}
    </FarmstandPanel>
  );
}

function SalesTrend({
  report,
  period,
  id,
}: {
  report: Read<FinanceReport>;
  period: DashboardPeriod;
  id: string;
}) {
  const group = period === '90' ? 'weekly' : 'daily';
  // The line fills whatever height the section's grid cell leaves for it.
  const body = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(200);
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const measure = () =>
      setHeight(Math.max(140, Math.floor(element.clientHeight) - 4));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel finance-performance vendor-dashboard-trend"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="Sales over time"
        link={{ href: '/vendor/finances', label: 'Finances' }}
      />
      <div className="finance-legend">
        <span className="finance-series-key finance-series-gross vendor-dashboard-gross-key">
          Gross sales
        </span>
        <span>{group === 'weekly' ? 'Weekly totals' : 'Daily totals'}</span>
      </div>
      <div
        aria-busy={report.loading}
        className="finance-graph-body vendor-dashboard-fill"
        ref={body}
      >
        <ReadState
          {...report}
          loading={!report.data && report.loading}
          retry={report.refresh}
        />
        {report.data && (
          <FinancialGraph
            report={report.data}
            series={['gross']}
            group={group}
            lines
            height={height}
          />
        )}
      </div>
    </FarmstandPanel>
  );
}

function DonutPanel({
  id,
  title,
  report,
  currency,
  items,
  empty,
}: {
  id: string;
  title: string;
  report: Read<FinanceReport>;
  currency?: string;
  items: (
    report: FinanceReport,
  ) => Array<{ id: string; name: string; value: number }>;
  empty: string;
}) {
  const slices = report.data ? items(report.data) : [];
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-donut"
      aria-labelledby={id}
    >
      <PanelHeader id={id} title={title} />
      <ReadState
        {...report}
        loading={!report.data && report.loading}
        retry={report.refresh}
      />
      {report.data &&
        (slices.length ? (
          <FinanceDonut items={slices} currency={currency ?? 'USD'} legend />
        ) : (
          <p className="vendor-dashboard-muted">{empty}.</p>
        ))}
    </FarmstandPanel>
  );
}

function TopCustomers({
  id,
  customers,
  spending,
  money,
  period,
}: {
  id: string;
  customers: Read<Awaited<ReturnType<typeof readCustomersWorkspace>>>;
  spending: Read<PeriodCustomers>;
  money: (value: number) => string;
  period: DashboardPeriod;
}) {
  const cell = useContext(WidgetSize);
  const ranking = spending.data?.ranking.slice(0, rankRows(cell)) ?? [];
  const most = Math.max(1, ranking[0]?.amount ?? 1);
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-top-customers"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="Top customers"
        link={{ href: '/vendor/customers', label: 'View all' }}
      />
      <ReadState {...customers} retry={customers.refresh} />
      {customers.data && (
        <ReadState
          {...spending}
          loading={!spending.data && spending.loading}
          retry={spending.refresh}
        />
      )}
      {spending.data &&
        (ranking.length ? (
          <ol className="vendor-dashboard-products-list">
            {ranking.map(({ customer, amount, orders }) => (
              <li key={customer.id}>
                <span className="vendor-dashboard-rank" aria-hidden="true" />
                <span className="vendor-dashboard-product">
                  <span className="vendor-dashboard-ranking-line">
                    <a
                      href={`/vendor/customers/${encodeURIComponent(customer.id)}`}
                      onClick={navigate}
                    >
                      {customerName(customer)}
                    </a>
                    <strong>{money(amount)}</strong>
                  </span>
                  <small>
                    {orders.toLocaleString()}{' '}
                    {orders === 1 ? 'order' : 'orders'}
                  </small>
                  <span
                    className="vendor-dashboard-meter"
                    aria-hidden="true"
                    style={
                      {
                        '--dashboard-meter': `${Math.max(4, (Math.max(0, amount) / most) * 100)}%`,
                      } as CSSProperties
                    }
                  />
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="vendor-dashboard-muted">
            No customer purchases in the last {period} days.
          </p>
        ))}
      {spending.data?.partial && (
        <p className="vendor-dashboard-muted">
          Ranking covers your 60 most recently active customers.
        </p>
      )}
    </FarmstandPanel>
  );
}

function RecentOrders({
  id,
  report,
  orders,
  names,
  money,
}: {
  id: string;
  report: Read<FinanceReport>;
  orders: readonly FinanceOrderTransaction[];
  names: Read<Map<string, string>>;
  money: (value: number) => string;
}) {
  const cell = useContext(WidgetSize);
  const shown = orders.slice(0, cell.h >= 3 ? 9 : 5);
  const customer = (order: FinanceOrderTransaction) =>
    names.data?.get(order.id) ??
    (names.loading ? 'Loading…' : unknownCustomer(order.channel));
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-orders"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="Recent orders"
        link={{ href: '/vendor/orders', label: 'View all' }}
      />
      <ReadState
        {...report}
        loading={!report.data && report.loading}
        retry={report.refresh}
      />
      {report.data &&
        (shown.length ? (
          <table className="vendor-dashboard-orders-table">
            <caption className="sr-only">Recent orders</caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Total</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((order) => (
                <tr key={order.id}>
                  <th scope="row">
                    {order.orderId ? (
                      <a
                        href={`/vendor/orders/${encodeURIComponent(order.orderId)}`}
                        onClick={navigate}
                      >
                        {customer(order)}
                      </a>
                    ) : (
                      customer(order)
                    )}
                  </th>
                  <td>{money(order.payment)}</td>
                  <td>
                    {new Date(order.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="vendor-dashboard-muted">No orders in this period.</p>
        ))}
    </FarmstandPanel>
  );
}

function TopProducts({
  id,
  report,
  money,
}: {
  id: string;
  report: Read<FinanceReport>;
  money: (value: number) => string;
}) {
  const cell = useContext(WidgetSize);
  const products = report.data ? topProducts(report.data, rankRows(cell)) : [];
  const most = products[0]?.units ?? 1;
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-products"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="Top selling products"
        link={{ href: '/vendor/products', label: 'Products' }}
      />
      <ReadState
        {...report}
        loading={!report.data && report.loading}
        retry={report.refresh}
      />
      {report.data &&
        (products.length ? (
          <ol className="vendor-dashboard-products-list">
            {products.map((product) => (
              <li key={product.id}>
                <span className="vendor-dashboard-rank" aria-hidden="true" />
                <span className="vendor-dashboard-product">
                  <strong>{product.name}</strong>
                  <small>
                    {product.units.toLocaleString()} sold ·{' '}
                    {money(product.revenue)}
                  </small>
                  <span
                    className="vendor-dashboard-meter"
                    aria-hidden="true"
                    style={
                      {
                        '--dashboard-meter': `${Math.max(4, (product.units / most) * 100)}%`,
                      } as CSSProperties
                    }
                  />
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="vendor-dashboard-muted">
            No product sales in this period.
          </p>
        ))}
    </FarmstandPanel>
  );
}
