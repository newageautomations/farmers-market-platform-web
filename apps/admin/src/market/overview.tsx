import {
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { mayMarketCommand } from '@market/admin-core';
import { hasPermission } from '@market/auth';
import { formatMoney } from '@market/config';
import type {
  ComplianceSummaryData,
  MarketDayChecklist,
  MarketOccurrence,
  MarketOperationsData,
} from '@market/api';
import { Badge, EmptyState, UtilityIcon, InlineSkeleton } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
} from '@market/ui/farmstand';
import { compact } from '@market/ui/dashboard-grid';
import { DashboardLayoutEditor } from '@market/ui/dashboard-layout';
import '@market/ui/farmstand.css';
import '@market/ui/workspace.css';
import '@market/ui/workspace-records.css';
import '@market/ui/dashboard-layout.css';
import { WorkspaceFrame } from '../WorkspaceFrame';
import {
  DashboardCells,
  DashboardLink,
  DateTile,
  PanelHeader,
  UrgentRequests,
  WidgetSize,
  navigate,
} from '../DashboardWidgets';
import { FinanceDonut } from '../finance/charts';
import '../finance/finance.css';
import '../finance/finance-workspace.css';
import { MarketsSummary } from '../vendor/MarketsSummary';
import { marketDate, marketTime } from '../vendor/markets-data';
import '../vendor/vendor-dashboard.css';
import './market-occurrences.css';
import './overview.css';
import type { MarketService } from './service';
import { ReadState, StatusBadge, useRead } from './common';
import { addDays, readOccurrencesInRange, today } from './occurrences-data';
import {
  datePhase,
  dateReadiness,
  plural,
  readDateOperations,
  type DateOperations,
} from './operations-data';
import {
  DOCUMENTS_PATH,
  INVOICES_PATH,
  SUBMISSIONS_PATH,
  assignmentsPath,
  boothBreakdown,
  daysUntil,
  invoicesAwaitingPayment,
  managerUrgencies,
  occurrencePath,
  owedTotal,
  relativeDay,
  upcomingDates,
  type DueInvoice,
} from './dashboard-data';
import {
  defaultManagerLayout,
  managerBandWidgets,
  managerDashboardWidgets,
  normalizeManagerLayout,
  useManagerDashboardLayout,
  type ManagerWidgetId,
} from './dashboard-layout';

type Read<T> = ReturnType<typeof useRead<T>>;
/** How far ahead the Overview looks for market dates. */
const LOOKAHEAD_DAYS = 59;

/**
 * Market Overview: what needs the manager, the next market and its booths,
 * money owed, new applications and vendor paperwork on one page. Each
 * section reads independently under its own grant, so a missing permission
 * or failed read affects only that section. The arrangement is a
 * per-account preference edited with the shared dashboard layout editor.
 */
