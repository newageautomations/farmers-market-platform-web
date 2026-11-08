import { useCallback, useId, useMemo, useState, type MouseEvent } from 'react';
import { type MarketOccurrence } from '@market/api';
import { mayMarketCommand } from '@market/admin-core';
import { Alert, Dialog, EmptyState, Field, UtilityIcon } from '@market/ui';
import {
  FarmstandButton,
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
import { marketDate, marketTime } from '../vendor/markets-data';
import { FinanceDonut } from '../finance/charts';
import { GenerateOccurrencesWizard } from './GenerateOccurrencesWizard';
import { MarketOccurrenceDetail } from './OccurrenceDetail';
import type { MarketService } from './service';
import { localParts } from './timezones';
import { friendlyLabel, StatusBadge } from './presentation';
import {
  calendarDate,
  CommandForm,
  go,
  ReadState,
  SessionFields,
  sessionInput,
  useRead,
} from './common';
import {
  addDays,
  readableDate,
  readOccurrenceBooths,
  readOccurrencesInRange,
  today,
  type OccurrenceBooths,
  type OccurrenceRange,
} from './occurrences-data';
import '@market/ui/farmstand.css';
import '../vendor/markets-workspace.css';
import '../vendor/market-applications.css';
import '../vendor/market-dates.css';
import '../vendor/orders.css';
import '../finance/finance.css';
import './market-occurrences.css';

const PAGE_SIZE = 10;
export const periods = [
  { value: 'next-30', label: 'Next 30 days', from: 0, days: 31 },
  { value: 'next-90', label: 'Next 90 days', from: 0, days: 91 },
  { value: 'next-180', label: 'Next 6 months', from: 0, days: 183 },
  { value: 'next-365', label: 'Next 12 months', from: 0, days: 366 },
  { value: 'past-30', label: 'Past 30 days', from: -30, days: 31 },
  { value: 'past-90', label: 'Past 90 days', from: -90, days: 91 },
] as const;
/** `through` stays exclusive, as the original range form submitted it. */
export function periodRange(value: string): OccurrenceRange {
  const period = periods.find((p) => p.value === value) ?? periods[0];
  const from = addDays(today(), period.from);
  return { from, through: addDays(from, period.days) };
}
const statuses = ['scheduled', 'cancelled'];

export function inApp(event: MouseEvent<HTMLAnchorElement>, href: string) {
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
/** Route changes without moving focus to the page, so a dialog can take it. */
function openRoute(path: string) {
  if (
    !window.dispatchEvent(
      new Event('vendor:before-navigate', { cancelable: true }),
    )
  )
    return;
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
function plural(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}
function past(occurrence: MarketOccurrence, now: number) {
  return Date.parse(occurrence.endsAt) < now;
}

export function MarketOccurrences({
  service,
  id,
  view = 'list',
}: {
  service: MarketService;
  id?: string;
  view?: 'list' | 'generate' | 'manual';
}) {
  return id ? (
    <MarketOccurrenceDetail key={id} service={service} id={id} />
  ) : (
    <OccurrenceList service={service} view={view} />
  );
}

/** Booth counts for one date, or why they are not shown. */
export function BoothCell({
  booths,
  available,
}: {
  booths?: OccurrenceBooths;
  available: boolean;
}) {
  if (!available) return <span className="markets-muted">Unavailable</span>;
  if (!booths) return <span className="markets-muted">Checking…</span>;
  if (!booths.layout || !booths.total)
    return <span className="markets-muted">No layout</span>;
  return (
    <div className="occurrence-booth-cell">
      <span>
        {booths.open} / {booths.total} open
      </span>
      <small>{plural(booths.assigned, 'vendor')} assigned</small>
    </div>
  );
}

export function BoothMeter({ booths }: { booths: OccurrenceBooths }) {
  const filled = booths.total
    ? Math.round((booths.assigned / booths.total) * 100)
    : 0;
  return (
    <div className="occurrence-booth-meter">
      <div>
        <strong>
          {booths.open} / {booths.total} open
        </strong>
        <span>{filled}% assigned</span>
      </div>
      <progress max={100} value={filled} aria-label="Booths assigned" />
    </div>
  );
}

function OccurrenceList({
  service,
  view,
}: {
  service: MarketService;
  view: 'list' | 'generate' | 'manual';
}) {
  const id = useId();
  const [period, setPeriod] = useState('next-30');
  const [range, setRange] = useState(() => periodRange('next-30'));
  const [calendar, setCalendar] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [observedAt, setObservedAt] = useState(() => Date.now());
  const command = mayMarketCommand(
    service.context,
    'ManageOwnMarketOccurrences',
  );
  const schedule = mayMarketCommand(service.context, 'ManageOwnMarketSchedule');
  const boothsAllowed =
    !!service.phase14 &&
    service.context.permissions.includes('ReadOwnMarketAssignments');
  const generateOpen = view === 'generate' && schedule;
  const manualOpen = view === 'manual' && command;

  const listRead = useCallback(
    () => readOccurrencesInRange(service, range),
    [service, range],
  );
  const list = useRead(
    `${service.readKey}:occurrences:${range.from}:${range.through}`,
    listRead,
    true,
    { retainPreviousData: true },
  );
  const summaryRead = useCallback(() => service.overview(), [service]);
  const overview = useRead(
    `${service.readKey}:occurrence-summary`,
    summaryRead,
  );
  const configRead = useCallback(
    () => service.configuration(service.marketId),
    [service],
  );
  const config = useRead(
    `${service.readKey}:occurrence-config`,
    configRead,
    view !== 'list',
    // Keep an open dialog mounted while a schedule save or generation rereads.
    { retainPreviousData: true },
  );
  const weekRead = useCallback(
    () =>
      readOccurrencesInRange(service, {
        from: today(),
        through: addDays(today(), 8),
      }),
    [service],
  );
  const week = useRead(`${service.readKey}:occurrences-week`, weekRead);
  const refreshList = list.refresh,
    refreshOverview = overview.refresh,
    refreshConfig = config.refresh,
    refreshWeek = week.refresh;
  const refresh = useCallback(() => {
    setObservedAt(Date.now());
    refreshList();
    refreshOverview();
    refreshConfig();
    refreshWeek();
  }, [refreshList, refreshOverview, refreshConfig, refreshWeek]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (list.data?.items ?? []).filter(
      (o) =>
        (status === 'all' || o.status === status) &&
        `${o.venue} ${marketDate(o, true)} ${o.source} ${o.status}`
          .toLocaleLowerCase()
          .includes(term),
    );
  }, [list.data, search, status]);
  const shown = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const current = shown.find((o) => o.id === selected) ?? shown[0];

  // Booth counts for this page's dates, plus upcoming dates for the summary.
  const upcoming = useMemo(
    () =>
      (list.data?.items ?? []).filter(
        (o) => o.status === 'scheduled' && Date.parse(o.startsAt) > observedAt,
      ),
    [list.data, observedAt],
  );
  // The summary covers the first 20 upcoming dates, at most a few booth reads.
  const boothKey = [
    ...new Set([...shown, ...upcoming.slice(0, 20)].map((o) => o.id)),
  ].join(',');
  const items = list.data?.items;
  const boothRead = useCallback(() => {
    const ids = new Set(boothKey.split(','));
    return readOccurrenceBooths(
      service.phase14!,
      (items ?? []).filter((o) => ids.has(o.id)),
    );
  }, [service, boothKey, items]);
  const booths = useRead(
    `${service.readKey}:occurrence-booths:${boothKey}`,
    boothRead,
    boothsAllowed && boothKey.length > 0,
    { retainPreviousData: true },
  );
  const occupancy = useMemo(() => {
    const counted = upcoming
      .slice(0, 20)
      .map((o) => booths.data?.get(o.id))
      .filter((b): b is OccurrenceBooths => !!b && b.layout && b.total > 0);
    return counted.reduce(
      (all, b) => ({
        dates: all.dates + 1,
        assigned: all.assigned + Math.min(b.assigned, b.total),
        open: all.open + b.open,
        total: all.total + b.total,
      }),
      { dates: 0, assigned: 0, open: 0, total: 0 },
    );
  }, [upcoming, booths.data]);

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
  function closeModal() {
    if (busy) return;
    openRoute('/market/occurrences');
  }
  const rangeLabel = `${readableDate(range.from)} to ${readableDate(addDays(range.through, -1))}`;
  const pending = overview.data?.pendingVendorRelationships ?? 0;
  const currentBooths = current && booths.data?.get(current.id);
  const detailHref = current && `/market/occurrences/${current.id}`;

  return (
    <WorkspaceFrame
      icon="calendar-days"
      title="Market Occurrences"
      description="Create and manage scheduled market dates, booth availability and attendance readiness."
      tabs={[]}
      value="list"
      onChange={() => undefined}
      className="market-occurrences farmstand-controls"
      actions={
        (schedule || command) && (
          <>
            {command && (
              <FarmstandButton
                variant="secondary"
                onClick={() => openRoute('/market/occurrences/new')}
              >
                <FarmstandIcon name="plus" />
                Create single date
              </FarmstandButton>
            )}
            {schedule && (
              <FarmstandButton
                onClick={() => openRoute('/market/occurrences/generate')}
              >
                <FarmstandIcon name="calendar-days" />
                Generate occurrences
              </FarmstandButton>
            )}
          </>
        )
      }
    >
      {notice && (
        <Alert severity="success" role="status">
          {notice}
        </Alert>
      )}
      <MarketsSummary
        className="market-dates-summary"
        items={[
          {
            label: 'Upcoming dates',
            value: overview.data?.upcomingScheduledOccurrences ?? '—',
            hint: overview.data?.nextOccurrence
              ? `Next: ${marketDate(overview.data.nextOccurrence, true)}`
              : 'No upcoming dates scheduled',
            icon: 'calendar-days',
          },
          {
            label: 'In this view',
            tone: 'success',
            value: list.data?.totalItems ?? '—',
            hint: rangeLabel,
            icon: 'circle-check',
          },
          {
            label: 'Booths open',
            value: boothsAllowed && booths.data ? occupancy.open : '—',
            hint: !boothsAllowed
              ? 'Booth data unavailable for your account'
              : occupancy.dates
                ? `Across ${plural(occupancy.dates, 'upcoming date')} with layouts`
                : 'No upcoming dates with a layout',
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
            className="markets-list market-applications-list market-dates-list occurrence-list"
            aria-label="Occurrences"
          >
            <h2>Occurrences</h2>
            <div className="markets-filters market-dates-filters occurrence-filters">
              <Field
                id={`${id}-search`}
                label={<span className="sr-only">Search occurrences</span>}
              >
                <FarmstandSearch
                  id={`${id}-search`}
                  placeholder="Search occurrences..."
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
                    label="Market occurrences"
                    wide
                    headings={['Date', 'Time', 'Status', 'Booths', 'Manage']}
                    sort={{ heading: 'Date', direction: 'ascending' }}
                  >
                    {shown.map((row) => {
                      const href = `/market/occurrences/${row.id}`;
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
                                  <FarmstandIcon name="map-pin" />
                                  {row.venue || 'Venue not provided'}
                                </small>
                              </span>
                            </div>
                          </th>
                          <td>
                            <div className="markets-date">
                              <span>{marketTime(row, false)}</span>
                            </div>
                          </td>
                          <td>
                            <StatusBadge>
                              {past(row, observedAt) &&
                              row.status === 'scheduled'
                                ? 'past'
                                : row.status}
                            </StatusBadge>
                          </td>
                          <td>
                            <BoothCell
                              available={boothsAllowed && !booths.error}
                              booths={booths.data?.get(row.id)}
                            />
                          </td>
                          <td>
                            <FarmstandLink
                              href={href}
                              variant="secondary"
                              className="occurrence-manage"
                              onClick={(event) => {
                                event.stopPropagation();
                                inApp(event, href);
                              }}
                            >
                              Manage
                              <FarmstandIcon name="chevron-right" />
                            </FarmstandLink>
                          </td>
                        </tr>
                      );
                    })}
                  </FarmstandTable>
                  <Pagination
                    label="Occurrence pages"
                    summary={`${plural(visible.length, 'occurrence')} in this date range. Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, visible.length)}.`}
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
                      ? 'No matching occurrences'
                      : 'No occurrences in this date view'
                  }
                >
                  <p>
                    {list.data.items.length
                      ? 'Try another search or status.'
                      : 'Choose another date range, or generate dates from your repeating schedule.'}
                  </p>
                </EmptyState>
              ))}
            {list.data?.truncated && (
              <p className="markets-list-note">
                Showing the first {list.data.items.length} of{' '}
                {list.data.totalItems} occurrences. Choose a shorter date range
                to see the rest.
              </p>
            )}
          </FarmstandPanel>
        </div>
        <FarmstandPanel
          as="section"
          className="markets-next market-application-details market-date-details occurrence-details"
          aria-label="Occurrence details"
        >
          <h2>
            <FarmstandIcon name="calendar-days" />
            Occurrence details
          </h2>
          {current && detailHref ? (
            <div className="markets-next-content">
              <div className="occurrence-details-title">
                <h3>{marketDate(current, true)}</h3>
                <StatusBadge>
                  {past(current, observedAt) && current.status === 'scheduled'
                    ? 'past'
                    : current.status}
                </StatusBadge>
              </div>
              <p className="markets-venue">
                <FarmstandIcon name="map-pin" />
                {current.venue || 'Venue not provided'}
              </p>
              <dl className="market-application-facts">
                <div>
                  <dt>Time</dt>
                  <dd>{marketTime(current)}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{friendlyLabel(current.source)}</dd>
                </div>
                <div>
                  <dt>Pickup</dt>
                  <dd>{current.pickupInstructions || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Preorders</dt>
                  <dd>
                    {current.preorderOverride
                      ? 'Date-specific window'
                      : 'Market default window'}
                  </dd>
                </div>
              </dl>
              {boothsAllowed &&
                (currentBooths?.layout && currentBooths.total ? (
                  <BoothMeter booths={currentBooths} />
                ) : (
                  booths.data && (
                    <p className="market-application-guidance">
                      No layout has been selected for this date yet.
                    </p>
                  )
                ))}
              <FarmstandLink
                href={detailHref}
                variant="primary"
                onClick={(event) => inApp(event, detailHref)}
              >
                <UtilityIcon name="edit" />
                Manage occurrence
              </FarmstandLink>
              {boothsAllowed && (
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
              <FarmstandLink
                href={`/market/operations/${current.id}`}
                variant="secondary"
                onClick={(event) =>
                  inApp(event, `/market/operations/${current.id}`)
                }
              >
                <FarmstandIcon name="clipboard-list" />
                View operations
              </FarmstandLink>
            </div>
          ) : (
            <EmptyState title="No occurrence selected">
              <p>Select an occurrence to review its details.</p>
            </EmptyState>
          )}
        </FarmstandPanel>
      </div>
      <div className="occurrence-insights">
        <FarmstandPanel
          as="section"
          className="markets-list occurrence-week"
          aria-labelledby={`${id}-week`}
        >
          <h2 id={`${id}-week`}>Next 7 days</h2>
          <p className="markets-list-note occurrence-panel-lead">
            Market dates coming up this week.
          </p>
          <ReadState {...week} retry={week.refresh} />
          {week.data &&
            (week.data.items.length ? (
              <ul className="occurrence-week-list">
                {week.data.items.map((o) => {
                  const href = `/market/occurrences/${o.id}`;
                  const day = (options: Intl.DateTimeFormatOptions) =>
                    new Date(o.startsAt).toLocaleDateString(undefined, {
                      ...options,
                      timeZone: o.timezone,
                    });
                  return (
                    <li key={o.id}>
                      <span className="occurrence-day-chip" aria-hidden="true">
                        <span>{day({ weekday: 'short' })}</span>
                        <strong>
                          {day({ month: 'short', day: 'numeric' })}
                        </strong>
                      </span>
                      <div>
                        <a
                          href={href}
                          className="market-application-name"
                          onClick={(event) => inApp(event, href)}
                        >
                          {marketDate(o, true)}
                        </a>
                        <small>
                          {marketTime(o, false)} ·{' '}
                          {o.venue || 'Venue not provided'}
                        </small>
                      </div>
                      <StatusBadge>{o.status}</StatusBadge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="Nothing this week">
                <p>No market dates are scheduled in the next 7 days.</p>
              </EmptyState>
            ))}
        </FarmstandPanel>
        <FarmstandPanel
          as="section"
          className="markets-list occurrence-occupancy"
          aria-labelledby={`${id}-occupancy`}
        >
          <h2 id={`${id}-occupancy`}>Booth occupancy</h2>
          <p className="markets-list-note occurrence-panel-lead">
            Booth usage across upcoming dates in this view that have a layout.
          </p>
          {!boothsAllowed ? (
            <p className="markets-muted">
              Booth data is unavailable for this account.
            </p>
          ) : (
            <>
              <ReadState
                loading={!booths.data && booths.loading}
                error={booths.error}
                retry={booths.refresh}
              />
              {booths.data &&
                (occupancy.total ? (
                  <div className="occurrence-occupancy-body">
                    <FinanceDonut
                      items={[
                        {
                          id: 'assigned',
                          name: 'Assigned booths',
                          value: occupancy.assigned,
                        },
                        {
                          id: 'open',
                          name: 'Open booths',
                          value: occupancy.open,
                        },
                      ]}
                      currency="USD"
                      units
                      unitLabel="booths"
                      legend
                      controls={
                        <div className="occurrence-occupancy-rate">
                          <strong>
                            {Math.round(
                              (occupancy.assigned / occupancy.total) * 100,
                            )}
                            %
                          </strong>
                          <span>Overall occupancy</span>
                          <small>
                            {plural(occupancy.total, 'booth')} across{' '}
                            {plural(occupancy.dates, 'date')}
                          </small>
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <EmptyState title="No booth layouts yet">
                    <p>
                      Select a layout for upcoming dates to track booth
                      occupancy.
                    </p>
                  </EmptyState>
                ))}
            </>
          )}
        </FarmstandPanel>
      </div>
      {calendar && (
        <OrdersDateRange
          value={{ from: range.from, to: addDays(range.through, -1) }}
          subject="market occurrences"
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
      <Dialog
        open={generateOpen}
        size="wide"
        title="Generate occurrences"
        busy={busy}
        onClose={closeModal}
      >
        <ReadState
          loading={!config.data && config.loading}
          error={config.error}
          retry={config.refresh}
        />
        {generateOpen && config.data && (
          <GenerateOccurrencesWizard
            service={service}
            market={config.data}
            initialRange={{
              from: range.from < today() ? today() : range.from,
              through:
                addDays(range.through, -1) < today()
                  ? addDays(today(), 27)
                  : addDays(range.through, -1),
            }}
            onScheduleChanged={refreshConfig}
            onGenerated={refresh}
            onBusyChange={setBusy}
            onClose={closeModal}
          />
        )}
      </Dialog>
      <Dialog
        open={manualOpen}
        size="wide"
        title="Create a single market date"
        description="Create one future market date with its own times, venue and pickup directions."
        busy={busy}
        onClose={closeModal}
      >
        <ReadState
          loading={!config.data && config.loading}
          error={config.error}
          retry={config.refresh}
        />
        {manualOpen && config.data && (
          <CommandForm
            embedded
            hideTitle
            title="Create manual occurrence"
            submitLabel="Create manual occurrence"
            onPendingChange={setBusy}
            onDone={() => {
              refresh();
              setNotice('Market date created.');
              setBusy(false);
              openRoute('/market/occurrences');
            }}
            validate={(data) => {
              calendarDate(String(data.get('startDate') ?? ''));
              sessionInput(data);
            }}
            run={async (data, key) => {
              await service.manual(
                service.marketId,
                localParts(sessionInput(data).startsAt, config.data!.timezone)
                  .date,
                `manual:${key}`,
                sessionInput(data),
              );
            }}
          >
            <SessionFields
              timezone={config.data.timezone}
              value={{
                startsAt: '',
                endsAt: '',
                venue: config.data.venue,
                pickupInstructions: config.data.pickupInstructions,
                preorderOverride: null,
              }}
            />
          </CommandForm>
        )}
      </Dialog>
    </WorkspaceFrame>
  );
}
