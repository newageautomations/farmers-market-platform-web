import { useCallback, useId, useMemo, useState, type MouseEvent } from 'react';
import { type MarketOccurrence } from '@market/api';
import { Alert, Badge, EmptyState, Field } from '@market/ui';
import {
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { MarketsSummary } from '../vendor/MarketsSummary';
import { MarketsPagination as Pagination } from '../vendor/MarketsPagination';
import { OrdersDateRange } from '../vendor/OrdersDateRange';
import { Fact, Panel } from '../vendor/application-detail';
import { marketDate, marketTime } from '../vendor/markets-data';
import type { MarketService } from './service';
import { friendlyLabel, StatusBadge } from './presentation';
import { calendarDate, go, ReadState, useRead } from './common';
import {
  addDays,
  readableDate,
  readOccurrencesInRange,
} from './occurrences-data';
import { BoothCell, BoothMeter, periodRange, periods } from './occurrences';
import { ReadinessChecklistPanel } from './ReadinessChecklist';
import {
  boothItems,
  datePhase,
  dateReadiness,
  plural,
  readChecklists,
  readDateOperations,
  type DatePhase,
} from './operations-data';
import '@market/ui/farmstand.css';
import '../vendor/markets-workspace.css';
import '../vendor/market-applications.css';
import '../vendor/market-dates.css';
import '../vendor/application-detail.css';
import './market-occurrences.css';
import './market-operations.css';

// Preorders are hidden from these pages for now; the read stays available.
export { OperationalPurchases } from './OperationalPurchases';

const PAGE_SIZE = 10;
/** Upcoming dates checked for the summary, beyond the dates on this page. */
const SUMMARY_DATES = 10;
const statuses = ['scheduled', 'cancelled'];
const DAY = 86400000;

function inApp(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  go(href);
}
function access(service: MarketService) {
  const permissions = service.context.permissions;
  return {
    booths:
      !!service.phase14 && permissions.includes('ReadOwnMarketAssignments'),
    day: permissions.includes('OperateOwnMarketDay'),
    checklist: !!service.checklist,
  };
}
function phaseStatus(occurrence: MarketOccurrence, phase: DatePhase) {
  return phase === 'ended' ? 'past' : occurrence.status;
}
/** Calendar days from today to the date, in the market's time zone. */
function daysAway(occurrence: MarketOccurrence, now: number) {
  const day = (time: number) =>
    Date.parse(
      `${new Date(time).toLocaleDateString('en-CA', { timeZone: occurrence.timezone })}T00:00:00Z`,
    );
  return Math.round((day(Date.parse(occurrence.startsAt)) - day(now)) / DAY);
}
function whenLabel(
  occurrence: MarketOccurrence,
  phase: DatePhase,
  now: number,
) {
  if (phase === 'cancelled') return 'Cancelled';
  if (phase === 'ended') return 'Ended';
  if (phase === 'today') return 'Today';
  const days = daysAway(occurrence, now);
  return days === 1 ? 'Tomorrow' : `In ${days} days`;
}

export function MarketOperations({
  service,
  id,
}: {
  service: MarketService;
  id?: string;
}) {
  return id ? (
    <OperationsDetail key={id} service={service} id={id} />
  ) : (
    <OperationsList service={service} />
  );
}

/** Readiness summary for one row of the date list. */
function ReadinessCell({
  phase,
  checking,
  attention,
  known,
}: {
  phase: DatePhase;
  checking: boolean;
  attention: number;
  known: boolean;
}) {
  if (phase === 'cancelled' || phase === 'ended')
    return <span className="markets-muted">Not tracked</span>;
  if (checking) return <span className="markets-muted">Checking…</span>;
  if (attention)
    return (
      <Badge tone="warning" className="operations-readiness">
        <FarmstandIcon name="triangle-alert" />
        {plural(attention, 'item')} to review
      </Badge>
    );
  return known ? (
    <Badge tone="success" className="operations-readiness">
      <FarmstandIcon name="circle-check" />
      Ready
    </Badge>
  ) : (
    <span className="markets-muted">Readiness unavailable</span>
  );
}

function OperationsList({ service }: { service: MarketService }) {
  const id = useId();
  const allowed = access(service);
  const [period, setPeriod] = useState('next-30');
  const [range, setRange] = useState(() => periodRange('next-30'));
  const [calendar, setCalendar] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [observedAt] = useState(() => Date.now());

  const listRead = useCallback(
    () => readOccurrencesInRange(service, range),
    [service, range],
  );
  const list = useRead(
    `${service.readKey}:operations-dates:${range.from}:${range.through}`,
    listRead,
    true,
    { retainPreviousData: true },
  );
  const summaryRead = useCallback(() => service.overview(), [service]);
  const overview = useRead(
    `${service.readKey}:operations-summary`,
    summaryRead,
  );

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (list.data?.items ?? []).filter(
      (o) =>
        (status === 'all' || o.status === status) &&
        `${o.venue} ${marketDate(o, true)} ${o.status}`
          .toLocaleLowerCase()
          .includes(term),
    );
  }, [list.data, search, status]);
  const shown = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const current = shown.find((o) => o.id === selected) ?? shown[0];
  const items = list.data?.items;
  const active = useMemo(
    () =>
      (items ?? []).filter((o) =>
        ['upcoming', 'today'].includes(datePhase(o, observedAt)),
      ),
    [items, observedAt],
  );
  const summaryDates = active.slice(0, SUMMARY_DATES);
  // Booth facts for this page's dates plus the next few upcoming ones for the
  // summary; checklists only for dates that are still ahead or today.
  const factsKey = [
    ...new Set([...shown, ...summaryDates].map((o) => o.id)),
  ].join(',');
  const checkKey = [
    ...new Set(
      [...shown, ...summaryDates]
        .filter((o) => ['upcoming', 'today'].includes(datePhase(o, observedAt)))
        .map((o) => o.id),
    ),
  ].join(',');
  const factsRead = useCallback(() => {
    const ids = new Set(factsKey.split(','));
    return readDateOperations(
      service.phase14!,
      (items ?? []).filter((o) => ids.has(o.id)),
      observedAt,
    );
  }, [service, factsKey, items, observedAt]);
  const facts = useRead(
    `${service.readKey}:operations-facts:${factsKey}`,
    factsRead,
    allowed.booths && factsKey.length > 0,
    { retainPreviousData: true },
  );
  const checklistRead = useCallback(
    () => readChecklists(service, checkKey.split(',')),
    [service, checkKey],
  );
  const checklists = useRead(
    `${service.readKey}:operations-checklists:${checkKey}`,
    checklistRead,
    allowed.checklist && checkKey.length > 0,
    { retainPreviousData: true },
  );
  /** Still waiting for this date's own facts (previous reads are retained). */
  const checkingDate = useCallback(
    (id: string) =>
      (allowed.checklist && !checklists.data?.has(id)) ||
      (allowed.booths && !facts.error && !facts.data?.has(id)),
    [
      allowed.checklist,
      allowed.booths,
      checklists.data,
      facts.data,
      facts.error,
    ],
  );
  const checking = summaryDates.some((o) => checkingDate(o.id));

  const readiness = useCallback(
    (o: MarketOccurrence) => {
      const phase = datePhase(o, observedAt);
      return {
        phase,
        ...dateReadiness(
          o.id,
          phase,
          checklists.data?.get(o.id),
          facts.data?.get(o.id),
          allowed.day,
        ),
      };
    },
    [observedAt, checklists.data, facts.data, allowed.day],
  );
  const summary = useMemo(() => {
    const rows = summaryDates.map(readiness);
    return {
      dates: rows.length,
      attention: rows.filter((r) => r.attention.length).length,
      unassigned: summaryDates.reduce(
        (sum, o) => sum + (facts.data?.get(o.id)?.unassigned ?? 0),
        0,
      ),
    };
  }, [summaryDates, readiness, facts.data]);

  function changeFilter(update: () => void) {
    update();
    setPage(0);
  }
  function changePeriod(value: string) {
    if (value === 'custom') {
      setCalendar(true);
      return;
    }
    changeFilter(() => {
      setPeriod(value);
      setRange(periodRange(value));
    });
  }
  const rangeLabel = `${readableDate(range.from)} to ${readableDate(addDays(range.through, -1))}`;
  const next = active[0] ?? overview.data?.nextOccurrence ?? undefined;
  const nextPhase = next && datePhase(next, observedAt);
  const pending = overview.data?.pendingVendorRelationships ?? 0;
  const currentReadiness = current && readiness(current);
  const currentBooths = current && facts.data?.get(current.id);
  const detailHref = current && `/market/operations/${current.id}`;

  return (
    <WorkspaceFrame
      icon="clipboard-list"
      title="Market Operations"
      description="See what needs attention before and on each market day: vendor readiness, booths and check-in."
      tabs={[]}
      value="list"
      onChange={() => undefined}
      className="market-occurrences market-operations farmstand-controls"
    >
      <MarketsSummary
        className="market-dates-summary"
        items={[
          {
            label: 'Next market',
            value: next
              ? nextPhase === 'today'
                ? 'Today'
                : marketDate(next)
              : '—',
            hint: next
              ? `${whenLabel(next, nextPhase!, observedAt)} · ${marketTime(next, false)}`
              : 'No upcoming dates scheduled',
            icon: 'calendar-days',
          },
          {
            label: 'Needs attention',
            tone: summary.attention ? 'warning' : 'success',
            value: !summary.dates || checking ? '—' : summary.attention,
            hint: summary.dates
              ? `Of the next ${plural(summary.dates, 'market date')} in this view`
              : 'No upcoming dates in this view',
            icon: 'triangle-alert',
          },
          {
            label: 'Vendors without booths',
            tone: summary.unassigned ? 'warning' : undefined,
            value: allowed.booths && facts.data ? summary.unassigned : '—',
            hint: !allowed.booths
              ? 'Booth data unavailable for your account'
              : 'Confirmed vendors on upcoming dates',
            icon: 'store',
          },
          {
            label: 'Pending vendors',
            tone: pending ? 'warning' : undefined,
            value: overview.data ? pending : '—',
            hint: pending
              ? `${plural(pending, 'vendor request')} awaiting review`
              : 'No vendor requests waiting',
            icon: 'user-round',
          },
        ]}
      />
      <div className="markets-columns market-applications-columns">
        <div className="market-applications-main">
          <FarmstandPanel
            as="section"
            className="markets-list market-applications-list market-dates-list occurrence-list operations-list"
            aria-label="Market dates"
          >
            <h2>Market dates</h2>
            <div className="markets-filters market-dates-filters occurrence-filters">
              <Field
                id={`${id}-search`}
                label={<span className="sr-only">Search market dates</span>}
              >
                <FarmstandSearch
                  id={`${id}-search`}
                  placeholder="Search market dates..."
                  value={search}
                  onChange={(e) =>
                    changeFilter(() => setSearch(e.target.value))
                  }
                />
              </Field>
              <Field
                id={`${id}-period`}
                label={<span className="sr-only">Date range</span>}
              >
                <FarmstandSelect
                  id={`${id}-period`}
                  icon="calendar-days"
                  value={period}
                  onChange={(e) => changePeriod(e.target.value)}
                >
                  {periods.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  <option value="custom">
                    {period === 'custom' ? rangeLabel : 'Custom date range'}
                  </option>
                </FarmstandSelect>
              </Field>
              <Field
                id={`${id}-status`}
                label={<span className="sr-only">Status</span>}
              >
                <FarmstandSelect
                  id={`${id}-status`}
                  value={status}
                  onChange={(e) =>
                    changeFilter(() => setStatus(e.target.value))
                  }
                >
                  <option value="all">All statuses</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {friendlyLabel(s)}
                    </option>
                  ))}
                </FarmstandSelect>
              </Field>
            </div>
            <ReadState
              loading={!list.data && list.loading}
              error={list.error}
              retry={list.refresh}
            />
            {list.data &&
              (shown.length ? (
                <>
                  <FarmstandTable
                    label="Market date operations"
                    wide
                    headings={[
                      'Date',
                      'Status',
                      'Booths',
                      'Readiness',
                      'Operations',
                    ]}
                    sort={{ heading: 'Date', direction: 'ascending' }}
                  >
                    {shown.map((row) => {
                      const href = `/market/operations/${row.id}`;
                      const state = readiness(row);
                      return (
                        <tr
                          key={row.id}
                          tabIndex={0}
                          className={
                            row.id === current?.id
                              ? 'market-application-selected'
                              : undefined
                          }
                          onClick={() => setSelected(row.id)}
                          onKeyDown={(event) => {
                            if (
                              event.target === event.currentTarget &&
                              (event.key === 'Enter' || event.key === ' ')
                            ) {
                              event.preventDefault();
                              setSelected(row.id);
                            }
                          }}
                        >
                          <th scope="row">
                            <div className="markets-identity">
                              <span className="markets-identity-icon">
                                <FarmstandIcon name="calendar-days" />
                              </span>
                              <span>
                                <span className="market-application-name">
                                  {marketDate(row, true)}
                                </span>
                                <small>
                                  {marketTime(row, false)} ·{' '}
                                  {row.venue || 'Venue not provided'}
                                </small>
                              </span>
                            </div>
                          </th>
                          <td>
                            <StatusBadge>
                              {phaseStatus(row, state.phase)}
                            </StatusBadge>
                          </td>
                          <td>
                            <BoothCell
                              available={allowed.booths && !facts.error}
                              booths={facts.data?.get(row.id)}
                            />
                          </td>
                          <td>
                            <ReadinessCell
                              phase={state.phase}
                              checking={checkingDate(row.id)}
                              attention={state.attention.length}
                              known={state.known}
                            />
                          </td>
                          <td>
                            <FarmstandLink
                              href={href}
                              variant="secondary"
                              className="occurrence-manage"
                              aria-label={`View operations for ${marketDate(row, true)}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                inApp(event, href);
                              }}
                            >
                              View
                              <FarmstandIcon name="chevron-right" />
                            </FarmstandLink>
                          </td>
                        </tr>
                      );
                    })}
                  </FarmstandTable>
                  <Pagination
                    label="Market date pages"
                    summary={`${plural(visible.length, 'market date')} in this date range. Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, visible.length)}.`}
                    hasPrevious={page > 0}
                    hasNext={(page + 1) * PAGE_SIZE < visible.length}
                    onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                  />
                </>
              ) : (
                <EmptyState
                  title={
                    list.data.items.length
                      ? 'No matching market dates'
                      : 'No market dates in this view'
                  }
                >
                  <p>
                    {list.data.items.length
                      ? 'Try another search or status.'
                      : 'Choose another date range, or add dates from Market Occurrences.'}
                  </p>
                </EmptyState>
              ))}
            {list.data?.truncated && (
              <p className="markets-list-note">
                Showing the first {list.data.items.length} of{' '}
                {list.data.totalItems} market dates. Choose a shorter date range
                to see the rest.
              </p>
            )}
          </FarmstandPanel>
        </div>
        <FarmstandPanel
          as="section"
          className="markets-next market-application-details market-date-details occurrence-details operations-details"
          aria-label="Date readiness"
        >
          <h2>
            <FarmstandIcon name="clipboard-list" />
            Date readiness
          </h2>
          {current && currentReadiness && detailHref ? (
            <div className="markets-next-content">
              <div className="occurrence-details-title">
                <h3>{marketDate(current, true)}</h3>
                <StatusBadge>
                  {phaseStatus(current, currentReadiness.phase)}
                </StatusBadge>
              </div>
              <p className="markets-venue">
                <FarmstandIcon name="map-pin" />
                {current.venue || 'Venue not provided'}
              </p>
              <dl className="market-application-facts">
                <div>
                  <dt>When</dt>
                  <dd>
                    {whenLabel(current, currentReadiness.phase, observedAt)}
                  </dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{marketTime(current)}</dd>
                </div>
                {currentBooths && (
                  <div>
                    <dt>Confirmed vendors</dt>
                    <dd>{currentBooths.confirmed}</dd>
                  </div>
                )}
              </dl>
              {currentBooths?.layout && currentBooths.total ? (
                <BoothMeter booths={currentBooths} />
              ) : null}
              {['cancelled', 'ended'].includes(currentReadiness.phase) ? (
                <p className="market-application-guidance">
                  {currentReadiness.phase === 'cancelled'
                    ? 'This date is cancelled, so readiness is not tracked.'
                    : 'This date has ended. Review its records from the operations page.'}
                </p>
              ) : checkingDate(current.id) ? (
                <p className="market-application-guidance">
                  Checking readiness…
                </p>
              ) : currentReadiness.attention.length ? (
                <div className="operations-attention">
                  <h4>
                    <FarmstandIcon name="triangle-alert" />
                    Needs attention
                  </h4>
                  <ul>
                    {currentReadiness.attention.map((item) => (
                      <li key={item.id}>
                        <FarmstandIcon name={item.icon} />
                        <a
                          href={item.href}
                          onClick={(event) => inApp(event, item.href)}
                        >
                          {item.title}
                        </a>
                        <span className="operations-attention-count">
                          {item.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : currentReadiness.known ? (
                <p className="operations-ready" role="status">
                  <FarmstandIcon name="circle-check" />
                  Nothing needs attention for this date.
                </p>
              ) : (
                <p className="market-application-guidance">
                  Readiness could not be checked for this date.
                </p>
              )}
              <FarmstandLink
                href={detailHref}
                variant="primary"
                onClick={(event) => inApp(event, detailHref)}
              >
                <FarmstandIcon name="clipboard-list" />
                View operations
              </FarmstandLink>
              {allowed.day && currentReadiness.phase !== 'cancelled' && (
                <FarmstandLink
                  href={`/market/day/${current.id}`}
                  variant="secondary"
                  onClick={(event) => inApp(event, `/market/day/${current.id}`)}
                >
                  <FarmstandIcon name="circle-check" />
                  Open market day
                </FarmstandLink>
              )}
              {allowed.booths && (
                <FarmstandLink
                  href={`/market/assignments/${current.id}`}
                  variant="secondary"
                  onClick={(event) =>
                    inApp(event, `/market/assignments/${current.id}`)
                  }
                >
                  <FarmstandIcon name="store" />
                  Manage booths
                </FarmstandLink>
              )}
            </div>
          ) : (
            <EmptyState title="No date selected">
              <p>Select a market date to review its readiness.</p>
            </EmptyState>
          )}
        </FarmstandPanel>
      </div>
      {calendar && (
        <OrdersDateRange
          value={{ from: range.from, to: addDays(range.through, -1) }}
          subject="market dates"
          maxDays={366}
          onClose={() => setCalendar(false)}
          onApply={(next) => {
            try {
              calendarDate(next.from);
              calendarDate(next.to);
            } catch {
              return;
            }
            changeFilter(() => {
              setPeriod('custom');
              setRange({ from: next.from, through: addDays(next.to, 1) });
            });
            setCalendar(false);
          }}
        />
      )}
    </WorkspaceFrame>
  );
}

/**
 * One market date's operations: what needs the manager first (backend
 * checklist plus booth and check-in counts), then vendors, booths and
 * shortcuts. Preorder purchases are not shown here for now.
 */
function OperationsDetail({
  service,
  id,
}: {
  service: MarketService;
  id: string;
}) {
  const allowed = access(service);
  const [observedAt] = useState(() => Date.now());
  const read = useCallback(() => service.occurrence(id), [service, id]);
  const detail = useRead(`${service.readKey}:operations-date:${id}`, read);
  const occurrence = detail.data;
  const checklistRead = useCallback(
    () => service.checklist!(id),
    [service, id],
  );
  const checklist = useRead(
    `${service.readKey}:checklist:${id}`,
    checklistRead,
    allowed.checklist,
  );
  const factsRead = useCallback(
    () =>
      readDateOperations(service.phase14!, [occurrence!], observedAt).then(
        (facts) => facts.get(id),
      ),
    [service, occurrence, id, observedAt],
  );
  const facts = useRead(
    `${service.readKey}:operations-date-facts:${id}`,
    factsRead,
    allowed.booths && !!occurrence,
  );
  const phase = occurrence && datePhase(occurrence, observedAt);
  const booths = facts.data;
  const extra = phase ? boothItems(id, phase, booths, allowed.day) : [];
  const readiness =
    phase && dateReadiness(id, phase, checklist.data, booths, allowed.day);
  const back = '/market/operations';
  const manage = `/market/occurrences/${id}`;
  const assignments = `/market/assignments/${id}`;
  const day = `/market/day/${id}`;
  const documents = `/market/documents?view=reports&occurrence=${id}`;
  const checkingFacts = allowed.booths && !booths && !facts.error;
  const attentionValue =
    !phase || phase === 'cancelled' || phase === 'ended'
      ? '—'
      : (allowed.checklist && !checklist.data && !checklist.error) ||
          checkingFacts
        ? '—'
        : readiness!.attention.length;

  return (
    <div className="application-detail occurrence-detail operations-detail farmstand-controls">
      <FarmstandLink
        href={back}
        variant="secondary"
        onClick={(event) => inApp(event, back)}
        className="application-detail-back application-detail-arrow"
      >
        <FarmstandIcon name="arrow-left" />
        Back to operations
      </FarmstandLink>
      <ReadState
        loading={!occurrence && detail.loading}
        error={detail.error}
        retry={detail.refresh}
      />
      {occurrence && phase && readiness && (
        <>
          <header className="application-detail-heading">
            <div className="application-detail-title">
              <h1>{marketDate(occurrence, true)}</h1>
              <StatusBadge>{phaseStatus(occurrence, phase)}</StatusBadge>
              {phase === 'today' && <Badge tone="info">Market day</Badge>}
            </div>
            <div className="occurrence-detail-actions">
              <FarmstandLink
                href={manage}
                variant="secondary"
                onClick={(event) => inApp(event, manage)}
              >
                <FarmstandIcon name="calendar-days" />
                Manage occurrence
              </FarmstandLink>
              {allowed.day && phase !== 'cancelled' && (
                <FarmstandLink
                  href={day}
                  variant="primary"
                  onClick={(event) => inApp(event, day)}
                >
                  <FarmstandIcon name="circle-check" />
                  Open market day
                </FarmstandLink>
              )}
            </div>
          </header>
          <p className="occurrence-detail-lead">
            {marketTime(occurrence)} ·{' '}
            {occurrence.venue || 'Venue not provided'}
          </p>
          {phase === 'cancelled' && (
            <Alert severity="warning">
              This occurrence is cancelled. Readiness is not tracked and nothing
              here is marked complete.
            </Alert>
          )}
          <MarketsSummary
            className="market-dates-summary"
            items={[
              {
                label: 'Needs attention',
                tone:
                  typeof attentionValue === 'number'
                    ? attentionValue
                      ? 'warning'
                      : 'success'
                    : undefined,
                value: attentionValue,
                hint:
                  typeof attentionValue !== 'number'
                    ? phase === 'cancelled' || phase === 'ended'
                      ? 'Readiness is not tracked for this date'
                      : 'Checking readiness'
                    : attentionValue
                      ? `${plural(attentionValue, 'item')} to review below`
                      : readiness.known
                        ? 'Everything is on track'
                        : 'Some readiness sources are unavailable',
                icon: 'triangle-alert',
              },
              {
                label: 'Market day',
                value: whenLabel(occurrence, phase, observedAt),
                hint: marketTime(occurrence, false),
                icon: 'calendar-days',
              },
              {
                label: 'Confirmed vendors',
                value: booths ? booths.confirmed : '—',
                hint: !allowed.booths
                  ? 'Vendor data unavailable for your account'
                  : !booths
                    ? 'Checking vendors'
                    : phase === 'today' || phase === 'ended'
                      ? `${booths.checkedIn} checked in`
                      : booths.unassigned
                        ? `${booths.unassigned} without a booth`
                        : 'All have a booth',
                icon: 'user-round',
              },
              {
                label: 'Booths open',
                value: booths?.layout ? booths.open : '—',
                hint: !allowed.booths
                  ? 'Booth data unavailable for your account'
                  : !booths
                    ? 'Checking booths'
                    : booths.layout
                      ? `${booths.assigned} of ${booths.total} assigned`
                      : 'No layout selected',
                icon: 'store',
              },
            ]}
          />
          <div className="application-detail-columns">
            <div className="application-detail-main">
              <ReadinessChecklistPanel
                data={checklist.data}
                loading={
                  (allowed.checklist && checklist.loading) || checkingFacts
                }
                error={checklist.error}
                retry={checklist.refresh}
                extra={extra}
                sourceless={!allowed.checklist}
              />
            </div>
            <aside
              className="application-detail-sidebar"
              aria-label="Vendors, booths and shortcuts"
            >
              {allowed.booths && (
                <Panel icon={{ farmstand: 'store' }} title="Vendors and booths">
                  <div className="operations-booths">
                    <ReadState
                      loading={facts.loading}
                      error={facts.error}
                      retry={facts.refresh}
                    />
                    {booths && (
                      <>
                        {booths.layout && booths.total ? (
                          <BoothMeter booths={booths} />
                        ) : (
                          <p className="application-detail-note">
                            No layout has been selected for this date yet.
                          </p>
                        )}
                        <dl className="application-detail-summary">
                          <Fact
                            icon={{ farmstand: 'user-round' }}
                            label="Confirmed vendors"
                          >
                            {booths.confirmed}
                          </Fact>
                          <Fact
                            icon={{ farmstand: 'store' }}
                            label="Without a booth"
                          >
                            {booths.unassigned}
                          </Fact>
                          {(phase === 'today' || phase === 'ended') && (
                            <Fact
                              icon={{ farmstand: 'circle-check' }}
                              label="Checked in"
                            >
                              {booths.checkedIn} of {booths.confirmed}
                            </Fact>
                          )}
                        </dl>
                      </>
                    )}
                  </div>
                </Panel>
              )}
              <Panel icon={{ farmstand: 'info' }} title="Date details">
                <dl className="application-detail-summary">
                  <Fact icon={{ farmstand: 'calendar-days' }} label="Date">
                    {marketDate(occurrence, true)}
                  </Fact>
                  <Fact icon={{ utility: 'clock' }} label="Time">
                    {marketTime(occurrence)}
                  </Fact>
                  <Fact icon={{ farmstand: 'map-pin' }} label="Venue">
                    {occurrence.venue || 'Not provided'}
                  </Fact>
                  <Fact icon={{ farmstand: 'map-pin' }} label="Time zone">
                    {occurrence.timezone}
                  </Fact>
                </dl>
              </Panel>
              <Panel
                icon={{ farmstand: 'clipboard-list' }}
                title="Quick actions"
              >
                <div className="application-detail-quick-actions">
                  {allowed.booths && (
                    <FarmstandLink
                      href={assignments}
                      variant="secondary"
                      className="application-detail-arrow"
                      onClick={(event) => inApp(event, assignments)}
                    >
                      <FarmstandIcon name="store" />
                      Assign booths
                      <FarmstandIcon name="arrow-right" />
                    </FarmstandLink>
                  )}
                  {allowed.day && phase !== 'cancelled' && (
                    <FarmstandLink
                      href={day}
                      variant="secondary"
                      className="application-detail-arrow"
                      onClick={(event) => inApp(event, day)}
                    >
                      <FarmstandIcon name="circle-check" />
                      Market day check-in
                      <FarmstandIcon name="arrow-right" />
                    </FarmstandLink>
                  )}
                  <FarmstandLink
                    href={documents}
                    variant="secondary"
                    className="application-detail-arrow"
                    onClick={(event) => inApp(event, documents)}
                  >
                    <FarmstandIcon name="file-check" />
                    Vendor documents
                    <FarmstandIcon name="arrow-right" />
                  </FarmstandLink>
                  <FarmstandLink
                    href="/market/vendors"
                    variant="secondary"
                    className="application-detail-arrow"
                    onClick={(event) => inApp(event, '/market/vendors')}
                  >
                    <FarmstandIcon name="user-round" />
                    Vendor participation
                    <FarmstandIcon name="arrow-right" />
                  </FarmstandLink>
                  <FarmstandLink
                    href={manage}
                    variant="secondary"
                    className="application-detail-arrow"
                    onClick={(event) => inApp(event, manage)}
                  >
                    <FarmstandIcon name="calendar-days" />
                    Manage occurrence
                    <FarmstandIcon name="arrow-right" />
                  </FarmstandLink>
                </div>
              </Panel>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