export function MarketOverview({ service }: { service: MarketService }) {
  const id = useId();
  const can = (permission: string) =>
    hasPermission(service.context.permissions, permission as never);
  const { layout, loaded, save } = useManagerDashboardLayout(service);
  const [customizing, setCustomizing] = useState(false);
  const now = useMemo(() => Date.now(), []);
  const key = service.readKey;
  const operations = service.phase14;
  const canBooths = !!operations && can('ReadOwnMarketAssignments');
  const canBilling = !!operations && can('ReadOwnMarketBilling');
  const canApplications = !!operations && can('ReadOwnMarketApplications');
  const canDocuments = !!service.notifications && can('ReadOwnDocuments');
  const canListings = mayMarketCommand(
    service.context,
    'ManageOwnMarketListings',
  );

  const readOverview = useCallback(() => service.overview(), [service]);
  const overview = useRead(`${key}:overview-summary`, readOverview);
  const readDates = useCallback(async () => {
    const from = today();
    const { items } = await readOccurrencesInRange(service, {
      from,
      through: addDays(from, LOOKAHEAD_DAYS),
    });
    return upcomingDates(items, now).slice(0, 6);
  }, [service, now]);
  const dates = useRead(`${key}:overview-dates`, readDates);
  // The schedule read only covers what it was asked for; fall back to the
  // summary's next date when it is further out than the lookahead.
  const next: MarketOccurrence | undefined =
    dates.data?.[0] ?? overview.data?.nextOccurrence ?? undefined;
  const scheduleDates = useMemo(
    () => (dates.data?.length ? dates.data : next ? [next] : []),
    [dates.data, next],
  );

  const readFacts = useCallback(
    () => readDateOperations(operations!, scheduleDates, now),
    [operations, scheduleDates, now],
  );
  const facts = useRead(
    `${key}:overview-facts:${scheduleDates.map((d) => d.id).join(',')}`,
    readFacts,
    canBooths && scheduleDates.length > 0,
  );
  const readBooths = useCallback(
    () => operations!.read('ASSIGNMENTS', Number(next!.id)),
    [operations, next],
  );
  const booths = useRead(
    `${key}:overview-booths:${next?.id}`,
    readBooths,
    canBooths && !!next,
  );
  const readChecklist = useCallback(
    () => service.checklist!(next!.id),
    [service, next],
  );
  const checklist = useRead(
    `${key}:overview-checklist:${next?.id}`,
    readChecklist,
    !!service.checklist && !!next,
  );
  const readBilling = useCallback(
    () => operations!.read('BILLING'),
    [operations],
  );
  const billing = useRead(`${key}:overview-billing`, readBilling, canBilling);
  const readApplications = useCallback(
    () =>
      operations!.read('APPLICATIONS', undefined, {
        mode: 'PAGE',
        quickView: 'REVIEW',
        sort: 'NEWEST',
        take: 10,
      }),
    [operations],
  );
  const applications = useRead(
    `${key}:overview-applications`,
    readApplications,
    canApplications,
  );
  const readCompliance = useCallback(
    () => service.notifications!.summary(),
    [service],
  );
  const compliance = useRead(
    `${key}:overview-compliance`,
    readCompliance,
    canDocuments,
  );
  const readRequests = useCallback(
    () => service.relationshipPage({ take: 9, status: 'pending' }),
    [service],
  );
  const requests = useRead(`${key}:overview-requests`, readRequests);

  const due = useMemo(
    () => invoicesAwaitingPayment(billing.data?.invoices),
    [billing.data],
  );
  const nextFacts = next ? facts.data?.get(String(next.id)) : undefined;
  const pendingApplications = applications.data?.applicationPage?.totalItems;
  const pendingListings = canListings
    ? overview.data?.pendingListings
    : undefined;
  const urgent = useMemo(
    () =>
      managerUrgencies({
        next,
        nextFacts,
        due: billing.data ? due : undefined,
        compliance: compliance.data,
        applications: pendingApplications,
        vendorRequests: requests.data?.totalItems,
        listings: pendingListings,
        now,
      }),
    [
      next,
      nextFacts,
      billing.data,
      due,
      compliance.data,
      pendingApplications,
      requests.data,
      pendingListings,
      now,
    ],
  );

  const widgets: Record<ManagerWidgetId, ReactNode> = {
    urgent: (
      <UrgentRequests
        items={urgent}
        title="Needs attention"
        dismissalScope={`market:${service.marketId}`}
      />
    ),
    kpis: (
      <KeyMetrics
        overview={overview}
        next={next}
        nextFacts={
          canBooths ? (facts.data ? (nextFacts ?? null) : undefined) : undefined
        }
        factsRead={facts}
        due={canBilling ? due : undefined}
        billing={billing}
        applications={canApplications ? applications : undefined}
        now={now}
      />
    ),
    'next-market': (
      <NextMarket
        dates={dates}
        next={next}
        facts={canBooths ? facts : undefined}
        now={now}
      />
    ),
    booths: canBooths && (
      <BoothAvailability
        id={id + '-booths'}
        next={next}
        booths={booths}
        billing={canBilling}
        loading={!next && (dates.loading || overview.loading)}
      />
    ),
    checklist: (canBooths || !!service.checklist) && (
      <MarketChecklist
        id={id + '-checklist'}
        next={next}
        checklist={service.checklist ? checklist : undefined}
        facts={nextFacts}
        canOperateDay={can('OperateOwnMarketDay')}
        pendingListings={pendingListings}
        now={now}
      />
    ),
    applications: canApplications && (
      <NewApplications
        id={id + '-applications'}
        applications={applications}
        now={now}
      />
    ),
    invoices: canBilling && (
      <InvoicesDue id={id + '-invoices'} billing={billing} due={due} />
    ),
    compliance: canDocuments && (
      <VendorDocuments id={id + '-documents'} compliance={compliance} />
    ),
    vendors: <VendorRequests id={id + '-vendors'} requests={requests} />,
  };
  const grid = useRef<HTMLDivElement>(null);
  const present = (widget: string) =>
    !!widgets[widget as ManagerWidgetId] &&
    (widget !== 'urgent' || urgent.length > 0);
  // Hidden, unavailable or empty sections leave no hole: the rest settle up.
  const cells = compact(
    (layout.grid ?? []).filter(
      (cell) => !layout.hidden.includes(cell.id) && present(cell.id),
    ),
  );

  return (
    <WorkspaceFrame
      className="vendor-dashboard market-dashboard"
      headingClassName="finance-heading"
      actionsClassName="finance-heading-actions vendor-dashboard-actions"
      icon="layers"
      title="Overview"
      description="What needs your attention, your next market and what's waiting on vendors."
      tabs={[]}
      value="overview"
      onChange={() => undefined}
      actions={
        <FarmstandButton
          variant="secondary"
          disabled={!loaded}
          onClick={() => setCustomizing(true)}
        >
          <FarmstandIcon name="sliders-horizontal" />
          Customize
        </FarmstandButton>
      }
    >
      <DashboardCells
        ref={grid}
        cells={cells}
        bands={managerBandWidgets}
        widgets={widgets}
      />
      {cells.length === 0 && (
        <EmptyState title="Every overview section is hidden">
          <p>Use Customize to choose the sections you want to see.</p>
        </EmptyState>
      )}
      {customizing && (
        <DashboardLayoutEditor
          layout={layout}
          widgets={managerDashboardWidgets}
          defaultLayout={defaultManagerLayout}
          normalize={normalizeManagerLayout}
          conditional={['urgent']}
          title="Customize overview"
          pageWidth={grid.current?.getBoundingClientRect().width}
          available={(w) => !!widgets[w as ManagerWidgetId]}
          onClose={() => setCustomizing(false)}
          onSave={save}
        />
      )}
    </WorkspaceFrame>
  );
}

const pending = (read?: { loading: boolean; error?: unknown }) =>
  read?.loading ? <InlineSkeleton /> : read?.error ? 'Unavailable' : undefined;

function KeyMetrics({
  overview,
  next,
  nextFacts,
  factsRead,
  due,
  billing,
  applications,
  now,
}: {
  overview: Read<Awaited<ReturnType<MarketService['overview']>>>;
  next?: MarketOccurrence;
  /** Undefined without booth access or while loading; null when unknown. */
  nextFacts?: DateOperations | null;
  factsRead: Read<Map<string, DateOperations>>;
  due?: readonly DueInvoice[];
  billing: Read<MarketOperationsData>;
  applications?: Read<MarketOperationsData>;
  now: number;
}) {
  const items: Parameters<typeof MarketsSummary>[0]['items'] = [];
  items.push({
    label: 'Next market',
    value: next
      ? relativeDay(next.startsAt, now)
      : overview.data
        ? 'None'
        : '—',
    hint: next
      ? marketDate(next, true)
      : (pending(overview) ?? 'No dates scheduled'),
    icon: 'calendar-days',
  });
  if (nextFacts !== undefined || factsRead.loading || factsRead.error)
    items.push({
      label: 'Open booths',
      value: nextFacts?.layout ? nextFacts.open : '—',
      hint: nextFacts
        ? nextFacts.layout
          ? `${nextFacts.assigned} of ${nextFacts.total} assigned`
          : 'No layout chosen yet'
        : (pending(factsRead) ?? 'No upcoming market'),
      icon: 'store',
      tone: nextFacts && !nextFacts.layout ? 'warning' : undefined,
    });
  if (due) {
    const pastDue = due.filter((d) => d.pastDue).length;
    items.push({
      label: 'Awaiting payment',
      value: billing.data ? owedTotal(due) : '—',
      hint: billing.data
        ? due.length
          ? `${plural(due.length, 'invoice')}${pastDue ? ` · ${pastDue} past due` : ''}`
          : 'Every invoice is paid'
        : pending(billing),
      icon: 'receipt-text',
      tone: pastDue ? 'danger' : undefined,
    });
  }
  if (applications) {
    const total = applications.data?.applicationPage?.totalItems;
    items.push({
      label: 'Applications to review',
      value: total ?? '—',
      hint:
        total === undefined
          ? pending(applications)
          : total
            ? 'Submitted or under review'
            : 'All caught up',
      icon: 'clipboard-list',
    });
  }
  const summary = overview.data;
  items.push({
    label: 'Active vendors',
    value: summary ? (summary.approvedVendorRelationships ?? 0) : '—',
    hint: summary
      ? summary.pendingVendorRelationships
        ? `${plural(summary.pendingVendorRelationships, 'request')} waiting`
        : plural(summary.upcomingScheduledOccurrences ?? 0, 'upcoming date')
      : pending(overview),
    icon: 'user-round',
  });
  return (
    <section aria-label="Key metrics">
      <MarketsSummary className="vendor-dashboard-kpis" items={items} />
    </section>
  );
}

function boothLabel(facts?: DateOperations) {
  if (!facts) return undefined;
  if (!facts.layout) return 'No booth layout yet';
  return `${facts.assigned} of ${facts.total} booths assigned`;
}

function OpenBadge({ facts }: { facts?: DateOperations }) {
  if (!facts) return null;
  if (!facts.layout) return <Badge tone="warning">No layout</Badge>;
  return facts.open ? (
    <Badge tone="success">{plural(facts.open, 'open booth')}</Badge>
  ) : (
    <Badge tone="neutral">Full</Badge>
  );
}

function NextMarket({
  dates,
  next,
  facts,
  now,
}: {
  dates: Read<MarketOccurrence[]>;
  next?: MarketOccurrence;
  facts?: Read<Map<string, DateOperations>>;
  now: number;
}) {
  const cell = useContext(WidgetSize);
  const later = (dates.data ?? []).slice(
    1,
    cell.h < 3 ? 4 : cell.w >= 5 ? 6 : 5,
  );
  const nextFacts = next ? facts?.data?.get(String(next.id)) : undefined;
  return (
    <FarmstandPanel
      as="section"
      className="markets-next vendor-dashboard-next"
      aria-label="Next market"
    >
      <h2>
        <FarmstandIcon name="calendar-days" />
        Next market
      </h2>
      {!next && (
        <ReadState
          skeleton="detail"
          rows={2}
          {...dates}
          retry={dates.refresh}
        />
      )}
      {next ? (
        <div className="vendor-dashboard-next-body">
          <DateTile startsAt={next.startsAt} timezone={next.timezone} />
          <div className="markets-next-content">
            <h3>{marketDate(next, true)}</h3>
            <dl className="vendor-dashboard-next-facts">
              <div>
                <dt>
                  <UtilityIcon name="clock" />
                  <span className="sr-only">Time</span>
                </dt>
                <dd>
                  {marketTime(next)}
                  <small>{relativeDay(next.startsAt, now)}</small>
                </dd>
              </div>
              {next.venue && (
                <div>
                  <dt>
                    <FarmstandIcon name="map-pin" />
                    <span className="sr-only">Location</span>
                  </dt>
                  <dd>{next.venue}</dd>
                </div>
              )}
              {facts && (
                <div>
                  <dt>
                    <FarmstandIcon name="store" />
                    <span className="sr-only">Booths</span>
                  </dt>
                  <dd>
                    {boothLabel(nextFacts) ??
                      pending(facts) ??
                      'Booth details unavailable'}
                  </dd>
                </div>
              )}
              {nextFacts && (
                <div>
                  <dt>
                    <FarmstandIcon name="user-round" />
                    <span className="sr-only">Vendors</span>
                  </dt>
                  <dd>
                    {plural(nextFacts.confirmed, 'confirmed vendor')}
                    {nextFacts.unassigned > 0 && (
                      <small>{nextFacts.unassigned} without a booth</small>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div className="vendor-dashboard-next-actions">
            <DashboardLink variant="primary" href={assignmentsPath(next.id)}>
              Manage booths
            </DashboardLink>
            <DashboardLink href={occurrencePath(next.id)}>
              View date
              <FarmstandIcon name="chevron-right" />
            </DashboardLink>
          </div>
          {later.length > 0 && (
            <div className="vendor-dashboard-later">
              <h3>Also coming up</h3>
              <ul>
                {later.map((date) => (
                  <li key={date.id}>
                    <a href={occurrencePath(date.id)} onClick={navigate}>
                      <span>
                        <strong>{marketDate(date)}</strong>
                        <small>
                          {date.venue || relativeDay(date.startsAt, now)}
                        </small>
                      </span>
                      <OpenBadge facts={facts?.data?.get(String(date.id))} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        dates.data && (
          <EmptyState title="No upcoming market">
            <p>No market dates are scheduled in the next 60 days.</p>
            <DashboardLink href="/market/occurrences">
              Schedule dates
            </DashboardLink>
          </EmptyState>
        )
      )}
    </FarmstandPanel>
  );
}

function BoothAvailability({
  id,
  next,
  booths,
  billing,
  loading,
}: {
  id: string;
  next?: MarketOccurrence;
  booths: Read<MarketOperationsData>;
  billing: boolean;
  loading: boolean;
}) {
  const counts =
    next && booths.data
      ? boothBreakdown(booths.data, Number(next.id))
      : undefined;
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-donut market-dashboard-booths"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="Booth availability"
        link={
          next ? { href: assignmentsPath(next.id), label: 'Assign' } : undefined
        }
      />
      {loading && (
        <ReadState skeleton="detail" rows={3} loading retry={() => undefined} />
      )}
      {next && (
        <ReadState
          skeleton="detail"
          rows={3}
          {...booths}
          retry={booths.refresh}
        />
      )}
      {!next && !loading && (
        <p className="vendor-dashboard-muted">No upcoming market.</p>
      )}
      {counts &&
        (!counts.layout ? (
          <p className="vendor-dashboard-muted">
            Choose a booth layout for {marketDate(next!)} to start assigning
            booths.
          </p>
        ) : counts.total ? (
          <FinanceDonut
            items={[
              { id: 'open', name: 'Open', value: counts.open },
              {
                id: 'assigned',
                name: billing ? 'Assigned, unpaid' : 'Assigned',
                value: counts.assigned,
              },
              ...(billing
                ? [{ id: 'paid', name: 'Paid', value: counts.paid }]
                : []),
            ]}
            currency="USD"
            units
            unitLabel="booths"
            legend
          />
        ) : (
          <p className="vendor-dashboard-muted">
            The layout for {marketDate(next!)} has no booths.
          </p>
        ))}
    </FarmstandPanel>
  );
}

function MarketChecklist({
  id,
  next,
  checklist,
  facts,
  canOperateDay,
  pendingListings,
  now,
}: {
  id: string;
  next?: MarketOccurrence;
  checklist?: Read<MarketDayChecklist>;
  facts?: DateOperations;
  canOperateDay: boolean;
  pendingListings?: number;
  now: number;
}) {
  const readiness = next
    ? dateReadiness(
        String(next.id),
        datePhase(next, now),
        checklist?.data,
        facts,
        canOperateDay,
        pendingListings,
      )
    : undefined;
  const tasks = readiness
    ? [
        ...readiness.attention.map((item) => ({ ...item, done: false })),
        ...readiness.clear.map((item) => ({ ...item, done: true })),
      ]
    : [];
  const done = tasks.filter((t) => t.done).length;
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-week"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="Market day checklist"
        link={
          next
            ? { href: `/market/operations/${next.id}`, label: 'Operations' }
            : undefined
        }
      >
        {tasks.length > 0 && (
          <span className="vendor-dashboard-muted">
            {done} of {tasks.length} done
          </span>
        )}
      </PanelHeader>
      {checklist && next && (
        <ReadState
          skeleton="table"
          rows={3}
          {...checklist}
          loading={!checklist.data && checklist.loading}
          retry={checklist.refresh}
        />
      )}
      {!next ? (
        <p className="vendor-dashboard-muted">No upcoming market.</p>
      ) : tasks.length ? (
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
                {task.title}
                <small>
                  {task.done
                    ? task.status
                    : task.count > 1
                      ? `${task.status} (${task.count})`
                      : task.detail}
                </small>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        !checklist?.loading &&
        !checklist?.error && (
          <p className="vendor-dashboard-muted">
            Nothing to check for {marketDate(next)} yet.
          </p>
        )
      )}
      {readiness && !readiness.known && checklist?.data && (
        <p className="vendor-dashboard-muted">
          Vendor document readiness is unavailable right now.
        </p>
      )}
    </FarmstandPanel>
  );
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function NewApplications({
  id,
  applications,
  now,
}: {
  id: string;
  applications: Read<MarketOperationsData>;
  now: number;
}) {
  const cell = useContext(WidgetSize);
  const page = applications.data?.applicationPage;
  const shown = (page?.items ?? []).slice(0, cell.h >= 3 ? 9 : 5);
  const submitted = (value?: string) => {
    if (!value) return '—';
    const days = -daysUntil(value, now);
    return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : shortDate(value);
  };
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-orders market-dashboard-applications"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="New applications"
        link={{ href: SUBMISSIONS_PATH, label: 'View all' }}
      >
        {!!page?.totalItems && (
          <span className="vendor-dashboard-muted">
            {page.totalItems.toLocaleString()} waiting
          </span>
        )}
      </PanelHeader>
      <ReadState
        skeleton="table"
        rows={3}
        {...applications}
        loading={!applications.data && applications.loading}
        retry={applications.refresh}
      />
      {page &&
        (shown.length ? (
          <table className="vendor-dashboard-orders-table">
            <caption className="sr-only">
              Applications waiting for review
            </caption>
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    <a
                      href={`${SUBMISSIONS_PATH}/${encodeURIComponent(row.id)}`}
                      onClick={navigate}
                    >
                      {row.businessName || 'Unnamed business'}
                    </a>
                    {row.category && <small>{row.category}</small>}
                  </th>
                  <td>
                    <StatusBadge>{row.status}</StatusBadge>
                  </td>
                  <td>{submitted(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="vendor-dashboard-muted">
            No applications are waiting for review.
          </p>
        ))}
    </FarmstandPanel>
  );
}

function InvoicesDue({
  id,
  billing,
  due,
}: {
  id: string;
  billing: Read<MarketOperationsData>;
  due: readonly DueInvoice[];
}) {
  const cell = useContext(WidgetSize);
  const shown = due.slice(0, cell.h >= 3 ? 9 : 5);
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-orders market-dashboard-invoices"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="Invoices awaiting payment"
        link={{ href: INVOICES_PATH, label: 'Invoices' }}
      >
        {billing.data && due.length > 0 && (
          <span className="vendor-dashboard-muted">{owedTotal(due)} owed</span>
        )}
      </PanelHeader>
      <ReadState
        skeleton="table"
        rows={3}
        {...billing}
        loading={!billing.data && billing.loading}
        retry={billing.refresh}
      />
      {billing.data &&
        (shown.length ? (
          <table className="vendor-dashboard-orders-table">
            <caption className="sr-only">Invoices awaiting payment</caption>
            <thead>
              <tr>
                <th scope="col">Vendor</th>
                <th scope="col">Amount due</th>
                <th scope="col">Due</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ invoice, dueMinor, pastDue }) => (
                <tr key={invoice.id}>
                  <th scope="row">
                    <a href={INVOICES_PATH} onClick={navigate}>
                      {invoice.recipientSnapshot.businessName ||
                        `Invoice ${invoice.id}`}
                    </a>
                  </th>
                  <td>{formatMoney(dueMinor, invoice.currency)}</td>
                  <td>
                    {pastDue ? (
                      <Badge tone="danger">Past due</Badge>
                    ) : invoice.dueAt ? (
                      shortDate(invoice.dueAt)
                    ) : (
                      'No due date'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="vendor-dashboard-muted">
            Every issued invoice is paid.
          </p>
        ))}
    </FarmstandPanel>
  );
}

function VendorDocuments({
  id,
  compliance,
}: {
  id: string;
  compliance: Read<ComplianceSummaryData>;
}) {
  const data = compliance.data;
  const vendors = data
    ? data.marketTotals.ready + data.marketTotals.incomplete
    : 0;
  // Nothing required and nothing shared: a meter of 0 / 0 would mislead.
  const unused =
    !!data &&
    vendors === 0 &&
    !data.totals.pending &&
    !data.totals.expired &&
    !data.totals.expiringSoon;
  const rows: Array<
    [string, number, 'danger' | 'warning' | 'info' | undefined]
  > = data
    ? [
        ['Vendors missing documents', data.marketTotals.incomplete, 'warning'],
        ['Waiting for your review', data.totals.pending, 'info'],
        ['Expired', data.totals.expired, 'danger'],
        ['Expiring soon', data.totals.expiringSoon, 'warning'],
      ]
    : [];
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel market-dashboard-documents"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="Vendor documents"
        link={{ href: DOCUMENTS_PATH, label: 'Documents' }}
      />
      <ReadState
        skeleton="detail"
        rows={2}
        {...compliance}
        retry={compliance.refresh}
      />
      {unused && (
        <EmptyState title="No document requirements yet">
          <p>
            Add required documents for vendors and their readiness will show
            here.
          </p>
          <DashboardLink href={DOCUMENTS_PATH}>Set up documents</DashboardLink>
        </EmptyState>
      )}
      {data && !unused && (
        <>
          <div className="occurrence-booth-meter">
            <div>
              <strong>
                {data.marketTotals.ready} / {vendors} vendors ready
              </strong>
              <span>
                {vendors
                  ? Math.round((data.marketTotals.ready / vendors) * 100)
                  : 0}
                % complete
              </span>
            </div>
            <progress
              max={Math.max(1, vendors)}
              value={data.marketTotals.ready}
              aria-label="Vendors with every required document"
            />
          </div>
          <dl className="vendor-dashboard-facts">
            {rows.map(([label, count, tone]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {count > 0 && tone ? (
                    <Badge tone={tone}>{count.toLocaleString()}</Badge>
                  ) : (
                    count.toLocaleString()
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </FarmstandPanel>
  );
}

function VendorRequests({
  id,
  requests,
}: {
  id: string;
  requests: Read<Awaited<ReturnType<MarketService['relationshipPage']>>>;
}) {
  const cell = useContext(WidgetSize);
  const shown = (requests.data?.items ?? []).slice(0, cell.h >= 3 ? 9 : 5);
  return (
    <FarmstandPanel
      as="section"
      className="finance-panel vendor-dashboard-orders market-dashboard-vendors"
      aria-labelledby={id}
    >
      <PanelHeader
        id={id}
        title="Vendor requests"
        link={{ href: '/market/vendors', label: 'Vendors' }}
      >
        {!!requests.data?.totalItems && (
          <span className="vendor-dashboard-muted">
            {requests.data.totalItems.toLocaleString()} waiting
          </span>
        )}
      </PanelHeader>
      <ReadState
        skeleton="table"
        rows={3}
        {...requests}
        loading={!requests.data && requests.loading}
        retry={requests.refresh}
      />
      {requests.data &&
        (shown.length ? (
          <table className="vendor-dashboard-orders-table">
            <caption className="sr-only">Vendors asking to join</caption>
            <thead>
              <tr>
                <th scope="col">Vendor</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.vendor.name}</th>
                  <td>
                    <StatusBadge>{row.status}</StatusBadge>
                  </td>
                  <td>
                    <a
                      href={`/market/vendors/${encodeURIComponent(row.id)}`}
                      onClick={navigate}
                    >
                      Review
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="vendor-dashboard-muted">
            No vendors are waiting to join.
          </p>
        ))}
    </FarmstandPanel>
  );
}
